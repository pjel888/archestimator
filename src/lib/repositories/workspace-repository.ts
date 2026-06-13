import { cache } from "react";
import { cookies, headers } from "next/headers";

import { getDevAuthBypassCredentialFromRequestParts, isDevAdminDatabaseBypassRequest } from "@/lib/auth/dev-auth-gate";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { readFirstAccountWorkspaceMembership } from "@/lib/auth/account-membership";
import type { EstimateRowItem, EstimateTabSummary, EstimateTreeNode } from "@/lib/estimates/types";
import { normalizeEstimateRowImageUrl } from "@/lib/estimates/image-url";
import type { Tables } from "@/lib/supabase/types";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { isUuid } from "@/lib/ids";
import { normalizeEstimateTreeNodeKind, selectFirstEstimateNodeIds } from "@/lib/estimates/tree-hierarchy";
import { traced } from "@/lib/perf/server-timing";
import { isMissingColumnError, isMissingRelationError, normalizeEstimateRecord, type EstimateRecordWithLegacy } from "@/lib/repositories/estimate-schema-compat";
import { listProjectEstimateSheetsForProject, type ProjectEstimateSheetSummary } from "@/lib/repositories/project-estimate-sheets-repository";
import type {
  CollaborationInvitationSummary,
  CollaborationRole,
  EstimateSheetAccessMode,
  ProjectCollaborationSummary,
  ProjectCollaboratorSummary,
} from "@/lib/collaboration/types";
import { decryptPublicationToken, readPublicationTokenEncryptionSecret } from "@/lib/publication/security";
import type { ProjectPublicationListSummary, ProjectPublicationSummary } from "@/lib/publication/types";
import type { Json } from "@/lib/supabase/types";

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
  accessKind: WorkshopProjectAccessKind;
  currentUserRole: CollaborationRole;
  isFavorite: boolean;
  favoriteCreatedAt: string | null;
  ownerWorkspaceName: string | null;
  pendingInvite?: WorkshopPendingInviteSummary | null;
  pendingInviteCount: number;
  publicationSummary?: ProjectPublicationListSummary | null;
  sharedEstimateCount: number;
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

export type WorkshopPendingInviteSummary = {
  id: string;
  projectId: string;
  estimateId: string | null;
  projectName: string;
  projectCode: string | null;
  estimateName: string | null;
  role: CollaborationRole;
  scope: "project" | "estimate";
  inviterLabel: string | null;
  state: "pending" | "expired";
  expiresAt: string | null;
  lastOpenedAt: string | null;
};

export type WorkshopRemovedProjectFavoriteSummary = {
  id: string;
  name: string | null;
  projectCode: string | null;
  favoriteCreatedAt: string | null;
};

export type WorkshopHomebaseData = {
  workspace: Tables<"workspaces">;
  projects: WorkshopProjectSummary[];
  estimates: WorkshopEstimateSummary[];
  pendingInvites: WorkshopPendingInviteSummary[];
  removedProjectFavorites: WorkshopRemovedProjectFavoriteSummary[];
  receivedPendingInviteCount: number;
};

type WorkshopProjectAccessKind = "owned" | "pending-invite" | "project-member" | "sheet-member";

type WorkshopProjectListItem = {
  project: Tables<"projects">;
  accessKind: WorkshopProjectAccessKind;
  currentUserRole: CollaborationRole;
  ownerWorkspaceName: string | null;
  pendingInvite?: WorkshopPendingInviteSummary | null;
  pendingInviteCount: number;
  publicationSummary: ProjectPublicationListSummary | null;
  sharedEstimateCount: number;
};

const WORKSHOP_HOMEBASE_ITEM_LIMIT = 12;

type WorkshopProjectRecord = Pick<
  Tables<"projects">,
  "id" | "name" | "client_name" | "project_code" | "location" | "updated_at" | "workspace_id" | "created_by"
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
  "email" | "estimate_id" | "expires_at" | "id" | "project_id" | "role" | "scope"
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
  | "project_id"
  | "published_at"
  | "revoked_at"
  | "selected_estimate_ids"
  | "snapshot_json"
  | "snapshot_version"
  | "status"
>;
type ProjectPublicationListRow = Omit<ProjectPublicationRow, "selected_estimate_ids" | "snapshot_json">;

type WorkshopProjectAccessContext = {
  profileId: string;
  projectMembers: ProjectMemberRow[];
  sheetMembers: EstimateSheetMemberRow[];
  workspace: Tables<"workspaces">;
  workspaceRole: CollaborationRole | null;
};

type PendingCollaborationVisibilitySummary = {
  receivedPendingInvites: WorkshopPendingInviteSummary[];
  receivedPendingInviteCount: number;
  sentPendingInviteCountByProjectId: Map<string, number>;
};

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

function normalizeCollaborationRole(role: string | null | undefined): CollaborationRole {
  if (role === "owner" || role === "admin" || role === "editor" || role === "viewer") return role;
  return "viewer";
}

function normalizePendingInviteScope(scope: string | null | undefined): "project" | "estimate" {
  return scope === "estimate" ? "estimate" : "project";
}

async function isDevAdminDatabaseBypassActiveForRequest() {
  const requestHeaders = await headers();
  const credential = getDevAuthBypassCredentialFromRequestParts(requestHeaders, await cookies());
  return isDevAdminDatabaseBypassRequest(requestHeaders.get("host"), credential);
}

