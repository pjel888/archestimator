# 02 — Component & Chart Inventory

Research-only inventory of every existing charting, donut, cost-visualization
component, supporting data helper, and design token that the new simple project
**`/data`** route can be built from. Goal: build the new page mostly from parts
that already exist. All paths are repo-relative.

---

## 0. TL;DR — what to reuse

The codebase already contains a near-complete reference implementation of
"donut cost breakdown that swaps on estimate-sheet selection":
`src/components/workshop/dashboard/DashboardCostMix.tsx`. It wires together the
shared `CostDonutChart`, the accessible `DashboardBreakdownTable`, a
`DropdownSelect` (estimate-sheet picker), and a `SegmentedControl`
(space/category/supplier). The new `/data` page should adopt this composition,
but it is **not** a verbatim lift: the dashboard hides callouts with
`hideCallouts`, while `/data` deliberately uses the full-callout labeled donut
to justify the route as a deeper cost-breakdown view.

**Important mismatch to flag:** the current `src/app/workshop/projects/[projectId]/data/page.tsx`
renders `ProjectChartsClient` — the heavy *comparison* surface (variance spine,
composition bars, multi-estimate chips), **not** the simple donut. If the intent
is a simple cost page, the route is currently pointed at the wrong client.

---

## 1. Charting library in use

| Question | Finding |
|----------|---------|
| Library | **No charting library.** `package.json` has `d3` (`^7.9.0`) + `@types/d3`. No recharts / visx / victory / chart.js / nivo. |
| What d3 is actually used for | **Only `d3-shape`** (`arc`, `pie`, `PieArcDatum`), and **only** inside the one donut component `src/components/charts/CostDonutChart.tsx`. No d3 scales, axes, selections, or DOM binding anywhere. |
| Bar / variance charts | **Hand-rolled with CSS/flexbox + percentage widths** — `ProjectCompositionBars` (100%-stacked horizontal bars via `<span style={{width: `${share*100}%`}}>`) and `ProjectVarianceSpine` (absolutely-positioned markers on a `%`-scaled track). No SVG. |
| SVG in the chart tree | The **only** SVG chart in `src/components` is `CostDonutChart.tsx`. (`grep '<svg'` otherwise hits landing/logo/spinner/alert.) |

**Canonical approach the new page should follow:**
- **Donuts → `d3-shape` (`arc`/`pie`) inside a hand-authored SVG**, exactly as `CostDonutChart`. Dynamic-import the donut so `d3-shape` only loads when needed (the comparison page already does this — see `ProjectChartsClient` line 26).
- **Bar / stacked / multi-layer "tracking across sheets" → CSS flexbox bars**, not a new SVG/charting dependency. `ProjectCompositionBars` is the existing template (100%-stacked bar per estimate, shared color legend). Do **not** introduce recharts/visx; it would violate the established no-chart-lib convention and the palette-leak discipline.
- Every chart MUST ship a paired data table referenced via `aria-describedby` (DESIGN.md data-viz rule). Reuse `DashboardBreakdownTable`.

---

## 2. Donut / pie components

