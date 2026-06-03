# Data, Permissions, and Delete Contracts

Related but separate workstream. This plan does not supersede, replace, or modify `.ai/03_plans/2026-06-03-mass-deletion-projects-estimate-sheets-library-components.md`.

This document distinguishes audited current behavior from future implementation contracts. Migration files are the local authority for FK behavior. `src/lib/supabase/types.ts` confirms generated table/RPC shapes but does not replace migration evidence for cascade rules.

## Audited Schema Sources

| Source | Relevant Areas |
|---|---|
| `supabase/migrations/20260518090000_archestimator_core_schema.sql` | `projects`, `estimates`, `estimate_nodes`, `estimate_row_items`, core policies. |
| `supabase/migrations/20260524033151_estimate_sheet_version_control.sql` and later estimate history migrations | Estimate sheet versions/events and history RPCs. |
| `supabase/migrations/20260526013617_workshop_favorites.sql` | `project_favorites`, `estimate_favorites`. |
| `supabase/migrations/20260526142913_project_sheet_collaboration_access.sql` | `project_members`, `estimate_sheet_members`, `estimate_sheet_access_settings`, collaboration invitations. |
| `supabase/migrations/20260527120000_project_client_publication.sql` | Project publications and publication policies. |
| `supabase/migrations/20260528220000_project_shared_link_overhaul.sql` | Shared-link recipients, comments, responses, events. |
| `supabase/migrations/20260523030333_library_folder_organization.sql` | `library_folders`, folder reorder/delete semantics. |
| `supabase/migrations/20260523120957_component_library_item_versioning.sql` | Cost library item versions, price options, price/state history. |
| `supabase/migrations/20260524131204_component_variant_assets_cost_entries.sql` | Variant cost entries, attachments, image metadata. |
| `supabase/migrations/20260602083000_beta_feedback_submissions.sql` | Beta feedback project references. |
| `src/lib/supabase/types.ts` | Generated table/RPC names and payload shapes. |

## Projects

### Current Behavior

`src/lib/projects/actions.ts::deleteProject` is a single redirecting form action. It validates safe project image paths, deletes one project row, attempts storage cleanup in `component-images`, revalidates, and redirects. It is not a bulk action contract.

### Dependent Tables and FK Behavior

| Dependency | Observed Behavior | Implementation Note |
|---|---|---|
| `estimates` | Project FK cascades from core schema. | Deleting a project removes estimate sheets and their cascaded descendants. |
| `project_favorites` | Project FK cascades. | No manual cleanup expected beyond transaction confirmation. |
| `project_members` | Project FK cascades. | Shared/project membership is removed by DB. |
| `collaboration_invitations` | Project-related collaboration rows are covered by collaboration migrations. | Verify project-specific invitation cleanup in the final migration lines before implementation. |
| `project_publications` | Project FK cascades. | Shared-link dependents cascade from publication where configured. |
| `shared_link_recipients` | Publication FK cascades. | Recipient cleanup follows publication cascade. |
| `shared_link_comments` | Publication cascades; recipient reference may set null depending on migration. | Keep comments only if migration intentionally keeps audit rows; do not guess. |
| `shared_link_responses` | Publication/recipient dependencies cascade in shared-link overhaul. | Covered by publication deletion. |
| `shared_link_events` | Publication cascades; recipient may set null. | Audit/history rows may be retained only where migration says so. |
| `beta_feedback_submissions` | Project reference sets null. | Do not delete beta feedback on project delete. |
| AI/audit references | Some references set null in later migrations. | Keep audit history; do not manually delete unless contract requires. |

### Recommended Contract

Future action: `deleteProjectsBulk(input: DeleteProjectsBulkInput): Promise<DeleteProjectsBulkResult>` in `src/lib/projects/actions.ts`.

Use a server-side transaction/RPC strategy. The result must be non-redirecting and must return deleted IDs, removed storage paths, fallback href, and typed error codes.

### Required Validation

- `projectIds` is non-empty, unique, and bounded.
- Every project belongs to the active workspace.
- The current user can edit/manage every project.
- Reject shared, sheet-only, pending, or otherwise non-owned/non-editable projects.
- Require `confirmationText === "DELETE PROJECTS"`.
- Reject cross-workspace IDs even if RLS would also reject them.

### Data Cleanup

- Rely on audited FK cascades where migrations say cascade.
- Preserve set-null audit/feedback records where migrations say set null.
- Do not manually delete shared-link or feedback rows unless the migration contract requires manual cleanup.
- Delete should be all-or-nothing unless a future partial-success contract is explicitly designed.

### Storage Cleanup

- Reuse or extract existing safe path checks from `deleteProject`.
- Only delete paths owned by deleted projects.
- Require bucket allowlist and path traversal rejection.
- If DB delete succeeds but storage cleanup fails, return `STORAGE_CLEANUP_FAILED` with repair details.

### Revalidation

- `/workshop/projects`
- Deleted project detail/estimate routes if cached.
- Any project list query keys used by the projects page.

### Failure Behavior

- Validation/permission failure: no mutation, keep selection.
- Transaction failure: no mutation, keep selection and show alert.
- Storage failure after DB mutation: report partial cleanup and require repair path.

