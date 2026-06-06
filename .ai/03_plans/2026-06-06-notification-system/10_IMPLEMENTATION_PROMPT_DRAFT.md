# Implementation Prompt Draft

Use this prompt when the owner says to start implementation.

```text
Implement the notification system from `.ai/03_plans/2026-06-06-notification-system` on branch `codex/notification-system`.

Plan status: REFINED_READY_FOR_IMPLEMENTATION.

Hard constraints:
- This is now implementation work, but do not widen scope beyond the plan.
- Do not add email/SMS/browser push/external vendors.
- Do not change production/provider settings, secrets, DNS, Vercel aliases, or Supabase paid features.
- Supabase project ref is `ebxxqidacheyapmmzavr`; never mutate unrelated projects.
- Use existing `Modal`, `ToastProvider`, TanStack Query, Supabase, Tailwind v4, and design-system patterns.
- Realtime is optional and must be durable-state-backed.

Preflight:
1. Run `pwd`, `git status --short --branch`, `git branch --show-current`, `git fetch --prune origin`, and `git rev-list --left-right --count origin/main...HEAD`.
2. Rebase on current `origin/main` if behind.
3. Read every file in `.ai/03_plans/2026-06-06-notification-system`.
   - Start with `25_IMPLEMENTATION_HANDOFF_CHECKLIST.md`.
   - Then read `00_INDEX.md`, `01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md`, `04_IMPLEMENTATION_SEQUENCE.md`, `06_TESTING_AND_VERIFICATION_PLAN.md`, and `13_TRACEABILITY_MATRIX.md`.
   - Use `15` through `24` as the specialist source of truth for schema, server, UI, state, fixtures, accessibility, design, impact, provider evidence, and operator runbook.
4. Re-read `DESIGN.md`, `package.json`, `.ai/10_state/current-state.md`, `.ai/10_state/decisions.md`, and `.ai/10_state/known-issues.md`.
5. Read current Next.js 16 docs under `node_modules/next/dist/docs/` before editing App Router code; if missing, use official Next docs and cite them.
6. Use GitNexus/code-review graph impact analysis before editing symbols if the graph index is available; if stale or empty, document fallback.

Execution:
1. Follow `04_IMPLEMENTATION_SEQUENCE.md` in order.
2. Add failing tests before implementation for each task where practical.
3. Keep changes small and reversible.
4. Do not modify shared `Modal` or `ToastProvider` unless a test proves a gap.
5. Do not add Realtime until durable DB/query/UI path passes.
6. Update `.ai` logs/state honestly; do not mark hosted/provider proof complete without evidence.
7. Update `13_TRACEABILITY_MATRIX.md` as evidence is produced.

Verification:
1. Run targeted notification tests.
2. Run relevant existing regression tests listed in `06_TESTING_AND_VERIFICATION_PLAN.md`.
3. Run `bun run type-check`.
4. Run `bun run lint`.
5. Run `bun run lint:design-system`.
6. Run `bun run test:dom`.
7. Run `bun run validate` before PR unless the owner accepts a narrower gate.
8. Run `git diff --check`.

Commit:
Use the Lore commit protocol from AGENTS.md. Include `Tested:` and `Not-tested:` trailers.
```

## Available Agent Types Roster

- `explore`: fast repo lookup and file/symbol mapping.
- `architect`: architecture/boundary review.
- `critic`: plan/design quality gate.
- `executor`: implementation/refactoring.
- `test-engineer`: test strategy and coverage.
- `verifier`: final evidence and risk audit.
- `designer`: UX/UI architecture.
- `dependency-expert`: package/SDK choice, only if a dependency change is proposed.
- `git-master`: branch/commit/rebase hygiene.

## Recommended Staffing

Use Team + Ultragoal for implementation:

- Ultragoal leader: owns durable checklist, cross-lane integration, and final evidence.
- Team lane 1, `executor`: Supabase migration, types, RLS tests.
- Team lane 2, `executor`: server repository/actions/query hooks.
- Team lane 3, `designer` or `executor`: release modal and notification center UI.
- Team lane 4, `test-engineer`: integration/regression tests and manual QA script.
- Final `verifier`: run verification matrix and inspect blast radius.

Keep lane count to 3-5. Do not parallelize files with shared ownership such as `src/app/providers.tsx` until the integration phase.

## Launch Hints

```bash
# Default durable implementation follow-up
$ultragoal ".ai/03_plans/2026-06-06-notification-system"

# Parallel implementation after goal setup
$team ".ai/03_plans/2026-06-06-notification-system" --lanes "db,server,ui,tests"

# Legacy sequential fallback only if explicitly selected
$ralph ".ai/03_plans/2026-06-06-notification-system"
```

## Team Verification Path

Team must prove:

- Migration/RLS tests pass.
- Server/action tests pass.
- UI/provider tests pass.
- Existing toast/modal/collaboration/publication regression tests pass.
- Typecheck, lint, design-system lint, and `git diff --check` pass.

Ultragoal checkpoints those artifacts and decides if full `bun run validate` is required before PR.