| Component | Path | Data shape | A11y | Reuse verdict |
|-----------|------|-----------|------|---------------|
| **`CostDonutChart`** | `src/components/charts/CostDonutChart.tsx` (~15KB, the real impl) | Props: `buckets: CostBucket[]`, `total`, `currencyCode`, `label`, `compact?`, `hideCallouts?`, `describedById?`, `className?`, `containerClassName?`. `CostBucket = { id, label, total, share, rowCount, color, isOther? }` (`src/lib/charts/types.ts`). | `role="img"` + `aria-label`; `aria-describedby` → external breakdown table is the SR/zoom surface; per-slice `aria-label`; `sr-only aria-live="polite"` announces hover/focus selection; `tabIndex={0}` + `onFocus` on each slice; `motion-reduce:transition-none`; connector stroke darkened to `#8f8f8f` for 3:1 (WCAG 1.4.11); deterministic SVG (fixed `en-PH` locale) to avoid hydration drift. | **DIRECTLY REUSABLE — primary building block.** Already supports selection state, compact mode, and a callout-less "clean ring beside a table" mode. Use as-is. |
| **`ProjectCostDonutChart`** | `src/components/workshop/project-charts/ProjectCostDonutChart.tsx` | — (5-line file) | — | **Just a re-export alias** of `CostDonutChart` (+ `ProjectChartBucket` = `CostBucket` type alias) kept for back-compat. Import the shared `CostDonutChart` directly; no separate component to reuse. |
| **`DashboardCostMix`** | `src/components/workshop/dashboard/DashboardCostMix.tsx` | Props: `projectId`, `selectedEstimate: DashboardEstimateSheet`, `estimateSheets: DashboardEstimateSheet[]`, `selectedGroupingMode`, `series: ProjectChartEstimateSeries`, `currencyCode`, `truncated?`. | Inherits donut + table a11y; `SegmentedControl` (roving tabindex) + `DropdownSelect` (APG combobox) are both accessible; `<section aria-label="Cost composition">`. | **THE REFERENCE IMPLEMENTATION for part (a).** It already does "donut that swaps on estimate-sheet selection" (the `DropdownSelect` at line 126), grouping toggle, paired table, click-to-select-bucket, and deep links. Reuse the whole composition or lift it nearly verbatim into the `/data` page. Note: it mutates URL `?estimate=&mode=` via `router.replace` — keep or strip depending on whether `/data` wants its own URL state. |

**CostBucket / segment behavior already handled by the donut + helpers:**
- Filters non-finite / non-positive slices; empty state renders "No cost rows".
- Center label shows total + label, or the active slice's label/amount/percent on hover/focus.
- Active slice expands (`OUTER_RADIUS + 4`) and dims siblings to `opacity 0.4`.
- `hideCallouts` + `containerClassName="h-[220px] w-[220px]"` is the exact recipe for a clean ring sitting next to a table (used by `DashboardCostMix`).

**Tests confirming the contract (pin behavior, do not break):**
- `tests/vitest/cost-donut-chart-ui.test.tsx` — arcs + center label stay inside the SVG viewport in both `hideCallouts` and full-callout compact modes (the centre-translate fix).
- `tests/vitest/share/cost-donut-chart-hydration.test.tsx` — byte-identical SSR markup across renders; all path coords rounded ≤ 4 dp; no debug text leaks; empty state shows "No cost rows". (Reuse these as the safety net when embedding the donut on `/data`.)

---

## 3. Other chart / visualization primitives

