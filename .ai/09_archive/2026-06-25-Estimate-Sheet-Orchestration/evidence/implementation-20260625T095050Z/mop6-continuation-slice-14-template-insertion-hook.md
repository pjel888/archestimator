# MOP-6 Continuation Slice 14: Template Insertion Hook Extraction

Date: 2026-06-26

## Scope

Closed the center-content `M-22` hook-extraction portion by moving template
insertion orchestration out of `EstimateSheetContent.tsx` and into
`src/components/workshop/estimate-sheet/use-estimate-template-insertion.ts`.

This slice covers estimate template insertion only:

- whole-template insert into a target parent node;
- batched multi-template insert from category/template-drop events;
- single template-node subtree insert;
- template id lookup and left-tree custom-event handling;
- optimistic tree/row insertion, stale-response revision guard, rollback, and
  error toast behavior.

The project-source subtree insert path intentionally remains in
`EstimateSheetContent.tsx`; it is the separate U2 source-copy flow backed by the
project-source RPC and was not part of the M-22 estimate-template hook contract.

## Changed Files

- `src/components/workshop/estimate-sheet/use-estimate-template-insertion.ts`
- `src/components/workshop/EstimateSheetContent.tsx`

## Validation

- `bunx vitest run tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-sheet-extracted-models.test.ts --maxWorkers=1`
  passed 2 files / 34 tests.
- `bun run type-check` passed.
- `git diff --check -- src/components/workshop/EstimateSheetContent.tsx src/components/workshop/estimate-sheet/use-estimate-template-insertion.ts`
  passed.

## Boundary

This closes `M-22` estimate-template insertion orchestration extraction. Full
center decomposition still remained incomplete at this point because `M-21`
row-handler extraction, `M-23` activity-history controller extraction, and
`M-24` proposal-preview controller extraction were still open. Later slices
closed `M-24` and `M-21`; `M-23` remains open.
