import { createSupabaseServerClient } from "@/lib/supabase/server";
import { readFirstAccountWorkspaceMembership } from "@/lib/auth/account-membership";
import type { EstimateRowItem, EstimateTreeNode } from "@/lib/estimates/types";
import type { Tables } from "@/lib/supabase/types";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { isUuid } from "@/lib/ids";
import { getEstimateNodeKindSortRank, normalizeEstimateTreeNodeKind } from "@/lib/estimates/tree-hierarchy";
import { normalizeEstimateRecord, type EstimateRecordWithLegacy } from "@/lib/repositories/estimate-schema-compat";
import type {
  CollaborationInvitationSummary,
  CollaborationRole,
  EstimateSheetAccessMode,
  ProjectCollaborationSummary,
  ProjectCollaboratorSummary,
} from "@/lib/collaboration/types";
import { decryptPublicationToken, readPublicationTokenEncryptionSecret } from "@/lib/publication/security";
import type { ProjectPublicationSummary } from "@/lib/publication/types";

export type WorkspaceBootstrap = {
  workspace: Tables<"workspaces">;
  profile: Tables<"profiles">;
};

type ProjectEstimateSummaryMaps = {
  firstNodeByEstimateId: Map<string, string>;
  nodeCountByEstimateId: Map<string, number>;
  rowCountByEstimateId: Map<string, number>;
  totalCostByEstimateId: Map<string, number>;
};

type ProjectEstimatesListResult = {
  workspace: Tables<"workspaces">;
  project: Tables<"projects"> | null;
  estimates: Tables<"estimates">[];
} & ProjectEstimateSummaryMaps;

export type WorkshopProjectSummary = Pick<
  Tables<"projects">,
  "id" | "name" | "client_name" | "project_code" | "location" | "updated_at"
> & {
  isFavorite: boolean;
  favoriteCreatedAt: string | null;
};

export type WorkshopEstimateSummary = Pick<
  Tables<"estimates">,
  "id" | "project_id" | "name" | "sheet_code" | "updated_at"
> & {
  projectName: string;
  projectCode: string | null;
  firstNodeId: string | null;
  isFavorite: boolean;
  favoriteCreatedAt: string | null;
};

export type WorkshopHomebaseData = {
  workspace: Tables<"workspaces">;
  projects: WorkshopProjectSummary[];
  estimates: WorkshopEstimateSummary[];
};

type WorkshopProjectAccessKind = "owned" | "project-member" | "sheet-member";

type WorkshopProjectListItem = {
  project: Tables<"projects">;
  accessKind: WorkshopProjectAccessKind;
  currentUserRole: CollaborationRole;
  ownerWorkspaceName: string | null;
  sharedEstimateCount: number;
};

const WORKSHOP_HOMEBASE_ITEM_LIMIT = 12;

type WorkshopProjectRecord = Pick<
  Tables<"projects">,
  "id" | "name" | "client_name" | "project_code" | "location" | "updated_at"
>;

type WorkshopEstimateRecord = Pick<
  Tables<"estimates">,
  "id" | "project_id" | "name" | "sheet_code" | "updated_at"
>;

type ProjectMemberRow = Pick<Tables<"project_members">, "project_id" | "role" | "user_id" | "workspace_id">;
type EstimateSheetMemberRow = Pick<Tables<"estimate_sheet_members">, "estimate_id" | "project_id" | "role" | "user_id">;
type EstimateSheetAccessSettingsRow = Pick<Tables<"estimate_sheet_access_settings">, "estimate_id" | "inherit_project_access">;
type CollaborationInvitationRow = Pick<
  Tables<"collaboration_invitations">,
  "email" | "estimate_id" | "expires_at" | "id" | "role" | "scope"
>;
type CollaborationProfileRow = Pick<Tables<"profiles">, "avatar_url" | "display_name" | "email" | "id">;
type ProjectPublicationRow = Pick<
  Tables<"project_publications">,
  | "encrypted_token"
  | "expires_at"
  | "id"
  | "latest_opened_at"
  | "open_count"
  | "password_hash"
  | "published_at"
  | "revoked_at"
  | "selected_estimate_ids"
  | "snapshot_version"
  | "status"
>;

const collaborationRoleRank: Record<CollaborationRole, number> = {
  owner: 40,
  admin: 30,
  editor: 20,
  viewer: 10,
};

function mapWorkspaceRoleToCollaborationRole(role: Tables<"workspace_members">["role"]): CollaborationRole {
  if (role === "owner") return "owner";
  if (role === "admin") return "admin";
  if (role === "viewer") return "viewer";
  return "editor";
}

function readHighestCollaborationRole(current: CollaborationRole | undefined, next: CollaborationRole) {
  if (!current) return next;
  return collaborationRoleRank[next] > collaborationRoleRank[current] ? next : current;
}

function canManageCollaborationRole(role: CollaborationRole) {
  return collaborationRoleRank[role] >= collaborationRoleRank.admin;
}

function isMissingOptionalCollaborationTable(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  const message = "message" in error && typeof error.message === "string" ? error.message.toLowerCase() : "";
  return code === "42P01" || message.includes("does not exist") || message.includes("schema cache");
}

