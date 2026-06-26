# 11 - Implementation Plan

This is the authoritative future execution guide. Do not start app optimization code changes until Phase 0 enhanced baseline artifacts exist. Harness-only measurement changes are allowed first, because the current harness cannot prove skeleton order; record them as harness changes and then capture the enhanced same-harness baseline before editing route, layout, component, repository, or overlay code.

## Phase 0 - Baseline and Harness

Objective: prove the current failure mode with measurements before editing route code.

Requirements: `PERF-01`, `PERF-02`, `PERF-04`, `TEST-01`, `SEC-02`

### Task P0-T1 - Add Skeleton Timeline Capture

- Objective: extend route-transition measurement to record skeleton/overlay episodes.
- Likely files: `scripts/measure-route-transitions.ts`
- Symbols: `measureTransition`, `ScenarioRun`, `ScenarioResult`
- Scope: harness-only; no app route/component/repository behavior changes.
- Instructions:
  - Add a browser-side `MutationObserver` before each scenario action.
  - Observe selectors from `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md`.
  - Record attach, visible, hidden/detached, duration, and episode count.
  - Include `parentFallbackSeen`, `sheetSkeletonEpisodes`, `overlayDurationMs`, and `sheetContentVisibleAtMs` in each run.
  - Add or confirm benchmark scenarios named `Authenticated Target: Cold Direct Target Estimate`, `Authenticated Target: Estimates to Target Estimate No Hover`, `Authenticated Target: Estimates to Target Estimate Hover Prefetch`, and `Authenticated Target: Estimates to Target Estimate Warm Revisit`.
  - Add `Authenticated Target: Query Only Same Path` if overlay/listener code is changed later.
- Tests:
  - Add focused parser/shape tests if the script exposes pure helpers.
  - Otherwise validate through a small JSON fixture consumed by readiness checker tests.
- Validation:
  - `bunx vitest run tests/vitest/*route-transition* --maxWorkers=1` if helper tests exist.
  - `bun run perf:measure-routes` on target scenario when auth/server is available.
- Complexity: Medium.
- Parallelization: Can run before route code changes.

### Task P0-T2 - Tighten Readiness Checker

- Objective: fail benchmark readiness when parent fallbacks appear.
- Likely files: `scripts/check-route-transition-readiness.ts`, relevant tests.
- Scope: harness-only; no app route/component/repository behavior changes.
- Instructions:
  - Add thresholds for `parentFallbackSeen=false`, `sheetSkeletonEpisodes<=1`, `overlayDurationMs<=200`, and `sheetContentVisibleAtMs` budget.
  - Support route-specific budgets: warm/prefetched p50 <= 500 ms, no-hover/general <= 1000 ms or >= 30 percent improvement, direct cold <= 3500 ms local production-like.
  - Add `ROUTE_TRANSITION_BASELINE_FILE` and `ROUTE_TRANSITION_GENERAL_IMPROVEMENT_MIN=0.30` support so the after-readiness command can enforce the no-hover/general "absolute budget OR relative improvement" gate without manual judgment.
  - Keep existing public/auth route checks.
  - Add clear failure reasons.
- Validation:
  - New fixture tests for passing and failing benchmark JSON.
- Complexity: Medium.
- Parallelization: Can run with P0-T1.

### Task P0-T3 - Capture Baseline

- Objective: produce enhanced same-harness before artifacts.
- Likely files: evidence only under `.ai/05_logs/2026-06-26-routing-page-optimization/`.
- Instructions:
  - Optionally capture `before-raw-route-transition.json` before harness changes if the old harness can run; label it non-authoritative.
  - Run local production-like build if feasible.
  - Use the supplied project and estimate IDs.
  - Capture cold direct, warm link, hover-prefetched, and no-hover transitions.
  - Capture `[perf-json]` logs with `PERF_TRACE=1`.
  - Record auth mode, server mode, network profile, run count, browser, commit/dirty status.
  - Run the exact before route-transition and before readiness commands from `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md`.
  - If `before-readiness.json` fails, keep it as the baseline defect record rather than loosening thresholds.
  - Store raw screenshots/traces only under ignored `.ai/99_scratch/...` unless synthetic/sanitized.
- Validation:
  - Baseline summary exists and is referenced before any app optimization edits.
- Complexity: Medium.
- Parallelization: Depends on P0-T1/P0-T2.

### Task P0-T4 - Define Claim Language

- Objective: avoid overclaiming "instant navigation" without framework validation.
- Likely files: implementation PR description, evidence summary.
- Instructions:
  - Use "faster", "correctly shaped", "no parent fallback flash", or "streamed leaf fallback".
  - Do not use "instant navigation" unless a separate Cache Components / `unstable_instant` path is intentionally adopted and validated.
- Validation:
  - Reviewer checks final docs/PR.
- Complexity: Small.
- Parallelization: Can run with P0-T3.

## Phase 1 - Leaf Suspense Boundary Refactor

