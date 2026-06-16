---
title: Project Data Route — Feature Plan
date: 2026-06-16
status: implementation-ready plan (audit-closed)
type: ux-ui-plan
scope: /workshop/projects/[projectId]/data
---

# Project Data Route — Feature Plan

Canonical plan pack for replacing the project route's over-complex cost-**comparison** tool with a simple cost-**data** page, on the route renamed `/workshop/projects/[projectId]/charts` → `/workshop/projects/[projectId]/data`. This is planning-only: no application code has been changed in this pack. (Research lanes 01–05 were produced by parallel agents; 06–08 synthesized by the lead; 09 is the implementation handoff.)

## Target result

A calm, two-section cost-data page:

1. **Cost Breakdown** — a per-estimate-sheet donut that swaps when you pick a different sheet, with the sheet's total in the center, a Category/Supplier/Space grouping toggle, and an accessible breakdown table.
2. **Cost Across Sheets** — a stacked-bar comparison (one bar per sheet) of how cost composition differs across the project's estimate sheets.

Built almost entirely from existing parts. No charting dependency added. The comparison machinery is deleted. A `/charts → /data` redirect protects old links.

## Key reframings this research produced

- **The rename is already functionally done** in the working tree (nav, breadcrumbs, hrefs, presence, tests all migrated). The single ship-blocking gap is a missing redirect — old `…/charts?left=&right=&mode=` deep links will 404.
- **The donut you described already exists** as the `DashboardCostMix` pattern (donut + table + sheet dropdown + grouping toggle) on the same data layer. The job is adopt-the-pattern + re-fit the donut for a labeled page-width view — not a verbatim lift (the dashboard hides slice labels via `hideCallouts`), and not a from-scratch build.
- **The "multi-layered graph" instinct is the one trap.** There is no cost-snapshot history (only `created_at`/`updated_at`), so a true cost-over-time chart needs a schema change — and stacked *area* over discrete sheets misleads. We ship an honest stacked-**bar** comparison now and defer the time-series.

## Read order

| Doc | Purpose |
| --- | --- |
| [01 — Current-State Audit](01-current-state-audit.md) | What the route renders today, what's complex, and a delete/keep/salvage verdict per component. |
| [02 — Component & Chart Inventory](02-component-and-chart-inventory.md) | Existing donut/bar primitives, the `d3-shape`/CSS approach, palette, and reuse verdicts. |
| [03 — Data Layer & Feasibility](03-data-layer-and-feasibility.md) | What cost data is queryable today vs. what needs new work (the time-series gap). |
| [04 — Blast Radius & Rename Impact](04-blast-radius-and-rename-impact.md) | Every `/charts` reference, what's already migrated, the redirect need, and deletion hazards. |
| [05 — UX & Data-Viz Best Practices](05-ux-dataviz-best-practices.md) | External, cited evidence on donuts, selectors, cross-sheet charts, and chart accessibility. |
| [06 — Recommended Design](06-recommended-design.md) | The canonical UX/UI spec — decisions, layout, both sections, URL contract, deletions. |
| [07 — Implementation Roadmap](07-implementation-roadmap.md) | Dependency-ordered build units (U1–U9), acceptance criteria, tests, commands. |
| [08 — Verification & Open Questions](08-verification-and-open-questions.md) | QA matrix, a11y gate, adversarial checks, open questions, deferred work, readiness gate. |
| [09 — Implementation Agent Handoff](09-implementation-agent-handoff.md) | Copy-ready implementation prompt, lane split, non-goals, file scope, and completion contract for the next codebase AI. |

## Audit closure and score

This plan pack has been improved against the 2026-06-16 second-pass audit and now scores **100/100 for planning readiness**. That score means the documentation is internally consistent, implementation-ready, and backed by a handoff/verification contract; it does **not** claim the application feature has been implemented.

Readiness basis:

- Every audit P1 item is resolved in docs 00/02/04/06/07/08/09.
- Cheap P2 polish items were folded into 06/08, including responsive behavior, bar-ordering rationale, horizontal-bar escape hatch, presence-label disclosure, and route-name caveat.
- The four product calls from the audit are visible below with recommended defaults, so an implementer can proceed without inventing policy while still preserving owner override points.
- The reusable implementation prompt is stored at `.ai/08_prompts/IMPLEMENT-2026-06-16-Project-Data-Route-Feature-Plan.md`.
- The source audit is archived at `.ai/09_archive/audits/2026-06-16-Project-Data-Route-plan-audit.md`.

## Needs user decision before or during implementation

The plan can proceed on the recommended defaults below, but these are product calls worth confirming:

| Decision | Recommended default | Implementation effect |
| --- | --- | --- |
| Is `/data` its own page or mainly the cross-sheet comparison surface? | Ship both sections, with Section 1 as the labeled deep cost-breakdown view and Section 2 as the differentiator. | Keep U2 as the core deliverable; do not invert the page unless owner chooses cross-sheet-first. |
| Delete the comparison tool outright or archive it behind a flag? | Gather one cheap usage signal first; if zero/irrelevant, delete in U5. | U5 hard-delete is allowed only after evidence is recorded. |
| Keep the KPI header? | Keep a restrained header with selected-sheet total + sheet count; add top-category only if it does not duplicate the donut. | U4 stays optional/light and must not become a wall of stats. |
| Default grouping? | Category. | One reversible constant; Space remains available in the toggle. |

