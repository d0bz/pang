import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { POST as addExpense } from '@/app/api/expenses/route';
import { PUT as putExpense, DELETE as delExpense } from '@/app/api/expenses/[id]/route';
import { POST as addSettlement } from '@/app/api/settlements/route';
import { PATCH as patchGroup } from '@/app/api/groups/[id]/route';
import { jsonReq, loginAs, makeUser, makeGroup, expenseBody } from '../helpers';

beforeEach(() => loginAs(null));
const post = (b: any) => addExpense(jsonReq('/api/expenses', 'POST', b));

describe('create expense', () => {
  it('401 when unauthenticated', async () => {
    const a = await makeUser();
    expect((await post(expenseBody(null, a.id, [a.id]))).status).toBe(401);
  });
  it('creates expense with splits and activity', async () => {
    const a = await makeUser();
    const b = await makeUser();
    const g = await makeGroup(a.id, [b.id]);
    loginAs(a.id);
    const res = await post(expenseBody(g.id, a.id, [a.id, b.id], 25));
    expect(res.status).toBe(200);
    const { expense } = await res.json();
    expect(expense.splits.map((s: any) => s.amount).sort()).toEqual([12.5, 12.5]);
    expect(await prisma.activity.count({ where: { groupId: g.id, type: 'EXPENSE_ADDED' } })).toBe(1);
  });
  it.each([
    ['zero amount', { amount: 0 }],
    ['non-numeric amount', { amount: 'abc' }],
    ['blank description', { description: '  ' }],
    ['no payer', { payerId: '' }],
    ['no participants', { participants: [] }],
  ])('400 on %s', async (_n, patch) => {
    const a = await makeUser();
    const g = await makeGroup(a.id);
    loginAs(a.id);
    expect((await post({ ...expenseBody(g.id, a.id, [a.id]), ...patch })).status).toBe(400);
  });
  it('400 on unknown payer', async () => {
    const a = await makeUser();
    loginAs(a.id);
    expect((await post(expenseBody(null, 'ghost', [a.id]))).status).toBe(400);
  });
  it('400 on invalid EXACT split', async () => {
    const a = await makeUser();
    loginAs(a.id);
    const body = { ...expenseBody(null, a.id, [a.id], 10), splitType: 'EXACT', participants: [{ userId: a.id, name: 'a', value: 3 }] };
    expect((await post(body)).status).toBe(400);
  });
  it('allows personal (no group) expenses', async () => {
    const a = await makeUser();
    loginAs(a.id);
    expect((await post(expenseBody(null, a.id, [a.id]))).status).toBe(200);
  });
});

describe('locked group', () => {
  it('rejects new bills with 403 and persists nothing', async () => {
    const a = await makeUser();
    const g = await makeGroup(a.id, [], true);
    loginAs(a.id);
    const res = await post(expenseBody(g.id, a.id, [a.id]));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/locked/i);
    expect(await prisma.expense.count({ where: { groupId: g.id } })).toBe(0);
    expect(await prisma.activity.count({ where: { groupId: g.id, type: 'EXPENSE_ADDED' } })).toBe(0);
  });
  it('lock -> blocked -> unlock -> allowed again (via API)', async () => {
    const a = await makeUser();
    const g = await makeGroup(a.id);
    loginAs(a.id);
    expect((await post(expenseBody(g.id, a.id, [a.id]))).status).toBe(200);
    await patchGroup(jsonReq('/x', 'PATCH', { locked: true }), { params: { id: g.id } });
    expect((await post(expenseBody(g.id, a.id, [a.id]))).status).toBe(403);
    await patchGroup(jsonReq('/x', 'PATCH', { locked: false }), { params: { id: g.id } });
    expect((await post(expenseBody(g.id, a.id, [a.id]))).status).toBe(200);
    expect(await prisma.expense.count({ where: { groupId: g.id } })).toBe(2);
  });
  it('lock only affects its own group and personal expenses', async () => {
    const a = await makeUser();
    const locked = await makeGroup(a.id, [], true);
    const open = await makeGroup(a.id);
    loginAs(a.id);
    expect((await post(expenseBody(locked.id, a.id, [a.id]))).status).toBe(403);
    expect((await post(expenseBody(open.id, a.id, [a.id]))).status).toBe(200);
    expect((await post(expenseBody(null, a.id, [a.id]))).status).toBe(200);
  });
  it('existing bills can still be edited and deleted; settlements still allowed', async () => {
    const a = await makeUser();
    const b = await makeUser();
    const g = await makeGroup(a.id, [b.id]);
    loginAs(a.id);
    const { expense } = await (await post(expenseBody(g.id, a.id, [a.id, b.id], 20))).json();
    await prisma.group.update({ where: { id: g.id }, data: { locked: true } });

    const put = await putExpense(
      jsonReq('/x', 'PUT', { ...expenseBody(g.id, a.id, [a.id, b.id], 40), description: 'Edited' }),
      { params: { id: expense.id } }
    );
    expect(put.status).toBe(200);

    const sett = await addSettlement(
      jsonReq('/api/settlements', 'POST', { groupId: g.id, fromUserId: b.id, toUserId: a.id, amount: 5 })
    );
    expect(sett.status).toBe(200);

    const del = await delExpense(jsonReq('/x', 'DELETE'), { params: { id: expense.id } });
    expect(del.status).toBe(200);
  });
});

