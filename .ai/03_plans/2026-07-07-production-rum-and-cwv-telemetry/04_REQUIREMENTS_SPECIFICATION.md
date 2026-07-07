# 04 — Requirements Specification — Production RUM And CWV Telemetry

Stable IDs. Priorities: `P0` release-blocking / privacy-critical, `P1` required for v1, `P2` nice-to-have / future. Every requirement maps through `16_REQUIREMENTS_TRACEABILITY_MATRIX.md`.

## Metrics (METRIC)

**METRIC-01 (P0) — Core Web Vitals: LCP, INP, CLS.** Collect LCP, INP, and CLS
on real page loads using the `web-vitals` npm package v5 (`onLCP`, `onINP`,
`onCLS`). Rationale: these are the three current Core Web Vitals (INP replaced
FID, March 2024). Source: PROMPT.md "Define metrics"; web.dev thresholds.
AC-METRIC-01a: payload contains `name` ∈ {LCP, INP, CLS}. AC-METRIC-01b: each
metric carries `value` (number), `rating` ∈ {good, needs-improvement, poor},
`id` (per-page-load nonce, NOT a user id), `delta`, `navigationType`.
Validation: unit test on the client payload builder; E2E proves a real beacon
contains all three over a navigation.

**METRIC-02 (P1) — Supporting vitals: TTFB, FCP.** Also collect TTFB and FCP
via `onTTFB`, `onFCP`. Rationale: diagnose LCP regressions; TTFB is the
server-side proxy. AC-METRIC-02a: payload may carry TTFB/FCP with the same
shape. Validation: unit test.

**METRIC-03 (P0) — Rating thresholds match official bands.** The `rating`
field must classify against the official thresholds: LCP good ≤2500ms /
needs-improvement ≤4000ms / poor >4000ms; INP good ≤200ms / ≤500ms / >500ms;
CLS good ≤0.1 / ≤0.25 / >0.25. Rationale: release gates and dashboards depend
on correct classification. AC-METRIC-03a: the client never overrides
`web-vitals`' `rating`; the server never recomputes it. Validation: unit test
asserting the rating is passed through unchanged.

## Collection point (COLLECT)

**COLLECT-01 (P0) — Single global client component.** Add one client
instrumentation component mounted in `src/app/providers.tsx` (the existing
global client mount, neighbor of `PerformanceMonitor`). Rationale: covers every
route (landing, workshop, share) from one place; no per-route wiring.
AC-COLLECT-01a: the component is a `"use client"` component imported and
rendered once in `AppProviders`. AC-COLLECT-01b: it is not mounted in
`global-error.tsx` (which has its own `<html>/<body>` outside providers — error
telemetry is already handled by `/api/internal/client-error`).
Validation: DOM test asserting the component renders within `AppProviders`.

**COLLECT-02 (P0) — web-vitals npm package, not Next built-in.** Use the
`web-vitals` npm package v5 (`^5`) for the production path, not `next/web-vitals`
`useReportWebVitals`. Rationale: explicit `visibilitychange`/`sendBeacon`
control, attribution build, version pinning. AC-COLLECT-02a: `package.json`
lists `web-vitals@^5`; the client imports from `web-vitals` (or
`web-vitals/attribution`). AC-COLLECT-02b: existing `WebVitalsProbe` is left
unchanged. Validation: `package.json` + import grep; `type-check`.

**COLLECT-03 (P1) — Attribution build optional.** The implementation MAY use
`web-vitals/attribution` for LCP-element/INP-target selectors in a later
iteration, but must ensure no PII (e.g., text content of the LCP element) is
sent. Rationale: attribution aids debugging but increases PII risk.
AC-COLLECT-03a: if attribution is used, only CSS-selector-like strings are sent,
never element text/HTML. Validation: unit test on attribution payload shape;
review gate.

## Transport (TRANSPORT)

**TRANSPORT-01 (P0) — sendBeacon primary, fetch keepalive fallback.** Use
`navigator.sendBeacon` when available, else `fetch(url, {method:'POST',
keepalive:true, ...})`. Rationale: both survive page unload; web.dev canonical.
AC-TRANSPORT-01a: the sender tries `sendBeacon` first; on failure or
unavailability, uses `fetch` with `keepalive:true`. AC-TRANSPORT-01b: never uses
the `unload` event. Validation: unit test with mocked `navigator.sendBeacon`
+ `fetch`.

