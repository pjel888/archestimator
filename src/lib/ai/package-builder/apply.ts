import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import type { AiRequestUserContext } from "@/lib/ai/auth";
import {
  buildAiPackageActionRun,
  buildAiPackageToolCall,
  recordAiPackageAuditRows,
} from "@/lib/ai/audit";
import { isUuid } from "@/lib/ids";
import { ensureDefaultWorkspace } from "@/lib/repositories/workspace-repository";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json, TablesInsert } from "@/lib/supabase/types";
import {
  calculatePackageRowTotal,
  type PackageBuilderApplyRequest,
  type PackageBuilderDraft,
  type PackageBuilderRowDraft,
  type PackageBuilderTreeNodeDraft,
} from "@/lib/ai/package-builder/schemas";

export type PackageBuilderApplyResult = {
  projectId: string;
  estimateId: string;
  selectedNodeId: string | null;
  createdNodeIds: Record<string, string>;
  insertedRowIds: string[];
  total: number;
  warnings: string[];
  recoveryStatus: "completed" | "idempotent_replay" | "partial";
  idempotencyKey: string;
  idempotentReplay: boolean;
  auditRunId: string;
};

type ApplyPackageBuilderDraftInput = PackageBuilderApplyRequest & {
  userContext: AiRequestUserContext;
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
    if (row.sourceType === "allowance" && row.sourceLibraryItemId) {
      throw new Error(`Allowance row ${row.clientDraftId} cannot be applied as a real supplier-priced row.`);
    }
    if (row.sourceType === "library_item" && (!row.sourceLibraryItemId || !isUuid(row.sourceLibraryItemId))) {
      throw new Error(`Library row ${row.clientDraftId} must reference a real UUID-backed library item.`);
    }
  }
}

