# 09 - Performance, Reliability, and Observability

## Benchmark Principle

No optimization is complete without a before artifact and an after artifact produced by the same harness, route IDs, auth mode, environment, run count, network profile, and browser.

## Required Evidence Folder

Future implementation should write evidence under:

`.ai/05_logs/2026-06-26-routing-page-optimization/`

Required files:

- `before-route-transition.json`
- `after-route-transition.json`
- `before-server-perf.log`
- `after-server-perf.log`
- `before-readiness.json`
- `after-readiness.json`
- `before-after-summary.md`
- Optional: `before-trace.zip`, `after-trace.zip`, `before-bundle.txt`, `after-bundle.txt`

Artifact privacy rule:

- Committed `.ai/05_logs/...` evidence must be sanitized JSON/log/summary output only.
- Browser screenshots or trace archives that expose protected project, estimate, client, or row data must use synthetic fixtures or stay under ignored `.ai/99_scratch/2026-06-26-routing-page-optimization/...`; commit only sanitized summaries.

## Required Metrics

### Route Timing

- Click-to-target-path duration.
- Click-to-sheet-content duration.
- Direct load navigation duration.
- TTFB: `responseStart - requestStart`.
- DOMContentLoaded and load timing for direct loads.
- RSC request count and timing.
- JS/chunk resource count.

### Skeleton and Overlay Timeline

Selectors:

- `[data-testid='estimate-sheet-route-skeleton']`
- `[data-testid='project-estimates-list-skeleton']`
- `[aria-label='Loading project workspace']`
- `[aria-label='Loading project dashboard']`
- `[aria-label='Loading workspace']`
- `[data-route-overlay]`
- `[data-estimate-center-column='sheet']`
- `[data-workshop-page-shell-root]`

For each selector:

- First attached timestamp.
- First visible timestamp.
- Detached/hidden timestamp.
- Total visible duration.
- Episode count.
- Whether it appeared after navigation start.

Selector provenance notes:

- Confirm `[aria-label='Loading workspace']` is emitted by `WorkshopShellContentFallback` (the Suspense fallback used by `WorkshopPageShell`). If the aria-label differs, update the selector list to match the actual emitted label.
- Confirm `[data-testid='project-estimates-list-skeleton']` is emitted by the estimates-list skeleton component (not the project-dashboard fallback).
- Confirm `[data-route-overlay]` is emitted by `RouteLoadingOverlay` root and not by any nested overlay.

### Server Timing

Run with:

```bash
PERF_TRACE=1
```

Required spans:

- `workshop.estimate-sheet`
- `estimate-sheet.route-context`
- `estimate-sheet.current-user`
- `workshop.estimate-sheet-tail`
- `estimate-sheet.tabs`
- `estimate-sheet.edit-capability`

Add spans only if Phase 0 needs more precision:

- `project-layout.project`
- `workshop.layout.user-context`
- `workshop.layout.terms`
- `workshop.shell.current-user`
- `workshop.shell.workspace`

## Benchmark Commands

### Sequencing Contract

Phase 0 has two kinds of code changes:

1. Harness-only measurement changes in `scripts/measure-route-transitions.ts`, `scripts/check-route-transition-readiness.ts`, and their tests.
2. App optimization changes in route/layout/component/repository code.

Harness-only changes may happen before the enhanced baseline because the current harness cannot prove skeleton order. App optimization changes must not start until the enhanced same-harness baseline exists. If useful, capture a raw pre-harness observation first and label it non-authoritative.

### Local Production-Like Server

```bash
bun run build
PERF_TRACE=1 PORT=3020 bun run start 2>&1 | tee .ai/05_logs/2026-06-26-routing-page-optimization/before-server-perf.log
```

For after evidence, use the same server mode and write:

```bash
PERF_TRACE=1 PORT=3020 bun run start 2>&1 | tee .ai/05_logs/2026-06-26-routing-page-optimization/after-server-perf.log
```

### Optional Raw Pre-Harness Observation

Run only if the current harness can execute before P0-T1/P0-T2. This is not the acceptance baseline.

```bash
RUNS=7 \
INCLUDE_AUTHENTICATED=1 \
HERO_PROJECT_ID=0139e1e5-951d-4f2f-9081-6c953d288d8a \
HERO_ESTIMATE_NODE_ID=8080f04c-fe18-4314-a1d8-9222e62d1eed \
SCENARIO_FILTER="Authenticated Hero: Estimates to Target Estimate" \
BASE_URL=http://127.0.0.1:3020 \
OUTPUT_FILE=.ai/05_logs/2026-06-26-routing-page-optimization/before-raw-route-transition.json \
bun run perf:measure-routes
```

### Required Scenario Matrix

P0-T1 must add or confirm scenarios whose names start with `Authenticated Target`:

- `Authenticated Target: Cold Direct Target Estimate`
- `Authenticated Target: Estimates to Target Estimate No Hover`
- `Authenticated Target: Estimates to Target Estimate Hover Prefetch`
- `Authenticated Target: Estimates to Target Estimate Warm Revisit`
- `Authenticated Target: Query Only Same Path` if overlay/listener code changes

The same matrix must be used before and after app optimization.

Enhanced same-harness baseline:

```bash
RUNS=7 \
INCLUDE_AUTHENTICATED=1 \
HERO_PROJECT_ID=0139e1e5-951d-4f2f-9081-6c953d288d8a \
HERO_ESTIMATE_NODE_ID=8080f04c-fe18-4314-a1d8-9222e62d1eed \
SCENARIO_FILTER="Authenticated Target" \
BASE_URL=http://127.0.0.1:3020 \
OUTPUT_FILE=.ai/05_logs/2026-06-26-routing-page-optimization/before-route-transition.json \
bun run perf:measure-routes
```

