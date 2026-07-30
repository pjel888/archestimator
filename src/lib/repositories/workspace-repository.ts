import { cache } from "react";
import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";

import { getDevAuthBypassCredentialFromRequestParts, isDevAdminDatabaseBypassRequest } from "@/lib/auth/dev-auth-gate";
import { readFirstAccountWorkspaceMembership } from "@/lib/auth/account-membership";
import {
  canManageProjectEstimateCollaborationRole,
  isPlatformAdminRole,
  projectEstimateCollaborationRoleRank,
  type AppPlatformRole,
} from "@/lib/auth/roles";
import { canAccessEstimateInD1, canAccessWholeProjectInD1, canEditEstimateInD1 } from "@/lib/authz/d1-access";
import type { EstimateSheetAdjustment, EstimateTabSummary, EstimateTreeNode } from "@/lib/estimates/types";
import type { EstimateTreeSubtreePayload } from "@/lib/estimates/estimate-tree-lazy";
import { computeEstimateRowLineTotal } from "@/lib/estimates/estimate-row-total";
import {
  isEstimateTabsSchemaMissing,
  readDefaultEstimateTabD1,
  readEstimateNodeSubtreeD1,
  readEstimateTabsD1,
  readEstimateTabTreeD1,
  readEstimateTabTreePayloadD1,
  readEstimateTreesForTabsD1,
  readLegacyEstimateTreeD1,
  type EstimateTabTree,
  type EstimateTreeLoadLimitState,
  type EstimateTreeLoadOptions,
} from "@/lib/estimates/estimate-tree-read-repository";
import { requireCurrentUserContext, type CurrentUserContext } from "@/lib/auth/session";
import { isUuid } from "@/lib/ids";
import { selectFirstEstimateNodeIds } from "@/lib/estimates/tree-hierarchy";
import { traced } from "@/lib/perf/server-timing";
import { normalizeEstimateRecord, type EstimateRecordWithLegacy } from "@/lib/repositories/estimate-schema-compat";
import {
  listProjectEstimateSheetsForProject,
  type ProjectEstimateSheetSummary as ProjectEstimateSheetPickerSummary,
} from "@/lib/repositories/project-estimate-sheets-repository";
import type {
  CollaborationInvitationSummary,
  CollaborationRole,
  EligibleProjectMemberCandidate,
  EstimateSheetMemberSummary,
  EstimateSheetAccessMode,
  ProjectCollaborationSummary,
  ProjectCollaboratorSummary,
} from "@/lib/collaboration/types";
import { decryptPublicationToken, readPublicationTokenEncryptionSecret } from "@/lib/publication/security";
import { readPublicationRevisionStaleness } from "@/lib/publication/source-revision";
import { normalizeProjectPublicationLocationVisibility } from "@/lib/publication/snapshot";
import type { ProjectPublicationListSummary, ProjectPublicationSummary } from "@/lib/publication/types";
import { getCloudflareD1Database, type D1DatabaseLike, type D1Value } from "@/lib/cloudflare/d1";
import { DEFAULT_PROJECT_STATUS, normalizeProjectStatus, type ProjectStatus } from "@/lib/projects/status";
import type { Json } from "@/lib/types/json";
import {
  installStarterPackForEligibleWorkspace,
  installStarterPackForNewWorkspace,
} from "@/lib/onboarding/starter-pack-actions";
import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";
import { filterMapBy } from "@/lib/util/array";

type WorkspaceMemberRole = "owner" | "admin" | "member" | "viewer";
type ProjectAccessRole = "owner" | "admin" | "editor" | "viewer";
type EstimateNodeKind = "assembly" | "lot" | "structure" | "level" | "area" | "group" | "general";
type EstimateRowLinkState = "unlinked" | "linked-clean" | "linked-overridden" | "source-changed" | "detached";

