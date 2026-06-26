# Test And Validation Strategy

## Test Philosophy

Prove the row order contract below the UI first, then prove UI routing and rollback. Browser proof is useful for final drag geometry, but most correctness should be tested with pure and DOM-level tests.

## Pure Helper Tests

Create `tests/vitest/estimate-row-branch-move.test.ts`.

Required cases:

- Reorder within same branch from lower index to higher index.
- Reorder within same branch from higher index to lower index.
- Same-branch no-op when target position resolves to current position.
- Move from source branch to empty target branch.
- Move from source branch to populated target branch at top, middle, and end.
- Return final updates for all shifted rows.
- Return dense `0..n-1` sort orders for affected sibling lists.
- Accept and return `EstimateTreeNode[]` forest state.
- Preserve row data for moved and unaffected rows.
- Reject or report missing source row.
- Reject or report missing target node.
- Reject optimistic IDs when helper is asked to validate them.
- Large branch order calculation remains bounded.

## Middle Sheet DOM Tests

Create or extend `tests/vitest/estimate-sheet-row-drop-to-branch.test.tsx`.

Required cases:

- Drag handle appears above checkbox on hover or focus.
- Checkbox behavior remains unchanged.
- Compact handle drag start does not toggle the checkbox.
- Coarse-pointer mode exposes a Move row action with a target-size-compliant activation area.
- Same-branch row drop before another row reorders rows.
- Same-branch row drop after another row reorders rows.
- Cross-branch middle-sheet drop moves row.
- Branch append drop moves row to end.
- Invalid target does not call mutation.
- Persistence failure restores previous row order.
- Dirty/saving/search/facet/group states disable movement.
- Dropped/saving state blocks repeated moves for the same row.
- Conflict failure restores the snapshot and shows stale-order copy.

## Left Tree DOM Tests

Extend `tests/vitest/estimate-sheet-tree-dom.test.tsx`.

Required cases:

- Tree accepts `ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE`.
- Tree row drop is inside-only.
- Tree dispatches row move event with row ID, source node ID, target node ID, and append target.
- Tree rejects malformed payload.
- Tree rejects optimistic target node.
- Tree node reorder behavior remains unchanged for node MIME type.

## Persistence Tests

Add action/RPC coverage near existing estimate action tests. For RPC behavior, include a real local/provider database proof; mocked action tests cannot prove PL/pgSQL locks, deferrable unique constraints, grants, or rollback behavior.

Required cases:

- Authorized same-branch reorder persists final sort orders.
- Authorized cross-branch move updates `node_id` and final sort orders.
- Unauthorized user is rejected.
- Target node outside estimate is rejected.
- Row outside estimate is rejected.
- Cross-tab target is rejected for MVP.
- Stale expected row revision is rejected.
- Duplicate final sort order is rejected.
- RPC derives actor from `auth.uid()` and ignores or rejects spoofed actor attribution.
- Retrying the same `mutation_id` returns the original event/result without applying a second mutation.
- Migration contract asserts `security definer`, fixed search path, public/anon execute revokes, and authenticated execute grant.
- Event is recorded with minimal movement metadata.

## Accessibility Tests

Use DOM tests where practical:

- Handle has a clear accessible name.
- Handle is focusable when available.
- Keyboard move action opens the Move row dialog.
- Dialog initial focus lands on target branch selection.
- Escape and Cancel close without mutation.
- Confirm stays disabled until a valid target and position are selected.
- Empty branch target copy is announced.
- Focus returns after success and failure.
- Live announcement or toast text is emitted for success and failure.

## Browser Geometry Proof

Pointer drag/drop geometry is a release gate for this feature. Unit and DOM tests should prove logic and routing first, but final implementation must include focused browser proof that:

- The compact fine-pointer handle can start drag without toggling the checkbox.
- Same-branch before/after insertion indicators resolve to the intended row.
- Cross-branch middle-sheet drop hits the intended branch or row target.
- Left-tree inside drop appends and does not trigger tree-node reorder.
- The coarse-pointer Move row dialog remains usable without hover.

## Performance Tests

Keep existing tests passing:

- `tests/vitest/estimate-row-table-virtualization.test.tsx`
- `tests/vitest/estimate-tree-drag-over-perf.test.ts`
- `tests/vitest/estimate-sheet-column-model.test.ts` if the column model changes

Add helper-scale tests for large sibling arrays.

## Targeted Commands

During implementation, run:

```bash
bunx vitest run tests/vitest/estimate-row-branch-move.test.ts --maxWorkers=1
bunx vitest run tests/vitest/estimate-sheet-row-drop-to-branch.test.tsx tests/vitest/estimate-sheet-tree-dom.test.tsx --maxWorkers=1
bunx vitest run tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1
bun run type-check # or targeted TypeScript/LSP check if pre-existing typecheck reds still block full typecheck
git diff --check
```

Also run and record the exact real DB RPC proof command selected during implementation. That command must exercise the migration/RPC against a real local or provider Supabase database and prove locks, deferrable unique ordering, grants, idempotent retry, and rollback behavior.

If pre-existing project typecheck errors remain unrelated, record them with file evidence and run the narrowest TypeScript/LSP check that covers changed files instead of using full typecheck as a false gate.
