# Report: Live DB Performance Evidence Workflow

Status: Completed (1st pass)

## Goal

Create a repeatable workflow for live/staging DB performance evidence collection that prevents index/RPC changes from being proposed without live proof.

## Starting worktree

Starting `git status --short`:

```
 M .ai/03_plans/2026-06-19-Projects-Page-Performance/LOOP_LEDGER.md
 D .ai/08_prompts/kimi/02-one-published-publication-per-project/CHECKLIST.md
 D .ai/08_prompts/kimi/02-one-published-publication-per-project/EVIDENCE.md
 D .ai/08_prompts/kimi/02-one-published-publication-per-project/PASS_HISTORY.md
 D .ai/08_prompts/kimi/02-one-published-publication-per-project/PASS_STATUS.md
 D .ai/08_prompts/kimi/02-one-published-publication-per-project/PATCH_NOTES.md
 D .ai/08_prompts/kimi/02-one-published-publication-per-project/PROMPT.md
 D .ai/08_prompts/kimi/02-one-published-publication-per-project/REPORT.md
 M src/components/workshop/LiveProjectCard.tsx
 M supabase/migrations-pending-review/AC-MOD-06_one_published_publication_per_project.sql
?? .ai/08_prompts/kimi-all.md
?? .team/
?? tests/vitest/perf/projects-page-render-baseline.test.tsx
?? tests/vitest/project-publication-one-published-index.test.ts
?? tmp/
```

Unrelated changes were preserved. No same-file conflicts were detected.

## Plan

1. Reuse the existing repo-static inventories (`scripts/audit-dbidx-repo.ts` and `scripts/build-performance-query-inventory.ts`).
2. Add an orchestrator script (`scripts/collect-live-db-performance-evidence.ts`) with three modes:
   - `static` — repo-only evidence (default).
   - `linked` — read-only SQL via `supabase db query --linked`.
   - `local` — read-only SQL via `psql` against `DATABASE_URL`.
3. Generate a reusable SQL template for row counts, table sizes, index usage, unindexed FKs, and `pg_stat_statements`.
4. Add a DBIDX-002/003 runbook documenting the workflow, go/no-go gates, and decision matrix.
5. Register a `package.json` script for easy invocation.
6. Verify with `--help`, `--mode=static`, `bun run type-check`, and `git diff --check`.

## Changes

- Added `scripts/collect-live-db-performance-evidence.ts` — orchestrator with guardrails.
- Added `.ai/08_prompts/kimi/1st-Pass-Completed__06-live-db-performance-evidence-workflow/RUNBOOK_DBIDX_002_003.md` — operational runbook.
- Added `package.json` script `perf:collect-live-evidence`.
- Generated sample evidence in `sample-evidence/` within the task folder.
- Updated task folder reports: `REPORT.md`, `EVIDENCE.md`, `CHECKLIST.md`, `PASS_STATUS.md`, `PASS_HISTORY.md`, `PATCH_NOTES.md`.

## Result

A concrete, repeatable workflow now exists. Future agents can run:

```bash
bun run perf:collect-live-evidence -- --mode=static
bun run perf:collect-live-evidence -- --mode=linked --run-sql
DATABASE_URL=... bun run perf:collect-live-evidence -- --mode=local --run-sql
```

The orchestrator refuses to create migrations and explicitly labels the proof boundary. Live evidence collection requires explicit `--run-sql` plus credentials/linking, satisfying the provider-apply OFF constraint for this pass.

## Residual risk

- Linked and local live SQL modes were not executed in this pass because provider apply is OFF and no local seeded database was available. The SQL template and runbook document how to run them.
- `pg_stat_statements` may not be enabled on the target; the SQL handles this gracefully but the runbook notes the recovery step.
- EXPLAIN plans for specific queries are not generated automatically; the runbook describes how to add them.
