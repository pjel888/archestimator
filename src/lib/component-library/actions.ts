"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireCurrentUserContext } from "@/lib/auth/session";
import {
  buildRejectedPreviewResult,
  coerceBulkExecutionResult,
  coerceBulkPreviewResult,
  normalizeBulkActionIds,
  type BulkActionExecutionResult,
  type BulkActionPreviewResult,
} from "@/lib/mass-deletion/bulk-action";
import { buildEstimateTemplatesFromRows, getCurrentWorkspaceComponentLibrary, type ComponentLibraryDataset } from "@/lib/repositories/component-library-repository";
import { ensureDefaultWorkspace } from "@/lib/repositories/workspace-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json, Tables } from "@/lib/supabase/types";
import { isUuid } from "@/lib/ids";
import {
  getLibraryFolderCreateSortOrder,
  type LibraryFolderCreatePlacement,
} from "./library-folder-reorder";
import { readComponentSourceUrlInput } from "./source-url";

export type ComponentLifecycleState = "draft" | "in_production" | "available" | "discontinued" | "archived";

export type ComponentPriceOptionInput = {
  id?: string;
  label: string;
  sku?: string | null;
  variantDescription?: string;
  variantSortOrder?: number;
  unit: string;
  unitCost: number;
  miscCost?: number;
  currency?: string;
  pricingSource?: string;
  pricingDate?: string;
  confidence?: string;
  sourceUrl?: string;
  notes?: string;
  supplierId?: string | null;
  activeCostEntryId?: string | null;
  costEntries?: ComponentVariantCostEntryInput[];
  packageQuantity?: number | null;
  packageUnit?: string | null;
  dimensionLength?: number | null;
  dimensionWidth?: number | null;
  dimensionHeight?: number | null;
  dimensionUnit?: string | null;
  mass?: number | null;
  massUnit?: string | null;
  imageBucket?: string | null;
  imagePath?: string | null;
  thumbnailPath?: string | null;
  imageMetadata?: Json;
  attachments?: ComponentVariantAttachmentInput[];
  variantMetadata?: Json;
  isDefault?: boolean;
  isActive?: boolean;
  changeReason?: string;
  effectiveAt?: string;
};

export type ComponentVariantCostEntryInput = {
  id?: string;
  clientId?: string;
  unitCost: number;
  miscCost?: number;
  currency?: string;
  pricingSource?: string;
  pricingDate?: string;
  confidence?: string;
  sourceUrl?: string;
  notes?: string;
  isCurrent?: boolean;
  deletedAt?: string | null;
};

export type ComponentVariantAttachmentInput = {
  id?: string;
  bucket: string;
  path: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  kind?: "pdf" | "excel";
  metadata?: Json;
};

export type CostLibraryComponentInput = {
  id?: string;
  name: string;
  description?: string;
  category?: string;
  categoryNodeId?: string | null;
  supplier?: string | null;
  supplierId?: string | null;
  brand?: string | null;
  brandId?: string | null;
  unit: string;
  thumbnailPath?: string | null;
  libraryFolderId?: string | null;
  lifecycleState?: ComponentLifecycleState;
  effectiveAt?: string;
  changeReason?: string;
  metadata?: Json;
};

export type CreateCostLibraryComponentInput = CostLibraryComponentInput & {
  priceOptions: ComponentPriceOptionInput[];
};

export type LibraryFolderActionResult = {
  folder: Tables<"library_folders">;
};

export type CreateLibraryFolderOptions = {
  placement?: LibraryFolderCreatePlacement;
};

export type ReorderLibraryFoldersInput = {
  updates: Array<{
    id: string;
    parentId: string | null;
    sortOrder: number;
  }>;
};

export type MoveCostLibraryComponentToFolderInput = {
  itemId: string;
  libraryFolderId: string | null;
};

export type BulkArchiveLibraryComponentsInput = {
  itemIds: string[];
};

export type ExecuteBulkArchiveLibraryComponentsInput = BulkArchiveLibraryComponentsInput & {
  expectedPreviewHash: string;
  correlationId?: string;
};

