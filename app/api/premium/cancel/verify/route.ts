import { NextRequest, NextResponse } from 'next/server';
import { isPremiumEmail, setCancelToken } from '@/lib/redis';
import crypto from 'crypto';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const email = (body as Record<string, unknown>)?.email;

  if (typeof email !== 'string' || !email.includes('@') || !email.includes('.')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const isPremium = await isPremiumEmail(normalizedEmail);
    if (!isPremium) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    const otp = String(crypto.randomInt(100000, 1000000));

    await setCancelToken(normalizedEmail, otp);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'SafeUnfollow <noreply@safeunfollow.com>',
        to: normalizedEmail,
        subject: 'SafeUnfollow 구독 취소 인증 코드',
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
            <h2 style="margin-bottom: 8px;">구독 취소 인증 코드</h2>
            <p style="color: #555; margin-bottom: 24px;">아래 코드를 입력하여 구독 취소를 확인하세요. 코드는 15분간 유효합니다.</p>
            <div style="background: #f4f4f4; border-radius: 8px; padding: 24px; text-align: center; letter-spacing: 8px; font-size: 32px; font-weight: bold;">
              ${otp}
            </div>
            <p style="color: #888; font-size: 13px; margin-top: 24px;">본인이 요청하지 않은 경우 이 이메일을 무시하세요.</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      console.error('[cancel/verify] Resend send failed:', await res.text());
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Check your email for a confirmation code.' });
  } catch (err) {
    console.error('[cancel/verify] Error:', err);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}
