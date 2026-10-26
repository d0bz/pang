import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { calculateSplits, SplitType, ParticipantInput } from '@/lib/splits';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: params.id },
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
        group: {
          select: { id: true, name: true },
        },
      },
    });

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json({ expense });
  } catch (err: any) {
    console.error('Error fetching expense:', err);
    return NextResponse.json({ error: 'Failed to fetch expense' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleUpdateExpense(req, params.id);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleUpdateExpense(req, params.id);
}

async function handleUpdateExpense(req: NextRequest, expenseId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existingExpense = await prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!existingExpense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const {
      groupId,
      payerId,
      description,
      amount,
      category,
      splitType = 'EQUAL',
      date,
      notes,
      participants,
    } = await req.json();

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be a valid number greater than 0' }, { status: 400 });
    }

    if (!description || !description.trim()) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    if (!payerId) {
      return NextResponse.json({ error: 'Payer is required' }, { status: 400 });
    }

    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json({ error: 'Participants are required' }, { status: 400 });
    }

    const splitCalc = calculateSplits(parsedAmount, splitType as any, participants);
    if (!splitCalc.valid) {
      return NextResponse.json({ error: splitCalc.error || 'Invalid split breakdown' }, { status: 400 });
    }

    const payer = await prisma.user.findUnique({
      where: { id: payerId },
    });
    if (!payer) {
      return NextResponse.json({ error: 'Payer not found' }, { status: 400 });
    }

    const expense = await prisma.$transaction(async (tx) => {
      // 1. Delete old splits
      await tx.expenseSplit.deleteMany({
        where: { expenseId },
      });

      // 2. Update expense and create new splits
      const updated = await tx.expense.update({
        where: { id: expenseId },
        data: {
          groupId: groupId || null,
          payerId,
          description: description.trim(),
          amount: Math.round(parsedAmount * 100) / 100,
          category: category || 'General',
          splitType,
          date: date ? new Date(date) : new Date(),
          notes: notes?.trim() || null,
          splits: {
            create: splitCalc.splits.map((s) => ({
              userId: s.userId,
              amount: s.amount,
              share: s.share,
            })),
          },
        },
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
          group: {
            select: { id: true, name: true },
          },
        },
      });

      // 3. Log activity
      await tx.activity.create({
        data: {
          groupId: groupId || null,
          userId: user.id,
          type: 'EXPENSE_UPDATED',
          title: `${user.name} updated "${description.trim()}" (€${parsedAmount.toFixed(2)})`,
          description: `Paid by ${payer.name} • Split ${splitType.toLowerCase()}`,
        },
      });

      return updated;
    });

    return NextResponse.json({ success: true, expense });
  } catch (err: any) {
    console.error('Error updating expense:', err);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
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

    const expense = await prisma.expense.findUnique({
      where: { id: params.id },
    });

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.expenseSplit.deleteMany({
        where: { expenseId: params.id },
      });

      await tx.expense.delete({
        where: { id: params.id },
      });

      await tx.activity.create({
        data: {
          groupId: expense.groupId,
          userId: user.id,
          type: 'EXPENSE_DELETED',
          title: `${user.name} deleted expense "${expense.description}"`,
        },
      });
    });

    return NextResponse.json({ success: true, message: 'Expense deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting expense:', err);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
