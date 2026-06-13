# 2026-06-12 Estimate Tabs Phase 0 Implementation Run

- Phase: 0 — baseline and citation spot-check
- Branch: feat/estimate-tabs-phase0-baseline
- HEAD: 8cb24974e47c8fd7340fffb1201159763b3b6b0f
- Started: 2026-06-12T09:27:58Z
- Proof boundary: local-only
- Source prompt: .ai/08_prompts/IMPLEMENT-2026-06-12-Projects-Auto-Added-To-Templates.md
- Plan pack: .ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates

## git-fetch-prune

- Command: `git fetch --prune origin`
- Started: 2026-06-12T09:27:58Z
- Ended: 2026-06-12T09:27:59Z
- Exit code: 0
- Verbatim output: `.ai/05_logs/2026-06-12-estimate-tabs-baseline/git-fetch-prune.log`

## git-status

- Command: `git status --short --branch`
- Started: 2026-06-12T09:27:59Z
- Ended: 2026-06-12T09:27:59Z
- Exit code: 0
- Verbatim output: `.ai/05_logs/2026-06-12-estimate-tabs-baseline/git-status.log`

## plan-pack-intact

- Command: `find .ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates -maxdepth 1 -type f -name '*.md' | sort && test $(find .ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates -maxdepth 1 -type f -name '*.md' | wc -l | tr -d ' ') = 17`
- Started: 2026-06-12T09:27:59Z
- Ended: 2026-06-12T09:27:59Z
- Exit code: 0
- Verbatim output: `.ai/05_logs/2026-06-12-estimate-tabs-baseline/plan-pack-intact.log`

## bun-run-type-check

- Command: `bun run type-check`
- Started: 2026-06-12T09:27:59Z
- Ended: 2026-06-12T09:28:02Z
- Exit code: 2
- Verbatim output: `.ai/05_logs/2026-06-12-estimate-tabs-baseline/bun-run-type-check.log`

## bun-run-lint

- Command: `bun run lint`
- Started: 2026-06-12T09:28:02Z
- Ended: 2026-06-12T09:28:02Z
- Exit code: 0
- Verbatim output: `.ai/05_logs/2026-06-12-estimate-tabs-baseline/bun-run-lint.log`

## bun-run-lint-design-system

- Command: `bun run lint:design-system`
- Started: 2026-06-12T09:28:02Z
- Ended: 2026-06-12T09:28:03Z
- Exit code: 0
- Verbatim output: `.ai/05_logs/2026-06-12-estimate-tabs-baseline/bun-run-lint-design-system.log`

## bun-run-lint-design

- Command: `CI=1 npm_config_yes=true bun run lint:design`
- Started: 2026-06-12T09:28:03Z
- Ended: 2026-06-12T09:32:52Z
- Exit code: 143
- Verbatim output: `.ai/05_logs/2026-06-12-estimate-tabs-baseline/bun-run-lint-design.log`

## bun-run-test

- Command: `bun run test`
- Started: 2026-06-12T09:32:52Z
- Ended: 2026-06-12T09:32:52Z
- Exit code: 1
- Verbatim output: `.ai/05_logs/2026-06-12-estimate-tabs-baseline/bun-run-test.log`

## bun-run-test-dom

- Command: `bun run test:dom`
- Started: 2026-06-12T09:32:52Z
- Ended: 2026-06-12T09:32:53Z
- Exit code: 127
- Verbatim output: `.ai/05_logs/2026-06-12-estimate-tabs-baseline/bun-run-test-dom.log`

## bun-run-build

- Command: `bun run build`
- Started: 2026-06-12T09:32:53Z
- Ended: 2026-06-12T09:32:53Z
- Exit code: 127
- Verbatim output: `.ai/05_logs/2026-06-12-estimate-tabs-baseline/bun-run-build.log`

## targeted-estimate-characterization

- Command: `bunx vitest run tests/vitest/estimate-sheet-cost-inputs.test.tsx tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-sheet-tree-dom.test.tsx tests/vitest/estimate-tree-context-menu.test.tsx tests/vitest/estimate-template-drop-zones.test.tsx tests/vitest/estimate-sheet-version-control-ui.test.tsx --maxWorkers=1`
- Started: 2026-06-12T09:32:53Z
- Ended: 2026-06-12T09:32:56Z
- Exit code: 1
- Verbatim output: `.ai/05_logs/2026-06-12-estimate-tabs-baseline/targeted-estimate-characterization.log`

