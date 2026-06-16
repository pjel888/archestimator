---
title: Recommended Design
date: 2026-06-16
status: canonical spec
type: ux-ui-spec
scope: /workshop/projects/[projectId]/data
---

# 06 — Recommended UX/UI Design

## Summary

Replace the project route's multi-estimate cost-**comparison** analytics tool with a calm, two-section cost-**data** page:

1. **Cost Breakdown** — a per-estimate-sheet donut that updates when the user picks a different sheet, with the sheet's total in the donut center, a grouping toggle (Category / Supplier / Space), and an accessible breakdown table as the source of truth.
2. **Cost Across Sheets** — a stacked-bar comparison (one bar per estimate sheet) showing each sheet's cost composition, so the user can see how cost differs across the project's sheets.

The page is built almost entirely from parts that already exist (`CostDonutChart`, the `DashboardCostMix` pattern, `ProjectCompositionBars`, `getDashboardEstimateSeries`, the `project-charts` aggregation lib). **No charting dependency is added.** The heavy comparison machinery (baseline selector, 3-up estimate picker, variance spine, dual comparison tables, auto-written insight sentence, hover/pin highlight bus) is deleted. A permanent `/charts → /data` redirect is added to protect existing shared links.

This is a planning-only document. No application code has been changed in this plan pack.

---

## Decisions

| ID | Decision | Rationale |
| --- | --- | --- |
| D1 | The page has exactly **two sections** — Cost Breakdown (per sheet) and Cost Across Sheets — plus a small KPI header. Delete the comparison tool entirely. | Directly answers the user's "the visualization is too much; delete all of it." A single-sheet breakdown plus a cross-sheet comparison is the whole job; everything else was analyst-grade overhead. |
| D2 | **Part (a) reuses the `DashboardCostMix` *composition*** (sheet `DropdownSelect` + grouping `SegmentedControl` + donut + accessible table) — but the `/data` donut uses `CostDonutChart` in **full-callout labeled mode**, NOT the dashboard's `hideCallouts` ring. So this is "adopt the pattern + re-fit the donut at page width," **not a verbatim lift.** | The dashboard mounts `CostDonutChart` with `hideCallouts` (clean ~190px ring + table, no slice labels at `DashboardCostMix.tsx:145`); D3 wants labeled slices, which is the fixed 720×560 callout layout — a different fit problem. Positioning `/data` as the **labeled "deep" breakdown** (vs. the dashboard's compact glance) is also what gives the route a reason to exist beyond the donut it would otherwise duplicate ([01](01-current-state-audit.md) §4). |
| D3 | Donut shows the **selected sheet's total in the center**, **top 6 buckets + a single "Other"** slice, **direct slice labels** (`Label — $value · xx%`) via `CostDonutChart` full-callout mode (not `hideCallouts`), no detached legend. | Datawrapper/NN/g: legibility collapses past ~6 slices; the center total is the donut's one real advantage; direct labels remove color-matching load ([05](05-ux-dataviz-best-practices.md)). **Note:** 6 deliberately diverges from the dashboard's `TOP_SEGMENT_LIMIT = 5` (this page has more room than the 190px ring) — state it so it doesn't read as a bug. The labeled callout layout must be validated at Section-1 width (overflow/clip QA). |
| D4 | **Sheet selector = `DropdownSelect`** (sheet count is unbounded), URL-synced as `?sheet=<estimateId>`. **Grouping = `SegmentedControl`** (Category / Supplier / Space), URL-synced as `?mode=`. | Dropdown scales past 5 options where a segmented control or tabs would not; URL sync mirrors the repo's existing deep-link habit and keeps the view shareable. |
| D5 | **Part (b) = stacked BAR, one bar per sheet** (category composition), explicitly **not** a stacked area chart and **not** a time-series. Order bars by **total descending** (non-temporal), label each by **sheet name** (no date axis). | No cost-snapshot history exists ([03](03-data-layer-and-feasibility.md) G3), so a true cost-over-time line isn't honestly renderable. The loaded `ProjectChartEstimateOption` exposes only `updatedAt` (no `createdAt`), and edits reshuffle `updated_at` — so date-ordering is both unavailable *and* misleading. Ordering by total (not date) stops the chart being misread as a timeline, which is the whole reason for bar-over-area ([05](05-ux-dataviz-best-practices.md)). |
| D6 | **KPI header = restrained, at most 3 stat cards** via `FinancialTotalCard`: selected-sheet total and sheet count by default; top category only if it adds signal rather than restating the donut. | NN/g F-pattern: users barely register the 4th+ stat, and the user's ask was donut + cost tracking, not a stat dashboard. Three is the hard ceiling; two is the recommended default until browser proof shows the third card earns its space. |
| D7 | **Category → color identity is locked across sheets** via the existing stable bucket-id hash (`src/lib/project-charts/bucket-color.ts`). | Switching sheets must read as a *quantity* change, not a *category* change. Stable color is what makes the swap legible. |
| D8 | Add a permanent **`/charts → /data` redirect** (308) that preserves the query verbatim; **the `/data` page param reader owns back-compat** — it accepts legacy `?left=<id>` as a fallback for `?sheet=`, drops `?right=`, keeps `?mode=`, and runs the IDOR scope-check on the resolved id. | A static `next.config.ts` rule **cannot rename a query key**; preserving `?left=` verbatim lands on `/data?left=…`, which a `?sheet=`-only reader ignores → the selected sheet is silently lost, the exact regression the redirect exists to prevent ([04](04-blast-radius-and-rename-impact.md); adversarial + security lanes). |
| D9 | **Gut the shared lib, delete only route-exclusive files**, and drop the test-fixture `readFileSync` coupling *before* deleting components. | `src/lib/project-charts/**` is consumed by the dashboard + AI read-context; deleting it breaks them. `project-dashboard-ui-fixtures.ts` reads the `project-charts/**` component files at import time, so deletion order is load-bearing ([01](01-current-state-audit.md), [04](04-blast-radius-and-rename-impact.md)). |
| D10 | **Accessibility is part of the spec, not a follow-up**: every chart ships an `aria-describedby` data table, marks meet WCAG ≥3:1 / text ≥4.5:1, load-bearing meta uses `#5D5D5D` (not the AA-failing `#7F7F7F`), SVG `<text>` ≥11px, and all motion is gated behind `prefers-reduced-motion`. | Carried from the design system and the external research ([02](02-component-and-chart-inventory.md), [05](05-ux-dataviz-best-practices.md)); the donut already satisfies most of this, so the cost is keeping it, not inventing it. |

