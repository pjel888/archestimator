# 10 — Testing, Benchmarks & Readiness Evidence

One-line purpose: define how Archestimator's performance is measured, what evidence exists, what is missing, and what proof must be captured before any launch-readiness claim.

**Status:** AUDIT / PLANNING ONLY
**Date:** 2026-06-14
**Repo:** `/Users/philiplewis/archestimator` @ HEAD `3070c46c` (`main`)
**Dimension:** Testing, Benchmarks & Readiness Evidence

---

## 1. Dimension summary (honest posture)

The repo has a genuinely above-average, well-engineered perf-testing scaffold for an early-stage product: a parameterized CDP-throttled route-transition benchmark (`scripts/measure-route-transitions.ts`), a readiness gate (`scripts/check-route-transition-readiness.ts`) that scores benchmark JSON against thresholds, a Playwright evidence spec (`e2e/route-transition-performance.spec.ts`), a jsdom peak-load profile, a non-destructive seed manifest generator, a Vercel Speed Insights readiness checker, and dev-gated probes (`WebVitalsProbe` via `next/web-vitals`, `PerformanceMonitor`, `PERF_TRACE` server-timing).

What is missing or weak is the connection from this tooling to real launch decisions. The published budgets (`e2e/route-transition-performance-budgets.json`) are deliberately loose smoke budgets (public nav 15s, authed 10s, Slow3G 30s) that no real user would tolerate, and the readiness checker defaults to those same loose values — so `routeTransitionReady=true` proves nothing about user-facing speed. The benchmark only covers 3 public + 4 top-level workshop nav scenarios and explicitly does NOT exercise the heaviest initial-JS routes (estimate workspace, charts, project detail), so the routes most likely to be slow are unmeasured by the automated harness. The seed generator is manifest-only with NO Supabase write path, so there is no real large-data DB benchmark — all "peak load" evidence is synthetic jsdom render counts. RUM is not wired (no `@vercel/speed-insights` dependency; `WebVitalsProbe` only `console.log`s under `NEXT_PUBLIC_PERF_TRACE=1`), so the Speed Insights readiness script will fail-closed against zero provider data. CI exists as a file (`.github/workflows/ci.yml` runs validate+build+e2e+perf-smoke) but per the 2026-06-06 decision it is to remain disabled, and `gh` shows its last run was 2026-05-18 and FAILED — so no automated regression gate is actually active.

This session is BLOCKED for all live authed and production measurements (no dev server, dev-auth bypass off, no storage state).

**Honest posture:** solid lab plumbing, loose budgets not tied to launch, no live RUM, no real DB-scale benchmark, the slowest routes untested, and the two manual Chrome gates (bfcache persisted-restore, production React Profiler) still open. **No readiness claim is supportable from current evidence.**

---

## 2. Already implemented (do not re-recommend)

Reconciled against orchestrator ground truth (verified 2026-06-14 @ HEAD `3070c46c`). These exist and work; this document does not re-recommend them as missing.

| Capability | State | Where |
|---|---|---|
| Route-transition benchmark (CDP throttle, overlay rate, `_rsc` count, median over RUNS) | Implemented | `scripts/measure-route-transitions.ts` |
| Readiness gate scoring benchmark JSON to a boolean | Implemented (defaults LOOSE — see TG01) | `scripts/check-route-transition-readiness.ts` |
| Playwright perf evidence spec (public baseline, Slow3G, Link medians, bfcache, protected redirect, authed hover-prefetch) | Implemented | `e2e/route-transition-performance.spec.ts` |
| jsdom peak-load render profile | Implemented (synthetic only — see TG04) | `tests/vitest/route-transition-peak-load-profile.test.tsx` |
| Non-destructive seed manifest generator | Implemented (manifest-only — see TG04) | `scripts/seed-performance-test-data.ts` |
| Speed Insights readiness checker (fail-closed) | Implemented (no RUM to query — see TG03) | `scripts/check-vercel-speed-insights-readiness.ts` |
| Dev nav-timing probe (`console.log`, dev only) | Implemented | `src/components/performance-monitor.tsx` |
| Dev Web Vitals probe under `NEXT_PUBLIC_PERF_TRACE=1` | Implemented (console-only, no sink — see TG03) | `src/components/workshop/WebVitalsProbe.tsx` |
| Server-timing per-hop trace under `PERF_TRACE=1` | Implemented (console-only, no sink) | `src/lib/perf/server-timing.ts` |
| `@next/bundle-analyzer` wiring (`ANALYZE===\"true\"`) | Implemented (needs `--webpack`, not Turbopack — see TG11) | `next.config.ts` |
| Loose smoke budgets file | Implemented (labeled legacy smoke, not readiness) | `e2e/route-transition-performance-budgets.json` |
| `@vercel/analytics` Web Analytics (page views) | Implemented (NOT Speed Insights / RUM) | `src/app/layout.tsx`, `package.json` `@vercel/analytics ^2.0.1` |

Adjacent already-landed perf work (do not re-chase here): `proxy.ts` public-route early-return + marketing bfcache `Cache-Control` + CSP; `providers.tsx` QueryClient tuning (staleTime/gcTime 5min, `refetchOnWindowFocus:false`, `retry:1`); `next.config` `optimizePackageImports` phosphor + `experimental.staleTimes`; route-transition plan Phases 0–7 (`loading.tsx` shells, `error.tsx`, hover-intent prefetch, `React.cache`, 10 `next/dynamic` files); estimates-list RPC summaries (`project_estimate_list_summaries`); charts buckets-only RPC (built, NOT yet wired/applied to hosted); teamspace presence migration; estimate-tree unification corridor P0–P3.

