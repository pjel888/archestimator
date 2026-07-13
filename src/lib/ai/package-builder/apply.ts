import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { isProviderBackedAiUserContext, type AiRequestUserContext } from "@/lib/ai/auth";
import { canEditEstimateInD1, isWorkspaceEditorInD1 } from "@/lib/authz/d1-access";
import { getCloudflareD1Database, type D1DatabaseLike, type D1Value } from "@/lib/cloudflare/d1";
import { isUuid } from "@/lib/ids";
import { ensureDefaultWorkspace } from "@/lib/repositories/workspace-repository";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { filterMap, filterMapBy } from "@/lib/util/array";
import {
  type PackageBuilderApplyRequest,
  type PackageBuilderComponentCreateDraft,
  type PackageBuilderDraft,
  type PackageBuilderNodeRenameDraft,
  type PackageBuilderTarget,
  type PackageBuilderRowDraft,
  type PackageBuilderRowReplacementDraft,
  type PackageBuilderTemplateRowCopyDraft,
  type PackageBuilderRowUpdateDraft,
  type PackageBuilderTreeNodeDraft,
} from "@/lib/ai/package-builder/schemas";

export type PackageBuilderApplyResult = {
  projectId: string | null;
  estimateId: string | null;
  selectedNodeId: string | null;
  createdNodeIds: Record<string, string>;
  insertedRowIds: string[];
  updatedRowIds?: string[];
  replacedRowIds?: string[];
  deletedRowIds?: string[];
  renamedNodeIds?: string[];
  createdComponentIds?: string[];
  createdComponentCount?: number;
  insertedTemplateRootNodeIds?: string[];
  insertedTemplateNodeCount?: number;
  insertedTemplateRowCount?: number;
  total: number;
  warnings: string[];
  recoveryStatus: "completed" | "idempotent_replay" | "partial";
  idempotencyKey: string;
  idempotentReplay: boolean;
  auditRunId: string;
};

type ApplyPackageBuilderDraftInput = PackageBuilderApplyRequest & {
  userContext: AiRequestUserContext;
  authorizationRunId: string;
  requestHost?: string | null;
  userAgent?: string | null;
};

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type LibraryValidationRow = {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  supplier: string | null;
  supplier_id: string | null;
  category: string;
  category_node_id: string | null;
  brand: string | null;
  brand_id: string | null;
  unit: string;
  unit_cost: number;
  misc_cost: number;
  lifecycle_state: string;
  current_version_number: number;
  active_price_option_id: string | null;
  pricing_date: string | null;
  pricing_source: string | null;
  thumbnail_path: string | null;
};

type PriceOptionValidationRow = {
  id: string;
  item_id: string;
  workspace_id: string;
  is_active: boolean;
  label: string;
  unit: string;
  unit_cost: number;
  misc_cost: number;
  currency: string;
  pricing_date: string | null;
  pricing_source: string | null;
  supplier_id: string | null;
  updated_at: string;
};

type LinkedLibraryDraftReference = {
  clientDraftId: string;
  sourceLibraryItemId?: string | null;
  priceOptionId?: string | null;
  priceOptionUpdatedAt?: string | null;
  sourceSnapshot?: Record<string, unknown> | null;
};

type EstimateNodeD1Row = {
  id: string;
  estimate_id: string;
  estimate_tab_id: string | null;
  parent_id: string | null;
  kind: "group" | "area";
  name: string;
  sort_order: number | string | null;
  metadata_json?: string | null;
};

type EstimateRowD1Row = {
  id: string;
  estimate_id: string;
  node_id: string | null;
  description: string | null;
  designation: string | null;
  discipline: string | null;
  material: string | null;
  supplier: string | null;
  supplier_id: string | null;
  quantity: number | string | null;
  quantity_base?: number | string | null;
  quantity_contingency_amount?: number | string | null;
  unit: string | null;
  unit_cost: number | string | null;
  misc_cost: number | string | null;
  contingency_percentage: number | string | null;
  adjustment_percentage?: number | string | null;
  source_snapshot_json: string | null;
  sort_order: number | string | null;
  row_revision?: number | string | null;
  category_node_id?: string | null;
  source_library_item_id?: string | null;
  link_state?: string | null;
  metadata_json?: string | null;
  updated_at?: string | null;
};

type EstimateRowInsertRecord = {
  id: string;
  estimate_id: string;
  node_id: string;
  sort_order: number;
  source_library_item_id: string | null;
  source_snapshot_json: string;
  category_node_id: string | null;
  supplier_id: string | null;
  material: string;
  description: string;
  supplier: string;
  unit: string;
  quantity: number;
  quantity_base?: number | null;
  quantity_contingency_amount?: number | null;
  unit_cost: number;
  contingency_percentage: number;
  adjustment_percentage: number;
  misc_cost: number;
  discipline: string;
  designation: string;
  metadata_json: string;
  link_state: string;
};

type ApplyCommandD1Row = {
  id: string;
  draft_hash: string;
  status: string;
  result_json: string | null;
};

const NIL_UUID = "00000000-0000-0000-0000-000000000000";

function nowIso() {
  return new Date().toISOString();
}

function normalizeD1Value(value: unknown): D1Value {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value instanceof ArrayBuffer) {
    return value;
  }
  if (value === undefined) return null;
  return JSON.stringify(value);
}

function toJsonString(value: unknown, fallback: Record<string, never> | never[] = {}) {
  if (typeof value === "string") return value;
  return JSON.stringify(value ?? fallback);
}

function placeholders(values: readonly unknown[]) {
  if (values.length === 0) throw new Error("At least one SQL placeholder is required.");
  return values.map(() => "?").join(", ");
}

async function requirePackageApplyD1Database() {
  const database = await getCloudflareD1Database();
  if (!database) {
    throw new Error("Cloudflare D1 ARCH_DB binding is required for package Apply.");
  }
  return database;
}

async function first<T>(database: D1DatabaseLike, sql: string, values: unknown[] = []) {
  return database.prepare<T>(sql).bind(...values.map(normalizeD1Value)).first<T>();
}

async function all<T>(database: D1DatabaseLike, sql: string, values: unknown[] = []) {
  const result = await database.prepare<T>(sql).bind(...values.map(normalizeD1Value)).all<T>();
  if (result.success === false) throw new Error("Cloudflare D1 package Apply read failed.");
  return result.results ?? [];
}

async function run(database: D1DatabaseLike, sql: string, values: unknown[] = []) {
  const result = await database.prepare(sql).bind(...values.map(normalizeD1Value)).run();
  if (result.success === false) throw new Error("Cloudflare D1 package Apply write failed.");
  return result;
}

async function runBatch(database: D1DatabaseLike, statements: Array<{ sql: string; values?: unknown[] }>) {
  if (statements.length === 0) return;
  if (database.batch) {
    const results = await database.batch(
      statements.map((statement) => database.prepare(statement.sql).bind(...(statement.values ?? []).map(normalizeD1Value))),
    );
    if (results.some((result) => result.success === false)) {
      throw new Error("Cloudflare D1 package Apply batch failed.");
    }
    return;
  }
  for (const statement of statements) await run(database, statement.sql, statement.values ?? []);
}

function buildAiMetadata(input: { draft: PackageBuilderDraft; idempotencyKey: string; draftHash: string }) {
  return {
    aiPackageBuilder: {
      draftId: input.draft.draftId,
      schemaVersion: input.draft.schemaVersion,
      draftHash: input.draftHash,
      idempotencyKey: input.idempotencyKey,
      source: "ask-flip",
    },
  } satisfies Record<string, Json>;
}

function validateTreeDraft(treeDraft: PackageBuilderTreeNodeDraft[]) {
  const ids = new Set<string>();
  for (const node of treeDraft) {
    if (ids.has(node.clientDraftId)) throw new Error(`Duplicate tree draft id: ${node.clientDraftId}`);
    ids.add(node.clientDraftId);
    if (!node.parentClientDraftId && node.kind !== "group") throw new Error("Root package tree nodes must be Group Nodes.");
  }

  for (const node of treeDraft) {
    if (node.parentClientDraftId && !ids.has(node.parentClientDraftId)) {
      throw new Error(`Tree node ${node.clientDraftId} references a missing parent.`);
    }
    if (node.kind === "area" && treeDraft.some((candidate) => candidate.parentClientDraftId === node.clientDraftId)) {
      throw new Error(`Area Node ${node.clientDraftId} cannot contain child nodes.`);
    }
  }
}

function validateRowsTargetAreas(draft: PackageBuilderDraft) {
  const areaIds = new Set(filterMapBy(draft.treeDraft, (node) => node.kind === "area", (node) => node.clientDraftId));
  for (const row of draft.rowDraft) {
    if (!areaIds.has(row.targetAreaClientDraftId)) throw new Error(`Row ${row.clientDraftId} must target an Area Node.`);
    if (row.sourceType === "template") {
      throw new Error(`Template row ${row.clientDraftId} cannot be applied until template-row Apply has its own contract.`);
    }
    if (row.sourceType === "allowance" && row.sourceLibraryItemId) {
      throw new Error(`Allowance row ${row.clientDraftId} cannot be applied as a real supplier-priced row.`);
    }
    if (row.sourceType === "library_item" && (!row.sourceLibraryItemId || !isUuid(row.sourceLibraryItemId))) {
      throw new Error(`Library row ${row.clientDraftId} must reference a real UUID-backed library item.`);
    }
  }
  for (const copy of draft.templateRowCopyDraft ?? []) {
    if (!areaIds.has(copy.targetAreaClientDraftId)) throw new Error(`Template row copy ${copy.clientDraftId} must target an Area Node.`);
    if (!isUuid(copy.sourceTemplateId) || !isUuid(copy.sourceTemplateRowId)) {
      throw new Error(`Template row copy ${copy.clientDraftId} must reference a real template row.`);
    }
  }
}

function readComponentVersionSnapshot(row: LinkedLibraryDraftReference) {
  const value = row.sourceSnapshot?.componentVersionNumber;
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isInteger(parsed) ? parsed : null;
}

