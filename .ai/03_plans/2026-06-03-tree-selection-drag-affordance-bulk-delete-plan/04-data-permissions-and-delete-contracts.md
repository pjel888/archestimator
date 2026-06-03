# Data, Permissions, and Delete Contracts

This document defines the exact database, RLS, RPC, and storage cleanup contracts for all affected entities.

## 1. Projects

- **Exact Dependent Tables:** `estimates` (CASCADE), `project_favorites` (NO CASCADE), `project_members` (NO CASCADE), `collaboration_invitations` (NO CASCADE), `project_publications` (NO CASCADE), `beta_feedback_submissions` (NO CASCADE).
- **Cascade vs Non-Cascade Behavior:** Deleting a project CASCADEs to `estimates`, which in turn CASCADEs to `estimate_nodes`, `estimate_row_items`, `estimate_sheet_versions`, and `estimate_sheet_events`. Non-cascading tables (`project_favorites`, `project_members`, etc.) MUST be explicitly deleted or nullified BEFORE the project row is deleted, or handled via a dedicated RPC.
- **Permission Rule:** Workspace admin or project owner only. Validated via RLS and server action workspace scoping.
- **Recommended Server Action Signature:** `deleteProjectsBulk(projectIds: string[]): Promise<{ deleted: string[]; failed: Array<{ id: string; reason: string }>; storagePaths: string[] }>`
- **Recommended RPC/Transaction Strategy:** A single transaction or dedicated RPC `delete_projects_bulk` that:
  1. Validates all `projectIds` belong to the current workspace.
  2. Validates actor has `is_workspace_admin()` or project ownership.
  3. Deletes from `project_members`, `project_favorites`, `collaboration_invitations`, `project_publications`.
  4. Null-references in `beta_feedback_submissions`, `ai_data_access`, `collaboration_audit_events`.
  5. Deletes from `projects` (triggers CASCADE to estimates and descendants).
- **Storage Cleanup Strategy:** Best-effort cleanup AFTER DB transaction. Extract `projectImagePath` and `projectImageThumbnailPath` from `metadata` before deletion. Validate paths end with `.webp`, contain `/project-images/`, and lack `..` or `//` before calling `supabase.storage.from('component-images').remove(paths)`.
- **Route Revalidation Strategy:** `revalidatePath("/workshop/projects")`. Redirect to `/workshop/projects` if the active route was deleted.
- **Audit/History Limitations:** Project deletion is final. No project-level history table exists; deletion is logged only via standard Supabase audit logs.

## 2. Estimate Sheets

- **Exact Dependent Tables:** `estimate_nodes` (CASCADE), `estimate_row_items` (CASCADE), `estimate_sheet_versions` (CASCADE), `estimate_sheet_events` (CASCADE), `estimate_favorites` (NO CASCADE), `estimate_sheet_members` (NO CASCADE), `estimate_sheet_access_settings` (NO CASCADE), `collaboration_invitations` (NO CASCADE, if estimate-scoped).
- **Cascade vs Non-Cascade Behavior:** Deleting an estimate CASCADEs to nodes, rows, versions, and events. Non-cascading tables (`estimate_favorites`, `estimate_sheet_members`, etc.) MUST be explicitly deleted first.
- **Permission Rule:** Must validate project scope and edit permission via `can_edit_estimate` RPC.
- **Server Action Signature:** `deleteEstimateSheetsBulk({ projectId, estimateIds }: { projectId: string; estimateIds: string[] }): Promise<{ deleted: string[]; failed: Array<{ id: string; reason: string }> }>`
- **RPC or Transaction Strategy:** Dedicated RPC `delete_estimate_sheets_bulk` that:
  1. Validates `estimateIds` belong to `projectId`.
  2. Validates `can_edit_estimate` for each.
  3. Deletes from `estimate_favorites`, `estimate_sheet_members`, `estimate_sheet_access_settings`.
  4. Null-references `collaboration_audit_events`.
  5. Deletes from `estimates` (triggers CASCADE).
- **Fallback Route Behavior:** If the active route estimate is deleted, redirect to `/workshop/projects/[projectId]/estimates`.
- **Estimate Tree/Row Count Preview Strategy:** Query `estimate_nodes` and `estimate_row_items` counts for each `estimateId` before deletion to display in the confirmation modal.

## 3. Estimate Nodes

- **Current Single-Node Delete Behavior:** Calls `delete_estimate_node_with_history` RPC. Validates project/estimate scope.
- **History/RPC Preservation Requirement:** Bulk delete MUST also use a history-preserving RPC (e.g., `delete_estimate_nodes_bulk_with_history`) or loop the existing single-node RPC if a bulk RPC is not feasible, ensuring `estimate_sheet_events` are logged for each deletion.
- **Bulk Delete Strategy:** Accepts `nodeIds: string[]`. Computes full descendant set via `planEstimateTreeDelete` to show accurate preview. Deduplicates IDs.
- **Descendant Preview Strategy:** Modal shows: "Delete X group(s), Y area(s), and Z row(s)?"
- **Active Selected Node Fallback Strategy:** Uses existing `getDeleteFallbackNodeId` logic from `estimate-tree-edit.ts` to compute `fallbackNodeId`. If active route node is deleted, redirect to `fallbackNodeId`.

## 4. Library Folders

- **Current Folder Delete Behavior:** `deleteLibraryFolder` in `src/lib/component-library/actions.ts` lifts children to parent, nullifies `library_folder_id` on `cost_library_items`, then deletes the folder.
- **Synthetic Root Restrictions:** `ALL_COMPONENTS_FOLDER_ID` is NEVER selectable, draggable, or deletable. Enforced in UI and server action.
- **Folder Item Reassignment/Unassignment Behavior:** When a folder is deleted, child folders are lifted to the deleted folder's parent (preserving sort order). Components in the deleted folder have `library_folder_id` set to `null`.
- **Bulk Folder Delete Strategy:** Loop `deleteLibraryFolder` or create a bulk RPC. Must process deletions in an order that respects the lift logic (children before parents, or handle lift in bulk).

## 5. Library Components

- **Archive vs Hard Delete Decision:** Bulk action defaults to **Archive**. Hard delete is strictly admin-only and gated behind a zero-reference check.
- **References from Estimate Rows:** Archived components remain visible in estimate rows as read-only "archived item" (link state remains, but edits are blocked).
- **Lifecycle-State Behavior:** Archive sets `lifecycle_state = 'archived'` via `set_cost_library_component_lifecycle_state` RPC.
- **Hard Delete Zero-Reference Gate:** Before hard delete, RPC must verify `COUNT(estimate_row_items) == 0` for the component's `source_library_item_id`. If > 0, reject with "Component is referenced in active estimates."
- **Variants/Cost Entries/Attachments/Image Cleanup:** Hard delete CASCADEs to `cost_library_item_versions`, `price_options`, `variant_cost_entries`, `variant_attachments`.
- **Storage Cleanup Strategy:** Best-effort cleanup of `imagePath`, `thumbnailPath`, and attachment `path`s after successful DB deletion. Path validation same as projects.