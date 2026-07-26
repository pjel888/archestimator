import "server-only";

import type { D1DatabaseLike } from "@/lib/cloudflare/d1";

import {
  PROJECT_ARTIFACT_TYPES,
  PROJECT_ARTIFACT_VERSION_SOURCE_KINDS,
  type ProjectArtifactActor,
  type ProjectArtifactRetentionState,
  type ProjectArtifactType,
  type ProjectArtifactVersionSourceKind,
} from "./contracts";
import { ProjectArtifactError } from "./errors";
import {
  addProjectArtifactVersionRecords,
  archiveProjectArtifactRecord,
  batchChanged,
  createProjectArtifactRecords,
  findProjectArtifactVersionByContentHash,
  listProjectArtifactRecords,
  readProjectArtifactRecord,
  readProjectArtifactUploadAsset,
  readProjectArtifactVersionRecord,
  type ProjectArtifactUploadAssetRow,
} from "./repository";

export { ProjectArtifactError } from "./errors";

type ArtifactScope = {
  database: D1DatabaseLike;
  projectId: string;
  workspaceId: string;
};

type ArtifactVersionMetadataInput = {
  contentSha256: string;
  metadata?: Record<string, unknown>;
  originalAuthoredAt?: string | null;
  revisionLabel?: string | null;
  sourceKind?: ProjectArtifactVersionSourceKind;
  sourcePlatform?: string | null;
  sourceReferenceUrl?: string | null;
  uploadAssetId: string;
  versionDescription?: string | null;
  versionId: string;
};

export type CreateArtifactInput = ArtifactScope & ArtifactVersionMetadataInput & {
  actor: ProjectArtifactActor;
  artifactCode?: string | null;
  artifactId: string;
  artifactType: ProjectArtifactType;
  description?: string | null;
  discipline?: string | null;
  now?: string;
  title: string;
};

export type AddArtifactVersionInput = ArtifactScope & ArtifactVersionMetadataInput & {
  actor: ProjectArtifactActor;
  artifactId: string;
  expectedCurrentVersionId?: string;
  now?: string;
};

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const MAX_TITLE_LENGTH = 240;
const MAX_TEXT_LENGTH = 4_000;
const MAX_LIST_LIMIT = 100;

function requiredIdentifier(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized || normalized.length > 200) {
    throw new ProjectArtifactError("project_artifact_invalid_input", `${label} is invalid.`);
  }
  return normalized;
}

function optionalText(value: string | null | undefined, label: string, maximumLength = MAX_TEXT_LENGTH) {
  if (value === null || value === undefined) return null;
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maximumLength) {
    throw new ProjectArtifactError("project_artifact_invalid_input", `${label} is too long.`);
  }
  return normalized;
}

function requiredText(value: string, label: string, maximumLength: number) {
  const normalized = optionalText(value, label, maximumLength);
  if (!normalized) throw new ProjectArtifactError("project_artifact_invalid_input", `${label} is required.`);
  return normalized;
}

function isoTimestamp(value: string | undefined) {
  const timestamp = value ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(timestamp))) {
    throw new ProjectArtifactError("project_artifact_invalid_input", "Project artifact timestamp is invalid.");
  }
  return timestamp;
}

function contentHash(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!SHA256_PATTERN.test(normalized)) {
    throw new ProjectArtifactError("project_artifact_invalid_input", "Project artifact content hash is invalid.");
  }
  return normalized;
}

function actor(input: ProjectArtifactActor): ProjectArtifactActor {
  return {
    id: requiredIdentifier(input.id, "Project artifact actor"),
    type: input.type,
    domainRole: optionalText(input.domainRole, "Project artifact actor role", 120),
  };
}

function metadataJson(value: Record<string, unknown> | undefined) {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    throw new ProjectArtifactError("project_artifact_invalid_input", "Project artifact metadata is invalid.");
  }
}

function validOverride(upload: ProjectArtifactUploadAssetRow, now: string, expectedHash: string) {
  if (upload.scan_status !== "override_approved") return false;
  const expiresAt = upload.scan_override_expires_at;
  return Boolean(
    upload.scan_override_actor_user_id
    && upload.scan_override_reason?.trim()
    && expiresAt
    && Number.isFinite(Date.parse(expiresAt))
    && Date.parse(expiresAt) > Date.parse(now)
    && upload.scan_override_checksum_sha256 === expectedHash
    && upload.checksum_sha256 === expectedHash,
  );
}

