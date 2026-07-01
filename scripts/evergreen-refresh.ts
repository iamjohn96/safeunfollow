import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import matter from 'gray-matter';
import { CONFIG as CONTENT_CONFIG } from './generate-post';
import { acquirePublishLock } from './publish-lock';
import {
  createQueryExecutor,
  fetchSearchConsoleData,
  getDateRange,
  sendTelegram,
} from './search-console-report';
import type { DateRange, SearchConsoleData, SearchConsoleRow } from './search-console-report';
import {
  buildRelatedSection,
  loadArticles,
  parseInternalSlugs,
  upsertMarkerBlock,
} from './topic-clusters';
import type { ArticleRecord, ClusterKeywordEntry, TopicClusters } from './topic-clusters';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

interface RefreshSignals {
  searchOpportunity: boolean;
  lowCtr: boolean;
  stale: boolean;
  missingPillarLink: boolean;
  fewRelatedLinks: boolean;
  noInboundLinks: boolean;
}

interface RefreshProposal {
  title: string;
  description: string;
  faq: string[];
  internalLinks: Array<{ slug: string; title: string; url: string }>;
  pillarLink: string;
  outdatedPhrases: string[];
}

interface RefreshCandidate {
  rank: number;
  slug: string;
  keyword: string;
  cluster: string;
  file: string;
  title: string;
  publishedAt: string | null;
  ageDays: number;
  metrics: { clicks: number; impressions: number; ctr: number; position: number | null };
  score: number;
  scoreBreakdown: { search: number; ctr: number; freshness: number; links: number };
  signals: RefreshSignals;
  reasons: string[];
  proposal: RefreshProposal;
}

interface RefreshReport {
  schemaVersion: 1;
  generatedAt: string;
  range: DateRange;
  source: 'google-search-console';
  thresholds: typeof CONFIG.thresholds;
  candidates: RefreshCandidate[];
}

interface PlanOptions {
  now?: Date;
}

interface ParsedFlags {
  command: 'plan' | 'apply';
  dryRun: boolean;
  limit: number;
}

const REFRESH_START = '<!-- AUTO:EVERGREEN_REFRESH_START -->';
const REFRESH_END = '<!-- AUTO:EVERGREEN_REFRESH_END -->';
const FAQ_START = '<!-- AUTO:EVERGREEN_FAQ_START -->';
const FAQ_END = '<!-- AUTO:EVERGREEN_FAQ_END -->';

const CONFIG = {
  paths: {
    keywords: path.join('automation', 'keywords.json'),
    clusters: path.join('automation', 'topic-clusters.json'),
    blogDirectory: path.join('content', 'blog'),
    pillarDirectory: path.join('content', 'pillars'),
    candidates: path.join('automation', 'refresh-candidates.json'),
    roadmap: path.join('automation', 'refresh-roadmap.md'),
  },
  thresholds: {
    minimumImpressions: 1,
    minimumPosition: 8,
    maximumPosition: 30,
    maximumCtr: 0.02,
    staleAfterDays: 180,
    minimumRelatedLinks: 2,
    minimumScore: 20,
  },
  scoring: {
    searchMaximum: 35,
    ctrMaximum: 25,
    freshnessMaximum: 20,
    linksMaximum: 20,
  },
  ingestionTimeoutMs: 45_000,
} as const;

const OUTDATED_PATTERNS: Array<{ label: string; pattern: RegExp; replacement: string }> = [
  {
    label: 'legacy Settings > Security data-download path',
    pattern: /(?:Profile\s*[→>]\s*)?Settings\s*[→>]\s*Security\s*[→>]\s*Download Data/gi,
    replacement: "Instagram's Accounts Center data-download flow (menu labels can vary)",
  },
  {
    label: 'fixed 48-hour export promise',
    pattern: /(?:up to|within) 48\s*hours?/gi,
    replacement: 'after Instagram finishes preparing it',
  },
  {
    label: 'legacy extracted JSON upload instruction',
    pattern: /(?:extract|unzip)[^.!?\n]{0,100}(?:followers_1\.json|JSON file)[^.!?\n]*[.!?]?/gi,
    replacement: 'Keep the downloaded ZIP intact and upload the Instagram Data ZIP to SafeUnfollow.',
  },
];