---

## 3. Findings

### TG01 — Published route-transition budgets are loose smoke thresholds, not readiness budgets, yet the readiness checker defaults to them

Severity: High
Confidence: Verified
Bottleneck class: BUDGET_GAP
Affected surface: All routes; launch gating
User symptom: A "route transition ready" pass can be returned even when real transitions take many seconds, giving false confidence that the app is fast enough to launch.
Technical cause: `e2e/route-transition-performance-budgets.json` sets publicRoute nav 15000ms, slow3gPublicRoute 30000ms, authenticatedWorkshopTransition 10000ms, bfcache restore 1500ms, prefetchRscRequestMin 1. `scripts/check-route-transition-readiness.ts` `parseInputsFromEnv` defaults are the SAME loose values (publicMedianBudgetMs 15000, slow3gPublicMedianBudgetMs 30000, authenticatedMedianBudgetMs 10000). These pass as long as a transition completes at all; they encode no user-facing speed target. The route-transition plan's own targets (cold <200ms, warm <50ms, Lighthouse >=90) live only in markdown (`BENCHMARK_PROTOCOL.md`, `18-performance-monitoring-production.md`) and are not what the gate enforces.
Evidence:
- `e2e/route-transition-performance-budgets.json`
- `scripts/check-route-transition-readiness.ts:99-114`
- `scripts/check-route-transition-readiness.ts:121-163`
- `.ai/03_plans/route-transition-performance-optimization/BENCHMARK_PROTOCOL.md:194-208`
Current metric:
- Gate passes at public 15000ms / authed 10000ms / slow3g 30000ms medians
Target metric:
- Two-tier budgets: a loose CI regression tripwire AND a separate readiness budget (e.g. authed transition p75 < 500ms, public < 200ms warm) that explicitly gates launch
Recommended action:
- Author distinct budget tiers in the protocol: keep the loose JSON as the CI smoke tripwire, and define a second readiness budget set with realistic p75 targets that is the actual launch gate; require the readiness checker to be run with the strict env-var overrides for any readiness claim.
Validation gate:
- `perf:check-routes` run with strict `ROUTE_TRANSITION_*_BUDGET_MS` overrides against a fresh production-build benchmark JSON, reviewed by owner
Risk:
- Loose budgets are intentional for now; tightening prematurely could block beta on noisy lab variance
Rollback/deletion criteria:
- If strict budgets produce >20% flaky failures across 5 runs, revert to loose tripwire and re-tune

### TG02 — Automated route-transition benchmark omits the heaviest initial-JS routes (estimate workspace, charts, project detail)

Severity: High
Confidence: Verified
Bottleneck class: TESTING_GAP
Affected surface: /workshop/projects/[id]/estimates/[nodeId], /charts, /workshop/projects/[id]
User symptom: The routes most likely to feel slow are the ones with no automated transition measurement, so regressions there go undetected.
Technical cause: `scripts/measure-route-transitions.ts` SCENARIOS contains only 7 entries: 3 public (Landing→Login, About→Contact, Pricing→Contact) and 4 authed top-level nav (Workshop→Projects/Library/Templates/Settings). Grep for `estimates|charts|workspace` in the script returns nothing. The ground-truth largest-initial-JS routes (project estimates, charts, estimate workspace, project detail) are never navigated. The e2e spec's deep hover-prefetch test (project-card / estimate-row) is the only deep coverage and it is auth-gated and skips without storage state.
Evidence:
- `scripts/measure-route-transitions.ts:70-135`
- `e2e/route-transition-performance.spec.ts:382-448`
- `.ai/01_roadmap/00-production-readiness-dashboard.md:75`
Current metric:
- 4 authed scenarios, all top-level sidebar nav; 0 deep estimate/chart scenarios in the automated harness
Target metric:
- Add >=3 deep scenarios: Projects→Project detail, Project detail→Estimates list, Estimates→Estimate workspace, Estimates→Charts
Recommended action:
- Extend the benchmark scenario list (and the protocol) with the deep workshop routes; document the seeded project/estimate IDs needed, and require these scenarios in any authed run.
Validation gate:
- `perf:measure-routes INCLUDE_AUTHENTICATED=1` produces medians for the deep routes; `check-route-transition-readiness` includes them in scenarioChecks
Risk:
- Deep routes need seeded data and authed storage state, increasing run setup cost
Rollback/deletion criteria:
- If deep scenarios cannot reliably locate seeded rows, gate them behind an env flag and keep top-level scenarios as the default

### TG03 — Field RUM is not wired: no @vercel/speed-insights dependency; WebVitalsProbe only console.logs in dev

