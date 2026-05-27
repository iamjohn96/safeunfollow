import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const premiumKey = (email: string): string => `premium:${email.toLowerCase().trim()}`;
const subscriptionKey = (email: string): string => `subscription_id:${email.toLowerCase().trim()}`;
const renewalKey = (email: string): string => `renewal_date:${email.toLowerCase().trim()}`;
const cancelTokenKey = (email: string): string => `cancel_token:${email.toLowerCase().trim()}`;

// ---------------------------------------------------------------------------
// Premium email helpers
// ---------------------------------------------------------------------------

export async function setPremiumEmail(email: string, renewalTimestamp?: number): Promise<void> {
  const key = premiumKey(email);
  if (renewalTimestamp) {
    await redis.set(key, JSON.stringify({ status: 'true', renewal: renewalTimestamp }));
  } else {
    await redis.set(key, 'true');
  }
}

export async function isPremiumEmail(email: string): Promise<boolean> {
  const val = await redis.get<boolean | string | { status: string; renewal?: number }>(premiumKey(email));
  if (val === null || val === undefined) return false;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') return val === 'true' || val === '1';
  if (typeof val === 'object' && val !== null) return (val as { status: string }).status === 'true';
  return false;
}

export interface PremiumUser {
  email: string;
  renewal?: number;
}

export async function getAllPremiumUsers(): Promise<PremiumUser[]> {
  const users: PremiumUser[] = [];
  let cursor: string = '0';

  do {
    const [nextCursor, keys] = await redis.scan(cursor, { match: 'premium:*', count: 100 });
    cursor = nextCursor;

    if (keys.length > 0) {
      const values = await redis.mget<Array<string | { status: string; renewal?: number }>>(...keys);
      keys.forEach((key, i) => {
        const val = values[i];
        const email = key.replace('premium:', '');
        if (val !== null) {
          if (typeof val === 'string' && val === 'true') {
            users.push({ email });
          } else if (typeof val === 'object' && val.status === 'true') {
            users.push({ email, renewal: val.renewal });
          }
        }
      });
    }
  } while (cursor !== '0');

  return users;
}

export async function removePremiumEmail(email: string): Promise<void> {
  const normalised = email.toLowerCase().trim();
  await redis.del(premiumKey(normalised));
  await redis.del(subscriptionKey(normalised));
  await redis.del(renewalKey(normalised));
}

// ---------------------------------------------------------------------------
// Subscription ID helpers (used for Dodo Payments cancellation)
// ---------------------------------------------------------------------------

export async function setSubscriptionId(email: string, subscriptionId: string): Promise<void> {
  await redis.set(subscriptionKey(email), subscriptionId);
}

export async function getSubscriptionId(email: string): Promise<string | null> {
  const val = await redis.get(subscriptionKey(email));
  return typeof val === 'string' ? val : null;
}

// ---------------------------------------------------------------------------
// Renewal date helpers (ISO 8601 date strings)
// ---------------------------------------------------------------------------

export async function setRenewalDate(email: string, renewalDate: string): Promise<void> {
  await redis.set(renewalKey(email), renewalDate);
}

export async function getRenewalDate(email: string): Promise<string | null> {
  const val = await redis.get(renewalKey(email));
  return typeof val === 'string' ? val : null;
}

export async function getPremiumEmailsDueForReminder(): Promise<string[]> {
  const emails: string[] = [];
  let cursor: string = '0';

  const now = Date.now();
  const windowEnd = now + 7 * 24 * 60 * 60 * 1000;

  do {
    const [nextCursor, keys]: [string, string[]] = await redis.scan(cursor, {
      match: 'renewal_date:*',
      count: 100,
    });
    cursor = nextCursor;

    if (keys.length === 0) continue;

    const values = await redis.mget<Array<string | null>>(...keys);

    for (let i = 0; i < keys.length; i += 1) {
      const renewalDateStr = values[i];
      if (!renewalDateStr) continue;

      const renewalTs = new Date(renewalDateStr).getTime();
      if (Number.isNaN(renewalTs)) continue;

      if (renewalTs >= now && renewalTs <= windowEnd) {
        const email = keys[i].slice('renewal_date:'.length);
        emails.push(email);
      }
    }
  } while (cursor !== '0');

  return emails;
}

// ---------------------------------------------------------------------------
// Cancellation token helpers (one-time 6-digit OTP, 15-minute TTL)
// ---------------------------------------------------------------------------

const CANCEL_TOKEN_TTL_SECONDS = 15 * 60;

export async function setCancelToken(email: string, token: string): Promise<void> {
  await redis.set(cancelTokenKey(email), token, { ex: CANCEL_TOKEN_TTL_SECONDS });
}

export async function getCancelToken(email: string): Promise<string | null> {
  const val = await redis.get(cancelTokenKey(email));
  if (val === null || val === undefined) return null;
  return String(val);
}

export async function deleteCancelToken(email: string): Promise<void> {
  await redis.del(cancelTokenKey(email));
}

const OTP_FAIL_LIMIT = 5;
const OTP_FAIL_WINDOW_SECONDS = 15 * 60;
const OTP_SEND_WINDOW_SECONDS = 60;
const OTP_SEND_MAX_PER_WINDOW = 5;

export async function registerOtpFailure(email: string): Promise<number> {
  const key = `otp_fail:${email.toLowerCase().trim()}`;
  const attempts = await redis.incr(key);
  if (attempts === 1) {
    await redis.expire(key, OTP_FAIL_WINDOW_SECONDS);
  }
  return attempts;
}

export async function clearOtpFailures(email: string): Promise<void> {
  await redis.del(`otp_fail:${email.toLowerCase().trim()}`);
}

export function getOtpFailLimit(): number {
  return OTP_FAIL_LIMIT;
}

export async function checkOtpSendRateLimit(identifier: string): Promise<boolean> {
  const key = `otp_send:${identifier}`;
  await redis.set(key, 0, { nx: true, ex: OTP_SEND_WINDOW_SECONDS });
  const count = await redis.incr(key);
  return count <= OTP_SEND_MAX_PER_WINDOW;
}

// ---------------------------------------------------------------------------
// Rate limiting (sliding fixed-window, 10 req / 60 s per IP)
// ---------------------------------------------------------------------------

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_SECONDS = 60;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const key = `ratelimit:${ip}`;
  await redis.set(key, 0, { nx: true, ex: RATE_LIMIT_WINDOW_SECONDS });
  const count = await redis.incr(key);
  const ttl = await redis.ttl(key);

  const resetIn = ttl > 0 ? ttl : RATE_LIMIT_WINDOW_SECONDS;

  return {
    allowed: count <= RATE_LIMIT_MAX,
    remaining: Math.max(0, RATE_LIMIT_MAX - count),
    resetIn,
  };
}
