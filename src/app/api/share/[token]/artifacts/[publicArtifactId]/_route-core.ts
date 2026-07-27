import type { D1DatabaseLike } from "@/lib/cloudflare/d1";
import {
  hasClientPortalPasswordSession,
  readClientPortalRecipientSession,
  resolveClientPortalPublicContext,
} from "@/lib/client-portal/public-repository";
import { checkClientPortalArtifactRangeRateLimit } from "@/lib/client-portal/public-rate-limits";
import {
  evaluateClientPortalPolicy,
  type ClientPortalActor,
} from "@/lib/client-portal/policy";
import {
  assertArtifactVersionPublishable,
  readArtifact,
  readArtifactVersion,
} from "@/lib/project-artifacts/service";
import { createRuntimeUploadStorageProvider } from "@/lib/uploads/runtime-storage-provider";
import type { UploadStorageProvider } from "@/lib/uploads/storage-provider";
import {
  createArtifactContentResponse,
  readArtifactUploadLocator,
  type ArtifactUploadLocator,
} from "@/app/api/projects/[projectId]/artifacts/_download";

type IssuedArtifactRow = {
  artifact_id: string;
  artifact_version_id: string;
  public_artifact_id: string;
  file_name_snapshot: string;
  content_type_snapshot: string;
  size_bytes_snapshot: number;
  content_sha256_snapshot: string;
  downloadable: number;
  policy_snapshot_json: string;
};

export type PublicIssuedArtifact = {
  artifactId: string;
  artifactVersionId: string;
  publicArtifactId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  contentSha256: string;
  downloadable: boolean;
  allowedRecipientIds: readonly string[] | null;
  allowedOrganizations: readonly string[] | null;
};

type PublicContext = NonNullable<Awaited<ReturnType<typeof resolveClientPortalPublicContext>>>;

export type PublicArtifactRouteDependencies = {
  checkRangeRateLimit: typeof checkClientPortalArtifactRangeRateLimit;
  readRecipientSession: typeof readClientPortalRecipientSession;
  hasPasswordSession: typeof hasClientPortalPasswordSession;
  resolvePublicContext: typeof resolveClientPortalPublicContext;
  readIssuedArtifact: (input: {
    database: D1DatabaseLike;
    issueId: string;
    publicArtifactId: string;
  }) => Promise<PublicIssuedArtifact | null>;
  evaluatePolicy: typeof evaluateClientPortalPolicy;
  readArtifact: typeof readArtifact;
  readArtifactVersion: typeof readArtifactVersion;
  assertPublishable: typeof assertArtifactVersionPublishable;
  readUploadLocator: (
    database: D1DatabaseLike,
    input: { uploadAssetId: string; workspaceId: string; projectId: string },
  ) => Promise<ArtifactUploadLocator | null>;
  createStorageProvider: () => Promise<UploadStorageProvider>;
};

function optionalStringArray(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (value === undefined) return { valid: true as const, value: null };
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    return { valid: false as const, value: null };
  }
  return { valid: true as const, value: value.map((item) => item.trim()).filter(Boolean) };
}

function policySnapshot(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const record = parsed as Record<string, unknown>;
    const allowedRecipientIds = optionalStringArray(record, "allowedRecipientIds");
    const allowedOrganizations = optionalStringArray(record, "allowedOrganizations");
    if (!allowedRecipientIds.valid || !allowedOrganizations.valid) return null;
    return {
      allowedRecipientIds: allowedRecipientIds.value,
      allowedOrganizations: allowedOrganizations.value,
    };
  } catch {
    return null;
  }
}

export async function readPublicIssuedArtifact(input: {
  database: D1DatabaseLike;
  issueId: string;
  publicArtifactId: string;
}): Promise<PublicIssuedArtifact | null> {
  const row = await input.database.prepare<IssuedArtifactRow>(`
    SELECT artifact_id, artifact_version_id, public_artifact_id,
           file_name_snapshot, content_type_snapshot, size_bytes_snapshot,
           content_sha256_snapshot,
           downloadable, policy_snapshot_json
    FROM client_portal_issue_artifacts
    WHERE issue_id = ? AND public_artifact_id = ?
    LIMIT 1
  `).bind(input.issueId, input.publicArtifactId).first();
  if (!row) return null;
  const policy = policySnapshot(row.policy_snapshot_json);
  if (!policy) return null;
  return {
    artifactId: row.artifact_id,
    artifactVersionId: row.artifact_version_id,
    publicArtifactId: row.public_artifact_id,
    fileName: row.file_name_snapshot,
    contentType: row.content_type_snapshot,
    sizeBytes: Number(row.size_bytes_snapshot),
    contentSha256: row.content_sha256_snapshot,
    downloadable: Boolean(row.downloadable),
    ...policy,
  };
}

