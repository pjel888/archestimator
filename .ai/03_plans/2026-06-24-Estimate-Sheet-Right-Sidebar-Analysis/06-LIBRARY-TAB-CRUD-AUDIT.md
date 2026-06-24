# 06 — Library Tab CRUD Audit

## Component Create

### Entry points
1. **Toolbar "Add Component"** → `setAddComponentOpen(true)` → dynamic `AddComponentModal` import
2. **Folder context menu "New Component"** → `setAddComponentOpen(true)` (via `onCreateComponent` callback)
3. **Legacy `NewComponentForm`** (showNewComponent path — **still wired** but superseded by the modal)

### Canonical path (AddComponentModal)
- **Persisted**: ✅ via `createCostLibraryComponent` RPC
- **Server validation**: `validatePriceOptions`, `assertQuickAddComponentInput`, `normalizePriceOptionInput`
- **Authorization**: `assertCanManageLibrary` (RPC `is_workspace_editor`)
- **Quota**: `LIBRARY_COMPONENT_CAP = 10_000` per workspace
- **Upload handling**: images resized client-side (1600px, webp 82%), uploaded to `/api/component-library/images`, cleaned up on validation failure (`removeComponentImageUpload`)
- **Revalidation**: `revalidateLibraryRoutes()` after insert
- **Cache invalidation**: `onLibraryDataChanged?.()` called by the sidebar after the modal's `onComponentCreated` callback
- **Reconciliation**: the new item appears immediately (optimistic local append), and the cache invalidation ensures the next lazy-load includes it

### Legacy path (NewComponentForm)
- **Persisted**: ❌ **LOCAL-ONLY** — `createComponent()` helper (`helpers.ts:220`) creates `{id: "custom-${Date.now()}"}`
- **No server call**: the form calls `setLibraryItems(append)` only
- **No cache invalidation**: `onLibraryDataChanged()` is NOT called
- **Disappears on refresh**: ✅ confirmed by code path analysis
- **Finding**: **F-03/F-05** (P1)

### Duplicate submission prevention
- **AddComponentModal**: `pending` state disables the submit button. `useTransition` wraps the server action.
- **NewComponentForm**: no guard — double-clicking "Save & Add" could append twice. **Low risk** since the path is legacy.

## Component Edit

### Entry points
1. **Context menu "Edit"** → `componentToForm(item)` → `setShowNewComponent(true)`
2. **Preview panel "Edit" button** → same

### Current behavior
- **Persisted**: ❌ **LOCAL-ONLY** — opens the legacy `NewComponentForm` pre-filled with the component's fields. On save, `createComponent()` builds a new local object and replaces the item in `libraryItems`.
- **Fields preserved**: the `componentToForm` mapping (`index.tsx:796-814`) covers: material, category, supplier, unit, itemCost, currency, discipline, designation, description, tags, imageUrl, miscCost, sku, sourceUrl, notes.
- **Fields LOST**: price options/variants, cost entries, attachments, component version, lifecycle state, brand, brandId, categoryNodeId, categoryPath, libraryFolderId, sourceLibraryItemId, componentVersionId, priceOptionId. The legacy form silently drops all variant/audit data.
- **Finding**: **F-03/F-05** (P1) — the toast says nothing (no success confirmation), so the user may not realize the edit was local-only.

### Recommended correction
Wire Edit to open `AddComponentModal` in edit mode (the modal already has an update path via `updateCostLibraryComponent`). This preserves all fields and persists to the DB.

## Component Duplicate

### Entry points
1. **Context menu "Duplicate"** → `createComponent(form)` → `setLibraryItems(append)`
2. **Preview panel "Duplicate" button** → same

### Current behavior
- **Persisted**: ❌ **LOCAL-ONLY**
- **Fields copied**: same as Edit (basic fields only, no variants/attachments/history)
- **ID**: `custom-${Date.now()}` — not a DB UUID
- **No server call**: `createComponent()` only
- **Finding**: **F-03/F-05** (P1)

## Component Delete

