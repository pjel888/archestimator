# Requirements And Acceptance Criteria

## Functional Requirements

### R0. Reorder must not fail workspace resolution (CRITICAL, added 2026-07-06)

- Every call to `reorderEstimateTreeNodes` must succeed in persisting both the new node positions and the audit-trail `estimate_sheet_events` row.
- The RPC payload sent to `reorder_estimate_nodes_with_history` must include `target_project_id: project.id`.
- The persisted `estimate_sheet_events` row must have non-null `workspace_id` and `project_id` matching the active project.
- The error string `"Estimate history event workspace could not be resolved."` must never fire for any authorized reorder.

### R1. Non-empty branch reorder works.

- A branch with descendants can move before the first sibling, between siblings, after the last sibling, inside another branch, and back to root.
- Descendants remain attached and in the same relative order.
- Reorder payload updates only the moved node and affected sibling rows needed to persist the new order.

### R2. Confirmed server tree keeps future reorder calculations correct.

- The cache merge after a successful reorder adopts confirmed structural fields used by planning, especially `sortOrder`.
- Local row edits and cached row item content survive reorder settle.

### R3. Keyboard reorder has parity with pointer DnD.

- Move dialog supports before, inside, after, and root placements.
- Move dialog stores a selected target as an object, not only a destination id: `{ kind: "node", targetNodeId: string, position: "before" | "inside" | "after" }` or `{ kind: "root", edge: "top" | "bottom" }`.
- Root top maps to dropping before the first movable root sibling; root bottom maps to dropping after the last movable root sibling. If that is a no-op, the option remains visible but disabled with a reason.
- Disabled choices expose a keyboard-reachable reason.
- Focus returns to the moved or restored source row.

### R4. Pointer DnD communicates placement.

- Before, inside, and after states are visually distinct.
- Invalid targets do not look actionable.
- Search, edit, saving, and optimistic-create disabled states explain why reorder is unavailable.

### R5. Persistence and readback honor stored order.

- Server action rejects unauthorized, cross-estimate, cross-tab, self/cycle, and optimistic-id moves.
- Active D1 reorder receives `target_project_id` for history scoping (closed by R0/Phase 0).
- Active D1 reorder validates projected tree state before writing (RC5 residual; added by Phase 3).
- Repository readback sorts by `sort_order ASC, id ASC` and rendered order matches the persisted plan.

### R6. Disabled states explain why reorder is unavailable.

- Search, inline rename, pending reorder save, and optimistic-create gates expose visible or focusable help text.
- Invalid drop targets expose a reason without presenting an actionable insertion line.

### R7. EstimateSheetTree uses handle-only pointer drag.

- EstimateSheetTree opts into handle-only drag activation. The row body remains clickable/focusable but does not initiate a reorder drag; the grip is the pointer drag source.
- The shared `Tree` preserves row-drag compatibility by default unless `dragActivation="handle"` is passed.

### R8. Performance is preserved.

- Hover keeps using cheap validation, not full reorder planning.
- Large flat and nested trees stay within the focused perf budgets.

### R9. Accessibility states are complete.

- Active route, keyboard focus, drag source, valid drop target, invalid target, saving, saved, and error states are distinguishable by more than color alone.
- Reorder status remains announced with `aria-live`.
- Move dialog disabled reasons are keyboard-reachable.

### R10. Existing non-reorder tree states remain protected.

- Context menu, Save as template, inline rename, optimistic create, single delete, bulk delete, restore Undo, search/filter, lazy subtree loading, active-tab routing, external drops, and query error/empty states must remain covered by tests or documented as unchanged.
- Delete/bulk delete Undo is current behavior; reorder undo is out of scope unless explicitly pulled in later.
- Node/row restore is UI/action-wrapper tested today, but active D1 provider restore must be proven or explicitly deferred because the D1 adapter currently throws for restore calls.

### R11. Permission and provider proof are explicit evidence classes.

- Tree mutating controls must either receive a permission gate from the parent or the plan must explicitly accept server-only enforcement for the first-user release.
- Mocked action-wrapper tests may prove payload shape, but they must not be used to claim D1 history-row persistence.
- Local D1, remote D1, browser, and production proof must be labeled separately in implementation closeout.

## Acceptance Criteria

AC0. Action-wrapper tests prove the reorder RPC payload includes `target_project_id`, existing reorder payload expectations are updated to the new shape, a D1 adapter/local-provider proof shows an `estimate_nodes_reordered` history row with non-null `workspace_id` and matching `project_id`, and the "Estimate history event workspace could not be resolved" error does not fire for any nesting or flat reorder. (Phase 0)

AC1. Pure planner tests prove branch-with-descendants moves.

AC2. DOM DnD tests prove non-empty branch reorder before/after a sibling branch and root-bottom placement.

AC3. Optimistic UI tests prove success, rollback, stale prop protection, and cached row edit preservation for non-empty branches.

AC4. Move dialog tests prove before/inside/after/root placement and accessible disabled reasons.

AC5. Merge tests prove confirmed `sortOrder` is adopted while cached row content is preserved.

AC6. Action-wrapper and D1 adapter/provider tests prove sparse branch reparent, root move with `targetTabId`, projected-tree cycle rejection (RC5 residual), and error surfacing.

AC7. Shared tree and EstimateSheetTree DOM tests prove handle-only drag activation for the estimate tree and preserve row-drag default compatibility for other consumers.

AC8. Performance tests keep hover validation cheap for large flat and nested trees.

AC9. Typecheck passes.

AC10. The state inventory in `20_STATE_INVENTORY_AND_SHADOW_PATHS.md` is covered by existing tests, new focused tests, or explicit non-goal decisions. No implementation may regress context-menu, rename, create, delete, bulk delete, restore, search/filter, lazy-load, active-tab, external-drop, or query states silently.

AC11. Permission-gated tree controls and D1 restore/provider behavior are either proven by focused tests or left as named release risks with owner decision.

## Done Evidence

Expected focused command (Phase 0 subset, fastest signal):

```bash
bunx vitest run tests/vitest/estimate-node-reorder-action.test.ts --maxWorkers=1
```

Expected focused command (Phases 1-6):

```bash
bunx vitest run tests/vitest/estimate-tree-reorder.test.ts tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-sheet-tree-dom.test.tsx tests/vitest/estimate-tree-context-menu.test.tsx tests/vitest/estimate-tree-bulk-selection.test.tsx tests/vitest/estimate-tree-filter.test.tsx tests/vitest/estimate-tree-lazy-hydration-ui.test.tsx tests/vitest/estimate-node-reorder-action.test.ts tests/vitest/ui-tree.test.tsx tests/vitest/estimate-tree-drag-over-perf.test.ts --maxWorkers=1
```

Expected static command:

```bash
bun run type-check
```
