# Tree Componentization Audit

Date: 2026-06-06

## 2026-06-06 Refinement Addendum

The tree-core API is now specified in `TREE_CORE_API_CONTRACTS.md`. Treat the signatures there as planning contracts, not implemented exports.

Measured static fixture caveat: `data/local/seed.json` is too small for large-tree performance decisions. It has one estimate, two sections, two line items, two floors, two spaces, and two cost-library items. Use `MEASUREMENT_BASELINE.md` before any virtualization or performance claim.

Blast-radius caveat: `WorkshopTree` is a shared `HIGH` risk surface according to GitNexus because it is called by share, template, component-library, and indirect estimate surfaces. Its 301-line size does not make it low risk.

## Tree Surface Inventory

### Shared Workshop Tree Chrome

File:

- `src/components/workshop/workshop-tree.tsx`

Current role:

- Shared recursive read-only tree renderer.
- Shared `WorkshopTreeRow` visual row with slots for drag handle, selection, leading content, context menus, and selection mode.
- Shared `WorkshopTreeTabs`.

Strengths:

- Good visual reuse seam already exists.
- Slot model allows drag handles and selection controls without nesting interactive elements incorrectly.
- Uses tree/group/treeitem semantics.
- Uses shared indentation and row sizing from `tree-visual-style.ts`.

Risks:

- Recursive rendering limits virtualization.
- `expandedIds` as an array encourages repeated membership checks during recursion.
- Row renderer callbacks are commonly inline in call sites.
- It cannot own editable drag/drop behavior, which is good, but that means a separate adapter layer is needed.

Recommendation:

- Keep this as the compact recursive renderer for small trees.
- Add internal `Set` normalization for expanded IDs.
- Extract generic tree utility types around node ID, parent ID, depth, sibling position, children lookup, and visible-row flattening.
- Add a sibling virtual row renderer for large read-only trees instead of forcing virtualization into this recursive component.

### Editable Estimate Tree

File:

- `src/components/workshop/EstimateSheetTree.tsx`

Current role:

- Editable hierarchy tree for estimate groups/areas.
- Controlled React Complex Tree environment.
- Drag/drop, root drop zones, rename, single delete, bulk delete, bulk selection, context menus, optimistic state, rollback, and panel rendering.

Strengths:

- React Complex Tree is an appropriate fit for drag/drop and controlled state.
- Shared `WorkshopTreeRow`, `TreeDragHandle`, `TreeSelectionCheckbox`, and `TreeBulkActionBar` are already reused.
- Optimistic update and rollback behavior exists.

Risks:

- Large file concentrates tree model, mutations, rendering, and shell.
- Search input appears in the shell, but tree search behavior is not clearly connected in the inspected render path.
- Rebuilding tree model, selection metadata, folder IDs, and drop data can become expensive.
- Bulk selection state and visible-row state are mixed with mutation state.

Reusable extraction plan:

- `useEstimateTreeModel`
- `useEstimateTreeViewState`
- `useEstimateTreeBulkSelection`
- `useEstimateTreeDropPlan`
- `useEstimateTreeMutations`
- `EstimateTreeSurface`
- `EstimateTreeRootDropZone`

Performance plan:

- Build a parent/children/index map once per tree data revision.
- Keep folder ID sets and descendant lists as memoized indexes.
- Use stable callbacks for RCT render hooks.
- Leave virtualization out of this first pass.

### Editable Library Folder Tree

File:

- `src/components/workshop/component-library-manager/LibraryFolderTree.tsx`

Current role:

- Controlled React Complex Tree surface for folder/category management.
- Search/filter, bulk selection, drag/drop reorder, row rendering, and optimistic behavior.

Strengths:

- Uses React Complex Tree for controlled editable tree behavior.
- Reuses `WorkshopTreeRow` and selection/drag affordances.
- Has specific drop validation and optimistic reorder logic.

Risks:

- Search/filter/model/drop/render behavior all live in one large file.
- `queueMicrotask` selection pruning suggests state synchronization complexity.
- Filtered model and selected item pruning can create subtle stale selection behavior.
- Drop validation and reorder planning should be pure and independently tested.

