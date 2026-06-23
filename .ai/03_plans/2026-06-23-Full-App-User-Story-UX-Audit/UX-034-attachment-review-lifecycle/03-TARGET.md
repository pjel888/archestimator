# UX-034 Target State

**Date:** 2026-06-23

## Goal

Reviewer approves the correct spec-sheet revision for a component variant and old files remain auditable. Current approved attachment is clear and older revisions are not lost.

## Target Data Model

The target data model is already defined by `supabase/migrations/20260622143000_library_trust_governance.sql`:

- `cost_library_item_variant_attachments` has `review_status`, `applicable_cost_entry_id`, `is_current_approved`, `reviewed_by`, `reviewed_at`, `review_note`, `superseded_by`, `review_revision`
- `cost_library_attachment_review_events` records every state transition with `event_type`, `actor_id`, `from_status`, `to_status`, `reason`

## Target UI Surfaces

### 1. Attachment Review Queue

A new view in the library manager that:
- Queries `cost_library_item_variant_attachments` using the `cost_library_attachment_review_queue_idx`
- Filters by `review_status = 'uploaded'`
- Shows `fileName`, `contentType`, `sizeBytes`, `uploaded_by`, `item_name`, `variant_label`
- Allows reviewer to approve or reject with note
- Calls `approve_cost_library_attachment` or `reject_cost_library_attachment` RPC
- Sorts by `reviewed_at desc`

### 2. Component Attachment Panel

In the component detail/edit modal:
- Shows list of attachments per variant
- Displays `review_status` badge (uploaded/approved/rejected/superseded)
- Shows `is_current_approved` indicator (star or checkmark)
- Shows reviewer name, review date, review note
- Shows applicable cost entry (if tied)
- Actions: Approve, Reject, Supersede
- Calls respective governance RPCs with `expected_review_revision`

### 3. Upload State Indicator

In the upload UI:
- After upload, attachment shows as "uploaded" (pending review)
- Progress indicator from upload API
- Warning if file type or size is outside norms
- Disabled "use in estimate" until approved

### 4. Variant Applicability

In the attachment panel:
- Dropdown to tie attachment to specific cost entry
- Shows which cost entry the attachment validates
- Validates that cost entry shares workspace/item/price_option

### 5. Audit Trail

In component detail:
- Tab showing `cost_library_attachment_review_events`
- Filterable by attachment
- Shows actor, from/to status, reason, timestamp
- Chronological order, newest first

## Target Permissions

- Workspace editors can UPLOAD attachments
- Workspace admins can APPROVE/REJECT/SUPERSEDE attachments
- All workspace members can VIEW attachment status and audit trail
- `require_cost_library_governance_admin` enforces admin-only mutations

## Target Verification

- `TV-LIBRARY-SOURCING`: Library sourcing workflow test for attachment metadata
- `TV-ASSET-API`: Attachment API test for review state and deletion guards
- Post-fix scenario: Reviewer uploads a new spec sheet, ties it to a component variant, approves it, and verifies old revision remains auditable

## Target States by Role

### Reviewer (Admin)

- Opens attachment review queue
- Sees uploaded attachments pending review
- Validates file type, size, and content
- Approves attachment with note and variant applicability
- Rejects inappropriate attachments with reason
- Views audit trail of all attachment actions

### Estimator

- Browses component library
- Sees approved attachments with current indicator
- Can download approved spec sheets
- Sees warning if attachment is not approved
- Knows old revisions exist in audit trail

### Uploader (Editor)

- Uploads spec sheet to component variant
- Sees "uploaded" status (pending review)
- Receives notification when approved or rejected
- Can view review note

## Success Metrics

- Attachment review queue loads in <500ms for 500 attachments
- Approval/rejection actions complete in <2s
- No unapproved attachment marked as `is_current_approved`
- All approved attachments have `reviewed_by` and `reviewed_at` populated
- Audit trail shows 100% of attachment governance actions
