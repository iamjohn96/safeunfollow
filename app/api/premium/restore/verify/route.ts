import { randomInt } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { checkOtpSendRateLimit, isPremiumEmail, setRestoreToken } from '@/lib/redis';

const EMAIL_FROM = process.env.EMAIL_FROM ?? 'noreply@safeunfollow.com';
const GENERIC_MESSAGE = 'If eligible, a verification code has been sent.';

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? '127.0.0.1';
}

async function sendRestoreEmail(email: string, token: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: email,
      subject: 'SafeUnfollow Premium verification code',
      html: `<div><p>Your SafeUnfollow Premium verification code is: <strong>${token}</strong></p><p>This code expires in 15 minutes.</p></div>`,
    }),
  });
  return response.ok;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { email?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  if (typeof body.email !== 'string' || !body.email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const email = body.email.toLowerCase().trim();
  const ip = getClientIp(request);
  try {
    const [ipAllowed, emailAllowed] = await Promise.all([
      checkOtpSendRateLimit(`restore-ip:${ip}`),
      checkOtpSendRateLimit(`restore-email:${email}`),
    ]);
    if (!ipAllowed || !emailAllowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }
    if (!await isPremiumEmail(email)) return NextResponse.json({ message: GENERIC_MESSAGE });

    const token = String(randomInt(100000, 1000000));
    await setRestoreToken(email, token);
    if (!await sendRestoreEmail(email, token)) {
      return NextResponse.json({ error: 'Verification email is temporarily unavailable.' }, { status: 503 });
    }
    return NextResponse.json({ message: GENERIC_MESSAGE });
  } catch (error) {
    console.error('[premium/restore/verify] Dependency unavailable', error);
    return NextResponse.json({ error: 'Premium verification is temporarily unavailable.' }, { status: 503 });
  }
}
