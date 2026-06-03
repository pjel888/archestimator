# Implementation Sequence

This document defines the step-by-step implementation phases with file-by-file instructions, dependencies, acceptance criteria, and rollback strategies.

## Phase 1 — Shared UX Contract (WorkshopTreeRow Extension)

### Goal
Extend `WorkshopTreeRow` to support unindented drag handles and leading checkboxes without breaking existing consumers or creating invalid HTML.

### Files to change
- `src/components/workshop/workshop-tree.tsx`
- `src/components/workshop/tree-visual-style.ts` (no changes, just reuse)
- `src/components/workshop/tree-row-affordances.tsx` (new)

### Required implementation steps
1. Create `src/components/workshop/tree-row-affordances.tsx` with `TreeDragHandle`, `TreeSelectionCheckbox`, `TreeBulkActionBar`, and utility functions (`getTriStateForNode`, `toggleCascadeSelection`, etc.).
2. Update `WorkshopTreeRowProps` to include `dragHandleSlot?: ReactNode`, `leadingSlot?: ReactNode`, and `selectionMode?: boolean`.
3. Modify `WorkshopTreeRow` render logic: if `dragHandleSlot` or `leadingSlot` is present, force `as="div"`.
4. Restructure `WorkshopTreeRow` layout: outer flex container with a shrink-0 left zone (for `dragHandleSlot`) and an indented inner flex container (for `leadingSlot` and `children`).
5. Ensure `TreeSelectionCheckbox` applies `event.stopPropagation()` on click and keydown.

### Acceptance criteria
- `WorkshopTreeRow` renders correctly with and without new slots.
- Drag handle is unindented; checkbox is indented.
- Checkbox click does not trigger row `onClick` or RCT drag.
- Existing `as="button"` behavior is preserved when no slots are provided.

### Tests
- `tests/vitest/workshop-tree-row-affordances.test.tsx`: Render with slots, verify layout, verify event propagation stops on checkbox, verify hover visibility, verify disabled states, verify backward compatibility.

### Rollback plan
- Revert `WorkshopTreeRow` to previous version. Remove `tree-row-affordances.tsx`.

### Risks
- **Invalid HTML:** Mitigated by forcing `as="div"` when interactive slots are present.
- **RCT Drag Breakage:** Mitigated by keeping RCT handlers on the row wrapper and using the drag handle as a visual-only affordance.

---

## Phase 2 — Estimate Tree: Drag Handles + Checkbox Selection + Bulk Delete

### Goal
Add visible drag handles, checkbox multi-selection, and bulk delete to the estimate tree.

### Files to change
- `src/components/workshop/EstimateSheetTree.tsx`
- `src/components/workshop/tree-row-affordances.tsx`
- `src/lib/estimates/actions.ts`
- `src/lib/estimates/estimate-tree-edit.ts` (reuse existing)

### Required implementation steps
1. In `EstimateSheetTree.tsx`, add `bulkSelectedNodeIds: Set<string>` state.
2. In `renderItem`, add `TreeDragHandle` to the `dragHandleSlot` and `TreeSelectionCheckbox` to the `leadingSlot` of `WorkshopTreeRow`.
3. Wire checkbox `onChange` to `toggleCascadeSelection` for parent nodes.
4. Add "Select visible" and "Clear selection" controls above the tree.
5. Add `TreeBulkActionBar` above the tree, visible when `bulkSelectedNodeIds.size > 0`.
6. Implement confirmation modal showing descendant impact counts (use `buildBulkDeletePreview`).
7. Create `deleteEstimateNodesBulk` server action in `src/lib/estimates/actions.ts` that calls a history-preserving RPC or loops single-node deletes.
8. Handle route selection fallback after bulk delete using existing `planEstimateTreeDelete` logic.

### Acceptance criteria
- Drag handle is visible on hover/focus for all nodes.
- Checkbox selects/deselects nodes, with indeterminate parent state.
- Bulk toolbar appears and shows correct count.
- Bulk delete shows accurate descendant preview and successfully deletes nodes.
- Route redirects to `fallbackNodeId` if active node was deleted.
- Right-click rename/delete and existing drag/drop reorder still work.

