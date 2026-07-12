# UX-033 Target State

**Date:** 2026-06-23

## Goal

Library curator or supplier manager can see stale/conflicting sources, assign refresh, and lock the accepted cost. Cost provenance moves from stale/conflicted to reviewed/accepted with audit trail.

## Target Data Model

The target data model is already defined by `supabase/migrations/20260622143000_library_trust_governance.sql`:

- `cost_library_item_variant_cost_entries` has `review_status`, `reviewed_by`, `reviewed_at`, `review_note`, `assigned_to`, `review_due_at`, `locked_by`, `locked_at`, `lock_reason`, `superseded_by`, `review_revision`
- `cost_library_cost_review_events` records every state transition with `event_type`, `actor_id`, `from_status`, `to_status`, `reason`

## Target UI Surfaces

### 1. Stale Cost Queue View

A new view in the library manager that:
- Queries `cost_library_item_variant_cost_entries` using the `cost_library_cost_review_queue_idx`
- Filters by `review_status` in (`proposed`, `needs_review`)
- Shows `pricingDate`, `pricingSource`, `supplier`, `brand`, `assigned_to`, `review_due_at`
- Allows curator to assign refresh owner and set due date
- Calls `assign_cost_library_cost_refresh` RPC
- Sorts by `review_due_at` ascending, then `updated_at desc`

### 2. Cost Entry Review Panel

In the component detail/edit modal:
- Shows list of cost entries per price option
- Displays `review_status` badge (proposed/needs_review/accepted/rejected/superseded)
- Shows reviewer name, review date, review note
- Shows lock state (locked_by, locked_at, lock_reason)
- Actions: Accept, Reject, Lock, Unlock, Supersede
- Calls respective governance RPCs with `expected_review_revision` for optimistic concurrency
- Shows audit trail tab with `cost_library_cost_review_events`

### 3. Accepted Cost Lock Indicator

In `ComponentCard` and estimate sheet:
- When `review_status = 'accepted'` and `locked_at` is not null, show lock icon
- Tooltip shows `locked_by` and `lock_reason`
- Estimators see that cost is locked/accepted
- Locked costs cannot be edited without unlocking

### 4. Staleness Badge Upgrade

In `ComponentCard`:
- Staleness badge remains for visual scanning
- Clicking staleness badge navigates to stale queue or opens review panel
- Badge color changes if `review_status = 'accepted'` (green) vs `needs_review` (amber)
- Badge shows lock icon when locked

### 5. Audit Trail

In component detail:
- Tab or section showing `cost_library_cost_review_events`
- Filterable by cost entry
- Shows actor, from/to status, reason, timestamp
- Chronological order, newest first

## Target Permissions

- Workspace editors can VIEW review status and audit trail
- Workspace admins can ASSIGN refresh, ACCEPT/REJECT/LOCK/UNLOCK/SUPERSEDE cost entries
- `require_cost_library_governance_admin` enforces admin-only mutations
- Curator actions are recorded in audit trail with actor identity

## Target Verification

- `TV-LIBRARY-SOURCING`: Library sourcing workflow test for stale queue, reconciliation, and accepted-cost state
- Post-fix scenario: Library curator sees stale or conflicting supplier/cost-source data, assigns refresh, reconciles entries, and locks accepted cost
- All governance RPCs tested via server action wrappers
- All UI states tested via component tests

## Target States by Role

### Library Curator (Admin)

- Opens stale queue
- Sees cost entries sorted by urgency (due date)
- Assigns refresh to supplier manager with due date
- Reviews refreshed cost data
- Accepts or rejects updated costs
- Locks accepted costs for estimate use
- Views audit trail of all actions

### Supplier Manager

- Receives refresh assignment notification
- Updates cost data (unit cost, pricing source, pricing date)
- Submits refreshed cost for review
- Views status of submitted costs

### Estimator

- Browses component library
- Sees green badge for accepted/locked costs
- Sees amber badge for needs_review costs
- Sees red badge for rejected costs
- Trusts locked costs in estimates
- Cannot accidentally use stale costs

## Success Metrics

- Stale queue view loads in <500ms for 1000 entries
- Cost entry review actions complete in <2s
- No estimate uses a cost with `review_status = 'rejected'`
- All accepted costs have `reviewed_by` and `reviewed_at` populated
- Audit trail shows 100% of governance actions
