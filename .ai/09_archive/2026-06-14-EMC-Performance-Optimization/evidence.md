# EMC Performance Optimization Evidence - 2026-06-14

## Implemented

- One-pass node total lookup via `computeNodeTotals(...)`, reused by:
  - branch header totals,
  - project total,
  - activity-scope node totals.
- Lazy flattened row/activity scope derivation:
  - the sheet no longer builds `flattenEstimateRows(...)` or activity scope items on the normal typing path while Activity, Row Details, and project-specific dialogs are closed.
- Row-level memoization inside `EstimateRowItemsTable`:
  - editing one row re-renders that row,
  - sibling rows in the same table do not rebuild,
  - sibling tables remain isolated.
- Browser-side row containment with `content-visibility: auto` and a 96px intrinsic row size, so offscreen rows can be skipped by the renderer before a full virtualization rewrite exists.
- Render probe expanded with a row-level test hook for perf regression tests.

## Profile

Artifacts:

- Before: `.omx/artifacts/perf/emc-performance/before.json`
- After: `.omx/artifacts/perf/emc-performance/after.json`

The profile is jsdom/Vitest, not a production Chrome trace. It is useful as relative local evidence.

| Scenario | Initial Render | Keystroke Avg | Keystroke Worst | Sibling Table Renders |
| --- | ---: | ---: | ---: | ---: |
| 50 rows | 150.94ms -> 164.15ms | 8.93ms -> 7.34ms | 18.11ms -> 11.02ms | 0 |
| 200 rows | 207.77ms -> 256.10ms | 8.15ms -> 2.17ms | 12.44ms -> 2.78ms | 0 |
| 500 rows | 433.98ms -> 503.81ms | 22.57ms -> 9.75ms | 61.84ms -> 14.53ms | 0 |

Interpretation:

- The primary edit path is significantly faster, especially at 200-500 synthetic rows.
- Initial render is heavier in larger profiles because each row now has a memo boundary. This is acceptable for edit latency, but true thousand-row initial paint still needs virtualization/windowing.

## Verification

- `SHEET_PERF_BASELINE_OUTPUT=.omx/artifacts/perf/emc-performance/before.json bunx vitest run tests/vitest/perf/estimate-sheet-render-baseline.test.tsx`
- `SHEET_PERF_BASELINE_OUTPUT=.omx/artifacts/perf/emc-performance/after.json bunx vitest run tests/vitest/perf/estimate-sheet-render-baseline.test.tsx`
- `bunx vitest run tests/vitest/perf/estimate-sheet-render-relief.test.tsx tests/vitest/perf/estimate-sheet-cursor-isolation.test.tsx tests/vitest/estimate-sheet-node-totals.test.ts tests/vitest/estimate-sheet-branch-header-ui.test.tsx`
- `bunx vitest run tests/vitest/estimate-sheet-cost-inputs.test.tsx`
- `bun run type-check`
- `bunx eslint src/components/workshop/EstimateSheetContent.tsx src/components/workshop/estimate-sheet/rows/branch.tsx src/components/workshop/estimate-sheet/rows/editable-row-model.ts src/components/workshop/estimate-sheet/rows/row-table.tsx src/components/workshop/estimate-sheet-render-probe.ts tests/vitest/estimate-sheet-node-totals.test.ts tests/vitest/perf/estimate-sheet-render-relief.test.tsx tests/vitest/estimate-sheet-branch-header-ui.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx`
- `git diff --check`

## Remaining Optimization Targets

- Virtualize/window the visible row body for thousand-row initial paint only after browser/INP proof and dependency approval. Existing repo decisions keep `@tanstack/react-virtual` unapproved by default.
- Add branch-level memoization with an explicit edited-node/edited-row revision map.
- Capture an authenticated browser trace/RUM profile once a logged-in local session is available.
