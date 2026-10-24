import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { validatePost } from './generate-post';
import { getMarkdownDocument, availableDocumentLangs } from '../lib/markdown-content';

const posts = [
  { slug: 'see-who-doesnt-follow-you-back-on-threads', keyword: "who doesn't follow you back on threads", landing: '/threads-unfollow-checker', sibling: 'see-who-doesnt-follow-you-back-on-tiktok' },
  { slug: 'see-who-doesnt-follow-you-back-on-tiktok', keyword: "who doesn't follow you back on tiktok", landing: '/tiktok-unfollow-checker', sibling: 'see-who-doesnt-follow-you-back-on-threads' },
];

const knownSlugs = new Set([
  'instagram-unfollow-guide',
  'how-to-analyze-instagram-data-export',
  'track-instagram-follower-changes-over-time',
  ...posts.map(post => post.slug),
]);

for (const post of posts) {
  test(`${post.slug} passes every SEO rule`, () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'content', 'blog', `${post.slug}.md`), 'utf8');
    const result = validatePost(source, {
      keyword: post.keyword,
      slug: post.slug,
      published: true,
      published_at: '2026-10-24T00:00:00.000Z',
      last_attempt: null,
      cluster: 'instagram-unfollow',
    }, { knownSlugs, pillarSlug: 'instagram-unfollow-guide' });
    assert.deepEqual(result, { valid: true, errors: [] });
  });

  test(`${post.slug} is published in every locale and links its landing page and sibling post`, () => {
    assert.deepEqual(availableDocumentLangs('blog', post.slug), ['en', 'pt', 'ru', 'es']);
    for (const lang of ['en', 'pt', 'ru', 'es'] as const) {
      const document = getMarkdownDocument('blog', post.slug, lang);
      assert.ok(document, `${lang} missing`);
      assert.equal(document.data.slug, post.slug);
      assert.equal(document.data.date, '2026-10-24');
      assert.ok(String(document.data.description).length <= 160, `${lang} description too long`);
      const prefix = lang === 'en' ? '' : `/${lang}`;
      assert.ok(document.content.includes(`](${prefix}${post.landing})`), `${lang} missing landing link`);
      assert.ok(document.content.includes(`](${prefix}/blog/${post.sibling})`), `${lang} missing sibling link`);
      assert.ok(document.content.includes(`](${prefix}/upload)`), `${lang} missing upload link`);
      assert.match(document.content, /US\$14[.,]99/, `${lang} missing current price`);
      assert.doesNotMatch(document.content, /3[.,]99/, `${lang} has a stale price`);
    }
  });
}
