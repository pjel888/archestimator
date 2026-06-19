# Report: Executable Schema/RLS Proofs

Status: Completed — Kimi pass 1

## Goal

Promote the highest-risk text-only database contracts into executable local Postgres proofs.

## Starting worktree

```
 M package.json
?? scripts/prove-membership-floor-triggers-postgres.mjs
 M .ai/08_prompts/kimi/08-executable-schema-rls-proofs/CHECKLIST.md
 M .ai/08_prompts/kimi/08-executable-schema-rls-proofs/EVIDENCE.md
 M .ai/08_prompts/kimi/08-executable-schema-rls-proofs/PASS_HISTORY.md
 M .ai/08_prompts/kimi/08-executable-schema-rls-proofs/PASS_STATUS.md
 M .ai/08_prompts/kimi/08-executable-schema-rls-proofs/PATCH_NOTES.md
 M .ai/08_prompts/kimi/08-executable-schema-rls-proofs/REPORT.md
```

## Candidate ranking

Reviewed the two text-contract test files:

1. `tests/vitest/project-collaboration-schema.test.ts` — string-based checks for collaboration schema, helper functions, RLS policies, realtime authorization, and membership-floor triggers.
2. `tests/vitest/security-findings-library-tooling-contracts.test.ts` — string-based checks for library-folder RLS, estimate-template RLS, taxonomy seed IDs, and tooling config.

Chosen executable slice:

- **Membership-floor triggers** (`enforce_workspace_owner_floor` and `enforce_project_manager_floor` from `20260613192255_teamspace_membership_atomic_guards.sql`).
- Rationale: these are pure database invariants that prevent a workspace/project from being left with zero owners/admins. A text check can confirm the migration contains the function and trigger definitions, but it cannot prove the concurrency guard actually blocks the last privileged removal/demotion. This is the weakest point in the current text-contract coverage.

Deferred candidates (still text-only for this pass):

- `can_access_project` / `can_access_estimate` semantics — broader, requires more schema; already partially exercised by `prove:workspace-homebase-summary`.
- Library-folder / estimate-template RLS — lower blast radius; string checks are reasonable for now.

## Changes

New files:
- `scripts/prove-membership-floor-triggers-postgres.mjs` — local Postgres proof harness.

Modified files:
- `package.json` — added `"prove:membership-floor-triggers": "node scripts/prove-membership-floor-triggers-postgres.mjs"` script alias.

Task-folder reports updated:
- `REPORT.md`
- `EVIDENCE.md`
- `CHECKLIST.md`
- `PASS_STATUS.md`
- `PASS_HISTORY.md`
- `PATCH_NOTES.md`

## Result

`bun run prove:membership-floor-triggers` passed.
`bun test tests/vitest/project-collaboration-schema.test.ts` passed.
`bun test tests/vitest/security-findings-library-tooling-contracts.test.ts` passed.
`bun run type-check` passed.

## Residual risk

- Proof is `local-only`; it does not replace a linked-provider migration run.
- Only the membership-floor trigger slice was promoted; other text-contract checks remain string-based.
- The harness recreates a minimal schema rather than applying the full migration chain, so subtle interactions with later migrations are not exercised.
