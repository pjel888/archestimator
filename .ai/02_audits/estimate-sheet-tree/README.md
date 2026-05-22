# Audit: EstimateSheetTree Component

**Date**: 2026-05-22
**Scope**: `src/components/workshop/EstimateSheetTree.tsx` (1320 lines)
**Auditor**: Hephaestus (automated analysis)
**Status**: Complete — no code changes, pure audit
**Revision**: 4 (fourth-pass line-reference and count verification)

---

## 1. Executive Summary

`EstimateSheetTree` is the primary left-panel tree navigator for the estimate workspace. It renders a drag-and-drop tree of estimate nodes (groups + areas) inside a resizable side panel, with inline rename, optimistic CRUD, and route-synced selection. At **1,320 lines**, it's the largest single component in the project and carries **high architectural risk** due to its concentration of state, event handling, and server-action orchestration.

### Risk Level: **HIGH** ⚠️

**Blast radius**: Changes affect 100 files. The component is used by a single page (`ProjectEstimateNodePage`) but its dependency tree touches 369 nodes within 2 hops.

### Top Findings

| # | Finding | Severity | Lines |
|---|---------|----------|-------|
| 1 | Deep recursive clones on every tree mutation | High | 90-96, 105-121, 123-130 |
| 2 | Excessive imperative refs (12) used as mutable state bypass | Medium | 208-219 |
| 3 | Prop-sync system with content signatures is complex and fragile | Medium | 242-282 |
| 4 | `getEstimateTreeContentSignature` has 5 static call sites and can run repeatedly across render/effect/updater paths | High | 215-216, 243, 250, 272 |
| 5 | `buildTreeModel` re-materializes entire tree model every render | Medium | 147-176, 233 |
| 6 | 25 `useCallback` hooks — large surface for stale closures | Medium | 242-771 |
| 7 | Inline rename editing has complex focus/blur/context-menu interplay | Medium | 284-312, 906-1001 |
| 8 | Redundant deep-clone logic exists in both component and estimate-tree-reorder lib | Low | 90-96 vs lib:55-61 |

---

## 2. Architecture Overview

### 2.1 Component Hierarchy

```
ProjectEstimateNodePage (RSC, server component)
  └── EstimateSheetTree ("use client")
        ├── ResizableSidePanel
        │     └── (children: search, toolbar, tree, modal)
        ├── SearchInput
        ├── HeaderIconToolbar (expand/collapse/add buttons)
        ├── Status bar (reorder status messages)
        ├── ControlledTreeEnvironment (react-complex-tree)
        │     ├── Root drop zones (top/bottom)
        │     ├── Tree (react-complex-tree)
        │     │     └── Per-node: drag handlers, context menu, rename inline edit
        │     └── Nest intent tooltip
        └── Modal (delete confirmation)
```

### 2.2 Data Flow

```
Props (projectId, estimateId, projectName, selectedNodeId, nodes)
  │
  ├── useEstimateAreaTreeQuery → localNodes (react-query cache)
  │     └── setLocalNodes / snapshot / restore / prepareOptimisticUpdate
  │
  ├── useEstimateWorkspaceSelection → activeSelectedNodeId (zustand store, cross-component)
  ├── useEstimateWorkspaceExpansion → expandedNodeIds (zustand store, cross-component)
  │
  ├── buildTreeModel(localNodes) → treeModel (memoized)
  ├── getEstimateRouteNodeIdFromPathname → currentRouteNodeId (memoized)
  │
  └── Server actions (createEstimateNode, deleteEstimateNode, renameEstimateNode, reorderEstimateTreeNodes)
        └── Supabase RPC / DB mutations
```

### 2.3 State Inventory

**Local useState (9):**
| Variable | Type | Purpose |
|----------|------|---------|
| `reorderStatus` | `ReorderStatus` (discriminated union) | Mutation status display |
| `nestIntentHint` | `NestIntentHint \| null` | Drag-over tooltip target |
| `activeRootDropEdge` | `RootDropEdge \| null` | Root-level drop indicator |
| `editingNodeId` | `string \| null` | Active rename target |
| `editingNodeName` | `string` | Rename input value |
| `editingNodeError` | `string \| null` | Rename validation error |
| `deleteTargetNode` | `EstimateTreeNode \| null` | Delete modal target |
| `deletePending` | `boolean` | Delete operation in flight |
| `focusedOverride` | `{ routeNodeId, item } \| null` | Tree focus override |

