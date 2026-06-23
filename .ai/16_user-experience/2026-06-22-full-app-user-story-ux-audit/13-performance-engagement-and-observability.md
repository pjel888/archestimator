# Performance, Engagement, And Observability

Date: 2026-06-22

This document is the packet's deep engagement on performance, speed, observability, and telemetry — the dimensions the original packet treated most thinly (re-audit gaps D and E). It binds the beta plan to the repository's **known** performance root causes (which the packet ignored), and defines an outcome-metric instrumentation plan (which was missing — the existing "Outcome Metrics" table in `01-beta-product-thesis-and-prioritization.md` pointed at behavior tests, which prove a path *exists*, not that a metric *value* was measured).

## Purpose And Relationship To Doc 06

`06-verification-matrix-and-proof-runbook.md` keeps a compact "Performance And Network Budgets" table that lists one proof expectation per surface. That table is the canonical quick-reference. This document is the **deep engagement**: it names the four known root causes, the exact scripts to run before and after touching each hot surface, the numeric budgets (where they can be set), the outcome-metric instrumentation plan, and the residuals that cannot be 100%-closed as planning.

The two documents are complementary:

- Doc 06 — one-row budget/proof expectation per surface (compact, lookup-oriented).
- Doc 13 (this) — root-cause detail, before/after scripts, numeric thresholds, outcome-metric capture plan, and named residuals (deep, decision-oriented).

When doc 07 adds its new performance-risk section, it should reference the "Performance-Risk Handoff Map" below.

## Known Performance Root Causes

These are cited from the project memory and plan packs. They are **not** re-derived here. Each is a planning-acknowledged reality that constrains what a planning packet can honestly claim about performance before a live, in-region deploy with beta traffic.

| # | Root cause | Plan pack / memory pointer | Applicable script(s) |
|---|---|---|---|
| (a) | Estimate sheet skeleton cascade: a 6-layer skeleton stack, a missing leaf `loading.tsx` (list-skeleton flash on the node route), and a 5-RTT serial server path. | `.ai/03_plans/2026-06-21-Estimate-Sheet-Loading-Perf` (plan pack). Memory: "Estimate sheet loading perf plan". | `tests/vitest/estimate-sheet-large-data-budgets.test.ts`; route transition scripts below. Lowest-risk fix = add/ensure `src/app/workshop/projects/[projectId]/estimates/[nodeId]/loading.tsx`. |
| (b) | Hero / auth path slowness is **network-bound** (dev client -> hosted Supabase RTT, 0.3–5 s per call), not a code defect. In-region DB is <1 ms. Must be measured on Vercel in-region, not locally. | Memory: "Hero-path perf is network-bound". Runbook in the 2026-06-20 Hero-Path plan pack. | `scripts/bench-hero-browser.mjs` (browser); `scripts/bench-hero-server.mjs` (server-side). |
| (c) | Workshop dashboard query batching: the dashboard issues multiple Supabase round-trips; batching the serial tail (not the already-parallel parts) is the efficacy finding. | `.ai/03_plans/2026-06-19-Workshop-Dashboard-Query-Batching` (plan pack). Memory: "Workshop dashboard query-batching plan". | `scripts/measure-workshop-dashboard-query-count.ts` (package script `perf:dashboard-query-count`). |
| (d) | Deferred liquid-glass blur: glass surfaces paint blur-OFF first, then arm blur after first paint + idle via `<html data-glass="ready">` and the animatable `@property --glass-blur-amount`. This avoids blur cost on the first frame. | Memory: "Deferred liquid-glass blur". Code: `src/app/globals.css` (`@property --glass-blur-amount`, `:root[data-glass="ready"]`). | No dedicated script; verified via trace / first-paint inspection. |

Supporting facts (cite by name, do not re-derive):

- **Rate limiting is Postgres-native (NOT Redis).** `checkAiAskQuota` (10/min, 60/hr) in `src/lib/ai/rate-limit.ts` is the AI limiter. `DEC-UX-RL-QUOTAS` accepts Policy B (share comments and decisions first), and current source also includes broader durable limiter scopes on share/invite/landing paths. Preserve existing limiter coverage before changing quotas.
- **Vercel Web Analytics + Vercel Speed Insights are already wired** in `src/app/layout.tsx` (`<VercelWebAnalytics />` and `<SpeedInsights />`). (There is no Next.js `reportWebVitals` instrumentation in this app — a prior draft of this doc named it; it is not present.) The analytics component (`src/components/analytics/VercelWebAnalytics.tsx`) wraps `@vercel/analytics/next` `<Analytics>` with a `beforeSend={redactVercelAnalyticsEvent}` redaction hook (defined in `src/lib/analytics/vercel-web-analytics.ts`) — so there is already a redaction seam for any future custom-event capture. This means the *plumbing* for Core Web Vitals collection exists; the *values* require live beta traffic (residual).

