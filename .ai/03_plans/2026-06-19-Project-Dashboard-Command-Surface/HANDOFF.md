# Handoff - Project Dashboard Command Surface

Date: 2026-06-19
Status: local implementation/proof mostly complete; linked Supabase rollout blocked by DB auth; Google Maps/Places provider addendum pending implementation

## Provider Direction Addendum

Current product direction has changed: use Google Maps Platform as the single
provider for project-location autocomplete and display. The prior
MapLibre/OpenFreeMap path remains historical local implementation/proof, but is
no longer the target.

Next implementation branch:

```text
codex/project-dashboard-google-maps-integration
```

Docs-only addendum requirements:

- Replace the OpenFreeMap/MapLibre provider path with Google Maps JavaScript API
  for display and Google Places Autocomplete for setup/edit search.
- Use Places only when setting/editing a project location. Saved dashboard views
  should render from stored coordinates and should not repeatedly geocode.
- Remove old `maplibre-gl`, OpenFreeMap env/config, CSP allowances, and
  provider-specific tests/proof scripts during the implementation pass.
- Require a browser-restricted Google key, Maps JavaScript API, Places API,
  localhost/production-domain restrictions, budget alerts, and quota caps before
  enabling the feature outside local development.
- Do not display Google Places results on a non-Google map.

## User-Facing Error

Runtime error `{ code: "42703" }` is Postgres `undefined_column`.

Root cause: the linked Supabase project does not yet have migration
`20260619105250_project_dashboard_activity_location.sql`, so the dashboard asks
for `estimate_sheet_events.project_id` before that column exists remotely.

This is not a Next.js/Turbopack bug.

## Current Implementation State

Implemented locally:

- Project dashboard command surface phases 1-3.
- Project-scoped recent sheets, publication status, estimate activity, and private location module.
- `estimate_sheet_events.project_id` migration and `project_locations` migration.
- Temporary exact schema-drift guards:
  - `src/lib/repositories/project-activity-repository.ts`
  - `src/lib/repositories/project-location-repository.ts`
- Superseded lazy MapLibre/OpenFreeMap map island currently present behind config:
  - `NEXT_PUBLIC_PROJECT_LOCATION_MAP_ENABLED`
  - `NEXT_PUBLIC_PROJECT_LOCATION_MAP_STYLE_URL`
- Protected route browser proof script:
  - `scripts/prove-project-dashboard-route-browser.mjs`
- Tap/focus-size fixes in shared workshop chrome:
  - `src/components/workshop/WorkshopBreadcrumbs.tsx`
  - `src/components/workshop/WorkshopTitleHeader.tsx`
  - `src/components/workshop/WorkshopFeedbackModal.tsx`
  - `src/components/workshop/ProjectMiniSidebar.tsx`

The schema-drift guards are compatibility guards only. They prevent the page
from crashing while the linked DB is behind; they do not replace applying the
migration.

## Evidence Already Collected

Passing local checks:

```sh
node --check scripts/prove-project-dashboard-route-browser.mjs
PROJECT_DASHBOARD_PROOF_PROJECT_ID=san-juan-townhouse node scripts/prove-project-dashboard-route-browser.mjs
bunx vitest run tests/vitest/project-component-projection.test.ts tests/vitest/project-dashboard-route-shell-ui.test.ts tests/vitest/project-dashboard-core-ui.test.ts tests/vitest/project-dashboard-client.test.tsx tests/vitest/project-activity-repository.test.ts tests/vitest/project-location-repository.test.ts --maxWorkers=1
bun run type-check
git diff --check
```

Latest protected route proof artifact:

```text
.ai/03_plans/2026-06-19-Project-Dashboard-Command-Surface/evidence/project-dashboard-route-browser-2026-06-19T130249Z/project-dashboard-route-browser-proof.json
```

That proof confirms `/workshop/projects/san-juan-townhouse` resolves through the
dev-auth bypass, avoids login/terms redirect, renders the command modules, has
no page/console errors, has no horizontal overflow, and all visible focus/tap
targets are at least 32px.

Earlier evidence is summarized in:

```text
.ai/03_plans/2026-06-19-Project-Dashboard-Command-Surface/LOOP_LEDGER.md
.ai/10_state/current-state.md
.ai/05_logs/2026-06-19-project-dashboard-command-surface-parallel-lanes.md
```

## Current Blocker

Linked Supabase CLI commands failed with:

```text
password authentication failed for user "cli_login_postgres"
ECIRCUITBREAKER
```

Local env inspection found no `SUPABASE_DB_PASSWORD`.

Do not keep retrying linked DB commands until a valid DB password or equivalent
direct DB credential is available; repeated attempts can extend the auth lockout.

Project boundary: only Supabase project `ebxxqidacheyapmmzavr`.

## Restart Checklist

Done:

- Local source implementation for phases 1-3 is present in the worktree.
- Local app now handles the known missing remote migration without crashing.
- Local route browser proof passed for `san-juan-townhouse`.
- Local tests/typecheck/diff checks listed above passed.
- Handoff state is recorded in `LOOP_LEDGER.md`, `.ai/10_state/current-state.md`,
  and `.ai/05_logs/2026-06-19-project-dashboard-command-surface-parallel-lanes.md`.

Not done:

- Migration `20260619105250` has not been applied to linked Supabase.
- Linked migration history has not been repaired for `20260619105250`.
- `src/lib/supabase/types.ts` has not been regenerated from the linked live
  schema after the migration.
- The temporary schema-drift guards have not been removed; remove them only
  after the linked schema is proven current and route proof still passes.

Avoid:

- Do not use `supabase db push --linked --include-all`.
- Do not retry linked DB commands without a valid DB password.
- Do not print or commit Supabase credentials.
- Do not touch any Supabase project other than `ebxxqidacheyapmmzavr`.

## Safe Remote Rollout Sequence

Once valid linked DB credentials are available, do not run
`supabase db push --linked --include-all`. There are unrelated local-only
migrations, so that would push too much.

Use the scoped sequence:

```sh
export SUPABASE_DB_PASSWORD='<linked-db-password>'
supabase db query --linked --file supabase/migrations/20260619105250_project_dashboard_activity_location.sql
supabase migration repair --linked --status applied 20260619105250
supabase migration list --linked | rg '20260619105250'
supabase gen types --linked --lang typescript --schema public > src/lib/supabase/types.ts
```

Then rerun:

```sh
bun run type-check
bun run prove:project-dashboard-activity-location
PROJECT_DASHBOARD_PROOF_PROJECT_ID=san-juan-townhouse node scripts/prove-project-dashboard-route-browser.mjs
git diff --check
```

If using `computer-use`, retrieve/reset the Supabase DB password in the browser
without committing it or printing it in logs, then export it only in the local
shell for the commands above.

## Files To Review First

Start here:

```text
.ai/03_plans/2026-06-19-Project-Dashboard-Command-Surface/LOOP_LEDGER.md
.ai/03_plans/2026-06-19-Project-Dashboard-Command-Surface/10-MIGRATION-RLS-QA-RUNBOOK.md
supabase/migrations/20260619105250_project_dashboard_activity_location.sql
src/lib/repositories/project-activity-repository.ts
src/lib/repositories/project-location-repository.ts
scripts/prove-project-dashboard-route-browser.mjs
```

## Known Validation Boundary

Local source, tests, typecheck, browser route proof, and native temp-Postgres
migration/RLS proof have passed. The remaining unproven piece is the live linked
Supabase schema rollout and regenerated live DB types after that rollout.
