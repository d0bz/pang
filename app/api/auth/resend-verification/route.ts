import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    let targetUser = await getCurrentUser();

    // If not logged in, allow passing email in body
    if (!targetUser) {
      const body = await req.json().catch(() => ({}));
      if (body.email) {
        targetUser = await prisma.user.findUnique({
          where: { email: body.email.toLowerCase().trim() },
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
      }
    }

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Please sign in or provide your email address to resend verification.' },
        { status: 400 }
      );
    }

    // Check if user is already verified
    const user = await prisma.user.findUnique({
      where: { id: targetUser.id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: 'Your email address is already verified!',
      });
    }

    // Generate new verification token valid for 24h
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifyToken: verifyToken,
        emailVerifyExpires: verifyExpires,
      },
    });

    // Send email asynchronously
    sendVerificationEmail({
      recipientEmail: user.email,
      recipientName: user.name,
      verifyToken,
    }).catch((err) => {
      console.error('[Resend Verification] Error sending email:', err);
    });

    return NextResponse.json({
      success: true,
      message: `A verification link has been sent to ${user.email}.`,
    });
  } catch (err: any) {
    console.error('Resend verification error:', err);
    return NextResponse.json({ error: 'Failed to resend verification email' }, { status: 500 });
  }
}
