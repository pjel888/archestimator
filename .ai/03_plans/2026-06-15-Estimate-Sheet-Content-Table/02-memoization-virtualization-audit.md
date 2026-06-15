# Estimate Sheet — Memoization + Virtualization Audit

**Date:** 2026-06-15
**Scope:** How the existing memoization + virtualization machinery in
`EstimateSheetContent` and its row stack behaves today, and where injecting a
**shared, user-resizable column width synced across all node groups** would
cause re-render storms, virtualizer thrash, or identity breakage.
**Status:** Audit only — no source changes proposed here; this feeds the
migration plan.

> TL;DR: there are **two independent, nested virtualizers** (branch list ↔ row
> table), every group renders its **own row table instance**, and the entire
> render-relief strategy hangs on **referential identity** of node trees +
> callbacks. A naive `columnSizing` state that updates on every drag mousemove
> and is threaded as a React prop will defeat every memo guard for **every
> group at once** on every animation frame. The single highest-risk interaction
> is the width value changing identity during a live drag while N row tables are
> mounted. A CSS-variable-on-a-common-ancestor approach can sidestep React
> re-renders entirely — details in §5.

---

## 0. Component / data topology

```
EstimateSheetContent (host, ~2851 lines)
  └─ [data-estimate-pointer-surface] scroll container   (EstimateSheetContent.tsx:2705-2707)
       └─ EstimateSheetVirtualBranchList                 (virtual-branch-list.tsx)
            ── OUTER VIRTUALIZER: flattened visible branches (one entry per node)
            └─ EstimateSheetBranch  (memo)               (branch.tsx:461)
                 └─ EstimateRowItemsTable (memo)         (row-table.tsx:461)
                      ── INNER VIRTUALIZER: rows within THIS node
                      └─ EstimateRowItemTableRow (memo)   (row-table.tsx:146)
                           └─ EstimateMaterialCell + cells (cells.tsx)
```

Key structural fact for column-width sync: **each node group owns a separate
`EstimateRowItemsTable`**, which owns a separate `useVirtualizer`. There is no
single table spanning all groups. A "shared column width" is therefore shared
*state that must reach N independent memoized subtrees* — exactly the population
the memo guards exist to protect.

The grid that defines the columns today is a **static Tailwind class**, not a
table-layout or `<colgroup>`:

```ts
const ROW_COLUMNS = "grid-cols-[36px_32px_minmax(160px,1fr)_58px_92px_106px_92px_108px_30px]";
```
`row-table.tsx:96`, applied to each `<tr>` at `row-table.tsx:243` and the
`<thead>` row at `row-table.tsx:626`. Rows are CSS-grid `<tr>`s, not real table
cells. There is **no `table-fixed`, no `<colgroup>`, no per-column width state**
in the estimate sheet today.

---

## 1. Virtualization layers (precise)

### 1.1 OUTER virtualizer — branch / section list
`virtual-branch-list.tsx`

- Instantiated at `virtual-branch-list.tsx:95` (`branchVirtualizer = useVirtualizer({...})`).
- `count`: `branches.length` — the flattened list of visible nodes produced by
  `flattenVisibleBranches` (`virtual-branch-list.tsx:44-72`, memoized at `:80-92`).
- **Fixed estimate, dynamic measurement:** `estimateSize: () => 192`
  (`:98`, default `estimateSectionHeight`), but each rendered branch wrapper is
  wired to `ref={branchVirtualizer.measureElement}` (`:143`) — so actual section
  heights ARE re-measured by a `ResizeObserver` (TanStack Virtual v3 dynamic
  measurement). A node's true height varies wildly (rows + child areas +
  drop zones), so this virtualizer relies on dynamic measurement, not the 192
  estimate.
- Scroll container: resolved lazily via `getScrollElement: () => findScrollParent(rootRef.current)` (`:97`, `findScrollParent` at `:34-42`). This walks up to the nearest `overflow: auto/scroll/overlay` ancestor — i.e. the `[data-estimate-pointer-surface]` div at `EstimateSheetContent.tsx:2705`.
- Activation gate: `virtualEnabled = enabled && branches.length >= minSections (80)` (`:93`). Below 80 visible nodes it short-circuits to a plain `<EstimateSheetBranch {...branchProps} />` with NO virtualizer (`:125`).
- `useFlushSync: false` (`:102`), `overscan: 5` (`:99`).
- SSR/first-paint shim: `renderedVirtualBranches` synthesizes a placeholder window when `getVirtualItems()` is empty (`:109-123`).

