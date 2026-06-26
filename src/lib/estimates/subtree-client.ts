import type { EstimateTreeSubtreePayload } from "@/lib/estimates/estimate-tree-lazy";
import type { FetchEstimateNodeSubtreeInput } from "@/lib/estimates/subtree-actions";

export async function loadEstimateNodeSubtree(input: FetchEstimateNodeSubtreeInput): Promise<EstimateTreeSubtreePayload> {
  const { fetchEstimateNodeSubtree } = await import("@/lib/estimates/subtree-actions");
  return fetchEstimateNodeSubtree(input);
}