**TRANSPORT-02 (P0) — Flush on visibilitychange/pagehide.** Send each metric as
it becomes ready, and ensure a final flush on `visibilitychange` (when
`document.visibilityState === 'hidden'`) and `pagehide`. Rationale: mobile/tab-
switch reliability; web.dev canonical. AC-TRANSPORT-02a: a listener is
registered for `visibilitychange` and `pagehide`; AC-TRANSPORT-02b: the listener
is removed on component unmount (cleanup). Validation: DOM test firing
`visibilitychange`.

**TRANSPORT-03 (P0) — POST to same-origin `/api/internal/rum`.** The endpoint
is same-origin; covered by `connect-src 'self'`. Rationale: no third-party
egress, no new CSP host. AC-TRANSPORT-03a: the URL is `/api/internal/rum`
(relative). Validation: unit test on sender URL; route exists (Phase 3).

**TRANSPORT-04 (P0) — POST body ≤8KB, JSON.** Single beacon is a small JSON
object; the client enforces ≤8KB before sending. Rationale: stay well under the
client-error route's 16KB cap; minimize mobile cost. AC-TRANSPORT-04a: a beacon
exceeding 8KB is dropped client-side with a debug log (never sent).
Validation: unit test with oversized payload.

## Sampling (SAMPLE)

**SAMPLE-01 (P0) — Configurable client-side sample rate, default 10%.** Gate
the beacon on `Math.random() < rate` where `rate` comes from
`NEXT_PUBLIC_RUM_SAMPLE_RATE` (0.0–1.0, default `0.1`). Rationale: stay under
Analytics Engine 100K writes/day free-tier ceiling at expected traffic; web.dev
treats sampling as a tool decision, 10–25% is the vendor-consensus default.
AC-SAMPLE-01a: with `rate=0`, no beacon is ever sent. AC-SAMPLE-01b: with
`rate=1`, every page load beacons. AC-SAMPLE-01c: the chosen `rate` (or the
fact of sampling) is **not** used to vary what data is collected, only whether.
Validation: unit test with seeded RNG.

**SAMPLE-02 (P1) — Server-side capped admission (second defense).** The route
handler independently admits at most `RUM_MAX_WRITES_PER_MIN` writes per minute
globally (in-memory, best-effort). Rationale: defense against a misconfigured
client rate or a bot. AC-SAMPLE-02a: above the cap, the handler returns 204
(silent success) and does **not** write to the sink. Validation: unit test on
the cap.

**SAMPLE-03 (P1) — Sample rate included in payload metadata.** Send
`sampleRate` in the beacon so server-side aggregation can upweight (multiply
counts by `1/sampleRate`). Rationale: correct p75 and Poor-share math under
sampling. AC-SAMPLE-03a: payload includes `sampleRate`. Validation: unit test.

## Consent / privacy (PRIV)

**PRIV-01 (P0) — Cookieless.** The RUM system writes no cookies, no
localStorage, no sessionStorage, no fingerprints. Rationale: ePrivacy
device-storage consent is not triggered; minimize surface.
AC-PRIV-01a: a DOM test asserts no cookie/localStorage write occurs during a
beacon. Validation: DOM test.

**PRIV-02 (P0) — No PII in payload.** Payload contains only: `name`, `value`,
`rating`, `id` (client-generated per-page-load random nonce, not a user id),
`delta`, `navigationType`, `routeBucket`, `sampleRate`, `clientTs` (ms epoch),
`appVersion` (optional). No full URL, no query, no fragment, no referrer, no
user/account/project/estimate ids, no IP, no UA string, no free text.
Rationale: PROMPT.md "Avoid collecting personal content or secrets"; GDPR
minimization. AC-PRIV-02a: a schema-validation unit test enumerates allowed
keys and rejects any extras. Validation: unit test (allowlist).