async function readOptionalProjectMembers(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  projectId: string,
): Promise<ProjectMemberRow[]> {
  const { data, error } = await supabase
    .from("project_members")
    .select("project_id, workspace_id, user_id, role")
    .eq("project_id", projectId);

  if (error) {
    if (isMissingOptionalCollaborationTable(error)) return [];
    throw error;
  }

  return data ?? [];
}

async function readOptionalEstimateSheetMembers(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  estimateIds: string[],
): Promise<EstimateSheetMemberRow[]> {
  if (estimateIds.length === 0) return [];

  const { data, error } = await supabase
    .from("estimate_sheet_members")
    .select("estimate_id, project_id, user_id, role")
    .in("estimate_id", estimateIds);

  if (error) {
    if (isMissingOptionalCollaborationTable(error)) return [];
    throw error;
  }

  return data ?? [];
}

async function readOptionalEstimateSheetAccessSettings(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  estimateIds: string[],
): Promise<EstimateSheetAccessSettingsRow[]> {
  if (estimateIds.length === 0) return [];

  const { data, error } = await supabase
    .from("estimate_sheet_access_settings")
    .select("estimate_id, inherit_project_access")
    .in("estimate_id", estimateIds);

  if (error) {
    if (isMissingOptionalCollaborationTable(error)) return [];
    throw error;
  }

  return data ?? [];
}

async function readOptionalCollaborationInvitations(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  projectId: string,
): Promise<CollaborationInvitationRow[]> {
  const { data, error } = await supabase
    .from("collaboration_invitations")
    .select("id, email, role, scope, estimate_id, expires_at")
    .eq("project_id", projectId)
    .eq("lifecycle_state", "pending")
    .is("accepted_at", null)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingOptionalCollaborationTable(error)) return [];
    throw error;
  }

  return data ?? [];
}

async function readOptionalProjectPublication(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  projectId: string,
): Promise<ProjectPublicationRow | null> {
  const { data, error } = await supabase
    .from("project_publications")
    .select(
      "id, encrypted_token, password_hash, status, snapshot_version, selected_estimate_ids, published_at, expires_at, revoked_at, open_count, latest_opened_at",
    )
    .eq("project_id", projectId)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingOptionalCollaborationTable(error)) return null;
    throw error;
  }

  return data;
}

function readPublicationClientLinkPath(publication: ProjectPublicationRow | null) {
  if (!publication) return null;
  try {
    return `/share/${decryptPublicationToken(publication.encrypted_token, readPublicationTokenEncryptionSecret())}`;
  } catch {
    return null;
  }
}

function readPublicationStatus(publication: ProjectPublicationRow | null): ProjectPublicationSummary["status"] {
  if (!publication) return "unpublished";
  if (publication.revoked_at || publication.status === "revoked") return "revoked";
  if (publication.status === "expired") return "expired";
  if (publication.expires_at && new Date(publication.expires_at).getTime() <= Date.now()) return "expired";
  return "published";
}

