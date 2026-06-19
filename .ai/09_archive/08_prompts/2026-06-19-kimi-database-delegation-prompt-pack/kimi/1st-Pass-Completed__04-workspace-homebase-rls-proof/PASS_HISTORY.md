# Pass History

Append one entry per finished pass. Never rewrite or delete older entries.

## Pass 1 - Completed - 2026-06-19T03:22:00Z

- Folder before rename: `04-workspace-homebase-rls-proof`
- Folder after rename: `1st-Pass-Completed__04-workspace-homebase-rls-proof`
- Proof boundary: `local-only`
- Verification: `bun run prove:workspace-homebase-summary` passed; `bun run type-check` passed
- Reports updated: `REPORT.md`, `EVIDENCE.md`, `CHECKLIST.md`, `PASS_STATUS.md`, `PASS_HISTORY.md`, `PATCH_NOTES.md`
- Summary: Enabled RLS on all tables read by the security-invoker RPC, added minimal faithful read policies, introduced a sheet-only collaborator, and verified project/estimate/node containment. All existing proof scenarios preserved.
- Remaining risk: Local-only proof; harness policies are minimal.
