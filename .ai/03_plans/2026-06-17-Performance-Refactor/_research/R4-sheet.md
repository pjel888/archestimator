# R4 — Estimate Sheet / Grid Subsystem Research Dossier

Agent: R4. Scope: estimate sheet/grid subsystem. Method: code-review-graph
(`file_summary`, `find_large_functions`) + full reads. READ-ONLY on source.

Files inspected in full: `EstimateSheetContent.tsx` (2950 LOC),
`EstimateWorkspaceClient.tsx`, `editable-row-model.ts`, `use-estimate-query.ts`,
`use-estimate-workspace-state.ts`, `use-estimate-row-mutations.ts`,
`virtual-branch-list.tsx`, `rows/branch.tsx`, `rows/row-table.tsx`,
`estimate-sheet-render-probe.ts`. Graph stats: sheet area is the largest cluster
of `find_large_functions` hits (top 4 of the workshop > 1500 LOC are all here).

Every claim cites `path:line-range — observation`.

---

## EstimateWorkspaceClient overview

`src/components/workshop/EstimateWorkspaceClient.tsx:54-142` — thin orchestration
shell. It is NOT the blast-radius problem; it owns only tab resolution.

- `EstimateWorkspaceClient.tsx:19-31` — lazy-loads `EstimateSheetTree` and
  `EstimateSheetContent` via `next/dynamic` with skeleton fallbacks. So the heavy
  sheet is code-split, but once mounted it is a single monolith.
- `EstimateWorkspaceClient.tsx:73-95` — owns tab-query enablement, `queryTabs`,
  `fallbackTabs`, `defaultTabId`, `resolvedActiveTabId`, `routeSelectedNodeId`.
  All `useMemo`-guarded; cheap.
- `EstimateWorkspaceClient.tsx:104-139` — renders the tree (left) + content
  (middle/right) siblings, passing identical `nodes`, `projectId`, `estimateId`,
  `dataTabId=resolvedActiveTabId`, and the full library prop bundle to BOTH.
- `EstimateWorkspaceClient.tsx:124-129` — `onEstimateTabsChange` writes tabs
  directly into the query cache (`setQueryData`) instead of refetching (R10).
- Overlap note: the left-tree (R3 agent) and the sheet content (R4, this doc)
  both receive `nodes` and independently read the SAME TanStack cache key
  (`estimateQueryKeys.tabTree` / `areaTree`) — see Overlaps section.

---

## EstimateSheetContent responsibility map (line-ranged)

`EstimateSheetContent.tsx` total file = **2950 LOC**. The exported component
function `EstimateSheetContent` itself = **1881 LOC** (`:1042-2922`,
per `find_large_functions`). This single function is the highest-blast-radius
unit in the subsystem. ~12 distinct responsibilities live inside it; another
~8 module-level helper concerns sit above it in the same file.

### Module-level helpers (above the component, `:178-1040`)
1. **Tree DFS path/code utilities** — `findNodePath` (`:178-188`),
   `findEstimateRowItem` (`:190-200`), `computeNodeCode` (`:202-213`). Recursive,
   uninstrumented except path/code probes.
2. **Row/template clone + mutate-tree helpers** — `createBlankEstimateRowTemplate`
   (`:221-242`), `createExpressEstimateRowTemplate` (`:244-275`),
   `cloneLibraryItemForEstimate` (`:395-412`), `cloneTemplateNodesForEstimate`
   (`:414-426`), `appendTemplateNodesToParent` (`:428-439`),
   `removeEstimateRowItem` (`:441-447`), `applyEditableValuesToLibraryItem`
   (`:457-475`), `replaceRowItemWithLibraryItem` (`:489-505`).
3. **Proposal preview signature** — `createProposalPreviewSignature`
   (`:287-318`): full-tree DFS that string-joins every node + every row's 15
   fields into one signature string. See Totals/signature section.
4. **Proposal export URL/blob plumbing** — `readContentDispositionFilename`
   (`:322-326`), `triggerBlobDownload` (`:328-337`),
   `appendProposalExportSettingsParams` (`:350-357`),
   `proposalPreviewModelSettings` (`:361-369`).
5. **Activity scope tree builder** — `buildActivityScopeTreeItems` (`:507-585`):
   full-tree DFS producing flattened scope rows (sheet/area/group/row).
6. **Sheet header sub-component** — `EstimateSheetHeader` (`:594-677`): search +
   expand/collapse + group-mode menu + filter slot + add-tab button.
