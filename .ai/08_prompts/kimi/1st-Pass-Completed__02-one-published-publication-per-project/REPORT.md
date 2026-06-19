# Report: One Published Publication Per Project

Status: Completed (local-prep only)

## Goal

Prepare or safely apply the AC-MOD-06 one-published-publication guarantee.

## Target classification

**Local-prep only.** The launch `/goal` does not include `provider-apply` or an explicit project target, so provider SQL must not be executed. All work is repo-static / local-only.

## Starting worktree

```
 M .ai/03_plans/2026-06-19-Projects-Page-Performance/LOOP_LEDGER.md
 M src/components/workshop/LiveProjectCard.tsx
?? tmp/
```

Unrelated dirty files will be preserved. No same-file conflicts detected for this task.

## Plan

1. **DISCOVER** (done): read AGENTS.md, current-state FAST PATH, pending migration README, AC-MOD-06 SQL, publication actions, and relevant schema/action tests. Recorded git status.
2. **EXECUTE**:
   - Add a static contract test (`tests/vitest/project-publication-one-published-index.test.ts`) that asserts AC-MOD-06 contains the duplicate preflight, reconciliation, partial unique index, post-check, and rollback.
   - Prepare an apply runbook (`RUNBOOK.md`) in this task folder with preflight, reconciliation, apply, post-check, and rollback commands.
   - Add a concise checklist header to the pending migration so a DBA can follow it without re-reading the plan doc.
3. **VERIFY**: run the new test, `bun test tests/vitest/project-publication-one-published-index.test.ts`, plus `bun run type-check` and `git diff --check`.
4. **REPORT**: update same-folder reports and rename folder per PASS_COMPLETION_PROTOCOL.md.

## Changes

- `tests/vitest/project-publication-one-published-index.test.ts`: new static contract test for AC-MOD-06.
- `supabase/migrations-pending-review/AC-MOD-06_one_published_publication_per_project.sql`: add DBA checklist header (non-semantic comment-only improvement).
- `.ai/08_prompts/kimi/02-one-published-publication-per-project/RUNBOOK.md`: new local apply runbook.
- Same-folder reports updated.

## Result

Completed (local-prep only).

- Added a static contract test for AC-MOD-06.
- Added a DBA checklist header to the pending migration.
- Prepared an apply runbook in the task folder.
- No provider SQL was run because the launch message did not authorize `provider-apply`.

## Residual risk

- Provider apply is not performed; the actual duplicate preflight against the live database is unverified.
- A future coordinator pass with `provider-apply` + project `ebxxqidacheyapmmzavr` is required to move this migration into `supabase/migrations/` and apply it.
- The static test proves the migration text contains the required statements, but it cannot detect live duplicates or validate index creation performance.
