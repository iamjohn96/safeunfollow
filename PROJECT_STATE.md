# SafeUnfollow project state

Last verified: 2026-09-17

Branch at review: `main`

Application package version: `0.1.0`

Product milestone: **Version 1.1 — Growth Observation / post-repositioning validation**

This file is the concise handoff source for the current state. Read `AGENTS.md` for durable implementation and operating rules, `README.md` for detailed procedures, and dated files in `docs/` only as historical evidence.

## 1. Purpose and current product

SafeUnfollow is a privacy-first web application that analyzes the Instagram Data ZIP a user requests from Instagram. It is positioned as an **Instagram Data Analyzer / Audience Intelligence utility**, not only a “who unfollowed me” checker.

The current product:

- accepts an intact Instagram Data ZIP in the browser;
- parses validated follower and following relationship JSON locally;
- shows mutual accounts, accounts the user follows that do not follow back, and followers the user does not follow;
- lets the user label the profile and date represented by an export;
- saves local snapshots and compares two qualified snapshots for newly observed, no-longer-observed, net-change, loss-rate, and mutual-ratio metrics;
- gives deterministic, conservative cleanup review categories without performing account actions;
- shows every total and the first 20 accounts per list for free, and sells one-time Lifetime Access (US$3.99) for full lists, search, CSV export, unlimited snapshots, and change history;
- publishes crawlable, localized product/guide/legal pages and one canonical blog article.

The governing privacy promise is factual: no Instagram login, no OAuth, no Instagram API, no account connection, and no upload of Instagram export contents to SafeUnfollow servers. Premium payment and access records are necessarily server-side and are described separately in the privacy copy.

## 2. Why the product has this shape

The largest adoption risk is the repeated friction of requesting and downloading an Instagram export. A native wrapper would make opening a ZIP easier but would not remove the export-request step. The product therefore focuses on making one ZIP worth the effort and making later snapshots useful, while retaining the no-account-connection architecture.

Additional analysis is allowed only where current Instagram export data can be parsed reliably. Raw data is converted into deterministic metrics and cautious explanations; AI is intentionally excluded from product analysis. This protects privacy, avoids invented conclusions, and keeps results reproducible.

The current phase is observation, not feature expansion. Traffic, successful analysis, snapshot retention, repeat use, and verified Premium conversion should determine the next product investment.

## 3. Completed major capabilities

### Product and local analysis

- Browser-side ZIP parsing with multipart follower-file validation, schema checks, username normalization, deduplication, and SHA-256 export fingerprints.
- Relationship lists for mutual, following-only, and follower-only accounts.
- Profile/date persistence that survives page restoration without allowing stale analysis tabs to overwrite a newer ZIP.
- Qualified same-profile snapshot comparisons and deterministic audience metrics.
- Conservative cleanup categories: protected/keep, insufficient evidence, recently observed, persistent non-mutual, and previously mutual.
- Free preview of 20 accounts per relationship and cleanup list plus one saved snapshot; Lifetime Access (or a legacy subscription) unlocks full lists, search, unlimited snapshots, history details, and CSV export.
- Clear local-storage limitations in product and legal copy.

### Premium and integrations

- One-time Dodo product `SafeUnfollow Lifetime Access` (US$3.99, tax-inclusive, PPP enabled) is the only checkout shown. Legacy monthly/annual subscription products still exist in Dodo and remain supported by the webhook and cancellation flow, but their checkout links are hidden.
- Signed Dodo webhook processing using raw-body Standard Webhooks verification, an exact event/status allowlist, atomic Redis persistence, duplicate suppression, stale-event ordering protection, and fail-for-retry behavior.
- Premium grants for eligible subscription-linked `payment.succeeded`, `subscription.active`, and `subscription.renewed`; revocation for `subscription.cancelled`, `subscription.expired`, `subscription.failed`, and `subscription.on_hold`. Lifetime Access grants only for a subscription-less `payment.succeeded` whose cart contains the configured product, and is revoked by payment ID on a full `refund.succeeded`, `dispute.lost`, or `dispute.accepted`. Subscription revocations and the cancellation flow never remove lifetime access. Lua persistence was verified against a disposable Redis (33 assertions).
- Email OTP for Premium restore and cancellation; 15-minute OTP lifetime and 30-day hashed browser verification session.
- Provider-confirmed cancellation that fails closed when Dodo cannot be reached or configured.
- Resend verification, cancellation, welcome, and renewal-reminder email paths. Welcome delivery is best effort.

