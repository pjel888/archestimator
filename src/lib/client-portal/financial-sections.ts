import type { PublicationSnapshotEstimate } from "@/lib/publication/types";

export type ClientPortalFinancialSummaryPayload = {
  currencyCode: string;
  estimateCount: number;
  schemaVersion: 1;
  totalCost: number;
};

export type ClientPortalCostBreakdownPayload = {
  buckets: Array<{ id: string; label: string; totalCost: number }>;
  currencyCode: string;
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

export function buildClientPortalCostBreakdownPayload(input: { currencyCode: string; estimates: readonly PublicationSnapshotEstimate[] }): ClientPortalCostBreakdownPayload {
  const totals = new Map<string, number>();
  for (const estimate of input.estimates) {
    for (const row of estimate.rows) {
      const label = row.discipline.trim() || "Uncategorized";
      totals.set(label, (totals.get(label) ?? 0) + row.rowTotal);
    }
  }
  const buckets = [...totals.entries()]
    .map(([label, value]) => ({ id: `discipline:${label.toLocaleLowerCase()}`, label, totalCost: value }))
    .sort((left, right) => right.totalCost - left.totalCost || left.label.localeCompare(right.label));
  return { schemaVersion: 1, currencyCode: input.currencyCode, buckets, totalCost: buckets.reduce((total, bucket) => total + bucket.totalCost, 0) };
}

export function buildClientPortalEstimateComparisonPayload(input: { currencyCode: string; estimates: readonly PublicationSnapshotEstimate[] }): ClientPortalEstimateComparisonPayload {
  const estimates = input.estimates.map((estimate) => ({ id: estimate.id, name: estimate.name, rowCount: estimate.rowCount, totalCost: estimate.totalCost }));
  return { schemaVersion: 1, currencyCode: input.currencyCode, estimates, totalCost: estimates.reduce((total, estimate) => total + estimate.totalCost, 0) };
}
