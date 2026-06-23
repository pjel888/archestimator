# UX-034 Verification

**Date:** 2026-06-23
**Targeted Verification:** TV-LIBRARY-SOURCING, TV-ASSET-API

## Local Verification Commands

### Type Check

```bash
bun run type-check
```

Must pass with no errors in modified files.

### Lint

```bash
bun run lint
bun run lint:design-system
```

Must pass with no new errors.

### Unit Tests

```bash
bun run test
```

Must pass. Add tests for:
- Repository query functions
- Server action wrappers for attachment governance RPCs
- Upload API with review status
- Delete API with review state guard

### DOM Tests

```bash
bun run test:dom
```

Must pass. Add tests for:
- Attachment review queue component rendering
- Attachment panel state transitions
- Upload status indicator

## Targeted Verification IDs

### TV-LIBRARY-SOURCING-006: Attachment Schema Presence

Verify migration columns and RPCs exist:

```sql
select column_name, data_type
from information_schema.columns
where table_name = 'cost_library_item_variant_attachments'
  and column_name in ('review_status', 'applicable_cost_entry_id', 'is_current_approved', 'reviewed_by', 'reviewed_at', 'review_note', 'superseded_by', 'review_revision');
```

Expected: 8 rows returned.

### TV-LIBRARY-SOURCING-007: Attachment RPC Presence

```sql
select proname
from pg_proc
where proname in (
  'approve_cost_library_attachment',
  'reject_cost_library_attachment',
  'supersede_cost_library_attachment'
);
```

Expected: 3 rows returned.

### TV-ASSET-API-001: Upload with Review Status

Write and run a test that:
1. Uploads a PDF attachment via `POST /api/component-library/attachments`
2. Verifies response includes `review_status = 'uploaded'`
3. Verifies database row has `review_status = 'uploaded'` and `is_current_approved = false`

### TV-ASSET-API-002: Delete Guard

Write and run a test that:
1. Creates an approved attachment (via RPC or direct insert)
2. Calls `DELETE /api/component-library/attachments` with the path
3. Verifies response is `409` with "Reviewed Library attachments cannot be removed" message

### TV-LIBRARY-SOURCING-008: Attachment Action Test

Write and run a test that:
1. Creates a workspace admin user
2. Creates a component with variant and attachment
3. Calls `approveAttachment` action with applicable cost entry
4. Verifies `review_status = 'approved'` and `is_current_approved = true`
5. Calls `rejectAttachment` action on a second attachment
6. Verifies `review_status = 'rejected'` and `is_current_approved = false`

## Post-Fix Scenario Test

Name: `reviewer-attachment-lifecycle`

Steps:
1. Reviewer uploads a new spec sheet PDF to component variant
2. Verifies attachment shows "uploaded (pending review)"
3. Ties attachment to specific cost entry
4. Approves attachment with note "Valid spec sheet for Q3 2026"
5. Verifies `is_current_approved = true`
6. Uploads a revised spec sheet
7. Supersedes old attachment with new one
8. Verifies old attachment status is `superseded` and still queryable
9. Views audit trail and sees uploaded, approved, superseded events

## Evidence Artifacts

- Test output showing TV-ASSET-API-001 and TV-ASSET-API-002 pass
- Screenshot of attachment review queue
- Screenshot of component attachment panel with approval state
- Screenshot of audit trail with attachment events
