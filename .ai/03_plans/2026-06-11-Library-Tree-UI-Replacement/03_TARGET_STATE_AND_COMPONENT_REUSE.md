# 03 — Target State & Component Reuse

**Date:** 2026-06-13

---

## 1. Target architecture

After migration, the `/workshop/library/components` route uses the canonical `Tree` primitive for **all three view modes**:

```
/workshop/library/components
  └─ ComponentLibraryManager
       └─ ComponentLibraryTreePanel
            └─ LibraryFolderTreeSurface
                 ├─ Folders view    → NEW canonical Tree wrapper (FolderTree)
                 ├─ Suppliers view  → existing LibraryTree (canonical Tree)
                 └─ Brands view     → existing LibraryTree (canonical Tree)
```

The folder picker in `AddComponentModal` uses the same `FolderTree` wrapper.

`react-complex-tree` and its CSS import are removed.

---

## 2. Component reuse decisions

### 2.1 Reuse / extend

| Component | Decision | Rationale |
|---|---|---|
| `src/components/ui/tree.tsx` (`Tree`) | **Reuse** | The canonical primitive already supports controlled expansion, selection, drag, drop, custom row rendering, and context menus. No changes required. |
| `src/components/workshop/EstimateSheetTree.tsx` | **Primary reference** | The working canonical-Tree consumer: domain drop planner wiring, optimistic state, bulk selection. The pattern map is doc 10 — read it before `LibraryTree`. |
| `src/components/workshop/component-library/tree/LibraryTree.tsx` | **Secondary reference** | Already wraps `Tree` for category/supplier/brand trees in this same Surface; useful for node-building and checkbox patterns. |
| `src/lib/bulk-selection/tree-selection.ts` | **Reuse** | `pruneSelection`, `toggleCascadeSelection`, `getSelectionState` — already the folder tree's selection backbone; unchanged. |
| `src/components/workshop/tree-row-affordances.tsx` | **Reuse** | `TreeDragHandle`, `TreeSelectionCheckbox`, and `TreeBulkActionBar` are already shared affordances used by `LibraryFolderTree`. Keep them (D13 — not the canonical Tree's built-in checkbox, for test-contract reasons). |
| `src/components/workshop/workshop-tree.tsx` (`WorkshopTreeRow`) | **Reuse** | Used by the current `LibraryFolderTree` for row styling. Continue using it for the new folder tree rows. |
| `src/components/ui/tree-panel-header.tsx` | **Reuse** | Already used by both estimate tree and library tree surface. No change. |
| `src/components/workshop/component-library-manager/library-folder-tree-shared.ts` | **Reuse / reshuffle** | Holds `COMPONENT_VIEW_MODES`, `ALL_COMPONENTS_FOLDER_ID`, `ReorderStatus`. Phase 0 moves the root-id constant into the reorder lib (D14); everything else stays. |
| `src/components/workshop/ResizableSidePanel.tsx` | **Reuse** | Layout shell stays the same. |

### 2.2 Create new

| Component | Purpose |
|---|---|
| `FolderTree` (new) | Canonical-Tree wrapper for folder + component rows. Accepts `LibraryFolderTreeNode[]` + `EstimateRowItem[]` and renders a mixed tree with folder reorder, component move, bulk selection, and context menus. |

Do **not** create a `useFolderTree` hook in PR 1 by default. Keep helper functions local to `FolderTree.tsx` unless the file becomes harder to review than the current component; this migration is a tree swap, not an abstraction pass (D15).

### 2.3 Retire

| Component | Retirement action |
|---|---|
| `LibraryFolderTree.tsx` internal `ControlledTreeEnvironment` usage | Remove once `FolderTree` replaces it. |
| `react-complex-tree` dependency | Remove from `package.json` after verification. |
| `react-complex-tree/lib/style-modern.css` import | Remove from `src/app/workshop/layout.tsx`. |
| `library-folder-reorder.ts` `DraggingPosition` coupling | Replace the thin `evaluateLibraryFolderDrop` translator with `evaluateLibraryFolderTreeDrop` (doc 09); planner core untouched; old translator + type imports deleted in PR 3. |

---

## 3. Canonical `Tree` contract for the folder tree

The new `FolderTree` will consume the canonical `Tree` with these props:

```tsx
<Tree
  nodes={folderTreeNodes}          // TreeNode[] built from LibraryFolderTreeNode[] + items
  ariaLabel="Library folders"
  expandedIds={expandedFolderIds}  // same `folder:`-prefixed ids as today (D7: no auto-expand on search)
  onExpandedChange={setExpandedFolderIds}
  currentId={selectedFolderId}
  draggable
  canDrag={handleCanDrag}          // doc 09 §4.3
  canDrop={handleCanDrop}
  onDrop={handleDrop}              // doc 09 §4.4
  onRowClick={handleRowClick}      // folder → onSelectFolder; component → select parent folder
  emptyState={searchEmptyState}    // exact current "No folders match" block
  renderItem={renderFolderTreeItem} // NOT renderRow — see below
/>
```

**`renderItem`, not `renderRow`.** The two hooks differ (`tree.tsx:193–195`): `renderRow(node, depth, isSelected, isExpanded)` replaces only the label area and keeps the default row chrome, while `renderItem(state, rowProps)` replaces the whole row (consumer spreads `rowProps` for ARIA/DnD/keyboard bindings). The estimate tree uses `renderRow` because it only customizes the label; the folder tree **must use `renderItem`** because it emits row-level `data-*` test selectors, renders two-line component rows, and mounts `WorkshopTreeRow` with `dragHandleSlot`/`leadingSlot`/`contextMenuGroups`. Full reasoning and the porting guide: doc 10 §2. The current markup at `LibraryFolderTree.tsx:694–837` is the visual spec.

`renderFolderTreeItem` branches on `node.data.kind`:
- Folder rows → caret (with `data-library-folder-arrow-id`/spacer), folder icon, label, bulk checkbox (`TreeSelectionCheckbox`, indeterminate-capable), drag handle, context menu groups
- Component rows → package icon, name/supplier + price/unit two-line layout, optional checkbox, drag handle, click selects parent folder

Bulk selection runs through the existing `tree-selection.ts` cascade + `TreeBulkActionBar` above the tree (not the canonical Tree's `selectedIds` multi-select), exactly as today.

---

## 4. Data-model adapter

A new adapter maps the existing hierarchical folder model to `TreeNode[]`:

```ts
function buildFolderTreeNodes(
  nodes: LibraryFolderTreeNode[],
  itemsByFolderId: Map<string, EstimateRowItem[]>
): TreeNode[] {
  return nodes.map((node) => {
    const isSyntheticRoot = isAllComponentsFolderId(node.folderId);
    const componentItems = isSyntheticRoot ? [] : (itemsByFolderId.get(node.folderId) ?? []);
    const componentChildren: TreeNode[] = componentItems.map((item) => ({
      id: toLibraryComponentTreeItemId(node.folderId, item.id),
      label: getComponentName(item),
      isLeaf: true,
      draggable: true,
      selectable: false,        // components participate via parent folder selection, not bulk
      icon: <Package … />,
      data: { kind: "component", item, parentFolderId: node.folderId },
    }));

    return {
      id: node.id,
      label: node.label,
      isLeaf: false,
      draggable: !isSyntheticRoot,
      selectable: !isSyntheticRoot,
      icon: <FolderActionIcon />,
      children: [
        ...(node.children ? buildFolderTreeNodes(node.children, itemsByFolderId) : []),
        ...componentChildren,
      ],
      data: { kind: "folder", folderId: node.folderId },
    };
  });
}
```

This is analogous to the existing `buildFolderTreeModel` but outputs `TreeNode[]` instead of `Record<TreeItemIndex, TreeItem<...>>`.

---

## 5. Domain-logic adapter for DnD — RESOLVED (D4, doc 09)

The original "Option A vs Option B" framing assumed the planner itself was coupled to `react-complex-tree`. It is not: `buildLibraryFolderReorderPlan({ folders, draggedFolderId, targetParentId, targetIndex })` is **already exported, neutral, and unit-tested** — only the ~35-line `evaluateLibraryFolderDrop` translator and two type imports are coupled.

The decided approach: add a new ~40-line `evaluateLibraryFolderTreeDrop` translator for canonical `(draggedId, targetId, position)` events that calls the **unchanged** planner core, plus a small component-drop target resolver mirroring `getComponentDropTargetFolderId`. The old translator is deleted in the cleanup PR. The exact translation tables (folder drags, component drags, synthetic-root cases, guards, post-drop side effects) and the unit-test list are in **doc 09** — implement from that contract, not from this section.

One deliberate behavior change rides along: the new translator makes top-level folder reorder work, which the old one silently rejected (D12, doc 09 §4.1).

---

## 6. Visual target

The folder tree should visually match the estimate tree:

- 10px text, SF Pro stack, regular/medium weights only
- `rounded-xs` (3px) on interactive elements
- Hover `bg-surfaceMuted`, selected `bg-accentSoft`; bulk-checked rows `border-accent bg-accentSoft`
- Drag handles in the left rail (hidden until hover/selection, using `group/tree`)
- Checkboxes for bulk folder selection (revealed on hover, pinned while selection active)
- Expand/collapse carets aligned with canonical `Tree`
- Context menus via existing `ContextMenu` + `ContextActionMenuContent`
- Focus-visible ring `#c8d2df` with offset 2 (matches current rows)
- Search empty state: dashed `border-hairline bg-surfaceMuted` box with `No folders match "<query>".`
- Reorder status strip under the header (`role="status" aria-live="polite"`, red on error) — unchanged, owned by the Surface

No new radius values, font sizes, or colors. The complete per-state matrix (hover, focus, selected, drag-source, drop-target, indeterminate, disabled-while-saving, etc.) is doc 11 §3 — it is the visual QA checklist for the swap PR.
