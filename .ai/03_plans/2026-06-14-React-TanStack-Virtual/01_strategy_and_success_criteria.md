# Strategy And Success Criteria

## Why this is worth planning

The Estimate Sheet Page is mission-critical for the MVP. The center sheet, left sheet tree, and right components/templates panel all have unbounded "render every visible row" paths. Recent work removed major edit-path recomputation, so the next likely scale ceiling is mounted DOM and initial render/scroll work on large estimates and large reusable-source libraries.

2026-06-15 product-scale correction: the current sample project is not the deciding basis for shared Tree or EMC virtualization. Archestimator's expected live usage includes deeply nested BOQs, reusable project-source trees, custom template trees, library folder structures, and center Estimate Master Column (EMC) branch hierarchies that can plausibly reach hundreds or thousands of visible nodes/rows. That production premise is sufficient to plan both shared Tree and EMC virtualization now, provided runtime exposure remains reversible and default-off until proven.

TanStack Virtual is a good fit because it is headless. It calculates the visible range, but we keep ownership of the scroll container, markup, row styling, ARIA, drag/drop, and editing model. That matters for Archestimator because the UI is not a generic feed. It has editable tables, sticky node headers, tree DnD, context menus, bulk selection, and collaboration cursors.

## North star

For large estimates and large libraries, mounted row count should be bounded by viewport size plus overscan, while user behavior remains identical:

- editing rows keeps focus, dirty state, blur-save, row details, keyboard navigation, and selection
- left and right trees preserve roving focus, search reveal, current row, checkbox cascade, DnD bands, external drops, context menus, and ARIA metadata
- EMC branch sections preserve collapse/expand, rows-first ordering, sticky top header behavior, template/component drops, add-row strips, breadcrumbs, and node totals
- collaboration cursors stay isolated from row/table re-renders and degrade gracefully for offscreen rows
- small and normal closed-beta estimates do not regress

## Non-goals

- Do not rewrite the estimate sheet as a single giant virtual list in the first pass.
- Do not replace the shared `Tree` model or reintroduce separate tree implementations for each sidebar.
- Do not depend on lower DOM count alone as success evidence.
- Do not remove existing memoization or `content-visibility:auto` until after real browser proof.
- Do not ship virtualization on all surfaces in one PR.

## Success metrics

Gate 0 baseline must record before numbers for:

- large sheet initial render
- large sheet scroll long tasks and rough FPS
- keystroke latency in top, middle, and bottom rows
- left tree expand/collapse and keyboard traversal at `>= 1,000` visible tree rows
- right templates/components tree search and scroll at `>= 1,000` visible tree rows
- DOM node count for the active surface
- memory trend after repeated scroll up/down

Implementation is successful only if the enabled surface improves the failing browser metric and passes behavior gates.

Suggested readiness budgets for the virtualized surface:

| Surface | Target |
| --- | --- |
| Tree visible DOM rows | viewport rows + overscan only |
| Row-table visible DOM rows | viewport rows + overscan only for tables over threshold |
| Keyboard focus | Arrow/Home/End can move to offscreen rows by scrolling them into the virtual window |
| Edit latency | no regression versus current 500-row jsdom evidence |
| Browser scroll | no sustained blank gaps during normal trackpad/wheel scrolling |
| Small fixtures | no meaningful mount or interaction regression below threshold |

## Official TanStack constraints to encode

From TanStack Virtual docs:

- It virtualizes long lists, grids, and scroll containers by calculating the visible window while the app keeps its own markup and layout.
- The core lifecycle is count, estimate, measure, render.
- `estimateSize` should be stable; for dynamically measured rows, TanStack recommends estimating the largest comfortable item size so initial positions are more accurate.
- `getItemKey` should return stable persistent identifiers, not indexes, whenever possible.
- `overscan` trades render cost for fewer blank edges during fast scroll.
- `measureElement` supports dynamic row heights.
- `rangeExtractor` can keep extra indexes mounted, useful for sticky or sentinel rows.
- `scrollMargin` is needed when the virtualizer is offset by headers or multiple virtualizers share a scroll context.
- React adapter `useVirtualizer` works with an element scroll container; `useWindowVirtualizer` works with the browser window.
- React 19 may need `useFlushSync: false` if sync scrolling causes React warnings or performance problems.

## Strategic choice

Plan shared Tree virtualization and EMC virtualization as implementation tracks behind default-off flags. Browser evidence is still required before default-on rollout. The center row-table body route remains a distinct sub-track inside EMC because table/focus semantics carry higher correctness risk than branch-section windowing.