7. **Search / facet / group transforms** — `estimateSheetRowMatchesQuery`
   (`:682-685`), `filterEstimateSheetNode` (`:691-710`), `sheetFacetsActive`
   (`:733-735`), `estimateRowItemValue` (`:737-743`), `estimateRowMatchesFacets`
   (`:745-750`), `collectSheetFacetOptions` (`:753-768`),
   `filterEstimateSheetNodeByFacets` (`:776-791`),
   `reorderEstimateSheetNodeRows` (`:803-826`). Each is its own DFS.
8. **Realtime cursor layer** — `getRemoteCursorLabel` (`:828-832`),
   `resolveCursorTarget` (`:843-860`), `EstimateSheetCursorLayer` (`:866-931`),
   `RemoteEstimateCursorsOverlay` (`:933-1009`), `RemoteEstimateCursorMarker`
   (`:1011-1040`). This concern is already isolated into sub-components (good
   precedent for decomposition).

### Inside `EstimateSheetContent` (`:1042-2922`) — owned responsibilities
Each maps to state/props it owns:

- **R-A. Query loading / tree source switching** (`:1066-1090`): chooses
  `legacyTreeQuery` vs `tabTreeQuery`, exposes `estimateTree`, `setEstimateTreeData`,
  `restore`, `getTreeRevision`. Owns: `tabInitialNodes`.
- **R-B. Lazy component-library load** (`:1179-1218`): `hasServerProvidedLibrary`,
  `shouldLoadLibraryLazily`, `lazyLibraryQueryKey`, `libraryQuery` (`useQuery`),
  `resolvedLibraryItems`, `availableTemplates`, `handleLibraryDataChanged`,
  `refetchProjectComponentProjection`.
- **R-C. Editable-row state (the keystroke hot path)** (`:1093`,
  `:1766-1783`): owns `editableRows` (`Record<rowId, EditableRowValue>`),
  `skipEditableRowsSyncRef`, the tree→editableRows resync effect.
- **R-D. Express-component insert drafts** (`:1094-1145`, `:1893-1967`):
  `expressInsertDraftsRef`, `expressInsertDrafts`, `expressInsertDraftStates`,
  setters + success/error/retry/delete handlers.
- **R-E. Column-width store wiring** (`:1107-1131`): `committed/​hydrate/​commit/​reset`
  column widths, `estimateColumnStyle`, `estimateColumnResizeConfig`.
- **R-F. Selection resolution + node presentation** (`:1274-1290`):
  `resolvedSelectedNodeId`, `selectedNode`, `selectedNodePresentation`
  (calls `findNodePath` + `computeNodeCode` — two DFS per recompute).
- **R-G. Search / facet / group display state** (`:1291-1318`):
  `sheetSearchQuery`, `sheetFacets`, `sheetGroupMode`, `displayedSheetNode`
  (composes 3 DFS transforms), `sheetFacetOptions`.
- **R-H. Collapse / expansion state** (`:1098`, `:1319-1344`, `:1442-1444`):
  `collapsedNodeIdsByScope`, `collapsedNodeIds`, `sheetExpansionContextValue`,
  `allNodeIds`, `expandAll`, `collapseAll`.
- **R-I. Bulk row selection** (`:1099`, `:1345-1392`, `:2541-2544`):
  `bulkSelectedRowIds`, `visibleSheetRowIds`, prune effect, toggle handlers,
  `deleteSelectedRows`.
- **R-J. Totals computation** (`:1401-1410`): `estimateNodeTotals`,
  `displayedNodeTotals`, `projectTotal`. See Totals section.
- **R-K. Activity history** (`:1146-1175`, `:1411-1582`, `:1670-1712`):
  `inspector`, `rowDetails`, `projectSpecificRowId`, `promotingRowId`,
  `activityFilters`, `historyData`, `isHistoryLoading(More)`, `historyError`,
  `historyReloadToken`, `currentRows` (flatten DFS), `activityScopeItems`,
  fetch effects, `loadMoreVersionControl`.
- **R-L. Proposal preview / export** (`:1100-1106`, `:1219-1272`, `:1583-1669`,
  `:2588-2601`): `isProposalPreviewOpen`, `proposalPreviewScope`,
  `proposalPreviewModel`, `proposalPreviewSignature`, `isDownloadingProposal`,
  `proposalDownloadError`, `proposalExportSettings`, signature memos,
  `buildProposalPreview`, `downloadProposalExport`.
- **R-M. Row mutation orchestration** (`:1811-2539`): ~15 stable callbacks —
  `commitRowItemUpdate`, `updateRowItem`, `insertLibraryItem`,
  `insertTemplate*IntoParent*` (×5), `insertProjectSource*`, `replaceRowItem`,
  `clearRowComponent`, `requestProjectSpecific`, `promoteRowToLibrary`,
  `confirmProjectSpecific`, `moveRowComponent`, `deleteRowItem`. Each builds
  optimistic-tree updates + rollback closures inline.
