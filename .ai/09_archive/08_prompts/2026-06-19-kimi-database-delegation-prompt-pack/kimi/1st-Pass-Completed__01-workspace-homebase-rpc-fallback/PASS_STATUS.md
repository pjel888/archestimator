# Pass Status

Base folder: `01-workspace-homebase-rpc-fallback`
Current folder before rename: `01-workspace-homebase-rpc-fallback`
Intended folder after rename: `1st-Pass-Completed__01-workspace-homebase-rpc-fallback`
Pass number: `1`
Result: `Completed`
Proof boundary: `local-only`
Reports updated: `REPORT.md`, `EVIDENCE.md`, `CHECKLIST.md`, `PASS_STATUS.md`, `PASS_HISTORY.md`, `PATCH_NOTES.md`
Final verification command(s): `bun test tests/vitest/workshop-homebase-summary-rpc-contract.test.ts` (8 pass, 0 fail); `bun run type-check` (no errors)
Timestamp: `2026-06-19T02:17:00Z`

## Summary

Narrowed the `workspace_homebase_summary` RPC fallback in `src/lib/repositories/workspace-repository.ts` to only allow rollout/schema-cache function-not-found errors (`PGRST202`, `42883`, and matching message phrases). Malformed payloads, auth/RLS failures, unexpected PostgREST errors, and tail-query failures now propagate instead of silently falling back. Added source-contract tests to `tests/vitest/workshop-homebase-summary-rpc-contract.test.ts` proving the guard, rethrow behavior, sanitized logging, and invalid-array-element rejection. Pre-existing unrelated edits in the same file were preserved.

## Remaining risk

Source-contract tests prove the decision logic is present but do not execute a live RPC. A live integration test against a Supabase project with the RPC unavailable would confirm the exact PostgREST error shape and fallback behavior.
