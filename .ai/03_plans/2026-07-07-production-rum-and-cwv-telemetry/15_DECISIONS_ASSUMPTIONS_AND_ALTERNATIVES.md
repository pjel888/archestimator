# 15 — Decisions, Assumptions, Alternatives — Production RUM And CWV Telemetry

## Decisions (load-bearing)

### DEC-01 — Use `web-vitals` npm v5, not Next `useReportWebVitals`
- **Problem.** Need explicit control over flush timing + transport for reliable
  field CWV.
- **Options.** (a) `web-vitals` npm v5; (b) Next `useReportWebVitals`.
- **Recommended.** (a).
- **Rationale.** Explicit `visibilitychange`/`sendBeacon` control, attribution
  build, version pinning, zero-dep ~2KB. `useReportWebVitals` is higher-level
  and tied to Next's reporting lifecycle.
- **Rejected alternative.** (b) — less control; tied to App Router internals.
- **Conditions to change.** If Next 16's built-in gains equivalent transport
  control and proven sendBeacon/keepalive, revisit.
- **Consequences.** One new dep (~2KB); existing `WebVitalsProbe` unchanged.

### DEC-02 — Analytics Engine primary sink; D1 secondary rollup
- **Problem.** Need a free, percentile-friendly, low-hot-path-cost sink.
- **Options.** (a) AE primary + D1 rollup; (b) D1 primary; (c) AE only; (d) KV.
- **Recommended.** (a).
- **Rationale.** AE is built for time-series + percentiles + free (100K/day);
  D1 rollup gives cheap long-window SQL without the per-row-scan cost on the hot
  path (the hot path is AE-only). KV is eventually-consistent cache only (AGENTS.md).
- **Rejected.** (b) D1 hot path → 5M reads/day burned by percentile scans; (c)
  AE-only → limited window; (d) KV → wrong tool, no aggregation.
- **Conditions to change.** If AE retention proves <30d and rollup cost grows.
- **Consequences.** One new binding + one small table + a daily cron.

### DEC-03 — Managed beacon on landing only; never workshop
- **Problem.** Workshop URLs carry identifying path params.
- **Options.** (a) landing only; (b) both with route-bucketing; (c) neither.
- **Recommended.** (a).
- **Rationale.** The managed beacon sends the page URL to Cloudflare outside our
  route-bucketing control; workshop URLs (`/workshop/projects/[projectId]/…`)
  are potentially identifying. Landing URLs are public marketing pages.
- **Rejected.** (b) — privacy risk; (c) — loses free CWV for landing.
- **Consequences.** Workshop gets first-party sink only.

### DEC-04 — 10% default sample rate
- **Problem.** Stay under AE 100K/day at expected traffic; web.dev treats
  sampling as tool-decided (10–25% vendor consensus).
- **Recommended.** 10%, env-configurable.
- **Consequences.** Aggregate math upweights by `1/rate` (SAMPLE-03).

### DEC-05 — Cookieless + sampled + route-bucketed + no PII posture
- **Problem.** Minimize legal + privacy surface.
- **Rationale.** Cookieless → no ePrivacy banner; aggregate → outside GDPR
  personal-data scope (privacy notice still required). This is the cleanest
  free-tier posture.
- **Consequences.** No per-user data; DSAR answer is "no personal data held".

### DEC-06 — Workshop RUM is owner-gated
- **Problem.** Authenticated-user telemetry needs permission + notice decision.
- **Status.** `OPEN-CONSENT-01`. Landing slice is implementation-ready now.

## Assumptions

- **ASSUMP-01** — Next 16 App Router + OpenNext on Workers supports a standard
  Route Handler at `/api/internal/rum` reading `request`/`env`. (Confirmed by
  the existing `/api/internal/client-error` route.)
- **ASSUMP-02** — `web-vitals` v5 works in the browser under React 19 + Next 16
  without special integration. (Standard; verify at impl with a smoke test.)
- **ASSUMP-03** — The Cloudflare account/Worker can create an Analytics Engine
  dataset under the free tier. (Confirmed by research; verify at Phase 4.)
- **ASSUMP-04** — AE retention ≈90 days. **UNCONFIRMED** from a single canonical
  citation. Operator confirms exact in dashboard.
- **ASSUMP-05** — The existing crons array has capacity for one more entry or a
  branch in `scheduled()`. (Verify at Phase 6 against wrangler/cron limits.)
- **ASSUMP-06** — In-memory rate-limit-per-isolate is acceptable for free-tier
  telemetry with the daily budget alarm as backstop.

## Alternatives rejected (COST-01 evidence)

| Tool | Status | Rejection reason |
|---|---|---|
| SpeedCurve | paid | no paid add-ons by default |
| Datadog RUM | paid | no paid add-ons by default |
| New Relic | paid | no paid add-ons by default |
| Akamai mPulse | paid | no paid add-ons by default |
| Vercel Speed Insights (paid) | paid | no paid add-ons; also non-Cloudflare host |
| Sentry Performance | paid (useful tier) | no paid add-ons by default |
| GA4 | free but not cookieless | GDPR/consent overhead; not cookieless-first |
| PostHog/Umami/Plausible (self-host) | free-ish but ops overhead | extra infra; AE+D1 already cover the need |
| `useReportWebVitals` only | free | less transport control (DEC-01) |
| D1 as primary sink | free | per-row-scan read cost (DEC-02) |
| Managed beacon on workshop | free | identifying URLs (DEC-03) |
| `request.cf` geo enrichment | free | re-identification + cardinality (OPEN-PRIV-02) |

## Future extensibility

- Geo enrichment (`OPEN-PRIV-02`) after a re-identification review.
- `web-vitals/attribution` debug data (selector-only).
- An internal admin dashboard view (DASH-03).
- Real-time push alerts (Slack/email) once the sink is proven.
- Server-Timing HTTP header (separate effort; revives the dead
  `instrumentDatabaseFetch`).
