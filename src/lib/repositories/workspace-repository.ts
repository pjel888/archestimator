import { cache } from "react";
import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";

import { getDevAuthBypassCredentialFromRequestParts, isDevAdminDatabaseBypassRequest } from "@/lib/auth/dev-auth-gate";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { readFirstAccountWorkspaceMembership } from "@/lib/auth/account-membership";
import type { EstimateRowItem, EstimateSheetAdjustment, EstimateTabSummary, EstimateTreeNode } from "@/lib/estimates/types";
import { buildEstimateTreeSubtreePayload, type EstimateTreeSubtreeCompleteness, type EstimateTreeSubtreePayload } from "@/lib/estimates/estimate-tree-lazy";
import { readEstimateRowMetadata } from "@/lib/estimates/express-components";
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
  EstimateSheetMemberSummary,
  EstimateSheetAccessMode,
  ProjectCollaborationSummary,
  ProjectCollaboratorSummary,
} from "@/lib/collaboration/types";
import { decryptPublicationToken, readPublicationTokenEncryptionSecret } from "@/lib/publication/security";
import { normalizeProjectPublicationLocationVisibility } from "@/lib/publication/snapshot";
import type { ProjectPublicationListSummary, ProjectPublicationSummary } from "@/lib/publication/types";
import type { Json } from "@/lib/supabase/types";
import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";
import { filterMapBy } from "@/lib/util/array";

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

type ProjectWithWorkspace = Tables<"projects"> & {
  workspaces: Tables<"workspaces"> | null;
};

export type WorkshopProjectSummary = Pick<
  Tables<"projects">,
  "id" | "name" | "client_name" | "project_code" | "location" | "updated_at"
> & {
  accessKind: WorkshopProjectAccessKind;
  currentUserRole: CollaborationRole;
  canManagePublication: boolean;
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
  // react-doctor-disable-next-line react-doctor/supabase-client-owned-authz-field -- Type-only pending-invite summary role; no client Supabase write occurs here.
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
  favoriteEstimateSheets: ProjectFavoriteEstimateSheetSummary[];
  // Part 7c (Project Groups): which user-group this project belongs to (null = Ungrouped).
  // Non-optional: the repository stamps it on EVERY item (real value or null).
  groupId: string | null;
};

// Columns fetched for the /workshop/projects list. We fetch workspace_id + created_by because
// the server-side access resolver (createWorkshopProjectAccessResolver) needs them, but they are
// stripped from the client payload by toClientProjectRow — no client consumer reads them, so
// shipping them in the RSC Flight stream is pure waste (~2 UUIDs + keys ≈ 100 bytes/project).
const WORKSHOP_PROJECT_LIST_COLUMNS =
  "id, workspace_id, created_by, name, client_name, location, project_code, currency_code, metadata, created_at, updated_at" as const;

// Drop the two server-only columns the access resolver consumed so they never reach the client.
// Keeps the return type as the full projects Row (no consumer reads these fields at runtime).
function toClientProjectRow(project: Tables<"projects">): Tables<"projects"> {
  const rest: Partial<Tables<"projects">> = { ...project };
  delete rest.workspace_id;
  delete rest.created_by;
  return rest as Tables<"projects">;
}

export type ProjectFavoriteEstimateSheetSummary = Pick<
  Tables<"estimates">,
  "id" | "project_id" | "name" | "sheet_code" | "updated_at"
> & {
  favoriteCreatedAt: string;
};

// Part 7c (Project Groups): camelCase client-facing summary of a per-user project group.
// Single source of truth — the client imports this type, never redefines it (contracts §3.1).
// `accentId` maps from the snake_case `accent_id` row; `position` carries the manual order.
export type ProjectGroupSummary = {
  id: string;
  name: string;
  accentId: string | null;
  position: number;
};

const WORKSHOP_HOMEBASE_ITEM_LIMIT = 12;
const WORKSHOP_HOMEBASE_FAVORITE_ESTIMATE_LIMIT = 50;
const MAIN_SIDEBAR_FAVORITE_PROJECT_LIMIT = 8;
const MAIN_SIDEBAR_FAVORITE_SHEET_LIMIT = 5;
const ESTIMATE_ROUTE_CONTEXT_PROCESS_CACHE_TTL_MS = 30_000;
const ESTIMATE_ROUTE_CONTEXT_PROCESS_CACHE_MAX_ENTRIES = 100;
const WORKSHOP_ESTIMATE_NODE_KINDS = new Set([
  "assembly",
  "lot",
  "structure",
  "level",
  "area",
  "group",
  "general",
]);

type WorkshopProjectRecord = Pick<
  Tables<"projects">,
  "id" | "name" | "client_name" | "project_code" | "location" | "updated_at" | "workspace_id" | "created_by"
>;

type WorkshopEstimateRecord = Pick<
  Tables<"estimates">,
  "id" | "project_id" | "name" | "sheet_code" | "updated_at"
>;
type WorkshopEstimateQueryResult = {
  data: WorkshopEstimateRecord[] | null;
  error: unknown;
};
type WorkshopProjectQueryResult = {
  data: WorkshopProjectRecord[] | null;
  error: unknown;
};
type WorkshopEstimateNodeRecord = Pick<
  Tables<"estimate_nodes">,
  "id" | "estimate_id" | "kind" | "parent_id" | "sort_order"
>;
type WorkshopEstimateNodeQueryResult = {
  data: WorkshopEstimateNodeRecord[] | null;
  error: unknown;
};
type WorkshopHomebaseSummaryRpcResult = {
  data: Json | null;
  error: unknown;
};
type WorkshopProjectsSummaryRpcResult = {
  data: Json | null;
  error: unknown;
};
type EstimateNodeRouteContextRpcResult = {
  data: Json | null;
  error: unknown;
};
type EstimateRouteContextProcessCacheEntry = {
  projectId: string;
  expiresAt: number;
  value: Promise<EstimateTabRouteContext | null>;
};
type WorkshopHomebaseFavoriteProjectRef = Pick<Tables<"project_favorites">, "project_id" | "created_at">;
type WorkshopHomebaseFavoriteEstimateRef = Pick<Tables<"estimate_favorites">, "estimate_id" | "project_id" | "created_at">;
type WorkshopHomebaseSummaryPayload = {
  projectFavorites: WorkshopHomebaseFavoriteProjectRef[];
  estimateFavorites: WorkshopHomebaseFavoriteEstimateRef[];
  recentProjects: WorkshopProjectRecord[];
  favoriteProjects: WorkshopProjectRecord[];
  estimateProjects: WorkshopProjectRecord[];
  recentEstimates: WorkshopEstimateRecord[];
  favoriteEstimates: WorkshopEstimateRecord[];
  estimateNodes: WorkshopEstimateNodeRecord[];
};
type WorkshopProjectFavoriteRef = Pick<Tables<"project_favorites">, "project_id">;
type ProjectGroupMembershipRow = Pick<Tables<"project_group_memberships">, "project_id" | "group_id">;
type WorkspaceMembershipRoleRow = Pick<Tables<"workspace_members">, "role">;
type SentPendingInviteCountRow = { project_id: string; count: number };
type WorkshopProjectsSummaryPayload = {
  ownedProjects: Tables<"projects">[];
  sharedProjects: Tables<"projects">[];
  projectFavorites: WorkshopProjectFavoriteRef[];
  estimateFavorites: WorkshopHomebaseFavoriteEstimateRef[];
  favoriteEstimates: WorkshopEstimateRecord[];
  projectMembers: ProjectMemberRow[];
  sheetMembers: EstimateSheetMemberRow[];
  workspaceMembership: WorkspaceMembershipRoleRow | null;
  projectGroups: ProjectGroupSummary[];
  projectGroupMemberships: ProjectGroupMembershipRow[];
  publications: ProjectPublicationListRow[];
  receivedPendingInvites: WorkshopPendingInviteSummary[];
  sentInviteCounts: SentPendingInviteCountRow[];
};

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
  | "location_visibility"
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
  const receivedPendingInvites = filterMapBy(
    receivedRows,
    (invitation) => Boolean(invitation.invitation_id && invitation.project_id && invitation.project_name),
    (invitation) => ({
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
    }),
  );
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
    // workspace_id/created_by are intentionally omitted: this synthetic row is never run through
    // the access resolver (accessKind is hard-coded "pending-invite"), and no client consumer reads
    // them — matching the trimmed shape of toClientProjectRow for the real owned/shared rows.
    project: toClientProjectRow({
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
    }),
    accessKind: "pending-invite",
    currentUserRole: invite.role,
    ownerWorkspaceName: invite.inviterLabel,
    pendingInvite: invite,
    pendingInviteCount: 0,
    publicationSummary: null,
    sharedEstimateCount: invite.scope === "estimate" ? 1 : 0,
    favoriteEstimateSheets: [],
    // Part 7c (Project Groups): pending invites are never in a user group.
    groupId: null,
  };
}

