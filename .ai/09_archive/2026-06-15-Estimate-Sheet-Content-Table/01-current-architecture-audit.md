# Estimate Sheet — Current Row-Rendering Architecture Audit (As-Built)

**Date:** 2026-06-15
**Scope:** How `EstimateSheetContent` renders columnar estimate rows across multiple node groups today.
**Purpose:** Establish a faithful "as-built" baseline so a TanStack Table column-resize migration (resize synced across all node groups) can be planned against it.
**Status:** PLANNING / AUDIT ONLY — no source was modified.

---

## 0. TL;DR (decision-relevant)

- The column grid is **not** an HTML `<table>` layout engine. It is `display: grid` applied to `<tr>`/`<th>`/`<td>` elements via a Tailwind class (`grid` + `ROW_COLUMNS`). The native table semantics are tags only; layout is CSS Grid.
- The column-width definition is **ONE shared string constant** — `ROW_COLUMNS` (`row-table.tsx:96`) — but it is **applied at N+1 separate DOM sites *per rendered node group*** (1 header `<tr>` + 1 `<tr>` per body row), and there are **as many independent `<table>`/grid instances as there are visible nodes** (every node renders its own `EstimateRowItemsTable`).
- **Crux for resize-sync:** there is **no single grid that spans groups**. Each node group is a self-contained `<table>` with its own `<thead>` and its own column tracks. Today they line up *only because every instance hard-codes the identical `ROW_COLUMNS` string*. Nothing shares a live width value. To sync resized widths across groups you must broadcast widths to every node's table instance (e.g. a shared CSS variable on a common ancestor, or shared TanStack column-sizing state lifted to `EstimateSheetContent`).
- **How many grid instances need width-syncing?** = number of **visible (expanded, non-empty-filtered) nodes on screen**. Unbounded; one per node. Plus each node has its own non-sticky `<thead>` row.
- `@tanstack/react-table` v8.21.3 IS installed (`package.json:59`) but is **NOT used by the estimate sheet** — only by `ProjectEstimatesTable.tsx`. The sheet uses `@tanstack/react-virtual` only.
- **No existing resize affordance, no per-column width state, no CSS variables for columns.** Confirmed by grep — the only `resize` hits are a textarea's `resize-none` and scroll-margin `ResizeObserver`s.

---

## 1. The Column Model (the 9 grid tracks)

The single source of truth for column widths:

```
row-table.tsx:96
const ROW_COLUMNS = "grid-cols-[36px_32px_minmax(160px,1fr)_58px_92px_106px_92px_108px_30px]";
```

This is a Tailwind arbitrary-value `grid-template-columns`. It defines **9 tracks**. Both the header `<tr>` (`row-table.tsx:626`) and every body `<tr>` (`row-table.tsx:243`) receive this exact same class string, so header and body share an identical track definition *within one table*.

### Column-track mapping table

| Track # | Grid value | Fixed / Flexible | Semantic column | Header label (`<th>`) | Body cell renderer |
|--------:|------------|------------------|-----------------|------------------------|--------------------|
| 1 | `36px` | Fixed | Row-number gutter | `#` (`row-table.tsx:627`) | `String(rowIndex+1).padStart(2,"0")` (`:249-251`) |
| 2 | `32px` | Fixed | Selection checkbox | (header has select-all checkbox, no text) (`:628-642`) | `SelectionCheckbox` (`:252-267`) |
| 3 | `minmax(160px,1fr)` | **Flexible** (only flexible track) | Component / material name + card | `Materials` (`:643`) | `EstimateMaterialCell` (`:268-303`) — the rich card / express editor |
| 4 | `58px` | Fixed | Quantity (editable) + unit suffix | `Qty` (`:644`) | `ControlInput` number + `/ {unit}` (`:304-334`) |
| 5 | `92px` | Fixed | Subtotal (computed, read-only) | `Subtotal` (`:645`) | `pesoFormatter.format(subTotal)` (`:335`) |
| 6 | `106px` | Fixed | Adjustment (contingency mode dropdown + % input + value) | `Adjustment` (`:646`) | `DropdownSelect` + `ControlInput` % + value (`:336-395`) |
| 7 | `92px` | Fixed | Misc cost (editable) | `Misc Cost` (`:647`) | `MoneyInput` (`:396-421`) |
| 8 | `108px` | Fixed | Total item cost (computed, read-only) | `Total Item Cost` (`:648`) | `pesoFormatter.format(totalItemCosts)` (`:422-424`) |
| 9 | `30px` | Fixed | Row actions gutter | `aria-hidden` empty `<th>` (`:649`) | Details / Activity / Delete icon buttons stacked (`:425-456`) |

