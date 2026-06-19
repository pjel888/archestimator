# Project Dashboard Command Surface Plan

Date: 2026-06-19
Status: planning-ready; Phase 1 releasable, Phase 2/3 gated; Google Maps/Places addendum supersedes the prior OpenFreeMap/MapLibre direction
Target route: `/workshop/projects/[projectId]`
Primary source screen: `src/components/workshop/ProjectDashboardClient.tsx`

## Problem Frame

The current project dashboard has improved visual polish, but it over-solves the page by filling the workspace with multiple project overview/action cards. The page should feel like a focused continuation of `/workshop` and `/workshop/projects`: one continuous workshop canvas, one compact project desk, and only the project-level information that helps users keep moving.

The dashboard should answer four questions quickly:

1. What estimate sheets were touched recently?
2. Is there a current published client/share link, and what is its state?
3. What happened recently across this whole project?
4. Where exactly is this project?

## RALPLAN-DR Summary

### Drivers

- Visual continuity with the workshop dashboard and projects page.
- Fewer, more useful panels.
- Fast project-level data loading without per-sheet fan-out.
- First-class location data for both user value and future Archestimator intelligence.
- A single trusted map/search provider for the project-location UX.
- Clear privacy boundary between internal workshop data and public share surfaces.

### Recommended Option

Build a project "command surface" with a left project identity rail and a two-column workbench:

- Recent estimate sheets ledger.
- Current published share status panel.
- Project activity timeline.
- Google location search and map/pin panel.

This preserves the liquid-glass direction while removing decorative metrics, action tiles, and broad card grids.

### Alternatives Considered

| Option | Pros | Cons | Decision |
|---|---|---|---|
| Keep the current dashboard and only reduce visual intensity | Lowest code churn | Still feels overfilled and card-heavy | Reject |
| Project command surface with four high-value modules | Matches the user request, keeps scope clear, supports future data value | Requires new project activity query and later location data work | Choose |
| Map-first project dashboard | Strong visual identity | Overweights a future feature and distracts from active estimate/share workflows | Reject for MVP |
| OpenFreeMap/MapLibre map with separate geocoder | No Google billing account needed | Splits autocomplete/search from map display, adds provider trust questions, and risks policy ambiguity when Places data enters the flow | Superseded by Google-only addendum |
| Reuse the workshop dashboard components wholesale | Visual consistency | Project context needs different density and hierarchy | Use as vocabulary, not as copy/paste |
| Store exact coordinates directly on `projects` | Fast schema change | Broad `select("*")` readers can leak precise coordinates | Reject unless a later audit proves safe projections everywhere |
| Store exact coordinates in `project_locations` | Stronger privacy boundary, easier location history later | Extra migration and join | Choose for Phase 3 |

## UX Architecture

### Layout

Desktop:

- Keep the left editable project rail, but quiet it down and treat it as project identity/detail chrome.
- Main workbench is one liquid-glass surface with four modules:
  - top-left: recent estimate sheets;
  - top-right: current published share status;
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

## Requirements Trace

- R1. The route reads as one continuous workshop command surface, not a separate white project form.
- R2. The main workbench contains at most four project-level modules: recent sheets, current published link, estimate activity, and location.
- R3. The left project identity rail remains editable unless a deliberate replacement preserves the same save behavior and hidden metadata.
- R4. Recent sheets are project-scoped, `updated_at desc`, bounded, and deep-linkable without using the publication picker contract.
- R5. The published-link module is a compact current-publication status/shortcut surface and does not reimplement the full management modal.
- R6. The project activity module uses one bounded, authorized, project-scoped read path and sends only a redacted dashboard DTO to the client.
- R7. Exact project coordinates remain internal by default and are not serialized to public share, proposal/export, AI/context, analytics, or broad project readers.
- R8. Location interaction works without pointer-only controls and remains useful when Google Maps/Places is disabled, unavailable, or unconfigured.
- R9. Google Maps/Places behavior is config-driven, attribution-safe, CSP-accounted, quota/budget guarded, and never tested against live public providers in CI.
- R10. Each implemented phase has targeted tests, migration/RLS proof when applicable, browser artifacts for browser-only claims, and explicit stop conditions.

