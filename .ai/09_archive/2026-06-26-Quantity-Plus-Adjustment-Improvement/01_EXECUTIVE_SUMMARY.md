# 01 — Executive Summary

## Recommendation

Re-architect the estimate sheet's per-row columns to reflect field-operations reality: contingency is a **quantity add-on** first, not a money percentage. Implemented through three co-designed changes:

1. **Column re-order + rename.** Swap the `adjustment` and `subTotal` columns so the per-row order becomes `Qty → Contingency → Subtotal → Misc Cost → Total Item Cost`. Rename the old `adjustment` column label from "Adjustment" to "Contingency." The per-row contingency column loses the discount mode toggle (contingency-only at per-row level) and is rebound from SUBTOTAL to QTY.

2. **Inline `QTY + N` syntax.** The QTY cell switches from `type="number"` to `type="text"` + `inputMode="decimal"`. A user can type `100 + 20` — the cell displays the total (`120`), a small editable Chip in the upper-right shows the breakdown (`100 + 20`), and the adjacent Contingency column shows the derived percentage (`20%`). Plain `100` entries remain unchanged — the chip and split are opt-in.

3. **New totals-area percentage Adjustment row.** A new, percentage-based Adjustment row with contingency/discount mode toggle is added below the row table in the totals area. It applies to the estimate subtotal, mirroring the legacy percentage behavior at a safer sheet-level scope for the first implementation. This row persists in a dedicated `estimate_sheet_adjustments` record keyed by `estimate_id`; per-node overrides are future-only.

This is a **UI-first change** with important persistence plumbing — no new libraries, no large-scale refactors. The core parser (`parseQuantityExpression`) is a small pure function. The db migration is additive: two nullable columns on `estimate_row_items`, a small estimate-level adjustment table, and RPC/history/select updates. Existing rows with no quantity breakdown stay in legacy mode.

## Affected surfaces (summary)

| Surface | Impact |
|---|---|
| `src/lib/estimate-sheet/column-model.ts` | Re-order columns; rename `adjustment` → `contingency`; add new column ID |
| `src/components/workshop/estimate-sheet/rows/row-table.tsx` | QTY cell text input, chip, per-row Contingency cell and column rename |
| `src/components/workshop/estimate-sheet/rows/branch.tsx` | Totals-area Adjustment row below the row table |
| `src/components/workshop/estimate-sheet/rows/editable-row-model.ts` | Add `quantityExpression`, split parser, rebind contingency math to QTY |
| `src/components/workshop/estimate-sheet/rows/cells-model.ts` | Keyboard handler for `+` in QTY cell |
| `src/components/workshop/estimate-sheet/activity-history-model.ts` | Add `quantityBase`, `quantityContingencyAmount` to `FlattenedEstimateRow` |
| `src/lib/estimates/types.ts` | New fields on `EstimateRowItem` |
| `src/lib/estimates/actions.ts` | `updateEstimateRowItem` accepts new fields |
| `src/lib/proposal-export/build-proposal-export-model.ts` | Reads new fields, propagates to XLSX |
| `src/hooks/use-estimate-row-mutations.ts` | RPC payload includes new fields |
| `src/hooks/use-estimate-row-update-broadcast.ts` or collaboration event model | Broadcast structured row-update payload (not raw string), separate from cursor-only broadcasts |
| `supabase/migrations/` | New additive migration (2 nullable row columns + estimate-level adjustment table + RPC/history updates) |
| `tests/vitest/estimate-sheet-column-model.test.ts` | Column order assertions updated |
| `tests/vitest/estimate-sheet-cost-inputs.test.tsx` | QTY expression parsing tests |
| `tests/vitest/estimate-sheet-editable-row-model.test.ts` | New — parser unit tests |

## Risk summary

Full risk register in `14_RISK_REGISTER.md`. Top risks:

- **RISK-1 (MED)**: QTY `type="text"` opens free-form input — users may type garbage. Mitigated by strict parser that rejects invalid expressions with an inline warning chip.
- **RISK-2 (MED)**: Existing rows with non-zero `contingencyPercentage` could lose legacy subtotal-adjustment behavior if converted implicitly. Mitigated by preserving legacy mode while `quantityBase IS NULL`; no backfill or destructive rewrite.
- **RISK-3 (LOW)**: Surplus row does not exist yet. Mitigated by making totals-area Adjustment the authoritative first implementation and treating surplus row placement as a future visual relocation only.
- **RISK-4 (LOW)**: Realtime broadcast of raw QTY string could confuse other clients. Mitigated by using a separate structured row-update event and validating fields before optimistic display updates.

## Implementation effort

Medium-high. Estimated 1–2 focused implementation days for a developer familiar with the codebase because RPC/history and selector propagation must be updated, not just UI. Broken into 7 phases:

1. Migration, generated types, and repository selectors (Phase 1)
2. RPC/history/persistence plumbing and server validation (Phase 2)
3. Parser + editable-row-model rebind (Phase 3)
4. Column model + row-table column reorder/rename (Phase 4)
5. QTY cell chip + expression support (Phase 5)
6. Totals-area Adjustment row (Phase 6)
7. Export + row-update broadcast + integration (Phase 7)

Plus testing time (~2 hr across all phases, TDD-first).

## Readiness

See `17_FINAL_READINESS_REVIEW.md` for scored assessment. The improvement pass resolves owner-answer blockers and records remaining gaps as implementation-time proof work, not planning decisions.
