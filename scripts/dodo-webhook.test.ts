import assert from 'node:assert/strict';
import test from 'node:test';
import { Webhook } from 'standardwebhooks';
import {
  premiumEvent, verifyDodoPayload, premiumEventCommand, APPLY_PREMIUM_EVENT,
  lifetimeGrantCommand, lifetimeRevokeCommand, APPLY_LIFETIME_GRANT, APPLY_LIFETIME_REVOKE,
  type SubscriptionPremiumEvent, type LifetimeGrantEvent, type LifetimeRevokeEvent,
} from '../lib/dodo-webhook';

const secret = 'whsec_' + Buffer.from('local-test-secret-not-a-real-credential').toString('base64');
const body = (type = 'subscription.active', status = 'active') => ({
  type, timestamp: '2026-09-04T08:00:00Z',
  data: { customer: { email: ' Person@Example.com ' }, subscription_id: 'sub_test', status, next_billing_date: '2026-10-04T08:00:00Z' },
});
function signed(raw: string, date = new Date(), id = 'msg_test') {
  return new Headers({
    'webhook-id': id, 'webhook-timestamp': String(Math.floor(date.getTime() / 1000)),
    'webhook-signature': new Webhook(secret).sign(id, date, raw),
  });
}
test('Dodo Standard Webhooks validates raw body and rejects tampering, missing headers and legacy signatures', () => {
  const raw = JSON.stringify(body());
  const headers = signed(raw);
  assert.deepEqual(verifyDodoPayload(raw, headers, secret), body());
  assert.throws(() => verifyDodoPayload(raw + ' ', headers, secret));
  for (const key of ['webhook-id', 'webhook-timestamp', 'webhook-signature']) {
    const missing = new Headers(headers); missing.delete(key);
    assert.throws(() => verifyDodoPayload(raw, missing, secret));
  }
  headers.set('webhook-signature', 'sha256=' + 'a'.repeat(64));
  assert.throws(() => verifyDodoPayload(raw, headers, secret));
});
test('Dodo rejects expired and future delivery signatures, wrong keys and malformed timestamps', () => {
  const raw = JSON.stringify(body());
  for (const delta of [-600000, 600000]) assert.throws(() => verifyDodoPayload(raw, signed(raw, new Date(Date.now() + delta)), secret));
  assert.throws(() => verifyDodoPayload(raw, signed(raw), Buffer.from('wrong').toString('base64')));
  const headers = signed(raw); headers.set('webhook-timestamp', headers.get('webhook-timestamp') + 'garbage');
  assert.throws(() => verifyDodoPayload(raw, headers, secret));
});
test('Dodo only grants explicitly successful subscription-related events', () => {
  for (const [type, status] of [['subscription.active', 'active'], ['subscription.renewed', 'active'], ['payment.succeeded', 'succeeded']]) {
    const event = premiumEvent(body(type, status)) as SubscriptionPremiumEvent;
    assert.equal(event.kind, 'subscription');
    assert.equal(event.action, 'grant'); assert.equal(event.email, 'person@example.com');
    assert.equal(event.subscriptionId, 'sub_test');
  }
  for (const type of ['payment.failed', 'payment.processing', 'payment.cancelled', 'order.failed', 'subscription.updated', 'dispute.cancelled', 'refund.failed']) {
    assert.equal(premiumEvent(body(type)), null);
  }
});
test('Dodo revokes only explicit terminal or on-hold subscription states', () => {
  for (const status of ['cancelled', 'expired', 'failed', 'on_hold']) {
    assert.equal(premiumEvent(body('subscription.' + status, status))!.action, 'revoke');
  }
  assert.throws(() => premiumEvent(body('subscription.active', 'cancelled')));
  assert.throws(() => premiumEvent(body('subscription.cancelled', 'active')));
});
test('Dodo malformed identity, missing subscription and bad dates never grant', () => {
  for (const value of [null, [], {}, { ...body(), timestamp: 'bad' },
    { ...body(), data: { ...body().data, subscription_id: '' } },
    { ...body(), data: { ...body().data, customer: { email: 'bad' } } }]) {
    assert.throws(() => premiumEvent(value));
  }
  for (const extra of [{ is_update_payment_method: true }, { refund_status: 'full' }]) {
    assert.equal(premiumEvent({ ...body('payment.succeeded', 'succeeded'), data: { ...body().data, ...extra } }), null);
  }
});
test('Dodo builds atomic persistence using existing entitlement keys and a separate delivery ID', () => {
  const command = premiumEventCommand(premiumEvent(body()) as SubscriptionPremiumEvent, 'msg_test');
  assert.deepEqual(command.keys, ['dodo:event:msg_test', 'dodo:latest:person@example.com', 'premium:person@example.com', 'subscription_id:person@example.com', 'renewal_date:person@example.com', 'premium_plan:person@example.com']);
  assert.equal(command.args[1], 'grant');
  assert.ok(APPLY_PREMIUM_EVENT.includes("return 'duplicate'"));
});
test('Dodo handler validates before persistence and handles retries and email failure without external calls', async () => {
  const { handleDodoWebhook } = await import('../lib/dodo-handler');
  let writes = 0, notifications = 0, outcome = 'applied', unavailable = false;
  const deps = { secret, persist: async () => { writes++; if (unavailable) throw new Error('offline'); return outcome; },
    notify: async () => { notifications++; throw new Error('email offline'); } };
  const request = (value: unknown, valid = true) => {
    const raw = JSON.stringify(value);
    return new Request('https://example.invalid/api/webhook/dodo', { method: 'POST', body: raw, headers: valid ? signed(raw) : {} });
  };
  assert.equal((await handleDodoWebhook(request(body(), false), deps)).status, 401);
  assert.equal(writes, 0);
  assert.equal((await handleDodoWebhook(request(body('payment.failed')), deps)).status, 200);
  assert.equal(writes, 0);
  assert.equal((await handleDodoWebhook(request({ ...body(), data: null }), deps)).status, 422);
  assert.equal((await handleDodoWebhook(request(body()), deps)).status, 200);
  assert.equal(writes, 1); assert.equal(notifications, 1);
  outcome = 'duplicate';
  assert.equal((await handleDodoWebhook(request(body()), deps)).status, 200);
  assert.equal(notifications, 1);
  unavailable = true;
  assert.equal((await handleDodoWebhook(request(body()), deps)).status, 503);
  assert.equal((await handleDodoWebhook(request(body()), { ...deps, secret: undefined })).status, 503);
});

