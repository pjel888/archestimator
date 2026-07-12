# Canonical Implementation Plan

## Execution Contract

This is the sole canonical execution artifact. Before edits, re-read current
source, tests, git status, neighboring pack diffs/ledgers, and relevant installed
Next.js 16 docs. Preserve concurrent changes. Begin with the cross-surface red
fixture; do not refactor formulas before expected values and membership are
hand-authored.

The package is `CONDITIONALLY_READY`. Dependency-closed `SLICE-001` contains
only `UNIT-001` and `UNIT-002`; execute `UNIT-001` first. `UNIT-003` is `PLANNED`
until it consumes the Program migration generation receipt for `0056`, and
`UNIT-004` through `UNIT-007` remain `PLANNED` behind migration, Publisher, and
prior-unit dependencies.

## Capability Census

| Capability | Use | Continuity |
|---|---|---|
| Targeted repository inspection and caller search | Consumer map and duplicate formula detection | Required |
| Executor with one shared-file integrator | Calculation and adapter edits | Lead retains the lane when no child slot exists |
| Test engineer | Hand-authored oracle and workbook artifact assertions | Lead writes red tests before source |
| Vitest/Bun/ExcelJS/ZIP XML helpers already in repo | Unit, DOM, workbook generation/readback | No new dependency |
| Targeted Playwright print-media proof | Browser-only print contract | Criterion remains failing if unavailable |
| Independent verifier | Final artifact/security/diff audit | Maker/checker-separated lead pass |

## Ownership And Leases

| Lease | Scope | Owner | Acquisition/release |
|---|---|---|---|
| LEASE-PAR-ORACLE | Golden fixture, oracle snapshot, expected values | UNIT-001 test engineer | Acquire first; release after fixture hash frozen |
| LEASE-PAR-CALC | `estimate-row-total.ts` and calculation adapters | UNIT-002 calculation integrator | Release after compatibility tests |
| LEASE-PAR-CHART | editable-row and chart aggregation adapters | UNIT-003 integrator | Release after chart/editor golden pass |
| LEASE-PAR-MIGRATION | Program allocation `0056_estimate_calculation_input_constraints.sql` in the current durable 0053..0057 generation receipt | UNIT-003 integrator | Receipt consumed, migration created, next generation reissued |
| LEASE-PAR-PUBLICATION | `publication/snapshot.ts`, share reconstruction/types/tests | UNIT-004 publication integrator | Consume validator-clean Publisher manifest/diff/contract receipt |
| LEASE-PAR-EXPORT | proposal export types/model/settings/workbook/preview/tests | UNIT-005 export integrator | Consume validator-clean Publisher manifest/diff/contract receipt |
| LEASE-PAR-PRINT | share print package/CSS/browser fixture | UNIT-006 UI integrator | Consume Publisher integration receipt; release after browser proof |
| LEASE-PAR-EVIDENCE | temp workbook, browser server/port, proof paths | UNIT-007 verifier | Cleanup before release |

The durable Program receipt
`.ai/03_plans/2026-07-10/Beta-Readiness-Program/MIGRATION_LEASE_GENERATION.json`
contains a monotonic generation, sorted migration-tail digest, Publisher/
Activation/Estimate/Calculation/Activity manifest digests, 0053..0057 allocation rows, allocation digest, and
canonical receipt digest. UNIT-003 records and validates its generation/hash
immediately before editing. Any tail, manifest, allocation, filename, or digest
mismatch prohibits the edit. Slot consumption or collision makes that generation
stale for every remaining owner; Program rescans and emits the next generation,
preserving consumed paths/hashes and reissuing all unconsumed slots.

Shared-file integration is receipt-driven, not based on transient process state.
Publisher supplies a validator-clean manifest hash, scoped diff hash, changed-file
inventory, and exported contract versions. Calculation rejects a stale or
overlapping receipt and records the accepted receipt before a shared edit.

## DAG

```text
UNIT-001 -> UNIT-002 -> UNIT-003 -> UNIT-004 -> UNIT-005 -> UNIT-006 -> UNIT-007
```

This is intentionally serialized because each consumer migration depends on the
canonical calculation contract and publication/export files overlap with the
Publisher pack. Safe read-only review may run in parallel; writes may not.

Checkpoints:

- CP-1: fixture and expected values frozen; red baselines recorded.
- CP-2: canonical cost parts/bases/rounding green with compatibility wrappers.
- CP-3: editor and Project Data/charts migrated; no duplicate formula there.
- CP-4: versioned public snapshot/share parity green and security preserved.
- CP-5: preview/model/XLSX artifact parity green.
- CP-6: print/recalculation/save-reload integration and extraction green.
- CP-7: final audit, cleanup, evidence/status refresh complete.

