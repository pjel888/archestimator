# UX, UI, And Accessibility Plan

## Interaction Model

The row handle is a compact drag button placed above the selection checkbox in the existing selection column. It uses a familiar grip icon such as `DotsSixVertical`. On fine-pointer layouts, the handle is visible when the row group is hovered or focused within. Coarse-pointer layouts use a separate persistent Move row action rather than relying on the compact rail handle.

The row checkbox remains the checkbox. The drag handle remains the drag handle. Pointer, keyboard, and event propagation must keep those affordances separate.

## Visual Placement

- Use the existing select column if possible.
- Stack the drag handle above the checkbox inside the 32px select column.
- Keep stable row height and column width.
- Avoid adding a new grid column unless implementation proves the existing column cannot meet touch or accessibility needs.
- If column width changes, update the canonical column model and tests.

## Target And Hit-Area Strategy

The 32px select column is acceptable only for fine-pointer desktop drag. It must not be the only coarse-pointer path.

- Fine pointer: a compact drag handle appears above the checkbox in the existing select rail. The handle and checkbox own separate event targets, and tests must prove drag start does not toggle selection.
- Keyboard: the focused handle opens the Move row dialog with Enter or Space.
- Coarse pointer: expose a persistent Move row action outside the stacked 32px rail, using an activation target of at least 44 by 44 CSS px.

If the fine-pointer handle and checkbox cannot fit without overlap or accidental toggles, widen the select column and update `src/lib/estimate-sheet/column-model.ts` plus column-model tests. Do not ship a stacked rail that depends on sub-32px touch precision.

## Middle Sheet Drop Feedback

For row-to-row drops:

- Show an insertion line before or after the hovered row.
- Resolve the insertion line to a final `targetIndex`.
- Support same-node reorder and cross-node move through the same index contract.

For branch background or empty branch drops:

- Show a branch-level append affordance.
- Append to the end of the target branch's row list.

For transformed views:

- Disable row movement in search, facet, group, or other render-only transformed order views for the first implementation.
- Explain disabled state with text reachable outside hover-only tooltips: `Row movement unavailable while this view is filtered or grouped`.

## Left Tree Drop Feedback

The left tree accepts row drops only as `inside` target drops. Before and after tree bands remain reserved for tree node reorder. A row drop onto a tree node appends the row to that node.

The tree should not navigate or select a node as a side effect of row drop unless current tree behavior already does so for external template drops and product confirms that behavior is desired.

## Keyboard Access

Native pointer drag does not satisfy keyboard access. Use a Move row dialog for the MVP fallback. A menu is too cramped for branch browsing plus explicit row position.

The dialog should provide:

- Target branch selection.
- Position choices for the selected branch: top, bottom, before a specific row, or after a specific row.
- Same-branch reorder support.
- Confirmation and cancel controls.
- Focus restoration to the row after completion.

Dialog behavior:

- Open from the focused row handle or coarse-pointer Move row action.
- Initial focus lands on the target branch selector.
- Tab order is branch selector, position selector, target row list when needed, confirmation, cancel.
- Escape and Cancel close without mutation and return focus to the opener.
- Confirm is disabled until the dialog resolves a valid `targetNodeId` and `targetIndex`.
- Empty branches show `Append as first row in {branch name}` with the actual branch name substituted.
- The target row list may be virtualized or searchable, but screen-reader text must include the moved row's current branch and current position.
- After success, return focus to the moved row handle if mounted; otherwise focus the nearest visible row affordance in the destination branch and announce the destination.
- After rollback or conflict, return focus to the original row handle if mounted; otherwise focus the sheet status region and announce the failure.

## Touch Access

Touch users cannot rely on hover. On coarse pointers:

- Do not rely on the compact rail handle as the primary touch target.
- Expose the persistent Move row action with a 44 by 44 CSS px target outside the compact select rail.
- Use the same Move row dialog for reliable touch movement.
- Native drag may remain available where platform behavior is stable, but the dialog is the dependable touch path.

## Announcements

Use live announcements or existing toast patterns for:

- Drag start: row name and current branch.
- Valid target: target branch and position.
- Dropped/saving: `Moving row...`.
- Success: moved or reordered row and destination.
- Stale conflict: `Row order changed elsewhere. Review the latest order and try again.`
- Failure: movement was not saved and prior order was restored.
- No-op: `Row is already in that position`.

## Disabled States

Disable or hide drag when:

- User cannot edit.
- Row or tree save state is dirty or saving.
- Express editor or draft edit is active.
- Multiple selected rows make single-row intent ambiguous.
- Source or target node has an optimistic ID.
- Sheet search, facet, or grouping transforms visible order.
- Left tree search/filter makes target context ambiguous.

## Move Lifecycle States

| State | Visible UI | Assistive Output | Recovery |
| --- | --- | --- | --- |
| Idle available | Handle/action visible under pointer or focus rules | Handle/action label includes row name | None |
| Idle unavailable | Disabled handle/action or hidden drag rail | Reason text such as `Row movement unavailable while estimate changes are saving` | User resolves saving, edit, transformed view, or permission state |
| Dragging | Source row shows active drag state | Row name and current branch | Escape/cancel drag leaves order unchanged |
| Valid target | Insertion line or branch append affordance | Target branch and position | Drop or move away |
| Invalid target | No successful drop affordance | Unavailable reason when triggered by keyboard/focus path | Choose valid target |
| Dropped/saving | Optimistic order plus saving status | `Moving row...` | Block repeated move for that row until result |
| Success | Server order reconciled | Moved row and destination | Focus restoration per keyboard section |
| Stale conflict | Prior order restored and tree invalidation runs | Conflict copy from Announcements | Retry after reconciliation |
| Rollback failure | Restore snapshot when possible, then invalidate tree | Reloading latest row order | Existing tree refetch repairs state |
| No-op | No visual order change | No-op copy from Announcements | None |

Partial success is not allowed. The RPC must be transactional; if the client receives a partial or unexpected result, it treats the operation as failure, restores the snapshot, and invalidates the tree.

## Accessibility Labels

The handle label should be specific:

- Pointer handle: `Drag row {row name}` with the actual row name substituted.
- Keyboard action: `Move row {row name}` with the actual row name substituted.
- Disabled explanation when needed: `Row movement unavailable while estimate changes are saving`
- Empty branch target: `Append {row name} as first row in {branch name}` with actual names substituted.
- Invalid tree target: `Rows can only be dropped inside an editable branch`

The label must not claim row reorder is available until the operation is wired through optimistic state and persistence.
