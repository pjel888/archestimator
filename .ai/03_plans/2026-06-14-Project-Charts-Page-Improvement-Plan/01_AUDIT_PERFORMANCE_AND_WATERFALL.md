# 01 — Performance & Rendering Waterfall Audit

**Scope:** `/workshop/projects/[projectId]/charts`. All line numbers verified
against the working tree on 2026-06-14.

## Executive summary

The page ships **raw fact rows** (up to 5,000 row items + 1,500 nodes + 1,000
categories + 1,000 suppliers) inside the RSC payload, then performs **100% of
aggregation in the browser** — and re-runs that aggregation from scratch on every
grouping / estimate / add-chart interaction. Inside that aggregation is a genuine
algorithmic defect: a lookup `Map` over **all** nodes/categories/suppliers is
reconstructed **once per row**, turning bucket resolution into O(rows × dimension)
instead of O(rows + dimension).

The single highest-impact win is **PERF-2: move aggregation server-side** (a
Postgres RPC or a repository-level reduce) so only pre-bucketed series cross the
wire. It simultaneously kills the payload problem (PERF-2), the per-row Map bug
(PERF-3), the recompute-on-interaction (PERF-4), and the hydration cost (PERF-7).

**Volume caveat (read with `02` §E):** the audited project has *tens* of rows,
not thousands. The performance defects are **latent** — invisible today, a wall
the first time a real project has a few thousand line items. They are cheap to
fix now and the fix doubles as a data-minimization win (`05` SEC-1).

---

## The waterfall (navigation → charts paint)

Every navigation to this route is serialized through **three** server awaits
*before* the charts page body runs, then a fourth fetch inside the page, all
behind a client overlay with a 250 ms floor:

1. **Client overlay floor** — `src/stores/navigation-ui-store.ts:11`
   `MIN_DISPLAY_MS = 250`; `hide()` (`:40-55`) defers clearing by
   `max(0, 250 − elapsed)`. Wired globally at `src/app/providers.tsx:40`. Even an
   instant response shows the spinner ≥ 250 ms. (Same pattern flagged in the
   estimates/library plans.)
2. **`WorkshopPageShell`** (`src/components/workshop/WorkshopPageShell.tsx:83-86`)
   awaits `Promise.all([getCurrentUserContext(), getSidePanelWidthCssVariables()])`
   before any shell content. `getCurrentUserContext` runs `supabase.auth.getUser()`
   (network round-trip) + a `profiles` select. It is `cache()`-wrapped (dedupes
   within a request) but still paid once per navigation.
3. **`ProjectLayout`**
   (`src/app/workshop/projects/[projectId]/layout.tsx:24-31`) awaits
   `getCurrentWorkspaceProject(projectId)` **first**, *then* a second `Promise.all`
   fan-out of three more queries. Two-stage await — the fan-out cannot start until
   the project resolves. Independently noted as the heaviest route in the app.
4. **Charts page** (`charts/page.tsx:26`) only now runs `getProjectChartsData`,
   which **re-resolves** `getCurrentWorkspaceProject` again
   (`project-charts-repository.ts:41`) and fires its own 4-way `Promise.all`
   (`:87-92`).

Net: ~3 sequential DB/auth gates chained ahead of a charts fetch that itself
re-derives the workspace, before the client even receives bytes to hydrate.

---

## Findings

### PERF-2 — Raw facts shipped in the RSC payload; all aggregation is client-side — **Critical (headline)**

**Evidence:** `getProjectChartsData` returns `rowFacts` (≤5,000), `nodeFacts`
(≤1,500), `categoryNodeFacts` (≤1,000), `supplierFacts` (≤1,000) as plain arrays
(`project-charts-repository.ts:112-130`; limits `:16-19`). The page passes the
whole `data` object to the client (`page.tsx:35`); `ProjectChartsClient` calls
`buildProjectChartSeries` over those arrays (`ProjectChartsClient.tsx:85-93`). The
donut/bubble only ever consume **buckets** (≤ 8 after `collapseTopBuckets`,
`aggregate-project-charts.ts:387`), so the entire fact corpus is shipped purely to
be reduced to a handful of buckets in-browser.

