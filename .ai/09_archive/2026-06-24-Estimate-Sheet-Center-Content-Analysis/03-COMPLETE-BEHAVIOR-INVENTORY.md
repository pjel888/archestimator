# 03 — Complete Behavior Inventory

Every interaction reachable through the center Estimate Sheet, grouped by input modality. Each row: trigger, preconditions, handler, state change, persistence, feedback.

## Pointer click

| # | Trigger | Preconditions | Handler | State change | Persistence | Feedback |
|---|---------|----------------|---------|--------------|-------------|----------|
| 1 | Click area header caret | Area exists | `branch.tsx:319-326` | collapse toggle | none | caret rotates |
| 2 | Click "Add row" button per area | Editable | `drop-zones.tsx:47-61` → `insertBlankRow` | optimistic insert | RPC insert | row appears, focused |
| 3 | Click selection checkbox | Row visible | `row-table.tsx:289-299` → `toggleRowSelection` | selection add/remove | none | checkbox state |
| 4 | Click "Select all" in table header | Multiple rows | `row-table.tsx:678-691` → `toggleRowsSelection` | all in table toggle | none | checkbox indeterminate |
| 5 | Click material cell drag grip | Row exists | drag start (cells.tsx:432-436) | drag state published | none | cursor: grab |
| 6 | Click component "details" button | Row exists | `row-table.tsx:467` → `openRowDetails(rowId, ..., 'details')` | rowDetails state | none | modal opens |
| 7 | Click component "activity" button | Row exists | `row-table.tsx:477` → `openRowDetails(rowId, ..., 'activity')` | rowDetails state | none | modal opens |
| 8 | Click "Delete row" trash icon | Row exists | `row-table.tsx:487` → `deleteRowItem` | optimistic remove | RPC delete | row gone, toast |
| 9 | Click "Make Project Component" | Library-linked row | `cells.tsx:466-481` → `requestProjectSpecific` | projectSpecificRowId state | none | dialog opens |
| 10 | Click "Promote to library" | Express/detached row | `cells.tsx:482-498` → `promoteRowToLibrary` | promotingRowId state | RPC promote | toast success/fail |
| 11 | Click "Delete component" (clear) | Row has component | `cells.tsx:499-512` → `clearRowComponent` | row blanked/replaced | RPC update | card blanked |
| 12 | Click "Component details" (in-card) | Row has component | `cells.tsx:513-526` → `openRowDetails(rowId, ..., 'component')` | rowDetails state | none | modal opens |
| 13 | Click confirm "Make Project Component" | Dialog open | `EstimateSheetContent.tsx:2947-2965` `confirmProjectSpecific` | dialog close + detach | RPC detach | row rail changes |
| 14 | Click "Cancel" on trust gate | Modal open | `cancelPendingLibraryCommit` (l. 2795) | gate cleared | none | modal closes |
| 15 | Click "Continue with insert/replace" on trust gate | Modal open, severity=warn | `confirmPendingLibraryCommit` (l. 2810) | gate cleared + commit fires | RPC | row appears/replaced |
| 16 | Click "Retry" on express draft | Draft failed | `cells.tsx:199-209` → `retryExpressDraft` | status creating | RPC insert (same mutationId) | row recreates |
| 17 | Click "Delete draft" on express draft | Draft failed | `cells.tsx:211-220` → `deleteExpressDraft` | row removed | none | row gone |
| 18 | Click "Filter sheet" | Sheet header | `EstimateSheetContent.tsx:3281-3366` | facet popover toggles | none | popover opens |
| 19 | Click facet checkbox | Popover open | l. 3305-3335 | facet state updates | none | rows re-filter |
| 20 | Click "Clear filters" | Facets active | l. 3358-3363 | facets reset | none | rows restore |
| 21 | Click "Group tab" button | Sheet header | l. 764-793 group menu | menu opens | none | menu visible |
| 22 | Click group menu option | Menu open | l. 783-784 | groupMode changes | none | rows reorder |
| 23 | Click "Expand all" | Sheet header | `expandAll` (l. 1803) | collapse cleared | none | all areas expand |
| 24 | Click "Collapse all" | Sheet header | `collapseAll` (l. 1804) | collapse all-set | none | all areas collapse |
| 25 | Click "New tab" (chrome header) | canEditEstimate | `tabStripRef.current.createTab()` | tab added | RPC | inline rename starts |
| 26 | Click tab | Tab strip | `onActiveTabChange` | activeTabId | route update | tab activates |
| 27 | Click "Activity" (chrome header) | Estimate page | `openActivityHistory` | inspector=scope | none | modal opens |
| 28 | Click "Preview Excel Export" (chrome) | Estimate page | `openProposalPreview` | proposalPreviewModel | none | modal opens |
| 29 | Click "Refresh preview" | Modal open | `refreshProposalPreview` | preview rebuilt | none | signature updates |
| 30 | Click "Download editable XLSX" | Modal open, ready | `downloadProposalExport` | isDownloadingProposal | blob fetch | file downloads |
| 31 | Click "Close" on any modal | Modal open | close handlers | state cleared | none | focus returns to opener |
| 32 | Click row's node breadcrumb | Breadcrumb visible | none (text only) | none | none | n/a |
| 33 | Click column resize handle | Header | `EstimateRowColumnResizeHandle` pointer down | width changes | localStorage commit | column widens/narrows |
| 34 | Double-click column resize handle | Header | `onDoubleClick` (l. 142-148) | reset to default | localStorage | column resets |

