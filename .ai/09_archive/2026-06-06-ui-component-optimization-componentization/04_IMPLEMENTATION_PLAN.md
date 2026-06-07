# Implementation Plan

Date: 2026-06-06

Mode: planning artifact only. Implementation should happen in a fresh feature branch/worktree after this pack is reviewed.

## 2026-06-06 Refinement Addendum

This plan is now phase-gated by `IMPLEMENTATION_MATRIX.md`, `RISK_REGISTER.md`, `OWNER_SIGNOFF.md`, and `MEASUREMENT_BASELINE.md`.

The MVP implementation slice is Phases 0-3 and should be shipped independently:

1. baseline and safety tests;
2. pure tree utilities;
3. headless hooks/shell contracts;
4. read-only share tree unification.

Editable estimate tree and estimate sheet decomposition are not part of the MVP. They require fresh GitNexus impact, Profiler baseline, missing regression tests, and owner smoke approval.

Effort estimates and parallelization notes live in `EFFORT_AND_MVP_SLICING.md`. Dynamic imports and memoization must follow the route-transition plan docs listed in `CROSS_PLAN_REFERENCES.md`.

## Goal

Make Archestimator UI components more reusable and performant, especially tree structures, without changing product behavior or visual language.

## Constraints

- Preserve closed-beta workshop UI style and design-system lint rules.
- Do not add dependencies unless the owner explicitly approves them.
- Do not replace React Complex Tree in editable estimate/library trees in the first pass.
- Use existing utilities and primitives before adding new abstractions.
- Keep changes small, testable, and reversible.
- Before source edits in implementation, run graph impact analysis for touched symbols and run graph change detection before commit.

## Phase 0 - Baseline and Safety Tests

Purpose:

- Lock current behavior before extracting.

Tasks:

1. Capture current file and symbol impact:
   - Run code graph impact/context for `EstimateSheetContent`, `EstimateSheetTree`, `LibraryFolderTree`, `WorkshopTree`, `ShareEstimateTreePanel`, and `ShareEstimateTreeView`.

2. Confirm existing tests:
   - `bun test tests/vitest/workshop-tree-row-affordances.test.tsx`
   - `bun test tests/vitest/library-folder-tree-selection.test.tsx`
   - `bun test tests/vitest/library-folder-reorder.test.ts`
   - `bun test tests/vitest/estimate-tree-bulk-selection.test.tsx`
   - `bun test tests/vitest/share/reconstruct-share-tree.test.ts`
   - `bun test tests/vitest/route-transition-peak-load-profile.test.tsx`

3. Add missing contract tests before refactor:
   - `tests/vitest/tree-core-visible-flatten.test.ts`
   - `tests/vitest/share-estimate-tree-panel.test.tsx`
   - `tests/vitest/share-estimate-tree-row-renderer.test.tsx`

Acceptance:

- Targeted tests pass before refactor or documented fixture gaps are explicit.

## Phase 1 - Shared Pure Tree Utilities

Purpose:

- Extract behavior-neutral tree logic that can support recursive and flat/virtual renderers.

Files to add:

- `src/components/workshop/tree-core/types.ts`
- `src/components/workshop/tree-core/tree-index.ts`
- `src/components/workshop/tree-core/flatten-visible-tree.ts`
- `src/components/workshop/tree-core/filter-tree.ts`
- `src/components/workshop/tree-core/tree-aria.ts`

Tasks:

1. Implement tree adapter types.
2. Implement visible-row flattening from root nodes and expanded ID set.
3. Implement descendant and parent indexes.
4. Implement text filtering that returns matched paths plus ancestors.
5. Implement aria row metadata for dynamic/flat trees.

Tests:

- `tests/vitest/tree-core-visible-flatten.test.ts`
- `tests/vitest/tree-core-filter.test.ts`
- `tests/vitest/tree-core-aria.test.ts`

Acceptance:

- Utilities are pure, domain-neutral, and do not import React.
- Tests cover nested nodes, collapsed branches, repeated labels, empty trees, filtered ancestors, and dynamic row metadata.

## Phase 2 - Shared Tree Hooks and Shells

Purpose:

- Reduce duplicate state and visual shell code while preserving existing render behavior.

Files to add:

- `src/components/workshop/tree-core/use-tree-expansion.ts`
- `src/components/workshop/tree-core/use-tree-selection.ts`
- `src/components/workshop/tree-core/TreeSurfaceShell.tsx`
- `src/components/workshop/tree-core/TreeRowLayout.tsx`

Files to modify:

- `src/components/workshop/workshop-tree.tsx`
- `src/components/workshop/tree-row-affordances.tsx`
- `src/components/workshop/tree-visual-style.ts`

Tasks:

1. Normalize `expandedIds` to a `Set` inside `WorkshopTree`.
2. Keep `WorkshopTreeRow` behavior but move row layout primitives behind `TreeRowLayout` if it reduces duplication.
3. Extract tree search/header/toolbar shell into `TreeSurfaceShell` with slots.
4. Keep drag handle and selection controls as explicit slots.

