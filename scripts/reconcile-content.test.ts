import assert from 'node:assert/strict';
import test from 'node:test';
import { reconcileContent } from './reconcile-content';

test('reconciliation marks exact slugs, corrects keyword matches, and adds missing content', () => {
  const result = reconcileContent([
    { keyword: 'exact', slug: 'exact', published: false, published_at: null, last_attempt: null },
    { keyword: 'renamed keyword', slug: 'old-slug', published: false, published_at: null, last_attempt: null },
  ], [
    { slug: 'exact', title: 'Exact', keyword: 'exact', cluster: 'one', publishedAt: '2026-01-01T00:00:00.000Z' },
    { slug: 'new-slug', title: 'Renamed', keyword: 'renamed keyword', cluster: 'one', publishedAt: '2026-01-02T00:00:00.000Z' },
    { slug: 'missing', title: 'Missing', keyword: 'missing keyword', cluster: 'two', publishedAt: '2026-01-03T00:00:00.000Z' },
  ]);

  assert.deepEqual(result.matchedBySlug, ['exact']);
  assert.deepEqual(result.matchedByKeyword, ['new-slug']);
  assert.deepEqual(result.added, ['missing']);
  assert(result.entries.every(entry => entry.published));
  assert.equal(result.entries.find(entry => entry.keyword === 'renamed keyword')?.slug, 'new-slug');
  assert.equal(result.entries.find(entry => entry.slug === 'missing')?.source, 'existing_content');
});
