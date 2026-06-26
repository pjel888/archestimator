# MOP-6 Continuation Slice 8: Center P3 Polish

Date: 2026-06-25

## Scope

Closed small center-content continuation rows that were still recorded as
deferred or guarded after the tree-polish slice:

- `ESC-P3-17`: missing component image fallbacks used remote Unsplash URLs.
- `ESC-P3-23`: activity history filter/search reloads fired immediately on
  every same-scope change.
- `ESC-P3-24`: global toast viewport could overlap bottom-docked actions.
- `M-27`: proposal preview lacked a dirty-state warning for unsaved row edits.

Also revisited `M-21` through `M-24` and kept them out of this local patch
because the source plan requires characterization tests and behavior locks
before decomposing `EstimateSheetContent.tsx` flows.

## Changes

- Added `src/components/workshop/component-image-fallbacks.ts`, a shared local
  SVG data-placeholder generator for component-image fallbacks.
- Routed component-library cards, activity-history material cards, and
  `estimate-tree-data.ts` fallback inference through the local placeholder
  helper. Explicit seed/demo `imageUrl` values are untouched.
- Debounced same-scope activity-history reloads by 200ms after the first
  current-scope load. Filter/search churn is delayed; explicit scope navigation
  remains immediate for responsiveness.
- Offset the toast viewport to
  `bottom-[calc(9rem+env(safe-area-inset-bottom))]`.
- Added `status.unsavedEdits` to `ProposalExportPreviewDialog` and wired it
  from the sheet's editable row state.

## Validation

- `bun x vitest run tests/vitest/component-library-helpers.test.ts tests/vitest/toast.test.tsx tests/vitest/proposal-export-preview.test.tsx tests/vitest/estimate-sheet-version-control-ui.test.tsx --maxWorkers=1`
  passed: 4 files / 57 tests.
- `bun x eslint src/components/workshop/component-image-fallbacks.ts src/components/workshop/estimate-tree-data.ts src/components/workshop/component-library/helpers.ts src/components/workshop/estimate-sheet/activity-history-model.ts src/components/workshop/EstimateSheetContent.tsx src/components/workshop/ProposalExportPreviewDialog.tsx src/components/ui/toast.tsx tests/vitest/component-library-helpers.test.ts tests/vitest/toast.test.tsx tests/vitest/proposal-export-preview.test.tsx tests/vitest/estimate-sheet-version-control-ui.test.tsx`
  exited 0. It reported existing unused-symbol warnings in dirty touched files:
  `EstimateSheetContent.tsx`, `component-library/helpers.ts`, and
  `estimate-tree-data.ts`.
- `bun run type-check` passed.

## Remaining Scope

- At this point, `M-21` through `M-24` remained refactor-scope, not
  unimplemented launch defects. Later slices extracted `M-21`, `M-22`, and
  `M-24`; `M-23` activity-history controller extraction remains open.
- General center/tree undo remains architecture-scope because successful
  save/edit undo needs restore payloads, ordering/conflict semantics, UI stack
  policy, and API/RPC support. Later slices implemented the delete-specific
  row and tree/subtree Undo paths.
- Browser proof for the right `Sources` drawer and React DevTools active-tab
  profiler proof remain unclaimed in this shell.
