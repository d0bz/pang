import { describe, it, expect, beforeEach } from 'vitest';
import { GET as getUsers } from '@/app/api/users/route';
import { GET as getDashboard } from '@/app/api/dashboard/route';
import { POST as addExpense } from '@/app/api/expenses/route';
import { jsonReq, loginAs, makeUser, makeGroup, expenseBody } from '../helpers';

beforeEach(() => loginAs(null));

describe('GET /api/users', () => {
  it('requires auth and supports search query', async () => {
    expect((await getUsers(jsonReq('/api/users', 'GET'))).status).toBe(401);
    const u = await makeUser('UniqueFinderName');
    loginAs(u.id);
    const all = await (await getUsers(jsonReq('/api/users', 'GET'))).json();
    expect(all.users.length).toBeGreaterThan(0);

    const filtered = await (await getUsers(jsonReq('/api/users?q=uniquefindername', 'GET'))).json();
    expect(filtered.users.some((x: any) => x.id === u.id)).toBe(true);
  });
});

describe('GET /api/dashboard', () => {
  it('requires auth and computes summary, friend balances, and recent expenses', async () => {
    expect((await getDashboard(jsonReq('/api/dashboard', 'GET'))).status).toBe(401);
    const a = await makeUser('DashA');
    const b = await makeUser('DashB');
    const g = await makeGroup(a.id, [b.id]);
    loginAs(a.id);
    await addExpense(jsonReq('/api/expenses', 'POST', expenseBody(g.id, a.id, [a.id, b.id], 50)));

    const res = await getDashboard(jsonReq('/api/dashboard', 'GET'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary).toMatchObject({ youAreOwed: 25, youOwe: 0, totalBalance: 25 });
    expect(body.friends.find((f: any) => f.id === b.id)?.balance).toBe(25);
    expect(body.recentExpenses.length).toBeGreaterThan(0);
  });
});
