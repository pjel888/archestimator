import { createHash, randomUUID } from "node:crypto";

import type { D1DatabaseLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import {
  assertD1MutationStatementLimit,
  buildCommittedMutationReceiptStatement,
  readCommittedMutationReceipt,
} from "@/lib/estimates/mutation-receipts";
import type { EstimateRowItemPatch } from "@/lib/estimates/estimate-row-tree-patch";
import type { EstimateRowItem } from "@/lib/estimates/types";
import { isUuid } from "@/lib/ids";
import {
  buildComponentPermanentDeletePreview,
  buildComponentPermanentDeleteStatements,
  componentPermanentDeleteReceiptResult,
  getComponentPermanentDeleteReceiptOwners,
  loadComponentPermanentDeleteImpact,
  readComponentPermanentDeleteReceipt,
  type ComponentPermanentDeleteImpact,
} from "./component-permanent-delete";
import type {
  BulkActionExecutionResult,
  BulkActionPreviewResult,
} from "@/lib/mass-deletion/bulk-action";

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
type D1Statement = { sql: string; values: D1Value[] };

export type ComponentMutationLifecycleState = "draft" | "in_production" | "available" | "discontinued" | "archived";

export type ComponentMutationComponent = {
  id?: string;
  name: string;
  description: string;
  category: string;
  categoryNodeId: string | null;
  libraryFolderId: string;
  supplier: string | null;
  supplierId: string | null;
  brand: string | null;
  brandId: string | null;
  unit: string;
  thumbnailPath: string | null;
  lifecycleState: ComponentMutationLifecycleState;
  effectiveAt: string;
  changeReason: string;
  metadata: Json;
};

type ComponentMutationCostEntry = {
  clientId?: string;
  unitCost: number;
  miscCost: number;
  currency: string;
  pricingSource: string | null;
  pricingDate: string | null;
  sourceUrl: string | null;
  notes: string;
  isCurrent: boolean;
  deletedAt: string | null;
};

type ComponentMutationAttachment = {
  id?: string;
  assetId: string | null;
  bucket: string;
  path: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  kind: "pdf" | "excel";
  scanStatus: string | null;
  metadata: Json;
};

export type ComponentMutationPriceOption = {
  id?: string;
  label: string;
  sku: string | null;
  variantDescription: string;
  variantSortOrder: number;
  unit: string;
  unitCost: number;
  miscCost: number;
  currency: string;
  pricingSource: string | null;
  pricingDate: string | null;
  sourceUrl: string | null;
  notes: string;
  supplierId: string | null;
  brandId: string | null;
  brand: string | null;
  activeCostEntryId: string | null;
  costEntries: ComponentMutationCostEntry[];
  packageQuantity: number | null;
  packageUnit: string | null;
  dimensionLength: number | null;
  dimensionWidth: number | null;
  dimensionHeight: number | null;
  dimensionUnit: string | null;
  mass: number | null;
  massUnit: string | null;
  imageBucket: string | null;
  imagePath: string | null;
  thumbnailPath: string | null;
  imageMetadata: Json;
  attachments: ComponentMutationAttachment[];
  variantMetadata: Json;
  isActive: boolean;
  isDefault: boolean;
  effectiveAt: string;
  changeReason: string;
};

export type ComponentDuplicateIdentity = {
  name: string;
  category: string;
  supplier: string;
  brand: string;
};

export type ComponentDuplicateMatch = {
  itemId: string;
  name: string;
  category: string;
  supplier: string | null;
  brand: string | null;
};

type MutationReceiptIdentity = {
  workspaceId: string;
  commandKind: string;
  intentId: string;
  actorUserId: string;
  requestFingerprint: string;
};

export type CreateCostLibraryComponentReceiptResult = {
  itemId: string;
  versionNumber: number;
  activePriceOptionId: string;
  priceOptions: Array<{ id: string; label: string; isDefault: boolean }>;
  createdAt: string;
  updatedAt: string;
};

export type UpdateCostLibraryComponentReceiptResult = {
  itemId: string;
  versionNumber: number;
  activePriceOptionId: string;
  priceOptions: Array<{ id: string; label: string; isDefault: boolean }>;
  updatedAt: string;
  affectedEstimates: Array<{ projectId: string; estimateId: string }>;
  rowRevisions: Record<string, number>;
  updatedRowCount: number;
};

export type LibraryComponentInstanceSyncResult = {
  affectedEstimates: Array<{ projectId: string; estimateId: string }>;
  rowRevisions: Record<string, number>;
  rowPatches: Record<string, EstimateRowItemPatch>;
  updatedRowCount: number;
};

type ComponentItemD1Row = {
  id: string;
  workspace_id: string;
  name: string;
  unit: string;
  unit_cost: number | string | null;
  misc_cost: number | string | null;
  current_version_number: number | string | null;
  active_price_option_id: string | null;
  pricing_source: string | null;
  pricing_date: string | null;
  thumbnail_path: string | null;
  metadata_json: string | null;
  lifecycle_state: ComponentMutationLifecycleState | string;
  updated_at: string;
};

type LibraryPriceOptionProjectionD1Row = {
  id: string;
  label: string;
  unit: string;
  unit_cost: number | string | null;
  misc_cost: number | string | null;
  currency: string;
  is_active: number | boolean;
  is_default: number | boolean;
  pricing_source: string | null;
  metadata_json: string | null;
  updated_at: string;
};

type LinkedEstimateRowTarget = {
  row_id: string;
  row_revision: number | string;
  project_id: string;
  estimate_id: string;
  link_state: string | null;
  selected_price_option_id: string | null;
  source_snapshot_json: string | null;
  metadata_json: string | null;
};

type ComponentPriceOptionImpactRow = {
  id: string;
  updated_at: string;
  is_active: number | boolean;
  is_default: number | boolean;
};

type LibraryComponentSyncOption = {
  id: string;
  label: string;
  variantDescription: string;
  sku: string | null;
  brand: string | null;
  brandId: string | null;
  unit: string;
  unitCost: number;
  miscCost: number;
  currency: string;
  pricingSource: string | null;
  pricingDate: string | null;
  sourceUrl: string | null;
  thumbnailPath: string | null;
  isActive: boolean;
  isDefault: boolean;
  snapshot: Record<string, Json | undefined>;
};

type LinkedEstimateRowSyncPlan = {
  rowId: string;
  expectedRowRevision: number;
  projectId: string;
  estimateId: string;
  isOverridden: boolean;
  material: string;
  description: string;
  supplier: string | null;
  supplierId: string | null;
  brandId: string | null;
  unit: string;
  unitCost: number;
  sourceSnapshot: Record<string, Json | undefined>;
  metadata: Record<string, Json | undefined>;
  patch: EstimateRowItemPatch;
};

export type ComponentUpdateContext = {
  existing: ComponentItemD1Row;
  existingPriceOptionRows: LibraryPriceOptionProjectionD1Row[];
  affectedRows: LinkedEstimateRowTarget[];
};

export type ComponentPermanentDeleteOwners = {
  affectedEstimates: Array<{ estimateId: string; projectId: string }>;
  hasTemplateRows: boolean;
};

type ComponentPermanentDeleteExecutionResult =
  | {
      kind: "existing_result";
      result: BulkActionExecutionResult | BulkActionPreviewResult & { deletedIds: string[] };
      owners?: ComponentPermanentDeleteOwners;
    }
  | {
      kind: "fresh_commit";
      result: BulkActionExecutionResult;
      owners: ComponentPermanentDeleteOwners;
    };

export type ComponentPermanentDeleteD1Error = Error & {
  readonly code: "component_permanent_delete_d1";
  readonly phase: "impact" | "delete";
};

function componentPermanentDeleteD1Error(
  phase: ComponentPermanentDeleteD1Error["phase"],
  cause: unknown,
): ComponentPermanentDeleteD1Error {
  const error = new Error(
    phase === "impact"
      ? "Could not load component deletion impact."
      : "Could not permanently delete components.",
  ) as ComponentPermanentDeleteD1Error;
  error.name = "ComponentPermanentDeleteD1Error";
  Object.assign(error, {
    code: "component_permanent_delete_d1" as const,
    phase,
    cause,
  });
  return error;
}

export function isComponentPermanentDeleteD1Error(
  value: unknown,
): value is ComponentPermanentDeleteD1Error {
  return value instanceof Error
    && "code" in value
    && value.code === "component_permanent_delete_d1"
    && "phase" in value
    && (value.phase === "impact" || value.phase === "delete");
}

const D1_COMPONENT_ID_BATCH_SIZE = 96;
const LIBRARY_COMPONENT_CAP = 10_000;
const STALE_COMPONENT_REVISION_ERROR = "This component changed after you opened it. Refresh and try again.";
const STALE_COMPONENT_IMPACT_ERROR = "Component usage changed while this edit was open. Review the latest impact and try again.";

function nowIso() {
  return new Date().toISOString();
}

function placeholders(values: readonly unknown[]) {
  return values.map(() => "?").join(", ");
}

function chunkD1ComponentIds(ids: readonly string[]) {
  const batches: string[][] = [];
  for (let index = 0; index < ids.length; index += D1_COMPONENT_ID_BATCH_SIZE) {
    batches.push(ids.slice(index, index + D1_COMPONENT_ID_BATCH_SIZE));
  }
  return batches;
}

function jsonText(value: unknown, fallback: Record<string, unknown> | unknown[] = {}) {
  return JSON.stringify(value ?? fallback);
}

function readJsonValue(value: unknown, fallback: Json = {}) {
  if (typeof value === "string") {
    try {
      return readJsonValue(JSON.parse(value) as unknown, fallback);
    } catch {
      return fallback;
    }
  }
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value as Json;
  if (Array.isArray(value)) return value as Json;
  return value && typeof value === "object" ? value as Json : fallback;
}

function readJsonRecord(value: unknown): Record<string, Json | undefined> {
  const parsed = readJsonValue(value, {});
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, Json | undefined> : {};
}

function readMetadataObject(metadata: Json | undefined): { [key: string]: Json | undefined } {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) return metadata;
  return {};
}

function boolInt(value: boolean | undefined) {
  return value === true ? 1 : 0;
}

