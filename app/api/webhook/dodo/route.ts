import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { setPremiumEmail, removePremiumEmail, setSubscriptionId, setRenewalDate } from '@/lib/redis';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://safeunfollow.com';
const EMAIL_FROM = process.env.EMAIL_FROM ?? 'noreply@safeunfollow.com';

async function sendWelcomeEmail(email: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[webhook/dodo] RESEND_API_KEY not set; skipping welcome email to ${email}`);
    return;
  }

  const cancelUrl = `${APP_URL}/cancel`;

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#18181b">
      <h2 style="color:#db2777">SafeUnfollow Premium 구독이 시작되었습니다 🎉</h2>
      <p>안녕하세요,</p>
      <p>
        <strong>SafeUnfollow Premium</strong> 구독을 시작해 주셔서 감사합니다.
        이제 아래 프리미엄 기능을 모두 사용하실 수 있습니다:
      </p>
      <ul style="padding-left:20px;line-height:1.8">
        <li>팔로워 스냅샷 무제한 저장</li>
        <li>언팔로우 히스토리 전체 열람</li>
        <li>CSV 내보내기</li>
        <li>우선 지원</li>
      </ul>
      <p>구독을 취소하려면 아래 링크를 이용하세요:</p>
      <p>
        <a href="${cancelUrl}"
           style="display:inline-block;background:#db2777;color:#fff;padding:10px 22px;
                  border-radius:9999px;text-decoration:none;font-weight:600;font-size:14px">
          구독 취소
        </a>
      </p>
      <p style="font-size:12px;color:#71717a;margin-top:32px">
        SafeUnfollow &mdash; 100% 프라이빗, Instagram 로그인 불필요.
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
      subject: 'SafeUnfollow Premium 구독이 시작되었습니다',
      html,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => '');
    console.error(`[webhook/dodo] Resend welcome email error for ${email}: ${response.status} ${err}`);
  }
}

// ---------------------------------------------------------------------------
// Signature verification
// ---------------------------------------------------------------------------

/**
 * Verify a Dodo Payments webhook signature.
 *
 * Dodo sends the HMAC-SHA256 of the raw request body, prefixed with "sha256=".
 * We perform a constant-time comparison to prevent timing attacks.
 */
function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!signature) return false;

  const hmac = createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
  const expected = `sha256=${hmac}`;

  // Normalise: compare with and without the sha256= prefix in case Dodo
  // ever changes the format. We always compare same-length buffers.
  const candidates = [expected, hmac];
  for (const candidate of candidates) {
    if (candidate.length !== signature.length) continue;
    const candidateBuf = Buffer.from(candidate, 'utf8');
    const sigBuf = Buffer.from(signature, 'utf8');
    if (timingSafeEqual(candidateBuf, sigBuf)) return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Payload extraction helpers
// ---------------------------------------------------------------------------

function extractEmail(body: Record<string, unknown>): string | null {
  const data = body.data as Record<string, unknown> | undefined;
  if (data) {
    const customer = data.customer as Record<string, unknown> | undefined;
    if (typeof customer?.email === 'string') return customer.email;
    if (typeof data.email === 'string') return data.email;
  }
  if (typeof body.customer_email === 'string') return body.customer_email;
  if (typeof body.email === 'string') return body.email;
  return null;
}

function extractSubscriptionId(body: Record<string, unknown>): string | null {
  const data = body.data as Record<string, unknown> | undefined;
  if (data) {
    if (typeof data.subscription_id === 'string') return data.subscription_id;
    if (typeof data.id === 'string') return data.id;
  }
  if (typeof body.subscription_id === 'string') return body.subscription_id;
  return null;
}

/**
 * Extract the next billing date from the webhook payload.
 * Returns an ISO 8601 string, or null if not present.
 */
function extractRenewalDate(body: Record<string, unknown>): string | null {
  const data = body.data as Record<string, unknown> | undefined;
  const candidates = [
    data?.next_billing_date,
    data?.current_period_end,
    data?.renewal_date,
    body.next_billing_date,
    body.renewal_date,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c) return c;
    if (typeof c === 'number') return new Date(c * 1000).toISOString();
  }
  return null;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.DODO_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[webhook/dodo] DODO_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature =
    request.headers.get('webhook-signature') ??
    request.headers.get('x-dodo-signature') ??
    '';

  // Signature verification — reject invalid requests early
  if (!verifySignature(rawBody, signature, secret)) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
    console.error(
      `[webhook/dodo] Invalid signature from ${ip}. ` +
      `Received: "${signature.slice(0, 20)}…"`,
    );
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventType =
    typeof body.type === 'string'
      ? body.type
      : typeof body.event_type === 'string'
        ? body.event_type
        : '';

  // Handle cancellation events — revoke premium access
  const isCancellation =
    eventType.includes('cancel') ||
    eventType.includes('revoke') ||
    eventType.includes('chargeback');

  if (isCancellation) {
    const email = extractEmail(body);
    if (email) {
      await removePremiumEmail(email);
      console.log(`[webhook/dodo] Removed premium for ${email} (event: ${eventType})`);
    }
    return NextResponse.json({ received: true });
  }

  // Only process successful payment / subscription events
  const isPayment =
    eventType.includes('payment') ||
    eventType.includes('subscription') ||
    eventType.includes('order');

  if (!isPayment) {
    return NextResponse.json({ received: true });
  }

  const email = extractEmail(body);
  if (!email) {
    return NextResponse.json({ error: 'No email in payload' }, { status: 422 });
  }

  try {
    await setPremiumEmail(email);
    await sendWelcomeEmail(email);

    // Persist subscription ID so we can cancel via the API later
    const subscriptionId = extractSubscriptionId(body);
    if (subscriptionId) {
      await setSubscriptionId(email, subscriptionId);
    }

    // Persist renewal date for reminder emails
    const renewalDate = extractRenewalDate(body);
    if (renewalDate) {
      await setRenewalDate(email, renewalDate);
    }

    console.log(
      `[webhook/dodo] Premium granted for ${email}` +
      (subscriptionId ? ` (sub: ${subscriptionId})` : '') +
      (renewalDate ? ` (renews: ${renewalDate})` : ''),
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[webhook/dodo] Failed to save premium status:', err);
    return NextResponse.json({ error: 'Failed to save premium status' }, { status: 500 });
  }
}
