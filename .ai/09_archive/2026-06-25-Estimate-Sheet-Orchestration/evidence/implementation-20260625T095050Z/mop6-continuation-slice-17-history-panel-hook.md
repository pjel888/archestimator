---
title: MOP-6 Continuation Slice 17 History Panel Hook
type: evidence
date: 2026-06-26
---

# MOP-6 Continuation Slice 17 History Panel Hook

## Scope

This slice closes the center-content `M-23` activity-history controller
extraction gap from the June 24 source plan. Earlier slices had extracted the
activity scope tree model and same-scope reload debounce; this slice moved the
remaining modal/controller orchestration out of `EstimateSheetContent.tsx`.

## Implementation

- Added `src/components/workshop/estimate-sheet/use-estimate-history-panel.ts`.
- Moved activity scope item construction, selected scope derivation, selected
  row-details derivation, history filter/reset/reload state transitions,
  request-generation guards, initial history fetch, pagination fetch, modal
  focus restoration, and Escape-key close handling into the hook.
- Kept reducer-backed activity/history state and modal rendering in
  `EstimateSheetContent.tsx`; the content component now delegates activity
  controller behavior through the hook return API.

## Validation

Fresh local evidence passed:

- `bun run type-check` passed.
- `bunx vitest run tests/vitest/estimate-sheet-version-control-ui.test.tsx tests/vitest/estimate-sheet-activity-history-ui.test.tsx tests/vitest/estimate-sheet-extracted-models.test.ts tests/vitest/estimate-sheet-row-details-crud.test.tsx --maxWorkers=1`
  passed 4 files / 37 tests.
- `bunx vitest run tests/vitest/estimate-sheet-version-control-actions.test.ts --maxWorkers=1`
  passed 1 file / 32 tests.

## Boundary

This closes `M-23`. Full source-folder completion remains false until F-13
React DevTools active-tab profiler proof, lazy subtree loading, and a concrete
realtime-v2 collaboration contract are handled.
