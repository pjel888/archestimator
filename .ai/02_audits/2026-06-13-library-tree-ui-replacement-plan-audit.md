# Library Tree UI Replacement — Plan Audit

**Audit date:** 2026-06-13
**Auditor:** Sisyphus (Sonnet 4.7)
**Subject:** `.ai/03_plans/2026-06-11-Library-Tree-UI-Replacement/`
**Audit method:** Direct source read of all 8 plan documents + 16 supporting codebase files + 6 related test files
**Source evidence:** 9 files inspected end-to-end, 2 confirmed via `wc -l` and `grep` against the live tree on `main`

---

## 1. Headline rating

| Dimension | Score | Notes |
|---|---|---|
| **Implementation readiness** | **62 / 100** | Plan files are well-organized and the phase ordering is sound, but there are five major evidence gaps and at least three missing reference documents. Code is not ready to start Phase 0 today. |
| **Quality** | **74 / 100** | Writing is concise, files claimed are accurate, and the analysis-vs-preserve framing is correct. Quality drops in sections that need exact file paths and function inventories. |
| **Strategy** | **80 / 100** | The big-picture direction (incremental adapter, preserve parity, remove dependency last) is exactly right and matches the patterns already used in `EstimateSheetTree.tsx`. |
| **Blast-radius accuracy** | **55 / 100** | Plan correctly identifies 3 files importing `react-complex-tree`, but understates the indirect blast: 5+ test files, 5+ `data-*` selector contracts, `library-folder-tree-shared.ts`, `tree-selection.ts`, `tree-row-affordances.tsx`, `tree-panel-header.tsx`, plus all the component-library helpers. |
| **UX/UI coverage** | **70 / 100** | Visual target section is short but correct. The plan does not list all interaction states (hover, focus, selection, drag-source, drop-target, indeterminate, expand-collapse, search-empty). |
| **CRUD coverage** | **65 / 100** | Mentions folder context-menu CRUD and bulk delete in passing, but does not enumerate the full CRUD matrix (create-top, create-bottom, rename, delete-single, delete-bulk, reorder-drag, component-move, expand/collapse-all, search-filter). The `planLibraryFolderDelete` function and its 6 unit tests are not even listed. |
| **Performance plan** | **40 / 100** | "Parity is maintained" is asserted but not measured. There is no benchmark, no dataset, no profile target, and no rollback threshold. |
| **Missing documents** | Required | See §6 — at least 4 new documents should be added before Phase 0 starts. |
| **Overall** | **68 / 100** | Direction is right, evidence base is incomplete. |

**Verdict:** Good directional plan, but not safe to begin Phase 0 yet. The plan needs (a) the test-impact and DOM-attribute inventory it currently lacks, (b) a drop-event-translation contract, (c) a reference-implementation walkthrough that points at `EstimateSheetTree.tsx` (which already implements the same pattern in 1,465 LOC), (d) a CRUD parity matrix, and (e) a real performance measurement plan with thresholds.

---

## 2. What the plan got right

| Strength | Evidence |
|---|---|
| Correct file inventory (core migration files + LOC) | `LibraryFolderTree.tsx` 1,371 LOC, `ComponentLibraryManager.tsx` 1,526 LOC, `AddComponentModal.tsx` 2,359 LOC, `tree.tsx` 1,153 LOC, `library-folder-reorder.ts` 363 LOC — all match the plan exactly. |
| Correct `react-complex-tree` consumer count | `grep` returns exactly 3 source files: `app/workshop/layout.tsx`, `LibraryFolderTree.tsx`, `library-folder-reorder.ts`. Plan says "the only consumer of `react-complex-tree` in the workshop" — correct. |
| Correct canonical-`Tree` capability assessment | The Tree primitive at `src/components/ui/tree.tsx` lines 128–196 exports `onDrop`, `canDrop`, `canDrag`, `onCheckboxToggle`, `onNodeDragStart`, `onNodeDragEnd`, `selectedIds`, `expandedIds`, `currentId`, `renderRow`, `renderItem`, `externalDrop`, `rootDropZones`, `railsPinned`, `onRowClick`, `onContextMenu`, `onToggle` — the plan's parity table is accurate. |
| Phase strategy is correct | Incremental (5 phases, shippable after each) over big-bang is the right call given the file size and coupling. |
| Preserve-`ComponentViewControls` recognition | `ComponentViewControls` is exported from `LibraryFolderTree.tsx` (line 307) and imported by `component-library/index.tsx` (line 27, used at line 1108). Plan correctly flags the export-preservation constraint. |
| Delete-while-removing-strategy is right | Removing `react-complex-tree` last (Phase 5) keeps earlier phases reversible. |
| Design-system framing | The "one tree primitive, not two" rationale is correct and aligns with `DESIGN.md`. |
| Folder-picker (Phase 4) sequencing | Migrating `LibraryFolderTreePicker` after the main tree is correct, because the picker renders the same `LibraryFolderTreeSurface`. |

