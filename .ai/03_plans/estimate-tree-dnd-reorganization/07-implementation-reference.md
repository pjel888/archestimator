# 07 — Implementation Reference

Status: code-ready reference, not feature implementation.
Last verified against current repo: 2026-05-20 19:59 PST.

Use this as the single reference for names, types, helper contracts, snippets, and test expectations. If another plan file conflicts with this file, treat this file plus `00-two-node-domain-decision.md` and `06-current-state-validation-memo.md` as the tie-breaker.

## Required read order before coding

1. `.ai/README.md`
2. `.ai/00_system/ai-folder-canonical-map.md`
3. `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
4. `.ai/10_state/current-state.md`
5. `.ai/10_state/decisions.md`
6. `DESIGN.md`
7. `.ai/03_plans/estimate-tree-dnd-reorganization/00-two-node-domain-decision.md`
8. `.ai/03_plans/estimate-tree-dnd-reorganization/06-current-state-validation-memo.md`
9. this file
10. `.ai/03_plans/estimate-tree-dnd-reorganization/08-verification-runbook-and-readiness-gate.md`

## Naming decisions

### Technical node kinds

Allowed active technical kinds:

```ts
export type EstimateTreeNodeKind = "group" | "area";
```

Forbidden as active technical tree kinds:

```txt
lot, general, structure, level, assembly
```

Those words may appear in user-visible `name`, metadata, labels, tests, and seeded project content, but not as `estimate_nodes.kind` values after the two-kind implementation slice.

### User-visible labels

Keep user-facing names. Do not rename project content just because technical kinds are collapsed.

Examples:

- `Lot A — Primary Residence` remains a node `name`; its `kind` becomes `"group"`.
- `General Requirements` remains a node `name`; its `kind` becomes `"group"`.
- `Main House`, `Ground Floor`, `Roof Deck`, `Trade`, `Phase`, and similar labels remain content/UX concepts on Group Nodes.

### View-model type naming

Current type name `EstimateAreaNode` is semantically stale because it represents both organizing nodes and row-owning area nodes.

Preferred implementation path:

1. Introduce `EstimateTreeNode` as the canonical view-model type.
2. Keep a temporary alias only if it reduces churn:

```ts
export type EstimateAreaNode = EstimateTreeNode;
```

3. Gradually update component imports to `EstimateTreeNode` during the same branch or a follow-up cleanup.
4. Do not create a new type that reintroduces legacy kind names.

Target shape:

```ts
export type EstimateTreeNode = {
  id: string;
  name: string;
  kind: EstimateTreeNodeKind;
  total: string;
  children?: EstimateTreeNode[];
  estimateRowItems?: EstimateRowItem[];
};
```

## Phase 2 exact code targets

### `src/lib/estimates/tree-hierarchy.ts`

Replace the legacy compatibility matrix with the exact active model:

```ts
export type EstimateTreeNodeKind = "group" | "area";
export type EstimateTreeDisplayNodeKind = EstimateTreeNodeKind;

export function isEstimateTreeNodeKind(value: string): value is EstimateTreeNodeKind {
  return value === "group" || value === "area";
}

export function isEstimateGroupNodeKind(kind: EstimateTreeNodeKind | null | undefined): kind is "group" {
  return kind === "group";
}

export function getEstimateNodeDisplayKind(kind: EstimateTreeNodeKind): EstimateTreeDisplayNodeKind {
  return kind;
}

export function canNestEstimateNodeKind(childKind: EstimateTreeNodeKind, parentKind: EstimateTreeNodeKind | null) {
  if (parentKind === null) return childKind === "group";
  return parentKind === "group";
}

export function formatEstimateNodeKind(kind: EstimateTreeNodeKind | null) {
  if (!kind) return "estimate root";
  return kind === "group" ? "group" : "area";
}

