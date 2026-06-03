# Current Codebase Audit

This document provides an evidence-backed audit of the existing codebase relevant to tree selection, drag affordances, and bulk delete operations.

## Shared Tree and Visual System

| Surface | File | Symbol / Function | Current Behavior | Missing Behavior | Implementation Implication |
|---|---|---|---|---|---|
| Workshop Tree Row | `src/components/workshop/workshop-tree.tsx` | `WorkshopTreeRow` | Renders as `button` (default) or `div`. Applies `paddingLeft` for indentation. Supports `selected`, `editing`, `intent` styling. Wraps in `WorkshopTreeContextMenu`. | No checkbox slot, no drag handle slot, no `selectionMode` prop. Indentation applies to outer container, making unindented left-side affordances impossible without layout restructuring. | Must add `dragHandleSlot`, `leadingSlot`, and `selectionMode` props. When slots are present, `as` must be forced to `"div"` to avoid invalid nested interactive HTML. Indentation must move to an inner wrapper. |
| Tree Visual Style | `src/components/workshop/tree-visual-style.ts` | `workshopTreeIndentStyle` | Returns `{ paddingLeft: depth * 20 }` up to 140px max. | N/A | Reuse for inner content wrapper indentation. |

## Estimate Tree / Estimate Sheet Workspace

| Surface | File | Symbol / Function | Current Behavior | Missing Behavior | Implementation Implication |
|---|---|---|---|---|---|
| Estimate Tree | `src/components/workshop/EstimateSheetTree.tsx` | `ControlledTreeEnvironment`, `renderItem` | Uses React Complex Tree (RCT). Single-item drag only (`canDrag` checks `items.length === 1`). Right-click context menu for Rename/Delete. Single-node delete via `deleteEstimateNode` RPC with confirmation modal. Optimistic reorder persistence. | No visible drag handle. No checkbox selection. No bulk selection state. No bulk delete flow. | Add `TreeDragHandle` to `renderItem`. Maintain `bulkSelectedNodeIds: Set<string>` outside RCT state. Wire `TreeSelectionCheckbox` with `stopPropagation`. Implement bulk delete confirmation and `deleteEstimateNodesBulk` server action. |
| Estimate Tree Edit | `src/lib/estimates/estimate-tree-edit.ts` | `planEstimateTreeDelete` | Calculates deleted node IDs and fallback selection. | N/A | Reuse for bulk delete preview and fallback computation. |
| Estimate Actions | `src/lib/estimates/actions.ts` | `deleteEstimateNode` | Calls `delete_estimate_node_with_history` RPC. Validates project/estimate scope. | No bulk delete server action. | Create `deleteEstimateNodesBulk` calling a new or existing bulk RPC, or loop single-node RPCs if bulk RPC is not available (prefer RPC). |

## Estimate Sheets Table

| Surface | File | Symbol / Function | Current Behavior | Missing Behavior | Implementation Implication |
|---|---|---|---|---|---|
| Project Estimates Table | `src/components/workshop/ProjectEstimatesTable.tsx` | `ProjectEstimateRowActions`, `useReactTable` | Row-level checkboxes with `selectedEstimateIds: Set<string>` state. TanStack React Table. Trash button is `disabled` with tooltip "Delete action is not wired yet." | No header select-all checkbox. No bulk toolbar. No `deleteEstimateSheet` server action. | Add header checkbox with indeterminate state. Add `TreeBulkActionBar` above table. Implement `deleteEstimateSheetsBulk` server action. |

## Projects Page

| Surface | File | Symbol / Function | Current Behavior | Missing Behavior | Implementation Implication |
|---|---|---|---|---|---|
| Projects Page Client | `src/components/workshop/projects-page-client.tsx` | `ProjectsPageClient`, `LiveProjectCard` | View modes, search filtering, favorite toggling. `deleteProject` is a redirecting form action. | No `selectedProjectIds` state. No card checkbox overlay. No bulk toolbar. `deleteProject` unsuitable for bulk (redirecting, no preview). | Add `selectedProjectIds: Set<string>`. Add checkbox overlay to `LiveProjectCard`. Add bulk toolbar. Create `deleteProjectsBulk` server action with workspace scoping and typed confirmation. |