### Growth, content, and discovery

- GA4/Vercel Analytics event instrumentation for upload, analysis, snapshot-save, and Premium checkout intent.
- Search Console reporting, keyword registry, topic-cluster tooling, Evergreen planning, weekly growth dashboard, Redis monitoring, Telegram notifications, and the Hermes publishing pipeline.
- Repositioned blog inventory: one canonical article, `How to Analyze Your Instagram Data Export Without Logging In`; retired article URLs permanently redirect to it.
- English, Portuguese, Russian, and Spanish public experiences. English uses unprefixed URLs.
- Canonical/alternate metadata, sitemap entries, and crawlable initial HTML. robots.txt explicitly allows OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-User, GPTBot, PerplexityBot, Google-Extended, and Applebot-Extended (in addition to the open `*` rule). `public/llms.txt` states what the product does, its real pricing, and key pages in plain text. Structured data (`lib/structured-data.ts`): `WebApplication` with an `Offer` for the real Lifetime Access price, `FAQPage` for the homepage FAQ, `HowTo` for the `/guide` export steps, and `Article` for blog posts and pillar guides.
- Dedicated application icon and current privacy/terms pages.

## 4. Current work and immediate priorities

No product feature is actively being implemented. The active workstream is **growth and funnel observation after the analyzer repositioning**.

Measure this sequence:

`upload_started → analysis_completed → snapshot_saved → return visit → premium_opened → premium_checkout_click`

Use ordered users/sessions where appropriate; raw event ratios are not a deduplicated funnel. Break upload/save failures down only by the fixed `failure_reason` categories. Treat Dodo records, not GA events or browser state, as proof of a purchase. The last operator report indicated no external paying customers and only an owner test transaction; refresh provider data before treating that statement as current.

Next priorities, in order:

1. Refresh read-only GA4, Search Console, Dodo, and Redis-health evidence for a recent observation window. If the sample remains small, write an observation conclusion and do not change features or price.
2. Verify the production Dodo endpoint subscribes to every implemented lifecycle event and exercise restore/cancellation in provider test mode or isolated storage without a real charge or live-customer mutation.
3. Monitor recent real Instagram export compatibility and the ZIP-to-analysis success rate. Add parser fixtures/tests only from sanitized synthetic reproductions when format drift is found.

### 2026-09-17 decision and evidence

Read-only evidence for 2026-08-18 to 2026-09-16 (GA4): 315 users, 95 `upload_started`, 17 `analysis_completed`, 0 `snapshot_saved`, 3 `premium_opened`, 0 `premium_checkout_click`. `upload_failed` affected 72 users: `invalid_relationship_data` 52, `missing_relationship_files` 22, `unsupported_format` 11. Vercel Analytics showed 606 visitors in 30 days; Search Console clicks are mostly branded queries. No external paying customer is known.

Decision: stop growth investment for now and run a 60-day validation in this order: (1) reproduce and fix the export-parsing failures with the owner's own current export and sanitized synthetic fixtures; (2) evaluate a one-time purchase instead of subscription-only Premium, because repeat use requires a new Instagram export and no snapshot saves were observed; (3) after 60 days, keep investing or move to maintenance mode based on successful analyses and verified Dodo purchases. The download guide now follows the current Accounts Center export flow (Export to device, Followers and following only, All time, JSON) in all active locales.

Parser root cause confirmed on 2026-09-17 with the owner's own export (not committed): the current `following.json` entries store the username in the item `title` and keep only `href` (`https://www.instagram.com/_u/<username>`) and `timestamp` in `string_list_data`, with no `value`. The previous parser rejected the whole file, which matches the dominant `invalid_relationship_data` failure. The parser now derives the username from `value`, then `title`, then an instagram.com profile href, and still rejects entries where none is valid. The owner's export parsed successfully after the fix in a local production build. A second owner export requested the same day with All time and only Followers and following confirmed that the date range matters: the shorter-range export omitted the two oldest followers (9 followers with All time versus 7), while the following list was identical. A shorter range can therefore understate followers and misclassify mutual accounts as not following back, so the guide requires All time. Both owner exports parsed successfully on production after deployment e9c371e.

