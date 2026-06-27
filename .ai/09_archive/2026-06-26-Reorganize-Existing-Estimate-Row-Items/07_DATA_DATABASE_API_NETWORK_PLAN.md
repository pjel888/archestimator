# Data, Database, API, And Network Plan

## Data Model Reality

Rows are stored in `estimate_row_items` with `estimate_id`, `node_id`, and `sort_order`. The UI tree nests `EstimateRowItem` objects under `EstimateTreeNode.estimateRowItems`; row objects themselves do not carry a trusted node location in the TypeScript domain model.

Because `estimate_row_items` has a deferrable unique constraint on `(node_id, sort_order)`, reordering must write a valid final order atomically.

## Server Action

Add a server action in `src/lib/estimates/actions.ts`, for example:

```ts
export async function moveEstimateRowItemWithHistory(input: {
  projectId: string;
  estimateId: string;
  activeTabId?: string;
  mutationId: string;
  movedRowId: string;
  sourceNodeId: string;
  targetNodeId: string;
  updates: Array<{
    rowId: string;
    nodeId: string;
    sortOrder: number;
    expectedRowRevision: number;
  }>;
})
```

The action should:

- Validate UUID-shaped IDs.
- Require non-empty updates unless the helper reported `noop` and no action is called.
- Reject optimistic IDs and malformed input.
- Derive authenticated user context.
- Call an RPC with project, estimate, active tab, mutation, row updates, and expected revisions.
- Return changed row IDs with node IDs, sort order, row revisions, and event ID.

## RPC Shape

Add a transaction-safe RPC such as `move_estimate_row_item_with_history`.

Suggested parameters:

- `target_project_id uuid`
- `target_estimate_id uuid`
- `target_active_tab_id uuid default null`
- `move_updates jsonb`
- `moved_row_id uuid`
- `source_node_id uuid`
- `target_node_id uuid`
- `mutation_id uuid`

Suggested return:

```sql
{
  eventId,
  updatedRowCount,
  rows: [
    { rowId, nodeId, sortOrder, rowRevision }
  ]
}
```

## RPC Security Envelope

The migration must define the RPC with the same hardened posture as nearby history-writing estimate RPCs:

- `security definer`
- fixed `set search_path = public`
- actor derived from `auth.uid()` inside SQL, not from a caller-supplied `acting_user_id`
- reject null actor before authorization or history writes
- `revoke all on function ... from public`
- `revoke execute on function ... from anon`
- `grant execute on function ... to authenticated`
- no service-role-only browser path and no client-supplied actor attribution

Add a migration-contract test that asserts the function has the security definer/search-path posture and explicit revoke/grant statements.

## RPC Validation

The RPC must:

- Call the current history-writing edit authorization guard, such as `assert_can_edit_estimate_for_history` if that remains the active project convention.
- Validate the estimate belongs to the target project.
- Validate source and target nodes belong to the same estimate.
- Validate every update row belongs to the same estimate.
- Reject rows or target nodes in another tab unless a future product decision explicitly permits cross-tab movement. When `target_active_tab_id` is provided, source and target node tab membership must match it; when it is null, the RPC must derive a safe non-tabbed estimate context and still reject mixed-tab rows.
- Reject duplicate row IDs in the update payload.
- Reject duplicate final `(node_id, sort_order)` among affected rows and against unaffected rows.
- Reject negative or non-integer sort orders.
- Check expected row revisions for every changed row.
- Check `mutation_id` or the existing event-result replay path before locks, updates, and history insert. A retry with the same mutation ID returns the original result without a second event.
- Serialize concurrent moves for the same estimate or affected row set.
- Record one history event with minimal movement metadata.

## Locking And Ordering

Use deterministic locks:

1. Replay and return an existing result for the same `mutation_id` if one exists.
2. Lock the estimate row.
3. Lock affected nodes and rows in stable ID order.
4. Set the deferrable unique constraint deferred.
5. Apply the final dense-order updates.
6. Increment `row_revision` only for rows whose `node_id` or `sort_order` changed.
7. Insert the history event.
8. Persist the event result for idempotent retry.
9. Return final server state.

This prevents transient sort order collisions during same-branch reorder and cross-branch movement.

## Final-Order Update Contract

The client should send all rows whose final location or order changed, not only the dragged row. For same-branch reorder, this means the moved row and every sibling whose sort order shifts. For cross-branch movement, this means affected siblings in the source and target branches.

The sort-order rule is dense integer order `0..n-1` for each affected sibling list after the move. Do not leave this to sparse insertion arithmetic during implementation.

The RPC should still validate the final complete order against existing unaffected rows, because client input is untrusted.

## History Event

Use a new event type or payload discriminator such as `row_reorganized` or `row_relocated`. Avoid overloading any existing component-move event semantics.

Minimal payload:

```json
{
  "movedRowId": "row uuid",
  "sourceNodeId": "node uuid",
  "targetNodeId": "node uuid",
  "targetSortOrder": 3,
  "affectedRowCount": 4,
  "before": [
    { "rowId": "row uuid", "nodeId": "source node uuid", "sortOrder": 0 }
  ],
  "after": [
    { "rowId": "row uuid", "nodeId": "target node uuid", "sortOrder": 3 }
  ]
}
```

Store enough before/after row-location metadata to diagnose or manually repair a bad order. Avoid storing raw drag payloads or full row snapshots beyond the existing history snapshot patterns.

## Generated Types

After migration implementation, regenerate Supabase types if the project workflow requires it and update any typed RPC result readers. Existing history result readers may not include `nodeId` or `sortOrder`, so this operation should have a dedicated reader or an expanded result path.

## Network And Cache Behavior

The row handler should optimistically patch local tree state and then reconcile from the server result. It should not force a full route refresh for normal success. On conflict or unexpected server shape, restore and trigger the existing invalidation path used by row mutations.
