# Project Dashboard Command Surface Parallel Lanes - 2026-06-19

## Lead Goal

Drive `.ai/03_plans/2026-06-19-Project-Dashboard-Command-Surface/` to an honest closeout:
Phase 1 command surface, Phase 2 project activity, and Phase 3 private location/map
are implemented, verified, recorded, and reviewed. The remaining critical gap is the
linked Supabase migration-history drift that prevents remote application of
`20260619105250_project_dashboard_activity_location.sql`.

## Coordination Rules

- Multiple agents may be working in this same directory. Do not revert or overwrite
  edits you did not make.
- Use disjoint scopes. Report any shared-file conflict upward to the lead.
- The lead owns Supabase remote mutation decisions and final checkpointing.
- Agent findings should reference file paths, command output, and residual risks.

## Lanes

| Lane | Owner | Scope | Write Scope | Status |
|---|---|---|---|---|
| DB rollout | subagent | Supabase migration drift/apply strategy and validation checklist | read-only unless lead redirects | dispatched |
| Stop-condition audit | subagent | Compare plan rows to current files/tests/evidence | read-only | complete |
| UI/privacy review | subagent | Review changed dashboard UI, raw payload/coordinate leak boundaries | read-only | complete |
| Lead integration | lead | Apply critical fixes, run commands, update ledger/state | current task files only | complete locally; remote DB credentials pending |

## Integrated Findings

- Runtime `42703` root cause: linked Supabase schema is missing local migration
  `20260619105250_project_dashboard_activity_location.sql`, specifically
  `estimate_sheet_events.project_id`.
- Guard fix: dashboard activity/location repositories now degrade only for exact
  missing-migration signatures and warn with the migration id; unrelated database
  errors still throw.
- Remote rollout: `supabase migration fetch --linked` recovered remote-only
  migration files `20260616163259`, `20260616170256`, and `20260616171158`.
  Normal remote push remains blocked by older local-only migrations; no remote
  apply is claimed.
- Proof hardening: local temp-Postgres proof now includes restricted estimate
  activity RLS omission, and the migration runbook records exact-location DSAR,
  export, delete, and retention handling.
- Protected route proof: the stale local dev server was stopped so the proof
  script could own a Next dev process with the local dev-auth bypass.
  `PROJECT_DASHBOARD_PROOF_PROJECT_ID=san-juan-townhouse node scripts/prove-project-dashboard-route-browser.mjs`
  passed and wrote
  `.ai/03_plans/2026-06-19-Project-Dashboard-Command-Surface/evidence/project-dashboard-route-browser-2026-06-19T130249Z/project-dashboard-route-browser-proof.json`
  plus desktop/mobile screenshots. The proof confirmed no login redirect, no
  page/console errors, no horizontal overflow, and 32px-minimum visible
  focus/tap targets.
- Remote DB credential gate: repeated linked Supabase CLI attempts failed with
  `password authentication failed for user "cli_login_postgres"` /
  `ECIRCUITBREAKER`, and `.env.local` has no `SUPABASE_DB_PASSWORD`. Stop
  retrying linked DB commands until valid DB credentials are present.

## Pending Remote Sequence

Once valid linked DB credentials are available for project `ebxxqidacheyapmmzavr`,
use the scoped sequence recommended by the DB rollout lane instead of
`supabase db push --linked --include-all`:

1. `supabase db query --linked --file supabase/migrations/20260619105250_project_dashboard_activity_location.sql`
2. `supabase migration repair --linked --status applied 20260619105250`
3. `supabase migration list --linked | rg '20260619105250'`
4. `supabase gen types --linked --lang typescript --schema public`
