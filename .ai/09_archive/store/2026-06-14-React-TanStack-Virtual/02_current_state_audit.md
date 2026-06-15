# Current State Audit

## Dependency state

`@tanstack/react-virtual` is not installed. Current TanStack packages are:

- `@tanstack/react-query`
- `@tanstack/react-table`

Implementation phase must add:

```bash
bun add @tanstack/react-virtual
```

Do this only in the dependency phase, not during planning.

## Center estimate sheet / EMC

Primary files:

- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/estimate-sheet/rows/branch.tsx`
- `src/components/workshop/estimate-sheet/rows/row-table.tsx`
- `src/components/workshop/estimate-sheet/rows/cells.tsx`
- `src/components/workshop/estimate-sheet-render-probe.ts`

Current shape:

- `EstimateSheetContent` owns tree data, editable rows, selection, cursor layer, modal state, and sheet-level callbacks.
- `EstimateSheetBranch` recursively renders each node:
  - node header
  - one `EstimateRowItemsTable` for that node's own rows
  - add/drop strip
  - child branches
- `EstimateRowItemsTable` renders a normal table with a `thead` and maps every row item into `EstimateRowItemTableRow`.
- `EstimateRowItemsTable` is memoized with a custom comparator that checks only item identity, editable row slices, selection slices, and stable callbacks.
- Each row has `content-visibility:auto` and intrinsic size hints.
- Keyboard navigation currently uses global selectors:
  - `[data-estimate-row-index="..."][data-estimate-cell-index="..."]`
  - row indexes are local per table, so virtualization should move navigation toward stable row ids or table-scoped lookup.
- Collaboration cursors resolve anchors by querying mounted `[data-estimate-row-id="..."]` elements. Offscreen virtual rows will not exist, so fallback behavior must be explicit.

Existing performance evidence:

- Edit latency is much better after memoization and lazy derivations.
- Large initial render got heavier due to per-row memo boundaries.
- This points at initial mount/DOM pressure as the reasonable reopen condition, not edit-path recomputation.

Recommended EMC insertion point:

- Plan two EMC insertion points:
  - branch/section virtualization around the recursive `EstimateSheetBranch` hierarchy for many visible nodes
  - row-body virtualization inside `EstimateRowItemsTable` for one node with many row items
- Keep recursive branch rendering as the default fallback while the virtual branch path matures.
- Keep branch headers, add/drop strips, breadcrumbs, row tables, and child areas behavior-identical across the recursive and virtual paths.
- Do not assume row-table-only virtualization solves EMC scale; a BOQ with many small nested nodes needs branch/section virtualization too.

## Shared tree primitive

Primary file:

- `src/components/ui/tree.tsx`

Current shape:

- `flattenTree(...)` builds the full visible logical tree.
- `flatNodes.map(...)` renders every visible row.
- The component owns:
  - ARIA tree and treeitem metadata
  - roving focus
  - selection and indeterminate cascade display
  - current row
  - DnD source/drop state
  - root drop zones
  - custom row rendering through `renderRow` and `renderItem`

Virtualization fit:

- Keep `flattenTree(...)` as the logical model.
- Replace only the render loop with an optional virtualized render loop.
- Preserve non-virtual rendering as default/fallback for small trees and for any consumer that opts out.

Important risk:

- Current focus effect does `document.querySelector([data-tree-row="${focusId}"])`. With virtualized rows, Arrow/Home/End must call `scrollToIndex` before trying to focus an offscreen row.

## Left sheet tree

Primary file:

- `src/components/workshop/EstimateSheetTree.tsx`

Current shape:

- Converts estimate nodes into `Tree` nodes.
- Uses `Tree` with:
  - controlled expansion
  - checkbox/bulk selection
  - current row
  - context menu
  - native DnD reorder
  - external template/project-source drops
  - root drop zones
  - rename inline input as a custom row label

Virtualization fit:

- Enable virtual mode through the shared `Tree` prop once the generic implementation passes shared tests.
- This surface should get extra tests for inline rename, context menu, and DnD bands because those are easy to break when rows unmount.

## Right component and templates trees

Primary files:

- `src/components/workshop/component-library/index.tsx`
- `src/components/workshop/component-library/tree/LibraryTree.tsx`
- `src/components/workshop/component-library/tree/TemplatesTree.tsx`
- `src/components/workshop/component-library/tree/buildLibraryTree.ts`
- `src/components/workshop/component-library/tree/helpers.ts`

Current shape:

- `LibraryTree` and `TemplatesTree` both use the shared `Tree`.
- Right panel already uses `useDeferredValue` for search input.
- Recent template-panel work improved project-source filtering/tree construction with indexed descendants and helper performance tests.
- Remaining tree render bottleneck is mounted visible rows, not necessarily tree construction.

Virtualization fit:

- Enable shared `Tree` virtual mode for both `LibraryTree` and `TemplatesTree` after the left-tree pilot passes or if right-panel browser evidence is stronger.
- Keep existing helper performance tests. Add DOM/windowing behavior tests because current tests do not prove virtualized render behavior.

## Tests already in the safety net

Relevant existing tests:

- `tests/vitest/ui-tree.test.tsx`
- `tests/vitest/tree-external-drop.test.tsx`
- `tests/vitest/estimate-sheet-tree-dnd.test.tsx`
- `tests/vitest/estimate-tree-context-menu.test.tsx`
- `tests/vitest/estimate-tree-filter.test.tsx`
- `tests/vitest/component-library-ui.test.tsx`
- `tests/vitest/templates-tree-performance.test.ts`
- `tests/vitest/perf/estimate-sheet-render-baseline.test.tsx`
- `tests/vitest/perf/estimate-sheet-render-relief.test.tsx`
- `tests/vitest/perf/estimate-sheet-cursor-isolation.test.tsx`
- `tests/vitest/estimate-sheet-cost-inputs.test.tsx`

Missing tests:

- virtualized `Tree` renders only a window and preserves ARIA metadata
- virtualized `Tree` keyboard navigation scrolls offscreen rows into view before focus
- virtualized `Tree` DnD before/after/inside bands work at the first and last rendered rows
- virtualized EMC branch stream renders only a window while preserving rows-first mixed-content layout
- virtualized EMC branch stream preserves collapse/search, template drops, add-row strips, and the single sticky header rule
- row-table virtual body keeps a focused edited row mounted or restores focus safely
- offscreen row selection persists
- remote cursor for offscreen row falls back without re-rendering sheet content
- browser trace comparison on a realistic large estimate