## User-Facing State Coverage

Success:

- Recent sheets show the most recently updated sheets and deep-link to the sheet or estimate workspace.
- Published links show current state, open/copy/manage actions, selected sheet count, and recent open/activity signal.
- Activity timeline shows recent cross-sheet changes grouped by time.
- Location shows an exact pin when present and a clear status when only an address or no address exists.

Loading:

- Use shell-consistent skeleton rows and a map/search placeholder; avoid spinner-only states.
- Do not block the first paint on the Google Maps bundle load.

Empty:

- No sheets: compact "No estimate sheets yet" row with one primary route to estimates.
- No published link: compact unpublished state with manage/create action.
- No activity: quiet empty timeline that explains the feed starts after edits.
- No location: address/pin setup state, not a fake map pin.

Error:

- Activity and map/search modules fail independently with small inline recovery copy.
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

## Phased UX Contract

Phase 1 is allowed to ship before the project activity query and exact pin map exist, but it must not fake either feature.

- Recent sheets and current published link are real Phase 1 modules.
- Activity in Phase 1 may show a compact "Estimate activity is coming in the next slice" placeholder or be omitted from the workbench. It must not show invented events.
- Location in Phase 1 shows saved project address context and "No exact pin saved" when no structured coordinates exist. It must not render a fake pin or import a map dependency.
- "Four modules maximum" means the main workbench may show fewer than four populated modules in an earlier phase.
- The project identity rail is supporting chrome, not one of the four modules.

## Accessibility Implementation Contract

- Use a single page `main` region from the route shell and named regions for project identity, recent sheets, published link, estimate activity, and location.
- Keep heading hierarchy shallow: route title from `WorkshopPageShell`, H2-equivalent module names inside the workbench, row labels as text rather than nested headings.
- Keyboard order is identity rail -> recent sheets -> published link -> activity -> location. Mobile keeps the same logical order.
- Recent sheet rows and publication actions must be native links/buttons with visible focus rings.
- Copy/save success and failure use polite `aria-live` feedback; destructive or permission-denied failures use assertive inline copy only when action is blocked.
- Map interaction must have a non-pointer equivalent: saved coordinates/address are readable as text, and edit mode exposes numeric latitude/longitude inputs or another keyboard-save path.
- Reduced motion and reduced transparency keep the command surface legible with solid fallback materials and no animated blur.

## Launch-Gate Dependencies

This route plan does not close wider-launch gates. It must not worsen them.

- Phase 1 has no database or provider dependency and can complete with targeted local proof.
- Phase 2 database work must run through `10-MIGRATION-RLS-QA-RUNBOOK.md`; it must include migration ledger alignment, scratch reset parity or equivalent local proof, generated types, RLS/grant proof, and fix-forward notes.
- Phase 3 exact-location work must run through `09-LOCATION-MAP-CSP-PROVIDER-ADR.md`; it must include DSAR/export/delete, privacy copy, Google CSP/provider, quota/budget, telemetry, key-restriction, and map-disable proof before beta-ready claims.
- Current known unrelated validation reds do not block this plan, but any new failure in touched files or phase-owned tests blocks the phase.

## Beta Task Acceptance

Phase 1 is useful only if a contractor can complete these checks without reading implementation notes:

- Find the most recently edited estimate sheet and open it from the project dashboard.
- Identify whether a current client/public link exists and reach the existing manage/copy/open path without a duplicate modal.
- Understand whether project activity is available now or intentionally deferred.
- Distinguish address-only location context from an exact saved pin.
- Move through the page by keyboard and see focus on every actionable control.

## Technical Plan

### U1. Project Dashboard Data Loader

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
- Helper ownership follows `06-DATA-OWNERSHIP-CONTRACT.md`.
- Phase 1 adds no more than one intentionally distinct recent-sheets read beyond the existing streamed chrome summaries unless the shared cached base helper removes that need.

