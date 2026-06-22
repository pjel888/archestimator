# 03 — Component and File Plan

> **Owner decisions (2026-06-21):** (a) breakdown is **per-column** (no shared
> ledger table); (b) **delete the orphaned** project-data sections in this PR.

## Reuse-first inventory (do not reinvent)

| Existing asset | File | Reuse in redesign as |
|----------------|------|----------------------|
| `CostDonutChart` | `src/components/charts/CostDonutChart.tsx` | The per-column donut. Supports `hideCallouts`, `compact`, `activeBucketId`, `onActiveBucketChange`, `describedById`. **No edit needed**. |
| `buildProjectChartComparisonView` | `src/lib/project-charts/project-comparison-view.ts` | Insight/delta engine for the header sentence + per-column baseline-relative deltas. Consumed unchanged. |
| `collapseProjectChartBuckets` | `src/lib/project-charts/aggregate-project-charts.ts` | Collapse each estimate's buckets to top-8 + Other for the donut + breakdown list. |
| `colorForBucket` / Okabe–Ito | `src/lib/project-charts/bucket-color.ts` | Stable per-bucket color across columns + swatches. |
| `formatChartMoney/Share/SignedChartMoney` | `src/lib/project-charts/format.ts` | Money / share / delta formatting. |
| `buildInsightSentence` | `src/lib/project-charts/build-insight-sentence.ts` | The header insight sentence (baseline vs first comparand). |
| `SegmentedControl` | `src/components/ui/segmented-control.tsx` | Group-by control. |
| `DropdownSelect` | `src/components/ui/dropdown-select.tsx` | Per-column "change sheet" + the `+` picker. |
| `Banner` | `src/components/ui/banner.tsx` | Mixed-currency / truncation warnings. |
| `EmptyState` | `src/components/ui/empty-state.tsx` | No-sheets state. |
| `ADD_BUTTON_CLASSNAME` | `src/components/ui/toolbar-icon-button.tsx` | The `+` tile tint (named estimate-sheet exception). |
| `Button` | `src/components/ui/button.tsx` | Underlying button for the `+` tile. |

## New components (under `src/components/workshop/project-data/`)

### 1. `EstimateColumn.tsx` (new)
One self-contained estimate card: header → hero total → donut → breakdown list.
Props:

```ts
type EstimateColumnProps = {
  summary: ProjectDataRouteSummary;
  estimate: ProjectDataEstimateSheet;
  baseline: boolean;                 // column 0
  baselineEstimate: ProjectDataEstimateSheet | null;
  groupingMode: ProjectChartGroupingMode;
  buckets: CostBucket[];             // this estimate's series, collapsed top-8 + Other
  total: number;
  activeBucketId: string | null;
  mixedCurrency: boolean;
  canSwap: boolean;                  // remaining options exist
  onActiveBucketChange: (id: string | null) => void;
  onSwapEstimate: (nextId: string) => void;
  onRemove?: () => void;             // absent on baseline
};
```

- Renders Baseline chip / remove `✕` + delta badge (non-baseline), sheet name +
  code, hero total (`12px/500`), rowCount, `CostDonutChart` (`hideCallouts
  compact describedById`), and the **per-column breakdown list** (`<ul
  id={`estimate-${estimate.id}-breakdown`}>`) with swatch + label + amount +
  share. The donut's `describedById` points at this list's id.
- Donut `buckets` from `seriesByEstimateId[id][mode]` via
  `collapseProjectChartBuckets(allBuckets, 8)` — same helper the sibling charts
  page uses.

### 2. `AddEstimateColumn.tsx` (new)
The rightmost `+` tile.

```ts
type AddEstimateColumnProps = {
  remainingOptions: DropdownSelectOption[];
  canAdd: boolean;
  onAdd: (estimateId: string) => void;
};
```

`ADD_BUTTON_CLASSNAME` tint, `Plus` icon, `Add estimate` label. Disabled +
titled when `!canAdd`. Opens a `DropdownSelect` of `remainingOptions`.

### 3. `CostComparisonBoard.tsx` (rewritten in place)
Keeps the **same export name and prop signature** `ProjectDataClient` passes
today, so the call site is unchanged. Internally:

1. builds `comparisonView` (for the header insight + baseline-relative deltas);
2. header band (one `<h1>`, grouping control, insight sentence, banners);
3. **columns row**: `displayEstimates.map(... → <EstimateColumn/>)` + trailing
   `<AddEstimateColumn/>`;
4. **no shared ledger table** — each column owns its breakdown list.

> The prop signature is frozen so `ProjectDataClient` is untouched.

## Files changed

| File | Action |
|------|--------|
| `src/components/workshop/project-data/CostComparisonBoard.tsx` | **Rewrite** — header + donut columns row (no shared table). Same export + props. |
| `src/components/workshop/project-data/EstimateColumn.tsx` | **New**. |
| `src/components/workshop/project-data/AddEstimateColumn.tsx` | **New**. |
| `src/app/workshop/projects/[projectId]/data/loading.tsx` | **Light edit** — skeleton matches new columns-row shape (donut + list placeholders). |

## Files DELETED (orphaned sections — owner decision)

| File | Action |
|------|--------|
| `src/components/workshop/project-data/CostBreakdownSection.tsx` | Delete |
| `src/components/workshop/project-data/CostAcrossSheetsSection.tsx` | Delete |
| `src/components/workshop/project-data/ProjectDataInsightHeader.tsx` | Delete |
| `src/components/workshop/project-data/CostLedger.tsx` | Delete |
| `tests/vitest/project-data-cost-breakdown-ui.test.tsx` | Delete (tests the deleted `CostBreakdownSection`) |
| `tests/vitest/project-data-cost-across-sheets-ui.test.tsx` | Delete (tests the deleted `CostAcrossSheetsSection`) |
| `tests/vitest/project-data-insight-header-ui.test.tsx` | Delete (tests the deleted `ProjectDataInsightHeader`) |

### Governance-test ripple (must update — these are real, found in the repo)

`tests/vitest/project-dashboard-ui-fixtures.ts` reads those component files
with `readFileSync`; `tests/vitest/project-dashboard-charts-ui.test.ts`
asserts both their existence/contents **and** old board strings. So this PR
**must** also:

1. **`project-dashboard-ui-fixtures.ts`**: convert the four deleted-component
   reads to `readOptional` (the precedent already set for `ProjectCostBubbleChart`
   / `project-charts/*`). This keeps the fixture importable and lets tests
   assert absence.
2. **`project-dashboard-charts-ui.test.ts`** "uses a comparison-first data
   board…" block: this block encodes the *old* board contract
   (`projectDataComparisonBoard` must contain `"Cost comparison"`,
   `"Baseline estimate sheet"`, `"Add sheet to compare"`,
   `"project-data-cost-comparison-table"`) and old orphan strings
   (`projectDataInsightHeader` contains `"Estimate sheet"`,
   `projectDataCostBreakdown` contains `"CostLedger"`,
   `projectDataCostLedger` contains `"hidden w-full px-2 py-1.5 …"`,
   `projectDataCostAcrossSheets` contains `"Cost across sheets"`).
   **Rewrite this block** to the new donut-first contract: board contains
   `CostDonutChart`, `EstimateColumn`, `AddEstimateColumn`,
   `collapseProjectChartBuckets`, `buildProjectChartComparisonView`; the four
   deleted fixtures now read as `""` (absence assertions). Keep the other
   governance tests (nav label, scroll contract, d3-isolation, skeleton) —
   those still hold; verify each string still matches after the rewrite.

> These two governance-test edits are the mechanism by which "delete the
> orphans" stays safe: the fixtures degrade gracefully via `readOptional`
> (no broken imports), and the rewritten assertion block locks the *new*
> intended architecture instead of the old one.

## Unchanged files (explicitly)

- `data/page.tsx`, `data/error.tsx`, `ProjectDataClient.tsx`
- `project-data-repository.ts`, `project-data-route-state.ts`
- `src/lib/project-charts/*`, `src/components/charts/CostDonutChart.tsx`

## Shared-primitive reuse contract (DESIGN.md)

- No new one-off button: the `+` tile composes `Button` + `ADD_BUTTON_CLASSNAME`.
- No new dropdown: per-column swap and the `+` picker use `DropdownSelect`.
- No new segmented control: grouping uses `SegmentedControl`.
- No new chart: the donut is the shared `CostDonutChart`.
- Categorical color flows only through `colorForBucket` as inline
  `fill`/`backgroundColor`, never Tailwind classes.
