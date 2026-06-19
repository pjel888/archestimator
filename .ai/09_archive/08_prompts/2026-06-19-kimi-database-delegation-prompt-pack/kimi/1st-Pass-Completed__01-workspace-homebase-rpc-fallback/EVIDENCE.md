# Evidence: Workspace Homebase RPC Fallback

## Commands

### 1. Targeted Vitest contract tests

```bash
bun test tests/vitest/workshop-homebase-summary-rpc-contract.test.ts
```

Exit code: `0`

Output excerpt:

```
(pass) workspace_homebase_summary Phase 3 RPC contract > defines an invoker JSONB RPC with explicit grants and no broad dashboard scope [3.99ms]
(pass) workspace_homebase_summary Phase 3 RPC contract > splices additive Supabase types for the RPC [0.13ms]
(pass) workspace_homebase_summary Phase 3 RPC contract > routes through a server-only flag and falls back to the app-only path [0.17ms]
(pass) workspace_homebase_summary Phase 3 RPC contract > adds the local proof harness script entrypoint [0.06ms]
(pass) workspace_homebase_summary RPC fallback precision > defines a rollout-only fallback guard [0.18ms]
(pass) workspace_homebase_summary RPC fallback precision > binds RPC errors and rethrows non-rollout failures [0.08ms]
(pass) workspace_homebase_summary RPC fallback precision > logs a sanitized fallback warning without raw payloads or secrets [0.04ms]
(pass) workspace_homebase_summary RPC fallback precision > rejects invalid array elements instead of casting them silently [0.02ms]

 8 pass
 0 fail
 44 expect() calls
Ran 8 tests across 1 file. [154.00ms]
```

### 2. Type check

```bash
bun run type-check
```

Exit code: `0`

Output excerpt:

```
$ tsc --noEmit
```

### 3. Worktree inspection

```bash
git status --short
```

Starting status recorded in `REPORT.md`. Only the intended source/test files in the task scope were modified by this pass; pre-existing unrelated edits in `src/lib/repositories/workspace-repository.ts` (`listCurrentWorkspaceProjects`) were preserved.

## Proof boundary

`local-only`

## Skipped checks

- No linked Supabase provider apply was performed; provider apply was not authorized in the launch message.
- No browser/UI proof was run because this change affects server-side repository fallback logic only; the existing contract tests and type-check cover the changed behavior.
