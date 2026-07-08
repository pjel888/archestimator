# 05 — UX/UI/Accessibility Plan — Production RUM And CWV Telemetry

## Applicability

This pack adds **no user-visible UI** in v1. The RUM client component is
non-visual (it registers listeners and sends beacons). The dashboards are
operator-facing Cloudflare/Analytics Engine surfaces, not in-app UI. The privacy
notice is a content update to an existing page.

Per AGENTS.md proportional verification: cosmetic/content changes do not
automatically require browser proof. The only browser-only claim is "a beacon
fires on a real public page load" (TEST-03) and "bfcache is preserved" (TEST-04).

## User journeys affected

- **End user (landing/public)** — no perceptible change. The managed beacon and
  the first-party beacon are silent; no new UI; no new consent prompt (managed
  beacon reuses existing consent gate).
- **End user (workshop)** — no perceptible change pending `OPEN-CONSENT-01`.
  After enablement: silent first-party beacon; route-bucketed; no UI.
- **Operator** — gains dashboards + alert queries (operator-facing, not in-app).

## UI states

None new. The privacy-notice page has its existing states (loading/empty/error
inherited from the route group); the content update must not break them.

## Accessibility

- The RUM component renders nothing to the DOM tree that assistive tech
  traverses (no visible nodes; listeners only). It must not introduce focus
  traps, keyboard handlers, or live regions.
- The privacy-notice content update must keep heading hierarchy, contrast, and
  semantic markup consistent with the existing page.
- No new icons, motion, or color cues are introduced.

## Reduced motion / responsive

N/A — no visual/interactive surface added.

## Design-system reuse

No new primitives. The privacy-notice edit uses existing typography/layout
tokens. DESIGN.md is alpha-stage guidance and is not blocked on this pack.

## UX regressions to watch

- **Perceived latency.** The beacon is fire-and-forget with `keepalive`; it must
  not block navigation or hydration. TEST-04 (bfcache) + the existing perf spec
  guard this.
- **Consent surprise.** A user who previously declined analytics must not see
  the managed beacon load. PRIV-06 preserves the existing gate.

## Browser proof boundary (proportional)

- **Proven by static/unit/DOM:** sender logic, sampler, route bucket, payload
  schema, route handler gates, no-IP, no-auth-state, AE write shape, cron
  rollup, privacy-notice content.
- **Requires browser proof:** (1) a real beacon fires on a public page load
  end-to-end (TEST-03); (2) bfcache preserved (TEST-04). Both are scoped
  targeted Playwright runs, not full visual QA.

## N/A dimensions (with reason)

- Keyboard/focus/screen-reader semantics: N/A — no new interactive surface.
- Responsive layout: N/A — no new layout.
- Localization: the privacy-notice edit is English-only (matches current); if
  i18n is added later, the telemetry disclosure must be translated too. Not a
  v1 blocker.
