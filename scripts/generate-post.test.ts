import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPost, selectKeyword, validatePost } from './generate-post';

const entry = {
  keyword: 'instagram data download unfollowers',
  slug: 'instagram-data-download-unfollowers',
  published: false,
  published_at: null,
  last_attempt: null,
};

const validBody = `Finding instagram data download unfollowers safely starts with using your own export instead of sharing credentials. SafeUnfollow provides a Privacy First workflow with No Login Required, No OAuth, and No API access.

## Use Your Instagram Data Download

Request the export from Instagram, download it, then upload the ZIP file to SafeUnfollow to review the results.

## FAQ

### Is this private?

Yes. The data-file workflow keeps account access under your control.

[Try SafeUnfollow](https://safeunfollow.com/upload) to check your file.`;

test('accepts a post that satisfies every SEO rule', () => {
  const result = validatePost(buildPost(entry, validBody, '2026-06-29'), entry);
  assert.deepEqual(result, { valid: true, errors: [] });
});

test('reports structure, messaging, CTA, and banned phrase failures', () => {
  const invalidBody = `# Duplicate title

This article says connect your Instagram account.

## Only section`;
  const result = validatePost(buildPost(entry, invalidBody, '2026-06-29'), entry);

  assert.equal(result.valid, false);
  assert(result.errors.some(error => error.includes('exactly one rendered H1')));
  assert(result.errors.some(error => error.includes('at least 2 H2')));
  assert(result.errors.some(error => error.includes('Missing FAQ')));
  assert(result.errors.some(error => error.includes('first 100 words')));
  assert(result.errors.some(error => error.includes('Missing product message')));
  assert(result.errors.some(error => error.includes('Missing CTA')));
  assert(result.errors.some(error => error.includes('Banned phrase')));
});

test('selects the first unpublished keyword whose article does not exist', () => {
  const entries = [
    { ...entry, published: true },
    { ...entry, keyword: 'existing', slug: 'instagram-data-download-unfollowers' },
    { ...entry, keyword: 'eligible', slug: 'brand-new-safeunfollow-topic' },
  ];

  assert.equal(selectKeyword(entries)?.keyword, 'eligible');
});
