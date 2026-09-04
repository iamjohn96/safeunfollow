import test from 'node:test';
import assert from 'node:assert/strict';
import { parseJsonFiles, type ParsedData } from '../utils/parser';
import { compareAudience, cleanupCandidates, previousSnapshot, type Snapshot } from '../utils/audience';

const accounts = (names: string[]) => names.map(username => ({ username, timestamp: 0 }));
const data = (date: string, followers: string[], following: string[], profileId = 'test'): ParsedData => ({ schemaVersion: 2, observedAt: Date.parse(date), profileId, followers: accounts(followers), following: accounts(following) });
const snapshot = (d: ParsedData): Snapshot => ({ id: String(d.observedAt), timestamp: 1, label: 'test', data: d });
const file = (name: string, names: string[]) => ({ name, content: JSON.stringify(names.map(value => ({ string_list_data: [{ value, timestamp: 0 }] }))) });

test('merges split followers, ignores unrelated files and deduplicates normalized names', async () => {
  const parsed = await parseJsonFiles([file('followers_2.json', ['b', 'A']), file('followers_1.json', ['a']), file('following.json', ['a']), { name: 'pending_following.json', content: 'invalid' }]);
  assert.deepEqual(parsed.followers.map(a => a.username), ['a', 'b']);
});
test('rejects incomplete, malformed and missing numbered parts, but accepts genuinely empty lists', async () => {
  await assert.rejects(parseJsonFiles([file('followers_1.json', ['a'])]));
  await assert.rejects(parseJsonFiles([file('followers_2.json', ['a']), file('following.json', [])]));
  await assert.rejects(parseJsonFiles([{ name: 'followers_1.json', content: '{}' }, file('following.json', [])]));
  await assert.rejects(parseJsonFiles([file('followers_1.json', ['invalid name']), file('following.json', [])]));
  const empty = await parseJsonFiles([file('followers_1.json', []), file('following.json', [])]);
  assert.deepEqual(empty.followers, []);
});
test('comparison is time ordered and calculates transparent rates', () => {
  const a = data('2026-01-01', ['a', 'b'], ['b', 'c']);
  const b = data('2026-02-01', ['b', 'c', 'd'], ['b', 'c']);
  const result = compareAudience(b, a)!;
  assert.equal(result.net, 1); assert.equal(result.lossRate, 0.5); assert.equal(result.mutualRatio, 1);
  assert.deepEqual(result.newUnfollowers.map(x => x.username), ['a']);
  assert.deepEqual(result.newFollowers.map(x => x.username), ['c', 'd']);
});
test('blocks cross-profile, legacy, duplicate ZIP and same-date comparisons', () => {
  const a = data('2026-01-01', [], []);
  assert.equal(compareAudience(a, { ...a, schemaVersion: undefined }), null);
  assert.equal(compareAudience(a, data('2026-02-01', [], [], 'other')), null);
  assert.equal(compareAudience(a, a), null);
  assert.equal(compareAudience({ ...a, fingerprint: 'same' }, { ...data('2026-02-01', [], []), fingerprint: 'same' }), null);
  assert.equal(compareAudience(a, data('2026-02-01', [], []))?.lossRate, null);
});
test('selects only the latest earlier snapshot for the same profile', () => {
  const a = snapshot(data('2026-01-01', [], []));
  const b = snapshot(data('2026-02-01', [], []));
  assert.equal(previousSnapshot([b, snapshot(data('2027-01-01', [], [])), a], data('2026-03-01', [], []))?.id, b.id);
});
test('cleanup classifications use observed dates, never fabricated follow timestamps', () => {
  const before = snapshot(data('2026-01-01', ['mutual'], ['mutual', 'long']));
  const current = data('2026-02-01', [], ['mutual', 'long', 'unknown']);
  const rows = cleanupCandidates(current, [before], ['long']);
  assert.deepEqual(rows.map(a => a.category), ['previouslyMutual', 'keep', 'uncertain']);
  assert.equal(cleanupCandidates(current, [before], [])[1].category, 'persistent');
  assert.equal(cleanupCandidates(data('2026-01-05', [], ['new']), [before], [])[0].category, 'recent');
  assert.equal(cleanupCandidates(current, [], [])[0].category, 'uncertain');
});
