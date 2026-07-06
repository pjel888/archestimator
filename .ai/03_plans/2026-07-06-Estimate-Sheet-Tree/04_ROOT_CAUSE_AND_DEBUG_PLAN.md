# Root Cause And Debug Plan

## Working Root-Cause Map

### RC0 — Workspace resolution failure on reorder (CRITICAL, added 2026-07-06)

Confidence: **HIGH** — verified directly against source.

**User-visible error:** `Could not reorder estimate tree: Estimate history event workspace could not be resolved.`

**Trigger condition:** Every call to `reorderEstimateTreeNodes` fails. The user described nesting because that was the case they tried first; flat reorder at the same level also fails. The reason: the RPC payload sent to the D1 reorder adapter is missing `target_project_id`, so the audit-trail INSERT cannot resolve a workspace.

**Call chain (verified):**

1. Client: `EstimateSheetTree.tsx:888` calls `reorderEstimateTreeNodes(projectId, estimateId, { updates, targetTabId })`.
2. Server action: `src/lib/estimates/actions.ts:2170-2264` validates, then at line 2252 builds:
   ```ts
   const rpcPayload = {
     target_estimate_id: estimate.id,
     move_updates: moveUpdates,
     acting_user_id: currentUser.userId,
     correlation_id: randomUUID(),
   };
   ```
   **Missing:** `target_project_id: project.id`. Every other call site in `actions.ts` (30+ sites — see grep `target_project_id` in `actions.ts`) passes it.
3. The payload is dispatched via `dataStore.call("reorder_estimate_nodes_with_history", rpcPayload)` at line 2258.
4. D1 adapter: `src/lib/estimates/d1-action-client.ts:1343-1361` `reorderEstimateNodes`:
   ```ts
   const projectId = String(args.target_project_id ?? "");  // ""
   ...
   await insertHistoryEvent(database, { projectId, ... });
   ```
5. `insertHistoryEvent` at `d1-action-client.ts:435-502`:
   ```ts
   const project = input.workspaceId ? null : await readProjectContext(database, input.projectId);
   // input.workspaceId is undefined, input.projectId is "" → readProjectContext returns null
   const workspaceId = input.workspaceId ?? project?.workspace_id;  // undefined
   if (!workspaceId) throw new Error("Estimate history event workspace could not be resolved.");
   ```
6. The thrown error bubbles up to `actions.ts:2259`:
   ```ts
   if (rpcError) throw new Error(`Could not reorder estimate tree: ${rpcError.message}`);
   ```

**Schema reality (verified):** Migration `0025_reusable_source_insert_support.sql:8-39` creates `estimate_sheet_events` with:
- `workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE` (line 11)
- `project_id TEXT NOT NULL` (line 12)
- Composite FK: `FOREIGN KEY (project_id, workspace_id) REFERENCES projects(id, workspace_id) ON DELETE CASCADE` (line 37)

The NOT NULL constraint plus the application-level guard at `d1-action-client.ts:451` together guarantee the throw fires whenever `target_project_id` is absent from the payload.

**Smallest fix shape (planning only — no code edits in this pass):**

In `src/lib/estimates/actions.ts` at line 2252, add `target_project_id: project.id` to the `rpcPayload`. The resulting payload becomes:
```ts
const rpcPayload = {
  target_project_id: project.id,
  target_estimate_id: estimate.id,
  move_updates: moveUpdates,
  acting_user_id: currentUser.userId,
  correlation_id: randomUUID(),
};
```

The D1 adapter already reads `args.target_project_id` at line 1344 and passes it into `insertHistoryEvent`, where `readProjectContext` (line 406) will look up `SELECT id, workspace_id FROM projects WHERE id = ?` and resolve `workspace_id` from the project row. No migration. No client change. No new dependency.

**Optional micro-optimization (not required for the fix):** If `getCurrentWorkspaceProject` already returns `project.workspace_id` (verify in `workspace-repository.ts`), the payload can additionally pass `target_workspace_id: project.workspace_id` and `insertHistoryEvent` can accept it via `input.workspaceId`, skipping the extra `readProjectContext` roundtrip. This is optimization, not correctness.

**Test cases needed (planning only):**

- T-RC0-1: Unit/action-wrapper test in `tests/vitest/estimate-node-reorder-action.test.ts` that updates every existing reorder RPC payload expectation and asserts the payload contains `target_project_id`.
- T-RC0-2: D1 adapter/local-provider proof that exercises the active D1 reorder path and asserts the resulting `estimate_sheet_events` row has `event_type = 'estimate_nodes_reordered'`, non-null `workspace_id`, and `project_id` matching the project. Do not claim this from the mocked action-wrapper test file.
- T-RC0-3: Regression test that nests a branch into another branch and asserts success (no "Estimate history event workspace could not be resolved" error).
- T-RC0-4: Negative test that an unknown, empty, or missing `target_project_id` fails cleanly before history insert. Do not model a valid project with no workspace; the schema requires `projects.workspace_id`.

