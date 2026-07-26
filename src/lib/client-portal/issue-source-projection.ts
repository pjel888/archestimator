import { createHash } from "node:crypto";

import { computeEstimateRowCostParts, ESTIMATE_CALCULATION_CURRENCY_SCALE } from "@/lib/estimates/estimate-row-total";
import type { SnapshotEstimateInput, SnapshotRowInput } from "@/lib/publication/snapshot";

export const CLIENT_PORTAL_QUANTITY_SCALE = 1_000_000;
export const CLIENT_PORTAL_BASIS_POINT_SCALE = 100;

export type ClientPortalIssueSourceScopeStatus = "included" | "excluded" | "allowance" | "alternate" | "informational";

export type ClientPortalIssueSourceRowProjection = {
  adjustmentBasisPoints: number;
  canonicalRowHash: string;
  contingencyBasisPoints: number;
  description: string;
  designation: string;
  discipline: string;
  material: string;
  miscCostMinorUnits: number;
  quantityScaled: number;
  rowRevision: number;
  rowTotalMinorUnits: number;
  scopeStatus: ClientPortalIssueSourceScopeStatus;
  sortOrder: number;
  sourceComponentId: string | null;
  sourceEstimateId: string;
  sourceNodeId: string | null;
  sourceRowId: string;
  sourceTabId: string | null;
  sourceVariantId: string | null;
  unit: string;
  unitCostMinorUnits: number;
};

export type ClientPortalIssueSourceNodeProjection = {
  canonicalNodeHash: string;
  kind: "tab" | "group" | "area" | "category" | "subgroup" | "other";
  name: string;
  parentSourceNodeId: string | null;
  sortOrder: number;
  sourceEstimateId: string;
  sourceNodeId: string;
  sourceTabId: string | null;
};

export type ClientPortalIssueSourceEstimateProjection = {
  currencyCode: string;
  name: string;
  nodes: readonly ClientPortalIssueSourceNodeProjection[];
  rows: readonly ClientPortalIssueSourceRowProjection[];
  sheetCode: string | null;
  sourceEstimateId: string;
  sourceHash: string;
  totalMinorUnits: number;
};

export type ClientPortalIssueSourceProjection = {
  currencyCode: string;
  estimates: readonly ClientPortalIssueSourceEstimateProjection[];
  schemaVersion: 1;
  totalMinorUnits: number;
};

function canonicalJson(value: unknown): string {
  const normalize = (entry: unknown): unknown => {
    if (Array.isArray(entry)) return entry.map(normalize);
    if (entry && typeof entry === "object") {
      const record = entry as Record<string, unknown>;
      return Object.fromEntries(Object.keys(record).sort().map((key) => [key, normalize(record[key])]));
    }
    return entry;
  };
  return JSON.stringify(normalize(value));
}

function sha256(value: unknown) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function canonicalText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function safeInteger(value: number, label: string) {
  if (!Number.isSafeInteger(value)) throw new Error(`${label} exceeds the supported integer range.`);
  return value;
}

function scaledInteger(value: number | null | undefined, scale: number, label: string) {
  const numberValue = Number(value ?? 0);
  if (!Number.isFinite(numberValue)) throw new Error(`${label} must be finite.`);
  return safeInteger(Math.round(numberValue * scale), label);
}

function minorUnits(value: number | null | undefined, label: string) {
  return scaledInteger(value, 10 ** ESTIMATE_CALCULATION_CURRENCY_SCALE, label);
}

function normalizeScopeStatus(value: SnapshotRowInput["scopeStatus"]): ClientPortalIssueSourceScopeStatus {
  if (value === "excluded") return "excluded";
  if (value === "by_owner") return "informational";
  return "included";
}

function calculateRowTotalMinorUnits(row: SnapshotRowInput, currencyCode: string, scopeStatus: ClientPortalIssueSourceScopeStatus) {
  if (scopeStatus !== "included") return 0;
  const legacyAdjustmentPercentage = row.quantityBase === null || row.quantityBase === undefined
    ? Number(row.contingencyPercentage ?? 0)
    : 0;
  const result = computeEstimateRowCostParts({
    quantity: Number(row.quantity),
    quantity_base: row.quantityBase,
    quantity_contingency_amount: row.quantityContingencyAmount,
    unit_cost: Number(row.unitCost),
    misc_cost: Number(row.miscCost),
    adjustment_percentage: Number(row.adjustmentPercentage ?? legacyAdjustmentPercentage),
    currency_code: currencyCode,
  });
  if (!result.ok) throw new Error("Cannot project an estimate row with invalid calculation input.");
  return safeInteger(result.value.totalMinorUnits, "Row total");
}

