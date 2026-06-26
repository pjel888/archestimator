# 04 — Requirements Specification

## Functional Requirements

### FR-1 — Column Reorder
**Statement**: The per-row columns in the estimate sheet MUST be ordered as `# | Select | Materials | Qty | Contingency | Subtotal | Misc Cost | Total Item Cost | Actions`.
**Rationale**: The user stated: "we must switch the columns of adjustment and subtotal. adjustment must be on the right of QTY."
**Source**: User brief.
**Priority**: P0 (blocking).
**Acceptance**: Vitest DOM test asserts header text order matches the specification.
**Affected**: `column-model.ts`, `row-table.tsx`, `column-model.test.ts`.

### FR-2 — Column Rename (Adjustment → Contingency)
**Statement**: The per-row column previously labeled "Adjustment" MUST be labeled "Contingency".
**Rationale**: User stated: "adjustment will be renamed to contingency because that's all it will be."
**Source**: User brief.
**Priority**: P0.
**Acceptance**: Column header reads "Contingency". No references to "Adjustment" remain in the per-row column context.
**Affected**: `column-model.ts` (label), `row-table.tsx` (header).

### FR-3 — Contingency Bound to QTY
**Statement**: The per-row Contingency column's meaning MUST be re-bound from SUBTOTAL to QTY. It expresses the contingency add-on quantity relative to the base quantity (both as absolute amount and as percentage of base).
**Rationale**: User stated: "the ADJUSTMENT needs to be connected to the QTY and NOT the subtotal."
**Source**: User brief.
**Priority**: P0.
**Acceptance**: When a row has `quantityBase=100, quantityContingencyAmount=20`, the Contingency column shows `20%`. The math `subTotal = itemCost × (100 + 20) = itemCost × 120` is correct.
**Affected**: `editable-row-model.ts`, `row-table.tsx`.

### FR-4 — Per-Row Discount Mode Removal
**Statement**: The per-row Contingency column MUST NOT have a contingency/discount mode toggle. It is contingency-only.
**Rationale**: User stated the column is renamed to "contingency because that's all it will be."
**Source**: User brief.
**Priority**: P1.
**Acceptance**: No `DropdownSelect` with `COST_ADJUSTMENT_MODE_OPTIONS` renders in the per-row Contingency column.
**Affected**: `row-table.tsx`.

### FR-5 — Inline QTY + N Syntax
**Statement**: The QTY cell MUST accept an expression of the form `<base> + <contingency>` (e.g., `100 + 20`). The base and contingency numbers MUST be non-negative decimals. Whitespace around `+` is optional and stripped.
**Rationale**: User stated: "when a user types in QTY + {new number} the new number will basically be the contingency."
**Source**: User brief.
**Priority**: P0.
**Acceptance**: `parseQuantityExpression("100+20")` returns `{ baseQuantity: 100, contingencyAmount: 20, contingencyPercentage: 20, totalQuantity: 120, expression: "100+20" }`. `parseQuantityExpression("100")` returns `{ baseQuantity: 100, contingencyAmount: 0, ... }` with `hasContingency: false`.
**Affected**: New `src/lib/estimates/parse-quantity-expression.ts`.

### FR-6 — QTY Cell Chip Breakdown
**Statement**: When a row has a QTY expression with a contingency component (i.e., the user typed `+ N`), the QTY cell MUST display a small, editable breakdown chip in its upper-right corner showing the base and contingency amounts.
**Rationale**: User stated: "we must display a small breakdown on the upper right of the original number and the added contingency."
**Source**: User brief.
**Priority**: P0.
**Acceptance**: Chip renders with text like `100 + 20` (or similar compact format). Chip is not present when the row has no contingency (plain number).
**Affected**: `row-table.tsx`, `src/components/ui/chip.tsx`.

### FR-7 — Chip Editability
**Statement**: The breakdown chip MUST be editable. Clicking the chip MUST allow the user to independently edit the base quantity and the contingency amount. Both fields MUST be inline-editable.
**Rationale**: User stated: "the small breakdown on the upper right of the QTY cell should also be editable so the user can freely edit the contingency number or the inputed number."
**Source**: User brief.
**Priority**: P0.
**Acceptance**: User can click the chip, edit base from `100` to `150`, and the contingency amount remains `20`; the QTY total becomes `170` and the Contingency column recalculates the displayed ratio from `20%` to approximately `13%`. Editing the chip's contingency amount directly also updates the QTY total.
**Affected**: `row-table.tsx` (chip click handler + inline edit state).

### FR-8 — Contingency Column Percentage Derivation
**Statement**: When a QTY expression includes a contingency component, the per-row Contingency column MUST display the derived percentage: `(contingencyAmount / baseQuantity) × 100`%. This column MUST stay in sync with the chip and the QTY expression. Once a chip exists, the percentage is read-only; direct percentage entry is allowed only before a chip exists and generates the initial `+N` expression.
**Rationale**: User stated: "the adjustment in percentage must be reflected in the contingency column."
**Source**: User brief.
**Priority**: P0.
**Acceptance**: Editing contingency via chip updates the column percentage. Entering a percentage on a plain row generates the chip and QTY expression. Rows with an existing chip direct users back to the chip for amount edits.
**Affected**: `editable-row-model.ts`, `row-table.tsx`.

