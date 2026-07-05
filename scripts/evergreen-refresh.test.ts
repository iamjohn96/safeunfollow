import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import matter from 'gray-matter';
import type { ArticleRecord, ClusterKeywordEntry, TopicClusters } from './topic-clusters';
import {
  applyCandidate,
  buildChangeSummary,
  buildRefreshReport,
  findOutdatedPhrases,
  formatRoadmap,
  parseFlags,
  suggestedDescription,
  suggestedTitle,
  validateRefreshedContent,
} from './evergreen-refresh';

const range = { startDate: '2026-06-01', endDate: '2026-06-28', label: 'Last 28 days' };
const clusters: TopicClusters = {
  safety: { pillar: 'safe-instagram-guide', keywords: ['instagram unfollow tracker'] },
};
const entries: ClusterKeywordEntry[] = [
  { keyword: 'instagram unfollow tracker', slug: 'tracker', published: true, cluster: 'safety' },
  { keyword: 'instagram data download', slug: 'data-download', published: true, cluster: 'safety' },
  { keyword: 'instagram privacy guide', slug: 'privacy', published: true, cluster: 'safety' },
];

function source(slug: string, title: string, links = ''): string {
  return `---
title: "${title}"
description: "Old description"
date: "2025-01-01"
slug: "${slug}"
cluster: "safety"
keywords:
  - "instagram unfollow tracker"
---

Instagram unfollow tracker advice. SafeUnfollow is privacy-first.

## How It Works

Use Instagram's data download, then upload the ZIP to SafeUnfollow. No login, no OAuth, and no Instagram API.

## FAQ

Old answer.

[Try SafeUnfollow](https://safeunfollow.com/upload)

${links}`;
}

function article(slug: string, title: string, links = ''): ArticleRecord {
  const content = source(slug, title, links);
  return {
    slug,
    title,
    cluster: 'safety',
    source: content,
    content,
    filePath: path.join('content', 'blog', `${slug}.md`),
    impressions: 0,
    clicks: 0,
    isPillar: false,
  };
}

const articles = [
  article('tracker', 'Old Tracker Title'),
  article('data-download', 'Instagram Data Download', '[Pillar](/pillars/safe-instagram-guide)'),
  article('privacy', 'Instagram Privacy Guide', '[Pillar](/pillars/safe-instagram-guide)'),
];

test('ranks a published page using Search Console, age, and link gaps', () => {
  const data = {
    summary: { clicks: 2, impressions: 100, ctr: 0.02, position: 15 },
    queries: [],
    pages: [{ keys: ['https://safeunfollow.com/blog/tracker'], clicks: 1, impressions: 100, ctr: 0.01, position: 15 }],
    queryPages: [
      { keys: ['safeunfollow', 'https://safeunfollow.com/blog/tracker'], clicks: 0, impressions: 200, ctr: 0, position: 9 },
      { keys: ['instagram unfollow tracker', 'https://safeunfollow.com/blog/tracker'], clicks: 1, impressions: 100, ctr: 0.01, position: 15 },
    ],
  };
  const report = buildRefreshReport(data, range, entries, clusters, articles, { now: new Date('2026-06-30T00:00:00Z') });
  const candidate = report.candidates.find(item => item.slug === 'tracker');

  assert(candidate);
  assert.equal(candidate.rank, 1);
  assert.equal(candidate.metrics.impressions, 100);
  assert.equal(candidate.keyword, 'instagram unfollow tracker');
  assert.equal(candidate.proposal.title, 'Instagram Unfollow Tracker: Safe, No Login');
  assert.equal(candidate.signals.searchOpportunity, true);
  assert.equal(candidate.signals.lowCtr, true);
  assert.equal(candidate.signals.stale, true);
  assert.equal(candidate.signals.missingPillarLink, true);
  assert(candidate.score > 60);
  assert.match(formatRoadmap(report), /Suggested title:/);
});

