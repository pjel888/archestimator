import "server-only";

import { requireCurrentUserContext } from "@/lib/auth/session";
import type { CollaborationRole } from "@/lib/collaboration/types";
import { decryptPublicationToken, readPublicationTokenEncryptionSecret } from "@/lib/publication/security";
import type { ProjectPublicationStatus, ProjectPublicationSummary } from "@/lib/publication/types";
import {
  listCurrentWorkspaceProjects,
  readLatestPublicationActivityTimestamp,
  readPublicationSnapshotStaleness,
} from "@/lib/repositories/workspace-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json, Tables } from "@/lib/supabase/types";
import {
  canManagePublisherRosterProject,
  canReadPublisherRosterProject,
} from "./permissions";
import type { PublisherRosterFilters } from "./roster-filter";

export const PUBLISHER_ROSTER_PUBLICATION_SCAN_LIMIT = 100;
export const PUBLISHER_ROSTER_CHILD_SCAN_LIMIT = 1000;

export type ProjectPublicationRosterLinkUnavailableReason = "token-unavailable";

export type ProjectPublicationRosterRow = {
  projectId: string;
  workspaceId: string;
  projectName: string;
  projectCode: string | null;
  clientName: string | null;
  location: string | null;
  currentUserRole: CollaborationRole;
  canManagePublication: boolean;
  status: ProjectPublicationStatus;
  publicationId: string | null;
  clientLinkPath: string | null;
  linkUnavailableReason: ProjectPublicationRosterLinkUnavailableReason | null;
  tokenCopyAvailable: boolean;
  publishedAt: string | null;
  expiresAt: string | null;
  passwordRequired: boolean;
  selectedEstimateCount: number;
  selectedEstimateIds: string[];
  snapshotVersion: number;
  openCount: number;
  latestOpenedAt: string | null;
  latestActivityAt: string | null;
  recipientCount: number;
  staleSnapshotWarning: ProjectPublicationSummary["staleSnapshotWarning"];
};

export type ProjectPublicationRosterProjectOption = {
  id: string;
  name: string;
  projectCode: string | null;
};

export type ProjectPublicationRosterResult = {
  rows: ProjectPublicationRosterRow[];
  projectOptions: ProjectPublicationRosterProjectOption[];
  totalRows: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  truncated: boolean;
};

export type PublisherRosterProjectInput = {
  id: string;
  workspaceId: string;
  name: string;
  projectCode: string | null;
  clientName: string | null;
  location: string | null;
  currentUserRole: CollaborationRole;
  canReadPublicationRoster?: boolean;
  canManagePublication: boolean;
};

export type PublisherRosterPublicationInput = {
  id: string;
  projectId: string;
  workspaceId: string;
  encryptedToken: string | null;
  status: Tables<"project_publications">["status"];
  publishedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  passwordRequired: boolean;
  selectedEstimateIds: string[];
  snapshotJson: Json | null;
  snapshotVersion: number;
  openCount: number;
  latestOpenedAt: string | null;
};

export type PublisherRosterEstimateInput = {
  id: string;
  projectId: string;
  updatedAt: string | null;
};

type ProjectPublicationRosterQueryRow = Pick<
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
  | "workspace_id"
>;

type PublicationActivityRow = {
  publication_id: string;
  created_at: string;
};

type CurrentWorkspaceProjectItem = Awaited<ReturnType<typeof listCurrentWorkspaceProjects>>["projects"][number];
type PublicationRecipientCountRow = Pick<Tables<"shared_link_recipients">, "publication_id">;
type PublicationEstimateUpdatedAtRow = Pick<Tables<"estimates">, "id" | "project_id" | "updated_at">;

function readSnapshotGeneratedAt(snapshot: Json | null | undefined) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return null;
  const generatedAt = snapshot.generatedAt;
  return typeof generatedAt === "string" && Number.isFinite(Date.parse(generatedAt)) ? generatedAt : null;
}