## UNIT-001 - Freeze Cross-Surface Golden Fixture And Red Oracle

Status: `READY`.

Unit goal: Build the hand-authored fixture, expected cost-parts/bases/totals, and
executable red cases spanning every surface.

Outcome: Later implementation has exact expected numbers and row membership.

Linked IDs: REQ-001, REQ-002, DATA-001, REQ-003, REQ-004; DEC-AUTO-002 through
DEC-AUTO-004; RISK-001, RISK-002.

Non-goals: Source formula changes or snapshots/workbook edits.

Exact paths and symbols:

- extend `tests/vitest/estimate-unification-oracle.fixtures.ts` with a new
  versioned parity fixture while preserving existing exports;
- implement the unimplemented O3 proposal model and O4b chart-series cases in
  `tests/vitest/estimate-unification-oracle.test.ts`;
- implement the documented contingency divergence as an explicit failing case;
- create `tests/vitest/calculation-output-parity.test.ts` for the Data-page
  summary, invalid-input refusal, workbook, and print expected-record matrix;
  keep O3, O4b, and O-DIV-1 in
  `tests/vitest/estimate-unification-oracle.test.ts`;
- add expected workbook/print records without calling production calculators.

Dependencies: None. Acquire LEASE-PAR-ORACLE.

Owned scope and role: Test engineer owns fixture/new test; lead integrates edits
to existing oracle files.

Approach:

1. Compute expected values independently and record a review table in test data.
2. Freeze stable IDs/order/clock/currency/settings.
3. Include all row/charge/scope/rounding cases from the source audit.
4. Add hand-authored expected Data-page summary totals for the independent SQL
   path and invalid-input refusals for negative/range/mismatch/overflow cases.
5. Add adapters in the test only where current consumers need input shapes.
6. Assert explicit bases and row membership, not one ambiguous grand total.
7. Record current pass/fail per surface without changing expected values.

Expected postconditions: O3/O4b and contingency cases execute and fail on exact
current divergences; already implemented O1/O2/O4a remain green.

Proof: TEST-001. Run
`bunx vitest run tests/vitest/estimate-unification-oracle.test.ts tests/vitest/calculation-output-parity.test.ts`.
Expected signal: stable named failures for missing parity adapters/divergences,
not fixture construction errors. Evidence
`.ai/99_scratch/calculation-parity-unit-001.md`.

Failure response: If hand calculation disagrees with a written requirement,
review the expected table with an independent test engineer and update the
decision/fixture before source edits. Do not derive expected values from current
production functions.

Checkpoint: Fixture bytes/hash, expected bases/totals, and red test names.

## UNIT-002 - Implement Canonical Cost Parts, Bases, Rounding, And Currency

Status: `READY`; depends only on UNIT-001.

Unit goal: Evolve the existing oracle and add compatibility adapters.

Outcome: One pure module owns row cost parts, inclusion, aggregates, adjustments,
minor-unit rounding, and currency scale.

Linked IDs: REQ-001, REQ-002, DATA-001, REQ-005; DEC-AUTO-001 through
DEC-AUTO-004; RISK-001.

Non-goals: Consumer UI/public/export migration.

Exact paths:

- `src/lib/estimates/estimate-row-total.ts` owns cost parts, currency scale,
  minor-unit primitives, and the exported `validateEstimateCalculationInput`;
- `src/lib/estimates/actions.ts` applies that validator at
  `insertEstimateRowItemFromLibrary`, `updateEstimateRowItem`,
  `replaceEstimateRowItemWithLibrary`, and `updateEstimateSheetAdjustment`;
- `tests/vitest/estimate-row-total.test.ts` and new
  `tests/vitest/estimate-calculation-input-validation.test.ts` own the pure and
  server-boundary fixtures.

This unit does not create `src/lib/estimates/currency-money.ts` and does not edit
`src/lib/proposal-export/settings.ts`. Publication and export adapters remain
owned by `UNIT-004` and `UNIT-005` after their leases are valid.

Dependencies: UNIT-001.

Owned scope and role: Calculation integrator owns canonical API. No other lane
writes formula code.

Approach and invariants:

1. Add cost-parts and named-basis types.
2. Preserve `computeEstimateRowLineTotal` API as a wrapper.
3. Enforce the closed number-domain contract from
   `REQUIREMENTS_AND_DECISIONS.md`: six-decimal quantity congruence, non-negative
   quantity/rates/misc, bounded percentages, and finite inputs.
4. Convert each cost part to minor units and check `Number.isSafeInteger` after
   every conversion, product, and addition; return typed refusal on overflow.
5. Implement explicit sheet/project charge stages.
6. Normalize supported currency without conversion and expose format metadata.
7. Add calculation version constant for DTO/snapshot/workbook receipts.

Expected postconditions: Pure fixture cost parts/bases pass; legacy list/RPC tests
stay green; no consumer migration is required yet.

Proof: TEST-002 and pure portions of TEST-001. Evidence path
`.ai/99_scratch/calculation-parity-unit-002.md`.

Failure response: Preserve legacy wrapper results and version new semantics. If a
current consumer relied on floating sub-cent totals, record it as an explicit
compatibility basis rather than silently rounding differently.

Checkpoint: Canonical API/types/version and compatibility matrix.

## UNIT-003 - Migrate Editor And Project Data/Charts

Status: `PLANNED`; blocked until the current Program generation receipt allocates
and validates `0056`.

Unit goal: Replace editable and chart row formulas with canonical adapters and
prove save/reload/chart parity for the working basis.

Outcome: Screen and Project Data use one working-estimate calculation.

Linked IDs: REQ-001, REQ-002, DATA-001, PERF-001, REQ-005; RISK-001, RISK-006.

Non-goals: Proposal scope/public/export changes.

Exact paths/symbols:

- `editable-row-model.ts` `getEditableRowAmounts`, `computeEditableRowTotal`,
  `computeNodeTotal(s)`, materialization adapters;
- `aggregate-project-charts.ts` `calculateProjectChartRowTotal`, cost composition,
  and series builder;
- `src/lib/repositories/workspace-repository.ts` `listProjectEstimates` summary
  SQL at the current `total_cost` subquery;
- `src/lib/repositories/project-data-repository.ts`
  `getProjectDataRouteSummary` consumption of `totalCostByEstimateId`;
- `src/lib/repositories/project-charts-repository.ts:getProjectChartsData`
  updates its D1 row-fact mapping to the canonical input/basis contract; this is
  an explicit edit, not a conditional follow-up;
- program-provisional
  `migrations/0056_estimate_calculation_input_constraints.sql`, after a
  read-only invalid-row scan and generation-receipt validation;
- `tests/vitest/estimate-calculation-input-constraints-migration.test.ts`;
- `tests/vitest/project-data-calculation-parity.test.ts`;
- `tests/vitest/project-data-calculation-query-budget.test.ts`;
- row mutation/action validators that can write `estimate_row_items`;
- existing estimate/chart/project-data tests and golden masters.

Dependencies: UNIT-002.

Owned scope and role: One integrator owns both adapters for this unit. Keep UI
input parsing/formatting local; delegate monetary calculation only.

Approach: Map editable unsaved state and persisted chart/summary facts to
canonical input; replace or reconcile the independent SQL total so the Data page
uses the canonical working basis and legacy-contingency compatibility; preserve
instrumentation hooks and bucket resolution. Scan legacy D1 rows before the
table-rebuild constraint migration; reject new invalid writes at server
boundaries, fail closed on legacy violations, and never clean them silently.
Delete duplicate formulas only after characterization passes.

Expected postconditions: O1/O4a/O4b working-basis cases pass, existing editor/
chart/Data-route tests pass, summary SQL no longer owns divergent semantics,
invalid new writes are rejected, legacy scan/constraint replay is green, and
current row/node/bucket/summary totals agree in safe minor units.

Proof: TEST-003 plus existing chart golden, node total, editable row, list/RPC
parity, and save/reload tests. Evidence path
`.ai/99_scratch/calculation-parity-unit-003.md`.

Failure response: Revert the failing adapter only, retain canonical module and
fixture, and add the missing compatibility mapping before retry.

Checkpoint: Consumer map marks editor/chart migrated; duplicate scan output.

## UNIT-004 - Migrate Versioned Publication Snapshot And Share

Status: `PLANNED`; depends on migration-gated UNIT-003 and a current Publisher
integration receipt.

Unit goal: Add public-safe calculation basis/scope/version and make snapshot/share
totals match proposal-included direct cost while preserving legacy reads.

Outcome: Shared recipients see correct immutable included totals with no rate leak.