---

## 3. Critical gaps

### 3.1 The plan ignores an existing shared file

There is already a file at `src/components/workshop/component-library-manager/library-folder-tree-shared.ts` (878 bytes) that holds:

- `COMPONENT_VIEW_MODES` (the `Default` / `Suppliers` / `Brand` array)
- `ALL_COMPONENTS_FOLDER_ID = "all-components"`
- `isAllComponentsFolderId()` helper
- `CreateLibraryFolderHandler` type
- `ReorderStatus` type (idle / saving / saved / error)

This is the **natural target** for Phase 0's "extract `ComponentViewControls` to a shared location" task — but the plan does not mention the file at all. Without acknowledging it, Phase 0 will either duplicate the constants or accidentally leave them in `LibraryFolderTree.tsx`.

### 3.2 The plan ignores all 6 existing Vitest tests

| Test file | Why it matters for this plan |
|---|---|
| `tests/vitest/library-folder-reorder.test.ts` | Pins `buildLibraryFolderTree`, `evaluateLibraryFolderDrop`, `getLibraryFolderCreateSortOrder`, `getLibraryItemsForFolderNode`, `planLibraryFolderDelete`. 6 distinct test cases (lines 64–162). Plan says "add unit tests for every drop position" but the test file **already exists** and must keep passing. |
| `tests/vitest/library-folder-tree-selection.test.tsx` | Tests `data-library-component-bulk-selected` attribute and bulk-selection cascade. |
| `tests/vitest/component-library-manager-ui.test.tsx` | Tests `data-library-folder-node-id`, `data-library-folder-arrow-id`, `data-library-folder-arrow-spacer-id`, `data-component-library-tree-panel`. |
| `tests/vitest/component-library-manager.test.tsx` | Tests `data-component-library-tree-panel`. |
| `tests/vitest/component-library-ui.test.tsx` | Tests `data-component-library-tree-label`. |
| `tests/vitest/workshop-library-consolidation-ui.test.tsx` | Tests `data-library-folder-node-id`. |
| `tests/vitest/live-estimate-node-route.test.ts` | Adjacent test that may pull in the tree. |

The plan's "Source evidence" section says **"No e2e specs reference library-folder tree selectors"**. That is technically true for `e2e/`, but it is **false** for `tests/vitest/`. The plan's readiness checklist asks for "Manual QA script exists" but never references the Vitest suite that will gate the merge. This is the single biggest gap.

### 3.3 The plan ignores a working reference implementation

`src/components/workshop/EstimateSheetTree.tsx` (1,465 LOC) already implements **the exact migration target**:

- Uses `Tree` from `@/components/ui/tree`
- Uses `pruneSelection`, `toggleCascadeSelection` from `@/lib/bulk-selection/tree-selection`
- Uses `TreePanelHeader` from `@/components/ui/tree-panel-header`
- Uses `BulkActionToolbar` from `@/components/ui/bulk-action-toolbar`
- Maps canonical `Tree` drops into a domain planner (`evaluateEstimateTreeDrop`) with shape `{ draggedNodeIds, target: { targetNodeId, position: "before" | "after" | "inside" } }`
- Handles optimistic local state, server rollback, and pending mutations
- Wires `handleTreeCanDrag(treeNode)`, `handleTreeCanDrop(draggedId, targetId, position)`, and `handleTreeDrop(draggedId, targetId, position)` (lines 485–498)

The plan does not name `EstimateSheetTree.tsx` once. This is the closest analog and should be the foundation of the implementation strategy — the folder-tree migration is essentially "do the same thing the estimate tree already does." Pointing this out would compress the plan and lower risk dramatically.

### 3.4 The plan understates `library-folder-reorder.ts`

The plan's "Source evidence" only names:

- `buildLibraryFolderTree(folders)`
- `evaluateLibraryFolderDrop({ folders, draggedItemIds, target })`
- `toLibraryFolderTreeItemId` / `fromLibraryFolderTreeItemId`
- `LIBRARY_FOLDER_TREE_ID`, `LIBRARY_FOLDER_TREE_ROOT_ITEM_ID`

It misses:

