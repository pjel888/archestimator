# 02 — Feature Brief And Scope

## Feature name

**Quantity + Adjustment Improvement** — per-row column rearchitecture with inline QTY+Contingency expression support.

## Source

User activation prompt (2026-06-26): *"One feature that we need to adjust is for the estimate row item in the estimate sheet content, especially in the QTY and ADJUSTMENT columns..."* — full verbatim transcribed in README.md.

## Problem

- The current estimate sheet has an **Adjustment** column to the right of **Subtotal**. Its meaning is a percentage-based contingency or discount applied to the SUBTOTAL (money).
- In field operations, contingency is thought of on a **quantity** basis first: "I need 100 m² of tile, plus 20 m² for breakage (20% contingency)." The current percentage-only column forces a two-step mental translation.
- There is no inline surface for this. The QTY cell accepts only a single number.
- There is no totals-area percentage adjustment row visible on the estimate sheet itself.

## User value

Estimators type **what they mean**: `100 + 20` in a QTY cell, and the sheet reflects both the breakdown and the total. One surface replaces two disconnected columns plus mental math.

## Scope

### In scope

| Phase | What |
|---|---|
| P1 | DB migration: add `quantityBase`, `quantityContingencyAmount` (nullable) to `estimate_row_items` |
| P1 | DB migration: add estimate-level `estimate_sheet_adjustments` table for the totals-area Adjustment row |
| P1 | Update generated Supabase types and repository/select/RPC payload selectors for the new fields |
| P2 | Update `update_estimate_row_item_with_history`, row snapshots, history context, and `updateEstimateRowItem` server validation |
| P3 | Add `parseQuantityExpression()` pure parser + unit tests |
| P3 | Rebind per-row new-mode contingency math from SUBTOTAL to QTY in `editable-row-model.ts` |
| P4 | Re-order column-model: `quantity → contingency → subTotal → miscCost → totalItemCosts` |
| P4 | Rename column header "Adjustment" → "Contingency" in `row-table.tsx` + `column-model.ts` |
| P5 | Switch QTY cell from `type="number"` to `type="text"` + `inputMode="decimal"` |
| P5 | QTY cell parses `100 + 20` → displays total `120`, renders breakdown Chip |
| P5 | Chip is editable (click opens inline fields for base + contingency) |
| P5 | Contingency column displays derived percentage; direct percentage entry is allowed only before a chip exists and then generates a chip |
| P6 | New totals-area Adjustment row (contingency/discount modes, bound to estimate SUBTOTAL) |
| P7 | Update structured row-update collaboration event (separate from cursor broadcast) |
| P7 | Update Excel export column order and fields |
| P7 | Regression tests; build, type-check, lint green |

### Out of scope

- Implementing the surplus row itself (separate workstream; the totals-area Adjustment row ships without it)
- Row reordering (sister plan `2026-06-26-Reorganize-Existing-Estimate-Row-Items`)
- Materials cell, Misc Cost cell, or Total Item Cost redesign
- Tax engine, multi-currency support
- Authentication or sharing redesign beyond the required `estimate_sheet_adjustments` RLS policies
- Removing the existing `contingencyPercentage` column from DB (preserved for legacy rows)

## Scenarios (the contract)

### S1 — Plain number regression
- **Action**: User types `100` in QTY cell, no contingency percentage set, tabs away.
- **Binary observable**: Cell shows `100`, no breakdown chip appears, Contingency column is empty, Subtotal = `100 × unitCost`.
- **Test ID**: `parseQuantityExpression returns { baseQuantity:100, contingencyAmount:0, expression:"100" }`

### S2 — QTY+N expression
- **Action**: User types `100+20` in QTY cell, tabs away.
- **Binary observable**: QTY cell displays `120`, a small Chip in its upper-right reads `100 + 20`, Contingency column shows `20%`, Subtotal = `120 × unitCost`.
- **Test ID**: `parseQuantityExpression returns { baseQuantity:100, contingencyAmount:20, contingencyPercentage:20, expression:"100+20" }`

### S3 — Edit contingency via chip
- **Action**: User clicks the `100 + 20` chip, edits the contingency from `20` to `30`, confirms.
- **Binary observable**: QTY cell becomes `130`, chip shows `100 + 30`, Contingency column shows `30%`, Subtotal = `130 × unitCost`.
- **Test ID**: `chip-edit-contingency-backpropagates-to-qty`

### S4 — Edit base via chip
- **Action**: User clicks chip, edits base from `100` to `150`, confirms.
- **Binary observable**: QTY cell becomes `170`, chip shows `150 + 20`, Contingency column shows approximately `13%` (raw ratio `13.3333%`). The contingency quantity stays absolute unless the user edits the percentage before chip creation.
- **Test ID**: `chip-edit-base-keeps-absolute-contingency`

### S5 — Remove contingency
- **Action**: Row has `100 + 20`. User edits the chip contingency amount to 0 or clears the expression back to `100`.
- **Binary observable**: QTY cell reverts to `100`, chip disappears.
- **Test ID**: `clear-contingency-reverts-qty-to-plain-number`

### S6 — Column order
- **Action**: Any estimate sheet with rows renders.
- **Binary observable**: Column headers in order: `# | Select | Materials | Qty | Contingency | Subtotal | Misc Cost | Total Item Cost | Actions`.
- **Test ID**: `column-order-qty-contingency-subtotal`

### S7 — Totals-area Adjustment
- **Action**: User sets 5% contingency mode in the new totals-area Adjustment row.
- **Binary observable**: Grand total = subtotal × 1.05. Row shows mode dropdown + percentage input + computed peso value.
- **Test ID**: `totals-area-adjustment-applies-to-subtotal`

### S8 — Existing row regression
- **Action**: Open existing estimate with rows that have `contingencyPercentage = 0`.
- **Binary observable**: Rows render with correct quantity, no chip, no spurious percentage.
- **Test ID**: `existing-rows-survive-migration`

### S9 — Excel export column order
- **Action**: Export estimate with new columns to XLSX.
- **Binary observable**: Excel column headers match new order. Row with `100+20` exports `quantityBase=100`, `quantityContingencyAmount=20`.
- **Test ID**: `xlsx-export-reflects-new-column-layout`

### S10 — Keyboard accessibility
- **Action**: User tabs through cells. QTY cell focused, types `100+20`, presses Tab → moves to Contingency cell.
- **Binary observable**: Focus moves correctly. Chip is keyboard-navigable (Enter to open, Escape to close, Tab between fields).
- **Test ID**: `qty-expression-chip-keyboard-navigation`

### S11 — Decimal support
- **Action**: User types `100.5+12.3` in QTY cell.
- **Binary observable**: QTY cell displays `112.8`, chip shows `100.5 + 12.3`.
- **Test ID**: `parseQuantityExpression handles decimals`

### S12 — Negative rejection
- **Action**: User types `100 + -20` in QTY.
- **Binary observable**: Parser rejects negative contingency. QTY cell shows a validation error.
- **Test ID**: `parseQuantityExpression rejects negative contingency`
