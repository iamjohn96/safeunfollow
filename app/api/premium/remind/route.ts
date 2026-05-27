import { NextRequest, NextResponse } from 'next/server';
import { getPremiumEmailsDueForReminder, getRenewalDate, redis } from '@/lib/redis';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://safeunfollow.com';
const EMAIL_FROM = process.env.EMAIL_FROM ?? 'noreply@safeunfollow.com';

async function sendReminderEmail(email: string, renewalDate: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[remind] RESEND_API_KEY not set; skipping email to ${email}`);
    return false;
  }

  const formatted = new Date(renewalDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const cancelUrl = `${APP_URL}/cancel`;

  const html = `<div><p>Your SafeUnfollow Premium subscription renews on <strong>${formatted}</strong>.</p><p><a href="${cancelUrl}">Cancel</a></p></div>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: email,
      subject: 'Your SafeUnfollow Premium subscription renews in 7 days',
      html,
    }),
  });

  return response.ok;
}

function getReminderDedupeKey(email: string, renewalDate: string): string {
  return `reminder_sent:${email}:${renewalDate}`;
}

async function markReminderSent(email: string, renewalDate: string): Promise<void> {
  const renewalTs = new Date(renewalDate).getTime();
  const now = Date.now();
  const ttlSeconds = Math.max(24 * 60 * 60, Math.floor((renewalTs - now) / 1000));
  await redis.set(getReminderDedupeKey(email, renewalDate), '1', { ex: ttlSeconds });
}

async function reminderAlreadySent(email: string, renewalDate: string): Promise<boolean> {
  const val = await redis.get(getReminderDedupeKey(email, renewalDate));
  return val !== null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const auth = request.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const emails = await getPremiumEmailsDueForReminder();

    const results: Array<{ email: string; sent: boolean; renewalDate: string | null; skipped?: string }> = [];

    for (const email of emails) {
      const renewalDate = await getRenewalDate(email);
      if (!renewalDate) continue;

      if (await reminderAlreadySent(email, renewalDate)) {
        results.push({ email, sent: false, renewalDate, skipped: 'already_sent_for_cycle' });
        continue;
      }

      const sent = await sendReminderEmail(email, renewalDate);
      if (sent) {
        await markReminderSent(email, renewalDate);
      }
      results.push({ email, sent, renewalDate });
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to process reminders' }, { status: 500 });
  }
}