**Observations relevant to resize:**
- Only **track 3** (`minmax(160px,1fr)`) flexes; all 8 others are hard pixel widths. A naive "resize any column" feature must replace these pixel literals with state-driven widths.
- The data-cell keyboard navigation uses a *separate* indexing scheme: `data-estimate-cell-index` 0/1/2 maps to **Qty (track 4), Adjustment % (track 6), Misc (track 7)** only — the three editable numeric cells (`row-table.tsx:328, 384, 419`). This cell-index is unrelated to grid-track index and is load-bearing for arrow-key navigation (`cells.tsx:45-73`) and collaboration cursor anchoring (`EstimateSheetContent.tsx:842-843`). A migration must preserve `data-estimate-cell-index` semantics.

---

## 2. DOM Structure & Header/Body Alignment

### Layout primitive: CSS Grid over table tags

- Container: a `<div>` with `overflow-hidden border-x border-b` (`row-table.tsx:617-623`), tagged `data-estimate-row-table-root={targetNodeId}`. This div is the drop target for library-item drops.
- Inside it: `<table className="w-full border-collapse text-[10px] text-ink">` (`row-table.tsx:624`).
- `<thead>` → one `<tr>` with `className={cn("grid min-h-10 border-b border-hairline", ROW_COLUMNS)}` (`row-table.tsx:626`). The `grid` utility makes the `<tr>` a grid container; `<th>` children become grid items.
- `<tbody>` → one `<tr>` per row, each with `cn("group/estimate-row grid min-h-24 ...", ROW_COLUMNS)` (`row-table.tsx:238-244`). Again `grid` + the shared track string.

So: **native `<table>`/`<thead>`/`<tbody>`/`<tr>`/`<th>`/`<td>` tags are used for semantics/accessibility, but `display:grid` (not `table-layout`) governs column widths.** Each `<td>`/`<th>` is a flex/grid item (most carry `flex items-center justify-center`).

### Is the width definition shared by reference or duplicated?

- **By value (one constant), but applied at many DOM sites.** `ROW_COLUMNS` is a single `const` string. It is referenced 2 times in source (`:243` body row, `:626` header row) — but at render time it is **stamped onto every body `<tr>` and the one header `<tr>`** of **every table instance**. There is no shared style object, no CSS custom property, no context value carrying widths. Each grid `<tr>` independently re-parses the same literal `grid-template-columns`.

### How header stays aligned with body (within one table)

- Pure coincidence of identical class strings: header `<tr>` and body `<tr>`s use the same `ROW_COLUMNS`, and the parent `<table>` is `w-full`, so each `<tr>`'s grid resolves to the same track sizes for the same available width. There is **no** `<colgroup>`, no measured-width syncing, no shared column model. Alignment is guaranteed *only* because the literal is identical everywhere.

### Horizontal scroll

- The table root div is `overflow-hidden` (`row-table.tsx:619`) — it does **not** scroll horizontally. The flexible track absorbs width; fixed tracks can overflow/clip if the viewport is narrower than the sum of fixed tracks + 160px min. The outer scroll container (§4) is `overflow-auto` so horizontal scroll, if any, happens there at the whole-sheet level.

---

## 3. Multiple Node Groups / Branches — the resize-sync crux

### What a "node group" / branch is

