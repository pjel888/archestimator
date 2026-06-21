# 01 — Current-State Audit

## Route shape

`src/app/workshop/projects/[projectId]/data/page.tsx` is a thin server
component:

1. awaits `params` + `searchParams`;
2. `assertRouteErrorSmoke(...)`;
3. `resolveProjectDataRouteState(searchParams)` → `{ selectedEstimateId,
   compareEstimateIds, groupingMode }`;
4. `getProjectDataRouteSummary(projectId, { ... })` → `ProjectDataRouteSummary`;
5. renders `<ProjectDataClient summary={summary} />`.

The legacy `/charts` route (`charts/page.tsx`) **302-redirects** into `/data`
with the same query string, so `/data` is the canonical charts surface.

## The client today (`ProjectDataClient`)

- Holds three overrides (`selectedOverride`, `compareOverride`,
  `groupingOverride`) keyed off the server summary so optimistic URL updates
  don't fight the server value, then `router.replace(...)` writes the canonical
  query (`sheet`, `compare`, `mode`) — `left`/`right` are stripped on write but
  still **read** for back-compat (`project-data-route-state.ts`).
- One piece of UI: `<CostComparisonBoard .../>`, wrapped in a paper panel.

## The board today (`CostComparisonBoard.tsx`, ~590 LOC)

This is the single source of the "unusable" feeling. Its anatomy:

1. **Header band** — title `Cost comparison`, subtitle, a `SegmentedControl`
   (group by Category / Supplier / Space), a baseline `DropdownSelect`, and an
   **"Add sheet to compare" `DropdownSelect`** whose value is forced to `""`.
2. **Sheet chips row** — `Baseline · …` / `Compare · …` removable chips.
3. **Insight sentence** (from `buildInsightSentence`) + warning `Banner`s for
   mixed currency / truncation.
4. **The hero surface: a comparison `<table>`** with:
   - sticky first column `w-[15rem]` (cost group label + color swatch);
   - one column per selected estimate (`min-w-[17rem]`), header = sheet name,
     total, baseline badge / delta badge, a `CompositionMicroLine` (Direct /
     Misc / Adj), and `rowCount`;
   - body rows = one per bucket; each cell shows amount, share, a **2px-tall
     bar** (`h-2`), line count, and a `[8px]` delta badge;
   - a `tfoot` total row with per-sheet total + delta badge.
5. Rows hover/focus to dim other buckets (`activeBucketId`).

### Why it reads as unusable (concrete)

- **Type scale at the floor.** Body is `[10px]`, eyebrows `[9px]`, delta badges
  `[8px]`, composition micro-line `[8px]`. Scanning a financial breakdown at
  8–10px with 4px line-heights is hostile to the long estimating session
  DESIGN.md optimizes for.
- **Bars are decorative, not legible.** `h-2` (8px) bars sliver inside a table
  cell — the "visualization" is thinner than the text. There is **no real
  chart** on the page despite the route being the project's "Data" tab.
- **The hero is a table, not a picture.** The owner's ask is to *see* the cost
  make-up at a glance; a dense table demands reading every cell.
- **"Add a sheet" is a value picker, not an action.** A `DropdownSelect`
  placeholder ("Add sheet") is a weak, non-obvious way to add a comparison
  column. The owner explicitly wants a **`+` button on the rightmost edge**.
- **Donut chart is absent here.** `CostDonutChart` (a mature, CVD-safe,
  callout-aware component) exists and is used by the sibling `ProjectChartsClient`
  "share view" and the share-receiver page — but the Data page never renders it.
- **Column width is fixed-ish** (`min-w-[17rem]`), so 1 estimate and 3
  estimates both render at ~17rem with the table-scroll affordance, never
  letting a single estimate breathe.

### What is correct and must be preserved

- **The data engine.** `buildProjectChartComparisonView` produces a frozen,
  per-estimate, per-bucket view-model with totals, shares, baseline-relative
  deltas, and an insight input — all CVD-safe via `colorForBucket`. The redesign
  consumes this unchanged.
- **The repository payload.** `ProjectDataRouteSummary` ships pre-bucketed
  `seriesByEstimateId` (data-minimized: no raw qty/unit cost crosses the wire),
  `estimateSheets` with `totalCost`/`rowCount`/`currencyCode`, and rollup /
  truncation flags. No new server query is needed.
- **The URL contract.** `sheet` (baseline), `compare` (comma list, `none` =
  explicit no-compare), `mode` (grouping); legacy `left`/`right` read-only
  fallbacks. Deep links and the redirect from `/charts` depend on this.
- **The a11y rule.** A chart's accessible surface is its **data table**
  (`aria-describedby`, `role="img"` on the SVG). The new design keeps a real
  table per estimate (or one shared table) carrying the exact donut figures.

## Existing test coverage that constrains the redesign

| Test file | Asserts | Impact |
|-----------|---------|--------|
| `project-data-route-state.test.ts` | `resolveProjectDataRouteState` param parsing (`sheet`/`compare`/`mode`, legacy `left`/`right`). | **Unchanged** — we keep the contract. |
| `project-data-repository.test.ts` | `getProjectDataRouteSummary` shape, default compare selection, mixed-currency rollup. | **Unchanged** — repository untouched. |
| `project-data-a11y.test.tsx` | Renders `ProjectDataClient`; expects exactly one `<h1>` ("Cost comparison"), the baseline + add-sheet comboboxes, and `<table id="project-data-cost-comparison-table">`. | **Will be updated** — the new layout changes the controls and table id. Updated tests assert the *new* a11y contract (one h1, per-column donut+table wiring, `+` button). |
| `project-data-cost-breakdown-ui.test.tsx`, `…-cost-across-sheets-ui.test.tsx`, `…-insight-header-ui.test.tsx` | Render sections that are **not currently mounted** by `ProjectDataClient` (`CostBreakdownSection`, `CostAcrossSheetsSection`, `ProjectDataInsightHeader` are orphaned components — see `03`). | **Review per-file**: keep the ones we reintegrate, delete the ones we retire. |

## Orphaned components (already not rendered)

`CostBreakdownSection.tsx`, `CostAcrossSheetsSection.tsx`,
`ProjectDataInsightHeader.tsx`, `CostLedger.tsx` exist under
`src/components/workshop/project-data/` but are **not imported** by
`ProjectDataClient` or the route. They are leftovers from a prior design pass.
The redesign will not depend on them; `03` decides keep-vs-delete.
