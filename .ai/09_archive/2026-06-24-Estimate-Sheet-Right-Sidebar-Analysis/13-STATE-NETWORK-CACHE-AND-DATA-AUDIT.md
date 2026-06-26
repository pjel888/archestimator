# 13 — State, Network, Cache, and Data Audit

## Explicit state machine

The sidebar operates as a single large reducer (`estimateRightSidebarReducer`) with ~40 state fields. The reducer handles one action type (`fieldChanged`) that updates any field via a generic `SetStateAction` wrapper.

### States that can overlap unexpectedly
- `editingFolderMode` (`"create" | "rename" | null`) can overlap with `addComponentOpen` — creating a folder while the Add Component modal is open is not blocked.
- `previewItemId` and `previewProjectSourceKey` are independent — both can be set simultaneously, but only one preview renders (component preview wins if both are set).
- `searchQuery` persists across tab switches — switching from Library to Templates keeps the search query, which filters the templates tree unexpectedly.

### States that can become stuck
- `projectSourcesLoading`: set to `true` on Templates activation; cleared on success/error. If the server action hangs indefinitely, the skeleton stays forever. No timeout.
- `renameTemplatePending` / `deleteTemplatePending`: cleared in `finally` blocks. ✅ Safe.

### Late async completions
- **Project-source search**: stale responses can overwrite newer results (Finding F-04).
- **Template list reconciliation**: `syncedTemplatesPropRef` (line 1200-1207) reconciles the prop when it changes, preserving local optimistic appends. ✅ Handles late cache invalidation correctly.

## Query inventory

| Query | Key | Owner | staleTime | gcTime | Retry |
| --- | --- | --- | --- | --- | --- |
| Library lite (project-scoped) | `[…, "lite", "project", projectId]` | EstimateSheetContent | 5 min | default | default |
| Estimate templates | `["workspace-estimate-templates", workspaceId, userId]` | EstimateSheetContent | 5 min | default | default |
| Estimate tabs | `["estimate", estimateId, "tabs"]` | useEstimateTabsQuery | 5 min | default | default |
| Estimate tab tree | `["estimate", estimateId, "tab", tabId, "area-tree"]` | useEstimateTabTreeQuery | 5 min | default | default |
| Legacy area tree | `["estimate", estimateId, "area-tree"]` | useEstimateAreaTreeQuery | 5 min | default | default |

## Mutation inventory

| Mutation | Server action | RPC | Optimistic | Rollback | Invalidation |
| --- | --- | --- | --- | --- | --- |
| Create component | `createCostLibraryComponent` | `create_cost_library_component` | ✅ (local append) | N/A (append only) | `onLibraryDataChanged()` → lite key stale |
| Update component | `updateCostLibraryComponent` | `update_cost_library_component` | ❌ (not wired in sidebar) | — | — |
| Create folder | `createLibraryFolder` | direct insert | ✅ (temp row) | ✅ (remove on fail) | `revalidateLibraryRoutes()` |
| Rename folder | `renameLibraryFolder` | direct update | ✅ (local rename) | ✅ (restore on fail) | `revalidateLibraryRoutes()` |
| Reorder folders | `reorderLibraryFolders` | `reorder_library_folders` RPC | ✅ (local reorder) | ✅ (restore on fail) | `revalidateLibraryRoutes()` |
| Create template (node) | `createEstimateTemplateFromEstimateNode` | direct insert + cascade | ✅ (local append) | ✅ (delete orphan on fail) | `onLibraryDataChanged()` + `revalidateTemplateSurfaces()` |
| Create template (tab) | `createEstimateTemplateFromEstimateTab` | same | ✅ | ✅ | same |
| Rename template | `renameEstimateTemplate` | direct update | ✅ | ✅ | `onLibraryDataChanged()` |
| Delete template | `deleteEstimateTemplate` | direct delete | ✅ (local remove) | ✅ (restore on fail) | `onLibraryDataChanged()` |
| Insert template into estimate | `insertEstimateTemplateIntoEstimate` | RPC | ✅ (sheet-owned) | ✅ (sheet-owned) | tab tree key |
| Insert project source | `insertProjectSourceIntoEstimate` | `insert_estimate_subtree_into_estimate_with_history` | ✅ (sheet-owned) | ✅ (sheet-owned) | tab tree key |
| Local delete component | **NONE** | **NONE** | ✅ (local filter) | ✅ (undo) | `onLibraryDataChanged()` (**false signal**) |
| Local edit component | **NONE** | **NONE** | ✅ (local map) | ❌ | **NONE** |
| Local duplicate component | **NONE** | **NONE** | ✅ (local append) | ❌ | **NONE** |

## Cache invalidation analysis

### `onLibraryDataChanged()` callback
**Evidence**: `EstimateSheetContent.tsx` passes this callback to the sidebar. It invalidates:
```ts
queryClient.invalidateQueries({ queryKey: workspaceComponentLibraryQueryKey(workspaceId) });
queryClient.invalidateQueries({ queryKey: workspaceComponentLibraryLiteQueryKey(workspaceId, projectId) });
```
With `refetchType: "none"` — marks stale but does NOT trigger an immediate refetch. The next mount/refresh will re-fetch.

### The false-signal problem
When the sidebar calls `onLibraryDataChanged()` after a LOCAL-ONLY delete, the lite dataset is marked stale. A background refetch may or may not trigger (depends on `refetchOnMount` and window focus). If it does refetch:
1. The server returns the original data (item still exists in DB)
2. The cache is updated with the original data
3. The sidebar's `libraryItems` does NOT re-read from cache (it was seeded once from `initialLibraryItems`)
4. On next remount, `initialLibraryItems` is re-derived from the refetched cache → item reappears

**This creates a ghosting effect**: the item disappears, stays hidden for the session, then reappears on remount.

## Race conditions

### 1. Project-source search (F-04)
No request cancellation. Stale responses can overwrite newer results.

### 2. Concurrent template insertion
Two template insertions fired concurrently against the same target:
- Both use the sheet's optimistic update path
- The revision-counter mechanism (`getTreeRevision` / `bumpTreeRevision`) protects against out-of-order overwrites IF the revisions are checked
- **Verified**: `EstimateSheetTree.tsx:752-758` checks `getLocalTreeRevision() === optimisticRevision` before applying the server-confirmed tree. ✅

### 3. Concurrent folder create
Two folder creates fired rapidly:
- Each gets a temporary local row
- `folderEditCommitInFlightRef` guards against double-commit for the SAME folder
- Two DIFFERENT folders: both fire `createLibraryFolder` — the server assigns sort_order based on current siblings at insert time. The second insert may get a sort_order that collides with the first's optimistic sort_order. Reconciliation handles this via prop re-deruction. ✅

## Database persistence analysis

### Transaction boundaries
- **Template create from node**: wrapped in try/catch with orphan cleanup. NOT a DB transaction — partial failure between template insert and node/row insert leaves an orphan template (caught and deleted). ✅ Adequate.
- **Project source insert**: single RPC call (`insert_estimate_subtree_into_estimate_with_history`) — atomic from the client's perspective. ✅
- **Folder reorder**: single RPC (`reorder_library_folders`) with batch updates. ✅

### Idempotency
- **Project source insert**: deterministic `correlation_id` derived from the insert unit (SHA-256 of target+source params). The RPC uses this for dedup. ✅ Replay-safe.
- **Template insert**: no idempotency key. Double-submit prevented by `pending` state. If the network retries, a duplicate template could be created. **Low risk** — React Query retry is disabled for mutations in the test config; production retry behavior depends on the QueryClient defaults.