- An estimate is a **tree** of `EstimateTreeNode`s (`estimate-tree-data`). Each node (P6 "single-node model", see `branch.tsx:160-167`) can simultaneously own **its own rows** (`estimateRowItems`) AND **child sub-areas** (`children`). There is no separate group-vs-area kind for layout purposes.
- `EstimateSheetBranch` (`branch.tsx:151-461`, memoized at `:461`) renders ONE node: a header bar (caret + occupancy dot + name + total, `:282-331`), then — when expanded — its own `EstimateRowItemsTable` (`:370-390`), an add-row strip, and then recursively its child branches (`:404-438`).

### How many independent grid instances exist on screen

- **One `EstimateRowItemsTable` (= one `<table>` = one independent grid) per visible node**, rendered at `branch.tsx:370`. A node renders its table even with zero rows? No — `EstimateRowItemsTable` returns `null` when `items.length === 0` (`row-table.tsx:599`), so empty nodes contribute no grid. But **every node that has ≥1 own row produces its own full `<table>` with its own `<thead>` and its own 9 grid tracks.**
- There is **no shared/global table spanning the whole sheet.** A sheet with, say, 12 row-bearing nodes shows 12 separate `<table>` elements, each independently stamping `ROW_COLUMNS`.

### Therefore, for width-sync across groups:

- The column-width definition lives in **one string constant** (`ROW_COLUMNS`) — good for a migration (single source today).
- But that string is **materialized into every body `<tr>` and header `<tr>` of every per-node table**. The count of DOM sites a new live width must reach = `(1 header row + R body rows) × N visible row-bearing nodes`.
- Cross-group alignment today is *implicit* (identical literals). Any user-driven resize must make the new width **authoritative across all N table instances**. Practical options the migration plan should weigh:
  1. **Shared CSS variables** on a common ancestor (e.g. set `--est-col-material`, `--est-col-subTotal`, etc. on the scroll container / expansion provider) and have every `<tr>` consume them — minimal re-render, widths flow by cascade to all groups for free.
  2. **Lifted TanStack `columnSizing` state** in `EstimateSheetContent`, passed down through `EstimateSheetVirtualBranchList` → `EstimateSheetBranch` → each table, with one `<ColumnSizingProvider>`-style context. Heavier prop/identity surface (see memo notes §5/§7).

---

## 4. Sticky Headers, Scroll Behavior, Cross-Group Alignment

### Scroll container

- The vertical scroll container is the `<div className="relative min-h-0 flex-1 overflow-auto px-2 pt-2 ..." data-estimate-pointer-surface>` at `EstimateSheetContent.tsx:2705-2707`. Both row-virtualizer and branch-virtualizer resolve their scroll element by walking up to the nearest `overflow:auto/scroll/overlay` ancestor (`findScrollParent`, `row-table.tsx:108-116` and `virtual-branch-list.tsx:34-42`) — i.e. this div.

### Sticky model (deliberately single-layer)

- **ONLY the depth-0 (root displayed) node header is sticky.** `branch.tsx:177` `const isStickyHeader = depth === 0;` and `:282` wraps the header in `cn("bg-white", isStickyHeader && "sticky top-0 z-[20]")`.
- **Every table `<thead>` is NON-sticky**, and nested node headers are NON-sticky. The comment at `branch.tsx:172-176` explains this is intentional: accumulated multi-level sticky offsets previously clipped first rows and pinned theads at the bottom of small nested tables; a single non-accumulated sticky layer avoids collision/clip.
- The page-level `EstimateSheetHeader` is `sticky top-0 z-30` (`EstimateSheetContent.tsx:616`); the branch sticky header sits at `z-[20]` beneath it.

**Implication for a sticky resizable header:** there is no persistent column header that stays pinned across the scroll while showing all groups. Each group's `<thead>` scrolls away with its table. A resize handle attached to a per-table `<thead>` would scroll out of view; a resize affordance that stays visible would need to live on the single sticky root header (or a new dedicated sticky column-ruler).

### Cross-group alignment guarantee

- As established in §2/§3: **alignment across groups is guaranteed solely by the shared `ROW_COLUMNS` literal.** There is no measurement, no `<colgroup>`, no observer keeping groups in sync. This is fragile-by-design-but-currently-correct: change the literal in one place and all groups move together; introduce per-group state and they can drift unless explicitly synced.

---

## 5. Full Render Tree (EstimateSheetContent → single cell)