function readPublicationClientLinkPath(
  publication: Pick<PublisherRosterPublicationInput, "encryptedToken" | "id">,
): {
  clientLinkPath: string | null;
  linkUnavailableReason: ProjectPublicationRosterLinkUnavailableReason | null;
} {
  if (!publication.encryptedToken) return { clientLinkPath: null, linkUnavailableReason: null };
  const tokenEncryptionSecret = readPublicationTokenEncryptionSecret();
  try {
    const token = decryptPublicationToken(publication.encryptedToken, tokenEncryptionSecret);
    return {
      clientLinkPath: `/share/${token}`,
      linkUnavailableReason: null,
    };
  } catch {
    console.warn("[publisher-roster] unable to decrypt publication token", { publicationId: publication.id });
    return { clientLinkPath: null, linkUnavailableReason: "token-unavailable" };
  }
}

function readPublicationStatus(
  publication: Pick<PublisherRosterPublicationInput, "expiresAt" | "revokedAt" | "status">,
  nowMs: number,
): ProjectPublicationStatus {
  if (publication.revokedAt || publication.status === "revoked") return "revoked";
  if (publication.status === "expired") return "expired";
  if (publication.expiresAt && Date.parse(publication.expiresAt) <= nowMs) return "expired";
  return "published";
}

function latestEstimateUpdatedAtForPublication(
  publication: Pick<PublisherRosterPublicationInput, "projectId" | "selectedEstimateIds">,
  estimateRows: PublisherRosterEstimateInput[],
) {
  let latest: string | null = null;
  let latestTime = Number.NEGATIVE_INFINITY;
  const selectedEstimateIds = new Set(publication.selectedEstimateIds);
  for (const estimate of estimateRows) {
    if (estimate.projectId !== publication.projectId || !estimate.updatedAt) continue;
    if (selectedEstimateIds.size > 0 && !selectedEstimateIds.has(estimate.id)) continue;
    const time = Date.parse(estimate.updatedAt);
    if (!Number.isFinite(time) || time <= latestTime) continue;
    latest = estimate.updatedAt;
    latestTime = time;
  }
  return latest;
}

function getMapValue(map: ReadonlyMap<string, string | null> | undefined, key: string) {
  return map?.get(key) ?? null;
}

function getCountValue(map: ReadonlyMap<string, number> | undefined, key: string) {
  return map?.get(key) ?? 0;
}

function rowMatchesStatus(row: ProjectPublicationRosterRow, status: PublisherRosterFilters["status"]) {
  switch (status) {
    case "active":
      return row.status === "published" && !row.staleSnapshotWarning;
    case "stale":
      return row.status === "published" && Boolean(row.staleSnapshotWarning);
    case "expired":
      return row.status === "expired";
    case "revoked":
      return row.status === "revoked";
    case "drafts":
      return row.status === "unpublished";
    case "all":
    default:
      return true;
  }
}

function rowMatchesSearch(row: ProjectPublicationRosterRow, search: string) {
  if (!search) return true;
  const needle = search.toLowerCase();
  return [
    row.projectName,
    row.projectCode,
    row.clientName,
    row.location,
    row.publicationId,
  ].some((value) => value?.toLowerCase().includes(needle));
}

function compareNullableDesc(left: string | null, right: string | null) {
  if (left && right) return Date.parse(right) - Date.parse(left);
  if (left) return -1;
  if (right) return 1;
  return 0;
}

function compareRosterRows(left: ProjectPublicationRosterRow, right: ProjectPublicationRosterRow) {
  const activityOrder = compareNullableDesc(left.latestActivityAt, right.latestActivityAt);
  if (activityOrder !== 0) return activityOrder;
  const publishedOrder = compareNullableDesc(left.publishedAt, right.publishedAt);
  if (publishedOrder !== 0) return publishedOrder;
  const nameOrder = left.projectName.localeCompare(right.projectName);
  if (nameOrder !== 0) return nameOrder;
  return (left.publicationId ?? left.projectId).localeCompare(right.publicationId ?? right.projectId);
}