type WorkspaceRow = {
  id: string;
  created_by: string | null;
  name: string;
  slug: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

type ProfileRow = {
  avatar_url: string | null;
  created_at: string;
  default_workspace_id: string | null;
  display_name: string | null;
  email: string;
  id: string;
  role: AppPlatformRole;
  updated_at: string;
};

type ProjectRow = {
  budget_basis_date?: string | null;
  id: string;
  workspace_id: string;
  created_by: string | null;
  name: string;
  client_name: string | null;
  location: string | null;
  project_code: string | null;
  currency_code: string;
  floor_area_unit?: "sqm" | "sqft" | null;
  gross_floor_area?: number | null;
  market_region?: string | null;
  procurement_status?: string | null;
  project_phase?: string | null;
  project_type?: string | null;
  status: ProjectStatus;
  target_budget?: number | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

type EstimateRow = {
  id: string;
  project_id: string;
  name: string;
  sheet_code: string;
  notes: string | null;
  project_budget: number | null;
  currency_code: string;
  metadata: Json;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type EstimateNodeRow = {
  id: string;
  estimate_id: string;
  estimate_tab_id: string | null;
  kind: EstimateNodeKind;
  name: string;
  parent_id: string | null;
  sort_order: number;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

type EstimateRowItemRow = {
  id: string;
  estimate_id: string;
  node_id: string;
  sort_order: number;
  material: string;
  description: string;
  supplier: string;
  supplier_id: string | null;
  unit: string;
  unit_cost: number;
  quantity: number;
  quantity_base: number | null;
  quantity_contingency_amount: number | null;
  contingency_percentage: number;
  adjustment_percentage: number;
  misc_cost: number;
  row_revision: number;
  category_node_id: string | null;
  discipline: string;
  designation: string;
  source_library_item_id: string | null;
  link_state: EstimateRowLinkState;
  source_snapshot: Json | null;
  pricing_provenance_origin?: "recorded" | "inherited_snapshot" | "synthesized_fallback" | "missing" | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

type DatabaseTables = {
  workspaces: WorkspaceRow;
  profiles: ProfileRow;
  projects: ProjectRow;
  estimates: EstimateRow;
  estimate_nodes: EstimateNodeRow;
  estimate_row_items: EstimateRowItemRow;
  estimate_tabs: {
    id: string;
    estimate_id: string;
    name: string;
    sort_order: number;
    is_default: boolean | number;
    archived_at: string | null;
    metadata: Json;
    created_at: string;
    updated_at: string;
  };
  estimate_sheet_adjustments: {
    estimate_id: string;
    mode: "contingency" | "discount";
    percentage: number;
    row_revision: number;
    updated_at: string | undefined;
    updated_by: string | null;
  };
  project_favorites: {
    project_id: string;
    created_at: string;
  };
  estimate_favorites: {
    estimate_id: string;
    project_id: string;
    created_at: string;
  };
  project_group_memberships: {
    project_id: string;
    group_id: string;
    position: number;
  };
  workspace_members: {
    workspace_id: string;
    user_id: string;
    role: WorkspaceMemberRole;
  };
  project_members: {
    project_id: string;
    workspace_id: string;
    user_id: string;
    role: ProjectAccessRole;
  };
  estimate_sheet_members: {
    estimate_id: string;
    project_id: string;
    user_id: string;
    role: ProjectAccessRole;
  };
  estimate_sheet_access_settings: {
    estimate_id: string;
    inherit_project_access: boolean | number;
  };
  collaboration_invitations: {
    email: string;
    estimate_id: string | null;
    expires_at: string;
    id: string;
    project_id: string;
    role: ProjectAccessRole;
    scope: "project" | "estimate";
  };
  project_publications: {
    encrypted_token: string;
    expires_at: string | null;
    id: string;
    latest_opened_at: string | null;
    location_visibility: string | null;
    open_count: number;
    password_hash: string | null;
    project_id: string;
    published_at: string;
    revoked_at: string | null;
    selected_estimate_ids: string[];
    snapshot_json: Json;
    snapshot_version: number;
    status: "published" | "expired" | "revoked";
  };
};

type Tables<TableName extends keyof DatabaseTables> = DatabaseTables[TableName];

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
  // react-doctor-disable-next-line react-doctor/server-owned-authz-field -- Type-only pending-invite summary role; no client write occurs here.
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
  estimateSheets: ProjectCardEstimateSheetSummary[];
  // Part 7c (Project Groups): which user-group this project belongs to (null = Ungrouped).
  // Non-optional: the repository stamps it on EVERY item (real value or null).
  groupId: string | null;
  // Manual card order inside the user's named group. Null for ungrouped/shared/missing rows.
  groupPosition: number | null;
};

// Columns fetched for the /workshop/projects list. We fetch workspace_id + created_by because
// the server-side access resolver (createWorkshopProjectAccessResolver) needs them, but they are
// stripped from the client payload by toClientProjectRow — no client consumer reads them, so
// shipping them in the RSC Flight stream is pure waste (~2 UUIDs + keys ≈ 100 bytes/project).
const WORKSHOP_PROJECT_LIST_COLUMNS =
  "id, workspace_id, created_by, name, client_name, location, project_code, currency_code, status, metadata, created_at, updated_at" as const;

// Drop the two server-only columns the access resolver consumed so they never reach the client.
// Keeps the return type as the full projects Row (no consumer reads these fields at runtime).
function toClientProjectRow(project: Tables<"projects">): Tables<"projects"> {
  const rest: Partial<Tables<"projects">> = { ...project };
  delete rest.workspace_id;
  delete rest.created_by;
  return rest as Tables<"projects">;
}

export type ProjectCardEstimateSheetSummary = Pick<
  Tables<"estimates">,
  "id" | "project_id" | "name" | "sheet_code" | "updated_at"
>;

export type ProjectFavoriteEstimateSheetSummary = ProjectCardEstimateSheetSummary & {
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
const MAIN_SIDEBAR_FAVORITE_FALLBACK_ESTIMATE_SCAN_LIMIT =
  MAIN_SIDEBAR_FAVORITE_PROJECT_LIMIT * MAIN_SIDEBAR_FAVORITE_SHEET_LIMIT * 4;
const WORKSHOP_ESTIMATE_NODE_KINDS = new Set([
  "assembly",
  "lot",
  "structure",
  "level",
  "area",
  "group",
  "general",
]);

function placeholders(valuesOrCount: number | readonly unknown[]) {
  const count = typeof valuesOrCount === "number" ? valuesOrCount : valuesOrCount.length;
  if (count <= 0) throw new Error("Something went wrong. Try again in a moment.");
  return new Array(count).fill("?").join(", ");
}

function bindValues(values: readonly unknown[]): D1Value[] {
  return values.map((value) => {
    if (value === undefined) return null;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null || value instanceof ArrayBuffer) {
      return value;
    }
    return JSON.stringify(value);
  });
}

async function requireWorkspaceRepositoryD1Database(): Promise<D1DatabaseLike> {
  const database = await getCloudflareD1Database();
  if (!database) throw new Error("Something went wrong. Try again in a moment.");
  return database;
}

async function all<T>(database: D1DatabaseLike, sql: string, values: readonly unknown[] = []): Promise<T[]> {
  const result = await database.prepare(sql).bind(...bindValues(values)).all<T>();
  return result.results ?? [];
}

async function first<T>(database: D1DatabaseLike, sql: string, values: readonly unknown[] = []): Promise<T | null> {
  return database.prepare(sql).bind(...bindValues(values)).first<T>();
}

async function run(database: D1DatabaseLike, sql: string, values: readonly unknown[] = []) {
  return database.prepare(sql).bind(...bindValues(values)).run();
}

function readD1Json(value: Json | string | null | undefined): Json {
  if (typeof value !== "string") return value ?? null;
  try {
    return JSON.parse(value) as Json;
  } catch {
    return null;
  }
}

function readD1JsonRecord(value: Json | string | null | undefined): Record<string, Json> {
  const parsed = readD1Json(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  return parsed as Record<string, Json>;
}

function readD1JsonStringArray(value: Json | string | null | undefined): string[] {
  const parsed = readD1Json(value);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item): item is string => typeof item === "string");
}

function readD1Boolean(value: boolean | number | string | null | undefined, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value === "1" || value.toLowerCase() === "true";
  return fallback;
}

function normalizeProjectRow(project: ProjectRow & { metadata?: Json | string | null }): ProjectRow {
  return {
    ...project,
    client_name: project.client_name ?? null,
    location: project.location ?? null,
    project_code: project.project_code ?? null,
    currency_code: project.currency_code ?? "PHP",
    status: normalizeProjectStatus(project.status),
    metadata: readD1Json(project.metadata),
  };
}

function normalizeEstimateRow(estimate: EstimateRecordWithLegacy & { metadata?: Json | string | null }): EstimateRow {
  return normalizeEstimateRecord({
    ...estimate,
    currency_code: estimate.currency_code ?? "PHP",
    metadata: readD1Json(estimate.metadata),
  });
}

async function readWorkspaceById(database: D1DatabaseLike, workspaceId: string): Promise<WorkspaceRow | null> {
  return first<WorkspaceRow>(
    database,
    `SELECT id, created_by, name, slug, closed_at, created_at, updated_at
     FROM workspaces
     WHERE id = ?
     LIMIT 1`,
    [workspaceId],
  );
}

async function readProfileById(database: D1DatabaseLike, userId: string): Promise<ProfileRow | null> {
  return first<ProfileRow>(
    database,
    `SELECT id, email, display_name, avatar_url, role, default_workspace_id, created_at, updated_at
     FROM profiles
     WHERE id = ?
     LIMIT 1`,
    [userId],
  );
}

function withDefaultWorkspace(profile: ProfileRow, workspaceId: string): ProfileRow {
  return {
    ...profile,
    default_workspace_id: workspaceId,
  };
}

function normalizePublicationRow<T extends ProjectPublicationRow | ProjectPublicationListRow>(publication: T): T {
  return {
    ...publication,
    open_count: Number(publication.open_count ?? 0),
    selected_estimate_ids: "selected_estimate_ids" in publication
      ? readD1JsonStringArray(publication.selected_estimate_ids as unknown as Json | string | null)
      : [],
    snapshot_json: "snapshot_json" in publication
      ? readD1Json(publication.snapshot_json as Json | string | null)
      : null,
  } as T;
}

type WorkshopProjectRecord = Pick<
  Tables<"projects">,
  | "id"
  | "name"
  | "client_name"
  | "project_code"
  | "location"
  | "status"
  | "updated_at"
  | "workspace_id"
  | "created_by"
>;

type WorkshopEstimateRecord = Pick<
  Tables<"estimates">,
  "id" | "project_id" | "name" | "sheet_code" | "updated_at"
>;
type WorkshopEstimateNodeRecord = Pick<
  Tables<"estimate_nodes">,
  "id" | "estimate_id" | "kind" | "parent_id" | "sort_order"
>;
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
type MainSidebarFavoriteSheetRpcRow = Pick<Tables<"estimates">, "id" | "project_id" | "name"> & {
  sheet_code: string | null;
  favorite_created_at: string;
};
type MainSidebarFavoriteProjectRpcRow = Pick<Tables<"projects">, "id" | "name" | "project_code"> & {
  favorite_created_at: string;
  project_favorite_created_at: string | null;
  favorite_estimate_sheets: MainSidebarFavoriteSheetRpcRow[];
};
type ProjectGroupMembershipRow = Pick<Tables<"project_group_memberships">, "project_id" | "group_id"> & {
  position: number | null;
};
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
> & {
  current_source_revision?: number | string | null;
};
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
  owner: projectEstimateCollaborationRoleRank("owner"),
  admin: projectEstimateCollaborationRoleRank("admin"),
  editor: projectEstimateCollaborationRoleRank("editor"),
  viewer: projectEstimateCollaborationRoleRank("viewer"),
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
  return canManageProjectEstimateCollaborationRole(role);
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
        : "sheet-member";
    const currentUserRole = accessKind === "owned"
      ? workspaceRole ?? projectRole ?? (project.created_by === profileId ? "owner" : "viewer")
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
  return code === "42P01" || message.includes("does not exist") || message.includes("schema cache") || message.includes("no such table");
}

async function readOptionalProjectMembers(
  database: D1DatabaseLike,
  projectId: string,
): Promise<ProjectMemberRow[]> {
  try {
    return await all<ProjectMemberRow>(
      database,
      `SELECT project_id, workspace_id, user_id, role
       FROM project_members
       WHERE project_id = ?`,
      [projectId],
    );
  } catch (error) {
    if (isMissingOptionalCollaborationTable(error)) return [];
    throw error;
  }
}

async function readOptionalEstimateSheetMembers(
  database: D1DatabaseLike,
  estimateIds: string[],
): Promise<EstimateSheetMemberRow[]> {
  if (estimateIds.length === 0) return [];

  try {
    return await all<EstimateSheetMemberRow>(
      database,
      `SELECT estimate_id, project_id, user_id, role
       FROM estimate_sheet_members
       WHERE estimate_id IN (${placeholders(estimateIds)})`,
      estimateIds,
    );
  } catch (error) {
    if (isMissingOptionalCollaborationTable(error)) return [];
    throw error;
  }
}

async function readOptionalEstimateSheetAccessSettings(
  database: D1DatabaseLike,
  estimateIds: string[],
): Promise<EstimateSheetAccessSettingsRow[]> {
  if (estimateIds.length === 0) return [];

  try {
    const rows = await all<EstimateSheetAccessSettingsRow>(
      database,
      `SELECT estimate_id, inherit_project_access
       FROM estimate_sheet_access_settings
       WHERE estimate_id IN (${placeholders(estimateIds)})`,
      estimateIds,
    );
    return rows.map((row) => ({
      ...row,
      inherit_project_access: readD1Boolean(row.inherit_project_access, true),
    }));
  } catch (error) {
    if (isMissingOptionalCollaborationTable(error)) return [];
    throw error;
  }
}

async function readOptionalCollaborationInvitations(
  database: D1DatabaseLike,
  projectId: string,
): Promise<CollaborationInvitationRow[]> {
  try {
    return await all<CollaborationInvitationRow>(
      database,
      `SELECT id, project_id, email, role, scope, estimate_id, expires_at
       FROM collaboration_invitations
       WHERE project_id = ?
         AND lifecycle_state = 'pending'
         AND accepted_at IS NULL
         AND revoked_at IS NULL
       ORDER BY created_at DESC`,
      [projectId],
    );
  } catch (error) {
    if (isMissingOptionalCollaborationTable(error)) return [];
    throw error;
  }
}

async function readPendingCollaborationVisibilitySummary({
  database,
  email,
  projectIds,
}: {
  database: D1DatabaseLike;
  email: string | null;
  projectIds: string[];
}): Promise<PendingCollaborationVisibilitySummary> {
  const sentPendingInviteCountByProjectId = new Map<string, number>();
  const expiresAfter = new Date().toISOString();
  const uniqueProjectIds = [...new Set(projectIds)];

  const [receivedRows, sentRows] = await Promise.all([
    email?.trim()
      ? all<{
          invitation_id: string;
          project_id: string;
          estimate_id: string | null;
          project_name: string;
          project_code: string | null;
          estimate_name: string | null;
          role: string | null;
          scope: string | null;
          inviter_label: string | null;
          state: string | null;
          expires_at: string | null;
          last_opened_at: string | null;
        }>(
          database,
          `SELECT
             invitation.id AS invitation_id,
             invitation.project_id,
             invitation.estimate_id,
             project.name AS project_name,
             project.project_code,
             estimate.name AS estimate_name,
             invitation.role,
             invitation.scope,
             COALESCE(inviter.display_name, inviter.email) AS inviter_label,
             CASE WHEN invitation.expires_at <= ? THEN 'expired' ELSE 'pending' END AS state,
             invitation.expires_at,
             invitation.last_opened_at
           FROM collaboration_invitations invitation
           INNER JOIN projects project ON project.id = invitation.project_id
           LEFT JOIN estimates estimate ON estimate.id = invitation.estimate_id
           LEFT JOIN profiles inviter ON inviter.id = invitation.invited_by
           WHERE invitation.email = lower(trim(?))
             AND invitation.lifecycle_state = 'pending'
             AND invitation.accepted_at IS NULL
             AND invitation.revoked_at IS NULL
           ORDER BY invitation.created_at DESC`,
          [expiresAfter, email],
        ).catch((error) => {
          if (isMissingOptionalCollaborationTable(error)) return [];
          throw error;
        })
      : Promise.resolve([]),
    uniqueProjectIds.length > 0
      ? all<{ project_id: string }>(
          database,
          `SELECT project_id
           FROM collaboration_invitations
           WHERE project_id IN (${placeholders(uniqueProjectIds)})
             AND lifecycle_state = 'pending'
             AND accepted_at IS NULL
             AND revoked_at IS NULL
             AND expires_at > ?`,
          [...uniqueProjectIds, expiresAfter],
        ).catch((error) => {
          if (isMissingOptionalCollaborationTable(error)) return [];
          throw error;
        })
      : Promise.resolve([]),
  ]);

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
      status: DEFAULT_PROJECT_STATUS,
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
    estimateSheets: [],
    // Part 7c (Project Groups): pending invites are never in a user group.
    groupId: null,
    groupPosition: null,
  };
}

async function readOptionalProjectPublication(
  database: D1DatabaseLike,
  projectId: string,
): Promise<ProjectPublicationRow | null> {
  try {
    const publication = await first<ProjectPublicationRow>(
      database,
      `SELECT
         id,
         project_id,
         (SELECT publication_source_revision FROM projects WHERE projects.id = project_publications.project_id) AS current_source_revision,
         encrypted_token,
         password_hash,
         status,
         snapshot_json,
         snapshot_version,
         selected_estimate_ids,
         published_at,
         expires_at,
         revoked_at,
         open_count,
         latest_opened_at,
         location_visibility
       FROM project_publications
       WHERE project_id = ?
       ORDER BY published_at DESC
       LIMIT 1`,
      [projectId],
    );
    return publication ? normalizePublicationRow(publication) : null;
  } catch (error) {
    if (isMissingOptionalCollaborationTable(error)) return null;
    throw error;
  }
}

async function readOptionalProjectPublications(
  database: D1DatabaseLike,
  projectIds: string[],
): Promise<ProjectPublicationListRow[]> {
  if (projectIds.length === 0) return [];

  try {
    const rows = await all<ProjectPublicationListRow>(
      database,
      `SELECT
         id,
         project_id,
         encrypted_token,
         password_hash,
         status,
         snapshot_version,
         published_at,
         expires_at,
         revoked_at,
         open_count,
         latest_opened_at,
         location_visibility
       FROM project_publications
       WHERE project_id IN (${placeholders(projectIds)})
       ORDER BY project_id ASC, published_at DESC`,
      projectIds,
    );
    return rows.map((publication) => normalizePublicationRow(publication));
  } catch (error) {
    if (isMissingOptionalCollaborationTable(error)) return [];
    throw error;
  }
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
  database: D1DatabaseLike,
  projectId: string,
  estimateIds: string[],
) {
  const subsetFilter = estimateIds.length > 0 ? `AND id IN (${placeholders(estimateIds)})` : "";
  const data = await first<{ updated_at: string | null }>(
    database,
    `SELECT updated_at
     FROM estimates
     WHERE project_id = ?
       ${subsetFilter}
     ORDER BY updated_at DESC
     LIMIT 1`,
    estimateIds.length > 0 ? [projectId, ...estimateIds] : [projectId],
  );
  return data?.updated_at ?? null;
}

async function readLatestSharedLinkRecipientOpen(
  database: D1DatabaseLike,
  publicationId: string | null | undefined,
): Promise<ProjectPublicationSummary["latestRecipientOpen"]> {
  if (!publicationId) return null;

  try {
    const data = await first<{ email: string | null; display_name: string | null; last_opened_at: string | null }>(
      database,
      `SELECT email, display_name, last_opened_at
       FROM shared_link_recipients
       WHERE publication_id = ?
         AND last_opened_at IS NOT NULL
       ORDER BY last_opened_at DESC
       LIMIT 1`,
      [publicationId],
    );
    if (!data?.email || !data.last_opened_at) return null;
    return {
      email: data.email,
      displayName: data.display_name ?? null,
      openedAt: data.last_opened_at,
    };
  } catch (error) {
    if (isMissingOptionalCollaborationTable(error)) return null;
    throw error;
  }
}

async function readLatestSharedLinkCommentAt(
  database: D1DatabaseLike,
  publicationId: string | null | undefined,
): Promise<string | null> {
  if (!publicationId) return null;

  try {
    const data = await first<{ created_at: string | null }>(
      database,
      `SELECT created_at
       FROM shared_link_comments
       WHERE publication_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [publicationId],
    );
    return data?.created_at ?? null;
  } catch (error) {
    if (isMissingOptionalCollaborationTable(error)) return null;
    throw error;
  }
}

async function readLatestSharedLinkResponseAt(
  database: D1DatabaseLike,
  publicationId: string | null | undefined,
): Promise<string | null> {
  if (!publicationId) return null;

  try {
    const data = await first<{ created_at: string | null }>(
      database,
      `SELECT created_at
       FROM shared_link_responses
       WHERE publication_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [publicationId],
    );
    return data?.created_at ?? null;
  } catch (error) {
    if (isMissingOptionalCollaborationTable(error)) return null;
    throw error;
  }
}

/**
 * Most-recent non-null ISO timestamp among the candidates (comments, decisions,
 * opens). Pure so it can be unit-tested without a database round-trip. Returns
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
  database: D1DatabaseLike,
  userIds: string[],
): Promise<Map<string, CollaborationProfileRow>> {
  if (userIds.length === 0) return new Map();

  const data = await all<CollaborationProfileRow>(
    database,
    `SELECT id, display_name, email, avatar_url
     FROM profiles
     WHERE id IN (${placeholders(userIds)})`,
    userIds,
  );
  return new Map(data.map((profile) => [profile.id, profile]));
}

function readProfileDisplayName(profile: CollaborationProfileRow | undefined, fallbackUserId: string) {
  const email = profile?.email ?? null;
  return profile?.display_name ?? email?.split("@")[0] ?? `User ${fallbackUserId.slice(0, 8)}`;
}

function isPlatformAdminContext(context: Pick<CurrentUserContext, "role">) {
  return isPlatformAdminRole(context.role);
}

async function canUseWorkspaceAsDefault(
  database: D1DatabaseLike,
  workspace: WorkspaceRow,
  context: Pick<CurrentUserContext, "role" | "userId">,
) {
  if (workspace.closed_at) return false;
  if (isPlatformAdminContext(context)) return true;
  if (workspace.created_by === context.userId) return true;

  const membership = await first<WorkspaceMembershipRoleRow>(
    database,
    `SELECT role
     FROM workspace_members
     WHERE workspace_id = ?
       AND user_id = ?
     LIMIT 1`,
    [workspace.id, context.userId],
  );
  return Boolean(membership);
}

async function filterAccessibleEstimates<T extends { id: string }>(
  database: D1DatabaseLike,
  estimates: T[],
  context: Pick<CurrentUserContext, "role" | "userId">,
) {
  if (estimates.length === 0) return estimates;
  const accessibleEstimateIds = await readAccessibleEstimateIdSet(
    database,
    estimates.map((estimate) => estimate.id),
    context,
  );
  return estimates.filter((estimate) => accessibleEstimateIds.has(estimate.id));
}

const MAX_ESTIMATE_ACCESS_PROBE_BATCH_SIZE = 90;

async function readAccessibleEstimateIdSet(
  database: D1DatabaseLike,
  estimateIds: string[],
  context: Pick<CurrentUserContext, "role" | "userId">,
) {
  const uniqueEstimateIds = [...new Set(estimateIds)];
  if (uniqueEstimateIds.length === 0) return new Set<string>();
  if (isPlatformAdminContext(context)) return new Set(uniqueEstimateIds);

  try {
    const accessibleEstimateIds = new Set<string>();
    for (let index = 0; index < uniqueEstimateIds.length; index += MAX_ESTIMATE_ACCESS_PROBE_BATCH_SIZE) {
      const estimateIdBatch = uniqueEstimateIds.slice(index, index + MAX_ESTIMATE_ACCESS_PROBE_BATCH_SIZE);
      const rows = await all<{ id: string }>(
        database,
        `SELECT estimate.id
         FROM estimates estimate
         JOIN projects project ON project.id = estimate.project_id
         LEFT JOIN estimate_sheet_access_settings access
           ON access.estimate_id = estimate.id
         WHERE estimate.id IN (${placeholders(estimateIdBatch)})
           AND (
             EXISTS (
               SELECT 1
               FROM estimate_sheet_members sheet_member
               WHERE sheet_member.estimate_id = estimate.id
                 AND sheet_member.user_id = ?
             )
             OR (
               COALESCE(access.inherit_project_access, 1) = 1
               AND (
                 EXISTS (
                   SELECT 1
                   FROM workspace_members workspace_member
                   WHERE workspace_member.workspace_id = project.workspace_id
                     AND workspace_member.user_id = ?
                 )
                 OR EXISTS (
                   SELECT 1
                   FROM project_members project_member
                   WHERE project_member.project_id = project.id
                     AND project_member.user_id = ?
                 )
               )
             )
           )`,
        [
          ...estimateIdBatch,
          context.userId,
          context.userId,
          context.userId,
        ],
      );
      for (const row of rows) {
        accessibleEstimateIds.add(row.id);
      }
    }
    return accessibleEstimateIds;
  } catch {
    return new Set<string>();
  }
}

async function filterAccessibleEstimateIds(
  database: D1DatabaseLike,
  estimateIds: string[],
  context: Pick<CurrentUserContext, "role" | "userId">,
) {
  if (estimateIds.length === 0) return estimateIds;
  const accessibleEstimateIds = await readAccessibleEstimateIdSet(database, estimateIds, context);
  return estimateIds.filter((estimateId) => accessibleEstimateIds.has(estimateId));
}

function canReadProjectCollaborationRoster({
  context,
  profileId,
  project,
  projectMembers,
  workspaceMembers,
}: {
  context: Pick<CurrentUserContext, "role">;
  profileId: string;
  project: Pick<Tables<"projects">, "created_by">;
  projectMembers: Array<Pick<Tables<"project_members">, "user_id">>;
  workspaceMembers: Array<Pick<Tables<"workspace_members">, "user_id">>;
}) {
  if (isPlatformAdminContext(context)) return true;
  if (project.created_by === profileId) return true;
  return workspaceMembers.some((member) => member.user_id === profileId)
    || projectMembers.some((member) => member.user_id === profileId);
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
  const database = await requireWorkspaceRepositoryD1Database();

  if (context.profile.default_workspace_id) {
    const existingWorkspace = await readWorkspaceById(database, context.profile.default_workspace_id);
    if (existingWorkspace && await canUseWorkspaceAsDefault(database, existingWorkspace, context)) {
      await installStarterPackForEligibleWorkspace(database, {
        workspaceId: existingWorkspace.id,
        userId: context.userId,
      });
      return { workspace: existingWorkspace, profile: context.profile };
    }
  }

  const membership = await readFirstAccountWorkspaceMembership(context.userId);
  if (membership?.workspaceId) {
    const memberWorkspace = await readWorkspaceById(database, membership.workspaceId);
    if (memberWorkspace) {
      const now = new Date().toISOString();
      await run(
        database,
        `UPDATE profiles
         SET default_workspace_id = ?, updated_at = ?
         WHERE id = ?`,
        [memberWorkspace.id, now, context.userId],
      );
      const profile = await readProfileById(database, context.userId);
      await installStarterPackForEligibleWorkspace(database, {
        workspaceId: memberWorkspace.id,
        userId: context.userId,
      });
      return { workspace: memberWorkspace, profile: profile ?? withDefaultWorkspace(context.profile, memberWorkspace.id) };
    }

    throw new Error("Workspace membership is unavailable. Contact support.");
  }

  const defaultName = context.email === "philipjonlewis@gmail.com" ? "Philip's Archestimator Workspace" : "My Archestimator Workspace";

  const now = new Date().toISOString();
  const workspace: WorkspaceRow = {
    id: randomUUID(),
    name: defaultName,
    slug: null,
    created_by: context.userId,
    closed_at: null,
    created_at: now,
    updated_at: now,
  };
  await run(
    database,
    `INSERT INTO workspaces (id, name, slug, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [workspace.id, workspace.name, workspace.slug, workspace.created_by, workspace.created_at, workspace.updated_at],
  );
  await run(
    database,
    `INSERT INTO workspace_members (workspace_id, user_id, role, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(workspace_id, user_id) DO UPDATE SET
       role = excluded.role,
       updated_at = excluded.updated_at`,
    [workspace.id, context.userId, "owner", now, now],
  );
  await run(
    database,
    `UPDATE profiles
     SET default_workspace_id = ?, updated_at = ?
     WHERE id = ?`,
    [workspace.id, now, context.userId],
  );
  await installStarterPackForNewWorkspace(database, {
    workspaceId: workspace.id,
    userId: context.userId,
  });
  const profile = await readProfileById(database, context.userId);

  return { workspace, profile: profile ?? withDefaultWorkspace(context.profile, workspace.id) };
});

export const listCurrentWorkspaceProjects = cache(async () => {
  const rpcResult = await listCurrentWorkspaceProjectsRpcPath();
  if (rpcResult) return rpcResult;
  return listCurrentWorkspaceProjectsAppPath();
});

export const listCurrentWorkspaceProjectClientNames = cache(async () => {
  const { workspace } = await ensureDefaultWorkspace();
  const database = await requireWorkspaceRepositoryD1Database();
  const data = await all<{ client_name: string | null }>(
    database,
    `SELECT client_name
     FROM projects
     WHERE workspace_id = ?
       AND client_name IS NOT NULL
     ORDER BY client_name ASC`,
    [workspace.id],
  );

  const clientNames = new Map<string, string>();
  for (const project of data) {
    const label = project.client_name?.trim();
    const key = label?.toLowerCase().replace(/\s+/g, " ");
    if (!label || !key || clientNames.has(key)) continue;
    clientNames.set(key, label);
  }

  return [...clientNames.values()];
});

async function listCurrentWorkspaceProjectsAppPath() {
  const { workspace, profile } = await ensureDefaultWorkspace();
  const database = await requireWorkspaceRepositoryD1Database();

  const [
    ownedProjects,
    favoriteRows,
    favoriteEstimateRows,
    projectMembers,
    sheetMembers,
    workspaceMembership,
    projectGroupRows,
    projectGroupMembershipRows,
  ] = await traced("projects.wave1.batch", () => Promise.all([
    all<ProjectRow>(
      database,
      `SELECT ${WORKSHOP_PROJECT_LIST_COLUMNS}
       FROM projects
       WHERE workspace_id = ?
       ORDER BY updated_at DESC`,
      [workspace.id],
    ).then((rows) => rows.map(normalizeProjectRow)),
    all<WorkshopProjectFavoriteRef>(
      database,
      `SELECT project_id
       FROM project_favorites
       WHERE user_id = ?`,
      [profile.id],
    ),
    all<WorkshopHomebaseFavoriteEstimateRef>(
      database,
      `SELECT estimate_id, project_id, created_at
       FROM estimate_favorites
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [profile.id],
    ),
    all<ProjectMemberRow>(
      database,
      `SELECT project_id, workspace_id, role, user_id
       FROM project_members
       WHERE user_id = ?`,
      [profile.id],
    ).catch((error) => {
      if (isMissingOptionalCollaborationTable(error)) return [];
      throw error;
    }),
    all<EstimateSheetMemberRow>(
      database,
      `SELECT estimate_id, project_id, role, user_id
       FROM estimate_sheet_members
       WHERE user_id = ?`,
      [profile.id],
    ).catch((error) => {
      if (isMissingOptionalCollaborationTable(error)) return [];
      throw error;
    }),
    first<WorkspaceMembershipRoleRow>(
      database,
      `SELECT role
       FROM workspace_members
       WHERE workspace_id = ?
         AND user_id = ?
       LIMIT 1`,
      [workspace.id, profile.id],
    ),
    all<{ id: string; name: string; accent_id: string | null; position: number }>(
      database,
      `SELECT id, name, accent_id, position
       FROM project_groups
       WHERE workspace_id = ?
         AND user_id = ?
       ORDER BY position ASC, created_at ASC`,
      [workspace.id, profile.id],
    ),
    all<ProjectGroupMembershipRow>(
      database,
      `SELECT project_id, group_id, position
       FROM project_group_memberships
       WHERE workspace_id = ?
         AND user_id = ?
       ORDER BY group_id ASC, position ASC, created_at ASC, project_id ASC`,
      [workspace.id, profile.id],
    ),
  ]));

  const ownedProjectIds = new Set(ownedProjects.map((project) => project.id));
  const workspaceRole = workspaceMembership?.role
    ? mapWorkspaceRoleToCollaborationRole(workspaceMembership.role)
    : null;
  const sharedProjectIds = [
    ...new Set([
      ...projectMembers.map((member) => member.project_id),
      ...sheetMembers.map((member) => member.project_id),
    ]),
  ].filter((projectId) => !ownedProjectIds.has(projectId));

  const favoriteEstimateIds = favoriteEstimateRows.map((favorite) => favorite.estimate_id);
  const favoriteEstimateCreatedAtById = new Map(
    favoriteEstimateRows.map((favorite) => [favorite.estimate_id, favorite.created_at]),
  );

  const visibleProjectIds = [...ownedProjectIds, ...sharedProjectIds];

  const [sharedProjects, favoriteEstimates, projectEstimateSheets] = await traced(
    "projects.wave2.shared+favorites+estimates",
    () =>
      Promise.all([
        sharedProjectIds.length > 0
          ? all<ProjectRow>(
              database,
              `SELECT ${WORKSHOP_PROJECT_LIST_COLUMNS}
               FROM projects
               WHERE id IN (${placeholders(sharedProjectIds)})
               ORDER BY updated_at DESC`,
              sharedProjectIds,
            ).then((rows) => rows.map(normalizeProjectRow))
          : Promise.resolve([]),
        favoriteEstimateIds.length > 0
          ? all<WorkshopEstimateRecord>(
              database,
              `SELECT id, project_id, name, sheet_code, updated_at
               FROM estimates
               WHERE id IN (${placeholders(favoriteEstimateIds)})`,
              favoriteEstimateIds,
            )
          : Promise.resolve([]),
        visibleProjectIds.length > 0
          ? all<ProjectCardEstimateSheetSummary>(
              database,
              `SELECT id, project_id, name, sheet_code, updated_at
               FROM estimates
               WHERE project_id IN (${placeholders(visibleProjectIds)})
               ORDER BY project_id ASC, updated_at DESC, id DESC`,
              visibleProjectIds,
            )
          : Promise.resolve([]),
      ]),
  );

  const accessibleEstimateIds = await readAccessibleEstimateIdSet(
    database,
    [...projectEstimateSheets.map((sheet) => sheet.id), ...favoriteEstimates.map((estimate) => estimate.id)],
    { role: profile.role, userId: profile.id },
  );
  const accessibleProjectEstimateSheets = projectEstimateSheets.filter((sheet) => accessibleEstimateIds.has(sheet.id));
  const accessibleFavoriteEstimates = favoriteEstimates.filter((estimate) => accessibleEstimateIds.has(estimate.id));

  let favoriteEstimateSheetsByProjectId = new Map<string, ProjectFavoriteEstimateSheetSummary[]>();
  const estimateSheetsByProjectId = accessibleProjectEstimateSheets.reduce((byProject, sheet) => {
    const sheets = byProject.get(sheet.project_id) ?? [];
    sheets.push(sheet);
    byProject.set(sheet.project_id, sheets);
    return byProject;
  }, new Map<string, ProjectCardEstimateSheetSummary[]>());
  const sheetMemberEstimateIds = new Set(
    sheetMembers.map((member) => member.estimate_id),
  );

  if (favoriteEstimateIds.length > 0) {
    const favoriteEstimateById = new Map(
      accessibleFavoriteEstimates.map((estimate) => [estimate.id, estimate]),
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

  const projectGroups: ProjectGroupSummary[] = projectGroupRows.map((group) => ({
    id: group.id,
    name: group.name,
    accentId: group.accent_id,
    position: group.position,
  }));
  const groupMembershipByProjectId = new Map<string, ProjectGroupMembershipRow>(
    projectGroupMembershipRows.map((membership) => [
      membership.project_id,
      membership,
    ]),
  );

  function createProjectListItem(project: Tables<"projects">): WorkshopProjectListItem {
    // Resolve access off the FULL row (needs workspace_id/created_by), then ship the trimmed
    // client row so the two server-only columns never enter the serialized payload.
    const access = resolveProjectAccess(project);
    const projectEstimateSheets = estimateSheetsByProjectId.get(project.id) ?? [];
    const estimateSheets =
      access.accessKind === "sheet-member"
        ? projectEstimateSheets.filter((sheet) => sheetMemberEstimateIds.has(sheet.id))
        : projectEstimateSheets;
    return {
      project: toClientProjectRow(project),
      ...access,
      pendingInviteCount: 0,
      publicationSummary: null,
      favoriteEstimateSheets: favoriteEstimateSheetsByProjectId.get(project.id) ?? [],
      estimateSheets,
      groupId: groupMembershipByProjectId.get(project.id)?.group_id ?? null,
      groupPosition: groupMembershipByProjectId.get(project.id)?.position ?? null,
    };
  }

  const projectItems: WorkshopProjectListItem[] = [
    ...ownedProjects.map(createProjectListItem),
    ...sharedProjects.map((project) => {
      return createProjectListItem(project);
    }),
  ];
  const [publicationRows, pendingInviteVisibility] = await traced(
    "projects.wave3.publications+invites",
    () =>
      Promise.all([
        readOptionalProjectPublications(
          database,
          [...new Set(projectItems.map((item) => item.project.id))],
        ),
        readPendingCollaborationVisibilitySummary({
          database,
          email: profile.email,
          projectIds: filterMapBy(
            projectItems,
            (item) => canManageCollaborationRole(item.currentUserRole),
            (item) => item.project.id,
          ),
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
    workspaceRole: workspaceMembership?.role ?? (workspace.created_by === profile.id ? "owner" : null),
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
    favoriteProjectIds: favoriteRows.map((favorite) => favorite.project_id),
    projectGroups,
  };
}

function mergeHomebaseRecords<T extends { id: string }>(primary: T[], secondary: T[]) {
  const byId = new Map<string, T>();
  for (const record of [...primary, ...secondary]) {
    if (!byId.has(record.id)) byId.set(record.id, record);
  }
  return [...byId.values()];
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
    status: normalizeProjectStatus(value.status),
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
    closed_at: assertRpcOptionalString(value.closed_at, `${path}.closed_at`),
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
    status: normalizeProjectStatus(value.status),
    updated_at: assertRpcString(value.updated_at, `${path}.updated_at`),
    workspace_id: assertRpcString(value.workspace_id, `${path}.workspace_id`),
    created_by: assertRpcOptionalString(value.created_by, `${path}.created_by`),
  };
}

function assertMainSidebarFavoriteSheet(value: Record<string, unknown>, path: string): MainSidebarFavoriteSheetRpcRow {
  return {
    id: assertRpcString(value.id, `${path}.id`),
    project_id: assertRpcString(value.project_id, `${path}.project_id`),
    name: assertRpcString(value.name, `${path}.name`),
    sheet_code: assertRpcOptionalString(value.sheet_code, `${path}.sheet_code`),
    favorite_created_at: assertRpcString(value.favorite_created_at, `${path}.favorite_created_at`),
  };
}

function assertMainSidebarFavoriteProject(value: Record<string, unknown>, path: string): MainSidebarFavoriteProjectRpcRow {
  return {
    id: assertRpcString(value.id, `${path}.id`),
    name: assertRpcString(value.name, `${path}.name`),
    project_code: assertRpcOptionalString(value.project_code, `${path}.project_code`),
    favorite_created_at: assertRpcString(value.favorite_created_at, `${path}.favorite_created_at`),
    project_favorite_created_at: assertRpcOptionalString(value.project_favorite_created_at, `${path}.project_favorite_created_at`),
    favorite_estimate_sheets: readRpcArray(value, "favorite_estimate_sheets", assertMainSidebarFavoriteSheet, "main_sidebar_favorite_projects"),
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
    position: assertRpcOptionalNumber(value.position, `${path}.position`) ?? null,
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

export function parseMainSidebarFavoriteProjectsPayload(value: unknown): MainSidebarFavoriteProjectRpcRow[] {
  const source = "main_sidebar_favorite_projects";
  if (!Array.isArray(value)) throw new Error(`${source} invalid payload`);
  return value.map((item, index) => {
    if (!isRecord(item)) throw new Error(`${source} invalid array element: [${index}] is not an object`);
    return assertMainSidebarFavoriteProject(item, `[${index}]`);
  });
}

function isWorkspaceProjectsSummaryContractError(error: unknown): error is Error {
  if (!(error instanceof Error)) return false;
  return (
    error.message.startsWith("workspace_projects_summary invalid") ||
    error.message.startsWith("workspace summary RPC invalid shape")
  );
}

function isMainSidebarFavoriteProjectsContractError(error: unknown): error is Error {
  return error instanceof Error && (
    error.message.startsWith("main_sidebar_favorite_projects invalid") ||
    error.message.startsWith("workspace summary RPC invalid shape")
  );
}

async function listCurrentWorkspaceProjectsRpcPath() {
  return null;
}

async function getWorkshopHomebaseDataRpcPath(): Promise<WorkshopHomebaseData | null> {
  return null;
}

async function getWorkshopHomebaseDataAppPath(): Promise<WorkshopHomebaseData> {
  const { workspace, profile } = await ensureDefaultWorkspace();
  const database = await requireWorkspaceRepositoryD1Database();

  const [
    projectFavoriteRows,
    estimateFavoriteRows,
    recentProjects,
    projectMembers,
    sheetMembers,
    workspaceMembership,
  ] = await Promise.all([
    all<WorkshopHomebaseFavoriteProjectRef>(
      database,
      `SELECT project_id, created_at
       FROM project_favorites
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [profile.id, WORKSHOP_HOMEBASE_ITEM_LIMIT],
    ),
    all<WorkshopHomebaseFavoriteEstimateRef>(
      database,
      `SELECT estimate_id, project_id, created_at
       FROM estimate_favorites
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [profile.id, WORKSHOP_HOMEBASE_ITEM_LIMIT],
    ),
    all<WorkshopProjectRecord>(
      database,
      `SELECT id, name, client_name, project_code, location, status, updated_at, workspace_id, created_by
       FROM projects
       WHERE workspace_id = ?
       ORDER BY updated_at DESC
       LIMIT ?`,
      [workspace.id, WORKSHOP_HOMEBASE_ITEM_LIMIT],
    ).then((rows) => rows.map((row) => normalizeProjectRow(row as ProjectRow) as WorkshopProjectRecord)),
    all<ProjectMemberRow>(
      database,
      `SELECT project_id, workspace_id, role, user_id
       FROM project_members
       WHERE user_id = ?`,
      [profile.id],
    ).catch((error) => {
      if (isMissingOptionalCollaborationTable(error)) return [];
      throw error;
    }),
    all<EstimateSheetMemberRow>(
      database,
      `SELECT estimate_id, project_id, role, user_id
       FROM estimate_sheet_members
       WHERE user_id = ?`,
      [profile.id],
    ).catch((error) => {
      if (isMissingOptionalCollaborationTable(error)) return [];
      throw error;
    }),
    first<WorkspaceMembershipRoleRow>(
      database,
      `SELECT role
       FROM workspace_members
       WHERE workspace_id = ?
         AND user_id = ?
       LIMIT 1`,
      [workspace.id, profile.id],
    ),
  ]);

  const projectFavoriteCreatedAt = new Map(
    projectFavoriteRows.map((favorite) => [favorite.project_id, favorite.created_at]),
  );
  const estimateFavoriteCreatedAt = new Map(
    estimateFavoriteRows.map((favorite) => [favorite.estimate_id, favorite.created_at]),
  );
  const context = { role: profile.role, userId: profile.id };
  const rawFavoriteProjectIds = [...projectFavoriteCreatedAt.keys()];
  const favoriteProjectIds = await filterAccessibleSidebarProjectIds(
    database,
    rawFavoriteProjectIds,
    profile,
  );
  const favoriteEstimateIds = await filterAccessibleEstimateIds(
    database,
    [...estimateFavoriteCreatedAt.keys()],
    context,
  );
  const workspaceRole = workspaceMembership?.role
    ? mapWorkspaceRoleToCollaborationRole(workspaceMembership.role)
    : null;
  const resolveProjectAccess = createWorkshopProjectAccessResolver({
    profileId: profile.id,
    projectMembers,
    sheetMembers,
    workspace,
    workspaceRole,
  });

  const recentProjectIds = recentProjects.map((project) => project.id);
  const recentEstimateProjectIds = [...new Set([...recentProjectIds, ...favoriteProjectIds])];
  const limitedFavoriteEstimateIds = favoriteEstimateIds.slice(0, WORKSHOP_HOMEBASE_FAVORITE_ESTIMATE_LIMIT);
  const recentEstimatesPromise: Promise<WorkshopEstimateRecord[]> =
    recentEstimateProjectIds.length > 0
      ? all<WorkshopEstimateRecord>(
          database,
          `SELECT id, project_id, name, sheet_code, updated_at
           FROM estimates
           WHERE project_id IN (${placeholders(recentEstimateProjectIds)})
           ORDER BY updated_at DESC, id DESC
           LIMIT ?`,
          [...recentEstimateProjectIds, WORKSHOP_HOMEBASE_ITEM_LIMIT],
        )
      : Promise.resolve([]);
  const favoriteEstimatesPromise: Promise<WorkshopEstimateRecord[]> =
    limitedFavoriteEstimateIds.length > 0
      ? all<WorkshopEstimateRecord>(
          database,
          `SELECT id, project_id, name, sheet_code, updated_at
           FROM estimates
           WHERE id IN (${placeholders(limitedFavoriteEstimateIds)})`,
          limitedFavoriteEstimateIds,
        )
      : Promise.resolve([]);

  const [recentEstimateRows, favoriteEstimateResultRows] = await traced("homebase.H3H4.estimates", () =>
    Promise.all([recentEstimatesPromise, favoriteEstimatesPromise]),
  );

  const accessibleHomebaseEstimateIds = await readAccessibleEstimateIdSet(
    database,
    [...new Set([...recentEstimateRows.map((estimate) => estimate.id), ...favoriteEstimateResultRows.map((estimate) => estimate.id)])],
    context,
  );
  const accessibleRecentEstimateRows = recentEstimateRows.filter((estimate) => accessibleHomebaseEstimateIds.has(estimate.id));
  const accessibleFavoriteEstimateRows = favoriteEstimateResultRows.filter((estimate) => accessibleHomebaseEstimateIds.has(estimate.id));
  const recentEstimates = sortByUpdatedAtDescThenIdDesc(accessibleRecentEstimateRows);
  const favoriteEstimates = sortByFavoriteCreatedAt(
    accessibleFavoriteEstimateRows,
    estimateFavoriteCreatedAt,
  );
  const estimates = mergeHomebaseRecords(recentEstimates, favoriteEstimates);
  const estimateProjectIds = [...new Set(estimates.map((estimate) => estimate.project_id))];
  const initialKnownProjectIds = new Set(recentProjectIds);
  const missingProjectIds = estimateProjectIds.filter((projectId) => !initialKnownProjectIds.has(projectId));
  const backfillProjectIds = [...new Set([...favoriteProjectIds, ...missingProjectIds])];

  let backfillProjects: WorkshopProjectRecord[] = [];
  if (backfillProjectIds.length > 0) {
    backfillProjects = await traced("homebase.H2H5.projects", () =>
      all<WorkshopProjectRecord>(
        database,
        `SELECT id, name, client_name, project_code, location, status, updated_at, workspace_id, created_by
         FROM projects
         WHERE id IN (${placeholders(backfillProjectIds)})`,
        backfillProjectIds,
      ).then((rows) => rows.map((row) => normalizeProjectRow(row as ProjectRow) as WorkshopProjectRecord)),
    );
  }

  const favoriteProjects = backfillProjects.filter((project) => projectFavoriteCreatedAt.has(project.id));
  const visibleFavoriteProjectIds = new Set(favoriteProjects.map((project) => project.id));
  const removedProjectFavorites = filterMapBy(
    rawFavoriteProjectIds,
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
  const allProjectIds = [...new Set(projects.map((project) => project.id))];
  const manageableProjectIds = filterMapBy(
    projects,
    (project) => canManageCollaborationRole(resolveProjectAccess(project).currentUserRole),
    (project) => project.id,
  );
  const estimateIds = estimates.map((estimate) => estimate.id);
  const estimateNodesPromise: Promise<WorkshopEstimateNodeRecord[]> =
    estimateIds.length > 0
      ? all<WorkshopEstimateNodeRecord>(
          database,
          `SELECT id, estimate_id, kind, parent_id, sort_order
           FROM estimate_nodes
           WHERE estimate_id IN (${placeholders(estimateIds)})
           ORDER BY sort_order ASC`,
          estimateIds,
        )
      : Promise.resolve([]);

  const [homebasePublicationRows, pendingInviteVisibility, estimateNodes] = await traced("homebase.H6H7H8.tail", () => Promise.all([
    readOptionalProjectPublications(database, allProjectIds),
    readPendingCollaborationVisibilitySummary({
      database,
      email: profile.email,
      projectIds: manageableProjectIds,
    }),
    estimateNodesPromise,
  ]));

  const homebasePublicationByProjectId = new Map<string, ProjectPublicationListRow>();
  for (const publication of homebasePublicationRows) {
    if (!homebasePublicationByProjectId.has(publication.project_id)) {
      homebasePublicationByProjectId.set(publication.project_id, publication);
    }
  }
  const firstNodeByEstimateId = selectFirstEstimateNodeIds(estimateNodes);

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
        canManagePublication: isPlatformAdminRole(profile.role) || canManageCollaborationRole(access.currentUserRole),
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

function toMainSidebarFavoriteProject(row: MainSidebarFavoriteProjectRpcRow): MainSidebarFavoriteProject {
  return {
    favoriteEstimateSheets: row.favorite_estimate_sheets.map((sheet) => ({
      href: `/workshop/projects/${sheet.project_id}/estimates/${sheet.id}`,
      id: sheet.id,
      name: sheet.name,
      projectId: sheet.project_id,
      sheetCode: sheet.sheet_code,
      favoriteCreatedAt: sheet.favorite_created_at,
    })),
    href: `/workshop/projects/${row.id}`,
    id: row.id,
    name: row.name,
    projectCode: row.project_code,
    favoriteCreatedAt: row.favorite_created_at,
    projectFavoriteCreatedAt: row.project_favorite_created_at,
  };
}

export const listMainSidebarFavoriteProjects = cache(async function listMainSidebarFavoriteProjects(): Promise<MainSidebarFavoriteProject[]> {
  const rpcResult = await listMainSidebarFavoriteProjectsRpcPath();
  if (rpcResult) return rpcResult;
  return listMainSidebarFavoriteProjectsAppPath();
});

async function listMainSidebarFavoriteProjectsRpcPath(): Promise<MainSidebarFavoriteProject[] | null> {
  return null;
}

async function filterAccessibleSidebarProjectIds(
  database: D1DatabaseLike,
  projectIds: string[],
  profile: ProfileRow,
) {
  // ponytail: batched authz fix (WP-P1-03, 2026-07-05). Replaced the per-project
  // Promise.all(canAccessProjectInD1) loop — which issued 3N EXISTS probes for
  // N sidebar favorites — with a single batched SQL query that lifts the
  // membership access branches into one prepared statement.
  // The platform-admin JS short-circuit is preserved before any SQL.
  // Santa-loop round 2: wrapped in try/catch to preserve the fail-closed
  // semantics of canAccessProjectInD1's runAllowedProbe — on D1 error, return
  // an empty list (deny all) instead of throwing.
  if (isPlatformAdminRole(profile.role)) return projectIds;
  if (projectIds.length === 0) return [];

  const userId = profile.id;
  try {
    const accessibleRows = await all<{ id: string }>(
      database,
      `SELECT project.id
       FROM projects project
       WHERE project.id IN (${placeholders(projectIds)})
         AND (
           EXISTS (
             SELECT 1
             FROM workspace_members workspace_member
             WHERE workspace_member.workspace_id = project.workspace_id
               AND workspace_member.user_id = ?
           )
           OR EXISTS (
             SELECT 1
             FROM project_members project_member
             WHERE project_member.project_id = project.id
               AND project_member.user_id = ?
           )
           OR EXISTS (
             SELECT 1
             FROM estimate_sheet_members sheet_member
             WHERE sheet_member.project_id = project.id
               AND sheet_member.user_id = ?
           )
         )`,
      [...projectIds, userId, userId, userId],
    );
    const accessibleSet = new Set(accessibleRows.map((row) => row.id));
    // Preserve input order: callers rely on the favorite-ranking order produced
    // by the upstream sort, not on SQL row order.
    return projectIds.filter((id) => accessibleSet.has(id));
  } catch {
    // Fail-closed parity with runAllowedProbe in src/lib/authz/d1-access.ts:27-38.
    // On D1 error or query failure, deny all sidebar favorites rather than throw.
    return [];
  }
}

// ponytail: test seam for behavioral tests under tests/vitest/. Marked with
// the __testing__ prefix to keep the public API surface clean. Not used by any
// runtime consumer.
export const __testing__filterAccessibleSidebarProjectIds = filterAccessibleSidebarProjectIds;

async function listMainSidebarFavoriteProjectsAppPath(): Promise<MainSidebarFavoriteProject[]> {
  const { profile } = await ensureDefaultWorkspace();
  const database = await requireWorkspaceRepositoryD1Database();

  const [favoriteProjectRows, estimateFavoriteProjectCandidateRows] = await Promise.all([
    all<WorkshopHomebaseFavoriteProjectRef>(
      database,
      `SELECT project_id, created_at
       FROM project_favorites
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [profile.id, MAIN_SIDEBAR_FAVORITE_PROJECT_LIMIT],
    ),
    all<{ project_id: string; created_at: string }>(
      database,
      `SELECT project_id, created_at
       FROM estimate_favorites
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [profile.id, MAIN_SIDEBAR_FAVORITE_FALLBACK_ESTIMATE_SCAN_LIMIT],
    ),
  ]);

  const latestEstimateFavoriteCreatedAtByProjectId = new Map<string, string>();
  for (const favorite of estimateFavoriteProjectCandidateRows) {
    if (!latestEstimateFavoriteCreatedAtByProjectId.has(favorite.project_id)) {
      latestEstimateFavoriteCreatedAtByProjectId.set(favorite.project_id, favorite.created_at);
    }
  }

  const projectFavoriteCandidateCreatedAtById = new Map(favoriteProjectRows.map((favorite) => [favorite.project_id, favorite.created_at]));
  const favoriteProjectIds = favoriteProjectRows.map((favorite) => favorite.project_id);
  const favoriteEstimateProjectIds = [...latestEstimateFavoriteCreatedAtByProjectId.keys()];
  const sidebarProjectIds = [...new Set([...favoriteProjectIds, ...favoriteEstimateProjectIds])]
    .map((projectId) => {
      const favoriteCreatedAtCandidates = [
        projectFavoriteCandidateCreatedAtById.get(projectId),
        latestEstimateFavoriteCreatedAtByProjectId.get(projectId),
      ]
        .filter((timestamp): timestamp is string => Boolean(timestamp))
        .sort();
      return {
        projectId,
        favoriteCreatedAt: favoriteCreatedAtCandidates[favoriteCreatedAtCandidates.length - 1],
      };
    })
    .filter((candidate): candidate is { projectId: string; favoriteCreatedAt: string } => Boolean(candidate.favoriteCreatedAt))
    .sort((left, right) => {
      if (left.favoriteCreatedAt < right.favoriteCreatedAt) return 1;
      if (left.favoriteCreatedAt > right.favoriteCreatedAt) return -1;
      return right.projectId.localeCompare(left.projectId);
    })
    .slice(0, MAIN_SIDEBAR_FAVORITE_PROJECT_LIMIT)
    .map((candidate) => candidate.projectId);
  if (sidebarProjectIds.length === 0) return [];
  const accessibleSidebarProjectIds = await filterAccessibleSidebarProjectIds(
    database,
    sidebarProjectIds,
    profile,
  );
  if (accessibleSidebarProjectIds.length === 0) return [];

  const [projects, selectedProjectFavorites, favoriteEstimateRows] = await Promise.all([
    all<Pick<Tables<"projects">, "id" | "name" | "project_code">>(
      database,
      `SELECT id, name, project_code
       FROM projects
       WHERE id IN (${placeholders(accessibleSidebarProjectIds)})`,
      accessibleSidebarProjectIds,
    ),
    all<WorkshopHomebaseFavoriteProjectRef>(
      database,
      `SELECT project_id, created_at
       FROM project_favorites
       WHERE user_id = ?
         AND project_id IN (${placeholders(accessibleSidebarProjectIds)})`,
      [profile.id, ...accessibleSidebarProjectIds],
    ),
    all<WorkshopHomebaseFavoriteEstimateRef>(
      database,
      `SELECT estimate_id, project_id, created_at
       FROM estimate_favorites
       WHERE user_id = ?
         AND project_id IN (${placeholders(accessibleSidebarProjectIds)})
       ORDER BY project_id ASC, created_at DESC`,
      [profile.id, ...accessibleSidebarProjectIds],
    ),
  ]);

  const favoriteEstimateIds = favoriteEstimateRows.map((favorite) => favorite.estimate_id);
  const estimates = favoriteEstimateIds.length > 0
    ? await all<Pick<Tables<"estimates">, "id" | "project_id" | "name" | "sheet_code">>(
        database,
        `SELECT id, project_id, name, sheet_code
         FROM estimates
         WHERE id IN (${placeholders(favoriteEstimateIds)})`,
        favoriteEstimateIds,
      )
    : [];
  const estimateById = new Map(estimates.map((estimate) => [estimate.id, estimate]));
  const projectFavoriteCreatedAtById = new Map(
    selectedProjectFavorites.map((favorite) => [favorite.project_id, favorite.created_at]),
  );

  const sheetsByProjectId = favoriteEstimateRows.reduce((byProject, favorite) => {
    const estimate = estimateById.get(favorite.estimate_id);
    if (!estimate) return byProject;
    const sheets = byProject.get(estimate.project_id) ?? [];
    if (sheets.length >= MAIN_SIDEBAR_FAVORITE_SHEET_LIMIT) return byProject;
    sheets.push({
      href: `/workshop/projects/${estimate.project_id}/estimates/${estimate.id}`,
      id: estimate.id,
      name: estimate.name,
      projectId: estimate.project_id,
      sheetCode: estimate.sheet_code,
      favoriteCreatedAt: favorite.created_at,
    });
    byProject.set(estimate.project_id, sheets);
    return byProject;
  }, new Map<string, MainSidebarFavoriteProject["favoriteEstimateSheets"]>());

  const projectById = new Map(projects.map((project) => [project.id, project]));

  return accessibleSidebarProjectIds
    .flatMap((projectId): MainSidebarFavoriteProject[] => {
      const project = projectById.get(projectId);
      if (!project) return [];
      const favoriteEstimateSheets = sheetsByProjectId.get(project.id) ?? [];
      const projectFavoriteCreatedAt = projectFavoriteCreatedAtById.get(project.id) ?? null;
      const favoriteCreatedAtCandidates = [projectFavoriteCreatedAt, favoriteEstimateSheets[0]?.favoriteCreatedAt]
        .filter((timestamp): timestamp is string => Boolean(timestamp))
        .sort();
      const favoriteCreatedAt = favoriteCreatedAtCandidates[favoriteCreatedAtCandidates.length - 1];
      if (!favoriteCreatedAt) return [];
      return [
        {
          favoriteEstimateSheets,
          href: `/workshop/projects/${project.id}`,
          id: project.id,
          name: project.name,
          projectCode: project.project_code,
          favoriteCreatedAt,
          projectFavoriteCreatedAt,
        },
      ];
    })
    .sort((left, right) => (left.favoriteCreatedAt < right.favoriteCreatedAt ? 1 : -1))
    .slice(0, MAIN_SIDEBAR_FAVORITE_PROJECT_LIMIT);
}

export const getCurrentWorkspaceProject = cache(async function getCurrentWorkspaceProject(projectId: string) {
  if (!isUuid(projectId)) {
    return readDefaultWorkspaceProjectContext();
  }

  const database = await traced("workspace-project.d1-client", () => requireWorkspaceRepositoryD1Database());
  const contextPromise = traced("workspace-project.current-user", () => requireCurrentUserContext());
  const projectPromise = getCachedWorkspaceProjectRow(projectId);
  const [context, projectRow] = await Promise.all([contextPromise, projectPromise]);
  if (!projectRow) return readDefaultWorkspaceProjectContext();

  const canAccessProject = await traced("workspace-project.access-check", () =>
    canAccessWholeProjectInD1(database, projectRow.id, context),
  );
  if (!canAccessProject) return readDefaultWorkspaceProjectContext();

  return readWorkspaceProjectContext(database, projectRow);
});

export const getCurrentWorkspaceProjectForEstimate = cache(async function getCurrentWorkspaceProjectForEstimate(
  projectId: string,
  estimateId: string,
) {
  if (!isUuid(projectId) || !isUuid(estimateId)) return readDefaultWorkspaceProjectContext();

  const database = await traced("workspace-estimate-project.d1-client", () => requireWorkspaceRepositoryD1Database());
  const contextPromise = traced("workspace-estimate-project.current-user", () => requireCurrentUserContext());
  const projectPromise = getCachedWorkspaceProjectRow(projectId);
  const [context, projectRow] = await Promise.all([contextPromise, projectPromise]);
  if (!projectRow) return readDefaultWorkspaceProjectContext();

  const estimate = await readEstimateForProject(database, estimateId, projectRow.id);
  if (!estimate) return readDefaultWorkspaceProjectContext();

  const canAccessEstimate = await traced("workspace-estimate-project.estimate-access-check", () =>
    canAccessEstimateInD1(database, estimate.id, context),
  );
  if (!canAccessEstimate) return readDefaultWorkspaceProjectContext();

  return readWorkspaceProjectContext(database, projectRow);
});

async function readDefaultWorkspaceProjectContext() {
  const { workspace: defaultWorkspace } = await traced("workspace-project.ensure-default-workspace", () => ensureDefaultWorkspace());
  return { workspace: defaultWorkspace, project: null };
}

async function readProjectForWorkspaceContext(database: D1DatabaseLike, projectId: string): Promise<ProjectRow | null> {
  const project = await traced("workspace-project.project-lookup", () =>
    first<ProjectRow>(
      database,
      `SELECT id, workspace_id, created_by, name, client_name, location, project_code, currency_code, metadata, created_at, updated_at
       FROM projects
       WHERE id = ?
       LIMIT 1`,
      [projectId],
    ),
  );
  return project ? normalizeProjectRow(project) : null;
}

// The whole-project and estimate-scoped authorization paths need the same row,
// but must apply different access predicates after reading it.
const getCachedWorkspaceProjectRow = cache(async function getCachedWorkspaceProjectRow(projectId: string) {
  const database = await requireWorkspaceRepositoryD1Database();
  return readProjectForWorkspaceContext(database, projectId);
});

async function readWorkspaceProjectContext(database: D1DatabaseLike, projectRow: ProjectRow) {
  const projectWorkspace = await readWorkspaceById(database, projectRow.workspace_id);
  if (projectWorkspace) return { workspace: projectWorkspace, project: projectRow };

  const { workspace: defaultWorkspace } = await readDefaultWorkspaceProjectContext();
  return { workspace: defaultWorkspace, project: projectRow };
}

// Request-scoped dedupe of project_members (Teamspace plan T2.2 / F-P8 / F10).
// The collaboration summary AND the publication summary both read this table in
// the same project-layout render; wrapping in React `cache()` collapses the two
// fetches into one round-trip per request, the same pattern as
// `getCachedWorkspaceProjectRow`.
const getCachedProjectMembers = cache(async function getCachedProjectMembers(projectId: string) {
  const database = await requireWorkspaceRepositoryD1Database();
  return readOptionalProjectMembers(database, projectId);
});

export async function getProjectCollaborationSummary(projectId: string): Promise<ProjectCollaborationSummary | null> {
  const context = await requireCurrentUserContext();
  const { profile } = await ensureDefaultWorkspace();
  if (!isUuid(projectId)) return null;

  const databasePromise = requireWorkspaceRepositoryD1Database();
  const projectPromise = getCachedWorkspaceProjectRow(projectId);
  const [database, project] = await Promise.all([databasePromise, projectPromise]);
  if (!project) return null;

  // A direct restricted-sheet manager cannot open the broader project surface,
  // but may manage the sheets they are explicitly authorized to administer.
  // The Team summary is scoped below to those sheets in that case.
  const canAccessWholeProject = await canAccessWholeProjectInD1(database, project.id, context);

  // T2.3 / F-P1: workspace_members and estimates are independent of each other —
  // run them in a single parallel wave instead of two serial round-trips.
  const [workspaceMembers, rawEstimates] = await Promise.all([
    canAccessWholeProject
      ? all<Pick<Tables<"workspace_members">, "workspace_id" | "user_id" | "role">>(
        database,
        `SELECT workspace_id, user_id, role
         FROM workspace_members
         WHERE workspace_id = ?`,
        [project.workspace_id],
      )
      : Promise.resolve([]),
    all<Pick<Tables<"estimates">, "id" | "project_id" | "name" | "sheet_code">>(
      database,
      `SELECT id, project_id, name, sheet_code
       FROM estimates
       WHERE project_id = ?
       ORDER BY sheet_code ASC`,
      [project.id],
    ),
  ]);
  const estimates = await filterAccessibleEstimates(database, rawEstimates ?? [], context);
  if (!canAccessWholeProject && estimates.length === 0) return null;

  const estimateIds = (estimates ?? []).map((estimate) => estimate.id);
  const [projectMembers, sheetMembers, sheetSettings, pendingInvitationRows] = await Promise.all([
    canAccessWholeProject ? getCachedProjectMembers(project.id) : Promise.resolve([]),
    readOptionalEstimateSheetMembers(database, estimateIds),
    readOptionalEstimateSheetAccessSettings(database, estimateIds),
    readOptionalCollaborationInvitations(database, project.id),
  ]);
  const directProjectRoleByUserId = new Map(projectMembers.map((member) => [member.user_id, member.role]));

  const collaboratorRoles = new Map<
    string,
    {
      role: CollaborationRole;
      source: ProjectCollaboratorSummary["source"];
    }
  >();
  let currentUserProjectLevelRole: CollaborationRole | undefined;

  const canReadProjectRoster = canReadProjectCollaborationRoster({
    context,
    profileId: profile.id,
    project,
    projectMembers,
    workspaceMembers: workspaceMembers ?? [],
  });

  if (canReadProjectRoster) {
    for (const member of workspaceMembers ?? []) {
      const role = mapWorkspaceRoleToCollaborationRole(member.role);
      collaboratorRoles.set(member.user_id, {
        role,
        source: "workspace",
      });
      if (member.user_id === profile.id) {
        currentUserProjectLevelRole = readHighestCollaborationRole(currentUserProjectLevelRole, role);
      }
    }

    for (const member of projectMembers) {
      const existing = collaboratorRoles.get(member.user_id);
      const role = readHighestCollaborationRole(existing?.role, member.role);
      collaboratorRoles.set(member.user_id, {
        role,
        source: role === existing?.role ? existing.source : "project",
      });
      if (member.user_id === profile.id) {
        currentUserProjectLevelRole = readHighestCollaborationRole(currentUserProjectLevelRole, member.role);
      }
    }
  }

  for (const member of sheetMembers) {
    const existing = collaboratorRoles.get(member.user_id);
    const role = readHighestCollaborationRole(existing?.role, member.role);
    collaboratorRoles.set(member.user_id, {
      role,
      source: role === existing?.role ? existing.source : "sheet",
    });
  }

  if (!collaboratorRoles.has(profile.id) && canReadProjectRoster && project.created_by === profile.id) {
    collaboratorRoles.set(profile.id, {
      role: mapWorkspaceRoleToCollaborationRole("owner"),
      source: "workspace",
    });
    currentUserProjectLevelRole = readHighestCollaborationRole(currentUserProjectLevelRole, "owner");
  } else if (!collaboratorRoles.has(profile.id) && isPlatformAdminContext(context)) {
    collaboratorRoles.set(profile.id, {
      role: mapWorkspaceRoleToCollaborationRole("admin"),
      source: "workspace",
    });
    currentUserProjectLevelRole = readHighestCollaborationRole(currentUserProjectLevelRole, "admin");
  }

  const collaboratorIds = [...collaboratorRoles.keys()];
  const profiles = await readCollaborationProfiles(database, collaboratorIds);
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
      directProjectRole: canReadProjectRoster ? directProjectRoleByUserId.get(userId) ?? null : null,
      // Presence is a realtime overlay. Server-rendered membership must not
      // imply that the current user (or any collaborator) has an active room.
      online: false,
    };
  });

  const sheetMemberCountByEstimateId = new Map<string, number>();
  const directSheetMemberIdsByEstimateId = new Map<string, Set<string>>();
  const currentUserSheetRoleByEstimateId = new Map<string, CollaborationRole>();
  const sheetMembersByEstimateId = new Map<string, EstimateSheetMemberSummary[]>();
  for (const member of sheetMembers) {
    sheetMemberCountByEstimateId.set(member.estimate_id, (sheetMemberCountByEstimateId.get(member.estimate_id) ?? 0) + 1);
    const memberIds = directSheetMemberIdsByEstimateId.get(member.estimate_id) ?? new Set<string>();
    memberIds.add(member.user_id);
    directSheetMemberIdsByEstimateId.set(member.estimate_id, memberIds);
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
      // The summary remains an authorization snapshot; live presence arrives
      // separately from the authorized realtime client.
      online: false,
      estimateId: member.estimate_id,
    };
    const existing = sheetMembersByEstimateId.get(member.estimate_id) ?? [];
    existing.push(summary);
    sheetMembersByEstimateId.set(member.estimate_id, existing);
  }

  const sheetInheritanceByEstimateId = new Map(sheetSettings.map((settings) => [settings.estimate_id, settings.inherit_project_access]));
  const currentUserRole = collaboratorRoles.get(profile.id)?.role ?? "viewer";
  const canManageAccess = Boolean(currentUserProjectLevelRole && canManageCollaborationRole(currentUserProjectLevelRole));
  const eligibleProjectMemberCandidates: EligibleProjectMemberCandidate[] = canManageAccess
    ? (workspaceMembers ?? [])
      .filter((member) => member.user_id !== profile.id && !directProjectRoleByUserId.has(member.user_id))
      .flatMap((member) => {
        const candidateProfile = profiles.get(member.user_id);
        if (!candidateProfile) return [];
        return [{
          id: member.user_id,
          displayName: readProfileDisplayName(candidateProfile, member.user_id),
          email: candidateProfile.email ?? null,
        }];
      })
      .sort((left, right) => left.displayName.localeCompare(right.displayName))
    : [];
  const accessibleEstimateIds = new Set(estimateIds);
  const estimateSheets = (estimates ?? []).map((estimate) => {
    const overrideCount = sheetMemberCountByEstimateId.get(estimate.id) ?? 0;
    const inheritsProjectAccess = sheetInheritanceByEstimateId.get(estimate.id) ?? true;
    const accessMode: EstimateSheetAccessMode = inheritsProjectAccess
      ? overrideCount > 0
        ? "sheet-overrides"
        : "inherits-project"
      : "restricted";
    const currentUserRoleAtEstimate = inheritsProjectAccess
      ? readHighestCollaborationRole(currentUserProjectLevelRole, currentUserSheetRoleByEstimateId.get(estimate.id) ?? "viewer") ?? "viewer"
      : currentUserSheetRoleByEstimateId.get(estimate.id) ?? "viewer";
    const canManageEstimateAccess = canManageAccess || canManageCollaborationRole(currentUserSheetRoleByEstimateId.get(estimate.id) ?? "viewer");
    const eligibleMemberCandidates: EligibleProjectMemberCandidate[] = canManageEstimateAccess && canReadProjectRoster
      ? collaboratorIds
        .filter((userId) => userId !== profile.id && !directSheetMemberIdsByEstimateId.get(estimate.id)?.has(userId))
        .flatMap((userId) => {
          const candidateProfile = profiles.get(userId);
          if (!candidateProfile) return [];
          return [{
            id: userId,
            displayName: readProfileDisplayName(candidateProfile, userId),
            email: candidateProfile.email ?? null,
          }];
        })
        .sort((left, right) => left.displayName.localeCompare(right.displayName))
      : [];

    return {
      estimateId: estimate.id,
      sheetCode: estimate.sheet_code,
      name: estimate.name,
      accessMode,
      overrideCount,
      canManageAccess: canManageEstimateAccess,
      currentUserRole: currentUserRoleAtEstimate,
      eligibleMemberCandidates,
      members: sheetMembersByEstimateId.get(estimate.id) ?? [],
    };
  });
  const pendingInvitations: CollaborationInvitationSummary[] = pendingInvitationRows
    .filter((invitation) => {
      const scope = normalizePendingInviteScope(invitation.scope);
      if (canReadProjectRoster && scope === "project") return true;
      return scope === "estimate" && Boolean(invitation.estimate_id && accessibleEstimateIds.has(invitation.estimate_id));
    })
    .filter((invitation): invitation is CollaborationInvitationRow & { scope: "project" | "estimate" } => invitation.scope === "project" || invitation.scope === "estimate")
    .map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      scope: invitation.scope,
      estimateId: invitation.estimate_id,
      expiresAt: invitation.expires_at,
      canManage: invitation.scope === "project"
        ? canManageAccess
        : Boolean(invitation.estimate_id && estimateSheets.find((sheet) => sheet.estimateId === invitation.estimate_id)?.canManageAccess),
    }));

  return {
    projectId: project.id,
    workspaceId: project.workspace_id,
    currentUserId: profile.id,
    currentUserRole,
    canManageAccess,
    collaborators,
    eligibleProjectMemberCandidates,
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

  const database = await requireWorkspaceRepositoryD1Database();

  const [workspaceMembership, projectMembers, publication] = await Promise.all([
    first<WorkspaceMembershipRoleRow>(
      database,
      `SELECT role
       FROM workspace_members
       WHERE workspace_id = ?
         AND user_id = ?
       LIMIT 1`,
      [project.workspace_id, profile.id],
    ),
    getCachedProjectMembers(project.id),
    readOptionalProjectPublication(database, project.id),
  ]);

  const workspaceRole =
    workspaceMembership?.role ?? (project.workspace_id === workspace.id && workspace.created_by === profile.id ? "owner" : undefined);
  const projectRole = projectMembers.find((member) => member.user_id === profile.id)?.role;
  const currentUserRole = readHighestCollaborationRole(
    workspaceRole ? mapWorkspaceRoleToCollaborationRole(workspaceRole) : undefined,
    projectRole ?? "viewer",
  );
  const canReadPublisherRoster = currentUserRole !== "viewer";
  const canManagePublication = isPlatformAdminRole(profile.role) || canManageCollaborationRole(currentUserRole);
  const publicationStatus = readPublicationStatus(publication);
  const clientLinkPath = publicationStatus === "published" ? readPublicationClientLinkPath(publication) : null;
  const [latestEstimateUpdatedAt, latestRecipientOpen, latestCommentAt, latestResponseAt] = publication
    ? await Promise.all([
        readLatestEstimateUpdatedAt(database, project.id, publication.selected_estimate_ids ?? []),
        canManagePublication ? readLatestSharedLinkRecipientOpen(database, publication.id) : Promise.resolve(null),
        canManagePublication ? readLatestSharedLinkCommentAt(database, publication.id) : Promise.resolve(null),
        canManagePublication ? readLatestSharedLinkResponseAt(database, publication.id) : Promise.resolve(null),
      ])
    : [null, null, null, null];
  // MOD-MET / AC-MOD-07: surface the freshest manager-relevant moment so the
  // header dot lights on new comments/decisions, not just opens.
  const latestActivityAt = canManagePublication
    ? readLatestPublicationActivityTimestamp([latestCommentAt, latestResponseAt, publication?.latest_opened_at ?? null])
    : null;
  const revisionStaleness = readPublicationRevisionStaleness({
    currentSourceRevision: publication?.current_source_revision,
    snapshot: publication?.snapshot_json,
  });
  const staleSnapshotWarning = revisionStaleness === undefined
    ? readPublicationSnapshotStaleness({
        latestEstimateUpdatedAt,
        snapshotGeneratedAt: readSnapshotGeneratedAt(publication?.snapshot_json),
      })
    : revisionStaleness;

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

  const database = await requireWorkspaceRepositoryD1Database();
  const contextPromise = requireCurrentUserContext();
  const estimatesPromise = traced("listProjectEstimates.estimates", () =>
    all<EstimateRecordWithLegacy>(
      database,
      `SELECT ${ESTIMATE_LIST_COLUMNS}
       FROM estimates
       WHERE project_id = ?
       ORDER BY updated_at DESC`,
      [projectId],
    ),
  );
  const [
    { workspace, project },
    estimates,
    context,
  ] = await Promise.all([projectContextPromise, estimatesPromise, contextPromise]);

  if (!project) {
    return {
      workspace,
      project,
      estimates: [],
      ...createEmptyProjectEstimateSummaryMaps(),
    };
  }

  const normalizedEstimates = await filterAccessibleEstimates(
    database,
    estimates.map((estimate) => normalizeEstimateRow(estimate)),
    context,
  );
  const estimateIds = normalizedEstimates.map((estimate) => estimate.id);
  if (estimateIds.length === 0) {
    return {
      workspace,
      project,
      estimates: [],
      ...createEmptyProjectEstimateSummaryMaps(),
    };
  }

  const [summaryRows, nodeRows, rowCostRows] = await Promise.all([
    traced("listProjectEstimates.summaries", () =>
      all<{
        estimate_id: string;
        node_count: number | string | null;
        row_count: number | string | null;
      }>(
        database,
        `SELECT
           estimate.id AS estimate_id,
           (SELECT COUNT(*) FROM estimate_nodes node WHERE node.estimate_id = estimate.id) AS node_count,
           (SELECT COUNT(*) FROM estimate_row_items row_item WHERE row_item.estimate_id = estimate.id) AS row_count
         FROM estimates estimate
         WHERE estimate.id IN (${placeholders(estimateIds)})`,
        estimateIds,
      ),
    ),
    traced("listProjectEstimates.firstNodes", () =>
      all<WorkshopEstimateNodeRecord>(
        database,
        `SELECT id, estimate_id, kind, parent_id, sort_order
         FROM estimate_nodes
         WHERE estimate_id IN (${placeholders(estimateIds)})
         ORDER BY sort_order ASC`,
        estimateIds,
      ),
    ),
    traced("listProjectEstimates.rowCosts", () =>
      all<Pick<EstimateRowItemRow, "estimate_id" | "quantity" | "quantity_base" | "quantity_contingency_amount" | "unit_cost" | "contingency_percentage" | "adjustment_percentage" | "misc_cost">>(
        database,
        `SELECT estimate_id, quantity, quantity_base, quantity_contingency_amount, unit_cost, contingency_percentage, adjustment_percentage, misc_cost
         FROM estimate_row_items
         WHERE estimate_id IN (${placeholders(estimateIds)})`,
        estimateIds,
      ),
    ),
  ]);

  const firstNodeByEstimateId = selectFirstEstimateNodeIds(nodeRows);
  const nodeCountByEstimateId = new Map<string, number>();
  const rowCountByEstimateId = new Map<string, number>();
  const totalCostByEstimateId = new Map<string, number>();
  for (const summary of summaryRows) {
    nodeCountByEstimateId.set(summary.estimate_id, Number(summary.node_count ?? 0));
    rowCountByEstimateId.set(summary.estimate_id, Number(summary.row_count ?? 0));
    totalCostByEstimateId.set(summary.estimate_id, 0);
  }
  for (const row of rowCostRows) {
    totalCostByEstimateId.set(row.estimate_id, (totalCostByEstimateId.get(row.estimate_id) ?? 0) + computeEstimateRowLineTotal(row));
  }

  return { workspace, project, estimates: normalizedEstimates, firstNodeByEstimateId, nodeCountByEstimateId, rowCountByEstimateId, totalCostByEstimateId };
}

/**
 * Lightweight list of estimates for a project (id, name, sheetCode, updatedAt).
 * Used by Publisher drawer sheet pickers without loading heavy node/row aggregates.
 * Additive for Shared Link Overhaul V2 (P1).
 */
export async function listProjectEstimateSheets(projectId: string, options: { limit?: number } = {}): Promise<ProjectEstimateSheetPickerSummary[]> {
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) return [];

  const [database, context, sheets] = await Promise.all([
    requireWorkspaceRepositoryD1Database(),
    requireCurrentUserContext(),
    listProjectEstimateSheetsForProject(project.id, options),
  ]);
  return filterAccessibleEstimates(database, sheets, context);
}

