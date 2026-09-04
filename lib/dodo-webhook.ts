import { Webhook } from 'standardwebhooks';

export function verifyDodoPayload(raw: string, headers: Headers, secret: string): unknown {
  const timestamp = headers.get('webhook-timestamp') ?? '';
  if (!/^\d+$/.test(timestamp)) throw new Error('Invalid timestamp');
  return new Webhook(secret).verify(raw, {
    'webhook-id': headers.get('webhook-id') ?? '',
    'webhook-timestamp': timestamp,
    'webhook-signature': headers.get('webhook-signature') ?? '',
  });
}

export interface PremiumEvent {
  action: 'grant' | 'revoke';
  email: string;
  subscriptionId: string;
  occurredAt: number;
  renewalDate: string | null;
  type: string;
}
const grants = new Set(['payment.succeeded', 'subscription.active', 'subscription.renewed']);
const revokes = new Set(['subscription.cancelled', 'subscription.expired', 'subscription.failed', 'subscription.on_hold']);
const record = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

export function premiumEvent(value: unknown): PremiumEvent | null {
  const body = record(value);
  if (!body || typeof body.type !== 'string') throw new Error('Invalid event');
  const type = body.type;
  if (!grants.has(type) && !revokes.has(type)) return null;
  const data = record(body.data);
  if (type === 'payment.succeeded' && (data?.is_update_payment_method === true || data?.refund_status === 'full')) return null;
  const customer = record(data?.customer);
  const email = typeof customer?.email === 'string' ? customer.email.trim().toLowerCase() : '';
  const subscriptionId = typeof data?.subscription_id === 'string' ? data.subscription_id.trim() : '';
  const occurredAt = typeof body.timestamp === 'string' ? Date.parse(body.timestamp) : NaN;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !subscriptionId || !Number.isFinite(occurredAt)) {
    // This product sells subscriptions. Never grant lifetime access from an unrelated payment.
    throw new Error('Missing subscription event fields');
  }
  const expectedStatus = type === 'payment.succeeded' ? 'succeeded'
    : type === 'subscription.renewed' ? 'active' : type.slice('subscription.'.length);
  if (data?.status !== expectedStatus) throw new Error('Event status mismatch');
  const renewal = data?.next_billing_date;
  const renewalDate = typeof renewal === 'string' && Number.isFinite(Date.parse(renewal))
    ? new Date(renewal).toISOString() : null;
  return { action: grants.has(type) ? 'grant' : 'revoke', email, subscriptionId, occurredAt, renewalDate, type };
}

// One atomic operation: no success marker before entitlement persistence.
// Retain the latest event timestamp after revocation to reject delayed older grants.
export const APPLY_PREMIUM_EVENT = `
if redis.call('EXISTS', KEYS[1]) == 1 then return 'duplicate' end
local previous = tonumber(redis.call('GET', KEYS[2]) or '0')
local incoming = tonumber(ARGV[1])
local currentSubscription = redis.call('GET', KEYS[4])
if incoming < previous or (incoming == previous and ARGV[2] == 'grant' and redis.call('EXISTS', KEYS[3]) == 0) then
  redis.call('SET', KEYS[1], '1', 'EX', 2592000)
  return 'stale'
end
if ARGV[2] == 'revoke' and currentSubscription and currentSubscription ~= ARGV[3] then
  redis.call('SET', KEYS[1], '1', 'EX', 2592000)
  return 'other-subscription'
end
if ARGV[2] == 'grant' then
  redis.call('SET', KEYS[3], 'true')
  redis.call('SET', KEYS[4], ARGV[3])
  if ARGV[4] ~= '' then redis.call('SET', KEYS[5], ARGV[4]) end
else
  redis.call('DEL', KEYS[3], KEYS[5])
  redis.call('SET', KEYS[4], ARGV[3])
end
redis.call('SET', KEYS[2], ARGV[1])
redis.call('SET', KEYS[1], '1', 'EX', 2592000)
return 'applied'
`;

export function premiumEventCommand(event: PremiumEvent, id: string) {
  return {
    keys: ['dodo:event:' + id, 'dodo:latest:' + event.email, 'premium:' + event.email,
      'subscription_id:' + event.email, 'renewal_date:' + event.email],
    args: [String(event.occurredAt), event.action, event.subscriptionId, event.renewalDate ?? ''],
  };
}
