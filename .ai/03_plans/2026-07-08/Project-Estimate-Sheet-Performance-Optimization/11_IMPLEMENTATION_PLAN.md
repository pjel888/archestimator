# 11 - Implementation Plan

> Superseded for execution on 2026-07-10. This phase-oriented draft is retained as design history. Follow `IMPLEMENTATION_PLAN.md` and `plan-pack.json`; their `UNIT-*` DAG, evidence inventory, and status tuple are authoritative.

This is a future implementation plan. Do not execute it as part of this planning pack.

## Phase Exit Criteria (Pass-3 addition)

Every phase has a binary exit signal. A phase is not "done" until its exit signal is met. Phases may be parallelized only when exit signals are independent.

| Phase | Exit signal (binary, observable) | Owner | Blocking downstream phase? |
|---|---|---|---|
| Phase 0 | All five evidence artifacts (route benchmark, DOM census, browser spec, D1 proof, decision memo) exist in `evidence/` AND decision memo ranks top-3 bottlenecks. | Eng lead | Blocks Phase 1+ optimization. Does NOT block Phase 0.5. |
| Phase 0.5 | Browser spec `e2e/estimate-sheet-component-interop.spec.ts` runs green for all 19 CI-QA IDs (doc 22) at small + medium fixture tiers. | Eng lead | Historical gate; canonical dependencies are in `IMPLEMENTATION_PLAN.md`. |
| Phase 1 | Route fast path implemented and proven against D1 artifact; subtree deduplication test green; no authz denial-test regression. | Eng lead | Blocks Phase 2 only if Phase 0 memo ranks D1/route in top-3. |
| Phase 2 | Graph model + selector parity tests green for all fixtures; feature flag off-by-default; nested facade unchanged. | Eng lead | Blocks Phase 3. |
| Phase 3 | Incremental totals property test ≥1,000 iterations green; deferred search/transition green at stress fixture; facet/move option indexes wired. | Eng lead | Blocks Phase 4. |
| Phase 4 | Mounted row/branch markers within budget at 5k-row browser proof; express-editor virtualization strategy proven; a11y proof matrix (doc 29) green. | Eng lead + a11y | Blocks Phase 5. |
| Phase 5 | Entity-patch rollback test green under concurrent edit; realtime broadcast + rollback interaction test green; mutation invalidation narrowed. | Eng lead | Blocks Phase 6. |
| Phase 6 | Full local proof + hosted proof (when env gates available) + React Doctor clean + launch gate review complete. | Eng lead + owner | Blocks production scale claim. |

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
  - `scripts/measure-estimate-sheet-d1.ts`
  - `scripts/verify-estimate-sheet-hosted-d1-performance-proof.ts`
  - `tests/vitest/estimate-sheet-d1-performance-proof-script.test.ts`
- Acceptance:
  - Captures query plan and rows read for dominant SQL shapes.
  - Redacts proof output.
  - Produces markdown and JSON artifacts.
  - Hosted proof uses direct `wrangler d1 execute ARCH_DB --remote` and adds no application route or deploy.

U0.5 - Baseline decision memo.
- Files likely: update this plan pack or successor evidence doc.
- Acceptance:
  - Ranks bottlenecks by measured impact.
  - Confirms whether route fast path, graph state, indexes, or virtualizer tuning is first.
  - States explicitly whether client computation is in the top-3 bottlenecks (gates Phase 2).

## Phase 0.5 - Component Interoperability Verification (Pass-3 formalization)

Goal: produce browser proof for component-interop correctness at small + medium scale, parallel to Phase 0.

Units:

U0.5.1 - Create `e2e/estimate-sheet-component-interop.spec.ts`.
- Files likely: `e2e/estimate-sheet-component-interop.spec.ts`
- Acceptance:
  - Implements all 19 CI-QA IDs from doc 22 (`01`, `02`, `03`, `04`, `05`, `05b`, `05c`, and `06` through `17`).
  - Authenticated harness available; can run locally with `ARCHESTIMATOR_E2E_MUTATING_DND=1`.
  - Each scenario asserts the expected-result column from doc 22 verbatim.

U0.5.2 - CI-QA scale scenarios at stress tier.
- Files likely: same spec, gated scenarios.
- Acceptance:
  - CI-QA-14 (5,000-row fan-out), CI-QA-15 (modal open at stress), CI-QA-16 (inline edit at stress), CI-QA-17 (D1 row restore plus node-restore regression) all run.
  - Captures p95 timings for fan-out + inline edit.

U0.5.3 - CI-QA ↔ vitest coverage backfill.
- Files likely: `tests/vitest/estimate-component-fan-out.test.ts`, `tests/vitest/estimate-link-state-transitions.test.ts`, `tests/vitest/estimate-three-edit-surfaces.test.ts`
- Acceptance:
  - Every REQ-CI-* (doc 04, doc 22) maps to at least one named vitest test or one browser scenario. See traceability matrix in doc 16 (Pass-3 update).

Historical stop condition for Phase 0.5: all 19 CI-QA IDs green at small + medium tier; CI-QA-14..17 green at stress tier. The canonical stop contract is `UNIT-002` plus `UNIT-010`.

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

Skip entirely if Phase 0 memo ranks client computation outside the top-3 bottlenecks (R22).

Units:

U2.1 - Graph model and bootstrap adapter.
- Files likely:
  - `src/lib/estimates/estimate-graph-model.ts`
  - `tests/vitest/estimate-graph-model.test.ts`
- Acceptance:
  - Converts current nested tree to graph.
  - Preserves order, parentage, tab, rows, totals, completeness.
  - Array identity (not just set equality) asserted over fixtures with duplicated `sort_order` (R29).

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
  - Property test: 1,000+ random fixture edits; incremental vs. recursive totals must match to the centavo (R23).

U3.2 - Search/filter/group selectors.
- Acceptance:
  - Search uses deferred value.
  - Filter/group changes use transition.
  - Large fixture search meets budget.

U3.3 - Facet and move option indexes.
- Acceptance:
  - Facet options derive from graph indexes.
  - Move area picker and position picker remain usable with thousands of options/rows.
  - Follow canonical `DEC-AUTO-003` semantic move placement.

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
  - A11y proof matrix (doc 29) green for virtualized rows.

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
  - Realtime broadcast arriving during rollback is rejected if lower scope/revision (R25).
  - Template insertion entity-scoped, not whole-tree (R26).

## Phase 6 - Final Proof And Rollout

Goal: prove readiness and ship behind safe rollout controls.

Units:

U6.1 - Full local proof.
- Acceptance:
  - Targeted vitest, browser, route, D1 proof, React Doctor, and `git diff --check` pass.

U6.2 - Hosted proof when env gates are available.
- Acceptance:
  - Hosted D1 proof writes redacted artifact.
  - Cleanup verified by separate pass (R24).

U6.3 - Rollout decision.
- Acceptance:
  - Feature flags documented.
  - Rollback path tested.
  - Readiness doc updated.
