"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth, requireCurrentUserContext, requireWorkshopWriteContext } from "@/lib/auth/session";
import { isPlatformAdminRole } from "@/lib/auth/roles";
import {
  getCloudflareD1Database,
  type D1DatabaseLike,
  type D1Value,
} from "@/lib/cloudflare/d1";
import { canEditProjectInD1, readProjectFromD1 } from "@/lib/authz/d1-access";
import {
  buildRejectedPreviewResult,
  coerceBulkExecutionResult,
  coerceBulkPreviewResult,
  normalizeBulkActionIds,
  type BulkActionExecutionResult,
  type BulkActionPreviewResult,
} from "@/lib/mass-deletion/bulk-action";
import {
  recordProjectMetadataUpdatedEventInCloudflareD1,
} from "@/lib/projects/d1-audit";
import {
  isProjectStatus,
  normalizeProjectStatus,
  type ProjectStatus,
} from "@/lib/projects/status";
import { ensureDefaultWorkspace } from "@/lib/repositories/workspace-repository";
import { prepareActivationOutboxIntent } from "@/lib/onboarding/activation-outbox";
import { recordOnboardingChecklistActionFact } from "@/lib/onboarding/estimate-practice";
import type { Json } from "@/lib/types/json";
import { isUuid } from "@/lib/ids";
import { logAppError } from "@/lib/observability/logger";
import { toUserFacingErrorMessage } from "@/lib/observability/user-facing-error";
import {
  claimUploadAssetsForRemoval,
  getUploadRemovalCleanupNotBefore,
  uploadAssetAcceptedReferencePredicate,
} from "@/lib/uploads/removal-claims";

const PROJECT_IMAGE_BUCKET = "project-images";

type ProjectImageMetadataInput = {
  bucket?: string;
  url: string;
  thumbnailUrl?: string;
  path?: string;
  thumbnailPath?: string;
};

export type BulkDeleteProjectsInput = {
  projectIds: string[];
};

export type ExecuteBulkDeleteProjectsInput = BulkDeleteProjectsInput & {
  expectedPreviewHash: string;
  correlationId?: string;
};

type ProjectD1Row = {
  budget_basis_date?: string | null;
  id: string;
  workspace_id: string;
  name: string;
  client_name: string | null;
  location: string | null;
  project_code: string | null;
  currency_code: string | null;
  floor_area_unit?: "sqm" | "sqft" | null;
  gross_floor_area?: number | null;
  market_region?: string | null;
  procurement_status?: string | null;
  project_phase?: string | null;
  project_type?: string | null;
  status?: ProjectStatus | string | null;
  target_budget?: number | null;
  metadata: string | Record<string, Json> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type ProjectDeleteClassificationRow = ProjectD1Row & {
  workspace_role: string | null;
  project_role: string | null;
  active_publication_count: number | boolean | null;
};

type ProjectPublicationIdRow = {
  id: string;
};

type EstimateIdRow = {
  id: string;
};

type ProjectDeleteUploadAssetRow = {
  actor_user_id: string | null;
  id: string;
  metadata_json: string;
  project_id: string | null;
  purge_state: string;
  status: string;
  storage_bucket: string;
  storage_path: string;
  surface: string;
  target_entity_id: string | null;
  target_entity_type: string | null;
  thumbnail_path: string | null;
  updated_at: string;
  upload_session_id: string;
};

type ProjectDeleteUploadAssetIdentity = {
  actorUserId: string | null;
  id: string;
  metadataJson: string;
  projectId: string | null;
  purgeState: string;
  status: string;
  storageBucket: string;
  storagePath: string;
  surface: string;
  targetEntityId: string | null;
  targetEntityType: string | null;
  thumbnailPath: string | null;
  updatedAt: string;
  uploadSessionId: string;
};

function readRequiredText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

function readOptionalText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function readCurrencyCode(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "PHP")
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{3}$/.test(value))
    throw new Error(`${key} must be a three-letter currency code.`);
  return value;
}

function readOptionalStoragePath(formData: FormData, key: string) {
  const value = readOptionalText(formData, key);
  if (!value) return null;
  if (
    !value.endsWith(".webp") ||
    value.includes("..") ||
    value.includes("//") ||
    value.includes("\\")
  ) {
    throw new Error(`${key} must be a valid stored WebP image path.`);
  }
  return value;
}

function readOptionalNumber(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "")
    .replace(/,/g, "")
    .trim();
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0)
    throw new Error(`${key} must be a valid positive number.`);
  return value;
}

function asProjectMetadata(
  value: Json | string | Record<string, Json> | null | undefined,
): Record<string, Json> {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as Json;
      return asProjectMetadata(parsed);
    } catch {
      return {};
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, Json] => entry[1] !== undefined,
    ),
  );
}

function readMetadataText(metadata: Record<string, Json>, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value : null;
}

function getProjectImageStoragePaths(metadata: Record<string, Json>) {
  return [
    readMetadataText(metadata, "projectImagePath"),
    readMetadataText(metadata, "projectImageThumbnailPath"),
  ].filter((path): path is string => Boolean(path));
}

type ProjectImagePathOwner = Pick<ProjectD1Row, "id" | "workspace_id">;

function parseStoredProjectImagePath(path: string | null | undefined) {
  const normalized = path?.trim();
  if (!normalized) return null;
  if (
    !normalized.endsWith(".webp") ||
    normalized.includes("..") ||
    normalized.includes("//") ||
    normalized.includes("\\")
  ) {
    return null;
  }

  const segments = normalized.split("/");
  if (segments.length < 5 || segments.some((segment) => segment.length === 0))
    return null;
  const [workspaceId, , marker, projectId] = segments;
  if (marker !== PROJECT_IMAGE_BUCKET) return null;
  if (!workspaceId || !projectId) return null;

  return { workspaceId, projectId, path: normalized };
}

function isProjectImageStoragePathForProject(
  path: string | null | undefined,
  project: ProjectImagePathOwner,
) {
  const parsed = parseStoredProjectImagePath(path);
  return Boolean(
    parsed &&
    parsed.workspaceId === project.workspace_id &&
    parsed.projectId === project.id,
  );
}