Severity: High
Confidence: Verified
Bottleneck class: GOVERNANCE_GAP
Affected surface: Production field Web Vitals (FCP/LCP/INP/CLS/TTFB)
User symptom: No real-user performance data is collected, so production regressions and slow-device/slow-network reality are invisible.
Technical cause: `package.json` has `@vercel/analytics ^2.0.1` (page-view analytics) but NOT `@vercel/speed-insights` (verified by grep of package.json). `src/app/layout.tsx` mounts `VercelWebAnalytics` only. `src/components/workshop/WebVitalsProbe.tsx` uses `next/web-vitals` `useReportWebVitals` but early-returns unless `NEXT_PUBLIC_PERF_TRACE==="1"` and only `console.log`s — it never ships vitals to any sink. Consequently `scripts/check-vercel-speed-insights-readiness.ts` queries `vercel.speed_insights_metric.*` which will return no current-deployment rows, and the script fail-closes (`resCompletionReady=false`) by design.
Evidence:
- `package.json` (deps: `@vercel/analytics` present, `@vercel/speed-insights` absent)
- `src/app/layout.tsx:2-3,28`
- `src/components/workshop/WebVitalsProbe.tsx:8-13`
- `scripts/check-vercel-speed-insights-readiness.ts:205-213`
Current metric:
- 0 RUM sinks; WebVitalsProbe console-only under a dev flag
Target metric:
- Field Web Vitals (INP/LCP/CLS/FCP/TTFB) flowing to Speed Insights (or equivalent) with p75 dashboards
Recommended action:
- Plan to either add `@vercel/speed-insights` + `<SpeedInsights/>` in layout, or route WebVitalsProbe output to an ingest endpoint; until then, mark all RUM readiness as blocked/unknown and do not claim field readiness from lab numbers.
Validation gate:
- `perf:check-speed-insights` returns `currentDeploymentDataReady=true` with non-null FCP/LCP/INP/CLS rows for the current deployment id
Risk:
- Adding a RUM bundle adds client weight and a third-party connection that must be reflected in CSP
Rollback/deletion criteria:
- If RUM script measurably regresses INP/LCP on landing, defer to a self-hosted beacon or sample rate reduction

### TG04 — Peak-load 'benchmark' is jsdom render-count only; seed generator is manifest-only with no DB write path

Severity: High
Confidence: Verified
Bottleneck class: DATABASE_QUERY
Affected surface: Large-data RLS/RPC query paths; estimate workspace at scale
User symptom: There is no evidence that the app stays fast with realistic data volumes (50 projects / 1500 estimates / 300k rows); the DB cliff is untested.
Technical cause: `scripts/seed-performance-test-data.ts` `buildManifest` only writes a JSON manifest and its note states "It intentionally does not write to Supabase; import/apply requires a separate approved local-only DB seeding step" — and grep finds no such import/apply script. `tests/vitest/route-transition-peak-load-profile.test.tsx` renders 50 estimates and 200 rows in jsdom and asserts `initialRenderMs<10000` and element counts; its own `writeProfileOutput` note says "This is not a production Chrome profiler trace." So "peak load" evidence is synthetic render counts with no DB, no network, no real RLS/RPC under volume.
Evidence:
- `scripts/seed-performance-test-data.ts:113-127`
- `tests/vitest/route-transition-peak-load-profile.test.tsx:152-166,200,225`
- `scripts/measure-route-transitions.ts` (no large-data path)
Current metric:
- jsdom render of 50 rows + 200 rows, asserted <10000ms; 0 rows written to Postgres
Target metric:
- Reproducible local-PG benchmark over seeded 50/1500/300k volumes measuring RPC + RLS query latency (p50/p95)
Recommended action:
- Plan an approved local-only seed-apply step (Postgres prove-harness style) that materializes the manifest into a throwaway DB, then measure RPC/RLS latency at volume; treat current peak-load evidence as render-only, not data-scale.
Validation gate:
- A documented local seed-apply + EXPLAIN/ANALYZE or RPC-timing run produces p95 query latencies at the seeded volume
Risk:
- Seeding 300k rows locally is heavy and must never touch hosted Supabase
Rollback/deletion criteria:
- If local seed-apply destabilizes the dev DB, scope to a disposable container and reduce volume tiers

### TG05 — CI perf-smoke is defined but inactive: workflow last ran 2026-05-18 (all failures) and is decision-gated to stay disabled

Severity: High
Confidence: Verified
Bottleneck class: TESTING_GAP
Affected surface: Automated regression detection for all perf and validation gates
User symptom: Performance and correctness regressions can land on main with no automated gate; the perf smoke step never runs.
Technical cause: `.github/workflows/ci.yml` defines a CI job that runs `bun run validate`, build, impeccable, e2e, and `test:e2e:perf` on PR and push to main/feat. However the 2026-06-06 decision ("Defer CI/CD until after pre-release beta") instructs to "Leave the GitHub CI workflow disabled manually." `gh run list --workflow=ci.yml` shows the most recent runs are all from 2026-05-18 and every one failed; there are no runs near HEAD (2026-06-14). So the perf smoke gate exists in code but is not enforced, and the last time it executed it was red.
Evidence:
- `.github/workflows/ci.yml`
- `.ai/10_state/decisions.md:573-590`
- `gh run list --workflow=ci.yml` (latest runs 2026-05-18, status failure)
Current metric:
- 0 CI runs since 2026-05-18; last 5 runs all failed; perf-smoke step never green in recent history
Target metric:
- A lean CI that at minimum runs validate + a stabilized perf smoke against a production build on PRs to main
Recommended action:
- Per the decision, keep CD off but plan to re-enable a lean validation+perf-smoke CI; before enabling, fix the failing job (likely env/Supabase/Playwright server setup) so the perf smoke is green and meaningful.
Validation gate:
- A successful CI run on a PR with the perf-smoke step passing against a production build
Risk:
- CI runs e2e against `bun run dev` (see TG06) and needs Supabase/auth env to not be flaky in Actions
Rollback/deletion criteria:
- If CI perf-smoke is flaky in Actions, mark it non-blocking (`continue-on-error`) until stabilized

