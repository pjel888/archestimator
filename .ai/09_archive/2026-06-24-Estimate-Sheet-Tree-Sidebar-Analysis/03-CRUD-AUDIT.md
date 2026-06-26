# 03 — CRUD Audit

Lifecycle analysis of Create, Read, Rename/Update, Delete, Move. All evidence from static source read 2026-06-24.

## 3.1 CREATE

### 3.1.1 Surface

- **Trigger A (Root)**: "Add Branch" toolbar button → `handleAddArea()` → `handleAddTreeNode(undefined)` (entry file L945-961, L842-939)
- **Trigger B (Child)**: Context menu "Add area inside" → `handleAddTreeNode(contextMenuNode.id)` (L1329-1337)
- **Trigger C (Empty state)**: Page-level empty-state "Add Area" dispatches `REQUEST_ESTIMATE_TREE_NODE_CREATE_EVENT` (handled L949-961)

### 3.1.2 Ideal vs Actual

| Step | Ideal | Actual | Verdict |
|---|---|---|---|
| Parent selection | Correct parent | Same | OK |
| Optimistic insert | Immediate local row | `insertLocalEstimateTreeNode` (L103-121) | OK |
| Position | Append at end of siblings | Same (L105, L115 append) | OK |
| Selection | New node selected | `setSelectedNodeId(optimisticNodeId)` (L857) | OK |
| Parent expansion | Expand parent if collapsed | L852-854 | OK |
| Rename mode | Auto-enter rename | `setEditingNodeId(optimisticNodeId)` (L859) | OK |
| Input focus | Immediate focus | Via `attachRenameInputRef` ref callback (L967-981) | OK |
| Default text selected | Select-all on focus | `input.select()` in ref callback (L979) | OK |
| Scroll into view | New row visible | **MISSING** — no `scrollIntoView` (Finding F-25) | GAP |
| Enter to save | Yes | L1421-1424 | OK |
| Blur to save | Yes | L1406-1410 | OK |
| Escape to cancel | Yes | L1425-1428 | OK |
| Optimistic rollback | Revert on error | `removeLocalEstimateTreeNode` on catch (L916) | OK |
| Optimistic id reconciliation | Server id replaces optimistic | `replaceLocalEstimateTreeNodeId` (L886) | OK |
| Selection survives reconciliation | Yes | L904-910 checks state and remaps | Mostly OK (F-01) |
| Drag-and-drop on optimistic node | Blocked until settled | `handleTreeCanDrag` blocks `isOptimisticEstimateNodeId` (L692) | OK |
| Empty name rejection | Reject empty/whitespace | `commitRenameNode` rejects empty (L1027-1033) for rename; create's optimistic name is "New Area" so never empty | OK |
| Max name length | Limit | **NONE** | GAP |
| Unicode/emoji | Accept | Standard input, no normalization | OK (untested) |
| IME composition | No premature save | `event.key === "Enter"` fires during composition. **No `event.isComposing` / `keyCode === 229` guard.** (L1419-1424) | **GAP** (F-IME) |
| Duplicate name prevention | Server validates | **NONE** — duplicates allowed | GAP |
| Idempotency | No double-create on retry | `isTreeMutationSaving` blocks user; no idempotency token sent to server. Server `create_estimate_node_with_history` non-idempotent. | GAP |
| Sidebar-wide block | No | `isTreeMutationSaving` blocks all rows | GAP (F-15) |
| Pending indicator on row | Yes | NO — only sidebar-wide toast | GAP (F-15) |
| Other rows interactive | Yes | NO — `isTreeMutationSaving` blocks | GAP (F-15) |

### 3.1.3 Failure Modes

