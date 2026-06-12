# Estimate Tabs Phase 5 — Workshop Baseline Validation Repair Run

Date: 2026-06-12 local
Branch: `feat/estimate-tabs-phase5-templates-panel`
Commit target: workshop/reset baseline tests only

## Summary

A full `bun run validate` after the server-action build fix reached the unit test
stage and exposed stale workshop baseline assertions. The current workshop homebase
uses a grid-based greeting icon shell, and `WorkshopPageShell` exposes the beta
feedback affordance as an inline dialog button instead of a route link. The
runtime components already reflected that contract; this run updated the stale
unit/Vitest baseline assertions so local workshop reset proof matches the current
UI.

No runtime/source component code changed in this slice.

## Changed files

- `tests/unit/reset-baseline.test.ts`
- `tests/vitest/workshop-reset.test.tsx`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-workshop-baseline-validation-repair-run.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-implementation-ledger.md`
- `.ai/10_state/current-state.md`

## Gates run

```text
label=validate-after-server-action-type-export-fix exit_code=1 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-validate-after-server-action-type-export-fix.log result=failed_at_stale_reset_baseline_unit_test
label=unit-reset-baseline-after-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-test-reset-baseline-final.log result=2_tests_passed
label=vitest-workshop-reset-after-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-workshop-reset-final.log result=1_file_5_tests_passed
label=type-check-greeting-feedback-baseline-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-type-check-greeting-feedback-baseline-fix.log
label=eslint-greeting-feedback-baseline-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/eslint-greeting-feedback-baseline-fix.log
label=lint-greeting-feedback-baseline-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-lint-greeting-feedback-baseline-fix.log result=0_errors_548_warnings
label=no-excuse-greeting-feedback-baseline-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/no-excuse-greeting-feedback-baseline-fix.log result=no_violations_in_2_files
label=loc-greeting-feedback-baseline-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/loc-greeting-feedback-baseline-fix.log result=reset_baseline_132_loc_workshop_reset_233_loc_warning_band
label=diff-check-greeting-feedback-baseline-fix exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/git-diff-check-workshop-baseline-validation-repair-final.log
label=validate-after-workshop-baseline-fixes exit_code=1 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-validate-after-workshop-baseline-fixes.log result=test_dom_remaining_2_failed_suites_21_failed_tests; unit_stage_passed_9_tests; workshop_reset_not_in_remaining_failures
```

## Fresh full-validation gap

The refreshed `bun run validate` no longer fails on the repaired unit or
`workshop-reset` baselines, but it still fails in `test:dom` with 2 failed suites
and 21 failed tests across unrelated/stale contract areas:

- Missing raw Storybook plan matrix document import from the older 2026-06-06 plan pack.
- Missing legacy `/workshop/templates/error` import after library route consolidation.
- Generated Supabase type contract missing the history RPCs.
- Existing estimate-tree bulk-selection act/content assertion.
- Public landing/Lenis/company proof/font/cache harness contract drift.
- Project dashboard/collaboration/publication summary contract drift.
- Security findings contract expecting pinned code-review-graph hook command text.

Those failures are outside this workshop baseline repair slice and remain as the
current broader validation gap.

## Remaining Phase 5 boundary

- This run repairs local baseline tests only; it does not add provider/RLS proof,
  hosted proof, Vercel deploy, production/manual proof, or browser visual proof.
- `tests/vitest/workshop-reset.test.tsx` is in the TypeScript warning band at
  233 pure LOC. Future additions should split workshop shell and homebase cases
  before growing it further.