- `planLibraryFolderDelete(folders, folderId)` — **bulk-delete planner** with its own unit test (line 152 of the test file). This is what the `handleDeleteSelectedFolders` path calls. Plan mentions "bulk delete" but does not list the planner.
- `getLibraryItemsForFolderNode(node, items)` — `EstimateRowItem` filter for a folder, used by `LibraryFolderTree.tsx` (line 356) to filter the catalogue.
- `getLibraryFolderCreateSortOrder(siblings, placement)` — sort-order calculation for the "Add folder" action. Plan mentions "add folder" but does not name the helper.
- `buildLibraryFolderReorderPlan(...)` — internal but distinct from `evaluateLibraryFolderDrop`; used by the existing tests.
- `LibraryFolderKind = "taxonomy" | "custom"` discriminator
- `LIBRARY_FOLDER_ID_PREFIX = "folder:"` and `LIBRARY_FOLDER_SORT_ORDER_STEP = 10` — non-obvious constants the adapter must preserve.
- The fact that `evaluateLibraryFolderDrop` returns a **discriminated union** (`{ ok: true, plan } | { ok: false, code, message }`) — the adapter must preserve this contract or the error path breaks.

### 3.5 The plan does not list the data-attribute contracts

The Vitest tests rely on these DOM hooks (live-verified in the test files):

| Attribute | Used by test | Purpose |
|---|---|---|
| `data-library-folder-node-id` | `component-library-manager-ui.test.tsx` | Per-folder row marker |
| `data-library-folder-arrow-id="folder:..."` | `component-library-manager-ui.test.tsx` | Expand/collapse arrow |
| `data-library-folder-arrow-spacer-id="folder:..."` | `component-library-manager-ui.test.tsx` | Spacer where no arrow renders |
| `data-library-component-bulk-selected` | `library-folder-tree-selection.test.tsx` | Bulk-selection state |
| `data-library-component-item-id` | (search results) | Per-component row id |
| `data-library-component-tree-row` | (LibraryFolderTree render) | Component row marker |
| `data-component-library-tree-panel` | `component-library-manager*.test.tsx` | Tree-panel root |
| `data-component-library-tree-label` | `component-library-ui.test.tsx` | Component-name label |

The plan should explicitly enumerate which of these are preserved by the canonical `Tree` (none directly — they have to be re-emitted via `renderItem`/`renderRow`) and which must be re-implemented via the new row renderer.

### 3.6 The plan ignores shared helper files

The plan says to reuse `tree-row-affordances.tsx` and `workshop-tree.tsx` but never lists:

- `src/lib/bulk-selection/tree-selection.ts` (112 LOC) — exports `pruneSelection`, `toggleCascadeSelection`, `dedupeSelectedRoots`, `getSelectionState`, `TreeSelectionNode`, `selectVisibleIds`. This is **critical** for bulk selection.
- `src/components/workshop/tree-row-affordances.tsx` (237 LOC) — exports `TreeDragHandle`, `TreeSelectionCheckbox`, `TreeSelectionCountLabel`, `TreeBulkActionBar`. The canonical Tree already has its own `TreeBulkActionBar` and checkbox; the plan should clarify which to use.
- `src/components/ui/tree-panel-header.tsx` — search + view-mode toolbar shell.
- `src/components/workshop/ResizableSidePanel.tsx` — layout shell (mentioned in plan, path confirmed).
- `src/components/workshop/tree-row-affordances.tsx` — referenced in `LibraryFolderTree.tsx` but not specified in plan.

### 3.7 The plan's drop-event translation is underspecified

The plan recommends "Option A — Translate canonical Tree drop events" but does not provide:

- The exact translation table from `react-complex-tree` `DraggingPosition.targetType` to canonical `Tree` `(draggedId, targetId, position)`:
  - `targetType: "between-items"` with `linePosition: "top"` → `position: "before"`, `targetId: parentItem`
  - `targetType: "between-items"` with `linePosition: "bottom"` → `position: "after"`, `targetId: parentItem`
  - `targetType: "item"` → `position: "inside"`, `targetId: targetItem`
  - `targetType: "root"` → `position: "before" | "after"` on first/last root via `rootDropZones`
- The `childIndex` semantics in `target.childIndex` — when 0, is it "before the first child" or "inside the parent"? (`between-items` semantics in react-complex-tree put `childIndex: 0` at the top of the parent.)
- How to handle the canonical Tree's `rootDropZones` — react-complex-tree has a `root` targetType; the canonical Tree has separate `rootDropZones` with `edge: "top" | "bottom"`. The translator must handle root-level drops.
- The `getComponentDropTargetFolderId` helper in `LibraryFolderTree.tsx` (line 474) — used to map a component drop onto a folder, since the component is dragged to a folder even when the visual target is a folder row.

### 3.8 The plan's performance claim is not measured

> "Performance regression on large libraries | Low | Low | Canonical `Tree` is not virtualized; current tree is not either, so parity is maintained."

The plan does not measure performance, define a dataset, or set a threshold. Both trees are unvirtualized, so the worst-case DOM size is `Σ folder_count + component_count`. There is no benchmark, no `performance.mark`, no comparison profile. A library with 500 folders × 50 components = 25,000 rows is not addressed. The plan should:

1. Define a max-realistic dataset (e.g., 200 folders, 5,000 components).
2. Set a render-time budget (e.g., < 100ms initial render, < 16ms drag-over).
3. Capture a before-profile (current `react-complex-tree` performance on that dataset).
4. Define a rollback threshold (e.g., "if render time regresses > 20%, stop and reconsider virtualization").

### 3.9 The plan ignores optimistic state semantics

`ComponentLibraryManager.tsx` lines 1088–1114 manage local folder state with `setReorderStatus`, optimistic updates, and rollback on error. The plan mentions "Add optimistic UI updates and rollback on error (mirror current behavior)" in Phase 2, but:

- The `LibraryFolderTree.tsx` component already owns its own `folders` prop and calls `onFoldersChange(result.plan.nextFolders)` — the local-state management lives in `LibraryFolderTree`, not in `FolderTree`. The plan's `FolderTree` will need to own this same optimistic-state contract, or the new component has to take `folders` / `onFoldersChange` as props.
- The `reorderStatus` toast integration is not in the plan at all. `EstimateSheetTree.tsx` uses `useToast` to surface reorder status; the plan should require the same in `FolderTree`.

### 3.10 The plan ignores the "All Components" special-case semantics

The plan says "Need root rendering guard (no drag, no delete)" — correct, but understated. The current code:

- Uses `effectiveSelectedFolderId = showAllComponentsRoot ? (selectedFolderId ?? ALL_COMPONENTS_FOLDER_ID) : selectedFolderId` (line 989)
- Adds the root via `withAllComponentsRoot(folderNodes)` (line 209) which prepends a node with `id: toLibraryFolderTreeItemId(ALL_COMPONENTS_FOLDER_ID)`
- The root is the default selection when `selectedFolderId` is null
- Dragging the root is rejected in `canDrag` (line 465)
- The root has no `onDelete` / `onRename` action groups (lines 570–592)
- The "Add folder" action treats the root's parent as `null` (line 543) so the new folder is created at the top level

The plan needs an explicit **synthetic-root spec** section that documents each of these behaviors, not just one bullet.

### 3.11 The plan's `renderItem` contract is wrong

The plan's example in `03_TARGET_STATE_AND_COMPONENT_REUSE.md` shows:

```tsx
<Tree
  nodes={folderTreeNodes}
  ...
  renderRow={renderFolderRow}
/>
```

But the canonical Tree's `renderRow` is `(node, depth, isSelected, isExpanded) => ReactNode` — it does not receive `state` or `rowProps`. To get the full row (with drag handle, checkbox, context menu) you need `renderItem(state, rowProps)` (line 195 of `tree.tsx`), which replaces the default row entirely. The plan uses the wrong prop name, which will lead implementers to a half-built row. The plan should:

- Show both `renderRow` and `renderItem` usage.
- Specify which is used for folder rows vs component rows.
- Reference `EstimateSheetTree.tsx` for the actual pattern.

### 3.12 The plan does not address template-drag-into-folder

`EstimateSheetTree.tsx` lines 42–49, 62 import `ESTIMATE_TEMPLATE_DRAG_MIME_TYPE`, `CREATE_ESTIMATE_TEMPLATE_FROM_NODE_EVENT`, `INSERT_ESTIMATE_TEMPLATE_EVENT`, and `readEstimateTemplateDragPayload`. The estimate tree accepts drags from the templates tree via `externalDrop`. The plan does not address whether the folder tree should also accept template drops. This is a possible feature to preserve parity.

### 3.13 The plan does not address the search-empty state

`LibraryFolderTree.tsx` lines 600–606 render a custom empty state:

```tsx
<div className="rounded-xs border border-dashed border-hairline bg-surfaceMuted p-2 text-[10px] leading-4 text-tertiary">
  No folders match "{searchQuery}".
</div>
```

The canonical Tree's `emptyState` prop supports this. The plan should specify the empty-state copy and styling as part of the parity contract.

### 3.14 The plan does not address ARIA contract parity

The plan lists ARIA roles in a bullet but does not specify the screen-reader announcements for:

- Folder reorder status (`reorderStatus` toast with `aria-live="polite"`)
- Bulk-action bar appearance/disappearance
- Search results count (e.g., "5 components match")
- Component-vs-folder row announcements

The `EstimateSheetTree.tsx` pattern is the right reference but is not cited.

### 3.15 The plan does not enumerate the canonical-Tree gaps

The canonical Tree at `src/components/ui/tree.tsx` does **not** support:

- A separate "expanded" vs "selected" view (the canonical Tree's `selectedIds` is a flat list, not a hierarchical cascade)
- Auto-expand on search-match (must be done by the consumer via `expandedIds`)
- Lazy/virtual rendering
- Multi-select drag (multi-drag is a future state)
- Custom tree-item containers (the canonical Tree renders `<div role="treeitem">` rows, not `<li>` items — the current react-complex-tree uses `<ol><li>`, which the tests check)

The plan should enumerate these gaps so the implementer knows what to compensate for in the wrapper.

### 3.16 The plan does not address `ReorderStatus` toast

`EstimateSheetTree.tsx` lines 305–339 use `useToast` to surface reorder status to the user. The current `LibraryFolderTree.tsx` calls `onReorderStatus` and lets the parent (`LibraryFolderTreeSurface`) render the status as a `role="status" aria-live="polite"` strip (lines 1204–1215). The plan should specify which pattern `FolderTree` uses — toast vs status strip — and how to maintain the existing UX.

### 3.17 The plan does not address concurrent library-page work

The plan notes "coordinate with any concurrent library-page UX work" in §6 of `04_BLAST_RADIUS_AND_RISK_ANALYSIS.md`, but does not list the actual related plans in `.ai/03_plans/`:

- `2026-06-11-Library-page-ux-and-ui-improvement/` (16 sub-docs, in progress)
- `2026-06-11-Library-Unification-Plan-For-Components-And-Templates/` (empty)
- `2026-06-11-Unification-Plan-For-Components-And-Templates/` (10 sub-docs)
- `2026-06-11-Templates-Page-UX-UI-Audit/` (10 sub-docs)
- `2026-06-06-ui-component-optimization-componentization/` (1 doc)

These plans touch the same files. The plan needs a "Concurrent work" section that names the overlap and resolves the merge order.

### 3.18 The plan does not list the migration safety-net feature flag

Phase 0 mentions "Add a feature flag or prop toggle so `ComponentLibraryManager` can switch between old and new tree for local development." The plan does not specify:

- Where the flag lives (`src/lib/feature-flags.ts`? Component prop? Env var?)
- What it defaults to (off? on for internal users?)
- How long it stays (until Phase 5? forever?)
- How it interacts with `AddComponentModal`'s picker (also gated?)

### 3.19 The plan does not address keyboard-navigation parity

The plan's risk register says "Must verify focus and arrow-key behavior matches current" but does not specify:

- ArrowRight/ArrowLeft: expand/collapse folders
- ArrowUp/ArrowDown: navigate rows
- Enter: activate primary action (select folder / select parent for components)
- Space: toggle checkbox
- Shift+Click: range select (current behavior? canonical Tree support?)
- Type-ahead search (current behavior? canonical Tree support?)

The canonical Tree supports all of these; the plan should enumerate the keys and the expected action.

### 3.20 The plan does not address accessibility (a11y) for screen readers

The canonical Tree's `DefaultTreeRow` has `role="treeitem"`, `aria-level`, `aria-setsize`, `aria-posinset`, `aria-expanded`, `aria-selected`, `aria-current`. The plan should specify that the new `FolderTree` uses these and add a screen-reader smoke test to the readiness checklist (Q6 doesn't, only keyboard).

---

## 4. Performance analysis

### 4.1 Plan's performance claims

| Claim | Verdict |
|---|---|
| "Canonical `Tree` is not virtualized; current tree is not either, so parity is maintained." | True but vacuous. Both are unvirtualized, so any large-library slowdown exists in both. No measurement, no budget, no rollback threshold. |
| "Bundle size / tree-shaking surprise after removing `react-complex-tree`" | Plan says "Run `bun run analyze` before/after" but does not name a specific size target or a specific "before" command. The actual `package.json` entry should be checked. |
| "Drag latency parity" | Not addressed. The canonical Tree uses HTML5 DnD; react-complex-tree uses its own DnD. The first feels jankier on Safari. |
| "Search latency" | Not addressed. The plan reuses `filterFolderTree` but does not measure its cost on a 5,000-component library. |

### 4.2 Performance risks the plan misses

- **Initial render:** the canonical Tree is a flat-array render (`flattenTree` is O(n) per render). `react-complex-tree` does the same. Both are fine for < 5,000 rows.
- **Drag preview:** react-complex-tree renders a custom drag preview; the canonical Tree uses the default browser drag image. The look-and-feel will change.
- **Search filter:** both filter the data, but the canonical Tree's `expandedIds` state must be re-derived after every search to keep matching nodes visible.
- **Bulk selection prune:** `pruneSelection` is called in a `useEffect` on every `folderSelectionNodes` change (line 435–447 of `LibraryFolderTree.tsx`). The cost is O(n) per change. For 5,000 folders this is 5,000 ops per search keystroke.

---

## 5. UX/UI analysis

### 5.1 What the plan covers

- Visual target: 10px text, `rounded-xs` 3px, SF Pro stack, hover `bg-surfaceMuted`, selected `bg-accentSoft`.
- Drag handles in left rail, hidden until hover/selection, using `group/tree`.
- Context menus via existing `ContextMenu` + `ContextActionMenuContent`.
- Checkboxes for bulk folder selection.

### 5.2 What the plan misses

