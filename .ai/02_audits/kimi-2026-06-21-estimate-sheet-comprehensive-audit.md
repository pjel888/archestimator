---
title: Kimi Comprehensive Audit — Estimate Sheet Audit And Improvement Plan
date: 2026-06-21
source_plan: /Users/philiplewis/Documents/archestimator/.ai/03_plans/2026-06-21-Estimate-Sheet-Audit-And-Improvement
output_path: /Users/philiplewis/Documents/archestimator/.ai/02_audits/kimi-2026-06-21-estimate-sheet-comprehensive-audit.md
status: read-only-audit
method: multi-agent parallel source verification + orchestrator synthesis
---

# Kimi Comprehensive Audit — Estimate Sheet Audit And Improvement Plan

## 1. Executive Summary

This audit independently verifies every claim in the `2026-06-21-Estimate-Sheet-Audit-And-Improvement` plan pack by reading the actual source code, migrations, and tests. Four parallel agent lanes audited row mutations, tree/tab mutations, templates/library/project sources, and error/loading states. The orchestrator lane completed the database/RPC and test-coverage audits after agent timeouts, then synthesized all findings into this single document.

**Verdict:** the original plan is directionally accurate and in several places understated. The highest risks are real, reproducible, and deserve immediate attention before closed-beta launch.

### 1.1 Highest-priority confirmed defects

| # | Finding | Severity | Files | Why it blocks beta |
|---|---------|----------|-------|--------------------|
| 1 | Bulk row delete restores the whole pre-delete tree per row; partial failure can resurrect already-deleted rows or hide failed rows | P1 | `src/components/workshop/EstimateSheetContent.tsx:2532-2566`, `src/hooks/use-estimate-row-mutations.ts:208-225`, `use-estimate-query.ts:71-76` | Data-loss illusion; failed selection cannot be retried |
| 2 | Component move is two independent mutations (replace target, clear source) with no coordinated rollback | P1 | `src/components/workshop/EstimateSheetContent.tsx:2522-2530`, `:2347-2436` | Can duplicate or lose components on partial failure |
| 3 | Tree reorder/single-delete/bulk-delete on non-default tabs refresh with the **default** tab tree | P1 | `src/lib/estimates/actions.ts:1508`, `:2208`, `:2281`, `src/lib/repositories/workspace-repository.ts:2749-2769`, `src/components/workshop/EstimateSheetTree.tsx:611`, `:996`, `:1097` | Wrong-tab content, wrong fallback selection |
| 4 | Bulk tree-node delete loops one RPC per selected root; partial commit possible | P1 | `src/lib/estimates/actions.ts:2259-2279`, `src/components/workshop/EstimateSheetTree.tsx:1105-1118` | Database partially changed while UI rolls back |
| 5 | Template-node subtree insert is one RPC per copied node + one RPC per copied row | P1 | `src/lib/estimates/actions.ts:2454-2574` | Slow, partial-persistence risk for large sections |

### 1.2 Confirmed P2 defects

- Replace-row action returns no canonical row, leaving stale `rowRevision` (`actions.ts:2675-2708`, `use-estimate-row-mutations.ts:267-270`).
- Tab-tree query errors fall through to "This tab is empty" (`EstimateSheetContent.tsx:2819-2922`).
- Global scalar `saveState` marks saved while other mutations are still in flight (`use-estimate-row-mutations.ts:170-190`, `:208-225`).
- Project-source bulk inserts can clobber earlier inserts due to out-of-order full-tree snapshots (`EstimateSheetContent.tsx:2157-2189`, `component-library/index.tsx:1794-1807`).
- Template insert refresh trusts caller `targetTabId` instead of the committed parent-node tab (`actions.ts:2296-2307`, `:2337`, `:2381`, `:2574`).
- Route and library loaders have no payload ceilings (`page.tsx:32-39`, `workspace-repository.ts:2377-2407`, `:2574-2607`).
- Reusable project-source search can fan out across projects/estimates/tabs without caps (`reusable-sources/actions.ts:109-293`).

### 1.3 New issues discovered beyond the original plan

1. `clearRowComponent` for non-express rows uses `replaceRow`, not `updateRow`, inheriting the stale-revision bug.
2. Row delete and scalar update rollbacks restore the entire `editableRows` snapshot, clobbering concurrent edits to other rows.
3. `replaceMutation` invalidates with `refetchType: "none"`, extending the stale-revision window.
4. `moveRowComponent` source clear has no error toast.
5. `deleteSelectedRows` clears the selection before deletions settle, preventing retry of failed bulk deletes.
6. Sheet route lacks `src/app/workshop/projects/[projectId]/estimates/[nodeId]/loading.tsx`, so navigation shows the estimates-list skeleton instead of a sheet skeleton.
7. Library sidebar edit/duplicate/delete labels imply persisted CRUD but are local-only.
8. Library/template/project-source success messages are announced before server persistence.

---

## 2. Scope and Methodology

### 2.1 Source plan documents analyzed

All eight files in `.ai/03_plans/2026-06-21-Estimate-Sheet-Audit-And-Improvement/` were read in full:

1. `README.md`
2. `01-user-step-matrix.md`
3. `02-crud-and-edge-case-audit.md`
4. `03-performance-reliability-code-review.md`
5. `04-test-coverage-and-verification.md`
6. `05-improvement-backlog.md`
7. `06-second-pass-cascading-blast-radius.md`
8. `07-ponytail-command-notes.md`

### 2.2 Codebase inspected

- Route: `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`
- Loading/error boundaries: `src/app/workshop/projects/[projectId]/estimates/loading.tsx`, `[nodeId]/error.tsx`, `error.tsx`
- Main sheet: `src/components/workshop/EstimateSheetContent.tsx`
- Tree: `src/components/workshop/EstimateSheetTree.tsx`
- Workspace client: `src/components/workshop/EstimateWorkspaceClient.tsx`
- Row mutation hook: `src/hooks/use-estimate-row-mutations.ts`
- Query hook: `src/hooks/use-estimate-query.ts`
- Server actions: `src/lib/estimates/actions.ts`
- Reusable sources: `src/lib/reusable-sources/actions.ts`
- Repository: `src/lib/repositories/workspace-repository.ts`
- Reorder planner: `src/lib/estimates/estimate-tree-reorder.ts`
- Generic tree UI: `src/components/ui/tree.tsx`
- Sidebar: `src/components/workshop/component-library/index.tsx`
- Add component modal: `src/components/workshop/component-library-manager/AddComponentModal.tsx`
- New template modal: `src/components/workshop/component-library/NewTemplateModal.tsx`
- Drop zones: `src/components/workshop/estimate-sheet/rows/drop-zones.tsx`
- Cells: `src/components/workshop/estimate-sheet/rows/cells.tsx`
- Row table: `src/components/workshop/estimate-sheet/rows/row-table.tsx`
- Column ruler: `src/components/workshop/estimate-sheet/columns/EstimateColumnRuler.tsx`
- Metadata strip: `src/components/workshop/ProjectEstimateMetadataStrip.tsx`
- Migrations:
  - `supabase/migrations/20260518090000_archestimator_core_schema.sql`
  - `supabase/migrations/20260524033151_estimate_sheet_version_control.sql`
  - `supabase/migrations/20260524132800_estimate_node_activity_history.sql`
  - `supabase/migrations/20260612094734_estimate_tabs_foundation.sql`
  - `supabase/migrations/20260615093524_express_components_foundation.sql`
- All estimate-related Vitest files in `tests/vitest/`

### 2.3 Severity scale

- **P1** — Blocks beta-quality workflow; can cause visible data loss, wrong data, or unrecoverable state.
- **P2** — Should be fixed soon; reliability or correctness degradation that users will notice.
- **P3** — Lower-risk hardening, UX polish, or test coverage gaps.

---

## 3. P1 Findings — Data Correctness

### 3.1 Bulk row delete cascade/rollback risk

**Status:** CONFIRMED with nuance

**Evidence:**

