import assert from 'node:assert/strict';
import test from 'node:test';
import robots from '../app/robots';
import sitemap from '../app/sitemap';
import { articleStructuredData, homeStructuredData, faqStructuredData, howToStructuredData } from '../lib/structured-data';
import { LIFETIME_PRICE_USD } from '../utils/premium-offer';
import { existsSync, readFileSync } from 'node:fs';

type SchemaNode = {
  '@type'?: string;
  '@id'?: string;
  url?: string;
  logo?: { url?: string };
  offers?: { price?: string; priceCurrency?: string; url?: string };
  parentOrganization?: { url?: string };
  contactPoint?: { email?: string };
  publisher?: { '@id'?: string };
};

test('AI search crawlers can discover the public site', () => {
  const config = robots();
  const rules = Array.isArray(config.rules) ? config.rules : [config.rules];
  const aiRule = rules.find(rule => Array.isArray(rule.userAgent) && rule.userAgent.includes('OAI-SearchBot'));

  assert.equal(aiRule?.allow, '/');
  assert.equal(config.sitemap, 'https://safeunfollow.com/sitemap.xml');
  assert.equal(config.host, 'https://safeunfollow.com');
});

test('named assistant crawlers (Claude, GPT, Perplexity, Google AI) are explicitly allowed', () => {
  const config = robots();
  const rules = Array.isArray(config.rules) ? config.rules : [config.rules];
  const aiRule = rules.find(rule => Array.isArray(rule.userAgent) && rule.userAgent.includes('OAI-SearchBot'));
  const named = ['ClaudeBot', 'Claude-User', 'GPTBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended'];

  for (const agent of named) assert(aiRule?.userAgent?.includes(agent), `missing ${agent}`);
  assert.equal(aiRule?.allow, '/');
});

test('llms.txt exists at the site root and states no-login, pricing, and key pages as fact', () => {
  const path = 'public/llms.txt';
  assert(existsSync(path), 'public/llms.txt is missing');
  const text = readFileSync(path, 'utf8');

  assert.match(text, /No login/);
  assert.match(text, new RegExp(`US\\$${LIFETIME_PRICE_USD.replace('.', '\\.')}`));
  assert.match(text, /https:\/\/safeunfollow\.com\/guide/);
  assert.match(text, /https:\/\/safeunfollow\.com\/privacy/);
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

test('the WebApplication schema states the real Lifetime Access price, not a stale or invented one', () => {
  const home = homeStructuredData('en');
  const app = (home['@graph'] as unknown as SchemaNode[]).find(node => node['@type'] === 'WebApplication');

  assert.equal(app?.offers?.price, LIFETIME_PRICE_USD);
  assert.equal(app?.offers?.priceCurrency, 'USD');
  assert.equal(app?.offers?.url, 'https://safeunfollow.com/upload');
});

test('a pillar article uses the /pillars/ path instead of /blog/', () => {
  const pillar = articleStructuredData({
    title: 'Instagram Ghost Followers Guide',
    description: 'A complete guide.',
    date: '2026-07-01',
    slug: 'instagram-ghost-followers-guide-complete',
  }, '/pillars/');

  assert.equal(pillar.mainEntityOfPage, 'https://safeunfollow.com/pillars/instagram-ghost-followers-guide-complete');
  assert.equal(pillar.url, 'https://safeunfollow.com/pillars/instagram-ghost-followers-guide-complete');
});

test('FAQPage schema mirrors only the FAQs actually rendered on the page', () => {
  const faqs = [
    { q: 'Does SafeUnfollow need my Instagram password?', a: 'No, it only reads your official data export.' },
    { q: 'Is this a subscription?', a: 'No, Lifetime Access is a one-time purchase.' },
  ];
  const schema = faqStructuredData(faqs);

  assert.equal(schema['@type'], 'FAQPage');
  assert.equal(schema.mainEntity.length, 2);
  assert.equal(schema.mainEntity[0].name, faqs[0].q);
  assert.equal(schema.mainEntity[0].acceptedAnswer.text, faqs[0].a);
});

test('HowTo schema numbers steps in order starting at 1', () => {
  const schema = howToStructuredData({
    name: 'How to download your Instagram Data ZIP',
    description: 'Five steps to request and upload your export.',
    url: 'https://safeunfollow.com/guide',
    steps: [
      { title: 'Open Accounts Center', desc: 'Go to your Instagram settings.' },
      { title: 'Request your data', desc: 'Choose Followers and following, All time, JSON.' },
    ],
  });

  assert.equal(schema['@type'], 'HowTo');
  assert.equal(schema.step[0].position, 1);
  assert.equal(schema.step[1].position, 2);
  assert.equal(schema.step[1].name, 'Request your data');
});

test('homepage graph declares the SafeUnfollow organization with logo and JonnyLab as parent', () => {
  const data = homeStructuredData('en');
  const graph = data['@graph'] as unknown as SchemaNode[];
  const org = graph.find(node => node['@type'] === 'Organization');
  assert.equal(org?.['@id'], 'https://safeunfollow.com/#organization');
  assert.equal(org?.url, 'https://safeunfollow.com');
  assert.equal(org?.logo?.url, 'https://safeunfollow.com/safeunfollow-app-icon.png');
  assert(existsSync('public/safeunfollow-app-icon.png'));
  assert.equal(org?.parentOrganization?.url, 'https://jonnylab.app');
  assert.equal(org?.contactPoint?.email, 'support@jonnylab.app');

  const site = graph.find(node => node['@type'] === 'WebSite');
  const app = graph.find(node => node['@type'] === 'WebApplication');
  assert.equal(site?.publisher?.['@id'], org?.['@id']);
  assert.equal(app?.publisher?.['@id'], org?.['@id']);
});

test('article publisher points at the organization and carries the logo', () => {
  const article = articleStructuredData({ title: 't', description: 'd', date: '2026-10-23', slug: 's' });
  assert.equal(article.publisher['@id'], 'https://safeunfollow.com/#organization');
  assert.equal(article.publisher.logo.url, 'https://safeunfollow.com/safeunfollow-app-icon.png');
});
