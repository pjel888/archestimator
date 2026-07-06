# Implementation Sequence

## Phase 0 — Workspace Resolution Hotfix (CRITICAL, IMPLEMENTATION-READY)

This phase unblocks the live user-reported error. It is a one-line code change plus a focused regression test.

1. **Fix** `src/lib/estimates/actions.ts:2252-2257`. Add `target_project_id: project.id` to the `rpcPayload` so the D1 reorder adapter receives a non-empty project id and `insertHistoryEvent` can resolve `workspace_id` from the projects table.
   - Before:
     ```ts
     const rpcPayload = {
       target_estimate_id: estimate.id,
       move_updates: moveUpdates,
       acting_user_id: currentUser.userId,
       correlation_id: randomUUID(),
     };
     ```
   - After:
     ```ts
     const rpcPayload = {
       target_project_id: project.id,
       target_estimate_id: estimate.id,
       move_updates: moveUpdates,
       acting_user_id: currentUser.userId,
       correlation_id: randomUUID(),
     };
     ```
2. **Action-wrapper regression tests** in `tests/vitest/estimate-node-reorder-action.test.ts`:
   - Update the existing reorder RPC payload expectations that currently omit `target_project_id`.
   - Assert the RPC payload sent to `reorder_estimate_nodes_with_history` includes `target_project_id` matching the resolved project id.
   - Assert a nesting drop (parentId non-null) succeeds end-to-end without the "Estimate history event workspace could not be resolved" error.
3. **D1 adapter/local-provider proof:**
   - Assert the resulting `estimate_sheet_events` row has `event_type = 'estimate_nodes_reordered'`, non-null `workspace_id`, and `project_id` matching the project.
   - Assert missing, empty, or unknown `target_project_id` fails cleanly before history insert.
4. **Verify focused subset:** `bunx vitest run tests/vitest/estimate-node-reorder-action.test.ts --maxWorkers=1` plus the D1 adapter/local-provider test command selected in step 3.
5. **Verify typecheck:** `bun run type-check`.
6. **Manual smoke:** drag any area to reorder (flat or nested) and confirm success.

Stop condition for Phase 0: regression tests pass, typecheck passes, and the user-reported error no longer fires.

## Phase 1 — Characterization And RED Tests

1. Add branch-with-descendants fixtures.
2. Add pure planner branch move characterization tests. Passing is acceptable and locks the current planner contract.
3. Add expected-RED confirmed `sortOrder` merge regression test.
4. Add DOM DnD branch reorder tests with explicit row rects. Classify as characterization if they pass, expected-RED if they fail because rendered behavior is broken.
5. Add optimistic success and rollback branch tests. Classify based on actual behavior.
6. Add expected-RED Move dialog placement tests for before, after, root top, and root bottom.
7. Add expected-RED action-wrapper and D1 adapter/provider tests for projected-tree cycle rejection (the RC5 residual — `target_project_id` payload is now covered by Phase 0).
8. Add action-wrapper characterization tests for sparse branch reparent and root move with `targetTabId`.
9. Add or tag state-inventory preservation tests from `20_STATE_INVENTORY_AND_SHADOW_PATHS.md`, especially disabled reasons, search/optimistic gates, restore failure/provider proof, permissions, empty search copy, lazy-load interactions, and external drops.

Stop only if an expected-RED test does not fail for the expected reason, or a characterization test exposes a worse failure than planned.

## Phase 2 — Correctness Fix

1. Update confirmed-structure merge so structural fields needed for future planning come from confirmed nodes.
2. Preserve cached row item content and local row edits.
3. Re-run pure planner and optimistic DnD tests.

## Phase 3 — Persistence Boundary (RC5 residual after Phase 0)

1. Add projected-tree validation for the active D1 path before write:
   - no self/cycle after applying updates;
   - every updated node and parent exists in the same estimate;
   - parent/node tab isolation is preserved;
   - duplicate impossible sibling state is rejected or normalized consistently with the persisted order contract.
2. Prove reorder history uses the project id (test already added in Phase 0).
3. Verify readback order through action/repository path.

## Phase 4 — Move Dialog Parity

1. Replace `moveDestinationNodeId: string` with `EstimateTreeMoveSelection`.
2. Add node placement options for before, inside, and after.
3. Add root top/bottom sentinel options.
4. Use focusable option rows with `role="radio"`, `aria-checked`, `aria-disabled`, and visible reasons.
5. Resolve root sentinels to concrete `handleTreeDrop` calls.
6. Route selected node placements into `handleTreeDrop`.

## Phase 5 — Pointer UX

1. Add `dragActivation="row" | "handle"` to the shared `Tree`, defaulting to `"row"` for compatibility.
2. Pass `dragActivation="handle"` from EstimateSheetTree.
3. Verify grip drag starts DnD and row-body drag does not for EstimateSheetTree.
4. Improve before/inside/after visuals.
5. Add visible status and disabled reasons.
6. Preserve shared tree tests and component-library consumers.

## Phase 6 — Refactor

1. Extract reorder hook.
2. Extract move dialog.
3. Extract UI node mapping if it reduces `EstimateSheetTree.tsx`.
4. Run focused suite and typecheck.

## Phase 7 — Final Verification

1. Focused Vitest suite.
2. `bun run type-check`.
3. Optional browser proof only for geometry claims.

## Sequencing Rationale

- Phase 0 is non-negotiable: the user cannot use the feature today.
- Phases 1-2 lock behavior with tests before any structural change.
- Phase 3 is the residual of the original "D1 parity" finding; `target_project_id` payload is closed by Phase 0, projected-tree validation remains.
- Phases 4-5 are the UX improvements the user asked for ("reordering UX is bad").
- Phase 6 is the component decomposition the file length demands; deferred until tests protect behavior.
- Phase 7 is the closeout gate.
