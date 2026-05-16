import { NextRequest, NextResponse } from 'next/server';
import { getPremiumEmailsDueForReminder, getRenewalDate } from '@/lib/redis';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://safeunfollow.com';
const EMAIL_FROM = process.env.EMAIL_FROM ?? 'noreply@safeunfollow.com';

/**
 * Send a renewal reminder email via the Resend API.
 * Set RESEND_API_KEY in your environment to enable sending.
 */
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

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#18181b">
      <h2 style="color:#db2777">Subscription renewing soon</h2>
      <p>Hi there,</p>
      <p>
        Your <strong>SafeUnfollow Premium</strong> subscription will automatically
        renew on <strong>${formatted}</strong>.
      </p>
      <p>No action is needed if you want to continue. If you'd like to cancel
        before your renewal date, use the link below:</p>
      <p>
        <a href="${cancelUrl}"
           style="display:inline-block;background:#db2777;color:#fff;padding:10px 22px;
                  border-radius:9999px;text-decoration:none;font-weight:600;font-size:14px">
          Cancel my subscription
        </a>
      </p>
      <p style="font-size:12px;color:#71717a;margin-top:32px">
        SafeUnfollow &mdash; 100% private, no Instagram login required.
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
      subject: 'Your SafeUnfollow Premium subscription renews in 7 days',
      html,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => '');
    console.error(`[remind] Resend error for ${email}: ${response.status} ${err}`);
    return false;
  }

  return true;
}

/**
 * GET /api/premium/remind
 *
 * Scans Redis for premium users whose subscription renews within 7 days and
 * sends them a reminder email. Designed to be called by a daily cron job.
 *
 * Protect with the CRON_SECRET environment variable:
 *   Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // CRON_SECRET must be configured — fail closed rather than allowing open access
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[remind] CRON_SECRET is not configured');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const auth = request.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const emails = await getPremiumEmailsDueForReminder();

    const results: Array<{ email: string; sent: boolean; renewalDate: string | null }> = [];

    for (const email of emails) {
      const renewalDate = await getRenewalDate(email);
      if (!renewalDate) continue;

      const sent = await sendReminderEmail(email, renewalDate);
      results.push({ email, sent, renewalDate });
    }

    console.log(`[remind] Processed ${results.length} reminder(s)`);

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (err) {
    console.error('[remind] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to process reminders' }, { status: 500 });
  }
}
