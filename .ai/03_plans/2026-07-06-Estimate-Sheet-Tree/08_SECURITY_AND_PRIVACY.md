# Security And Privacy

## Data Classification

Estimate tree structure is project-confidential. Reorder changes can reveal or alter project organization, item context, and proposal output.

## Existing Guards To Preserve

- `requireAuth` (called inside `reorderEstimateTreeNodes`).
- `getCurrentWorkspaceProject` — current workspace project lookup (`actions.ts:2187`).
- Estimate belongs to project (`actions.ts:2191-2199` — explicit SELECT on `id, project_id` filtered by both).
- `assertCanEditEstimate` (`actions.ts:2200`).
- Same-estimate node and parent validation (`actions.ts:2226-2243`).
- Cross-tab isolation (`actions.ts:2234-2236`).
- Optimistic-id rejection (`actions.ts:2182-2183`).
- Non-negative sort order (`actions.ts:2184`).

## Security Requirements

- Never trust client `parentId` or `sortOrder` without server-side validation.
- Keep the server action as the authorization boundary even if UI validation rejects most bad drops.
- Do not expose hidden node names in invalid-target help if the user cannot edit or view the estimate.
- Keep error messages actionable but not provider-internal. The current error wrapper at `actions.ts:2259` (`Could not reorder estimate tree: ${rpcError.message}`) passes the inner message verbatim — this is fine while the inner messages are user-actionable, but should be reviewed if any RPC grows internal-jargon errors.

## Workspace Resolution As A Security Invariant (added 2026-07-06)

The RC0 bug is not strictly a security issue — it fires for every authorized reorder — but the `workspace_id NOT NULL` schema constraint (migration `0025:11`) and the composite FK `(project_id, workspace_id) REFERENCES projects(id, workspace_id)` together mean:

- Every audit-trail row **must** be scoped to a workspace.
- Without `target_project_id` in the RPC payload, the application-layer guard at `d1-action-client.ts:451` is the only thing standing between the action and a schema-level FK violation.
- Once Phase 0 lands, the `workspace_id` resolves via `readProjectContext` → `SELECT workspace_id FROM projects WHERE id = ?`. This is the same chain that other actions use; it inherits the project-membership authz already enforced by `getCurrentWorkspaceProject`.

**Post-Phase-0 audit recommendation:** run a static/payload audit of `dataStore.call(...)` sites and focused adapter tests, not a `workspace_id IS NULL` data audit. `estimate_sheet_events.workspace_id` is `NOT NULL`, so a null-row query cannot prove call-site correctness. The useful proof is: every history-writing action payload carries `target_project_id` or an explicit `workspaceId`, and a missing/empty project id fails before insert.

## IDOR / Cross-Tenant Posture

- The reorder action validates that every `update.id` and `update.parentId` belongs to the resolved `estimate.id` (`actions.ts:2228`, `2231`). A user cannot move another tenant's node by guessing ids.
- Cross-tab moves are rejected (`actions.ts:2234-2236`).
- **Cycle detection is currently NOT enforced server-side in the active D1 path** (`d1-action-client.ts:1343-1360`). A malicious client could craft a parentId cycle that the planner rejects but the server accepts. Phase 3 closes this with projected-tree validation.
- `EstimateSheetTree` has no local `canEditEstimate` prop. Context-menu and toolbar controls are not an authorization boundary; server actions remain the boundary. If viewer/read-only tree UX matters for first users, add a permission prop and UI tests instead of relying on disabled visual convention.
- External drop payloads and context-menu actions must continue to be server-validated; event dispatch from the client is not trusted data.

## Tests

- Existing action tests should continue to cover auth, project ownership, cross-tab rejection, and RPC error surfacing.
- Add tests for branch root moves and sparse branch reparenting to ensure the server validates update and parent ids even when descendants are not included in `updates`.
- Add Phase 0 wrapper tests T-RC0-1/T-RC0-3 and D1 adapter/local-provider proofs T-RC0-2/T-RC0-4 (see `04_ROOT_CAUSE_AND_DEBUG_PLAN.md`).
- Add Phase 3 cycle-rejection test for the active D1 path.
