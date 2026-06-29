import assert from 'node:assert/strict';
import test from 'node:test';
import sitemap from '../app/sitemap';
import { getMarkdownDocuments } from '../lib/markdown-content';

const BASE_URL = 'https://safeunfollow.com';

test('every pillar markdown document has its canonical route in the sitemap', () => {
  const urls = new Set(sitemap().map(entry => entry.url));
  const pillars = getMarkdownDocuments('pillars');

  assert(pillars.length > 0);
  for (const { data } of pillars) {
    assert(urls.has(`${BASE_URL}/pillars/${data.slug}`));
    assert(!urls.has(`${BASE_URL}/blog/${data.slug}`));
  }
});

test('the blog sitemap uses /blog and does not expose /blog/index', () => {
  const urls = new Set(sitemap().map(entry => entry.url));

  assert(urls.has(`${BASE_URL}/blog`));
  assert(!urls.has(`${BASE_URL}/blog/index`));
});