### FR-9 — Totals-Area Adjustment Row
**Statement**: A NEW percentage-based Adjustment row MUST be added in the totals area below the row table. It MUST support both `contingency` and `discount` modes and MUST apply its percentage to the estimate SUBTOTAL. If a future surplus row is introduced, the Adjustment row MUST render directly after that surplus row.
**Rationale**: User stated: "After the surplus row, we would need to add a new ADJUSTMENT column and this time it will be like the existing one (contingency and discount) and it would be connected to the subtotal."
**Source**: User brief.
**Priority**: P1.
**Acceptance**: Column renders with mode dropdown + percentage input + computed peso value. Math: `grandTotal = subtotal × (1 + adjustmentPercentage/100)` for contingency, `grandTotal = subtotal × (1 - adjustmentPercentage/100)` for discount.
**Affected**: `branch.tsx`, `editable-row-model.ts`, `types.ts`, `actions.ts`.

### FR-10 — Opt-In Behavior
**Statement**: The QTY+N expression, the chip, and the per-row Contingency column percentage are all OPT-IN. A plain numeric entry in QTY (no `+`) MUST NOT render a chip, MUST NOT show a percentage in the Contingency column, and MUST behave identically to current behavior.
**Rationale**: User stated: "this is optional, if the user does not put anything in the contingency percentage or add a '+' to its entry, then there will be no breakdown."
**Source**: User brief.
**Priority**: P0.
**Acceptance**: Plain `100` entry → no chip, no percentage, no QTY derivation. All existing rows without `quantityBase` continue to render correctly.
**Affected**: `row-table.tsx`, `editable-row-model.ts`.

### FR-11 — Persistence of New Fields
**Statement**: `quantityBase` and `quantityContingencyAmount` MUST be persisted to the `estimate_row_items` table. The existing `quantity` column MUST continue to hold the TOTAL quantity (`quantityBase + quantityContingencyAmount`).
**Rationale**: Data integrity and backward compatibility.
**Source**: Architectural decision (this plan).
**Priority**: P0.
**Acceptance**: After saving a row with `100+20`, the database row has `quantity_base=100`, `quantity_contingency_amount=20`, `quantity=120`.
**Affected**: `actions.ts`, RPC, migration.

### FR-12 — Excel Export Reflects New Columns
**Statement**: The Excel export (.xlsx) MUST reflect the new per-row column order and include the contingency breakdown when present.
**Rationale**: Export must match the sheet view.
**Source**: Implicit from column reorder.
**Priority**: P1.
**Acceptance**: Exported XLSX has columns in the new order. Rows with `100+20` show the breakdown.
**Affected**: `proposal-export/`.

### FR-13 — Realtime Broadcast Consistency
**Statement**: When a user edits a QTY expression, the Realtime broadcast payload MUST include the structured `{ quantityBase, quantityContingencyAmount }` data so other clients can correctly reconstruct the state without re-parsing local-locale-sensitive strings.
**Rationale**: Multi-user consistency.
**Source**: Architectural concern (this plan).
**Priority**: P2.
**Acceptance**: Two clients see the same QTY total, chip, and Contingency percentage after a broadcast.
**Affected**: `use-estimate-row-update-broadcast.ts` or a typed collaboration-event hook. Do not overload cursor-only presence broadcast for row data.

---

## UX Requirements

### UX-1 — Chip Visual Design
**Statement**: The breakdown chip MUST be visually compact (≤10px font, per design system), positioned in the upper-right of the QTY cell, with a neutral or accent tone. It MUST NOT obscure the main QTY value.
**Design system constraints**: 12px max font, xs-only radius, SF Pro. Chip from `src/components/ui/chip.tsx` — neutral tone, 9px font, `min-h-5`.
**Acceptance**: Chip renders with correct tone and position. Visual QA (manual or Playwright screenshot diff).

### UX-2 — Chip Edit Interaction
**Statement**: Clicking the chip opens TWO inline number inputs (base and contingency) positioned immediately below or beside the chip. Editing either field updates the other derived values in real time (debounced 300ms for localStorage, immediate for display).
**Acceptance**: Playwright test: click chip → two inputs appear → edit base → QTY total updates → tab away → chip closes.

### UX-3 — Plain Number Editing Preserved
**Statement**: When no contingency exists, clicking the QTY cell allows direct editing of the single quantity number, as it does today. No chip, no split.
**Acceptance**: Click QTY cell with plain number → editable input with current value → type new value → blur commits.

### UX-4 — Keyboard Flow Through Columns
**Statement**: Tab order MUST be: Materials → Qty → Contingency → Misc Cost → Actions. When the QTY cell has a chip, pressing Tab while the QTY input is focused moves to the Contingency column. If the chip editor is open, Tab cycles through base input → contingency input → close chip → next column.
**Acceptance**: Keyboard test with Vitest RTL `userEvent.tab()`.

---

## Accessibility Requirements