function createWorkshopProjectAccessResolver({
  profileId,
  projectMembers,
  sheetMembers,
  workspace,
  workspaceRole,
}: WorkshopProjectAccessContext) {
  const sheetCountByProjectId = new Map<string, number>();
  const sheetRoleByProjectId = new Map<string, CollaborationRole>();
  for (const member of sheetMembers) {
    sheetCountByProjectId.set(member.project_id, (sheetCountByProjectId.get(member.project_id) ?? 0) + 1);
    sheetRoleByProjectId.set(member.project_id, readHighestCollaborationRole(sheetRoleByProjectId.get(member.project_id), member.role));
  }

  const projectRoleByProjectId = new Map(projectMembers.map((member) => [member.project_id, member.role]));

  return (project: Pick<Tables<"projects">, "id" | "workspace_id" | "created_by">) => {
    const projectRole = projectRoleByProjectId.get(project.id);
    const sheetRole = sheetRoleByProjectId.get(project.id);
    const ownsProjectThroughWorkspace = project.workspace_id === workspace.id && (Boolean(workspaceRole) || project.created_by === profileId);
    const accessKind: WorkshopProjectAccessKind = ownsProjectThroughWorkspace
      ? "owned"
      : projectRole
        ? "project-member"
        : sheetRole
          ? "sheet-member"
          : "owned";
    const currentUserRole = accessKind === "owned"
      ? workspaceRole ?? projectRole ?? "owner"
      : projectRole ?? sheetRole ?? "viewer";

    return {
      accessKind,
      currentUserRole,
      ownerWorkspaceName: accessKind === "owned" ? null : project.workspace_id === workspace.id ? workspace.name : null,
      sharedEstimateCount: sheetCountByProjectId.get(project.id) ?? 0,
    };
  };
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
    .select("id, project_id, email, role, scope, estimate_id, expires_at")
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

async function readPendingCollaborationVisibilitySummary({
  email,
  projectIds,
  supabase,
}: {
  email: string | null;
  projectIds: string[];
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
}): Promise<PendingCollaborationVisibilitySummary> {
  const sentPendingInviteCountByProjectId = new Map<string, number>();
  const expiresAfter = new Date().toISOString();
  const uniqueProjectIds = Array.from(new Set(projectIds));

  const [receivedResult, sentResult] = await Promise.all([
    email?.trim()
      ? supabase.rpc("list_pending_collaboration_invitations")
      : Promise.resolve({ data: [], error: null }),
    uniqueProjectIds.length > 0
      ? supabase
          .from("collaboration_invitations")
          .select("id, project_id")
          .in("project_id", uniqueProjectIds)
          .eq("lifecycle_state", "pending")
          .is("accepted_at", null)
          .is("revoked_at", null)
          .gt("expires_at", expiresAfter)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (receivedResult.error && !isMissingOptionalCollaborationTable(receivedResult.error)) throw receivedResult.error;
  if (sentResult.error && !isMissingOptionalCollaborationTable(sentResult.error)) throw sentResult.error;

  const receivedRows = receivedResult.error ? [] : receivedResult.data ?? [];
  const receivedPendingInvites = receivedRows
    .filter((invitation) => invitation.invitation_id && invitation.project_id && invitation.project_name)
    .map((invitation) => ({
      id: invitation.invitation_id,
      projectId: invitation.project_id ?? "",
      estimateId: invitation.estimate_id ?? null,
      projectName: invitation.project_name ?? "Shared project",
      projectCode: invitation.project_code ?? null,
      estimateName: invitation.estimate_name ?? null,
      role: normalizeCollaborationRole(invitation.role),
      scope: normalizePendingInviteScope(invitation.scope),
      inviterLabel: invitation.inviter_label ?? null,
      state: invitation.state === "expired" ? "expired" as const : "pending" as const,
      expiresAt: invitation.expires_at ?? null,
      lastOpenedAt: invitation.last_opened_at ?? null,
    }));
  const sentRows = sentResult.error ? [] : sentResult.data ?? [];
  for (const invitation of sentRows) {
    sentPendingInviteCountByProjectId.set(
      invitation.project_id,
      (sentPendingInviteCountByProjectId.get(invitation.project_id) ?? 0) + 1,
    );
  }

  return {
    receivedPendingInvites,
    receivedPendingInviteCount: receivedPendingInvites.filter((invite) => invite.state !== "expired").length,
    sentPendingInviteCountByProjectId,
  };
}

function createPendingInviteProjectListItem({
  invite,
  profileId,
  workspaceId,
}: {
  invite: WorkshopPendingInviteSummary;
  profileId: string;
  workspaceId: string;
}): WorkshopProjectListItem {
  const timestamp = invite.lastOpenedAt ?? invite.expiresAt ?? new Date(0).toISOString();
  return {
    project: {
      id: invite.projectId,
      workspace_id: workspaceId,
      name: invite.projectName,
      client_name: invite.scope === "estimate" && invite.estimateName ? invite.estimateName : "Pending invite",
      location: null,
      project_code: invite.projectCode,
      currency_code: "PHP",
      metadata: {},
      created_at: timestamp,
      updated_at: timestamp,
      created_by: profileId,
    },
    accessKind: "pending-invite",
    currentUserRole: invite.role,
    ownerWorkspaceName: invite.inviterLabel,
    pendingInvite: invite,
    pendingInviteCount: 0,
    publicationSummary: null,
    sharedEstimateCount: invite.scope === "estimate" ? 1 : 0,
  };
}

async function readOptionalProjectPublication(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  projectId: string,
): Promise<ProjectPublicationRow | null> {
  const { data, error } = await supabase
    .from("project_publications")
    .select(
      "id, project_id, encrypted_token, password_hash, status, snapshot_json, snapshot_version, selected_estimate_ids, published_at, expires_at, revoked_at, open_count, latest_opened_at",
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

async function readOptionalProjectPublications(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  projectIds: string[],
): Promise<ProjectPublicationListRow[]> {
  if (projectIds.length === 0) return [];

  const { data, error } = await supabase
    .from("project_publications")
    .select(
      "id, project_id, encrypted_token, password_hash, status, snapshot_version, published_at, expires_at, revoked_at, open_count, latest_opened_at",
    )
    .in("project_id", projectIds)
    .order("published_at", { ascending: false });

  if (error) {
    if (isMissingOptionalCollaborationTable(error)) return [];
    throw error;
  }

  return data ?? [];
}

function readPublicationClientLinkPath(publication: Pick<ProjectPublicationRow, "encrypted_token"> | null) {
  if (!publication) return null;
  try {
    return `/share/${decryptPublicationToken(publication.encrypted_token, readPublicationTokenEncryptionSecret())}`;
  } catch {
    return null;
  }
}

function readPublicationStatus(
  publication: Pick<ProjectPublicationRow, "expires_at" | "revoked_at" | "status"> | null,
): ProjectPublicationSummary["status"] {
  if (!publication) return "unpublished";
  if (publication.revoked_at || publication.status === "revoked") return "revoked";
  if (publication.status === "expired") return "expired";
  if (publication.expires_at && new Date(publication.expires_at).getTime() <= Date.now()) return "expired";
  return "published";
}

function readProjectPublicationListSummary(publication: ProjectPublicationListRow | null): ProjectPublicationListSummary | null {
  if (!publication) return null;

  const status = readPublicationStatus(publication);
  return {
    status,
    clientLinkPath: status === "published" ? readPublicationClientLinkPath(publication) : null,
    openCount: publication.open_count ?? 0,
    latestOpenedAt: publication.latest_opened_at ?? null,
    passwordRequired: Boolean(publication.password_hash),
  };
}

function readSnapshotGeneratedAt(snapshot: Json | null | undefined) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return null;
  const generatedAt = snapshot.generatedAt;
  return typeof generatedAt === "string" && Number.isFinite(Date.parse(generatedAt)) ? generatedAt : null;
}

const PUBLICATION_SNAPSHOT_STALENESS_CACHE_TTL_MS = 5 * 60 * 1000;
const publicationSnapshotStalenessCache = new Map<
  string,
  {
    expiresAt: number;
    value: ProjectPublicationSummary["staleSnapshotWarning"];
  }
>();

function computePublicationSnapshotStaleness({
  latestEstimateUpdatedAt,
  snapshotGeneratedAt,
}: {
  latestEstimateUpdatedAt: string | null;
  snapshotGeneratedAt: string | null;
}): ProjectPublicationSummary["staleSnapshotWarning"] {
  if (!latestEstimateUpdatedAt || !snapshotGeneratedAt) return null;

  const latestTime = Date.parse(latestEstimateUpdatedAt);
  const snapshotTime = Date.parse(snapshotGeneratedAt);
  if (!Number.isFinite(latestTime) || !Number.isFinite(snapshotTime) || latestTime <= snapshotTime) return null;

  const daysBehind = Math.floor((latestTime - snapshotTime) / (24 * 60 * 60 * 1000));
  if (daysBehind <= 7) return null;

  return {
    daysBehind,
    latestEstimateUpdatedAt,
    snapshotGeneratedAt,
  };
}

export function readPublicationSnapshotStaleness({
  latestEstimateUpdatedAt,
  snapshotGeneratedAt,
}: {
  latestEstimateUpdatedAt: string | null;
  snapshotGeneratedAt: string | null;
}): ProjectPublicationSummary["staleSnapshotWarning"] {
  const cacheKey = `${latestEstimateUpdatedAt ?? "none"}:${snapshotGeneratedAt ?? "none"}`;
  const now = Date.now();
  const cached = publicationSnapshotStalenessCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.value;
  if (cached) publicationSnapshotStalenessCache.delete(cacheKey);

  const value = computePublicationSnapshotStaleness({ latestEstimateUpdatedAt, snapshotGeneratedAt });
  publicationSnapshotStalenessCache.set(cacheKey, {
    expiresAt: now + PUBLICATION_SNAPSHOT_STALENESS_CACHE_TTL_MS,
    value,
  });
  return value;
}

// AC-MOD-18 (MOD-SHEET-04 — documented scope, conservative): the stale-snapshot warning compares
// the snapshot's generatedAt against the latest `updated_at` among ONLY the published subset
// (`estimateIds` = publication.selected_estimate_ids). This deliberately does NOT consider estimates
// outside the published subset — a brand-new sheet added after publish, or edits to an intentionally
// excluded sheet, will not raise a "snapshot is N days behind" hint. Broadening this to all project
// estimates was considered for MOD-SHEET-04 but rejected as the conservative choice: it would surface
// false-positive staleness for sheets the owner deliberately left out of the curated publication, and
// the summary query path is on the hot project-load route where a regression risks the working flow.
// A separate "new sheets available" signal (distinct from the published-subset staleness) is the
// preferred future enhancement if this needs to grow.
async function readLatestEstimateUpdatedAt(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  projectId: string,
  estimateIds: string[],
) {
  let query = supabase
    .from("estimates")
    .select("updated_at")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false })
    .limit(1);

  // estimateIds empty → "all project estimates"; non-empty → restrict to the published subset
  // (the current, documented behavior; see the scope note above).
  if (estimateIds.length > 0) query = query.in("id", estimateIds);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data?.updated_at ?? null;
}

async function readLatestSharedLinkRecipientOpen(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  publicationId: string | null | undefined,
): Promise<ProjectPublicationSummary["latestRecipientOpen"]> {
  if (!publicationId) return null;

  const { data, error } = await supabase
    .from("shared_link_recipients")
    .select("email, display_name, last_opened_at")
    .eq("publication_id", publicationId)
    .not("last_opened_at", "is", null)
    .order("last_opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingOptionalCollaborationTable(error)) return null;
    throw error;
  }
  if (!data?.email || !data.last_opened_at) return null;

  return {
    email: data.email,
    displayName: data.display_name ?? null,
    openedAt: data.last_opened_at,
  };
}

async function readLatestSharedLinkCommentAt(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  publicationId: string | null | undefined,
): Promise<string | null> {
  if (!publicationId) return null;

  const { data, error } = await supabase
    .from("shared_link_comments")
    .select("created_at")
    .eq("publication_id", publicationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingOptionalCollaborationTable(error)) return null;
    throw error;
  }
  return data?.created_at ?? null;
}

async function readLatestSharedLinkResponseAt(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  publicationId: string | null | undefined,
): Promise<string | null> {
  if (!publicationId) return null;

  const { data, error } = await supabase
    .from("shared_link_responses")
    .select("created_at")
    .eq("publication_id", publicationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingOptionalCollaborationTable(error)) return null;
    throw error;
  }
  return data?.created_at ?? null;
}

