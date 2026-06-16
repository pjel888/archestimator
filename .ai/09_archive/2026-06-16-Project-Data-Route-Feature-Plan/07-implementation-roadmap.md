---
title: Implementation Roadmap
date: 2026-06-16
status: implementation-ready sequence
type: roadmap
scope: /workshop/projects/[projectId]/data
---

# 07 — Implementation Roadmap

Build sequence for the [recommended design](06-recommended-design.md). Planning-only: no code is changed in this pack. Paths are repo-relative. Units are dependency-ordered and sized as atomic commits. U-IDs are stable.

**Execution posture:** this route has live tests and a shared lib with cross-consumers. Work **deletion-safe**: repoint and add the new surface *before* removing the old components, and break the test-fixture `readFileSync` coupling first. Prefer characterization/regression coverage over the dashboard donut before relocating it. The `/charts`→`/data` rename is already **committed** (`79e5dfef`) — base U1 on the committed `data/page.tsx`; there is no active rename diff to reconcile.

---

## Sequencing at a glance

```text
U1 ─ break fixture coupling + repoint route off ProjectChartsClient (unblocks deletion)
      │
U2 ─ Cost Breakdown section (donut + selector + grouping + table)   ← the core deliverable
      │
U9 ─ repoint live dashboard compare links to ?sheet=                 ← blocks comparison deletion
      │
U3 ─ Cost Across Sheets section (stacked bars)                      ← depends on U2 palette/format reuse
      │
U4 ─ KPI header (≤3 FinancialTotalCards)
      │
U5 ─ delete comparison components + gut project-charts lib          ← only after U3 data boundary + U9 links are done
      │
U6 ─ /charts → /data redirect (next.config.ts)
      │
U7 ─ tests + stories cleanup
      │
U8 ─ accessibility + reduced-motion pass
```

---

## U1. Break the fixture coupling and repoint the route

**Goal:** Make the comparison components deletable and stop the `/data` route from depending on the comparison shell, without yet building the new UI.

**Dependencies:** none.

**Files:**
- `tests/vitest/project-dashboard-ui-fixtures.ts` (drop the `readFileSync` of `project-charts/**` at lines ~30–37)
- `src/app/workshop/projects/[projectId]/data/page.tsx` (stop importing `ProjectChartsClient` / `getProjectChartsData`; render a temporary minimal client or the new container scaffold)
- `src/app/workshop/projects/[projectId]/data/loading.tsx` (reshape to the future KPI/donut/table/bars skeleton; remove comparison-shaped loading)

**Approach:** Remove the fixture's file-reads first (they throw at import once components are gone). Then point the page at a new `ProjectDataClient` container (initially a thin shell) so later units have a mount point. Keep the route's `assertRouteErrorSmoke` and `routeLabel: "Project data"` intact.

**Test scenarios:**
- Dashboard UI tests that imported the fixture still load (no import-time throw) after the `readFileSync` removal.
- `/data` route renders without referencing `ProjectChartsClient`.

**Verification:** `bun run type-check` clean; the targeted dashboard vitest files import without error.

---

## U2. Cost Breakdown section (the core deliverable)

**Goal:** A per-sheet donut that swaps on estimate-sheet selection, with grouping toggle and accessible breakdown table.

**Dependencies:** U1.

**Files:**
- `src/components/workshop/project-data/CostBreakdownSection.tsx` (new)
- `src/components/workshop/project-data/ProjectDataClient.tsx` (new container)
- reuse: `src/components/charts/CostDonutChart.tsx`, `src/components/workshop/dashboard/DashboardCostMix.tsx` (pattern reference), `DropdownSelect`, `SegmentedControl`
- data: **sheet list + default + selected series via `getProjectDashboardSummary(projectId, { selectedEstimateId, selectedGroupingMode })`** (`project-dashboard-repository.ts:732` — it internally calls `getDashboardEstimateSeries` at `:755` and resolves the default at `:348`). `getDashboardEstimateSeries` *alone* cannot enumerate sheets for the picker or resolve a default. Alternative: `listProjectEstimates` for the picker + `getDashboardEstimateSeries` for the series with explicit default selection. `costMix` is `null` for zero-sheet projects — drive the empty state off that. Format with `collapseProjectChartBuckets` + `formatChartMoney`/`formatChartShare`/`colorForBucket` (`src/lib/project-charts/`)
- test: `tests/vitest/project-data-cost-breakdown-ui.test.tsx` (new)