### TG06 — All Playwright perf evidence runs against the dev server, not a production build

Severity: Medium
Confidence: Verified
Bottleneck class: TESTING_GAP
Affected surface: e2e/route-transition-performance.spec.ts and all test:e2e:perf timings
User symptom: Reported transition/bundle timings reflect an unoptimized dev build with HMR and unminified bundles, overstating how slow production is and masking production-only behavior.
Technical cause: `playwright.config.ts` `webServer.command` is `bun run dev -- --port ${port}`. The dev server does not minify, uses on-demand compilation, and has different caching/streaming than `next build`. `test:e2e:perf` and the e2e perf spec therefore measure dev, not prod. The standalone `measure-route-transitions.ts` targets `BASE_URL` which the operator must point at a chosen server, but the documented/default workflow and the CI step rely on the dev webServer.
Evidence:
- `playwright.config.ts:9-20`
- `package.json` (`test:e2e:perf` -> `playwright test e2e/route-transition-performance.spec.ts`)
- `scripts/measure-route-transitions.ts:19`
Current metric:
- e2e perf timings captured against `next dev`
Target metric:
- Perf evidence captured against `next build` + `next start` (production assets) on a fixed port
Recommended action:
- Document and provide a production-build measurement path (build once, `next start`, point `BASE_URL`/`PLAYWRIGHT_PORT` at it); reserve the dev webServer for functional e2e only. Note this session deliberately did not run build (shared `.next` contention).
Validation gate:
- A `measure-route-transitions` run with `BASE_URL` pointing at `next start` produces medians that the protocol records as the production-like baseline
Risk:
- Production build is slow to produce and writes shared `.next`, contending with concurrent agents
Rollback/deletion criteria:
- If a dedicated build/start port cannot be isolated, keep dev measurements but label every artifact as dev-build evidence

### TG07 — Lighthouse is a manual, undependencied step; archived raw report is empty and authed Lighthouse needs owner storage state

Severity: Medium
Confidence: Verified
Bottleneck class: TESTING_GAP
Affected surface: Authed /workshop Lighthouse score (perf 0.86 evidence)
User symptom: The headline authed Lighthouse number is not reproducible from a committed command, and the only deep authed lab proof depends on a redacted owner session.
Technical cause: No `lighthouse`/`lhci`/`chrome-launcher` dependency exists (grep of package.json and scripts returns nothing). The cited evidence dir's raw report `lighthouse-workshop-projects-auth-after-payload-trim.txt` is 0 bytes; only a hand-shaped summary JSON (performanceScore 0.86, FCP 1208.692, LCP 3865.73, TBT 124.654, serverResponseTime 630, scriptTransfer 220719) survives, with a note that the Cookie header was redacted. `auth-seed.json` shows the run used a real Supabase auth cookie storage state (redacted). There is no script that regenerates this, so reproducing the authed Lighthouse run requires the owner's browser/storage state and a manual Lighthouse invocation.
Evidence:
- `.ai/09_archive/store/2026-06-01-route-transition-lighthouse-after-project-list-trim/lighthouse-workshop-projects-auth-after-payload-trim-summary.json`
- `.ai/09_archive/store/2026-06-01-route-transition-lighthouse-after-project-list-trim/lighthouse-workshop-projects-auth-after-payload-trim.txt` (0 bytes)
- `.ai/09_archive/store/2026-06-01-route-transition-lighthouse-after-project-list-trim/auth-seed.json`
- `.ai/03_plans/route-transition-performance-optimization/BENCHMARK_PROTOCOL.md:50-55`
Current metric:
- authed /workshop/projects perf 0.86 (single archived summary, raw report empty, not script-reproducible)
Target metric:
- A documented, repeatable Lighthouse command (CLI or `npx lighthouse`) against `next start` with the owner storage state, archiving the full HTML/JSON
Recommended action:
- Add a documented Lighthouse runbook to the protocol: exact `npx lighthouse` command, how to inject the authed cookie/storage state safely, and where to archive the full report; treat the 0.86 as a single observed point pending repeatable proof.
Validation gate:
- A re-run `npx lighthouse` against `next start` reproduces a perf score within a tolerance band and archives the non-empty report
Risk:
- Authed Lighthouse exposes session cookies in the report config; must redact before archival
Rollback/deletion criteria:
- If repeatable authed Lighthouse cannot be safely automated, keep manual DevTools Lighthouse as the documented gate

### TG08 — Documented production monitoring (alerting, regression detection, dashboards) is aspirational; shipped PerformanceMonitor is dev-console only

