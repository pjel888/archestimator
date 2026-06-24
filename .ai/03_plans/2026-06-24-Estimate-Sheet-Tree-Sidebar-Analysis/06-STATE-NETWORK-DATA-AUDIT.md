# 06 — State, Network, Data Audit

## 6.1 State Model

### 6.1.1 State owners

| State | Owner | Type | Lifetime |
|---|---|---|---|
| Tree nodes (server cache) | TanStack Query | `EstimateTreeNode[]` | 5min staleTime, in-memory |
| Tree revision | TanStack Query | integer | Same |
| Selected node ID | Zustand | `Record<estimateId\|tabId, string\|null>` | In-memory, never cleaned up |
| Expanded node IDs | Zustand | `Record<estimateId\|tabId, string[]>` | In-memory |
| Active tab ID | Zustand | `Record<estimateId, string>` | In-memory |
| Inline rename editor | useReducer | `{editingNodeId, editingNodeName, editingNodeError}` | Component lifetime |
| Drag state | useReducer (in Tree.tsx) | `{dragSourceId, dropTarget, activeRootDropEdge, focusId}` | Component lifetime |
| Bulk selection | useReducer | `Set<string>` | Component lifetime |
| Sidebar width | cookie + localStorage | integer | Persistent |
| Optimistic ID maps | useRef | `Map<optId, Promise<serverId>>`, `Map<optId, serverId>` | Component lifetime |
| Pending reorder count | useRef | integer | Component lifetime |
| Suppress primary action | useRef | timestamp | Component lifetime |
| Rename commit in-flight | useRef | boolean | Component lifetime |

### 6.1.2 Cross-cutting state coupling

- `selectedNodeId` lives in BOTH Zustand AND URL (replaceState). URL is downstream.
- `expandedNodeIds` lives in Zustand only. Derived `expandedItems` (L641-643) filters by `folderIds`.
- `editingNodeId` interacts with `activeSelectedNodeId` for rename reconciliation.

## 6.2 State Machine

### 6.2.1 States

- `Initializing` (SSR seeding initialData)
- `Ready` (idle, accepting interactions)
- `RowSelected` (Zustand)
- `BranchExpanded` / `BranchCollapsed` (Zustand)
- `Creating` (optimistic + server in flight)
- `Renaming` (editingNodeId set)
- `Saving` (any mutation in flight)
- `Deleting` (deletePending or bulkDeletePending)
- `Dragging` (Tree.tsx `dragSourceId !== null`)
- `Dropping` (Tree.tsx `dropTarget !== null`)
- `Refetching` (TanStack `isFetching === true`, not surfaced to UI)
- `RecoverableError` (toast error, rollback applied)
- `Read-only` (not modeled client-side; server RLS only)

### 6.2.2 Transitions (high-risk)

| From | To | Trigger | Guard | Verdict |
|---|---|---|---|---|
| Renaming | Saving | Enter/blur/✓ | `isTreeMutationSaving` false | OK |
| Renaming | Creating | (Add button — `handleAddTreeNode` does NOT check editingNodeId) | **MISSING GUARD** | **GAP** — can create during rename |
| Saving | Dragging | (blocked by `canReorderNow`) | OK | OK |
| Dragging | Saving | drop | `canReorderNow` true | OK |
| Dragging | Renaming | drop on row being renamed | blocked by `editingNodeId` in `handleTreeCanDrag` | OK |

### 6.2.3 Stuck states

- **NONE observed** — every state has clear exit transition

### 6.2.4 Duplicated state

- Selection: Zustand + URL + local `activeSelectedNodeId`. Triplicate.
- Tree data: SSR prop + TanStack cache + sidebar `localNodes`. Triplicate, reconciled via `syncLocalNodesFromProps`.

## 6.3 Query / Mutation Inventory

### 6.3.1 Queries

| Query | Cache key | Trigger | Network |
|---|---|---|---|
| `useEstimateAreaTreeQuery` | `["estimate", estimateId, "area-tree"]` | Sidebar mount | `fetchEstimateTree` |
| `useEstimateTabTreeQuery` | `["estimate", estimateId, "tab", tabId, "area-tree"]` | Sidebar mount w/ tab | `fetchEstimateTabTree` |
| `useEstimateTabsQuery` | `["estimate", estimateId, "tabs"]` | EstimateWorkspaceClient | `fetchEstimateTabs` |

### 6.3.2 Mutations (sidebar-local; no TanStack useMutation)

| Operation | Function | Cache update | Rollback |
|---|---|---|---|
| Create | `createEstimateNode` | insertLocal + replaceLocal | removeLocalEstimateTreeNode |
| Rename | `renameEstimateNode` | renameEstimateTreeNode | Conditional (F-08) |
| Delete | `deleteEstimateNode` | planEstimateTreeDelete.nextNodes | restoreLocalNodes |
| Delete bulk | `deleteEstimateNodesBulk` | iterative planEstimateTreeDelete | restoreLocalNodes |
| Reorder | `reorderEstimateTreeNodes` | plan.nextNodes | restoreLocalNodes |

### 6.3.3 Cancellation

- `prepareOptimisticUpdate` calls `queryClient.cancelQueries({ queryKey })` before optimistic update. Prevents background refetch clobbering optimistic state. **GOOD**.

## 6.4 Network Inventory