**useRef (12):**
| Variable | Purpose | Concern |
|----------|---------|---------|
| `pendingReordersRef` | Counter for in-flight reorder operations | Atomic counter, safe |
| `suppressPrimaryActionUntilRef` | Timestamp to suppress click after drag | Timer-based, fragile |
| `draggedTreeItemRef` | Current dragged tree item (cross-handler) | Mutable state, no reactivity |
| `renameCommitInFlightRef` | Prevents double-rename submission | Guard flag, reasonable |
| `renameInputRef` | DOM ref for inline rename input | Standard pattern |
| `suppressContextMenuCloseAutoFocusRef` | Prevents context menu stealing focus | Complex interplay |
| `ignoreRenameBlurDuringContextMenuCloseRef` | Allows blur during context menu close | Complex interplay |
| `lastAcceptedPropSignatureRef` | Content signature of last accepted props | Part of prop-sync system |
| `lastObservedPropSignatureRef` | Content signature of last observed props | Part of prop-sync system |
| `lastObservedPropNodesRef` | Last observed props nodes reference | Part of prop-sync system |
| `stalePropSignatureToIgnoreRef` | Signature to skip on next sync | Part of prop-sync system |
| `pendingPropNodesRef` | Props deferred during reorder | Part of prop-sync system |

**External Store (zustand):**
- `useEstimateWorkspaceState` — selected node IDs and expanded node IDs per estimate
- Persisted across component lifecycle, survives remounts

**React Query:**
- `useEstimateAreaTreeQuery` — tree data with optimistic update primitives
- Revision tracking via separate query cache key

---

## 3. Dependency Analysis

### 3.1 UI Primitives (7 imports)

| Import | Source | Usage | Notes |
|--------|--------|-------|-------|
| `HeaderIconToolbar` | `@/components/ui/header-icon-toolbar` | Toolbar with expand/collapse/add | Well-encapsulated |
| `SearchInput` | `@/components/ui/search-input` | Tree search (currently non-functional: `canSearch={false}`) | **Dead prop** |
| `Button` | `@/components/ui/button` | Delete modal buttons | Standard usage |
| `ContextActionMenuContent` | `@/components/ui/action-menu` | Right-click context menu | Standard usage |
| `ContextMenu*` | `@/components/ui/context-menu` | Right-click wrapper per node | Standard usage |
| `ControlInput` | `@/components/ui/control-input` | Inline rename input | Standard usage |
| `Modal` | `@/components/ui/modal` | Delete confirmation | Standard usage |

### 3.2 Library Dependencies (2 imports)

| Import | Source | Purpose |
|--------|--------|---------|
| `ControlledTreeEnvironment`, `Tree`, etc. | `react-complex-tree` | Tree rendering, DnD, expansion |
| `ArrowCounterClockwise`, `CaretDown`, `Check`, `Cube`, `FolderSimple`, `Plus` | `@phosphor-icons/react/dist/ssr` | UI icons |

### 3.3 Domain Libraries (7 imports)

| Import | Source | Key Exports Used |
|--------|--------|------------------|
| `tree-hierarchy` | `@/lib/estimates/tree-hierarchy` | `getEstimateNodeDisplayKind`, `getEstimateNodeKindSortRank`, `isEstimateGroupNodeKind` |
| `actions` | `@/lib/estimates/actions` (893 lines, "use server") | `createEstimateNode`, `deleteEstimateNode`, `renameEstimateNode`, `reorderEstimateTreeNodes` |
| `use-estimate-query` | `@/hooks/use-estimate-query` | `useEstimateAreaTreeQuery` |
| `use-estimate-workspace-state` | `@/hooks/use-estimate-workspace-state` (116 lines) | `useEstimateWorkspaceExpansion`, `useEstimateWorkspaceSelection` |
| `estimate-tree-reorder` | `@/lib/estimates/estimate-tree-reorder` (366 lines) | `ESTIMATE_TREE_ROOT_ITEM_ID`, `evaluateEstimateTreeDrop`, `getEstimateTreeContentSignature`, `mergeEstimateTreeStructureWithCachedNodes` |
| `estimate-tree-edit` | `@/lib/estimates/estimate-tree-edit` (140 lines) | `planEstimateTreeDelete`, `renameEstimateTreeNode` |
| `estimate-tree-data` | `./estimate-tree-data` | `findEstimateNode`, `EstimateTreeNode` type |

### 3.4 Navigation Imports (1 import)

| Import | Source | Purpose |
|--------|--------|---------|
| `unstable_rethrow`, `usePathname`, `useRouter` | `next/navigation` | Route sync and error handling |

---

## 4. Performance Audit

### 4.1 Deep Clone Overhead (HIGH)

**Every mutation clones the entire tree recursively:**

```typescript
// Line 90-96 - cloneEstimateTreeNode
function cloneEstimateTreeNode(node: EstimateTreeNode): EstimateTreeNode {
  return {
    ...node,
    children: node.children?.map(cloneEstimateTreeNode),
    estimateRowItems: node.estimateRowItems ? [...node.estimateRowItems] : node.estimateRowItems,
  };
}
```

This is called:
- `handleAddTreeNode` → `insertLocalEstimateTreeNode` → clones ALL nodes (lines 105-121)
- `handleConfirmDeleteNode` → `removeLocalEstimateTreeNode` → clones ALL nodes (lines 123-130)
- Every local optimistic update

**Impact**: For a tree with 50 nodes and 200 estimate row items, this clones ~250 objects per mutation.

