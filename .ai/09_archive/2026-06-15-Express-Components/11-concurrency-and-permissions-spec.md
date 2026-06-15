---
title: Express Components Concurrency And Permissions Spec
type: docs
date: 2026-06-15
---

# Concurrency And Permissions Spec

## Collaboration Model

Optimistic express drafts are local-only until insert success. A draft may have a client row id and DOM `data-estimate-row-id`, and that client id may later be reconciled with the persisted row. It is still not a persisted collaboration anchor until the insert returns successfully.

Required rule: draft rows carry `persisted=false` or equivalent local state, and cursor/presence broadcast suppresses row/cell anchors for those rows. A peer must not render another user's unpersisted draft row or cursor. After insert success:

- the creating client reconciles the optimistic row with the persisted snapshot
- the shared query/cache receives the persisted row id and `rowRevision`
- peers do not receive row data through realtime today; the current app has cursor/presence channels but no `postgres_changes` row subscription, row queries can stay fresh for five minutes, and mutation invalidations use no active refetch
- peers see the persisted row only after manual refresh, navigation, explicit query invalidation/refetch, or a future row-sync workstream
- cursor anchoring uses the persisted `data-estimate-row-id`

No peer cursor may anchor to a transient client-only draft id. If a user is typing in a draft, their peer may see presence at the estimate/node level but not a row/cell cursor until persistence.

Day-0 correctness relies on optimistic-lock integrity and eventual/manual visibility, not live row propagation. If near-real-time peer row visibility becomes a requirement, add a separate U9 row-sync workstream with RLS, replication, cache-invalidation, and no-leak tests before claiming realtime row visibility.

## Concurrent Edits

All express updates use `expected_row_revision`.

If an update loses a revision race:

- do not overwrite the peer's saved value
- fetch/reconcile the latest row
- keep the user's unsaved field value in local recovery state
- show stale-revision copy from doc 09
- allow Retry after review
- do not assume an existing hook already handles this UX; implementation must recognize the `estimate_sheet_row_revision_conflict` or equivalent server error, retain the unsaved local field, and render the doc 09 stale-revision recovery state

For multi-field edits, each field commit is ordered per row. Later queued commits must rebase on the latest returned row revision.

## Reconnect / Replay

On reconnect:

- persisted express rows are refetched like normal estimate rows
- local failed drafts remain local until Retry/Delete
- stale queued updates revalidate row revision before sending
- promotion retries reuse the same promotion correlation id
- navigating away from the estimate or switching tabs with an unsaved draft prompts to keep/delete the draft when possible; if the app cannot prompt, it deletes only the local draft and never sends a partial update without persisted row revision

## Cursor Anchoring

Express fields use stable data attributes:

- `data-estimate-row-id`
- `data-express-field="name|description|unit|unitCost|supplier|imageUrl"`

Numeric cells keep existing `data-estimate-cell-index` semantics. Remote cursors for express fields render only after the row has a persisted id.

## Permission Matrix

| Role/capability | Add/edit express | Delete draft | Make project-specific | Promote to library | Project folder read |
| --- | --- | --- | --- | --- | --- |
| Viewer/read-only collaborator | No | No | No | No | Read only if project access allows |
| Estimate editor, not workspace editor | Yes | Yes | Yes for editable estimate rows | No | Yes |
| Workspace library writer with estimate edit | Yes | Yes | Yes | Yes | Yes |
| Platform admin | Yes, subject to existing admin policy | Yes | Yes | Yes | Yes |

UI controls must be hidden or disabled consistently with this matrix, but server actions/RPCs are authoritative. Current row insert/update/replace actions do not yet enforce the edit boundary: they must add `assertCanEditEstimate` or equivalent RPC-level `can_edit_estimate` checks before express authoring ships.

Promotion RPC checks:

- `can_edit_estimate(target_estimate_id)`
- the exact workspace-library write predicate used by current folder/item mutations. This plan chooses parity with the current library policy (`is_workspace_editor` / policy-equivalent behavior, currently member-inclusive) rather than inventing a stricter gate. A stricter admin/editor promotion gate requires a new product/security decision because it intentionally differs from direct library creation.
- target folder belongs to the target workspace and is writable under that same policy

Project folder query checks:

- explicit project id
- project/estimate access for all returned rows
- no workspace-wide scan to discover project rows without project context
- an inaccessible or mismatched project id returns no Project projection rows and no row labels

## Required Tests

- two clients create different express rows at the same time
- concurrent same-node inserts allocate distinct `sort_order` values inside the RPC or retry cleanly with the same correlation id after a deferred unique collision
- two clients edit the same express field; stale revision recovery appears
- a peer does not see another user's unpersisted draft row
- a peer does not rely on live row propagation for correctness unless a new row-sync workstream is implemented
- local draft cursor frames are suppressed while `persisted=false`
- viewer cannot add/edit/promote in UI or through direct insert/update/replace server-action calls
- estimate editor without current workspace-library write permission can author but cannot promote
- promotion RPC rejects missing library-write permission even if client UI is bypassed
- promotion RPC rejects a target folder in another workspace and does not leak folder names
- promotion RPC grants are limited to the authenticated/API role pattern and all authorization is inside the SECURITY DEFINER function
- default price option insert populates required fields such as `label`, `currency`, `workspace_id`, and `item_id`
- project projection rejects unauthorized project ids and workspace-only routes without leaking express rows
