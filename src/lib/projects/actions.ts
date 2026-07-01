"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth, requireCurrentUserContext } from "@/lib/auth/session";
import {
  getCloudflareD1Database,
  type D1DatabaseLike,
  type D1Value,
} from "@/lib/cloudflare/d1";
import {
  buildRejectedPreviewResult,
  coerceBulkExecutionResult,
  coerceBulkPreviewResult,
  normalizeBulkActionIds,
  type BulkActionExecutionResult,
  type BulkActionPreviewResult,
} from "@/lib/mass-deletion/bulk-action";
import {
  cleanupStorageTargets,
  storageCleanupReportToJson,
} from "@/lib/mass-deletion/storage-cleanup";
import {
  recordMassDeletionStorageCleanupResultInCloudflareD1,
  recordProjectMetadataUpdatedEventInCloudflareD1,
} from "@/lib/projects/d1-audit";
import { ensureDefaultWorkspace } from "@/lib/repositories/workspace-repository";
import type { Json } from "@/lib/types/json";
import { isUuid } from "@/lib/ids";
import { createRuntimeUploadStorageProvider } from "@/lib/uploads/runtime-storage-provider";
import type { UploadStorageProvider } from "@/lib/uploads/storage-provider";

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
  id: string;
  workspace_id: string;
  name: string;
  client_name: string | null;
  location: string | null;
  project_code: string | null;
  currency_code: string | null;
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
    value.includes("//")
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

function isProjectImageStoragePath(path: string | null | undefined) {
  return Boolean(
    path &&
    path.endsWith(".webp") &&
    path.includes("/project-images/") &&
    !path.includes("..") &&
    !path.includes("//"),
  );
}

async function removeStoredProjectImagePaths(
  storageProvider: Pick<UploadStorageProvider, "removeObjects">,
  paths: string[],
) {
  const safePaths = Array.from(
    new Set(paths.filter(isProjectImageStoragePath)),
  );
  if (safePaths.length === 0) return;
  await storageProvider.removeObjects(PROJECT_IMAGE_BUCKET, safePaths);
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
    throw new Error("At least one SQL placeholder is required.");
  return values.map(() => "?").join(", ");
}

