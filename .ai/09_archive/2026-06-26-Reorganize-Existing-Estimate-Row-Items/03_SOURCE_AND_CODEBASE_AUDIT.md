# Source And Codebase Audit

## Primary Orchestrator

`src/components/workshop/EstimateSheetContent.tsx` owns the middle estimate sheet. It imports and coordinates:

- `useEstimateRowMutations`
- `useEstimateAreaTreeQuery`
- `useEstimateTabTreeQuery`
- `useEstimateRowHandlers`
- `useEstimateTemplateInsertion`
- `EstimateSheetVirtualBranchList`

`useEstimateRowMutations` currently returns `insertRow`, `replaceRow`, `moveRows`, `detachRow`, `promoteRow`, `deleteRow`, `deleteRows`, `restoreDeletedRows`, and `updateRow`. The existing `moveRows` name is misleading for this task because its implementation moves component contents between rows.

`activeTreeQuery` gives the content layer `{ tree, setTree, restore, getTreeRevision }`. This is the correct ownership point for optimistic row tree patches and rollback.

## Rendered Tree Caveat

`displayedSheetNode` is a render-only transform of the active selected node. Search pruning, facet filtering, and grouping can alter visible order without representing the persisted sibling order. Row drag and reorder should be disabled in these transformed views for the first implementation, unless a later design explicitly defines append-only behavior for filtered views.

## Middle Row Table

`src/components/workshop/estimate-sheet/rows/row-table.tsx` renders estimate rows. The row component uses a grid table-row element with `data-estimate-row-id`.

Important local evidence:

- The row selection control lives in the second grid column.
- A source comment states that row reorder grip was removed because reorder was not implemented and would be a false affordance.
- Row height defaults to 96px in virtualization paths.
- The table root already accepts library item drops, but those insert new rows rather than move existing rows.

The handle should fit above the selection checkbox in the existing select column to avoid a column model change. If implementation needs a wider select column, update `src/lib/estimate-sheet/column-model.ts` and `tests/vitest/estimate-sheet-column-model.test.ts`.

## Existing Component Drag Is Different

`src/components/workshop/estimate-sheet/rows/cells.tsx` includes component-level drag behavior for component cells. It uses `ESTIMATE_COMPONENT_DRAG_MIME_TYPE` and payloads that identify a component inside a row. This must remain separate from row movement.

## Branch And Drop Zones

`src/components/workshop/estimate-sheet/rows/branch.tsx` renders branch headers, row tables, component/template drop zones, and drag-edge auto-scroll. It currently receives component movement props but no row item movement or reorder callback.

`src/components/workshop/estimate-sheet/rows/drop-zones.tsx` handles library/template insertion. `ComponentDropTarget` appears for `activeDrag?.kind === "library-item"` and accepts library item MIME types. Row movement needs a separate row drop target or a clearly separated branch drop path, not an overload of library insertion.

The code follows the P6 single-node model: a node can own both child nodes and row items. The plan must allow dropping onto any valid editable node, not only leaf nodes.

## Left Sidebar Tree

`src/components/workshop/EstimateSheetTree.tsx` renders the left tree and current tree-node DnD. It imports `Tree`, `TreeDropPosition`, and `TreeExternalDropOptions`.

Existing tree behavior:

- Internal DnD uses `ESTIMATE_TREE_DRAG_MIME_TYPE` and is node-only.
- Reorder is blocked while saving, deleting, editing, searching, or using optimistic IDs.
- `treeExternalDrop` currently accepts template and project source MIME types.
- External drops accept only `position === "inside"` and require a real non-optimistic target node.
- On external drop, the tree dispatches browser events such as template insertion events and lets content own the actual mutation.

This same event handoff pattern should be used for row drops. The tree should not mutate row state directly.

`src/components/ui/tree.tsx` only has access to MIME types during dragover. It can validate target node and external MIME type, but cannot trust or inspect the row payload until drop. Row payload validation belongs in the drop handler and server action.

## Row Mutation And Handler Layer

`src/hooks/use-estimate-row-mutations.ts` currently implements:

- row insert, update, delete, restore, promote
- component movement through `moveEstimateRowComponentWithHistory`

`MoveEstimateRowsInput` is for component movement and includes source and target library item data. It has no `targetNodeId`, `targetIndex`, or final sibling order.

`src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts` already contains useful row tree utilities:

- `findEstimateRowItemLocation`
- `removeEstimateRowItem`
- `restoreEstimateRowItemAtLocation`

This hook is the right orchestration seam for optimistic movement, editable row state, rollback, focus restoration, toast messages, and project projections. It already gates some actions while save state is dirty or saving; row movement should follow the same safety posture.

## Pure Tree Patch Utility

`src/lib/estimates/estimate-row-tree-patch.ts` currently patches a row in place. It does not move a row across nodes or reorder siblings. Add a pure helper here or in a sibling file such as `estimate-row-tree-move.ts`.

## Server Actions And RPCs

`src/lib/estimates/actions.ts` includes:

- `insertEstimateRowItemFromLibrary`
- `updateEstimateRowItem`
- `deleteEstimateRowItem`
- `moveEstimateRowComponentWithHistory`

No live-workshop action currently persists row relocation or same-node reorder.

`src/lib/domain/estimate-mutations.ts` and `src/lib/repositories/estimate-repository.ts` include older direct repository movement code. Do not reuse browser direct upsert for the workshop feature. The live path needs a server action and RPC with authorization, expected revisions, history, and same-estimate validation.

## Database Facts

`supabase/migrations/20260518090000_archestimator_core_schema.sql` defines `estimate_row_items` with:

- `estimate_id`
- `node_id`
- `sort_order`
- deferrable unique constraint on `(node_id, sort_order)`

Rows have no UI-level `nodeId` field in `EstimateRowItem`; location is implicit in `EstimateTreeNode.estimateRowItems`. The RPC must therefore be authoritative for `node_id` and `sort_order`, and client helpers must calculate final location from the tree.

There is no cross-column foreign key proving that a row's `estimate_id` matches a target node's `estimate_id`. The RPC must explicitly validate target nodes and rows are in the same estimate and authorized project.

## Relevant Tests

Known adjacent tests:

- `tests/vitest/estimate-sheet-cost-inputs.test.tsx` covers hover-revealed row selection.
- `tests/vitest/estimate-row-table-virtualization.test.tsx` covers bounded row table virtualization.
- `tests/vitest/estimate-sheet-tree-dom.test.tsx` covers external tree drop events.
- `tests/vitest/estimate-sheet-tree-dnd.test.tsx` covers tree DnD reorder and rollback.
- `tests/vitest/tree-external-drop.test.tsx` covers external drop cleanup.
- `tests/vitest/estimate-tree-drag-over-perf.test.ts` covers dragover performance.
- `tests/vitest/estimate-sheet-column-model.test.ts` covers row grid columns.
