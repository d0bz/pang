import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { COOKIE_NAME } from '@/lib/auth';

async function performVerification(token: string) {
  if (!token || !token.trim()) {
    return { success: false, error: 'Verification token is required' };
  }

  const cleanToken = token.trim();
  const user = await prisma.user.findFirst({
    where: {
      emailVerifyToken: cleanToken,
      emailVerifyExpires: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    return {
      success: false,
      error: 'This email verification link is invalid or has expired. Please request a new one.',
    };
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerifyToken: null,
      emailVerifyExpires: null,
    },
  });

  return { success: true, user: updatedUser };
}

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    const result = await performVerification(token);

    if (!result.success || !result.user) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const response = NextResponse.json({
      success: true,
      message: 'Email address verified successfully!',
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        avatarUrl: result.user.avatarUrl,
        emailVerified: true,
      },
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: result.user.id,
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (err: any) {
    console.error('Verify email POST error:', err);
    return NextResponse.json({ error: 'Failed to verify email' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.redirect(new URL('/?error=missing_verify_token', req.url));
    }

    const result = await performVerification(token);
    if (!result.success || !result.user) {
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent(result.error || 'Verification failed')}`, req.url)
      );
    }

    const response = NextResponse.redirect(new URL('/?verified=true', req.url));
    response.cookies.set({
      name: COOKIE_NAME,
      value: result.user.id,
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (err: any) {
    console.error('Verify email GET error:', err);
    return NextResponse.redirect(new URL('/?error=server_error', req.url));
  }
}
