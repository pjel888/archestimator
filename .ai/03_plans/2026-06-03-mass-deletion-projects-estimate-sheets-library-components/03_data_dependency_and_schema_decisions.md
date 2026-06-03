# 03 Data Dependency And Schema Decisions

## Purpose

This document is the implementation dependency matrix. It records current FK behavior, RLS status, indexes, and the recommended deletion/retention policy for mass deletion.

## Policy Legend

- **delete:** remove as part of target deletion, by cascade or explicit set-based SQL.
- **archive:** update lifecycle state, retain row.
- **retain immutable audit:** keep historical row; null target refs if current FK already does that.
- **null-reference:** set FK to null through schema behavior or explicit update.
- **revoke:** mark token/link/invitation inactive rather than delete when target remains.
- **block:** prevent deletion until user resolves dependency.
- **decision required:** owner must choose before implementation.

## Project Deletion Dependency Graph

| Table / object | Relationship | Current FK behavior / index / RLS | Policy |
|---|---|---|---|
| `projects` | Target | `workspace_id -> workspaces ON DELETE CASCADE`; `projects_workspace_id_idx`; current RLS delete uses `can_edit_project(id)`, which is broader than the future delete-execution authority. | delete only through stricter manage/admin RPC |
| `project_favorites` | `(project_id, workspace_id) -> projects(id, workspace_id)` | `ON DELETE CASCADE`; `project_favorites_project_id_idx`; RLS enabled. | delete by cascade |
| `project_members` | `(project_id, workspace_id) -> projects` | `ON DELETE CASCADE`; indexes on workspace/user and user; RLS enabled. | delete by cascade |
| `estimates` | `project_id -> projects(id)` | `ON DELETE CASCADE`; `estimates_project_id_idx`; RLS via `can_access_estimate` / `can_edit_estimate`. | delete by cascade |
| `estimate_nodes` | `estimate_id -> estimates(id)` | `ON DELETE CASCADE`; `estimate_nodes_estimate_parent_sort_idx`; RLS via estimate access. | delete by cascade |
| `estimate_row_items` | `estimate_id -> estimates(id)`, `node_id -> estimate_nodes(id)` | `ON DELETE CASCADE`; `estimate_row_items_estimate_node_sort_idx`; RLS via estimate access. | delete by cascade |
| `estimate_sheet_events` | `estimate_id -> estimates(id)` | `ON DELETE CASCADE`; event indexes; RLS enabled. | delete by cascade for project/estimate hard delete |
| `estimate_sheet_versions` | `estimate_id -> estimates(id)` | `ON DELETE CASCADE`; workspace/estimate index; RLS enabled. | delete by cascade |
| `estimate_favorites` | estimate/project composite FKs | `ON DELETE CASCADE`; `estimate_favorites_estimate_id_idx`; RLS enabled. | delete by cascade |
| `estimate_sheet_access_settings` | `(estimate_id, project_id) -> estimates` | `ON DELETE CASCADE`; PK on `estimate_id`; RLS enabled. | delete by cascade |
| `estimate_sheet_members` | `(estimate_id, project_id) -> estimates` | `ON DELETE CASCADE`; user/project indexes; RLS enabled. | delete by cascade |
| `collaboration_invitations` | project/workspace and estimate/project composite FKs | Both `ON DELETE CASCADE`; project/email and estimate/email indexes; RLS enabled. | delete by cascade |
| `collaboration_invitation_tokens` | `invitation_id -> collaboration_invitations(id)` | `ON DELETE CASCADE`; invitation/expires/active indexes; RLS enabled. | delete by cascade |
| `collaboration_audit_events` | `project_id`, `estimate_id`, `invitation_id` refs | `ON DELETE SET NULL`; indexes on invitation/project; RLS enabled. | retain immutable audit |
| `project_publications` | `(project_id, workspace_id) -> projects` | `ON DELETE CASCADE`; `project_publications_project_status_idx`; RLS enabled. | **block** when active; cascade only after explicit revoke/allow |
| `project_publication_events` | `publication_id -> project_publications` | `ON DELETE CASCADE`; publication/created index; RLS enabled. | block via publication; delete by cascade only if publication deletion allowed |
| `shared_link_recipients` | `publication_id -> project_publications` | `ON DELETE CASCADE`; recipient indexes; RLS enabled. | block via publication |
| `shared_link_comments` | `publication_id -> project_publications`, `recipient_id -> recipients` | publication cascade; recipient set null; indexes include publication/estimate. | block via publication |
| `shared_link_responses` | `publication_id`, `recipient_id` | cascade; unique recipient/publication index. | block via publication |
| `shared_link_events` | `publication_id`, `recipient_id` | publication cascade; recipient set null. | block via publication |
| `beta_feedback_submissions` | optional `project_id -> projects(id)` | `ON DELETE SET NULL`; RLS insert-only. | retain; null-reference |
| `ai_tool_calls` / `ai_data_access_events` | optional target project/estimate/node/row ids | target refs set null where defined; run lineage cascades by run/workspace/user. | retain immutable audit / null-reference |
| Project images | metadata paths in project row | storage object, not FK. | best-effort storage delete after DB commit |

