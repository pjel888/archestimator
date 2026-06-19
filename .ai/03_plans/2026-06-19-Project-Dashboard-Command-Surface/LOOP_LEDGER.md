# Loop Ledger

## Goal
Implement and verify the Project Dashboard Command Surface plan for `/workshop/projects/[projectId]`.

## Scope
- Phase 1: dashboard simplification with existing data, recent sheets, current published-link shortcut panel, honest activity/location placeholders, route loading/fallback alignment, focused accessibility/responsive states.
- Phase 2/3: implemented only when migration/RLS/provider/privacy gates are explicitly satisfied.

## Non-goals
- No fake estimate activity.
- No fake map or fake pin.
- No public geocoder/autocomplete dependency.
- No production/provider claims from local-only checks.
- No unrelated cleanup of pre-existing dirty `.ai` files.

## Branch / Status
- Original implementation branch: `main`
- Current provider-addendum branch: `codex/project-dashboard-google-maps-integration`
- Baseline status: `.ai/08_prompts/README.md` and `.ai/10_state/current-state.md` modified; implementation prompt file untracked before this run.
- Context snapshot: `.omx/context/project-dashboard-command-surface-20260619T100305Z.md`

## Source of Truth Read
- `AGENTS.md`
- `.ai/10_state/current-state.md` FAST PATH
- `.ai/08_prompts/IMPLEMENT-2026-06-19-Project-Dashboard-Command-Surface-Loop.md`
- Full plan pack `00-README.md` through `11-TEST-FIXTURES-AND-STOP-CONDITIONS.md`
- `DESIGN.md`, `PRODUCT.md` via Impeccable context, and Impeccable product register
- Current route, dashboard, fallback, chrome, repository, and test files listed in the implementation prompt

## Acceptance Criteria
- Phase 1 requirements from `11-TEST-FIXTURES-AND-STOP-CONDITIONS.md` pass with evidence.
- Phase 2 and Phase 3 rows are passed only if implemented; otherwise explicitly deferred by phase gate.
- `ProjectChromeAsync` streaming remains behind Suspense.
- No monolithic dashboard fetch or per-sheet fan-out.
- `loading.tsx` and `ProjectRouteContentFallback` do not render the old white slab.
- Targeted tests and `git diff --check` pass or failures are documented with next-best proof.

## Validation Plan
- Focused Vitest/source tests for project dashboard UI, route shell, recent sheets helper, and publication shortcut DTO.
- `git diff --check`.
- Browser proof for the Phase 3 map-only claims: attribution visible, controls not overlapping attribution, disabled-provider fallback, no-WebGL fallback, and bounded provider requests.

## Iteration Log

### Iteration 0 - Baseline And Ledger
- Hypothesis: Phase 1 is not implemented; the current dashboard still matches the older card/action-tile shape.
- Action: Loaded prompt, plan pack, design context, current source, current tests, active goal, and worktree state. Spawned read-only parallel agents for repo map, design/a11y, test mapping, and adversarial scope review.
- Files changed:
  - `.omx/context/project-dashboard-command-surface-20260619T100305Z.md` - Ralph/loop context snapshot.
  - `.ai/03_plans/2026-06-19-Project-Dashboard-Command-Surface/LOOP_LEDGER.md` - required loop ledger.
- Evidence:
  - `get_goal` returned active objective for this implementation task.
  - `git status --short --branch` showed unrelated dirty `.ai` prompt/state files before implementation.
  - Source inspection found `ProjectActionTile`, `ProjectMetric`, `Project overview`, and white `ProjectRouteContentFallback` slab.
- Result: Baseline confirms Phase 1 implementation work remains.
- Next decision: Implement Phase 1 data contracts and UI/fallback updates; keep Phase 2/3 deferred unless gates are satisfied.

