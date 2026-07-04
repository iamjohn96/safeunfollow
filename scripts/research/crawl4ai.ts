import type { CrawlPage, FetchLike } from './types';

interface CrawlOptions {
  endpoint?: string;
  apiKey?: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  maxAttempts?: number;
  retryDelayMs?: number;
  userAgent?: string;
  sleep?: (milliseconds: number) => Promise<void>;
  now?: () => Date;
}

interface RobotsRules {
  allowed: boolean;
  crawlDelayMs: number;
}

class RobotsDeniedError extends Error {
  constructor(url: string) {
    super(`robots.txt disallows research crawling: ${url}`);
    this.name = 'RobotsDeniedError';
  }
}

class Crawl4AIUnavailableError extends Error {
  constructor(requestUrl: string, cause: unknown) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    super(
      `Crawl4AI is unavailable at ${requestUrl} (${detail}). `
      + 'Start a compatible Crawl4AI service or set CRAWL4AI_BASE_URL to a reachable base URL. '
      + 'Set CRAWL4AI_API_KEY when the service requires authentication. Serper alone cannot produce evidence or a content brief.',
    );
    this.name = 'Crawl4AIUnavailableError';
  }
}

const DEFAULT_USER_AGENT = 'SafeUnfollowResearchBot/1.0 (+https://safeunfollow.com/)';
const hostLastRequest = new Map<string, number>();

function delay(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function retryAfterMilliseconds(response: Response, attempt: number, baseDelay: number): number {
  const value = response.headers.get('retry-after');
  if (value) {
    const seconds = Number(value);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const date = Date.parse(value);
    if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  }
  return baseDelay * (2 ** (attempt - 1));
}

async function requestWithRetry(
  input: string,
  init: RequestInit,
  options: Required<Pick<CrawlOptions, 'fetchImpl' | 'maxAttempts' | 'retryDelayMs' | 'sleep'>>,
): Promise<Response> {
  let lastResponse: Response | undefined;
  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    const response = await options.fetchImpl(input, init);
    if (response.status !== 429) return response;
    lastResponse = response;
    if (attempt < options.maxAttempts) {
      await options.sleep(retryAfterMilliseconds(response, attempt, options.retryDelayMs));
    }
  }
  return lastResponse as Response;
}

function parseRobots(robots: string, pathname: string, userAgent: string): RobotsRules {
  const groups: Array<{ agents: string[]; rules: Array<{ directive: string; value: string }> }> = [];
  let group: typeof groups[number] | null = null;
  let sawRule = false;
  for (const rawLine of robots.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    const directive = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (directive === 'user-agent') {
      if (!group || sawRule) {
        group = { agents: [], rules: [] };
        groups.push(group);
        sawRule = false;
      }
      group.agents.push(value.toLowerCase());
    } else if (group && ['allow', 'disallow', 'crawl-delay'].includes(directive)) {
      group.rules.push({ directive, value });
      sawRule = true;
    }
  }

  const agent = userAgent.toLowerCase().split('/')[0];
  const matching = groups.filter(item => item.agents.some(value => value === '*' || agent.includes(value)));
  const specific = matching.filter(item => item.agents.some(value => value !== '*' && agent.includes(value)));
  const selected = specific.length > 0 ? specific : matching.filter(item => item.agents.includes('*'));
  const pathRules = selected.flatMap(item => item.rules).filter(item => item.directive !== 'crawl-delay' && item.value);
  const matches = pathRules.filter(item => pathname.startsWith(item.value.replace(/\*.*$/, '')));
  matches.sort((a, b) => b.value.length - a.value.length);
  const allowed = matches[0]?.directive !== 'disallow';
  const crawlDelay = selected.flatMap(item => item.rules)
    .find(item => item.directive === 'crawl-delay')?.value;
  return { allowed, crawlDelayMs: crawlDelay ? Math.max(0, Number(crawlDelay) * 1000 || 0) : 0 };
}

