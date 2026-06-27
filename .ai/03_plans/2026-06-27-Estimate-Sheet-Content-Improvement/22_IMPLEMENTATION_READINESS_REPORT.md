# Estimate Sheet Content Improvement Implementation Readiness Report

Date: 2026-06-27

## Status

Conditionally ready for continued pre-launch validation behind local/provider gates.

The implemented slices cover the approved Phase 0.5 through Phase 5 local/provider/browser work that could be safely proven in this session. The planning folder is not archived because staging/production proof, the full manual action-matrix smoke, and the repo-wide DOM validation gate remain open release gates. The automated target-route smoke now covers route load, row edit persistence, row move persistence, and reload persistence on a provider-backed local fixture.

## Implemented

- Removed browser-facing estimate row write paths from the estimate repository and guarded production import reachability with regression tests.
- Hardened source snapshot persistence, client-audience proposal export DTO redaction, estimate sheet version RLS, Server Action direct invocation guards, tab mutation guards, and estimate action rate limiting.
- Replaced routine row/tree success toasts with scoped quiet status, added the no-selected-node center state, and exposed persistent Activity History restore actions for deleted rows and Areas.
- Added scoped row mutation coordination, stale response suppression, affected-row status, and movement blocking only for conflicting rows/nodes.
- Hardened row movement reconciliation for content/tree drops, stale tree target indices, cache-divergent move responses, and terminal drag-state cleanup.
- Hardened private project-image GET authorization with `can_access_project`, while allowing estimate-row image reads for estimate-scoped collaborators through `can_access_estimate` when the storage path carries `estimate-row-images/{estimateId}`.
- Routed sheet Adjustment writes through `update_estimate_sheet_adjustment_with_history`, including edit authorization, idempotency, revision conflict handling, and sheet history events.
- Hardened latest row update/replace and version-restore RPCs to require estimate edit access, replaced the version restore wrapper body to avoid stale `resolve_estimate_workspace` behavior, removed the old unsafe restore backup function, and added a fix-forward wrapper-delegate normalization migration.
- Added explicit route/cache finalization proof for routine row insert/update/delete/restore invalidation, active tree/detail refetch on row revision conflict, and server-side route-context process-cache clearing for route-affecting mutations.
- Added offline/degraded row-edit proof. Row mutations now use an explicit client offline guard instead of silently pausing in TanStack Query, offline row failures preserve the same-session draft, and ordinary non-offline failures still roll back.
- Added dedicated browser interaction timing proof for row drag hover/drop/ack. Row drop now flushes the optimistic tree update synchronously so the visible move lands inside the browser drop budget.
- React Doctor changed-scope output exits 0 with no issues after small behavior-preserving React/accessibility fixes.
- Converted local estimate-sheet render/keystroke profiles into budgeted tests and regenerated the JSON artifact.
- Updated the row-move browser proof to use the current accessible row handle contract instead of the intentionally removed stale test selector.

## Provider State

Applied to linked Supabase project `ebxxqidacheyapmmzavr`:

- `20260627130000_harden_estimate_sheet_versions_rls.sql`
- `20260627140000_harden_latest_estimate_mutation_rpc_authz.sql`
- `20260627141000_harden_estimate_sheet_adjustment_writes.sql`
- `20260627142000_fix_restore_version_copy_wrapper.sql`
- `20260627143000_drop_unsafe_restore_version_copy_backup.sql`
- `20260627144000_remove_unused_row_history_wrapper_variables.sql`
- `20260627145000_fix_row_history_wrapper_delegate_names.sql`

Provider proof:

```bash
supabase db push --linked
# Applied 20260627145000_fix_row_history_wrapper_delegate_names.sql.

supabase db push --linked --dry-run
# Remote database is up to date.

supabase migration list --linked
# Local and remote ledgers matched through 20260627145000_fix_row_history_wrapper_delegate_names.sql.

supabase db lint --linked
# Exit 0. No new row-history wrapper unused-variable warnings.
```

Provider artifact: `.ai/03_plans/2026-06-27-Estimate-Sheet-Content-Improvement/evidence/estimate-sheet-provider-cli-2026-06-27.json`.

`supabase db lint --linked` no longer reports the new row-history wrapper unused-variable warnings. It still reports existing static-analysis noise around PL/pgSQL temp tables and unrelated unused parameters; those were not introduced or resolved by this plan.

Direct provider RPC proof also passed against a disposable authenticated owner fixture: quantity changed from `1` to `7`, row revision changed from `1` to `2`, the canonical row readback matched, and the Server Action/RPC result returned the same persisted quantity/revision.

## Evidence

Local contract/perf matrix:

```bash
bunx vitest run \
  tests/vitest/estimate-route-cache-finalization.test.tsx \
  tests/vitest/estimate-row-mutation-coordinator.test.tsx \
  tests/vitest/estimate-sheet-library-insert.test.tsx \
  tests/vitest/estimate-query-cache-hydration.test.tsx \
  tests/vitest/estimate-workspace-client-cache.test.tsx \
  tests/vitest/estimate-tree-refetch-on-mount.test.tsx \
  tests/vitest/security-findings-auth-contracts.test.ts \
  tests/vitest/auth-sensitive-api-boundaries.test.ts \
  tests/vitest/estimate-row-branch-move.test.ts \
  --maxWorkers=1
# 9 files passed, 134 tests passed.

SHEET_PERF_BASELINE_OUTPUT=.ai/03_plans/2026-06-27-Estimate-Sheet-Content-Improvement/evidence/estimate-sheet-render-baseline-local.json \
bunx vitest run tests/vitest/perf/estimate-sheet-render-baseline.test.tsx --maxWorkers=1
# 1 file passed, 3 tests passed.
```