### Tests

- Bulk rejects cross-workspace project IDs.
- Bulk rejects shared/sheet-only/pending project cards.
- Typed confirmation required.
- Cascaded entities disappear or set null according to migrations.
- Safe storage cleanup removes only validated paths.
- Deleting active project routes to `/workshop/projects`.

## Estimate Sheets

### Current Behavior

Estimate sheet create/duplicate/update flows exist. `ProjectEstimatesTable` has row checkbox state and a disabled row delete button. No audited `deleteEstimateSheet`/bulk sheet delete action is currently wired in `src/lib/estimates/actions.ts`.

### Dependent Tables and FK Behavior

| Dependency | Observed Behavior | Implementation Note |
|---|---|---|
| `estimate_nodes` | Estimate FK cascades. | Sheet delete removes tree nodes. |
| `estimate_row_items` | Estimate/node FKs cascade; source library reference sets null. | Sheet delete removes rows; source library items remain. |
| `estimate_sheet_versions` | Estimate FK cascades. | Version rows are removed with sheet. |
| `estimate_sheet_events` | Estimate FK cascades; node/row references may set null. | Confirm final migration version before RPC design. |
| `estimate_favorites` | Estimate FK cascades. | No manual cleanup expected. |
| `estimate_sheet_members` | Estimate FK cascades. | Collaboration rows removed. |
| `estimate_sheet_access_settings` | Estimate FK cascades. | Access settings removed. |
| Publications/shared links | Project publication is project-scoped in audited migrations; direct estimate publication dependency not found. | Future agent must re-run `rg` before implementation. |

### Recommended Contract

Future action: `deleteEstimateSheetsBulk(input: DeleteEstimateSheetsBulkInput): Promise<DeleteEstimateSheetsBulkResult>` in `src/lib/estimates/actions.ts`.

### Required Validation

- Non-empty unique estimate IDs.
- Every estimate belongs to the provided project.
- User can edit the project and each estimate through `can_edit_project`/`can_edit_estimate` equivalent checks.
- Reject cross-project/cross-workspace IDs.
- Require typed confirmation such as `DELETE ESTIMATES`.

### Data Cleanup

- Rely on FK cascades for tree, rows, version, favorite, and member/access rows.
- If product wants audit retention beyond cascaded version tables, create an explicit archive/audit strategy before deletion.

### Storage Cleanup

- No sheet-specific storage path was proven in this audit.
- Future implementation must search for sheet-owned storage metadata before shipping.

### Revalidation

- `/workshop/projects/{projectId}/estimates`
- Active estimate sheet route if deleted.
- Project/workshop sidebar data if it caches estimates.

### Failure Behavior

- All-or-nothing by default.
- On active-route deletion, use returned fallback href.
- On failure, preserve selected IDs that still exist.

### Tests

- Header select-visible deletes only visible selected sheets.
- Cross-project/cross-workspace IDs reject.
- Unauthorized user rejects.
- Active sheet deletion routes to fallback.
- Favorites/member/access rows are removed by cascade.

## Estimate Nodes

### Current Behavior

`src/lib/estimates/actions.ts::deleteEstimateNode` validates editable estimate, uses `planEstimateTreeDelete`, calls `delete_estimate_node_with_history`, revalidates paths, and returns refreshed tree, `deletedNodeIds`, and `fallbackNodeId`.

`src/lib/estimates/estimate-tree-edit.ts` contains single-node planning helpers including descendant and fallback logic.

### Dependent Tables and FK Behavior

| Dependency | Observed Behavior | Implementation Note |
|---|---|---|
| Child `estimate_nodes` | Parent self-FK cascades. | Parent delete removes descendants. |
| `estimate_row_items` | Node FK cascades. | Preview must count affected rows. |
| `estimate_sheet_events` | Node/row references can set null while estimate events remain. | Bulk RPC must preserve coherent history. |
| `estimate_sheet_versions` | Sheet-level version records cascade when sheet is deleted, not node-level. | Node delete history is handled by RPC. |

### Recommended Contract

Future action: `deleteEstimateNodesBulk(input: DeleteEstimateNodesBulkInput): Promise<DeleteEstimateNodesBulkResult>`.

Prefer new RPC: `delete_estimate_nodes_bulk_with_history`.

### Required Validation

- User can edit estimate.
- All node IDs belong to estimate.
- Filter protected/synthetic root IDs.
- Deduplicate selected descendants under selected parents.
- Recompute descendants server-side; do not trust client preview.

### Data Cleanup

- Delete deduped root nodes and rely on cascade for descendants/rows.
- Write one coherent history event or an ordered batch of history events.
- Preserve event/audit rows according to existing RPC semantics.

### Storage Cleanup

- No node-owned storage path was proven in this audit.
- If future node attachments exist, add path validation before deletion.

### Revalidation

- Active estimate route.
- Estimate tree/row query keys.
- Version/history displays if present.

### Failure Behavior

- If any selected ID is invalid, fail the entire operation.
- Rollback optimistic tree or force safe refresh.
- If active node is deleted, focus/route returned `fallbackNodeId`.

