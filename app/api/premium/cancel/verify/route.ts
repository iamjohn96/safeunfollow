import { NextRequest, NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import { isPremiumEmail, setCancelToken, checkOtpSendRateLimit } from '@/lib/redis';

const EMAIL_FROM = process.env.EMAIL_FROM ?? 'noreply@safeunfollow.com';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'
  );
}

async function sendCancelTokenEmail(email: string, token: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[cancel/verify] RESEND_API_KEY not set; cannot send token email');
    return false;
  }

  const html = `<div><p>Your cancellation code is: <strong>${token}</strong></p></div>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: email,
      subject: 'SafeUnfollow cancellation code',
      html,
    }),
  });

  return response.ok;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { email } = body;
  if (typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const normalised = email.toLowerCase().trim();
  const ip = getClientIp(request);

  const ipAllowed = await checkOtpSendRateLimit(`ip:${ip}`);
  const emailAllowed = await checkOtpSendRateLimit(`email:${normalised}`);
  if (!ipAllowed || !emailAllowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  const hasPremium = await isPremiumEmail(normalised);
  if (!hasPremium) {
    return NextResponse.json({ message: 'If eligible, a confirmation code has been sent.' });
  }

  const token = String(randomInt(100000, 1000000));
  await setCancelToken(normalised, token);

  const sent = await sendCancelTokenEmail(normalised, token);
  if (!sent) {
    return NextResponse.json(
      { error: 'Failed to send confirmation email. Please try again later.' },
      { status: 503 },
    );
  }

  return NextResponse.json({ message: 'If eligible, a confirmation code has been sent.' });
}
