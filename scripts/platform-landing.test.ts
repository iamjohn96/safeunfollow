import test from 'node:test';
import assert from 'node:assert/strict';
import sitemap from '../app/sitemap';
import { localizedMetadata } from '../lib/locale-metadata';
import { landingCopy, landingRoutes, landingSeo, type LandingPlatform } from '../lib/platform-landing-copy';

const platforms: LandingPlatform[] = ['threads', 'tiktok'];
const langs = ['en', 'pt', 'ru', 'es'] as const;

test('platform landing pages are in the sitemap for every public language with alternates', () => {
  const entries = sitemap();
  for (const platform of platforms) {
    const route = landingRoutes[platform];
    for (const lang of langs) {
      const url = lang === 'en' ? `https://safeunfollow.com${route}` : `https://safeunfollow.com/${lang}${route}`;
      const entry = entries.find(e => e.url === url);
      assert.ok(entry, `missing sitemap entry ${url}`);
      assert.equal(entry.alternates?.languages?.es, `https://safeunfollow.com/es${route}`);
    }
  }
});

test('landing metadata uses the platform description and a localized canonical', () => {
  for (const platform of platforms) {
    for (const lang of langs) {
      const meta = localizedMetadata(lang, landingRoutes[platform].slice(1));
      assert.equal(meta.description, landingSeo[platform].description[lang]);
      assert.ok(String(meta.description).length <= 160, `${platform}/${lang} description too long`);
      assert.equal(meta.alternates?.canonical, lang === 'en' ? landingRoutes[platform] : `/${lang}${landingRoutes[platform]}`);
      assert.match(String(meta.title), platform === 'threads' ? /Threads/ : /TikTok/);
    }
  }
});

test('landing copy is complete in every language and avoids absolute privacy claims', () => {
  for (const platform of platforms) {
    for (const lang of langs) {
      const copy = landingCopy(platform, lang);
      assert.equal(copy.steps.length, 3);
      assert.ok(copy.faq.length >= 4);
      assert.equal(copy.features.length, 4);
      const text = JSON.stringify(copy);
      assert.doesNotMatch(text, /100\s?%|zero risk|guarantee|garant|гарант/i);
    }
  }
});

test('the blog index has its own canonical and localized descriptions (not the homepage)', () => {
  for (const lang of langs) {
    const meta = localizedMetadata(lang, 'blog');
    assert.equal(meta.alternates?.canonical, lang === 'en' ? '/blog' : `/${lang}/blog`);
    assert.ok(String(meta.description).length <= 160);
    assert.match(String(meta.description), /Instagram/);
  }
});

test('every localized page sets its own Twitter title and a 1200x630 share image', () => {
  for (const page of ['guide', 'upload', 'blog', 'threads-unfollow-checker', 'tiktok-unfollow-checker']) {
    for (const lang of langs) {
      const meta = localizedMetadata(lang, page);
      const twitter = meta.twitter as { title?: string; images?: string[] };
      assert.equal(twitter.title, meta.title, `${lang}/${page} twitter title`);
      const image = page === 'threads-unfollow-checker' ? '/og/threads.png' : page === 'tiktok-unfollow-checker' ? '/og/tiktok.png' : '/og/default.png';
      assert.deepEqual(twitter.images, [image]);
      const og = meta.openGraph as { images?: { url: string; width: number; height: number }[] };
      assert.equal(og.images?.[0].url, image);
      assert.equal(og.images?.[0].width, 1200);
    }
  }
});

test('guide and upload pages have their own descriptions, not the homepage one', () => {
  const home = localizedMetadata('en').description;
  for (const page of ['guide', 'upload']) {
    for (const lang of langs) {
      const description = String(localizedMetadata(lang, page).description);
      assert.notEqual(description, localizedMetadata(lang).description, `${lang}/${page}`);
      assert.ok(description.length <= 160, `${lang}/${page} too long`);
    }
  }
  assert.ok(home);
});