async function validateLinkedLibraryRows({
  database,
  workspaceId,
  rows,
  replacements = [],
}: {
  database: D1DatabaseLike;
  workspaceId: string;
  rows: PackageBuilderRowDraft[];
  replacements?: PackageBuilderRowReplacementDraft[];
}) {
  const linkedRows: LinkedLibraryDraftReference[] = [
    ...rows.filter((row) => row.sourceType === "library_item"),
    ...replacements,
  ];
  const itemIds = Array.from(new Set(filterMap(linkedRows, (row) => row.sourceLibraryItemId || null)));
  if (itemIds.length === 0) {
    return { itemById: new Map<string, LibraryValidationRow>(), priceOptionById: new Map<string, PriceOptionValidationRow>() };
  }

  const items = await all<LibraryValidationRow>(
    database,
    `
      SELECT id, workspace_id, name, description, supplier, supplier_id, category, category_node_id, brand, brand_id, unit, unit_cost, misc_cost, lifecycle_state, current_version_number, active_price_option_id, NULL AS pricing_date, NULL AS pricing_source, NULL AS thumbnail_path
      FROM cost_library_items
      WHERE workspace_id = ?
        AND id IN (${placeholders(itemIds)})
    `,
    [workspaceId, ...itemIds],
  );

  const itemById = new Map(items.map((item) => [item.id, item]));
  for (const row of linkedRows) {
    const item = row.sourceLibraryItemId ? itemById.get(row.sourceLibraryItemId) : null;
    if (!item) throw new Error(`Library item for row ${row.clientDraftId} is not available in this workspace.`);
    if (item.lifecycle_state === "archived" || item.lifecycle_state === "discontinued") {
      throw new Error(`Library item for row ${row.clientDraftId} is not active.`);
    }
  }

  const priceOptionIds = Array.from(new Set(filterMap(linkedRows, (row) => row.priceOptionId || null)));
  const priceOptionById = new Map<string, PriceOptionValidationRow>();
  if (priceOptionIds.length > 0) {
    const priceOptions = await all<PriceOptionValidationRow>(
      database,
      `
        SELECT id, item_id, workspace_id, is_active, label, unit, unit_cost, misc_cost, currency, NULL AS pricing_date, pricing_source, supplier_id, updated_at
        FROM cost_library_item_price_options
        WHERE workspace_id = ?
          AND id IN (${placeholders(priceOptionIds)})
      `,
      [workspaceId, ...priceOptionIds],
    );
    for (const option of priceOptions) priceOptionById.set(option.id, option);
  }

  for (const row of linkedRows) {
    if (!row.priceOptionId) continue;
    if (!row.priceOptionUpdatedAt) {
      throw new Error(`Price option for row ${row.clientDraftId} is missing its confirmed timestamp.`);
    }
    const priceOption = priceOptionById.get(row.priceOptionId);
    if (!priceOption || !priceOption.is_active) throw new Error(`Price option for row ${row.clientDraftId} is stale or inactive.`);
    if (row.priceOptionUpdatedAt !== priceOption.updated_at) {
      throw new Error(`Draft hash is stale because price option changed for row ${row.clientDraftId}.`);
    }
  }

  for (const row of linkedRows.filter((candidate) => !candidate.priceOptionId)) {
    const item = row.sourceLibraryItemId ? itemById.get(row.sourceLibraryItemId) : null;
    const componentVersionNumber = readComponentVersionSnapshot(row);
    if (!item || componentVersionNumber === null) {
      throw new Error(`Library row ${row.clientDraftId} is missing its component version snapshot.`);
    }
    if (componentVersionNumber !== item.current_version_number) {
      throw new Error(`Draft hash is stale because component version changed for row ${row.clientDraftId}.`);
    }
  }

  return { itemById, priceOptionById };
}

function buildLibrarySourceSnapshot({
  row,
  item,
  priceOption,
}: {
  row: PackageBuilderRowDraft | PackageBuilderRowReplacementDraft;
  item: LibraryValidationRow;
  priceOption?: PriceOptionValidationRow;
}) {
  return {
    ...row.sourceSnapshot,
    sourceType: "library_item",
    sourceLibraryItemId: item.id,
    category: item.category,
    categoryNodeId: item.category_node_id,
    brand: item.brand,
    brandId: item.brand_id,
    componentVersionNumber: item.current_version_number,
    imageUrl: item.thumbnail_path,
    lifecycleState: item.lifecycle_state,
    priceOptionId: priceOption?.id ?? item.active_price_option_id,
    priceOptionLabel: priceOption?.label ?? null,
    priceOptionUpdatedAt: priceOption?.updated_at ?? null,
    pricingDate: priceOption?.pricing_date ?? item.pricing_date,
    pricingSource: priceOption?.pricing_source ?? item.pricing_source ?? "Component library",
    supplier: item.supplier,
    supplierId: priceOption?.supplier_id ?? item.supplier_id,
    unit: priceOption?.unit ?? item.unit,
    unit_cost: priceOption?.unit_cost ?? item.unit_cost,
    misc_cost: priceOption?.misc_cost ?? item.misc_cost,
    currency: priceOption?.currency ?? "PHP",
    snapshotPreservedAt: new Date().toISOString(),
  };
}

function buildRowInsert({
  draft,
  row,
  estimateId,
  persistedNodeId,
  sortOrder,
  itemById,
  priceOptionById,
  idempotencyKey,
}: {
  draft: PackageBuilderDraft;
  row: PackageBuilderRowDraft;
  estimateId: string;
  persistedNodeId: string;
  sortOrder: number;
  itemById: Map<string, LibraryValidationRow>;
  priceOptionById: Map<string, PriceOptionValidationRow>;
  idempotencyKey: string;
}): EstimateRowInsertRecord {
  const rowId = randomUUID();
  const priceOption = row.priceOptionId ? priceOptionById.get(row.priceOptionId) : undefined;
  const item = row.sourceLibraryItemId ? itemById.get(row.sourceLibraryItemId) : undefined;
  const unitCost = priceOption?.unit_cost ?? item?.unit_cost ?? row.unitCost;
  const miscCost = priceOption?.misc_cost ?? item?.misc_cost ?? row.miscCost;
  const unit = priceOption?.unit ?? item?.unit ?? row.unit;

  return {
    id: rowId,
    estimate_id: estimateId,
    node_id: persistedNodeId,
    sort_order: sortOrder,
    source_library_item_id: row.sourceType === "library_item" ? item?.id ?? null : null,
    source_snapshot_json: row.sourceType === "library_item" && item
      ? toJsonString(buildLibrarySourceSnapshot({ row, item, priceOption }))
      : toJsonString({
          ...row.sourceSnapshot,
          sourceType: "allowance",
          generatedBy: "ai-package-builder",
          notSupplierPriced: true,
          sourceLibraryItemId: null,
          snapshotPreservedAt: new Date().toISOString(),
        }),
    category_node_id: item?.category_node_id ?? null,
    supplier_id: priceOption?.supplier_id ?? item?.supplier_id ?? null,
    material: row.material,
    description: row.description,
    supplier: row.sourceType === "library_item" ? item?.supplier ?? row.supplier ?? "" : "",
    unit,
    quantity: row.quantity,
    unit_cost: unitCost,
    contingency_percentage: 0,
    adjustment_percentage: row.contingencyPercentage,
    misc_cost: miscCost,
    discipline: "",
    designation: row.sourceType === "allowance" ? "AI allowance" : "",
    metadata_json: toJsonString({
      aiPackageBuilder: {
        draftId: draft.draftId,
        clientDraftId: row.clientDraftId,
        sourceType: row.sourceType,
        idempotencyKey,
        allowance: row.sourceType === "allowance",
      },
      assumption: row.assumption,
      warnings: row.warnings,
    }),
    link_state: row.sourceType === "library_item" ? "linked-clean" : "unlinked",
  };
}

function buildTemplateRowCopyInsert({
  draft,
  copy,
  estimateId,
  persistedNodeId,
  sortOrder,
  idempotencyKey,
}: {
  draft: PackageBuilderDraft;
  copy: PackageBuilderTemplateRowCopyDraft;
  estimateId: string;
  persistedNodeId: string;
  sortOrder: number;
  idempotencyKey: string;
}): EstimateRowInsertRecord {
  return {
    id: randomUUID(),
    estimate_id: estimateId,
    node_id: persistedNodeId,
    sort_order: sortOrder,
    source_library_item_id: null,
    source_snapshot_json: toJsonString({
      ...copy.sourceSnapshot,
      sourceType: "estimate_template_row",
      sourceTemplateId: copy.sourceTemplateId,
      sourceTemplateRowId: copy.sourceTemplateRowId,
      sourceTemplateName: copy.sourceTemplateName,
      sourceTemplateAreaName: copy.sourceTemplateAreaName,
      generatedBy: "ai-package-builder",
      notSupplierPriced: true,
      sourceLibraryItemId: null,
      snapshotPreservedAt: new Date().toISOString(),
    }),
    category_node_id: null,
    supplier_id: null,
    material: copy.material,
    description: copy.description,
    supplier: copy.supplier ?? "",
    unit: copy.unit,
    quantity: copy.quantity,
    unit_cost: copy.unitCost,
    contingency_percentage: 0,
    adjustment_percentage: copy.contingencyPercentage,
    misc_cost: copy.miscCost,
    discipline: "",
    designation: "AI template row",
    metadata_json: toJsonString({
      aiPackageBuilder: {
        draftId: draft.draftId,
        clientDraftId: copy.clientDraftId,
        sourceType: "template_row",
        sourceTemplateId: copy.sourceTemplateId,
        sourceTemplateRowId: copy.sourceTemplateRowId,
        idempotencyKey,
        allowance: true,
      },
      warnings: copy.warnings,
    }),
    link_state: "unlinked",
  };
}

function buildRowReplacementPayload({
  draft,
  replacement,
  itemById,
  priceOptionById,
  idempotencyKey,
}: {
  draft: PackageBuilderDraft;
  replacement: PackageBuilderRowReplacementDraft;
  itemById: Map<string, LibraryValidationRow>;
  priceOptionById: Map<string, PriceOptionValidationRow>;
  idempotencyKey: string;
}) {
  const item = itemById.get(replacement.sourceLibraryItemId);
  if (!item) throw new Error(`Library item for row replacement ${replacement.clientDraftId} is not available in this workspace.`);
  const priceOption = replacement.priceOptionId ? priceOptionById.get(replacement.priceOptionId) : undefined;
  const unitCost = priceOption?.unit_cost ?? item.unit_cost ?? replacement.unitCost;
  const miscCost = priceOption?.misc_cost ?? item.misc_cost ?? replacement.miscCost;
  const unit = priceOption?.unit ?? item.unit ?? replacement.unit;

  return {
    sourceLibraryItemId: item.id,
    sourceSnapshot: buildLibrarySourceSnapshot({ row: replacement, item, priceOption }),
    categoryNodeId: item.category_node_id ?? null,
    supplierId: priceOption?.supplier_id ?? item.supplier_id ?? null,
    material: replacement.material,
    description: replacement.description,
    supplier: item.supplier ?? replacement.supplier ?? "",
    unit,
    quantity: replacement.quantity,
    unitCost,
    contingencyPercentage: 0,
    adjustmentPercentage: replacement.adjustmentPercentage ?? replacement.contingencyPercentage,
    miscCost,
    discipline: "",
    designation: "",
    metadata: {
      aiPackageBuilder: {
        draftId: draft.draftId,
        clientDraftId: replacement.clientDraftId,
        sourceType: "library_item",
        idempotencyKey,
        replacement: true,
      },
      warnings: replacement.warnings,
    },
    linkState: "linked-clean",
  };
}

