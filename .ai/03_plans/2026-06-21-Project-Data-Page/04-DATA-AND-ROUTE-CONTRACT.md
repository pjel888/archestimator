# 04 — Data and Route Contract

## No server change

The redesign is **purely client-side component work**. The server route, the
repository, and the route-state resolver are untouched:

- `getProjectDataRouteSummary(projectId, { selectedEstimateId,
  compareEstimateIds, groupingMode })` already returns everything the donut-first
  view needs:
  - `estimateSheets: ProjectDataEstimateSheet[]` — `{ id, name, sheetCode,
    currencyCode, updatedAt, rowCount, totalCost }`;
  - `seriesByEstimateId: Record<string, ProjectChartEstimateSeries>` —
    pre-bucketed per estimate per grouping mode (`space`/`category`/`supplier`)
    plus `composition`. This is the donut's data source.
  - `selectedEstimateId`, `compareEstimateIds`, `selectedGroupingMode`,
    `rollup`, `didTruncate`, `rowLimit`.
- Data minimization (the `02` DB-4 / `05` SEC-1 closure) is preserved: raw
  qty / unit cost / supplier ids never reach the client; only pre-aggregated
  buckets do.

## Per-estimate donut data path (new accessor, client-only)

For each `EstimateColumn`, derive the donut `buckets` from the already-loaded
payload — **no new fetch**:

```ts
import { collapseProjectChartBuckets } from "@/lib/project-charts/aggregate-project-charts";
import type { CostBucket } from "@/lib/charts/types";

const modeSeries = summary.seriesByEstimateId[estimate.id]?.[groupingMode];
const buckets: CostBucket[] = modeSeries
  ? collapseProjectChartBuckets(modeSeries.allBuckets, 8) // top-8 + Other, CVD-safe colors
      .map((b) => ({
        id: b.id, label: b.label, total: b.total,
        share: b.share, rowCount: b.rowCount,
        color: b.color, isOther: b.isOther,
      }))
  : [];
const total = modeSeries?.total ?? estimate.totalCost;
```

`collapseProjectChartBuckets` is the same helper the sibling
`ProjectChartsClient` "share view" uses, so donut bucketing is consistent
across the two surfaces.

## Comparison view-model (used for header insight + deltas; no shared table)

`buildProjectChartComparisonView({ estimates, seriesByEstimateId,
groupingMode, estimateIds: displayEstimateIds, baselineEstimateId })` is still
called — but **only** to drive the header insight sentence and the
per-column baseline-relative delta badges. There is **no shared comparison
table** anymore (owner decision: breakdown is per-column). Each column's
donut + breakdown list comes from that estimate's own `seriesByEstimateId[id][mode]`
collapsed via `collapseProjectChartBuckets` (see accessor above).

## URL / query-param contract (unchanged)

`ProjectDataClient.replaceQuery` already writes the canonical params and is
reused verbatim:

| Param | Meaning | Example |
|-------|---------|---------|
| `sheet` | baseline estimate id | `?sheet=est-001` |
| `compare` | comma list of compare ids; `none` = explicit no-compare | `?compare=est-002,est-003` |
| `mode` | grouping; absent = `category` | `?mode=supplier` |

Legacy `left`/`right` are **still read** for back-compat
(`resolveProjectDataRouteState`) and **stripped on write** (the client deletes
them in `replaceQuery`). Deep links, the `/charts → /data` redirect, and the
`project-data-route-state.test.ts` assertions all continue to pass unchanged.

## Interaction → state mapping

| User action | Client state change | URL write |
|-------------|---------------------|-----------|
| Click `+` tile, pick a sheet | `compareEstimateIds` append (capped at 2 compares / 3 cols) | `compare=id1,id2` |
| Remove a non-baseline column (✕) | `compareEstimateIds` filter | `compare=…` (or `none`) |
| Swap a column's estimate (`DropdownSelect`) | that slot's id changes; baseline stays col 0 | `sheet`/`compare` updated |
| Change group-by (`SegmentedControl`) | `groupingMode` | `mode` (or absent) |
| Hover/focus a donut slice or ledger row | `activeBucketId` (shared) | none (ephemeral) |

`MAX_COMPARE_COLUMNS = 3` and the `remainingOptions` derivation are unchanged
from the current board, so the `+` tile's enabled/disabled logic is the same
gate the "Add sheet" picker already uses.
