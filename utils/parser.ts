export interface InstagramAccount {
  username: string;
  timestamp: number;
}

export interface ParsedData {
  followers: InstagramAccount[];
  following: InstagramAccount[];
  fingerprint?: string;
  profileId?: string;
  observedAt?: number;
  schemaVersion?: 2;
}

interface StringListEntry {
  href?: string;
  value: string;
  timestamp: number;
}

interface InstagramExportItem {
  string_list_data: StringListEntry[];
  title?: string;
}

function parseAccountList(data: unknown): InstagramAccount[] {
  if (!Array.isArray(data)) return [];

  const accounts: InstagramAccount[] = [];

  for (const item of data as InstagramExportItem[]) {
    if (!item.string_list_data || !Array.isArray(item.string_list_data)) continue;
    for (const entry of item.string_list_data) {
      if (typeof entry.value === 'string' && /^[a-zA-Z0-9._]{1,30}$/.test(entry.value.trim())) {
        accounts.push({ username: entry.value.trim().toLowerCase(), timestamp: Number.isFinite(entry.timestamp) && entry.timestamp > 0 ? entry.timestamp : 0 });
      }
    }
  }

  return accounts;
}

function parseFollowingJson(data: unknown): InstagramAccount[] {
  // following.json can be { relationships_following: [...] } or directly an array
  if (Array.isArray(data)) return parseAccountList(data);

  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const key = Object.keys(obj).find(k => k.includes('following'));
    if (key && Array.isArray(obj[key])) return parseAccountList(obj[key]);
    // fallback: try any array-valued key
    for (const val of Object.values(obj)) {
      if (Array.isArray(val)) return parseAccountList(val);
    }
  }

  return [];
}

function parseFollowersJson(data: unknown): InstagramAccount[] {
  if (Array.isArray(data)) return parseAccountList(data);

  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const key = Object.keys(obj).find(k => k.includes('followers'));
    if (key && Array.isArray(obj[key])) return parseAccountList(obj[key]);
    for (const val of Object.values(obj)) {
      if (Array.isArray(val)) return parseAccountList(val);
    }
  }

  return [];
}

export async function parseJsonFiles(files: { name: string; content: string }[]): Promise<ParsedData> {
  let followers: InstagramAccount[] = [];
  let following: InstagramAccount[] = [];
  const seen = new Set<string>();
  const parts: Record<string, number[]> = { followers: [], following: [] };

  for (const file of files) {
    const name = file.name.toLowerCase().split('/').pop() ?? '';
    const kind = /^followers(?:_\d+)?\.json$/.test(name) ? 'followers' : /^following(?:_\d+)?\.json$/.test(name) ? 'following' : null;
    if (!kind) continue;
    const part = name.match(/_(\d+)\.json$/);
    if (part) parts[kind].push(Number(part[1]));
    let parsed: unknown;

    try {
      parsed = JSON.parse(file.content);
    } catch {
      throw new Error('invalid-relationship-file');
    }

    const list = Array.isArray(parsed) ? parsed : parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>)[`relationships_${kind}`] : undefined;
    if (!Array.isArray(list)) throw new Error('invalid-relationship-file');
    for (const item of list) {
      if (!item || !Array.isArray(item.string_list_data) || !item.string_list_data.length || item.string_list_data.some((entry: StringListEntry) => !entry || typeof entry.value !== 'string' || !/^[a-zA-Z0-9._]{1,30}$/.test(entry.value.trim()))) throw new Error('invalid-relationship-file');
    }
    seen.add(kind);
    if (kind === 'followers') {
      const result = parseFollowersJson(parsed);
      followers.push(...result);
    } else {
      const result = parseFollowingJson(parsed);
      following.push(...result);
    }
  }

  if (seen.size !== 2) throw new Error('missing-relationship-files');
  for (const values of Object.values(parts)) {
    const sorted = [...new Set(values)].sort((a, b) => a - b);
    if (sorted.some((value, i) => value !== i + 1)) throw new Error('missing-relationship-part');
  }
  const unique = (accounts: InstagramAccount[]) => [...new Map(accounts.map(a => [a.username, a])).values()].sort((a, b) => a.username.localeCompare(b.username));
  followers = unique(followers);
  following = unique(following);
  return { followers, following, schemaVersion: 2 };
}

export async function parseZip(file: File): Promise<ParsedData> {
  // Dynamically import JSZip only when needed
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(file);

  const relevantFiles: { name: string; content: string }[] = [];

  const promises: Promise<void>[] = [];
  zip.forEach((relativePath, zipEntry) => {
    const name = relativePath.toLowerCase();
    if (!zipEntry.dir && name.endsWith('.json') && (name.includes('followers') || name.includes('following'))) {
      promises.push(
        zipEntry.async('string').then(content => {
          relevantFiles.push({ name: relativePath, content });
        })
      );
    }
  });

  await Promise.all(promises);
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
