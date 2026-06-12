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

## Phase 5 R4.4 project-source preview outline

### Summary

Phase 5 now includes local richer preview detail for already-loaded
project-derived sources. The preview panel lists direct children in a source
outline: projects list estimates, estimates list tabs, and tabs list loaded
group/area rows. This builds on the earlier metadata and filter-chip seams
without adding server search or provider refresh behavior.

### Changed files

- `src/components/workshop/component-library/index.tsx`
- `tests/vitest/component-library-ui.test.tsx`
- `.ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates/13_REQUIREMENTS_TRACEABILITY_MATRIX.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-implementation-ledger.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-r4-4-preview-outline-implementation-run.md`
- `.ai/10_state/current-state.md`

### Gates run

```text
label=phase5-project-source-preview-outline exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-project-source-preview-outline.log result=1_file_58_tests_passed
label=type-check-project-source-preview-outline exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-type-check-project-source-preview-outline.log
label=diff-check-project-source-preview-outline exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/git-diff-check-project-source-preview-outline.log
```

### RTM rows locally advanced / still open

- Local Phase 5 evidence further advances R4.4 with an already-loaded source
  outline inside the preview panel.
- R4.4 remains open for server-backed live metadata freshness, server search,
  row-level provider detail beyond loaded outline rows, and future route-level
  project-source preview/search parity.
- R7.1-R7.2 remain open for RLS/provider and insert RPC/action proof.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.

### Remaining Phase 5 boundary

- The outline uses the sidebar's current project-source list only; it does not
  fetch deeper row details or invalidate stale metadata.
- The inherited sidebar/test files remain oversized; no broad refactor was
  performed in this slice.

## Phase 5 R4.4 project-source refresh affordance

### Summary

Phase 5 now includes a local manual freshness affordance for project-derived
sources in the sidebar Templates tab. In estimate/project contexts whose project
sources are loaded from the reusable-source action, `Refresh project sources`
re-runs `listReusableProjectSources`, clears stale project-source preview and
bulk selection state, resets outline loading/errors, and renders the refreshed
project-source tree.

### Changed files

- `src/components/workshop/component-library/index.tsx`
- `tests/vitest/component-library-ui.test.tsx`
- `.ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates/13_REQUIREMENTS_TRACEABILITY_MATRIX.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-implementation-ledger.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-r4-4-refresh-affordance-implementation-run.md`
- `.ai/10_state/current-state.md`

### Gates run

```text
label=phase5-project-source-refresh-affordance-red exit_code=1 timed_out=False result=expected_missing_button_failure
label=phase5-project-source-refresh-affordance-focused exit_code=0 timed_out=False result=1_file_1_test_passed
label=phase5-project-source-refresh-affordance exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-project-source-refresh-affordance.log result=1_file_59_tests_passed
label=type-check-project-source-refresh-affordance exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-type-check-project-source-refresh-affordance.log
label=diff-check-project-source-refresh-affordance exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/git-diff-check-project-source-refresh-affordance.log
```

### RTM rows locally advanced / still open

- Local Phase 5 evidence further advances R4.4 with a user-triggered refresh
  seam for action-loaded project sources.
- R4.4 remains open for server-backed search, route-level project-source
  parity, and row-level provider detail beyond loaded outline rows.
- R7.1-R7.2 remain open for RLS/provider and insert RPC/action proof.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.

### Remaining Phase 5 boundary

- The refresh path reuses the existing read-only list action; it does not add
  polling, provider mutation, server search filters, or deeper row fetches.
- The inherited sidebar/test files remain oversized; no broad refactor was
  performed in this slice.

## Phase 5 R4.4 reusable project-source search action

### Summary

Phase 5 now has a read-only `searchReusableProjectSources(query)` action for
project-derived reusable sources. The action excludes pending-invite projects,
searches project, estimate, tab, and group/area node names, and returns flattened
project-source hits with preview metadata that future sidebar/search UI can use
for reveal-in-tree behavior.

### Changed files

- `src/lib/reusable-sources/actions.ts`
- `tests/vitest/reusable-sources-actions.test.ts`
- `.ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates/13_REQUIREMENTS_TRACEABILITY_MATRIX.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-implementation-ledger.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-r4-4-search-action-implementation-run.md`
- `.ai/10_state/current-state.md`

### Gates run

```text
label=phase5-reusable-project-source-search-action-red exit_code=1 timed_out=False result=expected_missing_export_failure
label=phase5-reusable-project-source-search-action-focused exit_code=0 timed_out=False result=1_file_1_test_passed
label=phase5-reusable-project-source-search-action exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-reusable-project-source-search-action.log result=1_file_3_tests_passed
label=type-check-reusable-project-source-search-action exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-type-check-reusable-project-source-search-action.log
label=diff-check-reusable-project-source-search-action exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/git-diff-check-reusable-project-source-search-action.log
```

### RTM rows locally advanced / still open

- Local Phase 5 evidence further advances R4.4 with the server-action search
  contract for readable project-derived sources.
- R4.4 remains open for debounced sidebar UI integration, reveal-in-tree search
  result affordance, route-level project-source parity, and row-level provider
  detail beyond loaded outline rows.
- R7.1-R7.2 remain open for RLS/provider and insert RPC/action proof.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.

### Remaining Phase 5 boundary

- This search action is read-only and local/mock-proven; it does not prove live
  provider RLS, hosted latency, or production search behavior.
- The inherited sidebar/test files remain oversized; no broad refactor was
  performed in this slice.

## Phase 5 R4.4 project-source search UI

### Summary

Phase 5 now wires the sidebar Templates-tab search to the read-only
`searchReusableProjectSources(query)` action for action-loaded project sources.
The search is debounced, returned hits are merged into the visible project-source
tree, and the existing expanded search view reveals unloaded tab/group/area
matches without a route reload. Current-project narrowing remains honored for
search hits; prop-supplied source lists and the Custom Templates-only filter stay
client-local.

### Changed files

- `src/components/workshop/component-library/index.tsx`
- `src/lib/reusable-sources/actions.ts`
- `tests/vitest/component-library-ui.test.tsx`
- `tests/vitest/reusable-sources-actions.test.ts`
- `.ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates/13_REQUIREMENTS_TRACEABILITY_MATRIX.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-implementation-ledger.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-r4-4-search-ui-implementation-run.md`
- `.ai/10_state/current-state.md`

### Gates run

```text
label=phase5-project-source-search-ui-red exit_code=1 timed_out=False result=expected_missing_action_call_failure
label=phase5-project-source-search-ui-focused exit_code=0 timed_out=False result=1_file_1_test_passed
label=phase5-reusable-project-source-search-ancestor-focused exit_code=0 timed_out=False result=1_file_1_test_passed
label=phase5-project-source-search-ui exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-project-source-search-ui.log result=2_files_63_tests_passed
label=type-check-project-source-search-ui exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-type-check-project-source-search-ui.log
label=diff-check-project-source-search-ui exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/git-diff-check-project-source-search-ui.log
```

