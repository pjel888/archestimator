# 06 — Architecture And Technical Design

## Target architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     EstimateSheetContent                             │
│  ┌──────────────┐  ┌──────────────────────┐  ┌───────────────────┐ │
│  │ EstimateSheet │  │ EstimateSheetBranch  │  │ Activity History  │ │
│  │     Tree      │  │  ┌────────────────┐  │  │     Panel         │ │
│  │ (left panel)  │  │  │ Row Items Table│  │  │                   │ │
│  │              │  │  │                │  │  │                   │ │
│  │              │  │  │ #|S|Mtrl|Qty│  │  │  │                   │ │
│  │              │  │  │      |Ctg|Sub│  │  │  │                   │ │
│  │              │  │  │      |Misc|Tot│  │  │  │                   │ │
│  │              │  │  │                │  │  │                   │ │
│  │              │  │  │ [chip:100+20] │  │  │                   │ │
│  │              │  │  └────────────────┘  │  │                   │ │
│  │              │  │  ┌────────────────┐  │  │                   │ │
│  │              │  │  │ Node Totals    │  │  │                   │ │
│  │              │  │  │ Surplus Row    │  │  │                   │ │
│  │              │  │  │ ADJUSTMENT(pct)│  │  │                   │ │
│  │              │  │  │ Grand Total    │  │  │                   │ │
│  │              │  │  └────────────────┘  │  │                   │ │
│  └──────────────┘  └──────────────────────┘  └───────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## Column model change

### Before
```
index | select | material | quantity | subTotal | adjustment | miscCost | totalItemCosts | actions
```

### After
```
index | select | material | quantity | contingency | subTotal | miscCost | totalItemCosts | actions
                                  ↑ renamed from 'adjustment'   ↑ repositioned
```

### `column-model.ts` changes

```typescript
// CHANGE: rename adjustment → contingency
export type EstimateColumnId =
  | "index" | "select" | "material" | "quantity"
  | "contingency"  // was "adjustment"
  | "subTotal"     // was before adjustment, now after
  | "miscCost" | "totalItemCosts" | "actions";

// CHANGE: reorder definitions
{ id: "quantity", label: "Qty", defaultWidth: 58, ... },
{ id: "contingency", label: "Contingency", defaultWidth: 92, minWidth: 72, maxWidth: 200, ... },  // narrower than old 106px adjustment
{ id: "subTotal", label: "Subtotal", defaultWidth: 92, ... },
```

Grid template becomes:
```
36px 32px minmax(160px,1fr) 58px 92px 92px 92px 108px 30px
```

Note: old `adjustment` was 106px; new `contingency` is 92px (same as subtotal) since it displays only a percentage now rather than dropdown + percentage + peso value.

## Parser design

### `parseQuantityExpression(input: string): QuantityExpressionResult`

**File**: `src/lib/estimates/parse-quantity-expression.ts` (~40 lines)

```typescript
export type QuantityExpressionResult = {
  baseQuantity: number;
  contingencyAmount: number;
  totalQuantity: number;
  contingencyPercentage: number;  // 0 if baseQuantity is 0
  expression: string;             // normalized "100 + 20" or "100"
  hasContingency: boolean;
  isValid: boolean;
  error?: string;
};

export function parseQuantityExpression(input: string): QuantityExpressionResult
```

**Grammar**: `<base> [ '+' <contingency> ]` where both are non-negative decimal strings.

**Algorithm**:
1. Strip whitespace only. If empty → `{ baseQuantity: 0, ... }`.
2. Reject any remaining character outside digits, `.`, and `+`; do not sanitize invalid characters away.
3. Split on `+`. If no `+` → parse as single number.
4. If 1 `+` → require both left and right operands; parse left as base, right as contingency.
5. If 2+ `+` → error "Only one '+' allowed."
6. Parse each part as a non-negative decimal string. NaN, negative signs, exponent notation, commas, HTML, and incomplete operands are invalid.
7. Compute: `totalQuantity = baseQuantity + contingencyAmount`, `contingencyPercentage = baseQuantity > 0 ? (contingencyAmount / baseQuantity) * 100 : 0`.