export async function assertArtifactVersionPublishable(input: ArtifactScope & {
  contentSha256: string;
  now?: string;
  uploadAssetId: string;
}) {
  const expectedHash = contentHash(input.contentSha256);
  const now = isoTimestamp(input.now);
  const upload = await readProjectArtifactUploadAsset({
    database: input.database,
    uploadAssetId: requiredIdentifier(input.uploadAssetId, "Project artifact upload"),
  });
  const owned = upload
    && upload.workspace_id === input.workspaceId
    && upload.project_id === input.projectId
    && (upload.surface === "project-artifact" || upload.surface === "portal-request-evidence");
  const finalized = upload?.status === "finalized" && upload.purge_state === "active";
  const checksumMatches = upload?.checksum_sha256 === expectedHash;
  const contentTypePermitsUse = upload?.surface === "project-artifact"
    ? upload.content_type === "application/pdf"
    : Boolean(upload && ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/avif"].includes(upload.content_type));
  const scanPermitsUse = upload?.scan_status === "clean" || Boolean(upload && validOverride(upload, now, expectedHash));

  if (!owned || !finalized || !checksumMatches || !contentTypePermitsUse || upload.size_bytes <= 0 || !scanPermitsUse) {
    throw new ProjectArtifactError(
      "project_artifact_upload_not_publishable",
      "Project artifact upload is not finalized and scan-approved for this project.",
    );
  }
  return upload;
}

function createReplayMatches(input: CreateArtifactInput, artifact: NonNullable<Awaited<ReturnType<typeof readProjectArtifactRecord>>>, normalizedHash: string) {
  return artifact.id === input.artifactId
    && artifact.title === input.title.trim()
    && artifact.artifactType === input.artifactType
    && artifact.artifactCode === optionalText(input.artifactCode, "Project artifact code", 120)
    && artifact.currentVersion?.id === input.versionId
    && artifact.currentVersion.contentSha256 === normalizedHash
    && artifact.currentVersion.uploadAssetId === input.uploadAssetId;
}

export async function createArtifact(input: CreateArtifactInput) {
  const normalized = {
    ...input,
    actor: actor(input.actor),
    artifactCode: optionalText(input.artifactCode, "Project artifact code", 120),
    artifactId: requiredIdentifier(input.artifactId, "Project artifact"),
    contentSha256: contentHash(input.contentSha256),
    description: optionalText(input.description, "Project artifact description"),
    discipline: optionalText(input.discipline, "Project artifact discipline", 120),
    metadataJson: metadataJson(input.metadata),
    now: isoTimestamp(input.now),
    originalAuthoredAt: input.originalAuthoredAt ? isoTimestamp(input.originalAuthoredAt) : null,
    revisionLabel: optionalText(input.revisionLabel, "Project artifact revision", 120),
    sourceKind: input.sourceKind ?? "internal_upload",
    sourcePlatform: optionalText(input.sourcePlatform, "Project artifact source platform", 120),
    sourceReferenceUrl: optionalText(input.sourceReferenceUrl, "Project artifact source reference", 2_000),
    title: requiredText(input.title, "Project artifact title", MAX_TITLE_LENGTH),
    uploadAssetId: requiredIdentifier(input.uploadAssetId, "Project artifact upload"),
    versionDescription: optionalText(input.versionDescription, "Project artifact version description"),
    versionId: requiredIdentifier(input.versionId, "Project artifact version"),
    workspaceId: requiredIdentifier(input.workspaceId, "Workspace"),
    projectId: requiredIdentifier(input.projectId, "Project"),
  };
  if (!PROJECT_ARTIFACT_TYPES.includes(normalized.artifactType)) {
    throw new ProjectArtifactError("project_artifact_invalid_input", "Project artifact type is invalid.");
  }
  if (!PROJECT_ARTIFACT_VERSION_SOURCE_KINDS.includes(normalized.sourceKind)) {
    throw new ProjectArtifactError("project_artifact_invalid_input", "Project artifact source kind is invalid.");
  }
  const upload = await assertArtifactVersionPublishable({
    contentSha256: normalized.contentSha256,
    database: input.database,
    now: normalized.now,
    projectId: normalized.projectId,
    uploadAssetId: normalized.uploadAssetId,
    workspaceId: normalized.workspaceId,
  });
  const existing = await readProjectArtifactRecord({
    artifactId: normalized.artifactId,
    database: input.database,
    projectId: normalized.projectId,
    workspaceId: normalized.workspaceId,
  });
  if (existing) {
    if (createReplayMatches(normalized, existing, normalized.contentSha256)) return { artifact: existing, replayed: true };
    throw new ProjectArtifactError("project_artifact_conflict", "Project artifact idempotency identity is already in use.");
  }
  if (!input.database.batch) {
    throw new ProjectArtifactError("project_artifact_batch_required", "Project artifact creation requires an atomic D1 batch.");
  }

  try {
    const results = await createProjectArtifactRecords({ ...normalized, upload });
    if (!batchChanged(results, 3)) {
      throw new ProjectArtifactError("project_artifact_write_failed", "Project artifact creation did not commit completely.");
    }
  } catch (error) {
    const raced = await readProjectArtifactRecord({
      artifactId: normalized.artifactId,
      database: input.database,
      projectId: normalized.projectId,
      workspaceId: normalized.workspaceId,
    });
    if (raced && createReplayMatches(normalized, raced, normalized.contentSha256)) return { artifact: raced, replayed: true };
    if (error instanceof ProjectArtifactError) throw error;
    throw new ProjectArtifactError("project_artifact_write_failed", "Project artifact creation failed.");
  }

  const artifact = await readProjectArtifactRecord({
    artifactId: normalized.artifactId,
    database: input.database,
    projectId: normalized.projectId,
    workspaceId: normalized.workspaceId,
  });
  if (!artifact || artifact.status !== "active" || artifact.currentVersionId !== normalized.versionId) {
    throw new ProjectArtifactError("project_artifact_write_failed", "Project artifact creation could not be verified.");
  }
  return { artifact, replayed: false };
}

export async function addArtifactVersion(input: AddArtifactVersionInput) {
  const normalizedHash = contentHash(input.contentSha256);
  const normalizedActor = actor(input.actor);
  const now = isoTimestamp(input.now);
  const artifact = await readProjectArtifactRecord({
    artifactId: requiredIdentifier(input.artifactId, "Project artifact"),
    database: input.database,
    projectId: requiredIdentifier(input.projectId, "Project"),
    workspaceId: requiredIdentifier(input.workspaceId, "Workspace"),
  });
  if (!artifact) throw new ProjectArtifactError("project_artifact_not_found", "Project artifact was not found.");
  if (artifact.status !== "active" || !artifact.currentVersion) {
    throw new ProjectArtifactError("project_artifact_conflict", "Project artifact cannot accept a new version.");
  }

  const duplicate = await findProjectArtifactVersionByContentHash({
    artifactId: artifact.id,
    contentSha256: normalizedHash,
    database: input.database,
    projectId: artifact.projectId,
    workspaceId: artifact.workspaceId,
  });
  if (duplicate) return { artifact, version: duplicate, replayed: true };

  const expectedCurrentVersionId = input.expectedCurrentVersionId
    ? requiredIdentifier(input.expectedCurrentVersionId, "Expected project artifact version")
    : artifact.currentVersion.id;
  if (expectedCurrentVersionId !== artifact.currentVersion.id) {
    throw new ProjectArtifactError("project_artifact_conflict", "Project artifact changed before the new version was saved.");
  }
  const upload = await assertArtifactVersionPublishable({
    contentSha256: normalizedHash,
    database: input.database,
    now,
    projectId: artifact.projectId,
    uploadAssetId: input.uploadAssetId,
    workspaceId: artifact.workspaceId,
  });
  if (!input.database.batch) {
    throw new ProjectArtifactError("project_artifact_batch_required", "Project artifact versioning requires an atomic D1 batch.");
  }

  const versionId = requiredIdentifier(input.versionId, "Project artifact version");
  const versionRecord = {
    actor: normalizedActor,
    artifactId: artifact.id,
    contentSha256: normalizedHash,
    database: input.database,
    expectedCurrentVersionId,
    metadataJson: metadataJson(input.metadata),
    nextVersionNumber: artifact.currentVersion.versionNumber + 1,
    now,
    originalAuthoredAt: input.originalAuthoredAt ? isoTimestamp(input.originalAuthoredAt) : null,
    projectId: artifact.projectId,
    revisionLabel: optionalText(input.revisionLabel, "Project artifact revision", 120),
    sourceKind: input.sourceKind ?? "internal_upload",
    sourcePlatform: optionalText(input.sourcePlatform, "Project artifact source platform", 120),
    sourceReferenceUrl: optionalText(input.sourceReferenceUrl, "Project artifact source reference", 2_000),
    supersedesVersionId: artifact.currentVersion.id,
    upload,
    versionDescription: optionalText(input.versionDescription, "Project artifact version description"),
    versionId,
    workspaceId: artifact.workspaceId,
  };
  if (!PROJECT_ARTIFACT_VERSION_SOURCE_KINDS.includes(versionRecord.sourceKind)) {
    throw new ProjectArtifactError("project_artifact_invalid_input", "Project artifact source kind is invalid.");
  }

  try {
    const results = await addProjectArtifactVersionRecords(versionRecord);
    if (!batchChanged(results, 2)) {
      throw new ProjectArtifactError("project_artifact_conflict", "Project artifact changed before the new version was saved.");
    }
  } catch (error) {
    const raced = await findProjectArtifactVersionByContentHash({
      artifactId: artifact.id,
      contentSha256: normalizedHash,
      database: input.database,
      projectId: artifact.projectId,
      workspaceId: artifact.workspaceId,
    });
    if (raced) {
      const current = await readProjectArtifactRecord({
        artifactId: artifact.id,
        database: input.database,
        projectId: artifact.projectId,
        workspaceId: artifact.workspaceId,
      });
      if (current) return { artifact: current, version: raced, replayed: true };
    }
    if (error instanceof ProjectArtifactError) throw error;
    throw new ProjectArtifactError("project_artifact_write_failed", "Project artifact version could not be saved.");
  }

  const [current, version] = await Promise.all([
    readProjectArtifactRecord({ artifactId: artifact.id, database: input.database, projectId: artifact.projectId, workspaceId: artifact.workspaceId }),
    readProjectArtifactVersionRecord({ database: input.database, projectId: artifact.projectId, versionId, workspaceId: artifact.workspaceId }),
  ]);
  if (!current || !version || current.currentVersionId !== version.id) {
    throw new ProjectArtifactError("project_artifact_write_failed", "Project artifact version could not be verified.");
  }
  return { artifact: current, version, replayed: false };
}

export function listProjectArtifacts(input: ArtifactScope & { includeArchived?: boolean; limit?: number }) {
  const limit = input.limit ?? 50;
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new ProjectArtifactError("project_artifact_invalid_input", "Project artifact list limit is invalid.");
  }
  return listProjectArtifactRecords({
    ...input,
    includeArchived: input.includeArchived === true,
    limit: Math.min(limit, MAX_LIST_LIMIT),
  });
}

