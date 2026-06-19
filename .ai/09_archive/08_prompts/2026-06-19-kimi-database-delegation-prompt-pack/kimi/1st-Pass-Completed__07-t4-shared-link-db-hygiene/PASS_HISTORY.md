# Pass History

Append one entry per finished pass. Never rewrite or delete older entries.

## Pass 1 - Completed - 2026-06-19T03:38:38Z

- Folder before rename: `07-t4-shared-link-db-hygiene`
- Folder after rename: `1st-Pass-Completed__07-t4-shared-link-db-hygiene`
- Proof boundary: `local-only`
- Verification: `bun run prove:t4-shared-link-db-hygiene` (exit 0), `bun run type-check` (exit 0), `git diff --check` (exit 0)
- Reports updated: `REPORT.md`, `EVIDENCE.md`, `CHECKLIST.md`, `PASS_STATUS.md`, `PATCH_NOTES.md`, `PASS_HISTORY.md`
- Summary: Split T4 into seven independent SQL units + execution-order runbook; each unit has preflight/post-check/rollback. Verified via local Postgres proof harness. Provider SQL not applied.
- Remaining risk: Human DBA must apply units in order to project `ebxxqidacheyapmmzavr`; P1/P7 require `pg_cron` confirmation; P2 requires zero-scan preflight; type regen may be needed after apply.
