# UX-034 Acceptance Criteria

**Date:** 2026-06-23
**Issue ID:** UX-034
**Targeted Verification:** TV-LIBRARY-SOURCING, TV-ASSET-API

## Post-Fix Scenario

Reviewer uploads a new spec sheet, ties it to a component variant, approves it, and verifies old revision remains auditable. Current approved attachment is clear and older revisions are not lost.

## Acceptance Criteria

### AC-1: Upload with Review Status

Given a workspace editor uploads a PDF attachment
When the upload completes
Then the attachment row has `review_status = 'uploaded'`
And `is_current_approved = false`
And `review_revision = 1`

### AC-2: Approve Attachment

Given an attachment in `uploaded` status
When a reviewer approves it with a note and applicable cost entry
Then the attachment status changes to `approved`
And `is_current_approved = true`
And `reviewed_by` and `reviewed_at` are set
And `applicable_cost_entry_id` is set
And any other `is_current_approved` attachment for the same scope is superseded
And a `cost_library_attachment_review_events` row is created with `event_type = 'approved'`
And `review_revision` increments by 1

### AC-3: Reject Attachment

Given an attachment in `uploaded` status
When a reviewer rejects it with a reason
Then the attachment status changes to `rejected`
And `is_current_approved = false`
And `reviewed_by` and `reviewed_at` are set
And a `cost_library_attachment_review_events` row is created with `event_type = 'rejected'`

### AC-4: Supersede Attachment

Given two attachments for the same variant scope
When a reviewer supersedes one with the other
Then the target attachment status changes to `superseded`
And `is_current_approved = false`
And the replacement attachment status changes to `approved`
And `is_current_approved = true`
And `superseded_by` is set on the target

### AC-5: Variant Applicability

Given an attachment and a cost entry for the same component variant
When a reviewer approves the attachment with the cost entry as applicable
Then `applicable_cost_entry_id` references the cost entry
And the scope trigger validates workspace/item/price_option match

### AC-6: Revision Conflict Handling

Given an attachment
When two reviewers attempt to mutate it simultaneously with stale `expected_review_revision`
Then the second call receives a `40001` revision conflict error
And the UI shows a retry prompt with fresh data

### AC-7: Audit Trail Visibility

Given an attachment with review history
When a reviewer views the component detail
Then they see a chronological list of `cost_library_attachment_review_events`
With actor name, from/to status, reason, and timestamp

### AC-8: Delete Guard

Given an approved attachment
When a user attempts to delete it
Then the DELETE API returns `409` with message "Reviewed Library attachments cannot be removed from draft cleanup."
And the attachment remains in storage and database

### AC-9: Current Approved Indicator

Given a component with approved attachments
When an estimator views the library
Then approved attachments show a "current" indicator
And unapproved attachments show a "pending review" warning

### AC-10: Old Revision Preservation

Given a superseded attachment
When a reviewer views the audit trail
Then the old attachment row is still queryable
And its `review_status = 'superseded'`
And `superseded_by` points to the replacement

## Edge Cases

- Invalid file types (non-PDF/XLS/XLSX) are rejected at upload (magic-mime)
- Files over 20MB are rejected at upload
- Only workspace admins can approve/reject (RPC enforces)
- Superseded attachments must reference replacement in same scope (trigger enforces)
