# UX-034 Blast Radius

**Date:** 2026-06-23
**Issue ID:** UX-034
**Conflict Group:** Library/cost/storage

## Blast Radius Checklist

Per `05-security-data-and-provider-blast-radius.md`, answer before implementing:

### Data

1. **Which tables/columns change?**
   - `cost_library_item_variant_attachments`: review_status, applicable_cost_entry_id, is_current_approved, reviewed_by, reviewed_at, review_note, superseded_by, review_revision — already added by migration
   - `cost_library_attachment_review_events`: new table for audit trail

2. **Is a migration required?**
   - No. Migration `20260622143000_library_trust_governance.sql` already applied.

3. **Is existing data affected?**
   - All existing attachments default to `review_status = 'uploaded'`, `is_current_approved = false`, `review_revision = 1`.
   - No destructive changes.

4. **Rollback?**
   - Code changes can be rolled back by reverting commits.
   - Schema changes are additive and safe.
   - Feature-flag new UI surfaces behind `NEXT_PUBLIC_LIBRARY_GOVERNANCE_ENABLED` if needed.

### Authz / RLS

1. **Which roles touch this?**
   - Workspace admins (mutate via governance RPCs)
   - Workspace editors (upload attachments)
   - Workspace members (view attachment status)

2. **Are policies already in place?**
   - Yes. `members can view variant attachments` (select)
   - `admins can view attachment review events` (select)
   - Mutations are RPC-based with `require_cost_library_governance_admin` check

3. **Is the blast radius contained to the expected workspace?**
   - Yes. All RPCs and triggers enforce `workspace_id` scope.

### Provider / Storage

1. **Does this touch hosted files?**
   - Yes. Uses existing `component-attachments` bucket.
   - No new bucket or storage configuration needed.

2. **Does this touch external APIs?**
   - No.

### Public / Sharing

1. **Does this expose data to shared links?**
   - No. Attachment review status is internal governance.
   - Shared links may show attachments but not review metadata.

### Performance

1. **Are new indexes used?**
   - `cost_library_attachment_review_queue_idx` on `(workspace_id, review_status, reviewed_at desc)`
   - `cost_library_attachments_one_current_item_scope` unique partial index
   - `cost_library_attachments_one_current_option_scope` unique partial index
   - `cost_library_attachments_one_current_cost_entry_scope` unique partial index

2. **Is the query pattern efficient?**
   - Review queue query hits the composite index.
   - Attachment lookups by ID are primary key.

### Security

1. **Are there injection risks?**
   - No. All mutations go through parameterized RPCs.
   - Upload API already has magic-mime validation.

2. **Are there privilege escalation risks?**
   - No. `require_cost_library_governance_admin` enforces workspace admin for mutations.

3. **Are audit events recorded?**
   - Yes. Every governance action inserts into `cost_library_attachment_review_events`.

## Affected Files

| File | Change Type | Reason |
|---|---|---|
| `src/lib/repositories/cost-library-repository.ts` | Add | New queries for attachment review queue and events |
| `src/lib/component-library/actions.ts` | Add | New server action wrappers for attachment governance RPCs |
| `src/app/api/component-library/attachments/route.ts` | Modify | Return review status in upload response; verify delete guard |
| `src/components/workshop/component-library-manager/AddComponentModal.tsx` | Modify | Add attachment review panel and upload status |
| `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` | Modify | Add attachment review queue tab |
| `tests/vitest/attachment-governance.test.ts` | Add | Attachment governance action tests |
| `tests/vitest/attachment-review-queue.test.tsx` | Add | Attachment review queue component tests |
| `tests/vitest/attachments-api.test.ts` | Add | Upload/delete API tests with review state |

## Conflict Avoidance

- Do not modify upload file handling logic (magic-mime, size limits, bucket)
- Do not change allowed file types without explicit approval
- Coordinate with storage/provider lead if storage quotas or retention change
- Do not touch cost review code (UX-033) except for shared enum/types
- Keep changes scoped to library surfaces

## Rollback Details

### Code Rollback

If the feature needs to be disabled:
1. Revert commits introducing attachment review queue and panel
2. Keep upload API as-is (review status in response is harmless)
3. RPCs remain deployed but unused

### Data Rollback

No data rollback needed. All schema changes are additive:
- `review_status` defaults to `uploaded`
- Existing attachments are unaffected
- New audit events table is empty until features are used

### Feature Flag

If desired, wrap new UI behind environment variable:
```typescript
const attachmentGovernanceEnabled = process.env.NEXT_PUBLIC_LIBRARY_GOVERNANCE_ENABLED === "true";
```

## Monitoring

After deployment, monitor:
- RPC execution times for attachment governance functions
- Error rate for `40001` revision conflicts
- Upload volume vs approval volume
- Storage usage growth rate
- User engagement with attachment review queue
