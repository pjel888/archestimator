# 12 — Activity, Details, Export, and Collaboration Audit

## Row details modal

`RowDetailsModal` (activity-history.tsx:1079+).

**Tabs:** Details, Component, Activity. State: `rowDetails: { rowId, tab }` in reducer.

**Opening:** `openRowDetails(rowId, opener, tab?)` (ESC l. 1866-1869) — captures opener for focus return.

**Closing:** Escape (window listener l. 2090-2101) or close button → `closeRowDetails` (l. 1870-1873) → `setRowDetails(null)` + rAF focus return.

**Source-of-truth for fields:** Reads from `currentRows` (flattened) which uses `editableRows` for editable fields and `item.*` for canonical. So opening row details while a cell is being edited shows the DRAFT values, not the persisted. **This is documented at activity-history.tsx l. 1149-1153** (`row?.lineTotal ?? item?.totalItemCosts ?? 0`). User-facing: not clearly communicated.

**Activity tab:** Fetches row history via `fetchEstimateSheetVersionControl({ scope: "row", rowId, ... })`. Per-scope generation guard via `requestGenerationRef` (l. 1098, 1141-1146).

## Activity history modal

`ActivityHistoryModal` (separate component in activity-history barrel).

**Scope:** `inspector: { mode: 'sheet' | 'node' | 'row', ... }` reducer field. Default `'sheet'`.

**Filters:** `activityFilters: { eventType, search, dateFrom, dateTo }` reducer field. Default `DEFAULT_ACTIVITY_FILTERS`.

**Fetch:** `fetchEstimateSheetVersionControl` (ESC l. 2046-2071). Generation guard via `historyRequestGenerationRef` (l. 1526).

**Stale request suppression:** `(requestGeneration) => requestGenerationRef.current === requestGeneration && inspectorScopeRef.current === requestScopeKey` checks in `.then` and `.catch`.

**Load more:** Pagination via cursor. `loadMoreVersionControl` (l. 1883-1945) appends to existing state.

**Optimistic actions NOT shown:** The activity modal shows server-persisted events only. Optimistic changes (e.g. an in-flight insert) do NOT appear until the RPC resolves and the history event is written. **GOOD.**

## Proposal preview

**State:** `isProposalPreviewOpen`, `proposalPreviewModel`, `proposalPreviewSignature`, `proposalExportSettings`, `isDownloadingProposal`, `proposalDownloadError`.

**Build:** `buildProposalExportModel({ metadata, nodes: materializeEditableEstimateTree(estimateTree, editableRows), settings })` (l. 1951-1959). Materializes the editable rows into a tree, so the preview reflects unsaved drafts (ESC-P3-18).

**Staleness detection:** `proposalPreviewSignature` (l. 1611-1620) is a hash of (tree, editableRows, tab scope, settings). Compared on each render; if drifted, badge shows "Preview is stale. Refresh to rebuild."

**Refresh:** `refreshProposalPreview` (l. 1983-1986) calls `buildProposalPreview()` again.

**Download:** `downloadProposalExport` (l. 1991-2017) — `fetch(proposalDownloadHref)`, blob on success, error surfacing on failure.

**Blob URL cleanup:** `URL.revokeObjectURL(url)` after click (l. 411). GOOD.

**Settings:** User can adjust contingencyRate, vatRate, contingencyIncluded, vatIncluded, includeFormulas, includeInternalBreakdown. Changes mark preview stale (signature drifts).

**Scope:** "all-tabs" vs "active-tab" toggle when multiple tabs exist. URL param `tab=dataTabId` for active-tab scope (l. 1629).

## Proposal export route

`/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx` (per `proposalDownloadHref` at l. 1627). Server-side route handler (not in center column scope; covered by separate API audit if any).

## Collaboration cursors

`EstimateSheetCursorLayer` (ESC l. 1092-1157) wraps `useEstimateCursorCollaboration`.

**Channel:** `estimate:{estimateId}` (l. 148). Private channel (Supabase Realtime).

**Identity verification:** `verifyRealtimeIdentity({ envelope, publicKey, expectedTopic, claimedUserId })` — Ed25519 signature verification. Cursors that fail verification are dropped (l. 197-199).

**Broadcast:** `pointermove` listener on the `[data-estimate-pointer-surface]` element (l. 1116-1143). Throttled to 80ms (`throttleMs` l. 107); min-distance 6px (`minDistancePx` l. 108).

**Anchor:** Row+cell id + fractional position within. Re-resolved on receiver to handle differing scroll/viewport (l. 1069-1086).

**rAF interpolation:** Eases each marker toward its target every frame (l. 1174-1202). Reduced-motion → snap.

**Cleanup:** Cursors stale after 5s without a frame (l. 263-274).

## Conflict communication

**Optimistic-concurrency conflict** (revision mismatch): server throws `EstimateRowRevisionConflictError` with code `ESTIMATE_ROW_REVISION_CONFLICT_CODE`. Client surfaces via:
- Toast: "This row changed elsewhere. The sheet has been refreshed; review the latest row before saving again." (l. 24 of use-estimate-row-mutations.ts).
- Active refetch (`refetchType: "active"`) so user sees canonical state.

**No silent last-write-wins.** Server's `expected_row_revision` check rejects stale writes.

**Cursors are not edit locks.** Two users can edit the same row simultaneously; the second save gets a 409 and must review.

## Findings surfaced here

- **ESC-P3-18** — proposal preview includes unsaved edits without warning.
- **ESC-P3-23** — activity history fetch has no debounce.
- **ESC-P3-24** — toast container overlaps bulk-action dock.
- **ESC-P3-25** — cursor rAF resolves anchors every frame.
