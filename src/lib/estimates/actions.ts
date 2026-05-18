"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