```tsx
// src/components/workshop/EstimateSheetContent.tsx:2532-2561
const deleteRowItem = useStableCallback((rowItemId: string) => {
  const previousTree = estimateTree;
  const previousRows = editableRows;
  const rollbackRevision = setEstimateTree((current) =>
    current.map((node) => {
      function visit(areaNode: EstimateTreeNode): EstimateTreeNode {
        return {
          ...areaNode,
          estimateRowItems: areaNode.estimateRowItems?.filter((item) => item.id !== rowItemId),
          children: areaNode.children?.map(visit),
        };
      }
      return visit(node);
    }),
  );
  setEditableRows((current) => {
    const remainingRows = { ...current };
    delete remainingRows[rowItemId];
    return remainingRows;
  });
  if (projectId && estimateId) {
    deleteRow({
      projectId,
      estimateId,
      rowId: rowItemId,
      rollback: () => restoreEstimateState(previousTree, previousRows, rollbackRevision),
      onSuccess: () => refetchProjectComponentProjection(),
    });
  }
});

// src/components/workshop/EstimateSheetContent.tsx:2563-2566
function deleteSelectedRows() {
  bulkSelectedRowIds.forEach((rowItemId) => deleteRowItem(rowItemId));
  setBulkSelectedRowIds(new Set());
}
```

**Failure mode:**

- `deleteSelectedRows` fires one independent `deleteRowItem` call per selected row.
- Each call captures the **entire** `estimateTree` and `editableRows` snapshot and registers a whole-tree rollback.
- Snapshots are captured **after** prior optimistic deletions have already modified `estimateTree`, so they are not from a single pre-bulk state.
- The rollback is gated by `useEstimateQuery`'s global tree revision guard (`use-estimate-query.ts:71-76`):
  - If row A fails after row B has already succeeded and bumped the revision, A's rollback is skipped. A remains visually deleted even though the server delete failed.
  - If row A fails before B's optimistic update has bumped the revision, A's rollback restores the tree captured before B was removed, which can include B and make it reappear.

**Nuance:** the server RPC itself is exact-row scoped (see §9.1), so the database never deletes unrelated rows. The cascade risk is entirely client-side rollback granularity.

**New related issues:**
- `deleteSelectedRows` clears the selection immediately (`setBulkSelectedRowIds(new Set())`), so failed deletes cannot be retried as a group.
- The whole-tree/whole-editableRows rollback can clobber concurrent edits to unrelated rows (see §7.2).

**Recommended fix:**
- Implement a bulk row-delete mutation that takes all selected ids, applies one optimistic tree patch, and either uses a single bulk RPC or row-scoped reconciliation on partial failure.
- Keep selection until all deletes settle.

**Regression test:** render two selectable rows, select both, mock one `deleteEstimateRowItem` success and one failure, assert only the failed row is restored and selection remains.

---

### 3.2 Component move replace-then-clear partial failure

**Status:** CONFIRMED with nuance

**Evidence:**

```tsx
// src/components/workshop/EstimateSheetContent.tsx:2522-2530
const moveRowComponent = useStableCallback((sourceRowItemId: string, targetRowItemId: string, movedItem: EstimateRowItem) => {
  if (sourceRowItemId === targetRowItemId) return;
  if (isExpressComponentRow(movedItem)) {
    toast({ tone: "error", message: "Replace express components directly before moving them between rows." });
    return;
  }
  replaceRowItem(targetRowItemId, movedItem);
  clearRowComponent(sourceRowItemId);
});
```

`replaceRowItem` and `clearRowComponent` each capture their own whole-tree/whole-rows snapshot and rollback revision (lines 2347-2436). `clearRowComponent` for non-express rows calls `replaceRowItem(rowItemId, createBlankEstimateRowTemplate())`, which goes through the same `replaceRow` mutation path.

**Failure mode:**

- **Target replace succeeds, source clear fails:** target stays replaced. Source rollback restores the snapshot taken after the target was replaced, which still contains the original component, so the component appears in **both** rows (duplicate) until refetch.
- **Target replace fails, source clear succeeds:** target rollback may be skipped because the source clear has already bumped the tree revision, leaving the target replaced while the database still has the original target. Or, if the rollback runs, it restores the source to its pre-clear state, clobbering the successful clear.
- Source clear has no `onError` toast, so failures are silent.

**Recommended fix:**
- Model move as a single row-pair operation, or make the two rollbacks row-scoped and explicitly reconcile the other row after either failure.
- Add error feedback for the source clear path.

**Regression tests:** both orders of partial failure (target success/source fail, target fail/source success).

---

### 3.3 Non-default tab tree mutations return the default tab tree

**Status:** CONFIRMED

**Evidence:**

Server actions refresh via `getProjectEstimateTreeByEstimate`, which resolves the default tab:

```ts
// src/lib/estimates/actions.ts:1508
export async function reorderEstimateTreeNodes(...) {
  // ...
  const { project, estimate, tree: currentTree } = await getProjectEstimateTreeByEstimate(project.id, estimate.id);
  // ...
  await supabase.rpc("reorder_estimate_nodes_with_history", ...);
  // ...
  const { tree: refreshedTree } = await getProjectEstimateTreeByEstimate(project.id, estimate.id);
  return { tree: refreshedTree };
}

// src/lib/estimates/actions.ts:2208
export async function deleteEstimateNode(...) {
  // ...
  const { project, estimate, tree: currentTree } = await getProjectEstimateTreeByEstimate(project.id, estimate.id);
  // ...
  await supabase.rpc("delete_estimate_node_with_history", ...);
  // ...
  const { tree: refreshedTree } = await getProjectEstimateTreeByEstimate(project.id, estimate.id);
  return { tree: refreshedTree, fallbackNodeId };
}

// src/lib/estimates/actions.ts:2281
export async function deleteEstimateNodesBulk(...) {
  // ...
  const { project, estimate, tree: currentTree } = await getProjectEstimateTreeByEstimate(project.id, estimate.id);
  // ... loop deletions ...
  const { tree: refreshedTree } = await getProjectEstimateTreeByEstimate(project.id, estimate.id);
  return { tree: refreshedTree, fallbackNodeId, deletedNodeIds: [...deletedNodeIds] };
}
```

```ts
// src/lib/repositories/workspace-repository.ts:2749-2769
export async function getProjectEstimateTreeByEstimate(projectId: string, estimateId: string, options?: EstimateTreeLoadOptions) {
  const { project, estimate } = await getValidatedProjectEstimate(projectId, estimateId);
  const estimateTabId = await getDefaultEstimateTab(estimateId);
  const tree = estimateTabId
    ? await getEstimateTabTree(projectId, estimateId, estimateTabId, options)
    : await getProjectEstimateTreeByEstimateLegacy(projectId, estimateId, options);
  return { project, estimate, tree };
}
```

The client writes that default-tab tree into the active tab cache:

```tsx
// src/components/workshop/EstimateSheetTree.tsx:611
setLocalNodes(mergeEstimateTreeStructureWithCachedNodes({ structureNodes: confirmed.tree, ... }));

// src/components/workshop/EstimateSheetTree.tsx:996
setLocalNodes(confirmed.tree);

// src/components/workshop/EstimateSheetTree.tsx:1097
setLocalNodes(confirmed.tree);
```

**Failure mode:**

- On a non-default tab, reorder/delete persists correctly in the database (the RPC targets the correct node).
- The action returns the **default** tab tree.
- The client overwrites the active tab cache with the default tab content.
- The user sees the wrong tab until a hard refetch/remount.
- Delete fallback selection and route replacement are computed against the wrong tree, so the selected node may jump to a default-tab node.

**Additional nuance:** `deleteEstimateNodesBulk` also dedupes selected roots and plans the fallback from the default-tab tree. If the selected nodes exist only in the non-default tab, the default tree will not contain them, producing a wrong root set and fallback.

**Recommended fix:**
- Add optional `targetTabId` to `reorderEstimateTreeNodes`, `deleteEstimateNode`, and `deleteEstimateNodesBulk`.
- Infer affected `estimate_tab_id` from target nodes server-side when the client omits it.
- Refresh with `getEstimateTabTree(projectId, estimateId, tabId)` for tabbed estimates.
- Compute delete fallback against the same tab-scoped tree.

**Regression tests:** create a second tab, reorder/delete/bulk-delete nodes, assert active tab cache still contains only that tab's nodes and fallback stays within it.

---

### 3.4 Bulk tree-node delete partial commit

**Status:** CONFIRMED

**Evidence:**

