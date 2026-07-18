import "server-only";

import { randomUUID } from "node:crypto";

import type { D1DatabaseLike, D1PreparedStatementLike } from "@/lib/cloudflare/d1";
import {
  computeEstimateRowCostParts,
  ESTIMATE_CALCULATION_CURRENCY_SCALE,
} from "@/lib/estimates/estimate-row-total";
import {
  LEGACY_BLANK_ROW_TAG,
  getProjectComponentIdentity,
  isExpressComponentRow,
  readEstimateRowMetadata,
  readExpressComponentMetadata,
  readProjectComponentProjectionMetadata,
  withProjectComponentProjectionMetadata,
  type EstimateRowMetadata,
} from "@/lib/estimates/express-components";
import { sanitizeEstimateRowSourceSnapshot } from "@/lib/estimates/image-url";
import {
  assertD1MutationStatementLimit,
  createMutationRequestFingerprint,
} from "@/lib/estimates/mutation-receipts";
import { ESTIMATE_ROW_REVISION_CONFLICT_CODE } from "@/lib/estimates/row-revision-conflict";
import {
  buildProjectComponentAttachmentDeleteRetentionStatements,
  buildProjectComponentAttachmentRestoreRetentionStatements,
} from "@/lib/estimates/project-component-attachment-retention";
import type { EstimateRowItem } from "@/lib/estimates/types";
import { isUuid } from "@/lib/ids";
import type { Json } from "@/lib/types/json";

import { prepareActivationOutboxIntent } from "@/lib/onboarding/activation-outbox";
import { validateActivationProducerIntent } from "@/lib/onboarding/activation-producer-contract";

import { canEditProject } from "./access";
import {
  allD1Rows,
  firstD1Row,
  runD1Batch,
  runPreparedD1Batch,
  type D1IntentStatement,
} from "./database";
import { prepareHistoryEventInsert } from "./history-events";
import {
  assertEstimateEditIntent,
  buildEstimateMutationReceiptStatement,
  buildProjectPublicationRevisionForEstimate,
  prepareEstimateMutationIntent,
  readConcurrentEstimateMutationReceipt,
  type EstimateD1Actor,
} from "./intent-context";
import {
  buildComponentImpactFingerprint,
  COMPONENT_IMPACT_CONFLICT_MESSAGE,
  PROJECT_COMPONENT_IDENTITY_SQL,
} from "./_component-identity";

export type EstimateAuthoritativeRow = {
  id: string;
  nodeId: string;
  material: string;
  description: string;
  supplier: string;
  unit: string;
  quantity: number;
  quantityBase: number | null;
  quantityContingencyAmount: number | null;
  unitCost: number;
  contingencyPercentage: number;
  contingencyValue: number;
  adjustmentPercentage: number;
  adjustmentValue: number;
  miscCost: number;
  sourceLibraryItemId: string | null;
  sourceSnapshot: Json | null;
  metadata: Json;
  linkState: string;
  rowRevision: number;
};

export type EstimateRowHistoryResult = {
  rowId: string;
  eventId?: string;
  row: EstimateAuthoritativeRow;
  sourceRowId?: string;
};

export type EstimateRowRevisionConflictResult = {
  status: "conflict";
  conflictRowIds: string[];
  authoritativeRows: EstimateAuthoritativeRow[];
};

export type EstimateRowRecord = {
  id: string;
  estimate_id: string;
  node_id: string;
  description: string | null;
  designation: string | null;
  discipline: string | null;
  material: string | null;
  supplier: string | null;
  supplier_id: string | null;
  quantity: number;
  quantity_base: number | null;
  quantity_contingency_amount: number | null;
  unit: string | null;
  unit_cost: number;
  misc_cost: number;
  contingency_percentage: number;
  adjustment_percentage: number;
  source_snapshot: Json | null;
  sort_order: number;
  row_revision: number;
  category_node_id: string | null;
  source_library_item_id: string | null;
  link_state: string;
  metadata: Json;
  pricing_provenance_origin: string | null;
  created_at?: string;
  updated_at?: string;
};

type RowMutationScope = {
  projectId: string;
  estimateId: string;
  correlationId: string;
};

type LibrarySourceCommitReceipt = {
  sourceLibraryItemId: string;
  workspaceId: string;
  itemVersion: number;
  itemUpdatedAt: string | null;
  lifecycleState: string | null;
  itemUnit: string;
  itemUnitCost: number;
  itemMiscCost: number;
  itemActivePriceOptionId: string | null;
  selectedOptionId: string | null;
  optionLabel: string | null;
  optionUnit: string | null;
  optionUnitCost: number | null;
  optionMiscCost: number | null;
  optionUpdatedAt: string | null;
  activeCostEntryId: string | null;
  activeCostEntryUnitCost: number | null;
  activeCostEntryMiscCost: number | null;
  activeCostEntryUpdatedAt: string | null;
  resolvedUnit: string;
  resolvedUnitCost: number;
  resolvedMiscCost: number;
  fingerprint: string;
};

type LibraryItemProjection = {
  id: string;
  workspace_id: string;
  active_price_option_id: string | null;
  current_version_number: number | string;
  updated_at: string | null;
  lifecycle_state: string | null;
  unit: string;
  unit_cost: number | string;
  misc_cost: number | string;
};

type LibraryPriceOptionProjection = {
  id: string;
  item_id: string;
  label: string;
  unit: string;
  unit_cost: number | string;
  misc_cost: number | string;
  is_active: number | boolean;
  updated_at: string;
};

type LibraryVariantCostProjection = {
  id: string;
  price_option_id: string;
  unit_cost: number | string;
  misc_cost: number | string;
  updated_at: string;
};

type ExistingEstimateEventRow = {
  id: string;
  event_type: string;
  target_row_id: string | null;
  payload: Json | string | null;
};

const ESTIMATE_MINOR_UNIT_FACTOR = 10 ** ESTIMATE_CALCULATION_CURRENCY_SCALE;
const D1_MAX_BATCH_STATEMENTS = 1000;
const MAX_RESTORABLE_ROW_BATCH_SIZE = 100;
const ROW_INSERT_COLUMNS = [
  "id",
  "estimate_id",
  "node_id",
  "description",
  "designation",
  "discipline",
  "material",
  "supplier",
  "supplier_id",
  "quantity",
  "quantity_base",
  "quantity_contingency_amount",
  "unit",
  "unit_cost",
  "misc_cost",
  "contingency_percentage",
  "adjustment_percentage",
  "source_snapshot_json",
  "sort_order",
  "row_revision",
  "category_node_id",
  "source_library_item_id",
  "link_state",
  "metadata_json",
  "pricing_provenance_origin",
  "created_at",
  "updated_at",
] as const;

function nowIso() {
  return new Date().toISOString();
}

function placeholders(values: readonly unknown[]) {
  if (values.length === 0) throw new Error("At least one SQL placeholder is required.");
  return values.map(() => "?").join(", ");
}

function readNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readJson(value: unknown, fallback: Json): Json {
  if (typeof value !== "string") return value as Json ?? fallback;
  try {
    return JSON.parse(value) as Json;
  } catch {
    return fallback;
  }
}

function readJsonRecord(value: unknown): Record<string, unknown> {
  const parsed = readJson(value, {});
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : {};
}

function readRequiredJsonRecord(value: unknown, label: string) {
  const parsed = typeof value === "string" ? readJson(value, null) : value;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return parsed as Record<string, unknown>;
}

function normalizeEstimateRowJsonObject(value: unknown, label: string) {
  if (value === null || value === undefined) return {};
  return readRequiredJsonRecord(value, label);
}

function normalizeEstimateRowSourceLinkState(sourceLibraryItemIdValue: unknown, linkStateValue: unknown) {
  const sourceLibraryItemId = typeof sourceLibraryItemIdValue === "string" && sourceLibraryItemIdValue.trim()
    ? sourceLibraryItemIdValue.trim()
    : null;
  const linkState = typeof linkStateValue === "string" && linkStateValue.trim()
    ? linkStateValue.trim()
    : sourceLibraryItemId
      ? "linked-clean"
      : "unlinked";
  if (linkState === "unlinked") {
    if (sourceLibraryItemId) throw new Error("Unlinked estimate rows cannot retain a live source identity.");
    return { sourceLibraryItemId: null, linkState };
  }
  if (!["linked-clean", "linked-overridden", "source-changed", "detached"].includes(linkState)) {
    throw new Error("Estimate row link state is invalid.");
  }
  if (!sourceLibraryItemId) throw new Error("Linked and detached estimate rows require a source identity.");
  return { sourceLibraryItemId, linkState };
}

function normalizeEstimateRowPricingProvenance(value: unknown) {
  const provenance = typeof value === "string" && value.trim() ? value.trim() : "missing";
  if (!["recorded", "inherited_snapshot", "synthesized_fallback", "missing"].includes(provenance)) {
    throw new Error("Estimate row pricing provenance is invalid.");
  }
  return provenance;
}

function jsonString(value: unknown, fallback: Json = {}) {
  if (typeof value === "string") return value;
  return JSON.stringify(value ?? fallback);
}

function estimateRowTotalMinorUnits(row: EstimateRowRecord) {
  const total = computeEstimateRowCostParts(row);
  if (!total.ok) throw new Error(`Estimate row total is invalid (${total.code}:${total.field}).`);
  return total.value.totalMinorUnits;
}

function minorUnitsToAmount(minorUnits: number) {
  if (!Number.isSafeInteger(minorUnits)) throw new Error("Estimate history total is outside the supported range.");
  return minorUnits / ESTIMATE_MINOR_UNIT_FACTOR;
}

function sumEstimateRowTotalMinorUnits(rows: readonly EstimateRowRecord[]) {
  return rows.reduce((total, row) => {
    const next = total + estimateRowTotalMinorUnits(row);
    if (!Number.isSafeInteger(next)) throw new Error("Estimate history total is outside the supported range.");
    return next;
  }, 0);
}

function rowItemHistoryResult(row: EstimateRowRecord, eventId?: string): EstimateRowHistoryResult {
  const quantity = readNumber(row.quantity);
  const unitCost = readNumber(row.unit_cost);
  const base = quantity * unitCost;
  const contingencyPercentage = readNumber(row.contingency_percentage);
  const adjustmentPercentage = readNumber(row.adjustment_percentage, contingencyPercentage);
  return {
    rowId: row.id,
    eventId,
    row: {
      id: row.id,
      nodeId: row.node_id,
      material: row.material ?? "",
      description: row.description ?? "",
      supplier: row.supplier ?? "",
      unit: row.unit ?? "unit",
      quantity,
      quantityBase: row.quantity_base,
      quantityContingencyAmount: row.quantity_contingency_amount,
      unitCost,
      contingencyPercentage,
      contingencyValue: (base * contingencyPercentage) / 100,
      adjustmentPercentage,
      adjustmentValue: (base * adjustmentPercentage) / 100,
      miscCost: readNumber(row.misc_cost),
      sourceLibraryItemId: row.source_library_item_id,
      sourceSnapshot: row.source_snapshot,
      metadata: row.metadata,
      linkState: row.link_state || "unlinked",
      rowRevision: Math.max(1, Math.trunc(readNumber(row.row_revision, 1))),
    },
  };
}

function buildRowInsertStatement(payload: Record<string, unknown>) {
  const timestamp = nowIso();
  const record = { ...payload };
  if (!record.id) record.id = randomUUID();
  if (!record.created_at) record.created_at = timestamp;
  if (!record.updated_at) record.updated_at = timestamp;
  record.source_snapshot_json = normalizeEstimateRowJsonObject(
    record.source_snapshot_json ?? record.source_snapshot,
    "Estimate row source snapshot",
  );
  record.metadata_json = normalizeEstimateRowJsonObject(record.metadata_json ?? record.metadata, "Estimate row metadata");
  const sourceLinkState = normalizeEstimateRowSourceLinkState(record.source_library_item_id, record.link_state);
  record.source_library_item_id = sourceLinkState.sourceLibraryItemId;
  record.link_state = sourceLinkState.linkState;
  delete record.source_snapshot;
  delete record.metadata;
  if (record.row_revision === undefined) record.row_revision = 1;
  record.pricing_provenance_origin = normalizeEstimateRowPricingProvenance(record.pricing_provenance_origin);
  const columns = ROW_INSERT_COLUMNS.filter((column) => Object.hasOwn(record, column));
  return {
    record: serializeRow(record),
    persistenceRecord: record,
    sql: `INSERT INTO estimate_row_items (${columns.join(", ")}) VALUES (${placeholders(columns)})`,
    values: columns.map((column) => record[column]),
  };
}

function buildPackedRowInsertStatements(payloads: Record<string, unknown>[], chunkSize = 40) {
  if (payloads.length === 0) return [];
  const prepared = payloads.map(buildRowInsertStatement);
  const columns = ROW_INSERT_COLUMNS.filter((column) => Object.hasOwn(prepared[0]!.persistenceRecord, column));
  const statements: D1IntentStatement[] = [];
  for (let index = 0; index < prepared.length; index += chunkSize) {
    const chunk = prepared.slice(index, index + chunkSize);
    statements.push({
      sql: `INSERT INTO estimate_row_items (${columns.join(", ")}) VALUES ${chunk.map(() => `(${placeholders(columns)})`).join(", ")}`,
      values: chunk.flatMap(({ persistenceRecord }) => columns.map((column) => persistenceRecord[column])),
    });
  }
  return statements;
}

function rowSourceSnapshot(row: EstimateRowRecord): Json | null {
  return row.source_snapshot;
}

function rowMetadata(row: EstimateRowRecord): Json {
  return row.metadata;
}

function updateValuesForRowPatch(rowPatch: Record<string, unknown>) {
  const columns: Array<[string, unknown]> = [];
  const mapping: Record<string, string> = {
    material: "material",
    description: "description",
    supplier: "supplier",
    unit: "unit",
    unitCost: "unit_cost",
    quantity: "quantity",
    quantityBase: "quantity_base",
    quantityContingencyAmount: "quantity_contingency_amount",
    contingencyPercentage: "contingency_percentage",
    adjustmentPercentage: "adjustment_percentage",
    miscCost: "misc_cost",
    sourceSnapshot: "source_snapshot_json",
    metadata: "metadata_json",
    linkState: "link_state",
    sourceLibraryItemId: "source_library_item_id",
    pricingProvenanceOrigin: "pricing_provenance_origin",
    categoryNodeId: "category_node_id",
    supplierId: "supplier_id",
    discipline: "discipline",
    designation: "designation",
  };
  for (const [key, column] of Object.entries(mapping)) {
    if (!Object.hasOwn(rowPatch, key)) continue;
    const value = rowPatch[key];
    const normalizedValue = column === "source_snapshot_json"
      ? normalizeEstimateRowJsonObject(value, "Estimate row source snapshot")
      : column === "metadata_json"
        ? normalizeEstimateRowJsonObject(value, "Estimate row metadata")
        : column === "pricing_provenance_origin"
          ? normalizeEstimateRowPricingProvenance(value)
          : value;
    columns.push([column, column.endsWith("_json") ? jsonString(normalizedValue) : normalizedValue]);
  }
  return columns;
}

function applyRowPatchForActivity(
  row: EstimateRowRecord,
  rowPatch: Record<string, unknown>,
  nextRevision: number,
): EstimateRowRecord {
  const next: Record<string, unknown> = { ...row, row_revision: nextRevision };
  const fieldMap: Record<string, string> = {
    material: "material",
    description: "description",
    supplier: "supplier",
    unit: "unit",
    unitCost: "unit_cost",
    quantity: "quantity",
    quantityBase: "quantity_base",
    quantityContingencyAmount: "quantity_contingency_amount",
    contingencyPercentage: "contingency_percentage",
    adjustmentPercentage: "adjustment_percentage",
    miscCost: "misc_cost",
    sourceSnapshot: "source_snapshot",
    metadata: "metadata",
    linkState: "link_state",
    sourceLibraryItemId: "source_library_item_id",
    pricingProvenanceOrigin: "pricing_provenance_origin",
    categoryNodeId: "category_node_id",
    supplierId: "supplier_id",
    discipline: "discipline",
    designation: "designation",
  };
  for (const [patchKey, rowKey] of Object.entries(fieldMap)) {
    if (Object.hasOwn(rowPatch, patchKey)) next[rowKey] = rowPatch[patchKey];
  }
  return serializeRow(next);
}

const SHARED_PROJECT_COMPONENT_ROW_PATCH_KEYS = new Set(["material", "supplier", "sourceSnapshot", "supplierId"]);
const SHARED_PROJECT_COMPONENT_SOURCE_SNAPSHOT_KEYS = new Set([
  "brand", "brandId", "componentVersionId", "componentVersionNumber", "lifecycleState", "material",
  "notSupplierPriced", "priceOptions", "priceOptionUpdatedAt", "source", "supplier", "supplierId", "tags",
  "taxonomyVersion",
]);
const PROJECT_COMPONENT_VARIANT_SOURCE_SNAPSHOT_KEYS = new Set([
  "description", "imageAsset", "imageUrl", "priceOptionLabel", "pricingDate", "pricingSource", "sku",
  "sourceUrl", "unit", "unit_cost",
]);
const MAX_PROPAGATED_ACTIVITY_FACTS = 100;

type VariantActivityIdentity = { id: string | null; label: string | null };
type ProjectComponentPriceOptionSnapshot = Record<string, unknown> & { id: string };

const PROJECT_COMPONENT_VARIANT_OPTION_SIGNATURE_KEYS = [
  "label", "sku", "variantDescription", "unit", "unitCost", "pricingSource", "pricingDate", "sourceUrl",
  "imageBucket", "imagePath", "thumbnailPath", "imageMetadata", "attachments",
] as const;

function getVariantActivityIdentity(snapshot: unknown): VariantActivityIdentity | null {
  const row = readJsonRecord(snapshot);
  const source = readJsonRecord(row.sourceSnapshot ?? row.source_snapshot_json);
  const id = typeof source.priceOptionId === "string" && source.priceOptionId ? source.priceOptionId : null;
  const label = typeof source.priceOptionLabel === "string" && source.priceOptionLabel ? source.priceOptionLabel : null;
  return id || label ? { id, label } : null;
}

function variantsDiffer(previous: VariantActivityIdentity | null, next: VariantActivityIdentity | null) {
  return previous?.id !== next?.id || previous?.label !== next?.label;
}

