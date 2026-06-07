# Implementation Matrix

**Status legend:** `NOT STARTED`, `BLOCKED`, `READY FOR FUTURE IMPLEMENTATION`, `DONE`.
All rows are future implementation work. This refinement changed documentation only.

| Phase | Task | Future files to create/modify | Tests | Risk | Status | Validation command | Rollback |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | Baseline and safety gate | No production source changes; docs/evidence only | Existing targeted tests listed below | Low | READY FOR FUTURE IMPLEMENTATION | `git status --short --branch`; `npx gitnexus status`; existing tests | N/A |
| 1 | Pure tree utilities | Create `src/components/workshop/tree-core/` utilities; no React imports | Add `tree-core-visible-flatten`, `tree-core-filter`, `tree-core-aria` tests | Low | READY FOR FUTURE IMPLEMENTATION | New utility tests plus `bun run type-check` | Delete `tree-core/` utility files |
| 2 | Headless hooks and render shell contracts | Add hooks/shells under `tree-core/`; possibly modify `workshop-tree.tsx` only after tests | Add `tree-surface-shell.test.tsx`; update `workshop-tree-row-affordances` if needed | Medium | READY AFTER PHASE 1 | Targeted shell tests; `bun run lint:design-system` | Revert shell/hook commit |
| 3 | Read-only share tree unification | Create `src/components/share/share-tree/`; modify `ShareEstimateTreePanel.tsx`, `ShareEstimateTreeView.tsx` | Add share panel/view/row-renderer tests | Low to Medium | MVP TARGET | Share tests; browser smoke on `/share/[token]` | Revert Phase 3 commit; restore duplicated renderers |
| 4 | Component library tree indexing | Future `component-library-manager/catalogue/` or private helpers; modify `LibraryFolderTree.tsx` | Add `component-library-tree-index.test.ts`; keep existing selection/reorder tests | Medium | NOT STARTED | Library folder tests; AddComponent modal smoke | Revert Phase 4 commit |
| 5 | Estimate tree model extraction | Modify `EstimateSheetTree.tsx`; maybe add `src/components/workshop/estimate-tree/` | Existing DnD/RCT/bulk/context/modal tests plus new model tests | High | OWNER-GATED | All estimate tree tests; browser DnD smoke | Revert Phase 5 commit |
| 6 | Estimate sheet content decomposition | Modify `EstimateSheetContent.tsx`; add `src/components/workshop/estimate-sheet/` pieces | Add row table/activity/content regression tests | Critical | OWNER-GATED | Cost inputs, library insert, proposal preview, route peak-load, new regression tests | Revert Phase 6 commit immediately on mutation regression |
| 7 | Add Component modal decomposition | Modify `AddComponentModal.tsx`; add `component-library-manager/add-component/` | Add modal form tests; keep manager UI tests | Medium | NOT STARTED | Modal and manager tests | Revert Phase 7 commit |
| 8 | Measurement-gated virtualization or no-op closeout | No dependency unless approved; maybe `@tanstack/react-virtual` only with owner approval | Performance profile plus browser smoke | High | BLOCKED ON DATA | Profiler data and row counts; bundle diff | Revert dependency/code; close as not justified |

## Existing Tests Verified On 2026-06-06

8 of 20 referenced tests currently exist:

- `tests/vitest/workshop-tree-row-affordances.test.tsx`
- `tests/vitest/library-folder-tree-selection.test.tsx`
- `tests/vitest/library-folder-reorder.test.ts`
- `tests/vitest/estimate-tree-bulk-selection.test.tsx`
- `tests/vitest/estimate-sheet-tree-dnd.test.tsx`
- `tests/vitest/estimate-tree-modal.test.tsx`
- `tests/vitest/component-library-manager-ui.test.tsx`
- `tests/vitest/route-transition-peak-load-profile.test.tsx`

12 referenced tests are aspirational and must be created before they are cited as validation evidence.

## MVP Definition

MVP done means:

1. Phases 0-3 are implemented in separate commits.
2. New tree-core utility/share tests exist and pass.
3. Existing share behavior and visual layout are preserved.
4. No editable estimate tree or sheet behavior is changed.
5. Rollback is a clean revert of Phase 1-3 commits.
