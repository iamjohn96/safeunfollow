import type { Platform } from './platform';

export interface InstagramAccount {
  username: string;
  timestamp: number;
}

export interface ParsedData {
  followers: InstagramAccount[];
  following: InstagramAccount[];
  platform?: Platform;
  // TikTok keeps only the most recent followers in its export; set when the list is shorter than the profile count.
  incompleteFollowers?: boolean;
  fingerprint?: string;
  profileId?: string;
  observedAt?: number;
  schemaVersion?: 2;
}

interface StringListEntry {
  href?: string;
  value?: string;
  timestamp: number;
}

interface InstagramExportItem {
  string_list_data: StringListEntry[];
  title?: string;
}

const RELATIONSHIP_JSON_PATTERN = /^(?:followers|following)(?:_\d+)?\.json$/;
const RELATIONSHIP_HTML_PATTERN = /^(?:followers|following)(?:_\d+)?\.html$/;
// Browsers rename repeated downloads ("user_data_tiktok (1).json"), so match the stem loosely.
const TIKTOK_EXPORT_PATTERN = /user_data[^/]*\.json$/;
const USERNAME_PATTERN = /^[a-zA-Z0-9._]{1,30}$/;
const PROFILE_URL_PATTERN = /^https?:\/\/(?:www\.)?instagram\.com\/(?:_u\/)?([^/?#]+)\/?(?:[?#].*)?$/i;
const THREADS_PROFILE_URL_PATTERN = /^https?:\/\/(?:www\.)?threads\.(?:com|net)\/@?([^/?#@]+)\/?(?:[?#].*)?$/i;
// Instagram keeps the lists under relationships_<kind>; Threads uses text_post_app_text_post_app_<kind>.
// Meta exports (Instagram, Threads) share the followers/following JSON layout.
type MetaPlatform = Exclude<Platform, 'tiktok'>;
const LIST_KEYS: Record<MetaPlatform, (kind: 'followers' | 'following') => string> = {
  instagram: kind => `relationships_${kind}`,
  threads: kind => `text_post_app_text_post_app_${kind}`,
};

function validUsername(candidate: unknown): string | null {
  if (typeof candidate !== 'string') return null;
  const trimmed = candidate.trim();
  return USERNAME_PATTERN.test(trimmed) ? trimmed : null;
}

// Instagram has shipped several relationship-entry shapes. Older exports put the
// username in string_list_data[].value; newer following.json files put it in the
// item title and keep only a profile href (often /_u/<username>) in the entry.
// Threads titles are display names, so Threads never falls back to the title.
export function exportEntryUsername(item: unknown, entry: unknown, platform: Platform = 'instagram'): string | null {
  const entryRecord = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {};
  const itemRecord = item && typeof item === 'object' ? item as Record<string, unknown> : {};
  const fromValue = validUsername(entryRecord.value);
  if (fromValue) return fromValue;
  if (platform === 'instagram') {
    const fromTitle = validUsername(itemRecord.title);
    if (fromTitle) return fromTitle;
  }
  if (typeof entryRecord.href !== 'string') return null;
  const match = entryRecord.href.trim().match(platform === 'threads' ? THREADS_PROFILE_URL_PATTERN : PROFILE_URL_PATTERN);
  return match ? validUsername(match[1]) : null;
}

function parseAccountList(list: InstagramExportItem[], platform: Platform): InstagramAccount[] {
  const accounts: InstagramAccount[] = [];
  for (const item of list) {
    for (const entry of item.string_list_data) {
      const username = exportEntryUsername(item, entry, platform);
      if (username) {
        accounts.push({ username: username.toLowerCase(), timestamp: Number.isFinite(entry?.timestamp) && entry.timestamp > 0 ? entry.timestamp : 0 });
      }
    }
  }
  return accounts;
}

type RelationshipKind = 'followers' | 'following';
interface PlatformLists { followers: InstagramAccount[]; following: InstagramAccount[]; seen: Set<RelationshipKind>; parts: Record<RelationshipKind, number[]> }

function relationshipList(parsed: unknown, kind: RelationshipKind): { platform: MetaPlatform; list: unknown } {
  // Instagram followers_N.json is a bare array; every other shape is an object keyed by platform.
  if (Array.isArray(parsed)) return { platform: 'instagram', list: parsed };
  const record = parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
  for (const platform of ['instagram', 'threads'] as const) {
    const key = LIST_KEYS[platform](kind);
    if (key in record) return { platform, list: record[key] };
  }
  return { platform: 'instagram', list: undefined };
}

const uniqueSorted = (accounts: InstagramAccount[]) => [...new Map(accounts.map(a => [a.username, a])).values()].sort((a, b) => a.username.localeCompare(b.username));
const asRecord = (value: unknown) => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;

function tiktokTimestamp(value: unknown): number {
  const match = typeof value === 'string' ? value.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/) : null;
  return match ? Date.UTC(+match[1], +match[2] - 1, +match[3], +match[4], +match[5], +match[6]) / 1000 : 0;
}

function tiktokAccounts(list: unknown): InstagramAccount[] {
  if (list === null) return [];
  if (!Array.isArray(list)) throw new Error('invalid-relationship-file');
  const accounts: InstagramAccount[] = [];
  for (const item of list) {
    const record = asRecord(item);
    if (!record || typeof record.UserName !== 'string') throw new Error('invalid-relationship-file');
    // "N/A" marks a deleted or unavailable account; it cannot be matched, so it is skipped.
    const username = validUsername(record.UserName);
    if (username) accounts.push({ username: username.toLowerCase(), timestamp: tiktokTimestamp(record.Date) });
  }
  return accounts;
}

// TikTok exports everything in one user_data_tiktok.json; the lists sit under "Profile And Settings".
function parseTikTokExport(parsed: unknown): ParsedData {
  const profile = asRecord(asRecord(parsed)?.['Profile And Settings']);
  const follower = asRecord(profile?.Follower);
  const following = asRecord(profile?.Following);
  const hasFollowers = !!follower && 'FansList' in follower;
  const hasFollowing = !!following && 'Following' in following;
  if (!hasFollowers && !hasFollowing) throw new Error('missing-relationship-files');
  if (!hasFollowing) throw new Error('missing-following-file');
  if (!hasFollowers) throw new Error('missing-followers-file');
  const fans = follower.FansList;
  const followerCount = asRecord(asRecord(profile?.['Profile Info'])?.ProfileMap)?.followerCount;
  const listed = Array.isArray(fans) ? fans.length : 0;
  const incompleteFollowers = typeof followerCount === 'number' && followerCount > listed + 10;
  return {
    followers: uniqueSorted(tiktokAccounts(fans)),
    following: uniqueSorted(tiktokAccounts(following.Following)),
    schemaVersion: 2,
    platform: 'tiktok',
    ...(incompleteFollowers ? { incompleteFollowers: true } : {}),
  };
}

export async function parseJsonFiles(files: { name: string; content: string }[]): Promise<ParsedData> {
  const tiktokFile = files.find(file => TIKTOK_EXPORT_PATTERN.test(file.name.toLowerCase().split('/').pop() ?? ''));
  if (tiktokFile) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(tiktokFile.content);
    } catch {
      throw new Error('invalid-relationship-file');
    }
    return parseTikTokExport(parsed);
  }

  const empty = (): PlatformLists => ({ followers: [], following: [], seen: new Set(), parts: { followers: [], following: [] } });
  const groups: Record<MetaPlatform, PlatformLists> = { instagram: empty(), threads: empty() };

  for (const file of files) {
    const name = file.name.toLowerCase().split('/').pop() ?? '';
    const kind: RelationshipKind | null = /^followers(?:_\d+)?\.json$/.test(name) ? 'followers' : /^following(?:_\d+)?\.json$/.test(name) ? 'following' : null;
    if (!kind) continue;
    let parsed: unknown;

    try {
      parsed = JSON.parse(file.content);
    } catch {
      throw new Error('invalid-relationship-file');
    }

    const { platform, list } = relationshipList(parsed, kind);
    if (!Array.isArray(list)) throw new Error('invalid-relationship-file');
    for (const item of list) {
      if (!item || !Array.isArray(item.string_list_data) || !item.string_list_data.length || item.string_list_data.some((entry: StringListEntry) => !exportEntryUsername(item, entry, platform))) throw new Error('invalid-relationship-file');
    }
    const group = groups[platform];
    const part = name.match(/_(\d+)\.json$/);
    if (part) group.parts[kind].push(Number(part[1]));
    group.seen.add(kind);
    group[kind].push(...parseAccountList(list as InstagramExportItem[], platform));
  }

  // Meta exports one profile per ZIP, so normally only one platform is present.
  // Prefer a complete list pair; otherwise report against whichever platform was found.
  const complete = (p: MetaPlatform) => groups[p].seen.size === 2;
  const present = (p: MetaPlatform) => groups[p].seen.size > 0;
  const platform: MetaPlatform = complete('instagram') ? 'instagram' : complete('threads') ? 'threads' : present('instagram') || !present('threads') ? 'instagram' : 'threads';
  const { seen, parts } = groups[platform];
  let { followers, following } = groups[platform];

  if (seen.size !== 2) {
    // Name the missing side so the upload screen can say what to fix.
    if (seen.has('followers')) throw new Error('missing-following-file');
    if (seen.has('following')) throw new Error('missing-followers-file');
    throw new Error('missing-relationship-files');
  }
  for (const values of Object.values(parts)) {
    const sorted = [...new Set(values)].sort((a, b) => a - b);
    if (sorted.some((value, i) => value !== i + 1)) throw new Error('missing-relationship-part');
  }
  followers = uniqueSorted(followers);
  following = uniqueSorted(following);
  return { followers, following, schemaVersion: 2, ...(platform === 'threads' ? { platform } : {}) };
}

export async function parseZip(file: File): Promise<ParsedData> {
  // Dynamically import JSZip only when needed
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());

  const relevantFiles: { name: string; content: string }[] = [];
  let hasRelationshipHtml = false;

  const promises: Promise<void>[] = [];
  zip.forEach((relativePath, zipEntry) => {
    const name = relativePath.toLowerCase();
    if (!zipEntry.dir && RELATIONSHIP_HTML_PATTERN.test(name.split('/').pop() ?? '')) hasRelationshipHtml = true;
    if (!zipEntry.dir && name.endsWith('.json') && (name.includes('followers') || name.includes('following') || TIKTOK_EXPORT_PATTERN.test(name.split('/').pop() ?? ''))) {
      promises.push(
        zipEntry.async('string').then(content => {
          relevantFiles.push({ name: relativePath, content });
        })
      );
    }
  });

  await Promise.all(promises);
  // Instagram offers HTML or JSON; an HTML export has the lists but not in a format we read.
  const hasRelationshipJson = relevantFiles.some(file => RELATIONSHIP_JSON_PATTERN.test(file.name.toLowerCase().split('/').pop() ?? ''));
  if (hasRelationshipHtml && !hasRelationshipJson) throw new Error('html-export');
  return parseJsonFiles(relevantFiles);
}

