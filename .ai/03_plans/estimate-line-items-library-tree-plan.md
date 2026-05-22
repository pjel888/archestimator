# Plan: Estimate Line Items in Library Folder Tree

**Date:** 2026-05-22
**Status:** Draft — awaiting review
**Scope:** `/workshop/projects/[projectId]/estimates/[nodeId]` — right sidebar library tree
**Companion spec:** `.ai/06_specs/current-project-estimates-component-library-spec.md`

> 2026-05-22 update: the shared Component Library source is now Supabase-backed through
> `getCurrentWorkspaceComponentLibrary()` and the `component_category_nodes`,
> `component_suppliers`, and `cost_library_items` tables. This plan remains a future
> estimate-local "Estimate Items" tree concept, not the global library source contract.

---

## 1. Problem Statement

The estimates page right sidebar (`EstimateRightSidebar`) currently displays the **entire component library** (`estimateLibraryItems`) organized by category folders. This is useful for adding *new* components to an estimate, but it does not help the user browse or manage the **line items already in their estimate**.

The user wants the estimates page to show the same folder/category tree structure as `/workshop/components`, but with **the current estimate's line items** as the leaf nodes instead of all library components. These line items should be draggable into estimate areas, enabling:
- Quick browsing of existing line items by category
- Moving/copying line items between areas via drag-and-drop
- A clear mental model: "here are all the items I've already added, organized the same way as the library"

---

## 2. Current Architecture (Verified)

### `/workshop/components` page tree
- **Component:** `ComponentLibraryTreePanel` → `LibraryTree`
- **Data source:** shared Supabase Component Library dataset (`componentCategoryNodes`, `component_suppliers`, `cost_library_items`) with static taxonomy/items retained only as fallback fixtures.
- **Build function:** `buildLibraryTree(tab, items, favoriteIds, recentIds, { categoryTree, suppliers })` in `buildLibraryTree.ts`
  - For `"categories"` tab: clones the provided taxonomy tree, calls `attachComponentsToTree(tree, items, (item) => item.category)`
  - Components are matched to folders by `categoryNodeId` first, then legacy fuzzy category matching
  - Result: `LibraryTreeNode[]` with folders as internal nodes and components as leaf nodes (`node.item` set)
- **Rendering:** `LibraryTree` → recursive `TreeNode` → `LibraryFolderRow` (folders) / `LibraryItemRow` (components)
- **Interaction:** Click folder = select/toggle; Click component = preview; Drag component = `application/x-archestimator-library-item`

### Estimates page right sidebar (`EstimateRightSidebar`)
- **Component:** `EstimateRightSidebar` in `src/components/workshop/component-library/index.tsx`
- **Data source:** `initialLibraryItems` from the same Supabase Component Library dataset as `/workshop/components`
- **Tabs:** Categories / Suppliers / Custom (same as components page)
- **Tree builder:** Same `buildLibraryTree` + `filterTree` pipeline
- **Drag:** `handleItemDragStart` sets `application/x-archestimator-library-item`
- **Add:** `addComponent` dispatches `archestimator:add-library-item` CustomEvent or calls `onInsertComponent`
- **CRUD:** Supports create, edit, delete, favorite, duplicate (modifies local `libraryItems` state)

### Estimate data model
- **Tree nodes:** `EstimateTreeNode[]` — recursive `group`/`area` hierarchy
- **Row items:** `EstimateRowItem[]` nested under each `area` node's `estimateRowItems`
- **Row item shape:** Same as library item (`EstimateRowItem`), with fields: `id`, `material`, `category`, `supplier`, `unit`, `itemCost`, `quantity`, `source`, etc.
- **Key insight:** `EstimateRowItem.category` exists and is populated, so the existing `attachComponentsToTree` fuzzy matcher will work out-of-the-box.

---

## 3. Target State

The estimates page right sidebar gains a **new view/tab** (or view-mode toggle) that shows:

1. **Same folder structure** as the Categories tab of the component library
2. **Only line items from the current estimate** as leaf nodes under their matching category folders
3. **Empty folders pruned** — if no line items match a category, the folder is hidden
4. **Line items are draggable** using the same `application/x-archestimator-library-item` data type
5. **Clicking a line item** previews it in the bottom panel (same as today)
6. **Adding a line item** from this tree inserts a *copy* of that row into the selected area (same drag/drop flow)

This is **additive** — the existing "Full Library" view remains available so users can still add new components.

