# Patch Notes: Project Charts Proof Hygiene

## Changed files

- `scripts/generate-project-charts-payload-evidence.ts` — new explicit evidence-generation command. Builds the same 5,000-row synthetic fixture the previous test used, serializes the `ProjectChartsData` payload, measures uncompressed bytes, and writes `.ai/05_logs/2026-06-14-project-charts-implementation/payload-contract-evidence.json`.
- `package.json` — added `generate:project-charts-payload-evidence` script alias.
- `tests/vitest/project-charts-payload-contract.test.ts` — removed `mkdirSync`/`writeFileSync` side effect from the payload-budget test; added a new behavior test proving the global category taxonomy invariant across simulated workspaces/projects.

## Behavior intended to remain unchanged

- Payload remains bucket-only.
- Raw fact arrays and per-row cost fields do not cross the wire.
- No browser/provider proof is claimed from local tests.
- Repository aggregation behavior is unchanged; only test proof hygiene changed.

## Validation per changed area

| Area | Command | Result |
|------|---------|--------|
| Evidence generation | `bun run generate:project-charts-payload-evidence` | Wrote evidence artifact; payload 11,171 bytes < 50,000 budget |
| Payload contract test | `bunx vitest run tests/vitest/project-charts-payload-contract.test.ts` | 5 passed |
| Type safety | `bun run type-check` | Passed (`tsc --noEmit`) |
| Diff hygiene | `git diff --check` | No whitespace errors |

## Conflict notes

No same-file conflicts detected. Pre-existing dirty files in the worktree (`src/app/workshop/projects/loading.tsx`, `src/components/workshop/LiveProjectCard.tsx`, `supabase/migrations-pending-review/AC-MOD-06_one_published_publication_per_project.sql`, plan ledger, and task-02 renamed folder) were left untouched.
