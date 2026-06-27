# Architecture And Technical Design

## Ownership Decision

Row reorganization is a content operation. `EstimateSheetContent` and `useEstimateRowHandlers` own the row tree mutation. `EstimateSheetTree` remains a node tree component and forwards external row drops as events.

This keeps the feature aligned with current ownership:

- Content owns estimate row state.
- Tree owns navigation and node reorder.
- Server action owns authenticated persistence.
- RPC owns atomic database order.

## New Contracts

Add a dedicated row drag MIME type:

```ts
export const ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE =
  "application/x-archestimator-estimate-row-item";
```

Add a typed event for left-tree drops:

```ts
export const MOVE_ESTIMATE_ROW_ITEM_EVENT =
  "archestimator:move-estimate-row-item";
```

Suggested drag payload:

```ts
type EstimateRowItemDragPayload = {
  rowItemId: string;
  sourceNodeId: string;
  sourceTabId?: string;
  label?: string;
};
```

The payload is only UI intent. The server must revalidate every field.

Suggested tree event detail:

```ts
type MoveEstimateRowItemEventDetail = {
  rowItemId: string;
  sourceNodeId: string;
  targetNodeId: string;
  activeTabId?: string;
  targetPosition: "append";
};
```

Middle-sheet row drops should call the row handler directly with an explicit `targetIndex`.

The row handler request must carry active tab context when the estimate uses tabs. The server remains authoritative for node tab membership, but the client should not issue a move without knowing the active tab boundary it is protecting.

## Move Dialog Contract

The Move row dialog is a client entry point into the same `moveRowItem` handler used by pointer drops. It resolves `targetNodeId`, `targetIndex`, and `placementSource: "dialog"` from canonical tree state, then calls the shared helper and mutation wrapper.

The dialog may reuse existing modal, tree, combobox, or list primitives, but it must not introduce a second mutation path. Pointer, keyboard, and touch paths all converge on the same resolved move request shape.

## Pure Move Helper

Add a pure helper in `src/lib/estimates/estimate-row-tree-move.ts` or next to `estimate-row-tree-patch.ts`.

Suggested API:

```ts
type MoveEstimateRowItemInTreeInput = {
  tree: EstimateTreeNode[];
  rowItemId: string;
  sourceNodeId: string;
  targetNodeId: string;
  targetIndex: number;
};

type MoveEstimateRowItemInTreeResult = {
  status: "moved" | "noop" | "not-found" | "invalid-target";
  tree: EstimateTreeNode[];
  movedRow?: EstimateRowItem;
  sourceNodeId?: string;
  targetNodeId?: string;
  affectedRowUpdates: Array<{
    rowId: string;
    nodeId: string;
    sortOrder: number;
    expectedRowRevision: number;
  }>;
};
```

Helper rules:

- Locate source row by `rowItemId` and `sourceNodeId`.
- Locate target node by `targetNodeId`.
- Remove the row from source siblings.
- For same-node moves, adjust the insertion index after removal.
- Insert at clamped `targetIndex`.
- Normalize affected source and target sibling lists to dense integer sort order `0..n-1` after every move.
- Return updates for every sibling whose stored `node_id` or `sort_order` changes under that dense order.
- Preserve object identity for unaffected branches and rows.
- Return every changed row update needed for a final-order database write.
- Return `noop` when same-node position does not change.

## Client Flow: Middle Sheet

1. User starts drag from the row handle.
2. Row table writes `ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE` with row and source node IDs.
3. Branch and row drop targets calculate `targetNodeId` and `targetIndex`.
4. `useEstimateRowHandlers.moveRowItem` calls the pure helper.
5. Handler applies optimistic `setTree`.
6. Handler calls mutation/server action with affected final row updates and expected revisions.
7. Success reconciles row revisions and order.
8. Failure restores previous tree and editable state.

## Client Flow: Left Tree

1. User drags a row handle over the left tree.
2. `TreeExternalDropOptions` accepts the row MIME type.
3. Tree dragover validates only MIME type, target node, position inside, edit/search/saving guards, and non-optimistic target ID.
4. On drop, `EstimateSheetTree` reads and validates the payload.
5. Tree dispatches `MOVE_ESTIMATE_ROW_ITEM_EVENT` with `targetPosition: "append"`.
6. `EstimateSheetContent` listens for the event and resolves the target node's append index from current canonical tree state.
7. Content calls the same `moveRowItem` handler used by the middle sheet.

## State Guards

Block move and reorder when:

- `readOnly` or missing edit authority.
- Active row save state is dirty or saving.
- Tree mutation state is saving or stale.
- Express editor is active for the source row.
- `sheetSearchActive`, facets, or group transforms are active.
- Source or target ID is optimistic.
- Target node does not exist in canonical tree.
- Same-node target index resolves to no actual move.

## Optimistic Consistency

The optimistic patch must update both source and target nodes. This is required even when the row is dropped through the left tree so the middle sheet, tree row counts, totals, and occupancy indicators converge.

After success, reconcile returned row revisions and server order. After failure, restore the saved tree snapshot through the active tree query restore path.

## Avoided Couplings

- Do not overload `ESTIMATE_TREE_DRAG_MIME_TYPE`.
- Do not use component drag MIME types.
- Do not make `EstimateSheetTree` call row server actions directly.
- Do not compose move from delete plus insert.
- Do not use browser repository direct upsert.
