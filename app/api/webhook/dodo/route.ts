import { NextRequest } from 'next/server';
import { handleDodoWebhook } from '@/lib/dodo-handler';
import {
  premiumEventCommand, APPLY_PREMIUM_EVENT,
  lifetimeGrantCommand, APPLY_LIFETIME_GRANT,
  lifetimeRevokeCommand, APPLY_LIFETIME_REVOKE, paymentEmailKey,
} from '@/lib/dodo-webhook';
import { redis } from '@/lib/redis';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://safeunfollow.com';
const EMAIL_FROM = process.env.EMAIL_FROM ?? 'noreply@safeunfollow.com';

function lifetimeWelcomeHtml(): string {
  const unlockUrl = `${APP_URL}/upload`;
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#18181b">
      <h2 style="color:#db2777">Your SafeUnfollow Lifetime Access is ready</h2>
      <p>Thank you for your one-time purchase. There is no subscription and nothing will renew.</p>
      <p>To unlock a browser, open SafeUnfollow, choose <strong>Premium ✦</strong>, and enter this purchase email under “Already purchased?”. We will email you a 6-digit code.</p>
      <ul style="padding-left:20px;line-height:1.8">
        <li>Full relationship lists and search</li>
        <li>CSV export</li>
        <li>Unlimited snapshots and change history</li>
      </ul>
      <p>
        <a href="${unlockUrl}"
           style="display:inline-block;background:#db2777;color:#fff;padding:10px 22px;
                  border-radius:9999px;text-decoration:none;font-weight:600;font-size:14px">
          Open SafeUnfollow
        </a>
      </p>
      <p style="font-size:12px;color:#71717a;margin-top:32px">
        SafeUnfollow &mdash; no Instagram login. Your export stays in your browser.
      </p>
    </div>
  `;
}

async function sendWelcomeEmail(email: string, eventId: string, plan: 'subscription' | 'lifetime'): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[webhook/dodo] Welcome email not configured');
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
    signal: AbortSignal.timeout(5000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Idempotency-Key': `welcome-${eventId}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: email,
      subject: plan === 'lifetime' ? 'Your SafeUnfollow Lifetime Access is ready' : 'SafeUnfollow Premium 구독이 시작되었습니다',
      html: plan === 'lifetime' ? lifetimeWelcomeHtml() : html,
    }),
  });

  if (!response.ok) {
    console.error('[webhook/dodo] Welcome email failed:', response.status);
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleDodoWebhook(request, {
    secret: process.env.DODO_WEBHOOK_SECRET,
    persist: async (event, id) => {
      if (event.kind === 'lifetime-grant') {
        const command = lifetimeGrantCommand(event, id);
        return redis.eval<string[], string>(APPLY_LIFETIME_GRANT, command.keys, command.args);
      }
      if (event.kind === 'lifetime-revoke') {
        const owner = await redis.get<string>(paymentEmailKey(event.paymentId));
        const command = lifetimeRevokeCommand(event, id, typeof owner === 'string' ? owner : null);
        return redis.eval<string[], string>(APPLY_LIFETIME_REVOKE, command.keys, command.args);
      }
      const command = premiumEventCommand(event, id);
      return redis.eval<string[], string>(APPLY_PREMIUM_EVENT, command.keys, command.args);
    },
    notify: sendWelcomeEmail,
  });
}
