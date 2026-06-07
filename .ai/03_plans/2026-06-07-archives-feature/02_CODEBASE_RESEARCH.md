# Codebase Research — Archives Feature

**Date:** 2026-06-07
**Plan:** `.ai/03_plans/2026-06-07-archives-feature/`

## Files/Folders Inspected

### Required Reading (Completed)
- `AGENTS.md` — agent entry point, stack baseline, GitNexus/code-review-graph usage rules
- `.ai/README.md` — .ai folder purpose and navigation
- `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md` — canonical source map
- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` — safety/work rules, UI implementation contract
- `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md` — recovery loop protocol
- `.ai/00_system/VALIDATION_MATRIX.md` — validation commands and evidence expectations
- `.ai/10_state/current-state.md` — current project status (through 2026-06-06)
- `.ai/10_state/decisions.md` — durable decisions (through 2026-06-06)
- `.ai/10_state/known-issues.md` — risks and unresolved decisions
- `.ai/01_roadmap/README.md` — roadmap, launch status, product baseline
- `DESIGN.md` — design system constraints (SF Pro, 12px max, xs-only radius, etc.)
- `README.md` — project structure, stack, commands, architecture
- `package.json` — stack verification (Next.js 16, React 19, Bun, etc.)

### Archive/Lifecycle Pattern Research
- `src/lib/supabase/types.ts` — generated DB types + RPC signatures
- `src/lib/mass-deletion/bulk-action.ts` — bulk-action type definitions (`archivedIds`, confirmation phrases)
- `src/lib/component-library/actions.ts` — `set_cost_library_component_lifecycle_state`, `preview_bulk_archive_library_components`, `execute_bulk_archive_library_components`
- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` — archive UI for library components
- `src/lib/repositories/component-library-repository.ts` — read path excludes `lifecycle_state = 'archived'`
- `src/lib/notifications/repository.ts` — `archived_at` soft-archive on notification deliveries
- `src/lib/ai/package-builder/apply.ts` — rejects archived/discontinued library items
- `src/lib/ai/package-builder/read-tools.ts` — search excludes archived items
- `src/lib/ai/read-context.ts` — ask/read-context excludes archived items

### Supabase/Migration Research
- `supabase/migrations/20260518090000_archestimator_core_schema.sql` — `projects` table, base RLS
- `supabase/migrations/20260518100000_auth_profiles_ceo_access.sql` — platform-admin override
- `supabase/migrations/20260519001000_remove_project_status.sql` — removed `projects.status` column
- `supabase/migrations/20260526142913_project_sheet_collaboration_access.sql` — project access RLS + access RPCs
- `supabase/migrations/20260523120957_component_library_item_versioning.sql` — `component_lifecycle_state` enum, lifecycle columns, `set_cost_library_component_lifecycle_state`
- `supabase/migrations/20260603160000_mass_deletion_governance.sql` — `preview_bulk_archive_library_components`, `execute_bulk_archive_library_components`, project/estimate delete RPCs
- `supabase/migrations/20260603191903_harden_mass_deletion_actor_derivation.sql` — hardened bulk archive execute
- `supabase/migrations/20260606090000_notification_system.sql` — `archived_at` on `notification_deliveries`
- `supabase/migrations/20260524131204_component_variant_assets_cost_entries.sql` — `deleted_at` soft-delete on variant cost entries

### Project Deletion Flow Research
- `src/lib/projects/actions.ts` — `previewBulkDeleteProjects`, `executeBulkDeleteProjects`, `deleteProject` wrapper
- `src/lib/mass-deletion/storage-cleanup.ts` — storage cleanup after project deletion
- `src/lib/workshop/actions.ts` — `setProjectFavorite`, `setEstimateFavorite` only; no archive/delete
- `src/lib/repositories/workspace-repository.ts` — `listCurrentWorkspaceProjects`, `getWorkshopHomebaseData`

### Project List UI Research
- `src/app/workshop/projects/page.tsx` — server wrapper for projects page
- `src/components/workshop/projects-page-client.tsx` — tabs, search, view modes, selection, bulk delete
- `src/components/workshop/WorkshopHomebaseClient.tsx` — homebase banners, pending invites, removed-favorite handling
- `src/components/workshop/WorkshopCollectionLayout.tsx` — shared search + toolbar shell
- `src/components/workshop/BulkActionToolbar.tsx` — bulk selection/action bar UI
- `src/components/workshop/BulkDestructivePreviewModal.tsx` — typed-confirm destructive preview modal
- `src/components/workshop/LiveProjectCard.tsx` — project card actions, selection, favorites
- `src/components/workshop/ProjectDetailsModal.tsx` — project details editor + delete entry point

