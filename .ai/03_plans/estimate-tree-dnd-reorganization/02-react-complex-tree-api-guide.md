# 02 — React Complex Tree API Guide for Archestimator

Package audited: `react-complex-tree` v2.6.1
Sources inspected:

- `node_modules/react-complex-tree/package.json`
- `node_modules/react-complex-tree/README.md`
- `node_modules/react-complex-tree/lib/esm/types.d.ts`
- `node_modules/react-complex-tree/src/stories/BasicExamples.stories.tsx`
- `node_modules/react-complex-tree/src/stories/ControlledEnvironment.stories.tsx`
- `node_modules/react-complex-tree/src/stories/DndConfigurability.stories.tsx`
- `node_modules/react-complex-tree/src/uncontrolledEnvironment/StaticTreeDataProvider.ts`
- `node_modules/react-complex-tree/src/drag/useCanDropAt.ts`
- `https://rct.lukasbach.com/docs/api/`
- `https://rct.lukasbach.com/docs/guides/controlled-environment`
- `https://rct.lukasbach.com/docs/guides/drag-and-drop`
- `https://rct.lukasbach.com/docs/getstarted`
- `https://rct.lukasbach.com/docs/guides/rendering`
- `https://rct.lukasbach.com/docs/guides/static-data-provider`

## Package facts

Installed version: `2.6.1`

Package entrypoints:

- `main`: `lib/cjs/index.js`
- `module`: `lib/esm/index.js`
- `typings`: `lib/esm/index.d.ts`
- style: `lib/style-modern.css`

RCT description from package: “Unopinionated Accessible Tree Component with Multi-Select and Drag-And-Drop”.

RCT has zero runtime dependencies and peer dependency `react >=16.0.0`.

## Recommended Archestimator usage mode

Use `ControlledTreeEnvironment`, not `UncontrolledTreeEnvironment`.

Reason:

- Archestimator route selection is already controlled by route/store state.
- Expanded/collapsed state is already controlled in `EstimateSheetTree`.
- Drag/drop must update the tree optimistically before persistence returns.
- Invalid drops must be blocked with domain rules before acceptance.
- Persistence must be app-controlled and atomic.

`UncontrolledTreeEnvironment` with `StaticTreeDataProvider` is useful for demos and simple local data, but it hides too much state for this feature.

## Core imports

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

Keep using the current import style in `EstimateSheetTree.tsx` and add only the missing types.

## Tree item model

From `types.d.ts`:

```ts
export type TreeItemIndex = string | number;

export interface TreeItem<T = any> {
  index: TreeItemIndex;
  children?: Array<TreeItemIndex>;
  isFolder?: boolean;
  canMove?: boolean;
  canRename?: boolean;
  data: T;
}
```

Archestimator mapping should remain:

```ts
type EstimateTreeItemData = {
  node: EstimateAreaNode | null;
};
```

Use a synthetic RCT root:

```ts
const ESTIMATE_TREE_ID = "estimate-sheet-tree";
const ROOT_ITEM_ID = "estimate-tree-root";
```

Mapping rules:

- Synthetic root item:
  - `index: ROOT_ITEM_ID`
  - `isFolder: true`
  - `children: top-level node ids`
  - `data: { node: null }`
- Group-like nodes:
  - `isFolder: true`
  - `children: child node ids`
- Area nodes:
  - `isFolder: false` or omitted
  - `children: undefined`

Do not expose the synthetic root as a visible rendered node. `renderItem` can return `null` for root-like data if needed, but current tree sets root item only as `Tree.rootItem`, so only its children render.

## Controlled environment props

Required:

```tsx
<ControlledTreeEnvironment<EstimateTreeItemData>
  items={treeModel.items}
  getItemTitle={(item) => item.data.node?.name ?? projectName}
  viewState={viewState}
>
  <Tree treeId={ESTIMATE_TREE_ID} rootItem={ROOT_ITEM_ID} treeLabel={`${projectName} estimate areas`} />
</ControlledTreeEnvironment>
```

Current `viewState` shape in Archestimator is already correct:

```ts
const viewState = useMemo<TreeViewState>(() => ({
  [ESTIMATE_TREE_ID]: {
    expandedItems,
    selectedItems: routeSelectedItems,
    focusedItem,
  },
}), [expandedItems, focusedItem, routeSelectedItems]);
```

Controlled trees need handlers. Keep/extend:

- `onExpandItem`
- `onCollapseItem`
- `onFocusItem`
- `onPrimaryAction`

Add:

- `onDrop`
- `canDrag`
- `canDropAt`

Optional but useful:

- `onSelectItems`, if selected state should track click selection separately from route selection.

## Existing interaction mode

Current tree uses:

```tsx
defaultInteractionMode={InteractionMode.ClickArrowToExpand}
```

Keep this unless product decides clicking labels should expand/collapse. It keeps row click/primary action separate from arrow expansion, which is safer for drag/drop because row click currently navigates.

## Drag/drop capability props

RCT drag/drop is disabled by default. Enable deliberately:

```tsx
canDragAndDrop
canReorderItems
canDropOnFolder
canDropBelowOpenFolders
canDropOnNonFolder={false}
canDrag={canDragEstimateItems}
canDropAt={canDropEstimateItemsAt}
onDrop={handleDrop}
```

Meanings from RCT types/docs/source:

| Prop | Meaning | Archestimator recommendation |
|---|---|---|
| `canDragAndDrop` | Master enable switch for drag/drop. | Enable. |
| `canReorderItems` | Enables `between-items` drops. | Enable for sibling reorder. |
| `canDropOnFolder` | Allows dropping onto folders/root-like folders. | Enable for reparenting into group-like nodes. |
| `canDropOnNonFolder` | Allows dropping onto non-folder items. | Keep false; area nodes cannot be parents. |
| `canDrag(items)` | Gate dragged items. | Start with single item only unless multi-move is explicitly designed. |
| `canDropAt(items, target)` | Gate target position. | Must enforce hierarchy, cycle, root constraints, and no-op rejection. |
| `canDropBelowOpenFolders` | Bottom of open folder means below folder, not inside. | Enable; it gives more predictable “drop below this group” UX. |

RCT source `useCanDropAt` confirms the built-in gate sequence:

- `between-items` requires `canReorderItems`.
- `root` requires `canDropOnFolder`.
- `item` target rejects if target item is missing, if folder/non-folder capability is disabled, or if dragging onto itself.
- Then custom `environment.canDropAt(draggingItems, draggingPosition)` can reject app-specific cases.

Therefore Archestimator should put all domain validation in `canDropAt` and reuse the same pure helper in `onDrop`/server validation.

## DraggingPosition exact shapes

From `types.d.ts`:

```ts
export type DraggingPosition = DraggingPositionItem | DraggingPositionBetweenItems | DraggingPositionRoot;

export interface AbstractDraggingPosition {
  targetType: "item" | "between-items" | "root";
  treeId: string;
  linearIndex: number;
  depth: number;
}

export interface DraggingPositionItem extends AbstractDraggingPosition {
  targetType: "item";
  targetItem: TreeItemIndex;
  parentItem: TreeItemIndex;
}

export interface DraggingPositionBetweenItems extends AbstractDraggingPosition {
  targetType: "between-items";
  childIndex: number;
  linePosition: "top" | "bottom";
  parentItem: TreeItemIndex;
}

export interface DraggingPositionRoot extends AbstractDraggingPosition {
  targetType: "root";
  targetItem: TreeItemIndex;
}
```

Archestimator translation:

| RCT target | App meaning | Parent id | Insert index |
|---|---|---|---|
| `targetType: "item"` | Drop inside target item. | `target.targetItem` unless target is synthetic root. | Append or index 0; choose one UX and test it. Recommended append. |
| `targetType: "between-items"` | Drop between siblings. | `target.parentItem`, with synthetic root mapped to `null`. | `target.childIndex`, adjusted after removing dragged node from original siblings. |
| `targetType: "root"` | Drop on tree root. | `null`. | Append at root, unless target provides enough info for a position. |

Never persist `linearIndex` or `depth`. They are visual/linearized values and can change with expansion state.

## Domain drop validation

Implement a pure function that both `canDropAt` and `onDrop` can use:

