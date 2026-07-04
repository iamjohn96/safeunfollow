import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { runGrowthReport } from './growth-report';
import type { GrowthPaths } from './growth-report';
import type { SearchConsoleData } from './search-console-report';

function fixtures(): { root: string; paths: GrowthPaths } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'safeunfollow-growth-'));
  const paths: GrowthPaths = {
    currentMarkdown: path.join(root, 'automation', 'weekly-growth-report.md'),
    currentJson: path.join(root, 'automation', 'weekly-growth-report.json'),
    historyDirectory: path.join(root, 'reports', 'weekly'),
    blogDirectory: path.join(root, 'content', 'blog'),
    pillarDirectory: path.join(root, 'content', 'pillars'),
    clusters: path.join(root, 'automation', 'topic-clusters.json'),
    keywords: path.join(root, 'automation', 'keywords.json'),
    refreshCandidates: path.join(root, 'automation', 'refresh-candidates.json'),
    researchDirectory: path.join(root, 'research'),
    briefsDirectory: path.join(root, 'automation', 'content-briefs'),
    logsDirectory: path.join(root, 'logs'),
  };
  fs.mkdirSync(paths.blogDirectory, { recursive: true });
  fs.mkdirSync(paths.pillarDirectory, { recursive: true });
  fs.mkdirSync(paths.briefsDirectory, { recursive: true });
  fs.writeFileSync(paths.clusters, JSON.stringify({
    limits: { pillar: 'limits-guide', keywords: ['instagram unfollow limit'] },
  }));
  fs.writeFileSync(paths.keywords, JSON.stringify([{
    keyword: 'instagram unfollow limit',
    slug: 'limit-post',
    published: true,
    cluster: 'limits',
    impressions: 100,
    clicks: 1,
  }]));
  fs.writeFileSync(paths.refreshCandidates, JSON.stringify({ candidates: [{ slug: 'limit-post' }] }));
  fs.writeFileSync(path.join(paths.blogDirectory, 'limit-post.md'), [
    '---',
    'title: Limit Post',
    'slug: limit-post',
    'cluster: limits',
    'date: 2026-07-02T00:00:00.000Z',
    "updated: '2026-07-03'",
    '---',
    '',
    'No internal links yet.',
  ].join('\n'));
  fs.writeFileSync(path.join(paths.pillarDirectory, 'limits-guide.md'), [
    '---',
    'title: Limits Guide',
    'slug: limits-guide',
    'cluster: limits',
    'date: 2026-06-01T00:00:00.000Z',
    '---',
    '',
    '[Limit post](/blog/limit-post)',
  ].join('\n'));
  fs.writeFileSync(path.join(paths.briefsDirectory, 'limit.md'), [
    '# Content Brief',
    '',
    'Generated: 2026-07-03T12:00:00.000Z',
  ].join('\n'));
  return { root, paths };
}

function searchData(): SearchConsoleData {
  return {
    summary: { clicks: 109, impressions: 1180, ctr: 0.018, position: 11.2 },
    queries: [{
      keys: ['instagram unfollow limit'],
      clicks: 9,
      impressions: 500,
      ctr: 0.018,
      position: 12,
    }],
    pages: [],
    queryPages: [],
  };
}

test('growth report writes current JSON, Markdown, history, deltas, and rule recommendations', async t => {
  const { root, paths } = fixtures();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(paths.currentJson, JSON.stringify({
    searchConsole: {
      metrics: {
        clicks: { current: 100 },
        impressions: { current: 1000 },
        ctr: { current: 0.015 },
        position: { current: 12 },
      },
    },
  }));

  const report = await runGrowthReport('report', {
    paths,
    now: new Date('2026-07-04T01:00:00.000Z'),
    collectSearchConsole: async () => ({
      range: { startDate: '2026-06-06', endDate: '2026-07-03', label: 'Last 28 days' },
      data: searchData(),
    }),
    collectRedisHealth: async () => ({ healthy: true, latencyMs: 12 }),
    logger: { log: () => undefined, warn: () => undefined },
  });

  assert.equal(report.week, '2026-27');
  assert.equal(report.searchConsole.metrics.impressions.percentChange, 0.18);
  assert.equal(report.searchConsole.metrics.clicks.percentChange, 0.09);
  assert.deepEqual(report.content, { newArticles: 1, evergreenRefreshes: 1, researchBriefs: 1 });
  assert.equal(report.contentHealth.orphanPages, 1);
  assert.match(report.recommendations.map(item => item.rule).join(' '), /Overall CTR < 2%/);
  assert.match(report.recommendations.map(item => item.rule).join(' '), /Orphan pages detected/);
  assert.equal(fs.existsSync(paths.currentJson), true);
  assert.equal(fs.existsSync(paths.currentMarkdown), true);
  assert.equal(fs.existsSync(path.join(paths.historyDirectory, '2026-27.md')), true);
  assert.match(fs.readFileSync(paths.currentMarkdown, 'utf8'), /\| Impressions \| 1180 \| 1000 \| \+180 \(\+18\.0%\) \|/);
  assert.match(fs.readFileSync(paths.currentMarkdown, 'utf8'), /New subscriptions: Not Available/);
});

test('growth weekly sends a concise Telegram summary after writing the report', async t => {
  const { root, paths } = fixtures();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  let telegram = '';

  await runGrowthReport('weekly', {
    paths,
    now: new Date('2026-07-04T01:00:00.000Z'),
    collectSearchConsole: async () => ({
      range: { startDate: '2026-06-06', endDate: '2026-07-03', label: 'Last 28 days' },
      data: searchData(),
    }),
    collectRedisHealth: async () => ({ healthy: true }),
    sendTelegramMessage: async message => { telegram = message; },
    logger: { log: () => undefined, warn: () => undefined },
  });

  assert.match(telegram, /📈 SafeUnfollow Weekly Report/);
  assert.match(telegram, /CTR\n1\.8%/);
  assert.match(telegram, /Top Opportunity\ninstagram unfollow limit/);
  assert.equal(fs.existsSync(paths.currentJson), true);
});

test('Search Console failure still creates a partial report with explicit health status', async t => {
  const { root, paths } = fixtures();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const report = await runGrowthReport('report', {
    paths,
    now: new Date('2026-07-04T01:00:00.000Z'),
    collectSearchConsole: async () => { throw new Error('mock credentials unavailable'); },
    collectRedisHealth: async () => ({ healthy: false, reason: 'mock Redis unavailable' }),
    logger: { log: () => undefined, warn: () => undefined },
  });

  assert.equal(report.searchConsole.available, false);
  assert.equal(report.searchConsole.metrics.clicks.current, null);
  assert.equal(report.systemHealth.find(item => item.component === 'Search Console')?.level, 'unhealthy');
  assert.equal(report.systemHealth.find(item => item.component === 'Redis')?.level, 'unhealthy');
  assert.match(fs.readFileSync(paths.currentMarkdown, 'utf8'), /Status: Not Available — mock credentials unavailable/);
});
