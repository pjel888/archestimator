# Project Dashboard Cockpit Revision Plan

**Date:** 2026-06-14  
**Status:** Revised planning layer, not implementation.  
**Reason:** The current plan and first implementation pass improve the empty dashboard, but they still stop short of the dashboard Philip asked for: recent activity, recent estimate sheets, selectable estimate-sheet cost donuts, proposal readiness, and a more useful contractor workspace.

## Executive Decision

Keep the cost-first direction, but demote the "Honest Hero" from final design to **Phase 1 foundation**. The next target is a compact **Project Cockpit**:

- work summary at the top;
- recent estimate sheets as the main work queue;
- selectable estimate-sheet cost donut and table;
- readiness and risk panel;
- curated recent activity.

The dashboard should answer four questions without making the user visit three tabs:

1. What estimate is currently driving this project?
2. What changed recently?
3. Where is the money going?
4. Is this ready to issue as a proposal?

## What Exists Now

Evidence from source and tests:

- `src/app/workshop/projects/[projectId]/page.tsx` loads dashboard summary and activity behind `isProjectActivityEnabled()`.
- `src/components/workshop/ProjectDashboardClient.tsx` composes headline, cost mix, other-estimates list, and activity.
- `src/lib/repositories/project-dashboard-repository.ts` has a single-estimate cost-series query and summary assembler.
- `src/lib/repositories/project-activity-repository.ts` has a capped merged activity feed.
- `src/components/workshop/ProjectChromeAsync.tsx` already fetches publication summary, collaboration summary, and `listProjectEstimateSheets(projectId)`.
- `src/components/workshop/ProjectPublicationHeader.tsx` owns share/publication state, selected estimate sheets, open counts, stale snapshot warning, recipients, password, expiry, and activity tabs.

The useful foundation exists. The missing work is information architecture and dashboard-specific summarization, not another generic visual pass.

## Gaps In The Existing Plan

### Gap 1: Recent Estimate Sheets Are Not First-Class

The current `DashboardEstimateList` shows only "other estimates," excluding the headline. That is too narrow. A user needs a recent sheet list that includes the selected/headline sheet and the next likely sheet to open.

The row should show:

- sheet code and estimate name;
- total and currency;
- budget state;
- updated time;
- row count and node count when cheap;
- status or proposal inclusion when available;
- open, compare, prepare proposal.

### Gap 2: The Donut Is Not Estimate-Selectable

The user explicitly asked for donut charts that display the cost of an estimate sheet selected through a dropdown. The current plan only selects grouping mode, while the estimate itself is the recency-derived headline.

The revised plan requires:

- `DropdownSelect` for estimate sheet selection, not a native select;
- default selection = most recently updated estimate;
- donut and table recompute for selected estimate;
- selected estimate persists in URL search params when practical;
- empty estimates render the existing no-estimate state.

### Gap 3: Cost Buckets Are Not Interactive Enough

The cost table is accessible, but not yet a work surface. Selecting a donut segment or breakdown row should expose:

- bucket label;
- amount;
- share;
- row count;
- top contributing rows when cheap;
- next action: open matching rows in the estimate sheet or jump to Compare.

If matching-row deep links are not available yet, the plan should require a traceable follow-up instead of hiding the limitation.

### Gap 4: Proposal Readiness Is Hidden In Header Chrome

Publication state exists, but it is tucked inside the Share control. A dashboard should summarize proposal readiness without duplicating the modal:

- no shared link yet / link live / expired / revoked;
- selected estimate count;
- stale snapshot warning;
- latest open/comment/response;
- password and expiry status;
- missing proposal prerequisites: client, address, selected estimate, zero rows, validation blockers.

The panel should be read-only summary plus a single action: `Prepare proposal` or `Review share settings`.

### Gap 5: Risk States Are Missing

The dashboard needs a compact "needs attention" strip that only appears when there is something real:

- over budget;
- missing budget;
- mixed currency;
- truncated cost data;
- zero rows;
- stale proposal snapshot;
- no recent activity because flag is off;
- publication expired or revoked;
- collaborator invite delivery not configured when detected.

No generic warnings. No yellow wall. Each item needs a direct next action or a reason it is informational only.

### Gap 6: Visual Scale Drift

The live-audit plan's `28px` to `32px` app hero value conflicts with `DESIGN.md`, which says app/workshop UI has a `12px` hard maximum unless Philip explicitly approves a named exception. The cockpit revision should resolve this before implementation.

Decision for the next plan: use **density and contrast within the app scale** unless Philip approves a named dashboard exception. A dark `FinancialTotalCard` can still lead, but the dashboard should not become a marketing-scale hero.

## Revised Information Architecture

### Zone A: Work Summary

Purpose: orient the user.

Content:

- selected estimate sheet;
- current total;
- budget variance when budget exists;
- project-wide caption only when safe under one currency;
- last meaningful update;
- quick actions: open sheet, compare, prepare proposal.

### Zone B: Recent Estimate Sheets

Purpose: decide what to open next.

Content:

- recent 5 to 8 estimate sheets;
- include selected/headline sheet;
- total, budget state, updated time, row count;
- open and compare actions;
- proposal inclusion marker when the sheet is part of the current publication selection.

### Zone C: Cost Composition

Purpose: explain the selected estimate.