**Opportunity**: Use structural sharing (immutable update helpers like Immer) or targeted node replacement instead of full-tree cloning.

### 4.2 Content Signature Recompute Hot Path (HIGH) — THIRD-PASS CORRECTION

`getEstimateTreeContentSignature` (in `estimate-tree-reorder.ts` lines 193-231) recursively visits every node and every estimate row item, extracts **18 row-item fields** (`id`, `material`, `description`, `supplier`, `source`, `unit`, `itemCost`, `quantity`, `subTotal`, `supplementaryCosts`, `laborCost`, `totalItemCosts`, `category`, `discipline`, `designation`, `pricingSource`, `pricingDate`, `confidence`), then `JSON.stringify`s the result. It has five static call sites in `EstimateSheetTree`:

1. **Line 215**: `useRef(getEstimateTreeContentSignature(nodes))` — argument expression is evaluated during render
2. **Line 216**: `useRef(getEstimateTreeContentSignature(nodes))` — second ref initializer argument, also evaluated during render
3. **Line 243**: `getEstimateTreeContentSignature(incomingNodes)` — inside `syncLocalNodesFromProps`
4. **Line 250**: `getEstimateTreeContentSignature(currentNodes)` — inside the `setLocalNodes` updater in `syncLocalNodesFromProps`
5. **Line 272**: `getEstimateTreeContentSignature(nodes)` — inside the prop-sync `useEffect`

**Important nuance**: `useRef(getEstimateTreeContentSignature(nodes))` does not lazily run only on mount; React ignores subsequent initial values, but JavaScript still evaluates the argument expression on each render. That means the two ref argument calls can still do full signature work on re-renders even though the ref value is only initialized once.

**Impact**: For 200 row items with 18 tracked fields each, each signature pass performs roughly 3,600 row-field reads plus node metadata reads and creates a large JSON string. A normal prop-sync path can compute the incoming signature in the effect, compute it again when calling `syncLocalNodesFromProps`, and compute the current local signature inside the cache updater; separate render passes also evaluate the two ref argument expressions.

**Opportunity**: Memoize the signature alongside the tree model, or use a lighter hash (e.g., simple checksum of IDs + names + totals).

### 4.3 Tree Model Re-materialization (MEDIUM)

```typescript
// Line 233 - runs every time localNodes changes
const treeModel = useMemo(() => buildTreeModel(localNodes), [localNodes]);
```

`buildTreeModel` (lines 147-176) traverses the entire tree and builds new `items` and `folderIds` collections. Since `localNodes` changes on every optimistic mutation, the entire tree model is rebuilt.

**Opportunity**: Consider incremental model updates or memoizing subtrees.

### 4.4 useMemo Inventory (9 total)

| Variable | Dependencies | Notes |
|----------|-------------|-------|
| `currentRouteNodeId` | `estimateId`, `pathname`, `selectedNodeId` | Route parsing |
| `treeModel` | `localNodes` | Full tree traversal |
| `allFolderItemIds` | `treeModel.folderIds`, `treeModel.items` | Array.from + filter |
| `selectedGroupId` | `activeSelectedNodeId`, `localNodes` | Node lookup |
| `expandedItems` | `expandedNodeIds`, `treeModel.items` | Filter |
| `routeSelectedItems` | `activeSelectedNodeId`, `treeModel.items` | Conditional array |
| `focusedItem` | `activeSelectedNodeId`, `focusedOverride`, `routeSelectedItems`, `treeModel.items` | Conditional lookup |
| `viewState` | `expandedItems`, `focusedItem`, `routeSelectedItems` | Object construction |
| `rootDropTargets` | `localNodes.length` | Only re-computes on node count change (good) |

### 4.5 useCallback Inventory (25 total)

| Callback | Dependencies | Notes |
|----------|-------------|-------|
| `syncLocalNodesFromProps` | `setLocalNodes` | Prop sync core |
| `finishPendingReorder` | `syncLocalNodesFromProps` | Reorder completion |
| `handleExpandAll` | `allFolderItemIds`, `setExpandedNodeIds` | 2 deps |
| `handleCollapseAll` | `setExpandedNodeIds` | 1 dep |
| `handleCanDrag` | `canReorderNow`, `editingNodeId` | 2 deps |
| `handleCanDropAt` | `handleCanDrag`, `localNodes` | 2 deps |
| `clearNestIntentHint` | — | 0 deps |
| `clearRootDropActive` | — | 0 deps |
| `getDraggedTreeItemFromEvent` | `treeModel.items` | 1 dep |
| `markNestIntentHint` | — | 0 deps |
| `clearNestIntentHintForTarget` | — | 0 deps |
| `suppressPrimaryActionAfterDrag` | — | 0 deps |
| `createDirectFolderDropTarget` | — | 0 deps |
| `isMiddleRowDrop` | — | 0 deps |
| `handleDrop` | 12 deps | Large — see §4.6 |
| `handleRootDropZoneDragOver` | 4 deps | Moderate |
| `handleRootDropZoneDrop` | 4 deps | Moderate |
| `handleAddTreeNode` | 7 deps | Moderate |
| `beginRenameNode` | `isTreeMutationSaving` | 1 dep |
| `cancelRenameNode` | — | 0 deps |
| `resetRenameNode` | — | 0 deps |
| `commitRenameNode` | 8 deps | Large — see §4.6 |
| `replaceEstimateRoute` | `estimateId`, `projectId`, `router` | 3 deps |
| `handleConfirmDeleteNode` | 14 deps | Largest — see §4.6 |
| `handleDeleteModalOpenChange` | `deletePending` | 1 dep |