describe('settlements', () => {
  it('401, invalid amount, same user, success', async () => {
    const a = await makeUser();
    const b = await makeUser();
    const body = { fromUserId: a.id, toUserId: b.id, amount: 5 };
    const s = (x: any) => addSettlement(jsonReq('/api/settlements', 'POST', x));
    expect((await s(body)).status).toBe(401);
    loginAs(a.id);
    expect((await s({ ...body, amount: 0 })).status).toBe(400);
    expect((await s({ ...body, toUserId: a.id })).status).toBe(400);
    expect((await s({ ...body, toUserId: undefined })).status).toBe(400);
    expect((await s(body)).status).toBe(200);
  });
});

import { GET as getExpense, PATCH as patchExpense } from '@/app/api/expenses/[id]/route';
import { PUT as putSettlement, DELETE as delSettlement } from '@/app/api/settlements/[id]/route';

describe('expense detail GET / PATCH / DELETE edge cases', () => {
  it('GET returns 404 or expense detail; PATCH/DELETE handle 401 and 404', async () => {
    expect((await getExpense(jsonReq('/x', 'GET'), { params: { id: 'missing' } })).status).toBe(404);
    expect((await patchExpense(jsonReq('/x', 'PATCH', {}), { params: { id: 'missing' } })).status).toBe(401);
    expect((await delExpense(jsonReq('/x', 'DELETE'), { params: { id: 'missing' } })).status).toBe(401);

    const a = await makeUser();
    loginAs(a.id);
    expect((await patchExpense(jsonReq('/x', 'PATCH', expenseBody(null, a.id, [a.id])), { params: { id: 'missing' } })).status).toBe(404);
    expect((await delExpense(jsonReq('/x', 'DELETE'), { params: { id: 'missing' } })).status).toBe(404);

    const { expense } = await (await post(expenseBody(null, a.id, [a.id], 15))).json();
    const gRes = await getExpense(jsonReq('/x', 'GET'), { params: { id: expense.id } });
    expect(gRes.status).toBe(200);
    expect((await gRes.json()).expense.amount).toBe(15);
  });
});

describe('settlement PUT & DELETE', () => {
  it('updates and deletes a settlement with validation', async () => {
    const a = await makeUser();
    const b = await makeUser();
    loginAs(a.id);
    const { settlement } = await (
      await addSettlement(jsonReq('/api/settlements', 'POST', { fromUserId: a.id, toUserId: b.id, amount: 10 }))
    ).json();

    loginAs(null);
    expect((await putSettlement(jsonReq('/x', 'PUT', {}), { params: { id: settlement.id } })).status).toBe(401);
    expect((await delSettlement(jsonReq('/x', 'DELETE'), { params: { id: settlement.id } })).status).toBe(401);

    loginAs(a.id);
    expect(
      (await putSettlement(jsonReq('/x', 'PUT', { fromUserId: a.id, toUserId: b.id, amount: 10 }), { params: { id: 'nope' } })).status
    ).toBe(404);
    expect(
      (await putSettlement(jsonReq('/x', 'PUT', { fromUserId: a.id, toUserId: a.id, amount: 10 }), { params: { id: settlement.id } })).status
    ).toBe(400);
    expect(
      (await putSettlement(jsonReq('/x', 'PUT', { fromUserId: a.id, toUserId: b.id, amount: -5 }), { params: { id: settlement.id } })).status
    ).toBe(400);

    const upd = await putSettlement(
      jsonReq('/x', 'PUT', { fromUserId: a.id, toUserId: b.id, amount: 25, paymentMethod: 'PayPal' }),
      { params: { id: settlement.id } }
    );
    expect(upd.status).toBe(200);
    expect((await upd.json()).settlement.amount).toBe(25);

    expect((await delSettlement(jsonReq('/x', 'DELETE'), { params: { id: 'nope' } })).status).toBe(404);
    expect((await delSettlement(jsonReq('/x', 'DELETE'), { params: { id: settlement.id } })).status).toBe(200);
    expect(await prisma.settlement.findUnique({ where: { id: settlement.id } })).toBeNull();
  });
});