Monetization change approved by the owner on 2026-09-17: replace subscription-only Premium with one-time Lifetime Access at US$3.99 (PPP enabled), free preview of 20 accounts per list, subscription checkout hidden. Rationale: single-session usage and zero observed snapshot saves meant the only purchase moment is right after the first result. Measure `premium_opened` by `source` (`result_gate`, `cleanup_gate`, `changes_gate`, `dashboard`, `home`), `premium_checkout_click` with `plan=lifetime`, and verified Dodo purchases. Decision checkpoint around 2026-11-16: continue small improvements at 5+ external purchases with at least 70% analysis success, hold at 2–4, maintenance mode at 0–1.

Operational facts verified on 2026-09-17: production Redis is the Vercel Marketplace store `safeunfollow-redis` (Upstash, Pay As You Go, available); the older free store is uninstalled. Stripe cannot be opened for a South Korea–based business, so Dodo Payments remains the billing provider.

### 2026-09-18 technical SEO/AEO pass

Audited crawlability and AI-assistant visibility (robots.txt, sitemap.xml, structured data, llms.txt) with a direct crawl of the live site; this was a technical accuracy/completeness pass, not the paused growth/content-expansion workstream. Findings: `llms.txt` did not exist (404); the homepage FAQ, the `/guide` export steps, and the four pillar guides had no structured data despite the site already having a `lib/structured-data.ts` helper and an `ai-discovery.test.ts` suite; the `WebApplication` schema had no `Offer`, so the real Lifetime Access price was not machine-readable; robots.txt already allowed all crawlers via the `*` rule but did not name assistant crawlers explicitly. Sitemap hreflang, canonical tags, titles, and meta descriptions were already correct and were not changed. Shipped: `public/llms.txt`; `FAQPage` schema on the homepage FAQ; `HowTo` schema on `/guide`; `Article` schema on the four pillar pages (reusing the existing blog helper with a `/pillars/` path); an `Offer` (US$3.99, USD) added to the `WebApplication` schema; robots.txt now also names ClaudeBot, Claude-User, GPTBot, PerplexityBot, Google-Extended, and Applebot-Extended. No pricing, routes, or indexed URLs changed. 6 new tests added to `scripts/ai-discovery.test.ts` (117/117 passing); `npm run lint` and `npm run build` (50 static pages) both passed. Recheck Search Console and any AI-referral traffic no earlier than 30 days out; visibility changes are slow and this was a correctness/completeness fix, not a growth bet.

### 2026-09-20 anonymous feedback capture

Owner request following the first external Dodo purchase (2026-09-19, GBP checkout): collect lightweight, opt-in customer feedback since the 60-day validation checkpoint needs qualitative signal alongside purchase counts and analysis success rate. Scoped deliberately small — this is product instrumentation, not the paused growth-investment workstream.

Shipped `components/FeedbackPrompt.tsx`, a skippable, non-blocking card (star rating 1–5, optional 500-char comment, separate public-display opt-in checkbox unchecked by default) rendered in two places: inside `PremiumModal` when `purchased` is true, and inside `Dashboard` right after the stats grid when `qualified(data)`. No email or account identifier is collected — consistent with the product's local-first, no-login model; a `feedback_submitted` / `feedback_skipped_<context>` flag in `localStorage` prevents re-prompting. Submissions POST to `app/api/feedback/route.ts`, validated by the pure `lib/feedback.ts#sanitizeFeedbackInput` (context enum, integer rating 1–5, comment trimmed/truncated to 500 chars, at least one signal required), rate-limited by IP via the existing `checkRateLimit`, and stored with `lib/redis.ts#recordFeedback` as JSON entries in the `feedback:entries` Redis list (capped to the most recent 1000 via `LTRIM`). New funnel events `feedback_shown` / `feedback_submitted` / `feedback_skipped` added to `utils/analytics.ts`. Translation keys added to all six locale dictionaries (en/pt/ru/es plus the inactive ko/ja) to keep `Translations` type-complete.

