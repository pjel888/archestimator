# UNIT-009 · Retention + reuse metrics

- **Requirement:** REQ-008
- **Priority:** P0 · **Effort:** S · **Risk:** LOW · **Status:** PLANNED
- **Depends on:** UNIT-002 (event coverage), UNIT-007 (dashboard)
- **Evidence:** EVID-009

## Goal

`/admin` Beta health card shows week-1 and week-4 active-workspace rates and
a library-reuse rate, so the reuse thesis is testable with data.

## Source evidence (commit `a41a07d01`)

- `src/lib/onboarding/activation-retention.ts:164-206` — `purgeExpiredActivationData`
  deletes events older than 180 days. This is **data TTL**, not user
  retention. `beta_activation_retention_holds` (`:105-117`) is a legal-hold
  mechanism, not a metric.
- No `retention_week_N`, no cohort return-rate, no calendar grid anywhere in
  source.
- The schema supports reuse detection: `estimate_row_items.source_library_item_id`
  and `pricing_provenance_origin` (`migrations/0072_estimate_intelligence_inputs.sql:60-80`).
  No metric computes it.

## Implementation

- `src/lib/admin/beta-health-repository.ts` (extends UNIT-007):
  - `computeWeekNActiveWorkspaces(weekN)` — SQL over `beta_activation_events`
    grouping workspaces by first-activity week and counting those with
    activity in week N.
  - `computeLibraryReuseRate(windowDays)` — SQL over
    `estimate_row_items.source_library_item_id` non-null in estimates
    created >7 days after the source item was first priced.
- Surface both numbers on the `/admin` Beta health card.
- Manual cross-check against raw SQL before exposing.

## Acceptance evidence

- Numbers render on `/admin`; manual SQL cross-check agrees.
- Week bucketing is correct (no off-by-one).
- Reuse rate excludes same-day reuse (true cold-start reuse only).

## Test decision

`test_requirement: NOT_REQUIRED`. SQL inspection + manual cross-check proves
correctness. `TEST_PROPOSAL`: SQL fixture test once queries land; risk:
off-by-one in week bucketing silently misreads the cohort.

## Recovery

Revert by hiding the two metric tiles; underlying queries are read-only and
additive.

## Completion signal

`/admin` shows week-1 / week-4 active workspace % and library-reuse rate,
recomputable on page-load.
