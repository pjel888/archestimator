import "server-only";

import type { createSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type AccountWorkspaceMembershipSource = "workspace" | "project" | "estimate";

export type AccountWorkspaceMembership = {
  source: AccountWorkspaceMembershipSource;
  workspaceId: string;
  role: string | null;
};

function isMissingOptionalCollaborationTable(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  const message = "message" in error && typeof error.message === "string" ? error.message.toLowerCase() : "";
  return code === "42P01" || message.includes("does not exist") || message.includes("schema cache");
}

export async function readFirstAccountWorkspaceMembership(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<AccountWorkspaceMembership | null> {
  const { data: workspaceMembership, error: workspaceMembershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (workspaceMembershipError) throw workspaceMembershipError;
  if (workspaceMembership?.workspace_id) {
    return {
      source: "workspace",
      workspaceId: workspaceMembership.workspace_id,
      role: workspaceMembership.role ?? null,
    };
  }

  const { data: projectMembership, error: projectMembershipError } = await supabase
    .from("project_members")
    .select("workspace_id, role")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (projectMembershipError) {
    if (!isMissingOptionalCollaborationTable(projectMembershipError)) throw projectMembershipError;
  } else if (projectMembership?.workspace_id) {
    return {
      source: "project",
      workspaceId: projectMembership.workspace_id,
      role: projectMembership.role ?? null,
    };
  }

  const { data: estimateMembership, error: estimateMembershipError } = await supabase
    .from("estimate_sheet_members")
    .select("project_id, role")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (estimateMembershipError) {
    if (!isMissingOptionalCollaborationTable(estimateMembershipError)) throw estimateMembershipError;
    return null;
  }

  if (!estimateMembership?.project_id) return null;

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("workspace_id")
    .eq("id", estimateMembership.project_id)
    .maybeSingle();

  if (projectError) throw projectError;
  if (!project?.workspace_id) {
    throw new Error("Estimate membership workspace is unavailable. Contact support.");
  }

  return {
    source: "estimate",
    workspaceId: project.workspace_id,
    role: estimateMembership.role ?? null,
  };
}