### 4.6 Large Callback Dependency Arrays (MEDIUM)

| Callback | Dependencies | Lines |
|----------|-------------|-------|
| `handleConfirmDeleteNode` | 14 | 682-769 (deps: 754-769) |
| `handleDrop` | 12 | 423-492 (deps: 479-492) |
| `commitRenameNode` | 8 | 608-671 (deps: 662-671) |
| `handleAddTreeNode` | 7 | 523-578 (deps: 570-578) |

Many of these dependencies are stable refs and zustand selectors that don't change reference, but `localNodes` changes on every mutation, causing ALL callbacks to be recreated.

**Opportunity**: Use refs for stable references to `localNodes` inside callbacks, or use `useEvent`-style patterns.

### 4.7 React Complex Tree Props (LOW)

`react-complex-tree` receives new prop objects on every render:

```typescript
// Lines 840-844
<ControlledTreeEnvironment
  items={treeModel.items}        // new reference every localNodes change
  viewState={viewState}          // memoized, stable
  getItemTitle={...}             // inline function, new every render
  canDrag={handleCanDrag}        // callback, recreated when deps change
  canDropAt={handleCanDropAt}    // callback, recreated when deps change
  onDrop={handleDrop}            // callback, recreated when deps change
  ...
/>
```

`getItemTitle` is an inline arrow function — new reference every render. The library may internally compare these.

### 4.8 ResizableSidePanel CSS Variable Syncing (LOW)

```typescript
// ResizableSidePanel.tsx lines 71-89
useEffect(() => {
  // Sets CSS custom properties on document.documentElement and a DOM element
  targets.forEach((target) => target.style.setProperty(cssVariable, `${responsiveWidth}px`));
  // ...
}, [responsiveWidth, storageKey]);
```

This effect runs on every width change (drag events at ~60fps) and directly manipulates the DOM. While this is how CSS custom properties work, the effect could be optimized with `requestAnimationFrame` batching.

### 4.9 Empty State Rendering (LOW)

```typescript
// Lines 835-838
{localNodes.length === 0 ? (
  <div className="...">This estimate has no tree nodes yet...</div>
) : (
  <ControlledTreeEnvironment ... />
)}
```

The empty state is an inert `<div>`. The full `ControlledTreeEnvironment` with all its render props is in the alternate branch, so this is fine — no unnecessary tree rendering when empty.

---

## 5. State Management Audit

### 5.1 Prop → Local State Synchronization (MEDIUM RISK)

The component maintains a sophisticated "prop sync" system (lines 242-282) that:
1. Compares content signatures to detect meaningful prop changes
2. Defers prop application during in-flight reorder operations
3. Ignores stale signatures that were generated by optimistic updates
4. Uses 4 separate refs to track signature state

```
Props (nodes)                             Local state (localNodes)
    │                                           │
    ▼                                           │
useEffect (line 271)                            │
    │                                           │
    ├── computes incomingSignature              │
    ├── checks if props are same reference      │
    ├── defers if pendingReordersRef > 0        │
    └── calls syncLocalNodesFromProps           │
              │                                 │
              ▼                                 │
         setLocalNodes (line 244)               │
              │                                 │
              ├── checks stalePropSignature ────┘
              ├── compares currentSignature
              └── applies or skips
```

**Concerns**:
- 4 refs for signature tracking is hard to reason about
- The state machine (idle → sync needed → deferred → synced) is implicit
- Potential for stale closure bugs with `stalePropSignatureToIgnoreRef`

**Opportunity**: Consider using react-query's built-in optimistic update rollback instead of this custom sync system. The hook already provides `prepareOptimisticUpdate` + revision tracking.

### 5.2 Imperative Refs as Mutable State (MEDIUM)

12 useRefs serve as mutable state bypass, avoiding re-renders but creating implicit data flow:

- `draggedTreeItemRef` is written in drag handlers and read in drop handlers — no React data flow
- `renameCommitInFlightRef` is a guard flag — reasonable use case
- `suppressPrimaryActionUntilRef` is a timestamp — fragile timer-based logic
- `suppressContextMenuCloseAutoFocusRef` / `ignoreRenameBlurDuringContextMenuCloseRef` — complex interplay between context menu and inline rename

**Opportunity**: Some of these (particularly the context menu / rename interplay refs) could be replaced with proper state machines or event-based patterns.