---

## Page layout

```text
┌ Project › Data ──────────────────────────────────────────────┐
│  [Total cost: $4.2M]   [Estimate sheets: 5]   [Top: Structure]│  ← ≤3 KPI cards
├───────────────────────────────────────────────────────────────┤
│  Cost breakdown                                               │
│  Sheet: [Schematic v2 ▾]        View: (Category)(Supplier)(Space)│
│                                                               │
│        ╭─────────╮       Structure   $1.4M · 33%             │
│       ╱   $4.2M   ╲      Finishes    $0.9M · 21%             │
│      │   (total)   │     MEP         $0.7M · 17%             │  ← donut + table
│       ╲           ╱      Sitework    $0.5M · 12%             │
│        ╰─────────╯       …                                   │
│                          Other       $0.3M ·  7%             │
├───────────────────────────────────────────────────────────────┤
│  Cost across sheets                                           │
│  Concept ▐███▌▐█▌▐██▌  $2.9M                                  │
│  Schem.  ▐████▌▐██▌▐█▌ $4.2M                                  │  ← one stacked bar
│  DD      ▐████▌▐███▌▐█▌$4.6M                                  │     per sheet
│  Legend: ▐ Structure  ▐ Finishes  ▐ MEP  ▐ Other             │
└───────────────────────────────────────────────────────────────┘
```

- Single calm column on the workshop surface; the two sections stack vertically with the existing section spacing.
- KPI cards sit in a single row at desktop, wrap to two-up below `640px`, and stack one-up below `420px`. The sheet dropdown and grouping toggle share one control row at desktop, then stack with the full-width dropdown above the segmented control below `640px`.
- No new card chrome, gradient, or color treatment beyond existing primitives and the sanctioned chart palette.

---

## Section 1 — Cost Breakdown (per sheet)

**Source of truth:** `getDashboardEstimateSeries(projectId, estimateId)` → `series.{category|supplier|space}.allBuckets`, each bucket carrying `total`, `share`, `label`, `color`. Collapse with `collapseProjectChartBuckets` (top-N + "Other"). Format with `formatChartMoney` / `formatChartShare`; color with `colorForBucket`.

**Sheet selector**
- `DropdownSelect`, `aria-label="Estimate sheet"`, options from the surviving project-data route summary (preferred: `getProjectDashboardSummary` for U2 plus the U3 repository boundary below) with id + name + total.
- Selection is reflected in the URL as `?sheet=<estimateId>` (replaces the old `?left/right`).
- **Default sheet (v1):** the most recently updated sheet (`estimates[0]` — the existing dashboard default at `project-dashboard-repository.ts:348`). A favorite-based default is **deferred**: `estimate_favorites` is per-user and unread by the default path today, so it's net-new authed logic, not a one-line default ([08](08-verification-and-open-questions.md) OQ1).

