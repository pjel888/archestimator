# 02 Verified Codebase Map

## Purpose

This document maps the current implementation surfaces that a future mass-deletion implementation must touch or respect. It corrects inaccurate statements from the source plan and keeps implementation agents from guessing.

## Projects UI And Actions

| File | Current responsibility | Verified facts |
|---|---|---|
| `src/lib/projects/actions.ts` | Project create/update/delete actions and project-image metadata cleanup. | `deleteProject(formData)` exists. It reads `metadata`, deletes `projects` by id, removes project image storage paths, revalidates `/workshop/projects`, and redirects to `/workshop/projects`. |
| `src/components/workshop/projects-page-client.tsx` | Project list, search/filter, view modes, new project modal, detail modal launch. | No multi-select or bulk toolbar. Opens `ProjectDetailsModal` through `setExpandedProject`. |
| `src/components/workshop/LiveProjectCard.tsx` | Card rendering for owned/shared/sheet-only/pending project access. | Renders access badges and alternate actions for pending invites and sheet-only access; no delete button. |
| `src/components/workshop/ProjectDetailsModal.tsx` | Project metadata edit modal. | Has active `Delete project` button using `formAction={deleteProject}` and `window.confirm`. This must be replaced or routed through preview-first flow. |
| `src/app/workshop/projects/page.tsx` | Server page for project list. | Calls `listCurrentWorkspaceProjects()`. |
| `src/app/workshop/projects/[projectId]/layout.tsx` | Project shell layout. | Loads project, collaboration summary, publication summary, and estimate sheets. |
| `src/app/workshop/projects/[projectId]/page.tsx` | Project dashboard route. | Uses `getCurrentWorkspaceProject(projectId)`. |

### Current Project Delete Concerns

- `deleteProject` does not call `requireCurrentUserContext()` directly.
- It does not call `can_edit_project` explicitly.
- It relies on RLS delete policy and raw project id.
- It uses `window.confirm`, not the shared `Modal`.
- It performs best-effort storage cleanup after DB delete.
- It only revalidates `/workshop/projects`, not project detail/charts/estimate paths.

### Project Image Storage

- Server cleanup bucket constant: `PROJECT_IMAGE_BUCKET = "component-images"` in `src/lib/projects/actions.ts`.
- Project cleanup only accepts `.webp` paths containing `/project-images/` and rejects `..` / `//`.
- Project image API route is under `src/app/api/projects/images/`.
- Do not assume project images live in a separate bucket.

## Estimate Sheet UI And Actions

| File | Current responsibility | Verified facts |
|---|---|---|
| `src/lib/estimates/actions.ts` | Estimate server actions, tree/node/row mutations, history RPC calls, revalidation. | No sheet-level delete action exists. Node/row deletes exist and are not sheet deletes. |
| `src/components/workshop/ProjectEstimatesClient.tsx` | Estimate list page client wrapper. | Search plus create action; delegates row/table behavior to `ProjectEstimatesTable`. |
| `src/components/workshop/ProjectEstimatesTable.tsx` | TanStack table for estimate sheets. | Owns `selectedEstimateIds: Set<string>`. Checkbox exists. Trash icon is rendered disabled with title `Delete action is not wired yet`. |
| `src/hooks/use-estimate-query.ts` | TanStack Query keys and estimate tree fetching. | `estimateQueryKeys.areaTree(estimateId)` and detail query cache are the relevant invalidation targets. |
| `src/hooks/use-estimate-row-mutations.ts` | Optimistic row mutation hooks. | Invalidates area-tree/detail queries and supports rollback patterns. |
| `src/lib/repositories/estimate-repository.ts` | Client/server tree fetch helper used by query hooks. | Future sheet delete should invalidate rather than mutate stale trees manually. |
| `src/lib/repositories/workspace-repository.ts` | Workspace/project/estimate repository. | `ensureDefaultWorkspace()` uses `requireCurrentUserContext()`. `getCurrentWorkspaceProject()` is a common route/data boundary. |
| `src/app/workshop/projects/[projectId]/estimates/page.tsx` | Estimate list route. | Loads `listProjectEstimates(projectId)` and passes totals/counts to table. |
| `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx` | Estimate editor route. | Loads a project-scoped tree and uses `requireCurrentUserContext()` for collaboration context. |

### Existing Estimate Mutations To Reuse As Patterns

- `deleteEstimateNode(projectId, estimateId, nodeId)` validates a node in a project/estimate, calls `delete_estimate_node_with_history`, revalidates estimate paths, and returns tree/fallback data.
- `deleteEstimateRowItem(...)` validates row ownership and calls `delete_estimate_row_item_with_history` with `expected_row_revision`, `acting_user_id`, and `correlation_id`.
- `duplicateEstimateSheet(...)` deep copies sheet data and calls `revalidateProjectEstimatePaths(project.id)`.
- `updateEstimateDetails(...)` and `regenerateEstimateSheetCode(...)` use `update_estimate_details_with_history`.
- `revalidateProjectEstimatePaths(projectId)` revalidates project detail, estimates list, and charts.

### What Is Missing

- `previewBulkDeleteEstimateSheets`.
- `executeBulkDeleteEstimateSheets`.
- `deleteEstimateSheet` wrapper for a single id.
- Enabled row delete button.
- Bulk toolbar and destructive modal.
- Route fallback when open route points to deleted estimate.

## Estimate Node / Row Deletion

Node and row deletion are already history-aware and should not be confused with sheet deletion:

- Node delete RPC: `delete_estimate_node_with_history`.
- Row delete RPC: `delete_estimate_row_item_with_history`.
- Sheet deletion must remove the parent `estimates` rows and their dependent tree/row/history/collaboration/favorite rows.

## Library UI And Actions

