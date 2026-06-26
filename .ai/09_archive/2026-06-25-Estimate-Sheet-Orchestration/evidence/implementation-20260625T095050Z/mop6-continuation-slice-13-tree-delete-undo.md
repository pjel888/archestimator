# MOP-6 Continuation Slice 13: Tree/Subtree Delete Undo

Date: 2026-06-26

## Scope

Closed the tree/sidebar post-success delete Undo gap for single-node, subtree,
and bulk tree deletes.

This slice does not claim a general undo stack for every tree edit. It covers
successful delete restoration from persisted delete history events.

## Changes

- Added migration `20260626023000_estimate_node_delete_undo_rpc.sql`.
- Added `estimate_node_snapshot` for canonical node delete snapshots.
- Updated `delete_estimate_node_with_history` and
  `delete_estimate_nodes_bulk_with_history` so new delete events persist full
  `deletedNodes` and `deletedRows` payload snapshots.
- Added `restore_deleted_estimate_nodes_with_history` with project-scoped edit
  authorization, idempotency, subtree restore, row restore, sort-slot collision
  handling, and restore history events.
- Raised the bounded `estimate_sheet_events` snapshot size limit to 5 MB so
  subtree delete history can fit without duplicating the same snapshots in
  `old_snapshot`.
- Added `restoreDeletedEstimateNodes` server action and preserved delete
  `eventId` from single/bulk tree delete actions.
- Added tree success-toast `Undo` actions that restore the refreshed tree and
  repair selection/URL back to the deleted route when the delete forced a
  fallback.
- Updated tree delete copy to reflect the new post-success Undo path.

## Local Evidence

- `bunx vitest run tests/vitest/estimate-tree-context-menu.test.tsx tests/vitest/estimate-tree-bulk-selection.test.tsx tests/vitest/estimate-node-reorder-action.test.ts tests/vitest/estimate-sheet-version-control-schema.test.ts --maxWorkers=1`
  passed 4 files / 82 tests.
- `bun run type-check` passed.
- `git diff --check` passed.

## Provider Evidence

- Linked Supabase project verified as `ebxxqidacheyapmmzavr` through
  `supabase/.temp/project-ref` and `supabase/.temp/linked-project.json`.
- Applied `supabase/migrations/20260626023000_estimate_node_delete_undo_rpc.sql`
  to the linked project with `supabase db query --linked --file ...`.
- Repaired migration history with
  `supabase migration repair --linked --status applied 20260626023000`.
- Readback confirmed:
  - `restore_deleted_estimate_nodes_with_history` is `SECURITY DEFINER`.
  - `delete_estimate_node_with_history` and
    `delete_estimate_nodes_bulk_with_history` remain `SECURITY DEFINER`.
  - Execute grants are present for `authenticated`, `postgres`, and
    `service_role`; no `anon` grant is present.
  - `estimate_node_snapshot` is not `SECURITY DEFINER` and is not executable by
    `anon` or `authenticated`.
- `supabase migration list --linked` shows local/remote alignment for
  `20260626023000`.

## Remaining Boundary

The full source-folder completion answer remains no. Remaining open rows after
this slice are F-13 React DevTools active-tab profiler proof, full
`EstimateSheetContent.tsx` hook/component decomposition, lazy subtree loading,
and the concrete realtime-v2 collaboration contract.
