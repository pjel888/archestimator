import type { EstimateTreeNode } from "@/lib/estimates/types";

export type EstimateTreeScope = {
  estimateId: string;
  tabId?: string | null;
};

export type EstimateTreeSubtreeCompleteness = {
  childrenLoaded: boolean;
  rowItemsLoaded: boolean;
  didExceedNodeLimit: boolean;
  didExceedRowItemLimit: boolean;
};

export type EstimateTreeSubtreePayload = {
  schemaVersion: 1;
  scope: EstimateTreeScope;
  rootNodeId: string;
  parentNodeId: string | null;
  requestId: string;
  fetchedAt: string;
  tree: EstimateTreeNode[];
  nodeCount: number;
  rowItemCount: number;
  completeness: EstimateTreeSubtreeCompleteness;
};

export type EstimateTreeSubtreeLoadStatus = "idle" | "loading" | "loaded" | "error";

export type EstimateTreeSubtreeLoadState = {
  status: EstimateTreeSubtreeLoadStatus;
  requestId?: string;
  loadedAt?: string;
  error?: string;
};

export type EstimateTreeHydrationState = Record<string, EstimateTreeSubtreeLoadState | undefined>;

export type EstimateTreeSubtreeMergeResult = {
  nodes: EstimateTreeNode[];
  merged: boolean;
};

function cloneEstimateTreeNode(node: EstimateTreeNode): EstimateTreeNode {
  return {
    ...node,
    children: node.children?.map(cloneEstimateTreeNode),
    estimateRowItems: node.estimateRowItems ? [...node.estimateRowItems] : node.estimateRowItems,
  };
}

function countEstimateRows(nodes: EstimateTreeNode[]) {
  let count = 0;
  for (const node of nodes) {
    count += node.estimateRowItems?.length ?? 0;
    if (node.children?.length) count += countEstimateRows(node.children);
  }
  return count;
}

export function countEstimateTreeNodes(nodes: EstimateTreeNode[]) {
  let count = 0;
  for (const node of nodes) {
    count += 1;
    if (node.children?.length) count += countEstimateTreeNodes(node.children);
  }
  return count;
}

export function buildEstimateTreeSubtreePayload(input: {
  estimateId: string;
  tabId?: string | null;
  rootNodeId: string;
  parentNodeId: string | null;
  requestId: string;
  fetchedAt?: string;
  tree: EstimateTreeNode[];
  completeness: EstimateTreeSubtreeCompleteness;
}): EstimateTreeSubtreePayload {
  const tree = input.tree.map(cloneEstimateTreeNode);
  return {
    schemaVersion: 1,
    scope: {
      estimateId: input.estimateId,
      tabId: input.tabId ?? null,
    },
    rootNodeId: input.rootNodeId,
    parentNodeId: input.parentNodeId,
    requestId: input.requestId,
    fetchedAt: input.fetchedAt ?? new Date().toISOString(),
    tree,
    nodeCount: countEstimateTreeNodes(tree),
    rowItemCount: countEstimateRows(tree),
    completeness: input.completeness,
  };
}

export function mergeEstimateTreeSubtreePayload(
  nodes: EstimateTreeNode[],
  payload: EstimateTreeSubtreePayload,
): EstimateTreeSubtreeMergeResult {
  const replacement = payload.tree.find((node) => node.id === payload.rootNodeId);
  if (!replacement) return { nodes, merged: false };
  const replacementNode = replacement;

  let merged = false;

  function visit(currentNodes: EstimateTreeNode[]): EstimateTreeNode[] {
    let didChange = false;
    const nextNodes = currentNodes.map((node) => {
      if (node.id === payload.rootNodeId) {
        merged = true;
        didChange = true;
        return cloneEstimateTreeNode(replacementNode);
      }

      if (!node.children?.length) return node;
      const nextChildren = visit(node.children);
      if (nextChildren === node.children) return node;
      didChange = true;
      return { ...node, children: nextChildren };
    });
    return didChange ? nextNodes : currentNodes;
  }

  const nextNodes = visit(nodes);
  return { nodes: merged ? nextNodes : nodes, merged };
}

export function beginEstimateTreeSubtreeLoad(
  state: EstimateTreeHydrationState,
  nodeId: string,
  requestId: string,
): EstimateTreeHydrationState {
  return {
    ...state,
    [nodeId]: { status: "loading", requestId },
  };
}

export function completeEstimateTreeSubtreeLoad(
  state: EstimateTreeHydrationState,
  nodeId: string,
  requestId: string,
  loadedAt: string,
): EstimateTreeHydrationState {
  if (!shouldAcceptEstimateTreeSubtreeResponse(state, nodeId, requestId)) return state;
  return {
    ...state,
    [nodeId]: { status: "loaded", requestId, loadedAt },
  };
}

export function failEstimateTreeSubtreeLoad(
  state: EstimateTreeHydrationState,
  nodeId: string,
  requestId: string,
  error: string,
): EstimateTreeHydrationState {
  if (!shouldAcceptEstimateTreeSubtreeResponse(state, nodeId, requestId)) return state;
  return {
    ...state,
    [nodeId]: { status: "error", requestId, error },
  };
}

export function shouldAcceptEstimateTreeSubtreeResponse(
  state: EstimateTreeHydrationState,
  nodeId: string,
  requestId: string,
) {
  const current = state[nodeId];
  return current?.status === "loading" && current.requestId === requestId;
}

export function shouldHydrateEstimateTreeSubtree(
  node: EstimateTreeNode | null | undefined,
  state: EstimateTreeHydrationState,
) {
  if (!node || node.childrenLoaded !== false) return false;
  const current = state[node.id];
  return current?.status !== "loading" && current?.status !== "loaded";
}
