"use server";

import { revalidatePath } from "next/cache";

import { isUuid } from "@/lib/ids";
import { ensureDefaultWorkspace } from "@/lib/repositories/workspace-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type FavoriteActionInput = {
  favorite: boolean;
};

type ProjectFavoriteInput = FavoriteActionInput & {
  projectId: string;
};

type EstimateFavoriteInput = FavoriteActionInput & {
  estimateId: string;
};

function assertUuid(value: string, label: string) {
  if (!isUuid(value)) throw new Error(`${label} is invalid.`);
}

export async function setProjectFavorite({ projectId, favorite }: ProjectFavoriteInput) {
  if (typeof favorite !== "boolean") throw new Error("Invalid input.");
  assertUuid(projectId, "Project");

  const { workspace, profile } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();

  if (!favorite) {
    const { error } = await supabase
      .from("project_favorites")
      .delete()
      .eq("user_id", profile.id)
      .eq("project_id", projectId);

    if (error) throw error;

    revalidatePath("/workshop");
    revalidatePath("/workshop/projects");
    return;
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, workspace_id")
    .eq("id", projectId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (projectError) throw projectError;
  if (!project) throw new Error("Project was not found in this workspace.");

  const { error } = await supabase
    .from("project_favorites")
    .upsert(
      {
        workspace_id: workspace.id,
        user_id: profile.id,
        project_id: project.id,
      },
      { onConflict: "user_id,project_id" },
    );

  if (error) throw error;

  revalidatePath("/workshop");
  revalidatePath("/workshop/projects");
}

export async function setEstimateFavorite({ estimateId, favorite }: EstimateFavoriteInput) {
  if (typeof favorite !== "boolean") throw new Error("Invalid input.");
  assertUuid(estimateId, "Estimate");

  const { workspace, profile } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();

  const { data: estimate, error: estimateError } = await supabase
    .from("estimates")
    .select("id, project_id")
    .eq("id", estimateId)
    .maybeSingle();

  if (estimateError) throw estimateError;
  if (!estimate) throw new Error("Estimate was not found.");

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, workspace_id")
    .eq("id", estimate.project_id)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (projectError) throw projectError;
  if (!project) throw new Error("Estimate was not found in this workspace.");

  if (favorite) {
    const { error } = await supabase
      .from("estimate_favorites")
      .upsert(
        {
          workspace_id: workspace.id,
          user_id: profile.id,
          project_id: project.id,
          estimate_id: estimate.id,
        },
        { ignoreDuplicates: true, onConflict: "user_id,estimate_id" },
      );

    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("estimate_favorites")
      .delete()
      .eq("workspace_id", workspace.id)
      .eq("user_id", profile.id)
      .eq("estimate_id", estimate.id);

    if (error) throw error;
  }

  revalidatePath("/workshop");
  revalidatePath(`/workshop/projects/${project.id}/estimates`);
}