**Approach:** Adopt the `DashboardCostMix` composition (donut + table + sheet `DropdownSelect` + grouping `SegmentedControl`) but render `CostDonutChart` in **full-callout labeled mode** (not the dashboard's `hideCallouts`) — validate the 720×560 callout layout fits Section-1 width. U2 must either extend `CostDonutChart` with controlled selection props (`activeBucketId`, `onActiveBucketChange`) plus 11px callout text support, or explicitly fall back to `hideCallouts` and make the table the only direct-label surface before claiming D10. Chosen plan path: extend the donut and add/update donut tests for controlled focus/hover and 11px callout text. Center the donut on the selected sheet total (on slice hover/focus the center shows that slice's label/amount/share, then returns to the total); cap visible slices at 6 + "Other"; donut ↔ table highlight. Sync selection to `?sheet=` and grouping to `?mode=` via `router.replace(url, { scroll: false })`; this is an App Router navigation/server refresh, not shallow routing. The param reader also accepts legacy `?left=` (drop `?right=`) and IDOR-validates the id. **Swap mechanism for v1:** match `DashboardCostMix`'s router-backed round-trip; do not promise true client-instant swapping. If implementation later preloads series for a client swap, update the data contract and tests in this unit before coding it. **Default sheet = most-recently-updated (`estimates[0]`)**; favorites deferred. Default grouping = `category`. Use the microcopy and number-format contract in [06](06-recommended-design.md).

**Patterns to follow:** `DashboardCostMix` for the swap interaction and the donut/table pairing; existing URL-param reading in the old `page.tsx` for the param contract shape.

**Test scenarios:**
- Selecting a different sheet re-renders the donut + table with that sheet's `getDashboardEstimateSeries` data, updates `?sheet=`, and does not show stale data under the router-backed refresh.
- Switching grouping (Category/Supplier/Space) re-buckets the donut and table, and updates `?mode=`.
- ≥7 categories collapse to 6 + one "Other"; "Other" sorts last in the table.
- Center label equals the selected sheet's formatted total.
- Donut slice focus highlights the matching table row (and vice-versa).
- `aria-describedby` resolves to the breakdown table; table has Label/Amount/Share columns.
- Empty state (no sheets) shows status + CTA, not a broken donut.
- `didTruncate` surfaces a partial-totals note.

**Verification:** new vitest file green; manual/browser check that the swap is responsive under the chosen router-backed mechanism and color identity is stable across sheets.

---

## U9. Repoint live dashboard compare links to the `?sheet=` contract

**Goal:** The three dashboard "Compare breakdown" CTAs + the repo deep-link emit `?left=` against `/data` today; after the comparison view dies they must use the new contract. (Gap-2 from the audit.)

**Dependencies:** U2 (param reader exists).

**Files:** `src/components/workshop/dashboard/DashboardCostMix.tsx` (~`:191`), `DashboardWorkSummary.tsx` (~`:84`), `DashboardEstimateList.tsx` (~`:100`), `src/lib/workshop/compare-href.ts` (`buildCompareHref`), `src/lib/repositories/project-dashboard-repository.ts` (~`:650`), `tests/unit/compare-href.test.ts`.

**Approach:** Repoint `buildCompareHref` to emit `?sheet=<id>` (single sheet, no `right`) and update any caller copy/tests that still assume pairwise comparison semantics. The `/data` page param reader's legacy `?left=` fallback (U2) covers old links only; live app code should stop emitting `?left=`/`?right=`.

**Test scenarios:**
- Each CTA navigates to `/data?sheet=<id>` and renders that sheet.
- No live code emits `?left=`/`?right=` against `/data`.

**Verification:** grep shows no live `?left=` or `?right=` emission against `/data`; `bun test tests/unit/compare-href.test.ts` and type-check green.

---

## U3. Cost Across Sheets section (stacked bars)

**Goal:** One stacked bar per estimate sheet comparing cost composition across the project's sheets — comparison, not time-series.

**Dependencies:** U2 (reuses palette + formatting + collapse).

**Files:**
- `src/components/workshop/project-data/CostAcrossSheetsSection.tsx` (new)
- `src/lib/repositories/project-data-repository.ts` (new surviving route data boundary)
- salvage the single-estimate bar logic from `src/components/workshop/project-charts/ProjectCompositionBars.tsx` before that file is removed in U5
- data: new `getProjectDataRouteSummary` (`seriesByEstimateId`, estimate options/totals, `summary.rollup`), `totalCostByEstimateId` via `project_estimate_list_summaries`
- test: `tests/vitest/project-data-cost-across-sheets-ui.test.tsx` (new)