### Tests
- `tests/vitest/estimate-tree-bulk-selection.test.tsx`: Checkbox select/deselect, cascade descendants, indeterminate parent, select visible, clear selection, bulk delete confirmation modal, server action validation, route fallback.

### Rollback plan
- Remove bulk selection state and UI from `EstimateSheetTree`. Revert server action.

### Risks
- **Performance on large trees:** Mitigated by using `Set` for selection state and limiting cascade computation to visible/selected nodes.

---

## Phase 3 — Library Folder/Component Trees: Drag Handles + Checkbox Selection

### Goal
Add visible drag handles and checkbox selection to library folder trees.

### Files to change
- `src/components/workshop/component-library-manager/LibraryFolderTree.tsx`
- `src/components/workshop/component-library/tree/LibraryFolderRow.tsx`
- `src/components/workshop/component-library/tree/LibraryItemRow.tsx`

### Required implementation steps
1. In `LibraryFolderTree.tsx`, add `bulkSelectedFolderIds: Set<string>` state.
2. In `renderItem` for folders, add `TreeDragHandle` to `dragHandleSlot` and `TreeSelectionCheckbox` to `leadingSlot`.
3. Ensure `ALL_COMPONENTS_FOLDER_ID` is excluded from selection and drag (already `canMove: false`).
4. Wire checkbox to toggle selection.
5. Add bulk delete confirmation modal for folders.

### Acceptance criteria
- Drag handle visible on folder rows (not synthetic root).
- Checkbox selects folders. Synthetic root is unselectable.
- Bulk delete works and lifts children correctly (handled by existing `deleteLibraryFolder` logic).

### Tests
- `tests/vitest/library-folder-tree-selection.test.tsx`: Drag handle visibility, folder checkbox selection, synthetic root protection, bulk folder delete.

### Rollback plan
- Remove selection state and UI from `LibraryFolderTree`.

### Risks
- **Synthetic root deletion:** Mitigated by explicit UI and server-side checks rejecting deletion of `ALL_COMPONENTS_FOLDER_ID`.

---

## Phase 4 — Estimate Sheets Table: Select-All + Bulk Delete

### Goal
Add header select-all checkbox and bulk delete to the project estimates table.

### Files to change
- `src/components/workshop/ProjectEstimatesTable.tsx`
- `src/components/workshop/ProjectEstimatesClient.tsx`
- `src/lib/estimates/actions.ts`

### Required implementation steps
1. In `ProjectEstimatesTable.tsx`, update the `row_actions` column header to render a `TreeSelectionCheckbox` with indeterminate state based on `selectedEstimateIds`.
2. Add `TreeBulkActionBar` above the table, visible when `selectedEstimateIds.size > 0`.
3. Wire the existing disabled Trash button in `ProjectEstimateRowActions` to single-row delete (optional, but good for consistency).
4. Create `deleteEstimateSheetsBulk` server action in `src/lib/estimates/actions.ts`.
5. Add typed confirmation modal ("DELETE ESTIMATE SHEETS").
6. On success, clear selection and invalidate React Query cache.

### Acceptance criteria
- Header checkbox selects all visible rows. Indeterminate state works.
- Bulk toolbar appears with correct count.
- Typed confirmation modal works.
- Bulk delete succeeds and refreshes table.

### Tests
- `tests/vitest/project-estimates-table-bulk-delete.test.tsx`: Header select-all, indeterminate, bulk toolbar visibility, confirmation modal, single-row delete, bulk delete, post-delete refresh, selection clear.

### Rollback plan
- Revert table header and remove bulk toolbar. Remove server action.

### Risks
- **Select-all ambiguity:** Clarified in UX spec: "Select visible" only selects currently rendered rows matching filters.

---

## Phase 5 — Projects Page: Card Selection + Bulk Delete

### Goal
Add card checkbox selection and bulk delete to the projects page.

