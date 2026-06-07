# Architecture and Design Plan: Archestimator Archives

This document details the technical implementation plan for the project archiving feature.

## Proposed Architecture

The Archives feature follows the existing "preview-execute" pattern established by the mass deletion system. It uses an additive schema approach to track project state without introducing complex lifecycle machines.

### Core Components
- **Database Schema**: Additive columns on the `projects` table.
- **Server Logic**: New RPCs for bulk preview and execution of archive/restore actions.
- **Application Layer**: Server actions to bridge the UI and database.
- **UI Layer**: Tabbed project list with state-aware filtering and action affordances.
- **Security Guards**: Route-level redirects to block access to archived projects.

## Why This Approach Fits

Archestimator already uses a robust `preview -> execute -> audit` pattern for destructive actions like mass deletion. Archiving is conceptually similar but reversible. Reusing this pattern ensures:
- Consistent user experience for bulk operations.
- Built-in safety checks (dependency analysis) before state changes.
- Auditability of state transitions.
- Minimal architectural drift.

## Data Model

### Schema Changes
Add the following columns to the `projects` table:
- `archived_at`: `TIMESTAMPTZ NULL` (Default: NULL)
- `archived_by`: `UUID NULL` (References `auth.users`)

A project is considered "archived" if `archived_at` is not null.

### New RPC Functions
- `preview_bulk_archive_projects(target_project_ids: uuid[])`: Returns a summary of projects eligible for archiving.
- `execute_bulk_archive_projects(target_project_ids: uuid[], expected_preview_hash: text)`: Sets `archived_at` and `archived_by`.
- `preview_bulk_restore_projects(target_project_ids: uuid[])`: Returns a summary of projects eligible for restoration.
- `execute_bulk_restore_projects(target_project_ids: uuid[], expected_preview_hash: text)`: Sets `archived_at` and `archived_by` to NULL.

### RLS and Filtering
- **RLS**: Existing `can_access_project` and `can_edit_project` policies remain unchanged. RLS ensures data security, while the application layer handles the "archived" experience.
- **Filtering**: Repository methods will be updated to filter out archived projects by default unless explicitly requested (e.g., for the Archived tab).

## Files to Change

### Database and Types
- `supabase/migrations/`: New migration for columns and RPCs.
- `src/lib/supabase/types.ts`: Update generated types and add manual patches for new RPCs.

### Logic and Repositories
- `src/lib/projects/actions.ts`: Add `previewBulkArchiveProjects`, `executeBulkArchiveProjects`, `previewBulkRestoreProjects`, `executeBulkRestoreProjects` (following existing preview→execute naming convention from mass deletion).
- `src/lib/mass-deletion/bulk-action.ts`: Add "archive" and "restore" action types. Simple confirm button (NOT typed phrase — archive is non-destructive).
- `src/lib/repositories/workspace-repository.ts`: Update `listCurrentWorkspaceProjects` and `getWorkshopHomebaseData` to include `archived_at IS NULL` filters.

### UI Components
- `src/components/workshop/projects-page-client.tsx`: Add "Archived" tab alongside existing "Your Projects"/"Projects shared to you" tabs. Implement archive/restore action handlers.
- `src/components/workshop/LiveProjectCard.tsx`: Add archive/restore action to the card menu.
- `src/components/workshop/ProjectDetailsModal.tsx`: Add archive action affordance.
- `src/components/workshop/BulkActionToolbar.tsx`: Add archive/restore buttons to the selection bar.

### Route Guards
- `src/app/workshop/projects/[projectId]/layout.tsx`: Add a guard that redirects to `/workshop/projects` if the project is archived.
- `src/app/workshop/projects/[projectId]/page.tsx`: Ensure the dashboard respects the archived state.
- `src/app/workshop/projects/[projectId]/estimates/page.tsx`: Block access to estimates for archived projects.
- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`: Block estimate sheet editing for archived projects.
- `src/app/workshop/projects/[projectId]/charts/page.tsx`: Block chart access for archived projects.

## New Files

- `src/components/workshop/BulkArchivePreviewModal.tsx`: A specialized version of `BulkDestructivePreviewModal` for archiving (non-destructive, different confirmation requirements).

## Data Flow

### Archive Flow
1. **Selection**: User selects projects in a default (non-Archived) tab.
2. **Preview**: UI calls `preview_bulk_archive_projects`.
3. **Confirmation**: User confirms the action in the preview modal.
4. **Execution**: UI calls `execute_bulk_archive_projects`.
5. **Refresh**: Server action completes, and `router.refresh()` updates the UI.

### Restore Flow
1. **Selection**: User selects projects in the "Archived" tab.
2. **Preview**: UI calls `preview_bulk_restore_projects`.
3. **Execution**: UI calls `execute_bulk_restore_projects`.
4. **Refresh**: Server action completes, and `router.refresh()` updates the UI.

## Reuse Opportunities

- **BulkDestructivePreviewModal**: Use as a template for the archive preview modal.
- **WorkshopCollectionLayout**: Use the `toolbarPanel` slot for the archived/non-archived tab selector.
- **BulkActionToolbar**: Extend to support archive/restore actions based on the active tab.

## Alternatives Rejected

- **Hard Delete as Archive**: Rejected because archiving must be reversible and non-destructive.
- **Client-only Filtering**: Rejected because it is not secure and doesn't allow for server-side access blocking (redirects).
- **Full Lifecycle State Machine**: Rejected as overengineered for V1. A simple boolean-like state is sufficient.
- **Global Archive System**: Rejected to keep V1 scope focused on projects and minimize risk to other entities.

## Backward Compatibility

- **Additive Schema**: Adding nullable columns ensures existing queries and data remain functional.
- **Default State**: All existing projects will have `archived_at = NULL`, making them visible in default (non-Archived) tabs by default.

## Migration Implications

- **Index**: Add a partial index on `projects(workspace_id)` where `archived_at IS NULL` to optimize the most common query path.
- **Types**: Manual type patches for RPCs are required until the next full type generation.

## Next.js / App Router Integration

- **Mutations**: Use `router.refresh()` after successful archive/restore actions to trigger a re-fetch of the project list.
- **Guards**: Use the project layout to centralize the archived-state check and redirect logic.
