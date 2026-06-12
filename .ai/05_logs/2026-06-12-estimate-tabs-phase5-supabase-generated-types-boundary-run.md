# Estimate Tabs Phase 5 Supabase Generated Types Boundary Probe

Date: 2026-06-12
Branch/worktree: `feat/estimate-tabs-phase5-templates-panel` at `/Users/philiplewis/archestimator.omx-worktrees/launch-codex-projects-auto-added-to-templates`
Commit baseline: `0eb38394` (`Keep landing contracts aligned with simplified launch flow`)

## Purpose

After the landing/public/project/security stale contract repairs, fresh full validation is down to one failing test: `tests/vitest/estimate-sheet-version-control-actions.test.ts` checks that every hardcoded estimate history RPC call in `src/lib/estimates/actions.ts` is present in the generated Supabase type map at `src/lib/supabase/types.ts`.

This probe determines whether that remaining failure is locally repairable without crossing the provider/typegen boundary documented in the Phase 5 plan pack.

## Fresh evidence

| Gate | Exit | Artifact | Result |
| --- | ---: | --- | --- |
| Focused version-control actions test | 1 | `.ai/05_logs/2026-06-12-estimate-tabs-phase5/supabase-history-rpc-types-focused-red.log` | 24/25 tests passed; the only failure asserts generated types lack `archive_estimate_tab_with_history: {`. |
| RPC/type coverage probe | captured | `.ai/05_logs/2026-06-12-estimate-tabs-phase5/supabase-history-rpc-types-boundary-probe.log` | Six estimate-tab history RPCs are missing from `src/lib/supabase/types.ts`; all pre-existing node/row/detail history RPCs remain present. |
| Migration marker scan | captured | `.ai/05_logs/2026-06-12-estimate-tabs-phase5/supabase-history-rpc-types-boundary-probe.log` | `supabase/migrations/20260612094734_estimate_tabs_foundation.sql` defines `public.estimate_tabs`, `estimate_tab_id`, grants, and all six new history RPCs. |
| Plan-boundary scan | captured | `.ai/05_logs/2026-06-12-estimate-tabs-phase5/supabase-history-rpc-types-boundary-probe.log` | `.ai` surfaces still label linked Supabase apply/typegen and provider proof as open gates. |
| `supabase status` | 1 | `.ai/05_logs/2026-06-12-estimate-tabs-phase5/supabase-history-rpc-types-boundary-probe.log` | Local Docker daemon is unavailable. |
| `supabase gen types --local --schema public` to temp probe | 1 | `.ai/05_logs/2026-06-12-estimate-tabs-phase5/supabase-history-rpc-types-boundary-probe.log` | Local non-provider type generation cannot run because Docker is unavailable. |

Supabase CLI was rechecked before the probe: installed CLI is `2.98.2`, with latest notice `2.106.0`; `supabase gen types --help` supports `--local`, `--linked`, `--project-id`, `--db-url`, and `--schema`. The Supabase changelog scan noted the current 2026 breaking-change items, including the 2026-04-28 Data API exposure change for newly created tables; that reinforces the need to keep table grants/RLS/provider proof explicit, but it does not provide a local generated-types bypass.

## Missing generated entries

`src/lib/estimates/actions.ts` calls these estimate-tab RPCs through `asEstimateHistoryRpcClient(supabase).rpc(...)`, and the migration defines them, but `src/lib/supabase/types.ts` does not contain their generated `Functions` entries:

- `archive_estimate_tab_with_history`
- `create_estimate_tab_with_history`
- `delete_estimate_tab_with_history`
- `duplicate_estimate_tab_with_history`
- `rename_estimate_tab_with_history`
- `reorder_estimate_tabs_with_history`

The generated type file also lacks the new `estimate_tabs` table/type markers and `estimate_tab_id` column markers expected from the migration.

## Boundary decision

Do **not** hand-edit `src/lib/supabase/types.ts` in this local slice. The Phase 5 plan pack treats this file as generated output after authorized Supabase apply/typegen, and the repository already carries temporary compatibility boundaries where runtime code must reference migration-created tab objects before linked type regeneration. Hand-writing the generated type map would make the test pass while weakening the proof boundary and could imply provider/schema parity that has not been established.

Do **not** run linked/provider type generation or linked migration application from this session without owner authorization. The remaining safe repair path is:

1. Apply `supabase/migrations/20260612094734_estimate_tabs_foundation.sql` through the approved Archestimator Supabase release path for project `ebxxqidacheyapmmzavr`.
2. Regenerate Supabase types from the same linked project, for example using the plan-command shape:
   ```bash
   npx supabase@2.98.2 gen types typescript --project-id ebxxqidacheyapmmzavr > src/lib/supabase/types.ts
   ```
3. Re-run `bun x vitest run tests/vitest/estimate-sheet-version-control-actions.test.ts --maxWorkers=1` and `bun run validate`.
4. Remove or narrow the temporary compatibility casts only after regenerated linked types prove the table/function contracts.

## Current validation status

Local validation is code-clean except for this generated type boundary:

- Focused landing/public/project/security repairs are green and committed.
- Latest broad validation after the landing repair fails only in `tests/vitest/estimate-sheet-version-control-actions.test.ts` for missing generated Supabase function types.
- This probe confirms the remaining failing contract depends on provider-authorized linked apply/typegen or a working local Supabase Docker typegen environment.

## Not performed

- No linked Supabase migration application.
- No linked/project-id type generation.
- No manual edits to generated `src/lib/supabase/types.ts`.
- No hosted provider proof, Vercel deploy, production/manual proof, or browser visual proof.
