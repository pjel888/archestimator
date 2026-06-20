# Handoff

## Current Status

This plan is complete and INDEPENDENTLY RE-VERIFIED as of 2026-06-20 (Loop 4). A fresh takeover ran a 5-lane parallel verification of the prior completion claim rather than trusting it, then closed every real gap found. See `LOOP_LEDGER.md` "Loop 4" for the full sweep. Net result:

- All prior code claims confirmed present (9/9, file:line evidence).
- No blocking correctness/security regressions found by adversarial review.
- Provider gap closed: migration `20260620030500` was live but unrecorded in the remote ledger; reconciled via `supabase migration repair --status applied 20260620030500` (ledger-only, no DDL re-run).
- Two regression guards added: RPC project-scoping/SQL-security test, and `refetchOnMount:false` freshness/prop-sync test.
- Benchmark warm-up hardened so first-hit dev compilation cannot leak into a measured run.
- Cold-path spike root-caused as a `next dev` compilation artifact (not a production defect); server query path verified bounded.

The hero route path is:

1. `http://localhost:3000/workshop`
2. `http://localhost:3000/workshop/projects`
3. `http://localhost:3000/workshop/projects/22222222-2222-4222-8222-222222222222`
4. `http://localhost:3000/workshop/projects/22222222-2222-4222-8222-222222222222/estimates`
5. `http://localhost:3000/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/bf254cbd-13d4-4dbf-b21a-84b171cdd6db`

The main implementation, local validation, provider-backed bounded RPC migration, final benchmark, and readiness gate are complete:

- Dev-auth bypass is now local-only and uses `httpOnly: true`.
- Benchmark JSON no longer records whole-worktree `gitStatusShort`.
- Readiness now fails if any measured run exceeds the scenario budget, not just if the median exceeds it.
- The project dashboard recent-estimates summary now uses a bounded RPC for the already-selected recent estimate ids.
- The estimates-table open-link hover prefetch is route-only; it no longer launches full estimate-tree or component-library server actions while the user is clicking into the estimate sheet.
- Estimate tree query hooks do not refetch server-seeded route trees on mount.

## Files Touched For This Task

