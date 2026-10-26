import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { hashPassword, COOKIE_NAME } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/email';
import { normalizeIban } from '@/lib/iban';

const TEMPORARY_PLACEHOLDER = '$2a$10$temporaryDefaultPasswordPlaceholder';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, avatarUrl, iban } = await req.json();

    const cleanIban = normalizeIban(iban);
    if (cleanIban === null) {
      return NextResponse.json({ error: 'Invalid IBAN' }, { status: 400 });
    }

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    const hashedPassword = await hashPassword(password);
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    let user;

    if (existing) {
      // If this was an invited placeholder user, allow them to complete activation
      if (existing.password === TEMPORARY_PLACEHOLDER) {
        user = await prisma.user.update({
          where: { id: existing.id },
          data: {
            name: name ? name.trim() : existing.name,
            password: hashedPassword,
            ...(cleanIban ? { iban: cleanIban } : {}),
            emailVerified: false,
            emailVerifyToken: verifyToken,
            emailVerifyExpires: verifyExpires,
            avatarUrl:
              avatarUrl ||
              existing.avatarUrl ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || existing.name)}`,
          },
        });
      } else {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please log in.' },
          { status: 400 }
        );
      }
    } else {
      if (!name) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
      }

      user = await prisma.user.create({
        data: {
          name: name.trim(),
          email: cleanEmail,
          password: hashedPassword,
          iban: cleanIban || null,
          emailVerified: false,
          emailVerifyToken: verifyToken,
          emailVerifyExpires: verifyExpires,
          avatarUrl:
            avatarUrl ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name.trim())}`,
        },
      });
    }

    // Send verification email asynchronously
    sendVerificationEmail({
      recipientEmail: cleanEmail,
      recipientName: user.name,
      verifyToken,
    }).catch((err) => {
      console.error('[Registration] Error sending verification email:', err);
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        iban: user.iban,
        emailVerified: false,
      },
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: user.id,
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (err: any) {
    console.error('Registration error:', err);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}
