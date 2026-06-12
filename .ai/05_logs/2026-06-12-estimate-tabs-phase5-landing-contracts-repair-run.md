# Estimate Tabs Phase 5 — Landing Contract Repair

## Summary

Updated stale public landing tests to the current simplified launch page: hero,
company-proof/workflow section, secondary claim, final CTA, and centered footer.
The tests now assert the current header nav, hero A/B copy, claim-safety state,
Lenis home-only provider scope, and simplified footer. Removed unused CSS for the
old empty company-logo marquee rail. No provider, auth, database, hosted,
production, or manual/browser proof was performed.

## Changed files

- `src/app/globals.css`
- `tests/vitest/landing-amigo-redesign.test.tsx`
- `tests/vitest/landing-company-proof.test.ts`
- `tests/vitest/landing-interactivity.test.tsx`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/10_state/current-state.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-implementation-ledger.md`

## Gates run

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

## Remaining Phase 5 boundary

- Landing hero, company-proof/Lenis, interactivity, footer, public cache, public
  font/LCP, project summary, project dashboard, route import, and workshop
  baseline repair contracts are no longer part of refreshed full-validation
  failures.
- Full `bun run validate` still fails in `test:dom` with 1 failed file / 1
  failed test: `tests/vitest/estimate-sheet-version-control-actions.test.ts`
  expects generated Supabase history RPC types such as
  `archive_estimate_tab_with_history`, but the committed generated type file has
  not been refreshed from the provider/migration boundary.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.