function pickSharedProjectComponentSourceSnapshot(value: unknown, includeVariantFields = false) {
  if (value === null) return null;
  const sourceSnapshot = readJsonRecord(value);
  const shared: Record<string, unknown> = {};
  for (const key of SHARED_PROJECT_COMPONENT_SOURCE_SNAPSHOT_KEYS) {
    if (Object.hasOwn(sourceSnapshot, key)) shared[key] = sourceSnapshot[key];
  }
  if (includeVariantFields) {
    for (const key of PROJECT_COMPONENT_VARIANT_SOURCE_SNAPSHOT_KEYS) {
      if (Object.hasOwn(sourceSnapshot, key)) shared[key] = sourceSnapshot[key];
    }
  }
  return Object.keys(shared).length > 0 ? shared : undefined;
}

function pickSharedProjectComponentPatch(rowPatch: Record<string, unknown>) {
  const shared: Record<string, unknown> = {};
  for (const key of SHARED_PROJECT_COMPONENT_ROW_PATCH_KEYS) {
    if (!Object.hasOwn(rowPatch, key)) continue;
    if (key === "sourceSnapshot") {
      const sourceSnapshot = pickSharedProjectComponentSourceSnapshot(rowPatch.sourceSnapshot);
      if (sourceSnapshot !== undefined) shared.sourceSnapshot = sourceSnapshot;
    } else {
      shared[key] = rowPatch[key];
    }
  }
  return shared;
}

function readNonEmptyText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readProjectComponentPriceOptions(sourceSnapshot: unknown) {
  const priceOptions = readJsonRecord(sourceSnapshot).priceOptions;
  if (!Array.isArray(priceOptions)) return [] as ProjectComponentPriceOptionSnapshot[];
  return priceOptions.flatMap((candidate): ProjectComponentPriceOptionSnapshot[] => {
    const option = readJsonRecord(candidate);
    const id = readNonEmptyText(option.id);
    return id ? [{ ...option, id }] : [];
  });
}

function projectComponentPriceOptionMap(sourceSnapshot: unknown) {
  return new Map(readProjectComponentPriceOptions(sourceSnapshot).map((option) => [option.id, option]));
}

function isSelectableProjectComponentPriceOption(option: ProjectComponentPriceOptionSnapshot | undefined) {
  return Boolean(option && option.isActive !== false);
}

function projectComponentVariantOptionSignature(option: ProjectComponentPriceOptionSnapshot | undefined) {
  return option ? JSON.stringify(PROJECT_COMPONENT_VARIANT_OPTION_SIGNATURE_KEYS.map((key) => option[key] ?? null)) : "";
}

function projectComponentVariantImageSignature(option: ProjectComponentPriceOptionSnapshot | undefined) {
  return option ? JSON.stringify([
    option.imageBucket ?? null,
    option.imagePath ?? null,
    option.thumbnailPath ?? null,
    option.imageMetadata ?? null,
  ]) : "";
}

function readProjectComponentSelectedPriceOptionId(row: EstimateRowRecord) {
  const sourceSnapshot = readJsonRecord(rowSourceSnapshot(row));
  const metadata = readJsonRecord(rowMetadata(row));
  return readNonEmptyText(sourceSnapshot.priceOptionId) ?? readNonEmptyText(metadata.priceOptionId);
}

function readRemovedPriceOptionReplacements(value: unknown) {
  const replacements = new Map<string, string>();
  for (const [removedId, replacementValue] of Object.entries(readJsonRecord(value))) {
    const normalizedRemovedId = readNonEmptyText(removedId);
    const replacementId = readNonEmptyText(replacementValue);
    if (normalizedRemovedId && replacementId) replacements.set(normalizedRemovedId, replacementId);
  }
  return replacements;
}

function projectComponentVariantSourceSnapshotPatch(
  option: ProjectComponentPriceOptionSnapshot,
  options: { clearImageAsset: boolean },
) {
  const imageUrl = readNonEmptyText(option.thumbnailPath) ?? readNonEmptyText(option.imagePath);
  return {
    description: readNonEmptyText(option.variantDescription),
    imageUrl,
    priceOptionLabel: readNonEmptyText(option.label),
    pricingDate: readNonEmptyText(option.pricingDate),
    pricingSource: readNonEmptyText(option.pricingSource),
    sku: readNonEmptyText(option.sku),
    sourceUrl: readNonEmptyText(option.sourceUrl),
    unit: readNonEmptyText(option.unit) ?? "unit",
    unit_cost: Math.max(0, readNumber(option.unitCost)),
    ...(options.clearImageAsset ? { imageAsset: null } : {}),
  };
}

function normalizeProjectComponentSourceRowPatch(
  row: EstimateRowRecord,
  rowPatch: Record<string, unknown>,
  replacements: Map<string, string>,
) {
  const hasPriceOptionLabelPatch = Object.hasOwn(rowPatch, "priceOptionLabel");
  const nextPriceOptionLabel = hasPriceOptionLabelPatch ? readNonEmptyText(rowPatch.priceOptionLabel) : null;
  if (hasPriceOptionLabelPatch && !nextPriceOptionLabel) throw new Error("Variant name is required.");
  const persistedRowPatch = { ...rowPatch };
  delete persistedRowPatch.priceOptionLabel;
  if (!Object.hasOwn(persistedRowPatch, "sourceSnapshot") || persistedRowPatch.sourceSnapshot === null) {
    return persistedRowPatch;
  }
  const currentSourceSnapshot = readJsonRecord(rowSourceSnapshot(row));
  const incomingSourceSnapshot = { ...currentSourceSnapshot, ...readJsonRecord(persistedRowPatch.sourceSnapshot) };
  const incomingOptions = readProjectComponentPriceOptions(incomingSourceSnapshot);
  if (incomingOptions.length === 0) return persistedRowPatch;
  const currentSelectedId = readProjectComponentSelectedPriceOptionId(row);
  const incomingOptionById = new Map(incomingOptions.map((option) => [option.id, option]));
  let selectedId = readNonEmptyText(incomingSourceSnapshot.priceOptionId) ?? currentSelectedId;
  if (currentSelectedId && !isSelectableProjectComponentPriceOption(incomingOptionById.get(currentSelectedId))) {
    const replacementId = replacements.get(currentSelectedId);
    if (!replacementId || !isSelectableProjectComponentPriceOption(incomingOptionById.get(replacementId))) {
      throw new Error("Choose an active replacement for every used project component variant before saving.");
    }
    selectedId = replacementId;
  }
  const selectedOption = selectedId ? incomingOptionById.get(selectedId) : undefined;
  if (!isSelectableProjectComponentPriceOption(selectedOption)) {
    throw new Error("The selected project component variant is no longer available.");
  }
  const selectedIndex = incomingOptions.findIndex((option) => option.id === selectedId);
  const nextSelectedOption: ProjectComponentPriceOptionSnapshot = {
    ...selectedOption!,
    ...(nextPriceOptionLabel ? { label: nextPriceOptionLabel } : {}),
    ...(Object.hasOwn(persistedRowPatch, "description") ? { variantDescription: persistedRowPatch.description } : {}),
    ...(Object.hasOwn(persistedRowPatch, "unit") ? { unit: persistedRowPatch.unit } : {}),
    ...(Object.hasOwn(persistedRowPatch, "unitCost") ? { unitCost: persistedRowPatch.unitCost } : {}),
  };
  const nextOptions = [...incomingOptions];
  nextOptions[selectedIndex] = nextSelectedOption;
  const previousSelectedOption = currentSelectedId
    ? projectComponentPriceOptionMap(currentSourceSnapshot).get(currentSelectedId)
    : undefined;
  const selectionChanged = selectedId !== currentSelectedId;
  const imageChanged = selectionChanged
    || projectComponentVariantImageSignature(previousSelectedOption) !== projectComponentVariantImageSignature(nextSelectedOption);
  const variantSnapshotPatch = projectComponentVariantSourceSnapshotPatch(nextSelectedOption, { clearImageAsset: imageChanged });
  return {
    ...persistedRowPatch,
    description: variantSnapshotPatch.description ?? "",
    unit: variantSnapshotPatch.unit,
    unitCost: variantSnapshotPatch.unit_cost,
    sourceSnapshot: {
      ...incomingSourceSnapshot,
      ...variantSnapshotPatch,
      priceOptionId: selectedId,
      priceOptions: nextOptions,
    },
  };
}

function normalizeProjectComponentVariantSelectionRowPatch(row: EstimateRowRecord, rowPatch: Record<string, unknown>) {
  const currentSourceSnapshot = readJsonRecord(rowSourceSnapshot(row));
  const selectedId = readNonEmptyText(readJsonRecord(rowPatch.sourceSnapshot).priceOptionId);
  if (!selectedId) throw new Error("Choose a project component variant before saving.");
  const optionById = projectComponentPriceOptionMap(currentSourceSnapshot);
  const selectedOption = optionById.get(selectedId);
  if (!isSelectableProjectComponentPriceOption(selectedOption)) {
    throw new Error("The selected project component variant is no longer available.");
  }
  const previousSelectedId = readProjectComponentSelectedPriceOptionId(row);
  const previousSelectedOption = previousSelectedId ? optionById.get(previousSelectedId) : undefined;
  const imageChanged = previousSelectedId !== selectedId
    || projectComponentVariantImageSignature(previousSelectedOption) !== projectComponentVariantImageSignature(selectedOption);
  const variantSnapshotPatch = projectComponentVariantSourceSnapshotPatch(selectedOption!, { clearImageAsset: imageChanged });
  return {
    description: variantSnapshotPatch.description ?? "",
    unit: variantSnapshotPatch.unit,
    unitCost: variantSnapshotPatch.unit_cost,
    sourceSnapshot: { ...currentSourceSnapshot, ...variantSnapshotPatch, priceOptionId: selectedId },
    metadata: { ...readJsonRecord(rowMetadata(row)), priceOptionId: selectedId },
  };
}

function mergeSharedSourceSnapshotIntoRow(
  row: EstimateRowRecord,
  sourceSnapshot: unknown,
  selectedPriceOptionId: string | null,
  variantOption?: ProjectComponentPriceOptionSnapshot,
  clearImageAsset = false,
  includeLegacyVariantFields = false,
) {
  if (sourceSnapshot === null) return null;
  const sharedSourceSnapshot = pickSharedProjectComponentSourceSnapshot(sourceSnapshot, includeLegacyVariantFields);
  if (sharedSourceSnapshot === undefined) return undefined;
  return {
    ...readJsonRecord(rowSourceSnapshot(row)),
    ...sharedSourceSnapshot,
    ...(variantOption ? projectComponentVariantSourceSnapshotPatch(variantOption, { clearImageAsset }) : {}),
    priceOptionId: selectedPriceOptionId,
  };
}

function mergeSourceSnapshotPatchIntoRow(row: EstimateRowRecord, rowPatch: Record<string, unknown>) {
  if (!Object.hasOwn(rowPatch, "sourceSnapshot")) return rowPatch;
  if (rowPatch.sourceSnapshot === null) return { ...rowPatch, sourceSnapshot: {} };
  return {
    ...rowPatch,
    sourceSnapshot: { ...readJsonRecord(rowSourceSnapshot(row)), ...readJsonRecord(rowPatch.sourceSnapshot) },
  };
}

function serializeRow(row: Record<string, unknown>): EstimateRowRecord {
  return {
    ...row,
    id: String(row.id ?? ""),
    estimate_id: String(row.estimate_id ?? ""),
    node_id: String(row.node_id ?? ""),
    description: typeof row.description === "string" ? row.description : null,
    designation: typeof row.designation === "string" ? row.designation : null,
    discipline: typeof row.discipline === "string" ? row.discipline : null,
    material: typeof row.material === "string" ? row.material : null,
    supplier: typeof row.supplier === "string" ? row.supplier : null,
    supplier_id: typeof row.supplier_id === "string" ? row.supplier_id : null,
    quantity: readNumber(row.quantity),
    quantity_base: row.quantity_base === null || row.quantity_base === undefined ? null : readNumber(row.quantity_base),
    quantity_contingency_amount: row.quantity_contingency_amount === null || row.quantity_contingency_amount === undefined
      ? null
      : readNumber(row.quantity_contingency_amount),
    unit: typeof row.unit === "string" ? row.unit : null,
    unit_cost: readNumber(row.unit_cost),
    misc_cost: readNumber(row.misc_cost),
    contingency_percentage: readNumber(row.contingency_percentage),
    adjustment_percentage: readNumber(row.adjustment_percentage),
    source_snapshot: row.source_snapshot_json === null || row.source_snapshot === null
      ? null
      : readJson(row.source_snapshot_json ?? row.source_snapshot, {}),
    sort_order: readNumber(row.sort_order),
    row_revision: Math.max(1, Math.trunc(readNumber(row.row_revision, 1))),
    category_node_id: typeof row.category_node_id === "string" ? row.category_node_id : null,
    source_library_item_id: typeof row.source_library_item_id === "string" ? row.source_library_item_id : null,
    link_state: typeof row.link_state === "string" && row.link_state ? row.link_state : "unlinked",
    metadata: readJson(row.metadata_json ?? row.metadata, {}),
    pricing_provenance_origin: typeof row.pricing_provenance_origin === "string" ? row.pricing_provenance_origin : null,
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : undefined,
  };
}

async function assertScopedEstimate(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: { projectId: string; estimateId: string },
) {
  const context = await assertEstimateEditIntent(database, actor, input.estimateId);
  if (context.projectId !== input.projectId) throw new Error("Estimate not found in the current project.");
  return context;
}

function getSourceLibraryItemId(libraryItem: EstimateRowItem) {
  if (libraryItem.sourceLibraryItemId && isUuid(libraryItem.sourceLibraryItemId)) return libraryItem.sourceLibraryItemId;
  return libraryItem.source === "library" && isUuid(libraryItem.id) ? libraryItem.id : null;
}

function getSourceSnapshot(libraryItem: EstimateRowItem): Json {
  const sourceLibraryItemId = getSourceLibraryItemId(libraryItem);
  const libraryItemSourceSnapshot = (libraryItem as EstimateRowItem & { sourceSnapshot?: unknown }).sourceSnapshot;
  const projectComponentProjection = readProjectComponentProjectionMetadata(libraryItem.metadata);
  const projectComponentId = libraryItem.source === "project"
    ? getProjectComponentIdentity(libraryItem.metadata, libraryItem.id, libraryItemSourceSnapshot)
    : null;
  return sanitizeEstimateRowSourceSnapshot({
    category: libraryItem.category,
    categoryId: libraryItem.categoryId ?? null,
    categoryNodeId: libraryItem.categoryNodeId ?? null,
    categoryPath: libraryItem.categoryPath ?? [],
    categoryPathIds: libraryItem.categoryPathIds ?? [],
    brand: libraryItem.brand ?? null,
    brandId: libraryItem.brandId ?? null,
    componentVersionId: libraryItem.componentVersionId ?? null,
    componentVersionNumber: libraryItem.componentVersionNumber ?? null,
    imageUrl: libraryItem.imageUrl ?? null,
    lifecycleState: libraryItem.lifecycleState ?? null,
    priceOptionId: libraryItem.priceOptionId ?? null,
    priceOptionLabel: libraryItem.priceOptionLabel ?? null,
    priceOptions: libraryItem.priceOptions ?? [],
    pricingDate: libraryItem.pricingDate,
    pricingSource: libraryItem.pricingSource,
    sourceUrl: libraryItem.sourceUrl ?? null,
    sourceComponentId: sourceLibraryItemId ?? projectComponentId,
    sourceEstimateRowId: projectComponentProjection?.sourceRowId ?? (projectComponentId ? libraryItem.id : null),
    sourceLibraryItemId,
    sourceProjectId: projectComponentProjection?.projectId ?? null,
    sourceType: projectComponentId ? "project_component" : sourceLibraryItemId ? "library_component" : null,
    sourceUpdatedAt: libraryItem.updatedAt ?? null,
    supplier: libraryItem.supplier ?? null,
    supplierId: libraryItem.supplierId ?? null,
    tags: libraryItem.tags ?? [],
    taxonomyVersion: "2026-05-22-draft-3",
    unit: libraryItem.unit,
    unit_cost: libraryItem.itemCost,
    contingency_percentage: libraryItem.contingencyPercentage ?? 0,
    adjustment_percentage: libraryItem.adjustmentPercentage ?? 0,
    misc_cost: libraryItem.miscCost,
    currency: libraryItem.currency ?? "PHP",
  }) as Json;
}

function getEstimateRowMetadata(libraryItem: EstimateRowItem): Json {
  const existingMetadata = readEstimateRowMetadata(libraryItem.metadata);
  const sourceSnapshot = (libraryItem as EstimateRowItem & { sourceSnapshot?: unknown }).sourceSnapshot;
  const sourceLibraryItemId = getSourceLibraryItemId(libraryItem);
  const projectComponentId = libraryItem.source === "project"
    ? getProjectComponentIdentity(existingMetadata, libraryItem.id, sourceSnapshot)
    : null;
  const tags = (libraryItem.tags ?? (Array.isArray(existingMetadata.tags) ? existingMetadata.tags : []))
    .filter((tag): tag is string => typeof tag === "string");
  let metadata: EstimateRowMetadata = {
    ...existingMetadata,
    categoryId: libraryItem.categoryId ?? null,
    categoryNodeId: libraryItem.categoryNodeId ?? null,
    categoryPath: libraryItem.categoryPath ?? [],
    categoryPathIds: libraryItem.categoryPathIds ?? [],
    brandId: libraryItem.brandId ?? null,
    supplierId: libraryItem.supplierId ?? null,
    sourceComponentId: sourceLibraryItemId,
    componentVersionId: libraryItem.componentVersionId ?? null,
    componentVersionNumber: libraryItem.componentVersionNumber ?? null,
    priceOptionId: libraryItem.priceOptionId ?? null,
    tags,
  };
  if (projectComponentId) {
    const expressComponent = readExpressComponentMetadata(metadata);
    if (expressComponent) {
      metadata = {
        ...metadata,
        expressComponent: { ...expressComponent, componentId: expressComponent.componentId ?? projectComponentId },
      };
    }
    const projection = readProjectComponentProjectionMetadata(metadata);
    if (projection) {
      metadata = withProjectComponentProjectionMetadata(metadata, {
        ...projection,
        componentId: projection.componentId ?? projectComponentId,
      });
    }
  }
  if (isExpressComponentRow({ metadata })) {
    return { ...metadata, sourceComponentId: null, tags: tags.filter((tag) => tag !== LEGACY_BLANK_ROW_TAG) } as Json;
  }
  return metadata as Json;
}