**Quantified payload:** each `ProjectChartRowFact` has 12 fields (`types.ts:13-26`)
— UUIDs + numbers, field names repeated per row, no key compression →
conservatively ~180–250 serialized bytes/row. At 5,000 rows that is **~0.9–1.25 MB
for rowFacts alone**; nodes (~180 KB) + categories (~100 KB) + suppliers (~90 KB)
→ **worst-case ~1.3–1.6 MB uncompressed (~250–400 KB gzipped)** to render charts
whose meaningful output is a dozen buckets. The `selected-pair` guard (`:78`) caps
loaded *estimates*, not per-estimate *row volume*.

**Fix (highest-impact):** aggregate server-side. Either a Postgres RPC returning
pre-bucketed series per `(estimateId, groupingMode)` (`02` DB-4), or run the
`buildProjectChartSeries` reduce in the repository and return only
`{ estimateId, total, buckets, tableRows }`. Wire crosses in KB, not MB.

---

### PERF-3 — Lookup `Map` rebuilt once per row inside bucket resolution (O(rows × dimension) bug) — **Critical**

**Evidence:** `buildSeries` loops over every row (`aggregate-project-charts.ts:111`)
and calls `resolveBucket` → `resolveSpaceBucket` per row. `resolveSpaceBucket`
(`:169-170`) runs **`const nodeById = new Map(nodes.map((node) => [node.id, node]))`
on every invocation** — once per row. Identical defect in `resolveCategoryBucket`
(`:323-324`) and `resolveSupplierBucket` (`:346-347`).

**Quantified cost:** space mode = 5,000 rows × building a 1,500-entry Map ≈
**7.5 M Map insertions per series**, per column; 3 columns ≈ **22.5 M**,
recomputed on every interaction (PERF-4). The Map is *identical* every iteration —
it depends only on `nodes`, never on `row`. Correct cost is one Map build + 5,000
lookups.

**Tell:** `buildSpaceTableRows` (`:201`) builds its `nodeById` Map **correctly —
once, outside the row loop** — proving the per-row rebuild is an oversight, not a
constraint.

**Fix:** hoist the three Map constructions out of the per-row path (build once in
`buildSeries`, pass into `resolveBucket`). ~1000× reduction in the space-mode hot
loop. Subsumed entirely if PERF-2's server aggregation lands; valuable as a
~5-line standalone quick win if server work is deferred.

---

### PERF-4 — `data` in the `useMemo` dependency array forces full multi-column recompute on every state change — High

**Evidence:** `ProjectChartsClient.tsx:97` — `chartColumns` deps are
`[chartEstimateIds, data, groupingMode]`. `data` is a fresh prop object each
render; any of switching Group By, changing an estimate, or Add/Remove triggers a
from-scratch `buildProjectChartSeries` for **all** active columns (`.map` at
`:78-95`), each re-incurring PERF-3's Map cost.

**Cost:** a single "Group By → Category" click on a 3-column / 5,000-row project
re-runs ~15 M Map insertions + full sort/collapse synchronously on the main thread
→ multi-hundred-ms jank, no debounce. The donut sub-`useMemo`
(`CostDonutChart.tsx:249`) and bubble `useMemo`
(`ProjectCostBubbleChart.tsx:29`) then re-run on the new bucket arrays.

**Fix:** with server-side buckets (PERF-2) this reduces to a cheap pick.
Short-term: memoize per-column series keyed by `(estimateId, groupingMode)` so
unchanged columns are reused.

---

### PERF-7 — Hydration cost: thousands of fact objects serialized, transferred, parsed, then re-derived client-side — High

