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
- group-like nodes may be parents;
- area nodes cannot be parents;
- area nodes cannot be root children;
- cycle/self/descendant moves are invalid;
- no-op drops should not call the server.

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

Current rule:

```ts
export function canNestEstimateNodeKind(childKind, parentKind) {
  if (parentKind === null) return isEstimateGroupNodeKind(childKind);
  return isEstimateGroupNodeKind(parentKind);
}
```

Meaning:

- Root accepts only group-like nodes.
- Group-like parents accept children.
- Area parents reject children.

Do not duplicate this matrix separately in component code.

## Critical current audit findings

1. `EstimateSheetTree` already uses RCT controlled mode but DnD is disabled.
2. `treeModel` is currently derived from server props; DnD needs optimistic local/shared state.
3. `workspace-repository.ts` currently excludes `kind === "group"` from `isDisplayNodeKind` even though group is in the domain type and the create action stores group nodes.
4. A previous migration created `public.move_estimate_nodes`; a later migration drops it because old tree DnD was removed. New implementation must deliberately add a new atomic function after the removal migration.
5. Tests currently assert DnD is absent; they must be rewritten.
6. Browser navigation to the target route redirects to `/login` unless dev auth/session is configured.

## Required helper design

Add pure helper file:

- `src/lib/estimates/tree-reorder.ts`

Functions:

```ts
export function evaluateEstimateTreeDrop(args: {
  nodes: EstimateAreaNode[];
  draggedItemIds: TreeItemIndex[];
  target: DraggingPosition;
}): EstimateTreeMoveEvaluation;

export function buildEstimateNodeMovePlan(args: {
  nodes: EstimateAreaNode[];
  draggedNodeId: string;
  targetParentId: string | null;
  targetIndex: number;
}): EstimateTreeMoveEvaluation;
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
6. Call server action.
7. On success, reconcile returned tree.
8. On failure, rollback and show accessible error.

Never call `router.refresh()` on drop.

## Server persistence pattern

Add action:

```ts
moveEstimateTreeNodes(projectId, estimateId, { updates })
```

The action must:

- validate workspace/project/estimate ownership;
- validate moved nodes and parents belong to same estimate;
- validate hierarchy/cycles;
- call one atomic DB function, not per-row updates;
- return fresh tree or a normalized success result;
- not redirect.

Recommended DB function name:

- `public.reorder_estimate_nodes(target_estimate_id uuid, move_updates jsonb)`

Reason: `move_estimate_nodes` was intentionally dropped by an existing migration.

## Test requirements

Unit:

- root reorder;
- same-parent reorder;
- group reparent;
- area reparent under group;
- reject area as parent/root;
- reject cycles/self;
- reject no-op;
- sort order uniqueness;
- row items/subtrees preserved.

Component:

- valid drop calls move action once;
- optimistic DOM order before server resolves;
- failure rollback;
- invalid drop no action;
- no `router.push` / `router.refresh` on drop;
- selected/expanded/focused state preserved.

Playwright:

- authenticated target route loads;
- real drag/drop works;
- visual update immediate;
- reload proves persistence;
- no document navigation;
- no blank/flicker frames;
- invalid drops blocked.

## Pitfalls

- Do not use RCT `linearIndex` or `depth` as persistence data.
- Do not rely only on JSDOM for real drag/drop.
- Do not allow RCT visual acceptance for invalid domain drops.
- Do not remount the tree on saving state.
- Do not mutate seed data in parallel e2e tests without cloning/resetting.
- Do not stage unrelated `AGENTS.md` / `CLAUDE.md` changes.