```ts
type EstimateTreeDropEvaluation =
  | { ok: true; plan: EstimateTreeMovePlan }
  | { ok: false; reason: string };

function evaluateEstimateTreeDrop(args: {
  nodes: EstimateAreaNode[];
  draggedIds: string[];
  target: DraggingPosition;
}): EstimateTreeDropEvaluation;
```

Validation must reject:

- Multiple dragged ids if multi-move is not supported.
- Dragged id not found.
- Synthetic root as dragged item.
- Area node as target parent.
- Area node moved to root.
- Root drop of any non-group-like node.
- Moving a node into itself.
- Moving a node into any descendant.
- Cross-tree target ids.
- Drop that results in the same parent/index after normalization.

Use current hierarchy source of truth:

- `src/lib/estimates/tree-hierarchy.ts`
- `canNestEstimateNodeKind(childKind, parentKind)`
- `isEstimateGroupNodeKind(kind)`

Do not duplicate a separate hierarchy matrix in the component.

## Move plan and sort order

RCT provides only target position. The app must produce deterministic persistence updates:

```ts
type EstimateNodeMoveUpdate = {
  id: string;
  parentId: string | null;
  sortOrder: number;
};
```

Recommended sibling sort order:

- Recompute affected sibling lists using gaps of 10: `0, 10, 20, ...` or `10, 20, 30, ...`.
- Include updates for every node in the source sibling set and target sibling set whose `parentId` or `sortOrder` changes.
- If moving within the same parent, source and target sibling set are the same.
- If moving across parents, normalize both old and new sibling sets.

Reason:

- Existing seed/migrations use gaps like 10, 20, 30 in many places.
- Existing `createEstimateNode` currently appends as `max + 1`, so the tree may contain non-gap values. A move can normalize affected siblings safely if the atomic RPC accepts all updated sibling rows.
- Deterministic full-sibling updates avoid duplicate sort values and make tests easy.

## Custom renderer requirements

Current `EstimateSheetTree` already uses custom renderers. Keep the RCT-provided props.

Renderer APIs from `types.d.ts`:

```ts
renderItem?: (props: {
  item: TreeItem<T>;
  depth: number;
  children: React.ReactNode | null;
  title: React.ReactNode;
  arrow: React.ReactNode;
  context: TreeItemRenderContext<C>;
  info: TreeInformation;
}) => React.ReactElement | null;

renderItemTitle?: (props: {
  title: string;
  item: TreeItem<T>;
  context: TreeItemRenderContext<C>;
  info: TreeInformation;
}) => React.ReactElement | null | string;

renderItemArrow?: (props: {
  item: TreeItem<T>;
  context: TreeItemRenderContext<C>;
  info: TreeInformation;
}) => React.ReactElement | null;

renderItemsContainer?: (props: {
  children: React.ReactNode;
  containerProps: HTMLProps<any>;
  info: TreeInformation;
  depth: number;
  parentId: TreeItemIndex;
}) => React.ReactElement | null;

renderTreeContainer?: (props: {
  children: React.ReactNode;
  containerProps: HTMLProps<any>;
  info: TreeInformation;
}) => React.ReactElement | null;

renderDragBetweenLine?: (props: {
  draggingPosition: DraggingPosition;
  lineProps: HTMLProps<any>;
}) => React.ReactElement | null;
```

Current item renderer correctly spreads:

- `context.itemContainerWithChildrenProps` on `<li>`
- `context.itemContainerWithoutChildrenProps` on row container
- `context.interactiveElementProps` on `<button>`
- `context.arrowProps` on arrow span

Keep this pattern. If adding a drag handle, do not move all interactive props only to the handle unless keyboard selection/navigation remains intact.

## Drag indicator renderer

Add `renderDragBetweenLine` to make target location visible and testable:

```tsx
renderDragBetweenLine={({ draggingPosition, lineProps }) => {
  const { className, ...props } = lineProps as HTMLAttributes<HTMLDivElement>;
  return (
    <div
      {...props}
      data-estimate-tree-drop-line="true"
      data-estimate-tree-drop-parent-id={String(
        draggingPosition.targetType === "between-items" ? draggingPosition.parentItem : ""
      )}
      className={cn("pointer-events-none h-px bg-accent", className)}
    />
  );
}}
```

