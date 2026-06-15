# 05 — Implementation Approach

**Date:** 2026-06-13 (rev. 3 — adds runbook gates and proof requirements)
**Principle:** Preserve parity first; remove dependencies last. Build the new tree beside the old one; the swap is one reviewable commit; the old code survives until the final PR so rollback is always `git revert`.

**Required reading order for the implementer:**
1. `src/components/workshop/EstimateSheetTree.tsx` end-to-end (the working reference — doc 10)
2. `src/components/workshop/component-library-manager/LibraryFolderTree.tsx` (the visual/behavior spec being replaced)
3. Doc 12 (readiness runbook), doc 09 (drop translation contract), doc 08 (test/DOM contract), doc 11 (parity matrix)

**MVP execution contract:** PR 1 may add `FolderTree.tsx` and route-facing tests, but it must not change `src/components/ui/tree.tsx`, add a feature flag, add a dependency, or introduce a new hook abstraction by default. If the canonical primitive appears insufficient, use doc 12's stop gates before widening scope.

---

## Step 0 — Baseline (no code changes)

- [ ] Run the six Vitest files from doc 08 §1 on the base branch; record the green run.
- [ ] `bun run type-check`, `bun run lint`, `bun run build` green on baseline.
- [ ] Confirm the supporting tests named in doc 08 §1.1 are understood, especially the route CSS boundary and shared row-affordance tests.
- [ ] Open `/workshop/library/components` and the estimate route side by side; skim doc 11 §4 once against the **old** tree so "same as today" is concrete.

---

## Concurrency rule

Do not interleave PR 1 or PR 2 with any sibling branch that rewrites `LibraryFolderTreeSurface`, `ComponentLibraryManager`'s tree panel boundary, or the Add Component modal tree section. If one of those branches is already in flight, either land/rebase it first or park this migration until the surface settles. This plan assumes the route shell and modal layout remain stable while only the tree implementation swaps underneath them.

---

## PR 1 — `FolderTree` + swap the Folders view

**Goal:** The Folders view mode renders the canonical `Tree` with full parity (render, DnD, bulk, menus, search); old implementation still present but unused by the route.

### 1a. Extract shared pieces (behavior-neutral commits)

- [ ] Move `ComponentViewControls` to `component-library-manager/ComponentViewControls.tsx`; update `component-library/index.tsx` import; keep a re-export from `LibraryFolderTree.tsx` until PR 3 (D14).
- [ ] Move `ALL_COMPONENTS_FOLDER_ID` + `isAllComponentsFolderId` into `library-folder-reorder.ts`; `library-folder-tree-shared.ts` re-exports them (avoids the import cycle for the new evaluator — doc 09 §4).
- [ ] Type-check/lint/tests green; zero visual change.

### 1b. New evaluator (logic-only commit)

- [ ] Add `evaluateLibraryFolderTreeDrop` + component-target resolver to `library-folder-reorder.ts` per doc 09 §4 (the old `evaluateLibraryFolderDrop` stays).
- [ ] Add the unit cases from doc 09 §5 to `library-folder-reorder.test.ts`, including the top-level-reorder case (D12), synthetic-root rejections, cycle/no-op, and component target resolver. These are PR 1 gates, not PR 3 cleanup work.

### 1c. Build `FolderTree`

New file `src/components/workshop/component-library-manager/FolderTree.tsx`, accepting the same props as today's `LibraryFolderTree` (`folders`, `nodes`, `libraryItems`, `selectedFolderId`, `searchQuery`, `disabled`, `expandedItemIds`/`onExpandedItemIdsChange`, all handlers — see the props type at `LibraryFolderTree.tsx:352–374`; ids keep the `folder:`/`component:` schemes so expansion state and selectors carry over).

- [ ] `buildFolderTreeNodes` adapter: `LibraryFolderTreeNode[]` + items map → canonical `TreeNode[]` (mixed folder/component rows, synthetic root, `data.kind` discriminator). Reuse `filterFolderTree` / `filterComponentItemsByFolderId` / `buildComponentItemsByFolderId` unchanged.
- [ ] `renderItem` porting the row markup from `LibraryFolderTree.tsx:694–837` nearly verbatim: `WorkshopTreeRow`, `TreeDragHandle`, `TreeSelectionCheckbox`, `contextMenuGroups` from the ported `createActionGroups`, two-line component rows, and **every `data-*` attribute from doc 08 §3** (spread the canonical `rowProps` first — doc 10 §2).
- [ ] Wire `canDrag` / `canDrop` / `onDrop` to the new evaluator + component-move path per doc 09 §4.3–4.4 (optimistic snapshot, `reorderLibraryFolders`, rollback, `onReorderStatus`, post-drop selection).
- [ ] Bulk selection: same `tree-selection.ts` calls and `TreeBulkActionBar` as today (`:435–459, 610–617`).
- [ ] `emptyState`: the exact "No folders match" block (`:600–606`). `rootDropZones` off (doc 09 §3). No `externalDrop` (D8).

