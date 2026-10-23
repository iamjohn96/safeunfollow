import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LIFETIME_PRICE_USD } from '../utils/premium-offer';

// Every user-facing price must match the single source of truth, so a price change cannot leave stale copy behind.
const files = ['app/page.tsx', 'utils/translations.ts', 'utils/legal-content.ts', 'public/llms.txt', 'scripts/generate-post.ts'];

test('every displayed USD price matches LIFETIME_PRICE_USD', () => {
  let found = 0;
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(/(?:US\$ ?|\$)(\d+)[.,](\d{2})/g)) {
      found++;
      assert.equal(`${match[1]}.${match[2]}`, LIFETIME_PRICE_USD, `${file}: stale price ${match[0]}`);
    }
  }
  assert.ok(found >= 20, `expected price mentions across the site copy, found ${found}`);
});