### RTM rows locally advanced / still open

- Local Phase 5 evidence further advances R4.4 with debounced sidebar search and
  reveal-in-tree behavior for action-loaded project-derived sources.
- R4.4 remains open for route-level project-source parity and row-level provider
  detail beyond loaded outline/search metadata.
- R7.1-R7.2 remain open for RLS/provider and insert RPC/action proof.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.

### Remaining Phase 5 boundary

- This is local UI/mock proof; it does not prove live provider latency, hosted
  RLS, route-level browse behavior, or production search behavior.
- The inherited sidebar/test files remain oversized; no broad refactor was
  performed in this slice.

## Phase 5 R4.4 template browse project sources

### Summary

Phase 5 now passes readable project/estimate reusable sources into the
`/workshop/library/templates` browse route and renders them as a read-only
`Projects` section in the left template tree. Project-source rows remain virtual
references: they do not expose template management menu actions, do not navigate
to the template editor, and do not mount the sidebar project-source preview dock.

### Changed files

- `src/app/workshop/library/templates/page.tsx`
- `src/components/workshop/library/templates-browse/TemplatesBrowsePageClient.tsx`
- `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx`
- `tests/vitest/template-gallery.test.tsx`
- `.ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates/13_REQUIREMENTS_TRACEABILITY_MATRIX.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-implementation-ledger.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-r4-4-template-browse-project-sources-implementation-run.md`
- `.ai/10_state/current-state.md`

### Gates run

```text
label=phase5-template-browse-project-sources-red exit_code=1 timed_out=False result=expected_missing_projects_section_failure
label=phase5-template-browse-project-sources-focused exit_code=0 timed_out=False result=1_file_1_test_passed
label=phase5-template-browse-project-sources exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-template-browse-project-sources.log result=1_file_12_tests_passed
label=type-check-template-browse-project-sources exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-type-check-template-browse-project-sources.log
label=diff-check-template-browse-project-sources exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/git-diff-check-template-browse-project-sources.log
```

### RTM rows locally advanced / still open

- Local Phase 5 evidence further advances R4.4 with route-level project-source
  tree parity for the template browse route.
- R4.6 is updated from "template-management-only route" to the current boundary:
  the route may show read-only virtual project sources while management/editor
  actions remain template-only.
- R4.4 remains open for row-level provider detail beyond loaded outline/search
  metadata and browse-route lazy tab/node expansion provider proof.
- R7.1-R7.2 remain open for RLS/provider and insert RPC/action proof.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.

### Remaining Phase 5 boundary

- This is local UI/mock proof plus route wiring; it does not prove live provider
  RLS, hosted latency, or production browse-route behavior.
- Project-source rows are deliberately read-only in the browse route.

## Phase 5 R4.4 template browse lazy project outline

### Summary

Phase 5 now includes local route-level lazy expansion for project-derived reusable
sources in `/workshop/library/templates`. Project estimates are read-only folder
rows; expanding one calls the existing access-filtered `getReusableEstimateOutline`
action and merges returned tab/group/area virtual sources into the browse tree.
Project-source rows still do not expose template management, template editor, or
sidebar preview actions.

### Changed files

- `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx`
- `src/components/workshop/library/templates-browse/project-source-browse-tree.tsx`
- `tests/vitest/template-browse-project-sources.test.tsx`
- `.ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates/13_REQUIREMENTS_TRACEABILITY_MATRIX.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-r4-4-template-browse-lazy-project-outline-implementation-run.md`
- `.ai/10_state/current-state.md`

### Gates run

```text
label=phase5-template-browse-lazy-project-outline exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-template-browse-lazy-project-outline.log result=2_files_13_tests_passed
label=type-check-template-browse-lazy-project-outline exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-type-check-template-browse-lazy-project-outline.log
label=diff-check-template-browse-lazy-project-outline exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/git-diff-check-template-browse-lazy-project-outline.log
```

### RTM rows locally advanced / still open

- Local Phase 5 evidence further advances R4.3 with browse-route lazy outline
  consumption and R4.4 with route-level tab/group/area outline display.
- R4.6 remains the same divergence boundary: project sources may be shown and
  lazily expanded, but template management/editor/preview actions are template-only.
- R4.4 remains open for row-level provider detail beyond loaded outline/search
  metadata and live provider freshness proof.
- R7.1-R7.2 remain open for RLS/provider and insert RPC/action proof.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.

### Remaining Phase 5 boundary

- This is local UI/mock proof. It does not prove live provider RLS, hosted
  latency/freshness, production browse-route behavior, or insertion RPC/action execution.
- `project-source-browse-tree.tsx` is a focused extraction but sits in the
  warning band (~215 pure LOC); split it before adding another substantial
  project-source browse behavior.

## Phase 5 R4.4 project source outline metadata

### Summary

Phase 5 project-source outline/search actions now include local row-count and
total-cost metadata for loaded tab and group/area sources. The existing preview
surface already renders these fields, so loaded project-source detail is richer
without provider mutation, polling, or template-table persistence.

The source collectors and subtree summary logic moved into
`src/lib/reusable-sources/source-collectors.ts`, shrinking
`src/lib/reusable-sources/actions.ts` to 188 pure LOC before adding metadata.

### Changed files

- `src/lib/reusable-sources/actions.ts`
- `src/lib/reusable-sources/source-collectors.ts`
- `tests/vitest/reusable-sources-actions.test.ts`
- `.ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates/13_REQUIREMENTS_TRACEABILITY_MATRIX.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-r4-4-project-source-outline-metadata-implementation-run.md`
- `.ai/10_state/current-state.md`

### Gates run

```text
label=phase5-project-source-outline-metadata exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-project-source-outline-metadata.log result=3_files_64_tests_passed
label=type-check-project-source-outline-metadata exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-type-check-project-source-outline-metadata.log
label=diff-check-project-source-outline-metadata exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/git-diff-check-project-source-outline-metadata.log
```

### RTM rows locally advanced / still open

- R4.4 now has local row-count and total-cost metadata for loaded outline/search
  project-source rows.
- `updatedAt` live freshness from provider estimate timestamps remains planned.
- R7.1-R7.2 remain open for RLS/provider and insert RPC/action proof.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.

### Remaining Phase 5 boundary

- This is local action/UI proof against mocked repository data; it does not
  prove hosted provider RLS, latency/freshness, production behavior, or insertion RPC/action execution.
- `tests/vitest/reusable-sources-actions.test.ts` is now in the 200-250 pure LOC
  warning band after exact metadata assertions; split future reusable-source
  action coverage into focused files before adding more cases.

## Phase 5 R4.4 project source updatedAt metadata

### Summary

Phase 5 project-source actions now propagate `estimates.updated_at` through
lightweight estimate-source roots, search results, and lazy outline tab/group/area
sources. The query moved into a focused repository helper while
`workspace-repository.ts` keeps the existing project-access boundary.

### Changed files