Component hierarchy from orchestrator down to one cell. `[memo]` marks `React.memo`-wrapped components.

```
EstimateSheetContent                                  (EstimateSheetContent.tsx:1037)  — NOT memo (top-level)
└─ scroll container <div overflow-auto data-estimate-pointer-surface>   (:2705)
   ├─ EstimateSheetCursorLayer                        (:2709) — realtime cursors, isolated layer
   └─ EstimateSheetExpansionContext.Provider          (:2711) — collapsedNodeIds + searchActive
      └─ EstimateSheetVirtualBranchList               (:2712 / virtual-branch-list.tsx:74)
         │   • flattens visible branches (depth-first, respects collapse/search) :44-72
         │   • IF branch-virtualization OFF (default): renders <EstimateSheetBranch> directly :125
         │   • IF ON: renders flattened branches absolutely-positioned, renderChildBranches=false :149-157
         └─ EstimateSheetBranch   [memo]              (branch.tsx:461; base :151)
            ├─ node header bar (sticky only at depth 0) (:282-331)
            │     caret button · occupancy dot · node name (role=heading) · node total
            ├─ breadcrumb band (depth>0, when expanded)  (:347-361)
            ├─ EstimateRowItemsTable  [memo]          (branch.tsx:370 / row-table.tsx:461)
            │  │   memo comparator: areEstimateRowItemsTablePropsEqual (row-table.tsx:66-94)
            │  │   owns: per-table row virtualizer (@tanstack/react-virtual), focusedCell,
            │  │         replaceTargetRowId, activeExpressRowId, scrollMargin
            │  └─ <div data-estimate-row-table-root> > <table w-full> (:617-624)
            │     ├─ <thead> > <tr class="grid ... ROW_COLUMNS">       (:625-651)  ← header tracks
            │     │     <th>#</th> <th>select-all</th> <th>Materials</th> ... <th aria-hidden/>
            │     └─ <tbody> (block+relative when virtualized; height=getTotalSize) (:652-661)
            │        └─ EstimateRowItemTableRow  [memo]   (row-table.tsx:146)   ← ONE per row
            │           └─ <tr class="grid min-h-24 ... ROW_COLUMNS">  (:238-244)  ← body tracks
            │              ├─ <td> row-number                          (:249-251)
            │              ├─ <td> SelectionCheckbox                   (:252-267)
            │              ├─ <td> EstimateMaterialCell                (:268-303 / cells.tsx:367)
            │              │        └─ EstimateMaterialCardContent OR ExpressMaterialEditor
            │              │             (cells.tsx:123 / :171) — NOT memo
            │              ├─ <td> Qty ControlInput  (cell-index 0)    (:304-334)
            │              ├─ <td> Subtotal (read-only)                (:335)
            │              ├─ <td> Adjustment: DropdownSelect + % ControlInput (cell-index 1) (:336-395)
            │              ├─ <td> Misc MoneyInput (cell-index 2)      (:396-421 / cells.tsx:545)
            │              ├─ <td> Total Item Cost (read-only)         (:422-424)
            │              └─ <td> actions: Details/Activity/Delete buttons (:425-456)
            ├─ ComponentDropTarget / QuietAddRowButton (drop-zones.tsx:60)  (:395-401)
            └─ EstimateSheetBranch (children, depth+1) — recursion        (:404-438)
```

### React.memo inventory (re-render boundaries)

| Component | Memo? | Comparator | Citation |
|-----------|-------|-----------|----------|
| `EstimateSheetContent` | No | — | `EstimateSheetContent.tsx:1037` |
| `EstimateSheetVirtualBranchList` | No | — | `virtual-branch-list.tsx:74` |
| `EstimateSheetBranch` | **Yes** | `areEstimateSheetBranchPropsEqual` (deep-ish: node identity, all callbacks, ancestorPath, nodeTotals, recursive row-state check) | `branch.tsx:461`, comparator `:107-149` |
| `EstimateRowItemsTable` | **Yes** | `areEstimateRowItemsTablePropsEqual` (per-item `editableRows`/`selectedRowIds` slice) | `row-table.tsx:461`, comparator `:66-94` |
| `EstimateRowItemTableRow` | **Yes** | default shallow | `row-table.tsx:146` |
| `EstimateMaterialCell` / card / editor | No | — | `cells.tsx:367 / 123 / 171` |

