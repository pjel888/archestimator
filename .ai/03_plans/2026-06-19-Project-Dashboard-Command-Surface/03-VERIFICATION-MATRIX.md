# Verification Matrix

Date: 2026-06-19
Status: planned QA, phase-scoped gates

## Known Validation Context

The current repo has known unrelated broad-validation reds and a hanging full DOM phase recorded in `.ai/10_state/current-state.md`. This plan uses targeted phase gates:

- touched-file/component/repository tests for implemented behavior;
- SQL/migration/RLS proof for database phases;
- `git diff --check`;
- browser proof only for browser-only claims in implemented phases.

Broad `bun run validate` may be useful before release, but it is not the specific completion gate for this plan while unrelated known reds remain.

## Claims To Prove

1. The project dashboard visually belongs to the workshop shell and does not reintroduce a white route background or header/footer seam.
2. The simplified dashboard contains only the project identity rail and the four useful modules.
3. Recent estimate sheets are project-scoped, recently ordered, and deep-link correctly.
4. Published link state is accurate and does not duplicate the full publication-management modal.
5. Project activity uses one bounded project-scoped read, not per-estimate fan-out.
6. Location pinning stores and reloads exact project coordinates without leaking them to public share surfaces.
7. Google Maps/Places behavior follows autocomplete, map display, attribution/branding, quota, key restriction, CSP, and privacy constraints.
8. The layout Suspense fallback and the route loading shell both match the simplified liquid-glass direction.
9. Header chrome remains streamed behind `ProjectChromeAsync` rather than being folded into a slow page-blocking dashboard fetch.

## Phase-Scoped Blocking Matrix

| Phase | Blocking claim | Primary proof | Artifact |
|---|---|---|---|
| 1 | No route-local white slab in dashboard, `loading.tsx`, or layout fallback | Component/source tests plus browser desktop/mobile screenshots | `.omx/artifacts/project-dashboard-command-surface/phase-1/` |
| 1 | Identity rail editing behavior is preserved or deliberately replaced with tests | RTL/action tests for name, client, address, hidden metadata, and save feedback | Test output |
| 1 | Recent sheets use the dedicated recent-ledger contract | Repository/component tests from `06-DATA-OWNERSHIP-CONTRACT.md` and `11-TEST-FIXTURES-AND-STOP-CONDITIONS.md` | Test output |
| 1 | Current published-link panel stays shortcut-only and does not remove header chrome | Component/source tests for `ProjectPublicationHeader`, `ProjectTeamspaceHeader`, and dashboard DTO minimization | Test output |
| 2 | Project activity is one bounded authorized read, not per-sheet fan-out | Repository/action tests, query-count/source proof, SQL/index proof | `.ai/99_scratch/` or provider/local proof |
| 2 | Activity DTO redacts forbidden fields | Fixture test with snapshots/payloads/raw/correlation fields | Test output |
| 2 | Activity migration keeps all event writers populating `project_id` | `10-MIGRATION-RLS-QA-RUNBOOK.md` proof | Migration proof artifact |
| 3 | `project_locations` RLS/grants/types/leak tests pass | SQL/RLS proof plus privacy leak tests | Migration proof artifact |
| 3 | Google Maps/Places can be disabled, mocked, and lazy-loaded | Source tests and mocked component tests, no live provider calls | Test output |
| 3 | Browser map/search claims hold | Google branding/attribution, no-overlap, missing-key/disabled/quota/load-failure screenshots or mocked browser proof | `.omx/artifacts/project-dashboard-command-surface/phase-3/` |

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
| Data ownership | Chrome/page helper boundaries, no monolithic dashboard fetch | Source contract tests |
| Identity rail | Edit fields, preserve hidden image/currency/project code, save feedback | RTL/action tests |
| CSP/provider config | Google env keys, fail-closed disabled/missing-key mode, intentional CSP edits, old OpenFreeMap/MapLibre config removed | Source tests |
| DSAR/export/delete | `project_locations` included or explicitly excluded with privacy/legal signoff | SQL/source/runbook proof |

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

Google map/search phase:

