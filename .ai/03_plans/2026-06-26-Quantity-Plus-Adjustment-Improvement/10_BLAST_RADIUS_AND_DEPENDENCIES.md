# 10 — Blast Radius And Dependencies

## Files Modified

| File | Impact | Risk |
|---|---|---|
| `supabase/migrations/20260626000000_add_quantity_contingency_columns.sql` | Add row quantity columns, adjustment table, RLS, RPC/history changes | HIGH |
| `src/lib/database.types.ts` or generated Supabase types | New row fields and `estimate_sheet_adjustments` table | MED |
| `src/lib/estimates/types.ts` | Add optional row fields and sheet adjustment type | MED |
| `src/lib/estimates/actions.ts` | Validate/update row quantity fields; add adjustment upsert action | HIGH |
| `src/hooks/use-estimate-row-mutations.ts` | Include new row fields in mutation payload and optimistic rollback | MED |
| `src/lib/domain/workspace-repository.ts` | Include new fields in estimate-sheet selectors | MED |
| `src/lib/domain/estimate-repository.ts` | Include new fields in estimate read/write selectors | MED |
| Route-context RPC/selectors | Hydrate row fields and sheet adjustment in page data | MED |
| `src/components/workshop/estimate-sheet/rows/editable-row-model.ts` | Parser integration, quantity-mode math, legacy-mode preservation | HIGH |
| `src/components/workshop/estimate-sheet/rows/row-table.tsx` | QTY text input, chip editor, Contingency cell redesign | HIGH |
| `src/components/workshop/estimate-sheet/rows/branch.tsx` | Totals-area Adjustment row rendering and save state | MED |
| `src/lib/estimate-sheet/column-model.ts` | Reorder and rename per-row columns | MED |
| `src/components/workshop/estimate-sheet/rows/cells-model.ts` | Keyboard handling for text QTY and `+` key | LOW |
| `src/components/workshop/estimate-sheet/activity-history-model.ts` | Flatten new row fields for history/activity UI | LOW |
| `src/hooks/use-estimate-row-update-broadcast.ts` | New or renamed row-update collaboration event hook | MED |
| `src/lib/proposal-export/build-proposal-export-model.ts` | Legacy vs quantity-mode export math; totals Adjustment source | HIGH |
| `src/lib/proposal-export/create-proposal-workbook.ts` | Optional quantity breakdown columns and header order | LOW |
| `src/lib/proposal-export/types.ts` | Optional export detail fields and adjustment settings | LOW |

## Files Created

| File | Purpose |
|---|---|
| `src/lib/estimates/parse-quantity-expression.ts` | Pure strict parser |
| `src/hooks/use-estimate-row-update-broadcast.ts` | Row-update event channel, unless implemented as a typed union in an existing collaboration hook |
| `tests/vitest/estimate-sheet-editable-row-model.test.ts` | Parser and math rebind tests |
| `tests/vitest/estimate-sheet-adjustment-action.test.ts` or nearest server-action test file | Auth/RLS/action validation coverage for `estimate_sheet_adjustments` |

## Database And RPC Objects

| Object | Required change |
|---|---|
| `estimate_row_items` | Add `quantity_base`, `quantity_contingency_amount`, constraints |
| `estimate_sheet_adjustments` | New estimate-level adjustment table with `UNIQUE(estimate_id)` |
| `update_estimate_row_item_with_history` | Accept, validate/diff, and persist new row fields |
| Row snapshot/history payloads | Include new row fields so undo/history/publication does not drop them |
| RLS policies | Add explicit policies for `estimate_sheet_adjustments` |

## Files Verified Only

| File | Reason |
|---|---|
| `src/components/workshop/EstimateSheetContent.tsx` | Props passthrough; verify sheet adjustment data reaches branch/table layer |
| `src/components/workshop/estimate-sheet/rows/cells.tsx` | Material cell unchanged |
| `src/components/workshop/estimate-sheet/proposal-preview-model.ts` | Uses node totals; verify quantity-mode subtotal changes feed preview |
| `src/components/workshop/estimate-sheet/template-insertion-model.ts` | Verify new fields default to legacy/null on inserted templates |
| `src/lib/estimates/estimate-row-tree-patch.ts` | Verify row patching preserves new fields |
| `src/lib/project-charts/aggregate-project-charts.ts` | Uses quantity/subtotal; verify no double count |
| `src/lib/publication/`, `src/lib/share/` | Verify row snapshots serialize new fields |
| `src/components/workshop/estimate-tree-data.ts` | Seed/default data should leave new fields null |

## Tests Modified

- `tests/vitest/estimate-sheet-column-model.test.ts` — column order and label assertions.
- `tests/vitest/estimate-sheet-cost-inputs.test.tsx` — QTY input, chip, Contingency display, keyboard flow.
- Proposal export tests — legacy row, quantity-mode row, totals-area Adjustment, no double-counting.
- Auth/server-action tests — row field validation and adjustment RLS/action authorization.
- Broadcast tests — row-update payload validation and stale/mismatched payload rejection.

## Implementation Dependency Order

```text
Phase 1: DB/generated types/selectors
  -> Phase 2: RPC/action validation and history propagation
    -> Phase 3: parser/math model
      -> Phase 4: row table columns and Contingency cell
      -> Phase 5: QTY chip/editor
      -> Phase 6: totals-area Adjustment row
        -> Phase 7: export, broadcast, regression, manual QA
```

The row table and totals-area Adjustment can be built in adjacent slices only after Phase 1 selectors and Phase 2 mutation contracts exist.

## Concurrent Work Conflict Risk

- `2026-06-26-Reorganize-Existing-Estimate-Row-Items`: both plans touch `row-table.tsx`, column model behavior, and keyboard flow. Coordinate file-level ordering.
- Publication/share work: low direct conflict, but row snapshot fields must be preserved.
- Any migration touching `update_estimate_row_item_with_history`: high conflict; merge carefully and re-run row history tests.