**Grouping toggle**
- `SegmentedControl`: Category / Supplier / Space, `aria-label="Group cost by"`, URL `?mode=`.
- **Default grouping = Category** (most common cost-breakdown mental model). Note: the legacy code defaulted to `space`; this is a deliberate flip, recorded as a reversible bet (see Known tensions).

**Donut**
- Reuse `CostDonutChart` (selection state, deterministic SSR, existing a11y), but U2 must extend it for the `/data` contract if current props are insufficient: controlled selection (`activeBucketId`, `onActiveBucketChange`) for donut/table highlight and an 11px callout-text path for the full-callout labeled mode. If the implementation cannot satisfy controlled highlight + 11px callouts, fall back to `hideCallouts` and make the table the only direct-label surface before claiming D10.
- Center label: selected sheet total (`formatChartMoney`).
- ≤6 visible slices + one "Other"; direct labels `Label — $value · xx%`; no detached legend.
- Hover/focus a slice highlights the matching table row and vice-versa (single highlight, not the old cross-component pin bus).

**Breakdown table**
- The donut's `aria-describedby` target and the visible fallback: columns Label / Amount / Share, sorted descending, "Other" last.
- This table is what screen-reader and keyboard users operate; the donut is the visual layer over it.

**States**
- *Loading:* shape-matched skeleton (donut circle + table rows), not a spinner.
- *Empty (no estimate sheets yet):* status line + learning cue + a direct "Create an estimate sheet" CTA (NN/g three-part empty state).
- *Truncated data:* if `didTruncate` is set, show a quiet "partial totals" note (caps: 5000 rows / 1500 nodes per [03](03-data-layer-and-feasibility.md)).
- *Error:* existing `WorkshopRouteErrorState` via the route `error.tsx` (already wired, `routeLabel: "Project data"`).

**Microcopy**

| State / element | Copy |
| --- | --- |
| Section heading | `Cost breakdown` |
| Section subheading | `See where the selected estimate sheet's cost is concentrated.` |
| Empty status | `No estimate sheets yet.` |
| Empty learning cue | `Add an estimate sheet to see how cost breaks down by category, supplier, or space.` |
| Empty CTA | `Create estimate sheet` |
| Truncation notice | `Showing the largest cost groups from a capped data read. Open the table for the full breakdown when the full read is available.` |
| Donut aria-label | `Cost breakdown for {sheetName} by {groupingMode}` |
| Table caption | `{sheetName} cost groups by {groupingMode}` |

**Number formatting**

- Use `formatChartMoney` for the donut center, KPI cards, bar labels, and table values. Do not introduce component-local money formatters.
- Values below one million should render with grouping separators through the existing formatter. Values at or above one million may abbreviate only if `formatChartMoney` already does; otherwise keep full grouped values. Tables remain the exact-value fallback for any abbreviated visual labels.
- Shares use `formatChartShare`; table shares and callout shares must match to avoid rounding conflicts.

---

## Section 2 — Cost Across Sheets (compare, not track)

**Source of truth:** per-sheet totals from the `project_estimate_list_summaries` RPC (`totalCostByEstimateId`); per-sheet category composition from `seriesByEstimateId` in a surviving `/data` route repository. U3 may start from `getProjectChartsData`, but before U5 it must move the needed route data into `src/lib/repositories/project-data-repository.ts` (for example `getProjectDataRouteSummary(projectId, { selectedEstimateId, groupingMode })`) so the old comparison repository can be deleted without losing Section 2 data.

**Chart**
- **Salvage the `ProjectCompositionBars` CSS-stacked-bar *idea* and rebuild** — the existing component is 100%-normalized (every bar full-width), typed against `ProjectChartComparisonView` (deleted in U5), and sorted by `baselineTotal` (a comparison concept). It is not a drop-in. The new bar maps widths to a **shared absolute cost domain** (max-total scaling) and is typed off the surviving `ProjectChartEstimateSeries`/`seriesByEstimateId`.
- One horizontal bar per estimate sheet, segments = top categories + "Other", **bar length encodes absolute cost** (users see which sheet is biggest); a normalized toggle is a later add, not v1.
- Order bars by **total descending** (non-temporal); label each by **sheet name** with its total. No date axis, tick marks, or time language — the bars must not be misreadable as a timeline (D5).
- Cap stack segments at ≤4–5 (top categories + "Other"); identical category→color mapping as Section 1 (D7); a single shared, accessible legend below.
- Caption under the chart: `Sheets are ordered by total cost, highest first.` This prevents an implementer from reintroducing date ordering and tells users the bars are not a timeline.
- Provide `role="img"` plus `aria-describedby` to a data table in U3, not deferred to U8. Columns: Sheet / Total / each rendered top category / Other. The table is the keyboard and screen-reader source of truth for Section 2.

