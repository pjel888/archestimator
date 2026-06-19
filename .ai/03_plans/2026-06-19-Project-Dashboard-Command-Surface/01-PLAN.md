# Project Dashboard Command Surface Plan

Date: 2026-06-19
Status: planning draft
Target route: `/workshop/projects/[projectId]`
Primary source screen: `src/components/workshop/ProjectDashboardClient.tsx`

## Problem Frame

The current project dashboard has improved visual polish, but it over-solves the page by filling the workspace with multiple project overview/action cards. The page should feel like a focused continuation of `/workshop` and `/workshop/projects`: one continuous workshop canvas, one compact project desk, and only the project-level information that helps users keep moving.

The dashboard should answer four questions quickly:

1. What estimate sheets were touched recently?
2. Is there a published client/share link, and what is its state?
3. What happened recently across this whole project?
4. Where exactly is this project?

## RALPLAN-DR Summary

### Drivers

- Visual continuity with the workshop dashboard and projects page.
- Fewer, more useful panels.
- Fast project-level data loading without per-sheet fan-out.
- First-class location data for both user value and future Archestimator intelligence.
- Clear privacy boundary between internal workshop data and public share surfaces.

### Recommended Option

Build a project "command surface" with a left project identity rail and a two-column workbench:

- Recent estimate sheets ledger.
- Published share links/status panel.
- Project activity timeline.
- Location map/pin panel.

This preserves the liquid-glass direction while removing decorative metrics, action tiles, and broad card grids.

### Alternatives Considered

| Option | Pros | Cons | Decision |
|---|---|---|---|
| Keep the current dashboard and only reduce visual intensity | Lowest code churn | Still feels overfilled and card-heavy | Reject |
| Project command surface with four high-value modules | Matches the user request, keeps scope clear, supports future data value | Requires new project activity query and later location data work | Choose |
| Map-first project dashboard | Strong visual identity | Overweights a future feature and distracts from active estimate/share workflows | Reject for MVP |
| Reuse the workshop dashboard components wholesale | Visual consistency | Project context needs different density and hierarchy | Use as vocabulary, not as copy/paste |
| Store exact coordinates directly on `projects` | Fast schema change | Broad `select("*")` readers can leak precise coordinates | Reject unless a later audit proves safe projections everywhere |
| Store exact coordinates in `project_locations` | Stronger privacy boundary, easier location history later | Extra migration and join | Choose for Phase 3 |

## UX Architecture

### Layout

Desktop:

- Keep the left editable project rail, but quiet it down and treat it as project identity/detail chrome.
- Main workbench is one liquid-glass surface with four modules:
  - top-left: recent estimate sheets;
  - top-right: published share links;
  - bottom-left: project activity timeline;
  - bottom-right: location/map.

Tablet:

- Two-column layout can collapse into a single workbench column with module order: recent sheets, share link, activity, location.

Mobile:

- Project identity rail becomes a top compact section.
- Modules stack in the same order.
- No horizontal overflow, no overlapping glass seams, no tiny map controls.

### Visual Rules

- Continue the workshop canvas/background from route shell to content; no route-local white slab.
- One glass owner per work zone; avoid nested glass-on-glass.
- Use dense ledger rows for data lists, borrowing row rhythm from `RecentSheetsList`.
- Paper/white should be used only where row legibility needs it; the shell itself stays frosted/translucent.
- Remove decorative action tiles, repeated project metric boxes, and oversized hero copy.
- Keep text compact; this is an operational tool, not a landing page.

### Visual Acceptance Checklist

- No route-local white slab.
- No extra hero/overview card.
- No decorative action-tile grid.
- No repeated metric/stat card row.
- No nested glass panels.
- Four dashboard modules maximum in the main workbench.
- Header, content, and footer read as one continuous workshop shell.

## User-Facing State Coverage

Success:

- Recent sheets show the most recently updated sheets and deep-link to the sheet or estimate workspace.
- Published links show current state, open/copy/manage actions, selected sheet count, and recent open/activity signal.
- Activity timeline shows recent cross-sheet changes grouped by time.
- Location shows an exact pin when present and a clear status when only an address or no address exists.

