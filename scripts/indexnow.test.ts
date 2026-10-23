import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import sitemap from '../app/sitemap';
import { INDEXNOW_HOST, INDEXNOW_KEY, INDEXNOW_KEY_LOCATION, indexNowPayloads, indexNowUrls } from '../lib/indexnow';

test('IndexNow key file is served from the site root and matches the key', () => {
  assert.match(INDEXNOW_KEY, /^[a-f0-9]{32}$/);
  const path = `public/${INDEXNOW_KEY}.txt`;
  assert(existsSync(path), `${path} is missing`);
  assert.equal(readFileSync(path, 'utf8').trim(), INDEXNOW_KEY);
  assert.equal(INDEXNOW_KEY_LOCATION, `https://safeunfollow.com/${INDEXNOW_KEY}.txt`);
});

test('IndexNow only submits https URLs on safeunfollow.com, deduplicated', () => {
  const urls = indexNowUrls([
    'https://safeunfollow.com/',
    'https://safeunfollow.com/',
    'http://safeunfollow.com/guide',
    'https://evil.example/safeunfollow.com',
    'https://www.safeunfollow.com/upload',
    'not a url',
    'https://safeunfollow.com/threads-unfollow-checker',
  ]);
  assert.deepEqual(urls, ['https://safeunfollow.com/', 'https://safeunfollow.com/threads-unfollow-checker']);
});

test('IndexNow payload covers every sitemap URL with host, key, and keyLocation', () => {
  const sitemapUrls = sitemap().map(entry => entry.url);
  const payloads = indexNowPayloads(sitemapUrls);
  assert.equal(payloads.length, 1);
  const [payload] = payloads;
  assert.equal(payload.host, INDEXNOW_HOST);
  assert.equal(payload.key, INDEXNOW_KEY);
  assert.equal(payload.keyLocation, INDEXNOW_KEY_LOCATION);
  assert.equal(payload.urlList.length, new Set(sitemapUrls).size);
});

test('IndexNow splits more than 10,000 URLs into multiple requests', () => {
  const urls = Array.from({ length: 10001 }, (_, i) => `https://safeunfollow.com/p/${i}`);
  const payloads = indexNowPayloads(urls);
  assert.deepEqual(payloads.map(p => p.urlList.length), [10000, 1]);
});