/**
 * Most-recent non-null ISO timestamp among the candidates (comments, decisions,
 * opens). Pure so it can be unit-tested without a Supabase round-trip. Returns
 * null when every candidate is null/undefined or unparseable.
 */
export function readLatestPublicationActivityTimestamp(
  candidates: Array<string | null | undefined>,
): string | null {
  let latest: string | null = null;
  let latestTime = Number.NEGATIVE_INFINITY;
  for (const candidate of candidates) {
    if (!candidate) continue;
    const time = Date.parse(candidate);
    if (!Number.isFinite(time)) continue;
    if (time > latestTime) {
      latestTime = time;
      latest = candidate;
    }
  }
  return latest;
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

// Memoized per request (React cache) so the workspace lookup runs once even
// though the layout fan-out (collaboration + publication + sheets summaries) and
// the page each resolve it — previously 3× per render (finding F6). Mirrors the
// getCurrentWorkspaceProject memoization below.
export const ensureDefaultWorkspace = cache(async function ensureDefaultWorkspace(): Promise<WorkspaceBootstrap> {
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
});

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

  const resolveProjectAccess = createWorkshopProjectAccessResolver({
    profileId: profile.id,
    projectMembers,
    sheetMembers,
    workspace,
    workspaceRole,
  });

  function createProjectListItem(project: Tables<"projects">): WorkshopProjectListItem {
    return {
      project,
      ...resolveProjectAccess(project),
      pendingInviteCount: 0,
      publicationSummary: null,
    };
  }

  const projectItems: WorkshopProjectListItem[] = [
    ...ownedProjects.map(createProjectListItem),
    ...sharedProjects.map((project) => {
      return createProjectListItem(project);
    }),
  ];
  const publicationRows = await readOptionalProjectPublications(
    supabase,
    Array.from(new Set(projectItems.map((item) => item.project.id))),
  );
  const publicationByProjectId = new Map<string, ProjectPublicationListRow>();
  for (const publication of publicationRows) {
    if (!publicationByProjectId.has(publication.project_id)) {
      publicationByProjectId.set(publication.project_id, publication);
    }
  }
  const pendingInviteVisibility = await readPendingCollaborationVisibilitySummary({
    email: profile.email,
    projectIds: projectItems
      .filter((item) => canManageCollaborationRole(item.currentUserRole))
      .map((item) => item.project.id),
    supabase,
  });
  const acceptedProjectIds = new Set(projectItems.map((item) => item.project.id));
  const pendingInviteItemsByProjectId = new Map<string, WorkshopProjectListItem>();
  for (const invite of pendingInviteVisibility.receivedPendingInvites) {
    if (acceptedProjectIds.has(invite.projectId) || pendingInviteItemsByProjectId.has(invite.projectId)) continue;
    pendingInviteItemsByProjectId.set(
      invite.projectId,
      createPendingInviteProjectListItem({
        invite,
        profileId: profile.id,
        workspaceId: workspace.id,
      }),
    );
  }

  return {
    workspace,
    projects: [
      ...projectItems.map((item) => ({
        ...item,
        pendingInvite: null,
        pendingInviteCount: pendingInviteVisibility.sentPendingInviteCountByProjectId.get(item.project.id) ?? 0,
        publicationSummary: readProjectPublicationListSummary(publicationByProjectId.get(item.project.id) ?? null),
      })),
      ...pendingInviteItemsByProjectId.values(),
    ],
    favoriteProjectIds: (favoritesResult.data ?? []).map((favorite) => favorite.project_id),
  };
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

  const [
    projectFavoritesResult,
    estimateFavoritesResult,
    recentProjectsResult,
    projectMembersResult,
    sheetMembersResult,
    workspaceMembershipResult,
  ] = await Promise.all([
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
      .select("id, name, client_name, project_code, location, updated_at, workspace_id, created_by")
      .eq("workspace_id", workspace.id)
      .order("updated_at", { ascending: false })
      .limit(WORKSHOP_HOMEBASE_ITEM_LIMIT),
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

  if (projectFavoritesResult.error) throw projectFavoritesResult.error;
  if (estimateFavoritesResult.error) throw estimateFavoritesResult.error;
  if (recentProjectsResult.error) throw recentProjectsResult.error;
  if (projectMembersResult.error && !isMissingOptionalCollaborationTable(projectMembersResult.error)) throw projectMembersResult.error;
  if (sheetMembersResult.error && !isMissingOptionalCollaborationTable(sheetMembersResult.error)) throw sheetMembersResult.error;
  if (workspaceMembershipResult.error) throw workspaceMembershipResult.error;

  const projectFavoriteCreatedAt = new Map(
    (projectFavoritesResult.data ?? []).map((favorite) => [favorite.project_id, favorite.created_at]),
  );
  const estimateFavoriteCreatedAt = new Map(
    (estimateFavoritesResult.data ?? []).map((favorite) => [favorite.estimate_id, favorite.created_at]),
  );
  const favoriteProjectIds = Array.from(projectFavoriteCreatedAt.keys());
  const favoriteEstimateIds = Array.from(estimateFavoriteCreatedAt.keys());
  const projectMembers = (projectMembersResult.error ? [] : projectMembersResult.data ?? []) as ProjectMemberRow[];
  const sheetMembers = (sheetMembersResult.error ? [] : sheetMembersResult.data ?? []) as EstimateSheetMemberRow[];
  const workspaceRole = workspaceMembershipResult.data?.role
    ? mapWorkspaceRoleToCollaborationRole(workspaceMembershipResult.data.role)
    : null;
  const resolveProjectAccess = createWorkshopProjectAccessResolver({
    profileId: profile.id,
    projectMembers,
    sheetMembers,
    workspace,
    workspaceRole,
  });

  let favoriteProjects: WorkshopProjectRecord[] = [];
  if (favoriteProjectIds.length > 0) {
    const { data, error } = await supabase
      .from("projects")
      .select("id, name, client_name, project_code, location, updated_at, workspace_id, created_by")
      .in("id", favoriteProjectIds);

    if (error) throw error;
    favoriteProjects = data ?? [];
  }

  const visibleFavoriteProjectIds = new Set(favoriteProjects.map((project) => project.id));
  const removedProjectFavorites = favoriteProjectIds
    .filter((projectId) => !visibleFavoriteProjectIds.has(projectId))
    .map((projectId) => ({
      id: projectId,
      name: null,
      projectCode: null,
      favoriteCreatedAt: projectFavoriteCreatedAt.get(projectId) ?? null,
    }));

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
      .select("id, name, client_name, project_code, location, updated_at, workspace_id, created_by")
      .in("id", missingProjectIds);

    if (error) throw error;
    projects.push(...((data ?? []) as WorkshopProjectRecord[]));
  }

  const projectById = new Map(projects.map((project) => [project.id, project]));
  const homebasePublicationRows = await readOptionalProjectPublications(
    supabase,
    Array.from(new Set(projects.map((project) => project.id))),
  );
  const homebasePublicationByProjectId = new Map<string, ProjectPublicationListRow>();
  for (const publication of homebasePublicationRows) {
    if (!homebasePublicationByProjectId.has(publication.project_id)) {
      homebasePublicationByProjectId.set(publication.project_id, publication);
    }
  }
  const pendingInviteVisibility = await readPendingCollaborationVisibilitySummary({
    email: profile.email,
    projectIds: projects
      .filter((project) => canManageCollaborationRole(resolveProjectAccess(project).currentUserRole))
      .map((project) => project.id),
    supabase,
  });
  const estimateIds = estimates.map((estimate) => estimate.id);
  let firstNodeByEstimateId = new Map<string, string>();
  if (estimateIds.length > 0) {
    const { data, error } = await supabase
      .from("estimate_nodes")
      .select("id, estimate_id, kind, parent_id, sort_order")
      .in("estimate_id", estimateIds)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    firstNodeByEstimateId = selectFirstEstimateNodeIds(data ?? []);
  }

  return {
    workspace,
    projects: projects.map((project) => {
      const access = resolveProjectAccess(project);
      return {
        id: project.id,
        name: project.name,
        client_name: project.client_name,
        project_code: project.project_code,
        location: project.location,
        updated_at: project.updated_at,
        ...access,
        isFavorite: projectFavoriteCreatedAt.has(project.id),
        favoriteCreatedAt: projectFavoriteCreatedAt.get(project.id) ?? null,
        pendingInviteCount: pendingInviteVisibility.sentPendingInviteCountByProjectId.get(project.id) ?? 0,
        publicationSummary: readProjectPublicationListSummary(homebasePublicationByProjectId.get(project.id) ?? null),
      };
    }),
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
    pendingInvites: pendingInviteVisibility.receivedPendingInvites,
    removedProjectFavorites,
    receivedPendingInviteCount: pendingInviteVisibility.receivedPendingInviteCount,
  };
}

export const getCurrentWorkspaceProject = cache(async function getCurrentWorkspaceProject(projectId: string) {
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
});

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
  const [latestEstimateUpdatedAt, latestRecipientOpen, latestCommentAt, latestResponseAt] = publication
    ? await Promise.all([
        readLatestEstimateUpdatedAt(supabase, project.id, publication.selected_estimate_ids ?? []),
        canManagePublication ? readLatestSharedLinkRecipientOpen(supabase, publication.id) : Promise.resolve(null),
        canManagePublication ? readLatestSharedLinkCommentAt(supabase, publication.id) : Promise.resolve(null),
        canManagePublication ? readLatestSharedLinkResponseAt(supabase, publication.id) : Promise.resolve(null),
      ])
    : [null, null, null, null];
  // MOD-MET / AC-MOD-07: surface the freshest manager-relevant moment so the
  // header dot lights on new comments/decisions, not just opens.
  const latestActivityAt = canManagePublication
    ? readLatestPublicationActivityTimestamp([latestCommentAt, latestResponseAt, publication?.latest_opened_at ?? null])
    : null;
  const staleSnapshotWarning = readPublicationSnapshotStaleness({
    latestEstimateUpdatedAt,
    snapshotGeneratedAt: readSnapshotGeneratedAt(publication?.snapshot_json),
  });

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
    selectedEstimateIds: publication?.selected_estimate_ids ?? [],
    snapshotVersion: publication?.snapshot_version ?? 0,
    openCount: publication?.open_count ?? 0,
    latestOpenedAt: publication?.latest_opened_at ?? null,
    latestActivityAt,
    latestRecipientOpen,
    staleSnapshotWarning,
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
  const { data: estimates, error } = await traced("listProjectEstimates.estimates", async () =>
    supabase
      .from("estimates")
      .select("*")
      .eq("project_id", project.id)
      .order("updated_at", { ascending: false }),
  );

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
    traced("listProjectEstimates.nodes", async () =>
      supabase
        .from("estimate_nodes")
        .select("id, estimate_id, kind, parent_id, sort_order")
        .in("estimate_id", estimateIds)
        .order("sort_order", { ascending: true }),
    ),
    traced("listProjectEstimates.rowItems", async () =>
      supabase
        .from("estimate_row_items")
        .select("estimate_id, quantity, unit_cost, contingency_percentage, misc_cost")
        .in("estimate_id", estimateIds),
    ),
  ]);

  if (nodesResult.error) throw nodesResult.error;
  if (rowsResult.error) throw rowsResult.error;

  const firstNodeByEstimateId = selectFirstEstimateNodeIds(nodesResult.data ?? []);
  const nodeCountByEstimateId = new Map<string, number>();
  for (const node of nodesResult.data ?? []) {
    nodeCountByEstimateId.set(node.estimate_id, (nodeCountByEstimateId.get(node.estimate_id) ?? 0) + 1);
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

/**
 * Lightweight list of estimates for a project (id, name, sheetCode, updatedAt).
 * Used by ProjectPublicationHeader (Estimates tab picker) for selection without loading heavy node/row aggregates.
 * Additive for Shared Link Overhaul V2 (P1).
 */
export async function listProjectEstimateSheets(projectId: string): Promise<ProjectEstimateSheetSummary[]> {
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) return [];

  return listProjectEstimateSheetsForProject(project.id);
}