### A11Y-1 — Chip Accessibility
**Statement**: The breakdown chip MUST have `role="button"`, an `aria-label` (e.g., "Quantity breakdown: base 100, contingency 20"), and be keyboard-focusable. Opening the chip MUST announce "Editing quantity breakdown" to screen readers.
**Acceptance**: `axe` audit passes. Manual screen-reader check.

### A11Y-2 — Cell Labeling
**Statement**: Every editable cell MUST have an `aria-label` that clearly identifies the column and current value. The QTY cell label MUST include the contingency breakdown when present.
**Acceptance**: `aria-label="Living Room sofa quantity, 120 total"` (superseded by chip aria-label for breakdown details).

### A11Y-3 — Focus Management
**Statement**: After committing a chip edit, focus MUST return to the chip or the QTY cell. Focus MUST NOT be lost to `document.body`.
**Acceptance**: Playwright test asserts `document.activeElement` after chip close.

---

## Architecture Requirements

### ARCH-1 — Pure Parser
**Statement**: `parseQuantityExpression(input: string): QuantityExpressionResult` MUST be a pure function with no side effects, no DOM access, no React imports. It lives at `src/lib/estimates/parse-quantity-expression.ts`.
**Acceptance**: Unit-testable without DOM. Returns deterministic output for same input.

### ARCH-2 — Immutable State
**Statement**: All `EditableRowValue` updates MUST be immutable (spread, not mutation). The QTY expression result is derived during render, not stored as a separate state variable.
**Acceptance**: No direct mutation of `editableRows` values.

### ARCH-3 — Column Model Extension
**Statement**: The column model MUST be extended (not replaced) to support the new column order and IDs. Existing resize/width/clamp/normalize functions MUST continue to work.
**Acceptance**: `DEFAULT_ESTIMATE_COLUMN_WIDTHS` and `buildEstimateColumnVars()` produce correct output for all columns including the renamed and new ones.

---

## Data Requirements

### DATA-1 — Additive Migration
**Statement**: The schema migration MUST be additive only. No column drops, renames, destructive changes, or data rewrites. Existing data MUST survive unmodified.
**Acceptance**: Migration inspection/local apply. Seed-data smoke test after migration. Rollback validation is non-destructive by default: code revert/feature flag/fix-forward with additive objects left in place.

### DATA-2 — Null Safety
**Statement**: `quantityBase` and `quantityContingencyAmount` MUST be nullable. NULL means "legacy mode" (no contingency expression). The application layer MUST handle NULL gracefully.
**Acceptance**: All queries return correct rows with NULL fields. UI renders legacy rows unchanged.

---

## Security Requirements

### SEC-1 — Input Validation
**Statement**: All user input in the QTY expression MUST be validated: only digits, `.` (decimal), `+`, and whitespace accepted. Whitespace is stripped before parsing; every other character is rejected, not silently removed. No script injection, no HTML, no exponential notation. Server-side validation MUST mirror client-side for numeric fields and reject inconsistent totals.
**Acceptance**: `parseQuantityExpression("<script>")` returns `{ error: "Invalid expression" }`. Server action rejects invalid payloads with 400.

### SEC-2 — Authorization
**Statement**: All row updates MUST be gated behind the existing `canEditEstimate` authorization check. The new `estimate_sheet_adjustments` table MUST have explicit RLS and the adjustment action MUST use the same edit gate.
**Acceptance**: Existing row RLS/action-level auth gates apply to row fields; viewer and non-member users cannot insert, update, or delete sheet adjustments.

---

## Performance Requirements

### PERF-1 — Parser Cost
**Statement**: `parseQuantityExpression()` MUST execute in <1ms for typical inputs (deterministic, no regex catastrophic backtracking).
**Acceptance**: Benchmark test or profiling assertion.

### PERF-2 — No Wasted Rerenders
**Statement**: Adding the chip to the QTY cell MUST NOT cause full-table rerenders. The `useMemo` in `EstimateRowItemTableRow` (line 219 of row-table.tsx) already isolates per-row computation.
**Acceptance**: React profiler shows only the affected row re-renders on QTY edit.

---

## Testing Requirements

### TEST-1 — Parser Unit Tests
**Statement**: A new test file `tests/vitest/estimate-sheet-editable-row-model.test.ts` MUST cover ≥12 parser and math cases: plain number, expression with +, decimal, leading/trailing whitespace, missing operand, negative, zero, edge cases.
**Acceptance**: `bun run test:dom -- estimate-sheet-editable-row-model` passes with ≥12 assertions.

### TEST-2 — Column Model Regression
**Statement**: `tests/vitest/estimate-sheet-column-model.test.ts` MUST be updated to reflect the new column order and renamed column.
**Acceptance**: All existing assertions pass after update.

### TEST-3 — Scenario Tests
**Statement**: Each scenario in `02_FEATURE_BRIEF_AND_SCOPE.md` (S1–S12) MUST have a corresponding Vitest DOM test case.
**Acceptance**: `bun run test:dom` passes all 12 scenario assertions.

### TEST-4 — Build + Type Check
**Statement**: `bun run build` and `bun run type-check` MUST pass with zero errors after all changes.
**Acceptance**: Exit code 0 for both commands.
