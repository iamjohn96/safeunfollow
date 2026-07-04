import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import matter from 'gray-matter';
import { checkRedisHealth } from './redis-monitor';
import {
  createQueryExecutor,
  fetchSearchConsoleData,
  getDateRange,
  sendTelegram,
} from './search-console-report';
import type { DateRange, SearchConsoleData, SearchConsoleRow } from './search-console-report';
import { detectOrphans, loadArticles } from './topic-clusters';
import type { ClusterKeywordEntry, TopicClusters } from './topic-clusters';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

type HealthLevel = 'healthy' | 'warning' | 'unhealthy';
type MetricName = 'clicks' | 'impressions' | 'ctr' | 'position';

interface GrowthPaths {
  currentMarkdown: string;
  currentJson: string;
  historyDirectory: string;
  blogDirectory: string;
  pillarDirectory: string;
  clusters: string;
  keywords: string;
  refreshCandidates: string;
  researchDirectory: string;
  briefsDirectory: string;
  logsDirectory: string;
}

interface MetricComparison {
  current: number | null;
  previous: number | null;
  delta: number | null;
  percentChange: number | null;
}

interface Opportunity {
  keyword: string;
  impressions: number;
  position: number;
  ctr: number;
  recommendation: string;
}

interface ContentSummary {
  newArticles: number;
  evergreenRefreshes: number;
  researchBriefs: number;
}

interface ContentHealth {
  publishedArticles: number;
  topicClusters: number;
  pillars: number;
  orphanPages: number;
  evergreenCandidates: number;
}

interface PremiumSummary {
  newSubscriptions: number | null;
  renewals: number | null;
  cancellations: number | null;
  note: string;
}

interface SystemHealthItem {
  component: 'Cron' | 'Redis' | 'Research' | 'Publish' | 'Search Console';
  level: HealthLevel;
  detail: string;
}

interface RuleRecommendation {
  rule: string;
  action: string;
}

interface GrowthReport {
  schemaVersion: 1;
  generatedAt: string;
  week: string;
  weeklyWindow: { start: string; end: string };
  searchConsole: {
    available: boolean;
    range: DateRange;
    error: string | null;
    metrics: Record<MetricName, MetricComparison>;
  };
  content: ContentSummary;
  topOpportunities: Opportunity[];
  contentHealth: ContentHealth;
  premium: PremiumSummary;
  systemHealth: SystemHealthItem[];
  recommendations: RuleRecommendation[];
}

interface GrowthDependencies {
  paths?: Partial<GrowthPaths>;
  now?: Date;
  collectSearchConsole?: () => Promise<{ range: DateRange; data: SearchConsoleData }>;
  collectRedisHealth?: () => Promise<{ healthy: boolean; reason?: string; latencyMs?: number }>;
  sendTelegramMessage?: (message: string) => Promise<void>;
  logger?: Pick<Console, 'log' | 'warn'>;
}

const DEFAULT_PATHS: GrowthPaths = {
  currentMarkdown: path.join('automation', 'weekly-growth-report.md'),
  currentJson: path.join('automation', 'weekly-growth-report.json'),
  historyDirectory: path.join('reports', 'weekly'),
  blogDirectory: path.join('content', 'blog'),
  pillarDirectory: path.join('content', 'pillars'),
  clusters: path.join('automation', 'topic-clusters.json'),
  keywords: path.join('automation', 'keywords.json'),
  refreshCandidates: path.join('automation', 'refresh-candidates.json'),
  researchDirectory: 'research',
  briefsDirectory: path.join('automation', 'content-briefs'),
  logsDirectory: path.join(os.homedir(), '.hermes', 'logs', 'safeunfollow'),
};

function resolvePaths(overrides: Partial<GrowthPaths> = {}): GrowthPaths {
  return { ...DEFAULT_PATHS, ...overrides };
}