Tests:

- `tests/vitest/workshop-tree-row-affordances.test.tsx`
- `tests/vitest/tree-surface-shell.test.tsx`

Acceptance:

- No visual drift in shared tree rows.
- Recursive `WorkshopTree` remains available.
- Tree row controls keep their stop-propagation behavior.

## Phase 3 - Share Tree Unification

Purpose:

- Prove the shared tree model in a low-risk read-only area.

Files to add:

- `src/components/share/share-tree/ShareTreeNodeRow.tsx`
- `src/components/share/share-tree/ShareTreeSurface.tsx`
- `src/components/share/share-tree/use-share-tree-expansion.ts`
- `src/components/share/share-tree/use-share-tree-search.ts`
- `src/components/share/share-tree/share-tree-format.ts`

Files to modify:

- `src/components/share/ShareEstimateTreePanel.tsx`
- `src/components/share/ShareEstimateTreeView.tsx`

Tasks:

1. Move duplicated money formatting and node row rendering to `ShareTreeNodeRow`.
2. Move default expansion and expand/collapse all behavior to `useShareTreeExpansion`.
3. Move search/filter behavior to `useShareTreeSearch`.
4. Keep both public surfaces visually unchanged.

Tests:

- `tests/vitest/share-estimate-tree-panel.test.tsx`
- `tests/vitest/share-estimate-tree-view.test.tsx`
- `tests/vitest/share/reconstruct-share-tree.test.ts`

Acceptance:

- Search still includes matched descendants/ancestors.
- Desktop default expansion remains the same.
- Mobile behavior remains the same.
- Panel and full view use one row renderer.

## Phase 4 - Component Library Tree Indexing

Purpose:

- Reduce repeated tree-building and item filtering while preserving component library behavior.

Files to modify:

- `src/components/workshop/component-library/tree/buildLibraryTree.ts`
- `src/lib/component-library/library-folder-reorder.ts`
- `src/components/workshop/component-library-manager/LibraryFolderTree.tsx`

Files to add:

- `src/components/workshop/component-library/tree/library-tree-index.ts`
- `src/components/workshop/component-library-manager/use-library-folder-tree-model.ts`
- `src/components/workshop/component-library-manager/use-library-folder-drop-controller.ts`

Tasks:

1. Group library items by supplier and brand before tree construction.
2. Build category/folder descendant indexes once per data revision.
3. Replace `getLibraryItemsForTreeNode` rebuild path with index-based collection.
4. Extract folder tree model/search/drop controller hooks from `LibraryFolderTree.tsx`.

Tests:

- `tests/vitest/component-library-tree-index.test.ts`
- `tests/vitest/library-folder-reorder.test.ts`
- `tests/vitest/library-folder-tree-selection.test.tsx`

Acceptance:

- Category, supplier, and brand view modes return the same rows as before.
- Folder drag/drop validation remains unchanged.
- Selection pruning remains deterministic after filtering.

## Phase 5 - Estimate Tree Decomposition

Purpose:

- Split the editable estimate tree without changing drag/drop or mutation behavior.

Files to modify:

- `src/components/workshop/EstimateSheetTree.tsx`

Files to add:

- `src/components/workshop/estimate-tree/use-estimate-tree-model.ts`
- `src/components/workshop/estimate-tree/use-estimate-tree-view-state.ts`
- `src/components/workshop/estimate-tree/use-estimate-tree-bulk-selection.ts`
- `src/components/workshop/estimate-tree/use-estimate-tree-drop-plan.ts`
- `src/components/workshop/estimate-tree/use-estimate-tree-mutations.ts`
- `src/components/workshop/estimate-tree/EstimateTreeSurface.tsx`
- `src/components/workshop/estimate-tree/EstimateTreeRootDropZone.tsx`

Tasks:

1. Extract pure model building and selected-node metadata.
2. Extract bulk selection and bulk delete root computation.
3. Extract drag/drop planning and root drop zones.
4. Extract optimistic rename/delete/reorder mutations.
5. Leave React Complex Tree rendering behavior unchanged.

Tests:

- `tests/vitest/estimate-tree-bulk-selection.test.tsx`
- `tests/vitest/estimate-sheet-tree-dnd.test.tsx`
- `tests/vitest/estimate-tree-modal.test.tsx`

Acceptance:

- Rename, delete, bulk delete, reorder, and rollback continue to pass tests.
- No new tree dependency added.
- `EstimateSheetTree.tsx` becomes a composition surface rather than a full behavior owner.

## Phase 6 - Estimate Sheet Content Decomposition

Purpose:

- Split the largest UI file by behavior seams and reduce rerender scope.

Files to modify:

- `src/components/workshop/EstimateSheetContent.tsx`

Files to add:

