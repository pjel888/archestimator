# Pass History

Append one entry per finished pass. Never rewrite or delete older entries.

## Pass 1 - Completed - 2026-06-19T03:21:58Z

- Folder before rename: `03-shared-link-response-recipient-set-null`
- Folder after rename: `1st-Pass-Completed__03-shared-link-response-recipient-set-null`
- Proof boundary: `local-only`
- Verification: `bun run prove:shared-link-response-recipient-set-null` (exit 0), `bun test tests/vitest/project-publication-actions.test.ts` (17 pass), `bunx vitest run tests/vitest/recipient-email-composer.test.tsx --maxWorkers=1` (13 pass), `bun run type-check` (exit 0), `git diff --check` (exit 0)
- Reports updated: `REPORT.md`, `EVIDENCE.md`, `CHECKLIST.md`, `PASS_STATUS.md`, `PATCH_NOTES.md`, `PASS_HISTORY.md`
- Summary: Canonicalized AC-MOD-04 migration and added a local Postgres proof harness; verified response rows survive recipient hard-delete with `recipient_id = NULL`. Provider SQL was not applied.
- Remaining risk: Human DBA must apply migration to project `ebxxqidacheyapmmzavr`, move it into `supabase/migrations/`, and regenerate Supabase types. Rollback to `NOT NULL` requires no NULL `recipient_id` rows.
