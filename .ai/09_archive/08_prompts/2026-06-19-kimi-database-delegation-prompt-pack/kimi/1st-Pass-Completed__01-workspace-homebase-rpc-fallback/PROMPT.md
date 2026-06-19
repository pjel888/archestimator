# Kimi Prompt: Narrow `workspace_homebase_summary` RPC Fallback

## Dedicated `/goal`

Task base folder: `01-workspace-homebase-rpc-fallback`

```text
/goal Complete the Kimi task whose base folder is `01-workspace-homebase-rpc-fallback`. Locate the current task folder under `.ai/08_prompts/kimi` by finding either `01-workspace-homebase-rpc-fallback` or a folder ending in `__01-workspace-homebase-rpc-fallback`; then follow that folder's `PROMPT.md`. Narrow the `workspace_homebase_summary` RPC fallback so expected rollout/schema-cache misses can still use the app path, while malformed payloads, authorization/RLS failures, tail-query failures, and unexpected PostgREST errors do not silently pass. Run the required loop and write `REPORT.md`, `EVIDENCE.md`, `CHECKLIST.md`, `PATCH_NOTES.md`, `PASS_STATUS.md`, and `PASS_HISTORY.md` in the current task folder.
```

## Objective

Make the RPC fallback precise enough that it remains useful during rollout but stops masking real database or payload failures.

## Background and evidence

Review findings:

- `src/lib/repositories/workspace-repository.ts:1123` wraps `getWorkshopHomebaseDataRpcPath()` in one broad `try/catch`.
- `src/lib/repositories/workspace-repository.ts:1256` catches every error, logs `RPC unavailable; using app path`, and returns `null`.
- `src/lib/repositories/workspace-repository.ts:1156` throws RPC errors.
- `src/lib/repositories/workspace-repository.ts:1157` and `:1158` already distinguish optional collaboration-table misses from other query errors.
- `src/lib/repositories/workspace-repository.ts:1202` runs the tail work after the RPC. Tail failures are currently swallowed by the same fallback.
- `tests/vitest/workshop-homebase-summary-rpc-contract.test.ts` is the nearest test surface.

The intended behavior is not "never fallback." The intended behavior is "fallback only for known rollout-compatible unavailable-RPC states."

## Non-goals

- Do not remove the app path.
- Do not enable the RPC by default unless existing repo behavior already does.
- Do not change the SQL migration in this task.
- Do not touch provider Supabase.
- Do not refactor the whole workshop repository.

## Required loop

Follow `../COMMON_KIMI_OPERATING_PROTOCOL.md`.

Loop cap: 5 iterations.

### DISCOVER

- Read `AGENTS.md`.
- Read `.ai/10_state/current-state.md` FAST PATH.
- Read this prompt and `CHECKLIST.md`.
- Inspect `src/lib/repositories/workspace-repository.ts`.
- Inspect `tests/vitest/workshop-homebase-summary-rpc-contract.test.ts`.
- Run `git status --short` and record the starting status in `REPORT.md`.

### PLAN

In `REPORT.md`, write:

- Which fallback cases are allowed.
- Which errors must propagate.
- Which tests will prove both paths.
- Any same-file conflict concerns.

Recommended decision:

- Add a small helper such as `isWorkspaceHomebaseSummaryRolloutError(error: unknown): boolean`.
- Allow fallback for missing RPC/schema-cache style errors, for example PostgREST function-not-found or schema-cache missing-function codes/messages.
- Re-throw parse/payload errors, auth/RLS failures, and tail-query failures.
- Log sanitized code/message/details for allowed fallback only.

### EXECUTE

Keep edits scoped to:

- `src/lib/repositories/workspace-repository.ts`
- `tests/vitest/workshop-homebase-summary-rpc-contract.test.ts`

If the tests require a nearby fixture file, document the reason in `PATCH_NOTES.md`.

### VERIFY

Run the narrowest relevant checks first:

```bash
bun test tests/vitest/workshop-homebase-summary-rpc-contract.test.ts
bun run type-check
```

If either command is already known to be noisy in the branch, capture exact output and explain whether it is related.

### REPORT

Update:

- `REPORT.md`
- `EVIDENCE.md`
- `CHECKLIST.md`
- `PATCH_NOTES.md`

### DECIDE

Complete only when:

- Missing/unavailable RPC still falls back.
- Malformed RPC payload does not fall back.
- Unexpected tail-query or authorization-style failure does not fall back.
- Verification evidence is recorded.

## Suggested acceptance tests

Add or adjust tests that prove:

1. A known missing-function/schema-cache RPC error returns the app path.
2. `workspace_homebase_summary invalid payload` or invalid array element handling is not swallowed.
3. A non-optional tail-query failure propagates or otherwise reports failure instead of using the app path.
4. The warning does not print secrets or raw sensitive payloads.

## Same-folder report contract

Write all reports here:

- Current task folder `REPORT.md`
- Current task folder `EVIDENCE.md`
- Current task folder `CHECKLIST.md`
- Current task folder `PATCH_NOTES.md`
- Current task folder `PASS_STATUS.md`
- Current task folder `PASS_HISTORY.md`

## Pass completion

Before final response, update `PASS_STATUS.md`, append `PASS_HISTORY.md`, and execute `../PASS_COMPLETION_PROTOCOL.md`.

If this is the first successful pass, rename this folder to:

```text
1st-Pass-Completed__01-workspace-homebase-rpc-fallback
```

If blocked or failed on pass 1, rename this folder to one of:

```text
1st-Pass-Blocked__01-workspace-homebase-rpc-fallback
1st-Pass-Failed__01-workspace-homebase-rpc-fallback
```

On later passes, replace the existing leading pass prefix instead of stacking prefixes.
