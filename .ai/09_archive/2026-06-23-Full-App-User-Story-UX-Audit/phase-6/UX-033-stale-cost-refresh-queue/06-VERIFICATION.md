# UX-033 Verification

**Date:** 2026-06-23
**Targeted Verification:** TV-LIBRARY-SOURCING

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
- Server action wrappers for governance RPCs
- Revision conflict handling

### DOM Tests

```bash
bun run test:dom
```

Must pass. Add tests for:
- Stale queue component rendering
- Review panel state transitions
- ComponentCard staleness badge color logic

## Targeted Verification ID: TV-LIBRARY-SOURCING

### TV-LIBRARY-SOURCING-001: Schema Presence

Verify migration columns and RPCs exist:

```sql
-- Run in Supabase SQL Editor
select column_name, data_type
from information_schema.columns
where table_name = 'cost_library_item_variant_cost_entries'
  and column_name in ('review_status', 'reviewed_by', 'reviewed_at', 'assigned_to', 'review_due_at', 'locked_by', 'locked_at', 'lock_reason', 'superseded_by', 'review_revision');
```

Expected: 10 rows returned.

### TV-LIBRARY-SOURCING-002: RPC Presence

```sql
select proname
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

Expected: 6 rows returned.

### TV-LIBRARY-SOURCING-003: RLS Policy Presence

```sql
select polname, polcmd
from pg_policies
where tablename in ('cost_library_item_variant_cost_entries', 'cost_library_cost_review_events')
  and polname like '%variant cost entries%' or polname like '%cost review events%';
```

Expected: At least 2 rows (view policies for both tables).

### TV-LIBRARY-SOURCING-004: Action Test

Write and run a test that:
1. Creates a workspace admin user
2. Creates a component with a price option and cost entry
3. Calls `assignCostRefresh` action
4. Verifies `review_status = 'needs_review'`
5. Calls `acceptCostEntry` action
6. Verifies `review_status = 'accepted'` and `is_current = true`
7. Calls `lockCostEntry` action
8. Verifies `locked_at` is not null
9. Calls `unlockCostEntry` action
10. Verifies `locked_at` is null

### TV-LIBRARY-SOURCING-005: Component Test

Write and run a test that:
1. Renders `ComponentCard` with `review_status = 'accepted'`
2. Asserts green staleness badge
3. Renders `ComponentCard` with `review_status = 'needs_review'`
4. Asserts amber staleness badge

## Post-Fix Scenario Test

Name: `library-curator-stale-queue-workflow`

Steps:
1. Curator navigates to library stale queue
2. Sees cost entry with `pricingDate` older than 90 days and `review_status = 'proposed'`
3. Assigns refresh to self with due date next week
4. Refreshes cost data
5. Accepts the cost entry with note "Updated from supplier quote June 2026"
6. Locks the accepted cost with note "Locked for Q3 estimates"
7. Views audit trail and sees assigned, accepted, locked events
8. Estimator views library and sees green badge + lock icon on component

## Evidence Artifacts

- Test output showing TV-LIBRARY-SOURCING-004 and TV-LIBRARY-SOURCING-005 pass
- Screenshot of stale queue view
- Screenshot of review panel
- Screenshot of ComponentCard with accepted/locked state