function compareProjectOptions(left: ProjectPublicationRosterProjectOption, right: ProjectPublicationRosterProjectOption) {
  const nameOrder = left.name.localeCompare(right.name);
  if (nameOrder !== 0) return nameOrder;
  return left.id.localeCompare(right.id);
}

function toProjectOption(project: PublisherRosterProjectInput): ProjectPublicationRosterProjectOption {
  return {
    id: project.id,
    name: project.name,
    projectCode: project.projectCode,
  };
}

export function composePublisherRosterResult({
  estimateRows = [],
  filters,
  latestCommentAtByPublicationId,
  latestResponseAtByPublicationId,
  now = new Date(),
  projects,
  publications,
  recipientCountByPublicationId,
  truncated = false,
}: {
  estimateRows?: PublisherRosterEstimateInput[];
  filters: PublisherRosterFilters;
  latestCommentAtByPublicationId?: ReadonlyMap<string, string | null>;
  latestResponseAtByPublicationId?: ReadonlyMap<string, string | null>;
  now?: Date;
  projects: PublisherRosterProjectInput[];
  publications: PublisherRosterPublicationInput[];
  recipientCountByPublicationId?: ReadonlyMap<string, number>;
  truncated?: boolean;
}): ProjectPublicationRosterResult {
  const nowMs = now.getTime();
  const visibleProjects = projects.filter((project) => project.canReadPublicationRoster ?? project.canManagePublication);
  const projectById = new Map(visibleProjects.map((project) => [project.id, project]));
  const projectOptions = visibleProjects.map(toProjectOption).sort(compareProjectOptions);
  const publicationProjectIds = new Set<string>();
  const rows: ProjectPublicationRosterRow[] = [];

  for (const publication of publications) {
    const project = projectById.get(publication.projectId);
    if (!project) continue;
    publicationProjectIds.add(project.id);

    const status = readPublicationStatus(publication, nowMs);
    const latestActivityAt = readLatestPublicationActivityTimestamp([
      getMapValue(latestCommentAtByPublicationId, publication.id),
      getMapValue(latestResponseAtByPublicationId, publication.id),
      publication.latestOpenedAt,
    ]);
    const staleSnapshotWarning = readPublicationSnapshotStaleness({
      latestEstimateUpdatedAt: latestEstimateUpdatedAtForPublication(publication, estimateRows),
      snapshotGeneratedAt: readSnapshotGeneratedAt(publication.snapshotJson),
    });
    const linkResult =
      status === "published" && project.canManagePublication
        ? readPublicationClientLinkPath(publication)
        : { clientLinkPath: null, linkUnavailableReason: null };

    rows.push({
      canManagePublication: project.canManagePublication,
      clientLinkPath: linkResult.clientLinkPath,
      clientName: project.clientName,
      currentUserRole: project.currentUserRole,
      expiresAt: publication.expiresAt,
      latestActivityAt,
      latestOpenedAt: publication.latestOpenedAt,
      linkUnavailableReason: linkResult.linkUnavailableReason,
      location: project.location,
      openCount: publication.openCount,
      passwordRequired: publication.passwordRequired,
      projectCode: project.projectCode,
      projectId: project.id,
      projectName: project.name,
      publicationId: publication.id,
      publishedAt: publication.publishedAt,
      recipientCount: getCountValue(recipientCountByPublicationId, publication.id),
      selectedEstimateCount: publication.selectedEstimateIds.length,
      selectedEstimateIds: publication.selectedEstimateIds,
      snapshotVersion: publication.snapshotVersion,
      staleSnapshotWarning,
      status,
      tokenCopyAvailable: Boolean(linkResult.clientLinkPath),
      workspaceId: publication.workspaceId,
    });
  }

  if (!truncated) {
    for (const project of visibleProjects) {
      if (!project.canManagePublication) continue;
      if (publicationProjectIds.has(project.id)) continue;
      rows.push({
        canManagePublication: project.canManagePublication,
        clientLinkPath: null,
        clientName: project.clientName,
        currentUserRole: project.currentUserRole,
        expiresAt: null,
        latestActivityAt: null,
        latestOpenedAt: null,
        linkUnavailableReason: null,
        location: project.location,
        openCount: 0,
        passwordRequired: false,
        projectCode: project.projectCode,
        projectId: project.id,
        projectName: project.name,
        publicationId: null,
        publishedAt: null,
        recipientCount: 0,
        selectedEstimateCount: 0,
        selectedEstimateIds: [],
        snapshotVersion: 0,
        staleSnapshotWarning: null,
        status: "unpublished",
        tokenCopyAvailable: false,
        workspaceId: project.workspaceId,
      });
    }
  }

  const filteredRows = rows
    .filter((row) => (filters.projectId ? row.projectId === filters.projectId : true))
    .filter((row) => rowMatchesStatus(row, filters.status))
    .filter((row) => rowMatchesSearch(row, filters.search))
    .sort(compareRosterRows);
  const offset = (filters.page - 1) * filters.pageSize;

  return {
    hasNextPage: offset + filters.pageSize < filteredRows.length,
    page: filters.page,
    pageSize: filters.pageSize,
    projectOptions,
    rows: filteredRows.slice(offset, offset + filters.pageSize),
    totalRows: filteredRows.length,
    truncated,
  };
}

