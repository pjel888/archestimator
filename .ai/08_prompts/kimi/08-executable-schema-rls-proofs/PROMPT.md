# Kimi Prompt: Promote Schema/RLS Text Contracts To Executable Proofs

## Dedicated `/goal`

Task base folder: `08-executable-schema-rls-proofs`

```text
/goal Complete the Kimi task whose base folder is `08-executable-schema-rls-proofs`. Locate the current task folder under `.ai/08_prompts/kimi` by finding either `08-executable-schema-rls-proofs` or a folder ending in `__08-executable-schema-rls-proofs`; then follow that folder's `PROMPT.md`. Identify the highest-risk DB schema/RLS text-contract tests and promote a small slice into executable local Postgres proof scripts or behavior tests. Keep same-folder reports updated in the current task folder.
```

## Objective

Reduce reliance on substring tests for critical database authorization behavior by adding executable proof for the highest-risk policy/helper paths.

## Background and evidence

- `tests/vitest/project-collaboration-schema.test.ts:12` checks many collaboration schema, helper, policy, and realtime strings by reading migration text.
- `tests/vitest/security-findings-library-tooling-contracts.test.ts:5` performs contract checks over source text and migrations.
- Existing proof pattern: `scripts/prove-workshop-homebase-summary-postgres.mjs`.
- The goal is not to remove all text-contract tests. The goal is to add semantic proof where text checks are weak.

## Non-goals

- Do not build a full migration test framework in one pass.
- Do not delete existing text-contract tests unless executable tests fully replace them.
- Do not apply provider SQL.
- Do not broaden into unrelated auth rewrites.

## Required loop

Follow `../COMMON_KIMI_OPERATING_PROTOCOL.md`.

Loop cap: 5 iterations.

### DISCOVER

- Read startup docs.
- Inspect the two text-contract test files.
- Inspect `scripts/prove-workshop-homebase-summary-postgres.mjs` as a proof pattern.
- Identify 1-2 high-risk authorization behaviors to prove.
- Record starting `git status --short`.

### PLAN

In `REPORT.md`, rank candidate proof targets. Prefer:

- RLS policies where a wrong predicate could expose data.
- `security definer` helpers where grants/search path matter.
- Membership-floor triggers where source text can pass while semantics fail.

Choose a small slice. Avoid boiling the ocean.

### EXECUTE

Potential deliverables:

- A new proof script under `scripts/`.
- A targeted Vitest that invokes a local proof script.
- A documented proof fixture pattern for future DB policies.

The proof should:

- Create minimal tables/functions/policies.
- Set role/user context.
- Assert allowed and denied cases.
- Clean up local state or run in an isolated database.

### VERIFY

Run the new proof plus existing nearest tests, for example:

```bash
bun test tests/vitest/project-collaboration-schema.test.ts
bun test tests/vitest/security-findings-library-tooling-contracts.test.ts
bun run type-check
```

If a local DB is required and unavailable, document exact setup and blocker.

### REPORT

Update same-folder reports and `PATCH_NOTES.md`.

### DECIDE

Complete only when at least one high-risk text-only contract has executable proof, or when infrastructure blockers are documented with a precise next action.

## Pass completion

Before final response, update `PASS_STATUS.md`, append `PASS_HISTORY.md`, and execute `../PASS_COMPLETION_PROTOCOL.md`.

If this is the first successful pass, rename this folder to:

```text
1st-Pass-Completed__08-executable-schema-rls-proofs
```

If blocked or failed on pass 1, rename this folder to one of:

```text
1st-Pass-Blocked__08-executable-schema-rls-proofs
1st-Pass-Failed__08-executable-schema-rls-proofs
```

On later passes, replace the existing leading pass prefix instead of stacking prefixes.