function buildEstimateRowReplacementPayload(libraryItem: EstimateRowItem) {
  const quantity = libraryItem.quantity ?? 1;
  const quantityBase = libraryItem.quantityBase ?? null;
  const quantityContingencyAmount = quantityBase === null ? null : libraryItem.quantityContingencyAmount ?? 0;
  const sourceLibraryItemId = getSourceLibraryItemId(libraryItem);
  return {
    sourceLibraryItemId,
    sourceSnapshot: getSourceSnapshot(libraryItem),
    categoryNodeId: libraryItem.categoryNodeId ?? null,
    supplierId: libraryItem.supplierId ?? null,
    material: libraryItem.material,
    description: libraryItem.description,
    supplier: libraryItem.supplier,
    unit: libraryItem.unit,
    quantity,
    quantityBase,
    quantityContingencyAmount,
    unitCost: libraryItem.itemCost,
    contingencyPercentage: libraryItem.contingencyPercentage ?? 0,
    adjustmentPercentage: libraryItem.adjustmentPercentage ?? 0,
    miscCost: libraryItem.miscCost,
    discipline: libraryItem.discipline,
    designation: libraryItem.designation,
    metadata: getEstimateRowMetadata(libraryItem),
    linkState: sourceLibraryItemId ? "linked-clean" : "unlinked",
    pricingProvenanceOrigin: sourceLibraryItemId ? "recorded" : "missing",
  };
}

async function readCurrentLibrarySourceReceipt(
  database: D1DatabaseLike,
  libraryItem: EstimateRowItem,
): Promise<LibrarySourceCommitReceipt | null> {
  const sourceLibraryItemId = getSourceLibraryItemId(libraryItem);
  if (!sourceLibraryItemId) return null;
  const item = await firstD1Row<LibraryItemProjection>(
    database,
    `SELECT id, workspace_id, active_price_option_id, current_version_number, updated_at, lifecycle_state, unit, unit_cost, misc_cost
     FROM cost_library_items WHERE id = ? LIMIT 1`,
    [sourceLibraryItemId],
  );
  if (!item) throw new Error("Library source changed. Refresh the estimate before committing this component.");
  if (item.lifecycle_state === "archived") {
    throw new Error("Library source is archived. Refresh the estimate before committing this component.");
  }
  if (libraryItem.lifecycleState && item.lifecycle_state !== libraryItem.lifecycleState) {
    throw new Error("Library source changed. Refresh the estimate before committing this component.");
  }
  if (
    libraryItem.componentVersionNumber !== undefined
    && Number(item.current_version_number) !== libraryItem.componentVersionNumber
  ) {
    throw new Error("Library source changed. Refresh the estimate before committing this component.");
  }
  const itemUpdatedAt = typeof item.updated_at === "string" ? item.updated_at : null;
  if (libraryItem.updatedAt && itemUpdatedAt && itemUpdatedAt !== libraryItem.updatedAt) {
    throw new Error("Library source changed. Refresh the estimate before committing this component.");
  }
  const selectedOptionId = libraryItem.priceOptionId ?? item.active_price_option_id;
  const option = selectedOptionId
    ? await firstD1Row<LibraryPriceOptionProjection>(
        database,
        `SELECT id, item_id, label, unit, unit_cost, misc_cost, is_active, updated_at
         FROM cost_library_item_price_options WHERE id = ? AND item_id = ? LIMIT 1`,
        [selectedOptionId, sourceLibraryItemId],
      )
    : null;
  if (selectedOptionId && (!option || !(option.is_active === true || Number(option.is_active) === 1))) {
    throw new Error("Library variant changed. Refresh the estimate before committing this component.");
  }
  const costEntry = selectedOptionId
    ? await firstD1Row<LibraryVariantCostProjection>(
        database,
        `SELECT id, price_option_id, unit_cost, misc_cost, updated_at
         FROM cost_library_item_variant_cost_entries
         WHERE price_option_id = ? AND is_current = 1 AND deleted_at IS NULL LIMIT 1`,
        [selectedOptionId],
      )
    : null;
  const resolvedUnit = option?.unit ?? item.unit;
  const resolvedUnitCost = Number(costEntry?.unit_cost ?? option?.unit_cost ?? item.unit_cost);
  const resolvedMiscCost = Number(costEntry?.misc_cost ?? option?.misc_cost ?? item.misc_cost);
  if (
    libraryItem.unit !== resolvedUnit
    || libraryItem.itemCost !== resolvedUnitCost
    || libraryItem.miscCost !== resolvedMiscCost
    || (libraryItem.priceOptionLabel !== undefined && option?.label !== libraryItem.priceOptionLabel)
  ) {
    throw new Error("Library variant pricing changed. Refresh the estimate before committing this component.");
  }
  const receipt = {
    sourceLibraryItemId,
    workspaceId: item.workspace_id,
    itemVersion: Number(item.current_version_number),
    itemUpdatedAt,
    lifecycleState: item.lifecycle_state,
    itemUnit: item.unit,
    itemUnitCost: Number(item.unit_cost),
    itemMiscCost: Number(item.misc_cost),
    itemActivePriceOptionId: item.active_price_option_id,
    selectedOptionId: option?.id ?? null,
    optionLabel: option?.label ?? null,
    optionUnit: option?.unit ?? null,
    optionUnitCost: option ? Number(option.unit_cost) : null,
    optionMiscCost: option ? Number(option.misc_cost) : null,
    optionUpdatedAt: option?.updated_at ?? null,
    activeCostEntryId: costEntry?.id ?? null,
    activeCostEntryUnitCost: costEntry ? Number(costEntry.unit_cost) : null,
    activeCostEntryMiscCost: costEntry ? Number(costEntry.misc_cost) : null,
    activeCostEntryUpdatedAt: costEntry?.updated_at ?? null,
    resolvedUnit,
    resolvedUnitCost,
    resolvedMiscCost,
  };
  return { ...receipt, fingerprint: createMutationRequestFingerprint(receipt) };
}

function buildLibrarySourceCommitGuardStatements(receipt: LibrarySourceCommitReceipt): D1IntentStatement[] {
  const guards: D1IntentStatement[] = [{
    sql: `SELECT CASE WHEN EXISTS (
      SELECT 1 FROM cost_library_items
      WHERE id = ? AND workspace_id = ? AND current_version_number = ? AND updated_at IS ?
        AND lifecycle_state IS ? AND lifecycle_state <> 'archived' AND unit = ? AND unit_cost = ?
        AND misc_cost = ? AND active_price_option_id IS ?
    ) THEN 1 ELSE json('') END AS estimate_library_source_guard`,
    values: [
      receipt.sourceLibraryItemId,
      receipt.workspaceId,
      receipt.itemVersion,
      receipt.itemUpdatedAt,
      receipt.lifecycleState,
      receipt.itemUnit,
      receipt.itemUnitCost,
      receipt.itemMiscCost,
      receipt.itemActivePriceOptionId,
    ],
  }];
  if (!receipt.selectedOptionId) return guards;
  guards.push({
    sql: `SELECT CASE WHEN EXISTS (
      SELECT 1 FROM cost_library_item_price_options
      WHERE id = ? AND item_id = ? AND workspace_id = ? AND is_active = 1 AND label IS ?
        AND unit IS ? AND unit_cost IS ? AND misc_cost IS ? AND updated_at IS ?
    ) THEN 1 ELSE json('') END AS estimate_library_option_guard`,
    values: [
      receipt.selectedOptionId,
      receipt.sourceLibraryItemId,
      receipt.workspaceId,
      receipt.optionLabel,
      receipt.optionUnit,
      receipt.optionUnitCost,
      receipt.optionMiscCost,
      receipt.optionUpdatedAt,
    ],
  });
  if (receipt.activeCostEntryId) {
    guards.push({
      sql: `SELECT CASE WHEN EXISTS (
        SELECT 1 FROM cost_library_item_variant_cost_entries
        WHERE id = ? AND workspace_id = ? AND item_id = ? AND price_option_id = ? AND is_current = 1
          AND deleted_at IS NULL AND unit_cost IS ? AND misc_cost IS ? AND updated_at IS ?
      ) THEN 1 ELSE json('') END AS estimate_library_cost_guard`,
      values: [
        receipt.activeCostEntryId,
        receipt.workspaceId,
        receipt.sourceLibraryItemId,
        receipt.selectedOptionId,
        receipt.activeCostEntryUnitCost,
        receipt.activeCostEntryMiscCost,
        receipt.activeCostEntryUpdatedAt,
      ],
    });
  } else {
    guards.push({
      sql: `SELECT CASE WHEN NOT EXISTS (
        SELECT 1 FROM cost_library_item_variant_cost_entries
        WHERE workspace_id = ? AND item_id = ? AND price_option_id = ? AND is_current = 1 AND deleted_at IS NULL
      ) THEN 1 ELSE json('') END AS estimate_library_cost_absence_guard`,
      values: [receipt.workspaceId, receipt.sourceLibraryItemId, receipt.selectedOptionId],
    });
  }
  return guards;
}

function buildProjectComponentImpactGuardStatement(input: {
  projectId: string;
  sourceRowId: string;
  componentId: string | null;
  expectedFingerprint: string;
}): D1IntentStatement {
  return {
    sql: `SELECT CASE WHEN COALESCE((
      SELECT GROUP_CONCAT(component_revision, '|') FROM (
        SELECT row_item.id || ':' || CAST(row_item.row_revision AS TEXT) AS component_revision
        FROM estimate_row_items row_item
        INNER JOIN estimates estimate ON estimate.id = row_item.estimate_id
        WHERE estimate.project_id = ? AND (row_item.id = ? OR ${PROJECT_COMPONENT_IDENTITY_SQL} = ?)
        ORDER BY row_item.id
      )
    ), '') = ? THEN 1 ELSE json('') END AS component_impact_guard`,
    values: [input.projectId, input.sourceRowId, input.componentId, input.expectedFingerprint],
  };
}

async function readProjectComponentImpactRevisionRows(database: D1DatabaseLike, input: {
  projectId: string;
  sourceRowId: string;
  componentId: string | null;
}) {
  return allD1Rows<{ row_id: string; row_revision: number | string }>(
    database,
    `SELECT row_item.id AS row_id, row_item.row_revision
     FROM estimate_row_items row_item
     INNER JOIN estimates estimate ON estimate.id = row_item.estimate_id
     WHERE estimate.project_id = ? AND (row_item.id = ? OR ${PROJECT_COMPONENT_IDENTITY_SQL} = ?)
     ORDER BY row_item.id`,
    [input.projectId, input.sourceRowId, input.componentId],
  );
}

async function propagateProjectComponentRowPatch(database: D1DatabaseLike, input: {
  projectId: string;
  sourceRow: EstimateRowRecord;
  rowPatch: Record<string, unknown>;
  componentId: string | null;
  expectedImpactFingerprint?: string;
  removedPriceOptionReplacements: Map<string, string>;
}) {
  const sharedPatch = pickSharedProjectComponentPatch(input.rowPatch);
  const sourceSnapshotPatch = readJsonRecord(input.rowPatch.sourceSnapshot);
  const hasVariantPatch = ["description", "unit", "unitCost"].some((key) => Object.hasOwn(input.rowPatch, key))
    || [...PROJECT_COMPONENT_VARIANT_SOURCE_SNAPSHOT_KEYS].some((key) => Object.hasOwn(sourceSnapshotPatch, key));
  const empty = {
    rowIds: [] as string[],
    totalDeltaMinorUnits: 0,
    facts: [] as Array<Record<string, unknown>>,
    truncatedCount: 0,
    mutationStatements: [] as D1IntentStatement[],
    impactFingerprint: null as string | null,
  };
  if ((Object.keys(sharedPatch).length === 0 && !hasVariantPatch) || !input.componentId) return empty;
  const siblingRows = (await allD1Rows<Record<string, unknown>>(
    database,
    `SELECT row_item.*, row_item.source_snapshot_json, row_item.metadata_json
     FROM estimate_row_items row_item
     INNER JOIN estimates estimate ON estimate.id = row_item.estimate_id
     WHERE estimate.project_id = ? AND row_item.id <> ? AND ${PROJECT_COMPONENT_IDENTITY_SQL} = ?`,
    [input.projectId, input.sourceRow.id, input.componentId],
  )).map(serializeRow);
  const impactFingerprint = buildComponentImpactFingerprint([
    { row_id: input.sourceRow.id, row_revision: input.sourceRow.row_revision },
    ...siblingRows.map((row) => ({ row_id: row.id, row_revision: row.row_revision })),
  ]);
  if (input.expectedImpactFingerprint !== undefined && impactFingerprint !== input.expectedImpactFingerprint) {
    throw new Error(COMPONENT_IMPACT_CONFLICT_MESSAGE);
  }
  const propagatedAt = nowIso();
  const statements: D1IntentStatement[] = [];
  const facts: Array<Record<string, unknown>> = [];
  let totalDeltaMinorUnits = 0;
  const sourceCurrentSnapshot = readJsonRecord(rowSourceSnapshot(input.sourceRow));
  const incomingSourceSnapshot = readJsonRecord(input.rowPatch.sourceSnapshot);
  const currentOptionById = projectComponentPriceOptionMap(sourceCurrentSnapshot);
  const incomingOptionById = projectComponentPriceOptionMap(incomingSourceSnapshot);
  const hasIncomingVariantGraph = Array.isArray(incomingSourceSnapshot.priceOptions);
  const sourceSelectedPriceOptionId = readProjectComponentSelectedPriceOptionId(input.sourceRow);
  const changedOptionIds = new Set<string>();
  const imageChangedOptionIds = new Set<string>();
  if (hasIncomingVariantGraph) {
    for (const [optionId, nextOption] of incomingOptionById) {
      const previousOption = currentOptionById.get(optionId);
      if (projectComponentVariantOptionSignature(previousOption) !== projectComponentVariantOptionSignature(nextOption)) {
        changedOptionIds.add(optionId);
      }
      if (projectComponentVariantImageSignature(previousOption) !== projectComponentVariantImageSignature(nextOption)) {
        imageChangedOptionIds.add(optionId);
      }
    }
  }
  for (const row of [input.sourceRow, ...siblingRows]) {
    const selectedId = readProjectComponentSelectedPriceOptionId(row);
    if (!selectedId || !hasIncomingVariantGraph || isSelectableProjectComponentPriceOption(incomingOptionById.get(selectedId))) continue;
    const replacementId = input.removedPriceOptionReplacements.get(selectedId);
    if (!replacementId || !isSelectableProjectComponentPriceOption(incomingOptionById.get(replacementId))) {
      throw new Error("Choose an active replacement for every used project component variant before saving.");
    }
  }
  for (const row of siblingRows) {
    const nextRevision = row.row_revision + 1;
    const rowSelectedId = readProjectComponentSelectedPriceOptionId(row);
    const replacementId = rowSelectedId && hasIncomingVariantGraph
      && !isSelectableProjectComponentPriceOption(incomingOptionById.get(rowSelectedId))
      ? input.removedPriceOptionReplacements.get(rowSelectedId) ?? null
      : null;
    const nextSelectedId = replacementId ?? rowSelectedId;
    const nextSelectedOption = nextSelectedId ? incomingOptionById.get(nextSelectedId) : undefined;
    const selectionChanged = nextSelectedId !== rowSelectedId;
    const includeLegacyVariantFields = !hasIncomingVariantGraph
      && (!sourceSelectedPriceOptionId || sourceSelectedPriceOptionId === rowSelectedId);
    const includeVariantFields = Boolean(includeLegacyVariantFields || (
      hasIncomingVariantGraph && nextSelectedOption
      && (selectionChanged || changedOptionIds.has(nextSelectedOption.id))
    ));
    const siblingPatch: Record<string, unknown> = { ...sharedPatch };
    if (includeVariantFields && nextSelectedOption) {
      const variantPatch = projectComponentVariantSourceSnapshotPatch(nextSelectedOption, {
        clearImageAsset: selectionChanged || imageChangedOptionIds.has(nextSelectedOption.id),
      });
      siblingPatch.description = variantPatch.description ?? "";
      siblingPatch.unit = variantPatch.unit;
      siblingPatch.unitCost = variantPatch.unit_cost;
    } else if (includeLegacyVariantFields) {
      for (const key of ["description", "unit", "unitCost"]) {
        if (Object.hasOwn(input.rowPatch, key)) siblingPatch[key] = input.rowPatch[key];
      }
    }
    const columns = updateValuesForRowPatch(siblingPatch);
    if (Object.hasOwn(input.rowPatch, "sourceSnapshot")) {
      const mergedSourceSnapshot = mergeSharedSourceSnapshotIntoRow(
        row,
        input.rowPatch.sourceSnapshot,
        nextSelectedId,
        includeVariantFields ? nextSelectedOption : undefined,
        Boolean(includeVariantFields && nextSelectedOption
          && (selectionChanged || imageChangedOptionIds.has(nextSelectedOption.id))),
        includeLegacyVariantFields,
      );
      if (mergedSourceSnapshot !== undefined) {
        const index = columns.findIndex(([column]) => column === "source_snapshot_json");
        const column: [string, unknown] = ["source_snapshot_json", jsonString(mergedSourceSnapshot, null)];
        if (index >= 0) columns[index] = column;
        else columns.push(column);
      }
    }
    if (columns.length === 0) continue;
    if (facts.length < MAX_PROPAGATED_ACTIVITY_FACTS) {
      facts.push({
        rowId: row.id,
        before: { material: row.material, unitCost: row.unit_cost, sourceSnapshot: row.source_snapshot },
        after: {
          material: Object.hasOwn(siblingPatch, "material") ? siblingPatch.material : row.material,
          unitCost: Object.hasOwn(siblingPatch, "unitCost") ? siblingPatch.unitCost : row.unit_cost,
          sourceSnapshot: Object.hasOwn(input.rowPatch, "sourceSnapshot")
            ? mergeSharedSourceSnapshotIntoRow(
                row,
                input.rowPatch.sourceSnapshot,
                nextSelectedId,
                includeVariantFields ? nextSelectedOption : undefined,
                Boolean(includeVariantFields && nextSelectedOption
                  && (selectionChanged || imageChangedOptionIds.has(nextSelectedOption.id))),
                includeLegacyVariantFields,
              )
            : row.source_snapshot,
        },
      });
    }
    if (Object.hasOwn(siblingPatch, "unitCost")) {
      totalDeltaMinorUnits += estimateRowTotalMinorUnits({ ...row, unit_cost: readNumber(siblingPatch.unitCost) })
        - estimateRowTotalMinorUnits(row);
    }
    const assignments = columns.map(([column]) => `${column} = ?`);
    const values = columns.map(([, value]) => value);
    assignments.push("row_revision = ?", "updated_at = ?");
    values.push(nextRevision, propagatedAt, row.id, row.estimate_id, row.row_revision);
    statements.push({
      sql: `UPDATE estimate_row_items SET ${assignments.join(", ")} WHERE id = ? AND estimate_id = ? AND row_revision = ?`,
      values,
    });
  }
  return {
    rowIds: siblingRows.map((row) => row.id),
    totalDeltaMinorUnits,
    facts,
    truncatedCount: Math.max(0, siblingRows.length - facts.length),
    mutationStatements: statements,
    impactFingerprint,
  };
}