Also style row states using `context` flags:

- `context.isDraggingOver`
- `context.isDraggingOverParent`
- `context.canDrag`
- `context.canDropOn`

Do not create huge insertion zones that interfere with row click/drag. Keep visual cues compact and predictable.

## Preventing flicker

Common causes in this codebase:

1. `treeModel` derived only from server props.
   - On drop, nothing changes until server route refresh, or route refresh blanks/reloads.
   - Fix: local optimistic `optimisticNodes` or shared query state.

2. Recreating `items` and `viewState` with unstable ids/arrays every render.
   - Fix: memoize derived model from `optimisticNodes`; preserve node ids.

3. Keying the tree by route, save state, or version.
   - Fix: do not key `ControlledTreeEnvironment`/`Tree` in a way that remounts after drop.

4. Calling `router.push` from primary action during drag/drop.
   - Fix: keep `onPrimaryAction` for click/keyboard activation only; verify drop does not call it.

5. Calling `router.refresh()` after every mutation.
   - Fix: use optimistic state and passive query invalidation/revalidate for future navigation.

6. Reconciling server props by overwriting local state while a mutation is pending.
   - Fix: keep a pending move id/version; only reconcile when returned/prop tree includes the confirmed move or when no pending mutation exists.

## Optimistic state pattern for `EstimateSheetTree`

Minimum tree-local version:

```ts
const [optimisticNodes, setOptimisticNodes] = useState(nodes);
const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
const [moveError, setMoveError] = useState<string | null>(null);

useEffect(() => {
  if (!pendingMove) setOptimisticNodes(nodes);
}, [nodes, pendingMove]);

const treeModel = useMemo(() => buildTreeModel(optimisticNodes), [optimisticNodes]);
```

On drop:

1. Evaluate move using current `optimisticNodes`.
2. Save rollback snapshot.
3. `setOptimisticNodes(plan.nextNodes)` immediately.
4. Mark pending/saving.
5. Call server action.
6. On success, reconcile with returned tree or clear pending and wait for passive props.
7. On failure, restore rollback snapshot and show error.

Better shared version:

- Lift `optimisticNodes` to a client boundary wrapping both tree and sheet.
- Pass same tree to `EstimateSheetTree` and `EstimateSheetContent`.
- Use this if sheet totals/path display must update immediately after reparent.

## RCT multi-select/multi-drag decision

RCT supports multi-select and dragging multiple selected items. Do not enable full multi-move accidentally.

For MVP seamless UX:

```ts
canDrag={(items) => items.length === 1 && items.every((item) => item.data.node)}
```

Also consider disabling multi-select if exposed by current interaction mode or by RCT defaults. If multi-select remains possible via keyboard/control-click, `canDrag` still prevents dragging more than one item.

If product wants multi-move later, add separate pure helpers/tests for:

- moving multiple siblings while preserving relative order;
- rejecting mixed ancestor/descendant selections;
- updating source/target sibling sort orders atomically.

## Keyboard accessibility

RCT supports keyboard drag/drop:

- Select one/several items.
- Press `CTRL + D` to start programmatic drag.
- Use `UP`/`DOWN` to choose target.
- Press `ENTER` to drop.
- Press `ESCAPE` to abort.

Do not remove live descriptions or ARIA props accidentally. If custom status is added, use accessible status text, e.g. `role="status"` or `aria-live="polite"` for save/failure feedback.

## Archestimator implementation checklist

- [ ] Keep `ControlledTreeEnvironment`.
- [ ] Enable DnD props intentionally.
- [ ] Add `canDrag` single-node policy.
- [ ] Add `canDropAt` using shared domain helper.
- [ ] Add `onDrop` using shared domain helper and optimistic state.
- [ ] Add `renderDragBetweenLine` and row drag-over styles.
- [ ] Keep `InteractionMode.ClickArrowToExpand` unless product changes row-click behavior.
- [ ] Preserve `data-estimate-tree-node-id` selectors.
- [ ] Add stable selectors for drop line/status if needed.
- [ ] Test keyboard and pointer drag/drop.
- [ ] Prove no document navigation/reload on drop.
