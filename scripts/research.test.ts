import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  Crawl4AIUnavailableError,
  crawlPage,
  parseRobots,
  requestWithRetry,
} from './research/crawl4ai';
import {
  ResearchLockError,
  acquireResearchLock,
  runResearch,
  selectPrioritizedKeyword,
} from './research/research';
import type { CrawlPage, SerpResearch } from './research/types';

function fixtureDirectory(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'safeunfollow-research-test-'));
}

function writeKeywords(directory: string): string {
  const file = path.join(directory, 'keywords.json');
  fs.writeFileSync(file, `${JSON.stringify([{ keyword: 'instagram unfollow limit', slug: 'instagram-unfollow-limit', cluster: 'limits' }])}\n`);
  return file;
}

function serpFixture(): SerpResearch {
  return {
    provider: 'serper',
    queriedAt: '2026-07-02T00:00:00.000Z',
    results: [{
      position: 1,
      title: 'Instagram Limits',
      url: 'https://competitor.example/limits',
      description: 'A practical description of Instagram limits.',
    }],
    peopleAlsoAsk: ['How many accounts can I unfollow per day?'],
    relatedSearches: ['instagram daily action limits'],
  };
}

function crawlFixture(): CrawlPage {
  return {
    url: 'https://competitor.example/limits',
    crawledAt: '2026-07-02T00:00:01.000Z',
    statusCode: 200,
    markdown: 'Instagram limits explained with practical pacing and account safety advice. '.repeat(150),
    html: `<!doctype html><html><head>
      <title>Instagram Limits</title>
      <meta name="description" content="A practical description of Instagram limits.">
      <link rel="canonical" href="https://competitor.example/limits">
      <script type="application/ld+json">{"@type":"Article","dateModified":"2026-06-20"}</script>
      </head><body><h1>Instagram Limits</h1><h2>Daily limits</h2><h2>How many accounts can I unfollow?</h2>
      <a href="/safety">Safety</a></body></html>`,
  };
}

test('research dry-run is repository read-only and does not call network adapters', async () => {
  const directory = fixtureDirectory();
  const researchDirectory = path.join(directory, 'research');
  let calls = 0;
  const result = await runResearch('instagram unfollow limit', {
    dryRun: true,
    paths: {
      researchDirectory,
      briefsDirectory: path.join(directory, 'briefs'),
      keywordsFile: path.join(directory, 'missing-keywords.json'),
    },
    search: async () => { calls += 1; return serpFixture(); },
    crawl: async () => { calls += 1; return crawlFixture(); },
  });

  assert.equal(result.dryRun, true);
  assert.equal(calls, 0);
  assert.equal(fs.existsSync(researchDirectory), false);
});

test('fresh keyword cache reuses artifacts without another SERP or crawl request', async () => {
  const directory = fixtureDirectory();
  let searchCalls = 0;
  let crawlCalls = 0;
  const options = {
    now: new Date('2026-07-02T00:00:00.000Z'),
    paths: {
      researchDirectory: path.join(directory, 'research'),
      briefsDirectory: path.join(directory, 'briefs'),
      keywordsFile: writeKeywords(directory),
    },
    lockDirectory: path.join(directory, 'locks'),
    search: async () => { searchCalls += 1; return serpFixture(); },
    crawl: async () => { crawlCalls += 1; return crawlFixture(); },
  };

  const first = await runResearch('instagram unfollow limit', options);
  const second = await runResearch('Instagram   Unfollow Limit', options);

  assert.equal(first.cacheHit, false);
  assert.equal(second.cacheHit, true);
  assert.equal(searchCalls, 1);
  assert.equal(crawlCalls, 1);
  assert.equal(second.artifact?.expiresAt, '2026-07-09T00:00:00.000Z');
  assert.deepEqual(first.artifact?.sources[0].headings.h2, ['Daily limits', 'How many accounts can I unfollow?']);
  assert.deepEqual(first.artifact?.sources[0].faq, ['How many accounts can I unfollow?']);
  assert.deepEqual(first.artifact?.sources[0].schema.types, ['Article']);
  assert.equal(first.artifact?.sources[0].canonical, 'https://competitor.example/limits');
  assert.deepEqual(first.artifact?.sources[0].internalLinks, ['https://competitor.example/safety']);
  assert.equal(fs.existsSync(path.join(directory, 'research', 'instagram-unfollow-limit.md')), true);
  assert.equal(fs.existsSync(path.join(directory, 'briefs', 'instagram-unfollow-limit.md')), true);
});