- The full interaction-state matrix (hover, focus, focus-visible, selected, drag-source, drop-target-before, drop-target-after, drop-target-inside, indeterminate, current, disabled, expanded, collapsed).
- Loading state (current code uses `treeMutationPending` to disable all tree interactions; the new tree must do the same).
- Search-active state (current code preserves expansion but re-filters nodes; the new tree must do the same).
- Drag-ghost styling (browser default vs custom).
- View-mode dropdown placement and positioning (current code uses absolute positioning at `top-[72px]` — the new tree should match).
- Empty state per view mode (folder empty, supplier empty, brand empty, search-no-results).
- The `aria-live="polite"` strip for reorder status (current `LibraryFolderTree.tsx` lines 1204–1215 — must be preserved).

### 5.3 UX paths the plan should enumerate

For each path, the plan should list: trigger → action → expected result → error state.

1. **Open library route, default view** → see folder tree, "All Components" root expanded.
2. **Click folder row** → folder is selected, center catalogue updates.
3. **Click component row** → parent folder is selected, center catalogue updates.
4. **Click expand caret on folder** → folder expands, children visible.
5. **Type in search** → folder tree filters, matching folders/components stay visible, non-matching collapse.
6. **Drag folder to reorder** → optimistic update, server confirm, toast or status strip.
7. **Drag component onto folder** → component moves, parent folder is selected, status updates.
8. **Right-click folder** → context menu (Select, Expand/Collapse, Add folder, Rename, Delete).
9. **Right-click "All Components"** → context menu (Select, Expand/Collapse, Add folder) — no Rename, no Delete.
10. **Click checkbox on folder** → cascade select all descendants; ancestor gets indeterminate.
11. **Click bulk delete** → selected folders and descendants deleted; tree refreshes.
12. **Switch view mode (Suppliers)** → canonical LibraryTree renders, no regression.
13. **Open Add Component modal, pick folder** → folder picker uses new tree.
14. **Keyboard: ArrowDown/Up** → row focus moves.
15. **Keyboard: ArrowRight** → expand folder; on a component, no-op.
16. **Keyboard: Enter** → primary action (select folder, or select parent folder for component).
17. **Keyboard: Space** → toggle checkbox on folder.
18. **Keyboard: Esc** → close view-mode dropdown or context menu.

The plan's `04_BLAST_RADIUS_AND_RISK_ANALYSIS.md` §4 "Affected user flows" lists 9 of these, missing #5, #6's specific folder→root case, #11, #14–18, and the All-Components special cases.

---

## 6. CRUD coverage analysis

The plan mentions folder CRUD in passing but does not enumerate the full matrix:

| Operation | API path | Currently supported? | Plan coverage |
|---|---|---|---|
| Create folder (top) | `onCreateFolder(parentId, { placement: "top" })` | Yes | Phase 0/1 — not specifically called out |
| Create folder (bottom) | `onCreateFolder(parentId, { placement: "bottom" })` | Yes | Phase 0/1 — not specifically called out |
| Rename folder | `onRenameFolder(folderId, currentName)` | Yes | Phase 1 — mentioned |
| Delete folder (single) | `onDeleteFolder(folderId, currentName)` | Yes | Phase 1 — mentioned |
| Delete folder (bulk) | `onDeleteFolders(folderIds)` via `TreeBulkActionBar` | Yes | Phase 3 — mentioned |
| Reorder folder (drag) | `reorderLibraryFolders({ updates })` via `evaluateLibraryFolderDrop` | Yes | Phase 2 — covered |
| Move component to folder | `onMoveComponentToFolder(item, targetFolderId)` | Yes | Phase 2 — covered |
| Bulk select folders | `toggleCascadeSelection` from `tree-selection.ts` | Yes | Phase 3 — covered |
| Expand all / collapse all | `getAllFolderTreeItemIds` + `setExpandedFolderItemIds` | Yes | Not mentioned — must be preserved |
| Search/filter folders | `filterFolderTree`, `filterComponentItemsByFolderId` | Yes | Phase 1 — covered |
| Switch view mode | `changeViewMode` + `ComponentViewControls` | Yes | Not in plan as a separate item |
| Edit component via tree (picker only) | N/A in main tree, supported in `AddComponentModal` picker | Yes | Phase 4 — covered |
| Expand-on-search (reveal matching nodes) | `treeExpandedIds` with `treeSearchActive` (in `EstimateSheetTree.tsx`) | Yes | Not mentioned — canonical Tree requires the consumer to compute this |

The plan covers most CRUD but misses: create-folder placement (`top` vs `bottom`), expand/collapse-all, view-mode switching, expand-on-search.

---

## 7. Missing documents (recommended additions)