## targeted-perf

- Command: `bunx vitest run tests/vitest/perf --maxWorkers=1`
- Started: 2026-06-12T09:32:56Z
- Ended: 2026-06-12T09:32:57Z
- Exit code: 1
- Verbatim output: `.ai/05_logs/2026-06-12-estimate-tabs-baseline/targeted-perf.log`

## targeted-export-regression

- Command: `bunx vitest run tests/vitest/proposal-workbook.test.ts tests/vitest/proposal-export-model.test.ts tests/vitest/proposal-export-route.test.ts tests/vitest/proposal-export-route-workbook.test.ts --maxWorkers=1`
- Started: 2026-06-12T09:32:57Z
- Ended: 2026-06-12T09:32:59Z
- Exit code: 1
- Verbatim output: `.ai/05_logs/2026-06-12-estimate-tabs-baseline/targeted-export-regression.log`

## optional-notification-rls-harness

- Command: `node scripts/prove-notification-rls-postgres.mjs`
- Started: 2026-06-12T09:32:59Z
- Ended: 2026-06-12T09:32:59Z
- Exit code: 1
- Verbatim output: `.ai/05_logs/2026-06-12-estimate-tabs-baseline/optional-notification-rls-harness.log`

## Summary

- label=bun-run-build
- exit_code=127
- log=.ai/05_logs/2026-06-12-estimate-tabs-baseline/bun-run-build.log
- label=bun-run-lint-design-system
- exit_code=0
- log=.ai/05_logs/2026-06-12-estimate-tabs-baseline/bun-run-lint-design-system.log
- label=bun-run-lint-design
- exit_code=143
- log=.ai/05_logs/2026-06-12-estimate-tabs-baseline/bun-run-lint-design.log
- label=bun-run-lint
- exit_code=0
- log=.ai/05_logs/2026-06-12-estimate-tabs-baseline/bun-run-lint.log
- label=bun-run-test-dom
- exit_code=127
- log=.ai/05_logs/2026-06-12-estimate-tabs-baseline/bun-run-test-dom.log
- label=bun-run-test
- exit_code=1
- log=.ai/05_logs/2026-06-12-estimate-tabs-baseline/bun-run-test.log
- label=bun-run-type-check
- exit_code=2
- log=.ai/05_logs/2026-06-12-estimate-tabs-baseline/bun-run-type-check.log
- label=git-fetch-prune
- exit_code=0
- log=.ai/05_logs/2026-06-12-estimate-tabs-baseline/git-fetch-prune.log
- label=git-status
- exit_code=0
- log=.ai/05_logs/2026-06-12-estimate-tabs-baseline/git-status.log
- label=optional-notification-rls-harness
- exit_code=1
- log=.ai/05_logs/2026-06-12-estimate-tabs-baseline/optional-notification-rls-harness.log
- label=plan-pack-intact
- exit_code=0
- log=.ai/05_logs/2026-06-12-estimate-tabs-baseline/plan-pack-intact.log
- label=targeted-estimate-characterization
- exit_code=1
- log=.ai/05_logs/2026-06-12-estimate-tabs-baseline/targeted-estimate-characterization.log
- label=targeted-export-regression
- exit_code=1
- log=.ai/05_logs/2026-06-12-estimate-tabs-baseline/targeted-export-regression.log
- label=targeted-perf
- exit_code=1
- log=.ai/05_logs/2026-06-12-estimate-tabs-baseline/targeted-perf.log

Ended: 2026-06-12T09:32:59Z

# Phase 0 Baseline Rerun After Dependency Install


## git-status-rerun

- Command: `git status --short --branch`
- Started: 2026-06-12T09:36:36Z
- Ended: 2026-06-12T09:36:36Z
- Exit code: 0
- Timed out: false
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/git-status-rerun.log`

## bun-run-type-check-rerun

- Command: `bun run type-check`
- Started: 2026-06-12T09:36:36Z
- Ended: 2026-06-12T09:36:45Z
- Exit code: 0
- Timed out: false
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/bun-run-type-check-rerun.log`

