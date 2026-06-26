# 02 — Behavior Inventory

Every user-affecting behavior of the Estimate Sheet Tree Sidebar. Verification state: STATIC = read from source; INFERRED = concluded from surrounding code.

## A. CRUD Behaviors

### A.1 Create Root Branch (Add Area with no selection)
- **Trigger**: "Add Branch" button in TreePanelHeader (EstimateSheetTree.tsx:1561-1568) → `handleAddArea()` → `handleAddTreeNode(undefined)`
- **Preconditions**: None (P6 single-node model: any state can create a root). When a node IS selected, create targets it as parent.
- **Handler**: `handleAddTreeNode` (L842-939)
- **State changes**: Local: insert optimistic node via `insertLocalEstimateTreeNode` (L103-121); reducer: `editingNodeId=optimisticId`, `editingNodeName="New Area"`, `reorderStatus=saving`; store: `setSelectedNodeId(optimisticId)`, expand target parent
- **Network**: `createEstimateNode(projectId, estimateId, formData)` → RPC `create_estimate_node_with_history`
- **Persistence**: `estimate_nodes` row, audit `estimate_sheet_events`
- **Loading feedback**: Sidebar-wide toast "Adding area" (tone: loading) via `reportReorderStatus` (L502-532)
- **Success feedback**: Toast "Area added" (tone: success); optimistic id replaced with server id; inline rename editor retained open
- **Error feedback**: Toast message from error; optimistic row removed via `removeLocalEstimateTreeNode`; selection reverts to `previousSelectedNodeId`
- **Focus result**: Inline rename input focused via `attachRenameInputRef` ref callback (L967-981)
- **Selection result**: New node selected (server id after reconciliation)
- **Expansion result**: Parent expanded if not already (L852-854)
- **Scroll result**: NONE — no explicit scroll-into-view for the new row. **GAP** (F-AUTOSCROLL).
- **Interruptible**: NO — `isTreeMutationSaving` gates all other mutations (L660-661)
- **Conflict surface**: Two rapid "Add" clicks: `isTreeMutationSaving` blocks the second. VERIFIED WORKING.
- **Test coverage**: `estimate-sheet-tree-dnd.test.tsx` mocks `createEstimateNode`; optimistic flow partial. **No test for failure rollback.**

### A.2 Create Child Branch (Add area inside X)
- **Trigger**: Context menu "Add area inside" (L1329-1337)
- **Handler**: Same `handleAddTreeNode(contextMenuNode.id)`
- **Differences from A.1**: Parent is the right-clicked node, not the selected one
- **Test coverage**: **GAP** — no test found for context-menu-triggered create

### A.3 Rename (inline edit)
- **Trigger**: Context menu "Rename" (L1356-1363) → `beginRenameNode` (L993-1000)
- **Preconditions**: `isTreeMutationSaving === false` (L994)
- **Handler**: `beginRenameNode` arms the context-menu focus handoff (L988-991), sets `editingNodeId`, focuses input via `useEffect` (L593-639)
- **State changes**: reducer: `editingNodeId`, `editingNodeName=node.name`, `editingNodeError=null`
- **Save trigger**: Enter key (L1421-1424), blur (L1406-1410), or ✓ button click (L1449-1453) → `commitRenameNode` (L1021-1089)
- **Cancel trigger**: Escape key (L1425-1428); ✗ button calls `resetRenameNode` (L1010-1019) which restores original name — NOT cancel
- **Network**: `renameEstimateNode(projectId, estimateId, serverNodeId, nextName)`
- **Persistence**: `estimate_nodes.name` UPDATE via RPC
- **Validation**: Empty/whitespace-only → `editingNodeError="Name is required."` (L1027-1033). No length cap. **No duplicate-name check.** No multi-line normalization.
- **Optimistic**: YES: `setLocalNodes(renameEstimateTreeNode(previousNodes, node.id, nextName))` (L1049-1050)
- **Rollback**: On error: only re-opens editor if `currentNode?.name === nextName` (L1064). Otherwise closes editor silently. **GAP** (Finding F-08).
- **Test coverage**: `estimate-sheet-tree-dnd.test.tsx` mocks `renameEstimateNode`. **No test for empty-name rejection, error rollback, or IME composition.**