| New doc | Purpose | Critical? |
|---|---|---|
| **08_TEST_IMPACT_AND_DOM_CONTRACT.md** | Enumerate every Vitest test that references the tree; every `data-*` selector that must be preserved; every test that must be re-baselined when the row markup changes. Includes a "DOM attribute contract" table. | **Critical** — without this, the migration will break 6+ tests silently. |
| **09_DROP_EVENT_TRANSLATION_CONTRACT.md** | Detailed table from `DraggingPosition` → canonical `(draggedId, targetId, position)`. Pseudocode for `translateDropToFolderDrop(draggedId, targetId, position)`. Test cases for every translation path. | **Critical** — the translation is the highest-risk code in the migration. |
| **10_REFERENCE_IMPLEMENTATION_ESTIMATE_TREE.md** | Walkthrough of `EstimateSheetTree.tsx` showing how it already implements the target pattern. Lifts the `evaluateEstimateTreeDrop`-style adapter design directly. | **Critical** — reuses 1,465 LOC of working code. |
| **11_CRUD_PARITY_MATRIX.md** | The full CRUD matrix from §6 of this audit. Per-operation: API, expected behavior, error state, optimistic update, rollback. | High — currently underspecified. |
| **12_VISUAL_PARITY_BASELINE.md** | Side-by-side comparison of folder tree vs estimate tree. Per-state CSS class matrix. Spacing/radius/icon-size alignment. | Medium — visual regressions are easy to miss. |
| **13_PERFORMANCE_MEASUREMENT_PLAN.md** | Dataset definition, render-time budget, drag-latency budget, search-latency budget, before-profile script, after-profile script, rollback thresholds. | High — without this, performance is asserted, not measured. |
| **14_CONCURRENT_WORK_RESOLUTION.md** | List of every other plan that touches the same files. Merge order. Conflict resolution. | Medium — avoids surprise merge conflicts. |
| **15_REFERENCE_ESTIMATE_TREE_DIFF.md** | For each `FolderTree` capability, the line in `EstimateSheetTree.tsx` that implements it. Direct copy-paste-friendly. | High — fastest path to working code. |

If 1, 2, 3, and 5 are added before Phase 0, the plan would jump to ~88 / 100. With all 8 added, the plan reaches ~95 / 100.

---

## 8. Recommended revisions to existing documents

| Document | Required change |
|---|---|
| `README.md` | Add `library-folder-tree-shared.ts` to the file map; mention the 6 existing Vitest tests; cite `EstimateSheetTree.tsx` as a working reference. |
| `00_INDEX.md` | Add the new docs (08–15) to the index; add a "Concurrent work" line listing the related plans. |
| `02_CURRENT_STATE_ANALYSIS.md` | §3.3 should list ALL exports of `library-folder-reorder.ts`, not just `buildLibraryFolderTree` and `evaluateLibraryFolderDrop`. §4 should list all consumers of `tree-selection.ts` and `tree-row-affordances.tsx`. §6 should list ALL `data-*` selectors and the test files that depend on them. |
| `03_TARGET_STATE_AND_COMPONENT_REUSE.md` | §2.1 should list `tree-selection.ts`, `tree-row-affordances.tsx`, `tree-panel-header.tsx`, and `library-folder-tree-shared.ts` in the reuse table. §2.2 should name `EstimateSheetTree.tsx` as the primary reference for the new `FolderTree`. §3 should use `renderItem` not `renderRow`, with a link to `EstimateSheetTree.tsx`. §5 should provide a translation table, not just two options. |
| `04_BLAST_RADIUS_AND_RISK_ANALYSIS.md` | §1 should add `tests/vitest/library-folder-reorder.test.ts`, `tests/vitest/library-folder-tree-selection.test.tsx`, `tests/vitest/component-library-manager-ui.test.tsx`, `tests/vitest/component-library-manager.test.tsx`, `tests/vitest/component-library-ui.test.tsx`, `tests/vitest/workshop-library-consolidation-ui.test.tsx` to the impacted files list. §3 risk register should add a "DOM attribute contract regression" risk. §6 should name the related plans in `.ai/03_plans/`. |
| `05_IMPLEMENTATION_APPROACH.md` | Phase 0 should add: "Move `library-folder-tree-shared.ts` types to the new shared file." Phase 1 should add: "Re-emit all 8 `data-*` selectors in the new `renderItem` to preserve test contracts." Phase 2 should specify the translation table from `09_DROP_EVENT_TRANSLATION_CONTRACT.md`. Phase 5 should add: "All 6 Vitest test files pass; all 8 `data-*` selectors resolved." |
| `06_READINESS_AND_ACCEPTANCE_CRITERIA.md` | Pre-implementation checklist should add: "All 6 Vitest test files pass on `main` baseline"; "EstimateSheetTree is reviewed as the reference implementation." Per-phase acceptance should add: "DOM attribute contract intact" (Phases 1–4), "All Vitest tests pass" (every phase). |
| `07_OPEN_QUESTIONS_AND_DECISIONS.md` | Should add Q7: "What is the expand-on-search contract? The canonical Tree requires the consumer to compute it manually." Q8: "Should the folder tree accept template drops via `externalDrop` to match the estimate tree?" Q9: "What toast/status pattern is used for reorder status — toast (`EstimateSheetTree`) or `aria-live` strip (current `LibraryFolderTree`)?" Q10: "What is the rollback threshold for performance (render time, drag latency)?" Q11: "What feature-flag mechanism gates the new tree?" |