### Route/Auth Research
- `src/app/workshop/page.tsx` — homebase server component
- `src/app/workshop/projects/[projectId]/layout.tsx` — project shell with context loaders
- `src/app/workshop/projects/[projectId]/page.tsx` — direct project dashboard route
- `src/app/workshop/projects/[projectId]/estimates/page.tsx` — estimate list route
- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx` — estimate sheet/editor route
- `src/proxy.ts` — middleware/proxy route protection
- `src/lib/auth/session.ts` — current-user auth gate
- `src/lib/auth/closed-beta-access.ts` — closed-beta allow/deny
- `src/lib/auth/account-membership.ts` — default-workspace resolution
- `src/lib/collaboration/actions.ts` — project/sheet access checks, invite management
- `src/lib/collaboration/pending-invite.ts` — signed pending-invite bridge cookie
- `src/lib/publication/security.ts` — shared-link security
- `src/lib/publication/public-repository.ts` — publication resolution

### Test Research
- 115 Vitest/DOM test files under `tests/vitest/`
- 14 Playwright E2E specs under `e2e/`
- 3 Bun unit tests under `tests/unit/`
- Key archive-adjacent tests: `mass-deletion-action-contract.test.ts`, `mass-deletion-ui-contract.test.ts`, `bulk-action-validation.test.ts`
- Key project tests: `projects-page-access-tabs.test.tsx`, `project-dashboard-ui.test.ts`, `project-creation-ui.test.ts`

## Commands Run (Planning Phase)

```bash
# Repo safety checks
git rev-parse --show-toplevel
git status --short --branch
git branch --show-current
git worktree list
git remote -v
git fetch --prune origin
git log --oneline -5

# Codebase research (via background agents)
# Search terms: archive, archived, archived_at, archived_by, archivedIds, lifecycle_state,
#   preview_bulk_archive, execute_bulk_archive, preview_bulk_delete_projects,
#   execute_bulk_delete_projects, BulkActionToolbar, BulkDestructivePreviewModal, etc.
```

## GitNexus/Code-Review-Graph Tools

**GitNexus:** Available — indexed as `archestimator` (~13,457 symbols, ~24,277 relationships, 300 execution flows). Not used during planning (docs-only, no code changes). Future implementation MUST run impact analysis before source edits.

**Code-Review-Graph:** Available — code-review-graph MCP tools accessible. Used for architecture overview and semantic searches during research. Not used for change detection (no code changes in planning phase).

## Existing Patterns to Follow

### Project Deletion Pattern (Preview → Execute → Cleanup)
```
previewBulkDeleteProjects(ids) → returns { ok, previewHash, issues[] }
  ↓ (user confirms with typed phrase)
executeBulkDeleteProjects(ids, expectedPreviewHash) → returns { ok, deletedIds[], issues[] }
  ↓
storage cleanup (project images)
  ↓
cleanup audit (service-role RPC)
```

### Bulk Action Types (from `src/lib/mass-deletion/bulk-action.ts`)
- `targetType: 'project' | 'estimate_sheet' | 'library_component'`
- Execution result includes `deletedIds?: string[]` or `archivedIds?: string[]`
- Issue codes: `empty_selection`, `invalid_id`, `batch_limit_exceeded`, `not_found`, `forbidden`, `blocked`, `stale_preview`, `rpc_error`, `storage_cleanup_failed`
- Confirmation phrases: `DELETE PROJECT`, `DELETE 3 PROJECTS`; archive variant exists: `ARCHIVE ...`

### Migration Conventions
- Filename format: `YYYYMMDDHHMMSS_slug.sql`
- Incremental/additive: `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`
- Safety pattern: `BEGIN; ... COMMIT;` wrapping
- Policy pattern: `DROP POLICY IF EXISTS ... ON ...; CREATE POLICY ... ON ...`

### Supabase Types Pattern
- Generated types in `src/lib/supabase/types.ts`
- RPC return types are `jsonb` (typed at the application layer)
- Manual type patches needed when generated types miss functions

## Existing Archive/Lifecycle Precedents

### Component Library Lifecycle (`cost_library_items`)
```
Columns:
  lifecycle_state: component_lifecycle_state (enum: draft|in_review|available|discontinued|archived)
  lifecycle_state_changed_at: timestamptz
  lifecycle_state_changed_by: uuid