type LiveEstimateTreeResult = {
  workspace: Tables<"workspaces">;
  project: Tables<"projects"> | null;
  estimate: Tables<"estimates"> | null;
  selectedNodeId: string | null;
  tree: EstimateTreeNode[];
  sheetAdjustment?: EstimateSheetAdjustment;
  loadLimitState?: LiveEstimateTreeLoadLimitState;
};

type LiveEstimateTreeLoadOptions = EstimateTreeLoadOptions;
type LiveEstimateTreeLoadLimitState = EstimateTreeLoadLimitState;

type LiveEstimateTabTreeResult = LiveEstimateTreeResult & {
  tab: EstimateTabSummary | null;
};

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

type ResolvedProjectEstimateInput = {
  workspace: Tables<"workspaces">;
  project: Tables<"projects">;
  estimate: EstimateRecordWithLegacy;
};

async function readEstimateForProject(database: D1DatabaseLike, estimateId: string, projectId: string): Promise<EstimateRow | null> {
  const estimate = await first<EstimateRecordWithLegacy>(
    database,
    `SELECT id, project_id, name, sheet_code, notes, project_budget, currency_code, metadata, created_by, created_at, updated_at
     FROM estimates
     WHERE id = ?
       AND project_id = ?
     LIMIT 1`,
    [estimateId, projectId],
  );
  return estimate ? normalizeEstimateRow(estimate) : null;
}

