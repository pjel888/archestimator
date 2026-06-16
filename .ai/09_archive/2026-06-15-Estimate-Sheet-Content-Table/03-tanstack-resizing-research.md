# TanStack Table v8 — Resizable Columns in a Virtualized, Multi-Instance, CSS-Grid Layout

**Research document — planning only. Do not modify app code based on this alone.**

- Date: 2026-06-15
- Author role: Research (Claude)
- Scope: User-resizable columns with `@tanstack/react-table` v8 where (a) layout is CSS Grid rows, not `<table>`; (b) rows are virtualized with `@tanstack/react-virtual`; (c) **multiple independent "node group" table instances share ONE column-width model** so a resize in any group applies to all.
- Installed versions (from `package.json`): `@tanstack/react-table ^8.21.3`, `@tanstack/react-virtual ^3.14.2`, `zustand 5`.

## TL;DR Recommended Architecture

1. **Use TanStack as research guidance, not as the final state topology.** The generic TanStack pattern is controlled `columnSizing` plus CSS variables. For Archestimator, the canonical path is the reconciled plan in `06`: live drag writes CSS variables on `[data-estimate-pointer-surface]`; a shared store receives the committed width set only on drag end.
2. **CSS-variable resize pattern (official "performant" recipe)** — compute or build a `columnSizeVars` map once at the shared surface, and read widths via project-scoped vars such as `var(--est-col-<id>)` / `calc(var(--est-col-<id>-size) * 1px)`. Dragging mutates only CSS variables → no per-cell React re-render.
3. **Grid layout fed by the same sizes** — set `grid-template-columns` from the shared column sizes (one source of truth) so the headless sizing model drives a CSS-Grid layout instead of an HTML `<table>`.
4. **Virtualize rows per group with react-virtual** — column resize and row virtualization are orthogonal; the only coupling is row-height re-measurement when a resize changes wrapping.

### Archestimator reconciliation note

Sections below describe the generic TanStack v8 approach. Where they mention
`columnResizeMode: "onChange"`, controlled `columnSizing`, or a shared Zustand
store feeding every table during drag, treat that as background research. The
project-specific implementation plan is stricter:

- live pointer movement must not update React state or a subscribed store;
- the shared scroll surface owns `--est-col-*` CSS variables and broadcasts by CSS
  inheritance;
- the committed width store is written once on pointer-up / keyboard commit;
- `06-recommendation-and-migration-plan.md`, `08-execution-and-traceability.md`, and `09-performance-measurement-plan.md` govern when this research conflicts with the final handoff.

---

## 1. Column Sizing API (v8) — exact shapes

