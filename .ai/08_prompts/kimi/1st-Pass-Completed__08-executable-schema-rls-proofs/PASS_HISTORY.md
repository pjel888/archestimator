# Pass History

Append one entry per finished pass. Never rewrite or delete older entries.

## Pass 1 - Completed - 2026-06-19T03:35:00Z

- Folder before rename: `08-executable-schema-rls-proofs`
- Folder after rename: `1st-Pass-Completed__08-executable-schema-rls-proofs`
- Proof boundary: `local-only`
- Verification: `bun run prove:membership-floor-triggers` passed; `bun test tests/vitest/project-collaboration-schema.test.ts` passed; `bun test tests/vitest/security-findings-library-tooling-contracts.test.ts` passed; `bun run type-check` passed
- Reports updated: `REPORT.md`, `EVIDENCE.md`, `CHECKLIST.md`, `PASS_STATUS.md`, `PASS_HISTORY.md`, `PATCH_NOTES.md`
- Summary: Added executable Postgres proof for workspace/project membership-floor triggers; verified last-owner/admin removal/demotion blocking and allowed non-manager deletion.
- Remaining risk: Local-only proof; only membership-floor slice promoted; minimal harness schema.
