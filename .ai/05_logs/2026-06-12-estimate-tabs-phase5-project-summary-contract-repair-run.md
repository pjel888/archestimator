# Estimate Tabs Phase 5 — Project Summary Contract Repair

## Summary

Updated the project collaboration/publication static contracts to match the
current project layout. `WorkshopPageShell.actions` now mounts
`ProjectPublicationHeader` and `ProjectTeamspaceHeader` directly, with the
publication header receiving `summary`, current-user email, and estimate-sheet
picker data, while the private Teamspaces header continues to own private project
link copy controls. No runtime app code changed.

## Changed files

- `tests/vitest/project-collaboration-summary.test.ts`
- `tests/vitest/project-publication-summary.test.ts`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/10_state/current-state.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-implementation-ledger.md`

## Gates run

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

## Remaining Phase 5 boundary

- Project collaboration/publication summary contracts pass and are no longer
  part of refreshed full-validation failures.
- Full `bun run validate` still fails in `test:dom` with 6 failed files and 15
  failed tests: generated Supabase history RPC type expectations, landing/public
  font/cache/hero/company-proof contracts.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.
