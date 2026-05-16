import { NextRequest, NextResponse } from 'next/server';
import {
  isPremiumEmail,
  removePremiumEmail,
  getSubscriptionId,
  getCancelToken,
  deleteCancelToken,
} from '@/lib/redis';

const DODO_API_BASE = 'https://api.dodopayments.com';

/**
 * Cancel a subscription with Dodo Payments.
 * Returns true on success (or if no API key / subscription ID is configured),
 * false if the Dodo API returned an unexpected error.
 */
async function cancelDodoSubscription(subscriptionId: string): Promise<boolean> {
  const apiKey = process.env.DODO_API_KEY;
  if (!apiKey) {
    console.warn('[cancel] DODO_API_KEY not set; skipping remote cancellation');
    return true;
  }

  const response = await fetch(
    `${DODO_API_BASE}/subscriptions/${subscriptionId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'cancelled' }),
    },
  );

  // 200 = cancelled; 404 = already gone — both acceptable
  if (response.ok || response.status === 404) return true;

  const text = await response.text().catch(() => '');
  console.error(
    `[cancel] Dodo API error ${response.status} for sub ${subscriptionId}: ${text}`,
  );
  return false;
}

/**
 * DELETE /api/premium/cancel
 *
 * Step 2 of the 2-step cancellation flow.
 * Accepts { email, token }, verifies the OTP against Redis, then cancels
 * the subscription with Dodo Payments and removes premium access.
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  let body: { email?: unknown; token?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { email, token } = body;

  if (typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }
  if (typeof token !== 'string' || token.trim() === '') {
    return NextResponse.json({ error: 'Confirmation code is required' }, { status: 400 });
  }

  const normalised = email.toLowerCase().trim();

  // Verify OTP — reject if missing or expired
  const storedToken = await getCancelToken(normalised);
  if (!storedToken || storedToken !== token.trim()) {
    return NextResponse.json(
      { error: 'Invalid or expired confirmation code' },
      { status: 401 },
    );
  }

  // Token is valid — consume it immediately to prevent reuse
  await deleteCancelToken(normalised);

  // Guard: confirm the email still has premium before touching Dodo
  const hasPremium = await isPremiumEmail(normalised);
  if (!hasPremium) {
    return NextResponse.json(
      { error: 'No active subscription found for this email' },
      { status: 404 },
    );
  }

  // Cancel with Dodo Payments if we have a subscription ID on record
  const subscriptionId = await getSubscriptionId(normalised);
  if (subscriptionId) {
    const cancelled = await cancelDodoSubscription(subscriptionId);
    if (!cancelled) {
      return NextResponse.json(
        { error: 'Failed to cancel with payment provider; please try again' },
        { status: 502 },
      );
    }
  }

  // Remove premium access from Redis
  await removePremiumEmail(normalised);

  console.log(`[cancel] Premium removed for ${normalised}`);

  return NextResponse.json({
    success: true,
    message: 'Your subscription has been cancelled successfully.',
  });
}
