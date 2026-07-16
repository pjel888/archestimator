import "server-only";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { getCloudflareD1Database, type D1DatabaseLike, type D1Value } from "@/lib/cloudflare/d1";
import type { CollaborationRole } from "@/lib/collaboration/types";
import { decryptPublicationToken, readPublicationTokenEncryptionSecret } from "@/lib/publication/security";
import type { ProjectPublicationStatus, ProjectPublicationSummary } from "@/lib/publication/types";
import {
  listCurrentWorkspaceProjects,
  readLatestPublicationActivityTimestamp,
  readPublicationSnapshotStaleness,
} from "@/lib/repositories/workspace-repository";
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
  clientPortalPath?: string | null;
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

export type ProjectPublicationRosterShareOption = ProjectPublicationRosterProjectOption & {
  canManagePublication: boolean;
  clientName: string | null;
  estimateCount: number | null;
  status: ProjectPublicationStatus | "unknown";
};

export type ProjectPublicationRosterResult = {
  rows: ProjectPublicationRosterRow[];
  projectOptions: ProjectPublicationRosterProjectOption[];
  shareProjectOptions?: ProjectPublicationRosterShareOption[];
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

type JsonValue = string | number | boolean | null | { [key: string]: JsonValue | undefined } | JsonValue[];

export type PublisherRosterPublicationInput = {
  id: string;
  projectId: string;
  workspaceId: string;
  encryptedToken: string | null;
  status: ProjectPublicationStatus;
  publishedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  passwordRequired: boolean;
  selectedEstimateIds: string[];
  snapshotJson: JsonValue | null;
  snapshotVersion: number;
  openCount: number;
  latestOpenedAt: string | null;
};

export type PublisherRosterEstimateInput = {
  id: string;
  projectId: string;
  updatedAt: string | null;
};

type ProjectPublicationRosterQueryRow = {
  id: string;
  encrypted_token: string | null;
  expires_at: string | null;
  latest_opened_at: string | null;
  open_count: number | null;
  password_hash: string | null;
  selected_estimate_ids: string | null;
  snapshot_json: string | null;
  snapshot_version: number | null;
  status: ProjectPublicationStatus;
  project_id: string;
  published_at: string;
  revoked_at: string | null;
  workspace_id: string;
};

type PublicationLatestActivityRow = {
  publication_id: string;
  latest_created_at: string | null;
};

type CurrentWorkspaceProjectItem = Awaited<ReturnType<typeof listCurrentWorkspaceProjects>>["projects"][number];
type PublicationRecipientCountRow = { publication_id: string; recipient_count: number };
type PublicationEstimateUpdatedAtRow = { id: string; project_id: string; updated_at: string | null };
type PublicationEstimateCountRow = { project_id: string; estimate_count: number | null };
type PublicationProjectStatusRow = {
  project_id: string;
  status: ProjectPublicationStatus;
  expires_at: string | null;
  revoked_at: string | null;
};

async function requirePublisherRosterD1Database() {
  const database = await getCloudflareD1Database();
  if (!database) {
    throw new Error("Cloudflare D1 ARCH_DB binding is required for Publisher roster data.");
  }
  return database;
}

async function all<T>(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  const result = await database.prepare<T>(sql).bind(...values).all<T>();
  return result.results ?? [];
}

function placeholders(values: readonly unknown[]) {
  return values.map(() => "?").join(", ");
}

function parseJsonValue(value: unknown, fallback: JsonValue): JsonValue {
  if (typeof value !== "string") {
    return value === null || value === undefined ? fallback : (value as JsonValue);
  }
  try {
    return JSON.parse(value) as JsonValue;
  } catch {
    return fallback;
  }
}

function parseStringArray(value: unknown) {
  const parsed = parseJsonValue(value, []);
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
}

function readSnapshotGeneratedAt(snapshot: JsonValue | null | undefined) {
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

function readVerifiedClientPortalPath(
  project: PublisherRosterProjectInput,
  publicationId: string,
  migratedClientPortalIdByPublicationId: ReadonlyMap<string, string> | undefined,
) {
  if (!project.canManagePublication) return null;
  const portalId = migratedClientPortalIdByPublicationId?.get(publicationId);
  return portalId
    ? `/workshop/projects/${encodeURIComponent(project.id)}/client-portals/${encodeURIComponent(portalId)}`
    : null;
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
  if (left && right) {
    const diff = Date.parse(right) - Date.parse(left);
    // ponytail: a non-parseable timestamp yields NaN, which would make Array.sort unstable;
    // treat it as a tie so malformed data degrades to name-order instead of implementation-defined order.
    return Number.isFinite(diff) ? diff : 0;
  }
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

function toShareProjectOptions(
  projects: PublisherRosterProjectInput[],
  estimateCountByProjectId: ReadonlyMap<string, number>,
  statusByProjectId: ReadonlyMap<string, ProjectPublicationStatus>,
): ProjectPublicationRosterShareOption[] {
  return projects
    .filter((project) => project.canManagePublication)
    .map((project) => ({
      canManagePublication: true,
      clientName: project.clientName,
      estimateCount: estimateCountByProjectId.get(project.id) ?? 0,
      id: project.id,
      name: project.name,
      projectCode: project.projectCode,
      status: statusByProjectId.get(project.id) ?? "unpublished",
    }))
    .sort(compareProjectOptions);
}

export function composePublisherRosterResult({
  estimateRows = [],
  filters,
  latestCommentAtByPublicationId,
  latestResponseAtByPublicationId,
  latestStatusByProjectId,
  migratedClientPortalIdByPublicationId,
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
  latestStatusByProjectId?: ReadonlyMap<string, ProjectPublicationStatus>;
  migratedClientPortalIdByPublicationId?: ReadonlyMap<string, string>;
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
      clientPortalPath: readVerifiedClientPortalPath(project, publication.id, migratedClientPortalIdByPublicationId),
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

  for (const project of visibleProjects) {
    if (!project.canManagePublication) continue;
    if (publicationProjectIds.has(project.id)) continue;
    // When the publication scan was truncated, a project may have a publication we did not
    // load — we can't render that accurately (no decrypted link/counts), so skip it rather
    // than mislabel it. Projects with no publication at all still seed a draft row.
    if (latestStatusByProjectId?.has(project.id)) continue;
    rows.push({
      canManagePublication: project.canManagePublication,
      clientLinkPath: null,
      clientPortalPath: null,
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

  const filteredRows = rows
    .filter((row) => (filters.projectId ? row.projectId === filters.projectId : true))
    .filter((row) => rowMatchesStatus(row, filters.status))
    .filter((row) => rowMatchesSearch(row, filters.search))
    .sort(compareRosterRows);
  // Clamp the page into range so a stale/out-of-range ?page= doesn't strand the user on an
  // empty view with a disabled next button and no way forward.
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / filters.pageSize));
  const page = Math.min(Math.max(filters.page, 1), totalPages);
  const offset = (page - 1) * filters.pageSize;

  return {
    hasNextPage: offset + filters.pageSize < filteredRows.length,
    page,
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
    selectedEstimateIds: parseStringArray(publication.selected_estimate_ids),
    snapshotJson: parseJsonValue(publication.snapshot_json, null),
    snapshotVersion: publication.snapshot_version ?? 0,
    status: publication.status,
    workspaceId: publication.workspace_id,
  };
}

async function readRosterPublications(
  database: D1DatabaseLike,
  workspaceId: string,
  projectIds: string[],
) {
  if (projectIds.length === 0) return [];
  return all<ProjectPublicationRosterQueryRow>(
    database,
    `SELECT
       id,
       project_id,
       workspace_id,
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
       latest_opened_at
     FROM project_publications
     WHERE workspace_id = ? AND project_id IN (${placeholders(projectIds)})
     ORDER BY published_at DESC
     LIMIT ?`,
    [workspaceId, ...projectIds, PUBLISHER_ROSTER_PUBLICATION_SCAN_LIMIT],
  );
}

async function readRecipientCountsByPublicationId(
  database: D1DatabaseLike,
  publicationIds: string[],
) {
  if (publicationIds.length === 0) return new Map<string, number>();
  const rows = await all<PublicationRecipientCountRow>(
    database,
    `SELECT publication_id, COUNT(*) AS recipient_count
     FROM shared_link_recipients
     WHERE publication_id IN (${placeholders(publicationIds)})
     GROUP BY publication_id`,
    publicationIds,
  );
  return new Map(rows.map((row) => [row.publication_id, row.recipient_count]));
}

async function readLatestCommentAtByPublicationId(
  database: D1DatabaseLike,
  publicationIds: string[],
) {
  if (publicationIds.length === 0) return new Map<string, string | null>();
  const rows = await all<PublicationLatestActivityRow>(
    database,
    `SELECT publication_id, MAX(created_at) AS latest_created_at
     FROM shared_link_comments
     WHERE publication_id IN (${placeholders(publicationIds)})
     GROUP BY publication_id`,
    publicationIds,
  );
  return new Map(rows.map((row) => [row.publication_id, row.latest_created_at]));
}

async function readLatestResponseAtByPublicationId(
  database: D1DatabaseLike,
  publicationIds: string[],
) {
  if (publicationIds.length === 0) return new Map<string, string | null>();
  const rows = await all<PublicationLatestActivityRow>(
    database,
    `SELECT publication_id, MAX(created_at) AS latest_created_at
     FROM shared_link_responses
     WHERE publication_id IN (${placeholders(publicationIds)})
     GROUP BY publication_id`,
    publicationIds,
  );
  return new Map(rows.map((row) => [row.publication_id, row.latest_created_at]));
}

type LegacyMigrationPortalRow = { legacy_publication_id: string; portal_id: string };

async function readVerifiedClientPortalIdsByLegacyPublicationId(
  database: D1DatabaseLike,
  workspaceId: string,
  publicationIds: string[],
) {
  if (publicationIds.length === 0) return new Map<string, string>();
  const rows = await all<LegacyMigrationPortalRow>(
    database,
    `SELECT mapping.legacy_publication_id, mapping.portal_id
     FROM client_portal_legacy_mappings AS mapping
     JOIN client_portals AS portal ON portal.id = mapping.portal_id
     JOIN project_publications AS publication ON publication.id = mapping.legacy_publication_id
     WHERE mapping.legacy_publication_id IN (${placeholders(publicationIds)})
       AND mapping.migration_status IN ('verified', 'cutover_complete')
       AND portal.workspace_id = ?
       AND publication.workspace_id = ?
       AND portal.project_id = publication.project_id`,
    [...publicationIds, workspaceId, workspaceId],
  );
  return new Map(rows.map((row) => [row.legacy_publication_id, row.portal_id]));
}

async function readEstimateUpdatedAtRows(
  database: D1DatabaseLike,
  projectIds: string[],
) {
  if (projectIds.length === 0) return [];
  const rows = await all<PublicationEstimateUpdatedAtRow>(
    database,
    `SELECT id, project_id, updated_at
     FROM estimates
     WHERE project_id IN (${placeholders(projectIds)})
     LIMIT ?`,
    [...projectIds, PUBLISHER_ROSTER_CHILD_SCAN_LIMIT],
  );
  return rows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    updatedAt: row.updated_at,
  }));
}

async function readEstimateCountsByProjectId(
  database: D1DatabaseLike,
  projectIds: string[],
) {
  if (projectIds.length === 0) return new Map<string, number>();
  const rows = await all<PublicationEstimateCountRow>(
    database,
    `SELECT project_id, COUNT(*) AS estimate_count
     FROM estimates
     WHERE project_id IN (${placeholders(projectIds)})
     GROUP BY project_id`,
    projectIds,
  );
  return new Map(rows.map((row) => [row.project_id, row.estimate_count ?? 0]));
}

async function readLatestPublicationStatusByProjectId(
  database: D1DatabaseLike,
  workspaceId: string,
  projectIds: string[],
  nowMs: number,
) {
  if (projectIds.length === 0) return new Map<string, ProjectPublicationStatus>();
  const rows = await all<PublicationProjectStatusRow>(
    database,
    // ponytail: window function replaces the O(K²) correlated subquery (which re-scanned all
    // publications per candidate row). D1/SQLite ≥3.25 supports ROW_NUMBER(); this is a single
    // partitioned scan returning the newest publication per project.
    `SELECT project_id, status, expires_at, revoked_at
     FROM (
       SELECT project_id, status, expires_at, revoked_at,
              ROW_NUMBER() OVER (
                PARTITION BY project_id
                ORDER BY published_at DESC, id DESC
              ) AS rn
       FROM project_publications
       WHERE workspace_id = ? AND project_id IN (${placeholders(projectIds)})
     )
     WHERE rn = 1`,
    [workspaceId, ...projectIds],
  );
  const statusByProjectId = new Map<string, ProjectPublicationStatus>();
  for (const row of rows) {
    if (statusByProjectId.has(row.project_id)) continue;
    statusByProjectId.set(row.project_id, readPublicationStatus({
      expiresAt: row.expires_at,
      revokedAt: row.revoked_at,
      status: row.status,
    }, nowMs));
  }
  return statusByProjectId;
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

  if (allRosterProjects.length === 0) {
    return {
      ...composePublisherRosterResult({ filters, projects: [], publications: [] }),
      shareProjectOptions: [],
    };
  }

  const database = await requirePublisherRosterD1Database();
  const projectIds = queryProjects.map((project) => project.id);
  const manageableProjectIds = allRosterProjects
    .filter((project) => project.canManagePublication)
    .map((project) => project.id);
  const [publicationRows, estimateRows, estimateCountByProjectId, statusByProjectId] = await Promise.all([
    readRosterPublications(database, workspace.id, projectIds),
    readEstimateUpdatedAtRows(database, projectIds),
    readEstimateCountsByProjectId(database, manageableProjectIds),
    readLatestPublicationStatusByProjectId(database, workspace.id, manageableProjectIds, Date.now()),
  ]);
  const publicationIds = publicationRows.map((publication) => publication.id);
  const [recipientCountByPublicationId, latestCommentAtByPublicationId, latestResponseAtByPublicationId, migratedClientPortalIdByPublicationId] =
    await Promise.all([
      readRecipientCountsByPublicationId(database, publicationIds),
      readLatestCommentAtByPublicationId(database, publicationIds),
      readLatestResponseAtByPublicationId(database, publicationIds),
      readVerifiedClientPortalIdsByLegacyPublicationId(database, workspace.id, publicationIds),
    ]);

  return {
    ...composePublisherRosterResult({
    estimateRows,
    filters,
    latestCommentAtByPublicationId,
    latestResponseAtByPublicationId,
    latestStatusByProjectId: statusByProjectId,
    migratedClientPortalIdByPublicationId,
    projects: allRosterProjects,
    publications: publicationRows.map(toRosterPublicationInput),
    recipientCountByPublicationId,
    truncated: publicationRows.length >= PUBLISHER_ROSTER_PUBLICATION_SCAN_LIMIT,
    }),
    shareProjectOptions: toShareProjectOptions(allRosterProjects, estimateCountByProjectId, statusByProjectId),
  };
}
