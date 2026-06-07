# Test Fixture and Migration Proof Plan

**Date:** 2026-06-07
**Plan:** `.ai/03_plans/2026-06-07-archives-feature/`

## Migration Proof Per Entity

| Entity | Proof Step | Command |
|--------|-----------|---------|
| Projects | Migration applied, columns exist | `SELECT column_name FROM information_schema.columns WHERE table_name='projects' AND column_name IN ('archived_at','archived_by')` |
| Projects | RPCs exist and are callable | `SELECT preview_bulk_archive_projects(ARRAY['<fixture-project-uuid>']::uuid[])` |
| Estimates | Migration applied | Same as projects |
| Components | Restore RPCs exist | `SELECT preview_bulk_restore_library_components('<fixture-workspace-uuid>', ARRAY['<fixture-component-uuid>']::uuid[])` |
| Templates | Migration applied | Same as projects |

## RLS Proof Strategy

Follow existing pattern from `scripts/prove-notification-rls-postgres.mjs`:
1. Start local PostgreSQL or use linked Supabase
2. Apply archive migration
3. As authenticated user with `can_edit_project`: archive succeeds
4. As authenticated user without `can_edit_project` (viewer): archive fails
5. As anon: all archive/restore RPCs fail
6. Verify archived projects are still SELECT-able by authorized users (RLS allows reads)
7. Verify archived projects are UPDATE-able by authorized users (restore works)

## Test Fixtures Per Entity

### Projects
```typescript
// Active project
const activeProject = { id: 'uuid-1', name: 'Active Project', workspace_id, archived_at: null }
// Archived project
const archivedProject = { id: 'uuid-2', name: 'Archived Project', workspace_id, archived_at: new Date(), archived_by: userId }
```

### Estimate Sheets
```typescript
const activeEstimate = { id: 'uuid-3', project_id: activeProject.id, archived_at: null }
const archivedEstimate = { id: 'uuid-4', project_id: activeProject.id, archived_at: new Date() }
```

### Components
```typescript
const activeComponent = { id: 'uuid-5', lifecycle_state: 'available' }
const archivedComponent = { id: 'uuid-6', lifecycle_state: 'archived' }
```

### Templates
```typescript
const activeTemplate = { id: 'uuid-7', workspace_id, archived_at: null }
const archivedTemplate = { id: 'uuid-8', workspace_id, archived_at: new Date() }
```

### Retained Recipient (Future — Phase 5)
```typescript
const entitlement = { recipient_user_id, entity_type: 'estimate_sheet', entity_id, status: 'active' }
const snapshot = { entitlement_id, estimate_id, snapshot_data: { ... }, retained_at: new Date() }
```

## DOM Test Fixtures

Use mocked server data with `vi.mock()`:
- `projects-page-access-tabs.test.tsx`: render with 2 active + 1 archived project, verify Archived tab shows 1
- Estimate table test: render with 2 active + 1 archived sheet, verify filter shows correct counts

## Playwright Smoke Tests

Seed project/sheet/component/template fixtures (via `data/local/seed.json` or test helpers), then:
- `e2e/archives.spec.ts`: archive → verify hidden → restore → verify visible for each entity

## Manual Fallback

If E2E is blocked: invoke RPCs directly via Supabase SQL Editor and verify `archived_at` column + UI response.
