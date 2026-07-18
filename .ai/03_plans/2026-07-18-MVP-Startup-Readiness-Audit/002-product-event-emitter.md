# UNIT-002 · Product-event emitter + 8 events

- **Requirement:** REQ-002
- **Priority:** P0 · **Effort:** S–M · **Risk:** LOW · **Status:** PLANNED
- **Depends on:** UNIT-001
- **Evidence:** EVID-002

## Goal

From the first visitor, Philip can see funnel events in D1. GA4 stays as the
landing-page pageview/A-B tracker; the new emitter covers activation-funnel
and reuse events.

## Source evidence (commit `a41a07d01`)

- `package.json:140` — `"@next/third-parties": "^16.2.10"` declared.
- `src/components/landing/LandingAnalyticsLoader.tsx:3,20,27` — imports
  `GoogleAnalytics` from `@next/third-parties/google`; mounts
  `<GoogleAnalytics gaId={gaId} />` gated on `NEXT_PUBLIC_GA_MEASUREMENT_ID`.
- `src/lib/ab-testing/experiment-tracker.ts:29-78` — `trackExperimentView`
  and `trackConversion` fire GA4 events but only for A/B variants on landing.
- Negative grep for `trackEvent|logEvent|recordEvent|identify(`/`/api/track`/
  `/api/events` over `src/components src/hooks src/app` → only
  `perf/server-timing.ts:44` (internal perf trace) and the A/B tracker above.
- The activation ledger (`src/lib/onboarding/activation-types.ts:1-14`) has a
  typed 12-milestone taxonomy covering in-product events; it is not emitted
  to any external analytics sink and covers no landing-side or reuse-side
  events.
- `src/app/api/share/[token]/events/` exists but is **empty** (no `route.ts`).
- `package.json` has no PostHog / Mixpanel / Plausible / Sentry SDK.

So: GA4 IS wired for landing pageviews and A/B variant events; the gap is
first-party activation/reuse funnel events.

## Implementation

- Migration `00XX_product_events.sql`:
  `product_events` table — `id, event_name, actor_user_id NULL,
  actor_email NULL, workspace_id NULL, session_id NULL, source_cta NULL,
  properties_json, created_at`. Index on `event_name, created_at`.
- `src/lib/analytics/product-event.ts` — helper `recordProductEvent(name,
  props)` writing via deferred `fetch('/api/internal/product-event', …)` or
  `after()` server call.
- `src/app/api/internal/product-event/route.ts` — POST handler with
  same-origin CSRF, rate limit, PII rules per `03-…md` §C.
- Emit the 8 events (single producer each; do not double-emit):
  - `landing_cta_click` — `LandingCTAs.tsx` onClick.
  - `access_request_submitted` — `submitAccessRequest` action (UNIT-001).
  - `access_request_qualified` — admin status update.
  - `invite_accepted`, `project_created`, `first_valid_total`,
    `export_completed`, `publication_created` — mirror of existing
    activation-milestone producers.

## Acceptance evidence

- Each event lands in D1 with correct props.
- PII rules honored (email operational; IP salted-hashed only).
- Events fire on the actual user action, not on render.

## Test decision

`test_requirement: NOT_REQUIRED`. Source-diff + scoped manual event fire
proves correctness. `TEST_PROPOSAL`: running the existing activation tests
(`CHEAPEST_DECISIVE_EXISTING_TEST`) after mirror events land would prove the
funnel counter advances at each milestone; risk: silent event-loss is the
class of bug a unit test catches and static review misses.

## Recovery

If the action throws, the event is dropped (not retried) — events are
best-effort telemetry, not transactional. Log via the existing structured
logger. The user flow that triggered the event is unaffected.

## Completion signal

Submitting each user action produces a `product_events` row within seconds.
`/admin` Beta health card surfaces per-event counts.
