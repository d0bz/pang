import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { calculateSplits, SplitType, ParticipantInput } from '@/lib/splits';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      participants, // Array of { userId, name, included, value }
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

    // Calculate splits using our splitting engine
    const splitCalc = calculateSplits(parsedAmount, splitType as SplitType, participants as ParticipantInput[]);

    if (!splitCalc.valid) {
      return NextResponse.json({ error: splitCalc.error || 'Invalid split breakdown' }, { status: 400 });
    }

    if (groupId) {
      const grp = await prisma.group.findUnique({ where: { id: groupId }, select: { locked: true } });
      if (grp?.locked) {
        return NextResponse.json({ error: 'This group is locked. No new bills can be added.' }, { status: 403 });
      }
    }

    // Verify payer exists
    const payer = await prisma.user.findUnique({
      where: { id: payerId },
    });
    if (!payer) {
      return NextResponse.json({ error: 'Payer not found' }, { status: 400 });
    }

    // Create expense in transaction
    const expense = await prisma.$transaction(async (tx) => {
      const exp = await tx.expense.create({
        data: {
          groupId: groupId || null,
          payerId,
          description: description.trim(),
          amount: Math.round(parsedAmount * 100) / 100,
          category: category || 'General',
          currency: 'EUR',
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
        },
      });

      // Log activity
      await tx.activity.create({
        data: {
          groupId: groupId || null,
          userId: user.id,
          type: 'EXPENSE_ADDED',
          title: `${user.name} added "${description.trim()}" (€${parsedAmount.toFixed(2)})`,
          description: `Paid by ${payer.name} • Split ${splitType.toLowerCase()}`,
        },
      });

      return exp;
    });

    return NextResponse.json({ success: true, expense });
  } catch (err: any) {
    console.error('Error creating expense:', err);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}
