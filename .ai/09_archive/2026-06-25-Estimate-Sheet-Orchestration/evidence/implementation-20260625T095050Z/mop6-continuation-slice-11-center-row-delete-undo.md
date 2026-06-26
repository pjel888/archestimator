# MOP-6 Continuation Slice 11: Center Row Delete Undo

Date: 2026-06-26
Scope: center sheet row-delete post-success Undo only.

## Result

- Added `restore_deleted_estimate_rows_with_history` through migration
  `20260626013000_estimate_row_delete_undo_rpc.sql`.
- Wired `restoreDeletedEstimateRows` through estimate actions,
  `useEstimateRowMutations`, and `EstimateSheetContent`.
- Single-row and selected-row delete success toasts now expose an `Undo`
  action that restores rows from the persisted delete event snapshot.
- Updated destructive delete copy from "no undo" language to the narrower
  current contract: deletes are immediate, but Undo after saving can restore
  center rows.

This narrows the prior broad undo gap. It does not implement tree node/subtree
undo; current tree delete events do not persist a full subtree snapshot/restore
contract.

## Validation

- `bunx vitest run tests/vitest/estimate-sheet-version-control-schema.test.ts tests/vitest/estimate-sheet-version-control-actions.test.ts tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx --maxWorkers=1`
  passed, 3 files / 49 tests.
- `bun run type-check` passed.
- `git diff --check` passed.
- `supabase db query --linked --file supabase/migrations/20260626013000_estimate_row_delete_undo_rpc.sql`
  applied to linked project `ebxxqidacheyapmmzavr`.
- `supabase migration repair --linked --status applied 20260626013000`
  passed.
- Live provider readback shows
  `restore_deleted_estimate_rows_with_history` is `SECURITY DEFINER`, grants
  authenticated execute, denies anon execute, and has the expected arguments.
- `supabase migration list --linked` shows local and remote version
  `20260626013000` aligned.

## Remaining

- React DevTools active-tab rerender profiler proof for right-sidebar `F-13`.
- Tree node/subtree post-success undo contract and implementation.
- Center `M-21` through `M-24` component decomposition/extractions.
- Lazy subtree loading.
- Concrete realtime-v2 collaboration protocol.
