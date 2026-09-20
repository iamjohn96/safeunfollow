import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, recordFeedback } from '@/lib/redis';
import { sanitizeFeedbackInput, buildFeedbackEntry } from '@/lib/feedback';

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? '127.0.0.1';
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  let input;
  try { input = sanitizeFeedbackInput(body); }
  catch { return NextResponse.json({ error: 'Invalid feedback' }, { status: 400 }); }

  const ip = getClientIp(request);
  try {
    const { allowed } = await checkRateLimit(`feedback:${ip}`);
    if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });

    await recordFeedback(buildFeedbackEntry(input));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[feedback] Dependency unavailable', error);
    return NextResponse.json({ error: 'Feedback is temporarily unavailable.' }, { status: 503 });
  }
}
