# Estimate Tabs Implementation Ledger

Scope: `.ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates` and `.ai/08_prompts/IMPLEMENT-2026-06-12-Projects-Auto-Added-To-Templates.md`.
Proof boundary labels: `local-only`, `provider-proven`, `manual-proof-pending`.


## Phase 0 Iteration 1 — Baseline and citation spot-check

- Started: 2026-06-12T09:27:58Z
- Branch: feat/estimate-tabs-phase0-baseline
- HEAD: 8cb24974e47c8fd7340fffb1201159763b3b6b0f
- Upstream parity: 0/0 (left/right)
- Worktree status before baseline:

```text
## feat/estimate-tabs-phase0-baseline...origin/main
?? .ai/05_logs/2026-06-12-estimate-tabs-implementation-ledger.md
```

Raw command output files are stored under `.ai/05_logs/2026-06-12-estimate-tabs-baseline/` and are part of this Phase 0 evidence bundle.

### git-fetch-prune

- Command: `git fetch --prune origin`
- Started: 2026-06-12T09:27:58Z
- Ended: 2026-06-12T09:27:59Z
- Exit code: 0
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline/git-fetch-prune.log`

### git-status

- Command: `git status --short --branch`
- Started: 2026-06-12T09:27:59Z
- Ended: 2026-06-12T09:27:59Z
- Exit code: 0
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline/git-status.log`

### plan-pack-intact

- Command: `find .ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates -maxdepth 1 -type f -name '*.md' | sort && test $(find .ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates -maxdepth 1 -type f -name '*.md' | wc -l | tr -d ' ') = 17`
- Started: 2026-06-12T09:27:59Z
- Ended: 2026-06-12T09:27:59Z
- Exit code: 0
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline/plan-pack-intact.log`

### bun-run-type-check

- Command: `bun run type-check`
- Started: 2026-06-12T09:27:59Z
- Ended: 2026-06-12T09:28:02Z
- Exit code: 2
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline/bun-run-type-check.log`

### bun-run-lint

- Command: `bun run lint`
- Started: 2026-06-12T09:28:02Z
- Ended: 2026-06-12T09:28:02Z
- Exit code: 0
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline/bun-run-lint.log`

### bun-run-lint-design-system

- Command: `bun run lint:design-system`
- Started: 2026-06-12T09:28:02Z
- Ended: 2026-06-12T09:28:03Z
- Exit code: 0
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline/bun-run-lint-design-system.log`

### bun-run-lint-design

- Command: `CI=1 npm_config_yes=true bun run lint:design`
- Started: 2026-06-12T09:28:03Z
- Ended: 2026-06-12T09:32:52Z
- Exit code: 143
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline/bun-run-lint-design.log`

### bun-run-test

- Command: `bun run test`
- Started: 2026-06-12T09:32:52Z
- Ended: 2026-06-12T09:32:52Z
- Exit code: 1
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline/bun-run-test.log`

### bun-run-test-dom

- Command: `bun run test:dom`
- Started: 2026-06-12T09:32:52Z
- Ended: 2026-06-12T09:32:53Z
- Exit code: 127
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline/bun-run-test-dom.log`

### bun-run-build

- Command: `bun run build`
- Started: 2026-06-12T09:32:53Z
- Ended: 2026-06-12T09:32:53Z
- Exit code: 127
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline/bun-run-build.log`

### targeted-estimate-characterization

- Command: `bunx vitest run tests/vitest/estimate-sheet-cost-inputs.test.tsx tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-sheet-tree-dom.test.tsx tests/vitest/estimate-tree-context-menu.test.tsx tests/vitest/estimate-template-drop-zones.test.tsx tests/vitest/estimate-sheet-version-control-ui.test.tsx --maxWorkers=1`
- Started: 2026-06-12T09:32:53Z
- Ended: 2026-06-12T09:32:56Z
- Exit code: 1
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline/targeted-estimate-characterization.log`

### targeted-perf

- Command: `bunx vitest run tests/vitest/perf --maxWorkers=1`
- Started: 2026-06-12T09:32:56Z
- Ended: 2026-06-12T09:32:57Z
- Exit code: 1
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline/targeted-perf.log`

### targeted-export-regression

- Command: `bunx vitest run tests/vitest/proposal-workbook.test.ts tests/vitest/proposal-export-model.test.ts tests/vitest/proposal-export-route.test.ts tests/vitest/proposal-export-route-workbook.test.ts --maxWorkers=1`
- Started: 2026-06-12T09:32:57Z
- Ended: 2026-06-12T09:32:59Z
- Exit code: 1
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline/targeted-export-regression.log`

### optional-notification-rls-harness

- Command: `node scripts/prove-notification-rls-postgres.mjs`
- Started: 2026-06-12T09:32:59Z
- Ended: 2026-06-12T09:32:59Z
- Exit code: 1
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline/optional-notification-rls-harness.log`


### Phase 0 Iteration 1 command summary

```text
label=bun-run-build exit_code=127 log=.ai/05_logs/2026-06-12-estimate-tabs-baseline/bun-run-build.log
label=bun-run-lint-design-system exit_code=0 log=.ai/05_logs/2026-06-12-estimate-tabs-baseline/bun-run-lint-design-system.log
label=bun-run-lint-design exit_code=143 log=.ai/05_logs/2026-06-12-estimate-tabs-baseline/bun-run-lint-design.log
label=bun-run-lint exit_code=0 log=.ai/05_logs/2026-06-12-estimate-tabs-baseline/bun-run-lint.log
label=bun-run-test-dom exit_code=127 log=.ai/05_logs/2026-06-12-estimate-tabs-baseline/bun-run-test-dom.log
label=bun-run-test exit_code=1 log=.ai/05_logs/2026-06-12-estimate-tabs-baseline/bun-run-test.log
label=bun-run-type-check exit_code=2 log=.ai/05_logs/2026-06-12-estimate-tabs-baseline/bun-run-type-check.log
label=git-fetch-prune exit_code=0 log=.ai/05_logs/2026-06-12-estimate-tabs-baseline/git-fetch-prune.log
label=git-status exit_code=0 log=.ai/05_logs/2026-06-12-estimate-tabs-baseline/git-status.log
label=optional-notification-rls-harness exit_code=1 log=.ai/05_logs/2026-06-12-estimate-tabs-baseline/optional-notification-rls-harness.log
label=plan-pack-intact exit_code=0 log=.ai/05_logs/2026-06-12-estimate-tabs-baseline/plan-pack-intact.log
label=targeted-estimate-characterization exit_code=1 log=.ai/05_logs/2026-06-12-estimate-tabs-baseline/targeted-estimate-characterization.log
label=targeted-export-regression exit_code=1 log=.ai/05_logs/2026-06-12-estimate-tabs-baseline/targeted-export-regression.log
label=targeted-perf exit_code=1 log=.ai/05_logs/2026-06-12-estimate-tabs-baseline/targeted-perf.log
```

- Ended: 2026-06-12T09:32:59Z
- Next action: classify baseline failures against , incorporate citation spot-check, then decide Phase 1 start readiness.


## Phase 0 Baseline Rerun After Dependency Install


### git-status-rerun

