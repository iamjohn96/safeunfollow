import { NextRequest, NextResponse } from 'next/server';
import {
  isPremiumEmail,
  removePremiumEmail,
  getSubscriptionId,
  getCancelToken,
  deleteCancelToken,
  registerOtpFailure,
  clearOtpFailures,
  getOtpFailLimit,
} from '@/lib/redis';

const DODO_API_BASE = 'https://api.dodopayments.com';

async function cancelDodoSubscription(subscriptionId: string): Promise<boolean> {
  const apiKey = process.env.DODO_API_KEY;
  if (!apiKey) {
    console.warn('[cancel] DODO_API_KEY not set; skipping remote cancellation');
    return true;
  }

  const response = await fetch(`${DODO_API_BASE}/subscriptions/${subscriptionId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'cancelled' }),
  });

  if (response.ok || response.status === 404) return true;
  return false;
}

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

  try {
    const storedToken = await getCancelToken(normalised);
    if (!storedToken || storedToken !== token.trim()) {
      const attempts = await registerOtpFailure(normalised);
      if (attempts > getOtpFailLimit()) {
        return NextResponse.json({ error: 'Too many failed attempts. Try again later.' }, { status: 429 });
      }
      return NextResponse.json({ error: 'Invalid or expired confirmation code' }, { status: 401 });
    }

    const hasPremium = await isPremiumEmail(normalised);
    if (!hasPremium) {
      await deleteCancelToken(normalised);
      return NextResponse.json({ error: 'No active subscription found for this email' }, { status: 404 });
    }

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

    await Promise.all([
      deleteCancelToken(normalised),
      clearOtpFailures(normalised),
      removePremiumEmail(normalised),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Your subscription has been cancelled successfully.',
    });
  } catch (error) {
    console.error('[cancel] Cancellation dependency unavailable', error);
    return NextResponse.json(
      { error: 'Cancellation service is temporarily unavailable. Please try again later.' },
      { status: 503 },
    );
  }
}