### Files to change
- `src/components/workshop/projects-page-client.tsx`
- `src/components/workshop/LiveProjectCard.tsx`
- `src/lib/projects/actions.ts`

### Required implementation steps
1. In `ProjectsPageClient`, add `selectedProjectIds: Set<string>` state.
2. In `LiveProjectCard`, add a checkbox overlay (top-left corner), visible on hover or when `selectedProjectIds.size > 0`.
3. Add `TreeBulkActionBar` above the project grid.
4. Disable checkbox for shared/pending-invite cards with a tooltip.
5. Create `deleteProjectsBulk` server action in `src/lib/projects/actions.ts` with workspace scoping, permission checks, and non-cascading dependency cleanup.
6. Add typed confirmation modal ("DELETE PROJECTS").
7. On success, clear selection and invalidate React Query cache.

### Acceptance criteria
- Card checkbox overlay works.
- Shared projects have disabled checkboxes.
- Bulk toolbar appears.
- Typed confirmation works.
- Bulk delete succeeds, cleans up dependencies, and refreshes list.

### Tests
- `tests/vitest/projects-page-bulk-delete.test.tsx`: Card checkbox, selection state, bulk toolbar, confirmation modal, server action validation, disabled states for shared projects, post-delete refresh.

### Rollback plan
- Remove selection state and UI from projects page. Revert server action.

### Risks
- **Non-cascading dependency orphaning:** Mitigated by explicit cleanup in `deleteProjectsBulk` server action before deleting the project row.

---

## Phase 6 — Component Library: Bulk Archive/Delete

### Goal
Add checkbox selection and bulk archive/delete to component catalogue cards.

### Files to change
- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`
- `src/lib/component-library/actions.ts`

### Required implementation steps
1. In `ComponentLibraryManager`, add `selectedComponentIds: Set<string>` state.
2. Add checkbox overlay to component catalogue cards.
3. Add `TreeBulkActionBar` with "Archive selected" (primary) and "Delete selected" (admin-only, danger).
4. Create `archiveCostLibraryComponentsBulk` server action (calls `set_cost_library_component_lifecycle_state` in a loop or bulk RPC).
5. Create `deleteCostLibraryComponentsBulk` server action (admin-only, checks zero references via RPC before deleting).
6. Add confirmation modals (standard for archive, typed for hard delete).

### Acceptance criteria
- Card checkbox selection works.
- Bulk archive succeeds and updates lifecycle state.
- Bulk hard delete is gated behind admin check and zero-reference proof.
- Post-action state refreshes correctly.

### Tests
- `tests/vitest/component-library-bulk-archive.test.tsx`: Card selection, archive toolbar, archive confirmation, server action, post-archive state.
- `tests/vitest/component-library-bulk-delete.test.tsx`: Admin gate, zero-reference check, hard delete confirmation, server action.

### Rollback plan
- Remove selection state and UI from component library. Revert server actions.

### Risks
- **Hard delete of referenced components:** Mitigated by strict zero-reference RPC check before allowing hard delete. Archive is the default safe path.

---

## Phase 7 — Polish and Governance

### Goal
Final polish, error handling, and documentation updates.

### Files to change
- Various (toast integrations, error boundaries, `.ai/10_state/current-state.md`)

### Required implementation steps
1. Add status toast messages for success/failure of all bulk operations.
2. Implement error rollback on failed deletions (UI reverts to previous state).
3. Add loading/disabled states on bulk toolbar buttons during server action execution.
4. Ensure focus return after modal close/delete.
5. Update `.ai/10_state/current-state.md` to reflect the new feature status.

### Acceptance criteria
- All bulk operations show appropriate toasts.
- Failed operations revert UI state safely.
- Focus management is correct after modal interactions.
- Documentation is updated.

### Tests
- Manual QA of all edge cases (network failure, stale selection, etc.).

### Rollback plan
- N/A (polish phase).

### Risks
- **Optimistic UI rollback failures:** Mitigated by capturing pre-mutation state and restoring it precisely on server error.