**Honesty guardrails**
- No "trend line," no stacked area, no interpolation between sheets, no date axis.
- **Currency gate (resolved):** if `computeProjectCostRollup` returns `kind: "mixed"`, **hide Section 2** and show a one-line notice ("Sheets use different currencies, so cross-sheet cost comparison is unavailable."). Hard gate in U3, not an open question ([08](08-verification-and-open-questions.md) OQ4).

**Empty/degenerate states**
- 0–1 sheets: hide Section 2 (a cross-sheet comparison needs ≥2 sheets); the page is still useful with just the breakdown.
- >20 sheets: the loader switches to `selected-pair` mode and **stops returning per-sheet series** ([03](03-data-layer-and-feasibility.md) G1), so this is a *second data path* — render **totals-only bars** from `project_estimate_list_summaries` (`totalCostByEstimateId`), not a partial category stack. Scope note: if v1 should stay minimal, defer this path and cap the section to the most recent 20 sheets with a note.
- If the selected grouping produces more than six meaningful categories and the donut begins to read as dense, keep the donut and table for v1 and record the sorted horizontal-bar alternate as a fast follow. [05](05-ux-dataviz-best-practices.md) recommends a bar past ~6 categories; this plan deliberately chooses the calmer labeled donut + table first to avoid adding a third primary encoding.

---

## URL & state contract

| Param | Meaning | Default | Replaces |
| --- | --- | --- | --- |
| `?sheet=<estimateId>` | Selected sheet for the breakdown donut | most-recently-updated (`estimates[0]`); favorites deferred | `?left`, `?right` |
| `?mode=category\|supplier\|space` | Grouping for the breakdown donut | `category` | `?mode` (was `space`) |

- Selection updates use `router.replace(url, { scroll: false })` for v1, matching the existing App Router dashboard posture. This is not Pages Router shallow routing and may re-fetch the server component. Do not promise true client-instant swapping unless U2 preloads all needed series and updates the data contract/tests accordingly.
- Static `next.config.ts` redirect behavior: `/charts?left=<id>&right=<id2>&mode=category` returns a 308 Location of `/data?left=<id>&right=<id2>&mode=category` with the query preserved verbatim. The `/data` page reader then resolves `sheet ?? left`, ignores `right`, keeps valid `mode`, and scopes the estimate to the project.

---

## What gets deleted vs. gutted

Authoritative inventory lives in [01](01-current-state-audit.md) and [04](04-blast-radius-and-rename-impact.md). Summary:

**Delete (route-exclusive):**
- `src/components/workshop/project-charts/ProjectChartsClient.tsx` (the comparison shell), `ProjectVarianceSpine.tsx`, `ProjectComparisonHeader.tsx`, and the comparison-only halves of `ProjectComparisonTable.tsx` / `ProjectCompositionBars.tsx` (salvage the single-estimate bar from the latter for Section 2).
- `src/components/workshop/project-charts/ProjectCostDonutChart.tsx` (a re-export shim — callers point straight at `CostDonutChart`).
- `src/lib/repositories/project-charts-repository.ts`, `build-insight-sentence.ts`, `buildProjectChartComparison*`, `getProjectChartDefaultPair`.

**Gut, do not delete (shared with dashboard + AI context):**
- `src/lib/project-charts/{format,types,bucket-color,aggregate-project-charts,project-comparison-view}.ts` — prune comparison-only exports, keep the per-estimate aggregation, `seriesByEstimateId`/route summary helpers needed by `/data`, formatting, and palette.

**Touch first (ordering hazard):**
- `tests/vitest/project-dashboard-ui-fixtures.ts:30-37` `readFileSync`s the `project-charts/**` components — drop those fixture exports *before* deleting the components or every dashboard UI test throws at import.

---

## Redirect spec (D8)

- Add a permanent entry to `redirects()` in `next.config.ts` (the file currently has none — [04](04-blast-radius-and-rename-impact.md)):
  - Source `/workshop/projects/:projectId/charts` → Destination `/workshop/projects/:projectId/data`, `permanent: true` (308), query string preserved **verbatim**.