Reusable extraction plan:

- `useLibraryFolderTreeModel`
- `useLibraryFolderTreeFilter`
- `useLibraryFolderSelection`
- `useLibraryFolderDropController`
- `LibraryFolderTreeSurface`

Performance plan:

- Cache normalized labels once per item/folder version.
- Build a folder adjacency map and item placement map once per input revision.
- Move drop validation to pure utilities and keep UI component focused on RCT wiring.

### Component Library Sidebar Tree

Files:

- `src/components/workshop/component-library/tree/LibraryTree.tsx`
- `src/components/workshop/component-library/tree/buildLibraryTree.ts`

Current role:

- Read-only component-library hierarchy for sidebar insertion.
- Builds category/supplier/brand tree variants.
- Renders tree rows with shared `WorkshopTree`.

Strengths:

- Better split between tree building and tree rendering than other surfaces.
- Already uses the shared recursive tree shell.
- Provides route-specific component row visibility.

Risks:

- `buildLibraryTree.ts` repeatedly filters component items by brand/supplier when building variant trees.
- `getLibraryItemsForTreeNode` rebuilds a tree and then collects items for a selected node.
- Fuzzy category matching and exact category placement are mixed in one build path.

Reusable extraction plan:

- `buildLibraryTreeIndexes`
- `groupItemsBySupplier`
- `groupItemsByBrand`
- `collectLibraryItemsForNodeFromIndex`
- `LibraryTreeSurface`

Performance plan:

- Avoid rebuilding complete trees for item collection.
- Keep item grouping maps separate from visual tree creation.
- Memoize tree variant output by data revision and view mode.

### Share Estimate Tree Panel

File:

- `src/components/share/ShareEstimateTreePanel.tsx`

Current role:

- Share page tree panel with search, expand/collapse controls, row rendering, and mobile handling.

Strengths:

- Read-only and isolated from editable estimate mutations.
- Has a clear search and expansion surface.

Risks:

- Duplicates row renderer patterns from `ShareEstimateTreeView.tsx`.
- Recursively filters/clones trees on search.
- Mobile handling and expansion logic are local rather than shared.

Reusable extraction plan:

- `ShareTreeSurface`
- `ShareTreeNodeRow`
- `useShareTreeSearch`
- `useShareTreeExpansion`
- `filterShareTreeNodes`

Performance plan:

- Build a searchable flat index from share tree nodes.
- Keep recursive filtered tree for small trees, but prepare flattened visible rows for virtual mode.
- Share money formatting and row metadata between panel and main view.

### Share Estimate Tree View

File:

- `src/components/share/ShareEstimateTreeView.tsx`

Current role:

- Main share estimate tree view using `WorkshopTree` with a local row renderer.

Strengths:

- Uses the shared tree shell.
- Implements keyboard toggles for expandable rows.
- Has default expansion logic for desktop.

Risks:

- Duplicates tree node row renderer logic from share panel.
- Local `matchMedia` and default expansion logic are repeated.
- Handler props can be unstable across renders.

Reusable extraction plan:

- Use the same `ShareTreeSurface` and `ShareTreeNodeRow` as panel.
- Keep view-specific layout around it.

### Activity Scope Tree

File:

- `src/components/workshop/EstimateSheetContent.tsx`

Current role:

- Flat activity/history scope selector inside `ActivityHistoryModal`.

Strengths:

- Already works with flattened items rather than recursive DOM.
- Good candidate for virtualization or tree keyboard support because it is closer to a row-list model.

Risks:

- Buried inside the largest file.
- Search, collapse state, and row rendering are not reusable.
- Accessibility semantics need review against WAI-ARIA before calling it a complete tree widget.

Reusable extraction plan:

- `FlatTree`
- `useFlatTreeSearch`
- `useFlatTreeExpansion`
- `ActivityScopeTree`

Performance plan:

- This should be the pilot for a flat tree core because it has lower drag/drop risk than estimate/library editable trees.

### Share Tree Reconstruction

File:

- `src/lib/share/reconstruct-share-tree.ts`

Current role:

- Builds share tree nodes from snapshot nodes, designation fallback, or discipline fallback.

Strengths:

- Has explicit caps for row count and max depth.
- Prefers snapshot hierarchy when available.
- Separates reconstruction from rendering.

Risks:

- Renderer still needs to respect caps and not add unbounded DOM expansion.
- Any reusable tree core should not mutate the share reconstruction contract.

Recommendation:

- Keep this as a domain reconstruction utility.
- Add renderer-side tests that consume fixed reconstructed fixtures.

### Library Folder Reorder Utilities

File:

- `src/lib/component-library/library-folder-reorder.ts`

Current role:

- Builds folder trees, computes descendants, validates drop targets, and prepares reorder plans.

Strengths:

- Domain logic is already outside React.
- Good candidate for pure performance and correctness tests.

Risks:

- Some helper paths repeatedly filter and sort children during recursive operations.
- Descendant collection can be improved with a single adjacency map.

Recommendation:

- Build a folder index once per reorder operation.
- Reuse the index for descendants, sibling lookup, location lookup, and drop validation.

## Shared Tree Core Proposal

Add a small tree-core package under `src/components/workshop/tree-core/` or `src/components/ui/tree/`.

Recommended location:

- Start under `src/components/workshop/tree-core/`.

Reason:

- Current visual system and tree behavior are workshop-specific.
- Moving to `src/components/ui/tree/` too early would imply app-wide genericity before all consumers are proven.

Files:

- `types.ts`
- `tree-index.ts`
- `flatten-visible-tree.ts`
- `filter-tree.ts`
- `tree-aria.ts`
- `use-tree-expansion.ts`
- `use-tree-selection.ts`
- `TreeSurfaceShell.tsx`
- `TreeRowLayout.tsx`
- `VirtualizedTreeRows.tsx` only after dependency approval or native implementation decision.

Core type shape:

```ts
export type TreeNodeId = string;

export interface TreeAdapter<TNode> {
  getId(node: TNode): TreeNodeId;
  getLabel(node: TNode): string;
  getChildren(node: TNode): readonly TNode[];
  isSelectable?(node: TNode): boolean;
  isExpandable?(node: TNode): boolean;
}

export interface VisibleTreeRow<TNode> {
  id: TreeNodeId;
  node: TNode;
  depth: number;
  parentId: TreeNodeId | null;
  indexWithinParent: number;
  siblingCount: number;
  hasChildren: boolean;
  isExpanded: boolean;
}
```

## Reuse Without Over-Generalizing

Keep these separate:

- Data reconstruction: share trees, estimate trees, component library trees.
- Editable tree environment: React Complex Tree surfaces.
- Read-only tree rendering: recursive or flat/virtual rows.
- Visual row chrome: `WorkshopTreeRow` and `TreeRowLayout`.
- Interaction state: expansion, selection, focus, search, bulk actions.

Do not make one component own all of these at once.

## Tree Test Matrix

Add or update:

- `tests/vitest/tree-core-visible-flatten.test.ts`
- `tests/vitest/tree-core-filter.test.ts`
- `tests/vitest/tree-core-aria.test.ts`
- `tests/vitest/workshop-tree-row-affordances.test.tsx`
- `tests/vitest/library-folder-tree-selection.test.tsx`
- `tests/vitest/library-folder-reorder.test.ts`
- `tests/vitest/estimate-tree-bulk-selection.test.tsx`
- `tests/vitest/estimate-sheet-tree-dnd.test.tsx`
- `tests/vitest/share-estimate-tree-panel.test.tsx`
- `tests/vitest/share/reconstruct-share-tree.test.ts`

## Tree Acceptance Criteria

- Editable estimate tree still supports expand/collapse, rename, drag/drop, delete, bulk delete, and rollback.
- Editable library folder tree still supports search, selection pruning, drag/drop validation, reorder, and rollback.
- Share tree panel and share tree view use one row renderer and one expansion/search hook.
- Read-only tree rows expose correct `role`, `aria-expanded`, labels, and dynamic row metadata when virtualized.
- Large visible tree render paths can be measured with React Profiler before and after changes.
