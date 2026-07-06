# Test Strategy And QA Matrix

## Phase 0 Focused Subset (CRITICAL — fastest signal)

```bash
bunx vitest run tests/vitest/estimate-node-reorder-action.test.ts --maxWorkers=1
```

This single file is where the action-wrapper T-RC0 payload tests land. It must be green before any other phase begins, but it does not prove actual D1 history-row insertion because the file mocks the D1 action client.

Phase 0 also needs a D1 adapter/local-provider proof for `estimate_sheet_events` persistence. Use the narrowest existing D1 test harness in the repo; if none fits, add one next to the D1 action-client tests. Do not claim provider proof from the mocked action-wrapper file.

## Full Focused Suite (Phases 1-6)

```bash
bunx vitest run tests/vitest/estimate-tree-reorder.test.ts tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-sheet-tree-dom.test.tsx tests/vitest/estimate-tree-context-menu.test.tsx tests/vitest/estimate-tree-bulk-selection.test.tsx tests/vitest/estimate-tree-filter.test.tsx tests/vitest/estimate-tree-lazy-hydration-ui.test.tsx tests/vitest/estimate-node-reorder-action.test.ts tests/vitest/ui-tree.test.tsx tests/vitest/estimate-tree-drag-over-perf.test.ts --maxWorkers=1
```

After refactor:

```bash
bun run type-check
```

## Phase 0 Tests To Add (RC0)

| Area | File | New coverage |
| --- | --- | --- |
| RPC payload | `tests/vitest/estimate-node-reorder-action.test.ts` | T-RC0-1: payload sent to `reorder_estimate_nodes_with_history` includes `target_project_id` matching resolved project id. Update every existing reorder expectation that currently omits it. |
| Audit-trail | D1 adapter/local-provider harness | T-RC0-2: resulting `estimate_sheet_events` row has `event_type = 'estimate_nodes_reordered'`, non-null `workspace_id`, `project_id` matching project. |
| Nesting | `tests/vitest/estimate-node-reorder-action.test.ts` | T-RC0-3: nesting drop (parentId non-null) succeeds end-to-end; error string "Estimate history event workspace could not be resolved." does NOT fire. |
| Defensive | D1 adapter/local-provider harness | T-RC0-4: missing, empty, or unknown `target_project_id` fails cleanly before history insert. Do not model a valid project without a workspace. |

## Existing Coverage To Preserve

| Area | Existing coverage |
| --- | --- |
| Context menu CRUD basics | `tests/vitest/estimate-tree-context-menu.test.tsx` covers right-click/keyboard open, Add area, Save as template, Rename, Move inside, Delete, portaling, and selection preservation. |
| Rename lifecycle | `tests/vitest/estimate-tree-context-menu.test.tsx` covers focus, cancel, confirm, blur, empty-name validation, server error, rollback. |
| Single delete | `tests/vitest/estimate-tree-context-menu.test.tsx` covers modal, optimistic removal, route repair, Undo success, and delete failure rollback. |
| Bulk selection/delete | `tests/vitest/estimate-tree-bulk-selection.test.tsx` covers parent/descendant selection, indeterminate state, optimistic delete, restore success, dedupe. |
| Pointer DnD optimism | `tests/vitest/estimate-sheet-tree-dnd.test.tsx` covers optimistic success, rollback, stale completion, row-edit preservation, no route refresh. |
| Search/filter | `tests/vitest/estimate-tree-filter.test.tsx` covers toolbar search/filter and pruning. |
| Lazy hydration | `tests/vitest/estimate-tree-lazy-hydration-ui.test.tsx` and lazy subtree tests cover loading/hydration paths. |

## Phase 1+ Tests To Add

