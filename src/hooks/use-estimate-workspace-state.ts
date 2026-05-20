"use client";

import { useCallback, useEffect } from "react";
import { create } from "zustand";

type EstimateWorkspaceState = {
  selectedNodeIdByEstimateId: Record<string, string | null>;
  expandedNodeIdsByEstimateId: Record<string, string[] | undefined>;
  setSelectedNodeId: (estimateId: string, nodeId: string | null) => void;
  setExpandedNodeIds: (estimateId: string, nodeIds: string[]) => void;
};

type ResolveEstimateWorkspaceSelectionOptions<TNode extends { id: string }> = {
  selectedNodeId: string | null | undefined;
  fallbackNode: TNode | null | undefined;
  findNode: (nodeId: string) => TNode | undefined;
};

export type EstimateWorkspaceSelectionResolution<TNode> = {
  selectedNodeId: string | null;
  selectedNode: TNode | null;
};

export const useEstimateWorkspaceState = create<EstimateWorkspaceState>((set) => ({
  selectedNodeIdByEstimateId: {},
  expandedNodeIdsByEstimateId: {},
  setSelectedNodeId: (estimateId, nodeId) => {
    set((state) => {
      if (state.selectedNodeIdByEstimateId[estimateId] === nodeId) return state;
      return {
        selectedNodeIdByEstimateId: {
          ...state.selectedNodeIdByEstimateId,
          [estimateId]: nodeId,
        },
      };
    });
  },
  setExpandedNodeIds: (estimateId, nodeIds) => {
    set((state) => {
      const currentNodeIds = state.expandedNodeIdsByEstimateId[estimateId];
      if (areNodeIdsEqual(currentNodeIds, nodeIds)) return state;
      return {
        expandedNodeIdsByEstimateId: {
          ...state.expandedNodeIdsByEstimateId,
          [estimateId]: nodeIds,
        },
      };
    });
  },
}));

export function resetEstimateWorkspaceState() {
  useEstimateWorkspaceState.setState({ selectedNodeIdByEstimateId: {}, expandedNodeIdsByEstimateId: {} });
}

function areNodeIdsEqual(left: string[] | undefined, right: string[]) {
  if (!left || left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

export function resolveEstimateWorkspaceSelection<TNode extends { id: string }>({
  selectedNodeId,
  fallbackNode,
  findNode,
}: ResolveEstimateWorkspaceSelectionOptions<TNode>): EstimateWorkspaceSelectionResolution<TNode> {
  if (selectedNodeId) {
    const selectedNode = findNode(selectedNodeId);
    if (selectedNode) {
      return { selectedNodeId: selectedNode.id, selectedNode };
    }
  }

  const selectedNode = fallbackNode ?? null;
  return { selectedNodeId: selectedNode?.id ?? null, selectedNode };
}

export function useEstimateWorkspaceSelection(estimateId: string | undefined, routeSelectedNodeId: string | null) {
  const storeSelectedNodeId = useEstimateWorkspaceState((state) => (estimateId ? state.selectedNodeIdByEstimateId[estimateId] : undefined));
  const setStoreSelectedNodeId = useEstimateWorkspaceState((state) => state.setSelectedNodeId);

  useEffect(() => {
    if (!estimateId) return;
    setStoreSelectedNodeId(estimateId, routeSelectedNodeId);
  }, [estimateId, routeSelectedNodeId, setStoreSelectedNodeId]);

  const setSelectedNodeId = useCallback(
    (nodeId: string | null) => {
      if (!estimateId) return;
      setStoreSelectedNodeId(estimateId, nodeId);
    },
    [estimateId, setStoreSelectedNodeId],
  );

  return {
    selectedNodeId: storeSelectedNodeId ?? routeSelectedNodeId,
    setSelectedNodeId,
  };
}

export function useEstimateWorkspaceExpansion(estimateId: string | undefined, defaultExpandedNodeIds: string[]) {
  const storeExpandedNodeIds = useEstimateWorkspaceState((state) => (estimateId ? state.expandedNodeIdsByEstimateId[estimateId] : undefined));
  const setStoreExpandedNodeIds = useEstimateWorkspaceState((state) => state.setExpandedNodeIds);

  const setExpandedNodeIds = useCallback(
    (nodeIds: string[]) => {
      if (!estimateId) return;
      setStoreExpandedNodeIds(estimateId, nodeIds);
    },
    [estimateId, setStoreExpandedNodeIds],
  );

  return {
    expandedNodeIds: storeExpandedNodeIds ?? defaultExpandedNodeIds,
    setExpandedNodeIds,
  };
}
