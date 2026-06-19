# Report: Project Charts Proof Hygiene

Status: Completed — pass 1

## Goal

Clean chart payload proof hygiene by moving runtime evidence generation out of the Vitest path and adding executable behavior proof that the category taxonomy is global (not filtered by workspace/project).

## Starting worktree

```
 M .ai/03_plans/2026-06-19-Projects-Page-Performance/LOOP_LEDGER.md
 D .ai/08_prompts/kimi/02-one-published-publication-per-project/CHECKLIST.md
 D .ai/08_prompts/kimi/02-one-published-publication-per-project/EVIDENCE.md
 D .ai/08_prompts/kimi/02-one-published-publication-per-project/PASS_HISTORY.md
 D .ai/08_prompts/kimi/02-one-published-publication-per-project/PASS_STATUS.md
 D .ai/08_prompts/kimi/02-one-published-publication-per-project/PATCH_NOTES.md
 D .ai/08_prompts/kimi/02-one-published-publication-per-project/PROMPT.md
 D .ai/08_prompts/kimi/02-one-published-publication-per-project/REPORT.md
 M src/app/workshop/projects/loading.tsx
 M src/components/workshop/LiveProjectCard.tsx
 M supabase/migrations-pending-review/AC-MOD-06_one_published_publication_per_project.sql
?? .ai/08_prompts/kimi-all.md
?? .ai/08_prompts/kimi/1st-Pass-Completed__02-one-published-publication-per-project/
?? .team/
?? tests/vitest/perf/projects-page-render-baseline.test.tsx
?? tests/vitest/project-publication-one-published-index.test.ts
?? tmp/
```

No pre-existing changes in the files this task owns (`tests/vitest/project-charts-payload-contract.test.ts`, `src/lib/repositories/project-charts-repository.ts`, `package.json`, `scripts/`).

## Plan

1. Create `scripts/generate-project-charts-payload-evidence.ts` that builds the same synthetic fixture the current test uses, runs `buildSeriesByEstimate`, serializes the payload, measures uncompressed bytes, and writes the evidence artifact to `.ai/05_logs/2026-06-14-project-charts-implementation/payload-contract-evidence.json`. This makes the evidence write an explicit command instead of a test side effect.
2. Add a `package.json` script alias `generate:project-charts-payload-evidence` so the command is discoverable and reproducible.
3. Remove the `mkdirSync`/`writeFileSync` side effect from `tests/vitest/project-charts-payload-contract.test.ts` while keeping the payload-budget assertion.
4. Add a new behavior test in the same file that proves the global taxonomy invariant: feed two synthetic estimates (simulating different projects/workspaces) rows that share the same `component_category_nodes` IDs, aggregate by category, and assert that both estimates produce buckets keyed by the same global category IDs without any workspace/project filter.
5. Run the targeted test, type-check, and `git diff --check`.
6. Update reports and complete pass hygiene.

## Changes

- `scripts/generate-project-charts-payload-evidence.ts` — new evidence-generation script.
- `package.json` — new `generate:project-charts-payload-evidence` alias.
- `tests/vitest/project-charts-payload-contract.test.ts` — remove side-effect write; add taxonomy invariant test.

## Result

Completed. The payload-contract test no longer performs filesystem writes during Vitest; evidence generation is now an explicit `bun run generate:project-charts-payload-evidence` command. The payload budget assertion, raw-fact-array checks, and repository/type-contract source checks remain in place. A new behavior test proves the global taxonomy invariant for category bucketing across simulated workspaces/projects.

## Residual risk

None known from the recorded `local-only` proof boundary. The script and test share the same fixture shape; if the chart data contract changes, both may need updating together.