- `src/lib/repositories/project-estimate-sheets-repository.ts`
- `src/lib/repositories/workspace-repository.ts`
- `src/lib/reusable-sources/actions.ts`
- `src/lib/reusable-sources/source-collectors.ts`
- `tests/vitest/project-estimate-sheets-repository.test.ts`
- `tests/vitest/reusable-sources-actions.test.ts`
- `.ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates/13_REQUIREMENTS_TRACEABILITY_MATRIX.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-r4-4-project-source-updated-at-metadata-implementation-run.md`
- `.ai/10_state/current-state.md`

### Gates run

```text
label=phase5-project-source-updated-at-metadata exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-project-source-updated-at-metadata.log result=4_files_65_tests_passed
label=type-check-project-source-updated-at-metadata exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-type-check-project-source-updated-at-metadata.log
label=diff-check-project-source-updated-at-metadata exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/git-diff-check-project-source-updated-at-metadata.log
label=eslint-changed-files-project-source-updated-at-metadata exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/eslint-changed-files-project-source-updated-at-metadata.log
label=lint-full-project-source-updated-at-metadata exit_code=1 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-lint-project-source-updated-at-metadata.log result=blocked_by_pre_existing_repo_wide_lint_errors
```

### RTM rows locally advanced / still open

- R4.4 now has local server-backed `updatedAt` metadata propagation for
  project estimate roots, search results, and loaded outline rows.
- R7.1-R7.2 remain open for RLS/provider and insert RPC/action proof.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.

### Remaining Phase 5 boundary

- This is local code/test proof against mocked Supabase/repository data; it does
  not prove linked provider RLS, hosted latency/freshness, production behavior,
  or insertion RPC/action execution.
- `workspace-repository.ts` remains an inherited oversized file (reduced in this
  slice by extracting the lightweight estimate-sheet query); avoid adding query
  logic there without a focused split.
- `tests/vitest/reusable-sources-actions.test.ts` remains in the 200-250 pure LOC
  warning band; split future reusable-source action cases into focused files.

## Phase 5 local lint blockers

### Summary

Cleared the six blocking repo-wide lint errors exposed after the R4.4 updatedAt
metadata slice. Command menu selected-index reset now derives/clamps during
render and resets on query input; templates-panel project-source effect state
updates are scheduled outside the synchronous effect body; Tabs stories now use
real `TabsProps` args instead of `any` casts.

### Changed files

- `src/components/ui/overlays/command-dialog.tsx`
- `src/components/workshop/component-library/index.tsx`
- `src/stories/navigation/tabs.stories.tsx`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-lint-blockers-implementation-run.md`
- `.ai/10_state/current-state.md`

### Gates run

```text
label=eslint-lint-blockers-targeted exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/eslint-lint-blockers-targeted.log
label=lint-lint-blockers exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-lint-lint-blockers.log result=0_errors_548_warnings
label=type-check-lint-blockers exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-type-check-lint-blockers.log
label=vitest-lint-blockers-component-library-ui exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-lint-blockers-component-library-ui.log result=1_file_60_tests_passed
label=diff-check-lint-blockers exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/git-diff-check-lint-blockers.log
```

### Remaining Phase 5 boundary

- Full lint now exits 0 but still reports warnings.
- `src/components/workshop/component-library/index.tsx` remains inherited oversized;
  this slice only removed lint blockers and did not perform a broad split.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.

## Phase 5 build server-action type export fix

### Summary

A fresh `bun run build` after clearing lint blockers failed because
`src/lib/reusable-sources/actions.ts` is a `"use server"` module that re-exported
a type-only `ReusableEstimateSource`. Turbopack generated a server-action runtime
export for that type and failed the production build. Removed the type re-export;
all consumers already import reusable-source types from `src/lib/reusable-sources/types.ts`.

### Changed files

- `src/lib/reusable-sources/actions.ts`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-build-server-action-type-export-fix-run.md`
- `.ai/10_state/current-state.md`

### Gates run

```text
label=build-after-lint-blockers exit_code=1 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-build-after-lint-blockers.log result=failed_server_action_type_export
label=build-after-server-action-type-export-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-build-after-server-action-type-export-fix.log
label=type-check-server-action-type-export-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-type-check-server-action-type-export-fix.log
label=eslint-server-action-type-export-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/eslint-server-action-type-export-fix.log
label=diff-check-server-action-type-export-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/git-diff-check-server-action-type-export-fix.log
```

### Remaining Phase 5 boundary

- Local build now passes after the server-action type-export fix.
- `next-env.d.ts` churn from the build was restored to the tracked dev route-types target.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.

## Phase 5 workshop baseline validation repair

### Summary

Updated stale workshop reset/baseline tests to match the current UI contract: the
homebase greeting uses a grid icon shell with the period label exposed as the SVG
accessible name, and beta feedback opens from an inline dialog trigger button in
`WorkshopPageShell` rather than a route link. No runtime component code changed.

### Changed files

- `tests/unit/reset-baseline.test.ts`
- `tests/vitest/workshop-reset.test.tsx`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-workshop-baseline-validation-repair-run.md`
- `.ai/10_state/current-state.md`

### Gates run

```text
label=validate-after-server-action-type-export-fix exit_code=1 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-validate-after-server-action-type-export-fix.log result=failed_at_stale_reset_baseline_unit_test
label=unit-reset-baseline-final exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-test-reset-baseline-final.log result=2_tests_passed
label=vitest-workshop-reset-final exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-workshop-reset-final.log result=1_file_5_tests_passed
label=type-check-greeting-feedback-baseline-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-type-check-greeting-feedback-baseline-fix.log
label=eslint-greeting-feedback-baseline-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/eslint-greeting-feedback-baseline-fix.log
label=lint-greeting-feedback-baseline-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-lint-greeting-feedback-baseline-fix.log result=0_errors_548_warnings
label=no-excuse-greeting-feedback-baseline-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/no-excuse-greeting-feedback-baseline-fix.log result=no_violations_in_2_files
label=loc-greeting-feedback-baseline-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/loc-greeting-feedback-baseline-fix.log result=reset_baseline_132_loc_workshop_reset_233_loc_warning_band
label=diff-check-greeting-feedback-baseline-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/git-diff-check-workshop-baseline-validation-repair-final.log
label=validate-after-workshop-baseline-fixes exit_code=1 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-validate-after-workshop-baseline-fixes.log result=test_dom_remaining_2_failed_suites_21_failed_tests
```

### Remaining Phase 5 boundary

- The repaired workshop unit/Vitest baselines pass and are not part of the
  refreshed full-validation failures.
- Full `bun run validate` still fails in unrelated `test:dom` contracts: older
  Storybook plan import, legacy `/workshop/templates/error` import, generated
  Supabase history RPC type expectations, estimate-tree bulk-selection,
  landing/public font/cache contracts, project dashboard/collaboration/
  publication contracts, and code-review-graph hook command text.
- `tests/vitest/workshop-reset.test.tsx` is in the 200-250 pure LOC warning band;
  split future additions before growing it further.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.

## Phase 5 route error boundary import repair

### Summary

Updated the route-boundary DOM test to import the current templates error
boundary from `src/app/workshop/library/templates/error.tsx` instead of the
removed legacy `/workshop/templates/error` path. No runtime code changed.

### Changed files

- `tests/vitest/workshop-route-error-boundaries.test.tsx`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-route-error-boundary-import-repair-run.md`
- `.ai/10_state/current-state.md`