### 5.3 Zustand Integration (GOOD)

Selection and expansion state is stored in zustand (`useEstimateWorkspaceState`), which:
- Persists across component remounts
- Uses selector equality checks to prevent unnecessary re-renders
- Is shared across components (other panels can read selected node)

This is well-designed. The hook wrappers (`useEstimateWorkspaceSelection`, `useEstimateWorkspaceExpansion`) provide nice ergonomics with route-sync.

### 5.4 React Query Integration (GOOD)

`useEstimateAreaTreeQuery` provides:
- Initial data from props
- Optimistic update primitives (`prepareOptimisticUpdate`, `restore`, `snapshot`)
- Revision tracking for conflict detection
- Query invalidation-on-settle pattern

The pattern is sound, though the component uses `setLocalNodes` directly (which calls `queryClient.setQueryData`) alongside the hook's own primitives. There's some duplication of concern.

---

## 6. Event Handling Audit

### 6.1 Drag-and-Drop (COMPLEX)

The component implements three DnD layers:

1. **react-complex-tree built-in DnD** (lines 847-854) — handles `canDrag`, `canDropAt`, `onDrop`
2. **Direct folder nest DnD** (lines 1060-1084) — custom drag-over/drop on folder nodes for middle-zone nesting
3. **Root drop zones** (lines 1235-1273) — custom top/bottom drop zones for root-level reordering

All three layers interact via shared mutable state (`draggedTreeItemRef`, `nestIntentHint`, `activeRootDropEdge`).

**Concerns**:
- `handleDirectFolderNestDragOver` returns `boolean` to signal whether it handled the event (lines 1062-1074), mixing React event handling with custom logic
- `isMiddleRowDrop` computes relative Y position from `getBoundingClientRect()` on every drag-over event (lines 415-421)
- `suppressPrimaryActionAfterDrag` uses a 500ms timestamp window (line 382) — fragile and time-dependent

**Opportunity**: Extract DnD logic into a custom hook (`useEstimateTreeDragDrop`) to reduce component size and improve testability.

### 6.2 Inline Rename (COMPLEX)

The rename flow involves:
1. `beginRenameNode` — sets `editingNodeId`, captures current name, sets refs
2. `commitRenameNode` — validates, calls server action, handles rollback
3. `cancelRenameNode` — resets state and refs
4. `resetRenameNode` — resets to original name, re-focuses input

Ref interplay (lines 284-312):
```
editingNodeId changes → useEffect runs
  → sets suppressContextMenuCloseAutoFocusRef
  → double requestAnimationFrame → focus input
  → setTimeout → focus again + clear ignoreRenameBlur ref
```

**Concerns**:
- Double `requestAnimationFrame` + `setTimeout(0)` for focus management (lines 296-302) — fighting browser focus timing
- Context menu's `onCloseAutoFocus` interacts with rename's focus/blur (lines 1202-1211)
- `ignoreRenameBlurDuringContextMenuCloseRef` prevents the blur handler from committing when context menu is closing (line 921)

**Opportunity**: Consider using a controlled input that doesn't rely on blur to commit — use Enter key as primary commit and Escape for cancel, with blur as a secondary path. This would eliminate most of the focus timing complexity.

### 6.3 Primary Action Suppression (LOW)

```typescript
// Line 382
const suppressPrimaryActionAfterDrag = useCallback(() => {
  suppressPrimaryActionUntilRef.current = Date.now() + 500;
}, []);
```

This prevents tree node clicks from firing immediately after a drag operation completes (line 857):
```typescript
onPrimaryAction={(item) => {
  if (Date.now() < suppressPrimaryActionUntilRef.current) return;
  ...
}}
```

**Concern**: 500ms is arbitrary. On slow devices, drag-end might occur after this window. On fast devices, legitimate clicks are delayed unnecessarily.

**Opportunity**: Use `event.detail` or track drag-end vs click via a boolean flag instead of a timestamp window.

---

## 7. Tree Operation Audit

### 7.1 Operations Overview

| Operation | Optimistic? | Server Action | Rollback Strategy |
|-----------|-------------|---------------|-------------------|
| Add node | Yes (local insert) | `createEstimateNode` (redirects) | Remove optimistic node on failure |
| Rename node | Yes (local rename) | `renameEstimateNode` | Restore original name |
| Delete node | Yes (local delete) | `deleteEstimateNode` | Restore tree from snapshot |
| Reorder nodes | Yes (local reorder) | `reorderEstimateTreeNodes` | Restore from snapshot |

### 7.2 Optimistic Update Flow (GOOD PATTERN)

All four operations follow a consistent pattern:
1. `prepareAreaTreeOptimisticUpdate()` — cancels in-flight queries, snapshots current data
2. Apply local optimistic change via `setLocalNodes`
3. Call server action
4. On success: merge confirmed data, update status
5. On failure: rollback via `restoreLocalNodes` or direct `setLocalNodes`

