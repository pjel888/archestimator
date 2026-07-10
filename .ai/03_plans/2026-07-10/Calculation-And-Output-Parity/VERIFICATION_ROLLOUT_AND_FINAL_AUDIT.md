# Verification, Rollout, And Final Audit

## Applicability Gates

| Frontier gate | Applicable | Initial state | Reason | Proof |
|---|---|---|---|---|
| GATE-UX-01 | yes | FAIL | Preview/share/print totals, scope/currency labels, browser print behavior | DOM/a11y plus targeted print-media browser proof |
| GATE-NEXT-01 | yes | FAIL | App Router export route, Server/Client preview and share boundaries | Installed Next 16 docs read, route tests, type/lint/build |
| GATE-CONTRACT-01 | yes | FAIL | Shared calculation, snapshot, DTO, workbook, and error contracts | Consumer map, versioning, runtime validation, contract tests |
| GATE-DATA-01 | yes | FAIL | Stored publication snapshot and repository facts | Additive compatibility, sanitizer, legacy fixtures, current `0056` generation receipt, clean invalid-row scan, and D1 constraint replay |
| GATE-SEC-01 | yes | FAIL | Public snapshot/share must not expose rates/internal provenance | Allowlist serialization and denial/leak tests |
| GATE-VERIFY-01 | yes | FAIL | P0 correctness, async export errors, readiness claim | Red-first oracle, adversarial cases, structured errors |
| GATE-PERF-01 | yes | FAIL | 5k calculations, 10k workbook, print package/cardinality | Measured time/memory/artifact evaluator |
| GATE-OPS-01 | yes | FAIL | Staged adoption, artifact failures, rollback/fix-forward | Compatibility flags/version, signals, cleanup/final audit |
| GATE-CLEAN-01 | yes | FAIL | Formula/state extraction and duplicate removal | Characterization, caller scan, focused regression |
| GATE-AGENT-01 | no | N/A | No agent/prompt contract changes | Plan validator only |

Agent-assisted planning and review do not change an agent/prompt/runtime contract,
so `GATE-AGENT-01` remains `N/A` unless execution changes that contract.

Manifest gates:

- GATE-001 canonical calculation/data contract;
- GATE-002 public snapshot/security/compatibility;
- GATE-003 preview/XLSX/print parity;
- GATE-004 performance/reliability/regression/build;
- GATE-005 coordination, rollout, cleanup, and final audit.

## Test Matrix

| Test ID | Setup/procedure | Pre-implementation failing signal | Pass signal | Evidence | Cleanup/failure response |
|---|---|---|---|---|---|
| TEST-001 | Hand-authored cross-surface fixture and unification oracle | O3/O4b/divergence cases fail | Exact row membership and expected minor-unit bases/cost parts | UNIT-001/002 receipts | No external state; independent expected-value review |
| TEST-002 | Canonical oracle/wrapper/duplicate-formula contract | Missing API or legacy drift | New API passes; legacy list/RPC callers unchanged; one formula owner | UNIT-002 receipt | Reopen UNIT-002 |
| TEST-003 | `tests/vitest/estimate-calculation-input-constraints-migration.test.ts`, `tests/vitest/project-data-calculation-parity.test.ts`, and `tests/vitest/project-data-calculation-query-budget.test.ts`: editor persisted facts, summary SQL/Data route, charts, invalid writes, clean/replay-twice migration, statement counter, payload bytes, and query plan | Totals drift, invalid write accepted, migration replay failure, per-row query, or non-area row loss | Working-basis values equal fixture; invalid writes fail typed; replay passes; bounded statement/payload budget and named-index plan pass | UNIT-003 receipt | Reset local D1 fixture; reopen adapter/migration |
| TEST-004 | New and legacy publication snapshots through sanitizer/share reconstruction | Contingency/scope divergence or unsafe field | Proposal-included total and rows exact; legacy safe; no rate/source leak | UNIT-004 receipt | Delete fixture publication; security failure blocks downstream |
| TEST-005 | Preview/model/formula-on/formula-off native XLSX buffer, XML inspection, parser readback | Model/workbook/currency/cached value mismatch | Exact direct/final totals, formulas, cached values, recalculation flags, formats | UNIT-005 receipt and artifact digest | Delete raw workbook after digest; reopen UNIT-005 |
| TEST-006 | Unsaved edit -> preview -> save/reload -> publish/share -> beforeprint/afterprint; browser print media | Lifecycle or print total/membership mismatch | Every state reconciles; print package exact and chrome hidden | UNIT-006 receipt | Stop server/browser, delete fixture |
| TEST-007 | `scripts/benchmark-calculation-output-parity.ts`, extended `scripts/benchmark-proposal-workbook.ts`, `tests/vitest/calculation-output-parity-benchmark.test.ts`, and `tests/vitest/proposal-workbook-benchmark.test.ts`: 5k/50k calculation and 10k workbook over 20 warm samples | No executable budget, point-RSS-only evidence, or unsafe 50k allocation | p50/p95/max, delta/peak RSS, artifact bytes/hash, and explicit 50k pre-allocation refusal satisfy budgets | performance JSON/digest | Delete artifacts; optimize earliest owner |
| TEST-008 | Malicious/legacy/unknown snapshot, internal fields, invalid currency/number, cross-workspace/public ID cases | Sanitizer leak or guessed version | Fail-closed, safe output, no raw/internal values | UNIT-004/final security receipt | Remove fixtures; incident-level block on leak |
| TEST-009 | Existing editor/chart/publication/proposal/workbook suites plus static capability/ownership scan | Regression, duplicated formulas, unrelated Publisher diff | Existing suites green, focused ownership, no scope creep | UNIT-006/final receipt | Revert unrelated extraction; reopen causal unit |
| TEST-010 | Full targeted matrix, type/lint/error/build, diff/artifact/freshness/final trace audit | Any failure/orphan/stale receipt | All commands zero; all claims traced and resources clean | final audit receipt | Reopen earliest causal unit |

