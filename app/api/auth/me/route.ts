import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    let user = await getCurrentUser();

    // If no user is logged in, optionally default to the first user for convenience if requested or keep null
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        emailVerified: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      user,
      allUsers,
    });
  } catch (err: any) {
    console.error('Error fetching current user:', err);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}