async function readOptionalProjectPublication(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  projectId: string,
): Promise<ProjectPublicationRow | null> {
  const { data, error } = await supabase
    .from("project_publications")
    .select(
      "id, project_id, encrypted_token, password_hash, status, snapshot_json, snapshot_version, selected_estimate_ids, published_at, expires_at, revoked_at, open_count, latest_opened_at, location_visibility",
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
      "id, project_id, encrypted_token, password_hash, status, snapshot_version, published_at, expires_at, revoked_at, open_count, latest_opened_at, location_visibility",
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

// Memoized per request (React.cache) so the workspace lookup runs once even
// though the layout fan-out (collaboration + publication + sheets summaries) and
// the page each resolve it — previously 3× per render. Two plans landed this same
// fix (Estimates-List F6 / P1-1 and Library Optimization P1 T6). The auto-provision
// write is idempotent within a request (cache() runs the body once). Mirrors the
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

export const listCurrentWorkspaceProjects = cache(async () => {
  const rpcResult = await listCurrentWorkspaceProjectsRpcPath();
  if (rpcResult) return rpcResult;
  return listCurrentWorkspaceProjectsAppPath();
});

export const listCurrentWorkspaceProjectClientNames = cache(async () => {
  const { workspace } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("projects")
    .select("client_name")
    .eq("workspace_id", workspace.id)
    .not("client_name", "is", null)
    .order("client_name", { ascending: true });

  if (error) throw error;

  const clientNames = new Map<string, string>();
  for (const project of data ?? []) {
    const label = project.client_name?.trim();
    const key = label?.toLowerCase().replace(/\s+/g, " ");
    if (!label || !key || clientNames.has(key)) continue;
    clientNames.set(key, label);
  }

  return Array.from(clientNames.values());
});

async function listCurrentWorkspaceProjectsAppPath() {
  const { workspace, profile } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();

  const [
    projectsResult,
    favoritesResult,
    estimateFavoritesResult,
    projectMembersResult,
    sheetMembersResult,
    workspaceMembershipResult,
    projectGroupsResult,
    projectGroupMembershipsResult,
  ] = await traced("projects.wave1.batch", () => Promise.all([
    supabase
      .from("projects")
      // Explicit columns (not select('*')): workspace_id + created_by are read ONLY by the
      // server-side access resolver below and are stripped from the client payload via
      // toClientProjectRow before serialization, so they never ship in the RSC Flight stream.
      .select(WORKSHOP_PROJECT_LIST_COLUMNS)
      .eq("workspace_id", workspace.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("project_favorites")
      .select("project_id")
      .eq("workspace_id", workspace.id)
      .eq("user_id", profile.id),
    supabase
      .from("estimate_favorites")
      .select("estimate_id, project_id, created_at")
      .eq("workspace_id", workspace.id)
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false }),
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
    supabase
      .from("project_groups")
      .select("id, name, accent_id, position")
      .eq("workspace_id", workspace.id)
      .eq("user_id", profile.id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("project_group_memberships")
      .select("project_id, group_id")
      .eq("workspace_id", workspace.id)
      .eq("user_id", profile.id),
  ]));

  if (projectsResult.error) throw projectsResult.error;
  if (favoritesResult.error) throw favoritesResult.error;
  if (estimateFavoritesResult.error) throw estimateFavoritesResult.error;
  if (projectMembersResult.error && !isMissingOptionalCollaborationTable(projectMembersResult.error)) throw projectMembersResult.error;
  if (sheetMembersResult.error && !isMissingOptionalCollaborationTable(sheetMembersResult.error)) throw sheetMembersResult.error;
  if (workspaceMembershipResult.error) throw workspaceMembershipResult.error;
  // Project groups + memberships are a first-class per-user layer (cloned from favorites),
  // NOT optional collaboration tables — throw unconditionally on error (contracts §3.2).
  if (projectGroupsResult.error) throw projectGroupsResult.error;
  if (projectGroupMembershipsResult.error) throw projectGroupMembershipsResult.error;

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

  const favoriteEstimateRows = estimateFavoritesResult.data ?? [];
  const favoriteEstimateIds = favoriteEstimateRows.map((favorite) => favorite.estimate_id);
  const favoriteEstimateCreatedAtById = new Map(
    favoriteEstimateRows.map((favorite) => [favorite.estimate_id, favorite.created_at]),
  );

  // Wave 2: shared-project hydration and favorite-estimate hydration each depend only
  // on the parallel wave-1 results (sharedProjectIds / favoriteEstimateIds) and are
  // independent of each other, so issue them concurrently instead of serially. Empty
  // inputs skip the round-trip entirely (null query → null response).
  const sharedProjectsQuery =
    sharedProjectIds.length > 0
      ? supabase
          .from("projects")
          .select(WORKSHOP_PROJECT_LIST_COLUMNS)
          .in("id", sharedProjectIds)
          .order("updated_at", { ascending: false })
      : null;
  const favoriteEstimatesQuery =
    favoriteEstimateIds.length > 0
      ? supabase
          .from("estimates")
          .select("id, project_id, name, sheet_code, updated_at")
          .in("id", favoriteEstimateIds)
      : null;
  const [sharedProjectsResponse, favoriteEstimatesResponse] = await traced(
    "projects.wave2.shared+favorites",
    () =>
      Promise.all([
        sharedProjectsQuery,
        favoriteEstimatesQuery,
      ]),
  );

  if (sharedProjectsResponse?.error) throw sharedProjectsResponse.error;
  const sharedProjects: Tables<"projects">[] = sharedProjectsResponse?.data ?? [];

  let favoriteEstimateSheetsByProjectId = new Map<string, ProjectFavoriteEstimateSheetSummary[]>();

  if (favoriteEstimateIds.length > 0) {
    if (favoriteEstimatesResponse?.error) throw favoriteEstimatesResponse.error;

    const favoriteEstimateById = new Map(
      (favoriteEstimatesResponse?.data ?? []).map((estimate) => [estimate.id, estimate]),
    );
    favoriteEstimateSheetsByProjectId = favoriteEstimateRows.reduce((byProject, favorite) => {
      const estimate = favoriteEstimateById.get(favorite.estimate_id);
      if (!estimate) return byProject;
      const sheets = byProject.get(favorite.project_id) ?? [];
      if (sheets.length >= 5) return byProject;
      sheets.push({
        ...estimate,
        favoriteCreatedAt: favoriteEstimateCreatedAtById.get(estimate.id) ?? favorite.created_at,
      });
      byProject.set(favorite.project_id, sheets);
      return byProject;
    }, new Map<string, ProjectFavoriteEstimateSheetSummary[]>());
  }

  const resolveProjectAccess = createWorkshopProjectAccessResolver({
    profileId: profile.id,
    projectMembers,
    sheetMembers,
    workspace,
    workspaceRole,
  });

  // Part 7c (Project Groups): ordered (position, then created_at) camelCase summaries for the
  // client, plus a per-project membership lookup. Both reads are scoped per-user (.eq user_id),
  // so the map only ever holds THIS user's group rows — a miss resolves to null (Ungrouped).
  const projectGroups: ProjectGroupSummary[] = (projectGroupsResult.data ?? []).map((group) => ({
    id: group.id,
    name: group.name,
    accentId: group.accent_id,
    position: group.position,
  }));
  const groupIdByProjectId = new Map<string, string>(
    (projectGroupMembershipsResult.data ?? []).map((membership) => [
      membership.project_id,
      membership.group_id,
    ]),
  );

  function createProjectListItem(project: Tables<"projects">): WorkshopProjectListItem {
    // Resolve access off the FULL row (needs workspace_id/created_by), then ship the trimmed
    // client row so the two server-only columns never enter the serialized payload.
    const access = resolveProjectAccess(project);
    return {
      project: toClientProjectRow(project),
      ...access,
      pendingInviteCount: 0,
      publicationSummary: null,
      favoriteEstimateSheets: favoriteEstimateSheetsByProjectId.get(project.id) ?? [],
      groupId: groupIdByProjectId.get(project.id) ?? null,
    };
  }

  const projectItems: WorkshopProjectListItem[] = [
    ...ownedProjects.map(createProjectListItem),
    ...sharedProjects.map((project) => {
      return createProjectListItem(project);
    }),
  ];
  // Wave 3: publication summaries and pending-invite visibility both depend only on the
  // assembled projectItems and are independent of each other, so fetch them concurrently
  // rather than waiting for publications before starting the invite-visibility read.
  const [publicationRows, pendingInviteVisibility] = await traced(
    "projects.wave3.publications+invites",
    () =>
      Promise.all([
        readOptionalProjectPublications(
          supabase,
          Array.from(new Set(projectItems.map((item) => item.project.id))),
        ),
        readPendingCollaborationVisibilitySummary({
          email: profile.email,
          projectIds: filterMapBy(
            projectItems,
            (item) => canManageCollaborationRole(item.currentUserRole),
            (item) => item.project.id,
          ),
          supabase,
        }),
      ]),
  );
  const publicationByProjectId = new Map<string, ProjectPublicationListRow>();
  for (const publication of publicationRows) {
    if (!publicationByProjectId.has(publication.project_id)) {
      publicationByProjectId.set(publication.project_id, publication);
    }
  }
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
        favoriteEstimateSheets: favoriteEstimateSheetsByProjectId.get(item.project.id) ?? item.favoriteEstimateSheets,
      })),
      ...pendingInviteItemsByProjectId.values(),
    ],
    favoriteProjectIds: (favoritesResult.data ?? []).map((favorite) => favorite.project_id),
    projectGroups,
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

function sortByUpdatedAtDescThenIdDesc<T extends { id: string; updated_at: string | null }>(records: T[]) {
  return [...records].sort((left, right) => {
    const updatedAtCompare = (right.updated_at ?? "").localeCompare(left.updated_at ?? "");
    if (updatedAtCompare !== 0) return updatedAtCompare;
    return right.id.localeCompare(left.id);
  });
}

export async function getWorkshopHomebaseData(): Promise<WorkshopHomebaseData> {
  if (process.env.WORKSHOP_HOMEBASE_SUMMARY_RPC_ENABLED === "1") {
    const rpcHomebase = await getWorkshopHomebaseDataRpcPath();
    if (rpcHomebase) return rpcHomebase;
  }
  return getWorkshopHomebaseDataAppPath();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isWorkspaceHomebaseSummaryRolloutError(error: unknown): boolean {
  if (!isRecord(error)) return false;
  const code = typeof error.code === "string" ? error.code : "";
  const message = typeof error.message === "string" ? error.message.toLowerCase() : "";
  return (
    code === "PGRST202" ||
    code === "42883" ||
    message.includes("schema cache") ||
    message.includes("could not find the function")
  );
}

function assertRpcString(value: unknown, path: string): string {
  if (typeof value !== "string") {
    throw new Error(`workspace summary RPC invalid shape: ${path} must be a string`);
  }
  return value;
}

function assertRpcOptionalString(value: unknown, path: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new Error(`workspace summary RPC invalid shape: ${path} must be a string or null`);
  }
  return value;
}

function assertRpcNumber(value: unknown, path: string): number {
  if (typeof value !== "number") {
    throw new Error(`workspace summary RPC invalid shape: ${path} must be a number`);
  }
  return value;
}

function assertRpcOptionalNumber(value: unknown, path: string): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number") {
    throw new Error(`workspace summary RPC invalid shape: ${path} must be a number or null`);
  }
  return value;
}

function assertRpcBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`workspace summary RPC invalid shape: ${path} must be a boolean`);
  }
  return value;
}

function assertRpcJson(value: unknown, path: string): Json {
  if (value === undefined) {
    throw new Error(`workspace summary RPC invalid shape: ${path} must be JSON`);
  }
  return value as Json;
}

function assertEstimateNodeKind(value: unknown, path: string): WorkshopEstimateNodeRecord["kind"] {
  const kind = assertRpcString(value, path);
  if (!WORKSHOP_ESTIMATE_NODE_KINDS.has(kind)) {
    throw new Error(`workspace summary RPC invalid shape: ${path} must be a known estimate node kind`);
  }
  return kind as WorkshopEstimateNodeRecord["kind"];
}

function assertProjectFavoriteRef(value: Record<string, unknown>, path: string): WorkshopHomebaseFavoriteProjectRef {
  return {
    project_id: assertRpcString(value.project_id, `${path}.project_id`),
    created_at: assertRpcString(value.created_at, `${path}.created_at`),
  };
}

function assertProjectFavoriteProjectRef(value: Record<string, unknown>, path: string): WorkshopProjectFavoriteRef {
  return {
    project_id: assertRpcString(value.project_id, `${path}.project_id`),
  };
}

function assertEstimateFavoriteRef(value: Record<string, unknown>, path: string): WorkshopHomebaseFavoriteEstimateRef {
  return {
    estimate_id: assertRpcString(value.estimate_id, `${path}.estimate_id`),
    project_id: assertRpcString(value.project_id, `${path}.project_id`),
    created_at: assertRpcString(value.created_at, `${path}.created_at`),
  };
}

function assertProjectListRecord(value: Record<string, unknown>, path: string): Tables<"projects"> {
  return {
    id: assertRpcString(value.id, `${path}.id`),
    workspace_id: assertRpcString(value.workspace_id, `${path}.workspace_id`),
    created_by: assertRpcOptionalString(value.created_by, `${path}.created_by`),
    name: assertRpcString(value.name, `${path}.name`),
    client_name: assertRpcOptionalString(value.client_name, `${path}.client_name`),
    location: assertRpcOptionalString(value.location, `${path}.location`),
    project_code: assertRpcOptionalString(value.project_code, `${path}.project_code`),
    currency_code: assertRpcString(value.currency_code, `${path}.currency_code`),
    metadata: assertRpcJson(value.metadata, `${path}.metadata`),
    created_at: assertRpcString(value.created_at, `${path}.created_at`),
    updated_at: assertRpcString(value.updated_at, `${path}.updated_at`),
  };
}

function assertWorkspaceRecord(value: Record<string, unknown>, path: string): Tables<"workspaces"> {
  return {
    id: assertRpcString(value.id, `${path}.id`),
    created_by: assertRpcOptionalString(value.created_by, `${path}.created_by`),
    name: assertRpcString(value.name, `${path}.name`),
    slug: assertRpcOptionalString(value.slug, `${path}.slug`),
    created_at: assertRpcString(value.created_at, `${path}.created_at`),
    updated_at: assertRpcString(value.updated_at, `${path}.updated_at`),
  };
}

function assertProjectRecord(value: Record<string, unknown>, path: string): WorkshopProjectRecord {
  return {
    id: assertRpcString(value.id, `${path}.id`),
    name: assertRpcString(value.name, `${path}.name`),
    client_name: assertRpcOptionalString(value.client_name, `${path}.client_name`),
    project_code: assertRpcOptionalString(value.project_code, `${path}.project_code`),
    location: assertRpcOptionalString(value.location, `${path}.location`),
    updated_at: assertRpcString(value.updated_at, `${path}.updated_at`),
    workspace_id: assertRpcString(value.workspace_id, `${path}.workspace_id`),
    created_by: assertRpcOptionalString(value.created_by, `${path}.created_by`),
  };
}

function assertProjectMemberRow(value: Record<string, unknown>, path: string): ProjectMemberRow {
  return {
    project_id: assertRpcString(value.project_id, `${path}.project_id`),
    workspace_id: assertRpcString(value.workspace_id, `${path}.workspace_id`),
    role: normalizeCollaborationRole(assertRpcOptionalString(value.role, `${path}.role`)),
    user_id: assertRpcString(value.user_id, `${path}.user_id`),
  };
}

function assertEstimateSheetMemberRow(value: Record<string, unknown>, path: string): EstimateSheetMemberRow {
  return {
    estimate_id: assertRpcString(value.estimate_id, `${path}.estimate_id`),
    project_id: assertRpcString(value.project_id, `${path}.project_id`),
    role: normalizeCollaborationRole(assertRpcOptionalString(value.role, `${path}.role`)),
    user_id: assertRpcString(value.user_id, `${path}.user_id`),
  };
}

function assertWorkspaceMembershipRoleRow(value: Record<string, unknown>, path: string): WorkspaceMembershipRoleRow {
  const role = assertRpcString(value.role, `${path}.role`);
  return { role: role as Tables<"workspace_members">["role"] };
}

function assertProjectGroupSummary(value: Record<string, unknown>, path: string): ProjectGroupSummary {
  return {
    id: assertRpcString(value.id, `${path}.id`),
    name: assertRpcString(value.name, `${path}.name`),
    accentId: assertRpcOptionalString(value.accent_id, `${path}.accent_id`),
    position: assertRpcNumber(value.position, `${path}.position`),
  };
}

function assertProjectGroupMembershipRow(value: Record<string, unknown>, path: string): ProjectGroupMembershipRow {
  return {
    project_id: assertRpcString(value.project_id, `${path}.project_id`),
    group_id: assertRpcString(value.group_id, `${path}.group_id`),
  };
}