**PRIV-03 (P0) — Route bucketing / normalization.** `routeBucket` is produced
by an allowlist normalizer that: lowercases, collapses numeric/UUID-like path
segments to `:id`, strips trailing slashes, drops query and fragment, and
returns `unknown` if the path does not match a known shape. Rationale: workshop
URLs (`/workshop/projects/[projectId]/estimates/[nodeId]`) carry identifying
ids. AC-PRIV-03a: unit tests cover every real workshop + landing + share route
shape, asserting no raw id survives. AC-PRIV-03b: an unrecognized path yields
`routeBucket: "unknown"`, never the raw path. Validation: unit test table.

**PRIV-04 (P0) — No IP logging.** The route handler derives a rate-limit key
from `cf-connecting-ip` (header, model on `/api/internal/client-error`) but
never logs, persists, or echoes it. Rationale: IP is personal data.
AC-PRIV-04a: the IP string appears in no log line, no data point, no response.
Validation: unit test asserting the sink payload has no IP; review gate.

**PRIV-05 (P0) — No request.cf enrichment in v1.** `worker.ts`/the handler
must NOT read `request.cf` (colo/country/asn) into the sink in v1.
Rationale: geo is high-cardinality + re-identification risk; deferred to
`OPEN-PRIV-02`. AC-PRIV-05a: the handler does not reference `request.cf`.
Validation: grep + review gate.

**PRIV-06 (P0) — Landing/public: Cloudflare Web Analytics only with existing
consent.** The managed beacon loads on landing/public only via the existing
`LandingAnalyticsLoader` consent gate (`useLandingCookieConsent`).
Rationale: it is third-party (sends page URL to Cloudflare); keep it behind the
existing consent flow. AC-PRIV-06a: no change to consent gating; beacon still
requires `hasLandingAnalyticsConsent`. Validation: DOM test on the loader.

**PRIV-07 (P0) — Workshop: first-party sink only, never managed beacon.**
`/workshop/*` loads no Cloudflare Web Analytics/GA4/Clarity beacon; only the
first-party `/api/internal/rum` sink. Rationale: workshop URLs are potentially
identifying and not under our route-bucketing control for the managed beacon.
AC-PRIV-07a: grep confirms no managed-analytics script import in any workshop
component; the first-party sender route-buckets before send. Validation: grep
+ DOM test.

**PRIV-08 (P1) — Privacy notice update.** The privacy notice
(`src/app/privacy/…`) must disclose privacy-friendly aggregate performance
telemetry, what is collected, and that no cookies/PII are used. Rationale: GDPR
transparency even when no banner is needed. AC-PRIV-08a: the notice text is
updated and reviewed. Validation: review gate; content review by owner
(`OPEN-CONSENT-01`).

**PRIV-09 (P0) — Workshop RUM is owner-gated.** Workshop telemetry on
authenticated users requires an owner decision on permission + notice wording
(`OPEN-CONSENT-01`). Until resolved, the workshop slice is NOT implementation-
ready; the landing/public slice is. AC-PRIV-09a: the implementation plan
isolates workshop enablement behind the open decision. Validation: traceability.

## Storage / sink / retention (SINK)

**SINK-01 (P0) — Workers Analytics Engine primary sink.** Add an
`analytics_engine` binding `RUM` in `wrangler.jsonc`; the route handler calls
`env.RUM.writeDataPoint({...})` once per admitted beacon. Rationale: built for
time-series, free (100K writes/day), percentile-friendly. AC-SINK-01a:
`wrangler.jsonc` declares the binding; `cf:typegen` regenerates Worker Env
types; the handler writes a data point with `blobs`/`doubles`/`indexes` per the
Analytics Engine schema. Validation: `cf:typegen`; route unit test with a mocked
`env.RUM`.

**SINK-02 (P1) — D1 rollup for longer windows.** A daily Cron Trigger computes
p75 per (metric × routeBucket) for the last 7/28 days and writes a small number
of rollup rows to a new `rum_rollup` table in `ARCH_DB`. Rationale: Analytics
Engine ~90-day retention (UNCONFIRMED exact — `ASSUMP-04`) may be insufficient
for trend/release-gate windows; D1 rollup is cheap and queryable.
AC-SINK-02a: migration `0039_rum_rollup.sql` creates the table; the cron
handler writes rollups; a retention cron deletes rows older than `N` days.
Validation: migration SQL review; cron handler unit test.