type EstimateNodeKind = Tables<"estimate_nodes">["kind"];
type EstimateNodeRow = Tables<"estimate_nodes">;
type EstimateRowItemRow = Tables<"estimate_row_items">;
type WorkspaceSupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type QueryError = { message: string; code?: string | null };
type QueryResult<T> = { data: T | null; error: QueryError | null };
type EstimateTabQueryRow = {
  id: string;
  estimate_id: string;
  name: string;
  sort_order: number;
  is_default: boolean;
  archived_at: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

type EstimateTabsQuery = {
  eq: (column: string, value: string | boolean) => EstimateTabsQuery;
  is: (column: string, value: null) => EstimateTabsQuery;
  order: (column: string, options?: { ascending?: boolean }) => Promise<QueryResult<EstimateTabQueryRow[]>>;
  maybeSingle: () => Promise<QueryResult<EstimateTabQueryRow>>;
};

type EstimateTabsReadClient = {
  from: (table: "estimate_tabs") => {
    select: (columns: string) => EstimateTabsQuery;
  };
};

// Estimate-sheet tree loads fetch every node and row of the estimate, so the
// column list is explicit: only fields consumed by buildEstimateTree/toUiRow.
// source_snapshot stays — linked-row display (image, category, price option,
// lifecycle, pricing provenance) reads it. If toUiRow gains a field, add the
// column here or the Pick types below fail the build.
const ESTIMATE_TREE_NODE_COLUMNS = "id, kind, name, parent_id";
const ESTIMATE_TREE_ROW_ITEM_COLUMNS =
  "id, node_id, material, description, supplier, supplier_id, unit, unit_cost, quantity, contingency_percentage, misc_cost, row_revision, category_node_id, discipline, designation, source_library_item_id, link_state, source_snapshot, metadata, created_at";

export type EstimateTreeNodeQueryRow = Pick<EstimateNodeRow, "id" | "kind" | "name" | "parent_id">;
export type EstimateTreeRowItemQueryRow = Pick<
  EstimateRowItemRow,
  | "id"
  | "node_id"
  | "material"
  | "description"
  | "supplier"
  | "supplier_id"
  | "unit"
  | "unit_cost"
  | "quantity"
  | "contingency_percentage"
  | "misc_cost"
  | "row_revision"
  | "category_node_id"
  | "discipline"
  | "designation"
  | "source_library_item_id"
  | "link_state"
  | "source_snapshot"
  | "metadata"
  | "created_at"
>;

type LiveEstimateTreeResult = {
  workspace: Tables<"workspaces">;
  project: Tables<"projects"> | null;
  estimate: Tables<"estimates"> | null;
  selectedNodeId: string | null;
  tree: EstimateTreeNode[];
  loadLimitState?: LiveEstimateTreeLoadLimitState;
};

type LiveEstimateTreeLoadOptions = {
  maxNodeCount?: number;
  maxRowItemCount?: number;
  /**
   * Opt-in read-only fallback for the reusable-source / export paths: when the
   * `estimate_tabs` schema is not yet applied to the live database, synthesize a
   * single "Main" tab from the legacy whole-estimate tree instead of throwing.
   * Only read paths set this; tab-CRUD mutation callers must NOT (U1-RO) so they
   * never operate on a synthetic tab.
   */
  allowLegacyFallback?: boolean;
};

type LiveEstimateTreeLoadLimitState = {
  maxNodeCount: number | null;
  maxRowItemCount: number | null;
  fetchedNodeCount: number;
  fetchedRowItemCount: number;
  didExceedNodeLimit: boolean;
  didExceedRowItemLimit: boolean;
};

type LiveEstimateTabTreeResult = LiveEstimateTreeResult & {
  tab: EstimateTabSummary | null;
};

type EstimateTabRouteContext = LiveEstimateTabTreeResult & {
  selectedNodeId: string | null;
  // U21: the full tab list, resolved in parallel with the tree on the tab-present
  // paths, so the node-route page avoids a second serial getEstimateTabs round-trip.
  tabs?: EstimateTabSummary[];
};
type EstimateNodeRouteRow = {
  id: string;
  estimate_id: string;
  estimate_tab_id?: string | null;
  estimates: EstimateRecordWithLegacy;
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

function toUiRow(row: EstimateTreeRowItemQueryRow): EstimateRowItem {
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
  // P3-T1/T2: interim read of labor rate + per-row scope from row metadata (typed columns
  // are DB-gated). Absent → undefined, so the proposal model falls back to 0 / "included".
  const laborUnitCost = typeof metadata.laborUnitCost === "number" && Number.isFinite(metadata.laborUnitCost) ? metadata.laborUnitCost : undefined;
  const scopeStatus = typeof metadata.scopeStatus === "string" && metadata.scopeStatus.trim() ? metadata.scopeStatus : undefined;

  return {
    id: row.id,
    material: row.material,
    laborUnitCost,
    scopeStatus,
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
    imageUrl: normalizeEstimateRowImageUrl(sourceSnapshot.imageUrl) ?? undefined,
    sourceLibraryItemId: row.source_library_item_id,
    linkState: row.link_state,
    componentVersionId: typeof sourceSnapshot.componentVersionId === "string" ? sourceSnapshot.componentVersionId : undefined,
    componentVersionNumber,
    priceOptionId: typeof sourceSnapshot.priceOptionId === "string" ? sourceSnapshot.priceOptionId : undefined,
    priceOptionLabel: typeof sourceSnapshot.priceOptionLabel === "string" ? sourceSnapshot.priceOptionLabel : undefined,
    lifecycleState: typeof sourceSnapshot.lifecycleState === "string" ? sourceSnapshot.lifecycleState as EstimateRowItem["lifecycleState"] : undefined,
    pricingSource: typeof sourceSnapshot.pricingSource === "string" ? sourceSnapshot.pricingSource : "Estimate row snapshot",
    pricingDate: typeof sourceSnapshot.pricingDate === "string" ? sourceSnapshot.pricingDate : row.created_at.slice(0, 10),
  };
}

function normalizeTreeLoadLimit(value: number | undefined): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

function limitTreeRows<T>(rows: T[], limit: number | null): { rows: T[]; didExceedLimit: boolean } {
  if (!limit) return { rows, didExceedLimit: false };
  return {
    rows: rows.slice(0, limit),
    didExceedLimit: rows.length > limit,
  };
}

function asEstimateTabsReadClient(supabase: WorkspaceSupabaseClient) {
  // Temporary compatibility boundary: estimate_tabs exists after the owner-authorized
  // linked apply/type regeneration. Keep casts narrow and delete them after regen.
  return supabase as unknown as EstimateTabsReadClient;
}

function toEstimateTabSummary(row: EstimateTabQueryRow): EstimateTabSummary {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    isDefault: row.is_default,
  };
}

/**
 * Synthetic single-tab id used by the read-only legacy fallback when the
 * `estimate_tabs` schema is not yet applied. Mirrors the AI read-context
 * convention (`src/lib/ai/read-context.ts`) so every fallback agrees on the
 * same id/name.
 */
export const LEGACY_MAIN_TAB_ID = "legacy-main";

function syntheticMainTab(): EstimateTabSummary {
  return { id: LEGACY_MAIN_TAB_ID, name: "Main", sortOrder: 0, isDefault: true };
}

function isEstimateTabsSchemaMissing(error: unknown) {
  const candidate = error as { code?: string | null; message?: string | null } | null | undefined;
  return isMissingRelationError(candidate, "estimate_tabs") || isMissingColumnError(candidate, "estimate_tab_id");
}

export function buildEstimateTree(nodes: EstimateTreeNodeQueryRow[], rows: EstimateTreeRowItemQueryRow[]): EstimateTreeNode[] {
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

  function computeTotals(node: EstimateTreeNode): number {
    const rowTotal = (node.estimateRowItems ?? []).reduce((total, row) => total + row.totalItemCosts, 0);
    const childTotal = (node.children ?? []).reduce((total, child) => total + computeTotals(child), 0);
    const total = rowTotal + childTotal;
    node.total = formatPeso(total);
    return total;
  }

  // Sibling order is the stored sort_order (the node query orders by it):
  // the tree, the sheet, and node codes all read this one order, so no
  // display-side re-sorting (e.g. groups-before-areas) may reorder siblings.
  roots.forEach(computeTotals);
  return roots;
}

async function getProjectEstimateTreeByEstimateLegacy(
  projectId: string,
  estimateId: string,
  options: LiveEstimateTreeLoadOptions = {},
): Promise<LiveEstimateTreeResult> {
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

  const maxNodeCount = normalizeTreeLoadLimit(options.maxNodeCount);
  const maxRowItemCount = normalizeTreeLoadLimit(options.maxRowItemCount);
  const nodesQuery = supabase.from("estimate_nodes").select(ESTIMATE_TREE_NODE_COLUMNS).eq("estimate_id", estimate.id).order("sort_order", { ascending: true });
  const rowsQuery = supabase.from("estimate_row_items").select(ESTIMATE_TREE_ROW_ITEM_COLUMNS).eq("estimate_id", estimate.id).order("sort_order", { ascending: true });

  const [nodesResult, rowsResult] = await Promise.all([
    maxNodeCount ? nodesQuery.limit(maxNodeCount + 1) : nodesQuery,
    maxRowItemCount ? rowsQuery.limit(maxRowItemCount + 1) : rowsQuery,
  ]);

  if (nodesResult.error) throw nodesResult.error;
  if (rowsResult.error) throw rowsResult.error;

  const rawNodes = nodesResult.data ?? [];
  const rawRows = rowsResult.data ?? [];
  const limitedNodes = limitTreeRows(rawNodes, maxNodeCount);
  const limitedRows = limitTreeRows(rawRows, maxRowItemCount);
  const loadLimitState = maxNodeCount || maxRowItemCount
    ? {
      maxNodeCount,
      maxRowItemCount,
      fetchedNodeCount: rawNodes.length,
      fetchedRowItemCount: rawRows.length,
      didExceedNodeLimit: limitedNodes.didExceedLimit,
      didExceedRowItemLimit: limitedRows.didExceedLimit,
    }
    : undefined;
  const nodes = limitedNodes.rows;
  const normalizedEstimate = normalizeEstimateRecord(estimate as EstimateRecordWithLegacy);
  const tree = buildEstimateTree(nodes, limitedRows.rows);
  return { workspace, project, estimate: normalizedEstimate, selectedNodeId: tree[0]?.id ?? null, tree, loadLimitState };
}

/**
 * Read-only legacy fallback for the reusable-source / export paths: present the
 * whole-estimate legacy tree as a single synthetic "Main" tab when
 * `estimate_tabs` is not yet applied. Forwards load-limit options so export
 * limit enforcement is unchanged (U1-4).
 */
async function buildLegacyTabTree(
  projectId: string,
  estimateId: string,
  options: LiveEstimateTreeLoadOptions,
): Promise<LiveEstimateTabTreeResult> {
  const legacy = await getProjectEstimateTreeByEstimateLegacy(projectId, estimateId, options);
  return { ...legacy, tab: legacy.estimate ? syntheticMainTab() : null };
}

export async function getEstimateTabs(
  projectId: string,
  estimateId: string,
  options: { allowLegacyFallback?: boolean } = {},
): Promise<EstimateTabSummary[]> {
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) return [];

  const supabase = await createSupabaseServerClient();
  const { data: estimate, error: estimateError } = await supabase
    .from("estimates")
    .select("id, project_id")
    .eq("id", estimateId)
    .eq("project_id", project.id)
    .maybeSingle();

  if (estimateError) throw estimateError;
  if (!estimate) return [];

  try {
    const { data, error } = await asEstimateTabsReadClient(supabase)
      .from("estimate_tabs")
      .select("id, estimate_id, name, sort_order, is_default, archived_at, metadata, created_at, updated_at")
      .eq("estimate_id", estimate.id)
      .is("archived_at", null)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return (data ?? []).map(toEstimateTabSummary);
  } catch (error) {
    // Strictly gated on the missing-schema signal so a real data error (schema
    // present, zero tabs) is never masked as legacy (U1-2/U1-3). The synthetic
    // tab is read-only: only opt-in read callers reach this branch.
    if (options.allowLegacyFallback && isEstimateTabsSchemaMissing(error)) {
      return [syntheticMainTab()];
    }
    throw error;
  }
}

