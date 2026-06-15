# EMC Performance Optimization Plan - 2026-06-14

## Objective

Make the Estimate Model Column ready for larger estimates by removing avoidable work in the unified area-node sheet while preserving the current visual and interaction contracts.

## Scope

- Center estimate sheet / EMC rendering and row-edit compute path.
- Unified area-node totals, activity-scope totals, and row-table render isolation.
- Local perf evidence through existing Vitest/jsdom profiler tests.

## Non-Goals

- Full virtualization of the estimate sheet in this pass.
- Database/provider changes.
- Changing row table layout, node hierarchy, or template/component drop semantics.

## Implementation Track

1. Capture the current render/keystroke profile for 50, 200, and 500 synthetic rows.
2. Add a one-pass node-total map helper.
3. Reuse that helper in `EstimateSheetContent` and `EstimateSheetBranch`.
4. Add focused tests for edited-row totals across nested nodes.
5. Rerun perf, render-isolation, type, lint, and diff checks.

## Follow-Up Candidates

- Branch-level memoization with an explicit edited-node revision map.
- Windowing/virtualization for very large expanded sheets.
- Server-side or worker-backed rollups for loaded multi-thousand-row estimates.
- Browser trace/RUM once an authenticated session is available for the local app.