This is well-structured and handles the common failure modes (network error, server rejection, concurrent mutations).

### 7.3 Delete Operation Complexity (MEDIUM)

`handleConfirmDeleteNode` (lines 682-769) is the most complex operation:
- 88 lines in a single callback
- Manages route navigation (replaces URL if deleted node was current route)
- Manages selected node (falls back to sibling/parent)
- Handles server-confirmed deletion with potentially different deleted node set
- Two-phase optimistic → confirmed merge

**Opportunity**: Extract into a `useEstimateTreeDelete` hook.

### 7.4 Duplicate Clone Logic (LOW)

Two separate `cloneNode`/`cloneEstimateTreeNode` implementations exist:
1. `EstimateSheetTree.tsx` line 90-96 — used for local optimistic mutations
2. `estimate-tree-reorder.ts` line 55-61 — used in the reorder plan builder

Both do the same thing (recursive deep clone). The lib version uses `cloneNode` internally; the component has its own for local operations.

**Opportunity**: Export the lib's `cloneNode` (or make it public) and use it in the component to eliminate duplication.

---

## 8. Accessibility Audit

### 8.1 Strengths

- Tree uses `<nav>` with `aria-label` (line 881)
- Status messages use `role="status"` with `aria-live="polite"` (lines 821-831, 1218-1224)
- Icons use `aria-hidden="true"` consistently
- Context menu has proper keyboard navigation (via Radix)
- Inline rename input has `aria-invalid` and `aria-describedby` for error states (lines 912-913)
- Delete modal has proper `aria-label` on close button

### 8.2 Gaps

- **No keyboard-only tree reordering** — drag-and-drop is mouse/touch only. Users cannot reorder via keyboard.
- **SearchInput with `canSearch={false}`** — the search input is rendered but tree search is disabled. This is confusing — either implement search or remove the input.
- **Inert Filter/Group toolbar buttons** — `HeaderIconToolbar` always renders Filter and Group buttons (`src/components/ui/header-icon-toolbar.tsx` lines 53-58), but `EstimateSheetTree` passes no `onFilter` or `onGroup` props at lines 802-819. Unless `ToolbarIconButton` disables missing handlers internally, these controls are visible affordances with no tree behavior.
- **Focus management during rename** — the double-RAF + setTimeout pattern is fragile and may not work reliably with screen readers.
- **Nest intent tooltip** (lines 1217-1225) uses `role="status"` with `aria-live="polite"` but may fire too frequently during drag operations.
- **Root drop zones have `aria-hidden="true"`** (lines 1236, 1256) — these are functional interactive areas but are hidden from screen readers.

---

## 9. Code Quality Audit

### 9.1 File Size

At **1,320 lines** in a single file, this component exceeds recommended thresholds:
- React docs suggest components under 200-300 lines
- This file contains: 1 exported component, 2 local components, 9 helper functions, 6 type definitions, 5 constants

### 9.2 Concerns

| Issue | Lines | Description |
|-------|-------|-------------|
| Monolithic render | 782-1318 | The return statement spans 537 lines — larger than most entire components |
| Inline render functions | 842-1232 | 5 render props (`renderItem`, `renderItemTitle`, `renderItemArrow`, `renderTreeContainer`, `renderItemsContainer`) plus 2 inline callbacks (`getItemTitle`, `onPrimaryAction`) — all inline |
| Large JSX in renderItem | 1021-1232 | The `renderItem` function alone is 212 lines |
| Magic numbers | 382, 420, 788-790 | `500` (ms suppress), `0.25`/`0.75` (drop thresholds), `272`/`216`/`432` (panel dims) — should be named constants |
| Commented-out code | None found | Clean — no dead code |
| Error boundary | Missing | No error boundary wraps the tree — a render error in one node breaks the entire panel |

### 9.3 TypeScript Usage

- Strong typing throughout — all props, state, refs, and callbacks are properly typed
- Discriminated unions for status (`ReorderStatus`, `EstimateNodeReorderResult`)
- No `as any`, `@ts-ignore`, or type assertions found except in `renderItemArrow` context casting (lines 1010, 1025-1035) which is necessary for react-complex-tree's generic render props
- `unstable_rethrow` used correctly for Next.js error handling (lines 547, 644, 737)

---

## 10. Blast Radius Analysis

### 10.1 Direct Consumers

| File | Usage |
|------|-------|
| `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx` | Single page consumer — RSC passes props |

### 10.2 Child Components (5 direct)

| Component | File | Lines |
|-----------|------|-------|
| `ResizableSidePanel` | `./ResizableSidePanel.tsx` | 164 |
| `SearchInput` | `@/components/ui/search-input` | 56 |
| `HeaderIconToolbar` | `@/components/ui/header-icon-toolbar` | 90 |
| `Modal` | `@/components/ui/modal` | 96 |
| `ContextMenu` + `ContextActionMenuContent` | `@/components/ui/context-menu`, `@/components/ui/action-menu` | 236 + 69 |