### Iteration 1 - Phase 1 Command Surface Closeout
- Hypothesis: Phase 1 can be completed without Phase 2 activity migrations or Phase 3 exact-location/provider work by using existing project, estimate, and publication data plus honest placeholders.
- Action: Implemented the compact project command surface in the current source state, hardened the recent sheets query contract, aligned dashboard loading/fallback skeletons with the new surface, and updated focused tests for the Phase 1 stop rows.
- Files changed in the closeout commit:
  - `src/lib/repositories/project-estimate-sheets-repository.ts`
  - `tests/vitest/project-dashboard-client.test.tsx`
  - `tests/vitest/project-dashboard-route-shell-ui.test.ts`
  - `tests/vitest/project-estimate-sheets-repository.test.ts`
  - `tests/vitest/perf/projects-page-render-baseline.test.tsx`
- Evidence:
  - `bunx vitest run tests/vitest/project-dashboard-client.test.tsx tests/vitest/project-dashboard-core-ui.test.ts tests/vitest/project-dashboard-route-shell-ui.test.ts tests/vitest/project-estimate-sheets-repository.test.ts tests/vitest/project-publication-header.test.tsx --maxWorkers=1` passed: 5 files, 88 tests.
  - `bun test tests/vitest/project-estimate-sheets-repository.test.ts` passed: 3 tests.
  - `bun test tests/vitest/project-dashboard-core-ui.test.ts tests/vitest/project-dashboard-route-shell-ui.test.ts` passed: 12 tests.
  - `bun run type-check` passed.
  - `git diff --check` passed.
  - Browser smoke was attempted against the existing dev server on `localhost:3000`; it redirected the protected sample project route to `/login`, and a second dev server could not start because Next reported the existing server lock. No authenticated browser-layout proof is claimed from that attempt.
- Result: Phase 1 is locally proven. The dashboard uses a project identity rail plus Recent sheets, Published link, Estimate activity, and Location modules; publication data is redacted for the dashboard; recent sheets are capped and freshness ordered; loading/fallback no longer use the old white slab shape.
- Deferred:
  - Phase 2 activity remains deferred until estimate-activity migration and RLS proof are complete.
  - Phase 3 exact pin/map/geocoder/provider work remains deferred until location schema, privacy/DSAR, CSP, and provider proof gates are complete.
- Known validation boundary:
  - Direct `bun test` on jsdom component suites such as `project-dashboard-client.test.tsx` is not the repo-configured runner and fails without `window`/`document`; the configured DOM evidence is Vitest via `bunx vitest run`.
  - Authenticated desktop/mobile browser proof remains unclaimed because the already-running dev server was not started with the temporary local dev-auth bypass, and the agent did not kill or replace that process.

### Iteration 2 - Independent Review Fix
- Hypothesis: Sample-project dashboard fallbacks must not autosubmit non-persistent sample ids through live project update actions.
- Action: Split the identity rail into shared fields/frame plus live-only `AutoSubmitForm`; persisted projects still submit with hidden metadata, while sample/null projects render read-only identity fields with no form and no hidden `projectId`.
- Files changed:
  - `src/components/workshop/ProjectDashboardClient.tsx`
  - `tests/vitest/project-dashboard-client.test.tsx`
  - `tests/vitest/project-dashboard-core-ui.test.ts`
- Evidence:
  - Independent `code-reviewer` initially found the sample autosave bug, then re-reviewed the follow-up diff and returned `APPROVE` with no findings.
  - Independent `architect` returned `CLEAR`, with authenticated browser layout proof recorded as a validation gap rather than an implementation blocker.
  - `bunx vitest run tests/vitest/project-dashboard-client.test.tsx tests/vitest/project-dashboard-core-ui.test.ts tests/vitest/project-dashboard-route-shell-ui.test.ts tests/vitest/project-estimate-sheets-repository.test.ts tests/vitest/project-publication-header.test.tsx --maxWorkers=1` passed: 5 files, 88 tests.
  - `bun run type-check` passed.
  - `git diff --check` passed.
- Result: Phase 1 source/test behavior is clean after independent review. Live project identity editing remains intact; sample dashboards are honest read-only fallbacks.

