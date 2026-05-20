# 10 — Assessment Response and Decision-Closure Addendum

Status: added after reviewing two independent assessment reports on 2026-05-20 21:06 PST.
Purpose: close the remaining implementation-friction gaps before Gate A starts. This document is binding for implementation if it is more specific than earlier plan files.

## Assessment reports considered

The reports agreed that the plan pack is implementation-ready in its React Complex Tree and codebase validation, but identified decision gaps that could cause rework:

- unclear use of the unused `useEstimateUiStore`;
- unclear relationship to the dead `useMoveEstimateRowItem` optimistic pattern;
- `EstimateAreaNode` rename not mandated;
- `readEstimateNodeKind` still accepting legacy `general` as a form alias;
- no chosen enum-narrowing strategy;
- no explicit `assembly` normalization decision;
- under-specified TanStack Query cache behavior for `EstimateSheetContent`;
- unclear flat-domain vs nested-view-model return boundary;
- missing `canMove: false` guidance for the synthetic RCT root;
- missing add-node form Gate A scope;
- missing exact Supabase type-generation command;
- missing `canInvokePrimaryActionOnItemContainer` + DnD interaction test;
- minor E2E test data isolation and Headless Tree/RCT successor notes.

## Verified current facts added by this addendum

These were checked against the live codebase/package before editing the documents:

- `src/stores/estimate-ui-store.ts` exports `useEstimateUiStore` with `selectedNodeId`, `expandedNodeIds`, and `dragState`, but no component imports it.
- `src/hooks/use-estimate-query.ts` exports `useMoveEstimateRowItem`, but no code calls it. It updates `estimateQueryKeys.detail(estimateId)`, not the live sheet tree cache key.
- The live sheet uses `estimateQueryKeys.areaTree(estimateId)` in `EstimateSheetContent.tsx` and mirrors optimistic row edits by writing both local state and TanStack Query cache.
- `EstimateSheetTree.tsx` uses `ROOT_ITEM_ID = "estimate-tree-root"` and currently sets `canInvokePrimaryActionOnItemContainer` on `ControlledTreeEnvironment`.
- `src/lib/estimates/actions.ts` currently maps form value `general` to `group` in `readEstimateNodeKind`.
- Installed `react-complex-tree` v2.6.1 types expose `TreeItem.canMove`, `canInvokePrimaryActionOnItemContainer`, and `canDropBelowOpenFolders`.

## Binding decisions

### Decision 1 — Stay on React Complex Tree for MVP

Do not evaluate or migrate to Headless Tree during this feature. Philip explicitly selected `react-complex-tree`; the installed package is v2.6.1 and the plan has verified its API. Revisit Headless Tree only if RCT blocks implementation or becomes unmaintainable after MVP.

### Decision 2 — Do not activate `useEstimateUiStore` for DnD MVP

Do not use `src/stores/estimate-ui-store.ts` for this feature.

Reason:

- It is currently dead code.
- It is not scoped by `estimateId`, so it risks leaking selection/drag state between estimates.
- It does not hold the nested tree needed for reorder/reparent optimism.
- The live route already uses `useEstimateWorkspaceSelection` for selected/focused route state.

If shared state becomes necessary, implement the documented route-scoped `EstimateWorkspaceClientBoundary` or a route-scoped query/cache bridge. Do not retrofit the unused global store into this feature. Cleanup/removal of `useEstimateUiStore` can be a separate follow-up after DnD ships.

### Decision 3 — Use tree-local optimism plus an explicit TanStack Query cache mirror

The implementation must use both:

1. `EstimateSheetTree` local optimistic state with `localConfirmedTreeSignatureRef` to prevent stale route props from snapping the tree back; and
2. `queryClient.setQueryData(estimateQueryKeys.areaTree(estimateId), nextTree)` to keep `EstimateSheetContent` synchronized with the same nested tree snapshot.

Required cache policy:

- On optimistic drop: set local tree to `evaluation.plan.nextNodes` and set the `areaTree` query cache to the same nested `nextNodes`.
- On success: set local tree and `areaTree` query cache to the action-returned confirmed tree.
- On failure: rollback both local tree and `areaTree` query cache to the previous nested tree.
- Do not call `router.refresh()`.
- Do not blindly call `invalidateQueries` after a successful drop. The action returns the fresh tree; cache writing is enough for seamless UX. A later background invalidation may be added only if tests prove it does not disturb dirty/saving row edits.

This keeps the existing dual-write spirit used in `EstimateSheetContent`, while adding the tree-specific stale-prop guard that row mutations do not need.