After app optimization:

```bash
RUNS=7 \
INCLUDE_AUTHENTICATED=1 \
HERO_PROJECT_ID=0139e1e5-951d-4f2f-9081-6c953d288d8a \
HERO_ESTIMATE_NODE_ID=8080f04c-fe18-4314-a1d8-9222e62d1eed \
SCENARIO_FILTER="Authenticated Target" \
BASE_URL=http://127.0.0.1:3020 \
OUTPUT_FILE=.ai/05_logs/2026-06-26-routing-page-optimization/after-route-transition.json \
bun run perf:measure-routes
```

Baseline readiness recording. This may fail and still be useful because it captures current defects:

```bash
ROUTE_TRANSITION_BENCHMARK_FILE=.ai/05_logs/2026-06-26-routing-page-optimization/before-route-transition.json \
ROUTE_TRANSITION_REQUIRE_HERO=1 \
ROUTE_TRANSITION_MIN_RUNS=5 \
ROUTE_TRANSITION_WARM_MEDIAN_BUDGET_MS=500 \
ROUTE_TRANSITION_GENERAL_MEDIAN_BUDGET_MS=1000 \
ROUTE_TRANSITION_DIRECT_MEDIAN_BUDGET_MS=3500 \
ROUTE_TRANSITION_PARENT_FALLBACK_MAX=0 \
ROUTE_TRANSITION_SHEET_SKELETON_EPISODES_MAX=1 \
ROUTE_TRANSITION_OVERLAY_RATE_MAX=0.10 \
OUTPUT_FILE=.ai/05_logs/2026-06-26-routing-page-optimization/before-readiness.json \
bun run perf:check-routes
```

After readiness gate. This must pass for completion:

```bash
ROUTE_TRANSITION_BENCHMARK_FILE=.ai/05_logs/2026-06-26-routing-page-optimization/after-route-transition.json \
ROUTE_TRANSITION_BASELINE_FILE=.ai/05_logs/2026-06-26-routing-page-optimization/before-route-transition.json \
ROUTE_TRANSITION_REQUIRE_HERO=1 \
ROUTE_TRANSITION_MIN_RUNS=5 \
ROUTE_TRANSITION_WARM_MEDIAN_BUDGET_MS=500 \
ROUTE_TRANSITION_GENERAL_MEDIAN_BUDGET_MS=1000 \
ROUTE_TRANSITION_GENERAL_IMPROVEMENT_MIN=0.30 \
ROUTE_TRANSITION_DIRECT_MEDIAN_BUDGET_MS=3500 \
ROUTE_TRANSITION_PARENT_FALLBACK_MAX=0 \
ROUTE_TRANSITION_SHEET_SKELETON_EPISODES_MAX=1 \
ROUTE_TRANSITION_OVERLAY_RATE_MAX=0.10 \
OUTPUT_FILE=.ai/05_logs/2026-06-26-routing-page-optimization/after-readiness.json \
bun run perf:check-routes
```

Analyzer:

```bash
ANALYZE=true bunx next build --webpack
```

Use `--webpack` because prior performance docs note analyzer reports are not emitted by the default Turbopack build path.

## Pass/Fail Budgets

| Metric | Target |
|---|---|
| Parent fallback episodes | 0 |
| Sheet full-page skeleton episodes before content | <= 1 |
| Sheet skeleton visible median | <= 1500 ms local production-like |
| Warm/prefetched estimates-list to target-estimate median | p50 <= 250 ms stretch pass, 251-500 ms required pass, >500 ms fail |
| No-hover/general estimates-list to target-estimate improvement | median <= 1000 ms, or median improves by >= 30 percent against `ROUTE_TRANSITION_BASELINE_FILE` |
| Direct route load median | <= 3500 ms local production-like, <= 5000 ms dev |
| Cold authenticated direct target TTFB | p50 <= 600 ms pass, 601-1000 ms investigate, >1000 ms fail |
| `estimate-sheet.route-context` | p50 <= 350 ms pass, 351-700 ms investigate, >700 ms fail |
| Project layout project lookup | p50 <= 150 ms pass, 151-300 ms investigate, >300 ms fail |
| Overlay visible on warm/prefetched transition | 0 percent pass, <=10 percent investigate, >10 percent fail |
| Overlay visible duration when attached | <= 200 ms |
| Overlay outlives sheet skeleton | 0 runs |
| RSC requests | after <= before + 1 |
| RSC payload for target route | <= 500 KiB pass, 500 KiB-1 MiB investigate, >1 MiB fail |
| Target entry JS transfer gzip | <= 350 KiB pass, 350-600 KiB investigate, >600 KiB fail |
| Hydration/long task | no task > 50 ms pass; any repeated >50 ms or one >200 ms fail |
| Supabase round trips | after <= before unless justified |
| Route chunk gzip growth | <= 10 KB unexplained |
| CLS | < 0.1 |
| INP | < 200 ms where field/lab proxy is available |
| LCP | <= 2.5 s where measurable for direct load, or >= 20 percent improvement if current baseline is above target |

## Reliability Cases

- Delayed RSC still shows leaf skeleton, not parent fallback.
- Failed RSC hides overlay and reaches existing error/notFound behavior.
- Browser back/forward has no stuck overlay.
- Reduced-motion users do not get new animation.
- Repeated rapid clicks do not leave stale overlay due navId race.
- Query-only transitions do not leave overlay until the safety timeout.

## Observability Gap

The app has local `PERF_TRACE`, dev console navigation logging, and WebVitals probes, but no final user-facing RUM requirement is shipped by this plan. If first-user performance becomes a release gate, a separate RUM/Speed Insights plan should own production collection and dashboards.