function assertProjectImagePathForProject(
  key: string,
  path: string | null | undefined,
  project: ProjectImagePathOwner,
) {
  if (!path) return;
  if (!isProjectImageStoragePathForProject(path, project)) {
    throw new Error(`${key} must belong to this project.`);
  }
}

async function removeStoredProjectImagePaths(
  database: D1DatabaseLike,
  paths: string[],
  project: ProjectImagePathOwner,
) {
  const safePaths = Array.from(
    new Set(
      paths.filter((path) =>
        isProjectImageStoragePathForProject(path, project),
      ),
    ),
  );
  if (safePaths.length === 0) return;
  await claimUploadAssetsForRemoval(database, {
    workspaceId: project.workspace_id,
    surface: "project-image",
    bucket: PROJECT_IMAGE_BUCKET,
    paths: safePaths,
  });
}

function applyProjectImageMetadata(
  metadata: Record<string, Json>,
  image: ProjectImageMetadataInput,
) {
  metadata.projectImageUrl = image.url;
  if (image.thumbnailUrl)
    metadata.projectImageThumbnailUrl = image.thumbnailUrl;
  if (image.bucket) metadata.projectImageBucket = image.bucket;
  if (image.path) metadata.projectImagePath = image.path;
  if (image.thumbnailPath)
    metadata.projectImageThumbnailPath = image.thumbnailPath;
  return metadata;
}

function placeholders(values: readonly unknown[]) {
  if (values.length === 0)
    throw new Error("Something went wrong. Try again in a moment.");
  return values.map(() => "?").join(", ");
}

async function requireProjectsD1Database() {
  const database = await getCloudflareD1Database();
  if (!database)
    throw new Error(
      "Something went wrong. Try again in a moment.",
    );
  return database;
}

async function first<T>(
  database: D1DatabaseLike,
  sql: string,
  values: D1Value[] = [],
) {
  return database
    .prepare<T>(sql)
    .bind(...values)
    .first<T>();
}

async function all<T>(
  database: D1DatabaseLike,
  sql: string,
  values: D1Value[] = [],
) {
  const result = await database
    .prepare<T>(sql)
    .bind(...values)
    .all<T>();
  return result.results ?? [];
}

async function run(
  database: D1DatabaseLike,
  sql: string,
  values: D1Value[] = [],
) {
  const result = await database
    .prepare(sql)
    .bind(...values)
    .run();
  if (result.success === false)
    throw new Error("Something went wrong. Try again in a moment.");
  return result;
}

async function runBatch(
  database: D1DatabaseLike,
  statements: Array<{ sql: string; values?: D1Value[] }>,
) {
  if (statements.length === 0) return;
  if (!database.batch) {
    throw new Error("Something went wrong. Try again in a moment.");
  }
  const results = await database.batch(
    statements.map((statement) =>
      database.prepare(statement.sql).bind(...(statement.values ?? [])),
    ),
  );
  if (results.some((result) => result.success === false)) {
    throw new Error("Something went wrong. Try again in a moment.");
  }
}

function toProjectRecord(row: ProjectD1Row) {
  return {
    ...row,
    currency_code: row.currency_code ?? "USD",
    status: normalizeProjectStatus(row.status),
    metadata: asProjectMetadata(row.metadata),
  };
}

function isPlatformAdmin(user: { role?: string | null }) {
  return isPlatformAdminRole(user.role);
}

function canManageProjectRow(
  row: ProjectDeleteClassificationRow,
  user: { role?: string | null },
) {
  if (isPlatformAdmin(user)) return true;
  return (
    row.workspace_role === "owner" ||
    row.workspace_role === "admin" ||
    row.project_role === "owner" ||
    row.project_role === "admin"
  );
}

function isActivePublicationRow(row: ProjectDeleteClassificationRow) {
  return (
    row.active_publication_count === true || row.active_publication_count === 1
  );
}

function createProjectDeletePreviewHash(input: {
  eligibleIds: string[];
  blocked: unknown[];
  projectRevisions: Array<{ id: string; metadata: string | Record<string, Json> | null; updatedAt: string }>;
  storageTargets: Array<{ bucket: string; path: string }>;
  summary: Record<string, unknown>;
  uploadAssets: ProjectDeleteUploadAssetIdentity[];
}) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        targetType: "project",
        action: "delete",
        ids: input.eligibleIds,
        blocked: input.blocked,
        projects: input.projectRevisions,
        storageTargets: input.storageTargets,
        summary: input.summary,
        uploadAssets: input.uploadAssets,
      }),
    )
    .digest("hex");
}

function createProjectStorageTargets(rows: ProjectD1Row[]) {
  const targets = new Map<string, { bucket: string; path: string }>();
  for (const row of rows) {
    for (const path of getProjectImageStoragePaths(
      asProjectMetadata(row.metadata),
    )) {
      if (!isProjectImageStoragePathForProject(path, row)) continue;
      targets.set(path, { bucket: PROJECT_IMAGE_BUCKET, path });
    }
  }
  return [...targets.values()].sort((a, b) => a.path.localeCompare(b.path));
}

async function readProjectAttachmentStorageTargets(
  database: D1DatabaseLike,
  projectIds: string[],
) {
  if (projectIds.length === 0) return [];
  return all<{ bucket: string; path: string }>(
    database,
    `
      SELECT storage_bucket AS bucket, storage_path AS path
      FROM component_variant_attachments
      WHERE owner_scope = 'project'
        AND project_id IN (${placeholders(projectIds)})
    `,
    projectIds,
  );
}

