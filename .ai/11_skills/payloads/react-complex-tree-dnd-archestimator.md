# React Complex Tree Drag/Drop Skill Payload — Archestimator

Use this payload when implementing, reviewing, or testing estimate-tree drag/drop reorganization in Archestimator.

Primary docs:

- Plan folder: `.ai/03_plans/estimate-tree-dnd-reorganization/`
- Reusable Hermes skill: `software-development/react-complex-tree`
- Package: `react-complex-tree` v2.6.1

## Trigger

Load/apply this payload when work touches:

- `src/components/workshop/EstimateSheetTree.tsx`
- React Complex Tree `ControlledTreeEnvironment`
- estimate tree reorder/reparent behavior
- estimate node hierarchy validation
- estimate node `parent_id` / `sort_order` persistence
- no-flicker/no-reload tree UX

## React Complex Tree master notes

Use controlled mode.

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

Enable DnD intentionally:

```tsx
<ControlledTreeEnvironment
  canDragAndDrop
  canReorderItems
  canDropOnFolder
  canDropBelowOpenFolders
  canDropOnNonFolder={false}
  canDrag={canDragEstimateItems}
  canDropAt={canDropEstimateItemsAt}
  onDrop={handleDrop}
/>
```

For MVP:

- single-node drag only;
- technical estimate node kinds are only `group` and `area`;
- canonical nested view-model type is `EstimateTreeNode`, not stale `EstimateAreaNode`;
- Group Nodes may be parents;
- Area Nodes cannot be parents;
- Area Nodes cannot be root children;
- cycle/self/descendant moves are invalid;
- no-op drops should not call the server;
- desktop pointer and keyboard DnD are required; touch/mobile DnD is out of Gate A-E scope unless Philip explicitly expands MVP scope.

Class-name helper:

- Use the verified utility `src/lib/ui/cn.ts` via `import { cn } from "@/lib/ui/cn"` for custom RCT renderer classes.
- Do not create a second `cn()`/class-merge helper in the tree feature.

## RCT drop target translation

`DraggingPosition` shapes:

```ts
type DraggingPosition =
  | {
      targetType: "item";
      treeId: string;
      linearIndex: number;
      depth: number;
      targetItem: TreeItemIndex;
      parentItem: TreeItemIndex;
    }
  | {
      targetType: "between-items";
      treeId: string;
      linearIndex: number;
      depth: number;
      childIndex: number;
      linePosition: "top" | "bottom";
      parentItem: TreeItemIndex;
    }
  | {
      targetType: "root";
      treeId: string;
      linearIndex: number;
      depth: number;
      targetItem: TreeItemIndex;
    };
```

Mapping:

- `item`: move inside `targetItem`, append by default.
- `between-items`: move into `parentItem` at `childIndex`; synthetic root maps to `parentId: null`.
- `root`: move to `parentId: null`, append by default.

Do not persist `linearIndex` or `depth`.

## Archestimator hierarchy source of truth

File:

- `src/lib/estimates/tree-hierarchy.ts`

Current rule after the two-kind simplification:

```ts
export type EstimateNodeKind = "group" | "area";

export function canNestEstimateNodeKind(childKind, parentKind) {
  if (parentKind === null) return childKind === "group";
  return parentKind === "group";
}
```

Meaning:

- Root accepts only Group Nodes.
- Group Nodes accept Group Nodes and Area Nodes.
- Area Nodes reject children.
- `lot`, `general`, `structure`, `level`, and `assembly` are not active technical estimate tree node kinds.

Do not duplicate this matrix separately in component code.

## Critical current audit findings

1. Philip's technical model is exactly two node kinds: `group` and `area`.
2. Current repo still contains legacy compatibility kinds in several files; implementation must collapse them before DnD.
3. `EstimateSheetTree` already uses RCT controlled mode but DnD is disabled.
4. `treeModel` is currently derived from server props; DnD needs optimistic local/shared state.
5. `workspace-repository.ts` currently excludes `kind === "group"` from `isDisplayNodeKind` even though Group Nodes are the primary organizing nodes.
6. A previous migration created `public.move_estimate_nodes`; a later migration drops it because old tree DnD was removed. New implementation must deliberately add a new atomic function after the removal migration.
7. Tests currently assert DnD is absent; they must be rewritten.
8. Browser navigation to the target route redirects to `/login` unless dev auth/session is configured.
9. Do not activate unused `useEstimateUiStore` for DnD MVP; use tree-local optimism plus `estimateQueryKeys.areaTree(estimateId)` cache mirroring.
10. Gate A must remove the current `general -> group` form alias and normalize legacy estimate-node values, including `assembly`, to `group` with a DB check constraint.

