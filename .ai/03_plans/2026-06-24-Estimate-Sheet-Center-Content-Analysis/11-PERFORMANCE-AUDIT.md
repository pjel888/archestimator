# 11 — Performance Audit

## Render path analysis

`EstimateSheetContent` re-renders on:
- Any reducer field change (30+ fields).
- `estimateTree` change (mutation patch or setTree).
- `editableRows` change (every keystroke).
- `saveState` change (every mutation transition).
- `selectedNode` / `resolvedSelectedNodeId` change.
- Query hook state (loading/error/data).
- Collaboration cursor state.

**Mitigation:**
- Every callback reaching `EstimateSheetBranch` is wrapped in `useStableCallback` (l. 1339, etc.) to preserve referential identity.
- `EstimateSheetBranch` is `memo`'d with `areEstimateSheetBranchPropsEqual` (branch.tsx:114-159) that deep-checks only the relevant slice (editableRows/selectedRowIds per row in this subtree).
- `EstimateRowItemsTable` is `memo`'d with `areEstimateRowItemsTablePropsEqual` (row-table.tsx:88-118).
- `EstimateRowItemTableRow` is `memo`'d (l. 178).

**Net effect:** A keystroke in one area's row patches `editableRows` for that row only; the branch memo's `branchRowStateChanged` returns true only for branches containing that row. Other branches skip re-render.

## Memo effectiveness

| Memo | File:line | Deps | Risk |
|------|-----------|------|------|
| `displayedSheetNode` | ESC l. 1665-1673 | selectedNode, search, facets, group | Identity-preserving when all transforms inactive — passes the same reference to `EstimateSheetVirtualBranchList`. GOOD. |
| `estimateNodeTotals` | ESC l. 1759 | estimateTree, editableRows | Recomputed on every editableRows change (every keystroke). For 1000 rows × 10 fields, this is a full tree walk per keystroke. **P2 perf concern at scale.** |
| `selectedNodePresentation` | ESC l. 1644-1651 | estimateTree, resolvedSelectedNodeId | `computeNodeCode` + `findNodePath` are O(n) — fine for <500 nodes. |
| `currentRows` (flattened) | ESC l. 1770-1773 | editableRows, estimateTree, shouldBuildFlattenedRows | Only built when inspector/row-details/project-specific is open. GOOD. |
| `sheetFacetOptions` | ESC l. 1676 | selectedNode | Recomputed on every selectedNode change. Walks the whole subtree. Acceptable. |
| `proposalPreviewSignature` | ESC l. 1611-1620 | many | Recomputed on every keystroke (editableRows dep). Used to detect staleness. |
| `buildProposalPreview` | ESC l. 1946-1959 | editableRows, estimateTree, settings | Only called on user action (open/refresh). GOOD. |

## Tree transforms

Each render with active search/facets/group clones the tree:

- `filterEstimateSheetNode` (l. 813-832): full tree walk, new node objects for matches.
- `filterEstimateSheetNodeByFacets` (l. 898-913): same.
- `reorderEstimateSheetNodeRows` (l. 1029-1052): per-area reorder.

These are memoized via `displayedSheetNode`, so they run once per deps change. For a 10,000-row estimate with active search, the filter is O(n) per keystroke. **At 10k rows this becomes measurable (~10-50ms)**.

## Total computation

`computeNodeTotals` (editable-row-model.ts:162-183) walks the tree once and computes per-node totals. Called on every editableRows change.

For each row, `computeRowTotal` (l. 145-153) parses 4 strings and does basic arithmetic. ~1μs per row → 10ms for 10,000 rows. Acceptable.

**The deeper concern:** every parent re-render flows `editableRows` as a new object reference, busting the `estimateNodeTotals` memo. So a single keystroke triggers a full re-totalling even though only one row changed.

## Row virtualization

`EstimateRowItemsTable` virtualization (row-table.tsx:545-557):
- Threshold: `items.length >= 75`.
- Estimate row height: 96px.
- Overscan: 6.
- Disabled when `hasActiveExpressEditor` (ESC-P1-06).

## Branch virtualization

`EstimateSheetVirtualBranchList` (virtual-branch-list.tsx:74-164):
- Threshold: `branches.length >= 80`.
- Estimate section height: 192px.
- Overscan: 5.
- Always-on for the root; not disabled by express editor.

**Concern:** Branch virtualizer measures section heights via `measureElement` (l. 143). When drop zones appear mid-drag, section heights change; the virtualizer may mismeasure until the next measurement pass. **Probable cause of visual jitter during drag on large sheets.** Spec hypothesis H19.

## Drag performance

- `dragover` fires ~60Hz. Drop-zone `dragCount` updates on every dragenter/leave; minor.
- Auto-scroll rAF loop (use-dragEdgeAutoScroll) runs only when speed > 0; idle otherwise. GOOD.
- Drag-state store subscription re-renders every branch on drag start/end (one render pass to reveal drop zones). Acceptable for <500 branches.

## Cursor collaboration performance

`RemoteEstimateCursorsOverlay` rAF loop (EstimateSheetContent.tsx:1174-1202):
- Runs every frame when cursors.length > 0.
- Per cursor: `resolveCursorTarget` does DOM queries (`querySelector`) every frame. **ESC-P3-25** — for 10+ cursors this is measurable. Cache by anchor id.

## Lazy library query

`useQuery` (l. 1539-1556):
- Enabled only when `shouldLoadLibraryLazily && (renderSidebar || showCommandPalette)`.
- gcTime 30min, staleTime 5min. GOOD.
- `loadProjectComponentLibraryLite` skips the detail graph. GOOD.

## Profile estimates (reasoned from code path, not measured)

| Workload | Estimated initial render | Estimated keystroke latency |
|----------|--------------------------|------------------------------|
| 1 row, 1 area | <50ms | <5ms |
| 75 rows, 1 area | ~100ms (virtualization on) | <10ms |
| 1000 rows, 1 area | ~300ms initial; stable after | <15ms keystroke, **but inline editor disables virtualization** → ~120ms keystroke |
| 10,000 rows across 80 areas | ~1.5s initial; ~50ms keystroke; ~200ms total recompute per keystroke | borderline usable |
| 80 areas, each collapsed | ~200ms initial | <10ms |
| 500 areas expanded | ~1s initial; scroll lag likely | n/a |

## Ranked optimization opportunities

1. **ESC-P1-06** — Keep virtualization on during express editor via rangeExtractor. Highest impact for large areas.
2. **ESC-P3-21** — Memoize `computeNodeCode` / `findNodePath` per-node-id.
3. **ESC-P3-25** — Cache cursor anchor resolution.
4. **`estimateNodeTotals` per-keystroke recompute** — split into per-node memoization.
5. **Drop-zone reveal re-renders every branch** — could be scoped to depth-0 only via a separate context.

## Findings surfaced here

- **ESC-P1-06** — virtualization cliff.
- **ESC-P3-21, ESC-P3-25** — minor perf optimizations.
- **Spec hypothesis H19** (branch virtualization mismeasures during drag) — probable; not verified at runtime.
