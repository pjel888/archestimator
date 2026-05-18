import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";
import { requireCurrentUserContext } from "@/lib/auth/session";

export type WorkspaceBootstrap = {
  workspace: Tables<"workspaces">;
  profile: Tables<"profiles">;
};

export async function ensureDefaultWorkspace(): Promise<WorkspaceBootstrap> {
  const context = await requireCurrentUserContext();
  const supabase = await createSupabaseServerClient();

  if (context.profile.default_workspace_id) {
    const { data: existingWorkspace, error } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", context.profile.default_workspace_id)
      .maybeSingle();

    if (error) throw error;
    if (existingWorkspace) return { workspace: existingWorkspace, profile: context.profile };
  }

  const defaultName = context.email === "philipjonlewis@gmail.com" ? "Philip's Archestimator Workspace" : "My Archestimator Workspace";

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .insert({ name: defaultName, slug: null, created_by: context.userId })
    .select("*")
    .single();

  if (workspaceError) throw workspaceError;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .update({ default_workspace_id: workspace.id })
    .eq("id", context.userId)
    .select("*")
    .single();

  if (profileError) throw profileError;

  return { workspace, profile };
}

export async function listCurrentWorkspaceProjects() {
  const { workspace } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("workspace_id", workspace.id)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return { workspace, projects: data ?? [] };
}