/**
 * Resolves whether the current user can edit this estimate using the same
 * `can_edit_estimate` RPC that RLS and `assertCanEditEstimate` rely on, so the
 * client-side edit gate can never diverge from server enforcement. This is UX
 * gating only — the server (RLS + `assert_can_edit_estimate_for_history`) stays
 * authoritative. Fails closed (returns `false`) on any error so a transient
 * failure hides edit affordances rather than exposing ones that error on use.
 */
export async function resolveEstimateEditCapability(estimateId: string): Promise<boolean> {
  if (await isDevAdminDatabaseBypassActiveForRequest()) return true;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("can_edit_estimate", { target_estimate_id: estimateId });
  if (error) return false;
  return data === true;
}

export async function getDefaultEstimateTab(estimateId: string): Promise<EstimateTabSummary | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await asEstimateTabsReadClient(supabase)
    .from("estimate_tabs")
    .select("id, estimate_id, name, sort_order, is_default, archived_at, metadata, created_at, updated_at")
    .eq("estimate_id", estimateId)
    .eq("is_default", true)
    .is("archived_at", null)
    .maybeSingle();

  if (error) throw error;
  return data ? toEstimateTabSummary(data) : null;
}

export async function getEstimateTabTree(
  projectId: string,
  estimateId: string,
  tabId: string,
  options: LiveEstimateTreeLoadOptions = {},
): Promise<LiveEstimateTabTreeResult> {
  // A synthetic "Main" tab id maps straight to the legacy whole-estimate loader
  // — never a literal estimate_tabs lookup on a non-existent id (U1-2).
  if (options.allowLegacyFallback && tabId === LEGACY_MAIN_TAB_ID) {
    return buildLegacyTabTree(projectId, estimateId, options);
  }

  const { workspace, project } = await getCurrentWorkspaceProject(projectId);
  if (!project) return { workspace, project, estimate: null, tab: null, selectedNodeId: null, tree: [] };

  const supabase = await createSupabaseServerClient();
  const { data: estimate, error: estimateError } = await supabase
    .from("estimates")
    .select("*")
    .eq("id", estimateId)
    .eq("project_id", project.id)
    .maybeSingle();

  if (estimateError) throw estimateError;
  if (!estimate) return { workspace, project, estimate: null, tab: null, selectedNodeId: null, tree: [] };

  try {
    const { data: tab, error: tabError } = await asEstimateTabsReadClient(supabase)
      .from("estimate_tabs")
      .select("id, estimate_id, name, sort_order, is_default, archived_at, metadata, created_at, updated_at")
      .eq("id", tabId)
      .eq("estimate_id", estimate.id)
      .is("archived_at", null)
      .maybeSingle();

    if (tabError) throw tabError;
    if (!tab) return { workspace, project, estimate: normalizeEstimateRecord(estimate as EstimateRecordWithLegacy), tab: null, selectedNodeId: null, tree: [] };

    const maxNodeCount = normalizeTreeLoadLimit(options.maxNodeCount);
    const maxRowItemCount = normalizeTreeLoadLimit(options.maxRowItemCount);
    const nodesQuery = supabase
      .from("estimate_nodes")
      .select(ESTIMATE_TREE_NODE_COLUMNS)
      .eq("estimate_id", estimate.id);
    const tabScopedNodesQuery = (nodesQuery as unknown as { eq: (column: string, value: string) => typeof nodesQuery })
      .eq("estimate_tab_id", tab.id)
      .order("sort_order", { ascending: true });
    const nodesResult = maxNodeCount ? await tabScopedNodesQuery.limit(maxNodeCount + 1) : await tabScopedNodesQuery;

    if (nodesResult.error) throw nodesResult.error;

    const rawNodes = (nodesResult.data ?? []) as EstimateTreeNodeQueryRow[];
    const limitedNodes = limitTreeRows(rawNodes, maxNodeCount);
    const nodeIds = limitedNodes.rows.map((node) => node.id);
    let rawRows: EstimateTreeRowItemQueryRow[] = [];
    if (nodeIds.length > 0) {
      // U9 (PERF-7): lead with estimate_id so this hits the composite index
      // estimate_row_items(estimate_id, node_id, sort_order). The result set is
      // identical — every node in nodeIds belongs to estimate.id (the nodes
      // query above is scoped to it) — so this only improves the index path.
      const rowsQuery = supabase
        .from("estimate_row_items")
        .select(ESTIMATE_TREE_ROW_ITEM_COLUMNS)
        .eq("estimate_id", estimate.id)
        .in("node_id", nodeIds)
        .order("sort_order", { ascending: true });
      const rowsResult = maxRowItemCount ? await rowsQuery.limit(maxRowItemCount + 1) : await rowsQuery;
      if (rowsResult.error) throw rowsResult.error;
      rawRows = rowsResult.data ?? [];
    }

    const limitedRows = limitTreeRows(rawRows, maxRowItemCount);
    const loadLimitState = maxNodeCount || maxRowItemCount
      ? {
        maxNodeCount,
        maxRowItemCount,
        fetchedNodeCount: rawNodes.length,
        fetchedRowItemCount: rawRows.length,
        didExceedNodeLimit: limitedNodes.didExceedLimit,
        didExceedRowItemLimit: limitedRows.didExceedLimit,
      }
      : undefined;
    const normalizedEstimate = normalizeEstimateRecord(estimate as EstimateRecordWithLegacy);
    const tree = buildEstimateTree(limitedNodes.rows, limitedRows.rows);
    return { workspace, project, estimate: normalizedEstimate, tab: toEstimateTabSummary(tab), selectedNodeId: tree[0]?.id ?? null, tree, loadLimitState };
  } catch (error) {
    // Read-only fallback only on the missing-schema signal (the tab lookup or
    // the estimate_tab_id node predicate). Real errors and non-opt-in callers
    // keep throwing — no working path changes (U1-2/U1-3/U1-RO).
    if (options.allowLegacyFallback && isEstimateTabsSchemaMissing(error)) {
      return buildLegacyTabTree(projectId, estimateId, options);
    }
    throw error;
  }
}

