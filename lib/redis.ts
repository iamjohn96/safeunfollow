import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// ---------------------------------------------------------------------------
// Premium email helpers
// ---------------------------------------------------------------------------

export async function setPremiumEmail(email: string, renewalTimestamp?: number): Promise<void> {
  const key = `premium:${email.toLowerCase().trim()}`;
  if (renewalTimestamp) {
    await redis.set(key, JSON.stringify({ status: 'true', renewal: renewalTimestamp }));
  } else {
    await redis.set(key, 'true');
  }
}

export async function isPremiumEmail(email: string): Promise<boolean> {
  const val = await redis.get<string | { status: string; renewal?: number }>(`premium:${email.toLowerCase().trim()}`);
  if (val === null) return false;
  if (typeof val === 'string') return val === 'true';
  return val.status === 'true';
}

export interface PremiumUser {
  email: string;
  renewal?: number;
}

export async function getAllPremiumUsers(): Promise<PremiumUser[]> {
  const users: PremiumUser[] = [];
  let cursor = 0;

  do {
    const [nextCursor, keys] = await redis.scan(cursor, { match: 'premium:*', count: 100 });
    cursor = nextCursor;

    if (keys.length > 0) {
      const values = await redis.mget<string | { status: string; renewal?: number }>(...keys as string[]);
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
  } while (cursor !== 0);

  return users;
}

export async function removePremiumEmail(email: string): Promise<void> {
  const key = email.toLowerCase().trim();
  await redis.del(`premium:${key}`);
}

// ---------------------------------------------------------------------------
// Subscription ID helpers (used for Dodo Payments cancellation)
// ---------------------------------------------------------------------------

export async function setSubscriptionId(email: string, subscriptionId: string): Promise<void> {
  await redis.set(`subscription_id:${email.toLowerCase().trim()}`, subscriptionId);
}

export async function getSubscriptionId(email: string): Promise<string | null> {
  const val = await redis.get(`subscription_id:${email.toLowerCase().trim()}`);
  return typeof val === 'string' ? val : null;
}

// ---------------------------------------------------------------------------
// Renewal date helpers (ISO 8601 date strings)
// ---------------------------------------------------------------------------

export async function setRenewalDate(email: string, renewalDate: string): Promise<void> {
  await redis.set(`renewal_date:${email.toLowerCase().trim()}`, renewalDate);
}

export async function getRenewalDate(email: string): Promise<string | null> {
  const val = await redis.get(`renewal_date:${email.toLowerCase().trim()}`);
  return typeof val === 'string' ? val : null;
}

/**
 * Scan all renewal_date:* keys and return emails whose subscription renews
 * within the next 7 days (and not already past).
 */
export async function getPremiumEmailsDueForReminder(): Promise<string[]> {
  const emails: string[] = [];
  let cursor: string = '0';

  const now = Date.now();
  const windowEnd = now + 7 * 24 * 60 * 60 * 1000;

  do {
    const result: [string, string[]] = await redis.scan(cursor, {
      match: 'renewal_date:*',
      count: 100,
    });
    cursor = result[0];
    const keys = result[1];

    for (const key of keys) {
      const renewalDateStr = (await redis.get(key)) as string | null;
      if (!renewalDateStr) continue;

      const renewalTs = new Date(renewalDateStr).getTime();
      if (Number.isNaN(renewalTs)) continue;

      if (renewalTs >= now && renewalTs <= windowEnd) {
        // Key format: renewal_date:{email}
        const email = key.slice('renewal_date:'.length);
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
  await redis.set(
    `cancel_token:${email.toLowerCase().trim()}`,
    token,
    { ex: CANCEL_TOKEN_TTL_SECONDS },
  );
}

export async function getCancelToken(email: string): Promise<string | null> {
  const val = await redis.get(`cancel_token:${email.toLowerCase().trim()}`);
  return typeof val === 'string' ? val : null;
}

export async function deleteCancelToken(email: string): Promise<void> {
  await redis.del(`cancel_token:${email.toLowerCase().trim()}`);
}

// ---------------------------------------------------------------------------
// Rate limiting (sliding fixed-window, 10 req / 60 s per IP)
// ---------------------------------------------------------------------------

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_SECONDS = 60;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number; // seconds until window resets
}

export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const key = `ratelimit:${ip}`;

  // Set key only if it doesn't exist (NX), with a 60-second TTL.
  // Then increment regardless — the NX set ensures the TTL is applied on
  // the first request; subsequent requests within the window just increment.
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