function readBoolean(value: unknown) {
  return value === true || value === 1 || value === "1";
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function first<T>(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  return database.prepare<T>(sql).bind(...values).first<T>();
}

async function all<T>(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  const result = await database.prepare<T>(sql).bind(...values).all<T>();
  if (result.success === false) throw new Error("Something went wrong. Try again in a moment.");
  return result.results ?? [];
}

async function run<T = Record<string, unknown>>(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  const result = await database.prepare<T>(sql).bind(...values).run();
  if (result.success === false) throw new Error("Something went wrong. Try again in a moment.");
  return result;
}

async function runBatch(database: D1DatabaseLike, statements: D1Statement[]) {
  if (statements.length === 0) return;
  if (database.batch) {
    const results = await database.batch(
      statements.map((statement) => database.prepare(statement.sql).bind(...statement.values)),
    );
    if (results.some((result) => result.success === false)) {
      throw new Error("Something went wrong. Try again in a moment.");
    }
    return;
  }
  for (const statement of statements) await run(database, statement.sql, statement.values);
}

async function runAtomicBatch(database: D1DatabaseLike, statements: D1Statement[]): Promise<D1Result[]> {
  if (!database.batch) throw new Error("Something went wrong. Try again in a moment.");
  const results = await database.batch(
    statements.map((statement) => database.prepare(statement.sql).bind(...statement.values)),
  );
  if (results.some((result) => result.success === false)) throw new Error("Something went wrong. Try again in a moment.");
  return results;
}

function componentDuplicateIdentitySql(column: "name" | "category" | "supplier" | "brand") {
  let expression = `REPLACE(REPLACE(REPLACE(COALESCE(${column}, ''), CHAR(9), ' '), CHAR(10), ' '), CHAR(13), ' ')`;
  for (let index = 0; index < 8; index += 1) expression = `REPLACE(${expression}, '  ', ' ')`;
  return `LOWER(TRIM(${expression}))`;
}

const COMPONENT_DUPLICATE_NAME_SQL = componentDuplicateIdentitySql("name");
const COMPONENT_DUPLICATE_CATEGORY_SQL = componentDuplicateIdentitySql("category");
const COMPONENT_DUPLICATE_SUPPLIER_SQL = componentDuplicateIdentitySql("supplier");
const COMPONENT_DUPLICATE_BRAND_SQL = componentDuplicateIdentitySql("brand");

function buildComponentDuplicateIdentityPredicate(input: ComponentDuplicateIdentity) {
  if (!input.name || !input.category || (!input.supplier && !input.brand)) return null;
  return {
    sql: `
      ${COMPONENT_DUPLICATE_NAME_SQL} = ?
      AND ${COMPONENT_DUPLICATE_CATEGORY_SQL} = ?
      AND (
        (? <> '' AND ${COMPONENT_DUPLICATE_SUPPLIER_SQL} = ?)
        OR (? <> '' AND ${COMPONENT_DUPLICATE_BRAND_SQL} = ?)
      )
    `,
    values: [input.name, input.category, input.supplier, input.supplier, input.brand, input.brand] as D1Value[],
  };
}

export async function findCostLibraryComponentDuplicateInD1(
  database: D1DatabaseLike,
  workspaceId: string,
  input: ComponentDuplicateIdentity,
): Promise<ComponentDuplicateMatch | null> {
  const predicate = buildComponentDuplicateIdentityPredicate(input);
  if (!predicate) return null;
  const matches = await all<{
    id: string;
    name: string;
    category: string;
    supplier: string | null;
    brand: string | null;
  }>(
    database,
    `
      SELECT id, name, category, supplier, brand
      FROM cost_library_items
      WHERE workspace_id = ?
        AND lifecycle_state <> 'archived'
        AND ${predicate.sql}
      ORDER BY updated_at DESC, id ASC
      LIMIT 1
    `,
    [workspaceId, ...predicate.values],
  );
  const match = matches[0];
  return match ? {
    itemId: match.id,
    name: match.name,
    category: match.category,
    supplier: match.supplier,
    brand: match.brand,
  } : null;
}

function buildComponentDuplicateGuardStatement(input: {
  workspaceId: string;
  itemId: string;
  component: ComponentDuplicateIdentity;
}) {
  const predicate = buildComponentDuplicateIdentityPredicate(input.component);
  if (!predicate) return null;
  return {
    sql: `
      SELECT CASE WHEN NOT EXISTS (
        SELECT 1
        FROM cost_library_items
        WHERE workspace_id = ?
          AND id <> ?
          AND lifecycle_state <> 'archived'
          AND ${predicate.sql}
      ) THEN 1 ELSE json('') END AS component_duplicate_guard
    `,
    values: [input.workspaceId, input.itemId, ...predicate.values] as D1Value[],
  };
}

async function listLinkedEstimateRowTargets(database: D1DatabaseLike, workspaceId: string, itemId: string) {
  return all<LinkedEstimateRowTarget>(
    database,
    `
      SELECT
        row_item.id AS row_id,
        row_item.row_revision,
        project.id AS project_id,
        estimate.id AS estimate_id,
        row_item.link_state,
        COALESCE(
          NULLIF(json_extract(row_item.source_snapshot_json, '$.priceOptionId'), ''),
          NULLIF(json_extract(row_item.metadata_json, '$.priceOptionId'), '')
        ) AS selected_price_option_id,
        row_item.source_snapshot_json,
        row_item.metadata_json
      FROM estimate_row_items row_item
      INNER JOIN estimates estimate ON estimate.id = row_item.estimate_id
      INNER JOIN projects project ON project.id = estimate.project_id
      WHERE project.workspace_id = ?
        AND row_item.source_library_item_id = ?
        AND (row_item.link_state IS NULL OR row_item.link_state NOT IN ('detached', 'unlinked'))
      ORDER BY row_item.id
    `,
    [workspaceId, itemId],
  );
}

async function listComponentPriceOptionImpactRows(database: D1DatabaseLike, workspaceId: string, itemId: string) {
  return all<ComponentPriceOptionImpactRow>(
    database,
    `
      SELECT id, updated_at, is_active, is_default
      FROM cost_library_item_price_options
      WHERE workspace_id = ?
        AND item_id = ?
      ORDER BY id
    `,
    [workspaceId, itemId],
  );
}

function buildLinkedEstimateRowsRevisionFingerprint(
  rows: LinkedEstimateRowTarget[],
  priceOptions: ComponentPriceOptionImpactRow[],
) {
  const rowFingerprint = [...rows]
    .sort((left, right) => left.row_id.localeCompare(right.row_id))
    .map((row) => [
      row.row_id,
      numberValue(row.row_revision, 1),
      row.link_state ?? "linked-clean",
      row.selected_price_option_id ?? "",
    ].join(":"))
    .join("|");
  const optionFingerprint = [...priceOptions]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((option) => [
      option.id,
      option.updated_at,
      boolInt(readBoolean(option.is_active)),
      boolInt(readBoolean(option.is_default)),
    ].join(":"))
    .join("|");
  return `rows[${rowFingerprint}]|options[${optionFingerprint}]`;
}

export async function loadComponentMutationImpactInD1(
  database: D1DatabaseLike,
  workspaceId: string,
  itemId: string,
) {
  const [linkedRows, priceOptions] = await Promise.all([
    listLinkedEstimateRowTargets(database, workspaceId, itemId),
    listComponentPriceOptionImpactRows(database, workspaceId, itemId),
  ]);
  const optionUsageCounts: Record<string, number> = {};
  for (const row of linkedRows) {
    if (!row.selected_price_option_id) continue;
    optionUsageCounts[row.selected_price_option_id] = (optionUsageCounts[row.selected_price_option_id] ?? 0) + 1;
  }
  return {
    expectedComponentImpactFingerprint: buildLinkedEstimateRowsRevisionFingerprint(linkedRows, priceOptions),
    optionUsageCounts,
  };
}

function readCreateCostLibraryComponentReceiptResult(value: unknown): CreateCostLibraryComponentReceiptResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The committed component creation receipt is invalid.");
  }
  const result = value as Record<string, unknown>;
  const priceOptions = Array.isArray(result.priceOptions)
    ? result.priceOptions.map((candidate) => {
        if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
          throw new Error("The committed component creation receipt is invalid.");
        }
        const option = candidate as Record<string, unknown>;
        const optionId = typeof option.id === "string" ? option.id : "";
        if (!isUuid(optionId) || typeof option.label !== "string" || typeof option.isDefault !== "boolean") {
          throw new Error("The committed component creation receipt is invalid.");
        }
        return { id: optionId, label: option.label, isDefault: option.isDefault };
      })
    : null;
  const itemId = typeof result.itemId === "string" ? result.itemId : "";
  const activePriceOptionId = typeof result.activePriceOptionId === "string" ? result.activePriceOptionId : "";
  const createdAt = typeof result.createdAt === "string" ? result.createdAt : "";
  const updatedAt = typeof result.updatedAt === "string" ? result.updatedAt : "";
  if (
    !isUuid(itemId)
    || result.versionNumber !== 1
    || !isUuid(activePriceOptionId)
    || !priceOptions?.length
    || !createdAt
    || !updatedAt
  ) {
    throw new Error("The committed component creation receipt is invalid.");
  }
  return {
    itemId,
    versionNumber: result.versionNumber,
    activePriceOptionId,
    priceOptions,
    createdAt,
    updatedAt,
  };
}

function readUpdateCostLibraryComponentReceiptResult(value: unknown): UpdateCostLibraryComponentReceiptResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The committed component update receipt is invalid.");
  }
  const result = value as Record<string, unknown>;
  const itemId = typeof result.itemId === "string" ? result.itemId : "";
  const activePriceOptionId = typeof result.activePriceOptionId === "string" ? result.activePriceOptionId : "";
  const updatedAt = typeof result.updatedAt === "string" ? result.updatedAt : "";
  const versionNumber = numberValue(result.versionNumber);
  const updatedRowCount = numberValue(result.updatedRowCount, -1);
  const priceOptions = Array.isArray(result.priceOptions)
    ? result.priceOptions.map((candidate) => {
        if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
          throw new Error("The committed component update receipt is invalid.");
        }
        const option = candidate as Record<string, unknown>;
        const id = typeof option.id === "string" ? option.id : "";
        if (!isUuid(id) || typeof option.label !== "string" || typeof option.isDefault !== "boolean") {
          throw new Error("The committed component update receipt is invalid.");
        }
        return { id, label: option.label, isDefault: option.isDefault };
      })
    : null;
  const affectedEstimates = Array.isArray(result.affectedEstimates)
    ? result.affectedEstimates.map((candidate) => {
        if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
          throw new Error("The committed component update receipt is invalid.");
        }
        const estimate = candidate as Record<string, unknown>;
        const projectId = typeof estimate.projectId === "string" ? estimate.projectId : "";
        const estimateId = typeof estimate.estimateId === "string" ? estimate.estimateId : "";
        if (!projectId || !estimateId) throw new Error("The committed component update receipt is invalid.");
        return { projectId, estimateId };
      })
    : null;
  const rowRevisionsValue = result.rowRevisions;
  if (!rowRevisionsValue || typeof rowRevisionsValue !== "object" || Array.isArray(rowRevisionsValue)) {
    throw new Error("The committed component update receipt is invalid.");
  }
  const rowRevisions = Object.fromEntries(Object.entries(rowRevisionsValue).map(([rowId, revision]) => {
    const parsedRevision = numberValue(revision);
    if (!rowId || !Number.isSafeInteger(parsedRevision) || parsedRevision < 1) {
      throw new Error("The committed component update receipt is invalid.");
    }
    return [rowId, parsedRevision];
  }));
  if (
    !isUuid(itemId)
    || !Number.isSafeInteger(versionNumber)
    || versionNumber < 1
    || !isUuid(activePriceOptionId)
    || !priceOptions?.length
    || !updatedAt
    || !affectedEstimates
    || !Number.isSafeInteger(updatedRowCount)
    || updatedRowCount < 0
    || Object.keys(rowRevisions).length !== updatedRowCount
  ) {
    throw new Error("The committed component update receipt is invalid.");
  }
  return {
    itemId,
    versionNumber,
    activePriceOptionId,
    priceOptions,
    updatedAt,
    affectedEstimates,
    rowRevisions,
    updatedRowCount,
  };
}

