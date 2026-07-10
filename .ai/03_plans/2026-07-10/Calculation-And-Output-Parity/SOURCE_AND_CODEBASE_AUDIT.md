# Source And Codebase Audit

## Audit Boundary

Grounded at git revision
`081a0757a9d7f34e75342a18e353f3014403de1e` plus current uncommitted source on
2026-07-10. This audit maps calculation and output consumers. Hosted behavior,
third-party spreadsheet rendering, and production release are not inferred from
local source.

## Source Ledger

| ID | Source/location | Authority and freshness | Fact | Contradiction/inference | Affected IDs |
|---|---|---|---|---|---|
| SRC-001 | Beta readiness audit and `tests/vitest/estimate-unification-oracle.test.ts` | Current audit and executable source | BETA-P0-05 requires screen/share/XLSX parity; oracle has implemented O1/O2 and unimplemented O3/O4b plus a known snapshot contingency divergence | Current coverage is partial, not a cross-surface pass | REQ-001, REQ-002, DATA-001, OPS-001 |
| SRC-002 | `src/lib/estimates/estimate-row-total.ts`, editable-row model, project-chart aggregation, `workspace-repository.ts:3078-3085`, `project-data-repository.ts:47-55` | Current calculation source | Multiple consumers implement materially similar row formulas; existing line-total module is declared the JS oracle; Project Data summary consumes an independent SQL total | Cost parts, scope, rounding, editable/labor adapters, and the Data-page SQL path are not centralized; SQL omits the legacy contingency fallback | REQ-002, DATA-001, PERF-001, REQ-005 |
| SRC-003 | `src/lib/publication/snapshot.ts`, `src/lib/share/reconstruct-share-tree.ts`, publication tests | Current public data contract | Snapshot calculates row totals and sanitizes sensitive rates; share reconstruction rolls them up | Legacy divergence and scope visibility must be fixed without leaking rates | REQ-003, SEC-001, UX-001 |
| SRC-004 | proposal preview/model, export route, workbook builders and tests | Current export implementation | Proposal export/model/XLSX are substantial and tested; model independently rounds and calculates, workbook uses PHP-specific number formats | Preview/model/workbook parity exists only within narrower fixtures and currency formatting is not generic | REQ-004, DATA-001, PERF-001, REQ-005 |
| SRC-005 | `../Publisher-And-Shared-Pages/` and current concurrent worktree | Current neighboring ownership contract | Publisher pack owns proposal identity/shared UX and may touch publication/export files | Parity edits must be serialized after its writer finishes | REQ-003, REQ-004, UX-001, REQ-005 |

## Current Formula Owners

### Existing line oracle

`src/lib/estimates/estimate-row-total.ts` exports
`computeEstimateRowLineTotal` and `sumEstimateRowLineTotals`. It implements:

```text
subtotal = quantity * unit_cost
legacy adjustment = contingency_percentage only when quantity_base is absent
adjustment = subtotal * adjustment_percentage / 100
line total = subtotal + misc_cost + adjustment
```

The module comment already declares it the single JS oracle, mirrored to the
historical SQL line-total function. It is therefore the correct compatibility
anchor for canonical expansion.

### Editable screen

`getEditableRowAmounts`, `computeEditableRowTotal`, `computeNodeTotal`, and
`computeNodeTotals` in
`src/components/workshop/estimate-sheet/rows/editable-row-model.ts` independently
calculate quantity contingency, subtotal, adjustment, misc, and total. Unsaved
preview materialization uses the editable model.

### Project Data/charts

`calculateProjectChartRowCostParts` in
`src/lib/project-charts/aggregate-project-charts.ts` independently calculates
base, misc, adjustment, and grand total. `buildProjectChartSeries` then buckets
rows by category/supplier/space.

### Project summary SQL / Data route

`listProjectEstimates` in
`src/lib/repositories/workspace-repository.ts:3078-3085` independently sums
`quantity * unit_cost + misc_cost + adjustment` in SQL. It uses floating-point
aggregation and `adjustment_percentage` only, so it omits the canonical oracle's
legacy `contingency_percentage` fallback when `quantity_base` is absent.
`getProjectDataRouteSummary` in
`src/lib/repositories/project-data-repository.ts:47-55` consumes that
`totalCostByEstimateId` map for Data-page estimate totals. This path is a current
formula owner, not merely a chart adapter, and must move behind the same
compatibility contract.

### Publication snapshot and share

