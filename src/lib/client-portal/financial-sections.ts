import type { PublicationSnapshotEstimate, PublicationSnapshotRow, PublicationSnapshotTreeNode } from "@/lib/publication/types";

export type ClientPortalFinancialSummaryPayload = {
  currencyCode: string;
  estimateCount: number;
  schemaVersion: 1;
  totalCost: number;
};

export type ClientPortalCostBreakdownPayload = {
  buckets: Array<{ id: string; label: string; totalCost: number }>;
  currencyCode: string;
  groupBy: "area" | "category" | "discipline" | "supplier";
  schemaVersion: 1;
  totalCost: number;
};

export type ClientPortalEstimateComparisonPayload = {
  currencyCode: string;
  estimates: Array<{ id: string; name: string; rowCount: number; totalCost: number }>;
  schemaVersion: 1;
  totalCost: number;
};

function totalCost(estimates: readonly PublicationSnapshotEstimate[]) {
  return estimates.reduce((total, estimate) => total + estimate.totalCost, 0);
}

export function buildClientPortalFinancialSummaryPayload(input: { currencyCode: string; estimates: readonly PublicationSnapshotEstimate[] }): ClientPortalFinancialSummaryPayload {
  return { schemaVersion: 1, currencyCode: input.currencyCode, estimateCount: input.estimates.length, totalCost: totalCost(input.estimates) };
}

function descendantNodeIds(node: PublicationSnapshotTreeNode): Set<string> {
  const ids = new Set([node.id]);
  for (const child of node.children) for (const id of descendantNodeIds(child)) ids.add(id);
  return ids;
}

function areaBuckets(estimate: PublicationSnapshotEstimate) {
  if (!estimate.treeNodes?.length) return null;
  return estimate.treeNodes.map((node) => {
    const ids = descendantNodeIds(node);
    return { id: `area:${estimate.id}:${node.id}`, label: node.name, totalCost: estimate.rows.reduce((total, row) => total + (row.nodeId && ids.has(row.nodeId) ? row.rowTotal : 0), 0) };
  });
}

function fallbackAreaLabel(row: PublicationSnapshotRow) {
  return row.designation.split(/\s*(?:>|\/|\s[-–—]\s)\s*/).map((part) => part.trim()).find(Boolean) ?? (row.discipline.trim() || "Uncategorized");
}

export function buildClientPortalCostBreakdownPayload(input: { currencyCode: string; estimates: readonly PublicationSnapshotEstimate[]; groupBy?: "area" | "category" | "discipline" | "supplier" }): ClientPortalCostBreakdownPayload {
  const groupBy = input.groupBy ?? "area";
  const totals = new Map<string, number>();
  for (const estimate of input.estimates) {
    if (groupBy === "area") {
      const areas = areaBuckets(estimate);
      if (areas) {
        for (const area of areas) totals.set(area.label, (totals.get(area.label) ?? 0) + area.totalCost);
        continue;
      }
    }
    for (const row of estimate.rows) {
      const label = groupBy === "area" ? fallbackAreaLabel(row) : row.discipline.trim() || "Uncategorized";
      totals.set(label, (totals.get(label) ?? 0) + row.rowTotal);
    }
  }
  const buckets = [...totals.entries()]
    .map(([label, value]) => ({ id: `discipline:${label.toLocaleLowerCase()}`, label, totalCost: value }))
    .sort((left, right) => right.totalCost - left.totalCost || left.label.localeCompare(right.label));
  return { schemaVersion: 1, currencyCode: input.currencyCode, groupBy, buckets, totalCost: buckets.reduce((total, bucket) => total + bucket.totalCost, 0) };
}

export function buildClientPortalEstimateComparisonPayload(input: { currencyCode: string; estimates: readonly PublicationSnapshotEstimate[] }): ClientPortalEstimateComparisonPayload {
  const estimates = input.estimates.map((estimate) => ({ id: estimate.id, name: estimate.name, rowCount: estimate.rowCount, totalCost: estimate.totalCost }));
  return { schemaVersion: 1, currencyCode: input.currencyCode, estimates, totalCost: estimates.reduce((total, estimate) => total + estimate.totalCost, 0) };
}
