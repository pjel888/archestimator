import { createHash } from "node:crypto";

import type { SnapshotEstimateInput, SnapshotRowInput } from "@/lib/publication/snapshot";

type JsonRecord = Record<string, unknown>;

export type PublicationAuthoringRowSource = {
  adjustmentPercentage: number | string | null;
  contingencyPercentage: number | string | null;
  description: string;
  designation: string;
  discipline: string;
  id: string;
  material: string;
  metadata: unknown;
  miscCost: number | string | null;
  nodeId: string | null;
  quantity: number | string | null;
  quantityBase: number | string | null;
  quantityContingencyAmount: number | string | null;
  rowRevision: number | string | null;
  sourceLibraryItemId: string | null;
  sourceSnapshot: unknown;
  supplier: string | null;
  unit: string;
  unitCost: number | string | null;
  linkState: string | null;
};

function readJsonRecord(value: unknown): JsonRecord {
  if (typeof value === "string") {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function finiteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeText(value: unknown, maxLength = 160) {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function safeTextArray(value: unknown, maxItems = 50) {
  if (!Array.isArray(value)) return undefined;
  const values = value.flatMap((entry) => {
    const text = safeText(entry);
    return text ? [text] : [];
  }).slice(0, maxItems);
  return values.length > 0 ? values : undefined;
}

function normalizeLinkState(value: string | null): SnapshotRowInput["linkState"] {
  return value === "linked-clean" || value === "linked-overridden" || value === "source-changed" || value === "detached"
    ? value
    : "unlinked";
}

function normalizeScopeStatus(value: unknown): SnapshotRowInput["scopeStatus"] {
  return value === "included" || value === "excluded" || value === "by_owner" ? value : undefined;
}

export function projectPublicationAuthoringRow(source: PublicationAuthoringRowSource): SnapshotRowInput {
  const sourceSnapshot = readJsonRecord(source.sourceSnapshot);
  const metadata = readJsonRecord(source.metadata);
  const componentVersionNumber = Number(sourceSnapshot.componentVersionNumber);
  const rowRevision = Math.max(0, Math.trunc(finiteNumber(source.rowRevision)));
  const quantityBase = source.quantityBase === null ? null : finiteNumber(source.quantityBase);
  const quantityContingencyAmount = source.quantityContingencyAmount === null
    ? null
    : finiteNumber(source.quantityContingencyAmount);

  return {
    id: source.id,
    nodeId: source.nodeId,
    componentId:
      safeText(sourceSnapshot.sourceComponentId)
      ?? safeText(sourceSnapshot.sourceEstimateRowId)
      ?? safeText(source.sourceLibraryItemId),
    variantId: safeText(sourceSnapshot.priceOptionId),
    componentVersionNumber: Number.isSafeInteger(componentVersionNumber) && componentVersionNumber >= 0
      ? componentVersionNumber
      : null,
    variantLabel: safeText(sourceSnapshot.priceOptionLabel),
    rowRevision,
    linkState: normalizeLinkState(source.linkState),
    categoryId: safeText(sourceSnapshot.categoryId),
    categoryLabel: safeText(sourceSnapshot.category),
    categoryPath: safeTextArray(sourceSnapshot.categoryPath),
    categoryPathIds: safeTextArray(sourceSnapshot.categoryPathIds),
    supplierLabel: safeText(sourceSnapshot.supplier) ?? safeText(source.supplier),
    imageUrl: safeText(sourceSnapshot.imageUrl, 2_048),
    description: source.description,
    designation: source.designation,
    discipline: source.discipline,
    material: source.material,
    quantity: finiteNumber(source.quantity),
    quantityBase,
    quantityContingencyAmount,
    unit: source.unit,
    unitCost: finiteNumber(source.unitCost),
    miscCost: finiteNumber(source.miscCost),
    contingencyPercentage: finiteNumber(source.contingencyPercentage),
    adjustmentPercentage: finiteNumber(source.adjustmentPercentage),
    laborRate: typeof metadata.laborUnitCost === "number" && Number.isFinite(metadata.laborUnitCost)
      ? metadata.laborUnitCost
      : undefined,
    scopeStatus: normalizeScopeStatus(metadata.scopeStatus),
  };
}

function canonicalJson(value: unknown): string {
  const normalize = (entry: unknown): unknown => {
    if (Array.isArray(entry)) return entry.map(normalize);
    if (entry && typeof entry === "object") {
      const record = entry as JsonRecord;
      return Object.fromEntries(Object.keys(record).sort().map((key) => [key, normalize(record[key])]));
    }
    return entry;
  };
  return JSON.stringify(normalize(value));
}

export function createPublicationAuthoringSemanticHash(input: {
  currencyCode: string;
  estimates: readonly SnapshotEstimateInput[];
  projectId: string;
}) {
  return createHash("sha256").update(canonicalJson({
    projectionSchemaVersion: 1,
    projectId: input.projectId,
    currencyCode: input.currencyCode,
    estimates: input.estimates,
  })).digest("hex");
}

export function createPublicationOpaqueIdNamespace(projectId: string, semanticHash: string) {
  return createHash("sha256").update(`${projectId}\u001f${semanticHash}`).digest("hex");
}