**Unit tests** (≥12 cases): plain number, expression, decimal, whitespace variants, empty, negative, multiple `+`, extreme values.

**Why not regex**: Simpler to write, test, and maintain. No backtracking risk. A split-based parser is 20 lines.

## Editable row model rebinding

### `EditableRowValue` additions

```typescript
export type EditableRowValue = {
  // ... existing fields ...
  quantity: string;                    // KEPT: the DISPLAY value (parsed expression or plain number)
  quantityExpression: string;          // NEW: raw "100+20" string (empty string = plain number)
  quantityBase: string;               // NEW: derived or directly set base
  quantityContingencyAmount: string;  // NEW: derived or directly set contingency
  contingencyMode: CostAdjustmentMode; // LEGACY ROW STATE ONLY; new/converted rows are contingency-only
  contingencyPercentage: string;       // Per-row derived/display percentage; totals Adjustment has separate state
  // ... rest unchanged ...
};
```

### Math rebinding in `computeEditableRowTotal`

```typescript
// OLD: subTotal = itemCost × quantity, then contingencyValue = subTotal × pct / 100
// NEW:
const quantityBase = parseNonNegativeEditableNumber(editableRow.quantityBase);
const quantityContingencyAmount = parseNonNegativeEditableNumber(editableRow.quantityContingencyAmount);
const totalQuantity = quantityBase + quantityContingencyAmount;
const subTotal = itemCost * totalQuantity;
// Per-row contingency column shows pct = (quantityContingencyAmount / quantityBase) * 100
// No contingencyValue added to totalItemCosts — the contingency is already in the quantity
const totalItemCosts = subTotal + miscCost;
```

### Sync between QTY expression and Contingency column

```
User types "100+20" in QTY
  → parseQuantityExpression → { base:100, contingency:20, pct:20% }
  → setEditableRows: { quantity:"120", quantityExpression:"100+20", quantityBase:"100", quantityContingencyAmount:"20", contingencyPercentage:"20" }

User edits chip contingency from 20→30
  → setEditableRows: { quantityContingencyAmount:"30", quantity:"130", quantityExpression:"100+30", contingencyPercentage:"30" }

User edits chip base from 100→150
  → setEditableRows: { quantityBase:"150", quantity:"170", quantityExpression:"150+20", contingencyPercentage:"13.3333" }
  // contingencyAmount stays absolute; percentage is a display derivative

User enters contingency percentage on a plain row with no chip
  → back-propagate: contingencyAmount = Math.round(quantityBase × pct / 100)
  → setEditableRows: { quantityContingencyAmount, quantity, quantityExpression, contingencyPercentage }

User clicks Contingency percentage on a row that already has a chip
  → no inline edit; show tooltip/assistive text directing the user to edit the QTY chip
```

## QTY cell implementation

### Component structure

```tsx
<td className="relative ...">
  {/* Main input */}
  <ControlInput
    type="text"
    inputMode="decimal"
    value={displayValue}  // shows total (120) when editing, formatted display otherwise
    onChange={handleQtyChange}
    onBlur={commitQty}
    onKeyDown={handleQtyKeyDown}
  />
  
  {/* Unit display (existing) */}
  <p className="absolute top-18 right-1 ...">/ {computedItem.unit}</p>

  {/* Breakdown Chip (conditional) */}
  {hasContingency && (
    <div className="absolute top-0 right-0 ...">
      <Chip
        tone="neutral"
        aria-label={`Quantity breakdown: base ${quantityBase}, contingency ${quantityContingencyAmount}`}
        onClick={openChipEditor}
        onKeyDown={handleChipKeyDown}
        tabIndex={0}
      >
        {quantityBase} + {quantityContingencyAmount}
      </Chip>
      {chipEditorOpen && (
        <div className="absolute top-full right-0 ...">
          <ControlInput value={quantityBase} onChange={...} aria-label="Base quantity" />
          <span>+</span>
          <ControlInput value={quantityContingencyAmount} onChange={...} aria-label="Contingency quantity" />
        </div>
      )}
    </div>
  )}
</td>
```