Controls:

- estimate sheet dropdown;
- grouping segmented control: Category, Space, Supplier.

Content:

- donut with top 5 plus Other;
- adjacent data table;
- selected bucket details;
- action to open matching estimate rows when supported.

### Zone D: Readiness And Risk

Purpose: show whether the project is ready to send or needs cleanup.

Content:

- proposal/publication status;
- stale snapshot warning;
- selected estimate count;
- missing metadata;
- missing budget;
- mixed currency;
- truncation warning;
- latest recipient activity if present.

### Zone E: Recent Activity

Purpose: show consequential change.

Content:

- capped 8-row curated feed;
- estimate edits, cost changes, proposal events, collaboration events;
- no raw audit dump;
- empty state stays one quiet line.

## Data Requirements

### Extend `ProjectDashboardSummary`

Add fields for:

- `selectedEstimateId`;
- `estimateSheets`: recent dashboard rows with totals, budgets, row/node counts, first node id, publication inclusion, and updated time;
- `readiness`: proposal/publication summary projection;
- `risks`: normalized list of dashboard risk items;
- `costMixByEstimateId` loading strategy or lazy endpoint for selected estimate.

### Reuse Existing Sources

- `listProjectEstimates(projectId)` for totals, counts, first node id, and recency.
- `listProjectEstimateSheets(projectId)` for publication picker parity.
- `getProjectPublicationSummary(projectId)` for proposal/publication readiness.
- `getProjectCollaborationSummary(projectId)` only for lightweight collaboration state if a dashboard summary needs it.
- `getDashboardEstimateSeries(projectId, estimateId)` for the selected estimate donut.
- `getProjectActivity(projectId)` for the curated activity strip.

### Avoid

- no raw row/node facts crossing to the client;
- no project-wide raw chart payload;
- no duplicating the Share modal;
- no full estimates table inside the dashboard;
- no provider or database mutation during this plan phase.

## Acceptance Criteria

- **AC-IA-1:** Dashboard answers in the first viewport: current cost, what changed, which estimate to open, and proposal readiness.
- **AC-EST-1:** Recent estimate sheets include the selected/headline sheet and at least the next recent sheets when available.
- **AC-EST-2:** Each estimate row exposes open, compare, and prepare/review proposal next actions when applicable.
- **AC-COST-1:** A `DropdownSelect` chooses the estimate sheet whose cost donut is displayed.
- **AC-COST-2:** The grouping control changes Category, Space, and Supplier without changing the selected estimate.
- **AC-COST-3:** Selecting a donut segment or breakdown row reveals amount, share, row count when available, and a next action.
- **AC-COST-4:** Donut data has an adjacent coded table and `aria-describedby` wiring.
- **AC-RISK-1:** Over-budget, missing budget, mixed currency, truncated data, zero rows, stale snapshot, and publication blockers render as text plus semantic status, not color alone.
- **AC-PROP-1:** Proposal readiness summarizes link status, selected estimate count, stale snapshot, latest recipient activity, password, expiry, and missing prerequisites.
- **AC-ACT-1:** Recent activity remains curated and capped. Raw audit history stays out of the dashboard.
- **AC-LOWDATA-1:** One-estimate, no-activity, flag-off, and zero-estimate states still show useful next actions without inflated empty boxes.
- **AC-VIS-1:** No equal KPI grid, no marketing-scale typography unless separately approved, no radius above 3px, no non-chart accent colors, no shadows beyond overlays.
- **AC-SCOPE-1:** Left project metadata aside and header Share/Teamspace controls remain in their current ownership boundaries.

## Implementation Phases For A Future Pass

### Phase 0: Reconcile Plan And Current Code

- Mark the current `Honest Hero` plan as Phase 1 foundation.
- Add dashboard-cockpit types and test fixtures.
- Decide whether a named dashboard typography exception is allowed. Default no.

### Phase 1: Recent Estimate Sheets

- Replace "Other estimates" with a recent estimate-sheet worklist.
- Include the selected/headline estimate.
- Add publication inclusion marker if data is already available.

### Phase 2: Selectable Cost Composition

- Add estimate-sheet dropdown.
- Reuse `getDashboardEstimateSeries(projectId, estimateId)` for the selected estimate.
- Add selected bucket state and details.
- Preserve the table alternative.

### Phase 3: Readiness And Risk

- Project summary projection from publication and estimate data.
- Render compact readiness panel.
- Render needs-attention list only when real issues exist.

### Phase 4: Activity Fit And Browser Proof

- Keep curated activity as the bottom or right compact strip.
- Verify authenticated dashboard in browser at desktop, laptop, and tablet widths.
- Capture screenshot evidence before implementation is called complete.

## Open Questions

1. Should the dashboard get a named typography exception for the main cost value, or must it stay within the 12px app ceiling?
2. Should selected estimate sheet be stored in URL search params for shareable dashboard state?
3. What is the canonical route for "open matching rows" from a selected cost bucket?
4. Should proposal readiness count XLSX export readiness, public shared-link readiness, or both?
5. Should recent activity include proposal open/comment/decision events from shared links, or should those stay only in the Share modal until the full activity page exists?

## Research Link

See `.ai/13_research/2026-06-14-project-dashboard-ux-research.md` for source-backed rationale and external references.

