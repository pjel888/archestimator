# 03 — Source And Codebase Audit

All evidence gathered via direct file reads (three explore agents timed out without output; see `00_AGENT_COORDINATION.md`). Paths and line numbers are verified against the live codebase as of 2026-06-26.

---

## 1. Column Model

**File**: `src/lib/estimate-sheet/column-model.ts` (122 lines)

Current per-row column order (line 3–12, 34–43):

```
index | select | material | quantity | subTotal | adjustment | miscCost | totalItemCosts | actions
```

- `quantity` (line 38): id=`"quantity"`, label=`"Qty"`, defaultWidth=58px, cssVar=`--est-col-quantity`
- `subTotal` (line 39): id=`"subTotal"`, label=`"Subtotal"`, defaultWidth=92px, cssVar=`--est-col-subTotal`
- `adjustment` (line 40): id=`"adjustment"`, label=`"Adjustment"`, defaultWidth=106px, cssVar=`--est-col-adjustment`

Column type union (line 3–12): `EstimateColumnId` includes `"adjustment"` but no `"contingency"`.
Resizable union (line 14–20): `ResizableEstimateColumnId` also includes `"adjustment"`.

Grid template (lines 60, 62–72):
```typescript
export const DEFAULT_ESTIMATE_COLUMN_TEMPLATE = "36px 32px minmax(160px,1fr) 58px 92px 106px 92px 108px 30px";
export const ESTIMATE_COLUMN_TEMPLATE = [
  "36px", "32px",
  "minmax(var(--est-col-material, 160px), 1fr)",
  "var(--est-col-quantity, 58px)",
  "var(--est-col-subTotal, 92px)",
  "var(--est-col-adjustment, 106px)",
  "var(--est-col-miscCost, 92px)",
  "var(--est-col-totalItemCosts, 108px)",
  "30px",
].join(" ");
```

**Plan impact**: Must swap positions of `subTotal` and `adjustment` in both arrays and rename `adjustment` → `contingency` column ID and label. The new percentage Adjustment is not another per-row column in this grid; it renders in the totals area below the row table.

**Existing test**: `tests/vitest/estimate-sheet-column-model.test.ts` — pins column order, widths, clamping, normalization. Must be updated.

---

## 2. EstimateRowItem Type

**File**: `src/lib/estimates/types.ts` (187 lines)

Core row type (lines 83–139):

```typescript
export type EstimateRowItem = {
  id: string;
  material: string;
  name?: string;
  description: string;
  supplier: string;
  source: EstimateRowItemSource;
  unit: string;
  itemCost: number;        // unit price
  price?: number;
  currency?: string;
  quantity: number;          // current total quantity (single number)
  subTotal: number;          // itemCost × quantity
  contingencyPercentage?: number;  // signed: negative=discount, positive=contingency
  contingencyValue?: number;       // subTotal × contingencyPercentage / 100
  miscCost: number;
  miscCostDefault?: number;
  totalItemCosts: number;   // subTotal + miscCost + contingencyValue
  // ... 40+ more metadata fields ...
};
```

**Plan impact**: Add two nullable fields to `EstimateRowItem`:
- `quantityBase?: number` — the base quantity before contingency (null → legacy mode)
- `quantityContingencyAmount?: number` — the contingency add-on (null → legacy mode)

When both are non-null, `quantity = quantityBase + quantityContingencyAmount`. The existing `contingencyPercentage` on the per-row level is repurposed: when `quantityBase` is set, `contingencyPercentage = (quantityContingencyAmount / quantityBase) * 100` (derived). When `quantityBase` is null (legacy), `contingencyPercentage` keeps its legacy meaning (money percentage on subtotal) until a future migration phase.

**Key nuance**: The `EstimateRowItem` is used as DB row type, library item, and proposal-export type. Changes to it cascade to all three domains.

---

## 3. Editable Row Model (Math + State)

**File**: `src/components/workshop/estimate-sheet/rows/editable-row-model.ts` (259 lines)