```ts
// src/lib/estimates/actions.ts:2259-2279
let plannedTree = currentTree;
let fallbackNodeId: string | null = rootNodeIds[0] ?? null;
const deletedNodeIds = new Set<string>();
for (const rootNodeId of rootNodeIds) {
  const deletePlan = planEstimateTreeDelete(plannedTree, rootNodeId, fallbackNodeId);
  deletePlan.deletedNodeIds.forEach((deletedNodeId) => deletedNodeIds.add(deletedNodeId));
  plannedTree = deletePlan.nextNodes;
  fallbackNodeId = deletePlan.fallbackNodeId;
}

for (const rootNodeId of rootNodeIds) {
  const { error } = await supabase.rpc("delete_estimate_node_with_history", {
    target_project_id: project.id,
    target_estimate_id: estimate.id,
    target_node_id: rootNodeId,
    acting_user_id: currentUser.userId,
    correlation_id: randomUUID(),
  });
  if (error) throw new Error(`Could not delete selected estimate tree nodes: ${error.message}`);
}
```

Client rollback:

```tsx
// src/components/workshop/EstimateSheetTree.tsx:1105-1118
} catch (error) {
  restoreLocalNodes(previousNodes);
  // toast error
}
```

**Failure mode:**

- If root A's RPC succeeds and root B's RPC fails, root A is already deleted in the database when the action throws.
- The client rolls back to the pre-delete optimistic tree.
- The user sees a failed bulk delete, but a refetch will reveal root A is gone.

**Recommended fix:**
- Replace the loop with a single `delete_estimate_nodes_bulk_with_history` RPC that validates all roots, records history, deletes in one transaction, and returns deleted ids plus refreshed tab tree.
- Or wrap the loop in a Supabase transaction if the platform supports it.

**Regression test:** mock first root delete success and second root delete failure; assert no partial delete/event survives.

---

### 3.5 Template-node subtree insert is serial RPC-per-node and RPC-per-row

**Status:** CONFIRMED

**Evidence:**

```ts
// src/lib/estimates/actions.ts:2454-2467
const [nodesResult, rowsResult] = await Promise.all([
  supabase.from("estimate_template_nodes").select("id, parent_id, kind, name, sort_order").eq("template_id", templateId).order("sort_order", { ascending: true }),
  supabase.from("estimate_template_row_items").select("...").eq("template_id", templateId).order("sort_order", { ascending: true }),
]);

// src/lib/estimates/actions.ts:2501-2527
for (const node of subtreeNodes) {
  const { data: createResult, error: createError } = await supabase.rpc("create_estimate_node_with_history", {
    target_project_id: project.id,
    target_estimate_id: estimateId,
    parent_node_id: parentEstimateNodeId,
    node_kind: node.kind,
    node_name: node.name,
    initial_sort_order: node.id === sourceNode.id ? rootSortOrder : node.sort_order,
    acting_user_id: currentUser.userId,
    correlation_id: randomUUID(),
  });
  // ...
}

// src/lib/estimates/actions.ts:2530-2569
for (const row of subtreeRows) {
  const targetNodeId = createdNodeIdByTemplateNodeId.get(row.template_node_id);
  if (!targetNodeId) continue;
  const { error: rowInsertError } = await supabase.rpc("insert_estimate_row_item_with_history", {
    target_project_id: project.id,
    target_estimate_id: estimateId,
    target_node_id: targetNodeId,
    row_payload: { /* ... */ },
    acting_user_id: currentUser.userId,
    correlation_id: randomUUID(),
  });
  if (rowInsertError) throw new Error(`Could not copy the template rows: ${rowInsertError.message}`);
}
```

**Failure mode:**

- A reusable section with N nodes and M rows costs N + M sequential Supabase RPC round trips.
- Each RPC commits independently, so a mid-way failure leaves a partially copied subtree in the database.
- The client rolls back its optimistic tree, but the partial subtree reappears on refetch.
- The existing comment at `actions.ts:2410-2415` documents this as a known partial-persistence contract but does not surface it to the user.

**Recommended fix:**
- Add a single transaction-backed subtree-copy RPC (or a single server action wrapped in a Supabase transaction).
- Preserve history semantics inside Postgres.
- Return inserted root ids and refreshed tab tree.

**Regression tests:**
- Unit test payload mapping for bulk RPC.
- Performance test for 100-row subtree insert query count and latency budget.

---

## 4. P2 Findings — Reliability and Stale State

### 4.1 Replace row leaves stale `rowRevision`

**Status:** CONFIRMED

**Evidence:**

```ts
// src/lib/estimates/actions.ts:2675-2708
export async function replaceEstimateRowItemWithLibrary({ projectId, estimateId, rowId, libraryItem, mutationId, expectedRowRevision }: ReplaceEstimateRowItemInput) {
  // ...
  const { error } = await supabase.rpc("replace_estimate_row_item_with_history", {
    target_project_id: project.id,
    target_estimate_id: estimateId,
    target_row_id: row.id,
    expected_row_revision: expectedRowRevision ?? row.row_revision,
    replacement_payload: { /* ... */ },
    acting_user_id: currentUser.userId,
    correlation_id: getMutationCorrelationId(mutationId),
  });
  if (error) throw error;
  // <-- no return value
}
```

```tsx
// src/hooks/use-estimate-row-mutations.ts:267-270
const replaceMutation = useMutation({
  mutationFn: (input: ReplaceEstimateRowInput) => replaceEstimateRowItemWithLibrary(withoutClientCallbacks(input)),
  ...mutationOptions,
});
```

The generic `mutationOptions.onSuccess` does not patch the row cache because the action returns `void`. The optimistic replacement in `EstimateSheetContent.tsx` does not assign a fresh `rowRevision` either.

**Failure mode:**

- Server RPC increments `row_revision` in the database.
- Cached `rowRevision` remains the old value.
- The next edit/delete/detach/replace reads the stale revision via `getCachedRowRevision` (`use-estimate-row-mutations.ts:408-419`) and sends `expected_row_revision: <old>`.
- RPC throws `estimate_sheet_row_revision_conflict`.

**Recommended fix:**
- Have `replaceEstimateRowItemWithLibrary` return `readHistoryRowResult(data)` (like `updateEstimateRowItem` does).
- Patch the row cache in `replaceMutation.onSuccess` with canonical fields: `rowRevision`, `sourceSnapshot`, `unit`, `linkState`, metadata, etc.

**Regression test:** replace a row from the library, then immediately edit quantity/material or delete the row; assert no revision conflict and cache receives new `rowRevision`.

---

### 4.2 Tab tree fetch failure renders as empty tab

**Status:** CONFIRMED

**Evidence:**

```tsx
// src/hooks/use-estimate-query.ts:103-111
const query = useQuery({
  queryKey,
  queryFn: () => (projectId && estimateId && tabId ? fetchEstimateTabTree({ projectId, estimateId, tabId }) : Promise.resolve(initialNodes)),
  initialData: initialNodes,
  // ...
});
```

```tsx
// src/components/workshop/EstimateSheetContent.tsx:2567
const isActiveTabTreeLoading = Boolean(dataTabId && tabTreeQuery.isFetching && estimateTree.length === 0);

// src/components/workshop/EstimateSheetContent.tsx:2819-2922
{isActiveTabTreeLoading ? (
  <LoadingSkeleton />
) : selectedNode ? (
  <SheetRows />
) : (
  <EmptyTabState message="This tab is empty" />
)}
```

**Failure mode:**

- `tabTreeQuery.isError` is never checked in the render branch.
- When `fetchEstimateTabTree` rejects (network loss, auth expiry, provider error), `isFetching` becomes false, `estimateTree` may be empty, and the branch falls through to "This tab is empty".
- Mutations remain enabled while the underlying tree data is unhealthy.

**Recommended fix:**
- Render a retryable error state for `tabTreeQuery.isError` and `legacyTreeQuery.isError`.
- Disable mutation controls while the active tree query is in error.

**Regression test:** mock `fetchEstimateTabTree` rejection and assert the active sheet shows "Could not load this tab" with a retry button, not the empty-tab copy.

---

### 4.3 Row mutation failures roll back quietly

**Status:** CONFIRMED

**Evidence:**

```tsx
// src/hooks/use-estimate-row-mutations.ts:208-225
const mutationOptions = useMemo(
  () => ({
    onMutate: () => markSaving(),
    onSuccess: () => markSaved(),
    onError: (error: Error, input: RollbackInput) => {
      input.rollback?.();
      input.onError?.(error);
      markFailed();
    },
  }),
  // ...
);
```

Most call sites omit `onError`:

```tsx
// src/components/workshop/EstimateSheetContent.tsx:1870-1893 (scalar update)
updateRow({
  projectId, estimateId, rowId: rowItemId,
  rollback: () => restoreEstimateState(previousTree, previousRows, rollbackRevision),
  onSuccess: () => refetchProjectComponentProjection(),
  // no onError
});

// src/components/workshop/EstimateSheetContent.tsx:2552-2559 (single delete)
deleteRow({
  projectId, estimateId, rowId: rowItemId,
  rollback: () => restoreEstimateState(previousTree, previousRows, rollbackRevision),
  onSuccess: () => refetchProjectComponentProjection(),
  // no onError
});
```

