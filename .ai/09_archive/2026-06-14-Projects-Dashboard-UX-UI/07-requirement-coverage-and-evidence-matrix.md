# Project Dashboard Requirement Coverage And Evidence Matrix

**Date:** 2026-06-14  
**Status:** Planning audit artifact. No implementation.  
**Scope:** Verify that the plan pack now covers Philip's requested dashboard direction before any code pass resumes.

## Verdict

The plan pack is materially stronger after `06-cockpit-revision-plan.md`, but it still needs this coverage layer so future implementation does not quietly collapse back into the older cost-first "Honest Hero" scope.

The required target is a compact project cockpit, not a bigger cost hero:

1. recent activity;
2. recent estimate sheets;
3. a donut chart whose estimate sheet is selected through a dropdown;
4. useful cost-bucket drilldown;
5. proposal readiness;
6. risk and attention states;
7. app-native visual discipline under `DESIGN.md`;
8. accessible chart alternatives;
9. low-data states that still point to useful work;
10. proof against the actual route, especially `/workshop/projects/delafuentehouse`.

## Current Source Evidence

| Evidence | What it proves | Limit |
|---|---|---|
| `src/app/workshop/projects/[projectId]/page.tsx:34` | Dashboard summary is only fetched for a real project row. | The `delafuentehouse` sample path can render fallback project details with `summary = null`, so live proof must confirm whether seeded data exists for that slug in the current environment. |
| `src/app/workshop/projects/[projectId]/page.tsx:35` | Activity is feature-flagged behind `isProjectActivityEnabled()`. | A plan must define the flag-off state instead of assuming activity always appears. |
| `src/components/workshop/ProjectDashboardClient.tsx:187` | The dashboard body now has an overview path when a headline estimate exists. | The current IA is cost-first, not yet cockpit-first. |
| `src/components/workshop/ProjectDashboardClient.tsx:192` | The summary starts with one headline estimate. | The selected estimate is not user-selectable in the dashboard body. |
| `src/components/workshop/ProjectDashboardClient.tsx:200` | The estimate list receives `otherEstimates`. | The selected/headline sheet is excluded from the worklist. |
| `src/components/workshop/dashboard/DashboardCostMix.tsx:39` | Cost mix has grouping state. | There is no estimate sheet dropdown for selecting the donut source. |
| `src/components/workshop/dashboard/DashboardCostMix.tsx:76` | The donut has an adjacent breakdown table. | The table row does not yet select a bucket or expose top contributors. |
| `src/components/workshop/dashboard/DashboardEstimateList.tsx:38` | Current section is explicitly "Other estimates". | The requested recent estimate-sheet cockpit is not implemented yet. |
| `src/lib/repositories/project-dashboard-repository.ts:388` | Cost mix attaches to the headline estimate only. | Future work needs selected-estimate loading or URL-state selection. |
| `src/components/workshop/ProjectChromeAsync.tsx:27` | Publication summary, collaboration summary, and estimate sheets are already fetched in header chrome. | The dashboard body does not yet summarize readiness from those sources. |

## Requirement Matrix

