import type { D1DatabaseLike } from "@/lib/cloudflare/d1";
import {
  readClientPortalRecipientSession,
  resolveClientPortalBaseContext,
} from "@/lib/client-portal/public-repository";
import {
  evaluateClientPortalPolicy,
  type ClientPortalRecipientActor,
} from "@/lib/client-portal/policy";
import { readBoundedJsonBody } from "@/lib/http/read-bounded-body";
import { assertSameOriginPublicPost } from "@/lib/publication/security";

const MAX_BODY_BYTES = 4 * 1024;
const MAX_EVIDENCE_BYTES = 25 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

type OwnedRequest = { id: string; currentVersionId: string };
type PublicContext = NonNullable<Awaited<ReturnType<typeof resolveClientPortalBaseContext>>>;

export type RecipientEvidenceStageInput = {
  actor: ClientPortalRecipientActor;
  database: D1DatabaseLike;
  portalId: string;
  projectId: string;
  requestId: string;
  requestVersionId: string;
  workspaceId: string;
  surface: "portal-request-evidence";
  fileName: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256: string;
};

export type RecipientEvidenceRouteDependencies = {
  assertSameOrigin: typeof assertSameOriginPublicPost;
  readRecipientSession: typeof readClientPortalRecipientSession;
  resolvePublicContext: typeof resolveClientPortalBaseContext;
  evaluatePolicy: typeof evaluateClientPortalPolicy;
  readOwnedRequest: (input: {
    database: D1DatabaseLike;
    portalId: string;
    projectId: string;
    recipientId: string;
    requestId: string;
    workspaceId: string;
  }) => Promise<OwnedRequest | null>;
  stageEvidenceUpload: (input: RecipientEvidenceStageInput) => Promise<Response>;
};

function headers() {
  return {
    "Cache-Control": "private, no-store, max-age=0, must-revalidate",
    "X-Content-Type-Options": "nosniff",
  };
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: headers() });
}

export async function readRecipientOwnedRequest(input: {
  database: D1DatabaseLike;
  portalId: string;
  projectId: string;
  recipientId: string;
  requestId: string;
  workspaceId: string;
}): Promise<OwnedRequest | null> {
  const row = await input.database.prepare<{ id: string; current_version_id: string }>(`
    SELECT id, current_version_id
    FROM project_change_requests
    WHERE id = ? AND origin_portal_id = ? AND workspace_id = ? AND project_id = ?
      AND requested_by_actor_type = 'recipient' AND requested_by_actor_id = ?
      AND status IN ('submitted', 'acknowledged', 'under_assessment', 'proposal_issued')
    LIMIT 1
  `).bind(
    input.requestId,
    input.portalId,
    input.workspaceId,
    input.projectId,
    input.recipientId,
  ).first();
  return row?.current_version_id ? { id: row.id, currentVersionId: row.current_version_id } : null;
}

async function unavailableEvidenceUpload() {
  return json(
    { error: "Recipient evidence upload finalization is not available through this route yet." },
    501,
  );
}

const dependencies: RecipientEvidenceRouteDependencies = {
  assertSameOrigin: assertSameOriginPublicPost,
  readRecipientSession: readClientPortalRecipientSession,
  resolvePublicContext: resolveClientPortalBaseContext,
  evaluatePolicy: evaluateClientPortalPolicy,
  readOwnedRequest: readRecipientOwnedRequest,
  stageEvidenceUpload: unavailableEvidenceUpload,
};

function normalizedBody(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const requestId = typeof body.requestId === "string" ? body.requestId.trim() : "";
  const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
  const contentType = typeof body.contentType === "string" ? body.contentType.trim().toLowerCase() : "";
  const sizeBytes = Number(body.sizeBytes);
  const checksumSha256 = typeof body.checksumSha256 === "string" ? body.checksumSha256.trim().toLowerCase() : "";
  if (!requestId || requestId.length > 200 || !fileName || fileName.length > 240) return null;
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) return null;
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_EVIDENCE_BYTES) return null;
  if (!/^[a-f0-9]{64}$/.test(checksumSha256)) return null;
  return { requestId, fileName, contentType, sizeBytes, checksumSha256 };
}

export async function handleRecipientEvidenceUpload(
  request: Request,
  token: string,
  routeDependencies: RecipientEvidenceRouteDependencies = dependencies,
) {
  const origin = routeDependencies.assertSameOrigin(request);
  if (!origin.ok) return json({ error: origin.message }, origin.status);
  const normalizedToken = token.trim();
  if (!normalizedToken) return json({ error: "Evidence upload is unavailable." }, 404);

  const parsed = await readBoundedJsonBody<unknown>(request, MAX_BODY_BYTES);
  if (!parsed.ok) return json({ error: parsed.error }, parsed.status);
  const upload = normalizedBody(parsed.value);
  if (!upload) return json({ error: "Evidence upload metadata is invalid." }, 400);

  try {
    const cookie = request.headers.get("cookie") ?? "";
    const actor = await routeDependencies.readRecipientSession(normalizedToken, cookie);
    if (!actor || actor.status !== "active" || actor.verificationState !== "verified") {
      return json({ error: "Evidence upload is unavailable." }, 404);
    }
    const context = await routeDependencies.resolvePublicContext(normalizedToken, actor, false) as PublicContext | null;
    if (!context) return json({ error: "Evidence upload is unavailable." }, 404);
    const ownedRequest = await routeDependencies.readOwnedRequest({
      database: context.database,
      portalId: context.portal.id,
      projectId: context.portal.project_id,
      recipientId: actor.recipientId,
      requestId: upload.requestId,
      workspaceId: context.portal.workspace_id,
    });
    if (!ownedRequest) return json({ error: "Evidence upload is unavailable." }, 404);

    const authorization = routeDependencies.evaluatePolicy({
      actor,
      action: "artifact:upload_evidence",
      portal: context.policyPortal,
      target: {
        kind: "change_request",
        portalId: context.portal.id,
        exposureStatus: "visible",
        ownerRecipientId: actor.recipientId,
        allowedRecipientIds: [actor.recipientId],
      },
    });
    if (!authorization.allowed) return json({ error: "Evidence upload is unavailable." }, 404);

    return routeDependencies.stageEvidenceUpload({
      actor,
      database: context.database,
      portalId: context.portal.id,
      projectId: context.portal.project_id,
      requestId: ownedRequest.id,
      requestVersionId: ownedRequest.currentVersionId,
      workspaceId: context.portal.workspace_id,
      surface: "portal-request-evidence",
      fileName: upload.fileName,
      contentType: upload.contentType,
      sizeBytes: upload.sizeBytes,
      checksumSha256: upload.checksumSha256,
    });
  } catch {
    return json({ error: "Evidence upload is unavailable." }, 404);
  }
}