Only `replaceRowItem` and `promoteRowToLibrary` pass `onError` toasts.

**Failure mode:**

- Failed update/delete/detach/clear/non-express insert rolls back and calls `markFailed()`, but the user sees the value snap back with no actionable message.
- `saveState` is not rendered visibly in the sheet chrome.

**Recommended fix:**
- Add a centralized row mutation error presenter (compact persistent error near the sheet header, plus retry/reload guidance).
- Wire `onError` toasts for update/delete/detach/clear/non-express insert.

---

### 4.4 Scalar save state is global, not mutation-counted

**Status:** CONFIRMED

**Evidence:**

```tsx
// src/hooks/use-estimate-row-mutations.ts:170-190
function useSaveState() {
  const [saveState, setSaveState] = useState<EstimateSaveState>("idle");
  function markRowDirty() { setSaveState("dirty"); }
  function markSaving() { setSaveState("saving"); }
  function markSaved() { setSaveState("saved"); }
  function markFailed() { setSaveState("failed"); }
  return { saveState, markRowDirty, markSaving, markSaved, markFailed };
}
```

```tsx
// src/hooks/use-estimate-row-mutations.ts:208-225
const mutationOptions = useMemo(
  () => ({
    onMutate: () => markSaving(),
    onSuccess: () => markSaved(),
    onError: () => markFailed(),
  }),
  // ...
);
```

**Failure mode:**

- One mutation success flips the state to `"saved"` while another mutation is still in flight.
- `deleteSelectedRows` loops deletes; the first successful delete marks `"saved"` even though other selected rows are still being deleted or may fail.
- The promote gate at `EstimateSheetContent.tsx:2451` checks `saveState === "dirty" || saveState === "saving"`. If a row mutation is in flight but `saveState` has already flipped to `"saved"` because of an earlier concurrent success, promote will be allowed when it should be blocked.

**Recommended fix:**
- Track active mutation count and last error by operation family.
- Mark saved only when active count reaches zero.
- Keep failed state sticky until a later successful save or explicit retry clears it.

---

### 4.5 Project-source inserts can apply stale full-tree snapshots

**Status:** CONFIRMED

**Evidence:**

```tsx
// src/components/workshop/EstimateSheetContent.tsx:2157-2189
const insertProjectSourceIntoParentById = useStableCallback((targetParentNodeId: string, source: ...) => {
  insertProjectSourceIntoEstimate({ ... })
    .then((result) => {
      // Concurrent BULK source inserts clobbering one another is tracked separately as RS-6
      setEstimateTree(() => result.tree);
    })
    .catch((error: unknown) => {
      console.error("[estimate] project source insert failed", error);
      toast({ tone: "error", message: "Couldn't insert the project source. Try again." });
    });
});
```

```tsx
// src/components/workshop/component-library/index.tsx:1794-1807
bulkProjectSourceTargets.forEach((source) => {
  if (addProjectSource(source)) insertedCount += 1;
});
```

**Failure mode:**

- Two project-source inserts A and B are in flight.
- B returns after A but before A has been applied (or promises resolve out of order).
- `setEstimateTree(() => result.tree)` replaces the whole tree with the latest returned snapshot.
- The subtree inserted by the earlier request can be overwritten and appear lost, even though it was persisted in the database.

**Recommended fix:**
- Serialize project-source inserts per estimate/tab, or add a batch server action that returns one coherent refreshed tree.
- Alternatively, add a request-generation counter and discard stale snapshots, or merge returned trees by inserted subtree ids.

**Regression test:** fire two project-source inserts, resolve the second before the first, assert both inserted subtrees remain or client refetches/merges.

---

### 4.6 Template insert refresh trusts caller `targetTabId`

**Status:** CONFIRMED

**Evidence:**

```ts
// src/lib/estimates/actions.ts:2296-2307
async function refreshInsertedEstimateTree(projectId: string, estimateId: string, targetTabId: string | undefined) {
  if (targetTabId) {
    const { project, estimate, tree } = await getEstimateTabTree(projectId, estimateId, targetTabId);
    return { project, estimate, tree };
  }
  const { project, estimate, tree } = await getProjectEstimateTreeByEstimate(projectId, estimateId);
  return { project, estimate, tree };
}
```

Used by whole-template insert (`:2337`), multi-template insert (`:2381`), and template-node insert (`:2574`). The RPC `insert_estimate_template_into_estimate_with_history` decides the committed tab from the target parent node's `estimate_tab_id` (`estimate_tabs_foundation.sql:1010-1014`), but the action refreshes using the caller-provided `targetTabId`.

**Failure mode:**

- If the caller's `dataTabId` differs from the parent node's actual tab (stale UI state, cross-tab drag not rejected, tab-switch race), the action commits to the parent-node's tab but returns and reconciles the caller's tab tree.
- The user sees the template "disappear" from the target tab or appear in the wrong tab until a hard refetch.

**Recommended fix:**
- Read the committed `estimateTabId` from the RPC result (`insert_result->>'estimateTabId'`) and refresh that tab.
- Assert caller `targetTabId` matches the committed tab when provided.

**Regression test:** pass a `targetTabId` that differs from the target parent node's tab; assert the action rejects or refreshes the committed parent-node tab.

---

### 4.7 Unbounded route and library payload ceilings

**Status:** CONFIRMED

**Evidence:**

```ts
// src/lib/repositories/workspace-repository.ts:2377-2407
const maxNodeCount = normalizeTreeLoadLimit(options.maxNodeCount);
const maxRowItemCount = normalizeTreeLoadLimit(options.maxRowItemCount);
const nodesQuery = supabase.from("estimate_nodes").select(ESTIMATE_TREE_NODE_COLUMNS).eq("estimate_id", estimate.id).order("sort_order", { ascending: true });
const rowsQuery = supabase.from("estimate_row_items").select(ESTIMATE_TREE_ROW_ITEM_COLUMNS).eq("estimate_id", estimate.id).order("sort_order", { ascending: true });

const [nodesResult, rowsResult] = await Promise.all([
  maxNodeCount ? nodesQuery.limit(maxNodeCount + 1) : nodesQuery,
  maxRowItemCount ? rowsQuery.limit(maxRowItemCount + 1) : rowsQuery,
]);
```

The route does not pass limits (`page.tsx:32-39`), and the lazy library loader fetches all components/templates on open (`EstimateSheetContent.tsx:1202-1223`).

**Failure mode:**

- Very large estimates or libraries can send huge payloads into server render, hydration, and sidebar cold open.
- No visible truncation state.

**Recommended fix:**
- Introduce route budgets and a visible truncation state.
- Move row-heavy areas to section-on-demand loading.
- Page/filter library components and templates server-side.

---

### 4.8 Reusable project-source search can fan out across projects and tab trees

**Status:** CONFIRMED

**Evidence:**

```ts
// src/lib/reusable-sources/actions.ts:118-120
const estimatesByProject = await Promise.all(
  accessibleProjects.map((item) => listProjectEstimateSheets(item.project.id)),
);

// src/lib/reusable-sources/actions.ts:239-246
for (const estimateId of estimatesToMaterialize) {
  const tabs = await getSortedTabsForEstimate(project.id, estimate.id);
  const tabTrees = await Promise.all(
    tabs.map((tab) => getEstimateTabTree(project.id, estimate.id, tab.id, { allowLegacyFallback: true })),
  );
}
```

No cap on projects scanned, estimates materialized, tabs loaded, or nodes/rows per tab tree.

**Failure mode:**

- In a large workspace, a short reusable-source search query can load every estimate and every tab tree for every matching estimate.
- Can exceed function duration/memory limits.

**Recommended fix:**
- Cap search results and materialization count.
- Return lightweight node hits directly from SQL.
- Load full outlines only on explicit expand.
- Add telemetry/cost counters.

---

## 5. P3 Findings — UX Polish and Hardening