## Component Library

| Surface | File | Symbol / Function | Current Behavior | Missing Behavior | Implementation Implication |
|---|---|---|---|---|---|
| Library Folder Tree | `src/components/workshop/component-library-manager/LibraryFolderTree.tsx` | `LibraryFolderTree`, `ControlledTreeEnvironment` | Folder-only drag/drop. Optimistic reorder via `reorder_library_folders`. Synthetic root `ALL_COMPONENTS_FOLDER_ID` is not draggable. | No visible drag handles. No checkbox selection for folders. | Add `TreeDragHandle` to folder rows. Add checkbox selection for folders (excluding synthetic root). |
| Library Item Row | `src/components/workshop/component-library/tree/LibraryItemRow.tsx` | `LibraryItemRow` | Passes `draggable={Boolean(onDragStart)}` to `WorkshopTreeRow`. Component rows are `canMove: false` in folder tree. | No checkbox selection for components in tree. | Add checkbox selection for components if needed, but primary bulk actions are on catalogue cards. |
| Component Library Manager | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` | `ComponentLibraryManager` | Folder CRUD, lifecycle state changes (`changeCostLibraryComponentLifecycleState`). | No selection state on component catalogue cards. No bulk toolbar. No bulk archive/hard-delete server actions. | Add checkbox selection to catalogue cards. Add bulk toolbar. Implement `archiveCostLibraryComponentsBulk` and `deleteCostLibraryComponentsBulk` (admin-only, zero-reference check). |

## Database, Schema, RLS, RPCs

| Entity | Dependent Tables | FK Cascade Behavior | RLS / Permission Rule | Storage Cleanup |
|---|---|---|---|---|
| `projects` | `estimates`, `project_favorites`, `project_members`, `collaboration_invitations`, `project_publications`, `beta_feedback_submissions` | `estimates` CASCADEs to `estimate_nodes`, `estimate_row_items`, `estimate_sheet_versions`, `estimate_sheet_events`. Others do NOT cascade. | Workspace admin or project owner only. | Best-effort cleanup of `projectImagePath` and `projectImageThumbnailPath` from `metadata`. |
| `estimates` | `estimate_nodes`, `estimate_row_items`, `estimate_sheet_versions`, `estimate_sheet_events`, `estimate_favorites`, `estimate_sheet_members`, `estimate_sheet_access_settings` | `estimate_nodes` and `estimate_row_items` CASCADE. Others do NOT cascade. | Project scope validation + edit permission via `can_edit_estimate` RPC. | N/A |
| `estimate_nodes` | `estimate_row_items` | `estimate_row_items` CASCADE on node delete. | Project scope validation. History preserved via `delete_estimate_node_with_history` RPC. | N/A |
| `library_folders` | `cost_library_items` (via `library_folder_id`) | NO CASCADE. Items are nullified (`library_folder_id = null`). | Workspace scope validation. Synthetic root cannot be deleted. | N/A |
| `cost_library_items` | `cost_library_item_versions`, `cost_library_item_price_history`, `cost_library_item_state_history`, `price_options`, `variant_cost_entries`, `variant_attachments` | Hard delete requires zero active estimate row references. Archive sets `lifecycle_state = 'archived'`. | Workspace admin for hard delete. Any workspace member for archive. | Best-effort cleanup of variant image paths and attachments. |

## Tests and QA Baseline

| Area | Existing Tests | Missing Coverage |
|---|---|---|
| Estimate Tree | `tests/vitest/workspace-repository-estimate-tree.test.ts` | Bulk selection, drag handle visibility, checkbox event isolation, bulk delete confirmation. |
| Project Estimates | `tests/vitest/project-estimates-table.test.tsx` | Header select-all, bulk toolbar, bulk delete server action. |
| Component Library | `tests/vitest/component-library-manager-ui.test.tsx` | Folder drag handle, folder checkbox, bulk archive/delete. |
| Projects Page | N/A | Card checkbox, bulk toolbar, typed confirmation, bulk delete server action. |