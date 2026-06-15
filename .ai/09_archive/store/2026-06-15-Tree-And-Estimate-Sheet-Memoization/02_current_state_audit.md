---
title: "perf: Current State Audit for Memoization"
type: perf
date: 2026-06-15
execution: code
---

# perf: Current State Audit for Memoization

## Summary

The codebase already has meaningful render isolation at the row-table level and new virtualization at tree, branch, and row-table layers. The remaining high-value memoization work sits above the DOM layer in `EstimateSheetContent` and at the `EstimateSheetBranch` boundary.

---

## Current Virtualization Evidence

| Surface | Current Evidence | Memoization Implication |
|---|---|---|
| Shared tree | `src/components/ui/tree.tsx` imports `useVirtualizer`, flattens expanded nodes, and enables virtualization when `virtualization.enabled` and row count exceed `minRows`. | Large expanded trees should mount fewer rows, but row props and state objects are still rebuilt for visible rows. |
| Sheet tree | `src/components/workshop/EstimateSheetTree.tsx` passes `WORKSHOP_TREE_VIRTUALIZATION` into `Tree`. | The left estimate tree is virtualized; remaining risk is tree filtering/model construction and custom row labels. |
| Component library tree | `src/components/workshop/component-library/tree/LibraryTree.tsx` passes `WORKSHOP_TREE_VIRTUALIZATION` into `Tree`. | Component/category trees are virtualized; high-cardinality risk is `toUiNodes`, parent maps, search expansion, and row label work. |
| Templates tree | `src/components/workshop/component-library/tree/TemplatesTree.tsx` passes `WORKSHOP_TREE_VIRTUALIZATION` into `Tree`. | Template and project-source trees are virtualized; high-cardinality risk is grouping, sorting, totals, nested template-node mapping, and source search. |
| Templates browse tree | `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx` passes `WORKSHOP_TREE_VIRTUALIZATION` into `Tree`. | Browse tree rendering is virtualized; search/category grouping can still be O(all templates). |
| Library folder tree | `src/components/workshop/component-library-manager/LibraryFolderTree.tsx` passes `WORKSHOP_TREE_VIRTUALIZATION` into `Tree`. | Folder/component tree rendering is virtualized; item-by-folder maps, filtered maps, placement maps, and selection-node generation remain data-shaping costs. |
| Template structure tree | `src/components/workshop/library/template-editor/TemplateStructureTree.tsx` passes `WORKSHOP_TREE_VIRTUALIZATION` into `Tree`. | Template editor tree rendering is virtualized; it is probably lower cardinality than component/template browse trees. |
| Estimate sheet branch stream | `src/components/workshop/estimate-sheet/rows/virtual-branch-list.tsx` flattens visible branches and virtualizes when visible branches exceed `minSections`. | Thousands of nested visible branches should mount a bounded subset, but flattening and branch props still need stability. |
| Estimate row tables | `src/components/workshop/estimate-sheet/rows/row-table.tsx` virtualizes individual row tables when row count exceeds `minRows`. | Thousands of rows inside one area should mount fewer row DOM nodes. Existing table memoization is already a strong boundary. |
| Flags | `src/lib/workshop/virtualization-flags.ts` defaults tree, estimate master column, and estimate row virtualization to true; `.env.example` exposes default-on public flags. | Rollout can remain default-on while memoization changes add CPU relief on top. |

---

## Existing Memoization That Should Be Preserved

- `EstimateRowItemsTable` is `memo(...)` with `areEstimateRowItemsTablePropsEqual`.
- The row-table comparator fails open when item arrays, target node id, handlers, row selection handlers, or virtualization config change.
- The row-table comparator inspects only the table's own row ids inside `editableRows` and `selectedRowIds`.
- `EstimateRowItemTableRow` is memoized and computes row totals with `useMemo`.
- The perf suite already verifies row-table and sibling-row isolation in `tests/vitest/perf/estimate-sheet-render-relief.test.tsx`.
- Cursor isolation is already tested in `tests/vitest/perf/estimate-sheet-cursor-isolation.test.tsx`.
- `EstimateRightSidebar` is exported as a memoized component from the component-library module and receives tree/library props rather than the broad `editableRows` map.

---

## Hot Spots Found

### H1. Eager Proposal Preview Signature

