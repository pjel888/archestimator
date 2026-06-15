# 02 — Current State Analysis

**Date:** 2026-06-13
**Method:** Direct source read + impact radius query

---

## 1. Route entry

```
/workshop/library/components
  └─ src/app/workshop/library/components/page.tsx
       └─ <LibraryComponentsRoute />
            └─ src/components/workshop/library/LibraryComponentsRoute.tsx
                 └─ <LibraryPageClient />
                      └─ src/components/workshop/LibraryPageClient.tsx
                           └─ <ComponentLibraryManager /> (dynamic)
                                └─ src/components/workshop/component-library-manager/ComponentLibraryManager.tsx
                                     └─ <ComponentLibraryTreePanel />
                                          └─ <LibraryFolderTreeSurface /> (dynamic)
                                               └─ src/components/workshop/component-library-manager/LibraryFolderTree.tsx
                                                    └─ <LibraryFolderTree />
                                                         └─ react-complex-tree ControlledTreeEnvironment + Tree
```

---

## 2. Tree implementations in detail

### 2.1 Canonical `Tree` (`src/components/ui/tree.tsx`)

| Property | Value |
|---|---|
| File | `src/components/ui/tree.tsx` |
| Lines | 1,153 |
| Props API | `TreeProps` — controlled `nodes: TreeNode[]`, `expandedIds`, `selectedIds`, `currentId`, `onDrop`, `canDrop`, `canDrag`, `onCheckboxToggle`, `renderRow`, `renderItem`, `externalDrop`, `rootDropZones`, etc. |
| Key capabilities | Keyboard navigation, drag handles, checkboxes, custom row rendering, external drops, root drop zones, controlled expansion |
| Consumers in workshop | `EstimateSheetTree`, `LibraryTree`, `TemplatesTree`, `TemplateStructureTree`, `TemplatesBrowseManager` |

### 2.2 `react-complex-tree` wrapper (`LibraryFolderTree.tsx`)

| Property | Value |
|---|---|
| File | `src/components/workshop/component-library-manager/LibraryFolderTree.tsx` |
| Lines | 1,371 |
| Library | `react-complex-tree` (`ControlledTreeEnvironment`, `Tree`, `InteractionMode`) |
| Data model | `Record<TreeItemIndex, TreeItem<LibraryFolderTreeItemData>>` keyed by synthesized item ids |
| Key capabilities | Mixed folder + component rows, folder DnD reorder, component DnD move, bulk selection, context-menu actions, search/filter, view-mode shell |
| Consumers | `ComponentLibraryManager.tsx`, `AddComponentModal.tsx` (via `LibraryFolderTreePicker`) |

### 2.3 Shared view-mode control

`ComponentViewControls` is defined inside `LibraryFolderTree.tsx` and imported by:
- `src/components/workshop/component-library/index.tsx` (estimate right sidebar)

That export must survive the migration, either by keeping it in place or extracting it.

---

## 3. Data models

### 3.1 Canonical `TreeNode`

```ts
interface TreeNode {
  id: string;
  label: string;
  ariaLabel?: string;
  children?: TreeNode[];
  draggable?: boolean;
  selectable?: boolean;
  icon?: ReactNode;
  isLeaf?: boolean;
  data?: Record<string, unknown>;
}
```

### 3.2 `react-complex-tree` `TreeItem`

Used only in `LibraryFolderTree.tsx`:

```ts
type LibraryFolderTreeItemData = {
  kind: "folder" | "component";
  folderId: string | null;
  label: string;
  item?: EstimateRowItem;
  parentFolderId?: string;
};

type LibraryFolderTreeModel = {
  items: Record<TreeItemIndex, TreeItem<LibraryFolderTreeItemData>>;
  folderItemIds: TreeItemIndex[];
};
```

### 3.3 Folder reorder domain model — complete export inventory

`src/lib/component-library/library-folder-reorder.ts` (363 LOC, fully read 2026-06-13):

