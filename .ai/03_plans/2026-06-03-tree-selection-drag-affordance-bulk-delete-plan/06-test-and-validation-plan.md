# Test and Validation Plan

This document defines the exact test plan, including existing tests to preserve, new tests to add, manual QA scenarios, and validation commands.

## 1. Existing Tests to Preserve

The following existing tests must continue to pass without modification:
- `tests/vitest/workspace-repository-estimate-tree.test.ts`
- `tests/vitest/component-library-manager-ui.test.tsx`
- `tests/vitest/project-estimates-table.test.tsx`

## 2. New Unit and DOM Tests (Vitest)

| Test File | Coverage |
|---|---|
| `tests/vitest/workshop-tree-row-affordances.test.tsx` | Phase 1: Render with `dragHandleSlot` and `leadingSlot`. Verify layout structure. Verify `event.stopPropagation()` on checkbox click/keydown. Verify hover visibility of drag handle. Verify `as="div"` is forced when slots are present. Verify existing props (`selected`, `editing`, `intent`) still work. |
| `tests/vitest/estimate-tree-bulk-selection.test.tsx` | Phase 2: Checkbox select/deselect. Cascade selection to descendants. Indeterminate parent state. "Select visible" with active search filter. "Clear selection". Bulk delete confirmation modal rendering. Server action mock validation. Route fallback after active node deletion. |
| `tests/vitest/library-folder-tree-selection.test.tsx` | Phase 3: Drag handle visibility on folders. Folder checkbox selection. Synthetic root (`ALL_COMPONENTS_FOLDER_ID`) protection (unselectable, undraggable). Bulk folder delete mock. |
| `tests/vitest/project-estimates-table-bulk-delete.test.tsx` | Phase 4: Header select-all checkbox. Indeterminate state. Bulk toolbar visibility. Single-row delete wiring. Bulk delete server action mock. Post-delete table refresh and selection clear. |
| `tests/vitest/projects-page-bulk-delete.test.tsx` | Phase 5: Card checkbox overlay rendering. Selection state management. Bulk toolbar visibility. Typed confirmation modal ("DELETE PROJECTS"). Server action validation (workspace scoping). Disabled states for shared/pending projects. Post-delete refresh. |
| `tests/vitest/component-library-bulk-archive.test.tsx` | Phase 6: Component catalogue card selection. Archive toolbar visibility. Archive confirmation modal. Server action mock. Post-archive lifecycle state update. |
| `tests/vitest/component-library-bulk-delete.test.tsx` | Phase 6: Admin-only gate for hard delete. Zero-reference check mock. Typed confirmation modal ("DELETE COMPONENTS"). Server action mock. |
| `tests/vitest/bulk-delete-server-actions.test.ts` | Phases 2-6: Ownership/permission validation mocks. Workspace scoping validation. FK cascade verification mocks. Storage cleanup path validation mocks. Error rollback behavior. |

## 3. New Playwright E2E Scenarios

| Scenario | Description |
|---|---|
| `e2e/estimate-tree-bulk-select.spec.ts` | Navigate to estimate tree. Hover to reveal drag handles. Click 3 checkboxes. Verify bulk toolbar appears. Click "Delete selected". Verify typed confirmation is required. Verify deletion and route fallback. |
| `e2e/project-estimates-bulk-delete.spec.ts` | Navigate to project estimates table. Click header select-all. Verify indeterminate state if filtered. Click "Delete selected". Verify typed confirmation. Verify table refresh and empty state if all deleted. |
| `e2e/projects-page-bulk-delete.spec.ts` | Navigate to projects page. Hover over owned project card to reveal checkbox. Click checkbox. Verify shared project checkbox is disabled with tooltip. Click "Delete projects". Verify typed confirmation. Verify redirect to `/workshop/projects`. |
| `e2e/component-library-bulk-archive.spec.ts` | Navigate to component library. Select 2 component cards. Click "Archive selected". Verify confirmation. Verify cards show "archived" badge post-action. |

## 4. Manual QA Matrix

| Surface | Scenario | Expected Result |
|---|---|---|
| Estimate Tree | Click checkbox on a group node. | Group and all descendants are checked. Parent shows indeterminate if partially selected. |
| Estimate Tree | Click drag handle and drag. | Row drags. Checkbox state does not change. Row click does not trigger. |
| Estimate Tree | Right-click a node while bulk selected. | Context menu (Rename, Delete) still opens and functions normally. |
| Estimate Sheet Table | Filter table, click header select-all. | Only visible, filtered rows are selected. |
| Projects Page | Select a shared project. | Checkbox is disabled. Tooltip explains why. Bulk delete button is disabled if only shared projects are selected. |
| Component Library | Attempt to hard delete a referenced component. | Server rejects with "Component is referenced in active estimates." UI shows error toast. |
| All Surfaces | Trigger bulk delete, simulate network failure. | UI reverts to pre-mutation state. Error toast is shown. Selection is preserved for retry. |
| All Surfaces | Close confirmation modal via Escape or backdrop click. | Modal closes. Focus returns to the trigger button. Selection state is preserved. |

## 5. Commands to Run

### After Each Phase
```bash
bun run type-check
bun run lint
bun run lint:design-system
bun run validate
bunx vitest run tests/vitest/<phase-specific-test>.test.tsx --maxWorkers=1
```

### Final Validation Command List
```bash
bun run type-check
bun run lint
bun run lint:design-system
bun run validate
bun run build
bunx vitest run
bunx playwright test
git diff --check
```