| # | Finding | Evidence | Recommendation |
|---|---------|----------|----------------|
| 5.1 | Empty drop zone `empty` prop ignored | `src/components/workshop/estimate-sheet/rows/drop-zones.tsx:70-98` does `void empty;` | Use "Add first row to {area}" for empty areas |
| 5.2 | Express row creating state hidden | `src/components/workshop/estimate-sheet/rows/cells.tsx:253-257` shows creating state as `sr-only` | Add visible "Creating…" or shimmer |
| 5.3 | Estimate-name errors weak | `src/components/workshop/ProjectEstimateMetadataStrip.tsx:226-237` puts error text in `sr-only` | Add visible inline/focusable error text |
| 5.4 | Hardcoded blue active states | `src/components/workshop/estimate-sheet/rows/row-table.tsx:269`, `cells.tsx:513` | Use sheet tokens like `accentSoft` and `ring-accent` |
| 5.5 | Draggable sidebar affordance unclear | `src/components/workshop/component-library/tree/LibraryTree.tsx:428`, `TemplatesTree.tsx:1224` | Show grip or tooltip on hover/focus |
| 5.6 | Column reset uses literal `R` | `src/components/workshop/estimate-sheet/columns/EstimateColumnRuler.tsx:88-96` | Use reset icon with existing aria-label |
| 5.7 | Library/template insert feedback is screen-reader-only | `component-library/index.tsx:1375`, `:2401` | Add compact visible status line in right dock |
| 5.8 | Revision conflicts are generic | `src/lib/estimates/actions.ts:2660`, `:2680`, `:2741` throw raw RPC errors | Map `estimate_sheet_row_revision_conflict` to typed client copy and refetch/retry path |

---

## 6. New Issues Discovered Beyond the Original Plan

These issues were not listed in the source plan but are observable from the current source.

### 6.1 `clearRowComponent` for non-express rows uses `replaceRow`, not `updateRow`

**File:** `src/components/workshop/EstimateSheetContent.tsx:2387-2436`

For non-express rows, `clearRowComponent` calls `replaceRowItem(rowItemId, createBlankEstimateRowTemplate())`, which goes through the `replaceRow` mutation. This means:

- Non-express clears inherit the stale `rowRevision` bug from `replaceRow`.
- The server action returns no canonical row, so the cleared row's `rowRevision` in the cache is stale.
- The next edit/delete on the cleared row is more likely to hit a revision conflict.

**Severity:** P2

**Recommended fix:** route non-express clears through a dedicated clear mutation that returns the canonical row, or patch the cache after the replace-style clear.

---

### 6.2 Row delete and scalar update rollbacks restore the entire `editableRows` snapshot

**Files:** `src/components/workshop/EstimateSheetContent.tsx:1837-1894`, `:2532-2561`, `src/hooks/use-estimate-row-mutations.ts:395-405`

`commitRowItemUpdate` and `deleteRowItem` capture `previousRows = editableRows` (all rows) and restore it on failure. If the user edits row B while row A's delete/update is in flight, a failure of row A's operation will restore the old `editableRows` map and revert row B's edit. The per-row update queue prevents this only for same-row scalar edits, not for cross-row delete/update races.

**Severity:** P2

**Recommended fix:** make rollbacks row-scoped so a failed operation only restores the row it touched.

---

### 6.3 `replaceMutation` invalidates with `refetchType: "none"`, extending stale-revision window

**File:** `src/hooks/use-estimate-row-mutations.ts:208-225`

`onSuccess` calls `queryClient.invalidateQueries({ ..., refetchType: "none" })`. This marks the tab/area tree query stale but does not trigger a refetch. Because the replace action returns no row, the cached `rowRevision` stays old until the query is re-executed from another interaction, making the conflict window longer than necessary.

**Severity:** P2

**Recommended fix:** patch the row cache with the canonical row on replace success, and/or trigger an active refetch.

---

### 6.4 Move source clear has no user-visible error message

**File:** `src/components/workshop/EstimateSheetContent.tsx:2522-2530`

`moveRowComponent` calls `clearRowComponent`, which uses `updateRow` (express) or `replaceRow` (non-express). Neither path passes an `onError` toast. If the source clear fails while the target replace succeeds, the component is duplicated and the user receives no explanation.

**Severity:** P2

**Recommended fix:** add an error toast or centralized error presenter for the move operation.

---

### 6.5 `deleteSelectedRows` clears selection before deletions settle

**File:** `src/components/workshop/EstimateSheetContent.tsx:2563-2566`

The selection is cleared immediately after scheduling the deletes. If some deletes fail, the rows are no longer selected, so the user cannot retry the failed deletes with one action.

**Severity:** P2

**Recommended fix:** clear selection only after all deletes succeed; on failure, keep failed rows selected.

---

### 6.6 Sheet route lacks a dedicated `[nodeId]/loading.tsx`

**Files:** `src/app/workshop/projects/[projectId]/estimates/loading.tsx`, `[nodeId]/error.tsx`

There is no `src/app/workshop/projects/[projectId]/estimates/[nodeId]/loading.tsx`. Next.js falls back to the parent `estimates/loading.tsx`, which renders `ProjectEstimatesListSkeleton` — a list/table placeholder, not an estimate workspace placeholder.

**Severity:** P2/P3

**Recommended fix:** create a sheet-shaped skeleton in `[nodeId]/loading.tsx`.

---

### 6.7 Library sidebar local-only CRUD labels imply persistence

**File:** `src/components/workshop/component-library/index.tsx:1502-1509`, `:1686-1719`, `:1721-1738`, `:2409-2414`

Duplicate, edit, and delete actions in the sidebar mutate the local `libraryItems` array only. The delete modal copy is honest, but the trigger labels say "Edit component", "Duplicate", and "Delete", which strongly imply persisted library CRUD.

**Severity:** P3

**Recommended fix:** relabel actions to "Edit in local view", "Duplicate in local view", "Remove from local view", or wire them to persisted library CRUD actions.

---

### 6.8 Library/template/project-source success messages lie

**File:** `src/components/workshop/component-library/index.tsx:1482-1498`, `:1442-1500`

`addProjectSource`, `addTemplate`, and `addTemplateNode` announce "added" immediately after dispatching the window event, long before the server action resolves. If the server action fails, the success message has already been announced.

**Severity:** P3 (accessibility/reliability)

**Recommended fix:** make the callbacks return a Promise and gate success messages on resolution.

---

## 7. What Is Working Well

The audit also confirmed significant strengths that should be preserved during fixes.

### 7.1 Route and tab bootstrap

- Route resolves context and auth in parallel (`page.tsx:35-40`).
- Component library data is intentionally excluded from initial server render (`page.tsx:32-39`, `EstimateSheetContent.tsx:1202`).
- Server-provided tabs and tree are used as `initialData` with `refetchOnMount: false` and 5-minute staleTime (`use-estimate-query.ts:85-170`, `EstimateWorkspaceClient.tsx:88-109`).

### 7.2 Row edit queue and stale-response protection

- Rapid scalar edits on the same row are serialized through `rowUpdateQueuesRef` (`use-estimate-row-mutations.ts:429-439`).
- Each update gets a monotonically increasing `operationId` per row; older responses are ignored (`use-estimate-row-mutations.ts:350-386`).
- Existing tests confirm stale responses do not overwrite newer edits (`estimate-sheet-library-insert.test.tsx:942-1000`).

### 7.3 Optimistic tree node CRUD

- Create node: optimistic insert, id remapping, pending-create chaining, rollback on failure (`EstimateSheetTree.tsx:701-785`).
- Rename node: optimistic rename, waits for pending create, rollback on failure (`EstimateSheetTree.tsx:880-948`).
- Reorder: optimistic reorder, stale-completion guard, rollback on error (`EstimateSheetTree.tsx:570-645`).

### 7.4 Auto-appearance of newly created items

- Newly created library components appear immediately in the current sidebar (`component-library/index.tsx:1609-1615`, `AddComponentModal.tsx:1486-1497`).
- Newly created templates appear immediately in the Templates tab (`component-library/index.tsx:1617-1627`, `NewTemplateModal.tsx:112-157`).

### 7.5 Proposal export and activity history

- Proposal export has strong route coverage, rate limiting, JSON error bodies, XLSX content checks, and workbook tests.
- Activity/history reads are bounded, cursor-based, filtered, and have stale-response guards.

### 7.6 Server-side row delete guard

The row delete RPC validates the exact row by `row.id` + `estimate_id`, checks `row_revision`, then deletes that exact row. There is no source evidence that deleting one row can delete an unrelated row (see §9.1).

---

## 8. Database / RPC Verification

### 8.1 Row delete RPC is exact-row scoped

**Migration:** `supabase/migrations/20260524033151_estimate_sheet_version_control.sql:712-809`

