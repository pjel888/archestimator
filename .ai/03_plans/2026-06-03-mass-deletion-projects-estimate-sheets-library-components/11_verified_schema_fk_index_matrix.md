# 11 Verified Schema FK Index Matrix

## Purpose

This is the compact schema evidence sheet for future implementation. It exists so implementation does not reopen broad migration discovery before every destructive operation. A future coding branch must still run a drift check, but the current repository facts below are verified from migrations and generated Supabase types.

## Access Functions

| Function | Verified source | Delete-planning meaning |
|---|---|---|
| `is_workspace_member(target_workspace_id)` | `20260518090000_archestimator_core_schema.sql` | Baseline read/member check; not sufficient for destructive authority. |
| `is_workspace_admin(target_workspace_id)` | `20260518090000_archestimator_core_schema.sql` | Canonical workspace authority for component hard delete, plus platform admin override. |
| `is_workspace_editor(target_workspace_id)` | `20260526142913_project_sheet_collaboration_access.sql` | Candidate authority for component archive; not project hard delete by itself. |
| `can_access_project(target_project_id)` | `20260526142913_project_sheet_collaboration_access.sql` | Preview/read scope only; includes sheet-derived project context. |
| `can_edit_project(target_project_id)` | `20260526142913_project_sheet_collaboration_access.sql` | Too broad for project hard delete; includes workspace members and project editors. |
| `can_manage_project_access(target_project_id)` | `20260526142913_project_sheet_collaboration_access.sql` | Recommended minimum for project delete execution, plus platform admin. |
| `can_access_estimate(target_estimate_id)` | `20260526142913_project_sheet_collaboration_access.sql`; restricted by `20260601151500_restrict_sheet_collaborator_estimate_inheritance.sql` | Preview/read scope for estimate sheets. |
| `can_edit_estimate(target_estimate_id)` | `20260526142913_project_sheet_collaboration_access.sql` | Minimum execution authority for estimate sheet delete. |
| `can_manage_estimate_access(target_estimate_id)` | `20260526142913_project_sheet_collaboration_access.sql` | Higher sheet access administration boundary; use if product chooses stricter sheet deletion. |
| `can_manage_project_publication(target_project_id)` | `20260527120000_project_client_publication.sql` | Publication manager boundary; useful for revoke/update flows, not destructive source deletion alone. |

## Project Target Graph

| Object | FK/index truth | RLS/grant truth | Deletion policy |
|---|---|---|---|
| `projects` | `workspace_id` indexed; workspace FK cascades. | Project RLS uses collaboration/access helpers. | Delete only through stricter preview/execute RPC. |
| `project_favorites` | Project/workspace FK cascades; project index exists. | User-scoped RLS. | Cascade with project. |
| `project_members` | Project/workspace FK cascades; user/project indexes exist. | Manager-gated writes. | Cascade with project. |
| `estimates` | `project_id` FK cascades; `estimates_project_id_idx`. | Estimate RLS via access helpers. | Cascade with project or target directly for sheet delete. |
| `estimate_nodes` | `estimate_id` FK cascades; parent/sort index. | Estimate access RLS. | Cascade. |
| `estimate_row_items` | `estimate_id` and `node_id` cascades; estimate/node/sort indexes. | Estimate access RLS. | Cascade. |
| `estimate_sheet_events` | `estimate_id` FK cascades; created/cursor indexes. | RLS enabled. | Cascade on hard sheet/project delete. |
| `estimate_sheet_versions` | `estimate_id` FK cascades; workspace/estimate indexes. | RLS enabled. | Cascade on hard sheet/project delete. |
| `project_publications` | Project/workspace FK cascades; `project_publications_project_status_idx`. | Manager policies and manager RPC. | Block active rows before source delete. |
| `project_publication_events` | `publication_id` FK cascades; `project_publication_events_publication_created_idx`. | Insert service-owned; RLS enabled. | Preserve by blocking active publication; cascade only after explicit publication lifecycle resolution. |
| `beta_feedback_submissions` | Optional `project_id` sets null. | App/admin feedback policies. | Retain with null project reference. |

## Estimate Target Graph

