# Estimate Sheet Content Improvement Implementation Readiness Report

Date: 2026-06-27

## Status

Archive-ready for the authorized local/provider pre-launch scope.

The implemented slices cover the approved Phase 0.5 through Phase 5 local/provider/browser work plus the owner-authorized closeout gates completed in this session. The full target-route action matrix, load-limited movement guard, read-only viewer denial, provider migration drift check, scoped static validation, focused Vitest matrix, and target-route browser smoke all have passing evidence. The folder is ready to archive at `.ai/09_archive/2026-06-27-Estimate-Sheet-Content-Improvement/`.

Hosted staging/production deployment proof is not claimed, and no production deploy or paid provider action was performed. Full `bun run validate` remains red in the repo-wide Vitest DOM phase because of known non-estimate failures; targeted estimate-sheet gates are green.

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
- Added mutation telemetry for stale success/failure and revision conflict reporting around estimate row actions.
- Fixed the bulk row delete provider RPC history event target selection so it no longer relies on unsupported `min(uuid)` aggregation.
- Added and passed the full provider-backed target-route action matrix for row edits, blank/library insertion, component replacement/detach/promote/move, single and bulk delete/restore, row movement, keyboard/touch move dialog, reload persistence, and viewer read-only denial.
- Added and passed the load-limited browser guard proving row movement is disabled when the tree row budget is exceeded and persisted order remains unchanged.
- Gated estimate-sheet mutation affordances for read-only viewers, including row selection, bulk toolbar, row drop targets, row/component drag handles, delete/move/replace/promote/project-specific controls, template drops, and editable scalar inputs.

## Provider State

Applied to linked Supabase project `ebxxqidacheyapmmzavr`:

- `20260627130000_harden_estimate_sheet_versions_rls.sql`
- `20260627140000_harden_latest_estimate_mutation_rpc_authz.sql`
- `20260627141000_harden_estimate_sheet_adjustment_writes.sql`
- `20260627142000_fix_restore_version_copy_wrapper.sql`
- `20260627143000_drop_unsafe_restore_version_copy_backup.sql`
- `20260627144000_remove_unused_row_history_wrapper_variables.sql`
- `20260627145000_fix_row_history_wrapper_delegate_names.sql`
- `20260627152000_fix_bulk_row_delete_uuid_first_row.sql`

Provider proof:

```bash
supabase db push --linked --yes
# Applied 20260627152000_fix_bulk_row_delete_uuid_first_row.sql.

supabase db push --linked --dry-run
# Remote database is up to date.

supabase migration list --linked
# Local and remote ledgers matched through 20260627152000_fix_bulk_row_delete_uuid_first_row.sql.

supabase db lint --linked
# Exit 0. No new row-history wrapper unused-variable warnings.
```

Provider artifact: `.ai/09_archive/2026-06-27-Estimate-Sheet-Content-Improvement/evidence/estimate-sheet-provider-cli-2026-06-27.json`.

`supabase db lint --linked` no longer reports the new row-history wrapper unused-variable warnings. It still reports existing static-analysis noise around PL/pgSQL temp tables and unrelated unused parameters; those were not introduced or resolved by this plan.

Final closeout replay of `supabase db push --linked --dry-run` exited `1` because the CLI could not authenticate the temp role and requested `SUPABASE_DB_PASSWORD`. That replay is recorded as a provider CLI auth readback gap, not as migration drift; the fresh `supabase migration list --linked` readback still matched local and remote through `20260627152000`.

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