### A.4 Delete Leaf Branch
- **Trigger**: Context menu "Delete" (L1370-1377) → opens delete Modal (L1687-1724)
- **Confirmation**: Modal with `Delete`/`Cancel` buttons. Description: "This removes the Area, every Area inside it, and all their cost rows." (L1502)
- **Handler**: `handleConfirmDeleteNode` (L1093-1178)
- **Optimistic**: YES: `setLocalNodes(deletePlan.nextNodes)` where `deletePlan = planEstimateTreeDelete(previousNodes, targetNode.id, activeSelectedNodeId)` (L1110-1116)
- **Selection policy**: If active selection is in deleted subtree → `setSelectedNodeId(deletePlan.fallbackNodeId)` (L1118-1120). Fallback order: next sibling → prev sibling → parent → first root (estimate-tree-edit.ts:109-123)
- **Route URL**: If route node was deleted → `replaceEstimateRoute(fallbackNodeId)` (L1121)
- **Network**: `deleteEstimateNode(projectId, estimateId, serverTargetNodeId, activeTabId)`
- **Persistence**: RPC `delete_estimate_node_with_history` (assumed cascade)
- **Server reconciliation**: Client `deletePlan.deletedNodeIds` is CLIENT-PROJECTED; server RPC may delete more or fewer. Action returns `confirmed.deletedNodeIds` and `confirmed.fallbackNodeId` (L1125-1126); client uses server values for final state (L1137-1143). **Finding F-06.**
- **Error rollback**: `restoreLocalNodes(previousNodes, optimisticRevision)` if revision matches (L1151-1152); else `setLocalNodes(previousNodes)`. Restores selection + URL.
- **Test coverage**: `estimate-sheet-tree-dnd.test.tsx` mocks `deleteEstimateNode`. **No test for cascade depth, server-vs-client cascade mismatch, or rollback after partial commit.**

### A.5 Delete Branch With Descendants
Same as A.4; cascade is handled by `planEstimateTreeDelete` client-side and `delete_estimate_node_with_history` RPC server-side. **No user-visible warning of descendant count** — description says "every Area inside it" but doesn't say how many. **GAP.**

### A.6 Bulk Delete
- **Trigger**: Checkbox toggle per row → cascades selection via `toggleCascadeSelection` (L1296-1299) → `BulkActionToolbar` "Delete selected" button (L1640-1645)
- **Confirmation**: Separate `bulkDeleteConfirmOpen` Modal (L1651-1686)
- **Handler**: `handleConfirmBulkDeleteNodes` (L1184-1283)
- **Cascade policy**: Iteratively calls `planEstimateTreeDelete` for each root (L1206-1211), accumulating `optimisticDeletedNodeIds` and tracking a single `fallbackNodeId`
- **Server**: `deleteEstimateNodesBulk` → RPC `delete_estimate_nodes_bulk_with_history` (single RPC, all roots at once)
- **Dedup**: `dedupeSelectedRoots(treeSelectionNodes, bulkSelectedNodeIds)` (L480-483) prevents double-deleting nested selections
- **Test coverage**: `estimate-tree-bulk-selection.test.tsx` exists; CRUD flow partial. `estimate-sheet-bulk-row-delete-partial-failure.test.tsx` exists for ROW-level (different feature).

### A.7 Reorder (same parent)
- **Trigger**: Mouse drag row → drop "before"/"after" sibling
- **Handler**: `handleTreeDrop` (L710-786)
- **Validation**: `evaluateEstimateTreeDrop` client-side; `validateEstimateTreeDrop` blocks self-drop, descendant-drop, multi-drag, no-op
- **Optimistic**: YES: `setLocalNodes(freshResult.plan.nextNodes)` (L749)
- **Network**: `reorderEstimateTreeNodes(projectId, estimateId, { updates, targetTabId })` (L751)
- **Server reconciliation**: `mergeEstimateTreeStructureWithCachedNodes({ structureNodes: confirmed.tree, cachedNodes: currentNodes })` if revision still matches (L752-758). Merge prefers cached detail, server provides structure.
- **Payload**: ALL siblings of source + target parents get new sortOrders (`(index + 1) * 10`) — see estimate-tree-reorder.ts:199-207. Payload size scales with sibling count, NOT move count. **Finding F-04.**
- **Test coverage**: `estimate-tree-reorder.test.ts` (385 lines) covers pure-op validation. `estimate-sheet-tree-dnd.test.tsx` covers integration.

### A.8 Reparent (move between parents)
Same as A.7 with `targetParentId !== sourceParentId`. Validation includes cycle detection via `getDescendantEstimateNodeIds` (estimate-tree-reorder.ts:330-332). **No max depth check** client or server side.

### A.9 Drop External Payload (template/project source)
- **Trigger**: Drag template or project-source card from right sidebar → drop "inside" row
- **Handler**: `treeExternalDrop.onDrop` (L803-834) → dispatches window event
- **No optimistic update**: The sidebar does NOT insert a placeholder. The middle `EstimateSheetContent` handles the insert via the event listener, performs its own server call, and the tree refreshes via `setLocalNodes(confirmed.tree)` (in the action result).
- **Test coverage**: `estimate-sheet-library-insert.test.tsx` exists.

