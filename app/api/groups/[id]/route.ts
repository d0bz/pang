import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { calculateNetBalances, simplifyDebts, calculateDirectDebts } from '@/lib/simplifyDebts';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groupId = params.id;

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true, iban: true },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        expenses: {
          include: {
            payer: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
            splits: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, avatarUrl: true },
                },
              },
            },
          },
          orderBy: { date: 'desc' },
        },
        settlements: {
          include: {
            fromUser: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
            toUser: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
          orderBy: { date: 'desc' },
        },
        activities: {
          include: {
            user: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if user is a member
    const isMember = group.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return NextResponse.json({ error: 'Access denied: not a group member' }, { status: 403 });
    }

    const usersLookup = group.members.map((m) => m.user);
    const netBalancesMap = calculateNetBalances(usersLookup, group.expenses, group.settlements);

    const memberBalances = group.members.map((m) => ({
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      avatarUrl: m.user.avatarUrl,
      iban: m.user.iban,
      role: m.role,
      netBalance: netBalancesMap.get(m.user.id) ?? 0,
    }));

    const simplified = simplifyDebts(usersLookup, group.expenses, group.settlements);
    const directDebts = calculateDirectDebts(usersLookup, group.expenses, group.settlements);

    const currentUserBalance = netBalancesMap.get(user.id) ?? 0;
    const totalSpending = group.expenses.reduce((sum, e) => sum + e.amount, 0);

    // Calculate how much current user paid and owes in this group
    let myTotalPaid = 0;
    let myTotalShare = 0;

    for (const exp of group.expenses) {
      if (exp.payerId === user.id) {
        myTotalPaid += exp.amount;
      }
      const mySplit = exp.splits.find((s) => s.userId === user.id);
      if (mySplit) {
        myTotalShare += mySplit.amount;
      }
    }

    return NextResponse.json({
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        category: group.category,
        simplifyDebts: group.simplifyDebts,
        locked: group.locked,
        createdAt: group.createdAt,
      },
      members: memberBalances,
      expenses: group.expenses,
      settlements: group.settlements,
      activities: group.activities,
      debts: {
        simplified,
        direct: directDebts,
      },
      stats: {
        currentUserBalance,
        totalSpending,
        myTotalPaid,
        myTotalShare,
      },
    });
  } catch (err: any) {
    console.error('Error fetching group detail:', err);
    return NextResponse.json({ error: 'Failed to fetch group' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, category, simplifyDebts, locked } = await req.json();

    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: params.id, userId: user.id } },
    });
    if (!membership) {
      return NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 });
    }

    const updated = await prisma.group.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(simplifyDebts !== undefined ? { simplifyDebts } : {}),
        ...(locked !== undefined ? { locked: !!locked } : {}),
      },
    });

    return NextResponse.json({ success: true, group: updated });
  } catch (err: any) {
    console.error('Error updating group:', err);
    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const group = await prisma.group.findUnique({
      where: { id: params.id },
      include: { members: true },
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const isMember = group.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 });
    }

    // Safely delete all dependent records in transaction
    await prisma.$transaction(async (tx) => {
      const expenses = await tx.expense.findMany({
        where: { groupId: params.id },
        select: { id: true },
      });
      const expenseIds = expenses.map((e) => e.id);

      if (expenseIds.length > 0) {
        await tx.expenseSplit.deleteMany({
          where: { expenseId: { in: expenseIds } },
        });
        await tx.expense.deleteMany({
          where: { id: { in: expenseIds } },
        });
      }

      await tx.settlement.deleteMany({
        where: { groupId: params.id },
      });

      await tx.activity.deleteMany({
        where: { groupId: params.id },
      });

      await tx.groupMember.deleteMany({
        where: { groupId: params.id },
      });

      await tx.group.delete({
        where: { id: params.id },
      });
    });

    return NextResponse.json({ success: true, message: 'Group deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting group:', err);
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
  }
}

