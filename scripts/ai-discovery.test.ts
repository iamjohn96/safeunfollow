import assert from 'node:assert/strict';
import test from 'node:test';
import robots from '../app/robots';
import sitemap from '../app/sitemap';
import { articleStructuredData, homeStructuredData } from '../lib/structured-data';

test('AI search crawlers can discover the public site', () => {
  const config = robots();
  const rules = Array.isArray(config.rules) ? config.rules : [config.rules];
  const aiRule = rules.find(rule => Array.isArray(rule.userAgent) && rule.userAgent.includes('OAI-SearchBot'));

  assert.equal(aiRule?.allow, '/');
  assert.equal(config.sitemap, 'https://safeunfollow.com/sitemap.xml');
  assert.equal(config.host, 'https://safeunfollow.com');
});

test('localized sitemap entries cross-reference all public languages', () => {
  const portugueseHome = sitemap().find(entry => entry.url === 'https://safeunfollow.com/pt');

  assert.deepEqual(portugueseHome?.alternates?.languages, {
    en: 'https://safeunfollow.com',
    pt: 'https://safeunfollow.com/pt',
    ru: 'https://safeunfollow.com/ru',
    es: 'https://safeunfollow.com/es',
  });
});

test('structured data describes the application and canonical article', () => {
  const home = homeStructuredData('en');
  const article = articleStructuredData({
    title: 'How to Analyze Your Instagram Data Export Without Logging In',
    description: 'A factual guide.',
    date: '2026-08-26',
    slug: 'how-to-analyze-instagram-data-export',
  });

  assert.equal(home['@context'], 'https://schema.org');
  assert(home['@graph'].some(node => node['@type'] === 'WebApplication'));
  assert.equal(article.mainEntityOfPage, 'https://safeunfollow.com/blog/how-to-analyze-instagram-data-export');
});
