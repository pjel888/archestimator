# 01 — Current-State Audit

**Scope:** the project "data" route (formerly "charts"),
`src/app/workshop/projects/[projectId]/data/`, its rendered visualization tree
under `src/components/workshop/project-charts/`, and the supporting lib in
`src/lib/project-charts/` + `src/lib/repositories/project-charts-repository.ts`.

**Status:** RESEARCH-ONLY. No source was modified. All paths are repo-relative.

**One-line verdict:** the route was renamed `charts → data` at the URL/nav layer
only — it still mounts the full multi-estimate **cost-comparison** UI. That UI
(variance spine, composition bars, comparison table, insight engine, 3-up
estimate picker, baseline selector, cross-highlight/pin interaction) is the
"unnecessarily complex" surface the user wants gone. The **good news**: the
simpler thing the user wants (a per-sheet cost donut that changes when you pick
an estimate) **already exists and ships today** as `DashboardCostMix` on the
project dashboard, built on the *same* lib. So the redesign is mostly **delete +
relocate the existing donut**, not build-from-scratch.

---

## 1. The current `/data` route surface

Three route files, all freshly created in the `charts → data` rename:

### `src/app/workshop/projects/[projectId]/data/page.tsx` (47 LOC)

Server component. Behavior:

- **Params:** `projectId` (path). **Search params:** `left`, `right`, `mode`
  (all optional strings) — `page.tsx:11-16`.
- Calls `assertRouteErrorSmoke({ routeLabel: "Project data", ... })`
  (`page.tsx:21`) — a shared error-boundary smoke hook, not charts-specific.
- Collects `left`+`right` into `selectedEstimateIds` and calls
  `getProjectChartsData(projectId, { selectedEstimateIds })`
  (`page.tsx:23-26`). `notFound()` if the project is missing.
- Computes a `defaultPair` via `getProjectChartDefaultPair(data.estimateOptions)`
  = `{ estimates[0], estimates[1] }` (`page.tsx:32`,
  `aggregate-project-charts.ts:72-79`).
- Renders `ProjectChartsClient` with `initialLeftEstimateId`,
  `initialRightEstimateId`, `initialGroupingMode` (`page.tsx:34-41`).
- `readGroupingMode` (`page.tsx:44-46`) coerces `mode` to one of
  `space | category | supplier`, **default `space`**.

**Default behavior with no search params:** load every estimate (or the first
two when the project is large), baseline = first estimate, comparand = second,
grouping = Space, view = Variance if ≥2 estimates else Composition.

> The file/symbol name is still `ProjectDataPage`→`ProjectChartsClient`,
> `projectChartsPage` in fixtures — the rename did **not** touch internal
> "charts" naming.

### `src/app/workshop/projects/[projectId]/data/loading.tsx` (55 LOC)

Route skeleton hand-shaped to the comparison layout: header band + insight
panel, a control row, **variance-spine rows**, and a two-column detail-table
grid (`loading.tsx:20-52`). It is purpose-built for the heavy UI and references
"cost-comparison page" in its own docblock (`loading.tsx:4`). A simpler route
would need a simpler skeleton — this one is married to the current design.

### `src/app/workshop/projects/[projectId]/data/error.tsx` (13 LOC)

Generic — delegates to the shared `WorkshopRouteErrorState` with
`routeLabel="Project data"`. **Reusable as-is** for any future design.

**Route nav / deep-link contract (who points here):**

- Sidebar: `ProjectMiniSidebar.tsx:43` → `/data`, label "Data".
- Breadcrumb: `WorkshopBreadcrumbs.tsx:27-28` → label "Data".
- Dashboard CTA: `ProjectDashboardClient.tsx:238` → `${projectRoute}/data`.
- Dashboard repo row link: `project-dashboard-repository.ts:650` →
  `/data?left=${selectedEstimate.id}`.
- Presence surface tag: `presence-surface.ts:51` maps `/data` → "data".
- Cache revalidation: `estimates/actions.ts:1217`, `projects/actions.ts:170`
  both `revalidatePath(.../data)`.
