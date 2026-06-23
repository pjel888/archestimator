# UX-033 Blast Radius

**Date:** 2026-06-23
**Issue ID:** UX-033
**Conflict Group:** Library/cost/storage

## Blast Radius Checklist

Per `05-security-data-and-provider-blast-radius.md`, answer before implementing:

### Data

1. **Which tables/columns change?**
   - `cost_library_item_variant_cost_entries`: review_status, reviewed_by, reviewed_at, review_note, assigned_to, review_due_at, locked_by, locked_at, lock_reason, superseded_by, review_revision — already added by migration
   - `cost_library_cost_review_events`: new table for audit trail
   - `cost_library_item_price_options`: active_cost_entry_id updated by RPCs

2. **Is a migration required?**
   - No. Migration `20260622143000_library_trust_governance.sql` already applied.

3. **Is existing data affected?**
   - All existing cost entries default to `review_status = 'proposed'`, `review_revision = 1`.
   - No destructive changes.

4. **Rollback?**
   - Code changes can be rolled back by reverting commits.
   - Schema changes are additive and safe.
   - Feature-flag new UI surfaces behind `NEXT_PUBLIC_LIBRARY_GOVERNANCE_ENABLED` if needed.

### Authz / RLS

1. **Which roles touch this?**
   - Workspace admins (mutate via governance RPCs)
   - Workspace editors/viewers (read via select policies)

2. **Are policies already in place?**
   - Yes. `members can view variant cost entries` (select)
   - `admins can view cost review events` (select)
   - Mutations are RPC-based with `require_cost_library_governance_admin` check

3. **Is the blast radius contained to the expected workspace?**
   - Yes. All RPCs and triggers enforce `workspace_id` scope.

### Provider / Storage

1. **Does this touch hosted files?**
   - No. This is cost metadata only.

2. **Does this touch external APIs?**
   - No.

### Public / Sharing

1. **Does this expose data to shared links?**
   - No. Review status is internal governance.

### Performance

1. **Are new indexes used?**
   - `cost_library_cost_review_queue_idx` on `(workspace_id, review_status, review_due_at, updated_at desc)`
   - `cost_entries_one_accepted_current_per_option` unique partial index

2. **Is the query pattern efficient?**
   - Stale queue query hits the composite index.
   - Cost entry lookups by ID are primary key.

### Security

1. **Are there injection risks?**
   - No. All mutations go through parameterized RPCs.

2. **Are there privilege escalation risks?**
   - No. `require_cost_library_governance_admin` enforces workspace admin.

3. **Are audit events recorded?**
   - Yes. Every governance action inserts into `cost_library_cost_review_events`.

## Affected Files

| File | Change Type | Reason |
|---|---|---|
| `src/lib/repositories/cost-library-repository.ts` | Add | New queries for stale queue and review events |
| `src/lib/component-library/actions.ts` | Add | New server action wrappers for governance RPCs |
| `src/components/workshop/component-library/ComponentCard.tsx` | Modify | Staleness badge color logic |
| `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` | Modify | Add stale queue tab/view |
| `src/components/workshop/component-library-manager/AddComponentModal.tsx` | Modify | Add review panel tab |
| `tests/vitest/component-library-governance.test.ts` | Add | Governance action tests |
| `tests/vitest/stale-queue.test.tsx` | Add | Stale queue component tests |

## Conflict Avoidance

- Do not modify `UX-013` estimate-sheet code; only modify `ComponentCard` in library
- Coordinate with estimate lead if staleness contract changes (e.g., new tone values)
- Do not touch attachment review code (UX-034) except for shared enum/types
- Keep changes scoped to library surfaces; do not leak governance UI into estimate sheet

## Rollback Details

### Code Rollback

If the feature needs to be disabled:
1. Revert commits introducing stale queue and review panel
2. Keep `ComponentCard` staleness badge as-is (no rollback needed)
3. RPCs remain deployed but unused

### Data Rollback

No data rollback needed. All schema changes are additive:
- `review_status` defaults to `proposed`
- Existing cost entries are unaffected
- New audit events table is empty until features are used

### Feature Flag

If desired, wrap new UI behind environment variable:
```typescript
const libraryGovernanceEnabled = process.env.NEXT_PUBLIC_LIBRARY_GOVERNANCE_ENABLED === "true";
```

## Monitoring

After deployment, monitor:
- RPC execution times for governance functions
- Error rate for `40001` revision conflicts
- Queue growth rate (stale entries should decrease over time)
- User engagement with stale queue view
