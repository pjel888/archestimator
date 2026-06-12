# 04 — Blast Radius & Risk Analysis

**Date:** 2026-06-13
**Source:** Direct source audit + code-review-graph impact radius

---

## 1. Files expected to change

### 1.1 Core migration files

| File | Lines | Change nature | Risk |
|---|---|---|---|
| `src/components/workshop/component-library-manager/LibraryFolderTree.tsx` | 1,371 | Replace `ControlledTreeEnvironment` tree with canonical `Tree` wrapper; keep view-mode shell and shared exports | High |
| `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` | 1,526 | Update props passed to tree surface; no structural change expected | Medium |
| `src/components/workshop/component-library-manager/AddComponentModal.tsx` | 2,359 | Update `LibraryFolderTreePicker` to use new tree | Medium |
| `src/lib/component-library/library-folder-reorder.ts` | 363 | Decouple drop planner from `react-complex-tree` types or add translation layer | High |

### 1.2 Dependency / configuration files

| File | Change nature | Risk |
|---|---|---|
| `src/app/workshop/layout.tsx` | Remove `react-complex-tree/lib/style-modern.css` import | Low |
| `package.json` | Remove `react-complex-tree` dependency | Low |
| `bun.lock` / `package-lock.json` | Regenerate lockfile | Low |

### 1.3 Shared exports to preserve

| Export | Current file | Action |
|---|---|---|
| `ComponentViewControls` | `LibraryFolderTree.tsx` | Extract to `component-library-manager/ComponentViewControls.tsx` (D14); temporary re-export until PR 3 |
| `LibraryFolderTreePicker` | `LibraryFolderTree.tsx` | Update implementation; keep API compatible |
| `FolderActionIcon` | `LibraryFolderTree.tsx` | Move to shared tree affordances if not already |
| Re-exports of `ALL_COMPONENTS_FOLDER_ID`, `isAllComponentsFolderId`, `ComponentViewMode`, `CreateLibraryFolderHandler`, `ReorderStatus` | `LibraryFolderTree.tsx:64–70` | Keep working; canonical home moves per D14 |
| `getAllFolderTreeItemIds` | `LibraryFolderTree.tsx:166` | Used by Surface expand-all; keep |

### 1.4 Test files in the blast radius

Six Vitest files gate the migration (three of them mock `react-complex-tree` and must have the mocks deleted at swap time); one e2e spec touches the catalogue only. Full inventory, line numbers, and per-PR gates: **doc 08**. Summary:

| File | Impact |
|---|---|
| `tests/vitest/library-folder-reorder.test.ts` | Keep green; port `evaluateLibraryFolderDrop` cases to the new evaluator in PR 3 |
| `tests/vitest/library-folder-tree-selection.test.tsx` | Delete mock at swap; `data-library-component-bulk-selected` must survive |
| `tests/vitest/component-library-manager-ui.test.tsx` | Heaviest contract: folder-node/arrow/spacer selectors, `role="treeitem"`, `<ol>` assertion to re-baseline |
| `tests/vitest/component-library-manager.test.tsx` | Delete minimal mock; panel attributes unaffected |
| `tests/vitest/component-library-ui.test.tsx` | Different component (`LibraryTree`); keep green |
| `tests/vitest/workshop-library-consolidation-ui.test.tsx` | Delete mock at swap; folder navigation re-verified against real tree |

---

## 2. Feature-parity gaps

| Current feature | Canonical `Tree` support | Gap / work required |
|---|---|---|
| Mixed folder + component rows | Yes via `renderRow` + `TreeNode.data` | Need adapter to build mixed `TreeNode[]` |
| Folder drag-to-reorder | Yes via `onDrop`/`canDrop` | Need to map drop events to existing reorder planner |
| Component drag-to-move | Yes via `onDrop`/`canDrop` | Need to distinguish component vs folder drops and call `onMoveComponentToFolder` |
| Bulk folder selection | Yes via `selectable` + `onCheckboxToggle` | Need cascade selection mapping (`tree-selection.ts`) |
| Component click selects parent folder | Yes via `onRowClick` | Need parent-folder lookup |
| "All Components" synthetic root | Yes via explicit root node | Need root rendering guard (no drag, no delete) |
| Folder context-menu CRUD | Yes via `onContextMenu` + existing menu primitives | Need action groups wired to existing handlers |
| Search/filter | Yes via filtered `nodes` prop | Reuse existing `filterFolderTree` / `filterComponentItemsByFolderId` |
| Keyboard navigation | Yes | Must verify focus and arrow-key behavior matches current |
| ARIA roles | Yes | Must verify `role="tree"`, `role="treeitem"`, `aria-level`, `aria-expanded` |

---