export function getEstimateNodeNestingError(childKind: EstimateTreeNodeKind, parentKind: EstimateTreeNodeKind | null) {
  return `${formatEstimateNodeKind(childKind)} nodes cannot be placed under ${formatEstimateNodeKind(parentKind)}.`;
}
```

### `src/lib/repositories/workspace-repository.ts`

Current blocker from validation memo:

```ts
function isDisplayNodeKind(kind: EstimateNodeKind): kind is EstimateAreaNode["kind"] {
  return kind === "lot" || kind === "general" || kind === "structure" || kind === "level" || kind === "area";
}
```

Required target:

```ts
function isDisplayNodeKind(kind: EstimateNodeKind): kind is EstimateTreeNode["kind"] {
  return kind === "group" || kind === "area";
}
```

If generated Supabase enum types still expose legacy values during a transition, keep the input type broad but narrow the output explicitly:

```ts
type DatabaseEstimateNodeKind = Database["public"]["Enums"]["estimate_node_kind"];

type ActiveEstimateNodeKind = "group" | "area";

function isDisplayNodeKind(kind: DatabaseEstimateNodeKind): kind is ActiveEstimateNodeKind {
  return kind === "group" || kind === "area";
}
```

Do not continue displaying `lot`, `general`, `structure`, or `level` as technical kinds after Phase 2. Normalize legacy rows first if live data still contains them.

### `src/components/workshop/estimate-tree-data.ts`

Convert technical kinds only. Preserve labels and row data.

Before:

```ts
{
  id: "lot-primary-residence",
  name: "Lot A — Primary Residence",
  kind: "lot",
  children: [
    { id: "general-requirements", name: "General Requirements", kind: "general", children: [] },
    { id: "main-house", name: "Main House", kind: "structure", children: [
      { id: "main-house-ground-floor", name: "Ground Floor", kind: "level", children: [
        { id: "kitchen", name: "Kitchen", kind: "area", estimateRowItems: [...] },
      ] },
    ] },
  ],
}
```

After:

```ts
{
  id: "lot-primary-residence",
  name: "Lot A — Primary Residence",
  kind: "group",
  children: [
    { id: "general-requirements", name: "General Requirements", kind: "group", children: [] },
    { id: "main-house", name: "Main House", kind: "group", children: [
      { id: "main-house-ground-floor", name: "Ground Floor", kind: "group", children: [
        { id: "kitchen", name: "Kitchen", kind: "area", estimateRowItems: [...] },
      ] },
    ] },
  ],
}
```

Current line references from validation:

- `kind: "lot"`: current sample lines 269-271 and 380-382.
- `kind: "general"`: current sample lines 275-284.
- `kind: "structure"`: current sample lines 299-301 and 395-397.
- `kind: "level"`: current sample lines 305-307, 336-338, 365-367.
- `kind: "area"`: row-owning leaves; keep as `area`.

## Reorder helper contract

Add file:

```txt
src/lib/estimates/tree-reorder.ts
```

The helper must be pure. It must not import React, Next router, Supabase, server actions, Zustand, or TanStack Query. It may import RCT types only as TypeScript types.

### Constants

```ts
export const ESTIMATE_TREE_ROOT_ID = "estimate-tree-root";
export const ESTIMATE_TREE_SORT_ORDER_STEP = 10;
```

If `EstimateSheetTree.tsx` already has a `ROOT_ITEM_ID` constant, export/reuse a shared constant or keep string values identical. Current component value is `"estimate-tree-root"`; root-level RCT `between-items` drops will break if helper and component disagree.

### Types

```ts
import type { DraggingPosition, TreeItemIndex } from "react-complex-tree";
import type { EstimateTreeNode } from "@/components/workshop/estimate-tree-data";

export type EstimateNodeReorderUpdate = {
  id: string;
  parentId: string | null;
  sortOrder: number;
};

export type EstimateTreeReorderPlan = {
  movedIds: string[];
  targetParentId: string | null;
  nextNodes: EstimateTreeNode[];
  updates: EstimateNodeReorderUpdate[];
  affectedParentIds: Array<string | null>;
};

export type EstimateTreeReorderErrorCode =
  | "empty-drag"
  | "multi-drag-not-supported"
  | "root-drag-not-supported"
  | "unknown-dragged-node"
  | "unknown-target-node"
  | "invalid-root-child"
  | "invalid-parent-kind"
  | "cycle"
  | "no-op";

