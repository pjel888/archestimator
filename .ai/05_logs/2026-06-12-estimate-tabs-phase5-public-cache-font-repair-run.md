# Estimate Tabs Phase 5 — Public Cache/Font Contract Repair

## Summary

Removed unused public Google font loads from the root app layout and updated the
public cache/font static contracts to the current landing header and SF Pro
system-font baseline. The root layout now only applies the measured
`Roboto_Mono` `next/font` variable used by the Tailwind mono token; stale Inter
and Source Serif variables were removed. The public cache-safety harness now
asserts the current anonymous header CTA (`Book a walkthrough`) and the logged-in
`Workspace` CTA. No provider, auth, or routing behavior changed.

## Changed files

- `src/app/layout.tsx`
- `tests/vitest/public-cache-safety-harness.test.tsx`
- `tests/vitest/public-font-lcp-audit.test.ts`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/10_state/current-state.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-implementation-ledger.md`

## Gates run

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

## Remaining Phase 5 boundary

- Public cache-safety and public font/LCP contracts pass and are no longer part
  of refreshed full-validation failures.
- Full `bun run validate` still fails in `test:dom` with 4 failed files and 12
  failed tests: generated Supabase history RPC type expectations and stale
  landing hero/company-proof/footer contracts.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.