- **Network failure**: Optimistic row removed, selection reverts, toast shows error.
- **Parent optimistic**: `pendingNodeCreatesRef` chains child create behind parent's in-flight create (L877-880). Good.
- **Late response**: `pendingNodeCreatesRef` deleted on resolution (L885). A late response after user has deleted the node would still try to `replaceLocalEstimateTreeNodeId` — but the optimistic id is gone, so map operation is a no-op. OK.
- **Repeated Enter**: `renameCommitInFlightRef` (L1022) guards commit. OK.
- **Click "Add" while another create is pending**: Blocked by `isTreeMutationSaving`. OK.

## 3.2 READ

### 3.2.1 Authoritative source

- **Server (SSR)**: src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx:141 server-fetches the estimate tree and passes as `nodes` prop.
- **Client cache**: `useEstimateAreaTreeQuery` (legacy) or `useEstimateTabTreeQuery` (tabbed) holds the same data in TanStack Query cache.
- **Sidebar `nodes` prop**: Receives from parent `EstimateWorkspaceClient`, which receives from the page. The sidebar ALSO maintains `localNodes` (from cache) that diverges during optimistic updates.

### 3.2.2 Initial load

- SSR seeds `initialData: initialNodes` (use-estimate-query.ts:44)
- `refetchOnMount: false` (L46) — no double-fetch on mount
- `staleTime: 5 * 60_000` (L48) — 5-minute staleness window
- `refetchOnWindowFocus: false` default (L29, L90)
- **VERIFIED WORKING**: No double-fetch, no flash, no layout shift on first paint.

### 3.2.3 Cache key isolation

| Key shape | Scope |
|---|---|
| `["estimate", estimateId, "area-tree"]` | Per-estimate (legacy, no tabs) |
| `["estimate", estimateId, "tab", tabId, "area-tree"]` | Per-tab |
| `["estimate", estimateId, "tab", tabId, "area-tree", "revision"]` | Optimistic version counter |

**No collision risk** between estimates or tabs. Good.

### 3.2.4 Background revalidation

- `refetchOnWindowFocus: false` → no refetch on tab focus
- StaleTime 5min → revalidate on explicit invalidation only
- **No explicit `invalidateQueries` call** in the sidebar — uses `setTree(confirmed.tree)` directly. **GOOD for atomicity.**

### 3.2.5 StrictMode behavior

- React 19 StrictMode double-invokes effects in dev. The `useEffect` at L487-500 and L579-591 would fire twice. Both idempotent (signature-based dedup, set-based prune). OK.

### 3.2.6 N+1 / waterfall

- SSR is a single tree fetch.
- Client queries are single fetch per cache key.
- No N+1 patterns observed.

### 3.2.7 Cache contamination across estimates/tabs

- Each estimate + tab has its own cache key.
- **OLD optimistic state in the previous scope's cache is abandoned** — not actively cleaned up. User returning to that scope within staleTime could see stale optimistic data.

### 3.2.8 Server payload size

- Tree fetch returns full tree with all row items (19+ fields per row item).
- For large estimates (1000+ nodes, 10000+ row items), payload could exceed 1MB.
- **No pagination, no lazy-loading of children**. Full tree fetched always.
- **GAP**: Lazy-loading would help at scale (F-PAYLOAD).

## 3.3 RENAME / UPDATE

### 3.3.1 Trigger surface

- **Mouse**: Context menu "Rename" (L1356-1363)
- **Keyboard**: NONE — no F2 shortcut (F-12)
- **Double-click**: NOT supported

### 3.3.2 Editor lifecycle

| State | Trigger | Effect |
|---|---|---|
| Idle → Editing | `beginRenameNode` (L993) | `editingNodeId = node.id`, etc. |
| Editing → Saving | `commitRenameNode` (L1021) | `editingNodeId = null` (closes editor immediately, F-24), optimistic rename, server call |
| Saving → Saved | Server response | `reorderStatus = saved` |
| Saving → Error | Server error | Conditional rollback (F-08) |
| Editing → Cancelled | Escape (L1425-1428) | `cancelRenameNode` closes editor |
| Editing → Reset | ✗ button (L1471-1475) | `resetRenameNode` restores original name, keeps editor open |

