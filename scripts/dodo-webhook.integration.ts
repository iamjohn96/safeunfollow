// Run only against the dedicated disposable Redis container created for verification.
// DODO_TEST_CONTAINER=safeunfollow-webhook-test-20260904 node --import tsx scripts/dodo-webhook.integration.ts
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { APPLY_PREMIUM_EVENT, premiumEvent, premiumEventCommand } from '../lib/dodo-webhook';
const container = process.env.DODO_TEST_CONTAINER;
if (!container || !/^safeunfollow-webhook-test-[a-z0-9-]+$/.test(container)) throw new Error('Dedicated test container required');
const cli = (...args: string[]) => execFileSync('docker', ['exec', container, 'redis-cli', '--raw', ...args], { encoding: 'utf8' }).trim();
const email = 'webhook-test@example.invalid';
let count = 0;
function apply(id: string, status: string, time: string, subscription = 'sub_one') {
  const event = premiumEvent({ type: 'subscription.' + status, timestamp: time,
    data: { customer: { email }, subscription_id: subscription, status,
      next_billing_date: '2026-10-04T00:00:00Z' } })!;
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
console.log('Isolated Redis integration: ' + count + ' assertions passed');