/**
 * Synthetic single-tab id used by the read-only legacy fallback when the
 * estimate-tabs schema is not yet applied.
 */
export const LEGACY_MAIN_TAB_ID = "legacy-main";

function syntheticMainTab(): EstimateTabSummary {
  return { id: LEGACY_MAIN_TAB_ID, name: "Main", sortOrder: 0, isDefault: true };
}

async function getProjectEstimateTreeByEstimateLegacy(
  projectId: string,
  estimateId: string,
  options: LiveEstimateTreeLoadOptions = {},
): Promise<LiveEstimateTreeResult> {
  const { workspace, project } = await getCurrentWorkspaceProjectForEstimate(projectId, estimateId);
  if (!project) return { workspace, project, estimate: null, selectedNodeId: null, tree: [] };

  const database = await requireWorkspaceRepositoryD1Database();
  const estimate = await readEstimateForProject(database, estimateId, project.id);
  if (!estimate) return { workspace, project, estimate: null, selectedNodeId: null, tree: [] };
  const userContext = await requireCurrentUserContext();
  if (!(await canAccessEstimateInD1(database, estimate.id, userContext))) {
    return { workspace, project, estimate: null, selectedNodeId: null, tree: [] };
  }

  return {
    workspace,
    project,
    ...await readLegacyEstimateTreeD1(database, estimate, null, options),
  };
}

