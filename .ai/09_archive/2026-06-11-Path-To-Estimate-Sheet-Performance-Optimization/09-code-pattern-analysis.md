# 09 — Code Pattern Analysis

**Date**: 2026-06-11 | **Status**: Current source snapshot; verify line numbers before editing | **Prior Oracle**: 6 passes | **Last Update**: 2026-06-11 02:42 UTC
**Purpose**: Exact code patterns with line numbers showing performance bottlenecks

---

## Pattern 1: Bare Variable `projectTotal` (Not Memoized)

**File**: `src/components/workshop/EstimateSheetContent.tsx:3559` in the current dirty worktree snapshot

```typescript
const projectTotal = estimateTree.reduce(
  (total, node) => total + computeNodeTotal(node, editableRows),
  0
);
```

**Problem**: This is a bare variable in the render body. It recalculates on EVERY render of `EstimateSheetContent` — including renders caused by cursor movement, modal open/close, selection changes, collapse/expand, and sheet search. None of these affect `estimateTree` or `editableRows`.

**Fix**:
```typescript
const projectTotal = useMemo(
  () => estimateTree.reduce((total, node) => total + computeNodeTotal(node, editableRows), 0),
  [estimateTree, editableRows]
);
```

**Impact**: Should eliminate O(n) tree traversal on non-row-edit renders if dependencies are correct; validate with render-count and behavior parity tests.

---

## Pattern 2: Keystroke-Driven `editableRows` State

**File**: `src/components/workshop/EstimateSheetContent.tsx:3416` in the current dirty worktree snapshot

```typescript
const [editableRows, setEditableRows] = useState<Record<string, EditableRowValue>>(
  () => collectEditableRows(nodes)
);
```

**Problem**: Every keystroke in a cell input calls `setEditableRows`, which triggers a full re-render of the 4,336-line component in the current snapshot. All downstream `useMemo` hooks depend on `editableRows`:

```typescript
// Current line ~3560 — recalculates on every keystroke
const currentRows = useMemo(
  () => flattenEstimateRows(estimateTree, editableRows),
  [editableRows, estimateTree]
);

// Current line ~3465 — recalculates on every keystroke
const currentProposalPreviewSignature = useMemo(
  () => createProposalPreviewSignature(estimateTree, editableRows, resolvedProposalExportMetadata),
  [editableRows, estimateTree, resolvedProposalExportMetadata],
);

// Current line ~3564-3571 — recalculates on every keystroke
const activityScopeItems = useMemo(
  () => buildActivityScopeTreeItems({ nodes: estimateTree, rows: currentRows, editableRows, ... }),
  [currentRows, editableRows, estimateTree, projectTotal, resolvedProposalExportMetadata],
);
```

**Fix** (React 19 `useDeferredValue`):
```typescript
const [editableRows, setEditableRows] = useState<Record<string, EditableRowValue>>(
  () => collectEditableRows(nodes)
);
const deferredRows = useDeferredValue(editableRows);  // Add this

// Then change all useMemo deps from editableRows → deferredRows:
const currentRows = useMemo(
  () => flattenEstimateRows(estimateTree, deferredRows),  // ← changed
  [deferredRows, estimateTree]                             // ← changed
);
```

**Impact**: Cell inputs respond immediately (local state); expensive calculations lag by one frame. React handles the scheduling — no manual debounce needed.

---

## Pattern 3: No `React.memo` on Row Table

**File**: `src/components/workshop/EstimateSheetContent.tsx` — `EstimateRowItemsTable` (search for function definition)

**Problem**: Every keystroke in ANY cell re-renders ALL `EstimateRowItemsTable` instances, even those whose items didn't change.

**Fix**:
```typescript
const MemoizedEstimateRowItemsTable = React.memo(
  EstimateRowItemsTable,
  (prev, next) => shallowEqual(prev.items, next.items)
);
```

**Impact**: 9 out of 10 table instances skip re-render when editing a single cell.

---

## Pattern 4: Data Fetching Waterfall

**File**: `src/app/workshop/projects/[projectId]/layout.tsx:24-30`