Loading:

- Use shell-consistent skeleton rows and map placeholder; avoid spinner-only states.
- Do not block the first paint on map bundle load.

Empty:

- No sheets: compact "No estimate sheets yet" row with one primary route to estimates.
- No published link: compact unpublished state with manage/create action.
- No activity: quiet empty timeline that explains the feed starts after edits.
- No location: address/pin setup state, not a fake map pin.

Error:

- Activity and map modules fail independently with small inline recovery copy.
- Project-level fetch failure should use the existing not-found/fallback route behavior.

Permission/Identity:

- Use existing project/workspace authorization before returning any project dashboard data.
- Public share users must not receive exact internal location data from this dashboard plan.

Mobile:

- Stack modules, keep controls tap-sized, keep map attribution visible.

Keyboard/Screen Reader:

- Lists must have real links/buttons, visible focus, and non-color-only status text.
- Map panel must expose saved coordinates/address in text and not require pointer-only interaction.

Copy/Readability:

- Avoid feature-explainer blocks. Use short labels: "Recent sheets", "Published link", "Activity", "Location".

## Technical Plan

### Unit 1 - Project Dashboard Data Loader

Expected files:

- `src/app/workshop/projects/[projectId]/page.tsx`
- `src/lib/repositories/workspace-repository.ts` or new `src/lib/repositories/project-dashboard-repository.ts`
- `src/lib/repositories/project-estimate-sheets-repository.ts`
- `tests/vitest/project-dashboard-client.test.tsx`

Plan:

- Add a project dashboard surface composed from request-cached leaf helpers keyed by `projectId`, not one monolithic page-blocking fetch.
- Implementation constraint: do not replace `ProjectChromeAsync` streaming with one page-blocking dashboard fetch. Page content may await only the data needed for the rendered dashboard phase; header chrome must keep its Suspense boundary and may reuse the same cached leaf helpers.
- Keep authorization at the project/workspace boundary by reusing `getCurrentWorkspaceProject(projectId)`.
- Avoid duplicating expensive publication/sheet calls already done by `ProjectChromeAsync`; page content and chrome must share the same cached source of truth or clearly split ownership.
- Settle the recent-sheets contract before UI work:
  - minimum fields: estimate id, sheet code/name, updated time, project id;
  - deep-link fields: first node id or another route-stable destination;
  - optional fields: favorite state only if the project dashboard deliberately includes favorites.

Acceptance:

- Page render does not introduce per-sheet queries.
- Page content and chrome do not independently re-fetch equivalent publication/sheet summaries.
- Header chrome remains streamed behind its existing Suspense boundary.
- Fallback sample project still works for local/demo states.
- Server-side fetches remain bounded and readable.

### Unit 2 - Simplified Project Desk UI

Expected files:

- `src/components/workshop/ProjectDashboardClient.tsx`
- Optional new components under `src/components/workshop/project-dashboard/`
- `src/components/workshop/ProjectRouteContentFallback.tsx`
- `tests/vitest/project-dashboard-core-ui.test.ts`
- `tests/vitest/project-dashboard-route-shell-ui.test.ts`

Plan:

- Remove the current project overview card, working-surface card, decorative action strip, and repeated metric cards from the route dashboard.
- Keep or split the left editable project rail as `ProjectIdentityRail`.
- Add a main `ProjectCommandSurface` using workshop dashboard glass tokens and dense embedded list grammar.
- Re-theme `ProjectRouteContentFallback` in lockstep with the dashboard so the layout Suspense fallback cannot flash the old white project slab.

Acceptance:

- No full white route-local background.
- No visible hard line between header/content/footer caused by the project page surface.
- Neither `loading.tsx` nor the layout Suspense fallback can show the old white slab.
- Main page has at most the project identity rail plus four useful modules.
- Mobile layout stacks without overlap.

### Unit 3 - Recent Estimate Sheets Ledger

Expected files:

- `src/lib/repositories/project-estimate-sheets-repository.ts`
- `src/components/workshop/project-dashboard/ProjectRecentSheetsLedger.tsx`
- `src/components/workshop/dashboard/lib.ts` if route helper reuse is needed
- Vitest coverage for ordering and links

