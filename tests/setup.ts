import { vi } from 'vitest';

// Always use the throwaway DB, never prisma/dev.db
process.env.DATABASE_URL = 'file:/tmp/pang-test.db';

export const session: { userId: string | null } = ((globalThis as any).__session ??= { userId: null });

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) =>
      (globalThis as any).__session.userId && name === 'splitwise_session_user_id'
        ? { value: (globalThis as any).__session.userId }
        : undefined,
  }),
}));

vi.mock('@/lib/email', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'test' }),
  sendGroupInvitationEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'test' }),
  sendPasswordResetEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'test' }),
}));
