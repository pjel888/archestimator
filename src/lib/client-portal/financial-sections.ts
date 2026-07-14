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
  buckets: Array<{ id: string; label: string; totalCost: number; totalCostMinorUnits: number }>;
  currencyCode: string;
  groupBy: "area" | "category" | "discipline" | "supplier";
  includeCharts: boolean;
  schemaVersion: 1;
  totalCost: number;
  totalCostMinorUnits: number;
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

export function buildClientPortalCostBreakdownPayload(input: { currencyCode: string; estimates: readonly PublicationSnapshotEstimate[]; groupBy?: "area" | "category" | "discipline" | "supplier"; includeCharts?: boolean }): ClientPortalCostBreakdownPayload {
  const groupBy = input.groupBy ?? "area";
  const totals = new Map<string, number>();
  for (const estimate of input.estimates) {
    const nodeAreaLabels = groupBy === "area" ? areaLabels(estimate.treeNodes ?? []) : null;
    for (const row of estimate.rows) {
      const label = groupBy === "area"
        ? (row.nodeId ? nodeAreaLabels?.get(row.nodeId) : null) ?? fallbackAreaLabel(row)
        : groupBy === "category"
          ? row.category?.trim() || "Uncategorized"
          : groupBy === "supplier"
            ? row.supplier?.trim() || "Uncategorized"
            : row.discipline.trim() || "Uncategorized";
      const next = (totals.get(label) ?? 0) + rowMinorUnits(row);
      if (!Number.isSafeInteger(next)) throw new Error("Client Portal bucket total exceeds the supported minor-unit range.");
      totals.set(label, next);
    }
  }
  const buckets = [...totals.entries()]
    .map(([label, value]) => ({ id: `${groupBy}:${label.toLocaleLowerCase()}`, label, totalCost: amountFromMinorUnits(value), totalCostMinorUnits: value }))
    .sort((left, right) => right.totalCost - left.totalCost || left.label.localeCompare(right.label));
  const issuedTotalMinorUnits = buckets.reduce((total, bucket) => total + bucket.totalCostMinorUnits, 0);
  return { schemaVersion: 1, currencyCode: input.currencyCode, groupBy, includeCharts: input.includeCharts ?? false, buckets, totalCost: amountFromMinorUnits(issuedTotalMinorUnits), totalCostMinorUnits: issuedTotalMinorUnits };
}

export function buildClientPortalEstimateComparisonPayload(input: { currencyCode: string; estimates: readonly PublicationSnapshotEstimate[]; displayMode?: "absolute" }): ClientPortalEstimateComparisonPayload {
  const estimates = input.estimates.map((estimate) => {
    const estimateTotalMinorUnits = estimateMinorUnits(estimate);
    return { id: estimate.id, name: estimate.name, rowCount: estimate.rowCount, totalCost: amountFromMinorUnits(estimateTotalMinorUnits), totalCostMinorUnits: estimateTotalMinorUnits };
  });
  const issuedTotalMinorUnits = estimates.reduce((total, estimate) => total + estimate.totalCostMinorUnits, 0);
  return { schemaVersion: 1, currencyCode: input.currencyCode, displayMode: input.displayMode ?? "absolute", estimates, totalCost: amountFromMinorUnits(issuedTotalMinorUnits), totalCostMinorUnits: issuedTotalMinorUnits };
}