Plan:

- Add or adapt a project-scoped recent sheets summary ordered by `updated_at desc`, limited to a small count.
- Include enough route data for deep links: estimate id, sheet code/name, updated time, project id, and first node id when available.
- Reuse row density from `RecentSheetsList`, but avoid importing the whole workshop dashboard if props do not match.

Acceptance:

- Recent sheets mirror workshop dashboard behavior at project scope.
- The implementation uses a dedicated recent-sheets helper; it does not reuse the publication picker helper unchanged because that helper is sheet-code ordered and lacks route fields.
- Empty state is one row, not another card.
- Rows deep-link correctly.

### Unit 4 - Published Share Links Panel

Expected files:

- `src/lib/publication/types.ts`
- `src/lib/repositories/workspace-repository.ts`
- `src/components/workshop/project-dashboard/ProjectPublishedLinksPanel.tsx`
- Existing `src/components/workshop/ProjectPublicationHeader.tsx` remains the full management surface

Plan:

- Use existing project publication summary/list summary types where possible.
- Show current publication status, client link path, selected estimate count, latest open/activity timestamp, open count, and whether access controls such as password are enabled.
- Keep full publication management in the existing header/modal; the dashboard panel is a status and shortcut surface.

Acceptance:

- Published, unpublished, revoked/expired/stale, and loading states are covered.
- Copy/open/manage actions never point to missing routes.
- Activity indicators do not claim opens when there are none.

### Unit 5 - Project Activity Timeline

Expected files:

- `src/lib/estimates/actions.ts` or new `src/lib/repositories/project-activity-repository.ts`
- New shared activity read/normalization module if helper extraction is needed
- `src/lib/activity/activity-composer.ts`
- `src/lib/activity/types.ts`
- Supabase migration for project-level event indexing if needed
- `tests/vitest/estimate-sheet-version-control-actions.test.ts`
- New activity repository/action tests

Plan:

- Do not call `fetchEstimateSheetVersionControl` once per estimate sheet.
- Add one project-scoped data path over `estimate_sheet_events`, returning a bounded, cursor-paginated timeline for the project.
- Extract or intentionally export the activity read helpers before using them from the project dashboard; do not import dashboard code through sheet-version-control action internals.
- Reuse the normalization and composition logic after it is available through a stable shared boundary:
  - `normalizeHistoryEvent`
  - `resolveActivityActorLabels`
  - `normalizeActivityReadFilters`
  - `applyActivityReadFilters`
  - `composeEstimateActivity`
- Return a compact event view model with estimate id/name/sheet code context.
- Use keyset pagination on `(created_at, id)`.
- Scope the first project activity feed to estimate-sheet events. Collaboration and share-link activity can be considered later, but should not be mixed into this feed until the information architecture is designed.
- Project activity must return a dashboard DTO, not raw `EstimateSheetHistoryEvent` or owner `ActivityViewModel`.
- The dashboard DTO must omit `old_snapshot`, `new_snapshot`, `payload`, `metadata`, `raw`, `correlation_id`, and any ids that are not needed for rendering or navigation.

Recommended data/index direction:

- Add `project_id` to `estimate_sheet_events`, populate from `estimate_id`, and maintain it with a trigger or write-path update.
- Add `estimate_sheet_events_project_created_idx` on `(project_id, created_at desc, id desc)`.
- Add a type-filtered index only if timeline filters become important after measurement.
- If `project_id` is added to `estimate_sheet_events`, the migration must include backfill, write-path or trigger maintenance, index creation, RLS/grant review, generated types, and rollback or fix-forward notes.

Acceptance:

- One bounded project timeline query, not O(number of estimate sheets).
- Cursor pagination is stable under new inserts.
- Actor labels are resolved once per page.
- Raw event payloads/snapshots are not sent to the client.
- Timeline respects project authorization and any future sheet-level access boundaries.
- Project dashboard depends on a shared activity module or repository, not on private helper functions buried in `src/lib/estimates/actions.ts`.
- Project dashboard receives a redacted DTO only.

