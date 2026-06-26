# 12 — Test And Validation Strategy

## Unit Tests — `tests/vitest/estimate-sheet-editable-row-model.test.ts`

Parser and row-math cases:

| Input | Expected |
|---|---|
| `"100"` | `{ baseQuantity:100, contingencyAmount:0, hasContingency:false, totalQuantity:100 }` |
| `"100+20"` | `{ baseQuantity:100, contingencyAmount:20, hasContingency:true, contingencyPercentage:20, totalQuantity:120 }` |
| `" 100 + 20 "` | same as `"100+20"` |
| `"100.5+12.3"` | `{ baseQuantity:100.5, contingencyAmount:12.3, totalQuantity:112.8 }` |
| `"0+20"` | `{ baseQuantity:0, contingencyAmount:20, contingencyPercentage:0, totalQuantity:20 }` |
| `"100+0"` | `{ hasContingency:false, totalQuantity:100 }` |
| `""` | empty/no-op result; no quantity-mode conversion |
| `"+20"` | invalid: missing base operand |
| `"100+"` | invalid: missing contingency operand |
| `"-5"` | invalid: negative values rejected |
| `"100+-20"` | invalid: negative values rejected |
| `"1+2+3"` | invalid: only one `+` allowed |
| `"1e3+2"` | invalid: exponent notation rejected |
| `"1,000+20"` | invalid: commas rejected |
| `"<img>100+20"` | invalid: HTML characters rejected |
| `"abc+xyz"` | invalid: non-numeric characters rejected |

Math rebind cases:

| Input | Expected |
|---|---|
| `quantityBase=100, contingencyAmount=20, itemCost=50` | `subTotal=6000`, row contingency display `20%` |
| `quantity=100, itemCost=50`, `quantityBase=null` | legacy subtotal math unchanged |
| `quantityBase=0, contingencyAmount=5, itemCost=100` | `subTotal=500`, display percentage `0%` |
| chip edit `100+20`, base changed to `150` | `quantity=170`, chip `150+20`, raw pct `13.3333`, display `13%` |

**Command**: `bun run test:dom -- estimate-sheet-editable-row-model`

## DOM / Integration Tests

### `tests/vitest/estimate-sheet-cost-inputs.test.tsx`

- S1: plain QTY number renders no chip and no derived contingency.
- S2: `100+20` renders QTY `120`, chip `100+20`, Contingency `20%`.
- S3: chip click opens two-field editor.
- S4: editing base `100 -> 150` keeps `+20` and shows QTY `170`.
- S5: clearing/removing contingency returns to no-chip quantity state.
- S6: column order is `Qty -> Contingency -> Subtotal -> Misc Cost -> Total Item Cost`.
- S8: legacy rows with `quantityBase=null` render unchanged.
- S10: keyboard tab flow and Escape revert are preserved.
- Contingency cell is read-only once a chip exists; direct percentage entry is allowed only on a plain row.

### `tests/vitest/estimate-sheet-column-model.test.ts`

- Rename per-row Adjustment display to Contingency.
- Preserve column model extension points, widths, css vars, resize behavior, and order.

### Branch / Totals Tests

- Totals-area Adjustment row renders below the row table totals area.
- Mode dropdown supports contingency/discount.
- Percentage input computes peso value from direct cost.
- Empty/cleared input maps to `0%` contingency.
- Saving, error, and read-only states render.

## Server, DB, And Auth Tests

- Migration apply succeeds and existing rows keep `quantity_base` / `quantity_contingency_amount` as NULL.
- No destructive row rewrite migration is performed.
- `update_estimate_row_item_with_history` accepts and persists new fields.
- Row history/snapshot payloads preserve new fields.
- Server rejects malformed numeric payloads, negative values, out-of-range values, and inconsistent `quantity` totals.
- Viewer/non-member cannot update row quantity fields.
- `estimate_sheet_adjustments` RLS blocks viewer/non-member insert/update/delete.
- `updateEstimateSheetAdjustment` validates percentage range and mode allow-list.

Rollback validation is non-destructive by default: prove code rollback/feature flag/fix-forward works with additive columns/table left in place. Destructive drop/fold-back SQL is tested only in a disposable local database with explicit backup notes.

## Export Tests

