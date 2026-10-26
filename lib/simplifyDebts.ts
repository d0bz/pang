export interface MemberBalance {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  netBalance: number; // positive = owed money, negative = owes money
}

export interface SimplifiedTransaction {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
}

export interface DirectDebt {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
}

export interface ExpenseRecord {
  id: string;
  payerId: string;
  amount: number;
  splits: {
    userId: string;
    amount: number;
  }[];
}

export interface SettlementRecord {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
}

export interface UserLookup {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

/**
 * Calculates net balances for all members based on expenses and settlements.
 * Net balance = (Amount Paid for Expenses + Settlements Paid) - (Owed Share in Expenses + Settlements Received)
 */
export function calculateNetBalances(
  users: UserLookup[],
  expenses: ExpenseRecord[],
  settlements: SettlementRecord[]
): Map<string, number> {
  const balances = new Map<string, number>();

  // Initialize all members with 0
  for (const user of users) {
    balances.set(user.id, 0);
  }

  // Factor in expenses
  for (const exp of expenses) {
    // Payer is credited the full expense amount
    const currentPayerBal = balances.get(exp.payerId) ?? 0;
    balances.set(exp.payerId, currentPayerBal + exp.amount);

    // Each participant is debited their split amount
    for (const split of exp.splits) {
      const currentParticipantBal = balances.get(split.userId) ?? 0;
      balances.set(split.userId, currentParticipantBal - split.amount);
    }
  }

  // Factor in settlements
  for (const set of settlements) {
    // Sender paid money, so their balance goes UP (less debt / more credit)
    const senderBal = balances.get(set.fromUserId) ?? 0;
    balances.set(set.fromUserId, senderBal + set.amount);

    // Receiver got money, so their balance goes DOWN (less credit / debt cleared)
    const receiverBal = balances.get(set.toUserId) ?? 0;
    balances.set(set.toUserId, receiverBal - set.amount);
  }

  // Round to 2 decimal places to avoid floating point drift
  Array.from(balances.entries()).forEach(([userId, val]) => {
    balances.set(userId, Math.round(val * 100) / 100);
  });

  return balances;
}

/**
 * Pang Debt Simplification (Min-Cash-Flow Greedy Algorithm)
 * Minimizes the total number of payments needed to settle all debts in a group.
 */
export function simplifyDebts(
  users: UserLookup[],
  expenses: ExpenseRecord[],
  settlements: SettlementRecord[]
): SimplifiedTransaction[] {
  const userMap = new Map(users.map((u) => [u.id, u.name]));
  const netBalances = calculateNetBalances(users, expenses, settlements);

  // Separate into debtors (owe money < 0) and creditors (owed money > 0)
  const debtors: { userId: string; amount: number }[] = [];
  const creditors: { userId: string; amount: number }[] = [];

  Array.from(netBalances.entries()).forEach(([userId, balance]) => {
    if (balance < -0.005) {
      debtors.push({ userId, amount: -balance }); // store as positive debt
    } else if (balance > 0.005) {
      creditors.push({ userId, amount: balance });
    }
  });

  const transactions: SimplifiedTransaction[] = [];

  // Sort debtors & creditors descending to settle largest amounts first
  while (debtors.length > 0 && creditors.length > 0) {
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const debtor = debtors[0];
    const creditor = creditors[0];

    const settledAmount = Math.min(debtor.amount, creditor.amount);
    const roundedAmount = Math.round(settledAmount * 100) / 100;

    if (roundedAmount > 0.005) {
      transactions.push({
        fromUserId: debtor.userId,
        fromUserName: userMap.get(debtor.userId) || 'Unknown',
        toUserId: creditor.userId,
        toUserName: userMap.get(creditor.userId) || 'Unknown',
        amount: roundedAmount,
      });
    }

    debtor.amount -= settledAmount;
    creditor.amount -= settledAmount;

    if (debtor.amount <= 0.005) {
      debtors.shift();
    }
    if (creditor.amount <= 0.005) {
      creditors.shift();
    }
  }

  return transactions;
}

/**
 * Calculates raw pairwise debts (without debt simplification)
 */
export function calculateDirectDebts(
  users: UserLookup[],
  expenses: ExpenseRecord[],
  settlements: SettlementRecord[]
): DirectDebt[] {
  const userMap = new Map(users.map((u) => [u.id, u.name]));
  // pairwise[A][B] = how much A directly owes B
  const pairwise = new Map<string, Map<string, number>>();

  const getDirect = (from: string, to: string) => {
    return pairwise.get(from)?.get(to) ?? 0;
  };

  const addDirect = (from: string, to: string, amt: number) => {
    if (from === to || amt <= 0.005) return;
    if (!pairwise.has(from)) pairwise.set(from, new Map());
    const m = pairwise.get(from)!;
    m.set(to, (m.get(to) ?? 0) + amt);
  };

  // Expenses: each participant owes the payer their split
  for (const exp of expenses) {
    const payer = exp.payerId;
    for (const split of exp.splits) {
      if (split.userId !== payer && split.amount > 0.005) {
        addDirect(split.userId, payer, split.amount);
      }
    }
  }

  // Settlements: fromUser paid toUser, reducing debt fromUser -> toUser (or increasing reverse)
  for (const set of settlements) {
    if (set.fromUserId === set.toUserId || set.amount <= 0.005) continue;
    // (addDirect ignores non-positive amounts, so adjust the map directly)
    if (!pairwise.has(set.fromUserId)) pairwise.set(set.fromUserId, new Map());
    const fm = pairwise.get(set.fromUserId)!;
    fm.set(set.toUserId, (fm.get(set.toUserId) ?? 0) - set.amount);
  }

  // Net out bilateral pairs: if A owes B €50 and B owes A €20, net is A owes B €30
  const userIds = users.map((u) => u.id);
  const directDebts: DirectDebt[] = [];
  const processedPairs = new Set<string>();

  for (let i = 0; i < userIds.length; i++) {
    for (let j = i + 1; j < userIds.length; j++) {
      const u1 = userIds[i];
      const u2 = userIds[j];
      const key = `${u1}_${u2}`;
      if (processedPairs.has(key)) continue;
      processedPairs.add(key);

      const u1OwesU2 = getDirect(u1, u2);
      const u2OwesU1 = getDirect(u2, u1);

      const diff = u1OwesU2 - u2OwesU1;
      const rounded = Math.round(Math.abs(diff) * 100) / 100;

      if (diff > 0.005) {
        directDebts.push({
          fromUserId: u1,
          fromUserName: userMap.get(u1) || 'Unknown',
          toUserId: u2,
          toUserName: userMap.get(u2) || 'Unknown',
          amount: rounded,
        });
      } else if (diff < -0.005) {
        directDebts.push({
          fromUserId: u2,
          fromUserName: userMap.get(u2) || 'Unknown',
          toUserId: u1,
          toUserName: userMap.get(u1) || 'Unknown',
          amount: rounded,
        });
      }
    }
  }

  return directDebts;
}
