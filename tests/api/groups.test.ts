import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { GET as getGroup, PATCH as patchGroup, DELETE as deleteGroup } from '@/app/api/groups/[id]/route';
import { POST as createGroup } from '@/app/api/groups/route';
import { POST as addExpense } from '@/app/api/expenses/route';
import { jsonReq, loginAs, makeUser, makeGroup, expenseBody, VALID_IBAN } from '../helpers';

const ctx = (id: string) => ({ params: { id } });
beforeEach(() => loginAs(null));

describe('group create', () => {
  it('creator becomes admin; group starts unlocked', async () => {
    const a = await makeUser();
    loginAs(a.id);
    const res = await createGroup(jsonReq('/api/groups', 'POST', { name: 'Trip', memberUserIds: [] }));
    expect(res.status).toBe(200);
    const { group } = await res.json();
    const m = await prisma.groupMember.findFirst({ where: { groupId: group.id, userId: a.id } });
    expect(m?.role).toBe('admin');
    expect((await prisma.group.findUnique({ where: { id: group.id } }))?.locked).toBe(false);
  });
  it('401 when unauthenticated', async () => {
    expect((await createGroup(jsonReq('/api/groups', 'POST', { name: 'x' }))).status).toBe(401);
  });
});

describe('group GET', () => {
  it('401 / 404 / 403 cases', async () => {
    expect((await getGroup(jsonReq('/x', 'GET'), ctx('nope'))).status).toBe(401);
    const a = await makeUser();
    const outsider = await makeUser();
    const g = await makeGroup(a.id);
    loginAs(outsider.id);
    expect((await getGroup(jsonReq('/x', 'GET'), ctx(g.id))).status).toBe(403);
    loginAs(a.id);
    expect((await getGroup(jsonReq('/x', 'GET'), ctx('nope'))).status).toBe(404);
  });
  it('exposes locked flag and member IBANs', async () => {
    const a = await makeUser();
    const b = await makeUser();
    await prisma.user.update({ where: { id: b.id }, data: { iban: VALID_IBAN } });
    const g = await makeGroup(a.id, [b.id], true);
    loginAs(a.id);
    const body = await (await getGroup(jsonReq('/x', 'GET'), ctx(g.id))).json();
    expect(body.group.locked).toBe(true);
    expect(body.members.find((m: any) => m.userId === b.id).iban).toBe(VALID_IBAN);
    expect(body.members.find((m: any) => m.userId === a.id).iban).toBeNull();
  });
  it('simplified debts reflect expenses (payer owed by others)', async () => {
    const a = await makeUser();
    const b = await makeUser();
    const g = await makeGroup(a.id, [b.id]);
    loginAs(a.id);
    await addExpense(jsonReq('/api/expenses', 'POST', expenseBody(g.id, a.id, [a.id, b.id], 20)));
    const body = await (await getGroup(jsonReq('/x', 'GET'), ctx(g.id))).json();
    expect(body.debts.simplified).toHaveLength(1);
    expect(body.debts.simplified[0]).toMatchObject({ fromUserId: b.id, toUserId: a.id, amount: 10 });
  });
});

describe('group lock (PATCH)', () => {
  it('401 unauthenticated', async () => {
    const a = await makeUser();
    const g = await makeGroup(a.id);
    expect((await patchGroup(jsonReq('/x', 'PATCH', { locked: true }), ctx(g.id))).status).toBe(401);
  });
  it('member can lock and unlock', async () => {
    const a = await makeUser();
    const b = await makeUser();
    const g = await makeGroup(a.id, [b.id]);
    loginAs(b.id);
    expect((await patchGroup(jsonReq('/x', 'PATCH', { locked: true }), ctx(g.id))).status).toBe(200);
    expect((await prisma.group.findUnique({ where: { id: g.id } }))?.locked).toBe(true);
    await patchGroup(jsonReq('/x', 'PATCH', { locked: false }), ctx(g.id));
    expect((await prisma.group.findUnique({ where: { id: g.id } }))?.locked).toBe(false);
  });
  it('non-member gets 403 and cannot change anything', async () => {
    const a = await makeUser();
    const outsider = await makeUser();
    const g = await makeGroup(a.id);
    loginAs(outsider.id);
    expect((await patchGroup(jsonReq('/x', 'PATCH', { locked: true, name: 'hack' }), ctx(g.id))).status).toBe(403);
    const after = await prisma.group.findUnique({ where: { id: g.id } });
    expect(after?.locked).toBe(false);
    expect(after?.name).toBe('G');
  });
  it('other PATCH fields leave lock untouched', async () => {
    const a = await makeUser();
    const g = await makeGroup(a.id, [], true);
    loginAs(a.id);
    await patchGroup(jsonReq('/x', 'PATCH', { name: 'Renamed' }), ctx(g.id));
    const after = await prisma.group.findUnique({ where: { id: g.id } });
    expect(after).toMatchObject({ name: 'Renamed', locked: true });
  });
});