Perf artifact:

- Artifact: `.ai/03_plans/2026-06-27-Estimate-Sheet-Content-Improvement/evidence/estimate-sheet-render-baseline-local.json`
- Budgets: avg keystroke <= 16 ms, worst keystroke <= 50 ms, unrelated table renders = 0.
- 500-row result: 12.17 ms average keystroke, 16.68 ms worst keystroke, 0 unrelated table renders.

Browser proof on existing local dev server:

```bash
PLAYWRIGHT_PORT=3000 bunx playwright test e2e/estimate-sheet-loading-performance.spec.ts --project=chromium --reporter=list
# 5 passed.

PLAYWRIGHT_PORT=3000 ARCHESTIMATOR_E2E_ROW_MOVE=1 bunx playwright test e2e/estimate-row-move.spec.ts --project=chromium --reporter=list
# 1 passed.

PLAYWRIGHT_PORT=3037 ARCHESTIMATOR_E2E_ROW_MOVE=1 bunx playwright test e2e/estimate-sheet-target-route-smoke.spec.ts --project=chromium --reporter=list --workers=1
# 1 passed (53.8s).

PLAYWRIGHT_PORT=3036 ARCHESTIMATOR_E2E_ROW_MOVE=1 bunx playwright test e2e/estimate-sheet-offline.spec.ts --project=chromium --reporter=list --workers=1
# 1 passed (24.7s).

PLAYWRIGHT_PORT=3039 ARCHESTIMATOR_E2E_ROW_MOVE=1 bunx playwright test e2e/estimate-sheet-interaction-performance.spec.ts --project=chromium --reporter=list --workers=1
# 1 passed (26.1s).

PLAYWRIGHT_PORT=3021 ARCHESTIMATOR_E2E_ROW_MOVE=1 bunx playwright test e2e/estimate-row-move.spec.ts --project=chromium --reporter=list --workers=1
# 1 passed.
```

Browser artifacts:

- Target-route smoke: `.ai/03_plans/2026-06-27-Estimate-Sheet-Content-Improvement/evidence/estimate-sheet-target-route-smoke-local.json` recorded `routeLoaded=true`, row edit persistence for quantity `3`, misc cost `123`, adjustment `5`, move persistence to the target Area at sort order `1`, and reload persistence. It covers smoke steps 1, 2, 10, and 11, partially covers step 9, and leaves steps 3-8 plus 12-13 for the full manual action matrix.
- Offline/degraded: `.ai/03_plans/2026-06-27-Estimate-Sheet-Content-Improvement/evidence/estimate-sheet-offline-local.json` recorded pending visible in 99 ms, failure visible in 104 ms, same-session draft preserved, offline persistence unchanged at `1`, retry ack in 2811 ms, and retry persisted quantity `8`.
- Interaction timing: `.ai/03_plans/2026-06-27-Estimate-Sheet-Content-Improvement/evidence/estimate-sheet-interaction-performance-local.json` recorded hover p95 0.8 ms, hover worst 14.4 ms, drop-to-DOM 63.2 ms, Server Action ack 753 ms, active drag cleared, and one row-move mutation request carrying the moved row id.

Static and targeted validation:

```bash
bun run type-check
# passed

bunx eslint src/hooks/use-estimate-row-mutations.ts src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts src/components/workshop/estimate-sheet/rows/cells.tsx src/components/workshop/estimate-sheet/rows/row-table.tsx src/components/workshop/EstimateSheetContent.tsx e2e/support/estimate-row-fixture.ts e2e/estimate-sheet-target-route-smoke.spec.ts e2e/estimate-sheet-offline.spec.ts e2e/estimate-sheet-interaction-performance.spec.ts tests/vitest/estimate-row-mutation-coordinator.test.tsx
# passed

bunx vitest run tests/vitest/estimate-row-mutation-coordinator.test.tsx --reporter=verbose
# 1 file passed, 3 tests passed.

npx react-doctor@latest --verbose --scope changed
# Exit 0, "No issues found", 100 / 100.

git diff --check
# passed
```

Archive-readiness validation follow-up:

```bash
bun run lint
# passed with existing warnings

bun run lint:design-system
# passed

bun run lint:design
# passed

bunx vitest run tests/vitest/ui-dropdown-select.test.tsx tests/vitest/ui-modal-tooltip.test.tsx --reporter=verbose
# 2 files passed, 34 tests passed.

bun run validate
# exits 1 in test:dom after type-check, ESLint, lint:design-system, lint:design, and unit tests pass.
```

Follow-up artifact: `.ai/03_plans/2026-06-27-Estimate-Sheet-Content-Improvement/evidence/estimate-sheet-validation-followup-2026-06-27.json`.

`bun run validate` now reaches the repo-wide Vitest DOM phase and fails there with one failed suite plus 163 failed tests across unrelated auth, project groups, publication/resend, library, agent-payload, and contract suites. The touched-file regressions surfaced by that run (`ui-dropdown-select` typeahead re-anchor and `SectionLabel` 9px label expectation) were fixed and rechecked with the focused UI primitive matrix above.

## Remaining Gates

- Staging/production provider proof is not claimed.
- The full manual target-route action matrix is not run. The automated target-route smoke covers the persistence/reload subset listed above.
- Full `bun run validate` is attempted but remains red in the repo-wide `test:dom` phase. Type-check, repo ESLint, compact design-system lint, Impeccable design lint, unit tests, focused UI primitive tests, and `git diff --check` pass.
- The planning folder is not archived under `.ai/09_archive` until the remaining release gates are completed or explicitly waived.
