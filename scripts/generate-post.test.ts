import assert from 'node:assert/strict';
import test from 'node:test';
import matter from 'gray-matter';
import {
  buildPost,
  deduplicateInternalLinks,
  repairGeneratedBody,
  repairMetaDescription,
  selectKeyword,
  SYSTEM_PROMPT,
  titleFromKeyword,
  validatePost,
} from './generate-post';

const entry = {
  keyword: 'instagram data download unfollowers',
  slug: 'instagram-data-download-unfollowers',
  published: false,
  published_at: null,
  last_attempt: null,
  cluster: 'instagram-unfollow',
};

const validBody = `Finding instagram data download unfollowers safely starts with using your own export instead of sharing credentials. SafeUnfollow provides a Privacy First workflow with No Login Required, No OAuth, and No API access.

## Use Your Instagram Data Download

Request the export from Instagram, download it, then upload the ZIP file to SafeUnfollow to review the results.

## FAQ

### Is this private?

Yes. The data-file workflow keeps account access under your control.

[Try SafeUnfollow](https://safeunfollow.com/upload) to check your file.`;
const validClusterBody = `${validBody}

Continue with the [complete guide](/pillars/instagram-unfollow-guide) and [unfollow limits](/pillars/instagram-unfollow-limits-guide).

## Related Articles

- [Data Download Guide](/blog/instagram-data-download-guide)`;

test('accepts a post that satisfies every SEO rule', () => {
  const result = validatePost(buildPost(entry, validClusterBody, '2026-06-29'), entry, {
    knownSlugs: new Set(['instagram-unfollow-guide', 'instagram-unfollow-limits-guide', 'instagram-data-download-guide']),
    pillarSlug: 'instagram-unfollow-guide',
  });
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

test('repairs model output to enforce keyword and SafeUnfollow positioning', () => {
  const repaired = repairGeneratedBody(`A generic opening that says users connect your Instagram account. SafeUnfollow.com has zero ban risk.

## Workflow

Request your information and review it safely.`, entry.keyword);

  const firstWords = repaired.split(/\s+/).slice(0, 100).join(' ').toLowerCase();
  assert(firstWords.includes(entry.keyword));
  assert.match(repaired, /Instagram Data Download/);
  assert.match(repaired, /No Login Required/);
  assert.match(repaired, /No OAuth/);
  assert.match(repaired, /no Instagram API/i);
  assert.match(repaired, /upload[^.]*ZIP|ZIP[^.]*upload/i);
  assert.doesNotMatch(repaired, /connect your Instagram account/i);
  assert.doesNotMatch(repaired, /SafeUnfollow\.com|zero ban risk/i);
  assert.match(repaired, /reduced account-access risk/i);
});

test('generation prompt requires readable Markdown and qualified product wording', () => {
  assert.match(SYSTEM_PROMPT, /H2 headings for every major section/);
  assert.match(SYSTEM_PROMPT, /FAQ question as an H3/);
  assert.match(SYSTEM_PROMPT, /Markdown ordered list/);
  assert.match(SYSTEM_PROMPT, /Keep paragraphs short/);
  assert.match(SYSTEM_PROMPT, /Use bold text sparingly/);
  assert.match(SYSTEM_PROMPT, /natural, descriptive anchor text/);
  assert.match(SYSTEM_PROMPT, /reduced account-access risk/i);
  assert.match(SYSTEM_PROMPT, /targets 140-150 characters/);
  assert.doesNotMatch(SYSTEM_PROMPT, /Required positioning:[\s\S]*Zero Ban Risk/);
  assert.equal(titleFromKeyword('safe unfollow'), 'SafeUnfollow');
});

test('repairs overlong meta descriptions at a word boundary near the target length', () => {
  const description = 'Learn how to identify Instagram unfollowers from a very detailed data export without sharing credentials, granting direct account access, or relying on login-based tracker applications.';
  const repaired = repairMetaDescription(description);

  assert(repaired.length >= 145 && repaired.length <= 155);
  assert.match(repaired, /…$/u);
  assert.doesNotMatch(repaired, /\s…$/u);
  assert.equal(description.startsWith(repaired.slice(0, -1)), true);
});

test('buildPost repairs long keyword descriptions before validation', () => {
  const longEntry = {
    ...entry,
    keyword: 'how to find every Instagram unfollower using a downloaded account archive without sharing credentials',
    slug: 'long-description-regression',
  };
  const post = buildPost(longEntry, validClusterBody, '2026-06-29');
  const description = String(matter(post).data.description);
  const validation = validatePost(post, longEntry);

  assert(description.length >= 145 && description.length <= 155);
  assert(description.length <= 160);
  assert.match(description, /…$/u);
  assert.equal(validation.errors.some(error => error.includes('Meta description exceeds')), false);
});

test('leaves valid meta descriptions unchanged apart from whitespace normalization', () => {
  assert.equal(
    repairMetaDescription('A concise  SafeUnfollow description.\nNo login required.'),
    'A concise SafeUnfollow description. No login required.',
  );
});

test('rejects inconsistent product names and absolute risk claims', () => {
  const inconsistent = validClusterBody
    .replace('SafeUnfollow provides', 'SafeUnfollow.com provides')
    .replace('keeps account access under your control', 'has zero ban risk');
  const result = validatePost(buildPost(entry, inconsistent, '2026-06-29'), entry);

  assert.equal(result.valid, false);
  assert(result.errors.some(error => error.includes('Product name must be written as SafeUnfollow')));
  assert(result.errors.some(error => error.includes('zero ban risk')));
});

test('deduplicates internal destinations while preserving readable link labels', () => {
  const repaired = deduplicateInternalLinks(`Read the [pillar](/pillars/instagram-unfollow-guide).

See the [same pillar again](/pillars/instagram-unfollow-guide) and [another guide](/blog/another-guide).`);

  assert.equal((repaired.match(/\/pillars\/instagram-unfollow-guide/g) || []).length, 1);
  assert.match(repaired, /same pillar again/);
  assert.equal((repaired.match(/\/blog\/another-guide/g) || []).length, 1);
});
