# UX-033 Current State

**Date:** 2026-06-23

## Data Model

The schema already contains review governance primitives via `supabase/migrations/20260622143000_library_trust_governance.sql`:

- Lines 10-16: `cost_library_cost_review_status` enum: `proposed`, `needs_review`, `accepted`, `rejected`, `superseded`
- Lines 20-29: `cost_library_cost_review_event_type` enum: `proposed`, `marked_needs_review`, `assigned`, `accepted`, `locked`, `unlocked`, `rejected`, `superseded`
- Lines 53-64: `cost_library_item_variant_cost_entries` columns added:
  - `review_status` (default `proposed`)
  - `reviewed_by`, `reviewed_at`, `review_note`
  - `assigned_to`, `review_due_at`
  - `locked_by`, `locked_at`, `lock_reason`
  - `superseded_by`, `review_revision`
- Lines 78-84: `cost_library_cost_review_lock_consistency` constraint: lock only when `review_status = 'accepted'`
- Lines 87-94: `cost_library_cost_review_reviewed_consistency` constraint: reviewed/rejected/superseded require `reviewed_by` and `reviewed_at`
- Lines 96-100: `cost_library_cost_review_supersede_consistency` constraint: superseded requires `superseded_by`
- Lines 102-106: `cost_library_cost_review_revision_positive` constraint: `review_revision > 0`
- Lines 137-139: Unique index `cost_entries_one_accepted_current_per_option` on `price_option_id` where `is_current` and `review_status = 'accepted'`
- Lines 152-153: Index `cost_library_cost_review_queue_idx` on `(workspace_id, review_status, review_due_at, updated_at desc)`

## RPC Functions (Already Implemented)

- Lines 367-431: `assign_cost_library_cost_refresh(target_cost_entry_id, assignee_id, target_review_due_at, expected_review_revision, reason)`
- Lines 433-530: `accept_cost_library_cost_entry(target_cost_entry_id, expected_review_revision, reason)` — supersedes competitors, sets `active_cost_entry_id`
- Lines 532-583: `lock_cost_library_cost_entry(target_cost_entry_id, expected_review_revision, reason)` — requires `accepted`
- Lines 585-636: `unlock_cost_library_cost_entry(target_cost_entry_id, expected_review_revision, reason)` — requires `locked`
- Lines 638-699: `reject_cost_library_cost_entry(target_cost_entry_id, expected_review_revision, reason)` — clears `active_cost_entry_id`
- Lines 701-837: `supersede_cost_library_cost_entry(target_cost_entry_id, replacement_cost_entry_id, expected_review_revision, reason)`

## RLS and Permissions

- Lines 311-313: `members can view variant cost entries` policy (select, authenticated, `is_workspace_member`)
- Lines 345-365: `require_cost_library_governance_admin(target_workspace_id)` — only workspace admins can change governance
- Lines 1141-1160: Governance RPCs revoked from public/anon, granted to authenticated

## Client-Side Code

### Server Actions

- `src/lib/component-library/actions.ts` line 53: `ComponentLifecycleState` = `draft | in_production | available | discontinued | archived`
- `src/lib/component-library/actions.ts` line 551: `createCostLibraryComponent` — creates component with `source: "library"`, `isCustom: true`
- `src/lib/component-library/actions.ts` line 611: `updateCostLibraryComponent` — updates component metadata
- `src/lib/component-library/actions.ts` line 629: `upsertCostLibraryComponentPriceOption` — saves price option and cost entries via RPC
- `src/lib/component-library/actions.ts` line 648: `changeCostLibraryComponentLifecycleState` — changes lifecycle state
- `src/lib/component-library/actions.ts` line 675: `previewBulkArchiveLibraryComponents` — preview archive
- `src/lib/component-library/actions.ts` line 699: `executeBulkArchiveLibraryComponents` — execute archive

### UI Components

- `src/components/workshop/component-library/ComponentCard.tsx` line 16: imports `getStalenessLabel`, `getStalenessTone`
- `src/components/workshop/component-library/ComponentCard.tsx` line 68: `stalenessClass(tone)` helper
- `src/components/workshop/component-library/ComponentCard.tsx` lines 109-113: computes staleness tone/label and renders source metadata
- `src/components/workshop/component-library/ComponentCard.tsx` line 235: renders staleness badge in list view
- `src/components/workshop/component-library/ComponentCard.tsx` line 286: renders staleness badge in grid view

### Manager Surface

- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` — virtualized grid/list with facet filters including `COMPONENT_LIFECYCLE_FACET_LABELS`
- `canonical-feature-status.csv` line 81: LIB-005 references `ComponentLibraryManager.tsx` for supplier/brand directory governance

## Gaps

1. No UI surface exposes the `review_status`, `assigned_to`, `review_due_at` fields
2. No workflow exists to triage stale costs and assign refresh owners
3. No UI exists to accept/reject/supersede cost entries
4. No lock/unlock affordance is visible to curators
5. The stale queue index exists but no query uses it for a triage view
6. `ComponentCard` shows staleness but offers no action
7. No repository function queries `cost_library_cost_review_events`
8. No server action wraps the governance RPCs for client use

## Schema Verification

Run this to verify the migration is applied locally:

```bash
npx supabase db diff --linked
```

Or query the schema directly:

```sql
select column_name, data_type, column_default
from information_schema.columns
where table_name = 'cost_library_item_variant_cost_entries'
  and column_name in ('review_status', 'reviewed_by', 'reviewed_at', 'assigned_to', 'review_due_at', 'locked_by', 'locked_at', 'lock_reason', 'superseded_by', 'review_revision');
```

Expected: 10 rows.

## RPC Verification

```sql
select proname, proargnames, prorettype::regtype
from pg_proc
where proname in (
  'assign_cost_library_cost_refresh',
  'accept_cost_library_cost_entry',
  'lock_cost_library_cost_entry',
  'unlock_cost_library_cost_entry',
  'reject_cost_library_cost_entry',
  'supersede_cost_library_cost_entry'
);
```

Expected: 6 rows.

## Index Verification

```sql
select indexname, indexdef
from pg_indexes
where tablename = 'cost_library_item_variant_cost_entries'
  and indexname in ('cost_library_cost_review_queue_idx', 'cost_entries_one_accepted_current_per_option');
```

Expected: 2 rows.