### Unit 6 - Project Location And Map

Expected files:

- Supabase migration for a structured `project_locations` table
- Generated database types
- `src/components/workshop/project-dashboard/ProjectLocationPanel.tsx`
- Client-only map island, likely `ProjectLocationMap.tsx`
- Project update action/repository tests

Plan:

- Treat exact manual pin/drop/drag as the primary source of truth.
- Keep the existing free-text project address as display/address context.
- Add structured WGS84 coordinates with source and accuracy metadata in a dedicated `project_locations` table.
- Lazy-load the map client island so the project dashboard is not blocked by map bundle/WebGL.
- Use MapLibre GL JS with OpenFreeMap for MVP, behind config-driven provider/style URLs.
- Preserve visible OSM/OpenMap attribution in the map panel.
- Avoid storing exact coordinates directly on `projects` while `getCurrentWorkspaceProject` and other readers still use broad `select("*")` project projections.

Suggested data shape:

- `id`
- `project_id`
- `workspace_id`
- `latitude`
- `longitude`
- `source` (`manual_pin`, `address_geocode`, `imported`)
- `accuracy_m`
- `display_address`
- `geocoder_provider`
- `geocoder_place_id`
- `geocoded_at`
- `created_at`
- `updated_at`
- `updated_by`

Schema contract:

- MVP default is one active location row per project with a unique `project_id` constraint.
- Add latitude and longitude range checks.
- Add RLS through project/workspace access.
- Review grants explicitly; no broad anonymous/public read.
- Regenerate Supabase types after migration.
- Document fix-forward/rollback notes for the migration.
- Historical location rows are deferred until there is a clear audit/product need.

Privacy:

- Exact coordinates are internal project data.
- Do not expose exact coordinates on public share/proposal surfaces by default.
- Future analytics should use rounded coordinates, geohash buckets, or region aggregation instead of sending exact project locations to third-party analytics.
- If a future implementation chooses columns on `projects` anyway, it must first replace broad project row serialization with safe projection helpers and add leak tests for publication, public share, AI/project context, and export paths.

Acceptance:

- Manual pin can be saved and reloaded.
- Address-only projects do not show a fake exact pin.
- Map attribution remains visible.
- Map provider failure leaves a usable text coordinate/address state.
- No tests hit public tile or geocoding services.
- Location table RLS, coordinate validation, generated types, and leak tests are complete before claiming Phase 3 done.

### Unit 7 - Loading, Responsive, And Accessibility Polish

Expected files:

- `src/app/workshop/projects/[projectId]/loading.tsx`
- `src/components/workshop/ProjectRouteContentFallback.tsx`
- `src/components/workshop/StaticWorkshopLoadingShell.tsx`
- Project dashboard tests
- Optional CSS token additions in `src/app/globals.css`

Plan:

- Align loading shell with the simplified workbench.
- Align the layout Suspense fallback with the simplified workbench.
- Keep page header/footer visually continuous with workshop shell.
- Verify mobile, tablet, and desktop states.

Acceptance:

- Loading route does not reintroduce the white background.
- Layout Suspense fallback does not reintroduce the white background.
- No module shifts layout after data loads except replacing skeleton rows.
- Focus states are visible on module actions.

## Map Provider Decision

Recommended MVP:

- Map rendering: MapLibre GL JS.
- Tiles/style: OpenFreeMap public vector tiles for closed-beta MVP.
- Upgrade path: self-hosted Protomaps/PMTiles when usage, privacy, or reliability requires it.
- OpenFreeMap is closed-beta acceptable only behind configuration; do not claim provider reliability or SLA.
- The implementation must support disabling the interactive map or swapping style/tile URLs without code changes.
- The location panel must keep a text coordinate/address fallback even when the interactive map is disabled.
- Tests must mock provider calls and must not call public map/geocoding services.

Do not use:

- `tile.openstreetmap.org` as production tile infrastructure.
- Public Nominatim for autocomplete, per-keystroke search, scheduled reverse-geocoding, analytics enrichment, or bulk lookups.
- OpenMaps.fr for commercial beta without negotiated terms.