/**
 * Read-only legacy fallback for the reusable-source / export paths: present the
 * whole-estimate legacy tree as a single synthetic "Main" tab when
 * estimate_tabs is not yet applied. Forwards load-limit options so export
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
  const { project } = await getCurrentWorkspaceProjectForEstimate(projectId, estimateId);
  if (!project) return [];

  const database = await requireWorkspaceRepositoryD1Database();
  const estimate = await readEstimateForProject(database, estimateId, project.id);
  if (!estimate) return [];
  const userContext = await requireCurrentUserContext();
  if (!(await canAccessEstimateInD1(database, estimate.id, userContext))) return [];

  try {
    return await readEstimateTabsD1(database, estimate.id, options);
  } catch (error) {
    if (options.allowLegacyFallback && isEstimateTabsSchemaMissing(error)) {
      return [syntheticMainTab()];
    }
    throw error;
  }
}

/**
 * Resolves whether the current user can edit this estimate using the same
 * can_edit_estimate RPC that RLS and assertCanEditEstimate rely on.
 */
export async function resolveEstimateEditCapability(estimateId: string): Promise<boolean> {
  if (await isDevAdminDatabaseBypassActiveForRequest()) return true;

  try {
    const [database, context] = await Promise.all([
      requireWorkspaceRepositoryD1Database(),
      requireCurrentUserContext(),
    ]);
    return canEditEstimateInD1(database, estimateId, context);
  } catch {
    return false;
  }
}

