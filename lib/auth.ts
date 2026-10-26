import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

const COOKIE_NAME = 'splitwise_session_user_id';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function getCurrentUser() {
  try {
    const cookieStore = cookies();
    const userId = cookieStore.get(COOKIE_NAME)?.value;

    if (!userId) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        iban: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    return user;
  } catch (err) {
    console.error('Error fetching current user:', err);
    return null;
  }
}

export function getSessionUserIdFromCookies(): string | null {
  try {
    const cookieStore = cookies();
    return cookieStore.get(COOKIE_NAME)?.value ?? null;
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
