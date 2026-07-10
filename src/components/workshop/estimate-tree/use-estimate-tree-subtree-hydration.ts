"use client";

import { unstable_rethrow } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type { useToast } from "@/components/ui/toast";
import { findEstimateNode, type EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import {
  beginEstimateTreeSubtreeLoad,
  completeEstimateTreeSubtreeLoad,
  failEstimateTreeSubtreeLoad,
  mergeEstimateTreeSubtreePayload,
  shouldAcceptEstimateTreeSubtreeResponse,
  shouldHydrateEstimateTreeSubtree,
  type EstimateTreeHydrationState,
} from "@/lib/estimates/estimate-tree-lazy";
import { loadEstimateNodeSubtree } from "@/lib/estimates/subtree-client";

type EstimateTreeUpdater =
  | EstimateTreeNode[]
  | ((currentTree: EstimateTreeNode[]) => EstimateTreeNode[]);

type UseEstimateTreeSubtreeHydrationInput = {
  projectId: string;
  estimateId: string;
  activeTabId?: string;
  treeViewNodes: EstimateTreeNode[];
  setLocalNodes: (nextTree: EstimateTreeUpdater) => number;
  toast: ReturnType<typeof useToast>["toast"];
};

export function useEstimateTreeSubtreeHydration({
  projectId,
  estimateId,
  activeTabId,
  treeViewNodes,
  setLocalNodes,
  toast,
}: UseEstimateTreeSubtreeHydrationInput) {
  const [subtreeHydrationState, setSubtreeHydrationState] = useState<EstimateTreeHydrationState>({});
  const subtreeHydrationStateRef = useRef<EstimateTreeHydrationState>({});
  const subtreeHydrationRequestCounterRef = useRef(0);

  useEffect(() => {
    subtreeHydrationStateRef.current = subtreeHydrationState;
  }, [subtreeHydrationState]);

  const hydrateEstimateTreeSubtree = useCallback((nodeId: string) => {
    const node = findEstimateNode(treeViewNodes, nodeId);
    if (!shouldHydrateEstimateTreeSubtree(node, subtreeHydrationStateRef.current)) return;

    const requestId = `${estimateId}:${activeTabId ?? "legacy"}:${nodeId}:${++subtreeHydrationRequestCounterRef.current}`;
    setSubtreeHydrationState((current) => {
      const next = beginEstimateTreeSubtreeLoad(current, nodeId, requestId);
      subtreeHydrationStateRef.current = next;
      return next;
    });

    void loadEstimateNodeSubtree({
      projectId,
      estimateId,
      tabId: activeTabId ?? null,
      nodeId,
      requestId,
    })
      .then((payload) => {
        if (!shouldAcceptEstimateTreeSubtreeResponse(subtreeHydrationStateRef.current, nodeId, requestId)) return;

        let didMerge = false;
        setLocalNodes((currentNodes) => {
          const result = mergeEstimateTreeSubtreePayload(currentNodes, payload);
          didMerge = result.merged;
          return result.nodes;
        });

        setSubtreeHydrationState((current) => {
          const next = didMerge
            ? completeEstimateTreeSubtreeLoad(current, nodeId, requestId, payload.fetchedAt)
            : failEstimateTreeSubtreeLoad(current, nodeId, requestId, "The loaded branch no longer exists.");
          subtreeHydrationStateRef.current = next;
          return next;
        });
      })
      .catch((error: unknown) => {
        unstable_rethrow(error);
        const message = error instanceof Error ? error.message : "Could not load this area.";
        setSubtreeHydrationState((current) => {
          const next = failEstimateTreeSubtreeLoad(current, nodeId, requestId, message);
          subtreeHydrationStateRef.current = next;
          return next;
        });
        toast({
          id: "estimate-tree-subtree-load",
          message,
          tone: "error",
        });
      });
  }, [activeTabId, estimateId, projectId, setLocalNodes, toast, treeViewNodes]);

  const handleTreeToggle = useCallback((nodeId: string, expanded: boolean) => {
    if (expanded) hydrateEstimateTreeSubtree(nodeId);
  }, [hydrateEstimateTreeSubtree]);

  return { subtreeHydrationState, handleTreeToggle };
}
