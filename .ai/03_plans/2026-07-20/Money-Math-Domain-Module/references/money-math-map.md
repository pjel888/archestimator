# Money-Math Surface Map

Evidence-backed map of the canonical oracle, the divergent copies, the display
surfaces, and the formatter definitions. Produced by the 2026-07-21 deep
money-math trace.

## Canonical oracle

**`computeEstimateRowCostParts`** — `src/lib/estimates/estimate-row-total.ts:199`

- Integer minor units (`MINOR_UNIT_FACTOR = 100`, line 12)
- `toMinorUnits` (line 122) — independent `Math.round` per component
- `checkedAdd` (line 130) — safe-integer overflow check on every addition
- Independent rounding of material, adjustment, misc (lines 204–213), then summed in minor units
- Returns `EstimateRowCostParts` with `materialMinorUnits`, `adjustmentMinorUnits`, `miscCostMinorUnits`, `subTotalMinorUnits`, `totalMinorUnits`, `total`

Supporting canonical helpers (same file): `validateEstimateCalculationInput` (158),
`applySheetAdjustment` (231), `applyProposalCharges` (245), `computeEstimateTotals` (266).

The file is **dependency-free** (no `server-only`, no D1, no React) — pure domain math.

## Divergent copies (IEEE-754 float)

| Function | Location | Strategy |
|----------|----------|----------|
| `computeEstimateRowLineTotal` | `estimate-row-total.ts:309` | Raw IEEE-754: `quantity * unitCost + miscCost + (subTotal * adjustmentPct)/100`. Self-described "Compatibility wrapper" (line 308). Ignores `currency_code`. |
| `sumEstimateRowLineTotals` | `estimate-row-total.ts:320` | `reduce` over the legacy function; compounds float error across rows. |
| `adjustmentValue`/`contingencyValue` persisted in history events | `d1-intents/rows.ts:345,347` | Float-derived (`base * contingencyPercentage / 100`) in the same module that computes the canonical total. Audit-field drift. |
| `componentCreateTotal` (AI budget) | `ai/package-builder/draft.ts:2295` | `reduce((sum,c) => sum + c.unitCost + c.miscCost, 0)` — ignores quantity, adjustment, currency. Reaches persisted estimate via `apply.ts:2667`. |

## ARCH-08 — upward repository dependency (CONFIRMED)

| Caller | Import site | Use site |
|--------|-------------|----------|
| `src/lib/repositories/project-charts-repository.ts` | line 2 | line 132 |
| `src/lib/repositories/project-estimate-sheets-repository.ts` | line 4 | line 221 |
| `src/lib/repositories/workspace-repository.ts` | line 16 | line 3200 |
| `src/lib/estimates/d1-intents/estimate-records.ts` | line 6 (`sumEstimateRowLineTotals`) | line 332 |

Canonical callers (already correct, 6 files):
- `src/components/workshop/estimate-sheet/rows/editable-row-model.ts:313`
- `src/lib/publication/snapshot.ts:246`
- `src/lib/estimates/actions.ts:898,904`
- `src/lib/estimates/d1-intents/rows.ts:306`
- `src/lib/proposal-export/build-proposal-export-model.ts:102`
- `src/lib/project-charts/aggregate-project-charts.ts:141` (hardcodes `currency_code: "PHP"` at 148)

## Display surfaces and their feeds

| Surface | Component / file | Feed | Verdict |
|---------|------------------|------|---------|
| Estimate sheet row totals (live edit) | `estimate-sheet/rows/row-table.tsx:946` | `editable-row-model.ts:313` → oracle | **Canonical** |
| Project total header (live) | `ProjectTotalHeader.tsx:263` | `editable-row-store.projectTotal` → oracle | **Canonical** |
| Estimates list "Ongoing Project Cost" | `ProjectEstimatesTable.tsx:892` | `workspace-repository.ts:3200` / `project-estimate-sheets-repository.ts:221` → legacy | **Divergent (UNIT-002)** |
| Project charts (estimate subtotals) | `project-charts-repository.ts:132` | legacy | **Divergent (UNIT-002)** |
| Project charts (composition buckets) | `aggregate-project-charts.ts:141` | oracle (hardcodes PHP) | **Canonical** — but same feature mixes both |
| Proposal export (xlsx) | `create-proposal-workbook.ts:348` | `build-proposal-export-model.ts:102` → oracle | **Canonical** |
| Publication snapshot | `snapshot.ts:246` (recomputed at publish); `rowTotalMinorUnits` cached at `:293` | oracle; cached downstream | **Canonical, recomputed-then-cached** |
| Activity history detail | `activity-history.tsx:1387,1401,1418` | reads stored `snapshot.lineTotal` (canonical at write); but `adjustmentValue`/`contingencyValue` from `rows.ts:345,347` (float) | **Canonical total / float audit fields** |
| AI package-builder budget summary | `EstimateCopilotFloatingButton.tsx:486,490,494` | `draft.ts:2295` → raw float | **Divergent (UNIT-002)** |

## Currency-code handling

