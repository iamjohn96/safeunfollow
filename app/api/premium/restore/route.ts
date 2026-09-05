import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  clearOtpFailures,
  deleteRestoreToken,
  getOtpFailLimit,
  getRestoreToken,
  isPremiumEmail,
  registerOtpFailure,
  setPremiumSession,
} from '@/lib/redis';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { email?: unknown; token?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  if (typeof body.email !== 'string' || !body.email.includes('@') || typeof body.token !== 'string') {
    return NextResponse.json({ error: 'Invalid verification request' }, { status: 400 });
  }

  const email = body.email.toLowerCase().trim();
  const token = body.token.trim();
  try {
    const stored = await getRestoreToken(email);
    if (!stored || stored !== token) {
      const attempts = await registerOtpFailure(`restore:${email}`);
      if (attempts > getOtpFailLimit()) {
        return NextResponse.json({ error: 'Too many failed attempts. Try again later.' }, { status: 429 });
      }
      return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 401 });
    }
    if (!await isPremiumEmail(email)) {
      await deleteRestoreToken(email);
      return NextResponse.json({ isPremium: false }, { status: 404 });
    }

    const session = randomBytes(32).toString('base64url');
    await Promise.all([
      setPremiumSession(session, email),
      deleteRestoreToken(email),
      clearOtpFailures(`restore:${email}`),
    ]);
    return NextResponse.json({ isPremium: true, session });
  } catch (error) {
    console.error('[premium/restore] Dependency unavailable', error);
    return NextResponse.json({ error: 'Premium verification is temporarily unavailable.' }, { status: 503 });
  }
}
