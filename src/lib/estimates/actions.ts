"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { EstimateRowItem } from "@/components/workshop/estimate-tree-data";
import { getCurrentWorkspaceProject, getProjectEstimateTreeByEstimate } from "@/lib/repositories/workspace-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function readRequiredText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

function readOptionalText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

type InsertEstimateRowItemFromLibraryInput = {
  projectId: string;
  estimateId: string;
  targetNodeId: string;
  rowId: string;
  libraryItem: EstimateRowItem;
};

type UpdateEstimateRowItemInput = {
  projectId: string;
  estimateId: string;
  rowId: string;
  quantity?: number;
  supplementaryCosts?: number;
  laborCost?: number;
  discipline?: string;
  designation?: string;
};

type ReplaceEstimateRowItemInput = {
  projectId: string;
  estimateId: string;
  rowId: string;
  libraryItem: EstimateRowItem;
};

type DeleteEstimateRowItemInput = {
  projectId: string;
  estimateId: string;
  rowId: string;
};

type FetchEstimateTreeInput = {
  projectId: string;
  estimateId: string;
};

async function getValidatedEstimateRow(projectId: string, estimateId: string, rowId: string) {
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  const { data: row, error } = await supabase
    .from("estimate_row_items")
    .select("id, node_id, estimate_id, estimate_nodes!inner(id, kind, estimates!inner(project_id))")
    .eq("id", rowId)
    .eq("estimate_id", estimateId)
    .eq("estimate_nodes.estimates.project_id", project.id)
    .maybeSingle();

  if (error) throw error;
  if (!row) throw new Error("Estimate row item not found in the current project.");

  return { project, supabase, row };
}

function getSourceSnapshot(libraryItem: EstimateRowItem) {
  return {
    category: libraryItem.category,
    imageUrl: libraryItem.imageUrl ?? null,
    pricingDate: libraryItem.pricingDate,
    pricingSource: libraryItem.pricingSource,
    sourceUrl: libraryItem.sourceUrl ?? null,
    tags: libraryItem.tags ?? [],
  };
}

export async function fetchEstimateTree({ projectId, estimateId }: FetchEstimateTreeInput) {
  const { project, estimate, tree } = await getProjectEstimateTreeByEstimate(projectId, estimateId);
  if (!project || !estimate) throw new Error("Estimate not found in the current project.");
  return tree;
}

export async function createEstimate(projectId: string, formData: FormData) {
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  const name = readRequiredText(formData, "name");
  const sheetCode = readOptionalText(formData, "sheetCode") ?? readOptionalText(formData, "revisionLabel") ?? "Rev 0";

  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;

  const { data: estimate, error: estimateError } = await supabase
    .from("estimates")
    .insert({
      project_id: project.id,
      created_by: userResult.user?.id ?? null,
      name,
      sheet_code: sheetCode,
      currency_code: project.currency_code,
      metadata: {},
    })
    .select("*")
    .single();

  if (estimateError) throw estimateError;

  const { data: lotNode, error: lotError } = await supabase
    .from("estimate_nodes")
    .insert({
      estimate_id: estimate.id,
      parent_id: null,
      kind: "lot",
      name: "Lot Group 1",
      sort_order: 0,
    })
    .select("id")
    .single();

  if (lotError) throw lotError;

  const { error: generalNodesError } = await supabase.from("estimate_nodes").insert([
    {
      estimate_id: estimate.id,
      parent_id: lotNode.id,
      kind: "general",
      name: "General Requirements",
      sort_order: 0,
    },
    {
      estimate_id: estimate.id,
      parent_id: lotNode.id,
      kind: "general",
      name: "Site Works",
      sort_order: 10,
    },
  ]);

  if (generalNodesError) throw generalNodesError;

  const { data: structureNode, error: structureError } = await supabase
    .from("estimate_nodes")
    .insert({
      estimate_id: estimate.id,
      parent_id: lotNode.id,
      kind: "structure",
      name: project.name,
      sort_order: 20,
    })
    .select("id")
    .single();

  if (structureError) throw structureError;

  const { data: levelNode, error: levelError } = await supabase
    .from("estimate_nodes")
    .insert({
      estimate_id: estimate.id,
      parent_id: structureNode.id,
      kind: "level",
      name: "Ground Floor",
      sort_order: 0,
    })
    .select("id")
    .single();

  if (levelError) throw levelError;

  const { data: areaNode, error: areaError } = await supabase
    .from("estimate_nodes")
    .insert({
      estimate_id: estimate.id,
      parent_id: levelNode.id,
      kind: "area",
      name: "Project-wide",
      sort_order: 0,
    })
    .select("id")
    .single();

  if (areaError) throw areaError;

  revalidatePath(`/workshop/projects/${project.id}`);
  revalidatePath(`/workshop/projects/${project.id}/estimates`);
  redirect(`/workshop/projects/${project.id}/estimates/${areaNode.id}`);
}

