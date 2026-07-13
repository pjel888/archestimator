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
  componentIdentityByRowId: ReadonlyMap<string, string>;
  rowIdsByComponentIdentity: ReadonlyMap<string, readonly string[]>;
};

function getRowComponentIdentity(item: EstimateRowItem) {
  if (item.sourceLibraryItemId && item.linkState !== "detached" && item.linkState !== "unlinked") {
    return `library:${item.sourceLibraryItemId}`;
  }
  const itemWithSnapshot = item as EstimateRowItem & { sourceSnapshot?: unknown };
  const projectComponentId = getProjectComponentIdentity(item.metadata, item.id, itemWithSnapshot.sourceSnapshot);
  return projectComponentId ? `project:${projectComponentId}` : null;
}

export function createEstimateTreeIndex(tree: EstimateTreeNode[]): EstimateTreeIndex {
  const nodesById = new Map<string, EstimateTreeNodeLocation>();
  const rowsById = new Map<string, EstimateTreeRowLocation>();
  const componentIdentityByRowId = new Map<string, string>();
  const rowIdsByComponentIdentity = new Map<string, string[]>();

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
        const componentIdentity = getRowComponentIdentity(item);
        if (!componentIdentity) return;
        componentIdentityByRowId.set(item.id, componentIdentity);
        const rowIds = rowIdsByComponentIdentity.get(componentIdentity);
        if (rowIds) rowIds.push(item.id);
        else rowIdsByComponentIdentity.set(componentIdentity, [item.id]);
      });
      if (node.children?.length) visit(node.children, nodePath, [...ancestorNodes, node], nodeCodeParts);
    });
  }

  visit(tree, [], [], []);
  return { nodesById, rowsById, componentIdentityByRowId, rowIdsByComponentIdentity };
}
