# Pass Status

Base folder: `07-t4-shared-link-db-hygiene`
Current folder before rename: `07-t4-shared-link-db-hygiene`
Intended folder after rename: `1st-Pass-Completed__07-t4-shared-link-db-hygiene`
Pass number: `1`
Result: `Completed`
Proof boundary: `local-only`
Reports updated: `REPORT.md`, `EVIDENCE.md`, `CHECKLIST.md`, `PASS_HISTORY.md`, `PATCH_NOTES.md`
Final verification command(s): `bun run prove:t4-shared-link-db-hygiene` (exit 0), `bun run type-check` (exit 0), `git diff --check` (exit 0)
Timestamp: `2026-06-19T03:38:38Z`

## Summary

Split the monolithic T4 shared-link DB hygiene pack into seven independent, reviewable SQL units plus an execution-order runbook. Each unit has preflight, post-check, and rollback. `pg_cron` schedules are commented out and provider-gated; P2 index drops are gated on a zero-scan preflight and placed last. A local Postgres proof harness verifies every unit. Provider SQL was not applied.

## Remaining risk

- Human DBA must apply units one-by-one to project `ebxxqidacheyapmmzavr` in the documented order.
- P1/P7 require `pg_cron` enablement and target confirmation before uncommenting schedules.
- P2 requires a production zero-scan preflight before dropping redundant token-hash indexes.
- Supabase generated types may need refresh after provider apply.