```typescript
const { project: liveProject } = await getCurrentWorkspaceProject(projectId);  // BLOCKS
const [collaborationSummary, publicationSummary, projectEstimateSheets] = liveProject
  ? await Promise.all([  // Only starts AFTER getCurrentWorkspaceProject resolves
      getProjectCollaborationSummary(projectId),
      getProjectPublicationSummary(projectId),
      listProjectEstimateSheets(projectId),
    ])
  : [null, null, []];
```

**Waterfall depth**:
```
getCurrentWorkspaceProject (line 1077)
  └─ ensureDefaultWorkspace() (line 1077)
       └─ requireCurrentUserContext() → supabase.auth.getUser() → profiles → beta check
            └─ [RPC] ensure_current_user_profile
  └─ projects.select("*") (line 1085)
  └─ [conditional] workspaces.select("*") (line 1094)

THEN (blocks until above resolves):

Promise.all([
  getProjectCollaborationSummary  → 8 sub-queries
  getProjectPublicationSummary    → 4 sub-queries
  listProjectEstimateSheets       → 1 query
])
```

**Fix**: Pre-compute workspace context. Move `getCurrentWorkspaceProject` into the Promise.all or parallelize with user context from the layout:

```typescript
// In workshop layout, compute user context early
const userCtx = await getCurrentUserContext();  // Cached via React cache()

// In project layout, fetch project in parallel with other fetches
const [{ project }, collab, pub, sheets] = await Promise.all([
  getCurrentWorkspaceProject(projectId),
  getProjectCollaborationSummary(projectId),
  getProjectPublicationSummary(projectId),
  listProjectEstimateSheets(projectId),
]);
```

---

## Pattern 5: `select('*')` with Large JSONB

**File**: `src/lib/repositories/workspace-repository.ts:1085`

```typescript
const { data: project, error } = await supabase
  .from("projects")
  .select("*")       // ← fetches metadata JSONB (1-5KB)
  .eq("id", projectId)
  .maybeSingle();
```

**File**: `src/lib/repositories/workspace-repository.ts:1653`

```typescript
const { data: rowItems, error: rowItemsError } = await supabase
  .from("estimate_row_items")
  .select("*")       // ← fetches metadata JSONB (0.5-2KB) + source_snapshot JSONB (1-10KB)
  .eq("estimate_id", selectedNode.estimate_id)
  .order("sort_order", { ascending: true });
```

**The `source_snapshot` on `estimate_row_items` is the worst offender**: It's 1-10KB per row and only needed when the row is linked to a library item (`link_state = 'linked'`). For unlinked rows, it's pure waste.

**Fix**:
```typescript
// projects — only fetch needed columns
.select("id, workspace_id, name, client_name, project_code, location, currency_code, created_by, created_at, updated_at")
// NOT: metadata (unless specifically needed for this render)

// estimate_row_items — conditional fetch
.select("id, estimate_id, node_id, sort_order, material, description, supplier, unit, quantity, unit_cost, misc_cost, contingency_percentage, discipline, designation, link_state, created_at, updated_at")
// OMIT: metadata, source_snapshot (fetch separately only when row is linked)
```

**Impact**: `source_snapshot` alone can be 500KB for a 50-row sheet where all rows are linked. Omitting it when not needed saves 5-10KB per unlinked row.

---

## Pattern 6: Component Library Eager-Load

**File**: `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx:32-36`

```typescript
const [estimateTreeResult, componentLibrary, currentUser] = await Promise.all([
  getProjectEstimateTreeByNode(projectId, nodeId),
  getCurrentWorkspaceComponentLibrary(),  // ← fetches 8+ tables on EVERY page load
  requireCurrentUserContext(),
]);
```

The component library is fetched even though the user may never open the sidebar. In `getCurrentWorkspaceComponentLibrary()` (in `component-library-repository.ts`), 8+ tables are queried:

1. `component_category_nodes` (line 516)
2. `component_suppliers` (line 517)
3. `component_brands` (line 523)
4. `cost_library_items` (line 529)
5. `library_folders` (line 314)
6. `cost_library_item_price_options` (line 568 — `.in("item_id", itemIds)`)
7. `cost_library_item_versions` (line 576)
8. `cost_library_item_price_history` (line 582)
9. `cost_library_item_state_history` (line 588)
10. `cost_library_item_variant_cost_entries` (line 594)
11. `cost_library_item_variant_attachments` (line 603)
12. `estimate_templates` (line 709)
13. `estimate_template_nodes` (line 724)
14. `estimate_template_row_items` (line 729)

