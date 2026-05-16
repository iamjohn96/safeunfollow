import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { setPremiumEmail, removePremiumEmail, setSubscriptionId, setRenewalDate } from '@/lib/redis';

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
