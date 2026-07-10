# Performance, Reliability, And Observability

## Scope

This artifact is the measured evaluator/signal contract for `PERF-001`,
`OPS-001`, `AC-012`, `AC-014`, `TEST-007`, `GATE-003`, and UNIT-004/005/008.
It contains targets only; no benchmark or readiness PASS is claimed.

## Budgets

| Surface | Fixture | Target | Failure/rollback trigger | Evaluator |
|---|---|---|---|---|
| Pure health | 5,000 normalized rows, fixed clock, 20 warm samples | p95 <50 ms | p95 >75 ms or worse-than-linear growth | benchmark script and `estimate-health-benchmark.test.ts` |
| Repository fact load | 5,000 rows, 50 categories, 100 suppliers | <=5 D1 statements after auth/project resolution; no per-row query; named-index plan | Statement count increase or unindexed policy/fact scan | query-budget test with counter and `EXPLAIN QUERY PLAN` |
| Summary payload | 5,000 rows, 10 issue classes | <200 KB before compression; detail page <=100 IDs | >250 KB or unbounded row details | serialized byte counter |
| Client render | 10 KPI/risk groups, 100 details | <=100 detail rows mounted; stable interaction/layout | Unbounded mount or interaction regression | DOM render/profiler counter |
| 50k reasoning | Synthetic normalized facts | Deterministic summary/truncation; no extra proportional copies beyond normalized facts | Unexplained memory >2x recorded 5k scaling | benchmark/static evaluator |

Receipts record hardware/OS, Node/Bun versions, fixed clock, fixture and scoped
diff hashes, policy/evaluator versions, warmup/sample count, p50/p95/max, delta
and peak RSS, statements/plan, payload bytes, truncation, failure count, artifact
digest, and timestamp. Local measurements are not hosted proof.

## Reliability Contract

- Evaluation is deterministic and side-effect free for fixed facts/clock/policy.
- Repository paging and continuation cursors are versioned, tenant-constrained,
  and stable under retry; tampered/stale cursors cannot widen scope.
- Policy revision participates in cache identity and invalidation. A stale client
  cannot combine old thresholds with new facts.
- Truncation is fail-closed and visible; it cannot silently drop warnings then
  report healthy.
- Revision reconstruction captures/rechecks high-water and returns unavailable on
  drift rather than serving a mixed-time answer.
- Migration/event/fact failure is atomic; no partial fact set or false receipt.
- UI/repository failure never falls back to a stale healthy grade.

## Structured Signals And Redaction

Emit operation name, request ID, duration bucket, selected estimate count,
evaluated row count, issue count by stable rule ID, policy/evaluator revision,
query/payload/truncation facts, and success/failure class. Exclude project/client
names, user/actor values, bulk/raw row IDs, descriptions, raw amounts, source
URLs, policy actor, Activity payloads, and URL tokens.

Touched repository/actions use existing structured errors and logger helpers.
`validate:error-handling` prohibits swallowed sensitive failures and raw console
logging. This plan does not add a production alert/dashboard claim; hosted
observability requires separate hosted evidence.

## Triage And Fix-Forward

Performance failure returns to the earliest query/evaluator/DTO/render owner with
the measured dimension, sample receipt, and regression comparison. Optimization
cannot weaken authorization, exact rule membership, deterministic grade,
truncation visibility, or provenance truth. UI may be disabled while additive
data writes and compatibility reads remain; destructive D1 rollback is not the
default recovery.