- Command: `git status --short --branch`
- Started: 2026-06-12T09:36:36Z
- Ended: 2026-06-12T09:36:36Z
- Exit code: 0
- Timed out: false
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/git-status-rerun.log`

### bun-run-type-check-rerun

- Command: `bun run type-check`
- Started: 2026-06-12T09:36:36Z
- Ended: 2026-06-12T09:36:45Z
- Exit code: 0
- Timed out: false
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/bun-run-type-check-rerun.log`

### bun-run-lint-rerun

- Command: `bun run lint`
- Started: 2026-06-12T09:36:45Z
- Ended: 2026-06-12T09:37:07Z
- Exit code: 1
- Timed out: false
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/bun-run-lint-rerun.log`

### bun-run-lint-design-system-rerun

- Command: `bun run lint:design-system`
- Started: 2026-06-12T09:37:07Z
- Ended: 2026-06-12T09:37:08Z
- Exit code: 0
- Timed out: false
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/bun-run-lint-design-system-rerun.log`

### bun-run-lint-design-rerun

- Command: `printf 'Y\n' | bun run lint:design`
- Started: 2026-06-12T09:37:08Z
- Ended: 2026-06-12T09:37:08Z
- Exit code: 0
- Timed out: false
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/bun-run-lint-design-rerun.log`

### bun-run-test-rerun

- Command: `bun run test`
- Started: 2026-06-12T09:37:08Z
- Ended: 2026-06-12T09:37:08Z
- Exit code: 1
- Timed out: false
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/bun-run-test-rerun.log`

### bun-run-test-dom-rerun

- Command: `bun run test:dom`
- Started: 2026-06-12T09:37:08Z
- Ended: 2026-06-12T09:41:08Z
- Exit code: 1
- Timed out: false
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/bun-run-test-dom-rerun.log`

### bun-run-build-rerun

- Command: `bun run build`
- Started: 2026-06-12T09:41:08Z
- Ended: 2026-06-12T09:41:28Z
- Exit code: 0
- Timed out: false
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/bun-run-build-rerun.log`

### targeted-estimate-characterization-rerun

- Command: `bunx vitest run tests/vitest/estimate-sheet-cost-inputs.test.tsx tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-sheet-tree-dom.test.tsx tests/vitest/estimate-tree-context-menu.test.tsx tests/vitest/estimate-template-drop-zones.test.tsx tests/vitest/estimate-sheet-version-control-ui.test.tsx --maxWorkers=1`
- Started: 2026-06-12T09:41:28Z
- Ended: 2026-06-12T09:41:48Z
- Exit code: 0
- Timed out: false
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/targeted-estimate-characterization-rerun.log`

### targeted-perf-rerun

- Command: `bunx vitest run tests/vitest/perf --maxWorkers=1`
- Started: 2026-06-12T09:41:48Z
- Ended: 2026-06-12T09:41:56Z
- Exit code: 0
- Timed out: false
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/targeted-perf-rerun.log`

### targeted-export-regression-rerun