### Edit commit logic

```typescript
function commitQtyExpression(editableRow: EditableRowValue) {
  const result = parseQuantityExpression(editableRow.quantityExpression);
  if (!result.isValid) {
    // Show validation error, don't commit
    return;
  }
  const patch: Partial<EditableRowValue> = {
    quantity: String(result.totalQuantity),
    quantityExpression: result.hasContingency ? result.expression : "",
    quantityBase: String(result.baseQuantity),
    quantityContingencyAmount: String(result.contingencyAmount),
    contingencyPercentage: String(Math.round(result.contingencyPercentage * 100) / 100),
  };
  onUpdateRowItem(item.id, patch);
}
```

## Totals-area Adjustment row

### Placement

The Adjustment row lives in the TOTALS AREA of `EstimateSheetBranch`, below the row table. If a separate surplus-row workstream later lands, render the Adjustment row directly below that surplus row. The Adjustment math and persistence remain estimate-level either way.

It is a single row with the following cells aligned to the estimate column grid:

```
| ... | ... | [empty through Materials] | [empty] | [empty] | Adjustment | [empty] | [Grand Total] | [empty] |
```

Or, as a standalone summary row outside the grid, rendered below the row table:
```
Adjustment:  [▼ Contingency] [5]%  = ₱12,500
Grand Total: ₱262,500
```

The first implementation uses a single estimate-level Adjustment. Per-node overrides are intentionally deferred.

### Data model

Create an estimate-level adjustment record rather than adding per-node fields:

```typescript
type EstimateSheetAdjustment = {
  estimateId: string;
  percentage: number;
  mode: CostAdjustmentMode; // "contingency" | "discount"
};
```

Store this in a new `estimate_sheet_adjustments` table keyed by `estimate_id` for the first implementation. Per-node overrides are deferred until real users ask for different adjustment rates per area or group.

### Math

```typescript
function applyEstimateAdjustment(subtotal: number, pct: number | undefined, mode: CostAdjustmentMode | undefined): number {
  if (!pct || !mode) return subtotal;
  const signedPct = mode === "discount" ? -Math.abs(pct) : Math.abs(pct);
  return subtotal * (1 + signedPct / 100);
}
```

## Row-update collaboration event

Do not overload the existing cursor broadcast hook. Add a separate row-update event or a typed union event with a dedicated row-update branch:
```typescript
interface EstimateRowUpdateBroadcastPayload {
  type: "row-update";
  estimateId: string;
  rowId: string;
  rowRevision: number;
  quantityBase?: number;
  quantityContingencyAmount?: number;
  quantity?: number;
  sentAt: string;
}
```

Receiving clients validate estimate id, known row id, finite non-negative bounded numeric fields, and stale revision/timestamp before applying any optimistic display update. Persisted server state remains authoritative.

## Export update

`build-proposal-export-model.ts`:
```typescript
const hasQuantityMode = sourceRow.quantityBase != null;
const quantityBase = hasQuantityMode ? sourceRow.quantityBase : sourceRow.quantity;
const quantityContingencyAmount = hasQuantityMode
  ? sourceRow.quantityContingencyAmount ?? 0
  : 0;
const quantity = quantityBase + quantityContingencyAmount;
const contingencySubtotal = hasQuantityMode
  ? 0
  : roundMoney((materialSubtotal * (sourceRow.contingencyPercentage ?? 0)) / 100);
```

`create-proposal-workbook.ts`:
- Add optional "Quantity Breakdown" columns if `includeQuantityBreakdown` export option is set.
- At minimum, quantity-mode rows roll the quantity add-on into material subtotal while legacy rows keep the old subtotal-contingency formula.
- The totals-area Adjustment feeds or replaces proposal-level adjustment settings once; never double-count it.
