import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { parseFiles, parseJsonFiles, parseZip } from '../utils/parser';
import { profileUrl } from '../utils/platform';

// Synthetic data shaped like a real TikTok "Download your data" JSON export (2026-10):
// one user_data_tiktok.json with the lists under "Profile And Settings", entries of
// { Date: 'YYYY-MM-DD HH:MM:SS', UserName }, and "N/A" for unavailable accounts.
const entry = (UserName: string, Date = '2026-09-01 10:00:00') => ({ Date, UserName });
function tiktokExport(fans: unknown[] | null, following: unknown[] | null, counts?: { followers: number; following: number }) {
  return JSON.stringify({
    'Direct Message': { 'Direct Messages': { ChatHistory: {} } },
    'Profile And Settings': {
      Follower: { App: 1, IsFastLane: true, FansList: fans },
      Following: { App: 1, IsFastLane: true, Following: following },
      'Profile Info': { ProfileMap: { followerCount: counts?.followers ?? fans?.length ?? 0, followingCount: counts?.following ?? following?.length ?? 0 } },
    },
  });
}

test('a TikTok user_data JSON is parsed, marked as TikTok, and skips N/A placeholders', async () => {
  const parsed = await parseJsonFiles([{ name: 'user_data_tiktok.json', content: tiktokExport(
    [entry('Mutual.One'), entry('N/A'), entry('N/A'), entry('fan_only')],
    [entry('mutual.one'), entry('i_follow')],
  ) }]);
  assert.equal(parsed.platform, 'tiktok');
  assert.deepEqual(parsed.followers.map(a => a.username), ['fan_only', 'mutual.one']);
  assert.deepEqual(parsed.following.map(a => a.username), ['i_follow', 'mutual.one']);
  assert.equal(parsed.followers[0].timestamp, Date.UTC(2026, 8, 1, 10) / 1000);
  assert.equal(parsed.incompleteFollowers, undefined);
});

test('the TikTok JSON works inside the original ZIP and as a single uploaded file', async () => {
  const content = tiktokExport([entry('a.user')], [entry('a.user')]);
  const zip = new JSZip();
  zip.file('user_data_tiktok.json', content);
  const fromZip = await parseZip(new File([await zip.generateAsync({ type: 'arraybuffer' })], 'tiktok.zip'));
  assert.equal(fromZip.platform, 'tiktok');
  const fromJson = await parseFiles([new File([content], 'user_data_tiktok (1).json')]);
  assert.deepEqual(fromJson.following.map(a => a.username), ['a.user']);
});

test('empty TikTok lists are accepted, but a missing list or entry shape is not', async () => {
  const empty = await parseJsonFiles([{ name: 'user_data_tiktok.json', content: tiktokExport(null, []) }]);
  assert.deepEqual(empty.followers, []);
  const noFollowing = JSON.stringify({ 'Profile And Settings': { Follower: { FansList: [entry('a')] } } });
  await assert.rejects(parseJsonFiles([{ name: 'user_data_tiktok.json', content: noFollowing }]), /missing-following-file/);
  await assert.rejects(parseJsonFiles([{ name: 'user_data_tiktok.json', content: tiktokExport([{ Name: 'a' }], []) }]), /invalid-relationship-file/);
  await assert.rejects(parseJsonFiles([{ name: 'user_data_tiktok.json', content: '{"Comment":{}}' }]), /missing-relationship-files/);
});

test('a follower list shorter than the profile count is flagged as incomplete (TikTok caps it)', async () => {
  const parsed = await parseJsonFiles([{ name: 'user_data_tiktok.json', content: tiktokExport([entry('a'), entry('N/A')], [entry('a')], { followers: 15000, following: 1 }) }]);
  assert.equal(parsed.incompleteFollowers, true);
});

test('TikTok account links open the TikTok profile', () => {
  assert.equal(profileUrl('tiktok', 'a.user'), 'https://www.tiktok.com/@a.user');
});
