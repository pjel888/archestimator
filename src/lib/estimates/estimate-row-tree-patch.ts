import type { EstimateRowItem, EstimateTreeNode } from "@/lib/estimates/types";
import type { Json } from "@/lib/types/json";
import { getProjectComponentIdentity } from "./express-components";

export type EstimateRowItemPatch = {
  material?: string;
  description?: string;
  brand?: string | null;
  supplier?: string;
  unit?: string;
  quantity?: number;
  quantityBase?: number | null;
  quantityContingencyAmount?: number | null;
  itemCost?: number;
  contingencyPercentage?: number;
  adjustmentPercentage?: number;
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
  quantityBase: number | null;
  quantityContingencyAmount: number | null;
  itemCost: number;
  contingencyPercentage: number;
  adjustmentPercentage: number;
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

function readSnapshotString(value: Json | null | undefined, key: "brand" | "imageUrl" | "sourceUrl") {
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
    brand: readSnapshotString(result.sourceSnapshot, "brand"),
    unit: result.unit,
    quantity: result.quantity,
    quantityBase: result.quantityBase,
    quantityContingencyAmount: result.quantityContingencyAmount,
    itemCost: result.itemCost,
    contingencyPercentage: result.contingencyPercentage,
    adjustmentPercentage: result.adjustmentPercentage,
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
  const quantityBase = patch.quantityBase !== undefined ? patch.quantityBase : item.quantityBase ?? null;
  const quantityContingencyAmount = patch.quantityContingencyAmount !== undefined
    ? patch.quantityContingencyAmount
    : item.quantityContingencyAmount ?? null;
  const itemCost = patch.itemCost ?? item.itemCost;
  const miscCost = patch.miscCost ?? item.miscCost;
  const subTotal = itemCost * quantity;
  const isQuantityContingency = quantityBase !== null;
  const contingencyPercentage = isQuantityContingency
    ? quantityBase > 0 ? ((quantityContingencyAmount ?? 0) / quantityBase) * 100 : 0
    : 0;
  const contingencyValue = 0;
  const adjustmentPercentage = patch.adjustmentPercentage ?? item.adjustmentPercentage ?? (isQuantityContingency ? 0 : item.contingencyPercentage ?? 0);
  const adjustmentValue = (subTotal * adjustmentPercentage) / 100;
  return {
    ...item,
    quantity,
    quantityBase,
    quantityContingencyAmount,
    itemCost,
    subTotal,
    contingencyPercentage,
    contingencyValue,
    adjustmentPercentage,
    adjustmentValue,
    miscCost,
    totalItemCosts: subTotal + miscCost + contingencyValue + adjustmentValue,
    material: patch.material ?? item.material,
    description: patch.description ?? item.description,
    ...(patch.brand !== undefined ? { brand: patch.brand ?? undefined } : {}),
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

const SHARED_PROJECT_COMPONENT_PATCH_KEYS: Array<keyof EstimateRowItemPatch> = [
  "material",
  "description",
  "brand",
  "supplier",
  "unit",
  "itemCost",
  "sourceSnapshot",
  "imageUrl",
  "sourceUrl",
];

function hasOwnPatchField(patch: EstimateRowItemPatch, key: keyof EstimateRowItemPatch) {
  return Object.prototype.hasOwnProperty.call(patch, key);
}

export function pickSharedProjectComponentPatch(patch: EstimateRowItemPatch): EstimateRowItemPatch {
  const next: EstimateRowItemPatch = {};
  for (const key of SHARED_PROJECT_COMPONENT_PATCH_KEYS) {
    if (hasOwnPatchField(patch, key)) {
      (next as Record<string, unknown>)[key] = patch[key];
    }
  }
  return next;
}

export function hasEstimateRowPatchFields(patch: EstimateRowItemPatch | undefined) {
  return Boolean(patch && Object.keys(patch).length > 0);
}

function getEstimateRowItemProjectComponentIdentity(item: EstimateRowItem) {
  const itemWithSnapshot = item as EstimateRowItem & { sourceSnapshot?: unknown };
  return getProjectComponentIdentity(item.metadata, item.id, itemWithSnapshot.sourceSnapshot);
}

function findProjectComponentIdentityForRow(tree: EstimateTreeNode[], rowId: string) {
  const row = findEstimateRowItemInTree(tree, rowId);
  return row ? getEstimateRowItemProjectComponentIdentity(row) : null;
}

function projectComponentInstanceMatches(item: EstimateRowItem, componentId: string) {
  return getEstimateRowItemProjectComponentIdentity(item) === componentId;
}

export function patchProjectComponentInstanceRowsInTree(
  tree: EstimateTreeNode[],
  rowId: string,
  patch: EstimateRowItemPatch,
): EstimateTreeNode[] {
  const componentId = findProjectComponentIdentityForRow(tree, rowId);
  const sharedPatch = pickSharedProjectComponentPatch(patch);
  if (!componentId || !hasEstimateRowPatchFields(sharedPatch)) return patchEstimateRowItemInTree(tree, rowId, patch);
  const sharedComponentId = componentId;

  let didChange = false;
  function visit(node: EstimateTreeNode): EstimateTreeNode {
    let nextItems = node.estimateRowItems;
    if (node.estimateRowItems?.some((item) => item.id === rowId || projectComponentInstanceMatches(item, sharedComponentId))) {
      nextItems = node.estimateRowItems.map((item) => {
        if (item.id === rowId) {
          didChange = true;
          return applyEstimateRowItemPatch(item, patch);
        }
        if (projectComponentInstanceMatches(item, sharedComponentId)) {
          didChange = true;
          return applyEstimateRowItemPatch(item, sharedPatch);
        }
        return item;
      });
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

function previousPatchForRow(item: EstimateRowItem, patch: EstimateRowItemPatch): EstimateRowItemPatch {
  const itemJson = item as EstimateRowItem & { sourceSnapshot?: Json | null };
  return {
    ...(hasOwnPatchField(patch, "material") ? { material: item.material } : {}),
    ...(hasOwnPatchField(patch, "description") ? { description: item.description } : {}),
    ...(hasOwnPatchField(patch, "brand") ? { brand: item.brand ?? null } : {}),
    ...(hasOwnPatchField(patch, "supplier") ? { supplier: item.supplier } : {}),
    ...(hasOwnPatchField(patch, "unit") ? { unit: item.unit } : {}),
    ...(hasOwnPatchField(patch, "quantity") ? { quantity: item.quantity } : {}),
    ...(hasOwnPatchField(patch, "quantityBase") ? { quantityBase: item.quantityBase ?? null } : {}),
    ...(hasOwnPatchField(patch, "quantityContingencyAmount") ? { quantityContingencyAmount: item.quantityContingencyAmount ?? null } : {}),
    ...(hasOwnPatchField(patch, "itemCost") ? { itemCost: item.itemCost } : {}),
    ...(hasOwnPatchField(patch, "contingencyPercentage") ? { contingencyPercentage: item.contingencyPercentage ?? 0 } : {}),
    ...(hasOwnPatchField(patch, "adjustmentPercentage") ? { adjustmentPercentage: item.adjustmentPercentage ?? 0 } : {}),
    ...(hasOwnPatchField(patch, "miscCost") ? { miscCost: item.miscCost } : {}),
    ...(hasOwnPatchField(patch, "sourceSnapshot") ? {
      sourceSnapshot: itemJson.sourceSnapshot ?? null,
      brand: readSnapshotString(itemJson.sourceSnapshot, "brand"),
      imageUrl: readSnapshotString(itemJson.sourceSnapshot, "imageUrl"),
      sourceUrl: readSnapshotString(itemJson.sourceSnapshot, "sourceUrl"),
    } : {}),
    ...(hasOwnPatchField(patch, "metadata") ? { metadata: itemJson.metadata ?? {} } : {}),
  };
}

export function collectProjectComponentRollbackPatches(
  tree: EstimateTreeNode[],
  rowId: string,
  patch: EstimateRowItemPatch,
) {
  const previousRow = findEstimateRowItemInTree(tree, rowId);
  if (!previousRow) return undefined;
  const componentId = getEstimateRowItemProjectComponentIdentity(previousRow);
  const sharedPatch = pickSharedProjectComponentPatch(patch);
  const patches: Record<string, EstimateRowItemPatch> = {
    [rowId]: previousPatchForRow(previousRow, patch),
  };
  if (!componentId || !hasEstimateRowPatchFields(sharedPatch)) return patches;
  const sharedComponentId = componentId;

  function visit(node: EstimateTreeNode) {
    for (const item of node.estimateRowItems ?? []) {
      if (item.id !== rowId && projectComponentInstanceMatches(item, sharedComponentId)) {
        patches[item.id] = previousPatchForRow(item, sharedPatch);
      }
    }
    node.children?.forEach(visit);
  }
  tree.forEach(visit);
  return patches;
}

export function restoreEstimateRowPatchesInTree(
  tree: EstimateTreeNode[],
  patches: Record<string, EstimateRowItemPatch>,
) {
  return Object.entries(patches).reduce(
    (nextTree, [rowId, patch]) => patchEstimateRowItemInTree(nextTree, rowId, patch),
    tree,
  );
}