- Legacy row (`quantityBase=null`) keeps old subtotal contingency formula.
- Quantity-mode row (`quantityBase != null`) includes add-on in material subtotal and sets per-row `contingencySubtotal=0`.
- Totals-area Adjustment feeds proposal-level adjustment once.
- No double-counting when `ProposalExportSettings.contingencyRate` and `estimate_sheet_adjustments` are both present; implementation chooses one source.
- Optional `includeQuantityBreakdown` columns, if added, appear in the expected order.

## Broadcast Tests

- Valid row-update event updates display-optimistic local row state.
- Mismatched estimate ID is ignored.
- Unknown row ID is ignored.
- Stale revision/timestamp is ignored or triggers refetch.
- Non-finite, negative, or out-of-range numeric fields are ignored.
- Broadcast payload is not persisted directly.

## Regression Gate

Targeted first:

```bash
bun run test:dom -- estimate-sheet-editable-row-model
bun run test:dom -- estimate-sheet-column-model
bun run test:dom -- estimate-sheet-cost-inputs
```

Then shared-risk gates:

```bash
bun run type-check
bun run lint
bun run build
```

Run broader `bun run validate` only when the implementation changes shared infra beyond the scoped files.

## Manual QA Checklist

| # | Scenario | Action | Expected |
|---|---|---|---|
| 1 | S1: Plain number | Type `100` in QTY, tab away | Shows `100`, no chip, no contingency |
| 2 | S2: Expression | Type `100+20` in QTY, tab away | Shows `120`, chip `100+20`, Contingency `20%` |
| 3 | S3: Edit chip contingency | Click chip, edit to `30`, close | QTY `130`, chip `100+30` |
| 4 | S4: Edit chip base | Click chip, edit base to `150`, close | QTY `170`, chip `150+20`, Contingency about `13%` |
| 5 | S5: Remove contingency | Clear contingency add-on to `0` | QTY `100`, chip gone |
| 6 | S6: Column order | Visual check | Qty -> Contingency -> Subtotal -> Misc Cost -> Total Item Cost |
| 7 | S7: Totals Adjustment | Set totals Adjustment to 5% contingency | Direct cost adjustment row computes expected peso value |
| 8 | S8: Existing row | Open legacy rows | Existing quantities and legacy subtotal contingency unchanged |
| 9 | S9: Export | Export XLSX | Legacy/new row math and totals Adjustment match UI |
| 10 | S10: Keyboard | Tab through cells | Focus moves correctly and Escape reverts |
| 11 | S11: Decimals | Type `100.5+12.3` | Parsed and stored accurately within rounding rules |
| 12 | S12: Reject invalid | Type `+20`, `100+-20`, `1e3`, or HTML | Inline error, no commit |

## E2E Tests — Playwright

Add to `e2e/estimate-sheet-qty-expression.spec.ts` if implementation risk justifies browser proof:

| # | Spec | Steps |
|---|---|---|
| E2E-1 | QTY expression + chip renders | Navigate to estimate -> type `100+20` -> Tab -> assert `120`, chip, and `20%` |
| E2E-2 | Chip editor opens and syncs | Click chip -> edit base to `150` -> assert QTY `170`, chip `150+20`, Contingency `13%` |
| E2E-3 | Column order verified | Assert header order |
| E2E-4 | Legacy row regression | Open estimate with legacy rows -> assert no unintended conversion |
| E2E-5 | Keyboard navigation | Tab Materials -> Qty -> Contingency -> Misc Cost |

**Command**: `bun run test:e2e -- estimate-sheet-qty-expression`

## Scenario-To-Test Mapping

| Scenario | Unit | DOM | E2E | Manual |
|---|---|---|---|---|
| S1 — Plain number | Parser/math | cost-inputs | — | QA #1 |
| S2 — QTY+N expression | Parser/math | cost-inputs | E2E-1 | QA #2 |
| S3 — Edit chip contingency | sync helper | cost-inputs | E2E-2 | QA #3 |
| S4 — Edit chip base | sync helper | cost-inputs | E2E-2 | QA #4 |
| S5 — Remove contingency | sync helper | cost-inputs | — | QA #5 |
| S6 — Column order | column-model | cost-inputs | E2E-3 | QA #6 |
| S7 — Totals Adjustment | export/math | branch DOM | — | QA #7 |
| S8 — Existing rows | legacy math | cost-inputs | E2E-4 | QA #8 |
| S9 — Excel export | export tests | — | — | QA #9 |
| S10 — Keyboard | — | cost-inputs | E2E-5 | QA #10 |
| S11 — Decimals | parser | — | — | QA #11 |
| S12 — Invalid reject | parser/server | cost-inputs | — | QA #12 |
