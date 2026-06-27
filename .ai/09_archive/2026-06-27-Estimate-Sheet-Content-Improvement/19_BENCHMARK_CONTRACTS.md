# Benchmark Contracts

## Purpose

This document defines what "lag-free" means for the estimate sheet MVP. Future implementation cannot claim speed readiness without fresh evidence against these budgets.

## Benchmark Matrix

| ID | Scenario | Fixture | Budget | Evidence Artifact |
|---|---|---|---|---|
| BENCH-ROUTE-001 | Cold direct target route load | Authenticated target route | p50 <= 2500ms, p95 <= 3500ms, <= 1 sheet skeleton, no parent fallback | Route transition JSON + readiness script output |
| BENCH-ROUTE-002 | No-hover route transition | Project/workshop to estimate route | p95 <= 1000ms, no overlay | Route transition JSON |
| BENCH-ROUTE-003 | Hover-prefetch / warm revisit | Same target route | p95 <= 750ms | Route transition JSON |
| BENCH-TYPE-001 | Type row material/quantity/misc | 500 rows | Input-to-DOM p95 <= 16ms, worst <= 50ms | Vitest/browser timing |
| BENCH-TYPE-002 | Type row material/quantity/misc | 5000 capped rows | Input-to-DOM p95 <= 32ms, worst <= 50ms | Browser timing + mounted rows |
| BENCH-TOTAL-001 | Edit value and update totals | 500/5000 rows | Visible total update <= 50ms | DOM/browser timing |
| BENCH-DND-001 | Row drag hover | 500 rows | p95 <= 16ms | Browser timing |
| BENCH-DND-002 | Row drag hover | 5000 rows | p95 <= 32ms | Browser timing |
| BENCH-DND-003 | Row drop/reorder | 500/5000 rows | Drop-to-DOM <= 100ms; ack p95 <= 1500ms; one mutation request | Browser timing + network capture |
| BENCH-TREE-001 | Tree drag hover | 1k/5k/10k nodes | Pure: <16ms at 1k, <50ms at 5k/10k; browser p95 <= 32ms at 5k | Vitest + browser |
| BENCH-QUEUE-001 | Slow server mutation | Delayed row update/move/delete | Pending visible <= 100ms; no sheet-wide freeze | DOM fake timers |
| BENCH-QUEUE-002 | Failed mutation | Failing row update/move/delete | Failure visible <= 500ms; Retry/Revert visible | DOM fake timers |
| BENCH-QUEUE-003 | Degraded/offline mutation | Offline context | Offline visible <= 500ms; local draft preserved; retry drains in order | Playwright offline |
| BENCH-CACHE-001 | Mutation then reload/navigation | Insert/update/delete/move/restore | Fresh route context; no TTL wait; no stale rows/order/totals | Browser/server action test |
| BENCH-DOM-001 | Initial large sheet mount | 1500 nodes / 5000 rows | Mounted rows = viewport + overscan; no all-row mount | DOM/browser mounted count |

## Measurement Rules

- Use authenticated target-route fixtures where browser proof is required.
- Keep provider/browser proof opt-in and scoped to browser-only claims.
- Record p50, p95, worst, fixture size, browser/project, and environment.
- Fail closed if a benchmark silently skips required setup.
- Do not compare against stale historical numbers without stating the exact date and branch.

## Evaluator Contract Template

Every `BENCH-*` evaluator must record:

| Field | Requirement |
|---|---|
| Benchmark ID | Stable ID from the matrix above. |
| Fixture | Row count, node count, route, actor, feature flag, network/provider mode. |
| Warmup | Number of ignored warmup runs and why. |
| Sample count | Minimum samples; do not accept one-off timing for p95 claims. |
| Metrics | p50, p95, worst, error count, skip count, fixture metadata. |
| Budget | Numeric pass/fail threshold and regression threshold. |
| Artifact | JSON schema, command output, browser trace, or provider evidence path. |
| Environment | Local/CI/browser/provider classification, branch, date, machine/browser. |
| Skip-fail rule | Required setup missing means fail unless an explicit owner-approved exception is recorded. |
| Flake handling | Retry policy, max retries, and what constitutes a real failure. |

## Evaluator Details

| Benchmark IDs | Sample / Warmup | Artifact Schema | CI/Local Classification | Flake Rule |
|---|---|---|---|---|
| BENCH-ROUTE-* | At least 10 measured navigations after 2 warmups. | `{ id, route, mode, samples, p50, p95, worst, skeletonCount, parentFallbackCount, branch, date }` | CI or local browser with auth fixture; field data only if available and dated. | One retry allowed for infrastructure failure, not for budget miss. |
| BENCH-TYPE-* / BENCH-TOTAL-* | At least 30 edits across material/quantity/misc fields after fixture mount. | `{ id, rowCount, mountedRows, samples, inputToDomP95, totalUpdateP95, focusRetained }` | DOM for model regressions, browser for real input/render claims. | Fail if focus lost or mounted rows exceed budget even if timing passes. |
| BENCH-DND-* / BENCH-TREE-* | At least 20 hover/drop samples after one warmup drag. | `{ id, rowCount, nodeCount, hoverP95, dropToDom, ackP95, activeDragCleared }` | Browser required for HTML5/pointer drag claims. | Fail on skipped drag setup or lingering drag state. |
| BENCH-QUEUE-* | Fake timers for unit/DOM plus browser offline for network behavior. | `{ id, pendingVisibleMs, failureVisibleMs, retryCount, duplicateEvents, queueAge }` | Local DOM plus browser offline. | Fail on silent skip or duplicate mutation. |
| BENCH-CACHE-* | One run per mutation class with reload/navigation after settle. | `{ id, mutationKind, cachePath, processCacheCleared, revalidated, reloadFresh, staleRows }` | Local/server-action integration; provider if DB/RLS is asserted. | Fail if mutation class lacks expected cache path row. |
| BENCH-DOM-* | At least 3 large-fixture mounts and virtual scroll samples. | `{ id, rowCount, nodeCount, mountedRows, overscan, activeEditorException }` | DOM/browser depending on visibility claim. | Active editor exception requires separate mitigation note. |

## Commands To Establish

Existing:

- `bun run test:e2e:perf`
- `bunx playwright test e2e/estimate-sheet-loading-performance.spec.ts`
- `bunx playwright test e2e/estimate-row-move.spec.ts --project=chromium --reporter=list` with `ARCHESTIMATOR_E2E_ROW_MOVE=1`

Future commands to add or update:

- `bunx vitest run tests/vitest/perf/estimate-sheet-render-baseline.test.tsx --maxWorkers=1` with budgets enforced.
- `bunx vitest run tests/vitest/estimate-mutation-queue-budget.test.tsx --maxWorkers=1`.
- `bunx playwright test e2e/estimate-sheet-interaction-performance.spec.ts --project=chromium`.
- `bunx playwright test e2e/estimate-sheet-offline.spec.ts --project=chromium`.

## Acceptance

All benchmark IDs above must be green or have a documented owner-approved exception before first-user MVP release. Exceptions must include user impact, temporary mitigation, expiry date, and next proof step.
