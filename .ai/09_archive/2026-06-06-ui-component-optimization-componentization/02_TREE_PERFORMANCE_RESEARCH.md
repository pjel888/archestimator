# Tree Performance and Reuse Research

Date: 2026-06-06

Sources are limited to official or primary documentation.

## Research Summary

Tree performance in this app should be handled as a data-shape and render-scope problem before it becomes a memoization or virtualization problem.

The strongest research-backed approach is:

1. Measure the relevant subtree render cost with React Profiler.
2. Split heavy client-only islands with Next.js dynamic import only where it reduces initial route JavaScript.
3. Flatten visible tree rows before considering virtualization.
4. Preserve WAI-ARIA tree keyboard and state semantics when rows are virtualized or dynamically loaded.
5. Keep controlled React Complex Tree state explicit for editable drag/drop trees.

## 2026-06-06 Measurement Caveat

This document contains useful thresholds, but they are not Archestimator baselines yet. No React Profiler trace, bundle analysis, or realistic 500+ row fixture is recorded in this pack. `data/local/seed.json` currently contains only one sample estimate, two sections, two line items, two floors, two spaces, and two cost-library items, so it cannot justify virtualization or large-tree claims.

Use `MEASUREMENT_BASELINE.md` and `BENCHMARK_PROTOCOL.md` before claiming performance improvement. Use the route-transition plan's `14-code-splitting-named-exports.md` and `19-react-memo-strategy.md` before adding dynamic imports or React.memo.

## React Guidance

Official sources:

- `memo`: https://react.dev/reference/react/memo
- `useMemo`: https://react.dev/reference/react/useMemo
- `useCallback`: https://react.dev/reference/react/useCallback
- `Profiler`: https://react.dev/reference/react/Profiler
- Render and commit: https://react.dev/learn/render-and-commit

Findings:

- `memo`, `useMemo`, and `useCallback` are performance tools, not correctness guarantees.
- `useMemo` should be used for expensive pure calculations such as visible-row flattening, tree filtering, descendant indexes, and grouped table rows.
- `useCallback` helps only when callback identity matters, especially for memoized child rows or render props.
- `memo` is useful for stable row components only if props are minimized and stable.
- React Profiler can measure subtree render duration, including mount/update phases and `actualDuration`, which should become the evidence gate before broad memoization.
- React rendering is recursive, so a state update high in `EstimateSheetContent.tsx` can call many descendants even when the DOM change is small.

Application impact:

- Memoize `treeIndex`, `visibleRows`, `filteredTree`, and row grouping.
- Avoid inline object/array/function props in tree row maps where row components are memoized.
- Do not rely on memoization to hide a large monolithic component. Split the state owner first.
- Wrap candidate subtrees in temporary Profiler test harnesses rather than relying on subjective UI feel.

## Next.js Guidance

Official source:

- Lazy loading guide: https://nextjs.org/docs/app/guides/lazy-loading

Findings:

- Lazy loading reduces initial route JavaScript by deferring Client Components and libraries until needed.
- `next/dynamic` can load Client Components immediately in separate bundles or on demand behind state/conditions.
- Client Components are prerendered by default; `ssr: false` is a Client Component option for browser-only components.
- Lazy loading applies to Client Components. Server Components are already automatically code split.
- External libraries can be loaded on demand with `import()` when user interaction requires them.

Application impact:

- Existing `EstimateWorkspaceClient.tsx` dynamic imports are directionally correct.
- Additional dynamic imports are candidates for modals, proposal preview, activity/history modal, Add Component modal subsections, and heavy share-only panels.
- Do not split every small component. Split where route startup JavaScript or hidden modal code is material.
- Keep SSR-disabled imports limited to browser-only dependencies or surfaces whose server prerender is not valuable.

## TanStack Virtual and Table Guidance

Official sources:

- TanStack Virtual introduction: https://tanstack.com/virtual/latest/docs/introduction
- TanStack Virtualizer API: https://tanstack.com/virtual/latest/docs/api/virtualizer
- TanStack Table virtualization guide: https://tanstack.com/table/latest/docs/guide/virtualization

Findings:

- TanStack Virtual is headless. It provides virtualization state and positioning, not markup or styles.
- The core model is a scroll parent, a total-size inner element, and visible virtual items positioned within it.
- `estimateSize` is required because virtualizers need a row-size estimate before measurement.
- `overscan` trades extra render work for fewer blank areas while scrolling.
- TanStack Table does not include virtualization itself, but it can work with virtualization libraries including TanStack Virtual.

Application impact:

