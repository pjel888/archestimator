# Refactoring And Boundaries

## Phase 0 Discipline (added 2026-07-06)

Phase 0 is a one-line fix. **Do not refactor while shipping Phase 0.** The fix must be minimal and obvious so it can be reviewed and merged in isolation. Any refactor must wait until Phase 6.

## Why Refactor

`EstimateSheetTree.tsx` is 2217 lines and suppresses a giant-component warning at line 443. The issue is not merely size: reorder, create, rename, delete, bulk selection, lazy hydration, and context-menu behavior share state in one surface, making branch reorder fixes risky.

## Refactor After Behavior Lock

Do not refactor first. Add tests, fix behavior (Phase 0), then extract.

## Proposed Extraction

`useEstimateTreeReorder`

- Owns `handleTreeCanDrag`, `handleTreeCanDrop`, `handleTreeDrop`, reorder status, pending reorder count, and rollback.
- Accepts query/cache functions as dependencies.

`useEstimateTreeCrud`

- Owns create/rename/delete/bulk delete flows.
- Coordinates optimistic-id resolution via `pendingNodeCreatesRef` and `resolvedNodeIdsRef`.

`useEstimateTreeSubtreeHydration`

- Owns lazy subtree load and hydration state.

`useEstimateTreeRenameEditor`

- Owns inline rename state, focus management, and the context-menu close dance.

`EstimateTreeMoveDialog`

- Owns destination/placement rendering.
- Emits `{ sourceId, targetId, position }` or root-edge target.
- Keeps disabled reason accessibility.

`estimate-tree-node-options.ts`

- Builds destination options and placement validation from local nodes.
- Pure enough to unit test.

`EstimateTreePanel`

- Owns header, search, tree rendering, visible status slot, empty state.

`useEstimateTreeExternalDrops` (optional)

- Owns template/project/row-item MIME parsing and domain-event dispatch if Move dialog work makes the main component noisy.
- Must preserve inside-only external-drop semantics unless a separate product decision expands them.

## Shared Tree Boundary

Changes in `src/components/ui/tree.tsx` must remain generic:

- No estimate-specific text.
- No estimate-specific MIME assumptions.
- Preserve current `TreeNode` and `TreeDropPosition` public types unless tests prove a type extension is needed.

## Server-Action Boundary

Changes in `src/lib/estimates/actions.ts` must preserve:

- Every payload that calls a D1 RPC includes `target_project_id` (RC0 audit rule — see `08_SECURITY_AND_PRIVACY.md`).
- The `getCurrentWorkspaceProject` authz chain.
- The optimistic-id rejection guard.

## Things Not To Split

- Do not split server action and D1 client changes from their tests.
- Do not split drag visuals from DOM/a11y tests.
- Do not introduce a new global store for tree reorder state.
- Do not extract the optimistic-id resolution refs into a context; their colocality with the action handlers is load-bearing.
- Do not extract or pass React `useEffectEvent` callbacks as general event handlers. Effect Events are only for Effect-local logic.
- Do not move non-interactive helper code into the client module graph unless the helper actually needs client state or event handlers.
- Do not claim restore/Undo provider-ready from UI/action tests; keep D1 provider proof separate because the current D1 adapter restore path is unproven/throwing.
