# UNIT-016 — Publisher Portal Portfolio and Control Center

## Delivered

- Project Client Portals now use a manager-gated, D1-scoped roster with server-side status filtering and cursor pagination. The query fetches one page plus one sentinel row and calculates recipient/discussion summaries in the database instead of broad client-side scans.
- Each portal card leads to a dedicated full-page control center. The control center separates Overview, Content, Branding, People, Discussions, Decisions, Activity, Versions, and Settings into stable, URL-addressable tabs.
- The control center reuses the existing recipient next-action projection, discussion queue, decision history, owner audit, issued versions, and access policy without exposing those owner-only records to public routes.
- Tab loading is deliberately bounded: inactive tabs do not query unrelated recipients, discussions, decisions, or audit data. The Content tab derives selected-estimate source freshness from its portal-scoped section configuration and displays the last source update separately from the section configuration timestamp.
- The project sidebar links to the Client Portals roster, preserving the legacy Publisher/share workspace as a distinct compatibility surface pending the explicit migration work in later units.

## Validation

- Focused control-center suite passed: 1 file, 3 tests. It proves manager/project scoping, bounded D1 status/cursor pagination, and Content-tab source freshness without inactive-tab D1 reads.
- Targeted ESLint passed for the control-center service, route, presentation component, sidebar, and focused test.
- `git diff --check` passed for the Unit 16 and Publisher-audit review surfaces.
- `bun run type-check` was attempted after the Unit 16 changes. It is blocked by unrelated shared-worktree nullability errors in `src/lib/admin/support-actions.ts` at lines 97, 103, 167, 182, and 188; no Unit 16 path is named in that output.

## Boundary

- No browser automation, screenshots, hosted D1/Email/Queue verification, or provider mutation was run.
- The legacy `/workshop/publisher` client-link workflow remains live and is not claimed replaced. Its unique remediation work remains active in `Publisher-Page-Audit`; the newer v2 control center is available from project navigation.
