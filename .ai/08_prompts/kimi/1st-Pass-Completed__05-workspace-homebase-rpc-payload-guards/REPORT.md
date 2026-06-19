# Report: Workspace Homebase RPC Payload Guards

Status: Completed (1st pass)

## Goal

Add minimal element-level runtime guards for the `workspace_homebase_summary` JSON payload and tests that fail clearly on DB payload drift.

## Starting worktree

```
 M .ai/03_plans/2026-06-19-Projects-Page-Performance/LOOP_LEDGER.md
 D .ai/08_prompts/kimi/02-one-published-publication-per-project/CHECKLIST.md
 ... (other unrelated worker changes)
 M src/lib/repositories/workspace-repository.ts
 M tests/vitest/workshop-homebase-summary-rpc-contract.test.ts
```

## Field plan

| Array | Required fields | Notes |
| --- | --- | --- |
| `projectFavorites` | `project_id: string`, `created_at: string` | Used to build favorite-created-at map. |
| `estimateFavorites` | `estimate_id: string`, `project_id: string`, `created_at: string` | Used to build favorite-created-at map. |
| `recentProjects` | `id`, `name`, `client_name?`, `project_code?`, `location?`, `updated_at`, `workspace_id`, `created_by?` | Nullable text fields kept optional; IDs/timestamps required. |
| `favoriteProjects` | same as `recentProjects` | Same guard reused. |
| `estimateProjects` | same as `recentProjects` | Same guard reused. |
| `recentEstimates` | `id`, `project_id`, `name`, `sheet_code`, `updated_at` | All required strings. |
| `favoriteEstimates` | same as `recentEstimates` | Same guard reused. |
| `estimateNodes` | `id`, `estimate_id`, `kind`, `parent_id?`, `sort_order` | `kind` must be a known estimate-node enum value; `sort_order` must be a number. |

## Changes

- `src/lib/repositories/workspace-repository.ts`
  - Added `assertRpcString`, `assertRpcOptionalString`, `assertRpcNumber` helpers.
  - Added per-record assertion functions: `assertProjectFavoriteRef`, `assertEstimateFavoriteRef`, `assertProjectRecord`, `assertEstimateRecord`, `assertEstimateNodeRecord`.
  - Replaced shallow `readRpcArray` with a guarded version that maps each element through the correct assertion and includes array key + index in error messages.
  - Made `parseWorkshopHomebaseSummaryPayload` exportable so runtime contract tests can exercise it directly.
  - Preserved existing error messages (`workspace_homebase_summary invalid array element`) so existing static contract tests still pass.

- `tests/vitest/workshop-homebase-summary-rpc-contract.test.ts`
  - Imported `parseWorkshopHomebaseSummaryPayload`.
  - Added a new `describe` block with valid-payload acceptance and malformed-element rejection cases.

## Result

- 19/19 tests pass in `tests/vitest/workshop-homebase-summary-rpc-contract.test.ts`.
- `bun run type-check` passes.
- `git diff --check` passes.

## Residual risk

- Guards validate type shape and estimate-node enum membership, but not UUID/timestamp format.
- No new schema-validation dependency was added, per non-goal; future stricter validation would require a deliberate decision.
- Provider apply was not performed; runtime behavior against a live Supabase project remains unverified by this pass.