async function readCollaborationProfiles(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userIds: string[],
): Promise<Map<string, CollaborationProfileRow>> {
  if (userIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, email, avatar_url")
    .in("id", userIds);

  if (error) {
    const fallback = await supabase.from("profiles").select("id, display_name, email").in("id", userIds);
    if (fallback.error) throw fallback.error;
    return new Map(
      (fallback.data ?? []).map((profile) => [
        profile.id,
        {
          ...profile,
          avatar_url: null,
        } satisfies CollaborationProfileRow,
      ]),
    );
  }

  return new Map((data ?? []).map((profile) => [profile.id, profile]));
}

function readProfileDisplayName(profile: CollaborationProfileRow | undefined, fallbackUserId: string) {
  const email = profile?.email ?? null;
  return profile?.display_name ?? email?.split("@")[0] ?? `User ${fallbackUserId.slice(0, 8)}`;
}

function createEmptyProjectEstimateSummaryMaps(): ProjectEstimateSummaryMaps {
  return {
    firstNodeByEstimateId: new Map<string, string>(),
    nodeCountByEstimateId: new Map<string, number>(),
    rowCountByEstimateId: new Map<string, number>(),
    totalCostByEstimateId: new Map<string, number>(),
  };
}

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

  const membership = await readFirstAccountWorkspaceMembership(supabase, context.userId);
  if (membership?.workspaceId) {
    const { data: memberWorkspace, error: memberWorkspaceError } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", membership.workspaceId)
      .maybeSingle();

    if (memberWorkspaceError) throw memberWorkspaceError;
    if (memberWorkspace) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .update({ default_workspace_id: memberWorkspace.id })
        .eq("id", context.userId)
        .select("*")
        .single();

      if (profileError) throw profileError;
      return { workspace: memberWorkspace, profile };
    }

    throw new Error("Workspace membership is unavailable. Contact support.");
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
  const { workspace, profile } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();

  const [projectsResult, favoritesResult, projectMembersResult, sheetMembersResult, workspaceMembershipResult] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .eq("workspace_id", workspace.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("project_favorites")
      .select("project_id")
      .eq("workspace_id", workspace.id)
      .eq("user_id", profile.id),
    supabase
      .from("project_members")
      .select("project_id, workspace_id, role, user_id")
      .eq("user_id", profile.id),
    supabase
      .from("estimate_sheet_members")
      .select("estimate_id, project_id, role, user_id")
      .eq("user_id", profile.id),
    supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspace.id)
      .eq("user_id", profile.id)
      .maybeSingle(),
  ]);

  if (projectsResult.error) throw projectsResult.error;
  if (favoritesResult.error) throw favoritesResult.error;
  if (projectMembersResult.error && !isMissingOptionalCollaborationTable(projectMembersResult.error)) throw projectMembersResult.error;
  if (sheetMembersResult.error && !isMissingOptionalCollaborationTable(sheetMembersResult.error)) throw sheetMembersResult.error;
  if (workspaceMembershipResult.error) throw workspaceMembershipResult.error;

  const ownedProjects = projectsResult.data ?? [];
  const ownedProjectIds = new Set(ownedProjects.map((project) => project.id));
  const projectMembers = (projectMembersResult.error ? [] : projectMembersResult.data ?? []) as ProjectMemberRow[];
  const sheetMembers = (sheetMembersResult.error ? [] : sheetMembersResult.data ?? []) as EstimateSheetMemberRow[];
  const workspaceRole = workspaceMembershipResult.data?.role
    ? mapWorkspaceRoleToCollaborationRole(workspaceMembershipResult.data.role)
    : null;
  const sharedProjectIds = Array.from(
    new Set([
      ...projectMembers.map((member) => member.project_id),
      ...sheetMembers.map((member) => member.project_id),
    ]),
  ).filter((projectId) => !ownedProjectIds.has(projectId));

  let sharedProjects: Tables<"projects">[] = [];
  if (sharedProjectIds.length > 0) {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .in("id", sharedProjectIds)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    sharedProjects = data ?? [];
  }

  const sheetCountByProjectId = new Map<string, number>();
  const sheetRoleByProjectId = new Map<string, CollaborationRole>();
  for (const member of sheetMembers) {
    sheetCountByProjectId.set(member.project_id, (sheetCountByProjectId.get(member.project_id) ?? 0) + 1);
    sheetRoleByProjectId.set(member.project_id, readHighestCollaborationRole(sheetRoleByProjectId.get(member.project_id), member.role));
  }

  const projectRoleByProjectId = new Map(projectMembers.map((member) => [member.project_id, member.role]));
  function createProjectListItem(project: Tables<"projects">): WorkshopProjectListItem {
    const projectRole = projectRoleByProjectId.get(project.id);
    const sheetRole = sheetRoleByProjectId.get(project.id);
    const ownsProjectThroughWorkspace = Boolean(workspaceRole) || project.created_by === profile.id;
    const accessKind: WorkshopProjectAccessKind = ownsProjectThroughWorkspace
      ? "owned"
      : projectRole
        ? "project-member"
        : sheetRole
          ? "sheet-member"
          : "owned";

    return {
      project,
      accessKind,
      currentUserRole: accessKind === "owned"
        ? workspaceRole ?? projectRole ?? "owner"
        : projectRole ?? sheetRole ?? "viewer",
      ownerWorkspaceName: accessKind === "owned"
        ? null
        : project.workspace_id === workspace.id
          ? workspace.name
          : null,
      sharedEstimateCount: sheetCountByProjectId.get(project.id) ?? 0,
    };
  }

  const projectItems: WorkshopProjectListItem[] = [
    ...ownedProjects.map(createProjectListItem),
    ...sharedProjects.map((project) => {
      return createProjectListItem(project);
    }),
  ];

  return {
    workspace,
    projects: projectItems,
    favoriteProjectIds: (favoritesResult.data ?? []).map((favorite) => favorite.project_id),
  };
}

function createFirstNodeMap(nodes: Pick<Tables<"estimate_nodes">, "id" | "estimate_id" | "kind">[]) {
  const firstNodeByEstimateId = new Map<string, string>();
  for (const node of nodes) {
    if (node.kind === "area" && !firstNodeByEstimateId.has(node.estimate_id)) {
      firstNodeByEstimateId.set(node.estimate_id, node.id);
    }
  }
  for (const node of nodes) {
    if (!firstNodeByEstimateId.has(node.estimate_id)) {
      firstNodeByEstimateId.set(node.estimate_id, node.id);
    }
  }
  return firstNodeByEstimateId;
}

function mergeHomebaseRecords<T extends { id: string }>(primary: T[], secondary: T[]) {
  const byId = new Map<string, T>();
  for (const record of [...primary, ...secondary]) {
    if (!byId.has(record.id)) byId.set(record.id, record);
  }
  return Array.from(byId.values());
}

function sortByFavoriteCreatedAt<T extends { id: string }>(records: T[], favoriteCreatedAt: Map<string, string>) {
  return [...records].sort((left, right) => {
    const leftTime = Date.parse(favoriteCreatedAt.get(left.id) ?? "");
    const rightTime = Date.parse(favoriteCreatedAt.get(right.id) ?? "");
    return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
  });
}

