# Pass History

Append one entry per finished pass. Never rewrite or delete older entries.

## Pass 1 - Completed - 2026-06-19T02:17:00Z

- Folder before rename: `01-workspace-homebase-rpc-fallback`
- Folder after rename: `1st-Pass-Completed__01-workspace-homebase-rpc-fallback`
- Proof boundary: `local-only`
- Verification: `bun test tests/vitest/workshop-homebase-summary-rpc-contract.test.ts` (8 pass, 0 fail); `bun run type-check` (no errors)
- Reports updated: `REPORT.md`, `EVIDENCE.md`, `CHECKLIST.md`, `PASS_STATUS.md`, `PASS_HISTORY.md`, `PATCH_NOTES.md`
- Summary: Narrowed `workspace_homebase_summary` RPC fallback to rollout/schema-cache function-not-found errors only; added source-contract tests; preserved unrelated pending edits in the same file.
- Remaining risk: Source-contract tests do not execute a live RPC; a live integration test would confirm exact PostgREST error shape and fallback behavior.
