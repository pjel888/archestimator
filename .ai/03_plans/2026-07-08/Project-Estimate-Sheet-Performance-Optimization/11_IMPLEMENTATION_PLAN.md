# 11 - Implementation Plan

This is a future implementation plan. Do not execute it as part of this planning pack.

## Phase 0 - Measurement And Baseline

Goal: prove current behavior and rank bottlenecks.

Units:

U0.1 - Add deterministic estimate sheet performance fixtures.
- Files likely: `tests/vitest/helpers/estimate-sheet-performance-fixtures.ts`
- Acceptance:
  - Generates small/medium/large/stress/limit/over-limit fixtures.
  - Deterministic IDs and row distributions.
  - No real customer data.

U0.2 - Add DOM performance census tests.
- Files likely:
  - `tests/vitest/perf/estimate-sheet-large-virtualization.test.tsx`
  - `tests/vitest/perf/estimate-sheet-large-edit-budget.test.tsx`
- Acceptance:
  - Mounted row/branch markers stay within budget.
  - Edit p95/worst jsdom budgets captured.
  - Totals and focus remain correct.

U0.3 - Add browser estimate sheet performance spec.
- Files likely: `e2e/estimate-sheet-performance.spec.ts`
- Acceptance:
  - Measures route open, scroll, edit, search, expand, move dialog, and cursor update flows.
  - Writes JSON evidence.
  - Fails on missing sheet markers or blank virtual windows.

U0.4 - Add estimate-specific D1 performance proof.
- Files likely:
  - `scripts/generate-estimate-sheet-d1-performance-proof.ts`
  - `tests/vitest/estimate-sheet-d1-performance-proof-script.test.ts`
  - optional `src/lib/cloudflare/estimate-sheet-performance-proof-router.ts`
- Acceptance:
  - Captures query plan and rows read for dominant SQL shapes.
  - Redacts proof output.
  - Produces markdown and JSON artifacts.

U0.5 - Baseline decision memo.
- Files likely: update this plan pack or successor evidence doc.
- Acceptance:
  - Ranks bottlenecks by measured impact.
  - Confirms whether route fast path, graph state, indexes, or virtualizer tuning is first.

## Phase 1 - Route And D1 Read Path

Goal: reduce route and subtree load cost without changing UX.

Units:

U1.1 - Implement route fast path after proof.
- Files likely: `src/lib/repositories/workspace-repository.ts`
- Acceptance:
  - `readEstimateNodeRouteContextD1FastPath` no longer returns unconditional null.
  - Authorization remains fail-closed.
  - Query count/rows read improves against baseline.

U1.2 - Add proven D1 indexes if required.
- Files likely: new `migrations/00xx_estimate_sheet_performance_indexes.sql`
- Acceptance:
  - Migration is additive.
  - `PRAGMA optimize` included in proof/runbook where appropriate.
  - Rows read improves; write overhead acceptable.

U1.3 - Subtree fetch deduplication.
- Files likely:
  - `src/components/workshop/EstimateSheetTree.tsx`
  - `src/lib/estimates/subtree-client.ts`
- Acceptance:
  - Duplicate rapid expands do not duplicate network calls.
  - Same UX and error handling.

## Phase 2 - Normalized Graph Read Model

Goal: build normalized graph behind current facade.

Units:

U2.1 - Graph model and bootstrap adapter.
- Files likely:
  - `src/lib/estimates/estimate-graph-model.ts`
  - `tests/vitest/estimate-graph-model.test.ts`
- Acceptance:
  - Converts current nested tree to graph.
  - Preserves order, parentage, tab, rows, totals, completeness.

U2.2 - Selector facade parity.
- Files likely:
  - `src/lib/estimates/estimate-graph-selectors.ts`
  - `tests/vitest/estimate-graph-selectors.test.ts`
- Acceptance:
  - Selector nested facade equals current `buildEstimateTree`/recursive helper output for fixtures.

U2.3 - Store integration under feature flag.
- Files likely:
  - `src/hooks/use-estimate-workspace-state.ts`
  - new `src/hooks/use-estimate-graph-store.ts`
- Acceptance:
  - Existing components can run with nested facade.
  - Feature flag can disable graph store path.

## Phase 3 - Incremental Derived Data

Goal: remove full-tree totals and expensive selectors from edit hot path.

Units:

U3.1 - Incremental row/node totals.
- Acceptance:
  - Row edit updates only affected row and ancestors.
  - Recursive totals retained as test oracle/fallback.
  - Existing totals tests pass.

U3.2 - Search/filter/group selectors.
- Acceptance:
  - Search uses deferred value.
  - Filter/group changes use transition.
  - Large fixture search meets budget.

U3.3 - Facet and move option indexes.
- Acceptance:
  - Facet options derive from graph indexes.
  - Move area picker and position picker remain usable with thousands of options/rows.

## Phase 4 - Render Boundary Migration

Goal: render visible windows from selectors.

Units:

U4.1 - Branch list from visible branch selector.
- Acceptance:
  - Mounted branch count stays within budget.
  - Collapse/search behavior matches current UX.

U4.2 - Row table from row-id window selector.
- Acceptance:
  - Mounted row count stays within budget.
  - Focus/keyboard behavior preserved.

U4.3 - Express editor virtualization strategy.
- Acceptance:
  - Large active editor no longer causes unacceptable full-table mount, or documented proof shows current disablement is safe.

## Phase 5 - Entity-Level Mutations

Goal: replace whole-tree optimistic rollback with entity inverse patches.

Units:

U5.1 - Entity patch log.
- Acceptance:
  - Every row update/insert/delete/move creates inverse patches.
  - Rollback is entity-scoped.

U5.2 - Mutation query invalidation narrowing.
- Acceptance:
  - Successful mutation invalidates only affected subtree/window/detail keys unless broad invalidation is required.

U5.3 - Concurrent edit conflict tests.
- Acceptance:
  - Revision conflict restores only touched entities.
  - Collaboration cursor remains isolated.

## Phase 6 - Final Proof And Rollout

Goal: prove readiness and ship behind safe rollout controls.

Units:

U6.1 - Full local proof.
- Acceptance:
  - Targeted vitest, browser, route, D1 proof, React Doctor, and `git diff --check` pass.

U6.2 - Hosted proof when env gates are available.
- Acceptance:
  - Hosted D1 proof writes redacted artifact.
  - Cleanup verified.

U6.3 - Rollout decision.
- Acceptance:
  - Feature flags documented.
  - Rollback path tested.
  - Readiness doc updated.

