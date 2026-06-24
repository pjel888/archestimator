# 04 — Non-CRUD Interaction Audit

## 4.1 Selection

### 4.1.1 Single selection (primary action)

- **Trigger**: Click row → `handlePrimaryAction` (L1287-1294)
- **Trigger**: Enter on focused row → Tree's `handleKeyDown` (Tree.tsx:1135-1142)
- **State**: Zustand `setSelectedNodeId(node.id)` + `window.replaceState` for URL sync (L676-685)
- **Network**: NONE
- **Effect**: `EstimateSheetContent` re-renders via prop

### 4.1.2 Debounce after drag

- `suppressPrimaryActionUntilRef` (L388) set to `Date.now() + 500` after drag (L706-708)
- Prevents click-firing-after-drop. GOOD.

### 4.1.3 Selection blocked during edit

- `handlePrimaryAction` returns if `editingNodeId` (L1289)

### 4.1.4 Deselection

- NOT POSSIBLE — clicking same row re-selects; no Ctrl+Click toggle-off. **GAP**.

### 4.1.5 Stale selection resurrection

- **F-17**: Zustand `selectedNodeId: storeSelectedNodeId ?? routeSelectedNodeId`. Store wins.

## 4.2 Expand / Collapse

### 4.2.1 Single expand/collapse

