"use client";

import { useCallback, useEffect, useRef } from "react";

import type { TreeDropPosition } from "@/components/ui/tree";
import type { EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { reorderEstimateTreeNodes } from "@/lib/estimates/actions";
import {
  evaluateEstimateTreeDrop,
  getEstimateTreeContentSignature,
  mergeEstimateTreeStructureWithCachedNodes,
} from "@/lib/estimates/estimate-tree-reorder";

export type EstimateTreeReorderStatus =
  | { state: "idle" }
  | { state: "saving"; message: string }
  | { state: "saved"; message: string }
  | { state: "error"; message: string };

type EstimateTreeUpdater =
  | EstimateTreeNode[]
  | ((currentTree: EstimateTreeNode[]) => EstimateTreeNode[]);

type UseEstimateTreeReorderInput = {
  projectId: string;
  estimateId: string;
  activeTabId?: string;
  nodes: EstimateTreeNode[];
  localNodes: EstimateTreeNode[];
  canEditEstimate: boolean;
  canReorderNow: boolean;
  editingNodeId: string | null;
  treeSearchActive: boolean;
  setLocalNodes: (nextTree: EstimateTreeUpdater) => number;
  restoreLocalNodes: (previousTree: EstimateTreeNode[], expectedRevision?: number) => boolean;
  getLocalTreeRevision: () => number;
  prepareOptimisticUpdate: () => Promise<EstimateTreeNode[]>;
  setReorderStatus: (status: EstimateTreeReorderStatus) => void;
  refreshAuthoritativeTree: () => Promise<EstimateTreeNode[]>;
  isOptimisticNodeId: (nodeId: string) => boolean;
  suppressPrimaryActionAfterDrag: () => void;
};

function getEstimateTreeNodeIds(nodes: EstimateTreeNode[]): Set<string> {
  const nodeIds = new Set<string>();

  function visit(currentNodes: EstimateTreeNode[]) {
    for (const node of currentNodes) {
      nodeIds.add(node.id);
      visit(node.children ?? []);
    }
  }

  visit(nodes);
  return nodeIds;
}

function cloneEstimateTreeNode(node: EstimateTreeNode): EstimateTreeNode {
  return {
    ...node,
    children: node.children?.map(cloneEstimateTreeNode),
    estimateRowItems: node.estimateRowItems ? [...node.estimateRowItems] : node.estimateRowItems,
  };
}

function removeConcurrentEstimateTreeDeletions(
  nodes: EstimateTreeNode[],
  deletedNodeIds: Set<string>,
): EstimateTreeNode[] {
  return nodes.flatMap((node) => {
    if (deletedNodeIds.has(node.id)) return [];
    return [{
      ...node,
      children: node.children
        ? removeConcurrentEstimateTreeDeletions(node.children, deletedNodeIds)
        : node.children,
    }];
  });
}

function getEstimateTreeChildren(
  nodes: EstimateTreeNode[],
  parentId: string | null,
): EstimateTreeNode[] | null {
  if (parentId === null) return nodes;

  for (const node of nodes) {
    if (node.id === parentId) {
      node.children ??= [];
      return node.children;
    }
    const children = getEstimateTreeChildren(node.children ?? [], parentId);
    if (children) return children;
  }

  return null;
}

function reconcileConfirmedReorderWithConcurrentTreeEdits({
  confirmedNodes,
  baseNodes,
  currentNodes,
}: {
  confirmedNodes: EstimateTreeNode[];
  baseNodes: EstimateTreeNode[];
  currentNodes: EstimateTreeNode[];
}): EstimateTreeNode[] {
  const baseNodeIds = getEstimateTreeNodeIds(baseNodes);
  const currentNodeIds = getEstimateTreeNodeIds(currentNodes);
  const deletedNodeIds = new Set([...baseNodeIds].filter((nodeId) => !currentNodeIds.has(nodeId)));
  const mergedNodes = removeConcurrentEstimateTreeDeletions(
    mergeEstimateTreeStructureWithCachedNodes({
      structureNodes: confirmedNodes,
      cachedNodes: currentNodes,
    }),
    deletedNodeIds,
  );
  const mergedNodeIds = getEstimateTreeNodeIds(mergedNodes);

  function addConcurrentNodes(currentSiblings: EstimateTreeNode[], parentId: string | null) {
    for (let currentIndex = 0; currentIndex < currentSiblings.length; currentIndex += 1) {
      const currentNode = currentSiblings[currentIndex];
      if (!baseNodeIds.has(currentNode.id) && !mergedNodeIds.has(currentNode.id)) {
        const targetSiblings = getEstimateTreeChildren(mergedNodes, parentId);
        if (!targetSiblings) continue;

        let insertionIndex = targetSiblings.length;
        for (let siblingIndex = currentIndex - 1; siblingIndex >= 0; siblingIndex -= 1) {
          const previousNodeId = currentSiblings[siblingIndex]?.id;
          const previousTargetIndex = targetSiblings.findIndex((node) => node.id === previousNodeId);
          if (previousTargetIndex >= 0) {
            insertionIndex = previousTargetIndex + 1;
            break;
          }
        }
        if (insertionIndex === targetSiblings.length) {
          for (let siblingIndex = currentIndex + 1; siblingIndex < currentSiblings.length; siblingIndex += 1) {
            const nextNodeId = currentSiblings[siblingIndex]?.id;
            const nextTargetIndex = targetSiblings.findIndex((node) => node.id === nextNodeId);
            if (nextTargetIndex >= 0) {
              insertionIndex = nextTargetIndex;
              break;
            }
          }
        }

        const concurrentNode = cloneEstimateTreeNode(currentNode);
        targetSiblings.splice(insertionIndex, 0, concurrentNode);
        for (const nodeId of getEstimateTreeNodeIds([concurrentNode])) mergedNodeIds.add(nodeId);
        continue;
      }

      addConcurrentNodes(currentNode.children ?? [], currentNode.id);
    }
  }

  addConcurrentNodes(currentNodes, null);
  return mergedNodes;
}

export function useEstimateTreeReorder({
  projectId,
  estimateId,
  activeTabId,
  nodes,
  localNodes,
  canEditEstimate,
  canReorderNow,
  editingNodeId,
  treeSearchActive,
  setLocalNodes,
  restoreLocalNodes,
  getLocalTreeRevision,
  prepareOptimisticUpdate,
  setReorderStatus,
  refreshAuthoritativeTree,
  isOptimisticNodeId,
  suppressPrimaryActionAfterDrag,
}: UseEstimateTreeReorderInput) {
  const pendingReordersRef = useRef(0);
  const lastAcceptedPropSignatureRef = useRef<string>(null!);
  if (lastAcceptedPropSignatureRef.current === null) {
    lastAcceptedPropSignatureRef.current = getEstimateTreeContentSignature(nodes);
  }
  const lastObservedPropSignatureRef = useRef<string | null>(null);
  const lastObservedPropNodesRef = useRef<EstimateTreeNode[] | null>(null);
  const stalePropSignatureToIgnoreRef = useRef<string | null>(null);
  const pendingPropNodesRef = useRef<EstimateTreeNode[] | null>(null);

  const syncLocalNodesFromProps = useCallback((incomingNodes: EstimateTreeNode[]) => {
    const incomingSignature = getEstimateTreeContentSignature(incomingNodes);
    setLocalNodes((currentNodes) => {
      if (stalePropSignatureToIgnoreRef.current === incomingSignature) {
        stalePropSignatureToIgnoreRef.current = null;
        return currentNodes;
      }

      const currentSignature = getEstimateTreeContentSignature(currentNodes);
      if (currentSignature === incomingSignature) {
        lastAcceptedPropSignatureRef.current = incomingSignature;
        return currentNodes;
      }

      lastAcceptedPropSignatureRef.current = incomingSignature;
      stalePropSignatureToIgnoreRef.current = null;
      return incomingNodes;
    });
  }, [setLocalNodes]);

  const finishPendingReorder = useCallback(() => {
    pendingReordersRef.current = Math.max(0, pendingReordersRef.current - 1);
    if (pendingReordersRef.current > 0 || !pendingPropNodesRef.current) return;

    const pendingPropNodes = pendingPropNodesRef.current;
    pendingPropNodesRef.current = null;
    syncLocalNodesFromProps(pendingPropNodes);
  }, [syncLocalNodesFromProps]);

  useEffect(() => {
    const incomingSignature = getEstimateTreeContentSignature(nodes);
    if (
      nodes === lastObservedPropNodesRef.current
      && incomingSignature === lastObservedPropSignatureRef.current
    ) {
      return;
    }
    lastObservedPropNodesRef.current = nodes;
    lastObservedPropSignatureRef.current = incomingSignature;

    if (pendingReordersRef.current > 0) {
      pendingPropNodesRef.current = nodes;
      return;
    }
    // react-doctor-disable-next-line react-doctor/no-pass-data-to-parent -- Local tree reconciliation from incoming props; no parent callback or upward data handoff occurs.
    syncLocalNodesFromProps(nodes);
  }, [nodes, syncLocalNodesFromProps]);

  const handleTreeDrop = useCallback((
    draggedId: string,
    targetId: string,
    position: TreeDropPosition,
  ) => {
    suppressPrimaryActionAfterDrag();
    if (!canEditEstimate || !canReorderNow || editingNodeId || treeSearchActive) return;
    if (isOptimisticNodeId(draggedId) || isOptimisticNodeId(targetId)) return;

    const target = { targetNodeId: targetId, position };
    const result = evaluateEstimateTreeDrop({
      nodes: localNodes,
      draggedNodeIds: [draggedId],
      target,
    });
    if (!result.ok) return;

    pendingReordersRef.current += 1;
    setReorderStatus({ state: "saving", message: "Saving tree order" });

    void (async () => {
      let previousNodes = localNodes;
      let optimisticRevision: number | null = null;
      try {
        previousNodes = await prepareOptimisticUpdate();
        const freshResult = evaluateEstimateTreeDrop({
          nodes: previousNodes,
          draggedNodeIds: [draggedId],
          target,
        });
        if (!freshResult.ok) {
          setReorderStatus({ state: "error", message: freshResult.message });
          return;
        }
        const touchesPendingCreate = freshResult.plan.updates.some(
          (update) => isOptimisticNodeId(update.id)
            || (update.parentId ? isOptimisticNodeId(update.parentId) : false),
        );
        if (touchesPendingCreate) {
          setReorderStatus({
            state: "error",
            message: "A nearby node is still being created. Try the move again in a moment.",
          });
          return;
        }

        stalePropSignatureToIgnoreRef.current = lastAcceptedPropSignatureRef.current;
        setLocalNodes(freshResult.plan.nextNodes);
        optimisticRevision = getLocalTreeRevision();
        const confirmed = await reorderEstimateTreeNodes(projectId, estimateId, {
          updates: freshResult.plan.updates,
          targetTabId: activeTabId,
        });
        setLocalNodes((currentNodes) =>
          reconcileConfirmedReorderWithConcurrentTreeEdits({
            confirmedNodes: confirmed.tree,
            baseNodes: previousNodes,
            currentNodes,
          }),
        );
        pendingPropNodesRef.current = null;
        setReorderStatus({ state: "saved", message: "Tree order saved" });
      } catch (error) {
        try {
          const authoritativeTree = await refreshAuthoritativeTree();
          setLocalNodes(authoritativeTree);
          pendingPropNodesRef.current = null;
        } catch {
          if (optimisticRevision === null) {
            setLocalNodes(previousNodes);
          } else {
            restoreLocalNodes(previousNodes, optimisticRevision);
          }
        }
        setReorderStatus({
          state: "error",
          message: error instanceof Error ? error.message : "Could not save tree order.",
        });
      } finally {
        finishPendingReorder();
      }
    })();
  }, [
    activeTabId,
    canEditEstimate,
    canReorderNow,
    editingNodeId,
    estimateId,
    finishPendingReorder,
    getLocalTreeRevision,
    isOptimisticNodeId,
    localNodes,
    prepareOptimisticUpdate,
    projectId,
    refreshAuthoritativeTree,
    restoreLocalNodes,
    setLocalNodes,
    setReorderStatus,
    suppressPrimaryActionAfterDrag,
    treeSearchActive,
  ]);

  return { handleTreeDrop };
}
