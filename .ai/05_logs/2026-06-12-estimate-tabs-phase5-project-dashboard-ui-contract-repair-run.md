# Estimate Tabs Phase 5 — Project Dashboard UI Contract Repair

## Summary

Updated stale project-dashboard static UI governance tests to match the current
live project layout. Project-level actions and the estimate metadata strip are
owned by `WorkshopPageShell`; `ProjectMiniSidebar` remains the project-section
navigation and hides itself on estimate-sheet detail routes; the legacy
`ProjectWorkspaceHeaderRow` is no longer mounted by the project layout.

The touched aggregate project-dashboard test file was 286 pure LOC, so the
repair also split it into focused dashboard governance files plus a shared
fixture module. All split files are under 250 pure LOC. No runtime app code
changed.

## Changed files

- `tests/vitest/project-dashboard-ui.test.ts` (deleted oversized aggregate)
- `tests/vitest/project-dashboard-ui-fixtures.ts`
- `tests/vitest/project-dashboard-core-ui.test.ts`
- `tests/vitest/project-dashboard-charts-ui.test.ts`
- `tests/vitest/project-dashboard-route-shell-ui.test.ts`
- `tests/vitest/project-dashboard-center-column-ui.test.ts`
- `tests/vitest/project-dashboard-side-panel-ui.test.ts`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/10_state/current-state.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-implementation-ledger.md`

## Gates run

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

## Remaining Phase 5 boundary

- Project-dashboard static governance contracts pass and are no longer part of
  refreshed full-validation failures.
- Full `bun run validate` still fails in `test:dom` with 8 failed files and 17
  failed tests: generated Supabase history RPC type expectations,
  landing/public font/cache contracts, and project collaboration/publication
  summary contracts.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.