### Iteration 3 - Phase 2 Activity And Phase 3 Manual Location
- Hypothesis: Phase 2 project activity and the non-map/manual subset of Phase 3 location can ship without fake data or provider expansion if project-scoped activity gets a migration/RLS boundary, exact coordinates stay in a private table, and map/geocoder work remains disabled.
- Action: Added a Supabase migration for `estimate_sheet_events.project_id`, project-scoped activity indexing, canonical project/workspace trigger validation, and a tighter event read policy using `can_access_estimate(estimate_id)`. Added `project_locations` with coordinate checks, project/workspace consistency triggers, editor-only reads/writes, and explicit public-share/export/AI privacy comments. Implemented a bounded project activity repository, a private project location repository, server actions for manual pin save/clear, dashboard activity rendering, and a provider-disabled manual location panel. Updated the local Supabase type mirror and focused tests.
- Files changed:
  - `supabase/migrations/20260619105250_project_dashboard_activity_location.sql`
  - `src/app/workshop/projects/[projectId]/page.tsx`
  - `src/components/workshop/ProjectDashboardClient.tsx`
  - `src/lib/repositories/project-activity-repository.ts`
  - `src/lib/repositories/project-location-repository.ts`
  - `src/lib/projects/location-action-state.ts`
  - `src/lib/projects/location-actions.ts`
  - `src/lib/supabase/types.ts`
  - `tests/vitest/project-activity-repository.test.ts`
  - `tests/vitest/project-location-actions.test.ts`
  - `tests/vitest/project-location-schema.test.ts`
  - `tests/vitest/project-location-privacy-source.test.ts`
  - `tests/vitest/project-dashboard-client.test.tsx`
  - `tests/vitest/project-dashboard-core-ui.test.ts`
- Evidence:
  - Independent repo exploration confirmed active event writes are SQL RPC-based and the migration trigger path is the correct compatibility point.
  - Independent test mapping confirmed the needed activity/location/schema/privacy test surfaces and that DB proof scripts would require local Postgres/Docker.
  - Independent map-provider review recommended shipping the manual editor with provider disabled and no map dependencies.
  - `supabase migration new project_dashboard_activity_location` succeeded; `supabase status` failed because the Docker daemon is unavailable in this environment.
  - `supabase migration list --linked` succeeded and confirmed the new local migration `20260619105250` is not applied remotely; `supabase db push --linked --dry-run` failed before planning because the linked remote has migration-history entries not present locally: `20260616163259`, `20260616170256`, and `20260616171158`.
  - `bun run prove:project-dashboard-activity-location` passed against native temp Postgres (`psql 16.14`): migration applies; `estimate_sheet_events.project_id` backfills and is not nullable; event scope trigger fills project/workspace ids; mismatched event scope is rejected; project activity cursor index exists; invalid coordinates are rejected; editors can insert/read exact locations; viewers, outsiders, and anon cannot read exact locations; location actor columns are populated.
  - `bunx vitest run tests/vitest/project-activity-repository.test.ts tests/vitest/project-location-actions.test.ts tests/vitest/project-location-schema.test.ts tests/vitest/project-location-privacy-source.test.ts tests/vitest/project-dashboard-client.test.tsx tests/vitest/project-dashboard-core-ui.test.ts --maxWorkers=1` passed after the editor-only coordinate fix: 6 files, 20 tests.
  - `bun run type-check` passed.
  - `bunx vitest run tests/vitest/project-activity-repository.test.ts tests/vitest/project-location-actions.test.ts tests/vitest/project-location-schema.test.ts tests/vitest/project-location-privacy-source.test.ts tests/vitest/project-dashboard-client.test.tsx tests/vitest/project-dashboard-core-ui.test.ts tests/vitest/project-estimate-sheets-repository.test.ts tests/vitest/estimate-sheet-version-control-actions.test.ts tests/vitest/estimate-sheet-activity-history-ui.test.tsx tests/vitest/activity-composer.test.ts tests/vitest/activity-view-model.test.ts tests/vitest/activity-security.test.ts tests/vitest/activity-copy-regression.test.ts tests/vitest/project-publication-snapshot.test.ts tests/vitest/proposal-export-route.test.ts tests/vitest/ai-ask-read-context.test.ts tests/vitest/ai-package-builder-read-tools.test.ts tests/vitest/next-config-workshop-headers.test.ts --maxWorkers=1` passed: 18 files, 237 tests.
  - Independent code review returned APPROVE with one low status-message issue; the issue was fixed by rendering save and clear action statuses independently.
  - Independent data-integrity review found and blocked on viewer-readable exact coordinates; fixed by changing `project_locations` select RLS to `can_edit_project(project_id)`, preflighting `can_edit_project` before `getProjectLocation`, and defensively hiding `projectLocation` unless `canEditProject` is true.
  - Independent data-integrity re-review returned APPROVE after the native temp-Postgres proof passed.