export async function readArtifact(input: ArtifactScope & { artifactId: string }) {
  const artifact = await readProjectArtifactRecord(input);
  return artifact && (artifact.status === "active" || artifact.status === "archived") ? artifact : null;
}

export function readArtifactVersion(input: ArtifactScope & { versionId: string }) {
  return readProjectArtifactVersionRecord(input);
}

export async function archiveArtifact(input: ArtifactScope & { artifactId: string; now?: string }) {
  const artifactId = requiredIdentifier(input.artifactId, "Project artifact");
  const existing = await readProjectArtifactRecord({ ...input, artifactId });
  if (!existing) throw new ProjectArtifactError("project_artifact_not_found", "Project artifact was not found.");
  if (existing.status === "archived") return existing;
  if (existing.status !== "active") {
    throw new ProjectArtifactError("project_artifact_conflict", "Project artifact cannot be archived from its current state.");
  }
  const result = await archiveProjectArtifactRecord({ ...input, artifactId, now: isoTimestamp(input.now) });
  if (Number(result.meta?.changes) !== 1) {
    throw new ProjectArtifactError("project_artifact_conflict", "Project artifact changed before it could be archived.");
  }
  const archived = await readProjectArtifactRecord({ ...input, artifactId });
  if (!archived || archived.status !== "archived") {
    throw new ProjectArtifactError("project_artifact_write_failed", "Project artifact archive could not be verified.");
  }
  return archived;
}

export function assertArtifactTombstoneAllowed(state: ProjectArtifactRetentionState) {
  for (const count of [state.issuedReferences, state.baselineReferences, state.activeLegalHolds]) {
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new ProjectArtifactError("project_artifact_invalid_input", "Project artifact retention state is invalid.");
    }
  }
  if (
    state.issuedReferences > 0
    || state.baselineReferences > 0
    || state.activeLegalHolds > 0
    || state.retentionPolicyBlocksRemoval
  ) {
    throw new ProjectArtifactError("project_artifact_retained", "Project artifact is retained and cannot be tombstoned.");
  }
}
