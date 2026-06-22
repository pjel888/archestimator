# 02 — Target UX and Layout (Donut-First, Per-Column)

> **Owner decision (2026-06-21):** the breakdown lives **per column**, not in a
> shared comparison table. Each estimate column is fully self-contained: its
> own donut + its own breakdown list. There is **no shared ledger table**
> beneath the columns. The a11y surface for each donut is that donut's own
> in-column breakdown list.

## The mental model

The Data page's job is to make a contractor **see** where the money goes and
**compare** estimates at a glance. The hero is a **row of estimate columns**;
each column is a self-contained card: header → hero total → **donut chart** →
**breakdown list** (label, amount, share, swatch). A trailing **`+` tile** on
the rightmost edge adds the next estimate column. Cross-estimate comparison
happens visually (donuts side by side, shared color identity, shared active
bucket) rather than in a dense cross-column table.

```
┌─ Project Data ───────────────────────────────────────────────────────────────────┐
│  COST DATA                                                  [Category|Supplier|Space] │
│  Cost breakdown  (single <h1>)                                                   │
│  See where each estimate's money goes. Add sheets to compare side by side.        │
│  ⚠ Mixed currencies / Partial coverage banners (when relevant)                    │
│  insight sentence (baseline vs first comparand, when 2+ sheets)                   │
│                                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────┐                   │
│  │ BASELINE     │  │ −₱600 −33% ✕ │  │ +₱600 +33% ✕ │  │  +  │ ← AddEstimateCol  │
│  │ Est 001      │  │ Est 002      │  │ Est 003      │  │ add │   (ADD_BUTTON tint)│
│  │ ₱1,800       │  │ ₱1,200       │  │ ₱2,400       │  │ est │   disabled at 3 /  │
│  │ 180 lines    │  │ 120 lines    │  │ 240 lines    │  │     │   none-left        │
│  │              │  │              │  │              │  │     │                    │
│  │   (donut)    │  │   (donut)    │  │   (donut)    │  │     │                    │
│  │              │  │              │  │              │  │     │                    │
│  │ Breakdown    │  │ Breakdown    │  │ Breakdown    │  │     │  ← per-column list │
│  │ ● Found  720 │  │ ● Found  300 │  │ ● Found  960 │  │     │    (the a11y surf. │
│  │ ● Finish 540 │  │ ● Finish …   │  │ ● Finish …   │  │     │     for its donut) │
│  │ ● …          │  │ ● …          │  │ ● …          │  │     │                    │
│  │ [Change ▾]   │  │ [Change ▾]   │  │ [Change ▾]   │  │     │                    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────┘                   │
│  Hovering a slice/row highlights the same bucket across every column.            │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Why per-column (owner's call), and the trade-off accepted

- **Closer to the owner's mental model** — "a donut chart per estimate/div."
  Each estimate owns its full breakdown; nothing is shared table chrome.
- **Cleaner columns**, no wide cross-column table to scroll.
- **Trade-off accepted:** precise cross-estimate *number* comparison is now
  visual (read down two columns) rather than in aligned table cells. The
  insight sentence in the header still states the headline baseline-vs-comparand
  delta and top drivers in words, so the single most important comparison is
  still explicit.

## Layout primitives

- **Outer paper panel** (unchanged shell): `dashboard-canvas-wash` + paper
  panel `rounded-xs`, one soft shadow, hairline border. Inside stays flat.
- **Header band** (shrink-0, border-b): eyebrow `COST DATA`, one `<h1>`
  (`Cost breakdown`), subtitle, grouping `SegmentedControl`, insight sentence,
  banners. Single `<h1>` a11y rule preserved.
- **Estimate columns row** (the hero): a horizontally-scrollable flex row of
  `EstimateColumn` cards + a trailing **`AddEstimateColumn`** (`+`) tile.
  - Wide viewports: columns grow `flex-1` (`min-w-[280px]`) to fill.
  - Narrow viewports: row scrolls horizontally; `+` tile `sticky right-0`.

## EstimateColumn anatomy (one per selected estimate)

```
┌────────────────────────┐
│ BASELINE  (chip, col 0)│  ← col 0 only; others show baseline-relative delta + remove ✕
│ Sheet name             │  ← title (truncate), sheet code secondary
│ ₱1,800                 │  ← hero total, 12px/500 tabular-nums
│ 180 line items         │  ← rowCount, tertiary
│ ▓▓▓ donut ▓▓▓          │  ← CostDonutChart hideCallouts compact, describedById → this list
│                        │
│ Breakdown              │  ← the a11y surface for THIS donut (id="…-list-<col>")
│ ● Foundations   ₱720 40%
│ ● Finishes      ₱540 30%
│ ● …               …   …
│ [Change sheet ▾]       │  ← DropdownSelect (swap this column's estimate)
└────────────────────────┘
```

- Column 0 = **baseline** (Baseline chip, no delta, no remove). Columns 1..n
  show a baseline-relative delta badge (hidden under mixed currency) and a
  remove `✕`.
- **Donut** uses `hideCallouts compact`; its `describedById` points at **this
  column's** breakdown list (`id={`estimate-${colId}-breakdown`}`), so each
  donut's accessible text alternative is its own list — satisfying the
  DESIGN.md "data table is the zoom-safe text alternative" rule per-column.
- **Breakdown list** = the donut's buckets (collapsed top-8 + Other via
  `collapseProjectChartBuckets`): color swatch + label + amount + share.
  Non-baseline columns may optionally annotate each row's baseline-relative
  delta, but the list stays the column's own (no cross-column table).
- Swapping a column's estimate is a `DropdownSelect` of *remaining* sheets.

## The `+` affordance (rightmost)

- A vertical tile pinned to the end of the columns row, `ADD_BUTTON_CLASSNAME`
  light-orange tint, `Plus` icon + `Add estimate` label, `rounded-xs`, `3px`
  inner-radius discipline.
- Opens a `DropdownSelect`/menu of sheets not yet on the board; picking one
  appends an `EstimateColumn` and writes `compare=…`.
- **Disabled (greyed, not hidden)** when `displayEstimateIds.length >= 3` or
  `remainingOptions.length === 0`, with a tooltip — perceivable-disabled a11y.
- Interaction spirit = the estimate-sheet `ResizableSidePanel` expand/collapse
  toggle: one obvious rightmost-edge control that changes the column count.

## States

| State | Behavior |
|-------|----------|
| No estimate sheets | `EmptyState`: "No estimate sheets yet." + Create link. |
| One sheet | One self-contained donut column; subtle hint to add a 2nd to compare. |
| 2–3 sheets | Multiple donut columns side by side; baseline deltas on non-baseline columns; shared active-bucket highlight. |
| 3 columns OR no remaining | `+` disabled ("Compare up to 3" / "All sheets shown"). |
| Mixed currencies | Banner; per-column deltas hidden; each donut renders its own currency. |
| Partial coverage (`didTruncate`) | Banner. |

## Visual rules (DESIGN.md compliance)

- `3px` radius inside the panel; no new radii invented.
- Okabe–Ito hues only inside donut marks + breakdown swatches (inline `fill` /
  `backgroundColor`), never chrome. `colorForBucket` keeps a bucket the same
  color in every column → cross-column visual comparison works.
- Direction cues use semantic `success`/`danger` + a `−`/`+` sign — never
  color alone.
- SVG donut text ≥ `11px` (data-viz amendment); HTML controls/list stay on the
  `10px` body / `8–9px` label scale; hero totals `12px/500`.
- Motion: column add/remove and `activeBucketId` transitions are
  transform/opacity only, 150–200ms, `motion-reduce` fallbacks (the
  `CostDonutChart` already honors this).
