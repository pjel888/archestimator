# Tree Core API Contracts

**Status:** Planning signatures only. Do not treat these as implemented exports.
**Goal:** Prevent future implementers from inventing incompatible hook/component shapes during refactor.

## Pure Types

```typescript
export type TreeNodeId = string;

export interface TreeAdapter<TNode> {
  getId(node: TNode): TreeNodeId;
  getLabel(node: TNode): string;
  getChildren(node: TNode): readonly TNode[];
  isSelectable?(node: TNode): boolean;
  isExpandable?(node: TNode): boolean;
}

export interface VisibleTreeRow<TNode> {
  id: TreeNodeId;
  node: TNode;
  depth: number;
  parentId: TreeNodeId | null;
  indexWithinParent: number;
  siblingCount: number;
  hasChildren: boolean;
  isExpanded: boolean;
}

export interface TreeIndex<TNode> {
  nodesById: ReadonlyMap<TreeNodeId, TNode>;
  parentById: ReadonlyMap<TreeNodeId, TreeNodeId | null>;
  childrenById: ReadonlyMap<TreeNodeId, readonly TreeNodeId[]>;
  depthById: ReadonlyMap<TreeNodeId, number>;
}
```

## Pure Utility Signatures

```typescript
export function buildTreeIndex<TNode>(
  roots: readonly TNode[],
  adapter: TreeAdapter<TNode>
): TreeIndex<TNode>;

export function flattenVisibleTree<TNode>(input: {
  roots: readonly TNode[];
  adapter: TreeAdapter<TNode>;
  expandedIds: ReadonlySet<TreeNodeId>;
}): readonly VisibleTreeRow<TNode>[];

export function filterTree<TNode>(input: {
  roots: readonly TNode[];
  adapter: TreeAdapter<TNode>;
  query: string;
}): readonly TNode[];

export function getVisibleTreeRowAria<TNode>(row: VisibleTreeRow<TNode>): {
  "aria-level": number;
  "aria-posinset": number;
  "aria-setsize": number;
  "aria-expanded"?: boolean;
};
```

Pure utilities must not import React, DOM APIs, Supabase, TanStack Query, `react-complex-tree`, or feature-specific estimate/library/share types.

## Headless Hooks

```typescript
export interface UseTreeExpansionOptions {
  initialExpandedIds?: Iterable<TreeNodeId>;
  controlledExpandedIds?: ReadonlySet<TreeNodeId>;
  onExpandedIdsChange?(expandedIds: ReadonlySet<TreeNodeId>): void;
}

export interface UseTreeExpansionResult {
  expandedIds: ReadonlySet<TreeNodeId>;
  isExpanded(id: TreeNodeId): boolean;
  expand(id: TreeNodeId): void;
  collapse(id: TreeNodeId): void;
  toggle(id: TreeNodeId): void;
  setExpandedIds(ids: Iterable<TreeNodeId>): void;
}

export function useTreeExpansion(options?: UseTreeExpansionOptions): UseTreeExpansionResult;

export interface UseTreeSelectionOptions {
  initialSelectedIds?: Iterable<TreeNodeId>;
  controlledSelectedIds?: ReadonlySet<TreeNodeId>;
  mode?: "single" | "multi";
  onSelectedIdsChange?(selectedIds: ReadonlySet<TreeNodeId>): void;
}

export interface UseTreeSelectionResult {
  selectedIds: ReadonlySet<TreeNodeId>;
  primarySelectedId: TreeNodeId | null;
  isSelected(id: TreeNodeId): boolean;
  select(id: TreeNodeId): void;
  deselect(id: TreeNodeId): void;
  toggle(id: TreeNodeId): void;
  clear(): void;
}

export function useTreeSelection(options?: UseTreeSelectionOptions): UseTreeSelectionResult;
```

Hooks may import React but must stay domain-agnostic.

## Render Shell Props

```typescript
export interface TreeSurfaceShellProps<TNode> {
  rows: readonly VisibleTreeRow<TNode>[];
  selectedIds: ReadonlySet<TreeNodeId>;
  activeId?: TreeNodeId | null;
  onToggleExpanded(id: TreeNodeId): void;
  onSelect(id: TreeNodeId): void;
  renderRow(props: TreeSurfaceRowRenderProps<TNode>): React.ReactNode;
  emptyState?: React.ReactNode;
  "aria-label": string;
}

export interface TreeSurfaceRowRenderProps<TNode> {
  row: VisibleTreeRow<TNode>;
  selected: boolean;
  active: boolean;
  toggleProps: {
    "aria-label": string;
    onClick(): void;
  };
  selectProps: {
    onClick(): void;
  };
}
```

Render shells may use React and shared UI primitives, but must not own estimate mutations or Supabase writes.

## Estimate Tree Contracts

```typescript
export interface UseEstimateTreeModelResult {
  treeItems: Record<string, unknown>;
  viewState: unknown;
  selectedIds: readonly string[];
  expandedIds: readonly string[];
  focusedItemId: string | null;
  canDrag: boolean;
  canDrop: boolean;
}

export interface EstimateTreeMutationRequest {
  action: "rename" | "delete" | "create" | "reorder" | "bulkDelete";
  nodeId?: string;
  payload: unknown;
}

export interface UseEstimateTreeMutationsResult {
  pendingNodeIds: ReadonlySet<string>;
  renameNode(input: { nodeId: string; name: string }): Promise<void>;
  deleteNode(input: { nodeId: string }): Promise<void>;
  createNode(input: { parentId: string | null; kind: "group" | "area"; name: string }): Promise<void>;
  reorderNodes(input: unknown): Promise<void>;
  bulkDeleteNodes(input: { nodeIds: readonly string[] }): Promise<void>;
}
```

These contracts are intentionally conservative. They preserve the current persistence/mutation boundary and do not expose app-side optimistic implementation details from tree-core.

## Share Row Contract

```typescript
export interface ShareTreeNodeRowProps {
  row: VisibleTreeRow<ShareTreeNode>;
  selected: boolean;
  onSelect(nodeId: string): void;
  onToggleExpanded(nodeId: string): void;
  showTotals?: boolean;
}
```

`ShareTreeNode` must be imported from the share snapshot reconstruction layer or mapped by a share-specific adapter. The generic tree-core layer must not import share domain types.
