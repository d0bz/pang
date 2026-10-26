import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { POST as register } from '@/app/api/auth/register/route';
import { POST as login } from '@/app/api/auth/login/route';
import { PATCH as patchProfile } from '@/app/api/auth/profile/route';
import { GET as me } from '@/app/api/auth/me/route';
import { jsonReq, loginAs, makeUser, VALID_IBAN, VALID_IBAN_SPACED } from '../helpers';

const email = () => `reg${Date.now()}${Math.random().toString(36).slice(2)}@test.com`;

beforeEach(() => loginAs(null));

describe('register', () => {
  it('creates account and sets session cookie', async () => {
    const res = await register(jsonReq('/api/auth/register', 'POST', { name: 'Ann', email: email(), password: 'secret1' }));
    expect(res.status).toBe(200);
    expect(res.cookies.get('splitwise_session_user_id')?.value).toBeTruthy();
    const body = await res.json();
    expect(body.user.iban).toBeNull();
  });
  it('stores normalized IBAN', async () => {
    const e = email();
    const res = await register(jsonReq('/api/auth/register', 'POST', { name: 'Ann', email: e, password: 'secret1', iban: VALID_IBAN_SPACED }));
    expect(res.status).toBe(200);
    expect((await prisma.user.findUnique({ where: { email: e } }))?.iban).toBe(VALID_IBAN);
  });
  it('rejects invalid IBAN and creates no user', async () => {
    const e = email();
    const res = await register(jsonReq('/api/auth/register', 'POST', { name: 'Ann', email: e, password: 'secret1', iban: 'GB00BAD' }));
    expect(res.status).toBe(400);
    expect(await prisma.user.findUnique({ where: { email: e } })).toBeNull();
  });
  it('rejects missing fields, short password, duplicate email', async () => {
    expect((await register(jsonReq('/api/auth/register', 'POST', { name: 'A' }))).status).toBe(400);
    expect((await register(jsonReq('/api/auth/register', 'POST', { name: 'A', email: email(), password: '123' }))).status).toBe(400);
    const e = email();
    await register(jsonReq('/api/auth/register', 'POST', { name: 'A', email: e, password: 'secret1' }));
    expect((await register(jsonReq('/api/auth/register', 'POST', { name: 'A', email: e, password: 'secret1' }))).status).toBe(400);
  });
  it('requires name for new accounts', async () => {
    expect((await register(jsonReq('/api/auth/register', 'POST', { email: email(), password: 'secret1' }))).status).toBe(400);
  });
  it('activates an invited placeholder user, keeping id', async () => {
    const e = email();
    const placeholder = await prisma.user.create({
      data: { name: 'Inv', email: e, password: '$2a$10$temporaryDefaultPasswordPlaceholder' },
    });
    const res = await register(jsonReq('/api/auth/register', 'POST', { name: 'Inv', email: e, password: 'secret1', iban: VALID_IBAN }));
    expect(res.status).toBe(200);
    expect((await res.json()).user.id).toBe(placeholder.id);
  });
});

describe('login', () => {
  it('logs in with correct credentials, case-insensitive email', async () => {
    const e = email();
    await register(jsonReq('/api/auth/register', 'POST', { name: 'L', email: e, password: 'secret1' }));
    const res = await login(jsonReq('/api/auth/login', 'POST', { email: e.toUpperCase(), password: 'secret1' }));
    expect(res.status).toBe(200);
  });
  it('rejects wrong password / unknown email / missing fields', async () => {
    const e = email();
    await register(jsonReq('/api/auth/register', 'POST', { name: 'L', email: e, password: 'secret1' }));
    expect((await login(jsonReq('/api/auth/login', 'POST', { email: e, password: 'nope123' }))).status).toBe(401);
    expect((await login(jsonReq('/api/auth/login', 'POST', { email: 'no@x.com', password: 'secret1' }))).status).toBe(401);
    expect((await login(jsonReq('/api/auth/login', 'POST', { email: e }))).status).toBe(400);
  });
});