**Approach:** First create `getProjectDataRouteSummary(projectId, { selectedEstimateId, groupingMode })`, using the existing dashboard/list/project-chart code as source material, so Section 2 does not depend permanently on `project-charts-repository.ts`. It must return the dashboard summary/costMix for Section 1, estimateSheets with totals, `summary.rollup` for the mixed-currency gate, and `seriesByEstimateId` for ≤20 sheets. CSS stacked bars, one per sheet, **ordered by total descending** (non-temporal — no date axis; `createdAt` isn't in the loaded option data and `updated_at` reshuffles on edits), segments = top categories + "Other" (≤4–5), shared accessible legend + data table, category→color locked to Section 1. **Rebuild, don't reuse:** salvage the `ProjectCompositionBars` CSS idea but re-type off `ProjectChartEstimateSeries`/`seriesByEstimateId` and map widths to a shared **absolute** cost domain. Hide the section when <2 sheets. **>20 sheets is a second data path:** render totals-only bars from `project_estimate_list_summaries` (or defer per the scope note in [06](06-recommended-design.md)). **Currency hard gate (OQ4, resolved):** if `summary.rollup.kind === "mixed"`, hide Section 2 + show the notice.

**Test scenarios:**
- N sheets render N bars in **total-descending** order with shared category colors; no date axis or time labels.
- <2 sheets: section is hidden; page still renders the breakdown.
- >20 sheets: totals-only bars from the summaries RPC (no per-category stack) — or section capped to 20 if deferred.
- **Mixed-currency project: Section 2 is hidden and the notice is shown** (no cross-currency sum rendered).
- Each bar has an accessible name (sheet + total); the section exposes a data table (Sheet / Total / per-category) as its `aria-describedby` target.
- Caption reads `Sheets are ordered by total cost, highest first.`

**Verification:** new vitest file green; visual check that bars share color identity with the donut.

---

## U4. KPI header

**Goal:** At most three calm stat cards above the two sections.

**Dependencies:** U2.

**Files:**
- `src/components/workshop/project-data/ProjectDataKpiHeader.tsx` (new)
- reuse `FinancialTotalCard`
- extend `tests/vitest/project-data-cost-breakdown-ui.test.tsx` or add a small header test

**Approach:** Default to two cards: selected-sheet total and estimate-sheet count. Add a third largest-category card only if it adds information not already obvious from the donut/table in the browser proof. Reflows two-up below `640px` and one-up below `420px`. No 4th card.

**Test scenarios:**
- Cards reflect the selected sheet and update on sheet change.
- Two cards render by default; a third top-category card may render only with a test proving it matches the donut's top slice.
- No overflow at narrow widths.

**Verification:** header test green; responsive check.

---

## U5. Delete comparison components and gut the shared lib

**Goal:** Remove the dead comparison surface now that nothing imports it.

**Dependencies:** U1–U4 and U9 (route + new sections no longer reference these; live dashboard CTAs no longer emit comparison params).

**Files (delete — route-exclusive):**
- `src/components/workshop/project-charts/ProjectChartsClient.tsx`, `ProjectVarianceSpine.tsx`, `ProjectComparisonHeader.tsx`, `ProjectCostDonutChart.tsx`
- `src/components/workshop/project-charts/ProjectComparisonTable.tsx`, `ProjectCompositionBars.tsx` (after salvage in U3)
- `src/lib/repositories/project-charts-repository.ts`, `src/lib/project-charts/build-insight-sentence.ts`, comparison-only builders (`buildProjectChartComparison*`, `getProjectChartDefaultPair`)

**Files (gut — keep, prune comparison-only exports):**
- `src/lib/project-charts/{format,types,bucket-color,aggregate-project-charts,project-comparison-view}.ts`

**Approach:** Run impact analysis on each symbol before removal (`gitnexus_impact` / `get_impact_radius`); confirm zero remaining importers outside the comparison set. Prune the shared lib's comparison exports while preserving the per-estimate aggregation + palette consumed by the dashboard and AI read-context. **Serialize this unit after any concurrent agent's edits to the shared lib's consumers land** — impact analysis against a stale tree gives a stale blast radius.

**Test scenarios (regression):**
- Dashboard cost-mix and AI read-context still resolve their imports from the gutted lib.
- No dangling imports; `bun run type-check` clean.
- Cheap usage signal for old `/charts` pairwise compare has been gathered and recorded. If usage is nonzero, stop for user decision before hard-deleting pairwise compare.

**Verification:** `bun run type-check`, full targeted vitest, and a graph `detect_changes` showing only the intended symbols/flows affected.

---

## U6. `/charts → /data` redirect

**Goal:** Old shared/bookmarked links keep working.

**Dependencies:** none (can land any time; sequence near the end so it isn't lost).

**Files:** `next.config.ts` (add `redirects()`), `tests/vitest/charts-to-data-redirect.test.ts` (new, if redirects are unit-testable in this setup) or document a manual check.

**Approach:** Permanent redirect `/workshop/projects/:projectId/charts` → `/workshop/projects/:projectId/data`, query preserved. Legacy `?left=` → `?sheet=` handled in the page param reader (U2), not the rule.

**Test scenarios:**
- `/charts` (no params) → `/data`.
- Static redirect check: `/charts?left=<id>&right=<id>&mode=category` returns 308 Location `/data?left=<id>&right=<id>&mode=category` (query preserved verbatim).
- Page-reader check after redirect: `/data?left=<id>&right=<id>&mode=category` renders sheet `<id>`, ignores `right`, keeps category grouping, and scopes the estimate to the project.

**Verification:** redirect test green or documented manual verification; `git diff --check`.

---

## U7. Tests and stories cleanup

**Goal:** Remove/replace tests and stories tied to the deleted comparison UI.

**Dependencies:** U5.

**Files:**
- `tests/vitest/project-charts-ui.test.tsx`, `project-charts-a11y.test.tsx`, `project-dashboard-charts-ui.test.ts`, `project-charts-cache-freshness.test.ts`, `workshop-route-error-boundaries.test.tsx`, `route-error-smoke-gate.test.ts` (stale `"Project charts"` string), `src/stories/charts/project-cost-comparison.stories.tsx`
- **Also — these import comparison symbols pruned in U5, so they break `type-check`/test otherwise:** `tests/vitest/project-charts-comparison-view.test.ts`, `project-charts-aggregation.test.ts`, `project-charts-golden-master.test.ts`, `project-charts-payload-contract.test.ts`, and `tests/vitest/fixtures/project-charts-golden-master-fixture.ts` (per [01](01-current-state-audit.md) §5 / [04](04-blast-radius-and-rename-impact.md) §5).
- The rename is committed (`79e5dfef`); no active route-rename edits remain to reconcile — base on the committed tests.

**Approach:** Delete comparison-specific assertions, retarget route tests at `/data` + the new sections, fix the stale `"Project charts"` label assertion. Reconcile with concurrent edits before writing.

**Verification:** full targeted vitest green.

---

## U8. Accessibility + reduced-motion pass

**Goal:** Confirm the page meets the D10 bar end-to-end.

**Dependencies:** U2–U4.

**Files:** `tests/vitest/project-data-a11y.test.tsx` (new), the new section components.

**Approach:** Verify each chart's `aria-describedby` data table, ≥3:1 mark / ≥4.5:1 text contrast, `#5D5D5D` meta, 11px text floor, keyboard operability of selector + grouping, and `prefers-reduced-motion` gating.

**Test scenarios:**
- Every chart exposes a reachable data table.
- Selector and grouping are keyboard-operable and named.
- Reduced-motion disables transitions.

**Verification:** a11y vitest green; manual axe/contrast spot-check.

---

## Acceptance criteria (whole feature)

- The `/data` route renders the two-section cost-data page; no comparison shell, variance spine, baseline picker, or insight sentence remains.
- Picking a different estimate sheet visibly swaps the donut + table + KPI cards and updates `?sheet=`.
- Cost Across Sheets shows one stacked bar per sheet with locked category colors; hidden at <2 sheets; totals-only at >20.
- `/charts` (with and without legacy params) redirects to `/data`.
- No charting dependency was added; the shared `project-charts` lib still serves the dashboard + AI context.
- `bun run type-check`, the targeted Vitest suite, and `git diff --check` all pass; graph `detect_changes` shows only intended scope.

## Commands

- `bun run type-check`
- `bunx vitest run tests/vitest/project-data-cost-breakdown-ui.test.tsx tests/vitest/project-data-cost-across-sheets-ui.test.tsx tests/vitest/project-data-a11y.test.tsx --maxWorkers=1`
- `bun test tests/unit/compare-href.test.ts`
- targeted dashboard/route suites touched by U1/U6/U7/U9
- `git diff --check`
- graph: `detect_changes` / `get_affected_flows` before claiming done