## B. Non-CRUD Behaviors

### B.1 Select Row (primary action)
- **Trigger**: Click row (mouse) or Enter on focused row (Tree.tsx L1135-1142)
- **Handler**: `handlePrimaryAction` (L1287-1294)
- **Debounce**: `suppressPrimaryActionUntilRef` blocks for 500ms after drag (L706-708, 1288) to prevent click-firing-on-drop
- **State changes**: `setSelectedNodeId(node.id)` (Zustand) + `syncEstimateRouteUrl(node.id)` (replaceState, NOT router navigation)
- **Network**: NONE — selection is pure client state
- **Effect on middle pane**: `EstimateSheetContent` receives `selectedNodeId` prop (via parent), re-renders to show that node's grid

### B.2 Expand / Collapse Single Branch
- **Trigger**: Click caret button (Tree.tsx L507-523) OR ArrowRight/ArrowLeft on focused row (Tree.tsx L1119-1133)
- **Handler**: Tree's `handleToggle` (Tree.tsx L726-753) → `onExpandedChange(nextIds)` → sidebar's `setExpandedNodeIds` (Zustand)
- **State owner**: Zustand `expandedNodeIdsByEstimateId` or `expandedNodeIdsByTabId`
- **Persistence**: NONE — expansion state is lost on page refresh
- **Test coverage**: Indirect via DnD tests

### B.3 Expand All / Collapse All
- **Trigger**: TreePanelHeader buttons → `handleExpandAll` / `handleCollapseAll` (L651-656)
- **Behavior**: Replaces entire expanded set with `allFolderItemIds` (all folders) or `[]`

### B.4 Search / Filter
- **Search trigger**: TreePanelHeader search input → `setTreeSearchQuery`
- **Search behavior**: `filterEstimateTreeNodes` (L197-211) prunes non-matching subtrees; ancestors of matches kept
- **Search side-effect**: While search active, ALL folders auto-expand (L646-649: `treeSearchActive ? collectEstimateFolderIds(displayedNodes) : expandedItems`)
- **Filter trigger**: FilterPopover checkbox "Hide empty areas" → `setTreeFilter({ hideEmptyAreas })`
- **Filter behavior**: `filterEstimateTreeByStructure` (L313-333) prunes subtrees with zero estimateRowItems (anywhere in subtree)
- **Clear-on-rerender**: Search + filter are local reducer state, lost on unmount

### B.5 Bulk Selection (checkbox)
- **Trigger**: Checkbox click → `handleCheckboxToggle` (L1296-1299)
- **Cascade**: `toggleCascadeSelection(treeSelectionNodes, current, nodeId, checked)` — toggling parent cascades to descendants; toggling child updates parent indeterminate state
- **Effect**: BulkActionToolbar docks at bottom of sidebar showing count + "Delete selected" action
- **Test coverage**: `estimate-tree-bulk-selection.test.tsx`

### B.6 Context Menu
- **Trigger**: Right-click row (Radix ContextMenu) or Shift+F10? — **No — Tree primitive has no Shift+F10 handler** (Finding F-12)
- **Items**: "Add area inside", "Save as template", "Rename", "Delete" (L1321-1380)
- **Close behavior**: Radix's `onCloseAutoFocus` intercepted to refocus rename editor if armed (L1305-1315)
- **Disabled state**: Rename + Delete disabled when `isTreeMutationSaving`; Save-as-template disabled for optimistic ids

### B.7 Drag-and-Drop (source)
- **Library**: Native HTML5 DnD (Tree.tsx L870-1000). NOT dnd-kit. NOT react-dnd.
- **`dataTransfer` payload**: `text/plain = nodeId` + optional `dragDataType = ESTIMATE_TREE_DRAG_MIME_TYPE` (Tree.tsx L876-877)
- **Activation**: Whole row draggable (Tree.tsx L1208: `draggable: isNodeDraggable(flat.node)`). **No activation distance** — HTML5 DnD fires on mousedown+move.
- **Gate**: `canDrag` callback: sidebar's `handleTreeCanDrag` (L691-694) blocks during edit, search, optimistic-id nodes, or tree-saving

### B.8 Drag-and-Drop (drop target)
- **Drop bands**: For folders / `allowInsideOnLeaves`: top 25% = "before", bottom 25% = "after", middle 50% = "inside" (Tree.tsx L386-388). For leaf rows without allowInside: top 50% = "before", bottom 50% = "after".
- **Indicator**: Border-top-2 / border-bottom-2 for before/after; bg-surfaceMuted for inside (Tree.tsx L435-437)
- **Auto-scroll during drag**: NONE — no native or virtualizer-driven auto-scroll. **GAP** (Finding F-13)
- **Hover-to-expand**: NONE — no timer to expand collapsed folder on hover-during-drag. **GAP** (Finding F-14)
- **Auto-expand on drop**: YES — if dropped "inside" a collapsed folder, it auto-expands AFTER the drop (Tree.tsx L972-975, L987-989)

