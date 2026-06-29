import dotenv from 'dotenv';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import { GoogleAuth } from 'google-auth-library';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

type Dimension = 'query' | 'page';
type ReportStage = 'Credentials' | 'Ingestion' | 'Analysis' | 'Keyword Registry' | 'Telegram';

interface DateRange {
  startDate: string;
  endDate: string;
  label: string;
}

interface SearchConsoleRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface SummaryMetrics {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number | null;
}

interface SearchConsoleData {
  summary: SummaryMetrics;
  queries: SearchConsoleRow[];
  pages: SearchConsoleRow[];
  queryPages: SearchConsoleRow[];
}

interface KeywordEntry {
  keyword: string;
  slug: string;
  published: boolean;
  published_at: string | null;
  last_attempt: string | null;
  source?: string;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  avg_position?: number | null;
  last_seen_in_gsc?: string | null;
  discovered_at?: string;
}

interface RegistryUpdate {
  entries: KeywordEntry[];
  updatedExisting: number;
  addedKeywords: number;
}

interface SeoReport {
  range: DateRange;
  data: SearchConsoleData;
  topQueries: SearchConsoleRow[];
  topPages: SearchConsoleRow[];
  opportunities: SearchConsoleRow[];
  keywordIdeas: string[];
}

type QueryExecutor = (dimensions: Dimension[], range: DateRange) => Promise<SearchConsoleRow[]>;
type Environment = Record<string, string | undefined>;

class MissingCredentialsError extends Error {
  constructor(message = CONFIG.credentials.instructions) {
    super(message);
    this.name = 'MissingCredentialsError';
  }
}

// Search Console operational policy and all configurable values live here.
const CONFIG = {
  site: {
    url: process.env.GOOGLE_SITE_URL || 'https://safeunfollow.com/',
  },
  credentials: {
    clientEmailEnv: 'GOOGLE_CLIENT_EMAIL',
    privateKeyEnv: 'GOOGLE_PRIVATE_KEY',
    jsonEnv: 'GOOGLE_SERVICE_ACCOUNT_JSON',
    applicationCredentialsEnv: 'GOOGLE_APPLICATION_CREDENTIALS',
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    instructions: [
      'Google Search Console credentials are missing.',
      'Set GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY, or set GOOGLE_APPLICATION_CREDENTIALS to a service-account JSON file.',
      'Also set GOOGLE_SITE_URL=https://safeunfollow.com/ and grant the service-account email access to that Search Console property.',
    ].join(' '),
  },
  api: {
    baseUrl: 'https://www.googleapis.com/webmasters/v3/sites',
    rowLimit: 25_000,
    searchType: 'web',
    dataState: 'final',
  },
  reporting: {
    lookbackDays: 28,
    searchConsoleTimeZone: 'America/Los_Angeles',
    topQueryCount: 10,
    topPageCount: 10,
    telegramListCount: 5,
  },
  opportunities: {
    minimumImpressions: 20,
    maximumCtr: 0.02,
    minimumPosition: 5,
    maximumPosition: 30,
  },
  keywords: {
    registryPath: path.join('automation', 'keywords.json'),
    minimumIdeas: 5,
    maximumIdeas: 10,
    relevantPattern: /\b(?:instagram|unfollow(?:ed|ers?|ing)?|followers?|ghost followers?|data download)\b/i,
    excludedPattern: /\bsafeunfollow(?:\.com)?\b/i,
    expansionSuffixes: ['guide', 'without login', 'safely', 'step by step', 'tips'],
  },
  telegram: {
    tokenEnv: 'TELEGRAM_BOT_TOKEN',
    chatIdEnv: 'TELEGRAM_CHAT_ID',
    apiBaseUrl: 'https://api.telegram.org',
    maxMessageLength: 4096,
  },
  logging: {
    directory: path.join(os.homedir(), '.hermes', 'logs', 'safeunfollow'),
    filename: 'search-console.log',
  },
} as const;

function normalizeKeyword(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, ' ');
}