**SINK-03 (P0) — Sink never receives PII.** The data-point schema stores only
`routeBucket`, `metric name`, `value`, `rating`, `navigationType`, `sampleRate`,
`clientTs` (or server ts), `appVersion`. No IP, no URL, no id beyond the
per-page-load nonce (which is not persisted as identifying). Rationale: PRIV-02
enforced at the sink boundary. AC-SINK-03a: the data-point writer allowlists
keys. Validation: unit test.

**SINK-04 (P0) — Free-tier budget alarm.** A daily query (cron or manual) checks
Analytics Engine write count vs the 100K/day ceiling and alerts (log/owner
review) before saturation. Rationale: free-tier overages silently drop data.
AC-SINK-04a: the query exists and is documented in the runbook.
Validation: runbook + query review.

## Dashboard (DASH)

**DASH-01 (P1) — Analytics Engine SQL API query for p75.** A documented
query/runbook computes p75 per (metric × routeBucket) over 7/28-day windows from
Analytics Engine. Rationale: the primary first-party dashboard. AC-DASH-01a:
the query is in the runbook and returns sane values against sample data.
Validation: runbook review; sample-data proof in implementation.

**DASH-02 (P1) — Cloudflare Web Analytics Vitals Explorer for landing.** The
managed dashboard surfaces landing/public aggregate CWV (LCP/INP/CLS) for free.
Rationale: zero-effort field CWV for public pages. AC-DASH-02a: Web Analytics
property exists and receives data (Phase 1 enablement). Validation: provider
proof (Cloudflare dashboard) — `OPEN-EVID-01`.

**DASH-03 (P2) — Optional internal admin view (future).** A small internal page
reading the D1 rollup. Out of scope for v1. Rationale: avoid overbuilding.
AC-DASH-03a: explicitly deferred. Validation: n/a.

## Alerts (ALERT)

**ALERT-01 (P0) — Release-blocking CWV thresholds.** A release gate treats a
route as failing when its 7-day p75 is in the Poor band: LCP > 4000ms, INP >
500ms, CLS > 0.25. Rationale: PROMPT.md "alert thresholds"; CrUX Poor band.
AC-ALERT-01a: the gate query returns pass/fail per routeBucket.
Validation: gate query + sample-data proof.

**ALERT-02 (P1) — Poor-share regression watch.** Track the share of page loads
in the Poor band per route; a >10pp jump over the prior 7-day window flags a
regression for review. Rationale: p75 alone misses distribution shifts.
AC-ALERT-02a: the query exists in the runbook. Validation: runbook review.

**ALERT-03 (P1) — Sink health alert.** If the daily write count drops to 0 while
traffic is non-zero, or spikes toward the free-tier ceiling, flag for review.
Rationale: silent data loss. AC-ALERT-03a: runbook documents the check.
Validation: runbook review.

## No-paid-option (COST)

**COST-01 (P0) — No paid tooling in the default path.** Document why SpeedCurve,
Datadog RUM, New Relic, Akamai mPulse, Vercel Speed Insights (paid), Sentry
Performance, and GA4 are rejected for the default path. Rationale: PROMPT.md
"Do not add paid tooling by default". AC-COST-01a: the decisions doc lists each
with a one-line rejection reason. Validation: doc review. See
`15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md`, `20_COST_MODEL_AND_PRICING_INPUTS.md`.

## Release-decision integration (REL-CWV)

**REL-CWV-01 (P0) — CWV evidence feeds the launch readiness gate.** The launch
readiness pack (`2026-07-07-launch-readiness-evidence-gate`) is augmented (or
referenced) so that a failing ALERT-01 gate blocks release. Rationale: PROMPT.md
"how CWV evidence informs release decisions". AC-REL-CWV-01a: the gate is named
in the launch readiness evidence set. Validation: cross-pack reference review.

## Security / abuse (SEC)

**SEC-01 (P0) — Same-origin + Fetch-metadata gate.** The `/api/internal/rum`
handler rejects cross-origin and disallowed Fetch-metadata requests, model on
`/api/internal/client-error`. AC-SEC-01a: unit test with cross-origin + bad
sec-fetch payloads returns 403/204. Validation: unit test.