Severity: Medium
Confidence: Verified
Bottleneck class: GOVERNANCE_GAP
Affected surface: Production perf observability and regression alerting
User symptom: There is no live alerting or regression detection; a production slowdown would not page anyone or fail any gate.
Technical cause: `18-performance-monitoring-production.md` (marked "Status: Complete") specifies alert thresholds (cold P50 >300ms, INP, TTFB P95 >500ms), regression detection, and dashboards. The actually-shipped `src/components/performance-monitor.tsx` only `console.log`s navigation elapsed time in `NODE_ENV==='development'`; `src/lib/perf/server-timing.ts` (traced) only `console.log`s when `PERF_TRACE=1`. Neither emits to any monitoring sink. The doc's success criteria are not connected to any running system.
Evidence:
- `.ai/03_plans/route-transition-performance-optimization/18-performance-monitoring-production.md:3,34-43`
- `src/components/performance-monitor.tsx:14-19`
- `src/lib/perf/server-timing.ts:6-16`
Current metric:
- dev-console nav timing + dev-flag server traces; 0 production alerts/dashboards
Target metric:
- At least one live perf signal with a threshold-based alert (TTFB/INP) tied to the documented success criteria
Recommended action:
- Reconcile the "Complete" status of the monitoring doc with reality (downgrade to planned), and plan a minimal production signal (Speed Insights p75 + a TTFB alert) before claiming monitoring readiness.
Validation gate:
- A configured alert fires on a synthetic threshold breach in a non-prod environment
Risk:
- Alerting infra and on-call are out of scope for closed beta per current decisions
Rollback/deletion criteria:
- If alerting is premature for beta, keep dev probes but explicitly mark monitoring as deferred, not complete

### TG09 — bfcache restore is proven only by an inconclusive Playwright assertion; persisted-restore and production React Profiler gates remain open

Severity: Medium
Confidence: Verified
Bottleneck class: HYDRATION
Affected surface: Back/forward navigation; bfcache restore experience
User symptom: It is not actually proven that pages restore from bfcache; back/forward may re-execute and feel slower than a true bfcache hit.
Technical cause: `e2e/route-transition-performance.spec.ts`'s bfcache test asserts `navigationTypes` contains `'back_forward'` and `restoreMs <= 1500` and overlay count 0, but Playwright Chromium reports `pageshow.persisted=false` even for a trivial control (per roadmap notes), so it cannot prove a true bfcache hit. The roadmap explicitly lists "manual Chrome bfcache DevTools persisted-restore proof" and "production Chrome React Profiler proof" as still-open BETA blockers. The budget `bfcache.backForwardRestoreMs 1500` is itself loose.
Evidence:
- `e2e/route-transition-performance.spec.ts:265-306`
- `.ai/01_roadmap/27-performance-budget-and-regression-gates.md:11`
- `.ai/01_roadmap/00-production-readiness-dashboard.md:242`
Current metric:
- back_forward navigation type detected, restore <1500ms; pageshow.persisted observed false (inconclusive)
Target metric:
- Manual Chrome DevTools bfcache test showing persisted=true restore, plus a production React Profiler trace of a deep route
Recommended action:
- Keep the automated bfcache test as a no-stuck-overlay regression check only; document the two manual Chrome gates in the protocol as owner-run, browser-required steps that must be captured before readiness/archive.
Validation gate:
- Owner captures a Chrome DevTools bfcache persisted-restore screenshot and a production React Profiler flamegraph, archived under `store/`
Risk:
- Manual gates depend on owner browser availability; cannot be automated this session
Rollback/deletion criteria:
- n/a — these are evidence-capture steps, not code changes

### TG10 — All live authed and production measurements are BLOCKED this session (no server, dev-auth off, no storage state)

Severity: Medium
Confidence: Verified
Bottleneck class: TESTING_GAP
Affected surface: perf:measure-routes (authed), test:e2e:perf (authed), perf:check-speed-insights, Lighthouse
User symptom: No fresh authed or production perf numbers can be produced right now; readiness claims must rely on prior archived evidence.
Technical cause: Per the session environment: no dev server is running (ports 3000-3020 closed), the dev-auth bypass is disabled, and no Playwright storage state exists. `measure-route-transitions.ts` skips authed scenarios unless `INCLUDE_AUTHENTICATED=1` or `PLAYWRIGHT_STORAGE_STATE` is set; the e2e authed tests `test.skip` without `ARCHESTIMATOR_DEV_AUTH_BYPASS` or `PLAYWRIGHT_STORAGE_STATE`; `check-vercel-speed-insights` requires the Vercel CLI and authorized scope. build/next start were deliberately not run to avoid writing shared `.next` and contending with concurrent agents.
Evidence:
- `scripts/measure-route-transitions.ts:24-25,251-252`
- `e2e/route-transition-performance.spec.ts:327-331,382-386`
- `e2e/estimates-crud-latency.spec.ts:14,36-39`
- `scripts/check-vercel-speed-insights-readiness.ts:236-251`
Current metric:
- 0 live measurements possible this session; reliance on archived 2026-06-01 evidence
Target metric:
- A documented, safe procedure to capture authed storage state and run the authed harness when an owner browser/session is available
Recommended action:
- In the protocol, document how to safely obtain authed storage state (owner logs in via Playwright codegen / a guarded storageState capture saved to a gitignored `.auth/user.json`), enumerate which commands are blocked without it, and require these be recorded as "blocked" rather than fabricated.
Validation gate:
- When unblocked: `PLAYWRIGHT_STORAGE_STATE` set, `INCLUDE_AUTHENTICATED=1 perf:measure-routes` produces authed medians and `check-route-transition-readiness` consumes them
Risk:
- Storage state contains a live session token; must be gitignored and short-lived
Rollback/deletion criteria:
- n/a — environment/evidence procedure

