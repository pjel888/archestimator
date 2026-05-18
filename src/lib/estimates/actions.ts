"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { EstimateRowItem } from "@/components/workshop/estimate-tree-data";
import { getCurrentWorkspaceProject } from "@/lib/repositories/workspace-repository";
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

export async function createEstimate(projectId: string, formData: FormData) {
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project not found in the current workspace.");

  const supabase = await createSupabaseServerClient();
  const name = readRequiredText(formData, "name");
  const revisionLabel = readOptionalText(formData, "revisionLabel") ?? "Rev 0";
  const assumptions = readOptionalText(formData, "assumptions");

  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;

  const { data: estimate, error: estimateError } = await supabase
    .from("estimates")
    .insert({
      project_id: project.id,
      created_by: userResult.user?.id ?? null,
      name,
      revision_label: revisionLabel,
      assumptions,
      status: "draft",
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

  const { data: structureNode, error: structureError } = await supabase
    .from("estimate_nodes")
    .insert({
      estimate_id: estimate.id,
      parent_id: lotNode.id,
      kind: "structure",
      name: project.name,
      sort_order: 0,
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
  const sourceSnapshot = {
    category: libraryItem.category,
    imageUrl: libraryItem.imageUrl ?? null,
    pricingDate: libraryItem.pricingDate,
    pricingSource: libraryItem.pricingSource,
    sourceUrl: libraryItem.sourceUrl ?? null,
    tags: libraryItem.tags ?? [],
  };

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