- Result: Phase 2 dashboard activity is implemented as a bounded, redacted, project-scoped read model. The manual/private portion of Phase 3 location is implemented. Interactive map, geocoder, provider networking, provider CSP, and browser map proof remain intentionally deferred.
- Known validation boundary:
  - Supabase Docker local services are unavailable, but native temp-Postgres migration/RLS proof passed.
  - Linked remote dry-run proof was blocked by migration-history drift; no remote apply or repair was performed.
  - `src/lib/supabase/types.ts` was manually mirrored instead of regenerated from a live schema because the migration was not applied to a database in this session.
  - A broader stale source-contract test, `tests/vitest/workspace-repository-project-list.test.ts`, failed on pre-existing workspace-repository text expectations unrelated to this dashboard work and was not used as completion evidence.

### Iteration 4 - Phase 3 Interactive Map Provider Slice
- Hypothesis: The remaining Phase 3 map surface can ship without weakening privacy if the map SDK is lazy/client-only, exact coordinates remain editor-only, OpenFreeMap is bounded by config/CSP, public geocoding is excluded, and browser proof covers browser-only rendering/fallback claims.
- Action: Added `maplibre-gl@5.24.0`, a project location map config/kill switch (`NEXT_PUBLIC_PROJECT_LOCATION_MAP_ENABLED`, `NEXT_PUBLIC_PROJECT_LOCATION_MAP_STYLE_URL`), a lazy `ProjectLocationMap` island, MapLibre CSS, and a workshop-only Report-Only CSP that allows `https://tiles.openfreemap.org`, `worker-src 'self' blob:`, and `child-src 'self' blob:` without widening `/share` enforced CSP. The dashboard now renders the map only for saved editor-visible exact pins when the provider is enabled; disabled/no-pin/no-WebGL/provider-error states keep text coordinates available. Map click and marker drag update the manual coordinate form draft. No public Nominatim/geocoder/autocomplete dependency was added.
- Files changed:
  - `package.json`
  - `bun.lock`
  - `next.config.ts`
  - `src/app/layout.tsx`
  - `src/components/workshop/ProjectDashboardClient.tsx`
  - `src/components/workshop/ProjectLocationMap.tsx`
  - `src/lib/projects/location-map-config.ts`
  - `scripts/prove-project-location-map-browser.mjs`
  - `tests/vitest/project-location-map-source.test.ts`
  - `tests/vitest/project-location-map-provider.test.tsx`
  - `tests/vitest/project-location-map-csp.test.ts`
  - Updated existing dashboard/location/privacy/header tests.