export async function getWorkshopHomebaseData(): Promise<WorkshopHomebaseData> {
  const { workspace, profile } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();

  const [projectFavoritesResult, estimateFavoritesResult, recentProjectsResult] = await Promise.all([
    supabase
      .from("project_favorites")
      .select("project_id, created_at")
      .eq("workspace_id", workspace.id)
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(WORKSHOP_HOMEBASE_ITEM_LIMIT),
    supabase
      .from("estimate_favorites")
      .select("estimate_id, created_at")
      .eq("workspace_id", workspace.id)
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(WORKSHOP_HOMEBASE_ITEM_LIMIT),
    supabase
      .from("projects")
      .select("id, name, client_name, project_code, location, updated_at")
      .eq("workspace_id", workspace.id)
      .order("updated_at", { ascending: false })
      .limit(WORKSHOP_HOMEBASE_ITEM_LIMIT),
  ]);

  if (projectFavoritesResult.error) throw projectFavoritesResult.error;
  if (estimateFavoritesResult.error) throw estimateFavoritesResult.error;
  if (recentProjectsResult.error) throw recentProjectsResult.error;

  const projectFavoriteCreatedAt = new Map(
    (projectFavoritesResult.data ?? []).map((favorite) => [favorite.project_id, favorite.created_at]),
  );
  const estimateFavoriteCreatedAt = new Map(
    (estimateFavoritesResult.data ?? []).map((favorite) => [favorite.estimate_id, favorite.created_at]),
  );
  const favoriteProjectIds = Array.from(projectFavoriteCreatedAt.keys());
  const favoriteEstimateIds = Array.from(estimateFavoriteCreatedAt.keys());

  let favoriteProjects: WorkshopProjectRecord[] = [];
  if (favoriteProjectIds.length > 0) {
    const { data, error } = await supabase
      .from("projects")
      .select("id, name, client_name, project_code, location, updated_at")
      .eq("workspace_id", workspace.id)
      .in("id", favoriteProjectIds);

    if (error) throw error;
    favoriteProjects = data ?? [];
  }

  const projects = mergeHomebaseRecords(
    sortByFavoriteCreatedAt(favoriteProjects, projectFavoriteCreatedAt),
    (recentProjectsResult.data ?? []) as WorkshopProjectRecord[],
  );
  const projectIds = projects.map((project) => project.id);

  let recentEstimates: WorkshopEstimateRecord[] = [];
  if (projectIds.length > 0) {
    const { data, error } = await supabase
      .from("estimates")
      .select("id, project_id, name, sheet_code, updated_at")
      .in("project_id", projectIds)
      .order("updated_at", { ascending: false })
      .limit(WORKSHOP_HOMEBASE_ITEM_LIMIT);

    if (error) throw error;
    recentEstimates = data ?? [];
  }

  let favoriteEstimates: WorkshopEstimateRecord[] = [];
  if (favoriteEstimateIds.length > 0) {
    const { data, error } = await supabase
      .from("estimates")
      .select("id, project_id, name, sheet_code, updated_at")
      .in("id", favoriteEstimateIds);

    if (error) throw error;
    favoriteEstimates = data ?? [];
  }

  const estimates = mergeHomebaseRecords(
    sortByFavoriteCreatedAt(favoriteEstimates, estimateFavoriteCreatedAt),
    recentEstimates,
  );
  const estimateProjectIds = Array.from(new Set(estimates.map((estimate) => estimate.project_id)));
  const missingProjectIds = estimateProjectIds.filter((projectId) => !projectIds.includes(projectId));
  if (missingProjectIds.length > 0) {
    const { data, error } = await supabase
      .from("projects")
      .select("id, name, client_name, project_code, location, updated_at")
      .eq("workspace_id", workspace.id)
      .in("id", missingProjectIds);

    if (error) throw error;
    projects.push(...((data ?? []) as WorkshopProjectRecord[]));
  }

  const projectById = new Map(projects.map((project) => [project.id, project]));
  const estimateIds = estimates.map((estimate) => estimate.id);
  let firstNodeByEstimateId = new Map<string, string>();
  if (estimateIds.length > 0) {
    const { data, error } = await supabase
      .from("estimate_nodes")
      .select("id, estimate_id, kind, sort_order")
      .in("estimate_id", estimateIds)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    firstNodeByEstimateId = createFirstNodeMap(data ?? []);
  }

  return {
    workspace,
    projects: projects.map((project) => ({
      ...project,
      isFavorite: projectFavoriteCreatedAt.has(project.id),
      favoriteCreatedAt: projectFavoriteCreatedAt.get(project.id) ?? null,
    })),
    estimates: estimates.map((estimate) => {
      const project = projectById.get(estimate.project_id);
      return {
        id: estimate.id,
        project_id: estimate.project_id,
        name: estimate.name,
        sheet_code: estimate.sheet_code,
        updated_at: estimate.updated_at,
        projectName: project?.name ?? "Unknown project",
        projectCode: project?.project_code ?? null,
        firstNodeId: firstNodeByEstimateId.get(estimate.id) ?? null,
        isFavorite: estimateFavoriteCreatedAt.has(estimate.id),
        favoriteCreatedAt: estimateFavoriteCreatedAt.get(estimate.id) ?? null,
      };
    }),
  };
}

