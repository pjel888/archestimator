# 07 — Tabs, Selection, Search, and Display Audit

## Tab lifecycle

Component: `EstimateTabStrip` (estimate-sheet/EstimateTabStrip.tsx, 770 lines).

**Create:** Imperative via `ref.current.createTab()` from the header "New tab" button (EstimateSheetContent.tsx:3370-3378). Server `createEstimateTab` returns `{ estimateTabId, tabs }`; strip appends from returned list and auto-enters inline rename (l. 466-482).

**Rename:** Double-click or right-click → "Rename". Inline input rendered via `Tabs` component's `getTabButtonProps`. Enter commits; Escape cancels. Menu-close-auto-focus dance handled via `suppressContextMenuCloseAutoFocusRef` + `ignoreRenameBlurDuringContextMenuCloseRef` (l. 283-333).

**Duplicate:** Right-click → "Duplicate". Server `duplicateEstimateTab`. New tab auto-selected + focus management via `pendingFocusTabIdRef` (l. 511-535).

**Reorder:** Cmd/Ctrl+Shift+Arrow (l. 650-661). Server `reorderEstimateTabs`.

**Delete:** Right-click → "Delete". Disabled when only one tab remains (l. 637-643). Server `deleteEstimateTab`. Active selection moves to replacement; focus follows.

**Read-only mode:** `enableLifecycleActions={canEditEstimate}` (l. 3387). When false, no context menu, no inline rename, no "New tab" button.

**Tests:** `tests/vitest/estimate-tab-strip.test.tsx` — 19 tests, comprehensive coverage.

**Focus management:** Robust. `pendingFocusTabIdRef` + `manageMenuCloseFocusRef` (l. 201-202, 335-343) handles deterministic focus return after menu actions.

**Tab name display:** `getEstimateTabDisplayName` (tab-display.ts:10-13) — first tab always "Page 001" regardless of stored name.

**Spring-loading:** See `05-DRAG-DROP-AND-INSERTION-AUDIT.md`.

## Selected Area resolution

`resolveEstimateWorkspaceSelection` (use-estimate-workspace-state.ts:110-124):
- Reads `selectedNodeId` (from prop or store).
- If found in tree, uses it.
- Else falls back to `estimateTree[0]`.

The center sheet's `selectedNode` (l. 1635-1643) memo runs this every render. Stale selection auto-resolves to the first node on tree load.

**Workspace store** (Zustand): per-estimate AND per-tab selection tracking (l. 6-17). On tab switch, the store's tab-keyed map provides the previous selection for that tab.

**Route sync:** `useEffect` at l. 2113-2116 calls `syncActiveTabRouteUrl(resolvedSelectedNodeId)` when `dataTabId` is set; uses `window.history.replaceState` to avoid a full route transition.

## Expand/collapse

State: `collapsedNodeIdsByScope: Record<scopeKey, nodeId[]>` (reducer). Scope key = `dataTabId ?? "legacy"` (l. 1677).

**Per-tab scoping:** Each tab has its own collapse state. Switching tabs does not preserve collapse (intentional — each tab is its own view).

**Search override:** When `sheetSearchActive`, the `EstimateSheetExpansionContext` provides `collapsedNodeIds: EMPTY_COLLAPSED_NODE_IDS` (l. 1697), forcing all areas visible. Carets are suppressed (`searchActive: true`).

**Expand all / Collapse all:** Header buttons (l. 3274-3275) → `expandAll` / `collapseAll` (l. 1803-1804).

**Persistence:** Reset on remount. **Open Question #22.**

## Search

State: `sheetSearchQuery` reducer field.

**Filter:** `filterEstimateSheetNode` (EstimateSheetContent.tsx:813-832) — keeps node whose name matches OR any descendant/row matches.

**Matching:** `[item.material, item.name, item.category, item.supplier, item.description].some(...)` (l. 804-807). Case-insensitive substring. No diacritic handling. No Unicode normalization.

**Behavior with collapse:** Search overrides collapse (above). Clearing search restores preserved collapse state.

**Performance:** O(n) per keystroke; for large trees this is fine (estimate <10k nodes). The filtered tree is memoized (l. 1665-1673).

## Facet filters

State: `sheetFacets: { suppliers: string[], categories: string[], hasValueOnly: boolean }` (reducer).

**Options:** `collectSheetFacetOptions(selectedNode)` (l. 875-890) derives from the UNFILTERED selected node, so toggling a facet never removes other options.

**Filter:** `filterEstimateSheetNodeByFacets` (l. 898-913) — same keep-ancestors recursion as search.

**Composition:** Search → facets → group, in that order (l. 1665-1673).

## Group/sort

State: `sheetGroupMode: "default" | "category" | "supplier" | "cost"` (reducer).

**Implementation:** `reorderEstimateSheetNodeRows` (l. 1029-1052) — within-area reorder only. No group-header rows are added (comment l. 1024-1027).

**ESC-P2-13:** Label "Group" over-promises; should be "Sort".

**Render-only:** Persistent row order in tree cache is unchanged; the reorder exists only in `displayedSheetNode` memo.

**Identity preservation:** When mode = "default", `reorderEstimateSheetNodeRows` returns the same node reference (l. 1030), preserving the `EstimateSheetBranch` memo's render-relief.

## Bulk selection

State: `bulkSelectedRowIds: Set<string>` (reducer).

**Single-row toggle:** `toggleRowSelection` (l. 1731-1738).
**Select-all-in-table:** `onToggleRowsSelection(selectableRowIds, !allRowsSelected)` from the table header checkbox (row-table.tsx:678-691). `selectableRowIds` is the items in THAT table only (l. 536).
**Cross-area selection:** Supported — selection persists across area navigation; the bulk toolbar shows the total count.

**Selection pruning:** `useEffect` at l. 1716-1729 prunes ids not in `visibleSheetRowIds` whenever the displayed tree changes. **ESC-P2-12** — silent pruning, no aria-live announcement.

**Bulk action:** "Delete selected rows" (BulkActionToolbar at l. 3461-3475) → `deleteSelectedRows` (l. 3067-3070) → **ESC-P1-03**.

## Truncated/error/loading states

**Truncation:** `didTruncateInitialTree` (l. 1355-1356) — renders a warning banner (l. 3394-3398) when initial load exceeded node/row limits. Proposal export uses separate full-data limits (per banner copy).

**Tree error:** `activeTreeQuery.isError` → full-sheet error UI with retry (l. 3399-3409).

**Tab tree loading:** `isActiveTabTreeLoading` (l. 3071) → skeleton UI (l. 3410-3416).

**Empty area:** Renders branch with empty row table + ComponentDropTarget's empty state (drop-zones.tsx:93-99).

**No search results:** `displayedSheetNode === null` after filtering → no branch rendered. The pointer surface still shows the cursor layer. **GAP** — no "no results" message; the user sees an empty area. Minor UX issue.

**Library sidebar error:** Separate fallback component (l. 3487-3489) — does not block sheet editing.
