---
title: "How to See Who Doesn't Follow You Back on TikTok Without Logging In"
description: "Find who doesn't follow you back on TikTok from your official data download. No login or password, analyzed in your browser, plus the export's limits."
date: 2026-10-24
slug: "see-who-doesnt-follow-you-back-on-tiktok"
cluster: "instagram-unfollow"
keywords:
  - "who doesn't follow you back on tiktok"
  - "tiktok unfollow checker"
  - "who unfollowed me on tiktok"
  - "tiktok download your data json"
  - "SafeUnfollow"
---
To see who doesn't follow you back on TikTok, request your data from TikTok's "Download your data" page in JSON format and compare the follower and following lists inside the file. TikTok shows both lists in the app, but it never puts them side by side. Apps that do the comparison for you usually want your TikTok login. The data file gets you the same answer without handing over your account.

This guide covers the request steps, what is inside TikTok's export, and one TikTok-specific limit worth knowing before you trust the result.

## How to download your TikTok data

1. In TikTok, open **Profile → ☰ → Settings and privacy → Account → Download your data**.
2. Choose **JSON** as the file format. The TXT format cannot be analyzed.
3. Request the data. TikTok usually prepares it within a few days.
4. When it is ready, download the file from the same page before the link expires.
5. Upload the ZIP, or the `user_data_tiktok.json` file inside it, to [SafeUnfollow](/upload).

You do not need to extract anything. If your browser or phone has already unzipped the download, upload the JSON file directly.

## What is inside TikTok's export

TikTok's data file covers much more than followers. It includes your profile, activity, and direct messages. That is a good reason to be careful about where you upload it.

SafeUnfollow reads only two parts of the file: your follower list and your following list. Everything else is ignored. The analysis runs in your browser, and the file is not uploaded to SafeUnfollow's servers. There is no login, no OAuth, and no API connection to your TikTok account, which keeps this approach privacy-first and avoids direct account access.

From those two lists you get:

- **You follow, they don't**: accounts you follow that don't follow you
- **They follow, you don't**: followers you haven't followed back
- **Mutuals**: accounts where the follow goes both ways

The first 20 accounts in each list are free to view. Lifetime Access (one payment of US$14.99, adjusted for your country, no subscription) unlocks full lists, search, CSV export, unlimited snapshots, and change history.

## The TikTok limit most tools don't mention

For accounts with a large number of followers, TikTok's export may include only your most recent followers rather than the full list. The profile section of the same file still records your real follower count, so the gap is visible in the export itself.

When the follower list in the export is clearly shorter than your follower count, SafeUnfollow shows a warning. In that case, some people in "You follow, they don't" may in fact follow you. They are older followers that TikTok left out of the export. Treat that list as a starting point and spot-check names in the app before you act on it.

The export also marks deleted or unavailable accounts as "N/A." SafeUnfollow skips those entries, so your counts may be slightly lower than the raw file.

## Seeing who unfollowed you on TikTok

One export shows your relationships on the day TikTok prepared the file. It cannot tell you who unfollowed you, only who doesn't follow you now.

To track unfollows, save the result as a snapshot, request a new data download later, and compare the two. Accounts that were in the older follower list but not the newer one stopped following you between those dates. Our guide on [tracking follower changes over time](/blog/track-instagram-follower-changes-over-time) explains how snapshot comparison works.

TikTok snapshots are compared only with other TikTok snapshots, never with Instagram or Threads.

## FAQ

### Does SafeUnfollow need my TikTok password?

No. It works only from the file you download from TikTok. There is no login, OAuth, or API connection.

### Why does SafeUnfollow say my follower list is incomplete?

TikTok's export can include only your most recent followers when you have a lot of them. SafeUnfollow compares the list with your follower count and warns you when the gap is large.

### Should I upload the ZIP or the JSON file?

Either works. Upload the ZIP as downloaded, or the `user_data_tiktok.json` file from inside it.

### My upload failed. What should I check first?

Make sure you chose JSON, not TXT, when you requested the data. If you picked TXT, request a new download in JSON.

### Does this work for Instagram and Threads?

Yes, with each platform's own export. For Threads, see [how to check Threads followers](/blog/see-who-doesnt-follow-you-back-on-threads). For Instagram, upload your Instagram data download ZIP the same way.

Want the short version? The [TikTok unfollow checker](/tiktok-unfollow-checker) page has the steps on one screen.

<!-- AUTO:RELATED_START -->
Start with the [Instagram Unfollow complete guide](/pillars/instagram-unfollow-guide) for the full topic overview.

## Related Articles

- [How to Analyze Your Instagram Data Export Without Logging In](/blog/how-to-analyze-instagram-data-export)
<!-- AUTO:RELATED_END -->

[Upload your TikTok data with SafeUnfollow](https://safeunfollow.com/upload)