export async function getDefaultEstimateTab(estimateId: string): Promise<EstimateTabSummary | null> {
  const database = await requireWorkspaceRepositoryD1Database();
  return readDefaultEstimateTabD1(database, estimateId);
}

export async function getEstimateTabTree(
  projectId: string,
  estimateId: string,
  tabId: string,
  options: LiveEstimateTreeLoadOptions = {},
): Promise<LiveEstimateTabTreeResult> {
  if (options.allowLegacyFallback && tabId === LEGACY_MAIN_TAB_ID) {
    return buildLegacyTabTree(projectId, estimateId, options);
  }

  const { workspace, project } = await getCurrentWorkspaceProjectForEstimate(projectId, estimateId);
  if (!project) return { workspace, project, estimate: null, tab: null, selectedNodeId: null, tree: [] };

  const database = await requireWorkspaceRepositoryD1Database();
  const estimate = await readEstimateForProject(database, estimateId, project.id);
  if (!estimate) return { workspace, project, estimate: null, tab: null, selectedNodeId: null, tree: [] };
  const userContext = await requireCurrentUserContext();
  if (!(await canAccessEstimateInD1(database, estimate.id, userContext))) {
    return { workspace, project, estimate: null, tab: null, selectedNodeId: null, tree: [] };
  }

  return {
    workspace,
    project,
    ...await readEstimateTabTreeD1(database, estimate, tabId, options),
  };
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
  const { workspace, project } = await getCurrentWorkspaceProjectForEstimate(projectId, estimateId);
  if (!project) return { workspace, project, estimate: null, tab: null, selectedNodeId: null, tree: [], payload: null };

  const database = await requireWorkspaceRepositoryD1Database();
  const estimate = await readEstimateForProject(database, estimateId, project.id);
  if (!estimate) return { workspace, project, estimate: null, tab: null, selectedNodeId: null, tree: [], payload: null };
  const userContext = await requireCurrentUserContext();
  if (!(await canAccessEstimateInD1(database, estimate.id, userContext))) {
    return { workspace, project, estimate: null, tab: null, selectedNodeId: null, tree: [], payload: null };
  }

  return {
    workspace,
    project,
    ...await readEstimateNodeSubtreeD1(database, estimate, nodeId, input),
  };
}

