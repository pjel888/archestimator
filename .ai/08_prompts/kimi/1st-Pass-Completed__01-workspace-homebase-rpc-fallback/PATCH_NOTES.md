# Patch Notes: Workspace Homebase RPC Fallback

## Changed files

- `src/lib/repositories/workspace-repository.ts`: narrowed the `workspace_homebase_summary` RPC fallback to only allow rollout/schema-cache function-not-found errors (`PGRST202`, `42883`, and matching message phrases); added array-element validation; sanitized the fallback warning.
- `tests/vitest/workshop-homebase-summary-rpc-contract.test.ts`: added source-contract tests proving the fallback guard, rethrow behavior, sanitized logging, and invalid-array-element rejection.

## Behavior intended to remain unchanged

- App-path fallback remains available for expected rollout/schema-cache misses.
- No browser/public flag is introduced.
- No provider or production state is touched.
- The `workspace_homebase_summary` migration and SQL are unchanged.

## Validation per changed area

| Area | Command | Result |
|------|---------|--------|
| RPC fallback contract | `bun test tests/vitest/workshop-homebase-summary-rpc-contract.test.ts` | 8 pass, 0 fail |
| Type safety | `bun run type-check` | No errors |

## Conflict notes

`src/lib/repositories/workspace-repository.ts` already had unrelated pending edits in `listCurrentWorkspaceProjects` (a concurrent agent's performance work). Those edits do not overlap the `getWorkshopHomebaseDataRpcPath` area, so they were preserved untouched. No same-file conflict occurred.