### 1.2 INNER virtualizer — rows within one node
`row-table.tsx`

- Instantiated at `row-table.tsx:494` (`rowVirtualizer = useVirtualizer({...})`), once **per mounted `EstimateRowItemsTable`** (i.e. per group).
- `count`: `items.length` (`:495`).
- **Fixed row height, NOT dynamically measured:** `estimateSize: () => virtualization.estimateRowHeight ?? 96` (`:497`). Crucially, there is **no `measureElement` ref on the rows** — rows are positioned absolutely via `transform: translateY(virtualRow.start - scrollMargin)` with a hard-coded estimate (`:692-698`). Row height is treated as a **constant 96px**. The `<tr>` enforces this with `min-h-24` (96px) and `[contain-intrinsic-size:96px] [content-visibility:auto]` (`:240-241`).
- Scroll container: `getScrollElement: () => findScrollParent(scrollRootRef.current)` (`:496`, `findScrollParent` at `:108-116`) — resolves to the SAME `[data-estimate-pointer-surface]` scroller as the outer virtualizer. **Both virtualizers share one scroll element.**
- `scrollMargin` (`:488`, `:501`) is measured against that shared scroller so the inner virtualizer knows its offset within the outer scroll space (`:541-577`). This is the glue that lets two virtualizers cooperate inside one scroller.
- Activation gate: `virtualEnabled = !hasActiveExpressEditor && enabled && items.length >= minRows (75)` (`:493`). A group with <75 rows renders all rows un-virtualized (`:662`).
- Express-editor escape hatch: when an inline express editor is focused, virtualization is **fully disabled** for that table (`:492-493`, telemetry at `:522-529`) so the focused input is never unmounted.
- Inner default overscan is 6 (`row-table.tsx:498`), distinct from the outer branch virtualizer's overscan 5.

### 1.3 Does column width affect measured row height? (the load-bearing question)

- **Inner (row) virtualizer: NO — by design, today.** Row height is a fixed 96px estimate with no `measureElement`. Cell content is clamped: the material cell truncates (`cells.tsx:133`, `:137` use `truncate`), description uses `truncate` / fixed `rows={2}` textarea, numeric cells are single-line. So narrowing a column does NOT currently change row height, because text wraps are suppressed and the row is pinned to `min-h-24`. **This is the property that makes the current fixed-height virtualization safe, and it must be preserved by any resizable-column design.**
- **Outer (branch) virtualizer: YES, indirectly.** It DOES use `measureElement` (`:143`). If a column resize changed any row's rendered height, the section height changes, the `ResizeObserver` fires, and the outer virtualizer re-measures and re-lays-out — even though row height is "fixed," the branch wrapper measures the table's real DOM height. So any design that lets content reflow taller on narrow columns leaks into outer-virtualizer thrash.

**Implication:** a resizable Materials column that re-enables wrapping (e.g. `minmax` shrinking below the truncation point and letting the description wrap) would break the inner virtualizer's fixed-height assumption (`row-table.tsx:497`, `:692-698` use a constant), producing mis-positioned absolute rows AND outer re-measure churn. Keep cells single-line / fixed-height, or switch the inner virtualizer to dynamic `measureElement` (a much larger change).

---

## 2. Memoization strategy (what protects whom, and how it breaks)

Three `React.memo` layers, each with a hand-written comparator that is
**identity-first**:

### 2.1 `EstimateSheetBranch` — `areEstimateSheetBranchPropsEqual`
`branch.tsx:107-149`, memo at `:461`.

- Bails to re-render if ANY of: `node`, `nodeCode`, `depth`, `siblingIndex`, `renderChildBranches`, or **any callback prop** changes identity (`:108-135`). All 16 callback props are compared by reference.
- `ancestorPath` compared structurally (`areAncestorPathsEqual`, `:81-88`).
- `nodeTotals` compared by the node's own total only (`:137-139`).
- Row-state check is **gated** (`:141-148`): only walks rows when `editableRows`/`selectedRowIds` identity changed; then `branchRowStateChanged` (`:90-105`) compares per-row `editableRows[id]` / `selectedRowIds.has(id)` so a keystroke in node A doesn't re-render node B.

### 2.2 `EstimateRowItemsTable` — `areEstimateRowItemsTablePropsEqual`
`row-table.tsx:66-94`, memo at `:461`/`:706`.