`EditableRowValue` (lines 54–66):
```typescript
export type EditableRowValue = {
  quantity: string;              // editable string, parsed by parseEditableNumber
  contingencyMode: CostAdjustmentMode;  // "contingency" | "discount"
  contingencyPercentage: string; // editable string, positive number (sign from mode)
  miscCost: string;
  name: string;
  description: string;
  supplier: string;
  unit: string;
  unitCost: string;
  imageUrl: string;
  sourceUrl: string;
};
```

Current math (lines 145–153): `subTotal = itemCost × quantity`, then `contingencyValue = subTotal × pct / 100`, then `totalItemCosts = subTotal + miscCost + contingencyValue`.

**Plan impact**: Add `quantityExpression: string` and/or `quantityBase: string`, `quantityContingencyAmount: string` to `EditableRowValue`. Rebind per-row contingency math: `contingencyPercentage = (quantityContingencyAmount / quantityBase) × 100` (derived from QTY expression). `subTotal = itemCost × (quantityBase + quantityContingencyAmount)`. Legacy subtotal-adjustment math is preserved only for rows where `quantityBase IS NULL`; the new totals-area Adjustment uses its own estimate-level adjustment record.

`CostAdjustmentMode` (line 67): `"contingency" | "discount"`. The per-row contingency column will drop the discount option for new/converted rows. The mode toggle remains only in the new totals-area Adjustment row.

`parseEditableNumber()` (lines 73–76): strips non-numeric chars, returns `0` for non-finite. This is insufficient for the `100+20` expression. A new `parseQuantityExpression()` pure function is needed.

---

## 4. Row Table Rendering

**File**: `src/components/workshop/estimate-sheet/rows/row-table.tsx` (802 lines)

QTY cell (lines 351–381): Uses `<ControlInput type="number" min="0" step="0.01" value={computedItem.editableQuantity} />`. On blur, commits if `quantity !== storedQuantity`. Cell index = 0.

Subtotal cell (line 382): **Display-only** — `<td>...{pesoFormatter.format(computedItem.subTotal)}...</td>`.

Adjustment cell (lines 383–442):
- Dropdown: `<DropdownSelect value={computedItem.editableContingencyMode} options={COST_ADJUSTMENT_MODE_OPTIONS} />` (lines 390–405) — mode toggle.
- Percentage input: `<ControlInput type="number" min="0" max="100" step="0.01" value={computedItem.editableContingencyPercentage} />` (lines 408–435).
- Value display: `<p>{formatPeso(computedItem.contingencyValue)}</p>` (lines 438–439).

Header (lines 695–742): Column headers as `<th>` elements — `"Qty"`, `"Subtotal"`, `"Adjustment"`, `"Misc Cost"`, `"Total Item Cost"`. The `"Adjustment"` label must become `"Contingency"`.

Grid template: `gridTemplateColumns: ESTIMATE_COLUMN_TEMPLATE` on both header `<tr>` (line 695) and body rows (line 288).

