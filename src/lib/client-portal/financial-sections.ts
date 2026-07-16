import { ESTIMATE_CALCULATION_CURRENCY_SCALE } from "@/lib/estimates/estimate-row-total";
import type { PublicationSnapshotEstimate, PublicationSnapshotRow, PublicationSnapshotTreeNode } from "@/lib/publication/types";

export type ClientPortalFinancialSummaryPayload = {
  currencyCode: string;
  estimateCount: number;
  schemaVersion: 1;
  totalCost: number;
  totalCostMinorUnits: number;
};

export type ClientPortalCostBreakdownPayload = {
  buckets: Array<{ id: string; label: string; path?: string[]; pathIds?: string[]; totalCost: number; totalCostMinorUnits: number }>;
  categoryHierarchy?: ClientPortalCategoryHierarchyNode[];
  currencyCode: string;
  groupBy: "area" | "category" | "discipline" | "supplier";
  includeCharts: boolean;
  schemaVersion: 1;
  totalCost: number;
  totalCostMinorUnits: number;
};

export type ClientPortalCategoryHierarchyNode = {
  id: string;
  label: string;
  path: string[];
  pathIds: string[];
  ownTotalCost: number;
  ownTotalCostMinorUnits: number;
  totalCost: number;
  totalCostMinorUnits: number;
  children: ClientPortalCategoryHierarchyNode[];
};

export type ClientPortalEstimateComparisonPayload = {
  currencyCode: string;
  displayMode: "absolute";
  estimates: Array<{ id: string; name: string; rowCount: number; totalCost: number; totalCostMinorUnits: number }>;
  schemaVersion: 1;
  totalCost: number;
  totalCostMinorUnits: number;
};

const MINOR_UNIT_FACTOR = 10 ** ESTIMATE_CALCULATION_CURRENCY_SCALE;

function amountFromMinorUnits(value: number) {
  if (!Number.isSafeInteger(value)) throw new Error("Client Portal total exceeds the supported minor-unit range.");
  return value / MINOR_UNIT_FACTOR;
}

function rowMinorUnits(row: PublicationSnapshotRow) {
  const value = row.rowTotalMinorUnits ?? Math.round(row.rowTotal * MINOR_UNIT_FACTOR);
  if (!Number.isSafeInteger(value)) throw new Error("Client Portal row total is not representable in minor units.");
  return value;
}

function estimateMinorUnits(estimate: PublicationSnapshotEstimate) {
  const value = estimate.totalCostMinorUnits ?? estimate.rows.reduce((total, row) => total + rowMinorUnits(row), 0);
  if (!Number.isSafeInteger(value)) throw new Error("Client Portal estimate total exceeds the supported minor-unit range.");
  return value;
}

function totalMinorUnits(estimates: readonly PublicationSnapshotEstimate[]) {
  return estimates.reduce((total, estimate) => {
    const next = total + estimateMinorUnits(estimate);
    if (!Number.isSafeInteger(next)) throw new Error("Client Portal total exceeds the supported minor-unit range.");
    return next;
  }, 0);
}

export function buildClientPortalFinancialSummaryPayload(input: { currencyCode: string; estimates: readonly PublicationSnapshotEstimate[] }): ClientPortalFinancialSummaryPayload {
  const issuedTotalMinorUnits = totalMinorUnits(input.estimates);
  return { schemaVersion: 1, currencyCode: input.currencyCode, estimateCount: input.estimates.length, totalCost: amountFromMinorUnits(issuedTotalMinorUnits), totalCostMinorUnits: issuedTotalMinorUnits };
}

function areaLabels(nodes: readonly PublicationSnapshotTreeNode[]) {
  const labels = new Map<string, string>();
  const visit = (node: PublicationSnapshotTreeNode, inheritedArea: string | null) => {
    const area = node.kind === "area" ? node.name.trim() || inheritedArea : inheritedArea;
    labels.set(node.id, area ?? (node.name.trim() || "Uncategorized"));
    for (const child of node.children) visit(child, area);
  };
  for (const node of nodes) visit(node, null);
  return labels;
}

function fallbackAreaLabel(row: PublicationSnapshotRow) {
  return row.designation.split(/\s*(?:>|\/|\s[-–—]\s)\s*/).map((part) => part.trim()).find(Boolean) ?? (row.discipline.trim() || "Uncategorized");
}

