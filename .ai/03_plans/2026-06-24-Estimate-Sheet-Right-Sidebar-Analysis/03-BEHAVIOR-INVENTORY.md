# 03 — Behavior Inventory

> Every user-visible action in the right sidebar, traced from trigger to persistence boundary.

## Legend
- **L** = Local state only
- **B** = Browser storage
- **Q** = React Query cache
- **S** = Server action (persisted)
- **D** = Database

## Library tab

| Trigger | Handler | State | Network | Persistence | Feedback |
| --- | --- | --- | --- | --- | --- |
| Tab click "Library" | `setActiveTab("components")` | L | None | L | Tree renders |
| Search `/` shortcut | `setSearchOpen(true)` | L | None | L | Search dropdown |
| Search type | `setSearchQuery(value)` + deferred filter | L | None | L | Filtered tree |
| View-by "Default" | `setComponentViewMode("default")` | L→B | None | B | Regrouped tree |
| View-by "Suppliers" | `setComponentViewMode("suppliers")` | L→B | None | B | Supplier tree |
| View-by "Brand" | `setComponentViewMode("brand")` | L→B | None | B | Brand tree |
| Filter facets | `setFacetFilters(...)` | L | None | L | Filtered tree |
| Expand/collapse folder | `setExpandedNodeIdsByViewMode(...)` | L | None | L | Toggle caret |
| Row click (component) | `setPreviewItemId(id)` | L | None | L | Preview panel |
| Row double-click | `onInsertComponent?.(item)` | L→Q | S insert (sheet owns) | D (estimate_row_items) | Toast (sheet) |
| "+" add button | `onInsertComponent?.(item)` + qty | L→B (recents) | S insert | D | Toast |
| Context menu "Preview" | `setPreviewItemId(id)` | L | None | L | Preview panel |
| Context menu "Edit" | `setForm(componentToForm(item))` + `setShowNewComponent(true)` | L | **None** | **L only** | Modal opens |
| Context menu "Duplicate" | `createComponent()` → `setLibraryItems(append)` | L | **None** | **L only** | New row appears |
| Context menu "Favorite" | `setFavoriteIds(toggle)` | L→B | None | B | Star toggles |
| Context menu "Delete" | `setLibraryItems(filter)` + undo toast | L | **None** | **L only** | Toast "removed" |
| Preview "Edit" button | Opens legacy form | L | **None** | **L only** | Form opens |
| Preview "Duplicate" | `createComponent()` → append | L | **None** | **L only** | New row |
| Preview "Favorite" | `setFavoriteIds(toggle)` | L→B | None | B | Star toggles |
| Preview "Delete" | `setLibraryItems(filter)` + undo | L | **None** | **L only** | Toast "removed" |
| Preview qty change | `setInsertQuantity(n)` | L | None | L | Qty updates |
| Toolbar "Add Component" | `setAddComponentOpen(true)` → dynamic modal | L→Q | `createCostLibraryComponent` S | D | Modal → toast |
| Toolbar "Add folder" | Inline rename input | L→S | `createLibraryFolder` S | D | Toast "created" |
| Context menu "Rename" (folder) | Inline rename input | L→S | `renameLibraryFolder` S | D | Toast "renamed" |
| Drag component row | `onItemDragStart` sets MIME | L→event | None (drop target owns S) | D (on drop) | — |
| Drag reorder folder | `onReorder(draggedId, targetId, pos)` | L→B | **None** | **B only** | Reordered tree |
| Checkbox toggle | `setBulkSelectedNodeIds(toggle)` | L | None | L | Checkbox state |
| Bulk "Add selected" | Loop `onInsertComponent` per item | L→Q | S inserts | D | Toasts |
| Bulk "Delete selected" | `setLibraryItems(filter)` + confirm dialog | L | **None** | **L only** | Toast "removed" |

## Project tab

| Trigger | Handler | Persistence | Feedback |
| --- | --- | --- | --- |
| Tab click "Project" | `setActiveTab("project")` | L | Projection tree renders |
| Search | `setSearchQuery` + deferred filter | L | Filtered projection |
| Row click | `setPreviewItemId` | L | Preview |
| "+" add button | `onInsertComponent` | D (estimate_row_items insert) | Toast |
| Double-click | `onInsertComponent` | D | Toast |
| Checkbox | `setBulkSelectedNodeIds` | L | Checkbox |
| Bulk "Add selected" | Loop `onInsertComponent` | D | Toasts |
| Context menu | Preview/Add only (no edit/delete/duplicate) | — | — |

## Templates tab

| Trigger | Handler | Persistence | Feedback |
| --- | --- | --- | --- |
| Tab click "Templates" | `setActiveTab("templates")` + load project sources | L→S | Tree renders |
| Toolbar "Add Template" | Opens `NewTemplateModal` | L→S | Modal |
| Template create (from Area) | `createEstimateTemplateFromEstimateNode` S | D | Toast + tree update |
| Template create (from Tab) | `createEstimateTemplateFromEstimateTab` S | D | Toast + tree update |
| Template create (scratch) | `createEstimateTemplate` S | D | Toast + tree update |
| Context menu "Add to estimate" | `onInsertTemplate` → sheet | D (RPC) | Toast |
| Context menu "Rename" | Modal → `renameEstimateTemplate` S | D | Toast |
| Context menu "Delete" | Confirm → `deleteEstimateTemplate` S | D | Toast |
| Category "Add all" | Loop `onInsertTemplate` per template | D | Toasts |
| Drag template | Sets MIME payload | D (on drop) | — |
| Drag template node | Sets MIME payload | D (on drop) | — |
| Expand project source | `listReusableProjectEstimateSources` S | D (read) | Skeleton → content |
| Expand estimate source | `getReusableEstimateOutline` S | D (read) | Skeleton → content |
| Hover project row | `onPrefetchNode` → prefetch | S (read) | None (silent) |
| Project-source search | `searchReusableProjectSources` S | D (read) | Search results |
| Source row click | `setPreviewProjectSourceKey` | L | Preview panel |
| Source "Add to estimate" | `onInsertProjectSource` → `insertProjectSourceIntoEstimate` S | D (RPC copy) | Toast |
| Drag source | Sets MIME payload | D (on drop) | — |
| New Template Group | `setCustomTemplateGroups(append)` | **L only** | Group appears |
| Template source filter | `setTemplateSourceFilter("all"\|"custom"\|"projects")` | L | Filtered tree |

## Panel shell

| Trigger | Handler | Persistence | Feedback |
| --- | --- | --- | --- |
| Resize drag | `setDragWidth` → `setSavedWidth` on mouseup | B (localStorage + cookie) | Panel resizes |
| Resize keyboard | Arrow keys → `commitWidth` | B | Panel resizes |
| Collapse toggle | `setCollapsed(toggle)` | **L only** (not persisted) | Panel collapses |
| `/` shortcut (search) | `setSearchOpen(true)` | L | Search dropdown |
| Escape | Close search/modal/rename | L | Closes overlay |