### Gates run

```text
label=vitest-workshop-route-error-boundaries-after-library-template-import-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-workshop-route-error-boundaries-after-library-template-import-fix.log result=1_file_5_tests_passed
label=eslint-workshop-route-error-boundaries-library-template-import-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/eslint-workshop-route-error-boundaries-library-template-import-fix.log
label=no-excuse-workshop-route-error-boundaries-library-template-import-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/no-excuse-workshop-route-error-boundaries-library-template-import-fix.log result=no_violations_in_1_file
label=loc-workshop-route-error-boundaries-library-template-import-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/loc-workshop-route-error-boundaries-library-template-import-fix.log result=56_pure_loc
label=validate-after-route-error-boundary-import-fix exit_code=1 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-validate-after-route-error-boundary-import-fix.log result=test_dom_remaining_1_failed_suite_21_failed_tests
```

### Remaining Phase 5 boundary

- The route-boundary suite passes and is no longer part of the refreshed
  full-validation failures.
- Full `bun run validate` still fails in unrelated `test:dom` contracts: older
  Storybook plan matrix imports, generated Supabase history RPC type
  expectations, estimate-tree bulk-selection, landing/public font/cache
  contracts, project dashboard/collaboration/publication contracts, and
  code-review-graph hook command text.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.

## Phase 5 Storybook plan matrix archive import repair

### Summary

Repointed `src/stories/lib/storybook-plan-matrix.ts` raw Markdown imports from
the stale `.ai/03_plans/2026-06-06-ui-component-optimization-componentization/`
path to the archived canonical plan pack at
`.ai/09_archive/2026-06-06-ui-component-optimization-componentization/`. No
runtime app code changed.

### Changed files

- `src/stories/lib/storybook-plan-matrix.ts`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-storybook-plan-matrix-archive-import-repair-run.md`
- `.ai/10_state/current-state.md`

### Gates run

```text
label=vitest-storybook-plan-matrix-archive-import-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-storybook-plan-matrix-archive-import-fix.log result=1_file_2_tests_passed
label=eslint-storybook-plan-matrix-archive-import-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/eslint-storybook-plan-matrix-archive-import-fix.log
label=no-excuse-storybook-plan-matrix-archive-import-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/no-excuse-storybook-plan-matrix-archive-import-fix.log result=no_violations_in_2_files
label=loc-storybook-plan-matrix-archive-import-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/loc-storybook-plan-matrix-archive-import-fix.log result=storybook_plan_matrix_73_loc_test_24_loc
label=validate-after-storybook-plan-matrix-archive-import-fix exit_code=1 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-validate-after-storybook-plan-matrix-archive-import-fix.log result=no_failed_suites_21_failed_tests
```

### Remaining Phase 5 boundary

- Storybook matrix import-suite blockers are cleared.
- Full `bun run validate` still fails in unrelated assertion-level `test:dom`
  contracts: generated Supabase history RPC type expectations, estimate-tree
  bulk-selection, landing/public font/cache contracts, project dashboard/
  collaboration/publication contracts, and code-review-graph hook command text.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.

## Phase 5 estimate tree bulk-selection test repair

### Summary

Repaired the stale estimate-tree bulk-selection DOM test to assert the current
compact bottom-dock contract: the visible dock count is numeric, and the full
"1 node selected" phrase is preserved as the accessible count label. The click
path now uses `userEvent` and waits for the count label, eliminating the React
`act(...)` warning from the focused red run. No runtime component code changed.

### Changed files

- `tests/vitest/estimate-tree-bulk-selection.test.tsx`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-estimate-tree-bulk-selection-test-repair-run.md`
- `.ai/10_state/current-state.md`

### Gates run

```text
label=vitest-estimate-tree-bulk-selection-red exit_code=1 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/2026-06-12-estimate-tree-bulk-selection-focused-red.log result=1_failed_test_stale_visible_text_contract_and_act_warning
label=vitest-estimate-tree-bulk-selection-green exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/2026-06-12-estimate-tree-bulk-selection-focused-green.log result=1_file_4_tests_passed
label=type-check-estimate-tree-bulk-selection exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/2026-06-12-estimate-tree-bulk-selection-type-check.log
label=eslint-estimate-tree-bulk-selection exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/2026-06-12-estimate-tree-bulk-selection-eslint.log
label=no-excuse-estimate-tree-bulk-selection exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/2026-06-12-estimate-tree-bulk-selection-no-excuse.log result=no_violations_in_1_file
label=loc-estimate-tree-bulk-selection exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/2026-06-12-estimate-tree-bulk-selection-loc.log result=155_pure_loc
label=validate-after-estimate-tree-bulk-selection-fix exit_code=1 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-validate-after-estimate-tree-bulk-selection-fix.log result=test_dom_remaining_10_failed_files_20_failed_tests
label=diff-check-estimate-tree-bulk-selection-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/git-diff-check-estimate-tree-bulk-selection-test-repair.log
```

### Remaining Phase 5 boundary

- The estimate-tree bulk-selection suite passes and is no longer part of the
  refreshed full-validation failures.
- Full `bun run validate` still fails in unrelated `test:dom` contracts:
  generated Supabase history RPC type expectations, landing/public font/cache
  contracts, project dashboard/collaboration/publication contracts, and
  code-review-graph hook command text.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.

## Phase 5 security findings tooling contract repair

### Summary

Updated the Codex security-findings tooling contract to match the current OMX
native-hook architecture while preserving the package-pin invariant for direct
`code-review-graph` calls. The edited aggregate test file exceeded the 250 pure
LOC ceiling, so it was split into focused auth, library/tooling, publication,
proof, and implementation contract files plus a shared helper. No runtime app
code changed.

### Changed files

