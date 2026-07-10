# Verification, Rollout, And Final Audit

## Applicability Gates

| Frontier gate | Applicable | Initial state | Reason | Proof |
|---|---|---|---|---|
| GATE-UX-01 | yes | FAIL | Preview/share/print totals, scope/currency labels, browser print behavior | DOM/a11y plus targeted print-media browser proof |
| GATE-NEXT-01 | yes | FAIL | App Router export route, Server/Client preview and share boundaries | Installed Next 16 docs read, route tests, type/lint/build |
| GATE-CONTRACT-01 | yes | FAIL | Shared calculation, snapshot, DTO, workbook, and error contracts | Consumer map, versioning, runtime validation, contract tests |
| GATE-DATA-01 | yes | FAIL | Stored publication snapshot and repository facts | Additive compatibility, sanitizer, legacy fixtures, clean invalid-row scan, and provisional `0053` D1 constraint replay |
| GATE-SEC-01 | yes | FAIL | Public snapshot/share must not expose rates/internal provenance | Allowlist serialization and denial/leak tests |
| GATE-VERIFY-01 | yes | FAIL | P0 correctness, async export errors, readiness claim | Red-first oracle, adversarial cases, structured errors |
| GATE-PERF-01 | yes | FAIL | 5k calculations, 10k workbook, print package/cardinality | Measured time/memory/artifact evaluator |
| GATE-OPS-01 | yes | FAIL | Staged adoption, artifact failures, rollback/fix-forward | Compatibility flags/version, signals, cleanup/final audit |
| GATE-CLEAN-01 | yes | FAIL | Formula/state extraction and duplicate removal | Characterization, caller scan, focused regression |
| GATE-AGENT-01 | no | N/A | No agent/prompt contract changes | Plan validator only |

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
| TEST-003 | Editor unsaved/persisted, Project summary SQL/Data route, chart series, server-write validation, and local D1 constraint replay against golden/invalid fixtures | Totals drift, legacy contingency omission, invalid write accepted, or non-area row loss | Working-basis values and buckets equal fixture exactly; SQL summary matches; invalid writes fail typed; clean constraint replay passes | UNIT-003 receipt | Reset local D1 fixture; reopen adapter/migration |
| TEST-004 | New and legacy publication snapshots through sanitizer/share reconstruction | Contingency/scope divergence or unsafe field | Proposal-included total and rows exact; legacy safe; no rate/source leak | UNIT-004 receipt | Delete fixture publication; security failure blocks downstream |
| TEST-005 | Preview/model/formula-on/formula-off native XLSX buffer, XML inspection, parser readback | Model/workbook/currency/cached value mismatch | Exact direct/final totals, formulas, cached values, recalculation flags, formats | UNIT-005 receipt and artifact digest | Delete raw workbook after digest; reopen UNIT-005 |
| TEST-006 | Unsaved edit -> preview -> save/reload -> publish/share -> beforeprint/afterprint; browser print media | Lifecycle or print total/membership mismatch | Every state reconciles; print package exact and chrome hidden | UNIT-006 receipt | Stop server/browser, delete fixture |
| TEST-007 | 5k calculation, 10k workbook, 50k bounded/refusal evaluator | No budget or regression | Recorded budgets pass and memory/artifact bounded | performance JSON/digest | Delete artifacts; optimize earliest owner |
| TEST-008 | Malicious/legacy/unknown snapshot, internal fields, invalid currency/number, cross-workspace/public ID cases | Sanitizer leak or guessed version | Fail-closed, safe output, no raw/internal values | UNIT-004/final security receipt | Remove fixtures; incident-level block on leak |
| TEST-009 | Existing editor/chart/publication/proposal/workbook suites plus static capability/ownership scan | Regression, duplicated formulas, unrelated Publisher diff | Existing suites green, focused ownership, no scope creep | UNIT-006/final receipt | Revert unrelated extraction; reopen causal unit |
| TEST-010 | Full targeted matrix, type/lint/error/build, diff/artifact/freshness/final trace audit | Any failure/orphan/stale receipt | All commands zero; all claims traced and resources clean | final audit receipt | Reopen earliest causal unit |

## Adversarial Coverage

- empty estimate/tree/tab and orphan row;
- group node owning rows, nested areas, duplicate labels, stable IDs;
- zero, fractional, half-cent, and valid negative-discount inputs;
- negative quantity/material/labor/misc; NaN/infinite values; row/sheet percentage
  below `-100` or above `1000`; VAT/contingency below `0` or above `100`;
- quantity-base/contingency mismatch at six-decimal precision, including an
  amount below zero effective quantity whose canonical quantity is not zero;
- exact `Number.MAX_SAFE_INTEGER` minor-unit boundary, one unit inside/outside,
  multiplication/addition overflow, and 50k aggregate refusal without partial output;
- legacy invalid D1 row scan, migration refusal, and new-write constraint/API denial;
- missing/unknown scope and archived tab/node/row;
- mixed currencies, invalid currency, non-PHP format, no conversion;
- formula on/off, invalid range, cached result mismatch, workbook reopen failure;
- legacy snapshot, unknown version, malformed safe fields, private rate/source data;
- unsaved edit, failed save, retry, reload, concurrent stale export request;
- export generation throw/partial buffer and repeated download;
- beforeprint/afterprint repeated, cancelled print, multiple estimate tabs;
- 5k/10k/50k cardinality and memory pressure;
- row text containing instruction-like or formula-injection text. Customer text is
  inert data, escaped for workbook cells, never executed/logged as commands.

