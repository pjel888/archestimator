# Patch Notes: One Published Publication Per Project

Create or update this file if Kimi changes source, tests, scripts, migrations, or docs.

## Changed files

- `tests/vitest/project-publication-one-published-index.test.ts`: new static contract test asserting AC-MOD-06 contains preflight, reconciliation, partial unique index, post-check, and rollback.
- `supabase/migrations-pending-review/AC-MOD-06_one_published_publication_per_project.sql`: added a DBA checklist header comment (non-semantic).
- `.ai/08_prompts/kimi/02-one-published-publication-per-project/RUNBOOK.md`: new local apply/preflight/post-check/rollback runbook.
- Same-folder reports: `REPORT.md`, `EVIDENCE.md`, `CHECKLIST.md`, `PASS_STATUS.md`, `PASS_HISTORY.md`.

## Behavior intended to remain unchanged

- Existing publication rotation behavior is not changed.
- Provider SQL is not applied without confirmed target and preflight.
- Duplicate reconciliation is not performed without explicit authorization.

## Validation per changed area

- `bun test tests/vitest/project-publication-one-published-index.test.ts` — passed (7/7).
- `bun run type-check` — passed.
- `git diff --check` — passed.

## Conflict notes

Pre-existing dirty files `.ai/03_plans/2026-06-19-Projects-Page-Performance/LOOP_LEDGER.md`, `src/components/workshop/LiveProjectCard.tsx`, and untracked `tmp/` were preserved and not touched.