Objective: make the leaf sheet fallback available before route-context work suspends.

Requirements: `FR-01`, `FR-02`, `UX-01`, `ARCH-01`, `SEC-01`, `TEST-02`

### Task P1-T1 - Move Route Context into Async Child

- Objective: change `ProjectEstimateNodePage` to return leaf Suspense immediately.
- Likely file: `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`
- Symbols: `ProjectEstimateNodePage`, `EstimateWorkspaceResolved`
- Instructions:
  - Keep the exported page as the route entry.
  - Return `<Suspense fallback={<EstimateSheetRouteSkeleton />}><EstimateRouteContent ... /></Suspense>`.
  - Move `params`, `searchParams`, `assertRouteErrorSmoke`, `resolveEstimateTabRouteContext`, and `requireCurrentUserContext` into `EstimateRouteContent`.
  - Preserve `withPerfTraceRequest("workshop.estimate-sheet", ...)`.
  - Preserve `notFound()` behavior.
  - Preserve `ProjectEstimateMetadataPublisher` and `EstimateWorkspaceClient` rendering only after route context proves `project` and `estimate`.
  - Preserve proposal metadata and `EstimateWorkspaceResolved` props.
  - **navId cancellation (R-16):** async child must check navigation identity before committing renders; a late-resolving async child whose navigation was superseded must be discarded, not rendered.
  - **React.cache lifetime verification (A5-4):** verify that `getCurrentUserContext`, `ensureDefaultWorkspace`, `getCurrentWorkspaceProject`, and `resolveEstimateTabRouteContext` cache lifetimes behave identically across the new async-child boundary as they did in the prior top-level await form. Confirm no cache key accidentally scoped to the wrong Suspense subtree.
- Failure cases:
  - Do not render real sheet content before route context validates.
  - Do not duplicate `requireCurrentUserContext` beyond request cache expectations.
  - Do not create client components for server-only work.
  - Do not allow a stale navigation's async-child resolution to override a newer navigation's render.
- Tests:
  - Update `tests/vitest/estimate-sheet-route-loading.test.ts`.
  - Add source guard that `resolveEstimateTabRouteContext` is not awaited before the leaf Suspense return.
- Validation:
  - Targeted Vitest.
  - `bun run type-check`.
  - React Doctor changed scope.
- Complexity: Medium.
- Parallelization: Sequential after Phase 0 baseline.

### Task P1-T1A - Add Security Ordering Guard

- Objective: prevent accidental protected-data render before auth/project/estimate validation.
- Likely files: `tests/vitest/estimate-sheet-route-loading.test.ts`
- Instructions:
  - Assert `requireCurrentUserContext()` remains in the server route content path.
  - Assert `notFound()` occurs before `ProjectEstimateMetadataPublisher` and `EstimateWorkspaceClient` in source ordering or through a more robust route unit test if available.
  - Assert leaf `loading.tsx` remains skeleton-only and does not import auth, cookies, repositories, or `WorkshopPageShell`.
- Validation:
  - Targeted Vitest.
- Complexity: Small.
- Parallelization: Same phase as P1-T1.

### Task P1-T2 - Validate Tail Fallback Behavior

- Objective: determine whether tail Suspense replays the full sheet skeleton after base content.
- Likely file: `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`
- Instructions:
  - Use delayed-tail E2E or instrumentation to observe whether `EstimateSheetRouteSkeleton` appears after sheet content marker.
  - If it does, replace tail fallback with a smaller local fallback near tabs/edit capability rather than full page skeleton.
  - If it does not, leave code unchanged and record evidence.
- Tests:
  - E2E delayed-tail scenario if changed.
- Complexity: Medium.
- Parallelization: After P1-T1.

## Phase 2 - Evidence-Gated Parent Layout / Overlay Work

Objective: address any remaining parent fallback or overlay issue only if Phase 1 evidence requires it.

Requirements: `ARCH-02`, `ARCH-03`, `UX-02`, `A11Y-02`, `REL-01`

### Task P2-T1 - Project Layout Fallback Audit

- Gate: parent project/dashboard fallback still appears after P1.
- Likely files: `src/app/workshop/projects/[projectId]/layout.tsx`, `src/components/workshop/ProjectRouteContentFallback.tsx`
- Instructions:
  - Add `PERF_TRACE` span around project-layout project lookup if missing.
  - Prefer making child route leaf boundary available over route-specific branching in shared layout.
  - If layout fallback shape must change, ensure dashboard route still gets dashboard-compatible fallback.
- Tests:
  - Project dashboard shell tests.
  - Estimates list skeleton tests.
  - Sheet loading E2E.
- Complexity: Large.
- Parallelization: Sequential after Phase 1 measurements.

### Task P2-T2 - Overlay Timing or Route-Specific Suppression