async function getEstimateTabTreeForResolvedEstimateTab(
  database: D1DatabaseLike,
  resolved: ResolvedProjectEstimateInput,
  tab: EstimateTabSummary,
  options: LiveEstimateTreeLoadOptions = {},
): Promise<LiveEstimateTabTreeResult> {
  const result = await getEstimateTabTreeForResolvedTabId(database, resolved, tab.id, options);
  return { ...result, tab };
}

async function getEstimateTabTreeForResolvedTabId(
  database: D1DatabaseLike,
  resolved: ResolvedProjectEstimateInput,
  tabId: string,
  options: LiveEstimateTreeLoadOptions = {},
): Promise<Omit<LiveEstimateTabTreeResult, "tab">> {
  return {
    workspace: resolved.workspace,
    project: resolved.project,
    ...await readEstimateTabTreePayloadD1(database, resolved.estimate, tabId, options),
  };
}

export function clearEstimateRouteContextProcessCache(projectId?: string) {
  void projectId;
}

async function readEstimateNodeRouteContextD1FastPath(
  database: D1DatabaseLike,
  projectId: string,
  routeSegment: string,
  userContext: Awaited<ReturnType<typeof requireCurrentUserContext>>,
  options: LiveEstimateTreeLoadOptions,
): Promise<EstimateTabRouteContext | null> {
  if (!isUuid(routeSegment)) return null;
  const routeRow = await traced("estimate-route-context.fast-selected-node", () =>
    traced("estimate.route.selected-node", () =>
      first<{
        node_id: string;
        estimate_tab_id: string | null;
        estimate_id: string;
        estimate_project_id: string;
        estimate_name: string;
        estimate_sheet_code: string;
        estimate_notes: string | null;
        estimate_project_budget: number | null;
        estimate_currency_code: string;
        estimate_metadata: Json;
        estimate_created_by: string | null;
        estimate_created_at: string;
        estimate_updated_at: string;
        project_workspace_id: string;
        project_created_by: string | null;
        project_name: string;
        project_client_name: string | null;
        project_location: string | null;
        project_code: string | null;
        project_currency_code: string;
        project_status: ProjectStatus;
        project_metadata: Json;
        project_created_at: string;
        project_updated_at: string;
        workspace_created_by: string | null;
        workspace_name: string;
        workspace_slug: string | null;
        workspace_closed_at: string | null;
        workspace_created_at: string;
        workspace_updated_at: string;
      }>(
        database,
        `SELECT node.id AS node_id, node.estimate_tab_id,
                estimate.id AS estimate_id, estimate.project_id AS estimate_project_id,
                estimate.name AS estimate_name, estimate.sheet_code AS estimate_sheet_code,
                estimate.notes AS estimate_notes, estimate.project_budget AS estimate_project_budget,
                estimate.currency_code AS estimate_currency_code, estimate.metadata AS estimate_metadata,
                estimate.created_by AS estimate_created_by, estimate.created_at AS estimate_created_at,
                estimate.updated_at AS estimate_updated_at,
                project.workspace_id AS project_workspace_id, project.created_by AS project_created_by,
                project.name AS project_name, project.client_name AS project_client_name,
                project.location AS project_location, project.project_code,
                project.currency_code AS project_currency_code, project.status AS project_status,
                project.metadata AS project_metadata, project.created_at AS project_created_at,
                project.updated_at AS project_updated_at,
                workspace.created_by AS workspace_created_by, workspace.name AS workspace_name,
                workspace.slug AS workspace_slug, workspace.closed_at AS workspace_closed_at,
                workspace.created_at AS workspace_created_at, workspace.updated_at AS workspace_updated_at
         FROM estimate_nodes node
         INNER JOIN estimates estimate ON estimate.id = node.estimate_id
         INNER JOIN projects project ON project.id = estimate.project_id
         INNER JOIN workspaces workspace ON workspace.id = project.workspace_id
         WHERE node.id = ?
           AND estimate.project_id = ?
         LIMIT 1`,
        [routeSegment, projectId],
      ),
    ),
  );
  if (!routeRow?.estimate_tab_id) return null;
  const workspace: WorkspaceRow = {
    id: routeRow.project_workspace_id,
    created_by: routeRow.workspace_created_by,
    name: routeRow.workspace_name,
    slug: routeRow.workspace_slug,
    closed_at: routeRow.workspace_closed_at,
    created_at: routeRow.workspace_created_at,
    updated_at: routeRow.workspace_updated_at,
  };
  const project = normalizeProjectRow({
    id: projectId,
    workspace_id: routeRow.project_workspace_id,
    created_by: routeRow.project_created_by,
    name: routeRow.project_name,
    client_name: routeRow.project_client_name,
    location: routeRow.project_location,
    project_code: routeRow.project_code,
    currency_code: routeRow.project_currency_code,
    status: routeRow.project_status,
    metadata: routeRow.project_metadata,
    created_at: routeRow.project_created_at,
    updated_at: routeRow.project_updated_at,
  });
  const estimate = normalizeEstimateRow({
    id: routeRow.estimate_id,
    project_id: routeRow.estimate_project_id,
    name: routeRow.estimate_name,
    sheet_code: routeRow.estimate_sheet_code,
    notes: routeRow.estimate_notes,
    project_budget: routeRow.estimate_project_budget,
    currency_code: routeRow.estimate_currency_code,
    metadata: routeRow.estimate_metadata,
    created_by: routeRow.estimate_created_by,
    created_at: routeRow.estimate_created_at,
    updated_at: routeRow.estimate_updated_at,
  });
  if (!await canAccessEstimateInD1(database, estimate.id, userContext)) return null;
  const tabsPromise = traced("estimate-route-context.tabs-list", () =>
    traced("estimate.route.tabs", () => readEstimateTabsD1(database, estimate.id)),
  );
  const treePayloadPromise = traced("estimate-route-context.tab-tree", () =>
    readEstimateTabTreePayloadD1(database, estimate, routeRow.estimate_tab_id!, options),
  );
  const [tabs, treePayload] = await Promise.all([
    tabsPromise,
    treePayloadPromise,
  ]);
  const tab = tabs.find((candidate) => candidate.id === routeRow.estimate_tab_id) ?? null;
  if (!tab) return null;
  return {
    workspace,
    project,
    estimate,
    tab,
    tabs,
    selectedNodeId: routeRow.node_id,
    tree: treePayload.tree,
    sheetAdjustment: treePayload.sheetAdjustment,
    loadLimitState: treePayload.loadLimitState,
  };
}