### Entry points
1. **Context menu "Delete"** → `setDeleteCandidate(item)` → confirm dialog
2. **Preview panel "Delete" button** → same
3. **Bulk toolbar "Delete selected"** → `setBulkDeleteConfirmOpen(true)` → confirm dialog

### Current behavior
- **Persisted**: ❌ **LOCAL-ONLY** — `setLibraryItems(prev => prev.filter(...))`
- **Cache invalidation**: `onLibraryDataChanged?.()` IS called — this is the **false invalidation** that makes the delete look persisted when it isn't
- **Toast**: `"${name} removed from this sidebar view."` with Undo action — the "from this sidebar view" qualifier is technically honest but easily missed
- **Undo**: restores from a local ref (`deletedItemsRef`) — restores local state only, not a DB record
- **Remount**: item reappears (the lazy-load cache was invalidated and refetched, but the sidebar doesn't re-read from cache; on remount, `initialLibraryItems` is re-derived from the now-refetched cache containing the original item)
- **Finding**: **F-01/F-06** (P1)

### What "Delete" actually does to the database
**Nothing.** The `executeBulkArchiveLibraryComponents` server action EXISTS and is wired to the Components page (not the sidebar). The sidebar's Delete never calls it.

### Recommended correction
Wire sidebar Delete to `executeBulkArchiveLibraryComponents` (single-item for context menu, multi-item for bulk). The RPC supports preview + hash verification + correlation id. The toast should say "archived" (the accurate term for the lifecycle state change).

## Favorites and Recents

- **Storage**: `localStorage` — `LIBRARY_FAVORITES_KEY`, `LIBRARY_RECENTS_KEY`
- **Write trigger**: favorite toggle on context menu / preview; recent write on successful insert
- **Cross-device**: ❌ not synced
- **Privacy on shared devices**: favorites/recents persist in browser storage; no per-user scoping within a shared browser profile
- **Finding**: **F-07** (P2)

## Folder Create

- **Persisted**: ✅ via `createLibraryFolder` server action
- **Optimistic**: temporary row appears immediately with inline rename input
- **Reconciliation**: server-confirmed UUID replaces temporary id
- **Enter + blur**: both commit; `folderEditCommitInFlightRef` guards against double-commit
- **Escape**: cancels, removes temporary row
- **Failure**: removes temporary row, shows error toast

## Folder Rename

- **Persisted**: ✅ via `renameLibraryFolder` server action
- **Available on**: custom folders only (not taxonomy folders, not "All Components" root)
- **Focus management**: fragile timeout-based handoff from context menu close — **Finding F-14**
- **Failure**: restores original name, shows error toast

## Folder Delete / Reparent / Nest

- **Delete**: ❌ **NOT AVAILABLE** in the sidebar's `LibraryTree`. Available only in the full `LibraryFolderTree` (component-library-manager).
- **Reparent**: ❌ **NOT AVAILABLE** in the sidebar.
- **Create nested folder**: ❌ **NOT AVAILABLE** in the sidebar (the create flow always creates a top-level folder via `parentId: null`).
- **Move component between folders**: ❌ **NOT AVAILABLE** in the sidebar.
- **Finding**: **F-09** (P2)

## Cross-surface parity

| Action | Sidebar | Components page (LibraryFolderTree) | Parity? |
| --- | --- | --- | --- |
| Create component | ✅ (AddComponentModal) | ✅ (same modal) | ✅ |
| Edit component | ❌ local-only | ✅ (AddComponentModal edit mode) | ❌ |
| Duplicate | ❌ local-only | ✅ (server-persisted) | ❌ |
| Delete component | ❌ local-only (looks like hide) | ✅ (archive via RPC) | ❌ |
| Create folder | ✅ | ✅ | ✅ |
| Rename folder | ✅ | ✅ | ✅ |
| Delete folder | ❌ not available | ✅ | ❌ |
| Reorder folders | ✅ (persisted) | ✅ | ✅ |
| Reparent folder | ❌ | ✅ (drag) | ❌ |
| Move component | ❌ | ✅ (drag) | ❌ |