### 3.3.3 Visual consistency (display → edit mode)

| Property | Display | Edit | Match? |
|---|---|---|---|
| Row height | `min-h-7` (28px) | `min-h-7` preserved | OK |
| Input height | n/a | `h-5` (20px) | MISMATCH — input is 8px shorter |
| Font size | `text-[10px]` from row | `font-normal` from input, no explicit size | MISMATCH |
| Font weight | `text-ink` | `font-normal` | OK |
| Line height | row default | `leading-5` (20px) | MISMATCH |
| Border | `border-transparent` | `border-accent` + custom shadow | Intentional focus indicator |
| Text baseline | Top of px-1 box | Center of h-5 | MISMATCH — text moves |

**Verdict**: Row outer height preserved but input is 8px shorter, icons misalign. **F-09**.

### 3.3.4 Validation

- Empty: `editingNodeError = "Name is required."` (L1027-1033) ✓
- Whitespace-only: `nextName = editingNodeName.trim()` (L1026) ✓
- No length cap
- No character restrictions
- Multi-line paste: input auto-truncates at first newline (browser default) ✓
- Duplicate names: ALLOWED
- IME composition: NO `event.isComposing` guard (L1419-1424). **GAP (F-IME)**.

### 3.3.5 Optimistic behavior

- YES: `setLocalNodes(renameEstimateTreeNode(previousNodes, node.id, nextName))` (L1049-1050)
- Rollback on error: Conditional (F-08)

### 3.3.6 Deduplication of save

- `renameCommitInFlightRef` (L1022) guards against double-commit. Verified working.

### 3.3.7 Late response overwrites

- Server response overwrites local state if `confirmed.nodeId !== node.id || confirmed.name !== nextName` (L1055-1057).
- **Risk**: Late response can clobber concurrent edits.

## 3.4 DELETE

### 3.4.1 Surface

- **Single**: Context menu "Delete" → modal → `handleConfirmDeleteNode`
- **Bulk**: Checkbox multi-select → BulkActionToolbar → modal → `handleConfirmBulkDeleteNodes`

### 3.4.2 Cascade policy

- **Client projection**: `planEstimateTreeDelete` (estimate-tree-edit.ts:54-76) cascades entire subtree.
- **Server**: `delete_estimate_node_with_history` RPC — assumed to cascade via FK. **NOT VERIFIED — needs migration audit.**
- **No reassignment option**: Always full cascade.

### 3.4.3 Confirmation UX

- Modal title: "Delete {node.name}"
- Description: "This removes the Area, every Area inside it, and all their cost rows." (L1502)
- **Missing**: Descendant count
- **Missing**: Warning about linked estimate_row_items

### 3.4.4 Selection after delete

- Client projects `fallbackNodeId` via `getDeleteFallbackNodeId` (estimate-tree-edit.ts:109-123)
- Order: next sibling → previous sibling → parent → first root
- Deterministic.

### 3.4.5 Server reconciliation

- Client uses CLIENT-PROJECTED `deletedNodeIds` (returned from action L2182-2184) to decide selection/route update.
- **F-06**: If server cascades differently, selection can land on a deleted node.

### 3.4.6 Final-root delete

- Allowed. Result: `nodes.length === 0`, invisible empty state (F-21).

### 3.4.7 Idempotency

- Server RPC non-idempotent.
- Client blocks via `isTreeMutationSaving`.
- No idempotency token.

### 3.4.8 Transaction boundary

- Single RPC per delete. Assumed atomic.
- **Not verified**: Are `estimate_row_items` deletes in the same transaction as `estimate_nodes`?

### 3.4.9 Error rollback

- `restoreLocalNodes(previousNodes, optimisticRevision)` if revision matches (L1151-1152).
- Restores selection + URL. Verified working.

### 3.4.10 Focus management after delete