- Evidence:
  - Official docs checked before implementation: local Next 16 lazy-loading and headers docs; MapLibre GL JS docs for npm/CSS/CSP and controls; OpenFreeMap docs/style JSON for current host/attribution/no-key posture; OSMF Nominatim/tile policies to exclude autocomplete/public geocoding and avoid OSM raster tiles.
  - Independent researcher confirmed `maplibre-gl@5.24.0`, MapLibre CSS/CSP requirements, OpenFreeMap `tiles.openfreemap.org` host, attribution requirements, and Nominatim/tile policy constraints.
  - `bun run type-check` passed after the SDK typing fixes.
  - `bunx vitest run tests/vitest/project-dashboard-client.test.tsx tests/vitest/project-location-schema.test.ts tests/vitest/project-location-privacy-source.test.ts tests/vitest/project-location-map-source.test.ts tests/vitest/project-location-map-provider.test.tsx tests/vitest/project-location-map-csp.test.ts tests/vitest/next-config-workshop-headers.test.ts tests/vitest/project-dashboard-core-ui.test.ts tests/vitest/project-location-actions.test.ts tests/vitest/project-location-privacy-source.test.ts --maxWorkers=1` passed: 9 files, 30 tests.
  - `bun run prove:project-dashboard-activity-location` passed against native temp Postgres again after the map slice.
  - `bun run prove:project-location-map-browser` passed and wrote `.ai/03_plans/2026-06-19-Project-Dashboard-Command-Surface/evidence/project-location-map-browser-2026-06-19T112956Z/project-location-map-browser-proof.json` plus screenshots. Browser proof showed: enabled map size `412x176`, visible MapLibre attribution, visible navigation control, 6 OpenFreeMap requests, no forbidden Nominatim/OSM-tile/Mapbox requests, disabled fallback with 0 provider requests, no-WebGL fallback with 0 provider requests, no console/page errors, and controls not overlapping attribution.
- Result: Interactive map/provider/CSP work is implemented behind an off-by-default provider switch and browser-proven in an isolated local component fixture. Exact coordinates remain editor-only and public geocoding remains excluded.
- Known validation boundary:
  - The browser proof mounts the real `ProjectLocationMap` component in a temporary local Vite page because the protected dashboard route depends on a linked DB migration that is not applied remotely; it proves component/provider behavior, not authenticated route data loading.
  - The provider is off by default until `NEXT_PUBLIC_PROJECT_LOCATION_MAP_ENABLED=1` is set.

### Iteration 5 - Schema Drift Runtime Guard And Proof Hardening
- Hypothesis: The reported runtime `42703` is caused by the linked Supabase schema missing local migration `20260619105250_project_dashboard_activity_location`, not by Next.js/Turbopack. The protected dashboard should degrade for that exact missing-schema state while still surfacing unrelated database errors.
- Action: Narrowed the project activity/location compatibility guards to exact missing-migration signatures, added server-visible warnings that name migration `20260619105250`, added regression coverage for unrelated `42703`/schema errors, and strengthened the local SQL proof with a restricted-estimate RLS assertion. Recorded exact-location account export/DSAR/delete/retention handling in the runbook and locked it with a source test.
- Files changed:
  - `src/lib/repositories/project-activity-repository.ts`
  - `src/lib/repositories/project-location-repository.ts`
  - `tests/vitest/project-activity-repository.test.ts`
  - `tests/vitest/project-location-repository.test.ts`
  - `tests/vitest/project-location-schema.test.ts`
  - `scripts/prove-project-dashboard-activity-location-postgres.mjs`
  - `.ai/03_plans/2026-06-19-Project-Dashboard-Command-Surface/10-MIGRATION-RLS-QA-RUNBOOK.md`
- Evidence:
  - Live linked migration inspection still shows `20260619105250` as local-only. `supabase migration list --linked` also shows older local-only rows before the remote `20260616163259`/`20260616170256`/`20260616171158` rows, so a normal remote push is not a single safe dashboard-only apply.
  - `supabase migration fetch --linked` recovered the three remote-only migration files locally: `20260616163259_allow_project_deletion_with_active_publications.sql`, `20260616170256_fix_preview_bulk_delete_projects_cte_scope.sql`, and `20260616171158_project_groups.sql`. Command-generated rewrites to already tracked historical migration files were reverted; the recovered remote files were kept.
  - `bunx vitest run tests/vitest/project-activity-repository.test.ts tests/vitest/project-location-repository.test.ts --maxWorkers=1` passed: 2 files, 9 tests.
  - `bun run prove:project-dashboard-activity-location` passed against native temp Postgres (`psql 16.14`), now including `restricted estimate events omitted by RLS`.
  - `bunx vitest run tests/vitest/project-location-schema.test.ts tests/vitest/project-location-privacy-source.test.ts tests/vitest/project-activity-repository.test.ts tests/vitest/project-location-repository.test.ts --maxWorkers=1` passed: 4 files, 15 tests.