## Performance Budgets

| Surface | Fixture | Budget | Evaluator | Failure trigger |
|---|---|---|---|---|
| Pure canonical calculation | 5,000 rows, all rule branches | p95 under 35 ms over 20 warm samples; linear growth | Bun/Vitest benchmark with fixture hash | p95 over 50 ms or superlinear evidence |
| Chart adapter | 5,000 rows, 100 buckets | no more than 15% slower than current golden benchmark | before/after benchmark | >15% regression without measured user benefit |
| Proposal model | 5,000 rows, 50 sections | p95 under 150 ms | model benchmark | p95 over 225 ms |
| XLSX generation | 10,000 rows, formulas on | under 8 s and peak RSS under 768 MB on recorded machine; artifact under 25 MB | existing workbook benchmark extended | time/memory/size exceeds budget |
| Print package | 2,000 public rows, 20 estimates | mounted only during print; no duplicate row; browser remains responsive | targeted browser probe | persistent hidden package, duplicate rows, crash/hang |
| 50k reasoning | pure facts/export request | calculation can stream/chunk; workbook explicitly refuses or warns before unsafe allocation | evaluator/static contract | unbounded allocation or corrupt partial artifact |

Record runtime versions, hardware, fixture/diff hashes, sample distribution,
memory, artifact bytes, and timestamp. Benchmarks prove only the recorded local
environment until hosted evidence is separately collected.

## Error And Observability Contract

- Calculation normalization errors expose stable codes and safe field names, not
  raw customer values.
- Export route logs request ID, estimate/project opaque fingerprints, row count,
  calculation version, basis, currency, formulas mode, duration, artifact bytes,
  and failure class through the structured logger.
- Public/share errors never include token, recipient credential, raw snapshot,
  internal IDs, source URLs, rates, or formula text containing customer content.
- Failed generation returns no successful download headers or partial file.
- Print failure leaves screen view usable and removes temporary package on
  `afterprint`/cleanup.
- No production analytics or alert claim is required; existing error-handling
  static gate is mandatory.

## Verification Commands

```bash
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

## Rollout And Fix-Forward

### Stage 0 - Canonical module with wrappers

Land canonical cost parts/bases and keep existing wrapper APIs. No user-visible
switch. Compare golden fixture and existing regressions.

Go: canonical/legacy outputs are characterized and compatible.

No-go: unexplained existing-total change.

### Stage 1 - Internal consumers

Migrate editor/chart, then publication/share, then preview/XLSX in DAG order.
Each consumer is independently revertible to its compatibility wrapper.

Go: its cross-surface row membership and totals pass.

No-go: security leak, scope ambiguity, or formula mismatch.

### Stage 2 - Beta artifact proof

Run the deterministic workflow through preview, download, parser readback, and
print media. Compare all named bases and charges.

Go: P0 fixture, security, workbook, print, performance, and regression gates pass.

No-go: any unexplained cent, row, scope, currency, or version mismatch.

### Stage 3 - Release evaluation

Production release uses the repository release process and separately proves the
deployed artifact. Local completion does not set release ready.

Rollback is adapter-based: route a failing consumer through the verified
compatibility wrapper while retaining canonical fixture/version. Published
snapshots are immutable; fix forward with a new schema/calculation version rather
than rewriting historical snapshots. Workbook failures disable the download
action with a recoverable error; they do not serve partial artifacts.

## Final Audit Checklist

1. BETA-P0-05 maps to passing AC-001 through AC-012 and the final gates.
2. The pack emits one bounded extraction receipt for the program-owned
   BETA-P1-10 gate, limited to touched calculation/export state.
3. Publisher issue identity, funnel, recipient matrix, and redesign remain owned
   by the neighboring pack and are not overwritten.
4. Publisher writer completion/diff review/shared leases are recorded before
   shared edits.
5. Expected fixture numbers are hand-authored and independent of production code.
6. Every active source row appears exactly once in each applicable basis.
7. Excluded/by-owner rows remain visible where required and never enter proposal totals.
8. Archived rows/tabs/nodes remain excluded.
9. Working, proposal-included, and final totals are named and reconciled.
10. One canonical oracle owns formula, rounding, currency, scope, and charge stages.
11. Existing list/RPC/editor/chart behavior is preserved or explicitly versioned.
12. Snapshot/share parity is exact and legacy snapshots stay safe/immutable.
13. Sanitized snapshot contains no private rate/source/internal credential data.
14. Preview/model/formula-on/formula-off/native XLSX cached values agree.
15. XLSX formula ranges, recalculation metadata, and dynamic currency formats pass.
16. Unsaved, save/reload, failed-save, retry, and stale-export states are correct.
17. Targeted browser print-media proof matches included rows/totals/currency once.
18. Performance/memory/artifact budgets pass with fresh fixture/diff hashes.
19. Structured errors/logs are redacted and no partial artifact is presented as success.
20. Existing calculation/publication/proposal/workbook tests and Cloudflare build pass.
21. No duplicate formula, PHP-only format, stale adapter, ambiguous total label,
    temporary fixture/server/browser/workbook, or active lease remains.
22. Evidence and manifest hashes/statuses reflect actual results; `next_unit`
    clears only after all units are VERIFIED.

Any negative answer reopens its earliest causal unit and blocks completion.
