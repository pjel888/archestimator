import "server-only";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1Result,
  D1Value,
} from "@/lib/cloudflare/d1";

import type {
  ProjectArtifact,
  ProjectArtifactActor,
  ProjectArtifactStatus,
  ProjectArtifactType,
  ProjectArtifactVersion,
  ProjectArtifactVersionSourceKind,
} from "./contracts";

type ArtifactRow = {
  id: string;
  workspace_id: string;
  project_id: string;
  artifact_code: string | null;
  title: string;
  artifact_type: ProjectArtifactType;
  discipline: string | null;
  description: string | null;
  status: ProjectArtifactStatus;
  current_version_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

type ArtifactVersionRow = {
  id: string;
  workspace_id: string;
  project_id: string;
  artifact_id: string;
  version_number: number;
  revision_label: string | null;
  upload_asset_id: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  content_sha256: string;
  source_kind: ProjectArtifactVersionSourceKind;
  source_platform: string | null;
  source_reference_url: string | null;
  original_authored_at: string | null;
  description: string | null;
  metadata_json: string;
  created_by_actor_type: ProjectArtifactActor["type"];
  created_by_actor_id: string;
  created_by_domain_role_snapshot: string | null;
  created_at: string;
  supersedes_version_id: string | null;
};

export type ProjectArtifactUploadAssetRow = {
  id: string;
  workspace_id: string | null;
  project_id: string | null;
  surface: "project-artifact" | "portal-request-evidence" | string;
  status: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  checksum_sha256: string | null;
  scan_status: string | null;
  scan_override_actor_user_id: string | null;
  scan_override_reason: string | null;
  scan_override_expires_at: string | null;
  scan_override_checksum_sha256: string | null;
  purge_state: string;
};

export type CreateProjectArtifactRecordInput = {
  actor: ProjectArtifactActor;
  artifactCode: string | null;
  artifactId: string;
  artifactType: ProjectArtifactType;
  contentSha256: string;
  database: D1DatabaseLike;
  description: string | null;
  discipline: string | null;
  metadataJson: string;
  now: string;
  originalAuthoredAt: string | null;
  projectId: string;
  revisionLabel: string | null;
  sourceKind: ProjectArtifactVersionSourceKind;
  sourcePlatform: string | null;
  sourceReferenceUrl: string | null;
  title: string;
  upload: ProjectArtifactUploadAssetRow;
  versionDescription: string | null;
  versionId: string;
  workspaceId: string;
  extraStatements?: D1PreparedStatementLike[];
};

export type AddProjectArtifactVersionRecordInput = Omit<
  CreateProjectArtifactRecordInput,
  "artifactCode" | "artifactType" | "description" | "discipline" | "title"
> & {
  expectedCurrentVersionId: string;
  nextVersionNumber: number;
  supersedesVersionId: string;
};

function statement(database: D1DatabaseLike, sql: string, values: D1Value[]): D1PreparedStatementLike {
  return database.prepare(sql).bind(...values);
}

async function first<T>(database: D1DatabaseLike, sql: string, values: D1Value[]): Promise<T | null> {
  return database.prepare<T>(sql).bind(...values).first<T>();
}

function parseMetadata(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function toVersion(row: ArtifactVersionRow): ProjectArtifactVersion {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    artifactId: row.artifact_id,
    versionNumber: Number(row.version_number),
    revisionLabel: row.revision_label,
    uploadAssetId: row.upload_asset_id,
    fileName: row.file_name,
    contentType: row.content_type,
    sizeBytes: Number(row.size_bytes),
    contentSha256: row.content_sha256,
    sourceKind: row.source_kind,
    sourcePlatform: row.source_platform,
    sourceReferenceUrl: row.source_reference_url,
    originalAuthoredAt: row.original_authored_at,
    description: row.description,
    metadata: parseMetadata(row.metadata_json),
    createdByActorType: row.created_by_actor_type,
    createdByActorId: row.created_by_actor_id,
    createdByDomainRoleSnapshot: row.created_by_domain_role_snapshot,
    createdAt: row.created_at,
    supersedesVersionId: row.supersedes_version_id,
  };
}

async function toArtifact(database: D1DatabaseLike, row: ArtifactRow): Promise<ProjectArtifact> {
  const currentVersion = row.current_version_id
    ? await readProjectArtifactVersionRecord({
        database,
        projectId: row.project_id,
        versionId: row.current_version_id,
        workspaceId: row.workspace_id,
      })
    : null;
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    artifactCode: row.artifact_code,
    title: row.title,
    artifactType: row.artifact_type,
    discipline: row.discipline,
    description: row.description,
    status: row.status,
    currentVersionId: row.current_version_id,
    currentVersion,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

const ARTIFACT_SELECT = `
  SELECT id, workspace_id, project_id, artifact_code, title, artifact_type,
         discipline, description, status, current_version_id, created_by,
         created_at, updated_at, archived_at
  FROM project_artifacts
`;

const VERSION_SELECT = `
  SELECT id, workspace_id, project_id, artifact_id, version_number, revision_label,
         upload_asset_id, file_name, content_type, size_bytes, content_sha256,
         source_kind, source_platform, source_reference_url, original_authored_at,
         description, metadata_json, created_by_actor_type, created_by_actor_id,
         created_by_domain_role_snapshot, created_at, supersedes_version_id
  FROM project_artifact_versions
`;

export async function readProjectArtifactRecord(input: {
  artifactId: string;
  database: D1DatabaseLike;
  projectId: string;
  workspaceId: string;
}) {
  const row = await first<ArtifactRow>(
    input.database,
    `${ARTIFACT_SELECT} WHERE id = ? AND workspace_id = ? AND project_id = ? LIMIT 1`,
    [input.artifactId, input.workspaceId, input.projectId],
  );
  return row ? toArtifact(input.database, row) : null;
}

export async function listProjectArtifactRecords(input: {
  database: D1DatabaseLike;
  includeArchived: boolean;
  limit: number;
  projectId: string;
  workspaceId: string;
}) {
  const statuses = input.includeArchived ? "('active', 'archived')" : "('active')";
  const result = await input.database.prepare<ArtifactRow>(`
    ${ARTIFACT_SELECT}
    WHERE workspace_id = ? AND project_id = ? AND status IN ${statuses}
    ORDER BY updated_at DESC, id DESC
    LIMIT ?
  `).bind(input.workspaceId, input.projectId, input.limit).all<ArtifactRow>();
  return Promise.all((result.results ?? []).map((row) => toArtifact(input.database, row)));
}

export async function readProjectArtifactVersionRecord(input: {
  database: D1DatabaseLike;
  projectId: string;
  versionId: string;
  workspaceId: string;
}) {
  const row = await first<ArtifactVersionRow>(
    input.database,
    `${VERSION_SELECT} WHERE id = ? AND workspace_id = ? AND project_id = ? LIMIT 1`,
    [input.versionId, input.workspaceId, input.projectId],
  );
  return row ? toVersion(row) : null;
}

export async function findProjectArtifactVersionByContentHash(input: {
  artifactId: string;
  contentSha256: string;
  database: D1DatabaseLike;
  projectId: string;
  workspaceId: string;
}) {
  const row = await first<ArtifactVersionRow>(
    input.database,
    `${VERSION_SELECT}
     WHERE artifact_id = ? AND content_sha256 = ? AND workspace_id = ? AND project_id = ?
     ORDER BY version_number ASC LIMIT 1`,
    [input.artifactId, input.contentSha256, input.workspaceId, input.projectId],
  );
  return row ? toVersion(row) : null;
}

export async function readProjectArtifactUploadAsset(input: {
  database: D1DatabaseLike;
  uploadAssetId: string;
}) {
  return first<ProjectArtifactUploadAssetRow>(input.database, `
    SELECT id, workspace_id, project_id, surface, status, file_name, content_type,
           size_bytes, checksum_sha256, scan_status, scan_override_actor_user_id,
           scan_override_reason, scan_override_expires_at,
           scan_override_checksum_sha256, purge_state
    FROM upload_assets WHERE id = ? LIMIT 1
  `, [input.uploadAssetId]);
}

function versionInsertValues(input: CreateProjectArtifactRecordInput | AddProjectArtifactVersionRecordInput) {
  return [
    input.versionId,
    input.workspaceId,
    input.projectId,
    input.artifactId,
    "nextVersionNumber" in input ? input.nextVersionNumber : 1,
    input.revisionLabel,
    input.upload.id,
    input.upload.file_name,
    input.upload.content_type,
    input.upload.size_bytes,
    input.contentSha256,
    input.sourceKind,
    input.sourcePlatform,
    input.sourceReferenceUrl,
    input.originalAuthoredAt,
    input.versionDescription,
    input.metadataJson,
    input.actor.type,
    input.actor.id,
    input.actor.domainRole ?? null,
    input.now,
    "supersedesVersionId" in input ? input.supersedesVersionId : null,
  ] satisfies D1Value[];
}

const VERSION_INSERT_COLUMNS = `
  id, workspace_id, project_id, artifact_id, version_number, revision_label,
  upload_asset_id, file_name, content_type, size_bytes, content_sha256,
  source_kind, source_platform, source_reference_url, original_authored_at,
  description, metadata_json, created_by_actor_type, created_by_actor_id,
  created_by_domain_role_snapshot, created_at, supersedes_version_id
`;

const VERSION_INSERT_PLACEHOLDERS = Array.from({ length: 22 }, () => "?").join(", ");

export async function createProjectArtifactRecords(input: CreateProjectArtifactRecordInput) {
  if (!input.database.batch) return null;
  return input.database.batch([
    statement(input.database, `
      INSERT INTO project_artifacts (
        id, workspace_id, project_id, artifact_code, title, artifact_type,
        discipline, description, status, current_version_id, created_by,
        created_at, updated_at, archived_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'initializing', NULL, ?, ?, ?, NULL)
    `, [
      input.artifactId,
      input.workspaceId,
      input.projectId,
      input.artifactCode,
      input.title,
      input.artifactType,
      input.discipline,
      input.description,
      input.actor.id,
      input.now,
      input.now,
    ]),
    statement(input.database, `
      INSERT INTO project_artifact_versions (${VERSION_INSERT_COLUMNS})
      VALUES (${VERSION_INSERT_PLACEHOLDERS})
    `, versionInsertValues(input)),
    statement(input.database, `
      UPDATE project_artifacts
      SET current_version_id = ?, status = 'active', updated_at = ?
      WHERE id = ? AND workspace_id = ? AND project_id = ?
        AND status = 'initializing' AND current_version_id IS NULL
    `, [input.versionId, input.now, input.artifactId, input.workspaceId, input.projectId]),
    ...(input.extraStatements ?? []),
  ]);
}

export async function addProjectArtifactVersionRecords(input: AddProjectArtifactVersionRecordInput) {
  if (!input.database.batch) return null;
  return input.database.batch([
    statement(input.database, `
      INSERT INTO project_artifact_versions (${VERSION_INSERT_COLUMNS})
      SELECT ${VERSION_INSERT_PLACEHOLDERS}
      FROM project_artifacts
      WHERE id = ? AND workspace_id = ? AND project_id = ?
        AND status = 'active' AND current_version_id = ?
    `, [
      ...versionInsertValues(input),
      input.artifactId,
      input.workspaceId,
      input.projectId,
      input.expectedCurrentVersionId,
    ]),
    statement(input.database, `
      UPDATE project_artifacts
      SET current_version_id = ?, updated_at = ?
      WHERE id = ? AND workspace_id = ? AND project_id = ?
        AND status = 'active' AND current_version_id = ?
        AND EXISTS (
          SELECT 1 FROM project_artifact_versions
          WHERE id = ? AND artifact_id = project_artifacts.id
        )
    `, [
      input.versionId,
      input.now,
      input.artifactId,
      input.workspaceId,
      input.projectId,
      input.expectedCurrentVersionId,
      input.versionId,
    ]),
    ...(input.extraStatements ?? []),
  ]);
}

export async function archiveProjectArtifactRecord(input: {
  artifactId: string;
  database: D1DatabaseLike;
  extraStatements?: D1PreparedStatementLike[];
  now: string;
  projectId: string;
  workspaceId: string;
}) {
  if (!input.database.batch) throw new Error("Project artifact archive requires D1 batch support.");
  return input.database.batch([
    statement(input.database, `
      UPDATE project_artifacts
      SET status = 'archived', archived_at = ?, updated_at = ?
      WHERE id = ? AND workspace_id = ? AND project_id = ? AND status = 'active'
    `, [input.now, input.now, input.artifactId, input.workspaceId, input.projectId]),
    ...(input.extraStatements ?? []),
  ]);
}

export function batchChanged(result: D1Result[] | null, expectedStatements: number) {
  return Boolean(
    result
    && result.length === expectedStatements
    && result.every((entry) => entry.success !== false && Number(entry.meta?.changes) === 1),
  );
}