- **`buildCompareHref`** (`src/lib/workshop/compare-href.ts:11-23`) is the
  canonical builder of the `?left=&right=&mode=` deep link; called from
  `DashboardCostMix.tsx:191`, `DashboardWorkSummary.tsx:84`,
  `DashboardEstimateList.tsx:100` as a "Compare breakdown" affordance.

> **Redesign consequence:** if the comparison view is deleted, the
> `?left/right/mode` contract and every "Compare breakdown" link lose their
> meaning. These are the load-bearing external couplings to plan around (see §5).

---

## 2. The complex visualization to be deleted

Mounted by `ProjectChartsClient` (`page.tsx:3`). Total component tree ≈ **803
LOC** across 6 files. It is a *comparison analytics tool*, not a cost viewer.

### `ProjectChartsClient.tsx` — 353 LOC — **DELETE (gut)**

The orchestrator. Holds **7 pieces of client state**: `groupingMode`,
`selectedEstimateIds` (up to **3** estimates, `MAX_CHART_COLUMNS = 3`),
`preferredBaselineEstimateId`, `viewMode` (`variance | composition | share`),
`hoverBucketId`, `pinnedBucketId` (`ProjectChartsClient.tsx:69-85`). Builds the
comparison view-model via `buildProjectChartComparisonView` (`:92-102`), derives
`hasComparison`/`effectiveViewMode`/`activeBucketId`, manages add/remove-estimate
(`:125-139`), baseline pinning, hover→pin cross-highlight (`:141-147`), a
dynamic-imported donut "Share" view (`:26-39`, `:108-118`), and four
truncation/empty banners (`:242-263`).

**Why complex:** three independent control axes (break-down-by × baseline ×
view-mode) over up to three estimates, plus a shared hover/pin highlight bus
wired through every child. The header alone is "{Project} · **Cost comparison**".
Cognitive load is the whole point of the screen — it asks the user to *reason
about variance between estimates*, which is exactly the framing the user is
rejecting. **Verdict: DELETE.** Only the estimate-picker `DropdownSelect` pattern
and the `collapseProjectChartBuckets(...8)` call are conceptually reusable, and
both already exist in `DashboardCostMix` in cleaner form.

### `ProjectVarianceSpine.tsx` — 154 LOC — **DELETE**

The headline view (`08` band 3). One row per bucket sorted by |Δ|; each
estimate's value is a marker on a **shared horizontal scale**, the gap between
markers being the variance; direction reinforced three ways (hue + up/down arrow
+ signed Δ). Props: `{ view, tableId, activeBucketId, onActiveBucketChange,
onTogglePin }`. Hover/click drive the shared highlight + pin.

**Why complex:** a bespoke marker-on-shared-domain chart (`domainMax` scan,
`toPercent`, min/max connector geometry, `:40-44`, `:80-140`). It is a *variance*
visualization — meaningless without two estimates and directly contrary to the
"just show me this sheet's cost" goal. **Verdict: DELETE.** Nothing salvageable
toward a single-sheet donut.

### `ProjectComparisonBars` → `ProjectCompositionBars.tsx` — 94 LOC — **SALVAGE-FOR-PARTS**

100%-stacked horizontal bar **per estimate**, one shared stable color per
category across estimates, with a legend. Props: `{ view, activeBucketId,
onActiveBucketChange, onTogglePin }`.

