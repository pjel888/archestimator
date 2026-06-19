# Patch Notes: Workspace Homebase RPC Payload Guards

## Files changed

### `src/lib/repositories/workspace-repository.ts`

- Added primitive assertion helpers (`assertRpcString`, `assertRpcOptionalString`, `assertRpcNumber`) that throw sanitized, path-bearing errors.
- Added record-level assertion functions for each payload array element type:
  - `assertProjectFavoriteRef`
  - `assertEstimateFavoriteRef`
  - `assertProjectRecord`
  - `assertEstimateRecord`
  - `assertEstimateNodeRecord`
- Replaced shallow `readRpcArray` with a guarded mapper that validates each element and prefixes errors with `<array>[<index>].<field>`.
- Exported `parseWorkshopHomebaseSummaryPayload` to enable direct unit testing.
- Preserved the existing `workspace_homebase_summary invalid array element` message for non-object elements so existing static contract tests continue to pass.

### `tests/vitest/workshop-homebase-summary-rpc-contract.test.ts`

- Imported `parseWorkshopHomebaseSummaryPayload` from `@/lib/repositories/workspace-repository`.
- Added `workspace_homebase_summary payload element guards` describe block covering:
  - Valid payload acceptance.
  - Extra-field permissiveness.
  - Non-object payload rejection.
  - Missing top-level array rejection.
  - Non-object element rejection.
  - Field-type drift rejection for strings, nullable strings, and numbers.

## Verification

- `bunx vitest run tests/vitest/workshop-homebase-summary-rpc-contract.test.ts --maxWorkers=1` → 19/19 pass.
- `bun run type-check` → pass.
- `git diff --check` → pass.

## Non-goals preserved

- No schema-validation dependency added.
- No over-validation of fields not read downstream.
- SQL payload shape unchanged.
- Scope not combined with fallback-narrowing task.
