import type { EstimateRowItem, EstimateTreeNode } from "@/lib/estimates/types";
import type { Json } from "@/lib/types/json";
import { createEstimateTreeIndex, type EstimateTreeIndex } from "./estimate-tree-index";

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
  category?: string;
  categoryNodeId?: string | null;
  brandId?: string | null;
  supplierId?: string | null;
  sku?: string | null;
  pricingSource?: string | null;
  pricingDate?: string | null;
  confidence?: string | null;
  priceOptionId?: string | null;
  priceOptionLabel?: string | null;
  priceOptions?: EstimateRowItem["priceOptions"];
  lifecycleState?: EstimateRowItem["lifecycleState"] | null;
  lifecycleStateChangedAt?: string | null;
  componentVersionId?: string | null;
  componentVersionNumber?: number | null;
  notes?: string | null;
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

function readSnapshotString(value: Json | null | undefined, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const candidate = (value as Record<string, unknown>)[key];
  if (candidate === null) return null;
  return typeof candidate === "string" ? candidate : undefined;
}

function readSnapshotNumber(value: Json | null | undefined, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const candidate = (value as Record<string, unknown>)[key];
  if (candidate === null) return null;
  return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : undefined;
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
    category: readSnapshotString(result.sourceSnapshot, "category") ?? undefined,
    categoryNodeId: readSnapshotString(result.sourceSnapshot, "categoryNodeId"),
    brandId: readSnapshotString(result.sourceSnapshot, "brandId"),
    supplierId: readSnapshotString(result.sourceSnapshot, "supplierId"),
    sku: readSnapshotString(result.sourceSnapshot, "sku"),
    pricingSource: readSnapshotString(result.sourceSnapshot, "pricingSource"),
    pricingDate: readSnapshotString(result.sourceSnapshot, "pricingDate"),
    confidence: readSnapshotString(result.sourceSnapshot, "confidence"),
    priceOptionId: readSnapshotString(result.sourceSnapshot, "priceOptionId"),
    priceOptionLabel: readSnapshotString(result.sourceSnapshot, "priceOptionLabel") ?? undefined,
    lifecycleState: readSnapshotString(result.sourceSnapshot, "lifecycleState") as EstimateRowItem["lifecycleState"] | null | undefined,
    lifecycleStateChangedAt: readSnapshotString(result.sourceSnapshot, "sourceUpdatedAt"),
    componentVersionId: readSnapshotString(result.sourceSnapshot, "componentVersionId"),
    notes: readSnapshotString(result.sourceSnapshot, "notes"),
    componentVersionNumber: readSnapshotNumber(result.sourceSnapshot, "componentVersionNumber") ?? undefined,
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
    category: patch.category ?? item.category,
    ...(patch.categoryNodeId !== undefined ? { categoryNodeId: patch.categoryNodeId ?? undefined } : {}),
    ...(patch.brandId !== undefined ? { brandId: patch.brandId ?? undefined } : {}),
    ...(patch.supplierId !== undefined ? { supplierId: patch.supplierId ?? undefined } : {}),
    ...(patch.sku !== undefined ? { sku: patch.sku ?? undefined } : {}),
    ...(patch.pricingSource !== undefined ? { pricingSource: patch.pricingSource ?? item.pricingSource } : {}),
    ...(patch.pricingDate !== undefined ? { pricingDate: patch.pricingDate ?? item.pricingDate } : {}),
    ...(patch.confidence !== undefined ? { confidence: patch.confidence ?? undefined } : {}),
    ...(patch.priceOptionId !== undefined ? { priceOptionId: patch.priceOptionId } : {}),
    ...(patch.priceOptionLabel !== undefined ? { priceOptionLabel: patch.priceOptionLabel ?? undefined } : {}),
    ...(patch.priceOptions !== undefined ? { priceOptions: patch.priceOptions } : {}),
    ...(patch.lifecycleState !== undefined ? { lifecycleState: patch.lifecycleState ?? undefined } : {}),
    ...(patch.lifecycleStateChangedAt !== undefined ? { lifecycleStateChangedAt: patch.lifecycleStateChangedAt ?? undefined } : {}),
    ...(patch.componentVersionId !== undefined ? { componentVersionId: patch.componentVersionId ?? undefined } : {}),
    ...(patch.componentVersionNumber !== undefined ? { componentVersionNumber: patch.componentVersionNumber ?? undefined } : {}),
    ...(patch.notes !== undefined ? { notes: patch.notes ?? undefined } : {}),
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
  "category",
  "categoryNodeId",
  "brandId",
  "supplierId",
  "sku",
  "pricingSource",
  "pricingDate",
  "confidence",
  "priceOptionId",
  "priceOptionLabel",
  "priceOptions",
  "lifecycleState",
  "lifecycleStateChangedAt",
  "componentVersionId",
  "componentVersionNumber",
  "notes",
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

function patchRowsById(
  tree: EstimateTreeNode[],
  patches: ReadonlyMap<string, EstimateRowItemPatch>,
  index: EstimateTreeIndex,
) {
  const patchesByNodePath = new Map<string, Map<number, EstimateRowItemPatch>>();
  for (const [rowId, patch] of patches) {
    const location = index.rowsById.get(rowId);
    if (!location) continue;
    const pathKey = location.nodePath.join("/");
    const nodePatches = patchesByNodePath.get(pathKey) ?? new Map<number, EstimateRowItemPatch>();
    nodePatches.set(location.rowIndex, patch);
    patchesByNodePath.set(pathKey, nodePatches);
  }
  if (patchesByNodePath.size === 0) return tree;
  const affectedPathPrefixes = new Set<string>();
  for (const pathKey of patchesByNodePath.keys()) {
    const pathParts = pathKey.split("/");
    for (let length = 1; length <= pathParts.length; length += 1) {
      affectedPathPrefixes.add(pathParts.slice(0, length).join("/"));
    }
  }

  function visit(nodes: EstimateTreeNode[], parentPath: number[]): EstimateTreeNode[] {
    let nextNodes = nodes;
    nodes.forEach((node, nodeIndex) => {
      const nodePath = [...parentPath, nodeIndex];
      const pathKey = nodePath.join("/");
      if (!affectedPathPrefixes.has(pathKey)) return;
      const rowPatches = patchesByNodePath.get(pathKey);
      const nextItems = rowPatches && node.estimateRowItems
        ? node.estimateRowItems.map((item, rowIndex) => {
          const patch = rowPatches.get(rowIndex);
          return patch ? applyEstimateRowItemPatch(item, patch) : item;
        })
        : node.estimateRowItems;
      const nextChildren = node.children?.length ? visit(node.children, nodePath) : node.children;
      if (nextItems === node.estimateRowItems && nextChildren === node.children) return;
      if (nextNodes === nodes) nextNodes = [...nodes];
      nextNodes[nodeIndex] = { ...node, estimateRowItems: nextItems, children: nextChildren };
    });
    return nextNodes;
  }

  return visit(tree, []);
}

export function patchProjectComponentInstanceRowsInTree(
  tree: EstimateTreeNode[],
  rowId: string,
  patch: EstimateRowItemPatch,
  existingIndex?: EstimateTreeIndex,
): EstimateTreeNode[] {
  const index = existingIndex ?? createEstimateTreeIndex(tree);
  const componentId = index.projectComponentIdByRowId.get(rowId);
  const sharedPatch = pickSharedProjectComponentPatch(patch);
  if (!componentId || !hasEstimateRowPatchFields(sharedPatch)) return patchRowsById(tree, new Map([[rowId, patch]]), index);

  const patches = new Map<string, EstimateRowItemPatch>();
  for (const instanceRowId of index.rowIdsByProjectComponentId.get(componentId) ?? []) {
    patches.set(instanceRowId, instanceRowId === rowId ? patch : sharedPatch);
  }
  return patchRowsById(tree, patches, index);
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
    ...(hasOwnPatchField(patch, "category") ? { category: item.category } : {}),
    ...(hasOwnPatchField(patch, "categoryNodeId") ? { categoryNodeId: item.categoryNodeId ?? null } : {}),
    ...(hasOwnPatchField(patch, "brandId") ? { brandId: item.brandId ?? null } : {}),
    ...(hasOwnPatchField(patch, "supplierId") ? { supplierId: item.supplierId ?? null } : {}),
    ...(hasOwnPatchField(patch, "sku") ? { sku: item.sku ?? null } : {}),
    ...(hasOwnPatchField(patch, "pricingSource") ? { pricingSource: item.pricingSource } : {}),
    ...(hasOwnPatchField(patch, "pricingDate") ? { pricingDate: item.pricingDate } : {}),
    ...(hasOwnPatchField(patch, "confidence") ? { confidence: item.confidence ?? null } : {}),
    ...(hasOwnPatchField(patch, "priceOptionId") ? { priceOptionId: item.priceOptionId ?? null } : {}),
    ...(hasOwnPatchField(patch, "priceOptionLabel") ? { priceOptionLabel: item.priceOptionLabel ?? null } : {}),
    ...(hasOwnPatchField(patch, "priceOptions") ? { priceOptions: item.priceOptions } : {}),
    ...(hasOwnPatchField(patch, "lifecycleState") ? { lifecycleState: item.lifecycleState ?? null } : {}),
    ...(hasOwnPatchField(patch, "lifecycleStateChangedAt") ? { lifecycleStateChangedAt: item.lifecycleStateChangedAt ?? null } : {}),
    ...(hasOwnPatchField(patch, "componentVersionId") ? { componentVersionId: item.componentVersionId ?? null } : {}),
    ...(hasOwnPatchField(patch, "componentVersionNumber") ? { componentVersionNumber: item.componentVersionNumber ?? null } : {}),
    ...(hasOwnPatchField(patch, "notes") ? { notes: item.notes ?? null } : {}),
    ...(hasOwnPatchField(patch, "metadata") ? { metadata: itemJson.metadata ?? {} } : {}),
  };
}

