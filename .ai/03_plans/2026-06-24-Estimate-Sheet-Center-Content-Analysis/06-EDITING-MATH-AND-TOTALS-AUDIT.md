# 06 — Editing, Math, and Totals Audit

## Numeric cell inputs

Three numeric cells per row (row-table.tsx): Quantity (cell index 0, l. 346-367), Adjustment % (cell index 1, l. 397-423), Misc Cost (cell index 2, via `MoneyInput` l. 438-455).

**Input type:** `ControlInput type="number"` for quantity and adjustment; `MoneyInput` (cells.tsx:560-604) wraps `ControlInput type="text" inputMode="decimal"` for misc cost (formatted to peso when not focused).

**Focus behavior:**
- `onFocus` sets `focusedCell = { rowId, cellIndex }` (row-table.tsx:355, 407, 446).
- `MoneyInput` flips `isFocused` state to show raw value vs formatted peso (cells.tsx:582-596).
- Active cell highlighted via `bg-accent/10 ring-1 ring-inset ring-accent/30` class (row-table.tsx:343).

**Selection on focus:** Native number input selects on focus by default; `MoneyInput` does not explicitly call `.select()` (relies on default).

**Validation:**
- Quantity: `type="number" min="0" step="0.01"` (row-table.tsx:348-349). Browser rejects negative and non-numeric input at the keystroke level. **However**, paste of arbitrary text is silently accepted by `<input type="number">` (the field's `.value` becomes `""`), then `onChange` fires with empty string, which `setEditableRows` accepts, and on blur `parseNonNegativeEditableNumber("")` returns 0.
- Adjustment: same input constraints; parsed via `parseCostAdjustmentPercentage` (editable-row-model.ts:87-90) which clamps magnitude to [0, 100] and applies sign by mode.
- Misc Cost: `MoneyInput` accepts any text; `parseNonNegativeEditableNumber` strips non-numeric and clamps to ≥ 0.

**Silent normalization:** Invalid input becomes 0 (ESC hypothesis H8 — acceptable for spreadsheet UX, not a defect).

**Large numbers:** `parseEditableNumber` (l. 73-76) uses `Number(value.replace(/[^0-9.-]/g, ""))`. `Number.MAX_SAFE_INTEGER` (9 quadrillion) is fine; beyond that, precision loss. **Not a real concern for cost estimates.**

**Floating-point:** Subtotals computed as `itemCost * quantity` (editable-row-model.ts:81). Standard JS float behavior; rounding via `Math.round(value * 100) / 100` in proposal export only (`build-proposal-export-model.ts:69-71`). Live UI totals do NOT round; display formatter `pesoFormatter.format(value)` (Intl.NumberFormat) handles display precision.

## Calculation formulas

Per row (editable-row-model.ts:21-27, 76-92):

```
subTotal = itemCost × quantity                // l. 81
contingencyValue = (subTotal × contingencyPercentage) / 100   // l. 22, where contingencyPercentage is signed
totalItemCosts = subTotal + miscCost + contingencyValue        // l. 91
```

For library rows, `itemCost` comes from the canonical `EstimateRowItem.itemCost`.
For express rows, `itemCost` comes from `editableRow.unitCost`.

**Adjustment mode sign:**
- `contingency` mode → `contingencyPercentage ≥ 0` → adds to total.
- `discount` mode → `contingencyPercentage ≤ 0` → subtracts from total.
- The editable % field stores the magnitude (always positive display); sign applied at parse time (editable-row-model.ts:87-90 `parseCostAdjustmentPercentage`).

**Clamping:**
- `clampContingencyPercentage` (activity-history-model.ts:70-73): clamps signed value to [-100, 100].
- `clampCostAdjustmentMagnitude` (editable-row-model.ts:82-85): clamps unsigned magnitude to [0, 100].

## Totals

**Per-row total:** `totalItemCosts` (computed inline in row-table.tsx:209-246 `computedItem` memo).

**Per-node total:** `computeNodeTotal` (editable-row-model.ts:155-160) recursively sums rows + children.

**Per-sheet total:** `computeNodeTotals` (l. 162-183) returns a Map<nodeId, total>. Used for displayed node totals + project total.

**Project total:** Sum of root-node totals (EstimateSheetContent.tsx:1765-1768). Dispatched via `dispatchProjectTotalChange` (l. 2104) for the project header strip to consume.

**Display formatter:** `pesoFormatter` (activity-history-model.ts:60-64) — `Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 })`. The ₱ symbol is followed by a space: `pesoFormatter.format(v).replace("₱", "₱ ")` — applied in many call sites.

**Live vs persisted totals:** Live totals use `editableRows`; persisted totals use the canonical row. The two diverge during a typing session (live reflects unsaved edits). Once blur commits, the canonical row updates and they converge.

## Proposal export parity

`buildProposalExportModel` (build-proposal-export-model.ts:451-491) consumes `materializeEditableEstimateTree(estimateTree, editableRows)` — so the preview INCLUDES unsaved editable values (ESC-P3-18). The downloaded workbook's math is independent server-side.

**Round-then-sum discipline:** `roundMoney` (l. 69-71) and `roundQuantity` (l. 73-75) applied at every accumulator step in the proposal model. Live UI totals do NOT round; this can cause off-by-one-cent divergence between preview and persisted at scale (e.g. 1000 rows × fractional quantities).

## Edge cases tested

- 100% discount → `contingencyPercentage = -100` → `contingencyValue = -subTotal` → `totalItemCosts = miscCost` (zero + misc).
- Adjustment above 100 → clamped to 100 by `clampCostAdjustmentMagnitude`.
- Negative typed values → for `<input type="number" min="0">`, browser rejects the keystroke; for `MoneyInput` (text), `parseNonNegativeEditableNumber` clamps to 0.
- Empty input → `parseNonNegativeEditableNumber("")` → 0.
- Decimal separator → handled by `Number()` parser; both "." and "," (in PH locale) — actually only "." works; "," is stripped by the regex `[^0-9.-]`. **Potential issue for users typing in PH locale** — minor, browser's number input also rejects comma.
- IME composition → not specifically handled in numeric cells; composition-end events fire normally. Tested implicitly via jsdom.

## Test coverage

`tests/vitest/estimate-sheet-cost-inputs.test.tsx`:
- l. 412-422: contingency % calculation.
- l. 424-438: discount mode.
- l. 440-459: stale-closure guard for mode change after typing (regression test for a specific bug).
- l. 223-242: misc cost display formatting + raw editing.

**Gaps:**
- No test for floating-point accumulation across many rows.
- No test for `<input type="number">` paste handling.
- No test for IME in express editor fields.

## Findings surfaced here

- **ESC-P3-16** — "Cost (high → low)" group mode uses itemCost×quantity not editable totalItemCosts.
- **ESC-P3-18** — proposal preview includes unsaved edits without warning.