### U2. Simplified Project Desk UI

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
- Preserve identity rail behavior: name/client/address editing, hidden image metadata, currency/project code preservation, and blur-save behavior unless the unit deliberately replaces it with an explicit save path and matching tests.
- Material map:
  - route shell and outer workbench: one glass owner;
  - identity rail: glass chrome with flat controls;
  - recent sheets/activity rows: plain or paper ledger rows inside the workbench;
  - published link: compact status row with one primary action;
  - location: text controls plus optional map viewport, no nested blur.
- Primitive reuse:
  - adapt `DashboardGlassPanel` material vocabulary where practical;
  - use shared `Button`, skeleton, focus, and icon-button primitives where practical;
  - borrow `RecentSheetsList` density, not its full props contract;
  - do not create new feature-local action-tile/button patterns.

Acceptance:

- No full white route-local background.
- No visible hard line between header/content/footer caused by the project page surface.
- Neither `loading.tsx` nor the layout Suspense fallback can show the old white slab.
- Main page has at most the project identity rail plus four useful modules.
- Mobile layout stacks without overlap.
- Current route header actions still render `ProjectPublicationHeader` and `ProjectTeamspaceHeader` through `ProjectChromeAsync`.

### U3. Recent Estimate Sheets Ledger

Expected files:

- `src/lib/repositories/project-estimate-sheets-repository.ts`
- `src/components/workshop/project-dashboard/ProjectRecentSheetsLedger.tsx`
- `src/components/workshop/dashboard/lib.ts` if route helper reuse is needed
- Vitest coverage for ordering and links

Plan:

- Add or adapt a project-scoped recent sheets summary ordered by `updated_at desc`, limited to a small count.
- Include enough route data for deep links: estimate id, sheet code/name, updated time, project id, and first node id when available.
- Reuse row density from `RecentSheetsList`, but avoid importing the whole workshop dashboard if props do not match.
- Use `listRecentProjectEstimateSheets(projectId, limit)` or equivalent from `06-DATA-OWNERSHIP-CONTRACT.md`.
- Limit default: 5 rows, hard-clamped to 10.
- First-node lookup must be bounded. If no node exists, route to the estimate list or another stable estimate-level destination rather than manufacturing a node link.

Acceptance:

- Recent sheets mirror workshop dashboard behavior at project scope.
- The implementation uses a dedicated recent-sheets helper; it does not reuse the publication picker helper unchanged because that helper is sheet-code ordered and lacks route fields.
- Empty state is one row, not another card.
- Rows deep-link correctly.
- Identical `updated_at` rows sort deterministically by a secondary key.

### U4. Current Published Link Panel

Expected files:

- `src/lib/publication/types.ts`
- `src/lib/repositories/workspace-repository.ts`
- `src/components/workshop/project-dashboard/ProjectPublishedLinksPanel.tsx`
- Existing `src/components/workshop/ProjectPublicationHeader.tsx` remains the full management surface

Plan:

- Use existing project publication summary/list summary types where possible.
- Show current publication status, client link path, selected estimate count, latest open/activity timestamp, open count, and whether access controls such as password are enabled.
- Keep full publication management in the existing header/modal; the dashboard panel is a status and shortcut surface.
- Treat this as singular current publication state. Historical/revoked multi-link browsing is out of scope.
- Dashboard DTO defaults to aggregate fields only. Do not show recipient email/display name unless a separate product decision approves it.
- Action hierarchy:
  - unpublished: primary action is manage/create through the existing publication header/modal boundary;
  - published active: primary action is copy link, secondary actions are open and manage;
  - revoked/expired/stale: hide or disable open/copy and route the user to manage;
  - copy success/error uses inline or polite live feedback.

Acceptance:

- Published, unpublished, revoked/expired/stale, and loading states are covered.
- Copy/open/manage actions never point to missing routes.
- Activity indicators do not claim opens when there are none.
- The panel does not remove or duplicate `ProjectPublicationHeader`.

### U5. Project Estimate Activity Timeline

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
- Follow `08-PROJECT-ACTIVITY-CONTRACT.md` before UI implementation starts.
- Label the module "Estimate activity" or otherwise clarify that share-link and collaboration activity are not included in this slice.
- Row content grammar: time, event label, actor label, estimate/sheet context, compact summary, and optional navigation target. Group by day when more than one day is present; otherwise render a flat compact list.
- Pagination affordance: `Load more` row with pending and terminal states; page size 20, hard-clamped to 50.