| Area | File | New coverage |
| --- | --- | --- |
| Pure planner | `tests/vitest/estimate-tree-reorder.test.ts` | Characterization: non-empty branch before/after/root moves preserve descendants. |
| Merge | `tests/vitest/estimate-tree-reorder.test.ts` | Expected RED: confirmed `sortOrder` adopted, cached row content preserved. |
| DOM DnD | `tests/vitest/estimate-sheet-tree-dom.test.tsx` | Characterization or RED: non-root branch reorder with explicit row rects and descendant order. |
| Optimistic UI | `tests/vitest/estimate-sheet-tree-dnd.test.tsx` | Characterization or RED: non-empty branch success and rollback. |
| Move dialog | `tests/vitest/estimate-tree-context-menu.test.tsx` | Expected RED: before/inside/after/root placement and focus return. |
| Action | `tests/vitest/estimate-node-reorder-action.test.ts` | Expected RED: projected-tree cycle rejection (RC5 residual); characterization for sparse branch reparent and root move with `targetTabId`. |
| Shared tree | `tests/vitest/ui-tree.test.tsx` | EstimateSheetTree handle-only activation, shared Tree default row-drag compatibility, clearer drop state classes, invalid target state. |
| Perf | `tests/vitest/estimate-tree-drag-over-perf.test.ts` | Nested 5k-node hover sample if traversal changes. |
| Disabled reasons | `tests/vitest/estimate-tree-context-menu.test.tsx` and DOM tests | Expected RED: context-menu and Move dialog disabled reasons are reachable by keyboard/screen reader, not title-only or skipped disabled radios. |
| Search reorder gate | `tests/vitest/estimate-sheet-tree-dom.test.tsx` or context-menu tests | Search active blocks drag/drop and Move, with visible/reachable reason. |
| Optimistic create gate | `tests/vitest/estimate-sheet-tree-dnd.test.tsx` | Drops touching optimistic node ids do not persist and announce/reveal retry reason. |
| Permission UI | `tests/vitest/estimate-sheet-tree-dom.test.tsx` plus existing authz tests | Viewer/read-only mode cannot see enabled create/rename/move/delete/bulk controls, or server-only enforcement is explicitly accepted. |
| Restore failures | `tests/vitest/estimate-tree-context-menu.test.tsx`, `tests/vitest/estimate-tree-bulk-selection.test.tsx`, D1 adapter tests | Single and bulk restore failure keeps deleted UI state and reports error; D1 provider restore is proven or deferred. |
| Empty search/filter | `tests/vitest/estimate-tree-filter.test.tsx` | No-match copy differs from true "No areas yet" empty tree. |
| External drops | `tests/vitest/estimate-sheet-tree-dom.test.tsx` | Template/project/row item external drops remain inside-only and still dispatch domain events after move-dialog changes. |

## Adversarial Scenarios

- **Move branch with descendants before first sibling** (must succeed post-Phase-0).
- **Move branch with descendants after last sibling** (must succeed post-Phase-0).
- **Move branch from root into another branch** (must succeed post-Phase-0 — the user's reported case).
- **Move branch back to root bottom** (must succeed post-Phase-0).
- Drop expanded folder bottom band. Indicator must match actual insertion before first child.
- Drop collapsed folder bottom band. It should remain after sibling.
- Reject self and descendant cycle in pure planner, DOM layer, action wrapper, and D1 adapter/provider layer (RC5 residual — Phase 3).
- Branch reorder while server action pending, followed by local add/rename edit.
- Failed branch reorder rolls back tree and query cache without route refresh.
- Search active, inline rename active, saving active, or optimistic node present: drag/drop does not persist and gives a reason.
- Cross-tab branch reparenting rejected server-side.
- Context menu opened during rename/saving/search/pending create: disabled actions expose reasons.
- Delete and bulk delete Undo success remains covered; restore failure and D1 provider support are separate proofs.
- External template/project/row drops do not accidentally gain before/after/root reorder semantics.

## Browser Proof Position

Vitest DOM proof is sufficient for planner, payload, cache, focus, aria, and most class-state changes.

Use browser/Playwright only if the implementation changes visual geometry in a way DOM tests cannot prove, such as exact insertion line placement under virtualization and real scrolling.

For Phase 0 specifically: a manual smoke (drag any area, confirm success) is sufficient after tests. No browser automation required because the claim is persistence success, not visual geometry.