export type LiveEstimateTabTree = { tab: EstimateTabSummary; tree: EstimateTreeNode[] };
export type LiveEstimateTreesForTabsResult = {
  workspace: Tables<"workspaces">;
  project: Tables<"projects"> | null;
  estimate: Tables<"estimates"> | null;
  tabs: LiveEstimateTabTree[];
  loadLimitState?: LiveEstimateTreeLoadLimitState;
};

const ESTIMATE_TREE_NODE_COLUMNS_WITH_TAB = `${ESTIMATE_TREE_NODE_COLUMNS}, estimate_tab_id`;

// F-14 (P2-T7): pure grouping of a single batched nodes+rows fetch into per-tab trees, exported
// so the partition logic is unit-tested without a DB. Nodes carry estimate_tab_id; rows are
// attached to their tab via their node. Tab order follows the passed `tabs`.
export function groupEstimateTabTrees(
  tabs: EstimateTabSummary[],
  nodes: Array<EstimateTreeNodeQueryRow & { estimate_tab_id?: string | null }>,
  rows: EstimateTreeRowItemQueryRow[],
): LiveEstimateTabTree[] {
  const nodesByTab = new Map<string, EstimateTreeNodeQueryRow[]>();
  const nodeIdToTab = new Map<string, string>();
  for (const node of nodes) {
    const tabId = node.estimate_tab_id;
    if (!tabId) continue;
    nodeIdToTab.set(node.id, tabId);
    const list = nodesByTab.get(tabId) ?? [];
    list.push(node);
    nodesByTab.set(tabId, list);
  }
  const rowsByTab = new Map<string, EstimateTreeRowItemQueryRow[]>();
  for (const row of rows) {
    const tabId = nodeIdToTab.get(row.node_id);
    if (!tabId) continue;
    const list = rowsByTab.get(tabId) ?? [];
    list.push(row);
    rowsByTab.set(tabId, list);
  }
  return tabs.map((tab) => ({
    tab,
    tree: buildEstimateTree(nodesByTab.get(tab.id) ?? [], rowsByTab.get(tab.id) ?? []),
  }));
}

