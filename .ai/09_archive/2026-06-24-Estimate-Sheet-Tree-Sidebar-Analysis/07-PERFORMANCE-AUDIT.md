# 07 — Performance Audit

## 7.1 Render Analysis

### 7.1.1 Component render cost

| Component | Re-renders on | Memo? | Cost |
|---|---|---|---|
| `EstimateSheetTree` | Any state change | NO (root of subtree) | HIGH |
| `DefaultTreeRow` | Tree re-render | YES (`memo` at tree.tsx:409) | LOW per row |
| `TreeFlatRow` | Tree re-render | YES (`memo` at tree.tsx:566) | LOW per row |
| `Tree` | nodes/expandedSet/drag state change | NO | HIGH |
| `TreePanelHeader` | Toolbar state | unknown | TBD |

### 7.1.2 Render fan-out per operation

| Operation | Re-renders |
|---|---|
| Selection change | EstimateSheetTree → all visible rows (selectedIds array identity changes) |
| Expansion change | Same — expandedNodeIds array identity changes |
| Rename keystroke | editingNodeName dispatch → EstimateSheetTree → ALL rows |
| Create/Delete | localNodes change → flattenTree → all rows |
| Drag | Tree reducer → all rows re-evaluate isDragSource/isDropTarget |

### 7.1.3 Memoization

- `TreeFlatRow` and `DefaultTreeRow` are `memo`'d
- BUT `buildRowProps` deps include `selectedIds`, `dragSourceId`, `dropTarget` — any change breaks memo for every row
- **GAP**: Stabilize callback identity

### 7.1.4 Recursive processing

- `flattenTree`, `indexTree`, `indeterminateIds`, `buildUiTreeModel`, `filterEstimateTreeNodes`, `filterEstimateTreeByStructure`: all O(n), all memo'd
- ~5 O(n) passes per render. For 1000 nodes, 5000 ops/render.

### 7.1.5 Signature computation

- `getEstimateTreeContentSignature` (estimate-tree-reorder.ts:234-273): O(n × m) where m = avg row items per node
- Fires on every `nodes` prop change
- **F-02 + F-27**: Over-eager + expensive

## 7.2 Algorithmic Complexity

| Operation | Complexity |
|---|---|
| `findEstimateNode` (DFS) | O(n) |
| `findNodeLocation` | O(n) |
| `cloneNode` (recursive) | O(n) |
| `insertLocalEstimateTreeNode` | O(n) |
| `removeLocalEstimateTreeNode` | O(n) |
| `replaceLocalEstimateTreeNodeId` | O(n) |
| `planEstimateTreeDelete` | O(n) |
| `buildEstimateNodeReorderPlan` | O(n) |
| `buildSiblingUpdates` | O(siblings) |
| `getDescendantEstimateNodeIds` | O(subtree) |
| `mergeEstimateTreeStructureWithCachedNodes` | O(n) |
| `getEstimateTreeContentSignature` | O(n × m) |
| `flattenTree` | O(n) |
| `indexTree` | O(n) |
| `indeterminateIds` | O(n) |

**O(n²) risk**: None observed.

## 7.3 Network Efficiency

### 7.3.1 Initial load

- SSR fetches tree once
- Client receives as `initialData` → no double-fetch

### 7.3.2 Mutation payload

- Create/rename/delete (single): small
- Delete (bulk): scales linearly with root count
- Reorder: **SCALES WITH SIBLING COUNT** (F-04)

### 7.3.3 Post-mutation refresh

- Every mutation triggers FULL TREE FETCH
- F-03: Delete has TWO fetches

### 7.3.4 Background refetch

- `refetchOnWindowFocus: false`, staleTime 5min
- TanStack deduplicates → no N+1

## 7.4 Large-Tree Risks

### 7.4.1 DOM node count

- Without virtualization: 1000 expanded nodes = ~5000-10000 DOM nodes → perf degrades around 5000

### 7.4.2 Virtualization

- Default enabled via `WORKSHOP_TREE_VIRTUALIZATION`
- Threshold: `flatNodes.length >= 150`
- Uses `@tanstack/react-virtual`'s `useVirtualizer`
- Estimate row height: 28px
- Overscan: 8

### 7.4.3 Behavior at scale

