import type { FetchLike, SerpResearch } from './types';

interface SerperOrganicResult {
  position?: number;
  title?: string;
  link?: string;
  snippet?: string;
}

interface SerperResponse {
  organic?: SerperOrganicResult[];
  peopleAlsoAsk?: Array<{ question?: string }>;
  relatedSearches?: Array<{ query?: string }>;
}

interface SerpOptions {
  apiKey?: string;
  endpoint?: string;
  fetchImpl?: FetchLike;
  limit?: number;
  timeoutMs?: number;
  now?: Date;
}

class SerpConfigurationError extends Error {
  constructor(message = 'SERPER_API_KEY is required for Google SERP research.') {
    super(message);
    this.name = 'SerpConfigurationError';
  }
}

async function searchGoogleSerp(keyword: string, options: SerpOptions = {}): Promise<SerpResearch> {
  const apiKey = options.apiKey ?? process.env.SERPER_API_KEY;
  if (!apiKey) throw new SerpConfigurationError();
  const endpoint = options.endpoint ?? process.env.SERPER_API_URL ?? 'https://google.serper.dev/search';
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 20_000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
      body: JSON.stringify({ q: keyword, gl: 'us', hl: 'en', num: Math.min(options.limit ?? 5, 10) }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`SERP request failed (${response.status}): ${await response.text()}`);
    const payload = await response.json() as SerperResponse;
    const limit = options.limit ?? 5;
    const results = (payload.organic ?? [])
      .filter(item => item.link && /^https?:\/\//i.test(item.link))
      .slice(0, limit)
      .map((item, index) => ({
        position: item.position ?? index + 1,
        title: item.title?.trim() ?? '',
        url: item.link as string,
        description: item.snippet?.trim() ?? '',
      }));
    if (results.length === 0) throw new Error(`Google SERP returned no organic results for "${keyword}".`);

    return {
      provider: 'serper',
      queriedAt: (options.now ?? new Date()).toISOString(),
      results,
      peopleAlsoAsk: (payload.peopleAlsoAsk ?? []).map(item => item.question?.trim() ?? '').filter(Boolean),
      relatedSearches: (payload.relatedSearches ?? []).map(item => item.query?.trim() ?? '').filter(Boolean),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export { SerpConfigurationError, searchGoogleSerp };
export type { SerpOptions };
