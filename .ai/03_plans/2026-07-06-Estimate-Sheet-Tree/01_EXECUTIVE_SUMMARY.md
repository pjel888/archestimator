# Executive Summary

Readiness: CONDITIONALLY READY. Phase 0 hotfix is IMPLEMENTATION-READY for the payload fix; D1 history-row proof must be verified separately from mocked action-wrapper tests.

The current implementation has a strong pure planner and decent DOM coverage, but the exact user complaint — *"Could not reorder estimate tree: Estimate history event workspace could not be resolved"* — maps to a confirmed one-line payload gap in the active persistence path. That gap is the live production blocker; the rest of this plan addresses correctness, UX, and structural debt that surrounds it.

## Highest Priority Findings

1. **CRITICAL — Live production blocker (RC0, added 2026-07-06).** `reorderEstimateTreeNodes` builds its RPC payload at `src/lib/estimates/actions.ts:2252` without `target_project_id`. Every other call site in `actions.ts` (30+ sites) passes it. The D1 adapter at `src/lib/estimates/d1-action-client.ts:1343` falls back to `String(args.target_project_id ?? "")` (empty), the `readProjectContext` lookup at line 449 returns null for an empty project id, and the `insertHistoryEvent` guard at line 451 throws `"Estimate history event workspace could not be resolved."` The action wraps it as `"Could not reorder estimate tree: ${rpcError.message}"` at `actions.ts:2259`. **Every reorder attempt fails** (flat or nested); the user described nesting because that was the case they tried. Fix: one line — add `target_project_id: project.id` to the `rpcPayload`. Confidence: HIGH (throw site, call chain, and schema all verified).

2. **HIGH — Phase 0 evidence split.** Existing `estimate-node-reorder-action.test.ts` reorder expectations assert the old payload shape and must be updated to include `target_project_id`; that mocked action test file can prove wrapper payload shape, but it cannot prove the active D1 adapter inserted an `estimate_sheet_events` row. Add a real D1 adapter/local-provider proof for non-null `workspace_id` and `project_id`.

3. Probable correctness defect (RC1). `mergeEstimateTreeStructureWithCachedNodes` preserves cached node fields and only overlays `id`, `kind`, and `children` from confirmed server structure (`src/lib/estimates/estimate-tree-reorder.ts:304`, verified). It does not adopt confirmed `sortOrder`. Because reorder planning uses persisted sibling `sortOrder` for sparse updates (`src/lib/estimates/estimate-tree-reorder.ts:210`), a successful reorder can leave stale sort orders in cache and make later branch moves compute the wrong sparse/dense payload.

4. Confirmed UX parity gap (RC4). Pointer DnD supports `before`, `inside`, and `after`, but the keyboard-accessible Move dialog validates and executes only `"inside"` placement (`src/components/workshop/EstimateSheetTree.tsx:1605-1625` and `1640-1645`). Keyboard before/after/root support is a deliberate scope expansion, not current behavior.

5. Confirmed pointer ambiguity (RC3). Row drop bands make the middle 50 percent an `"inside"` drop when inside is allowed (`src/components/ui/tree.tsx:399-415`, verified). Estimate tree enables `allowInsideOnLeaves` (`src/components/workshop/EstimateSheetTree.tsx:2010`), so every row can be a nesting target. Dense rows make accidental nesting likely.

6. Confirmed affordance mismatch (R7). Every draggable row has `draggable` on the row props, but the visible grip is decorative. Users see a handle, but dragging can begin from the whole row.

7. Confirmed state-inventory gaps. Context menu, rename, create, delete, bulk delete, restore, search/filter, active-tab, lazy-load, and external drops are real states with existing coverage. The plan must protect them and add precise gaps only: restore failure/provider proof, permission-gated tree controls, search/optimistic disabled reasons, empty search copy, title-only disabled reasons, and Move dialog accessibility.

## Recommended Path

- **First** ship the one-line Phase 0 hotfix and update existing reorder payload expectations; add separate D1 adapter/provider proof for history-row workspace scoping.
- **Then** add characterization tests for whole-branch reordering where the planner may already be correct, plus inventory-preservation tests for the precise state gaps in `20_STATE_INVENTORY_AND_SHADOW_PATHS.md`.
- **Then** add failing tests for the merge, projected-tree cycle rejection, Move dialog placement, disabled reason accessibility, permission gating, and handle-only drag behavior.
- **Then** fix the confirmed merge issue by adopting server-confirmed structural fields needed for future planning, especially `sortOrder`, while preserving cached row content.
- **Then** extend Move dialog to support a typed placement model: node before/inside/after plus root top/bottom sentinels.
- **Then** improve drop clarity in the shared `Tree`: stronger state visuals, EstimateSheetTree opt-in handle-only drag activation, invalid target feedback, and visible saving status.
- **Finally** refactor `EstimateSheetTree.tsx` only after behavior is locked.

## Non-Goals

- Do not replace `Tree` with React Complex Tree as the first move. The project already has a shared custom tree with targeted tests. (Note: `react-complex-tree@^2.6.1` is installed in `package.json` but the active `EstimateSheetTree` uses the in-repo `Tree` primitive — see `03_CURRENT_STATE_AND_EVIDENCE.md`.)
- Do not revive kind-based sibling sorting.
- Do not require a D1 migration unless implementation uncovers a missing database invariant that cannot be enforced in the action/client layer. Phase 0 needs no migration; the schema already enforces `workspace_id NOT NULL`.

## Verification Mode

`verification_mode: source-audited-with-live-subagents`. Six live read-only subagents returned source/test/data/UX/docs/critic findings for this revision, and the lead rechecked the D1 reorder/restore source directly. No application tests, browser automation, migrations, provider mutations, or source edits were run during this planning pass. See `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` for the ledger and validation gap.