## Numeric Performance Budgets

Where a threshold is already published in the repo, it is cited. Where a threshold cannot be set without a live measurement on the hosted target, it is marked `deferred-to-runtime` and listed as a residual — no synthetic number is invented.

| Surface | Metric | Threshold / budget | Measuring command | Owner TV-* | Status |
|---|---|---|---|---|---|
| Estimate sheet (large fixture) | TTI / render budget on large data | `deferred-to-runtime`: establish hosted baseline first. The test asserts a budget fixture exists; the **numeric** TTI target needs a live in-region measurement. | `bunx vitest run tests/vitest/estimate-sheet-large-data-budgets.test.ts` | `TV-ESTIMATE-SHEET` | Budget test exists; numeric TTI target deferred-to-runtime (residual). |
| Estimate sheet | Leaf loading state present (no list-skeleton flash) | `loading.tsx` present on `[nodeId]` route | Inspect `src/app/workshop/projects/[projectId]/estimates/[nodeId]/loading.tsx` | `TV-ESTIMATE-SHEET` | Present. (Was the lowest-risk fix in root cause (a).) |
| Project dashboard | Supabase round-trips per dashboard load | `<= K` where K is the pre-change count reported by the measure script; no regression without an owner-approved batching change | `bun run perf:dashboard-query-count` (runs `scripts/measure-workshop-dashboard-query-count.ts`) | `TV-PROJECT-DASHBOARD` | No-regression contract; absolute ceiling `deferred-to-runtime`. |
| Route transitions | No regression after a route-flow change | No previously-green transition newly fails / regresses beyond prior baseline | `bun run perf:check-routes`; `bun run perf:measure-routes` | All route-owning TV-* | No-regression contract. |
| Proposal export | Export preflight + workbook build time on large model | Build completes within script's own budget assertion; no overflow | `bun run scripts/benchmark-proposal-workbook.ts` | `TV-ESTIMATE-SHEET` / export proof | Script exists; absolute ceiling `deferred-to-runtime`. |
| Share activity | Large history activity load time | Build completes within script's own budget assertion | `bun run scripts/benchmark-shared-link-activity.ts` | `TV-SHARE-RECIPIENT` | Script exists; absolute ceiling `deferred-to-runtime`. |
| All web surfaces | LCP | `<= 2500 ms` ("good" threshold) | Vercel Speed Insights (live); readiness check `bun run perf:check-speed-insights` (`scripts/check-vercel-speed-insights-readiness.ts`) | Cross-cutting | Threshold published in `scripts/check-vercel-speed-insights-readiness.ts`; **value** requires live beta traffic (residual). |
| All web surfaces | INP | `<= 200 ms` ("good" threshold) | Vercel Speed Insights (live) | Cross-cutting | Threshold published; value deferred-to-runtime (residual). |
| All web surfaces | CLS | `<= 0.1` ("good" threshold) | Vercel Speed Insights (live) | Cross-cutting | Threshold published; value deferred-to-runtime (residual). |
| All web surfaces | FCP / TTFB (supporting CWV) | FCP `<= 1800 ms`; TTFB `<= 800 ms` | Vercel Speed Insights (live) | Cross-cutting | Threshold published; value deferred-to-runtime (residual). |
| JS bundle | Bundle-size ceiling | `deferred-to-runtime`: no published ceiling in repo. Establish baseline on hosted build first; gate thereafter. | `next build` build output; (no dedicated bundle-budget script today) | Cross-cutting | Residual. |

Notes:

- The CWV thresholds (LCP 2500 / INP 200 / CLS 0.1 / FCP 1800 / TTFB 800) are **published constants** in `scripts/check-vercel-speed-insights-readiness.ts` (`SPEED_INSIGHTS_GOOD_THRESHOLDS`). They are the authoritative source — this doc does not re-invent them.
- For every row marked `deferred-to-runtime`, the **contract** (what to measure, how, against what script/threshold) is planning-complete; the **number** is not, because it needs a live in-region deploy with beta traffic. That gap is named in "Residuals" below, not fake-claimed.

## Performance-Risk Handoff Map

For each hot TV-* surface, the risk to watch, the script to run **before and after** editing, and the pointer doc 07's new perf-risk section should cite. Run the script *before* to capture a baseline, and *after* to prove no regression.

