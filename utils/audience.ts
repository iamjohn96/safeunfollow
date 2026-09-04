import { computeChanges, computeMutuals, computeNonFollowers, type ParsedData } from './parser';

export interface Snapshot { id: string; timestamp: number; label: string; data: ParsedData }

export function decodeSnapshots(raw: string | null): Snapshot[] {
  const value: unknown = raw ? JSON.parse(raw) : [];
  const accounts = (v: unknown) => Array.isArray(v) && v.every(a => a && typeof a.username === 'string' && typeof a.timestamp === 'number');
  if (!Array.isArray(value) || !value.every(s => s && typeof s.id === 'string' && typeof s.timestamp === 'number' && typeof s.label === 'string' && s.data && accounts(s.data.followers) && accounts(s.data.following))) throw new Error('invalid-snapshot-storage');
  return value;
}

export function qualified(data: ParsedData): boolean {
  return data.schemaVersion === 2 && !!data.profileId && /^[a-z0-9._]{1,30}$/.test(data.profileId) && !!data.observedAt && Number.isFinite(data.observedAt) && data.observedAt > 0;
}

export function compareAudience(a: ParsedData, b: ParsedData) {
  if (!qualified(a) || !qualified(b) || a.profileId !== b.profileId || a.observedAt === b.observedAt || (a.fingerprint && a.fingerprint === b.fingerprint)) return null;
  const [previous, current] = a.observedAt! < b.observedAt! ? [a, b] : [b, a];
  const changes = computeChanges(previous, current);
  return { ...changes, previous, current, net: current.followers.length - previous.followers.length,
    lossRate: previous.followers.length ? changes.newUnfollowers.length / previous.followers.length : null,
    mutualRatio: current.following.length ? computeMutuals(current).length / current.following.length : null };
}

export function previousSnapshot(snapshots: Snapshot[], current: ParsedData) {
  return snapshots.filter(s => qualified(s.data) && s.data.profileId === current.profileId && s.data.observedAt! < (current.observedAt ?? 0) && (!current.fingerprint || s.data.fingerprint !== current.fingerprint))
    .sort((a, b) => b.data.observedAt! - a.data.observedAt!)[0] ?? null;
}

export type CleanupCategory = 'keep' | 'uncertain' | 'recent' | 'persistent' | 'previouslyMutual';
export function cleanupCandidates(data: ParsedData, snapshots: Snapshot[], keep: string[]) {
  const previous = previousSnapshot(snapshots, data);
  const before = new Set(previous?.data.following.map(a => a.username));
  const mutuals = new Set(previous ? computeMutuals(previous.data).map(a => a.username) : []);
  const protectedNames = new Set(keep);
  const days = previous ? (data.observedAt! - previous.data.observedAt!) / 86400000 : 0;
  return computeNonFollowers(data).map(account => {
    let category: CleanupCategory = 'uncertain';
    if (protectedNames.has(account.username)) category = 'keep';
    else if (qualified(data) && previous) {
      if (!before.has(account.username)) category = days <= 7 ? 'recent' : 'uncertain';
      else if (mutuals.has(account.username)) category = 'previouslyMutual';
      else if (days >= 30) category = 'persistent';
    }
    return { ...account, category };
  });
}