- Oracle: `normalizeCurrency` (`estimate-row-total.ts:135`) defaults `"PHP"`, supports `{AUD,CAD,EUR,GBP,HKD,NZD,PHP,SGD,USD}` (line 17). Rejects others with `unsupported_currency`. `computeEstimateTotals` rejects mixed currencies (`:279`).
- Legacy `computeEstimateRowLineTotal` **silently ignores** `currency_code`.
- Most canonical callers hardcode PHP: `editable-row-model.ts:320`, `aggregate-project-charts.ts:148`.
- `project-charts-repository.ts:85` reads `project.currency_code` but defaults to `"USD"` (not PHP) then passes the row into the currency-blind legacy path. A non-PHP project gets USD-labeled totals via a currency-blind float path.
- Proposal-export and publication correctly thread project currency.

**Multi-currency edge case:** the oracle supports it, but every consumer except proposal-export/publication either hardcodes PHP or ignores currency. Three different behaviors for one USD project.

## CORRECTNESS-07 (`quantity_base IS NULL` / `contingency`)

Handled in the oracle at `validateEstimateCalculationInput`, `estimate-row-total.ts:176-181`:
```
adjustment_percentage ?? (quantity_base === null || undefined
    ? contingency_percentage
    : 0)
```
Rule: if `quantity_base` present, `contingency_percentage` forced to 0 (it lives in `quantity_contingency_amount`); if null, `contingency_percentage` is the legacy adjustment proxy.

- Legacy `computeEstimateRowLineTotal` mirrors this exactly (`:312-314`). **Consistent.**
- 4 canonical call sites replicate the disambiguation inline before calling the oracle (`editable-row-model.ts:307-321`, `build-proposal-export-model.ts:98-110`, `snapshot.ts:243-255`, `aggregate-project-charts.ts:138-149`).

**Verdict:** CORRECTNESS-07 correctly handled. The disambiguation is copy-pasted into 5 sites — a maintenance hazard Pack E relocates to one home, not a correctness bug.

## Formatter definitions (11 total)

### `formatPeso` (9 sites)

| # | File:line | Decimals | Locale | Symbol spacing | Multi-currency |
|---|-----------|----------|--------|----------------|----------------|
| 1 | `components/workshop/ProjectEstimatesTable.tsx:301` | 2 | en-PH | `.replace("₱","₱ ")` | no |
| 2 | `components/workshop/EstimateCopilotFloatingButton.tsx:192` | 0-2 (per-code) | en-PH | varies | **yes** (`copilotCurrencyFormatters` map) |
| 3 | `components/workshop/ProjectTotalHeader.tsx:18` | 2 | en-PH | replace | no |
| 4 | `components/workshop/estimate-sheet/activity-history-model.ts:98` (exported; `pesoFormatter` at `:63`) | 2 | en-PH | replace | no |
| 5 | `components/landing/new-redesign/interactions/ExactEstimateWorkspace.client.tsx:83` | **0 (rounds)** | **en-US** | `` `PHP ${...}` `` (no Intl) | no |
| 6 | `stories/fixtures/product-fixtures.ts:158` (exported) | **0** | en-PH | Intl | no |
| 7 | `lib/estimates/estimate-tree-read-repository.ts:420` | min 2, **no max** (sub-cent risk) | en-PH | Intl | no |
| 8 | `lib/activity/activity-formatters.ts:53` | 2 | en-PH | Intl | no |
| 9 | `lib/repositories/component-library-repository.ts:618` | min 2, **no max** (sub-cent risk) | en-PH | Intl | no |

### `formatCurrency` (2 sites)

| # | File:line | Decimals | Locale | Multi-currency |
|---|-----------|----------|--------|----------------|
| 10 | `lib/proposal-export/create-proposal-workbook.ts:169` | 2 | en-PH | **yes** (manual `₱${...}` / `${code} ${...}`) |
| 11 | `components/ui/currency-input.tsx:25` (`formatCurrencyInputValue`) | 2 | en-PH/en-US (per-locale map) | no (number-only, no symbol) |

**Disagreements:** #5 rounds to whole pesos + US grouping; #6 drops decimals; #7 and #9 can emit sub-cent digits on float trash; #2 and #10 are the only multi-currency-aware ones; #1/#3/#4/#8 agree on `maxFrac 2`. The `.replace("₱","₱ ")` symbol-spacing is applied inconsistently (only #1, #3, #4).

**Prior audit said "8 different files."** Actual: **11 definitions across 11 files.** The "8" undercounts by at least 3.

## Module placement recommendation

The money-math layer belongs in its own **neutral leaf domain module**
(`src/lib/estimates/domain/`). Reasoning:

- Placing it inside `d1-runtime` (Pack C) would force `d1-intents` (Pack D) and client components to depend on the runtime pack — re-creating ARCH-08 in a new form.
- Placing it inside `mutation-intents` (Pack D) would force read-only repositories and client components to depend on the mutation pack — worse, since reads outnumber writes.
- A leaf domain module with no infra imports can be depended on by Pack C, Pack D, UI, and export without any upward dependency. **This is the only placement that resolves ARCH-08 rather than relocating it.**

The same module should own the formatter consolidation (11 → 2) and the `quantity_base` disambiguation rule (currently copy-pasted into 5 sites), since all three are the same canonical money/quantity domain concern.
