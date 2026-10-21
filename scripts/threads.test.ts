import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { parseJsonFiles, parseZip, type ParsedData } from '../utils/parser';
import { compareAudience, previousSnapshot, type Snapshot } from '../utils/audience';
import { platformOf, profileUrl } from '../utils/platform';

// Synthetic data shaped like a real Threads export (2026-10): the list sits under
// text_post_app_text_post_app_<kind>, the item title is the display name (not the
// username), and the entry carries value + a threads.com profile href.
const row = (username: string, displayName = `Display ${username}`) => ({
  title: displayName,
  string_list_data: [{ href: `https://www.threads.com/${username}`, value: username, timestamp: 1760000000 }],
});
const threadsFile = (kind: 'followers' | 'following', rows: unknown[]) => ({
  name: `threads/${kind}.json`,
  content: JSON.stringify({ [`text_post_app_text_post_app_${kind}`]: rows }),
});

test('a Threads export is parsed from value, marked as Threads, and never uses the display-name title', async () => {
  const parsed = await parseJsonFiles([
    threadsFile('followers', [row('mutual.one', 'Mutual One')]),
    threadsFile('following', [row('mutual.one'), row('only_me', 'onlyme')]),
  ]);
  assert.equal(parsed.platform, 'threads');
  assert.deepEqual(parsed.following.map(a => a.username), ['mutual.one', 'only_me']);
});

test('a Threads entry without value falls back to the threads.com href, not the title', async () => {
  const hrefOnly = { title: 'looks_like_a_name', string_list_data: [{ href: 'https://www.threads.com/@real.user', timestamp: 1 }] };
  const parsed = await parseJsonFiles([threadsFile('followers', [hrefOnly]), threadsFile('following', [])]);
  assert.deepEqual(parsed.followers.map(a => a.username), ['real.user']);
  const titleOnly = { title: 'looks_like_a_name', string_list_data: [{ timestamp: 1 }] };
  await assert.rejects(parseJsonFiles([threadsFile('followers', [titleOnly]), threadsFile('following', [])]), /invalid-relationship-file/);
});

test('a Threads ZIP with posts and media parses only the relationship lists', async () => {
  const zip = new JSZip();
  zip.file('threads/followers.json', threadsFile('followers', [row('a.user')]).content);
  zip.file('threads/following.json', threadsFile('following', [row('a.user'), row('b.user')]).content);
  zip.file('threads/threads_and_replies.json', '{"text_post_app_text_posts":[]}');
  zip.file('threads/liked_threads.json', '{}');
  zip.file('media/posts/202609/1.jpg', 'binary');
  const parsed = await parseZip(new File([await zip.generateAsync({ type: 'arraybuffer' })], 'threads-export.zip'));
  assert.equal(parsed.platform, 'threads');
  assert.deepEqual(parsed.followers.map(a => a.username), ['a.user']);
});

test('Instagram exports stay unmarked and Instagram-only keys keep working', async () => {
  const parsed = await parseJsonFiles([
    { name: 'followers_1.json', content: JSON.stringify([{ string_list_data: [{ value: 'a', timestamp: 1 }] }]) },
    { name: 'following.json', content: JSON.stringify({ relationships_following: [{ title: 'a', string_list_data: [{ href: 'https://www.instagram.com/_u/a', timestamp: 1 }] }] }) },
  ]);
  assert.equal(parsed.platform, undefined);
  assert.equal(platformOf(parsed), 'instagram');
});

const accounts = (names: string[]) => names.map(username => ({ username, timestamp: 0 }));
const data = (date: string, platform?: 'threads'): ParsedData => ({ schemaVersion: 2, observedAt: Date.parse(date), profileId: 'same', followers: accounts(['a']), following: accounts(['a']), ...(platform ? { platform } : {}) });
const snapshot = (d: ParsedData): Snapshot => ({ id: `${d.platform ?? 'ig'}-${d.observedAt}`, timestamp: 1, label: 'x', data: d });

test('snapshots are never compared across Instagram and Threads, even with the same profile label', () => {
  assert.equal(compareAudience(data('2026-01-01'), data('2026-02-01', 'threads')), null);
  assert.ok(compareAudience(data('2026-01-01', 'threads'), data('2026-02-01', 'threads')));
  const igEarlier = snapshot(data('2026-01-15'));
  const threadsEarlier = snapshot(data('2026-01-01', 'threads'));
  assert.equal(previousSnapshot([igEarlier, threadsEarlier], data('2026-02-01', 'threads'))?.id, threadsEarlier.id);
  assert.equal(previousSnapshot([threadsEarlier], data('2026-02-01')), null);
});

test('account links point at the platform the list came from', () => {
  assert.equal(profileUrl('instagram', 'a.user'), 'https://instagram.com/a.user');
  assert.equal(profileUrl('threads', 'a.user'), 'https://www.threads.com/@a.user');
});