export async function insertEstimateRowItemFromLibrary({ projectId, estimateId, targetNodeId, rowId, libraryItem }: InsertEstimateRowItemFromLibraryInput) {
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  const { data: targetNode, error: nodeError } = await supabase
    .from("estimate_nodes")
    .select("id, estimate_id, kind, estimates!inner(project_id)")
    .eq("id", targetNodeId)
    .eq("estimate_id", estimateId)
    .eq("kind", "area")
    .eq("estimates.project_id", project.id)
    .maybeSingle();

  if (nodeError) throw nodeError;
  if (!targetNode) throw new Error("Target estimate area not found in the current project.");

  const { data: existingRows, error: rowsError } = await supabase
    .from("estimate_row_items")
    .select("sort_order")
    .eq("estimate_id", estimateId)
    .eq("node_id", targetNodeId)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (rowsError) throw rowsError;

  const nextSortOrder = (existingRows?.[0]?.sort_order ?? -1) + 1;
  const quantity = libraryItem.quantity || 1;
  const sourceSnapshot = getSourceSnapshot(libraryItem);

  const { error: insertError } = await supabase.from("estimate_row_items").insert({
    id: rowId,
    estimate_id: estimateId,
    node_id: targetNodeId,
    sort_order: nextSortOrder,
    source_library_item_id: libraryItem.source === "library" ? libraryItem.id : null,
    source_snapshot: sourceSnapshot,
    material: libraryItem.material,
    description: libraryItem.description,
    supplier: libraryItem.supplier,
    unit: libraryItem.unit,
    quantity,
    unit_cost: libraryItem.itemCost,
    supplementary_cost: libraryItem.supplementaryCosts,
    labor_cost: libraryItem.laborCost,
    discipline: libraryItem.discipline,
    designation: libraryItem.designation,
    link_state: libraryItem.source === "library" ? "linked-clean" : "unlinked",
  });

  if (insertError) throw insertError;

  revalidatePath(`/workshop/projects/${project.id}/estimates/${targetNodeId}`);
  revalidatePath(`/workshop/projects/${project.id}/estimates`);
}

export async function updateEstimateRowItem({ projectId, estimateId, rowId, quantity, supplementaryCosts, laborCost, discipline, designation }: UpdateEstimateRowItemInput) {
  const { project, supabase, row } = await getValidatedEstimateRow(projectId, estimateId, rowId);
  const updatePayload = {
    ...(quantity !== undefined ? { quantity } : {}),
    ...(supplementaryCosts !== undefined ? { supplementary_cost: supplementaryCosts } : {}),
    ...(laborCost !== undefined ? { labor_cost: laborCost } : {}),
    ...(discipline !== undefined ? { discipline } : {}),
    ...(designation !== undefined ? { designation } : {}),
    link_state: "linked-overridden" as const,
  };

  const { error } = await supabase.from("estimate_row_items").update(updatePayload).eq("id", row.id).eq("estimate_id", estimateId);
  if (error) throw error;

  revalidatePath(`/workshop/projects/${project.id}/estimates/${row.node_id}`);
}

export async function replaceEstimateRowItemWithLibrary({ projectId, estimateId, rowId, libraryItem }: ReplaceEstimateRowItemInput) {
  const { project, supabase, row } = await getValidatedEstimateRow(projectId, estimateId, rowId);
  const quantity = libraryItem.quantity || 1;
  const { error } = await supabase
    .from("estimate_row_items")
    .update({
      source_library_item_id: libraryItem.source === "library" ? libraryItem.id : null,
      source_snapshot: getSourceSnapshot(libraryItem),
      material: libraryItem.material,
      description: libraryItem.description,
      supplier: libraryItem.supplier,
      unit: libraryItem.unit,
      quantity,
      unit_cost: libraryItem.itemCost,
      supplementary_cost: libraryItem.supplementaryCosts,
      labor_cost: libraryItem.laborCost,
      discipline: libraryItem.discipline,
      designation: libraryItem.designation,
      link_state: libraryItem.source === "library" ? "linked-clean" : "unlinked",
    })
    .eq("id", row.id)
    .eq("estimate_id", estimateId);

  if (error) throw error;

  revalidatePath(`/workshop/projects/${project.id}/estimates/${row.node_id}`);
}

export async function deleteEstimateRowItem({ projectId, estimateId, rowId }: DeleteEstimateRowItemInput) {
  const { project, supabase, row } = await getValidatedEstimateRow(projectId, estimateId, rowId);
  const { error } = await supabase.from("estimate_row_items").delete().eq("id", row.id).eq("estimate_id", estimateId);
  if (error) throw error;

  revalidatePath(`/workshop/projects/${project.id}/estimates/${row.node_id}`);
}
