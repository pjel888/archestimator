# Requirements Specification

## Functional Requirements

R1. Add a row drag handle above the row selection checkbox for editable estimate rows.

R2. The handle starts row reorganization only. It must not start component movement, row selection, or tree-node movement.

R3. A user can reorder rows within the same branch or area by dropping a dragged row before or after another row in that same branch.

R4. A user can move a row from one branch to another branch in the middle sheet.

R5. A user can drop a row onto a branch in the left sheet tree. Tree row drops are inside-only and append the row to the target branch.

R6. The operation moves exactly one row in the first implementation.

R7. The operation preserves row data, component data, source links, totals, row revision intent, editable row state, and selection state unless the moved row was actively edited and movement is blocked.

R8. The operation persists the final sibling order for every affected row.

R9. The operation records a history event with minimal row movement metadata.

R10. The operation rolls back optimistic UI when persistence fails.

R11. The operation restores focus to the moved row handle or nearest valid row affordance after success or rollback.

R12. The operation is unavailable for read-only users.

R13. The operation is unavailable while the relevant tree or row state is dirty, saving, editing, filtered, grouped, searched, or contains optimistic source or target IDs.

R14. The operation validates row and target node membership in the same estimate and same active tab.

R15. The operation exposes a keyboard and touch fallback for move or reorder.

R16. The operation is disabled while multiple rows are selected in the first implementation.

## Target Position Contract

Every row move request must resolve to:

- `rowItemId`
- `sourceNodeId`
- `targetNodeId`
- `targetIndex`
- `activeTabId`
- `placementSource`

`targetIndex` is required even when `sourceNodeId === targetNodeId`. This is what makes same-branch reorder explicit.

`activeTabId` is required when the estimate uses tabs. The server remains authoritative for source and target node tab membership, but the request must carry the active tab context so cross-tab movement is rejected explicitly.

## Nonfunctional Requirements

N1. No layout shift when the handle appears on hover or focus.

N2. Dragover validation in the tree remains cheap and MIME-based.

N3. Row virtualization behavior remains bounded and stable.

N4. The server rejects malformed, stale, unauthorized, cross-estimate, and cross-tab requests.

N5. The implementation does not add a new dependency without explicit owner approval.

N6. Tests prove the row move logic independent of browser drag geometry.

N7. Browser-level DnD proof is added during implementation only where it proves geometry that unit/DOM tests cannot.

N8. Fine-pointer drag and checkbox targets do not overlap or steal each other's events. Coarse-pointer users get a target-size-compliant Move row action instead of relying on the compact select rail.

N9. Row movement is transactionally atomic. Partial success is not a valid user-facing state; unexpected partial or malformed server results restore prior client state and invalidate the tree.

## Acceptance Criteria

- Drag handle appears above the checkbox on hover and keyboard focus for editable rows.
- Coarse-pointer layouts expose a Move row action with at least a 44 by 44 CSS px activation target.
- Checkbox click, checkbox keyboard use, and multi-select state remain unchanged.
- Keyboard users can open a Move row dialog, choose target branch and position, confirm, cancel, and return focus predictably.
- Same-branch reorder changes visual row order and persisted `sort_order`.
- Cross-branch middle-sheet movement removes the row from source and inserts it at the intended target position.
- Left-tree inside drop appends the row to the target node and leaves tree-node order unchanged.
- Invalid targets show no successful drop affordance and do not mutate state.
- Failed persistence restores the previous tree and announces or toasts the failure.
- Targeted tests pass and typecheck passes after implementation.
