"use client";

import { useCallback, useEffect } from "react";
import { create } from "zustand";

type EstimateWorkspaceState = {
  selectedNodeIdByEstimateId: Record<string, string | null>;
  expandedNodeIdsByEstimateId: Record<string, string[] | undefined>;
  selectedNodeIdByTabId: Record<string, string | null>;
  expandedNodeIdsByTabId: Record<string, string[] | undefined>;
  activeTabIdByEstimateId: Record<string, string | undefined>;
  setSelectedNodeId: (estimateId: string, nodeId: string | null) => void;
  setExpandedNodeIds: (estimateId: string, nodeIds: string[]) => void;
  setSelectedNodeIdForTab: (tabId: string, nodeId: string | null) => void;
  setExpandedNodeIdsForTab: (tabId: string, nodeIds: string[]) => void;
  setActiveTabId: (estimateId: string, tabId: string) => void;
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
  selectedNodeIdByTabId: {},
  expandedNodeIdsByTabId: {},
  activeTabIdByEstimateId: {},
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
  setSelectedNodeIdForTab: (tabId, nodeId) => {
    set((state) => {
      if (state.selectedNodeIdByTabId[tabId] === nodeId) return state;
      return {
        selectedNodeIdByTabId: {
          ...state.selectedNodeIdByTabId,
          [tabId]: nodeId,
        },
      };
    });
  },
  setExpandedNodeIdsForTab: (tabId, nodeIds) => {
    set((state) => {
      const currentNodeIds = state.expandedNodeIdsByTabId[tabId];
      if (areNodeIdsEqual(currentNodeIds, nodeIds)) return state;
      return {
        expandedNodeIdsByTabId: {
          ...state.expandedNodeIdsByTabId,
          [tabId]: nodeIds,
        },
      };
    });
  },
  setActiveTabId: (estimateId, tabId) => {
    set((state) => {
      if (state.activeTabIdByEstimateId[estimateId] === tabId) return state;
      return {
        activeTabIdByEstimateId: {
          ...state.activeTabIdByEstimateId,
          [estimateId]: tabId,
        },
      };
    });
  },
}));

export function resetEstimateWorkspaceState() {
  useEstimateWorkspaceState.setState({
    selectedNodeIdByEstimateId: {},
    expandedNodeIdsByEstimateId: {},
    selectedNodeIdByTabId: {},
    expandedNodeIdsByTabId: {},
    activeTabIdByEstimateId: {},
  });
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

export function useEstimateWorkspaceSelection(estimateId: string | undefined, routeSelectedNodeId: string | null, tabId?: string) {
  const storeSelectedNodeId = useEstimateWorkspaceState((state) => (tabId ? state.selectedNodeIdByTabId[tabId] : estimateId ? state.selectedNodeIdByEstimateId[estimateId] : undefined));
  const setStoreSelectedNodeId = useEstimateWorkspaceState((state) => state.setSelectedNodeId);
  const setStoreSelectedNodeIdForTab = useEstimateWorkspaceState((state) => state.setSelectedNodeIdForTab);

  useEffect(() => {
    if (tabId) {
      setStoreSelectedNodeIdForTab(tabId, routeSelectedNodeId);
      return;
    }
    if (estimateId) setStoreSelectedNodeId(estimateId, routeSelectedNodeId);
  }, [estimateId, routeSelectedNodeId, setStoreSelectedNodeId, setStoreSelectedNodeIdForTab, tabId]);

  const setSelectedNodeId = useCallback(
    (nodeId: string | null) => {
      if (tabId) {
        setStoreSelectedNodeIdForTab(tabId, nodeId);
        return;
      }
      if (!estimateId) return;
      setStoreSelectedNodeId(estimateId, nodeId);
    },
    [estimateId, setStoreSelectedNodeId, setStoreSelectedNodeIdForTab, tabId],
  );

  return {
    selectedNodeId: storeSelectedNodeId ?? routeSelectedNodeId,
    setSelectedNodeId,
  };
}

export function useEstimateWorkspaceExpansion(estimateId: string | undefined, defaultExpandedNodeIds: string[], tabId?: string) {
  const storeExpandedNodeIds = useEstimateWorkspaceState((state) => (tabId ? state.expandedNodeIdsByTabId[tabId] : estimateId ? state.expandedNodeIdsByEstimateId[estimateId] : undefined));
  const setStoreExpandedNodeIds = useEstimateWorkspaceState((state) => state.setExpandedNodeIds);
  const setStoreExpandedNodeIdsForTab = useEstimateWorkspaceState((state) => state.setExpandedNodeIdsForTab);

  const setExpandedNodeIds = useCallback(
    (nodeIds: string[]) => {
      if (tabId) {
        setStoreExpandedNodeIdsForTab(tabId, nodeIds);
        return;
      }
      if (!estimateId) return;
      setStoreExpandedNodeIds(estimateId, nodeIds);
    },
    [estimateId, setStoreExpandedNodeIds, setStoreExpandedNodeIdsForTab, tabId],
  );

  return {
    expandedNodeIds: storeExpandedNodeIds ?? defaultExpandedNodeIds,
    setExpandedNodeIds,
  };
}

export function useEstimateActiveTab(estimateId: string | undefined, defaultTabId: string | undefined) {
  const activeTabId = useEstimateWorkspaceState((state) => (estimateId ? state.activeTabIdByEstimateId[estimateId] : undefined));
  const setActiveTabId = useEstimateWorkspaceState((state) => state.setActiveTabId);

  const setEstimateActiveTabId = useCallback(
    (tabId: string) => {
      if (!estimateId) return;
      setActiveTabId(estimateId, tabId);
    },
    [estimateId, setActiveTabId],
  );

  return {
    activeTabId: activeTabId ?? defaultTabId,
    setActiveTabId: setEstimateActiveTabId,
  };
}
