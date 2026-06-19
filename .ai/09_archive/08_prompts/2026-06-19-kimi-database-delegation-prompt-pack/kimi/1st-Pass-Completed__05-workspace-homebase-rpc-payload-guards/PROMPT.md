# Kimi Prompt: Add Element-Level Guards For `workspace_homebase_summary`

## Dedicated `/goal`

Task base folder: `05-workspace-homebase-rpc-payload-guards`

```text
/goal Complete the Kimi task whose base folder is `05-workspace-homebase-rpc-payload-guards`. Locate the current task folder under `.ai/08_prompts/kimi` by finding either `05-workspace-homebase-rpc-payload-guards` or a folder ending in `__05-workspace-homebase-rpc-payload-guards`; then follow that folder's `PROMPT.md`. Add minimal element-level runtime guards for the `workspace_homebase_summary` JSON payload and tests that fail clearly on DB payload drift. Write reports in the current task folder.
```

## Objective

Catch malformed RPC payloads at the Supabase boundary instead of letting bad shapes become confusing UI state.

## Background and evidence

- `src/lib/supabase/types.ts` declares `workspace_homebase_summary` as returning `Json`.
- `src/lib/repositories/workspace-repository.ts:1103` only checks that named payload fields are arrays.
- `src/lib/repositories/workspace-repository.ts:1112` through `:1119` cast array elements directly to application record types.
- `src/lib/repositories/workspace-repository.ts:1245` later falls back to `"Unknown project"` when shape relationships are wrong.
- `tests/vitest/workshop-homebase-summary-rpc-contract.test.ts` is the nearest contract test file.

## Non-goals

- Do not introduce a full schema-validation dependency.
- Do not over-validate fields that downstream code does not read.
- Do not change the SQL payload shape unless a real drift is found.
- Do not combine this with the fallback narrowing task unless both folders are assigned together.

## Required loop

Follow `../COMMON_KIMI_OPERATING_PROTOCOL.md`.

Loop cap: 5 iterations.

### DISCOVER

- Read startup docs.
- Inspect `WorkshopHomebaseSummaryPayload` and related record types in `workspace-repository.ts`.
- Inspect generated Supabase type around `workspace_homebase_summary`.
- Read the RPC contract tests.
- Record starting `git status --short`.

### PLAN

In `REPORT.md`, list required fields for each array:

- `projectFavorites`
- `estimateFavorites`
- `recentProjects`
- `favoriteProjects`
- `estimateProjects`
- `recentEstimates`
- `favoriteEstimates`
- `estimateNodes`

Keep validation minimal: string IDs, timestamps where needed, nullable text fields where downstream expects nullability, and numeric/order fields where used.

### EXECUTE

Expected file scope:

- `src/lib/repositories/workspace-repository.ts`
- `tests/vitest/workshop-homebase-summary-rpc-contract.test.ts`

Recommended implementation:

- Add small type guards or assertion functions.
- Include payload key and element index in error messages.
- Keep errors sanitized.
- Reuse helper functions to avoid large repetitive blocks.

### VERIFY

Run:

```bash
bun test tests/vitest/workshop-homebase-summary-rpc-contract.test.ts
bun run type-check
git diff --check
```

### REPORT

Update same-folder reports and `PATCH_NOTES.md`.

### DECIDE

Complete only when tests prove both valid payload acceptance and malformed element rejection.

## Pass completion

Before final response, update `PASS_STATUS.md`, append `PASS_HISTORY.md`, and execute `../PASS_COMPLETION_PROTOCOL.md`.

If this is the first successful pass, rename this folder to:

```text
1st-Pass-Completed__05-workspace-homebase-rpc-payload-guards
```

If blocked or failed on pass 1, rename this folder to one of:

```text
1st-Pass-Blocked__05-workspace-homebase-rpc-payload-guards
1st-Pass-Failed__05-workspace-homebase-rpc-payload-guards
```

On later passes, replace the existing leading pass prefix instead of stacking prefixes.
