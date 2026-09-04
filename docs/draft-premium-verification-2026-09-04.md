# Analysis draft and Premium verification — 2026-09-04

## Changes
- Persist profile label and valid export reference date in the existing current-ZIP cache.
- Match the ZIP fingerprint before writing, so a stale tab cannot replace a newer upload.
- Reject incomplete, impossible and future dates. Let the native date input retain partially entered segments rather than controlling them through React.
- Revalidate Premium against the existing API on mount, window focus and every 60 seconds. Fail closed on unavailable verification; never grant from the local boolean alone.
- No AI, new product features, pricing changes or production payment/configuration changes.

## Evidence
- Automated suite: 87 passed; lint and production build passed (48 pages).
- Chrome against the production build on localhost:3010: synthetic ZIP parsed; profile `qa_profile` and date `2026-08-01` survived reload and English → Portuguese navigation.
- Chrome date automation's `fill()` does not trigger the React change handler on its own. Real arrow-key changes and blur committed the date, then saving succeeded. Native partial input no longer resets on render.
- A second ZIP started with empty metadata, preventing silent reuse of the first export's date.
- Dedicated disposable Redis container, no network, accessed via a loopback-only REST adapter; no production credentials. Email delivery disabled.
- Signed synthetic subscription.active → actual local webhook route returned HTTP 200 / applied → actual Premium check route → browser email verification unlocked Premium.
- Second saved export (`2026-09-01`) showed observed gains 2, losses 1, net growth 1, mutual/following 100%, missing/previous followers 50%.
- Signed synthetic subscription.expired returned HTTP 200 / applied. Reload relocked comparison/CSV and snapshots page showed the free gate while preserving both saved snapshots.
- Redis integration: 14 assertions passed, including duplicate/reordered deliveries and old-subscription protection.
- No browser errors captured during verification.

## Limits
- No card entered, no real charge, no Dodo-hosted checkout completed in this run. The payment-provider boundary was represented by signed synthetic webhook events; this verifies application entitlement handling, not acquiring-bank processing.
- Desktop Chrome tested; no claim of iOS Safari or Android device verification.