### Project Delete Beta Decision

Block deletion if any selected project has an active publication:

```text
status = 'published'
and revoked_at is null
and (expires_at is null or expires_at > now())
```

Reason: public receiver comments, responses, and events are historical recipient data. Deleting them implicitly because a project was deleted is too surprising for closed beta.

## Estimate Sheet Deletion Dependency Graph

| Table / object | Relationship | Current behavior | Policy |
|---|---|---|---|
| `estimates` | Target sheet row | Parent `project_id`; RLS via `can_edit_estimate`. | delete |
| `estimate_nodes` | sheet tree | cascades on estimate delete. | delete by cascade |
| `estimate_row_items` | sheet rows | cascades on estimate/node delete. | delete by cascade |
| `estimate_sheet_events` | Activity history | cascades on estimate delete. | delete by cascade |
| `estimate_sheet_versions` | dormant version snapshots | cascades on estimate delete. | delete by cascade |
| `estimate_favorites` | user favorites | cascades on estimate/project composite FK. | delete by cascade |
| `estimate_sheet_access_settings` | sheet access settings | cascades on estimate delete. | delete by cascade |
| `estimate_sheet_members` | sheet collaborators | cascades on estimate delete. | delete by cascade |
| `collaboration_invitations` | sheet invitations | estimate/project FK cascades. | delete by cascade |
| `collaboration_invitation_tokens` | invite tokens | invitation FK cascades. | delete by cascade |
| `collaboration_audit_events` | historical audit | estimate id set null. | retain immutable audit |
| `project_publications.selected_estimate_ids` | metadata array, no FK | array of UUIDs only. | **block active publication by default** |
| `project_publications.snapshot_json` | immutable/whitelisted rendered content | no live FK to estimate rows. | retain until publication revoked/deleted |
| `shared_link_comments.estimate_id` | raw UUID, no FK | can reference deleted source estimate id. | retain with snapshot context |

### Estimate Delete Beta Decision

Recommended default: **block deletion** if a selected estimate id appears in an active publication's `selected_estimate_ids`.

Alternative: remove ids from `selected_estimate_ids` and republish. Rejected for beta because it changes public recipient context without a publication-specific update action.

## Library Component Archive/Delete Dependency Graph

| Table / object | Relationship | Current behavior | Archive policy | Hard-delete policy |
|---|---|---|---|---|
| `cost_library_items` | Target | workspace FK cascade; RLS read/member and manage/editor. | update `lifecycle_state = 'archived'` | delete only if zero refs |
| `cost_library_item_price_options` | `item_id -> cost_library_items` | `ON DELETE CASCADE`; default active unique index. | retain | delete by cascade |
| `cost_library_item_variant_cost_entries` | item/option/workspace FKs | `ON DELETE CASCADE`; current cost pointer set null from price option. | retain | delete by cascade |
| `cost_library_item_variant_attachments` | item/option/workspace FKs | `ON DELETE CASCADE`; unique storage path key. | retain | delete by cascade + storage cleanup |
| `cost_library_item_versions` | `item_id -> cost_library_items` | `ON DELETE CASCADE`. | retain | delete by cascade |
| `cost_library_item_price_history` | item/option/workspace FKs | `ON DELETE CASCADE`. | retain | delete by cascade |
| `cost_library_item_state_history` | `item_id -> cost_library_items` | `ON DELETE CASCADE`. | append archive state row | delete by cascade |
| `estimate_row_items.source_library_item_id` | optional source FK | `ON DELETE SET NULL`; row keeps `source_snapshot`. | keep reference and snapshot | block if any references exist |
| `estimate_template_row_items.source_library_item_id` | optional source FK | `ON DELETE SET NULL`; template row keeps snapshot fields. | keep reference and snapshot | block if any references exist |
| `library_folders` | referenced by `cost_library_items.library_folder_id` | folder delete nullifies items; item delete does not delete folder. | retain folder ref | delete item; folder remains |
| `component_suppliers` / `component_brands` | optional item/variant refs | set-null relationships and independent workspace rows. | retain | retain unless separate cleanup plan |
| Component images | `component-images` paths on variants | storage object. | retain for possible unarchive/history | delete best-effort after DB commit |
| Component attachments | `component-attachments` paths on attachment rows | private storage object. | retain | delete best-effort after DB commit |

