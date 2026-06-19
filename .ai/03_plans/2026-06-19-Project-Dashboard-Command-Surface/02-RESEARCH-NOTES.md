# Research Notes

Date: 2026-06-19
Status: planning evidence

## Local Codebase Anchors

Current project route:

- `src/app/workshop/projects/[projectId]/page.tsx`
- `src/app/workshop/projects/[projectId]/layout.tsx`
- `src/app/workshop/projects/[projectId]/loading.tsx`
- `src/components/workshop/ProjectDashboardClient.tsx`
- `src/components/workshop/ProjectChromeAsync.tsx`
- `src/components/workshop/ProjectMiniSidebar.tsx`

Workshop dashboard references:

- `src/app/workshop/page.tsx`
- `src/components/workshop/WorkshopHomebaseClient.tsx`
- `src/components/workshop/dashboard/WorkshopDashboard.tsx`
- `src/components/workshop/dashboard/RecentSheetsList.tsx`
- `src/components/workshop/dashboard/RecentProjectsList.tsx`
- `src/components/workshop/dashboard/DashboardGlassPanel.tsx`
- `src/components/workshop/dashboard/lib.ts`

Publication references:

- `src/components/workshop/ProjectPublicationHeader.tsx`
- `src/components/share/SharedLinkActivityFeed.tsx`
- `src/lib/publication/types.ts`
- `src/lib/publication/actions.ts`
- `src/lib/repositories/workspace-repository.ts`
- possible new `src/lib/repositories/project-publication-repository.ts` only if implementation deliberately extracts publication ownership; no such file exists at planning closeout

Activity references:

- `src/lib/estimates/actions.ts`
- `src/lib/activity/activity-composer.ts`
- `src/lib/activity/types.ts`
- `src/components/workshop/estimate-sheet/activity-history.tsx`
- `tests/vitest/estimate-sheet-version-control-actions.test.ts`

Relevant style/design references:

- `DESIGN.md`
- `src/app/globals.css`
- `src/components/workshop/dashboard/DashboardGlassPanel.tsx`

## Current Implementation Findings

- The project dashboard currently centers on a left editable rail plus project overview, activity/working-surface, metrics, and action tiles.
- The current page has too many high-level cards for a page that should mostly orient users and expose active project workflows.
- `ProjectRouteContentFallback` still uses `bg-canvas` and white inner panels, and the project layout uses that component as the route Suspense fallback. This fallback must be re-themed with the dashboard, not treated as a separate loading-only concern.
- The workshop dashboard already has the desired visual vocabulary:
  - canvas wash;
  - glass chrome;
  - dense recent rows;
  - published link summary;
  - restrained shadows and blur.
- `RecentSheetsList` intentionally keeps dense ledger content legible and can guide the project-specific recent sheets module.
- `ProjectPublicationHeader` already owns the full publication management modal; the project dashboard should show a compact status/shortcut, not duplicate the modal.
- `ProjectChromeAsync` already fetches publication and sheet summaries, so page content and chrome need shared request-cached data ownership to avoid duplicate reads and drift.
- `getCurrentWorkspaceProject` currently uses a broad `select("*")` project read, which makes exact coordinate columns on `projects` a privacy risk unless all project projections are narrowed.
- The publication picker/list helper for estimate sheets is not the recent-sheets helper the dashboard needs: project dashboard recency requires `updated_at desc` and deep-link fields such as `firstNodeId`.
- Current `estimate_sheet_events` has estimate/workspace indexes but no `project_id`; current select RLS is workspace-member scoped. Project activity must add its own sheet-access-aware authorization boundary.
- Current project route tests include source-governance assertions around the existing dashboard shape; implementation should update or invert those tests intentionally rather than treat them as unrelated failures.

## Delegated Design Findings

Designer lane summary:

- Treat the page as a project desk, not a card dashboard.
- Keep one quiet editable rail and one main workbench.
- Recommended four modules: recent sheets, published link, activity, location.
- Remove the extra hero/overview, working-surface card, metric boxes, and action tiles.
- Keep glass as the framing material, with dense rows and thin dividers inside.
- Distinguish exact pin, address-only, and no-location states.
- Responsive order should prioritize recent sheets and published link before activity and map.

## Delegated Performance Findings

Performance lane summary:

- Do not call `fetchEstimateSheetVersionControl` per estimate sheet.
- Build one project-scoped activity read over `estimate_sheet_events`.
- Reuse existing event normalization, actor hydration, filters, and activity composition helpers.
- Use keyset pagination on `(created_at, id)`.
- Add `project_id` to `estimate_sheet_events` or create an equivalent indexed project lookup path.
- Recommended index: `(project_id, created_at desc, id desc)`.
- Do not send raw snapshots/payloads to the client.

## Delegated Map Findings

Map/dependency lane summary:

- Superseding decision after owner discussion: use Google Maps Platform as the single provider for project-location search and display.
- Google Places Autocomplete should run only during set/edit location flows. Once a place is selected, store formatted address, place id, latitude, and longitude; normal dashboard views should render stored coordinates rather than geocoding again.
- Google Maps JavaScript API should render the map so Places results are shown on a Google map and the app avoids a mixed-provider policy surface.
- Manual coordinate/pin adjustment remains required as the keyboard/non-pointer fallback and as a recovery path when Google is disabled or unavailable.
- The previous MapLibre/OpenFreeMap target should be removed in the implementation follow-up rather than carried as an active alternate provider.
- Do not use public OSM raster tiles as production infrastructure.
- Do not use public Nominatim for autocomplete, systematic reverse geocoding, scheduled enrichment, or bulk lookups.
- Do not send confidential project details, client names, internal ids, proposal details, or raw Google response payloads to provider URLs/storage.
- Keep a non-map text fallback and a kill switch. Missing key, disabled provider, quota exhaustion, or CSP/load failure must not break location read/edit.

## Official Map And Policy Sources

Revalidated on 2026-06-19.

Google Maps JavaScript API:

- https://developers.google.com/maps/documentation/javascript/load-maps-js-api
- Requires a Google Maps Platform API key. The map can be loaded client-side and should be lazy-loaded so first dashboard paint does not depend on it.

Google Places Autocomplete:

- https://developers.google.com/maps/documentation/javascript/place-autocomplete-new
- Provides the type-ahead place/address search UI. Use it in set/edit flows, then fetch only the needed location fields for the selected place.

Google Autocomplete session pricing:

- https://developers.google.com/maps/documentation/javascript/session-pricing
- Autocomplete is session-priced around a user typing/selecting a place. This fits Archestimator's low-frequency use because a project location is usually set once and not continuously changed.

Google Places policy:

- https://developers.google.com/maps/documentation/places/web-service/policies
- Places API results displayed on a map should be displayed on a Google Map with required attribution/branding. This is the main reason the plan should not combine Google Places autocomplete with OpenFreeMap/MapLibre rendering.

Google Maps Platform pricing:

- https://mapsplatform.google.com/pricing/
- Use budget alerts, quota caps, and restricted keys before enabling outside local development.

OSM tile policy:

- https://operations.osmfoundation.org/policies/tiles/
- OSM data is free, but OSMF tile servers have limited capacity and are not a production SLA-backed tile provider.
- Policy requires visible attribution, a valid browser referer/user agent posture, cache honoring, and no bulk/preseed/offline scraping.
- Policy warns access can be blocked or changed without notice.

Nominatim policy:

- https://operations.osmfoundation.org/policies/nominatim/
- Public Nominatim is limited, bans autocomplete/systematic use, and should not receive confidential material.
- Public Nominatim has an absolute maximum of 1 request per second, requires identifying referer/user-agent, requires caching, and disallows autocomplete, systematic queries, scraping details, and geocoding-reseller use.

OSM attribution:

- https://osmfoundation.org/wiki/Licence/Attribution_Guidelines
- OSM attribution must be visible, legible, and close to maps or map-like use.

## Package/Dependency Notes

- Current source now has a MapLibre/OpenFreeMap path from the prior Phase 3 implementation. The Google addendum supersedes it.
- Implementation follow-up should remove `maplibre-gl`, OpenFreeMap style/env config, OpenFreeMap CSP allowances, and provider-specific tests/proof scripts that only exist for the old provider path.
- Add no non-Google geocoding provider. Do not preserve a provider abstraction unless it directly removes complexity inside the existing codebase.
- Keep tests mocked; do not let local/CI tests call live Google Maps/Places or public tile/geocoding services.

## Open Questions For Implementation

1. Should structured project coordinates live as nullable columns on `projects`, or in a `project_locations` table with history?
   - MVP recommendation: `project_locations` table. This avoids leaking exact coordinates through existing broad project row readers and leaves room for history later.
2. Should a location pin be included in future public proposals?
   - MVP recommendation: no, internal-only until explicitly designed.
3. Should activity timeline include share-link activity as well as estimate-sheet events?
   - MVP recommendation: keep project dashboard activity focused on estimate/project work first; published link panel can show share-link opens separately.
4. Should project recent sheets use favorites?
   - MVP recommendation: not initially; this panel is recency-led.
5. Should the page and project chrome share dashboard data?
   - MVP recommendation: yes, but through request-cached leaf helpers. Do not replace `ProjectChromeAsync` streaming with a monolithic page-blocking fetch.
6. Should the project activity panel receive the same owner activity view model as the sheet modal?
   - MVP recommendation: no. Return a redacted dashboard DTO that strips raw snapshots/payloads and only includes render/navigation fields.

## Resolved Planning Decisions At Closeout

- Current published-link module is singular: one current publication status/shortcut surface, not a historical multi-link list.
- Phase 1 can ship without activity data or map dependency if placeholders are honest and useful.
- Phase 2 activity must be estimate-activity scoped unless a separate IA plan adds share/collaboration activity.
- Phase 3 interactive map/search is Google-only once implemented. Structured location can still ship first if Google key/CSP/quota/privacy proof is not ready.
- `project_locations` is the default coordinate storage boundary; coordinates on `projects` remain rejected while broad project readers exist.
