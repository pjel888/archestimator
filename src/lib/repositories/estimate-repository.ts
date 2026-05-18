import { moveEstimateNode as moveTreeNode, moveEstimateRowItem as moveTreeRowItem, type MoveEstimateNodeInput, type MoveEstimateRowItemInput } from "@/lib/domain/estimate-mutations";
import type { EstimateTree } from "@/lib/domain/estimate-tree";

type EstimateRepository = {
  getEstimateTree(estimateId: string): Promise<EstimateTree>;
  moveEstimateNode(estimateId: string, input: MoveEstimateNodeInput): Promise<EstimateTree>;
  moveEstimateRowItem(estimateId: string, input: MoveEstimateRowItemInput): Promise<EstimateTree>;
};

const inMemoryTrees = new Map<string, EstimateTree>();

function getEmptyEstimateTree(): EstimateTree {
  return { nodes: [], rows: [] };
}

export const estimateRepository: EstimateRepository = {
  async getEstimateTree(estimateId) {
    return inMemoryTrees.get(estimateId) ?? getEmptyEstimateTree();
  },

  async moveEstimateNode(estimateId, input) {
    const current = inMemoryTrees.get(estimateId) ?? getEmptyEstimateTree();
    const next = moveTreeNode(current, input);
    inMemoryTrees.set(estimateId, next);
    return next;
  },

  async moveEstimateRowItem(estimateId, input) {
    const current = inMemoryTrees.get(estimateId) ?? getEmptyEstimateTree();
    const next = moveTreeRowItem(current, input);
    inMemoryTrees.set(estimateId, next);
    return next;
  },
};
