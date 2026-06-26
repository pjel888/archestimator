# Implementation Plan

## Phase 1: Lock Behavior With Pure Tests

1. Add pure helper tests for:
   - Same-node reorder from index 2 to index 0.
   - Same-node reorder from index 0 to index 2.
   - Cross-node move to top, middle, and bottom.
   - Tree target append.
   - No-op same position.
   - Missing row, missing source, missing target, and optimistic IDs.
2. Assert the helper accepts and returns `EstimateTreeNode[]`, matching current tree query and patch helper seams.
3. Assert affected source and target sibling lists normalize to dense integer sort order `0..n-1`.
4. Implement the pure helper only after tests describe final order and affected update output.
5. Confirm helper does not mutate the input tree.

## Phase 2: Add Persistence Contract

1. Add the singular server action signature `moveEstimateRowItemWithHistory`.
2. Add the migration RPC `move_estimate_row_item_with_history`.
3. Apply the hardened RPC envelope: security definer, fixed search path, public/anon execute revokes, authenticated execute grant, actor derived from `auth.uid()`.
4. Validate authorization, project, estimate, active tab, node membership, row membership, expected revisions, idempotency, and final dense order.
5. Return updated row revisions and sort order.
6. Add action/RPC tests for authorized success, unauthorized rejection, malformed payload, stale revision, cross-estimate target, cross-tab target, same-node reorder, cross-node move, actor spoof rejection, idempotent retry, and RPC privilege envelope.
7. Run a real local/provider database proof for the RPC before treating persistence ready; mocked action tests are not enough for locking, deferrable uniqueness, grants, or PL/pgSQL rollback behavior.

## Phase 3: Add Client Mutation And Handler

1. Add a row move mutation wrapper distinct from existing component `moveRows`.
2. Add `moveRowItem` to `useEstimateRowHandlers`.
3. Resolve current source and target from canonical tree state.
4. Apply optimistic patch through `activeTreeQuery.setTree`.
5. Save a rollback snapshot.
6. Reconcile success result and returned revisions.
7. Restore on failure and show user feedback.

## Phase 4: Add Middle Sheet UI

1. Add dedicated row drag MIME constants and payload parser.
2. Add handle above checkbox in `row-table.tsx`.
3. Keep the compact rail handle fine-pointer only unless column width is widened; expose the coarse-pointer Move row action outside the 32px rail.
4. Ensure checkbox click, focus, and selection tests still pass.
5. Add row insertion indicators before or after hovered rows.
6. Add branch append drop target for empty/background branch drops.
7. Disable drag under transformed or unsafe states.
8. Add DOM tests for same-branch reorder, cross-branch move, no overlap/event leakage, and coarse-pointer move action availability.

## Phase 5: Add Left Tree External Drop

1. Add row MIME type to `EstimateSheetTree` external drop options.
2. Keep tree row drops inside-only.
3. Reject optimistic or invalid target nodes.
4. Parse row payload on drop.
5. Dispatch `MOVE_ESTIMATE_ROW_ITEM_EVENT`.
6. Listen in `EstimateSheetContent` and resolve append index from canonical tree.
7. Add DOM tests that the tree emits the event and does not perform node reorder.

## Phase 6: Add Keyboard And Touch Fallback

1. Add the Move row dialog from the handle and coarse-pointer row action.
2. Reuse existing dialog primitives.
3. Let user select target branch and explicit position.
4. Support same-branch reorder in the dialog.
5. Support cancel/Escape, disabled confirm until a valid target is resolved, empty branch append copy, conflict copy, and virtualized-row focus fallback.
6. Restore focus and announce success or failure.
7. Add accessibility tests for labels, focus, keyboard path, coarse-pointer action, disabled transformed-view explanation, and lifecycle copy.

## Phase 7: Polish And Validation

1. Run targeted vitest suites.
2. Run typecheck.
3. Run `git diff --check`.
4. Use browser proof for pointer geometry and actual drag/drop before release because this feature depends on real drag/drop hit testing that DOM tests cannot fully prove.
5. Review for false affordances: no visible handle in any state where movement is unavailable.

## Sequencing Rule

Do not add the visible drag handle until the helper, handler, and persistence path are in place or feature-guarded in the same implementation branch. The existing code explicitly removed a false row reorder handle, so the new handle must not ship as a cosmetic control.
