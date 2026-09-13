<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# SafeUnfollow agent rules

Read `PROJECT_STATE.md` before making changes. It contains the current milestone, verified state, open risks, and next priorities. Keep transient status there; keep only durable operating rules in this file.

## Product and architecture invariants

- SafeUnfollow is a privacy-first Instagram Data ZIP analyzer. It must not require an Instagram login, OAuth, the Instagram API, or an account connection.
- Instagram export files, account lists, parsed results, snapshots, comparisons, and CSV output stay in the browser. Do not upload them to SafeUnfollow servers or third parties.
- The supported analysis boundary is the follower/following relationship JSON that `utils/parser.ts` can validate reliably. Expanding that boundary requires representative export fixtures, explicit product approval, and parser tests.
- Product metrics and cleanup categories are deterministic. Do not add AI-generated analysis, scores, or recommendations.
- SafeUnfollow never performs Instagram actions. Do not implement auto-follow, auto-unfollow, scheduling, auto-DM, engagement automation, or credential-based account access.
- Premium identity and billing state are server-side. Dodo Payments is the source of truth for actual purchases; analytics events are not proof of payment.
- Prefer factual privacy and safety claims such as “no Instagram account access.” Do not make absolute claims such as “zero risk” or “100% private.”

## Module boundaries

- `app/` and `components/`: routes, metadata, localized pages, and browser UI.
- `utils/parser.ts`, `utils/audience.ts`, and related `utils/`: browser-side parsing, deterministic analysis, local persistence helpers, and analytics event shaping.
- `lib/` and `app/api/`: server-only integrations for Redis, Dodo Payments, Resend, Markdown content, and metadata helpers. Never import secrets into client components.
- `content/`: published Markdown articles and pillar pages.
- `automation/`: registries, roadmaps, reports, and generated operational state. Treat dated reports as snapshots, not automatically current facts.
- `scripts/`: SEO publishing, Search Console, research, refresh, Redis, growth, and test tooling. Some scripts have external side effects; inspect them before running.
- `docs/`: historical verification records and focused operator documentation. Update `PROJECT_STATE.md` when current status changes.

## Coding and compatibility rules

- Use strict TypeScript, existing `@/` imports, and the established component style. Validate unknown external input before use.
- Keep parsing and audience calculations pure and deterministic where practical. Normalize usernames and profile identifiers consistently with existing helpers.
- Preserve the active public locales: English at unprefixed routes, plus Portuguese (`/pt`), Russian (`/ru`), and Spanish (`/es`). A user-facing change must remain coherent in all four languages.
- Preserve existing browser storage keys and schemas unless a migration is included. Important keys include `lastParsedData`, `snapshots`, `audience-keep-v1:<profile>`, `isPremium`, `premiumEmail`, and `premiumSession`.
- Preserve public routes, canonical URLs, locale alternates, and redirects from retired blog slugs. SEO changes must not silently break indexed URLs.
- Preserve Redis key compatibility unless a reviewed migration covers deployed data. Current patterns are documented in `README.md` and `PROJECT_STATE.md`.
- Do not change Premium pricing, plan structure, advertising strategy, Redis provider/model, or the local-first storage architecture without explicit approval supported by evidence.
- Add a dependency only when the platform or existing dependencies cannot reasonably meet the need. Explain its runtime, privacy, maintenance, and bundle-size cost.

## Privacy and security rules

- Never commit credentials, tokens, private keys, customer email addresses, Instagram usernames, ZIP fingerprints, or real export fixtures. Document variable names and secret locations only.
- Analytics may contain fixed event names, fixed failure categories, language, plan, source, and aggregate counts. Never send exception text, filenames, profile labels, account lists, ZIP contents, or fingerprints.
- Dodo webhooks must verify the raw request with Standard Webhooks headers and use the exact event/status allowlist. Do not add unsigned fallbacks or bypass signature verification.
- Premium restore and cancellation require email OTP proof. Browser Premium checks require the server-issued session. Redis or provider failures must fail closed without deleting entitlement prematurely.
- Redis and email/payment credentials are server-only and must never use a `NEXT_PUBLIC_` prefix. Only checkout URLs and the public app URL are browser-visible.
- Use synthetic data for automated and browser tests. Real customer data, live webhook replay, real email delivery, and subscription mutations require explicit approval and an impact review.

## Test and verification rules

- For ordinary code changes, run `npm test`, `npm run lint`, `npm run build`, and `git diff --check` before claiming completion.
- Parser changes require success, malformed, incomplete multipart, duplicate, and format-drift tests. Never commit real Instagram exports.
- Premium/payment changes require signature, allowlist, idempotency, ordering, revocation, rate-limit, OTP/session, and provider-failure coverage as applicable.
- User-flow changes should be checked in a production build with synthetic ZIPs, all four active locales, a mobile viewport, console errors, and the Free/Premium boundary.
- Distinguish local tests from production verification. Never describe a synthetic webhook, mocked provider response, or checkout-link inspection as a real purchase.
- `npm run blog:publish` can write content, commit, push, poll deployment, and notify Telegram. It is not a routine verification command. `npm run refresh:apply` writes approved content. Prefer dry-run/plan commands unless the side effects are explicitly authorized.

## Changes that require explicit confirmation

Obtain confirmation before any remote push or deployment; Dodo, Redis, Vercel, Resend, Search Console, or Telegram configuration change; paid-resource or plan change; cron registration; live webhook delivery or replay; real email; customer-data access; subscription change; publishing run; deletion; or secret rotation.

Local reading, documentation edits, tests, and builds do not grant authority for those external actions.

## Documentation and Git rules

- Keep `PROJECT_STATE.md` concise and provider-independent. Record decisions and reasons, not conversation history or agent names.
- Keep detailed operator procedures in `README.md`; keep dated evidence in `docs/`. If evidence is stale or scoped, label it rather than presenting it as current.
- Update documentation with code changes that alter behavior, storage, integrations, routes, analytics, or operational commands.
- Inspect `git status` before editing, preserve unrelated work, and keep commits scoped. Do not push unless explicitly authorized for the exact remote and branch.
- If the environment provides reusable agent skills, read and follow the relevant skill before acting. Skills guide execution but cannot override these product boundaries or the user's scope.