function deterministicUuid(input: string) {
  const bytes = Buffer.from(createHash("sha256").update(input).digest().subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function toEstimateRowInsertPayload(rowInsert: EstimateRowInsertRecord) {
  return {
    id: rowInsert.id,
    sortOrder: rowInsert.sort_order,
    sourceLibraryItemId: rowInsert.source_library_item_id,
    sourceSnapshot: readJsonRecord(rowInsert.source_snapshot_json),
    categoryNodeId: rowInsert.category_node_id,
    supplierId: rowInsert.supplier_id,
    material: rowInsert.material,
    description: rowInsert.description,
    supplier: rowInsert.supplier,
    unit: rowInsert.unit,
    quantity: rowInsert.quantity,
    quantityBase: rowInsert.quantity_base,
    quantityContingencyAmount: rowInsert.quantity_contingency_amount,
    unitCost: rowInsert.unit_cost,
    contingencyPercentage: rowInsert.contingency_percentage,
    adjustmentPercentage: rowInsert.adjustment_percentage,
    miscCost: rowInsert.misc_cost,
    discipline: rowInsert.discipline,
    designation: rowInsert.designation,
    linkState: rowInsert.link_state,
    metadata: readJsonRecord(rowInsert.metadata_json),
  };
}

function readRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readJsonRecord(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return readRecord(JSON.parse(value));
    } catch {
      return {};
    }
  }
  return readRecord(value);
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function readNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readBoolean(value: unknown) {
  return value === true;
}

function markIdempotentReplay<T extends { idempotent: boolean }>(result: T): T & { idempotent: true } {
  return Object.assign(result, { idempotent: true as const });
}

function parseEstimateRowInsertResult(value: unknown) {
  const record = readRecord(value);
  return {
    rowId: readString(record.rowId),
    nodeId: readString(record.nodeId),
    idempotent: readBoolean(record.idempotent),
  };
}

function parseEstimateRowUpdateResult(value: unknown) {
  const record = readRecord(value);
  const row = readRecord(record.row);
  return {
    rowId: readString(record.rowId ?? row.id),
    nodeId: readString(row.nodeId),
    idempotent: readBoolean(record.idempotent),
  };
}

function parseEstimateRowDeleteResult(value: unknown) {
  const record = readRecord(value);
  const deletedRow = readRecord(record.deletedRow);
  return {
    rowId: readString(record.rowId ?? deletedRow.id),
    nodeId: readString(deletedRow.nodeId ?? deletedRow.node_id),
    idempotent: readBoolean(record.idempotent),
  };
}

function parseEstimateNodeCreateResult(value: unknown) {
  const record = readRecord(value);
  return {
    nodeId: readString(record.nodeId),
    idempotent: readBoolean(record.idempotent),
  };
}

function parseEstimateNodeRenameResult(value: unknown) {
  const record = readRecord(value);
  return {
    nodeId: readString(record.nodeId),
    idempotent: readBoolean(record.idempotent),
  };
}

function parseEstimateTemplateInsertResult(value: unknown) {
  const record = readRecord(value);
  const rootIds = readStringArray(record.inserted_root_node_ids);
  return {
    insertedRootNodeIds: rootIds,
    insertedNodeCount: readNumber(record.inserted_node_count),
    insertedRowCount: readNumber(record.inserted_row_item_count),
    idempotent: readBoolean(record.idempotent),
  };
}

function parseComponentCreateApplyResult(value: unknown): PackageBuilderApplyResult {
  const record = readRecord(value);
  const createdNodeIds = readRecord(record.createdNodeIds);
  const normalizedNodeIds = Object.fromEntries(
    Object.entries(createdNodeIds).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
  return {
    projectId: typeof record.projectId === "string" ? record.projectId : null,
    estimateId: typeof record.estimateId === "string" ? record.estimateId : null,
    selectedNodeId: typeof record.selectedNodeId === "string" ? record.selectedNodeId : null,
    createdNodeIds: normalizedNodeIds,
    insertedRowIds: readStringArray(record.insertedRowIds),
    updatedRowIds: Array.isArray(record.updatedRowIds) ? readStringArray(record.updatedRowIds) : [],
    replacedRowIds: Array.isArray(record.replacedRowIds) ? readStringArray(record.replacedRowIds) : [],
    deletedRowIds: Array.isArray(record.deletedRowIds) ? readStringArray(record.deletedRowIds) : [],
    createdComponentIds: readStringArray(record.createdComponentIds),
    createdComponentCount: readNumber(record.createdComponentCount),
    insertedTemplateRootNodeIds: [],
    insertedTemplateNodeCount: 0,
    insertedTemplateRowCount: 0,
    total: readNumber(record.total),
    warnings: readStringArray(record.warnings),
    recoveryStatus: record.recoveryStatus === "idempotent_replay" || record.recoveryStatus === "partial" ? record.recoveryStatus : "completed",
    idempotencyKey: readString(record.idempotencyKey),
    idempotentReplay: record.idempotentReplay === true,
    auditRunId: readString(record.auditRunId),
  };
}

function parsePackageApplyResult(value: unknown): PackageBuilderApplyResult {
  const record = readRecord(value);
  const createdNodeIds = readRecord(record.createdNodeIds);
  const normalizedNodeIds = Object.fromEntries(
    Object.entries(createdNodeIds).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
  return {
    projectId: typeof record.projectId === "string" ? record.projectId : null,
    estimateId: typeof record.estimateId === "string" ? record.estimateId : null,
    selectedNodeId: typeof record.selectedNodeId === "string" ? record.selectedNodeId : null,
    createdNodeIds: normalizedNodeIds,
    insertedRowIds: readStringArray(record.insertedRowIds),
    updatedRowIds: Array.isArray(record.updatedRowIds) ? readStringArray(record.updatedRowIds) : [],
    replacedRowIds: Array.isArray(record.replacedRowIds) ? readStringArray(record.replacedRowIds) : [],
    deletedRowIds: Array.isArray(record.deletedRowIds) ? readStringArray(record.deletedRowIds) : [],
    createdComponentIds: Array.isArray(record.createdComponentIds) ? readStringArray(record.createdComponentIds) : [],
    createdComponentCount: readNumber(record.createdComponentCount),
    insertedTemplateRootNodeIds: Array.isArray(record.insertedTemplateRootNodeIds) ? readStringArray(record.insertedTemplateRootNodeIds) : [],
    insertedTemplateNodeCount: readNumber(record.insertedTemplateNodeCount),
    insertedTemplateRowCount: readNumber(record.insertedTemplateRowCount),
    total: readNumber(record.total),
    warnings: readStringArray(record.warnings),
    recoveryStatus: record.recoveryStatus === "idempotent_replay" || record.recoveryStatus === "partial" ? record.recoveryStatus : "completed",
    idempotencyKey: readString(record.idempotencyKey),
    idempotentReplay: record.idempotentReplay === true,
    auditRunId: readString(record.auditRunId),
  };
}

async function beginApplyCommand({
  database,
  workspaceId,
  commandKind,
  draftId,
  draftHash,
  idempotencyKey,
  actorUserId,
  authorizationRunId,
  conflictLabel,
}: {
  database: D1DatabaseLike;
  workspaceId: string;
  commandKind: "project_estimate_package" | "fill_current_estimate" | "library_components_package";
  draftId: string;
  draftHash: string;
  idempotencyKey: string;
  actorUserId: string;
  authorizationRunId: string;
  conflictLabel: "package" | "component";
}) {
  const existing = await first<ApplyCommandD1Row>(
    database,
    `
      SELECT id, draft_hash, status, result_json
      FROM ai_package_apply_commands
      WHERE workspace_id = ?
        AND idempotency_key = ?
      LIMIT 1
    `,
    [workspaceId, idempotencyKey],
  );
  if (existing) {
    if (existing.draft_hash !== draftHash) {
      throw new Error(`Idempotency key already belongs to a different ${conflictLabel} draft.`);
    }
    if (existing.status === "completed" && existing.result_json) {
      return {
        commandId: existing.id,
        replayResult: {
          ...parsePackageApplyResult(readJsonRecord(existing.result_json)),
          recoveryStatus: "idempotent_replay" as const,
          idempotentReplay: true,
          auditRunId: authorizationRunId,
        },
      };
    }
    if (existing.status === "failed") {
      throw new Error("Package Apply command previously failed. Use a new idempotency key after reviewing side effects.");
    }
    throw new Error("Package Apply command is already in progress. Retry after the current Apply completes.");
  }

  const commandId = randomUUID();
  const timestamp = nowIso();
  await run(
    database,
    `
      INSERT INTO ai_package_apply_commands (
        id,
        workspace_id,
        idempotency_key,
        command_kind,
        draft_id,
        draft_hash,
        status,
        actor_user_id,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'started', ?, ?)
    `,
    [commandId, workspaceId, idempotencyKey, commandKind, draftId, draftHash, actorUserId, timestamp],
  );
  return { commandId, replayResult: null };
}

async function failApplyCommand(database: D1DatabaseLike, commandId: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Package Apply failed.";
  await run(
    database,
    `
      UPDATE ai_package_apply_commands
      SET status = 'failed',
          failure_json = ?,
          completed_at = ?
      WHERE id = ?
        AND status = 'started'
    `,
    [{ message }, nowIso(), commandId],
  );
}

async function completeApplyCommand({
  database,
  commandId,
  result,
}: {
  database: D1DatabaseLike;
  commandId: string;
  result: PackageBuilderApplyResult;
}) {
  await run(
    database,
    `
      UPDATE ai_package_apply_commands
      SET status = 'completed',
          project_id = ?,
          estimate_id = ?,
          selected_node_id = ?,
          created_node_ids_json = ?,
          inserted_row_ids_json = ?,
          result_json = ?,
          completed_at = ?
      WHERE id = ?
    `,
    [
      result.projectId,
      result.estimateId,
      result.selectedNodeId,
      result.createdNodeIds,
      result.insertedRowIds,
      result,
      nowIso(),
      commandId,
    ],
  );
}

async function readCommittedEstimateEvent(database: D1DatabaseLike, estimateId: string, correlationId: string) {
  const event = await first<{ payload: string | null }>(
    database,
    `
      SELECT payload
      FROM estimate_sheet_events
      WHERE estimate_id = ?
        AND correlation_id = ?
      LIMIT 1
    `,
    [estimateId, correlationId],
  );
  return event ? readJsonRecord(event.payload) : null;
}

async function readEstimateContext(database: D1DatabaseLike, estimateId: string) {
  return first<{ id: string; project_id: string; workspace_id: string }>(
    database,
    `
      SELECT estimate.id, estimate.project_id, project.workspace_id
      FROM estimates estimate
      JOIN projects project ON project.id = estimate.project_id
      WHERE estimate.id = ?
      LIMIT 1
    `,
    [estimateId],
  );
}

async function insertEstimateEvent(database: D1DatabaseLike, input: {
  estimateId: string;
  workspaceId: string;
  projectId: string;
  estimateNodeId?: string | null;
  estimateTabId?: string | null;
  targetRowId?: string | null;
  eventType: string;
  correlationId: string;
  actorUserId: string;
  changedFields?: string[];
  rowContext?: Record<string, unknown>;
  oldSnapshot?: unknown;
  newSnapshot?: unknown;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  totalDelta?: number | null;
}) {
  await run(
    database,
    `
      INSERT INTO estimate_sheet_events (
        id,
        estimate_id,
        workspace_id,
        project_id,
        estimate_node_id,
        estimate_tab_id,
        target_row_id,
        event_type,
        event_source,
        correlation_id,
        actor_user_id,
        changed_fields,
        row_context,
        old_snapshot,
        new_snapshot,
        payload,
        metadata,
        total_delta,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'server_action', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      randomUUID(),
      input.estimateId,
      input.workspaceId,
      input.projectId,
      input.estimateNodeId ?? null,
      input.estimateTabId ?? null,
      input.targetRowId ?? null,
      input.eventType,
      input.correlationId,
      input.actorUserId,
      input.changedFields ?? [],
      input.rowContext ?? {},
      input.oldSnapshot === undefined ? null : input.oldSnapshot,
      input.newSnapshot === undefined ? null : input.newSnapshot,
      input.payload,
      input.metadata ?? {},
      input.totalDelta ?? null,
      nowIso(),
    ],
  );
}

async function insertEstimateRowRecord(database: D1DatabaseLike, row: EstimateRowInsertRecord) {
  const timestamp = nowIso();
  await run(
    database,
    `
      INSERT INTO estimate_row_items (
        id,
        estimate_id,
        node_id,
        description,
        designation,
        discipline,
        material,
        supplier,
        supplier_id,
        quantity,
        quantity_base,
        quantity_contingency_amount,
        unit,
        unit_cost,
        misc_cost,
        contingency_percentage,
        adjustment_percentage,
        source_snapshot_json,
        sort_order,
        row_revision,
        category_node_id,
        source_library_item_id,
        link_state,
        metadata_json,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
    `,
    [
      row.id,
      row.estimate_id,
      row.node_id,
      row.description,
      row.designation,
      row.discipline,
      row.material,
      row.supplier,
      row.supplier_id,
      row.quantity,
      row.quantity_base ?? null,
      row.quantity_contingency_amount ?? null,
      row.unit,
      row.unit_cost,
      row.misc_cost,
      row.contingency_percentage,
      row.adjustment_percentage,
      row.source_snapshot_json,
      row.sort_order,
      row.category_node_id,
      row.source_library_item_id,
      row.link_state,
      row.metadata_json,
      timestamp,
      timestamp,
    ],
  );
}

function readRowNodeId(value: unknown) {
  const record = readRecord(value);
  return readString(record.nodeId ?? record.node_id);
}

async function createEstimateNodeInD1(database: D1DatabaseLike, input: {
  projectId: string;
  estimateId: string;
  parentNodeId: string | null;
  nodeKind: "group" | "area";
  nodeName: string;
  initialSortOrder: number;
  actingUserId: string;
  correlationId: string;
  targetTabId?: string | null;
}) {
  const committed = await readCommittedEstimateEvent(database, input.estimateId, input.correlationId);
  if (committed) return markIdempotentReplay(parseEstimateNodeCreateResult(committed));

  const context = await readEstimateContext(database, input.estimateId);
  if (!context || context.project_id !== input.projectId) throw new Error("Target estimate was not found for package Apply.");
  const parent = input.parentNodeId
    ? await first<EstimateNodeD1Row>(
      database,
      `
        SELECT id, estimate_id, estimate_tab_id, parent_id, kind, name, sort_order
        FROM estimate_nodes
        WHERE id = ?
          AND estimate_id = ?
        LIMIT 1
      `,
      [input.parentNodeId, input.estimateId],
    )
    : null;
  if (input.parentNodeId && !parent) throw new Error("Parent estimate node was not found for package Apply.");

  const nodeId = randomUUID();
  const estimateTabId = input.targetTabId ?? parent?.estimate_tab_id ?? null;
  const timestamp = nowIso();
  await runBatch(database, [
    {
      sql: `
        INSERT INTO estimate_nodes (
          id, estimate_id, estimate_tab_id, parent_id, kind, name, sort_order, metadata_json, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      values: [
        nodeId,
        input.estimateId,
        estimateTabId,
        input.parentNodeId,
        input.nodeKind,
        input.nodeName,
        input.initialSortOrder,
        { aiPackageBuilder: { correlationId: input.correlationId } },
        timestamp,
        timestamp,
      ],
    },
  ]);
  const payload = { nodeId, idempotent: false };
  await insertEstimateEvent(database, {
    estimateId: input.estimateId,
    workspaceId: context.workspace_id,
    projectId: input.projectId,
    estimateNodeId: nodeId,
    estimateTabId,
    eventType: "estimate_node_created",
    correlationId: input.correlationId,
    actorUserId: input.actingUserId,
    changedFields: ["estimate_nodes"],
    rowContext: { nodeId, parentNodeId: input.parentNodeId, kind: input.nodeKind, name: input.nodeName },
    payload,
    metadata: { source: "ai-package-builder-apply" },
  });
  return payload;
}

async function renameEstimateNodeInD1(database: D1DatabaseLike, input: {
  projectId: string;
  estimateId: string;
  nodeId: string;
  nextName: string;
  actingUserId: string;
  correlationId: string;
}) {
  const committed = await readCommittedEstimateEvent(database, input.estimateId, input.correlationId);
  if (committed) return markIdempotentReplay(parseEstimateNodeRenameResult(committed));

  const context = await readEstimateContext(database, input.estimateId);
  if (!context || context.project_id !== input.projectId) throw new Error("Target estimate was not found for package Apply.");
  const node = await first<EstimateNodeD1Row>(
    database,
    `
      SELECT id, estimate_id, estimate_tab_id, parent_id, kind, name, sort_order
      FROM estimate_nodes
      WHERE id = ?
        AND estimate_id = ?
      LIMIT 1
    `,
    [input.nodeId, input.estimateId],
  );
  if (!node) throw new Error("Estimate node was not found for package Apply.");
  await run(
    database,
    `
      UPDATE estimate_nodes
      SET name = ?,
          updated_at = ?
      WHERE id = ?
        AND estimate_id = ?
    `,
    [input.nextName, nowIso(), input.nodeId, input.estimateId],
  );
  const payload = { nodeId: input.nodeId, idempotent: false };
  await insertEstimateEvent(database, {
    estimateId: input.estimateId,
    workspaceId: context.workspace_id,
    projectId: input.projectId,
    estimateNodeId: input.nodeId,
    estimateTabId: node.estimate_tab_id,
    eventType: "estimate_node_renamed",
    correlationId: input.correlationId,
    actorUserId: input.actingUserId,
    changedFields: ["name"],
    oldSnapshot: { name: node.name },
    newSnapshot: { name: input.nextName },
    payload,
    metadata: { source: "ai-package-builder-apply" },
  });
  return payload;
}

async function insertEstimateRowInD1(database: D1DatabaseLike, input: {
  projectId: string;
  estimateId: string;
  targetNodeId: string;
  rowPayload: ReturnType<typeof toEstimateRowInsertPayload>;
  actingUserId: string;
  correlationId: string;
}) {
  const committed = await readCommittedEstimateEvent(database, input.estimateId, input.correlationId);
  if (committed) return markIdempotentReplay(parseEstimateRowInsertResult(committed));

  const [context, node] = await Promise.all([
    readEstimateContext(database, input.estimateId),
    first<EstimateNodeD1Row>(
      database,
      `
        SELECT id, estimate_id, estimate_tab_id, parent_id, kind, name, sort_order
        FROM estimate_nodes
        WHERE id = ?
          AND estimate_id = ?
        LIMIT 1
      `,
      [input.targetNodeId, input.estimateId],
    ),
  ]);
  if (!context || context.project_id !== input.projectId) throw new Error("Target estimate was not found for package Apply.");
  if (!node) throw new Error("Target estimate node was not found for package Apply.");

  const row: EstimateRowInsertRecord = {
    id: readString(input.rowPayload.id) || randomUUID(),
    estimate_id: input.estimateId,
    node_id: input.targetNodeId,
    sort_order: readNumber(input.rowPayload.sortOrder),
    source_library_item_id: typeof input.rowPayload.sourceLibraryItemId === "string" ? input.rowPayload.sourceLibraryItemId : null,
    source_snapshot_json: toJsonString(input.rowPayload.sourceSnapshot),
    category_node_id: typeof input.rowPayload.categoryNodeId === "string" ? input.rowPayload.categoryNodeId : null,
    supplier_id: typeof input.rowPayload.supplierId === "string" ? input.rowPayload.supplierId : null,
    material: readString(input.rowPayload.material),
    description: readString(input.rowPayload.description),
    supplier: readString(input.rowPayload.supplier),
    unit: readString(input.rowPayload.unit),
    quantity: readNumber(input.rowPayload.quantity),
    quantity_base: input.rowPayload.quantityBase === undefined ? null : readNumber(input.rowPayload.quantityBase),
    quantity_contingency_amount: input.rowPayload.quantityContingencyAmount === undefined ? null : readNumber(input.rowPayload.quantityContingencyAmount),
    unit_cost: readNumber(input.rowPayload.unitCost),
    contingency_percentage: readNumber(input.rowPayload.contingencyPercentage),
    adjustment_percentage: readNumber(input.rowPayload.adjustmentPercentage),
    misc_cost: readNumber(input.rowPayload.miscCost),
    discipline: readString(input.rowPayload.discipline),
    designation: readString(input.rowPayload.designation),
    metadata_json: toJsonString(input.rowPayload.metadata),
    link_state: readString(input.rowPayload.linkState) || "unlinked",
  };
  await insertEstimateRowRecord(database, row);
  const payload = { rowId: row.id, nodeId: input.targetNodeId, idempotent: false };
  await insertEstimateEvent(database, {
    estimateId: input.estimateId,
    workspaceId: context.workspace_id,
    projectId: input.projectId,
    estimateNodeId: input.targetNodeId,
    estimateTabId: node.estimate_tab_id,
    targetRowId: row.id,
    eventType: "estimate_row_inserted",
    correlationId: input.correlationId,
    actorUserId: input.actingUserId,
    changedFields: ["estimate_row_items"],
    rowContext: { rowId: row.id, material: row.material },
    newSnapshot: row,
    payload,
    metadata: { source: "ai-package-builder-apply" },
    totalDelta: readNumber(row.quantity) * readNumber(row.unit_cost) + readNumber(row.misc_cost),
  });
  return payload;
}

function d1RowPatch(update: PackageBuilderRowUpdateDraft) {
  const patch = toRowUpdatePatch(update);
  const next: Record<string, unknown> = {};
  if ("material" in patch) next.material = patch.material;
  if ("description" in patch) next.description = patch.description;
  if ("supplier" in patch) next.supplier = patch.supplier;
  if ("unit" in patch) next.unit = patch.unit;
  if ("quantity" in patch) next.quantity = patch.quantity;
  if ("unitCost" in patch) next.unit_cost = patch.unitCost;
  if ("miscCost" in patch) next.misc_cost = patch.miscCost;
  if ("adjustmentPercentage" in patch) next.adjustment_percentage = patch.adjustmentPercentage;
  if ("contingencyPercentage" in patch) next.contingency_percentage = patch.contingencyPercentage;
  if ("designation" in patch) next.designation = patch.designation;
  if ("discipline" in patch) next.discipline = patch.discipline;
  return next;
}

async function updateEstimateRowInD1(database: D1DatabaseLike, input: {
  projectId: string;
  estimateId: string;
  targetRowId: string;
  expectedRowRevision: number;
  rowPatch: Record<string, unknown>;
  actingUserId: string;
  correlationId: string;
}) {
  const committed = await readCommittedEstimateEvent(database, input.estimateId, input.correlationId);
  if (committed) return markIdempotentReplay(parseEstimateRowUpdateResult(committed));

  const [context, row] = await Promise.all([
    readEstimateContext(database, input.estimateId),
    first<EstimateRowD1Row>(
      database,
      `
        SELECT *
        FROM estimate_row_items
        WHERE id = ?
          AND estimate_id = ?
        LIMIT 1
      `,
      [input.targetRowId, input.estimateId],
    ),
  ]);
  if (!context || context.project_id !== input.projectId) throw new Error("Target estimate was not found for package Apply.");
  if (!row) throw new Error("Estimate row was not found for package Apply.");
  if (readNumber(row.row_revision) !== input.expectedRowRevision) throw new Error("estimate_sheet_row_revision_conflict");

  const entries = Object.entries(input.rowPatch).filter(([, value]) => value !== undefined);
  if (entries.length > 0) {
    await run(
      database,
      `
        UPDATE estimate_row_items
        SET ${entries.map(([column]) => `${column} = ?`).join(", ")},
            row_revision = row_revision + 1,
            updated_at = ?
        WHERE id = ?
          AND estimate_id = ?
      `,
      [...entries.map(([, value]) => value), nowIso(), input.targetRowId, input.estimateId],
    );
  }
  const payload = {
    rowId: input.targetRowId,
    nodeId: row.node_id ?? "",
    row: { id: input.targetRowId, nodeId: row.node_id },
    idempotent: false,
  };
  await insertEstimateEvent(database, {
    estimateId: input.estimateId,
    workspaceId: context.workspace_id,
    projectId: input.projectId,
    estimateNodeId: row.node_id,
    targetRowId: input.targetRowId,
    eventType: "estimate_row_updated",
    correlationId: input.correlationId,
    actorUserId: input.actingUserId,
    changedFields: entries.map(([column]) => column),
    oldSnapshot: row,
    newSnapshot: input.rowPatch,
    payload,
    metadata: { source: "ai-package-builder-apply" },
  });
  return payload;
}

function replacementPayloadToD1Patch(replacement: ReturnType<typeof buildRowReplacementPayload>) {
  return {
    source_library_item_id: replacement.sourceLibraryItemId,
    source_snapshot_json: toJsonString(replacement.sourceSnapshot),
    category_node_id: replacement.categoryNodeId,
    supplier_id: replacement.supplierId,
    material: replacement.material,
    description: replacement.description,
    supplier: replacement.supplier,
    unit: replacement.unit,
    quantity: replacement.quantity,
    unit_cost: replacement.unitCost,
    contingency_percentage: replacement.contingencyPercentage,
    adjustment_percentage: replacement.adjustmentPercentage,
    misc_cost: replacement.miscCost,
    discipline: replacement.discipline,
    designation: replacement.designation,
    metadata_json: toJsonString(replacement.metadata),
    link_state: replacement.linkState,
  };
}

async function replaceEstimateRowInD1(database: D1DatabaseLike, input: {
  projectId: string;
  estimateId: string;
  targetRowId: string;
  expectedRowRevision: number;
  replacementPayload: ReturnType<typeof buildRowReplacementPayload>;
  actingUserId: string;
  correlationId: string;
}) {
  const patch = replacementPayloadToD1Patch(input.replacementPayload);
  const result = await updateEstimateRowInD1(database, {
    projectId: input.projectId,
    estimateId: input.estimateId,
    targetRowId: input.targetRowId,
    expectedRowRevision: input.expectedRowRevision,
    rowPatch: patch,
    actingUserId: input.actingUserId,
    correlationId: input.correlationId,
  });
  return result;
}

async function deleteEstimateRowInD1(database: D1DatabaseLike, input: {
  projectId: string;
  estimateId: string;
  targetRowId: string;
  expectedRowRevision: number;
  actingUserId: string;
  correlationId: string;
}) {
  const committed = await readCommittedEstimateEvent(database, input.estimateId, input.correlationId);
  if (committed) return markIdempotentReplay(parseEstimateRowDeleteResult(committed));

  const [context, row] = await Promise.all([
    readEstimateContext(database, input.estimateId),
    first<EstimateRowD1Row>(
      database,
      `
        SELECT *
        FROM estimate_row_items
        WHERE id = ?
          AND estimate_id = ?
        LIMIT 1
      `,
      [input.targetRowId, input.estimateId],
    ),
  ]);
  if (!context || context.project_id !== input.projectId) throw new Error("Target estimate was not found for package Apply.");
  if (!row) throw new Error("Estimate row was not found for package Apply.");
  if (readNumber(row.row_revision) !== input.expectedRowRevision) throw new Error("estimate_sheet_row_revision_conflict");
  await run(
    database,
    `
      DELETE FROM estimate_row_items
      WHERE id = ?
        AND estimate_id = ?
    `,
    [input.targetRowId, input.estimateId],
  );
  const payload = {
    rowId: input.targetRowId,
    nodeId: row.node_id ?? "",
    deletedRow: { id: input.targetRowId, nodeId: row.node_id },
    idempotent: false,
  };
  await insertEstimateEvent(database, {
    estimateId: input.estimateId,
    workspaceId: context.workspace_id,
    projectId: input.projectId,
    estimateNodeId: row.node_id,
    targetRowId: input.targetRowId,
    eventType: "estimate_row_deleted",
    correlationId: input.correlationId,
    actorUserId: input.actingUserId,
    changedFields: ["estimate_row_items"],
    oldSnapshot: row,
    payload,
    metadata: { source: "ai-package-builder-apply" },
  });
  return payload;
}

type TemplateNodeD1Row = {
  id: string;
  template_id: string;
  parent_id: string | null;
  kind: "group" | "area";
  name: string;
  sort_order: number | string | null;
  metadata: string | null;
};

type TemplateRowD1Row = {
  id: string;
  template_id: string;
  template_node_id: string;
  sort_order: number | string | null;
  source_library_item_id: string | null;
  source_snapshot: string | null;
  category_node_id: string | null;
  supplier_id: string | null;
  material: string;
  description: string;
  supplier: string;
  unit: string;
  quantity: number | string | null;
  unit_cost: number | string | null;
  misc_cost: number | string | null;
  contingency_percentage: number | string | null;
  adjustment_percentage: number | string | null;
  discipline: string;
  designation: string;
  link_state: string;
  metadata: string | null;
};

async function insertEstimateTemplateIntoEstimateInD1(database: D1DatabaseLike, input: {
  projectId: string;
  estimateId: string;
  targetParentNodeId: string;
  sourceTemplateId: string;
  actingUserId: string;
  correlationId: string;
}) {
  const committed = await readCommittedEstimateEvent(database, input.estimateId, input.correlationId);
  if (committed) return markIdempotentReplay(parseEstimateTemplateInsertResult(committed));

  const [context, parent, templateNodes, templateRows] = await Promise.all([
    readEstimateContext(database, input.estimateId),
    first<EstimateNodeD1Row>(
      database,
      `
        SELECT id, estimate_id, estimate_tab_id, parent_id, kind, name, sort_order
        FROM estimate_nodes
        WHERE id = ?
          AND estimate_id = ?
        LIMIT 1
      `,
      [input.targetParentNodeId, input.estimateId],
    ),
    all<TemplateNodeD1Row>(
      database,
      `
        SELECT id, template_id, parent_id, kind, name, sort_order, metadata
        FROM estimate_template_nodes
        WHERE template_id = ?
        ORDER BY sort_order ASC, id ASC
      `,
      [input.sourceTemplateId],
    ),
    all<TemplateRowD1Row>(
      database,
      `
        SELECT *
        FROM estimate_template_row_items
        WHERE template_id = ?
        ORDER BY sort_order ASC, id ASC
      `,
      [input.sourceTemplateId],
    ),
  ]);
  if (!context || context.project_id !== input.projectId) throw new Error("Target estimate was not found for package Apply.");
  if (!parent || parent.kind !== "group") throw new Error("Template inserts must target an estimate Group Node.");
  if (templateNodes.length === 0) throw new Error("Estimate template has no nodes to insert.");

  const maxSibling = await first<{ sort_order: number | string | null }>(
    database,
    `
      SELECT COALESCE(MAX(sort_order), 0) AS sort_order
      FROM estimate_nodes
      WHERE estimate_id = ?
        AND estimate_tab_id = ?
        AND parent_id = ?
    `,
    [input.estimateId, parent.estimate_tab_id, input.targetParentNodeId],
  );
  const rootNodes = templateNodes.filter((node) => node.parent_id === null);
  const rootRank = new Map(rootNodes.map((node, index) => [node.id, index + 1]));
  const idMap = new Map(templateNodes.map((node) => [node.id, randomUUID()]));
  const timestamp = nowIso();
  const nodeStatements = templateNodes.map((node) => {
    const isRoot = node.parent_id === null;
    return {
      sql: `
        INSERT INTO estimate_nodes (
          id, estimate_id, estimate_tab_id, parent_id, kind, name, sort_order, metadata_json, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      values: [
        idMap.get(node.id)!,
        input.estimateId,
        parent.estimate_tab_id,
        isRoot ? input.targetParentNodeId : idMap.get(node.parent_id ?? "") ?? null,
        node.kind,
        node.name,
        isRoot ? readNumber(maxSibling?.sort_order) + (rootRank.get(node.id) ?? 1) * 10 : readNumber(node.sort_order),
        { ...readJsonRecord(node.metadata), sourceTemplateId: input.sourceTemplateId, sourceTemplateNodeId: node.id },
        timestamp,
        timestamp,
      ],
    };
  });
  const rowStatements = templateRows.map((row) => {
    const copiedNodeId = idMap.get(row.template_node_id);
    if (!copiedNodeId) throw new Error("Template row target node was not found for package Apply.");
    return {
      sql: `
        INSERT INTO estimate_row_items (
          id, estimate_id, node_id, description, designation, discipline, material,
          supplier, supplier_id, quantity, unit, unit_cost, misc_cost, contingency_percentage,
          adjustment_percentage, source_snapshot_json, sort_order, row_revision, category_node_id,
          source_library_item_id, link_state, metadata_json, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
      `,
      values: [
        randomUUID(),
        input.estimateId,
        copiedNodeId,
        row.description ?? "",
        row.designation ?? "",
        row.discipline ?? "",
        row.material ?? "",
        row.supplier ?? "",
        row.supplier_id ?? null,
        readNumber(row.quantity),
        row.unit ?? "",
        readNumber(row.unit_cost),
        readNumber(row.misc_cost),
        readNumber(row.contingency_percentage),
        readNumber(row.adjustment_percentage),
        toJsonString({ ...readJsonRecord(row.source_snapshot), sourceTemplateId: input.sourceTemplateId, sourceTemplateRowId: row.id }),
        readNumber(row.sort_order),
        row.category_node_id ?? null,
        row.source_library_item_id ?? null,
        row.link_state ?? "unlinked",
        toJsonString({ ...readJsonRecord(row.metadata), sourceTemplateId: input.sourceTemplateId, sourceTemplateRowId: row.id }),
        timestamp,
        timestamp,
      ],
    };
  });
  await runBatch(database, [...nodeStatements, ...rowStatements]);

  const payload = {
    inserted_root_node_ids: rootNodes.map((node) => idMap.get(node.id)!),
    inserted_node_count: nodeStatements.length,
    inserted_row_item_count: rowStatements.length,
    idempotent: false,
  };
  await insertEstimateEvent(database, {
    estimateId: input.estimateId,
    workspaceId: context.workspace_id,
    projectId: input.projectId,
    estimateNodeId: input.targetParentNodeId,
    estimateTabId: parent.estimate_tab_id,
    eventType: "estimate_template_inserted",
    correlationId: input.correlationId,
    actorUserId: input.actingUserId,
    changedFields: ["estimate_nodes", "estimate_row_items"],
    rowContext: { sourceTemplateId: input.sourceTemplateId, targetParentNodeId: input.targetParentNodeId },
    payload,
    metadata: { source: "ai-package-builder-apply" },
  });
  return parseEstimateTemplateInsertResult(payload);
}

function buildComponentCreatePayload({
  draft,
  componentCreate,
  userContext,
  idempotencyKey,
  draftHash,
}: {
  draft: PackageBuilderDraft;
  componentCreate: PackageBuilderComponentCreateDraft;
  userContext: AiRequestUserContext;
  idempotencyKey: string;
  draftHash: string;
}) {
  const effectiveAt = new Date().toISOString();
  const pricingDate = effectiveAt.slice(0, 10);
  const metadata = {
    source: "ask-flip",
    isCustom: true,
    createdFrom: "ask-flip-package-builder",
    aiPackageBuilder: {
      draftId: draft.draftId,
      clientDraftId: componentCreate.clientDraftId,
      schemaVersion: draft.schemaVersion,
      draftHash,
      idempotencyKey,
    },
    warnings: componentCreate.warnings,
  };
  const priceOptionMetadata = {
    aiPackageBuilder: {
      draftId: draft.draftId,
      clientDraftId: componentCreate.clientDraftId,
      draftHash,
      idempotencyKey,
    },
  };

  return {
    component: {
      name: componentCreate.name,
      description: componentCreate.description,
      category: componentCreate.category,
      supplier: componentCreate.supplier,
      brand: componentCreate.brand,
      unit: componentCreate.unit,
      lifecycleState: componentCreate.lifecycleState,
      effectiveAt,
      changeReason: `Created by Ask Flip draft ${draft.draftId}`,
      metadata,
      createdBy: userContext.userId,
    },
    priceOptions: [
      {
        label: "Default",
        variantDescription: componentCreate.description,
        unit: componentCreate.unit,
        unitCost: componentCreate.unitCost,
        miscCost: componentCreate.miscCost,
        currency: componentCreate.currencyCode,
        pricingSource: componentCreate.pricingSource ?? "Ask Flip draft",
        pricingDate,
        notes: componentCreate.warnings.join(" "),
        isDefault: true,
        isActive: true,
        effectiveAt,
        changeReason: `Created by Ask Flip draft ${draft.draftId}`,
        costEntries: [
          {
            unitCost: componentCreate.unitCost,
            miscCost: componentCreate.miscCost,
            currency: componentCreate.currencyCode,
            pricingSource: componentCreate.pricingSource ?? "Ask Flip draft",
            pricingDate,
            notes: componentCreate.warnings.join(" "),
            isCurrent: true,
            deletedAt: null,
          },
        ],
        variantMetadata: priceOptionMetadata,
      },
    ],
  };
}

async function applyComponentCreateDraft({
  input,
  database,
  workspaceId,
}: {
  input: ApplyPackageBuilderDraftInput;
  database: D1DatabaseLike;
  workspaceId: string;
}): Promise<PackageBuilderApplyResult> {
  const canEditWorkspace = await isWorkspaceEditorInD1(database, workspaceId, { userId: input.userContext.userId });
  if (!canEditWorkspace) throw new Error("Package Apply requires workspace editor access.");

  const componentPayloads = (input.draft.componentCreateDraft ?? []).map((componentCreate) => {
    const payload = buildComponentCreatePayload({
      draft: input.draft,
      componentCreate,
      userContext: input.userContext,
      idempotencyKey: input.idempotencyKey,
      draftHash: input.draftHash,
    });
    return {
      clientDraftId: componentCreate.clientDraftId,
      component: payload.component,
      priceOptions: payload.priceOptions,
      total: componentCreate.unitCost + componentCreate.miscCost,
    };
  });
  if (componentPayloads.length === 0) {
    throw new Error("Package Apply component creation requires at least one component.");
  }

  const timestamp = nowIso();
  const createdComponentIds: string[] = [];
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  for (const payload of componentPayloads) {
    const componentId = randomUUID();
    const priceOptionId = randomUUID();
    const priceOption = payload.priceOptions[0];
    createdComponentIds.push(componentId);
    statements.push({
      sql: `
        INSERT INTO cost_library_items (
          id,
          workspace_id,
          name,
          description,
          category,
          category_node_id,
          library_folder_id,
          supplier,
          supplier_id,
          brand,
          brand_id,
          unit,
          unit_cost,
          misc_cost,
          lifecycle_state,
          current_version_number,
          active_price_option_id,
          source_estimate_row_item_id,
          metadata_json,
          created_by,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, NULL, ?, NULL, ?, ?, ?, ?, 1, ?, NULL, ?, ?, ?, ?)
      `,
      values: [
        componentId,
        workspaceId,
        payload.component.name,
        payload.component.description,
        payload.component.category,
        payload.component.supplier,
        payload.component.brand,
        payload.component.unit,
        priceOption.unitCost,
        priceOption.miscCost,
        payload.component.lifecycleState,
        priceOptionId,
        payload.component.metadata,
        input.userContext.userId,
        timestamp,
        timestamp,
      ],
    });
    statements.push({
      sql: `
        INSERT INTO cost_library_item_price_options (
          id,
          workspace_id,
          item_id,
          label,
          unit,
          unit_cost,
          misc_cost,
          currency,
          is_active,
          is_default,
          updated_at,
          supplier_id,
          pricing_source,
          metadata_json,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)
      `,
      values: [
        priceOptionId,
        workspaceId,
        componentId,
        priceOption.label,
        priceOption.unit,
        priceOption.unitCost,
        priceOption.miscCost,
        priceOption.currency,
        priceOption.isActive ? 1 : 0,
        priceOption.isDefault ? 1 : 0,
        timestamp,
        priceOption.pricingSource,
        priceOption.variantMetadata,
        timestamp,
      ],
    });
  }
  await runBatch(database, statements);

  const result: PackageBuilderApplyResult = {
    projectId: null,
    estimateId: null,
    selectedNodeId: null,
    createdNodeIds: {},
    insertedRowIds: [],
    updatedRowIds: [],
    replacedRowIds: [],
    deletedRowIds: [],
    createdComponentIds,
    createdComponentCount: createdComponentIds.length,
    insertedTemplateRootNodeIds: [],
    insertedTemplateNodeCount: 0,
    insertedTemplateRowCount: 0,
    total: componentPayloads.reduce((sum, payload) => sum + payload.total, 0),
    warnings: input.draft.warnings,
    recoveryStatus: "completed",
    idempotencyKey: input.idempotencyKey,
    idempotentReplay: false,
    auditRunId: input.authorizationRunId,
  };

  revalidatePath("/workshop/library");
  revalidatePath("/workshop/library/components");

  return result;
}

async function readNextSortOrdersByNode({
  database,
  estimateId,
  targetNodeIds,
}: {
  database: D1DatabaseLike;
  estimateId: string;
  targetNodeIds: string[];
}) {
  if (targetNodeIds.length === 0) return new Map<string, number>();

  const data = await all<{ node_id: string | null; sort_order: number | string | null }>(
    database,
    `
      SELECT node_id, sort_order
      FROM estimate_row_items
      WHERE estimate_id = ?
        AND node_id IN (${placeholders(targetNodeIds)})
    `,
    [estimateId, ...targetNodeIds],
  );

  const nextSortByNode = new Map<string, number>();
  for (const nodeId of targetNodeIds) nextSortByNode.set(nodeId, 0);
  for (const row of data) {
    const record = readRecord(row);
    const nodeId = readString(record.node_id);
    const sortOrder = readNumber(record.sort_order);
    if (!nodeId) continue;
    nextSortByNode.set(nodeId, Math.max(nextSortByNode.get(nodeId) ?? 0, sortOrder + 1));
  }
  return nextSortByNode;
}

function toRowUpdatePatch(update: PackageBuilderRowUpdateDraft) {
  const {
    contingencyPercentage,
    adjustmentPercentage,
    ...patch
  } = update.patch;
  return Object.fromEntries(Object.entries({
    ...patch,
    adjustmentPercentage: adjustmentPercentage ?? contingencyPercentage,
  }).filter(([, value]) => value !== undefined));
}

async function applyFillCurrentEstimateDraft({
  input,
  target,
  database,
  itemById,
  priceOptionById,
}: {
  input: ApplyPackageBuilderDraftInput;
  target: PackageBuilderTarget;
  database: D1DatabaseLike;
  itemById: Map<string, LibraryValidationRow>;
  priceOptionById: Map<string, PriceOptionValidationRow>;
}): Promise<PackageBuilderApplyResult> {
  const estimateContext = await readEstimateContext(database, target.estimateId);
  if (!estimateContext || estimateContext.project_id !== target.projectId || estimateContext.workspace_id !== input.userContext.workspaceId) {
    throw new Error("Package Apply target estimate was not found in this workspace.");
  }
  const canEditEstimate = await canEditEstimateInD1(database, target.estimateId, { userId: input.userContext.userId });
  if (!canEditEstimate) throw new Error("Package Apply requires estimate editor access.");

  const createdNodeIds: Record<string, string> = {};
  const idempotentResults: boolean[] = [];
  const nodeIdsByClientDraftId = new Map<string, string>(Object.entries(target.nodeIdsByClientDraftId));
  const areaNodeIdsByClientDraftId = new Map<string, string>(Object.entries(target.areaNodeIdsByClientDraftId));
  for (const [clientDraftId, nodeId] of areaNodeIdsByClientDraftId) nodeIdsByClientDraftId.set(clientDraftId, nodeId);

  const createTreeNodeIds = new Set(
    filterMapBy(
      input.draft.operations,
      (operation) => operation.type === "create_tree_node" && Boolean(operation.clientDraftId),
      (operation) => operation.clientDraftId as string,
    ),
  );
  let pendingNodes = input.draft.treeDraft.filter((node) => createTreeNodeIds.has(node.clientDraftId));
  while (pendingNodes.length > 0) {
    const remainingNodes: PackageBuilderTreeNodeDraft[] = [];
    let createdAny = false;

    for (const node of pendingNodes) {
      if (node.kind !== "area") throw new Error("Fill-current-estimate can only create missing Area Nodes.");
      const parentNodeId = node.parentClientDraftId ? nodeIdsByClientDraftId.get(node.parentClientDraftId) : null;
      if (!parentNodeId) {
        remainingNodes.push(node);
        continue;
      }

      const correlationId = deterministicUuid(`${input.userContext.workspaceId}:${input.userContext.userId}:${input.draftHash}:${input.idempotencyKey}:node:${node.clientDraftId}`);
      const result = await createEstimateNodeInD1(database, {
        projectId: target.projectId,
        estimateId: target.estimateId,
        parentNodeId,
        nodeKind: node.kind,
        nodeName: node.name,
        initialSortOrder: node.sortOrder,
        actingUserId: input.userContext.userId,
        correlationId,
        targetTabId: target.activeTabId,
      });
      if (!result.nodeId) throw new Error("Package Apply node creation returned an incomplete result.");

      nodeIdsByClientDraftId.set(node.clientDraftId, result.nodeId);
      areaNodeIdsByClientDraftId.set(node.clientDraftId, result.nodeId);
      createdNodeIds[node.clientDraftId] = result.nodeId;
      idempotentResults.push(result.idempotent);
      createdAny = true;
    }

    if (!createdAny) throw new Error("Package Apply could not resolve parents for new Area Nodes.");
    pendingNodes = remainingNodes;
  }

  const rowTargets = [
    ...input.draft.rowDraft.map((row) => areaNodeIdsByClientDraftId.get(row.targetAreaClientDraftId)),
    ...(input.draft.templateRowCopyDraft ?? []).map((copy) => areaNodeIdsByClientDraftId.get(copy.targetAreaClientDraftId)),
  ]
    .filter((nodeId): nodeId is string => Boolean(nodeId));
  const nextSortByNode = await readNextSortOrdersByNode({
    database,
    estimateId: target.estimateId,
    targetNodeIds: Array.from(new Set(rowTargets)),
  });

  const insertedRowIds: string[] = [];
  const updatedRowIds: string[] = [];
  const replacedRowIds: string[] = [];
  const deletedRowIds: string[] = [];
  const renamedNodeIds: string[] = [];
  const insertedTemplateRootNodeIds: string[] = [];
  let insertedTemplateNodeCount = 0;
  let insertedTemplateRowCount = 0;
  const updatedNodeIds = new Set<string>();
  let total = 0;
  for (const templateInsert of input.draft.templateInsertDraft ?? []) {
    const targetParentNodeId = nodeIdsByClientDraftId.get(templateInsert.targetParentClientDraftId);
    if (!targetParentNodeId) throw new Error(`Template insert ${templateInsert.clientDraftId} must target an existing estimate Group Node.`);

    const correlationId = deterministicUuid(`${input.userContext.workspaceId}:${input.userContext.userId}:${input.draftHash}:${input.idempotencyKey}:template:${templateInsert.clientDraftId}`);
    const result = await insertEstimateTemplateIntoEstimateInD1(database, {
      projectId: target.projectId,
      estimateId: target.estimateId,
      targetParentNodeId,
      sourceTemplateId: templateInsert.sourceTemplateId,
      actingUserId: input.userContext.userId,
      correlationId,
    });
    if (result.insertedNodeCount <= 0) throw new Error("Package Apply template insert returned an incomplete result.");
    insertedTemplateRootNodeIds.push(...result.insertedRootNodeIds);
    insertedTemplateNodeCount += result.insertedNodeCount;
    insertedTemplateRowCount += result.insertedRowCount;
    updatedNodeIds.add(targetParentNodeId);
    idempotentResults.push(result.idempotent);
  }

  const nodeRenames: PackageBuilderNodeRenameDraft[] = input.draft.nodeRenameDraft ?? [];
  for (const rename of nodeRenames) {
    const correlationId = deterministicUuid(`${input.userContext.workspaceId}:${input.userContext.userId}:${input.draftHash}:${input.idempotencyKey}:rename:${rename.clientDraftId}`);
    const result = await renameEstimateNodeInD1(database, {
      projectId: target.projectId,
      estimateId: target.estimateId,
      nodeId: rename.targetNodeId,
      nextName: rename.nextName,
      actingUserId: input.userContext.userId,
      correlationId,
    });
    if (!result.nodeId) throw new Error("Package Apply node rename returned an incomplete result.");
    renamedNodeIds.push(result.nodeId);
    updatedNodeIds.add(result.nodeId);
    idempotentResults.push(result.idempotent);
  }

  for (const update of input.draft.rowUpdateDraft ?? []) {
    const correlationId = deterministicUuid(`${input.userContext.workspaceId}:${input.userContext.userId}:${input.draftHash}:${input.idempotencyKey}:update:${update.clientDraftId}`);
    const result = await updateEstimateRowInD1(database, {
      projectId: target.projectId,
      estimateId: target.estimateId,
      targetRowId: update.targetRowId,
      expectedRowRevision: update.expectedRowRevision,
      rowPatch: d1RowPatch(update),
      actingUserId: input.userContext.userId,
      correlationId,
    });
    if (!result.rowId) throw new Error("Package Apply row update returned an incomplete result.");
    updatedRowIds.push(result.rowId);
    if (result.nodeId) updatedNodeIds.add(result.nodeId);
    idempotentResults.push(result.idempotent);
  }

  for (const replacement of input.draft.rowReplacementDraft ?? []) {
    const correlationId = deterministicUuid(`${input.userContext.workspaceId}:${input.userContext.userId}:${input.draftHash}:${input.idempotencyKey}:replace:${replacement.clientDraftId}`);
    const result = await replaceEstimateRowInD1(database, {
      projectId: target.projectId,
      estimateId: target.estimateId,
      targetRowId: replacement.targetRowId,
      expectedRowRevision: replacement.expectedRowRevision,
      replacementPayload: buildRowReplacementPayload({
        draft: input.draft,
        replacement,
        itemById,
        priceOptionById,
        idempotencyKey: input.idempotencyKey,
      }),
      actingUserId: input.userContext.userId,
      correlationId,
    });
    if (!result.rowId) throw new Error("Package Apply row replacement returned an incomplete result.");
    replacedRowIds.push(result.rowId);
    if (result.nodeId) updatedNodeIds.add(result.nodeId);
    idempotentResults.push(result.idempotent);
  }

  for (const deletion of input.draft.rowDeleteDraft ?? []) {
    const correlationId = deterministicUuid(`${input.userContext.workspaceId}:${input.userContext.userId}:${input.draftHash}:${input.idempotencyKey}:delete:${deletion.clientDraftId}`);
    const result = await deleteEstimateRowInD1(database, {
      projectId: target.projectId,
      estimateId: target.estimateId,
      targetRowId: deletion.targetRowId,
      expectedRowRevision: deletion.expectedRowRevision,
      actingUserId: input.userContext.userId,
      correlationId,
    });
    if (!result.rowId) throw new Error("Package Apply row delete returned an incomplete result.");
    deletedRowIds.push(result.rowId);
    if (result.nodeId) updatedNodeIds.add(result.nodeId);
    idempotentResults.push(result.idempotent);
  }

  for (const copy of input.draft.templateRowCopyDraft ?? []) {
    const targetNodeId = areaNodeIdsByClientDraftId.get(copy.targetAreaClientDraftId);
    if (!targetNodeId) throw new Error(`Template row copy ${copy.clientDraftId} must target an existing estimate Area Node.`);

    const sortOrder = nextSortByNode.get(targetNodeId) ?? 0;
    nextSortByNode.set(targetNodeId, sortOrder + 1);
    const rowInsert = buildTemplateRowCopyInsert({
      draft: input.draft,
      copy,
      estimateId: target.estimateId,
      persistedNodeId: targetNodeId,
      sortOrder,
      idempotencyKey: input.idempotencyKey,
    });
    const rowSubtotal = Number(rowInsert.quantity ?? 0) * Number(rowInsert.unit_cost ?? 0);
    total += rowSubtotal + Number(rowInsert.misc_cost ?? 0) + (rowSubtotal * Number(rowInsert.adjustment_percentage ?? 0)) / 100;

    const correlationId = deterministicUuid(`${input.userContext.workspaceId}:${input.userContext.userId}:${input.draftHash}:${input.idempotencyKey}:template-row:${copy.clientDraftId}`);
    const result = await insertEstimateRowInD1(database, {
      projectId: target.projectId,
      estimateId: target.estimateId,
      targetNodeId,
      rowPayload: toEstimateRowInsertPayload(rowInsert),
      actingUserId: input.userContext.userId,
      correlationId,
    });
    if (!result.rowId) throw new Error("Package Apply template row copy returned an incomplete result.");
    insertedRowIds.push(result.rowId);
    updatedNodeIds.add(targetNodeId);
    idempotentResults.push(result.idempotent);
  }

  for (const row of input.draft.rowDraft) {
    const targetNodeId = areaNodeIdsByClientDraftId.get(row.targetAreaClientDraftId);
    if (!targetNodeId) throw new Error(`Row ${row.clientDraftId} must target an existing or newly-created estimate Area Node.`);

    const sortOrder = nextSortByNode.get(targetNodeId) ?? 0;
    nextSortByNode.set(targetNodeId, sortOrder + 1);
    const rowInsert = buildRowInsert({
      draft: input.draft,
      row,
      estimateId: target.estimateId,
      persistedNodeId: targetNodeId,
      sortOrder,
      itemById,
      priceOptionById,
      idempotencyKey: input.idempotencyKey,
    });
    const rowSubtotal = Number(rowInsert.quantity ?? 0) * Number(rowInsert.unit_cost ?? 0);
    total += rowSubtotal + Number(rowInsert.misc_cost ?? 0) + (rowSubtotal * Number(rowInsert.adjustment_percentage ?? 0)) / 100;

    const correlationId = deterministicUuid(`${input.userContext.workspaceId}:${input.userContext.userId}:${input.draftHash}:${input.idempotencyKey}:${row.clientDraftId}`);
    const result = await insertEstimateRowInD1(database, {
      projectId: target.projectId,
      estimateId: target.estimateId,
      targetNodeId,
      rowPayload: toEstimateRowInsertPayload(rowInsert),
      actingUserId: input.userContext.userId,
      correlationId,
    });
    if (!result.rowId) throw new Error("Package Apply row insert returned an incomplete result.");
    insertedRowIds.push(result.rowId);
    idempotentResults.push(result.idempotent);
  }

  revalidatePath(`/workshop/projects/${target.projectId}`);
  revalidatePath(`/workshop/projects/${target.projectId}/estimates`);
  if (target.selectedNodeId) revalidatePath(`/workshop/projects/${target.projectId}/estimates/${target.selectedNodeId}`);
  for (const nodeId of updatedNodeIds) revalidatePath(`/workshop/projects/${target.projectId}/estimates/${nodeId}`);

  return {
    projectId: target.projectId,
    estimateId: target.estimateId,
    selectedNodeId: target.selectedNodeId,
    createdNodeIds,
    insertedRowIds,
    updatedRowIds,
    replacedRowIds,
    deletedRowIds,
    renamedNodeIds,
    insertedTemplateRootNodeIds,
    insertedTemplateNodeCount,
    insertedTemplateRowCount,
    total,
    warnings: input.draft.warnings,
    recoveryStatus: idempotentResults.length > 0 && idempotentResults.every(Boolean) ? "idempotent_replay" : "completed",
    idempotencyKey: input.idempotencyKey,
    idempotentReplay: idempotentResults.length > 0 && idempotentResults.every(Boolean),
    auditRunId: input.authorizationRunId,
  };
}

function buildPackageApplyDraftForD1({
  draft,
  itemById,
  priceOptionById,
  idempotencyKey,
  draftHash,
}: {
  draft: PackageBuilderDraft;
  itemById: Map<string, LibraryValidationRow>;
  priceOptionById: Map<string, PriceOptionValidationRow>;
  idempotencyKey: string;
  draftHash: string;
}) {
  const metadata = buildAiMetadata({ draft, idempotencyKey, draftHash });
  return {
    ...draft,
    metadata,
    rowDraft: draft.rowDraft.map((row, index) => {
      const rowInsert = buildRowInsert({
        draft,
        row,
        estimateId: NIL_UUID,
        persistedNodeId: NIL_UUID,
        sortOrder: index,
        itemById,
        priceOptionById,
        idempotencyKey,
      });
      return {
        ...row,
        sortOrder: index,
        sourceSnapshot: readJsonRecord(rowInsert.source_snapshot_json),
        supplier: rowInsert.supplier,
        unit: rowInsert.unit,
        unitCost: rowInsert.unit_cost,
        miscCost: rowInsert.misc_cost,
      };
    }),
  };
}

async function applyCreatePackageProjectDraftInD1({
  input,
  database,
  workspaceId,
  itemById,
  priceOptionById,
}: {
  input: ApplyPackageBuilderDraftInput;
  database: D1DatabaseLike;
  workspaceId: string;
  itemById: Map<string, LibraryValidationRow>;
  priceOptionById: Map<string, PriceOptionValidationRow>;
}): Promise<PackageBuilderApplyResult> {
  const canEditWorkspace = await isWorkspaceEditorInD1(database, workspaceId, { userId: input.userContext.userId });
  if (!canEditWorkspace) throw new Error("Package Apply requires workspace editor access.");
  if (
    (input.draft.rowUpdateDraft?.length ?? 0) > 0
    || (input.draft.rowReplacementDraft?.length ?? 0) > 0
    || (input.draft.rowDeleteDraft?.length ?? 0) > 0
    || (input.draft.nodeRenameDraft?.length ?? 0) > 0
    || (input.draft.templateInsertDraft?.length ?? 0) > 0
  ) {
    throw new Error("Create-package Apply cannot mutate existing estimate records.");
  }

  const packageDraft = buildPackageApplyDraftForD1({
    draft: input.draft,
    itemById,
    priceOptionById,
    idempotencyKey: input.idempotencyKey,
    draftHash: input.draftHash,
  });
  const projectId = randomUUID();
  const estimateId = randomUUID();
  const defaultTabId = randomUUID();
  const timestamp = nowIso();
  const createdNodeIds: Record<string, string> = {};
  const nodeIdByClientDraftId = new Map<string, string>();
  for (const node of packageDraft.treeDraft) {
    const nodeId = randomUUID();
    nodeIdByClientDraftId.set(node.clientDraftId, nodeId);
    createdNodeIds[node.clientDraftId] = nodeId;
  }

  const statements: Array<{ sql: string; values: unknown[] }> = [
    {
      sql: `
        INSERT INTO projects (
          id,
          workspace_id,
          name,
          project_code,
          client_name,
          location,
          currency_code,
          metadata,
          created_by,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)
      `,
      values: [
        projectId,
        workspaceId,
        packageDraft.projectDraft.name,
        packageDraft.projectDraft.clientName,
        packageDraft.projectDraft.location,
        packageDraft.budgetSummary.currencyCode,
        {
          aiPackageBuilder: {
            draftId: input.draft.draftId,
            draftHash: input.draftHash,
            idempotencyKey: input.idempotencyKey,
            source: "ask-flip",
          },
          projectBudget: packageDraft.projectDraft.projectBudget,
        },
        input.userContext.userId,
        timestamp,
        timestamp,
      ],
    },
    {
      sql: `
        INSERT INTO estimates (
          id,
          project_id,
          name,
          sheet_code,
          created_by,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      values: [
        estimateId,
        projectId,
        packageDraft.estimateDraft.name,
        packageDraft.estimateDraft.sheetCode ?? "",
        input.userContext.userId,
        timestamp,
        timestamp,
      ],
    },
    {
      sql: `
        INSERT INTO estimate_tabs (
          id,
          estimate_id,
          name,
          sort_order,
          is_default,
          archived_at,
          created_at,
          updated_at
        )
        VALUES (?, ?, 'Main', 0, 1, NULL, ?, ?)
      `,
      values: [defaultTabId, estimateId, timestamp, timestamp],
    },
  ];

  for (const node of packageDraft.treeDraft) {
    const nodeId = nodeIdByClientDraftId.get(node.clientDraftId);
    if (!nodeId) throw new Error(`Tree node ${node.clientDraftId} was not allocated.`);
    const parentNodeId = node.parentClientDraftId ? nodeIdByClientDraftId.get(node.parentClientDraftId) : null;
    if (node.parentClientDraftId && !parentNodeId) {
      throw new Error(`Tree node ${node.clientDraftId} references a missing parent.`);
    }
    statements.push({
      sql: `
        INSERT INTO estimate_nodes (
          id,
          estimate_id,
          estimate_tab_id,
          parent_id,
          kind,
          name,
          sort_order,
          metadata_json,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      values: [
        nodeId,
        estimateId,
        defaultTabId,
        parentNodeId,
        node.kind,
        node.name,
        node.sortOrder,
        {
          aiPackageBuilder: {
            draftId: input.draft.draftId,
            clientDraftId: node.clientDraftId,
            idempotencyKey: input.idempotencyKey,
          },
        },
        timestamp,
        timestamp,
      ],
    });
  }

  const nextSortByNode = new Map<string, number>();
  const insertedRowIds: string[] = [];
  for (const copy of packageDraft.templateRowCopyDraft ?? []) {
    const targetNodeId = nodeIdByClientDraftId.get(copy.targetAreaClientDraftId);
    if (!targetNodeId) throw new Error(`Template row copy ${copy.clientDraftId} must target an Area Node.`);
    const sortOrder = nextSortByNode.get(targetNodeId) ?? 0;
    nextSortByNode.set(targetNodeId, sortOrder + 1);
    const rowInsert = buildTemplateRowCopyInsert({
      draft: packageDraft,
      copy,
      estimateId,
      persistedNodeId: targetNodeId,
      sortOrder,
      idempotencyKey: input.idempotencyKey,
    });
    insertedRowIds.push(rowInsert.id);
    statements.push({
      sql: `
        INSERT INTO estimate_row_items (
          id,
          estimate_id,
          node_id,
          description,
          designation,
          discipline,
          material,
          supplier,
          supplier_id,
          quantity,
          quantity_base,
          quantity_contingency_amount,
          unit,
          unit_cost,
          misc_cost,
          contingency_percentage,
          adjustment_percentage,
          source_snapshot_json,
          sort_order,
          row_revision,
          category_node_id,
          source_library_item_id,
          link_state,
          metadata_json,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
      `,
      values: [
        rowInsert.id,
        rowInsert.estimate_id,
        rowInsert.node_id,
        rowInsert.description,
        rowInsert.designation,
        rowInsert.discipline,
        rowInsert.material,
        rowInsert.supplier,
        rowInsert.supplier_id,
        rowInsert.quantity,
        rowInsert.quantity_base ?? null,
        rowInsert.quantity_contingency_amount ?? null,
        rowInsert.unit,
        rowInsert.unit_cost,
        rowInsert.misc_cost,
        rowInsert.contingency_percentage,
        rowInsert.adjustment_percentage,
        rowInsert.source_snapshot_json,
        rowInsert.sort_order,
        rowInsert.category_node_id,
        rowInsert.source_library_item_id,
        rowInsert.link_state,
        rowInsert.metadata_json,
        timestamp,
        timestamp,
      ],
    });
  }
  for (const row of packageDraft.rowDraft) {
    const targetNodeId = nodeIdByClientDraftId.get(row.targetAreaClientDraftId);
    if (!targetNodeId) throw new Error(`Row ${row.clientDraftId} must target an Area Node.`);
    const sortOrder = nextSortByNode.get(targetNodeId) ?? 0;
    nextSortByNode.set(targetNodeId, sortOrder + 1);
    const rowInsert = buildRowInsert({
      draft: packageDraft,
      row,
      estimateId,
      persistedNodeId: targetNodeId,
      sortOrder,
      itemById,
      priceOptionById,
      idempotencyKey: input.idempotencyKey,
    });
    insertedRowIds.push(rowInsert.id);
    statements.push({
      sql: `
        INSERT INTO estimate_row_items (
          id,
          estimate_id,
          node_id,
          description,
          designation,
          discipline,
          material,
          supplier,
          supplier_id,
          quantity,
          quantity_base,
          quantity_contingency_amount,
          unit,
          unit_cost,
          misc_cost,
          contingency_percentage,
          adjustment_percentage,
          source_snapshot_json,
          sort_order,
          row_revision,
          category_node_id,
          source_library_item_id,
          link_state,
          metadata_json,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
      `,
      values: [
        rowInsert.id,
        rowInsert.estimate_id,
        rowInsert.node_id,
        rowInsert.description,
        rowInsert.designation,
        rowInsert.discipline,
        rowInsert.material,
        rowInsert.supplier,
        rowInsert.supplier_id,
        rowInsert.quantity,
        rowInsert.quantity_base ?? null,
        rowInsert.quantity_contingency_amount ?? null,
        rowInsert.unit,
        rowInsert.unit_cost,
        rowInsert.misc_cost,
        rowInsert.contingency_percentage,
        rowInsert.adjustment_percentage,
        rowInsert.source_snapshot_json,
        rowInsert.sort_order,
        rowInsert.category_node_id,
        rowInsert.source_library_item_id,
        rowInsert.link_state,
        rowInsert.metadata_json,
        timestamp,
        timestamp,
      ],
    });
  }

  const selectedNodeId = packageDraft.treeDraft.find((node) => node.kind === "area")
    ? nodeIdByClientDraftId.get(packageDraft.treeDraft.find((node) => node.kind === "area")!.clientDraftId) ?? null
    : nodeIdByClientDraftId.get(packageDraft.treeDraft[0]?.clientDraftId ?? "") ?? null;
  const result: PackageBuilderApplyResult = {
    projectId,
    estimateId,
    selectedNodeId,
    createdNodeIds,
    insertedRowIds,
    updatedRowIds: [],
    replacedRowIds: [],
    deletedRowIds: [],
    renamedNodeIds: [],
    insertedTemplateRootNodeIds: [],
    insertedTemplateNodeCount: 0,
    insertedTemplateRowCount: 0,
    total: packageDraft.budgetSummary.draftTotal,
    warnings: packageDraft.warnings,
    recoveryStatus: "completed",
    idempotencyKey: input.idempotencyKey,
    idempotentReplay: false,
    auditRunId: input.authorizationRunId,
  };

  await runBatch(database, statements);
  await insertEstimateEvent(database, {
    estimateId,
    workspaceId,
    projectId,
    estimateNodeId: selectedNodeId,
    estimateTabId: defaultTabId,
    eventType: "project_estimate_package_applied",
    correlationId: input.authorizationRunId,
    actorUserId: input.userContext.userId,
    changedFields: ["projects", "estimates", "estimate_tabs", "estimate_nodes", "estimate_row_items"],
    rowContext: { draftId: input.draft.draftId },
    payload: result,
    metadata: { source: "ai-package-builder-apply", draftHash: input.draftHash },
  });

  revalidatePath("/workshop/projects");
  revalidatePath(`/workshop/projects/${projectId}`);
  revalidatePath(`/workshop/projects/${projectId}/estimates`);
  if (selectedNodeId) revalidatePath(`/workshop/projects/${projectId}/estimates/${selectedNodeId}`);

  return result;
}

export async function applyPackageBuilderDraft(input: ApplyPackageBuilderDraftInput): Promise<PackageBuilderApplyResult> {
  if (!isProviderBackedAiUserContext(input.userContext)) {
    throw new Error("Package Apply requires an authenticated workspace user.");
  }
  if (!isUuid(input.authorizationRunId)) {
    throw new Error("Package Apply requires server-side confirmation authorization.");
  }

  validateTreeDraft(input.draft.treeDraft);
  validateRowsTargetAreas(input.draft);

  const currentUser = await requireCurrentUserContext();
  const { workspace } = await ensureDefaultWorkspace();
  if (workspace.id !== input.userContext.workspaceId) throw new Error("AI workspace context changed before Apply.");
  if (currentUser.userId !== input.userContext.userId) throw new Error("AI user context changed before Apply.");

  const database = await requirePackageApplyD1Database();
  const commandKind = input.draft.intent === "create_library_component"
    ? "library_components_package"
    : input.draft.intent === "fill_current_estimate"
      ? "fill_current_estimate"
      : "project_estimate_package";
  const { commandId, replayResult } = await beginApplyCommand({
    database,
    workspaceId: workspace.id,
    commandKind,
    draftId: input.draft.draftId,
    draftHash: input.draftHash,
    idempotencyKey: input.idempotencyKey,
    actorUserId: input.userContext.userId,
    authorizationRunId: input.authorizationRunId,
    conflictLabel: input.draft.intent === "create_library_component" ? "component" : "package",
  });
  if (replayResult) return replayResult;

  try {
    if (input.draft.intent === "create_library_component") {
      const result = await applyComponentCreateDraft({
        input,
        database,
        workspaceId: workspace.id,
      });
      await completeApplyCommand({ database, commandId, result });
      return result;
    }

    const { itemById, priceOptionById } = await validateLinkedLibraryRows({
      database,
      workspaceId: workspace.id,
      rows: input.draft.rowDraft,
      replacements: input.draft.rowReplacementDraft ?? [],
    });
    if (input.draft.intent === "fill_current_estimate") {
      if (!input.draft.target) throw new Error("Package Apply requires a target estimate.");
      const result = await applyFillCurrentEstimateDraft({
        input,
        target: input.draft.target,
        database,
        itemById,
        priceOptionById,
      });
      await completeApplyCommand({ database, commandId, result });
      return result;
    }

    const result = await applyCreatePackageProjectDraftInD1({
      input,
      database,
      workspaceId: workspace.id,
      itemById,
      priceOptionById,
    });
    await completeApplyCommand({ database, commandId, result });
    return result;
  } catch (error) {
    await failApplyCommand(database, commandId, error);
    throw error;
  }
}
