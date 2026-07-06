import type { TreeDropPosition } from "@/components/ui/tree";
import { validateEstimateTreeDrop } from "@/lib/estimates/estimate-tree-reorder";
import type { EstimateTreeNode } from "../estimate-tree-data";

export type EstimateTreeMoveSelection = {
  id: string;
  targetNodeId: string;
  position: TreeDropPosition;
};

export type EstimateTreeMoveOption = {
  id: string;
  label: string;
  detail: string;
  depth: number;
  selection: EstimateTreeMoveSelection;
  disabled: boolean;
  reason: string;
};

export type BuildEstimateTreeMoveOptionsInput = {
  nodes: EstimateTreeNode[];
  sourceNodeId: string;
  canReorderNow: boolean;
  editingNodeActive: boolean;
  treeSearchActive: boolean;
  isOptimisticNodeId: (nodeId: string) => boolean;
};

export function buildEstimateTreeMoveOptions({
  nodes,
  sourceNodeId,
  canReorderNow,
  editingNodeActive,
  treeSearchActive,
  isOptimisticNodeId,
}: BuildEstimateTreeMoveOptionsInput): EstimateTreeMoveOption[] {
  const options: EstimateTreeMoveOption[] = [];
  const globalDisabled = !canReorderNow || editingNodeActive || treeSearchActive || isOptimisticNodeId(sourceNodeId);
  const globalReason = treeSearchActive
    ? "Clear tree search before moving nodes."
    : editingNodeActive
      ? "Finish renaming before moving nodes."
      : !canReorderNow
        ? "Finish the current tree save before moving nodes."
        : isOptimisticNodeId(sourceNodeId)
          ? "Wait for this new node to finish saving first."
          : "";

  function addOption({
    id,
    label,
    detail,
    depth,
    targetNodeId,
    position,
  }: {
    id: string;
    label: string;
    detail: string;
    depth: number;
    targetNodeId: string;
    position: TreeDropPosition;
  }) {
    const validation = validateEstimateTreeDrop({
      nodes,
      draggedNodeIds: [sourceNodeId],
      target: { targetNodeId, position },
    });
    const targetIsPendingCreate = isOptimisticNodeId(targetNodeId);
    options.push({
      id,
      label,
      detail,
      depth,
      selection: { id, targetNodeId, position },
      disabled: globalDisabled || targetIsPendingCreate || !validation.ok,
      reason: globalReason || (targetIsPendingCreate ? "Wait for this node to finish saving first." : validation.ok ? detail : validation.message),
    });
  }

  const firstRoot = nodes[0];
  const lastRoot = nodes[nodes.length - 1];
  if (firstRoot) {
    addOption({
      id: "root:top",
      label: "Top of tree",
      detail: `Before ${firstRoot.name}`,
      depth: 0,
      targetNodeId: firstRoot.id,
      position: "before",
    });
  }
  if (lastRoot) {
    addOption({
      id: "root:bottom",
      label: "Bottom of tree",
      detail: `After ${lastRoot.name}`,
      depth: 0,
      targetNodeId: lastRoot.id,
      position: "after",
    });
  }

  function visit(nodesToVisit: EstimateTreeNode[], depth: number, parentPath: string[]) {
    nodesToVisit.forEach((node) => {
      const path = [...parentPath, node.name].join(" / ");
      addOption({
        id: `${node.id}:before`,
        label: `Before ${node.name}`,
        detail: path,
        depth,
        targetNodeId: node.id,
        position: "before",
      });
      addOption({
        id: `${node.id}:inside`,
        label: `Inside ${node.name}`,
        detail: path,
        depth: depth + 1,
        targetNodeId: node.id,
        position: "inside",
      });
      addOption({
        id: `${node.id}:after`,
        label: `After ${node.name}`,
        detail: path,
        depth,
        targetNodeId: node.id,
        position: "after",
      });
      visit(node.children ?? [], depth + 1, [...parentPath, node.name]);
    });
  }

  visit(nodes, 0, []);
  return options;
}