### 1d. Swap + test re-baseline (one commit)

- [ ] `LibraryFolderTreeSurface` renders `FolderTree` instead of `LibraryFolderTree` in folder mode (`:1220–1243`); Surface keeps the status strip, header, expand/collapse-all, view-mode menu unchanged.
- [ ] Delete the `react-complex-tree` mocks in the three test files; re-baseline the `<ol>` assertion (doc 08 §2); all six files green against the real tree.
- [ ] Rewrite the old direct-harness DnD tests in `workshop-library-consolidation-ui.test.tsx` as real DOM drag/drop tests against canonical rows (use `tests/vitest/ui-tree.test.tsx` helpers as the model).
- [ ] Add focused Folders-tree DOM coverage for ARIA/keyboard: `role`, `aria-level`, `aria-setsize`, `aria-posinset`, `aria-expanded`, `aria-current`, roving `tabIndex`, Arrow navigation, Enter/Space activation.
- [ ] Add adversarial route assertions for synthetic-root restrictions, disabled/tree-mutation-pending behavior, invalid component drops, rollback/status on rejected server actions, and bulk-selection drift after search/view-mode switching (doc 12 §7).
- [ ] Run doc 11 §4 QA walkthrough (steps 1–9, 11–12).

**Acceptance:** doc 11 §1–§3 hold for the Folders view; six test files + type-check/lint/build green; Suppliers/Brands untouched.

---

## PR 2 — `AddComponentModal` folder picker

- [ ] `LibraryFolderTreePicker` (`LibraryFolderTree.tsx:1255`) renders the new `FolderTree` through the same Surface path; picker config unchanged (folder actions per current props, DnD off if off today).
- [ ] Verify with test or manual evidence: open picker, select folder, save component to folder, create/rename/delete folder inside the modal (doc 11 §4 step 10; doc 12 §5).

**Acceptance:** picker flows work; full suite green.

---

## PR 3 — Cleanup

- [ ] Delete the old `LibraryFolderTree` component body + `ControlledTreeEnvironment` usage; keep/relocate surviving exports (`FolderActionIcon`, Surface, Picker, re-exports) — `ComponentViewControls` re-export removed, import sites updated.
- [ ] Delete `evaluateLibraryFolderDrop`, `normalizeParentId`, and the `DraggingPosition`/`TreeItemIndex` imports from `library-folder-reorder.ts`; retype `fromLibraryFolderTreeItemId` to `string`. Port the remaining old-shape unit cases to the new evaluator (doc 08 §1, row 1).
- [ ] Remove `react-complex-tree/lib/style-modern.css` from `src/app/workshop/layout.tsx`; remove `react-complex-tree` from `package.json`; regenerate lockfile.
- [ ] Re-baseline `tests/vitest/live-estimate-node-route.test.ts` so it no longer expects the workshop layout to import `react-complex-tree/lib/style-modern.css`.
- [ ] D10 performance spot-check (worst-case seeded library) **before** merging this PR — the old tree must still be checkout-able for comparison.
- [ ] Gates: `grep -R "react-complex-tree" src tests package.json bun.lock` empty; `bun run build` + full Vitest suite green; `ANALYZE=true bun run build` output or package/lockfile dependency delta noted in the PR description.

**Acceptance:** dependency gone; doc 06 definition of done satisfied.

---

## Phase mapping from the original plan

| Original phase | Now lives in |
|---|---|
| 0 — Scaffolding/extraction | PR 1a (feature flag dropped per D6) |
| 1 — Rendering | PR 1c |
| 2 — DnD | PR 1b + 1c |
| 3 — Bulk + a11y | PR 1c + 1d QA |
| 4 — Modal picker | PR 2 |
| 5 — Cleanup | PR 3 |

## Rejected alternatives

- **Big-bang single PR** — 1,371-LOC file with interleaved rendering/DnD/selection/menu logic; debugging all regressions at once is the expensive path.
- **5 separate deployable phases with a feature flag** — right for a live product; pure overhead pre-release (D1, D6).
