export interface InstagramAccount {
  username: string;
  timestamp: number;
}

export interface ParsedData {
  followers: InstagramAccount[];
  following: InstagramAccount[];
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
      if (entry.value) {
        accounts.push({ username: entry.value, timestamp: entry.timestamp ?? 0 });
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

  for (const file of files) {
    const name = file.name.toLowerCase();
    let parsed: unknown;

    try {
      parsed = JSON.parse(file.content);
    } catch {
      continue;
    }

    if (name.includes('followers_1') || (name.includes('followers') && !name.includes('following'))) {
      const result = parseFollowersJson(parsed);
      if (result.length > 0) followers = result;
    } else if (name.includes('following')) {
      const result = parseFollowingJson(parsed);
      if (result.length > 0) following = result;
    }
  }

  return { followers, following };
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
    return parseZip(file);
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
