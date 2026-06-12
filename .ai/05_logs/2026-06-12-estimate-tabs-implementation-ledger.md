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
