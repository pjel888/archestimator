# Implementation Sequence

Related but separate workstream. This plan does not supersede, replace, or modify `.ai/03_plans/2026-06-03-mass-deletion-projects-estimate-sheets-library-components.md`.

This sequence is for a future implementation agent. It is intentionally low-risk, phase-gated, and test-first. Do not combine all phases into one broad PR unless the user explicitly requests it.

## Phase 1 -- Shared Row Affordance Contract

### Goal

Harden the existing shared row slot/affordance system before individual surfaces depend on it.

### Files to change later

- `src/components/workshop/workshop-tree.tsx`
- `src/components/workshop/tree-row-affordances.tsx`
- `tests/vitest/workshop-tree-row-affordances.test.tsx`

### Files to read before changing

- `src/components/workshop/EstimateSheetTree.tsx`
- `src/components/workshop/component-library-manager/LibraryFolderTree.tsx`
- `src/components/workshop/component-library/tree/LibraryFolderRow.tsx`
- `src/components/workshop/component-library/tree/LibraryItemRow.tsx`
- `DESIGN.md`
- `scripts/enforce-app-design-system.mjs`

### Required implementation steps

1. Add regression tests for `WorkshopTreeRow` with `selectionSlot`/`dragHandleSlot` rendering as non-button markup.
2. Ensure button-only props are not passed to a forced `div`.
3. Make `TreeDragHandle` decorative under current RCT row-level drag unless true handle-only drag is proven.
4. Add `role="toolbar"` and accessible labels to `TreeBulkActionBar`.
5. Harden `TreeSelectionCheckbox` event isolation for click and key propagation while preserving native Space toggling.
6. Add focus-return expectations for bulk toolbar/modal invokers.

### Acceptance criteria

- No nested native button/checkbox/button-invalid markup.
- Row click, context menu, RCT props, and checkbox events can coexist.
- Bulk toolbar has accessible toolbar semantics.
- Design-system lint passes.

### Required tests

- `tests/vitest/workshop-tree-row-affordances.test.tsx`

### Validation commands

```bash
bunx vitest run tests/vitest/workshop-tree-row-affordances.test.tsx --maxWorkers=1
bun run lint:design-system
```

### Rollback plan

Revert only row-affordance changes and test file. No data changes in this phase.

### Risks

- RCT props may assume a specific element shape. Keep RCT consumers under test before merging.

## Phase 2 -- Shared Selection Utilities

### Goal

Add pure, tested selection utilities used by tree/table/card/catalogue surfaces.

### Files to change later

- `src/lib/bulk-selection/tree-selection.ts`
- `tests/unit/tree-selection.test.ts`
- Optional barrel export if the repo already has a local pattern.

### Files to read before changing

- `src/lib/estimates/estimate-tree-edit.ts`
- `src/lib/estimates/tree-hierarchy.ts`
- `src/components/workshop/component-library-manager/library-folder-tree-shared.ts`

### Required implementation steps

1. Implement `getVisibleTreeItemIds`, `getDescendantIds`, `getSelectableDescendantIds`.
2. Implement `toggleTreeSelection`, `toggleCascadeSelection`, `getTriStateForNode`.
3. Implement `filterSelectableIds`, `formatBulkSelectionCount`, `buildBulkDeletePreview`.
4. Implement `clearInvalidSelectionsAfterRefresh`.
5. Test disabled/protected rows and visible-only selection.

### Acceptance criteria

- Utilities are pure and framework-independent.
- Parent indeterminate behavior is deterministic.
- Select-visible never includes hidden or disabled IDs.

### Required tests

- `tests/unit/tree-selection.test.ts`

### Validation commands

```bash
bunx vitest run tests/unit/tree-selection.test.ts --maxWorkers=1
```

### Rollback plan

Remove new utility file and tests.

### Risks

- Utility shape may overfit estimate trees. Keep inputs generic and pass surface-specific rules.

## Phase 3 -- Estimate Tree Visible Drag Handle and Checkbox Selection

### Goal

Add visible drag affordance and independent checkbox selection to estimate tree rows without changing delete behavior yet.

### Files to change later

- `src/components/workshop/EstimateSheetTree.tsx`
- `src/components/workshop/tree-row-affordances.tsx`
- `tests/vitest/estimate-tree-bulk-selection.test.tsx`
- `tests/vitest/estimate-sheet-tree-dnd.test.tsx`
- `tests/vitest/estimate-sheet-tree-rct-dom.test.tsx`
- `tests/vitest/estimate-tree-context-menu.test.tsx`

### Files to read before changing

- `src/hooks/use-estimate-query.ts`
- `src/hooks/use-estimate-workspace-state.ts`
- `src/stores/estimate-ui-store.ts`
- `src/lib/estimates/estimate-tree-reorder.ts`

