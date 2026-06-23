import type { EstimateRowItem, EstimateTreeNode } from "@/lib/estimates/types";
import type { Json } from "@/lib/supabase/types";

export type EstimateRowItemPatch = {
  material?: string;
  description?: string;
  supplier?: string;
  unit?: string;
  quantity?: number;
  itemCost?: number;
  contingencyPercentage?: number;
  miscCost?: number;
  rowRevision?: number;
  sourceSnapshot?: Json | null;
  imageUrl?: string | null;
  sourceUrl?: string | null;
  metadata?: EstimateRowItem["metadata"];
  source?: EstimateRowItem["source"];
  sourceLibraryItemId?: string | null;
  linkState?: EstimateRowItem["linkState"];
};

type EstimateRowMutationResultPatchInput = {
  material: string;
  description: string;
  supplier: string;
  unit: string;
  quantity: number;
  itemCost: number;
  contingencyPercentage: number;
  miscCost: number;
  sourceSnapshot: Json | null;
  metadata: Json;
  linkState: EstimateRowItem["linkState"];
  rowRevision: number;
};

export function findEstimateRowItemInTree(tree: EstimateTreeNode[], rowId: string): EstimateRowItem | null {
  for (const node of tree) {
    for (const item of node.estimateRowItems ?? []) {
      if (item.id === rowId) return item;
    }
    const childItem = node.children ? findEstimateRowItemInTree(node.children, rowId) : null;
    if (childItem) return childItem;
  }

  return null;
}

function readSnapshotString(value: Json | null | undefined, key: "imageUrl" | "sourceUrl") {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const candidate = (value as Record<string, unknown>)[key];
  if (candidate === null) return null;
  return typeof candidate === "string" ? candidate : undefined;
}

export function estimateRowMutationResultToPatch(result: EstimateRowMutationResultPatchInput): EstimateRowItemPatch {
  return {
    material: result.material,
    description: result.description,
    supplier: result.supplier,
    unit: result.unit,
    quantity: result.quantity,
    itemCost: result.itemCost,
    contingencyPercentage: result.contingencyPercentage,
    miscCost: result.miscCost,
    sourceSnapshot: result.sourceSnapshot,
    imageUrl: readSnapshotString(result.sourceSnapshot, "imageUrl"),
    sourceUrl: readSnapshotString(result.sourceSnapshot, "sourceUrl"),
    metadata: result.metadata as EstimateRowItem["metadata"],
    linkState: result.linkState,
    rowRevision: result.rowRevision,
  };
}

export function applyEstimateRowItemPatch(item: EstimateRowItem, patch: EstimateRowItemPatch) {
  const quantity = patch.quantity ?? item.quantity;
  const itemCost = patch.itemCost ?? item.itemCost;
  const contingencyPercentage = patch.contingencyPercentage ?? item.contingencyPercentage ?? 0;
  const miscCost = patch.miscCost ?? item.miscCost;
  const subTotal = itemCost * quantity;
  const contingencyValue = (subTotal * contingencyPercentage) / 100;
  return {
    ...item,
    quantity,
    itemCost,
    subTotal,
    contingencyPercentage,
    contingencyValue,
    miscCost,
    totalItemCosts: subTotal + miscCost + contingencyValue,
    material: patch.material ?? item.material,
    description: patch.description ?? item.description,
    supplier: patch.supplier ?? item.supplier,
    unit: patch.unit ?? item.unit,
    rowRevision: patch.rowRevision ?? item.rowRevision,
    ...(patch.sourceSnapshot !== undefined ? { sourceSnapshot: patch.sourceSnapshot } : {}),
    ...(patch.imageUrl !== undefined ? { imageUrl: patch.imageUrl ?? undefined } : {}),
    ...(patch.sourceUrl !== undefined ? { sourceUrl: patch.sourceUrl ?? undefined } : {}),
    ...(patch.metadata !== undefined ? { metadata: patch.metadata } : {}),
    source: patch.source ?? item.source,
    sourceLibraryItemId: patch.sourceLibraryItemId !== undefined ? patch.sourceLibraryItemId : item.sourceLibraryItemId,
    linkState: patch.linkState ?? item.linkState,
  };
}

export function patchEstimateRowItemInTree(
  tree: EstimateTreeNode[],
  rowId: string,
  patch: EstimateRowItemPatch,
): EstimateTreeNode[] {
  let didChange = false;

  function visit(node: EstimateTreeNode): EstimateTreeNode {
    let nextItems = node.estimateRowItems;
    if (node.estimateRowItems?.some((item) => item.id === rowId)) {
      nextItems = node.estimateRowItems.map((item) => (item.id === rowId ? applyEstimateRowItemPatch(item, patch) : item));
      didChange = true;
    }

    let nextChildren = node.children;
    if (node.children?.length) {
      const patchedChildren = node.children.map(visit);
      if (patchedChildren.some((child, index) => child !== node.children?.[index])) nextChildren = patchedChildren;
    }

    if (nextItems === node.estimateRowItems && nextChildren === node.children) return node;
    return { ...node, estimateRowItems: nextItems, children: nextChildren };
  }

  const nextTree = tree.map(visit);
  return didChange ? nextTree : tree;
}