function assertProjectPublicationListRow(value: Record<string, unknown>, path: string): ProjectPublicationListRow {
  return {
    encrypted_token: assertRpcString(value.encrypted_token, `${path}.encrypted_token`),
    expires_at: assertRpcOptionalString(value.expires_at, `${path}.expires_at`),
    id: assertRpcString(value.id, `${path}.id`),
    latest_opened_at: assertRpcOptionalString(value.latest_opened_at, `${path}.latest_opened_at`),
    location_visibility: assertRpcOptionalString(value.location_visibility, `${path}.location_visibility`) as ProjectPublicationListRow["location_visibility"],
    open_count: assertRpcNumber(value.open_count, `${path}.open_count`),
    password_hash: assertRpcOptionalString(value.password_hash, `${path}.password_hash`),
    project_id: assertRpcString(value.project_id, `${path}.project_id`),
    published_at: assertRpcString(value.published_at, `${path}.published_at`),
    revoked_at: assertRpcOptionalString(value.revoked_at, `${path}.revoked_at`),
    snapshot_version: assertRpcNumber(value.snapshot_version, `${path}.snapshot_version`),
    status: assertRpcString(value.status, `${path}.status`) as ProjectPublicationListRow["status"],
  };
}

function assertReceivedPendingInvite(value: Record<string, unknown>, path: string): WorkshopPendingInviteSummary {
  const projectId = assertRpcString(value.project_id, `${path}.project_id`);
  return {
    id: assertRpcString(value.invitation_id, `${path}.invitation_id`),
    projectId,
    estimateId: assertRpcOptionalString(value.estimate_id, `${path}.estimate_id`),
    projectName: assertRpcString(value.project_name, `${path}.project_name`),
    projectCode: assertRpcOptionalString(value.project_code, `${path}.project_code`),
    estimateName: assertRpcOptionalString(value.estimate_name, `${path}.estimate_name`),
    role: normalizeCollaborationRole(assertRpcOptionalString(value.role, `${path}.role`)),
    scope: normalizePendingInviteScope(assertRpcOptionalString(value.scope, `${path}.scope`)),
    inviterLabel: assertRpcOptionalString(value.inviter_label, `${path}.inviter_label`),
    state: assertRpcOptionalString(value.state, `${path}.state`) === "expired" ? "expired" : "pending",
    expiresAt: assertRpcOptionalString(value.expires_at, `${path}.expires_at`),
    lastOpenedAt: assertRpcOptionalString(value.last_opened_at, `${path}.last_opened_at`),
  };
}

function assertSentPendingInviteCount(value: Record<string, unknown>, path: string): SentPendingInviteCountRow {
  return {
    project_id: assertRpcString(value.project_id, `${path}.project_id`),
    count: assertRpcNumber(value.count, `${path}.count`),
  };
}

function assertEstimateRecord(value: Record<string, unknown>, path: string): WorkshopEstimateRecord {
  return {
    id: assertRpcString(value.id, `${path}.id`),
    project_id: assertRpcString(value.project_id, `${path}.project_id`),
    name: assertRpcString(value.name, `${path}.name`),
    sheet_code: assertRpcString(value.sheet_code, `${path}.sheet_code`),
    updated_at: assertRpcString(value.updated_at, `${path}.updated_at`),
  };
}

function assertRouteEstimateRecord(value: Record<string, unknown>, path: string): EstimateRecordWithLegacy {
  return {
    id: assertRpcString(value.id, `${path}.id`),
    project_id: assertRpcString(value.project_id, `${path}.project_id`),
    name: assertRpcString(value.name, `${path}.name`),
    sheet_code: assertRpcOptionalString(value.sheet_code, `${path}.sheet_code`),
    notes: assertRpcOptionalString(value.notes, `${path}.notes`),
    project_budget: assertRpcOptionalNumber(value.project_budget, `${path}.project_budget`),
    currency_code: assertRpcString(value.currency_code, `${path}.currency_code`),
    metadata: assertRpcJson(value.metadata, `${path}.metadata`),
    created_by: assertRpcOptionalString(value.created_by, `${path}.created_by`),
    created_at: assertRpcString(value.created_at, `${path}.created_at`),
    updated_at: assertRpcString(value.updated_at, `${path}.updated_at`),
  };
}

function assertEstimateNodeRecord(value: Record<string, unknown>, path: string): WorkshopEstimateNodeRecord {
  return {
    id: assertRpcString(value.id, `${path}.id`),
    estimate_id: assertRpcString(value.estimate_id, `${path}.estimate_id`),
    kind: assertEstimateNodeKind(value.kind, `${path}.kind`),
    parent_id: assertRpcOptionalString(value.parent_id, `${path}.parent_id`),
    sort_order: assertRpcNumber(value.sort_order, `${path}.sort_order`),
  };
}

function readRpcArray<T>(
  payload: Record<string, unknown>,
  key: string,
  guard: (value: Record<string, unknown>, path: string) => T,
  source = "workspace_homebase_summary",
): T[] {
  const value = payload[key];
  const keyName = String(key);
  if (!Array.isArray(value)) throw new Error(`${source} invalid shape: ${keyName} is not an array`);
  return value.map((item, index) => {
    if (!isRecord(item)) throw new Error(`${source} invalid array element: ${keyName}[${index}] is not an object`);
    return guard(item, `${keyName}[${index}]`);
  });
}

function readRpcOptionalObject<T>(
  payload: Record<string, unknown>,
  key: string,
  guard: (value: Record<string, unknown>, path: string) => T,
  source: string,
): T | null {
  const value = payload[key];
  if (value === null || value === undefined) return null;
  if (!isRecord(value)) throw new Error(`${source} invalid shape: ${key} is not an object`);
  return guard(value, key);
}

export function parseWorkshopHomebaseSummaryPayload(value: unknown): WorkshopHomebaseSummaryPayload {
  if (!isRecord(value)) throw new Error("workspace_homebase_summary invalid payload");
  return {
    projectFavorites: readRpcArray(value, "projectFavorites", assertProjectFavoriteRef),
    estimateFavorites: readRpcArray(value, "estimateFavorites", assertEstimateFavoriteRef),
    recentProjects: readRpcArray(value, "recentProjects", assertProjectRecord),
    favoriteProjects: readRpcArray(value, "favoriteProjects", assertProjectRecord),
    estimateProjects: readRpcArray(value, "estimateProjects", assertProjectRecord),
    recentEstimates: readRpcArray(value, "recentEstimates", assertEstimateRecord),
    favoriteEstimates: readRpcArray(value, "favoriteEstimates", assertEstimateRecord),
    estimateNodes: readRpcArray(value, "estimateNodes", assertEstimateNodeRecord),
  };
}

export function parseWorkshopProjectsSummaryPayload(value: unknown): WorkshopProjectsSummaryPayload {
  const source = "workspace_projects_summary";
  if (!isRecord(value)) throw new Error(`${source} invalid payload`);
  return {
    ownedProjects: readRpcArray(value, "ownedProjects", assertProjectListRecord, source),
    sharedProjects: readRpcArray(value, "sharedProjects", assertProjectListRecord, source),
    projectFavorites: readRpcArray(value, "projectFavorites", assertProjectFavoriteProjectRef, source),
    estimateFavorites: readRpcArray(value, "estimateFavorites", assertEstimateFavoriteRef, source),
    favoriteEstimates: readRpcArray(value, "favoriteEstimates", assertEstimateRecord, source),
    projectMembers: readRpcArray(value, "projectMembers", assertProjectMemberRow, source),
    sheetMembers: readRpcArray(value, "sheetMembers", assertEstimateSheetMemberRow, source),
    workspaceMembership: readRpcOptionalObject(value, "workspaceMembership", assertWorkspaceMembershipRoleRow, source),
    projectGroups: readRpcArray(value, "projectGroups", assertProjectGroupSummary, source),
    projectGroupMemberships: readRpcArray(value, "projectGroupMemberships", assertProjectGroupMembershipRow, source),
    publications: readRpcArray(value, "publications", assertProjectPublicationListRow, source),
    receivedPendingInvites: readRpcArray(value, "receivedPendingInvites", assertReceivedPendingInvite, source),
    sentInviteCounts: readRpcArray(value, "sentInviteCounts", assertSentPendingInviteCount, source),
  };
}

function isWorkspaceProjectsSummaryContractError(error: unknown): error is Error {
  if (!(error instanceof Error)) return false;
  return (
    error.message.startsWith("workspace_projects_summary invalid") ||
    error.message.startsWith("workspace summary RPC invalid shape")
  );
}

async function listCurrentWorkspaceProjectsRpcPath() {
  if (process.env.WORKSHOP_PROJECTS_SUMMARY_RPC_DISABLED === "1") return null;
  if (await isDevAdminDatabaseBypassActiveForRequest()) return null;

  const { workspace, profile } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();
  const summaryResult = await traced("projects.rpc.workspace_projects_summary", () =>
    (supabase as unknown as {
      rpc: (
        functionName: "workspace_projects_summary",
        args: { target_workspace_id: string },
      ) => Promise<WorkshopProjectsSummaryRpcResult>;
    }).rpc("workspace_projects_summary", {
      target_workspace_id: workspace.id,
    }),
  );

  if (summaryResult.error) {
    if (isWorkspaceHomebaseSummaryRolloutError(summaryResult.error)) {
      const code = isRecord(summaryResult.error) && typeof summaryResult.error.code === "string" ? summaryResult.error.code : "unknown";
      const message = isRecord(summaryResult.error) && typeof summaryResult.error.message === "string" ? summaryResult.error.message : "unknown";
      const details = isRecord(summaryResult.error) && typeof summaryResult.error.details === "string" ? summaryResult.error.details : null;
      console.warn(`[workspace_projects_summary] RPC unavailable (code=${code}, message=${message}, details=${details}); using app path`);
      return null;
    }
    throw summaryResult.error;
  }

  try {
    const payload = parseWorkshopProjectsSummaryPayload(summaryResult.data);
    const projectMembers = payload.projectMembers;
    const sheetMembers = payload.sheetMembers;
    const workspaceRole = payload.workspaceMembership?.role
      ? mapWorkspaceRoleToCollaborationRole(payload.workspaceMembership.role)
      : null;
    const resolveProjectAccess = createWorkshopProjectAccessResolver({
      profileId: profile.id,
      projectMembers,
      sheetMembers,
      workspace,
      workspaceRole,
    });

    const favoriteEstimateById = new Map(payload.favoriteEstimates.map((estimate) => [estimate.id, estimate]));
    const favoriteEstimateSheetsByProjectId = payload.estimateFavorites.reduce((byProject, favorite) => {
      const estimate = favoriteEstimateById.get(favorite.estimate_id);
      if (!estimate) return byProject;
      const sheets = byProject.get(favorite.project_id) ?? [];
      if (sheets.length >= 5) return byProject;
      sheets.push({
        ...estimate,
        favoriteCreatedAt: favorite.created_at,
      });
      byProject.set(favorite.project_id, sheets);
      return byProject;
    }, new Map<string, ProjectFavoriteEstimateSheetSummary[]>());

    const groupIdByProjectId = new Map<string, string>(
      payload.projectGroupMemberships.map((membership) => [
        membership.project_id,
        membership.group_id,
      ]),
    );
    const publicationByProjectId = new Map<string, ProjectPublicationListRow>();
    for (const publication of payload.publications) {
      if (!publicationByProjectId.has(publication.project_id)) {
        publicationByProjectId.set(publication.project_id, publication);
      }
    }
    const sentPendingInviteCountByProjectId = new Map<string, number>(
      payload.sentInviteCounts.map((row) => [row.project_id, row.count]),
    );

    function createProjectListItem(project: Tables<"projects">): WorkshopProjectListItem {
      const access = resolveProjectAccess(project);
      return {
        project: toClientProjectRow(project),
        ...access,
        pendingInvite: null,
        pendingInviteCount: canManageCollaborationRole(access.currentUserRole)
          ? sentPendingInviteCountByProjectId.get(project.id) ?? 0
          : 0,
        publicationSummary: readProjectPublicationListSummary(publicationByProjectId.get(project.id) ?? null),
        favoriteEstimateSheets: favoriteEstimateSheetsByProjectId.get(project.id) ?? [],
        groupId: groupIdByProjectId.get(project.id) ?? null,
      };
    }

    const projectItems: WorkshopProjectListItem[] = [
      ...payload.ownedProjects.map(createProjectListItem),
      ...payload.sharedProjects.map(createProjectListItem),
    ];
    const acceptedProjectIds = new Set(projectItems.map((item) => item.project.id));
    const pendingInviteItemsByProjectId = new Map<string, WorkshopProjectListItem>();
    for (const invite of payload.receivedPendingInvites) {
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
        ...projectItems,
        ...pendingInviteItemsByProjectId.values(),
      ],
      favoriteProjectIds: payload.projectFavorites.map((favorite) => favorite.project_id),
      projectGroups: payload.projectGroups,
    };
  } catch (error) {
    if (!isWorkspaceProjectsSummaryContractError(error)) throw error;
    console.warn(`[workspace_projects_summary] RPC returned an incompatible payload (${error.message}); using app path`);
    return null;
  }
}

