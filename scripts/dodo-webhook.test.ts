import assert from 'node:assert/strict';
import test from 'node:test';
import { Webhook } from 'standardwebhooks';
import { premiumEvent, verifyDodoPayload, premiumEventCommand, APPLY_PREMIUM_EVENT } from '../lib/dodo-webhook';

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
    const event = premiumEvent(body(type, status))!;
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
  const command = premiumEventCommand(premiumEvent(body())!, 'msg_test');
  assert.deepEqual(command.keys, ['dodo:event:msg_test', 'dodo:latest:person@example.com', 'premium:person@example.com', 'subscription_id:person@example.com', 'renewal_date:person@example.com']);
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
