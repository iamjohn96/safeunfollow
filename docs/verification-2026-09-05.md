# SafeUnfollow verification — 2026-09-05

## Scope

Local review and verification from commit `fdc44b9`. No public deployment, real purchase, customer email, or subscription change was performed.

## Changes prepared

- Premium restoration now requires a six-digit email code and creates a 30-day browser verification session. An email address alone can no longer query or restore entitlement.
- Subscription cancellation fails closed if `DODO_API_KEY` is absent. Local entitlement is not removed when provider cancellation cannot be confirmed.
- Browser-storage upload failures now show a storage error instead of claiming follower/following files are missing.
- Change-analysis copy now states that two dated exports are required; absolute “zero ban risk” claims were replaced with the factual “no account access” description.
- Dashboard and snapshot history explain that history is browser/device-local and can be lost after clearing site data, private browsing, or device changes.
- Privacy copy now separates local Instagram ZIP data from Premium/payment email, Redis entitlement/session records, Resend verification email, and analytics metadata.

## Automated verification

- `npm test`: 97/97 passing.
- `npm run lint`: passing.
- `npm run build`: passing; all 50 static pages generated and Premium API routes compiled.
- `git diff --check`: passing.
- Cancellation test confirms missing Dodo credentials never remove local access and PATCH success/404 behavior is handled.
- Premium access test confirms restore uses emailed proof plus a random browser session, and the public email query was removed.

## Browser verification

Chrome against the local production build:

- Home loaded with content, no framework overlay, and no console errors.
- Synthetic ZIP produced 2 following, 2 followers, 1 mutual, 1 one-way-out, and 1 followers-only result.
- First dated snapshot saved. A later synthetic ZIP produced 1 newly observed follower and 1 no-longer-observed follower.
- Free/Premium boundary showed change counts while keeping account lists locked.
- Incomplete ZIP showed the specific incomplete/unsupported export message.
- English, Portuguese, Russian, and Spanish home copy loaded.
- At a 390 × 844 viewport, home pages in all four languages plus upload, snapshots, and privacy had content and no horizontal overflow.

## Deliberately not performed

- Real Dodo charge, cancellation, refund, or webhook delivery.
- Real Resend email delivery or OTP receipt.
- Production Redis session creation and expiry.
- Monthly checkout destination verification; the earlier live-browser attempt was blocked by the browser extension and was not bypassed.
- Public deployment.

## Future funnel monitoring boundary

Automate: route availability, page text/prices, checkout link host/path, synthetic ZIP parsing, result counts, snapshot persistence, GA event emission, webhook signature/idempotency tests, mobile overflow, localization, and console/runtime errors.

Keep human-controlled: real card checkout and regional tax UX, verification-email inbox delivery, provider-side cancellation/refund confirmation, real Instagram export format changes, policy/legal review, and user trust/value judgment.