const PROJECT_COMPONENT_ATTACHMENT_CONTENT_TYPES = new Set([
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

type ProjectComponentAttachmentBindingRow = {
  id: string;
  price_option_id: string;
  upload_asset_id: string;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  content_type: string;
  size_bytes: number | string;
  attachment_kind: "pdf" | "excel" | null;
  metadata_json: string | null;
  created_by: string | null;
  review_status: "uploaded" | "approved" | "rejected" | "superseded";
  is_current_approved: number | boolean;
  review_revision: number | string;
  created_at: string;
};

type ProjectComponentAttachmentAssetRow = {
  id: string;
  workspace_id: string;
  actor_user_id: string | null;
  project_id: string | null;
  surface: string;
  target_entity_type: string | null;
  target_entity_id: string | null;
  status: string;
  file_name: string;
  content_type: string;
  size_bytes: number | string;
  scan_status: string | null;
  scan_override_expires_at: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  metadata_json: string | null;
};

type ProjectComponentAttachmentDraft = {
  id: string;
  assetId: string;
  bucket: string;
  path: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  kind: "pdf" | "excel";
  metadata: Record<string, unknown>;
};

function projectComponentAttachmentKind(contentType: string): "pdf" | "excel" {
  return contentType === "application/pdf" ? "pdf" : "excel";
}

function projectComponentAttachmentScanAllowed(asset: ProjectComponentAttachmentAssetRow, timestamp: string) {
  return asset.scan_status === "pending" || asset.scan_status === "clean" || (
    asset.scan_status === "override_approved"
    && typeof asset.scan_override_expires_at === "string"
    && Date.parse(asset.scan_override_expires_at) > Date.parse(timestamp)
  );
}

function projectComponentAttachmentGraphIsPresent(sourceSnapshot: unknown) {
  return readProjectComponentPriceOptions(sourceSnapshot).some((option) => Object.hasOwn(option, "attachments"));
}

function validateProjectComponentAttachmentDraft(
  value: unknown,
  seenAttachmentIds: Set<string>,
  seenAssetIds: Set<string>,
  seenPaths: Set<string>,
): ProjectComponentAttachmentDraft {
  const attachment = readJsonRecord(value);
  const id = readNonEmptyText(attachment.id) ?? "";
  const assetId = readNonEmptyText(attachment.assetId) ?? "";
  const bucket = readNonEmptyText(attachment.bucket) ?? "";
  const path = readNonEmptyText(attachment.path) ?? "";
  const fileName = readNonEmptyText(attachment.fileName) ?? "";
  const contentType = readNonEmptyText(attachment.contentType) ?? "";
  const sizeBytes = readNumber(attachment.sizeBytes, Number.NaN);
  if (!isUuid(id)) throw new Error("Refresh this project component attachment before saving.");
  if (assetId && !isUuid(assetId)) {
    throw new Error("A finalized upload asset is required for every project component attachment.");
  }
  if (bucket !== "component-attachments") {
    throw new Error("Project component attachments must use the component attachment bucket.");
  }
  if (!path || path.includes("..") || path.includes("//")) {
    throw new Error("Project component attachment path is invalid.");
  }
  if (!fileName) throw new Error("Project component attachment file name is required.");
  if (!PROJECT_COMPONENT_ATTACHMENT_CONTENT_TYPES.has(contentType)) {
    throw new Error("Project component attachments must be PDF or Excel files.");
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    throw new Error("Project component attachment size must be positive.");
  }
  if (seenAttachmentIds.has(id) || (assetId && seenAssetIds.has(assetId)) || seenPaths.has(path)) {
    throw new Error("Project component attachments cannot be reused across variants.");
  }
  seenAttachmentIds.add(id);
  if (assetId) seenAssetIds.add(assetId);
  seenPaths.add(path);
  return {
    id,
    assetId,
    bucket,
    path,
    fileName,
    contentType,
    sizeBytes,
    kind: projectComponentAttachmentKind(contentType),
    metadata: readJsonRecord(attachment.metadata),
  };
}

async function planProjectComponentAttachmentReconciliation(database: D1DatabaseLike, input: {
  projectId: string;
  estimateId: string;
  sourceRow: EstimateRowRecord;
  componentId: string | null;
  rowPatch: Record<string, unknown>;
  actorUserId: string;
}) {
  const currentSourceSnapshot = rowSourceSnapshot(input.sourceRow);
  const incomingSourceSnapshot = readJsonRecord(input.rowPatch.sourceSnapshot);
  const hasIncomingGraph = Array.isArray(incomingSourceSnapshot.priceOptions);
  const active = Boolean(input.componentId && hasIncomingGraph && (
    projectComponentAttachmentGraphIsPresent(currentSourceSnapshot)
    || projectComponentAttachmentGraphIsPresent(incomingSourceSnapshot)
  ));
  const emptyPlan = {
    active: false,
    changed: false,
    canonicalRowPatch: input.rowPatch,
    preSourceGuards: [] as D1IntentStatement[],
    postSourceGuards: [] as D1IntentStatement[],
    mutationStatements: [] as D1IntentStatement[],
    createdAttachmentIds: [] as string[],
    supersededAttachmentIds: [] as string[],
  };
  if (!active || !input.componentId) return emptyPlan;
  const project = await firstD1Row<{ id: string; workspace_id: string }>(
    database,
    "SELECT id, workspace_id FROM projects WHERE id = ? LIMIT 1",
    [input.projectId],
  );
  if (!project) throw new Error("Project component attachment scope could not be resolved.");
  const incomingOptions = readProjectComponentPriceOptions(incomingSourceSnapshot);
  const rawOptions = incomingSourceSnapshot.priceOptions as unknown[];
  if (incomingOptions.length === 0 || incomingOptions.length !== rawOptions.length || incomingOptions.length > 50) {
    throw new Error("Project component variants are invalid.");
  }
  const optionIds = new Set<string>();
  let defaultOptionCount = 0;
  for (const option of incomingOptions) {
    if (optionIds.has(option.id)) throw new Error("Project component variant identities must be unique.");
    optionIds.add(option.id);
    if (option.isDefault === true && option.isActive !== false) defaultOptionCount += 1;
  }
  if (defaultOptionCount !== 1) throw new Error("Exactly one active default project component variant is required.");
  const existingBindings = await allD1Rows<ProjectComponentAttachmentBindingRow>(
    database,
    `SELECT id, price_option_id, upload_asset_id, storage_bucket, storage_path,
       file_name, content_type, size_bytes, attachment_kind, metadata_json,
       created_by, review_status, is_current_approved, review_revision, created_at
     FROM component_variant_attachments
     WHERE owner_scope = 'project' AND workspace_id = ? AND project_id = ? AND project_component_id = ?`,
    [project.workspace_id, input.projectId, input.componentId],
  );
  const bindingById = new Map(existingBindings.map((binding) => [binding.id, binding]));
  const seenAttachmentIds = new Set<string>();
  const seenAssetIds = new Set<string>();
  const seenPaths = new Set<string>();
  const draftsByOptionId = new Map<string, ProjectComponentAttachmentDraft[]>();
  for (const option of incomingOptions) {
    if (option.attachments !== undefined && !Array.isArray(option.attachments)) {
      throw new Error("Project component variant attachments are invalid.");
    }
    draftsByOptionId.set(option.id, (Array.isArray(option.attachments) ? option.attachments : []).map((attachment) => (
      validateProjectComponentAttachmentDraft(attachment, seenAttachmentIds, seenAssetIds, seenPaths)
    )));
  }
  const assetIds = new Set<string>();
  for (const drafts of draftsByOptionId.values()) {
    for (const draft of drafts) {
      const assetId = bindingById.get(draft.id)?.upload_asset_id ?? draft.assetId;
      if (assetId) assetIds.add(assetId);
    }
  }
  const assets = assetIds.size > 0
    ? await allD1Rows<ProjectComponentAttachmentAssetRow>(
        database,
        `SELECT id, workspace_id, actor_user_id, project_id, surface, target_entity_type, target_entity_id,
           status, file_name, content_type, size_bytes, scan_status, scan_override_expires_at,
           storage_bucket, storage_path, metadata_json
         FROM upload_assets WHERE id IN (${placeholders([...assetIds])})`,
        [...assetIds],
      )
    : [];
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  const timestamp = nowIso();
  const retainedAttachmentIds = new Set<string>();
  const createdAttachmentIds: string[] = [];
  const preSourceGuards: D1IntentStatement[] = [{
    sql: `SELECT CASE WHEN EXISTS (
      SELECT 1 FROM estimate_row_items WHERE id = ? AND estimate_id = ? AND row_revision = ?
    ) THEN 1 ELSE json('') END AS project_attachment_source_revision_guard`,
    values: [input.sourceRow.id, input.estimateId, input.sourceRow.row_revision],
  }];
  const postSourceGuards: D1IntentStatement[] = [];
  const mutationStatements: D1IntentStatement[] = [];
  const canonicalOptions = incomingOptions.map((option) => {
    const canonicalAttachments = (draftsByOptionId.get(option.id) ?? []).map((draft) => {
      const binding = bindingById.get(draft.id);
      if (binding?.review_status === "superseded") {
        throw new Error("A superseded project component attachment cannot be restored by reusing its identity.");
      }
      const assetId = binding?.upload_asset_id ?? draft.assetId;
      const asset = assetById.get(assetId);
      const assetProjectId = asset
        ? (asset.project_id ?? readNonEmptyText(readJsonRecord(asset.metadata_json).projectId))
        : null;
      if (
        !asset
        || asset.workspace_id !== project.workspace_id
        || asset.surface !== "component-attachment"
        || asset.status !== "finalized"
        || asset.target_entity_type !== "project-component"
        || asset.target_entity_id !== input.componentId
        || assetProjectId !== input.projectId
        || asset.storage_bucket !== draft.bucket
        || asset.storage_path !== draft.path
        || asset.file_name !== draft.fileName
        || asset.content_type !== draft.contentType
        || readNumber(asset.size_bytes) !== draft.sizeBytes
        || !projectComponentAttachmentScanAllowed(asset, timestamp)
      ) {
        throw new Error("Project component attachment ownership could not be verified.");
      }
      if (!binding && asset.actor_user_id !== input.actorUserId) {
        throw new Error("Project component attachment must be finalized by the current editor.");
      }
      if (binding && (
        binding.price_option_id !== option.id
        || binding.storage_bucket !== draft.bucket
        || binding.storage_path !== draft.path
        || binding.file_name !== draft.fileName
        || binding.content_type !== draft.contentType
        || readNumber(binding.size_bytes) !== draft.sizeBytes
        || binding.attachment_kind !== draft.kind
        || (draft.assetId && draft.assetId !== binding.upload_asset_id)
      )) {
        throw new Error("Project component attachment identity does not match its saved variant.");
      }
      retainedAttachmentIds.add(draft.id);
      postSourceGuards.push({
        sql: `SELECT CASE WHEN EXISTS (
          SELECT 1 FROM estimate_row_items row_item,
            json_each(json_extract(row_item.source_snapshot_json, '$.priceOptions')) price_option,
            json_each(json_extract(price_option.value, '$.attachments')) attachment
          WHERE row_item.id = ? AND row_item.estimate_id = ?
            AND json_extract(price_option.value, '$.id') = ?
            AND json_extract(attachment.value, '$.id') = ?
        ) THEN 1 ELSE json('') END AS project_attachment_option_membership_guard`,
        values: [input.sourceRow.id, input.estimateId, option.id, draft.id],
      });
      if (binding) {
        preSourceGuards.push({
          sql: `SELECT CASE WHEN EXISTS (
            SELECT 1 FROM component_variant_attachments attachment
            INNER JOIN upload_assets asset ON asset.id = attachment.upload_asset_id
            WHERE attachment.id = ? AND attachment.owner_scope = 'project' AND attachment.workspace_id = ?
              AND attachment.project_id = ? AND attachment.project_component_id = ?
              AND attachment.price_option_id = ? AND attachment.review_revision = ?
              AND attachment.review_status <> 'superseded' AND asset.status = 'finalized'
          ) THEN 1 ELSE json('') END AS existing_project_attachment_guard`,
          values: [
            binding.id,
            project.workspace_id,
            input.projectId,
            input.componentId,
            option.id,
            readNumber(binding.review_revision, 1),
          ],
        });
      } else {
        if (!draft.assetId) {
          throw new Error("A finalized upload asset is required for every new project component attachment.");
        }
        createdAttachmentIds.push(draft.id);
        preSourceGuards.push({
          sql: `SELECT CASE WHEN EXISTS (
            SELECT 1 FROM upload_assets
            WHERE id = ? AND workspace_id = ? AND actor_user_id = ? AND surface = 'component-attachment'
              AND target_entity_type = 'project-component' AND target_entity_id = ?
              AND COALESCE(project_id, json_extract(metadata_json, '$.projectId')) = ?
              AND status = 'finalized' AND storage_bucket = ? AND storage_path = ? AND file_name = ?
              AND content_type = ? AND size_bytes = ? AND (
                scan_status IN ('pending', 'clean') OR (
                  scan_status = 'override_approved' AND datetime(scan_override_expires_at) > datetime(?)
                )
              )
          ) THEN 1 ELSE json('') END AS new_project_attachment_guard`,
          values: [
            draft.assetId,
            project.workspace_id,
            input.actorUserId,
            input.componentId,
            input.projectId,
            draft.bucket,
            draft.path,
            draft.fileName,
            draft.contentType,
            draft.sizeBytes,
            timestamp,
          ],
        });
        mutationStatements.push({
          sql: `INSERT INTO component_variant_attachments (
            id, owner_scope, price_option_id, item_id, project_id, project_component_id, workspace_id,
            upload_asset_id, storage_bucket, storage_path, file_name, content_type, size_bytes,
            attachment_kind, metadata_json, created_by, review_status, applicable_cost_entry_id,
            is_current_approved, review_revision, created_at, updated_at
          ) VALUES (?, 'project', ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'uploaded', NULL, 0, 1, ?, ?)`,
          values: [
            draft.id,
            option.id,
            input.projectId,
            input.componentId,
            project.workspace_id,
            draft.assetId,
            draft.bucket,
            draft.path,
            draft.fileName,
            draft.contentType,
            draft.sizeBytes,
            draft.kind,
            jsonString({ ...draft.metadata, assetId: draft.assetId, scanStatus: asset.scan_status }),
            input.actorUserId,
            timestamp,
            timestamp,
          ],
        });
      }
      const bindingMetadata = binding ? readJsonRecord(binding.metadata_json) : draft.metadata;
      return {
        id: draft.id,
        assetId,
        bucket: draft.bucket,
        path: draft.path,
        fileName: draft.fileName,
        contentType: draft.contentType,
        sizeBytes: draft.sizeBytes,
        kind: draft.kind,
        scanStatus: asset.scan_status,
        reviewStatus: binding?.review_status ?? "uploaded",
        isCurrentApproved: binding ? Number(binding.is_current_approved) === 1 : false,
        metadata: { ...bindingMetadata, assetId, scanStatus: asset.scan_status },
        createdAt: binding?.created_at ?? timestamp,
      };
    });
    return { ...option, attachments: canonicalAttachments };
  });
  const staleBindings = existingBindings.filter((binding) => (
    binding.review_status !== "superseded" && !retainedAttachmentIds.has(binding.id)
  ));
  for (const binding of staleBindings) {
    mutationStatements.push({
      sql: `UPDATE component_variant_attachments
        SET review_status = 'superseded', is_current_approved = 0, reviewed_by = ?, reviewed_at = ?,
          review_note = 'Removed from project component variant', review_revision = review_revision + 1, updated_at = ?
        WHERE id = ? AND owner_scope = 'project' AND workspace_id = ? AND project_id = ?
          AND project_component_id = ? AND review_revision = ? AND review_status <> 'superseded'`,
      values: [
        input.actorUserId,
        timestamp,
        timestamp,
        binding.id,
        project.workspace_id,
        input.projectId,
        input.componentId,
        readNumber(binding.review_revision, 1),
      ],
    }, {
      sql: `UPDATE upload_assets SET status = 'removed', updated_at = ?
        WHERE id = ? AND NOT EXISTS (
          SELECT 1 FROM component_variant_attachments
          WHERE upload_asset_id = ? AND review_status <> 'superseded'
        )`,
      values: [timestamp, binding.upload_asset_id, binding.upload_asset_id],
    });
  }
  return {
    active: true,
    changed: createdAttachmentIds.length > 0 || staleBindings.length > 0,
    canonicalRowPatch: {
      ...input.rowPatch,
      sourceSnapshot: { ...incomingSourceSnapshot, priceOptions: canonicalOptions },
    },
    preSourceGuards,
    postSourceGuards,
    mutationStatements,
    createdAttachmentIds,
    supersededAttachmentIds: staleBindings.map((binding) => binding.id),
  };
}

function planRowPatchMutation(
  row: EstimateRowRecord,
  estimateId: string,
  rowPatch: Record<string, unknown>,
  expectedRowRevision: number,
) {
  if (row.row_revision !== expectedRowRevision) throw new Error(ESTIMATE_ROW_REVISION_CONFLICT_CODE);
  const mergedRowPatch = mergeSourceSnapshotPatchIntoRow(row, rowPatch);
  const sourceLinkState = normalizeEstimateRowSourceLinkState(
    Object.hasOwn(mergedRowPatch, "sourceLibraryItemId")
      ? mergedRowPatch.sourceLibraryItemId
      : row.source_library_item_id,
    Object.hasOwn(mergedRowPatch, "linkState") ? mergedRowPatch.linkState : row.link_state,
  );
  const effectiveRowPatch = {
    ...mergedRowPatch,
    ...(Object.hasOwn(mergedRowPatch, "sourceLibraryItemId")
      ? { sourceLibraryItemId: sourceLinkState.sourceLibraryItemId }
      : {}),
    ...(Object.hasOwn(mergedRowPatch, "linkState") ? { linkState: sourceLinkState.linkState } : {}),
  };
  const columns = updateValuesForRowPatch(effectiveRowPatch);
  if (columns.length === 0) return null;
  const nextRevision = expectedRowRevision + 1;
  const assignments = columns.map(([column]) => `${column} = ?`);
  const values = columns.map(([, value]) => value);
  assignments.push("row_revision = ?", "updated_at = ?");
  values.push(nextRevision, nowIso(), row.id, estimateId, expectedRowRevision);
  return {
    columns,
    effectiveRowPatch,
    statement: {
      sql: `UPDATE estimate_row_items SET ${assignments.join(", ")} WHERE id = ? AND estimate_id = ? AND row_revision = ?`,
      values,
    } satisfies D1IntentStatement,
    updated: applyRowPatchForActivity(row, effectiveRowPatch, nextRevision),
  };
}

async function readRowById(database: D1DatabaseLike, estimateId: string, rowId: string) {
  const row = await firstD1Row<Record<string, unknown>>(
    database,
    `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND id = ? LIMIT 1`,
    [estimateId, rowId],
  );
  return row ? serializeRow(row) : null;
}

async function readExistingHistoryEvent(database: D1DatabaseLike, estimateId: string, correlationId: string) {
  const event = await firstD1Row<ExistingEstimateEventRow>(
    database,
    `SELECT id, event_type, target_row_id, payload
     FROM estimate_sheet_events
     WHERE estimate_id = ? AND correlation_id = ?
     LIMIT 1`,
    [estimateId, correlationId],
  );
  return event ? { ...event, payload: readJson(event.payload, {}) } : null;
}

type EstimateDestinationNodeRow = {
  id: string;
  estimate_tab_id: string | null;
  kind: string;
  archived_at: string | null;
  linked_instance_destination: boolean | number;
};

async function validateEstimateDestinationNodes(
  database: D1DatabaseLike,
  estimateId: string,
  nodeIds: readonly string[],
  activeTabId?: string | null,
) {
  const uniqueNodeIds = [...new Set(nodeIds.filter(Boolean))];
  if (uniqueNodeIds.length === 0) throw new Error("An estimate row destination is required.");
  const nodes = await allD1Rows<EstimateDestinationNodeRow>(
    database,
    `SELECT node.id, node.estimate_tab_id, node.kind, tab.archived_at,
            EXISTS (
              SELECT 1
              FROM estimate_template_instance_nodes AS mapping
              INNER JOIN estimate_template_instances AS instance
                ON instance.id = mapping.instance_id
               AND instance.workspace_id = mapping.workspace_id
               AND instance.estimate_id = mapping.estimate_id
              WHERE mapping.estimate_id = node.estimate_id
                AND mapping.estimate_node_id = node.id
                AND instance.link_state IN ('linked', 'updating', 'failed')
            ) AS linked_instance_destination
     FROM estimate_nodes node
     LEFT JOIN estimate_tabs tab ON tab.id = node.estimate_tab_id AND tab.estimate_id = node.estimate_id
     WHERE node.estimate_id = ? AND node.id IN (${placeholders(uniqueNodeIds)})`,
    [estimateId, ...uniqueNodeIds],
  );
  if (nodes.length !== uniqueNodeIds.length) {
    throw new Error("Estimate row destination was not found in the current estimate.");
  }
  for (const node of nodes) {
    if (!["group", "area"].includes(node.kind)) throw new Error("Estimate row destination kind is invalid.");
    if (node.estimate_tab_id && node.archived_at !== null) {
      throw new Error("Estimate rows cannot be moved into an archived tab.");
    }
    if (activeTabId && node.estimate_tab_id !== activeTabId) {
      throw new Error("Estimate rows cannot move across tabs.");
    }
    if (Boolean(node.linked_instance_destination)) {
      throw new Error("Linked Template content must be edited from its source Template.");
    }
  }
  return {
    nodes,
    guard: {
      sql: `SELECT CASE WHEN (
        SELECT COUNT(*)
        FROM estimate_nodes node
        LEFT JOIN estimate_tabs tab ON tab.id = node.estimate_tab_id AND tab.estimate_id = node.estimate_id
        WHERE node.estimate_id = ?
          AND node.id IN (${placeholders(uniqueNodeIds)})
          AND node.kind IN ('group', 'area')
          AND (node.estimate_tab_id IS NULL OR (tab.id IS NOT NULL AND tab.archived_at IS NULL))
          AND (? IS NULL OR node.estimate_tab_id = ?)
          AND NOT EXISTS (
            SELECT 1
            FROM estimate_template_instance_nodes AS mapping
            INNER JOIN estimate_template_instances AS instance
              ON instance.id = mapping.instance_id
             AND instance.workspace_id = mapping.workspace_id
             AND instance.estimate_id = mapping.estimate_id
            WHERE mapping.estimate_id = node.estimate_id
              AND mapping.estimate_node_id = node.id
              AND instance.link_state IN ('linked', 'updating', 'failed')
          )
      ) = ? THEN 1 ELSE json('') END AS estimate_destination_guard`,
      values: [estimateId, ...uniqueNodeIds, activeTabId ?? null, activeTabId ?? null, uniqueNodeIds.length],
    } satisfies D1IntentStatement,
  };
}

async function validateRowsOutsideActiveTemplateInstances(
  database: D1DatabaseLike,
  estimateId: string,
  rowIds: readonly string[],
) {
  const uniqueRowIds = [...new Set(rowIds.filter(Boolean))];
  const mapping = await firstD1Row<{ instance_id: string }>(
    database,
    `SELECT mapping.instance_id
     FROM estimate_template_instance_rows AS mapping
     INNER JOIN estimate_template_instances AS instance
       ON instance.id = mapping.instance_id
      AND instance.workspace_id = mapping.workspace_id
      AND instance.estimate_id = mapping.estimate_id
     WHERE mapping.estimate_id = ?
       AND mapping.estimate_row_item_id IN (SELECT value FROM json_each(?))
       AND instance.link_state IN ('linked', 'updating', 'failed')
     LIMIT 1`,
    [estimateId, JSON.stringify(uniqueRowIds)],
  );
  if (mapping) {
    throw new Error("Linked Template rows must be changed from the source Template or detached first.");
  }
  return {
    sql: `SELECT CASE WHEN NOT EXISTS (
      SELECT 1
      FROM estimate_template_instance_rows AS mapping
      INNER JOIN estimate_template_instances AS instance
        ON instance.id = mapping.instance_id
       AND instance.workspace_id = mapping.workspace_id
       AND instance.estimate_id = mapping.estimate_id
      WHERE mapping.estimate_id = ?
        AND mapping.estimate_row_item_id IN (SELECT value FROM json_each(?))
        AND instance.link_state IN ('linked', 'updating', 'failed')
    ) THEN 1 ELSE json('') END AS estimate_template_row_ownership_guard`,
    values: [estimateId, JSON.stringify(uniqueRowIds)],
  } satisfies D1IntentStatement;
}

function buildEstimateNodeTabGuardStatement(
  estimateId: string,
  nodeIds: readonly string[],
  expectedTabId: string | null,
): D1IntentStatement {
  const uniqueNodeIds = [...new Set(nodeIds.filter(Boolean))];
  if (uniqueNodeIds.length === 0) throw new Error("Estimate row topology guard requires at least one node.");
  return {
    sql: `SELECT CASE WHEN (
      SELECT COUNT(*)
      FROM estimate_nodes
      WHERE estimate_id = ? AND id IN (${placeholders(uniqueNodeIds)}) AND estimate_tab_id IS ?
    ) = ? THEN 1 ELSE json('') END AS estimate_node_tab_guard`,
    values: [estimateId, ...uniqueNodeIds, expectedTabId, uniqueNodeIds.length],
  };
}

type ExpectedRowRevision = { rowId: string; rowRevision: number };

function buildRowRevisionGuardStatement(
  estimateId: string,
  expectedRows: readonly ExpectedRowRevision[],
): D1IntentStatement {
  if (expectedRows.length === 0) throw new Error("Estimate row revision guard requires at least one row.");
  const conditions = expectedRows.map(() => "(id = ? AND row_revision = ?)").join(" OR ");
  return {
    sql: `SELECT CASE WHEN (
      SELECT COUNT(*) FROM estimate_row_items WHERE estimate_id = ? AND (${conditions})
    ) = ? THEN 1 ELSE json('') END AS estimate_row_revision_guard`,
    values: [estimateId, ...expectedRows.flatMap((row) => [row.rowId, row.rowRevision]), expectedRows.length],
  };
}

function rowRevisionConflictResult(
  rows: readonly EstimateRowRecord[],
  expectedRows: readonly ExpectedRowRevision[],
): EstimateRowRevisionConflictResult {
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  const conflictRowIds = expectedRows
    .filter((expected) => readNumber(rowsById.get(expected.rowId)?.row_revision, 0) !== expected.rowRevision)
    .map((expected) => expected.rowId);
  return {
    status: "conflict",
    conflictRowIds,
    authoritativeRows: rows.map((row) => rowItemHistoryResult(row).row),
  };
}

function hasRowRevisionConflict(rows: readonly EstimateRowRecord[], expectedRows: readonly ExpectedRowRevision[]) {
  return rowRevisionConflictResult(rows, expectedRows).conflictRowIds.length > 0;
}

export async function getEstimateRowForProject(
  database: D1DatabaseLike,
  input: { projectId: string; estimateId: string; rowId: string },
): Promise<EstimateRowRecord | null> {
  const row = await firstD1Row<Record<string, unknown>>(
    database,
    `SELECT row_item.*
     FROM estimate_row_items row_item
     JOIN estimates estimate ON estimate.id = row_item.estimate_id
     WHERE row_item.id = ? AND row_item.estimate_id = ? AND estimate.project_id = ?
     LIMIT 1`,
    [input.rowId, input.estimateId, input.projectId],
  );
  return row ? serializeRow(row) : null;
}

export async function insertEstimateRowItemWithHistory(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: RowMutationScope & {
    nodeId: string;
    activeTabId: string | null;
    rowPayload: Record<string, unknown>;
    librarySource?: EstimateRowItem;
  },
): Promise<EstimateRowHistoryResult> {
  await assertScopedEstimate(database, actor, input);
  if (!database.batch) throw new Error("Atomic estimate row insertion is unavailable.");
  if (input.librarySource) await readCurrentLibrarySourceReceipt(database, input.librarySource);
  const payload = readJsonRecord(input.rowPayload);
  const { context: intent, committedResult } = await prepareEstimateMutationIntent<EstimateRowHistoryResult>(
    database,
    actor,
    {
      projectId: input.projectId,
      estimateId: input.estimateId,
      correlationId: input.correlationId,
      commandKind: "estimate.row.insert",
      request: {
        projectId: input.projectId,
        estimateId: input.estimateId,
        nodeId: input.nodeId,
        activeTabId: input.activeTabId,
        payload,
      },
    },
  );
  if (committedResult) return committedResult;
  const existingEvent = await readExistingHistoryEvent(database, input.estimateId, intent.intentId);
  if (existingEvent) {
    const existingPayload = readJsonRecord(existingEvent.payload);
    const existingRowId = String(existingEvent.target_row_id ?? existingPayload.rowId ?? payload.id ?? "");
    const existingRow = existingRowId ? await readRowById(database, input.estimateId, existingRowId) : null;
    if (!existingRow) throw new Error("Idempotent estimate row insert event exists but the row is missing.");
    return rowItemHistoryResult(existingRow, existingEvent.id);
  }
  const destination = await validateEstimateDestinationNodes(
    database,
    input.estimateId,
    [input.nodeId],
    input.activeTabId,
  );
  const sort = await firstD1Row<{ max_sort_order: number | null }>(
    database,
    "SELECT MAX(sort_order) AS max_sort_order FROM estimate_row_items WHERE estimate_id = ? AND node_id = ?",
    [input.estimateId, input.nodeId],
  );
  const expectedMaxSortOrder = sort?.max_sort_order === null || sort?.max_sort_order === undefined
    ? -1000
    : readNumber(sort.max_sort_order, -1000);
  const rowId = typeof payload.id === "string" && payload.id ? payload.id : randomUUID();
  const insert = buildRowInsertStatement({
    id: rowId,
    estimate_id: input.estimateId,
    node_id: input.nodeId,
    source_library_item_id: payload.sourceLibraryItemId ?? null,
    source_snapshot: payload.sourceSnapshot ?? {},
    category_node_id: payload.categoryNodeId ?? null,
    supplier_id: payload.supplierId ?? null,
    material: payload.material ?? "",
    description: payload.description ?? "",
    supplier: payload.supplier ?? "",
    unit: payload.unit ?? "unit",
    quantity: readNumber(payload.quantity, 1),
    quantity_base: payload.quantityBase ?? null,
    quantity_contingency_amount: payload.quantityContingencyAmount ?? null,
    unit_cost: readNumber(payload.unitCost),
    contingency_percentage: readNumber(payload.contingencyPercentage),
    adjustment_percentage: readNumber(payload.adjustmentPercentage),
    misc_cost: readNumber(payload.miscCost),
    discipline: payload.discipline ?? "",
    designation: payload.designation ?? "",
    metadata: payload.metadata ?? {},
    link_state: payload.linkState ?? "unlinked",
    pricing_provenance_origin: payload.pricingProvenanceOrigin ?? "missing",
    sort_order: expectedMaxSortOrder + 1000,
  });
  const insertedRow = insert.record;
  const occurredAt = nowIso();
  const activationStatements: D1PreparedStatementLike[] = [];
  const rowIntent = validateActivationProducerIntent({
    domainMutationId: rowId,
    estimateId: input.estimateId,
    milestone: "first_row_priced",
    occurredAt,
    projectId: input.projectId,
    source: "estimate",
    userId: intent.actorUserId,
    workspaceId: intent.workspaceId,
  });
  if (rowIntent.status !== "accepted") throw new Error("Activation priced row intent is invalid.");
  activationStatements.push(prepareActivationOutboxIntent(database, {
    domainMutationId: rowId,
    dedupeKey: rowIntent.dedupeKey,
    estimateId: input.estimateId,
    milestone: "first_row_priced",
    occurredAt,
    projectId: input.projectId,
    source: "estimate",
    userId: intent.actorUserId,
    workspaceId: intent.workspaceId,
  }));
  const insertedRowTotalMinorUnits = estimateRowTotalMinorUnits(insertedRow);
  if (insertedRowTotalMinorUnits > 0) {
    const totalIntent = validateActivationProducerIntent({
      domainMutationId: rowId,
      estimateId: input.estimateId,
      milestone: "first_valid_total",
      occurredAt,
      projectId: input.projectId,
      source: "estimate",
      userId: intent.actorUserId,
      workspaceId: intent.workspaceId,
    });
    if (totalIntent.status !== "accepted") throw new Error("Activation valid total intent is invalid.");
    activationStatements.push(prepareActivationOutboxIntent(database, {
      domainMutationId: rowId,
      dedupeKey: totalIntent.dedupeKey,
      estimateId: input.estimateId,
      milestone: "first_valid_total",
      occurredAt,
      projectId: input.projectId,
      source: "estimate",
      userId: intent.actorUserId,
      workspaceId: intent.workspaceId,
    }));
  }
  const history = await prepareHistoryEventInsert(database, {
    projectId: input.projectId,
    estimateId: input.estimateId,
    workspaceId: intent.workspaceId,
    estimateNodeId: input.nodeId,
    targetRowId: rowId,
    eventType: "row_inserted",
    actorUserId: intent.actorUserId,
    correlationId: intent.intentId,
    newSnapshot: insert.persistenceRecord,
    rowContext: { material: insertedRow.material, supplier: insertedRow.supplier },
    payload: { rowId },
    totalDelta: minorUnitsToAmount(insertedRowTotalMinorUnits),
  });
  const result = rowItemHistoryResult(insertedRow, history.eventId);
  const statements: D1IntentStatement[] = [
    destination.guard,
    {
      sql: `SELECT CASE WHEN COALESCE((
        SELECT MAX(sort_order) FROM estimate_row_items WHERE estimate_id = ? AND node_id = ?
      ), -1000) = ? THEN 1 ELSE json('') END AS estimate_row_order_guard`,
      values: [input.estimateId, input.nodeId, expectedMaxSortOrder],
    },
    { sql: insert.sql, values: insert.values },
    buildProjectPublicationRevisionForEstimate(input.projectId, intent.workspaceId, input.estimateId),
  ];
  if (history.statement) statements.push(history.statement, history.outboxStatement);
  statements.push(buildEstimateMutationReceiptStatement(intent, "estimate_row_item", rowId, result, occurredAt));
  assertD1MutationStatementLimit(statements.length + activationStatements.length);
  try {
    await runPreparedD1Batch(database, statements, activationStatements);
  } catch (error) {
    const concurrentReceipt = await readConcurrentEstimateMutationReceipt<EstimateRowHistoryResult>(database, intent);
    if (concurrentReceipt) return concurrentReceipt;
    throw error;
  }
  const row = await readRowById(database, input.estimateId, rowId);
  if (!row) throw new Error("Estimate row item was not created.");
  return rowItemHistoryResult(row, history.eventId);
}

export async function duplicateEstimateRowItemWithHistory(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: RowMutationScope & {
    sourceRowId: string;
    expectedSourceRowRevision: number;
    targetNodeId: string;
    activeTabId: string | null;
    duplicatedRowId: string;
  },
): Promise<EstimateRowHistoryResult> {
  if (!database.batch) throw new Error("Atomic estimate row duplication is unavailable.");
  if (!input.sourceRowId || !input.targetNodeId || !input.duplicatedRowId) {
    throw new Error("Estimate row duplication identity is incomplete.");
  }
  if (!Number.isInteger(input.expectedSourceRowRevision) || input.expectedSourceRowRevision < 1) {
    throw new Error("Estimate row duplication requires the current source revision.");
  }
  const { context: intent, committedResult } = await prepareEstimateMutationIntent<EstimateRowHistoryResult & { sourceRowId?: string }>(
    database,
    actor,
    {
      projectId: input.projectId,
      estimateId: input.estimateId,
      correlationId: input.correlationId,
      commandKind: "estimate.row.duplicate",
      request: input,
    },
  );
  if (committedResult) return committedResult;
  const sourceRow = await readRowById(database, input.estimateId, input.sourceRowId);
  if (!sourceRow) throw new Error("Estimate row item to duplicate was not found in the current project.");
  if (readNumber(sourceRow.row_revision, 1) !== input.expectedSourceRowRevision) {
    throw new Error(ESTIMATE_ROW_REVISION_CONFLICT_CODE);
  }
  if (sourceRow.node_id !== input.targetNodeId) {
    throw new Error("Estimate row duplication target changed. Refresh and try again.");
  }
  const ownershipGuard = await validateRowsOutsideActiveTemplateInstances(
    database,
    input.estimateId,
    [input.sourceRowId],
  );
  const destination = await validateEstimateDestinationNodes(
    database,
    input.estimateId,
    [input.targetNodeId],
    input.activeTabId,
  );
  const sort = await firstD1Row<{ max_sort_order: number | null }>(
    database,
    "SELECT MAX(sort_order) AS max_sort_order FROM estimate_row_items WHERE estimate_id = ? AND node_id = ?",
    [input.estimateId, input.targetNodeId],
  );
  const expectedMaxSortOrder = sort?.max_sort_order === null || sort?.max_sort_order === undefined
    ? -1000
    : readNumber(sort.max_sort_order, -1000);
  const timestamp = nowIso();
  const insert = buildRowInsertStatement({
    id: input.duplicatedRowId,
    estimate_id: input.estimateId,
    node_id: input.targetNodeId,
    description: sourceRow.description ?? "",
    designation: sourceRow.designation ?? "",
    discipline: sourceRow.discipline ?? "",
    material: sourceRow.material ?? "",
    supplier: sourceRow.supplier ?? "",
    supplier_id: sourceRow.supplier_id,
    quantity: sourceRow.quantity,
    quantity_base: sourceRow.quantity_base,
    quantity_contingency_amount: sourceRow.quantity_contingency_amount,
    unit: sourceRow.unit ?? "",
    unit_cost: sourceRow.unit_cost,
    misc_cost: sourceRow.misc_cost,
    contingency_percentage: sourceRow.contingency_percentage,
    adjustment_percentage: sourceRow.adjustment_percentage,
    source_snapshot: sourceRow.source_snapshot ?? {},
    sort_order: expectedMaxSortOrder + 1000,
    row_revision: 1,
    category_node_id: sourceRow.category_node_id,
    source_library_item_id: sourceRow.source_library_item_id,
    link_state: sourceRow.link_state,
    metadata: sourceRow.metadata,
    pricing_provenance_origin: sourceRow.pricing_provenance_origin ?? "missing",
    created_at: timestamp,
    updated_at: timestamp,
  });
  const duplicatedRow = insert.record;
  const history = await prepareHistoryEventInsert(database, {
    projectId: input.projectId,
    estimateId: input.estimateId,
    workspaceId: intent.workspaceId,
    estimateNodeId: input.targetNodeId,
    targetRowId: input.duplicatedRowId,
    eventType: "row_duplicated",
    actorUserId: intent.actorUserId,
    correlationId: intent.intentId,
    newSnapshot: insert.persistenceRecord,
    rowContext: { material: duplicatedRow.material, supplier: duplicatedRow.supplier },
    payload: { sourceRowId: input.sourceRowId, duplicatedRowId: input.duplicatedRowId },
    totalDelta: minorUnitsToAmount(estimateRowTotalMinorUnits(duplicatedRow)),
  });
  const result = {
    ...rowItemHistoryResult(duplicatedRow, history.eventId),
    sourceRowId: input.sourceRowId,
  };
  const activationStatements: D1PreparedStatementLike[] = [];
  for (const milestone of ["first_row_priced", "first_valid_total"] as const) {
    if (milestone === "first_valid_total" && estimateRowTotalMinorUnits(duplicatedRow) <= 0) continue;
    const activationIntent = validateActivationProducerIntent({
      domainMutationId: input.duplicatedRowId,
      estimateId: input.estimateId,
      milestone,
      occurredAt: timestamp,
      projectId: input.projectId,
      source: "estimate",
      userId: intent.actorUserId,
      workspaceId: intent.workspaceId,
    });
    if (activationIntent.status !== "accepted") throw new Error("Activation duplicated row intent is invalid.");
    activationStatements.push(prepareActivationOutboxIntent(database, {
      domainMutationId: input.duplicatedRowId,
      dedupeKey: activationIntent.dedupeKey,
      estimateId: input.estimateId,
      milestone,
      occurredAt: timestamp,
      projectId: input.projectId,
      source: "estimate",
      userId: intent.actorUserId,
      workspaceId: intent.workspaceId,
    }));
  }
  const statements: D1IntentStatement[] = [
    destination.guard,
    ownershipGuard,
    buildRowRevisionGuardStatement(input.estimateId, [{
      rowId: input.sourceRowId,
      rowRevision: input.expectedSourceRowRevision,
    }]),
    {
      sql: `SELECT CASE WHEN COALESCE((
        SELECT MAX(sort_order) FROM estimate_row_items WHERE estimate_id = ? AND node_id = ?
      ), -1000) = ? THEN 1 ELSE json('') END AS estimate_row_duplicate_order_guard`,
      values: [input.estimateId, input.targetNodeId, expectedMaxSortOrder],
    },
    { sql: insert.sql, values: insert.values },
    buildProjectPublicationRevisionForEstimate(input.projectId, intent.workspaceId, input.estimateId),
  ];
  if (history.statement) statements.push(history.statement, history.outboxStatement);
  statements.push(buildEstimateMutationReceiptStatement(
    intent,
    "estimate_row_item",
    input.duplicatedRowId,
    result,
    timestamp,
  ));
  assertD1MutationStatementLimit(statements.length + activationStatements.length);
  try {
    await runPreparedD1Batch(database, statements, activationStatements);
  } catch (error) {
    const concurrentReceipt = await readConcurrentEstimateMutationReceipt<typeof result>(database, intent);
    if (concurrentReceipt) return concurrentReceipt;
    const authoritativeSource = await readRowById(database, input.estimateId, input.sourceRowId);
    if (!authoritativeSource || readNumber(authoritativeSource.row_revision, 1) !== input.expectedSourceRowRevision) {
      throw new Error(ESTIMATE_ROW_REVISION_CONFLICT_CODE);
    }
    throw error;
  }
  const authoritativeRow = await readRowById(database, input.estimateId, input.duplicatedRowId);
  if (!authoritativeRow) throw new Error("Duplicated estimate row could not be reloaded.");
  return {
    ...rowItemHistoryResult(authoritativeRow, history.eventId),
    sourceRowId: input.sourceRowId,
  };
}

async function patchEstimateRowItem(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: RowMutationScope & {
    rowId: string;
    expectedRowRevision: number | null;
    componentMutationIntent?: "variant-selection";
    expectedComponentImpactFingerprint?: string;
    removedPriceOptionReplacements?: Record<string, string>;
  },
  eventType: "row_updated" | "row_replaced",
  rowPatch: Record<string, unknown>,
  expectedLibrarySourceReceipt: LibrarySourceCommitReceipt | null,
): Promise<EstimateRowHistoryResult> {
  const { context: intent, committedResult } = await prepareEstimateMutationIntent<EstimateRowHistoryResult>(
    database,
    actor,
    {
      projectId: input.projectId,
      estimateId: input.estimateId,
      correlationId: input.correlationId,
      commandKind: eventType === "row_replaced" ? "estimate.row.replace" : "estimate.row.update",
      request: {
        projectId: input.projectId,
        estimateId: input.estimateId,
        rowId: input.rowId,
        eventType,
        expectedRowRevision: input.expectedRowRevision,
        rowPatch,
        componentMutationIntent: input.componentMutationIntent ?? null,
        expectedComponentImpactFingerprint: input.expectedComponentImpactFingerprint ?? null,
        removedPriceOptionReplacements: input.removedPriceOptionReplacements ?? null,
        expectedLibrarySourceReceipt,
      },
    },
  );
  if (committedResult) return committedResult;
  const existingEvent = await readExistingHistoryEvent(database, input.estimateId, intent.intentId);
  if (existingEvent) {
    const existingRow = await readRowById(database, input.estimateId, input.rowId);
    if (!existingRow) throw new Error("Idempotent estimate row update event exists but the row is missing.");
    return rowItemHistoryResult(existingRow, existingEvent.id);
  }
  const row = await readRowById(database, input.estimateId, input.rowId);
  if (!row) throw new Error("Estimate row item not found in the current project.");
  const linkedTemplateMapping = await firstD1Row<{ instance_id: string }>(
    database,
    `SELECT mapping.instance_id
     FROM estimate_template_instance_rows AS mapping
     INNER JOIN estimate_template_instances AS instance
       ON instance.id = mapping.instance_id
      AND instance.workspace_id = mapping.workspace_id
      AND instance.estimate_id = mapping.estimate_id
     WHERE mapping.estimate_id = ? AND mapping.estimate_row_item_id = ?
       AND instance.link_state IN ('linked', 'updating', 'failed')
     LIMIT 1`,
    [input.estimateId, input.rowId],
  );
  const linkedInstanceOwnedFields = new Set([
    "quantity",
    "quantityBase",
    "quantityContingencyAmount",
    "contingencyPercentage",
    "adjustmentPercentage",
  ]);
  if (linkedTemplateMapping) {
    const sharedFields = Object.keys(rowPatch).filter((field) => (
      field !== "linkState" && !linkedInstanceOwnedFields.has(field)
    ));
    if (eventType === "row_replaced" || input.componentMutationIntent || sharedFields.length > 0) {
      throw new Error("This row is owned by a linked Template. Detach the instance before changing shared fields.");
    }
    delete rowPatch.linkState;
  }
  const expected = input.expectedRowRevision === null ? row.row_revision : input.expectedRowRevision;
  const removedPriceOptionReplacements = readRemovedPriceOptionReplacements(input.removedPriceOptionReplacements);
  if (input.componentMutationIntent && input.componentMutationIntent !== "variant-selection") {
    throw new Error("Unsupported component mutation intent.");
  }
  const selectingProjectComponentVariant = input.componentMutationIntent === "variant-selection";
  if (selectingProjectComponentVariant && (eventType !== "row_updated" || row.source_library_item_id)) {
    throw new Error("Variant selection is only available for project component rows.");
  }
  const normalizedRowPatch = selectingProjectComponentVariant
    ? normalizeProjectComponentVariantSelectionRowPatch(row, rowPatch)
    : eventType === "row_updated" && !row.source_library_item_id
      ? normalizeProjectComponentSourceRowPatch(row, rowPatch, removedPriceOptionReplacements)
      : rowPatch;
  const componentId = getProjectComponentIdentity(row.metadata, null, row.source_snapshot);
  const attachmentPlan = eventType === "row_updated" && !row.source_library_item_id && !selectingProjectComponentVariant
    ? await planProjectComponentAttachmentReconciliation(database, {
        projectId: input.projectId,
        estimateId: input.estimateId,
        sourceRow: row,
        componentId,
        rowPatch: normalizedRowPatch,
        actorUserId: intent.actorUserId,
      })
    : {
        active: false,
        changed: false,
        canonicalRowPatch: normalizedRowPatch,
        preSourceGuards: [] as D1IntentStatement[],
        postSourceGuards: [] as D1IntentStatement[],
        mutationStatements: [] as D1IntentStatement[],
        createdAttachmentIds: [] as string[],
        supersededAttachmentIds: [] as string[],
      };
  const rowPatchPlan = planRowPatchMutation(row, input.estimateId, attachmentPlan.canonicalRowPatch, expected);
  if (!rowPatchPlan) return rowItemHistoryResult(row);
  const { columns, effectiveRowPatch, statement, updated } = rowPatchPlan;
  const replacementSourceId = eventType === "row_replaced" ? updated.source_library_item_id : null;
  if (eventType === "row_replaced") {
    if (replacementSourceId) {
      if (
        !expectedLibrarySourceReceipt
        || expectedLibrarySourceReceipt.sourceLibraryItemId !== replacementSourceId
        || expectedLibrarySourceReceipt.workspaceId !== intent.workspaceId
        || expectedLibrarySourceReceipt.resolvedUnit !== updated.unit
        || expectedLibrarySourceReceipt.resolvedUnitCost !== updated.unit_cost
        || expectedLibrarySourceReceipt.resolvedMiscCost !== updated.misc_cost
      ) {
        throw new Error("Library source changed. Refresh the estimate before replacing this row.");
      }
    } else if (expectedLibrarySourceReceipt) {
      throw new Error("Unlinked row replacements cannot retain a Library source receipt.");
    }
  }
  const librarySourceGuards = expectedLibrarySourceReceipt
    ? buildLibrarySourceCommitGuardStatements(expectedLibrarySourceReceipt)
    : [];
  const expectedImpactFingerprint = !selectingProjectComponentVariant
    ? input.expectedComponentImpactFingerprint
    : undefined;
  const propagation = eventType === "row_updated" && !row.source_library_item_id && !selectingProjectComponentVariant
    ? await propagateProjectComponentRowPatch(database, {
        projectId: input.projectId,
        sourceRow: row,
        rowPatch: effectiveRowPatch,
        componentId,
        expectedImpactFingerprint,
        removedPriceOptionReplacements,
      })
    : {
        rowIds: [] as string[],
        totalDeltaMinorUnits: 0,
        facts: [] as Array<Record<string, unknown>>,
        truncatedCount: 0,
        mutationStatements: [] as D1IntentStatement[],
        impactFingerprint: null as string | null,
      };
  if (!database.batch) throw new Error("Atomic estimate row mutation is unavailable.");
  if ((propagation.rowIds.length > 0 || attachmentPlan.active)
    && !await canEditProject(database, actor, input.projectId)) {
    throw new Error("Project edit access is required to update a component used across estimates.");
  }
  const previousVariant = getVariantActivityIdentity(row);
  const nextVariant = getVariantActivityIdentity(updated);
  const changedFields = columns.map(([column]) => column);
  if (variantsDiffer(previousVariant, nextVariant)) changedFields.push("variant_changed");
  if (attachmentPlan.changed) changedFields.push("component_variant_attachments");
  const persistedImpactFingerprint = expectedImpactFingerprint ?? propagation.impactFingerprint;
  const mutationStatements: D1IntentStatement[] = [
    buildRowRevisionGuardStatement(input.estimateId, [{ rowId: input.rowId, rowRevision: expected }]),
    ...(persistedImpactFingerprint ? [buildProjectComponentImpactGuardStatement({
      projectId: input.projectId,
      sourceRowId: input.rowId,
      componentId,
      expectedFingerprint: persistedImpactFingerprint,
    })] : []),
    ...librarySourceGuards,
    ...attachmentPlan.preSourceGuards,
    statement,
    ...attachmentPlan.postSourceGuards,
    ...attachmentPlan.mutationStatements,
    ...propagation.mutationStatements,
  ];
  if (mutationStatements.length + 4 > D1_MAX_BATCH_STATEMENTS) {
    throw new Error("Component propagation is too large to persist atomically with activity history.");
  }
  const history = await prepareHistoryEventInsert(database, {
    projectId: input.projectId,
    estimateId: input.estimateId,
    workspaceId: intent.workspaceId,
    estimateNodeId: updated.node_id,
    targetRowId: input.rowId,
    eventType,
    actorUserId: intent.actorUserId,
    correlationId: intent.intentId,
    changedFields,
    oldSnapshot: row,
    newSnapshot: updated,
    rowContext: { material: updated.material, supplier: updated.supplier },
    payload: {
      rowId: input.rowId,
      variant: variantsDiffer(previousVariant, nextVariant) ? { previous: previousVariant, next: nextVariant } : null,
      propagatedRowIds: propagation.rowIds,
      propagatedRowCount: propagation.rowIds.length,
      propagatedRowFacts: propagation.facts,
      propagatedRowFactsTruncated: propagation.truncatedCount,
      attachments: attachmentPlan.active ? {
        createdAttachmentIds: attachmentPlan.createdAttachmentIds,
        supersededAttachmentIds: attachmentPlan.supersededAttachmentIds,
      } : null,
    },
    totalDelta: minorUnitsToAmount(
      estimateRowTotalMinorUnits(updated) - estimateRowTotalMinorUnits(row) + propagation.totalDeltaMinorUnits,
    ),
  });
  const result = rowItemHistoryResult(updated, history.eventId);
  const statements: D1IntentStatement[] = [
    ...mutationStatements,
    buildProjectPublicationRevisionForEstimate(input.projectId, intent.workspaceId, input.estimateId),
    ...(history.statement ? [history.statement, history.outboxStatement] : []),
    buildEstimateMutationReceiptStatement(intent, "estimate_row_item", input.rowId, result, nowIso()),
  ];
  assertD1MutationStatementLimit(statements.length);
  try {
    await runD1Batch(database, statements);
  } catch (error) {
    const concurrentReceipt = await readConcurrentEstimateMutationReceipt<EstimateRowHistoryResult>(database, intent);
    if (concurrentReceipt) return concurrentReceipt;
    if (persistedImpactFingerprint) {
      const currentImpactRows = await readProjectComponentImpactRevisionRows(database, {
        projectId: input.projectId,
        sourceRowId: input.rowId,
        componentId,
      });
      if (buildComponentImpactFingerprint(currentImpactRows) !== persistedImpactFingerprint) {
        throw new Error(COMPONENT_IMPACT_CONFLICT_MESSAGE);
      }
    }
    const authoritativeRow = await readRowById(database, input.estimateId, input.rowId);
    if (!authoritativeRow || authoritativeRow.row_revision !== expected) {
      throw new Error(ESTIMATE_ROW_REVISION_CONFLICT_CODE);
    }
    if (expectedLibrarySourceReceipt) {
      throw new Error("Library source changed. Refresh the estimate before replacing this row.");
    }
    throw error;
  }
  return result;
}

export async function updateEstimateRowItemWithHistory(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: RowMutationScope & {
    rowId: string;
    expectedRowRevision: number | null;
    rowPatch: Record<string, unknown>;
    componentMutationIntent?: "variant-selection";
    expectedComponentImpactFingerprint?: string;
    removedPriceOptionReplacements?: Record<string, string>;
  },
): Promise<EstimateRowHistoryResult> {
  return patchEstimateRowItem(database, actor, input, "row_updated", input.rowPatch, null);
}

export async function replaceEstimateRowItemWithHistory(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: RowMutationScope & {
    rowId: string;
    expectedRowRevision: number | null;
    replacementPayload: Record<string, unknown>;
    librarySource: EstimateRowItem;
  },
): Promise<EstimateRowHistoryResult> {
  await assertScopedEstimate(database, actor, input);
  const expectedLibrarySourceReceipt = await readCurrentLibrarySourceReceipt(database, input.librarySource);
  return patchEstimateRowItem(
    database,
    actor,
    input,
    "row_replaced",
    input.replacementPayload,
    expectedLibrarySourceReceipt,
  );
}

export async function deleteEstimateRowItemWithHistory(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: RowMutationScope & { rowId: string; expectedRowRevision: number },
) {
  if (!database.batch) throw new Error("Atomic estimate row deletion is unavailable.");
  const { context: intent, committedResult } = await prepareEstimateMutationIntent<Record<string, unknown>>(
    database,
    actor,
    {
      projectId: input.projectId,
      estimateId: input.estimateId,
      correlationId: input.correlationId,
      commandKind: "estimate.row.delete",
      request: {
        projectId: input.projectId,
        estimateId: input.estimateId,
        rowId: input.rowId,
        expectedRowRevision: input.expectedRowRevision,
      },
    },
  );
  if (committedResult) return committedResult;
  const existingEvent = await readExistingHistoryEvent(database, input.estimateId, intent.intentId);
  if (existingEvent) {
    const payload = readJsonRecord(existingEvent.payload);
    return {
      eventId: existingEvent.id,
      rowId: input.rowId,
      deletedRow: payload.deletedRow ?? null,
      payload: { eventId: existingEvent.id, rowId: input.rowId, deletedRow: payload.deletedRow ?? null },
    };
  }
  const row = await readRowById(database, input.estimateId, input.rowId);
  if (!row) throw new Error("Estimate row item not found in the current project.");
  const linkedTemplateMapping = await firstD1Row<{ instance_id: string }>(
    database,
    `SELECT mapping.instance_id
     FROM estimate_template_instance_rows AS mapping
     INNER JOIN estimate_template_instances AS instance
       ON instance.id = mapping.instance_id
      AND instance.workspace_id = mapping.workspace_id
      AND instance.estimate_id = mapping.estimate_id
     WHERE mapping.estimate_id = ? AND mapping.estimate_row_item_id = ?
       AND instance.link_state IN ('linked', 'updating', 'failed')
     LIMIT 1`,
    [input.estimateId, input.rowId],
  );
  if (linkedTemplateMapping) {
    throw new Error("This row is owned by a linked Template. Delete it from the Template or detach the instance first.");
  }
  if (row.row_revision !== input.expectedRowRevision) throw new Error(ESTIMATE_ROW_REVISION_CONFLICT_CODE);
  const deletedAt = nowIso();
  const history = await prepareHistoryEventInsert(database, {
    projectId: input.projectId,
    estimateId: input.estimateId,
    workspaceId: intent.workspaceId,
    estimateNodeId: row.node_id,
    targetRowId: input.rowId,
    eventType: "row_deleted",
    actorUserId: intent.actorUserId,
    correlationId: intent.intentId,
    oldSnapshot: row,
    rowContext: { material: row.material, supplier: row.supplier },
    payload: { rowId: input.rowId, deletedRow: rowItemHistoryResult(row).row },
    totalDelta: minorUnitsToAmount(-estimateRowTotalMinorUnits(row)),
  });
  const statements: D1IntentStatement[] = [
    buildRowRevisionGuardStatement(input.estimateId, [{
      rowId: input.rowId,
      rowRevision: input.expectedRowRevision,
    }]),
    ...buildProjectComponentAttachmentDeleteRetentionStatements({
      workspaceId: intent.workspaceId,
      projectId: input.projectId,
      sourceDeleteEventId: history.eventId,
      deletedRows: [row],
      deletedAt,
    }),
    {
      sql: "DELETE FROM estimate_row_items WHERE id = ? AND estimate_id = ? AND row_revision = ?",
      values: [input.rowId, input.estimateId, input.expectedRowRevision],
    },
  ];
  if (history.statement) statements.push(history.statement, history.outboxStatement);
  const result = {
    eventId: history.eventId,
    rowId: input.rowId,
    deletedRow: rowItemHistoryResult(row).row,
    payload: { rowId: input.rowId, deletedRow: rowItemHistoryResult(row).row },
  };
  statements.push(
    buildProjectPublicationRevisionForEstimate(input.projectId, intent.workspaceId, input.estimateId),
    buildEstimateMutationReceiptStatement(intent, "estimate_row_item", input.rowId, result, deletedAt),
  );
  assertD1MutationStatementLimit(statements.length);
  try {
    await runD1Batch(database, statements);
  } catch (error) {
    const concurrentReceipt = await readConcurrentEstimateMutationReceipt<typeof result>(database, intent);
    if (concurrentReceipt) return concurrentReceipt;
    const authoritativeRow = await readRowById(database, input.estimateId, input.rowId);
    if (!authoritativeRow || authoritativeRow.row_revision !== input.expectedRowRevision) {
      throw new Error(ESTIMATE_ROW_REVISION_CONFLICT_CODE);
    }
    throw error;
  }
  return result;
}

export async function deleteEstimateRowItemsBulkWithHistory(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: RowMutationScope & { rowIds: string[]; expectedRowRevisions: Record<string, number> },
) {
  if (!database.batch) throw new Error("Atomic bulk estimate row deletion is unavailable.");
  const rowIds = [...input.rowIds].filter(Boolean).sort();
  if (rowIds.length === 0) throw new Error("Select at least one estimate row.");
  if (new Set(rowIds).size !== rowIds.length) throw new Error("Bulk row delete contains a duplicate row.");
  const expectedRows = rowIds.map((rowId) => ({
    rowId,
    rowRevision: readNumber(input.expectedRowRevisions[rowId]),
  }));
  if (expectedRows.some((row) => !Number.isInteger(row.rowRevision) || row.rowRevision < 1)) {
    throw new Error("Bulk row delete requires the current revision for every selected row.");
  }
  const { context: intent, committedResult } = await prepareEstimateMutationIntent<Record<string, unknown>>(
    database,
    actor,
    {
      projectId: input.projectId,
      estimateId: input.estimateId,
      correlationId: input.correlationId,
      commandKind: "estimate.row.bulk-delete",
      request: { projectId: input.projectId, estimateId: input.estimateId, expectedRows },
    },
  );
  if (committedResult) return committedResult;
  const existingEvent = await readExistingHistoryEvent(database, input.estimateId, intent.intentId);
  if (existingEvent) {
    const payload = readJsonRecord(existingEvent.payload);
    const deletedRowIds = Array.isArray(payload.deletedRowIds)
      ? payload.deletedRowIds.filter((rowId): rowId is string => typeof rowId === "string")
      : [];
    if (deletedRowIds.length === 0) throw new Error("Idempotent bulk row delete event is incomplete.");
    return {
      status: "applied" as const,
      eventId: existingEvent.id,
      deletedRowIds,
      deletedRowCount: deletedRowIds.length,
      payload: { ...payload, eventId: existingEvent.id, status: "applied" },
    };
  }
  const rows = (await allD1Rows<Record<string, unknown>>(
    database,
    `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND id IN (${placeholders(rowIds)})`,
    [input.estimateId, ...rowIds],
  )).map(serializeRow);
  if (hasRowRevisionConflict(rows, expectedRows)) return rowRevisionConflictResult(rows, expectedRows);
  const ownershipGuard = await validateRowsOutsideActiveTemplateInstances(database, input.estimateId, rowIds);
  const deletedAt = nowIso();
  const history = await prepareHistoryEventInsert(database, {
    projectId: input.projectId,
    estimateId: input.estimateId,
    workspaceId: intent.workspaceId,
    eventType: "rows_deleted",
    actorUserId: intent.actorUserId,
    correlationId: intent.intentId,
    oldSnapshot: { rows },
    payload: { deletedRowIds: rowIds, deletedRowCount: rowIds.length },
    totalDelta: minorUnitsToAmount(-sumEstimateRowTotalMinorUnits(rows)),
  });
  const result = {
    status: "applied" as const,
    eventId: history.eventId,
    deletedRowIds: rowIds,
    deletedRowCount: rowIds.length,
    payload: {
      status: "applied" as const,
      eventId: history.eventId,
      deletedRowIds: rowIds,
      deletedRowCount: rowIds.length,
    },
  };
  const statements: D1IntentStatement[] = [
    buildRowRevisionGuardStatement(input.estimateId, expectedRows),
    ownershipGuard,
    ...buildProjectComponentAttachmentDeleteRetentionStatements({
      workspaceId: intent.workspaceId,
      projectId: input.projectId,
      sourceDeleteEventId: history.eventId,
      deletedRows: rows,
      deletedAt,
    }),
    {
      sql: `DELETE FROM estimate_row_items WHERE estimate_id = ? AND (${expectedRows.map(() => "(id = ? AND row_revision = ?)").join(" OR ")})`,
      values: [input.estimateId, ...expectedRows.flatMap((row) => [row.rowId, row.rowRevision])],
    },
    buildProjectPublicationRevisionForEstimate(input.projectId, intent.workspaceId, input.estimateId),
  ];
  if (history.statement) statements.push(history.statement, history.outboxStatement);
  statements.push(buildEstimateMutationReceiptStatement(
    intent,
    "estimate_row_item_set",
    input.estimateId,
    result,
    deletedAt,
  ));
  assertD1MutationStatementLimit(statements.length);
  try {
    await runD1Batch(database, statements);
  } catch (error) {
    const concurrentReceipt = await readConcurrentEstimateMutationReceipt<typeof result>(database, intent);
    if (concurrentReceipt) return concurrentReceipt;
    const authoritativeRows = (await allD1Rows<Record<string, unknown>>(
      database,
      `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND id IN (${placeholders(rowIds)})`,
      [input.estimateId, ...rowIds],
    )).map(serializeRow);
    if (hasRowRevisionConflict(authoritativeRows, expectedRows)) {
      return rowRevisionConflictResult(authoritativeRows, expectedRows);
    }
    throw error;
  }
  return result;
}

export async function moveEstimateRowItemWithHistory(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: RowMutationScope & {
    activeTabId: string | null;
    updates: Array<{ rowId: string; nodeId: string; sortOrder: number; expectedRowRevision: number }>;
    movedRowId: string;
    sourceNodeId: string;
    targetNodeId: string;
  },
) {
  if (!database.batch) throw new Error("Atomic estimate row reorganization is unavailable.");
  const updates = [...input.updates].sort((left, right) => left.rowId.localeCompare(right.rowId));
  if (updates.length === 0) throw new Error("Select at least one estimate row to move.");
  const updateIds = new Set<string>();
  for (const update of updates) {
    if (!update.rowId || !update.nodeId) throw new Error("Estimate row reorganization identity is incomplete.");
    if (updateIds.has(update.rowId)) throw new Error("Estimate row reorganization contains a duplicate row.");
    updateIds.add(update.rowId);
    if (!Number.isFinite(update.sortOrder) || update.sortOrder < 0) {
      throw new Error("Estimate row sort order must be a non-negative number.");
    }
    if (!Number.isInteger(update.expectedRowRevision) || update.expectedRowRevision < 1) {
      throw new Error("Row reorganization requires the current revision for every affected row.");
    }
  }
  const { context: intent, committedResult } = await prepareEstimateMutationIntent<Record<string, unknown>>(
    database,
    actor,
    {
      projectId: input.projectId,
      estimateId: input.estimateId,
      correlationId: input.correlationId,
      commandKind: "estimate.row.move",
      request: {
        projectId: input.projectId,
        estimateId: input.estimateId,
        activeTabId: input.activeTabId,
        updates,
      },
    },
  );
  if (committedResult) return committedResult;
  const existingEvent = await readExistingHistoryEvent(database, input.estimateId, intent.intentId);
  if (existingEvent) {
    const payload = readJsonRecord(existingEvent.payload);
    const rows = Array.isArray(payload.rows) ? payload.rows.map(readJsonRecord) : [];
    if (rows.length === 0) throw new Error("Idempotent estimate row move event is incomplete.");
    return {
      eventId: existingEvent.id,
      updatedRowCount: rows.length,
      rows,
      payload: { ...payload, eventId: existingEvent.id },
    };
  }
  const expectedRows = updates.map((update) => ({
    rowId: update.rowId,
    rowRevision: update.expectedRowRevision,
  }));
  const currentRows = (await allD1Rows<Record<string, unknown>>(
    database,
    `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND id IN (${placeholders(expectedRows)}) ORDER BY id`,
    [input.estimateId, ...expectedRows.map((row) => row.rowId)],
  )).map(serializeRow);
  if (hasRowRevisionConflict(currentRows, expectedRows)) return rowRevisionConflictResult(currentRows, expectedRows);
  const currentById = new Map(currentRows.map((row) => [row.id, row]));
  const topologyNodeIds = updates.flatMap((update) => {
    const currentNodeId = currentById.get(update.rowId)?.node_id;
    return currentNodeId ? [currentNodeId, update.nodeId] : [update.nodeId];
  });
  const topology = await validateEstimateDestinationNodes(
    database,
    input.estimateId,
    topologyNodeIds,
    input.activeTabId,
  );
  const topologyTabIds = new Set(topology.nodes.map((node) => node.estimate_tab_id));
  if (topologyTabIds.size !== 1) throw new Error("Estimate rows cannot move across tabs.");
  const expectedTabId = topology.nodes[0]?.estimate_tab_id ?? null;
  const timestamp = nowIso();
  const rows = updates.map((update) => ({
    rowId: update.rowId,
    nodeId: update.nodeId,
    sortOrder: update.sortOrder,
    rowRevision: update.expectedRowRevision + 1,
  }));
  const mutationStatements: D1IntentStatement[] = rows.map((row, index) => ({
    sql: "UPDATE estimate_row_items SET node_id = ?, sort_order = ?, row_revision = ?, updated_at = ? WHERE id = ? AND estimate_id = ? AND row_revision = ?",
    values: [
      row.nodeId,
      row.sortOrder,
      row.rowRevision,
      timestamp,
      row.rowId,
      input.estimateId,
      updates[index]!.expectedRowRevision,
    ],
  }));
  const movedRowId = input.movedRowId || rows[0]!.rowId;
  const movedRow = rows.find((row) => row.rowId === movedRowId) ?? rows[0]!;
  const history = await prepareHistoryEventInsert(database, {
    projectId: input.projectId,
    estimateId: input.estimateId,
    workspaceId: intent.workspaceId,
    estimateNodeId: movedRow.nodeId,
    estimateTabId: expectedTabId,
    targetRowId: movedRowId,
    eventType: "rows_moved",
    actorUserId: intent.actorUserId,
    correlationId: intent.intentId,
    changedFields: ["node_id", "sort_order"],
    oldSnapshot: { rows: currentRows },
    newSnapshot: { rows },
    payload: { rows, updatedRowCount: rows.length },
  });
  const result = {
    eventId: history.eventId,
    updatedRowCount: rows.length,
    rows,
    payload: { eventId: history.eventId, updatedRowCount: rows.length, rows },
  };
  const statements: D1IntentStatement[] = [
    topology.guard,
    buildEstimateNodeTabGuardStatement(input.estimateId, topologyNodeIds, expectedTabId),
    buildRowRevisionGuardStatement(input.estimateId, expectedRows),
    ...mutationStatements,
    buildProjectPublicationRevisionForEstimate(input.projectId, intent.workspaceId, input.estimateId),
  ];
  if (history.statement) statements.push(history.statement, history.outboxStatement);
  statements.push(buildEstimateMutationReceiptStatement(intent, "estimate_row_item", movedRowId, result, timestamp));
  assertD1MutationStatementLimit(statements.length);
  try {
    await runD1Batch(database, statements);
  } catch (error) {
    const concurrentReceipt = await readConcurrentEstimateMutationReceipt<typeof result>(database, intent);
    if (concurrentReceipt) return concurrentReceipt;
    const authoritativeRows = (await allD1Rows<Record<string, unknown>>(
      database,
      `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND id IN (${placeholders(expectedRows)}) ORDER BY id`,
      [input.estimateId, ...expectedRows.map((row) => row.rowId)],
    )).map(serializeRow);
    if (hasRowRevisionConflict(authoritativeRows, expectedRows)) throw new Error(ESTIMATE_ROW_REVISION_CONFLICT_CODE);
    throw error;
  }
  const authoritativeRows = (await allD1Rows<Record<string, unknown>>(
    database,
    `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND id IN (${placeholders(expectedRows)}) ORDER BY id`,
    [input.estimateId, ...expectedRows.map((row) => row.rowId)],
  )).map(serializeRow);
  const authoritativeById = new Map(authoritativeRows.map((row) => [row.id, row]));
  return {
    ...result,
    rows: rows.map((row) => {
      const authoritative = authoritativeById.get(row.rowId);
      if (!authoritative) throw new Error("Moved estimate row could not be reloaded.");
      return {
        rowId: authoritative.id,
        nodeId: authoritative.node_id,
        sortOrder: authoritative.sort_order,
        rowRevision: authoritative.row_revision,
      };
    }),
  };
}

export async function moveEstimateRowComponentWithHistory(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: RowMutationScope & {
    activeTabId: string | null;
    sourceRowId: string;
    targetRowId: string;
    expectedSourceRowRevision: number;
    expectedTargetRowRevision: number;
    sourceLibraryItem: EstimateRowItem;
    targetLibraryItem: EstimateRowItem;
  },
) {
  await assertScopedEstimate(database, actor, input);
  await readCurrentLibrarySourceReceipt(database, input.sourceLibraryItem);
  await readCurrentLibrarySourceReceipt(database, input.targetLibraryItem);
  if (!database.batch) throw new Error("Atomic estimate row component moves are unavailable.");
  if (!input.sourceRowId || !input.targetRowId || input.sourceRowId === input.targetRowId) {
    throw new Error("Source and target estimate rows must be different.");
  }
  const expectedRows: ExpectedRowRevision[] = [
    { rowId: input.sourceRowId, rowRevision: input.expectedSourceRowRevision },
    { rowId: input.targetRowId, rowRevision: input.expectedTargetRowRevision },
  ];
  if (expectedRows.some((row) => !Number.isInteger(row.rowRevision) || row.rowRevision < 1)) {
    throw new Error("Component move requires the current revision for both rows.");
  }
  const sourceReplacementPayload = buildEstimateRowReplacementPayload(input.sourceLibraryItem);
  const targetReplacementPayload = buildEstimateRowReplacementPayload(input.targetLibraryItem);
  const { context: intent, committedResult } = await prepareEstimateMutationIntent<Record<string, unknown>>(
    database,
    actor,
    {
      projectId: input.projectId,
      estimateId: input.estimateId,
      correlationId: input.correlationId,
      commandKind: "estimate.row.component-move",
      request: {
        projectId: input.projectId,
        estimateId: input.estimateId,
        activeTabId: input.activeTabId,
        expectedRows,
        sourceReplacementPayload,
        targetReplacementPayload,
      },
    },
  );
  if (committedResult) return committedResult;
  const existingEvent = await readExistingHistoryEvent(database, input.estimateId, intent.intentId);
  if (existingEvent) {
    const payload = readJsonRecord(existingEvent.payload);
    if (!payload.sourceRow || !payload.targetRow) throw new Error("Idempotent estimate row move event is incomplete.");
    return {
      status: "applied" as const,
      eventId: existingEvent.id,
      sourceRow: payload.sourceRow,
      targetRow: payload.targetRow,
      payload: { ...payload, eventId: existingEvent.id, status: "applied" },
    };
  }
  const currentRows = (await allD1Rows<Record<string, unknown>>(
    database,
    `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND id IN (${placeholders(expectedRows)}) ORDER BY id`,
    [input.estimateId, input.sourceRowId, input.targetRowId],
  )).map(serializeRow);
  if (hasRowRevisionConflict(currentRows, expectedRows)) return rowRevisionConflictResult(currentRows, expectedRows);
  const rowById = new Map(currentRows.map((row) => [row.id, row]));
  const sourceRow = rowById.get(input.sourceRowId);
  const targetRow = rowById.get(input.targetRowId);
  if (!sourceRow || !targetRow) return rowRevisionConflictResult(currentRows, expectedRows);
  const topologyNodeIds = [sourceRow.node_id, targetRow.node_id];
  const topology = await validateEstimateDestinationNodes(
    database,
    input.estimateId,
    topologyNodeIds,
    input.activeTabId,
  );
  const topologyTabIds = new Set(topology.nodes.map((node) => node.estimate_tab_id));
  if (topologyTabIds.size !== 1) throw new Error("Estimate row components cannot move across tabs.");
  const expectedTabId = topology.nodes[0]?.estimate_tab_id ?? null;
  const sourcePlan = planRowPatchMutation(
    sourceRow,
    input.estimateId,
    sourceReplacementPayload,
    input.expectedSourceRowRevision,
  );
  const targetPlan = planRowPatchMutation(
    targetRow,
    input.estimateId,
    targetReplacementPayload,
    input.expectedTargetRowRevision,
  );
  if (!sourcePlan || !targetPlan) throw new Error("Component move did not produce both row replacements.");
  const sourceResult = rowItemHistoryResult(sourcePlan.updated).row;
  const targetResult = rowItemHistoryResult(targetPlan.updated).row;
  const history = await prepareHistoryEventInsert(database, {
    projectId: input.projectId,
    estimateId: input.estimateId,
    workspaceId: intent.workspaceId,
    estimateNodeId: targetPlan.updated.node_id,
    estimateTabId: expectedTabId,
    targetRowId: input.targetRowId,
    eventType: "row_component_moved",
    actorUserId: intent.actorUserId,
    correlationId: intent.intentId,
    changedFields: [...new Set([...sourcePlan.columns, ...targetPlan.columns].map(([column]) => column))],
    oldSnapshot: { sourceRow, targetRow },
    newSnapshot: { sourceRow: sourcePlan.updated, targetRow: targetPlan.updated },
    payload: { sourceRow: sourceResult, targetRow: targetResult },
    totalDelta: minorUnitsToAmount(
      estimateRowTotalMinorUnits(sourcePlan.updated)
        + estimateRowTotalMinorUnits(targetPlan.updated)
        - estimateRowTotalMinorUnits(sourceRow)
        - estimateRowTotalMinorUnits(targetRow),
    ),
  });
  const result = {
    status: "applied" as const,
    eventId: history.eventId,
    sourceRow: sourceResult,
    targetRow: targetResult,
    payload: {
      status: "applied" as const,
      eventId: history.eventId,
      sourceRow: sourceResult,
      targetRow: targetResult,
    },
  };
  const timestamp = nowIso();
  const statements: D1IntentStatement[] = [
    topology.guard,
    buildEstimateNodeTabGuardStatement(input.estimateId, topologyNodeIds, expectedTabId),
    buildRowRevisionGuardStatement(input.estimateId, expectedRows),
    sourcePlan.statement,
    targetPlan.statement,
    buildProjectPublicationRevisionForEstimate(input.projectId, intent.workspaceId, input.estimateId),
  ];
  if (history.statement) statements.push(history.statement, history.outboxStatement);
  statements.push(buildEstimateMutationReceiptStatement(
    intent,
    "estimate_row_item_set",
    input.targetRowId,
    result,
    timestamp,
  ));
  assertD1MutationStatementLimit(statements.length);
  try {
    await runD1Batch(database, statements);
  } catch (error) {
    const concurrentReceipt = await readConcurrentEstimateMutationReceipt<typeof result>(database, intent);
    if (concurrentReceipt) return concurrentReceipt;
    const authoritativeRows = (await allD1Rows<Record<string, unknown>>(
      database,
      `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND id IN (${placeholders(expectedRows)}) ORDER BY id`,
      [input.estimateId, input.sourceRowId, input.targetRowId],
    )).map(serializeRow);
    if (hasRowRevisionConflict(authoritativeRows, expectedRows)) {
      return rowRevisionConflictResult(authoritativeRows, expectedRows);
    }
    throw error;
  }
  const authoritativeRows = (await allD1Rows<Record<string, unknown>>(
    database,
    `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND id IN (${placeholders(expectedRows)}) ORDER BY id`,
    [input.estimateId, input.sourceRowId, input.targetRowId],
  )).map(serializeRow);
  const authoritativeById = new Map(authoritativeRows.map((row) => [row.id, row]));
  const authoritativeSource = authoritativeById.get(input.sourceRowId);
  const authoritativeTarget = authoritativeById.get(input.targetRowId);
  if (!authoritativeSource || !authoritativeTarget) {
    throw new Error("Moved estimate row components could not be reloaded.");
  }
  return {
    ...result,
    sourceRow: rowItemHistoryResult(authoritativeSource, history.eventId).row,
    targetRow: rowItemHistoryResult(authoritativeTarget, history.eventId).row,
  };
}

export async function restoreDeletedEstimateRowsWithHistory(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: RowMutationScope & { sourceEventId: string; rowIds?: string[]; activeTabId?: string | null },
) {
  if (!database.batch) throw new Error("Atomic estimate row restoration is unavailable.");
  const requestedRowIds = [...(input.rowIds ?? [])].filter(Boolean).sort();
  if (!input.sourceEventId) throw new Error("Deleted row history identity is required.");
  if (requestedRowIds.length > MAX_RESTORABLE_ROW_BATCH_SIZE || new Set(requestedRowIds).size !== requestedRowIds.length) {
    throw new Error("Requested row restore selection is invalid.");
  }
  const { context: intent, committedResult } = await prepareEstimateMutationIntent<Record<string, unknown>>(
    database,
    actor,
    {
      projectId: input.projectId,
      estimateId: input.estimateId,
      correlationId: input.correlationId,
      commandKind: "estimate.row.restore",
      request: {
        projectId: input.projectId,
        estimateId: input.estimateId,
        sourceEventId: input.sourceEventId,
        requestedRowIds,
        activeTabId: input.activeTabId ?? null,
      },
    },
  );
  if (committedResult) return committedResult;
  const sourceEvent = await firstD1Row<{
    id: string;
    event_type: string;
    old_snapshot: Json | string | null;
  }>(
    database,
    `SELECT id, event_type, old_snapshot FROM estimate_sheet_events
     WHERE id = ? AND estimate_id = ? AND project_id = ? AND workspace_id = ? LIMIT 1`,
    [input.sourceEventId, input.estimateId, input.projectId, intent.workspaceId],
  );
  if (!sourceEvent || !["row_deleted", "rows_deleted", "rows_bulk_deleted"].includes(sourceEvent.event_type)) {
    throw new Error("Deleted row history snapshot was not found in the current estimate.");
  }
  const snapshot = readJsonRecord(sourceEvent.old_snapshot);
  const snapshotRows = (Array.isArray(snapshot.rows)
    ? snapshot.rows.map(readJsonRecord)
    : typeof snapshot.id === "string"
      ? [snapshot]
      : []).map((row): Record<string, unknown> => ({
        ...row,
        estimate_id: row.estimate_id ?? row.estimateId,
        node_id: row.node_id ?? row.nodeId,
      }));
  if (snapshotRows.length === 0) throw new Error("Deleted row history snapshot does not contain restorable rows.");
  if (snapshotRows.length > MAX_RESTORABLE_ROW_BATCH_SIZE) {
    throw new Error(`Deleted row history snapshot exceeds the ${MAX_RESTORABLE_ROW_BATCH_SIZE}-row restore limit.`);
  }
  const snapshotRowIds = new Set<string>();
  for (const row of snapshotRows) {
    const rowId = typeof row.id === "string" ? row.id : "";
    if (!rowId || row.estimate_id !== input.estimateId || snapshotRowIds.has(rowId)) {
      throw new Error("Deleted row history snapshot is malformed.");
    }
    snapshotRowIds.add(rowId);
  }
  if (requestedRowIds.some((rowId) => !snapshotRowIds.has(rowId))) {
    throw new Error("Requested rows are not present in the deleted row history snapshot.");
  }
  const rowsToRestore = requestedRowIds.length > 0
    ? snapshotRows.filter((row) => requestedRowIds.includes(String(row.id)))
    : snapshotRows;
  const existingEvent = await readExistingHistoryEvent(database, input.estimateId, intent.intentId);
  if (existingEvent) {
    const existingPayload = readJsonRecord(existingEvent.payload);
    const restoredRowIds = Array.isArray(existingPayload.restoredRowIds)
      ? existingPayload.restoredRowIds.filter((id): id is string => typeof id === "string")
      : [];
    if (
      existingEvent.event_type !== "estimate_rows_restored"
      || existingPayload.sourceEventId !== input.sourceEventId
      || restoredRowIds.length === 0
    ) {
      throw new Error("Restore correlation is already associated with a different estimate mutation.");
    }
    const restoredRows = await Promise.all(restoredRowIds.map(async (rowId) => {
      const row = await readRowById(database, input.estimateId, rowId);
      if (!row) throw new Error("Idempotent row restore event exists but restored rows are missing.");
      return rowItemHistoryResult(row, existingEvent.id).row;
    }));
    return {
      eventId: existingEvent.id,
      sourceEventId: input.sourceEventId,
      restoredRowIds,
      restoredRowCount: restoredRows.length,
      restoredRows,
    };
  }
  const restoredRowIds = rowsToRestore.map((row) => String(row.id));
  const collidingRows = await allD1Rows<{ id: string }>(
    database,
    `SELECT id FROM estimate_row_items WHERE estimate_id = ? AND id IN (${placeholders(restoredRowIds)})`,
    [input.estimateId, ...restoredRowIds],
  );
  if (collidingRows.length > 0) throw new Error("One or more estimate rows to restore already exist.");
  const normalizedRowsToRestore = rowsToRestore.map((row) => buildRowInsertStatement(row).record);
  const destinationNodeIds = normalizedRowsToRestore.map((row) => row.node_id);
  const destination = await validateEstimateDestinationNodes(
    database,
    input.estimateId,
    destinationNodeIds,
    input.activeTabId ?? null,
  );
  const destinationTabIds = new Set(destination.nodes.map((node) => node.estimate_tab_id));
  if (destinationTabIds.size !== 1) throw new Error("Deleted estimate rows cannot restore across tabs.");
  const destinationTabId = destination.nodes[0]?.estimate_tab_id ?? null;
  const history = await prepareHistoryEventInsert(database, {
    projectId: input.projectId,
    estimateId: input.estimateId,
    workspaceId: intent.workspaceId,
    estimateTabId: destinationTabId,
    targetRowId: restoredRowIds.length === 1 ? restoredRowIds[0] ?? null : null,
    eventType: "estimate_rows_restored",
    actorUserId: intent.actorUserId,
    correlationId: intent.intentId,
    newSnapshot: { rows: normalizedRowsToRestore },
    payload: {
      sourceEventId: input.sourceEventId,
      restoredRowIds,
      restoredRowCount: restoredRowIds.length,
    },
    totalDelta: minorUnitsToAmount(sumEstimateRowTotalMinorUnits(normalizedRowsToRestore)),
  });
  const restoredAt = nowIso();
  const attachmentRetention = buildProjectComponentAttachmentRestoreRetentionStatements({
    projectId: input.projectId,
    sourceDeleteEventId: input.sourceEventId,
    restoredRows: normalizedRowsToRestore,
    restoredAt,
  });
  const result = {
    eventId: history.eventId,
    sourceEventId: input.sourceEventId,
    restoredRowIds,
    restoredRowCount: restoredRowIds.length,
    restoredRows: normalizedRowsToRestore.map((row) => rowItemHistoryResult(row, history.eventId).row),
  };
  const statements: D1IntentStatement[] = [
    {
      sql: `SELECT CASE WHEN EXISTS (
        SELECT 1 FROM estimate_sheet_events
        WHERE id = ? AND estimate_id = ? AND project_id = ? AND workspace_id = ?
          AND event_type IN ('row_deleted', 'rows_deleted', 'rows_bulk_deleted')
      ) THEN 1 ELSE json('') END AS estimate_row_restore_source_guard`,
      values: [input.sourceEventId, input.estimateId, input.projectId, intent.workspaceId],
    },
    destination.guard,
    buildEstimateNodeTabGuardStatement(input.estimateId, destinationNodeIds, destinationTabId),
    ...attachmentRetention.guardStatements,
    ...buildPackedRowInsertStatements(normalizedRowsToRestore as unknown as Record<string, unknown>[]),
    ...attachmentRetention.releaseStatements,
    buildProjectPublicationRevisionForEstimate(input.projectId, intent.workspaceId, input.estimateId),
  ];
  if (history.statement) statements.push(history.statement, history.outboxStatement);
  statements.push(buildEstimateMutationReceiptStatement(
    intent,
    "estimate_row_item_set",
    input.estimateId,
    result,
    restoredAt,
  ));
  assertD1MutationStatementLimit(statements.length);
  try {
    await runD1Batch(database, statements);
  } catch (error) {
    const concurrentReceipt = await readConcurrentEstimateMutationReceipt<typeof result>(database, intent);
    if (concurrentReceipt) return concurrentReceipt;
    throw error;
  }
  const authoritativeRows = (await allD1Rows<Record<string, unknown>>(
    database,
    `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND id IN (${placeholders(restoredRowIds)}) ORDER BY id`,
    [input.estimateId, ...restoredRowIds],
  )).map(serializeRow);
  if (authoritativeRows.length !== restoredRowIds.length) {
    throw new Error("Restored estimate rows could not be reloaded.");
  }
  const authoritativeById = new Map(authoritativeRows.map((row) => [row.id, row]));
  return {
    ...result,
    restoredRows: restoredRowIds.map((rowId) => rowItemHistoryResult(authoritativeById.get(rowId)!, history.eventId).row),
  };
}

export async function readEstimateRowsForDuplication(
  database: D1DatabaseLike,
  input: { estimateId: string; nodeIds: readonly string[] },
): Promise<EstimateRowRecord[]> {
  if (input.nodeIds.length === 0) return [];
  const rows = await allD1Rows<Record<string, unknown>>(
    database,
    `SELECT * FROM estimate_row_items
     WHERE estimate_id = ? AND node_id IN (${input.nodeIds.map(() => "?").join(", ")})
     ORDER BY sort_order ASC, id ASC`,
    [input.estimateId, ...input.nodeIds],
  );
  return rows.map(serializeRow);
}

export async function insertEstimateRowsForDuplication(
  database: D1DatabaseLike,
  input: {
    estimateId: string;
    sourceRows: readonly EstimateRowRecord[];
    rowIdBySource: ReadonlyMap<string, string>;
    nodeIdBySource: ReadonlyMap<string, string>;
    timestamp: string;
  },
) {
  const statements: D1IntentStatement[] = input.sourceRows.map((row) => ({
    sql: `INSERT INTO estimate_row_items (
      id, estimate_id, node_id, description, designation, discipline, material, supplier, supplier_id,
      quantity, quantity_base, quantity_contingency_amount, unit, unit_cost, misc_cost,
      contingency_percentage, adjustment_percentage, source_snapshot_json, sort_order, row_revision,
      category_node_id, source_library_item_id, link_state, metadata_json, pricing_provenance_origin,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values: [
      input.rowIdBySource.get(row.id),
      input.estimateId,
      input.nodeIdBySource.get(row.node_id),
      row.description,
      row.designation,
      row.discipline,
      row.material,
      row.supplier,
      row.supplier_id,
      row.quantity,
      row.quantity_base,
      row.quantity_contingency_amount,
      row.unit,
      row.unit_cost,
      row.misc_cost,
      row.contingency_percentage,
      row.adjustment_percentage,
      JSON.stringify(sanitizeEstimateRowSourceSnapshot(row.source_snapshot)),
      row.sort_order,
      1,
      row.category_node_id,
      row.source_library_item_id,
      row.link_state,
      JSON.stringify(row.metadata),
      row.pricing_provenance_origin,
      input.timestamp,
      input.timestamp,
    ],
  }));
  await runD1Batch(database, statements);
  return statements.length;
}