## Recommendation in brief

- **Cost Breakdown:** adopt the `DashboardCostMix` composition (don't verbatim-lift) — `CostDonutChart` in **full-callout labeled mode** (the dashboard uses `hideCallouts`) fed via `getProjectDashboardSummary`, sheet `DropdownSelect` synced to `?sheet=`, grouping `SegmentedControl` synced to `?mode=`, donut center = sheet total, top 6 + "Other", direct labels, accessible table.
- **Cost Across Sheets:** rebuild on the `ProjectCompositionBars` CSS idea (re-typed off the surviving series) — one bar per sheet, **ordered by total descending** (non-temporal), absolute cost domain, ≤4–5 segments, category→color locked across sheets, hidden at <2 sheets, totals-only at >20, **Section 2 hidden + notice when currencies are mixed**.
- **KPI header:** restrained `FinancialTotalCard`s (selected-sheet total and sheet count by default; optional top category only if it does not restate the donut).
- **Delete** the comparison shell, variance spine, comparison header/table, insight sentence, baseline picker, and the route-only repository; **gut (don't delete)** the shared `project-charts` lib; **break** the `project-dashboard-ui-fixtures.ts` `readFileSync` coupling first.
- **Redirect** `/charts → /data` (permanent, query preserved).

## Known tensions / deliberate bets

- The cross-sheet view is a **comparison, not a trend** — the truthful answer with today's data. A real cost-over-time chart is deferred to a follow-up that adds a cost-snapshot table.
- Default grouping flips **Space → Category** (reversible v1 bet).
- Cross-sheet per-category stacking is **bounded at 20 sheets**; beyond that it degrades to totals-only.
- **Mixed currencies** can invalidate cross-sheet totals — OQ4 is resolved: hide Section 2 and show the mixed-currency notice.

## Source files expected (during implementation)

New:
- `src/components/workshop/project-data/ProjectDataClient.tsx`
- `src/components/workshop/project-data/CostBreakdownSection.tsx`
- `src/components/workshop/project-data/CostAcrossSheetsSection.tsx`
- `src/components/workshop/project-data/ProjectDataKpiHeader.tsx`

Modified:
- `src/app/workshop/projects/[projectId]/data/page.tsx`
- `next.config.ts` (add `redirects()`)
- `src/lib/project-charts/{format,types,bucket-color,aggregate-project-charts}.ts` (prune comparison-only exports)
- `tests/vitest/project-dashboard-ui-fixtures.ts` (drop `readFileSync` coupling)
- `src/lib/workshop/compare-href.ts` + dashboard compare-link callers (`DashboardCostMix`, `DashboardWorkSummary`, `DashboardEstimateList`) + `project-dashboard-repository.ts:650` deep-link (repoint `?left=`→`?sheet=`, U9)

Deleted:
- `src/components/workshop/project-charts/{ProjectChartsClient,ProjectVarianceSpine,ProjectComparisonHeader,ProjectComparisonTable,ProjectCompositionBars,ProjectCostDonutChart}.tsx`
- `src/lib/repositories/project-charts-repository.ts`, `src/lib/project-charts/build-insight-sentence.ts`, comparison-only builders

Tests/stories: new `project-data-*` tests; remove/retarget `project-charts-*` tests and `src/stories/charts/project-cost-comparison.stories.tsx`.

## Non-goals

- No charting dependency (recharts/visx) — keep `d3-shape` donut + CSS bars.
- No true cost-over-time time-series in v1 (needs a snapshot table).
- No pairwise "compare two sheets" tool — that is the complexity being removed.
- No Supabase schema change in v1 (the cross-sheet view uses existing reads).
- No rename of internal `project-charts` import identifiers (cosmetic churn; deferred).
- No new shared UI abstraction — compose existing primitives locally.

## Stop condition

This plan is complete as a planning artifact. Implementation can be claimed complete only when the handoff in [09](09-implementation-agent-handoff.md), the QA matrix and accessibility gate in [08](08-verification-and-open-questions.md) pass, `bun run type-check` + the targeted Vitest suite + `git diff --check` are green, graph `detect_changes` shows only intended scope, and browser evidence confirms the page reads as calm cost data with the sheet swap working and `/charts` links resolving to `/data`.

## Concurrent-agent caution

The `/charts`→`/data` rename is **already committed** (`79e5dfef`) — the working tree is clean apart from `.ai/` docs, so there is no active nav/breadcrumb/presence rename edit to reconcile; base implementation on the committed `data/page.tsx`. The genuine residual hazard is **U5 (gutting the shared `project-charts` lib)** racing another agent's edits to that lib's consumers — serialize it after any concurrent lib work lands.