`EstimateSheetContent` defines `getProposalPreviewSignature` around the proposal export model inputs and immediately derives `currentProposalPreviewSignature` with `useMemo`. The signature path calls `createProposalPreviewSignature(estimateTree, editableRows, resolvedProposalExportMetadata)`, so any `editableRows` change can trigger a full editable-tree signature walk.

Why this matters: an ordinary quantity keystroke should not pay proposal-preview signature cost if the preview is closed and no visible stale-preview indicator needs it.

### H2. Selected Node Presentation Recomputed Inline

The `EstimateSheetVirtualBranchList` call currently passes `nodeCode={resolvedSelectedNodeId ? computeNodeCode(...) : ""}` and `ancestorPath={resolvedSelectedNodeId ? findNodePath(...).slice(...).map(...) : []}` inline in JSX.

Why this matters: row edits should not recompute selected-node code or allocate a new ancestor path when tree selection did not change.

### H3. Branch Component Is Not Memoized

`EstimateSheetBranch` is exported as a plain function and receives broad `editableRows`, `selectedRowIds`, and `nodeTotals` props. Its row table child is memoized, but the branch header, drop target, breadcrumbs, and recursive children can still rerender when parent state changes.

Why this matters: branch headers should refresh when their own total or collapse/search state changes, but unrelated subtrees should not rerender on every row edit.

### H4. Node Totals Recompute Globally

`EstimateSheetContent` computes `estimateNodeTotals = useMemo(() => computeNodeTotals(estimateTree, editableRows), [editableRows, estimateTree])`. `computeNodeTotals` recursively visits every node and row.

Why this matters: this may dominate keystroke cost in large estimates even after DOM virtualization and row-table memoization.

### H5. Displayed Subtree Totals Recompute When Filtered

`displayedNodeTotals` returns the global totals when `displayedSheetNode === selectedNode`, but it calls `computeNodeTotals([displayedSheetNode], editableRows)` when search, facets, or group mode produce a filtered copy.

Why this matters: this is acceptable for active filtered views, but tests should prove it stays scoped and does not run in the normal unfiltered edit path.

### H6. Shared Tree Row Memo Is Weakened by Fresh Props

`DefaultTreeRow` is memoized, but `buildRowProps` and `buildItemState` return fresh objects per visible row. Many important consumers pass custom `renderRow`, including estimate, library, templates, folder, and template-structure trees.

Why this matters: virtualization is likely the primary shared-tree win. Extra row memo work should be evidence-gated because comparator complexity can exceed savings for the limited mounted row set.

### H7. Component and Template Tree Data Shaping Can Dominate

The component/template tree consumers are virtualized, but several of them still build complete UI trees, filtered maps, totals maps, placement maps, and selection models from full input arrays. `TemplatesTree` also groups and sorts custom templates and project sources, then maps nested template nodes and row items into tree rows.

Why this matters: with tens of thousands of components or project-source rows, virtualizing the final `Tree` rows will not help enough if every search, category change, or local mutation rebuilds the full tree model and all derived indexes.

---

## Existing Tests and Gaps

| Coverage | Existing File | Gap |
|---|---|---|
| Row table render relief | `tests/vitest/perf/estimate-sheet-render-relief.test.tsx` | Does not count branch renders or full-tree derived computations. |
| Remote cursor isolation | `tests/vitest/perf/estimate-sheet-cursor-isolation.test.tsx` | Does not assert branch or proposal-signature isolation. |
| Row table virtualization | `tests/vitest/estimate-row-table-virtualization.test.tsx` | Proves mounted row count behavior, not memoization. |
| Branch virtualization | `tests/vitest/estimate-branch-virtualization.test.tsx` | Proves mounted branch count behavior, not branch rerender isolation. |
| Shared tree virtualization | `tests/vitest/ui-tree.test.tsx` | Proves virtualizer behavior, not custom row memo behavior. |
| Component/template tree performance | `tests/vitest/templates-tree-performance.test.ts` and related template/library suites | Existing coverage is useful, but the memoization pass should add render/data-shaping probes for tens-of-thousands scale. |
| Node totals | `tests/vitest/estimate-sheet-node-totals.test.ts` | Proves totals correctness for helper output, not compute frequency. |

---

## Planning Conclusion

The next implementation should start with characterization probes for branch renders, proposal signature calls, node-total computation, and component/template tree data-shaping counts. After that, the safest ordering is lazy proposal signature, selected-node presentation memoization, branch comparator, component/template tree shaping improvements, and only then totals architecture. This order gives meaningful wins early and reduces the chance of hiding stale UI behind a broad comparator.