### TG11 — Bundle analyzer produces no reports under the default Turbopack build; correct command (ANALYZE=true ... --webpack) is undocumented in the canonical protocol

Severity: Low
Confidence: Verified
Bottleneck class: BUNDLE_WEIGHT
Affected surface: Bundle-size evidence for all routes
User symptom: An operator running `ANALYZE=true bun run build` gets no treemap and may wrongly conclude bundle weight is unmeasured or fine.
Technical cause: `next.config.ts` wires `@next/bundle-analyzer` enabled by `ANALYZE==="true"`, but Next 16 builds default to Turbopack which does not emit analyzer reports. Evidence docs confirm: "ANALYZE=true bun run build passed under Turbopack but did not emit @next/bundle-analyzer reports because Next requires the webpack build path"; only `ANALYZE=true bunx next build --webpack` emits client.html/nodejs.html/edge.html. The route-transition `BENCHMARK_PROTOCOL.md` still shows the old `ANALYZE=true bun run build` form and an "if installed" caveat, so the canonical protocol does not surface the `--webpack` requirement.
Evidence:
- `next.config.ts` (`withBundleAnalyzer`, enabled `ANALYZE==="true"`)
- `.ai/03_plans/2026-06-05-performance-and-speed/90-workflow-evidence.md:105-108`
- `.ai/03_plans/2026-06-05-performance-and-speed/12-measurement-attribution-playbook.md:115`
- `.ai/03_plans/route-transition-performance-optimization/BENCHMARK_PROTOCOL.md:50-55`
Current metric:
- Default ANALYZE build emits 0 reports under Turbopack
Target metric:
- Documented `ANALYZE=true bunx next build --webpack` emitting `.next/analyze/{client,nodejs,edge}.html` as the canonical bundle-weight evidence command
Recommended action:
- Standardize the protocol on the `--webpack` analyzer command, note the route export contract repair previously needed, and record the largest-initial-JS routes (project estimates, charts, estimate workspace, project detail) as the watch list.
Validation gate:
- `ANALYZE=true bunx next build --webpack` exits 0 and emits the three analyze HTML files
Risk:
- The webpack build path differs from the shipped Turbopack build, so analyzer sizes are an approximation of the real Turbopack output
Rollback/deletion criteria:
- n/a — documentation change

### TG12 — Shipped font is Roboto_Mono (next/font/google), contradicting README/design-system claim of 'SF Pro'

Severity: Low
Confidence: Verified
Bottleneck class: FONT
Affected surface: Global typography; font loading evidence
User symptom: Font/perf evidence and design claims reference SF Pro, but the app actually downloads Google Roboto Mono, so any "system font, no network" assumption is wrong and the design intent does not match what ships.
Technical cause: `src/app/layout.tsx` imports `Roboto_Mono` from `next/font/google` and instantiates `robotoMono = Roboto_Mono({ variable: '--font-roboto-mono', subsets: ['latin'] })`. `next/font/google` self-hosts the font (no runtime Google request) but it is still a webfont download, not the SF Pro system stack the README/design-system describes. This is a documentation-vs-implementation discrepancy with a (minor) perf and brand implication.
Evidence:
- `src/app/layout.tsx:2,7`
Current metric:
- Roboto Mono webfont shipped (latin subset) via `next/font`
Target metric:
- Design-system docs and shipped font reconciled (either ship SF Pro/system stack or correct the docs to Roboto Mono)
Recommended action:
- Flag for owner decision: align the font docs with the shipped `Roboto_Mono`, or change the implementation to the documented SF Pro/system stack; either way, record the font in the perf font section and verify `next/font` preload/display behavior.
Validation gate:
- Docs and `src/app/layout.tsx` agree on the font; font-display and preload confirmed
Risk:
- Switching to a system stack changes rendered typography across the app
Rollback/deletion criteria:
- If a font change regresses visual design, revert and update docs to match the existing Roboto Mono

---

## 4. Runnable protocol (authoring source)

### 4.0. What this protocol governs

Perf testing/benchmark/readiness for Archestimator. Distinguishes: **lab** (Playwright/CDP), **synthetic** (jsdom render counts), **DB-scale** (currently absent), **RUM** (currently absent), and **manual Chrome gates** (bfcache persisted-restore, production React Profiler).

### 4.1. Tooling inventory (verified this session)

| Asset | Path | What it measures | State |
|---|---|---|---|
| Route-transition benchmark | scripts/measure-route-transitions.ts | click→target-path duration, overlay rate, _rsc count; 7 scenarios; CDP No throttle/Fast 3G/Slow 3G; RUNS default 3 | Verified; authed scenarios skip without storage state |
| Readiness gate | scripts/check-route-transition-readiness.ts | scores benchmark JSON vs thresholds; routeTransitionReady bool | Verified; defaults to LOOSE budgets |
| E2E perf evidence spec | e2e/route-transition-performance.spec.ts | public baseline, Slow3G, public Link medians, bfcache, protected redirect, authed hover-prefetch | Verified; authed tests test.skip without bypass/storage state |
| Smoke budgets | e2e/route-transition-performance-budgets.json | loose tripwires (public 15s, authed 10s, slow3g 30s, bfcache 1500ms) | Verified loose |
| Peak-load profile | tests/vitest/route-transition-peak-load-profile.test.tsx | jsdom render of 50 estimates + 200 rows, asserts <10000ms | Verified jsdom-only |
| Seed manifest | scripts/seed-performance-test-data.ts | generates 50/30/200 manifest JSON; NO Supabase write | Verified manifest-only |
| Speed Insights readiness | scripts/check-vercel-speed-insights-readiness.ts | queries Vercel p75 FCP/LCP/INP/CLS/TTFB for current deployment; fail-closed | Verified; no RUM data to query |
| Dev nav timing | src/components/performance-monitor.tsx | console.log nav elapsed (dev only) | Verified dev-console only |
| Dev Web Vitals | src/components/workshop/WebVitalsProbe.tsx | console.log vitals under NEXT_PUBLIC_PERF_TRACE=1 | Verified; no sink |
| Server trace | src/lib/perf/server-timing.ts (traced) | console.log per-hop under PERF_TRACE=1 | Verified; no sink |
| Bundle analyzer | next.config.ts withBundleAnalyzer | treemap under ANALYZE=true | Verified; needs --webpack |

