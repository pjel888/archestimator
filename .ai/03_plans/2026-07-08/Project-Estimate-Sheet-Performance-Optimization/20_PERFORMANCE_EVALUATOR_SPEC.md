# 20 - Performance Evaluator Spec

This is the strict evaluator contract for canonical `UNIT-001` through `UNIT-011`. `IMPLEMENTATION_PLAN.md` owns the final paths, budgets, and dependencies.

## Schema And Commands

Schema ID: `estimate-sheet-performance-report.v1`.

Exact planned implementation:

- `tests/fixtures/estimate-sheet-performance.ts`
- `scripts/lib/estimate-sheet-performance-contract.ts`
- `scripts/prepare-estimate-sheet-performance-run.ts`
- `scripts/validate-estimate-sheet-performance-run.ts`
- `scripts/cleanup-estimate-sheet-performance-run.ts`
- `scripts/measure-estimate-sheet-performance.ts`
- `scripts/measure-estimate-sheet-d1.ts`
- `scripts/start-estimate-sheet-benchmark-server.ts`
- `scripts/run-estimate-sheet-mode-proof.ts`
- `scripts/update-estimate-sheet-performance-evidence-index.ts`
- `scripts/verify-estimate-sheet-hosted-d1-performance-proof.ts`
- `scripts/write-estimate-sheet-release-evaluation.ts`
- `scripts/write-estimate-sheet-bottleneck-decision.ts`
- `playwright.estimate-performance.config.ts`
- `tests/vitest/estimate-sheet-performance-contract.test.ts`

Exact planned package scripts:

