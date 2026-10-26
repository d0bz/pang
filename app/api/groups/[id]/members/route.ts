import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { sendGroupInvitationEmail } from '@/lib/email';

const TEMPORARY_PLACEHOLDER = '$2a$10$temporaryDefaultPasswordPlaceholder';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, userId } = await req.json();
    const groupId = params.id;

    let targetUserId = userId;
    let isBrandNew = false;

    if (!targetUserId && email) {
      const cleanEmail = email.toLowerCase().trim();
      let targetUser = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (!targetUser) {
        isBrandNew = true;
        const defaultName = cleanEmail.split('@')[0];
        const formattedName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);
        targetUser = await prisma.user.create({
          data: {
            name: formattedName,
            email: cleanEmail,
            password: TEMPORARY_PLACEHOLDER,
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanEmail)}`,
          },
        });
      } else if (targetUser.password === TEMPORARY_PLACEHOLDER) {
        isBrandNew = true;
      }

      targetUserId = targetUser.id;
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID or email is required' }, { status: 400 });
    }

    // Check if already a member
    const existing = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: targetUserId,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'User is already a member of this group' }, { status: 400 });
    }

    const [newMember, group] = await Promise.all([
      prisma.groupMember.create({
        data: {
          groupId,
          userId: targetUserId,
          role: 'member',
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true, password: true },
          },
        },
      }),
      prisma.group.findUnique({
        where: { id: groupId },
        select: { name: true },
      }),
    ]);

    // Record activity
    await prisma.activity.create({
      data: {
        groupId,
        userId: user.id,
        type: 'MEMBER_ADDED',
        title: `${user.name} added ${newMember.user.name} to the group`,
      },
    });

    // Send invitation email via SMTP
    const isNewUser = isBrandNew || newMember.user.password === TEMPORARY_PLACEHOLDER;
    const emailResult = await sendGroupInvitationEmail({
      recipientEmail: newMember.user.email,
      recipientName: newMember.user.name,
      inviterName: user.name,
      groupName: group?.name || 'Group',
      isNewUser,
    });

    return NextResponse.json({
      success: true,
      member: {
        id: newMember.id,
        groupId: newMember.groupId,
        userId: newMember.userId,
        role: newMember.role,
        joinedAt: newMember.joinedAt,
        user: {
          id: newMember.user.id,
          name: newMember.user.name,
          email: newMember.user.email,
          avatarUrl: newMember.user.avatarUrl,
        },
      },
      emailSent: emailResult.success,
    });
  } catch (err: any) {
    console.error('Error adding member to group:', err);
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
  }
}