async function inspectRobots(url: string, options: CrawlOptions = {}): Promise<RobotsRules> {
  const target = new URL(url);
  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);
  try {
    const response = await fetchImpl(`${target.origin}/robots.txt`, {
      headers: { 'User-Agent': options.userAgent ?? DEFAULT_USER_AGENT },
      signal: controller.signal,
    });
    if (response.status === 404) return { allowed: true, crawlDelayMs: 0 };
    if (!response.ok) throw new Error(`robots.txt request failed (${response.status}) for ${target.origin}`);
    return parseRobots(await response.text(), `${target.pathname}${target.search}`, options.userAgent ?? DEFAULT_USER_AGENT);
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeCrawlResponse(payload: unknown, url: string, crawledAt: string): CrawlPage {
  const root = payload as Record<string, unknown>;
  const list = Array.isArray(root.results)
    ? root.results
    : Array.isArray(root.data)
      ? root.data
      : root.data && typeof root.data === 'object'
        ? [root.data]
        : root.result && typeof root.result === 'object'
          ? [root.result]
          : [root];
  const result = (list[0] ?? {}) as Record<string, unknown>;
  if (result.success === false || root.success === false) {
    throw new Error(`Crawl4AI did not crawl ${url}: ${String(result.error_message ?? root.error ?? 'unknown error')}`);
  }
  const markdownValue = result.markdown;
  const markdown = typeof markdownValue === 'string'
    ? markdownValue
    : String((markdownValue as Record<string, unknown> | undefined)?.raw_markdown ?? root.markdown ?? '');
  const html = String(result.html ?? result.cleaned_html ?? root.html ?? '');
  return {
    url: String(result.url ?? url),
    crawledAt,
    html,
    markdown,
    statusCode: typeof result.status_code === 'number' ? result.status_code : null,
  };
}

async function crawlPage(url: string, options: CrawlOptions = {}): Promise<CrawlPage> {
  const endpoint = (options.endpoint ?? process.env.CRAWL4AI_BASE_URL ?? 'http://localhost:11235').replace(/\/$/, '');
  let endpointUrl: URL;
  try {
    endpointUrl = new URL(endpoint);
    if (!['http:', 'https:'].includes(endpointUrl.protocol)) throw new Error('base URL must use HTTP or HTTPS');
  } catch (error) {
    throw new Crawl4AIUnavailableError(endpoint || '(empty CRAWL4AI_BASE_URL)', error);
  }
  const hosted = /\/v1(?:\/|$)/.test(endpointUrl.pathname);
  const requestUrl = hosted ? `${endpoint}/markdown` : `${endpoint}/crawl`;
  const userAgent = options.userAgent ?? process.env.RESEARCH_USER_AGENT ?? DEFAULT_USER_AGENT;
  const sleep = options.sleep ?? delay;
  const robots = await inspectRobots(url, { ...options, userAgent });
  if (!robots.allowed) throw new RobotsDeniedError(url);

  const host = new URL(url).host;
  const now = options.now ?? (() => new Date());
  const previous = hostLastRequest.get(host) ?? 0;
  const remainingDelay = Math.max(0, previous + robots.crawlDelayMs - now().getTime());
  if (remainingDelay > 0) await sleep(remainingDelay);

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 30_000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'User-Agent': userAgent };
  const apiKey = options.apiKey ?? process.env.CRAWL4AI_API_KEY;
  if (apiKey) headers['X-API-Key'] = apiKey;
  const body = hosted
    ? { url, fit: false, crawler_config: { page_timeout: timeoutMs }, browser_config: { user_agent: userAgent } }
    : {
        urls: [url],
        browser_config: { type: 'BrowserConfig', params: { headless: true, user_agent: userAgent } },
        crawler_config: { type: 'CrawlerRunConfig', params: { cache_mode: 'BYPASS', page_timeout: timeoutMs } },
      };
  try {
    const response = await requestWithRetry(requestUrl, {
      method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal,
    }, {
      fetchImpl: options.fetchImpl ?? fetch,
      maxAttempts: options.maxAttempts ?? 3,
      retryDelayMs: options.retryDelayMs ?? 500,
      sleep,
    });
    hostLastRequest.set(host, now().getTime());
    if (!response.ok) throw new Error(`request failed (${response.status}): ${await response.text()}`);
    return normalizeCrawlResponse(await response.json(), url, now().toISOString());
  } catch (error) {
    throw error instanceof Crawl4AIUnavailableError
      ? error
      : new Crawl4AIUnavailableError(requestUrl, error);
  } finally {
    clearTimeout(timeout);
  }
}

export {
  Crawl4AIUnavailableError,
  DEFAULT_USER_AGENT,
  RobotsDeniedError,
  crawlPage,
  inspectRobots,
  normalizeCrawlResponse,
  parseRobots,
  requestWithRetry,
};
export type { CrawlOptions, RobotsRules };