```json
{
  "perf:estimate:prepare": "bun run scripts/prepare-estimate-sheet-performance-run.ts",
  "perf:estimate:validate-run": "bun run scripts/validate-estimate-sheet-performance-run.ts",
  "perf:estimate:cleanup": "bun run scripts/cleanup-estimate-sheet-performance-run.ts",
  "perf:estimate:measure": "bun run scripts/measure-estimate-sheet-performance.ts",
  "perf:estimate:d1": "bun run scripts/measure-estimate-sheet-d1.ts",
  "perf:estimate:d1:hosted": "bun run scripts/verify-estimate-sheet-hosted-d1-performance-proof.ts",
  "perf:estimate:server": "bun run scripts/start-estimate-sheet-benchmark-server.ts",
  "perf:estimate:modes": "bun run scripts/run-estimate-sheet-mode-proof.ts",
  "perf:estimate:check": "bun run scripts/measure-estimate-sheet-performance.ts --check",
  "perf:estimate:decide": "bun run scripts/write-estimate-sheet-bottleneck-decision.ts",
  "perf:estimate:index": "bun run scripts/update-estimate-sheet-performance-evidence-index.ts",
  "perf:estimate:release": "bun run scripts/write-estimate-sheet-release-evaluation.ts"
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

- `packageId`, `unitId`, `evidenceId`, stable `requirementIds`, `criterionIds`, `testIds`, and `scenarioIds`; each must resolve reciprocally in `plan-pack.json`/doc 16.
- Git HEAD, scoped status/diff hashes, hashes for measured source and fixture files.
- Run UUID, timestamp, build/dev mode, build hash, versioned five-key deployment-mode snapshots, base URL, server command, and process exit status.
- Browser name/version, OS, viewport, device scale, CPU/network profile, and whether heap/observer APIs were available.
- Auth method and seeded local profile ID as a redacted hash. The benchmark uses a generated Better Auth signed cookie and never uses dev-auth bypass.
- Fixture profile/hash, D1 migration head, warmups, measured sample count, worker count, retry count, and failure count.
- Evidence class: `jsdom`, `local-browser`, `local-d1`, or `hosted-d1`.

The evaluator fails before measurement when the built OpenNext preview server, per-unit current pointer, UUID lease, shared run-scoped Wrangler persistence directory, authenticated storage state, selected route IDs, seed, mandatory CDP profile, or required observer is unavailable. It also fails when source/build/fixture/auth hashes differ within a series. Dev-server measurements are diagnostic only and cannot satisfy a budget.

Mandatory browser profile: `perf:estimate:prepare` atomically allocates a UUID root and free port in `3101..3199`, applies active app migrations with `--local --persist-to <run>/wrangler-state`, and compiles current per-run Better Auth DDL through the exported `generateLocalBetterAuthD1SchemaSqlProof` helper. Preparation rejects a DDL hash or table set that does not contain exactly `user`, `session`, `account`, `verification`, and `rateLimit`; the tracked June four-table SQL is stale evidence and must never be reused. In that same state it seeds a Better Auth user/session, `closed_beta_allowed_emails`, the current `legal_terms_acceptances` record, the matching profile, workspace/project/estimate membership and access rows, and the estimate route hierarchy. Project and estimate route IDs are valid UUIDs. It signs the storage-state cookie with installed `better-auth/crypto` and validates the DDL hash, five-table set, allowlist, accepted legal terms, session, profile, membership/access chain, route hierarchy, and cookie before measurement. Then run `bun run cf:build`; built OpenNext preview expands to `bunx opennextjs-cloudflare preview -- --ip 127.0.0.1 --port <leased-port> --persist-to <run>/wrangler-state --show-interactive-dev-session=false`; Playwright-lockfile Chromium; one worker; zero retries; desktop 1440x900/DPR 1; 4x CPU slowdown; 20 ms added latency; 10 Mbps down/5 Mbps up. Cold samples use a new context plus cleared HTTP/cache storage; warm samples reuse a primed context; hover samples start at the warmed project route and await the prefetch signal. Tablet 1024x768 and mobile 390x844 are functional/a11y profiles, not budget substitutes.

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

Local proof uses active `migrations/` plus freshly compiled Better Auth DDL with the exact five-table set in one UUID `--persist-to` directory; its fixture also includes the allowlist, current legal acceptance, signed session, matching profile, UUID route IDs, and complete membership/access chain. Hosted proof targets only bound `ARCH_DB` through `wrangler d1 execute ARCH_DB --remote --file ... --json`; it adds no Worker route or deploy. Each run generates exact IDs per table; hosted inventory includes profile, workspace/project/sheet membership/access rows and the six estimate hierarchy tables. Cleanup deletes those exact IDs and reconciles all eleven tables independently. A metadata-prefix cleanup is invalid for this schema and is forbidden.

## Strict Budgets

| Metric | Threshold |
|---|---:|
| Field INP target | <=200 ms p75 |
| Lab Event Timing diagnostic target | <=200 ms p75 |
| Edit duration | <=75 ms p95 |
| Scroll frame gap | <=50 ms p95 |
| LoAF/long task | maximum <=50 ms and `over_50_ms_count=0` |
| Scalar-edit derived-state CPU | <=25 ms p95 |
| Scalar-edit full-tree recomputes | 0 |
| Scalar-mutation whole-tree snapshots | 0 |
| Project-component client fan-out at 1,000 matches | <=75 ms p95 |
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

`perf:estimate:decide` evaluates one explicit predicate per `UNIT-005` through `UNIT-009`. `UNIT-005` owns route/D1 failures; `UNIT-007` owns derivation/search/totals failures; `UNIT-008` owns mounted-DOM/scroll/LoAF/focus/virtualization failures after baseline regression repair; `UNIT-009` owns snapshot/mutation/fan-out/revision/rollback/concurrency failures. `UNIT-006` uses exactly `UNIT-007.activate OR M-MUTATE-CLIENT-FANOUT-P95.fail OR M-GRAPH-ANCESTOR-LOOKUP-P95.fail OR M-GRAPH-COMPONENT-LOOKUP-P95.fail OR M-GRAPH-DUPLICATE-BYTES.fail`; no prose inference is permitted.

It then ranks only activated branches using:

1. count of failed hard thresholds;
2. normalized threshold overage;
3. count of affected required scenarios.

A branch is activated only when its explicit predicate is true. Ranking cannot activate a passing branch. Every nonactivated unit writes a hashed supersession receipt. Missing, stale, unmapped, or multiply mapped evidence makes the decision command fail.

## Canonical Outputs

The authoritative runtime artifact list is the 14-path inventory in `IMPLEMENTATION_PLAN.md`. Older artifact names in this pack are compatibility aliases only and cannot independently satisfy a gate. `perf:estimate:index` validates an artifact's durable trace IDs and hashes before atomically moving a unit to `VERIFIED` or decision-backed `SUPERSEDED`; it is the only status-transition command.