---

### RC1 — Stale structural fields after confirmed merge

- Confirmed code behavior: `mergeEstimateTreeStructureWithCachedNodes` (`src/lib/estimates/estimate-tree-reorder.ts:304`, verified) clones cached node data and overlays only `id`, `kind`, and `children`.
- Inferred consequence: after a successful reorder, cache may still carry old `sortOrder`, causing the next sparse move to calculate from stale sibling sort orders.
- Confidence: high for code behavior, medium for user-facing break until a RED test reproduces it.

### RC2 — Branch-specific rendered coverage is incomplete

- Existing DnD tests cover leaf reparent and shallow group nesting.
- They do not directly assert a non-empty branch moving before/after sibling branches through rendered DOM, optimistic success, and rollback.
- Confidence: high.

### RC3 — Drop intent is too easy to misfire

- With inside allowed on every row, the middle half of every row nests the dragged node (`src/components/ui/tree.tsx:399-415`, verified).
- For compact rows, users intending sibling reorder can accidentally create nesting.
- Confidence: high for UX cause, medium for reported "broken" behavior.

### RC4 — Keyboard Move dialog is only a reparenting dialog

- It validates targets as `"inside"` and calls `handleTreeDrop(..., "inside")`.
- It cannot express before/after/root reorder.
- Confidence: high.

### RC5 — Active D1 reorder persistence has contract gaps (PARTIALLY SUBSUMED BY RC0)

- The payload omission of `target_project_id` is now the cause of RC0. Phase 0 closes it.
- **Residual after RC0 fix:** the D1 reorder adapter at `d1-action-client.ts:1343-1360` batch-updates parent and sort order **without** validating the projected tree for cycles, missing parent estimates, or cross-tab isolation. Cycle detection is currently delegated to "the DB reorder RPC" in the planner comment at `estimate-tree-reorder.ts:357`, but no such DB RPC runs in the active D1 path.
- Confidence: high.

### RC6 — Whole-branch planner behavior may already be correct

- `removeNode` clones the full dragged subtree and `insertNode` inserts that subtree.
- Pure branch-with-descendants tests may pass today. They are still required as characterization guardrails before changing merge, UI, or persistence code.
- Confidence: high.

### RC7 — Plan state coverage was reorder-centered

- Context-menu actions, inline rename, optimistic create, delete, bulk delete, restore Undo, search/filter, lazy hydration, active-tab routing, external drops, and permission gates share the same component state as reorder.
- Many of those states already have tests. The issue is not "missing broad coverage"; it is missing precise proof for the gaps listed in `20_STATE_INVENTORY_AND_SHADOW_PATHS.md`.
- Confidence: high.

### RC8 — Restore is UI/action-tested but active D1 provider support is unproven

- `restoreDeletedEstimateNodes` passes `target_project_id` from the action wrapper.
- The active D1 adapter currently throws for node and row restore actions.
- Delete/bulk Undo should not be claimed provider-ready until a D1 restore proof exists or the product decision changes the Undo UX.
- Confidence: high.

## Debug Procedure

1. **Phase 0 (RC0):** Confirm the throw site and call chain. Apply the one-line payload fix. Update existing reorder payload expectations, add T-RC0 wrapper tests, and add a real D1 adapter/local-provider history-row proof. Re-run the focused reorder suite. The "workspace could not be resolved" error must disappear.
2. **Phase 1 characterization:** Add pure planner characterization tests for branch-with-descendants move before/after/root. These may pass and become guardrails. Cross-check `20_STATE_INVENTORY_AND_SHADOW_PATHS.md` so new reorder tests do not regress existing context-menu, rename, delete, restore, search/filter, lazy-load, active-tab, or external-drop behavior.
3. Add expected-RED merge test proving confirmed `sortOrder` is lost today.
4. Add characterization or expected-RED DOM test for branch reorder with explicit row rects; classify based on actual result.
5. Add optimistic test for non-empty branch success and failure rollback; classify based on actual result.
6. Add expected-RED Move dialog tests for before/after/root placement.
7. Add expected-RED action-wrapper and D1 adapter/provider tests for projected-tree cycle rejection (the RC5 residual); add characterization tests for sparse branch reparent and root move with `targetTabId`.
8. Run only the focused suite.
9. Implement the smallest fix that turns each RED test GREEN.

## Do Not Fix Before Reproduction

- Do not refactor `EstimateSheetTree.tsx` first.
- Do not tune row visuals before the branch reorder and merge correctness tests exist.
- Do not replace DnD dependencies before proving the current primitive cannot meet the acceptance criteria.

## Reproduction Note for Phase 0

Because the user only saw the error on nesting, but the bug fires on every reorder, the fastest manual reproduction is:
1. Open any estimate with at least two root areas.
2. Drag any area to reorder among siblings (flat, no nesting).
3. Observe the toast: "Could not reorder estimate tree: Estimate history event workspace could not be resolved."
4. Verify the same error fires for a nesting drop.