### 10.3 Impact Radius

- **369 nodes** within 2 dependency hops
- **100 files** affected by changes
- Dedicated tests do exist for `EstimateSheetTree` and the core tree libraries; see §14. Coverage is meaningful but not complete, especially for performance, accessibility, and the full prop-sync state machine.

### 10.4 Critical Dependency Chain

```
EstimateSheetTree
  → useEstimateAreaTreeQuery
    → react-query (queryClient)
      → fetchEstimateTree (server action)
        → getProjectEstimateTreeByEstimate
          → Supabase client
```

Changes to the tree data model or server actions cascade through the entire query layer.

---

## 11. Identified Inefficiencies

### 11.1 Unnecessary Re-renders

| Trigger | Cause | Mitigation |
|---------|-------|------------|
| Any tree mutation | `localNodes` changes → all 25 callbacks recreate → all render props re-evaluate | Use refs for stable callback access to `localNodes` |
| Drag over events | `setActiveRootDropEdge` state change | Could use a ref + CSS class toggle instead |
| Width resize drag | `setDragWidth` on every mousemove → ResizableSidePanel re-renders | Throttle or use `requestAnimationFrame` |
| Content signature computation | `getEstimateTreeContentSignature` has 5 static call sites; two are `useRef(...)` argument expressions evaluated during render, and the prop-sync path can recompute effect/callback/updater signatures | Memoize signature alongside tree model |

### 11.2 Unnecessary Computation

| Computation | Frequency | Impact |
|-------------|-----------|--------|
| `buildTreeModel` | Every `localNodes` change | Full tree traversal, object creation |
| `getEstimateTreeContentSignature` | 5 static call sites; repeated render/effect/callback/updater execution paths | Full tree + row items traversal + JSON.stringify |
| `cloneEstimateTreeNode` | Every optimistic mutation | Recursive deep clone of entire tree |
| `allFolderItemIds` | Every `treeModel` change | Array.from + filter |
| `expandedItems` filter | Every `expandedNodeIds` or `treeModel.items` change | Filter over all expanded IDs |

### 11.3 Memory

- Each optimistic mutation creates a full deep clone of the tree (new objects for every node)
- `buildTreeModel` creates new `items` record and `folderIds` set on every change
- Content signatures create large JSON strings that are immediately discarded
- No cleanup of stale snapshots in react-query cache (GC handled by react-query defaults)

---

## 12. Improvement Opportunities

### 12.1 Architectural

| # | Opportunity | Effort | Impact |
|---|-------------|--------|--------|
| 1 | **Extract `useEstimateTreeDragDrop` hook** — move all DnD logic (handlers, refs, drop zone rendering) into a dedicated hook | Medium | Reduces component by ~200 lines, improves testability |
| 2 | **Extract `useEstimateTreeRename` hook** — isolate rename state machine and focus management | Medium | Reduces component by ~100 lines, eliminates ref interplay bugs |
| 3 | **Extract `useEstimateTreeOptimisticMutation` hook** — generic optimistic mutation wrapper | Medium | Eliminates duplicated try/catch/rollback patterns |
| 4 | **Add error boundary** — wrap the tree in an error boundary to prevent full panel crash | Low | Improves resilience |
| 5 | **Split renderItem into sub-components** — extract `RenameableTreeItem`, `DraggableTreeItem`, etc. | Medium | Reduces render function from 212 lines to manageable pieces |

### 12.2 Performance

| # | Opportunity | Effort | Impact |
|---|-------------|--------|--------|
| 6 | **Use Immer or structural sharing for tree mutations** — replace `cloneEstimateTreeNode` with immutable update helpers | High | Eliminates deep clone overhead |
| 7 | **Memoize content signatures** — compute alongside `treeModel` in a single `useMemo`, remove ref-init calls | Low | Eliminates 2 expensive init calls + reduces effect overhead |
| 8 | **Throttle drag-over CSS updates** — batch `setDragWidth` with `requestAnimationFrame` | Low | Smoother resize during drag |
| 9 | **Replace timestamp-based click suppression** — use `event.detail` or a drag-complete flag | Low | More reliable primary action suppression |
| 10 | **Lazy-load phosphor icons** — use `next/dynamic` for icon components | Low | Reduces initial bundle |

### 12.3 Developer Experience

| # | Opportunity | Effort | Impact |
|---|-------------|--------|--------|
| 11 | **Add JSDoc to complex callbacks** — `handleConfirmDeleteNode`, `syncLocalNodesFromProps` | Low | Improves maintainability |
| 12 | **Extract magic numbers to named constants** — drag threshold (0.25/0.75), suppress timeout (500ms), panel dimensions (272/216/432) | Low | Self-documenting code |
| 13 | **Add component-level tests** — tree model building, optimistic rollback, drag-drop validation | High | Prevents regressions |
| 14 | **Document prop-sync state machine** — the 4-ref signature tracking system needs a diagram or state table | Low | Prevents future bugs |