- Verify Google branding/attribution remains visible and unobstructed.
- Verify fallback state when Google key is missing, provider disabled, quota is mocked as exhausted, or loader/API calls fail.
- Verify no overlap between map controls and dashboard chrome.
- Verify autocomplete runs only in set/edit mode and saved dashboard display uses stored coordinates.

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
| Google loader failure | Maps JavaScript loader or import library fails | Saved address/coordinates remain visible |
| Map disabled by config | Google provider disabled or API key missing | Text fallback renders and dashboard stays useful |
| Google quota/error | Places or Maps returns quota/authorization/load error | User can still see/edit text coordinates and save manually |
| No coordinates | Address exists but exact pin absent | UI says address-only; no fake pin |
| Bad coordinates | Out-of-range lat/lng | Save rejected and user sees field-level error |
| Public route | Shared link/proposal recipient loads public view | Exact internal coordinates are not exposed by this plan |
| AI/context route | Any project context payload is generated for assistant/export features | Exact coordinates are excluded unless explicitly requested and authorized |
| Google branding hidden | Map is small or responsive | Google branding/attribution remains visible/legible |
| Keyboard-only user | Navigate dashboard without pointer | All actions reachable; map has non-pointer text controls |
| Reduced transparency | Browser disables backdrop-filter | Surface remains legible and structured |
| Coordinate save spam | Authorized user repeatedly drags/saves invalid pins | Saves are debounced/rate-limited or conflict-safe; invalid saves do not churn data |
| Restricted sheet activity | Project feed includes events from sheets the actor cannot access | Restricted events are omitted |
| Monolithic fetch regression | Implementation folds chrome summaries into page dashboard fetch | Source/route-shell test fails |
| Live provider call in tests | Test accidentally hits Google Maps/Places or public geocoder network | Test fails or mocks block call |

## Performance Checks

Before claiming Phase 2 complete:

- Inspect query count for project dashboard load.
- Confirm project activity uses a project-scoped index or equivalent bounded path.
- Confirm event limit is clamped.
- Confirm actor hydration is batched per page.
- Confirm activity DTO strips raw/snapshot/payload fields.
- Confirm migration includes backfill, maintenance path, index, RLS/grant review, generated types, and fix-forward notes if `estimate_sheet_events.project_id` is added.
- Confirm no direct dashboard query relies on workspace-member `estimate_sheet_events` RLS as the sole authorization boundary.
- Confirm activity page size defaults to 20 and is hard-clamped to 50.

Before claiming Phase 3 complete:

- Confirm Google map/search bundle is client-only and lazy loaded.
- Confirm initial dashboard content can render before map is interactive.
- Confirm tests mock provider calls.
- Confirm map/search can be disabled by config and fails closed when API key is absent.
- Confirm old OpenFreeMap/MapLibre env/config/CSP/dependency path is removed or explicitly obsolete.
- Confirm `project_locations` has RLS, coordinate range checks, generated types, and one-active-row policy.
- Confirm no exact coordinate payload reaches public share, proposal/export, AI/context, analytics, or broad project readers by default.
- Confirm location data lifecycle, DSAR/export/delete, and privacy copy decisions are recorded.
- Confirm Google Cloud key restrictions, budget alerts, and quota caps are recorded before enabling in beta environments.

## Policy And Privacy Checks

Map/search provider:

- Use Google Maps Platform as the single active provider for project-location autocomplete and map display.
- Do not display Google Places results on a non-Google map.
- Do not point production dashboard at `https://tile.openstreetmap.org`.
- Keep an implementation-level map kill switch or disabled-map fallback.
- Keep Google branding/attribution visible.
- Keep provider spend bounded with alerts/quotas and restricted keys.

Geocoding:

- Do not implement public Nominatim autocomplete.
- Do not run bulk/systematic reverse geocoding through public Nominatim.
- Do not add a non-Google geocoding provider in this pass.
- Use Places autocomplete only during set/edit; saved dashboard views use stored coordinates.
- Do not send client names, internal project names, proposal details, internal ids, or raw Google response payloads to provider URLs/storage.

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
bun test tests/vitest/project-publication-header.test.tsx
bun test tests/vitest/estimate-sheet-version-control-actions.test.ts
git diff --check
```

Additional implementation-owned tests must be added with the files in `11-TEST-FIXTURES-AND-STOP-CONDITIONS.md`; command names may change when those files are created.

## Browser Proof Boundaries

Browser proof is required only for browser-only claims:

- Phase 1: desktop/mobile route shell continuity, no white slab, no horizontal overflow, and visible focus/tap sizing.
- Phase 3: Google branding/attribution, map-control overlap, disabled/missing-key/quota/load-failure fallback, autocomplete set/edit behavior, and text coordinate fallback.

Browser proof does not prove provider uptime, production Vercel state, Supabase RLS, or public tile SLA.
