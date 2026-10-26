import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { calculateNetBalances, simplifyDebts } from '@/lib/simplifyDebts';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch all groups user is part of
    const groups = await prisma.group.findMany({
      where: {
        members: {
          some: { userId: user.id },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        expenses: {
          include: {
            splits: true,
            payer: { select: { id: true, name: true } },
          },
        },
        settlements: {
          include: {
            fromUser: { select: { id: true, name: true } },
            toUser: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // 2. Fetch all users for friend calculations
    const allUsers = await prisma.user.findMany({
      where: { id: { not: user.id } },
      select: { id: true, name: true, email: true, avatarUrl: true },
    });

    // Calculate per-group balances and global friend balances
    let totalYouAreOwed = 0;
    let totalYouOwe = 0;

    // Track pairwise friend balances across all groups
    const friendNetMap = new Map<string, number>();

    const groupSummaries = groups.map((g) => {
      const usersLookup = g.members.map((m) => m.user);
      const netMap = calculateNetBalances(usersLookup, g.expenses, g.settlements);
      const myBal = netMap.get(user.id) ?? 0;

      // Also compute simplified debts in this group to know who user owes/is owed by in simplified mode
      const simplified = simplifyDebts(usersLookup, g.expenses, g.settlements);
      for (const t of simplified) {
        if (t.fromUserId === user.id) {
          // Current user owes toUserId
          friendNetMap.set(t.toUserId, (friendNetMap.get(t.toUserId) ?? 0) - t.amount);
        } else if (t.toUserId === user.id) {
          // fromUserId owes Current user
          friendNetMap.set(t.fromUserId, (friendNetMap.get(t.fromUserId) ?? 0) + t.amount);
        }
      }

      if (myBal > 0) {
        totalYouAreOwed += myBal;
      } else if (myBal < 0) {
        totalYouOwe += Math.abs(myBal);
      }

      return {
        id: g.id,
        name: g.name,
        category: g.category,
        myBalance: myBal,
        memberCount: g.members.length,
      };
    });

    // Build friends list
    const friends = allUsers
      .map((f) => {
        const net = friendNetMap.get(f.id) ?? 0;
        return {
          id: f.id,
          name: f.name,
          email: f.email,
          avatarUrl: f.avatarUrl,
          balance: Math.round(net * 100) / 100,
        };
      })
      .filter((f) => Math.abs(f.balance) > 0.005 || groups.some((g) => g.members.some((m) => m.userId === f.id)));

    // Recent activities across groups
    const groupIds = groups.map((g) => g.id);
    const activities = await prisma.activity.findMany({
      where: {
        OR: [{ groupId: { in: groupIds } }, { userId: user.id }],
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        group: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Recent expenses
    const recentExpenses = await prisma.expense.findMany({
      where: {
        OR: [{ payerId: user.id }, { splits: { some: { userId: user.id } } }],
      },
      include: {
        payer: { select: { id: true, name: true, avatarUrl: true } },
        group: { select: { id: true, name: true } },
        splits: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
      take: 25,
    });

    const netTotal = Math.round((totalYouAreOwed - totalYouOwe) * 100) / 100;

    return NextResponse.json({
      user,
      summary: {
        totalBalance: netTotal,
        youAreOwed: Math.round(totalYouAreOwed * 100) / 100,
        youOwe: Math.round(totalYouOwe * 100) / 100,
      },
      groups: groupSummaries,
      friends,
      recentExpenses,
      activities,
    });
  } catch (err: any) {
    console.error('Error fetching dashboard data:', err);
    return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 });
  }
}
