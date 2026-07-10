# 21 - Execution Handoff

> Superseded for execution on 2026-07-10. The exact first unit is `UNIT-001` in `IMPLEMENTATION_PLAN.md`; the manifest-backed DAG replaces the tentative files and PR sequence below.

## First Implementation PR Recommendation

Build Phase 0 evidence only.

Do not refactor the estimate sheet yet.

Suggested PR title:

`Add estimate sheet performance baseline harness`

## First PR Scope

Files likely to add/update:
- `tests/vitest/helpers/estimate-sheet-performance-fixtures.ts`
- `tests/vitest/estimate-sheet-performance-fixtures.test.ts`
- `tests/vitest/perf/estimate-sheet-large-virtualization.test.tsx`
- `tests/vitest/perf/estimate-sheet-large-edit-budget.test.tsx`
- `e2e/estimate-sheet-performance.spec.ts`
- `scripts/generate-estimate-sheet-d1-performance-proof.ts`
- `tests/vitest/estimate-sheet-d1-performance-proof-script.test.ts`
- Optional small extension to `scripts/measure-route-transitions.ts` if needed for exact target route artifacts.

Do not touch:
- graph store implementation
- D1 migrations
- route fast path
- row mutation internals

## First PR Acceptance

- Existing focused estimate perf suite passes.
- New fixture and DOM perf tests pass.
- Browser spec can run locally and writes artifact.
- D1 proof script can run locally and writes redacted artifact.
- `bun run doctor` is required after React source changes, not for evaluator-only work.
- `git diff --check` passes.

## Second PR Recommendation

Implement route/D1 proof-backed fast path or indexes only if Phase 0 proves route/D1 as top bottleneck.

If client computation is top bottleneck, second PR should instead add normalized graph read model and selector parity tests.

## Handoff Warning

Do not conflate proof classes:
- jsdom render proof is not browser proof.
- browser proof is not D1 proof.
- local D1 proof is not hosted D1 proof.
- route transition proof is not edit/scroll interaction proof.

## Suggested Branch-Free Workflow

Because this repo discourages automatic branch/worktree changes:
1. Stay on current branch unless user explicitly requests a branch.
2. Check `git status --short --branch`.
3. Touch only the planned files.
4. Re-read files immediately before edits.
5. Run focused checks.
6. Report changed files and evidence.
