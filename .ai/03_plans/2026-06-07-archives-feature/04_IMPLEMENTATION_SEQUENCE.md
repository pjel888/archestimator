# Implementation Sequence: Project Archives Feature

This document outlines the step-by-step implementation order for the Project Archives feature in Archestimator.

## Phase 1 — Baseline, Graph Impact & Tests-First Scaffolding

**Goal:** Establish the baseline and ensure the feature is driven by failing tests.

- **Tasks:**
  - Run GitNexus/code-review-graph impact analysis on all symbols that will change.
  - Write failing tests for archive/restore before any implementation.
  - Tests must cover:
    - Active list excludes archived projects.
    - Archived view shows only archived projects.
    - Project counts are correct for both views.
    - Archive operation requires appropriate role.
    - Restore operation requires appropriate role.
    - RLS prevents unauthorized archive/restore.
- **Files Involved:**
  - `e2e/archives.spec.ts` (New)
  - `tests/unit/lib/repositories/workspace-repository.test.ts` (New)
- **Expected Changes:** New test files and test cases added to existing suites.
- **Validation Commands:** `bun run test:e2e e2e/archives.spec.ts` (Expected to fail).
- **Rollback Point:** Delete new test files.
- **Dependencies:** None.

## Phase 2 — Database Schema/RPC/RLS for Project Archive State

**Goal:** Implement the persistence layer for project archiving.

- **Tasks:**
  - Additive migration: `ALTER TABLE projects ADD COLUMN archived_at TIMESTAMPTZ, ADD COLUMN archived_by UUID`.
  - Create partial indexes:
    - `CREATE INDEX idx_projects_active ON projects (workspace_id, updated_at DESC) WHERE archived_at IS NULL`
    - `CREATE INDEX idx_projects_archived ON projects (workspace_id, updated_at DESC) WHERE archived_at IS NOT NULL`
  - Create RPCs following the `mass_deletion_governance.sql` pattern:
    - `preview_bulk_archive_projects`
    - `execute_bulk_archive_projects`
    - `preview_bulk_restore_projects`
    - `execute_bulk_restore_projects`
  - **Archive Preview:** Check `can_edit_project` for each target; return eligible/not_found/forbidden/blocked + `previewHash`.
  - **Archive Execute:** Validate `previewHash`, set `archived_at = now()`, `archived_by = auth.uid()`.
  - **Restore Preview:** Check `can_edit_project`; return only currently-archived projects as eligible.
  - **Restore Execute:** Validate `previewHash`, set `archived_at = NULL`, `archived_by = NULL`.
  - **RLS:** Verify existing policies cover SELECT/UPDATE via `can_edit_project`.
- **Stop Gate:** STOP before any schema/provider mutation. STOP if linked Supabase migration proof fails.
- **Files Involved:**
- **Migration naming:** `YYYYMMDDHHMMSS_project_archive_state.sql` (follows existing convention)
  - `src/lib/supabase/types.ts`
- **Expected Changes:** New migration file, updated TypeScript types.
- **Validation Commands:** `npx supabase db lint`, `npx supabase gen types typescript --local > src/lib/supabase/types.ts` (then manual patches).
- **Rollback Point:** `npx supabase db reset` or manual `DROP COLUMN` / `DROP FUNCTION`.
- **Dependencies:** Phase 1.

## Phase 3 — Server Actions/Repository Filters

**Goal:** Connect the database layer to the application logic.

- **Tasks:**
  - Add archive/restore functions to `src/lib/projects/actions.ts` following the preview/execute pattern.
  - Add archive confirmation helper to `src/lib/mass-deletion/bulk-action.ts` (simple confirm button label: "Archive" — NOT typed phrase, since archive is non-destructive). Typed confirmation is reserved for destructive delete only.
  - Update `src/lib/repositories/workspace-repository.ts`:
    - `listCurrentWorkspaceProjects`: Add `includeArchived` parameter (default `false`); add `WHERE archived_at IS NULL` when false.
    - `getWorkshopHomebaseData`: Filter recent projects to active only.
- **Files Involved:**
  - `src/lib/projects/actions.ts`
  - `src/lib/mass-deletion/bulk-action.ts`
  - `src/lib/repositories/workspace-repository.ts`
- **Expected Changes:** New server actions, updated repository methods, new constants.
- **Validation Commands:** `bun run test tests/unit/lib/repositories/workspace-repository.test.ts`.
- **Rollback Point:** Revert changes to the three files.
- **Dependencies:** Phase 2.

