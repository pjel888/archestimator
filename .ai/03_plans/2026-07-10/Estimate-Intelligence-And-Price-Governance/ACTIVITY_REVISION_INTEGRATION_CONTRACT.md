# Activity Revision Integration Contract

## Ownership Boundary

This artifact isolates `REQ-003`, `AC-005`, `AC-006`, `RISK-005`,
`DEC-AUTO-006`, and UNIT-006. Activity History owns normalized event vocabulary,
event persistence/restoration, ordering primitives, and its shared contract.
This pack owns only the analytical adapter, forward revision-fact sidecar, and
health/revision DTO. It creates no named estimate versions or restore workflow.

This Activity contract is distinct from the Activation pack's later
`ACT-RECEIPT-ESTIMATE-HEALTH-v1` producer receipt.

## Integration Admission

Before any Activity-owned shared-file edit, UNIT-006 validates the current
Activity manifest, scoped diff, exported contract version/hash, changed-file
inventory, and named lease. If compatible exported types/adapters already exist,
this pack consumes them without editing Activity files. Receipt or source drift
blocks only the integration slice and requires re-audit; it does not justify
duplicating event taxonomy.

## Forward Fact Production

Every forward row insert/update/replace/move/delete/restore, sheet adjustment,
template/subtree copy, and AI package mutation writes its Activity event and a
complete ordered fact set in the same D1 batch/transaction. Facts carry stable
ordinal, same workspace/project/estimate identity, canonical before/after money
inputs, scope/node/tombstone references, and completeness/schema marker.

A failed event or fact write rolls back the entire mutation. Bulk work may chunk
only between complete events. `(event_id, ordinal)` is unique and replay-safe.
Unsupported row restore remains unavailable until a complete tombstone exists;
it cannot synthesize facts.

## Reconstruction Algorithm

1. User selects an explicit prior event within the current estimate.
2. Repository authorizes project/estimate and verifies the Activity receipt.
3. Capture current same-estimate high-water `(occurred_at,event_id)`.
4. Read events/facts in `(baseline,current_high_water]`, ordered by event key then
   fact ordinal.
5. Verify same estimate, complete schema/ordinals, unique IDs, before/after or
   tombstone data, and no range gaps.
6. Decompose quantity, rate, adjustment, misc, scope, and residual deltas.
7. Recheck high-water. Return only if stable and reconciled; otherwise return a
   typed unavailable reason.

An unknown but complete fact kind may contribute to explicit `unclassified`
residual. Missing legacy facts, cross-estimate boundary, partial before/after,
ordinal/event gap, duplicate/late fact, incomplete tombstone, or changed
high-water produces `unavailable`. No historical heuristic backfill or named
cause is invented.

## Denial, Concurrency, And Evidence

Cross-workspace/project/estimate IDs follow existing denial/not-found behavior
without leaking event or row metadata. Concurrent writes are handled by the
captured/rechecked high-water, not by merging a moving range. Retry uses stable
event/fact IDs and cannot double-count.

`TEST-006` combines the producer-completeness fixture and reconstruction tests for
atomic facts, ordering, same-timestamp IDs, legacy/partial/gap/duplicate/late,
tombstone, cross-estimate, high-water drift, residual, and no named-version UI.
Handback includes both pack receipts/hashes, selected range, high-water values,
unavailable code or reconciled categories, and earliest producer/adapter owner.

