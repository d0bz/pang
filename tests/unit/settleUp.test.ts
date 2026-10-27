import { describe, it, expect } from 'vitest';
import {
  getPayerOptions,
  getOwedMapAndReceivers,
  resolveInitialSettleUpState,
  SettleUserItem,
  SettleGroupItem,
} from '@/lib/settleUp';

const users: SettleUserItem[] = [
  { id: 'u1', name: 'Alice' },
  { id: 'u2', name: 'Bob' },
  { id: 'u3', name: 'Charlie' },
  { id: 'u4', name: 'Dana' },
];

const groupWithMultipleReceivers: SettleGroupItem = {
  id: 'g1',
  name: 'Trip',
  simplifyDebts: true,
  members: [
    { id: 'u1', name: 'Alice' },
    { id: 'u2', name: 'Bob' },
    { id: 'u3', name: 'Charlie' },
    { id: 'u4', name: 'Dana' },
  ],
  debts: {
    simplified: [
      { fromUserId: 'u1', toUserId: 'u2', amount: 25.5 },
      { fromUserId: 'u1', toUserId: 'u3', amount: 12 },
      { fromUserId: 'u4', toUserId: 'u2', amount: 8 },
    ],
    direct: [
      { fromUserId: 'u1', toUserId: 'u4', amount: 30 },
    ],
  },
};

describe('settleUp helpers', () => {
  it('getPayerOptions only returns the payer and hides all other participants', () => {
    const opts = getPayerOptions(users, 'u1');
    expect(opts).toEqual([{ id: 'u1', name: 'Alice' }]);
  });

  it('lists only receivers owed by payer when debts exist and maps their exact amounts', () => {
    const { owedMap, receiverOptions } = getOwedMapAndReceivers({
      payerId: 'u1',
      groupId: 'g1',
      users,
      groups: [groupWithMultipleReceivers],
    });
    expect(receiverOptions.map((u) => u.id)).toEqual(['u2', 'u3']);
    expect(owedMap.get('u2')).toBe(25.5);
    expect(owedMap.get('u3')).toBe(12);
    expect(owedMap.has('u4')).toBe(false);
  });

  it('prefills payer, first receiver, and amount when opening Settle Up', () => {
    const init = resolveInitialSettleUpState({
      currentUserId: 'u1',
      defaultGroupId: 'g1',
      users,
      groups: [groupWithMultipleReceivers],
    });
    expect(init).toEqual({
      fromUserId: 'u1',
      toUserId: 'u2',
      amount: '25.50',
      groupId: 'g1',
    });
  });

  it('prefills specific receiver and their owed amount when receiver is specified or selected', () => {
    const init = resolveInitialSettleUpState({
      currentUserId: 'u1',
      defaultToUserId: 'u3',
      defaultGroupId: 'g1',
      users,
      groups: [groupWithMultipleReceivers],
    });
    expect(init).toEqual({
      fromUserId: 'u1',
      toUserId: 'u3',
      amount: '12.00',
      groupId: 'g1',
    });
  });

  it('auto-selects group where payer owes money when opened from Dashboard without defaultGroupId', () => {
    const init = resolveInitialSettleUpState({
      currentUserId: 'u1',
      users,
      groups: [groupWithMultipleReceivers],
    });
    expect(init).toEqual({
      fromUserId: 'u1',
      toUserId: 'u2',
      amount: '25.50',
      groupId: 'g1',
    });
  });

  it('uses direct debts when group simplifyDebts is false', () => {
    const directGroup: SettleGroupItem = {
      ...groupWithMultipleReceivers,
      simplifyDebts: false,
    };
    const init = resolveInitialSettleUpState({
      currentUserId: 'u1',
      defaultGroupId: 'g1',
      users,
      groups: [directGroup],
    });
    expect(init).toEqual({
      fromUserId: 'u1',
      toUserId: 'u4',
      amount: '30.00',
      groupId: 'g1',
    });
  });

  it('falls back to other group members with empty amount when payer owes nobody', () => {
    const settledGroup: SettleGroupItem = {
      ...groupWithMultipleReceivers,
      debts: { simplified: [], direct: [] },
    };
    const { receiverOptions } = getOwedMapAndReceivers({
      payerId: 'u1',
      groupId: 'g1',
      users,
      groups: [settledGroup],
    });
    expect(receiverOptions.map((u) => u.id)).toEqual(['u2', 'u3', 'u4']);
    const init = resolveInitialSettleUpState({
      currentUserId: 'u1',
      defaultGroupId: 'g1',
      users,
      groups: [settledGroup],
    });
    expect(init).toEqual({
      fromUserId: 'u1',
      toUserId: 'u2',
      amount: '',
      groupId: 'g1',
    });
  });
});
