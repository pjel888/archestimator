# Kimi Prompt: Project Charts Proof Hygiene

## Dedicated `/goal`

Task base folder: `09-project-charts-proof-hygiene`

```text
/goal Complete the Kimi task whose base folder is `09-project-charts-proof-hygiene`. Locate the current task folder under `.ai/08_prompts/kimi` by finding either `09-project-charts-proof-hygiene` or a folder ending in `__09-project-charts-proof-hygiene`; then follow that folder's `PROMPT.md`. Move side-effectful charts payload evidence out of the unit test path and add one executable behavior check for the global taxonomy invariant. Write all reports in the current task folder.
```

## Objective

Make the project charts proof cleaner by separating evidence generation from unit tests and proving the global taxonomy assumption with behavior, not only comments/source matching.

## Background and evidence

- `src/lib/repositories/project-charts-repository.ts:244` documents `component_category_nodes` as a global taxonomy.
- `tests/vitest/project-charts-payload-contract.test.ts:105` measures payload size.
- `tests/vitest/project-charts-payload-contract.test.ts:107` writes runtime evidence into `.ai/05_logs` during Vitest.
- `tests/vitest/project-charts-payload-contract.test.ts:128` source-cross-checks repository/type contract.

## Non-goals

- Do not rewrite chart aggregation.
- Do not change payload shape unless a test proves the current contract is wrong.
- Do not remove payload budget coverage.
- Do not require browser verification.

## Required loop

Follow `../COMMON_KIMI_OPERATING_PROTOCOL.md`.

Loop cap: 5 iterations.

### DISCOVER

- Read startup docs.
- Inspect chart repository and payload contract test.
- Inspect chart types and any package scripts around chart testing.
- Record starting `git status --short`.

### PLAN

In `REPORT.md`, decide:

- Where evidence generation should live if not inside Vitest.
- Which unit test should remain pure.
- What executable behavior proves the global taxonomy invariant.

Recommended direction:

- Keep the payload budget assertion in Vitest.
- Move `.ai/05_logs` evidence writing to a script or explicit command.
- Add a test that demonstrates taxonomy data is not filtered by workspace/project when building chart buckets, if that is the intended invariant.

### EXECUTE

Expected file scope:

- `tests/vitest/project-charts-payload-contract.test.ts`
- `src/lib/repositories/project-charts-repository.ts` only if a behavior seam is needed.
- A new script under `scripts/` only if it cleanly replaces the side-effectful evidence write.
- `package.json` only if adding a script alias is justified.

### VERIFY

Run:

```bash
bun test tests/vitest/project-charts-payload-contract.test.ts
bun run type-check
git diff --check
```

### REPORT

Update same-folder reports and `PATCH_NOTES.md`.

### DECIDE

Complete only when:

- Unit test no longer writes `.ai/05_logs` as a side effect, or a clear reason is documented.
- Payload budget is still tested.
- The taxonomy invariant has behavior-level proof or a precise blocker.

## Pass completion

Before final response, update `PASS_STATUS.md`, append `PASS_HISTORY.md`, and execute `../PASS_COMPLETION_PROTOCOL.md`.

If this is the first successful pass, rename this folder to:

```text
1st-Pass-Completed__09-project-charts-proof-hygiene
```

If blocked or failed on pass 1, rename this folder to one of:

```text
1st-Pass-Blocked__09-project-charts-proof-hygiene
1st-Pass-Failed__09-project-charts-proof-hygiene
```

On later passes, replace the existing leading pass prefix instead of stacking prefixes.