| Size | Render | Network | Memory |
|---|---|---|---|
| 10 nodes | fast | tiny | low |
| 100 nodes | fast | small | low |
| 1000 nodes | OK (virtualized) | 50KB-500KB | medium |
| 10000 nodes | UNTESTED | 5MB+ | HIGH |
| Depth 1 | OK | OK | OK |
| Depth 5 | OK | OK | OK |
| Depth 10 | readability issues | OK | OK |
| Depth 50 | **stack overflow risk** in recursive ops | OK | OK |

### 7.4.4 Deep recursion risk

- All tree ops recursive. JS stack ~10000 frames.
- **GAP**: Mitigate via iterative algorithms or max depth guard.

### 7.4.5 Wide-tree risk

- 1 parent + 500 children: buildSiblingUpdates O(siblings), payload O(siblings)
- Reorder within wide tree: 500 UPDATE rows
- **F-04**: Use fractional sort_order or incremental updates.

## 7.5 Drag Performance

### 7.5.1 Dragover frequency

- `handleDragOver` fires on every mousemove
- Each call: `readDraggedId` (Map), `resolveDropIntent` (rect+ratio), `isDropAllowed` (cycle check via `getDescendantEstimateNodeIds` — O(subtree))
- **Risk**: O(n × subtree) per drag of deep node

### 7.5.2 Drop indicator renders

- Equality check in reducer avoids redundant renders. **GOOD**.

### 7.5.3 Dragover perf test

- `estimate-tree-drag-over-perf.test.ts` exists

## 7.6 Memory Leaks

### 7.6.1 Event listeners

- Tree external-drop effect (tree.tsx:857-868): adds + removes listeners. **GOOD**.
- ResizableSidePanel's `startResize`: adds + removes. **GOOD**.

### 7.6.2 Timers

- Rename focus effect uses rAF + setTimeout, cleaned up. **GOOD**.

### 7.6.3 Stale subscriptions

- Zustand store grows unbounded (F-16)

### 7.6.4 State updates after unmount

- Mutation promises capture setter closures
- React 19 tolerates (no warning) but state changes lost
- **GAP**: Should use AbortController

## 7.7 React Strict Mode

- All sidebar effects idempotent (signature dedup, set-based prune, listener add/remove)
- **VERIFIED**: StrictMode-safe

## 7.8 Ranked Optimizations

| Rank | Optimization | Effort | Impact |
|---|---|---|---|
| 1 | Structure-only signature (F-02, F-27) | S | HIGH |
| 2 | Per-row pending state (F-15) | M | MEDIUM |
| 3 | Fractional sortOrder (F-04) | M | MEDIUM |
| 4 | Skip pre-delete tree fetch (F-03) | S | MEDIUM |
| 5 | Stabilize buildRowProps deps (memo) | M | MEDIUM |
| 6 | Cleanup Zustand on unmount (F-16) | S | LOW |
| 7 | AbortController for unmount | M | LOW |
| 8 | Iterative tree ops for deep safety | L | LOW |
| 9 | Lazy-load subtrees (>1000 nodes) | L | LOW |

## 7.9 Measurement Plan

### 7.9.1 React Profiler (dev)

```bash
bun run dev
# React DevTools → Profiler → Record while performing operations
```

Profile:
- Select node (<16ms target)
- Expand folder with 50 children
- Rename (per keystroke <16ms)
- Create (optimistic <16ms)
- Delete (optimistic <16ms)
- Drag (per dragover <16ms)
- Initial render with 100, 500, 1000 nodes

### 7.9.2 Network inspection

```bash
bun run dev
# DevTools → Network → inspect RPC payloads
```

Verify:
- Initial = 1 fetch
- Mutation = 1 RPC + 1 refresh (delete = 2 per F-03)
- Payload size scales with tree

### 7.9.3 Large-data testing

- Seed estimate with 1000 nodes
- Measure initial render, selection latency, drag latency
- Compare virtualization on/off

### 7.9.4 Production build

```bash
bun run build && bun run start
```

## 7.10 Performance Summary

| Area | Status | Risk |
|---|---|---|
| Initial render | GOOD (SSR + initialData) | LOW |
| Selection latency | GOOD (pure client) | LOW |
| Rename responsiveness | OK | LOW |
| Mutation latency | OK small; SCALES WITH TREE (F-03) | MEDIUM |
| Drag performance | OK small; O(subtree) per dragover | MEDIUM |
| Large-tree (>1000) | UNTESTED | MEDIUM |
| Deep-tree (>100) | STACK OVERFLOW RISK | LOW |
| Memory leaks | NONE except Zustand (F-16) | LOW |
| StrictMode | COMPATIBLE | LOW |
