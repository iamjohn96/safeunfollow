import { NextRequest, NextResponse } from 'next/server';
import { isPremiumEmail, checkRateLimit, getPremiumSessionEmail } from '@/lib/redis';
import { withRedisFallback } from '@/lib/redis-resilience';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(request);

  // Rate limit: max 10 requests per IP per 60-second window
  const rateLimit = await withRedisFallback(
    () => checkRateLimit(ip),
    null,
    'Premium check rate limiter unavailable',
  );
  if (!rateLimit) {
    return NextResponse.json({ isPremium: false });
  }

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.resetIn),
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + rateLimit.resetIn),
        },
      },
    );
  }

  let body: { email?: unknown; session?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ isPremium: false }, { status: 400 });
  }
  const { email, session } = body;

  if (typeof email !== 'string' || !email.includes('@') || typeof session !== 'string' || session.length < 32) {
    return NextResponse.json({ isPremium: false });
  }

  const normalised = email.toLowerCase().trim();
  const sessionEmail = await withRedisFallback(
    () => getPremiumSessionEmail(session),
    null,
    'Premium session lookup unavailable',
  );
  if (sessionEmail !== normalised) return NextResponse.json({ isPremium: false });

  const premium = await withRedisFallback(
    () => isPremiumEmail(normalised),
    false,
    'Premium status lookup unavailable',
  );

  return NextResponse.json(
    { isPremium: premium },
    {
      headers: {
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': String(rateLimit.remaining),
      },
    },
  );
}