RPCs:
  set_cost_library_component_lifecycle_state(workspace_id, item_id, next_state, ...)
  preview_bulk_archive_library_components(workspace_id, item_ids[])
  execute_bulk_archive_library_components(workspace_id, item_ids[], expected_preview_hash, ...)
```

**This is existing precedence, not reusable code for projects.** The component library uses a full lifecycle state machine with history table. Projects need a simpler boolean archive state.

### Notification Soft-Archive (`notification_deliveries`)
```
Column: archived_at timestamptz (nullable)
Read path: WHERE archived_at IS NULL
```
This is the simpler precedent that projects should follow.

## Existing Project Deletion Flow

1. **Preview:** `preview_bulk_delete_projects(target_project_ids)` returns eligibility per ID + `previewHash`
2. **Confirmation:** User types exact phrase (`DELETE PROJECT` or `DELETE N PROJECTS`) in modal
3. **Execute:** `execute_bulk_delete_projects(target_project_ids, expected_preview_hash)` — re-runs preview server-side, validates hash, hard-deletes rows
4. **Cleanup:** Removes project images from storage, records audit event
5. **Blocks:** Active published shared links block deletion

**Key finding:** Project deletion is a hard delete. There is NO archived/deleted_at column on the projects table. No archive/unarchive project RPCs exist.

## Existing Project List/Homebase/Favorite Behavior

- **Project list:** `listCurrentWorkspaceProjects()` fetches ALL accessible projects (owned + shared), no active/archive filter. UI splits into "Your Projects" / "Projects shared to you" tabs client-side.
- **Homebase:** `getWorkshopHomebaseData()` loads favorites + recent projects from `projects` ordered by `updated_at desc`, capped at 12. No archive filter.
- **Favorites:** `setProjectFavorite()` upserts/deletes `project_favorites`. `listCurrentWorkspaceProjects()` returns `favoriteProjectIds`.
- **Removed favorites:** Homebase reports favorites that no longer resolve to visible projects.
- **Search:** Client-side filtering over active tab's projects.
- **View modes:** `list|small|medium|large` stored in localStorage, synced via custom events + `useSyncExternalStore`.
- **No TanStack Query** on project list page — reads are server-fetched, writes use server actions + `router.refresh()`.

## Existing Route Behavior

- **Project dashboard:** `getCurrentWorkspaceProject()` loads project; if missing (UUID), redirects to `/workshop?removedProject=...`; otherwise `notFound()`.
- **Estimates:** `notFound()` when project/estimate missing.
- **Middleware:** `/workshop` is protected; public routes bypass auth; closed-beta gate enforced.
- **Auth gate:** `requireCurrentUserContext()` from `src/lib/auth/session.ts`.

## Existing Supabase/RLS/RPC Patterns

### RLS on Projects
```sql
project viewers can read projects — select using can_access_project(id)
project editors can insert projects — insert to authenticated with is_workspace_editor(workspace_id)
project editors can update projects — update using/checking can_edit_project(id)
project editors can delete projects — delete using can_edit_project(id)
platform admins can manage all projects — for all using is_platform_admin()
```

### Project Table Schema
```
id uuid PK, workspace_id uuid FK, name text, client_name text?, project_code text?,
location text?, currency_code text (default 'PHP'), metadata jsonb,
created_by uuid?, created_at timestamptz, updated_at timestamptz
```

**NO `archived_at`, `deleted_at`, or status column exists.** `status` was dropped by migration `20260519001000`.

### Existing Access RPCs
- `can_access_project(target_project_id)` → boolean
- `can_edit_project(target_project_id)` → boolean
- `can_manage_project_access(target_project_id)` → boolean
- `current_project_access_rank(target_project_id)` → integer

## Existing Tests

### Unit Tests (3 files)
- `tests/unit/reset-baseline.test.ts` — workshop sidebar baseline
- `tests/unit/tree-selection.test.ts` — bulk tree selection utilities
- `tests/unit/p3-shared-link-migration-red.test.ts` — shared-link migration contract

### Vitest/DOM Tests (~115 files)
Key archive/project-adjacent tests:
- `tests/vitest/mass-deletion-action-contract.test.ts` — delete/archive action wiring
- `tests/vitest/mass-deletion-ui-contract.test.ts` — preview-first destructive UI contract
- `tests/vitest/bulk-action-validation.test.ts` — bulk action confirmation phrases
- `tests/vitest/projects-page-access-tabs.test.tsx` — project list tabs, shared invite states
- `tests/vitest/project-dashboard-ui.test.ts` — project dashboard/page-shell governance
- `tests/vitest/project-publication-schema.test.ts` — project-publication RLS/RPC contract
- `tests/vitest/project-collaboration-schema.test.ts` — project/collaboration RLS + realtime auth

### E2E Specs (14 files)
- `e2e/auth.spec.ts` — protected workshop redirect + login
- `e2e/estimate-tree-dnd.spec.ts` — tree drag/drop
- `e2e/landing-audit.spec.ts` — landing page audit
- `e2e/notifications-center.spec.ts` — notification center
- `e2e/notifications-release-modal.spec.ts` — release modal
- `e2e/project-invite-entry.spec.ts` — invite acceptance
- `e2e/route-transition-performance.spec.ts` — route transition budgets
- `e2e/shared-link-receiver.spec.ts` — shared-link receiver
- `e2e/teamspace-collaboration.spec.ts` — multi-user collaboration
- `e2e/workshop-library-demo-smoke.spec.ts` — library smoke
- `e2e/workshop-project-specific-unlink-smoke.spec.ts` — unlink smoke
- `e2e/workshop-template-insert-smoke.spec.ts` — template insertion
- `e2e/workshop-route-error-boundaries.spec.ts` — error boundaries
- `e2e/ask-flip-package-builder-live.spec.ts` — AI package builder

### Test Patterns
- Source-contract tests: read files and assert strings
- RTL/Vitest UI tests: `vi.mock()`, `beforeEach` reset, `render` + `userEvent`
- Route-handler tests: `NextRequest` + manual request builders
- Schema/RPC contracts: read migrations/types, conditionally live-test DB
- Test fixtures: mostly inline factories (`createProject`, `PROJECT_FIXTURE`); shared fixtures at `tests/fixtures/publication-snapshots.ts`

## Related .ai Docs/Specs/Plans/Archives

- `.ai/03_plans/2026-06-06-notification-system/` — format precedent for plan packs
- `.ai/03_plans/2026-06-03-mass-deletion-projects-estimate-sheets-library-components.md` — mass deletion plan
- `.ai/09_archive/store/2026-05-29-workshop-bento-favorites-complete/` — favorites implementation
- `.ai/09_archive/store/2026-05-27-project-client-publication-complete/` — publication implementation
- `.ai/09_archive/store/2026-05-27-project-workspace-invite-entry-complete/` — invite entry implementation

## Gaps/Unknowns

1. **No existing project archive/unarchive RPCs** — must be created from scratch (following the preview/execute pattern from mass deletion)
2. **No `archived_at` or `archived_by` on `projects` table** — requires additive migration
3. **No existing "Archived" tab or view** in project list UI — needs new tab + filtered queries
4. **No archive action on project cards or detail modals** — needs new UI affordances
5. **Homebase/recent projects unfiltered** — current queries return all projects; need `WHERE archived_at IS NULL`
6. **Route pages don't check archived state** — `getCurrentWorkspaceProject()` returns project regardless of state; needs archive guard
7. **Publication/shared-link behavior for archived projects undefined** — needs decision: pause links or return "archived" state
8. **Collaboration invitations for archived projects** — should pending invites be preserved or cancelled?
9. **Bulk-action types already include `archivedIds`** — type system is archive-aware, but only used for component library currently
10. **Design-system lint for new UI components** — any new archive UI must pass `bun run lint:design-system`

## Evidence Links

- Projects table has NO archive column: `src/lib/supabase/types.ts` lines 2817-2830
- Bulk action types include `archivedIds`: `src/lib/mass-deletion/bulk-action.ts` lines 48-60
- Component library lifecycle: `supabase/migrations/20260523120957_component_library_item_versioning.sql` lines 7-24
- Project access RPCs: `supabase/migrations/20260526142913_project_sheet_collaboration_access.sql`
- Project delete RPCs: `supabase/migrations/20260603160000_mass_deletion_governance.sql`
- Notification soft-archive: `supabase/migrations/20260606090000_notification_system.sql` lines 46-98
- Design system constraints: `DESIGN.md` lines 349-384
- Validation commands: `.ai/00_system/VALIDATION_MATRIX.md` lines 9-23