Recommended data/index direction:

- Add `project_id` to `estimate_sheet_events`, populate from `estimate_id`, and maintain it with a trigger or write-path update.
- Preferred migration path is trigger-first: add nullable column, backfill, add trigger, prove all writers populate it, then make it not null if safe. See `10-MIGRATION-RLS-QA-RUNBOOK.md`.
- Add `estimate_sheet_events_project_created_idx` on `(project_id, created_at desc, id desc)`.
- Add a type-filtered index only if timeline filters become important after measurement.
- If `project_id` is added to `estimate_sheet_events`, the migration must include backfill, write-path or trigger maintenance, index creation, RLS/grant review, generated types, and rollback or fix-forward notes.

Acceptance:

- One bounded project timeline query, not O(number of estimate sheets).
- Cursor pagination is stable under new inserts.
- Actor labels are resolved once per page.
- Raw event payloads/snapshots are not sent to the client.
- Timeline immediately respects current project and sheet-level access boundaries. Do not rely on workspace-member event RLS as the dashboard boundary.
- Project dashboard depends on a shared activity module or repository, not on private helper functions buried in `src/lib/estimates/actions.ts`.
- Project dashboard receives a redacted DTO only.

### U6. Project Location And Map

Expected files:

- Supabase migration for a structured `project_locations` table
- Generated database types
- `src/components/workshop/project-dashboard/ProjectLocationPanel.tsx`
- Client-only Google map island, likely replacing `ProjectLocationMap.tsx`
- Google Places autocomplete client island, likely `ProjectLocationGoogleAutocomplete.tsx` or an equivalent colocated component
- Google map/search config helper, replacing the OpenFreeMap/MapLibre-specific config
- Dependency/config cleanup for `package.json`, `bun.lock`, `next.config.ts`, and any map-provider tests/scripts created for the older provider path
- Project update action/repository tests

Plan:

- Treat the saved project location row as the primary source of truth after setup. Google Places autocomplete is used when setting or editing the location, not on every dashboard view.
- Keep the existing free-text project address as display/address context.
- Add structured WGS84 coordinates with source, accuracy, provider, and provider-place-id metadata in a dedicated `project_locations` table.
- Use Google Places Autocomplete for the address/city search field when a Google key is configured. Fetch only the fields needed to save and display the project location: formatted address, display name when useful, place id, viewport when useful, and latitude/longitude.
- Use Google Maps JavaScript API for the displayed map so Google Places results are shown on a Google map. Do not combine Google Places data with OpenFreeMap/MapLibre rendering.
- Prefer a low-usage display model: normal project dashboard reads render the stored coordinates; only edit/setup sessions invoke Places autocomplete and place details.
- Lazy-load the Google map/search client island so the project dashboard is not blocked by the Google bundle.
- Preserve Google's native attribution/branding controls and do not cover them with dashboard chrome.
- Remove the prior OpenFreeMap/MapLibre implementation path during the implementation follow-up: dependency, config, CSP allowances, tests, browser proof script, and docs copy should no longer point at `maplibre-gl` or `tiles.openfreemap.org` as the target provider.
- Avoid storing exact coordinates directly on `projects` while `getCurrentWorkspaceProject` and other readers still use broad `select("*")` project projections.
- Follow `09-LOCATION-MAP-CSP-PROVIDER-ADR.md` before adding dependencies.
- Structured location can ship without an interactive map if Google provider/privacy/CSP/quota proof is not ready.
- Location writes require editor-or-higher project authority. Viewers and sheet-only collaborators may read exact coordinates only if project access policy permits project detail viewing; they cannot write.
- Sample/demo projects cannot persist coordinates.
- Save semantics: first save inserts the one active row; later saves update the row; clear pin removes exact coordinates while preserving free-text project address context.
- Abuse controls: reject out-of-range values, rate-limit or debounce repeated saves, and handle concurrent edits with last-write visible feedback or optimistic conflict handling.
- Google operational controls: require browser-restricted API keys, enabled Maps JavaScript API and Places API, production-domain and localhost restrictions, budget alerts, and quota caps before enabling outside local development.