- Result: The local app path is guarded against the known linked-schema drift instead of crashing the route. The guard is deliberately temporary and does not replace applying the migration to the linked project.
- Known validation boundary:
  - Remote migration application remains unclaimed. The linked project needs a deliberate migration-history reconciliation/apply sequence before `20260619105250` can be pushed and types regenerated from the live schema.

### Iteration 6 - Protected Route Browser Proof And Remote Auth Blocker
- Hypothesis: After the exact schema-drift guards, the protected project dashboard route should render without the reported `42703` runtime crash even while the linked project is missing migration `20260619105250`. The remaining route-proof risk is browser-only shell/layout/accessibility behavior, not the database root cause.
- Action: Added and ran a protected-route Playwright proof script with the local dev-auth bypass, restarted the stale local dev server so the proof owned its Next process, and fixed the shared workshop chrome targets that were below the 32px focus/tap proof threshold. Rechecked the linked Supabase apply path and stopped remote attempts after the CLI reported DB auth failures.
- Files changed:
  - `scripts/prove-project-dashboard-route-browser.mjs`
  - `src/components/workshop/WorkshopBreadcrumbs.tsx`
  - `src/components/workshop/WorkshopTitleHeader.tsx`
  - `src/components/workshop/WorkshopFeedbackModal.tsx`
  - `src/components/workshop/ProjectMiniSidebar.tsx`
- Evidence:
  - `PROJECT_DASHBOARD_PROOF_PROJECT_ID=san-juan-townhouse node scripts/prove-project-dashboard-route-browser.mjs` passed and wrote `.ai/03_plans/2026-06-19-Project-Dashboard-Command-Surface/evidence/project-dashboard-route-browser-2026-06-19T130249Z/project-dashboard-route-browser-proof.json` plus desktop/mobile screenshots. It proved the protected route resolves to `/workshop/projects/san-juan-townhouse` instead of login/terms redirect, command modules render, desktop/mobile avoid horizontal overflow, visible interactive controls meet the 32px threshold, and there were no page or console errors.
  - `node --check scripts/prove-project-dashboard-route-browser.mjs` passed.
  - `bunx vitest run tests/vitest/project-component-projection.test.ts tests/vitest/project-dashboard-route-shell-ui.test.ts tests/vitest/project-dashboard-core-ui.test.ts tests/vitest/project-dashboard-client.test.tsx tests/vitest/project-activity-repository.test.ts tests/vitest/project-location-repository.test.ts --maxWorkers=1` passed: 6 files, 27 tests.
  - `bun run type-check` passed.
  - `git diff --check` passed.
  - Supabase CLI version `2.105.0` is available, but linked commands for migration list/dry-run failed with `password authentication failed for user "cli_login_postgres"` and then `ECIRCUITBREAKER`; local env inspection found no `SUPABASE_DB_PASSWORD`. Remote apply, `migration repair`, and live type regeneration were therefore not attempted further.
- Result: The reported `42703` cause is isolated to linked-schema drift, and the local protected dashboard route now browser-proves through the temporary compatibility guard without crashing. The full remote rollout is still blocked on valid linked DB credentials plus the already-identified migration-history reconciliation.
- Known validation boundary:
  - The route proof demonstrates the guarded application behavior, not that `20260619105250` exists remotely. Remote SQL apply/repair/type regeneration remain unclaimed until `SUPABASE_DB_PASSWORD` or equivalent linked DB credentials are available.

