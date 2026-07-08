# 12 - Test And Validation Strategy

## Existing Tests To Preserve

Targeted existing suite:

```bash
bunx vitest run \
  tests/vitest/estimate-sheet-large-data-budgets.test.ts \
  tests/vitest/estimate-row-table-virtualization.test.tsx \
  tests/vitest/estimate-branch-virtualization.test.tsx \
  tests/vitest/perf/estimate-sheet-render-baseline.test.tsx \
  tests/vitest/perf/estimate-sheet-render-relief.test.tsx \
  tests/vitest/perf/estimate-sheet-memoization.test.tsx \
  tests/vitest/perf/estimate-sheet-cursor-isolation.test.tsx \
  --maxWorkers=1
```

## New Test Matrix

| Layer | Proposed Path | Required Behaviors |
|---|---|---|
| Fixture unit | `tests/vitest/estimate-sheet-performance-fixtures.test.ts` | Deterministic fixture tiers and redacted IDs. |
| Selector unit | `tests/vitest/estimate-graph-selectors.test.ts` | Graph selectors equal recursive helpers. |
| Totals unit | `tests/vitest/estimate-graph-totals.test.ts` | Incremental totals equal full recompute. |
| DOM perf | `tests/vitest/perf/estimate-sheet-large-virtualization.test.tsx` | 1k/2.5k/5k logical rows mount bounded windows. |
| DOM perf | `tests/vitest/perf/estimate-sheet-large-edit-budget.test.tsx` | Keystroke p95/worst, focus, sibling render count. |
| Route contract | `tests/vitest/estimate-sheet-route-large-data-contract.test.ts` | Route uses load limits and truncation UI remains capped. |
| D1 local proof | `tests/vitest/estimate-sheet-d1-query-budget.test.ts` | SQL shape, query count, plan, row-read budget. |
| Browser | `e2e/estimate-sheet-performance.spec.ts` | Route, scroll, edit, search, expand, move, cursor metrics. |
| Browser | `e2e/estimate-sheet-virtualization-regression.spec.ts` | Flag-on/off DOM counts, focus, DnD, resize. |
| Provider proof | `scripts/generate-estimate-sheet-d1-performance-proof.ts` | Local SQLite/D1-compatible proof. |
| Hosted proof | `scripts/verify-estimate-sheet-hosted-d1-performance-proof.ts` | Gated hosted proof and cleanup. |

## Fixture Distribution

Rows:
- 70% supplier/library rows.
- 20% project-specific rows.
- 10% express component rows.

Units:
- `pc`
- `sqm`
- `lot`
- `box`

Shape:
- 5-10 top groups.
- 10-100 areas.
- Uneven row counts.
- Long names/descriptions every 7th row.
- Attachment/detail metadata every 11th row.
- Deep branch path in each stress fixture.

## Browser Scenarios

- Cold direct route open.
- Warm hover prefetch then click.
- Scroll from top to bottom of stress fixture.
- Edit quantity in first, middle, and last visible row.
- Search for a row that appears near the bottom.
- Toggle supplier/category facets.
- Group by supplier/category/cost.
- Expand/collapse deep area.
- Move row to area with many rows.
- Activate express editor in a large table.
- Resize a column.
- Trigger remote cursor update while typing.

## D1 Proof Surfaces

- Route context by selected node id.
- Route context by selected tab id.
- Active tab tree.
- Subtree by node id.
- Row update.
- Row move.
- Bulk row delete.
- Proposal preview/export tree materialization, if touched.

## Validation Commands

Phase-specific commands:

```bash
bunx vitest run tests/vitest/perf/estimate-sheet-large-virtualization.test.tsx tests/vitest/perf/estimate-sheet-large-edit-budget.test.tsx --maxWorkers=1
```

```bash
bun run test:e2e -- e2e/estimate-sheet-performance.spec.ts --project=chromium
```

```bash
INCLUDE_AUTHENTICATED=1 SCENARIO_FILTER="target estimate" RUNS=5 OUTPUT_FILE=.ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/evidence/estimate-route-benchmark.json bun run perf:measure-routes
```

```bash
ROUTE_TRANSITION_BENCHMARK_FILE=.ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/evidence/estimate-route-benchmark.json ROUTE_TRANSITION_REQUIRE_HERO=1 OUTPUT_FILE=.ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/evidence/estimate-route-readiness.json bun run perf:check-routes
```

```bash
OUTPUT_FILE=.ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/evidence/estimate-sheet-d1-performance-proof.json MARKDOWN_FILE=.ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/evidence/estimate-sheet-d1-performance-proof.md bun run scripts/generate-estimate-sheet-d1-performance-proof.ts
```

After React implementation changes:

```bash
bun run doctor -- --verbose
```

Final local source hygiene:

```bash
git diff --check
```

## Evidence Standards

- A local jsdom test proves render logic only.
- A local browser test proves Chrome interaction behavior only.
- A local D1/SQLite proof proves local query shape and planner behavior only.
- A hosted D1 proof is required for production/provider claims.
- No one check substitutes for another evidence class.

