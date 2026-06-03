# Mass Deletion for Projects, Estimate Sheets, and Library Components

**Feature title:** Mass Deletion for Projects, Estimate Sheets, and Library Components
**Plan date:** 2026-06-03
**Status:** Planning — no implementation yet
**Author:** Sisyphus (AI Agent, through OhMyOpenCode)

---

## 1. Executive Summary

This plan defines the architecture for safely deleting projects, estimate sheets, and library components in bulk. It is not a shallow checklist — it maps every dependent table, every existing pattern, and every security boundary that must be respected.

### Recommended architecture (in plain language)

1. **Preview-first bulk action flow.** Before any destructive action, the user sees a preview modal showing exactly what will be affected — counts of dependent estimates, nodes, rows, publications, images, collaboration members, and storage objects. The preview is computed by Supabase RPCs, not by fetching rows into React.

2. **Server actions as the UI entry point.** All destructive writes go through `"use server"` actions in `src/lib/projects/actions.ts`, `src/lib/estimates/actions.ts`, and `src/lib/component-library/actions.ts`. These actions call Supabase RPCs for transactional preview and execution.

3. **Supabase RPCs for transactional preview and execution.** Dependency counting, workspace scoping, permission checks, and transactional deletes live in PostgreSQL RPCs. Server actions are thin wrappers that validate input, resolve user context, call RPCs, revalidate routes, and handle storage cleanup.

4. **Explicit workspace/actor permission checks.** The existing `deleteProject(formData)` relies heavily on RLS without explicit workspace scoping. The new bulk-delete path must explicitly scope by workspace and actor permissions — using `ensureDefaultWorkspace()`, `requireCurrentUserContext()`, and the existing `can_edit_estimate` / `is_workspace_admin` patterns.

5. **Bulk archive for library components by default.** Library components are referenced by estimate rows, templates, versions, and storage. Destructive hard delete must not be the default UX. The primary action is "Archive components." Hard delete is a separate, stricter, admin-only path gated behind preview proving zero active references.

6. **No client-side row-by-row deletion.** The client sends an array of explicit UUIDs. The server validates, deduplicates, batch-caps, and processes in a single RPC transaction. No `for` loop of individual `delete()` calls.

7. **No `window.confirm()`.** Use a proper Modal component (matching existing Button, Modal, Toast, SearchInput, and HeaderIconToolbar patterns) with an impact summary and typed confirmation ("DELETE PROJECTS" / "DELETE ESTIMATE SHEETS" / "ARCHIVE" as appropriate).

### Principle

> **"Deletion is a data-governance feature, not only a UI action."**

Every destructive action must be previewed, confirmed with a typed phrase, permission-checked server-side, transactionally executed, audited, and revalidated. There is no "quick delete" without preview.

---

## 2. Current Codebase Map

### 2.1 Projects page and project detail modal

**Files:**
- `src/components/workshop/projects-page-client.tsx` — Main projects list page. Supports view modes (list/small/medium/large), search filtering, access-kind filtering (owned/shared), "New Project" modal, and "Project Details" modal. No multi-select or bulk-delete state exists.
- `src/components/workshop/LiveProjectCard.tsx` — Individual project card. Renders project image, name, code, access badge (owned/shared/pending-invite/sheet-only), favorite star, publication link status. No selection checkbox.
- `src/components/workshop/ProjectDetailsModal.tsx` — Lazy-loaded detail modal. Shows project metadata, image, location, budget. No delete action visible.

**What exists:**
- `createProject(formData)` and `createProjectRecord(formData)` server actions
- `updateProjectDetails(formData)` and `updateProjectImageMetadata(projectId, image)`
- `deleteProject(formData)` — single project deletion (lines 124–144 of `src/lib/projects/actions.ts`)
- View mode persistence in `localStorage`
- Access kind badges (owned, shared project, sheet-only, pending invite)
- `favoriteProjectIds` passed from server

**What is missing:**
- Multi-select state for projects
- Bulk toolbar when projects are selected
- Preview/confirmation modal for project deletion
- Typed confirmation requirement
- Bulk-delete server action

**What must not be reused blindly:**
- `deleteProject(formData)` relies on RLS alone — it reads project metadata, calls `.delete().eq("id", projectId)`, cleans up storage images, revalidates, and redirects. It does NOT explicitly verify workspace membership or actor permissions beyond what RLS enforces. The new bulk path must add explicit `ensureDefaultWorkspace()` scoping and permission checks.
- `deleteProject` uses `redirect("/workshop/projects")` after single deletion. For bulk deletion, we cannot redirect mid-batch. The bulk action should return a result object and let the client refresh/redirect.

### 2.2 Estimate sheets page/table

**Files:**
- `src/components/workshop/ProjectEstimatesClient.tsx` — Estimate list container. Renders SearchInput, HeaderIconToolbar (with "Create Estimate Sheet" action), and ProjectEstimatesTable. No bulk toolbar.
- `src/components/workshop/ProjectEstimatesTable.tsx` — TanStack React Table with columns: row actions (checkbox + disabled Trash + Duplicate + Open + History), Sheet Code, Name, Notes, Project Budget, Ongoing Project Cost, Remaining Budget, Updated, Created.

**What exists:**
- Checkbox selection state: `selectedEstimateIds` (`useState<Set<string>>`) at line 621
- Toggle function: `toggleEstimateSelection(estimateId)` at line 653
- Disabled Trash icon: `title="Delete action is not wired yet"`, `disabled` (lines 221–228)
- `ProjectEstimateRowActions` component receives `isSelected` and `onToggleSelected`
- `duplicateEstimateSheet()`, `updateEstimateDetails()`, `regenerateEstimateSheetCode()` server actions
- `createEstimateSheetDraft(projectId)` and `createEstimate(projectId, formData)`
- `deleteEstimateNode()` and `deleteEstimateRowItem()` — node/row-level deletion through history RPCs, NOT sheet-level deletion
- Route revalidation: `revalidateProjectEstimatePaths(projectId)` in `src/lib/estimates/actions.ts` line 1031-1034

**What is missing:**
- Entire-sheet deletion server action (no `deleteEstimateSheet` exists)
- Preview/confirmation modal for estimate deletion
- Bulk toolbar leveraging existing `selectedEstimateIds` state
- Bulk-delete server action wrapping sheet-level deletion
- Handling of publication state when selected estimates are deleted

**What must not be reused blindly:**
- `deleteEstimateNode` uses `delete_estimate_node_with_history` RPC — this deletes a node and its descendants within ONE estimate. It is NOT a sheet-level operation.
- `deleteEstimateRowItem` uses `delete_estimate_row_item_with_history` RPC — this deletes a single row. Also not sheet-level.
- The existing `selectedEstimateIds` state is local React state — it will be lost on navigation/refresh. This is acceptable for bulk deletion (user selects, previews, confirms, executes), but "Select all matching search" would require server-side resolution.

### 2.3 Library manager and component catalogue