async function findExistingPackageApply({
  supabase,
  workspaceId,
  idempotencyKey,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  workspaceId: string;
  idempotencyKey: string;
}): Promise<PackageBuilderApplyResult | null> {
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, metadata")
    .eq("workspace_id", workspaceId)
    .contains("metadata", { aiPackageBuilder: { idempotencyKey } })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (projectError) throw projectError;
  if (!project) return null;

  const { data: estimate, error: estimateError } = await supabase
    .from("estimates")
    .select("id")
    .eq("project_id", project.id)
    .contains("metadata", { aiPackageBuilder: { idempotencyKey } })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (estimateError) throw estimateError;

  const estimateId = estimate?.id ?? "";
  const [nodesResult, rowsResult] = estimateId
    ? await Promise.all([
        supabase.from("estimate_nodes").select("id, metadata, kind").eq("estimate_id", estimateId).order("sort_order", { ascending: true }),
        supabase.from("estimate_row_items").select("id, unit_cost, quantity, misc_cost, contingency_percentage").eq("estimate_id", estimateId),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (nodesResult.error) throw nodesResult.error;
  if (rowsResult.error) throw rowsResult.error;

  const createdNodeIds: Record<string, string> = {};
  for (const node of nodesResult.data ?? []) {
    const metadata = node.metadata && typeof node.metadata === "object" && !Array.isArray(node.metadata) ? node.metadata as Record<string, Json> : {};
    const aiMetadata = metadata.aiPackageBuilder;
    const clientDraftId = aiMetadata && typeof aiMetadata === "object" && !Array.isArray(aiMetadata)
      ? (aiMetadata as Record<string, Json>).clientDraftId
      : null;
    if (typeof clientDraftId === "string") createdNodeIds[clientDraftId] = node.id;
  }

  const total = (rowsResult.data ?? []).reduce((sum, row) => {
    const quantity = Number(row.quantity);
    const unitCost = Number(row.unit_cost);
    const miscCost = Number(row.misc_cost);
    const contingency = (quantity * unitCost * Number(row.contingency_percentage ?? 0)) / 100;
    return sum + quantity * unitCost + miscCost + contingency;
  }, 0);

  return {
    projectId: project.id,
    estimateId,
    selectedNodeId: (nodesResult.data ?? []).find((node) => node.kind === "area")?.id ?? nodesResult.data?.[0]?.id ?? null,
    createdNodeIds,
    insertedRowIds: (rowsResult.data ?? []).map((row) => row.id),
    total,
    warnings: ["Returned existing package created for the same idempotency key."],
    recoveryStatus: "idempotent_replay",
    idempotencyKey,
    idempotentReplay: true,
    auditRunId: randomUUID(),
  };
}

async function validateLinkedLibraryRows({
  supabase,
  workspaceId,
  rows,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  workspaceId: string;
  rows: PackageBuilderRowDraft[];
}) {
  const linkedRows = rows.filter((row) => row.sourceType === "library_item");
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
    const priceOption = priceOptionById.get(row.priceOptionId);
    if (!priceOption || !priceOption.is_active) throw new Error(`Price option for row ${row.clientDraftId} is stale or inactive.`);
    if (row.priceOptionUpdatedAt && row.priceOptionUpdatedAt !== priceOption.updated_at) {
      throw new Error(`Draft hash is stale because price option changed for row ${row.clientDraftId}.`);
    }
  }

  return { itemById, priceOptionById };
}

function buildLibrarySourceSnapshot({
  row,
  item,
  priceOption,
}: {
  row: PackageBuilderRowDraft;
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

export async function applyPackageBuilderDraft(input: ApplyPackageBuilderDraftInput): Promise<PackageBuilderApplyResult> {
  if (input.userContext.authMode !== "supabase" || !input.userContext.workspaceId) {
    throw new Error("Package Apply requires an authenticated workspace user.");
  }

  validateTreeDraft(input.draft.treeDraft);
  validateRowsTargetAreas(input.draft);

  const currentUser = await requireCurrentUserContext();
  const { workspace } = await ensureDefaultWorkspace();
  if (workspace.id !== input.userContext.workspaceId) throw new Error("AI workspace context changed before Apply.");

  const supabase = await createSupabaseServerClient();
  const existing = await findExistingPackageApply({ supabase, workspaceId: workspace.id, idempotencyKey: input.idempotencyKey });
  if (existing) return existing;

  const runId = randomUUID();
  const { itemById, priceOptionById } = await validateLinkedLibraryRows({
    supabase,
    workspaceId: workspace.id,
    rows: input.draft.rowDraft,
  });

  const metadata = buildAiMetadata({ draft: input.draft, idempotencyKey: input.idempotencyKey, draftHash: input.draftHash });
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      workspace_id: workspace.id,
      created_by: currentUser.userId,
      name: input.draft.projectDraft.name,
      client_name: input.draft.projectDraft.clientName,
      location: input.draft.projectDraft.location,
      project_code: null,
      currency_code: input.draft.brief.currencyCode,
      metadata: toJson({ ...metadata, projectBudget: input.draft.projectDraft.projectBudget }),
    })
    .select("id")
    .single();
  if (projectError) throw projectError;

  const { data: estimate, error: estimateError } = await supabase
    .from("estimates")
    .insert({
      project_id: project.id,
      created_by: currentUser.userId,
      name: input.draft.estimateDraft.name,
      sheet_code: input.draft.estimateDraft.sheetCode ?? "ES-001",
      currency_code: input.draft.brief.currencyCode,
      project_budget: input.draft.projectDraft.projectBudget,
      notes: null,
      metadata: toJson(metadata),
    })
    .select("id")
    .single();
  if (estimateError) throw estimateError;

  const nodeIdByClientDraftId = new Map<string, string>();
  const pendingNodes = [...input.draft.treeDraft].sort((left, right) => left.sortOrder - right.sortOrder);
  const nodeInserts: TablesInsert<"estimate_nodes">[] = [];
  while (pendingNodes.length > 0) {
    const nextIndex = pendingNodes.findIndex((node) => !node.parentClientDraftId || nodeIdByClientDraftId.has(node.parentClientDraftId));
    if (nextIndex === -1) throw new Error("Package tree hierarchy is invalid.");
    const [node] = pendingNodes.splice(nextIndex, 1);
    const nodeId = randomUUID();
    nodeIdByClientDraftId.set(node.clientDraftId, nodeId);
    nodeInserts.push({
      id: nodeId,
      estimate_id: estimate.id,
      parent_id: node.parentClientDraftId ? nodeIdByClientDraftId.get(node.parentClientDraftId) ?? null : null,
      kind: node.kind,
      name: node.name,
      sort_order: node.sortOrder,
      metadata: toJson({
        aiPackageBuilder: {
          draftId: input.draft.draftId,
          clientDraftId: node.clientDraftId,
          idempotencyKey: input.idempotencyKey,
        },
      }),
    });
  }

  const { error: nodeError } = await supabase.from("estimate_nodes").insert(nodeInserts);
  if (nodeError) throw nodeError;

  const rowInserts = input.draft.rowDraft.map((row, index) => {
    const persistedNodeId = nodeIdByClientDraftId.get(row.targetAreaClientDraftId);
    if (!persistedNodeId) throw new Error(`Missing persisted Area Node for row ${row.clientDraftId}.`);
    return buildRowInsert({
      draft: input.draft,
      row,
      estimateId: estimate.id,
      persistedNodeId,
      sortOrder: index,
      itemById,
      priceOptionById,
      idempotencyKey: input.idempotencyKey,
    });
  });

  if (rowInserts.length > 0) {
    const { error: rowError } = await supabase.from("estimate_row_items").insert(rowInserts);
    if (rowError) throw rowError;
  }

  const rowTotals = input.draft.rowDraft.map(calculatePackageRowTotal);
  const total = rowTotals.reduce((sum, row) => sum + row.total, 0);
  const selectedNodeId = nodeInserts.find((node) => node.kind === "area")?.id ?? nodeInserts[0]?.id ?? null;
  const insertedRowIds = rowInserts.map((row) => row.id).filter((id): id is string => Boolean(id));
  const createdNodeIds = Object.fromEntries(nodeIdByClientDraftId.entries());

  await supabase.from("estimate_sheet_events").insert({
    workspace_id: workspace.id,
    estimate_id: estimate.id,
    actor_user_id: currentUser.userId,
    event_type: "ai_package_applied",
    event_source: "ai_package_builder",
    estimate_node_id: selectedNodeId,
    target_row_id: null,
    row_context: {},
    old_snapshot: null,
    new_snapshot: toJson({
      projectId: project.id,
      estimateId: estimate.id,
      createdNodeIds,
      insertedRowIds,
      total,
      budgetSummary: input.draft.budgetSummary,
    }),
    changed_fields: ["project", "estimate", "tree", "rows"],
    total_delta: total,
    payload: toJson({
      draftId: input.draft.draftId,
      draftHash: input.draftHash,
      idempotencyKey: input.idempotencyKey,
      warnings: input.draft.warnings,
    }),
    metadata: toJson(metadata),
    correlation_id: runId,
  });

  const actionRun = buildAiPackageActionRun({
    runId,
    userContext: input.userContext,
    mode: "apply",
    status: "completed",
    provider: "app-command",
    model: "server-validator",
    providerSendCategories: ["validated_draft_hash", "created_ids", "safe_summary"],
    requestHost: input.requestHost,
    userAgent: input.userAgent,
    metadata: {
      draftId: input.draft.draftId,
      idempotencyKey: input.idempotencyKey,
      projectId: project.id,
      estimateId: estimate.id,
      insertedRowCount: insertedRowIds.length,
    },
  });
  const toolCall = buildAiPackageToolCall({
    runId,
    userContext: input.userContext,
    mode: "apply",
    toolName: "apply_ai_package_builder_draft",
    status: "completed",
    args: { draftHash: input.draftHash, idempotencyKey: input.idempotencyKey },
    result: { projectId: project.id, estimateId: estimate.id, insertedRowIds, createdNodeIds },
    safeSummary: "Applied confirmed AI package draft with server-side validation and idempotency metadata.",
    targetProjectId: project.id,
    targetEstimateId: estimate.id,
    targetNodeId: selectedNodeId,
  });
  if (actionRun) await recordAiPackageAuditRows({ actionRun, toolCalls: toolCall ? [toolCall] : [] });

  revalidatePath("/workshop/projects");
  revalidatePath(`/workshop/projects/${project.id}`);
  revalidatePath(`/workshop/projects/${project.id}/estimates`);
  if (selectedNodeId) revalidatePath(`/workshop/projects/${project.id}/estimates/${selectedNodeId}`);

  return {
    projectId: project.id,
    estimateId: estimate.id,
    selectedNodeId,
    createdNodeIds,
    insertedRowIds,
    total,
    warnings: input.draft.warnings,
    recoveryStatus: "completed",
    idempotencyKey: input.idempotencyKey,
    idempotentReplay: false,
    auditRunId: runId,
  };
}