### B.9 Drag Cancellation
- **Escape during drag**: HTML5 native: `dragend` event fires regardless. Tree's `handleDragEnd` (L994-1000) calls `clearDragState()`. **No explicit drop-cancellation signal sent to consumer.**
- **Drop outside valid zones**: `handleDrop` runs `clearDragState()` and returns without calling `onDrop` (L982-984)

### B.10 Empty State
- **Trigger**: `nodes.length === 0`
- **Rendered**: `<span aria-hidden="true" />` (L1617) — **invisible empty state!** The Tree's built-in fallback `emptyState` (Tree.tsx L1378-1383) is overridden with an empty span. **Finding F-21.**
- **Add path**: The page's empty-state "Add Area" button dispatches `REQUEST_ESTIMATE_TREE_NODE_CREATE_EVENT` (handled at L949-961)

### B.11 Loading State
- **Initial**: SSR provides `initialData`, so no skeleton. `refetchOnMount: false` (use-estimate-query.ts L46)
- **Background refetch**: `refetchOnWindowFocus: false` default. StaleTime 5min. Background refetch would replace `data` seamlessly — no flicker (VERIFIED WORKING via TanStack Query retained-previous-data behavior)
- **Mutation**: Sidebar-wide toast (loading tone) via `reportReorderStatus`. No row-level pending indicator (no spinner per row). **GAP** (Finding F-15)

### B.12 Error State
- **Display**: Toast (error tone) with server error message (L513-519)
- **Recovery**: Optimistic rollback restores previous state
- **Persistence**: Error toast has finite duration (Toast default); no persistent error banner
- **Action-disabled**: `isTreeMutationSaving` does NOT engage on error state — only on saving. After error, user can immediately retry.

### B.13 Resize Sidebar
- **Trigger**: Mouse drag on `role="separator"` handle, OR ArrowLeft/Right/Home/End on focused handle (ResizableSidePanel.tsx L151-170)
- **Persistence**: Width saved to `document.cookie` AND `window.localStorage` (L50-55)
- **Range**: min 216, max 432, default 272 (entry file L1511-1514)
- **Mobile**: At `(max-width: 1023px)`, sidebar width becomes 0 — effectively hidden (L77, L234) **Finding F-20.**

### B.14 Sidebar Collapse
- **Trigger**: Click `SidebarSimple` toggle button (L213-231)
- **Behavior**: `collapsed=true` → `width = collapsedWidth = 32px`; `aria-hidden={collapsed}` on `<aside>` (L237); children unmount when collapsed (L238)
- **ARIA**: Toggle button has `aria-expanded={!collapsed}` but **no `aria-controls`** pointing to aside id **Finding F-22.**

### B.15 URL Sync (selection)
- **Direction**: Client → URL only (via `window.history.replaceState`) (L676-685)
- **URL pattern**: `/workshop/projects/{projectId}/estimates/{nodeId}` where nodeId is the selected node id, OR the estimate id when no selection
- **Trigger**: `syncEstimateRouteUrl` called on selection (L1293) and after create/delete reconciliation
- **SSR effect**: NONE — `replaceState` does NOT trigger Next.js rerender. Middle sheet reads selection from Zustand/prop, not URL. **URL is for shareability only.**
- **Refresh behavior**: URL on refresh → Next.js route resolves `[nodeId]` → SSR fetches tree with that nodeId as selection hint → passed as `selectedNodeId` prop

## C. Behavioral Coverage Summary

| Behavior | Has handler? | Has test? | Failure-path test? |
|---|---|---|---|
| Create root | YES | partial | NO |
| Create child | YES | NO | NO |
| Create sibling | N/A — unsupported | — | — |
| Rename | YES | partial | NO |
| Delete leaf | YES | partial | NO |
| Delete with descendants | YES | NO | NO |
| Bulk delete | YES | partial | NO |
| Reorder | YES | YES | NO |
| Reparent | YES | YES | NO |
| Drop external | YES | partial | NO |
| Select | YES | indirect | — |
| Expand/collapse | YES | indirect | — |
| Search | YES | YES | — |
| Filter | YES | YES | — |
| Context menu | YES | YES | — |
| Resize | YES | indirect | — |
| URL sync | YES | NO | — |
| Bulk selection | YES | YES | — |
| Drag-drop perf | — | YES | — |

"partial" = success path only; failure/cancel/concurrency untested.
