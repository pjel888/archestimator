import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import type { AiRequestUserContext } from "@/lib/ai/auth";
import { isUuid } from "@/lib/ids";
import { ensureDefaultWorkspace } from "@/lib/repositories/workspace-repository";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json, TablesInsert } from "@/lib/supabase/types";
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
  confidence: string | null;
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
  confidence: string | null;
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

type PackageApplyRpcResult = {
  projectId: string;
  estimateId: string;
  selectedNodeId: string | null;
  createdNodeIds: Record<string, string>;
  insertedRowIds: string[];
  updatedRowIds?: string[];
  replacedRowIds?: string[];
  deletedRowIds?: string[];
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

type PackageApplyRpcClient = {
  rpc: (
    fn: "create_project_estimate_package_with_history",
    args: {
      target_workspace_id: string;
      package_draft: Json;
      draft_hash: string;
      idempotency_key: string;
      correlation_id: string;
    },
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

type EstimateRowInsertRpcClient = {
  rpc: (
    fn: "insert_estimate_row_item_with_history",
    args: {
      target_project_id: string;
      target_estimate_id: string;
      target_node_id: string;
      row_payload: Json;
      acting_user_id: string;
      correlation_id: string;
    },
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

type EstimateRowUpdateRpcClient = {
  rpc: (
    fn: "update_estimate_row_item_with_history",
    args: {
      target_project_id: string;
      target_estimate_id: string;
      target_row_id: string;
      expected_row_revision: number;
      row_patch: Json;
      acting_user_id: string;
      correlation_id: string;
    },
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

type EstimateRowReplacementRpcClient = {
  rpc: (
    fn: "replace_estimate_row_item_with_history",
    args: {
      target_project_id: string;
      target_estimate_id: string;
      target_row_id: string;
      expected_row_revision: number;
      replacement_payload: Json;
      acting_user_id: string;
      correlation_id: string;
    },
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

type EstimateRowDeleteRpcClient = {
  rpc: (
    fn: "delete_estimate_row_item_with_history",
    args: {
      target_project_id: string;
      target_estimate_id: string;
      target_row_id: string;
      expected_row_revision: number;
      acting_user_id: string;
      correlation_id: string;
    },
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

type EstimateNodeCreateRpcClient = {
  rpc: (
    fn: "create_estimate_node_with_history",
    args: {
      target_project_id: string;
      target_estimate_id: string;
      parent_node_id: string | null;
      node_kind: "group" | "area";
      node_name: string;
      initial_sort_order: number;
      acting_user_id: string;
      correlation_id: string;
    },
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

type EstimateNodeRenameRpcClient = {
  rpc: (
    fn: "rename_estimate_node_with_history",
    args: {
      target_project_id: string;
      target_estimate_id: string;
      target_node_id: string;
      next_name: string;
      acting_user_id: string;
      correlation_id: string;
    },
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

type EstimateTemplateInsertRpcClient = {
  rpc: (
    fn: "insert_estimate_template_into_estimate_with_history",
    args: {
      target_project_id: string;
      target_estimate_id: string;
      target_parent_node_id: string;
      source_template_id: string;
      acting_user_id: string;
      correlation_id: string;
    },
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

type ComponentLibraryCreateRpcClient = {
  rpc: (
    fn: "create_ai_package_library_components_with_history",
    args: {
      target_workspace_id: string;
      component_payloads: Json;
      draft_id: string;
      draft_hash: string;
      idempotency_key: string;
      correlation_id: string;
    },
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

const NIL_UUID = "00000000-0000-0000-0000-000000000000";

function toJson(value: unknown): Json {
  if (value === undefined) return null;
  return value as Json;
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
  const areaIds = new Set(draft.treeDraft.filter((node) => node.kind === "area").map((node) => node.clientDraftId));
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
  supabase,
  workspaceId,
  rows,
  replacements = [],
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  workspaceId: string;
  rows: PackageBuilderRowDraft[];
  replacements?: PackageBuilderRowReplacementDraft[];
}) {
  const linkedRows: LinkedLibraryDraftReference[] = [
    ...rows.filter((row) => row.sourceType === "library_item"),
    ...replacements,
  ];
  const itemIds = Array.from(new Set(linkedRows.map((row) => row.sourceLibraryItemId).filter((id): id is string => Boolean(id))));
  if (itemIds.length === 0) {
    return { itemById: new Map<string, LibraryValidationRow>(), priceOptionById: new Map<string, PriceOptionValidationRow>() };
  }

  const { data: items, error: itemError } = await supabase
    .from("cost_library_items")
    .select("id, workspace_id, name, description, supplier, supplier_id, category, category_node_id, brand, brand_id, unit, unit_cost, misc_cost, lifecycle_state, current_version_number, active_price_option_id, pricing_date, pricing_source, confidence, thumbnail_path")
    .eq("workspace_id", workspaceId)
    .in("id", itemIds);
  if (itemError) throw itemError;

  const itemById = new Map((items ?? []).map((item) => [item.id, item as LibraryValidationRow]));
  for (const row of linkedRows) {
    const item = row.sourceLibraryItemId ? itemById.get(row.sourceLibraryItemId) : null;
    if (!item) throw new Error(`Library item for row ${row.clientDraftId} is not available in this workspace.`);
    if (["archived", "discontinued"].includes(item.lifecycle_state)) {
      throw new Error(`Library item for row ${row.clientDraftId} is not active.`);
    }
  }

  const priceOptionIds = Array.from(new Set(linkedRows.map((row) => row.priceOptionId).filter((id): id is string => Boolean(id))));
  const priceOptionById = new Map<string, PriceOptionValidationRow>();
  if (priceOptionIds.length > 0) {
    const { data: priceOptions, error: priceOptionError } = await supabase
      .from("cost_library_item_price_options")
      .select("id, item_id, workspace_id, is_active, label, unit, unit_cost, misc_cost, currency, pricing_date, pricing_source, confidence, supplier_id, updated_at")
      .eq("workspace_id", workspaceId)
      .in("id", priceOptionIds);
    if (priceOptionError) throw priceOptionError;
    for (const option of priceOptions ?? []) priceOptionById.set(option.id, option as PriceOptionValidationRow);
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
    confidence: priceOption?.confidence ?? item.confidence,
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
}): TablesInsert<"estimate_row_items"> {
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
    source_snapshot: row.sourceType === "library_item" && item
      ? toJson(buildLibrarySourceSnapshot({ row, item, priceOption }))
      : toJson({
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
    contingency_percentage: row.contingencyPercentage,
    misc_cost: miscCost,
    discipline: "",
    designation: row.sourceType === "allowance" ? "AI allowance" : "",
    metadata: toJson({
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
}): TablesInsert<"estimate_row_items"> {
  return {
    id: randomUUID(),
    estimate_id: estimateId,
    node_id: persistedNodeId,
    sort_order: sortOrder,
    source_library_item_id: null,
    source_snapshot: toJson({
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
    contingency_percentage: copy.contingencyPercentage,
    misc_cost: copy.miscCost,
    discipline: "",
    designation: "AI template row",
    metadata: toJson({
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
    contingencyPercentage: replacement.contingencyPercentage,
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

function asPackageApplyRpcClient(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  return supabase as unknown as PackageApplyRpcClient;
}

function asEstimateRowInsertRpcClient(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  return supabase as unknown as EstimateRowInsertRpcClient;
}

function asEstimateRowUpdateRpcClient(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  return supabase as unknown as EstimateRowUpdateRpcClient;
}

function asEstimateRowReplacementRpcClient(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  return supabase as unknown as EstimateRowReplacementRpcClient;
}

function asEstimateRowDeleteRpcClient(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  return supabase as unknown as EstimateRowDeleteRpcClient;
}

function asEstimateNodeCreateRpcClient(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  return supabase as unknown as EstimateNodeCreateRpcClient;
}

function asEstimateNodeRenameRpcClient(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  return supabase as unknown as EstimateNodeRenameRpcClient;
}

function asEstimateTemplateInsertRpcClient(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  return supabase as unknown as EstimateTemplateInsertRpcClient;
}

function asComponentLibraryCreateRpcClient(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  return supabase as unknown as ComponentLibraryCreateRpcClient;
}

function deterministicUuid(input: string) {
  const bytes = Buffer.from(createHash("sha256").update(input).digest().subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function toEstimateRowInsertPayload(rowInsert: TablesInsert<"estimate_row_items">) {
  return {
    id: rowInsert.id,
    sortOrder: rowInsert.sort_order,
    sourceLibraryItemId: rowInsert.source_library_item_id,
    sourceSnapshot: rowInsert.source_snapshot,
    categoryNodeId: rowInsert.category_node_id,
    supplierId: rowInsert.supplier_id,
    material: rowInsert.material,
    description: rowInsert.description,
    supplier: rowInsert.supplier,
    unit: rowInsert.unit,
    quantity: rowInsert.quantity,
    unitCost: rowInsert.unit_cost,
    contingencyPercentage: rowInsert.contingency_percentage,
    miscCost: rowInsert.misc_cost,
    discipline: rowInsert.discipline,
    designation: rowInsert.designation,
    linkState: rowInsert.link_state,
    metadata: rowInsert.metadata,
  };
}

function readRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
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

function parseEstimateRowInsertResult(value: unknown) {
  const record = readRecord(value);
  return {
    rowId: readString(record.rowId),
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

function parsePackageApplyRpcResult(value: unknown): PackageApplyRpcResult {
  const record = readRecord(value);
  const createdNodeIds = readRecord(record.createdNodeIds);
  const normalizedNodeIds = Object.fromEntries(
    Object.entries(createdNodeIds).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
  return {
    projectId: readString(record.projectId),
    estimateId: readString(record.estimateId),
    selectedNodeId: typeof record.selectedNodeId === "string" ? record.selectedNodeId : null,
    createdNodeIds: normalizedNodeIds,
    insertedRowIds: readStringArray(record.insertedRowIds),
    updatedRowIds: Array.isArray(record.updatedRowIds) ? readStringArray(record.updatedRowIds) : [],
    replacedRowIds: Array.isArray(record.replacedRowIds) ? readStringArray(record.replacedRowIds) : [],
    deletedRowIds: Array.isArray(record.deletedRowIds) ? readStringArray(record.deletedRowIds) : [],
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
        confidence: componentCreate.confidence,
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
            confidence: componentCreate.confidence,
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
  supabase,
  workspaceId,
}: {
  input: ApplyPackageBuilderDraftInput;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  workspaceId: string;
}): Promise<PackageBuilderApplyResult> {
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

  const { data, error } = await asComponentLibraryCreateRpcClient(supabase).rpc("create_ai_package_library_components_with_history", {
    target_workspace_id: workspaceId,
    component_payloads: componentPayloads as Json,
    draft_id: input.draft.draftId,
    draft_hash: input.draftHash,
    idempotency_key: input.idempotencyKey,
    correlation_id: input.authorizationRunId,
  });
  if (error) throw new Error(`Package Apply failed: ${error.message}`);

  const result = parseComponentCreateApplyResult(data);
  if ((result.createdComponentIds ?? []).length === 0) {
    throw new Error("Package Apply component creation returned an incomplete result.");
  }

  revalidatePath("/workshop/library");
  revalidatePath("/workshop/components");

  return result;
}

async function readNextSortOrdersByNode({
  supabase,
  estimateId,
  targetNodeIds,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  estimateId: string;
  targetNodeIds: string[];
}) {
  if (targetNodeIds.length === 0) return new Map<string, number>();

  const { data, error } = await supabase
    .from("estimate_row_items")
    .select("node_id, sort_order")
    .eq("estimate_id", estimateId)
    .in("node_id", targetNodeIds);
  if (error) throw new Error(`Package Apply failed: ${error.message}`);

  const nextSortByNode = new Map<string, number>();
  for (const nodeId of targetNodeIds) nextSortByNode.set(nodeId, 0);
  for (const row of data ?? []) {
    const record = readRecord(row);
    const nodeId = readString(record.node_id);
    const sortOrder = readNumber(record.sort_order);
    if (!nodeId) continue;
    nextSortByNode.set(nodeId, Math.max(nextSortByNode.get(nodeId) ?? 0, sortOrder + 1));
  }
  return nextSortByNode;
}

function toRowUpdatePatch(update: PackageBuilderRowUpdateDraft) {
  return Object.fromEntries(Object.entries(update.patch).filter(([, value]) => value !== undefined));
}

async function applyFillCurrentEstimateDraft({
  input,
  target,
  supabase,
  itemById,
  priceOptionById,
}: {
  input: ApplyPackageBuilderDraftInput;
  target: PackageBuilderTarget;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  itemById: Map<string, LibraryValidationRow>;
  priceOptionById: Map<string, PriceOptionValidationRow>;
}): Promise<PackageBuilderApplyResult> {
  const createdNodeIds: Record<string, string> = {};
  const idempotentResults: boolean[] = [];
  const nodeIdsByClientDraftId = new Map<string, string>(Object.entries(target.nodeIdsByClientDraftId));
  const areaNodeIdsByClientDraftId = new Map<string, string>(Object.entries(target.areaNodeIdsByClientDraftId));
  for (const [clientDraftId, nodeId] of areaNodeIdsByClientDraftId) nodeIdsByClientDraftId.set(clientDraftId, nodeId);

  const createTreeNodeIds = new Set(
    input.draft.operations
      .filter((operation) => operation.type === "create_tree_node" && operation.clientDraftId)
      .map((operation) => operation.clientDraftId as string),
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
      const { data, error } = await asEstimateNodeCreateRpcClient(supabase).rpc("create_estimate_node_with_history", {
        target_project_id: target.projectId,
        target_estimate_id: target.estimateId,
        parent_node_id: parentNodeId,
        node_kind: node.kind,
        node_name: node.name,
        initial_sort_order: node.sortOrder,
        acting_user_id: input.userContext.userId,
        correlation_id: correlationId,
        ...(target.activeTabId ? { target_tab_id: target.activeTabId } : {}),
      });
      if (error) throw new Error(`Package Apply failed: ${error.message}`);
      const result = parseEstimateNodeCreateResult(data);
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
    supabase,
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
    const { data, error } = await asEstimateTemplateInsertRpcClient(supabase).rpc("insert_estimate_template_into_estimate_with_history", {
      target_project_id: target.projectId,
      target_estimate_id: target.estimateId,
      target_parent_node_id: targetParentNodeId,
      source_template_id: templateInsert.sourceTemplateId,
      acting_user_id: input.userContext.userId,
      correlation_id: correlationId,
    });
    if (error) throw new Error(`Package Apply failed: ${error.message}`);
    const result = parseEstimateTemplateInsertResult(data);
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
    const { data, error } = await asEstimateNodeRenameRpcClient(supabase).rpc("rename_estimate_node_with_history", {
      target_project_id: target.projectId,
      target_estimate_id: target.estimateId,
      target_node_id: rename.targetNodeId,
      next_name: rename.nextName,
      acting_user_id: input.userContext.userId,
      correlation_id: correlationId,
    });
    if (error) throw new Error(`Package Apply failed: ${error.message}`);
    const result = parseEstimateNodeRenameResult(data);
    if (!result.nodeId) throw new Error("Package Apply node rename returned an incomplete result.");
    renamedNodeIds.push(result.nodeId);
    updatedNodeIds.add(result.nodeId);
    idempotentResults.push(result.idempotent);
  }

  for (const update of input.draft.rowUpdateDraft ?? []) {
    const correlationId = deterministicUuid(`${input.userContext.workspaceId}:${input.userContext.userId}:${input.draftHash}:${input.idempotencyKey}:update:${update.clientDraftId}`);
    const { data, error } = await asEstimateRowUpdateRpcClient(supabase).rpc("update_estimate_row_item_with_history", {
      target_project_id: target.projectId,
      target_estimate_id: target.estimateId,
      target_row_id: update.targetRowId,
      expected_row_revision: update.expectedRowRevision,
      row_patch: toJson(toRowUpdatePatch(update)),
      acting_user_id: input.userContext.userId,
      correlation_id: correlationId,
    });
    if (error) throw new Error(`Package Apply failed: ${error.message}`);
    const result = parseEstimateRowUpdateResult(data);
    if (!result.rowId) throw new Error("Package Apply row update returned an incomplete result.");
    updatedRowIds.push(result.rowId);
    if (result.nodeId) updatedNodeIds.add(result.nodeId);
    idempotentResults.push(result.idempotent);
  }

  for (const replacement of input.draft.rowReplacementDraft ?? []) {
    const correlationId = deterministicUuid(`${input.userContext.workspaceId}:${input.userContext.userId}:${input.draftHash}:${input.idempotencyKey}:replace:${replacement.clientDraftId}`);
    const { data, error } = await asEstimateRowReplacementRpcClient(supabase).rpc("replace_estimate_row_item_with_history", {
      target_project_id: target.projectId,
      target_estimate_id: target.estimateId,
      target_row_id: replacement.targetRowId,
      expected_row_revision: replacement.expectedRowRevision,
      replacement_payload: toJson(buildRowReplacementPayload({
        draft: input.draft,
        replacement,
        itemById,
        priceOptionById,
        idempotencyKey: input.idempotencyKey,
      })),
      acting_user_id: input.userContext.userId,
      correlation_id: correlationId,
    });
    if (error) throw new Error(`Package Apply failed: ${error.message}`);
    const result = parseEstimateRowUpdateResult(data);
    if (!result.rowId) throw new Error("Package Apply row replacement returned an incomplete result.");
    replacedRowIds.push(result.rowId);
    if (result.nodeId) updatedNodeIds.add(result.nodeId);
    idempotentResults.push(result.idempotent);
  }

  for (const deletion of input.draft.rowDeleteDraft ?? []) {
    const correlationId = deterministicUuid(`${input.userContext.workspaceId}:${input.userContext.userId}:${input.draftHash}:${input.idempotencyKey}:delete:${deletion.clientDraftId}`);
    const { data, error } = await asEstimateRowDeleteRpcClient(supabase).rpc("delete_estimate_row_item_with_history", {
      target_project_id: target.projectId,
      target_estimate_id: target.estimateId,
      target_row_id: deletion.targetRowId,
      expected_row_revision: deletion.expectedRowRevision,
      acting_user_id: input.userContext.userId,
      correlation_id: correlationId,
    });
    if (error) throw new Error(`Package Apply failed: ${error.message}`);
    const result = parseEstimateRowDeleteResult(data);
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
    total += rowSubtotal + Number(rowInsert.misc_cost ?? 0) + (rowSubtotal * Number(rowInsert.contingency_percentage ?? 0)) / 100;

    const correlationId = deterministicUuid(`${input.userContext.workspaceId}:${input.userContext.userId}:${input.draftHash}:${input.idempotencyKey}:template-row:${copy.clientDraftId}`);
    const { data, error } = await asEstimateRowInsertRpcClient(supabase).rpc("insert_estimate_row_item_with_history", {
      target_project_id: target.projectId,
      target_estimate_id: target.estimateId,
      target_node_id: targetNodeId,
      row_payload: toJson(toEstimateRowInsertPayload(rowInsert)),
      acting_user_id: input.userContext.userId,
      correlation_id: correlationId,
    });
    if (error) throw new Error(`Package Apply failed: ${error.message}`);
    const result = parseEstimateRowInsertResult(data);
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
    total += rowSubtotal + Number(rowInsert.misc_cost ?? 0) + (rowSubtotal * Number(rowInsert.contingency_percentage ?? 0)) / 100;

    const correlationId = deterministicUuid(`${input.userContext.workspaceId}:${input.userContext.userId}:${input.draftHash}:${input.idempotencyKey}:${row.clientDraftId}`);
    const { data, error } = await asEstimateRowInsertRpcClient(supabase).rpc("insert_estimate_row_item_with_history", {
      target_project_id: target.projectId,
      target_estimate_id: target.estimateId,
      target_node_id: targetNodeId,
      row_payload: toJson(toEstimateRowInsertPayload(rowInsert)),
      acting_user_id: input.userContext.userId,
      correlation_id: correlationId,
    });
    if (error) throw new Error(`Package Apply failed: ${error.message}`);
    const result = parseEstimateRowInsertResult(data);
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

function buildPackageApplyRpcDraft({
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
        sourceSnapshot: rowInsert.source_snapshot,
        supplier: rowInsert.supplier,
        unit: rowInsert.unit,
        unitCost: rowInsert.unit_cost,
        miscCost: rowInsert.misc_cost,
      };
    }),
  };
}

export async function applyPackageBuilderDraft(input: ApplyPackageBuilderDraftInput): Promise<PackageBuilderApplyResult> {
  if (input.userContext.authMode !== "supabase" || !input.userContext.workspaceId) {
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

  const supabase = await createSupabaseServerClient();
  if (input.draft.intent === "create_library_component") {
    return applyComponentCreateDraft({
      input,
      supabase,
      workspaceId: workspace.id,
    });
  }

  const { itemById, priceOptionById } = await validateLinkedLibraryRows({
    supabase,
    workspaceId: workspace.id,
    rows: input.draft.rowDraft,
    replacements: input.draft.rowReplacementDraft ?? [],
  });
  if (input.draft.intent === "fill_current_estimate") {
    if (!input.draft.target) throw new Error("Package Apply requires a target estimate.");
    return applyFillCurrentEstimateDraft({
      input,
      target: input.draft.target,
      supabase,
      itemById,
      priceOptionById,
    });
  }

  const packageDraft = buildPackageApplyRpcDraft({
    draft: input.draft,
    itemById,
    priceOptionById,
    idempotencyKey: input.idempotencyKey,
    draftHash: input.draftHash,
  });
  const { data, error } = await asPackageApplyRpcClient(supabase).rpc("create_project_estimate_package_with_history", {
    target_workspace_id: workspace.id,
    package_draft: toJson(packageDraft),
    draft_hash: input.draftHash,
    idempotency_key: input.idempotencyKey,
    correlation_id: input.authorizationRunId,
  });
  if (error) throw new Error(`Package Apply failed: ${error.message}`);

  const result = parsePackageApplyRpcResult(data);
  if (!result.projectId || !result.estimateId) throw new Error("Package Apply RPC returned an incomplete result.");

  revalidatePath("/workshop/projects");
  revalidatePath(`/workshop/projects/${result.projectId}`);
  revalidatePath(`/workshop/projects/${result.projectId}/estimates`);
  if (result.selectedNodeId) revalidatePath(`/workshop/projects/${result.projectId}/estimates/${result.selectedNodeId}`);

  return result;
}
