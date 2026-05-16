import { NextRequest, NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import { isPremiumEmail, setCancelToken } from '@/lib/redis';

const EMAIL_FROM = process.env.EMAIL_FROM ?? 'noreply@safeunfollow.com';

async function sendCancelTokenEmail(email: string, token: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[cancel/verify] RESEND_API_KEY not set; cannot send token email');
    return false;
  }

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#18181b">
      <h2 style="color:#db2777">구독 취소 확인 코드</h2>
      <p><strong>SafeUnfollow Premium</strong> 구독 취소 요청이 접수되었습니다.</p>
      <p>아래 코드를 입력하여 취소를 확인해 주세요:</p>
      <div style="text-align:center;margin:24px 0">
        <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#18181b">
          ${token}
        </span>
      </div>
      <p style="font-size:13px;color:#71717a">
        이 코드는 15분간 유효합니다. 본인이 요청하지 않은 경우 이 이메일을 무시하세요 — 구독이 취소되지 않습니다.
      </p>
      <p style="font-size:12px;color:#71717a;margin-top:32px">
        SafeUnfollow &mdash; 100% 비공개, 인스타그램 로그인 불필요.
      </p>
    </div>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: email,
      subject: 'SafeUnfollow 구독 취소 인증 코드',
      html,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => '');
    console.error(
      `[cancel/verify] Resend error for ${email}: ${response.status} ${err}`,
    );
    return false;
  }

  return true;
}

/**
 * POST /api/premium/cancel/verify
 *
 * Step 1 of the 2-step cancellation flow.
 * Accepts { email }, checks premium status, generates a 6-digit OTP,
 * stores it in Redis with a 15-minute TTL, and emails it to the user.
 */
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

  const hasPremium = await isPremiumEmail(normalised);
  if (!hasPremium) {
    return NextResponse.json(
      { error: 'No active subscription found for this email' },
      { status: 404 },
    );
  }

  // Cryptographically secure 6-digit token (100000–999999)
  const token = String(randomInt(100000, 1000000));

  await setCancelToken(normalised, token);

  const sent = await sendCancelTokenEmail(normalised, token);
  if (!sent) {
    return NextResponse.json(
      { error: 'Failed to send confirmation email. Please try again later.' },
      { status: 503 },
    );
  }

  console.log(`[cancel/verify] Confirmation code sent to ${normalised}`);

  return NextResponse.json({
    message: 'Check your email for a confirmation code.',
  });
}