function toRosterProjectInput(project: CurrentWorkspaceProjectItem, workspaceId: string): PublisherRosterProjectInput {
  return {
    canManagePublication: canManagePublisherRosterProject(project.currentUserRole),
    canReadPublicationRoster: canReadPublisherRosterProject(project.currentUserRole),
    clientName: project.project.client_name ?? null,
    currentUserRole: project.currentUserRole,
    id: project.project.id,
    location: project.project.location ?? null,
    name: project.project.name,
    projectCode: project.project.project_code ?? null,
    workspaceId,
  };
}

function toRosterPublicationInput(publication: ProjectPublicationRosterQueryRow): PublisherRosterPublicationInput {
  return {
    encryptedToken: publication.encrypted_token,
    expiresAt: publication.expires_at ?? null,
    id: publication.id,
    latestOpenedAt: publication.latest_opened_at ?? null,
    openCount: publication.open_count ?? 0,
    passwordRequired: Boolean(publication.password_hash),
    projectId: publication.project_id,
    publishedAt: publication.published_at,
    revokedAt: publication.revoked_at ?? null,
    selectedEstimateIds: publication.selected_estimate_ids ?? [],
    snapshotJson: publication.snapshot_json ?? null,
    snapshotVersion: publication.snapshot_version ?? 0,
    status: publication.status,
    workspaceId: publication.workspace_id,
  };
}

async function readRosterPublications(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  projectIds: string[],
) {
  if (projectIds.length === 0) return [];
  const { data, error } = await supabase
    .from("project_publications")
    .select(
      "id, project_id, workspace_id, encrypted_token, password_hash, status, snapshot_json, snapshot_version, selected_estimate_ids, published_at, expires_at, revoked_at, open_count, latest_opened_at",
    )
    .in("project_id", projectIds)
    .order("published_at", { ascending: false })
    .limit(PUBLISHER_ROSTER_PUBLICATION_SCAN_LIMIT);

  if (error) throw error;
  return (data ?? []) as ProjectPublicationRosterQueryRow[];
}

async function readRecipientCountsByPublicationId(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  publicationIds: string[],
) {
  if (publicationIds.length === 0) return new Map<string, number>();
  const { data, error } = await supabase
    .from("shared_link_recipients")
    .select("publication_id")
    .in("publication_id", publicationIds)
    .limit(PUBLISHER_ROSTER_CHILD_SCAN_LIMIT);

  if (error) throw error;
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as PublicationRecipientCountRow[]) {
    counts.set(row.publication_id, (counts.get(row.publication_id) ?? 0) + 1);
  }
  return counts;
}

