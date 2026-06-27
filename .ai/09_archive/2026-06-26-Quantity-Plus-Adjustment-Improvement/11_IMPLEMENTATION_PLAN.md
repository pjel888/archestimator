# 11 — Implementation Plan

## Phase 1: Database, Generated Types, And Selectors

### P1-T1 — Add quantity columns and adjustment table
**Files**: `supabase/migrations/20260626000000_add_quantity_contingency_columns.sql`
**Requirements**: DATA-1, DATA-2, FR-9, FR-11, SEC-2

Add nullable `quantity_base` and `quantity_contingency_amount` columns to `estimate_row_items`. Add `estimate_sheet_adjustments` keyed by `estimate_id`, plus RLS for SELECT and editor-only INSERT/UPDATE/DELETE.

**Validation**: Apply migration locally; verify existing rows show NULL quantity-mode fields and no data rewrite occurred.
**Complexity**: Medium.

### P1-T2 — Regenerate and extend TypeScript types
**Files**: generated Supabase types, `src/lib/estimates/types.ts`
**Requirements**: ARCH-2, FR-11

Add `quantityBase?: number | null`, `quantityContingencyAmount?: number | null`, and an estimate-sheet adjustment type.

**Validation**: `bun run type-check` after selector updates.
**Complexity**: Small.

### P1-T3 — Update repositories and selectors
**Files**: `src/lib/domain/workspace-repository.ts`, `src/lib/domain/estimate-repository.ts`, route-context RPC/selectors
**Requirements**: FR-11, DATA-2

Include new row fields and the estimate-level adjustment in every read model that hydrates the estimate sheet, workspace summary, route context, snapshots, or exports.

**Validation**: Focused type-check and selector tests if present.
**Complexity**: Medium.

---

## Phase 2: Persistence, RPC, And Server Validation

### P2-T1 — Update row update RPC and history snapshots
**Files**: migration SQL for `update_estimate_row_item_with_history`, row snapshot/history functions
**Requirements**: FR-11, DATA-2

Extend the RPC JSON payload, update statement, changed-field diff, activity log, and row snapshot context to include `quantity_base` and `quantity_contingency_amount`.

**Validation**: Integration test writes `100 + 20`, verifies DB row, history diff, and snapshot preserve both fields.
**Complexity**: High.

### P2-T2 — Extend `updateEstimateRowItem`
**Files**: `src/lib/estimates/actions.ts`, `src/hooks/use-estimate-row-mutations.ts`
**Requirements**: FR-3, FR-8, FR-11, SEC-1, SEC-2

Add new input fields, strict numeric validation, server-computed quantity totals, and optimistic mutation support. Preserve legacy behavior when `quantityBase` is `null`; convert only on explicit user edit.

**Validation**: Unauthorized and invalid-payload tests fail safely; valid quantity-mode update persists expected numbers.
**Complexity**: High.

### P2-T3 — Add sheet adjustment action
**Files**: `src/lib/estimates/actions.ts`
**Requirements**: FR-9, SEC-2

Add `updateEstimateSheetAdjustment()`: `canEditEstimate` gate, percentage range validation, mode allow-list, and upsert into `estimate_sheet_adjustments`.

**Validation**: Editor can upsert; viewer/non-member cannot; invalid percentage/mode rejected.
**Complexity**: Medium.

---

## Phase 3: Parser And Row Math Model

### P3-T1 — Create strict parser
**File**: `src/lib/estimates/parse-quantity-expression.ts`
**Requirements**: FR-5, ARCH-1, PERF-1, SEC-1

Implement `parseQuantityExpression(input)`. Strip whitespace only; reject invalid characters, negatives, exponent notation, commas, multiple `+`, and missing operands. `+20` is invalid; `0+20` is valid.

**Tests**: Parser matrix in `tests/vitest/estimate-sheet-editable-row-model.test.ts`.
**Complexity**: Medium.

### P3-T2 — Rebind per-row math
**File**: `src/components/workshop/estimate-sheet/rows/editable-row-model.ts`
**Requirements**: FR-3, FR-8, FR-10

If `quantityBase` is non-null, effective quantity is `quantityBase + quantityContingencyAmount`. Material subtotal uses effective quantity. Row `contingencyPercentage` is derived for display only. If `quantityBase` is null, preserve legacy subtotal-adjustment semantics.

**Validation**: Tests cover quantity-mode, legacy mode, zero base, and conversion.
**Complexity**: High.

### P3-T3 — Add sync helper
**File**: `src/components/workshop/estimate-sheet/rows/editable-row-model.ts`
**Requirements**: FR-7, FR-8

Add a single helper that converts parser output, chip edits, and plain percentage edits into the canonical row patch.

**Validation**: Chip/base edit `100+20 -> base 150` yields `150+20`, total `170`, raw percentage `13.3333`, displayed `13%`.
**Complexity**: Medium.

---

## Phase 4: Column Model, Headers, And Contingency Cell

### P4-T1 — Update column model
**File**: `src/lib/estimate-sheet/column-model.ts`
**Requirements**: FR-1, FR-2, ARCH-3

