# Performance Reliability Observability

## Current Evidence

| Evidence | Status |
|---|---|
| Route transition readiness | Current state records cold direct `2404ms`, no-hover `365ms`, hover prefetch `237ms`, warm revisit `349ms`, with zero parent fallback/overlay and max one sheet skeleton. |
| Route evaluator | `scripts/check-route-transition-readiness.ts` enforces route budgets. |
| Render isolation | Perf tests cover row render relief, memoization, cursor isolation, and virtualization. |
| Tree hover pure budget | `tests/vitest/estimate-tree-drag-over-perf.test.ts` covers pure function hover budgets. |
| Row move browser proof | `e2e/estimate-row-move.spec.ts` proves row move persistence when gated env is available. |

Gap: current evidence does not prove sheet interaction latency, drag responsiveness, queue age, stale success handling, cache freshness after every mutation, offline retry, or large-sheet degraded UX as a single evaluator contract.

## MVP Budgets

| Area | Budget |
|---|---|
| Cold direct sheet route | p50 <= 2500ms, p95 <= 3500ms, no parent fallback, <= 1 sheet skeleton episode |
| No-hover route transition | p50 <= 750ms, p95 <= 1000ms, no overlay |
| Hover-prefetch / warm revisit | p50 <= 500ms, p95 <= 750ms |
| Initial visible row mount | Viewport + overscan; never mount all 5000 initial rows |
| Typing in row cell | Event-to-DOM p95 <= 16ms at 500 rows, <= 32ms at 5000 capped rows, worst <= 50ms |
| Totals update after edit | Visible total update <= 50ms; focus/value retained |
| Row drag hover | p95 <= 16ms at 500 rows, <= 32ms at 5000 rows |
| Row drop | Optimistic DOM reorder <= 100ms; persisted ack p95 <= 1500ms; one server action/RPC |
| Tree drag hover | Pure budgets stay <16ms at 1k and <50ms at 5k/10k; browser p95 <= 32ms at 5k |
| Tree drop | Optimistic DOM <= 100ms; persisted ack p95 <= 1500ms; invalid drops produce zero POSTs |
| Persistence queue | Pending visible <= 100ms; failure visible <= 500ms; local pending age <= 5s; degraded pending age <= 15s |
| Network round trips | Normal row edit/move/drop should not trigger route RSC reload; one mutation request per committed operation |
| Cache freshness | Mutation + reload/navigation reflects current rows/order/totals without waiting TTL |
| Large-sheet limit | Supported cap remains 1500 nodes / 5000 rows; load-limited state disables unsafe movement and explains degraded behavior |
| Offline/degraded | Offline visible <= 500ms; draft preserved; retry drains in order without duplicate success |

## Reliability Contracts

| Contract | Target |
|---|---|
| Queue ordering | Per-row mutations serialize; cross-row/component moves coordinate source and target; row moves coordinate source and target nodes. |
| Stale success | Older server success cannot overwrite newer local state. |
| Conflict handling | Revision conflicts show local failure and trigger active refetch when needed. |
| Retry | Retries reuse mutation IDs and do not create duplicate events. |
| Rollback | Rollback restores the exact affected rows/nodes only; unrelated changes survive. |
| Missing server result | If reconciliation cannot find returned rows in cache, active refetch occurs and no silent no-op is allowed. |

## Observability Plan

Add minimal product-safe metrics/events:

| Metric | Fields |
|---|---|
| `estimate_mutation_started` | kind, origin surface, row/node count, queue depth, load-limited flag |
| `estimate_mutation_settled` | kind, duration, success/failure/conflict, retry count, stale result ignored |
| `estimate_mutation_pending_escalated` | kind, pending age, online/offline, queue depth |
| `estimate_drag_drop_timing` | kind, row count, node count, hover p95, drop-to-DOM, drop-to-ack |
| `estimate_cache_refetch_reason` | kind, reason: conflict/missing-result/manual/reload |

Privacy constraints:

- no row descriptions/material text,
- no source URLs/signed URLs,
- no raw user emails,
- no image metadata beyond approved IDs/hashes.

## Evaluators

| Surface | Fixture | Evaluator |
|---|---|---|
| Route load | Authenticated cold/no-hover/hover/warm | Existing route transition harness plus readiness script |
| Sheet typing | 50/200/500/5000 rows | Budgeted Vitest render p95/worst and browser Event Timing/Long Task |
| Row drag/drop | 200/1000/5000 rows | Playwright timing and network capture |
| Tree drag/drop | 1k/5k/10k nodes | Existing pure Vitest plus browser timing |
| Persistence queue | Delayed/failing mocked server actions | Vitest fake timers and mutation coordinator tests |
| Cache invalidation | Insert/update/delete/move/restore/sheet adjustment + reload | Repository/server-action tests plus browser smoke |
| Offline/degraded | Network abort/offline context | Playwright offline scenario |
| Large sheet | 1500 nodes / 5000 rows | DOM mounted count and load-limited controls |

## Known Gaps

- No full APM/error-tracking path is documented for production-user sheet metrics.
- Existing perf tests need pass/fail thresholds rather than only recorded timings.
- Browser proof should be targeted to browser-only claims; static/DOM tests remain preferred for source and cache contracts.