- `tests/vitest/security-findings-contracts.test.ts` (deleted oversized aggregate)
- `tests/vitest/security-findings-test-helpers.ts`
- `tests/vitest/security-findings-auth-contracts.test.ts`
- `tests/vitest/security-findings-library-tooling-contracts.test.ts`
- `tests/vitest/security-findings-publication-contracts.test.ts`
- `tests/vitest/security-findings-proof-contracts.test.ts`
- `tests/vitest/security-findings-implementation-contracts.test.ts`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-security-findings-tooling-contract-repair-run.md`
- `.ai/10_state/current-state.md`

### Gates run

```text
label=vitest-security-findings-contracts-red exit_code=1 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/security-findings-contracts-focused-red.log result=1_failed_test_stale_direct_code_review_graph_hook_expectation
label=loc-security-findings-contracts-pre-split exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/security-findings-contracts-loc.log result=355_pure_loc_oversized
label=vitest-security-findings-contracts-split-green exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/security-findings-contracts-split-green.log result=5_files_23_tests_passed
label=type-check-security-findings-contracts-split exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/security-findings-contracts-split-type-check.log
label=eslint-security-findings-contracts-split exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/security-findings-contracts-split-eslint.log
label=no-excuse-security-findings-contracts-split exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/security-findings-contracts-split-no-excuse.log result=no_violations_in_6_files
label=loc-security-findings-contracts-split exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/security-findings-contracts-split-loc.log result=62_86_101_58_41_27_pure_loc
label=validate-after-security-findings-contracts-fix exit_code=1 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-validate-after-security-findings-contracts-fix.log result=test_dom_remaining_9_failed_files_19_failed_tests
label=diff-check-security-findings-contracts-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/git-diff-check-security-findings-contract-repair.log
```

### Remaining Phase 5 boundary

- Security-findings/tooling contracts pass and are no longer part of refreshed
  full-validation failures.
- Full `bun run validate` still fails in unrelated `test:dom` contracts:
  generated Supabase history RPC type expectations, landing/public font/cache
  contracts, and project dashboard/collaboration/publication contracts.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.

## Phase 5 project dashboard UI contract repair

### Summary

Updated stale project-dashboard static UI governance tests for the current live
layout: project actions and estimate metadata live in `WorkshopPageShell`, the
mini-sidebar is navigation-only and hides on estimate detail routes, and the
project layout no longer mounts `ProjectWorkspaceHeaderRow`. The edited aggregate
file exceeded the 250 pure LOC ceiling, so it was split into focused dashboard
contract files plus a shared fixture module. No runtime app code changed.

### Changed files

- `tests/vitest/project-dashboard-ui.test.ts` (deleted oversized aggregate)
- `tests/vitest/project-dashboard-ui-fixtures.ts`
- `tests/vitest/project-dashboard-core-ui.test.ts`
- `tests/vitest/project-dashboard-charts-ui.test.ts`
- `tests/vitest/project-dashboard-route-shell-ui.test.ts`
- `tests/vitest/project-dashboard-center-column-ui.test.ts`
- `tests/vitest/project-dashboard-side-panel-ui.test.ts`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-project-dashboard-ui-contract-repair-run.md`
- `.ai/10_state/current-state.md`

### Gates run

```text
label=vitest-project-dashboard-ui-red exit_code=1 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/project-dashboard-ui-focused-red.log result=2_failed_tests_stale_project_workspace_header_row_contracts
label=loc-project-dashboard-ui-pre-split exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/project-dashboard-ui-loc-pre-split.log result=286_pure_loc_oversized
label=vitest-project-dashboard-ui-split-green exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/project-dashboard-ui-split-green.log result=5_files_17_tests_passed
label=type-check-project-dashboard-ui-split exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/project-dashboard-ui-split-type-check.log
label=eslint-project-dashboard-ui-split exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/project-dashboard-ui-split-eslint.log
label=no-excuse-project-dashboard-ui-split exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/project-dashboard-ui-split-no-excuse.log result=no_violations_in_6_files
label=loc-project-dashboard-ui-split exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/project-dashboard-ui-split-loc.log result=67_42_79_54_55_33_pure_loc
label=validate-after-project-dashboard-ui-fix exit_code=1 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-validate-after-project-dashboard-ui-fix.log result=test_dom_remaining_8_failed_files_17_failed_tests
label=diff-check-project-dashboard-ui-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/git-diff-check-project-dashboard-ui-contract-repair.log
```

### Remaining Phase 5 boundary

- Project-dashboard static governance contracts pass and are no longer part of
  refreshed full-validation failures.
- Full `bun run validate` still fails in unrelated `test:dom` contracts:
  generated Supabase history RPC type expectations, landing/public font/cache
  contracts, and project collaboration/publication summary contracts.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.


## Phase 5 project summary contract repair

### Summary

Updated stale project collaboration/publication static contracts for the current
layout: `WorkshopPageShell.actions` mounts the shared-link publication header and
private Teamspaces header directly. No runtime app code changed.

### Changed files

- `tests/vitest/project-collaboration-summary.test.ts`
- `tests/vitest/project-publication-summary.test.ts`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-project-summary-contract-repair-run.md`
- `.ai/10_state/current-state.md`

### Gates run

```text
label=vitest-project-summary-red exit_code=1 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/project-summary-focused-red.log result=2_failed_tests_stale_ProjectWorkspaceHeaderRow_prop_contracts
label=vitest-project-summary-green exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/project-summary-focused-green.log result=2_files_2_tests_passed
label=type-check-project-summary exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/project-summary-type-check.log
label=eslint-project-summary exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/project-summary-eslint.log
label=no-excuse-project-summary exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/project-summary-no-excuse.log result=no_violations_in_2_files
label=loc-project-summary-pre-repair exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/project-summary-loc-pre-repair.log result=22_17_pure_loc
label=loc-project-summary exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/project-summary-loc.log result=23_21_pure_loc
label=validate-after-project-summary-fix exit_code=1 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-validate-after-project-summary-fix.log result=test_dom_remaining_6_failed_files_15_failed_tests
label=diff-check-project-summary-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/git-diff-check-project-summary-contract-repair.log
```

### Remaining Phase 5 boundary

- Project collaboration/publication summary contracts pass and are no longer
  part of refreshed full-validation failures.
- Full `bun run validate` still fails in unrelated `test:dom` contracts:
  generated Supabase history RPC type expectations and landing/public
  font/cache/hero/company-proof contracts.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.


## Phase 5 public cache/font contract repair

### Summary

Removed unused Inter/Source Serif public font loads from the root app layout and
updated public cache/font static contracts to the current landing header CTA and
SF Pro system-font baseline. The root layout still applies the measured
`Roboto_Mono` `next/font` variable used by the mono token. No provider, auth, or
routing behavior changed.

### Changed files

- `src/app/layout.tsx`
- `tests/vitest/public-cache-safety-harness.test.tsx`
- `tests/vitest/public-font-lcp-audit.test.ts`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-public-cache-font-repair-run.md`
- `.ai/10_state/current-state.md`

### Gates run

```text
label=vitest-public-cache-font-red exit_code=1 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/public-cache-font-focused-red.log result=3_failed_tests_stale_header_cta_and_font_contracts
label=vitest-public-cache-font-green exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/public-cache-font-focused-green.log result=2_files_7_tests_passed
label=type-check-public-cache-font exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/public-cache-font-type-check.log
label=eslint-public-cache-font exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/public-cache-font-eslint.log
label=no-excuse-public-cache-font exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/public-cache-font-no-excuse.log result=no_violations_in_3_files
label=loc-public-cache-font-pre-repair exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/landing-public-loc-pre-repair.log result=77_137_122_218_28_pure_loc_for_remaining_landing_public_files
label=loc-public-cache-font exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/public-cache-font-loc.log result=29_119_29_pure_loc
label=build-public-cache-font exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/public-cache-font-build.log result=next_build_passed_next_env_route_type_churn_restored
label=validate-after-public-cache-font-fix exit_code=1 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-validate-after-public-cache-font-fix.log result=test_dom_remaining_4_failed_files_12_failed_tests
label=diff-check-public-cache-font-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/git-diff-check-public-cache-font-repair.log
```