```sql
select * into old_row
from public.estimate_row_items row_item
where row_item.id = target_row_id
  and row_item.estimate_id = target_estimate_id
for update;

-- ... revision check ...

delete from public.estimate_row_items row_item
where row_item.id = target_row_id
  and row_item.estimate_id = target_estimate_id;
```

**Verdict:** CONFIRMED. The database path validates by exact `row.id` and `estimate_id`, checks `row_revision`, then deletes that exact row. No sibling-index or unrelated-row delete is possible in this RPC.

### 8.2 Row revision conflict signal is structured

**Migration:** `supabase/migrations/20260524033151_estimate_sheet_version_control.sql:451-459`, `:599-606`, `:752-760`

```sql
raise exception 'estimate_sheet_row_revision_conflict'
  using errcode = 'P0001',
        detail = jsonb_build_object(
          'rowId', target_row_id,
          'expectedRowRevision', expected_row_revision,
          'currentRowRevision', old_row.row_revision
        )::text;
```

**Verdict:** CONFIRMED. The server emits a typed, structured conflict error, but the client treats it as a generic provider error.

### 8.3 Replace RPC returns canonical row but action discards it

**Migration:** `supabase/migrations/20260524033151_estimate_sheet_version_control.sql:553-710`

The `replace_estimate_row_item_with_history` function returns:

```sql
return jsonb_build_object(
  'idempotent', false,
  'eventId', inserted_event_id,
  'rowId', replaced_row.id,
  'row', new_snapshot,
  'changedFields', changed_fields
);
```

**Verdict:** the RPC provides the canonical row, but `replaceEstimateRowItemWithLibrary` in `src/lib/estimates/actions.ts:2675-2708` destructures only `{ error }` and discards `data`.

### 8.4 Node delete RPC cascades children and rows via FK

**Migration:** `supabase/migrations/20260524033151_estimate_sheet_version_control.sql:1180-1311`

The RPC recursively collects child node ids, records a single history event, then deletes the target node. The schema defines:

```sql
-- supabase/migrations/20260518090000_archestimator_core_schema.sql:82-101
parent_id uuid references public.estimate_nodes(id) on delete cascade,
node_id uuid not null references public.estimate_nodes(id) on delete cascade,
```

**Verdict:** CONFIRMED. Cascading deletion of children and rows is enforced at the database level. This is correct for single-node delete, but the bulk-delete action calls this RPC once per root without a transaction wrapper, creating the partial-commit risk.

### 8.5 Template insert RPC resolves committed tab from parent node

**Migration:** `supabase/migrations/20260612094734_estimate_tabs_foundation.sql:981-1055`

```sql
select node.estimate_tab_id
  into target_parent_tab_id
from public.estimate_nodes node
where node.id = target_parent_node_id
  and node.estimate_id = target_estimate_id;
```

The function returns `estimateTabId` in the result. The server action should read this value and refresh that tab, but it currently trusts the caller-provided `targetTabId`.

### 8.6 No bulk delete or bulk subtree-copy RPC exists

**Verdict:** CONFIRMED. The codebase lacks:
- `delete_estimate_nodes_bulk_with_history`
- `copy_estimate_template_node_subtree_with_history`

Both would be needed for atomic bulk tree delete and atomic template-node subtree copy.

---

## 9. Test Coverage Map

### 9.1 Strong existing coverage

| Area | Test files | What is proven |
|------|------------|----------------|
| Scalar row edit / stale-response guard | `estimate-sheet-library-insert.test.tsx`, `estimate-sheet-cost-inputs.test.tsx` | Committed edits stay visible; older responses do not overwrite newer edits |
| Failed scalar save rollback | `estimate-sheet-library-insert.test.tsx` | Failed update rolls back and does not render save pills |
| Express insert failure + retry | `estimate-sheet-library-insert.test.tsx` | Failed express drafts remain visible with retry/delete recovery |
| Row detach / project-specific | `estimate-sheet-library-insert.test.tsx` | Detach server call is made and UI updates |
| Promote to library | `estimate-sheet-library-insert.test.tsx` | Promote action is called with mutation id |
| Component move/replace happy path | `estimate-component-drag.test.tsx`, `estimate-sheet-cost-inputs.test.tsx` | Dragging a component replaces target and clears source |
| Delete row happy path | `estimate-sheet-row-details-crud.test.tsx` | Delete action is called and row is removed from DOM |
| Tree reorder/create/rename/delete | `estimate-sheet-tree-dnd.test.tsx`, `estimate-tree-bulk-selection.test.tsx`, `estimate-node-reorder-action.test.ts`, `e2e/estimate-tree-dnd.spec.ts` | Default-path coverage |
| Tab lifecycle | `estimate-tab-strip.test.tsx`, `e2e/estimate-tabs.spec.ts` | Strong UI behavior coverage |
| Activity/history | `estimate-sheet-version-control-ui.test.tsx`, `estimate-sheet-version-control-actions.test.ts`, `estimate-sheet-activity-history-ui.test.tsx` | Bounded cursor/filter/stale-response coverage |
| Proposal export | `proposal-export-route.test.ts`, `proposal-export-route-workbook.test.ts`, `proposal-export-preview.test.tsx`, `proposal-workbook.test.ts` | Very strong route/model/workbook coverage |
| Lazy library load | `estimate-sheet-library-lazy-load.test.tsx` | Confirms library is not in initial SSR |
| Route error boundaries | `workshop-route-error-boundaries.test.tsx` | Both `error.tsx` wrappers render sanitized UI |

### 9.2 Critical missing regression tests

| Gap | Priority | Why it matters |
|-----|----------|----------------|
| Non-default tab structural CRUD | P1 | Reorder/delete/bulk-delete on tab 2 must not show default tab tree |
| Bulk row delete partial failure | P1 | One delete succeeds, one fails; only failed row should be restored |
| Component move partial failure (both orders) | P1 | Target success/source fail and target fail/source success |
| Bulk tree-node delete partial failure | P1 | First root succeeds, second fails; no partial commit |
| Replace-row revision | P2 | Replace then immediate edit/delete should not conflict |
| Project-source stale response / out-of-order | P2 | Two bulk inserts, resolve second first |
| Tab-tree fetch error | P2 | Assert retryable error, not empty tab |
| Concurrent row mutations save state | P2 | `saveState` should remain saving until all settle |
| Row mutation error visibility | P2 | Update/delete/clear/detach failures should show user-facing message |
| Revision conflict typed handling | P3 | Map `estimate_sheet_row_revision_conflict` to stale-data message + refetch |
| Empty drop zone `empty` prop | P3 | Assert first-row copy for empty areas |
| Express creating state | P3 | Assert visible creating indicator |
| Estimate-name error visibility | P3 | Assert visible inline error text |
| `[nodeId]/loading.tsx` | P3 | Assert sheet-shaped skeleton |

### 9.3 Skipped / TODO tests found

- `tests/vitest/estimate-sheet-version-control-db.test.ts` uses `describe.skipIf(!runLiveDb)` and `describe.skipIf(runLiveDb)` — acceptable conditional skipping.
- `tests/vitest/estimate-unification-oracle.test.ts` contains several `it.todo` entries for export model parity (pre-existing roadmap items).

---

## 10. Improvement Backlog

This backlog prioritizes data correctness and user trust before polish. It incorporates and extends the original plan's Phase 0-5 backlog.

### Phase 0 — Lock cascading and partial-commit risks

#### 0.1 Bulk row delete

**Files:** `src/components/workshop/EstimateSheetContent.tsx`, `src/hooks/use-estimate-row-mutations.ts`, tests

**Acceptance criteria:**
- Deleting selected rows cannot restore a row whose server delete succeeded.
- A failed selected-row delete visibly restores only that failed row.
- Failed row delete shows a user-visible error.
- Selection is kept until all deletes settle.
- Existing single-row delete behavior remains unchanged.

**Suggested shape:**
- Add a bulk row-delete mutation or make per-row delete rollback row-scoped.
- Start with a regression test that reproduces one success + one failure.

#### 0.2 Component move

**Files:** `src/components/workshop/EstimateSheetContent.tsx`, `src/hooks/use-estimate-row-mutations.ts`, `estimate-component-drag.test.tsx`

**Acceptance criteria:**
- If target replace succeeds and source clear fails, target stays replaced and source is reconciled intentionally.
- If target replace fails and source clear succeeds, target is restored and source stays cleared.
- The UI cannot leave a component duplicated or lost without a visible recovery path.