export async function readCreatedComponentReceiptInD1(
  database: D1DatabaseLike,
  identity: MutationReceiptIdentity,
) {
  return readCommittedMutationReceipt(database, identity, readCreateCostLibraryComponentReceiptResult);
}

export async function readUpdatedComponentReceiptInD1(
  database: D1DatabaseLike,
  identity: MutationReceiptIdentity,
) {
  return readCommittedMutationReceipt(database, identity, readUpdateCostLibraryComponentReceiptResult);
}

function componentSnapshot(component: ComponentMutationComponent, patch: Record<string, unknown> = {}) {
  return {
    name: component.name,
    description: component.description,
    supplier: component.supplier,
    supplierId: component.supplierId,
    brand: component.brand,
    brandId: component.brandId,
    unit: component.unit,
    thumbnailPath: component.thumbnailPath,
    lifecycleState: component.lifecycleState,
    metadata: readMetadataObject(component.metadata),
    ...patch,
  };
}

function priceOptionSnapshot(priceOption: ComponentMutationPriceOption) {
  return {
    label: priceOption.label,
    sku: priceOption.sku,
    variantDescription: priceOption.variantDescription,
    variantSortOrder: priceOption.variantSortOrder,
    unit: priceOption.unit,
    unitCost: priceOption.unitCost,
    miscCost: priceOption.miscCost,
    currency: priceOption.currency,
    pricingSource: priceOption.pricingSource,
    pricingDate: priceOption.pricingDate,
    sourceUrl: priceOption.sourceUrl,
    notes: priceOption.notes,
    supplierId: priceOption.supplierId,
    brandId: priceOption.brandId,
    brand: priceOption.brand,
    packageQuantity: priceOption.packageQuantity,
    packageUnit: priceOption.packageUnit,
    dimensionLength: priceOption.dimensionLength,
    dimensionWidth: priceOption.dimensionWidth,
    dimensionHeight: priceOption.dimensionHeight,
    dimensionUnit: priceOption.dimensionUnit,
    mass: priceOption.mass,
    massUnit: priceOption.massUnit,
    imageBucket: priceOption.imageBucket,
    imagePath: priceOption.imagePath,
    thumbnailPath: priceOption.thumbnailPath,
    imageMetadata: priceOption.imageMetadata,
    attachments: priceOption.attachments,
    variantMetadata: priceOption.variantMetadata,
    isActive: priceOption.isActive,
    isDefault: priceOption.isDefault,
    activeCostEntryId: priceOption.activeCostEntryId,
  };
}

async function readComponentItem(database: D1DatabaseLike, workspaceId: string, itemId: string) {
  return first<ComponentItemD1Row>(
    database,
    `
      SELECT id, workspace_id, name, unit, unit_cost, misc_cost, current_version_number,
        active_price_option_id, pricing_source, pricing_date, thumbnail_path, metadata_json, lifecycle_state, updated_at
      FROM cost_library_items
      WHERE id = ?
        AND workspace_id = ?
      LIMIT 1
    `,
    [itemId, workspaceId],
  );
}

function assertExpectedComponentRevision(
  existing: ComponentItemD1Row,
  expectedUpdatedAt: string,
  expectedVersionNumber: number,
) {
  if (
    existing.updated_at !== expectedUpdatedAt
    || !Number.isInteger(expectedVersionNumber)
    || expectedVersionNumber < 1
    || numberValue(existing.current_version_number, 1) !== expectedVersionNumber
  ) {
    throw new Error(STALE_COMPONENT_REVISION_ERROR);
  }
}

export async function loadComponentUpdateContextInD1(
  database: D1DatabaseLike,
  input: {
    workspaceId: string;
    itemId: string;
    expectedUpdatedAt: string;
    expectedVersionNumber: number;
    expectedComponentImpactFingerprint: string;
  },
): Promise<ComponentUpdateContext> {
  const existing = await readComponentItem(database, input.workspaceId, input.itemId);
  if (!existing) throw new Error("Component not found in the current workspace.");
  assertExpectedComponentRevision(existing, input.expectedUpdatedAt, input.expectedVersionNumber);
  const [existingPriceOptionRows, affectedRows] = await Promise.all([
    all<LibraryPriceOptionProjectionD1Row>(
      database,
      `
        SELECT id, label, unit, unit_cost, misc_cost, currency, is_active, is_default,
          pricing_source, metadata_json, updated_at
        FROM cost_library_item_price_options
        WHERE item_id = ?
          AND workspace_id = ?
        ORDER BY id
      `,
      [input.itemId, input.workspaceId],
    ),
    listLinkedEstimateRowTargets(database, input.workspaceId, input.itemId),
  ]);
  if (buildLinkedEstimateRowsRevisionFingerprint(affectedRows, existingPriceOptionRows) !== input.expectedComponentImpactFingerprint) {
    throw new Error(STALE_COMPONENT_IMPACT_ERROR);
  }
  return { existing, existingPriceOptionRows, affectedRows };
}

function buildLinkedEstimateRowsRevisionGuardStatement(input: {
  workspaceId: string;
  itemId: string;
  expectedFingerprint: string;
}) {
  return {
    sql: `
      SELECT CASE WHEN (
        'rows[' || COALESCE((
        SELECT GROUP_CONCAT(component_revision, '|')
        FROM (
          SELECT
            row_item.id || ':' ||
            CAST(row_item.row_revision AS TEXT) || ':' ||
            COALESCE(row_item.link_state, 'linked-clean') || ':' ||
            COALESCE(
              NULLIF(json_extract(row_item.source_snapshot_json, '$.priceOptionId'), ''),
              NULLIF(json_extract(row_item.metadata_json, '$.priceOptionId'), ''),
              ''
            ) AS component_revision
          FROM estimate_row_items row_item
          INNER JOIN estimates estimate ON estimate.id = row_item.estimate_id
          INNER JOIN projects project ON project.id = estimate.project_id
          WHERE project.workspace_id = ?
            AND row_item.source_library_item_id = ?
            AND (row_item.link_state IS NULL OR row_item.link_state NOT IN ('detached', 'unlinked'))
          ORDER BY row_item.id
        )
      ), '') || ']|options[' || COALESCE((
        SELECT GROUP_CONCAT(option_revision, '|')
        FROM (
          SELECT
            option_row.id || ':' || option_row.updated_at || ':' ||
            CAST(option_row.is_active AS TEXT) || ':' || CAST(option_row.is_default AS TEXT) AS option_revision
          FROM cost_library_item_price_options option_row
          WHERE option_row.workspace_id = ?
            AND option_row.item_id = ?
          ORDER BY option_row.id
        )
      ), '') || ']'
      ) = ? THEN 1 ELSE json('') END AS component_impact_guard
    `,
    values: [
      input.workspaceId,
      input.itemId,
      input.workspaceId,
      input.itemId,
      input.expectedFingerprint,
    ] as D1Value[],
  };
}

function buildComponentRevisionGuardStatement(input: {
  workspaceId: string;
  itemId: string;
  expectedUpdatedAt: string;
  expectedVersionNumber: number;
}) {
  return {
    sql: `
      UPDATE cost_library_items
      SET current_version_number = CASE
        WHEN updated_at = ? AND current_version_number = ? THEN current_version_number
        ELSE 0
      END
      WHERE id = ?
        AND workspace_id = ?
    `,
    values: [input.expectedUpdatedAt, input.expectedVersionNumber, input.itemId, input.workspaceId] as D1Value[],
  };
}

async function runComponentRevisionGuardedBatch(
  database: D1DatabaseLike,
  statements: D1Statement[],
  input: {
    workspaceId: string;
    itemId: string;
    expectedUpdatedAt: string;
    expectedVersionNumber: number;
    expectedComponentImpactFingerprint: string;
  },
) {
  const guardStatements = [
    buildComponentRevisionGuardStatement(input),
    buildLinkedEstimateRowsRevisionGuardStatement({
      workspaceId: input.workspaceId,
      itemId: input.itemId,
      expectedFingerprint: input.expectedComponentImpactFingerprint,
    }),
  ];
  try {
    const results = await runAtomicBatch(database, [...guardStatements, ...statements]);
    return results.slice(guardStatements.length);
  } catch (error) {
    const current = await readComponentItem(database, input.workspaceId, input.itemId);
    if (current) assertExpectedComponentRevision(current, input.expectedUpdatedAt, input.expectedVersionNumber);
    const [currentLinkedRows, currentPriceOptions] = await Promise.all([
      listLinkedEstimateRowTargets(database, input.workspaceId, input.itemId),
      listComponentPriceOptionImpactRows(database, input.workspaceId, input.itemId),
    ]);
    if (buildLinkedEstimateRowsRevisionFingerprint(currentLinkedRows, currentPriceOptions) !== input.expectedComponentImpactFingerprint) {
      throw new Error(STALE_COMPONENT_IMPACT_ERROR);
    }
    throw error;
  }
}

