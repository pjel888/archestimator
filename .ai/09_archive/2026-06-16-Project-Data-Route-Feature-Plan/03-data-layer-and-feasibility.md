# 03 — Data Layer & Feasibility

Research-only audit of what cost data the new `data` route can render for (a) a
per-estimate-sheet cost-breakdown donut and (b) project-wide cost tracking across
all estimate sheets. Read-only: no source, schema, or migration changes were made.

> Scope note: the `data` route already exists. `src/app/workshop/projects/[projectId]/data/page.tsx`
> currently renders the **cost-comparison** surface (`ProjectChartsClient`) driven
> by `getProjectChartsData`. The donut + cross-sheet tracking described below would
> be a new view layered on the *same* data layer — most of what's needed is already
> assembled.

---

## TL;DR feasibility

| Desired visual | Verdict |
|---|---|
| (a) Per-sheet cost donut by **category** | ✅ Render today — exact function exists |
| (a) Per-sheet cost donut by **supplier** | ✅ Render today |
| (a) Per-sheet cost donut by **space** | ✅ Render today |
| (b) Cross-sheet **comparison** (each sheet's total / category-stacked totals) | ✅ Render today (data exists; needs a thin aggregator) |
| (b) Cross-sheet **trend over real time** | ⚠️ Partial — only `created_at`/`updated_at` exist; not a true cost-history timeline |

---

## 1. Existing cost data shapes (what's already assembled)

### The canonical row-cost formula (one oracle, three call sites)
`src/lib/estimates/estimate-row-total.ts` → `computeEstimateRowLineTotal` /
`sumEstimateRowLineTotals`:

```
subtotal    = quantity * unit_cost
contingency = subtotal * contingency_percentage / 100
line_total  = subtotal + misc_cost + contingency
```

This mirrors the SQL `estimate_row_line_total` STABLE function byte-for-byte. The
charts/dashboard aggregation re-implements the identical maths in
`calculateProjectChartRowTotal` (`src/lib/project-charts/aggregate-project-charts.ts:110`).
**Cost is fully derivable from `estimate_row_items` columns** — no precomputed
per-row total column is needed.

### The pre-bucketed series contract (the key reusable asset)
`src/lib/project-charts/types.ts`:

- `ProjectChartBucket` = `{ id, label, total, share, rowCount, color, … }` — already
  carries **amount + percentage (`share`) per slice**: exactly a donut's input.
- `ProjectChartModeSeries` = `{ total, allBuckets }` — one estimate, one grouping mode.
- `ProjectChartEstimateSeries` = `Record<"space"|"category"|"supplier", ProjectChartModeSeries>`
  — one estimate, **all three groupings at once**.

### Where it's assembled
Two repository entry points already produce this, server-side (raw qty/unit-cost/
supplier-ids never cross the wire — only buckets do):

1. **`getProjectChartsData(projectId, { selectedEstimateIds })`**
   (`src/lib/repositories/project-charts-repository.ts:38`) — cross-estimate loader.
   Returns `ProjectChartsData`:
   - `estimateOptions: ProjectChartEstimateOption[]` — per-sheet `{ id, name, sheetCode, currencyCode, updatedAt, rowCount, totalCost }`. **This is a ready-made estimate-sheet selector + per-sheet totals list.**
   - `seriesByEstimateId: Record<estimateId, ProjectChartEstimateSeries>` — pre-bucketed series, but **only for the loaded estimates** (see §4 caveat).
   - `loadMode`, `requiresSelectedPair`, `didTruncate`, `rowLimit`, `estimateLimit`.

2. **`getDashboardEstimateSeries(projectId, estimateId)`**
   (`src/lib/repositories/project-dashboard-repository.ts:73`) — **single-estimate** loader.
   Returns `{ estimateId, estimateName, currencyCode, series: ProjectChartEstimateSeries, didTruncate }`.
   Deliberately loads exactly one estimate's facts (does not over-fetch the project)
   and reuses the same pure engine via `buildEstimateSeries`.

### How groupings are derived (per row)
`resolveBucket` (`aggregate-project-charts.ts:174`) routes by mode:
- **category** → walks `source_snapshot.categoryNodeId` up the global
  `component_category_nodes` taxonomy to the top-level `node_type === "category"`;
  falls back to `"Uncategorized"`.
- **supplier** → `source_snapshot.supplierId` (or row `supplier` text) against
  workspace `component_suppliers`; falls back to `"No supplier"`.
- **space** → the `estimate_nodes` node that directly owns the row (`node_id`);
  falls back to `"Unassigned space"`. Space mode also builds a nested tree
  (`buildSpaceTableRows`).

The category/supplier ids live in `estimate_row_items.source_snapshot` (JSONB),
written by `getSourceSnapshot` in `src/lib/estimates/actions.ts` (`categoryNodeId`,
`supplierId`, `supplier` are persisted there and preserved by
`sanitizeEstimateRowSourceSnapshot`).

### Per-estimate vs per-project totals
- **Per-estimate total** is available two ways: `ProjectChartEstimateOption.totalCost`
  (charts repo) and `ProjectChartModeSeries.total` (each grouping mode's series sums to
  the same number).
- **Project-wide rollup** is computed by the dashboard assembler
  `computeProjectCostRollup` (`project-dashboard-repository.ts:433`): sums every
  estimate's total **only under one shared currency**, else returns `{ kind: "mixed" }`.
  Source totals come from the `project_estimate_list_summaries` RPC (see §2).

---

## 2. The estimate-sheet model (selector + cross-sheet source)

Estimate sheets = the **`estimates`** table; each belongs to a project via
`project_id`. Schema (`src/lib/supabase/types.ts:2277`):

| Column | Use |
|---|---|
| `id` | sheet identity / selector value |
| `name` | sheet label |
| `sheet_code` | human code (e.g. `ES-001`) — selector secondary label |
| `currency_code` | per-sheet currency (drives the mixed-currency guard) |
| `project_budget` | per-sheet budget → variance |
| `notes` | free text |
| `created_at`, `updated_at` | **the only time signals** (see §4) |
| `created_by`, `metadata` | not needed for charts (and deliberately excluded from client list rows) |

**No `version_number` / `favorite` column on `estimates` itself.** Those live in
sibling tables:
- **`estimate_favorites`** (`types.ts:1548`) — `{ estimate_id, project_id, user_id, workspace_id, created_at }`. A favorite is a per-user pin, not a sheet attribute.
- **`estimate_sheet_versions`** (`types.ts:1937`) — named snapshots with
  `version_number`, `version_label`, `title`, `snapshot` (JSONB), `summary` (JSONB),
  `created_at`. These are *manual* version snapshots, **not** a continuous cost
  history (most sheets will have zero or few rows here).

### Cross-sheet listing (the cheapest project-wide source)
`listProjectEstimates(projectId)` (`workspace-repository.ts:1475`) returns every
sheet ordered `updated_at` DESC, plus four maps keyed by estimate id:
`firstNodeByEstimateId`, `nodeCountByEstimateId`, `rowCountByEstimateId`,
`totalCostByEstimateId`. The counts+totals come from one aggregate RPC,
**`project_estimate_list_summaries(target_project_id)`**
(`types.ts:3921`, returns `{ estimate_id, first_node_id, node_count, row_count, total_cost }[]`).

➡️ **A cross-sheet "total per sheet" chart needs nothing new** — this RPC already
returns every sheet's total in one round trip, with no per-sheet fact loading.

---

## 3. Per-sheet cost-breakdown donut (a)

**✅ Renderable today, exact function:**

> `getDashboardEstimateSeries(projectId, estimateId)`
> → `result.series.category.allBuckets` (or `.supplier` / `.space`)

Each bucket already has `total` (amount), `share` (0..1 percentage), `label`,
`color`, and `rowCount` — a complete donut dataset for the selected sheet, in any of
the three groupings, with no extra work. For top-N + "Other" collapse there's
`collapseProjectChartBuckets(buckets, limit)` (`aggregate-project-charts.ts:411`),
already used for donut share views.

This is the same engine the dashboard cost-mix donut uses, so colors/figures will
match the dashboard and the Compare tab (intentional — R14).

**Caveat (truncation):** the per-estimate loader caps at
`DASHBOARD_ESTIMATE_ROW_LIMIT = 5000` rows / `1500` nodes. On a sheet exceeding that,
`didTruncate` is `true` and the donut is partial — surface the existing "partial cost
data" affordance, don't hide it.

---

## 4. Cross-sheet "cost tracking" (b) — honest assessment

**What the data actually supports is comparison, with at best a weak time axis.**

What you can plot today, per sheet, across *all* sheets in the project:

1. **Each sheet's grand total** — from `project_estimate_list_summaries`
   (`totalCostByEstimateId`). Cheapest; one RPC; no fact loading. Bar/line of
   total-by-sheet.
2. **Each sheet's category- (or supplier-/space-) stacked total** — from
   `getProjectChartsData`'s `seriesByEstimateId`. This gives a stacked bar per sheet
   (the comparison view `buildProjectChartComparisonView` already unions buckets
   across sheets into aligned, same-colored slices).

**Ordering / "trend":**
- The only timestamps are `estimates.created_at` and `updated_at`. You can order
  sheets by either to get a **left-to-right sequence**, and label the x-axis with the
  date.
- **But this is not a true cost-over-time history.** `updated_at` is the *last touch*
  of the whole sheet, not when its cost reached a given value; editing any row moves
  it. `created_at` is fixed but says nothing about cost evolution. There is **no
  per-day / per-event cost snapshot stream** to drive a real trend line. (The closest
  thing — `estimate_sheet_versions.summary` JSONB — is sparse, manual, and not
  guaranteed to carry a comparable total; it is not a reliable timeseries.)

➡️ **Recommendation:** frame (b) as **"compare cost across the project's estimate
sheets"** (sheets side-by-side, optionally ordered by created/updated date), not
"cost tracked over time." A real time-trend would need new data (see §5, gap G3).

**Scaling caveat:** `getProjectChartsData` only ships pre-bucketed series for the
*loaded* estimates. When a project has > `ESTIMATE_CHART_LIMIT` (20) sheets (or the
100-option cap is hit), it switches to `loadMode: "selected-pair"` and loads only
~2–3 selected sheets' series (`requiresSelectedPair: true`). So a stacked-by-category
chart across *every* sheet is only guaranteed for ≤ 20 sheets. A **totals-only**
cross-sheet chart has no such limit (it uses the summaries RPC).

---

## 5. Data gaps & risks

| # | Gap | Needed for | Severity | Where it lives |
|---|---|---|---|---|
| G1 | **No project-wide cross-sheet category/supplier series in one call.** `getProjectChartsData` only buckets the *loaded* sheets; ≤20-sheet projects get all, larger ones get a selected subset. | (b) category-stacked chart across *all* sheets | Repository-layer add (easy–moderate) | `project-charts-repository.ts` (raise/relax limits, or add a totals+buckets project loader) |
| G2 | **No "all sheets' donut series" convenience loader.** Today you call `getDashboardEstimateSeries` per sheet (N round trips) or accept the charts-repo subset. | Efficient multi-sheet breakdown | Repository-layer add (easy) — loop or batch over `buildEstimateSeries` | `project-dashboard-repository.ts` |
| G3 | **No cost timeseries.** Only `created_at`/`updated_at` exist; no per-day/per-event total snapshot. | True "cost tracking over time" trend | **Schema change (hard)** — would need a cost-snapshot table or to derive totals from `estimate_sheet_events`/`estimate_sheet_versions` | DB |
| G4 | **`get_project_chart_buckets` RPC is NOT applied.** Code comments reference it as a push-down; it lives only in `supabase/migrations-pending-review/deferred/20260614021500_get_project_chart_buckets_rpc.sql`. Aggregation is currently the JS reduce in the repository. | Faster server-side bucketing | Optional perf migration (not required to ship) | pending-review migration |
| G5 | **Truncation caps** (5000 rows / 1500 nodes per estimate; 5000 rows / 1500 nodes cross-estimate). Large sheets yield partial donuts (`didTruncate`). | Accurate totals on huge sheets | Surface the flag (no fix needed) | charts + dashboard repos |
| G6 | **Mixed-currency projects** cannot show a single project-wide total (`rollup.kind === "mixed"`). | Project-wide rollup number | By design — render per-currency or mark mixed | `computeProjectCostRollup` |

None of G1, G2, G4, G5 block shipping. **G3 is the only true data-model gap** and only
matters if "tracking over time" is taken literally rather than as cross-sheet
comparison.

---

## What we can render TODAY (no new data work)

- **Estimate-sheet selector**: `ProjectChartsData.estimateOptions` (or
  `listProjectEstimates`) — id, name, sheetCode, currencyCode, updatedAt, rowCount,
  totalCost per sheet.
- **(a) Per-sheet donut** by category / supplier / space:
  `getDashboardEstimateSeries(projectId, estimateId).series.<mode>.allBuckets` →
  `{ total, share, label, color }` per slice; `collapseProjectChartBuckets` for top-N.
- **(b) Cross-sheet total-by-sheet** bar/line: `totalCostByEstimateId` from
  `listProjectEstimates` (via `project_estimate_list_summaries` RPC) — every sheet,
  one round trip.
- **(b) Cross-sheet category/supplier-stacked** (≤ ~20 sheets):
  `getProjectChartsData().seriesByEstimateId` + the existing
  `buildProjectChartComparisonView` aligner.
- **Project-wide rollup total** (single currency): `computeProjectCostRollup`.
- **Variance vs budget** per sheet: `estimates.project_budget` →
  `computeVariance` (already in the dashboard repo).

## What needs NEW data work

- **(b) Category/supplier-stacked across ALL sheets when > 20 sheets** — repository
  add to load buckets for every sheet (relax/replace the selected-pair limit), or a
  new project-level bucket loader. *Repository-layer, easy–moderate.* (G1/G2)
- **(b) True cost-over-time trend** — needs a cost-snapshot timeseries that does not
  exist. *Schema change, hard. Recommend scoping (b) as comparison instead.* (G3)
- **(optional) Server-side bucket push-down** — apply the deferred
  `get_project_chart_buckets` RPC. *Perf only, not required.* (G4)