**Suggested shape:**
- Model move as one row-pair operation, or make the two local rollbacks row-scoped.

#### 0.3 Bulk tree-node delete

**Files:** `src/lib/estimates/actions.ts`, Supabase migration/RPC, generated types, tests

**Acceptance criteria:**
- Bulk tree delete validates all selected roots before deleting.
- A mid-bulk failure cannot leave earlier selected roots deleted.
- The action returns deleted ids, fallback id, and refreshed active-tab tree.
- Existing parent/child dedupe behavior remains.

**Suggested shape:**
- Add `delete_estimate_nodes_bulk_with_history` RPC.

### Phase 1 — Stop wrong-tree and stale-revision bugs

#### 1.1 Tree reorder/delete tab-scoped

**Files:** `src/components/workshop/EstimateSheetTree.tsx`, `src/lib/estimates/actions.ts`, `src/lib/repositories/workspace-repository.ts`, tests

**Acceptance criteria:**
- Reorder on non-default tab refreshes that tab tree.
- Single delete on non-default tab refreshes that tab tree and computes fallback inside it.
- Bulk delete on non-default tab refreshes that tab tree and computes fallback inside it.
- Cross-tab reparenting stays rejected.
- Existing default-tab and legacy no-tab behavior remains unchanged.
- Template insert refresh uses the committed tab id, not caller `targetTabId`.

**Suggested shape:**
- Add optional `targetTabId` to reorder/delete/bulk-delete inputs.
- Infer target tab server-side from nodes if client omits it.
- Use `getEstimateTabTree` when target tab exists.

#### 1.2 Return canonical row from replace-row action

**Files:** `src/lib/estimates/actions.ts`, `src/hooks/use-estimate-row-mutations.ts`, `src/components/workshop/EstimateSheetContent.tsx`, tests

**Acceptance criteria:**
- Replace-row server action returns canonical row from RPC.
- Replace mutation patches query cache with returned row.
- Immediate edit/delete/detach after replace does not revision-conflict.
- Server-normalized metadata/source snapshot/link state/unit/rowRevision are visible after replacement.

### Phase 2 — Make failure states trustworthy

#### 2.1 Retryable tree query error state

**Files:** `src/components/workshop/EstimateSheetContent.tsx`, `src/hooks/use-estimate-query.ts`, tests

**Acceptance criteria:**
- `tabTreeQuery.isError` renders explicit "Could not load this tab" state.
- Legacy tree query error renders explicit "Could not load estimate rows" state.
- Retry button calls the relevant `refetch`.
- Empty tab copy appears only for successful empty data.
- Mutation controls disabled while active tree query is unhealthy.

#### 2.2 Row mutation error presenter and counted save state

**Files:** `src/hooks/use-estimate-row-mutations.ts`, `src/components/workshop/EstimateSheetContent.tsx`, tests

**Acceptance criteria:**
- Concurrent mutations keep state `saving` until all settle.
- Any update/delete/detach/clear/insert failure is visible.
- Failed state remains until a later successful save or explicit retry clears it.
- Rollback behavior remains intact.

#### 2.3 Type row revision conflicts

**Files:** `src/lib/estimates/actions.ts`, row mutation hook/client error presenter, tests

**Acceptance criteria:**
- `estimate_sheet_row_revision_conflict` maps to typed stale-data error.
- Client refetches active tree and tells user the row changed elsewhere.
- Generic provider details are not exposed raw to the user.

### Phase 3 — Fix project-source concurrency

#### 3.1 Serialize or merge project-source inserts

**Files:** `src/components/workshop/EstimateSheetContent.tsx`, `src/components/workshop/component-library/index.tsx`, tests

**Acceptance criteria:**
- Bulk project-source add cannot drop earlier inserted sources due to response order.
- User feedback waits for server success or distinguishes "adding" from "added".
- Failure shows a visible message and leaves current tree intact.

**Suggested shape:**
- Queue project-source inserts per estimate/tab, or create a batch server action mirroring multi-template insert.

### Phase 4 — Reduce large-data ceilings

#### 4.1 Cheap drag-over validation

**Files:** `src/components/workshop/EstimateSheetTree.tsx`, `src/components/ui/tree.tsx`, `src/lib/estimates/estimate-tree-reorder.ts`, tests

**Acceptance criteria:**
- Drag-over does not clone/rebuild tree.
- Drop still builds full reorder plan and preserves current validations.
- Benchmark shows acceptable handler time for large trees.

**Suggested shape:**
- Split cheap hover validation from full drop planning.
- Precompute per-drag node index, ancestor sets, parent ids, sibling counts, and tree revision.
- Build full reorder plan only on drop.

#### 4.2 Bulk copy template-node subtrees

**Files:** `src/lib/estimates/actions.ts`, Supabase migration/RPC, generated types, tests

**Acceptance criteria:**
- One server action copies a subtree with one bulk RPC or one transaction-contained set of RPC work.
- History events are preserved.
- Large subtree insert latency is bounded and tested.

#### 4.3 Add route/library budgets

**Files:** `src/lib/repositories/workspace-repository.ts`, route page/content empty/truncation UI, component library repository/sidebar

**Acceptance criteria:**
- Estimate route can cap node/row load and display truncation state.
- Sidebar can page/search library components/templates server-side.
- Export/proposal paths retain full-data behavior under their own explicit caps.

#### 4.4 Cap reusable-source search fan-out

**Files:** `src/lib/reusable-sources/actions.ts`, `src/components/workshop/component-library/index.tsx`

**Acceptance criteria:**
- Cap projects/estimates/tabs/nodes/rows scanned per query.
- Return lightweight node hits directly from SQL.
- Load full outlines only on explicit expand.

### Phase 5 — UX polish

#### 5.1 Make insert and refresh feedback visible

**Files:** `src/components/workshop/component-library/index.tsx`, `src/components/workshop/estimate-sheet/rows/*`

**Acceptance criteria:**
- Library/template/project-source inserts show compact visible status.
- Sidebar source refresh shows "refreshing", "updated", and retry on failure.
- Screen-reader live region remains.

#### 5.2 Strengthen drag/drop affordances

**Files:** `src/components/workshop/estimate-sheet/rows/drop-zones.tsx`, `src/components/workshop/estimate-sheet/rows/branch.tsx`, `src/components/workshop/component-library/tree/LibraryTree.tsx`, `src/components/workshop/component-library/tree/TemplatesTree.tsx`

**Acceptance criteria:**
- Valid drop targets are obvious during drag.
- Empty drop zone uses first-row copy.
- Sidebar draggable rows expose grip or "Drag to sheet" tooltip on hover/focus.

#### 5.3 Align small UI details

**Files:** `src/components/workshop/ProjectEstimateMetadataStrip.tsx`, `src/components/workshop/estimate-sheet/rows/row-table.tsx`, `src/components/workshop/estimate-sheet/rows/cells.tsx`, `src/components/workshop/estimate-sheet/columns/EstimateColumnRuler.tsx`

**Acceptance criteria:**
- Estimate-name errors are visible and keyboard/touch accessible.
- Hardcoded blue states use sheet tokens.
- Column reset uses an icon, not literal `R`.

#### 5.4 Add `[nodeId]/loading.tsx`

**File:** `src/app/workshop/projects/[projectId]/estimates/[nodeId]/loading.tsx`

**Acceptance criteria:**
- Sheet route shows a sheet-shaped skeleton instead of the estimates-list skeleton.

---

## 11. Targeted Verification Commands

Use these focused commands instead of broad `bun run validate` while the known full validation suite is red/hanging-prone.

### Tree mutations

```bash
bunx vitest run tests/vitest/estimate-node-reorder-action.test.ts tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-tree-bulk-selection.test.tsx --maxWorkers=1
```

### Row mutations

```bash
bunx vitest run tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx --maxWorkers=1
```

### Project sources

```bash
bunx vitest run tests/vitest/project-source-insert-action.test.ts tests/vitest/reusable-source-drag.test.ts tests/vitest/template-browse-project-sources.test.tsx --maxWorkers=1
```

### Tabs and workspace cache

```bash
bunx vitest run tests/vitest/estimate-tab-strip.test.tsx tests/vitest/estimate-workspace-client-cache.test.tsx --maxWorkers=1
```

### Proposal export

```bash
bunx vitest run tests/vitest/proposal-export-route.test.ts tests/vitest/proposal-export-route-workbook.test.ts tests/vitest/proposal-export-preview.test.tsx --maxWorkers=1
```

