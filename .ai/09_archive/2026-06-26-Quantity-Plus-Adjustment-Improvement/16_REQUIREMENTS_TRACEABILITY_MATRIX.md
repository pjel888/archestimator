# 16 — Requirements Traceability Matrix

This plan defines 33 requirement IDs: FR-1..FR-13, UX-1..UX-4, A11Y-1..A11Y-3, ARCH-1..ARCH-3, DATA-1..DATA-2, SEC-1..SEC-2, PERF-1..PERF-2, and TEST-1..TEST-4.

| Req ID | Source | User Outcome | Phase | Task IDs | Code Areas | Acceptance | Test Coverage | Status |
|---|---|---|---|---|---|---|---|---|
| FR-1 | User brief | Columns reordered to Qty -> Contingency -> Subtotal | P4 | P4-T1, P4-T2 | `column-model.ts`, `row-table.tsx` | Header text/order matches spec | `estimate-sheet-column-model.test.ts` | Planned |
| FR-2 | User brief | Per-row Adjustment renamed to Contingency | P4 | P4-T1, P4-T2 | `column-model.ts`, `row-table.tsx` | No per-row "Adjustment" label remains | Column/DOM tests | Planned |
| FR-3 | User brief | Contingency bound to QTY, not SUBTOTAL | P3, P4 | P3-T2, P4-T3 | `editable-row-model.ts`, `row-table.tsx` | `subTotal = itemCost * (base + contingency)` for quantity-mode rows | Row-model tests | Planned |
| FR-4 | User brief | No discount mode at per-row level | P4 | P4-T3 | `row-table.tsx` | No per-row mode dropdown after conversion/new rows | DOM test | Planned |
| FR-5 | User brief | Inline `QTY + N` expression accepted | P3, P5 | P3-T1, P5-T1 | `parse-quantity-expression.ts`, `row-table.tsx` | `100+20` parses and commits correctly | Parser + DOM tests | Planned |
| FR-6 | User brief | QTY cell shows breakdown chip | P5 | P5-T2 | `row-table.tsx` | Chip visible only when add-on > 0 | DOM test | Planned |
| FR-7 | User brief | Chip is editable | P3, P5 | P3-T3, P5-T3 | `editable-row-model.ts`, `row-table.tsx` | Click/Enter chip -> edit -> commit/revert works | DOM + optional E2E | Planned |
| FR-8 | User brief | Contingency shows derived percentage | P3, P4 | P3-T2, P3-T3, P4-T3 | `editable-row-model.ts`, `row-table.tsx` | `100+20` displays `20%`; chip rows read-only | Row-model + DOM tests | Planned |
| FR-9 | User brief | New totals-area Adjustment row applies to direct cost | P1, P2, P6, P7 | P1-T1, P2-T3, P6-T1, P6-T2, P7-T1 | `branch.tsx`, `actions.ts`, `estimate_sheet_adjustments`, export | Mode + percentage + peso value persist and export once | Branch DOM, action/RLS, export tests | Planned |
| FR-10 | User brief | Plain number remains opt-in/no chip | P3, P5 | P3-T2, P5-T1 | `editable-row-model.ts`, `row-table.tsx` | Plain `100` has no chip and no quantity-mode conversion | Parser/DOM tests | Planned |
| FR-11 | User brief | New fields persisted to DB/history | P1, P2 | P1-T1..P1-T3, P2-T1, P2-T2 | Migration, RPC, repositories, actions | DB row and history snapshot preserve base/add-on | Migration + integration tests | Planned |
| FR-12 | Implied | XLSX/export reflects new math | P7 | P7-T1 | `proposal-export/` | Legacy/new rows and Adjustment export without double-count | Export tests | Planned |
| FR-13 | Arch concern | Row update broadcasts stay consistent | P7 | P7-T2 | `use-estimate-row-update-broadcast.ts` or collaboration hook | Structured payload validates before optimistic display | Broadcast tests | Planned |
| UX-1 | This plan | Chip visual is compact/readable | P5 | P5-T2 | `row-table.tsx` | Chip does not obscure QTY/unit text | DOM + browser QA | Planned |
| UX-2 | This plan | Chip edit interaction is understandable | P5 | P5-T3 | `row-table.tsx` | Two-field edit surface syncs values predictably | DOM + browser QA | Planned |
| UX-3 | This plan | Plain number editing remains fast | P5 | P5-T1 | `row-table.tsx` | Existing single-number edit flow preserved | DOM test | Planned |
| UX-4 | This plan | Tab order follows working flow | P4, P5 | P4-T2, P5-T3 | `row-table.tsx`, `cells-model.ts` | Materials -> Qty -> Contingency -> Misc Cost | Keyboard DOM test | Planned |
| A11Y-1 | This plan | Chip is keyboard-accessible | P5 | P5-T2, P5-T3 | `row-table.tsx` | Role/label and Enter/Space behavior present | DOM aria/focus tests | Planned |
| A11Y-2 | This plan | Cells have useful labels/errors | P5 | P5-T1, P5-T3 | `row-table.tsx` | Labels include column/value; errors announced | DOM aria test | Planned |
| A11Y-3 | This plan | Focus returns predictably | P5 | P5-T3 | `row-table.tsx` | Escape/commit returns focus to chip or next cell | DOM focus test | Planned |
| ARCH-1 | This plan | Parser is pure and isolated | P3 | P3-T1 | `parse-quantity-expression.ts` | No React/DOM imports; deterministic result | Unit tests + code review | Planned |
| ARCH-2 | This plan | State updates are immutable | P1, P3 | P1-T2, P3-T2, P3-T3 | `editable-row-model.ts`, reducers/hooks | State patches do not mutate existing rows | Type/lint/code review | Planned |
| ARCH-3 | This plan | Column model extended, not replaced | P4 | P4-T1 | `column-model.ts` | Resize/width/clamp behavior preserved | Column-model tests | Planned |
| DATA-1 | This plan | Migration is additive | P1 | P1-T1 | Migration file | No DROP/RENAME/data rewrite | Migration inspection + local apply | Planned |
| DATA-2 | This plan | Null safety and legacy mode preserved | P1, P2, P6 | P1-T1..P1-T3, P2-T2, P6-T2 | Migration, types, actions, selectors | NULL row fields and no adjustment row are safe defaults | Seed smoke + tests | Planned |
| SEC-1 | This plan | Input validation client + server | P2, P3, P5 | P2-T2, P3-T1, P5-T1 | Parser, server action | Invalid input rejected in UI and action | Parser + server tests | Planned |
| SEC-2 | This plan | Authorization gates apply to new writes | P1, P2, P6 | P1-T1, P2-T2, P2-T3, P6-T2 | RLS, `actions.ts` | Viewer/non-member writes blocked | Auth/RLS tests | Planned |
| PERF-1 | This plan | Parser executes within budget | P3 | P3-T1 | `parse-quantity-expression.ts` | Typical parse <0.1ms | Parser benchmark test | Planned |
| PERF-2 | This plan | QTY edits do not rerender whole table | P5 | P5-T1..P5-T3 | `row-table.tsx` | Edited row rerenders; virtual table stable | Manual profiler/browser QA | Planned |
| TEST-1 | This plan | Parser unit tests cover grammar | P3 | P3-T1 | `estimate-sheet-editable-row-model.test.ts` | Valid/invalid parser matrix passes | Targeted Vitest | Planned |
| TEST-2 | This plan | Column model regression tests updated | P4 | P4-T1 | `estimate-sheet-column-model.test.ts` | Order/label/width assertions pass | Targeted Vitest | Planned |
| TEST-3 | This plan | S1-S12 scenarios covered | P5, P6, P7 | P5-T1..P7-T4 | Multiple files | Each scenario has at least one test or manual proof | Scenario matrix in 12 | Planned |
| TEST-4 | This plan | Build/type/lint pass after implementation | P7 | P7-T3 | Whole source set | `type-check`, `lint`, `build` exit 0 | Regression gate | Planned |