### Required implementation steps

1. Add local `bulkSelectedNodeIds`.
2. Render `TreeSelectionCheckbox` and `TreeDragHandle` through `WorkshopTreeRow` slots.
3. Keep RCT `selectedItems`/`focusedItem` untouched.
4. Add cascade selection using shared utilities.
5. Add stale selection cleanup after tree refresh.
6. Verify right-click rename/delete and left-click navigation still work.

### Acceptance criteria

- Checkbox click/key does not navigate, expand/collapse, open context menu, or start drag.
- Existing drag/drop reorder tests still pass.
- Active route row and checked row are visually distinct.

### Required tests

- `tests/vitest/estimate-tree-bulk-selection.test.tsx`
- Existing estimate tree DnD/context tests.

### Validation commands

```bash
bunx vitest run tests/vitest/estimate-tree-bulk-selection.test.tsx tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-tree-context-menu.test.tsx --maxWorkers=1
```

### Rollback plan

Remove estimate tree slot usage and local bulk state; keep shared primitives if Phase 1 is already committed.

### Risks

- RCT row focus and route selection could visually conflict with checked rows. Snapshot/DOM assertions must cover both states.

## Phase 4 -- Estimate Tree Bulk Delete

### Goal

Add server-side bulk delete for estimate nodes with preview, history, fallback, and rollback/safe refresh.

### Files to change later

- `src/lib/estimates/actions.ts`
- `src/lib/estimates/estimate-tree-edit.ts`
- Possible migration/RPC file only after explicit implementation approval.
- `src/components/workshop/EstimateSheetTree.tsx`
- `tests/vitest/estimate-tree-bulk-selection.test.tsx`
- `tests/vitest/bulk-delete-server-actions.test.ts`

### Files to read before changing

- `src/lib/estimates/estimate-tree-reorder.ts`
- `src/lib/estimates/tree-hierarchy.ts`
- `src/lib/repositories/estimate-repository.ts`
- `supabase/migrations/*estimate*history*.sql`
- `src/lib/supabase/types.ts`

### Required implementation steps

1. Add server-side preview/dedupe helpers or extend existing delete planning.
2. Add `deleteEstimateNodesBulk` action and RPC if history cannot be safely handled in plain action code.
3. Recompute descendants server-side.
4. Return `deletedNodeIds`, `deletedRowItemCount`, `fallbackNodeId`, and refreshed tree.
5. Add modal preview and confirmation.
6. Add optimistic delete with rollback or safe refresh.

### Acceptance criteria

- No client loop over `deleteEstimateNode`.
- Parent/child duplicate selections delete once.
- History/audit path remains coherent.
- Active deleted route falls back safely.

### Required tests

- Server action tests for validation/permission/dedupe/fallback.
- DOM tests for modal confirm/cancel/failure.

### Validation commands

```bash
bunx vitest run tests/vitest/estimate-tree-bulk-selection.test.tsx tests/vitest/bulk-delete-server-actions.test.ts --maxWorkers=1
```

### Rollback plan

Disable bulk delete UI and revert action/RPC changes as one unit. Preserve Phase 3 selection UI if stable.

### Risks

- History RPC design may require migration. Stop and update plan if implementation evidence contradicts this contract.

## Phase 5 -- Library Folder Tree Visible Drag Handle and Selection

### Goal

Apply the shared tree affordance and selection model to library folders while preserving reorder and single-folder delete-lift behavior.

### Files to change later

- `src/components/workshop/component-library-manager/LibraryFolderTree.tsx`
- `src/components/workshop/component-library-manager/library-folder-tree-shared.ts`
- `src/lib/component-library/library-folder-reorder.ts`
- `src/lib/component-library/actions.ts`
- `tests/vitest/library-folder-tree-selection.test.tsx`
- `tests/vitest/library-folder-reorder.test.ts`

### Files to read before changing

- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`
- `src/lib/repositories/component-library-repository.ts`

### Required implementation steps

1. Add local `bulkSelectedFolderIds`.
2. Render selection checkbox and visual handle for real folders.
3. Filter out `ALL_COMPONENTS_FOLDER_ID`.
4. Add bulk folder delete action only if needed by the UX phase; preserve lift/unassign semantics.
5. Add route/filter fallback to parent or all-components.

### Acceptance criteria

- Synthetic root cannot be selected, dragged, or deleted.
- Folder reorder behavior is unchanged.
- Bulk folder delete does not delete components.

### Required tests

- `tests/vitest/library-folder-tree-selection.test.tsx`
- `tests/vitest/library-folder-reorder.test.ts`

### Validation commands

```bash
bunx vitest run tests/vitest/library-folder-tree-selection.test.tsx tests/vitest/library-folder-reorder.test.ts --maxWorkers=1
```

### Rollback plan

Remove library folder bulk state/slots and action wiring.

### Risks

- Bulk selecting descendants while folder tree is filtered could select hidden IDs. Use visible/selectable utility rules.

## Phase 6 -- Estimate Sheets Select-All and Bulk Delete

### Goal

Complete estimate sheet table row/header selection and add server-side bulk sheet delete.

### Files to change later

- `src/components/workshop/ProjectEstimatesTable.tsx`
- `src/components/workshop/ProjectEstimatesClient.tsx`
- `src/lib/estimates/actions.ts`
- `tests/vitest/project-estimates-table-bulk-delete.test.tsx`
- `tests/vitest/project-estimates-table-inline-edit.test.tsx`
- `tests/vitest/project-estimates-client-create.test.tsx`
- Optional `e2e/project-estimates-bulk-delete.spec.ts`

### Files to read before changing

- `src/lib/repositories/estimate-repository.ts`
- `src/lib/repositories/workspace-repository.ts`
- estimate/collaboration migrations and generated types.

### Required implementation steps

1. Extend existing `selectedEstimateIds` state.
2. Add header select-visible checkbox with indeterminate state.
3. Add bulk toolbar and typed confirmation modal.
4. Implement `deleteEstimateSheetsBulk`.
5. Route away from deleted active estimate if needed.
6. Revalidate project estimate list.

### Acceptance criteria

- Select-visible targets filtered rows only.
- Checkbox clicks do not open/edit rows.
- Delete is server-side and all-or-nothing by default.

### Required tests

- `tests/vitest/project-estimates-table-bulk-delete.test.tsx`
- Server action tests.

### Validation commands

```bash
bunx vitest run tests/vitest/project-estimates-table-bulk-delete.test.tsx tests/vitest/project-estimates-table-inline-edit.test.tsx tests/vitest/project-estimates-client-create.test.tsx --maxWorkers=1
```

### Rollback plan

Re-disable delete UI and remove bulk action wiring.

### Risks

- Existing inline edit interactions can conflict with row checkbox events. Preserve inline edit tests.

## Phase 7 -- Projects Card Selection and Bulk Delete

### Goal

Add project card selection and safe typed-confirm bulk project delete for editable owned projects.

### Files to change later

- `src/components/workshop/projects-page-client.tsx`
- `src/components/workshop/LiveProjectCard.tsx`
- `src/lib/projects/actions.ts`
- project-related repository helpers if needed.
- `tests/vitest/projects-page-bulk-delete.test.tsx`
- `tests/vitest/projects-page-shared-access.test.tsx`
- Optional `e2e/projects-page-bulk-delete.spec.ts`

### Files to read before changing

- `src/components/workshop/ProjectCard.tsx`
- `src/components/workshop/ProjectDetailsModal.tsx`
- `src/lib/workshop/actions.ts`
- project/collaboration/publication/shared-link migrations.

### Required implementation steps

1. Add `selectedProjectIds` in page client.
2. Add selection checkbox to `LiveProjectCard`, not inside a full-card `Link`.
3. Disable selection for shared/sheet-only/pending/non-editable projects.
4. Implement `deleteProjectsBulk` with workspace/project permission validation.
5. Add typed `DELETE PROJECTS` modal and project image storage cleanup.
6. Route to `/workshop/projects` after deleting active/current project.

### Acceptance criteria

- Non-editable cards cannot be selected.
- Typed confirmation required.
- Storage cleanup validates paths.
- Shared/publication/collaboration dependencies follow audited cascades or set-null rules.

### Required tests

- `tests/vitest/projects-page-bulk-delete.test.tsx`
- `tests/vitest/projects-page-shared-access.test.tsx`
- server action tests.

### Validation commands

```bash
bunx vitest run tests/vitest/projects-page-bulk-delete.test.tsx tests/vitest/projects-page-shared-access.test.tsx tests/vitest/bulk-delete-server-actions.test.ts --maxWorkers=1
```

### Rollback plan

Remove project bulk toolbar/UI and keep existing single project flows.

### Risks

- Project delete has the broadest dependency surface. Keep this phase isolated and review schema/RLS immediately before coding.

## Phase 8 -- Component Catalogue Selection and Archive/Delete

### Goal

Add component catalogue selection with archive-first behavior and hard-delete zero-reference gate.

### Files to change later

- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`
- `src/components/workshop/component-library/ComponentCard.tsx` if the existing pattern is reused.
- `src/lib/component-library/actions.ts`
- `src/lib/repositories/component-library-repository.ts`
- `tests/vitest/component-library-bulk-archive.test.tsx`
- `tests/vitest/component-library-bulk-delete.test.tsx`
- `tests/vitest/component-library-manager-ui.test.tsx`
- Optional `e2e/component-library-bulk-archive.spec.ts`

