import { randomUUID } from "node:crypto";

import { getCurrentUserContext } from "@/lib/auth/session";
import { canAccessWholeProjectInD1, canEditProjectInD1, readProjectFromD1 } from "@/lib/authz/d1-access";
import { getCloudflareD1Database, type D1DatabaseLike } from "@/lib/cloudflare/d1";
import { readBoundedJsonBody } from "@/lib/http/read-bounded-body";
import { isUuid } from "@/lib/ids";
import { getCurrentUserTermsAcceptanceStatus } from "@/lib/legal/terms-acceptance";
import {
  addArtifactVersion,
  archiveArtifact,
  createArtifact,
  listProjectArtifacts,
  ProjectArtifactError,
} from "@/lib/project-artifacts/service";

const JSON_BODY_LIMIT = 32 * 1024;

const PRIVATE_JSON_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  "X-Content-Type-Options": "nosniff",
};

export type InternalArtifactAccess = {
  ok: true;
  database: D1DatabaseLike;
  projectId: string;
  workspaceId: string;
  actor: { id: string; type: "internal_user"; domainRole?: string | null };
};

export type InternalArtifactRouteDependencies = {
  resolveAccess: (projectId: string, mode: "read" | "write") => Promise<InternalArtifactAccess | { ok: false; response: Response }>;
  listProjectArtifacts: typeof listProjectArtifacts;
  createArtifact: typeof createArtifact;
  addArtifactVersion: typeof addArtifactVersion;
  archiveArtifact: typeof archiveArtifact;
};

type ArtifactBody = Record<string, unknown>;

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: PRIVATE_JSON_HEADERS });
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: unknown) {
  const normalized = text(value);
  return normalized || null;
}

function optionalRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

async function body(request: Request): Promise<{ ok: true; value: ArtifactBody } | { ok: false; response: Response }> {
  const parsed = await readBoundedJsonBody<unknown>(request, JSON_BODY_LIMIT);
  if (!parsed.ok) return { ok: false, response: json({ error: parsed.error }, parsed.status) };
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return { ok: false, response: json({ error: "Request body must be a JSON object." }, 400) };
  }
  return { ok: true, value: parsed.value as ArtifactBody };
}

function artifactError(error: unknown) {
  if (!(error instanceof ProjectArtifactError)) return json({ error: "Project artifact operation failed." }, 500);
  const status = error.code === "project_artifact_not_found"
    ? 404
    : error.code === "project_artifact_conflict" || error.code === "project_artifact_upload_not_publishable"
      ? 409
      : error.code === "project_artifact_invalid_input" || error.code === "project_artifact_invalid_file"
        ? 400
        : 500;
  return json({ error: error.message, code: error.code }, status);
}

export async function resolveInternalArtifactAccess(projectId: string, mode: "read" | "write") {
  if (!isUuid(projectId)) return { ok: false as const, response: json({ error: "Invalid project." }, 400) };
  const currentUser = await getCurrentUserContext();
  if (!currentUser) return { ok: false as const, response: json({ error: "Unauthorized." }, 401) };

  try {
    const terms = await getCurrentUserTermsAcceptanceStatus(currentUser.userId);
    if (terms.requiresAcceptance) return { ok: false as const, response: json({ error: "Current legal terms must be accepted." }, 403) };
  } catch {
    return { ok: false as const, response: json({ error: "Project artifact access is unavailable." }, 503) };
  }

  const database = await getCloudflareD1Database();
  if (!database) return { ok: false as const, response: json({ error: "Project artifact access is unavailable." }, 503) };
  const project = await readProjectFromD1(database, projectId).catch(() => null);
  if (!project) return { ok: false as const, response: json({ error: "Project not found." }, 404) };

  const allowed = await (mode === "write"
    ? canEditProjectInD1(database, projectId, currentUser)
    : canAccessWholeProjectInD1(database, projectId, currentUser)).catch(() => false);
  if (!allowed) return { ok: false as const, response: json({ error: "Project artifact access denied." }, 403) };

  return {
    ok: true as const,
    database,
    projectId,
    workspaceId: project.workspace_id,
    actor: { id: currentUser.userId, type: "internal_user" as const },
  };
}

export const defaultInternalArtifactRouteDependencies: InternalArtifactRouteDependencies = {
  resolveAccess: resolveInternalArtifactAccess,
  listProjectArtifacts,
  createArtifact,
  addArtifactVersion,
  archiveArtifact,
};

