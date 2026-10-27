export interface SettleUserItem {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface SettleDebtItem {
  fromUserId: string;
  fromUserName?: string;
  toUserId: string;
  toUserName?: string;
  amount: number;
}

export interface SettleGroupItem {
  id: string;
  name: string;
  simplifyDebts?: boolean;
  members: Array<{ id?: string; userId?: string; name: string }>;
  debts?: {
    simplified: SettleDebtItem[];
    direct?: SettleDebtItem[];
  };
}

export interface SettleFriendItem {
  id: string;
  name: string;
  balance: number;
}

export function getPayerOptions(users: SettleUserItem[], payerId: string): SettleUserItem[] {
  return users.filter((u) => u.id === payerId);
}

export function getOwedMapAndReceivers(params: {
  payerId: string;
  groupId: string;
  users: SettleUserItem[];
  groups: SettleGroupItem[];
  defaultGroupId?: string | null;
  currentGroupDebts?: { simplified: SettleDebtItem[]; direct?: SettleDebtItem[] } | null;
  friends?: SettleFriendItem[];
  currentUserId?: string;
  explicitToUserId?: string;
}): {
  owedMap: Map<string, number>;
  receiverOptions: SettleUserItem[];
} {
  const {
    payerId,
    groupId,
    users,
    groups,
    defaultGroupId,
    currentGroupDebts,
    friends,
    currentUserId,
    explicitToUserId,
  } = params;

  const owedMap = new Map<string, number>();

  if (groupId) {
    const grp = groups.find((g) => g.id === groupId);
    const debtsObj =
      defaultGroupId && defaultGroupId === groupId && currentGroupDebts
        ? currentGroupDebts
        : grp?.debts;
    const activeDebts =
      grp?.simplifyDebts === false && debtsObj?.direct
        ? debtsObj.direct
        : debtsObj?.simplified || [];

    for (const d of activeDebts) {
      if (d.fromUserId === payerId && d.amount > 0.005) {
        owedMap.set(d.toUserId, Math.round(d.amount * 100) / 100);
      }
    }
  } else {
    for (const g of groups) {
      const activeDebts =
        g.simplifyDebts === false && g.debts?.direct
          ? g.debts.direct
          : g.debts?.simplified || [];
      for (const d of activeDebts) {
        if (d.fromUserId === payerId && d.amount > 0.005) {
          owedMap.set(
            d.toUserId,
            Math.round(((owedMap.get(d.toUserId) ?? 0) + d.amount) * 100) / 100
          );
        }
      }
    }
    if (owedMap.size === 0 && payerId === currentUserId && friends) {
      for (const f of friends) {
        if (f.balance < -0.005) {
          owedMap.set(f.id, Math.round(Math.abs(f.balance) * 100) / 100);
        }
      }
    }
  }

  let otherUsers = users.filter((u) => u.id !== payerId);
  if (groupId) {
    const grp = groups.find((g) => g.id === groupId);
    if (grp?.members?.length) {
      const memberIds = new Set(grp.members.map((m) => m.id || m.userId));
      const groupOthers = otherUsers.filter((u) => memberIds.has(u.id));
      if (groupOthers.length > 0) {
        otherUsers = groupOthers;
      }
    }
  }

  const owedUsers = otherUsers.filter((u) => (owedMap.get(u.id) ?? 0) > 0.005);
  let receiverOptions = owedUsers.length > 0 ? [...owedUsers] : [...otherUsers];

  if (
    explicitToUserId &&
    explicitToUserId !== payerId &&
    !receiverOptions.some((u) => u.id === explicitToUserId)
  ) {
    const explicitUser = users.find((u) => u.id === explicitToUserId);
    if (explicitUser) {
      receiverOptions = [explicitUser, ...receiverOptions];
    }
  }

  return { owedMap, receiverOptions };
}

export function resolveInitialSettleUpState(params: {
  currentUserId: string;
  defaultFromUserId?: string;
  defaultToUserId?: string;
  defaultAmount?: number;
  defaultGroupId?: string | null;
  users: SettleUserItem[];
  groups: SettleGroupItem[];
  currentGroupDebts?: { simplified: SettleDebtItem[]; direct?: SettleDebtItem[] } | null;
  friends?: SettleFriendItem[];
}): {
  fromUserId: string;
  toUserId: string;
  amount: string;
  groupId: string;
} {
  const {
    currentUserId,
    defaultFromUserId,
    defaultToUserId,
    defaultAmount,
    defaultGroupId,
    users,
    groups,
    currentGroupDebts,
    friends,
  } = params;

  const fromUserId = defaultFromUserId || currentUserId;

  let groupId = defaultGroupId || '';
  if (!groupId && groups.length > 0) {
    if (defaultToUserId) {
      const grpWithTargetDebt = groups.find((g) => {
        const active =
          g.simplifyDebts === false && g.debts?.direct
            ? g.debts.direct
            : g.debts?.simplified || [];
        return active.some(
          (d) => d.fromUserId === fromUserId && d.toUserId === defaultToUserId && d.amount > 0.005
        );
      });
      if (grpWithTargetDebt) {
        groupId = grpWithTargetDebt.id;
      }
    }
    if (!groupId) {
      const grpWithAnyDebt = groups.find((g) => {
        const active =
          g.simplifyDebts === false && g.debts?.direct
            ? g.debts.direct
            : g.debts?.simplified || [];
        return active.some((d) => d.fromUserId === fromUserId && d.amount > 0.005);
      });
      if (grpWithAnyDebt) {
        groupId = grpWithAnyDebt.id;
      }
    }
  }

  const { owedMap, receiverOptions } = getOwedMapAndReceivers({
    payerId: fromUserId,
    groupId,
    users,
    groups,
    defaultGroupId,
    currentGroupDebts,
    friends,
    currentUserId,
    explicitToUserId: defaultToUserId,
  });

  const toUserId =
    defaultToUserId && defaultToUserId !== fromUserId
      ? defaultToUserId
      : receiverOptions[0]?.id || '';

  let amount = '';
  if (defaultAmount !== undefined && defaultAmount > 0) {
    amount = defaultAmount.toFixed(2);
  } else if (toUserId && owedMap.has(toUserId)) {
    amount = owedMap.get(toUserId)!.toFixed(2);
  }

  return { fromUserId, toUserId, amount, groupId };
}