No carousel, marquee, or public testimonial display was built. That was explicitly deferred until enough public-opt-in reviews exist to show (paired with the same 5-purchase threshold as the 60-day checkpoint) — displaying too few or fabricated reviews would be misleading and was rejected as a direction. There is no admin UI yet to read `feedback:entries` back; the next agent doing anything with this data should add a read-only script/route rather than exposing it publicly. 5 new tests added (`scripts/feedback.test.ts`, 122/122 passing); `npm run lint` and `npm run build` (51 routes, including the new `/api/feedback`) both passed. Not yet pushed/deployed by the owner.

## 5. Architecture and data boundaries

### Browser-only data

`JSZip` and `utils/parser.ts` read the ZIP in the browser. Parsed account lists, the latest analysis, snapshots, comparison history, protected cleanup choices, and CSV output remain in `localStorage`. They do not sync between browsers or devices and can be lost in private browsing or when site data is cleared.

Important storage keys:

- `lastParsedData`
- `snapshots`
- `audience-keep-v1:<profile>`
- `isPremium`
- `premiumEmail`
- `premiumSession`

### Server-side operational data

Upstash Redis stores Premium entitlement and access-operation state. Key families include `premium:`, `subscription_id:`, `renewal_date:`, `cancel_token:`, `restore_token:`, `premium_session:` (hashed session token), OTP/rate-limit counters, Dodo delivery/order markers, reminder deduplication markers, and a single `feedback:entries` list (anonymous opt-in product feedback, capped at 1000 entries, no email attached). Email addresses are identifiers in several key families; never expose or log them.

Dodo Payments is the billing source of truth. Resend sends transactional email. Server routes must fail closed on verification or dependency failure. GA4 records fixed funnel metadata and aggregate counts, not Instagram export content or customer payment truth.

### Code map

- `app/`, `components/`: routes and UI.
- `utils/parser.ts`, `utils/audience.ts`: local parser and deterministic metrics.
- `lib/redis.ts`, `lib/dodo-webhook.ts`, `app/api/`: Premium and server integrations.
- `content/`: public Markdown content.
- `automation/`, `scripts/`: SEO, reporting, research, publishing, and monitoring operations.
- `docs/`: dated verification evidence and measurement definitions.

## 6. Known limitations and technical debt

- Repeated Instagram export download is the core UX/adoption friction and cannot be removed by a web or native client without abandoning the current architecture.
- Instagram can change export filenames or schemas. Only follower/following JSON is intentionally supported; recent real-format coverage requires continued observation.
- Snapshot/history data is browser- and device-local by design. There is no account or cross-device sync.
- Redis is a single operational dependency for Premium verification. Redis failures fail closed. Free-plan inactivity previously archived databases after an inactive period; the current production plan and anti-inactivity reliability must be verified rather than assumed.
- There is no read-only billing event ledger for weekly purchase, renewal, cancellation, refund, or dispute reporting. Current Redis entitlement keys are not historical billing records.
- Refund/dispute reconciliation, durable welcome-email retries, and multiple simultaneous subscriptions per email are not modeled.
- On 2026-09-17 the production endpoint was set to 10 events: the subscription lifecycle events plus `payment.succeeded`, `refund.succeeded`, `dispute.lost`, and `dispute.accepted`. A real end-to-end lifetime purchase has not been exercised; verify with a refunded owner purchase or Dodo test mode before claiming it works.
- Annual checkout was previously verified; monthly checkout destination was not conclusively verified in the live browser. Re-check both in a no-charge flow before making end-to-end claims.
- A 2026-09-05 local production build passed browser checks with synthetic ZIPs and a 390×844 viewport, but this is not current real-device Safari/Android evidence.
- Korean and Japanese dictionaries remain in `utils/translations.ts` but are not active public locales. Some product copy is maintained in component-local locale maps, which increases localization drift risk.
- The growth dashboard artifacts in `automation/weekly-growth-report.*` and `reports/weekly/` predate the current one-article blog inventory and must not be quoted as current product metrics.
- Vercel reported six occurrences across two related runtime error groups for `/index.rsc` on 2026-09-11: “Expected RSC response, got text/plain.” The current deployment remained READY. Diagnose recurrence and request pattern before changing code.

