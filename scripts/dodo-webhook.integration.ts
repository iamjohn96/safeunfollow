// Run only against a dedicated disposable Redis created for verification, either a Docker container
// (DODO_TEST_CONTAINER=safeunfollow-webhook-test-20260904) or a local throwaway server
// (DODO_TEST_REDIS_PORT=6390, which must not be a production or shared instance).
// node --import tsx scripts/dodo-webhook.integration.ts
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import {
  APPLY_PREMIUM_EVENT, premiumEvent, premiumEventCommand, type SubscriptionPremiumEvent, type LifetimeGrantEvent, type LifetimeRevokeEvent,
  APPLY_LIFETIME_GRANT, APPLY_LIFETIME_REVOKE, lifetimeGrantCommand, lifetimeRevokeCommand, paymentEmailKey,
} from '../lib/dodo-webhook';
const container = process.env.DODO_TEST_CONTAINER;
const port = process.env.DODO_TEST_REDIS_PORT;
const useContainer = !!container && /^safeunfollow-webhook-test-[a-z0-9-]+$/.test(container);
if (!useContainer && !(port && /^\d{4,5}$/.test(port))) throw new Error('Dedicated disposable Redis required');
const cli = (...args: string[]) => (useContainer
  ? execFileSync('docker', ['exec', container!, 'redis-cli', '--raw', ...args], { encoding: 'utf8' })
  : execFileSync('redis-cli', ['-p', port!, '--raw', ...args], { encoding: 'utf8' })).trim();
const email = 'webhook-test@example.invalid';
let count = 0;
function apply(id: string, status: string, time: string, subscription = 'sub_one') {
  const event = premiumEvent({ type: 'subscription.' + status, timestamp: time,
    data: { customer: { email }, subscription_id: subscription, status,
      next_billing_date: '2026-10-04T00:00:00Z' } }) as SubscriptionPremiumEvent;
  const { keys, args } = premiumEventCommand(event, id);
  return cli('EVAL', APPLY_PREMIUM_EVENT, String(keys.length), ...keys, ...args);
}
const check = (actual: string, expected: string) => { assert.equal(actual, expected); count++; };
check(apply('grant1', 'active', '2026-09-01T00:00:00Z'), 'applied');
check(cli('GET', 'premium:' + email), 'true');
check(apply('grant1', 'active', '2026-09-01T00:00:00Z'), 'duplicate');
check(apply('cancel1', 'cancelled', '2026-09-02T00:00:00Z'), 'applied');
check(cli('EXISTS', 'premium:' + email), '0');
check(apply('late-grant', 'active', '2026-09-01T12:00:00Z'), 'stale');
check(apply('tie-grant', 'active', '2026-09-02T00:00:00Z'), 'stale');
check(cli('EXISTS', 'premium:' + email), '0');
check(apply('new-sub', 'active', '2026-09-03T00:00:00Z', 'sub_two'), 'applied');
check(apply('old-sub-cancel', 'cancelled', '2026-09-04T00:00:00Z'), 'other-subscription');
check(cli('GET', 'subscription_id:' + email), 'sub_two');
check(cli('GET', 'premium:' + email), 'true');
check(apply('expire2', 'expired', '2026-09-05T00:00:00Z', 'sub_two'), 'applied');
check(cli('EXISTS', 'premium:' + email, 'renewal_date:' + email), '0');
// Lifetime access: grant, subscription revocation does not remove it, refund removes it, late grant cannot restore it.
const buyer = 'lifetime-test@example.invalid';
const LIFETIME = 'pdt_lifetime_integration';
function lifetimeGrant(id: string, payment: string, time: string) {
  const event = premiumEvent({ type: 'payment.succeeded', timestamp: time, data: { payment_id: payment, status: 'succeeded',
    subscription_id: null, customer: { email: buyer }, product_cart: [{ product_id: LIFETIME, quantity: 1 }] } }, LIFETIME) as LifetimeGrantEvent;
  const { keys, args } = lifetimeGrantCommand(event, id);
  return cli('EVAL', APPLY_LIFETIME_GRANT, String(keys.length), ...keys, ...args);
}
function lifetimeRevoke(id: string, payment: string, type = 'refund.succeeded') {
  const data = type === 'refund.succeeded' ? { payment_id: payment, status: 'succeeded', is_partial: false }
    : { payment_id: payment, dispute_status: type === 'dispute.lost' ? 'dispute_lost' : 'dispute_accepted' };
  const event = premiumEvent({ type, timestamp: '2026-09-20T00:00:00Z', data }) as LifetimeRevokeEvent;
  const owner = cli('GET', paymentEmailKey(payment)) || null;
  const { keys, args } = lifetimeRevokeCommand(event, id, owner);
  return cli('EVAL', APPLY_LIFETIME_REVOKE, String(keys.length), ...keys, ...args);
}
function buyerSubscription(id: string, status: string, time: string) {
  const event = premiumEvent({ type: 'subscription.' + status, timestamp: time,
    data: { customer: { email: buyer }, subscription_id: 'sub_buyer', status } }) as SubscriptionPremiumEvent;
  const { keys, args } = premiumEventCommand(event, id);
  return cli('EVAL', APPLY_PREMIUM_EVENT, String(keys.length), ...keys, ...args);
}
check(lifetimeGrant('life1', 'pay_one', '2026-09-17T00:00:00Z'), 'applied');
check(cli('GET', 'premium:' + buyer), 'true');
check(cli('GET', 'premium_plan:' + buyer), 'lifetime');
check(lifetimeGrant('life1', 'pay_one', '2026-09-17T00:00:00Z'), 'duplicate');
check(buyerSubscription('buyer-sub', 'active', '2026-09-18T00:00:00Z'), 'applied');
check(buyerSubscription('buyer-sub-cancel', 'cancelled', '2026-09-19T00:00:00Z'), 'lifetime-retained');
check(cli('GET', 'premium:' + buyer), 'true');
check(lifetimeRevoke('refund-unknown', 'pay_unknown'), 'unknown-payment');
check(cli('GET', 'premium:' + buyer), 'true');
check(lifetimeRevoke('refund1', 'pay_one'), 'applied');
check(cli('EXISTS', 'premium:' + buyer, 'premium_plan:' + buyer, 'lifetime_payment:' + buyer), '0');
check(lifetimeRevoke('refund1', 'pay_one'), 'duplicate');
check(lifetimeGrant('life-late', 'pay_one', '2026-09-17T00:00:00Z'), 'revoked-payment');
check(cli('EXISTS', 'premium:' + buyer), '0');
check(lifetimeRevoke('dispute-first', 'pay_two', 'dispute.lost'), 'unknown-payment');
check(lifetimeGrant('life-two', 'pay_two', '2026-09-21T00:00:00Z'), 'revoked-payment');
check(lifetimeGrant('life-three', 'pay_three', '2026-09-22T00:00:00Z'), 'applied');
check(lifetimeRevoke('dispute-accepted', 'pay_three', 'dispute.accepted'), 'applied');
check(cli('EXISTS', 'premium:' + buyer), '0');
console.log('Isolated Redis integration: ' + count + ' assertions passed');

