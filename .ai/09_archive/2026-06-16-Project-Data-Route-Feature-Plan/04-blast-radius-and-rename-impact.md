# 04 — Blast Radius & Rename Impact

Route rename: `/workshop/projects/[projectId]/charts` → `/workshop/projects/[projectId]/data`
Status snapshot date: 2026-06-16 (verified after committed rename `79e5dfef`)

> **READ-ONLY research.** No source was modified. The original audit compared a
> concurrent working tree against `HEAD`; this improved version treats the route
> rename as committed project reality (`79e5dfef`, "Keep project navigation
> focused on active destinations"). Future implementation should verify current
> source with `git log`/`rg`, not reconcile a phantom concurrent diff.

## TL;DR

The route-path rename is **functionally committed**. Every live `/charts` href,
the route page/error/loading, breadcrumbs, mini-sidebar, presence surface, and
the dashboard CTAs already point at `/data`. The remaining URL-contract issue is
not the path; it is that the current compare helper and route still use legacy
`?left=&right=&mode=` params, which U2/U9 must migrate to canonical `?sheet=`.
**No surviving `/charts` route href exists anywhere in `src/` or `tests/`.**

What remains is **cosmetic / naming churn**, not breakage:

1. Internal module names still say "charts" (`components/workshop/project-charts/**`,
   `lib/project-charts/**`, `repositories/project-charts-repository.ts`, the
   `project-charts/` data lib, `ProjectChartsClient`, the `chartSearch`/`projectCharts`
   AI context). These are **import identifiers, not routes** — they keep working
   untouched. Renaming them is optional and out of scope for "nothing breaks."
2. One genuinely **stale literal string**: `route-error-smoke-gate.test.ts` still
   asserts the arbitrary label `"Project charts"`. The test still passes (the label
   is free-form), but it reads stale.
3. A **redirect from `/charts` → `/data` is NOT configured** (no `next.config.ts`
   redirect, no middleware). Old deep links will 404 — see recommendation §6.

---

## 1. Complete reference table

Legend for **Needs change?**: ✅ done in working tree · ⚪ optional (internal name, not a route) · ⚠️ stale string, low risk · ❌ gap to fix.

### A. Live route-path / href / label references (the load-bearing ones)

| File | Line | What it references | Needs change? |
|---|---|---|---|
| `src/components/workshop/ProjectMiniSidebar.tsx` | 37–39 | Nav link `…/data`, `label: "Data"`, icon `ChartBarHorizontal` | ✅ committed baseline; do not re-run route rename work unless source inspection proves drift |
| `src/components/workshop/WorkshopBreadcrumbs.tsx` | 27–29 | Section breadcrumb match `…/data` → `{ label: "Data", href: …/data }` | ✅ done |
| `src/lib/workshop/compare-href.ts` | 22 | `buildCompareHref` returns `…/data?left=&right=&mode=` | ⚠️ path done, param contract still legacy. U9 must emit canonical `?sheet=` before the old comparison view is deleted; U2's `?left=` fallback is transitional compatibility, not the final link contract. |
| `src/lib/collaboration/presence-surface.ts` | 24, 51, 78 | Presence enum `"data"`, regex `/…/data(\/|$)/`, label map | ✅ done (was `"charts"` enum + `/charts/` regex at HEAD) |
| `src/app/workshop/projects/[projectId]/data/page.tsx` | 18, 21 | `ProjectDataPage`, `routeLabel: "Project data"` | ✅ done (new file; old charts/page.tsx deleted) |
| `src/app/workshop/projects/[projectId]/data/error.tsx` | 12 | `routeLabel="Project data"` | ✅ done |
| `src/app/workshop/projects/[projectId]/data/loading.tsx` | — | Route loading skeleton | ✅ present |
| `src/components/workshop/ProjectDashboardClient.tsx` | 229, 238 | Empty-state copy "use Data to review cost mix", CTA `href={…/data}` label "View data" | ✅ done |
| `src/components/workshop/dashboard/DashboardEstimateList.tsx` | 100–101 | `buildCompareHref(...)` → `/data`; row CTA copy still "Compare {name}" | ✅ href done via compare-href; "Compare" verb is product copy (see §2) |

### B. Internal module names containing "charts" (NOT routes — safe to leave)

| File / dir | What it references | Needs change? |
|---|---|---|
| `src/components/workshop/project-charts/**` (`ProjectChartsClient`, `ProjectComparisonHeader/Table`, `ProjectCompositionBars`, `ProjectCostDonutChart`, `ProjectVarianceSpine`) | Comparison-page component tree (imported by the `/data` page) | ⚪ optional rename; works as-is |
| `src/lib/project-charts/**` (`aggregate-project-charts`, `bucket-color`, `format`, `project-comparison-view`, `types`) | Data-aggregation lib for the route | ⚪ optional |
| `src/lib/repositories/project-charts-repository.ts` | `getProjectChartsData(...)` consumed by `/data` page | ⚪ optional |
| `src/components/charts/CostDonutChart.tsx`, `src/lib/charts/{types,svg-rounding}` | Shared donut primitive (used by share page + dashboard cost mix) — unrelated to the route folder | ⚪ leave |
| `src/lib/ai/read-context.ts` (182, 234, 1057, 1181, 1589, 1698, 1799, 2002, 2015) + `src/app/api/ai/ask/handler.ts:81` | `projectCharts` AI context field + "chart/breakdown/distribution" intent regex + system-prompt copy | ⚪ leave (provider contract field name; user-facing only in NL answers) |
| `src/components/share/SharePageTabs.tsx`, `src/lib/share/aggregate-share-chart-buckets.ts` | Public **share** donut chart — a different feature; "chart" here = the donut, not the route. Comment at SharePageTabs.tsx:359 explicitly notes "project Data route out of blast radius". | ⚪ leave |
| dashboard components `DashboardCostMix/BreakdownTable/Headline/WorkSummary`, `relative-time.ts`, `dashboard-types.ts`, `segmented-control.tsx` | "chart"/"Charts" as generic viz vocabulary, not the route | ⚪ leave |

### C. Tests & fixtures

| File | Line | What it references | Needs change? |
|---|---|---|---|
| `tests/unit/compare-href.test.ts` | 8, 14, 19 | Asserts `buildCompareHref` → `…/data?…` | ✅ done (diff confirmed `/charts`→`/data`) |
| `tests/vitest/workshop-route-error-boundaries.test.tsx` | 6, 42 | Imports `…/data/error`, expects `"Project data"` label | ✅ done |
| `tests/vitest/project-dashboard-ui-fixtures.ts` | 29 | `projectChartsPage = readFileSync("…/data/page.tsx")` | ✅ done (path repointed; export var still named `projectChartsPage`) |
| `tests/vitest/project-dashboard-charts-ui.test.ts` | 18–25 | Asserts sidebar contains `…/data`, `label: "Data"`, NOT `"Charts"`/`ChartPieSlice` | ✅ done (diff rewrote the assertions) |
| `tests/vitest/project-charts-cache-freshness.test.ts` | 24, 73 | Reads `…/data/page.tsx`, asserts dynamic render | ✅ done |
| `tests/vitest/dashboard-cost-mix-ui.test.tsx` | — | committed route-path expectation | ✅ verify current source before editing |
| `tests/vitest/dashboard-estimate-list-ui.test.tsx` | — | compare CTA path expectation | ✅ verify current source before editing |
| `tests/vitest/project-dashboard-client.test.tsx` | — | `/data` CTA expectation | ✅ verify current source before editing |
| `tests/vitest/route-error-smoke-gate.test.ts` | 20–21 | Asserts arbitrary label `"Project charts"` | ⚠️ **stale string** — passes (label is free-form), but should read `"Project data"` for consistency. Not a breakage. |
| `tests/vitest/ai-ask-read-context.test.ts` | 1232 | NL prompt "What do the project charts show…" | ⚪ test prose; exercises `projectCharts` intent, unaffected by route |
| `tests/vitest/ai-ask-route.test.ts` | 798 | NL prompt "…project charts…" | ⚪ test prose |
| `tests/vitest/project-charts-*.test.ts(x)` (aggregation, a11y, bucket-color, comparison-view, golden-master, payload-contract, ui) + `fixtures/project-charts-golden-master-fixture.ts` | — | Exercise the `project-charts` **lib + comparison UI** by import, not by route path | ⚪ leave; **but see §5** if the comparison viz is being deleted |
| `tests/vitest/cost-donut-chart-ui.test.tsx`, `tests/vitest/share/cost-donut-chart-hydration.test.tsx`, `tests/vitest/project-dashboard-charts-ui.test.ts` (donut fixture) | — | Shared donut primitive | ⚪ leave |
| `tests/vitest/estimate-unification-oracle.{test,fixtures}.ts:198`, `tests/vitest/performance-query-inventory.test.ts` | — | The word "charts" in comments / query inventory | ⚪ leave |

### D. Stories

| File | What it references | Needs change? |
|---|---|---|
| `src/stories/charts/project-cost-comparison.stories.tsx` | Imports `ProjectChartsClient` + `project-charts` lib; provider-free QA of the comparison page | ⚪ no route path; works. **See §5** if viz deleted. |
| `src/stories/charts/chart-container.stories.tsx` | Generic chart container story | ⚪ leave |

---

## 2. Navigation & breadcrumbs — labeling decision

- **`ProjectMiniSidebar.tsx`**: tab is now `label: "Data"`, icon `ChartBarHorizontal`,
  href `…/data`. The committed route rename already made this the baseline; do
  not re-run a route-rename patch unless source inspection proves drift.
- **`WorkshopBreadcrumbs.tsx`**: `getProjectSectionBreadcrumb` emits `{ label: "Data" }`
  for `…/data`.
- **Recommended label = "Data"** (already adopted). It is the broadest fit: the route
  hosts cost **comparison** + composition + donut, so a viz-specific label ("Charts",
  "Compare", "Cost comparison") under-describes it, and "Cost data" is narrower than
  what the page shows. Keep "Data". *Caveat:* "Data" is generic — if a future route adds
  raw exports/tables, revisit. The presence label maps to the plain word "data" (e.g.
  "Philip is viewing data"), which reads acceptably. This label is visible to
  project members through project-level presence; do not add sheet-specific
  presence detail here unless sheet-level authorization is also enforced.
- **Residual product copy:** `DashboardEstimateList.tsx:101` row CTA still reads
  **"Compare {estimate.name}"**. This is intentional action copy (the button compares two
  estimates) and is **not** a route label — leaving it is defensible, but flag for the
  product owner since the destination tab is now "Data," not "Compare."

## 3. Hrefs & deep links

- `buildCompareHref` (`compare-href.ts`) hardcodes the path; it already emits
  `…/data?left=&right=&mode=`. That is acceptable only during transition. The
  implementation must make the canonical live link `…/data?sheet=<id>&mode=...`
  and keep `?left=` solely as legacy fallback in the `/data` page reader.
- `presence-surface.ts` hardcodes the `/data` regex + `"data"` enum; **already** migrated.
- Share links (`SharePageTabs.tsx`, `aggregate-share-chart-buckets.ts`) reference the
  **donut chart**, not the route — no `/charts` path, nothing to change.

## 4. Route smoke / error boundary / labels

- `data/page.tsx` → `assertRouteErrorSmoke({ routeLabel: "Project data" })`; `data/error.tsx`
  → `routeLabel="Project data"`. Both migrated. `WorkshopRouteErrorState` + `route-error-smoke.ts`
  are label-agnostic (no registry of route names to update).
- **Only stale label:** `tests/vitest/route-error-smoke-gate.test.ts:20–21` still uses
  `"Project charts"` as its throwaway label. Harmless (passes), but should be updated to
  `"Project data"` for hygiene.

## 5. Tests & stories that depend on the comparison viz (rewrite/removal risk)

If the plan **deletes the complex comparison visualization** (variance spine, composition
bars, comparison table) rather than just renaming the route, these go from ⚪ to ❌ and will
need rewrite or deletion together with the components/lib they exercise:

- `tests/vitest/project-charts-{aggregation,a11y,bucket-color,comparison-view,golden-master,payload-contract,ui}.test.ts(x)`
- `tests/vitest/fixtures/project-charts-golden-master-fixture.ts`
- `src/stories/charts/project-cost-comparison.stories.tsx`
- `tests/vitest/project-dashboard-ui-fixtures.ts` exports `projectChartsClient`,
  `projectCostDonutChart`, `projectVarianceSpine`, `projectComparisonTable` (lines 30–37) —
  these `readFileSync` the `project-charts/**` components; deleting the components breaks the
  fixture load (throws at import). **This is the single highest-coupling gotcha** if the viz
  is removed: the fixture file must drop those exports first.

These tests are coupled to the viz **by import**, not by route path, so a pure rename leaves
them green; only a viz **deletion** forces the rewrite.

## 6. External / SEO / bookmark risk — redirect recommendation

- **No redirect is configured.** `next.config.ts` has no `redirects()` for `/charts`, and there
  is no `middleware.ts`. After the rename, any bookmarked or shared
  `…/charts?left=&right=&mode=` deep link **404s** (App Router has no folder to match).
- **Recommendation: add a permanent redirect.** This route had shareable, parameterized deep
  links (the whole point of `compare-href`), so silent 404s are a real regression for anyone
  who saved one. Two viable options:
  - **(Preferred) `next.config.ts` `redirects()`** — declarative, preserves query string
    automatically: source `/workshop/projects/:projectId/charts`, destination
    `/workshop/projects/:projectId/data`, `permanent: true`. Cheapest, no runtime cost.
  - Or a thin `charts/page.tsx` that calls `redirect()` to `…/data` with the same searchParams
    (more code, only needed if you want per-request logic).
- Mark "add `/charts`→`/data` 308 redirect" as a **must-fix** before this ships if the old
  route was ever publicly linked; downgrade to nice-to-have only if the route was internal-only
  and short-lived.

---

## Prioritized must-fix vs. nice-to-have

### Must-fix (ship-blocking)
1. **Add a permanent `/charts` → `/data` redirect** (`next.config.ts` `redirects()`), preserving
   `?left=&right=&mode=`. The only true post-rename regression: existing deep links 404. (§6)
2. **Repoint live compare/deep links to `?sheet=`** (`compare-href.ts`, its three dashboard callers, and the dashboard repository deep-link). Keep `?left=` only as page-reader back-compat. (§3)
3. **If the comparison viz is being deleted** (not just the route renamed): update
   `tests/vitest/project-dashboard-ui-fixtures.ts` (drop the `project-charts/**` `readFileSync`
   exports, lines 30–37) **before** deleting the components, or the fixture import throws and
   cascades failures across every dashboard UI test. Then delete/rewrite the
   `project-charts-*` tests + the cost-comparison story. (§5)

### Nice-to-have (hygiene, non-blocking)
4. Update the stale literal `"Project charts"` in `tests/vitest/route-error-smoke-gate.test.ts:20–21`
   → `"Project data"`. (§4)
5. Decide on `DashboardEstimateList.tsx:101` "Compare {name}" CTA copy — product call, not a
   route fix. (§2)
6. Optional internal rename `project-charts` → `project-data` / `project-comparison` across
   `components/workshop/project-charts/**`, `lib/project-charts/**`,
   `repositories/project-charts-repository.ts`, and the AI `projectCharts` context field. Pure
   cosmetics; high churn, zero functional gain. **Recommend deferring** — use `gitnexus_rename`
   if ever done, never find-and-replace. (§1B)

### Already handled in the working tree (verify, don't redo)
Mini-sidebar, breadcrumbs, presence surface, `data/page.tsx` + `error.tsx` +
`loading.tsx`, dashboard CTA paths, and the migrated tests (`compare-href`, route-error-boundaries,
dashboard-charts-ui, cache-freshness, dashboard-client, ui-fixtures path). **No surviving
`/charts` route href exists in `src/` or `tests/`.**