Rename per-row `"adjustment"` display to `"Contingency"` and order columns `Qty -> Contingency -> Subtotal -> Misc Cost -> Total Item Cost`.

**Tests**: `tests/vitest/estimate-sheet-column-model.test.ts`.
**Complexity**: Medium.

### P4-T2 — Update row table headers and keyboard flow
**Files**: `src/components/workshop/estimate-sheet/rows/row-table.tsx`, `src/components/workshop/estimate-sheet/rows/cells-model.ts`
**Requirements**: FR-1, FR-2, UX-4

Apply the new labels/order and ensure `+` is treated as text input inside QTY, not a shortcut.

**Validation**: DOM keyboard test and column-model assertions.
**Complexity**: Medium.

### P4-T3 — Redesign Contingency cell
**File**: `src/components/workshop/estimate-sheet/rows/row-table.tsx`
**Requirements**: FR-3, FR-4, FR-8

Remove the per-row mode dropdown. If a QTY chip exists, show derived read-only percentage and direct users to edit the chip. If no chip exists, direct percentage entry is allowed and generates the initial `base+N` expression on commit.

**Validation**: DOM tests cover no dropdown, read-only derived state, and plain-row percentage conversion.
**Complexity**: High.

---

## Phase 5: QTY Expression And Chip Editor

### P5-T1 — Switch QTY to expression-capable text input
**File**: `src/components/workshop/estimate-sheet/rows/row-table.tsx`
**Requirements**: FR-5, FR-10, SEC-1

Use `type="text"` and `inputMode="decimal"`. Parse on commit, show inline error, and preserve Escape revert behavior.

**Validation**: Plain number stays no-chip; malformed inputs rejected.
**Complexity**: Medium.

### P5-T2 — Render breakdown chip
**File**: `src/components/workshop/estimate-sheet/rows/row-table.tsx`
**Requirements**: FR-6, UX-1, A11Y-1

Render a compact chip only when `quantityContingencyAmount > 0`. Chip text uses normalized numbers, not raw input.

**Validation**: DOM render and aria tests.
**Complexity**: Medium.

### P5-T3 — Add chip editor
**File**: `src/components/workshop/estimate-sheet/rows/row-table.tsx`
**Requirements**: FR-7, UX-2, A11Y-1, A11Y-3

Click/Enter opens a two-field editor for base and contingency. Enter commits, Escape reverts, Tab commits and advances, outside click commits, and focus returns predictably.

**Validation**: DOM focus tests; manual mobile/touch pass.
**Complexity**: High.

---

## Phase 6: Totals-Area Adjustment Row

### P6-T1 — Render adjustment in totals area
**File**: `src/components/workshop/estimate-sheet/rows/branch.tsx`
**Requirements**: FR-9

Render the new Adjustment row below the row table totals area. It has mode, percentage, computed peso value, saving/error/read-only states, and a future slot above it for a surplus row.

**Validation**: Branch DOM test renders mode, percentage, and computed value.
**Complexity**: Medium.

### P6-T2 — Wire adjustment persistence
**Files**: `src/lib/estimates/actions.ts`, selector/repository files, branch/totals state
**Requirements**: FR-9, DATA-2, SEC-2

Read and save `estimate_sheet_adjustments`. Empty UI maps to `percentage = 0` and `mode = "contingency"`.

**Validation**: Action test plus DOM optimistic save/error tests.
**Complexity**: Medium.

---

## Phase 7: Export, Collaboration, Regression, And QA

### P7-T1 — Update proposal export
**Files**: `src/lib/proposal-export/build-proposal-export-model.ts`, `src/lib/proposal-export/create-proposal-workbook.ts`, `src/lib/proposal-export/types.ts`
**Requirements**: FR-12

Apply quantity-mode math only when `quantityBase != null`; preserve legacy subtotal contingency otherwise. Feed totals-area Adjustment into proposal settings once and avoid double-counting.

**Validation**: Export tests for legacy row, quantity-mode row, and sheet adjustment.
**Complexity**: High.

### P7-T2 — Add row-update collaboration event
**File**: `src/hooks/use-estimate-row-update-broadcast.ts` or typed collaboration-event hook
**Requirements**: FR-13

Broadcast structured numeric fields after successful local mutation. Receivers validate estimate ID, row ID, revision/timestamp, and numeric bounds before applying display-optimistic state.

**Validation**: Broadcast tests for valid, mismatched, stale, and malformed events.
**Complexity**: Medium.

### P7-T3 — Regression suite
**Requirements**: TEST-1..TEST-4

Run targeted tests first, then broader gates when the implementation touches shared row math, auth, DB, and export.

```bash
bun run test:dom -- estimate-sheet-editable-row-model
bun run test:dom -- estimate-sheet-column-model
bun run test:dom -- estimate-sheet-cost-inputs
bun run type-check
bun run lint
bun run build
```

Use `bun run validate` only if the implementation materially changes shared infra beyond this plan.

### P7-T4 — Manual QA
**Requirements**: TEST-3, UX-1..UX-4, A11Y-1..A11Y-3

Run S1-S12 in the browser after implementation. Browser proof is required here because interaction, focus, and totals layout cannot be fully proven by static review.
