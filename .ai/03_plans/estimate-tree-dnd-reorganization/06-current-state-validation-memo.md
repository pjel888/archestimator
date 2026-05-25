# 06 — Current-State Validation Memo

Validated: 2026-05-20 19:59:14 PST
Repository: `/Users/philiplewis/archestimator`
Branch at validation: `docs/estimate-tree-rct-dnd-plan`
Implementation status: planning only; no feature code changed by this memo.

## Purpose

This memo freezes the exact starting state for the drag/drop implementation slice. It exists so the builder does not start from stale assumptions, old prototype behavior, or a generic React Complex Tree recipe.

## Validation commands run

```bash
git status --short && git branch --show-current
npx gitnexus status
npx gitnexus analyze --index-only --name archestimator
npx gitnexus impact -r archestimator --include-tests isDisplayNodeKind --direction upstream
npx gitnexus impact -r archestimator --include-tests buildEstimateTree --direction upstream
npx gitnexus impact -r archestimator --include-tests EstimateSheetTree --direction upstream
npx gitnexus impact -r archestimator --include-tests createEstimateNode --direction upstream
npx gitnexus impact -r archestimator --include-tests fetchEstimateTree --direction upstream
npx gitnexus detect-changes -r archestimator
```

GitNexus state after re-index:

```text
Indexed commit: 2fa1fb3
Current commit: 2fa1fb3
Status: up-to-date
Nodes: 1,667
Edges: 3,289
Flows: 137
```

Note: GitNexus MCP tools were not exposed directly in this Hermes session, so the CLI was used. The index was refreshed with `--index-only` to avoid injecting unrelated agent files.

## Exact dependency state

From `package.json`:

- `next`: `16.2.6`
- `react`: `19.2.4`
- `react-dom`: `19.2.4`
- `react-complex-tree`: `^2.6.1`
- `@tanstack/react-query`: `5.100.10`
- `zustand`: `5.0.13`
- `@playwright/test`: `^1.60.0`
- `vitest`: `^4.1.6`
- `typescript`: `^5`

Implementation rule: before coding, pin actual installed RCT behavior against `node_modules/react-complex-tree/lib/*/types.d.ts`, not memory. The installed package exposes the required DnD API in `types.d.ts`:

- `canDragAndDrop?: boolean`
- `canDropOnFolder?: boolean`
- `canDropOnNonFolder?: boolean`
- `canReorderItems?: boolean`
- `canDrag?: (items: TreeItem<T>[]) => boolean`
- `canDropAt?: (items: TreeItem<T>[], target: DraggingPosition) => boolean`
- `onDrop?: (items: TreeItem<T>[], target: DraggingPosition) => void`
- `renderDragBetweenLine?: ({ draggingPosition, lineProps }) => ReactElement | null`

## Current route and target state

Target route:

```text
/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/77777777-7777-4777-8777-777777777729
```

Current browser/auth risk:

- Protected `/workshop/...` routes redirect to `/login` when the session is unauthenticated.
- Existing E2E coverage only checks signed-out redirect and login UI in `e2e/auth.spec.ts`.
- Drag/drop E2E cannot be credible until authenticated storage state or dev-auth setup is added.

## Highest-priority blocker: `group` read-path asymmetry

File: `src/lib/repositories/workspace-repository.ts`

Current code at lines 173-187:

```ts
type EstimateNodeKind = Database["public"]["Enums"]["estimate_node_kind"];

function isDisplayNodeKind(kind: EstimateNodeKind): kind is EstimateAreaNode["kind"] {
  return kind === "lot" || kind === "general" || kind === "structure" || kind === "level" || kind === "area";
}
```

Current effect:

- `createEstimateWithDefaultTree` creates new organizing nodes with `kind: "group"` in `src/lib/estimates/actions.ts` lines 288-357.
- `createEstimateNode` maps `group` and legacy `general` form values to `"group"` at lines 62-68 and inserts `kind` at lines 510-516.
- The repository read path then silently drops `group` nodes at `buildEstimateTree` lines 231-234 because `isDisplayNodeKind("group")` returns false.

This must be fixed before drag/drop. If it is not fixed first, the DnD tree may appear to lose Group Nodes, tests may target a partially missing tree, and optimistic state will diverge from the server tree.

Required replacement after two-kind simplification:

```ts
function isDisplayNodeKind(kind: EstimateNodeKind): kind is EstimateTreeNodeKind {
  return kind === "group" || kind === "area";
}
```

If a transition period is required because the live database still contains legacy values, do not silently display legacy values as technical kinds. Normalize them at the boundary into `group` and record the migration path explicitly.

## Current hierarchy model mismatch

File: `src/lib/estimates/tree-hierarchy.ts`

Current state:

```ts
export type EstimateTreeNodeKind = "group" | "lot" | "general" | "structure" | "level" | "area";
export type EstimateTreeGroupNodeKind = Exclude<EstimateTreeNodeKind, "area">;
const GROUP_NODE_KINDS = ["group", "lot", "general", "structure", "level"] as const;
```

