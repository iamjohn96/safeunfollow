import { NextRequest, NextResponse } from 'next/server';
import { isPremiumEmail, checkRateLimit } from '@/lib/redis';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'
  );
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(request);

  // Rate limit: max 10 requests per IP per 60-second window
  const rateLimit = await checkRateLimit(ip);
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

  const email = request.nextUrl.searchParams.get('email');

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  try {
    const premium = await isPremiumEmail(email);
    return NextResponse.json(
      { isPremium: premium },
      {
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      },
    );
  } catch {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}