async function requireProjectsD1Database() {
  const database = await getCloudflareD1Database();
  if (!database)
    throw new Error(
      "Cloudflare D1 ARCH_DB binding is required for project actions.",
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
    throw new Error("Cloudflare D1 project action write failed.");
  return result;
}

async function runBatch(
  database: D1DatabaseLike,
  statements: Array<{ sql: string; values?: D1Value[] }>,
) {
  if (statements.length === 0) return;
  if (database.batch) {
    const results = await database.batch(
      statements.map((statement) =>
        database.prepare(statement.sql).bind(...(statement.values ?? [])),
      ),
    );
    if (results.some((result) => result.success === false)) {
      throw new Error("Cloudflare D1 project action batch failed.");
    }
    return;
  }
  for (const statement of statements) {
    await run(database, statement.sql, statement.values ?? []);
  }
}

function toProjectRecord(row: ProjectD1Row) {
  return {
    ...row,
    currency_code: row.currency_code ?? "USD",
    metadata: asProjectMetadata(row.metadata),
  };
}

function isPlatformAdmin(user: { role?: string | null }) {
  return user.role === "ceo" || user.role === "admin";
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
  summary: Record<string, unknown>;
}) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        targetType: "project",
        action: "delete",
        ids: input.eligibleIds,
        blocked: input.blocked,
        summary: input.summary,
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
      if (!isProjectImageStoragePath(path)) continue;
      targets.set(path, { bucket: PROJECT_IMAGE_BUCKET, path });
    }
  }
  return [...targets.values()].sort((a, b) => a.path.localeCompare(b.path));
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
  const storageTargets = createProjectStorageTargets(eligibleRows);
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
    warningsCount: activePublicationWarnings.length,
    estimateCount: Number(estimateCountRow?.count ?? 0),
    storageTargetCount: storageTargets.length,
  };
  const previewHash = createProjectDeletePreviewHash({
    eligibleIds,
    blocked,
    summary,
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
  const eventId = randomUUID();
  const statements: Array<{ sql: string; values?: D1Value[] }> = [];
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
      sql: `UPDATE upload_assets SET project_id = NULL, updated_at = ? WHERE project_id IN (${eligibleSql})`,
      values: [now, ...eligibleIds],
    },
    {
      sql: `DELETE FROM upload_sessions WHERE target_entity_type = 'project' AND target_entity_id IN (${eligibleSql})`,
      values: eligibleIds,
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
  await requireAuth();
  const { workspace, profile } = await ensureDefaultWorkspace();
  const database = await requireProjectsD1Database();

  const name = readRequiredText(formData, "name");
  const clientName = readOptionalText(formData, "clientName");
  const location = readOptionalText(formData, "location");
  const projectCode = readOptionalText(formData, "projectCode");
  const currencyCode = readCurrencyCode(formData, "currencyCode");
  const now = new Date().toISOString();
  const projectId = randomUUID();

  await run(
    database,
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
    [
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
    ],
  );
  const project = await first<ProjectD1Row>(
    database,
    "SELECT * FROM projects WHERE id = ? AND workspace_id = ? LIMIT 1",
    [projectId, workspace.id],
  );
  if (!project)
    throw new Error(
      "Project was created but could not be loaded from Cloudflare D1.",
    );

  revalidatePath("/workshop/projects");
  return toProjectRecord(project);
}

export async function createProject(formData: FormData) {
  await requireAuth();
  const project = await createProjectRecord(formData);
  redirect(`/workshop/projects/${project.id}`);
}

export async function deleteProject(formData: FormData) {
  await requireAuth();
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
        message: `Could not preview project deletion: ${error instanceof Error ? error.message : "Cloudflare D1 preview failed."}`,
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
      requireCurrentUserContext(),
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
          message: `Could not delete projects: ${error instanceof Error ? error.message : "Cloudflare D1 delete failed."}`,
        },
      ],
    };
  }

  if (result.ok) {
    const storageProvider = await createRuntimeUploadStorageProvider();
    const storageCleanup = await cleanupStorageTargets(
      storageProvider,
      result.storageTargets,
      { kind: "project" },
    );
    result.storageCleanup = storageCleanup;
    if (result.auditEventId) {
      try {
        const recorded =
          await recordMassDeletionStorageCleanupResultInCloudflareD1({
            targetEventId: result.auditEventId,
            cleanupResult: storageCleanupReportToJson(storageCleanup) as Record<
              string,
              Json | undefined
            >,
          });
        if (!recorded) {
          console.warn(
            "[projects] mass deletion storage cleanup audit skipped",
            { auditEventId: result.auditEventId },
          );
        }
      } catch {
        console.warn("[projects] mass deletion storage cleanup audit skipped", {
          auditEventId: result.auditEventId,
        });
      }
    }
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
  const { workspace } = await ensureDefaultWorkspace();
  const database = await requireProjectsD1Database();

  const existing = await first<Pick<ProjectD1Row, "metadata">>(
    database,
    "SELECT metadata FROM projects WHERE id = ? AND workspace_id = ? LIMIT 1",
    [projectId, workspace.id],
  );
  if (!existing) throw new Error("Project not found in the current workspace.");

  const metadata = applyProjectImageMetadata(
    asProjectMetadata(existing.metadata),
    image,
  );
  await run(
    database,
    "UPDATE projects SET metadata = ?, updated_at = ? WHERE id = ? AND workspace_id = ?",
    [
      JSON.stringify(metadata),
      new Date().toISOString(),
      projectId,
      workspace.id,
    ],
  );

  revalidatePath("/workshop/projects");
  revalidatePath(`/workshop/projects/${projectId}`);
}

export async function updateProjectDetails(formData: FormData) {
  await requireAuth();
  const { workspace } = await ensureDefaultWorkspace();
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
    >
  >(
    database,
    `
      SELECT name, client_name, location, project_code, currency_code, metadata
      FROM projects
      WHERE id = ? AND workspace_id = ?
      LIMIT 1
    `,
    [projectId, workspace.id],
  );
  if (!existing) throw new Error("Project not found in the current workspace.");

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

  await run(
    database,
    `
      UPDATE projects
      SET name = ?,
          client_name = ?,
          location = ?,
          project_code = ?,
          currency_code = ?,
          metadata = ?,
          updated_at = ?
      WHERE id = ? AND workspace_id = ?
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
      workspace.id,
    ],
  );

  const shouldRemovePreviousImage =
    shouldRemoveProjectImage ||
    (projectImagePath &&
      previousProjectImagePaths.length > 0 &&
      !previousProjectImagePaths.includes(projectImagePath));
  if (shouldRemovePreviousImage) {
    const storageProvider = await createRuntimeUploadStorageProvider();
    await removeStoredProjectImagePaths(
      storageProvider,
      getProjectImageStoragePaths(metadata),
    );
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
] as const;
type ProjectMetadataAuditField = (typeof PROJECT_METADATA_AUDIT_FIELDS)[number];
type ProjectMetadataValues = Record<ProjectMetadataAuditField, string | null>;

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