### Iteration 7 - Docs-Only Google Maps/Places Provider Addendum
- Hypothesis: The location UX should move to a single trusted provider because the product only needs low-frequency project location setup/display, and Google Places results should be displayed on Google Maps rather than mixed with OpenFreeMap/MapLibre.
- Action: Created branch `codex/project-dashboard-google-maps-integration` and updated the plan pack only. The addendum supersedes the prior OpenFreeMap/MapLibre direction with Google Maps JavaScript API for map display and Google Places Autocomplete for set/edit search. It records that normal dashboard views should render stored coordinates without repeated geocoding, and that the later implementation pass should remove `maplibre-gl`, OpenFreeMap env/config/CSP allowances, and provider-specific proof/tests.
- Files changed:
  - `.ai/03_plans/2026-06-19-Project-Dashboard-Command-Surface/00-README.md`
  - `.ai/03_plans/2026-06-19-Project-Dashboard-Command-Surface/01-PLAN.md`
  - `.ai/03_plans/2026-06-19-Project-Dashboard-Command-Surface/02-RESEARCH-NOTES.md`
  - `.ai/03_plans/2026-06-19-Project-Dashboard-Command-Surface/03-VERIFICATION-MATRIX.md`
  - `.ai/03_plans/2026-06-19-Project-Dashboard-Command-Surface/04-RALPLAN-REVIEW.md`
  - `.ai/03_plans/2026-06-19-Project-Dashboard-Command-Surface/05-READINESS-SCORECARD.md`
  - `.ai/03_plans/2026-06-19-Project-Dashboard-Command-Surface/07-UX-STATE-MATRIX.md`
  - `.ai/03_plans/2026-06-19-Project-Dashboard-Command-Surface/09-LOCATION-MAP-CSP-PROVIDER-ADR.md`
  - `.ai/03_plans/2026-06-19-Project-Dashboard-Command-Surface/10-MIGRATION-RLS-QA-RUNBOOK.md`
  - `.ai/03_plans/2026-06-19-Project-Dashboard-Command-Surface/11-TEST-FIXTURES-AND-STOP-CONDITIONS.md`
  - `.ai/03_plans/2026-06-19-Project-Dashboard-Command-Surface/HANDOFF.md`
  - `.ai/03_plans/2026-06-19-Project-Dashboard-Command-Surface/LOOP_LEDGER.md`
- Evidence:
  - Official Google sources checked during planning: Maps JavaScript API loading, Places Autocomplete, autocomplete session pricing, Google Places policies, and Google Maps Platform pricing.
  - Existing migration shape checked: Google selections should map to `source='geocoded'`, `geocoder_name='google'`, and `provider_place_id` rather than a new source enum.
  - No source implementation files were edited in this addendum.
- Result: Docs now point implementation toward full Google Maps/Places and explicitly mark the OpenFreeMap/MapLibre path as superseded.
- Known validation boundary:
  - This is a docs-only update. Source removal, dependency cleanup, CSP changes, Google env setup, provider mocks, browser proof, and budget/quota/key-restriction evidence remain implementation work.

## Stop Condition
Stop only when Phase 1, Phase 2 activity, and Phase 3 private location/map-provider work are proven with targeted evidence; the current provider target is Google Maps/Places only; public non-Google geocoder work remains explicitly excluded; or when a real blocker repeats and cannot be worked around.

## Proof Boundary
Current proof boundary: local source, Vitest, typecheck, native temp-Postgres migration/RLS proof, isolated browser proof for the real map component, and authenticated protected-route browser proof through the local dev-auth bypass. Linked remote apply proof remains unclaimed because the Supabase CLI currently lacks valid DB credentials.

## Remaining Risks
- Existing broad validation reds on `main` are known unrelated; targeted tests must distinguish new failures.
- Browser-only visual/layout claims may need a dev-server proof pass.

## Follow-up Bugs / Plans
- Resolve linked Supabase migration-history drift before any remote migration dry-run/push.
- Set valid linked DB credentials (`SUPABASE_DB_PASSWORD` or equivalent), then run the scoped apply/repair/type-regeneration sequence for `20260619105250`.
- Regenerate Supabase types from the applied schema after the migration is applied.
- Decide when to enable `NEXT_PUBLIC_PROJECT_LOCATION_MAP_ENABLED=1` for beta environments.
- Replace the superseded OpenFreeMap/MapLibre implementation with the Google Maps/Places plan before enabling map/search in beta environments.
- Public non-Google geocoder/autocomplete remains excluded; Google Places autocomplete is allowed only for set/edit flows once the key, budget, quota, CSP, and privacy gates are satisfied.