## Required helper design

Add pure helper file:

- `src/lib/estimates/tree-reorder.ts`

Functions:

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
```

Return a plan with:

- `nextNodes`
- `updates: { id, parentId, sortOrder }[]`
- `targetParentId`
- affected parent ids

Sort-order recommendation: renormalize affected siblings using step 10.

## Client state pattern

Inside `EstimateSheetTree` or a shared client boundary:

1. Keep `optimisticNodes` in state.
2. Derive RCT `items` and expansion defaults from `optimisticNodes`.
3. On drop, evaluate move from current `optimisticNodes`.
4. Save rollback snapshot.
5. Apply `nextNodes` immediately.
6. Mirror `nextNodes` into `queryClient.setQueryData(estimateQueryKeys.areaTree(estimateId), nextNodes)`.
7. Call server action.
8. On success, reconcile returned nested tree and mirror it into the same query cache.
9. On failure, rollback both local tree and query cache, then show accessible error.
10. Use `localConfirmedTreeSignatureRef` so stale route props cannot overwrite the action-returned confirmed tree.

Never call `router.refresh()` on drop. Do not blindly invalidate the area-tree query after success unless tests prove it cannot disturb dirty/saving sheet edits.

## Server persistence pattern

Add action:

```ts
reorderEstimateTreeNodes(projectId, estimateId, { updates })
```

The action must:

- validate workspace/project/estimate ownership;
- validate moved nodes and parents belong to same estimate;
- validate hierarchy/cycles;
- call one atomic DB function, not per-row updates;
- return `{ tree: EstimateTreeNode[] }`, where `tree` is the confirmed fresh nested tree consumed by the RCT client;
- not return the flat domain `EstimateTree = { nodes, rows }`;
- not redirect.

Recommended DB function name:

- `public.reorder_estimate_nodes(target_estimate_id uuid, move_updates jsonb)`

Reason: `move_estimate_nodes` was intentionally dropped by an existing migration.

## Test requirements

Unit:

- two-kind model enforced (`group | area` only);
- Group Node root reorder;
- same-parent reorder;
- Group Node reparent;
- Area Node reparent under Group Node;
- reject Area Node as parent/root;
- reject legacy node kinds as active tree kinds;
- reject cycles/self;
- reject no-op;
- sort order uniqueness;
- row items/subtrees preserved.

Component:

- valid drop calls reorder action once;
- optimistic DOM order before server resolves;
- failure rollback;
- invalid drop no action;
- synthetic root has `canMove: false`, and `canDrag` rejects root/null-data items;
- `canInvokePrimaryActionOnItemContainer` does not trigger `router.push` during drag/drop;
- no `router.push` / `router.refresh` on drop;
- selected/expanded/focused state preserved;

Playwright:

- authenticated target route loads;
- real drag/drop works;
- visual update immediate;
- reload proves persistence;
- no document navigation;
- URL/selected route do not change during drop;
- no blank/flicker frames;
- invalid drops blocked;
- first local DnD proof runs with retries disabled; retry-only passes remain open risks.

Flake policy:

- Inspect trace/video/error-context before rerunning a failed DnD spec.
- Fix readiness/pointer precision with stable selectors or instrumentation waits, not broad sleeps.
- CI may use `retries: process.env.CI ? 1 : 0` only after local no-retry proof, paired with `trace: "on-first-retry"` and `video: "retain-on-failure"`.
- Use serial mode only for specs that mutate the same isolated estimate fixture; prefer cloned/reset per-test data.

## Pitfalls

- Do not use RCT `linearIndex` or `depth` as persistence data.
- Do not rely only on JSDOM for real drag/drop.
- Do not allow RCT visual acceptance for invalid domain drops.
- Do not remount the tree on saving state.
- Do not mutate seed data in parallel e2e tests without cloning/resetting.
- Do not stage unrelated `AGENTS.md` / `CLAUDE.md` changes.
