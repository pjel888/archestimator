"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { ensureDefaultWorkspace } from "@/lib/repositories/workspace-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json, Tables } from "@/lib/supabase/types";
import { planLibraryFolderDelete, type LibraryFolderRecord } from "./library-folder-reorder";

export type ComponentLifecycleState = "draft" | "in_production" | "available" | "discontinued" | "archived";

export type ComponentPriceOptionInput = {
  id?: string;
  label: string;
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
  isDefault?: boolean;
  isActive?: boolean;
  changeReason?: string;
  effectiveAt?: string;
};

export type CostLibraryComponentInput = {
  id?: string;
  kind?: Tables<"cost_library_items">["kind"];
  name: string;
  description?: string;
  category?: string;
  categoryNodeId?: string | null;
  supplier?: string | null;
  supplierId?: string | null;
  brand?: string | null;
  sku?: string | null;
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

export type ReorderLibraryFoldersInput = {
  updates: Array<{
    id: string;
    parentId: string | null;
    sortOrder: number;
  }>;
};

function revalidateLibraryRoutes() {
  revalidatePath("/workshop/library");
  revalidatePath("/workshop/components");
}

function readFolderName(name: string) {
  const value = name.trim();
  if (!value) throw new Error("Folder name is required.");
  return value;
}

function readRequiredComponentText(value: string | undefined | null, label: string) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label} is required.`);
  return text;
}

function validatePriceOptions(priceOptions: ComponentPriceOptionInput[]) {
  if (priceOptions.length === 0) throw new Error("At least one price option is required.");
  const defaultCount = priceOptions.filter((option) => option.isDefault).length;
  if (defaultCount !== 1) throw new Error("Exactly one default price option is required.");
  for (const option of priceOptions) {
    readRequiredComponentText(option.label, "Price option label");
    readRequiredComponentText(option.unit, "Price option unit");
    if (!Number.isFinite(option.unitCost) || option.unitCost < 0) throw new Error("Price option unit cost must be a non-negative number.");
    if (option.miscCost !== undefined && (!Number.isFinite(option.miscCost) || option.miscCost < 0)) {
      throw new Error("Price option misc cost must be a non-negative number.");
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
    sku: input.sku?.trim() || null,
    thumbnailPath: input.thumbnailPath?.trim() || null,
    lifecycleState: input.lifecycleState ?? "available",
    effectiveAt: input.effectiveAt || new Date().toISOString(),
    changeReason: input.changeReason ?? "",
    metadata: input.metadata ?? {},
  };
}

function normalizePriceOptionInput(input: ComponentPriceOptionInput) {
  return {
    ...input,
    label: readRequiredComponentText(input.label, "Price option label"),
    unit: readRequiredComponentText(input.unit, "Price option unit"),
    miscCost: input.miscCost ?? 0,
    currency: input.currency ?? "PHP",
    pricingSource: input.pricingSource?.trim() || null,
    pricingDate: input.pricingDate || null,
    confidence: input.confidence?.trim() || null,
    sourceUrl: input.sourceUrl?.trim() || null,
    notes: input.notes ?? "",
    supplierId: input.supplierId ?? null,
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

export async function createLibraryFolder(parentId: string | null, name: string): Promise<LibraryFolderActionResult> {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const supabase = await createSupabaseServerClient();
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

  const nextSortOrder = ((siblings ?? []).reduce((max, folder) => Math.max(max, folder.sort_order), 0) || 0) + 10;
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
  const { data: folder, error: folderError } = await supabase
    .from("library_folders")
    .select("id, workspace_id, parent_id, name, sort_order, source_category_node_id, folder_kind")
    .eq("id", folderId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (folderError) throw folderError;
  if (!folder) throw new Error("Library folder not found in the current workspace.");

  const targetSiblingsQuery = supabase
    .from("library_folders")
    .select("id, workspace_id, parent_id, name, sort_order, source_category_node_id, folder_kind")
    .eq("workspace_id", workspace.id)
    .neq("id", folder.id)
    .order("sort_order", { ascending: true });
  const targetSiblings = folder.parent_id
    ? targetSiblingsQuery.eq("parent_id", folder.parent_id)
    : targetSiblingsQuery.is("parent_id", null);
  const children = supabase
    .from("library_folders")
    .select("id, workspace_id, parent_id, name, sort_order, source_category_node_id, folder_kind")
    .eq("workspace_id", workspace.id)
    .eq("parent_id", folder.id)
    .order("sort_order", { ascending: true });
  const [{ data: siblingFolders, error: siblingError }, { data: childFolders, error: childError }] = await Promise.all([targetSiblings, children]);
  if (siblingError) throw siblingError;
  if (childError) throw childError;

  const deletePlan = planLibraryFolderDelete(
    [folder, ...(siblingFolders ?? []), ...(childFolders ?? [])] as LibraryFolderRecord[],
    folder.id,
  );
  for (const update of deletePlan?.liftedChildUpdates ?? []) {
    const { error: liftError } = await supabase
      .from("library_folders")
      .update({ parent_id: update.parentId, sort_order: update.sortOrder })
      .eq("workspace_id", workspace.id)
      .eq("id", update.id);
    if (liftError) throw liftError;
  }

  const { error: itemError } = await supabase
    .from("cost_library_items")
    .update({ library_folder_id: null })
    .eq("workspace_id", workspace.id)
    .eq("library_folder_id", folder.id);
  if (itemError) throw itemError;

  const { error: deleteError } = await supabase
    .from("library_folders")
    .delete()
    .eq("workspace_id", workspace.id)
    .eq("id", folder.id);
  if (deleteError) throw deleteError;

  revalidateLibraryRoutes();
}

export async function reorderLibraryFolders(input: ReorderLibraryFoldersInput): Promise<void> {
  if (!input.updates.length) throw new Error("At least one library folder update is required.");

  const { workspace } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();
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
