# Project Dashboard UX Research

**Date:** 2026-06-14  
**Scope:** Project-level dashboard for `/workshop/projects/[projectId]`, especially `delafuentehouse`.  
**Mode:** Plan and research only. No implementation changes from this artifact.

## Research Read

The first plan pack correctly moved the project dashboard away from an empty `<main>` and toward a cost-first overview. The next revision needs to be broader: a contractor does not open a project dashboard only to see a latest number. They need to know which estimate sheet matters now, what changed, what is blocking a proposal, and whether the cost composition has risk.

Current code evidence confirms the dashboard now has a headline cost, cost donut, other-estimates list, and feature-flagged activity feed, but it does not yet have a dashboard-native recent estimate-sheet cockpit, proposal-readiness panel, selected cost-bucket details, or a compact status/risk summary. Those are the missing UX layers.

## External Findings

Construction dashboard guidance consistently treats cost health as a primary signal. K38 lists budget versus actual cost, forecasted final cost, cash flow, earned value, and cost variance as financial metrics that help prevent overruns and protect profitability. SimpleKPI similarly lists budget variance, material cost per square meter, change-order frequency, and schedule adherence as construction dashboard KPIs.

Buildertrend's budget overview is relevant because it frames the budget surface as a central hub for estimated costs, actual spend, projected costs, and profitability. Procore's project home is useful as an anti-reference for Archestimator: Procore's home emphasizes address, weather, open items, recent changes, schedule, and milestones, while cost is separated into other tools. Archestimator can differentiate by making estimating cost health first-class on the project home.

Stephen Few's bullet graph work is a strong warning against circular gauges for target comparison: the purpose is to convey a rich story clearly in little space, especially when a measure is compared against a target. For Archestimator, that means budget variance should stay compact and target-aware. A pill is acceptable for v1; a bullet-style mini measure is a better follow-up than another donut.

Accessible chart guidance converges on the same rule already captured in `DESIGN.md`: do not let the SVG be the only representation of the data. A11Y Collective recommends nearby text, a data table, and `aria-describedby` for richer descriptions. Tempertemper's 2026 chart accessibility note makes the same practical point: the information a chart communicates must be accessible, and an HTML table beside or under the chart is often the simpler path.

Activity-feed research supports a curated feed, not a raw audit dump. Aubergine's chronological activity-feed guidance says to define which events trigger feed entries, keep copy concise, keep the feed scalable, and use lazy loading or deeper pages only when needed. For the dashboard, that means 5 to 8 consequential rows and a separate full audit/activity surface later.

## Source Map

- K38 construction dashboard metrics: https://k38consulting.com/construction-dashboards/
- SimpleKPI construction KPI examples: https://www.simplekpi.com/KPI-Dashboard-Examples/construction-project-performance-dashboard-example
- Buildertrend job costing budget overview: https://buildertrend.com/help-article/job-costing-budget-overview/
- Procore project home overview: https://en-ca.support.procore.com/products/online/user-guide/project-level/home
- Stephen Few, bullet graphs for target displays: https://www.perceptualedge.com/blog/?p=217
- A11Y Collective accessible charts checklist: https://www.a11y-collective.com/blog/accessible-charts/
- Tempertemper, chart accessibility in 2026: https://www.tempertemper.net/blog/do-graphs-and-charts-need-to-be-accessible
- Aubergine chronological activity feed guide: https://www.aubergine.co/insights/a-guide-to-designing-chronological-activity-feeds

## Codebase Evidence

- `src/app/workshop/projects/[projectId]/page.tsx` loads `getProjectDashboardSummary(projectId)` and feature-flagged `getProjectActivity(projectId)`.
- `src/components/workshop/ProjectDashboardClient.tsx` currently composes `DashboardHeadline`, `DashboardCostMix`, `DashboardEstimateList`, and `ProjectActivityList` inside `<main>`.
- `src/lib/repositories/project-dashboard-repository.ts` already has a single-estimate cost-series path and dashboard summary assembler.
- `src/lib/repositories/project-activity-repository.ts` already merges estimate and collaboration events into a capped feed.
- `src/components/workshop/ProjectChromeAsync.tsx` already fetches publication summary, collaboration summary, and project estimate sheets for header chrome.
- `src/components/workshop/ProjectPublicationHeader.tsx` contains proposal/publication state and estimate sheet selection logic, but that state is not summarized in the dashboard body.
- `src/components/workshop/workshop-sample-projects.ts` includes `delafuentehouse` fallback project metadata, but the current server page only loads dashboard summary when a real project row exists.

## Dashboard Information Architecture Recommendation

The dashboard should become a compact project cockpit, not a larger hero page.

1. **Work Summary:** current working estimate, project total, variance, freshness, and a quiet cue for whether the latest anchor is inferred from recency.
2. **Recent Estimate Sheets:** first-class list that includes the headline sheet and recent sheets, not only "other estimates." Each row should show sheet code/name, total, budget state, updated time, row count when available, and actions: open, compare, prepare proposal.
3. **Selectable Cost Composition:** a dropdown selects the estimate sheet; grouping controls select category, space, or supplier; clicking a donut segment or table row exposes bucket amount, share, row count, and a path into matching estimate rows.
4. **Readiness And Risk:** compact checklist for missing budget, mixed currencies, truncated data, stale source pricing when available, proposal blockers, missing client/project metadata, and publication state.
5. **Recent Activity:** curated consequential events, capped at 8, with raw audit trails kept separate.

## Acceptance Criteria To Carry Forward

- The dashboard answers within one viewport: current cost, what changed, which estimate to open, and whether the proposal is ready.
- Recent estimate sheets are shown as work objects, including the selected/headline sheet.
- The cost donut can be switched by selected estimate sheet and grouping mode.
- Selecting a cost bucket reveals details and a meaningful next action.
- Proposal/publication readiness is visible in the dashboard body without duplicating the full Share modal.
- Risk states use text plus semantic status, not color alone.
- Chart data always has an adjacent data table.
- The visual system remains app-native: SF Pro/system stack, 3px radius, hairline borders, compact type, no heavy shadows, no decorative construction motifs, no KPI card grid.