export type EstimateTreeReorderEvaluation =
  | { ok: true; plan: EstimateTreeReorderPlan }
  | { ok: false; code: EstimateTreeReorderErrorCode; message: string };
```

### Function signatures

```ts
export function evaluateEstimateTreeDrop(args: {
  nodes: EstimateTreeNode[];
  draggedItemIds: TreeItemIndex[];
  target: DraggingPosition;
}): EstimateTreeReorderEvaluation;

export function buildEstimateNodeReorderPlan(args: {
  nodes: EstimateTreeNode[];
  draggedNodeId: string;
  targetParentId: string | null;
  targetIndex: number;
}): EstimateTreeReorderEvaluation;

export function applyEstimateNodeReorder(args: {
  nodes: EstimateTreeNode[];
  draggedNodeId: string;
  targetParentId: string | null;
  targetIndex: number;
}): EstimateTreeReorderPlan;

export function flattenEstimateTree(nodes: EstimateTreeNode[]): Array<{
  node: EstimateTreeNode;
  parentId: string | null;
  sortIndex: number;
  ancestorIds: string[];
}>;

export function getEstimateNodeById(nodes: EstimateTreeNode[], nodeId: string): EstimateTreeNode | null;

export function getDescendantEstimateNodeIds(node: EstimateTreeNode): Set<string>;
```

### RCT target translation

Use installed `react-complex-tree` v2.6.1 `DraggingPosition` shapes.

Mapping:

```ts
function getReorderTargetFromDraggingPosition(
  nodes: EstimateTreeNode[],
  draggedNodeId: string,
  target: DraggingPosition,
): { parentId: string | null; targetIndex: number } | { error: "unknown-target-node" } {
  switch (target.targetType) {
    case "item":
      return { parentId: String(target.targetItem), targetIndex: getChildCount(nodes, String(target.targetItem)) };
    case "between-items":
      return {
        parentId: target.parentItem === ESTIMATE_TREE_ROOT_ID ? null : String(target.parentItem),
        targetIndex: target.childIndex,
      };
    case "root":
      return { parentId: null, targetIndex: getRootCount(nodes) };
  }
}
```

Important:

- Do not persist RCT `linearIndex`.
- Do not persist RCT `depth`.
- For same-parent moves, remove the dragged node before applying target index. If the original index is lower than the target index, decrement insertion index by 1 after removal.
- Clamp target index to the target sibling list length after removal.

### Reorder validity rules

Valid:

- `group` to root.
- `group` inside `group`.
- `area` inside `group`.
- reorder among siblings if parent remains valid.

Invalid:

- `area` to root.
- any node inside `area`.
- node inside itself.
- node inside descendant.
- unknown dragged node.
- unknown target parent.
- synthetic root item dragged.
- multi-drag in MVP.
- no-op drop where parent and sibling order do not change.

Use `canNestEstimateNodeKind(child.kind, parent?.kind ?? null)` as the rule source. Do not duplicate a second hierarchy matrix in the helper.

### Sort-order payload

Use deterministic affected-sibling renormalization:

```ts
const sortOrderForIndex = (index: number) => (index + 1) * ESTIMATE_TREE_SORT_ORDER_STEP;
```

Generate updates for:

- every sibling in the old parent after removal;
- every sibling in the new parent after insertion;
- the moved node itself with its new `parentId` and `sortOrder`.

If old parent and new parent are the same, update only that one sibling set.

Payload example for moving `kitchen` under `site-works` as first child:

```ts
{
  movedIds: ["kitchen"],
  targetParentId: "site-works",
  affectedParentIds: ["main-house-ground-floor", "site-works"],
  updates: [
    { id: "kitchen", parentId: "site-works", sortOrder: 10 },
    { id: "site-works-front-yard", parentId: "site-works", sortOrder: 20 },
    { id: "foyer", parentId: "main-house-ground-floor", sortOrder: 10 },
    { id: "living-area", parentId: "main-house-ground-floor", sortOrder: 20 },
  ],
}
```

The exact ids in tests may differ. The contract is the important part: affected siblings get unique deterministic sort orders and unaffected branches are not in `updates`.

## Server action contract

Add to:

```txt
src/lib/estimates/actions.ts
```

Recommended names:

```ts
export type ReorderEstimateTreeNodesInput = {
  updates: Array<{
    id: string;
    parentId: string | null;
    sortOrder: number;
  }>;
};