- Gate: overlay masks correct skeleton or outlives it beyond budget.
- Likely files: `src/components/ui/route-loading-overlay.tsx`, `src/stores/navigation-ui-store.ts`, `src/components/navigation-listener.tsx`
- Instructions:
  - First prefer tighter hide condition or overlay duration budget.
  - Only add route-specific suppression if generic timing cannot solve it.
  - Preserve bfcache and stale navigation guards.
- Tests:
  - `tests/vitest/navigation-ui-store.test.ts`
  - `tests/vitest/use-navigation-router.test.ts`
  - `e2e/route-transition-performance.spec.ts`
  - target sheet E2E timeline
- Complexity: Large.
- Parallelization: Sequential after P2-T1 decision.

## Phase 3 - Prefetch and Bundle Follow-Up

Objective: improve warm path if measurement shows opportunity.

Requirements: `PERF-03`, `PERF-05`, `PERF-07`, `API-01`

### Task P3-T1 - Verify Estimate Link Prefetch

- Gate: hover-prefetched path is not materially faster or has no pre-click RSC request.
- Likely files: `src/components/workshop/project-estimates-table/ProjectEstimateOpenActionCell.tsx`, `src/hooks/use-prefetch-on-hover.ts`
- Instructions:
  - Compare `prefetch={false}` plus custom hover prefetch against Next default or intent-prefetch pattern.
  - Preserve keyboard focus prefetch.
  - Avoid prefetching every row immediately.
- Tests:
  - Hover-prefetch E2E proof.
  - RSC request count check.
- Complexity: Medium.

### Task P3-T2 - Bundle Check

- Objective: ensure route-boundary changes do not pull heavy client code earlier.
- Likely files: build artifacts only unless regression found.
- Instructions:
  - Run analyzer with webpack path.
  - Compare estimate route chunks.
  - If >10 KB gzip growth appears, identify imported module and remove or lazy-load it.
- Complexity: Small unless regression found.

### Task P3-T3 - Route-Context Query Sharing

- Gate: `estimate-sheet.route-context` remains above budget after boundary fixes.
- Likely files: `src/lib/repositories/workspace-repository.ts`
- Instructions:
  - Add trace breakdown for selected node, tab lookup, tabs list, nodes, and rows.
  - If duplicate tab-row resolution is confirmed, pass a resolved tab object through the tree helper instead of reading it twice.
  - Keep legacy-schema fallback branches exact and narrow.
  - Preserve `resolveEstimateEditCapability()` as server/RPC-backed.
- Tests:
  - Repository route-context tests if present or added.
  - Target sheet E2E.
- Complexity: Medium to Large.

### Task P3-T4 - Hydration Split Investigation

- Gate: server/RSC timings pass but route remains slow or JS transfer/long tasks fail thresholds.
- Likely files: `EstimateWorkspaceClient`, `EstimateSheetContent`, right-sidebar/library surfaces.
- Instructions:
  - Identify heavy imports with analyzer.
  - Lazy-load non-visible right rail/dialog/export/activity surfaces where behavior stays equivalent.
  - Do not change estimate editing semantics in this route-boundary plan.
- Tests:
  - Existing estimate sheet DOM/perf tests.
  - Browser trace and React profiler.
- Complexity: Large.

## Phase 4 - After Measurement and Handoff

Objective: prove final behavior and update durable memory.

Requirements: all.

### Task P4-T1 - Capture After Evidence

- Run identical scenarios to baseline.
- Produce delta table.
- Include screenshots/video/trace only if needed to prove timeline.
- Write sanitized evidence under `.ai/05_logs/2026-06-26-routing-page-optimization/`; keep raw protected screenshots/traces under ignored `.ai/99_scratch/...`.
- Run the exact after route-transition, after readiness, and after server-perf commands from `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md`.
- Record known gaps honestly.

### Task P4-T2 - Final Validation

Minimum commands after source edits:

```bash
bun run type-check
bunx vitest run tests/vitest/estimate-sheet-route-loading.test.ts tests/vitest/project-estimates-list-skeleton.test.tsx tests/vitest/navigation-ui-store.test.ts --maxWorkers=1
npx react-doctor@latest --verbose --scope changed
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
git diff --check
```

Browser proof:

```bash
bun run test:e2e -- e2e/estimate-sheet-loading-performance.spec.ts
```

Security proof required in that E2E file:

- Authenticated allowed user: direct target load, no-hover link, hover-prefetched link, and warm revisit.
- Unauthenticated session: direct target load redirects/fails closed with no sheet content or project/estimate data.
- Unauthorized storage state: direct target load and hover/focus prefetch fail closed with no RSC payload rendered into the page.
- Invalid project and invalid estimate/node: existing `notFound()` or redirect behavior remains unchanged.

If shared layout/overlay changes occur, also run:

```bash
bun run test:e2e:perf
```

### Task P4-T3 - Record Project State

- Update `.ai/10_state/current-state.md` only after implementation changes project reality.
- Include evidence path, validations, and gaps.