| Primitive | Path | What it gives the new page | Reuse verdict |
|-----------|------|----------------------------|---------------|
| **`ProjectCompositionBars`** | `src/components/workshop/project-charts/ProjectCompositionBars.tsx` | 100%-stacked horizontal bar **per estimate**, one shared stable color per category across estimates, hover/pin sync, A/B/C cue tokens + legend, `role="img"`. **This is the closest existing thing to "multi-layer cost tracking across all sheets."** | **REUSE / ADAPT for part (b).** Pure CSS bars. It is share-normalized (each bar = 100%); for absolute "cost tracking" you'd feed totals or adapt widths to an absolute domain. Driven by `ProjectChartComparisonView` (see §4). |
| **`ProjectVarianceSpine`** | `src/components/workshop/project-charts/ProjectVarianceSpine.tsx` | One row per bucket; each estimate is a marker on a shared horizontal scale; variance connector; direction reinforced 3 ways (hue + arrow + signed Δ). `role`/`aria-describedby` to table. | Available if the project-wide view wants per-category variance, but likely **too comparison-heavy** for a "simple" page. Optional. |
| **`ProjectComparisonTable` / `DashboardBreakdownTable`** | `.../ProjectComparisonTable.tsx`, `src/components/workshop/dashboard/DashboardBreakdownTable.tsx` | The accessible data-table twin a chart points at via `aria-describedby`: swatch + label + amount + share, clickable rows (`aria-pressed`), selected-row highlight, `onBucketSelect`. | **`DashboardBreakdownTable` is DIRECTLY REUSABLE** as the donut's required accessible table. |
| **`ProjectComparisonHeader`** | `.../ProjectComparisonHeader.tsx` | `<h1>` + currency chip + auto insight sentence. | Reusable header pattern if `/data` wants a verdict line; optional. |
| **Sheet-selector controls** | | | |
| `DropdownSelect` | `src/components/ui/dropdown-select.tsx` | **The estimate-sheet picker.** APG select-only combobox: `role="combobox"`, virtual focus via `aria-activedescendant`, typeahead, optional hidden native `<select>` for forms, `variant="boxed"` or `"underline"`. Options: `{ value, label, disabled? }`. | **DIRECTLY REUSABLE** — already used as the sheet picker in `DashboardCostMix` (line 126). |
| `SegmentedControl` | `src/components/ui/segmented-control.tsx` | Single-select button group (space/category/supplier), roving tabindex, one tab stop, `aria-pressed`. | **DIRECTLY REUSABLE** — the grouping-mode toggle. |
| `Chip` | `src/components/ui/chip.tsx` | Removable/active chip — used for multi-estimate selection in `ProjectChartsClient`. | Reusable if `/data` part (b) lets users add/remove tracked sheets. |
| `FinancialTotalCard` | `src/components/ui/financial-total-card.tsx` | KPI / stat card: `label` + big `value` (12px/500 tabular) + `sublabel`, `primary` (dark) or `default`. | **DIRECTLY REUSABLE** as a headline cost figure (see `DashboardHeadline`). |
| `SectionHeading`, `Banner`, `EmptyState` | `src/components/ui/{section-heading,banner,empty-state}.tsx` | Section title (+ `aside` slot for the segmented control), info/warning banners (truncation notice), empty state. | Reusable scaffolding. |

**Not reusable as components:** `src/stories/charts/chart-container.stories.tsx` — `ChartContainer` is only a Storybook *preview* helper, no shipped component exists. There are **no** line/area/sparkline/axis components anywhere; build "tracking" from CSS bars.

---

## 4. Cost mix / cost breakdown logic (feeds the donut directly)

The donut is fed by a **pure server-side aggregation engine**. Raw row facts
(qty, unit cost, supplier ids) never cross the wire — only pre-bucketed series.

| Helper | Path | Role |
|--------|------|------|
| `buildProjectChartSeries` / `buildProjectChartComparison` | `src/lib/project-charts/aggregate-project-charts.ts` | Core engine. Groups rows into buckets by **space / category / supplier**, computes `total` + `share` + `rowCount`, sorts, assigns stable colors. `calculateProjectChartRowTotal` = `qty*unitCost + miscCost + contingency%`. |
| `collapseProjectChartBuckets(buckets, limit)` | same file | Top-N + neutral "Other" collapse. `DashboardCostMix` calls it with `TOP_SEGMENT_LIMIT = 5`; donut/share view uses 8. **This is what turns a raw series into donut-ready slices.** |
| `colorForBucket(id)` | `src/lib/project-charts/bucket-color.ts` | Deterministic FNV-1a hash → stable Okabe–Ito color per bucket id (same category = same color everywhere). `OTHER_BUCKET_COLOR = #9AA0A6`. |
| `formatChartMoney` / `formatChartShare` / `formatSignedChartMoney` / `bucketCueToken` | `src/lib/project-charts/format.ts` | Canonical `en-PH` currency/percent formatters + A/B/C non-color cue tokens. **Reuse for figure parity (R14).** |
| `buildProjectChartComparisonView` | `src/lib/project-charts/project-comparison-view.ts` | Builds the multi-estimate view-model consumed by `ProjectCompositionBars` / `ProjectVarianceSpine` (per-estimate shares/totals across buckets). The data source for part (b). |

**Important implementation boundary:** U3 cannot depend permanently on `getProjectChartsData`
from `src/lib/repositories/project-charts-repository.ts` if U5 deletes that repository.
Before deletion, create a surviving route repository such as
`src/lib/repositories/project-data-repository.ts` exporting
`getProjectDataRouteSummary(projectId, { selectedEstimateId, groupingMode })`.
It should return the selected dashboard summary/cost mix for Section 1, estimate
sheet options/totals, rollup, and `seriesByEstimateId` for the ≤20-sheet Section
2 path. U5 may delete `project-charts-repository.ts` only after U3 imports the
surviving repository.

