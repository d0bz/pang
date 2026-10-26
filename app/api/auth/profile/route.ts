import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { normalizeIban } from '@/lib/iban';

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { name, iban } = await req.json();
    const data: { name?: string; iban?: string | null } = {};

    if (name !== undefined) {
      if (!String(name).trim()) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
      }
      data.name = String(name).trim();
    }
    if (iban !== undefined) {
      const clean = normalizeIban(iban);
      if (clean === null) {
        return NextResponse.json({ error: 'Invalid IBAN' }, { status: 400 });
      }
      data.iban = clean || null;
    }

    await prisma.user.update({ where: { id: user.id }, data });
    const updated = await getCurrentUser();
    return NextResponse.json({ success: true, user: updated });
  } catch (err) {
    console.error('Error updating profile:', err);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
