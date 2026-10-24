---
title: "How to See Who Doesn't Follow You Back on Threads Without Logging In"
description: "Find who doesn't follow you back on Threads from Meta's official data export. No login or password, analyzed in your browser, with export settings that work."
date: 2026-10-24
slug: "see-who-doesnt-follow-you-back-on-threads"
cluster: "instagram-unfollow"
keywords:
  - "who doesn't follow you back on threads"
  - "threads unfollow checker"
  - "who unfollowed me on threads"
  - "threads followers export"
  - "SafeUnfollow"
---
To see who doesn't follow you back on Threads, export your Threads profile data from Meta's Accounts Center and compare the followers and following lists inside it. Threads itself has no "not following back" view, and most third-party apps that offer one ask for your login. The export route gives the same answer from a file you control.

This guide covers the exact export settings that work, what SafeUnfollow reads from the file, and what a single export can and cannot tell you.

## Why Threads needs its own export

Threads profiles are managed through Meta's Accounts Center, the same place you export Instagram data. That makes it easy to assume one export covers both. It does not. Meta exports each profile separately, so your Instagram ZIP contains no Threads followers, and your Threads ZIP contains no Instagram followers.

The other difference catches most people. Instagram lets you export only "Followers and following." Threads has no such option. You select the whole "Threads" category, which also includes your posts and media. That is why the media quality setting matters: set it to Low to keep the file small.

## How to export your Threads followers and following

1. Open Accounts Center, then go to **Your information and permissions → Export your information → Create export**.
2. Choose your **Threads** profile, not your Instagram profile.
3. Select only **Threads** as the information to include.
4. Set the date range to **All time**, the format to **JSON**, and media quality to **Low**.
5. When Meta notifies you that the export is ready, download the ZIP.
6. Upload the ZIP to [SafeUnfollow](/upload) without unzipping it.

Two settings cause most failed uploads. An export in **HTML** format cannot be read, so request a new one in JSON. A short date range such as "Last year" can leave out followers from earlier years, so always pick All time.

## What SafeUnfollow reads from the file

The Threads ZIP contains far more than your follower lists. SafeUnfollow ignores your posts and media and reads only the followers and following lists.

The analysis runs in your browser. SafeUnfollow does not upload your export to its servers, and it never asks for your Threads or Instagram password. There is no login, no OAuth, and no API connection, so there is no session token for anyone to misuse. This is a privacy-first way to answer the question, not a workaround that touches your account.

From those two lists you get three groups:

- **You follow, they don't**: accounts you follow on Threads that don't follow you
- **They follow, you don't**: accounts that follow you that you don't follow back
- **Mutuals**: accounts where the follow goes both ways

The first 20 accounts in each list are free to view. Lifetime Access (one payment of US$14.99, adjusted for your country, no subscription) unlocks full lists, search, CSV export, unlimited snapshots, and change history.

## Not following back is not the same as unfollowing

A single export is a snapshot of your relationships on the day Meta prepared the file. It shows who doesn't follow you back right now. It cannot tell you whether those accounts once followed you and stopped, or never followed you at all.

To see who unfollowed you on Threads, save the result as a snapshot, request a new export later, and compare the two. Accounts that appear in the older follower list but not the newer one stopped following you sometime between the two export dates. The same method works on Instagram, and our guide on [tracking follower changes over time](/blog/track-instagram-follower-changes-over-time) explains it in detail.

Snapshots are compared only within the same platform. A Threads snapshot is never compared with an Instagram one, because the two follower lists are separate.

## Limits to know before you start

- Meta controls how long an export takes. Request it before you need the result.
- Comparison shows that a change happened between two dates, not the exact day.
- A deactivated or deleted account disappears from the list the same way an unfollow does, so the two cannot be told apart.
- If Meta changes the export format, the parser may need an update before new files can be read.

## FAQ

### Does SafeUnfollow need my Threads or Instagram password?

No. It works only from the export file you download from Meta. There is no login, OAuth, or API connection.

### Can I use my Instagram data download for Threads?

No. Meta exports each profile separately. Your Instagram data export does not include Threads followers, so export your Threads profile on its own.

### Why is my Threads export so large?

Threads has no followers-only option, so the ZIP includes your posts and media. Setting media quality to Low keeps it small. SafeUnfollow reads only the follower lists either way.

### Should I upload the ZIP or extract it first?

Upload the ZIP as it is. SafeUnfollow finds the followers and following files inside it.

### Does it work for TikTok too?

Yes. TikTok uses its own "Download your data" file, and the steps are different. See [how to check TikTok followers](/blog/see-who-doesnt-follow-you-back-on-tiktok) for that walkthrough.

Want the short version? The [Threads unfollow checker](/threads-unfollow-checker) page has the steps on one screen.

<!-- AUTO:RELATED_START -->
Start with the [Instagram Unfollow complete guide](/pillars/instagram-unfollow-guide) for the full topic overview.

## Related Articles

- [How to Analyze Your Instagram Data Export Without Logging In](/blog/how-to-analyze-instagram-data-export)
<!-- AUTO:RELATED_END -->

[Upload your Threads data with SafeUnfollow](https://safeunfollow.com/upload)