- Bails if `items`, `targetNodeId`, or **any of ~14 callbacks** change identity, **or `virtualization` changes identity** (`:67-86`). Note `virtualization` is compared by reference (`:85`).
- Per-row slice: `editableRows[id]` and `selectedRowIds.has(id)` (`:89-92`).
- Comment at `:62-65` is explicit: callbacks MUST be identity-stable or every table re-renders.

### 2.3 `EstimateRowItemTableRow`
`row-table.tsx:146` — plain `memo` (default shallow prop compare). Re-renders only when its own props change (its `item`, `editableRow`, `selected`, `activeCellIndex`, `style`, callbacks). `computedItem` is `useMemo`'d on `[editableRow, isInlineEditableComponentRow, item]` (`:175-212`).

### 2.4 What keeps prop identity stable today
- **`useStableCallback`** (`use-stable-callback.ts:8-16`): wraps a handler so the returned function identity is constant for the component's lifetime while always invoking the latest closure (via `useInsertionEffect` + ref). Every mutation handler reaching the rows is wrapped — `markRowDirty` (`EstimateSheetContent.tsx:1066`), `commitRowItemUpdate` (`:1776`), `updateRowItem` (`:1835`), `insertLibraryItem` (`:1934`), `replaceRowItem` (`:2286`), `clearRowComponent` (`:2329`), `requestProjectSpecific` (`:2380`), `moveRowComponent` (`:2406`), `deleteRowItem` (`:2417`), express handlers (`:1858-1934`), etc. This is what lets the comparators use cheap reference equality on callbacks.
- **`displayedSheetNode` identity preservation** (`EstimateSheetContent.tsx:1272-1281`, design note `:707-716`, `:1266-1271`): the transform pipeline is designed to return the **same node reference** when inactive, so when no transform is active, `displayedSheetNode === selectedNode` and the whole memoized branch tree sees stable props.
- **`EMPTY_*` constants** to avoid fresh-array/object identity churn: `EMPTY_ESTIMATE_ROW_ITEMS` (`constants.ts:7`, explicitly "a fresh [] per render would defeat the table's memo comparator"), `EMPTY_NODE_TOTALS` (`EstimateSheetContent.tsx:675`), `EMPTY_COLLAPSED_NODE_IDS` (`:674`), `EMPTY_SHEET_FACETS` (`:726`), `EMPTY_SELECTED_NODE_PRESENTATION` (`:170`), etc.
- **The `virtualization` prop** is a module-level frozen constant (`WORKSHOP_ESTIMATE_ROW_VIRTUALIZATION` in `virtualization-flags.ts:37-44`), so its reference is stable across renders — which is why the comparator can `!==` it cheaply (`row-table.tsx:85`).

### 2.5 How shared `columnSizing` blows through ALL of this
The branch tree is rendered once at `EstimateSheetContent.tsx:2712-2737` with a
flat list of props; **every group reads the same prop set**. If a shared
`columnSizing` (or `columnWidths`, or a derived grid-template string) is added
as a NEW prop and threaded `EstimateSheetVirtualBranchList → EstimateSheetBranch
→ EstimateRowItemsTable → EstimateRowItemTableRow`:

1. The comparators do not currently mention it, so **either** it is ignored
   (stale columns — wrong) **or** it must be added to every comparator (`branch.tsx:108`, `row-table.tsx:67`, and the default shallow compare on the row).
2. Once it is in the comparators, **every change of its identity re-renders
   every branch, every row table, and every visible row** — because it is a
   genuinely shared prop, not a per-node slice. The per-row slicing in
   `branchRowStateChanged` / the comparator loops cannot save you: column width
   is not row-scoped.
3. With `columnResizeMode: "onChange"` (the mode the sibling `ProjectEstimatesTable` already uses — `ProjectEstimatesTable.tsx:1041`), TanStack Table updates `columnSizing`/`columnSizingInfo` on **every mousemove during a drag** (many times per second). Each update is a new state value → new prop identity → full re-render of every mounted group + its visible rows, ~60×/sec, for the duration of the drag. That is the re-render storm.
4. Because both virtualizers share one scroll element and the outer one uses `measureElement`, a full re-render cascade during drag can also trigger `ResizeObserver` re-measures (`virtual-branch-list.tsx:143`) and `scrollMargin` recomputation (`row-table.tsx:541-577`) → virtualizer thrash on top of the React churn.

---