### Decision 4 — Gate A must introduce `EstimateTreeNode`

Gate A must introduce `EstimateTreeNode` as the canonical nested tree view-model type and update all touched tree files to use it.

Rules:

- New files must not import or expose `EstimateAreaNode`.
- A temporary alias `export type EstimateAreaNode = EstimateTreeNode` is allowed only as a short compatibility bridge while the same branch updates old call sites.
- The final PR should leave no feature-path import that semantically treats every tree node as an Area Node.

### Decision 5 — Remove `general` form alias during Gate A

`readEstimateNodeKind` must accept only form values `group` and `area` after Gate A. The current `general -> group` bridge is a temporary legacy alias and should be removed when the add-node form is simplified to exactly Group Node and Area Node.

### Decision 6 — Normalize legacy DB values and add a check constraint first

Do not replace the PostgreSQL enum in the DnD feature branch unless implementation evidence proves it is low-risk. The chosen Gate A migration path is:

1. Normalize existing `estimate_nodes.kind` values:
   - `lot`, `general`, `structure`, `level`, `assembly` -> `group`;
   - keep `area` as `area`.
2. Add/validate a strict check constraint on `public.estimate_nodes`:
   - `kind in ('group', 'area')`.
3. Replace hierarchy validation logic so it enforces only:
   - root -> group;
   - group -> group or area;
   - area -> no children.
4. Keep the physical enum values temporarily because PostgreSQL enum value removal is a separate migration risk.
5. Use app/domain types and repository guards to expose only `group | area`.

This also resolves the `assembly` zombie value: if any estimate node currently has `kind = 'assembly'`, it is normalized to `group` in Gate A. Cost-library item kind `assembly` is unrelated and must not be changed.

### Decision 7 — Server action returns nested `EstimateTreeNode[]`

The reorder RPC should update rows atomically and return update count or void. The server action `reorderEstimateTreeNodes` must then fetch and return the canonical nested tree used by the UI:

```ts
type ReorderEstimateTreeNodesResult = {
  tree: EstimateTreeNode[];
};
```

Do not return the flat domain `EstimateTree = { nodes, rows }` from this action. The flat type remains an internal domain/repository shape; the client RCT integration consumes nested `EstimateTreeNode[]`.

### Decision 8 — Synthetic RCT root is not movable

The synthetic root item must be configured defensively:

```ts
[ESTIMATE_TREE_ROOT_ID]: {
  index: ESTIMATE_TREE_ROOT_ID,
  isFolder: true,
  canMove: false,
  children: nodes.map((node) => node.id),
  data: { node: null },
}
```

`canDrag` must still reject `item.data.node === null`; `canMove: false` is an additional guard, not the only guard.

### Decision 9 — Preserve row-click navigation, but test drag does not invoke it

Keep `canInvokePrimaryActionOnItemContainer` for the compact workshop tree unless tests prove it conflicts with drag/drop. Add component and E2E coverage that a drag/drop does not call `router.push`, does not select/navigate by mistake, and does not call `router.refresh`.

If tests show a click-drag conflict, fix by using an explicit drag handle or temporarily disabling primary invocation during active drag; do not accept accidental route changes as a trade-off.

### Decision 10 — Mutating E2E tests must not use the shared target estimate directly

The user-provided route remains the manual QA target. Automated mutating Playwright DnD tests must clone/reset an estimate per test or per worker before mutation. Do not run parallel tests against the same shared seed estimate.

Acceptable mechanisms:

- a Playwright fixture that creates a unique estimate/tree from seed data via local dev-admin DB access;
- a deterministic per-worker clone of the seeded estimate id;
- a local DB reset before/after the suite.

## Exact Supabase type-generation commands

After Gate A and Gate C migrations, regenerate `src/lib/supabase/types.ts` with one of these commands:

```bash
# Preferred when local Supabase is running and migrated.
npx supabase gen types typescript --local --schema public > src/lib/supabase/types.ts

# Use this when intentionally regenerating from the linked remote project.
npx supabase gen types typescript --project-id ebxxqidacheyapmmzavr --schema public > src/lib/supabase/types.ts
```

Do not hard-code secrets. If the CLI needs authentication, use the developer's existing Supabase CLI login/session or CI secrets.

## Updated implementation confidence

After these decisions, the plan pack is no longer at the 85-95% range described by the earlier reports. The later 10/10 and A- reports found only minor implementation-friction notes, now closed in `11-final-assessment-hardening-notes.md`. The remaining risk is implementation execution, not plan ambiguity. Gate A remains the correct first slice.