function rowProjection(
  estimate: SnapshotEstimateInput,
  row: SnapshotRowInput,
  sortOrder: number,
  currencyCode: string,
  nodeTabIds: ReadonlyMap<string, string | null>,
  defaultTabId: string | null,
): ClientPortalIssueSourceRowProjection {
  const scopeStatus = normalizeScopeStatus(row.scopeStatus);
  const sourceTabId = row.nodeId ? nodeTabIds.get(row.nodeId) ?? defaultTabId : defaultTabId;
  const projection = {
    adjustmentBasisPoints: scaledInteger(row.adjustmentPercentage, CLIENT_PORTAL_BASIS_POINT_SCALE, "Adjustment percentage"),
    contingencyBasisPoints: scaledInteger(row.contingencyPercentage, CLIENT_PORTAL_BASIS_POINT_SCALE, "Contingency percentage"),
    description: canonicalText(row.description),
    designation: canonicalText(row.designation),
    discipline: canonicalText(row.discipline),
    material: canonicalText(row.material),
    miscCostMinorUnits: minorUnits(row.miscCost, "Miscellaneous cost"),
    quantityScaled: scaledInteger(row.quantity, CLIENT_PORTAL_QUANTITY_SCALE, "Quantity"),
    rowRevision: safeInteger(Math.max(0, Math.trunc(Number(row.rowRevision ?? 0))), "Row revision"),
    rowTotalMinorUnits: calculateRowTotalMinorUnits(row, currencyCode, scopeStatus),
    scopeStatus,
    sortOrder,
    sourceComponentId: row.componentId ? canonicalText(row.componentId) || null : null,
    sourceEstimateId: estimate.id,
    sourceNodeId: row.nodeId ? canonicalText(row.nodeId) || null : null,
    sourceRowId: canonicalText(row.id),
    sourceTabId,
    sourceVariantId: row.variantId ? canonicalText(row.variantId) || null : null,
    unit: canonicalText(row.unit),
    unitCostMinorUnits: minorUnits(row.unitCost, "Unit cost"),
  };
  return { ...projection, canonicalRowHash: sha256(projection) };
}

function nodeProjections(estimate: SnapshotEstimateInput): ClientPortalIssueSourceNodeProjection[] {
  const tabs = [...(estimate.tabs ?? [])]
    .sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id))
    .map((tab, sortOrder) => {
      const projection = {
        kind: "tab" as const,
        name: canonicalText(tab.name),
        parentSourceNodeId: null,
        sortOrder,
        sourceEstimateId: estimate.id,
        sourceNodeId: tab.id,
        sourceTabId: tab.id,
      };
      return { ...projection, canonicalNodeHash: sha256(projection) };
    });
  const nodes = [...(estimate.nodes ?? [])]
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0) || left.id.localeCompare(right.id))
    .map((node, sortOrder) => {
      const projection = {
        kind: node.kind,
        name: canonicalText(node.name),
        parentSourceNodeId: node.parentId ? canonicalText(node.parentId) || null : null,
        sortOrder,
        sourceEstimateId: estimate.id,
        sourceNodeId: node.id,
        sourceTabId: node.estimateTabId ? canonicalText(node.estimateTabId) || null : null,
      };
      return { ...projection, canonicalNodeHash: sha256(projection) };
    });
  const sourceNodeIds = new Set<string>();
  for (const node of [...tabs, ...nodes]) {
    if (sourceNodeIds.has(node.sourceNodeId)) throw new Error("Issue source node identities must be unique within an estimate.");
    sourceNodeIds.add(node.sourceNodeId);
  }
  return [...tabs, ...nodes];
}

export function createClientPortalIssueSourceProjection(input: {
  currencyCode: string;
  estimateSourceHashes?: ReadonlyMap<string, string>;
  estimates: readonly SnapshotEstimateInput[];
}): ClientPortalIssueSourceProjection {
  const currencyCode = input.currencyCode.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currencyCode)) throw new Error("Issue source currency must be a three-letter ISO code.");
  const sourceEstimateIds = new Set<string>();
  const estimates = [...input.estimates]
    .sort((left, right) => left.sheetCode.localeCompare(right.sheetCode) || left.id.localeCompare(right.id))
    .map((estimate) => {
      if (sourceEstimateIds.has(estimate.id)) throw new Error("Issue source estimate identities must be unique.");
      sourceEstimateIds.add(estimate.id);
      const sortedTabs = [...(estimate.tabs ?? [])].sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id));
      const defaultTabId = sortedTabs.find((tab) => tab.isDefault)?.id ?? sortedTabs[0]?.id ?? null;
      const nodeTabIds = new Map((estimate.nodes ?? []).map((node) => [node.id, node.estimateTabId ?? null]));
      const rows = estimate.rows.map((row, sortOrder) => rowProjection(estimate, row, sortOrder, currencyCode, nodeTabIds, defaultTabId));
      const sourceRowIds = new Set<string>();
      for (const row of rows) {
        if (sourceRowIds.has(row.sourceRowId)) throw new Error("Issue source row identities must be unique within an estimate.");
        sourceRowIds.add(row.sourceRowId);
      }
      const nodes = nodeProjections(estimate);
      const totalMinorUnits = rows.reduce((total, row) => safeInteger(total + row.rowTotalMinorUnits, "Estimate total"), 0);
      const sourceHash = input.estimateSourceHashes?.get(estimate.id) ?? sha256({
        currencyCode,
        estimateId: estimate.id,
        name: canonicalText(estimate.name),
        nodes,
        rows,
        sheetCode: canonicalText(estimate.sheetCode),
        totalMinorUnits,
      });
      if (!/^[a-f0-9]{64}$/.test(sourceHash)) throw new Error("Issue source estimate hash must be a lowercase SHA-256 digest.");
      return {
        currencyCode,
        name: canonicalText(estimate.name),
        nodes,
        rows,
        sheetCode: canonicalText(estimate.sheetCode) || null,
        sourceEstimateId: estimate.id,
        sourceHash,
        totalMinorUnits,
      };
    });
  const totalMinorUnits = estimates.reduce((total, estimate) => safeInteger(total + estimate.totalMinorUnits, "Issue total"), 0);
  return { currencyCode, estimates, schemaVersion: 1, totalMinorUnits };
}
