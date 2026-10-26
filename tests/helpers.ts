import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export const VALID_IBAN = 'GB82WEST12345698765432';
export const VALID_IBAN_SPACED = 'gb82 west 1234 5698 7654 32';

export function loginAs(userId: string | null) {
  (globalThis as any).__session.userId = userId;
}

export function jsonReq(url: string, method: string, body?: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

let counter = 0;
export async function makeUser(name = 'User') {
  counter++;
  return prisma.user.create({
    data: { name: `${name}${counter}`, email: `u${counter}-${Math.random().toString(36).slice(2)}@test.com`, password: 'x' },
  });
}

export async function makeGroup(creatorId: string, memberIds: string[] = [], locked = false) {
  return prisma.group.create({
    data: {
      name: 'G',
      locked,
      members: {
        create: [
          { userId: creatorId, role: 'admin' },
          ...memberIds.map((id) => ({ userId: id })),
        ],
      },
    },
  });
}

export function expenseBody(groupId: string | null, payerId: string, userIds: string[], amount = 30) {
  return {
    groupId,
    payerId,
    description: 'Dinner',
    amount,
    splitType: 'EQUAL',
    participants: userIds.map((userId) => ({ userId, name: userId, included: true })),
  };
}