`calculateRowTotal` in `src/lib/publication/snapshot.ts` repeats the row formula,
then stores only safe `rowTotal` and public display fields. The snapshot builder
correctly strips unit cost, misc cost, contingency percentage, source/library
metadata, and unsafe image URLs. `buildShareTreeFromSnapshotNodes` and
`reconstructTreeFromRows` aggregate stored row totals.

### Proposal preview/model/XLSX

`buildProposalExportModel` normalizes quantity, material/labor unit costs,
adjustment, misc, scope, and then rounds cost parts. It excludes non-included
scope from totals and adds sheet adjustment, project contingency, and VAT.
`createProposalWorkbook` writes cached values and formulas. Its number formats
are currently PHP-specific even though metadata currency is typed as an open
string and project currency allows any three-letter code.

## Existing Golden And Regression Coverage

- `estimate-unification-oracle.test.ts`:
  - O1 node totals implemented;
  - O2 share reconstruction implemented;
  - O3 proposal export cross-surface fixture not implemented;
  - O4a per-row chart formula implemented;
  - O4b full chart series cross-surface fixture not implemented;
  - known snapshot-RPC contingency divergence not implemented as an executable
    regression.
- `proposal-export-model.test.ts`, `proposal-export-tab-grouping.test.ts`,
  `proposal-export-preview.test.tsx`, `proposal-workbook.test.ts`,
  `proposal-export-route-workbook.test.ts`, and workbook benchmark cover many
  isolated export behaviors.
- `project-publication-snapshot.test.ts` covers sanitization, tab snapshots,
  totals, archived filtering, and safe images.
- `project-publication-page.test.tsx` covers print-only package mounting around
  `beforeprint`/`afterprint`, but not a cross-surface golden total.
- `project-charts-golden-master.test.ts` covers chart aggregation independent of
  the output fixture.

## Known-Red Baseline

| Red ID | Current failure | Exact source signal | Required repair |
|---|---|---|---|
| RED-PAR-001 | No one fixture spans all required surfaces | O3 and O4b cases are unimplemented in `estimate-unification-oracle.test.ts` | Build fixture and adapters before implementation changes |
| RED-PAR-002 | Snapshot contingency/version path has documented divergence | O-DIV-1 description in the oracle | Make current/legacy behavior executable and repair/version it |
| RED-PAR-003 | Multiple row formulas can drift | editable, chart, Project summary SQL, snapshot, and proposal model implementations above | One canonical cost-parts oracle plus adapters |
| RED-PAR-004 | Scope bases are implicit | Working screen includes active rows while proposal model excludes non-included scope | Name and reconcile total bases |
| RED-PAR-005 | Rounding boundaries differ | Editor/chart use unrounded numbers; proposal rounds components and accumulations | Canonical minor-unit rounding contract |
| RED-PAR-006 | Workbook currency format is PHP-specific | `PHP_FORMAT` applied across workbook columns | Dynamic format/display contract keyed by metadata currency |
| RED-PAR-007 | Print proof is not tied to the golden totals | Print DOM tests assert content/mount only | Print-media fixture total and row-scope proof |
| RED-PAR-008 | Native formula recalculation contract is incomplete | Cached formula values exist but no unified formula-on/off and recalculation-metadata assertion | Workbook XML/readback proof |
| RED-PAR-009 | Data-page estimate totals omit the legacy contingency fallback and canonical minor-unit aggregation | `workspace-repository.ts:3078-3085` feeds `project-data-repository.ts:47-55` | Replace or reconcile the SQL total with the canonical working-basis adapter and exact fixture |

These are pre-existing expected failures. Implementation must not label them
new regressions or mark them passing from a narrower unit test.

## Golden Fixture Contract

The fixture is deterministic: fixed clock, IDs, ordering, currency, and settings.
It includes:

- one group node that owns a row and nested area/leaf nodes;
- at least two estimate tabs and one archived tab excluded from active totals;
- ordinary row with fractional quantity and unit cost;
- quantity-base plus positive quantity-contingency row;
- negative quantity-contingency bounded at zero effective quantity;
- positive adjustment, negative discount, misc cost, and zero-cost row;
- explicit labor rate row;
- one `included`, one `excluded`, and one `by_owner` scope row;
- a linked row with internal supplier/source metadata that must not reach public
  snapshot output;
- sheet-level positive adjustment and negative discount scenarios;
- proposal contingency and VAT in included and percentage modes;
- PHP as the primary currency plus a second three-letter currency formatting
  contract; no conversion;
