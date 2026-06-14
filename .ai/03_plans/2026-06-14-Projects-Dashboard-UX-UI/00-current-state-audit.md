# Project Dashboard — Current-State Audit

**Date:** 2026-06-14
**Surface:** `http://localhost:3000/workshop/projects/{projectId}` (the project "Dashboard" tab)
**Route:** `src/app/workshop/projects/[projectId]/page.tsx` → `src/components/workshop/ProjectDashboardClient.tsx`
**Method:** 6 parallel codebase readers + 2 adversarial verifiers (feasibility + minimalism). All claims below are evidenced by file/line.

---

## 1. The headline finding: the page is *not* literally empty — its main area is wasted

The user's report ("the page is empty") is accurate in spirit but precise in a way that changes the plan. The dashboard route renders **two persistent panels plus a placeholder**:

| Region | What renders today | Evidence |
|--------|--------------------|----------|
| Left `aside` (274px) | Editable project details — name, client, address — with autosave-on-blur; created/updated timestamps in an 8px footer grid | `ProjectDashboardClient.tsx:134-172` |
| Main `<main>` | A single centered `EmptyState`: clipboard icon, 11px title "Build this project from estimates", 9px description, three link buttons (Open estimates / View charts / All projects) | `ProjectDashboardClient.tsx:174-200` |
| Left nav rail (104px) | `ProjectMiniSidebar` — Dashboard / Estimates / Compare tabs | `ProjectMiniSidebar.tsx:19-74` |
| Header chrome | Breadcrumbs, project title/client eyebrow, async publication/collaboration actions (Suspense-streamed) | `[projectId]/layout.tsx:28-56` |

**The gap is the `<main>` element.** It occupies ~70–80% of the viewport width and currently carries only empty-state guidance — even when the project already has estimates worth tens of millions of pesos. The left details panel works and should be left untouched; the redesign target is the main content area only.

> **Scope correction for the plan:** "make the empty page useful" = "fill `<main>` (lines ~174-200 of `ProjectDashboardClient.tsx`) with an at-a-glance overview." The left `aside` (lines ~134-173) stays byte-for-byte.

---

## 2. What the user *cannot* currently learn on the dashboard

Every one of these is data the app already computes elsewhere but never surfaces on the project's own home:

- **What does this project cost?** — no total anywhere on the dashboard. Cost lives only inside `/estimates` (the table) and `/charts` (the comparison).
- **How many estimates exist / which is current?** — no count, no "latest estimate" indication.
- **Is it over/under budget?** — `project_budget` exists per estimate and variance is computed in the estimates table, but never on the dashboard.
- **What's the cost mix (by space/category/supplier)?** — the donut + aggregation exist, but only on the Compare tab in a two-estimate comparison framing.
- **What changed recently?** — no activity surface at all.

---

## 3. Existing assets that make this cheap (reuse inventory)

The codebase is unusually well-prepared for a cost dashboard. The expensive parts are already built.

### Cost data & charts (mature, reuse wholesale)
- **`listProjectEstimates(projectId)`** — `src/lib/repositories/workspace-repository.ts:1426-1489`. Returns all estimates **sorted `updated_at` DESC**, plus per-estimate `totalCost` / `rowCount` / `nodeCount` via the `project_estimate_list_summaries` RPC, plus a `firstNodeId` oracle. **Drives the headline pick, KPI figures, and the estimate list with zero new backend.**
- **`project_estimate_list_summaries` RPC** — `supabase/migrations/20260614161500_*.sql`. One `GROUP BY` per estimate; cost = `SUM(qty*unit_cost + misc_cost + qty*unit_cost*contingency_pct/100)`. O(estimates) rows regardless of estimate size. `security_invoker`.
- **`buildEstimateSeries(input, estimateId)`** — `src/lib/project-charts/project-comparison-view.ts:53-69`. Pure; returns `{ space, category, supplier }` pre-bucketed series for one estimate.
- **`CostDonutChart`** — `src/components/charts/CostDonutChart.tsx` (shared chart component). D3 donut with center total, callouts, compact mode (520×400), empty-state handling.
- **`collapseProjectChartBuckets(allBuckets, 8)`** — `src/lib/project-charts/aggregate-project-charts.ts:394-400`. Top-N + "Other" rollup.
- **`colorForBucket()` + `OKABE_ITO_SERIES_COLORS` / `OTHER_BUCKET_COLOR`** — `src/lib/project-charts/bucket-color.ts`. Deterministic CVD-safe palette; a category is the *same colour* on the dashboard and on Compare.
- **`formatChartMoney()` / `formatChartShare()`** — `src/lib/project-charts/format.ts`. `₱1,234,567` / `12.3%` (locale hardcoded `en-PH`).