### UI Placement Options (Decision Required)

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A. New tab** | Add a 4th tab "Estimate Items" next to Categories/Suppliers/Custom | Simple, consistent with existing tab pattern | Tab bar gets crowded; tabs are per-tree-mode, not per-data-source |
| **B. View toggle** | Replace the tab bar with a segmented control: "Full Library" / "This Estimate" | Clear mental model; uses same tree | More UI chrome |
| **C. Sub-tree inside Categories** | Under the existing Categories tab, add a top-level folder "This Estimate" containing the line-item subtree | No new chrome; naturally scoped | Deep nesting; mixes global library with estimate-local items |
| **D. Left panel switch** | Add a toggle/mode to the left `EstimateSheetTree` to switch between "Areas" and "Items by Category" | Central browsing location | Breaks left tree's navigation purpose; complex |

**Recommendation: Option A (new tab "Estimate Items")** — it is the smallest change, leverages 100% of existing infrastructure, and keeps the mental model clean: each tab is a different lens on items.

---

## 4. Implementation Plan

### Phase 1: Data Pipeline (Extract + Flatten Estimate Row Items)

**Goal:** Make all estimate row items available to `EstimateRightSidebar`.

**Changes:**

1. **`src/components/workshop/EstimateSheetContent.tsx`**
   - Flatten all `EstimateRowItem`s from the `nodes` prop:
     ```ts
     const estimateRowItems = useMemo(() => {
       const items: EstimateRowItem[] = [];
       function walk(nodes: EstimateTreeNode[]) {
         for (const node of nodes) {
           if (node.estimateRowItems) items.push(...node.estimateRowItems);
           if (node.children) walk(node.children);
         }
       }
       if (nodes) walk(nodes);
       return items;
     }, [nodes]);
     ```
   - Pass `estimateRowItems` as a new prop to `EstimateRightSidebar`.

2. **`src/components/workshop/component-library/index.tsx`**
   - Add `estimateRowItems?: EstimateRowItem[]` to `EstimateRightSidebarProps`.

### Phase 2: New Tree Tab "Estimate Items"

**Goal:** Render estimate row items in the same `LibraryTree` using the category taxonomy.

**Changes:**

1. **Extend `LibraryTreeTab` type** in `src/components/workshop/component-library/tree/types.ts`:
   ```ts
   export type LibraryTreeTab = "categories" | "suppliers" | "custom" | "estimate-items";
   ```

2. **Extend `buildLibraryTree`** in `buildLibraryTree.ts`:
   - Add `estimate-items` branch:
     ```ts
     if (tab === "estimate-items") {
       const tree = cloneTree(componentCategoryTree);
       attachComponentsToTree(tree, items, (item) => item.category);
       return sortTreeNodes(pruneEmptyFolders(tree));
     }
     ```
   - Note: The existing `attachComponentsToTree` and `pruneEmptyFolders` already do exactly what we need.

3. **Update `EstimateRightSidebar` tab UI**:
   - Add the 4th tab button with label "Estimate Items".
   - When `activeTab === "estimate-items"`, pass `estimateRowItems` (or `[]`) to `buildLibraryTree` instead of `libraryItems`.
   - Handle `expandedNodeIdsByTab["estimate-items"]` in state.

### Phase 3: Drag/Drop Integration

**Goal:** Line items from the "Estimate Items" tab are draggable into estimate areas.

**Current state:**
- `LibraryItemRow` is `draggable` and calls `onItemDragStart`.
- `EstimateRightSidebar.handleItemDragStart` serializes the item as `application/x-archestimator-library-item`.
- `EstimateSheetContent` drop zones accept this type and call `insertLibraryItem` → `insertEstimateRowItemFromLibrary`.

**Changes needed: NONE.**

The existing drag/drop pipeline already works because:
1. `EstimateRowItem` is the same type as library items
2. `handleItemDragStart` serializes the entire item object
3. The drop handler in `EstimateSheetContent` deserializes and inserts it
4. Server action `insertEstimateRowItemFromLibrary` handles the insertion

**One consideration:** When dragging a line item from the "Estimate Items" tab, we probably want to insert a **copy** (same as dragging from the full library). The existing `insertLibraryItems` flow does exactly this. The row gets a new ID on insertion.

### Phase 4: Preview Panel + Actions

**Goal:** Clicking a line item in the "Estimate Items" tab shows the preview panel.

**Current state:**
- `previewItemId` state tracks which item is being previewed.
- `previewItem` is looked up from `libraryItems`.

**Problem:** In "Estimate Items" tab, `previewItem` lookup must search `estimateRowItems`, not `libraryItems`.

**Changes:**

1. **`EstimateRightSidebar`**:
   - Derive `previewItem` based on active tab:
     ```ts
     const previewItem = useMemo(() => {
       if (activeTab === "estimate-items" && estimateRowItems) {
         return estimateRowItems.find((item) => item.id === previewItemId) ?? null;
       }
       return libraryItems.find((item) => item.id === previewItemId) ?? null;
     }, [activeTab, estimateRowItems, libraryItems, previewItemId]);
     ```