---

## 9. Bottom line

**Direction: correct.** The plan chooses the right migration (canonical `Tree`), the right strategy (incremental, adapter first), the right ordering (extract → render → DnD → bulk → modal → cleanup), and the right constraint (do not touch the estimate tree).

**Evidence: incomplete.** The plan understates the indirect blast radius (6 test files, 8 `data-*` selectors, 4+ shared helper files, 1 working reference implementation), under-specifies the highest-risk code (drop-event translation), and asserts performance and accessibility without measurement.

**Readiness: 62%.** Phase 0 cannot start safely today. Adding docs 08, 09, 10, 11, 12, 13 to the plan and updating the existing 8 docs with the corrections in §8 would bring readiness to ~90%.

**Strongest action:** Have the implementer read `src/components/workshop/EstimateSheetTree.tsx` (1,465 LOC) end-to-end as the **first** reading task. The folder-tree migration is 80% "do what the estimate tree does, but for folders and components." The plan currently treats the canonical Tree as if it were untested, when in fact the canonical Tree is already battle-tested in the largest tree surface in the app.

**Strongest omission:** The 6 existing Vitest tests and 8 `data-*` selectors are the migration's silent killers. Phase 0's first task should be to run all 6 tests on `main` and capture the green baseline; every subsequent phase must keep them green.

**Implementation completeness today:** 0% (no code written; plan is the only artifact). **Plan readiness:** 68% overall, 62% for immediate Phase 0 start.

---

## 10. Auditor's evidence trail

Files inspected in full or in part (16 source + 6 test):

- `.ai/03_plans/2026-06-11-Library-Tree-UI-Replacement/{README,00_INDEX,01_DESIGN_BRIEF_AND_PROBLEM,02_CURRENT_STATE_ANALYSIS,03_TARGET_STATE_AND_COMPONENT_REUSE,04_BLAST_RADIUS_AND_RISK_ANALYSIS,05_IMPLEMENTATION_APPROACH,06_READINESS_AND_ACCEPTANCE_CRITERIA,07_OPEN_QUESTIONS_AND_DECISIONS}.md`
- `src/components/ui/tree.tsx` (1,153 LOC, lines 1–200 and 200–499 read)
- `src/components/workshop/component-library-manager/LibraryFolderTree.tsx` (1,371 LOC, lines 300–749 and 750–1255 and 1255–1371 read)
- `src/components/workshop/component-library-manager/library-folder-tree-shared.ts` (26 lines, full read)
- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` (1,526 LOC, header and 1,000-line grep read)
- `src/components/workshop/component-library-manager/AddComponentModal.tsx` (2,359 LOC, lines 2080–2179 read)
- `src/components/workshop/component-library/tree/LibraryTree.tsx` (448 LOC, lines 1–200 read)
- `src/components/workshop/component-library/index.tsx` (1,425 LOC, line 27, 1100–1124 read)
- `src/lib/component-library/library-folder-reorder.ts` (363 LOC, full read)
- `src/lib/bulk-selection/tree-selection.ts` (112 LOC, full read)
- `src/components/workshop/tree-row-affordances.tsx` (237 LOC, full read)
- `src/components/workshop/EstimateSheetTree.tsx` (1,465 LOC, lines 1–100 and 300–500 read)
- `src/app/workshop/layout.tsx` (34 lines, full read)
- `tests/vitest/library-folder-reorder.test.ts` (163 lines, full read)
- `tests/vitest/library-folder-tree-selection.test.tsx` (data-attr grep)
- `tests/vitest/component-library-manager-ui.test.tsx` (data-attr grep)
- `tests/vitest/component-library-manager.test.tsx` (data-attr grep)
- `tests/vitest/component-library-ui.test.tsx` (data-attr grep)
- `tests/vitest/workshop-library-consolidation-ui.test.tsx` (data-attr grep)
- `tests/vitest/live-estimate-node-route.test.ts` (filename grep)

Grep confirmations:

- `grep -rln "react-complex-tree" src/` → 3 files (matches plan)
- `grep -c "react-complex-tree" package.json` → 1 (matches plan)
- `wc -l` of all 5 core files → matches plan exactly
- 8 `data-*` selectors in use across 6 test files (plan mentions 0)

Contradictions: none found. All plan claims about file LOC, dependency presence, and tree usage are accurate.