## 7. Deliberate non-goals and rejected directions

- No Instagram credential collection, OAuth, API connection, automatic follow/unfollow, auto-DM, engagement bot, or scheduler.
- No AI audience interpretation, caption/hashtag generator, or AI-created health score. Calculated metrics must remain deterministic.
- No generic creator CRM or broad social-media-management pivot.
- No large UI rewrite, native app, additional export categories, or server-side snapshot sync until usage evidence justifies the cost and privacy trade-off.
- Do not expand the blog cluster until Search Console shows a distinct query with sufficient demand.
- Do not add ads, change pricing again, or migrate Redis based on anecdote or a small sample. The 2026-09-17 move to one-time Lifetime Access was an explicit owner decision for the 60-day validation.

## 8. Undecided questions

- Whether repeat usage is strong enough to justify a native companion or optional creator-oriented mode.
- Which additional Instagram export categories, if any, are stable enough to support with truthful user value.
- What minimum observation sample should trigger pricing, Premium packaging, or feature experiments.
- Whether Premium history should ever sync across devices; this would materially change privacy and architecture.
- Whether a durable billing ledger and webhook reconciliation job are warranted before meaningful paid volume exists.

## 9. Test, build, and deployment state

Fresh local verification on 2026-09-13 passed `npm test` (97/97), `npm run lint`, `npm run build` (50 static pages), and `git diff --check`. The build emitted expected warnings because local Redis credentials were not loaded; it did not attempt a Redis operation. The prior 2026-09-05 synthetic Chrome verification covered upload/comparison flows, all four locales, and a 390×844 viewport. Neither verification performed a real charge, real email, live webhook, production Redis mutation, or current real-device test.

Live Vercel read-only verification on 2026-09-13 found:

- project `instagram-unfollow-tracker`, Next.js, Node.js 24.x;
- latest production deployment `dpl_6inmfyoqwLmvwwgoR5E2jyeodkk8` in `READY` state;
- deployed Git commit `613015f6306a30c9f09f8d2664c56dbfc08d018e`;
- production domain `safeunfollow.com` attached;
- the `/index.rsc` runtime error noted above within the preceding seven days.

This documentation-only handoff commit is local unless a later status entry explicitly records a push/deployment. Do not infer that a local commit is live.

## 10. External dependencies and secret names

Required or feature-specific services are Vercel, Upstash Redis, Dodo Payments, Resend, GA4/Vercel Analytics, Google Search Console, OpenRouter, Serper, optional Crawl4AI, Telegram, GitHub, and the local Hermes scheduler/runtime.

Secret/configuration names are documented in `.env.local.example`. Important groups include:

- Redis: `KV_REST_API_URL`, `KV_REST_API_TOKEN`
- Dodo: `DODO_WEBHOOK_SECRET`, `DODO_API_KEY`; optional `NEXT_PUBLIC_DODO_LIFETIME_PRODUCT_ID` (test mode only). Legacy `NEXT_PUBLIC_DODO_MONTHLY_URL` / `NEXT_PUBLIC_DODO_YEARLY_URL` are no longer read.
- Email/cron: `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`
- Public app: `NEXT_PUBLIC_APP_URL`
- Content/research: `OPENROUTER_API_KEY`, `SERPER_API_KEY`, optional `CRAWL4AI_API_KEY`
- Search Console: `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY` or one documented alternative
- Operations: Telegram and SafeUnfollow publishing variables listed in `README.md`

Never copy values into this file, Git, logs, fixtures, or client code.

## 11. First steps for the next agent

1. Read `AGENTS.md` and this file, then run `git status -sb` and inspect recent commits. Preserve any user changes.
2. Install the locked dependencies if needed and run `npm test`, `npm run lint`, `npm run build`, and `git diff --check` before modifying behavior.
3. Start with the read-only observation priorities in section 4. Do not add a feature, alter pricing, touch live billing/storage, publish content, deploy, or push without the required evidence and explicit authorization.