### Design-system primitives (reuse)
- **`FinancialTotalCard`** — `src/components/ui/financial-total-card.tsx`. Primary (dark) / default (white) variants; label + 12px/500 tabular value + 10px sublabel. Maps directly to DESIGN.md §Financial total cards.
- **`Card`, `Badge`, `StatusBadge`, `EmptyState`, `Skeleton`, `Button`** — `src/components/ui/*`. Flat, hairline-bordered, 3px radius, 8–12px type.
- **`ProjectTotalHeader`** — `src/components/workshop/ProjectTotalHeader.tsx`. Budget-health meter + over/under colour logic (reuse its health derivation for the headline variance pill).
- **Spacing/typography/colour tokens** — `.ai/07_design/tailwind.theme.json` + `src/app/globals.css` (`xs 4 / sm 8 / md 12 / lg 20`; `app-title 12/500`, `app-body 10/400`, `app-label 9/500`).

### Activity (framework exists; project-scoping does not — see §4)
- **`ActivityViewModel` + `composeEstimateActivity` + `composeSharedLinkActivity`** — `src/lib/activity/*`. Snapshot diffing, field labels, XSS-safe rendering, audience visibility.
- **`SharedLinkActivityFeed`** — `src/components/share/SharedLinkActivityFeed.tsx`. A working feed UI pattern (cursor pagination, focus-refresh, accordion, aria-live) — a reference, not a drop-in.
- **`collaboration_audit_events`** — already has a `project_id` column (`src/lib/supabase/types.ts`); invites/role-changes/removals are already project-scoped.

---

## 4. Hard constraints & gaps the plan must respect (verified by the feasibility skeptic)

These are the load-bearing facts. Several contradict a naïve "just reuse the charts repo" approach.

1. **`getProjectChartsData()` is the wrong reuse for a single estimate.** With ≤20 estimates it runs in `all-estimates` mode and **loads rows+nodes for *every* estimate, ignoring `selectedEstimateIds`** (`project-charts-repository.ts`). Wrapping it to render one donut over-fetches the whole project. → A **new dedicated single-estimate query** is required (load one estimate's facts → `buildEstimateSeries`). This is net-new repository code, not a thin wrapper.
2. **No `is_primary` flag on estimates.** "Latest" can only be inferred from `updated_at` DESC. Editing a note on an old estimate silently re-promotes it to the dashboard headline. → The UI must label the anchor honestly ("**Most recently updated estimate · {name}**"), never "Primary". A future `is_primary` / `marked_primary_at` column is the clean fix (deferred).
3. **Currency is per-estimate, not per-project.** Summing `total_cost` across estimates with different `currency_code` is meaningless. → Headline = one estimate's currency. Any cross-estimate rollup renders **only when all estimates share a currency**, else degrades to a "mixed currencies" caption.
4. **`estimate_sheet_events` has no `project_id`** (migration `20260524033151`) — project activity must JOIN through `estimates.project_id`. Acceptable at `LIMIT 8`; denormalize + index only if the feed proves hot (deferred).
5. **Project metadata edits are unaudited.** `updateProjectDetails` (`src/lib/projects/actions.ts:279-353`) writes the row and revalidates but **emits no event**. "Project renamed" activity does not exist today → requires new instrumentation.
6. **No `composeCollaborationActivity`.** Only estimate + shared-link composers exist (`activity-composer.ts`). Collaboration events need a new composer.
7. **No relative-time helper** ("2 days ago") exists in `src/lib` — net-new (small); keep locale `en-PH` to match the chart formatters.
8. **`SegmentedControl` and `SectionHeading` are not shared primitives** — the Space/Category/Supplier toggle is embedded in `ProjectChartsClient`; no section-heading primitive exists. Extract before reuse to avoid drift.
9. **Locale is hardcoded `en-PH`** in `format.ts`. Acceptable for v1 (matches Charts); parameterize later.
10. **`CostDonutChart` viewBox is hardcoded** to two sizes; callouts are 8–9px in compact mode. Verify legibility at the actual cell width; prefer the donut-with-side-table layout for predictable width.

---

## 5. Adjacent-surface observations (audit-level, not redesign scope)

- **Nav weight:** `ProjectMiniSidebar` gives Dashboard / Estimates / Compare equal weight; once the dashboard is the real project home, that is correct — but there is **no "back to overview" affordance** from sub-pages. Minor.
- **Compare reuse:** the dashboard should *link into* Compare with the headline + previous estimate pre-selected (lower friction than the current manual picker). Requires confirming `ProjectChartsClient`'s URL params.
- **Estimates list parity:** the dashboard's "other estimates" list must reuse the estimates table's peso/variance **formatters** but must **not** reproduce the 8-column TanStack table — that surface already owns depth.
- **Projects index** (`/workshop/projects`) shows no per-project KPIs; the rollup work here could later feed fleet-level cards (deferred, out of scope).

---

## 6. Bottom line for planning

- The **cost half is essentially free** — one new single-estimate query + composition of existing primitives. Ship it first.
- The **activity half is real backend work** — instrumentation + a new composer + a JOIN query. Feature-flag it and ship cost-first.
- The biggest *design* risk is not data — it's **slop**: an equal-weight KPI grid would bury the one number that matters. The chosen design (see `02-design-directions-and-decision.md`) resolves this with a single hero figure + a quiet meta line.