function latestActivityMap(rows: PublicationActivityRow[]) {
  const latestByPublicationId = new Map<string, string | null>();
  for (const row of rows) {
    const current = latestByPublicationId.get(row.publication_id);
    if (current && Date.parse(current) >= Date.parse(row.created_at)) continue;
    latestByPublicationId.set(row.publication_id, row.created_at);
  }
  return latestByPublicationId;
}

async function readLatestCommentAtByPublicationId(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  publicationIds: string[],
) {
  if (publicationIds.length === 0) return new Map<string, string | null>();
  const { data, error } = await supabase
    .from("shared_link_comments")
    .select("publication_id, created_at")
    .in("publication_id", publicationIds)
    .order("created_at", { ascending: false })
    .limit(PUBLISHER_ROSTER_CHILD_SCAN_LIMIT);

  if (error) throw error;
  return latestActivityMap((data ?? []) as PublicationActivityRow[]);
}

async function readLatestResponseAtByPublicationId(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  publicationIds: string[],
) {
  if (publicationIds.length === 0) return new Map<string, string | null>();
  const { data, error } = await supabase
    .from("shared_link_responses")
    .select("publication_id, created_at")
    .in("publication_id", publicationIds)
    .order("created_at", { ascending: false })
    .limit(PUBLISHER_ROSTER_CHILD_SCAN_LIMIT);

  if (error) throw error;
  return latestActivityMap((data ?? []) as PublicationActivityRow[]);
}

async function readEstimateUpdatedAtRows(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  projectIds: string[],
) {
  if (projectIds.length === 0) return [];
  const { data, error } = await supabase
    .from("estimates")
    .select("id, project_id, updated_at")
    .in("project_id", projectIds)
    .limit(PUBLISHER_ROSTER_CHILD_SCAN_LIMIT);

  if (error) throw error;
  return ((data ?? []) as PublicationEstimateUpdatedAtRow[]).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    updatedAt: row.updated_at,
  }));
}

export async function readWorkspacePublicationsRoster(
  workspaceId: string,
  userId: string,
  filters: PublisherRosterFilters,
): Promise<ProjectPublicationRosterResult> {
  const [{ workspace, projects }, currentUser] = await Promise.all([
    listCurrentWorkspaceProjects(),
    requireCurrentUserContext(),
  ]);
  if (workspace.id !== workspaceId || currentUser.userId !== userId) {
    throw new Error("Publisher roster scope does not match the current request context.");
  }

  const allRosterProjects = projects
    .map((project) => toRosterProjectInput(project, workspace.id))
    .filter((project) => project.canReadPublicationRoster);
  const queryProjects = allRosterProjects
    .filter((project) => (filters.projectId ? project.id === filters.projectId : true));

  if (queryProjects.length === 0) {
    return composePublisherRosterResult({ filters, projects: allRosterProjects, publications: [] });
  }

  const supabase = await createSupabaseServerClient();
  const projectIds = queryProjects.map((project) => project.id);
  const publicationRows = await readRosterPublications(supabase, projectIds);
  const publicationIds = publicationRows.map((publication) => publication.id);
  const [estimateRows, recipientCountByPublicationId, latestCommentAtByPublicationId, latestResponseAtByPublicationId] =
    await Promise.all([
      readEstimateUpdatedAtRows(supabase, projectIds),
      readRecipientCountsByPublicationId(supabase, publicationIds),
      readLatestCommentAtByPublicationId(supabase, publicationIds),
      readLatestResponseAtByPublicationId(supabase, publicationIds),
    ]);

  return composePublisherRosterResult({
    estimateRows,
    filters,
    latestCommentAtByPublicationId,
    latestResponseAtByPublicationId,
    projects: allRosterProjects,
    publications: publicationRows.map(toRosterPublicationInput),
    recipientCountByPublicationId,
    truncated: publicationRows.length >= PUBLISHER_ROSTER_PUBLICATION_SCAN_LIMIT,
  });
}