**Migration-critical:** the memo comparators are explicitly keyed on **callback identity** (`row-table.tsx:62-65`, `branch.tsx:114-131`). All handlers from `EstimateSheetContent` are wrapped in `useStableCallback` (`EstimateSheetContent.tsx:1066` and surrounding). Any new column-sizing callback/state threaded through these layers must also be identity-stable, or it will force every branch + every table to re-render on each resize tick (a perf cliff during drag-resize).

---

## 6. Existing Per-Column Width / CSS-Var / Resize Logic

**None exists.** Confirmed:

- No CSS custom properties for columns anywhere in `rows/`. The only width-ish literals are the inline `ROW_COLUMNS` track string and a few fixed pixel widths inside cells (e.g. `cells.tsx:306` `w-[84px]` cost field, `row-table.tsx:343` `w-[74px]` dropdown).
- No `col-resize` cursor, no resize handle, no `columnSizing` state, no `getColumnWidth`/`onColumnResize` anywhere.
- The `resize` grep hits are unrelated: `cells.tsx:338` `resize-none` (textarea), and `row-table.tsx:563-575` a `ResizeObserver`/`window resize` listener that exists **only to recompute the virtualizer's `scrollMargin`**, not column widths.
- `@tanstack/react-table` is present (`package.json:59`, v8.21.3) but unused by the sheet; only `ProjectEstimatesTable.tsx` imports it. The sheet uses `@tanstack/react-virtual` (`package.json:60`) for both row-level (`row-table.tsx:4,494`) and branch-level (`virtual-branch-list.tsx:4,95`) virtualization.

### Virtualization interactions a migration must respect

- **Row virtualization** is per-table (`row-table.tsx:494-504`), default-enabled at ≥75 rows (`:493`), and **disabled whenever an express editor is active** in that table (`:492-493`). Virtual rows are absolutely positioned via inline `transform: translateY(...)` on each `<tr>` (`:692-698`), with the `<tbody>` switched to `block` + explicit height (`:659-660`). A `<colgroup>`-based width approach interacts poorly with `display:block`/`grid` tbody — the migration must verify track sizing survives the virtualized (absolute `<tr>`) mode.
- **Branch virtualization** (`virtual-branch-list.tsx`) is default-OFF (`WORKSHOP_ESTIMATE_MASTER_COLUMN_VIRTUALIZATION`), activating at ≥80 flattened branches; when on it flattens the tree and renders each branch with `renderChildBranches={false}`, so even more independent table instances mount in absolute-positioned wrappers.

---

## 7. Summary for the Migration Planner

1. **Single grid spanning all groups does not exist.** N independent `<table>` grids (one per visible row-bearing node) must all reflect a resized width. Width-sync is the central design problem.
2. **Column definition is ONE shared string** (`ROW_COLUMNS`, `row-table.tsx:96`) applied at every header + body `<tr>`. Cross-group alignment today = identical literals, nothing live.
3. **Cheapest sync vector** is likely a CSS-variable column model on a common ancestor (scroll container or expansion provider) so widths cascade to all groups without prop-threading through the memo boundaries.
4. **Memo/identity discipline is mandatory:** `EstimateSheetBranch` and `EstimateRowItemsTable` comparators key on callback identity; new resize state/handlers must be `useStableCallback`-stable or drag-resize will re-render the whole sheet.
5. **Preserve `data-estimate-cell-index` (0/1/2)** semantics (keyboard nav + cursor anchoring) and `data-estimate-row-id` attributes through any TanStack column refactor.
6. **Sticky header is single-layer (root only).** A persistent resize ruler can't live on per-table `<thead>`s (they scroll away); it belongs on the one sticky root header or a new sticky ruler.
7. **Virtualized rows use absolute-positioned `<tr>` + block `<tbody>`** — verify any new column-width mechanism (colgroup/grid/css-var) holds under virtualization.
