import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { cancelDodoSubscription } from '../app/api/premium/cancel/route';

test('cancellation fails closed when the Dodo API key is unavailable', async () => {
  let calls = 0;
  const fetchStub = async () => { calls += 1; return new Response(null, { status: 200 }); };
  assert.equal(await cancelDodoSubscription('sub_test', undefined, fetchStub), false);
  assert.equal(calls, 0);
});

test('cancellation only succeeds for provider success or an already-missing subscription', async () => {
  for (const status of [200, 404]) {
    const fetchStub = async (_input: string | URL | Request, init?: RequestInit) => {
      assert.equal(init?.method, 'PATCH');
      assert.equal(init?.body, JSON.stringify({ status: 'cancelled' }));
      return new Response(null, { status });
    };
    assert.equal(await cancelDodoSubscription('sub_test', 'test_key', fetchStub), true);
  }
  const unavailable = async () => new Response(null, { status: 503 });
  assert.equal(await cancelDodoSubscription('sub_test', 'test_key', unavailable), false);
});

test('Premium restore requires emailed proof and a browser session', () => {
  const check = readFileSync('app/api/premium/check/route.ts', 'utf8');
  const modal = readFileSync('components/PremiumModal.tsx', 'utf8');
  const restore = readFileSync('app/api/premium/restore/route.ts', 'utf8');
  assert.match(check, /export async function POST/);
  assert.doesNotMatch(check, /searchParams\.get\('email'\)/);
  assert.match(check, /getPremiumSessionEmail/);
  assert.match(modal, /premium\/restore\/verify/);
  assert.match(modal, /premiumSession/);
  assert.match(restore, /getRestoreToken/);
  assert.match(restore, /randomBytes\(32\)/);
});

test('browser storage failures are not described as missing Instagram files', () => {
  const upload = readFileSync('app/upload/page.tsx', 'utf8');
  assert.match(upload, /stage === 'storage' \? 'storage' : 'upload\.error\.missing'/);
  assert.match(upload, /audienceCopy\[lang\]\.storage/);
});