export async function getCurrentWorkspaceProject(projectId: string) {
  const { workspace: defaultWorkspace } = await ensureDefaultWorkspace();

  if (!isUuid(projectId)) return { workspace: defaultWorkspace, project: null };

  const supabase = await createSupabaseServerClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (error) throw error;
  if (!project) return { workspace: defaultWorkspace, project: null };

  if (project.workspace_id === defaultWorkspace.id) return { workspace: defaultWorkspace, project };

  const { data: projectWorkspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", project.workspace_id)
    .maybeSingle();

  if (workspaceError) throw workspaceError;
  return { workspace: projectWorkspace ?? defaultWorkspace, project };
}

export async function getProjectCollaborationSummary(projectId: string): Promise<ProjectCollaborationSummary | null> {
  const { profile } = await ensureDefaultWorkspace();
  if (!isUuid(projectId)) return null;

  const supabase = await createSupabaseServerClient();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, workspace_id")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) throw projectError;
  if (!project) return null;

  const { data: workspaceMembers, error: workspaceMembersError } = await supabase
    .from("workspace_members")
    .select("workspace_id, user_id, role")
    .eq("workspace_id", project.workspace_id);

  if (workspaceMembersError) throw workspaceMembersError;

  const { data: estimates, error: estimatesError } = await supabase
    .from("estimates")
    .select("id, project_id, name, sheet_code")
    .eq("project_id", project.id)
    .order("sheet_code", { ascending: true });

  if (estimatesError) throw estimatesError;

  const estimateIds = (estimates ?? []).map((estimate) => estimate.id);
  const [projectMembers, sheetMembers, sheetSettings, pendingInvitationRows] = await Promise.all([
    readOptionalProjectMembers(supabase, project.id),
    readOptionalEstimateSheetMembers(supabase, estimateIds),
    readOptionalEstimateSheetAccessSettings(supabase, estimateIds),
    readOptionalCollaborationInvitations(supabase, project.id),
  ]);

  const collaboratorRoles = new Map<
    string,
    {
      role: CollaborationRole;
      source: ProjectCollaboratorSummary["source"];
    }
  >();

  for (const member of workspaceMembers ?? []) {
    collaboratorRoles.set(member.user_id, {
      role: mapWorkspaceRoleToCollaborationRole(member.role),
      source: "workspace",
    });
  }

  for (const member of projectMembers) {
    const existing = collaboratorRoles.get(member.user_id);
    const role = readHighestCollaborationRole(existing?.role, member.role);
    collaboratorRoles.set(member.user_id, {
      role,
      source: role === existing?.role ? existing.source : "project",
    });
  }

  for (const member of sheetMembers) {
    const existing = collaboratorRoles.get(member.user_id);
    const role = readHighestCollaborationRole(existing?.role, member.role);
    collaboratorRoles.set(member.user_id, {
      role,
      source: role === existing?.role ? existing.source : "sheet",
    });
  }

  if (!collaboratorRoles.has(profile.id)) {
    collaboratorRoles.set(profile.id, {
      role: mapWorkspaceRoleToCollaborationRole("owner"),
      source: "workspace",
    });
  }

  const collaboratorIds = Array.from(collaboratorRoles.keys());
  const profiles = await readCollaborationProfiles(supabase, collaboratorIds);
  const collaborators: ProjectCollaboratorSummary[] = collaboratorIds.map((userId) => {
    const role = collaboratorRoles.get(userId);
    const collaboratorProfile = profiles.get(userId);

    return {
      id: userId,
      displayName: readProfileDisplayName(collaboratorProfile, userId),
      email: collaboratorProfile?.email ?? null,
      avatarUrl: collaboratorProfile?.avatar_url ?? null,
      role: role?.role ?? "viewer",
      source: role?.source ?? "workspace",
      online: userId === profile.id,
    };
  });

  const sheetMemberCountByEstimateId = new Map<string, number>();
  const currentUserSheetRoleByEstimateId = new Map<string, CollaborationRole>();
  for (const member of sheetMembers) {
    sheetMemberCountByEstimateId.set(member.estimate_id, (sheetMemberCountByEstimateId.get(member.estimate_id) ?? 0) + 1);
    if (member.user_id === profile.id) {
      currentUserSheetRoleByEstimateId.set(member.estimate_id, member.role);
    }
  }

  const sheetInheritanceByEstimateId = new Map(sheetSettings.map((settings) => [settings.estimate_id, settings.inherit_project_access]));
  const currentUserRole = collaboratorRoles.get(profile.id)?.role ?? "viewer";
  const canManageAccess = canManageCollaborationRole(currentUserRole);
  const estimateSheets = (estimates ?? []).map((estimate) => {
    const overrideCount = sheetMemberCountByEstimateId.get(estimate.id) ?? 0;
    const inheritsProjectAccess = sheetInheritanceByEstimateId.get(estimate.id) ?? true;
    const accessMode: EstimateSheetAccessMode = inheritsProjectAccess
      ? overrideCount > 0
        ? "sheet-overrides"
        : "inherits-project"
      : "restricted";

    return {
      estimateId: estimate.id,
      sheetCode: estimate.sheet_code,
      name: estimate.name,
      accessMode,
      overrideCount,
      canManageAccess: canManageAccess || canManageCollaborationRole(currentUserSheetRoleByEstimateId.get(estimate.id) ?? "viewer"),
    };
  });
  const pendingInvitations: CollaborationInvitationSummary[] = pendingInvitationRows
    .filter((invitation): invitation is CollaborationInvitationRow & { scope: "project" | "estimate" } => invitation.scope === "project" || invitation.scope === "estimate")
    .map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      scope: invitation.scope,
      estimateId: invitation.estimate_id,
      expiresAt: invitation.expires_at,
    }));

  return {
    projectId: project.id,
    workspaceId: project.workspace_id,
    currentUserId: profile.id,
    currentUserRole,
    canManageAccess,
    collaborators,
    pendingInvitations,
    estimateSheets,
    realtime: {
      privateChannels: true,
      projectChannel: `project:${projectId}`,
      estimateChannelPrefix: "estimate:",
      presenceTransport: "presence",
      cursorTransport: "broadcast",
    },
  };
}

