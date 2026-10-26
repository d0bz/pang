import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { calculateNetBalances } from '@/lib/simplifyDebts';
import { sendGroupInvitationEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const TEMPORARY_PLACEHOLDER = '$2a$10$temporaryDefaultPasswordPlaceholder';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch groups that user is a member of
    const groups = await prisma.group.findMany({
      where: {
        members: {
          some: {
            userId: user.id,
          },
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
          },
        },
        settlements: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const groupsWithBalances = groups.map((g) => {
      const usersLookup = g.members.map((m) => m.user);
      const netBalances = calculateNetBalances(usersLookup, g.expenses, g.settlements);
      const userBalance = netBalances.get(user.id) ?? 0;

      const totalExpenses = g.expenses.reduce((sum, e) => sum + e.amount, 0);

      return {
        id: g.id,
        name: g.name,
        description: g.description,
        category: g.category,
        simplifyDebts: g.simplifyDebts,
        memberCount: g.members.length,
        members: g.members.map((m) => ({
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          avatarUrl: m.user.avatarUrl,
          role: m.role,
        })),
        userBalance,
        totalExpenses,
        updatedAt: g.updatedAt,
      };
    });

    return NextResponse.json({ groups: groupsWithBalances });
  } catch (err: any) {
    console.error('Error fetching groups:', err);
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, category, memberEmails, memberUserIds } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    // Collect all member user IDs to add
    const memberIdsToAdd = new Set<string>();
    memberIdsToAdd.add(user.id); // Add creator

    const emailInvitesToSend: Array<{
      email: string;
      name: string;
      isNewUser: boolean;
    }> = [];

    if (Array.isArray(memberUserIds)) {
      for (const id of memberUserIds) {
        if (id) memberIdsToAdd.add(id);
      }
    }

    // If emails were provided, find or invite users
    if (Array.isArray(memberEmails) && memberEmails.length > 0) {
      for (const rawEmail of memberEmails) {
        const cleanEmail = rawEmail.toLowerCase().trim();
        if (!cleanEmail || cleanEmail === user.email.toLowerCase()) continue;

        let existingUser = await prisma.user.findUnique({
          where: { email: cleanEmail },
        });

        let isBrandNew = false;

        // Auto-provision user account if email doesn't exist yet
        if (!existingUser) {
          isBrandNew = true;
          const defaultName = cleanEmail.split('@')[0];
          const formattedName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);
          existingUser = await prisma.user.create({
            data: {
              name: formattedName,
              email: cleanEmail,
              password: TEMPORARY_PLACEHOLDER,
              avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanEmail)}`,
            },
          });
        } else if (existingUser.password === TEMPORARY_PLACEHOLDER) {
          isBrandNew = true;
        }

        memberIdsToAdd.add(existingUser.id);
        emailInvitesToSend.push({
          email: existingUser.email,
          name: existingUser.name,
          isNewUser: isBrandNew,
        });
      }
    }

    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        category: category || 'apartment',
        simplifyDebts: true,
        members: {
          create: Array.from(memberIdsToAdd).map((mId) => ({
            userId: mId,
            role: mId === user.id ? 'admin' : 'member',
          })),
        },
        activities: {
          create: {
            userId: user.id,
            type: 'GROUP_CREATED',
            title: `${user.name} created the group "${name.trim()}"`,
          },
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
      },
    });

    // Send invitation emails in background
    Promise.all(
      emailInvitesToSend.map((inv) =>
        sendGroupInvitationEmail({
          recipientEmail: inv.email,
          recipientName: inv.name,
          inviterName: user.name,
          groupName: group.name,
          isNewUser: inv.isNewUser,
        })
      )
    ).catch((err) => console.error('Error sending group creation invitation emails:', err));

    return NextResponse.json({ group });
  } catch (err: any) {
    console.error('Error creating group:', err);
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}