| Hot surface | Known risk | Run before AND after editing | Plan pack / memory pointer |
|---|---|---|---|
| `TV-ESTIMATE-SHEET` | Skeleton-cascade regression; leaf-list skeleton flash if `loading.tsx` is removed; serial-server RTT creep; large-data render blowup. | `bunx vitest run tests/vitest/estimate-sheet-large-data-budgets.test.ts`; `bun run perf:check-routes` for the `[nodeId]` transition. | `.ai/03_plans/2026-06-21-Estimate-Sheet-Loading-Perf`; memory "Estimate sheet loading perf plan". |
| `TV-PROJECT-DASHBOARD` | Dashboard Supabase round-trip count regression when dashboard data composition changes. | `bun run perf:dashboard-query-count` (capture count before; assert `<=` that count after). | `.ai/03_plans/2026-06-19-Workshop-Dashboard-Query-Batching`; memory "Workshop dashboard query-batching plan". |
| `TV-AUTH` / hero | Hero/auth TTI mis-attributed to code when it is dev->hosted-Supabase RTT; must be measured on Vercel in-region, not locally. | `scripts/bench-hero-browser.mjs` (browser TTI); `scripts/bench-hero-server.mjs` (server RTT). **Run on hosted target**, not localhost, for any number that will be quoted. | Memory "Hero-path perf is network-bound"; runbook in the 2026-06-20 Hero-Path plan pack. |
| `TV-SHARE-RECIPIENT` | Large share-activity history render cost; export preflight cost on large proposals. | `bun run scripts/benchmark-shared-link-activity.ts`; `bun run scripts/benchmark-proposal-workbook.ts`. | Doc 06 "Performance And Network Budgets" (export/share rows); scripts self-assert a budget. |

Cross-cutting guidance: any change that touches glass surfaces should confirm blur still arms after first paint (`data-glass="ready"` / `@property --glass-blur-amount` in `src/app/globals.css`) so the first-frame paint cost does not regress — root cause (d).

## Outcome-Metric Instrumentation Plan

The "Outcome Metrics" table in `01-beta-product-thesis-and-prioritization.md` lists five outcomes but points its "Evidence source" column at behavior tests (TV-*). Behavior tests prove a **path exists** and behaves correctly; they do **not** yield a metric **value** (a time, a rate, a count). Closing that gap requires live instrumentation plus beta traffic. `DEC-UX-ANALYTICS` is accepted: use Vercel Web Analytics + Speed Insights now, and use minimal Postgres rows only for core product/operator events that need queryable support or audit.

| Metric (outcome from doc 01) | Funnel steps / event names | Capture mechanism | Sink | Decision-ledger ref |
|---|---|---|---|---|
| First estimate — time from sign-in to editable estimate | `auth_signin_success` -> `project_opened` -> `estimate_opened` -> `estimate_first_edit` | Vercel Web Analytics custom events via the existing `beforeSend` redaction seam; wall-clock span between first and last event. | Vercel Web Analytics. | `DEC-UX-ANALYTICS` |
| First estimate — failed-save rate | `estimate_save_attempt` / `estimate_save_failed` / `estimate_save_succeeded` | Client event on save action outcome (existing error/pending state from `TV-ESTIMATE-SHEET` is the trigger surface). Rate = failed / (failed + succeeded). | Vercel Web Analytics; Postgres only if support diagnosis requires queryable audit. | `DEC-UX-ANALYTICS` |
| First estimate — user-visible recovery count | `recovery_action_presented` / `recovery_action_taken` | Client event when a recovery affordance (retry / restore / address-only fallback) is shown and when it is clicked. | Vercel Web Analytics. | `DEC-UX-ANALYTICS` |
| Proposal / share trust — share open success, recipient action success, expired/locked recovery success | `share_opened` / `share_open_failed` / `recipient_decision_recorded` / `expired_recovery_succeeded` | Existing/minimal publication event rows for server-side share outcomes; Vercel only for redacted client path events that do not expose tokens or raw IDs. | Postgres for support/audit outcomes; Vercel for redacted client funnels. | `DEC-UX-ANALYTICS`; `DEC-UX-RL-QUOTAS` Policy B. |
| Supportability — denied-access repairs resolved, invite repair time, feedback > latest-50 reachable, provider checks pass/fail/blocked | `access_denied_repaired` / `invite_repair_started` / `invite_repair_resolved` / `provider_check_result` (per `TV-OPS-SUPPORT` runbook rows) | Server log / operator action audit (operator-facing, not end-user analytics). Invite repair time = wall-clock between start/resolved. | Postgres (operator audit) — NOT end-user analytics. | `DEC-UX-ANALYTICS` (sink posture); `TV-OPS-SUPPORT` runbook in doc 06. |
| Cost confidence — stale/conflicted cost surfaced before insert; accepted source visible; attachment currentness clear | `stale_cost_surfaced` / `accepted_source_shown` / `attachment_currentness_shown` | Client event only if the affordance is a beta outcome metric; sample or defer if identifiers cannot be redacted safely. | Vercel Web Analytics if redacted; Postgres only if cost-governance audit is required. | `DEC-UX-ANALYTICS`; `DEC-UX-DATA-CLASSIFICATION` if any cost/source identifier is sensitive. |
| Proof honesty — no row marked proven without matching evidence artifact | (not a funnel metric) | CSV schema validation (the 4 ruby validators) + `06-verification-matrix-and-proof-runbook.md` evidence rules. | CSV + proof artifacts (not an event stream). | (none — this is a planning-artifact control, not telemetry). |