### Remaining Phase 5 boundary

- Public cache-safety and public font/LCP contracts pass and are no longer part
  of refreshed full-validation failures.
- Full `bun run validate` still fails in unrelated `test:dom` contracts:
  generated Supabase history RPC type expectations and stale landing
  hero/company-proof/footer contracts.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.


## Phase 5 landing contract repair

### Summary

Updated stale landing contract tests for the current simplified public landing
flow: hero, company-proof/workflow section, secondary claim, final CTA, and
centered footer. Removed unused CSS for the retired empty company-logo marquee
rail. The landing-focused suite now passes, and full validation is down to the
provider/typegen-gated Supabase history RPC generated-types contract.

### Changed files

- `src/app/globals.css`
- `tests/vitest/landing-amigo-redesign.test.tsx`
- `tests/vitest/landing-company-proof.test.ts`
- `tests/vitest/landing-interactivity.test.tsx`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-landing-contracts-repair-run.md`
- `.ai/10_state/current-state.md`

### Gates run

```text
label=vitest-landing-contracts-red exit_code=1 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/landing-contracts-focused-red.log result=3_files_11_failed_tests_stale_landing_contracts
label=vitest-landing-contracts-green exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/landing-contracts-focused-green.log result=3_files_17_tests_passed
label=type-check-landing-contracts exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/landing-contracts-type-check.log
label=eslint-landing-contracts exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/landing-contracts-eslint.log
label=no-excuse-landing-contracts exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/landing-contracts-no-excuse.log result=no_violations_in_3_files
label=loc-landing-contracts exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/landing-contracts-loc.log result=135_80_208_664_pure_loc_globals_inherited_oversized_decreased
label=design-system-landing-contracts exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/landing-contracts-design-system.log
label=design-landing-contracts exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/landing-contracts-design.log
label=build-landing-contracts exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/landing-contracts-build.log result=next_build_passed_next_env_route_type_churn_restored
label=validate-after-landing-contracts-fix exit_code=1 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-validate-after-landing-contracts-fix.log result=test_dom_remaining_1_failed_file_1_failed_test_supabase_history_rpc_generated_type_gap
label=diff-check-landing-contracts-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/git-diff-check-landing-contracts-repair.log
```

### Remaining Phase 5 boundary

- Landing contracts pass and are no longer part of refreshed full-validation
  failures.
- Full `bun run validate` still fails only in the generated Supabase history RPC
  type contract (`estimate-sheet-version-control-actions.test.ts`), which is
  provider/typegen-gated and not repaired by this local landing slice.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.

## Phase 5 Supabase generated types boundary probe

### Summary

Fresh focused validation confirms the only remaining local `bun run validate`
failure is the generated Supabase type contract for the estimate-tab history
RPCs. The migration defines the table, `estimate_tab_id` columns, grants, and
all six RPCs, but `src/lib/supabase/types.ts` has not been regenerated and still
lacks those entries. Local Docker is unavailable, and a follow-up temp Homebrew Postgres probe
proved that `supabase gen types --db-url` still fails on Docker image
inspection in this installed CLI. The Homebrew Postgres schema/RLS harness
passes, so the migration itself is locally proven; only generated type emission
remains Docker/provider-gated. Linked apply/typegen remains an explicit provider
boundary and was not executed.

### Changed files

- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/supabase-history-rpc-types-focused-red.log`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/supabase-history-rpc-types-boundary-probe.log`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/estimate-tabs-local-postgres-proof-rerun.log`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/estimate-tabs-local-dburl-typegen-probe.log`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/supabase-history-rpc-types-focused-post-dburl-probe-red.log`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-supabase-generated-types-boundary-run.md`
- `.ai/10_state/current-state.md`

### Gates run

```text
label=vitest-supabase-history-rpc-types-focused-red exit_code=1 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/supabase-history-rpc-types-focused-red.log result=1_failed_test_missing_generated_archive_estimate_tab_with_history_entry
label=supabase-history-rpc-types-boundary-probe exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/supabase-history-rpc-types-boundary-probe.log result=6_missing_estimate_tab_rpc_generated_entries_local_docker_unavailable_for_local_typegen
label=estimate-tabs-local-postgres-proof-rerun exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/estimate-tabs-local-postgres-proof-rerun.log result=local_homebrew_postgres_migration_rls_proof_passed
label=estimate-tabs-local-dburl-typegen-probe exit_code=2 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/estimate-tabs-local-dburl-typegen-probe.log result=supabase_gen_types_db_url_connects_then_fails_on_docker_image_inspection
label=vitest-supabase-history-rpc-types-post-dburl-probe-red exit_code=1 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/supabase-history-rpc-types-focused-post-dburl-probe-red.log result=1_failed_test_missing_generated_archive_estimate_tab_with_history_entry
```

### Remaining Phase 5 boundary

- Missing generated entries: `archive_estimate_tab_with_history`,
  `create_estimate_tab_with_history`, `delete_estimate_tab_with_history`,
  `duplicate_estimate_tab_with_history`, `rename_estimate_tab_with_history`, and
  `reorder_estimate_tabs_with_history`.
- Safe next proof path is owner-approved linked Supabase migration apply plus
  linked type generation, or a working Docker-backed Supabase typegen
  environment. Hand-editing `src/lib/supabase/types.ts` was rejected
  because it would weaken the generated/provider-proof boundary.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.

## Phase 7 R10.4 publication snapshot tabs

### Summary

Implemented local R10.4 publication snapshot v1.2 support. Publication actions now read active estimate tabs with nodes/rows, snapshot DTOs carry nested tab rows/tree nodes/totals while retaining estimate-level compatibility fields, and the public share page renders a nested estimate-tab strip only when a snapshot contains multiple tabs. Legacy snapshots without `tabs` continue through the old estimate-level rendering path.

### Changed files

- `src/lib/publication/types.ts`
- `src/lib/publication/snapshot.ts`
- `src/lib/publication/actions.ts`
- `src/components/share/SharePageTabs.tsx`
- `tests/vitest/project-publication-snapshot.test.ts`
- `tests/vitest/project-publication-page.test.tsx`
- `tests/vitest/project-publication-actions.test.ts`
- `.ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates/13_REQUIREMENTS_TRACEABILITY_MATRIX.md`
- `.ai/05_logs/2026-06-13-estimate-tabs-r10-4-publication-tabs-snapshot-run.md`
- `.ai/10_state/current-state.md`

### Gates run

```text
label=vitest-publication-r10-4-focused-red exit_code=1 result=legacy row shape drift and duplicate UI label assertions found before fix
label=vitest-publication-r10-4-focused-green exit_code=0 command="bun x vitest run tests/vitest/project-publication-snapshot.test.ts tests/vitest/project-publication-page.test.tsx tests/vitest/project-publication-actions.test.ts --maxWorkers=1" result="3 files / 48 tests passed"
label=type-check-r10-4 exit_code=0 command="bun run type-check"
label=eslint-r10-4-focused-final exit_code=0 command="bunx eslint src/lib/publication/types.ts src/lib/publication/snapshot.ts src/lib/publication/actions.ts src/components/share/SharePageTabs.tsx tests/vitest/project-publication-snapshot.test.ts tests/vitest/project-publication-page.test.tsx tests/vitest/project-publication-actions.test.ts" result="0 errors / 0 warnings"
label=design-system-r10-4 exit_code=0 command="bun run lint:design-system"
label=design-r10-4 exit_code=0 command="bun run lint:design"
label=build-r10-4 exit_code=0 command="bun run build" result="Next.js 16.2.6 build passed; next-env.d.ts churn restored"
label=diff-check-r10-4 exit_code=0 command="git diff --check"
```

### Remaining boundary

- R10.4 is implemented locally only. Hosted shared-link proof with a real tabbed publication, linked Supabase apply/typegen, production deploy, and browser/manual proof remain open.
- Merge-to-main remains blocked by other planned/open matrix rows and external proof gates.

## Phase 1/7 R10.5 dormant version guard proof

### Summary

Confirmed R10.5 was already implemented by the Phase 1 migration guard and schema test. The migration keeps the dormant named-version v2 stack dormant and documents that a future v3 must carry `tabs[]` plus per-node `estimateTabId` before the feature is awakened. No app-visible version feature was enabled.

### Gates run

```text
label=vitest-r10-5-schema-guard exit_code=0 command="bun x vitest run tests/vitest/estimate-tabs-schema.test.ts --maxWorkers=1" result="1 file / 7 tests passed"
label=diff-check-r10-5 exit_code=0 command="git diff --check"
```

### Remaining boundary

- The named-version feature remains deferred by design.
- Linked Supabase apply/typegen/provider proof, hosted/manual proof, and production deploy remain unperformed.

## Phase 7 R10.1-R10.2 activity tab attribution

### Summary

Implemented local TypeScript/UI support for tab-attributed activity history. `fetchEstimateSheetVersionControl` now selects and normalizes `estimate_tab_id`, `EstimateActivityInput` and the activity composer can target tab lifecycle events, Activity History exposes tab lifecycle filters and accessibility labels, and public-safe copy sanitizes the new `tab_*` technical tokens.

### Gates run

```text
label=vitest-activity-tabs-focused-red exit_code=1 result="missing tab_* sanitizer entries"
label=vitest-activity-tabs-focused-green exit_code=0 command="bun x vitest run tests/vitest/activity-composer.test.ts tests/vitest/activity-copy-regression.test.ts tests/vitest/activity-view-model.test.ts tests/vitest/activity-security.test.ts tests/vitest/estimate-sheet-version-control-actions.test.ts tests/vitest/estimate-sheet-version-control-ui.test.tsx tests/vitest/estimate-sheet-activity-history-ui.test.tsx --maxWorkers=1" result="7 files / 177 tests passed"
label=type-check-r10-1-r10-2 exit_code=0 command="bun run type-check"
label=eslint-r10-1-r10-2-focused exit_code=0 command="bunx eslint src/lib/activity/activity-formatters.ts src/lib/activity/activity-composer.ts src/lib/activity/types.ts src/lib/estimates/actions.ts src/components/workshop/estimate-sheet/activity-history.tsx tests/vitest/fixtures/activity-events.ts tests/vitest/estimate-sheet-version-control-actions.test.ts tests/vitest/estimate-sheet-version-control-ui.test.tsx"
label=design-system-r10-1-r10-2 exit_code=0 command="bun run lint:design-system"
label=design-r10-1-r10-2 exit_code=0 command="bun run lint:design"
label=build-r10-1-r10-2 exit_code=0 command="bun run build" result="next-env.d.ts churn restored"
label=diff-check-r10-1-r10-2 exit_code=0 command="git diff --check"
```

### Remaining boundary

- R10.1-R10.2 are locally implemented only. Linked Supabase apply/typegen/provider proof, live tab lifecycle Activity History proof, hosted/manual two-browser proof, and production deploy remain open.

## Phase 5 R9.3 / R13.1-R13.3 local proof and a11y hardening

### Summary

Closed the remaining local-only proof rows for invite/share deep-link preservation,
perf guards, lazy reusable-source browsing, and tab-strip accessibility. Reusable
project source listing is now root-first and lazy across both the sidebar and
browse route: project expansion loads one project's estimate list, and estimate
expansion loads the tab/node outline. `EstimateTabStrip` now exposes a polite
live region and gated delete/archive focus fallback while preserving the hidden
lifecycle gate in the live editor.

### Gates run

```text
label=vitest-r13-2-lazy-source-focused exit_code=0 command="bun x vitest run tests/vitest/reusable-sources-actions.test.ts tests/vitest/template-browse-project-sources.test.tsx tests/vitest/component-library-ui.test.tsx --maxWorkers=1" result="3 files / 67 tests passed"
label=vitest-r13-1-perf exit_code=0 command="bun x vitest run tests/vitest/perf --maxWorkers=1" result="4 files / 14 tests passed"
label=vitest-r9-3-invite-share-focused exit_code=0 command="bun x vitest run tests/vitest/project-invite-entry-route.test.ts tests/vitest/workshop-pending-invite.test.tsx tests/vitest/project-publication-email-links.test.ts tests/vitest/share/share-page-get-routes-contract.test.ts tests/vitest/project-publication-actions.test.ts --maxWorkers=1" result="5 files / 40 tests passed"
label=vitest-r13-3-tabstrip-a11y exit_code=0 command="bun x vitest run tests/vitest/estimate-tab-strip.test.tsx --maxWorkers=1" result="1 file / 8 tests passed"
label=type-check-r9-3-r13-proof exit_code=0 command="bun run type-check"