- **R-N. Command palette + global shortcuts + window-event bridges**
  (`:1097`, `:2253-2319`): `showCommandPalette`, Cmd-K / "/" keydown effect,
  `archestimator:add-library-item`, `INSERT_ESTIMATE_TEMPLATE_EVENT`,
  `INSERT_PROJECT_SOURCE_EVENT` listeners.
- **R-O. Tab strip orchestration** (`:1160-1166`, `:2774-2787`): `tabStripRef`,
  `createTabState`.
- **R-P. Cross-tree header-action registration** (`:2548-2576`): registers
  `openActivity` / `openProposalPreview` into `useEstimateHeaderActionsStore`
  so the project chrome (separate React tree) can trigger the sheet's dialogs.
- **R-Q. The render tree** (`:2578-2922`): command palette, proposal dialog,
  activity modal, row-details modal, project-specific dialog, center column
  (header + tab strip + virtual branch list + bulk toolbar) and the right
  sidebar.

### Largest functions (graph)
- `EstimateSheetContent` — 1881 LOC (`:1042-2922`).
- `EstimateRightSidebarBase` — 1748 LOC (`component-library/index.tsx:786`).
- `activity-history.tsx` file — 1689 LOC (R-K's modal lives there).
- `EstimateSheetTree` — 1314 LOC (`EstimateSheetTree.tsx:274`, R3 territory).
- `EstimateSheetBranchBase` — 320 LOC (`rows/branch.tsx:158`).

---

## Row model & editing

- **State shape**: `editableRows: Record<rowId, EditableRowValue>` is a FLAT map
  keyed by row id (`editable-row-model.ts:54-66`; held at
  `EstimateSheetContent.tsx:1093`). Good: flat, not nested in the tree.
- **Keystroke path is row-local in the setter but the map identity changes
  globally**: each keystroke calls `setEditableRows((current) =>
  updateEditableRowValue(current, item, values))` (`row-table.tsx:344-346,
  378-379, 396-398, 434-436`). `updateEditableRowValue`
  (`editable-row-model.ts:29-52`) returns a NEW top-level object
  `{ ...current, [id]: {...} }`. So the `editableRows` REFERENCE changes on
  every keystroke, propagating to every memo that depends on `editableRows`.
- **Row-level memo is correct and granular**: `EstimateRowItemTableRow` is
  `memo`'d (`row-table.tsx:170`), and `areEstimateRowItemsTablePropsEqual`
  (`row-table.tsx:86-116`) and `areEstimateSheetBranchPropsEqual`
  (`branch.tsx:111-156`) both do a per-row identity check
  (`prev.editableRows[item.id] !== next.editableRows[item.id]`) so a keystroke
  in row A skips re-rendering rows B…N and sibling branches. This is the
  load-bearing render-relief guard — it depends on (a) stable callback identity
  (`useStableCallback`, `EstimateSheetContent.tsx:1071, 1811+`) and (b) the
  per-item editableRows entry staying reference-equal.
- **`computedItem` per row** (`row-table.tsx:201-238`) recomputes
  subtotal/contingency/total inside the memoized row; cheap and correct (memo
  keyed on `editableRow`,`item`).
- **Express drafts buffer edits** (`:1870-1891`): while an insert is in flight,
  edits are buffered into the draft instead of dispatched, then flushed
  (`:1903-1905`). Adds branching to the hot path but is bounded.
- **Tree→editableRows resync effect** (`:1766-1783`) runs `collectEditableRows`
  (a full-tree DFS, `editable-row-model.ts:131-143`) on every `estimateTree` /
  `saveState` change, guarded by `skipEditableRowsSyncRef`. After a server
  reconcile this rebuilds the ENTIRE editableRows map, changing its identity.

---

## Totals / proposal-signature / activity recomputation

This is the core "full-tree recompute on every keystroke" cluster.

- **`computeNodeTotals`** (`editable-row-model.ts:162-183`) is a full-tree DFS
  that recomputes EVERY node's total. It is memo'd on `[editableRows,
  estimateTree]` (`EstimateSheetContent.tsx:1401`). Because `editableRows`
  identity changes on EVERY keystroke (above), this **full-tree total DFS reruns
  on every keystroke** in any cost cell. `reportEstimateNodeTotalsCompute`
  (`render-probe.ts:63`) exists precisely to assert this in perf tests — a
  signal the team already tracks it.
- **`projectTotal`** (`:1407-1410`) reduces over `estimateNodeTotals`; cheap once
  totals exist, but rides the same per-keystroke invalidation, then dispatches a
  DOM event `dispatchProjectTotalChange` every change (`:1740-1742`).
- **`displayedNodeTotals`** (`:1402-1406`): when no search/facet/group is active,
  reuses `estimateNodeTotals` (identity short-circuit via `displayedSheetNode ===
  selectedNode`); otherwise runs a SECOND `computeNodeTotals` over the displayed
  subtree. So with a filter active, totals are computed twice per keystroke.
- **Branch fallback total**: `branch.tsx:177` does
  `nodeTotals?.get(node.id) ?? computeNodeTotal(node, editableRows)` — if
  `nodeTotals` is ever absent, each branch independently DFS-computes its own
  subtree total (`computeNodeTotal`, `editable-row-model.ts:155-160`), an O(n²)
  risk across the tree. Today `nodeTotals` is always passed, so it's latent.
- **Proposal signature** `createProposalPreviewSignature`
  (`:287-318`) full-tree DFS string-building every node + 15 fields/row. Wrapped
  in `getProposalPreviewSignature` (`:1250-1259`) memo'd on `[editableRows,
  estimateTree, …]`, and `currentProposalPreviewSignature` (`:1260-1263`)
  recomputes it whenever a preview model exists. So when the preview dialog has
  been opened once, **every keystroke rebuilds the entire signature string** to
  drive the stale badge (`isProposalPreviewStale`, `:1663`).
- **Activity scope + flatten** `currentRows = flattenEstimateRows(...)`
  (`:1412-1415`, gated by `shouldBuildFlattenedRows`) and
  `activityScopeItems = buildActivityScopeTreeItems(...)` (`:1418-1429`) are both
  full-tree DFS, but correctly gated behind `inspector || rowDetails ||
  projectSpecificRowId` so they cost nothing when no modal is open. Good pattern.

---

## Render-pressure hotspots

1. **`editableRows` identity churn fans out to every tree-wide memo** (above):
   `computeNodeTotals` (`:1401`), `displayedSheetNode` totals (`:1402`),
   `proposalPreviewSignature` (`:1250-1263`), `getProposalPreviewSignature`
   (`:1583-1596`), and the resync effect (`:1766`) all list `editableRows` in
   deps. A single keystroke therefore triggers a full-tree totals DFS + (if a
   preview was ever opened) a full-tree signature DFS, plus a `projectTotal`
   reduce + DOM event. Row-level rendering is shielded by the memo guards, but
   the COMPUTE work is not.
2. **The component itself re-renders fully on any of its ~40 state atoms**
   (`reportEstimateSheetContentRender`, `:1065`). Because all 17 responsibilities
   share one function body, e.g. opening the proposal dialog, typing in search,
   toggling a facet, or a history fetch resolving each re-runs the entire 1881-LOC
   render and re-derives every memo whose deps changed.
3. **Branch virtualization threshold is high and section-level only**:
   `EstimateSheetVirtualBranchList` (`virtual-branch-list.tsx:74-125`) only
   virtualizes when `branches.length >= minSections (default 80)`
   (`:93`) AND the flag `WORKSHOP_ESTIMATE_MASTER_COLUMN_VIRTUALIZATION.enabled`
   is on. It virtualizes BRANCHES (node sections), not rows-within-a-branch in
   the master path; below 80 visible sections the whole tree renders. Verify the
   flag default with R2/R3 — if off in prod, no branch virtualization at all.
4. **Row virtualization is per-table and flag-gated**: `row-table.tsx` imports
   `useVirtualizer` + `WORKSHOP_ESTIMATE_ROW_VIRTUALIZATION` (`:4, :22`); each
   area's table virtualizes independently with its own threshold. A sheet with
   many small tables (lots of areas, few rows each) virtualizes nothing.
5. **`flattenVisibleBranches`** (`virtual-branch-list.tsx:44-72`) rebuilds the
   full visible-branch list via DFS on every `collapsedNodeIds`/`node` change
   (memo'd, `:80-92`) — collapse/expand re-flattens the tree.
6. **`findScrollParent`** walks the DOM with `getComputedStyle` per call
   (`virtual-branch-list.tsx:34-42` and again `row-table.tsx:130-138`) inside
   `getScrollElement`; called by the virtualizer.
7. **`collectAllNodeIds([selectedNode])`** (`:1442`) DFS on every `selectedNode`
   change to support collapse-all.
8. **`visibleSheetRowIds`** (`:1345-1354`) full-subtree DFS rebuilt on every
   `displayedSheetNode` change, feeding a selection-prune effect (`:1358-1371`)
   that runs in a `queueMicrotask`.

---

## Proposed module boundaries (candidate)

Decompose `EstimateSheetContent` (1881 LOC) along the responsibility map. Highest
value first:

1. **`useEstimateEditableRows` hook** — own R-C + the resync effect (`:1766-1783`)
   + `collectEditableRows`. Expose a row-local update API. Pair with a totals
   selector so totals subscribe per-node rather than via whole-map identity
   (e.g. a `useSyncExternalStore`/Zustand row store, or split editableRows into
   a ref + a version map) — this is the single biggest perf lever.
2. **`useEstimateTotals` / memoized index** — own R-J. Make `computeNodeTotals`
   incremental (recompute only the changed row's ancestor chain) instead of a
   full-tree DFS per keystroke. Build a parent-index once per tree.
3. **`useProposalExport` hook + `<ProposalExportController>`** — own R-L + the
   signature concern (`:287-318`, `:1219-1272`, `:1583-1669`). Move the signature
   off the keystroke path (compute lazily on dialog open / debounced).
4. **`useEstimateActivityHistory` hook** — own R-K (fetch effects,
   `loadMoreVersionControl`, scope items). Already well-gated; clean extraction.
5. **`useEstimateRowOperations` hook** — own R-M (the 15 mutation callbacks +
   optimistic tree builders + the inline DFS tree mutators `:441-505`,
   `:1990-2539`). Largest LOC win.
6. **`useSheetDisplayTransforms` hook** — own R-G (`:1291-1318`, transforms
   `:682-826`).
7. **`<EstimateSheetCenterColumn>` presentational** — own R-Q's center column
   JSX (`:2662-2892`), taking already-derived props.
8. Cursor layer (`:866-1040`) is already extracted — use it as the extraction
   template.

Constraint to preserve: the render-relief guard (`branch.tsx:111-156`,
`row-table.tsx:86-116`) depends on stable callback identity and per-row
`editableRows` entry equality. Any refactor MUST keep callbacks identity-stable
(`useStableCallback`) and the `displayedSheetNode === selectedNode` identity
short-circuit (`:1307-1315`, `:1404`).

---

## Top findings (ranked)

1. **God-component**: `EstimateSheetContent` is 1881 LOC / ~17 responsibilities /
   ~40 state atoms in one function (`:1042-2922`). Any state change re-runs the
   whole render. Highest blast radius in the subsystem; decomposition basis is
   the map above.
2. **Full-tree totals DFS on every keystroke**: `computeNodeTotals`
   (`editable-row-model.ts:162-183`) reruns on every cost-cell keystroke because
   `editableRows` identity changes globally (`:1401` dep on `editableRows`).
   Needs an incremental/indexed totals model.
3. **Proposal signature rebuilt per keystroke once dialog opened**:
   `createProposalPreviewSignature` full-tree 15-field string DFS (`:287-318`)
   rides `editableRows` identity via `currentProposalPreviewSignature`
   (`:1260-1263`). Move off the hot path.
4. **`editableRows` map identity is the central fan-out coupling**: a row-local
   edit invalidates 5+ tree-wide memos/effects (`:1401, 1402, 1250, 1583, 1766`).
   Splitting per-row subscription is the single highest-leverage fix.
5. **Virtualization is conditional + high-threshold**: branch virtualization
   needs ≥80 sections AND a flag (`virtual-branch-list.tsx:93`); row
   virtualization is per-table + flag-gated (`row-table.tsx:22`). Trees with many
   small areas, or with the flags off, render fully. Verify flag defaults.

## Open questions

- Are `WORKSHOP_ESTIMATE_MASTER_COLUMN_VIRTUALIZATION.enabled` and
  `WORKSHOP_ESTIMATE_ROW_VIRTUALIZATION.enabled` ON in production?
  (`src/lib/workshop/virtualization-flags.ts` — not read here; hand to R2/R3.)
- Does the left tree (R3) read the SAME `estimateQueryKeys.tabTree` cache and
  run its own totals DFS, doubling the per-keystroke compute? (Cross-check R3.)
- Can `computeNodeTotals` be made incremental safely given the
  search/facet/group `displayedSheetNode` path computes a SECOND totals map
  (`:1402-1406`)?
- Is `dispatchProjectTotalChange` (DOM CustomEvent, `:1740-1742`) on every
  `projectTotal` change a measurable cost, and who listens? (`ProjectTotalHeader`.)
