import { describe, it, expect } from 'vitest';
import { calculateSplits, ParticipantInput } from '@/lib/splits';

const P = (ids: string[], value?: number[]): ParticipantInput[] =>
  ids.map((id, i) => ({ userId: id, name: id, included: true, value: value?.[i] }));
const sum = (r: { splits: { amount: number }[] }) =>
  Math.round(r.splits.reduce((s, x) => s + x.amount, 0) * 100) / 100;

describe('calculateSplits', () => {
  it('rejects amount <= 0', () => {
    expect(calculateSplits(0, 'EQUAL', P(['a'])).valid).toBe(false);
    expect(calculateSplits(-5, 'EQUAL', P(['a'])).valid).toBe(false);
  });
  it('rejects when no participant included', () => {
    const r = calculateSplits(10, 'EQUAL', [{ userId: 'a', name: 'a', included: false }]);
    expect(r.valid).toBe(false);
  });

  describe('EQUAL', () => {
    it('splits evenly', () => {
      const r = calculateSplits(30, 'EQUAL', P(['a', 'b', 'c']));
      expect(r.valid).toBe(true);
      expect(r.splits.map((s) => s.amount)).toEqual([10, 10, 10]);
    });
    it('distributes remainder cents and sums to total', () => {
      const r = calculateSplits(10, 'EQUAL', P(['a', 'b', 'c']));
      expect(sum(r)).toBe(10);
      expect(r.splits.map((s) => s.amount).sort()).toEqual([3.33, 3.33, 3.34]);
    });
    it('ignores excluded participants', () => {
      const ps = [...P(['a', 'b']), { userId: 'c', name: 'c', included: false }];
      const r = calculateSplits(10, 'EQUAL', ps);
      expect(r.splits.map((s) => s.userId)).toEqual(['a', 'b']);
      expect(sum(r)).toBe(10);
    });
    it.each([0.01, 0.02, 99.99, 100, 1234.56])('always sums to %s with 7 people', (amt) => {
      expect(sum(calculateSplits(amt, 'EQUAL', P(['1', '2', '3', '4', '5', '6', '7'])))).toBe(amt);
    });
  });

  describe('EXACT', () => {
    it('accepts matching sum', () => {
      const r = calculateSplits(10, 'EXACT', P(['a', 'b'], [3, 7]));
      expect(r.valid).toBe(true);
      expect(sum(r)).toBe(10);
    });
    it('reports under-allocation', () => {
      const r = calculateSplits(10, 'EXACT', P(['a', 'b'], [3, 5]));
      expect(r.valid).toBe(false);
      expect(r.error).toMatch(/left to split/);
    });
    it('reports over-allocation', () => {
      const r = calculateSplits(10, 'EXACT', P(['a', 'b'], [8, 5]));
      expect(r.valid).toBe(false);
      expect(r.error).toMatch(/over allocated/);
    });
  });

  describe('PERCENT', () => {
    it('splits by percentage', () => {
      const r = calculateSplits(200, 'PERCENT', P(['a', 'b'], [25, 75]));
      expect(r.valid).toBe(true);
      expect(r.splits.map((s) => s.amount)).toEqual([50, 150]);
    });
    it('rejects total != 100', () => {
      expect(calculateSplits(100, 'PERCENT', P(['a', 'b'], [40, 40])).valid).toBe(false);
      expect(calculateSplits(100, 'PERCENT', P(['a', 'b'], [60, 60])).error).toMatch(/over 100/);
    });
    it('fixes cent discrepancy so total matches', () => {
      const r = calculateSplits(10, 'PERCENT', P(['a', 'b', 'c'], [33.33, 33.33, 33.34]));
      expect(r.valid).toBe(true);
      expect(sum(r)).toBe(10);
    });
  });

  describe('SHARES', () => {
    it('splits proportionally', () => {
      const r = calculateSplits(100, 'SHARES', P(['a', 'b'], [1, 3]));
      expect(r.splits.map((s) => s.amount)).toEqual([25, 75]);
    });
    it('defaults to 1 share each when no value', () => {
      const r = calculateSplits(10, 'SHARES', P(['a', 'b']));
      expect(r.splits.map((s) => s.amount)).toEqual([5, 5]);
    });
    it('rejects zero total shares', () => {
      expect(calculateSplits(10, 'SHARES', P(['a', 'b'], [0, 0])).valid).toBe(false);
    });
    it('sums to total', () => {
      expect(sum(calculateSplits(10, 'SHARES', P(['a', 'b', 'c'], [1, 1, 1])))).toBe(10);
    });
  });
});
