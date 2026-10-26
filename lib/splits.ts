export type SplitType = 'EQUAL' | 'EXACT' | 'PERCENT' | 'SHARES';

export interface ParticipantInput {
  userId: string;
  name: string;
  included?: boolean;
  value?: number; // exact amount, percentage (0-100), or share count
}

export interface SplitResult {
  userId: string;
  amount: number;
  share?: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  remaining?: number;
  splits: SplitResult[];
}

export function calculateSplits(
  totalAmount: number,
  splitType: SplitType,
  participants: ParticipantInput[]
): ValidationResult {
  if (totalAmount <= 0) {
    return { valid: false, error: 'Total amount must be greater than 0', splits: [] };
  }

  // Filter only selected/included participants
  const active = participants.filter((p) => p.included !== false);
  if (active.length === 0) {
    return { valid: false, error: 'At least one participant must be included', splits: [] };
  }

  if (splitType === 'EQUAL') {
    const count = active.length;
    const baseShare = Math.floor((totalAmount / count) * 100) / 100;
    let distributed = baseShare * count;
    let remainderCents = Math.round((totalAmount - distributed) * 100);

    const splits: SplitResult[] = active.map((p, index) => {
      let amount = baseShare;
      if (remainderCents > 0) {
        amount = Math.round((amount + 0.01) * 100) / 100;
        remainderCents--;
      }
      return { userId: p.userId, amount };
    });

    return { valid: true, splits };
  }

  if (splitType === 'EXACT') {
    let sum = 0;
    const splits: SplitResult[] = active.map((p) => {
      const val = Math.round((p.value ?? 0) * 100) / 100;
      sum += val;
      return { userId: p.userId, amount: val };
    });

    sum = Math.round(sum * 100) / 100;
    const diff = Math.round((totalAmount - sum) * 100) / 100;

    if (Math.abs(diff) > 0.01) {
      return {
        valid: false,
        error: diff > 0 ? `€${diff.toFixed(2)} left to split` : `€${Math.abs(diff).toFixed(2)} over allocated`,
        remaining: diff,
        splits,
      };
    }

    return { valid: true, splits };
  }

  if (splitType === 'PERCENT') {
    let totalPercent = 0;
    for (const p of active) {
      totalPercent += p.value ?? 0;
    }
    totalPercent = Math.round(totalPercent * 100) / 100;

    const percentDiff = Math.round((100 - totalPercent) * 100) / 100;
    if (Math.abs(percentDiff) > 0.05) {
      return {
        valid: false,
        error: percentDiff > 0 ? `${percentDiff}% remaining` : `${Math.abs(percentDiff)}% over 100%`,
        remaining: percentDiff,
        splits: [],
      };
    }

    let calculatedSum = 0;
    const splits: SplitResult[] = active.map((p) => {
      const percent = p.value ?? 0;
      const amt = Math.round(((totalAmount * percent) / 100) * 100) / 100;
      calculatedSum += amt;
      return { userId: p.userId, amount: amt, share: percent };
    });

    calculatedSum = Math.round(calculatedSum * 100) / 100;
    const centDiscrepancy = Math.round((totalAmount - calculatedSum) * 100) / 100;
    if (splits.length > 0 && Math.abs(centDiscrepancy) <= 0.05 && centDiscrepancy !== 0) {
      splits[0].amount = Math.round((splits[0].amount + centDiscrepancy) * 100) / 100;
    }

    return { valid: true, splits };
  }

  if (splitType === 'SHARES') {
    let totalShares = 0;
    for (const p of active) {
      totalShares += Math.max(0, p.value ?? 1);
    }

    if (totalShares <= 0) {
      return { valid: false, error: 'Total shares must be greater than 0', splits: [] };
    }

    let calculatedSum = 0;
    const splits: SplitResult[] = active.map((p) => {
      const shareCount = Math.max(0, p.value ?? 1);
      const amt = Math.round(((totalAmount * shareCount) / totalShares) * 100) / 100;
      calculatedSum += amt;
      return { userId: p.userId, amount: amt, share: shareCount };
    });

    calculatedSum = Math.round(calculatedSum * 100) / 100;
    const centDiscrepancy = Math.round((totalAmount - calculatedSum) * 100) / 100;
    if (splits.length > 0 && Math.abs(centDiscrepancy) <= 0.05 && centDiscrepancy !== 0) {
      splits[0].amount = Math.round((splits[0].amount + centDiscrepancy) * 100) / 100;
    }

    return { valid: true, splits };
  }

  return { valid: false, error: 'Invalid split type', splits: [] };
}