| # | Action | Endpoint | Payload | Idempotent | Timeout |
|---|---|---|---|---|---|
| 1 | createEstimateNode | RPC `create_estimate_node_with_history` | small | NO | none |
| 2 | renameEstimateNode | RPC `rename_estimate_node_with_history` | small | NO | none |
| 3 | deleteEstimateNode | RPC `delete_estimate_node_with_history` | small | NO | none |
| 4 | deleteEstimateNodesBulk | RPC `delete_estimate_nodes_bulk_with_history` | medium | NO | none |
| 5 | reorderEstimateTreeNodes | RPC `reorder_estimate_nodes_with_history` | **SCALES WITH SIBLINGS** (F-04) | NO | none |
| 6 | fetchEstimateTree (read) | RPC/select | **SCALES WITH TREE** | YES | none |
| 7 | fetchEstimateTabTree (read) | RPC/select | **SCALES WITH TAB TREE** | YES | none |

### 6.4.1 Post-mutation refresh

- Every mutation triggers `refreshInsertedEstimateTree` → FULL TREE FETCH
- F-03: Delete has TWO fetches (pre + post)

### 6.4.2 Retries

- NONE at action layer
- TanStack retries only for `useQuery`, not action calls
- **GAP**: User must manually retry failed mutations

### 6.4.3 Timeouts

- NONE — Supabase fetch has no explicit timeout
- **GAP**: Add timeout + abort

## 6.5 Cache Behavior

### 6.5.1 Invalidation

- **NONE explicit** — uses `setTree(confirmed.tree)` direct cache write
- Cross-component cache freshness relies on direct writes

### 6.5.2 Cross-estimate / cross-tab contamination

- Cache keys include estimateId + tabId — no contamination

### 6.5.3 Stale optimistic state on scope switch

- OLD scope's optimistic state remains in TanStack cache
- Returning within staleTime shows stale optimistic data
- **GAP**: Should invalidate on scope switch

## 6.6 Race Conditions

### 6.6.1 F-01: Optimistic create + Zustand getState() race

- Read-after-write race on Zustand store mid-promise. Can resurrect just-collapsed parent.

### 6.6.2 F-07: pendingPropNodesRef single-slot

- Multiple concurrent echoes → second overwrites first.

### 6.6.3 Late response overwrites

- Rename late response (L1055-1057) can clobber concurrent edits.
- Reorder protected by `optimisticRevision` check.
- Delete protected by `optimisticRevision` check.

### 6.6.4 Concurrent creates

- `pendingNodeCreatesRef` Map + `resolveServerNodeId` chain child behind parent. **GOOD**.
- Same-parent simultaneous: blocked by `isTreeMutationSaving`. **GOOD**.

### 6.6.5 Concurrent reorder + edit

- `pendingReordersRef` counter + deferred prop sync. **GOOD**.

### 6.6.6 Tab switch mid-mutation

- No abort
- Cache for previous scope continues to be mutated
- User returning sees late-settled state

## 6.7 Persistence

### 6.7.1 Transaction boundaries

- All 5 mutation RPCs assumed atomic at Postgres level
- **UNVERIFIED**: Are `estimate_row_items` deletes in same transaction as `estimate_nodes`? Needs migration audit.

### 6.7.2 Audit trail

- All 5 RPCs end with `_with_history` suffix → writes to `estimate_sheet_events` table

### 6.7.3 Cascading delete

- Client projects via `planEstimateTreeDelete`
- Server `delete_estimate_node_with_history` assumed to cascade
- **UNVERIFIED** — needs migration audit (F-10)

## 6.8 Data Integrity

### 6.8.1 Structural invariants

| Invariant | Client | Server | Verdict |
|---|---|---|---|
| Unique IDs | n/a | DB PK | OK |
| Parent ID validity | YES | YES | OK |
| Stable sibling ordering | YES | RPC assumed | OK |
| Max depth | NO | NO | **GAP** (F-MAXDEPTH) |
| Self-parent | YES | RPC | OK |
| Descendant-parent | YES | RPC | OK |
| Cross-tab isolation | NO client | YES (actions.ts:1435) | OK |
| Orphan prevention | n/a | FK | UNVERIFIED |
| Multiple parents | n/a | DB schema | OK |

### 6.8.2 Optimistic conflicts

- No version/etag
- Last-write-wins
- **GAP**

### 6.8.3 Lost updates

- No `UPDATE ... WHERE version = X`
- **GAP**

## 6.9 Authorization + Validation

### 6.9.1 Authorization

| Action | `requireAuth` | `getCurrentWorkspaceProject` | `assertCanEditEstimate` | RLS |
|---|---|---|---|---|
| createEstimateNode | YES | YES | **NO** (F-19) | assumed |
| renameEstimateNode | YES | YES | **NO** | assumed |
| deleteEstimateNode | YES | YES | **NO** | assumed |
| deleteEstimateNodesBulk | YES | YES | **NO** | assumed |
| reorderEstimateTreeNodes | YES | YES | **NO** | assumed |
| insertEstimateTemplateIntoEstimate | YES | YES | YES | — |

### 6.9.2 Input validation

| Field | Client | Server |
|---|---|---|
| name | trim, non-empty | `readRequiredText`/`readEstimateNodeName` |
| name length cap | NONE | NONE |
| parentId | optimistic-id guard | existence check |
| sortOrder | integer ≥ 0 | integer ≥ 0 |
| nodeIds (bulk) | trim, non-empty | trim, non-empty |

### 6.9.3 XSS risk

- Node name rendered as text content (L1388, L1396)
- React escapes by default → no XSS
- **GOOD**

## 6.10 Validation Summary

| Area | Coverage | Risk |
|---|---|---|
| Auth | Partial (no assertCanEditEstimate) | MEDIUM |
| RLS | Assumed | UNVERIFIED |
| Input validation | Basic | LOW |
| Structural invariants | Client + assumed server | UNVERIFIED for DB |
| Max depth | NONE | LOW |
| Conflict resolution | NONE | MEDIUM |
| XSS | React escaping | LOW |
| CSRF | Next.js server actions | LOW |
| SQL injection | Supabase parameterized | LOW |
