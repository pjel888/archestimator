# Deployment, Migration, and Rollback Plan: Archives Feature

This document outlines the strategy for deploying the Archives feature, managing database migrations, and handling potential rollbacks.

## Deployment Considerations

The deployment follows a strict order to prevent runtime errors.

1. **Migration First**: Apply the database migration to the linked Supabase instance before deploying any code. This ensures that the `archived_at` and `archived_by` columns exist when the new code attempts to query them.
2. **Gated Writes**: Code that writes to `archived_at` depends on the existence of the new RPCs. These writes cannot happen until the migration is live.
3. **Additive Changes**: The migration is purely additive. It adds columns and functions without modifying existing data or breaking current queries.
4. **Execution Order**:
    - Apply migration to the linked Supabase project.
    - Deploy the application code.
    - Run verification checks.

## Feature Flags

Feature flags aren't required for V1. The archive feature is a simple, additive enhancement with low risk. It doesn't replace existing critical paths or toggle complex logic.

## Backward Compatibility

The system remains compatible with older data and queries throughout the transition.

- **Existing Queries**: Queries that don't filter by `archived_at` will continue to function. They'll return all projects, including those that might be archived later.
- **Default State**: Existing rows will have `NULL` for `archived_at`. This is the default state for "active" projects, so no data backfill is necessary.
- **Gradual Filtering**: Once the code is deployed, queries will include the `archived_at IS NULL` filter. This will hide archived projects from active views without affecting the underlying data.

## Rollback Process

If issues arise, use these steps to return to a stable state.

### Code Rollback
Redeploy the previous stable version of the application. This stops the UI from filtering by `archived_at`. All projects, including those marked as archived, will reappear in the active views.

### Data Rollback
To "unarchive" everything, run an update query:
`UPDATE projects SET archived_at = NULL, archived_by = NULL;`
This is safe and reversible. No data is lost during the archive process.

### Migration Rollback
Removing columns is generally discouraged unless absolutely necessary. Prefer leaving the columns and rolling back the code. If you must remove them:
`ALTER TABLE projects DROP COLUMN archived_at, DROP COLUMN archived_by;`
Warning: This will permanently delete any archive timestamps already recorded.

### RPC Rollback
You can drop the new functions if they cause issues (PostgreSQL requires signature; use CASCADE or specify arg types):
```sql
DROP FUNCTION IF EXISTS preview_bulk_archive_projects CASCADE;
DROP FUNCTION IF EXISTS execute_bulk_archive_projects CASCADE;
DROP FUNCTION IF EXISTS preview_bulk_restore_projects CASCADE;
DROP FUNCTION IF EXISTS execute_bulk_restore_projects CASCADE;
```
It's also safe to leave them unused in the database.

## Post-Deployment Checks

Verify the following after deployment:

- **Schema**: Confirm the `projects` table has `archived_at` and `archived_by` columns.
- **RPCs**: Ensure new functions exist and are executable by authenticated users.
- **Active List**: Check that the active project list still loads correctly.
- **Archive Flow**: Archive a test project. Verify it moves to the "Archived" tab.
- **Restore Flow**: Restore that same test project. Verify it returns to its original tab.
- **Delete Flow**: Confirm that the existing delete functionality still works independently of archiving.
- **Integrity Check**: Run `SELECT count(*) FROM projects WHERE archived_at IS NULL` before and after deployment to ensure no active projects vanished unexpectedly.

## Archive-Specific Rollback Logic

- **UI Gating**: Don't deploy the UI code until the migration succeeds. This prevents users from seeing broken archive buttons.
- **Visibility**: If the code rolls back, archived rows stay in the database but become visible in active views again.
- **Data Safety**: The archive process never deletes rows. It only updates the `archived_at` timestamp.
- **Filtering**: If the archive filtering behaves incorrectly, a code rollback immediately restores full visibility.
