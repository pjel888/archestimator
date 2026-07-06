# Traceability Matrix

| ID | Requirement | Evidence | Planned tests |
| --- | --- | --- | --- |
| R0 | Reorder must not fail workspace resolution (CRITICAL, added 2026-07-06) | RPC payload at `actions.ts:2252` omits `target_project_id`; throw at `d1-action-client.ts:451`; schema NOT NULL at `migrations/0025_reusable_source_insert_support.sql:11` | T-RC0-1/T-RC0-3 in `tests/vitest/estimate-node-reorder-action.test.ts`; T-RC0-2/T-RC0-4 in a D1 adapter/local-provider harness |
| R1 | Non-empty branch reorder works | Planner removes and reinserts subtree in `estimate-tree-reorder.ts` (`removeNode`/`insertNode`); P6 single-node model verified at line 353 | Pure planner, DOM DnD, optimistic UI branch tests |
| R2 | Confirmed server tree keeps future reorder calculations correct | Merge omits confirmed `sortOrder` in `estimate-tree-reorder.ts:304`; sparse planner reads `sortOrder` in `estimate-tree-reorder.ts:210` | Merge regression test |
| R3 | Keyboard reorder parity | Move dialog validates only inside at `EstimateSheetTree.tsx:1605-1625` and confirms inside at `EstimateSheetTree.tsx:1640-1645` | Context-menu Move dialog placement tests |
| R4 | Pointer placement clarity | Drop bands in `tree.tsx:399-415`; estimate enables inside on leaves at `EstimateSheetTree.tsx:2010` | Shared tree and DOM DnD class/state tests |
| R5 | Persistence/readback honor stored order | Server action/D1 path in `actions.ts:2170-2264`; D1 client creation in `d1-action-client.ts:969`; repository order in `workspace-repository.ts` `buildEstimateTree` | R0 covers payload/history; RC5 residual covers cycle rejection (Phase 3); repository readback test |
| R6 | Disabled states explain why | Reorder blocked in `EstimateSheetTree.tsx:825-831`; currently mostly silent | DOM tests for visible/help status |
| R7 | Estimate tree uses handle-only pointer drag | Row currently owns draggable behavior in shared `tree.tsx`; grip is decorative | Shared Tree compatibility test plus EstimateSheetTree handle-only test |
| R8 | Performance preserved | Hover validation test in `estimate-tree-drag-over-perf.test.ts` | Existing perf plus nested sample if needed |
| R9 | A11y states complete | Tree keyboard nav in `tree.tsx`; status live region in `EstimateSheetTree.tsx:1972-1981` | Focus, aria-live, disabled reason tests |
| R10 | Existing non-reorder tree states remain protected | `20_STATE_INVENTORY_AND_SHADOW_PATHS.md`; existing context-menu, bulk, filter, lazy, DnD tests | Preservation/gap tests for context menu, rename, create, delete, bulk delete, restore, search/filter, lazy load, active tab, external drops |
| R11 | Permission and provider proof are explicit | `EstimateSheetTree` lacks `canEditEstimate`; D1 restore adapter throws; mocked action test cannot prove D1 insert | Permission UI test or decision; D1 adapter/provider tests; evidence labels in implementation closeout |

## Phase Mapping

| Phase | Closes | Test Files |
| --- | --- | --- |
| 0 (HOTFIX) | R0, RC0, RC5 payload portion | `estimate-node-reorder-action.test.ts` for wrapper payload/nesting; D1 adapter/local-provider harness for history-row and missing-project proof |
| 1 | R1, R2 (RED), R3 (RED), R6 (RED), R7 (RED), R10 gap tests | `estimate-tree-reorder.test.ts`, `estimate-sheet-tree-dnd.test.tsx`, `estimate-sheet-tree-dom.test.tsx`, `estimate-tree-context-menu.test.tsx`, `estimate-tree-bulk-selection.test.tsx`, `estimate-tree-filter.test.tsx`, `estimate-tree-lazy-hydration-ui.test.tsx`, `ui-tree.test.tsx` |
| 2 | R2 (GREEN) | same as Phase 1 |
| 3 | RC5 residual cycle/shape validation; D1 provider proof gaps | `estimate-node-reorder-action.test.ts` plus D1 adapter/local-provider tests |
| 4 | R3 (GREEN) | `estimate-tree-context-menu.test.tsx` |
| 5 | R4, R6, R7 (GREEN) | `ui-tree.test.tsx`, `estimate-sheet-tree-dom.test.tsx` |
| 6 | Refactor guard | all focused |
| 7 | Final typecheck + optional browser | n/a |

## Evidence Labels

- Proven: source code or existing test directly shows behavior.
- Inferred: source supports a likely consequence but RED test must reproduce the user-facing failure.
- Planned: not yet implemented, included as a required future proof.

## R0 Confidence

**Proven** at the source level: throw site, schema, and payload are all verified. The Phase 0 fix is one line; confidence that the fix resolves the user-reported error is HIGH.