**Why complex toward the goal:** it renders **N estimates at once** for
side-by-side composition comparison (`:48-77`) — again a comparison frame. But
the *single-estimate* slice of it (one stacked bar = one sheet's cost mix) is a
legitimate simple visualization. **Verdict: SALVAGE-FOR-PARTS** — the
per-estimate stacked-bar + legend is a viable secondary view next to a donut, but
the multi-estimate looping and the highlight bus would be stripped. Lower
priority than the donut.

### `ProjectComparisonTable.tsx` — 117 LOC — **SALVAGE-FOR-PARTS**

The detail table and the accessible text alternative for every chart (each chart
points here via `aria-describedby`). Columns: Bucket · per-estimate Cost+Share ·
Δ · Δ% (`:38-52`). Rows are the keyboard/SR-operable surface driving the shared
highlight/pin.

**Why complex:** dynamic `colSpan` per estimate, Δ/Δ% columns, letter cue tokens,
focus/blur→highlight wiring. The Δ columns are comparison-only. **Verdict:
SALVAGE-FOR-PARTS** — a single-estimate variant (drop Δ/Δ%, drop the highlight
bus) is essentially the same shape as the dashboard's existing
`DashboardBreakdownTable.tsx`, which is the better starting point. Prefer the
dashboard table; this one can be deleted.

### `ProjectComparisonHeader.tsx` — 69 LOC — **DELETE**

Header band: `<h1>` "{Project} · Cost comparison", currency chip, a subtitle
naming what's compared, and the **auto-generated insight sentence** ("{Comparand}
is ₱X (Δ%) lower than {Baseline}, driven mostly by…") via `buildInsightSentence`
(`:29`, `build-insight-sentence.ts`).

**Why complex / why delete:** the insight sentence *is* the comparison product's
"heart" per its own docblock — pure comparison semantics. A single-sheet cost
view has no baseline/comparand and no Δ, so the insight is undefined.
**Verdict: DELETE** (header + the entire `build-insight-sentence.ts` engine).

### `ProjectCostDonutChart.tsx` — 16 LOC — **KEEP (already a thin re-export)**

Not an implementation — a backward-compat shim that re-exports the **shared**
`CostDonutChart` from `src/components/charts/CostDonutChart.tsx` and aliases the
`CostBucket` type (`:10-13`). The real donut (15.3 KB, d3-shape) lives in
`src/components/charts/` and is **already used by the dashboard
(`DashboardCostMix.tsx:138`) and the public share page
(`SharePageTabs.tsx:361`)**.

**Verdict: the shared `CostDonutChart` is exactly the component the redesign
wants** — `{ buckets, total, currencyCode, label, compact, hideCallouts,
describedById }`. The 16-LOC `ProjectCostDonutChart` shim can be deleted once
nothing in `project-charts/` imports it; callers should import
`@/components/charts/CostDonutChart` directly (the dashboard already does).

---

## 3. The supporting lib — what it produces and what is reusable

`src/lib/project-charts/` (1121 LOC across 6 files) +
`project-charts-repository.ts` (325 LOC). **Critically, this lib is NOT exclusive
to the data route** — the dashboard, the AI read-context, and the dashboard
repository all depend on it (see the import map in §5). It cannot be deleted
wholesale; it must be triaged module by module.

| File | LOC | What it produces | Reusable for simple per-sheet donut? |
|---|---|---|---|
| `types.ts` | 133 | All chart type contracts: `ProjectChartBucket`, `ProjectChartEstimateSeries`, `ProjectChartsData`, etc. | **YES — core.** `ProjectChartBucket` + `ProjectChartEstimateSeries` are exactly the donut's input. Already imported by dashboard + `compare-href` + `dashboard-types`. Keep; some comparison-only types (`ProjectChartComparison*`) can be pruned. |
| `aggregate-project-charts.ts` | 469 | The aggregation engine: rows→buckets per grouping mode (`buildProjectChartSeries`), space-tree table rows, top-N+"Other" collapse (`collapseProjectChartBuckets`), `getProjectChartDefaultPair`, `buildProjectChartComparison`. | **YES — core, partly.** `buildProjectChartSeries` + `collapseProjectChartBuckets` are exactly what produces donut buckets and are already used by the dashboard and AI context. `buildProjectChartComparison` (`:81-100`) and `getProjectChartDefaultPair` (only used by the route, `:72-79`) are comparison-only and droppable. |
| `project-comparison-view.ts` | 318 | Two roles: (a) `buildEstimateSeries`/`buildSeriesByEstimate` — the server aggregation used by **both** repositories; (b) `buildProjectChartComparisonView` + insight input — the comparison view-model used **only** by `ProjectChartsClient`. | **PARTIAL.** Keep the `buildEstimateSeries`/`buildSeriesByEstimate` half (dashboard repo at `:123`, charts repo at `:119` depend on it). The `buildProjectChartComparisonView*` + `buildInsightInput` half is comparison-only and droppable. |
| `bucket-color.ts` | 78 | `colorForBucket` — stable Okabe–Ito CVD-safe color per bucket id. | **YES — core.** The donut + dashboard table both color by this. Already used by dashboard tests. Keep. |
| `format.ts` | 31 | `formatChartMoney`, `formatChartShare`, `formatSignedChartMoney`, `bucketCueToken`. | **YES — core.** Used across all dashboard components (`DashboardCostMix`, `DashboardHeadline`, `DashboardWorkSummary`, etc.). Keep. |
| `build-insight-sentence.ts` | 92 | The comparison insight-sentence generator + `formatDeltaPercent`. | **MOSTLY NO.** Comparison-only. `formatDeltaPercent` is reused by the comparison table/spine; if those go, this whole file can go. Verify no dashboard import (there is none today). |
| `project-charts-repository.ts` | 325 | `getProjectChartsData` — loads estimate options + row/node/category/supplier facts (with limits), aggregates server-side into `seriesByEstimateId`, returns `ProjectChartsData`. **Used only by the data route.** | **YES, but the dashboard already has a leaner equivalent.** `project-dashboard-repository.ts` deliberately does NOT wrap this (`:30` docblock) — it loads one estimate's facts and calls `buildEstimateSeries` directly. A simple data route should follow the dashboard pattern, so `getProjectChartsData` (multi-estimate, pair-selection, truncation banners) is droppable. |

**Bottom line for the redesign:** the per-sheet donut needs only
`buildEstimateSeries`/`buildProjectChartSeries` + `collapseProjectChartBuckets` +
`colorForBucket` + `format.ts` + the `CostDonutChart` component — **all of which
already exist and are already wired up in `DashboardCostMix`.** The
comparison-specific code (`buildProjectChartComparison`,
`buildProjectChartComparisonView`, `build-insight-sentence.ts`, the comparison
view types, and `getProjectChartsData`) is what is genuinely deletable.

---

## 4. What the route is FOR today vs. what the user wants — the gap

**Today (`/data`):** a **multi-estimate cost-comparison analytics tool.** Pick up
to 3 estimates, choose a baseline, break down by space/category/supplier, and
read the variance between estimates as a marker-spine + stacked bars + Δ table +
an auto-written "X is ₱Y lower than Z" insight sentence, with a shared
hover/pin cross-highlight across all surfaces. It answers *"how do these
estimates differ and why?"*

**Wanted:** a **simple cost-visualization view.** A donut of one estimate
sheet's cost breakdown that updates when you pick a different sheet, plus
**project-wide cost tracking across estimate sheets** (totals/trend per sheet,
not pairwise variance). It answers *"what does this sheet cost and how is it
split?"* and *"what's the cost across all my sheets?"*

**The gap, crisply:**
- **Comparison → single-subject.** Drop baseline/comparand, Δ, Δ%, insight
  sentence, the 3-up picker, and the variance spine entirely.
- **Analytical → glanceable.** Replace the three-axis control matrix with at most
  a sheet-picker + a break-down-by toggle (the dashboard's `DashboardCostMix`
  control set).
- **New capability needed:** "project-wide cost tracking across estimate sheets"
  does **not** exist today in any form — the current viz is strictly pairwise.
  This is the one genuinely new build; everything else is delete + relocate.
- **Redundancy to resolve:** the wanted per-sheet donut already lives on the
  **project dashboard** (`DashboardCostMix`). The redesign must decide whether
  `/data` becomes a fuller "cost across all sheets" surface that the dashboard
  donut links into, or whether it duplicates the dashboard. Recommend the former.

---

## 5. Deletion inventory

LOC and import-references verified by grep over `src` + `tests`. **Risk tiers:**
🟢 safe (route-local only) · 🟡 caution (shared — gut, don't delete) · 🔴 blocked
(load-bearing for other surfaces).

### A. Route + comparison UI — deletable (with test/story cleanup)

| File | LOC | Imported by (outside the file) | Risk | Note |
|---|---|---|---|---|
| `src/components/workshop/project-charts/ProjectChartsClient.tsx` | 353 | `data/page.tsx`, `stories/charts/project-cost-comparison.stories.tsx`, `tests/vitest/project-charts-a11y.test.tsx`, `tests/vitest/project-charts-ui.test.tsx` | 🟢 | Delete; remove story + 2 tests + the `project-dashboard-charts-ui.test.ts` assertions on its contents. |
| `src/components/workshop/project-charts/ProjectVarianceSpine.tsx` | 154 | only `ProjectChartsClient` (+ fixture read in `project-dashboard-ui-fixtures.ts:36`) | 🟢 | Delete; drop the fixture line + its assertion. |
| `src/components/workshop/project-charts/ProjectComparisonHeader.tsx` | 69 | only `ProjectChartsClient` | 🟢 | Delete. |
| `src/components/workshop/project-charts/ProjectComparisonTable.tsx` | 117 | only `ProjectChartsClient` (+ fixture `:37`) | 🟢 | Delete (prefer `DashboardBreakdownTable`); drop fixture line + assertion. |
| `src/components/workshop/project-charts/ProjectCompositionBars.tsx` | 94 | only `ProjectChartsClient` | 🟢 | Delete (or salvage single-estimate stacked bar). |
| `src/components/workshop/project-charts/ProjectCostDonutChart.tsx` | 16 | `ProjectChartsClient` (dynamic), fixture `:31`, `project-dashboard-charts-ui.test.ts:52-54` | 🟢 | Delete the shim once the client is gone; **the real donut is `src/components/charts/CostDonutChart.tsx` and stays.** |
| `src/lib/repositories/project-charts-repository.ts` | 325 | `data/page.tsx`, asserted by `project-dashboard-charts-ui.test.ts:23` | 🟢 | Delete `getProjectChartsData`; the dashboard repo (`buildEstimateSeries`) is the replacement pattern. |
| `src/app/workshop/projects/[projectId]/data/loading.tsx` | 55 | route auto-wired | 🟢 | Rewrite to match the new (simpler) layout, not keep. |
| `src/lib/project-charts/build-insight-sentence.ts` | 92 | `ProjectComparisonHeader`, `ProjectComparisonTable`, `ProjectVarianceSpine`; tested by `project-charts-comparison-view.test.ts` | 🟢 | Deletable **only after** the 3 components go (and the test). No dashboard import. |

### B. Lib — shared, **gut don't delete** (comparison-only exports prunable)

| File | LOC | Non-route consumers that BLOCK full deletion | Risk | Prune target |
|---|---|---|---|---|
| `src/lib/project-charts/types.ts` | 133 | `DashboardBreakdownTable`, `DashboardCostMix`, `DashboardEstimateList`, `DashboardWorkSummary`, `read-context.ts`, `dashboard-types.ts`, `compare-href.ts`, both repositories | 🔴 | Keep file; may drop `ProjectChartComparison*` / `ProjectChartComparisonRow` types. |
| `src/lib/project-charts/aggregate-project-charts.ts` | 469 | `read-context.ts` (`buildProjectChartSeries`), `DashboardCostMix` (`collapseProjectChartBuckets`), `estimate-unification-oracle.test.ts` (`calculateProjectChartRowTotal`) | 🔴 | Keep `buildProjectChartSeries`/`collapseProjectChartBuckets`/`calculateProjectChartRowTotal`; drop `buildProjectChartComparison` + `getProjectChartDefaultPair` (route-only). |
| `src/lib/project-charts/project-comparison-view.ts` | 318 | `project-dashboard-repository.ts` (`buildEstimateSeries`), `project-charts-repository.ts` (`buildSeriesByEstimate`) | 🔴 | Keep the `buildEstimateSeries`/`buildSeriesByEstimate` half; drop `buildProjectChartComparisonView*` + insight builder. |
| `src/lib/project-charts/bucket-color.ts` | 78 | `DashboardCostMix` palette, dashboard tests | 🔴 | Keep entirely. |
| `src/lib/project-charts/format.ts` | 31 | 5+ dashboard components | 🔴 | Keep entirely. |
| `src/lib/workshop/compare-href.ts` | 32 | `DashboardCostMix:191`, `DashboardWorkSummary:84`, `DashboardEstimateList:100` | 🟡 | `buildCompareHref` targets the soon-defunct `?left/right/mode` contract; the **three dashboard "Compare breakdown" links must be repointed or removed** when the comparison view dies. `buildEstimateSheetHref` is unrelated — keep. |

### C. Out of blast radius — **do not touch**

| File | Why it's safe |
|---|---|
| `src/components/charts/CostDonutChart.tsx` (+ `src/lib/charts/{types,svg-rounding}.ts`) | The shared donut the redesign should reuse. Used by dashboard + share page. |
| `src/components/workshop/dashboard/*` (`DashboardCostMix`, `DashboardBreakdownTable`, etc.) | The already-shipping simple per-sheet donut — the model for the redesign, not a deletion target. |
| `src/lib/ai/read-context.ts` | AI context builder; consumes `buildProjectChartSeries` only. Independent of the route UI. |
| `src/lib/repositories/project-dashboard-repository.ts` | Powers the dashboard; consumes `buildEstimateSeries`. (Note: `:650` deep-links to `/data?left=` — repoint when comparison goes.) |
| `src/app/.../data/error.tsx` | Generic shared error state; reusable. |

### Tests/stories that reference the deleted surface (must be updated, not blockers)

`tests/vitest/project-charts-a11y.test.tsx`,
`tests/vitest/project-charts-ui.test.tsx`,
`tests/vitest/project-charts-comparison-view.test.ts`,
`tests/vitest/project-charts-golden-master.test.ts`,
`tests/vitest/project-charts-payload-contract.test.ts`,
`tests/vitest/project-charts-cache-freshness.test.ts`,
`tests/vitest/project-charts-aggregation.test.ts` (keep aggregation parts),
`tests/vitest/project-dashboard-charts-ui.test.ts` (route + donut assertions),
`tests/vitest/project-dashboard-ui-fixtures.ts` (fixture reads at lines 29-37),
`src/stories/charts/project-cost-comparison.stories.tsx`.

> `project-charts-bucket-color.test.ts` and the dashboard tests for
> `format`/`bucket-color` stay green — those modules survive.

---

## Net deletion footprint

- **Hard-delete (route-local):** ~6 components (≈803 LOC incl. shim) +
  `project-charts-repository.ts` (325) + `build-insight-sentence.ts` (92) +
  rewrite `loading.tsx`. ≈ **1,200+ LOC removed.**
- **Gut (shared lib):** prune comparison-only exports from
  `aggregate-project-charts.ts`, `project-comparison-view.ts`, `types.ts` while
  keeping the per-sheet aggregation path the dashboard depends on.
- **Reuse, don't rebuild:** `CostDonutChart`, `DashboardCostMix`/
  `DashboardBreakdownTable` patterns, `buildEstimateSeries`,
  `collapseProjectChartBuckets`, `colorForBucket`, `format.ts`.
- **One genuinely new thing to build:** project-wide cost tracking *across*
  estimate sheets — absent today.
- **Two couplings to repoint:** the `?left/right/mode` deep-link contract
  (`compare-href.ts` + 3 dashboard links + `project-dashboard-repository.ts:650`)
  and the route nav labels (already say "Data").
