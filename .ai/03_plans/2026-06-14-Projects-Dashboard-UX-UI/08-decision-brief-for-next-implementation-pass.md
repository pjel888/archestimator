# Project Dashboard Decision Brief For Next Implementation Pass

**Date:** 2026-06-14  
**Status:** Planning decision contract. No implementation.  
**Purpose:** Resolve the open questions from `07-requirement-coverage-and-evidence-matrix.md` enough that a future code pass can build the Project Cockpit without drifting back to the old cost-first scope.

## Decision Summary

| Decision | Call |
|---|---|
| Selected estimate state | Use shareable dashboard URL state: `?estimate=<estimateId>&mode=<category|space|supplier>`. |
| Bucket next action | Do not pretend row-level bucket filtering exists. Use existing sheet and Compare links first, then add filtered-row deep links only after the estimate route supports them. |
| Proposal readiness scope | Summarize both XLSX/export readiness and shared-link readiness. Keep the full editor inside the existing Share and export flows. |
| Dashboard activity scope | Show only consequential events: estimate cost/structure changes, collaboration access changes, and proposal recipient/comment/decision activity. |
| `delafuentehouse` proof | The plan must support both live project rows and sample fallback. Browser proof stays pending until an authenticated run confirms which state this route has locally. |
| Typography exception | No exception approved. Stay inside the `DESIGN.md` app scale unless Philip explicitly approves a named exception later. |

## D1: URL State For Selected Estimate And Grouping

Use dashboard-local query params:

- `estimate`: selected estimate id.
- `mode`: selected grouping, one of `category`, `space`, or `supplier`.

Default behavior:

1. If `estimate` is present and belongs to the project, use it.
2. If `estimate` is missing or invalid, use the most recently updated estimate.
3. If `mode` is missing or invalid, use `category`.
4. Do not redirect just to normalize missing params. Use `router.replace` only after a user changes the dropdown or grouping control.

Reasoning:

- The user asked for an estimate sheet selected through a dropdown.
- The route already uses query-param contracts for Compare via `left`, `right`, and `mode`.
- Dashboard state should be shareable during review without making Compare params do dashboard work.

Implementation note:

- `ProjectDashboardPage` will need `searchParams`.
- `ProjectDashboardSummary` should expose `selectedEstimateId`.
- The cost-series loader should call `getDashboardEstimateSeries(projectId, selectedEstimateId)`.
- The UI should render `DropdownSelect` from `src/components/ui/dropdown-select.tsx`, not a native select.

## D2: Bucket Drilldown Contract

The selected bucket details panel should show:

- bucket label;
- amount;
- share of selected estimate;
- row count when known;
- grouping mode;
- selected estimate sheet;
- one primary action;
- one honest limitation note when row-level filtering is not supported.

Initial actions:

- For `space` buckets with a known node id: `Open space`.
- For buckets without a filterable route: `Open estimate sheet`.
- Secondary action: `Compare breakdown`, linking to `/workshop/projects/[projectId]/charts?left=<selectedEstimateId>&mode=<mode>`.

Do not add a fake "Open matching rows" action until the estimate sheet route can accept and honor a filter or highlighted row set.

Future filtered-route contract:

- Add a route/query contract such as `/workshop/projects/[projectId]/estimates/[nodeId]?filterMode=<mode>&filterBucket=<bucketId>`.
- Add tests that prove the estimate sheet receives the params, applies the visible filter or highlight, and gives the user a clear way to clear it.
- Only then change the dashboard action label to `Open matching rows`.

## D3: Proposal Readiness Projection

The dashboard body should summarize readiness, not duplicate the Share modal.

Readiness groups:

1. **Export readiness:** selected estimate exists, estimate has rows, project name exists, client exists, project address exists, currency is known, and proposal metadata is present enough for `proposal.xlsx`.
2. **Shared-link readiness:** publication status, selected estimate count, stale snapshot warning, password status, expiry status, open count, latest recipient open, latest comment or decision activity, and whether the current user can manage publication.

Recommended statuses:

- `Ready`: no known blockers.
- `Needs setup`: no selected estimate, no rows, or missing client/address.
- `Needs refresh`: stale publication snapshot exists.
- `Live`: shared link is published and not expired.
- `Expired`: shared link is expired.
- `Revoked`: shared link is revoked.
- `Manual send`: email delivery is not configured, so copy link/manual send is the path.

Interaction contract:

- One primary action only: `Prepare proposal`, `Review share settings`, or `Refresh shared link`.
- The action opens or routes to the existing owner surface. It does not recreate share settings in the dashboard.

## D4: Activity Feed Inclusion Rules

The dashboard feed is capped at 8 rows and remains a scan surface.

Include:

- estimate sheet created, copied, restored, deleted, or renamed;
- row changes with a nonzero total delta;
- template insertions;
- node/tree/tab structure changes;
- project metadata changes;
- collaborator invited, role changed, or removed;
- shared link published, refreshed, expired, revoked, sent, or resent;
- recipient comment;
- recipient decision;
- latest recipient open, summarized, not every open.

Exclude:

- autosave events;
- cursor/presence events;
- repeated same-actor bursts inside the existing burst window;
- raw access telemetry unless it becomes the latest meaningful owner signal;
- internal technical audit entries.

Flag-off behavior:

- If activity is disabled, do not show a blank panel that looks broken.
- Show a compact line in the readiness/risk area only when helpful: `Activity is not enabled in this environment.`
- Do not count flag-off as a project risk unless Philip explicitly wants environment configuration surfaced to end users.

## D5: `delafuentehouse` Route Contract

The named route is part of the planning target, so the dashboard must not depend only on anonymous source inspection.

Current evidence:

- `ProjectDashboardPage` renders fallback project details for a matching sample slug.
- `getProjectDashboardSummary(projectId)` only runs when a real project row exists.
- Unauthenticated local checks redirect to `/login?next=/workshop/projects/delafuentehouse`.

Plan decision:

1. The future implementation must support a live project row with real estimates.
2. It must also support sample fallback without showing a misleading empty dashboard.
3. Browser proof must be captured after authentication at desktop, laptop, and tablet widths.
4. If the local `delafuentehouse` route has no live project row, either seed data during a separate approved data/setup pass or document that the screenshot represents sample fallback only.

No code pass can claim this route complete from unauthenticated `curl` alone.

## D6: Visual Contract

No named dashboard typography exception is approved.

Use:

- SF Pro/system app scale from `DESIGN.md`;
- `12px` maximum for product/workshop text unless a later decision says otherwise;
- `3px` radius;
- hairline borders;
- flat white panels;
- Okabe-Ito chart colors only inside chart marks, legends, and table swatches;
- semantic status text plus icon or label, not color alone.

Avoid:

- marketing-scale hero numbers;
- equal KPI card grids;
- nested cards;
- orange app chrome;
- decorative construction motifs;
- heavy shadows;
- chart-only data.

## D7: Future Implementation Acceptance Tests

The future code pass should include focused tests for:

1. Missing query params default to most recent estimate and `category`.
2. Invalid `estimate` param falls back without leaking another project estimate.
3. `DropdownSelect` changes selected estimate and recomputes the donut/table.
4. Grouping mode changes without resetting selected estimate.
5. Recent estimate sheets include the selected estimate and at least the next recent sheets.
6. One-estimate state still shows the selected sheet and useful actions.
7. Zero-row estimate shows a useful empty cost state.
8. Proposal readiness shows export blockers and shared-link state without duplicating the modal.
9. Activity flag-off state is compact and not treated as project failure.
10. Donut data keeps an adjacent coded table with `aria-describedby`.
11. `delafuentehouse` authenticated screenshot proof is attached before completion.

## Handoff

Future implementers should read in this order:

1. `06-cockpit-revision-plan.md`
2. `07-requirement-coverage-and-evidence-matrix.md`
3. this file
4. `03-implementation-plan.md` only for earlier cost-first implementation details

The implementation target is the Project Cockpit, not the old Honest Hero.