async function readProjectDeleteUploadAssets(
  database: D1DatabaseLike,
  input: {
    projectIds: string[];
    storagePaths: string[];
    workspaceId: string;
  },
): Promise<ProjectDeleteUploadAssetIdentity[]> {
  const rows = await all<ProjectDeleteUploadAssetRow>(
    database,
    `
      SELECT DISTINCT
        asset.id,
        asset.upload_session_id,
        asset.actor_user_id,
        asset.project_id,
        asset.surface,
        asset.target_entity_type,
        asset.target_entity_id,
        asset.status,
        asset.storage_bucket,
        asset.storage_path,
        asset.thumbnail_path,
        asset.purge_state,
        asset.metadata_json,
        asset.updated_at
      FROM upload_assets asset
      WHERE asset.workspace_id = ?
        AND (
          asset.project_id IN (
            SELECT CAST(value AS TEXT) FROM json_each(?)
          )
          OR EXISTS (
            SELECT 1
            FROM component_variant_attachments attachment
            WHERE attachment.upload_asset_id = asset.id
              AND attachment.owner_scope = 'project'
              AND attachment.project_id IN (
                SELECT CAST(value AS TEXT) FROM json_each(?)
              )
          )
          OR (
            asset.surface = 'project-image'
            AND asset.storage_bucket = ?
            AND (
              asset.storage_path IN (
                SELECT CAST(value AS TEXT) FROM json_each(?)
              )
              OR asset.thumbnail_path IN (
                SELECT CAST(value AS TEXT) FROM json_each(?)
              )
            )
          )
        )
      ORDER BY asset.id
    `,
    [
      input.workspaceId,
      JSON.stringify(input.projectIds),
      JSON.stringify(input.projectIds),
      PROJECT_IMAGE_BUCKET,
      JSON.stringify(input.storagePaths),
      JSON.stringify(input.storagePaths),
    ],
  );

  return rows.map((row) => ({
    actorUserId: row.actor_user_id,
    id: row.id,
    metadataJson: row.metadata_json,
    projectId: row.project_id,
    purgeState: row.purge_state,
    status: row.status,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    surface: row.surface,
    targetEntityId: row.target_entity_id,
    targetEntityType: row.target_entity_type,
    thumbnailPath: row.thumbnail_path,
    updatedAt: row.updated_at,
    uploadSessionId: row.upload_session_id,
  }));
}

function buildProjectDeleteUploadAssetGuardStatement(input: {
  projectIds: string[];
  storagePaths: string[];
  uploadAssets: ProjectDeleteUploadAssetIdentity[];
  workspaceId: string;
}) {
  return {
    sql: `
      WITH expected AS (
        SELECT
          json_extract(value, '$.id') AS id,
          json_extract(value, '$.uploadSessionId') AS upload_session_id,
          json_extract(value, '$.actorUserId') AS actor_user_id,
          json_extract(value, '$.projectId') AS project_id,
          json_extract(value, '$.surface') AS surface,
          json_extract(value, '$.targetEntityType') AS target_entity_type,
          json_extract(value, '$.targetEntityId') AS target_entity_id,
          json_extract(value, '$.status') AS status,
          json_extract(value, '$.storageBucket') AS storage_bucket,
          json_extract(value, '$.storagePath') AS storage_path,
          json_extract(value, '$.thumbnailPath') AS thumbnail_path,
          json_extract(value, '$.purgeState') AS purge_state,
          json_extract(value, '$.metadataJson') AS metadata_json,
          json_extract(value, '$.updatedAt') AS updated_at
        FROM json_each(?)
      ),
      actual AS (
        SELECT DISTINCT
          asset.id,
          asset.upload_session_id,
          asset.actor_user_id,
          asset.project_id,
          asset.surface,
          asset.target_entity_type,
          asset.target_entity_id,
          asset.status,
          asset.storage_bucket,
          asset.storage_path,
          asset.thumbnail_path,
          asset.purge_state,
          asset.metadata_json,
          asset.updated_at
        FROM upload_assets asset
        WHERE asset.workspace_id = ?
          AND (
            asset.project_id IN (
              SELECT CAST(value AS TEXT) FROM json_each(?)
            )
            OR EXISTS (
              SELECT 1
              FROM component_variant_attachments attachment
              WHERE attachment.upload_asset_id = asset.id
                AND attachment.owner_scope = 'project'
                AND attachment.project_id IN (
                  SELECT CAST(value AS TEXT) FROM json_each(?)
                )
            )
            OR (
              asset.surface = 'project-image'
              AND asset.storage_bucket = ?
              AND (
                asset.storage_path IN (
                  SELECT CAST(value AS TEXT) FROM json_each(?)
                )
                OR asset.thumbnail_path IN (
                  SELECT CAST(value AS TEXT) FROM json_each(?)
                )
              )
            )
          )
      )
      SELECT CASE WHEN
        (SELECT COUNT(*) FROM expected) = (SELECT COUNT(*) FROM actual)
        AND NOT EXISTS (
          SELECT 1
          FROM expected
          LEFT JOIN actual ON actual.id = expected.id
          WHERE actual.id IS NULL
            OR actual.upload_session_id IS NOT expected.upload_session_id
            OR actual.actor_user_id IS NOT expected.actor_user_id
            OR actual.project_id IS NOT expected.project_id
            OR actual.surface IS NOT expected.surface
            OR actual.target_entity_type IS NOT expected.target_entity_type
            OR actual.target_entity_id IS NOT expected.target_entity_id
            OR actual.status IS NOT expected.status
            OR actual.storage_bucket IS NOT expected.storage_bucket
            OR actual.storage_path IS NOT expected.storage_path
            OR actual.thumbnail_path IS NOT expected.thumbnail_path
            OR actual.purge_state IS NOT expected.purge_state
            OR actual.metadata_json IS NOT expected.metadata_json
            OR actual.updated_at IS NOT expected.updated_at
        )
      THEN 1 ELSE json('') END AS project_delete_upload_asset_guard
    `,
    values: [
      JSON.stringify(input.uploadAssets),
      input.workspaceId,
      JSON.stringify(input.projectIds),
      JSON.stringify(input.projectIds),
      PROJECT_IMAGE_BUCKET,
      JSON.stringify(input.storagePaths),
      JSON.stringify(input.storagePaths),
    ],
  };
}

