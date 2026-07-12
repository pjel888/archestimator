# UX-033 Implementation Plan

**Date:** 2026-06-23
**Phase:** Phase 4 (new workflow foundations)

## Sequencing

This work must follow Phase 1-3 and precede Phase 5 UI surface work, per `03-sequencing-dependencies-and-conflicts.md` line 15:

> Phase 4: New workflow foundations — Access-path, data, and security choices must precede UI surface work.

And line 26:

> Supplier/cost governance (`UX-033`) | Data model, RLS, accepted-cost state decision | Cost trust requires persistent governance semantics.

## Implementation Steps

### Step 1: Schema Verification (1 session)

Verify the migration `20260622143000_library_trust_governance.sql` is applied to the linked remote:

```bash
npx supabase db diff --linked
```

Confirm columns exist on `cost_library_item_variant_cost_entries`:
- `review_status`
- `reviewed_by`, `reviewed_at`, `review_note`
- `assigned_to`, `review_due_at`
- `locked_by`, `locked_at`, `lock_reason`
- `superseded_by`, `review_revision`

Confirm RPCs exist:
- `assign_cost_library_cost_refresh`
- `accept_cost_library_cost_entry`
- `lock_cost_library_cost_entry`
- `unlock_cost_library_cost_entry`
- `reject_cost_library_cost_entry`
- `supersede_cost_library_cost_entry`

Confirm RLS policies exist:
- `members can view variant cost entries`
- `admins can view cost review events`

### Step 2: Repository Queries (1 session)

Add repository functions in `src/lib/repositories/cost-library-repository.ts`:

- `getStaleCostEntries(workspaceId, options)` — query using `cost_library_cost_review_queue_idx`
- `getCostEntryReviewEvents(costEntryId)` — query `cost_library_cost_review_events`
- `getCostEntryWithReviewStatus(costEntryId)` — select with review fields

### Step 3: Server Actions (1 session)

Add server actions in `src/lib/component-library/actions.ts`:

- `assignCostRefresh(costEntryId, assigneeId, reviewDueAt, reason)` — wraps `assign_cost_library_cost_refresh` RPC
- `acceptCostEntry(costEntryId, expectedRevision, reason)` — wraps `accept_cost_library_cost_entry` RPC
- `lockCostEntry(costEntryId, expectedRevision, reason)` — wraps `lock_cost_library_cost_entry` RPC
- `unlockCostEntry(costEntryId, expectedRevision, reason)` — wraps `unlock_cost_library_cost_entry` RPC
- `rejectCostEntry(costEntryId, expectedRevision, reason)` — wraps `reject_cost_library_cost_entry` RPC
- `supersedeCostEntry(costEntryId, replacementCostEntryId, expectedRevision, reason)` — wraps `supersede_cost_library_cost_entry` RPC

Each action must:
1. Call `requireCurrentUserContext()`
2. Call `ensureDefaultWorkspace()`
3. Call `assertCanManageLibrary()` or stricter admin check
4. Call RPC with `expected_review_revision`
5. Handle `40001` revision conflict as retryable error
6. Call `revalidateLibraryRoutes()`
7. Return typed result

### Step 4: Stale Queue UI (2 sessions)

Add stale queue view to library manager:

- New route or tab: `/workshop/library/stale-queue` or tab within library manager
- Query stale entries via TanStack Query
- Show table with: component name, variant, pricing source, pricing date, supplier, brand, status, assigned to, due date
- Actions: Assign, Accept, Reject, Supersede
- Bulk actions for assigning multiple entries

### Step 5: Cost Entry Review Panel (2 sessions)

Add review panel to component edit modal:

- In `AddComponentModal` or new `ComponentReviewPanel`
- List cost entries per price option
- Show review status badge
- Show reviewer, date, note
- Show lock state
- Action buttons with confirmation modals
- Audit trail tab

### Step 6: ComponentCard Upgrade (1 session)

Update `src/components/workshop/component-library/ComponentCard.tsx`:

- Line 109: `getStalenessTone` now considers `review_status`
- If `review_status = 'accepted'`, tone is `positive` (green)
- If `review_status = 'needs_review'`, tone is `warning` (amber)
- Click handler on staleness badge opens review panel

### Step 7: Tests (2 sessions)

Write tests:

- Unit tests for repository queries
- Action tests for each governance action (mock RPC)
- Component tests for stale queue view
- Component tests for review panel
- Post-fix scenario test: curator assigns refresh, accepts cost, locks it

## Rollback Plan

1. Schema: migration already applied; no rollback needed for schema
2. Code: feature-flag new UI surfaces behind `NEXT_PUBLIC_LIBRARY_GOVERNANCE_ENABLED`
3. Data: no destructive data changes; existing cost entries default to `review_status = 'proposed'`
4. RPC: RPCs are already deployed and safe to call (they enforce admin rights)

## Conflict Avoidance

- Do not modify `UX-013` estimate-sheet code; only modify `ComponentCard` in library
- Coordinate with estimate lead if staleness contract changes (e.g., new tone values)
- Do not touch attachment review code (UX-034) except for shared enum/types
