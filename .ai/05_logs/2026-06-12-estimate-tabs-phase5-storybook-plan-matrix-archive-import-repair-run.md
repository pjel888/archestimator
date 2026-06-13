# Estimate Tabs Phase 5 — Storybook Plan Matrix Archive Import Repair Run

Date: 2026-06-12 local
Branch: `feat/estimate-tabs-phase5-templates-panel`
Commit target: Storybook matrix raw import paths only

## Summary

The refreshed full validation after route-boundary repair still had one failed
import suite: `src/stories/lib/storybook-plan-matrix.ts` was loading the
2026-06-06 Storybook planning matrices from `.ai/03_plans/...`, but the canonical
files now live under `.ai/09_archive/2026-06-06-ui-component-optimization-componentization/`.
This run repointed both raw Markdown imports to the archived plan pack so the
Storybook documentation dashboard/test can resolve the 809 inventory rows and 703
story rows again.

No runtime app code changed in this slice.

## Changed files

- `src/stories/lib/storybook-plan-matrix.ts`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-storybook-plan-matrix-archive-import-repair-run.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-implementation-ledger.md`
- `.ai/10_state/current-state.md`

## Gates run

```text
label=vitest-storybook-plan-matrix-archive-import-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-storybook-plan-matrix-archive-import-fix.log result=1_file_2_tests_passed
label=eslint-storybook-plan-matrix-archive-import-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/eslint-storybook-plan-matrix-archive-import-fix.log
label=no-excuse-storybook-plan-matrix-archive-import-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/no-excuse-storybook-plan-matrix-archive-import-fix.log result=no_violations_in_2_files
label=loc-storybook-plan-matrix-archive-import-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/loc-storybook-plan-matrix-archive-import-fix.log result=storybook_plan_matrix_73_loc_test_24_loc
label=validate-after-storybook-plan-matrix-archive-import-fix exit_code=1 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-validate-after-storybook-plan-matrix-archive-import-fix.log result=no_failed_suites_21_failed_tests; import_suite_blockers_cleared
```

## Fresh full-validation gap

The refreshed `bun run validate` now has no failed import suites. It passes the
pre-`test:dom` gates and reports 11 failed test files / 21 failed tests in
`test:dom`, all assertion-level stale contracts:

- Generated Supabase history RPC type expectations.
- Existing estimate-tree bulk-selection assertion/act warning.
- Public landing/Lenis/company proof/font/cache harness contract drift.
- Project dashboard/collaboration/publication summary contract drift.
- Security findings contract expecting pinned code-review-graph hook command text.

## Remaining Phase 5 boundary

- This run repairs Storybook raw documentation imports only; it does not add
  provider/RLS proof, hosted proof, Vercel deploy, production/manual proof, or
  browser visual proof.
- Full validation remains blocked by unrelated assertion-level DOM contract
  failures listed above.