## 3. Render-probe instrumentation (regression measurement)

`estimate-sheet-render-probe.ts` is a set of injectable, null-by-default render
counters (production pays a single null check, per the file header `:1-2`):

| Probe setter | Reporter (call site) | Counts |
|---|---|---|
| `setEstimateSheetContentRenderProbe` (`:77`) | `reportEstimateSheetContentRender()` (`:81`), called at `EstimateSheetContent.tsx:1060` | host re-renders |
| `setEstimateSheetBranchRenderProbe` (`:35`) | `reportEstimateSheetBranchRender(nodeId)` (`:39`), called at `branch.tsx:152` | per-node branch renders |
| `setEstimateSheetRenderProbe` (`:19`) | `reportEstimateRowItemsTableRender(nodeId)` (`:23`), called at `row-table.tsx:483` | per-node row-TABLE renders |
| `setEstimateRowItemRenderProbe` (`:27`) | `reportEstimateRowItemRender(rowId)` (`:31`), called at `row-table.tsx:173` | per-ROW renders |
| node-total / proposal-signature / selected-node probes (`:43-73`) | various | recompute counts for the heavy memos |

**How to use it for the migration:** before touching anything, write a perf
regression test (the existing virtualization activation tests already exercise
this stack) that mounts a sheet with many groups/rows, installs the row +
table + branch probes, performs a simulated column-resize drag, and asserts the
**per-row** and **per-table** render counts stay flat (ideally 0 row re-renders
during an `onChange` drag if a CSS-variable approach is used; bounded if not).
This is the objective gate that distinguishes "columns resize" from "columns
resize and re-render 5,000 rows 60×/sec." The same probes let you A/B the
`onChange` vs `onEnd` mode and the React-prop vs CSS-variable approach.

---

## 4. Existing drag interactions (conflict surface)

Three drag systems already run on this surface; a column-resize drag must
coexist with all of them.

- **Edge auto-scroll during drag** — `use-drag-edge-autoscroll.ts`. Attached only by the depth-0 branch (`branch.tsx:154-157`). It listens on the `[data-estimate-pointer-surface]` scroller (`use-drag-edge-autoscroll.ts:50`) for `dragover`/`dragend`/`drop` and runs a rAF scroll loop (`:56-83`). It keys off the **HTML5 drag** event stream (`DragEvent`), not pointer/mouse events.
- **Component / template drag-drop** — native HTML5 DnD: row move + library insert (`cells.tsx:404-442`, `row-table.tsx:601-614`), template drops (`branch.tsx:200-252`), drop zones (`drop-zones`). All driven by `dragstart`/`dragover`/`drop`.
- **Row reorder:** explicitly NOT implemented (note at `row-table.tsx:253-255`).

**Conflict assessment with column-resize drag:** The sibling table's resize
handle uses **`mousedown`/`touchstart`** (`ProjectEstimatesTable.tsx:737-738`,
`header.getResizeHandler()`), i.e. the **pointer/mouse** event channel — a
*different channel* from the HTML5 `drag*` events that auto-scroll and DnD use.
So they do not directly fire on the same listeners. Real risks are subtler:
1. A resize handle placed in the sticky header (`branch.tsx:282`) could swallow `mousedown` that the user meant for something else, or its `mousemove` capture during resize could fight scroll if the resize loop also scrolls.
2. The resize handle must be `draggable={false}` / `stopPropagation` so a `mousedown` on it never initiates a native HTML5 drag of the surrounding draggable component grip (`cells.tsx:514` has `draggable` on the move handle).
3. Each group has its own sticky header today (the design pins ONLY depth-0, `branch.tsx:176-177`). If the resize handle lives in headers, decide whether every group's header gets a handle (N handles editing one shared width — confusing) or only one canonical header does.

---

## 5. Risk register

Severity: **Critical** = breaks correctness or makes the sheet unusable during
interaction; **High** = visible jank / perf regression at realistic scale;
**Medium** = correctness/edge issue, bounded blast radius.