// F-14/F-24 (P2-T7): NEW additive function (no existing signature changes). Replaces the per-tab
// getEstimateTabTree fan-out for the all-tabs export with one estimate lookup + one batched
// nodes query + one batched rows query, preserving the LIMIT max+1 over-fetch guard so the
// total (not per-tab) count is capped and the 413 fires early. Takes the already-resolved tab
// summaries so it does not re-query estimate_tabs.
export async function getEstimateTreesForTabs(
  projectId: string,
  estimateId: string,
  tabs: EstimateTabSummary[],
  options: LiveEstimateTreeLoadOptions = {},
): Promise<LiveEstimateTreesForTabsResult> {
  const { workspace, project } = await getCurrentWorkspaceProject(projectId);
  if (!project) return { workspace, project: null, estimate: null, tabs: [] };

  const supabase = await createSupabaseServerClient();
  const { data: estimate, error: estimateError } = await supabase
    .from("estimates")
    .select("*")
    .eq("id", estimateId)
    .eq("project_id", project.id)
    .maybeSingle();
  if (estimateError) throw estimateError;
  if (!estimate) return { workspace, project, estimate: null, tabs: [] };

  const tabIds = tabs.map((tab) => tab.id);
  const maxNodeCount = normalizeTreeLoadLimit(options.maxNodeCount);
  const maxRowItemCount = normalizeTreeLoadLimit(options.maxRowItemCount);

  const nodesQuery = supabase
    .from("estimate_nodes")
    .select(ESTIMATE_TREE_NODE_COLUMNS_WITH_TAB)
    .eq("estimate_id", estimate.id)
    .in("estimate_tab_id", tabIds)
    .order("sort_order", { ascending: true });
  const nodesResult = maxNodeCount ? await nodesQuery.limit(maxNodeCount + 1) : await nodesQuery;
  if (nodesResult.error) throw nodesResult.error;
  const rawNodes = (nodesResult.data ?? []) as Array<EstimateTreeNodeQueryRow & { estimate_tab_id: string | null }>;
  const limitedNodes = limitTreeRows(rawNodes, maxNodeCount);
  const nodeIds = limitedNodes.rows.map((node) => node.id);

  let rawRows: EstimateTreeRowItemQueryRow[] = [];
  if (nodeIds.length > 0) {
    const rowsQuery = supabase
      .from("estimate_row_items")
      .select(ESTIMATE_TREE_ROW_ITEM_COLUMNS)
      .in("node_id", nodeIds)
      .order("sort_order", { ascending: true });
    const rowsResult = maxRowItemCount ? await rowsQuery.limit(maxRowItemCount + 1) : await rowsQuery;
    if (rowsResult.error) throw rowsResult.error;
    rawRows = rowsResult.data ?? [];
  }
  const limitedRows = limitTreeRows(rawRows, maxRowItemCount);

  const loadLimitState = maxNodeCount || maxRowItemCount
    ? {
      maxNodeCount,
      maxRowItemCount,
      fetchedNodeCount: rawNodes.length,
      fetchedRowItemCount: rawRows.length,
      didExceedNodeLimit: limitedNodes.didExceedLimit,
      didExceedRowItemLimit: limitedRows.didExceedLimit,
    }
    : undefined;

  return {
    workspace,
    project,
    estimate: normalizeEstimateRecord(estimate as EstimateRecordWithLegacy),
    tabs: groupEstimateTabTrees(tabs, limitedNodes.rows, limitedRows.rows),
    loadLimitState,
  };
}

