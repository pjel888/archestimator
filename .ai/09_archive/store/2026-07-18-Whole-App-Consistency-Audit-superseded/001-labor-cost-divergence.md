# Unit 001 — Remove Dead `laborUnitCost` Field Entirely (DONE)

**Finding:** F-01 (revised) · **Original severity:** CRITICAL (misdiagnosed) → **actual:** dead-code cleanup (MEDIUM)
**Priority:** P1 · **Effort:** M · **Risk:** LOW · **Requirement:** `REQ-001`
**Status:** **DONE** (implemented this session) · **Depends on:** — · **Test:** TEST_PROPOSAL (test files need a separate authorized update+run pass — see §"Test follow-up")

> **Correction of the original finding.** The initial audit (and the first version of this
> unit) claimed `laborUnitCost` was "dropped" at several total-computing sites, causing
> totals to **diverge** across surfaces, and proposed *propagating* labor everywhere.
> That premise was wrong. Deep verification against current source proved:
>
> 1. **No UI input** writes `laborUnitCost` (zero matches in `src/components/`).
> 2. **No D1 column** exists for labor (zero matches across all `migrations/*.sql`); it
>    only ever lived in `metadata.laborUnitCost`, which nothing writes.
> 3. So every read of `metadata.laborUnitCost` resolves to `undefined → 0`. No row can
>    ever hold a non-zero labor value, therefore **no divergence is possible in practice**
>    — every surface already computes the same material-only total.
> 4. The proposal export even self-documented this: a `LABOR_DISCLAIMER_NOTE` warning the
>    bid was "MATERIAL-ONLY pricing" because labor "is not yet captured."
>
> The real defect was the inverse of the original claim: **dead code** — a labor plumbing
> that can never produce a value, plus a misleading always-zero `LABOR`/`LABOR UNIT COST`
> column in the proposal export. Per owner direction ("we actually totally don't have the
> laborUnitCost anymore so that needs to be removed"), the fix was to **rip labor out
> entirely**, making totals material-only by construction.

## What was removed (implemented)

| File | Change |
| --- | --- |
| `src/lib/estimates/estimate-row-total.ts` | Removed `labor_rate` from `EstimateRowCostInput`, dropped `laborRate` from validation + `EstimateRowCostParts` (removed `laborMinorUnits`), removed the labor term from `computeEstimateRowCostParts` and `computeEstimateRowLineTotal`. Totals are now `material + adjustment(on material) + misc`. |
| `src/lib/estimates/types.ts` | Removed `laborUnitCost?: number` from `EstimateRowItem`. |
| `src/lib/estimates/estimate-tree-read-repository.ts` | Removed the dead `metadata.laborUnitCost` extraction and the `laborUnitCost` field from the returned tree node. |
| `src/lib/publication/snapshot.ts` | Removed `laborRate` from `SnapshotRowInput` and the `labor_rate:` arg to `computeEstimateRowCostParts`. |
| `src/lib/publication/authoring-projection.ts` | Removed the dead `metadata.laborUnitCost` projection into `laborRate`. |
| `src/lib/project-charts/types.ts` | Removed `laborRate?: number` from the chart row fact. |
| `src/lib/project-charts/aggregate-project-charts.ts` | Removed the `labor_rate:` arg to `computeEstimateRowCostParts`. |
| `src/lib/repositories/project-charts-repository.ts` | Removed `labor_rate:` arg + the dead `metadata.laborUnitCost` read (and the now-unused `metadata` local). |
| `src/lib/ai/read-context.ts` | Removed the dead `metadata.laborUnitCost` read + unused `metadata` local. |
| `src/lib/proposal-export/types.ts` | Removed `laborUnitCost`/`laborSubtotal` from `ProposalNormalizedSourceRow`, `ProposalExportSourceReference`, `ProposalExportRow`, `ProposalSummaryRow`, `ProposalSourceBreakdownRow`, `ProposalExportTotals`. |
| `src/lib/proposal-export/build-proposal-export-model.ts` | Removed the `labor_rate:` arg, the `laborUnitCost`/`laborSubtotal` fields throughout normalize/consolidate/source-ref/breakdown/summary/totals, and deleted the `cost_split_compatibility_mode` validation issue. |
| `src/lib/proposal-export/create-proposal-workbook.ts` | Removed the `LABOR_DISCLAIMER_NOTE`, the `labor` + `costTotal` columns from `BID_FORM_COLUMNS`, the `laborUnitCost` + `laborSubtotal` columns from `BREAKDOWN_COLUMNS`, the `laborCompatibilityMode` logic + `includeLaborDisclaimer` option, the labor term from the `lineCostFormula`, and the labor cells from the bid-form/exclusions/breakdown row arrays. |

Net: **14 files changed, ~114 deletions, ~17 insertions** (`git diff --stat`).

## Acceptance Evidence (collected)

- `AC-001`: `bun run type-check` (production `tsc --noEmit`) **PASS** — every labor
  reference removed from `src/`; zero remaining matches for `laborUnitCost`, `labor_rate`,
  `laborRate`, `laborSubtotal`, `laborMinorUnits`, `cost_split_compatibility_mode`,
  `LABOR_DISCLAIMER` in `src/`.
- `AC-002`: `bun run lint` on the 12 changed production files **PASS** (0 errors, 0
  warnings after removing the two now-unused `metadata` locals).
- `AC-003`: the row total is now material-only by construction —
  `total = round(qty × unitCost) + round((qty×unitCost) × adj%) + round(misc)`, identical
  across the editor, D1 intents, charts, publication snapshot, and proposal export because
  they all share the one oracle.

## Test follow-up (NOT executed — requires user authorization)

Seven Vitest files reference the removed fields and now describe a labor-capable API that
no longer exists. They were **not** edited or run (User Test Authorization Gate). Files:

- `tests/vitest/estimate-unification-oracle.fixtures.ts` (`parity-material-labor` case + `laborMinorUnits` expected fields)
- `tests/vitest/estimate-row-total.test.ts`
- `tests/vitest/calculation-output-parity.test.ts`
- `tests/vitest/project-publication-snapshot.test.ts`
- `tests/vitest/proposal-export-model.test.ts` (the `cost_split_compatibility_mode` + `laborUnitCost`/`laborSubtotal` assertions)
- `tests/vitest/project-charts-d1-repository.test.ts`
- `tests/vitest/proposal-workbook.test.ts`

**`TEST_PROPOSAL`:** updating these tests to drop the labor cases/assertions and
re-running them (`bun run test` or the targeted vitest scope) would materially prove the
removal didn't break the calculation/export contracts. The fixture
`parity-material-labor` should become `parity-material` with re-derived expected values
(no labor term), and every `laborMinorUnits`/`laborSubtotal`/`laborUnitCost` assertion
removed. Execution requires explicit user authorization.

## Recovery

The change is a clean removal tracked in `git` (uncommitted). If labor is ever re-added
as a real feature, re-introduce it at the oracle (`estimate-row-total.ts`) first, then
thread it through the read sites — do not resurrect the dead `metadata.laborUnitCost`
read pattern.