label=vitest-r9-3-r13-post-doc-focused exit_code=0 command="bun x vitest run tests/vitest/reusable-sources-actions.test.ts tests/vitest/template-browse-project-sources.test.tsx tests/vitest/component-library-ui.test.tsx tests/vitest/estimate-tab-strip.test.tsx tests/vitest/project-invite-entry-route.test.ts tests/vitest/workshop-pending-invite.test.tsx tests/vitest/project-publication-email-links.test.ts tests/vitest/share/share-page-get-routes-contract.test.ts tests/vitest/project-publication-actions.test.ts tests/vitest/perf --maxWorkers=1" result="13 files / 129 tests passed"
label=eslint-r9-3-r13-focused exit_code=0 command="bunx eslint src/lib/reusable-sources/actions.ts src/components/workshop/library/templates-browse/project-source-browse-tree.tsx src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx src/components/workshop/component-library/tree/TemplatesTree.tsx src/components/workshop/component-library/index.tsx src/components/workshop/estimate-sheet/EstimateTabStrip.tsx tests/vitest/reusable-sources-actions.test.ts tests/vitest/template-browse-project-sources.test.tsx tests/vitest/component-library-ui.test.tsx tests/vitest/estimate-tab-strip.test.tsx" result="0 errors / 0 warnings"
label=type-check-r9-3-r13-post-doc exit_code=0 command="bun run type-check"
label=design-system-r9-3-r13 exit_code=0 command="bun run lint:design-system"
label=design-r9-3-r13 exit_code=0 command="bun run lint:design"
label=build-r9-3-r13 exit_code=0 command="bun run build" result="Next.js 16.2.6 build passed; next-env.d.ts churn restored"
label=diff-check-r9-3-r13 exit_code=0 command="git diff --check"
```

### Remaining boundary

- Rows R9.3 and R13.1-R13.3 are implemented/proven locally only.
- Hosted invite/share e2e, live DB p95/provider scale proof, browser/Storybook
  a11y proof, linked Supabase apply/typegen, Vercel deploy, production deploy,
  and two-browser/manual QA remain unperformed.

## Phase 8 R3 compatibility comments and cleanup-gate governance

### Summary

Added local governance coverage for retained legacy `sheet` names. The code now
marks the key kept seams with plan-linked compatibility comments, and the domain
source-contract suite guards both those markers and the Phase 8 cleanup/deletion
criteria from the plan pack.

### Gates run

```text
label=vitest-r3-compat-governance exit_code=0 command="bun x vitest run tests/vitest/estimate-tabs-domain.test.ts --maxWorkers=1" result="1 file / 6 tests passed"
label=type-check-r3-compat-governance exit_code=0 command="bun run type-check"
label=vitest-r3-compat-governance-post-doc exit_code=0 command="bun x vitest run tests/vitest/estimate-tabs-domain.test.ts --maxWorkers=1" result="1 file / 6 tests passed"
label=eslint-r3-compat-governance exit_code=0 command="bunx eslint src/hooks/use-estimate-query.ts src/lib/estimates/actions.ts src/components/workshop/EstimateSheetContent.tsx tests/vitest/estimate-tabs-domain.test.ts" result="0 errors / 0 warnings"
label=type-check-r3-compat-governance-post-doc exit_code=0 command="bun run type-check"
label=diff-check-r3-compat-governance exit_code=0 command="git diff --check"
```

### Remaining boundary

- No compatibility shim deletion or internal rename batch was performed.
- Shim deletion remains deferred until grep gates, provider/manual proof,
  beta-release evidence, contract-test updates, and owner/reviewer approval are
  all present.


## Phase 5 R4.4-R4.5 template-source status refresh

### Summary

Refreshed the remaining Phase 5 template-source matrix rows that still used the
status word `planned` after local implementation was already present. R4.4 is
local-only implemented for search/filter/preview metadata, refresh affordance,
browse-route Projects source tree, and reusable-source server-backed search.
R4.5 is local-only implemented for explicit project-node and whole-tab
save-as-template handoffs.

### Gates run

```text
label=vitest-r4-template-source-local-proof-refresh exit_code=0 command="bun x vitest run tests/vitest/reusable-sources-actions.test.ts tests/vitest/component-library-ui.test.tsx tests/vitest/template-browse-project-sources.test.tsx tests/vitest/library-overview.test.tsx --maxWorkers=1" result="4 files / 77 tests passed"
```

### Remaining boundary

- R4.4-R4.5 are implemented/proven locally only.
- Linked/hosted provider freshness proof, provider-backed action proof, linked
  Supabase apply/typegen, hosted browser proof, Vercel deploy, production
  deploy, and manual QA remain unperformed.

## Phase 4 R2.4 delegated owner/product review copy alignment

### Summary

Closed the R2.4 owner/product review gate under the active 2026-06-13 delegated authority. Public product/workspace copy now uses estimates and tabs outside actual Excel/spreadsheet contexts. Excel quote-sheet import wording and spreadsheet/document handoff wording remain because they describe external files.

### Gates run

```text
label=vitest-r2-4-owner-review-copy-red exit_code=1 command="bun x vitest run tests/vitest/closed-beta-pricing-copy.test.ts --maxWorkers=1" result="new source-text contract failed before copy alignment"
label=vitest-r2-4-owner-review-copy-green exit_code=0 command="bun x vitest run tests/vitest/closed-beta-pricing-copy.test.ts --maxWorkers=1" result="1 file / 3 tests passed"
label=rg-r2-4-public-copy-residue exit_code=0 command="rg -n 'structured quote sheets|multi-sheet estimates|multiple quote sheets|version-labeled sheets|quote sheets|structured sheet|same sheet|cost sheets|quote sheet' src/app/features src/app/pricing src/app/about src/components/landing tests/vitest/closed-beta-pricing-copy.test.ts" result="only test assertions and allowed FAQ 'Excel quote sheets' remain"
```

### Remaining boundary

- R2.4 is locally implemented/reviewed. Hosted browser proof, Vercel deploy, production proof, and analytics/conversion impact proof were not performed.

## Phase 6 R8.5 preview scope-chip hardening

### Summary

Closed the remaining local R8.5 hardening follow-up. Multi-tab proposal export previews now default to the all-tabs workbook route, show explicit All tabs / active-tab scope chips, switch to `?tab={tabId}` only when the active-tab chip is selected, and keep the preview copy aligned with per-tab consolidation.

### Gates run

```text
label=vitest-r8-5-preview-scope-red exit_code=1 command="bun x vitest run tests/vitest/proposal-export-preview.test.tsx --maxWorkers=1" result="new scope-chip/default-all-tabs assertions failed before implementation"
label=vitest-r8-5-preview-scope-green exit_code=0 command="bun x vitest run tests/vitest/proposal-export-preview.test.tsx --maxWorkers=1" result="1 file / 3 tests passed"
label=vitest-r8-5-export-regression exit_code=0 command="bun x vitest run tests/vitest/proposal-export-preview.test.tsx tests/vitest/proposal-export-route.test.ts tests/vitest/proposal-export-route-workbook.test.ts tests/vitest/proposal-workbook.test.ts tests/vitest/proposal-export-model.test.ts --maxWorkers=1" result="5 files / 25 tests passed"
label=eslint-r8-5-preview-scope exit_code=0 command="bunx eslint src/components/workshop/EstimateSheetContent.tsx src/components/workshop/ProposalExportPreviewDialog.tsx tests/vitest/proposal-export-preview.test.tsx" result="0 errors / 0 warnings"
label=type-check-r8-5-preview-scope exit_code=0 command="bun run type-check" result="tsc --noEmit passed"
label=diff-check-r8-5-preview-scope exit_code=0 command="git diff --check" result="no whitespace errors"
```

### Remaining boundary

- R8.5 is implemented/proven locally only. Hosted browser proof, spreadsheet-app manual inspection, Vercel deploy, production deploy, and linked provider proof remain unperformed.