| Export | Role | react-complex-tree coupling |
|---|---|---|
| `buildLibraryFolderTree(folders)` | Records → hierarchy (`LibraryFolderTreeNode[]`) | None |
| `buildLibraryFolderReorderPlan({ folders, draggedFolderId, targetParentId, targetIndex })` | **The neutral planner** — self-drop/cycle/no-op guards, index clamping, same-parent adjustment, sort-order renormalization (line 250) | **None** — this is why the migration is cheap (doc 09 §1) |
| `evaluateLibraryFolderDrop({ folders, draggedItemIds, target })` | ~35-line translator from `DraggingPosition` into the planner (line 299) | **Coupled** — replaced by `evaluateLibraryFolderTreeDrop`, deleted in PR 3 |
| `planLibraryFolderDelete(folders, folderId)` | Delete plan; children lift to deleted folder's parent with collision-free sort orders (line 220); unit-tested | None |
| `getLibraryFolderCreateSortOrder(siblings, placement)` | Sort order for "Add folder" with `"top" \| "bottom"` placement (line 129) | None |
| `getLibraryItemsForFolderNode(node, items)` | Catalogue scoping: explicit `libraryFolderId` first, taxonomy `categoryNodeId` fallback (line 356) | None |
| `toLibraryFolderTreeItemId` / `fromLibraryFolderTreeItemId` | `folder:<id>` mapping (lines 80–87) | Type-only (`TreeItemIndex` param → retyped to `string` in PR 3) |
| `LIBRARY_FOLDER_TREE_ID`, `LIBRARY_FOLDER_TREE_ROOT_ITEM_ID`, `LIBRARY_FOLDER_ID_PREFIX` (`"folder:"`), `LIBRARY_FOLDER_SORT_ORDER_STEP` (`10`) | Constants the adapter must preserve | None |
| `LibraryFolderRecord`, `LibraryFolderTreeNode`, `LibraryFolderKind` (`"taxonomy" \| "custom"`), `LibraryFolderReorderUpdate/Plan/Result`, `LibraryFolderDeletePlan`, `LibraryFolderCreatePlacement` | Types | `LibraryFolderReorderResult` is a discriminated union `{ ok: true, plan } \| { ok: false, code, message }` — the UI error path depends on it |

### 3.4 Shared constants file

`src/components/workshop/component-library-manager/library-folder-tree-shared.ts` (26 LOC) holds `COMPONENT_VIEW_MODES`, `ALL_COMPONENTS_FOLDER_ID` (`"all-components"`), `isAllComponentsFolderId()`, `ComponentViewMode`, `CreateLibraryFolderHandler`, `ReorderStatus` (idle/saving/saved/error). `LibraryFolderTree.tsx` re-exports these (lines 64–70). Phase-0 moves `ALL_COMPONENTS_FOLDER_ID`/`isAllComponentsFolderId` into the reorder lib (D14).

### 3.5 Shared tree helpers (reused as-is)

| File | Exports | Used by |
|---|---|---|
| `src/lib/bulk-selection/tree-selection.ts` (112 LOC) | `pruneSelection`, `toggleCascadeSelection`, `getSelectionState`, `dedupeSelectedRoots`, `selectVisibleIds`, `TreeSelectionNode`, `TreeSelectionState` | Both `EstimateSheetTree` and `LibraryFolderTree` — bulk-selection backbone |
| `src/components/workshop/tree-row-affordances.tsx` (237 LOC) | `TreeDragHandle`, `TreeSelectionCheckbox` (indeterminate-capable native checkbox), `TreeSelectionCountLabel`, `TreeBulkActionBar` | Current folder tree rows + bulk bar — kept per D13 |
| `src/components/ui/tree-panel-header.tsx` | `TreePanelHeader` (search, expand/collapse-all, leading actions, add actions) | `LibraryFolderTreeSurface` — unchanged |
| `src/components/workshop/workshop-tree.tsx` | `WorkshopTreeRow` + row sizing/icon-slot class constants | Row rendering — kept |

---

## 4. Consumer map