This is no longer the active product model. The active model is exactly:

```ts
export type EstimateTreeNodeKind = "group" | "area";
```

Root rule remains:

- root accepts `group` only;
- `group` accepts `group` and `area`;
- `area` accepts no children.

## Current sample tree mismatch

File: `src/components/workshop/estimate-tree-data.ts`

Current sampled technical kinds include:

- top-level `kind: "lot"` at lines 269-271 and 380-382;
- `kind: "general"` at lines 275-284;
- `kind: "structure"` at lines 299-301 and 395-397;
- `kind: "level"` at lines 305-307, 336-338, and 365-367;
- `kind: "area"` for row-owning leaves.

Required change:

- Preserve names like `Lot A — Primary Residence`, `General Requirements`, `Main House`, `Ground Floor`, and `Roof Deck`.
- Convert their technical `kind` values to `"group"`.
- Keep row-owning leaf nodes as `"area"`.
- Rename the ambiguous `EstimateAreaNode` type or introduce `EstimateTreeNode` so a single type is not named as if every node is an Area Node.

Minimal conversion example:

```ts
{
  id: "lot-primary-residence",
  name: "Lot A — Primary Residence",
  kind: "group",
  children: [
    { id: "general-requirements", name: "General Requirements", kind: "group", children: [] },
    {
      id: "main-house",
      name: "Main House",
      kind: "group",
      children: [
        { id: "main-house-ground-floor", name: "Ground Floor", kind: "group", children: [
          { id: "kitchen", name: "Kitchen", kind: "area", estimateRowItems: [...] },
        ] },
      ],
    },
  ],
}
```

## Current database mismatch

Files:

- `supabase/migrations/20260518090000_archestimator_core_schema.sql`
- `supabase/migrations/20260519192045_atomic_estimate_node_moves.sql`
- `supabase/migrations/20260520100459_remove_estimate_node_move_rpc.sql`
- `src/lib/supabase/types.ts`

Current facts:

- Base enum currently includes `('lot', 'structure', 'level', 'area', 'group', 'assembly')` in the core schema migration.
- Generated Supabase type currently includes `lot`, `general`, `structure`, `level`, `area`, `group`, and `assembly` at `src/lib/supabase/types.ts` lines 473-480 and enum array lines 624-631.
- Existing hierarchy enforcement still allows legacy group-like kinds in `20260519192045_atomic_estimate_node_moves.sql` lines 72-75 and 286-289.
- Previous `public.move_estimate_nodes(uuid, jsonb)` exists in migration history, but is later dropped in `20260520100459_remove_estimate_node_move_rpc.sql` lines 3-4.

Required persistence stance:

- Do not resurrect old UI behavior.
- Do not depend on the dropped function name as if it still exists.
- Add a new deliberate function after the removal migration, recommended name:

```sql
public.reorder_estimate_nodes(target_estimate_id uuid, move_updates jsonb)
```

The new migration must either:

1. preserve legacy enum values temporarily but reject/normalize them in active app paths, or
2. perform a full enum/data migration to `group | area`.

The implementation plan recommends explicit normalization/rejection first, then a separate hard enum cleanup if needed.

## Current `EstimateSheetTree` state

File: `src/components/workshop/EstimateSheetTree.tsx`

Current facts:

- The component is already a client component.
- It imports and uses `ControlledTreeEnvironment`, `InteractionMode`, `Tree`, `TreeItem`, `TreeItemIndex`, and `TreeViewState`.
- It builds an RCT item map via `buildTreeModel(nodes)` at lines 98-126.
- RCT state is controlled through `viewState` at lines 245-251.
- Expand/collapse is local state using `expandedOverrides` at lines 213 and 221-228.
- Selection/focus is coordinated through `useEstimateWorkspaceSelection` and `router.push` only on primary action, not on focus.
- DnD props are intentionally absent: no `canDragAndDrop`, no `canReorderItems`, no `canDropOnFolder`, no `canDropAt`, no `onDrop`, no `renderDragBetweenLine`.

Required DnD stance:

- Add DnD to this controlled environment.
- Keep primary click navigation behavior separate from DnD drop behavior.
- Drop must not call `router.push`, `router.refresh`, or any form action that redirects.
- DnD state must be derived from an optimistic tree value, not directly from immutable server props.

## Current sheet state interaction

File: `src/components/workshop/EstimateSheetContent.tsx`

Current facts:

- Sheet content has its own local `estimateTree` state initialized from TanStack Query data at lines 822-830.
- It writes area tree query data during local optimistic row updates at lines 854-860.
- It resyncs from query data unless save state is dirty/saving at lines 868-874.
- Component-library drag/drop uses custom MIME type `application/x-archestimator-library-item` in row/table/empty-area targets.

Required DnD stance:

- Tree node DnD must coexist with component-library item DnD.
- Do not reuse `application/x-archestimator-library-item` for node reorganization.
- Prefer a shared estimate-tree query/state boundary if the left tree and center sheet must update simultaneously after node reorder.
- If Phase 5 keeps DnD local to `EstimateSheetTree`, it must still invalidate/reconcile the center sheet tree data after persistence without flicker.

## Existing tests that must change

Current tests explicitly assert the old or absent behavior:

- `tests/vitest/estimate-tree-data.test.ts`
  - expects top-level sample nodes to be `kind === "lot"`;
  - expects `general-requirements` and `site-works` to be `kind === "general"`;
  - asserts every legacy group-like kind nests under every other group-like kind.
- `tests/vitest/live-estimate-node-route.test.ts`
  - expects `EstimateSheetTree` not to contain `canDragAndDrop`, `canDropOnFolder`, `canReorderItems`, `renderDragBetweenLine`, `moveEstimateNode`, and related old DnD strings.
- `tests/vitest/supabase-performance-migrations.test.ts`
  - expects legacy SQL hierarchy arrays and old `move_estimate_nodes` migration/removal assertions.
- `tests/vitest/estimate-tree-modal.test.tsx`
  - imports `sampleEstimateTree` and uses selected IDs like `main-house`/`kitchen`; it must remain behavior-valid after sample kind conversion.

These tests are not failures in the current product; they are signposts. Implementation must replace them with behavior coverage for the new plan.


## Additional assessment verification on 2026-05-20 21:06 PST

Files checked:

- `src/stores/estimate-ui-store.ts`
- `src/hooks/use-estimate-query.ts`
- `src/components/workshop/EstimateSheetTree.tsx`
- `src/components/workshop/EstimateSheetContent.tsx`
- `src/lib/estimates/actions.ts`
- `node_modules/react-complex-tree/lib/*/types.d.ts`

Facts confirmed:

- `useEstimateUiStore` has prebuilt `dragState`, `expandedNodeIds`, and `selectedNodeId`, but it is unused by the app. It is not estimate-scoped and should not be activated for this MVP.
- `useMoveEstimateRowItem` is also unused. It updates `estimateQueryKeys.detail(estimateId)`, while the live sheet tree cache is `estimateQueryKeys.areaTree(estimateId)`.
- The live sheet optimistic pattern is in `EstimateSheetContent`: local `estimateTree` state plus `queryClient.setQueryData(areaTreeQueryKey, next)` and rollback through `restoreEstimateState`.
- `EstimateSheetTree` keeps `ROOT_ITEM_ID = "estimate-tree-root"` and sets `canInvokePrimaryActionOnItemContainer`; DnD tests must prove drag/drop does not trigger route navigation.
- `readEstimateNodeKind` currently accepts a legacy `general` form value and maps it to `group`; Gate A must remove that alias after the form offers only Group Node and Area Node.
- RCT v2.6.1 installed types include `TreeItem.canMove`, `canInvokePrimaryActionOnItemContainer`, and `canDropBelowOpenFolders`.

## GitNexus blast-radius evidence

### `isDisplayNodeKind`

Risk: LOW, but functionally critical.

Direct caller:

- `buildEstimateTree`

Affected process:

- `ProjectEstimateNodePage`

Affected path:

- `isDisplayNodeKind` -> `buildEstimateTree` -> `getProjectEstimateTreeByEstimate` / `getProjectEstimateTreeByNode` -> `fetchEstimateTree` / `ProjectEstimateNodePage`

Interpretation: low symbol count, high product importance. Fix first.

### `buildEstimateTree`

Risk: LOW.

Direct callers:

- `getProjectEstimateTreeByEstimate`
- `getProjectEstimateTreeByNode`

Affected process:

- `ProjectEstimateNodePage`

Interpretation: any tree normalization affects live node route and fetch server action.

### `EstimateSheetTree`

Risk: LOW by graph count, UX-critical by behavior.

Direct dependents:

- `ProjectEstimateNodePage`
- `tests/vitest/estimate-tree-modal.test.tsx` helper `renderTree`

Interpretation: route scope is contained, but browser UX requires real E2E validation.

### `createEstimateNode`

Graph impact: LOW / 0 upstream results.

Interpretation: source-inspection graph does not see server-action form binding through React/Next as a call edge. Do not treat zero graph edges as zero product impact. It is bound by `createEstimateNode.bind(null, projectId, estimateId)` inside `EstimateSheetTree` and participates in add-node hierarchy creation.

### `fetchEstimateTree`

Graph impact: LOW / 0 upstream results.

Interpretation: same caveat. It is consumed indirectly by `useEstimateRowMutations` and `EstimateSheetContent` query flow.

## Starting-state conclusion

The plan is safe to proceed only if implementation begins with the two-kind domain/read-path correction. Starting with RCT drag/drop UI before fixing `group` visibility and sample/test/domain mismatches would create false positives and likely flicker/blank-tree symptoms.

No feature implementation should begin until this memo, `07-implementation-reference.md`, and `08-verification-runbook-and-readiness-gate.md` have been read with `03-implementation-plan.md`.