const dependencies: PublicArtifactRouteDependencies = {
  checkRangeRateLimit: checkClientPortalArtifactRangeRateLimit,
  readRecipientSession: readClientPortalRecipientSession,
  hasPasswordSession: hasClientPortalPasswordSession,
  resolvePublicContext: resolveClientPortalPublicContext,
  readIssuedArtifact: readPublicIssuedArtifact,
  evaluatePolicy: evaluateClientPortalPolicy,
  readArtifact,
  readArtifactVersion,
  assertPublishable: assertArtifactVersionPublishable,
  readUploadLocator: readArtifactUploadLocator,
  createStorageProvider: createRuntimeUploadStorageProvider,
};

function unavailable() {
  return Response.json(
    { error: "Shared artifact is unavailable." },
    {
      status: 404,
      headers: {
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

function rateLimited(message: string, retryAfter: number) {
  return Response.json(
    { error: message },
    {
      status: 429,
      headers: {
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        "Retry-After": String(retryAfter),
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

function serviceUnavailable() {
  return Response.json(
    { error: "Shared artifact is temporarily unavailable." },
    {
      status: 503,
      headers: {
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

function issueNumber(request: Request) {
  const value = new URL(request.url).searchParams.get("issue");
  if (!value) return undefined;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

export async function handlePublicArtifactContent(
  request: Request,
  token: string,
  publicArtifactId: string,
  routeDependencies: PublicArtifactRouteDependencies = dependencies,
) {
  const normalizedToken = token.trim();
  const normalizedPublicId = publicArtifactId.trim();
  if (!normalizedToken || !normalizedPublicId || normalizedPublicId.length > 200) return unavailable();
  const requestedIssueNumber = issueNumber(request);
  if (requestedIssueNumber === null) return unavailable();

  try {
    const cookie = request.headers.get("cookie") ?? "";
    const recipient = await routeDependencies.readRecipientSession(normalizedToken, cookie);
    const actor: ClientPortalActor = recipient ?? { kind: "anonymous" };
    const passwordAuthenticated = await routeDependencies.hasPasswordSession(normalizedToken, cookie).catch(() => false);
    const context = await routeDependencies.resolvePublicContext(
      normalizedToken,
      requestedIssueNumber,
      actor,
      passwordAuthenticated,
    ) as PublicContext | null;
    if (!context) return unavailable();

    const issued = await routeDependencies.readIssuedArtifact({
      database: context.database,
      issueId: context.issue.id,
      publicArtifactId: normalizedPublicId,
    });
    if (!issued || issued.contentType !== "application/pdf" || issued.sizeBytes <= 0) return unavailable();

    const download = new URL(request.url).searchParams.get("download") === "1";
    const authorization = routeDependencies.evaluatePolicy({
      actor,
      action: download ? "artifact:download" : "artifact:view",
      portal: context.policyPortal,
      issue: {
        id: context.issue.id,
        status: context.issue.status,
        isCurrent: context.issue.id === context.portal.current_issue_id,
      },
      target: {
        kind: "artifact",
        portalId: context.portal.id,
        exposureStatus: "visible",
        allowedRecipientIds: issued.allowedRecipientIds ?? undefined,
        allowedOrganizations: issued.allowedOrganizations ?? undefined,
        downloadable: issued.downloadable,
      },
    });
    if (!authorization.allowed) return unavailable();

    if (request.headers.has("range")) {
      let rateLimit;
      try {
        rateLimit = await routeDependencies.checkRangeRateLimit({
          portalId: context.portal.id,
          publicArtifactId: normalizedPublicId,
          recipientId: actor.kind === "recipient" ? actor.recipientId : null,
          request,
        });
      } catch {
        return serviceUnavailable();
      }
      if (!rateLimit.allowed) return rateLimited(rateLimit.message, rateLimit.retryAfter);
    }

    const [artifact, version] = await Promise.all([
      routeDependencies.readArtifact({
        artifactId: issued.artifactId,
        database: context.database,
        projectId: context.portal.project_id,
        workspaceId: context.portal.workspace_id,
      }),
      routeDependencies.readArtifactVersion({
        database: context.database,
        projectId: context.portal.project_id,
        versionId: issued.artifactVersionId,
        workspaceId: context.portal.workspace_id,
      }),
    ]);
    if (
      !artifact
      || !version
      || version.artifactId !== issued.artifactId
      || version.fileName !== issued.fileName
      || version.contentType !== "application/pdf"
      || version.contentType !== issued.contentType
      || version.contentSha256 !== issued.contentSha256
      || version.sizeBytes !== issued.sizeBytes
    ) {
      return unavailable();
    }
    await routeDependencies.assertPublishable({
      contentSha256: version.contentSha256,
      database: context.database,
      projectId: context.portal.project_id,
      uploadAssetId: version.uploadAssetId,
      workspaceId: context.portal.workspace_id,
    });
    const locator = await routeDependencies.readUploadLocator(context.database, {
      uploadAssetId: version.uploadAssetId,
      projectId: context.portal.project_id,
      workspaceId: context.portal.workspace_id,
    });
    if (!locator) return unavailable();
    const storageProvider = await routeDependencies.createStorageProvider();
    return createArtifactContentResponse({
      request,
      ...locator,
      fileName: issued.fileName,
      contentType: "application/pdf",
      sizeBytes: issued.sizeBytes,
      storageProvider,
      download,
    });
  } catch {
    return unavailable();
  }
}