| Component | Uses | Tree library | Notes |
|---|---|---|---|
| `EstimateSheetTree.tsx` | `Tree` | Canonical | Left estimate tree; drag-to-reorder areas/groups |
| `component-library/tree/LibraryTree.tsx` | `Tree` | Canonical | Category/supplier/brand tree in estimate right dock |
| `component-library/tree/TemplatesTree.tsx` | `Tree` | Canonical | Templates tree in estimate right dock |
| `library/template-editor/TemplateStructureTree.tsx` | `Tree` | Canonical | Template structure editor |
| `library/templates-browse/TemplatesBrowseManager.tsx` | `Tree` | Canonical | Templates browse tree |
| `component-library-manager/LibraryFolderTree.tsx` | `ControlledTreeEnvironment` | react-complex-tree | Folder tree in library route |
| `component-library-manager/ComponentLibraryManager.tsx` | `LibraryFolderTreeSurface` | react-complex-tree | Orchestrates library route layout |
| `component-library-manager/AddComponentModal.tsx` | `LibraryFolderTreePicker` | react-complex-tree | Folder picker inside add-component modal |
| `component-library/index.tsx` | `ComponentViewControls` | n/a (imported from react-complex-tree file) | Estimate right sidebar view-mode dropdown |

---

## 5. CSS / dependency

- `src/app/workshop/layout.tsx` imports `react-complex-tree/lib/style-modern.css`.
- `package.json` contains `react-complex-tree` (verify exact version before removal).

---

## 6. Feature inventory of the current folder tree

| Feature | Implementation location | Complexity to port |
|---|---|---|
| Mixed folder + component rows | `LibraryFolderTree.tsx` `buildFolderTreeModel` | Medium |
| Folder expand/collapse | `react-complex-tree` `ControlledTreeEnvironment` | Low (canonical Tree supports this) |
| Folder drag-to-reorder | `library-folder-reorder.ts` + `LibraryFolderTree.tsx` `handleDrop` | High |
| Component drag-to-move | `LibraryFolderTree.tsx` `handleDrop` + `onMoveComponentToFolder` | Medium |
| Bulk folder selection | `LibraryFolderTree.tsx` `TreeBulkActionBar` + `TreeSelectionCheckbox` | Medium |
| Folder context-menu CRUD | `LibraryFolderTree.tsx` `createActionGroups` | Low |
| Search/filter | `LibraryFolderTree.tsx` `filterFolderTree`, `filterComponentItemsByFolderId` | Medium |
| "All Components" synthetic root | `LibraryFolderTree.tsx` `withAllComponentsRoot` — full behavior spec in doc 11 §2 | Low |
| Suppliers/Brands view modes | `LibraryFolderTreeSurface.tsx` already uses canonical `LibraryTree` | Already done |
| View-mode dropdown | `ComponentViewControls` inside `LibraryFolderTree.tsx` | Low (must preserve export) |
| Expand all / collapse all | `TreePanelHeader` actions in Surface (`:1182–1191`) + `getAllFolderTreeItemIds` | Low (ids unchanged) |
| Create-folder placement (top/bottom) | `getLibraryFolderCreateSortOrder` + `CreateLibraryFolderHandler` options | Low |
| Reorder status strip | Surface renders `role="status" aria-live="polite"` under the header (`:1204–1215`) | None (stays in Surface, D9) |
| Disabled-while-saving | `treeMutationPending` → `disabled` prop gates all CRUD with `disabledReason` strings | Low (port the gating) |

---

## 6b. Test & DOM contract

Six Vitest files pin the tree's behavior and `data-*` selectors; three of them mock `react-complex-tree` and must have those mocks deleted at swap time. Supporting tests also pin the route-level CSS boundary, shared row affordances, canonical Tree drag helpers, and folder action contracts. The full inventory, the eight-attribute DOM contract, and the per-PR gates live in **doc 08** — treat that doc as part of the current state, not an afterthought.

---

## 7. Key code-review-graph evidence

Impact-radius query for the three core files returned:

- 76 nodes directly changed
- 500+ nodes impacted within 3 hops
- 21+ additional files affected

The bulk of the impact is inside `ComponentLibraryManager.tsx` and `AddComponentModal.tsx`, which pass folder/component state into the tree surface. The estimate workspace and shared `Tree` primitive are **not** in the impact radius unless we choose to extend the primitive.
