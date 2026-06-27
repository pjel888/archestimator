# Feature Brief And Scope

## Problem

The estimate sheet is mission-critical for the MVP. Users must be able to add, edit, delete, replace, move, reorder, and recover estimate content at spreadsheet speed. Today, routine mutations surface as saving toasts and some operations are blocked while a global save state is dirty/saving. A reported bug says that after dragging a row item from the sheet content into another tree branch/area, that moved row and other row items in the target area can become unable to drag/reorder.

## Target Outcome

All estimate sheet content actions are:

- **Non-blocking:** the user can continue working while persistence drains in the background.
- **Durable:** every committed action persists through the correct DB/RPC path with stable idempotency.
- **Recoverable:** failures are local, visible, retryable, and do not silently discard user work.
- **Conflict-aware:** stale revisions do not overwrite newer local or remote work.
- **Accessible:** every drag/drop operation has a keyboard and practical touch alternative.
- **Measured:** lag-free claims have budgets, fixtures, and pass/fail evidence.
- **Secure:** direct RPC/table/API paths cannot bypass edit/access policy.

## In Scope

| Area | Included Actions |
|---|---|
| Row CRUD | Add blank row, insert library row, edit scalar fields, edit quantity/add-ons, edit row adjustment/misc cost, delete one row, bulk delete, undo/restore |
| Component CRUD | Replace component, clear component, detach/make project-specific, promote to workspace library, move component between rows, image/source edits |
| Row organization | Same-node reorder, cross-node move, content-to-tree append, move-row dialog, table drop-to-end |
| Tree/content bridge | Tree external drop handling, selected-node sync, load-limited movement disablement, subtree hydration effects |
| Tree actions affecting content | Add/rename/delete/bulk delete/reorder/move areas where row content persistence or route context is affected |
| Tabs | Create, rename, duplicate, reorder, delete, switch active tab, tab-scoped row/tree mutations |
| Persistence | Mutation IDs, queue/order, RPC contracts, route-context cache invalidation, TanStack query cache reconciliation |
| Recovery | Retry, revert, undo, local draft preservation, stale revision refresh, failed express draft handling |
| Performance | Route load, typing, totals, drag hover, drop, persistence ack, mounted row count, queue age, offline/degraded behavior |
| Security/privacy | RPC edit enforcement, RLS, private image access, source snapshot allowlist, history visibility, CSRF/same-origin expectations |
| Documentation | Stale `.ai/06_specs` and action-matrix readiness docs |

## Non-Goals

- No app-code implementation in this planning pass.
- No migration, provider mutation, deployment, or production toggle in this planning pass.
- No proposal/export redesign except where row data persistence affects proposal totals/read models.
- No cost-library manager redesign except insert/replace/promote/detach flows used by the sheet.
- No visual redesign beyond required feedback, accessibility, and interaction-state corrections.

## Success Criteria

| Criterion | Definition |
|---|---|
| Action coverage | `18_USER_ACTION_AND_PROOF_MATRIX.md` has every user-facing sheet action with persistence, optimistic behavior, error path, undo/retry, and proof plan. |
| Non-blocking UX | Routine success saves do not show global toasts and do not block unrelated row/tree actions. |
| Row move stability | Content-to-tree move, then same-target-area row reorder and cross-branch reorder, pass unit and browser proof. |
| Persistence safety | Stable mutation IDs, DB-level edit checks, revision guards, and cache finalization exist for every content mutation. |
| Lag-free proof | Budgeted tests prove route, typing, totals, drag/drop, queue, and large-sheet budgets. |
| Security proof | Viewer/workspace-only/unrelated users cannot mutate/read protected content through direct RPC/API paths. |