## 3. Risk register

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| Folder DnD reorder produces wrong `sort_order` or corrupts parent/child relationships | High | Medium | Port existing `evaluateLibraryFolderDrop` via adapter; add unit tests for every drop position (before/after/inside root/child) |
| Component drag-to-move drops on wrong folder or loses item | High | Medium | Keep existing `onMoveComponentToFolder` server action; verify drop target mapping |
| Bulk selection state drifts (checked ids no longer in tree after search/view-mode switch) | Medium | Medium | Reuse `pruneSelection` from `tree-selection.ts` |
| Focus/keyboard navigation regressions | Medium | Medium | Manual keyboard walkthrough + screen-reader smoke test |
| `AddComponentModal` folder picker breaks | Medium | Medium | Test picker open/select/create/rename/delete flows |
| `ComponentViewControls` export removed or moved incorrectly | Medium | Low | Keep re-export until estimate sidebar is updated, or extract first |
| **DOM attribute / test contract regression** (selectors dropped, mocks left dead, `<ol>` assertion) | High | High if unmanaged | Doc 08 contract: re-emit all **Must preserve** selectors via `renderItem`; delete the three `react-complex-tree` mocks and re-baseline the `<ol>` assertion in the swap PR; six-file suite green per PR |
| Drop-translation mistakes (wrong parent/index, root edge cases) | High | Medium | Implement strictly from doc 09's tables; unit cases in doc 09 §5 including the D12 top-level case; planner core untouched |
| Bundle size / tree-shaking surprise after removing `react-complex-tree` | Low | Low | Use `ANALYZE=true bun run build` or record package/lockfile dependency delta. There is no `bun run analyze` script on the current branch. |
| Performance regression on large libraries | Low | Low | Both trees are unvirtualized flat renders, so the risk profile is unchanged; D10 mandates a side-by-side spot-check on a worst-case seeded library (~100 folders / ~1,000 components) before the cleanup PR, with the doc 12 evidence template filled out. If obvious lag appears, stop before dependency removal and write a separate primitive-level performance plan. |
| Drag look-and-feel shift (canonical Tree uses HTML5 DnD browser drag image; `react-complex-tree` draws its own preview) | Low | Certain | Accepted cosmetic change — matches the estimate tree, which is the consistency goal; check on Safari during QA |

---

## 4. Affected user flows

| Flow | Impact | Severity |
|---|---|---|
| User opens `/workshop/library/components` Folders view | Tree renders with canonical component | Medium |
| User expands/collapses folders | Behavior should be identical | Low |
| User drags a folder to reorder | Must produce same server result | High |
| User drags a component onto another folder | Must move component | High |
| User bulk-selects folders and deletes | Must delete selected folders and descendants | High |
| User creates/renames/deletes folder via context menu | Must work unchanged | Medium |
| User searches folder tree | Must filter folders and components consistently | Medium |
| User switches to Suppliers/Brands view | Already canonical; verify no regression | Low |
| User opens Add Component modal and picks a folder | Must use new tree | Medium |

---

## 5. Rollback strategy

### Tier 1 — Stop migration
Because no code has been committed yet, the simplest rollback is to stop work and archive this plan.

### Tier 2 — Per-phase revert
Each phase is designed to leave the app in a working state. If a phase introduces a regression, revert that phase’s commit(s). The `react-complex-tree` dependency is removed only in the final phase, so earlier phases remain reversible without re-adding packages.

### Tier 3 — Full revert
If the migration is completed and rejected, revert the entire feature branch. Because `react-complex-tree` removal is the last commit, a single revert restores the previous tree and dependency.

---

## 6. Concurrency / merge-conflict notes

- `ComponentLibraryManager.tsx` and `AddComponentModal.tsx` are active files. Plans known to touch the same area: `.ai/03_plans/2026-06-11-Library-page-ux-and-ui-improvement/`, `.ai/03_plans/2026-06-11-Unification-Plan-For-Components-And-Templates/`, `.ai/03_plans/2026-06-11-Templates-Page-UX-UI-Audit/`. This migration confines itself to the tree surface (Surface props and panel layout unchanged), so conflicts should be mechanical — but do not interleave PR 1 with any PR that rewrites `LibraryFolderTreeSurface`; land one fully before the other.
- `src/components/ui/tree.tsx` is a shared primitive; the plan requires **zero changes** to it. If a gap is discovered mid-implementation, stop and review against estimate-workspace regressions before extending it.
- `src/app/workshop/layout.tsx` is low-conflict.

## 7. Behavior deltas (intentional)

| Delta | Why |
|---|---|
| Top-level folder reorder by dragging now works | D12 — the old evaluator silently rejected it (`unknown-target-parent` for drops under the synthetic root) |
| Browser-default drag image instead of `react-complex-tree`'s custom preview | Inherent to the canonical Tree; matches the estimate tree |
| Tree markup is `<div role="treeitem">` rows instead of `<ol>/<li>` | Inherent to the canonical Tree; one test assertion re-baselined (doc 08 §4) |

Anything else that differs from doc 11's matrices is a regression, not a delta.