async function getWorkshopHomebaseDataRpcPath(): Promise<WorkshopHomebaseData | null> {
  const { workspace, profile } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();

  const [
    summaryResult,
    projectMembersResult,
    sheetMembersResult,
    workspaceMembershipResult,
  ] = await Promise.all([
    traced("homebase.rpc.workspace_homebase_summary", () =>
      supabase.rpc("workspace_homebase_summary", {
        target_workspace_id: workspace.id,
        recent_limit: WORKSHOP_HOMEBASE_ITEM_LIMIT,
      }) as unknown as Promise<WorkshopHomebaseSummaryRpcResult>,
    ),
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

  if (summaryResult.error) {
    if (isWorkspaceHomebaseSummaryRolloutError(summaryResult.error)) {
      const code = isRecord(summaryResult.error) && typeof summaryResult.error.code === "string" ? summaryResult.error.code : "unknown";
      const message = isRecord(summaryResult.error) && typeof summaryResult.error.message === "string" ? summaryResult.error.message : "unknown";
      const details = isRecord(summaryResult.error) && typeof summaryResult.error.details === "string" ? summaryResult.error.details : null;
      console.warn(`[workspace_homebase_summary] RPC unavailable (code=${code}, message=${message}, details=${details}); using app path`);
      return null;
    }
    throw summaryResult.error;
  }

  if (projectMembersResult.error && !isMissingOptionalCollaborationTable(projectMembersResult.error)) throw projectMembersResult.error;
  if (sheetMembersResult.error && !isMissingOptionalCollaborationTable(sheetMembersResult.error)) throw sheetMembersResult.error;
  if (workspaceMembershipResult.error) throw workspaceMembershipResult.error;

  const payload = parseWorkshopHomebaseSummaryPayload(summaryResult.data);
  const projectFavoriteCreatedAt = new Map(payload.projectFavorites.map((favorite) => [favorite.project_id, favorite.created_at]));
  const estimateFavoriteCreatedAt = new Map(payload.estimateFavorites.map((favorite) => [favorite.estimate_id, favorite.created_at]));
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

  const recentProjects = sortByUpdatedAtDescThenIdDesc(payload.recentProjects);
  const favoriteProjects = sortByFavoriteCreatedAt(payload.favoriteProjects, projectFavoriteCreatedAt);
  const projects = mergeHomebaseRecords(recentProjects, favoriteProjects);
  for (const project of payload.estimateProjects) {
    if (!projects.some((existingProject) => existingProject.id === project.id)) projects.push(project);
  }
  const estimates = mergeHomebaseRecords(
    sortByUpdatedAtDescThenIdDesc(payload.recentEstimates),
    sortByFavoriteCreatedAt(payload.favoriteEstimates, estimateFavoriteCreatedAt),
  );
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const visibleFavoriteProjectIds = new Set(filterMapBy(projects, (project) => projectFavoriteCreatedAt.has(project.id), (project) => project.id));
  const removedProjectFavorites = filterMapBy(
    Array.from(projectFavoriteCreatedAt.keys()),
    (projectId) => !visibleFavoriteProjectIds.has(projectId),
    (projectId) => ({
      id: projectId,
      name: null,
      projectCode: null,
      favoriteCreatedAt: projectFavoriteCreatedAt.get(projectId) ?? null,
    }),
  );
  const allProjectIds = Array.from(new Set(projects.map((project) => project.id)));
  const manageableProjectIds = filterMapBy(
    projects,
    (project) => canManageCollaborationRole(resolveProjectAccess(project).currentUserRole),
    (project) => project.id,
  );

  const [homebasePublicationRows, pendingInviteVisibility] = await traced("homebase.rpc.tail", () => Promise.all([
    readOptionalProjectPublications(supabase, allProjectIds),
    readPendingCollaborationVisibilitySummary({
      email: profile.email,
      projectIds: manageableProjectIds,
      supabase,
    }),
  ]));

  const homebasePublicationByProjectId = new Map<string, ProjectPublicationListRow>();
  for (const publication of homebasePublicationRows) {
    if (!homebasePublicationByProjectId.has(publication.project_id)) {
      homebasePublicationByProjectId.set(publication.project_id, publication);
    }
  }
  const firstNodeByEstimateId = selectFirstEstimateNodeIds(payload.estimateNodes);

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
        canManagePublication:
          profile.role === "ceo" || profile.role === "admin" || canManageCollaborationRole(access.currentUserRole),
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

async function getWorkshopHomebaseDataAppPath(): Promise<WorkshopHomebaseData> {
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

  const recentProjects = (recentProjectsResult.data ?? []) as WorkshopProjectRecord[];
  const recentProjectIds = recentProjects.map((project) => project.id);
  const recentEstimateProjectIds = Array.from(new Set([...recentProjectIds, ...favoriteProjectIds]));
  const limitedFavoriteEstimateIds = favoriteEstimateIds.slice(0, WORKSHOP_HOMEBASE_FAVORITE_ESTIMATE_LIMIT);
  const emptyEstimateQueryResult: WorkshopEstimateQueryResult = { data: [], error: null };
  const recentEstimatesPromise: Promise<WorkshopEstimateQueryResult> =
    recentEstimateProjectIds.length > 0
      ? (supabase
          .from("estimates")
          .select("id, project_id, name, sheet_code, updated_at")
          .in("project_id", recentEstimateProjectIds)
          .order("updated_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(WORKSHOP_HOMEBASE_ITEM_LIMIT) as unknown as Promise<WorkshopEstimateQueryResult>)
      : Promise.resolve(emptyEstimateQueryResult);
  const favoriteEstimatesPromise: Promise<WorkshopEstimateQueryResult> =
    limitedFavoriteEstimateIds.length > 0
      ? (supabase
          .from("estimates")
          .select("id, project_id, name, sheet_code, updated_at")
          .in("id", limitedFavoriteEstimateIds) as unknown as Promise<WorkshopEstimateQueryResult>)
      : Promise.resolve(emptyEstimateQueryResult);

  const [recentEstimatesResult, favoriteEstimatesResult] = await traced("homebase.H3H4.estimates", () =>
    Promise.all([recentEstimatesPromise, favoriteEstimatesPromise]),
  );

  if (recentEstimatesResult.error) throw recentEstimatesResult.error;
  if (favoriteEstimatesResult.error) throw favoriteEstimatesResult.error;

  const recentEstimates = sortByUpdatedAtDescThenIdDesc((recentEstimatesResult.data ?? []) as WorkshopEstimateRecord[]);
  const favoriteEstimates = sortByFavoriteCreatedAt(
    (favoriteEstimatesResult.data ?? []) as WorkshopEstimateRecord[],
    estimateFavoriteCreatedAt,
  );
  const estimates = mergeHomebaseRecords(recentEstimates, favoriteEstimates);
  const estimateProjectIds = Array.from(new Set(estimates.map((estimate) => estimate.project_id)));
  const initialKnownProjectIds = new Set(recentProjectIds);
  const missingProjectIds = estimateProjectIds.filter((projectId) => !initialKnownProjectIds.has(projectId));
  const backfillProjectIds = Array.from(new Set([...favoriteProjectIds, ...missingProjectIds]));

  let backfillProjects: WorkshopProjectRecord[] = [];
  if (backfillProjectIds.length > 0) {
    const { data, error } = await traced("homebase.H2H5.projects", () =>
      supabase
        .from("projects")
        .select("id, name, client_name, project_code, location, updated_at, workspace_id, created_by")
        .in("id", backfillProjectIds) as unknown as Promise<WorkshopProjectQueryResult>,
    );

    if (error) throw error;
    backfillProjects = data ?? [];
  }

  const favoriteProjects = backfillProjects.filter((project) => projectFavoriteCreatedAt.has(project.id));
  const visibleFavoriteProjectIds = new Set(favoriteProjects.map((project) => project.id));
  const removedProjectFavorites = filterMapBy(
    favoriteProjectIds,
    (projectId) => !visibleFavoriteProjectIds.has(projectId),
    (projectId) => ({
      id: projectId,
      name: null,
      projectCode: null,
      favoriteCreatedAt: projectFavoriteCreatedAt.get(projectId) ?? null,
    }),
  );
  const projects = mergeHomebaseRecords(recentProjects, sortByFavoriteCreatedAt(favoriteProjects, projectFavoriteCreatedAt));
  for (const project of backfillProjects) {
    if (!projects.some((existingProject) => existingProject.id === project.id)) projects.push(project);
  }

  const projectById = new Map(projects.map((project) => [project.id, project]));
  const allProjectIds = Array.from(new Set(projects.map((project) => project.id)));
  const manageableProjectIds = filterMapBy(
    projects,
    (project) => canManageCollaborationRole(resolveProjectAccess(project).currentUserRole),
    (project) => project.id,
  );
  const estimateIds = estimates.map((estimate) => estimate.id);
  const estimateNodesPromise: Promise<WorkshopEstimateNodeQueryResult> =
    estimateIds.length > 0
      ? (supabase
          .from("estimate_nodes")
          .select("id, estimate_id, kind, parent_id, sort_order")
          .in("estimate_id", estimateIds)
          .order("sort_order", { ascending: true }) as unknown as Promise<WorkshopEstimateNodeQueryResult>)
      : Promise.resolve({ data: [], error: null });

  const [homebasePublicationRows, pendingInviteVisibility, estimateNodesResult] = await traced("homebase.H6H7H8.tail", () => Promise.all([
    readOptionalProjectPublications(supabase, allProjectIds),
    readPendingCollaborationVisibilitySummary({
      email: profile.email,
      projectIds: manageableProjectIds,
      supabase,
    }),
    estimateNodesPromise,
  ]));
  if (estimateNodesResult.error) throw estimateNodesResult.error;

  const homebasePublicationByProjectId = new Map<string, ProjectPublicationListRow>();
  for (const publication of homebasePublicationRows) {
    if (!homebasePublicationByProjectId.has(publication.project_id)) {
      homebasePublicationByProjectId.set(publication.project_id, publication);
    }
  }
  const firstNodeByEstimateId = selectFirstEstimateNodeIds(estimateNodesResult.data ?? []);

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
        canManagePublication:
          profile.role === "ceo" || profile.role === "admin" || canManageCollaborationRole(access.currentUserRole),
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

export const listMainSidebarFavoriteProjects = cache(async function listMainSidebarFavoriteProjects(): Promise<MainSidebarFavoriteProject[]> {
  const { workspace, profile } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();

  const { data: projectFavorites, error: projectFavoritesError } = await supabase
    .from("project_favorites")
    .select("project_id, created_at")
    .eq("workspace_id", workspace.id)
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(MAIN_SIDEBAR_FAVORITE_PROJECT_LIMIT);

  if (projectFavoritesError) throw projectFavoritesError;

  const favoriteProjectRows = projectFavorites ?? [];
  const favoriteProjectIds = favoriteProjectRows.map((favorite) => favorite.project_id);
  if (favoriteProjectIds.length === 0) return [];

  const [projectsResult, estimateFavoritesResult] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, project_code")
      .in("id", favoriteProjectIds),
    supabase
      .from("estimate_favorites")
      .select("estimate_id, project_id, created_at")
      .eq("workspace_id", workspace.id)
      .eq("user_id", profile.id)
      .in("project_id", favoriteProjectIds)
      .order("created_at", { ascending: false }),
  ]);

  if (projectsResult.error) throw projectsResult.error;
  if (estimateFavoritesResult.error) throw estimateFavoritesResult.error;

  const favoriteEstimateRows = estimateFavoritesResult.data ?? [];
  const favoriteEstimateIds = favoriteEstimateRows.map((favorite) => favorite.estimate_id);
  let estimateById = new Map<string, Pick<Tables<"estimates">, "id" | "project_id" | "name" | "sheet_code">>();

  if (favoriteEstimateIds.length > 0) {
    const { data, error } = await supabase
      .from("estimates")
      .select("id, project_id, name, sheet_code")
      .in("id", favoriteEstimateIds);

    if (error) throw error;
    estimateById = new Map((data ?? []).map((estimate) => [estimate.id, estimate]));
  }

  const sheetsByProjectId = favoriteEstimateRows.reduce((byProject, favorite) => {
    const estimate = estimateById.get(favorite.estimate_id);
    if (!estimate) return byProject;
    const sheets = byProject.get(favorite.project_id) ?? [];
    if (sheets.length >= MAIN_SIDEBAR_FAVORITE_SHEET_LIMIT) return byProject;
    sheets.push({
      href: `/workshop/projects/${estimate.project_id}/estimates/${estimate.id}`,
      id: estimate.id,
      name: estimate.name,
      projectId: estimate.project_id,
      sheetCode: estimate.sheet_code,
      favoriteCreatedAt: favorite.created_at,
    });
    byProject.set(favorite.project_id, sheets);
    return byProject;
  }, new Map<string, MainSidebarFavoriteProject["favoriteEstimateSheets"]>());

  const projectById = new Map((projectsResult.data ?? []).map((project) => [project.id, project]));

  return favoriteProjectRows.flatMap((favorite): MainSidebarFavoriteProject[] => {
    const project = projectById.get(favorite.project_id);
    if (!project) return [];
    return [
      {
        favoriteEstimateSheets: sheetsByProjectId.get(project.id) ?? [],
        href: `/workshop/projects/${project.id}`,
        id: project.id,
        name: project.name,
        projectCode: project.project_code,
        favoriteCreatedAt: favorite.created_at,
      },
    ];
  });
});

export const getCurrentWorkspaceProject = cache(async function getCurrentWorkspaceProject(projectId: string) {
  if (!isUuid(projectId)) {
    const { workspace: defaultWorkspace } = await traced("workspace-project.ensure-default-workspace", () => ensureDefaultWorkspace());
    return { workspace: defaultWorkspace, project: null };
  }

  const supabase = await traced("workspace-project.supabase-client", () => createSupabaseServerClient());

  const { data: project, error } = await traced("workspace-project.project-lookup", async () =>
    supabase
      .from("projects")
      .select("*, workspaces(*)")
      .eq("id", projectId)
      .maybeSingle(),
  );

  if (error) throw error;
  const resolvedProject = project as ProjectWithWorkspace | null;
  if (!resolvedProject) {
    const { workspace: defaultWorkspace } = await traced("workspace-project.ensure-default-workspace", () => ensureDefaultWorkspace());
    return { workspace: defaultWorkspace, project: null };
  }

  const { workspaces: projectWorkspace, ...projectRow } = resolvedProject;
  if (projectWorkspace) return { workspace: projectWorkspace, project: projectRow };

  const { workspace: defaultWorkspace } = await traced("workspace-project.ensure-default-workspace", () => ensureDefaultWorkspace());
  return { workspace: defaultWorkspace, project: projectRow };
});

// Request-scoped dedupe of project_members (Teamspace plan T2.2 / F-P8 / F10).
// The collaboration summary AND the publication summary both read this table in
// the same project-layout render; wrapping in React `cache()` collapses the two
// fetches into one round-trip per request, the same pattern as
// `getCurrentWorkspaceProject`.
const getCachedProjectMembers = cache(async function getCachedProjectMembers(projectId: string) {
  const supabase = await createSupabaseServerClient();
  return readOptionalProjectMembers(supabase, projectId);
});

export async function getProjectCollaborationSummary(projectId: string): Promise<ProjectCollaborationSummary | null> {
  const { profile } = await ensureDefaultWorkspace();
  if (!isUuid(projectId)) return null;

  // T2.2 / F-P8 (supersedes Estimates-List F7 / P1-3): reuse the request-cached
  // project lookup instead of re-fetching `projects` here (and again in the
  // publication summary). One project fetch per render across all three layout fans.
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) return null;

  const supabase = await createSupabaseServerClient();

  // T2.3 / F-P1: workspace_members and estimates are independent of each other —
  // run them in a single parallel wave instead of two serial round-trips.
  const [workspaceMembersResult, estimatesResult] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("workspace_id, user_id, role")
      .eq("workspace_id", project.workspace_id),
    supabase
      .from("estimates")
      .select("id, project_id, name, sheet_code")
      .eq("project_id", project.id)
      .order("sheet_code", { ascending: true }),
  ]);

  if (workspaceMembersResult.error) throw workspaceMembersResult.error;
  if (estimatesResult.error) throw estimatesResult.error;
  const workspaceMembers = workspaceMembersResult.data;
  const estimates = estimatesResult.data;

  const estimateIds = (estimates ?? []).map((estimate) => estimate.id);
  const [projectMembers, sheetMembers, sheetSettings, pendingInvitationRows] = await Promise.all([
    getCachedProjectMembers(project.id),
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
  const sheetMembersByEstimateId = new Map<string, EstimateSheetMemberSummary[]>();
  for (const member of sheetMembers) {
    sheetMemberCountByEstimateId.set(member.estimate_id, (sheetMemberCountByEstimateId.get(member.estimate_id) ?? 0) + 1);
    if (member.user_id === profile.id) {
      currentUserSheetRoleByEstimateId.set(member.estimate_id, member.role);
    }
    const collaboratorProfile = profiles.get(member.user_id);
    const summary: EstimateSheetMemberSummary = {
      id: member.user_id,
      displayName: readProfileDisplayName(collaboratorProfile, member.user_id),
      email: collaboratorProfile?.email ?? null,
      avatarUrl: collaboratorProfile?.avatar_url ?? null,
      role: member.role,
      source: "sheet",
      online: member.user_id === profile.id,
      estimateId: member.estimate_id,
    };
    const existing = sheetMembersByEstimateId.get(member.estimate_id) ?? [];
    existing.push(summary);
    sheetMembersByEstimateId.set(member.estimate_id, existing);
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
      members: sheetMembersByEstimateId.get(estimate.id) ?? [],
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

export const getProjectPublicationSummary = cache(async function getProjectPublicationSummary(
  projectId: string,
): Promise<ProjectPublicationSummary | null> {
  const { workspace, profile } = await ensureDefaultWorkspace();
  if (!isUuid(projectId)) return null;

  // T2.2 / F-P8 (supersedes Estimates-List F7 / P1-3): reuse the request-cached
  // project + project_members reads shared with the collaboration summary.
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) return null;

  const supabase = await createSupabaseServerClient();

  const [workspaceMembershipResult, projectMembers, publication] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", project.workspace_id)
      .eq("user_id", profile.id)
      .maybeSingle(),
    getCachedProjectMembers(project.id),
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
  const canReadPublisherRoster = currentUserRole !== "viewer";
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
    canReadPublisherRoster,
    canManagePublication,
    status: publicationStatus,
    publicationId: publication?.id ?? null,
    clientLinkPath,
    tokenCopyAvailable: Boolean(clientLinkPath),
    publishedAt: publication?.published_at ?? null,
    expiresAt: publication?.expires_at ?? null,
    passwordRequired: Boolean(publication?.password_hash),
    locationVisibility: normalizeProjectPublicationLocationVisibility(publication?.location_visibility),
    selectedEstimateCount: publication?.selected_estimate_ids.length ?? 0,
    selectedEstimateIds: publication?.selected_estimate_ids ?? [],
    snapshotVersion: publication?.snapshot_version ?? 0,
    openCount: publication?.open_count ?? 0,
    latestOpenedAt: publication?.latest_opened_at ?? null,
    latestActivityAt,
    latestRecipientOpen,
    staleSnapshotWarning,
  };
});

// Explicit safe columns for the list query: never ship metadata/created_by to the
// client (over-fetch + data exposure, finding F9 / P2-2). Adding a UI field means
// adding it here so the build fails loudly rather than silently re-exposing data.
const ESTIMATE_LIST_COLUMNS = "id, project_id, name, sheet_code, currency_code, notes, project_budget, created_at, updated_at";

export async function listProjectEstimates(projectId: string): Promise<ProjectEstimatesListResult> {
  const projectContextPromise = getCurrentWorkspaceProject(projectId);
  if (!isUuid(projectId)) {
    const { workspace, project } = await projectContextPromise;
    return {
      workspace,
      project,
      estimates: [],
      ...createEmptyProjectEstimateSummaryMaps(),
    };
  }

  const supabase = await createSupabaseServerClient();
  const estimatesPromise = traced("listProjectEstimates.estimates", async () =>
    supabase
      .from("estimates")
      .select(ESTIMATE_LIST_COLUMNS)
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false }),
  );
  const [
    { workspace, project },
    { data: estimates, error },
  ] = await Promise.all([projectContextPromise, estimatesPromise]);

  if (!project) {
    return {
      workspace,
      project,
      estimates: [],
      ...createEmptyProjectEstimateSummaryMaps(),
    };
  }

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

  // F8 / P2-1 (Path A): one aggregate RPC for node/row counts + total cost
  // (replaces the all-rows JS fold — flat in row count), plus a narrow nodes
  // query kept only for the depth-first/area-first firstNodeId oracle.
  const [summariesResult, nodesResult] = await Promise.all([
    traced("listProjectEstimates.summaries", async () =>
      supabase.rpc("project_estimate_list_summaries", { target_project_id: project.id }),
    ),
    traced("listProjectEstimates.firstNodes", async () =>
      supabase
        .from("estimate_nodes")
        .select("id, estimate_id, kind, parent_id, sort_order")
        .in("estimate_id", estimateIds)
        .order("sort_order", { ascending: true }),
    ),
  ]);

  if (summariesResult.error) throw summariesResult.error;
  if (nodesResult.error) throw nodesResult.error;

  const firstNodeByEstimateId = selectFirstEstimateNodeIds(nodesResult.data ?? []);
  const nodeCountByEstimateId = new Map<string, number>();
  const rowCountByEstimateId = new Map<string, number>();
  const totalCostByEstimateId = new Map<string, number>();
  for (const summary of summariesResult.data ?? []) {
    nodeCountByEstimateId.set(summary.estimate_id, summary.node_count ?? 0);
    rowCountByEstimateId.set(summary.estimate_id, summary.row_count ?? 0);
    totalCostByEstimateId.set(summary.estimate_id, Number(summary.total_cost ?? 0));
  }

  return { workspace, project, estimates: normalizedEstimates, firstNodeByEstimateId, nodeCountByEstimateId, rowCountByEstimateId, totalCostByEstimateId };
}

/**
 * Lightweight list of estimates for a project (id, name, sheetCode, updatedAt).
 * Used by Publisher drawer sheet pickers without loading heavy node/row aggregates.
 * Additive for Shared Link Overhaul V2 (P1).
 */
export async function listProjectEstimateSheets(projectId: string, options: { limit?: number } = {}): Promise<ProjectEstimateSheetSummary[]> {
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) return [];

  return listProjectEstimateSheetsForProject(project.id, options);
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
const ESTIMATE_TREE_NODE_COLUMNS = "id, kind, name, parent_id, sort_order";
const ESTIMATE_TREE_ROW_ITEM_COLUMNS =
  "id, node_id, sort_order, material, description, supplier, supplier_id, unit, unit_cost, quantity, quantity_base, quantity_contingency_amount, contingency_percentage, adjustment_percentage, misc_cost, row_revision, category_node_id, discipline, designation, source_library_item_id, link_state, source_snapshot, metadata, created_at";
const ESTIMATE_TREE_NODE_WITH_ROW_ITEMS_COLUMNS =
  `${ESTIMATE_TREE_NODE_COLUMNS}, estimate_row_items!estimate_row_items_node_id_fkey(${ESTIMATE_TREE_ROW_ITEM_COLUMNS})` as const;

export type EstimateTreeNodeQueryRow = Pick<EstimateNodeRow, "id" | "kind" | "name" | "parent_id" | "sort_order">;
export type EstimateTreeRowItemQueryRow = Pick<
  EstimateRowItemRow,
  | "id"
  | "node_id"
  | "sort_order"
  | "material"
  | "description"
  | "supplier"
  | "supplier_id"
  | "unit"
  | "unit_cost"
  | "quantity"
  | "quantity_base"
  | "quantity_contingency_amount"
  | "contingency_percentage"
  | "adjustment_percentage"
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
type EstimateTreeNodeWithRowItemsQueryRow = EstimateTreeNodeQueryRow & {
  estimate_row_items?: EstimateTreeRowItemQueryRow[] | null;
};

type LiveEstimateTreeResult = {
  workspace: Tables<"workspaces">;
  project: Tables<"projects"> | null;
  estimate: Tables<"estimates"> | null;
  selectedNodeId: string | null;
  tree: EstimateTreeNode[];
  sheetAdjustment?: EstimateSheetAdjustment;
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
type EstimateTabTreePayload = Pick<LiveEstimateTabTreeResult, "estimate" | "selectedNodeId" | "tree" | "sheetAdjustment" | "loadLimitState">;

type LiveEstimateNodeSubtreeResult = LiveEstimateTreeResult & {
  tab: EstimateTabSummary | null;
  payload: EstimateTreeSubtreePayload | null;
};

type EstimateTabRouteContext = LiveEstimateTabTreeResult & {
  selectedNodeId: string | null;
  // U21: the full tab list, resolved in parallel with the tree on the tab-present
  // paths, so the node-route page avoids a second serial getEstimateTabs round-trip.
  tabs?: EstimateTabSummary[];
  // Route-page optimization: the selected-node branch may omit this so first
  // paint is not gated on a UI affordance RPC. The page tail resolves it with
  // the same authoritative helper before enabling edit controls.
  canEditEstimate?: boolean;
};
type EstimateNodeRouteContextRpcPayload = {
  workspace: Tables<"workspaces">;
  project: Tables<"projects">;
  estimate: EstimateRecordWithLegacy;
  sheetAdjustment: EstimateSheetAdjustment;
  selectedNodeId: string;
  selectedTabId: string;
  tabs: EstimateTabSummary[];
  nodes: EstimateTreeNodeQueryRow[];
  rows: EstimateTreeRowItemQueryRow[];
  loadLimitState?: LiveEstimateTreeLoadLimitState;
};
type EstimateRouteProjectContext = {
  workspace: Tables<"workspaces">;
  project: Tables<"projects">;
};
type EstimateRecordWithProject = EstimateRecordWithLegacy & {
  projects?: ProjectWithWorkspace | null;
  estimate_tabs?: EstimateTabQueryRow[] | null;
};
type EstimateNodeRouteRow = {
  id: string;
  estimate_id: string;
  estimate_tab_id?: string | null;
  estimates: EstimateRecordWithProject;
};
type ResolvedProjectEstimateInput = {
  workspace: Tables<"workspaces">;
  project: Tables<"projects">;
  estimate: EstimateRecordWithLegacy;
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

function splitProjectWorkspaceJoin(projectWithWorkspace: ProjectWithWorkspace | null | undefined): EstimateRouteProjectContext | null {
  if (!projectWithWorkspace?.workspaces) return null;
  const { workspaces: workspace, ...project } = projectWithWorkspace;
  return { workspace, project };
}

function stripEstimateProjectJoin(estimate: EstimateRecordWithProject): EstimateRecordWithLegacy {
  const { projects: _project, estimate_tabs: _tabs, ...estimateRow } = estimate;
  return estimateRow;
}

function readEmbeddedEstimateTabs(estimate: EstimateRecordWithProject): EstimateTabSummary[] | null {
  if (!Array.isArray(estimate.estimate_tabs)) return null;
  return [...estimate.estimate_tabs]
    .filter((tab) => tab.archived_at === null)
    .sort((left, right) => left.sort_order - right.sort_order)
    .map(toEstimateTabSummary);
}

function createDefaultEstimateSheetAdjustment(estimateId: string): EstimateSheetAdjustment {
  return {
    estimateId,
    mode: "contingency",
    percentage: 0,
    rowRevision: 0,
    updatedAt: undefined,
    updatedBy: null,
  };
}

function toEstimateSheetAdjustment(row: Tables<"estimate_sheet_adjustments">): EstimateSheetAdjustment {
  return {
    estimateId: row.estimate_id,
    mode: row.mode,
    percentage: Number(row.percentage ?? 0),
    rowRevision: row.row_revision,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

function readRouteEstimateSheetAdjustment(value: unknown, estimateId: string): EstimateSheetAdjustment {
  if (value === null || value === undefined) return createDefaultEstimateSheetAdjustment(estimateId);
  const row = readRouteRpcObject(value, "sheetAdjustment", "estimate_node_route_context");
  const mode = row.mode === "discount" ? "discount" : "contingency";
  return {
    estimateId: assertRpcString(row.estimate_id ?? row.estimateId ?? estimateId, "sheetAdjustment.estimate_id"),
    mode,
    percentage: assertRpcNumber(row.percentage, "sheetAdjustment.percentage"),
    rowRevision: assertRpcNumber(row.row_revision ?? row.rowRevision ?? 0, "sheetAdjustment.row_revision"),
    updatedAt: assertRpcOptionalString(row.updated_at ?? row.updatedAt, "sheetAdjustment.updated_at") ?? undefined,
    updatedBy: assertRpcOptionalString(row.updated_by ?? row.updatedBy, "sheetAdjustment.updated_by"),
  };
}

async function readOptionalEstimateSheetAdjustment(
  supabase: WorkspaceSupabaseClient,
  estimateId: string,
): Promise<EstimateSheetAdjustment> {
  const { data, error } = await supabase
    .from("estimate_sheet_adjustments")
    .select("*")
    .eq("estimate_id", estimateId)
    .maybeSingle();

  if (error) {
    if (isMissingOptionalCollaborationTable(error)) return createDefaultEstimateSheetAdjustment(estimateId);
    throw error;
  }

  return data ? toEstimateSheetAdjustment(data) : createDefaultEstimateSheetAdjustment(estimateId);
}

function toUiRow(row: EstimateTreeRowItemQueryRow): EstimateRowItem {
  const quantity = Number(row.quantity);
  const quantityBase = row.quantity_base === null || row.quantity_base === undefined ? null : Number(row.quantity_base);
  const quantityContingencyAmount = quantityBase === null ? null : Number(row.quantity_contingency_amount ?? 0);
  const itemCost = Number(row.unit_cost);
  const miscCost = Number(row.misc_cost);
  const subTotal = itemCost * quantity;
  const legacyAdjustmentPercentage = quantityBase === null ? Number(row.contingency_percentage ?? 0) : 0;
  const contingencyPercentage = quantityBase === null
    ? 0
    : quantityBase > 0 ? ((quantityContingencyAmount ?? 0) / quantityBase) * 100 : 0;
  const contingencyValue = 0;
  const adjustmentPercentage = Number(row.adjustment_percentage ?? legacyAdjustmentPercentage);
  const adjustmentValue = (subTotal * adjustmentPercentage) / 100;
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
    sortOrder: row.sort_order,
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
    quantityBase,
    quantityContingencyAmount,
    subTotal,
    contingencyPercentage,
    contingencyValue,
    adjustmentPercentage,
    adjustmentValue,
    miscCost,
    totalItemCosts: subTotal + miscCost + contingencyValue + adjustmentValue,
    rowRevision: row.row_revision,
    category,
    categoryNodeId: categoryNodeId ?? undefined,
    discipline: row.discipline ?? undefined,
    designation: row.designation ?? undefined,
    tags,
    imageUrl: normalizeEstimateRowImageUrl(sourceSnapshot.imageUrl) ?? undefined,
    sourceUrl: typeof sourceSnapshot.sourceUrl === "string" ? sourceSnapshot.sourceUrl : undefined,
    sourceLibraryItemId: row.source_library_item_id,
    metadata: readEstimateRowMetadata(row.metadata),
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

function readRouteRpcObject(value: unknown, path: string, source: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${source} invalid shape: ${path} is not an object`);
  return value;
}

function readRouteRpcArray<T>(
  value: unknown,
  path: string,
  source: string,
  guard: (item: Record<string, unknown>, itemPath: string) => T,
): T[] {
  if (!Array.isArray(value)) throw new Error(`${source} invalid shape: ${path} is not an array`);
  return value.map((item, index) => guard(readRouteRpcObject(item, `${path}[${index}]`, source), `${path}[${index}]`));
}

function assertRouteEstimateTabRow(value: Record<string, unknown>, path: string): EstimateTabQueryRow {
  return {
    id: assertRpcString(value.id, `${path}.id`),
    estimate_id: assertRpcString(value.estimate_id, `${path}.estimate_id`),
    name: assertRpcString(value.name, `${path}.name`),
    sort_order: assertRpcNumber(value.sort_order, `${path}.sort_order`),
    is_default: assertRpcBoolean(value.is_default, `${path}.is_default`),
    archived_at: assertRpcOptionalString(value.archived_at, `${path}.archived_at`),
    metadata: assertRpcJson(value.metadata, `${path}.metadata`),
    created_at: assertRpcString(value.created_at, `${path}.created_at`),
    updated_at: assertRpcString(value.updated_at, `${path}.updated_at`),
  };
}

function assertRouteEstimateTreeNodeRow(value: Record<string, unknown>, path: string): EstimateTreeNodeQueryRow {
  return {
    id: assertRpcString(value.id, `${path}.id`),
    kind: assertEstimateNodeKind(value.kind, `${path}.kind`),
    name: assertRpcString(value.name, `${path}.name`),
    parent_id: assertRpcOptionalString(value.parent_id, `${path}.parent_id`),
    sort_order: assertRpcNumber(value.sort_order, `${path}.sort_order`),
  };
}

function assertRouteEstimateRowItemRow(value: Record<string, unknown>, path: string): EstimateTreeRowItemQueryRow {
  return {
    id: assertRpcString(value.id, `${path}.id`),
    node_id: assertRpcString(value.node_id, `${path}.node_id`),
    sort_order: assertRpcNumber(value.sort_order, `${path}.sort_order`),
    material: assertRpcString(value.material, `${path}.material`),
    description: assertRpcString(value.description, `${path}.description`),
    supplier: assertRpcString(value.supplier, `${path}.supplier`),
    supplier_id: assertRpcOptionalString(value.supplier_id, `${path}.supplier_id`),
    unit: assertRpcString(value.unit, `${path}.unit`),
    unit_cost: assertRpcNumber(value.unit_cost, `${path}.unit_cost`),
    quantity: assertRpcNumber(value.quantity, `${path}.quantity`),
    quantity_base: assertRpcOptionalNumber(value.quantity_base, `${path}.quantity_base`),
    quantity_contingency_amount: assertRpcOptionalNumber(value.quantity_contingency_amount, `${path}.quantity_contingency_amount`),
    contingency_percentage: assertRpcNumber(value.contingency_percentage, `${path}.contingency_percentage`),
    adjustment_percentage: assertRpcNumber(value.adjustment_percentage ?? 0, `${path}.adjustment_percentage`),
    misc_cost: assertRpcNumber(value.misc_cost, `${path}.misc_cost`),
    row_revision: assertRpcNumber(value.row_revision, `${path}.row_revision`),
    category_node_id: assertRpcOptionalString(value.category_node_id, `${path}.category_node_id`),
    discipline: assertRpcString(value.discipline, `${path}.discipline`),
    designation: assertRpcString(value.designation, `${path}.designation`),
    source_library_item_id: assertRpcOptionalString(value.source_library_item_id, `${path}.source_library_item_id`),
    link_state: assertRpcString(value.link_state, `${path}.link_state`) as EstimateTreeRowItemQueryRow["link_state"],
    source_snapshot: (value.source_snapshot ?? null) as Json | null,
    metadata: assertRpcJson(value.metadata, `${path}.metadata`),
    created_at: assertRpcString(value.created_at, `${path}.created_at`),
  };
}

function readRouteLoadLimitState(value: unknown): LiveEstimateTreeLoadLimitState | undefined {
  if (value === null || value === undefined) return undefined;
  const payload = readRouteRpcObject(value, "loadLimitState", "estimate_node_route_context");
  return {
    maxNodeCount: assertRpcOptionalNumber(payload.maxNodeCount, "loadLimitState.maxNodeCount"),
    maxRowItemCount: assertRpcOptionalNumber(payload.maxRowItemCount, "loadLimitState.maxRowItemCount"),
    fetchedNodeCount: assertRpcNumber(payload.fetchedNodeCount, "loadLimitState.fetchedNodeCount"),
    fetchedRowItemCount: assertRpcNumber(payload.fetchedRowItemCount, "loadLimitState.fetchedRowItemCount"),
    didExceedNodeLimit: assertRpcBoolean(payload.didExceedNodeLimit, "loadLimitState.didExceedNodeLimit"),
    didExceedRowItemLimit: assertRpcBoolean(payload.didExceedRowItemLimit, "loadLimitState.didExceedRowItemLimit"),
  };
}

export function parseEstimateNodeRouteContextRpcPayload(value: unknown): EstimateNodeRouteContextRpcPayload | null {
  const source = "estimate_node_route_context";
  if (value === null || value === undefined) return null;
  const payload = readRouteRpcObject(value, source, source);
  const selectedTabId = assertRpcOptionalString(payload.selectedTabId, "selectedTabId");
  if (!selectedTabId) return null;
  const estimate = assertRouteEstimateRecord(readRouteRpcObject(payload.estimate, "estimate", source), "estimate");
  return {
    workspace: assertWorkspaceRecord(readRouteRpcObject(payload.workspace, "workspace", source), "workspace"),
    project: assertProjectListRecord(readRouteRpcObject(payload.project, "project", source), "project"),
    estimate,
    sheetAdjustment: readRouteEstimateSheetAdjustment(payload.sheetAdjustment, estimate.id),
    selectedNodeId: assertRpcString(payload.selectedNodeId, "selectedNodeId"),
    selectedTabId,
    tabs: readRouteRpcArray(payload.tabs, "tabs", source, assertRouteEstimateTabRow).map(toEstimateTabSummary),
    nodes: readRouteRpcArray(payload.nodes, "nodes", source, assertRouteEstimateTreeNodeRow),
    rows: readRouteRpcArray(payload.rows, "rows", source, assertRouteEstimateRowItemRow),
    loadLimitState: readRouteLoadLimitState(payload.loadLimitState),
  };
}

function isEstimateNodeRouteContextContractError(error: unknown): error is Error {
  return error instanceof Error && (
    error.message.startsWith("estimate_node_route_context invalid") ||
    error.message.includes("RPC invalid shape")
  );
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
      sortOrder: node.sort_order,
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

function annotateEstimateSubtreeCompleteness(
  nodes: EstimateTreeNode[],
  completeness: EstimateTreeSubtreeCompleteness,
): EstimateTreeNode[] {
  return nodes.map((node) => ({
    ...node,
    childrenLoaded: completeness.childrenLoaded,
    rowItemsLoaded: completeness.rowItemsLoaded,
    children: node.children?.length ? annotateEstimateSubtreeCompleteness(node.children, completeness) : node.children,
  }));
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

  const [nodesResult, rowsResult, sheetAdjustment] = await Promise.all([
    maxNodeCount ? nodesQuery.limit(maxNodeCount + 1) : nodesQuery,
    maxRowItemCount ? rowsQuery.limit(maxRowItemCount + 1) : rowsQuery,
    readOptionalEstimateSheetAdjustment(supabase, estimate.id),
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
  return { workspace, project, estimate: normalizedEstimate, selectedNodeId: tree[0]?.id ?? null, tree, sheetAdjustment, loadLimitState };
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
  options: { allowLegacyFallback?: boolean; maxTabCount?: number } = {},
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
    return await readEstimateTabsForEstimate(supabase, estimate.id, options);
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

async function readEstimateTabsForEstimate(
  supabase: WorkspaceSupabaseClient,
  estimateId: string,
  options: { maxTabCount?: number } = {},
): Promise<EstimateTabSummary[]> {
  const maxTabCount = normalizeTreeLoadLimit(options.maxTabCount);
  const tabsQuery = asEstimateTabsReadClient(supabase)
    .from("estimate_tabs")
    .select("id, estimate_id, name, sort_order, is_default, archived_at, metadata, created_at, updated_at")
    .eq("estimate_id", estimateId)
    .is("archived_at", null)
    .order("sort_order", { ascending: true });
  const { data, error } = maxTabCount
    ? await (tabsQuery as unknown as { limit: (count: number) => Promise<{ data: EstimateTabQueryRow[] | null; error: unknown }> }).limit(maxTabCount + 1)
    : await tabsQuery;

  if (error) throw error;
  return (data ?? []).map(toEstimateTabSummary);
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

  return getEstimateTabTreeForResolvedEstimate(
    supabase,
    { workspace, project, estimate: estimate as EstimateRecordWithLegacy },
    tabId,
    options,
  );
}

function scopeEstimateNodeQuery<TQuery extends { eq: (column: string, value: string) => TQuery }>(
  query: TQuery,
  tabId: string | null,
) {
  return tabId ? query.eq("estimate_tab_id", tabId) : query;
}

export async function getEstimateNodeSubtree(
  projectId: string,
  estimateId: string,
  nodeId: string,
  input: {
    tabId?: string | null;
    requestId: string;
    options?: LiveEstimateTreeLoadOptions;
  },
): Promise<LiveEstimateNodeSubtreeResult> {
  const options = input.options ?? {};
  const { workspace, project } = await getCurrentWorkspaceProject(projectId);
  if (!project) return { workspace, project, estimate: null, tab: null, selectedNodeId: null, tree: [], payload: null };

  const supabase = await createSupabaseServerClient();
  const { data: estimate, error: estimateError } = await supabase
    .from("estimates")
    .select("*")
    .eq("id", estimateId)
    .eq("project_id", project.id)
    .maybeSingle();

  if (estimateError) throw estimateError;
  if (!estimate) return { workspace, project, estimate: null, tab: null, selectedNodeId: null, tree: [], payload: null };

  const normalizedEstimate = normalizeEstimateRecord(estimate as EstimateRecordWithLegacy);
  const requestedTabId = input.tabId ?? null;
  const tabScopedId = requestedTabId && requestedTabId !== LEGACY_MAIN_TAB_ID ? requestedTabId : null;
  let tab: EstimateTabSummary | null = null;

  if (tabScopedId) {
    try {
      const { data: tabRow, error: tabError } = await asEstimateTabsReadClient(supabase)
        .from("estimate_tabs")
        .select("id, estimate_id, name, sort_order, is_default, archived_at, metadata, created_at, updated_at")
        .eq("id", tabScopedId)
        .eq("estimate_id", estimate.id)
        .is("archived_at", null)
        .maybeSingle();
      if (tabError) throw tabError;
      if (!tabRow) return { workspace, project, estimate: normalizedEstimate, tab: null, selectedNodeId: null, tree: [], payload: null };
      tab = toEstimateTabSummary(tabRow);
    } catch (error) {
      if (options.allowLegacyFallback && isEstimateTabsSchemaMissing(error)) {
        tab = syntheticMainTab();
      } else {
        throw error;
      }
    }
  } else if (requestedTabId === LEGACY_MAIN_TAB_ID) {
    tab = syntheticMainTab();
  }

  const rootQuery = scopeEstimateNodeQuery(
    supabase
      .from("estimate_nodes")
      .select(ESTIMATE_TREE_NODE_COLUMNS)
      .eq("estimate_id", estimate.id)
      .eq("id", nodeId),
    tabScopedId,
  );
  const { data: rootNode, error: rootError } = await rootQuery.maybeSingle();
  if (rootError) throw rootError;
  if (!rootNode) return { workspace, project, estimate: normalizedEstimate, tab, selectedNodeId: null, tree: [], payload: null };

  const maxNodeCount = normalizeTreeLoadLimit(options.maxNodeCount);
  const maxRowItemCount = normalizeTreeLoadLimit(options.maxRowItemCount);
  const nodeRows: EstimateTreeNodeQueryRow[] = [rootNode as EstimateTreeNodeQueryRow];
  let frontierIds = [rootNode.id];

  while (frontierIds.length > 0) {
    const remainingNodeBudget = maxNodeCount ? (maxNodeCount + 1) - nodeRows.length : null;
    if (remainingNodeBudget !== null && remainingNodeBudget <= 0) break;

    let childrenQuery = scopeEstimateNodeQuery(
      supabase
        .from("estimate_nodes")
        .select(ESTIMATE_TREE_NODE_COLUMNS)
        .eq("estimate_id", estimate.id)
        .in("parent_id", frontierIds)
        .order("sort_order", { ascending: true }),
      tabScopedId,
    );
    if (remainingNodeBudget !== null) childrenQuery = childrenQuery.limit(remainingNodeBudget);

    const { data: children, error: childrenError } = await childrenQuery;
    if (childrenError) throw childrenError;

    const childRows = (children ?? []) as EstimateTreeNodeQueryRow[];
    if (childRows.length === 0) break;
    nodeRows.push(...childRows);
    frontierIds = childRows.map((node) => node.id);
  }

  const limitedNodes = limitTreeRows(nodeRows, maxNodeCount);
  const nodeIds = limitedNodes.rows.map((node) => node.id);
  let rawRows: EstimateTreeRowItemQueryRow[] = [];

  if (nodeIds.length > 0) {
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
  const completeness: EstimateTreeSubtreeCompleteness = {
    childrenLoaded: !limitedNodes.didExceedLimit,
    rowItemsLoaded: !limitedRows.didExceedLimit,
    didExceedNodeLimit: limitedNodes.didExceedLimit,
    didExceedRowItemLimit: limitedRows.didExceedLimit,
  };
  const subtree = annotateEstimateSubtreeCompleteness(buildEstimateTree(limitedNodes.rows, limitedRows.rows), completeness);
  const payload = buildEstimateTreeSubtreePayload({
    estimateId,
    tabId: requestedTabId,
    rootNodeId: rootNode.id,
    parentNodeId: rootNode.parent_id,
    requestId: input.requestId,
    tree: subtree,
    completeness,
  });

  return {
    workspace,
    project,
    estimate: normalizedEstimate,
    tab,
    selectedNodeId: subtree[0]?.id ?? null,
    tree: subtree,
    payload,
  };
}

async function getEstimateTabTreeForResolvedEstimate(
  supabase: WorkspaceSupabaseClient,
  resolved: ResolvedProjectEstimateInput,
  tabId: string,
  options: LiveEstimateTreeLoadOptions = {},
): Promise<LiveEstimateTabTreeResult> {
  const { workspace, project, estimate } = resolved;

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

    return getEstimateTabTreeForResolvedEstimateTab(supabase, resolved, toEstimateTabSummary(tab), options);
  } catch (error) {
    // Read-only fallback only on the missing-schema signal (the tab lookup or
    // the estimate_tab_id node predicate). Real errors and non-opt-in callers
    // keep throwing — no working path changes (U1-2/U1-3/U1-RO).
    if (options.allowLegacyFallback && isEstimateTabsSchemaMissing(error)) {
      return buildLegacyTabTree(project.id, estimate.id, options);
    }
    throw error;
  }
}

async function getEstimateTabTreeForResolvedEstimateTab(
  supabase: WorkspaceSupabaseClient,
  resolved: ResolvedProjectEstimateInput,
  tab: EstimateTabSummary,
  options: LiveEstimateTreeLoadOptions = {},
): Promise<LiveEstimateTabTreeResult> {
  const result = await getEstimateTabTreeForResolvedTabId(supabase, resolved, tab.id, options);
  return { ...result, tab };
}

async function getEstimateTabTreeForResolvedTabId(
  supabase: WorkspaceSupabaseClient,
  resolved: ResolvedProjectEstimateInput,
  tabId: string,
  options: LiveEstimateTreeLoadOptions = {},
): Promise<Omit<LiveEstimateTabTreeResult, "tab">> {
  const { workspace, project, estimate } = resolved;
  const payload = await readEstimateTabTreePayloadForResolvedTabId(supabase, estimate, tabId, options);
  return {
    workspace,
    project,
    ...payload,
  };
}

async function readEstimateTabTreePayloadForResolvedTabId(
  supabase: WorkspaceSupabaseClient,
  estimate: EstimateRecordWithLegacy,
  tabId: string,
  options: LiveEstimateTreeLoadOptions = {},
): Promise<EstimateTabTreePayload> {
  const maxNodeCount = normalizeTreeLoadLimit(options.maxNodeCount);
  const maxRowItemCount = normalizeTreeLoadLimit(options.maxRowItemCount);
  // Route-page hot path: use PostgREST resource embedding to read tab nodes and
  // their row items in one request. Row order remains scoped to the embedded
  // relation; buildEstimateTree only needs stable per-node row ordering.
  const nodesQuery = supabase
    .from("estimate_nodes")
    .select(ESTIMATE_TREE_NODE_WITH_ROW_ITEMS_COLUMNS)
    .eq("estimate_id", estimate.id)
    .eq("estimate_row_items.estimate_id", estimate.id);
  const tabScopedNodesQuery = (nodesQuery as unknown as { eq: (column: string, value: string) => typeof nodesQuery })
    .eq("estimate_tab_id", tabId)
    .order("sort_order", { ascending: true })
    .order("sort_order", { referencedTable: "estimate_row_items", ascending: true });
  const [nodesResult, sheetAdjustment] = await Promise.all([
    traced("estimate-tab-tree.nodes-with-rows", async () =>
      maxNodeCount ? tabScopedNodesQuery.limit(maxNodeCount + 1) : tabScopedNodesQuery,
    ),
    readOptionalEstimateSheetAdjustment(supabase, estimate.id),
  ]);

  if (nodesResult.error) throw nodesResult.error;

  const rawNodes = (nodesResult.data ?? []) as EstimateTreeNodeWithRowItemsQueryRow[];
  const limitedNodes = limitTreeRows(rawNodes, maxNodeCount);
  const rawRows = limitedNodes.rows.flatMap((node) => node.estimate_row_items ?? []);

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
  const tree = await traced("estimate-tab-tree.build", async () =>
    buildEstimateTree(limitedNodes.rows, limitedRows.rows),
  );
  return {
    estimate: normalizeEstimateRecord(stripEstimateProjectJoin(estimate)),
    selectedNodeId: tree[0]?.id ?? null,
    tree,
    sheetAdjustment,
    loadLimitState,
  };
}

const estimateRouteContextProcessCache = new Map<string, EstimateRouteContextProcessCacheEntry>();

function readEstimateRouteContextProcessCacheTtlMs() {
  const raw = process.env.ESTIMATE_NODE_ROUTE_CONTEXT_PROCESS_CACHE_TTL_MS;
  if (raw === undefined) return ESTIMATE_ROUTE_CONTEXT_PROCESS_CACHE_TTL_MS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.min(parsed, 60_000);
}

function readSupabaseAuthStorageKey() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;
  try {
    return `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
  } catch {
    return null;
  }
}

async function readEstimateRouteContextProcessCacheKey(
  projectId: string,
  routeSegment: string,
  maxNodeCount: number | null,
  maxRowItemCount: number | null,
) {
  const cookieStore = await cookies();
  const authStorageKey = readSupabaseAuthStorageKey();
  const authCookieValues = new Map<string, string>();
  if (authStorageKey) {
    for (const cookie of cookieStore.getAll()) {
      if (cookie.name === authStorageKey || cookie.name.startsWith(`${authStorageKey}.`)) {
        authCookieValues.set(cookie.name, cookie.value);
      }
    }
  }

  const authMaterial = authCookieValues.size > 0
    ? Array.from(authCookieValues.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, value]) => `${name}=${value}`)
        .join(";")
    : getDevAuthBypassCredentialFromRequestParts(await headers(), cookieStore);

  if (!authMaterial) return null;

  const sessionDigest = createHash("sha256").update(authMaterial).digest("base64url");
  return [
    sessionDigest,
    projectId,
    routeSegment,
    maxNodeCount ?? "",
    maxRowItemCount ?? "",
  ].join(":");
}

function cloneEstimateRouteContext(value: EstimateTabRouteContext): EstimateTabRouteContext {
  return structuredClone(value);
}

async function readCachedEstimateRouteContext(cacheKey: string | null) {
  if (!cacheKey) return null;
  const entry = estimateRouteContextProcessCache.get(cacheKey);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    estimateRouteContextProcessCache.delete(cacheKey);
    return null;
  }

  const value = await traced("estimate-route-context.cache-hit", () => entry.value);
  return value ? cloneEstimateRouteContext(value) : null;
}

function writeEstimateRouteContextProcessCache(
  cacheKey: string | null,
  projectId: string,
  value: Promise<EstimateTabRouteContext | null>,
) {
  const ttlMs = readEstimateRouteContextProcessCacheTtlMs();
  if (!cacheKey || ttlMs <= 0) return;
  if (estimateRouteContextProcessCache.size >= ESTIMATE_ROUTE_CONTEXT_PROCESS_CACHE_MAX_ENTRIES) {
    const oldestKey = estimateRouteContextProcessCache.keys().next().value;
    if (oldestKey) estimateRouteContextProcessCache.delete(oldestKey);
  }
  estimateRouteContextProcessCache.set(cacheKey, {
    projectId,
    expiresAt: Date.now() + ttlMs,
    value,
  });
}

export function clearEstimateRouteContextProcessCache(projectId?: string) {
  if (!projectId) {
    estimateRouteContextProcessCache.clear();
    return;
  }
  for (const [cacheKey, entry] of estimateRouteContextProcessCache.entries()) {
    if (entry.projectId === projectId) estimateRouteContextProcessCache.delete(cacheKey);
  }
}

async function loadEstimateNodeRouteContextRpcPath(
  supabase: WorkspaceSupabaseClient,
  projectId: string,
  routeSegment: string,
  options: LiveEstimateTreeLoadOptions,
): Promise<EstimateTabRouteContext | null> {
  if (process.env.ESTIMATE_NODE_ROUTE_CONTEXT_RPC_DISABLED === "1") return null;

  const maxNodeCount = normalizeTreeLoadLimit(options.maxNodeCount);
  const maxRowItemCount = normalizeTreeLoadLimit(options.maxRowItemCount);
  const rpcResult = await traced("estimate-route-context.rpc", () =>
    (supabase as unknown as {
      rpc: (
        functionName: "estimate_node_route_context",
        args: {
          target_project_id: string;
          target_node_id: string;
          max_node_count: number | null;
          max_row_item_count: number | null;
        },
      ) => Promise<EstimateNodeRouteContextRpcResult>;
    }).rpc("estimate_node_route_context", {
      target_project_id: projectId,
      target_node_id: routeSegment,
      max_node_count: maxNodeCount,
      max_row_item_count: maxRowItemCount,
    }),
  );

  if (rpcResult.error) {
    if (isWorkspaceHomebaseSummaryRolloutError(rpcResult.error)) {
      const code = isRecord(rpcResult.error) && typeof rpcResult.error.code === "string" ? rpcResult.error.code : "unknown";
      const message = isRecord(rpcResult.error) && typeof rpcResult.error.message === "string" ? rpcResult.error.message : "unknown";
      console.warn(`[estimate_node_route_context] RPC unavailable (code=${code}, message=${message}); using app path`);
      return null;
    }
    throw rpcResult.error;
  }

  try {
    const payload = parseEstimateNodeRouteContextRpcPayload(rpcResult.data);
    if (!payload) return null;

    const tree = await traced("estimate-route-context.rpc-build", async () =>
      buildEstimateTree(payload.nodes, payload.rows),
    );
    const selectedTab = payload.tabs.find((candidate) => candidate.id === payload.selectedTabId) ?? null;
    return {
      workspace: payload.workspace,
      project: payload.project,
      estimate: normalizeEstimateRecord(payload.estimate),
      sheetAdjustment: payload.sheetAdjustment,
      tab: selectedTab,
      selectedNodeId: selectedTab ? payload.selectedNodeId : null,
      tree: selectedTab ? tree : [],
      tabs: payload.tabs,
      loadLimitState: payload.loadLimitState,
    };
  } catch (error) {
    if (!isEstimateNodeRouteContextContractError(error)) throw error;
    console.warn(`[estimate_node_route_context] RPC returned an incompatible payload (${error.message}); using app path`);
    return null;
  }
}

async function readEstimateNodeRouteContextRpcPath(
  supabase: WorkspaceSupabaseClient,
  projectId: string,
  routeSegment: string,
  options: LiveEstimateTreeLoadOptions,
): Promise<EstimateTabRouteContext | null> {
  if (process.env.ESTIMATE_NODE_ROUTE_CONTEXT_RPC_DISABLED === "1") return null;

  const maxNodeCount = normalizeTreeLoadLimit(options.maxNodeCount);
  const maxRowItemCount = normalizeTreeLoadLimit(options.maxRowItemCount);
  const cacheKey = await readEstimateRouteContextProcessCacheKey(projectId, routeSegment, maxNodeCount, maxRowItemCount);
  const cached = await readCachedEstimateRouteContext(cacheKey);
  if (cached) return cached;

  const loadPromise = loadEstimateNodeRouteContextRpcPath(supabase, projectId, routeSegment, options);
  writeEstimateRouteContextProcessCache(cacheKey, projectId, loadPromise);

  try {
    const routeContext = await loadPromise;
    if (!routeContext) {
      if (cacheKey) estimateRouteContextProcessCache.delete(cacheKey);
      return null;
    }
    return cloneEstimateRouteContext(routeContext);
  } catch (error) {
    if (cacheKey) estimateRouteContextProcessCache.delete(cacheKey);
    throw error;
  }
}

export type LiveEstimateTabTree = { tab: EstimateTabSummary; tree: EstimateTreeNode[] };
export type LiveEstimateTreesForTabsResult = {
  workspace: Tables<"workspaces">;
  project: Tables<"projects"> | null;
  estimate: Tables<"estimates"> | null;
  sheetAdjustment?: EstimateSheetAdjustment;
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
  const [nodesResult, sheetAdjustment] = await Promise.all([
    maxNodeCount ? nodesQuery.limit(maxNodeCount + 1) : nodesQuery,
    readOptionalEstimateSheetAdjustment(supabase, estimate.id),
  ]);
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
    sheetAdjustment,
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
      sheetAdjustment: result.sheetAdjustment,
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
  if (!isUuid(projectId)) {
    const { workspace, project } = await traced("estimate-route-context.project", () =>
      getCurrentWorkspaceProject(projectId),
    );
    return { workspace, project, estimate: null, tab: null, selectedNodeId: null, tree: [] };
  }

  const supabase = await traced("estimate-route-context.supabase-client", () => createSupabaseServerClient());
  const rpcRouteContext = await readEstimateNodeRouteContextRpcPath(supabase, projectId, routeSegment, options);
  if (rpcRouteContext) return rpcRouteContext;

  const selectedNodeResultPromise = traced("estimate-route-context.selected-node", async () =>
    supabase
      .from("estimate_nodes")
      .select("id, estimate_id, estimate_tab_id, estimates!inner(*, projects!inner(*, workspaces(*)), estimate_tabs(id, estimate_id, name, sort_order, is_default, archived_at, metadata, created_at, updated_at))")
      .eq("id", routeSegment)
      .eq("estimates.project_id", projectId)
      .is("estimates.estimate_tabs.archived_at", null)
      .order("sort_order", { referencedTable: "estimates.estimate_tabs", ascending: true })
      .maybeSingle(),
  );
  const selectedTabContextPromise = selectedNodeResultPromise.then(async ({ data: selectedNode, error: selectedNodeError }) => {
    if (selectedNodeError) return { kind: "selected-node-error" as const, error: selectedNodeError };

    const routeNode = selectedNode as unknown as EstimateNodeRouteRow | null;
    const selectedTabId = routeNode?.estimate_tab_id;
    if (!selectedTabId) return { kind: "no-selected-tab" as const, routeNode };
    const projectContext = splitProjectWorkspaceJoin(routeNode.estimates.projects);
    const embeddedTabs = readEmbeddedEstimateTabs(routeNode.estimates);
    const estimate = stripEstimateProjectJoin(routeNode.estimates);

    // P13: the tab-present branch only needs the selected node's estimate/tab ids,
    // so start this second wave while the project authorization lookup is still
    // resolving. The final response below still returns only after project
    // context confirms the request is allowed.
    // P14: the selected-node query embeds project/workspace too, so the dominant
    // node-route path avoids an additional project lookup round-trip.
    const [treePayload, tabs] = await Promise.all([
      traced("estimate-route-context.tab-tree", () =>
        readEstimateTabTreePayloadForResolvedTabId(supabase, estimate, selectedTabId, options),
      ),
      embeddedTabs ?? traced("estimate-route-context.tabs-list", () => readEstimateTabsForEstimate(supabase, routeNode.estimate_id)),
    ]);

    return { kind: "selected-tab" as const, routeNode, selectedTabId, treePayload, tabs, projectContext };
  });
  const selectedTabContext = await selectedTabContextPromise;

  if (selectedTabContext.kind === "selected-node-error") {
    if (isEstimateTabsSchemaMissing(selectedTabContext.error)) {
      const legacyResult = await traced("estimate-route-context.legacy-node-fallback", () =>
        getProjectEstimateTreeByNode(projectId, routeSegment),
      );
      return { ...legacyResult, tab: null };
    }
    throw selectedTabContext.error;
  }

  if (selectedTabContext.kind === "selected-tab") {
    // U21 / Routing Page Optimization P3-T3: resolve the tab tree and tab list in
    // parallel without a duplicate selected-tab lookup. The route node's
    // project-scoped join proves the estimate; the tab list remains the archived
    // / active-tab authority before we expose the tree to the page.
    const { routeNode, selectedTabId, treePayload, tabs, projectContext } = selectedTabContext;
    const { workspace, project } = projectContext ?? await traced("estimate-route-context.project", () =>
      getCurrentWorkspaceProject(projectId),
    );
    if (!project) return { workspace, project, estimate: null, tab: null, selectedNodeId: null, tree: [] };
    const selectedTab = tabs.find((candidate) => candidate.id === selectedTabId) ?? null;
    return {
      workspace,
      project,
      ...treePayload,
      tab: selectedTab,
      selectedNodeId: selectedTab ? routeNode.id : null,
      tree: selectedTab ? treePayload.tree : [],
      tabs,
    };
  }

  const { workspace, project } = await traced("estimate-route-context.project", () =>
    getCurrentWorkspaceProject(projectId),
  );
  if (!project) return { workspace, project, estimate: null, tab: null, selectedNodeId: null, tree: [] };

  try {
    const { data: estimate, error: estimateError } = await traced("estimate-route-context.estimate-lookup", async () =>
      supabase
        .from("estimates")
        .select("*")
        .eq("id", routeSegment)
        .eq("project_id", project.id)
        .maybeSingle(),
    );

    if (estimateError) throw estimateError;
    const resolvedEstimate = estimate as EstimateRecordWithLegacy | null;
    if (!resolvedEstimate) {
      const fallbackResult = await traced("estimate-route-context.estimate-fallback", () =>
        getProjectEstimateTreeByEstimate(projectId, routeSegment, options),
      );
      return { ...fallbackResult, tab: null };
    }

    const tabs = await traced("estimate-route-context.estimate-tabs-list", () =>
      readEstimateTabsForEstimate(supabase, resolvedEstimate.id),
    );
    const defaultTab = tabs.find((candidate) => candidate.isDefault) ?? null;
    if (defaultTab) {
      const result = await traced(
        "estimate-route-context.default-tab-tree",
        () =>
          getEstimateTabTreeForResolvedEstimateTab(
            supabase,
            { workspace, project, estimate: resolvedEstimate },
            defaultTab,
            options,
          ),
      );
      return { ...result, tabs };
    }
  } catch (error) {
    if (!isEstimateTabsSchemaMissing(error)) throw error;
  }

  const defaultResult = await traced("estimate-route-context.default-fallback", () =>
    getProjectEstimateTreeByEstimate(projectId, routeSegment, options),
  );
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
