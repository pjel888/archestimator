# 20 - Performance Evaluator Spec

This is the strict evaluator contract for canonical `UNIT-001` through `UNIT-011`. `IMPLEMENTATION_PLAN.md` owns the final paths, budgets, and dependencies.

## Schema And Commands

Schema ID: `estimate-sheet-performance-report.v1`.

Exact planned implementation:

- `tests/fixtures/estimate-sheet-performance.ts`
- `scripts/lib/estimate-sheet-performance-contract.ts`
- `scripts/measure-estimate-sheet-performance.ts`
- `scripts/measure-estimate-sheet-d1.ts`
- `scripts/write-estimate-sheet-bottleneck-decision.ts`
- `tests/vitest/estimate-sheet-performance-contract.test.ts`

Exact planned package scripts:

```json
{
  "perf:estimate:measure": "bun run scripts/measure-estimate-sheet-performance.ts",
  "perf:estimate:d1": "bun run scripts/measure-estimate-sheet-d1.ts",
  "perf:estimate:check": "bun run scripts/measure-estimate-sheet-performance.ts --check",
  "perf:estimate:decide": "bun run scripts/write-estimate-sheet-bottleneck-decision.ts"
}
```

## Fixture Contract

| Profile | Rows | Purpose |
|---|---:|---|
| `small` | 50 | Fast functional characterization |
| `medium` | 500 | Preserve current performance-suite coverage |
| `large` | 1,000 | Intermediate regression |
| `stress` | 2,500 | Long interaction and fan-out behavior |
| `limit` | 5,000 | Supported row ceiling with up to 1,500 nodes |
| `over-limit` | 5,001 | Truncation/fail-safe behavior |
| `realistic-skew` | 5,000 | Deep/shallow mixed branches, uneven row kinds, long-tail attachments, mixed component identities |

Every fixture records seed, node/row/depth distribution, branch sizes, component match groups, revisions, and expected totals. The generator is deterministic and contains no customer data.

## Environment And Provenance

Every report records:

- Git HEAD, scoped status/diff hashes, hashes for measured source and fixture files.
- Run UUID, timestamp, build/dev mode, resolved deployment modes, base URL, server command, and process exit status.
- Browser name/version, OS, viewport, device scale, CPU/network profile, and whether heap/observer APIs were available.
- Auth method and seeded local profile ID as a redacted hash. Protected local runs must pass `bun run ops:check-dev-auth-bypass` first.
- Fixture profile/hash, D1 migration head, warmups, measured sample count, worker count, retry count, and failure count.
- Evidence class: `jsdom`, `local-browser`, `local-d1`, or `hosted-d1`.

The evaluator fails before measurement when the dev server, auth fixture, selected route IDs, seed, or required observer is unavailable. It does not skip a broken setup and report a green budget.

## Browser Measurement Method

- Run with one Playwright worker and zero retries for budget evaluation.
- Use 3 warmups plus 20 route samples and 3 warmups plus 30 interaction samples.
- Store raw measured samples, then compute min/median/p75/p95/max with nearest-rank percentiles.
- Use `PerformanceObserver` Event Timing (`event` plus `interactionId`) for lab interaction timing where supported.
- Use Long Animation Frame (`long-animation-frame`) and long-task entries for main-thread diagnosis. Record dropped/unsupported entries.
- Playwright action duration is a diagnostic wall-clock metric only. It is never called INP or field-equivalent.
- Field INP <=200 ms p75 remains the production target; local Event Timing is a lab proxy.
- Tracing retains browser/network evidence on failure, but a trace duration is not a standalone performance metric.

## Route And UI Metrics

Required route fields:

- cold, warm, and hover samples
- route start, skeleton visible, sheet visible, tree ready, first row table mounted
- parent fallback count and sheet skeleton episode count
- response/RSC payload bytes and estimate-route client bundle gzip bytes

Required interaction fields:

- edit, search/facet, expand/collapse, move placement, modal open, inline component edit, and scroll samples
- Event Timing duration, LoAF/long-task duration, frame gap, failure count
- mounted row/branch counts, render-probe counts, total-recompute count
- retained heap delta when supported
- all 19 component-interop scenario results

## D1 Measurement Method

Required surfaces: route context, tab tree, lazy subtree at depths 1/5/10, row update, move, bulk delete at 100, and project-component fan-out at 1/100/1000 matches.

Every D1 record includes statement name, normalized SQL hash, bind count, statement/query count, batch size, available duration/rows-read/rows-written values, `EXPLAIN QUERY PLAN`, selected index, seeded/cleaned counts, and evidence class.

Local proof uses active `migrations/` only. Hosted proof targets only bound `ARCH_DB`. Each run generates exact IDs per table; cleanup deletes those exact IDs and reconciles each table independently. A metadata-prefix cleanup is invalid for this schema and is forbidden.

## Strict Budgets

| Metric | Threshold |
|---|---:|
| Field INP target | <=200 ms p75 |
| Lab Event Timing diagnostic target | <=200 ms p75 |
| Edit duration | <=75 ms p95 |
| Scroll frame gap | <=50 ms p95 |
| LoAF/long task | <=50 ms p95 or named yield strategy |
| Mounted rows per active 5,000-row table window | <=120 |
| Mounted branches at 1,500 nodes | <=150 |
| Cold route | <=3,500 ms median |
| Warm/hover route | <=500 ms median |
| Warm sheet visible | <=1,000 ms |
| Parent fallback | 0 |
| Sheet skeleton episodes | <=1 |
| Route context statements | <=4 |
| Tab tree statements | <=3 |
| Row update statements | <=3 |
| Estimate-route first-load client JS | <=350 KiB gzip |
| Stress RSC payload | <=500 KiB |
| Graph retained heap delta | <=20 MiB |

Subtree query count after an activated D1 optimization must be O(1) in requested depth. D1 cost projection must remain below 50% of current official free-tier daily read/write allowances at the recorded MVP traffic model.

There are no "documented exceptions allowed" pass paths. A threshold changes only through a new evidence-backed `DEC-AUTO-*` decision and a manifest refresh.

## Reliability Semantics

- Any failed navigation/action/sample makes the scenario fail.
- Retries and Playwright's flaky classification cannot turn a failed performance scenario green.
- Arbitrary sleeps are forbidden; wait on explicit route/DOM/application signals.
- Ten runs are smoke evidence only. A <=2% observed failure-rate claim requires at least 100 independent repetitions.
- Missing metrics, non-finite values, stale input hashes, unsupported required observers, seed mismatch, or cleanup mismatch fail closed.
- `SKIPPED` is allowed only for an unavailable nonessential metric and must include reason and residual risk. It cannot satisfy a hard budget.

## Decision Output

`perf:estimate:decide` ranks route/D1, derivation, render/DOM, and mutation/fan-out using:

1. count of failed hard thresholds;
2. normalized threshold overage;
3. count of affected required scenarios.

A branch is activated when any hard threshold fails or it ranks in the top three by normalized overage. A nonactivated branch writes a hashed supersession receipt. Missing or stale evidence makes the decision command fail.

## Canonical Outputs

The authoritative runtime artifact list is the 13-path inventory in `IMPLEMENTATION_PLAN.md`. Older artifact names in this pack are compatibility aliases only and cannot independently satisfy a gate.