async function readProjectsForDeletePreview(
  database: D1DatabaseLike,
  ids: string[],
  userId: string,
) {
  if (ids.length === 0) return [];
  return all<ProjectDeleteClassificationRow>(
    database,
    `
      SELECT
        project.id,
        project.workspace_id,
        project.name,
        project.client_name,
        project.location,
        project.project_code,
        project.currency_code,
        project.metadata,
        project.created_by,
        project.created_at,
        project.updated_at,
        workspace_member.role AS workspace_role,
        project_member.role AS project_role,
        EXISTS (
          SELECT 1
          FROM project_publications publication
          WHERE publication.project_id = project.id
            AND publication.status = 'published'
            AND publication.revoked_at IS NULL
            AND (publication.expires_at IS NULL OR publication.expires_at > ?)
        ) AS active_publication_count
      FROM projects project
      LEFT JOIN workspace_members workspace_member
        ON workspace_member.workspace_id = project.workspace_id
       AND workspace_member.user_id = ?
      LEFT JOIN project_members project_member
        ON project_member.project_id = project.id
       AND project_member.user_id = ?
      WHERE project.id IN (${placeholders(ids)})
    `,
    [new Date().toISOString(), userId, userId, ...ids],
  );
}

async function previewBulkDeleteProjectsInD1(
  database: D1DatabaseLike,
  ids: string[],
  user: { userId: string; role?: string | null },
) {
  const sortedIds = [...ids].sort();
  const rows = await readProjectsForDeletePreview(
    database,
    sortedIds,
    user.userId,
  );
  const rowById = new Map(rows.map((row) => [row.id, row]));
  const eligibleRows: ProjectDeleteClassificationRow[] = [];
  const blocked = [];

  for (const id of sortedIds) {
    const row = rowById.get(id);
    if (!row) {
      blocked.push({
        id,
        name: null,
        code: "not_found",
        message: "Project was not found in this workspace.",
      });
      continue;
    }
    if (!canManageProjectRow(row, user)) {
      blocked.push({
        id,
        name: null,
        code: "forbidden",
        message: "Only project owners/admins can delete projects.",
      });
      continue;
    }
    eligibleRows.push(row);
  }

  const eligibleWorkspaceIds = Array.from(
    new Set(eligibleRows.map((row) => row.workspace_id)),
  ).sort();
  if (eligibleWorkspaceIds.length > 1) {
    blocked.push({
      code: "blocked",
      message:
        "Delete projects from one workspace at a time so audit and storage cleanup stay scoped.",
      details: { workspaceIds: eligibleWorkspaceIds },
    });
  }

  const eligibleIds = eligibleRows.map((row) => row.id).sort();
  const activePublicationWarnings = eligibleRows
    .filter(isActivePublicationRow)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((row) => ({
      id: row.id,
      name: row.name,
      code: "active_publication",
      message:
        "This project has an active published shared link that will be revoked upon deletion.",
    }));
  const storageTargets = [...new Map([
    ...createProjectStorageTargets(eligibleRows),
    ...await readProjectAttachmentStorageTargets(database, eligibleIds),
  ].map((target) => [`${target.bucket}:${target.path}`, target])).values()]
    .sort((left, right) => left.path.localeCompare(right.path));
  const storageWorkspaceId = eligibleWorkspaceIds.length === 1
    ? eligibleWorkspaceIds[0]
    : null;
  const uploadAssets = storageWorkspaceId
    ? await readProjectDeleteUploadAssets(database, {
      projectIds: eligibleIds,
      storagePaths: storageTargets.map((target) => target.path),
      workspaceId: storageWorkspaceId,
    })
    : [];
  const estimateCountRow =
    eligibleIds.length > 0
      ? await first<{ count: number }>(
          database,
          `SELECT COUNT(*) AS count FROM estimates WHERE project_id IN (${placeholders(eligibleIds)})`,
          eligibleIds,
        )
      : null;
  const summary = {
    requestedCount: sortedIds.length,
    eligibleCount: eligibleIds.length,
    blockedCount: blocked.length,
    storageWorkspaceId,
    warningsCount: activePublicationWarnings.length,
    estimateCount: Number(estimateCountRow?.count ?? 0),
    storageTargetCount: storageTargets.length,
    uploadAssetCount: uploadAssets.length,
  };
  const previewHash = createProjectDeletePreviewHash({
    eligibleIds,
    blocked,
    projectRevisions: eligibleRows.map((row) => ({
      id: row.id,
      metadata: row.metadata,
      updatedAt: row.updated_at,
    })),
    storageTargets,
    summary,
    uploadAssets,
  });

  return {
    ok: eligibleIds.length > 0 && blocked.length === 0,
    targetType: "project" as const,
    ids: sortedIds,
    eligibleIds,
    previewHash,
    summary,
    issues: [...blocked, ...activePublicationWarnings],
    blocked,
    storageTargets,
    uploadAssets,
  };
}

async function readProjectPublicationIds(
  database: D1DatabaseLike,
  projectIds: string[],
) {
  if (projectIds.length === 0) return [];
  const rows = await all<ProjectPublicationIdRow>(
    database,
    `SELECT id FROM project_publications WHERE project_id IN (${placeholders(projectIds)})`,
    projectIds,
  );
  return rows.map((row) => row.id);
}

async function readProjectEstimateIds(
  database: D1DatabaseLike,
  projectIds: string[],
) {
  if (projectIds.length === 0) return [];
  const rows = await all<EstimateIdRow>(
    database,
    `SELECT id FROM estimates WHERE project_id IN (${placeholders(projectIds)})`,
    projectIds,
  );
  return rows.map((row) => row.id);
}