test('same normalized keyword cannot acquire two concurrent locks', () => {
  const directory = fixtureDirectory();
  const first = acquireResearchLock('Instagram Unfollow Limit', directory);
  try {
    assert.throws(
      () => acquireResearchLock(' instagram   unfollow limit ', directory),
      ResearchLockError,
    );
  } finally {
    first.release();
  }
  const second = acquireResearchLock('instagram unfollow limit', directory);
  second.release();
});

test('429 responses honor Retry-After and retry until success', async () => {
  const waits: number[] = [];
  let attempts = 0;
  const response = await requestWithRetry('https://crawler.example/crawl', {}, {
    fetchImpl: async () => {
      attempts += 1;
      return attempts === 1
        ? new Response('rate limited', { status: 429, headers: { 'Retry-After': '2' } })
        : new Response('ok', { status: 200 });
    },
    maxAttempts: 3,
    retryDelayMs: 100,
    sleep: async milliseconds => { waits.push(milliseconds); },
  });

  assert.equal(response.status, 200);
  assert.equal(attempts, 2);
  assert.deepEqual(waits, [2_000]);
});

test('Crawl4AI connection failures include actionable configuration guidance', async () => {
  let requests = 0;
  await assert.rejects(
    () => crawlPage('https://competitor.example/limits', {
      endpoint: 'http://127.0.0.1:11235',
      fetchImpl: async () => {
        requests += 1;
        if (requests === 1) return new Response('', { status: 200 });
        throw new TypeError('fetch failed');
      },
    }),
    (error: unknown) => error instanceof Crawl4AIUnavailableError
      && error.message.includes('CRAWL4AI_BASE_URL')
      && error.message.includes('Serper alone cannot produce evidence'),
  );
  assert.equal(requests, 2);
});

test('research stops immediately when the Crawl4AI service is unavailable', async () => {
  const directory = fixtureDirectory();
  let crawlCalls = 0;
  await assert.rejects(
    () => runResearch('instagram unfollow limit', {
      paths: {
        researchDirectory: path.join(directory, 'research'),
        briefsDirectory: path.join(directory, 'briefs'),
        keywordsFile: writeKeywords(directory),
      },
      lockDirectory: path.join(directory, 'locks'),
      search: async () => serpFixture(),
      crawl: async () => {
        crawlCalls += 1;
        throw new Crawl4AIUnavailableError('http://localhost:11235/crawl', new Error('fetch failed'));
      },
    }),
    Crawl4AIUnavailableError,
  );
  assert.equal(crawlCalls, 1);
});

test('robots parser uses the specific bot group, disallow precedence, and crawl delay', () => {
  const robots = `
    User-agent: *
    Disallow: /private
    Crawl-delay: 9
    User-agent: SafeUnfollowResearchBot
    Disallow: /research
    Allow: /research/public
    Crawl-delay: 2
  `;

  assert.deepEqual(parseRobots(robots, '/research/public/page', 'SafeUnfollowResearchBot/1.0'), {
    allowed: true,
    crawlDelayMs: 2_000,
  });
  assert.equal(parseRobots(robots, '/research/secret', 'SafeUnfollowResearchBot/1.0').allowed, false);
});

test('Search Console metrics prioritize unpublished opportunity keywords', () => {
  const selected = selectPrioritizedKeyword([
    { keyword: 'published winner', published: true, impressions: 1000, ctr: 0.01, avg_position: 8 },
    { keyword: 'weak unpublished', published: false, impressions: 2, ctr: 0.04, avg_position: 50 },
    { keyword: 'gsc opportunity', published: false, impressions: 20, ctr: 0.01, avg_position: 12 },
  ]);
  assert.equal(selected.keyword, 'gsc opportunity');
});

test('unpublished keywords always rank before already published research candidates', () => {
  const selected = selectPrioritizedKeyword([
    { keyword: 'published high volume', published: true, impressions: 100_000, ctr: 0, avg_position: 6 },
    { keyword: 'unpublished seed', published: false, impressions: 0, ctr: 0, avg_position: null },
  ]);
  assert.equal(selected.keyword, 'unpublished seed');
});