export async function getProjectPublicationSummary(projectId: string): Promise<ProjectPublicationSummary | null> {
  const { workspace, profile } = await ensureDefaultWorkspace();
  if (!isUuid(projectId)) return null;

  const supabase = await createSupabaseServerClient();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, workspace_id")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) throw projectError;
  if (!project) return null;

  const [workspaceMembershipResult, projectMembers, publication] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", project.workspace_id)
      .eq("user_id", profile.id)
      .maybeSingle(),
    readOptionalProjectMembers(supabase, project.id),
    readOptionalProjectPublication(supabase, project.id),
  ]);

  if (workspaceMembershipResult.error) throw workspaceMembershipResult.error;

  const workspaceRole =
    workspaceMembershipResult.data?.role ?? (project.workspace_id === workspace.id ? "owner" : undefined);
  const projectRole = projectMembers.find((member) => member.user_id === profile.id)?.role;
  const currentUserRole = readHighestCollaborationRole(
    workspaceRole ? mapWorkspaceRoleToCollaborationRole(workspaceRole) : undefined,
    projectRole ?? "viewer",
  );
  const canManagePublication = profile.role === "ceo" || profile.role === "admin" || canManageCollaborationRole(currentUserRole);
  const publicationStatus = readPublicationStatus(publication);
  const clientLinkPath = publicationStatus === "published" ? readPublicationClientLinkPath(publication) : null;

  return {
    projectId: project.id,
    workspaceId: project.workspace_id,
    canManagePublication,
    status: publicationStatus,
    publicationId: publication?.id ?? null,
    clientLinkPath,
    tokenCopyAvailable: Boolean(clientLinkPath),
    publishedAt: publication?.published_at ?? null,
    expiresAt: publication?.expires_at ?? null,
    passwordRequired: Boolean(publication?.password_hash),
    selectedEstimateCount: publication?.selected_estimate_ids.length ?? 0,
    snapshotVersion: publication?.snapshot_version ?? 0,
    openCount: publication?.open_count ?? 0,
    latestOpenedAt: publication?.latest_opened_at ?? null,
  };
}

