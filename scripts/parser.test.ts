import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeFollowersOnly,
  computeMutuals,
  computeNonFollowers,
  parseJsonFiles,
} from '../utils/parser';

test('relationship analysis is derived from follower and following exports', async () => {
  const followers = [
    { string_list_data: [{ value: 'mutual_account', timestamp: 1 }] },
    { string_list_data: [{ value: 'follows_me_only', timestamp: 2 }] },
  ];
  const following = {
    relationships_following: [
      { string_list_data: [{ value: 'mutual_account', timestamp: 1 }] },
      { string_list_data: [{ value: 'i_follow_only', timestamp: 3 }] },
    ],
  };

  const parsed = await parseJsonFiles([
    { name: 'followers_1.json', content: JSON.stringify(followers) },
    { name: 'following.json', content: JSON.stringify(following) },
  ]);

  assert.deepEqual(computeMutuals(parsed).map(account => account.username), ['mutual_account']);
  assert.deepEqual(computeNonFollowers(parsed).map(account => account.username), ['i_follow_only']);
  assert.deepEqual(computeFollowersOnly(parsed).map(account => account.username), ['follows_me_only']);
});
