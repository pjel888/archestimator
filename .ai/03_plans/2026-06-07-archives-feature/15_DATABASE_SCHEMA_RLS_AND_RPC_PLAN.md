# Database Schema, RLS, and RPC Plan

**Date:** 2026-06-07
**Plan:** `.ai/03_plans/2026-06-07-archives-feature/`

## Projects (Phase 1)

### Schema
```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
```

### Indexes
```sql
CREATE INDEX idx_projects_active ON projects (workspace_id, updated_at DESC) WHERE archived_at IS NULL;
CREATE INDEX idx_projects_archived ON projects (workspace_id, updated_at DESC) WHERE archived_at IS NOT NULL;
```

### RPCs (following mass_deletion_governance.sql pattern)
```sql
-- Preview: returns eligible/not_found/forbidden/blocked + previewHash
preview_bulk_archive_projects(target_project_ids uuid[]) RETURNS jsonb

-- Execute: validates hash, sets archived_at = now(), archived_by = auth.uid()
execute_bulk_archive_projects(target_project_ids uuid[], expected_preview_hash text, correlation_id uuid DEFAULT gen_random_uuid()) RETURNS jsonb

-- Preview: returns only currently-archived projects as eligible
preview_bulk_restore_projects(target_project_ids uuid[]) RETURNS jsonb

-- Execute: validates hash, sets archived_at = NULL, archived_by = NULL
execute_bulk_restore_projects(target_project_ids uuid[], expected_preview_hash text, correlation_id uuid DEFAULT gen_random_uuid()) RETURNS jsonb
```

### RLS
- No changes. SELECT uses `can_access_project(id)`, UPDATE uses `can_edit_project(id)`.
- Application layer filters `WHERE archived_at IS NULL` for active views.

### Auth
- Archive/restore: `can_edit_project` (workspace members + project editors/admins/owners)
- Delete: `can_manage_project_access` (owner/admin only) — SEPARATE gate

## Estimate Sheets (Phase 2)

### Schema
```sql
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
```

### RPCs
```sql
preview_bulk_archive_estimate_sheets(target_project_id uuid, target_estimate_ids uuid[]) RETURNS jsonb
execute_bulk_archive_estimate_sheets(target_project_id uuid, target_estimate_ids uuid[], expected_preview_hash text, correlation_id uuid DEFAULT gen_random_uuid()) RETURNS jsonb
preview_bulk_restore_estimate_sheets(target_project_id uuid, target_estimate_ids uuid[]) RETURNS jsonb
execute_bulk_restore_estimate_sheets(target_project_id uuid, target_estimate_ids uuid[], expected_preview_hash text, correlation_id uuid DEFAULT gen_random_uuid()) RETURNS jsonb
```

### Auth
- `can_edit_estimate` for archive/restore
- Note: `can_edit_estimate` delegates to `can_edit_project(e.project_id)` when estimate access inherits from project access (see `supabase/migrations/20260526142913_project_sheet_collaboration_access.sql:403-409`). This means project editors who inherit estimate access CAN archive estimate sheets — consistent with the inheritance model.

## Components (Phase 3)

### Schema
- NO new columns. Use existing `cost_library_items.lifecycle_state` (enum: draft|in_production|available|discontinued|archived).
- Existing columns: `lifecycle_state_changed_at`, `lifecycle_state_changed_by`.

### New RPCs (restore only — archive already exists)
```sql
-- Restore: sets lifecycle_state to the last pre-archive state (read from cost_library_item_state_history), or 'available' if no history exists
preview_bulk_restore_library_components(target_workspace_id uuid, target_item_ids uuid[]) RETURNS jsonb
execute_bulk_restore_library_components(target_workspace_id uuid, target_item_ids uuid[], expected_preview_hash text, correlation_id uuid DEFAULT gen_random_uuid()) RETURNS jsonb
```

### Existing RPCs (archive)
```sql
preview_bulk_archive_library_components(target_workspace_id uuid, target_item_ids uuid[]) RETURNS jsonb
execute_bulk_archive_library_components(target_workspace_id uuid, target_item_ids uuid[], expected_preview_hash text, correlation_id uuid DEFAULT gen_random_uuid()) RETURNS jsonb
set_cost_library_component_lifecycle_state(target_workspace_id uuid, target_item_id uuid, next_state public.component_lifecycle_state, ...) RETURNS jsonb
```

## Templates (Phase 4)

### Schema
```sql
ALTER TABLE estimate_templates ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE estimate_templates ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
```

### RPCs
```sql
preview_bulk_archive_templates(target_workspace_id uuid, target_template_ids uuid[]) RETURNS jsonb
execute_bulk_archive_templates(target_workspace_id uuid, target_template_ids uuid[], expected_preview_hash text, correlation_id uuid DEFAULT gen_random_uuid()) RETURNS jsonb
preview_bulk_restore_templates(target_workspace_id uuid, target_template_ids uuid[]) RETURNS jsonb
execute_bulk_restore_templates(target_workspace_id uuid, target_template_ids uuid[], expected_preview_hash text, correlation_id uuid DEFAULT gen_random_uuid()) RETURNS jsonb
```

### Auth
- Workspace editor for archive/restore (same as template creation)

## Retention (Phase 5 — Planning Only)

### Conceptual Schema (Future)
```sql
CREATE TABLE recipient_entitlements (...);
CREATE TABLE retained_publication_snapshots (...);
CREATE TABLE retained_estimate_snapshots (...);
CREATE TABLE retained_activity_history (...);
```
See `22_SHARED_RECIPIENT_AND_PAID_CLIENT_RETENTION_PLAN.md` for full schema design.

## Migration Strategy

- Filename: `YYYYMMDDHHMMSS_slug.sql`
- Additive only: `ALTER TABLE ADD COLUMN IF NOT EXISTS`
- Exact-file linked apply per migration (NOT `supabase db push`)
- Type generation: `npx supabase gen types typescript --project-id ebxxqidacheyapmmzavr > src/lib/supabase/types.ts`
- Manual type patches for new RPCs (same pattern as existing)

## Rollback SQL Sketches

```sql
-- Projects
UPDATE projects SET archived_at = NULL, archived_by = NULL;
DROP FUNCTION IF EXISTS preview_bulk_archive_projects CASCADE;
DROP FUNCTION IF EXISTS execute_bulk_archive_projects CASCADE;
DROP FUNCTION IF EXISTS preview_bulk_restore_projects CASCADE;
DROP FUNCTION IF EXISTS execute_bulk_restore_projects CASCADE;

-- Estimate Sheets
UPDATE estimates SET archived_at = NULL, archived_by = NULL;
DROP FUNCTION IF EXISTS preview_bulk_archive_estimate_sheets CASCADE;
-- ... etc

-- Components (remove restore RPCs only — component archive uses existing lifecycle_state)
-- No column changes to roll back (no new columns added for components)
DROP FUNCTION IF EXISTS preview_bulk_restore_library_components CASCADE;
DROP FUNCTION IF EXISTS execute_bulk_restore_library_components CASCADE;

-- Templates
UPDATE estimate_templates SET archived_at = NULL, archived_by = NULL;
DROP FUNCTION IF EXISTS preview_bulk_archive_templates CASCADE;
-- ... etc
```

## Audit Strategy

`archived_at` + `archived_by` on each row is sufficient audit trail for V1. No separate archive audit table needed. If detailed audit is required later, extend the existing `mass_deletion_events` pattern.
