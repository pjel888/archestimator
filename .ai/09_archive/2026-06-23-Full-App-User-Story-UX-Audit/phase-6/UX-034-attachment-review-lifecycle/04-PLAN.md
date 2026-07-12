# UX-034 Implementation Plan

**Date:** 2026-06-23
**Phase:** Phase 4 (new workflow foundations)

## Sequencing

This work must follow Phase 1-3 and precede Phase 5 UI surface work, per `03-sequencing-dependencies-and-conflicts.md` line 15:

> Phase 4: New workflow foundations — Access-path, data, and security choices must precede UI surface work.

And line 27:

> Attachment approval (`UX-034`) | Storage metadata and variant applicability decision | Approval is unsafe if file version scope is unclear.

## Implementation Steps

### Step 1: Schema Verification (1 session)

Verify the migration `20260622143000_library_trust_governance.sql` is applied to the linked remote:

```bash
npx supabase db diff --linked
```

Confirm columns exist on `cost_library_item_variant_attachments`:
- `review_status`
- `applicable_cost_entry_id`
- `is_current_approved`
- `reviewed_by`, `reviewed_at`, `review_note`
- `superseded_by`, `review_revision`

Confirm RPCs exist:
- `approve_cost_library_attachment`
- `reject_cost_library_attachment`
- `supersede_cost_library_attachment`

Confirm RLS policies exist:
- `members can view variant attachments`
- `admins can view attachment review events`

### Step 2: Upload API Update (1 session)

Update `src/app/api/component-library/attachments/route.ts`:

- Line 167: Return response includes `review_status: 'uploaded'`
- Ensure `POST` handler inserts into `cost_library_item_variant_attachments` with `review_status = 'uploaded'`
- Verify `DELETE` handler's `review_status`/`is_current_approved` check works with real data

### Step 3: Repository Queries (1 session)

Add repository functions in `src/lib/repositories/cost-library-repository.ts`:

- `getPendingAttachments(workspaceId)` — query using `cost_library_attachment_review_queue_idx`
- `getAttachmentReviewEvents(attachmentId)` — query `cost_library_attachment_review_events`
- `getAttachmentWithReviewStatus(attachmentId)` — select with review fields

### Step 4: Server Actions (1 session)

Add server actions in `src/lib/component-library/actions.ts`:

- `approveAttachment(attachmentId, expectedRevision, applicableCostEntryId, reason)` — wraps `approve_cost_library_attachment` RPC
- `rejectAttachment(attachmentId, expectedRevision, reason)` — wraps `reject_cost_library_attachment` RPC
- `supersedeAttachment(attachmentId, replacementAttachmentId, expectedRevision, reason)` — wraps `supersede_cost_library_attachment` RPC

Each action must:
1. Call `requireCurrentUserContext()`
2. Call `ensureDefaultWorkspace()`
3. Call `assertCanManageLibrary()` or stricter admin check
4. Call RPC with `expected_review_revision`
5. Handle `40001` revision conflict as retryable error
6. Call `revalidateLibraryRoutes()`
7. Return typed result

### Step 5: Attachment Review Queue UI (2 sessions)

Add attachment review queue to library manager:

- New route or tab: `/workshop/library/attachments` or tab within library manager
- Query pending attachments via TanStack Query
- Show table with: file name, component, variant, uploader, size, status
- Actions: Approve, Reject
- Bulk approve/reject for multiple attachments

### Step 6: Component Attachment Panel (2 sessions)

Update `AddComponentModal` attachment section:

- Show `review_status` badge per attachment
- Show `is_current_approved` indicator
- Show reviewer, date, note
- Action buttons: Approve, Reject, Supersede
- Dropdown to select applicable cost entry
- Audit trail tab for attachment events

### Step 7: Upload State Indicator (1 session)

Update upload UI in `AddComponentModal`:

- After upload, show "uploaded (pending review)" status
- Disable "use in estimate" until `is_current_approved = true`
- Show review note if rejected

### Step 8: Tests (2 sessions)

Write tests:

- Unit tests for repository queries
- Action tests for each governance action (mock RPC)
- Component tests for attachment review queue
- Component tests for attachment panel
- API tests for upload/delete with review state
- Post-fix scenario test: reviewer uploads, approves, verifies audit trail

## Rollback Plan

1. Schema: migration already applied; no rollback needed for schema
2. Code: feature-flag new UI surfaces behind `NEXT_PUBLIC_LIBRARY_GOVERNANCE_ENABLED`
3. Data: no destructive data changes; existing attachments default to `review_status = 'uploaded'`
4. RPC: RPCs are already deployed and safe to call (they enforce admin rights)

## Conflict Avoidance

- Do not modify upload file handling logic (magic-mime, size limits, bucket)
- Do not change allowed file types without explicit approval
- Coordinate with storage/provider lead if storage quotas or retention change
- Do not touch cost review code (UX-033) except for shared enum/types