function slugify(value: string): string {
  return normalizeKeyword(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatDateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function shiftIsoDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getDateRange(now = new Date()): DateRange {
  const currentSearchConsoleDate = formatDateInTimeZone(now, CONFIG.reporting.searchConsoleTimeZone);
  const endDate = shiftIsoDate(currentSearchConsoleDate, -1);
  const startDate = shiftIsoDate(endDate, -(CONFIG.reporting.lookbackDays - 1));
  return { startDate, endDate, label: `Last ${CONFIG.reporting.lookbackDays} days` };
}

function writeLog(
  stage: ReportStage,
  status: 'success' | 'failure',
  range: DateRange,
  queryCount: number,
  pageCount: number,
  error: string | null,
): void {
  fs.mkdirSync(CONFIG.logging.directory, { recursive: true });
  const entry = {
    timestamp: new Date().toISOString(),
    stage,
    status,
    date_range: { start: range.startDate, end: range.endDate },
    number_of_queries: queryCount,
    number_of_pages: pageCount,
    errors: error ? [error] : [],
  };
  fs.appendFileSync(
    path.join(CONFIG.logging.directory, CONFIG.logging.filename),
    `${JSON.stringify(entry)}\n`,
    'utf8',
  );
}

function parseServiceAccountJson(value: string): { client_email: string; private_key: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new MissingCredentialsError(
      `${CONFIG.credentials.jsonEnv} must contain valid service-account JSON. ${CONFIG.credentials.instructions}`,
    );
  }
  if (
    typeof parsed !== 'object' || parsed === null ||
    typeof (parsed as { client_email?: unknown }).client_email !== 'string' ||
    typeof (parsed as { private_key?: unknown }).private_key !== 'string'
  ) {
    throw new MissingCredentialsError(
      `${CONFIG.credentials.jsonEnv} must include client_email and private_key.`,
    );
  }
  return parsed as { client_email: string; private_key: string };
}

function createGoogleAuth(env: Environment = process.env): GoogleAuth {
  const clientEmail = env[CONFIG.credentials.clientEmailEnv];
  const privateKey = env[CONFIG.credentials.privateKeyEnv];
  const serviceAccountJson = env[CONFIG.credentials.jsonEnv];
  const applicationCredentials = env[CONFIG.credentials.applicationCredentialsEnv];

  if (Boolean(clientEmail) !== Boolean(privateKey)) {
    throw new MissingCredentialsError(
      `${CONFIG.credentials.clientEmailEnv} and ${CONFIG.credentials.privateKeyEnv} must be set together.`,
    );
  }

  if (clientEmail && privateKey) {
    return new GoogleAuth({
      credentials: { client_email: clientEmail, private_key: privateKey.replace(/\\n/g, '\n') },
      scopes: [CONFIG.credentials.scope],
    });
  }

  if (serviceAccountJson) {
    const credentials = parseServiceAccountJson(serviceAccountJson);
    return new GoogleAuth({ credentials, scopes: [CONFIG.credentials.scope] });
  }

  if (applicationCredentials) {
    return new GoogleAuth({ keyFile: applicationCredentials, scopes: [CONFIG.credentials.scope] });
  }

  throw new MissingCredentialsError();
}

async function createQueryExecutor(env: Environment = process.env): Promise<QueryExecutor> {
  const auth = createGoogleAuth(env);
  const client = await auth.getClient();

  return async (dimensions, range) => {
    const tokenResult = await client.getAccessToken();
    const accessToken = typeof tokenResult === 'string' ? tokenResult : tokenResult.token;
    if (!accessToken) throw new Error('Google authentication returned no access token');

    const siteUrl = env.GOOGLE_SITE_URL || CONFIG.site.url;
    const endpoint = `${CONFIG.api.baseUrl}/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: range.startDate,
        endDate: range.endDate,
        dimensions,
        rowLimit: CONFIG.api.rowLimit,
        type: CONFIG.api.searchType,
        dataState: CONFIG.api.dataState,
      }),
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(`Search Console API ${response.status}: ${responseText}`);
    }

    const payload = await response.json() as { rows?: SearchConsoleRow[] };
    return (payload.rows || []).map(row => ({
      keys: Array.isArray(row.keys) ? row.keys.map(String) : [],
      clicks: Number(row.clicks || 0),
      impressions: Number(row.impressions || 0),
      ctr: Number(row.ctr || 0),
      position: Number(row.position || 0),
    }));
  };
}

async function fetchSearchConsoleData(
  executeQuery: QueryExecutor,
  range: DateRange,
): Promise<SearchConsoleData> {
  const [summaryRows, queries, pages, queryPages] = await Promise.all([
    executeQuery([], range),
    executeQuery(['query'], range),
    executeQuery(['page'], range),
    executeQuery(['query', 'page'], range),
  ]);
  const summaryRow = summaryRows[0];
  return {
    summary: summaryRow
      ? {
          clicks: summaryRow.clicks,
          impressions: summaryRow.impressions,
          ctr: summaryRow.ctr,
          position: summaryRow.position,
        }
      : { clicks: 0, impressions: 0, ctr: 0, position: null },
    queries,
    pages,
    queryPages,
  };
}

function detectOpportunities(rows: SearchConsoleRow[]): SearchConsoleRow[] {
  return rows
    .filter(row =>
      row.impressions >= CONFIG.opportunities.minimumImpressions &&
      row.ctr < CONFIG.opportunities.maximumCtr &&
      row.position >= CONFIG.opportunities.minimumPosition &&
      row.position <= CONFIG.opportunities.maximumPosition,
    )
    .sort((a, b) => b.impressions - a.impressions || a.position - b.position);
}

function addIdea(
  ideas: string[],
  seen: Set<string>,
  candidate: string,
): void {
  const normalized = normalizeKeyword(candidate);
  if (
    !normalized || seen.has(normalized) ||
    CONFIG.keywords.excludedPattern.test(normalized) ||
    !CONFIG.keywords.relevantPattern.test(normalized)
  ) return;
  seen.add(normalized);
  ideas.push(normalized);
}

function discoverKeywordIdeas(
  queryRows: SearchConsoleRow[],
  opportunities: SearchConsoleRow[],
  existingKeywords: string[],
): string[] {
  const ideas: string[] = [];
  const seen = new Set(existingKeywords.map(normalizeKeyword));
  const rankedRows = [
    ...opportunities,
    ...[...queryRows].sort((a, b) => b.impressions - a.impressions),
  ];

  for (const row of rankedRows) {
    if (ideas.length >= CONFIG.keywords.maximumIdeas) break;
    addIdea(ideas, seen, row.keys[0] || '');
  }

  const bases = [...ideas, ...rankedRows.map(row => normalizeKeyword(row.keys[0] || ''))]
    .filter(Boolean);
  for (const base of bases) {
    if (ideas.length >= CONFIG.keywords.minimumIdeas) break;
    for (const suffix of CONFIG.keywords.expansionSuffixes) {
      if (ideas.length >= CONFIG.keywords.minimumIdeas) break;
      if (!base.includes(suffix)) addIdea(ideas, seen, `${base} ${suffix}`);
    }
  }

  return ideas.slice(0, CONFIG.keywords.maximumIdeas);
}

function buildSeoReport(
  data: SearchConsoleData,
  range: DateRange,
  existingKeywords: string[],
): SeoReport {
  const opportunities = detectOpportunities(data.queries);
  return {
    range,
    data,
    topQueries: [...data.queries]
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, CONFIG.reporting.topQueryCount),
    topPages: [...data.pages]
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, CONFIG.reporting.topPageCount),
    opportunities,
    keywordIdeas: discoverKeywordIdeas(data.queries, opportunities, existingKeywords),
  };
}

function loadKeywordRegistry(): KeywordEntry[] {
  const parsed: unknown = JSON.parse(fs.readFileSync(CONFIG.keywords.registryPath, 'utf8'));
  if (!Array.isArray(parsed)) throw new Error('Keyword registry root must be an array');
  return parsed as KeywordEntry[];
}

function uniqueSlug(keyword: string, usedSlugs: Set<string>): string {
  const base = slugify(keyword) || 'search-console-keyword';
  let candidate = base;
  let suffix = 2;
  while (usedSlugs.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  usedSlugs.add(candidate);
  return candidate;
}

function updateKeywordRegistry(
  currentEntries: KeywordEntry[],
  queryRows: SearchConsoleRow[],
  newIdeas: string[],
  seenDate: string,
): RegistryUpdate {
  const queryByKeyword = new Map(
    queryRows.map(row => [normalizeKeyword(row.keys[0] || ''), row]),
  );
  let updatedExisting = 0;
  const entries: KeywordEntry[] = currentEntries.map(entry => {
    const matchingRow = queryByKeyword.get(normalizeKeyword(entry.keyword));
    updatedExisting += 1;
    return {
      ...entry,
      impressions: matchingRow?.impressions || 0,
      clicks: matchingRow?.clicks || 0,
      ctr: matchingRow?.ctr || 0,
      avg_position: matchingRow ? matchingRow.position : null,
      last_seen_in_gsc: matchingRow ? seenDate : (entry.last_seen_in_gsc || null),
    };
  });

  const knownKeywords = new Set(entries.map(entry => normalizeKeyword(entry.keyword)));
  const usedSlugs = new Set(entries.map(entry => entry.slug));
  let addedKeywords = 0;

  for (const idea of newIdeas) {
    const keyword = normalizeKeyword(idea);
    if (!keyword || knownKeywords.has(keyword)) continue;
    knownKeywords.add(keyword);
    entries.push({
      keyword,
      slug: uniqueSlug(keyword, usedSlugs),
      published: false,
      published_at: null,
      last_attempt: null,
      source: 'search_console',
      impressions: 0,
      clicks: 0,
      ctr: 0,
      avg_position: null,
      discovered_at: seenDate,
    });
    addedKeywords += 1;
  }

  return { entries, updatedExisting, addedKeywords };
}

function saveKeywordRegistry(entries: KeywordEntry[]): void {
  fs.writeFileSync(CONFIG.keywords.registryPath, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
}

function percentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function position(value: number | null): string {
  return value === null ? 'N/A' : value.toFixed(1);
}

function formatConsoleReport(report: SeoReport): string {
  const queryLines = report.topQueries.map((row, index) =>
    `${index + 1}. ${row.keys[0]} — ${row.impressions} impressions, ${row.clicks} clicks, ${percentage(row.ctr)}, position ${position(row.position)}`,
  );
  const pageLines = report.topPages.map((row, index) =>
    `${index + 1}. ${row.keys[0]} — ${row.clicks} clicks, ${row.impressions} impressions`,
  );
  const opportunityLines = report.opportunities.map((row, index) =>
    `${index + 1}. ${row.keys[0]} — ${row.impressions} impressions, ${percentage(row.ctr)}, position ${position(row.position)}`,
  );
  const ideaLines = report.keywordIdeas.map((idea, index) => `${index + 1}. ${idea}`);

  return [
    '# SafeUnfollow Weekly SEO',
    '',
    `Period: ${report.range.label} (${report.range.startDate} to ${report.range.endDate})`,
    '',
    '## Summary',
    `- Total clicks: ${report.data.summary.clicks}`,
    `- Total impressions: ${report.data.summary.impressions}`,
    `- Average CTR: ${percentage(report.data.summary.ctr)}`,
    `- Average position: ${position(report.data.summary.position)}`,
    '',
    '## Top Queries',
    ...(queryLines.length ? queryLines : ['No query data.']),
    '',
    '## Top Pages',
    ...(pageLines.length ? pageLines : ['No page data.']),
    '',
    '## Opportunity Queries',
    ...(opportunityLines.length ? opportunityLines : ['No opportunities matched the configured thresholds.']),
    '',
    '## New Keyword Ideas',
    ...(ideaLines.length ? ideaLines : ['No new keyword ideas.']),
  ].join('\n');
}

function formatTelegramReport(report: SeoReport): string {
  const topQueries = report.topQueries
    .slice(0, CONFIG.reporting.telegramListCount)
    .map((row, index) => `${index + 1}. ${row.keys[0]} — ${row.impressions} imp`);
  const opportunities = report.opportunities
    .slice(0, CONFIG.reporting.telegramListCount)
    .map((row, index) =>
      `${index + 1}. ${row.keys[0]} — ${row.impressions} imp, ${percentage(row.ctr)}, pos ${position(row.position)}`,
    );
  const recommendations = report.keywordIdeas
    .slice(0, CONFIG.reporting.telegramListCount)
    .map((idea, index) => `${index + 1}. ${idea}`);

  return [
    '📈 SafeUnfollow Weekly SEO',
    '',
    'Period', report.range.label,
    `${report.range.startDate} → ${report.range.endDate}`,
    '',
    'Clicks', String(report.data.summary.clicks),
    '',
    'Impressions', String(report.data.summary.impressions),
    '',
    'CTR', percentage(report.data.summary.ctr),
    '',
    'Avg Position', position(report.data.summary.position),
    '',
    'Top Queries', ...(topQueries.length ? topQueries : ['No data']),
    '',
    'Opportunities', ...(opportunities.length ? opportunities : ['None']),
    '',
    'Recommended Next Posts', ...(recommendations.length ? recommendations : ['None']),
  ].join('\n').slice(0, CONFIG.telegram.maxMessageLength);
}

async function sendTelegram(message: string, env: Environment = process.env): Promise<void> {
  const token = env[CONFIG.telegram.tokenEnv];
  const chatId = env[CONFIG.telegram.chatIdEnv];
  if (!token || !chatId) {
    throw new Error(`Set ${CONFIG.telegram.tokenEnv} and ${CONFIG.telegram.chatIdEnv} to enable Telegram reporting.`);
  }
  const response = await fetch(`${CONFIG.telegram.apiBaseUrl}/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, disable_web_page_preview: true }),
  });
  if (!response.ok) throw new Error(`Telegram API ${response.status}: ${await response.text()}`);
}

