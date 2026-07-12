import type { EstimateRowItem, EstimateTreeNode } from "@/lib/estimates/types";
import { getProjectComponentIdentity } from "./express-components";

export type EstimateTreeRowLocation = {
  ancestorNodeIds: readonly string[];
  nodeId: string;
  nodePath: number[];
  rowIndex: number;
};

export type EstimateTreeNodeLocation = {
  node: EstimateTreeNode;
  ancestorNodes: readonly EstimateTreeNode[];
  nodePath: readonly number[];
  nodeCode: string;
};

export type EstimateTreeIndex = {
  nodesById: ReadonlyMap<string, EstimateTreeNodeLocation>;
  rowsById: ReadonlyMap<string, EstimateTreeRowLocation>;
  projectComponentIdByRowId: ReadonlyMap<string, string>;
  rowIdsByProjectComponentId: ReadonlyMap<string, readonly string[]>;
};

function getRowProjectComponentIdentity(item: EstimateRowItem) {
  const itemWithSnapshot = item as EstimateRowItem & { sourceSnapshot?: unknown };
  return getProjectComponentIdentity(item.metadata, item.id, itemWithSnapshot.sourceSnapshot);
}

export function createEstimateTreeIndex(tree: EstimateTreeNode[]): EstimateTreeIndex {
  const nodesById = new Map<string, EstimateTreeNodeLocation>();
  const rowsById = new Map<string, EstimateTreeRowLocation>();
  const projectComponentIdByRowId = new Map<string, string>();
  const rowIdsByProjectComponentId = new Map<string, string[]>();

  function visit(nodes: EstimateTreeNode[], parentPath: number[], ancestorNodes: EstimateTreeNode[], parentCode: string[]) {
    nodes.forEach((node, nodeIndex) => {
      const nodePath = [...parentPath, nodeIndex];
      const nodeCodeParts = [...parentCode, String(nodeIndex + 1).padStart(2, "0")];
      nodesById.set(node.id, { node, ancestorNodes, nodePath, nodeCode: nodeCodeParts.join(".") });
      node.estimateRowItems?.forEach((item, rowIndex) => {
        rowsById.set(item.id, {
          ancestorNodeIds: [...ancestorNodes.map((ancestor) => ancestor.id), node.id],
          nodeId: node.id,
          nodePath,
          rowIndex,
        });
        const componentId = getRowProjectComponentIdentity(item);
        if (!componentId) return;
        projectComponentIdByRowId.set(item.id, componentId);
        const rowIds = rowIdsByProjectComponentId.get(componentId);
        if (rowIds) rowIds.push(item.id);
        else rowIdsByProjectComponentId.set(componentId, [item.id]);
      });
      if (node.children?.length) visit(node.children, nodePath, [...ancestorNodes, node], nodeCodeParts);
    });
  }

  visit(tree, [], [], []);
  return { nodesById, rowsById, projectComponentIdByRowId, rowIdsByProjectComponentId };
}
