# MOP-6 Continuation Slice 12: Center Model Extractions

Date: 2026-06-26

## Scope

This slice narrows the center `M-21` through `M-24` decomposition gap by
extracting pure, testable helper/model logic out of `EstimateSheetContent.tsx`
without changing the user-facing sheet behavior.

Implemented:

- Proposal preview helpers moved to
  `src/components/workshop/estimate-sheet/proposal-preview-model.ts`.
- Template insertion cloning/append helpers moved to
  `src/components/workshop/estimate-sheet/template-insertion-model.ts`.
- Activity-history scope tree construction moved to
  `src/components/workshop/estimate-sheet/activity-scope-tree.ts`.
- Added direct helper tests in
  `tests/vitest/estimate-sheet-extracted-models.test.ts`.
- Added a batched template-insertion custom-event regression lock in
  `tests/vitest/estimate-sheet-library-insert.test.tsx`.
- Hardened row-details modal tests to await the native dialog open path.

## Evidence

- `bunx vitest run tests/vitest/estimate-sheet-extracted-models.test.ts tests/vitest/estimate-template-drop-zones.test.tsx tests/vitest/estimate-insert-target-authz.test.ts --maxWorkers=1`
  passed 3 files / 18 tests.
- `bunx vitest run tests/vitest/proposal-export-preview.test.tsx tests/vitest/estimate-header-actions.test.tsx tests/vitest/estimate-sheet-activity-history-ui.test.tsx tests/vitest/estimate-sheet-version-control-ui.test.tsx --maxWorkers=1`
  passed 4 files / 43 tests. jsdom emitted the existing
  `Not implemented: navigation to another Document` warning during proposal
  download assertions; tests still passed.
- `bunx vitest run tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-sheet-row-details-crud.test.tsx tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx --maxWorkers=1`
  passed 3 files / 37 tests.
- `bunx vitest run tests/vitest/estimate-sheet-center-atomic-contracts.test.ts --maxWorkers=1`
  passed 1 file / 4 tests.
- `bun run type-check` passed.
- `git diff --check` passed.

## Boundary

This is a pure helper/model extraction plus characterization-lock slice. It
does not claim the full `EstimateSheetContent.tsx` hook/component decomposition
is complete. The remaining center decomposition work is the larger
hot-component split: row-handler state/effects, template-insertion orchestration
hooks, activity-history controller state, and proposal-preview controller state.