### 4.2. Exact commands

```
# Public route transitions (NO server needed beyond a running target)
BASE_URL=http://127.0.0.1:3020 NETWORK_PROFILE="No throttle" RUNS=5 \
  OUTPUT_FILE=.ai/09_archive/store/<run>/route-transition-measurements.json \
  bun run perf:measure-routes            # alias: scripts/measure-route-transitions.ts

# Authed transitions (BLOCKED this session — needs storage state)
INCLUDE_AUTHENTICATED=1 PLAYWRIGHT_STORAGE_STATE=.auth/user.json \
  BASE_URL=http://127.0.0.1:3020 RUNS=5 bun run perf:measure-routes

# Network profiles: "No throttle" | "Fast 3G" (1.5Mbps/750k/150ms) | "Slow 3G" (400k/400k/400ms)

# Readiness gate (set STRICT overrides for a readiness claim)
ROUTE_TRANSITION_BENCHMARK_FILE=<measurements.json> \
  ROUTE_TRANSITION_AUTH_MEDIAN_BUDGET_MS=500 ROUTE_TRANSITION_PUBLIC_MEDIAN_BUDGET_MS=200 \
  bun run perf:check-routes

# E2E perf spec (runs against bun run dev via playwright.config webServer — DEV build!)
bun run test:e2e:perf
# Authed e2e: ARCHESTIMATOR_DEV_AUTH_BYPASS=1 OR PLAYWRIGHT_STORAGE_STATE=.auth/user.json

# jsdom peak-load profile
ROUTE_PERF_PROFILE_OUTPUT=<out.json> bun run perf:profile-peak-load

# Seed manifest (manifest only — does NOT write DB)
PERF_SEED_PROJECTS=50 PERF_SEED_ESTIMATES_PER_PROJECT=30 PERF_SEED_ROWS_PER_ESTIMATE=200 \
  bun run perf:seed-fixture

# Bundle analyzer — MUST use --webpack (Turbopack emits nothing)
ANALYZE=true bunx next build --webpack    # emits .next/analyze/{client,nodejs,edge}.html

# Speed Insights readiness (needs Vercel CLI + authorized scope; fail-closed w/o RUM)
bun run perf:check-speed-insights         # SPEED_INSIGHTS_ALLOW_NOT_READY=1 to not exit 1

# Lighthouse — NO dependency installed; manual/npx only (recommended):
# npx lighthouse http://127.0.0.1:<port>/workshop/projects --preset=desktop \
#   --extra-headers='{"Cookie":"<authed cookie>"}' --output=json --output-path=<file>
```

### 4.3. How to get authed storage state SAFELY

- Dev-auth bypass is DISABLED this session; do not rely on `ARCHESTIMATOR_DEV_AUTH_BYPASS`.
- Capture via owner browser: `npx playwright codegen --save-storage=.auth/user.json http://127.0.0.1:<port>/login`, log in, close → storage state written.
- `.auth/user.json` MUST be gitignored; it holds a live Supabase session cookie (auth-seed.json archive shows cookieCount 2, names redacted). Keep short-lived; re-capture per session.
- Pass via `PLAYWRIGHT_STORAGE_STATE` for both the e2e spec (playwright.config reads it) and `measure-route-transitions.ts`.

### 4.4. Run counts & network profiles

- `measure-route-transitions`: RUNS default 3 (recommend 5+ for medians given high Slow-3G variance). Median is reported.
- e2e spec: public Link medians = 5 runs; Slow3G public = 3 runs; bfcache = single restore.
- Profiles: No throttle (baseline), Fast 3G, Slow 3G (CDP `Network.emulateNetworkConditions`).

### 4.5. Reconciliation matrix (ground-truth vs verified)

| Claim | Verified status |
|---|---|
| No @vercel/speed-insights dep | CONFIRMED — only @vercel/analytics in package.json |
| CI deferred per 2026-06-06 | CONFIRMED decision; ci.yml file EXISTS and runs perf-smoke, but gh shows last run 2026-05-18 all FAILURE, none since → effectively disabled |
| Budgets are loose smoke, not readiness | CONFIRMED — checker defaults equal the loose JSON |
| Seed is manifest-only, no DB write | CONFIRMED — note + no apply script |
| 7 scenarios (3 public + 4 authed) | CONFIRMED; none cover estimate workspace/charts/project detail |
| Lighthouse 0.86 authed | CONFIRMED archive summary; raw .txt is 0 bytes, not script-reproducible |
| bfcache inconclusive (persisted=false) | CONFIRMED via roadmap notes + spec asserts back_forward only |
| Font README says SF Pro but ships Roboto_Mono | CONFIRMED — layout.tsx imports Roboto_Mono from next/font/google |
| ANALYZE under Turbopack emits nothing; --webpack needed | CONFIRMED via 2026-06-05 evidence docs |
| WebVitalsProbe RUM | CONFIRMED console-only under NEXT_PUBLIC_PERF_TRACE=1, no sink |