**Evidence:** props flow `getProjectChartsData → page.tsx:35 → ProjectChartsClient`.
React serializes the full `data` into the RSC flight stream; the client
deserializes the entire corpus during hydration, then immediately discards it to
≤ 8 buckets via `buildProjectChartSeries`. The facts are never displayed raw.

**Cost:** on a 5,000-row project, ~1.3–1.6 MB of JSON parsed on the client main
thread at hydration, plus the synchronous initial `buildProjectChartSeries` pass
(PERF-3 cost) before first interactive paint.

**Fix:** server aggregation (PERF-2) shrinks the hydration payload to a few
KB/column.

---

### PERF-1 / PERF-6 — No `charts/loading.tsx`; the slow fetch shows a wrong-shape skeleton — Medium

**Evidence:** `ls charts/` → only `error.tsx` + `page.tsx`, **no `loading.tsx`**
(every sibling route — `estimates/`, `projects/` — has one). During
`getProjectChartsData` the user sees the layout's
`<Suspense fallback={<ProjectRouteContentFallback />}>` (`layout.tsx:69`) — a
sidebar/table skeleton that looks nothing like the chart grid — plus the global
250 ms spinner. There is no chart-shaped placeholder anywhere in the route.

**Cost:** layout shift / wrong-shape skeleton on every charts navigation, on the
app's slowest route fetch.

**Fix:** add `charts/loading.tsx` rendering a skeleton matching the **redesigned**
layout (header band + variance block + table rows — see `08`), not the current
column grid.

---

### PERF-5 — Inconsistent code-splitting: bubble (d3-hierarchy) is dynamic, donut (d3-shape) is static — Medium

**Evidence:** bubble is `dynamic(() => import("./ProjectCostBubbleChart"))` with a
loading skeleton and hover `preload()` (`ProjectChartsClient.tsx:18-31, :121`). The
donut is a **static** import (`:16` → `ProjectCostDonutChart.tsx:10` re-exports
`CostDonutChart` → `CostDonutChart.tsx:4` `import { arc, pie } from "d3-shape"`).
So `d3-shape` (~88 KB) ships in the charts chunk unconditionally; `d3-hierarchy`
(~52 KB) is deferred. Only these two files import d3 in `src/`.

**Cost:** asymmetric, accidental. The donut is the default view (so d3-shape is
needed eagerly) but it should still be `dynamic` for parity and to keep d3 out of
any shared workshop chunk.

**Resolution under the redesign:** the bubble chart is **deleted** (`03` C2 /
`08`), removing `d3-hierarchy` entirely. The donut becomes an optional "share
view" → make it `dynamic` so d3-shape only loads when that view is opened. Net:
the default comparison view (bars) ships **no d3** at all.

---

## Priority / sequencing

| ID | Severity | One-line fix | Subsumed by PERF-2? |
|----|----------|--------------|----------------------|
| PERF-2 | **Critical** | Server-aggregate; ship buckets not facts | — (the win) |
| PERF-3 | **Critical** | Hoist `new Map(...)` out of per-row loop | Yes |
| PERF-4 | High | Per-column memo keyed by (estimateId, mode) | Yes |
| PERF-7 | High | (falls out of PERF-2) | Yes |
| PERF-1/6 | Medium | Add chart-shaped `loading.tsx` | No |
| PERF-5 | Medium | Delete bubble; make donut `dynamic` | No |

**Highest-impact single win:** PERF-2 — collapses the ~1.3–1.6 MB payload to a few
KB, deletes the per-row Map bug, neutralizes recompute-on-interaction, and erases
hydration re-derivation. If only one thing ships, ship this.

**Cheapest high-value quick win (if server work is deferred):** PERF-3 — three
hoisted `new Map()` calls, ~5 lines, ~1000× reduction in the space-mode hot loop.

---

## Quality posture

The audit is evidence-backed and quantified, with ranked/de-duplicated findings and
an honest latent-vs-live distinction. The second-pass plan repairs in `13` are the
guardrail against turning these modeled costs into unsupported completion claims.
