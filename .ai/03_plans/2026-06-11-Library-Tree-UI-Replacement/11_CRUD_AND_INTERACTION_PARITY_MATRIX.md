# 11 — CRUD & Interaction Parity Matrix

**Date:** 2026-06-13
**Purpose:** The single checklist of every operation, interaction state, and special case the new `FolderTree` must reproduce. This is the manual-QA script and the acceptance contract for the swap PR. "Same as today" is defined by the line references into the current implementation.

---

## 1. CRUD matrix

| # | Operation | Trigger | Handler / API | Expected result | Error state |
|---|---|---|---|---|---|
| 1 | Create folder (top) | Context menu "Add folder" / header add action | `onCreateFolder(parentId, { placement: "top" })`; sort order via `getLibraryFolderCreateSortOrder(siblings, "top")` | New folder first among siblings; root context menu creates at top level (`createParentId = null`, `LibraryFolderTree.tsx:536`) | Server error surfaced by manager; tree unchanged |
| 2 | Create folder (bottom) | Same, `placement: "bottom"` | `getLibraryFolderCreateSortOrder(siblings, "bottom")` | New folder last among siblings | Same |
| 3 | Rename folder | Context menu "Rename" | `onRenameFolder(folderId, currentName)` (`:573–580`) | Label updates; disabled while `treeMutationPending` with reason text (`:576`) | Manager-owned |
| 4 | Delete folder (single) | Context menu "Delete" (destructive tone) | `onDeleteFolder(folderId, currentName)` (`:581–590`); plan via `planLibraryFolderDelete` — children **lift to deleted folder's parent** with collision-free sort orders (reorder lib `:220–241`) | Folder gone; children re-parented, not deleted | Manager-owned |
| 5 | Delete folders (bulk) | `TreeBulkActionBar` delete | `onDeleteFolders([...ids])` (`:455–459`); returning `false` keeps selection | Selected folders deleted; selection cleared unless handler returns `false` | Disabled state + `disabledReason` (`:615–616`) |
| 6 | Reorder folder (drag) | Drag folder row | `evaluateLibraryFolderTreeDrop` → optimistic `onFoldersChange` → `reorderLibraryFolders({ updates })` → select dragged folder (doc 09 §4.4) | Same server-confirmed structure as old tree; **plus** top-level reorder now works (Decision D12) | Status strip `error` + rollback to snapshot |
| 7 | Move component (drag) | Drag component row onto/around folder | Resolve target (doc 09 §4.2) → `onMoveComponentToFolder(item, targetFolderId)` → `onSelectFolder(targetFolderId)` | Component re-foldered; target folder selected; status `saving → saved` (`:498–505`) | Null target → error `"Drop components onto a library folder."`; same-folder → saved-tone no-op (`:490–495`) |
| 8 | Bulk-select folders | Row checkbox | `toggleCascadeSelection` (`:451–453`); prune on tree change via `pruneSelection` (`:435–447`) | Checking a parent checks all selectable descendants; unchecking descendants unchecks ancestors; indeterminate via `getSelectionState` (`:777`) | n/a |
| 9 | Select folder | Click folder row / context "Select" | `onSelectFolder(folderId)` via primary action (`:633–636`) | Center catalogue scopes to folder subtree (`getLibraryItemsForFolderNode`) | n/a |
| 10 | Select parent via component | Click component row | `onSelectFolder(parentFolderId)` (`:744–747`) | Parent folder becomes selected | n/a |
| 11 | Expand/collapse one | Caret click (`InteractionMode.ClickArrowToExpand` equivalent: caret toggles, row click selects) or context menu Expand/Collapse (`:548–560`) | Controlled `expandedIds` | Only caret toggles expansion — row click must **select**, not toggle | n/a |
| 12 | Expand all / collapse all | `TreePanelHeader` actions (`:1182–1191`) | `getAllFolderTreeItemIds(displayedFolderNodes)` / `[]` | Whole tree expands/collapses; ids identical pre/post migration | n/a |
| 13 | Search / filter | `TreePanelHeader` search input | `filterFolderTree` + `filterComponentItemsByFolderId` (`:150–164, 224–233`) | Folders kept if name matches, descendant matches, or contains matching components; component rows filtered to matches; expansion state untouched (D7) | Empty result → dashed empty-state box: `No folders match "<query>".` (`:600–606`) |
| 14 | Switch view mode | "View by" leading action → `ComponentViewControls` menu (`:1192–1203`) | `changeViewMode` | Suppliers/Brands render existing canonical `LibraryTree`; Folders renders new `FolderTree`; no regression in either | n/a |
| 15 | Picker (modal) | `AddComponentModal` → `LibraryFolderTreePicker` | Same surface, `enableDragAndDrop` off in picker as configured today | Pick folder, create/rename/delete folders inside modal | Same as 1–4 |