### 4.6. Budget critique

`e2e/route-transition-performance-budgets.json` values (publicRoute 15000ms, slow3gPublicRoute 30000ms, authenticatedWorkshopTransition 10000ms, bfcache 1500ms, prefetchRscRequestMin 1) are tripwires for "did it complete," not user-facing targets. The plan's own targets (cold <200ms, warm <50ms, Lighthouse >=90, CLS <0.1) live only in markdown and are not enforced. Recommend a two-tier model: loose JSON as CI tripwire + strict env-override readiness budgets as the launch gate. (See TG01.)

### 4.7. BLOCKED this session (record as blocked, never fabricated)

| Measurement | Why blocked |
|---|---|
| Authed perf:measure-routes medians | No dev server, no PLAYWRIGHT_STORAGE_STATE, dev-auth off |
| Authed test:e2e:perf (hover-prefetch, transition budget) | test.skip without bypass/storage state |
| estimates-crud-latency / estimates-shell-streaming e2e | auth-gated, skip without storage state |
| Authed Lighthouse re-run | needs owner storage state + manual lighthouse (no dep) |
| perf:check-speed-insights | needs Vercel CLI + authorized scope; will fail-closed (no RUM rows) |
| DB-scale (50/1500/300k) latency | no seed-apply script; manifest-only |
| Production build perf evidence | build/next start deliberately not run (shared .next, agent contention) |
| Manual Chrome bfcache persisted-restore + production React Profiler | require owner browser; not automatable |

### 4.8. Route inventory — automated coverage

| Route | In benchmark harness? | Note |
|---|---|---|
| / , /about, /features, /pricing, /contact, /login | partial (3 public transitions + baseline spec) | covered |
| /workshop → projects/library/templates/settings | yes (4 authed scenarios, auth-gated) | covered when unblocked |
| /workshop/projects/[id] (project detail) | NO | largest-initial-JS, untested in harness |
| /workshop/projects/[id]/estimates | only via auth-gated e2e hover spec | not in measure-routes |
| /workshop/projects/[id]/estimates/[nodeId] (estimate workspace) | NO | largest-initial-JS, untested in harness |
| /workshop/projects/[id]/charts | NO | rebuilt buckets-only; untested in harness |
| /share/[token], /invite/[token] | NO | not in perf harness |

---

## 5. Observed evidence (cite, do not re-derive)

These are prior captured artifacts, not measurements from this session. Language: `observed` = evidence artifact exists; `blocked` = environment prevented re-measurement.

- Authed `/workshop/projects` Lighthouse (observed, 2026-06-01): perf 0.86 / FCP 1208ms / LCP 3865ms / CLS 0 / TBT 124ms / SpeedIndex 3514ms / serverResponse 630ms — `.ai/09_archive/store/route-transition-lighthouse-after-project-list-trim-20260601T112341Z/` (raw report 0 bytes; see TG07).
- Earlier authed runs (observed): perf 0.71–0.73 / LCP 3585–3960ms / TBT 422–533ms / serverResponse ~2300ms.
- Standalone authed NO-throttle medians (observed): Projects 2325 / Library 2675 / Templates 1857 / Settings 2725 ms.
- Slow3G medians (observed): Projects 6941 / Library 6748 / Templates 5864 / Settings 11963 ms.
- Public `/features→/pricing` (observed): normal ~179–394ms / Slow3G 834–6893ms.
- `/workshop/library` initial JS (observed): 618KB → ~232KB after dynamic-import work.
- bfcache `pageshow.persisted=false` under Playwright (observed, inconclusive — see TG09).
- This session: live authed + production measurement **BLOCKED** (no dev server, dev-auth off, no storage state, build/next start withheld for shared `.next` contention; ANALYZE build blocked).

---

## 6. Cross-references

- **`03_ROUTE_SPEED_MATRIX.md`** — per-route speed targets and the deep-route coverage gaps surfaced in TG02 / §4.8 feed the matrix's "automated coverage" column.
- **`12_OPTIMIZATION_BACKLOG.md`** — TG01–TG12 recommended actions are backlog candidates (two-tier budgets, deep-route scenarios, RUM wiring, DB-scale seed-apply, CI re-enable).
- **`13_RISK_REGISTER_AND_BLAST_RADIUS.md`** — the "Risk" line of each finding (RUM bundle weight, storage-state token handling, 300k local seed, webpack-vs-Turbopack analyzer drift) maps to register entries.
- **`15_READINESS_DECISION.md`** — this document is the evidence spine for the readiness call: loose budgets (TG01), no RUM (TG03), no DB-scale proof (TG04), inactive CI (TG05), and the open manual Chrome gates (TG09) are all hard blockers against a "fast enough to launch" claim. No readiness claim is supportable without live/prod-like proof.