- **The static rule cannot rename a query key.** Legacy param translation (`?left=<id>` → selected sheet, drop `?right=`, keep `?mode=`) MUST live in the `/data` page param reader: when `?sheet=` is absent, fall back to `?left=`; validate the resolved estimate id with the same project-scoped IDOR check the loader uses (`project_id` + estimate `id`) before rendering.
- Also repoint the **live dashboard `buildCompareHref` callers** — `DashboardCostMix.tsx:191`, `DashboardWorkSummary.tsx:84`, `DashboardEstimateList.tsx:100`, and the repo deep-link at `project-dashboard-repository.ts:650`. These emit `?left=` against `/data` *today*, independent of the legacy redirect, so they need the new `?sheet=` contract. This is handled by [07](07-implementation-roadmap.md) U9.

---

## Design-system compliance

- **Palette:** chart hues come only from `bucket-color.ts` (Okabe–Ito 7 CVD-safe hues + `#9AA0A6` "Other"), applied to marks/legends/swatches via inline `fill`/`backgroundColor` only — never Tailwind chrome, never orange outside its sanctioned action exception.
- **Meta text:** `#5D5D5D` for any load-bearing metadata; `#7F7F7F` is sanctioned by `DESIGN.md` but fails WCAG AA (~3.5:1) and must not carry meaning.
- **Type:** small, dense, aligned with `DESIGN.md`; SVG `<text>` never below 11px.
- **Primitives only:** `DropdownSelect`, `SegmentedControl`, `FinancialTotalCard`, `CostDonutChart`, the CSS stacked-bar pattern — no new shared abstractions, no new dependency.
- **Motion:** donut/bar transitions gated behind `prefers-reduced-motion`.

---

## Alternatives rejected

| Alternative | Reason rejected |
| --- | --- |
| Keep the comparison tool (variance spine, dual tables, baseline picker) | This is exactly the "too much" the user wants gone; it's analyst-grade comparison, not project cost viewing. |
| Keep a focused "compare two sheets" affordance | Pairwise compare is the deleted tool's core job; the user called it "too much," so it's dropped in v1 — but confirm the job is dead with one usage signal before hard-deleting ([08](08-verification-and-open-questions.md) OQ5). A two-sheet slopegraph ([05](05-ux-dataviz-best-practices.md) §3) is the lightweight revisit path. |
| Stacked **area** "multi-layered" chart for cost over time | No cost-snapshot history exists; stacked area over discrete sheets fabricates a continuous time axis and misleads. Deferred as a true time-series follow-up (needs a snapshot table). |
| Add `recharts`/`visx` for "real" charts | The repo already renders donuts with `d3-shape` and bars with CSS; a chart lib is a new dependency, bundle weight, and theming surface for zero benefit ([02](02-component-and-chart-inventory.md)). |
| Build a fresh per-sheet donut component | `CostDonutChart` + the `DashboardCostMix` pattern already do this with full a11y and SSR determinism; rebuilding adds risk. |
| Tabs or segmented control for the sheet selector | Sheet count is unbounded; tabs imply section navigation; a segmented control overflows past ~5. Dropdown is correct. |
| Default grouping = Space (legacy default) | Category is the more intuitive first read for a cost breakdown; Space remains one click away. Recorded as a reversible bet. |

---

## Known tensions / deliberate bets

- **The "multi-layered graph" the user imagined is deliberately *not* what ships.** The honest version of "cost tracking across sheets" with today's data is a stacked-bar comparison, not a time-trend. This plan treats `/data` as a stepping stone toward cost-over-time, but the snapshot table is a fast-follow schema plan, not v1. Ship the truthful comparison now; scope a thin cost-snapshot capture only after the v1 page proves the job is valuable.
- **Default-grouping flip (Space → Category)** is a reversible v1 bet; if estimators think spatially first, flip it back via one constant.
- **Cross-sheet stack is bounded at 20 sheets** for the per-category view; beyond that it degrades to totals-only (a second data path). Record the sheet-count threshold at which Section 2 needs a paginated/aggregated read.
- **Currency mixing** across sheets makes cross-sheet totals invalid; resolved by hiding Section 2 + notice when currencies differ (OQ4, now closed).
- **Route-vs-dashboard identity.** Section 1 would duplicate the dashboard's `DashboardCostMix` donut; D2 resolves this by making `/data` the **labeled "deep" breakdown** (full-callout donut + full table) while the dashboard stays the compact glance. If that differentiation doesn't feel real, the honest alternative is to make the **cross-sheet view the route's reason to exist** and demote Section 1 — a call worth confirming with the user (it would invert the roadmap's "U2 is the core deliverable" framing).
- **KPI header is slightly beyond the literal ask** (the user asked for donut + cost tracking, not stat cards). Keep it to ≤3 and drop "largest category" if it just restates the donut's top slice; defer the whole header if the page feels heavy.