Suggested data shape:

- `id`
- `project_id`
- `workspace_id`
- `latitude`
- `longitude`
- `source` (`manual`, `geocoded`, `imported`; Google Places selections use `geocoded`)
- `accuracy_m`
- `display_label`
- `address_text`
- `geocoder_name` (`google` for Google Places selections)
- `provider_place_id` (Google Place ID when a place is selected)
- `geocoded_at`
- `created_at`
- `updated_at`
- `updated_by`
- optional metadata that must exclude raw Google response payloads unless a later privacy review approves retention

Schema contract:

- MVP default is one active location row per project with a unique `project_id` constraint.
- Add latitude and longitude range checks.
- Add RLS through project/workspace access.
- Review grants explicitly; no broad anonymous/public read.
- Regenerate Supabase types after migration.
- Document fix-forward/rollback notes for the migration.
- Historical location rows are deferred until there is a clear audit/product need.
- Cascade/delete/export/DSAR/retention behavior is part of the schema contract, not a follow-up. See `09-LOCATION-MAP-CSP-PROVIDER-ADR.md`.

Privacy:

- Exact coordinates are internal project data.
- Do not expose exact coordinates on public share/proposal surfaces by default.
- Future analytics should use rounded coordinates, geohash buckets, or region aggregation instead of sending exact project locations to third-party analytics.
- If a future implementation chooses columns on `projects` anyway, it must first replace broad project row serialization with safe projection helpers and add leak tests for publication, public share, AI/project context, and export paths.

Acceptance:

- Manual pin can be saved and reloaded.
- Google Places selection can populate formatted address, place id, latitude, and longitude, then save once to `project_locations`.
- Address-only projects do not show a fake exact pin.
- Google map attribution/branding remains visible.
- Google Maps/Places disabled, missing-key, quota, or load failure leaves a usable text coordinate/address state.
- No tests hit live public map/geocoding services.
- MapLibre/OpenFreeMap dependency and provider config are removed or marked obsolete in source tests during the implementation follow-up.
- Location table RLS, coordinate validation, generated types, and leak tests are complete before claiming Phase 3 done.
- Coordinates do not appear by default in public share, proposal/export, AI/context, analytics, or broad project row readers.

### U7. Loading, Responsive, And Accessibility Polish

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
- Browser proof for this unit is limited to browser-only claims: route shell continuity, desktop/mobile stacking, no horizontal overflow, and no white slab.

## Map Provider Decision

Current target:

- Provider: Google Maps Platform only for project-location search and display.
- Map rendering: Google Maps JavaScript API.
- Address/city search: Google Places Autocomplete, using session-aware autocomplete behavior and fetching only location essentials on selection.
- Usage model: low-frequency setup/edit flow. Users usually set the project address/location once; saved dashboard views use stored coordinates and should not geocode again.
- Cost controls: browser-restricted public API key, production-domain and localhost restrictions, budget alerts, quota caps, and key rotation notes before enabling outside local development.
- Privacy controls: no project/client/proposal/internal ids in provider URLs; no raw Google response payload stored by default; exact coordinates remain internal unless a later public-share decision says otherwise.
- Fallback: the location panel must keep a text coordinate/address fallback when Google is disabled, missing a key, over quota, blocked by CSP, or unavailable.
- Tests must mock provider calls and must not call live Google Maps/Places services.

Do not use:

- OpenFreeMap/MapLibre as the implementation target for this feature after this addendum.
- Google Places results on a non-Google map.
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
- No new source/database map dependency yet unless deliberately included by a later implementation pass.
- Phase 1 is complete without Phase 2/3 if recent sheets, current published link, identity rail, fallback/loading, accessibility, and beta task acceptance pass.

### Phase 2 - Project Activity Timeline

- Requires Phase 1 acceptance and `10-MIGRATION-RLS-QA-RUNBOOK.md` readiness.
- Add project-scoped activity data path.
- Add/verify indexing and cursor pagination.
- Render compact project activity feed.

