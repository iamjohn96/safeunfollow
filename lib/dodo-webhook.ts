import { Webhook } from 'standardwebhooks';
import { LIFETIME_PRODUCT_ID } from '../utils/premium-offer';

export function verifyDodoPayload(raw: string, headers: Headers, secret: string): unknown {
  const timestamp = headers.get('webhook-timestamp') ?? '';
  if (!/^\d+$/.test(timestamp)) throw new Error('Invalid timestamp');
  return new Webhook(secret).verify(raw, {
    'webhook-id': headers.get('webhook-id') ?? '',
    'webhook-timestamp': timestamp,
    'webhook-signature': headers.get('webhook-signature') ?? '',
  });
}

export interface SubscriptionPremiumEvent {
  kind: 'subscription';
  action: 'grant' | 'revoke';
  email: string;
  subscriptionId: string;
  occurredAt: number;
  renewalDate: string | null;
  type: string;
}

export interface LifetimeGrantEvent {
  kind: 'lifetime-grant';
  action: 'grant';
  email: string;
  paymentId: string;
  occurredAt: number;
  type: 'payment.succeeded';
}

export interface LifetimeRevokeEvent {
  kind: 'lifetime-revoke';
  action: 'revoke';
  paymentId: string;
  occurredAt: number;
  type: 'refund.succeeded' | 'dispute.lost' | 'dispute.accepted';
}

export type PremiumEvent = SubscriptionPremiumEvent | LifetimeGrantEvent | LifetimeRevokeEvent;

const grants = new Set(['payment.succeeded', 'subscription.active', 'subscription.renewed']);
const revokes = new Set(['subscription.cancelled', 'subscription.expired', 'subscription.failed', 'subscription.on_hold']);
const lifetimeRevokes: Record<string, { field: 'status' | 'dispute_status'; value: string }> = {
  'refund.succeeded': { field: 'status', value: 'succeeded' },
  'dispute.lost': { field: 'dispute_status', value: 'dispute_lost' },
  'dispute.accepted': { field: 'dispute_status', value: 'dispute_accepted' },
};
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAYMENT_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

const record = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

function includesProduct(cart: unknown, productId: string): boolean {
  return Array.isArray(cart) && cart.some(item => record(item)?.product_id === productId);
}

export function premiumEvent(value: unknown, lifetimeProductId = LIFETIME_PRODUCT_ID): PremiumEvent | null {
  const body = record(value);
  if (!body || typeof body.type !== 'string') throw new Error('Invalid event');
  const type = body.type;
  const lifetimeRevoke = lifetimeRevokes[type];
  if (!grants.has(type) && !revokes.has(type) && !lifetimeRevoke) return null;
  const data = record(body.data);
  const occurredAt = typeof body.timestamp === 'string' ? Date.parse(body.timestamp) : NaN;

  if (lifetimeRevoke) {
    if (!data || !Number.isFinite(occurredAt)) throw new Error('Invalid revocation event');
    // Partial refunds keep access; only a full refund or a lost/accepted dispute revokes.
    if (type === 'refund.succeeded' && data.is_partial !== false) return null;
    if (data[lifetimeRevoke.field] !== lifetimeRevoke.value) throw new Error('Event status mismatch');
    const paymentId = typeof data.payment_id === 'string' ? data.payment_id.trim() : '';
    if (!PAYMENT_ID_PATTERN.test(paymentId)) throw new Error('Missing payment reference');
    return { kind: 'lifetime-revoke', action: 'revoke', paymentId, occurredAt, type: type as LifetimeRevokeEvent['type'] };
  }

  if (type === 'payment.succeeded' && (data?.is_update_payment_method === true || data?.refund_status === 'full')) return null;
  const customer = record(data?.customer);
  const email = typeof customer?.email === 'string' ? customer.email.trim().toLowerCase() : '';
  const subscriptionId = typeof data?.subscription_id === 'string' ? data.subscription_id.trim() : '';

  if (type === 'payment.succeeded' && !subscriptionId) {
    // Only the configured one-time Lifetime product grants access without a subscription.
    // Never grant access from an unrelated one-time payment.
    const paymentId = typeof data?.payment_id === 'string' ? data.payment_id.trim() : '';
    if (!EMAIL_PATTERN.test(email) || !Number.isFinite(occurredAt) || !PAYMENT_ID_PATTERN.test(paymentId)
      || !lifetimeProductId || !includesProduct(data?.product_cart, lifetimeProductId)) {
      throw new Error('Missing subscription or lifetime product fields');
    }
    if (data?.status !== 'succeeded') throw new Error('Event status mismatch');
    return { kind: 'lifetime-grant', action: 'grant', email, paymentId, occurredAt, type: 'payment.succeeded' };
  }

  if (!EMAIL_PATTERN.test(email) || !subscriptionId || !Number.isFinite(occurredAt)) {
    throw new Error('Missing subscription event fields');
  }
  const expectedStatus = type === 'payment.succeeded' ? 'succeeded'
    : type === 'subscription.renewed' ? 'active' : type.slice('subscription.'.length);
  if (data?.status !== expectedStatus) throw new Error('Event status mismatch');
  const renewal = data?.next_billing_date;
  const renewalDate = typeof renewal === 'string' && Number.isFinite(Date.parse(renewal))
    ? new Date(renewal).toISOString() : null;
  return { kind: 'subscription', action: grants.has(type) ? 'grant' : 'revoke', email, subscriptionId, occurredAt, renewalDate, type };
}