| Object | FK/index truth | Delete policy |
|---|---|---|
| `estimates` | Target row under one `project_id`; project index exists. | Delete through project-scoped execution RPC. |
| `estimate_nodes` | Cascades on estimate. | Cascade. |
| `estimate_row_items` | Cascades on estimate/node. | Cascade. |
| `estimate_sheet_events` | Cascades on estimate. | Cascade with sheet; this intentionally removes that sheet's Activity history. |
| `estimate_sheet_versions` | Cascades on estimate. | Cascade with sheet; named-version UI is dormant. |
| `estimate_favorites` | Estimate/project FK cascades; estimate index exists. | Cascade. |
| `estimate_sheet_access_settings` | One row per estimate; cascades. | Cascade. |
| `estimate_sheet_members` | Estimate/project FK cascades; user/project indexes. | Cascade. |
| `collaboration_invitations` | Estimate-scoped FK cascades. | Cascade operational invite rows. |
| `collaboration_invitation_tokens` | Invitation FK cascades. | Cascade with invite. |
| `collaboration_audit_events` | Target ids set null. | Retain immutable audit. |
| `project_publications.selected_estimate_ids` | UUID array metadata, no FK. | Block active publication impact by default. |
| `project_publications.snapshot_json` | JSONB render snapshot, no live FK to estimates. | Treat as historical publication content; do not mutate to hide deleted sheets. |
| `shared_link_comments.estimate_id` | UUID field used for context; no FK to estimates. | Preserve through publication policy. |

## Component Target Graph

| Object | FK/index truth | Archive policy | Hard-delete policy |
|---|---|---|---|
| `cost_library_items` | Workspace FK; `(workspace_id, lifecycle_state)` index. | Set `lifecycle_state = 'archived'`. | Delete only after zero reference proof. |
| `cost_library_item_price_options` | Item FK cascades. | Retain. | Cascade. |
| `cost_library_item_variant_cost_entries` | Item/option/workspace FKs cascade. | Retain. | Cascade. |
| `cost_library_item_variant_attachments` | Item/option/workspace FKs cascade; option index exists; unique `(storage_bucket, storage_path)`. | Retain. | Cascade plus storage cleanup. |
| `cost_library_item_versions` | Item FK cascades. | Retain. | Cascade. |
| `cost_library_item_price_history` | Item/option/workspace FKs cascade. | Retain. | Cascade. |
| `cost_library_item_state_history` | Item FK cascades. | Append archive event. | Cascade. |
| `estimate_row_items.source_library_item_id` | FK sets null; source snapshot retained; no dedicated source index was found in migrations during this audit. | Keep visible historical row snapshot. | Block if any live row references exist; add/verify index before hard-delete preview. |
| `estimate_template_row_items.source_library_item_id` | FK sets null; index exists in `20260522091621_component_library_templates.sql`. | Keep template snapshot. | Block if any template row references exist. |

## Shared-Link Children

| Object | Verified behavior | Deletion policy |
|---|---|---|
| `shared_link_recipients` | `publication_id` cascades; recipient token hash locked down by later migration. | Block active source delete; cascade only with explicit publication lifecycle resolution. |
| `shared_link_comments` | `publication_id` cascades; `recipient_id` sets null; publication/recipient/estimate indexes exist. | Preserve while publication is active/retained. |
| `shared_link_responses` | `publication_id` cascades; `recipient_id` cascades; unique recipient/publication index. | Preserve while publication is active/retained. |
| `shared_link_events` | `publication_id` cascades; `recipient_id` sets null; event types include `open`, `comment_add`, `accept_decision`, `decline_decision`, `password_attempt`. | Preserve while publication is active/retained. |
| `project_publication_event_type` | Enum includes `open`, `password_success`, `password_failure`, `download_attempt_blocked`, and later `password_attempt`. | Do not omit `password_attempt` from audit impact counts. |

## Index Drift Checks Before Coding

The future implementation branch must confirm these still exist before writing execution RPCs:

- project and estimate parent indexes listed above;
- `project_publications_project_status_idx`;
- shared-link publication/recipient/comment/response/event indexes;
- `estimate_template_row_items_source_library_item_id_idx`;
- a practical index path for `estimate_row_items.source_library_item_id`;
- a practical index path for component attachment lookup by item when hard delete is enabled.

If any index is missing for a preview query at batch limits, add an index in the migration PR before exposing execution.
