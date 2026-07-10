# Performance, Reliability, And Observability

This supporting evaluator model expands `PERF-001`, `OPS-001`, `RISK-002/004`,
and `GATE-PERF-001/GATE-OPS-001`. It introduces no unsupported latency claim.

## User-Visible Reliability Goals

- Opening Projects for a returning user does not add template/cohort reads; the
  activation seed is loaded only for a true zero-project state.
- Checklist progress is one workspace/user read and does not block ordinary
  estimate editing when an integration is unavailable.
- A successful domain mutation cannot lose its activation milestone because the
  outbox intent commits with the mutation.
- Admin cohort pages are bounded, stable, privacy-minimized, and do not perform
  N+1 reads.

## Evaluators And Regression Thresholds

| Surface | Fixture/evaluator | Pass boundary | Regression action |
|---|---|---|---|
| Progress lookup | One authorized workspace/user with and without progress | One keyed repository lookup, shaped result | Reject broad scan or client-side truth |
| Projects true-zero seed | Zero vs non-zero owned-project fixtures | Template/progress seed only on zero-state path | Restore conditional server load |
| Cohort query | 10k users, mixed stages/support, cursor edges | Named indexes used, one bounded query/CTE, <=100 rows, stable pages | Block rollout; repair query/index |
| Outbox reconciliation | Replay, crash, expired lease, concurrent workers | One event, maximum progress, observable bounded retry/dead state | Disable claimers; repair idempotently |
| Retention | Clock at every TTL boundary | Exact due rows affected; holds and active progress protected | Disable purge; fix forward |

The pack does not claim a millisecond latency budget because no current measured
baseline is collected here. Query-plan, cardinality, row cap, query count, and
crash/idempotency behavior are the falsifiable planning budgets. Any later timing
claim requires a measured evaluator and fresh receipt.

## Signals

Use redacted structured signals for outbox pending/processing/delivered/dead
counts, oldest pending age, lease expiry/reclaim, attempts, retention rows
examined/removed/skipped-by-hold, cohort query duration/row count, and shaped
unavailable errors. Correlate by safe operation/run identifiers, not raw tenant or
credential material. Alert ownership and operator presentation remain with Beta
Operating; this pack supplies stable query and diagnostic fields.

## Degraded And Recovery Behavior

- D1 unavailable: user sees retry/support; no fabricated completion or local-only
  success. Cohort caller receives unavailable, not an empty-success lie.
- External producer receipt missing: the corresponding checklist/integration row
  is `not_available`; core editing continues.
- Reconciler backlog/dead row: domain mutation remains committed; bounded repair
  resumes from canonical intent.
- Bad query plan, privacy-expanded DTO, or unbounded result: hold rollout and
  return the repair to `UNIT-006`.

## Proof Boundary

Repository, unit, DOM, query-plan, and local structured-log receipts are the
evidence classes for this pack. Browser proof is limited to routed persistence,
focus, and reflow. Hosted/provider latency or alert delivery is not claimed.
