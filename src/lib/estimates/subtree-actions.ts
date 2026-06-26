"use server";

import { requireAuth } from "@/lib/auth/session";
import { ESTIMATE_SHEET_TREE_LOAD_LIMITS } from "@/lib/estimates/load-limits";
import type { EstimateTreeSubtreePayload } from "@/lib/estimates/estimate-tree-lazy";
import { getEstimateNodeSubtree } from "@/lib/repositories/workspace-repository";

export type FetchEstimateNodeSubtreeInput = {
  projectId: string;
  estimateId: string;
  nodeId: string;
  tabId?: string | null;
  requestId: string;
};

export async function fetchEstimateNodeSubtree({
  projectId,
  estimateId,
  nodeId,
  tabId,
  requestId,
}: FetchEstimateNodeSubtreeInput): Promise<EstimateTreeSubtreePayload> {
  await requireAuth();
  const result = await getEstimateNodeSubtree(projectId, estimateId, nodeId, {
    tabId,
    requestId,
    options: { ...ESTIMATE_SHEET_TREE_LOAD_LIMITS, allowLegacyFallback: true },
  });
  if (!result.project || !result.estimate || !result.payload) {
    throw new Error("Estimate subtree not found in the current project.");
  }
  return result.payload;
}