// One atomic operation: no success marker before entitlement persistence.
// Retain the latest event timestamp after revocation to reject delayed older grants.
// A subscription revocation never removes Lifetime access (KEYS[6] = plan marker).
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
  redis.call('SET', KEYS[4], ARGV[3])
  redis.call('DEL', KEYS[5])
  redis.call('SET', KEYS[2], ARGV[1])
  redis.call('SET', KEYS[1], '1', 'EX', 2592000)
  if redis.call('GET', KEYS[6]) == 'lifetime' then return 'lifetime-retained' end
  redis.call('DEL', KEYS[3])
  return 'applied'
end
redis.call('SET', KEYS[2], ARGV[1])
redis.call('SET', KEYS[1], '1', 'EX', 2592000)
return 'applied'
`;

// Lifetime grant. A payment that was already refunded or lost in dispute never grants.
export const APPLY_LIFETIME_GRANT = `
if redis.call('EXISTS', KEYS[1]) == 1 then return 'duplicate' end
if redis.call('EXISTS', KEYS[6]) == 1 then
  redis.call('SET', KEYS[1], '1', 'EX', 2592000)
  return 'revoked-payment'
end
redis.call('SET', KEYS[3], 'true')
redis.call('SET', KEYS[4], 'lifetime')
redis.call('SET', KEYS[5], ARGV[2])
redis.call('SET', KEYS[7], ARGV[3])
local previous = tonumber(redis.call('GET', KEYS[2]) or '0')
if tonumber(ARGV[1]) > previous then redis.call('SET', KEYS[2], ARGV[1]) end
redis.call('SET', KEYS[1], '1', 'EX', 2592000)
return 'applied'
`;

// Lifetime revocation by payment reference. The payment is always marked revoked so a
// delayed grant cannot restore access; access is removed only when it belongs to this payment.
export const APPLY_LIFETIME_REVOKE = `
if redis.call('EXISTS', KEYS[1]) == 1 then return 'duplicate' end
redis.call('SET', KEYS[2], '1')
redis.call('SET', KEYS[1], '1', 'EX', 2592000)
if #KEYS < 6 or redis.call('GET', KEYS[3]) ~= ARGV[1] then return 'unknown-payment' end
if redis.call('GET', KEYS[5]) ~= 'lifetime' or redis.call('GET', KEYS[6]) ~= ARGV[2] then return 'unknown-payment' end
redis.call('DEL', KEYS[4], KEYS[5], KEYS[6])
return 'applied'
`;

export const paymentEmailKey = (paymentId: string) => 'lifetime_payment_email:' + paymentId;

export function premiumEventCommand(event: SubscriptionPremiumEvent, id: string) {
  return {
    keys: ['dodo:event:' + id, 'dodo:latest:' + event.email, 'premium:' + event.email,
      'subscription_id:' + event.email, 'renewal_date:' + event.email, 'premium_plan:' + event.email],
    args: [String(event.occurredAt), event.action, event.subscriptionId, event.renewalDate ?? ''],
  };
}

export function lifetimeGrantCommand(event: LifetimeGrantEvent, id: string) {
  return {
    keys: ['dodo:event:' + id, 'dodo:latest:' + event.email, 'premium:' + event.email, 'premium_plan:' + event.email,
      'lifetime_payment:' + event.email, 'lifetime_revoked:' + event.paymentId, paymentEmailKey(event.paymentId)],
    args: [String(event.occurredAt), event.paymentId, event.email],
  };
}

// `email` is the value previously read from lifetime_payment_email:<paymentId>; the script re-checks it.
export function lifetimeRevokeCommand(event: LifetimeRevokeEvent, id: string, email: string | null) {
  const base = ['dodo:event:' + id, 'lifetime_revoked:' + event.paymentId];
  if (!email) return { keys: base, args: ['', event.paymentId] };
  return {
    keys: [...base, paymentEmailKey(event.paymentId), 'premium:' + email, 'premium_plan:' + email, 'lifetime_payment:' + email],
    args: [email, event.paymentId],
  };
}