SHEET_PERF_BASELINE_OUTPUT=.ai/09_archive/2026-06-27-Estimate-Sheet-Content-Improvement/evidence/estimate-sheet-render-baseline-local.json \
bunx vitest run tests/vitest/perf/estimate-sheet-render-baseline.test.tsx --maxWorkers=1
# 1 file passed, 3 tests passed.
```

Perf artifact:

- Artifact: `.ai/09_archive/2026-06-27-Estimate-Sheet-Content-Improvement/evidence/estimate-sheet-render-baseline-local.json`
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

ARCHESTIMATOR_E2E_ROW_MOVE=1 EXPRESS_COMPONENT_PROMOTION_ENABLED=1 PLAYWRIGHT_PORT=3059 ESTIMATE_SHEET_FULL_MATRIX_OUTPUT=.ai/09_archive/2026-06-27-Estimate-Sheet-Content-Improvement/evidence/estimate-sheet-full-action-matrix-local.json bunx playwright test e2e/estimate-sheet-owner-gated-full-matrix.spec.ts -g "full target-route action matrix" --project=chromium --reporter=list
# 1 passed (2.4m).

ARCHESTIMATOR_E2E_ROW_MOVE=1 EXPRESS_COMPONENT_PROMOTION_ENABLED=1 ARCHESTIMATOR_E2E_ESTIMATE_TREE_ROW_LIMIT=4 PLAYWRIGHT_PORT=3060 ESTIMATE_SHEET_FULL_MATRIX_OUTPUT=.ai/09_archive/2026-06-27-Estimate-Sheet-Content-Improvement/evidence/estimate-sheet-load-limited-movement-local.json bunx playwright test e2e/estimate-sheet-owner-gated-full-matrix.spec.ts -g "load-limited" --project=chromium --reporter=list
# 1 passed (20.0s).

ARCHESTIMATOR_E2E_ROW_MOVE=1 EXPRESS_COMPONENT_PROMOTION_ENABLED=1 PLAYWRIGHT_PORT=3061 ESTIMATE_SHEET_TARGET_ROUTE_SMOKE_OUTPUT=.ai/09_archive/2026-06-27-Estimate-Sheet-Content-Improvement/evidence/estimate-sheet-target-route-smoke-local.json bunx playwright test e2e/estimate-sheet-target-route-smoke.spec.ts --project=chromium --reporter=list
# 1 passed (46.7s).
```

Browser artifacts:

- Full target-route action matrix: `.ai/09_archive/2026-06-27-Estimate-Sheet-Content-Improvement/evidence/estimate-sheet-full-action-matrix-local.json` recorded smoke steps 1-12 passed with no failed steps: route load, scalar/text edits, blank-row insertion while typing, library insertion, component replace/detach/promote/move, single delete/restore, bulk delete/restore, same-node row movement, content-to-tree row movement plus sibling reorder, keyboard/touch move dialog, reload persistence, and viewer read-only mutation denial.
- Load-limited movement guard: `.ai/09_archive/2026-06-27-Estimate-Sheet-Content-Improvement/evidence/estimate-sheet-load-limited-movement-local.json` recorded smoke step 13 passed with `ARCHESTIMATOR_E2E_ESTIMATE_TREE_ROW_LIMIT=4`; movement controls were disabled and the before/after persisted row location remained unchanged.
- Target-route smoke: `.ai/09_archive/2026-06-27-Estimate-Sheet-Content-Improvement/evidence/estimate-sheet-target-route-smoke-local.json` recorded `routeLoaded=true`, row edit persistence for quantity `3`, misc cost `123`, adjustment `5`, move persistence to the target Area at sort order `1`, and reload persistence. Its older open-smoke subset is superseded by the full action matrix and load-limited artifacts above.
- Offline/degraded: `.ai/09_archive/2026-06-27-Estimate-Sheet-Content-Improvement/evidence/estimate-sheet-offline-local.json` recorded pending visible in 99 ms, failure visible in 104 ms, same-session draft preserved, offline persistence unchanged at `1`, retry ack in 2811 ms, and retry persisted quantity `8`.
- Interaction timing: `.ai/09_archive/2026-06-27-Estimate-Sheet-Content-Improvement/evidence/estimate-sheet-interaction-performance-local.json` recorded hover p95 0.8 ms, hover worst 14.4 ms, drop-to-DOM 63.2 ms, Server Action ack 753 ms, active drag cleared, and one row-move mutation request carrying the moved row id.

Static and targeted validation:

```bash
bun run type-check
# passed

bunx eslint src/hooks/use-estimate-row-mutations.ts src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts src/components/workshop/estimate-sheet/rows/cells.tsx src/components/workshop/estimate-sheet/rows/row-table.tsx src/components/workshop/EstimateSheetContent.tsx e2e/support/estimate-row-fixture.ts e2e/estimate-sheet-target-route-smoke.spec.ts e2e/estimate-sheet-offline.spec.ts e2e/estimate-sheet-interaction-performance.spec.ts tests/vitest/estimate-row-mutation-coordinator.test.tsx
# passed

bunx vitest run tests/vitest/estimate-row-mutation-coordinator.test.tsx --reporter=verbose
# 1 file passed, 3 tests passed.

bunx eslint src/components/workshop/EstimateSheetContent.tsx src/components/workshop/estimate-sheet/rows/branch.tsx src/components/workshop/estimate-sheet/rows/drop-zones.tsx src/components/workshop/estimate-sheet/rows/row-table.tsx src/components/workshop/estimate-sheet/rows/cells.tsx tests/vitest/estimate-row-table-virtualization.test.tsx e2e/estimate-sheet-owner-gated-full-matrix.spec.ts e2e/support/estimate-row-fixture.ts
# passed

bunx vitest run tests/vitest/estimate-row-table-virtualization.test.tsx tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx tests/vitest/estimate-sheet-version-control-actions.test.ts tests/vitest/estimate-sheet-version-control-schema.test.ts tests/vitest/estimate-mutation-telemetry.test.ts tests/vitest/estimate-sheet-large-data-budgets.test.ts --reporter=verbose
# 6 files passed, 67 tests passed.

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

bunx vitest run tests/vitest/estimate-bootstrap-ui.test.ts tests/vitest/estimate-component-library-lazy-load.test.tsx tests/vitest/estimate-node-reorder-action.test.ts tests/vitest/estimate-route-server-concurrency.test.ts tests/vitest/estimate-row-table-virtualization.test.tsx tests/vitest/estimate-sheet-column-resize-a11y.test.tsx tests/vitest/estimate-sheet-extracted-models.test.ts tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-sheet-node-totals.test.ts tests/vitest/estimate-sheet-row-details-crud.test.tsx tests/vitest/estimate-sheet-spacing.test.tsx tests/vitest/estimate-sheet-tree-query-error.test.tsx tests/vitest/estimate-sheet-version-control-ui.test.tsx tests/vitest/estimate-tabs-domain.test.ts tests/vitest/estimate-tree-modal.test.tsx tests/vitest/express-components.test.ts tests/vitest/express-promotion-action.test.ts tests/vitest/security-findings-implementation-contracts.test.ts tests/vitest/workspace-repository-estimate-tree.test.ts --maxWorkers=1 --reporter=verbose
# 19 files passed, 170 tests passed.

bunx vitest run tests/vitest/new-project-form-validation.test.tsx --reporter=verbose
# 1 file passed, 4 tests passed.

bun run validate
# exits 1 in test:dom after type-check, ESLint, lint:design-system, lint:design, and unit tests pass.

bunx vitest run --maxWorkers=1 --reporter=json --outputFile=/tmp/archestimator-vitest-dom-after-local-fixes.json
# exits 1. 3608 total tests, 3468 passed, 131 failed, 4 pending; 84 failed suites across 36 files.
```

Follow-up artifact: `.ai/09_archive/2026-06-27-Estimate-Sheet-Content-Improvement/evidence/estimate-sheet-validation-followup-2026-06-27.json`.

`bun run validate` now reaches the repo-wide Vitest DOM phase. Focused follow-up closed the estimate-sheet matrix (`19` files / `170` tests), the touched UI primitive matrix (`2` files / `34` tests), and the touched New Project modal expectation (`1` file / `4` tests). A fresh repo-wide DOM pass still exits `1` with `131` failed tests across `36` files in auth/beta, project groups/favorites, publication, library, agent-payload/tooling, upload-proof, and project-list contract areas.

## Remaining Gates

- Hosted staging/production deployment proof is not claimed. No production deploy, hosted route smoke, paid provider action, PITR enablement, or internet purchase was performed.
- Latest `supabase db push --linked --dry-run` replay is not claimed because the CLI lacked `SUPABASE_DB_PASSWORD` for temp-role auth. Earlier dry-run evidence remains recorded, and the fresh migration ledger readback still matched through `20260627152000`.
- Full `bun run validate` was attempted but remains red in the repo-wide `test:dom` phase from known non-estimate failures. Type-check, repo ESLint, compact design-system lint, Impeccable design lint, unit tests, focused UI primitive tests, focused estimate DOM tests, the touched New Project modal test, focused final estimate-sheet Vitest, full target-route action matrix, load-limited browser proof, fresh provider migration ledger readback, and `git diff --check` pass.
- No estimate-sheet local/provider/archive gate remains open. The planning folder is archive-ready under `.ai/09_archive/2026-06-27-Estimate-Sheet-Content-Improvement/`.