function buildComponentPriceOptionWritePlan(
  input: {
    workspaceId: string;
    itemId: string;
    priceOption: ComponentMutationPriceOption;
    userId: string;
    effectiveAt: string;
    writeHistory: boolean;
  },
  options: { oldSnapshotJson?: string | null; priceOptionId?: string; timestamp?: string } = {},
) {
  const priceOptionId = options.priceOptionId
    ?? (input.priceOption.id && isUuid(input.priceOption.id) ? input.priceOption.id : randomUUID());
  const timestamp = options.timestamp ?? nowIso();
  const costEntries = input.priceOption.costEntries
    .filter((candidate) => candidate.deletedAt === null)
    .map((entry) => ({
      ...entry,
      id: entry.clientId && isUuid(entry.clientId) ? entry.clientId : randomUUID(),
    }));
  const currentCostEntry = costEntries.find((entry) => entry.isCurrent) ?? costEntries[0];
  const attachments = input.priceOption.attachments.map((attachment) => ({
    ...attachment,
    id: attachment.id && isUuid(attachment.id) ? attachment.id : randomUUID(),
    isExisting: Boolean(attachment.id && isUuid(attachment.id)),
  }));
  const persistedPriceOption = {
    ...input.priceOption,
    id: priceOptionId,
    activeCostEntryId: currentCostEntry?.id ?? null,
    attachments: attachments.map(({ isExisting, ...attachment }) => {
      void isExisting;
      return attachment;
    }),
  };
  const metadata = priceOptionSnapshot(persistedPriceOption);
  const guardStatements: D1Statement[] = [{
    sql: `
      SELECT CASE WHEN NOT EXISTS (
        SELECT 1
        FROM cost_library_item_price_options
        WHERE id = ?
          AND (item_id <> ? OR workspace_id <> ?)
      ) THEN 1 ELSE json('') END AS price_option_ownership_guard
    `,
    values: [priceOptionId, input.itemId, input.workspaceId],
  }];
  const statements: D1Statement[] = [];

  if (input.priceOption.imagePath) {
    const imageMetadata = readMetadataObject(input.priceOption.imageMetadata);
    const imageAssetId = typeof imageMetadata.assetId === "string" && isUuid(imageMetadata.assetId)
      ? imageMetadata.assetId
      : "";
    guardStatements.push({
      sql: `
        SELECT CASE WHEN EXISTS (
          SELECT 1
          FROM cost_library_item_price_options
          WHERE id = ?
            AND item_id = ?
            AND workspace_id = ?
            AND json_extract(metadata_json, '$.imagePath') = ?
        ) OR EXISTS (
          SELECT 1
          FROM upload_assets
          WHERE id = ?
            AND workspace_id = ?
            AND surface = 'component-image'
            AND status = 'finalized'
            AND scan_status = 'not_required'
            AND storage_bucket = ?
            AND storage_path = ?
        ) THEN 1 ELSE json('') END AS component_image_ownership_guard
      `,
      values: [
        priceOptionId,
        input.itemId,
        input.workspaceId,
        input.priceOption.imagePath,
        imageAssetId,
        input.workspaceId,
        input.priceOption.imageBucket ?? "component-images",
        input.priceOption.imagePath,
      ],
    });
    statements.push({
      sql: `
        UPDATE upload_assets
        SET target_entity_type = 'cost-library-component',
            target_entity_id = ?,
            updated_at = ?
        WHERE id = ?
          AND workspace_id = ?
          AND surface = 'component-image'
          AND status = 'finalized'
      `,
      values: [input.itemId, timestamp, imageAssetId, input.workspaceId],
    });
  }

  if (input.priceOption.isDefault) {
    statements.push({
      sql: `
        UPDATE cost_library_item_price_options
        SET is_default = 0
        WHERE item_id = ?
          AND workspace_id = ?
          AND id <> ?
      `,
      values: [input.itemId, input.workspaceId, priceOptionId],
    });
  }

  statements.push({
    sql: `
      INSERT INTO cost_library_item_price_options (
        id, workspace_id, item_id, label, unit, unit_cost, misc_cost, currency,
        is_active, is_default, updated_at, supplier_id, brand_id, brand,
        pricing_source, metadata_json, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        label = excluded.label,
        unit = excluded.unit,
        unit_cost = excluded.unit_cost,
        misc_cost = excluded.misc_cost,
        currency = excluded.currency,
        is_active = excluded.is_active,
        is_default = excluded.is_default,
        updated_at = excluded.updated_at,
        supplier_id = excluded.supplier_id,
        brand_id = excluded.brand_id,
        brand = excluded.brand,
        pricing_source = excluded.pricing_source,
        metadata_json = excluded.metadata_json
      WHERE cost_library_item_price_options.item_id = excluded.item_id
        AND cost_library_item_price_options.workspace_id = excluded.workspace_id
    `,
    values: [
      priceOptionId,
      input.workspaceId,
      input.itemId,
      input.priceOption.label,
      input.priceOption.unit,
      input.priceOption.unitCost,
      input.priceOption.miscCost,
      input.priceOption.currency,
      boolInt(input.priceOption.isActive),
      boolInt(input.priceOption.isDefault),
      timestamp,
      input.priceOption.supplierId,
      input.priceOption.brandId,
      input.priceOption.brand ?? "",
      input.priceOption.pricingSource,
      jsonText(metadata),
      timestamp,
    ],
  }, {
    sql: `
      UPDATE cost_library_item_variant_cost_entries
      SET is_current = 0,
          updated_at = ?
      WHERE workspace_id = ?
        AND item_id = ?
        AND price_option_id = ?
        AND deleted_at IS NULL
    `,
    values: [timestamp, input.workspaceId, input.itemId, priceOptionId],
  });

  for (const entry of costEntries) {
    guardStatements.push({
      sql: `
        SELECT CASE WHEN NOT EXISTS (
          SELECT 1
          FROM cost_library_item_variant_cost_entries
          WHERE id = ?
            AND (workspace_id <> ? OR item_id <> ? OR price_option_id <> ?)
        ) THEN 1 ELSE json('') END AS component_cost_entry_ownership_guard
      `,
      values: [entry.id, input.workspaceId, input.itemId, priceOptionId],
    });
    statements.push({
      sql: `
        INSERT INTO cost_library_item_variant_cost_entries (
          id, workspace_id, item_id, price_option_id, unit_cost, misc_cost, currency,
          pricing_source, pricing_date, source_url, notes, is_current,
          deleted_at, metadata_json, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          unit_cost = excluded.unit_cost,
          misc_cost = excluded.misc_cost,
          currency = excluded.currency,
          pricing_source = excluded.pricing_source,
          pricing_date = excluded.pricing_date,
          source_url = excluded.source_url,
          notes = excluded.notes,
          is_current = excluded.is_current,
          deleted_at = excluded.deleted_at,
          metadata_json = excluded.metadata_json,
          updated_at = excluded.updated_at
        WHERE cost_library_item_variant_cost_entries.workspace_id = excluded.workspace_id
          AND cost_library_item_variant_cost_entries.item_id = excluded.item_id
          AND cost_library_item_variant_cost_entries.price_option_id = excluded.price_option_id
      `,
      values: [
        entry.id,
        input.workspaceId,
        input.itemId,
        priceOptionId,
        entry.unitCost,
        entry.miscCost,
        entry.currency,
        entry.pricingSource,
        entry.pricingDate,
        entry.sourceUrl,
        entry.notes,
        boolInt(entry.isCurrent),
        entry.deletedAt,
        jsonText({ source: "component-library-action" }),
        timestamp,
        timestamp,
      ],
    });
  }

  const retainedAttachmentIds = attachments.map((attachment) => attachment.id);
  for (const attachment of attachments) {
    if (attachment.bucket !== "component-attachments") throw new Error("Variant attachments must use the component attachment bucket.");
    if (attachment.isExisting) {
      guardStatements.push({
        sql: `
          SELECT CASE WHEN EXISTS (
            SELECT 1
            FROM component_variant_attachments attachment
            INNER JOIN upload_assets asset ON asset.id = attachment.upload_asset_id
            WHERE attachment.id = ?
              AND attachment.owner_scope = 'library'
              AND attachment.workspace_id = ?
              AND attachment.item_id = ?
              AND attachment.price_option_id = ?
              AND attachment.storage_bucket = ?
              AND attachment.storage_path = ?
              AND asset.workspace_id = attachment.workspace_id
              AND asset.surface = 'component-attachment'
              AND asset.status = 'finalized'
              AND asset.storage_bucket = attachment.storage_bucket
              AND asset.storage_path = attachment.storage_path
              AND (
                asset.scan_status IN ('pending', 'clean')
                OR (
                  asset.scan_status = 'override_approved'
                  AND datetime(asset.scan_override_expires_at) > datetime(?)
                )
              )
          ) THEN 1 ELSE json('') END AS existing_component_attachment_guard
        `,
        values: [attachment.id, input.workspaceId, input.itemId, priceOptionId, attachment.bucket, attachment.path, timestamp],
      });
      statements.push({
        sql: `
          UPDATE component_variant_attachments
          SET file_name = ?,
              content_type = ?,
              size_bytes = ?,
              attachment_kind = ?,
              metadata_json = json_patch(?, json_object(
                'assetId', upload_asset_id,
                'scanStatus', (SELECT scan_status FROM upload_assets WHERE id = upload_asset_id)
              )),
              applicable_cost_entry_id = ?,
              updated_at = ?
          WHERE id = ?
            AND owner_scope = 'library'
            AND workspace_id = ?
            AND item_id = ?
            AND price_option_id = ?
        `,
        values: [
          attachment.fileName,
          attachment.contentType,
          attachment.sizeBytes,
          attachment.kind,
          jsonText(attachment.metadata),
          currentCostEntry?.id ?? null,
          timestamp,
          attachment.id,
          input.workspaceId,
          input.itemId,
          priceOptionId,
        ],
      });
      continue;
    }

    if (!attachment.assetId || !isUuid(attachment.assetId)) {
      throw new Error("A finalized upload asset is required for every new variant attachment.");
    }
    guardStatements.push({
      sql: `
        SELECT CASE WHEN EXISTS (
          SELECT 1
          FROM upload_assets
          WHERE id = ?
            AND workspace_id = ?
            AND surface = 'component-attachment'
            AND status = 'finalized'
            AND storage_bucket = ?
            AND storage_path = ?
            AND file_name = ?
            AND content_type = ?
            AND size_bytes = ?
            AND (
              scan_status IN ('pending', 'clean')
              OR (
                scan_status = 'override_approved'
                AND datetime(scan_override_expires_at) > datetime(?)
              )
            )
        ) THEN 1 ELSE json('') END AS new_component_attachment_guard
      `,
      values: [
        attachment.assetId,
        input.workspaceId,
        attachment.bucket,
        attachment.path,
        attachment.fileName,
        attachment.contentType,
        attachment.sizeBytes,
        timestamp,
      ],
    });
    statements.push({
      sql: `
        INSERT INTO component_variant_attachments (
          id, owner_scope, price_option_id, item_id, workspace_id, upload_asset_id,
          storage_bucket, storage_path, file_name, content_type, size_bytes,
          attachment_kind, metadata_json, created_by, review_status,
          applicable_cost_entry_id, is_current_approved, review_revision,
          created_at, updated_at
        )
        VALUES (?, 'library', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, json_patch(?, json_object(
          'assetId', ?,
          'scanStatus', (SELECT scan_status FROM upload_assets WHERE id = ?)
        )), ?, 'uploaded', ?, 0, 1, ?, ?)
      `,
      values: [
        attachment.id,
        priceOptionId,
        input.itemId,
        input.workspaceId,
        attachment.assetId,
        attachment.bucket,
        attachment.path,
        attachment.fileName,
        attachment.contentType,
        attachment.sizeBytes,
        attachment.kind,
        jsonText(attachment.metadata),
        attachment.assetId,
        attachment.assetId,
        input.userId,
        currentCostEntry?.id ?? null,
        timestamp,
        timestamp,
      ],
    });
  }

  statements.push({
    sql: `
      UPDATE upload_assets
      SET status = 'removed',
          updated_at = ?
      WHERE id IN (
        SELECT upload_asset_id
        FROM component_variant_attachments
        WHERE workspace_id = ?
          AND owner_scope = 'library'
          AND item_id = ?
          AND price_option_id = ?
          AND upload_asset_id IS NOT NULL
          AND id NOT IN (SELECT CAST(value AS TEXT) FROM json_each(?))
          AND review_status <> 'superseded'
      )
    `,
    values: [timestamp, input.workspaceId, input.itemId, priceOptionId, jsonText(retainedAttachmentIds, [])],
  }, {
    sql: `
      UPDATE component_variant_attachments
      SET review_status = 'superseded',
          is_current_approved = 0,
          reviewed_by = ?,
          reviewed_at = ?,
          review_note = 'Removed from component variant',
          review_revision = review_revision + 1,
          updated_at = ?
      WHERE workspace_id = ?
        AND owner_scope = 'library'
        AND item_id = ?
        AND price_option_id = ?
        AND id NOT IN (SELECT CAST(value AS TEXT) FROM json_each(?))
        AND review_status <> 'superseded'
    `,
    values: [input.userId, timestamp, timestamp, input.workspaceId, input.itemId, priceOptionId, jsonText(retainedAttachmentIds, [])],
  });

  if (input.writeHistory) {
    statements.push({
      sql: `
        INSERT OR IGNORE INTO cost_library_item_price_history (
          id, price_option_id, item_id, workspace_id, operation_key, old_snapshot,
          new_snapshot, change_reason, effective_at, created_by, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      values: [
        randomUUID(),
        priceOptionId,
        input.itemId,
        input.workspaceId,
        `${input.itemId}:${priceOptionId}:${input.effectiveAt}`,
        options.oldSnapshotJson ?? null,
        jsonText(metadata),
        input.priceOption.changeReason,
        input.effectiveAt,
        input.userId,
        timestamp,
      ],
    });
  }

  return {
    persisted: {
      id: priceOptionId,
      label: input.priceOption.label,
      isDefault: input.priceOption.isDefault,
      isActive: input.priceOption.isActive,
      unit: input.priceOption.unit,
      unitCost: input.priceOption.unitCost,
      miscCost: input.priceOption.miscCost,
      pricingSource: input.priceOption.pricingSource,
      pricingDate: input.priceOption.pricingDate,
      thumbnailPath: input.priceOption.thumbnailPath,
      snapshot: metadata,
    },
    guardStatements,
    statements,
  };
}

export async function createCostLibraryComponentInD1(
  database: D1DatabaseLike,
  input: {
    workspaceId: string;
    actorUserId: string;
    receiptIdentity: MutationReceiptIdentity;
    component: ComponentMutationComponent;
    priceOptions: ComponentMutationPriceOption[];
    duplicateIdentity: ComponentDuplicateIdentity;
    allowDuplicate: boolean;
  },
): Promise<
  | { kind: "created" | "replayed"; receipt: CreateCostLibraryComponentReceiptResult }
  | { kind: "duplicate"; match: ComponentDuplicateMatch }
> {
  const quota = await first<{ count: number }>(
    database,
    "SELECT COUNT(*) AS count FROM cost_library_items WHERE workspace_id = ?",
    [input.workspaceId],
  );
  if (Number(quota?.count ?? 0) >= LIBRARY_COMPONENT_CAP) {
    throw new Error(`This workspace has reached its component limit (${LIBRARY_COMPONENT_CAP}). Archive or delete some first.`);
  }
  const itemId = input.component.id && isUuid(input.component.id) ? input.component.id : randomUUID();
  const timestamp = nowIso();
  const priceOptionPlans = input.priceOptions.map((priceOption) => buildComponentPriceOptionWritePlan({
    workspaceId: input.workspaceId,
    itemId,
    priceOption,
    userId: input.actorUserId,
    effectiveAt: priceOption.effectiveAt,
    writeHistory: false,
  }, { timestamp }));
  const persistedPriceOptions = priceOptionPlans.map((plan) => plan.persisted);
  const activePriceOption = persistedPriceOptions.find((option) => option.isDefault) ?? persistedPriceOptions[0];
  if (!activePriceOption) throw new Error("At least one active component variant is required.");
  const duplicateGuard = input.allowDuplicate ? null : buildComponentDuplicateGuardStatement({
    workspaceId: input.workspaceId,
    itemId,
    component: input.duplicateIdentity,
  });
  const statements: D1Statement[] = [
    ...(duplicateGuard ? [duplicateGuard] : []),
    ...priceOptionPlans.flatMap((plan) => plan.guardStatements),
    {
      sql: `
      INSERT INTO cost_library_items (
        id, workspace_id, name, description, category, category_node_id,
        library_folder_id, supplier, supplier_id, brand, brand_id, unit, unit_cost,
        misc_cost, lifecycle_state, current_version_number, active_price_option_id,
        pricing_source, pricing_date, thumbnail_path, metadata_json,
        created_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      values: [
        itemId,
        input.workspaceId,
        input.component.name,
        input.component.description,
        input.component.category,
        input.component.categoryNodeId,
        input.component.libraryFolderId,
        input.component.supplier,
        input.component.supplierId,
        input.component.brand,
        input.component.brandId,
        activePriceOption.unit,
        activePriceOption.unitCost,
        activePriceOption.miscCost,
        input.component.lifecycleState,
        1,
        activePriceOption.id,
        activePriceOption.pricingSource,
        activePriceOption.pricingDate,
        input.component.thumbnailPath,
        jsonText(readMetadataObject(input.component.metadata)),
        input.actorUserId,
        timestamp,
        timestamp,
      ],
    },
  ];
  for (const plan of priceOptionPlans) statements.push(...plan.statements);
  statements.push({
    sql: `
      INSERT INTO cost_library_item_versions (
        id, item_id, workspace_id, version_number, snapshot_json, change_summary,
        change_reason, effective_at, created_by, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values: [
      randomUUID(),
      itemId,
      input.workspaceId,
      1,
      jsonText(componentSnapshot(input.component, { priceOptions: persistedPriceOptions })),
      "Component created",
      input.component.changeReason,
      input.component.effectiveAt,
      input.actorUserId,
      timestamp,
    ],
  });
  const receipt: CreateCostLibraryComponentReceiptResult = {
    itemId,
    versionNumber: 1,
    activePriceOptionId: activePriceOption.id,
    priceOptions: persistedPriceOptions.map((option) => ({
      id: option.id,
      label: option.label,
      isDefault: option.isDefault,
    })),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  statements.push(buildCommittedMutationReceiptStatement({
    ...input.receiptIdentity,
    resourceType: "cost_library_component",
    resourceId: itemId,
    result: receipt,
    timestamp,
  }));
  assertD1MutationStatementLimit(statements.length);
  try {
    await runAtomicBatch(database, statements);
  } catch (error) {
    const concurrentReceipt = await readCreatedComponentReceiptInD1(database, input.receiptIdentity);
    if (concurrentReceipt) return { kind: "replayed", receipt: concurrentReceipt };
    if (!input.allowDuplicate) {
      const duplicate = await findCostLibraryComponentDuplicateInD1(database, input.workspaceId, input.duplicateIdentity);
      if (duplicate) return { kind: "duplicate", match: duplicate };
    }
    throw error;
  }
  return { kind: "created", receipt };
}

function buildLibraryComponentSyncOption(input: {
  id: string;
  label: string;
  unit: string;
  unitCost: number;
  miscCost: number;
  currency: string;
  isActive: boolean;
  isDefault: boolean;
  pricingSource: string | null;
  pricingDate: string | null;
  thumbnailPath: string | null;
  brand: string | null;
  brandId: string | null;
  snapshot: Record<string, unknown>;
}): LibraryComponentSyncOption {
  const snapshot = readJsonRecord(input.snapshot);
  const rowSafeSnapshot = { ...snapshot };
  delete rowSafeSnapshot.attachments;
  delete rowSafeSnapshot.imageBucket;
  delete rowSafeSnapshot.imageMetadata;
  delete rowSafeSnapshot.imagePath;
  return {
    id: input.id,
    label: input.label,
    variantDescription: typeof snapshot.variantDescription === "string" ? snapshot.variantDescription : "",
    sku: typeof snapshot.sku === "string" ? snapshot.sku : null,
    brand: input.brand,
    brandId: input.brandId,
    unit: input.unit,
    unitCost: input.unitCost,
    miscCost: input.miscCost,
    currency: input.currency,
    pricingSource: input.pricingSource,
    pricingDate: input.pricingDate,
    sourceUrl: typeof snapshot.sourceUrl === "string" ? snapshot.sourceUrl : null,
    thumbnailPath: input.thumbnailPath,
    isActive: input.isActive,
    isDefault: input.isDefault,
    snapshot: { ...rowSafeSnapshot, id: input.id },
  };
}

function buildLinkedEstimateRowSyncPlans(input: {
  rows: LinkedEstimateRowTarget[];
  itemId: string;
  material: string;
  componentDescription: string;
  brand: string | null;
  brandId: string | null;
  supplier: string | null;
  supplierId: string | null;
  lifecycleState: ComponentMutationLifecycleState;
  componentVersionNumber: number;
  componentThumbnailPath: string | null;
  priceOptions: LibraryComponentSyncOption[];
  defaultPriceOptionId: string;
  removedPriceOptionReplacements: Record<string, string>;
  updatedAt: string;
}) {
  const activeOptions = input.priceOptions.filter((option) => option.isActive);
  const optionById = new Map(activeOptions.map((option) => [option.id, option]));
  const defaultOption = optionById.get(input.defaultPriceOptionId)
    ?? activeOptions.find((option) => option.isDefault)
    ?? activeOptions[0];
  if (!defaultOption) throw new Error("At least one active component variant is required.");
  const catalogue = activeOptions.map((option) => option.snapshot);
  const plans: LinkedEstimateRowSyncPlan[] = [];

  for (const row of input.rows) {
    if (row.link_state && !["linked-clean", "linked-overridden"].includes(row.link_state)) continue;
    const previousSelectedId = row.selected_price_option_id;
    const replacementId = previousSelectedId ? input.removedPriceOptionReplacements[previousSelectedId] : undefined;
    const selectedOption = (previousSelectedId ? optionById.get(previousSelectedId) : null)
      ?? (replacementId ? optionById.get(replacementId) : null)
      ?? (!previousSelectedId ? defaultOption : null);
    if (!selectedOption) {
      throw new Error(`Variant ${previousSelectedId ?? "selection"} is still used by an estimate row. Choose an explicit replacement before deleting it.`);
    }
    if (replacementId && replacementId === previousSelectedId) {
      throw new Error("A deleted variant must be replaced with a different active variant.");
    }

    const rowDescription = selectedOption.variantDescription || input.componentDescription;
    const imageUrl = selectedOption.thumbnailPath || input.componentThumbnailPath;
    const sourceSnapshotPatch = {
      brand: selectedOption.brand,
      brandId: selectedOption.brandId,
      componentDescription: input.componentDescription,
      componentVersionNumber: input.componentVersionNumber,
      description: rowDescription,
      imageUrl,
      lifecycleState: input.lifecycleState,
      material: input.material,
      priceOptionId: selectedOption.id,
      priceOptionLabel: selectedOption.label,
      priceOptions: catalogue,
      pricingDate: selectedOption.pricingDate,
      pricingSource: selectedOption.pricingSource,
      sku: selectedOption.sku,
      sourceComponentId: input.itemId,
      sourceLibraryItemId: input.itemId,
      sourceType: "library_component",
      sourceUpdatedAt: input.updatedAt,
      sourceUrl: selectedOption.sourceUrl,
      supplier: input.supplier,
      supplierId: input.supplierId,
      unit: selectedOption.unit,
      unit_cost: selectedOption.unitCost,
    };
    const metadataPatch = {
      brandId: selectedOption.brandId,
      componentVersionNumber: input.componentVersionNumber,
      priceOptionId: selectedOption.id,
      sourceComponentId: input.itemId,
      supplierId: input.supplierId,
    };
    const sourceSnapshot = { ...readJsonRecord(row.source_snapshot_json), ...sourceSnapshotPatch };
    const metadata = { ...readJsonRecord(row.metadata_json), ...metadataPatch };
    const isOverridden = row.link_state === "linked-overridden";
    const patch: EstimateRowItemPatch = {
      rowRevision: numberValue(row.row_revision, 1) + 1,
      sourceSnapshot,
      metadata,
      priceOptionId: selectedOption.id,
      priceOptionLabel: selectedOption.label,
      priceOptions: catalogue as EstimateRowItem["priceOptions"],
      componentVersionNumber: input.componentVersionNumber,
      updatedAt: input.updatedAt,
      ...(isOverridden ? {} : {
        material: input.material,
        description: rowDescription,
        brand: selectedOption.brand,
        supplier: input.supplier ?? "",
        unit: selectedOption.unit,
        itemCost: selectedOption.unitCost,
        imageUrl,
        sourceUrl: selectedOption.sourceUrl,
        brandId: selectedOption.brandId,
        supplierId: input.supplierId,
        sku: selectedOption.sku,
        pricingDate: selectedOption.pricingDate,
        pricingSource: selectedOption.pricingSource,
        lifecycleState: input.lifecycleState,
      }),
    };
    plans.push({
      rowId: row.row_id,
      expectedRowRevision: numberValue(row.row_revision, 1),
      projectId: row.project_id,
      estimateId: row.estimate_id,
      isOverridden,
      material: input.material,
      description: rowDescription,
      supplier: input.supplier,
      supplierId: input.supplierId,
      brandId: selectedOption.brandId,
      unit: selectedOption.unit,
      unitCost: selectedOption.unitCost,
      sourceSnapshot,
      metadata,
      patch,
    });
  }
  return plans;
}

function buildLinkedEstimateRowsSyncStatement(input: {
  workspaceId: string;
  itemId: string;
  rowPlans: LinkedEstimateRowSyncPlan[];
  updatedAt: string;
}) {
  const serializedPlans = input.rowPlans.map((plan) => ({
    rowId: plan.rowId,
    expectedRowRevision: plan.expectedRowRevision,
    isOverridden: plan.isOverridden,
    material: plan.material,
    description: plan.description,
    supplier: plan.supplier,
    supplierId: plan.supplierId,
    brandId: plan.brandId,
    unit: plan.unit,
    unitCost: plan.unitCost,
    sourceSnapshot: plan.sourceSnapshot,
    metadata: plan.metadata,
  }));
  return {
    sql: `
      WITH sync_rows AS (
        SELECT value AS sync_row
        FROM json_each(?)
      )
      UPDATE estimate_row_items
      SET material = CASE
            WHEN json_extract((SELECT sync_row FROM sync_rows WHERE json_extract(sync_row, '$.rowId') = estimate_row_items.id), '$.isOverridden') = 1 THEN material
            ELSE json_extract((SELECT sync_row FROM sync_rows WHERE json_extract(sync_row, '$.rowId') = estimate_row_items.id), '$.material')
          END,
          description = CASE
            WHEN json_extract((SELECT sync_row FROM sync_rows WHERE json_extract(sync_row, '$.rowId') = estimate_row_items.id), '$.isOverridden') = 1 THEN description
            ELSE json_extract((SELECT sync_row FROM sync_rows WHERE json_extract(sync_row, '$.rowId') = estimate_row_items.id), '$.description')
          END,
          supplier = CASE
            WHEN json_extract((SELECT sync_row FROM sync_rows WHERE json_extract(sync_row, '$.rowId') = estimate_row_items.id), '$.isOverridden') = 1 THEN supplier
            ELSE json_extract((SELECT sync_row FROM sync_rows WHERE json_extract(sync_row, '$.rowId') = estimate_row_items.id), '$.supplier')
          END,
          supplier_id = CASE
            WHEN json_extract((SELECT sync_row FROM sync_rows WHERE json_extract(sync_row, '$.rowId') = estimate_row_items.id), '$.isOverridden') = 1 THEN supplier_id
            ELSE json_extract((SELECT sync_row FROM sync_rows WHERE json_extract(sync_row, '$.rowId') = estimate_row_items.id), '$.supplierId')
          END,
          brand_id = CASE
            WHEN json_extract((SELECT sync_row FROM sync_rows WHERE json_extract(sync_row, '$.rowId') = estimate_row_items.id), '$.isOverridden') = 1 THEN brand_id
            ELSE json_extract((SELECT sync_row FROM sync_rows WHERE json_extract(sync_row, '$.rowId') = estimate_row_items.id), '$.brandId')
          END,
          unit = CASE
            WHEN json_extract((SELECT sync_row FROM sync_rows WHERE json_extract(sync_row, '$.rowId') = estimate_row_items.id), '$.isOverridden') = 1 THEN unit
            ELSE json_extract((SELECT sync_row FROM sync_rows WHERE json_extract(sync_row, '$.rowId') = estimate_row_items.id), '$.unit')
          END,
          unit_cost = CASE
            WHEN json_extract((SELECT sync_row FROM sync_rows WHERE json_extract(sync_row, '$.rowId') = estimate_row_items.id), '$.isOverridden') = 1 THEN unit_cost
            ELSE json_extract((SELECT sync_row FROM sync_rows WHERE json_extract(sync_row, '$.rowId') = estimate_row_items.id), '$.unitCost')
          END,
          source_snapshot_json = json_extract((SELECT sync_row FROM sync_rows WHERE json_extract(sync_row, '$.rowId') = estimate_row_items.id), '$.sourceSnapshot'),
          metadata_json = json_extract((SELECT sync_row FROM sync_rows WHERE json_extract(sync_row, '$.rowId') = estimate_row_items.id), '$.metadata'),
          row_revision = row_revision + 1,
          updated_at = ?
      WHERE source_library_item_id = ?
        AND (link_state IS NULL OR link_state IN ('linked-clean', 'linked-overridden'))
        AND EXISTS (
          SELECT 1 FROM sync_rows
          WHERE json_extract(sync_row, '$.rowId') = estimate_row_items.id
            AND json_extract(sync_row, '$.expectedRowRevision') = estimate_row_items.row_revision
        )
        AND estimate_id IN (
          SELECT estimate.id
          FROM estimates estimate
          INNER JOIN projects project ON project.id = estimate.project_id
          WHERE project.workspace_id = ?
        )
      RETURNING id, row_revision
    `,
    values: [jsonText(serializedPlans, []), input.updatedAt, input.itemId, input.workspaceId] as D1Value[],
  };
}

function buildLibraryComponentInstanceSyncResult(
  rowPlans: LinkedEstimateRowSyncPlan[],
  result: D1Result<{ id: string; row_revision: number | string }>,
): LibraryComponentInstanceSyncResult {
  const affectedEstimateKeys = new Set<string>();
  const affectedEstimates: LibraryComponentInstanceSyncResult["affectedEstimates"] = [];
  for (const row of rowPlans) {
    const key = `${row.projectId}:${row.estimateId}`;
    if (affectedEstimateKeys.has(key)) continue;
    affectedEstimateKeys.add(key);
    affectedEstimates.push({ projectId: row.projectId, estimateId: row.estimateId });
  }
  const rowRevisions = Object.fromEntries((result.results ?? []).map((row) => [row.id, numberValue(row.row_revision)]));
  return {
    affectedEstimates,
    rowRevisions,
    rowPatches: Object.fromEntries(rowPlans
      .filter((plan) => rowRevisions[plan.rowId] !== undefined)
      .map((plan) => [plan.rowId, { ...plan.patch, rowRevision: rowRevisions[plan.rowId] }])),
    updatedRowCount: result.meta?.changes ?? 0,
  };
}

function buildUpdateReceipt(input: {
  itemId: string;
  versionNumber: number;
  activePriceOptionId: string;
  priceOptions: Array<{ id: string; label: string; isDefault: boolean }>;
  updatedAt: string;
  rowPlans: LinkedEstimateRowSyncPlan[];
}): UpdateCostLibraryComponentReceiptResult {
  const keys = new Set<string>();
  const affectedEstimates: Array<{ projectId: string; estimateId: string }> = [];
  for (const row of input.rowPlans) {
    const key = `${row.projectId}:${row.estimateId}`;
    if (keys.has(key)) continue;
    keys.add(key);
    affectedEstimates.push({ projectId: row.projectId, estimateId: row.estimateId });
  }
  return {
    itemId: input.itemId,
    versionNumber: input.versionNumber,
    activePriceOptionId: input.activePriceOptionId,
    priceOptions: input.priceOptions,
    updatedAt: input.updatedAt,
    affectedEstimates,
    rowRevisions: Object.fromEntries(input.rowPlans.map((row) => [row.rowId, row.expectedRowRevision + 1])),
    updatedRowCount: input.rowPlans.length,
  };
}

function buildUpdateFanOutStatements(input: {
  workspaceId: string;
  itemId: string;
  versionNumber: number;
  actorUserId: string;
  intentId: string;
  rowPlans: LinkedEstimateRowSyncPlan[];
  timestamp: string;
}) {
  if (input.rowPlans.length === 0) return [];
  const rowImpactJson = jsonText(input.rowPlans.map((row) => ({
    rowId: row.rowId,
    projectId: row.projectId,
    estimateId: row.estimateId,
    previousRowRevision: row.expectedRowRevision,
    rowRevision: row.expectedRowRevision + 1,
    priceOptionId: row.patch.priceOptionId ?? null,
  })), []);
  return [{
    sql: `
      WITH expected(row_json) AS (SELECT value FROM json_each(?)),
      grouped AS (
        SELECT json_extract(row_json, '$.estimateId') AS estimate_id,
          json_extract(row_json, '$.projectId') AS project_id,
          COUNT(*) AS row_count,
          json_group_array(json(row_json)) AS rows_json
        FROM expected GROUP BY estimate_id, project_id
      )
      INSERT INTO estimate_sheet_events (
        id, estimate_id, workspace_id, project_id, estimate_node_id, estimate_tab_id,
        target_row_id, event_type, event_source, correlation_id, actor_user_id,
        changed_fields, row_context, old_snapshot, new_snapshot, payload, metadata,
        total_delta, created_at
      )
      SELECT lower(hex(randomblob(16))), estimate_id, ?, project_id, NULL, NULL, NULL,
        'library_component_rows_synced', 'server_action', ? || ':estimate:' || estimate_id, ?,
        '["component","variant","source_snapshot"]',
        json_object('componentId', ?, 'rowCount', row_count), NULL,
        json_object('componentId', ?, 'componentVersionNumber', ?),
        json_object('componentId', ?, 'componentVersionNumber', ?, 'rowCount', row_count, 'rows', json(rows_json)),
        json_object('source', 'component-library-update', 'intentId', ?), NULL, ?
      FROM grouped
    `,
    values: [rowImpactJson, input.workspaceId, input.intentId, input.actorUserId, input.itemId, input.itemId, input.versionNumber, input.itemId, input.versionNumber, input.intentId, input.timestamp],
  }, {
    sql: `
      INSERT INTO activity_event_outbox (
        id, workspace_id, event_id, status, attempt_count, available_at, created_at, updated_at
      )
      SELECT lower(hex(randomblob(16))), ?, event.id, 'pending', 0, ?, ?, ?
      FROM estimate_sheet_events event
      WHERE event.workspace_id = ?
        AND event.event_type = 'library_component_rows_synced'
        AND json_extract(event.metadata, '$.intentId') = ?
      ON CONFLICT(event_id) DO NOTHING
    `,
    values: [input.workspaceId, input.timestamp, input.timestamp, input.timestamp, input.workspaceId, input.intentId],
  }, {
    sql: `
      UPDATE projects SET publication_source_revision = publication_source_revision + 1
      WHERE workspace_id = ?
        AND id IN (SELECT DISTINCT json_extract(value, '$.projectId') FROM json_each(?))
    `,
    values: [input.workspaceId, rowImpactJson],
  }];
}

export async function updateCostLibraryComponentInD1(
  database: D1DatabaseLike,
  input: {
    workspaceId: string;
    actorUserId: string;
    itemId: string;
    intentId: string;
    receiptIdentity: MutationReceiptIdentity;
    context: ComponentUpdateContext;
    component: ComponentMutationComponent;
    priceOptions: ComponentMutationPriceOption[];
    metadataJson: string;
    expectedUpdatedAt: string;
    expectedVersionNumber: number;
    expectedComponentImpactFingerprint: string;
    removedPriceOptionReplacements: Record<string, string>;
  },
): Promise<
  | { kind: "updated"; receipt: UpdateCostLibraryComponentReceiptResult; sync: LibraryComponentInstanceSyncResult }
  | { kind: "replayed"; receipt: UpdateCostLibraryComponentReceiptResult }
> {
  const nextVersion = numberValue(input.context.existing.current_version_number, 1) + 1;
  const timestamp = nowIso();
  const priceOptionPlans = input.priceOptions.map((priceOption) => buildComponentPriceOptionWritePlan({
    workspaceId: input.workspaceId,
    itemId: input.itemId,
    priceOption,
    userId: input.actorUserId,
    effectiveAt: priceOption.effectiveAt,
    writeHistory: false,
  }, { timestamp }));
  const persistedPriceOptions = priceOptionPlans.map((plan) => plan.persisted);
  const activePriceOption = persistedPriceOptions.find((option) => option.isDefault) ?? persistedPriceOptions[0];
  if (!activePriceOption) throw new Error("At least one active component variant is required.");
  const retainedPriceOptionIds = persistedPriceOptions.map((option) => option.id);
  const retainedPriceOptionIdSet = new Set(retainedPriceOptionIds);
  const retainedImageAssetIds = input.priceOptions.flatMap((option) => {
    const imageMetadata = readMetadataObject(option.imageMetadata);
    const assetId = imageMetadata.assetId;
    return typeof assetId === "string" && isUuid(assetId) ? [assetId] : [];
  });
  const removedPriceOptionIds = new Set(input.context.existingPriceOptionRows
    .filter((option) => readBoolean(option.is_active) && !retainedPriceOptionIdSet.has(option.id))
    .map((option) => option.id));
  for (const [removedId, replacementId] of Object.entries(input.removedPriceOptionReplacements)) {
    if (!removedPriceOptionIds.has(removedId)) throw new Error("A variant replacement targets a variant that is not being deleted.");
    if (!isUuid(replacementId) || !retainedPriceOptionIdSet.has(replacementId) || replacementId === removedId) {
      throw new Error("A deleted variant must be replaced with a different active variant from this component.");
    }
  }
  const syncOptions = persistedPriceOptions.map((option) => buildLibraryComponentSyncOption({
    id: option.id,
    label: option.label,
    unit: option.unit,
    unitCost: option.unitCost,
    miscCost: option.miscCost,
    currency: typeof option.snapshot.currency === "string" ? option.snapshot.currency : "PHP",
    isActive: option.isActive,
    isDefault: option.isDefault,
    pricingSource: option.pricingSource,
    pricingDate: option.pricingDate,
    thumbnailPath: option.thumbnailPath,
    brand: typeof option.snapshot.brand === "string" ? option.snapshot.brand : null,
    brandId: typeof option.snapshot.brandId === "string" ? option.snapshot.brandId : null,
    snapshot: option.snapshot,
  }));
  const sourcePriceOptions = syncOptions.map((option) => option.snapshot);
  const rowPlans = buildLinkedEstimateRowSyncPlans({
    rows: input.context.affectedRows,
    itemId: input.itemId,
    material: input.component.name,
    componentDescription: input.component.description,
    brand: input.component.brand,
    brandId: input.component.brandId,
    supplier: input.component.supplier,
    supplierId: input.component.supplierId,
    lifecycleState: input.component.lifecycleState,
    componentVersionNumber: nextVersion,
    componentThumbnailPath: input.component.thumbnailPath,
    priceOptions: syncOptions,
    defaultPriceOptionId: activePriceOption.id,
    removedPriceOptionReplacements: input.removedPriceOptionReplacements,
    updatedAt: timestamp,
  });
  const statements: D1Statement[] = [
    ...priceOptionPlans.flatMap((plan) => plan.guardStatements),
    {
      sql: `
        UPDATE cost_library_items
        SET name = ?, description = ?, category = ?, category_node_id = ?, library_folder_id = ?,
            supplier = ?, supplier_id = ?, brand = ?, brand_id = ?, unit = ?, thumbnail_path = ?,
            lifecycle_state = ?, current_version_number = ?, metadata_json = ?, updated_at = ?
        WHERE id = ? AND workspace_id = ?
      `,
      values: [
        input.component.name,
        input.component.description,
        input.component.category,
        input.component.categoryNodeId,
        input.component.libraryFolderId,
        input.component.supplier,
        input.component.supplierId,
        input.component.brand,
        input.component.brandId,
        input.component.unit,
        input.component.thumbnailPath,
        input.component.lifecycleState,
        nextVersion,
        input.metadataJson,
        timestamp,
        input.itemId,
        input.workspaceId,
      ],
    },
    {
      sql: `
        UPDATE upload_assets
        SET status = 'removed', updated_at = ?
        WHERE workspace_id = ?
          AND surface = 'component-image'
          AND status = 'finalized'
          AND id IN (
            SELECT json_extract(metadata_json, '$.imageMetadata.assetId')
            FROM cost_library_item_price_options
            WHERE workspace_id = ? AND item_id = ?
              AND json_type(metadata_json, '$.imageMetadata.assetId') = 'text'
          )
          AND id NOT IN (SELECT CAST(value AS TEXT) FROM json_each(?))
          AND NOT EXISTS (
            SELECT 1 FROM cost_library_item_price_options retained_option
            WHERE retained_option.workspace_id = ?
              AND retained_option.item_id <> ?
              AND json_extract(retained_option.metadata_json, '$.imageMetadata.assetId') = upload_assets.id
          )
      `,
      values: [timestamp, input.workspaceId, input.workspaceId, input.itemId, jsonText(retainedImageAssetIds, []), input.workspaceId, input.itemId],
    },
  ];
  for (const plan of priceOptionPlans) statements.push(...plan.statements);
  if (removedPriceOptionIds.size > 0) {
    const removedPriceOptionIdsJson = jsonText([...removedPriceOptionIds], []);
    statements.push({
      sql: `
        UPDATE upload_assets SET status = 'removed', updated_at = ?
        WHERE id IN (
          SELECT upload_asset_id FROM component_variant_attachments
          WHERE workspace_id = ? AND owner_scope = 'library' AND item_id = ?
            AND price_option_id IN (SELECT CAST(value AS TEXT) FROM json_each(?))
            AND upload_asset_id IS NOT NULL AND review_status <> 'superseded'
        )
      `,
      values: [timestamp, input.workspaceId, input.itemId, removedPriceOptionIdsJson],
    }, {
      sql: `
        UPDATE component_variant_attachments
        SET review_status = 'superseded', is_current_approved = 0, reviewed_by = ?, reviewed_at = ?,
            review_note = 'Variant removed from component', review_revision = review_revision + 1, updated_at = ?
        WHERE workspace_id = ? AND owner_scope = 'library' AND item_id = ?
          AND price_option_id IN (SELECT CAST(value AS TEXT) FROM json_each(?))
          AND review_status <> 'superseded'
      `,
      values: [input.actorUserId, timestamp, timestamp, input.workspaceId, input.itemId, removedPriceOptionIdsJson],
    });
  }
  statements.push({
    sql: `
      UPDATE cost_library_item_price_options
      SET is_active = 0, is_default = 0, updated_at = ?
      WHERE item_id = ? AND workspace_id = ?
        AND id NOT IN (SELECT CAST(value AS TEXT) FROM json_each(?))
    `,
    values: [timestamp, input.itemId, input.workspaceId, jsonText(retainedPriceOptionIds, [])],
  }, {
    sql: `
      UPDATE cost_library_items
      SET active_price_option_id = ?, unit = ?, unit_cost = ?, misc_cost = ?, pricing_source = ?, pricing_date = ?, updated_at = ?
      WHERE id = ? AND workspace_id = ?
    `,
    values: [activePriceOption.id, activePriceOption.unit, activePriceOption.unitCost, activePriceOption.miscCost, activePriceOption.pricingSource, activePriceOption.pricingDate, timestamp, input.itemId, input.workspaceId],
  }, {
    sql: `
      INSERT INTO cost_library_item_versions (
        id, item_id, workspace_id, version_number, snapshot_json, change_summary,
        change_reason, effective_at, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values: [randomUUID(), input.itemId, input.workspaceId, nextVersion, jsonText(componentSnapshot(input.component, { priceOptions: sourcePriceOptions })), "Component and variants updated", input.component.changeReason, input.component.effectiveAt, input.actorUserId, timestamp],
  });
  const syncStatementIndex = rowPlans.length > 0 ? statements.length : -1;
  if (rowPlans.length > 0) {
    statements.push(buildLinkedEstimateRowsSyncStatement({
      workspaceId: input.workspaceId,
      itemId: input.itemId,
      rowPlans,
      updatedAt: timestamp,
    }));
  }
  const receipt = buildUpdateReceipt({
    itemId: input.itemId,
    versionNumber: nextVersion,
    activePriceOptionId: activePriceOption.id,
    priceOptions: persistedPriceOptions.map((option) => ({ id: option.id, label: option.label, isDefault: option.isDefault })),
    updatedAt: timestamp,
    rowPlans,
  });
  statements.push(...buildUpdateFanOutStatements({
    workspaceId: input.workspaceId,
    itemId: input.itemId,
    versionNumber: nextVersion,
    actorUserId: input.actorUserId,
    intentId: input.intentId,
    rowPlans,
    timestamp,
  }));
  statements.push(buildCommittedMutationReceiptStatement({
    ...input.receiptIdentity,
    resourceType: "cost_library_component",
    resourceId: input.itemId,
    result: receipt,
    timestamp,
  }));
  assertD1MutationStatementLimit(statements.length + 2);
  let results: D1Result[];
  try {
    results = await runComponentRevisionGuardedBatch(database, statements, {
      workspaceId: input.workspaceId,
      itemId: input.itemId,
      expectedUpdatedAt: input.expectedUpdatedAt,
      expectedVersionNumber: input.expectedVersionNumber,
      expectedComponentImpactFingerprint: input.expectedComponentImpactFingerprint,
    });
  } catch (error) {
    const concurrentReceipt = await readUpdatedComponentReceiptInD1(database, input.receiptIdentity);
    if (concurrentReceipt) return { kind: "replayed", receipt: concurrentReceipt };
    throw error;
  }
  const sync: LibraryComponentInstanceSyncResult = syncStatementIndex >= 0
    ? buildLibraryComponentInstanceSyncResult(
        rowPlans,
        results[syncStatementIndex] as D1Result<{ id: string; row_revision: number | string }>,
      )
    : { affectedEstimates: [], rowRevisions: {}, rowPatches: {}, updatedRowCount: 0 };
  return { kind: "updated", receipt, sync };
}

function createBulkArchivePreviewHash(input: {
  eligibleIds: string[];
  blocked: unknown[];
  summary: Record<string, unknown>;
}) {
  return createHash("sha256")
    .update(JSON.stringify({
      targetType: "library_component",
      action: "archive",
      ids: input.eligibleIds,
      blocked: input.blocked,
      summary: input.summary,
    }))
    .digest("hex");
}

export async function previewBulkArchiveLibraryComponentsInD1(
  database: D1DatabaseLike,
  workspaceId: string,
  ids: string[],
) {
  const sortedIds = [...ids].sort();
  const rows: Array<{ id: string; name: string; lifecycle_state: string }> = [];
  for (const idBatch of chunkD1ComponentIds(sortedIds)) {
    rows.push(...await all<{ id: string; name: string; lifecycle_state: string }>(
      database,
      `
        SELECT id, name, lifecycle_state
        FROM cost_library_items
        WHERE workspace_id = ?
          AND id IN (${placeholders(idBatch)})
      `,
      [workspaceId, ...idBatch],
    ));
  }
  const byId = new Map(rows.map((row) => [row.id, row]));
  const eligibleIds: string[] = [];
  const blocked: Array<{ id: string; name?: string; code: string; message: string }> = [];
  for (const id of sortedIds) {
    const row = byId.get(id);
    if (!row) {
      blocked.push({ id, code: "not_found", message: "Component was not found in this workspace." });
      continue;
    }
    if (row.lifecycle_state === "archived") {
      blocked.push({ id, name: row.name, code: "blocked", message: "Component is already archived." });
      continue;
    }
    eligibleIds.push(id);
  }
  const summary = {
    requestedCount: sortedIds.length,
    eligibleCount: eligibleIds.length,
    blockedCount: blocked.length,
  };
  return {
    sortedIds,
    eligibleIds,
    blocked,
    summary,
    previewHash: createBulkArchivePreviewHash({ eligibleIds, blocked, summary }),
  };
}

export async function archiveLibraryComponentsInD1(
  database: D1DatabaseLike,
  input: { workspaceId: string; actorUserId: string; itemIds: string[] },
) {
  const timestamp = nowIso();
  await runBatch(database, chunkD1ComponentIds(input.itemIds).map((idBatch) => ({
    sql: `
      UPDATE cost_library_items
      SET lifecycle_state = 'archived',
          lifecycle_state_changed_at = ?,
          lifecycle_state_changed_by = ?,
          updated_at = ?
      WHERE workspace_id = ?
        AND id IN (${placeholders(idBatch)})
    `,
    values: [timestamp, input.actorUserId, timestamp, input.workspaceId, ...idBatch],
  })));
}

function getComponentPermanentDeleteOwners(impact: ComponentPermanentDeleteImpact): ComponentPermanentDeleteOwners {
  const affectedEstimateKeys = new Set<string>();
  const affectedEstimates: Array<{ estimateId: string; projectId: string }> = [];
  for (const row of impact.estimateRows) {
    const key = `${row.projectId}:${row.estimateId}`;
    if (affectedEstimateKeys.has(key)) continue;
    affectedEstimateKeys.add(key);
    affectedEstimates.push({ estimateId: row.estimateId, projectId: row.projectId });
  }
  return { affectedEstimates, hasTemplateRows: impact.templateRows.length > 0 };
}

export async function previewPermanentDeleteLibraryComponentsInD1(
  database: D1DatabaseLike,
  workspaceId: string,
  ids: string[],
) {
  const impact = await loadComponentPermanentDeleteImpact(database, workspaceId, ids);
  return buildComponentPermanentDeletePreview(impact);
}

export async function executePermanentDeleteLibraryComponentsInD1(
  database: D1DatabaseLike,
  input: {
    workspaceId: string;
    actorUserId: string;
    itemIds: string[];
    expectedPreviewHash: string;
    correlationId: string;
  },
): Promise<ComponentPermanentDeleteExecutionResult> {
  const replayReceipt = await readComponentPermanentDeleteReceipt(database, input.workspaceId, input.correlationId);
  if (replayReceipt) {
    const result = componentPermanentDeleteReceiptResult({
      actorUserId: input.actorUserId,
      expectedPreviewHash: input.expectedPreviewHash,
      itemIds: input.itemIds,
      receipt: replayReceipt,
    });
    return {
      kind: "existing_result",
      result,
      owners: result.ok ? getComponentPermanentDeleteReceiptOwners(replayReceipt) : undefined,
    };
  }

  let impact: ComponentPermanentDeleteImpact;
  try {
    impact = await loadComponentPermanentDeleteImpact(database, input.workspaceId, input.itemIds);
  } catch (error) {
    throw componentPermanentDeleteD1Error("impact", error);
  }
  const preview = buildComponentPermanentDeletePreview(impact);
  if (preview.previewHash !== input.expectedPreviewHash) {
    return {
      kind: "existing_result",
      result: {
        ...preview,
        ok: false,
        deletedIds: [],
        issues: [...preview.issues, { code: "stale_preview", message: "Preview changed; refresh the deletion preview." }],
      },
    };
  }
  if (!preview.ok || !preview.previewHash) {
    return { kind: "existing_result", result: { ...preview, deletedIds: [] } };
  }

  const eventId = randomUUID();
  const statements = buildComponentPermanentDeleteStatements({
    actorUserId: input.actorUserId,
    correlationId: input.correlationId,
    eventId,
    impact,
    preview,
    previewHash: preview.previewHash,
    timestamp: nowIso(),
  });
  assertD1MutationStatementLimit(statements.length);
  try {
    await runAtomicBatch(database, statements);
  } catch (error) {
    const committedReceipt = await readComponentPermanentDeleteReceipt(database, input.workspaceId, input.correlationId);
    if (!committedReceipt) throw componentPermanentDeleteD1Error("delete", error);
    const result = componentPermanentDeleteReceiptResult({
      actorUserId: input.actorUserId,
      expectedPreviewHash: input.expectedPreviewHash,
      itemIds: input.itemIds,
      receipt: committedReceipt,
    });
    return {
      kind: "existing_result",
      result,
      owners: result.ok ? getComponentPermanentDeleteReceiptOwners(committedReceipt) : undefined,
    };
  }

  return {
    kind: "fresh_commit",
    result: {
      ok: true,
      targetType: "library_component",
      ids: input.itemIds,
      deletedIds: preview.eligibleIds,
      auditEventId: eventId,
      previewHash: preview.previewHash,
      summary: preview.summary,
      issues: [],
      blocked: [],
      storageTargets: preview.storageTargets,
    },
    owners: getComponentPermanentDeleteOwners(impact),
  };
}
