# 09 — Network, Cache, and Persistence Audit

## Read queries

| Query | Hook/Caller | Query key | Server action | StaleTime | Notes |
|-------|-------------|-----------|---------------|-----------|-------|
| Estimate detail | `useEstimateQuery` (use-estimate-query.ts:18-23) | `["estimate", estimateId]` | `estimateRepository.getEstimateTree` | default | Used by `useMoveEstimateRowItem` (not by center sheet). |
| Estimate tabs | `useEstimateTabsQuery` (l. 148-171) | `["estimate", estimateId, "tabs"]` | `fetchEstimateTabs` | 5min | initialData from SSR. |
| Area tree (legacy) | `useEstimateAreaTreeQuery` (l. 25-83) | `["estimate", estimateId, "area-tree"]` | `fetchEstimateTree` | 5min | Enabled only when no `dataTabId`. |
| Tab tree | `useEstimateTabTreeQuery` (l. 85-146) | `["estimate", estimateId, "tab", tabId, "area-tree"]` | `fetchEstimateTabTree` | 5min | One cache per tab. |
| Tree revision | internal to above hooks | `[...queryKey, "revision"]` | none (client-only counter) | forever | Mutable; bumped on setTree. |
| Component library lite | `useQuery` in EstimateSheetContent (l. 1539-1556) | `workspaceComponentLibraryLiteQueryKey(workspaceId, projectId)` | `loadProjectComponentLibraryLite` | 5min | Lazy when sidebar opens. |
| Estimate sheet version control | `fetchEstimateSheetVersionControl` direct (l. 2046) | none (imperative) | same | n/a | Per-scope generation guard. |

## Mutations (every row/tree mutation in the center sheet)