Linked IDs: REQ-001, REQ-003, SEC-001, UX-001, REQ-005; DEC-AUTO-005,
DEC-AUTO-008; RISK-002, RISK-003, RISK-005.

Non-goals: Publisher issue identity, funnel, recipient workflow, or shared-page
redesign.

Exact paths:

- `src/lib/publication/types.ts` safe additive fields/schema version;
- `src/lib/publication/snapshot.ts` builder and sanitizer;
- `src/lib/share/reconstruct-share-tree.ts` aggregation adapter;
- `src/components/share/SharePageSummaryCard.tsx` renders the stored public-safe
  calculation-basis label beside the canonical included total;
- `src/components/share/SharePageTabs.tsx` carries the same basis label into the
  summary/tab switch without introducing a second calculation path;
- publication/share security and snapshot tests.

Dependencies: UNIT-003 and a validator-clean Publisher integration receipt.
Verify its manifest/diff/contract hashes, acquire LEASE-PAR-PUBLICATION, and
preserve its identity/UX changes.

Owned scope and role: Publication integrator is sole writer for shared files.

Approach:

1. Adopt equivalent Publisher-added fields if present.
2. Increment snapshot schema additively.
3. Store safe `scopeStatus`, calculation version, currency, named totals, and
   public IDs only as required.
4. Compute at publication creation from canonical saved facts.
5. Legacy snapshots use stored `rowTotal` and compatibility basis.
6. Sanitizer allowlist proves private rates/provenance absent.
7. Share aggregation sums stored canonical minor-unit row totals once.

Expected postconditions: O2/contingency/scope cases pass; legacy fixtures render;
security tests prove no new leak.

Proof: TEST-004 and TEST-008 plus existing publication security/page/snapshot
suites. Evidence `.ai/99_scratch/calculation-parity-unit-004.md`.

Failure response: If safe additive fields conflict with Publisher contract,
reconcile names/version with its integrator; never add a parallel snapshot shape.
If sanitizer fails, stop and fix before any UI integration.

Checkpoint: Snapshot schema/version, legacy matrix, Publisher diff/hash, lease release.

## UNIT-005 - Migrate Preview, Export Model, Native XLSX, And Currency Formats

Status: `PLANNED`; depends on UNIT-004 and the Publisher integration receipt.

Unit goal: Make proposal preview/model/workbook consume canonical proposal bases
and prove actual XLSX serialization/readback.

Outcome: Preview and downloadable workbook agree on rows, scope, adjustments,
charges, currency, rounding, formulas, and cached values.

Linked IDs: REQ-001, DATA-001, REQ-004, UX-001, PERF-001, REQ-005;
DEC-AUTO-004, DEC-AUTO-006, DEC-AUTO-008; RISK-002, RISK-004 through RISK-006.

Non-goals: Proposal title/issue/revision redesign or new export format.

Exact paths:

- `src/lib/proposal-export/build-proposal-export-model.ts`;
- `settings.ts`, `types.ts`, `create-proposal-workbook.ts`, `xlsx-workbook.ts`;
- export API route and preview model/hook adapters;
- proposal model/preview/workbook/route/benchmark tests.

Dependencies: UNIT-004 and a still-current Publisher integration receipt.
Acquire LEASE-PAR-EXPORT after receipt validation.

Owned scope and role: One export integrator owns model/workbook/preview contract.

Approach:

1. Map flattened source rows to canonical inputs and preserve source references.
2. Use proposal-included direct basis and explicit charge stages.
3. Keep excluded rows in exclusions output, not priced totals.
4. Replace PHP-only formats with canonical currency format metadata.
5. Make formulas and scalar mode share cached values.
6. Set automatic/full recalculation metadata.
7. Generate actual buffers, inspect ZIP/XML, reopen using current parser, and
   compare cells/ranges/formulas/cached results.
8. Preserve workbook sheet names/layout/print settings unless parity requires a
   narrow change.

Expected postconditions: RED-PAR-006/008 turn green; preview/model/workbook exact
fixture totals match; current workbook/route tests and benchmark remain green.

Proof: TEST-005 and TEST-007. Evidence includes sanitized generated workbook hash,
XML assertion digest, parser readback, formula-on/off results, and benchmark in
`.ai/99_scratch/calculation-parity-unit-005.md`.

Failure response: Do not return a corrupt download. If formula serialization
differs, preserve cached scalar accuracy, fix XML/ranges, and keep criterion
failing until both modes pass.

Checkpoint: Workbook artifact hash, canonical cell map, benchmark receipt, lease release.