### Files to read before changing

- component library migrations and generated types.
- `src/lib/component-library/taxonomy.ts`
- `src/app/workshop/library/page.tsx`

### Required implementation steps

1. Add `selectedComponentIds` in `ComponentLibraryManager`.
2. Reuse the existing component card `bulkSelected` pattern where possible.
3. Add archive toolbar and confirmation.
4. Implement `archiveCostLibraryComponentsBulk`.
5. Add hard-delete UI only behind zero-reference preview and permission.
6. Validate storage cleanup for component image/thumb/attachment paths.

### Acceptance criteria

- Archive is default.
- Referenced components cannot be hard-deleted.
- Zero-reference hard delete is server-validated.
- Catalogue refresh clears/prunes stale selections.

### Required tests

- `tests/vitest/component-library-bulk-archive.test.tsx`
- `tests/vitest/component-library-bulk-delete.test.tsx`
- Existing component library manager tests.

### Validation commands

```bash
bunx vitest run tests/vitest/component-library-bulk-archive.test.tsx tests/vitest/component-library-bulk-delete.test.tsx tests/vitest/component-library-manager-ui.test.tsx --maxWorkers=1
```

### Rollback plan

Remove hard-delete UI first; archive selection can remain if stable.

### Risks

- FK `SET NULL` allows hard delete but product traceability does not. Zero-reference gate is mandatory.

## Phase 9 -- Cross-Surface Polish and Accessibility

### Goal

Make the interaction system consistent, accessible, and design-system compliant across all surfaces.

### Files to change later

- Shared UI primitives touched in prior phases.
- `src/components/ui/modal.tsx` only if a shared modal focus contract is needed.
- Surface files from Phases 3-8.
- `tests/vitest/*bulk*.test.tsx`
- Playwright specs added by prior phases.

### Files to read before changing

- `src/components/ui/button.tsx`
- `src/components/ui/modal.tsx`
- `src/components/ui/toast.tsx`
- `src/components/ui/context-menu.tsx`
- `src/components/ui/action-menu.tsx`
- `src/components/ui/header-icon-toolbar.tsx`
- `src/components/ui/search-input.tsx`
- `DESIGN.md`

### Required implementation steps

1. Audit focus return for every modal.
2. Audit keyboard path for selection, clear, cancel, confirm.
3. Verify ARIA semantics for toolbar, dialog, checked, mixed, disabled, and active route.
4. Normalize copy and count labels.
5. Run design-system lint and fix violations.

### Acceptance criteria

- No inaccessible destructive flow.
- No visible overlap or layout shift in bulk bars.
- Active route and checked state remain visually distinct.

### Required tests

- Existing and new DOM tests from earlier phases.
- Manual accessibility QA matrix in `06-test-and-validation-plan.md`.

### Validation commands

```bash
bun run lint:design-system
bun run test:dom
```

### Rollback plan

Revert polish changes per surface; do not remove tested server contracts unless necessary.

### Risks

- Shared modal changes can affect unrelated flows. Prefer local modal wrappers unless shared changes are clearly needed.

## Phase 10 -- Final Validation and Release Checklist

### Goal

Prove the feature is safe to ship and produce an evidence-backed final report.

### Files to change later

- No new feature files unless validation finds defects.
- Update relevant `.ai/10_state` or roadmap docs only if the user asks for implementation-state sync.

### Files to read before changing

- `package.json`
- All files changed in prior phases.
- `06-test-and-validation-plan.md`
- `10-final-planning-report-template.md`

### Required implementation steps

1. Run focused tests from each phase.
2. Run full validation: typecheck, lint, design-system lint, tests, DOM tests, build.
3. Run Playwright e2e where environment allows.
4. Confirm no unexpected runtime errors.
5. Confirm database/storage destructive operations were tested against safe fixtures only.
6. Commit coherent milestone(s) using repo commit rules unless user gives an exact message.
7. Produce final report using `10-final-planning-report-template.md`.

### Acceptance criteria

- All required tests pass or every skipped command has a concrete environment reason.
- No known data-safety gap remains unreported.
- Feature behavior matches this package or the package was updated where implementation evidence contradicted it.

### Required tests

- All tests added in prior phases.
- Existing regression anchors listed in `06-test-and-validation-plan.md`.

### Validation commands

```bash
bun run type-check
bun run lint
bun run lint:design-system
bun run test
bun run test:dom
bun run validate
bun run build
bun run test:e2e
git diff --check
```

### Rollback plan

Use milestone commits to revert one phase at a time. For destructive server actions/RPCs, rollback requires disabling UI entry points before reverting data contracts.

### Risks

- Playwright and linked Supabase tests may require env vars. Report skipped proof explicitly; do not claim unrun proof.