## Phase 4 — Project List Archive UI and Restore Flow

**Goal:** Provide user interface for managing archived projects.

- **Tasks:**
  - Add "Archived" tab to `projects-page-client.tsx` alongside existing "Your Projects"/"Projects shared to you" tabs (following `WorkshopCollectionLayout` pattern).
  - Add archive action to `LiveProjectCard`.
  - Add archive action to `BulkActionToolbar` (non-destructive styling).
  - Add `BulkArchivePreviewModal` or extend `BulkDestructivePreviewModal` with non-destructive copy.
  - Add restore action in Archived view (restore button on archived project cards).
  - Add empty states for Archived tab ("No archived projects").
  - Add status messages via `ToastProvider` for archive/restore success/failure.
- **Files Involved:**
  - `src/components/workshop/projects-page-client.tsx`
  - `src/components/workshop/LiveProjectCard.tsx`
  - `src/components/workshop/ProjectDetailsModal.tsx`
  - `src/components/workshop/BulkActionToolbar.tsx`
  - `src/components/workshop/BulkArchivePreviewModal.tsx` (New or modified)
- **Expected Changes:** New UI components, updated project list page, new modals.
- **Validation Commands:** `bun run lint:design-system`, manual UI verification.
- **Rollback Point:** Revert UI component changes.
- **Dependencies:** Phase 3.

## Phase 5 — Route/Homebase/Favorites/Collaboration Semantics

**Goal:** Ensure archiving is respected across the entire application.

- **Tasks:**
  - Add archived-project guard to project route pages (redirect to `/workshop/projects` with notice).
  - Add archived guard to estimate routes and chart route (`src/app/workshop/projects/[projectId]/charts/page.tsx`).
  - Add archive-state checks to API surfaces: XLSX export route, AI ask/package-builder context reads, project image serving (see blast radius analysis for full list).
  - Update homebase: Exclude archived projects from recent/favorites.
  - Update favorites: Hide archived project favorites; ensure they re-appear on restore.
  - Update collaboration: Preserve pending invites for archived projects; hide archived from shared lists; block invite acceptance (`src/app/invite/[token]/page.tsx`, `src/lib/collaboration/pending-invite-actions.ts`) while project is archived.
- **Files Involved:**
  - `src/app/workshop/projects/[projectId]/page.tsx`
  - `src/app/workshop/projects/[projectId]/layout.tsx`
  - `src/app/workshop/projects/[projectId]/estimates/page.tsx`
  - `src/app/workshop/projects/[projectId]/charts/page.tsx`
  - `src/app/invite/[token]/page.tsx`
  - `src/lib/collaboration/pending-invite-actions.ts`
  - `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts`
  - `src/lib/ai/read-context.ts`
  - `src/lib/repositories/workspace-repository.ts`
- **Expected Changes:** Route guards, updated repository logic for favorites and homebase.
- **Validation Commands:** `bun run test:e2e`.
- **Rollback Point:** Revert route and repository changes.
- **Dependencies:** Phase 4.

## Phase 6 — Publication/Shared-Link Behavior

**Goal:** Handle public access to archived projects.

- **Tasks:**
  - Update publication resolution: Return "project archived" state for archived project publications.
  - Pause (do not revoke) active shared links for archived projects.
- **Files Involved:**
  - `src/lib/publication/public-repository.ts` (publication resolution)
  - `src/lib/publication/security.ts` (token/password handling)
  - `src/app/share/[token]/page.tsx` (shared-link receiver page)
- **Expected Changes:** Updated publication logic and public view state.
- **Validation Commands:** `bun run test:e2e e2e/archives.spec.ts`.
- **Rollback Point:** Revert publication logic changes.
- **Dependencies:** Phase 5.

## Phase 7 — Tests, Validation, Docs, Release Notes

**Goal:** Finalize the feature and ensure quality.

- **Tasks:**
  - Full `bun run validate` (type-check + lint + design-system + unit + dom).
  - `bun run build`.
  - `bun run lint:design-system`.
  - `bun run test:e2e`.
  - Update `.ai` docs (`current-state.md`, `decisions.md`).
  - Create release notes.
- **Files Involved:**
  - `.ai/10_state/current-state.md`
  - `.ai/10_state/decisions.md`
  - `RELEASE_NOTES.md`
- **Expected Changes:** Updated documentation and final validation.
- **Validation Commands:** All validation suites passing.
- **Rollback Point:** N/A.
- **Dependencies:** Phase 6.
