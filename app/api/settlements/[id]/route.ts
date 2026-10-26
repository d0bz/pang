import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleUpdateSettlement(req, params.id);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleUpdateSettlement(req, params.id);
}

async function handleUpdateSettlement(req: NextRequest, settlementId: string) {
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

    const settlement = await prisma.settlement.findUnique({
      where: { id: settlementId },
    });

    if (!settlement) {
      return NextResponse.json({ error: 'Settlement not found' }, { status: 404 });
    }

    const [fromUser, toUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: fromUserId } }),
      prisma.user.findUnique({ where: { id: toUserId } }),
    ]);

    if (!fromUser || !toUser) {
      return NextResponse.json({ error: 'Sender or receiver user not found' }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const sett = await tx.settlement.update({
        where: { id: settlementId },
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
          title: `${user.name} updated payment of €${parsedAmount.toFixed(2)} between ${fromUser.name} and ${toUser.name}`,
          description: `Method: ${paymentMethod}${notes ? ` • Note: ${notes.trim()}` : ''}`,
        },
      });

      return sett;
    });

    return NextResponse.json({ success: true, settlement: updated });
  } catch (err: any) {
    console.error('Error updating settlement:', err);
    return NextResponse.json({ error: 'Failed to update settlement' }, { status: 500 });
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

    const settlement = await prisma.settlement.findUnique({
      where: { id: params.id },
      include: {
        fromUser: true,
        toUser: true,
      },
    });

    if (!settlement) {
      return NextResponse.json({ error: 'Settlement not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.settlement.delete({
        where: { id: params.id },
      });

      await tx.activity.create({
        data: {
          groupId: settlement.groupId,
          userId: user.id,
          type: 'SETTLEMENT_RECORDED',
          title: `${user.name} removed settlement payment of €${settlement.amount.toFixed(2)} between ${settlement.fromUser.name} and ${settlement.toUser.name}`,
        },
      });
    });

    return NextResponse.json({ success: true, message: 'Settlement removed' });
  } catch (err: any) {
    console.error('Error deleting settlement:', err);
    return NextResponse.json({ error: 'Failed to delete settlement' }, { status: 500 });
  }
}
