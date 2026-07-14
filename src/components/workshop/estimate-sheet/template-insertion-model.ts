import type { EstimateRowItem, EstimateTreeNode } from "../estimate-tree-data";
import { calculateContingencyValue } from "./rows/editable-row-model";

export function createEstimateRowItemId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();

  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

export function cloneLibraryItemForEstimate(libraryItem: EstimateRowItem): EstimateRowItem {
  const id = createEstimateRowItemId();
  const quantity = libraryItem.quantity || 1;
  const contingencyPercentage = libraryItem.contingencyPercentage ?? 0;
  const adjustmentPercentage = libraryItem.adjustmentPercentage ?? (libraryItem.quantityBase === null || libraryItem.quantityBase === undefined ? contingencyPercentage : 0);
  const miscCost = libraryItem.miscCost ?? 0;
  const subTotal = libraryItem.itemCost * quantity;
  const contingencyValue = 0;
  const adjustmentValue = calculateContingencyValue(subTotal, adjustmentPercentage);
  return {
    ...libraryItem,
    id,
    quantity,
    subTotal,
    contingencyPercentage,
    contingencyValue,
    adjustmentPercentage,
    adjustmentValue,
    miscCost,
    totalItemCosts: subTotal + miscCost + contingencyValue + adjustmentValue,
  };
}

export function cloneTemplateNodesForEstimate(nodes: EstimateTreeNode[]): EstimateTreeNode[] {
  function cloneNode(node: EstimateTreeNode): EstimateTreeNode {
    return {
      ...node,
      id: createEstimateRowItemId(),
      total: "PHP 0.00",
      children: node.children?.map(cloneNode) ?? [],
      estimateRowItems: node.estimateRowItems?.map(cloneLibraryItemForEstimate) ?? [],
    };
  }

  return nodes.map(cloneNode);
}

export function appendTemplateNodesToParent(
  nodes: EstimateTreeNode[],
  targetParentNodeId: string,
  templateNodes: EstimateTreeNode[],
): EstimateTreeNode[] {
  return nodes.map((node) => {
    if (node.id === targetParentNodeId) {
      return { ...node, children: [...(node.children ?? []), ...templateNodes] };
    }

    return {
      ...node,
      children: node.children ? appendTemplateNodesToParent(node.children, targetParentNodeId, templateNodes) : node.children,
    };
  });
}

function findNodeChildren(nodes: EstimateTreeNode[], nodeId: string): EstimateTreeNode[] | null {
  for (const node of nodes) {
    if (node.id === nodeId) return node.children ?? [];
    const nestedChildren = findNodeChildren(node.children ?? [], nodeId);
    if (nestedChildren) return nestedChildren;
  }
  return null;
}

function removeNodesById(nodes: EstimateTreeNode[], nodeIds: ReadonlySet<string>): EstimateTreeNode[] {
  let didChange = false;
  const nextNodes: EstimateTreeNode[] = [];
  for (const node of nodes) {
    if (nodeIds.has(node.id)) {
      didChange = true;
      continue;
    }
    const nextChildren = removeNodesById(node.children ?? [], nodeIds);
    if (nextChildren !== node.children && (node.children?.length ?? 0) > 0) {
      didChange = true;
      nextNodes.push({ ...node, children: nextChildren });
    } else {
      nextNodes.push(node);
    }
  }
  return didChange ? nextNodes : nodes;
}

export function reconcileAuthoritativeInsertedRoots({
  currentTree,
  authoritativeTree,
  targetParentNodeId,
  authoritativeRootNodeIds,
  optimisticRootNodeIds = [],
}: {
  currentTree: EstimateTreeNode[];
  authoritativeTree: EstimateTreeNode[];
  targetParentNodeId: string;
  authoritativeRootNodeIds: readonly string[];
  optimisticRootNodeIds?: readonly string[];
}): EstimateTreeNode[] {
  const authoritativeIds = new Set(authoritativeRootNodeIds);
  const authoritativeRoots = (findNodeChildren(authoritativeTree, targetParentNodeId) ?? [])
    .filter((node) => authoritativeIds.has(node.id));
  if (authoritativeRoots.length !== authoritativeIds.size) return authoritativeTree;

  const replaceIds = new Set([...optimisticRootNodeIds, ...authoritativeRootNodeIds]);
  const currentTargetChildren = findNodeChildren(currentTree, targetParentNodeId) ?? [];
  const matchedInsertionIndex = currentTargetChildren.findIndex((node) => replaceIds.has(node.id));
  const cleanedTree = removeNodesById(currentTree, replaceIds);
  let didInsert = false;
  const reconciledTree = cleanedTree.map(function reconcileNode(node): EstimateTreeNode {
    if (node.id === targetParentNodeId) {
      didInsert = true;
      const children = [...(node.children ?? [])];
      const insertionIndex = matchedInsertionIndex >= 0 ? matchedInsertionIndex : children.length;
      children.splice(Math.min(insertionIndex, children.length), 0, ...authoritativeRoots);
      return { ...node, children };
    }
    const children = node.children?.map(reconcileNode);
    return children ? { ...node, children } : node;
  });
  return didInsert ? reconciledTree : authoritativeTree;
}