export type LiveEstimateTabTree = EstimateTabTree;
export type LiveEstimateTreesForTabsResult = {
  workspace: Tables<"workspaces">;
  project: Tables<"projects"> | null;
  estimate: Tables<"estimates"> | null;
  sheetAdjustment?: EstimateSheetAdjustment;
  tabs: LiveEstimateTabTree[];
  loadLimitState?: LiveEstimateTreeLoadLimitState;
};

// F-14/F-24 (P2-T7): keeps project/auth orchestration here while the batched
// post-authorization D1 read and grouping live in the Estimate read module.
export async function getEstimateTreesForTabs(
  projectId: string,
  estimateId: string,
  tabs: EstimateTabSummary[],
  options: LiveEstimateTreeLoadOptions = {},
): Promise<LiveEstimateTreesForTabsResult> {
  const { workspace, project } = await getCurrentWorkspaceProjectForEstimate(projectId, estimateId);
  if (!project) return { workspace, project: null, estimate: null, tabs: [] };

  const database = await requireWorkspaceRepositoryD1Database();
  const estimate = await readEstimateForProject(database, estimateId, project.id);
  if (!estimate) return { workspace, project, estimate: null, tabs: [] };
  const userContext = await requireCurrentUserContext();
  if (!(await canAccessEstimateInD1(database, estimate.id, userContext))) {
    return { workspace, project, estimate: null, tabs: [] };
  }

  return {
    workspace,
    project,
    ...await readEstimateTreesForTabsD1(database, estimate, tabs, options),
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

  const database = await traced("estimate-route-context.d1-client", () =>
    traced("estimate.route.d1", () => requireWorkspaceRepositoryD1Database()),
  );
  const userContext = await traced("estimate.route.current-user", () => requireCurrentUserContext());
  const fastRouteContext = await readEstimateNodeRouteContextD1FastPath(database, projectId, routeSegment, userContext, options);
  if (fastRouteContext?.estimate) return fastRouteContext;

  const selectedNode = await traced("estimate-route-context.selected-node", () =>
    traced("estimate.route.selected-node", () =>
      first<{ id: string; estimate_id: string; estimate_tab_id: string | null }>(
        database,
        `SELECT node.id, node.estimate_id, node.estimate_tab_id
         FROM estimate_nodes node
         INNER JOIN estimates estimate ON estimate.id = node.estimate_id
         WHERE node.id = ?
           AND estimate.project_id = ?
         LIMIT 1`,
        [routeSegment, projectId],
      ),
    ),
  );

  const routeEstimateId = selectedNode?.estimate_id ?? (isUuid(routeSegment) ? routeSegment : null);
  const routeAccess = await traced("estimate.route.project-estimate-access", async () => {
    const { workspace, project } = routeEstimateId
      ? await traced("estimate-route-context.project", () =>
          getCurrentWorkspaceProjectForEstimate(projectId, routeEstimateId),
        )
      : await traced("estimate-route-context.project", () =>
          getCurrentWorkspaceProject(projectId),
        );
    if (!project || !selectedNode?.estimate_tab_id) {
      return { workspace, project, selectedEstimate: null, canAccessSelectedEstimate: false };
    }
    const selectedEstimate = await readEstimateForProject(database, selectedNode.estimate_id, project.id);
    const canAccessSelectedEstimate = selectedEstimate
      ? await canAccessEstimateInD1(database, selectedEstimate.id, userContext)
      : false;
    return { workspace, project, selectedEstimate, canAccessSelectedEstimate };
  });
  const { workspace, project } = routeAccess;
  if (!project) return { workspace, project, estimate: null, tab: null, selectedNodeId: null, tree: [] };

  if (selectedNode?.estimate_tab_id) {
    // U21 / Routing Page Optimization P3-T3: resolve the tab tree and tab list in
    // parallel without a duplicate selected-tab lookup. The route node's
    // project-scoped join proves the estimate; the tab list remains the archived
    // / active-tab authority before we expose the tree to the page.
    const estimate = routeAccess.selectedEstimate;
    if (!estimate) return { workspace, project, estimate: null, tab: null, selectedNodeId: null, tree: [] };
    if (!routeAccess.canAccessSelectedEstimate) {
      return { workspace, project, estimate: null, tab: null, selectedNodeId: null, tree: [] };
    }
    const selectedTabId = selectedNode.estimate_tab_id;
    const [treePayload, tabs] = await Promise.all([
      traced("estimate-route-context.tab-tree", () =>
        readEstimateTabTreePayloadD1(database, estimate, selectedTabId, options),
      ),
      traced("estimate-route-context.tabs-list", () =>
        traced("estimate.route.tabs", () => readEstimateTabsD1(database, selectedNode.estimate_id)),
      ),
    ]);
    const selectedTab = tabs.find((candidate) => candidate.id === selectedTabId) ?? null;
    return {
      workspace,
      project,
      ...treePayload,
      tab: selectedTab,
      selectedNodeId: selectedTab ? selectedNode.id : null,
      tree: selectedTab ? treePayload.tree : [],
      tabs,
    };
  }

  if (selectedNode) {
    await traced("estimate.route.tabs", async () => undefined);
    const legacyResult = await traced("estimate-route-context.legacy-node-fallback", () =>
      getProjectEstimateTreeByNode(projectId, routeSegment),
    );
    return { ...legacyResult, tab: null };
  }

  try {
    const resolvedEstimate = await traced("estimate-route-context.estimate-lookup", () =>
      readEstimateForProject(database, routeSegment, project.id),
    );
    if (!resolvedEstimate) {
      const fallbackResult = await traced("estimate-route-context.estimate-fallback", () =>
        getProjectEstimateTreeByEstimate(projectId, routeSegment, options),
      );
      return { ...fallbackResult, tab: null };
    }

    const tabs = await traced("estimate-route-context.estimate-tabs-list", () =>
      traced("estimate.route.tabs", () => readEstimateTabsD1(database, resolvedEstimate.id)),
    );
    const defaultTab = tabs.find((candidate) => candidate.isDefault) ?? null;
    if (defaultTab) {
      if (!(await canAccessEstimateInD1(database, resolvedEstimate.id, userContext))) {
        return { workspace, project, estimate: null, tab: null, selectedNodeId: null, tree: [], tabs };
      }
      const result = await traced(
        "estimate-route-context.default-tab-tree",
        () =>
          getEstimateTabTreeForResolvedEstimateTab(
            database,
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

  const database = await requireWorkspaceRepositoryD1Database();
  const selectedNode = await first<{ id: string; estimate_id: string }>(
    database,
    `SELECT node.id, node.estimate_id
     FROM estimate_nodes node
     INNER JOIN estimates estimate ON estimate.id = node.estimate_id
     WHERE node.id = ?
       AND estimate.project_id = ?
     LIMIT 1`,
    [nodeId, project.id],
  );
  if (!selectedNode) return getProjectEstimateTreeByEstimateLegacy(projectId, nodeId);

  const estimate = await readEstimateForProject(database, selectedNode.estimate_id, project.id);
  if (!estimate) return { workspace, project, estimate: null, selectedNodeId: null, tree: [] };
  const userContext = await requireCurrentUserContext();
  if (!(await canAccessEstimateInD1(database, estimate.id, userContext))) {
    return { workspace, project, estimate: null, selectedNodeId: null, tree: [] };
  }
  return {
    workspace,
    project,
    ...await readLegacyEstimateTreeD1(database, estimate, nodeId),
  };
}

export async function getProjectEstimateTreeByNode(projectId: string, nodeId: string): Promise<LiveEstimateTreeResult> {
  if (!isUuid(projectId)) {
    const { workspace, project } = await getCurrentWorkspaceProject(projectId);
    return { workspace, project, estimate: null, selectedNodeId: null, tree: [] };
  }

  const database = await requireWorkspaceRepositoryD1Database();
  const selectedNode = await first<{ id: string; estimate_id: string; estimate_tab_id: string | null }>(
    database,
    `SELECT node.id, node.estimate_id, node.estimate_tab_id
     FROM estimate_nodes node
     INNER JOIN estimates estimate ON estimate.id = node.estimate_id
     WHERE node.id = ?
       AND estimate.project_id = ?
     LIMIT 1`,
    [nodeId, projectId],
  );
  if (!selectedNode) return getProjectEstimateTreeByEstimate(projectId, nodeId);

  const { workspace, project } = await getCurrentWorkspaceProjectForEstimate(projectId, selectedNode.estimate_id);
  if (!project) return { workspace, project, estimate: null, selectedNodeId: null, tree: [] };

  if (selectedNode.estimate_tab_id) {
    const result = await getEstimateTabTree(projectId, selectedNode.estimate_id, selectedNode.estimate_tab_id);
    return {
      ...result,
      selectedNodeId: nodeId,
    };
  }

  const estimate = await readEstimateForProject(database, selectedNode.estimate_id, project.id);
  if (!estimate) return { workspace, project, estimate: null, selectedNodeId: null, tree: [] };
  const userContext = await requireCurrentUserContext();
  if (!(await canAccessEstimateInD1(database, estimate.id, userContext))) {
    return { workspace, project, estimate: null, selectedNodeId: null, tree: [] };
  }
  return {
    workspace,
    project,
    ...await readLegacyEstimateTreeD1(database, estimate, nodeId),
  };
}