const BANNED_REPLACEMENTS = new Map<string, string>([
  ['connect your Instagram account', 'grant live access to your Instagram account'],
  ['connect an Instagram account', 'grant live access to an Instagram account'],
  ['log in with Instagram', 'share Instagram credentials'],
  ['login with Instagram', 'share Instagram credentials'],
  ['sign in with Instagram', 'share Instagram credentials'],
  ['account syncing', 'live account access'],
  ['account linking', 'live account access'],
  ['30 scans/month', 'usage limits'],
  ['engagement score', 'unsupported metric'],
  ['inactive follower alerts', 'unsupported alerts'],
]);

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function pageSlug(value: string): string | null {
  try {
    const match = new URL(value).pathname.match(/^\/blog\/([^/?#]+)\/?$/);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

function daysBetween(dateValue: unknown, now: Date): number {
  const date = dateValue instanceof Date ? dateValue : new Date(String(dateValue || ''));
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86_400_000));
}

function titleCase(value: string): string {
  const connectors = new Set(['a', 'an', 'and', 'at', 'for', 'in', 'of', 'on', 'the', 'to', 'with']);
  return value.split(/\s+/).filter(Boolean).map((word, index) => {
    const lower = word.toLowerCase();
    if (lower === 'instagram') return 'Instagram';
    if (lower === 'safeunfollow') return 'SafeUnfollow';
    if (lower === 'api') return 'API';
    if (lower === 'oauth') return 'OAuth';
    if (index > 0 && connectors.has(lower)) return lower;
    return `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`;
  }).join(' ');
}

function suggestedTitle(keyword: string): string {
  const base = titleCase(keyword).replace(/\s+202[0-9]\b/g, '');
  const suffix = ': Safe, No Login';
  const maximum = 60 - suffix.length;
  const trimmed = base.length <= maximum
    ? base
    : base.slice(0, maximum + 1).replace(/\s+\S*$/, '').trimEnd();
  return `${trimmed}${suffix}`;
}

function suggestedDescription(keyword: string): string {
  const prefix = `Learn ${keyword} with a privacy-first Instagram Data ZIP workflow.`;
  const suffix = ' No Login, No OAuth, no Instagram API, and Zero Ban Risk.';
  const value = `${prefix}${suffix}`;
  return value.length <= 160 ? value : `Use SafeUnfollow's privacy-first Instagram Data ZIP workflow. No Login, No OAuth, no Instagram API, and Zero Ban Risk.`;
}

function matchingPageRow(rows: SearchConsoleRow[], slug: string): SearchConsoleRow | undefined {
  return rows.find(row => pageSlug(row.keys[0] || '') === slug);
}

function matchingQueryRows(rows: SearchConsoleRow[], slug: string): SearchConsoleRow[] {
  return rows.filter(row => pageSlug(row.keys[1] || '') === slug);
}

function aggregateMetrics(pageRow: SearchConsoleRow | undefined, queryRows: SearchConsoleRow[]) {
  if (pageRow) {
    return {
      clicks: pageRow.clicks,
      impressions: pageRow.impressions,
      ctr: pageRow.ctr,
      position: pageRow.position || null,
    };
  }
  const impressions = queryRows.reduce((sum, row) => sum + row.impressions, 0);
  const clicks = queryRows.reduce((sum, row) => sum + row.clicks, 0);
  const weightedPosition = queryRows.reduce((sum, row) => sum + row.position * row.impressions, 0);
  return {
    clicks,
    impressions,
    ctr: impressions ? clicks / impressions : 0,
    position: impressions ? weightedPosition / impressions : null,
  };
}

function countInbound(articles: ArticleRecord[]): Map<string, number> {
  const inbound = new Map(articles.filter(article => !article.isPillar).map(article => [article.slug, 0]));
  for (const article of articles) {
    for (const slug of parseInternalSlugs(article.source)) {
      if (slug !== article.slug && inbound.has(slug)) inbound.set(slug, (inbound.get(slug) || 0) + 1);
    }
  }
  return inbound;
}

function findOutdatedPhrases(source: string): string[] {
  return OUTDATED_PATTERNS
    .filter(item => new RegExp(item.pattern.source, item.pattern.flags.replace('g', '')).test(source))
    .map(item => item.label);
}

function primaryKeyword(entry: ClusterKeywordEntry | undefined, queryRows: SearchConsoleRow[], title: string): string {
  const query = [...queryRows]
    .filter(row => {
      const value = (row.keys[0] || '').toLowerCase();
      return !value.includes('safeunfollow') && /instagram|unfollow|followers?|data download/.test(value);
    })
    .sort((a, b) => b.impressions - a.impressions)[0]?.keys[0];
  return query || entry?.keyword || title;
}

function buildRefreshReport(
  data: SearchConsoleData,
  range: DateRange,
  entries: ClusterKeywordEntry[],
  clusters: TopicClusters,
  articles: ArticleRecord[],
  options: PlanOptions = {},
): RefreshReport {
  const now = options.now || new Date();
  const entriesBySlug = new Map(entries.map(entry => [entry.slug, entry]));
  const inbound = countInbound(articles);
  const candidates = articles.filter(article => !article.isPillar).flatMap(article => {
    const parsed = matter(article.source);
    const pageRow = matchingPageRow(data.pages, article.slug);
    const queryRows = matchingQueryRows(data.queryPages, article.slug);
    const metrics = aggregateMetrics(pageRow, queryRows);
    const keyword = primaryKeyword(entriesBySlug.get(article.slug), queryRows, article.title);
    const ageDays = daysBetween(parsed.data.updated || parsed.data.date, now);
    const pillar = clusters[article.cluster]?.pillar || '';
    const slugs = parseInternalSlugs(article.source);
    const relatedBlock = parsed.content.match(/^##\s+Related Articles\s*\n([\s\S]*?)(?=^##\s+|$)/im)?.[1] || '';
    const relatedCount = parseInternalSlugs(relatedBlock).filter(slug => slug !== pillar).length;
    const signals: RefreshSignals = {
      searchOpportunity: metrics.impressions >= CONFIG.thresholds.minimumImpressions && metrics.position !== null &&
        metrics.position >= CONFIG.thresholds.minimumPosition && metrics.position <= CONFIG.thresholds.maximumPosition,
      lowCtr: metrics.impressions >= CONFIG.thresholds.minimumImpressions && metrics.ctr < CONFIG.thresholds.maximumCtr,
      stale: ageDays >= CONFIG.thresholds.staleAfterDays,
      missingPillarLink: Boolean(pillar) && !slugs.includes(pillar),
      fewRelatedLinks: relatedCount < CONFIG.thresholds.minimumRelatedLinks,
      noInboundLinks: (inbound.get(article.slug) || 0) === 0,
    };
    const search = signals.searchOpportunity
      ? Math.round(CONFIG.scoring.searchMaximum * Math.min(1, Math.log10(metrics.impressions + 1) / 2))
      : 0;
    const ctr = signals.lowCtr
      ? Math.round(CONFIG.scoring.ctrMaximum * (1 - metrics.ctr / CONFIG.thresholds.maximumCtr))
      : 0;
    const freshness = signals.stale
      ? Math.round(CONFIG.scoring.freshnessMaximum * Math.min(1, ageDays / 730))
      : 0;
    const links = Math.min(CONFIG.scoring.linksMaximum,
      (signals.missingPillarLink ? 8 : 0) + (signals.fewRelatedLinks ? 7 : 0) + (signals.noInboundLinks ? 5 : 0));
    const score = search + ctr + freshness + links;
    if (score < CONFIG.thresholds.minimumScore) return [];

    const related = articles.filter(item =>
      !item.isPillar && item.slug !== article.slug && item.cluster === article.cluster,
    ).sort((a, b) => b.impressions - a.impressions || a.title.localeCompare(b.title)).slice(0, 3);
    const reasons = [
      signals.searchOpportunity ? `Average position ${metrics.position?.toFixed(1)} is in the 8–30 opportunity range.` : '',
      signals.lowCtr ? `CTR ${(metrics.ctr * 100).toFixed(1)}% is below 2.0%.` : '',
      signals.stale ? `Content is ${ageDays} days old.` : '',
      signals.missingPillarLink ? 'Cluster pillar link is missing.' : '',
      signals.fewRelatedLinks ? `Related Articles has ${relatedCount} supporting link(s).` : '',
      signals.noInboundLinks ? 'No inbound internal links were detected.' : '',
    ].filter(Boolean);
    return [{
      rank: 0,
      slug: article.slug,
      keyword,
      cluster: article.cluster,
      file: path.relative(process.cwd(), article.filePath),
      title: article.title,
      publishedAt: parsed.data.date ? String(parsed.data.date instanceof Date ? parsed.data.date.toISOString().slice(0, 10) : parsed.data.date) : null,
      ageDays,
      metrics,
      score,
      scoreBreakdown: { search, ctr, freshness, links },
      signals,
      reasons,
      proposal: {
        title: suggestedTitle(keyword),
        description: suggestedDescription(keyword),
        faq: [
          'Does SafeUnfollow connect to my Instagram account?',
          'Why does the Instagram Data ZIP workflow have Zero Ban Risk?',
        ],
        internalLinks: related.map(item => ({ slug: item.slug, title: item.title, url: `/blog/${item.slug}` })),
        pillarLink: pillar ? `/pillars/${pillar}` : '',
        outdatedPhrases: findOutdatedPhrases(article.source),
      },
    } satisfies RefreshCandidate];
  }).sort((a, b) => b.score - a.score || b.metrics.impressions - a.metrics.impressions || a.slug.localeCompare(b.slug));
  candidates.forEach((candidate, index) => { candidate.rank = index + 1; });
  return {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    range,
    source: 'google-search-console',
    thresholds: CONFIG.thresholds,
    candidates,
  };
}

function formatRoadmap(report: RefreshReport): string {
  const sections = report.candidates.map(candidate => [
    `## ${candidate.rank}. ${candidate.title}`,
    '',
    `- Slug: \`${candidate.slug}\``,
    `- Priority: **${candidate.score}/100** (search ${candidate.scoreBreakdown.search}, CTR ${candidate.scoreBreakdown.ctr}, freshness ${candidate.scoreBreakdown.freshness}, links ${candidate.scoreBreakdown.links})`,
    `- Search Console: ${candidate.metrics.impressions} impressions, ${candidate.metrics.clicks} clicks, ${(candidate.metrics.ctr * 100).toFixed(1)}% CTR, position ${candidate.metrics.position?.toFixed(1) || 'N/A'}`,
    `- Reasons: ${candidate.reasons.join(' ')}`,
    `- Suggested title: ${candidate.proposal.title}`,
    `- Suggested description: ${candidate.proposal.description}`,
    `- FAQ: ${candidate.proposal.faq.join(' / ')}`,
    `- Internal links: ${candidate.proposal.internalLinks.map(link => link.url).join(', ') || 'No same-cluster article available'}`,
    `- Pillar: ${candidate.proposal.pillarLink || 'No cluster pillar configured'}`,
    `- Outdated phrasing: ${candidate.proposal.outdatedPhrases.join(', ') || 'No deterministic match'}`,
  ].join('\n'));
  return [
    '# SafeUnfollow Evergreen Refresh Roadmap',
    '',
    `Generated: ${report.generatedAt}`,
    `Search Console period: ${report.range.startDate} to ${report.range.endDate}`,
    '',
    'The plan is content read-only. Only this roadmap and `refresh-candidates.json` are generated.',
    '',
    ...(sections.length ? sections : ['No published articles met the refresh threshold.']),
    '',
  ].join('\n');
}

function atomicWrite(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, content, 'utf8');
  fs.renameSync(temporary, filePath);
}

function generateReports(report: RefreshReport): void {
  atomicWrite(CONFIG.paths.candidates, `${JSON.stringify(report, null, 2)}\n`);
  atomicWrite(CONFIG.paths.roadmap, formatRoadmap(report));
}

function markerBlock(start: string, end: string, body: string): string {
  return `${start}\n${body.trim()}\n${end}`;
}

function upsertBlock(source: string, start: string, end: string, body: string): string {
  const block = markerBlock(start, end, body);
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end);
  if (startIndex !== -1 && endIndex > startIndex) {
    return `${source.slice(0, startIndex)}${block}${source.slice(endIndex + end.length)}`;
  }
  return `${source.trimEnd()}\n\n${block}\n`;
}

function removeOutdatedPhrasing(source: string): string {
  let next = source;
  for (const item of OUTDATED_PATTERNS) next = next.replace(item.pattern, item.replacement);
  for (const [banned, replacement] of BANNED_REPLACEMENTS) {
    next = next.replace(new RegExp(banned.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), replacement);
  }
  return next;
}

function upsertFaq(content: string): string {
  const body = [
    '### Does SafeUnfollow connect to my Instagram account?',
    '',
    'No. SafeUnfollow uses No Login, No OAuth, no Instagram API, and No Account Connection. You stay in control of the file you choose to upload.',
    '',
    '### Why is the Instagram Data ZIP workflow safer?',
    '',
    'You complete an Instagram Data Download, keep the Instagram Data ZIP intact, and upload that ZIP to SafeUnfollow. The file-based, Privacy First process has Zero Ban Risk because SafeUnfollow never performs actions on your Instagram account.',
  ].join('\n');
  const block = markerBlock(FAQ_START, FAQ_END, body);
  const start = content.indexOf(FAQ_START);
  const end = content.indexOf(FAQ_END);
  if (start !== -1 && end > start) return `${content.slice(0, start)}${block}${content.slice(end + FAQ_END.length)}`;
  const heading = /^##\s+.*(?:FAQ|Frequently Asked Questions).*$/im;
  if (heading.test(content)) return content.replace(heading, match => `${match}\n\n${block}`);
  return `${content.trimEnd()}\n\n## FAQ\n\n${block}\n`;
}

function applyCandidate(
  candidate: RefreshCandidate,
  entries: ClusterKeywordEntry[],
  clusters: TopicClusters,
  articles: ArticleRecord[],
  today: string,
): string {
  const article = articles.find(item => item.slug === candidate.slug);
  if (!article) throw new Error(`Article disappeared from cluster inventory: ${candidate.slug}`);
  const source = article.source;
  const parsed = matter(removeOutdatedPhrasing(source));
  parsed.data.title = candidate.proposal.title;
  parsed.data.description = candidate.proposal.description;
  parsed.data.updated = today;
  let content = parsed.content;
  const freshness = [
    '## Privacy-First Workflow (Current)',
    '',
    `Reviewed ${today}. SafeUnfollow requires No Login, No OAuth, no Instagram API, and No Account Connection. Complete an Instagram Data Download, keep the Instagram Data ZIP intact, then upload the ZIP to SafeUnfollow. This Privacy First, file-based workflow provides Zero Ban Risk because it never performs actions on your Instagram account.`,
  ].join('\n');
  content = upsertBlock(content, REFRESH_START, REFRESH_END, freshness);
  content = upsertFaq(content);

  const definition = clusters[candidate.cluster];
  if (!definition) throw new Error(`Unknown topic cluster: ${candidate.cluster}`);
  const refreshedArticle = { ...article, title: candidate.proposal.title, content, source: content };
  const related = buildRelatedSection(refreshedArticle, articles, definition.pillar);
  content = upsertMarkerBlock(content, related.markdown);
  const refreshed = matter.stringify(content, parsed.data);
  validateRefreshedContent(refreshed, candidate, entries, clusters, articles);
  return refreshed;
}

function validateRefreshedContent(
  source: string,
  candidate: RefreshCandidate,
  _entries: ClusterKeywordEntry[],
  clusters: TopicClusters,
  articles: ArticleRecord[],
): void {
  const parsed = matter(source);
  const errors: string[] = [];
  const lower = source.toLowerCase();
  for (const phrase of CONTENT_CONFIG.validation.bannedPhrases) {
    if (lower.includes(phrase.toLowerCase())) errors.push(`Banned phrase: ${phrase}`);
  }
  for (const requirement of CONTENT_CONFIG.validation.requiredMessages) {
    if (!requirement.pattern.test(parsed.content)) errors.push(`Missing positioning: ${requirement.label}`);
  }
  if (!/\bNo Account Connection\b/i.test(parsed.content)) errors.push('Missing positioning: No Account Connection');
  if (!/\bZero Ban Risk\b/i.test(parsed.content)) errors.push('Missing positioning: Zero Ban Risk');
  if (typeof parsed.data.description !== 'string' || parsed.data.description.length > 160) errors.push('Invalid meta description');
  const pillar = clusters[candidate.cluster]?.pillar;
  const links = parseInternalSlugs(source);
  if (!pillar || !links.includes(pillar)) errors.push('Missing cluster pillar link');
  const known = new Set([...articles.map(article => article.slug), ...Object.values(clusters).map(item => item.pillar)]);
  for (const slug of links) if (!known.has(slug)) errors.push(`Broken internal link: ${slug}`);
  if (!/^##\s+Related Articles/im.test(parsed.content)) errors.push('Missing Related Articles section');
  if (!parsed.content.includes(FAQ_START)) errors.push('Missing refreshed FAQ block');
  if (errors.length) throw new Error(`${candidate.slug} failed refresh validation: ${errors.join('; ')}`);
}

function diffSummary(before: string, after: string): string {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  let changed = 0;
  const length = Math.max(beforeLines.length, afterLines.length);
  for (let index = 0; index < length; index += 1) if (beforeLines[index] !== afterLines[index]) changed += 1;
  return `${beforeLines.length} → ${afterLines.length} lines; ${changed} line positions changed`;
}

function ensureCleanTree(): void {
  const result = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || 'Unable to inspect Git worktree');
  if (result.stdout.trim()) throw new Error(`Refusing to refresh from a dirty worktree:\n${result.stdout.trim()}`);
}

function parseFlags(args: string[]): ParsedFlags {
  const [command, ...options] = args;
  if (command !== 'plan' && command !== 'apply') throw new Error('Usage: evergreen-refresh.ts <plan|apply> [--dry-run] [--limit=N]');
  let limit = 1;
  let dryRun = false;
  for (const option of options) {
    if (option === '--dry-run') dryRun = true;
    else if (option.startsWith('--limit=')) {
      limit = Number.parseInt(option.slice('--limit='.length), 10);
      if (!Number.isInteger(limit) || limit < 1) throw new Error('--limit must be a positive integer');
    } else throw new Error(`Unknown option: ${option}`);
  }
  if (command === 'plan' && options.some(option => option.startsWith('--limit='))) throw new Error('--limit is only valid for apply');
  return { command, dryRun, limit };
}

async function plan(dryRun: boolean): Promise<RefreshReport> {
  const range = getDateRange();
  const entries = readJson<ClusterKeywordEntry[]>(CONFIG.paths.keywords);
  const clusters = readJson<TopicClusters>(CONFIG.paths.clusters);
  const articles = loadArticles(CONFIG.paths.blogDirectory, CONFIG.paths.pillarDirectory, entries, clusters);
  console.log('Authenticating with Google Search Console...');
  const executor = await withTimeout(
    createQueryExecutor(),
    CONFIG.ingestionTimeoutMs,
    'Search Console authentication',
  );
  console.log('Fetching Search Console performance data...');
  const data = await withTimeout(
    fetchSearchConsoleData(executor, range),
    CONFIG.ingestionTimeoutMs,
    'Search Console refresh ingestion',
  );
  const report = buildRefreshReport(data, range, entries, clusters, articles);
  if (!dryRun) generateReports(report);
  console.log(`${dryRun ? 'Dry-run plan' : 'Refresh plan'}: ${report.candidates.length} candidate(s).`);
  for (const candidate of report.candidates.slice(0, 10)) console.log(`${candidate.rank}. ${candidate.slug} — ${candidate.score}/100`);
  if (dryRun) console.log('No repository files were changed.');
  return report;
}

async function apply(limit: number, dryRun: boolean): Promise<void> {
  const report = readJson<RefreshReport>(CONFIG.paths.candidates);
  const selected = report.candidates.slice(0, limit);
  if (!selected.length) throw new Error('No refresh candidates are available. Run npm run refresh:plan first.');
  const entries = readJson<ClusterKeywordEntry[]>(CONFIG.paths.keywords);
  const clusters = readJson<TopicClusters>(CONFIG.paths.clusters);
  const articles = loadArticles(CONFIG.paths.blogDirectory, CONFIG.paths.pillarDirectory, entries, clusters);
  const today = new Date().toISOString().slice(0, 10);
  const changes = selected.map(candidate => {
    if (!/^[a-z0-9-]+$/.test(candidate.slug)) throw new Error(`Invalid candidate slug: ${candidate.slug}`);
    const article = articles.find(item => item.slug === candidate.slug && !item.isPillar);
    if (!article) throw new Error(`Candidate article not found: ${candidate.slug}`);
    const filePath = path.resolve(article.filePath);
    const blogRoot = `${path.resolve(CONFIG.paths.blogDirectory)}${path.sep}`;
    if (!filePath.startsWith(blogRoot)) throw new Error(`Candidate path escaped blog directory: ${candidate.slug}`);
    const before = fs.readFileSync(filePath, 'utf8');
    const after = applyCandidate(candidate, entries, clusters, articles, today);
    return { candidate, filePath, before, after, summary: diffSummary(before, after) };
  });
  console.log('Proposed refresh diff summary:');
  for (const change of changes) console.log(`- ${change.candidate.file}: ${change.summary}`);
  if (dryRun) {
    console.log('Dry run complete. No lock, repository files, Git history, network services, or notifications were changed.');
    return;
  }

  const lock = acquirePublishLock();
  try {
    ensureCleanTree();
    try {
      for (const change of changes) fs.writeFileSync(change.filePath, change.after, 'utf8');
    } catch (error) {
      for (const change of changes) fs.writeFileSync(change.filePath, change.before, 'utf8');
      throw error;
    }
    console.log('Applied refresh diff summary:');
    for (const change of changes) console.log(`- ${change.candidate.file}: ${change.summary}`);
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      await sendTelegram([
        '✅ SafeUnfollow Evergreen Refresh Applied',
        '',
        ...changes.map(change => `${change.candidate.slug}: ${change.candidate.score}/100`),
      ].join('\n'));
    } else {
      console.warn('Telegram skipped: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are not both set.');
    }
  } finally {
    lock.release();
  }
}

async function main(): Promise<void> {
  try {
    const flags = parseFlags(process.argv.slice(2));
    if (flags.command === 'plan') await plan(flags.dryRun);
    else await apply(flags.limit, flags.dryRun);
  } catch (error) {
    console.error(`Evergreen refresh failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  void main().finally(() => {
    if (process.exitCode) process.exit(process.exitCode);
  });
}

export {
  CONFIG,
  applyCandidate,
  buildRefreshReport,
  findOutdatedPhrases,
  formatRoadmap,
  generateReports,
  parseFlags,
  suggestedDescription,
  suggestedTitle,
  validateRefreshedContent,
};
export type { RefreshCandidate, RefreshReport };
