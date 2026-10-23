// IndexNow lets Bing, Yandex, Naver, Seznam and others learn about changed URLs
// without waiting for a crawl. The key is public by design: it must be served at
// keyLocation so the search engine can verify that this site sent the ping.
export const INDEXNOW_HOST = 'safeunfollow.com';
export const INDEXNOW_KEY = '78af322b9090585399e7b3225548a656';
export const INDEXNOW_KEY_LOCATION = `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`;
export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
export const INDEXNOW_MAX_URLS = 10000;

export type IndexNowPayload = {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
};

/** Keep only https URLs on this host, deduplicated, in their original order. */
export function indexNowUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      continue;
    }
    if (url.protocol !== 'https:' || url.hostname !== INDEXNOW_HOST) continue;
    const href = url.toString();
    if (seen.has(href)) continue;
    seen.add(href);
    out.push(href);
  }
  return out;
}

/** Split URLs into IndexNow request bodies (max 10,000 URLs each). */
export function indexNowPayloads(urls: string[]): IndexNowPayload[] {
  const list = indexNowUrls(urls);
  const payloads: IndexNowPayload[] = [];
  for (let i = 0; i < list.length; i += INDEXNOW_MAX_URLS) {
    payloads.push({
      host: INDEXNOW_HOST,
      key: INDEXNOW_KEY,
      keyLocation: INDEXNOW_KEY_LOCATION,
      urlList: list.slice(i, i + INDEXNOW_MAX_URLS),
    });
  }
  return payloads;
}