export async function parseFile(file: File): Promise<ParsedData> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.zip')) {
    const data = await parseZip(file);
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    return { ...data, fingerprint: Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('') };
  }

  if (name.endsWith('.json')) {
    const content = await file.text();
    return parseJsonFiles([{ name: file.name, content }]);
  }

  if (name.endsWith('.html')) throw new Error('html-export');
  throw new Error('unsupported-format');
}

// Accepts the original ZIP, or the extracted followers/following JSON files selected together
// (some phones unpack the ZIP automatically).
export async function parseFiles(files: File[]): Promise<ParsedData> {
  if (files.length === 1) return parseFile(files[0]);
  const names = files.map(file => file.name.toLowerCase());
  if (names.length > 1 && names.every(name => name.endsWith('.json'))) {
    return parseJsonFiles(await Promise.all(files.map(async file => ({ name: file.name, content: await file.text() }))));
  }
  if (names.length > 0 && names.every(name => name.endsWith('.html'))) throw new Error('html-export');
  throw new Error('unsupported-format');
}

export function computeNonFollowers(data: ParsedData): InstagramAccount[] {
  const followerSet = new Set(data.followers.map(f => f.username));
  return data.following.filter(f => !followerSet.has(f.username));
}

export function computeFollowersOnly(data: ParsedData): InstagramAccount[] {
  const followingSet = new Set(data.following.map(account => account.username));
  return data.followers.filter(account => !followingSet.has(account.username));
}

export function computeMutuals(data: ParsedData): InstagramAccount[] {
  const followerSet = new Set(data.followers.map(account => account.username));
  return data.following.filter(account => followerSet.has(account.username));
}

export function computeChanges(
  prev: ParsedData,
  curr: ParsedData
): { newUnfollowers: InstagramAccount[]; newFollowers: InstagramAccount[] } {
  const prevFollowerSet = new Set(prev.followers.map(f => f.username));
  const currFollowerSet = new Set(curr.followers.map(f => f.username));

  const newUnfollowers = prev.followers.filter(f => !currFollowerSet.has(f.username));
  const newFollowers = curr.followers.filter(f => !prevFollowerSet.has(f.username));

  return { newUnfollowers, newFollowers };
}

export function exportToCsv(accounts: InstagramAccount[], filename: string): void {
  const header = 'username,timestamp\n';
  const rows = accounts.map(a => `${a.username},${a.timestamp}`).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