- `src/components/workshop/estimate-sheet/EstimateRowItemsTable.tsx`
- `src/components/workshop/estimate-sheet/EstimateSheetBranch.tsx`
- `src/components/workshop/estimate-sheet/use-estimate-row-groups.ts`
- `src/components/workshop/estimate-sheet/use-estimate-row-mutations.ts`
- `src/components/workshop/estimate-sheet/activity/ActivityScopeTree.tsx`
- `src/components/workshop/estimate-sheet/activity/ActivityHistoryModal.tsx`
- `src/components/workshop/estimate-sheet/dialogs/RowDetailsDialog.tsx`
- `src/components/workshop/estimate-sheet/dialogs/ProposalPreviewDialog.tsx`

Tasks:

1. Extract `EstimateRowItemsTable` with stable row props and callbacks.
2. Extract `EstimateSheetBranch` with memoized branch props.
3. Extract activity tree and modal.
4. Extract row mutation hook.
5. Keep data ownership and optimistic update semantics unchanged.

Tests:

- `tests/vitest/estimate-sheet-row-table.test.tsx`
- `tests/vitest/estimate-sheet-activity-scope-tree.test.tsx`
- `tests/vitest/estimate-sheet-content-regression.test.tsx`
- `tests/vitest/route-transition-peak-load-profile.test.tsx`

Acceptance:

- Row edit, blur/commit, insert, delete, contingency/discount, and activity behavior remain unchanged.
- Profiler evidence shows smaller rerender scope for row edits and activity modal toggles.

## Phase 7 - Component Library Manager and Modal Split

Purpose:

- Make library UI components reusable without changing classification or versioning behavior.

Files to modify:

- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`
- `src/components/workshop/component-library-manager/AddComponentModal.tsx`

Files to add:

- `src/components/workshop/component-library-manager/catalogue/ComponentCatalogueCard.tsx`
- `src/components/workshop/component-library-manager/catalogue/CatalogueCardGrid.tsx`
- `src/components/workshop/component-library-manager/catalogue/ComponentCatalogueBranch.tsx`
- `src/components/workshop/component-library-manager/add-component/AddComponentIdentitySection.tsx`
- `src/components/workshop/component-library-manager/add-component/AddComponentPricingSection.tsx`
- `src/components/workshop/component-library-manager/add-component/AddComponentClassificationSection.tsx`
- `src/components/workshop/component-library-manager/add-component/use-add-component-form.ts`

Tasks:

1. Extract catalogue card/grid/branch.
2. Extract modal form sections.
3. Keep validation, mutation, and version/history behavior in hooks or repository-level helpers.

Tests:

- `tests/vitest/component-library-manager-ui.test.tsx`
- `tests/vitest/add-component-modal-form.test.tsx`

Acceptance:

- Add Component modal layout remains aligned.
- Catalogue filtering and selection remain unchanged.
- No hidden route behavior changes.

## Phase 8 - Measured Virtualization Decision

Purpose:

- Decide whether to add `@tanstack/react-virtual` after render-scope reduction.

Tasks:

1. Add Profiler harnesses or test helpers for large fixture trees.
2. Measure read-only/share/activity visible-row rendering after Phases 1-6.
3. If visible row count and render duration justify it, propose dependency addition.
4. If approved, implement `VirtualizedTreeRows` for read-only/flat tree surfaces only.

Files to add after approval:

- `src/components/workshop/tree-core/VirtualizedTreeRows.tsx`
- `tests/vitest/tree-core-virtualized-rows.test.tsx`

Acceptance:

- Virtualized rows include WAI-ARIA dynamic metadata.
- Non-virtual recursive renderer remains available.
- No editable React Complex Tree surface is virtualized in this phase.

## Final Verification

Run:

- `bun run type-check`
- `bun run lint:design-system`
- `bun test tests/vitest/tree-core-visible-flatten.test.ts`
- `bun test tests/vitest/tree-core-filter.test.ts`
- `bun test tests/vitest/tree-core-aria.test.ts`
- `bun test tests/vitest/workshop-tree-row-affordances.test.tsx`
- `bun test tests/vitest/library-folder-tree-selection.test.tsx`
- `bun test tests/vitest/library-folder-reorder.test.ts`
- `bun test tests/vitest/estimate-tree-bulk-selection.test.tsx`
- `bun test tests/vitest/estimate-sheet-tree-dnd.test.tsx`
- `bun test tests/vitest/share/reconstruct-share-tree.test.ts`
- `bun test tests/vitest/route-transition-peak-load-profile.test.tsx`
- `git diff --check`

Run browser smoke when fixtures are available:

- `/workshop/library`
- `/workshop/projects/[projectId]/estimates/[nodeId]`
- `/share/[token]`

## Rollback Strategy

- Each phase should be a separate commit.
- Pure utility extraction can be reverted without touching UI.
- Share tree unification is the first UI extraction because it is read-only.
- Editable tree extraction should keep React Complex Tree render output stable.
- Virtualization must be isolated behind a renderer switch so it can be disabled without removing tree-core utilities.