Exit:

- Activity feed works with bounded project query and test coverage.

### Phase 3 - Exact Location Pin

- Requires Phase 1 acceptance, owner/product confirmation that Google Maps/Places value justifies the provider/privacy/cost surface, and `09-LOCATION-MAP-CSP-PROVIDER-ADR.md` readiness.
- Add structured location data.
- Remove the old MapLibre/OpenFreeMap map target from code, config, CSP, tests, and docs copy.
- Add lazy Google Maps display island.
- Add Google Places autocomplete for set/edit location flow.
- Add manual coordinate/pin adjustment save flow as the keyboard/non-pointer fallback.

Exit:

- Users can set and reload exact project coordinates.
- Google disabled/missing-key/quota/load-failure states are graceful.

## Validation Gate

Before implementation completion is claimed:

- Run targeted Vitest coverage for project dashboard UI states.
- Run activity data-path tests, including pagination, authorization, and no raw payload exposure.
- Run migration/RPC tests or SQL proof for activity index and location fields if implemented.
- Run `git diff --check`.
- Run browser/visual verification only for the implemented phases:
  - desktop and mobile screenshots for the project dashboard route;
  - route shell continuity checks;
  - Google map branding/attribution and no-overlap checks when the map phase lands.
- Run UltraQA scenarios from `03-VERIFICATION-MATRIX.md`.
- Apply the stop conditions in `11-TEST-FIXTURES-AND-STOP-CONDITIONS.md`.

Cannot claim complete if:

- project activity performs O(number of sheets) reads;
- client DTOs contain `old_snapshot`, `new_snapshot`, `payload`, `metadata`, `raw`, `correlation_id`, or unneeded internal ids;
- coordinates appear in public share, proposal/export, AI/context, analytics, or broad project readers by default;
- map/provider tests call live public map/geocoding services;
- `ProjectChromeAsync` streaming is folded into a monolithic dashboard fetch;
- `loading.tsx` or `ProjectRouteContentFallback` still shows the old white slab;
- location write authz, RLS/grants, generated types, or migration proof is missing for implemented database changes.

## Risks And Mitigations

| Risk | Impact | Mitigation |
|---|---:|---|
| The page becomes card-heavy again | High | Cap the main dashboard to four modules and one project rail |
| Activity feed fans out per estimate | High | Add project-scoped timeline query and index |
| Map dependency slows the route | Medium | Lazy client-only Google map/search island; text fallback |
| Google Maps/Places spend or quota surprise | Medium | Low-frequency setup/edit usage, budget alerts, quota caps, restricted key, stored-coordinate display path |
| Public map/geocoding policy violation | High | Use Google Maps with Google Places, avoid mixed-provider display, no Nominatim autocomplete |
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
- Google Maps/Places choices need explicit provider, privacy, cost, and key-restriction boundaries.
- Header chrome streaming must be preserved while page dashboard data is improved.

Rejected:

- A broad dashboard full of metric cards.
- Separate duplicate page/chrome fetches for the same sheet/publication summaries.
- Direct dependency on private sheet-version-control helper functions.
- Exact coordinates on `projects` without a prior safe-projection audit.
- Production dependence on public OSM tile servers.
- OpenFreeMap/MapLibre as the target project-location provider after this addendum.
- Nominatim-powered autocomplete.
- Google Places results displayed on a non-Google map.
- A map-first page before sheet/share/activity basics are right.

## Staffing Guidance

Use `ultragoal` for durable execution if the implementation spans multiple sessions. Use `ultrawork` or native subagents when splitting into lanes:

- Lane A: UI simplification and responsive/loading states.
- Lane B: recent sheets and publication summary integration.
- Lane C: project activity timeline data path and indexes.
- Lane D: location data model, Google Places autocomplete, Google map display, and OpenFreeMap/MapLibre removal.
- Lane E: QA, accessibility, and visual verification.

Maker/checker split:

- UI implementer should not be the only visual verifier.
- Activity data implementer should not be the only privacy/performance verifier.
