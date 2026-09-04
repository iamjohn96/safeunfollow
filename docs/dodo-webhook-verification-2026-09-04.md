# Dodo webhook verification — 2026-09-04

## Dashboard observation (read-only)
- SafeUnfollow endpoint: https://safeunfollow.com/api/webhook/dodo — enabled.
- Subscribed events: payment.succeeded, subscription.active, subscription.cancelled.
- Overview displayed no delivery attempts in the last 24 hours; the message attempt list was empty.
- Signing secret remained masked. No secret rotation, replay, test delivery, or configuration change was performed.
- This is not evidence that production signature verification or Redis connectivity works.

## Implemented
- Standard Webhooks library verification of raw body, message ID, timestamp and versioned signature. No legacy unsigned/header fallback.
- Exact event allowlists, subscription ID/email/timestamp/status validation.
- Grant: payment.succeeded (subscription-linked only; not payment-method setup or fully refunded), subscription.active, subscription.renewed.
- Revoke: subscription.cancelled, subscription.expired, subscription.failed, subscription.on_hold.
- Other events are acknowledged without changing entitlement.
- Atomic Redis entitlement update and 30-day delivery-ID deduplication.
- Retained latest event timestamps reject older events and same-time grants after revocation; cancellation of a different currently recorded subscription is ignored.
- Existing email-based Premium/renewal/subscription keys remain in use. This is not a multi-subscription-per-customer redesign.
- Persistence failure returns 503 for provider retry; notification failure cannot undo entitlement persistence.
- Welcome mail is attempted only for an applied subscription.active, with a bounded timeout and provider idempotency key. Email delivery is best-effort, not a durable outbox.
- No production customer records modified.

## Verified
- npm test: 84 passing.
- npm run lint: pass.
- npm run build: pass (local Redis credentials absent, warning expected).
- Dedicated network-isolated Redis 7 container: 14 assertions for apply, duplicate, revoke, stale/tied grant, different-subscription revoke, expiration. Synthetic data only; container removed afterwards.

## Remaining before claiming production readiness
1. Deploy the code, then add subscription.renewed, subscription.expired, subscription.failed and subscription.on_hold to the existing endpoint filters. Do not add them while the old broad event matcher is live.
2. Verify the configured production secret corresponds to this endpoint without exposing or rotating it unnecessarily.
3. Use a non-production destination/isolated storage for signed example events. Do not send grant examples into live customer storage or replay past events without checking their impact.
4. Verify successful provider delivery, Redis state, Premium restore, and cancellation UI end-to-end.
5. Existing browser isPremium cache is not continuous server-side entitlement enforcement; this patch does not redesign that mechanism.
6. Refund/dispute reconciliation, multiple simultaneous subscriptions per email, and durable welcome-email retries are not covered by this targeted patch.
7. Mobile/four-language Audience Insights browser verification remains separate and unfinished.

Sources:
- https://docs.dodopayments.com/developer-resources/webhooks
- https://docs.dodopayments.com/developer-resources/webhooks/intents/webhook-events-guide