**Files:**
- `src/components/workshop/LibraryPageClient.tsx` — Thin wrapper around `ComponentLibraryManager`
- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` — Full library manager. Renders folder tree (left), component catalogue cards (center), detail panel (right). Cards display component name, category, unit, cost, pricing date, supplier. No selection state. No bulk toolbar.
- `src/lib/component-library/actions.ts` — Server actions for component CRUD, library folder CRUD, lifecycle state changes.

**What exists:**
- `createCostLibraryComponent(input)`, `updateCostLibraryComponent(itemId, input)`, `upsertCostLibraryComponentPriceOption(itemId, input)` — full CRUD
- `changeCostLibraryComponentLifecycleState({ itemId, lifecycleState, changeReason, effectiveAt })` — supports setting `archived` state (line 373-397)
- `createLibraryFolder(parentId, name)`, `renameLibraryFolder(folderId, name)`, `deleteLibraryFolder(folderId)` — folder CRUD with child lifting and item folder-nullification
- `reorderLibraryFolders(input)` — folder tree reorder
- Lifecycle states: `"draft" | "in_production" | "available" | "discontinued" | "archived"` (line 16)
- `revalidateLibraryRoutes()` revalidates `/workshop/library` and `/workshop/components`
- Folder deletion lifts children to parent and nullifies `cost_library_items.library_folder_id` before deleting the folder row

**What is missing:**
- Hard delete for library components (no action exists)
- Bulk archive action for components
- Selection state on component catalogue cards
- Bulk toolbar for archive/delete
- Preview/confirmation modal for archive
- Visibility filtering for archived components in the estimator sidebar insert/search flow

**What must not be reused blindly:**
- `deleteLibraryFolder` handles children correctly (lifts to parent, nullifies item references, deletes folder), but it is a single-folder operation. A bulk archive should be set-based, not a loop of individual calls.
- `changeCostLibraryComponentLifecycleState` processes one component at a time. For bulk archive, we need an RPC that sets `lifecycle_state = 'archived'` for a batch of IDs in a single transaction.
- The folder tree component `LibraryFolderTree` uses React Complex Tree DnD — selection state for bulk actions should be separate from the tree interaction model.

### 2.4 Existing project delete action

**File:** `src/lib/projects/actions.ts`, lines 124–144

```typescript
export async function deleteProject(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const projectId = readRequiredText(formData, "projectId");
  // Reads metadata to extract image paths
  const { data: existing, error: loadError } = await supabase
    .from("projects").select("metadata").eq("id", projectId).single();
  if (loadError) throw loadError;
  const metadata = asProjectMetadata(existing.metadata);
  // Deletes project (RLS-scoped, cascade removes estimates/nodes/rows)
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) throw error;
  // Best-effort storage cleanup
  await removeStoredProjectImagePaths(supabase, getProjectImageStoragePaths(metadata));
  revalidatePath("/workshop/projects");
  redirect("/workshop/projects");
}
```

**Issues for the plan:**
1. No explicit workspace scoping — relies entirely on RLS policies (`is_workspace_member`).
2. No permission check beyond RLS — any workspace member can delete any project in their workspace.
3. No audit trail — deletion is not recorded in any audit table.
4. No preview — user clicks a button and the project is gone.
5. Best-effort storage cleanup — if storage deletion fails, the DB row is already gone.
6. Assumes cascade handles all dependent data — ignores publications, collaborations, shared links, audit rows.

### 2.5 Existing estimate node/row delete actions

**File:** `src/lib/estimates/actions.ts`

- `deleteEstimateNode(projectId, estimateId, nodeId)` (line 1630): Validates node exists in project/estimate, plans the tree delete, calls `delete_estimate_node_with_history` RPC, revalidates paths. Returns `{ tree, deletedNodeIds, fallbackNodeId }`.
- `deleteEstimateRowItem({ projectId, estimateId, rowId, mutationId, expectedRowRevision })` (line 1857): Validates row exists in project/estimate, calls `delete_estimate_row_item_with_history` RPC with row revision guard, revalidates node path.

Both use:
- `getCurrentWorkspaceProject(projectId)` — explicit workspace scoping
- `requireCurrentUserContext()` — actor identity
- History RPCs with `acting_user_id` and `correlation_id` — audit trail
- Scoped `revalidatePath()` calls

**Good patterns to follow:** The estimate node/row deletion pattern (workspace scoping → validation → history RPC → revalidation) is the correct model for bulk deletion.

### 2.6 Existing component lifecycle actions

**File:** `src/lib/component-library/actions.ts`

- `changeCostLibraryComponentLifecycleState({ itemId, lifecycleState, changeReason, effectiveAt })`: Calls `set_cost_library_component_lifecycle_state` RPC with `target_workspace_id`, `target_item_id`, `next_state`, `change_reason`, `effective_at`, `acting_user_id`. Returns `{ itemId, versionNumber, lifecycleState }`. Revalidates library routes.

**Good patterns to follow:** Uses `ensureDefaultWorkspace()` for workspace scoping, `requireCurrentUserContext()` for actor identity, passes `acting_user_id` to RPC, and includes `change_reason` for audit. This is the correct pattern to extend for bulk archive.

### 2.7 Existing permission/access RPCs

**Identified in codebase:**
- `can_edit_estimate(target_estimate_id)` — used in `assertCanEditEstimate()` in `src/lib/estimates/actions.ts` (line 294)
- `is_workspace_member(target_workspace_id)` — core schema function, used by RLS policies
- `is_workspace_admin(target_workspace_id)` — core schema function, used by RLS policies
- `list_pending_collaboration_invitations()` — used in workspace repository
- `accept_collaboration_invitation_by_id` — used in pending invite actions
- `get_estimate_activity_retention_metrics(target_project_id)` — used for activity metrics

**For mass deletion, we need or should verify:**
- `can_edit_project(target_project_id)` — does not appear to exist; we may need to add it or use workspace admin checks
- `can_edit_estimate(target_estimate_id)` — exists and is used

### 2.8 Existing route revalidation patterns

**Patterns found:**
- `revalidatePath("/workshop/projects")` — project list
- `revalidatePath(\`/workshop/projects/${projectId}\`)` — project detail
- `revalidatePath(\`/workshop/projects/${projectId}/estimates\`)` — estimate list
- `revalidatePath(\`/workshop/projects/${projectId}/charts\`)` — charts
- `revalidatePath(\`/workshop/projects/${project.id}/estimates/${targetNodeId}\`)` — specific estimate node
- `revalidatePath("/workshop/library")` and `revalidatePath("/workshop/components")` — library routes

`revalidateProjectEstimatePaths(projectId)` at line 1031 centralizes estimate path revalidation.

### 2.9 Existing tests and validation commands

**Commands:**
- `bun run type-check` — TypeScript compilation check
- `bun run lint` — ESLint (14 existing warnings, 0 errors)
- `bun run lint:design-system` — Custom design-system enforcement
- `bun run test` — Bun unit tests (`tests/unit/`)
- `bun run test:dom` — Vitest DOM tests (`tests/vitest/`, 151 files, 1119+ tests)
- `bun run build` — Next.js production build
- `bun run validate` — Full gate: type-check + lint + design-system + unit + dom
- `bun run test:e2e` — Playwright E2E (Chromium)

---

## 3. Data Dependency Inventory

### 3.1 Projects

Projects are the widest dependency surface. Deleting a project cascade-deletes estimates, nodes, and rows through FK constraints, but other dependent tables are NOT cascade-linked in the current schema.

| Table | FK relationship | Current behavior | Recommended for bulk delete |
|-------|----------------|-----------------|----------------------------|
| `projects` | — | Delete row | **Delete** |
| `project_favorites` | `project_id` FK to `projects.id` | No cascade defined | **Delete** (explicit in RPC before project row) |
| `project_members` | `project_id` FK to `projects.id` | No cascade defined | **Delete** (explicit in RPC before project row) |
| `estimates` | `project_id` FK to `projects.id` ON DELETE CASCADE | Cascade deletes | Cascade handles this; RPC counts them for preview |
| `estimate_nodes` | `estimate_id` FK to `estimates.id` ON DELETE CASCADE | Cascade deletes | Cascade handles this; counted for preview |
| `estimate_row_items` | `estimate_id` FK to `estimates.id` ON DELETE CASCADE | Cascade deletes | Cascade handles this; counted for preview |
| `estimate_sheet_events` | `estimate_id` FK to `estimates.id` | Not determined — check migration | **Delete** (explicit in RPC or cascade) |
| `estimate_sheet_versions` | `estimate_id` FK to `estimates.id` | Not determined — check migration | **Delete** (explicit in RPC or cascade) |
| `estimate_favorites` | `estimate_id` FK to `estimates.id` | No cascade defined | **Delete** (explicit in RPC before estimate cascade) |
| `estimate_sheet_members` | `estimate_id` FK to `estimates.id` | Not determined — check migration | **Delete** (explicit in RPC) |
| `estimate_sheet_access_settings` | `estimate_id` FK to `estimates.id` | Not determined — check migration | **Delete** (explicit in RPC) |
| `collaboration_invitations` | `project_id` FK to `projects.id`; `estimate_id` FK to `estimates.id` | Not determined — check migration | **Delete** (explicit in RPC; also revoke any pending tokens) |
| `collaboration_invitation_tokens` | `invitation_id` FK to `collaboration_invitations.id` | Not determined — check migration | **Delete** (cascade or explicit; also audit token revocation) |
| `collaboration_audit_events` | `project_id` FK, `estimate_id` FK | Not determined — check migration | **Retain as immutable historical audit** — null-reference project/estimate IDs |
| `project_publications` | `project_id` FK to `projects.id` | Not determined — check migration | **Decision required** (see below) |
| `shared_link_recipients` | `publication_id` FK to `project_publications.id` | Not determined — check migration | Depends on publication decision |
| `shared_link_comments` | `publication_id` FK | Not determined — check migration | Depends on publication decision |
| `shared_link_responses` | `publication_id` FK | Not determined — check migration | Depends on publication decision |
| `shared_link_events` | `publication_id` FK | Not determined — check migration | **Retain as immutable historical audit** |
| `beta_feedback_submissions` | `project_id` FK to `projects.id` | No cascade defined | **Null reference** — set `project_id = NULL`, retain feedback |
| `ai_data_access_events` | `project_id` FK (likely) | Not determined — check migration | **Retain as immutable historical audit** — null-reference |
| `ai_tool_calls` | Linked via `ai_action_runs` | Not determined — check migration | **Retain as immutable historical audit** |
| `ai_action_runs` | `project_id` FK (likely) | Not determined — check migration | **Retain as immutable historical audit** — null-reference |
| Supabase Storage (project images) | Stored by path convention (`project-images/...`) | Best-effort cleanup in current action | **Best-effort cleanup** after DB transaction; return paths from RPC |
| `account_security_events` | `workspace_id` FK | Keep (workspace-level, not project-level) | **Leave unchanged** |

#### Publication snapshots — explicit decision

**Recommended for beta:** Block project deletion if the project has an active (non-revoked, non-expired) publication. The preview must surface this as a blocker with clear instructions: "This project has an active shared link. Revoke the publication before deleting."

**Tradeoff:** This adds friction (user must navigate to publication settings first), but it prevents data inconsistency where shared link tokens still exist but their snapshots are gone. Alternative approaches:
- Auto-revoke: Delete publications and their dependent data before deleting the project. Safer for consistency, but destroys immutable historical records without explicit user action.
- Detach-and-retain: Keep publication rows but set `project_id = NULL`. Could break the shared link viewer which reads snapshot JSON from the publication row.

**Decision: Block deletion with active publication; require manual revocation first.** This is the safest beta behavior and avoids destroying shared-link data that recipients may have acted on (comments, decisions).

### 3.2 Estimate Sheets

| Table | FK relationship | Current behavior | Recommended for bulk delete |
|-------|----------------|-----------------|----------------------------|
| `estimates` | — | Delete row | **Delete** |
| `estimate_nodes` | `estimate_id` FK ON DELETE CASCADE | Cascade deletes | Cascade handles this |
| `estimate_row_items` | `estimate_id` FK ON DELETE CASCADE | Cascade deletes | Cascade handles this |
| `estimate_sheet_events` | `estimate_id` FK | Check migration | **Delete** (explicit in RPC) |
| `estimate_sheet_versions` | `estimate_id` FK | Check migration | **Delete** (explicit in RPC) |
| `estimate_favorites` | `estimate_id` FK | No cascade defined | **Delete** (explicit in RPC) |
| `estimate_sheet_members` | `estimate_id` FK | Check migration | **Delete** (explicit in RPC) |
| `estimate_sheet_access_settings` | `estimate_id` FK | Check migration | **Delete** (explicit in RPC) |
| `collaboration_invitations` (estimate-scoped) | `estimate_id` FK | Check migration | **Delete** (explicit in RPC) |
| `collaboration_invitation_tokens` (linked to above) | `invitation_id` FK | Check migration | **Delete** (cascade or explicit) |
| `project_publications.selected_estimate_ids` | Array column | No FK constraint — array of UUIDs | **Decision required** (see below) |

#### Publication state — explicit decision

Estimate deletion must not leave broken publication state. If an estimate is included in `selected_estimate_ids` of an active publication, the publication snapshot is now incomplete.

**Recommended for beta:** Remove the deleted estimate ID from `selected_estimate_ids` of ALL publications in the same project. If removal results in zero selected estimates, set the publication status to `expired` (since there's nothing to publish). The preview must surface the number of affected publications.

**Alternative (safer):** Block deletion if the estimate is selected in any active publication. This mirrors the project-deletion publication rule. More conservative, but may frustrate users who want to delete an unused estimate sheet that happened to be included in a multi-sheet publication.

**Recommended:** Use the "remove from selected_estimate_ids" approach with clear preview messaging: "This estimate is included in N active publications. It will be removed from those publications."

### 3.3 Library Components

| Table | FK relationship | Current behavior | Recommended for archive | Recommended for hard delete |
|-------|----------------|-----------------|------------------------|---------------------------|
| `cost_library_items` | — | Update `lifecycle_state` | Set `archived` | Delete row |
| `cost_library_item_price_options` | `item_id` FK | No direct action | Leave as-is (keeps historical pricing) | Delete |
| `cost_library_item_variant_cost_entries` | `item_id` FK, `price_option_id` FK | No direct action | Leave as-is | Delete |
| `cost_library_item_variant_attachments` | `item_id` FK | No direct action | Leave as-is | Delete + storage cleanup |
| `cost_library_item_versions` | `item_id` FK | No direct action | Leave as-is | Delete |
| `cost_library_item_price_history` | `item_id` FK | No direct action | Leave as-is | Delete |
| `cost_library_item_state_history` | `item_id` FK | No direct action | Append `archive` state entry | Delete |
| `estimate_row_items.source_library_item_id` | FK to `cost_library_items.id` ON DELETE SET NULL | NULL on delete | Keep reference — rows retain `source_snapshot` | NULL on delete (cascade) |
| `estimate_template_row_items.source_library_item_id` | FK to `cost_library_items.id` | Not determined | Keep reference — rows retain snapshot | NULL on delete |
| `library_folders` (containing components) | No direct FK; linked via `library_folder_id` on `cost_library_items` | Folder delete nullifies item's folder reference | Leave folder reference; component hidden but organized | Nullify folder reference before delete |
| `component_suppliers` | No FK from items | No direct action | Leave as-is (supplier may have other items) | Leave as-is |
| `component_brands` | No FK from items | No direct action | Leave as-is | Leave as-is |
| Supabase Storage (images, attachments) | Paths stored in variant/attachment rows | No direct action | Leave as-is (historical) | **Best-effort cleanup** after DB transaction |

#### Archive behavior for linked estimate rows

When a component is archived:
1. **Existing estimate rows keep their `source_snapshot`.** The row continues to display the component name, unit cost, category, supplier, etc. from the snapshot. No data loss for existing estimates.
2. **New insert/search behavior hides archived components.** The estimator sidebar search/filter, template insertion, and library insertion should exclude `lifecycle_state = 'archived'` by default. A filter toggle could show archived components for reference.
3. **Existing linked rows show "source unavailable" indicator.** If a row is `linked-clean` or `linked-overridden` with a now-archived `source_library_item_id`, the row inspector should show a subtle "Source archived" badge or indicator. This is a UX polish item for Phase 5, not a blocking requirement.

#### Hard delete policy

Hard delete is a separate, advanced/admin-only path:
- **Only allowed** after preview proves zero active estimate/template references to the component.
- Preview must check both `estimate_row_items.source_library_item_id` and `estimate_template_row_items.source_library_item_id`.
- Must include storage cleanup for variant images and attachments.
- Must be workspace-owner or workspace-admin only (not editor).
- Requires separate typed confirmation: "DELETE COMPONENTS" with a count.

---

## 4. Product UX / UI Plan

All UI follows the strict Archestimator design system:
- **Font:** SF Pro, regular/medium weights only
- **Size:** 12px maximum (titles), 10px body/buttons/table cells, 8-9px labels
- **Radius:** xs (3px) only
- **Spacing:** Zero letter-spacing
- **Colors:** `#B91C1C` (danger) for destructive actions, `#FEE2E2` (dangerSoft) for warning surfaces
- **Components:** Reuse existing Button, Modal, Toast, SearchInput, HeaderIconToolbar, EmptyState, Badge primitives

### 4.1 Projects UI

**Multi-select mode:**
- Add checkbox to each `LiveProjectCard` (top-left corner overlay or left edge).
- Selection state managed via `useState<Set<string>>` in `ProjectsPageClient`.
- Clicking a card without the checkbox navigates to the project (existing behavior).
- Clicking the checkbox toggles selection without navigation.

**Bulk toolbar:**
- Appears as a fixed bar at the bottom of the projects grid or as a floating toolbar above the grid when `selectedProjectIds.size > 0`.
- Shows: selected count ("3 projects selected"), "Clear selection" button, destructive "Delete projects" button (danger variant).
- "Select visible" button selects all currently filtered/visible projects.
- "Select all matching search" is deferred for now (requires server-side resolution).

**Access control for destructive actions:**
- "Delete" button is hidden or disabled for shared/pending/sheet-only projects unless current user has `owner` or `admin` role on that project.
- Projects where user lacks delete permission are not selectable (checkbox disabled with tooltip).

**Preview/confirmation modal:**
- Triggered by clicking "Delete projects" in the bulk toolbar.
- Two-phase: Phase 1 loads preview from server action (shows skeleton), Phase 2 displays impact summary and confirmation input.
- Preview content:
  - Number of projects to delete
  - Project names/codes (first 5, "+N more" if more)
  - Number of estimates affected (total across all selected projects)
  - Number of estimate nodes affected
  - Number of estimate row items affected
  - Active shared links/publications that would block deletion
  - Collaboration members/invitations that would be removed
  - Project images/storage objects that would be deleted
  - Warning: "Deletion cannot be undone. Estimate data, activity history, and shared links will be permanently removed."
- Typed confirmation:
  - 1 item: Type the project name to confirm
  - 2+ items: Type "DELETE PROJECTS" to confirm
- "Cancel" and disabled "Delete" (enabled only when typed confirmation matches) buttons

### 4.2 Estimate Sheets UI

**Single-row delete:**
- Enable the existing disabled Trash icon in `ProjectEstimateRowActions` (line 221-228).
- Before enabling, wire the backend: a `deleteEstimateSheet` server action.
- Single delete shows the same preview modal as bulk delete, but scoped to one estimate.

**Bulk delete:**
- Leverage existing `selectedEstimateIds` state in `ProjectEstimatesTable` (line 621).
- Add a bulk toolbar above the table (between `HeaderIconToolbar` and the table body) when `selectedEstimateIds.size > 0`.
- Toolbar content: selected count ("X estimate sheets selected"), "Clear selection", "Delete selected" (danger button).
- Add "Select visible" to select all currently displayed rows.

**Preview/confirmation modal:**
- Shows:
  - Estimate sheet count
  - Node count across all selected estimates
  - Row item count across all selected estimates
  - Activity/version count (`estimate_sheet_events` + `estimate_sheet_versions`)
  - Access members/invites count
  - Publication impact: "This estimate is included in N active publications. It will be removed from those publications."
- Typed confirmation: "DELETE ESTIMATE SHEETS" (always uppercase for multiple)
- Single sheet: Type the sheet code (e.g., "ES-001") to confirm

**Post-deletion behavior:**
- Refresh table via `router.refresh()` or TanStack Query invalidation
- If user deletes the currently open estimate sheet (the one they're viewing), redirect to `/workshop/projects/${projectId}/estimates` (the estimate list)
- Clear all selection state
- Invalidate TanStack Query keys: `estimateQueryKeys.areaTree(estimateId)`, `estimateQueryKeys.detail(estimateId)`
- Revalidate project estimate/charts routes

### 4.3 Library Components UI

**Selection state:**
- Add checkbox to each component catalogue card in `ComponentLibraryManager`.
- Selection state managed at the `ComponentLibraryManager` level.
- Cards remain clickable for detail view; checkbox is a separate hit target.

**Bulk toolbar:**
- Appears above the catalogue grid when `selectedItemIds.size > 0`.
- Primary action: "Archive components" (neutral button — archive is not destructive in the same way as delete).
- Secondary/advanced action: "Hard delete unreferenced components" (danger button, gated behind admin/owner role check). Only appears when ALL selected components have zero references (determined by preview).
- "Clear selection" button.

**Archive modal:**
- Shows:
  - Component count to archive
  - Linked estimate rows count (using these components in active estimates — these retain snapshot data)
  - Linked template rows count
  - Variants/attachments count (retained for history)
  - Warning: "Archived components will be hidden from insertion/search by default. Existing estimate rows using these components will keep their data."
- Typed confirmation: Type "ARCHIVE" to confirm

**Hard-delete modal (separate, stricter):**
- Only accessible when preview proves ALL selected components have zero references.
- Shows:
  - Component count
  - Variants/attachments to permanently delete
  - Storage objects to remove (images, PDF/XLS attachments)
  - Warning: "This permanently deletes components, variants, pricing history, attachments, and storage files. This cannot be undone."
- Typed confirmation: Type "DELETE COMPONENTS" to confirm
- Admin/owner only — button hidden for editors/viewers

**Post-archive behavior:**
- Refresh catalogue (archived components disappear from default view)
- Archived components are hidden from estimator sidebar search/insertion
- Existing estimate rows using archived components remain unchanged
- A future filter/tab "Show archived" may be added in Phase 5

---

## 5. Backend Architecture Plan

### 5.1 Server Actions

New actions to be added to existing action files:

#### `src/lib/projects/actions.ts`

```typescript
// Preview: returns impact summary without mutating anything
export async function previewBulkDeleteProjects(input: {
  projectIds: string[];
}): Promise<{
  preview: {
    projectCount: number;
    projectNames: string[];
    estimateCount: number;
    nodeCount: number;
    rowItemCount: number;
    activePublicationCount: number;
    blockedProjectIds: string[];
    blockedPublicationIds: string[];
    collaborationMemberCount: number;
    collaborationInvitationCount: number;
    storageObjectCount: number;
    storagePaths: string[];
  };
  notFoundIds: string[];
  forbiddenIds: string[];
}>

// Execution: performs deletion after preview confirmed by user
export async function executeBulkDeleteProjects(input: {
  projectIds: string[];
  correlationId: string;
}): Promise<{
  deletedProjectCount: number;
  deletedEstimateCount: number;
  deletedNodeCount: number;
  deletedRowItemCount: number;
  storageCleanupResult: { deleted: number; failed: string[] };
}>
```

#### `src/lib/estimates/actions.ts`

```typescript
export async function previewBulkDeleteEstimateSheets(input: {
  projectId: string;
  estimateIds: string[];
}): Promise<{
  preview: {
    estimateCount: number;
    estimateSheetCodes: string[];
    nodeCount: number;
    rowItemCount: number;
    eventCount: number;
    versionCount: number;
    affectedPublicationCount: number;
    affectedPublicationIds: string[];
    memberCount: number;
    invitationCount: number;
    favoriteCount: number;
  };
  notFoundIds: string[];
  forbiddenIds: string[];
}>

export async function executeBulkDeleteEstimateSheets(input: {
  projectId: string;
  estimateIds: string[];
  correlationId: string;
}): Promise<{
  deletedEstimateCount: number;
  deletedNodeCount: number;
  deletedRowItemCount: number;
  updatedPublicationCount: number;
}>

// Single estimate sheet delete (wraps bulk with array of 1)
export async function deleteEstimateSheet(input: {
  projectId: string;
  estimateId: string;
  correlationId: string;
}): Promise<{ deleted: boolean }>
```

#### `src/lib/component-library/actions.ts`

```typescript
export async function previewBulkArchiveLibraryComponents(input: {
  itemIds: string[];
}): Promise<{
  preview: {
    componentCount: number;
    componentNames: string[];
    linkedEstimateRowCount: number;
    linkedTemplateRowCount: number;
    variantCount: number;
    attachmentCount: number;
    versionCount: number;
    priceHistoryCount: number;
  };
  notFoundIds: string[];
  forbiddenIds: string[];
}>

export async function executeBulkArchiveLibraryComponents(input: {
  itemIds: string[];
  correlationId: string;
  changeReason: string;
}): Promise<{
  archivedComponentCount: number;
}>

// Optional — Phase 6
export async function previewHardDeleteLibraryComponents(input: {
  itemIds: string[];
}): Promise<{
  preview: {
    componentCount: number;
    hasReferences: boolean;
    linkedEstimateRowCount: number;
    linkedTemplateRowCount: number;
    storageObjectPaths: string[];
  };
  notFoundIds: string[];
  forbiddenIds: string[];
  blockedIds: string[];  // Components with active references
}>

export async function executeHardDeleteLibraryComponents(input: {
  itemIds: string[];
  correlationId: string;
}): Promise<{
  deletedComponentCount: number;
  storageCleanupResult: { deleted: number; failed: string[] };
}>
```

**Server action requirements (all actions):**
- `"use server"` directive at file top (already present)
- Call `ensureDefaultWorkspace()` for workspace scoping
- Call `requireCurrentUserContext()` for actor identity
- Validate UUIDs: `isUuid()` helper from `@/lib/ids`
- Deduplicate IDs with `Array.from(new Set(input.ids))`
- Reject empty input arrays
- Apply batch cap based on target type (50 projects, 100 estimates, 500 components for beta)
- Return typed result objects (not throwing for business-logic rejections)
- Return structured errors: `{ error: "permission_denied" | "not_found" | "conflict" | "unsafe_delete" }`
- Never trust client-provided role/access information
- Revalidate exact affected paths only (not blanket `revalidatePath("/")`)

### 5.2 Supabase RPC / Migration Design

**Decision: Use database RPCs for preview + execution.** Dependency counting, workspace scoping, and transactionality belong in Postgres. Server actions act as thin authorization + revalidation wrappers.

#### RPC design principles

- `SECURITY DEFINER` only if necessary to bypass RLS for cross-table counting.
- Always `SET search_path = 'public'` (or the schema-qualified equivalent) to prevent search-path injection.
- Use `auth.uid()` as the authoritative actor identity within RPCs. Server actions pass `acting_user_id` as a defense-in-depth parameter (RPC validates it matches `auth.uid()` or fails).
- Validate all IDs belong to the target workspace/project before counting or deleting.
- Return `not_found_ids` and `forbidden_ids` as separate arrays — never leak cross-workspace existence through error messages.
- Use a single transaction for execution RPCs.
- Use `correlation_id` for audit linking across all tables affected.
- Use set-based SQL (`DELETE FROM ... WHERE id = ANY(input_ids)`) — never row-by-row loops.
- Use advisory lock or `SELECT ... FOR UPDATE` for destructive operations to prevent concurrent modifications.
- Batch caps enforced at both the server action level (TypeScript) and RPC level (SQL `IF array_length(input_ids, 1) > max_batch THEN RAISE`).

#### Proposed RPCs

**Phase 1 — Preview RPCs:**

```sql
-- Migration: 20260603XXXXXX_preview_bulk_delete_projects.sql
CREATE OR REPLACE FUNCTION public.preview_bulk_delete_projects(
  target_workspace_id uuid,
  target_project_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  valid_project_ids uuid[];
  not_found_ids uuid[];
  forbidden_ids uuid[];
  preview jsonb;
BEGIN
  -- Validate batch size
  IF array_length(target_project_ids, 1) > 50 THEN
    RAISE EXCEPTION 'Batch size exceeds maximum (50 projects).';
  END IF;

  -- Validate workspace membership
  IF NOT public.is_workspace_member(target_workspace_id) THEN
    RAISE EXCEPTION 'Not a workspace member.';
  END IF;

  -- Separate valid, not-found, and forbidden IDs
  SELECT array_agg(p.id)
  INTO valid_project_ids
  FROM unnest(target_project_ids) AS tid
  JOIN public.projects p ON p.id = tid AND p.workspace_id = target_workspace_id
  WHERE public.is_workspace_admin(target_workspace_id)  -- Only admins/owners can delete
     OR p.created_by = auth.uid();

  SELECT array_agg(tid)
  INTO not_found_ids
  FROM unnest(target_project_ids) AS tid
  WHERE tid NOT IN (SELECT id FROM public.projects WHERE workspace_id = target_workspace_id);

  SELECT array_agg(tid)
  INTO forbidden_ids
  FROM unnest(target_project_ids) AS tid
  WHERE tid IN (SELECT id FROM public.projects WHERE workspace_id = target_workspace_id)
    AND tid != ALL(COALESCE(valid_project_ids, ARRAY[]::uuid[]));

  -- Build preview for valid projects
  SELECT jsonb_build_object(
    'projectCount', (SELECT count(*) FROM unnest(COALESCE(valid_project_ids, ARRAY[]::uuid[]))),
    'estimateCount', (SELECT count(*) FROM public.estimates WHERE project_id = ANY(COALESCE(valid_project_ids, ARRAY[]::uuid[]))),
    'nodeCount', (SELECT count(*) FROM public.estimate_nodes en JOIN public.estimates e ON e.id = en.estimate_id WHERE e.project_id = ANY(COALESCE(valid_project_ids, ARRAY[]::uuid[]))),
    'rowItemCount', (SELECT count(*) FROM public.estimate_row_items eri JOIN public.estimates e ON e.id = eri.estimate_id WHERE e.project_id = ANY(COALESCE(valid_project_ids, ARRAY[]::uuid[]))),
    'activePublicationCount', (SELECT count(*) FROM public.project_publications WHERE project_id = ANY(COALESCE(valid_project_ids, ARRAY[]::uuid[])) AND status = 'published' AND revoked_at IS NULL),
    'blockedProjectIds', (SELECT COALESCE(jsonb_agg(pp.project_id), '[]'::jsonb) FROM public.project_publications pp WHERE pp.project_id = ANY(COALESCE(valid_project_ids, ARRAY[]::uuid[])) AND pp.status = 'published' AND pp.revoked_at IS NULL),
    -- ... additional counts for members, invitations, storage ...
  ) INTO preview;

  RETURN jsonb_build_object(
    'preview', preview,
    'notFoundIds', COALESCE(to_jsonb(not_found_ids), '[]'::jsonb),
    'forbiddenIds', COALESCE(to_jsonb(forbidden_ids), '[]'::jsonb)
  );
END;
$$;
```

Similar preview RPCs for:
- `preview_bulk_delete_estimates(target_project_id uuid, target_estimate_ids uuid[])`
- `preview_bulk_archive_library_components(target_workspace_id uuid, target_item_ids uuid[])`
- `preview_hard_delete_library_components(target_workspace_id uuid, target_item_ids uuid[])` (Phase 6)

**Phase 2 — Execution RPCs:**

```sql
-- Migration: 20260603XXXXXX_execute_bulk_delete_projects.sql
CREATE OR REPLACE FUNCTION public.execute_bulk_delete_projects(
  target_workspace_id uuid,
  target_project_ids uuid[],
  acting_user_id uuid,
  correlation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  preview jsonb;
  deleted_counts jsonb;
  blocked_ids uuid[];
BEGIN
  -- Run preview first to validate
  preview := public.preview_bulk_delete_projects(target_workspace_id, target_project_ids);
  
  -- Block if any active publications exist
  SELECT COALESCE(jsonb_array_to_text_array(preview->'preview'->'blockedProjectIds'), ARRAY[]::uuid[])
  INTO blocked_ids;
  IF array_length(blocked_ids, 1) > 0 THEN
    RAISE EXCEPTION 'Cannot delete projects with active publications. Revoke publications first.';
  END IF;

  -- Validate actor
  IF acting_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Actor mismatch.';
  END IF;

  -- Transactional deletion
  BEGIN
    -- Delete in dependency order (children before parents where no cascade exists)
    DELETE FROM public.project_favorites WHERE project_id = ANY(target_project_ids);
    DELETE FROM public.project_members WHERE project_id = ANY(target_project_ids);
    DELETE FROM public.estimate_favorites WHERE estimate_id IN (
      SELECT id FROM public.estimates WHERE project_id = ANY(target_project_ids)
    );
    DELETE FROM public.estimate_sheet_members WHERE estimate_id IN (
      SELECT id FROM public.estimates WHERE project_id = ANY(target_project_ids)
    );
    DELETE FROM public.estimate_sheet_access_settings WHERE estimate_id IN (
      SELECT id FROM public.estimates WHERE project_id = ANY(target_project_ids)
    );
    DELETE FROM public.collaboration_invitations WHERE project_id = ANY(target_project_ids)
       OR estimate_id IN (SELECT id FROM public.estimates WHERE project_id = ANY(target_project_ids));
    DELETE FROM public.project_publications WHERE project_id = ANY(target_project_ids);
    -- Cascade handles: estimates, estimate_nodes, estimate_row_items
    DELETE FROM public.projects WHERE id = ANY(target_project_ids);

    -- Build summary
    SELECT jsonb_build_object(
      'deletedProjectCount', array_length(target_project_ids, 1),
      'correlationId', correlation_id,
      'deletedAt', now(),
      'actorUserId', acting_user_id
    ) INTO deleted_counts;
  EXCEPTION WHEN OTHERS THEN
    RAISE;  -- Transaction rolls back
  END;

  RETURN deleted_counts;
END;
$$;
```

Similar execution RPCs for:
- `execute_bulk_delete_estimates(target_project_id uuid, target_estimate_ids uuid[], acting_user_id uuid, correlation_id uuid)`
- `execute_bulk_archive_library_components(target_workspace_id uuid, target_item_ids uuid[], acting_user_id uuid, correlation_id uuid, change_reason text)`
- `execute_hard_delete_library_components(...)` (Phase 6)

### 5.3 Storage Cleanup

Storage cleanup is separated from the database transaction:

**Decision: Best-effort cleanup after DB commit.**

1. Execution RPC returns validated storage paths (from `projects.metadata`, variant `image_path`/`thumbnail_path`, and variant attachment `storage_path` columns).
2. Server action waits for RPC to commit successfully.
3. Server action calls `supabase.storage.from(bucket).remove(paths)` for the returned paths.
4. Cleanup failures are logged but do NOT roll back the DB transaction — the data is already deleted.
5. Storage bucket constants: `PROJECT_IMAGE_BUCKET = "component-images"` (shared bucket for project images and component images/attachments).
6. Safety rules:
   - Only delete paths that match known bucket/path conventions
   - `isProjectImageStoragePath()` validator pattern from existing `actions.ts` should be extended
   - Validate no path traversal (`..`, `//`)
   - Validate file extension matches expected type (`.webp` for images)
   - Chunk storage deletes in batches of 100 to avoid API limits
7. Return `storageCleanupResult: { deleted: number; failed: string[] }` to the client for non-blocking warning display.

---

## 6. Security Plan

### 6.1 Workspace scoping

Every server action must:
1. Call `ensureDefaultWorkspace()` to resolve the actor's default workspace.
2. Pass `workspace.id` to the RPC as `target_workspace_id`.
3. The RPC must validate `public.is_workspace_member(target_workspace_id)` before any read or write.

### 6.2 Permission model

| Action | Required role |
|--------|--------------|
| Preview project deletion | Any workspace member can preview (read-only) |
| Execute project deletion | Workspace admin or project creator (`projects.created_by = auth.uid()`) |
| Preview estimate deletion | Any project member can preview |
| Execute estimate deletion | Project editor or above, OR estimate sheet owner/admin |
| Preview component archive | Any workspace member can preview |
| Execute component archive | Workspace editor or above |
| Preview component hard delete | Workspace admin only |
| Execute component hard delete | Workspace owner or admin only |

### 6.3 Shared/pending/sheet-only access

Users with `accessKind: "sheet-member"` or `"pending-invite"` must not see destructive actions:
- UI hides bulk-delete toolbar entirely for sheet-only users
- Server actions reject if user lacks `can_edit_project` / `can_edit_estimate` permission
- Server-side authorization is mandatory even if UI hides buttons

### 6.4 RLS policy considerations

- Existing RLS policies are `FOR ALL USING (is_workspace_member(workspace_id))` for most tables.
- SECURITY DEFINER RPCs bypass RLS — this is intentional for cross-table operations, but requires strict search_path locking and actor validation.
- The new RPCs must NOT become privilege escalation paths — they must re-check permissions internally, not rely on the caller's RLS bypass.
- No raw client-provided SQL filters. The client sends explicit selected IDs as UUID arrays.

### 6.5 Batch limits and rate limiting

- Batch caps: 50 projects, 100 estimates, 500 components for beta.
- Rate limiting: Leverage existing `security_rate_limit_events` table for tracking destructive action frequency.
- Server actions should be idempotent — running the same deletion twice should not error on the second attempt (already-deleted IDs return as `not_found`, not as errors).

### 6.6 CSRF / server action considerations

- Next.js server actions include built-in CSRF protection via the `Next-Action` header.
- Destructive actions should use `POST` method (server actions default to POST).
- The `correlation_id` parameter provides request-level idempotency and audit linking.

### 6.7 Audit trail

Every execution RPC must record:
- `actor_user_id` — who performed the action
- `workspace_id` — which workspace
- `correlation_id` — links preview and execution, groups multi-table operations
- Target type (`project`, `estimate`, `library_component`)
- Target IDs
- Summary counts (what was deleted/archived)
- Timestamp

**Decision: Create a `mass_deletion_events` table.** Phase 0 investigation will confirm whether existing audit tables (`estimate_sheet_events`, `collaboration_audit_events`, `account_security_events`) are sufficient or whether a dedicated table is needed.

### 6.8 Existing `deleteProject` security concern

The current `deleteProject(formData)` at `src/lib/projects/actions.ts:124` does NOT call `ensureDefaultWorkspace()` or `requireCurrentUserContext()`. It constructs a Supabase server client and relies on RLS alone. Any authenticated workspace member can delete any project in their workspace, including those they don't own.

**Recommendation:** In Phase 1, refactor `deleteProject` to use the same `ensureDefaultWorkspace()` + permission-check pattern as the new bulk path. This is a security hardening change, not a feature change.

---

## 7. Performance Plan

### 7.1 Compute previews in Postgres

Preview RPCs must compute counts using SQL aggregates (`COUNT(*)`, `COUNT(DISTINCT ...)`), not by fetching rows to the server action. This ensures previews are fast even for projects with thousands of estimate rows.

### 7.2 Set-based execution

Execution RPCs must use set-based operations:
```sql
DELETE FROM project_favorites WHERE project_id = ANY(target_project_ids);
```
Not:
```sql
FOR project_id IN SELECT unnest(target_project_ids) LOOP
  DELETE FROM project_favorites WHERE project_id = project_id;
END LOOP;
```

### 7.3 Index coverage

Verify the following indexes exist in existing migrations before proposing new ones:

| Index | Check in | Status |
|-------|----------|--------|
| `estimates(project_id)` | Core schema (line 123) | **Exists** (`estimates_project_id_idx`) |
| `estimate_nodes(estimate_id)` | Core schema (line 125) | **Exists** (part of `estimate_nodes_estimate_parent_sort_idx`) |
| `estimate_row_items(estimate_id)` | Core schema (line 126) | **Exists** (part of `estimate_row_items_estimate_node_sort_idx`) |
| `estimate_sheet_events(estimate_id)` | Check `20260524033151_estimate_sheet_version_control.sql` | **To verify in Phase 0** |
| `estimate_sheet_versions(estimate_id)` | Check `20260524033151_estimate_sheet_version_control.sql` | **To verify in Phase 0** |
| `project_publications(project_id)` | Check `20260527120000_project_client_publication.sql` | **To verify in Phase 0** |
| `project_publications(workspace_id)` | Not in core, likely missing | **May need new index** |
| `collaboration_invitations(project_id)` | Check `20260526142913_project_sheet_collaboration_access.sql` | **To verify in Phase 0** |
| `collaboration_invitations(estimate_id)` | Check `20260526142913_project_sheet_collaboration_access.sql` | **To verify in Phase 0** |
| `project_favorites(project_id, workspace_id)` | Check `20260526013617_workshop_favorites.sql` | **To verify in Phase 0** |
| `estimate_favorites(estimate_id)` | Check `20260526013617_workshop_favorites.sql` | **To verify in Phase 0** |
| `cost_library_item_price_options(item_id)` | Check `20260524120322_component_library_variants.sql` | **To verify in Phase 0** |
| `cost_library_item_variant_cost_entries(item_id)` | Check `20260524131204_component_variant_assets_cost_entries.sql` | **To verify in Phase 0** |
| `cost_library_item_variant_attachments(item_id)` | Check `20260524131204_component_variant_assets_cost_entries.sql` | **To verify in Phase 0** |
| `estimate_row_items(source_library_item_id)` | Core schema (line 126) | **Not in core** — may need new index |
| `estimate_template_row_items(source_library_item_id)` | Check `20260522091621_component_library_templates.sql` | **To verify in Phase 0** |

### 7.4 N+1 prevention

- Server actions make exactly ONE RPC call per action — never a loop.
- UI fetches preview via a single server action call, not per-item calls.
- TanStack Query mutations use `invalidateQueries` with key patterns, not individual refetches.

### 7.5 UI responsiveness

- Preview modal shows skeleton/loading state while preview RPC runs.
- "Delete" / "Archive" button is disabled until typed confirmation matches and preview loads successfully.
- No optimistic UI for destructive actions — wait for server confirmation before updating lists.
- Toast notification on success/failure.
- `useTransition` for non-urgent state updates.

---

## 8. Audit, Recovery, and Data Governance

### 8.1 Hard delete vs soft delete

**Recommended for beta: Hard delete for projects and estimates, archive for library components.**

| Target | Beta strategy | Rationale |
|--------|--------------|-----------|
| Projects | Hard delete after typed confirmation + audit record | Simplifies implementation; undo deferred |
| Estimate sheets | Hard delete after typed confirmation + audit record | Simplifies implementation; undo deferred |
| Library components | Soft delete via `lifecycle_state = 'archived'` | References exist; hard delete requires reference cleanup |

### 8.2 Soft-delete columns

**Decision: Do NOT introduce `deleted_at` columns for projects/estimates in this release.**

Adding soft-delete columns would require:
- Updating all SELECT queries to filter `WHERE deleted_at IS NULL`
- Updating all TanStack Query hooks
- Updating route handlers
- Testing every list/detail view

This is a schema-wide change with high blast radius. Defer until a broader soft-delete/recovery feature is planned.

### 8.3 Mass deletion events table

**Recommendation: Create `mass_deletion_events` table in Phase 2.**

```sql
CREATE TABLE public.mass_deletion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  correlation_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('project', 'estimate_sheet', 'library_component')),
  target_ids uuid[] NOT NULL,
  target_preview jsonb NOT NULL,
  summary_counts jsonb NOT NULL,
  storage_cleanup_result jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX mass_deletion_events_workspace_created_idx
  ON public.mass_deletion_events(workspace_id, created_at DESC);
CREATE INDEX mass_deletion_events_correlation_idx
  ON public.mass_deletion_events(correlation_id);
```

### 8.4 Existing audit tables

- `estimate_sheet_events` — only tracks estimate-level mutations, not project/library-level. Insufficient for mass deletion audit.
- `collaboration_audit_events` — tracks collaboration changes. Not suitable.
- `account_security_events` — tracks auth/security events. Not suitable.

Existing tables do not cover project-level or library-level audit, so a dedicated `mass_deletion_events` table is appropriate.

### 8.5 Undo and export-before-delete

**Decision: Defer both for beta. Explicitly mark the tradeoff.**

- **Undo:** Without soft-delete columns, undo is not possible after hard delete. The typed confirmation modal is the user's "undo point."
- **Export-before-delete:** Could be added as a pre-deletion option ("Download estimate data before deleting"), but adds complexity. Defer until user feedback confirms the need.

---

## 9. Detailed Implementation Phases

### Phase 0 — Investigation and Schema Confirmation (1 PR)

**Goal:** Verify all FK cascade behaviors, index existence, and RLS policies before writing any deletion logic.

**Tasks:**
1. Inspect all 66 migration files for FK constraints on:
   - `estimate_sheet_events.estimate_id` — does it have ON DELETE CASCADE?
   - `estimate_sheet_versions.estimate_id` — does it have ON DELETE CASCADE?
   - `estimate_favorites.estimate_id` — FK constraint type?
   - `estimate_sheet_members.estimate_id` — FK constraint type?
   - `estimate_sheet_access_settings.estimate_id` — FK constraint type?
   - `collaboration_invitations.project_id` and `estimate_id` — FK constraint type?
   - `collaboration_invitation_tokens.invitation_id` — FK constraint type?
   - `collaboration_audit_events.project_id` and `estimate_id` — FK constraint type?
   - `project_publications.project_id` — FK constraint type?
   - `shared_link_recipients`, `shared_link_comments`, `shared_link_responses`, `shared_link_events` — FK to `project_publications.id`?
   - `project_favorites.project_id` — FK constraint type?
   - `beta_feedback_submissions.project_id` — FK constraint type? (Known: yes, `beta_feedback_submissions_project_id_fkey`)
   - `ai_action_runs`, `ai_tool_calls`, `ai_data_access_events` — any project/estimate FKs?
2. Confirm existing indexes (see Section 7.3 checklist).
3. Verify RLS policies on all dependent tables.
4. Verify storage bucket/path conventions for project images, component images, and variant attachments.
5. Document findings in the migration added in Phase 1.
6. Run `bun run build` to verify no schema-related type issues.

**Validation:**
- `bun run type-check` passes
- Migration inspection report documented in the Phase 1 migration header comment

### Phase 1 — Backend Preview RPCs (1 PR)

**Goal:** Create migration with preview RPCs and TypeScript server action wrappers. No destructive mutations yet.

**Migration files to create:**
- `supabase/migrations/20260603XXXXXX_preview_bulk_delete_projects.sql`
- `supabase/migrations/20260603XXXXXX_preview_bulk_delete_estimates.sql`
- `supabase/migrations/20260603XXXXXX_preview_bulk_archive_library_components.sql`

**Server action additions:**
- `previewBulkDeleteProjects()` in `src/lib/projects/actions.ts`
- `previewBulkDeleteEstimateSheets()` in `src/lib/estimates/actions.ts`
- `previewBulkArchiveLibraryComponents()` in `src/lib/component-library/actions.ts`

**Test additions:**
- `tests/vitest/preview-bulk-delete-projects.test.ts` — preview count accuracy, not-found IDs, forbidden IDs, batch cap enforcement
- `tests/vitest/preview-bulk-delete-estimates.test.ts` — preview count accuracy, cross-project validation
- `tests/vitest/preview-bulk-archive-components.test.ts` — preview count accuracy, linked-row counting

**Also in this phase:**
- Refactor existing `deleteProject()` to use `ensureDefaultWorkspace()` and explicit permission checks.
- Add `can_edit_project` RPC if it doesn't exist, or use `is_workspace_admin` + `created_by` check.

**Validation:**
- `bun run type-check` passes
- `bun run validate` passes (lint, design-system, unit, dom)
- Preview RPC unit tests pass with mock Supabase data

### Phase 2 — Execution RPCs and Server Actions (1 PR)

**Goal:** Create execution RPCs with transactional deletion, audit records, and storage cleanup. Wire server actions to UI (but UI buttons remain disabled until Phases 3-5).

**Migration files to create:**
- `supabase/migrations/20260603XXXXXX_execute_bulk_delete_projects.sql`
- `supabase/migrations/20260603XXXXXX_execute_bulk_delete_estimates.sql`
- `supabase/migrations/20260603XXXXXX_execute_bulk_archive_library_components.sql`
- `supabase/migrations/20260603XXXXXX_mass_deletion_events.sql`

**Server action additions:**
- `executeBulkDeleteProjects()` in `src/lib/projects/actions.ts`
- `executeBulkDeleteEstimateSheets()` and `deleteEstimateSheet()` in `src/lib/estimates/actions.ts`
- `executeBulkArchiveLibraryComponents()` in `src/lib/component-library/actions.ts`

**Storage cleanup:**
- Extend `isProjectImageStoragePath()` to cover component image/attachment path patterns.
- Add `cleanupStoragePaths(bucket, paths)` helper shared across project and library actions.
- Return `storageCleanupResult` from execution actions.

**Revalidation:**
- Projects: `revalidatePath("/workshop/projects")` + any affected project detail paths
- Estimates: `revalidateProjectEstimatePaths(projectId)` + affected node paths
- Library: `revalidateLibraryRoutes()`

**Test additions:**
- `tests/vitest/execute-bulk-delete-projects.test.ts` — transactional rollback, storage cleanup, permission denial, publication blocking
- `tests/vitest/execute-bulk-delete-estimates.test.ts` — publication selected_estimate_ids update, cascade behavior
- `tests/vitest/execute-bulk-archive-components.test.ts` — archive state change, linked-row retention, storage non-deletion

**Validation:**
- `bun run type-check` passes
- `bun run validate` passes
- Execution RPC tests pass

### Phase 3 — Estimate Sheet UI (1 PR)

**Goal:** Wire the existing selection state to the new backend. Enable the disabled Trash icon for single-row delete and add bulk-delete toolbar.

**Files to modify:**
- `src/components/workshop/ProjectEstimatesTable.tsx`:
  - Remove `disabled` from Trash button, wire `onClick` to open preview modal
  - Add bulk toolbar component above table when `selectedEstimateIds.size > 0`
  - Add "Select visible" button
  - Add "Clear selection" button
- `src/components/workshop/ProjectEstimatesClient.tsx`:
  - Add state for preview modal visibility
  - Add state for deletion in-progress
- New file: `src/components/workshop/EstimateDeletePreviewModal.tsx`:
  - Two-phase modal: Phase 1 loads preview (skeleton), Phase 2 shows impact + typed confirmation
  - Uses existing Modal, Button, Badge primitives
  - Typed confirmation: "DELETE ESTIMATE SHEETS"
  - Calls `previewBulkDeleteEstimateSheets` on mount, `executeBulkDeleteEstimateSheets` on confirm
- Post-deletion: route refresh, query invalidation, selection clear

**TanStack Query invalidation:**
```typescript
queryClient.invalidateQueries({ queryKey: estimateQueryKeys.allForProject(projectId) });
```

**Validation:**
- `bun run test:dom` — new React component tests pass
- `bun run lint:design-system` — no design violations
- Manual QA: Select estimates → preview modal loads → typed confirmation required → delete succeeds → table refreshes

### Phase 4 — Projects UI (1 PR)

**Goal:** Add multi-select mode, bulk toolbar, and preview modal to the projects page.

**Files to modify:**
- `src/components/workshop/projects-page-client.tsx`:
  - Add `selectedProjectIds` state
  - Add checkbox to project cards in all view modes (list/small/medium/large)
  - Add bulk toolbar component
  - Add "Select visible", "Clear selection"
  - Filter selection availability by access kind (shared/sheet-only/pending-invite: no checkbox or disabled)
- `src/components/workshop/LiveProjectCard.tsx`:
  - Add `isSelected`, `onToggleSelect`, `canSelect` props
  - Render checkbox when `canSelect` is true
  - Disable checkbox with tooltip for shared/pending/sheet-only projects
- New file: `src/components/workshop/ProjectDeletePreviewModal.tsx`:
  - Same two-phase pattern as estimate modal
  - Typed confirmation: "DELETE PROJECTS" (or project name for single)
  - Shows publication blockers as red warnings
  - "Delete" button disabled when publications are blocking

**Validation:**
- `bun run test:dom` — React component tests for selection, toolbar, modal
- `bun run lint:design-system`
- Manual QA: Select projects → preview shows publication blockers → resolve blockers → delete succeeds → projects disappear

### Phase 5 — Library Component Archive UI (1 PR)

**Goal:** Add selection state, bulk toolbar, and archive modal to the library manager.

**Files to modify:**
- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`:
  - Add `selectedItemIds` state
  - Add checkbox to component catalogue cards
  - Add bulk toolbar above catalogue grid
  - "Archive components" primary action
  - "Clear selection"
- New file: `src/components/workshop/ComponentArchivePreviewModal.tsx`:
  - Two-phase preview modal
  - Shows linked estimate rows count (informational, not blocking)
  - Typed confirmation: "ARCHIVE"
- Library catalogue filtering:
  - Exclude `lifecycle_state = 'archived'` from default component queries in estimator sidebar
  - Ensure "All Components" folder filter excludes archived items by default
- Archived state indicator:
  - If a component is used in an estimate row and is now archived, show subtle "(archived)" badge in row inspector

**Validation:**
- `bun run test:dom` — React component tests
- `bun run lint:design-system`
- Manual QA: Select components → preview → archive → components disappear → estimate rows retain data

### Phase 6 — Optional Hard-Delete Unreferenced Components (1 PR)

**Goal:** Add hard-delete path for components with zero references. Gated behind admin/owner role.

**Files to modify:**
- `src/lib/component-library/actions.ts`:
  - Add `previewHardDeleteLibraryComponents()` and `executeHardDeleteLibraryComponents()`
- `supabase/migrations/20260603XXXXXX_preview_hard_delete_library_components.sql`
- `supabase/migrations/20260603XXXXXX_execute_hard_delete_library_components.sql`
- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`:
  - Add "Hard delete" as secondary action in bulk toolbar (visible only when preview shows zero references)
- New file: `src/components/workshop/ComponentHardDeletePreviewModal.tsx`:
  - Stricter than archive modal
  - Typed confirmation: "DELETE COMPONENTS"
  - Storage cleanup warning
  - Only visible to admin/owner

**This phase is OPTIONAL for beta.** Ship only if reference handling and storage cleanup are proven safe.

### Phase 7 — QA, Performance, and Polish (1 PR)

**Goal:** End-to-end testing, validation gate pass, performance verification, and accessibility polish.

**Tasks:**
1. Run full validation gate:
   ```bash
   bun run validate && bun run build && bun run test:e2e
   ```
2. Add Playwright E2E tests (gated behind `ARCHESTIMATOR_E2E_DESTRUCTIVE=1`):
   - Create fixture project, estimates, components
   - Bulk delete estimate sheets → verify table refreshes
   - Bulk delete projects → verify project list updates
   - Bulk archive components → verify catalogue updates
3. Test with large fixtures:
   - Project with 100+ estimate sheets
   - Estimate with 500+ row items
   - Library with 200+ components
4. Performance verification:
   - Preview RPC response time < 200ms for 50-project batch
   - Execution RPC response time < 2s for 50-project batch
5. Accessibility audit:
   - Keyboard navigation for selection, toolbar, and modal
   - Focus trap in preview modal
   - Screen reader announcements for selection count changes
   - `aria-label` on all new interactive elements
6. Polish:
   - Smooth selection transitions
   - Toast notifications for success/failure
   - Error state handling in preview modal

**Validation:**
- All validation gates pass
- All E2E tests pass
- Performance metrics within targets

---

## 10. Testing Plan

### 10.1 Unit Tests (Vitest + jsdom)

**Validation helpers (Phase 0):**
| Test file | Scenarios |
|-----------|-----------|
| `tests/vitest/bulk-delete-validation.test.ts` | Empty IDs rejected, duplicate IDs deduped, invalid/non-UUID IDs rejected, max batch size (50/100/500) enforced, mixed valid+invalid IDs handled |

**Server action tests (Phases 1-2):**
| Test file | Scenarios |
|-----------|-----------|
| `tests/vitest/preview-bulk-delete-projects.test.ts` | Permission denied (non-admin), cross-workspace IDs returned as not-found, valid preview counts match DB state, publication blockers surfaced |
| `tests/vitest/preview-bulk-delete-estimates.test.ts` | Cross-project IDs rejected, valid preview counts, publication impact counts, not-found/forbidden separation |
| `tests/vitest/preview-bulk-archive-components.test.ts` | Archive preview counts, linked estimate row counting, linked template row counting |
| `tests/vitest/execute-bulk-delete-projects.test.ts` | Transactional rollback on FK violation, storage cleanup called with correct paths, permission denied (non-admin), publication blocking enforcement |
| `tests/vitest/execute-bulk-delete-estimates.test.ts` | Publication selected_estimate_ids updated, cascade deletes nodes/rows/events, route revalidation called |
| `tests/vitest/execute-bulk-archive-components.test.ts` | Lifecycle state changed to archived, state history recorded, linked rows NOT deleted, storage NOT cleaned up |

**SQL/RPC tests (Phases 1-2):**
| Test file | Scenarios |
|-----------|-----------|
| `tests/vitest/rpc-preview-bulk-delete.test.ts` | Preview count accuracy for complex hierarchies, edge case: empty projects, edge case: projects with only deleted estimates |
| `tests/vitest/rpc-execute-bulk-delete.test.ts` | Transactional rollback on partial failure, advisory lock prevents concurrent deletes, active publication blocking |
| `tests/vitest/rpc-archive-components.test.ts` | Archive with linked estimate rows succeeds, hard delete with active references blocked, hard delete with zero references succeeds |

### 10.2 React/Vitest DOM Tests (Phases 3-5)

| Test file | Scenarios |
|-----------|-----------|
| `tests/vitest/bulk-delete-project-ui.test.tsx` | Bulk toolbar appears when 1+ selected, disappears when 0 selected, "Select visible" selects all filtered, "Clear selection" deselects all, shared project checkbox disabled, publication blocker shown in preview, typed confirmation gates delete button, delete button disabled while preview loading, selection clears after successful delete |
| `tests/vitest/bulk-delete-estimate-ui.test.tsx` | Bulk toolbar appears when selectedEstimateIds has items, single delete opens preview, typed confirmation required, post-delete invalidates queries |
| `tests/vitest/bulk-archive-component-ui.test.tsx` | Bulk toolbar for archive, archive modal shows linked-row count, typed confirmation "ARCHIVE", hard-delete hidden for non-admin, hard-delete shown for admin with zero-referenced components |

### 10.3 Playwright E2E (Phase 7)

| Spec file | Scenarios |
|-----------|-----------|
| `e2e/destructive-bulk-delete-estimates.spec.ts` | Create project + 3 estimates → select all → preview → type confirmation → delete → verify estimates list empty → verify no broken routes |
| `e2e/destructive-bulk-delete-projects.spec.ts` | Create 2 projects with estimates → select both → preview → type "DELETE PROJECTS" → delete → verify project list updated → verify old routes redirect |
| `e2e/destructive-bulk-archive-components.spec.ts` | Create 3 library components → insert 1 into estimate → select all 3 → archive → verify 2 disappear from catalogue (1 used stays visible? or all archived) → verify estimate row still shows component data |

All destructive E2E tests gated behind `ARCHESTIMATOR_E2E_DESTRUCTIVE=1`.

### 10.4 Validation Commands

```bash
bun run type-check    # TypeScript compilation
bun run lint          # ESLint (must remain at existing 14 warnings, 0 errors)
bun run lint:design-system  # Design system enforcement
bun run test          # Bun unit tests
bun run test:dom      # Vitest DOM tests
bun run build         # Next.js production build
```

---

## 11. UX Acceptance Criteria

- [ ] User can select multiple projects via checkboxes and delete after preview + typed confirmation ("DELETE PROJECTS").
- [ ] User can select multiple estimate sheets via checkboxes and delete after preview + typed confirmation ("DELETE ESTIMATE SHEETS").
- [ ] User can select multiple library components and archive after preview + typed confirmation ("ARCHIVE").
- [ ] The UI never shows destructive action buttons to users who cannot execute them (sheet-only, viewer, pending-invite).
- [ ] Preview counts in the confirmation modal match actual execution summary counts.
- [ ] Deleted projects disappear from `/workshop/projects` after refresh.
- [ ] Deleted estimate sheets disappear from the project estimates table after refresh.
- [ ] If the user deletes the currently open estimate sheet, they are redirected to the estimate list.
- [ ] Archived components no longer appear in default insertion flows (estimator sidebar, library catalogue default view).
- [ ] Existing estimate rows using archived components remain readable and retain their data.
- [ ] Storage cleanup failures do not corrupt database state (non-blocking warning shown).
- [ ] All destructive actions are recorded in `mass_deletion_events`.
- [ ] All validation gates pass (`bun run validate`, `bun run build`).

---

## 12. Risks and Open Questions

### 12.1 Product decisions needed before Phase 2

| Question | Options | Recommended for beta |
|----------|---------|---------------------|
| Should project deletion auto-revoke or block on active publications? | Block with tooltip | **Block** — safest; avoids data inconsistency |
| Should estimate deletion be blocked if in an active publication? | Remove from `selected_estimate_ids` | **Remove from array** — less friction, preview makes impact clear |
| Should project/estimate deletion be hard delete or soft delete? | Hard delete, soft delete with `deleted_at` | **Hard delete** — simpler; undo deferred |
| Is undo/export-before-delete required for beta? | Yes/No | **No** — defer; typed confirmation is the safety net |
| What exact role can delete projects? | Owner only / admin+ / editor+ | **Workspace admin + project creator** |
| What exact role can delete estimates? | Owner / admin / editor | **Project editor + estimate owner/admin** |
| What exact role can archive components? | Owner / admin / editor | **Workspace editor+** |
| What exact role can hard-delete components? | Owner only / admin+ | **Workspace owner/admin only** (Phase 6) |

### 12.2 Technical risks

1. **FK cascade gaps:** Some tables may not have ON DELETE CASCADE where expected. Phase 0 investigation will surface these. Mitigation: explicit DELETE statements in RPC for any table without cascading FK.

2. **RLS policy interference:** SECURITY DEFINER RPCs bypass RLS. If an RPC has a bug that allows cross-workspace access, RLS won't catch it. Mitigation: explicit `workspace_id` checks in every RPC, not relying on RLS alone.

3. **Large batch performance:** Deleting 50 projects with thousands of estimate rows each could timeout. Mitigation: set-based SQL (not loops), proper indexes, and batch caps (50/100/500). Monitor via RPC execution time.

4. **Storage cleanup race condition:** If storage cleanup fails after DB commit, storage files remain orphaned. Mitigation: return cleanup result, log failures, surface warning. Consider a future garbage-collection job.

5. **Concurrent modification:** Two users deleting the same project simultaneously. Mitigation: advisory lock on target IDs at the start of execution RPCs.

### 12.3 Open design questions

1. **Should bulk selection support "all matching search"?** The UI currently only supports visible selection via checkboxes. "Select all" across search/filter would require server-side ID resolution. **Defer for now.**

2. **Should archived library components be visible in a filter/tab?** Yes, but in a future iteration. Phase 5 only hides them from default views.

3. **Should "Select all matching search" be supported for library components?** Same as projects — defer.

4. **What is the maximum batch size for beta?** Proposed: 50 projects, 100 estimates, 500 components. These numbers should be validated against real-world usage in beta.

5. **Should hard-delete library components exist at all in this release?** **No — defer to Phase 6 (optional).** Ship archive as the default action in Phase 5. Hard delete is gated behind admin role + zero-references proof + separate confirmation.

---

## 13. Final Recommendation

### Implementation order

1. **Estimate sheet bulk delete first** (Phase 3 after Phases 0-2). The table already has `selectedEstimateIds` state and a disabled Trash icon. This is the lowest-friction starting point and validates the preview → confirm → execute → revalidate pattern end-to-end.

2. **Library component bulk archive second** (Phase 5). Archives are non-destructive and align with the existing lifecycle state model. This is safer to ship than hard delete and provides immediate value for library organization.

3. **Project bulk delete third** (Phase 4). This has the widest dependency surface (estimates, publications, collaboration, storage, audit), so it benefits from patterns proven in phases 3 and 5.

4. **Do not ship hard-delete library components** until reference handling, storage cleanup, and the preview-blocking mechanism are proven safe through the archive workflow (Phase 6 is optional for beta).

### Why this order works

- Phase 3 (estimates) validates the core preview → confirm → execute → revalidate pattern.
- Phase 5 (library archive) validates the non-destructive bulk action pattern.
- Phase 4 (projects) applies both patterns to the widest dependency surface.
- Phase 6 (hard delete) is gated behind the learnings from all previous phases.

### Non-negotiable constraints

- Every destructive action must have a preview modal with typed confirmation.
- Every execution must be audited in `mass_deletion_events`.
- Server-side authorization is mandatory — UI gating is not sufficient.
- The existing `deleteProject` must be hardened to match the new bulk-delete security pattern.
- Library component deletion defaults to BULK ARCHIVE, never hard delete.

---

*End of plan. This document should be sufficient for a separate implementation agent to execute the work in phases without rediscovering the codebase. Phase 0 investigation and schema confirmation must be completed before any execution RPCs are written.*
