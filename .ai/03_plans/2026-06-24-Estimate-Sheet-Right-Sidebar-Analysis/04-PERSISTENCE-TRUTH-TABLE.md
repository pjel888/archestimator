# 04 — Persistence Truth Table

> **Headline finding**: Several sidebar actions that look like CRUD are **local-only** (React state / browser storage). They survive sidebar remount but **NOT** page refresh or device change. The toasts use careful weasel words ("removed from this sidebar view") but the UX implication is persistence.

## Library Components

| Action | UI label | Local state | React Query | Server action | DB | Survives remount | Survives refresh | Survives device change | Toast says | Actual classification | Finding |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Create (via AddComponentModal) | "Add Component" | `libraryItems` append | `onLibraryDataChanged()` invalidates lite key | `createCostLibraryComponent` RPC | `cost_library_items` insert | ✅ | ✅ | ✅ | (none — modal closes) | **PERSISTED** | OK |
| Create (via legacy NewComponentForm) | "Save" / "Save & Add" | `libraryItems` append via `createComponent()` helper | **NO invalidation** | **NONE** | **NONE** | ✅ | ❌ | ❌ | (success implied) | **LOCAL-ONLY** | **F-05** |
| Edit (preview panel) | "Edit" | `libraryItems` map via `createComponent()` helper | **NO invalidation** | **NONE** | **NONE** | ✅ | ❌ | ❌ | (none) | **LOCAL-ONLY** | **F-05** |
| Duplicate | "Duplicate" | `libraryItems` append via `createComponent()` helper | **NO invalidation** | **NONE** | **NONE** | ✅ | ❌ | ❌ | (none) | **LOCAL-ONLY** | **F-05** |
| Delete (single) | "Delete" | `libraryItems` filter (remove) | `onLibraryDataChanged?.()` | **NONE** | **NONE** | ✅ | ❌ | ❌ | "removed from this sidebar view" | **LOCAL-ONLY** (toast is honest) | **F-06** |
| Delete (bulk) | "Delete selected" | `libraryItems` filter | `onLibraryDataChanged?.()` | **NONE** | **NONE** | ✅ | ❌ | ❌ | "removed from this sidebar view" | **LOCAL-ONLY** | **F-06** |
| Undo delete | "Undo" | `libraryItems` restore from ref | N/A | **NONE** | **NONE** | ✅ | ❌ | ❌ | "restored to this sidebar view" | **LOCAL-ONLY** | OK (honest) |
| Favorite toggle | Star icon | `favoriteIds` array | N/A | **NONE** | **NONE** | ✅ | ✅ (localStorage) | ❌ | (none) | **BROWSER-LOCAL** | **F-07** |
| Mark recent (on insert) | (automatic) | `recentIds` array | N/A | **NONE** | **NONE** | ✅ | ✅ (localStorage) | ❌ | (none) | **BROWSER-LOCAL** | **F-07** |
| Reorder (drag siblings) | drag drop | `customOrderByViewMode` | N/A | **NONE** | **NONE** | ✅ | ✅ (localStorage) | ❌ | (none) | **BROWSER-LOCAL** | **F-08** |
| Add to estimate | "+" / double-click / drag | N/A (delegates to sheet) | N/A | `insertEstimateRowItemFromLibrary` (sheet owns) | `estimate_row_items` insert | ✅ | ✅ | ✅ | (sheet toast) | **PERSISTED** | OK |
| Preview | row click | `previewItemId` state | N/A | N/A | N/A | ✅ | ❌ | ❌ | (none) | **LOCAL-ONLY** | OK (intended) |
| Change insert qty | qty input | `insertQuantity` state | N/A | N/A | N/A | ✅ | ❌ | ❌ | (none) | **LOCAL-ONLY** | OK (intended) |

### Evidence for local-only Edit/Duplicate/Delete

**`src/components/workshop/component-library/helpers.ts:220-294`** — `createComponent()`:
```ts
export function createComponent(form: NewComponentForm): { component?: EstimateRowItem; error?: string } {
  // ... validation ...
  return {
    component: {
      id: `custom-${Date.now()}`,  // ← CLIENT-SIDE ID, not a DB UUID
      // ... builds a local EstimateRowItem object ...
      source: "library",
      isCustom: true,
      // NO server call anywhere
    },
  };
}
```

This function is used by the legacy `NewComponentForm` save path and by the Edit/Duplicate handlers in `index.tsx`. It creates a local object with a `custom-${Date.now()}` id — **never a DB row**.

**`tests/vitest/estimate-sheet-library-lazy-load.test.tsx:196-200`** — the test contract confirms `onLibraryDataChanged` is called >= 8 times, but does NOT verify that Edit/Duplicate/Delete actually persist:
```ts
const notifyCallCount = sidebarSource.match(/onLibraryDataChanged\?\.\(\);/g)?.length ?? 0;
expect(notifyCallCount).toBeGreaterThanOrEqual(8);
```

### Critical implication: `onLibraryDataChanged` on local-only mutations

The `onLibraryDataChanged?.()` callback IS called after local-only Delete (single and bulk). This invalidates the React Query lite dataset, causing a **refetch from the server**. The refetch returns the original DB data — which still contains the "deleted" item. So:

1. User clicks Delete → item disappears from sidebar (local state)
2. `onLibraryDataChanged()` fires → cache invalidates
3. Background refetch completes → cache now has the original data again
4. **BUT**: the sidebar's `libraryItems` is seeded from `initialLibraryItems` prop once, then evolves locally (see `createInitialEstimateRightSidebarState` line 707). It does NOT re-read from the React Query cache on invalidation. So the item stays hidden until remount.
5. On remount: `initialLibraryItems` is re-derived from the (now-refetched) cache → item reappears.

This is a **MISLEADING UX** pattern: the user sees the item disappear, gets a toast saying "removed," but the item returns on remount/refresh. See **Finding F-06**.

## Library Folders

| Action | Local state | Server action | DB | Survives refresh | Finding |
| --- | --- | --- | --- | --- | --- |
| Create | optimistic row + reconcile | `createLibraryFolder` | `library_folders` insert | ✅ | OK |
| Rename | optimistic update | `renameLibraryFolder` | `library_folders` update | ✅ | OK |
| Delete | N/A (not available in sidebar) | `deleteLibraryFolder` (available in LibraryFolderTree) | RPC `delete_library_folder` | ✅ | N/A in sidebar |
| Reorder | optimistic + reconcile | `reorderLibraryFolders` | RPC `reorder_library_folders` | ✅ | OK |
| Reparent | N/A | N/A | N/A | N/A | **MISSING** (F-09) |
| Move component to folder | N/A | `moveCostLibraryComponentToFolder` | `cost_library_items.library_folder_id` update | ✅ | OK (in LibraryFolderTree, not sidebar) |

## Templates

| Action | Local state | Server action | DB | Survives refresh | Finding |
| --- | --- | --- | --- | --- | --- |
| Create from Area | optimistic append + reconcile | `createEstimateTemplateFromEstimateNode` | `estimate_templates` + nodes + row items | ✅ | OK |
| Create from Tab | optimistic append + reconcile | `createEstimateTemplateFromEstimateTab` | same | ✅ | OK |
| Create from scratch | optimistic append | `createEstimateTemplate` | `estimate_templates` insert | ✅ | OK |
| Rename | optimistic update | `renameEstimateTemplate` | `estimate_templates` update | ✅ | OK |
| Delete | optimistic remove | `deleteEstimateTemplate` | `estimate_templates` delete (cascade) | ✅ | OK |
| Add to estimate | delegates to sheet | `insertEstimateTemplateIntoEstimate` | RPC | ✅ | OK |

## Template Groups (Categories)

| Action | Persisted? | Evidence | Finding |
| --- | --- | --- | --- |
| Create group | **LOCAL-ONLY** — appends to `customTemplateGroups` state array | `index.tsx` `customTemplateGroups` field; no server action | **F-10** |
| Rename group | **NOT AVAILABLE** | N/A | **F-10** |
| Delete group | **NOT AVAILABLE** | N/A | **F-10** |
| Reorder group | **NOT AVAILABLE** | N/A | **F-10** |
| Empty group after refresh | **DISAPPEARS** — derived from template `category` strings; a custom-only group with no templates vanishes | `TemplatesTreeModel.ts:226-235` builds categories from template data + `customTemplateCategories` | **F-10** |

## Reusable Project Sources

| Action | Persisted? | Evidence |
| --- | --- | --- |
| Load projects | Read-only server fetch | `listReusableProjectSources` |
| Load estimates | Read-only server fetch | `listReusableProjectEstimateSources` |
| Load outline | Read-only server fetch | `getReusableEstimateOutline` |
| Search | Read-only server fetch | `searchReusableProjectSources` |
| Preview | Local state only | `previewProjectSourceKey` |
| Insert | **PERSISTED** (snapshot copy) | `insertProjectSourceIntoEstimate` → RPC `insert_estimate_subtree_into_estimate_with_history` |
| Refresh source | Re-expands (re-fetches) | collapse/expand cycle |

**Insert = snapshot, NOT live link**: The `insert_estimate_subtree_into_estimate_with_history` RPC copies the source subtree into the target estimate. There is no ongoing link. The preview's "Live source" / "Read-through source" chips (`index.tsx:519-523`) are **misleading** — they imply ongoing synchronization that does not exist. See **Finding F-11**.

## Preferences

| Preference | Storage | Survives refresh | Survives device | Finding |
| --- | --- | --- | --- | --- |
| Active tab | localStorage `LIBRARY_PREFS_KEY` | ✅ | ❌ | F-07 |
| Component view mode | localStorage `LIBRARY_PREFS_KEY` | ✅ | ❌ | F-07 |
| Expansion state | **NOT persisted** (recomputed on mount) | ❌ | ❌ | OK (intentional) |
| Tree ordering | localStorage `LIBRARY_TREE_ORDER_KEY` | ✅ | ❌ | F-08 |
| Favorites | localStorage `LIBRARY_FAVORITES_KEY` | ✅ | ❌ | F-07 |
| Recents | localStorage `LIBRARY_RECENTS_KEY` | ✅ | ❌ | F-07 |
| Panel width | localStorage + cookie | ✅ | ❌ | OK |
| Search query | **NOT persisted** (resets on tab switch) | ❌ | ❌ | OK (intentional) |
| Facet filters | **NOT persisted** (resets on unmount) | ❌ | ❌ | OK (intentional) |
| Preview state | **NOT persisted** | ❌ | ❌ | OK (intentional) |
| Template source filter | **NOT persisted** | ❌ | ❌ | OK |