### 12.4 Accessibility

| # | Opportunity | Effort | Impact |
|---|-------------|--------|--------|
| 15 | **Implement keyboard tree reordering** — cut/paste or move-up/move-down shortcuts | High | WCAG compliance |
| 16 | **Enable or remove SearchInput** — either implement `canSearch` or remove the input | Medium | Removes confusing dead UI |
| 17 | **Make root drop zones accessible** — remove `aria-hidden` and add keyboard drop targets | Medium | Keyboard-only users can reorder at root level |
| 18 | **Hide or wire Filter/Group toolbar buttons** — render them only when handlers exist, or provide actual filter/group behavior | Low | Removes inert controls and improves assistive-tech clarity |

---

## 13. Refactoring Roadmap

### Phase 1: Stabilize (Low Effort, High Impact)
1. Add error boundary around tree
2. Extract magic numbers to named constants
3. Add JSDoc to complex callbacks
4. Document prop-sync state machine

### Phase 2: Extract Hooks (Medium Effort)
5. `useEstimateTreeDragDrop` — isolate DnD
6. `useEstimateTreeRename` — isolate rename
7. `useEstimateTreeOptimisticMutation` — generic mutation wrapper

### Phase 3: Performance (Medium-High Effort)
8. Immer/structural sharing for tree mutations
9. Memoize content signatures (eliminate ref-init calls)
10. Throttle resize updates

### Phase 4: Accessibility (Medium-High Effort)
11. Keyboard tree reordering
12. Enable tree search or remove input
13. Accessible root drop zones
14. Hide or implement Filter/Group toolbar actions

---

## 14. Test Coverage

| Area | Has Tests? | Notes |
|------|-----------|-------|
| `EstimateSheetTree` component | Yes | `tests/vitest/estimate-sheet-tree-dnd.test.tsx`, `estimate-sheet-tree-rct-dom.test.tsx`, `estimate-tree-context-menu.test.tsx`, and `estimate-tree-modal.test.tsx` import/render the component and cover DnD, React Complex Tree DOM behavior, context-menu rename/delete flows, and modal/add-node behavior. |
| `estimate-tree-reorder.ts` | Yes | `tests/vitest/estimate-tree-reorder.test.ts` covers complex DnD validation/reorder planning helpers. |
| `estimate-tree-edit.ts` | Yes | `tests/vitest/estimate-tree-edit.test.ts` covers delete planning and rename helper behavior. |
| `tree-hierarchy.ts` | Partial | `tests/vitest/estimate-tree-data.test.ts` and `supabase-performance-migrations.test.ts` import hierarchy helpers; coverage exists but is not a focused exhaustive hierarchy test suite. |
| `use-estimate-workspace-state` | Partial | Several component tests reset or exercise workspace state through rendered tree flows; no dedicated store unit test was verified. |
| `use-estimate-query` | Partial | Component tests use query keys/cache setup and `live-estimate-node-route.test.ts` asserts optimistic-query wiring exists; no dedicated hook unit test was verified. |

**Third-pass correction**: the earlier "zero test coverage" claim was wrong. The tree has meaningful dedicated Vitest coverage, including direct component tests. Remaining gaps are narrower: no verified performance regression tests for signature/model recomputation, no dedicated accessibility test for keyboard reordering/inert toolbar controls, and no focused unit tests for the prop-sync state machine or workspace/query hooks in isolation.

---

## 15. Summary of Metrics (CORRECTED)

| Metric | Value | Previous (wrong) |
|--------|-------|-----------------|
| File size | 1,320 lines | — |
| Exported components | 1 | — |
| Internal helper functions | 9 | 10 |
| Local components | 2 (`NodeIcon`, `AddTreeActionIcon`) | — |
| Type definitions | 6 | 5 |
| Module-level constants | 5 | 6 |
| `useState` calls | 9 | 8 |
| `useRef` calls | 12 | 13 |
| `useMemo` calls | 9 | 6 |
| `useCallback` calls | 25 | 14 |
| `useEffect` calls | 2 | 2 ✓ |
| External store subscriptions | 2 (zustand selectors) | — |
| React Query hooks | 1 | — |
| Server action imports | 4 | — |
| UI primitive imports | 7 | — |
| Icon imports | 6 | — |
| Direct consumers | 1 page | — |
| Blast radius (2 hops) | 369 nodes, 100 files | — |
| Test coverage | Dedicated component/lib tests exist; important gaps remain | Previously misreported as 0% |

---

*Generated by Hephaestus audit — 2026-05-22*
*Revision 4: Corrected magic-number line references (104 and 1097 were wrong; added 0.75, panel dimensions), corrected render prop count (5 render props + 2 inline callbacks, not 6 render props), expanded §4.6 callback line ranges to show full function spans alongside dependency arrays, corrected child component line counts (SearchInput 56, HeaderIconToolbar 90, Modal 96, ContextMenu+ActionMenu 236+69), refreshed blast radius to 369 nodes.*
