# Report: Workspace Homebase RPC Fallback

Status: In progress — DISCOVER complete, PLAN written

## Goal

Narrow `workspace_homebase_summary` fallback so only expected rollout/schema-cache misses use the app path.

## Starting worktree

```
 M .ai/10_state/current-state.md
 M DESIGN.md
 M src/app/globals.css
 M src/app/workshop/loading.tsx
 M src/app/workshop/projects/loading.tsx
 M src/components/ui/header-icon-toolbar.tsx
 M src/components/ui/tree-panel-header.tsx
 M src/components/workshop/LiveProjectCard.tsx
 M src/components/workshop/ProjectCard.tsx
 M src/components/workshop/ProjectGroupFlag.tsx
 M src/components/workshop/ProjectGroupSection.tsx
 M src/components/workshop/WorkshopCollectionLayout.tsx
 M src/components/workshop/dashboard/ImageDestinationCard.tsx
 M src/components/workshop/dashboard/LibraryHubCard.tsx
 M src/components/workshop/dashboard/WorkshopDashboard.tsx
 M src/components/workshop/projects-page-client.tsx
 M src/lib/repositories/workspace-repository.ts
 M tests/vitest/project-group-section.test.tsx
 M tests/vitest/projects-page-card-layout.test.tsx
 M tests/vitest/projects-page-view-mode.test.tsx
?? .ai/03_plans/2026-06-19-Projects-Page-Performance/
?? .ai/08_prompts/kimi/
```

`src/lib/repositories/workspace-repository.ts` has unrelated pending edits in `listCurrentWorkspaceProjects` (lines ~851–1081). Those edits do not overlap the `getWorkshopHomebaseDataRpcPath` area (lines ~1110–1280), so they can be preserved while editing the RPC fallback area.

## Plan

### Allowed fallback cases

Only errors that indicate the RPC is unavailable because it has not been rolled out or because PostgREST has a stale schema cache:

- PostgREST schema-cache function miss: `code === "PGRST202"`.
- Postgres undefined-function: `code === "42883"`.
- Message phrases that match the PostgREST schema-cache function-not-found wording: `"schema cache"` and `"could not find the function"`.

### Errors that must propagate

- Malformed RPC payload / invalid array element (`parseWorkshopHomebaseSummaryPayload` errors are plain `Error` with no code).
- Authorization / JWT failures (`PGRST301`, `PGRST302`, `PGRST303`, etc.).
- RLS / permission-denied failures (`42501`).
- Unexpected PostgREST errors (`PGRST200`, `PGRSTX00`, etc.).
- Any non-PostgREST error (e.g., session/workspace resolution failures, tail-query failures).

### Edit scope

- `src/lib/repositories/workspace-repository.ts`
  - Add exported helper `isWorkspaceHomebaseSummaryRolloutError(error: unknown): boolean`.
  - Tighten `parseWorkshopHomebaseSummaryPayload` so non-record array elements throw `workspace_homebase_summary invalid array element` instead of being cast silently.
  - Replace the broad `catch { … }` in `getWorkshopHomebaseDataRpcPath` with `catch (error) { if (isWorkspaceHomebaseSummaryRolloutError(error)) { log sanitized code/message/details; return null; } throw error; }`.
- `tests/vitest/workshop-homebase-summary-rpc-contract.test.ts`
  - Add source-contract tests proving the guard exists, the catch binds and rethrows, the warning is sanitized, and invalid array elements are rejected.

### Verification

- `bun test tests/vitest/workshop-homebase-summary-rpc-contract.test.ts`
- `bun run type-check`

## Changes

- `src/lib/repositories/workspace-repository.ts`
  - Added exported helper `isWorkspaceHomebaseSummaryRolloutError(error: unknown): boolean` that returns `true` only for PostgREST schema-cache function misses (`PGRST202`), Postgres undefined-function (`42883`), and the matching `"schema cache"` / `"could not find the function"` message phrases.
  - Tightened `readRpcArray` to throw `workspace_homebase_summary invalid array element` when an array value contains a non-record element, so malformed payloads are not silently cast.
  - Replaced the broad `catch { … }` in `getWorkshopHomebaseDataRpcPath` with `catch (error) { if (isWorkspaceHomebaseSummaryRolloutError(error)) { log sanitized code/message/details; return null; } throw error; }`.
- `tests/vitest/workshop-homebase-summary-rpc-contract.test.ts`
  - Added `workspace_homebase_summary RPC fallback precision` describe block with source-contract tests proving the guard exists, the catch binds and rethrows, the warning is sanitized, and invalid array elements are rejected.

## Result

Completed.

- Missing/unavailable RPC (PGRST202 / 42883 / schema-cache wording) still falls back to the app path.
- Malformed payload / invalid array element errors are plain `Error` with no code, so the guard returns `false` and they propagate.
- Auth/RLS failures (`PGRST3xx`, `42501`) and unexpected PostgREST errors are not in the allowed list, so they propagate.
- Tail-query failures are still caught by the same `try`, but because they are not rollout errors they also propagate.
- The fallback warning now logs only `code`, `message`, and `details`; it never logs the raw error object or payload.
- `bun test tests/vitest/workshop-homebase-summary-rpc-contract.test.ts` passed (8 tests).
- `bun run type-check` passed.

## Residual risk

- These tests are source-contract / static tests. They prove the decision logic is present but do not execute a live RPC call. A live integration test against a Supabase project where the RPC is unavailable would be needed to confirm the exact PostgREST error shape and fallback behavior.
- `src/lib/repositories/workspace-repository.ts` had pre-existing unrelated edits in `listCurrentWorkspaceProjects` that were preserved and not modified by this pass.