Explicit constraints on this plan:

- **Behavior tests (TV-*) prove the path EXISTS, not the metric VALUE.** Metric values require live instrumentation + beta traffic and are a named residual below.
- **Provider/sink choice is accepted** (`DEC-UX-ANALYTICS`): client/performance instrumentation uses Vercel Web Analytics + Speed Insights; operator/support/audit outcomes use minimal Postgres rows only when queryable support evidence is required.
- **Redaction is mandatory before event emission**: any custom event routed through `<Analytics beforeSend={redactVercelAnalyticsEvent}>` must not include tokens, emails, user IDs, project IDs, raw entity IDs, addresses, proposal contents, or free text. Do not bypass the redaction seam for ad-hoc telemetry. Sensitive identifiers remain advisory-only until a real redaction guard exists → `DEC-UX-DATA-CLASSIFICATION`.
- **i18n/localization of any user-facing metric copy is deferred** for closed beta → `DEC-UX-I18N`.
- Rate-limit quota edits must preserve existing Postgres durable limiter coverage and follow accepted `DEC-UX-RL-QUOTAS` Policy B.

## Residuals That Cannot Be 100% As Planning

These are the performance/observability items a planning packet **cannot** close, because they require a live in-region deploy with real beta traffic. The packet specifies the **contract** (what to measure, how, against which script/threshold) but cannot yield the **number**. Each is named honestly rather than fake-claimed.

| Residual | Why it cannot be closed as planning | Contract that IS planning-complete |
|---|---|---|
| Live hero/auth RTT and TTI | Root cause (b): the number is dev->hosted-Supabase RTT locally; the real number is only valid measured on Vercel in-region. | Measure via `scripts/bench-hero-browser.mjs` / `bench-hero-server.mjs` on the hosted target. |
| Real-user Core Web Vitals (LCP / INP / CLS / FCP / TTFB) | Require live beta users hitting the deployed app; Speed Insights only reports with traffic. | Thresholds published in `scripts/check-vercel-speed-insights-readiness.ts`; Speed Insights + Web Analytics already wired in `src/app/layout.tsx`; readiness via `bun run perf:check-speed-insights`. |
| Estimate-sheet hosted TTI on large fixture | Requires the hosted target + a seeded large fixture in-region; local TTI is dominated by dev-mode and network RTT, not representative. | Budget test `tests/vitest/estimate-sheet-large-data-budgets.test.ts` asserts a fixture; absolute TTI target `deferred-to-runtime`. |
| Outcome-metric values (first-estimate time, failed-save rate, recovery count, share trust, supportability times, cost-confidence affordance rates) | Behavior tests prove the path exists, not the value. Values require live instrumentation + beta traffic. | Event shape, capture mechanism, and accepted sinks specified in the table above; values deferred to runtime. |
| Liquid-glass arming cadence under real load | Blur arms after first paint + idle; the perceptible cadence depends on real device load and frame timing, not a local trace. | `data-glass="ready"` + `@property --glass-blur-amount` contract in `src/app/globals.css`; verified via first-paint trace / CWV (CLS) on hosted target. |
| Bundle-size ceiling | No published ceiling in repo; establishing one needs a representative hosted build baseline first. | `next build` output; (no dedicated bundle-budget script today — candidate follow-up). |

Honesty note: none of the above residuals is an execution-pass claim. The packet asserts that the **instrumentation plumbing exists** (layout wiring, redaction seam, Speed Insights readiness script, benchmark scripts, budget test) and that the **contracts are specified**; it does not assert that any metric value has been observed. Driving these from `deferred-to-runtime` to a real number is a beta-execution task, not a planning task.