type CategoryBucketIdentity = {
  id: string;
  label: string;
  path: string[];
  pathIds: string[];
};

function normalizedLegacyCategoryLabel(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function categoryBucketIdentity(row: PublicationSnapshotRow): CategoryBucketIdentity {
  const fallbackLabel = row.category?.trim() || "Uncategorized";
  const path = (row.categoryPath ?? []).map((label) => label.trim()).filter(Boolean);
  if (path.length === 0) path.push(fallbackLabel);
  const pathIds = (row.categoryPathIds ?? []).map((id) => id.trim()).filter((id) => /^cat_[A-Za-z0-9_-]{20}$/.test(id));
  if (pathIds.length === path.length && pathIds.length > 0) {
    return { id: `category:${pathIds.join("/")}`, label: path.at(-1) ?? fallbackLabel, path, pathIds };
  }
  const categoryId = row.categoryId?.trim();
  if (categoryId && /^cat_[A-Za-z0-9_-]{20}$/.test(categoryId) && path.length === 1) {
    return { id: `category:${categoryId}`, label: path[0] ?? fallbackLabel, path, pathIds: [categoryId] };
  }
  const legacyLabel = row.category?.trim() || path.at(-1) || "Uncategorized";
  return {
    id: `legacy:${normalizedLegacyCategoryLabel(legacyLabel)}`,
    label: legacyLabel,
    path: [legacyLabel],
    pathIds: [],
  };
}

type MutableCategoryHierarchyNode = {
  identity: CategoryBucketIdentity;
  ownTotalMinorUnits: number;
  totalMinorUnits: number;
  children: Map<string, MutableCategoryHierarchyNode>;
};

function addCategoryHierarchyValue(
  roots: Map<string, MutableCategoryHierarchyNode>,
  identity: CategoryBucketIdentity,
  value: number,
) {
  if (identity.pathIds.length === 0) {
    const current = roots.get(identity.id) ?? { identity, ownTotalMinorUnits: 0, totalMinorUnits: 0, children: new Map() };
    const nextOwnTotal = current.ownTotalMinorUnits + value;
    const nextTotal = current.totalMinorUnits + value;
    if (!Number.isSafeInteger(nextOwnTotal) || !Number.isSafeInteger(nextTotal)) {
      throw new Error("Client Portal legacy category total exceeds the supported minor-unit range.");
    }
    current.ownTotalMinorUnits = nextOwnTotal;
    current.totalMinorUnits = nextTotal;
    roots.set(identity.id, current);
    return;
  }

  let siblings = roots;
  for (let index = 0; index < identity.pathIds.length; index += 1) {
    const pathIds = identity.pathIds.slice(0, index + 1);
    const path = identity.path.slice(0, index + 1);
    const id = `category:${pathIds.join("/")}`;
    const nodeIdentity = { id, label: path.at(-1) ?? "Uncategorized", path, pathIds };
    const node = siblings.get(id) ?? { identity: nodeIdentity, ownTotalMinorUnits: 0, totalMinorUnits: 0, children: new Map() };
    const nextTotal = node.totalMinorUnits + value;
    if (!Number.isSafeInteger(nextTotal)) throw new Error("Client Portal category total exceeds the supported minor-unit range.");
    node.totalMinorUnits = nextTotal;
    if (index === identity.pathIds.length - 1) {
      const nextOwnTotal = node.ownTotalMinorUnits + value;
      if (!Number.isSafeInteger(nextOwnTotal)) throw new Error("Client Portal category own-items total exceeds the supported minor-unit range.");
      node.ownTotalMinorUnits = nextOwnTotal;
    }
    siblings.set(id, node);
    siblings = node.children;
  }
}

function finalizeCategoryHierarchy(nodes: Map<string, MutableCategoryHierarchyNode>): ClientPortalCategoryHierarchyNode[] {
  return [...nodes.values()]
    .map((node) => ({
      id: node.identity.id,
      label: node.identity.label,
      path: node.identity.path,
      pathIds: node.identity.pathIds,
      ownTotalCost: amountFromMinorUnits(node.ownTotalMinorUnits),
      ownTotalCostMinorUnits: node.ownTotalMinorUnits,
      totalCost: amountFromMinorUnits(node.totalMinorUnits),
      totalCostMinorUnits: node.totalMinorUnits,
      children: finalizeCategoryHierarchy(node.children),
    }))
    .sort((left, right) => right.totalCostMinorUnits - left.totalCostMinorUnits || left.label.localeCompare(right.label));
}

export function buildClientPortalCostBreakdownPayload(input: { currencyCode: string; estimates: readonly PublicationSnapshotEstimate[]; groupBy?: "area" | "category" | "discipline" | "supplier"; includeCharts?: boolean }): ClientPortalCostBreakdownPayload {
  const groupBy = input.groupBy ?? "area";
  const totals = new Map<string, { label: string; path?: string[]; pathIds?: string[]; value: number }>();
  const categoryHierarchy = new Map<string, MutableCategoryHierarchyNode>();
  for (const estimate of input.estimates) {
    const nodeAreaLabels = groupBy === "area" ? areaLabels(estimate.treeNodes ?? []) : null;
    for (const row of estimate.rows) {
      const categoryIdentity = groupBy === "category" ? categoryBucketIdentity(row) : null;
      const label = groupBy === "area"
        ? (row.nodeId ? nodeAreaLabels?.get(row.nodeId) : null) ?? fallbackAreaLabel(row)
        : groupBy === "category"
          ? categoryIdentity?.label ?? "Uncategorized"
          : groupBy === "supplier"
            ? row.supplier?.trim() || "Uncategorized"
            : row.discipline.trim() || "Uncategorized";
      const id = categoryIdentity?.id ?? `${groupBy}:${label.toLocaleLowerCase()}`;
      const rowValue = rowMinorUnits(row);
      const current = totals.get(id);
      const next = (current?.value ?? 0) + rowValue;
      if (!Number.isSafeInteger(next)) throw new Error("Client Portal bucket total exceeds the supported minor-unit range.");
      totals.set(id, {
        label: current?.label ?? label,
        path: current?.path ?? categoryIdentity?.path,
        pathIds: current?.pathIds ?? categoryIdentity?.pathIds,
        value: next,
      });
      if (categoryIdentity) addCategoryHierarchyValue(categoryHierarchy, categoryIdentity, rowValue);
    }
  }
  const buckets = [...totals.entries()]
    .map(([id, bucket]) => ({ id, label: bucket.label, ...(bucket.path ? { path: bucket.path } : {}), ...(bucket.pathIds ? { pathIds: bucket.pathIds } : {}), totalCost: amountFromMinorUnits(bucket.value), totalCostMinorUnits: bucket.value }))
    .sort((left, right) => right.totalCost - left.totalCost || left.label.localeCompare(right.label));
  const issuedTotalMinorUnits = buckets.reduce((total, bucket) => total + bucket.totalCostMinorUnits, 0);
  return {
    schemaVersion: 1,
    currencyCode: input.currencyCode,
    groupBy,
    includeCharts: input.includeCharts ?? false,
    buckets,
    ...(groupBy === "category" ? { categoryHierarchy: finalizeCategoryHierarchy(categoryHierarchy) } : {}),
    totalCost: amountFromMinorUnits(issuedTotalMinorUnits),
    totalCostMinorUnits: issuedTotalMinorUnits,
  };
}

export function buildClientPortalEstimateComparisonPayload(input: { currencyCode: string; estimates: readonly PublicationSnapshotEstimate[]; displayMode?: "absolute" }): ClientPortalEstimateComparisonPayload {
  const estimates = input.estimates.map((estimate) => {
    const estimateTotalMinorUnits = estimateMinorUnits(estimate);
    return { id: estimate.id, name: estimate.name, rowCount: estimate.rowCount, totalCost: amountFromMinorUnits(estimateTotalMinorUnits), totalCostMinorUnits: estimateTotalMinorUnits };
  });
  const issuedTotalMinorUnits = estimates.reduce((total, estimate) => total + estimate.totalCostMinorUnits, 0);
  return { schemaVersion: 1, currencyCode: input.currencyCode, displayMode: input.displayMode ?? "absolute", estimates, totalCost: amountFromMinorUnits(issuedTotalMinorUnits), totalCostMinorUnits: issuedTotalMinorUnits };
}
