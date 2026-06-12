# Estimate Tabs Phase 5 — Security Findings Tooling Contract Repair

## Summary

Updated the Codex security-findings tooling contract to match the current repo
hook architecture. The MCP package pin remains `code-review-graph==2.3.5` in
`.mcp.json`, `.cursor/mcp.json`, and `.codex/config.toml`; `.codex/hooks.json`
now delegates to the pinned `oh-my-codex` native hook rather than carrying direct
`code-review-graph update/status` shell commands. The contract now preserves the
security invariant by forbidding unpinned direct `code-review-graph` hook
commands while asserting the OMX native hook is present.

The touched aggregate test file was 355 pure LOC, so the repair also split it
into focused security contract files plus a shared helper. All split files are
under 250 pure LOC. No runtime app code changed.

## Changed files

- `tests/vitest/security-findings-contracts.test.ts` (deleted oversized aggregate)
- `tests/vitest/security-findings-test-helpers.ts`
- `tests/vitest/security-findings-auth-contracts.test.ts`
- `tests/vitest/security-findings-library-tooling-contracts.test.ts`
- `tests/vitest/security-findings-publication-contracts.test.ts`
- `tests/vitest/security-findings-proof-contracts.test.ts`
- `tests/vitest/security-findings-implementation-contracts.test.ts`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/10_state/current-state.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-implementation-ledger.md`

## Gates run

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

## Remaining Phase 5 boundary

- Security-findings/tooling contracts pass and are no longer part of refreshed
  full-validation failures.
- Full `bun run validate` still fails in `test:dom` with 9 failed files and 19
  failed tests: generated Supabase history RPC type expectations, landing/public
  font/cache contracts, and project dashboard/collaboration/publication
  contracts.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.
