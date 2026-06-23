# UX-033 Acceptance Criteria

**Date:** 2026-06-23
**Issue ID:** UX-033
**Targeted Verification:** TV-LIBRARY-SOURCING

## Post-Fix Scenario

Library curator sees stale or conflicting supplier/cost-source data, assigns refresh, reconciles entries, and locks accepted cost. Cost provenance moves from stale/conflicted to reviewed/accepted with audit trail.

## Acceptance Criteria

### AC-1: Stale Queue Visibility

Given a workspace with cost library items
When a curator opens the stale queue view
Then they see cost entries with `review_status` in (`proposed`, `needs_review`)
And entries are sorted by `review_due_at` then `updated_at desc`
And each row shows: component name, variant label, pricing source, pricing date, supplier, brand, current status

### AC-2: Assign Refresh Owner

Given a cost entry in `proposed` status
When a curator assigns a workspace member as refresh owner with a due date
Then the entry status changes to `needs_review`
And `assigned_to` is set to the member
And `review_due_at` is set
And a `cost_library_cost_review_events` row is created with `event_type = 'assigned'`
And `review_revision` increments by 1

### AC-3: Accept Cost Entry

Given a cost entry in `needs_review` status
When a curator accepts it with a reason
Then the entry status changes to `accepted`
And `is_current` becomes true
And `reviewed_by` and `reviewed_at` are set
And any other `accepted` entries for the same `price_option_id` are superseded
And `active_cost_entry_id` on the price option is updated
And a `cost_library_cost_review_events` row is created with `event_type = 'accepted'`

### AC-4: Lock Accepted Cost

Given an accepted cost entry
When a curator locks it with a reason
Then `locked_by`, `locked_at`, and `lock_reason` are set
And the entry cannot be rejected until unlocked
And a `cost_library_cost_review_events` row is created with `event_type = 'locked'`

### AC-5: Unlock Accepted Cost

Given a locked accepted cost entry
When a curator unlocks it with a reason
Then `locked_by`, `locked_at`, and `lock_reason` are cleared
And a `cost_library_cost_review_events` row is created with `event_type = 'unlocked'`

### AC-6: Reject Cost Entry

Given a cost entry that is not locked
When a curator rejects it with a reason
Then the entry status changes to `rejected`
And `is_current` becomes false
And `active_cost_entry_id` is cleared if it pointed to this entry
And a `cost_library_cost_review_events` row is created with `event_type = 'rejected'`

### AC-7: Supersede Cost Entry

Given two cost entries for the same price option
When a curator supersedes one with the other
Then the target entry status changes to `superseded`
And `is_current` becomes false
And the replacement entry status changes to `accepted`
And `is_current` becomes true
And `active_cost_entry_id` is updated to the replacement

### AC-8: Revision Conflict Handling

Given a cost entry
When two curators attempt to mutate it simultaneously with stale `expected_review_revision`
Then the second call receives a `40001` revision conflict error
And the UI shows a retry prompt with fresh data

### AC-9: Audit Trail Visibility

Given a cost entry with review history
When a curator views the component detail
Then they see a chronological list of `cost_library_cost_review_events`
With actor name, from/to status, reason, and timestamp

### AC-10: Staleness Badge Upgrade

Given a component with accepted cost entries
When an estimator views the library
Then the component card shows a green staleness badge (accepted)
And a lock icon if the cost is locked

## Edge Cases

- Deleted cost entries cannot be accepted (RPC enforces this)
- Only accepted entries can be locked (constraint enforced)
- Locked entries must be unlocked before rejection (RPC enforces)
- Superseded entries must reference a replacement in the same workspace/item/price_option (trigger enforces)