- `.ai/03_plans/202-06-20-Hero-Path-Performance-Audit-And-Improvement/**`
- `scripts/measure-route-transitions.ts`
- `scripts/check-route-transition-readiness.ts`
- `src/app/workshop/projects/[projectId]/page.tsx`
- `src/app/workshop/projects/[projectId]/estimates/page.tsx`
- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`
- `src/lib/repositories/project-estimate-sheets-repository.ts`
- `src/lib/repositories/workspace-repository.ts`
- `src/lib/supabase/types.ts`
- `src/hooks/use-estimate-query.ts`
- `src/components/workshop/ProjectEstimatesTable.tsx`
- `supabase/migrations/20260620030500_project_estimate_list_summaries_for_estimates.sql`
- `tests/vitest/estimate-tabs-domain.test.ts`
- `tests/vitest/project-dashboard-route-shell-ui.test.ts`
- `tests/vitest/project-estimate-sheets-repository.test.ts`
- `tests/vitest/project-estimates-table-inline-edit.test.tsx`
- `tests/vitest/route-transition-measure-script.test.ts`
- `tests/vitest/route-transition-readiness-script.test.ts`

Added in Loop 4 (independent verification + gap closure):

- `tests/vitest/project-estimate-list-summaries-scoping.test.ts` (new — RPC project-scoping + migration SQL security guard)
- `tests/vitest/estimate-tree-refetch-on-mount.test.tsx` (new — `refetchOnMount:false` freshness/prop-sync guard)
- `scripts/measure-route-transitions.ts` (warm-up hardened via shared `settleAfterTransition` helper)

There are many unrelated dirty files in the worktree from concurrent work. Do not revert them.

## Implemented

- Added exact authenticated hero scenarios to the route-transition benchmark script.
- Added storage-state auth support, dev-auth bypass support, base URL preflight, visible-link targeting, route-overlay readiness, click-transition warm-up, and fail-closed behavior for benchmark run failures.
- Hardened dev-auth bypass so it refuses non-local `BASE_URL` origins.
- Added required hero scenario enforcement and max-duration budget enforcement to the readiness checker.
- Replaced project dashboard estimate-count over-fetch with a Supabase head-count query.
- Added `project_estimate_list_summaries_for_estimates(target_project_id uuid, target_estimate_ids uuid[])` for bounded dashboard recent-card totals.
- Applied the additive bounded RPC SQL to linked Supabase project `ebxxqidacheyapmmzavr`.
- Reduced duplicate project/estimate validation in the tab-aware estimate sheet route resolver.
- Added server timing trace scopes around the project dashboard, estimates list, and estimate sheet route loader waves.
- Removed heavy estimate open-link hover query prefetches that were competing with the deepest route transition.
- Stopped client mount refetches for server-seeded estimate tree queries.

## Provider Evidence

Successful:

- `SUPABASE_TELEMETRY_DISABLED=1 supabase db query --linked --file supabase/migrations/20260620030500_project_estimate_list_summaries_for_estimates.sql --output json`
  - Exit 0.
- Bounded live call returned a row only for project-owned estimate `33333333-3333-4333-8333-333333333333`; fake id `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa` returned no row.
- Grant check returned:
  - `authenticated_can_execute: true`
  - `anon_can_execute: false`

Do not run more linked Supabase queries immediately unless necessary. A later catalog verification query hit transient Supabase CLI temp-role auth failures and ended with:

- `failed SASL auth`
- `Connect to your database by setting the env var correctly: SUPABASE_DB_PASSWORD`

The SQL apply and earlier grant/RPC checks succeeded before that transient issue.

Loop 4 update (provenance reconciled): The bounded RPC was live and correct, but the function had been applied via direct `supabase db query` DDL, so version `20260620030500` was missing from the remote migration ledger (`schema_migrations`). This was reconciled with `supabase migration repair --status applied 20260620030500` (ledger-only write, no DDL re-run). `supabase migration list --linked` now shows it with a populated Remote column and MCP `list_migrations` lists it as the final entry. Re-verified live: function exists, STABLE, SECURITY INVOKER, `search_path = public`; `has_function_privilege('authenticated', ..., 'EXECUTE') = true`, `anon`/`public` = false; a fake estimate id returns no row. Caveat for future agents: `supabase db query --file` applies SQL but does NOT record a migration ledger row — use `apply_migration`/migration runner, or `migration repair` to reconcile.

## Latest Local Validation

Passed after the latest code changes and final benchmark fixes:

- `bun test tests/vitest/project-estimate-sheets-repository.test.ts tests/vitest/route-transition-measure-script.test.ts tests/vitest/route-transition-readiness-script.test.ts tests/vitest/estimate-tabs-domain.test.ts tests/vitest/project-dashboard-route-shell-ui.test.ts tests/vitest/live-estimate-node-route.test.ts tests/vitest/project-estimate-list-summaries-parity.test.ts`
  - 40 tests passed.
- `bunx vitest run tests/vitest/project-estimates-table-inline-edit.test.tsx tests/vitest/list-project-estimates-columns.test.ts --maxWorkers=1`
  - 2 files, 16 tests passed.
- `bunx vitest run tests/vitest/list-project-estimates-columns.test.ts --maxWorkers=1`
  - Superseded by the combined Vitest command above.
- `bun run type-check`
  - `tsc --noEmit` passed.
- `git diff --check`
  - Passed.

Do not use `bun test tests/vitest/list-project-estimates-columns.test.ts` as evidence; it hits the known Bun `server-only` harness issue. Use Vitest for that file.

Loop 4 authoritative re-validation (integrated tree, orchestrator-run):

- `bun test` over the 7 handoff files: 40 pass, 0 fail.
- `bunx vitest run tests/vitest/project-estimates-table-inline-edit.test.tsx tests/vitest/list-project-estimates-columns.test.ts tests/vitest/project-estimate-list-summaries-scoping.test.ts tests/vitest/estimate-tree-refetch-on-mount.test.tsx --maxWorkers=1`: 26 pass (4 files) — includes the two new Loop 4 guards.
- `bun run type-check`: clean (exit 0).
- `git diff --check`: clean (exit 0).

## Benchmark Artifacts

Final valid local benchmark after the latest hardening:

- `benchmarks/hero-route-transition-localhost3000-storage-state-final.json`
- `benchmarks/hero-route-readiness-localhost3000-storage-state-final.json`

Final medians and max durations:

- Workshop to Projects: median 665 ms, max 766 ms
- Projects to Target Project: median 908 ms, max 1013 ms
- Target Project to Estimates: median 737 ms, max 829 ms
- Estimates to Target Estimate: median 817 ms, max 1318 ms

Readiness:

- `routeTransitionReady: true`
- Required hero scenarios present: 4/4
- Scenario failures: 0
- Missing requirements: none
- `gitStatusShort` is absent from the final benchmark artifact.

Important caveats:

- This is local dev proof against `localhost:3000` with temporary Playwright storage-state auth. It is not hosted, production, CDN, or manual-user proof.
- The full estimates-list route still keeps the current all-rows UX; pagination/windowing remains a future scalability item if beta data grows materially.
- RESOLVED in Loop 4: the deepest-transition one-time cold spike (artifact value 10622ms) is a `next dev` on-demand route-compilation artifact, not a production defect. The server data path for that route is bounded (indexed single-node lookup, parallel loader waves, `limit`-capped tree/row-item fetches, no N+1). Warm-up was hardened to absorb the first-hit compilation tail. It is no longer an open production-performance item; `next build && next start` or hosted measurement remains the only way to fully characterize true cold-path latency.

## Next Steps

1. Do not rerun linked Supabase catalog checks unless needed; the migration apply and bounded RPC/grant evidence already passed.
2. If future agents continue performance work, start with production-like hosted proof or estimates-list pagination/windowing rather than reintroducing tree/library hover prefetch.
