import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function setPremiumEmail(email: string, renewalTimestamp?: number): Promise<void> {
  const key = `premium:${email.toLowerCase().trim()}`;
  if (renewalTimestamp) {
    await redis.set(key, JSON.stringify({ status: 'true', renewal: renewalTimestamp }));
  } else {
    await redis.set(key, 'true');
  }
}

export async function removePremiumEmail(email: string): Promise<void> {
  await redis.del(`premium:${email.toLowerCase().trim()}`);
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

export async function setCancelToken(email: string, otp: string): Promise<void> {
  const key = `cancel_token:${email.toLowerCase().trim()}`;
  await redis.set(key, otp, { ex: 900 });
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