## UNIT-006 - Integrate Unsaved/Save-Reload/Print And Extract Capabilities

Status: `PLANNED`.

Unit goal: Complete the user-visible lifecycle and targeted capability extraction.

Outcome: Users see the same named totals through unsaved preview, saved reload,
shared review, print, and export without enlarged shared state owners.

Linked IDs: REQ-001, REQ-003, REQ-004, UX-001, REQ-005; DEC-AUTO-007,
DEC-AUTO-008; RISK-005, RISK-007.

Non-goals: Broad visual redesign or Publisher identity/funnel changes.

Exact paths:

- proposal preview signature/model/hook and Estimate Sheet integration;
- `src/components/share/SharePageTabs.tsx`, `src/app/share/print.css`, and print
  package tests only after Publisher completion/lease;
- focused extracted calculation/export state hooks/adapters where independently
  testable;
- cross-surface golden test integration.

Dependencies: UNIT-005.

Owned scope and role: UI/shared integrator owns existing shared files; verifier
owns browser proof and may not alter source during the proof pass.

Approach:

1. Prove materialized unsaved state recalculates preview but does not mutate
   persisted/public output prematurely.
2. Prove save/reload convergence.
3. Make print package consume stored publication totals/basis, not recalculate
   private rates.
4. Preserve synchronous beforeprint mount and afterprint cleanup.
5. Extract only calculation signature/state, workbook generation state, and print
   package projection where it creates focused ownership.
6. Run targeted browser print-media proof over deterministic publication fixture.

Expected postconditions: RED-PAR-007 turns green; AC-012/014 pass; Publisher UX
changes remain intact.

Proof: TEST-006 and TEST-009 plus targeted Playwright print media. Evidence
`.ai/99_scratch/calculation-parity-unit-006.md`.

Failure response: If print browser proof fails, inspect DOM/media and fix source;
do not accept DOM-only proof. If Publisher receipt drift or overlapping edits
appear, release the lease, invalidate the receipt, and resume from a fresh
validator-clean receipt.

Checkpoint: Browser command/result, printed row/total digest, component ownership map.

## UNIT-007 - Final Verification, Rollout Contract, Audit, And Cleanup

Status: `PLANNED`.

Unit goal: Run complete proof, close risks, inspect artifacts/security/blast
radius, prepare staged rollout/fix-forward, and clean resources.

Outcome: BETA-P0-05 is locally proven without overstating production release.

Linked IDs: SEC-001, PERF-001, REQ-005, OPS-001; all risks.

Non-goals: Deploy or hosted/provider mutation.

Exact scope: All changed calculation/publication/share/export/tests,
`scripts/benchmark-calculation-output-parity.ts`, existing
`scripts/benchmark-proposal-workbook.ts`,
`tests/vitest/calculation-output-parity-benchmark.test.ts`, existing
`tests/vitest/proposal-workbook-benchmark.test.ts`, this pack ledger/manifest,
generated temp workbook, and targeted browser resources.

Dependencies: UNIT-006.

Owned scope and role: Independent verifier; lead alone updates final statuses,
hashes, and releases leases.

Approach:

1. Run every targeted fixture/consumer/security/workbook/print suite.
2. Run typecheck, lint, error-handling, Cloudflare build, benchmark, and diff check.
3. Inspect actual XLSX hash/XML/readback and print-media receipt.
4. Search for duplicate formulas, PHP-only formats, ambiguous total labels, unsafe
   snapshot fields, stale adapters, and unrelated Publisher changes.
5. Emit the BETA-P1-10 contribution receipt with the touched caller map,
   pre-extraction characterization tests, bounded extraction decision, changed
   files, and verifier result in the final audit artifact.
6. Execute final traceability and risk audit.
7. Stop servers/browser, delete temp workbooks/fixtures, release leases, and
   digest scratch proof.
8. Refresh manifest evidence/status/hash only from actual receipts.

Expected postconditions: AC-001 through AC-015 and all manifest gates pass; all
units VERIFIED; implementation may be COMPLETE while release is evaluated
separately.

Proof: TEST-007 through TEST-010 and final command matrix. Final receipt
`.ai/99_scratch/calculation-output-parity-final-audit.md`.

Failure response: Reopen earliest causal unit. Security leak reopens UNIT-004;
workbook mismatch UNIT-005; print/save lifecycle UNIT-006; performance formula
design UNIT-002/003. Never weaken the golden expected values to match output.

Checkpoint: Final artifact/evidence/diff hashes, cleanup list, release evidence boundary.