| Mutation | Hook (`use-estimate-row-mutations.ts`) | Server action | RPC | Optimistic onMutate | Cache patch onSuccess | Rollback onError | Idempotent (mutationId) | Atomic |
|----------|----------------------------------------|---------------|-----|---------------------|----------------------|------------------|------------------------|--------|
| Insert row | `insertMutation` (l. 303-341) | `insertEstimateRowItemFromLibrary` | `insert_estimate_row_item_with_history` | None (optimistic done by caller's setEstimateTree) | `patchEstimateRowItemInTree` with canonical result | caller's rollback | YES (mutationId passed) | YES |
| Replace row | `replaceMutation` (l. 343-362) | `replaceEstimateRowItemWithLibrary` | `replace_estimate_row_item_with_history` | None (caller's setEstimateTree) | same | same | YES | YES |
| Delete row | `deleteMutation` (l. 364-367) | `deleteEstimateRowItem` | `delete_estimate_row_item_with_history` | None (caller's setEstimateTree) | none (caller already removed) | caller's rollback | YES | YES |
| Update row | `updateMutation` (l. 450-507) | `updateEstimateRowItem` | `update_estimate_row_item_with_history` | YES — optimistic patch via `patchEstimateRowItemInTree` + operation-id tracking | `toServerRowPatch(result, input)` | `previousPatch` from onMutate | YES | YES |
| Detach row | `detachMutation` (l. 369-418) | `detachEstimateRowItemFromLibrary` | `unlink_estimate_row_item_from_library_with_history` | YES — optimistic `source: 'project', sourceLibraryItemId: null, linkState: 'detached'` | `toDetachedRowPatch(result)` | `previousPatch` | YES | YES |
| Promote row | `promoteMutation` (l. 420-448) | `promoteEstimateRowToLibraryComponent` | `promote_estimate_row_to_library_component` | None (caller's setEstimateTree) | `toPromotedRowPatch(result)` | caller's rollback | YES | YES |

**Server action authz (all in `src/lib/estimates/actions.ts`):**
- `requireAuth` (line 1 of every action) — Supabase session check.
- `assertCanEditEstimate(supabase, estimateId)` (l. 414-418) — RPC `can_edit_estimate`.
- `assertCurrentLibrarySourceForEstimateCommit(supabase, libraryItem)` (l. 879-903) — re-reads `cost_library_items`, throws if archived or `updated_at` differs from snapshot.
- `getCurrentWorkspaceProject(projectId)` (l. 747-749) — RLS check that project belongs to caller's workspace.

**Transaction boundaries:**
- Each row-level RPC (`update_estimate_row_item_with_history`, etc.) is a single Postgres function that updates the row + writes the `estimate_sheet_events` entry in one transaction. **Atomic at the row level.**
- Template insert RPCs return the full refreshed tree.
- Project source insert: `insert_estimate_subtree_into_estimate_with_history` is one RPC = one transaction for the whole subtree.

**History event writes:** Inside the same RPC (not a separate statement), so a partial failure rolls back both the mutation and the history event.

## Cache patching patterns

1. **Caller-side optimistic patch:** `setEstimateTree` (EstimateSheetContent.tsx:2118-2121) directly mutates the React Query cache via `setTree` (which is `queryClient.setQueryData`). Bumps revision counter + `skipEditableRowsSyncRef`.

2. **Mutation-hook optimistic patch (update/detach only):** `updateMutation.onMutate` (use-estimate-row-mutations.ts:452-483) calls `queryClient.cancelQueries` + reads previous tree + applies `toOptimisticRowPatch(input)` via `patchEstimateRowItemInTree`. Returns `{ operationId, previousPatch }` as context.

3. **Canonical patch on success:** All mutations call `queryClient.setQueryData(queryKey, currentTree => patchEstimateRowItemInTree(currentTree, rowId, canonicalPatch))` in onSuccess.

4. **Invalidation (passive):** `invalidateQueries({ queryKey, refetchType: "none" })` marks stale without refetch. Used on every successful mutation so background refetch on next mount pulls fresh data.

5. **Invalidation (active):** `refetchType: "active"` only on revision-conflict errors (l. 280-282, 416, 446, 505). Forces the visible query to refetch.

## Cache key discipline

- Tab tree keys are per-tab (`estimateQueryKeys.tabTree(estimateId, tabId)`). A mutation on tab A patches tab A's cache only.
- Detail key (`estimateQueryKeys.detail`) is invalidated but not directly patched (it's metadata, not tree).
- Library keys are workspace-scoped + project-scoped; cross-workspace contamination is impossible because the key includes workspaceId.

## Concerns

- **Default-tab contamination:** Not possible — tab keys include `tabId`, never default to "default".
- **Cross-estimate contamination:** Not possible — every key includes `estimateId`.
- **Duplicate cache owners:** None — each piece of data has one canonical key.
- **Local tree/cache divergence:** Tracked via revision counter; rollback gated on revision match.
- **Missing cancellation:** `updateMutation.onMutate` calls `queryClient.cancelQueries({ queryKey })` (l. 457). Insert/replace/delete mutations do NOT cancel; they rely on the caller's optimistic `setEstimateTree` having already mutated the cache. This is fine because those mutations don't have an onMutate that reads "previous" state.
- **Stale response overwrite:** Guarded by operation-id (update) and revision (template insert). **NOT guarded for project-source insert** (ESC-P0-02).
- **Over-broad invalidation:** `handleLibraryDataChanged` invalidates the WHOLE workspace-component-library prefix. Acceptable for a workspace-scoped library.
- **Silent mutation failures:** Every mutation has an `onError` that either fires the caller's rollback or shows a toast. No silent failures.
- **"Saved" toast while another write active:** ESC-P1-04.

## Idempotency

- `mutationId` (UUID) generated client-side (`createMutationId`, l. 198-202). Passed to server action.
- Server-side idempotency dedup is via the `estimate_sheet_events` table's `correlation_id` column (referenced in `actions.ts:342-344 getMutationCorrelationId`).
- For project-source insert, `correlation_id` is deterministic from the source unit (`reusable-sources/actions.ts:369-380 projectSourceInsertCorrelationId`) so a replay of the same insert unit returns the original rows.

## Findings surfaced here

- **ESC-P0-02** — project-source insert bypasses the revision-gate reconciliation.
- **ESC-P1-03** — bulk-delete is N independent mutations, no batch RPC.
- **ESC-P1-04** — save toast uses one global id.
- (All other mutation paths are sound.)