function isoWeekKey(date: Date): string {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((target.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${target.getUTCFullYear()}-${String(week).padStart(2, '0')}`;
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function summarizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, ' ').trim().slice(0, 500) || 'Unknown error';
}

function readJson<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

function writeAtomic(filePath: string, contents: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temporary, contents, 'utf8');
  fs.renameSync(temporary, filePath);
}

function withinWindow(value: unknown, start: Date, end: Date): boolean {
  const timestamp = value instanceof Date ? value.getTime() : typeof value === 'string' ? Date.parse(value) : Number.NaN;
  return Number.isFinite(timestamp) && timestamp >= start.getTime() && timestamp <= end.getTime();
}

function markdownFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory)
    .filter(name => name.endsWith('.md') && name !== 'index.md')
    .map(name => path.join(directory, name));
}

function countWeeklyArticleDates(files: string[], field: 'date' | 'updated', start: Date, end: Date): number {
  return files.filter(file => {
    try {
      return withinWindow(matter(fs.readFileSync(file, 'utf8')).data[field], start, end);
    } catch {
      return false;
    }
  }).length;
}

function countWeeklyBriefs(directory: string, start: Date, end: Date): number {
  return markdownFiles(directory).filter(file => {
    try {
      const source = fs.readFileSync(file, 'utf8');
      const generated = source.match(/^Generated:\s*(.+)$/m)?.[1]?.trim();
      return withinWindow(generated, start, end);
    } catch {
      return false;
    }
  }).length;
}

function countEvergreenCandidates(filePath: string): number {
  const parsed = readJson<{ candidates?: unknown[] }>(filePath, {});
  return Array.isArray(parsed.candidates) ? parsed.candidates.length : 0;
}

function collectContent(paths: GrowthPaths, start: Date, end: Date): {
  summary: ContentSummary;
  health: ContentHealth;
  orphanSlugs: string[];
} {
  const blogFiles = markdownFiles(paths.blogDirectory);
  const pillarFiles = markdownFiles(paths.pillarDirectory);
  const clusters = readJson<TopicClusters>(paths.clusters, {});
  const entries = readJson<ClusterKeywordEntry[]>(paths.keywords, []);
  const articles = loadArticles(paths.blogDirectory, paths.pillarDirectory, entries, clusters);
  const orphans = detectOrphans(articles, clusters);

  return {
    summary: {
      newArticles: countWeeklyArticleDates(blogFiles, 'date', start, end),
      evergreenRefreshes: countWeeklyArticleDates(blogFiles, 'updated', start, end),
      researchBriefs: countWeeklyBriefs(paths.briefsDirectory, start, end),
    },
    health: {
      publishedArticles: blogFiles.length,
      topicClusters: Object.keys(clusters).length,
      pillars: pillarFiles.length,
      orphanPages: orphans.length,
      evergreenCandidates: countEvergreenCandidates(paths.refreshCandidates),
    },
    orphanSlugs: orphans.map(item => item.slug),
  };
}

function compareMetric(current: number | null, previous: number | null): MetricComparison {
  if (current === null || previous === null) {
    return { current, previous, delta: null, percentChange: null };
  }
  const delta = current - previous;
  const percentChange = previous === 0 ? (current === 0 ? 0 : null) : delta / Math.abs(previous);
  return { current, previous, delta, percentChange };
}

function previousMetrics(filePath: string): Partial<Record<MetricName, number | null>> {
  const previous = readJson<Partial<GrowthReport> | null>(filePath, null);
  return previous?.searchConsole?.metrics
    ? Object.fromEntries(Object.entries(previous.searchConsole.metrics).map(([name, value]) => [
        name,
        value.current ?? value.previous,
      ]))
    : {};
}

function recommendationFor(row: SearchConsoleRow): string {
  const actions: string[] = [];
  if (row.ctr < 0.02) actions.push('Improve title and description');
  if (row.position >= 8 && row.position <= 20) actions.push('Refresh or expand the matching content');
  if (row.position > 20) actions.push('Strengthen topical coverage and internal links');
  return actions.join('; ') || 'Protect ranking and monitor CTR';
}

function topOpportunities(rows: SearchConsoleRow[]): Opportunity[] {
  return rows
    .filter(row => Boolean(row.keys[0]) && row.impressions > 0 && (row.ctr < 0.02 || row.position >= 8))
    .map(row => ({
      keyword: row.keys[0],
      impressions: row.impressions,
      position: row.position,
      ctr: row.ctr,
      recommendation: recommendationFor(row),
    }))
    .sort((a, b) => {
      const score = (item: Opportunity) =>
        item.impressions * (item.ctr < 0.02 ? 2 : 1) * (item.position >= 8 && item.position <= 20 ? 1.5 : 1);
      return score(b) - score(a) || a.position - b.position;
    })
    .slice(0, 5);
}

function latestTimestamp(filePath: string): { timestamp: number; status?: string } | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n').reverse();
    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as { timestamp?: string; status?: string };
        const timestamp = Date.parse(entry.timestamp || '');
        if (Number.isFinite(timestamp)) return { timestamp, status: entry.status };
      } catch { /* Ignore non-JSON cron output. */ }
    }
    return { timestamp: fs.statSync(filePath).mtimeMs };
  } catch {
    return null;
  }
}

function recent(timestamp: number, now: Date, days = 8): boolean {
  return timestamp <= now.getTime() && timestamp >= now.getTime() - days * 86_400_000;
}

function collectArtifactTimestamps(directory: string): number[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory).filter(name => name.endsWith('.json')).flatMap(name => {
    const artifact = readJson<{ generatedAt?: string } | null>(path.join(directory, name), null);
    const timestamp = Date.parse(artifact?.generatedAt || '');
    return Number.isFinite(timestamp) ? [timestamp] : [];
  });
}

function collectOperationalHealth(
  paths: GrowthPaths,
  now: Date,
  content: ContentSummary,
  searchConsoleError: string | null,
  redis: { healthy: boolean; reason?: string; latencyMs?: number },
): SystemHealthItem[] {
  const knownLogs = ['growth.log', 'publish.log', 'search-console.log', 'cluster.log', 'redis-monitor.log']
    .map(name => latestTimestamp(path.join(paths.logsDirectory, name)))
    .filter((entry): entry is { timestamp: number; status?: string } => entry !== null);
  const latestAutomation = knownLogs.sort((a, b) => b.timestamp - a.timestamp)[0];
  const publish = latestTimestamp(path.join(paths.logsDirectory, 'publish.log'));
  const researchTimestamps = collectArtifactTimestamps(paths.researchDirectory);
  const latestResearch = researchTimestamps.length ? Math.max(...researchTimestamps) : null;

  return [
    {
      component: 'Cron',
      level: latestAutomation && recent(latestAutomation.timestamp, now) ? 'healthy' : 'warning',
      detail: latestAutomation && recent(latestAutomation.timestamp, now)
        ? `Recent automation activity: ${new Date(latestAutomation.timestamp).toISOString()}`
        : 'No automation log activity found in the last 8 days; cron registration is not directly verified.',
    },
    {
      component: 'Redis',
      level: redis.healthy ? 'healthy' : 'unhealthy',
      detail: redis.healthy ? `PING succeeded${redis.latencyMs === undefined ? '' : ` in ${redis.latencyMs} ms`}.` : (redis.reason || 'PING failed.'),
    },
    {
      component: 'Research',
      level: content.researchBriefs > 0 || (latestResearch !== null && recent(latestResearch, now)) ? 'healthy' : 'warning',
      detail: content.researchBriefs > 0
        ? `${content.researchBriefs} research brief(s) generated this week.`
        : 'No recent research artifact or brief found.',
    },
    {
      component: 'Publish',
      level: content.newArticles > 0 || (publish && recent(publish.timestamp, now) && publish.status !== 'failure')
        ? 'healthy'
        : publish && recent(publish.timestamp, now) && publish.status === 'failure' ? 'unhealthy' : 'warning',
      detail: content.newArticles > 0
        ? `${content.newArticles} article(s) published this week.`
        : publish && recent(publish.timestamp, now) ? `Latest publish status: ${publish.status || 'recorded'}.` : 'No recent publish result found.',
    },
    {
      component: 'Search Console',
      level: searchConsoleError ? 'unhealthy' : 'healthy',
      detail: searchConsoleError || 'Metrics loaded successfully.',
    },
  ];
}

function buildRecommendations(
  metrics: Record<MetricName, MetricComparison>,
  opportunities: Opportunity[],
  health: ContentHealth,
): RuleRecommendation[] {
  const recommendations: RuleRecommendation[] = [];
  if ((metrics.impressions.current ?? 0) > 0 && (metrics.ctr.current ?? 1) < 0.02) {
    recommendations.push({ rule: 'Overall CTR < 2%', action: 'Improve titles and meta descriptions on high-impression pages.' });
  }
  const refresh = opportunities.find(item => item.position >= 8 && item.position <= 20);
  if (refresh) {
    recommendations.push({ rule: 'Keyword position is 8–20', action: `Refresh content targeting “${refresh.keyword}”.` });
  }
  if (health.orphanPages > 0) {
    recommendations.push({ rule: 'Orphan pages detected', action: 'Add contextual links from pillars and related high-impression articles.' });
  }
  if (health.evergreenCandidates > 0) {
    recommendations.push({ rule: 'Evergreen candidates available', action: 'Review the highest-ranked Evergreen candidate before the next publish cycle.' });
  }
  return recommendations.length ? recommendations : [{
    rule: 'No growth risk threshold triggered',
    action: 'Maintain the current cadence and review next week’s deltas.',
  }];
}

async function defaultSearchConsoleCollection(): Promise<{ range: DateRange; data: SearchConsoleData }> {
  const range = getDateRange();
  const executor = await createQueryExecutor();
  return { range, data: await fetchSearchConsoleData(executor, range) };
}

async function defaultRedisCollection(): Promise<{ healthy: boolean; reason?: string; latencyMs?: number }> {
  return checkRedisHealth(process.env);
}

function emptySearchConsoleData(): SearchConsoleData {
  return {
    summary: { clicks: 0, impressions: 0, ctr: 0, position: null },
    queries: [],
    pages: [],
    queryPages: [],
  };
}

async function buildGrowthReport(dependencies: GrowthDependencies = {}): Promise<GrowthReport> {
  const paths = resolvePaths(dependencies.paths);
  const now = dependencies.now ?? new Date();
  const windowEnd = new Date(now);
  const windowStart = new Date(now.getTime() - 7 * 86_400_000);
  const previous = previousMetrics(paths.currentJson);
  let range = getDateRange(now);
  let data = emptySearchConsoleData();
  let searchConsoleError: string | null = null;

  try {
    ({ range, data } = await (dependencies.collectSearchConsole ?? defaultSearchConsoleCollection)());
  } catch (error) {
    searchConsoleError = summarizeError(error);
  }

  const content = collectContent(paths, windowStart, windowEnd);
  const redis = await (dependencies.collectRedisHealth ?? defaultRedisCollection)().catch(error => ({
    healthy: false,
    reason: summarizeError(error),
  }));
  const currentMetrics: Record<MetricName, number | null> = searchConsoleError ? {
    clicks: null,
    impressions: null,
    ctr: null,
    position: null,
  } : {
    clicks: data.summary.clicks,
    impressions: data.summary.impressions,
    ctr: data.summary.ctr,
    position: data.summary.position,
  };
  const metrics = Object.fromEntries(
    (Object.keys(currentMetrics) as MetricName[]).map(name => [
      name,
      compareMetric(currentMetrics[name], previous[name] ?? null),
    ]),
  ) as Record<MetricName, MetricComparison>;
  const opportunities = searchConsoleError ? [] : topOpportunities(data.queries);

  return {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    week: isoWeekKey(now),
    weeklyWindow: { start: dateOnly(windowStart), end: dateOnly(windowEnd) },
    searchConsole: {
      available: searchConsoleError === null,
      range,
      error: searchConsoleError,
      metrics,
    },
    content: content.summary,
    topOpportunities: opportunities,
    contentHealth: content.health,
    premium: {
      newSubscriptions: null,
      renewals: null,
      cancellations: null,
      note: 'Not Available — no weekly billing event ledger is available to this read-only report.',
    },
    systemHealth: collectOperationalHealth(paths, now, content.summary, searchConsoleError, redis),
    recommendations: buildRecommendations(metrics, opportunities, content.health),
  };
}

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function numberValue(value: number | null, digits = 0): string {
  return value === null ? 'Not Available' : value.toFixed(digits);
}

function metricChange(metric: MetricComparison, kind: MetricName): string {
  if (metric.delta === null) return 'Not Available';
  const sign = metric.delta > 0 ? '+' : '';
  if (kind === 'ctr') return `${sign}${(metric.delta * 100).toFixed(1)} pp`;
  if (kind === 'position') return `${sign}${metric.delta.toFixed(1)}${metric.delta < 0 ? ' (improved)' : metric.delta > 0 ? ' (declined)' : ''}`;
  const relative = metric.percentChange === null ? 'new baseline' : `${metric.percentChange >= 0 ? '+' : ''}${percent(metric.percentChange)}`;
  return `${sign}${metric.delta.toFixed(0)} (${relative})`;
}

function healthIcon(level: HealthLevel): string {
  if (level === 'healthy') return '✅';
  if (level === 'warning') return '⚠️';
  return '❌';
}

function renderGrowthMarkdown(report: GrowthReport): string {
  const metrics = report.searchConsole.metrics;
  const metricRows: Array<[string, MetricName, string, number]> = [
    ['Clicks', 'clicks', 'count', 0],
    ['Impressions', 'impressions', 'count', 0],
    ['CTR', 'ctr', 'percent', 1],
    ['Average Position', 'position', 'number', 1],
  ];
  const displayMetric = (value: number | null, format: string, digits: number) =>
    value === null ? 'Not Available' : format === 'percent' ? percent(value) : numberValue(value, digits);
  const opportunityRows = report.topOpportunities.map(item =>
    `| ${item.keyword} | ${item.impressions} | ${item.position.toFixed(1)} | ${percent(item.ctr)} | ${item.recommendation} |`,
  );

  return [
    '# SafeUnfollow Weekly Growth Report',
    '',
    `Generated: ${report.generatedAt}`,
    `Week: ${report.week}`,
    `Weekly activity window: ${report.weeklyWindow.start} to ${report.weeklyWindow.end}`,
    '',
    '## Search Console',
    '',
    `Range: ${report.searchConsole.range.startDate} to ${report.searchConsole.range.endDate}`,
    ...(report.searchConsole.error ? [`Status: Not Available — ${report.searchConsole.error}`] : []),
    '',
    '| Metric | Current | Previous Run | Change |',
    '| --- | ---: | ---: | ---: |',
    ...metricRows.map(([label, name, format, digits]) =>
      `| ${label} | ${displayMetric(metrics[name].current, format, digits)} | ${displayMetric(metrics[name].previous, format, digits)} | ${metricChange(metrics[name], name)} |`,
    ),
    '',
    '## Content This Week',
    '',
    `- New articles: ${report.content.newArticles}`,
    `- Evergreen refreshes: ${report.content.evergreenRefreshes}`,
    `- Research briefs: ${report.content.researchBriefs}`,
    '',
    '## Top Opportunities',
    '',
    '| Keyword | Impressions | Position | CTR | Recommendation |',
    '| --- | ---: | ---: | ---: | --- |',
    ...(opportunityRows.length ? opportunityRows : ['| Not Available | — | — | — | No Search Console opportunity data. |']),
    '',
    '## Content Health',
    '',
    `- Published articles: ${report.contentHealth.publishedArticles}`,
    `- Topic clusters: ${report.contentHealth.topicClusters}`,
    `- Pillars: ${report.contentHealth.pillars}`,
    `- Orphan pages: ${report.contentHealth.orphanPages}`,
    `- Evergreen candidates: ${report.contentHealth.evergreenCandidates}`,
    '',
    '## Premium',
    '',
    '- New subscriptions: Not Available',
    '- Renewals: Not Available',
    '- Cancellations: Not Available',
    `- Note: ${report.premium.note}`,
    '',
    '## System Health',
    '',
    ...report.systemHealth.map(item => `- ${healthIcon(item.level)} **${item.component}** — ${item.detail}`),
    '',
    '## Rule-Based Recommendations',
    '',
    ...report.recommendations.map(item => `- **${item.rule}** → ${item.action}`),
    '',
  ].join('\n');
}

function overallSystemHealth(items: SystemHealthItem[]): string {
  if (items.some(item => item.level === 'unhealthy')) return '❌ Unhealthy';
  if (items.some(item => item.level === 'warning')) return '⚠️ Attention';
  return '✅ Healthy';
}

function telegramDelta(metric: MetricComparison): string {
  if (metric.current === null) return 'Not Available';
  if (metric.percentChange === null) return 'New baseline';
  return `${metric.percentChange >= 0 ? '+' : ''}${percent(metric.percentChange)}`;
}

function formatGrowthTelegram(report: GrowthReport): string {
  return [
    '📈 SafeUnfollow Weekly Report',
    '',
    'Impressions', telegramDelta(report.searchConsole.metrics.impressions),
    '',
    'Clicks', telegramDelta(report.searchConsole.metrics.clicks),
    '',
    'CTR', report.searchConsole.metrics.ctr.current === null ? 'Not Available' : percent(report.searchConsole.metrics.ctr.current),
    '',
    'Top Opportunity', report.topOpportunities[0]?.keyword || 'Not Available',
    '',
    'Content', `${report.content.newArticles} new · ${report.content.evergreenRefreshes} refreshed · ${report.content.researchBriefs} briefs`,
    '',
    'System', overallSystemHealth(report.systemHealth),
  ].join('\n').slice(0, 4096);
}

async function runGrowthReport(
  mode: 'report' | 'weekly',
  dependencies: GrowthDependencies = {},
): Promise<GrowthReport> {
  const paths = resolvePaths(dependencies.paths);
  const logger = dependencies.logger ?? console;
  const report = await buildGrowthReport({ ...dependencies, paths });
  const markdown = renderGrowthMarkdown(report);

  writeAtomic(paths.currentJson, `${JSON.stringify(report, null, 2)}\n`);
  writeAtomic(paths.currentMarkdown, markdown);
  writeAtomic(path.join(paths.historyDirectory, `${report.week}.md`), markdown);
  logger.log(`Growth report written: ${paths.currentMarkdown}`);
  logger.log(`Growth report history: ${path.join(paths.historyDirectory, `${report.week}.md`)}`);

  if (mode === 'weekly') {
    await (dependencies.sendTelegramMessage ?? sendTelegram)(formatGrowthTelegram(report));
    logger.log('Growth report Telegram summary sent.');
  }

  return report;
}

async function main(): Promise<void> {
  const command = process.argv[2];
  if (command !== 'report' && command !== 'weekly') {
    throw new Error('Usage: growth-report.ts <report|weekly>');
  }
  await runGrowthReport(command);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  void main().catch((error: unknown) => {
    console.error(`Growth report failed: ${summarizeError(error)}`);
    process.exitCode = 1;
  });
}

export {
  buildGrowthReport,
  formatGrowthTelegram,
  isoWeekKey,
  renderGrowthMarkdown,
  runGrowthReport,
  topOpportunities,
};
export type { GrowthDependencies, GrowthPaths, GrowthReport, SystemHealthItem };
