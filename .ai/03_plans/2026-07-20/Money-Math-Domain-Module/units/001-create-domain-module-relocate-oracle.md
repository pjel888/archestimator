# UNIT-001 — Create `src/lib/estimates/domain/` and relocate the oracle

## Goal

Create the neutral leaf domain module `src/lib/estimates/domain/` and relocate
the canonical oracle (`computeEstimateRowCostParts`) and the `quantity_base`/
`contingency` disambiguation rule into it. The legacy `computeEstimateRowLineTotal`
becomes a thin adapter delegating to the oracle. No callers change in this unit.

## Status

`READY` · depends on: (none) · requirement: `DATA-001` · risks: (none)

## Why this matters

The oracle is dependency-free but lives in `src/lib/estimates/estimate-row-total.ts`,
which creates ARCH-08: read repositories import upward into `lib/estimates/` to
call the legacy wrapper. A neutral leaf module (no `server-only`, no D1, no
React) can be imported by Pack C (`d1-runtime`), Pack D (`mutation-intents`),
UI, export, and repositories without any upward dependency — the only placement
that resolves ARCH-08 rather than relocating it.

## Current state

Source: `src/lib/estimates/estimate-row-total.ts` (322 lines). Key exports:
- `computeEstimateRowCostParts(row: EstimateRowCostInput): EstimateRowCostParts` (line 199) — canonical
- `computeEstimateRowLineTotal(row): number` (line 309) — legacy float wrapper
- `sumEstimateRowLineTotals(rows): number` (line 320) — legacy reducer
- `validateEstimateCalculationInput` (line 158), `validateQuantityContingency` (line 140) — the disambiguation rule
- `applySheetAdjustment` (231), `applyProposalCharges` (245), `computeEstimateTotals` (266)
- Constants: `ESTIMATE_CALCULATION_VERSION = 1` (8), `ESTIMATE_CALCULATION_CURRENCY_SCALE = 2` (9), `MINOR_UNIT_FACTOR = 100` (12)

The file has NO `import "server-only"` and NO D1/React imports — it is already
a pure domain module in shape; it just lives in the wrong directory.

## Owned paths / resources

- `src/lib/estimates/domain/index.ts` (or split files) — CREATE.
- `src/lib/estimates/estimate-row-total.ts` — becomes a re-export shim.

## Implementation boundary

1. Create `src/lib/estimates/domain/` with the relocated oracle. Suggested
   shape:
   - `src/lib/estimates/domain/cost-parts.ts` — `computeEstimateRowCostParts`,
     `sumEstimateRowCostParts`, the `EstimateRowCostInput`/`EstimateRowCostParts`
     types, `MINOR_UNIT_FACTOR`, `toMinorUnits`, `checkedAdd`.
   - `src/lib/estimates/domain/quantity-contingency.ts` —
     `validateQuantityContingency`, the `quantity_base IS NULL`/`contingency`
     disambiguation rule (currently inline at `estimate-row-total.ts:176-181`).
   - `src/lib/estimates/domain/totals.ts` — `applySheetAdjustment`,
     `applyProposalCharges`, `computeEstimateTotals`.
   - `src/lib/estimates/domain/index.ts` — re-exports the public surface.
   - `src/lib/estimates/domain/calculation-version.ts` —
     `ESTIMATE_CALCULATION_VERSION`, `ESTIMATE_CALCULATION_CURRENCY_SCALE`.
2. Move the function bodies **verbatim**. Do not improve, reformat, or alter
   the arithmetic. The pure-math test suite is the gate.
3. Replace `src/lib/estimates/estimate-row-total.ts` with a re-export shim:
   ```ts
   export {
     computeEstimateRowCostParts, sumEstimateRowCostParts,
     validateEstimateCalculationInput, validateQuantityContingency,
     applySheetAdjustment, applyProposalCharges, computeEstimateTotals,
     ESTIMATE_CALCULATION_VERSION, ESTIMATE_CALCULATION_CURRENCY_SCALE,
     MINOR_UNIT_FACTOR,
     type EstimateRowCostInput, type EstimateRowCostParts,
   } from "@/lib/estimates/domain";
   // Legacy adapters (UNIT-002 migrates callers off these):
   export { computeEstimateRowLineTotal, sumEstimateRowLineTotals } from "./legacy-adapters";
   ```
4. Create `src/lib/estimates/legacy-adapters.ts` with the legacy
   `computeEstimateRowLineTotal`/`sumEstimateRowLineTotals` reimplemented as
   thin adapters that delegate to the oracle (returning `.totalMinorUnits / 100`).
   This preserves the float-returning signature for existing callers while
   making the arithmetic canonical.
5. Do NOT change any caller. The re-export shim keeps all existing imports
   working.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Type-check | `bun run type-check` | exit 0 |
| Lint | `bun run lint` | exit 0 |
| Pure-math regression | `bunx vitest run tests/vitest/estimate-row-total.test.ts tests/vitest/calculation-output-parity.test.ts --maxWorkers=1` | all pass (arithmetic unchanged) |

## Scope

**In scope:** `src/lib/estimates/domain/*` (new), `src/lib/estimates/estimate-row-total.ts`
(shim), `src/lib/estimates/legacy-adapters.ts` (new).

**Out of scope:** any caller change (UNIT-002). Formatter consolidation
(UNIT-003). Any arithmetic change.

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run lint` exits 0
- [ ] The pure-math suite passes unmodified
- [ ] `src/lib/estimates/domain/` exists with the relocated oracle
- [ ] `estimate-row-total.ts` is a re-export shim (no function bodies)
- [ ] `legacy-adapters.ts` delegates to the oracle (`.totalMinorUnits / 100`)
- [ ] No caller is modified (`git status` shows only the new module + the two rewritten files)

## Acceptance evidence

- The pure-math suite passes (arithmetic is bit-identical after relocation).
- `git diff --stat` shows new files in `domain/` + the shim + the adapters; no
  other files touched.

## STOP conditions

- Any pure-math test fails after the relocation — the move altered the
  arithmetic. Revert and re-examine the move (the bodies must be verbatim).
- An existing import path breaks that the re-export shim cannot satisfy
  (e.g. a type-only import the shim doesn't re-export). Add it to the shim.

## Recovery

The relocation is mechanical. If type-check fails on a missing export, add it
to the shim's re-export list.

## Maintenance notes

- After this unit, the canonical home for money-math is `domain/`. New
  money/quantity logic goes there.
- Pack C and Pack D will import from `domain/` rather than from
  `estimate-row-total.ts` — the shim exists only for legacy callers during the
  UNIT-002 migration, and can be deleted once UNIT-002 completes.
- A reviewer should confirm the legacy adapters' float output matches the old
  wrapper's output on the pure-math suite's fixture corpus (the test is the
  gate).