export function collectProjectComponentRollbackPatches(
  tree: EstimateTreeNode[],
  rowId: string,
  patch: EstimateRowItemPatch,
  existingIndex?: EstimateTreeIndex,
) {
  const index = existingIndex ?? createEstimateTreeIndex(tree);
  const location = index.rowsById.get(rowId);
  const previousRow = location ? getEstimateRowAtLocation(tree, location.nodePath, location.rowIndex) : null;
  if (!previousRow) return undefined;
  const componentId = index.projectComponentIdByRowId.get(rowId);
  const sharedPatch = pickSharedProjectComponentPatch(patch);
  const patches: Record<string, EstimateRowItemPatch> = {
    [rowId]: previousPatchForRow(previousRow, patch),
  };
  if (!componentId || !hasEstimateRowPatchFields(sharedPatch)) return patches;
  for (const instanceRowId of index.rowIdsByProjectComponentId.get(componentId) ?? []) {
    if (instanceRowId === rowId) continue;
    const instanceLocation = index.rowsById.get(instanceRowId);
    const item = instanceLocation ? getEstimateRowAtLocation(tree, instanceLocation.nodePath, instanceLocation.rowIndex) : null;
    if (item) patches[instanceRowId] = previousPatchForRow(item, sharedPatch);
  }
  return patches;
}

export function restoreEstimateRowPatchesInTree(
  tree: EstimateTreeNode[],
  patches: Record<string, EstimateRowItemPatch>,
) {
  return patchRowsById(tree, new Map(Object.entries(patches)), createEstimateTreeIndex(tree));
}

function getEstimateRowAtLocation(tree: EstimateTreeNode[], nodePath: number[], rowIndex: number) {
  let nodes = tree;
  let node: EstimateTreeNode | undefined;
  for (const nodeIndex of nodePath) {
    node = nodes[nodeIndex];
    if (!node) return null;
    nodes = node.children ?? [];
  }
  return node?.estimateRowItems?.[rowIndex] ?? null;
}
