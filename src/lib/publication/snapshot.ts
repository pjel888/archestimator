import type { ProjectPublicationSnapshot, PublicationSnapshotEstimate, PublicationSnapshotRow } from "@/lib/publication/types";

type SnapshotProjectInput = {
  id: string;
  name: string;
  projectCode: string | null;
  clientName: string | null;
  location: string | null;
  currencyCode: string;
  // P9 additive
  coverImageUrl?: string | null;
};

type SnapshotRowInput = {
  id: string;
  description: string;
  designation: string;
  discipline: string;
  material: string;
  quantity: number;
  unit: string;
  unitCost: number;
  miscCost: number;
  contingencyPercentage: number;
  // P9: source_snapshot.imageUrl extracted at publish (additive)
  imageUrl?: string | null;
};

type SnapshotEstimateInput = {
  id: string;
  name: string;
  sheetCode: string;
  updatedAt: string | null;
  rows: SnapshotRowInput[];
};

function toFiniteNumber(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function calculateRowTotal(row: SnapshotRowInput) {
  const quantity = toFiniteNumber(row.quantity);
  const unitCost = toFiniteNumber(row.unitCost);
  const miscCost = toFiniteNumber(row.miscCost);
  const contingencyPercentage = toFiniteNumber(row.contingencyPercentage);
  const subtotal = quantity * unitCost;
  return subtotal + miscCost + (subtotal * contingencyPercentage) / 100;
}

function buildSnapshotRow(row: SnapshotRowInput): PublicationSnapshotRow {
  return {
    id: row.id,
    description: row.description,
    designation: row.designation,
    discipline: row.discipline,
    material: row.material,
    quantity: toFiniteNumber(row.quantity),
    unit: row.unit,
    unitCost: toFiniteNumber(row.unitCost),
    miscCost: toFiniteNumber(row.miscCost),
    contingencyPercentage: toFiniteNumber(row.contingencyPercentage),
    rowTotal: calculateRowTotal(row),
    // P9 additive (undefined/null if absent in source_snapshot at publish)
    imageUrl: row.imageUrl ?? null,
  };
}

function buildSnapshotEstimate(estimate: SnapshotEstimateInput): PublicationSnapshotEstimate {
  const rows = estimate.rows.map(buildSnapshotRow);
  return {
    id: estimate.id,
    name: estimate.name,
    sheetCode: estimate.sheetCode,
    updatedAt: estimate.updatedAt,
    rowCount: rows.length,
    totalCost: rows.reduce((total, row) => total + row.rowTotal, 0),
    rows,
  };
}

export function buildProjectPublicationSnapshot({
  generatedAt,
  project,
  estimates,
}: {
  generatedAt: string;
  project: SnapshotProjectInput;
  estimates: SnapshotEstimateInput[];
}): ProjectPublicationSnapshot {
  const snapshotEstimates = estimates.map(buildSnapshotEstimate);
  return {
    schemaVersion: 1,
    generatedAt,
    project,
    estimateCount: snapshotEstimates.length,
    rowCount: snapshotEstimates.reduce((total, estimate) => total + estimate.rowCount, 0),
    totalCost: snapshotEstimates.reduce((total, estimate) => total + estimate.totalCost, 0),
    estimates: snapshotEstimates,
  };
}