**SEC-02 (P0) — Rate limit per IP.** In-memory rate limit (e.g. N/min per
`cf-connecting-ip`), model on client-error. The IP is used only as the key.
AC-SEC-02a: over-limit returns 204 and writes nothing. Validation: unit test.

**SEC-03 (P0) — Body cap + schema validation.** Reject bodies >8KB; validate the
JSON against the allowlist schema (PRIV-02); drop unknown keys. AC-SEC-03a:
oversized → drop; malformed → drop. Validation: unit test.

**SEC-04 (P0) — No auth required, but no auth-derived data.** The endpoint is
public (CWV must work on public/landing pages without a session), but it must
NOT read session cookies or auth state, and must NOT correlate to a user.
Rationale: keep the sink anonymous. AC-SEC-04a: the handler does not import auth
or session code. Validation: grep + review gate.

**SEC-05 (P0) — Injection-safe logging.** Any log line uses `consoleAppLogger`
with redaction (model on client-error); never logs the raw body or IP.
AC-SEC-05a: unit test on the logger path. Validation: unit test.

## Reliability / operations (REL)

**REL-01 (P0) — Best-effort, never user-blocking.** Beacon failures are silent
and never break the page or show UI. AC-REL-01a: sender wraps in try/catch and
returns silently. Validation: unit test throwing sendBeacon.

**REL-02 (P1) — Endpoint failure does not affect app.** `/api/internal/rum`
returning non-2xx is swallowed by the client. AC-REL-02a: unit test with 500
response. Validation: unit test.

**REL-03 (P0) — Bfcache-aware.** Because flush is on `visibilitychange`/`pagehide`
(not `unload`), bfcache is preserved. AC-REL-03a: the existing
`e2e/route-transition-performance.spec.ts` bfcache assertion still passes.
Validation: `test:e2e:perf`.

## Testing (TEST)

**TEST-01 (P1) — Unit tests for client sender, sampler, route-bucket normalizer, payload schema.** AC-TEST-01a: files exist and pass. Validation: `test:dom`.

**TEST-02 (P1) — Route handler unit tests: same-origin gate, rate limit, body cap, schema, sink write, no-IP.** AC-TEST-02a: files exist and pass. Validation: `bun test`.

**TEST-03 (P1) — E2E proves a real beacon flows end-to-end (client → route → mocked sink).** AC-TEST-03a: a Playwright spec intercepts `/api/internal/rum` and asserts a well-formed payload on a public page. Validation: targeted Playwright.

**TEST-04 (P1) — bfcache preserved.** AC-TEST-04a: existing perf spec bfcache test still green. Validation: `test:e2e:perf`.

## Documentation (DOC)

**DOC-01 (P1) — Runbook.** Operations runbook covering: dashboard queries, alert thresholds, sample-rate tuning, sink health check, privacy posture, rollback. AC-DOC-01a: file exists. Validation: doc review.

**DOC-02 (P1) — Privacy notice update.** AC-DOC-02a: covered by PRIV-08.

**DOC-03 (P2) — Architecture diagram.** AC-DOC-03a: Mermaid in `06_…`. Validation: doc.

## Shadow-path matrix (per flow)

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Beacon POST (client→route) | 204 + write DP | drop (no body) | drop (empty JSON) | drop (schema fail) | n/a (public, but cross-origin → 403) | swallowed, no UI | each beacon independent | idempotent (best-effort, no dedupe needed) | none (silent) | TEST-01/02 |
| Route→Analytics Engine | writeDataPoint ok | n/a | n/a | n/a | n/a | AE rejects/over-quota → log + 204 | AE handles | n/a | none | TEST-02 |
| Cron→D1 rollup | rollup rows written | no data → no-op | no data → no-op | n/a | n/a | D1 error → log + retry next day | single cron instance | idempotent by (day,metric,route) upsert | none | TEST-02 |
| Managed beacon (landing) | CF Web Analytics receives | consent=false → not loaded | n/a | n/a | n/a | network → silent | n/a | n/a | none | PRIV-06 |
