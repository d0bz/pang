import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      groupId,
      fromUserId,
      toUserId,
      amount,
      paymentMethod = 'Cash',
      notes,
      date,
    } = await req.json();

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be a valid number greater than 0' }, { status: 400 });
    }

    if (!fromUserId || !toUserId) {
      return NextResponse.json({ error: 'Both sender and receiver are required' }, { status: 400 });
    }

    if (fromUserId === toUserId) {
      return NextResponse.json({ error: 'Sender and receiver cannot be the same person' }, { status: 400 });
    }

    const [fromUser, toUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: fromUserId } }),
      prisma.user.findUnique({ where: { id: toUserId } }),
    ]);

    if (!fromUser || !toUser) {
      return NextResponse.json({ error: 'Sender or receiver user not found' }, { status: 404 });
    }

    const settlement = await prisma.$transaction(async (tx) => {
      const sett = await tx.settlement.create({
        data: {
          groupId: groupId || null,
          fromUserId,
          toUserId,
          amount: Math.round(parsedAmount * 100) / 100,
          paymentMethod,
          notes: notes?.trim() || null,
          date: date ? new Date(date) : new Date(),
        },
        include: {
          fromUser: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          toUser: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      });

      await tx.activity.create({
        data: {
          groupId: groupId || null,
          userId: user.id,
          type: 'SETTLEMENT_RECORDED',
          title: `${fromUser.name} paid ${toUser.name} €${parsedAmount.toFixed(2)}`,
          description: `Method: ${paymentMethod}${notes ? ` • Note: ${notes.trim()}` : ''}`,
        },
      });

      return sett;
    });

    return NextResponse.json({ success: true, settlement });
  } catch (err: any) {
    console.error('Error creating settlement:', err);
    return NextResponse.json({ error: 'Failed to record settlement' }, { status: 500 });
  }
}