describe('group DELETE', () => {
  it('non-member 403; member deletes with cascade', async () => {
    const a = await makeUser();
    const outsider = await makeUser();
    const g = await makeGroup(a.id);
    loginAs(a.id);
    await addExpense(jsonReq('/api/expenses', 'POST', expenseBody(g.id, a.id, [a.id], 5)));
    loginAs(outsider.id);
    expect((await deleteGroup(jsonReq('/x', 'DELETE'), ctx(g.id))).status).toBe(403);
    loginAs(a.id);
    expect((await deleteGroup(jsonReq('/x', 'DELETE'), ctx(g.id))).status).toBe(200);
    expect(await prisma.expense.count({ where: { groupId: g.id } })).toBe(0);
    expect(await prisma.group.findUnique({ where: { id: g.id } })).toBeNull();
  });
});

import { GET as listGroups } from '@/app/api/groups/route';
import { POST as addMember } from '@/app/api/groups/[id]/members/route';

describe('groups list & member invites', () => {
  it('GET /api/groups requires auth and lists groups with balances', async () => {
    expect((await listGroups(jsonReq('/api/groups', 'GET'))).status).toBe(401);
    const a = await makeUser();
    const b = await makeUser();
    const g = await makeGroup(a.id, [b.id]);
    loginAs(a.id);
    await addExpense(jsonReq('/api/expenses', 'POST', expenseBody(g.id, a.id, [a.id, b.id], 40)));
    const res = await listGroups(jsonReq('/api/groups', 'GET'));
    expect(res.status).toBe(200);
    const { groups } = await res.json();
    const found = groups.find((x: any) => x.id === g.id);
    expect(found).toMatchObject({ userBalance: 20, memberCount: 2 });
  });

  it('POST /api/groups validates name and auto-provisions invited emails', async () => {
    const a = await makeUser();
    loginAs(a.id);
    expect((await createGroup(jsonReq('/api/groups', 'POST', { name: '  ' }))).status).toBe(400);
    const inviteEmail = `invite-${Date.now()}@test.com`;
    const res = await createGroup(
      jsonReq('/api/groups', 'POST', { name: 'Holiday', memberEmails: [inviteEmail] })
    );
    expect(res.status).toBe(200);
    const invitedUser = await prisma.user.findUnique({ where: { email: inviteEmail } });
    expect(invitedUser).toBeTruthy();
  });

  it('POST /api/groups/[id]/members adds by userId or email and rejects duplicates', async () => {
    const a = await makeUser();
    const b = await makeUser();
    const g = await makeGroup(a.id);
    expect((await addMember(jsonReq('/x', 'POST', { userId: b.id }), ctx(g.id))).status).toBe(401);
    loginAs(a.id);
    expect((await addMember(jsonReq('/x', 'POST', {}), ctx(g.id))).status).toBe(400);

    // Add existing user by userId
    const r1 = await addMember(jsonReq('/x', 'POST', { userId: b.id }), ctx(g.id));
    expect(r1.status).toBe(200);

    // Duplicate rejected
    expect((await addMember(jsonReq('/x', 'POST', { userId: b.id }), ctx(g.id))).status).toBe(400);

    // Add brand-new user by email
    const newMail = `newmem-${Date.now()}@test.com`;
    const r2 = await addMember(jsonReq('/x', 'POST', { email: newMail }), ctx(g.id));
    expect(r2.status).toBe(200);
    expect((await r2.json()).member.user.email).toBe(newMail);
  });
});