export type ReorderEstimateTreeNodesResult = {
  tree: EstimateTreeNode[];
};

export async function reorderEstimateTreeNodes(
  projectId: string,
  estimateId: string,
  input: ReorderEstimateTreeNodesInput,
): Promise<ReorderEstimateTreeNodesResult>;
```

If an earlier local branch used `moveEstimateTreeNodes`, rename it to `reorderEstimateTreeNodes` during this implementation. The verb `reorder` better matches the feature: it covers sibling reorder and reparenting without implying the removed single-pointer Move modal workflow.

Do not use the old name `moveEstimateNode` from the removed modal workflow.

### Client-to-RPC mapping

Client/helper payload uses camelCase:

```ts
{ id: "kitchen", parentId: "site-works", sortOrder: 10 }
```

RPC payload should use database field names:

```ts
{ id: "kitchen", parent_id: "site-works", sort_order: 10 }
```

Action conversion:

```ts
const reorderUpdates = input.updates.map((update) => ({
  id: update.id,
  parent_id: update.parentId,
  sort_order: update.sortOrder,
}));

const { error } = await supabase.rpc("reorder_estimate_nodes", {
  target_estimate_id: estimateId,
  move_updates: reorderUpdates,
});
```

Then return fresh tree:

```ts
const result = await getProjectEstimateTreeByEstimate(projectId, estimateId);
if (!result.estimate) throw new Error("Estimate not found.");
return { tree: result.tree };
```

Do not call `redirect()` in the action. Do not require the client to call `router.refresh()` after drop.

### Action validation checklist

Before RPC:

- verify user/workspace/project/estimate scope;
- verify `input.updates` is non-empty;
- verify update ids are unique;
- verify parent ids either null or unique valid UUIDs;
- load moved and parent nodes in the target estimate;
- reject any node with inactive kind outside `group | area`;
- reject `area` root child updates;
- reject parent id whose kind is not `group`;
- reject obvious self-parent updates;
- return user-friendly errors where possible.

Database still must enforce final atomic correctness.

## Database function contract

Add new migration after `20260520100459_remove_estimate_node_move_rpc.sql`.

Recommended function default:

```sql
create or replace function public.reorder_estimate_nodes(
  target_estimate_id uuid,
  move_updates jsonb
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
-- validate payload, lock affected rows, update parent_id/sort_order, return updated_count.
-- RLS remains active because this function is SECURITY INVOKER.
$$;

revoke execute on function public.reorder_estimate_nodes(uuid, jsonb) from public;
grant execute on function public.reorder_estimate_nodes(uuid, jsonb) to authenticated;
```

If a `SECURITY DEFINER` function is required for constraint deferral, locking, or migration compatibility, the function must add an explicit authorization check before any update. The check must prove the calling `auth.uid()` is a member of the estimate's workspace through the active project/estimate relationship. Do not rely only on the server action for this because authenticated clients can call granted RPCs directly.

Minimum authorization shape for a definer function:

```sql
if not exists (
  select 1
  from public.estimates estimate
  join public.projects project on project.id = estimate.project_id
  join public.workspace_members member on member.workspace_id = project.workspace_id
  where estimate.id = target_estimate_id
    and member.user_id = auth.uid()
) then
  raise exception 'Not authorized to reorder estimate nodes.' using errcode = '42501';
end if;
```

Keep the server action project/estimate validation as defense in depth even when the RPC enforces authorization.

Return type should be `integer` unless there is a deliberate reason to return `void`, because the implementation can then assert the DB updated exactly the expected number of rows.

Supabase generated type target:

```ts
reorder_estimate_nodes: {
  Args: {
    target_estimate_id: string;
    move_updates: Json;
  };
  Returns: number;
};
```

Required database validations:

- caller is authorized for the estimate's workspace/project, either through `SECURITY INVOKER` RLS or an explicit `auth.uid()` workspace-membership check inside a `SECURITY DEFINER` function;
- payload is a JSON array;
- every payload row has `id`, `parent_id`, `sort_order`;
- ids are UUIDs;
- no duplicate moved ids;
- no duplicate `(parent_id, sort_order)` in payload;
- all moved ids belong to `target_estimate_id`;
- all non-null parent ids belong to `target_estimate_id`;
- no parent id points to an `area` node;
- no root child update sets `kind = area`;
- no cycle after update;
- `estimate_row_items.node_id` remains attached only to `area` nodes;
- update count equals payload count.

Two-kind hierarchy SQL check:

```sql
(child.parent_id is null and child.kind = 'group')
or (parent.kind = 'group' and child.kind in ('group', 'area'))
```

## Client component contract

File:

```txt
src/components/workshop/EstimateSheetTree.tsx
```

Current component already uses `ControlledTreeEnvironment`. Add DnD to that existing controlled environment.

### RCT imports

```ts
import {
  ControlledTreeEnvironment,
  InteractionMode,
  Tree,
  type DraggingPosition,
  type TreeItem,
  type TreeItemIndex,
  type TreeViewState,
} from "react-complex-tree";
```

### State

Reconciliation must not overwrite a confirmed local reorder with stale server props. Use a tree-structure signature guard:

```ts
const [optimisticNodes, setOptimisticNodes] = useState(nodes);
const rollbackRef = useRef<EstimateTreeNode[] | null>(null);
const localConfirmedTreeSignatureRef = useRef<string | null>(null);
const [moveState, setMoveState] = useState<"idle" | "saving" | "failed">("idle");
const [moveError, setMoveError] = useState<string | null>(null);
```

```ts
useEffect(() => {
  if (moveState === "saving") return;

  const incomingSignature = getEstimateTreeStructureSignature(nodes);
  if (
    localConfirmedTreeSignatureRef.current !== null &&
    localConfirmedTreeSignatureRef.current !== incomingSignature
  ) {
    return;
  }

  localConfirmedTreeSignatureRef.current = null;
  setOptimisticNodes(nodes);
}, [nodes, moveState]);
```

`getEstimateTreeStructureSignature` can live beside the reorder helper. It should encode stable structural fields only: id, parent relationship, child order, kind, and sort order if available. Do not include transient UI fields such as expanded/focused state.

On action success, set the optimistic tree to the action-returned fresh tree, set `localConfirmedTreeSignatureRef.current` to that tree's signature, then clear `moveState`. This prevents the next effect pass from snapping back to stale route props while still allowing later matching server props to converge.

### DnD handlers

```ts
const canDragEstimateItems = useCallback((items: TreeItem<EstimateTreeItemData>[]) => {
  return moveState !== "saving" && items.length === 1 && items.every((item) => item.data.node !== null);
}, [moveState]);

const canDropEstimateItemsAt = useCallback((items: TreeItem<EstimateTreeItemData>[], target: DraggingPosition) => {
  if (moveState === "saving") return false;
  return evaluateEstimateTreeDrop({
    nodes: optimisticNodes,
    draggedItemIds: items.map((item) => item.index),
    target,
  }).ok;
}, [moveState, optimisticNodes]);

const handleDrop = useCallback(async (items: TreeItem<EstimateTreeItemData>[], target: DraggingPosition) => {
  const evaluation = evaluateEstimateTreeDrop({
    nodes: optimisticNodes,
    draggedItemIds: items.map((item) => item.index),
    target,
  });

  if (!evaluation.ok) {
    setMoveError(evaluation.message);
    return;
  }

  rollbackRef.current = optimisticNodes;
  setMoveError(null);
  setMoveState("saving");
  setOptimisticNodes(evaluation.plan.nextNodes);

  try {
    const result = await reorderEstimateTreeNodes(projectId, estimateId, {
      updates: evaluation.plan.updates,
    });
    const confirmedTree = result.tree;
    localConfirmedTreeSignatureRef.current = getEstimateTreeStructureSignature(confirmedTree);
    setOptimisticNodes(confirmedTree);
    rollbackRef.current = null;
    setMoveState("idle");
  } catch (error) {
    setOptimisticNodes(rollbackRef.current ?? nodes);
    rollbackRef.current = null;
    setMoveState("failed");
    setMoveError(error instanceof Error ? error.message : "Could not move estimate node.");
  }
}, [estimateId, optimisticNodes, projectId, nodes]);
```

### ControlledTreeEnvironment props

```tsx
<ControlledTreeEnvironment
  items={treeModel.items}
  getItemTitle={(item) => item.data.node?.name ?? projectName}
  viewState={viewState}
  canDragAndDrop
  canReorderItems
  canDropOnFolder
  canDropBelowOpenFolders
  canDropOnNonFolder={false}
  canDrag={canDragEstimateItems}
  canDropAt={canDropEstimateItemsAt}
  onDrop={handleDrop}
  renderDragBetweenLine={({ draggingPosition, lineProps }) => (
    <div {...lineProps} data-estimate-tree-drop-line="true" />
  )}
  // keep existing renderers/click/expand/focus handlers
>
```

Keep `onPrimaryAction` route navigation unchanged for click/keyboard activation. Do not call it from `onDrop`.

### Required selectors/status

Add/preserve:

- `data-estimate-tree-root="true"` on a stable tree container.
- `data-estimate-tree-node-id={node.id}` on item rows.
- `data-estimate-tree-active-node="true"` for selected item.
- `data-estimate-tree-moving="true"` on tree root while save is pending.
- `data-estimate-tree-drop-line="true"` on the between-items drop line.
- `role="status"` live region with saving/saved/error messages.

## Shared state conditional path

Default MVP path:

- Keep optimistic DnD state local to `EstimateSheetTree`.
- Reconcile from action-returned fresh tree.
- Invalidate/update any TanStack Query area-tree cache touched by `EstimateSheetContent` only after persistence succeeds.

Escalate to shared client boundary if any browser QA case shows visible mismatch between left tree and center sheet:

- selected area moves but breadcrumb/path/totals in center sheet do not match;
- moved parent group contains selected area and center sheet loses context;
- tree shows new order but center sheet reverts from query refetch;
- flicker occurs because two components hold competing tree snapshots.

Shared boundary option:

```txt
src/components/workshop/EstimateWorkspaceClientBoundary.tsx
```

Responsibilities:

- own `optimisticNodes` once;
- pass nodes to `EstimateSheetTree` and `EstimateSheetContent`;
- own reorder mutation state;
- update TanStack Query cache after successful persistence;
- keep route selection state in existing `useEstimateWorkspaceSelection` store.

Do not introduce the shared boundary preemptively if Phase 5 browser QA proves tree-local state is seamless. Simpler architecture wins unless tests show mismatch.

## Test case source of truth

### Unit tests: `tests/vitest/estimate-tree-reorder.test.ts`

Must include:

1. Group root sibling reorder.
2. Same-parent sibling reorder under Group Node.
3. Reparent Group Node into Group Node.
4. Reparent Area Node into Group Node.
5. Reject Area Node as parent.
6. Reject Area Node at root.
7. Reject cycle/descendant move.
8. Reject self-drop.
9. Reject unknown dragged node.
10. Reject unknown target node.
11. Reject multi-drag.
12. Reject synthetic root drag.
13. Detect no-op.
14. Preserve row items on moved Area Node.
15. Preserve subtree on moved Group Node.
16. Generate deterministic unique sort orders for affected siblings only.
17. Translate all three RCT target types: `item`, `between-items`, `root`.
18. Fail fixture if any active node kind is not `group | area`.

### Component tests: `tests/vitest/estimate-sheet-tree-dnd.test.tsx`

Must include:

1. Renders DnD-enabled RCT props through behavior, not brittle string matching.
2. Valid drop updates DOM order before server action resolves.
3. Valid drop calls reorder action once with expected updates.
4. Server success reconciles returned tree.
5. Server failure rolls back previous DOM order and shows status/error.
6. Invalid drop does not call action.
7. No-op drop does not call action.
8. While saving, a second drop is rejected or serialized by explicit policy.
9. Selected node remains selected after moving itself.
10. Selected descendant remains selected after moving its parent.
11. Expanded groups remain expanded when ids are unchanged.
12. `router.push` and `router.refresh` are not called by drop.

### Server action tests: `tests/vitest/estimate-node-reorder-action.test.ts`

Must include:

1. Reject empty updates.
2. Reject duplicate moved ids.
3. Reject inactive/legacy node kinds in loaded DB rows.
4. Reject parent id from another estimate/project.
5. Reject Area Node as parent.
6. Reject Area Node at root.
7. Converts camelCase payload to snake_case RPC payload.
8. Calls `rpc("reorder_estimate_nodes", ...)` exactly once for a valid move.
9. Returns fresh tree from repository after success.
10. Converts Supabase/RPC errors into user-readable failure.

### Migration tests: `tests/vitest/supabase-performance-migrations.test.ts`

Must include:

1. New migration appears after `20260520100459_remove_estimate_node_move_rpc.sql`.
2. New migration creates `public.reorder_estimate_nodes`, not old UI function dependency.
3. Historical removal of `move_estimate_nodes` remains true.
4. Function validates JSON array payload.
5. Function checks duplicate ids and duplicate target sort slots.
6. Function checks all moved/parent ids belong to target estimate.
7. Function enforces root `group` and parent `group -> group|area` matrix.
8. Function rejects Area Node parents and Area Node root children.
9. Function checks cycles or calls existing tree validation trigger/function that checks cycles.
10. Function grants execute to authenticated and revokes public.

### Playwright tests: `e2e/estimate-tree-dnd.spec.ts`

Must include:

1. Authenticated target route or isolated cloned estimate route loads without `/login` redirect.
2. Root Group Node reorder updates immediately and persists after reload.
3. Same-parent reorder updates immediately and persists.
4. Group reparent changes indentation/depth, preserves subtree, persists.
5. Area reparent preserves row items and persists.
6. Invalid Area-as-parent drop is blocked with no action/persistence.
7. Invalid cycle drop is blocked.
8. Failure rollback with accessible error.
9. No document navigation during drop.
10. No blank tree frames during drag/drop window.
11. Selection/focus/expansion stable after move.

## React Complex Tree v2.6.1 facts to preserve

Validated from installed `node_modules/react-complex-tree/lib/*/types.d.ts`:

```ts
canDragAndDrop?: boolean;
canDropOnFolder?: boolean;
canDropOnNonFolder?: boolean;
canReorderItems?: boolean;
canDrag?: (items: TreeItem<T>[]) => boolean;
canDropAt?: (items: TreeItem<T>[], target: DraggingPosition) => boolean;
onDrop?: (items: TreeItem<T>[], target: DraggingPosition) => void;
renderDragBetweenLine?: (props: { draggingPosition: DraggingPosition; lineProps: HTMLProps<any> }) => React.ReactElement | null;
```

The builder must re-check these installed types after dependency updates. Do not rely on website docs alone if package version changes.

## Do-not-implement list

- Do not restore the old single-pointer Move modal/button as the main solution.
- Do not call the old `moveEstimateNode` server action name.
- Do not call the old `public.move_estimate_nodes` RPC from new client code.
- Do not implement drag/drop before `group` read-path visibility is fixed.
- Do not display `lot`, `general`, `structure`, `level`, or `assembly` as active technical node kinds.
- Do not require a page reload to show the new order.
- Do not use multiple independent client-side update requests for one move.
- Do not mutate shared seed E2E data in parallel without isolation/reset.
- Do not hard-code secrets or Supabase keys for Playwright auth.