## Phasing

### Phase 1 - Simplify The Dashboard With Existing Data

- Replace the current main card grid with the four-module command surface.
- Add a dedicated project recent-sheets summary helper. Do not reuse the publication picker helper unchanged: it is sheet-code ordered and lacks route fields.
- Required recent-sheets order is `updated_at desc`; required fields are estimate id, project id, name, sheet code, `updated_at`, and `firstNodeId | null` for stable deep links.
- Add publication summary using the shared cached leaf helper used by the header chrome.
- Add non-interactive location placeholder/address module if structured coordinates are not ready.
- Re-theme both `loading.tsx` and `ProjectRouteContentFallback` so route transitions do not flash the old white slab.

Exit:

- Visual direction is simplified and matches the workshop shell.
- No source/database map dependency yet unless deliberately included.

### Phase 2 - Project Activity Timeline

- Add project-scoped activity data path.
- Add/verify indexing and cursor pagination.
- Render compact project activity feed.

Exit:

- Activity feed works with bounded project query and test coverage.

### Phase 3 - Exact Location Pin

- Add structured location data.
- Add lazy MapLibre/OpenFreeMap map island.
- Add manual pin save flow.

Exit:

- Users can set and reload exact project coordinates.
- Map failure and no-WebGL states are graceful.

## Validation Gate

Before implementation completion is claimed:

- Run targeted Vitest coverage for project dashboard UI states.
- Run activity data-path tests, including pagination, authorization, and no raw payload exposure.
- Run migration/RPC tests or SQL proof for activity index and location fields if implemented.
- Run `git diff --check`.
- Run browser/visual verification only for the implemented phases:
  - desktop and mobile screenshots for the project dashboard route;
  - route shell continuity checks;
  - map attribution and no-overlap checks when the map phase lands.
- Run UltraQA scenarios from `03-VERIFICATION-MATRIX.md`.

## Risks And Mitigations

| Risk | Impact | Mitigation |
|---|---:|---|
| The page becomes card-heavy again | High | Cap the main dashboard to four modules and one project rail |
| Activity feed fans out per estimate | High | Add project-scoped timeline query and index |
| Map dependency slows the route | Medium | Lazy client-only map island; text fallback |
| Public map/geocoding policy violation | High | Use OpenFreeMap for MVP, avoid OSM raster production dependency, no Nominatim autocomplete |
| Precise location data leaks to share pages | High | Keep coordinates internal by default; explicit future publication decision required |
| Precise location data leaks through broad project readers | High | Use `project_locations` table and safe projection helpers |
| Workshop header/content/footer seam returns | Medium | Use existing shell glass surface and avoid route-local white slab |

## ADR

Decision: Replace the current project dashboard card grid with a project command surface using four project-level modules: recent sheets, published link, activity timeline, and location.

Context: The user likes the liquid-glass direction but finds the current dashboard too filled-up and visually separate from the workshop dashboard.

Consequences:

- The page becomes more useful and quieter.
- Activity requires a new project-level data path for performance.
- Location becomes first-class project data rather than a free-text-only field.
- Map/geocoder choices need explicit provider and privacy boundaries.
- Header chrome streaming must be preserved while page dashboard data is improved.

Rejected:

- A broad dashboard full of metric cards.
- Separate duplicate page/chrome fetches for the same sheet/publication summaries.
- Direct dependency on private sheet-version-control helper functions.
- Exact coordinates on `projects` without a prior safe-projection audit.
- Production dependence on public OSM tile servers.
- Nominatim-powered autocomplete.
- A map-first page before sheet/share/activity basics are right.

## Staffing Guidance

Use `ultragoal` for durable execution if the implementation spans multiple sessions. Use `ultrawork` or native subagents when splitting into lanes:

- Lane A: UI simplification and responsive/loading states.
- Lane B: recent sheets and publication summary integration.
- Lane C: project activity timeline data path and indexes.
- Lane D: location/map data model and client island.
- Lane E: QA, accessibility, and visual verification.

Maker/checker split:

- UI implementer should not be the only visual verifier.
- Activity data implementer should not be the only privacy/performance verifier.