---

## 2. Synthetic-root spec ("All Components")

Every behavior below is load-bearing; the original plan compressed these into one bullet.

| Behavior | Today | Contract |
|---|---|---|
| Node injection | `withAllComponentsRoot(folderNodes)` prepends id `folder:all-components` wrapping all top-level folders (`:209–222`) | Same — it is the single top-level `TreeNode` |
| Default selection | `effectiveSelectedFolderId = selectedFolderId ?? ALL_COMPONENTS_FOLDER_ID` when root shown (`:989`) | Same |
| Drag source | Blocked in `canDrag` (`:464–465`) | Same |
| Drop target | `inside` = move to top level; `before`/`after` = rejected (doc 09 §4.1) | New evaluator |
| Component drop target | Resolves to null → rejected (`getWritableDropFolderId`, `:290–295`) | Same |
| Context menu | No Rename, no Delete; "Add folder" creates with `parentId = null` (`:536, 570–592`) | Same |
| Checkbox | Rendered disabled with aria-label "Selection disabled for All Components" (`:803–809`); excluded from selection nodes (`selectable: false`, `:282–288`) | Same |
| Drag handle | Not rendered (`:800`) | Same |
| No component children | Root never lists component rows directly (`:250`) | Same |

---

## 3. Interaction-state matrix (visual QA)

Walk each state in the Folders view and compare against the current tree (and the estimate tree for canonical styling):

| State | Spec |
|---|---|
| Rest | `WorkshopTreeRow` styling, 10px text, `rounded-xs`, row min-height per `WORKSHOP_TREE_ROW_MIN_HEIGHT_CLASS` |
| Hover | `bg-surfaceMuted`; drag handle + checkbox reveal on hover (`TreeDragHandle`/`TreeSelectionCheckbox` reveal semantics) |
| Focus-visible | Ring `#c8d2df`, offset 2 (`:814`) |
| Selected folder | `aria-selected`, selected styling; `selectedTitleOnly` variant renders medium-weight label only (`:820–831`) |
| Bulk-checked (not selected) | `border-accent bg-accentSoft` (`:815`) |
| Indeterminate | Checkbox indeterminate visual via `TreeSelectionCheckbox` |
| Selection mode active | Handles/checkboxes pinned visible while any selection exists (`selectionMode` prop, `:727, 799`); rails pinned while context menu open (`railsPinned`) |
| Component bulk-selected | `border-accent bg-accentSoft` + `data-library-component-bulk-selected` (`:724, 741`) |
| Drag source / drop targets | Canonical `Tree` indicators for before/after/inside; invalid drops show not-allowed (canDrop false) |
| Disabled (mutation pending) | `treeMutationPending` → all CRUD disabled with `disabledReason` strings (`:566, 576, 586, 616`) |
| Reorder status | Strip under header: `role="status" aria-live="polite"`, red text on error (`:1204–1215`) |
| Search empty | Dashed `border-hairline bg-surfaceMuted` box, exact copy `No folders match "<query>".` |
| Keyboard | ArrowUp/Down move focus; ArrowRight/Left expand/collapse; Enter = primary action (select folder / select parent for component); Space = selection toggle; Esc closes menus. Canonical `Tree` provides these (tree.tsx 935–1001) — verify against current behavior, which routes primary action per `:633–636` |

---

## 4. QA walkthrough (run after swap PR and after picker PR)

1. Open `/workshop/library/components` → Folders view renders, "All Components" selected and expanded, counts match old tree.
2. Click folder → catalogue updates. Click component row → parent folder selected.
3. Caret click expands/collapses without changing selection. Expand-all / collapse-all from header.
4. Search: matching folders + components remain; clear search restores; empty query box for nonsense query.
5. Drag: nest folder into folder; reorder within a parent; **reorder two top-level folders (new — D12)**; drag folder onto component row (appends inside that row's folder); attempt drop before/after root (rejected).
6. Drag component to another folder (moves, selects target); to its own folder (saved-tone no-op); toward root (error status).
7. Context menus on real folder (5 actions) and root (no rename/delete).
8. Bulk: check parent (cascade), uncheck child (parent indeterminate), bulk delete, verify children-lift on single delete.
9. Switch to Suppliers, Brands, back to Folders — no regression, expansion state sane.
10. Add Component modal: pick folder, create/rename/delete inside picker (PR 2).
11. Keyboard-only pass over §3's keyboard row; screen-reader smoke: row announcements + status strip politeness.
12. While a folder save is in flight, verify all mutating actions disabled with reasons.