const LIFETIME = 'pdt_lifetime_test';
const lifetimePayment = (extra: Record<string, unknown> = {}) => ({
  type: 'payment.succeeded', timestamp: '2026-09-17T08:00:00Z',
  data: { payment_id: 'pay_test_1', status: 'succeeded', subscription_id: null, customer: { email: ' Buyer@Example.com ' },
    product_cart: [{ product_id: LIFETIME, quantity: 1 }], is_update_payment_method: false, refund_status: null, ...extra },
});
test('Dodo grants lifetime access only for a succeeded one-time payment of the configured product', () => {
  const event = premiumEvent(lifetimePayment(), LIFETIME) as LifetimeGrantEvent;
  assert.equal(event.kind, 'lifetime-grant'); assert.equal(event.action, 'grant');
  assert.equal(event.email, 'buyer@example.com'); assert.equal(event.paymentId, 'pay_test_1');
  for (const extra of [{ product_cart: [{ product_id: 'pdt_other', quantity: 1 }] }, { product_cart: [] }, { product_cart: null },
    { customer: { email: 'not-an-email' } }, { payment_id: '' }, { payment_id: 'bad id with spaces' }, { status: 'processing' }]) {
    assert.throws(() => premiumEvent(lifetimePayment(extra), LIFETIME));
  }
  assert.throws(() => premiumEvent({ ...lifetimePayment(), timestamp: 'bad' }, LIFETIME));
  assert.throws(() => premiumEvent(lifetimePayment(), ''));
  assert.equal(premiumEvent(lifetimePayment({ refund_status: 'full' }), LIFETIME), null);
  assert.equal(premiumEvent(lifetimePayment({ is_update_payment_method: true }), LIFETIME), null);
  // A subscription-linked payment still follows the subscription path even if the cart names the lifetime product.
  assert.equal(premiumEvent(lifetimePayment({ subscription_id: 'sub_test' }), LIFETIME)!.kind, 'subscription');
});
test('Dodo revokes lifetime access only for full refunds and lost or accepted disputes', () => {
  const refund = (extra: Record<string, unknown> = {}) => ({ type: 'refund.succeeded', timestamp: '2026-09-18T08:00:00Z',
    data: { refund_id: 'ref_1', payment_id: 'pay_test_1', status: 'succeeded', is_partial: false, ...extra } });
  const dispute = (type: string, status: string) => ({ type, timestamp: '2026-09-18T08:00:00Z',
    data: { dispute_id: 'dsp_1', payment_id: 'pay_test_1', dispute_status: status, dispute_stage: 'dispute' } });
  const revoke = premiumEvent(refund()) as LifetimeRevokeEvent;
  assert.equal(revoke.kind, 'lifetime-revoke'); assert.equal(revoke.paymentId, 'pay_test_1');
  assert.equal(premiumEvent(refund({ is_partial: true })), null);
  assert.equal(premiumEvent(refund({ is_partial: undefined })), null);
  assert.throws(() => premiumEvent(refund({ status: 'pending' })));
  assert.throws(() => premiumEvent(refund({ payment_id: '' })));
  assert.equal((premiumEvent(dispute('dispute.lost', 'dispute_lost')) as LifetimeRevokeEvent).kind, 'lifetime-revoke');
  assert.equal((premiumEvent(dispute('dispute.accepted', 'dispute_accepted')) as LifetimeRevokeEvent).kind, 'lifetime-revoke');
  assert.throws(() => premiumEvent(dispute('dispute.lost', 'dispute_won')));
  for (const type of ['dispute.opened', 'dispute.won', 'dispute.challenged', 'dispute.expired', 'refund.failed']) {
    assert.equal(premiumEvent(dispute(type, 'dispute_opened')), null);
  }
});
test('Dodo lifetime persistence commands bind the payment, plan marker and revocation marker', () => {
  const grant = lifetimeGrantCommand(premiumEvent(lifetimePayment(), LIFETIME) as LifetimeGrantEvent, 'msg_grant');
  assert.deepEqual(grant.keys, ['dodo:event:msg_grant', 'dodo:latest:buyer@example.com', 'premium:buyer@example.com',
    'premium_plan:buyer@example.com', 'lifetime_payment:buyer@example.com', 'lifetime_revoked:pay_test_1', 'lifetime_payment_email:pay_test_1']);
  const event = { kind: 'lifetime-revoke', action: 'revoke', paymentId: 'pay_test_1', occurredAt: 1, type: 'refund.succeeded' } as LifetimeRevokeEvent;
  assert.deepEqual(lifetimeRevokeCommand(event, 'msg_refund', null).keys, ['dodo:event:msg_refund', 'lifetime_revoked:pay_test_1']);
  assert.deepEqual(lifetimeRevokeCommand(event, 'msg_refund', 'buyer@example.com').keys, ['dodo:event:msg_refund', 'lifetime_revoked:pay_test_1',
    'lifetime_payment_email:pay_test_1', 'premium:buyer@example.com', 'premium_plan:buyer@example.com', 'lifetime_payment:buyer@example.com']);
  assert.ok(APPLY_LIFETIME_GRANT.includes("return 'revoked-payment'"));
  assert.ok(APPLY_LIFETIME_REVOKE.includes("return 'unknown-payment'"));
  assert.ok(APPLY_PREMIUM_EVENT.includes("return 'lifetime-retained'"));
});
test('Dodo handler sends the lifetime welcome only after an applied lifetime grant', async () => {
  const { handleDodoWebhook } = await import('../lib/dodo-handler');
  const plans: string[] = [];
  let outcome = 'applied';
  const deps = { secret, persist: async () => outcome, notify: async (_email: string, _id: string, plan: string) => { plans.push(plan); } };
  const send = (value: unknown) => { const raw = JSON.stringify(value); return handleDodoWebhook(new Request('https://example.invalid/api/webhook/dodo', { method: 'POST', body: raw, headers: signed(raw) }), deps); };
  // Uses the real configured product ID from utils/premium-offer.
  const { LIFETIME_PRODUCT_ID } = await import('../utils/premium-offer');
  const payment = lifetimePayment({ product_cart: [{ product_id: LIFETIME_PRODUCT_ID, quantity: 1 }] });
  assert.equal((await send(payment)).status, 200);
  assert.deepEqual(plans, ['lifetime']);
  outcome = 'revoked-payment';
  assert.equal((await send(payment)).status, 200);
  assert.deepEqual(plans, ['lifetime']);
  assert.equal((await send({ type: 'refund.succeeded', timestamp: '2026-09-18T08:00:00Z', data: { payment_id: 'pay_test_1', status: 'succeeded', is_partial: false } })).status, 200);
  assert.deepEqual(plans, ['lifetime']);
  assert.equal((await send(lifetimePayment())).status, 422);
});