2. **Action handlers** (`onAdd`, `onEdit`, `onDuplicate`, `onFavorite`, `onDelete`):
   - In "Estimate Items" tab, `onAdd` should work (insert copy into selected area).
   - `onEdit`, `onDuplicate`, `onFavorite`, `onDelete` should be **disabled or no-ops** for estimate line items, because these actions mutate the *library* state, not the estimate. We don't want users editing the library view when they're looking at estimate rows.
   - Simplest: pass `readOnly={activeTab === "estimate-items"}` to `LibraryTree`, and have `LibraryItemRow` suppress action buttons when read-only.

### Phase 5: Empty State

**Goal:** Show a helpful empty state when the estimate has no line items.

**Changes:**

1. In `EstimateRightSidebar`, when `activeTab === "estimate-items"` and `estimateRowItems.length === 0`:
   - Show an `EmptyState` component with:
     - Icon: `<SquaresFour size={20} />`
     - Title: "No line items yet"
     - Description: "Add components from the Categories tab to see them here."

---

## 5. Files to Touch

| File | Change |
|------|--------|
| `src/components/workshop/component-library/tree/types.ts` | Extend `LibraryTreeTab` to include `"estimate-items"` |
| `src/components/workshop/component-library/tree/buildLibraryTree.ts` | Add `estimate-items` branch using `componentCategoryTree` + `attachComponentsToTree` |
| `src/components/workshop/component-library/tree/LibraryItemRow.tsx` | Optionally accept `readOnly` prop to suppress add/duplicate/favorite/delete buttons |
| `src/components/workshop/component-library/tree/LibraryTree.tsx` | Pipe `readOnly` prop through to `LibraryItemRow` |
| `src/components/workshop/component-library/index.tsx` | Add `estimateRowItems` prop, 4th tab, tab-aware preview lookup, empty state |
| `src/components/workshop/EstimateSheetContent.tsx` | Flatten row items from `nodes`, pass to `EstimateRightSidebar` |

---

## 6. Verification Plan

### Manual testing checklist

1. Open an estimate with line items
2. Click "Estimate Items" tab in the right sidebar
3. Verify:
   - [ ] Folder structure matches the Categories tab
   - [ ] Only line items from the current estimate appear as leaf nodes
   - [ ] Folders with no matching line items are hidden
   - [ ] Line items are sorted alphabetically within folders
   - [ ] Expand/collapse works
   - [ ] Search filters the tree
   - [ ] Clicking a line item shows the preview panel
   - [ ] Preview panel shows correct data
   - [ ] Dragging a line item and dropping it on an area inserts a copy
   - [ ] Empty state shows when estimate has no line items
   - [ ] Switching back to "Categories" tab still shows full library
   - [ ] Full library tab still allows add/edit/favorite/delete

### Unit tests

- `buildLibraryTree("estimate-items", ...)` returns correctly nested tree
- `pruneEmptyFolders` removes unmatched category branches
- `attachComponentsToTree` matches by `item.category` (existing test coverage)
- `filterTree` works on estimate-items tree (existing test coverage)

---

## 7. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Duplicate IDs between library items and estimate row items | Medium | High | Estimate row items already have unique IDs. If a library item and estimate row share an ID, preview lookup could be ambiguous. Mitigation: scope preview lookup by active tab. |
| Large estimates with 500+ line items slow down tree build | Low | Medium | `buildLibraryTree` runs in `useMemo` and is already O(n) per item. 500 items × ~50 taxonomy nodes is trivial. Profile if needed. |
| User confusion between "Categories" (full library) and "Estimate Items" (current estimate) | Medium | Low | Clear tab labels + empty state description explain the difference. |
| Drag/drop payload from estimate items may carry stale `source_snapshot` | Low | Medium | The drag payload is the full `EstimateRowItem` object. When dropped, `insertEstimateRowItemFromLibrary` will create a fresh row. This is the same behavior as today. |

---

## 8. Follow-up Ideas (Out of Scope)

- **Line item count badge** on the "Estimate Items" tab button showing total line items
- **"Go to area" action** on each line item row — jump to the area that contains this item
- **Multi-select + bulk actions** in the estimate items tree (delete from estimate, move to area)
- **Supplier / Custom tabs for estimate items** — apply the same pattern to suppliers and custom groupings
- **Left panel integration** — a toggle on `EstimateSheetTree` to switch between "Areas" and "Items by Category" views

---

## 9. Decision Checkpoints

Before implementation begins, confirm:

1. **UI Placement:** Is "new tab in right sidebar" (Option A) the correct approach? Or do you prefer a different option (B/C/D)?
2. **Read-only actions:** In the "Estimate Items" tab, should clicking a line item allow ANY actions (e.g., delete from estimate), or only preview + drag?
3. **Drag behavior:** When dragging from "Estimate Items", should it insert a **copy** (new row) or **move** the existing row to the target area?
4. **Scope:** Should this also apply to Suppliers and Custom tabs, or only Categories?