| Requirement | Current state | Plan coverage after `06` | Evidence grade | Required next obligation |
|---|---|---|---|---|
| Recent activity | Implemented as a capped feed, but only when the feature flag is on. | Covered by Zone E, AC-ACT-1, and Phase 4. | Medium | Specify flag-off copy and which events are consequential enough for the dashboard. |
| Recent estimate sheets | Current UI shows only "other estimates" and excludes the headline sheet. | Covered by Gap 1, Zone B, AC-EST-1, AC-EST-2, and Phase 1. | Strong | Rename the concept from "Other estimates" to "Recent estimate sheets" in future implementation, include the selected sheet, and test one-estimate and many-estimate states. |
| Estimate-selected donut | Current donut is tied to the headline estimate. Grouping is selectable, estimate is not. | Covered by Gap 2, Zone C, AC-COST-1, AC-COST-2, and Phase 2. | Strong | Define URL search param behavior and the data loading contract for selected estimate changes. |
| Cost-bucket drilldown | Current chart and table are readable but not a work surface. | Covered by Gap 3 and AC-COST-3. | Medium | Add a precise rule for "open matching rows" fallback when no filtered estimate-row route exists. |
| Accessible chart data | Current cost mix has `describedById` and an adjacent table. | Covered by AC-COST-4 and research note. | Strong | Preserve table plus `aria-describedby` when adding dropdown and bucket selection. |
| Proposal readiness | Publication state exists in header chrome, not dashboard body. | Covered by Gap 4, Zone D, AC-PROP-1, and Phase 3. | Strong | Define a read-only readiness projection that avoids duplicating the Share modal. |
| Risk and attention states | Some over-budget and truncation hints exist, but no normalized attention model. | Covered by Gap 5, Zone D, AC-RISK-1, and Phase 3. | Medium | Normalize risks server-side so UI does not invent warnings independently. |
| Visual discipline | Current plan now names visual scale drift and defaults to no typography exception. | Covered by Gap 6 and AC-VIS-1. | Strong | Before code resumes, decide whether `FinancialTotalCard` must be brought back inside the `12px` app scale or documented as a named exception. |
| Low-data states | Existing empty state points to estimates/charts/projects. | Covered by AC-LOWDATA-1. | Medium | Add explicit cases for one estimate, zero rows, no activity, flag-off activity, and sample-only project fallback. |
| Actual route proof | Local route currently redirects to login in unauthenticated checks. | Covered by Phase 4 browser proof. | Weak | Capture authenticated desktop, laptop, and tablet evidence before any implementation is claimed complete. |

## External Evidence Crosswalk

| Source | Planning consequence |
|---|---|
| K38 construction dashboard guide, https://k38consulting.com/construction-dashboards/ | Supports treating the dashboard as a project cockpit with financial status, risk, and budget variance visible early. |
| SimpleKPI construction dashboard example, https://www.simplekpi.com/KPI-Dashboard-Examples/construction-project-performance-dashboard-example | Reinforces budget variance, material cost, schedule/change indicators, and risk flags as construction dashboard primitives. |
| Buildertrend job costing budget overview, https://buildertrend.com/help-article/job-costing-budget-overview/ | Supports cost-code or cost-bucket rows that users can click into for detail without leaving financial context. |
| Procore project home docs, https://en-ca.support.procore.com/products/online/user-guide/project-level/home | Shows that project homes commonly carry open items and recently changed items, but Archestimator should differentiate by making estimate cost health first-class. |
| Stephen Few bullet graph guidance, https://www.perceptualedge.com/blog/?p=217 | Warns against copying popular dashboard gauges when target comparison is the real job. Budget variance should stay target-aware and compact. |
| A11Y Collective accessible charts checklist, https://www.a11y-collective.com/blog/accessible-charts/ | Requires more than color, useful descriptions, and coded data tables for charts. |
| Tempertemper chart accessibility note, https://www.tempertemper.net/blog/do-graphs-and-charts-need-to-be-accessible | Supports showing the underlying data table as a first-class companion to the chart. |
| Aubergine activity-feed guide, https://www.aubergine.co/insights/a-guide-to-designing-chronological-activity-feeds | Supports curated event definitions, concise feed copy, and scalable activity design instead of raw audit dumps. |

## Completion Criteria For The Planning Pack

This plan pack can be treated as ready for a future code pass only when all of the following are true:

1. `README.md` points future workers to `06` and this `07` coverage artifact before `03`.
2. The explicit dashboard requirements above map to an acceptance criterion or open question.
3. Every open question names the implementation choice it blocks.
4. The source evidence distinguishes what already exists from what must still be built.
5. Visual constraints cite `DESIGN.md` and do not approve a typography exception by accident.
6. Browser proof remains marked as pending until an authenticated run captures the real route.

## Remaining Open Questions

These questions are resolved for the next implementation pass in `08-decision-brief-for-next-implementation-pass.md`. Keep them here as the audit trail for why `08` exists.

1. Should selected estimate state be shareable in the URL, or local only?
2. What exact filtered route should "open matching rows" use for a selected cost bucket?
3. Should proposal readiness summarize XLSX export readiness, public shared-link readiness, or both?
4. Which activity event types are allowed in the dashboard feed versus the full activity surface?
5. Does `delafuentehouse` need seeded live project data, or should the dashboard explicitly support sample fallback summaries?
