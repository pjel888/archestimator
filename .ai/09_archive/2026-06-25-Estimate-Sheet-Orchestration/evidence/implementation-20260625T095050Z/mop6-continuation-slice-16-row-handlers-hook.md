---
title: MOP-6 Continuation Slice 16 Row Handlers Hook
type: evidence
date: 2026-06-26
---

# MOP-6 Continuation Slice 16 Row Handlers Hook

## Scope

This slice closes the center-content `M-21` row-handler/controller extraction
gap from the June 24 source plan. Earlier slices had extracted row-adjacent pure
helpers; this slice moved the remaining row mutation orchestration out of
`EstimateSheetContent.tsx`.

## Implementation

- Added `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts`.
- Moved row editable-state resync, express draft insert/retry/delete handling,
  row save buffering, library insert/replace trust gates, clear-component,
  project-specific detach, library promotion, component replace/move picker
  actions, single-row delete Undo, and selected-row bulk delete Undo into the
  hook.
- Kept project-source/template insertion and activity/proposal controllers on
  their existing boundaries; `M-22` and `M-24` are already handled by dedicated
  hooks, while `M-23` activity-history controller extraction remains open.

## Validation

Fresh local evidence passed:

- `bunx vitest run tests/vitest/estimate-sheet-cost-inputs.test.tsx tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-sheet-row-details-crud.test.tsx tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx --maxWorkers=1`
  passed 4 files / 80 tests.
- `bunx vitest run tests/vitest/estimate-sheet-version-control-actions.test.ts --maxWorkers=1`
  passed 1 file / 32 tests.
- `bun run type-check` passed.

## Boundary

This closes `M-21`. It does not close `M-23` activity-history controller
extraction. Full source-folder completion also remains false until F-13 React
DevTools active-tab profiler proof, lazy subtree loading, and a concrete
realtime-v2 collaboration contract are handled.
