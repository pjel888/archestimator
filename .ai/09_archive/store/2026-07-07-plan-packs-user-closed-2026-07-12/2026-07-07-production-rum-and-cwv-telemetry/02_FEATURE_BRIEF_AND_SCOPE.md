# 02 — Feature Brief And Scope — Production RUM And CWV Telemetry

## Source brief

Verbatim from `PROMPT.md` (the authoritative FEATURE BRIEF for this pack):

> **Goal.** Create a plan pack for privacy-safe real user monitoring and Core
> Web Vitals telemetry that fits the current Cloudflare/free-tier posture.
>
> **Evidence To Start From.**
> - `src/lib/perf/server-timing.ts` and performance scripts provide server/test signals.
> - Production user-experience telemetry and CWV collection are not clearly implemented as a durable product signal.
> - Bundle/route performance gates cover synthetic checks; this pack should cover real-user signal, sampling, privacy, and actionability.
> - Observability plans cover server/runtime monitoring but not browser UX telemetry.
>
> **Required Plan Pack.** Define metrics, collection point, sampling,
> consent/privacy posture, storage/retention, dashboard format, alert
> thresholds, no-paid-option evaluation, and how CWV evidence informs release decisions.
>
> **Constraints.** Avoid collecting personal content or secrets. Do not add paid
> tooling by default. Treat this as independent from synthetic performance gates.
>
> **Stop Condition.** The pack is complete when an executor can implement useful
> RUM/CWV telemetry without overbuilding or violating privacy constraints.

## Scope — in scope

1. **Metrics set.** Core Web Vitals (LCP, INP, CLS) plus supporting vitals
   (TTFB, FCP). INP (not FID). Rating classification comes from `web-vitals` v5.
2. **Collection point.** A single client instrumentation component mounted in
   `src/app/providers.tsx` (global) using the `web-vitals` npm package v5; the
   existing dev-only `WebVitalsProbe` is left unchanged.
3. **Transport.** `navigator.sendBeacon` primary, `fetch(..., {keepalive:true})`
   fallback, flushed on `visibilitychange` (`document.visibilityState === 'hidden'`)
   and `pagehide` — never `unload`.
4. **Sampling.** Configurable client-side rate, default 10% via
   `NEXT_PUBLIC_RUM_SAMPLE_RATE` (0.0–1.0). Server-side capped admission as a
   second defense.
5. **Consent/privacy posture.** Cookieless, sampled, route-bucketed, no PII,
   no IP logging. Landing/public: also Cloudflare Web Analytics beacon (free,
   cookieless, CWV-capable). Workshop: first-party sink only, pending
   `OPEN-CONSENT-01`.
6. **Storage/retention.** Workers Analytics Engine primary sink (~90-day
   retention, free, 100K writes/day); optional D1 rollup table for longer
   windows + release-gate queries, with a daily retention cron.
7. **Dashboard format.** (a) Cloudflare Web Analytics Vitals Explorer for
   landing/public aggregate CWV; (b) Analytics Engine SQL API queries for
   first-party p75-per-(metric×route-bucket); (c) a small documented manual
   query/runbook. No new internal admin UI in v1.
8. **Alert thresholds.** p75 per metric per route-bucket over a 7-day window:
   LCP > 4.0s (Poor), INP > 500ms (Poor), CLS > 0.25 (Poor). Release-blocking.
9. **No-paid-option evaluation.** Document why SpeedCurve, Datadog RUM, New
   Relic, Akamai mPulse, Vercel Speed Insights (paid), Sentry Performance, and
   GA4 (cookieless-unfriendly) are rejected for the default path. See
   `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md`.
10. **Release-decision integration.** CWV p75 evidence feeds the launch
    readiness gate; a regression in p75 Poor-share blocks release.

## Non-goals (explicit)

- Not replacing/altering synthetic perf gates (`e2e/route-transition-performance.spec.ts`, `check-performance-budgets.mjs`, `perf:*` scripts). Independent and complementary.
- Not session replay, funnel/conversion/business-event analytics.
- Not collecting personal content, secrets, tokens, full URLs, query/fragment, IPs, user/account IDs, or free text.
- Not enabling Cloudflare paid add-ons.
- Not changing the `/api/internal/client-error` contract.
- Not doing nonce-CSP (owned by `2026-07-07-global-nonced-csp-enforcement`); coordinate only.
- Not doing server-side Worker Observability (owned by `2026-07-07-cloudflare-worker-production-observability-and-budgets` and `2026-07-07-observability-alert-proof-and-log-retention`); browser-RUM + first-party sink only.
- Not building a new internal admin UI/dashboard app in v1.
- Not adding Server-Timing HTTP header emission (the existing `src/lib/perf/server-timing.ts` is console-only and out of scope for this pack; `instrumentDatabaseFetch` is dead code and not revived here).
- Not collecting `request.cf` geo/colo/asn into the RUM sink in v1 (high-signal but re-identification risk; deferred — see `OPEN-PRIV-02`).

## Stop condition (for the planning task)

The planning task is complete when: the 22 documents exist; every PROMPT.md
"Required Plan Pack" item (metrics, collection point, sampling,
consent/privacy, storage/retention, dashboard, alerts, no-paid evaluation,
release-decision integration) is traceable to a requirement, an implementation
phase, a test, and a rollout check; the adversarial matrix is complete; two
critique cycles ran; and final emulated verification passed with no internally
resolvable P0/P1 gap.

## Stop condition (for the future implementation)

The implementation of the landing/public slice is complete when: CWV beacons
flow from real public page loads → `/api/internal/rum` → Analytics Engine;
Cloudflare Web Analytics receives data for landing; the privacy notice is
updated; the dashboard query returns sane p75 values; and the release-gate
query is wired. The workshop slice additionally requires `OPEN-CONSENT-01`
resolution before implementation begins.

## Out-of-scope items that look adjacent but are not

- **Server-Timing HTTP header.** `src/lib/perf/server-timing.ts` is console-only
  despite its name. Server-side request timing RUM is a separate effort and is
  not bundled here to keep blast radius small.
- **`request.cf` geo enrichment.** Tempting (colo/country/asn at the edge) but
  re-identification risk + D1/Analytics Engine cardinality cost. Deferred to
  `OPEN-PRIV-02`.
- **Real-time alerting webhook.** v1 uses periodic (cron-driven) threshold
  checks + manual dashboard review. Real-time push alerts (Slack/email on
  breach) are a future iteration once the sink is proven.