## Double-click

| # | Trigger | Handler | Result |
|---|---------|---------|--------|
| 1 | Double-click library item in sidebar | `LibraryTree.handleRowDoubleClick` | insert into selected area |
| 2 | Double-click tab | `EstimateTabStrip.beginRename` | inline rename starts |

## Right-click / context menu

| # | Target | Menu items |
|---|--------|------------|
| 1 | Tab | Rename, Duplicate, Delete (disabled if last) |
| 2 | (No row-level context menu in center sheet — only via hover icons) | n/a |

## Drag-and-drop

See `05-DRAG-DROP-AND-INSERTION-AUDIT.md` for full source×target matrix.

| # | Source → Target | Result |
|---|-----------------|--------|
| 1 | Library item → Area add-strip | append row |
| 2 | Library item → Row-table root | append row |
| 3 | Library item → Material cell | replace row component |
| 4 | In-sheet component grip → Material cell | move component (ESC-P0-01) |
| 5 | Template single → Area section | insert template |
| 6 | Template category → Area section | insert multiple templates |
| 7 | Template node → Area section | insert template node |
| 8 | Project source tab → Area section | insert project source |
| 9 | Project source node → Area section | insert project source node |
| 10 | Template / project source drag over tab | spring-load tab switch |

## Keyboard activation

See `10-UX-UI-ACCESSIBILITY-AUDIT.md` for full keyboard map.

## Global shortcuts

| # | Trigger | Precondition | Handler | Result |
|---|---------|---------------|---------|--------|
| 1 | Cmd/Ctrl+K | No blocking dialog | `setShowCommandPalette(true)` | command palette opens |
| 2 | `/` | Sheet focus, not typing, no dialog | same | command palette opens |
| 3 | Escape | Any modal open | per-modal escape listener | modal closes |
| 4 | Tab | Form input | native | next focusable |
| 5 | Shift+Tab | Form input | native | previous focusable |
| 6 | Cmd/Ctrl+Shift+ArrowLeft/Right | Tab focus | `moveActiveTab` | reorder tab |

## Touch interaction

No specific touch handling. The surface is desktop-first. Touch events fall through to mouse handlers via browser compatibility.

## Browser refresh

- All session-bound state lost (editableRows, express drafts, selection, collapse, search, facets, group).
- Server-bound state re-fetched (estimateTree, tabs, library cache survives via 5min staleTime).
- Column widths survive (localStorage).
- Pending server mutations complete in the background; client sees them on next refetch.

## Tab switching

- `onActiveTabChange` → workspace store updates.
- `EstimateSheetContent` re-renders with new `dataTabId`.
- `useEstimateTabTreeQuery` swaps to the new tab's query key.
- Tree cache hit if previously loaded; fetch otherwise.
- Pending mutations on the old tab continue; their success patches the old tab's cache.

## Area selection change

- Click area in left tree → workspace store sets selectedNodeId.
- Center sheet reads it via `activeSelectedNodeId`.
- `selectedNode` memo resolves to the new node.
- Branches re-render with the new subtree.

## Query refresh

- Background refetch on staleTime expiry (5min) or window focus (per query option `refetchOnWindowFocus`).
- Optimistic mutations mark stale but do not refetch (`refetchType: "none"`).
- Revision-conflict errors force active refetch.

## Permission changes (rare)

- No client-side subscription; permissions are checked per-action at the server.
- A user whose permission is removed mid-session sees optimistic UI succeed then server reject with toast.

## Network recovery

- React Query retries on failure per default options.
- User can retry via toast action or explicit retry button (e.g. library sidebar fallback).
- For row mutations, the per-row queue's promise chain handles eventual consistency.

## Findings surfaced here

(none new — this artifact is a reference for other audits.)
