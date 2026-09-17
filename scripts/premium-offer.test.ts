import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { FREE_PREVIEW_LIMIT, LIFETIME_PRODUCT_ID, lifetimeCheckoutUrl, previewAccounts } from '../utils/premium-offer';

test('free preview shows the first 20 accounts and reports the hidden remainder', () => {
  const accounts = Array.from({ length: 57 }, (_, i) => ({ username: `account_${i}` }));
  assert.equal(FREE_PREVIEW_LIMIT, 20);
  const locked = previewAccounts(accounts, false);
  assert.equal(locked.visible.length, 20);
  assert.equal(locked.hidden, 37);
  assert.deepEqual(locked.visible.map(a => a.username), accounts.slice(0, 20).map(a => a.username));
  const unlocked = previewAccounts(accounts, true);
  assert.equal(unlocked.visible.length, 57);
  assert.equal(unlocked.hidden, 0);
  assert.deepEqual(previewAccounts(accounts.slice(0, 5), false), { visible: accounts.slice(0, 5), hidden: 0 });
  assert.deepEqual(previewAccounts([], false), { visible: [], hidden: 0 });
});

test('lifetime checkout links use the one-time product and return to the localized upload page', () => {
  assert.match(LIFETIME_PRODUCT_ID, /^pdt_[A-Za-z0-9]+$/);
  const en = new URL(lifetimeCheckoutUrl('en'));
  assert.equal(en.origin, 'https://checkout.dodopayments.com');
  assert.equal(en.pathname, `/buy/${LIFETIME_PRODUCT_ID}`);
  assert.equal(en.searchParams.get('quantity'), '1');
  assert.equal(en.searchParams.get('redirect_url'), 'https://safeunfollow.com/upload?premium=purchased');
  assert.equal(new URL(lifetimeCheckoutUrl('pt')).searchParams.get('redirect_url'), 'https://safeunfollow.com/pt/upload?premium=purchased');
});

test('result, cleanup, and checkout UI enforce the preview gate and one-time plan', () => {
  const dashboard = readFileSync('components/Dashboard.tsx', 'utf8');
  const insights = readFileSync('components/AudienceInsights.tsx', 'utf8');
  const modal = readFileSync('components/PremiumModal.tsx', 'utf8');
  // Locked lists render only preview slices, and search is available only when unlocked.
  assert.match(dashboard, /nonFollowerPreview\.visible\.map/);
  assert.doesNotMatch(dashboard, /filteredNonFollowers\.map/);
  assert.match(dashboard, /\{isPremium && \(\s*<div className="mb-3">\s*<input/);
  assert.match(dashboard, /openUnlock\('result_gate'\)/);
  assert.match(insights, /isPremium \? limit : Math\.min\(limit, FREE_PREVIEW_LIMIT\)/);
  // The subscription toggle is gone; checkout is the single lifetime link.
  assert.doesNotMatch(modal, /NEXT_PUBLIC_DODO_(MONTHLY|YEARLY)_URL/);
  assert.match(modal, /lifetimeCheckoutUrl\(lang\)/);
  assert.match(modal, /plan: 'lifetime'/);
});