function revalidateLibraryRoutes() {
  revalidatePath("/workshop/library");
  revalidatePath("/workshop/components");
}

function getMassDeletionCorrelationId(correlationId: string | undefined) {
  return correlationId && isUuid(correlationId) ? correlationId : randomUUID();
}

function readFolderName(name: string) {
  const value = name.trim();
  if (!value) throw new Error("Folder name is required.");
  return value;
}

async function assertCanManageLibraryFolders(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  workspaceId: string,
) {
  const { data, error } = await supabase.rpc("is_workspace_editor", { target_workspace_id: workspaceId });
  if (error) throw new Error(`Could not verify library folder access: ${error.message}`);
  if (data !== true) throw new Error("Only workspace editors/admins can manage library folders.");
}

function readRequiredComponentText(value: string | undefined | null, label: string) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label} is required.`);
  return text;
}

function validatePriceOptions(priceOptions: ComponentPriceOptionInput[]) {
  if (priceOptions.length === 0) throw new Error("At least one variant is required.");
  const defaultCount = priceOptions.filter((option) => option.isDefault).length;
  if (defaultCount !== 1) throw new Error("Exactly one default variant is required.");
  for (const option of priceOptions) {
    readRequiredComponentText(option.label, "Variant name");
    readRequiredComponentText(option.unit, "Variant unit");
    if (!Number.isFinite(option.unitCost) || option.unitCost < 0) throw new Error("Variant cost must be a non-negative number.");
    if (option.miscCost !== undefined && (!Number.isFinite(option.miscCost) || option.miscCost < 0)) {
      throw new Error("Variant misc cost must be a non-negative number.");
    }
    const activeCostEntries = (option.costEntries ?? []).filter((entry) => entry.deletedAt === undefined || entry.deletedAt === null);
    if (activeCostEntries.length > 0) {
      const currentCount = activeCostEntries.filter((entry) => entry.isCurrent).length;
      if (currentCount !== 1) throw new Error("Each variant must have exactly one current cost entry.");
      for (const entry of activeCostEntries) {
        if (!Number.isFinite(entry.unitCost) || entry.unitCost < 0) throw new Error("Variant cost entries must use non-negative costs.");
        if (entry.miscCost !== undefined && (!Number.isFinite(entry.miscCost) || entry.miscCost < 0)) {
          throw new Error("Variant cost entries must use non-negative misc costs.");
        }
      }
    }
    for (const attachment of option.attachments ?? []) {
      readRequiredComponentText(attachment.path, "Attachment path");
      readRequiredComponentText(attachment.fileName, "Attachment file name");
      if (![
        "application/pdf",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ].includes(attachment.contentType)) {
        throw new Error("Variant attachments must be PDF or Excel files.");
      }
      if (!Number.isFinite(attachment.sizeBytes) || attachment.sizeBytes <= 0) throw new Error("Variant attachment size must be positive.");
    }
    if (option.packageQuantity !== undefined && option.packageQuantity !== null && (!Number.isFinite(option.packageQuantity) || option.packageQuantity <= 0)) {
      throw new Error("Variant package quantity must be a positive number.");
    }
    for (const measurement of [option.dimensionLength, option.dimensionWidth, option.dimensionHeight, option.mass]) {
      if (measurement !== undefined && measurement !== null && (!Number.isFinite(measurement) || measurement <= 0)) {
        throw new Error("Variant measurements must be positive numbers.");
      }
    }
  }
}

function normalizeComponentInput(input: CostLibraryComponentInput) {
  return {
    ...input,
    name: readRequiredComponentText(input.name, "Component name"),
    unit: readRequiredComponentText(input.unit, "Component unit"),
    category: input.category?.trim() || "General",
    description: input.description ?? "",
    supplier: input.supplier?.trim() || null,
    brand: input.brand?.trim() || null,
    brandId: input.brandId?.trim() || null,
    thumbnailPath: input.thumbnailPath?.trim() || null,
    lifecycleState: input.lifecycleState ?? "available",
    effectiveAt: input.effectiveAt || new Date().toISOString(),
    changeReason: input.changeReason ?? "",
    metadata: input.metadata ?? {},
  };
}

function normalizePriceOptionInput(input: ComponentPriceOptionInput) {
  const sourceUrl = readComponentSourceUrlInput(input.sourceUrl);
  const costEntries = input.costEntries?.length
    ? input.costEntries.map((entry) => ({
        ...entry,
        clientId: entry.clientId?.trim() || entry.id?.trim() || undefined,
        miscCost: entry.miscCost ?? 0,
        currency: entry.currency ?? input.currency ?? "PHP",
        pricingSource: entry.pricingSource?.trim() || null,
        pricingDate: entry.pricingDate || input.pricingDate || new Date().toISOString().slice(0, 10),
        confidence: entry.confidence?.trim() || null,
        sourceUrl: readComponentSourceUrlInput(entry.sourceUrl, "Cost entry source URL"),
        notes: entry.notes ?? "",
        deletedAt: entry.deletedAt ?? null,
        isCurrent: entry.isCurrent ?? false,
      }))
    : [{
        clientId: input.activeCostEntryId?.trim() || undefined,
        unitCost: input.unitCost,
        miscCost: input.miscCost ?? 0,
        currency: input.currency ?? "PHP",
        pricingSource: input.pricingSource?.trim() || null,
        pricingDate: input.pricingDate || new Date().toISOString().slice(0, 10),
        confidence: input.confidence?.trim() || null,
        sourceUrl,
        notes: input.notes ?? "",
        isCurrent: true,
        deletedAt: null,
      }];
  const attachments = (input.attachments ?? []).map((attachment) => ({
    ...attachment,
    bucket: attachment.bucket.trim(),
    path: attachment.path.trim(),
    fileName: attachment.fileName.trim(),
    contentType: attachment.contentType.trim(),
    kind: attachment.kind ?? (attachment.contentType === "application/pdf" ? "pdf" : "excel"),
    metadata: attachment.metadata ?? {},
  }));

  return {
    ...input,
    label: readRequiredComponentText(input.label, "Variant name"),
    sku: input.sku?.trim() || null,
    variantDescription: input.variantDescription ?? "",
    variantSortOrder: input.variantSortOrder ?? 0,
    unit: readRequiredComponentText(input.unit, "Variant unit"),
    miscCost: input.miscCost ?? 0,
    currency: input.currency ?? "PHP",
    pricingSource: input.pricingSource?.trim() || null,
    pricingDate: input.pricingDate || null,
    confidence: input.confidence?.trim() || null,
    sourceUrl,
    notes: input.notes ?? "",
    supplierId: input.supplierId ?? null,
    activeCostEntryId: input.activeCostEntryId?.trim() || costEntries.find((entry) => entry.isCurrent)?.clientId || null,
    costEntries,
    packageQuantity: input.packageQuantity ?? null,
    packageUnit: input.packageUnit?.trim() || null,
    dimensionLength: input.dimensionLength ?? null,
    dimensionWidth: input.dimensionWidth ?? null,
    dimensionHeight: input.dimensionHeight ?? null,
    dimensionUnit: input.dimensionUnit?.trim() || null,
    mass: input.mass ?? null,
    massUnit: input.massUnit?.trim() || null,
    imageBucket: input.imageBucket?.trim() || null,
    imagePath: input.imagePath?.trim() || null,
    thumbnailPath: input.thumbnailPath?.trim() || null,
    imageMetadata: input.imageMetadata ?? {},
    attachments,
    variantMetadata: input.variantMetadata ?? {},
    isActive: input.isActive ?? true,
    isDefault: input.isDefault ?? false,
    effectiveAt: input.effectiveAt || new Date().toISOString(),
    changeReason: input.changeReason ?? "",
  };
}

function readMetadataObject(metadata: Json | undefined): { [key: string]: Json | undefined } {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) return metadata;
  return {};
}

function getRpcString(result: unknown, key: string): string | undefined {
  if (!result || typeof result !== "object" || Array.isArray(result)) return undefined;
  const value = (result as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function getRpcNumber(result: unknown, key: string): number | undefined {
  if (!result || typeof result !== "object" || Array.isArray(result)) return undefined;
  const value = (result as Record<string, unknown>)[key];
  return typeof value === "number" ? value : undefined;
}

function getRpcPriceOptions(result: unknown): Array<{ id: string; label: string; isDefault: boolean }> {
  if (!result || typeof result !== "object" || Array.isArray(result)) return [];
  const value = (result as Record<string, unknown>).priceOptions;
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const option = entry as Record<string, unknown>;
    return typeof option.id === "string" && typeof option.label === "string"
      ? [{ id: option.id, label: option.label, isDefault: option.isDefault === true }]
      : [];
  });
}

// Lazy estimate-sheet path: the sheet renders without the library dataset and
// the client fetches it on demand. requireCurrentUserContext keeps this server
// action fail-closed for anonymous callers, matching the page-load auth gate.
export async function loadCurrentWorkspaceComponentLibrary(): Promise<ComponentLibraryDataset> {
  await requireCurrentUserContext();
  return getCurrentWorkspaceComponentLibrary();
}

export async function createCostLibraryComponent(input: CreateCostLibraryComponentInput) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  validatePriceOptions(input.priceOptions);

  const supabase = await createSupabaseServerClient();
  const component = normalizeComponentInput({
    ...input,
    metadata: {
      ...readMetadataObject(input.metadata),
      source: "library",
      isCustom: true,
      createdFrom: "workshop-library",
    },
  });
  const priceOptions = input.priceOptions.map((option) => normalizePriceOptionInput({ ...option, unit: option.unit || component.unit }));
  const { data, error } = await supabase.rpc("create_cost_library_component", {
    target_workspace_id: workspace.id,
    component: { ...component, createdBy: currentUser.userId } as Json,
    price_options: priceOptions as Json,
  });

  if (error) throw new Error(`Could not create component: ${error.message}`);
  revalidateLibraryRoutes();
  return {
    itemId: getRpcString(data, "itemId"),
    versionNumber: getRpcNumber(data, "versionNumber"),
    activePriceOptionId: getRpcString(data, "activePriceOptionId"),
    priceOptions: getRpcPriceOptions(data),
  };
}

export async function updateCostLibraryComponent(itemId: string, input: CostLibraryComponentInput) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("update_cost_library_component", {
    target_workspace_id: workspace.id,
    target_item_id: itemId,
    component: { ...normalizeComponentInput(input), updatedBy: currentUser.userId } as Json,
  });

  if (error) throw new Error(`Could not update component: ${error.message}`);
  revalidateLibraryRoutes();
  return {
    itemId: getRpcString(data, "itemId"),
    versionNumber: getRpcNumber(data, "versionNumber"),
  };
}

export async function upsertCostLibraryComponentPriceOption(itemId: string, input: ComponentPriceOptionInput) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("upsert_cost_library_component_price_option", {
    target_workspace_id: workspace.id,
    target_item_id: itemId,
    price_option: { ...normalizePriceOptionInput(input), updatedBy: currentUser.userId } as Json,
  });

  if (error) throw new Error(`Could not save price option: ${error.message}`);
  revalidateLibraryRoutes();
  return {
    itemId: getRpcString(data, "itemId"),
    priceOptionId: getRpcString(data, "priceOptionId"),
    versionNumber: getRpcNumber(data, "versionNumber"),
  };
}

export async function changeCostLibraryComponentLifecycleState(input: {
  itemId: string;
  lifecycleState: ComponentLifecycleState;
  changeReason?: string;
  effectiveAt?: string;
}) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("set_cost_library_component_lifecycle_state", {
    target_workspace_id: workspace.id,
    target_item_id: input.itemId,
    next_state: input.lifecycleState,
    change_reason: input.changeReason ?? "",
    effective_at: input.effectiveAt ?? new Date().toISOString(),
    acting_user_id: currentUser.userId,
  });

  if (error) throw new Error(`Could not change component state: ${error.message}`);
  revalidateLibraryRoutes();
  return {
    itemId: getRpcString(data, "itemId"),
    versionNumber: getRpcNumber(data, "versionNumber"),
    lifecycleState: getRpcString(data, "lifecycleState"),
  };
}

export async function previewBulkArchiveLibraryComponents(input: BulkArchiveLibraryComponentsInput): Promise<BulkActionPreviewResult> {
  const { ids, issues } = normalizeBulkActionIds(input.itemIds, { label: "components", max: 500 });
  if (issues.length > 0) return buildRejectedPreviewResult("library_component", ids, issues);

  const [{ workspace }] = await Promise.all([
    ensureDefaultWorkspace(),
    requireCurrentUserContext(),
  ]);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("preview_bulk_archive_library_components", {
    target_workspace_id: workspace.id,
    target_item_ids: ids,
  });

  if (error) {
    return buildRejectedPreviewResult("library_component", ids, [{
      code: "rpc_error",
      message: `Could not preview component archive: ${error.message}`,
    }]);
  }

  return coerceBulkPreviewResult(data, { targetType: "library_component", ids });
}

export async function executeBulkArchiveLibraryComponents(input: ExecuteBulkArchiveLibraryComponentsInput): Promise<BulkActionExecutionResult> {
  const { ids, issues } = normalizeBulkActionIds(input.itemIds, { label: "components", max: 500 });
  if (issues.length > 0) {
    return {
      ...buildRejectedPreviewResult("library_component", ids, issues),
      archivedIds: [],
    };
  }

  const [{ workspace }] = await Promise.all([
    ensureDefaultWorkspace(),
    requireCurrentUserContext(),
  ]);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("execute_bulk_archive_library_components", {
    target_workspace_id: workspace.id,
    target_item_ids: ids,
    expected_preview_hash: input.expectedPreviewHash,
    correlation_id: getMassDeletionCorrelationId(input.correlationId),
  });

  if (error) {
    return {
      ok: false,
      targetType: "library_component",
      ids,
      archivedIds: [],
      summary: { requestedCount: ids.length, eligibleCount: 0, blockedCount: 1 },
      issues: [{
        code: "rpc_error",
        message: `Could not archive components: ${error.message}`,
      }],
    };
  }

  const result = coerceBulkExecutionResult(data, { targetType: "library_component", ids });
  if (result.ok) revalidateLibraryRoutes();
  return result;
}

export async function createLibraryFolder(parentId: string | null, name: string, options: CreateLibraryFolderOptions = {}): Promise<LibraryFolderActionResult> {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const supabase = await createSupabaseServerClient();
  await assertCanManageLibraryFolders(supabase, workspace.id);
  const parentResult = parentId
    ? await supabase
        .from("library_folders")
        .select("id, workspace_id")
        .eq("id", parentId)
        .eq("workspace_id", workspace.id)
        .maybeSingle()
    : null;

  if (parentResult?.error) throw parentResult.error;
  if (parentId && !parentResult?.data) throw new Error("Parent folder not found in the current workspace.");

  let siblingsQuery = supabase
    .from("library_folders")
    .select("sort_order")
    .eq("workspace_id", workspace.id);
  siblingsQuery = parentId ? siblingsQuery.eq("parent_id", parentId) : siblingsQuery.is("parent_id", null);
  const { data: siblings, error: siblingsError } = await siblingsQuery;
  if (siblingsError) throw siblingsError;

  const nextSortOrder = getLibraryFolderCreateSortOrder(siblings ?? [], options.placement ?? "bottom");
  const { data, error } = await supabase
    .from("library_folders")
    .insert({
      workspace_id: workspace.id,
      parent_id: parentId,
      name: readFolderName(name),
      sort_order: nextSortOrder,
      folder_kind: "custom",
      created_by: currentUser.userId,
    })
    .select("*")
    .single();

  if (error) throw error;
  revalidateLibraryRoutes();
  return { folder: data };
}

export async function renameLibraryFolder(folderId: string, name: string): Promise<LibraryFolderActionResult> {
  const { workspace } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();
  await assertCanManageLibraryFolders(supabase, workspace.id);
  const { data, error } = await supabase
    .from("library_folders")
    .update({ name: readFolderName(name) })
    .eq("id", folderId)
    .eq("workspace_id", workspace.id)
    .select("*")
    .single();

  if (error) throw error;
  revalidateLibraryRoutes();
  return { folder: data };
}

export async function deleteLibraryFolder(folderId: string): Promise<void> {
  const { workspace } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();
  await assertCanManageLibraryFolders(supabase, workspace.id);
  if (!isUuid(folderId)) throw new Error("Library folder not found in the current workspace.");

  const { error } = await supabase.rpc("delete_library_folder", {
    target_workspace_id: workspace.id,
    target_folder_id: folderId,
  });
  if (error) throw new Error(`Could not delete library folder: ${error.message}`);

  revalidateLibraryRoutes();
}

export async function reorderLibraryFolders(input: ReorderLibraryFoldersInput): Promise<void> {
  if (!input.updates.length) throw new Error("At least one library folder update is required.");

  const { workspace } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();
  await assertCanManageLibraryFolders(supabase, workspace.id);
  const folderUpdates = input.updates.map((update) => ({
    id: update.id,
    parent_id: update.parentId,
    sort_order: update.sortOrder,
  }));
  const { error } = await supabase.rpc("reorder_library_folders", {
    target_workspace_id: workspace.id,
    folder_updates: folderUpdates,
  });

  if (error) throw new Error(`Could not reorder library folders: ${error.message}`);
  revalidateLibraryRoutes();
}

export async function moveCostLibraryComponentToFolder(input: MoveCostLibraryComponentToFolderInput): Promise<void> {
  const [{ workspace }] = await Promise.all([
    ensureDefaultWorkspace(),
    requireCurrentUserContext(),
  ]);
  const supabase = await createSupabaseServerClient();
  await assertCanManageLibraryFolders(supabase, workspace.id);

  if (!isUuid(input.itemId)) throw new Error("Component not found in the current workspace.");

  let targetFolderId: string | null = null;
  if (input.libraryFolderId) {
    if (!isUuid(input.libraryFolderId)) throw new Error("Library folder not found in the current workspace.");
    const { data: folder, error: folderError } = await supabase
      .from("library_folders")
      .select("id")
      .eq("id", input.libraryFolderId)
      .eq("workspace_id", workspace.id)
      .maybeSingle();

    if (folderError) throw folderError;
    if (!folder) throw new Error("Library folder not found in the current workspace.");
    targetFolderId = folder.id;
  }

  const { data: component, error } = await supabase
    .from("cost_library_items")
    .update({ library_folder_id: targetFolderId })
    .eq("id", input.itemId)
    .eq("workspace_id", workspace.id)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(`Could not move component: ${error.message}`);
  if (!component) throw new Error("Component not found in the current workspace.");
  revalidateLibraryRoutes();
}

export type CreateEstimateTemplateFromNodeInput = {
  projectId: string;
  estimateId: string;
  sourceNodeId: string;
  name: string;
  description?: string;
  category?: string;
};

type EstimateNodeSubtreeRow = {
  id: string;
  parent_id: string | null;
  kind: string;
  name: string;
  sort_order: number;
};

/**
 * Saves an estimate node (group or area) and its whole subtree — child
 * nodes plus estimate rows — as a reusable workspace template. The server
 * reads the subtree authoritatively; clients only send identifiers, never
 * tree payloads. RLS on the template tables limits writes to workspace
 * members.
 */
export async function createEstimateTemplateFromEstimateNode(input: CreateEstimateTemplateFromNodeInput) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const supabase = await createSupabaseServerClient();

  const templateName = input.name.trim();
  if (!templateName) throw new Error("Template name is required.");
  const templateCategory = (input.category ?? "").trim() || "General";
  const templateDescription = (input.description ?? "").trim();
  if (!isUuid(input.estimateId) || !isUuid(input.sourceNodeId)) {
    throw new Error("Estimate node not found in the current workspace.");
  }

  const { data: estimate, error: estimateError } = await supabase
    .from("estimates")
    .select("id, project_id, projects!inner(id, workspace_id)")
    .eq("id", input.estimateId)
    .eq("project_id", input.projectId)
    .eq("projects.workspace_id", workspace.id)
    .maybeSingle();
  if (estimateError) throw new Error(`Could not load the estimate: ${estimateError.message}`);
  if (!estimate) throw new Error("Estimate not found in the current workspace.");

  const { data: nodeRows, error: nodesError } = await supabase
    .from("estimate_nodes")
    .select("id, parent_id, kind, name, sort_order")
    .eq("estimate_id", input.estimateId)
    .order("sort_order", { ascending: true });
  if (nodesError) throw new Error(`Could not load the estimate tree: ${nodesError.message}`);

  const allNodes = (nodeRows ?? []) as EstimateNodeSubtreeRow[];
  const sourceNode = allNodes.find((node) => node.id === input.sourceNodeId);
  if (!sourceNode) throw new Error("The selected node no longer exists in this estimate.");

  // Collect the subtree in breadth-first order so parents precede children.
  const childrenByParentId = new Map<string | null, EstimateNodeSubtreeRow[]>();
  for (const node of allNodes) {
    const siblings = childrenByParentId.get(node.parent_id) ?? [];
    siblings.push(node);
    childrenByParentId.set(node.parent_id, siblings);
  }
  const subtreeNodes: EstimateNodeSubtreeRow[] = [];
  const queue: EstimateNodeSubtreeRow[] = [sourceNode];
  while (queue.length > 0) {
    const node = queue.shift()!;
    subtreeNodes.push(node);
    queue.push(...(childrenByParentId.get(node.id) ?? []));
  }

  const subtreeNodeIds = subtreeNodes.map((node) => node.id);
  const { data: rowItemRows, error: rowItemsError } = await supabase
    .from("estimate_row_items")
    .select(
      "id, node_id, sort_order, source_library_item_id, source_snapshot, category_node_id, supplier_id, material, description, supplier, unit, quantity, unit_cost, contingency_percentage, misc_cost, discipline, designation, link_state, metadata",
    )
    .eq("estimate_id", input.estimateId)
    .in("node_id", subtreeNodeIds)
    .order("sort_order", { ascending: true });
  if (rowItemsError) throw new Error(`Could not load the estimate rows: ${rowItemsError.message}`);

  const { data: siblingTemplates, error: sortError } = await supabase
    .from("estimate_templates")
    .select("sort_order")
    .eq("workspace_id", workspace.id)
    .order("sort_order", { ascending: false })
    .limit(1);
  if (sortError) throw new Error(`Could not create the template: ${sortError.message}`);
  const nextSortOrder = (siblingTemplates?.[0]?.sort_order ?? -1) + 1;

  const { data: insertedTemplate, error: templateError } = await supabase
    .from("estimate_templates")
    .insert({
      workspace_id: workspace.id,
      name: templateName,
      description: templateDescription,
      category: templateCategory,
      sort_order: nextSortOrder,
      created_by: currentUser.userId,
      metadata: {
        savedFrom: "estimate-workspace",
        sourceEstimateId: input.estimateId,
        sourceNodeId: input.sourceNodeId,
      },
    })
    .select("*")
    .single();
  if (templateError || !insertedTemplate) {
    throw new Error(`Could not create the template: ${templateError?.message ?? "no template row returned"}`);
  }

  try {
    const templateNodeIdBySourceId = new Map<string, string>(subtreeNodes.map((node) => [node.id, randomUUID()]));
    const templateNodeInserts = subtreeNodes.map((node) => ({
      id: templateNodeIdBySourceId.get(node.id)!,
      template_id: insertedTemplate.id,
      // The saved node becomes the template root; descendants keep shape.
      parent_id: node.id === sourceNode.id ? null : templateNodeIdBySourceId.get(node.parent_id ?? "") ?? null,
      kind: node.kind as "group" | "area",
      name: node.name,
      sort_order: node.id === sourceNode.id ? 0 : node.sort_order,
      metadata: {},
    }));

    const { data: insertedNodes, error: nodeInsertError } = await supabase
      .from("estimate_template_nodes")
      .insert(templateNodeInserts)
      .select("*");
    if (nodeInsertError) throw new Error(`Could not copy the node structure: ${nodeInsertError.message}`);

    const rowInserts = (rowItemRows ?? []).map((row) => ({
      template_id: insertedTemplate.id,
      template_node_id: templateNodeIdBySourceId.get(row.node_id)!,
      sort_order: row.sort_order,
      source_library_item_id: row.source_library_item_id,
      source_snapshot: row.source_snapshot,
      category_node_id: row.category_node_id,
      supplier_id: row.supplier_id,
      material: row.material,
      description: row.description,
      supplier: row.supplier,
      unit: row.unit,
      quantity: row.quantity,
      unit_cost: row.unit_cost,
      contingency_percentage: row.contingency_percentage,
      misc_cost: row.misc_cost,
      discipline: row.discipline,
      designation: row.designation,
      link_state: row.link_state,
      metadata: row.metadata,
    }));

    let insertedRowItems: Tables<"estimate_template_row_items">[] = [];
    if (rowInserts.length > 0) {
      const { data, error: rowInsertError } = await supabase
        .from("estimate_template_row_items")
        .insert(rowInserts)
        .select("*");
      if (rowInsertError) throw new Error(`Could not copy the estimate rows: ${rowInsertError.message}`);
      insertedRowItems = data ?? [];
    }

    revalidatePath("/workshop/library/templates");

    const [template] = buildEstimateTemplatesFromRows({
      templates: [insertedTemplate],
      nodes: insertedNodes ?? [],
      rowItems: insertedRowItems,
    });
    if (!template) throw new Error("Could not read back the created template.");
    return { template };
  } catch (error) {
    // Without a cross-statement transaction, a partial failure leaves an
    // orphan template; deleting it cascades to any copied nodes/rows.
    await supabase.from("estimate_templates").delete().eq("id", insertedTemplate.id);
    throw error;
  }
}

/** Renames a workspace estimate template. */
export async function renameEstimateTemplate(input: { templateId: string; name: string }) {
  const [{ workspace }] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const templateName = input.name.trim();
  if (!templateName) throw new Error("Template name is required.");
  if (!isUuid(input.templateId)) throw new Error("Template not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  const { data: template, error } = await supabase
    .from("estimate_templates")
    .update({ name: templateName })
    .eq("id", input.templateId)
    .eq("workspace_id", workspace.id)
    .select("id, name")
    .maybeSingle();

  if (error) throw new Error(`Could not rename template: ${error.message}`);
  if (!template) throw new Error("Template not found in the current workspace.");
  revalidatePath("/workshop/library/templates");
  return { templateId: template.id, name: template.name };
}

/** Deletes a workspace estimate template; nodes and rows cascade. */
export async function deleteEstimateTemplate(input: { templateId: string }) {
  const [{ workspace }] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  if (!isUuid(input.templateId)) throw new Error("Template not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  const { data: template, error } = await supabase
    .from("estimate_templates")
    .delete()
    .eq("id", input.templateId)
    .eq("workspace_id", workspace.id)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(`Could not delete template: ${error.message}`);
  if (!template) throw new Error("Template not found in the current workspace.");
  revalidatePath("/workshop/library/templates");
  return { templateId: template.id };
}

/**
 * Counts where a library component is referenced: template rows and estimate
 * rows whose `source_library_item_id` points at the item (RLS-scoped, both
 * columns indexed). Powers the inspector dock's "Used in" section.
 */
export async function getCostLibraryComponentUsage(input: { itemId: string }) {
  await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  if (!isUuid(input.itemId)) return { templateRowCount: 0, estimateRowCount: 0 };

  const supabase = await createSupabaseServerClient();
  const [templateRows, estimateRows] = await Promise.all([
    supabase
      .from("estimate_template_row_items")
      .select("id", { count: "exact", head: true })
      .eq("source_library_item_id", input.itemId),
    supabase
      .from("estimate_row_items")
      .select("id", { count: "exact", head: true })
      .eq("source_library_item_id", input.itemId),
  ]);

  if (templateRows.error) throw new Error(`Could not count template usage: ${templateRows.error.message}`);
  if (estimateRows.error) throw new Error(`Could not count estimate usage: ${estimateRows.error.message}`);

  return {
    templateRowCount: templateRows.count ?? 0,
    estimateRowCount: estimateRows.count ?? 0,
  };
}
