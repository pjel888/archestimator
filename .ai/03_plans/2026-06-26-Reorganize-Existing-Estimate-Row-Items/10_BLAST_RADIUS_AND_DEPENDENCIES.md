# Blast Radius And Dependencies

## Likely Product Files

| File | Expected Change |
| --- | --- |
| `src/components/workshop/EstimateSheetContent.tsx` | Listen for tree row-drop event, pass row move handler to branch list, enforce transformed-view guards |
| `src/components/workshop/EstimateSheetTree.tsx` | Accept row MIME in external drop options and dispatch row move event |
| `src/components/ui/tree.tsx` | Usually no change; only adjust if current external drop API cannot express row inside-only behavior |
| `src/components/workshop/estimate-sheet/rows/branch.tsx` | Add branch-level row drop target and pass row move props to row table |
| `src/components/workshop/estimate-sheet/rows/row-table.tsx` | Render row drag handle above selection checkbox and row insertion indicators |
| `src/components/workshop/estimate-sheet/rows/drop-zones.tsx` | Add row-specific drop affordance if branch-level component is appropriate |
| `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts` | Add `moveRowItem` orchestration, optimistic patch, rollback, focus/toast behavior |
| `src/hooks/use-estimate-row-mutations.ts` | Add mutation wrapper distinct from component `moveRows` |
| `src/lib/estimates/estimate-row-tree-move.ts` | Add pure helper for move/reorder final order calculation |
| `src/lib/estimates/actions.ts` | Add server action for row reorganization |
| `supabase/migrations/*` | Add RPC for transaction-safe row reorganization |
| Supabase generated types | Update if workflow requires RPC type generation |

## Likely Test Files

| File | Expected Coverage |
| --- | --- |
| `tests/vitest/estimate-row-branch-move.test.ts` | Pure helper: same-node reorder, cross-node move, no-op, invalid target, revision update list |
| `tests/vitest/estimate-sheet-row-drop-to-branch.test.tsx` | Middle sheet row drag/drop behavior and rollback |
| `tests/vitest/estimate-sheet-tree-dom.test.tsx` | Left-tree row external drop event |
| `tests/vitest/tree-external-drop.test.tsx` | External drop cleanup and unsupported MIME behavior |
| `tests/vitest/estimate-sheet-cost-inputs.test.tsx` | Checkbox hover/focus non-regression with handle |
| `tests/vitest/estimate-row-table-virtualization.test.tsx` | Virtualized row table remains bounded |
| `tests/vitest/estimate-sheet-actions-authz.test.ts` | Server action authorization and validation |
| `tests/vitest/estimate-tree-drag-over-perf.test.ts` | Tree dragover budget remains acceptable |
| `e2e/estimate-row-drop-to-branch.spec.ts` | Mandatory focused browser geometry proof before release |

## Dependency Position

Do not add a third-party drag-and-drop package for the first implementation. The app already uses native DnD and explicit MIME types for tree/template/project-source flows. Extending that pattern keeps dependency risk low.

If implementation discovers native DnD cannot meet accessibility or touch needs, prefer the keyboard/touch move dialog over adding a drag library.

## Blast Radius Assessment

Risk is moderate:

- UI touches shared estimate row rendering.
- Persistence touches database ordering and history.
- Left tree accepts a new external drop kind.
- Existing component movement uses similar naming and must not regress.

The risk is manageable with a pure helper, dedicated MIME/action/RPC names, targeted tests, and a feature flag or local guard if rollout needs staged exposure.