export async function getProjectEstimateTreeByEstimate(
  projectId: string,
  estimateId: string,
  options: LiveEstimateTreeLoadOptions = {},
): Promise<LiveEstimateTreeResult> {
  try {
    const defaultTab = await getDefaultEstimateTab(estimateId);
    if (!defaultTab) return getProjectEstimateTreeByEstimateLegacy(projectId, estimateId, options);
    const result = await getEstimateTabTree(projectId, estimateId, defaultTab.id, options);
    return {
      workspace: result.workspace,
      project: result.project,
      estimate: result.estimate,
      selectedNodeId: result.selectedNodeId,
      tree: result.tree,
      loadLimitState: result.loadLimitState,
    };
  } catch (error) {
    if (isEstimateTabsSchemaMissing(error)) return getProjectEstimateTreeByEstimateLegacy(projectId, estimateId, options);
    throw error;
  }
}

export async function resolveEstimateTabRouteContext(
  projectId: string,
  routeSegment: string,
  options: LiveEstimateTreeLoadOptions = {},
): Promise<EstimateTabRouteContext> {
  const { workspace, project } = await getCurrentWorkspaceProject(projectId);
  if (!project) return { workspace, project, estimate: null, tab: null, selectedNodeId: null, tree: [] };

  const supabase = await createSupabaseServerClient();
  const { data: selectedNode, error: selectedNodeError } = await supabase
    .from("estimate_nodes")
    .select("id, estimate_id, estimate_tab_id, estimates!inner(*)")
    .eq("id", routeSegment)
    .eq("estimates.project_id", project.id)
    .maybeSingle();

  if (selectedNodeError) {
    if (isEstimateTabsSchemaMissing(selectedNodeError)) {
      const legacyResult = await getProjectEstimateTreeByNode(projectId, routeSegment);
      return { ...legacyResult, tab: null };
    }
    throw selectedNodeError;
  }

  const routeNode = selectedNode as unknown as EstimateNodeRouteRow | null;
  if (routeNode?.estimate_tab_id) {
    // U21: resolve the tab tree and the tab list in parallel so the page needn't
    // issue a second serial getEstimateTabs round-trip after this resolver.
    const [result, tabs] = await Promise.all([
      getEstimateTabTree(projectId, routeNode.estimate_id, routeNode.estimate_tab_id, options),
      getEstimateTabs(projectId, routeNode.estimate_id),
    ]);
    return {
      ...result,
      selectedNodeId: routeNode.id,
      tabs,
    };
  }

  try {
    const defaultTab = await getDefaultEstimateTab(routeSegment);
    if (defaultTab) {
      const [result, tabs] = await Promise.all([
        getEstimateTabTree(projectId, routeSegment, defaultTab.id, options),
        getEstimateTabs(projectId, routeSegment),
      ]);
      return { ...result, tabs };
    }
  } catch (error) {
    if (!isEstimateTabsSchemaMissing(error)) throw error;
  }

  const defaultResult = await getProjectEstimateTreeByEstimate(projectId, routeSegment, options);
  return { ...defaultResult, tab: null };
}

async function getProjectEstimateTreeByNodeLegacy(projectId: string, nodeId: string): Promise<LiveEstimateTreeResult> {
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
  if (!selectedNode) return getProjectEstimateTreeByEstimateLegacy(projectId, nodeId);

  const estimate = normalizeEstimateRecord(selectedNode.estimates as EstimateRecordWithLegacy);
  const [nodesResult, rowsResult] = await Promise.all([
    supabase.from("estimate_nodes").select(ESTIMATE_TREE_NODE_COLUMNS).eq("estimate_id", selectedNode.estimate_id).order("sort_order", { ascending: true }),
    supabase.from("estimate_row_items").select(ESTIMATE_TREE_ROW_ITEM_COLUMNS).eq("estimate_id", selectedNode.estimate_id).order("sort_order", { ascending: true }),
  ]);

  if (nodesResult.error) throw nodesResult.error;
  if (rowsResult.error) throw rowsResult.error;

  const nodes = nodesResult.data ?? [];
  const tree = buildEstimateTree(nodes, rowsResult.data ?? []);
  const selectedNodeId = nodes.some((node) => node.id === nodeId) ? nodeId : tree[0]?.id ?? null;

  return { workspace, project, estimate, selectedNodeId, tree };
}

export async function getProjectEstimateTreeByNode(projectId: string, nodeId: string): Promise<LiveEstimateTreeResult> {
  const { workspace, project } = await getCurrentWorkspaceProject(projectId);
  if (!project) return { workspace, project, estimate: null, selectedNodeId: null, tree: [] };

  const supabase = await createSupabaseServerClient();
  const { data: selectedNode, error: selectedNodeError } = await supabase
    .from("estimate_nodes")
    .select("id, estimate_id, estimate_tab_id, estimates!inner(*)")
    .eq("id", nodeId)
    .eq("estimates.project_id", project.id)
    .maybeSingle();

  if (selectedNodeError) {
    if (isEstimateTabsSchemaMissing(selectedNodeError)) return getProjectEstimateTreeByNodeLegacy(projectId, nodeId);
    throw selectedNodeError;
  }
  if (!selectedNode) return getProjectEstimateTreeByEstimate(projectId, nodeId);

  const routeNode = selectedNode as unknown as EstimateNodeRouteRow;
  if (routeNode.estimate_tab_id) {
    const result = await getEstimateTabTree(projectId, routeNode.estimate_id, routeNode.estimate_tab_id);
    return {
      ...result,
      selectedNodeId: nodeId,
    };
  }

  const estimate = normalizeEstimateRecord(routeNode.estimates);
  const [nodesResult, rowsResult] = await Promise.all([
    supabase.from("estimate_nodes").select(ESTIMATE_TREE_NODE_COLUMNS).eq("estimate_id", routeNode.estimate_id).order("sort_order", { ascending: true }),
    supabase.from("estimate_row_items").select(ESTIMATE_TREE_ROW_ITEM_COLUMNS).eq("estimate_id", routeNode.estimate_id).order("sort_order", { ascending: true }),
  ]);

  if (nodesResult.error) throw nodesResult.error;
  if (rowsResult.error) throw rowsResult.error;

  const nodes = nodesResult.data ?? [];
  const tree = buildEstimateTree(nodes, rowsResult.data ?? []);
  const selectedNodeId = nodes.some((node) => node.id === nodeId) ? nodeId : tree[0]?.id ?? null;

  return { workspace, project, estimate, selectedNodeId, tree };
}