| # | Hazard | Mechanism of failure | Severity | Mitigation direction |
|---|---|---|---|---|
| 1 | **Drag-time re-render storm across all groups** | Shared `columnSizing` as a React prop + `columnResizeMode: "onChange"` (`ProjectEstimatesTable.tsx:1041`) → new prop identity ~60×/sec during drag → defeats `areEstimateSheetBranchPropsEqual` (`branch.tsx:107`) and `areEstimateRowItemsTablePropsEqual` (`row-table.tsx:66`) for **every** mounted group + visible row simultaneously. | **Critical** | Do NOT thread width as a React prop. Apply width as a **CSS custom property on the common ancestor** (`[data-estimate-pointer-surface]` or the branch-list root) and have `ROW_COLUMNS` read `var(--est-col-material, …)` etc. The drag mutates `element.style.setProperty(...)` (or a ref-held DOM node), so React never re-renders. See §5.1. |
| 2 | **Inner virtualizer mis-positions rows if row height changes** | Inner virtualizer assumes fixed 96px (`row-table.tsx:497`, absolute `translateY` at `:692-698`, no `measureElement`). A narrower Materials column that re-enables text wrapping makes rows taller → absolute offsets drift, rows overlap. | **Critical** | Keep cells single-line / fixed `min-h-24` (`row-table.tsx:240`) and truncating (`cells.tsx:133/137`) regardless of column width — i.e. resize changes width only, never height. If wrapping is required, the inner virtualizer must switch to dynamic `measureElement` (large change, separate risk). |
| 3 | **Outer virtualizer re-measure churn** | Outer branch virtualizer uses `measureElement` (`virtual-branch-list.tsx:143`). Any resize-induced height change or full subtree re-render triggers `ResizeObserver` re-measure + re-layout across visible branches. | **High** | Same as #1/#2 — keep heights constant under resize, and avoid re-rendering branch subtrees during drag (CSS-var approach makes the DOM mutation invisible to the observer's height calc). |
| 4 | **`scrollMargin` recompute thrash** | `scrollMargin` effect (`row-table.tsx:541-577`) observes the table root + scroller via `ResizeObserver` and recomputes on every resize. Width changes that reflow the table fire it per group. | **High** | CSS-var width keeps total table width policy stable (use `table`/grid that fills container, not content-sized); avoid horizontal-scroll growth that moves the table's top. |
| 5 | **Header ↔ body column drift** | The grid template is duplicated: `<thead>` row (`row-table.tsx:626`) and each `<tr>` (`:243`) both apply `ROW_COLUMNS`. A resizable design must update BOTH from the same source or header and cells misalign. With per-group tables, all N theads + all rows must read one shared source. | **High** | Single source of truth = CSS variables on a common ancestor; every `ROW_COLUMNS` consumer reads the same vars. No per-component width prop. |
| 6 | **Comparators silently ignore width** | If width is added as a prop but NOT added to `areEstimateSheetBranchPropsEqual` / `areEstimateRowItemsTablePropsEqual`, memoized groups keep stale columns until some other prop changes. | **High** | Avoid the prop entirely (CSS var). If a prop is unavoidable, it forces #1's storm — so the CSS-var route also resolves this. |
| 7 | **Express-editor virtualization flip during resize** | Focusing an express editor disables that table's virtualizer (`row-table.tsx:492-493`); a width change mid-edit that re-renders could interact with the focused-input/unmount logic. | **Medium** | CSS-var width never re-renders the table, so the focused editor is untouched. Keep resize out of the React commit path. |
| 8 | **Drag-channel / event conflicts** | Resize handle uses `mousedown`/`touchstart` (`ProjectEstimatesTable.tsx:737-738`); the surface also runs HTML5 `drag*` auto-scroll (`use-drag-edge-autoscroll.ts`) and component/template DnD. A handle inside a draggable region could start a native drag. | **Medium** | `stopPropagation` + `draggable={false}` on the handle; place it so it doesn't overlap the component drag grip (`cells.tsx:514`). Resize never preventDefaults the `drag*` stream. |
| 9 | **Persistence write storm** | Sibling table writes columnSizing to `localStorage` in an effect on every `columnSizing` change (`ProjectEstimatesTable.tsx:799-801`). With `onChange` that fires per mousemove. | **Medium** | Persist on **resize end** only (mouseup), or debounce. Decouple persistence from the live drag value. |
| 10 | **Two-virtualizer coordinate desync** | Both virtualizers share one scroll element (`virtual-branch-list.tsx:97`, `row-table.tsx:496`) and the inner one offsets by `scrollMargin`. A resize that changes layout height mid-drag can desync inner `translateY` from outer measured positions for a frame. | **Medium** | Keep heights invariant under resize (#2); width-only changes don't move vertical geometry. |

### 5.1 Can a CSS-variable approach sidestep React re-renders entirely? — Yes.

The decisive property: **column width here is purely presentational and does not
change vertical geometry** (given cells stay single-line / fixed-height). That
makes it a perfect fit for the CSS-custom-property escape hatch:

- Store the shared widths in a CSS variable set on a **single common ancestor**
  that is an ancestor of every group's table — the `[data-estimate-pointer-surface]`
  scroller (`EstimateSheetContent.tsx:2705`) or the branch-list root
  (`virtual-branch-list.tsx:129-135`).
- Rewrite `ROW_COLUMNS` (`row-table.tsx:96`) to a `grid-template-columns` that
  reads `var(--est-col-quantity)`, `var(--est-col-material)`, etc., with the static
  pixel values as fallbacks. Both the `<thead>` row (`:626`) and the `<tr>`
  (`:243`) inherit the same variables automatically — solving #5 for free, for
  all N groups, with one write.
- During a drag, update widths by calling `ancestor.style.setProperty('--est-col-material', '${px}px')` from the resize handler (a ref to the ancestor, mutated outside React). **React state is never touched, so no component re-renders, no comparator runs, no virtualizer re-measure, no `scrollMargin` recompute.** The browser does a cheap style/layout pass only.
- Commit the final value to React state + `localStorage` **once on mouseup**
  (resolves #9), so the persisted/canonical value lives in state but the
  high-frequency live value lives in the DOM.

This is strictly better than the sibling `ProjectEstimatesTable` model, which can
afford `onChange` + per-frame React updates only because it is a **single,
small, non-virtualized table** (`ProjectEstimatesTable.tsx:1073` `table-fixed`,
inline `width` per `<col>`/`<th>` at `:102`/`:1086`). The estimate sheet has the
opposite shape (many virtualized tables sharing one scroller), so the per-frame
React path that is fine there is the Critical hazard here.

**Caveat that keeps even the CSS-var path honest:** the approach only fully
sidesteps re-renders **if and only if** Hazard #2 holds — column width must not
change row height. If product wants the Materials column to wrap when narrowed,
heights become width-dependent, the inner virtualizer's fixed-height assumption
(`row-table.tsx:497`) breaks, and you are back to needing dynamic measurement
regardless of how width is plumbed. So the first design decision is not
"how do we plumb width" but **"does resizing ever change row height?"** Lock that
to "no" and the CSS-variable approach makes the whole feature nearly free at the
React layer.

---

## 6. Appendix — exact citations index

- Two virtualizers: `virtual-branch-list.tsx:95` (outer), `row-table.tsx:494` (inner).
- Shared scroller resolution: `virtual-branch-list.tsx:97` + `row-table.tsx:496`, both via `findScrollParent`; surface marker `EstimateSheetContent.tsx:2705-2707`.
- Fixed row height (no measureElement on rows): `row-table.tsx:497`, `:692-698`, `:240-241`.
- Dynamic branch measurement: `virtual-branch-list.tsx:143`.
- `scrollMargin` glue: `row-table.tsx:488`, `:501`, `:541-577`.
- Memo comparators: `branch.tsx:107-149` / `:461`; `row-table.tsx:66-94` / `:461`; row memo `row-table.tsx:146`.
- Identity-stable callbacks: `use-stable-callback.ts:8-16`; usages `EstimateSheetContent.tsx:1066, 1776, 1835, 1934, 2286, 2329, 2380, 2406, 2417`.
- Node-tree identity preservation: `EstimateSheetContent.tsx:1272-1281`, design notes `:707-716`, `:1266-1271`; `EMPTY_*` constants `constants.ts:7`, `EstimateSheetContent.tsx:170, 674-675, 726`.
- Grid template (single source today): `row-table.tsx:96`, applied `:243` + `:626`.
- Render probes: `estimate-sheet-render-probe.ts:19-83`; call sites `EstimateSheetContent.tsx:1060`, `branch.tsx:152`, `row-table.tsx:173, 483`.
- Drag systems: `use-drag-edge-autoscroll.ts` (whole file), `branch.tsx:154-157, 200-252`, `cells.tsx:404-442, 514`, `row-table.tsx:601-614`.
- Existing TanStack Table precedent (different shape): `ProjectEstimatesTable.tsx:1041` (`onChange`), `:737-738` (resize handler events), `:102`/`:1086` (inline width), `:757`/`:799-801` (state + localStorage).
- Package versions: `@tanstack/react-table ^8.21.3`, `@tanstack/react-virtual ^3.14.2`.