- Caret button click (Tree.tsx:507-523) OR ArrowRight/ArrowLeft on focused row (Tree.tsx:1119-1133)
- ArrowRight on collapsed folder: expands
- ArrowRight on expanded folder: NO effect (doesn't navigate to first child — typical tree pattern missing)
- ArrowLeft on expanded folder: collapses
- ArrowLeft on collapsed/leaf: NO effect (doesn't navigate to parent)
- **GAP**: Incomplete arrow-key navigation (F-12)

### 4.2.2 Expand All / Collapse All

- Toolbar buttons → `handleExpandAll` / `handleCollapseAll` (L651-656)
- Replace entire set with `allFolderItemIds` or `[]`

### 4.2.3 Auto-expand on create / drop / search

- Create: parent auto-expanded (L852-854)
- Drop inside collapsed folder: auto-expand AFTER drop (Tree.tsx:972-975)
- Search active: ALL folders expanded (L646-649)

### 4.2.4 Persistence

- NONE — Zustand store in-memory
- Refresh = expansion lost. **GAP** (F-EXPAND-PERSIST).

## 4.3 Keyboard Navigation

### 4.3.1 Keys handled

| Key | Behavior | Source |
|---|---|---|
| ArrowDown | Focus next visible row | tree.tsx:1097-1101 |
| ArrowUp | Focus previous visible row | tree.tsx:1103-1107 |
| Home | Focus first row | tree.tsx:1109-1112 |
| End | Focus last row | tree.tsx:1114-1117 |
| ArrowRight | Expand folder (no navigation) | tree.tsx:1119-1125 |
| ArrowLeft | Collapse folder (no navigation) | tree.tsx:1127-1133 |
| Enter | Trigger `onRowClick` (selection) | tree.tsx:1135-1142 |
| Space | Trigger `triggerSelection` (checkbox) | tree.tsx:1144-1149 |

### 4.3.2 Keys NOT handled (GAPS)

| Key | Expected | Actual |
|---|---|---|
| F2 | Enter rename mode | **MISSING** (F-12) |
| Delete / Backspace | Open delete confirm | **MISSING** |
| Shift+F10 | Open context menu | **MISSING** |
| Context menu key | Open context menu | **MISSING** |
| Type-ahead (a-z) | Jump to next match | **MISSING** |
| Ctrl+X / Ctrl+V | Cut/paste for keyboard DnD | **MISSING** (F-11) |
| Tab / Shift+Tab | Move focus out | Browser default (works) |

### 4.3.3 Roving tabindex

- Implemented via `effectiveFocusId` (tree.tsx:719-724)
- Focused row gets `tabIndex={0}`, others `-1` (tree.tsx:1207)
- Fallback: focusId → currentId → first selected → first row
- Tree root `tabIndex={0}` (tree.tsx:1310). **VERIFIED WORKING**.

### 4.3.4 Conflict with rename input

- Rename input handles its own keyboard (entry file L1419-1429)
- `event.stopPropagation()` on input (L1420) prevents Tree handler
- **VERIFIED WORKING**

### 4.3.5 IME composition

- **GAP**: No `event.isComposing` check on Enter (L1421). Risk: premature save during IME.

## 4.4 Focus Management

### 4.4.1 Focus behavior per action

| Action | Focus behavior |
|---|---|
| Select row | Row gets `tabIndex={0}`; previous focused row goes to `-1`. No auto-scroll. |
| Expand/collapse | Focus stays on the folder's row |
| Create | Rename input focused via ref callback (L967-981) |
| Rename (begin) | Input focused via useEffect with double-rAF (L593-639) |
| Rename (commit) | `editingNodeId = null`, input unmounts. Focus lost to body. **GAP** |
| Delete | Row unmounts. Focus lost to body. **GAP** (F-FOCUS) |
| Drag-and-drop | Focus stays on source row |

### 4.4.2 Rename input focus handoff

- `armContextMenuRenameHandoff` (L988-991) sets refs to work around Radix's focus-return
- WORKING but fragile

## 4.5 Context Menu

### 4.5.1 Trigger

- Right-click row (Radix ContextMenu wraps tree)
- **No Shift+F10** (F-12)

### 4.5.2 Items

| Item | Disabled when | Action |
|---|---|---|
| Add area inside | Never | `handleAddTreeNode(contextMenuNode.id)` |
| Save as template | `isOptimisticEstimateNodeId(...)` | Dispatch `CREATE_ESTIMATE_TEMPLATE_FROM_NODE_EVENT` |
| Rename | `isTreeMutationSaving` | `beginRenameNode` |
| Delete | `isTreeMutationSaving` | `setDeleteTargetNode` (opens modal) |

### 4.5.3 Close behavior

- `onCloseAutoFocus` intercepted (L1305-1315). If rename handoff armed, refocuses input.

### 4.5.4 Empty-area right-click

- Tree wrapper's `onContextMenu` checks `event.target.closest("[data-tree-row]")` (L1588)
- Empty-space right-click prevents menu opening

## 4.6 Scrolling

### 4.6.1 Container

- `<div className="min-h-0 flex-1 overflow-auto">` (L1578)
- Native scroll, no virtualization unless `flatNodes.length >= 150`

### 4.6.2 Auto-scroll during drag

- **MISSING** (F-13). User must manually scroll.

### 4.6.3 Scroll-to-index (virtualizer)

- Only when virtualization enabled AND `focusFlatNode` called (tree.tsx:691)

### 4.6.4 Scroll-into-view for new row

- **MISSING** (F-25)

## 4.7 Drag-and-Drop

### 4.7.1 Library

- Native HTML5 DnD (tree.tsx:1236-1240)
- NO dnd-kit, NO react-dnd
- `dataTransfer.setData("text/plain", nodeId)` + custom MIME type

### 4.7.2 Activation

- Whole row draggable (`draggable: isNodeDraggable(flat.node)` at tree.tsx:1208)
- **No activation distance**
- **No touch support** — HTML5 DnD is desktop-only

### 4.7.3 Source row appearance

- `aria-grabbed={true}` on source (tree.tsx:1220)
- No visual opacity change

### 4.7.4 Drop indicator

- `before` → `border-t-2 border-t-primary` (tree.tsx:436)
- `after` → `border-b-2 border-b-primary` (tree.tsx:437)
- `inside` → `bg-surfaceMuted` (tree.tsx:435) — **same as hover, indistinguishable**

### 4.7.5 Drop bands

- Folders / `allowInsideOnLeaves`: top 25% / middle 50% / bottom 25%
- Leaf rows without allowInside: top 50% / bottom 50%
- Entry file passes `allowInsideOnLeaves` (L1605)

### 4.7.6 Drop into expanded folder's bottom band

- Remaps to "before first child" (tree.tsx:893-898)

### 4.7.7 Hover-to-expand

- **MISSING** (F-14)

### 4.7.8 Touch dragging

- **NOT SUPPORTED**

### 4.7.9 Drop outside valid zones

- `clearDragState()` and return without calling `onDrop` (tree.tsx:982-984)

### 4.7.10 Drop on self / descendant

- Blocked at `isDropAllowed` (tree.tsx:799, 802)

### 4.7.11 Drag cancellation

- HTML5 native: `dragend` always fires
- `handleDragEnd` clears state
- No explicit Escape handler

## 4.8 Routing Synchronization

### 4.8.1 URL pattern

- `/workshop/projects/{projectId}/estimates/{nodeId}` (selected node) or `/estimates/{estimateId}` (no selection)

### 4.8.2 Direction

- **Client → URL only** via `window.history.replaceState` (L676-685)
- URL does NOT drive client state in real-time (only on SSR refresh)

### 4.8.3 URL → state on refresh

- Next.js route segment `[nodeId]` resolved server-side
- SSR fetches tree with that nodeId as selection hint
- Passed as `selectedNodeId` prop

### 4.8.4 URL parse (client)

- `getEstimateRouteNodeIdFromPathname` (L357-369) — fragile (F-23)

### 4.8.5 Tab handling

- URL does NOT change on client-side tab switch
- `routeSelectedNodeId = resolvedActiveTabId === activeTabId ? selectedNodeId : null` (EstimateWorkspaceClient.tsx:111)

### 4.8.6 Optimistic IDs in URL

- `syncEstimateRouteUrl` rejects optimistic IDs (L679). Prevents shareable URLs with optimistic ids.

## 4.9 Loading States

### 4.9.1 Initial

- SSR seeds `initialData` + `refetchOnMount: false` → no skeleton flicker

### 4.9.2 Background refetch

- `refetchOnWindowFocus: false`, staleTime 5min
- TanStack retains previous data during refetch

### 4.9.3 Mutation loading

- Sidebar-wide toast (loading tone) via `reportReorderStatus` (L502-532)
- No per-row spinner (F-15)

### 4.9.4 Tree disappearance

- NEVER during mutation (optimistic visible)
- NEVER during background refetch (TanStack retains)

## 4.10 Error States

### 4.10.1 Display

- Toast (error tone) with server error message
- No persistent banner, no retry button

### 4.10.2 Recovery

- Optimistic rollback
- User can retry immediately

### 4.10.3 Visibility

- Raw error message from action (e.g., "Could not reorder estimate tree: {rpcError.message}")
- **Not user-friendly**. **GAP**.

### 4.10.4 Silent failures

- Action always throws on RPC error
- Client always surfaces via toast
- **VERIFIED**: No silent failures

### 4.10.5 Network offline

- Fetch fails → action throws → client catches → toast. **No offline queue**.

## 4.11 Real-time / Collaborative Updates

### 4.11.1 Realtime

- Repo README mentions Supabase Realtime for cursors/presence
- For tree mutations: **NO Realtime subscription in sidebar**
- Other users' tree mutations only visible on full refetch (within staleTime)

### 4.11.2 Conflict resolution

- **Last-write-wins** at DB level
- No OT/CRDT
- **GAP**

## 4.12 Undo / Redo

- **MISSING** entirely
- Delete modal: "can be undone only if the server rejects it" (L1699) — that's optimistic rollback, not undo
- **GAP**: No trash/archive, no restore

## 4.13 Filter / Search

### 4.13.1 Search

- Trigger: text input in TreePanelHeader
- Debounce: NONE — fires every keystroke
- Behavior: prunes non-matching subtrees; ancestors of matches kept
- Side-effect: ALL folders auto-expand during search (L646-649)
- Clear: restores stored expansion

### 4.13.2 Structural filter

- Trigger: "Hide empty areas" checkbox (L1547-1558)
- Behavior: prunes subtrees with zero `estimateRowItems`

### 4.13.3 Composition

- Structured filter first (identity-stable when inactive), then search prune. Both compose.

## 4.14 Permission-based Behavior

### 4.14.1 Client gating

- Sidebar does NOT check `canEditEstimate` (received as prop by parent)
- All CRUD affordances visible regardless
- **GAP**: Read-only users see "Add Branch", "Rename", "Delete" buttons that will fail server-side

### 4.14.2 Server gating

- 5 tree-mutation actions **MISSING `assertCanEditEstimate`** (F-19)

## 4.15 Responsive / Mobile

- Sidebar hidden at `(max-width: 1023px)` (ResizableSidePanel.tsx:77)
- **F-20**: No mobile alternative
- Touch: HTML5 DnD unsupported

## 4.16 Read-only Mode

- Public share surface uses `disableRouteSync: true`
- Same component, URL sync disabled
- Still allows CRUD attempts — server RLS rejects
- **GAP**: Should disable buttons client-side when `canEditEstimate === false`
