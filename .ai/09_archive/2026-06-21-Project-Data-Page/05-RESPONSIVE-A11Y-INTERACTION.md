# 05 — Responsive, Accessibility, and Interaction

> **Owner decision:** breakdown is **per-column**. There is no shared ledger
> table; each donut's accessible surface is its own in-column breakdown list.

## Responsive behavior

| Viewport | Columns row |
|----------|-------------|
| Wide (xl+) | Columns grow `flex-1` (`min-w-[280px]`) to fill; `+` tile inline at the end. |
| Laptop | 2–3 columns fit; if not, the row scrolls horizontally. `+` tile `sticky right-0` so it stays reachable. |
| Tablet / narrow | Columns row becomes a horizontal scroll of fixed-width cards (`w-[280px]`); `+` tile stays pinned right. |
| Mobile | Single column visible; swipe between estimate columns; `+` tile pinned right. |

The outer shell (`height: 100dvh`, no max-width cap) is unchanged — the
workspace owns the viewport per DESIGN.md.

## Accessibility (WCAG 2.1 AA target)

### The data-list-as-alt-text rule (per-column)

The DESIGN.md data-viz amendment ("the data table is the zoom-safe text
alternative") is honored **per column**: each donut is `role="img"` and points
at **its own** breakdown list via `aria-describedby`. Each column is fully
self-contained — its donut's accessible text alternative is the list directly
beneath it. Concretely:

- Each `EstimateColumn` renders a breakdown list
  `<ul id={`estimate-${estimate.id}-breakdown`} aria-label={`${estimate.name} cost breakdown by ${mode}`}>`
  with one `<li>` per bucket: swatch + label + amount + share (+ rowCount).
- That column's `CostDonutChart` receives
  `describedById={`estimate-${estimate.id}-breakdown`}`.
- Each donut `<path>` keeps `tabIndex={0}` and `aria-label="{label} {share}"`
  (already in `CostDonutChart`) for sighted keyboard users who prefer the chart.
- There is **no** `project-data-cost-comparison-table` id anymore (the shared
  table is gone). Tests that asserted that id are updated (see `06`).

### Single `<h1>`

The header band keeps exactly one `<h1>` (`Cost breakdown`). Column titles are
`<h2>` or `<p>` (not `<h1>`), preserving the single-`<h1>` invariant.

### Color is never the sole cue

- Categorical identity: color swatch **plus** text label in the breakdown list
  and in the donut's `aria-label`.
- Direction (cheaper/more expensive): semantic `success`/`danger` text **plus**
  a `−`/`+` sign and the word cue in the `aria-label` (as in `DeltaBadge`).

### Keyboard

- `+` tile, per-column swap `DropdownSelect`, remove `✕`, and grouping
  `SegmentedControl` are real focusable controls with visible focus rings
  (`focus-visible:ring-focus`).
- Donut slices are focusable (`tabIndex={0}`); `focus` sets `activeBucketId`,
  highlighting the matching slice in every other column and the matching row
  in every breakdown list.
- Breakdown list rows are focusable (`tabIndex={0}`) so keyboard users can
  scan a column's breakdown.

### Reduced motion

- `CostDonutChart` slice opacity transitions and column add/remove transitions
  use `transform`/`opacity` only, with `motion-reduce:transition-none`
  fallbacks (the chart already honors this).
- No layout-property animation; no orchestrated load sequence (product
  register: "no orchestrated page-load sequences").

## Interaction details

- **Shared `activeBucketId`**: hovering or focusing any donut slice or any
  breakdown row sets one `activeBucketId`; every donut dims non-matching
  slices and every list dims non-matching rows. The stable `colorForBucket`
  makes the cross-column visual link legible.
- **`+` tile disabled state**: visible but greyed (not hidden) when full or no
  sheets remain, with a tooltip (perceivable-disabled a11y).
- **Mixed currency**: non-baseline columns hide their delta badge; each donut
  renders its own currency; banner explains.
- **Empty / single-sheet**: `EmptyState` when no sheets; a subtle hint to add a
  second sheet when only one exists, without blocking that one donut.
