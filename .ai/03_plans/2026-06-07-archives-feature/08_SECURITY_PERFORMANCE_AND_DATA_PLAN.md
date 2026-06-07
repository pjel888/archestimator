# Security, Performance, and Data Plan — Archives Feature

**Date:** 2026-06-07
**Plan:** `.ai/03_plans/2026-06-07-archives-feature/`

## Auth/Authorization

- **Archive gate:** `can_edit_project(target_project_id)` — allows workspace members + project editors/admins/owners. NOTE: this is DIFFERENT from deletion which uses `can_manage_project_access` (owner/admin only). Archive is intentionally more permissive since it's reversible/non-destructive.
- **Restore gate:** same as archive (`can_edit_project`)
- **Implementation:** Archive/restore RPCs call `can_edit_project` internally; server actions validate before RPC call; RPC acts as final authority
- **Workspace admin override:** platform admins (`is_platform_admin()`) and workspace members with admin rank pass `can_edit_project`
- **Authorization scope:** `can_edit_project` returns true for workspace members (via `is_workspace_member`) AND project-level editors/admins/owners (via `project_members`). This is intentionally broader than "owner/admin only" — project editors can archive/restore, same as they can edit projects. Delete is separately gated by `can_manage_project_access` (owner/admin only). If finer-grained archive-only permission is needed later, add a separate `can_archive_project` RPC.
- **Sheet-only collaborators:** cannot archive the parent project (no `can_edit_project` on projects where they're sheet-only members)
- **Pending invite users:** cannot archive (resolved after invite acceptance with appropriate role)

Reference: `src/lib/collaboration/actions.ts` role system, `supabase/migrations/20260526142913_project_sheet_collaboration_access.sql` access RPCs.

## RLS/Supabase

- **Existing RLS on projects:**
  - SELECT: `can_access_project(id)` — allows reading archived projects at the RLS level. This is intentional: archived data remains accessible to authorized users through the Archived tab and authorized API routes. Application-layer filtering (`WHERE archived_at IS NULL`) controls visibility in active views; RLS controls data access. Both layers together provide defense-in-depth.
  - INSERT: `is_workspace_editor(workspace_id)` — unaffected
  - UPDATE: `can_edit_project(id)` — covers archive/restore (UPDATE sets `archived_at`)
  - DELETE: `can_edit_project(id)` — unaffected
- **New RPCs:** `preview_bulk_archive_projects`, `execute_bulk_archive_projects`, `preview_bulk_restore_projects`, `execute_bulk_restore_projects`
  - Execute with `SECURITY DEFINER`
  - Validate `auth.uid()` against workspace/project membership
  - Same grant pattern as existing mass deletion RPCs (authenticated execute, anon denied)
- **No new RLS policies needed:** archive/restore is an UPDATE operation, covered by existing `can_edit_project` policy
- **Client-side filtering is NOT a security boundary:** RLS controls data access; application-level `WHERE archived_at IS NULL` controls visibility. Archived projects remain readable via RLS to authorized users (through the Archived tab or direct API). The application query layer is the visibility boundary — RLS is the data-access boundary. Both are needed: RLS prevents unauthorized data access; app queries prevent archived projects from appearing in active views.

Reference: `supabase/migrations/20260603160000_mass_deletion_governance.sql` for RPC pattern, `supabase/migrations/20260603191903_harden_mass_deletion_actor_derivation.sql` for hardened actor derivation.

## Input Validation

- **Project IDs:** validated as UUIDs before RPC call (existing `normalizeBulkActionIds` from `src/lib/mass-deletion/bulk-action.ts`)
- **previewHash:** validated server-side in execute RPC (stale preview protection)
- **Batch limits:** enforced (same limit as project deletion)
- **Empty selection:** rejected before RPC call (returns `empty_selection` issue)
- **Confirmation UI:** for archive, simple confirm button (not typed phrase — archive is non-destructive)
- **Correlation ID:** generated for audit trail (same as delete pattern)

## Secrets/Environment Variables

**N/A — no new secrets or environment variables needed.**

Archive/restore uses existing Supabase project `ebxxqidacheyapmmzavr` and existing auth infrastructure. No new API keys, provider settings, or secrets required.

## Data Privacy

- **Archived project data:** remains in database, protected by same RLS policies
- **Archived view:** only authorized users (workspace members with project access) can see archived projects
- **No data exposure:** archive doesn't change access permissions; it only changes visibility in default UI views
- **GDPR/DSAR:** archived projects are still user data; deletion request handling unchanged

## Performance

- **Archive operation:** single UPDATE statement (SET archived_at = now(), archived_by = auth.uid()) — O(1) per project
- **Restore operation:** single UPDATE statement (SET archived_at = NULL, archived_by = NULL) — O(1) per project
- **Bulk archive/restore:** processed in single RPC call, not N separate calls
- **Index strategy:**
  - `CREATE INDEX idx_projects_active ON projects (workspace_id, updated_at DESC) WHERE archived_at IS NULL` — speeds up active project list
  - `CREATE INDEX idx_projects_archived ON projects (workspace_id, updated_at DESC) WHERE archived_at IS NOT NULL` — speeds up archived project list
- **Query impact on project list:** adding `WHERE archived_at IS NULL` to existing query uses the partial index; no N+1 regression
- **Homebase impact:** same index covers `getWorkshopHomebaseData` recent projects query
- **No table scans:** partial indexes ensure active/archived queries are index-only or index-assisted

## Caching

- **Next.js App Router:** server actions use `router.refresh()` after archive/restore to revalidate RSC payload
- **No special cache invalidation needed:** Next.js App Router handles RSC revalidation automatically on `router.refresh()`
- **TanStack Query:** not used on project list page (server-fetched); no query cache to invalidate
- **localStorage view mode:** unaffected (view mode is per-user, not per-project)

## Database/Migration

- **Additive schema only:** `ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ`, `ADD COLUMN IF NOT EXISTS archived_by UUID`
- **Default: NULL** — existing rows have archived_at = NULL (active)
- **No backfill needed:** existing projects are active by default
- **Migration naming:** `YYYYMMDDHHMMSS_project_archive_state.sql` (follows existing convention)
- **Linked Supabase apply:** exact-file linked query (NOT broad `db push` which is blocked by migration drift — see `.ai/15_Bugs/2026-06-06-linked-supabase-migration-history-drift-blocks-db-push.md`)
- **Type generation:** `npx supabase gen types typescript --project-id ebxxqidacheyapmmzavr > src/lib/supabase/types.ts` after migration apply
- **Manual type patches:** new RPCs may need manual type entries (same pattern as existing RPCs in types.ts)

## Rate Limits/Concurrency

- **No special rate limiting:** archive/restore are low-frequency operations; no abuse vector
- **Stale preview protection:** execute RPC re-runs preview logic and compares hash; rejects if state changed since preview
- **Concurrent archive/restore:** If two users attempt conflicting operations (e.g., one archives, another restores the same project), one will succeed and the other will receive `stale_preview` because execute re-runs preview and validates the hash. This prevents inconsistent intermediate states. The "last write wins" is enforced by the hash, not by silent no-ops.
- **Idempotency:** Archive of already-archived project is idempotent at the DB level (UPDATE sets the same values). However, the archive preview won't return already-archived projects as eligible, so this case won't arise in normal UI flow. Similarly, restore of already-active project won't appear in restore preview. If called directly via RPC, the UPDATE is a no-op (no rows changed).

## Failure Modes

| Failure | Behavior | Recovery |
|---------|----------|----------|
| RPC error (DB down) | Server action returns `rpc_error` issue; client shows error toast | Retry when DB recovers |
| Invalid project ID | Returns `invalid_id` issue; no RPC call made | User corrects selection |
| Unauthorized (viewer tries archive) | RPC returns `forbidden`; preview shows 0 eligible | No action needed |
| Stale preview (state changed between preview and execute) | Execute returns `stale_preview`; client shows error | User re-runs preview |
| Network failure | Client shows error toast; state unchanged | User retries |
| Concurrent archive by different user | Second archive is no-op (already archived) | No conflict |
| Migration apply failure | Feature not available (migration must precede code deployment per `09_DEPLOYMENT_MIGRATION_AND_ROLLBACK_PLAN.md`) | Fix migration; re-apply before deploying code |

## Required Rules

- ✅ Never touch SlateCamp resources
- ✅ Only Archestimator Supabase project `ebxxqidacheyapmmzavr`
- ✅ Do not commit secrets
- ✅ Do not claim linked Supabase state from local-only evidence