**Plan impact**:
- QTY cell: Switch `type="number"` → `type="text"` + `inputMode="decimal"`. Add parser. Render Chip when expression has `+`.
- Subtotal cell: No change (display-only, math is in `computedItem`).
- Adjustment cell: Remove mode dropdown (contingency-only). Remove `contingencyValue` peso display (it was money; now it's quantity-based). Show derived percentage. Make column read-only when chip is active.
- New totals-area Adjustment: Add below the row table. A future surplus row can be inserted above it without changing persistence.

---

## 5. Activity History Model / Flatten

**File**: `src/components/workshop/estimate-sheet/activity-history-model.ts`

`CostAdjustmentMode` (line 67): `"contingency" | "discount"`. `clampContingencyPercentage()` (line 71): clamps to ±100. `toEditableContingencyMode()` (line 76): maps signed value → mode.

`FlattenedEstimateRow` (approx lines 38–50): includes `quantity`, `contingencyPercentage`, `contingencyValue`, `miscCost`, `lineTotal`. Must add `quantityBase`, `quantityContingencyAmount`.

---

## 6. Server Actions

**File**: `src/lib/estimates/actions.ts`

`updateEstimateRowItem()` (line 2729): accepts `{ projectId, estimateId, rowId, material, description, supplier, unit, unitCost, quantity, contingencyPercentage, miscCost, sourceSnapshot, metadata, mutationId, expectedRowRevision }`.

**Plan impact**: Add `quantityBase` and `quantityContingencyAmount` parameters to row updates. The current `updateEstimateRowItem` path calls the `update_estimate_row_item_with_history` RPC, so the RPC signature/JSON patch handling, history snapshot, and generated DB types must be updated. The estimate-level totals-area Adjustment should use a separate server action so row updates do not acquire unrelated sheet-level state.

**Additional propagation evidence**:
- `src/lib/estimates/actions.ts` calls `supabase.rpc("update_estimate_row_item_with_history", ...)`.
- `src/lib/repositories/workspace-repository.ts` and `src/lib/repositories/estimate-repository.ts` row selectors currently omit `quantity_base` and `quantity_contingency_amount`.
- `supabase/migrations/20260524033151_estimate_sheet_version_control.sql` and later RPC migrations define row snapshots and update payload handling that must carry the new fields for history/audit fidelity.

---

## 7. Proposal Export

**File**: `src/lib/proposal-export/build-proposal-export-model.ts`

Per-row math (lines 121–129):
```typescript
const quantity = roundQuantity(sourceRow.quantity);
const materialSubtotal = roundMoney(materialUnitCost * quantity);
const contingencySubtotal = roundMoney((materialSubtotal * (sourceRow.contingencyPercentage ?? 0)) / 100);
const costAmount = roundMoney(materialSubtotal + laborSubtotal + contingencySubtotal + miscSubtotal);
```

Project-level contingency (lines 320–329): `(directCost * settings.contingencyRate) / 100` with mode `"included"` / `"percentage"` / `"fixed"`.

**Plan impact**: When `quantityBase` is non-null, the export should:
- Compute `quantity = quantityBase + quantityContingencyAmount`
- Set per-row `contingencySubtotal = 0`, because quantity-mode contingency is already included in material subtotal
- Preserve the old subtotal-contingency formula only when `quantityBase` is null
- Apply the totals-area Adjustment once through the proposal-level adjustment path or a reconciled single source

This is the most subtle migration — see `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md`.

**File**: `src/lib/proposal-export/create-proposal-workbook.ts`

Column rendering (lines 313+): `summaryRows`, section subtotals, grand total. Must add new column for quantity breakdown if the export includes a breakdown view.

---

## 8. Database Schema

**File**: `supabase/migrations/20260518090000_archestimator_core_schema.sql`

`estimate_row_items` table (line 107):
```
quantity numeric(14, 4) not null default 0 check (quantity >= 0),
```

No `quantityBase` or `quantityContingencyAmount` columns exist. No `estimate_sheets` table with sheet-level adjustment columns was found.

**Plan impact**: Additive migration (new file) with:
```sql
ALTER TABLE estimate_row_items
  ADD COLUMN IF NOT EXISTS quantity_base numeric(14, 4),
  ADD COLUMN IF NOT EXISTS quantity_contingency_amount numeric(14, 4);
```

No data backfill needed — existing rows with NULLs are in legacy mode.

---

## 9. Surplus Row

**Finding**: No "surplus" string exists in any source file outside of the proposal-export summary. The surplus row is a concept the user references but does not yet exist in the codebase. The improvement pass resolves this dependency by making the totals-area Adjustment row the first implementation; if a surplus row later lands, the Adjustment row moves directly after it without changing persistence or subtotal math.

---

## 10. Realtime Broadcast

**File**: `src/hooks/use-estimate-cursor-broadcast.ts`

Current broadcast payload is cursor-only: cursor coordinates, focused row/cell, identity, and throttled presence-like state. It is not a row-update data channel. If a raw QTY expression string were broadcast through a future row-update event, a receiving client would need to re-parse it and may compute a different result due to locale or rounding.

**Plan impact**: Do not overload the cursor broadcast event. Either add a separate `use-estimate-row-update-broadcast.ts` hook/channel or define a union event model with explicit row-update events. Row-update events must broadcast structured `{ quantityBase, quantityContingencyAmount, rowRevision }` fields and receivers must validate them before optimistic display updates.

---

## 11. UI Primitives Available

- `Chip` at `src/components/ui/chip.tsx`: button-like chip with `tone` (neutral/accent/danger), `active`, `removable`, `onRemove`. Perfect for the breakdown chip in the QTY cell.
- `Badge` at `src/components/ui/badge.tsx`: inline span badge, non-interactive.
- `ControlInput` at `src/components/ui/control-input-base.tsx`: base controlled input with consistent styling.
- `DropdownSelect` at `src/components/ui/dropdown-select.tsx`: used today for the adjustment mode toggle.
- `SelectionCheckbox` at `src/components/ui/selection-checkbox.tsx`: used in the select column.

No popover/inline-editor primitive was found that directly supports "click chip → edit two fields inline." The chip should either open a small inline form or toggle the cell into an edit mode with two visible inputs.

---

## 12. Key Test Files

| Test file | What it covers | Plan impact |
|---|---|---|
| `tests/vitest/estimate-sheet-column-model.test.ts` | Column definitions, order, widths, clamping | Must update for new order + renamed column |
| `tests/vitest/estimate-sheet-cost-inputs.test.tsx` | Row selection, hover reveal | Must add QTY expression tests |
| `tests/vitest/estimate-row-table-virtualization.test.tsx` | Virtualization | Should not break |
| — | No editable-row-model test exists | New test needed: parser unit tests |
| — | No broadcast test exists | New test needed: structured payload |

---

## Change Impact Map

| File | Impact type | Risk |
|---|---|---|
| `src/lib/estimate-sheet/column-model.ts` | Modify (reorder, rename, add ID) | LOW |
| `src/lib/estimates/types.ts` | Add fields to `EstimateRowItem` | MED (cascades to all consumers) |
| `src/components/workshop/estimate-sheet/rows/editable-row-model.ts` | Major modify (parser, rebind math) | MED |
| `src/components/workshop/estimate-sheet/rows/row-table.tsx` | Major modify (Qty cell + Adjustment cell + header + new column) | MED |
| `src/components/workshop/estimate-sheet/rows/cells.tsx` | No change (Material cell unchanged) | — |
| `src/components/workshop/estimate-sheet/rows/cells-model.ts` | Modify (keyboard handler for +) | LOW |
| `src/components/workshop/estimate-sheet/activity-history-model.ts` | Add fields to types | LOW |
| `src/lib/estimates/actions.ts` | Add parameters to `updateEstimateRowItem` | MED |
| `src/lib/proposal-export/build-proposal-export-model.ts` | Modify (read new fields) | MED |
| `src/lib/proposal-export/create-proposal-workbook.ts` | Modify (new export columns) | LOW |
| `src/lib/proposal-export/types.ts` | Add fields to export types | LOW |
| `src/hooks/use-estimate-row-mutations.ts` | Modify (payload) | LOW |
| `src/hooks/use-estimate-row-update-broadcast.ts` | Create or implement typed row-update event | LOW |
| `src/components/workshop/EstimateSheetContent.tsx` | No change (passes props down) | — |
| `src/components/workshop/estimate-sheet/rows/branch.tsx` | Modify (totals-area Adjustment row) | LOW |
| `supabase/migrations/` | New file (additive) | HIGH (data integrity) |
| `tests/vitest/estimate-sheet-column-model.test.ts` | Update assertions | LOW |
| `tests/vitest/estimate-sheet-editable-row-model.test.ts` | New file | LOW |
| `tests/vitest/estimate-sheet-cost-inputs.test.tsx` | Add scenario tests | LOW |