export async function listProjectEstimates(projectId: string): Promise<ProjectEstimatesListResult> {
  const { workspace, project } = await getCurrentWorkspaceProject(projectId);
  if (!project) {
    return {
      workspace,
      project,
      estimates: [],
      ...createEmptyProjectEstimateSummaryMaps(),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: estimates, error } = await supabase
    .from("estimates")
    .select("*")
    .eq("project_id", project.id)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  const normalizedEstimates = (estimates ?? []).map((estimate) => normalizeEstimateRecord(estimate as EstimateRecordWithLegacy));
  const estimateIds = normalizedEstimates.map((estimate) => estimate.id);
  if (estimateIds.length === 0) {
    return {
      workspace,
      project,
      estimates: [],
      ...createEmptyProjectEstimateSummaryMaps(),
    };
  }

  const [nodesResult, rowsResult] = await Promise.all([
    supabase
      .from("estimate_nodes")
      .select("id, estimate_id, kind, sort_order")
      .in("estimate_id", estimateIds)
      .order("sort_order", { ascending: true }),
    supabase
      .from("estimate_row_items")
      .select("estimate_id, quantity, unit_cost, contingency_percentage, misc_cost")
      .in("estimate_id", estimateIds),
  ]);

  if (nodesResult.error) throw nodesResult.error;
  if (rowsResult.error) throw rowsResult.error;

  const firstNodeByEstimateId = new Map<string, string>();
  const nodeCountByEstimateId = new Map<string, number>();
  for (const node of nodesResult.data ?? []) {
    nodeCountByEstimateId.set(node.estimate_id, (nodeCountByEstimateId.get(node.estimate_id) ?? 0) + 1);
    if (node.kind === "area" && !firstNodeByEstimateId.has(node.estimate_id)) firstNodeByEstimateId.set(node.estimate_id, node.id);
  }
  for (const node of nodesResult.data ?? []) {
    if (!firstNodeByEstimateId.has(node.estimate_id)) firstNodeByEstimateId.set(node.estimate_id, node.id);
  }

  const totalCostByEstimateId = new Map<string, number>();
  const rowCountByEstimateId = new Map<string, number>();
  for (const row of rowsResult.data ?? []) {
    const quantity = Number(row.quantity);
    const unitCost = Number(row.unit_cost);
    const contingencyPercentage = Number(row.contingency_percentage ?? 0);
    const miscCost = Number(row.misc_cost);
    const subTotal = quantity * unitCost;
    const rowTotal = subTotal + miscCost + (subTotal * contingencyPercentage) / 100;
    rowCountByEstimateId.set(row.estimate_id, (rowCountByEstimateId.get(row.estimate_id) ?? 0) + 1);
    totalCostByEstimateId.set(row.estimate_id, (totalCostByEstimateId.get(row.estimate_id) ?? 0) + rowTotal);
  }

  return { workspace, project, estimates: normalizedEstimates, firstNodeByEstimateId, nodeCountByEstimateId, rowCountByEstimateId, totalCostByEstimateId };
}

type EstimateNodeKind = Tables<"estimate_nodes">["kind"];
type EstimateNodeRow = Tables<"estimate_nodes">;
type EstimateRowItemRow = Tables<"estimate_row_items">;

type LiveEstimateTreeResult = {
  workspace: Tables<"workspaces">;
  project: Tables<"projects"> | null;
  estimate: Tables<"estimates"> | null;
  selectedNodeId: string | null;
  tree: EstimateTreeNode[];
};

function getDisplayNodeKind(kind: EstimateNodeKind): EstimateTreeNode["kind"] | null {
  return normalizeEstimateTreeNodeKind(kind);
}

function formatPeso(value: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 }).format(value);
}

function readJsonRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function toUiRow(row: EstimateRowItemRow): EstimateRowItem {
  const quantity = Number(row.quantity);
  const itemCost = Number(row.unit_cost);
  const contingencyPercentage = Number(row.contingency_percentage ?? 0);
  const miscCost = Number(row.misc_cost);
  const subTotal = itemCost * quantity;
  const contingencyValue = (subTotal * contingencyPercentage) / 100;
  const sourceSnapshot = readJsonRecord(row.source_snapshot);
  const metadata = readJsonRecord(row.metadata);
  const category = typeof sourceSnapshot.category === "string" && sourceSnapshot.category
    ? sourceSnapshot.category
    : "General";
  const categoryNodeId = row.category_node_id ?? (typeof sourceSnapshot.categoryNodeId === "string" ? sourceSnapshot.categoryNodeId : undefined);
  const supplierId = row.supplier_id ?? (typeof sourceSnapshot.supplierId === "string" ? sourceSnapshot.supplierId : undefined);
  const tags = Array.isArray(metadata.tags) ? metadata.tags.filter((tag): tag is string => typeof tag === "string") : undefined;
  const componentVersionNumber = typeof sourceSnapshot.componentVersionNumber === "number" ? sourceSnapshot.componentVersionNumber : undefined;

  return {
    id: row.id,
    material: row.material,
    description: row.description,
    supplier: row.supplier || "No supplier",
    supplierId: supplierId ?? undefined,
    source: row.source_library_item_id ? "library" : "project",
    unit: row.unit,
    itemCost,
    quantity,
    subTotal,
    contingencyPercentage,
    contingencyValue,
    miscCost,
    totalItemCosts: subTotal + miscCost + contingencyValue,
    rowRevision: row.row_revision,
    category,
    categoryNodeId: categoryNodeId ?? undefined,
    discipline: row.discipline ?? undefined,
    designation: row.designation ?? undefined,
    tags,
    imageUrl: typeof sourceSnapshot.imageUrl === "string" ? sourceSnapshot.imageUrl : undefined,
    sourceLibraryItemId: row.source_library_item_id,
    componentVersionId: typeof sourceSnapshot.componentVersionId === "string" ? sourceSnapshot.componentVersionId : undefined,
    componentVersionNumber,
    priceOptionId: typeof sourceSnapshot.priceOptionId === "string" ? sourceSnapshot.priceOptionId : undefined,
    priceOptionLabel: typeof sourceSnapshot.priceOptionLabel === "string" ? sourceSnapshot.priceOptionLabel : undefined,
    lifecycleState: typeof sourceSnapshot.lifecycleState === "string" ? sourceSnapshot.lifecycleState as EstimateRowItem["lifecycleState"] : undefined,
    pricingSource: typeof sourceSnapshot.pricingSource === "string" ? sourceSnapshot.pricingSource : "Estimate row snapshot",
    pricingDate: typeof sourceSnapshot.pricingDate === "string" ? sourceSnapshot.pricingDate : row.created_at.slice(0, 10),
  };
}