function parseFlags(args: string[]): { telegram: boolean; updateKeywords: boolean } {
  const supported = new Set(['--telegram', '--update-keywords']);
  const unknown = args.filter(arg => !supported.has(arg));
  if (unknown.length) throw new Error(`Unknown option(s): ${unknown.join(', ')}`);
  return { telegram: args.includes('--telegram'), updateKeywords: args.includes('--update-keywords') };
}

async function main(): Promise<void> {
  const range = getDateRange();
  let stage: ReportStage = 'Credentials';
  let queryCount = 0;
  let pageCount = 0;
  let flags = { telegram: false, updateKeywords: false };

  try {
    flags = parseFlags(process.argv.slice(2));
    const executor = await createQueryExecutor();

    stage = 'Keyword Registry';
    const registry = loadKeywordRegistry();

    stage = 'Ingestion';
    const data = await fetchSearchConsoleData(executor, range);
    queryCount = data.queries.length;
    pageCount = data.pages.length;

    stage = 'Analysis';
    const report = buildSeoReport(data, range, registry.map(entry => entry.keyword));
    console.log(formatConsoleReport(report));

    if (flags.updateKeywords) {
      stage = 'Keyword Registry';
      const update = updateKeywordRegistry(
        registry,
        data.queries,
        report.keywordIdeas,
        range.endDate,
      );
      saveKeywordRegistry(update.entries);
      console.log(`\nKeyword registry: ${update.updatedExisting} updated, ${update.addedKeywords} added.`);
    }

    if (flags.telegram) {
      stage = 'Telegram';
      await sendTelegram(formatTelegramReport(report));
    }

    writeLog(stage, 'success', range, queryCount, pageCount, null);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`Search Console report failed at ${stage}: ${reason}`);
    try {
      writeLog(stage, 'failure', range, queryCount, pageCount, reason);
    } catch (logError) {
      console.error(`Unable to write Search Console log: ${String(logError)}`);
    }

    if (flags.telegram) {
      try {
        await sendTelegram([
          '❌ SafeUnfollow SEO Report Failed',
          '',
          'Stage', stage,
          '',
          'Reason', reason,
        ].join('\n'));
      } catch (telegramError) {
        console.error(`Telegram notification failed: ${String(telegramError)}`);
      }
    }
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  void main();
}

export {
  CONFIG,
  MissingCredentialsError,
  buildSeoReport,
  createGoogleAuth,
  detectOpportunities,
  discoverKeywordIdeas,
  fetchSearchConsoleData,
  formatConsoleReport,
  formatTelegramReport,
  getDateRange,
  normalizeKeyword,
  updateKeywordRegistry,
};
export type { DateRange, KeywordEntry, QueryExecutor, SearchConsoleData, SearchConsoleRow };