TanStack Table is headless: it owns the *numbers*, you own the *DOM*. ([Column Sizing Guide](https://tanstack.com/table/v8/docs/guide/column-sizing), [Column Sizing API](https://tanstack.com/table/v8/docs/api/features/column-sizing))

### State shapes (what you lift/share)

```ts
// columnSizing
type ColumnSizingState = Record<string, number> // columnId -> width(px)

// columnSizingInfo (live drag metadata)
interface ColumnSizingInfoState {
  startOffset: number | null
  startSize: number | null
  deltaOffset: number | null
  deltaPercentage: number | null
  isResizingColumn: string | false   // columnId currently being dragged, else false
  columnSizingStart: [string, number][]
}
```

### Defaults (`defaultColumnSizing`)

```ts
const defaultColumnSizing = {
  size: 150,
  minSize: 20,
  maxSize: Number.MAX_SAFE_INTEGER,
}
```

Override per-table via `defaultColumn` (the official performant example uses `{ minSize: 60, maxSize: 800 }`) or per-column via the column def's `size` / `minSize` / `maxSize`.

### Options

- `enableColumnResizing: boolean` — turn resizing on.
- `columnResizeMode: 'onChange' | 'onEnd'` — **`onEnd` is the default.** `onChange` updates `columnSizing` on every mouse-move (needed for live drag feedback). With the CSS-variable pattern you can safely use `onChange` and still hit ~60fps.
- `columnResizeDirection: 'ltr' | 'rtl'` — default `ltr`.
- `onColumnSizingChange` / `onColumnSizingInfoChange` — controlled-state callbacks; **these are the hooks for sharing state across instances.**

### Read / write helpers

- `header.getSize()`, `column.getSize()`, `cell.column.getSize()` — current width. **Do NOT call per cell in render** (see §2).
- `header.getResizeHandler()` — `() => (event) => void`; wire to `onMouseDown` / `onTouchStart` of a drag handle element.
- `header.column.getIsResizing()` — boolean for styling the active handle.
- `table.getState().columnSizingInfo.deltaOffset` — for a "ghost" resize indicator line.
- `column.resetSize()`, `table.resetColumnSizing(defaultState?)`, `table.setColumnSizing(updater)`, `table.getTotalSize()` (sum of leaf columns).

---

## 2. THE performance pattern: CSS variables + memoized body (CENTRAL)

This is the official answer to "dragging re-renders every cell." Source: [React Column Resizing Performant example](https://tanstack.com/table/v8/docs/framework/react/examples/column-resizing-performant) and the [guide's Advanced Column Resizing Performance section](https://tanstack.com/table/v8/docs/guide/column-sizing). Three rules from the guide, quoted:

> 1. "Don't use `column.getSize()` on every header and every data cell. Instead, calculate all column widths once upfront, **memoized**!"
> 2. "Memoize your Table Body while resizing is in progress."
> 3. "Use CSS variables to communicate column widths to your table cells."

### Mechanism (verbatim from the canonical example)

**(a) Build the CSS-variable map once, memoized on the sizing state only:**

```tsx
const columnSizeVars = React.useMemo(() => {
  const headers = table.getFlatHeaders()
  const colSizes: { [key: string]: number } = {}
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i]!
    colSizes[`--header-${header.id}-size`] = header.getSize()
    colSizes[`--est-col-${header.column.id}-size`] = header.column.getSize()
  }
  return colSizes
}, [table.getState().columnSizingInfo, table.getState().columnSizing])
```

The dep array is **only** `columnSizingInfo` + `columnSizing`. So during a drag the map recomputes, but nothing else in the subtree needs new props.

**(b) Spread the vars onto the container, set total width:**

```tsx
<div
  className="divTable"
  style={{
    ...columnSizeVars,
    width: table.getTotalSize(),
  }}
>
```

**(c) Cells/headers read width from the variable — never call `getSize()` in the cell:**

```tsx
// header
style={{ width: `calc(var(--header-${header.id}-size) * 1px)` }}
// cell
style={{ width: `calc(var(--est-col-${cell.column.id}-size) * 1px)` }}
```

When the variable changes, the browser re-lays-out via CSS; React does not re-render the cells.

**(d) Memoize the body during an active drag** so even the variable-map prop change doesn't reconcile thousands of rows:

```tsx
export const MemoizedTableBody = React.memo(
  TableBody,
  (prev, next) => prev.table.options.data === next.table.options.data,
) as typeof TableBody

// render switch:
{table.getState().columnSizingInfo.isResizingColumn ? (
  <MemoizedTableBody table={table} />
) : (
  <TableBody table={table} />
)}
```

The comparator returns `true` (skip re-render) unless the underlying `data` reference changes — so while `isResizingColumn` is truthy, the body is frozen at the React level and only CSS variables move.

> Note for our virtualized case: the `MemoizedTableBody` trick matters less because react-virtual already keeps the rendered row count tiny (only on-screen rows exist in the DOM). The **CSS-variable mechanism is the load-bearing part** for us; the memoized body is a smaller, optional win.

---

## 3. Headless table driving CSS Grid (no `<table>`)

Fully supported and common — the official "performant" example itself uses `div`s (`.divTable`, `.tr`, `.td`), not a `<table>`. Table v8 only produces numbers + handlers; the DOM is yours.

Two ways to apply the shared sizes to a CSS-Grid row layout:

**Option A — per-cell `width` via the CSS variable (matches the official example, works with `display: grid` or `flex` rows).** Each cell sets `width: calc(var(--est-col-<id>-size) * 1px)`.

**Option B — `grid-template-columns` on the row/container from the same variables (more "grid-native"):**

```tsx
// container or each .tr
style={{
  ...columnSizeVars,
  display: 'grid',
  gridTemplateColumns: table
    .getVisibleLeafColumns()
    .map((c) => `calc(var(--est-col-${c.id}-size) * 1px)`)
    .join(' '),
}}
```

This keeps a single source of truth (`columnSizeVars`) and lets the grid place children automatically. Build the `gridTemplateColumns` string in the same `useMemo` to avoid per-render string concatenation.

**Gotchas:**
- Use `box-sizing: border-box` so padding/border don't desync from the table's width math.
- Header grid and body grid must use the **identical** column list/order; mismatched `grid-template-columns` between header and rows is the #1 alignment bug.
- `minmax()`/`fr` units fight the table's pixel model — keep tracks in `px` (`calc(var(...) * 1px)`) so the table stays the source of truth. If you want a flexible last column, do it deliberately and accept that `getTotalSize()` won't match rendered width.
- Sticky header: a separate sticky grid row that shares `columnSizeVars` works; ensure it reads the same vars container scope.

---

## 4. Resizing + react-virtual row virtualization

Column resizing and row virtualization are **independent** and compose cleanly. Resizing changes *column widths* (horizontal); virtualization manages *which rows exist* (vertical). The official [Virtualized Rows example](https://tanstack.com/table/v8/docs/framework/react/examples/virtualized-rows) + the performant resizing recipe are combined in practice.

Standard virtualization wiring ([Virtualizer API](https://tanstack.com/virtual/v3/docs/api/virtualizer)):

```tsx
const rows = table.getRowModel().rows
const rowVirtualizer = useVirtualizer({
  count: rows.length,
  getScrollElement: () => scrollRef.current,
  estimateSize: () => 40,        // estimated row height
  overscan: 8,
  measureElement: el => el?.getBoundingClientRect().height, // dynamic heights
})

<div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
  {rowVirtualizer.getVirtualItems().map(vi => {
    const row = rows[vi.index]
    return (
      <div
        key={row.id}
        data-index={vi.index}
        ref={rowVirtualizer.measureElement}
        style={{
          position: 'absolute',
          transform: `translateY(${vi.start}px)`,
          width: '100%',
          display: 'grid',
          gridTemplateColumns: /* from columnSizeVars, see §3 */,
        }}
      >
        {row.getVisibleCells().map(cell => /* width via var(--est-col-id-size) */)}
      </div>
    )
  })}
</div>
```

**Coexistence notes:**
- Put `...columnSizeVars` on a stable ancestor of the virtual rows (e.g., the scroll container) so absolutely-positioned rows inherit the variables.
- **Row-height re-measurement on resize:** if narrowing a text column causes wrapping, row height changes. With `measureElement` + a stable `data-index`, react-virtual re-measures and repositions. To force re-measure after a resize ends, you can call `rowVirtualizer.measure()` (or remount-trigger) when `columnSizingInfo.isResizingColumn` flips back to `false`. Without re-measure you get the classic overlap/gap symptom (see §7).
- Keep `columnResizeMode: 'onChange'` for live feel; the CSS-variable path means mid-drag updates don't thrash the virtualizer (only widths move, row set is unchanged).
- The `MemoizedTableBody` switch (§2d) is largely redundant once virtualized — only ~visible rows render anyway.

---

## 5. Sharing ONE `columnSizing` across MULTIPLE table instances

This is the crux requirement: a drag in node-group A resizes columns in groups B, C, …

### Pattern: single zustand store as controlled state for every table

This is the generic TanStack pattern. For the estimate sheet, do **not** route
live drag through this store. Use a committed store for persisted widths and
ancestor CSS variables for live drag, as specified in `04`/`06`/`08`.

```ts
// store
type ColumnSizingStore = {
  columnSizing: ColumnSizingState
  setColumnSizing: (u: Updater<ColumnSizingState>) => void
}
export const useColumnSizingStore = create<ColumnSizingStore>((set) => ({
  columnSizing: {},
  setColumnSizing: (updater) =>
    set((s) => ({
      columnSizing:
        typeof updater === 'function' ? updater(s.columnSizing) : updater,
    })),
}))
```

```tsx
// in EVERY node-group table
const columnSizing = useColumnSizingStore(s => s.columnSizing)
const setColumnSizing = useColumnSizingStore(s => s.setColumnSizing)

const table = useReactTable({
  data: groupRows,
  columns,                       // SAME column defs / ids across all groups
  state: { columnSizing },       // controlled, shared
  onColumnSizingChange: setColumnSizing,
  columnResizeMode: 'onChange',
  enableColumnResizing: true,
  getCoreRowModel: getCoreRowModel(),
})
```

Because `state.columnSizing` is the same store slice for all instances, any `onColumnSizingChange` from one table updates the store → all tables re-derive their `columnSizeVars` → every group resizes together. This is acceptable as a conceptual proof of cross-instance sync, but it is **not** the recommended live-drag path for this repo because it can fan out React work across every mounted group.

### Caveats / design decisions

- **Column IDs must match across groups.** The state is keyed by `columnId`. Give columns explicit, stable `id`s shared by every group so a width keyed `"quantity"` applies everywhere. (Auto-generated ids from `accessorKey` are fine if identical across groups.)
- **`columnSizingInfo` — keep it LOCAL per table, not shared.** It is transient drag bookkeeping (`isResizingColumn`, `deltaOffset`). If you share it, every group will think it's mid-resize. Share `columnSizing` (the committed widths); let each table own its `columnSizingInfo`. This also means `isResizingColumn`-based UI (the active handle highlight) stays scoped to the group the user is actually dragging.
- **Who shows resize handles?** Two valid models:
  - *All groups show handles* (any group can initiate a resize) — most intuitive; each table wires `header.getResizeHandler()` normally. Works because the resulting width write fans out to all via the shared store.
  - *One "header" group owns handles* (e.g., a single sticky master header row), others are read-only — cleaner if you render one shared header above all groups. Then only that instance needs `getResizeHandler()`; bodies just read widths.
  - Recommendation: render **one shared header table instance** that owns the handles, and have node-group bodies be size-consumers. Avoids N draggable handle sets fighting and keeps the resize UX unambiguous.
- **Re-render fan-out:** with zustand selectors, only components subscribed to `columnSizing` re-run their `columnSizeVars` memo. During `onChange` drag that's all visible groups. For this repo that is the performance risk the final plan avoids: keep live preview in ancestor CSS variables and commit to the store on end.
- **Stable references:** select `columnSizing` and `setColumnSizing` separately (as above) so `setColumnSizing` keeps a stable identity and doesn't needlessly re-create the table options.

---

## 6. Persistence & reset

`columnSizing` is plain `Record<string, number>` JSON — trivial to persist.

- **localStorage:** use zustand `persist` middleware on the sizing store, or hydrate `columnSizing` from `localStorage` on mount and write on change (debounced; on `onEnd` if using live `onChange`).
- **Server:** persist the map per user/sheet; load into the store before first paint to avoid a width "pop." Treat absent keys as defaults (table falls back to `defaultColumn` sizes).
- **Reset:** `table.resetColumnSizing()` resets a single instance to initial; for the shared model, reset the **store** (`setColumnSizing({})`) so all groups revert together. `table.resetColumnSizing(true)` resets to the empty/default state. `column.resetSize()` resets one column.
- **Versioning:** if column ids change between releases, store a schema version alongside the map and drop incompatible persisted widths to avoid orphaned keys.

---

## 7. Known issues / community-discussed pitfalls

From official discussions and field reports:

1. **Row overlap/gaps when resize changes row height (virtualization).** With absolute-positioned virtual rows, if a column narrows and text wraps, measured height changes and unmeasured rows overlap. Fix: dynamic `measureElement` + stable `data-index`, and force `rowVirtualizer.measure()` after resize ends. ([Discussion #2913](https://github.com/TanStack/table/discussions/2913), and react-window/react-virtual absolute-positioning behavior.)
2. **No official "responsive virtualized + resizable" example.** The team has acknowledged the combination is non-trivial and not shipped as a single canonical sample; you compose the two recipes yourself. ([Discussion #2607 — Virtualized Table + Resizeable Columns](https://github.com/TanStack/table/discussions/2607), [Discussion #2913](https://github.com/TanStack/table/discussions/2913)).
3. **Calling `getSize()` per cell kills performance.** The most common mistake; mid-drag it re-runs sizing math for every cell every frame. Always go through the memoized `columnSizeVars` (§2).
4. **Header/body column-track desync.** Separate `grid-template-columns` definitions for header vs rows drift apart. Derive both from the same `columnSizeVars` / leaf-column list.
5. **`box-sizing` / padding drift.** Table width math is content-box-naive; without `border-box` the rendered total won't equal `getTotalSize()` and the last column "leaks."
6. **Sharing `columnSizingInfo` across instances** (our specific risk): makes every group appear to be resizing. Share only `columnSizing`.
7. **`onChange` write storms with many shared instances.** Each move writes the store and fans out; mitigate with `onEnd`, or local live-preview committed on mouse-up, or zustand selector scoping.
8. **Auto-size / fit-to-content is not built in.** v8 has no native "double-click to auto-fit"; you must measure content yourself and `setColumnSizing`. ([Discussion #4179 — Auto-size column width](https://github.com/TanStack/table/discussions/4179)).

---

## Sources

- [Column Sizing Guide — TanStack Table v8](https://tanstack.com/table/v8/docs/guide/column-sizing)
- [Column Sizing API — TanStack Table v8](https://tanstack.com/table/v8/docs/api/features/column-sizing)
- [React Column Resizing Performant example — TanStack Table](https://tanstack.com/table/latest/docs/framework/react/examples/column-resizing-performant) (canonical source: `examples/react/column-resizing-performant/src/main.tsx`)
- [React Virtualized Rows example — TanStack Table](https://tanstack.com/table/v8/docs/framework/react/examples/virtualized-rows)
- [Virtualizer API — TanStack Virtual v3](https://tanstack.com/virtual/v3/docs/api/virtualizer)
- [Discussion #2607 — Virtualized Table + Resizeable Columns](https://github.com/TanStack/table/discussions/2607)
- [Discussion #2913 — Virtualized + responsive + responsive columns](https://github.com/TanStack/table/discussions/2913)
- [Discussion #4179 — Auto-size column width v8](https://github.com/TanStack/table/discussions/4179)
