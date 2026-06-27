# Executive Summary

## Recommendation

Implement estimate row reorganization as a dedicated row-item operation with a dedicated drag MIME type, client helper, server action, and transaction-safe Postgres RPC. Do not reuse the existing `moveRows` naming or component movement action, because that path moves library component contents between rows rather than moving estimate row items through the tree.

The minimum smooth feature is:

1. Add a real drag handle above the row selection checkbox in the existing selection column.
2. Allow the handle to drag a single row item.
3. Support precise same-branch reorder by dropping before or after another row in the same branch.
4. Support middle-sheet cross-branch movement by dropping into a target branch, with explicit insertion position when dropped between rows.
5. Support left-tree drops as inside-only branch targets, appending the row to the target node.
6. Persist the final sibling order atomically for every affected row.
7. Provide keyboard and touch access to the same operation through the Move row dialog.

## Why This Needs A Dedicated Plan

The current UI already contains drag behavior, but it is not row relocation:

- The row table explicitly removed a row reorder grip because reorder was not implemented.
- Component-level drag handles move component contents, not rows.
- Tree DnD currently reorders nodes, not rows.
- Existing row persistence supports insert, update, delete, and component move, but not row reparenting or same-node reorder.
- The database has a deferrable unique constraint on `(node_id, sort_order)`, so reorder needs atomic final-order writes.

## Key Product Point

Same-branch reorder is not an edge case. A user working in Living Room with three rows must be able to reorder those three rows while they remain in Living Room. The implementation must therefore carry a target position, not only a target branch.

## Implementation Shape

The safest design keeps ownership where the app already owns row state:

- `EstimateSheetContent` and row handlers own row movement.
- `EstimateSheetTree` remains a node navigator and node DnD surface; it forwards external row drops to content through a typed browser event.
- A pure tree helper calculates the new row order and affected row updates.
- A server action validates the request and calls a transaction-safe RPC.
- The RPC validates authorization, estimate and node membership, expected revisions, final order uniqueness, and records history.

## Success Criteria

The feature is ready when users can reorganize rows without layout shift, accidental selection, data loss, authorization bypass, stale tree display, or ambiguous order. Tests must prove same-branch reorder, cross-branch middle-sheet movement, left-tree append drops, rollback on persistence failure, accessibility semantics, and database integrity.
