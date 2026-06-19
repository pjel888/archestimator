# Verification Matrix

Date: 2026-06-19
Status: planned QA

## Claims To Prove

1. The project dashboard visually belongs to the workshop shell and does not reintroduce a white route background or header/footer seam.
2. The simplified dashboard contains only the project identity rail and the four useful modules.
3. Recent estimate sheets are project-scoped, recently ordered, and deep-link correctly.
4. Published link state is accurate and does not duplicate the full publication-management modal.
5. Project activity uses one bounded project-scoped read, not per-estimate fan-out.
6. Location pinning stores and reloads exact project coordinates without leaking them to public share surfaces.
7. Map/provider behavior follows tile, geocoding, attribution, and privacy constraints.
8. The layout Suspense fallback and the route loading shell both match the simplified liquid-glass direction.
9. Header chrome remains streamed behind `ProjectChromeAsync` rather than being folded into a slow page-blocking dashboard fetch.

## Static And Unit Tests

| Area | Test focus | Expected proof |
|---|---|---|
| Project dashboard UI | Main modules render, old action tile grid removed, empty states render | Vitest/RTL assertions |
| Route fallback | `ProjectRouteContentFallback` does not render white slab classes after the visual pass | Component/source test |
| Streaming boundary | `ProjectChromeAsync` remains under Suspense and page loader does not await collaboration/header-only data | Source test or route-shell test |
| Recent sheets | Ordering by `updated_at desc`, limit, route construction | Repository and component tests |
| Published link | Published/unpublished/stale/password states | Component tests with summary fixtures |
| Activity timeline | Project authorization, cursor pagination, actor labels, raw payload redaction DTO | Action/repository tests |
| Activity performance | No per-sheet calls, bounded query limit | Source-level or mocked query-count test |
| Activity migration | Backfill, write-path/trigger maintenance, index, RLS/grants, generated types | Migration/SQL proof |
| Location data | Coordinate validation, save/reload, source metadata, one-active-row constraint | Repository/action tests |
| Location RLS | Project/workspace access controls for `project_locations` | RLS tests or SQL proof |
| Public share privacy | Coordinates absent unless explicitly published by a future decision | Route/action tests |
| Broad reader privacy | Project readers do not serialize exact coordinates accidentally | Safe-projection/leak tests |
| Loading shell | Skeleton shape matches simplified layout | Component/source tests |

## Browser And Visual Checks

Run after implementation, not during this docs-only planning pass.

Desktop:

- `/workshop/projects/22222222-2222-4222-8222-222222222222`
- Verify continuous workshop canvas.
- Verify no white route slab.
- Verify no fine header/footer seam.
- Verify four-module workbench and compact rail.

Mobile:

- Narrow viewport around 390px width.
- Verify stacked module order.
- Verify no horizontal overflow.
- Verify buttons/links remain tap-sized.

Map phase:

- Verify map attribution remains visible.
- Verify fallback state when map bundle/WebGL/tile style fails.
- Verify no overlap between map controls and dashboard chrome.

## UltraQA Scenarios

| Scenario | Attack | Expected result |
|---|---|---|
| Empty project | No estimates, no publication, no activity, no location | Page stays useful with compact empty rows |
| Many sheets | 500+ estimate sheets with many events | Recent sheets limit is bounded; activity does not fan out |
| Concurrent events | New events arrive while paginating | Cursor remains stable, no duplicate/infinite loop |
| Restricted sheet | Future sheet-level access restriction | Timeline omits inaccessible sheet events |
| Raw payload exposure | Event has sensitive before/after snapshot | Client receives composed summary only |
| Owner activity raw field | Composer output contains `raw` | Dashboard DTO strips it before client props |
| Deleted/renamed sheet | Activity references old sheet metadata | Timeline still renders historical context safely |
| Revoked share link | Publication exists but not active | Panel does not show invalid open/copy action as live |
| Tile outage | Map style or tiles fail | Saved address/coordinates remain visible |
| Map disabled by config | Map provider disabled or URL missing | Text fallback renders and dashboard stays useful |
| No WebGL | Browser cannot render MapLibre | Location panel falls back without blocking dashboard |
| No coordinates | Address exists but exact pin absent | UI says address-only; no fake pin |
| Bad coordinates | Out-of-range lat/lng | Save rejected and user sees field-level error |
| Public route | Shared link/proposal recipient loads public view | Exact internal coordinates are not exposed by this plan |
| AI/context route | Any project context payload is generated for assistant/export features | Exact coordinates are excluded unless explicitly requested and authorized |
| Attribution hidden | Map is small or responsive | Attribution remains visible/legible |
| Keyboard-only user | Navigate dashboard without pointer | All actions reachable; map has non-pointer text controls |
| Reduced transparency | Browser disables backdrop-filter | Surface remains legible and structured |

## Performance Checks

Before claiming Phase 2 complete:

- Inspect query count for project dashboard load.
- Confirm project activity uses a project-scoped index or equivalent bounded path.
- Confirm event limit is clamped.
- Confirm actor hydration is batched per page.
- Confirm activity DTO strips raw/snapshot/payload fields.
- Confirm migration includes backfill, maintenance path, index, RLS/grant review, generated types, and fix-forward notes if `estimate_sheet_events.project_id` is added.

Before claiming Phase 3 complete:

- Confirm map bundle is client-only and lazy loaded.
- Confirm initial dashboard content can render before map is interactive.
- Confirm tests mock provider calls.
- Confirm map can be disabled or provider URLs swapped by config.
- Confirm `project_locations` has RLS, coordinate range checks, generated types, and one-active-row policy.

## Policy And Privacy Checks

Map/tile:

- Do not point production dashboard at `https://tile.openstreetmap.org`.
- Keep map provider/style URL configurable.
- Keep an implementation-level map kill switch or disabled-map fallback.
- Keep OSM/OpenMap attribution visible.

Geocoding:

- Do not implement public Nominatim autocomplete.
- Do not run bulk/systematic reverse geocoding through public Nominatim.
- Cache and rate-limit any future geocoding.
- Do not send client names, internal project names, proposal details, or confidential addresses to public geocoding services.

Location privacy:

- Exact coordinates are workspace/project data.
- Public share routes should not expose coordinates by default.
- Broad project readers should not expose coordinates by default.
- Analytics should aggregate or round location data.

## Planned Commands

Docs-only planning pass:

```bash
git diff --check -- .ai/03_plans/2026-06-19-Project-Dashboard-Command-Surface
```

Implementation pass, once started:

```bash
bun test tests/vitest/project-dashboard-client.test.tsx
bun test tests/vitest/project-dashboard-core-ui.test.ts
bun test tests/vitest/project-dashboard-route-shell-ui.test.ts
bun test tests/vitest/estimate-sheet-version-control-actions.test.ts
git diff --check
```
