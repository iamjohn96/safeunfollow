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

test('current following.json format with title and profile href is parsed (format drift)', async () => {
  const followers = [
    { title: '', media_list_data: [], string_list_data: [{ href: 'https://www.instagram.com/mutual_account', value: 'mutual_account', timestamp: 1 }] },
    { title: '', media_list_data: [], string_list_data: [{ href: 'https://www.instagram.com/follows_me_only', value: 'follows_me_only', timestamp: 2 }] },
  ];
  const following = {
    relationships_following: [
      { title: 'Mutual_Account', string_list_data: [{ href: 'https://www.instagram.com/_u/Mutual_Account', timestamp: 1 }] },
      { title: 'i_follow_only', string_list_data: [{ href: 'https://www.instagram.com/_u/i_follow_only', timestamp: 3 }] },
    ],
  };

  const parsed = await parseJsonFiles([
    { name: 'connections/followers_and_following/followers_1.json', content: JSON.stringify(followers) },
    { name: 'connections/followers_and_following/following.json', content: JSON.stringify(following) },
  ]);

  assert.deepEqual(parsed.following.map(account => account.username), ['i_follow_only', 'mutual_account']);
  assert.deepEqual(computeMutuals(parsed).map(account => account.username), ['mutual_account']);
  assert.deepEqual(computeNonFollowers(parsed).map(account => account.username), ['i_follow_only']);
  assert.deepEqual(computeFollowersOnly(parsed).map(account => account.username), ['follows_me_only']);
});

test('profile href is used when neither value nor title is present', async () => {
  const parsed = await parseJsonFiles([
    { name: 'followers_1.json', content: JSON.stringify([{ string_list_data: [{ href: 'https://instagram.com/href_only/', timestamp: 4 }] }]) },
    { name: 'following.json', content: JSON.stringify({ relationships_following: [{ string_list_data: [{ href: 'https://www.instagram.com/_u/href_only?utm=x', timestamp: 5 }] }] }) },
  ]);

  assert.deepEqual(computeMutuals(parsed).map(account => account.username), ['href_only']);
});

test('mixed old and new entry shapes are deduplicated case-insensitively', async () => {
  const parsed = await parseJsonFiles([
    { name: 'followers_1.json', content: JSON.stringify([{ string_list_data: [{ value: 'someone', timestamp: 1 }] }]) },
    {
      name: 'following.json',
      content: JSON.stringify({
        relationships_following: [
          { string_list_data: [{ value: 'someone', timestamp: 1 }] },
          { title: 'SomeOne', string_list_data: [{ href: 'https://www.instagram.com/_u/SomeOne', timestamp: 2 }] },
        ],
      }),
    },
  ]);

  assert.equal(parsed.following.length, 1);
  assert.equal(parsed.following[0].username, 'someone');
});

test('entries without a derivable username are rejected as malformed', async () => {
  const followers = JSON.stringify([{ string_list_data: [{ value: 'valid_follower', timestamp: 1 }] }]);
  const malformedFollowing = [
    { relationships_following: [{ title: '', string_list_data: [{ timestamp: 1 }] }] },
    { relationships_following: [{ title: 'not a username', string_list_data: [{ timestamp: 1 }] }] },
    { relationships_following: [{ string_list_data: [{ href: 'https://example.com/_u/fake_user', timestamp: 1 }] }] },
    { relationships_following: [{ title: 'valid_title', string_list_data: [] }] },
  ];

  for (const following of malformedFollowing) {
    await assert.rejects(
      parseJsonFiles([
        { name: 'followers_1.json', content: followers },
        { name: 'following.json', content: JSON.stringify(following) },
      ]),
      /invalid-relationship-file/,
    );
  }
});

test('incomplete multipart follower exports and missing relationship files are rejected', async () => {
  const following = JSON.stringify({ relationships_following: [{ title: 'someone', string_list_data: [{ href: 'https://www.instagram.com/_u/someone', timestamp: 1 }] }] });
  const followerPart = JSON.stringify([{ string_list_data: [{ value: 'someone', timestamp: 1 }] }]);

  await assert.rejects(
    parseJsonFiles([
      { name: 'followers_2.json', content: followerPart },
      { name: 'following.json', content: following },
    ]),
    /missing-relationship-part/,
  );
  await assert.rejects(parseJsonFiles([{ name: 'following.json', content: following }]), /missing-relationship-files/);
});