- Tree virtualization should operate on flattened visible rows, not recursive nested `<ul>` output.
- Virtualized tree rows need stable item keys, explicit level/position metadata, and a scroll container with fixed height.
- `WorkshopTree` can remain recursive for small trees while a new `VirtualizedTreeRows` renderer handles large read-only trees.
- Editable React Complex Tree virtualization should not be attempted first. Keep React Complex Tree for drag/drop and optimize its item maps/state before replacing rendering.
- Table virtualization is a candidate for large estimate row sets, but current dependency set lacks `@tanstack/react-virtual`; dependency addition requires explicit approval and a measured threshold.

## React Complex Tree Guidance

Official sources:

- Controlled environment: https://rct.lukasbach.com/docs/guides/controlled-environment/
- Multiple trees: https://rct.lukasbach.com/docs/guides/multiple-trees/
- API overview: https://rct.lukasbach.com/docs/api/

Findings:

- Controlled environments provide flexibility but require the app to manage expanded, selected, focused, and other view state.
- Controlled environments require all items to be provided directly unless the app implements missing-item loading.
- Multiple trees can share drag/drop capabilities and shared state only when placed in the same tree environment.
- React Complex Tree is positioned as an accessible tree component with multi-select and drag-and-drop.

Application impact:

- `EstimateSheetTree.tsx` and `LibraryFolderTree.tsx` are correctly using controlled state for high-control editable trees.
- Shared behavior should be extracted around model building, view state, row rendering, and drop planning rather than replacing the RCT environment.
- If future work needs cross-tree drag/drop between library and estimate trees, a shared `ControlledTreeEnvironment` boundary becomes relevant.
- The app should avoid forcing share/activity read-only trees into RCT unless they need RCT features.

## WAI-ARIA Tree View Guidance

Official source:

- WAI-ARIA Tree View Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/treeview/

Findings:

- A tree view is a hierarchical list with expandable/collapsible parent nodes.
- Focus and selection are distinct states, especially in multi-select trees.
- Multi-select trees should use a consistent interaction model and can benefit from explicit select-all/unselect-all controls.
- Tree structures require `role="tree"`, `role="treeitem"`, and `role="group"` relationships.
- Parent nodes expose `aria-expanded`; end nodes should not.
- When the full set of available nodes is not present in the DOM because of dynamic loading or scrolling, nodes need explicit `aria-level`, `aria-setsize`, and `aria-posinset`.
- Tree containers need an accessible label.

Application impact:

- Existing `WorkshopTree` role usage is a good base for recursive trees.
- Virtualized tree rows must add explicit level, set size, and position metadata because not every row is in the DOM.
- Bulk-select affordances should keep focus and checked/selected state semantics separate.
- Share trees and activity trees should get keyboard/focus behavior before being called fully accessible tree widgets.

## Research-Backed Performance Rules For This App

1. Profile first:
   - Use React Profiler for `EstimateSheetTree`, `EstimateSheetContent`, `LibraryFolderTree`, and share tree surfaces.

2. Reduce render scope before adding memoization:
   - Split stateful files so changing one row or one modal does not rerender unrelated panels.

3. Build indexes once per input change:
   - Use maps for descendant lookup, parent lookup, sibling lists, folder-to-items, supplier groups, and brand groups.

4. Flatten before virtualizing:
   - Recursive tree output is not a good virtualization target. Convert visible nodes to row records first.

5. Use virtualization thresholds:
   - Keep simple recursive rendering below a visible-row threshold.
   - Consider virtual rows when visible rows exceed hundreds of nodes or Profiler shows repeated high update duration.

6. Keep editable and read-only tree renderers separate:
   - Editable drag/drop trees can use React Complex Tree plus optimized model/view state.
   - Read-only and share trees can use the shared tree core plus optional virtual rows.

7. Preserve accessibility metadata:
   - Virtual/dynamic trees need `aria-level`, `aria-setsize`, and `aria-posinset`.

8. Avoid dependency creep:
   - Since `@tanstack/react-virtual` is not currently installed, adoption should be a measured implementation decision.

## Candidate Performance Metrics

Collect these before and after implementation:

- Initial mount duration for `EstimateSheetContent`.
- Update duration for expanding/collapsing a tree node.
- Update duration for selecting bulk tree rows.
- Update duration for search filtering in `LibraryFolderTree` and share tree panel.
- Visible row count and total node count for each tree.
- Bundle delta for dynamic modal/section splits.
- Route transition profile using existing peak-load tests.

## Practical Thresholds

Suggested initial thresholds for implementation planning:

- Less than 200 visible rows: recursive render is acceptable unless Profiler proves otherwise.
- 200 to 500 visible rows: optimize data indexes and memoized visible-row flattening first.
- More than 500 visible rows: evaluate virtual rows for read-only/share/activity trees.
- Editable drag/drop trees: optimize React Complex Tree item model, view state, and drop-planning maps before replacing rendering.

These thresholds should be verified with Archestimator data, not treated as product invariants.
