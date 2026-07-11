# Activity History Execution Amendment

## Purpose

This amendment supersedes the migration allocations in `11_IMPLEMENTATION_PLAN.md`
without mutating its closed UNIT-001 through UNIT-010 evidence. The prior
Generation 7 receipt is stale because `migrations/0055_collaboration_manager_floor_integrity.sql`
was created before Activity consumed its provisional slot.

## Current Allocation Contract

The current Beta Readiness Program generation assigns the Activity package two
non-overlapping, unconsumed paths after the observed `0055` tail:

| Unit | Planned path | Purpose |
|---|---|---|
| UNIT-011 | `migrations/0060_activity_history_indexes.sql` | Activity-feed lookup indexes and bounded query support. |
| UNIT-012 | `migrations/0065_activity_history_lifecycle.sql` | Durable activity outbox and legal-hold state. |

Before either migration is created, re-read the generation receipt and verify
the generation, migration-tail digest, both Activity allocation digests, the
allocation-set digest, receipt digest, every owner-manifest digest, exact path,
and `UNCLAIMED` status. `0060` was consumed by UNIT-011; the current
generation reissued the remaining Activity lifecycle allocation as `0065`.

## UNIT-011 Performance Contract

1. Add only additive indexes for the estimate-event timeline access paths.
2. Do not calculate exact counts on the initial activity-feed page unless the
   caller explicitly requests them.
3. Bound publication reads and accumulated client pages; replace quadratic
   grouping with map-based grouping.
4. Prove index/query shape and a 500-event grouping fixture with focused tests.

## UNIT-012 Lifecycle Contract

1. Add workspace-scoped durable outbox records and legal-hold records in the
   leased lifecycle migration.
2. Write outbox records atomically with history-event insertion where the D1
   batch owns both statements; retain idempotency on the event identifier.
3. Retention skips events under an active legal hold and reports the skip
   without deleting the event or its outbox state.
4. Enforce workspace predicates on every lifecycle read/write and prove cross-
   workspace denial, duplicate delivery idempotency, and legal-hold retention.

## Completion

UNIT-008 remains dependent on fresh UNIT-011 and UNIT-012 evidence. This
amendment changes no verified claim from the frozen execution artifact.
