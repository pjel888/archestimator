# Technical Architecture

This document defines the proposed APIs, contracts, and state models at the planning level.

## Shared UI Primitives

**New file:** `src/components/workshop/tree-row-affordances.tsx`

### Components
- `TreeDragHandle`: `DotsSixVertical` grip icon (16px). Visible on row hover/focus. `tabIndex={0}`, `aria-label="Drag to reorder"`.
- `TreeSelectionCheckbox`: Wrapper around `<input type="checkbox">`. Accepts `checked`, `indeterminate`, `onChange`, and `disabled`. Applies `event.stopPropagation()` on click and keydown.
- `TreeBulkActionBar`: Sticky toolbar component. Props: `count`, `entityType`, `onClear`, `onPrimaryAction`, `primaryActionLabel`, `primaryActionTone`, `disabledReason`.
- `SelectionCountLabel`: Formats count and entity type (e.g., "3 estimate sheets selected").

### Utility Functions
- `getVisibleTreeItemIds(treeItems, filterFn?)`: Returns IDs of currently rendered, selectable items.
- `getDescendantIds(node, allNodes)`: Recursively collects all child node IDs.
- `getSelectableDescendantIds(node, allNodes, canSelectFn)`: Collects descendant IDs that pass a selection eligibility check.
- `toggleTreeSelection(selectedIds, id, selectableIds?)`: Adds or removes an ID from a `Set`.
- `toggleCascadeSelection(selectedIds, node, allNodes, canSelectFn)`: Toggles a node and all its eligible descendants.
- `getTriStateForNode(nodeId, selectedIds, childrenMap)`: Returns `'checked'`, `'unchecked'`, or `'indeterminate'`.
- `filterSelectableIds(ids, canSelectFn)`: Filters a list of IDs based on eligibility.
- `formatBulkSelectionCount(count, entityType)`: Returns formatted string (e.g., "3 estimate sheets").
- `buildBulkDeletePreview(ids, allNodes)`: Returns summary object for confirmation modal (e.g., `{ groups: 1, areas: 3, rows: 12 }`).

## Shared Row Architecture

**File to extend:** `src/components/workshop/workshop-tree.tsx`

### Extended Props
```typescript
interface WorkshopTreeRowProps {
  // EXISTING (unchanged):
  as?: "button" | "div";
  depth?: number;
  selected?: boolean;
  editing?: boolean;
  intent?: boolean;
  className?: string;
  contextMenuGroups?: ActionMenuGroup[];
  contextMenuContentProps?: Omit<ComponentProps<typeof ContextMenuContent>, "children">;
  children: ReactNode;
  style?: CSSProperties;

  // NEW:
  /** Rendered at far left, before indent. For drag handle. */
  dragHandleSlot?: ReactNode;
  /** Rendered after indent, before children. For checkbox. */
  leadingSlot?: ReactNode;
  /** When true, row renders as div and applies selection mode styling. */
  selectionMode?: boolean;
}
```

### Layout Restructuring
```tsx
// Current: <button style={paddingLeft: depth * 20}> {children} </button>
// New:
<div className="flex items-center w-full">
  <span className="shrink-0 flex items-center justify-center w-6">
    {dragHandleSlot}
  </span>
  <div style={workshopTreeIndentStyle(depth)} className="flex-1 flex items-center min-w-0">
    {leadingSlot}
    {children}
  </>
</div>
```
**Rule:** Whenever `dragHandleSlot` or `leadingSlot` is provided, the row MUST render as `as="div"` to avoid invalid HTML (nesting interactive elements inside a button). The `as` prop is ignored in this case.

## Surface-Specific State Architecture

### 1. EstimateSheetTree
- **State:** `bulkSelectedNodeIds: Set<string>` (owned by `EstimateSheetTree`).
- **Reset Rules:** Cleared after successful bulk delete, or when route changes away from the estimate.
- **Server Action Integration:** Calls `deleteEstimateNodesBulk`. On success, replaces local tree with server response and updates route if `fallbackNodeId` changed.
- **RCT Integration:** Bulk selection is independent of RCT's `selectedItems` (which controls route/focus). Checkbox `onClick` calls `event.stopPropagation()`.

### 2. LibraryFolderTree
- **State:** `bulkSelectedFolderIds: Set<string>` (owned by `LibraryFolderTree` or parent `ComponentLibraryManager`).
- **Reset Rules:** Cleared after bulk operation or folder change.
- **Server Action Integration:** Calls `deleteLibraryFolder` (looped or bulk RPC). Synthetic root `ALL_COMPONENTS_FOLDER_ID` is excluded from selection.

### 3. ProjectEstimatesTable
- **State:** `selectedEstimateIds: Set<string>` (already exists in `ProjectEstimatesTable.tsx`).
- **Reset Rules:** Cleared after bulk delete or table data refresh.
- **Server Action Integration:** Calls `deleteEstimateSheetsBulk`. On success, TanStack table data is invalidated via React Query.

### 4. ProjectsPageClient
- **State:** `selectedProjectIds: Set<string>` (new, owned by `ProjectsPageClient`).
- **Reset Rules:** Cleared after bulk delete or page navigation.
- **Server Action Integration:** Calls `deleteProjectsBulk`. On success, React Query cache for projects is invalidated.

### 5. ComponentLibraryManager
- **State:** `selectedComponentIds: Set<string>` (new, owned by `ComponentLibraryManager`).
- **Reset Rules:** Cleared after bulk archive/delete.
- **Server Action Integration:** Calls `archiveCostLibraryComponentsBulk` or `deleteCostLibraryComponentsBulk`.

## Event Propagation Strategy

To prevent nested interactive element conflicts and RCT handler breakage:
1. Checkbox `onClick` and `onKeyDown` (Space/Enter) must call `event.stopPropagation()` and `event.preventDefault()`.
2. Drag handle is purely visual. RCT's row-level drag handlers remain on the row wrapper. The drag handle does not have its own drag initiator logic; it relies on the row's existing RCT integration.
3. Inline action buttons (e.g., rename, delete in context menu) must call `event.stopPropagation()` to prevent row click.