**Fix**: Remove from server page. Add client-side fetch triggered by sidebar open:

```typescript
// Remove from page.tsx:
// getCurrentWorkspaceComponentLibrary(),  ← REMOVE

// Add to EstimateRightSidebar:
const { data: library, isLoading } = useQuery({
  queryKey: ["component-library", workspaceId],
  queryFn: () => fetchComponentLibrary(workspaceId),
  enabled: isSidebarOpen,  // ← only fetch when sidebar opens
  staleTime: Infinity,     // ← cache for session
});
```

**Impact**: Removes 14 queries from initial page load. Saves ~50-200KB payload.

---

## Pattern 7: QueueMicrotask Double-Render

**File**: `src/components/workshop/EstimateSheetContent.tsx:3513` and a second occurrence near `3844`

```typescript
useEffect(() => {
  let cancelled = false;
  queueMicrotask(() => {       // ← causes double render
    if (cancelled) return;
    setBulkSelectedRowIds((current) => {
      if (current.size === 0) return current;
      const next = new Set([...current].filter((rowId) => visibleSheetRowIds.has(rowId)));
      return next.size === current.size ? current : next;
    });
  });
  return () => { cancelled = true; };
}, [visibleSheetRowIds]);
```

**Problem**: `queueMicrotask` defers state update by one microtask tick, causing an extra render cycle. React 19's automatic batching should handle this without `queueMicrotask`.

**Fix**: Remove `queueMicrotask`. React 19 already batches state updates within effects. If the deferred update is still needed, use `startTransition`:

```typescript
useEffect(() => {
  startTransition(() => {     // ← React 19 concurrent feature
    setBulkSelectedRowIds((current) => {
      if (current.size === 0) return current;
      const next = new Set([...current].filter((rowId) => visibleSheetRowIds.has(rowId)));
      return next.size === current.size ? current : next;
    });
  });
}, [visibleSheetRowIds]);
```

---

## Pattern 8: Manual Optimistic Rollback

**File**: `src/components/workshop/EstimateSheetContent.tsx` (~line 3802, `updateRowItem`)

```typescript
// Current manual pattern (conceptual):
const previousTree = snapshot();
const previousRows = { ...editableRows };
let rollbackRevision: number | undefined;

try {
  rollbackRevision = setTree(applyMutation);
  // optimistic update
} catch (error) {
  restore(previousTree, rollbackRevision);
  setEditableRows(previousRows);
}
```

**Problem**: 100+ lines of manual snapshot/rollback code. Fragile — if restore fails, state is corrupted.

**Fix** (React 19 `useOptimistic`):
```typescript
const [optimisticRows, addOptimisticRow] = useOptimistic(
  editableRows,
  (currentRows, mutation: RowMutation) => {
    // Reducer — React handles rollback automatically
    return applyOptimisticMutation(currentRows, mutation);
  }
);
```

**Impact**: Eliminates manual rollback code. React handles concurrent interruptability (rapid typing cancels stale mutations). Built-in error recovery.

---

## Summary: High-Impact Patterns by Line Number

| Line | Pattern | Fix | Sprint |
|------|---------|-----|--------|
| 3559 | `projectTotal` bare variable | `useMemo` | S0 |
| — | `EstimateRowItemsTable` no memo | `React.memo` | S0 |
| 3416 | `editableRows` keystroke state | `useDeferredValue` after focus/rollback tests | S2 |
| 1085 | `projects.select("*")` | Explicit columns | S1 |
| 1653 | `estimate_row_items.select("*")` (source_snapshot) | Omit source_snapshot | S1 |
| 24 | `getCurrentWorkspaceProject` blocks Promise.all | Parallelize | S1 |
| 32 | `getCurrentWorkspaceComponentLibrary` eager | Defer to client | S2 |
| 3465 | `currentProposalPreviewSignature` deps on `editableRows` | `deferredRows` after parity proof | S2 |
| 3513, 3844 | `queueMicrotask` double render candidates | evaluate `startTransition` or direct effect update | S2 |
| ~3802 | Manual optimistic rollback | `useOptimistic` | S2 |
| — | `EstimateSheetContent` 4,336 lines | Split into 4 components | S3 |
| — | No virtualization | `@tanstack/react-virtual` | S3 |