test('applies deterministic metadata, FAQ, positioning, pillar, and related links', () => {
  const data = {
    summary: { clicks: 0, impressions: 100, ctr: 0, position: 12 },
    queries: [],
    pages: [{ keys: ['https://safeunfollow.com/blog/tracker'], clicks: 0, impressions: 100, ctr: 0, position: 12 }],
    queryPages: [],
  };
  const candidate = buildRefreshReport(data, range, entries, clusters, articles, { now: new Date('2026-06-30T00:00:00Z') }).candidates[0];
  assert(candidate);
  const refreshed = applyCandidate(candidate, entries, clusters, articles, '2026-06-30');

  assert.equal(matter(refreshed).data.title, 'Instagram Unfollow Tracker: Safe, No Login');
  assert.match(matter(refreshed).data.description, /Instagram Data ZIP workflow/);
  assert.match(refreshed, /updated: ['"]2026-06-30['"]/);
  assert.match(refreshed, /AUTO:EVERGREEN_FAQ_START/);
  assert.match(refreshed, /No Account Connection/);
  assert.match(refreshed, /reduces account-access risk/);
  assert.doesNotMatch(refreshed, /Zero Ban Risk/);
  assert.match(refreshed, /\/pillars\/safe-instagram-guide/);
  assert.match(refreshed, /\/blog\/data-download/);
  assert.match(refreshed, /\/blog\/privacy/);
});

test('uses recommended articles when a cluster has too few supporting posts', () => {
  const limitsClusters: TopicClusters = {
    limits: { pillar: 'limits-guide', keywords: ['instagram unfollow limit'] },
    safety: { pillar: 'safety-guide', keywords: ['instagram privacy'] },
  };
  const limitsEntries: ClusterKeywordEntry[] = [
    { keyword: 'instagram unfollow limit', slug: 'limit', published: true, cluster: 'limits' },
    { keyword: 'instagram data download', slug: 'data-download', published: true, cluster: 'safety' },
    { keyword: 'instagram privacy guide', slug: 'privacy', published: true, cluster: 'safety' },
  ];
  const limitsArticle = { ...article('limit', 'Instagram Unfollow Limit'), cluster: 'limits' };
  const fallbackArticles = [
    limitsArticle,
    { ...articles[1], cluster: 'safety' },
    { ...articles[2], cluster: 'safety' },
  ];
  const data = {
    summary: { clicks: 0, impressions: 50, ctr: 0, position: 15 },
    queries: [],
    pages: [{ keys: ['https://safeunfollow.com/blog/limit'], clicks: 0, impressions: 50, ctr: 0, position: 15 }],
    queryPages: [],
  };
  const candidate = buildRefreshReport(data, range, limitsEntries, limitsClusters, fallbackArticles).candidates[0];
  assert(candidate);
  assert.equal(candidate.proposal.internalLinks.length, 2);
  const refreshed = applyCandidate(candidate, limitsEntries, limitsClusters, fallbackArticles, '2026-06-30');
  assert.match(refreshed, /\/blog\/data-download/);
  assert.match(refreshed, /\/blog\/privacy/);
});

test('canonicalizes legacy pillar routes and remains idempotent', () => {
  const legacy = source('tracker', 'Old Tracker Title', '[Pillar](/blog/safe-instagram-guide)');
  const legacyArticles = [{ ...articles[0], source: legacy, content: matter(legacy).content }, ...articles.slice(1)];
  const data = {
    summary: { clicks: 0, impressions: 100, ctr: 0, position: 12 },
    queries: [],
    pages: [{ keys: ['https://safeunfollow.com/blog/tracker'], clicks: 0, impressions: 100, ctr: 0, position: 12 }],
    queryPages: [],
  };
  const candidate = buildRefreshReport(data, range, entries, clusters, legacyArticles).candidates[0];
  assert(candidate);
  const refreshed = applyCandidate(candidate, entries, clusters, legacyArticles, '2026-06-30');
  assert.doesNotMatch(refreshed, /\/blog\/safe-instagram-guide/);
  assert.match(refreshed, /\/pillars\/safe-instagram-guide/);

  const refreshedArticle = {
    ...legacyArticles[0],
    title: candidate.proposal.title,
    source: refreshed,
    content: matter(refreshed).content,
  };
  const refreshedArticles = [refreshedArticle, ...legacyArticles.slice(1)];
  const secondPass = applyCandidate(candidate, entries, clusters, refreshedArticles, '2026-06-30');
  assert.equal(secondPass, refreshed);
  assert.equal((secondPass.match(/Does SafeUnfollow connect to my Instagram account\?/g) || []).length, 1);
  const summary = buildChangeSummary(candidate, refreshedArticle.filePath, refreshed, secondPass, clusters);
  assert.equal(summary.changed, false);
  assert.match(summary.summary, /NO-OP/);
});

test('detects and replaces content-policy hazards during apply', () => {
  const hazardous = source('tracker', 'Old', [
    'Profile → Settings → Security → Download Data. Connect your Instagram account.',
    'This file can take up to 48\u202fhours to become available.',
    '- Unzip it on your computer.',
    '- Locate the `followers_1.json` file and upload the JSON file.',
  ].join('\n'));
  const hazardousArticles = [{ ...articles[0], source: hazardous, content: hazardous }, ...articles.slice(1)];
  const data = {
    summary: { clicks: 0, impressions: 20, ctr: 0, position: 10 },
    queries: [],
    pages: [{ keys: ['https://safeunfollow.com/blog/tracker'], clicks: 0, impressions: 20, ctr: 0, position: 10 }],
    queryPages: [],
  };
  const candidate = buildRefreshReport(data, range, entries, clusters, hazardousArticles, { now: new Date('2026-06-30T00:00:00Z') }).candidates[0];
  assert(candidate);
  assert.deepEqual(findOutdatedPhrases(hazardous), [
    'legacy Settings > Security data-download path',
    'fixed 48-hour export promise',
    'legacy extracted JSON upload instruction',
  ]);
  const refreshed = applyCandidate(candidate, entries, clusters, hazardousArticles, '2026-06-30');
  assert.doesNotMatch(refreshed, /connect your Instagram account/i);
  assert.doesNotMatch(refreshed, /Settings → Security → Download Data/i);
  assert.doesNotMatch(refreshed, /48[\s\u00a0\u202f-]*hours?/i);
  assert.doesNotMatch(refreshed, /followers_1\.json|upload the JSON file/i);
  assert.throws(
    () => validateRefreshedContent(`${refreshed}\n30 scans/month`, candidate, entries, clusters, hazardousArticles),
    /Banned phrase: 30 scans\/month/,
  );
});

test('parses safe plan and apply flags', () => {
  assert.deepEqual(parseFlags(['plan']), { command: 'plan', dryRun: false, limit: 1 });
  assert.deepEqual(parseFlags(['plan', '--dry-run']), { command: 'plan', dryRun: true, limit: 1 });
  assert.deepEqual(parseFlags(['apply', '--dry-run', '--limit=2']), { command: 'apply', dryRun: true, limit: 2 });
  assert.throws(() => parseFlags(['apply', '--limit=0']), /positive integer/);
  assert.throws(() => parseFlags(['plan', '--limit=2']), /only valid for apply/);
});

test('keeps generated meta descriptions within the search snippet limit', () => {
  assert(suggestedDescription('an extremely long keyword '.repeat(20)).length <= 160);
  assert.match(suggestedDescription('how many people can i unfollow on instagram'), /Instagram unfollow limits/);
  assert.equal(
    suggestedTitle('how many people can i unfollow on instagram'),
    'Instagram Unfollow Limit: How Many Can You Safely Unfollow?',
  );
  assert.equal(
    suggestedTitle('is who unfollowed me safe'),
    'Who Unfollowed Me Checker: Safe, No Login or OAuth',
  );
});