### Before and after fixes

- Run the narrow target command for the touched behavior first.
- After fixes, run `git diff --check` and the matching targeted Vitest command.
- Reserve broad `bun run validate` for shared logic or release gating.

---

## 12. Source-of-Truth Index

### 12.1 Application code

| File | Relevant lines | Topic |
|------|----------------|-------|
| `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx` | 28-70 | Route context, auth, lazy library exclusion |
| `src/app/workshop/projects/[projectId]/estimates/loading.tsx` | 1-5 | Parent list skeleton (used because `[nodeId]/loading.tsx` is missing) |
| `src/app/workshop/projects/[projectId]/estimates/error.tsx` | 1-13 | Route error boundary |
| `src/app/workshop/projects/[projectId]/estimates/[nodeId]/error.tsx` | 1-13 | Sheet segment error boundary |
| `src/components/workshop/EstimateSheetContent.tsx` | 1094, 1202-1223, 1503, 1609, 1644, 1837-1894, 1995, 2029-2041, 2053-2193, 2157-2189, 2208-2248, 2279, 2347-2436, 2417-2435, 2444, 2451, 2502, 2512-2518, 2522-2566, 2607, 2819-2922, 2955-2981 | Row mutations, inserts, render branches, library lazy load, proposal/activity |
| `src/components/workshop/EstimateSheetTree.tsx` | 534, 547, 556-564, 570-645, 701-785, 880-948, 952, 996, 1042, 1097, 1105-1118, 1142, 1178, 1200 | Tree CRUD, reorder, delete, drag-over, selection |
| `src/components/workshop/EstimateWorkspaceClient.tsx` | 26, 88-109 | Tab bootstrap, workspace state |
| `src/components/workshop/ProjectEstimateMetadataStrip.tsx` | 129-131, 226-237 | Estimate name errors |
| `src/components/workshop/component-library/index.tsx` | 1-200, 869, 1140-1169, 1204-1249, 1400-1510, 1546-1842, 2260-2532 | Sidebar library/templates/sources |
| `src/components/workshop/component-library/NewTemplateModal.tsx` | 112-157 | Template creation |
| `src/components/workshop/component-library-manager/AddComponentModal.tsx` | 1486-1497 | Component creation |
| `src/components/workshop/estimate-sheet/rows/drop-zones.tsx` | 16, 40-98 | Drop zones, empty prop |
| `src/components/workshop/estimate-sheet/rows/cells.tsx` | 90, 253-288, 508, 513 | Express creating state, hardcoded blue |
| `src/components/workshop/estimate-sheet/rows/row-table.tsx` | 267, 269 | Hardcoded blue active state |
| `src/components/workshop/estimate-sheet/columns/EstimateColumnRuler.tsx` | 88-96 | Literal `R` reset button |
| `src/components/ui/tree.tsx` | 724-732, 842-877 | Drag-over canDrop |
| `src/hooks/use-estimate-row-mutations.ts` | 170-190, 202-225, 267-270, 350-406, 408-419, 429-439 | Save state, mutation options, replace, update queue, revision |
| `src/hooks/use-estimate-query.ts` | 71-76, 85-170, 103-111 | Tree revision guard, tab/legacy tree queries |
| `src/lib/estimates/actions.ts` | 1419-1511, 1508, 2067-2160, 2162-2185, 2187-2289, 2208, 2253-2279, 2281, 2296-2307, 2309-2578, 2337, 2381, 2410-2415, 2454-2574, 2574, 2675-2708, 2738-2749 | All estimate server actions |
| `src/lib/estimates/estimate-tree-reorder.ts` | 293-346 | Reorder planner |
| `src/lib/repositories/workspace-repository.ts` | 2377-2407, 2574-2607, 2749-2815 | Tree loaders, route context |
| `src/lib/reusable-sources/actions.ts` | 109-293, 338-429 | Project source search/insert |

### 12.2 Database migrations

| File | Relevant lines | Topic |
|------|----------------|-------|
| `supabase/migrations/20260518090000_archestimator_core_schema.sql` | 82-143, 201-270 | Node/row tables, FK cascades, RLS |
| `supabase/migrations/20260524033151_estimate_sheet_version_control.sql` | 430-550, 553-710, 712-809, 1180-1311 | Update/replace/delete row RPCs, node delete RPC |
| `supabase/migrations/20260524132800_estimate_node_activity_history.sql` | 1-254 | `create_estimate_node_with_history` |
| `supabase/migrations/20260612094734_estimate_tabs_foundation.sql` | 981-1055, 1070-1114, 1175-1271, 1273-1609 | Template insert, tab CRUD, tab duplicate |
| `supabase/migrations/20260615093524_express_components_foundation.sql` | 1-200 | Express row insert RPC |

### 12.3 Tests

| File | Topic |
|------|-------|
| `tests/vitest/estimate-sheet-library-insert.test.tsx` | Scalar edits, insert, detach, promote, stale response |
| `tests/vitest/estimate-sheet-cost-inputs.test.tsx` | Cost inputs, component replace/move happy path |
| `tests/vitest/estimate-component-drag.test.tsx` | Component drag happy path |
| `tests/vitest/estimate-sheet-row-details-crud.test.tsx` | Row details, delete happy path |
| `tests/vitest/estimate-sheet-tree-dnd.test.tsx` | Tree DnD |
| `tests/vitest/estimate-tree-bulk-selection.test.tsx` | Tree bulk selection/delete happy path |
| `tests/vitest/estimate-node-reorder-action.test.ts` | Reorder action |
| `tests/vitest/estimate-tab-strip.test.tsx` | Tab UI |
| `tests/vitest/estimate-workspace-client-cache.test.tsx` | Workspace cache |
| `tests/vitest/estimate-sheet-version-control-actions.test.ts` | Row action server contracts |
| `tests/vitest/estimate-sheet-version-control-ui.test.tsx` | Activity/history UI |
| `tests/vitest/estimate-sheet-activity-history-ui.test.tsx` | Activity history |
| `tests/vitest/proposal-export-route.test.ts` | Export route |
| `tests/vitest/proposal-export-route-workbook.test.ts` | Export workbook |
| `tests/vitest/proposal-export-preview.test.tsx` | Export preview |
| `tests/vitest/proposal-workbook.test.ts` | Workbook content |
| `tests/vitest/project-source-insert-action.test.ts` | Project source action wrapper |
| `tests/vitest/reusable-source-drag.test.ts` | Source drag payload |
| `tests/vitest/template-browse-project-sources.test.tsx` | Source browsing UI |
| `tests/vitest/workshop-route-error-boundaries.test.tsx` | Error boundaries |
| `tests/vitest/estimate-sheet-library-lazy-load.test.tsx` | Lazy library load |

---

## 13. Ponytail Guidance

Per `07-ponytail-command-notes.md`, Ponytail is installed as plugin skills/commands (`@ponytail`, `@ponytail-review`, `@ponytail-audit`, `@ponytail-debt`, `@ponytail-gain`, `@ponytail-help`). Its ladder applies here:

1. Does this need to exist?
2. Does stdlib do it?
3. Does the native platform do it?
4. Does an installed dependency do it?
5. Can it be one line?
6. Only then, write the minimum code that works.

**Good small fixes for this audit:**
- Return canonical row data from the existing replace RPC and patch cache.
- Add tab id threading or server-side tab inference to existing tree mutations.
- Add one bulk-delete RPC where atomicity matters.
- Serialize existing project-source bulk calls before inventing a merge framework.
- Add targeted regression tests for each confirmed cascade risk.

**Avoid for this pass:**
- Broad decomposition of `EstimateSheetContent.tsx` before correctness bugs are fixed.
- New client state frameworks.
- Generic transaction orchestration layers.
- Large design-system cleanup mixed into mutation fixes.

---

## 14. Conclusion

The 2026-06-21 Estimate Sheet Audit And Improvement plan is accurate and in several places conservative. The five P1 defects are reproducible from source and have clear, bounded fixes. The most important pre-launch work is:

1. **Phase 0:** lock bulk row delete, component move, bulk tree delete, and template-node subtree copy.
2. **Phase 1:** stop wrong-tab refreshes and stale row revisions.
3. **Phase 2:** make failure states visible and trustworthy.

Everything else can follow in priority order. No application code or database state was changed during this audit.

---

*Audit completed 2026-06-21. All file paths and line numbers refer to `/Users/philiplewis/Documents/archestimator` at audit time.*