- Command: `bunx vitest run tests/vitest/proposal-workbook.test.ts tests/vitest/proposal-export-model.test.ts tests/vitest/proposal-export-route.test.ts tests/vitest/proposal-export-route-workbook.test.ts --maxWorkers=1`
- Started: 2026-06-12T09:41:56Z
- Ended: 2026-06-12T09:41:59Z
- Exit code: 0
- Timed out: false
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/targeted-export-regression-rerun.log`

### Phase 0 rerun command summary

```text
label=git-status-rerun exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/git-status-rerun.log
label=bun-run-type-check-rerun exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/bun-run-type-check-rerun.log
label=bun-run-lint-rerun exit_code=1 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/bun-run-lint-rerun.log
label=bun-run-lint-design-system-rerun exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/bun-run-lint-design-system-rerun.log
label=bun-run-lint-design-rerun exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/bun-run-lint-design-rerun.log
label=bun-run-test-rerun exit_code=1 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/bun-run-test-rerun.log
label=bun-run-test-dom-rerun exit_code=1 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/bun-run-test-dom-rerun.log
label=bun-run-build-rerun exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/bun-run-build-rerun.log
label=targeted-estimate-characterization-rerun exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/targeted-estimate-characterization-rerun.log
label=targeted-perf-rerun exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/targeted-perf-rerun.log
label=targeted-export-regression-rerun exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/targeted-export-regression-rerun.log
```

## Phase 0 baseline classification and citation spot-check

### Dependency setup correction

- `node_modules/` was absent for the first baseline pass; `bun install --frozen-lockfile` was run afterward and completed with exit code `0` (`.ai/05_logs/2026-06-12-estimate-tabs-baseline/bun-install-frozen-lockfile.log`). No tracked dependency manifest changed.
- The first-pass dependency-sensitive failures (`type-check`, `test:dom`, `build`, targeted `bunx vitest`) are therefore classified as **invalid environment artifacts** and superseded by the rerun artifacts in `.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/`.
- The first-pass `lint:design` exit `143` was an interactive Impeccable prompt hang, not a design failure. The rerun used `printf 'Y\n' | bun run lint:design` and exited `0`.
- The optional local RLS harness remained blocked by missing Homebrew Postgres 16 (`/opt/homebrew/opt/postgresql@16/bin/initdb`) in `.ai/05_logs/2026-06-12-estimate-tabs-baseline/optional-notification-rls-harness.log`; this is a local harness prerequisite gap, not feature evidence.

### Rerun baseline after dependency install

| Gate | Exit | Classification | Artifact |
|---|---:|---|---|
| `git status --short --branch` | 0 | evidence-only; showed only Phase 0 log dirt at rerun start | `.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/git-status-rerun.log` |
| `bun run type-check` | 0 | PASS baseline | `.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/bun-run-type-check-rerun.log` |
| `bun run lint` | 1 | PRE-EXISTING baseline failure: 3 errors / 548 warnings. Errors are `src/components/ui/overlays/command-dialog.tsx:92` (`react-hooks/set-state-in-effect`) and `src/stories/navigation/tabs.stories.tsx:112-113` (`no-explicit-any`). | `.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/bun-run-lint-rerun.log` |
| `bun run lint:design-system` | 0 | PASS baseline | `.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/bun-run-lint-design-system-rerun.log` |
| `printf 'Y\n' \| bun run lint:design` | 0 | PASS baseline; stdin answered Impeccable's prompt | `.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/bun-run-lint-design-rerun.log` |
| `bun run test` | 1 | PRE-EXISTING baseline failure: `tests/unit/reset-baseline.test.ts:54` still expects removed workshop-sidebar class text. 8 pass / 1 fail. | `.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/bun-run-test-rerun.log` |
| `bun run test:dom` | 1 | PRE-EXISTING broad-suite baseline failure: 14 failed test files, 24 failed tests, 2 import-resolution failed suites; 213 files passed / 1677 tests passed. | `.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/bun-run-test-dom-rerun.log` |
| `bun run build` | 0 | PASS baseline; `next-env.d.ts` churn was restored after build | `.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/bun-run-build-rerun.log` |
| targeted estimate characterization suite | 0 | PASS Phase 0 characterization gate | `.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/targeted-estimate-characterization-rerun.log` |
| targeted estimate perf suite | 0 | PASS Phase 0 perf tripwire | `.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/targeted-perf-rerun.log` |
| targeted export regression suite | 0 | PASS Phase 0 export tripwire | `.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/targeted-export-regression-rerun.log` |

### Broad DOM-suite baseline failure inventory

`bun run test:dom` failed before any feature edits with these broad-suite regressions captured as baseline debt, not estimate-tab regressions:

- Failed suites/imports: `tests/vitest/storybook-plan-matrix.test.ts` missing `.ai/03_plans/2026-06-06-ui-component-optimization-componentization/*` raw imports; `tests/vitest/workshop-route-error-boundaries.test.tsx` imports missing `@/app/workshop/templates/error`.
- Failed tests: `security-findings-contracts.test.ts` (2), `project-dashboard-ui.test.ts` (2), `live-estimate-node-route.test.ts` (1), `workshop-reset.test.tsx` (2), `landing-company-proof.test.ts` (5), `estimate-tree-bulk-selection.test.tsx` (1), `landing-amigo-redesign.test.tsx` (4), `public-cache-safety-harness.test.tsx` (1), `landing-interactivity.test.tsx` (2), `project-collaboration-summary.test.ts` (1), `public-font-lcp-audit.test.ts` (2), `project-publication-summary.test.ts` (1).
- Future feature work must not add any new failures beyond this baseline; targeted estimate/perf/export gates are currently green and should remain green after each phase.

### Terminology map reviewed

- Reviewed `01_CURRENT_STATE_AUDIT.md` §16-17 and `02_TARGET_ARCHITECTURE.md` §2: user-facing product copy migrates from sheet to estimate/tab in Phase 4, while DB/internal names (`estimate_sheet_*`, `sheet_code`, `EstimateSheet*`, localStorage keys, stored event types) are retained until guarded cleanup.
- Explicit non-target meanings remain protected: Excel worksheet vocabulary, MIME literals, the `Sheet` overlay primitive, and construction-material strings such as sheet vinyl / Sheet Membranes / unit sheet.
- Phase 1 database work should add tab structures and compatibility shims without broad rebrand edits.

### Citation spot-check

Verifier subagent result: **PASS** for five selected `01_CURRENT_STATE_AUDIT.md` citations with no drift:

1. DB/tree invariants match `src/lib/estimates/tree-hierarchy.ts`, `src/lib/domain/estimate-tree.ts`, and `supabase/migrations/20260520222038_enforce_two_kind_estimate_nodes.sql`.
2. Route/repository fallback matches `src/lib/repositories/workspace-repository.ts:getProjectEstimateTreeByNode` and the existing fallback to `getProjectEstimateTreeByEstimate(projectId, nodeId)`.
3. Templates browse citations match `src/app/workshop/library/templates/page.tsx` and `src/components/workshop/library/templates-browse/*`.
4. Export workbook citations match `src/lib/proposal-export/create-proposal-workbook.ts` static worksheet creation/order.
5. Export tests cite live assertions in `tests/vitest/proposal-workbook.test.ts`, `tests/vitest/proposal-export-route-workbook.test.ts`, and the workbook-scraping e2e.

### Phase 0 decision

Phase 0 is complete enough to start Phase 1 implementation: branch baseline is recorded, initial environment artifacts are separated from true baseline debt, core target-domain gates are green, plan citations spot-checked cleanly, and terminology/non-rename guardrails are recorded. The current stop condition remains the full prompt objective, so do not mark the overall goal complete.
## Phase 1 local database foundation iteration

### Summary

Phase 1 local implementation is complete enough for a phase-scoped commit. The migration, proof harness, schema test, and app default-tab creation shim are authored and locally validated. Linked Supabase apply/typegen and provider/manual proof remain explicitly deferred and owner-gated.

### Changed files

- `supabase/migrations/20260612094734_estimate_tabs_foundation.sql`
- `scripts/prove-estimate-tabs-postgres.mjs`
- `tests/vitest/estimate-tabs-schema.test.ts`
- `src/lib/estimates/actions.ts`
- `package.json`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase1/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase1-implementation-run.md`

### Gates run

```text
label=node-check-prove-script-after-import-cleanup exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase1/node-check-prove-script-after-import-cleanup.log
label=schema-vitest exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase1/schema-vitest.log
label=type-check exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase1/type-check.log
label=postgres-rls-pg16-default exit_code=1 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase1/postgres-rls-pg16-default.log classification=local_prerequisite_gap_missing_/opt/homebrew/opt/postgresql@16/bin/initdb
label=postgres-rls-pg15-local exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase1/postgres-rls-pg15-local.log
label=targeted-estimate-characterization exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase1/targeted-estimate-characterization.log
label=targeted-perf exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase1/targeted-perf.log
label=targeted-export-regression exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase1/targeted-export-regression.log
label=build exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase1/build.log
label=lint-after-import-cleanup exit_code=1 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase1/lint-after-import-cleanup.log classification=pre_existing_baseline_3_errors_548_warnings
```

### RTM rows locally satisfied / still open

- Local Phase 1 evidence satisfies R1.1, R1.2, R7.3, R10.5, R12.1, R12.2, and the local-boundary portion of R12.3.
- Provider/typegen parts of R12.3 remain owner-gated; do not claim provider proof until linked apply and type regeneration are explicitly authorized and run.
- Rows spanning Phase 2+ stay open: R10.1 activity composer/tab labels, repository/domain wrappers, UI, templates, export, collaboration, AI/package-builder, and final cleanup.

### Remaining Phase 1 boundary

- `src/lib/supabase/types.ts` intentionally not regenerated; temporary typed compatibility shims in `src/lib/estimates/actions.ts` document the owner-gated type regeneration boundary.
- Default harness path still expects Homebrew Postgres 16; this machine only proved the harness with the available `/opt/homebrew/bin` Postgres binary.
- `next-env.d.ts` build churn restored before staging.
## Phase 2 repository/domain compatibility-wrapper iteration

### Summary

Phase 2 local implementation is complete enough for a phase-scoped commit. Tab-aware types, loaders, query keys, actions, row invalidation targets, per-tab workspace state, and activity labels are additive. Legacy callers keep their signatures and default-tab wrapper behavior. Linked Supabase apply/typegen remains owner-gated.

### Changed files

- `src/lib/domain/estimate-tree.ts`
- `src/lib/estimates/types.ts`
- `src/lib/reusable-sources/types.ts`
- `src/lib/repositories/workspace-repository.ts`
- `src/lib/repositories/estimate-repository.ts`
- `src/lib/estimates/actions.ts`
- `src/hooks/use-estimate-query.ts`
- `src/hooks/use-estimate-row-mutations.ts`
- `src/hooks/use-estimate-workspace-state.ts`
- `src/lib/activity/activity-composer.ts`
- `src/lib/activity/activity-copy-dictionary.ts`
- `src/lib/activity/types.ts`
- `tests/vitest/estimate-node-reorder-action.test.ts`
- `tests/vitest/estimate-tabs-domain.test.ts`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase2/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase2-implementation-run.md`

### Gates run

```text
label=type-check-after-lint-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase2/type-check-after-lint-fix.log
label=phase2-domain-actions exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase2/phase2-domain-actions.log
label=postgres-rls-pg15-local exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase2/postgres-rls-pg15-local.log
label=targeted-estimate-characterization exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase2/targeted-estimate-characterization.log
label=targeted-perf exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase2/targeted-perf.log
label=targeted-export-regression exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase2/targeted-export-regression.log
label=build-after-lint-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase2/build-after-lint-fix.log
label=lint-after-lint-fix exit_code=1 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase2/lint-after-lint-fix.log classification=pre_existing_baseline_3_errors_548_warnings
```

### RTM rows locally advanced / still open

- Local Phase 2 evidence advances R1.3, R1.5, R1.6, and the activity-label portion of R10.1.
- R12.3 remains provider/typegen-gated; no linked apply or generated remote types were claimed.
- Rows spanning Phase 3+ stay open: editor UI, copy rebrand, templates panel, export, collaboration/presence UI, AI/package-builder, hosted/manual proof, and cleanup/archive.

### Remaining Phase 2 boundary

- Repository wrappers include missing-schema fallback because local/provider DB apply is still owner-gated.
- New tab CRUD actions are available but no user-visible controls were added in this phase.
- `next-env.d.ts` build churn restored before staging.

## Phase 3 editor tab UI iteration

### Summary

Phase 3 local implementation is complete enough for a phase-scoped commit. The estimate editor now has a release-gated tab strip, tab-aware route hydration, tab-scoped tree/sheet query selection, per-tab UI state, cursor tab isolation, empty-tab affordances, and explicit multi-tab export warning behavior. Lifecycle controls that could create/duplicate/rename/reorder tabs remain hidden in beta editor routes until Phase 6 tab-aware export ships.

### Changed files

- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`
- `src/components/workshop/EstimateWorkspaceClient.tsx`
- `src/components/workshop/EstimateSheetTree.tsx`
- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/estimate-sheet/EstimateTabStrip.tsx`
- `src/components/workshop/estimate-sheet/events.ts`
- `src/hooks/use-estimate-query.ts`
- `src/hooks/use-estimate-cursor-broadcast.ts`
- `src/lib/repositories/workspace-repository.ts`
- `tests/vitest/estimate-tab-strip.test.tsx`
- `tests/vitest/estimate-tabs-domain.test.ts`
- `tests/vitest/estimate-sheet-tree-dom.test.tsx`
- `tests/vitest/estimate-cursor-broadcast-throttle.test.ts`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase3/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase3-implementation-run.md`

### Gates run

```text
label=phase3-tab-ui-vitest exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase3/phase3-tab-ui-vitest.log
label=phase3-sheet-regression-vitest exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase3/phase3-sheet-regression-vitest.log
label=type-check exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase3/type-check.log
label=build exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase3/build.log
label=lint exit_code=1 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase3/lint.log classification=pre_existing_baseline_3_errors_548_warnings
label=lint-design-system exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase3/lint-design-system.log
label=diff-check exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase3/diff-check.log
label=localhost-auth-smoke exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase3/localhost-auth-smoke.log classification=local_route_redirects_to_login
label=browser-visual-proof exit_code=blocked timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase3/browser-visual-proof-blocker.log classification=in_app_browser_iab_unavailable
```

### RTM rows locally advanced / still open

- Local Phase 3 evidence advances editor tab UI, per-tab UI state, tab-scoped tree/sheet query selection, route/default-tab compatibility, cursor tab isolation, and D-15 lifecycle/export gating.
- R12.3 remains provider/typegen-gated; no linked Supabase apply or generated remote types were claimed.
- Rows spanning Phase 4+ stay open: terminology/copy rebrand, templates/source automation, all-tabs export, AI/package-builder, hosted/manual proof, and final cleanup/archive.

### Remaining Phase 3 boundary

- Browser/manual editor proof was not claimed because the in-app Browser `iab` surface was unavailable and the local workshop route redirected to `/login` without an authenticated browser session.
- Tab lifecycle server actions are wired for internal tests but not visible in the editor by default.
- `next-env.d.ts` build churn restored before staging.


## Phase 4 terminology rebrand iteration

### Summary

Phase 4 local implementation is complete enough for a phase-scoped commit. User-facing “estimate sheet/sheet” copy now reads as “estimate” when it names the estimate, active tree containers are labeled “tabs,” and `sheet_code` is displayed as “Estimate code.” Internal compatibility names stay unchanged: DB/RPC/table/function symbols, `EstimateSheet*` component/file names, `sheetCode`, stored `sheet_*` event names, Excel worksheet vocabulary, overlay `Sheet`, material/unit strings, localStorage/data attributes, and mass-deletion RPC tokens.

### Changed files

- App/share/invite/marketing copy: `src/app/**`, `src/components/landing/**`, `src/components/share/**`.
- Workshop UI copy: estimate list/table/create form, editor center chrome, metadata strips, publication/teamspace headers, homebase/invites, template/gallery/editor, and component-library aria families.
- Copy helpers/actions: `src/lib/activity/**`, `src/lib/ai/**`, `src/lib/collaboration/**`, `src/lib/estimates/actions.ts`, `src/lib/mass-deletion/bulk-action.ts`, `src/lib/publication/types.ts`, `src/lib/workshop/actions.ts`.
- Copy-coupled tests/e2e/story assertions: `tests/vitest/**`, `tests/unit/reset-baseline.test.ts`, `e2e/shared-link-receiver.spec.ts`, `e2e/workshop-library-demo-smoke.spec.ts`, `src/stories/trees/tree-panel-header.stories.tsx`.
- Evidence: `.ai/05_logs/2026-06-12-estimate-tabs-phase4/`; run summary: `.ai/05_logs/2026-06-12-estimate-tabs-phase4-implementation-run.md`.

### Gates run

```text
label=phase4-targeted-copy-final exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase4/vitest-phase4-targeted-final.log result=15_files_176_tests_passed
label=phase4-adjacent-copy-without-known-mcp-baseline exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase4/vitest-phase4-adjacent-copy-without-baseline-mcp.log result=5_files_64_tests_passed
label=phase4-ai-package-builder-copy exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase4/vitest-phase4-ai-package-builder.log result=4_files_88_tests_passed
label=phase4-teamspace-invite-copy-rerun exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase4/vitest-phase4-teamspace-invite-copy-rerun.log result=3_files_29_tests_passed
label=phase4-history-cursor-copy-rerun exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase4/vitest-phase4-history-cursor-copy-rerun.log result=1_test_passed_24_skipped
label=phase4-exact-source-copy-scan exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase4/terminology-exact-final.log result=no_exact_legacy_source_copy_output
label=type-check-final exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase4/bun-run-type-check-final.log
label=build-final exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase4/bun-run-build-final.log
label=lint-design-system exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase4/bun-run-lint-design-system.log
label=lint-design exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase4/bun-run-lint-design.log
label=diff-check-final exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase4/git-diff-check-final.log
label=lint exit_code=1 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase4/bun-run-lint.log classification=pre_existing_baseline_3_errors_548_warnings
label=validate exit_code=1 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase4/bun-run-validate.log classification=pre_existing_lint_gate_3_errors_548_warnings
label=unit-tests-rerun exit_code=1 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase4/bun-run-test-unit-rerun.log classification=pre_existing_reset_baseline_line_54
label=phase4-adjacent-copy-rerun exit_code=1 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase4/vitest-phase4-adjacent-copy-rerun.log classification=pre_existing_mcp_hook_contract_baseline
label=phase4-additional-copy-rerun exit_code=1 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase4/vitest-phase4-additional-copy-rerun.log classification=pre_existing_stale_generated_supabase_types_and_workshop_reset_baselines
```

### RTM rows locally advanced / still open

- Local Phase 4 evidence advances R2.1, R2.2, R2.3, R2.5, and the Phase-4 keep-list portion of R3.1.
- R2.4 has local marketing/landing alignment, but owner review remains product-decision proof.
- R12.3 and provider/manual proof remain owner-gated; no linked Supabase apply/typegen, Vercel deploy, hosted proof, or manual/browser proof is claimed.
- Rows spanning Phase 5+ stay open: templates/source automation, all-tabs export, collaboration/publication/provider proof, AI/package-builder follow-ups, and final cleanup/archive.

### Remaining Phase 4 boundary

- The exact source-copy scan is clean for the table-driven user-facing patterns, but internal compatibility `sheet*` names remain intentionally present by the keep-list.
- Broad repo gates still contain the documented baseline failures above; Phase 4 did not add a new failure in the targeted copy/test/build/type-check evidence.

## Phase 5 R6.1 reusable project-source drag parser slice

### Summary

Phase 5 has started with a narrow, local-only R6.1 contract slice. The component-library templates module now exposes a distinct project-source drag MIME type and strict payload parser for whole-tab and subtree project-derived reusable sources. Template payload parsing remains separate from project-source parsing.

### Changed files

- `src/components/workshop/component-library/templates.ts`
- `tests/vitest/reusable-source-drag.test.ts`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-r6-1-implementation-run.md`

### Gates run

```text
label=phase5-reusable-source-drag exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-reusable-source-drag.log result=1_file_5_tests_passed
label=type-check exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-type-check.log
label=diff-check exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/git-diff-check.log
```

### RTM rows locally advanced / still open

- Local Phase 5 evidence advances R6.1 only.
- R4.1-R4.6, R5.1-R5.3, R6.2, and R7.1-R7.2 remain open; no panel UI, read actions, insertion RPC/action, keyboard/context-menu parity, or RLS/provider proof is claimed.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy, production/manual proof, or browser visual proof was performed.

### Remaining Phase 5 boundary

- Project-derived sources remain virtual/read-through; this parser slice does not persist project data into template tables.
- Project sources are not yet visible or insertable from the UI.

## Phase 5 R4.2 reusable-source tree UI seam

### Summary

Phase 5 now includes a local, prop-driven unified reusable-source tree seam. The estimate right sidebar can render Custom Templates and Projects together, with project/estimate/tab/node rows, shared search that preserves matched ancestors, project-source drag payload stamping, and a context-menu callback seam for project tab/node insertion. Existing template tree behavior remains green in the same UI suite.

### Changed files

- `src/lib/reusable-sources/types.ts`
- `src/components/workshop/component-library/tree/TemplatesTree.tsx`
- `src/components/workshop/component-library/tree/index.ts`
- `src/components/workshop/component-library/index.tsx`
- `src/components/workshop/estimate-workshop-drag.ts`
- `tests/vitest/component-library-ui.test.tsx`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-r4-2-ui-seam-implementation-run.md`

### Gates run

```text
label=phase5-project-source-tree-ui exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-project-source-tree-ui.log result=1_file_46_tests_passed
label=phase5-reusable-source-drag-rerun exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-reusable-source-drag-rerun.log result=1_file_5_tests_passed
label=type-check-project-sources exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-type-check-project-sources.log
label=diff-check-project-sources exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/git-diff-check-project-sources.log
```

### RTM rows locally advanced / still open

- Local Phase 5 evidence advances R4.2 as a UI seam only.
- R4.1, R4.2a, R4.3, R4.4 preview/live metadata, R4.5, R4.6, R5.1-R5.3, R6.2, and R7.1-R7.2 remain open; no read actions, filter chips, preview docks, browse-route parity, insert RPC/action, keyboard/bulk parity, or RLS/provider proof is claimed.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy, production/manual proof, or browser visual proof was performed.

### Remaining Phase 5 boundary

- Project-derived sources remain virtual/read-through and are not persisted into template tables.
- Project sources are visible only when supplied through the new sidebar prop.
- Project-source insertion is a callback seam only; no server action or RPC is wired yet.

## Phase 5 R4.1/R4.3 reusable-source read actions

### Summary

Phase 5 now includes local server-action contracts for reusable project sources. `listReusableProjectSources` returns readable project/estimate roots while excluding pending invites, and `getReusableEstimateOutline` lazily returns tabs plus group/area source rows for one estimate at a time. Project-derived sources remain virtual/read-through and are not persisted into template tables.

### Changed files

- `src/lib/reusable-sources/actions.ts`
- `tests/vitest/reusable-sources-actions.test.ts`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-r4-1-r4-3-read-actions-implementation-run.md`

### Gates run

```text
label=phase5-reusable-sources-actions exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-reusable-sources-actions.log result=1_file_2_tests_passed
label=type-check-reusable-actions exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-type-check-reusable-actions.log
label=diff-check-reusable-actions exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/git-diff-check-reusable-actions.log
```

### RTM rows locally advanced / still open

- Local Phase 5 evidence advances R4.1 and R4.3 as server-action contracts.
- R4.2a remains open until the UI consumes these actions and proves all readable workspace projects show by default with narrowing controls.
- R4.4 preview/live metadata, R4.5, R4.6, R5.1-R5.3, R6.2, and R7.1-R7.2 remain open; no panel data wiring, filter chips, preview docks, browse-route parity, insert RPC/action, keyboard/bulk parity, RLS harness, or provider proof is claimed.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy, production/manual proof, or browser visual proof was performed.

### Remaining Phase 5 boundary

- The sidebar and browse route do not consume these actions yet.
- `getReusableEstimateOutline` loads one estimate outline at a time; broader search and preview metadata are still future slices.

## Phase 5 R4.2a default project-source root load slice

### Summary

Phase 5 now includes a local root-load seam from the estimate right sidebar
Templates tab to the reusable project-source read action. In an estimate context,
when callers do not supply `projectSources`, `EstimateRightSidebar` calls
`listReusableProjectSources`, renders the returned project/estimate roots under
the unified `Projects` section, and avoids refetching when sources are supplied
by props. Project-derived sources remain virtual/read-through.

### Changed files

- `src/components/workshop/component-library/index.tsx`
- `tests/vitest/component-library-ui.test.tsx`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-r4-2a-default-project-source-load-implementation-run.md`

### Gates run

```text
label=phase5-project-source-default-load exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-project-source-default-load.log result=1_file_48_tests_passed
label=type-check-project-source-default-load exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-type-check-project-source-default-load.log
label=diff-check-project-source-default-load exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/git-diff-check-project-source-default-load.log
```

### RTM rows locally advanced / still open

- Local Phase 5 evidence partially advances R4.2a by wiring default readable
  project/estimate root loading into the estimate sidebar Templates tab.
- R4.2a remains open for current-project narrowing controls.
- R4.3 remains action-contract complete but UI-partial: per-estimate outline
  loading on expansion is not wired yet.
- R4.4 preview/live metadata, R4.5, R4.6, R5.1-R5.3, R6.2, and R7.1-R7.2 remain
  open; no filter chips, preview docks, browse-route parity, insert RPC/action,
  keyboard/bulk parity, RLS harness, or provider proof is claimed.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.

### Remaining Phase 5 boundary

- The root source list loads only when the sidebar has estimate context and no
  caller-supplied project sources.
- Source children below estimates still need the lazy outline-on-expand slice.
- Project-source insertion is still a callback seam only; no server action or RPC
  is wired yet.

## Phase 5 R4.3 project-source outline-on-expand slice

### Summary

Phase 5 now includes local UI consumption of the lazy reusable estimate outline
action. Project-estimate rows in the Templates tree stay expandable before child
sources are loaded; expanding one calls `getReusableEstimateOutline`, merges the
returned tab/group/area sources into the virtual Projects tree, and skips the
call when outline sources were supplied by props.

### Changed files

- `src/components/workshop/component-library/index.tsx`
- `src/components/workshop/component-library/tree/TemplatesTree.tsx`
- `tests/vitest/component-library-ui.test.tsx`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-r4-3-outline-on-expand-implementation-run.md`

### Gates run

```text
label=phase5-project-source-outline-on-expand exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-project-source-outline-on-expand.log result=1_file_49_tests_passed
label=type-check-outline-on-expand exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-type-check-outline-on-expand.log
label=diff-check-outline-on-expand exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/git-diff-check-outline-on-expand.log
```

### RTM rows locally advanced / still open

- Local Phase 5 evidence completes R4.3 as an action-plus-UI lazy-load contract.
- R4.2a remains partial for current-project narrowing controls.
- R4.4 preview/live metadata, R4.5, R4.6, R5.1-R5.3, R6.2, and R7.1-R7.2 remain
  open; no filter chips, preview docks, browse-route parity, insert RPC/action,
  keyboard/bulk parity, RLS harness, or provider proof is claimed.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.

### Remaining Phase 5 boundary

- Lazy outline loading is proven locally in the sidebar only.
- Project-source insertion is still a callback seam only; no server action or RPC
  is wired yet.

## Phase 5 R4.2a current-project narrowing slice

### Summary

Phase 5 now includes the local optional current-project narrowing control for
the estimate-sidebar Projects section. All readable project roots remain visible
by default; selecting `Current project only` filters the virtual source list to
the active project, and `All projects` restores the full list.

### Changed files

- `src/components/workshop/component-library/index.tsx`
- `tests/vitest/component-library-ui.test.tsx`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-r4-2a-current-project-filter-implementation-run.md`

### Gates run

```text
label=phase5-project-source-current-project-filter exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-project-source-current-project-filter.log result=1_file_50_tests_passed
label=type-check-current-project-filter exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-type-check-current-project-filter.log
label=diff-check-current-project-filter exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/git-diff-check-current-project-filter.log
```

### RTM rows locally advanced / still open

- Local Phase 5 evidence completes R4.2a as a sidebar UI contract: default all
  readable projects plus opt-in current-project narrowing.
- R4.4 broader search/filter chips, preview/live metadata, R4.5, R4.6,
  R5.1-R5.3, R6.2, and R7.1-R7.2 remain open; no preview docks, browse-route
  parity, insert RPC/action, keyboard/bulk parity, RLS harness, or provider proof
  is claimed.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.

### Remaining Phase 5 boundary

- Current-project narrowing is proven locally in the sidebar only.
- Project-source insertion is still a callback seam only; no server action or RPC
  is wired yet.

## Phase 5 R4.4 project-source preview metadata seam

### Summary

Phase 5 now includes a narrow local preview metadata seam for project-derived
reusable sources in the estimate-sidebar Templates panel. Clicking project,
estimate, tab, or group/area project-source rows opens a read-through `Project
source preview` panel. The panel can render action-provided live metadata fields
(project, estimate, Estimate code, tab, node path, last updated, row count, and
total) and offers a non-management insert handoff for insertable tab/node
sources. Project-derived sources remain virtual/read-through and are not
persisted into template tables.

### Changed files

- `src/lib/reusable-sources/types.ts`
- `src/components/workshop/component-library/index.tsx`
- `src/components/workshop/component-library/tree/TemplatesTree.tsx`
- `tests/vitest/component-library-ui.test.tsx`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-r4-4-preview-metadata-seam-implementation-run.md`

### Gates run

```text
label=phase5-project-source-preview-metadata exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-project-source-preview-metadata.log result=1_file_51_tests_passed
label=type-check-project-source-preview exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-type-check-project-source-preview.log
label=diff-check-project-source-preview exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/git-diff-check-project-source-preview.log
```

### RTM rows locally advanced / still open

- Local Phase 5 evidence partially advances R4.4 by adding the sidebar preview
  metadata seam and a DOM regression for action-provided live metadata fields.
- R4.4 remains open for broader section/search filter chips, server-backed live
  metadata freshness, richer preview row detail, and browse-route parity.
- R4.5, R4.6, R5.1-R5.3, R6.2, and R7.1-R7.2 remain open; no save-as-template
  from source, browse-route parity, insert RPC/action, keyboard/bulk parity,
  RLS harness, or provider proof is claimed.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.

### Remaining Phase 5 boundary

- The preview reads metadata already supplied with project-derived sources; it
  does not fetch row details or totals on click.
- Project-source insertion is still a callback seam only; no server action or RPC
  is wired yet.
- Browse-route parity and provider-backed RLS/freshness proof remain separate
  Phase 5/7 slices.

## Phase 5 R6.2 project-source bulk insertion seam

### Summary

Phase 5 now includes a local bulk-insertion seam for project-derived reusable
sources in the estimate-sidebar Templates panel. Insertable project tab and
project group/area rows participate in cascade selection while project and
estimate container rows remain non-insertable. Bulk add resolves checked project
sources as top-most reusable selections, so a checked tab inserts once instead
of also inserting its checked child nodes.

### Changed files

- `src/components/workshop/component-library/index.tsx`
- `src/components/workshop/component-library/tree/TemplatesTree.tsx`
- `src/components/workshop/component-library/tree/index.ts`
- `tests/vitest/component-library-ui.test.tsx`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-r6-2-project-source-bulk-insert-implementation-run.md`

### Gates run

```text
label=phase5-project-source-bulk-insert exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-project-source-bulk-insert.log result=1_file_52_tests_passed
label=type-check-project-source-bulk-insert exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-type-check-project-source-bulk-insert.log
label=diff-check-project-source-bulk-insert exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/git-diff-check-project-source-bulk-insert.log
```

### RTM rows locally advanced / still open

- Local Phase 5 evidence partially advances R6.2 for project-derived sources:
  drag, context-menu insertion, and bulk insertion seams now exist for
  insertable project tab/node sources.
- R6.2 remains open for keyboard-specific insertion parity, full template/source
  parity review, and the eventual server action/RPC insertion path.
- R4.5, R4.6, R5.1-R5.3, and R7.1-R7.2 remain open; no save-as-template from
  source, browse-route parity, insert RPC/action, RLS harness, or provider proof
  is claimed.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.

### Remaining Phase 5 boundary

- Bulk add calls the existing `onInsertProjectSource` callback only; it does not
  write project-derived data into templates or estimates by itself.
- Project and estimate container rows remain browse/expand/preview rows, not
  insertion targets.
- Keyboard parity and provider-backed permission proof remain separate slices.

## Phase 5 R5.1/R5.3 template preservation proof

### Summary

Phase 5 now has fresh local preservation evidence for existing custom template
behavior. The template-focused suite covers the estimate-sidebar Templates tab,
template browse/gallery preview and insert flows, the New Template modal, and
estimate canvas template drop zones. This advances R5.1 and R5.3 as preserved
local-only contracts without changing template CRUD or insert source behavior.

### Changed files

- `.ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates/13_REQUIREMENTS_TRACEABILITY_MATRIX.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-implementation-ledger.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-r5-template-preservation-implementation-run.md`
- `.ai/10_state/current-state.md`

### Gates run

```text
label=phase5-template-preservation exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-template-preservation.log result=4_files_75_tests_passed
label=type-check-template-preservation exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-type-check-template-preservation.log
label=diff-check-template-preservation exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/git-diff-check-template-preservation.log
```

### RTM rows locally advanced / still open

- Local Phase 5 evidence advances R5.1 as preserved: template CRUD/category
  management remains green through the sidebar and browse/gallery suites.
- Local Phase 5 evidence advances R5.3 as preserved: template insert via sidebar,
  browse/gallery, and drop-zone flows remains green.
- R5.2 remains open for explicit template-editor-only proof.
- R4.5, R4.6, remaining R6.2 keyboard parity, and R7.1-R7.2 remain open; no
  save-as-template from project source, browse-route parity for project sources,
  insert RPC/action, RLS harness, or provider proof is claimed.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.

### Remaining Phase 5 boundary

- This was a proof-only slice; it deliberately did not modify template CRUD or
  insert behavior.
- Provider/database insertion proof remains separate from local UI/action tests.
- Template editor route proof remains tracked by R5.2.

## Phase 5 R5.2 template editor template-only proof

### Summary

Phase 5 now has explicit local proof that the template editor remains
template-only while project-derived sources stay out of editor composition in
v1. `TemplateEditorClient` mounts the re-hosted sidebar in `scratch`
template-creation mode without project ids, `projectSources`, or an
`onInsertProjectSource` callback, and the library route layout still hides the
normal tab strip on template editor routes.

### Changed files

- `tests/vitest/template-editor.test.tsx`
- `.ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates/13_REQUIREMENTS_TRACEABILITY_MATRIX.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-implementation-ledger.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-r5-2-template-editor-only-implementation-run.md`
- `.ai/10_state/current-state.md`

### Gates run

```text
label=phase5-template-editor-template-only exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-template-editor-template-only.log result=2_files_16_tests_passed
label=type-check-template-editor-template-only exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-type-check-template-editor-template-only.log
label=diff-check-template-editor-template-only exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/git-diff-check-template-editor-template-only.log
```

### RTM rows locally advanced / still open

- Local Phase 5 evidence advances R5.2: the template editor's sidebar remains
  template-only and does not receive project-source props or callbacks.
- R4.5, R4.6, remaining R6.2 keyboard parity, and R7.1-R7.2 remain open; no
  save-as-template from project source, browse-route parity for project sources,
  insert RPC/action, RLS harness, or provider proof is claimed.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.

### Remaining Phase 5 boundary

- D-8 remains in force: inserting project-derived content into a template editor
  composition is deferred; v1 uses save-as-template first, then existing template
  composition flows.
- This proof is local/component-level; it does not claim hosted route or provider
  behavior.

## Phase 5 R4.6 browse route divergence proof

### Summary

Phase 5 now has local proof for the route/sidebar divergence contract.
`TemplatesBrowseManager` continues to expose template management and existing
template insert actions while not rendering a `Projects` reusable-source tree or
`Project source preview` region. The estimate-sidebar Templates tab owns
project-source browsing in this slice.

### Changed files

- `tests/vitest/template-gallery.test.tsx`
- `.ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates/13_REQUIREMENTS_TRACEABILITY_MATRIX.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-implementation-ledger.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-r4-6-browse-route-divergence-implementation-run.md`
- `.ai/10_state/current-state.md`

### Gates run

```text
label=phase5-template-browse-route-divergence exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-template-browse-route-divergence.log result=1_file_12_tests_passed
label=type-check-template-browse-route-divergence exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-type-check-template-browse-route-divergence.log
label=diff-check-template-browse-route-divergence exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/git-diff-check-template-browse-route-divergence.log
```

### RTM rows locally advanced / still open

- Local Phase 5 evidence advances R4.6: browse route divergence is explicitly
  tested, with template management retained and project-source surfaces absent.
- R4.4 still owns remaining sidebar search/filter/live metadata completeness;
  R4.5, remaining R6.2 keyboard parity, and R7.1-R7.2 remain open.
- No save-as-template from project source, insert RPC/action, RLS harness, or
  provider proof is claimed.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.

### Remaining Phase 5 boundary

- If project-source browsing is later added to `/workshop/library/templates`,
  this divergence test must be updated in the same slice with route-specific
  management/insert rules and permission proof.
- Current proof is local/component-level only.

## Phase 5 R4.4 source filter chips

### Summary

Phase 5 now includes local source-section filter chips in the estimate-sidebar
Templates tab. When both custom templates and project-derived sources are
present, `All sources`, `Custom templates`, and `Project sources` chips drive the
rendered tree, cascade selection, bulk insertion resolution, preview source
lookup, and expand-all node set. Existing current-project narrowing remains
available when project sources are visible.

### Changed files

- `src/components/workshop/component-library/index.tsx`
- `tests/vitest/component-library-ui.test.tsx`
- `.ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates/13_REQUIREMENTS_TRACEABILITY_MATRIX.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-implementation-ledger.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-r4-4-filter-chips-implementation-run.md`
- `.ai/10_state/current-state.md`

### Gates run

```text
label=phase5-project-source-filter-chips exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-project-source-filter-chips.log result=1_file_53_tests_passed
label=type-check-project-source-filter-chips exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-type-check-project-source-filter-chips.log
label=diff-check-project-source-filter-chips exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/git-diff-check-project-source-filter-chips.log
```

### RTM rows locally advanced / still open

- Local Phase 5 evidence further advances R4.4: the sidebar now has source
  filter chips plus the earlier project-source preview metadata seam.
- R4.4 remains open for server-backed live metadata freshness, richer preview
  row detail, and any future route-level project-source preview/search parity.
- R4.5, remaining R6.2 keyboard parity, and R7.1-R7.2 remain open; no
  save-as-template from project source, insert RPC/action, RLS harness, or
  provider proof is claimed.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.

### Remaining Phase 5 boundary

- The filter chips operate over already-loaded local sidebar sources; they do
  not add server-side source search or provider-backed metadata refresh.
- Project-source insertion remains callback-only until the insert RPC/action and
  RLS proof slices land.

## Phase 5 R6.2 keyboard insert parity proof

### Summary

Phase 5 now has local DOM coverage proving Space-key tree selection plus the
existing bulk add action inserts both custom templates and project-source tab
rows into the selected group target. Together with the earlier project-source
context-menu, drag payload, and bulk resolver seams, this completes R6.2 as a
local UI parity contract.

### Changed files

- `tests/vitest/component-library-ui.test.tsx`
- `.ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates/13_REQUIREMENTS_TRACEABILITY_MATRIX.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-implementation-ledger.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-r6-2-keyboard-insert-implementation-run.md`
- `.ai/10_state/current-state.md`

### Gates run

```text
label=phase5-project-source-keyboard-insert exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-project-source-keyboard-insert.log result=1_file_55_tests_passed
label=type-check-project-source-keyboard-insert exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-type-check-project-source-keyboard-insert.log
label=diff-check-project-source-keyboard-insert exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/git-diff-check-project-source-keyboard-insert.log
```

### RTM rows locally advanced / still open

- Local Phase 5 evidence completes R6.2 as a UI parity contract: custom
  templates and project-source tab/node rows have drag, context-menu, keyboard
  selection, and bulk insertion seams.
- R4.5 and R7.1-R7.2 remain open; no save-as-template from project source,
  insert RPC/action, RLS harness, or provider proof is claimed.
- R4.4 remains open for provider-backed metadata freshness and richer preview
  detail.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.

### Remaining Phase 5 boundary

- Keyboard parity uses existing tree Space-key selection plus the bulk action;
  it does not add a direct row-level insert shortcut.
- Insert execution remains callback-only until R7.2 implements and proves the
  server action/RPC permission path.

## Phase 5 R4.5 project-node save-as-template seam

### Summary

Phase 5 now includes a bounded explicit save-as-template seam for project-derived
group/area sources. Project node context menus expose `Save as template`; the
sidebar then hands the source project id, estimate id, and node id to the
existing `NewTemplateModal` / `createEstimateTemplateFromEstimateNode` path with
`Project Sources` as the default category. Project-derived sources remain
virtual/read-through.

### Changed files

- `src/components/workshop/component-library/index.tsx`
- `src/components/workshop/component-library/tree/TemplatesTree.tsx`
- `tests/vitest/component-library-ui.test.tsx`
- `.ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates/13_REQUIREMENTS_TRACEABILITY_MATRIX.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-implementation-ledger.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-r4-5-project-node-save-template-implementation-run.md`
- `.ai/10_state/current-state.md`

### Gates run

```text
label=phase5-project-source-save-as-template exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-project-source-save-as-template.log result=1_file_56_tests_passed
label=type-check-project-source-save-as-template exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-type-check-project-source-save-as-template.log
label=diff-check-project-source-save-as-template exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/git-diff-check-project-source-save-as-template.log
```

### RTM rows locally advanced / still open

- Local Phase 5 evidence partially advances R4.5 for explicit project group/area
  source save-as-template handoff through the existing modal/action path.
- R4.5 remains open for whole-tab save-as-template wrapping and provider-backed
  action proof.
- R4.4 remains open for provider-backed metadata freshness and richer preview
  detail; R7.1-R7.2 remain open for RLS/provider and insert RPC/action proof.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.

### Remaining Phase 5 boundary

- Project tab sources do not yet offer `Save as template`; wrapping a whole tab's
  roots into one template remains a future R4.5 slice.
- The DOM test mocks `createEstimateTemplateFromEstimateNode`; it proves the
  handoff shape, not live provider execution.

## Phase 5 local consolidation proof

### Summary

Ran a consolidated local verification pass across the Phase 5 reusable-source,
sidebar, template-preservation, route divergence, editor, modal, layout, and
drop-zone tests after the R4/R5/R6 local slices. The pass proves the local
project-source preview/filter/insertion/save-as-template seams and preserved
custom-template flows still work together.

### Changed files

- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-local-consolidation-run.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-implementation-ledger.md`
- `.ai/10_state/current-state.md`

### Gates run

```text
label=phase5-local-consolidation exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-phase5-local-consolidation.log result=8_files_103_tests_passed
label=type-check-phase5-local-consolidation exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-type-check-phase5-local-consolidation.log
label=diff-check-phase5-local-consolidation exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/git-diff-check-phase5-local-consolidation.log
```

### RTM rows locally advanced / still open

- This is consolidation evidence over already-implemented local slices; it does
  not newly close provider/RPC-gated rows.
- R4.4 remains open for server-backed live metadata freshness, richer preview
  row detail, and future route-level project-source preview/search parity.
- R4.5 remains open for whole-tab save-as-template wrapping and live
  provider-backed action proof.
- R7.1-R7.2 remain open for provider/RLS coverage and insert RPC/action proof.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.

### Remaining Phase 5 boundary

- The consolidated suite is local-only Vitest/typecheck/diff proof.
- Remaining work requires a separate provider/RPC/server-action slice and, where
  applicable, hosted/browser/manual evidence before any production readiness
  claim.

## Phase 5 R4.5 project-tab save-as-template seam

### Summary

Phase 5 now includes the local whole-tab save-as-template seam required by R4.5.
Project tab rows expose `Save as template`; the modal runs in `estimate-tab`
mode with a tab-source summary; and the new tab action path wraps copied tab
nodes under one generated template group root. This complements the prior
project group/area source handoff.

### Changed files

- `src/components/workshop/component-library/NewTemplateModal.tsx`
- `src/components/workshop/component-library/index.tsx`
- `src/components/workshop/component-library/tree/TemplatesTree.tsx`
- `src/lib/component-library/actions.ts`
- `tests/vitest/component-library-ui.test.tsx`
- `.ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates/13_REQUIREMENTS_TRACEABILITY_MATRIX.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-implementation-ledger.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-r4-5-project-tab-save-template-implementation-run.md`
- `.ai/10_state/current-state.md`

### Gates run

```text
label=phase5-project-tab-save-as-template exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-project-tab-save-as-template.log result=2_files_62_tests_passed
label=type-check-project-tab-save-as-template exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-type-check-project-tab-save-as-template.log
label=diff-check-project-tab-save-as-template exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/git-diff-check-project-tab-save-as-template.log
```

### RTM rows locally advanced / still open

- Local Phase 5 evidence further advances R4.5 for explicit project group/area
  and whole-tab source save-as-template handoffs.
- R4.5 remains open for live provider-backed action proof.
- R4.4 remains open for provider-backed metadata freshness and richer preview
  detail; R7.1-R7.2 remain open for RLS/provider and insert RPC/action proof.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.

### Remaining Phase 5 boundary

- The DOM test mocks `createEstimateTemplateFromEstimateTab`; it proves the
  handoff shape and rendered flow, not live provider execution.
- The action path relies on the existing `estimate_nodes.estimate_tab_id` column
  while the local generated Supabase types remain stale until the provider-gated
  typegen step.