async function executeBulkDeleteProjectsInD1(options: {
  database: D1DatabaseLike;
  ids: string[];
  expectedPreviewHash: string;
  correlationId: string;
  user: { userId: string; role?: string | null };
}) {
  const preview = await previewBulkDeleteProjectsInD1(
    options.database,
    options.ids,
    options.user,
  );
  if (preview.previewHash !== options.expectedPreviewHash) {
    return {
      ...preview,
      ok: false,
      issues: [
        ...preview.issues,
        {
          code: "stale_preview",
          message: "Preview changed; refresh the deletion preview.",
        },
      ],
    };
  }
  if (!preview.ok) return preview;

  const eligibleIds = [...preview.eligibleIds].sort();
  const publicationIds = await readProjectPublicationIds(
    options.database,
    eligibleIds,
  );
  const estimateIds = await readProjectEstimateIds(
    options.database,
    eligibleIds,
  );
  const workspaceRow = await first<{ workspace_id: string }>(
    options.database,
    `SELECT workspace_id FROM projects WHERE id IN (${placeholders(eligibleIds)}) LIMIT 1`,
    eligibleIds,
  );
  if (!workspaceRow?.workspace_id) {
    return {
      ...preview,
      ok: false,
      issues: [
        ...preview.issues,
        {
          code: "not_found",
          message: "Project was not found in this workspace.",
        },
      ],
    };
  }

  const now = new Date().toISOString();
  const cleanupNotBefore = getUploadRemovalCleanupNotBefore(new Date(now));
  const eventId = randomUUID();
  const uploadAssetIdsJson = JSON.stringify(
    preview.uploadAssets.map((asset) => asset.id),
  );
  const statements: Array<{ sql: string; values?: D1Value[] }> = [
    buildProjectDeleteUploadAssetGuardStatement({
      projectIds: eligibleIds,
      storagePaths: preview.storageTargets.map((target) => target.path),
      uploadAssets: preview.uploadAssets,
      workspaceId: workspaceRow.workspace_id,
    }),
  ];
  const eligibleSql = placeholders(eligibleIds);

  if (publicationIds.length > 0) {
    const publicationSql = placeholders(publicationIds);
    statements.push(
      {
        sql: `DELETE FROM shared_link_events WHERE publication_id IN (${publicationSql})`,
        values: publicationIds,
      },
      {
        sql: `DELETE FROM shared_link_responses WHERE publication_id IN (${publicationSql})`,
        values: publicationIds,
      },
      {
        sql: `DELETE FROM shared_link_comments WHERE publication_id IN (${publicationSql})`,
        values: publicationIds,
      },
      {
        sql: `DELETE FROM shared_link_recipients WHERE publication_id IN (${publicationSql})`,
        values: publicationIds,
      },
      {
        sql: `DELETE FROM publication_digest_log WHERE publication_id IN (${publicationSql})`,
        values: publicationIds,
      },
      {
        sql: `DELETE FROM project_publication_events WHERE publication_id IN (${publicationSql})`,
        values: publicationIds,
      },
    );
  }
  if (estimateIds.length > 0) {
    const estimateSql = placeholders(estimateIds);
    statements.push(
      {
        sql: `DELETE FROM estimate_sheet_user_preferences WHERE estimate_id IN (${estimateSql})`,
        values: estimateIds,
      },
      {
        sql: `DELETE FROM estimate_sheet_access_settings WHERE estimate_id IN (${estimateSql})`,
        values: estimateIds,
      },
      {
        sql: `DELETE FROM estimate_sheet_members WHERE estimate_id IN (${estimateSql})`,
        values: estimateIds,
      },
      {
        sql: `DELETE FROM estimate_row_items WHERE estimate_id IN (${estimateSql})`,
        values: estimateIds,
      },
      {
        sql: `DELETE FROM estimate_nodes WHERE estimate_id IN (${estimateSql})`,
        values: estimateIds,
      },
      {
        sql: `DELETE FROM estimate_tabs WHERE estimate_id IN (${estimateSql})`,
        values: estimateIds,
      },
      {
        sql: `DELETE FROM estimate_favorites WHERE estimate_id IN (${estimateSql})`,
        values: estimateIds,
      },
    );
  }
  statements.push(
    {
      sql: `
        INSERT INTO mass_deletion_events (
          id,
          workspace_id,
          actor_user_id,
          target_type,
          action,
          target_ids_json,
          preview_hash,
          correlation_id,
          status,
          summary_json,
          blocked_json,
          storage_targets_json,
          metadata_json,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(workspace_id, target_type, action, correlation_id) DO UPDATE SET
          target_ids_json = excluded.target_ids_json,
          preview_hash = excluded.preview_hash,
          status = excluded.status,
          summary_json = excluded.summary_json,
          blocked_json = excluded.blocked_json,
          storage_targets_json = excluded.storage_targets_json,
          metadata_json = excluded.metadata_json,
          updated_at = excluded.updated_at
      `,
      values: [
        eventId,
        workspaceRow.workspace_id,
        options.user.userId,
        "project",
        "delete",
        JSON.stringify(eligibleIds),
        options.expectedPreviewHash,
        options.correlationId,
        "storage_cleanup_pending",
        JSON.stringify(preview.summary),
        JSON.stringify(preview.blocked),
        JSON.stringify(preview.storageTargets),
        JSON.stringify({ warnings: preview.issues }),
        now,
        now,
      ],
    },
    {
      sql: `DELETE FROM project_publications WHERE project_id IN (${eligibleSql})`,
      values: eligibleIds,
    },
    {
      sql: `DELETE FROM project_group_memberships WHERE project_id IN (${eligibleSql})`,
      values: eligibleIds,
    },
    {
      sql: `DELETE FROM project_favorites WHERE project_id IN (${eligibleSql})`,
      values: eligibleIds,
    },
    {
      sql: `DELETE FROM project_locations WHERE project_id IN (${eligibleSql})`,
      values: eligibleIds,
    },
    {
      sql: `DELETE FROM collaboration_invitation_tokens WHERE invitation_id IN (SELECT id FROM collaboration_invitations WHERE project_id IN (${eligibleSql}))`,
      values: eligibleIds,
    },
    {
      sql: `DELETE FROM collaboration_invitations WHERE project_id IN (${eligibleSql})`,
      values: eligibleIds,
    },
    {
      sql: `UPDATE collaboration_audit_events SET project_id = NULL WHERE project_id IN (${eligibleSql})`,
      values: eligibleIds,
    },
    {
      sql: `DELETE FROM project_members WHERE project_id IN (${eligibleSql})`,
      values: eligibleIds,
    },
    {
      sql: `DELETE FROM estimates WHERE project_id IN (${eligibleSql})`,
      values: eligibleIds,
    },
    {
      sql: `DELETE FROM projects WHERE id IN (${eligibleSql})`,
      values: eligibleIds,
    },
    {
      sql: `
        UPDATE upload_assets AS asset
        SET status = 'removed',
            project_id = NULL,
            removal_claim_id = ?,
            removal_claimed_at = ?,
            cleanup_not_before = ?,
            purge_state = 'pending',
            purged_at = NULL,
            target_entity_type = 'mass-deletion',
            target_entity_id = ?,
            metadata_json = json_set(
              metadata_json,
              '$.massDeletionEventId', ?,
              '$.cleanupRequestedAt', ?,
              '$.cleanupReason', 'project_permanent_delete'
            ),
            updated_at = ?
        WHERE asset.id IN (
          SELECT CAST(value AS TEXT) FROM json_each(?)
        )
          AND asset.workspace_id = ?
          AND asset.status NOT IN ('removed', 'deleted')
          AND asset.purge_state <> 'purged'
          AND NOT (${uploadAssetAcceptedReferencePredicate("asset")})
      `,
      values: [
        eventId,
        now,
        cleanupNotBefore,
        eventId,
        eventId,
        now,
        now,
        uploadAssetIdsJson,
        workspaceRow.workspace_id,
      ],
    },
  );
  await runBatch(options.database, statements);

  return {
    ok: true,
    targetType: "project" as const,
    ids: preview.ids,
    deletedIds: eligibleIds,
    auditEventId: eventId,
    previewHash: options.expectedPreviewHash,
    summary: preview.summary,
    issues: [],
    blocked: [],
    storageTargets: preview.storageTargets,
  };
}