- No explicit focus restoration. Focus falls to `document.body`.
- **GAP** (F-FOCUS).

## 3.5 MOVE / REORDER / REPARENT

### 3.5.1 Intra-tree drag

- Source: any non-optimistic, non-editing, non-saving, non-searching node
- Target: any row in same tree
- Bands: 25%/50%/25% for folders / allowInsideOnLeaves; 50%/50% for leaf rows otherwise
- Validation: blocks self-drop, descendant-drop, multi-drag, no-op

### 3.5.2 Multi-node drag

- **NOT SUPPORTED**. `validateEstimateTreeDrop` returns `multi-drag-unsupported`.

### 3.5.3 Cross-tree drag

- Not directly supported. External drops accept only templates and project sources.

### 3.5.4 Cycle prevention

- YES: `getDescendantEstimateNodeIds(sourceLocation.node).has(targetParentId)` blocks descendant-as-parent.

### 3.5.5 Cross-tab drag

- Server rejects: actions.ts:1435-1437.

### 3.5.6 Max depth

- **NONE enforced**. Risk: deep recursion stack overflow at extreme depth.

### 3.5.7 Sort order strategy

- Client uses multiples of 10 (estimate-tree-reorder.ts:204).
- Server create uses `maxSiblingSortOrder + 1` (actions.ts:2097) — **incompatible** (F-18).
- Every reorder rewrites ALL affected siblings' sortOrders (F-04).

### 3.5.8 Optimistic + rollback

- Optimistic: `setLocalNodes(freshResult.plan.nextNodes)` (L749)
- Revision captured
- Server echo merged via `mergeEstimateTreeStructureWithCachedNodes` if revision matches
- On error: `restoreLocalNodes(previousNodes, optimisticRevision)`

### 3.5.9 Network payload

```typescript
{
  target_estimate_id,
  move_updates: [{ id, parent_id, sort_order }, ...],  // all siblings of affected parents
  acting_user_id,
  correlation_id
}
```

Payload scales with sibling count, not move count. (F-04)

### 3.5.10 Hover-to-expand during drag

- **NONE** (F-14)
- Auto-expand only AFTER drop

### 3.5.11 Auto-scroll during drag

- **NONE** (F-13)

### 3.5.12 Drag cancellation

- HTML5 native: `dragend` always fires. Tree's `handleDragEnd` clears drag state.

### 3.5.13 Keyboard alternative

- **NONE** (F-11)

## 3.6 EXTERNAL DROP (templates, project sources)

### 3.6.1 Surface

- Templates and project sources from right sidebar
- Accepted via `treeExternalDrop.types` (L793)
- Drop position: **inside only**

### 3.6.2 Flow

1. User drags template from right sidebar
2. Hovers tree row → `canDrop` validates
3. Drops → `onDrop` reads payload
4. Dispatches window event (`INSERT_ESTIMATE_TEMPLATE_EVENT` or `INSERT_PROJECT_SOURCE_EVENT`)
5. Middle sheet's listener handles insert + server call
6. Tree refreshes via that action's return value

### 3.6.3 No optimistic placeholder

- Sidebar does NOT insert a placeholder row.
- **GAP**: User sees no immediate feedback (F-EXT-OPTIMISTIC).

## 3.7 AUDIT SUMMARY

| Operation | Optimistic | Rollback | Test Coverage | Notable Risk |
|---|---|---|---|---|
| Create | YES | YES | partial | F-01, F-IME, F-25 |
| Read | — | — | none | F-02 (signature over-eager) |
| Rename | YES | Conditional (F-08) | partial | F-IME, F-09, F-24 |
| Delete (single) | YES | YES | partial | F-03, F-06, F-10 |
| Delete (bulk) | YES | YES | partial | F-06 |
| Reorder | YES | YES | YES | F-04 |
| Reparent | YES | YES | YES | F-MAXDEPTH |
| External drop | NO | n/a | partial | F-EXT-OPTIMISTIC |
