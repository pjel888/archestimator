# 01 — Executive Summary — Production RUM And CWV Telemetry

## What this plan is

A planning-only, `exhaustive` plan pack that specifies how to add **privacy-safe
Real User Monitoring (RUM) and Core Web Vitals (CWV) telemetry** to Archestimator
on the current **Cloudflare free-tier** posture. No application code, tests,
migrations, or config is changed by this pack.

## The gap, in one sentence

Every CWV metric Archestimator measures in the browser today is thrown away —
`WebVitalsProbe` (`src/components/workshop/WebVitalsProbe.tsx`) is hard-gated to
`NEXT_PUBLIC_PERF_TRACE=1` and only `console.log`s, there is no `/api/rum`
ingestion route, no `sendBeacon`/`visibilitychange` flush, and Workers
Analytics Engine is not wired (`wrangler.jsonc` has observability but no
`analytics_engine` binding). Synthetic gates (`e2e/route-transition-performance.spec.ts`)
cover lab signal only.

## The solution, in one paragraph

Add a tiny client instrumentation component that uses the `web-vitals` npm package
(v5.3.0, `onLCP`/`onINP`/`onCLS`/`onTTFB`/`onFCP`) to collect CWV on real page
loads, applies a configurable client-side sample rate (default 10%), strips all
PII (sends only a **bucketed route**, metric `name`/`value`/`rating`,
coarse dimensions, a client-generated session-random nonce, and a timestamp),
and reports via `navigator.sendBeacon` (fallback `fetch(..., {keepalive:true})`)
on `visibilitychange`/`pagehide`. The beacon hits a new same-origin Route
Handler (`/api/internal/rum`) modeled on the existing `/api/internal/client-error`
handler (same-origin + Fetch-metadata gate, IP-derived in-memory rate limit, ≤8KB
body cap, redaction, structured logging). The handler writes a **Workers
Analytics Engine** data point via a new `RUM` binding (free-tier: 100K
writes/day, ~90-day retention). For landing/public pages, additionally enable
the already-wired **Cloudflare Web Analytics** beacon (free, cookieless,
CWV-capable) so the dashboard gets aggregate field CWV for free. Workshop pages
(`/workshop/*`) get the first-party sink only — never the managed beacon,
because workshop URLs carry `projectId`/`estimateId`/`nodeId` path params that
are potentially identifying and are not under our route-bucketing control. A
daily Cron Trigger rolls p75 per (metric × route-bucket) into a small D1 rollup
table for longer-window trending and release gates. Dashboards: Analytics Engine
SQL API + the Cloudflare Web Analytics Vitals Explorer. Alert thresholds (LCP
p75 > 4.0s = Poor, INP p75 > 500ms = Poor, CLS p75 > 0.25 = Poor) gate releases.

## Key decisions (full rationale in `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md`)

- **DEC-01** — Use the `web-vitals` npm package (v5), not the Next built-in
  `useReportWebVitals`, for the production path. Rationale: explicit
  `visibilitychange`/`sendBeacon` control, attribution build, and version pinning.
  `WebVitalsProbe` is kept as the dev-only console probe (unchanged).
- **DEC-02** — Workers Analytics Engine is the **primary sink** (built for
  time-series, free, percentile-friendly). D1 is a **secondary rollup store**
  only (longer windows, release-gate queries), behind sampling + a retention cron.
- **DEC-03** — Cloudflare Web Analytics beacon is enabled **on landing/public
  only** (free, cookieless, CWV-capable). It is **never loaded on `/workshop/*`**
  because workshop URLs are potentially identifying and the managed beacon sends
  the page URL to Cloudflare outside our route-bucketing control.
- **DEC-04** — Default client-side sample rate **10%**, configurable via
  `NEXT_PUBLIC_RUM_SAMPLE_RATE` (0.0–1.0). Keeps writes well under the 100K/day
  free-tier ceiling at expected traffic.
- **DEC-05** — Privacy posture: **cookieless, sampled, route-bucketed, no PII**.
  No cookies, no localStorage, no fingerprints, no IP logging (Worker drops the
  IP-derived key after rate-limiting), no raw URLs/query/fragment, no user IDs.
  Under ePrivacy this needs **no consent banner**; under GDPR a **privacy-notice
  update** is required (and workshop RUM on authenticated users is an
  owner-gated decision — see `OPEN-CONSENT-01`).
- **DEC-06** — Workshop RUM requires an **owner decision** on whether
  authenticated-user performance telemetry is permitted and on the exact
  privacy-notice wording (`OPEN-CONSENT-01`). Until then the pack is
  `CONDITIONALLY READY` for the workshop slice; the landing/public slice is
  implementation-ready.

## Critical risks (full register in `14_RISK_REGISTER.md`)

- **RISK-01 (High)** — Analytics Engine retention is widely cited as ~90 days
  but could not be pinned to a single canonical citation. Mitigation: D1 rollup
  for longer windows; operator confirms exact retention in dashboard before
  relying on a specific window.
- **RISK-02 (High)** — Route-bucketing bug leaks an identifying path param into
  the beacon. Mitigation: allowlist-based route normalization, unit tests on the
  normalizer, adversarial tests with real workshop URL shapes.
- **RISK-03 (Medium)** — Beacon volume spikes (viral traffic, bot) exceed
  100K writes/day free-tier ceiling and Analytics Engine silently drops data.
  Mitigation: client sampling + server-side capped admission + daily budget
  alarm query.
- **RISK-04 (Medium)** — Owner blocks workshop RUM on privacy grounds → only
  landing/public gets telemetry, reducing signal value. Mitigation: pack is
  structured so the landing slice lands independently.

## Cost posture

All-free-tier. No paid add-ons. Analytics Engine and D1 fit comfortably within
Workers Free limits at expected first-user traffic. Cloudflare Web Analytics is
free. The `web-vitals` package is free (Apache-2.0, zero deps, ~2KB brotli).
Cost detail in `20_COST_MODEL_AND_PRICING_INPUTS.md`.

## Readiness

**Status: `CONDITIONALLY READY`.** Overall 96/100. Capped by:
1. `verification_mode: emulated` (97 cap, `CONDITIONALLY READY` cap for
   high-blast-radius planning packages until independent/owner review).
2. `OPEN-CONSENT-01` — owner decision on workshop RUM privacy-notice wording and
   authenticated-user telemetry permission. Landing/public slice is
   implementation-ready now.

Implementation entrypoint: `11_IMPLEMENTATION_PLAN.md`. Phase order: Phase 0
(discovery/scaffold) → Phase 1 (Cloudflare Web Analytics landing enablement) →
Phase 2 (web-vitals client instrumentation) → Phase 3 (`/api/internal/rum` route)
→ Phase 4 (Analytics Engine binding + write path) → Phase 5 (route bucketing +
redaction hardening) → Phase 6 (D1 rollup cron) → Phase 7 (dashboards + alert
thresholds) → Phase 8 (release-gate integration) → Phase 9 (tests + runbook +
privacy notice).

## Confirmation

No application code, tests, migrations, `wrangler.jsonc`, `next.config.ts`,
`package.json`, or provider state was modified by this pack. All artifacts are
inside `.ai/03_plans/2026-07-07-production-rum-and-cwv-telemetry/`.
