# Unit 001 — `laborUnitCost` Dropped From Row Totals Across Surfaces (CRITICAL)

**Finding:** F-01 · **Severity:** CRITICAL · **Priority:** P1 · **Effort:** M · **Risk:** HIGH
**Requirement:** `REQ-001` · **Status:** TODO · **Depends on:** — · **Test:** `TEST_PROPOSAL`

## Problem

A single estimate row shows **different totals in different surfaces** because the
canonical oracle (`computeEstimateRowCostParts`) correctly adds
`quantity * (unit_cost + labor_rate)`, but labor lives only inside the opaque
`metadata.laborUnitCost` JSON blob — `EstimateRowRecord` has no first-class
`labor_rate` field. Five call sites build a row without extracting/forwarding
labor, so they compute the total with `labor_rate = 0`.

Net effect: an estimate with labor costs displays one total in the editor/D1,
a different (higher) total in charts/proposal-export/publication-snapshot, and the
duplication/list-summary paths silently lose labor. **Wrong money on a common path.**

## Verified Evidence (current source)

### The oracle (correct)
`src/lib/estimates/estimate-row-total.ts`
- `computeEstimateRowCostParts(input)` — signature accepts `labor_rate`.
- Line 212: `const labor = toMinorUnits(quantity * laborRate, "labor");`
- Line 220: `checkedAdd(material.value, labor.value, "row_total");`
- `laborRate` sourced from `input.labor_rate` (line 177).
- Legacy wrapper `computeEstimateRowLineTotal` (line 322) also adds labor at 330:
  `quantity * (unitCost + laborRate)`.

### PASS sites (4) — forward labor correctly
| Site | Evidence |
| --- | --- |
| `src/lib/proposal-export/build-proposal-export-model.ts:107` | `labor_rate: sourceRow.laborUnitCost ?? 0,` |
| `src/lib/publication/snapshot.ts:252` | `labor_rate: toFiniteNumber(row.laborRate ?? 0),` |
| `src/lib/project-charts/aggregate-project-charts.ts:146` | `labor_rate: toFiniteNumber(row.laborRate ?? 0),` |
| `src/lib/repositories/project-charts-repository.ts:256` (feed line 137) | SQL selects `metadata_json` (219), extracts at 235, `laborRate: finite(Number(metadata.laborUnitCost ?? 0))` (256) |

### DROP sites (5) — labor silently becomes 0
| Site | Evidence |
| --- | --- |
| `src/components/workshop/estimate-sheet/rows/editable-row-model.ts:313-321` | object literal to `computeEstimateRowCostParts` omits `labor_rate` entirely |
| `src/lib/estimates/d1-intents/rows.ts:305-308` | `estimateRowTotalMinorUnits(row)` passes raw `EstimateRowRecord` (no `labor_rate` field); drives every D1 mutation `totalDelta` (lines 1223, 2010, 2176, 2184, 2458, 2598, 2703, 3035-3038, 3233) |
| `src/lib/estimates/d1-intents/estimate-records.ts:332` | `sumEstimateRowLineTotals(sourceRows)` over `EstimateRowRecord[]` (estimate duplication) |
| `src/lib/repositories/workspace-repository.ts:3180-3200` | list-summary SQL SELECT is `estimate_id, quantity, quantity_base, quantity_contingency_amount, unit_cost, contingency_percentage, adjustment_percentage, misc_cost` — **no `metadata_json`** |
| `src/lib/repositories/project-estimate-sheets-repository.ts:200-221` | identical column list, **no `metadata_json`**, same drop |

### Type gap
`EstimateRowRecord` (defined in `src/lib/estimates/d1-intents/rows.ts:96-124`) has
no `labor_rate`/`laborUnitCost` field. Labor is only recoverable by parsing
`metadata_json`.

### Correction to the initial audit
The first-pass audit listed charts as a drop site and counted 4 drops. Deep
verification proved charts is a **PASS** site and there are **5** drops (it missed
`estimate-records.ts:332` and miscounted the two list-summary queries).

## Fix Direction

Follow the existing oracle (per `DEC-003`); do not build a parallel calculator.

1. **Normalize at read time.** In every SQL read that feeds a total computation,
   `SELECT metadata_json` (or confirm it's selected) and extract `laborUnitCost`
   into a first-class field on the returned row.
2. **Thread `labor_rate` into every total call.** At each DROP site above, pass
   `labor_rate: <resolved labor>` into the oracle. The PASS sites already show the
   pattern (`labor_rate: sourceRow.laborUnitCost ?? 0`).
3. **Consider adding `labor_rate` to `EstimateRowRecord`** as a denormalized
   resolved field populated by the read repository, so any future caller can't
   silently drop it. This is additive; no destructive migration. (If the team
   prefers not to widen the record type, a single `resolveLaborRate(row)` helper
   called at every total site is acceptable — but the record field is safer
   against regressions.)
4. **Do not** change the oracle math. It is correct.

### Owned paths
- `src/lib/estimates/estimate-row-total.ts` (read-only reference; do not change math)
- `src/lib/estimates/d1-intents/rows.ts`
- `src/lib/estimates/d1-intents/estimate-records.ts`
- `src/lib/repositories/workspace-repository.ts`
- `src/lib/repositories/project-estimate-sheets-repository.ts`
- `src/components/workshop/estimate-sheet/rows/editable-row-model.ts`
- (PASS sites: read-only verification only)

### Prohibited
- Do not introduce a new total-computing abstraction.
- Do not store labor in a new column unless the read-repository approach is
  insufficient (it isn't). No destructive migration.
- Do not change published-snapshot totals retroactively; the snapshot already
  passes labor correctly.

## Acceptance Evidence

- `AC-001`: every total-computing call site listed above passes a non-undefined
  `labor_rate` derived from `metadata.laborUnitCost` (or 0 when absent).
  Proof: diff + grep showing no remaining call site constructs a total input
  literal without `labor_rate`.
- `AC-002`: for a row with `metadata.laborUnitCost = 50`, `unit_cost = 100`,
  `quantity = 2`, the total is `300` in **all** of: editor, D1 mutation
  `totalDelta`, estimate duplication, workspace list summary, project-estimates
  picker, charts, proposal export, publication snapshot. (Static proof via the
  shared oracle; `TEST_PROPOSAL` to confirm at runtime if authorized.)
- Type-check + scoped lint pass.

## Recovery

If the record-type widening turns out to ripple beyond the listed paths, fall back
to the helper approach (`resolveLaborRate(row)`) at each call site without widening
the record. The oracle stays unchanged either way.

## Test Proposal (does not authorize execution)

`CHEAPEST_DECISIVE_EXISTING_TEST`: run the focused estimate-total tests after the
fix to prove labor is included at every call site. Silent money divergence is
exactly the class a unit test catches and review misses. Execution requires
explicit user authorization.