### Archive Behavior

Archive is reversible through lifecycle state. It must:

- validate all item ids belong to actor workspace;
- update only rows actor can manage through workspace editor/admin rules;
- write state-history rows;
- leave price/version/attachment/storage rows intact;
- hide archived components from default library and estimate insertion/search;
- preserve existing estimate/template rows and snapshots.

## Publications And Shared Links

| Area | Decision |
|---|---|
| Published project link | Block project delete until revoked/expired. |
| Published estimate selection | Block estimate delete until publication updated/revoked. |
| Historical comments/responses/events | Preserve while publication remains; do not delete behind the user's back. |
| Snapshot JSON | Treat as immutable public record for that publication version. |
| `selected_estimate_ids` | Metadata; not sufficient to update public content by itself. |

## Collaboration And Invitations

Collaboration operational rows can cascade with the target. Audit rows should remain.

- Membership/settings/invitations/tokens: delete by cascade.
- `collaboration_audit_events`: retain with nullable project/estimate/invitation ids.
- If implementation chooses publication blocking, no separate invitation revocation is needed before target delete because cascade handles operational rows.

## AI / Audit / Feedback Records

| Record | Policy |
|---|---|
| `ai_action_runs` | Retain while workspace/user exists; do not target for project delete. |
| `ai_tool_calls` | Retain; target ids should set null if target deleted. |
| `ai_data_access_events` | Retain; target ids should set null if target deleted. |
| `beta_feedback_submissions` | Retain; project id set null. |
| `account_security_events` | Leave unchanged. |

## Supabase Storage Objects

| Object | Bucket | Cleanup trigger | Rule |
|---|---|---|---|
| Project image + thumbnail | `component-images` | project hard delete or image replacement/removal | only `.webp` paths containing `/project-images/`, no traversal, chunked remove. |
| Component image + thumbnail | `component-images` | component hard delete only | only DB-derived paths under workspace/user prefix; never on archive. |
| Component variant attachment | `component-attachments` | component hard delete only | only DB-derived paths with private bucket and workspace/user prefix. |

## Index Verification Checklist

Already verified:

- `projects(workspace_id)`.
- `estimates(project_id)`.
- `estimate_nodes(estimate_id, parent_id, sort_order)`.
- `estimate_row_items(estimate_id, node_id, sort_order)`.
- `estimate_sheet_events(estimate_id, created_at...)`.
- `estimate_sheet_versions(workspace_id, estimate_id...)`.
- `project_publications(project_id, status, published_at desc)`.
- `project_favorites(project_id)`.
- `estimate_favorites(estimate_id)`.
- collaboration invitation/member indexes listed above.
- shared-link publication/recipient/comment/response/event indexes listed above.

Must verify or add during migration PR:

- `estimate_row_items(source_library_item_id)` for hard-delete preview speed.
- `estimate_template_row_items(source_library_item_id)` for hard-delete preview speed.
- `cost_library_item_variant_attachments(item_id)` if not covered by composite item/workspace indexes in the active DB.

## Open Decisions

| Decision | Recommended default | Risk if wrong | Implementation impact | Owner |
|---|---|---|---|---|
| Active publication behavior for estimate delete | Block active publication impact. | Silent public context drift or broken client decisions. | Execution RPC returns `blockedPublicationIds`; UI explains revoke/update. | Founder/product |
| Dedicated mass-deletion audit table | Create `mass_deletion_events`. | Existing audit tables become overloaded or deletion lacks unified evidence. | One migration plus typed event insert from execution RPC/server action. | Database architect |
| Component hard delete availability | Defer until after archive is shipped. | Data loss or orphaned media if hard delete ships too early. | Phase 6 optional PR only. | Founder/security |
