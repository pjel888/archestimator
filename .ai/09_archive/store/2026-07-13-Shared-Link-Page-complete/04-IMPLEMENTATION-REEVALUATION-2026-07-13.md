# Implementation Re-evaluation — 2026-07-13

## Implemented In This Loop

- Removed the legacy shared page's global maximum width while retaining responsive
  gutters and local readable measures.
- Added primary `Estimate`, `Financials`, `Discussion`, and `Decision` views to the
  legacy recipient workspace.
- Added immutable-snapshot cost-by-area bars, percentages, issued total, sheet
  counts, line counts, and sheet reconciliation to the legacy financial view.
- Reframed the Client Portal shell around presentation-level views instead of
  exposing the composer section list as its primary information architecture.
- Upgraded the Client Portal estimate browser from one flat table to estimate-sheet
  tabs, sheet-tab navigation, designation-derived area branches, branch totals,
  branch filtering, search, complete-row loading, and print expansion.
- Replaced raw Client Portal financial JSON with accessible issued-total,
  cost-breakdown, and estimate-comparison views.
- Mounted the existing recipient thread APIs in a bilateral discussion workspace
  with thread listing, owner/client identity, unread markers, new conversations,
  and replies. Anonymous viewers receive an explicit personalized-link explanation.
- Preserved issue-wide decision capability checks and immutable content-hash
  submission behavior.

## Evidence

- ESLint passed for every changed share and Client Portal component.
- TypeScript passed with `bunx tsc --noEmit --pretty false`.
- `git diff --check` passed.
- Product tests and browser automation were not run; the repository's user test
  authorization gate remains in force.

## Re-evaluated Gaps

1. Client Portal area hierarchy is reconstructed from issued row designations
   because estimate-browser payload schema v1 does not preserve snapshot tree nodes.
   A future additive payload revision should issue explicit sanitized tree nodes and
   row node IDs for exact workshop-tree fidelity.
2. Legacy discussion still supports proposal, estimate, and row targets but not an
   explicit branch target. Client Portal supports typed area/node targets at the
   repository boundary, but the new public composer currently starts portal-level
   threads until estimate-row discussion triggers are connected.
3. Client Portal cost breakdown payloads are currently discipline-based. Exact
   cost-by-area parity requires the same additive issued-tree payload revision.
4. Browser-based visual and responsive QA remains unproven in this loop.

## Next Loop

Prioritize the additive issued estimate projection: sanitized tree nodes, row node
IDs, and area financial buckets. Then connect branch/row selection to the discussion
composer and perform the authorized design-QA/browser pass when the browser control
surface is available.

## Loop Two — Exact Hierarchy And Browser QA

Implemented after the first reevaluation:

- Direct Client Portal publishing now loads active estimate tabs and estimate nodes
  alongside rows and includes them in the immutable publication snapshot.
- The additive estimate-browser projection now carries sanitized tree nodes and row
  node IDs. Existing schema-v1 payloads remain readable through designation fallback.
- Cost-breakdown issuance defaults to top-level area aggregation, rolls descendant
  row totals into each area, and records the configured grouping basis.
- Client Portal branch and row review actions now open the discussion composer with
  exact issued `area_group`, `estimate_tab`, or `row` public IDs and the originating
  section policy.
- The legacy no-image cover placeholder was removed because it delayed the estimate
  with a large empty panel. Zero-row donut chrome is also suppressed.
- The legacy mobile tree layout now stacks instead of rendering two full-width panes
  in one flex row, and duplicate top mobile tabs are hidden in favor of the fixed
  four-view navigation.

Fresh evidence:

- ESLint, TypeScript, and `git diff --check` passed after the issuance and interaction
  changes.
- Headless Chrome loaded the actual example token with HTTP 200 at `1440x1000` and
  measured `scrollWidth=1440`, `clientWidth=1440`.
- Before responsive repair, the `390x844` audit measured `scrollWidth=441` and a
  `1790px` body. After repair it measured `scrollWidth=390`, `clientWidth=390`, and a
  `1102px` body with all four primary actions available.
- Financials rendered issued total, estimate/row counts, area empty state, and sheet
  reconciliation at 390px without overflow. Discussion rendered its explicit
  recipient-session requirement at the same viewport.

Populated-data proof:

- A temporary local-only publication built from the existing Lewis Residence data
  loaded with HTTP 200 and rendered three issued estimate sheets, three rows, the
  four-level Ground Floor hierarchy, and a reconciled PHP 8,262,500 total.
- At `1440x1000`, the populated presentation measured `scrollWidth=1440` and
  `clientWidth=1440`. The estimate view showed the exact issued branch tree beside
  the complete hierarchy without horizontal page overflow.
- The populated source also exposed legitimate blank row descriptions. The issued
  browser now falls back to material, designation, then `Untitled item` for visible
  labels, search, and discussion targets.
- The proof publication was deleted from local D1 after inspection. No fixture,
  production resource, or permanent repository data was added.