## Supporting Review Artifacts

- `GOLDEN_ORACLE_AND_ADVERSARIAL_QA.md` expands the fixture, negative-path,
  maker/checker, receipt, and stale-evidence contract for the stable TEST records
  above.
- `PERFORMANCE_RELIABILITY_AND_OBSERVABILITY.md` holds the measured budgets,
  evaluator fields, reliability behavior, structured signals, and triage path.
- `SECURITY_PRIVACY_AND_PUBLIC_ALLOWLIST.md` and
  `EXPORT_XLSX_PRINT_AND_BROWSER_PROOF.md` hold the security/workbook/browser
  cases that cannot be reviewed safely as a generic checklist.

These artifacts are supporting context, not evidence. This file is the
human-readable test/gate planning baseline and completion index; current live
status remains solely in `plan-pack.json`.

## Verification Commands

```bash
bunx vitest run tests/vitest/estimate-calculation-input-constraints-migration.test.ts
bunx vitest run \
  tests/vitest/project-data-calculation-parity.test.ts \
  tests/vitest/project-data-calculation-query-budget.test.ts
CALCULATION_PARITY_BENCHMARK_ROWS=5000,50000 \
CALCULATION_PARITY_BENCHMARK_SAMPLES=20 \
OUTPUT_FILE=.ai/99_scratch/calculation-output-parity-performance.json \
  bun scripts/benchmark-calculation-output-parity.ts
PROPOSAL_WORKBOOK_BENCHMARK_ROWS=10000 \
PROPOSAL_WORKBOOK_BENCHMARK_SAMPLES=20 \
OUTPUT_FILE=.ai/99_scratch/calculation-output-parity-workbook.json \
  bun scripts/benchmark-proposal-workbook.ts
bunx vitest run \
  tests/vitest/calculation-output-parity-benchmark.test.ts \
  tests/vitest/proposal-workbook-benchmark.test.ts
bunx vitest run \
  tests/vitest/estimate-unification-oracle.test.ts \
  tests/vitest/calculation-output-parity.test.ts \
  tests/vitest/estimate-sheet-node-totals.test.ts \
  tests/vitest/project-charts-golden-master.test.ts \
  tests/vitest/project-publication-snapshot.test.ts \
  tests/vitest/share/reconstruct-share-tree.test.ts \
  tests/vitest/proposal-export-model.test.ts \
  tests/vitest/proposal-export-preview.test.tsx \
  tests/vitest/proposal-workbook.test.ts \
  tests/vitest/proposal-export-route-workbook.test.ts \
  tests/vitest/project-publication-page.test.tsx
bun run type-check
bun run lint
bun run validate:error-handling
bun run cf:build
git diff --check -- \
  src tests/vitest e2e \
  .ai/03_plans/2026-07-10/Calculation-And-Output-Parity
bun run validate:plan-pack -- \
  .ai/03_plans/2026-07-10/Calculation-And-Output-Parity
```

Targeted print proof, only after static/DOM tests are green:

```bash
PLAYWRIGHT_STORAGE_STATE=<sanitized-test-state> \
PLAYWRIGHT_PORT=<dedicated-port> \
bun run test:e2e -- e2e/calculation-output-parity-print.spec.ts
```

Expected signals:

- all commands exit zero;
- cross-surface expected minor units and row membership match;
- generated XLSX buffer hash is recorded, XML/readback passes, and raw artifact is
  removed after sanitized digest;
- browser print media contains exact included rows/totals/currency once and hides
  receiver-only controls;
- no existing Publisher identity/UX behavior regresses.

## Rollout And Final Audit Index

`ROLLOUT_FIX_FORWARD_AND_COMPLETION_GATE.md` is the independent stage/go-no-go,
immutable-snapshot fix-forward, local-versus-release boundary, final audit, and
completion handback. Any negative answer there reopens its earliest causal unit
and blocks completion.
