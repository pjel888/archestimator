# Shared Link Page — Client Presentation Workspace

Status: `ACTIVE / IMPLEMENTATION COMPLETE`  
Canonical entrypoint: this file  
Example route: `/share/FNX2rBm6V-wp5PE4CZnd3RSNezyvGfwmlhmBlFX30EE`

## Outcome

Turn the shared link into the client-facing commercial presentation and review
workspace for an issued estimate. It must use the full browser width, preserve the
estimate sheet's area/branch hierarchy in a read-only sheet, explain the financials
through accessible visualizations, and keep comments, revision requests, approval,
and decline actions attached to the immutable issued scope.

## Current Evidence

- The example token currently resolves through the legacy publication path, not the
  new Client Portal manifest path. Its HTML still uses `ShareContainer` with a
  `1440px` maximum width.
- The legacy page already carries immutable estimate rows, tabs, tree nodes,
  comments, and decisions. Its default experience is still document-shaped and its
  discussion is below the estimate rather than contextual.
- `ClientPortalShell` is full-viewport, but its section renderer is generic and does
  not yet provide the presentation-grade estimate/financial/discussion workspace.
- The July 12 Client Portal pack is archived unresolved. This pack owns the direct
  shared-link outcome and reuses useful findings without inheriting stale lifecycle
  claims or hosted cutover ceremony.

## Scope

- Full-width responsive shell for both current token families.
- Primary tabs: `Estimate`, `Financials`, `Discussion`, and `Decision`.
- Estimate tab: area/branch outline plus read-only sheet content, synchronized
  selection, search, totals, row targeting, and complete-data affordances.
- Financials tab: issue summary, cost by area/category, accessible chart/table
  equivalents, and clear data basis.
- Discussion: proposal, estimate, branch, and row context; estimator/client identity;
  status and version context.
- Decision: approve, request changes, decline, signer identity, note, and immutable
  issue/hash guard.
- Print remains document-oriented and excludes interactive chrome.

## Non-Goals

- Editing estimate values from the client page.
- Exposing unit-cost, margin, supplier negotiation, hidden draft, or internal source
  metadata unless an explicit publisher policy later allows it.
- Replacing immutable issue snapshots with live estimate reads.
- Deployment or external provider mutation in this local implementation loop.

## Acceptance Criteria

1. The page uses the full viewport at desktop widths; local prose may retain a
   readable measure, but the estimate workspace has no global max-width.
2. A recipient can understand the issued estimate by navigating the same area and
   branch structure the estimator uses and seeing corresponding read-only rows.
3. Primary views are clearly separated as Estimate, Financials, Discussion, and
   Decision without nested-tab ambiguity.
4. Financial totals reconcile to issued estimate totals and every chart has a table
   or list equivalent.
5. Authorized recipients can comment on the proposal, estimate, branch, or row and
   can identify whether a message came from the project team or client side.
6. Authorized recipients can approve, request changes, or decline the immutable
   issue; stale issue submissions fail safely.
7. Anonymous/view-only recipients can read permitted content but receive a clear
   explanation when comments or decisions require a personalized link.
8. Mobile reflows to a single content column with a controlled action surface;
   keyboard focus is not hidden by sticky UI.
9. Print renders all permitted issued rows and removes navigation, comments, and
   sticky actions.

## Decisions

- `DEC-001`: Use one client presentation model across legacy publication and Client
  Portal token families; adapt data at the boundary rather than maintain two UXs.
- `DEC-002`: Preserve immutable issued snapshots. Visualizations are derived at
  publish/adaptation time, never from anonymous live-project queries.
- `DEC-003`: Estimate is the default tab because the shared link's primary job is
  presenting costing, not showing a dashboard.
- `DEC-004`: Use a persistent branch outline on wide screens and a drawer/sheet on
  smaller screens. The read-only sheet remains the dominant surface.
- `DEC-005`: Discussion is contextual but also has an all-discussion view. Selection
  of an area/row changes the composer target without hiding other messages.
- `DEC-006`: Automated tests remain `NOT_REQUIRED` until explicitly authorized;
  source, diff, type/LSP, contract validation, and narrow runtime reads are the
  current evidence surface.

## Execution

See `03-IMPLEMENTATION-ROADMAP.md`. Units `UNIT-001` through `UNIT-008` are
verified locally. The pack remains active because release status and archival
disposition are intentionally separate from local implementation completion.

## Stop Condition

Every acceptance criterion is implemented against both active token families or is
explicitly proved inapplicable, the plan-pack validator passes, current source and
runtime evidence reconcile, and no core unit remains open.