describe('profile PATCH', () => {
  it('401 when not logged in', async () => {
    expect((await patchProfile(jsonReq('/api/auth/profile', 'PATCH', { name: 'X' }))).status).toBe(401);
  });
  it('updates name and IBAN; /me reflects it', async () => {
    const u = await makeUser();
    loginAs(u.id);
    const res = await patchProfile(jsonReq('/api/auth/profile', 'PATCH', { name: '  New Name ', iban: VALID_IBAN_SPACED }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toMatchObject({ name: 'New Name', iban: VALID_IBAN });
    const meBody = await (await me({} as any)).json();
    expect(meBody.user.iban).toBe(VALID_IBAN);
  });
  it('clears IBAN with empty string', async () => {
    const u = await makeUser();
    loginAs(u.id);
    await patchProfile(jsonReq('/api/auth/profile', 'PATCH', { iban: VALID_IBAN }));
    const res = await patchProfile(jsonReq('/api/auth/profile', 'PATCH', { iban: '' }));
    expect((await res.json()).user.iban).toBeNull();
  });
  it('rejects invalid IBAN and empty name, leaving data unchanged', async () => {
    const u = await makeUser();
    loginAs(u.id);
    expect((await patchProfile(jsonReq('/api/auth/profile', 'PATCH', { iban: 'bad' }))).status).toBe(400);
    expect((await patchProfile(jsonReq('/api/auth/profile', 'PATCH', { name: '  ' }))).status).toBe(400);
    expect((await prisma.user.findUnique({ where: { id: u.id } }))?.name).toBe(u.name);
  });
  it('does not touch fields not supplied', async () => {
    const u = await makeUser();
    loginAs(u.id);
    await patchProfile(jsonReq('/api/auth/profile', 'PATCH', { iban: VALID_IBAN }));
    await patchProfile(jsonReq('/api/auth/profile', 'PATCH', { name: 'Only Name' }));
    expect((await prisma.user.findUnique({ where: { id: u.id } }))?.iban).toBe(VALID_IBAN);
  });
});

import { POST as forgotPassword } from '@/app/api/auth/forgot-password/route';
import { POST as resetPassword } from '@/app/api/auth/reset-password/route';
import { POST as verifyEmailPost, GET as verifyEmailGet } from '@/app/api/auth/verify-email/route';
import { POST as resendVerification } from '@/app/api/auth/resend-verification/route';
import { POST as logout } from '@/app/api/auth/logout/route';
import { POST as switchUser } from '@/app/api/auth/switch/route';
import { hashPassword, comparePassword } from '@/lib/auth';

describe('password hashing', () => {
  it('hashes and verifies password', async () => {
    const h = await hashPassword('mySecret');
    expect(await comparePassword('mySecret', h)).toBe(true);
    expect(await comparePassword('wrong', h)).toBe(false);
  });
});

describe('forgot & reset password', () => {
  it('forgot-password validates email and avoids enumeration on unknown email', async () => {
    expect((await forgotPassword(jsonReq('/api/auth/forgot-password', 'POST', { email: '' }))).status).toBe(400);
    expect((await forgotPassword(jsonReq('/api/auth/forgot-password', 'POST', { email: 'nobody@test.com' }))).status).toBe(200);
  });

  it('sets reset token and resets password, then allows login with new password', async () => {
    const u = await makeUser('Reset');
    const res = await forgotPassword(jsonReq('/api/auth/forgot-password', 'POST', { email: u.email }));
    expect(res.status).toBe(200);
    const withToken = await prisma.user.findUnique({ where: { id: u.id } });
    expect(withToken?.passwordResetToken).toBeTruthy();

    // Validation errors on reset
    expect((await resetPassword(jsonReq('/api/auth/reset-password', 'POST', { token: '', newPassword: 'secret1' }))).status).toBe(400);
    expect((await resetPassword(jsonReq('/api/auth/reset-password', 'POST', { token: withToken!.passwordResetToken, newPassword: '123' }))).status).toBe(400);
    expect((await resetPassword(jsonReq('/api/auth/reset-password', 'POST', { token: 'bad-token', newPassword: 'secret1' }))).status).toBe(400);

    // Valid reset
    const rOk = await resetPassword(
      jsonReq('/api/auth/reset-password', 'POST', { token: withToken!.passwordResetToken, newPassword: 'newPassword1' })
    );
    expect(rOk.status).toBe(200);
    const after = await prisma.user.findUnique({ where: { id: u.id } });
    expect(after?.passwordResetToken).toBeNull();
    expect(after?.emailVerified).toBe(true);

    // Can log in with new password
    expect((await login(jsonReq('/api/auth/login', 'POST', { email: u.email, password: 'newPassword1' }))).status).toBe(200);
  });

  it('rejects expired reset token', async () => {
    const u = await makeUser('Exp');
    await prisma.user.update({
      where: { id: u.id },
      data: { passwordResetToken: 'exp-tok', passwordResetExpires: new Date(Date.now() - 1000) },
    });
    expect((await resetPassword(jsonReq('/api/auth/reset-password', 'POST', { token: 'exp-tok', newPassword: 'secret1' }))).status).toBe(400);
  });
});

describe('email verification & resend', () => {
  it('resend-verification handles unauth, unverified, and already verified', async () => {
    expect((await resendVerification(jsonReq('/api/auth/resend-verification', 'POST', {}))).status).toBe(400);
    const u = await makeUser('Ver');
    const r1 = await resendVerification(jsonReq('/api/auth/resend-verification', 'POST', { email: u.email }));
    expect(r1.status).toBe(200);
    const updated = await prisma.user.findUnique({ where: { id: u.id } });
    expect(updated?.emailVerifyToken).toBeTruthy();

    // Verify via POST
    expect((await verifyEmailPost(jsonReq('/api/auth/verify-email', 'POST', { token: '' }))).status).toBe(400);
    expect((await verifyEmailPost(jsonReq('/api/auth/verify-email', 'POST', { token: 'invalid' }))).status).toBe(400);
    const vOk = await verifyEmailPost(jsonReq('/api/auth/verify-email', 'POST', { token: updated!.emailVerifyToken }));
    expect(vOk.status).toBe(200);
    expect((await prisma.user.findUnique({ where: { id: u.id } }))?.emailVerified).toBe(true);

    // Already verified resend
    loginAs(u.id);
    const r2 = await resendVerification(jsonReq('/api/auth/resend-verification', 'POST', {}));
    expect((await r2.json()).message).toMatch(/already verified/i);
  });

  it('verify-email GET redirects appropriately', async () => {
    const u = await makeUser('GetVer');
    await prisma.user.update({
      where: { id: u.id },
      data: { emailVerifyToken: 'get-tok', emailVerifyExpires: new Date(Date.now() + 60000) },
    });
    const rMissing = await verifyEmailGet(jsonReq('/api/auth/verify-email', 'GET'));
    expect(rMissing.headers.get('location')).toContain('error=missing_verify_token');
    const rBad = await verifyEmailGet(jsonReq('/api/auth/verify-email?token=bad', 'GET'));
    expect(rBad.headers.get('location')).toContain('error=');
    const rGood = await verifyEmailGet(jsonReq('/api/auth/verify-email?token=get-tok', 'GET'));
    expect(rGood.headers.get('location')).toContain('verified=true');
  });
});

describe('logout & switch', () => {
  it('logout clears cookie', async () => {
    const res = await logout();
    expect(res.status).toBe(200);
    expect(res.cookies.get('splitwise_session_user_id')?.value).toBe('');
  });

  it('switch validates userId and switches session', async () => {
    expect((await switchUser(jsonReq('/api/auth/switch', 'POST', {}))).status).toBe(400);
    expect((await switchUser(jsonReq('/api/auth/switch', 'POST', { userId: 'nope' }))).status).toBe(404);
    const u = await makeUser('Sw');
    const res = await switchUser(jsonReq('/api/auth/switch', 'POST', { userId: u.id }));
    expect(res.status).toBe(200);
    expect(res.cookies.get('splitwise_session_user_id')?.value).toBe(u.id);
  });
});
