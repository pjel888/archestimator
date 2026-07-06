# Technical Architecture

## Current Architecture

`EstimateSheetTree.tsx` currently owns query state, local optimistic tree state, rename/create/delete/reorder mutations, context menus, dialogs, bulk selection, and render wiring in one large client component (2217 lines).

The shared `Tree` primitive owns flattening, roving focus, keyboard navigation, HTML DnD state, root drop zones, virtualization, and default row visuals.

The pure estimate planner in `estimate-tree-reorder.ts` owns structural validation and reorder payload generation.

The D1 action client in `d1-action-client.ts` owns persistence and audit-trail writes.

The server action `reorderEstimateTreeNodes` in `actions.ts:2170-2264` owns authn, authz, input validation, RPC dispatch, and tree refresh.

## Workspace Resolution Chain (added 2026-07-06)

For reorder specifically (and every other estimate action), the workspace_id resolution chain is:

1. Client calls server action with `projectId`.
2. Server action calls `getCurrentWorkspaceProject(projectId)` → resolves `{ project }` from session + project membership.
3. Server action builds RPC payload (currently missing `target_project_id` — RC0).
4. RPC dispatches to D1 adapter `reorderEstimateNodes` (`d1-action-client.ts:1343`).
5. D1 adapter calls `insertHistoryEvent` with `projectId`.
6. `insertHistoryEvent`:
   - If `input.workspaceId` provided, use it.
   - Otherwise `readProjectContext(database, projectId)` → `SELECT id, workspace_id FROM projects WHERE id = ?`.
   - Use `project.workspace_id`.
   - If null, throw `"Estimate history event workspace could not be resolved."` (line 451).
7. INSERT into `estimate_sheet_events` with `workspace_id` NOT NULL.

Phase 0 closes the chain at step 3 — the payload must carry `target_project_id` so step 6's `readProjectContext` lookup succeeds.

## Target Boundaries

Keep domain correctness in pure utilities:

- Reorder placement validation.
- Reorder plan construction.
- Confirmed-structure merge.
- Drop-position to target mapping where possible.

Keep generic UI behavior in `Tree`:

- Drag source affordance.
- Drop intent visualization.
- Root edge drop zones.
- Keyboard tree navigation.
- Optional callbacks for richer status/help text.

Keep estimate-specific workflows in `EstimateSheetTree`:

- Server action calls.
- Query cache snapshot/restore.
- Toast/status messaging.
- Move dialog options and permissions.
- Bulk selection and row labels.
- Context-menu action model.
- External template/project/row-item drop adapters.
- Active-tab and route-repair decisions.

Keep persistence in `d1-action-client.ts`:

- All SQL.
- All audit-trail INSERTs.
- Idempotency checks on `(estimate_id, correlation_id)`.

## Source-State Map

Implementation and review must use `20_STATE_INVENTORY_AND_SHADOW_PATHS.md` as the state map. It records the current source-backed surfaces and distinguishes:

- behavior to preserve with existing tests;
- behavior expected to fail before implementation;
- provider-unproven behavior such as D1 restore;
- future product decisions such as read-only tree controls.

## Refactor Recommendation

Only after behavior tests pass, split:

- `src/components/workshop/estimate-tree/use-estimate-tree-reorder.ts`
- `src/components/workshop/estimate-tree/EstimateTreeMoveDialog.tsx`
- `src/components/workshop/estimate-tree/EstimateTreePanel.tsx`
- `src/components/workshop/estimate-tree/estimate-tree-ui-node.ts`
- `src/components/workshop/estimate-tree/use-estimate-tree-external-drops.ts` only if external drop handling becomes noisy after Move dialog work.

Do not split first. Refactor after regression protection because the current component has subtle stale-prop and optimistic-revision behavior.

## Compatibility Notes

- Keep `TreeDropPosition = "before" | "after" | "inside"`.
- Keep `allowInsideOnLeaves` for the single-node model.
- Preserve external template/project source drops.
- Preserve virtualization API.
- Preserve the existing RPC function name `reorder_estimate_nodes_with_history` (Phase 0 does not change the RPC contract; only the payload).
- Do not pass React `useEffectEvent` callbacks into extracted hooks/components as general event handlers. Keep Effect Events local to effect logic or convert them to normal callbacks/refs before extraction.
- Keep non-interactive helpers outside the client module graph when practical; Client Component props crossing from Server Components must remain serializable.

## Phase 0 Architecture Impact

Phase 0 is intentionally narrow. It does not:

- Add or remove any module.
- Change the RPC contract.
- Change the auth flow.
- Change the cache or query layers.
- Touch the client component.

It only adds one field to one RPC payload. This is why it can ship first and alone.