| File | Current responsibility | Verified facts |
|---|---|---|
| `src/lib/component-library/actions.ts` | Component create/update/price/lifecycle/folder actions. | Lifecycle state action exists; hard delete for components does not. |
| `src/lib/repositories/component-library-repository.ts` | Loads library dataset and normalizes rows for library/estimate-sidebar use. | Loads component rows without lifecycle filtering. Normalized rows include `lifecycleState`. |
| `src/components/workshop/LibraryPageClient.tsx` | Thin wrapper around manager. | No archive/delete behavior here. |
| `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` | Main library manager shell. | No component card selection state or bulk toolbar. Folder delete uses `window.confirm`. Cards do not filter lifecycle state. |
| `src/components/workshop/component-library-manager/AddComponentModal.tsx` | Add/edit component modal. | Lifecycle options include `archived`; uploads component images/attachments. |
| `src/components/workshop/component-library-manager/LibraryFolderTree.tsx` | Library folder tree and folder actions. | Folder delete is non-root only. Search filters item fields, not lifecycle state. |
| `src/components/workshop/component-library/tree/` | Shared tree helpers. | Do not overload tree selection for bulk component card selection without checking existing tree behaviors. |
| `src/components/workshop/estimate-right-sidebar.tsx` | Estimate route insertion sidebar. | Search/insertion does not currently suppress archived components. |

### Component Lifecycle Behavior

- Type: `"draft" | "in_production" | "available" | "discontinued" | "archived"`.
- Server action: `changeCostLibraryComponentLifecycleState`.
- RPC: `set_cost_library_component_lifecycle_state`.
- New components default to `available` when lifecycle omitted.
- Existing rows with `source_snapshot` remain readable if a component is archived.
- Future implementation must filter `archived` from default library catalogue and estimate-sidebar insertion/search.

### Folder Delete Behavior

`deleteLibraryFolder(formData)`:

- validates folder in current workspace;
- plans child-folder reparenting;
- reparents child folders to deleted folder's parent;
- sets matching `cost_library_items.library_folder_id = NULL`;
- deletes the folder;
- revalidates `/workshop/library` and `/workshop/components`.

Do not reuse folder deletion semantics for component deletion.

## Collaboration / Access Control

| Function/table | Current truth |
|---|---|
| `can_access_project(project_id)` | Exists. Allows workspace members, project members, sheet members, and platform admin to read project context. |
| `can_edit_project(project_id)` | Exists. Allows platform admin, workspace owner/admin/member, or project owner/admin/editor. |
| `can_access_estimate(estimate_id)` | Exists. Allows sheet members or inherited project access. |
| `can_edit_estimate(estimate_id)` | Exists. Allows sheet owner/admin/editor or inherited project edit permission. |
| `can_manage_project_access(project_id)` | Exists. Rank >= admin. |
| `can_manage_estimate_access(estimate_id)` | Exists. Rank >= admin. |
| `project_members` | Project-scoped role rows; cascades on project delete. |
| `estimate_sheet_access_settings` | 1:1 sheet access mode; cascades on estimate delete. |
| `estimate_sheet_members` | Per-sheet role rows; cascades on estimate delete. |
| `collaboration_invitations` | Project/estimate invitations; cascades on project/estimate delete. |
| `collaboration_invitation_tokens` | Token rows; cascades on invitation delete. |
| `collaboration_audit_events` | Historical records; project/estimate/invitation ids set null on delete. |

## Publications / Shared Links

| File/table | Current truth |
|---|---|
| `src/lib/publication/` | Publication manager and snapshot helpers. |
| `src/lib/share/` | Public snapshot reconstruction helpers. |
| `src/components/workshop/publication/` | Manager UI helpers. |
| `src/components/share/` | Public receiver components. |
| `src/app/share/[token]/` and `src/app/api/share/[token]/` | Public receiver and token APIs. |
| `project_publications` | Stores `snapshot_json`, `selected_estimate_ids`, status, snapshot version, token hash. Cascades on project delete. |
| `project_publication_events` | Cascades on publication delete. |
| `shared_link_recipients/comments/responses/events` | Cascade through publication; comments/events set recipient null where appropriate. |

`snapshot_json` is the content source for receiver rendering. `selected_estimate_ids` is metadata/source-selection state and has no FK. For beta deletion, active publications should block project/estimate deletion rather than silently modifying receiver context.

## Storage Upload / Cleanup

| Surface | Bucket | Path pattern / rule |
|---|---|---|
| Project images | `component-images` | Server delete allow-list requires `.webp`, `/project-images/`, no `..`, no `//`. |
| Component images | `component-images` | API uses `${workspace.id}/${userId}/${safeName}-${uuid}.webp` plus thumbnail. Public bucket. |
| Component attachments | `component-attachments` | API uses `${workspace.id}/${userId}/${safeName}-${uuid}.{ext}`. Private bucket. |

Future cleanup must not remove arbitrary client-provided paths. RPC/server action must return validated stored paths derived from database rows and then delete with bucket-specific allow lists.

## Tests And Validation Infrastructure

- Commands: `bun run type-check`, `bun run lint`, `bun run lint:design-system`, `bun run test`, `bun run test:dom`, `bun run build`, `bun run validate`, `bun run test:e2e`, `bun run test:e2e:perf`.
- CI runs validate, build, Playwright E2E, and route-transition performance smoke.
- Server-action tests mock Supabase builders/RPCs in `tests/vitest/*actions.test.ts`.
- UI tests use React Testing Library and existing modal/toolbar primitives.
- Existing mutating E2E specs are env-gated with `ARCHESTIMATOR_E2E_*` flags and service-role credentials.
- Shared modal primitive: `src/components/ui/modal.tsx`.
