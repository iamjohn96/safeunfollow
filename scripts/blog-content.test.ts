import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { validatePost } from './generate-post';
import { getMarkdownDocument } from '../lib/markdown-content';

test('the canonical Instagram data analyzer article passes every SEO rule', () => {
  const slug = 'how-to-analyze-instagram-data-export';
  const source = fs.readFileSync(path.join(process.cwd(), 'content', 'blog', `${slug}.md`), 'utf8');
  const entry = {
    keyword: 'instagram data analyzer',
    slug,
    published: true,
    published_at: '2026-08-26T00:00:00.000Z',
    last_attempt: null,
    cluster: 'instagram-unfollow',
  };

  const result = validatePost(source, entry, {
    knownSlugs: new Set([
      slug,
      'instagram-unfollow-guide',
      'safe-instagram-unfollow-guide',
    ]),
    pillarSlug: 'instagram-unfollow-guide',
  });

  assert.deepEqual(result, { valid: true, errors: [] });
});

test('the canonical article exposes an ISO publication date for metadata', () => {
  const document = getMarkdownDocument('blog', 'how-to-analyze-instagram-data-export');
  assert.equal(document?.data.date, '2026-08-26');
});
