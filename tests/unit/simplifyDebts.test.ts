import { describe, it, expect } from 'vitest';
import { calculateNetBalances, simplifyDebts, calculateDirectDebts } from '@/lib/simplifyDebts';

const users = ['A', 'B', 'C'].map((id) => ({ id, name: id }));
const exp = (id: string, payerId: string, amount: number, splits: Record<string, number>) => ({
  id,
  payerId,
  amount,
  splits: Object.entries(splits).map(([userId, amount]) => ({ userId, amount })),
});

describe('calculateNetBalances', () => {
  it('credits payer and debits participants', () => {
    const b = calculateNetBalances(users, [exp('1', 'A', 30, { A: 10, B: 10, C: 10 })], []);
    expect(b.get('A')).toBeCloseTo(20);
    expect(b.get('B')).toBeCloseTo(-10);
    expect(b.get('C')).toBeCloseTo(-10);
  });
  it('applies settlements (payer of settlement improves balance)', () => {
    const b = calculateNetBalances(
      users,
      [exp('1', 'A', 30, { A: 10, B: 10, C: 10 })],
      [{ id: 's', fromUserId: 'B', toUserId: 'A', amount: 10 }]
    );
    expect(b.get('B')).toBeCloseTo(0);
    expect(b.get('A')).toBeCloseTo(10);
  });
  it('zero for everyone with no activity', () => {
    const b = calculateNetBalances(users, [], []);
    expect([...b.values()]).toEqual([0, 0, 0]);
  });
});

describe('simplifyDebts', () => {
  it('returns empty when settled', () => {
    expect(simplifyDebts(users, [], [])).toEqual([]);
  });
  it('collapses a chain A<-B<-C into fewer payments', () => {
    // B owes A 10, C owes B 10 => C pays A 10
    const e = [exp('1', 'A', 10, { B: 10 }), exp('2', 'B', 10, { C: 10 })];
    const t = simplifyDebts(users, e, []);
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ fromUserId: 'C', toUserId: 'A', amount: 10 });
  });
  it('nets circular debt to nothing', () => {
    const e = [exp('1', 'A', 10, { B: 10 }), exp('2', 'B', 10, { C: 10 }), exp('3', 'C', 10, { A: 10 })];
    expect(simplifyDebts(users, e, [])).toEqual([]);
  });
  it('total transferred equals total owed and clears all balances', () => {
    const e = [exp('1', 'A', 90, { A: 30, B: 30, C: 30 }), exp('2', 'B', 20, { A: 10, C: 10 })];
    const t = simplifyDebts(users, e, []);
    const after = calculateNetBalances(
      users,
      e,
      t.map((x, i) => ({ id: String(i), fromUserId: x.fromUserId, toUserId: x.toUserId, amount: x.amount }))
    );
    for (const v of after.values()) expect(Math.abs(v)).toBeLessThan(0.02);
  });
  it('settlement removes debt', () => {
    const e = [exp('1', 'A', 20, { A: 10, B: 10 })];
    const t = simplifyDebts(users, e, [{ id: 's', fromUserId: 'B', toUserId: 'A', amount: 10 }]);
    expect(t).toEqual([]);
  });
});

describe('calculateDirectDebts', () => {
  it('nets bilateral debts', () => {
    const e = [exp('1', 'A', 50, { B: 50 }), exp('2', 'B', 20, { A: 20 })];
    const d = calculateDirectDebts(users, e, []);
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ fromUserId: 'B', toUserId: 'A', amount: 30 });
  });
  it('settlement reduces direct debt', () => {
    const e = [exp('1', 'A', 50, { B: 50 })];
    const d = calculateDirectDebts(users, e, [{ id: 's', fromUserId: 'B', toUserId: 'A', amount: 20 }]);
    expect(d[0]).toMatchObject({ fromUserId: 'B', toUserId: 'A', amount: 30 });
  });
  it('empty when nothing owed', () => {
    expect(calculateDirectDebts(users, [], [])).toEqual([]);
  });
});