**Data contracts / types** — `src/lib/project-charts/types.ts`:
- `ProjectChartBucket = { id, label, total, share, rowCount, color, isOther?, sourceNodeId? }`
- `ProjectChartModeSeries = { total, allBuckets }`
- `ProjectChartEstimateSeries = Record<"space"|"category"|"supplier", ProjectChartModeSeries>` — **one estimate's buckets in all three grouping modes** (what `DashboardCostMix` receives).
- `ProjectChartsData = { estimateOptions, seriesByEstimateId, loadMode, ... }` — **all loaded estimates' series**, what `ProjectChartsClient` receives (use for part (b), project-wide tracking).

**Data layer / server entry points:**

| Function | Path | Returns | Use for |
|----------|------|---------|---------|
| `getDashboardEstimateSeries(projectId, estimateId)` | `src/lib/repositories/project-dashboard-repository.ts:73` | `{ series: ProjectChartEstimateSeries, currencyCode, didTruncate, ... }` for ONE estimate. | **Part (a)** — the single-estimate donut that swaps per sheet. Scopes on project_id+id (no foreign cost). Capped via `DASHBOARD_ESTIMATE_ROW_LIMIT`. |
| `getProjectDashboardSummary(projectId, { selectedEstimateId, selectedGroupingMode })` | same file:732 | `ProjectDashboardSummary` with `estimateSheets`, `rollup`, selected sheet metadata, and `costMix` **only after** `summary.selectedEstimateId` resolves and `getDashboardEstimateSeries` succeeds. For zero-sheet projects, `costMix: null`. | **Preferred U2 loader** because it enumerates sheets, resolves the default (`estimates[0]`), exposes the rollup/currency guard, and attaches the selected sheet's series. Drive the empty state from `costMix: null` / no selected sheet. |
| `getProjectChartsData(projectId, { selectedEstimateIds })` | `src/lib/repositories/project-charts-repository.ts` | `ProjectChartsData` (all estimates' series, `seriesByEstimateId`). | **Part (b)** — project-wide tracking across all sheets. **Already called by the current `data/page.tsx`.** |

**Cross-wire view-model types** — `src/lib/workshop/dashboard-types.ts`:
- `DashboardEstimateSheet = { id, name, sheetCode, total, currencyCode, rowCount, firstNodeId, budget, variance, isSelected, ... }` — the estimate-sheet picker option shape.
- `DashboardCostMix = { series: ProjectChartEstimateSeries, currencyCode, truncated }`.
- `DashboardCostRollup` = single-currency total **or** `mixed` marker (cross-estimate sum is only meaningful under one currency — relevant for part (b) project-wide totals).

**Live wiring to copy:** `src/components/workshop/ProjectDashboardClient.tsx` (lines ~209–217) shows `DashboardCostMix` mounted with `series={summary.costMix.series}` etc. — the exact prop plumbing for part (a).

---

## 5. Design tokens & chart palette

### Canonical chart color sequence (USE THIS — do not invent colors)
Source of truth: `src/lib/project-charts/bucket-color.ts`. Sanctioned by
`DESIGN.md` §"Data-viz categorical palette exception" as the one named exception
to the "orange is landing/brand only" rule.

**Okabe–Ito CVD-safe series hues** (ordered most-distinguishable-first):

| Order | Hex | Name |
|-------|-----|------|
| 1 | `#0072B2` | blue |
| 2 | `#E69F00` | orange |
| 3 | `#009E73` | bluish green |
| 4 | `#CC79A7` | reddish purple |
| 5 | `#56B4E9` | sky blue |
| 6 | `#D55E00` | vermillion |
| 7 | `#F0E442` | yellow (last; weakest on white) |
| Other | `#9AA0A6` | neutral grey for the "Other" collapse bucket (NOT a series hue) |

- Colors are assigned by **stable bucket-id hash** via `colorForBucket(id)`, so the
  same category keeps its color across every chart/render. **Never** hand-pick or
  index-assign colors.
- **Palette-leak rule (hard constraint):** these hues may appear **only** in chart
  marks, legends, and data-table swatches, applied as inline `fill` /
  `backgroundColor` — **never** as Tailwind classes, and never in controls, chrome,
  nav, buttons, or headers.
- Direction (cheaper/more expensive) uses semantic `success`/`danger` **plus** a
  non-color cue (arrow/sign/bar direction) — never color alone (WCAG 1.4.1).

### Text / neutral tokens (from `DESIGN.md`)

| Token | Hex | Use |
|-------|-----|-----|
| Strong / `ink` / `foreground` | `#3D3D3D` | headings, totals, high-emphasis, donut center figure |
| **Secondary / default** | `#5D5D5D` | normal body/control text **— use for load-bearing meta** |
| Tertiary / muted / "subtle" | `#7F7F7F` | nav, metadata, labels, passive states |
| Selected bg | `#F5F5F5` (`surfaceMuted`) | hover/selected neutral surface |
| Surface | `#FFFFFF` | card/canvas |
| Border / hairline | `#F2F2F2` | thin separators instead of shadows |

### AA-contrast caveat (CARRY THIS FORWARD)
`DESIGN.md` sanctions **`#7F7F7F`** (tertiary/muted) for meta text, **but
`#7F7F7F` on white is ~3.5:1 and FAILS WCAG AA (4.5:1) for normal text.** For any
**load-bearing meta** (figures, labels a user must read to act — e.g. amounts,
shares, the "X rows" caption, selected-segment detail), use **secondary
`#5D5D5D`** (~7:1, passes AA). Reserve `#7F7F7F` for genuinely decorative/passive
text only. (Note: `DashboardCostMix` currently uses `text-tertiary` on several
sub-10px captions — replicate with `text-secondary` for anything the user must
read.)

### SVG text floor (DESIGN.md data-viz amendment)
- **SVG `<text>` floor = 11px** (SVG text doesn't reflow on zoom). Numeric
  `fontSize` attributes, not Tailwind. (`CostDonutChart` callouts use 8–9px text,
  which is *below* this floor — acceptable only because the paired data table is
  the zoom-safe alternative. Keep the table.)
- HTML control/value floor = 10px; meta/eyebrow 8–9px.
- Hero figures (totals, donut center) may use 12px/500.

---

## 6. Recommended assembly for the new `/data` page

- **Part (a) — donut that swaps on sheet selection:** Adopt the
  `DashboardCostMix` composition (paired `DashboardBreakdownTable`,
  `DropdownSelect` sheet picker, `SegmentedControl` grouping) but render
  `CostDonutChart` in full-callout labeled mode, not the dashboard's
  callout-hidden ring. U2 must extend the donut if needed for controlled
  table highlight and 11px callout text. Feed it from the `costMix` field of
  `getProjectDashboardSummary`; use `getDashboardEstimateSeries` directly only
  if the picker/default logic is supplied separately. Use
  `collapseProjectChartBuckets(..., 6)` because `/data` has more width than the
  dashboard ring and the spec standardizes on six slices + "Other".
- **Part (b) — project-wide cost tracking across sheets:** Reuse
  `ProjectCompositionBars` (CSS stacked bars, shared palette) driven by
  `buildProjectChartComparisonView` over `getProjectChartsData`'s
  `seriesByEstimateId`. For absolute (not share-normalized) tracking, adapt the
  bar widths to an absolute cost domain. Use `FinancialTotalCard` +
  `DashboardCostRollup` for the project-wide total (guard `mixed` currencies).
- **Fix the route:** `src/app/workshop/projects/[projectId]/data/page.tsx`
  currently mounts the comparison-heavy `ProjectChartsClient`. Repoint it at the
  simple cost-mix composition if "simple" is the goal.
- **Everywhere:** reuse `formatChartMoney`/`formatChartShare` and `colorForBucket`
  for figure + color parity; ship the paired `aria-describedby` table for every
  chart; use `#5D5D5D` for load-bearing meta.
