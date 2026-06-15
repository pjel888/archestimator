---
title: Express Components Concurrency And Permissions Spec
type: docs
date: 2026-06-15
---

# Concurrency And Permissions Spec

## Realtime Model

Optimistic express drafts are local-only until insert success. A draft may have a client row id and DOM `data-estimate-row-id`, and that client id may later be reconciled with the persisted row. It is still not a persisted collaboration anchor until the insert returns successfully.

Required rule: draft rows carry `persisted=false` or equivalent local state, and cursor/presence broadcast suppresses row/cell anchors for those rows. A peer must not render another user's unpersisted draft row or cursor. After insert success:

- the creating client reconciles the optimistic row with the persisted snapshot
- the shared query/cache receives the persisted row id and `rowRevision`
- peers see the row through normal realtime/cache refresh paths
- cursor anchoring uses the persisted `data-estimate-row-id`

No peer cursor may anchor to a transient client-only draft id. If a user is typing in a draft, their peer may see presence at the estimate/node level but not a row/cell cursor until persistence.

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
| Workspace editor/admin with estimate edit | Yes | Yes | Yes | Yes | Yes |
| Platform admin | Yes, subject to existing admin policy | Yes | Yes | Yes | Yes |

UI controls must be hidden or disabled consistently with this matrix, but server actions/RPCs are authoritative.

Promotion RPC checks:

- `can_edit_estimate(target_estimate_id)`
- the exact workspace-library write predicate used by current folder/item mutations. If a helper named `is_workspace_editor` includes plain workspace members, do not use it as the promotion gate; use a strict editor/admin predicate or an inline role check matching the write policies.
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
- local draft cursor frames are suppressed while `persisted=false`
- viewer cannot add/edit/promote in UI or through server action
- estimate editor without workspace-editor permission can author but cannot promote
- promotion RPC rejects missing strict library-write permission even if client UI is bypassed
- promotion RPC rejects a target folder in another workspace and does not leak folder names
- promotion RPC grants are limited to the authenticated/API role pattern and all authorization is inside the SECURITY DEFINER function
- default price option insert populates required fields such as `label`, `currency`, `workspace_id`, and `item_id`
- project projection rejects unauthorized project ids and workspace-only routes without leaking express rows