export function buildEstimateTree(nodes: EstimateNodeRow[], rows: EstimateRowItemRow[]): EstimateTreeNode[] {
  const rowItemsByNode = new Map<string, EstimateRowItem[]>();
  for (const row of rows) {
    const current = rowItemsByNode.get(row.node_id) ?? [];
    current.push(toUiRow(row));
    rowItemsByNode.set(row.node_id, current);
  }

  const nodeMap = new Map<string, EstimateTreeNode>();
  for (const node of nodes) {
    const kind = getDisplayNodeKind(node.kind);
    if (!kind) continue;
    nodeMap.set(node.id, {
      id: node.id,
      name: node.name,
      kind,
      total: formatPeso(0),
      children: [],
      estimateRowItems: rowItemsByNode.get(node.id) ?? [],
    });
  }

  const roots: EstimateTreeNode[] = [];
  for (const node of nodes) {
    const uiNode = nodeMap.get(node.id);
    if (!uiNode) continue;
    const parent = node.parent_id ? nodeMap.get(node.parent_id) : undefined;
    if (parent) parent.children = [...(parent.children ?? []), uiNode];
    else roots.push(uiNode);
  }

  function sortSiblings(currentNodes: EstimateTreeNode[]): EstimateTreeNode[] {
    return currentNodes
      .map((node, index) => ({ node, index }))
      .sort((left, right) => getEstimateNodeKindSortRank(left.node.kind) - getEstimateNodeKindSortRank(right.node.kind) || left.index - right.index)
      .map(({ node }) => {
        node.children = sortSiblings(node.children ?? []);
        return node;
      });
  }

  function computeTotals(node: EstimateTreeNode): number {
    const rowTotal = (node.estimateRowItems ?? []).reduce((total, row) => total + row.totalItemCosts, 0);
    const childTotal = (node.children ?? []).reduce((total, child) => total + computeTotals(child), 0);
    const total = rowTotal + childTotal;
    node.total = formatPeso(total);
    return total;
  }

  const sortedRoots = sortSiblings(roots);
  sortedRoots.forEach(computeTotals);
  return sortedRoots;
}

export async function getProjectEstimateTreeByEstimate(projectId: string, estimateId: string): Promise<LiveEstimateTreeResult> {
  const { workspace, project } = await getCurrentWorkspaceProject(projectId);
  if (!project) return { workspace, project, estimate: null, selectedNodeId: null, tree: [] };

  const supabase = await createSupabaseServerClient();
  const { data: estimate, error: estimateError } = await supabase
    .from("estimates")
    .select("*")
    .eq("id", estimateId)
    .eq("project_id", project.id)
    .maybeSingle();

  if (estimateError) throw estimateError;
  if (!estimate) return { workspace, project, estimate: null, selectedNodeId: null, tree: [] };

  const [nodesResult, rowsResult] = await Promise.all([
    supabase.from("estimate_nodes").select("*").eq("estimate_id", estimate.id).order("sort_order", { ascending: true }),
    supabase.from("estimate_row_items").select("*").eq("estimate_id", estimate.id).order("sort_order", { ascending: true }),
  ]);

  if (nodesResult.error) throw nodesResult.error;
  if (rowsResult.error) throw rowsResult.error;

  const nodes = nodesResult.data ?? [];
  const normalizedEstimate = normalizeEstimateRecord(estimate as EstimateRecordWithLegacy);
  const tree = buildEstimateTree(nodes, rowsResult.data ?? []);
  return { workspace, project, estimate: normalizedEstimate, selectedNodeId: tree[0]?.id ?? null, tree };
}

export async function getProjectEstimateTreeByNode(projectId: string, nodeId: string): Promise<LiveEstimateTreeResult> {
  const { workspace, project } = await getCurrentWorkspaceProject(projectId);
  if (!project) return { workspace, project, estimate: null, selectedNodeId: null, tree: [] };

  const supabase = await createSupabaseServerClient();
  const { data: selectedNode, error: selectedNodeError } = await supabase
    .from("estimate_nodes")
    .select("*, estimates!inner(*)")
    .eq("id", nodeId)
    .eq("estimates.project_id", project.id)
    .maybeSingle();

  if (selectedNodeError) throw selectedNodeError;
  if (!selectedNode) return getProjectEstimateTreeByEstimate(projectId, nodeId);

  const estimate = normalizeEstimateRecord(selectedNode.estimates as EstimateRecordWithLegacy);
  const [nodesResult, rowsResult] = await Promise.all([
    supabase.from("estimate_nodes").select("*").eq("estimate_id", selectedNode.estimate_id).order("sort_order", { ascending: true }),
    supabase.from("estimate_row_items").select("*").eq("estimate_id", selectedNode.estimate_id).order("sort_order", { ascending: true }),
  ]);

  if (nodesResult.error) throw nodesResult.error;
  if (rowsResult.error) throw rowsResult.error;

  const nodes = nodesResult.data ?? [];
  const tree = buildEstimateTree(nodes, rowsResult.data ?? []);
  const selectedNodeId = nodes.some((node) => node.id === nodeId) ? nodeId : tree[0]?.id ?? null;

  return { workspace, project, estimate, selectedNodeId, tree };
}