export async function handleListArtifacts(
  request: Request,
  projectId: string,
  dependencies: InternalArtifactRouteDependencies = defaultInternalArtifactRouteDependencies,
) {
  const access = await dependencies.resolveAccess(projectId, "read");
  if (!access.ok) return access.response;
  const url = new URL(request.url);
  const parsedLimit = Number(url.searchParams.get("limit") ?? 50);
  const limit = Number.isSafeInteger(parsedLimit) ? parsedLimit : 50;
  try {
    const artifacts = await dependencies.listProjectArtifacts({
      database: access.database,
      projectId: access.projectId,
      workspaceId: access.workspaceId,
      includeArchived: url.searchParams.get("includeArchived") === "true",
      limit,
    });
    return json({ artifacts });
  } catch (error) {
    return artifactError(error);
  }
}

export async function handleCreateArtifact(
  request: Request,
  projectId: string,
  dependencies: InternalArtifactRouteDependencies = defaultInternalArtifactRouteDependencies,
) {
  const access = await dependencies.resolveAccess(projectId, "write");
  if (!access.ok) return access.response;
  const parsed = await body(request);
  if (!parsed.ok) return parsed.response;
  const value = parsed.value;
  try {
    const result = await dependencies.createArtifact({
      actor: access.actor,
      artifactCode: optionalText(value.artifactCode),
      artifactId: text(value.artifactId) || randomUUID(),
      artifactType: text(value.artifactType) as Parameters<typeof createArtifact>[0]["artifactType"],
      contentSha256: text(value.contentSha256),
      database: access.database,
      description: optionalText(value.description),
      discipline: optionalText(value.discipline),
      metadata: optionalRecord(value.metadata),
      originalAuthoredAt: optionalText(value.originalAuthoredAt),
      projectId: access.projectId,
      revisionLabel: optionalText(value.revisionLabel),
      sourceKind: optionalText(value.sourceKind) as Parameters<typeof createArtifact>[0]["sourceKind"],
      sourcePlatform: optionalText(value.sourcePlatform),
      sourceReferenceUrl: optionalText(value.sourceReferenceUrl),
      title: text(value.title),
      uploadAssetId: text(value.uploadAssetId),
      versionDescription: optionalText(value.versionDescription),
      versionId: text(value.versionId) || randomUUID(),
      workspaceId: access.workspaceId,
    });
    return json(result, result.replayed ? 200 : 201);
  } catch (error) {
    return artifactError(error);
  }
}

export async function handleVersionArtifact(
  request: Request,
  projectId: string,
  artifactId: string,
  dependencies: InternalArtifactRouteDependencies = defaultInternalArtifactRouteDependencies,
) {
  const access = await dependencies.resolveAccess(projectId, "write");
  if (!access.ok) return access.response;
  const parsed = await body(request);
  if (!parsed.ok) return parsed.response;
  const value = parsed.value;
  try {
    const result = await dependencies.addArtifactVersion({
      actor: access.actor,
      artifactId,
      contentSha256: text(value.contentSha256),
      database: access.database,
      expectedCurrentVersionId: optionalText(value.expectedCurrentVersionId) ?? undefined,
      metadata: optionalRecord(value.metadata),
      originalAuthoredAt: optionalText(value.originalAuthoredAt),
      projectId: access.projectId,
      revisionLabel: optionalText(value.revisionLabel),
      sourceKind: optionalText(value.sourceKind) as Parameters<typeof addArtifactVersion>[0]["sourceKind"],
      sourcePlatform: optionalText(value.sourcePlatform),
      sourceReferenceUrl: optionalText(value.sourceReferenceUrl),
      uploadAssetId: text(value.uploadAssetId),
      versionDescription: optionalText(value.versionDescription),
      versionId: text(value.versionId) || randomUUID(),
      workspaceId: access.workspaceId,
    });
    return json(result, result.replayed ? 200 : 201);
  } catch (error) {
    return artifactError(error);
  }
}

export async function handleArchiveArtifact(
  _request: Request,
  projectId: string,
  artifactId: string,
  dependencies: InternalArtifactRouteDependencies = defaultInternalArtifactRouteDependencies,
) {
  const access = await dependencies.resolveAccess(projectId, "write");
  if (!access.ok) return access.response;
  try {
    const artifact = await dependencies.archiveArtifact({
      artifactId,
      database: access.database,
      projectId: access.projectId,
      workspaceId: access.workspaceId,
    });
    return json({ artifact });
  } catch (error) {
    return artifactError(error);
  }
}
