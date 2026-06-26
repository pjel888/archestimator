---
title: MOP-6 Continuation Slice 15 Proposal Preview Hook
type: evidence
date: 2026-06-26
---

# MOP-6 Continuation Slice 15 Proposal Preview Hook

## Scope

This slice closes the center-content `M-24` proposal-preview controller
extraction gap from the June 24 source plan. Earlier slices had extracted pure
proposal-preview helpers and added the unsaved-edits warning; this slice moved
the remaining controller orchestration out of `EstimateSheetContent.tsx`.

## Implementation

- Added `src/components/workshop/estimate-sheet/use-estimate-proposal-preview.ts`.
- Moved proposal export tab-scope selection, preview signature composition,
  preview model building, export settings updates, stale/current status,
  download availability, blob download error handling, and dialog focus
  restoration into the hook.
- Kept `EstimateSheetContent.tsx` responsible for owning the reducer-backed
  proposal state and passing it to the hook, matching the existing local state
  ownership pattern while reducing the hot component's controller body.
- Left the already-extracted pure helpers in
  `src/components/workshop/estimate-sheet/proposal-preview-model.ts`.

## Validation

Fresh local evidence passed:

- `bunx vitest run tests/vitest/proposal-export-preview.test.tsx tests/vitest/estimate-sheet-extracted-models.test.ts --maxWorkers=1`
  passed 2 files / 19 tests.
- `bun run type-check` passed.
- `git diff --check -- src/components/workshop/EstimateSheetContent.tsx src/components/workshop/estimate-sheet/use-estimate-proposal-preview.ts src/components/workshop/estimate-sheet/use-estimate-template-insertion.ts`
  passed.

## Boundary

This closes `M-24`. At this point it did not close the remaining center
decomposition rows: `M-21` row-handler extraction and `M-23` activity-history
controller extraction remained open. A later slice closed `M-21`; `M-23`
remains open. Full source-folder completion also remains false until F-13 React
DevTools active-tab profiler proof, lazy subtree loading, and a concrete
realtime-v2 collaboration contract are handled.