export async function createProjectRecord(formData: FormData) {
  await requireWorkshopWriteContext();
  const { workspace, profile } = await ensureDefaultWorkspace();
  const database = await requireProjectsD1Database();

  const name = readRequiredText(formData, "name");
  const clientName = readOptionalText(formData, "clientName");
  const location = readOptionalText(formData, "location");
  const projectCode = readOptionalText(formData, "projectCode");
  const currencyCode = readCurrencyCode(formData, "currencyCode");
  const now = new Date().toISOString();
  const projectId = randomUUID();

  const projectInsert = database.prepare(
    `
      INSERT INTO projects (
        id,
        workspace_id,
        created_by,
        name,
        client_name,
        location,
        project_code,
        currency_code,
        metadata,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).bind(
      projectId,
      workspace.id,
      profile.id,
      name,
      clientName,
      location,
      projectCode,
      currencyCode,
      "{}",
      now,
      now,
    );
  const activationOccurredAt = now;
  const activationStatements = [
    prepareActivationOutboxIntent(database, {
      domainMutationId: projectId,
      userId: profile.id,
      workspaceId: workspace.id,
      projectId,
      milestone: "project_created",
      source: "project",
      occurredAt: activationOccurredAt,
      dedupeKey: `${workspace.id}:${projectId}:project_created`,
    }),
    prepareActivationOutboxIntent(database, {
      domainMutationId: projectId,
      userId: profile.id,
      workspaceId: workspace.id,
      milestone: "workspace_ready",
      source: "project",
      occurredAt: activationOccurredAt,
      dedupeKey: `${workspace.id}:${projectId}:workspace_ready`,
    }),
  ];
  if (!database.batch) throw new Error("Something went wrong. Try again in a moment.");
  const results = await database.batch([projectInsert, ...activationStatements]);
  if (results.some((result) => result.success === false)) {
    throw new Error("Could not create project and activation intents.");
  }
  const project = await first<ProjectD1Row>(
    database,
    "SELECT * FROM projects WHERE id = ? AND workspace_id = ? LIMIT 1",
    [projectId, workspace.id],
  );
  if (!project)
    throw new Error(
      "Something went wrong. Try again in a moment.",
    );
  await recordOnboardingChecklistActionFact(database, {
    family: "project_blank_created",
    mutationId: projectId,
    userId: profile.id,
    workspaceId: workspace.id,
    authoritativeWriteSucceeded: true,
    authoritativeReadbackConfirmed: true,
  });

  revalidatePath("/workshop/projects");
  return toProjectRecord(project);
}

export async function createProject(formData: FormData) {
  await requireWorkshopWriteContext();
  const project = await createProjectRecord(formData);
  redirect(`/workshop/projects/${project.id}`);
}

export async function deleteProject(formData: FormData) {
  await requireWorkshopWriteContext();
  const projectId = readRequiredText(formData, "projectId");
  const expectedPreviewHash = readRequiredText(formData, "expectedPreviewHash");
  const correlationId =
    readOptionalText(formData, "correlationId") ?? undefined;

  const result = await executeBulkDeleteProjects({
    projectIds: [projectId],
    expectedPreviewHash,
    correlationId,
  });
  if (!result.ok)
    throw new Error(result.issues[0]?.message ?? "Could not delete project.");
  redirect("/workshop/projects");
}

function getMassDeletionCorrelationId(correlationId: string | undefined) {
  return correlationId && isUuid(correlationId) ? correlationId : randomUUID();
}

function revalidateProjectDeletionPaths(projectIds: string[]) {
  revalidatePath("/workshop");
  revalidatePath("/workshop/projects");
  for (const projectId of projectIds) {
    revalidatePath(`/workshop/projects/${projectId}`);
    revalidatePath(`/workshop/projects/${projectId}/estimates`);
    revalidatePath(`/workshop/projects/${projectId}/data`);
  }
}

export async function previewBulkDeleteProjects(
  input: BulkDeleteProjectsInput,
): Promise<BulkActionPreviewResult> {
  const { ids, issues } = normalizeBulkActionIds(input.projectIds, {
    label: "projects",
    max: 50,
  });
  if (issues.length > 0)
    return buildRejectedPreviewResult("project", ids, issues);

  try {
    const [database, currentUser] = await Promise.all([
      requireProjectsD1Database(),
      requireCurrentUserContext(),
    ]);
    return coerceBulkPreviewResult(
      await previewBulkDeleteProjectsInD1(database, ids, currentUser),
      { targetType: "project", ids },
    );
  } catch (error) {
    return buildRejectedPreviewResult("project", ids, [
      {
        code: "rpc_error",
        message: toUserFacingErrorMessage(error, "Could not preview project deletion."),
      },
    ]);
  }
}

export async function executeBulkDeleteProjects(
  input: ExecuteBulkDeleteProjectsInput,
): Promise<BulkActionExecutionResult> {
  const { ids, issues } = normalizeBulkActionIds(input.projectIds, {
    label: "projects",
    max: 50,
  });
  if (issues.length > 0) {
    return {
      ...buildRejectedPreviewResult("project", ids, issues),
      deletedIds: [],
    };
  }

  let result: BulkActionExecutionResult;
  try {
    const [database, currentUser] = await Promise.all([
      requireProjectsD1Database(),
      requireWorkshopWriteContext(),
    ]);
    result = coerceBulkExecutionResult(
      await executeBulkDeleteProjectsInD1({
        database,
        ids,
        expectedPreviewHash: input.expectedPreviewHash,
        correlationId: getMassDeletionCorrelationId(input.correlationId),
        user: currentUser,
      }),
      { targetType: "project", ids },
    );
  } catch (error) {
    return {
      ok: false,
      targetType: "project",
      ids,
      deletedIds: [],
      summary: {
        requestedCount: ids.length,
        eligibleCount: 0,
        blockedCount: 1,
      },
      issues: [
        {
          code: "rpc_error",
          message: toUserFacingErrorMessage(error, "Could not delete projects."),
        },
      ],
    };
  }

  if (result.ok) {
    revalidateProjectDeletionPaths(
      result.deletedIds?.length ? result.deletedIds : ids,
    );
  }

  return result;
}

export async function updateProjectImageMetadata(
  projectId: string,
  image: ProjectImageMetadataInput,
) {
  await requireAuth();
  const currentUser = await requireCurrentUserContext();
  const database = await requireProjectsD1Database();
  const project = await readProjectFromD1(database, projectId);
  if (!project) throw new Error("Project not found.");
  if (!(await canEditProjectInD1(database, projectId, currentUser))) {
    throw new Error("You do not have permission to edit this project.");
  }
  assertProjectImagePathForProject("projectImagePath", image.path, project);
  assertProjectImagePathForProject(
    "projectImageThumbnailPath",
    image.thumbnailPath,
    project,
  );
  if (image.bucket && image.bucket !== PROJECT_IMAGE_BUCKET) {
    throw new Error("projectImageBucket must be the project image bucket.");
  }

  const existing = await first<Pick<ProjectD1Row, "metadata">>(
    database,
    "SELECT metadata FROM projects WHERE id = ? AND workspace_id = ? LIMIT 1",
    [projectId, project.workspace_id],
  );
  if (!existing) throw new Error("Project not found.");

  const metadata = applyProjectImageMetadata(
    asProjectMetadata(existing.metadata),
    image,
  );
  const updateResult = await run(
    database,
    `
      UPDATE projects
      SET metadata = ?,
          publication_source_revision = publication_source_revision + 1,
          updated_at = ?
      WHERE id = ? AND workspace_id = ?
        AND (
          ? IS NULL
          OR EXISTS (
            SELECT 1
            FROM upload_assets image_asset
            WHERE image_asset.workspace_id = projects.workspace_id
              AND image_asset.surface = 'project-image'
              AND image_asset.storage_bucket = 'project-images'
              AND image_asset.storage_path = ?
              AND (? IS NULL OR image_asset.thumbnail_path = ?)
              AND image_asset.status = 'finalized'
              AND image_asset.purge_state = 'active'
          )
        )
    `,
    [
      JSON.stringify(metadata),
      new Date().toISOString(),
      projectId,
      project.workspace_id,
      image.path ?? null,
      image.path ?? null,
      image.thumbnailPath ?? null,
      image.thumbnailPath ?? null,
    ],
  );
  if ((updateResult.meta?.changes ?? 0) === 0) {
    throw new Error("Project image is no longer active. Upload it again before saving.");
  }

  revalidatePath("/workshop/projects");
  revalidatePath(`/workshop/projects/${projectId}`);
}

export type UpdateProjectStatusInput = {
  projectId: string;
  status: ProjectStatus;
};

export async function updateProjectStatus(
  input: UpdateProjectStatusInput | null | undefined,
) {
  const currentUser = await requireWorkshopWriteContext();
  const database = await requireProjectsD1Database();
  const projectId = String(input?.projectId ?? "").trim();
  if (!projectId) throw new Error("projectId is required.");
  const status = input?.status;
  if (!isProjectStatus(status)) {
    throw new Error("status must be ongoing, completed, or archived.");
  }

  const project = await readProjectFromD1(database, projectId);
  if (!project) throw new Error("Project not found.");
  if (!(await canEditProjectInD1(database, projectId, currentUser))) {
    throw new Error("You do not have permission to edit this project.");
  }

  await run(
    database,
    `
      UPDATE projects
      SET status = ?,
          updated_at = ?
      WHERE id = ? AND workspace_id = ?
    `,
    [status, new Date().toISOString(), projectId, project.workspace_id],
  );

  await emitProjectMetadataUpdatedEvent(projectId, ["status"]);
  revalidatePath("/workshop/projects");
  revalidatePath(`/workshop/projects/${projectId}`);
}

export async function updateProjectDetails(formData: FormData) {
  const currentUser = await requireWorkshopWriteContext();
  const database = await requireProjectsD1Database();

  const projectId = readRequiredText(formData, "projectId");
  const name = readRequiredText(formData, "name");
  const clientName = readOptionalText(formData, "clientName");
  const location = readOptionalText(formData, "location");
  const projectCode = readOptionalText(formData, "projectCode");
  const currencyCode = readCurrencyCode(formData, "currencyCode");
  const shouldUpdateProjectBudget = formData.has("projectBudget");
  const projectBudget = shouldUpdateProjectBudget
    ? readOptionalNumber(formData, "projectBudget")
    : null;
  const shouldRemoveProjectImage = formData.get("projectImageRemove") === "1";
  const projectImageUrl = readOptionalText(formData, "projectImageUrl");
  const projectImageThumbnailUrl = readOptionalText(
    formData,
    "projectImageThumbnailUrl",
  );
  const projectImageBucket = readOptionalText(formData, "projectImageBucket");
  const projectImagePath = readOptionalStoragePath(
    formData,
    "projectImagePath",
  );
  const projectImageThumbnailPath = readOptionalStoragePath(
    formData,
    "projectImageThumbnailPath",
  );

  const existing = await first<
    Pick<
      ProjectD1Row,
      | "name"
      | "client_name"
      | "location"
      | "project_code"
      | "currency_code"
      | "metadata"
      | "workspace_id"
    >
  >(
    database,
    `
      SELECT name, client_name, location, project_code, currency_code, metadata, workspace_id
      FROM projects
      WHERE id = ?
      LIMIT 1
    `,
    [projectId],
  );
  if (!existing) throw new Error("Project not found.");
  if (!(await canEditProjectInD1(database, projectId, currentUser))) {
    throw new Error("You do not have permission to edit this project.");
  }
  const targetProject = { id: projectId, workspace_id: existing.workspace_id };
  assertProjectImagePathForProject(
    "projectImagePath",
    projectImagePath,
    targetProject,
  );
  assertProjectImagePathForProject(
    "projectImageThumbnailPath",
    projectImageThumbnailPath,
    targetProject,
  );
  if (projectImageBucket && projectImageBucket !== PROJECT_IMAGE_BUCKET) {
    throw new Error("projectImageBucket must be the project image bucket.");
  }

  const changedFields = diffProjectMetadataFields(existing, {
    name,
    client_name: clientName,
    location,
    project_code: projectCode,
    currency_code: currencyCode,
  });

  const metadata = asProjectMetadata(existing.metadata);
  const nextMetadata = { ...metadata };
  const previousProjectImagePaths = getProjectImageStoragePaths(metadata);
  if (shouldUpdateProjectBudget) {
    if (projectBudget === null) {
      delete nextMetadata.projectBudget;
    } else {
      nextMetadata.projectBudget = projectBudget;
    }
  }
  if (shouldRemoveProjectImage || projectImageUrl === null) {
    delete nextMetadata.projectImageUrl;
    delete nextMetadata.projectImageThumbnailUrl;
    delete nextMetadata.projectImageBucket;
    delete nextMetadata.projectImagePath;
    delete nextMetadata.projectImageThumbnailPath;
  } else {
    applyProjectImageMetadata(nextMetadata, {
      url: projectImageUrl,
      thumbnailUrl: projectImageThumbnailUrl ?? undefined,
      bucket: projectImageBucket ?? undefined,
      path: projectImagePath ?? undefined,
      thumbnailPath: projectImageThumbnailPath ?? undefined,
    });
  }

  const updateResult = await run(
    database,
    `
      UPDATE projects
      SET name = ?,
          client_name = ?,
          location = ?,
          project_code = ?,
          currency_code = ?,
          metadata = ?,
          publication_source_revision = publication_source_revision + 1,
          updated_at = ?
      WHERE id = ? AND workspace_id = ?
        AND (
          ? IS NULL
          OR EXISTS (
            SELECT 1
            FROM upload_assets image_asset
            WHERE image_asset.workspace_id = projects.workspace_id
              AND image_asset.surface = 'project-image'
              AND image_asset.storage_bucket = 'project-images'
              AND image_asset.storage_path = ?
              AND (? IS NULL OR image_asset.thumbnail_path = ?)
              AND image_asset.status = 'finalized'
              AND image_asset.purge_state = 'active'
          )
        )
    `,
    [
      name,
      clientName,
      location,
      projectCode,
      currencyCode,
      JSON.stringify(nextMetadata),
      new Date().toISOString(),
      projectId,
      existing.workspace_id,
      projectImagePath,
      projectImagePath,
      projectImageThumbnailPath,
      projectImageThumbnailPath,
    ],
  );
  if ((updateResult.meta?.changes ?? 0) === 0) {
    throw new Error("Project image is no longer active. Upload it again before saving.");
  }

  const shouldRemovePreviousImage =
    shouldRemoveProjectImage ||
    (projectImagePath &&
      previousProjectImagePaths.length > 0 &&
      !previousProjectImagePaths.includes(projectImagePath));
  if (shouldRemovePreviousImage) {
    await removeStoredProjectImagePaths(
      database,
      getProjectImageStoragePaths(metadata),
      targetProject,
    ).catch((error) => {
      logAppError(error, {
        event: "project_image_removal_claim_error",
        action: "claim_replaced_project_image_removal",
        context: {
          project_id: projectId,
          requested_path_count: getProjectImageStoragePaths(metadata).length,
        },
      });
    });
  }

  // Audit the edit so "Project renamed/…" rows can surface in the project
  // activity feed (R11). Best-effort: a failed event must never fail the save.
  await emitProjectMetadataUpdatedEvent(projectId, changedFields);

  revalidatePath("/workshop/projects");
  revalidatePath(`/workshop/projects/${projectId}`);
}

const PROJECT_METADATA_AUDIT_FIELDS = [
  "name",
  "client_name",
  "location",
  "project_code",
  "currency_code",
  "status",
] as const;
type ProjectMetadataAuditField = (typeof PROJECT_METADATA_AUDIT_FIELDS)[number];
type ProjectMetadataValues = Partial<
  Record<ProjectMetadataAuditField, string | null>
>;

/** Compare previous vs incoming project fields; returns the names that changed. */
function diffProjectMetadataFields(
  previous: Partial<ProjectMetadataValues>,
  next: ProjectMetadataValues,
): ProjectMetadataAuditField[] {
  const normalize = (value: string | null | undefined) =>
    value == null ? "" : String(value);
  return PROJECT_METADATA_AUDIT_FIELDS.filter(
    (field) => normalize(previous[field]) !== normalize(next[field]),
  );
}

/** Insert a `project_metadata_updated` D1 audit event (best-effort sidecar while project writes finish migrating). */
async function emitProjectMetadataUpdatedEvent(
  projectId: string,
  changedFields: ProjectMetadataAuditField[],
) {
  if (changedFields.length === 0) return; // no-op save → no event
  try {
    const currentUser = await requireCurrentUserContext();
    const recorded = await recordProjectMetadataUpdatedEventInCloudflareD1({
      actorUserId: currentUser.userId,
      changedFields,
      projectId,
    });
    if (!recorded) {
      console.warn("[projects] metadata audit event skipped", { projectId });
    }
  } catch {
    console.warn("[projects] metadata audit event skipped", { projectId });
  }
}