- values that exercise half-cent rounding, negative rounding, and repeated sums;
- unsaved editable changes followed by save/reload materialization;
- legacy publication snapshot input for compatibility/sanitization.

Each row has a stable expected cost-parts record and expected membership in the
working and proposal bases. Expected totals are fixture data, not generated by
the function under test.

A separate invalid-input fixture covers negative quantity/material/labor/misc,
out-of-range percentages, quantity/base/contingency mismatch, non-finite values,
and safe-integer overflow. Invalid rows never enter a golden total by clamping.

## Target Calculation Contract

Evolve `estimate-row-total.ts` to expose:

- normalized `EstimateCalculationInput`;
- `computeEstimateRowCostParts` returning quantity, material, labor, misc,
  adjustment, and unrounded diagnostic inputs plus canonical minor-unit amounts;
- `computeEstimateTotals(rows, basis)` with explicit row inclusion;
- `applySheetAdjustment` and `applyProposalCharges` at named boundaries;
- stable currency code and minor-unit scale;
- compatibility wrappers for existing callers.

Use integer minor units after multiplying quantities/rates:

1. Normalize quantity to exactly six decimal places and require all inputs finite.
2. Calculate material and labor extended amounts.
3. Round material, labor, adjustment, and misc independently to minor units.
4. Sum row parts in minor units.
5. Sum included row minor units.
6. Round each sheet/project charge from its immediate base, then add.

Negative adjustment percentages round symmetrically by absolute magnitude and
sign. Quantity, material/labor rates, and misc are non-negative. A signed
quantity-contingency amount is allowed only when
`round6(max(0, quantity_base + quantity_contingency_amount))` equals canonical
`round6(quantity)`; mismatch is `invalid_calculation_input`. Row and sheet
adjustment/discount percentages are in `[-100, 1000]`; proposal contingency and
VAT are in `[0, 100]`. Every minor-unit conversion, multiplication result, and
addition must remain a `Number.isSafeInteger`; otherwise return
`amount_out_of_range` and block proposal/export/share rather than clamp, coerce,
or emit a partial total. Floating point is confined before minor-unit conversion.
The pack adds no decimal library.

## Compatibility And Security Boundaries

- Legacy snapshots without scope or calculation version are interpreted with
  their stored `rowTotal`; sanitization remains fail-closed.
- New snapshots add safe `scopeStatus`, `calculationVersion`, `currencyCode`, and
  named totals only if the public contract requires them. They never add unit
  rates, misc cost, supplier, internal IDs, source URLs, or confidence.
- Opaque/public ID mapping stays unchanged.
- Archived tabs/nodes/rows stay excluded according to current publication rules.
- Invalid or mixed currency never triggers implicit conversion; comparison is
  unavailable or per-currency.
- Formula cells carry a cached value equal to the canonical model and workbook
  recalculation metadata. Formula-free mode carries the same scalar.
- New writes pass the same closed validator at every server action/repository
  boundary. A program-leased `0053_estimate_calculation_input_constraints.sql`
  rebuild adds D1 checks for representable non-negative quantity/rates/misc and
  bounded percentages after a read-only legacy scan. Legacy invalid rows are
  reported and fail closed; the migration does not silently repair or delete them.

## Direct And Transitive Blast Radius

Direct calculation files:

- `src/lib/estimates/estimate-row-total.ts`;
- editable row model adapters;
- chart aggregation adapters;
- `src/lib/repositories/workspace-repository.ts` project-estimate summary SQL and
  `src/lib/repositories/project-data-repository.ts` Data-route consumption;
- publication snapshot and share reconstruction;
- proposal export model/settings/types;
- workbook builders/readback;
- preview model/hooks;
- print package rendering and tests.

Transitive consumers include project lists, duplicate actions, D1 parity tests,
estimate sheet header/tree totals, project charts/Data, publication creation,
recipient shared pages, proposal export route, workbook benchmark, and any cached
summary query. This requires staged adapters and broad targeted regression proof.

## Shared Ownership Boundary

The Publisher/Shared Pages plan owns proposal identity, review flow, recipient
UX, and may concurrently edit snapshot/share/export surfaces. This pack owns only
calculation, row-scope, currency, and output parity. Before any shared edit:

1. wait for that writer to finish;
2. read its actual diff and manifest/ledger status;
3. acquire a file lease;
4. preserve identity/UX changes;
5. integrate parity through the smallest typed seam; and
6. run both packs' relevant tests.
