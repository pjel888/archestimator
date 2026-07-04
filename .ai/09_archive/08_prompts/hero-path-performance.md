ou are taking over in /Users/philiplewis/Documents/archestimator.

  First read:
  1. AGENTS.md
  2. .ai/10_state/current-state.md top FAST PATH block only
  3. .ai/03_plans/202-06-20-Hero-Path-Performance-Audit-And-Improvement/HANDOFF.md
  4. .ai/03_plans/202-06-20-Hero-Path-Performance-Audit-And-Improvement/LOOP_LEDGER.md

  Important constraints:
  - Do not revert unrelated dirty files. This repo has unrelated working-tree changes.
  - Use the project’s proportional verification policy.
  - Use apply_patch for manual edits.
  - Supabase changes are authorized only for Archestimator project ebxxqidacheyapmmzavr.
  - Do not store secrets or auth state in the repo.

  Current status:
  The hero path performance audit/improvement task is complete and locally verified.

  Hero path:
  /workshop
  → /workshop/projects
  → /workshop/projects/22222222-2222-4222-8222-222222222222
  → /workshop/projects/22222222-2222-4222-8222-222222222222/estimates
  → /workshop/projects/22222222-2222-4222-8222-222222222222/estimates/bf254cbd-13d4-4dbf-b21a-84b171cdd6db

  Final benchmark artifact:
  .ai/03_plans/202-06-20-Hero-Path-Performance-Audit-And-Improvement/benchmarks/hero-route-transition-localhost3000-
  storage-state-final.json

  Final readiness artifact:
  .ai/03_plans/202-06-20-Hero-Path-Performance-Audit-And-Improvement/benchmarks/hero-route-readiness-localhost3000-
  storage-state-final.json

  Final result:
  - All four exact authenticated hero scenarios measured.
  - Readiness passed.
  - All measured runs were under the 2000ms budget.
  - Slowest final run: 1318ms on Estimates → Target Estimate.
  - Auth mode: storage-state.
  - No default networkidle wait.
  - Warm routes enabled.
  - gitStatusShort intentionally absent from artifacts.

  Key changes already made:
  - scripts/measure-route-transitions.ts
  - scripts/check-route-transition-readiness.ts
  - src/lib/repositories/project-estimate-sheets-repository.ts
  - src/lib/repositories/workspace-repository.ts
  - src/lib/supabase/types.ts
  - src/hooks/use-estimate-query.ts
  - src/components/workshop/ProjectEstimatesTable.tsx
  - src/app/workshop/projects/[projectId]/page.tsx
  - src/app/workshop/projects/[projectId]/estimates/page.tsx
  - src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx
  - supabase/migrations/20260620030500_project_estimate_list_summaries_for_estimates.sql
  - related Vitest coverage under tests/vitest/
  - handoff/ledger/benchmark files under the .ai plan directory

  Provider evidence:
  - Migration was applied to linked Supabase project ebxxqidacheyapmmzavr.
  - The bounded RPC project_estimate_list_summaries_for_estimates returned only requested project-owned rows.
  - Fake estimate id returned no row.
  - Grant check showed authenticated=true and anon=false.
  - A later extra catalog query hit a transient Supabase CLI temp-role/password issue; no further provider mutation
  is required unless you are explicitly asked to investigate.

  Validation already passed:
  - bun test tests/vitest/project-estimate-sheets-repository.test.ts tests/vitest/route-transition-measure-
  script.test.ts tests/vitest/route-transition-readiness-script.test.ts tests/vitest/estimate-tabs-domain.test.ts
  tests/vitest/project-dashboard-route-shell-ui.test.ts tests/vitest/live-estimate-node-route.test.ts tests/vitest/
  project-estimate-list-summaries-parity.test.ts
    Result: 40 tests passed.
  - bunx vitest run tests/vitest/project-estimates-table-inline-edit.test.tsx tests/vitest/list-project-estimates-
  columns.test.ts --maxWorkers=1
    Result: 16 tests passed.
  - bun run type-check passed.
  - git diff --check passed.
  - Dev server was stopped.

  If continuing from here:
  1. Start with git status --short and inspect only relevant diffs.
  2. Do not redo completed performance work unless validation has regressed.
  3. Best next step is a focused review of the relevant diff and, if requested, prepare a commit/PR using the repo’s
  Lore Commit Protocol.
  4. If you make any edits, rerun the narrow validation affected by those edits plus git diff --check.
  5. Keep the HANDOFF.md and LOOP_LEDGER.md updated if work continues or credits/context are at risk.