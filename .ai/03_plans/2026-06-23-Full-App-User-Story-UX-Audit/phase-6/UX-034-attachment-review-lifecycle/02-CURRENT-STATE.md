# UX-034 Current State

**Date:** 2026-06-23

## Data Model

The schema already contains attachment review governance primitives via `supabase/migrations/20260622143000_library_trust_governance.sql`:

- Lines 32-38: `cost_library_attachment_review_status` enum: `uploaded`, `approved`, `rejected`, `superseded`
- Lines 41-49: `cost_library_attachment_review_event_type` enum: `uploaded`, `approved`, `rejected`, `superseded`, `download_url_issued`
- Lines 66-74: `cost_library_item_variant_attachments` columns added:
  - `review_status` (default `uploaded`)
  - `applicable_cost_entry_id` — ties attachment to specific cost entry
  - `is_current_approved` (default `false`)
  - `reviewed_by`, `reviewed_at`, `review_note`
  - `superseded_by`, `review_revision`
- Lines 108-112: `cost_library_attachment_review_current_consistency` constraint: `is_current_approved` implies `review_status = 'approved'`
- Lines 114-121: `cost_library_attachment_review_reviewed_consistency` constraint: approved/rejected/superseded require `reviewed_by` and `reviewed_at`
- Lines 123-127: `cost_library_attachment_review_supersede_consistency` constraint: superseded requires `superseded_by`
- Lines 129-133: `cost_library_attachment_review_revision_positive` constraint: `review_revision > 0`
- Lines 155-157: Unique index `cost_library_attachments_one_current_item_scope` on `(workspace_id, item_id)` where `is_current_approved` and no price_option/cost_entry
- Lines 159-161: Unique index `cost_library_attachments_one_current_option_scope` on `(workspace_id, item_id, price_option_id)` where `is_current_approved` and no cost_entry
- Lines 163-165: Unique index `cost_library_attachments_one_current_cost_entry_scope` on `(workspace_id, item_id, price_option_id, applicable_cost_entry_id)` where `is_current_approved`
- Lines 167-168: Index `cost_library_attachment_review_queue_idx` on `(workspace_id, review_status, reviewed_at desc)`

## RPC Functions (Already Implemented)

- Lines 839-952: `approve_cost_library_attachment(target_attachment_id, expected_review_revision, target_applicable_cost_entry_id, reason)` — validates file type, supersedes competitors, sets `is_current_approved`
- Lines 954-1008: `reject_cost_library_attachment(target_attachment_id, expected_review_revision, reason)` — clears `is_current_approved`
- Lines 1010-1139: `supersede_cost_library_attachment(target_attachment_id, replacement_attachment_id, expected_review_revision, reason)` — full replacement workflow with audit events

## RLS and Permissions

- Lines 315-317: `members can view variant attachments` policy (select, authenticated, `is_workspace_member`)
- Lines 326-328: `admins can view attachment review events` policy (select, authenticated, `is_workspace_admin`)
- Lines 345-365: `require_cost_library_governance_admin(target_workspace_id)` — only workspace admins can change governance

## Client-Side Code

### Upload API

- `src/app/api/component-library/attachments/route.ts` line 13: `COMPONENT_ATTACHMENT_BUCKET = "component-attachments"`
- `src/app/api/component-library/attachments/route.ts` line 14: `MAX_UPLOAD_BYTES = 20 * 1024 * 1024`
- `src/app/api/component-library/attachments/route.ts` lines 15-19: Allowed MIME types: `application/pdf`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `src/app/api/component-library/attachments/route.ts` lines 46-77: `readMagicMime` validates PDF (`%PDF-`), XLSX (`PK...[Content_Types].xml`), XLS (`D0CF11E0`)
- `src/app/api/component-library/attachments/route.ts` lines 129-177: `POST` handler — validates size, mime type, uploads to storage, returns bucket/path/fileName/contentType/sizeBytes
- `src/app/api/component-library/attachments/route.ts` lines 179-209: `DELETE` handler — checks `review_status` and `is_current_approved` before allowing removal; blocks deletion of reviewed attachments
- `src/app/api/component-library/attachments/route.ts` line 95: `isMissingAttachmentGovernanceColumnError` handles `42703` or missing `review_status`/`is_current_approved`

### Server Actions

- `src/lib/component-library/actions.ts` line 108: `ComponentVariantAttachmentInput` has `id`, `bucket`, `path`, `fileName`, `contentType`, `sizeBytes`, `kind`, `metadata`
- No review status fields in client-side input types
- No server actions wrap attachment governance RPCs

### UI Components

- `src/components/workshop/component-library-manager/AddComponentModal.tsx` — component creation/editing modal with attachment upload
- `canonical-feature-status.csv` line 83: LIB-007 references `AddComponentModal.tsx` for attachment approval
- No review status badge or approval button in current UI

## Gaps

1. No UI surface exposes `review_status`, `is_current_approved`, `reviewed_by` fields
2. No workflow exists to approve or reject uploaded attachments
3. No UI exists to tie attachments to specific cost entries (variant applicability)
4. No version/supersede affordance for attachments
5. No audit trail view for attachment review events
6. `DELETE` API checks review state but client UI does not show it
7. No repository function queries `cost_library_attachment_review_events`
8. No server action wraps attachment governance RPCs

## Schema Verification

```sql
select column_name, data_type, column_default
from information_schema.columns
where table_name = 'cost_library_item_variant_attachments'
  and column_name in ('review_status', 'applicable_cost_entry_id', 'is_current_approved', 'reviewed_by', 'reviewed_at', 'review_note', 'superseded_by', 'review_revision');
```

Expected: 8 rows.

## RPC Verification

```sql
select proname, proargnames, prorettype::regtype
from pg_proc
where proname in (
  'approve_cost_library_attachment',
  'reject_cost_library_attachment',
  'supersede_cost_library_attachment'
);
```

Expected: 3 rows.

## Index Verification

```sql
select indexname, indexdef
from pg_indexes
where tablename = 'cost_library_item_variant_attachments'
  and indexname in ('cost_library_attachment_review_queue_idx', 'cost_library_attachments_one_current_item_scope');
```

Expected: 2 rows.