## bun-run-lint-rerun

- Command: `bun run lint`
- Started: 2026-06-12T09:36:45Z
- Ended: 2026-06-12T09:37:07Z
- Exit code: 1
- Timed out: false
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/bun-run-lint-rerun.log`

## bun-run-lint-design-system-rerun

- Command: `bun run lint:design-system`
- Started: 2026-06-12T09:37:07Z
- Ended: 2026-06-12T09:37:08Z
- Exit code: 0
- Timed out: false
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/bun-run-lint-design-system-rerun.log`

## bun-run-lint-design-rerun

- Command: `printf 'Y\n' | bun run lint:design`
- Started: 2026-06-12T09:37:08Z
- Ended: 2026-06-12T09:37:08Z
- Exit code: 0
- Timed out: false
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/bun-run-lint-design-rerun.log`

## bun-run-test-rerun

- Command: `bun run test`
- Started: 2026-06-12T09:37:08Z
- Ended: 2026-06-12T09:37:08Z
- Exit code: 1
- Timed out: false
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/bun-run-test-rerun.log`

## bun-run-test-dom-rerun

- Command: `bun run test:dom`
- Started: 2026-06-12T09:37:08Z
- Ended: 2026-06-12T09:41:08Z
- Exit code: 1
- Timed out: false
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/bun-run-test-dom-rerun.log`

## bun-run-build-rerun

- Command: `bun run build`
- Started: 2026-06-12T09:41:08Z
- Ended: 2026-06-12T09:41:28Z
- Exit code: 0
- Timed out: false
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/bun-run-build-rerun.log`

## targeted-estimate-characterization-rerun

- Command: `bunx vitest run tests/vitest/estimate-sheet-cost-inputs.test.tsx tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-sheet-tree-dom.test.tsx tests/vitest/estimate-tree-context-menu.test.tsx tests/vitest/estimate-template-drop-zones.test.tsx tests/vitest/estimate-sheet-version-control-ui.test.tsx --maxWorkers=1`
- Started: 2026-06-12T09:41:28Z
- Ended: 2026-06-12T09:41:48Z
- Exit code: 0
- Timed out: false
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/targeted-estimate-characterization-rerun.log`

## targeted-perf-rerun

- Command: `bunx vitest run tests/vitest/perf --maxWorkers=1`
- Started: 2026-06-12T09:41:48Z
- Ended: 2026-06-12T09:41:56Z
- Exit code: 0
- Timed out: false
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/targeted-perf-rerun.log`

## targeted-export-regression-rerun

- Command: `bunx vitest run tests/vitest/proposal-workbook.test.ts tests/vitest/proposal-export-model.test.ts tests/vitest/proposal-export-route.test.ts tests/vitest/proposal-export-route-workbook.test.ts --maxWorkers=1`
- Started: 2026-06-12T09:41:56Z
- Ended: 2026-06-12T09:41:59Z
- Exit code: 0
- Timed out: false
- Verbatim output artifact: `.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/targeted-export-regression-rerun.log`

## Phase 0 rerun command summary

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

# Phase 0 classification closeout

- Dependency setup: `bun install --frozen-lockfile` succeeded with exit code `0`; first-pass missing-dependency failures are superseded by `.ai/05_logs/2026-06-12-estimate-tabs-baseline-rerun/`.
- Rerun pass: type-check, design-system lint, Impeccable design lint, build, targeted estimate characterization, targeted perf, and targeted export regression all passed.
- Rerun baseline debt: `bun run lint` has 3 pre-existing errors, `bun run test` has the reset-baseline failure, and broad `bun run test:dom` has 14 failed files / 24 failed tests plus 2 import-resolution suites before any feature edits.
- Citation spot-check: verifier PASS on five selected current-state audit citations; no drift found.
- Terminology review: §16-17 keep-list and canonical vocabulary reviewed; Phase 1 must not start broad sheet-to-tab rebrand work.
- Correction to prior “Next action” line: classify baseline failures against `.ai/10_state/current-state.md:60-68`, incorporate citation spot-check, then start Phase 1 database foundation.