### Tests

- Parent/child selected together deletes once.
- Preview counts descendants and row items.
- Protected root rejects.
- Unauthorized edit rejects.
- History RPC called with coherent payload.
- Active route fallback matches single-delete behavior.

## Library Folders

### Current Behavior

`src/lib/component-library/actions.ts::deleteLibraryFolder` loads a workspace folder, plans deletion through `planLibraryFolderDelete`, lifts child folders, sets `cost_library_items.library_folder_id` to null, deletes the folder, and revalidates library paths.

### Dependent Tables and FK Behavior

| Dependency | Observed Behavior | Implementation Note |
|---|---|---|
| Child `library_folders` | Parent FK sets null in schema; action currently lifts children intentionally. | Bulk delete must preserve product lift behavior, not rely blindly on FK. |
| `cost_library_items.library_folder_id` | Sets null. | Deleting folders must not delete components. |
| Synthetic all-components root | App-level synthetic ID, not a DB row. | Must never be selected/deleted/dragged. |

### Recommended Contract

Future action: `deleteLibraryFoldersBulk(input: DeleteLibraryFoldersBulkInput)`.

### Required Validation

- Workspace scope.
- User can manage component library/folders.
- Exclude `ALL_COMPONENTS_FOLDER_ID`.
- Deduplicate selected descendants.
- Recompute affected children/items server-side.

### Data Cleanup

- Preserve current lift-child-folder behavior.
- Unassign component items from deleted folders.
- Do not delete components as part of folder delete.

### Storage Cleanup

- None for folders unless future folder images are introduced.

### Revalidation

- `/workshop/library`
- Component library tree/catalogue query keys.

### Failure Behavior

- All-or-nothing.
- On failure, keep selected IDs if folders still exist.
- After success, route/filter to parent or all-components fallback.

### Tests

- Synthetic root unselectable and undeletable.
- Bulk folder delete lifts children.
- Items are unassigned, not deleted.
- Cross-workspace folders reject.
- Active folder fallback works.

## Library Components

### Current Behavior

`changeCostLibraryComponentLifecycleState` changes lifecycle state through `set_cost_library_component_lifecycle_state`. Repository loaders include versions, price options, price/state history, variants, cost entries, attachments, image paths, and thumbnails. No audited hard-delete action exists.

### Dependent Tables and FK Behavior

| Dependency | Observed Behavior | Implementation Note |
|---|---|---|
| `cost_library_item_versions` | Cascades from item. | Hard delete removes versions. |
| `cost_library_item_price_options` | Cascades under item/version where configured. | Hard delete removes options. |
| `cost_library_item_price_history` | Cascades under item/option. | Hard delete removes history. |
| `cost_library_item_state_history` | Cascades under item. | Hard delete removes lifecycle history. |
| `variant_cost_entries` | Cascades under variant/version structures. | Hard delete removes cost entries. |
| `variant_attachments` | Cascades under item/version structures. | Storage cleanup still required for files. |
| `estimate_row_items.source_library_item_id` | Sets null. | Hard delete of referenced components can damage traceability even if FK allows it; gate by zero active references. |
| `library_folders` | Items set folder ID null on folder delete. | Component delete is separate from folder delete. |

### Recommended Contract

Default future action: `archiveCostLibraryComponentsBulk(input)`.

Optional hard-delete action: `deleteCostLibraryComponentsBulk(input)` only when zero-reference proof passes and permission allows.

### Required Validation

- Workspace scope.
- Current user can manage component library.
- Components belong to workspace.
- Archive target state is valid.
- Hard delete requires zero active estimate row references and typed confirmation.
- Hard delete must reject referenced components with a specific message.

### Data Cleanup

- Archive updates lifecycle state and preserves history.
- Hard delete relies on audited cascades only after zero-reference proof.
- Do not hard-delete by default from bulk UI.

### Storage Cleanup

- Collect component image, thumbnail, and attachment paths from component-owned metadata.
- Validate bucket and path ownership before removal.
- Never delete arbitrary user-provided paths.
- Return removed paths or cleanup failure details.

### Revalidation

- `/workshop/library`
- Component catalogue filters.
- Estimate insertion library queries if shared.

### Failure Behavior

- Archive failure keeps selection and shows alert.
- Hard delete rejects entire set if any component is referenced unless a future partial contract is designed.
- Storage cleanup partial failure returns repair details.

### Tests

- Archive selected components by default.
- Hard delete disabled/rejected for referenced components.
- Zero-reference hard delete removes DB rows and safe storage paths.
- Unauthorized/cross-workspace rejects.
- Catalogue selection clears after success and prunes after refresh.

## Cross-Cutting Permission Rules

- Client affordances are advisory only; server actions must revalidate permissions.
- Workspace/project/estimate scope must be checked before mutation.
- RLS is defense-in-depth, not the only validation layer.
- Bulk operations should return precise invalid IDs when safe to expose.
- Shared access badges must not be trusted as authorization proof.

## Live DB Verification Gate

Before implementing migrations/RPCs or shipping destructive actions, run a live linked/schema verification if available. If live DB differs from migrations, update this package before coding further.
