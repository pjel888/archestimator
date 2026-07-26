import "server-only";

import { createHash } from "node:crypto";

import type { D1DatabaseLike } from "@/lib/cloudflare/d1";
import {
  CLIENT_PORTAL_NO_STORE_HEADERS,
  readClientPortalRecipientSession,
  requiresClientPortalPassword,
  resolveClientPortalBaseContext,
} from "@/lib/client-portal/public-repository";
import { evaluateClientPortalPolicy, type ClientPortalActor } from "@/lib/client-portal/policy";
import {
  checkClientPortalThreadRateLimit,
  checkClientPortalThreadReadRateLimit,
} from "@/lib/client-portal/public-rate-limits";
import { readBoundedJsonBody } from "@/lib/http/read-bounded-body";
import { assertSameOriginPublicPost } from "@/lib/publication/security";
import { toUserFacingErrorMessage } from "@/lib/observability/user-facing-error";

import type { ProjectChangeRequest, ProjectChangeRequestActor, ProjectChangeRequestExposure } from "./contracts";
import { ProjectChangeRequestError } from "./errors";
import {
  amendChangeRequest,
  createChangeRequest,
  readChangeRequest,
  withdrawChangeRequest,
} from "./service";

type RecipientActor = Extract<ClientPortalActor, { kind: "recipient" }>;
type PublicContext = NonNullable<Awaited<ReturnType<typeof resolveClientPortalBaseContext>>>;

type ExposureRow = {
  public_request_id: string;
  request_id: string;
  status: ProjectChangeRequestExposure["status"];
};

type RecipientIdentityRow = {
  domain_role: string | null;
  email_normalized: string;
};

type ExposedRequest = {
  exposure: Pick<ProjectChangeRequestExposure, "publicRequestId" | "status">;
  request: ProjectChangeRequest;
};

export type PublicChangeRequestDependencies = {
  amendRequest: typeof amendChangeRequest;
  createRequest: typeof createChangeRequest;
  evaluatePolicy: typeof evaluateClientPortalPolicy;
  listExposedRequests: typeof listExposedRequests;
  readExposedRequest: typeof readExposedRequest;
  readRecipientIdentity: typeof readRecipientIdentity;
  readRecipientSession: typeof readClientPortalRecipientSession;
  readRateLimit: typeof checkClientPortalThreadReadRateLimit;
  requiresPassword: typeof requiresClientPortalPassword;
  resolveBaseContext: typeof resolveClientPortalBaseContext;
  mutationRateLimit: typeof checkClientPortalThreadRateLimit;
  withdrawRequest: typeof withdrawChangeRequest;
};

const dependencies: PublicChangeRequestDependencies = {
  amendRequest: amendChangeRequest,
  createRequest: createChangeRequest,
  evaluatePolicy: evaluateClientPortalPolicy,
  listExposedRequests,
  readExposedRequest,
  readRecipientIdentity,
  readRecipientSession: readClientPortalRecipientSession,
  readRateLimit: checkClientPortalThreadReadRateLimit,
  requiresPassword: requiresClientPortalPassword,
  resolveBaseContext: resolveClientPortalBaseContext,
  mutationRateLimit: checkClientPortalThreadRateLimit,
  withdrawRequest: withdrawChangeRequest,
};

function unavailable() {
  return Response.json(
    { error: "Project request is unavailable." },
    { status: 404, headers: CLIENT_PORTAL_NO_STORE_HEADERS },
  );
}

function invalid(message: string) {
  return Response.json(
    { error: toUserFacingErrorMessage(new Error(message), "Project request is invalid.") },
    { status: 400, headers: CLIENT_PORTAL_NO_STORE_HEADERS },
  );
}

function rateLimited(message: string, retryAfter: number) {
  return Response.json(
    { error: message },
    {
      status: 429,
      headers: { ...CLIENT_PORTAL_NO_STORE_HEADERS, "Retry-After": String(retryAfter) },
    },
  );
}

function requestError(error: unknown) {
  if (!(error instanceof ProjectChangeRequestError)) return unavailable();
  const message = toUserFacingErrorMessage(error, "Project request is unavailable.");
  if (error.code === "project_change_request_invalid_input") return invalid(message);
  if (error.code === "project_change_request_forbidden") {
    return Response.json({ error: message }, { status: 403, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  }
  if (
    error.code === "project_change_request_conflict"
    || error.code === "project_change_request_invalid_transition"
  ) {
    return Response.json({ error: message }, { status: 409, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  }
  if (error.code === "project_change_request_not_found") return unavailable();
  return Response.json(
    { error: "Project request could not be saved." },
    { status: 503, headers: CLIENT_PORTAL_NO_STORE_HEADERS },
  );
}

function stableId(prefix: string, ...parts: string[]) {
  const digest = createHash("sha256").update(parts.join("\u0000")).digest("hex").slice(0, 32);
  return `${prefix}_${digest}`;
}

function idempotencyKey(request: Request) {
  const value = request.headers.get("idempotency-key")?.trim() ?? "";
  return value && value.length <= 120 ? value : null;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function externalReference(value: unknown) {
  const normalized = optionalString(value);
  if (!normalized) return null;
  if (normalized.length > 2_000) return undefined;
  try {
    const url = new URL(normalized);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function publicProjection(
  exposed: ExposedRequest,
  actor: RecipientActor,
  context: PublicContext,
  evaluatePolicy: typeof evaluateClientPortalPolicy,
) {
  const target = {
    kind: "change_request" as const,
    portalId: context.portal.id,
    exposureStatus: exposed.exposure.status,
    ownerRecipientId: exposed.request.requestedByActorType === "recipient"
      ? exposed.request.requestedByActorId
      : null,
  };
  const view = evaluatePolicy({
    actor,
    action: "request:view",
    portal: context.policyPortal,
    target,
  });
  if (!view.allowed) return null;
  const amend = evaluatePolicy({
    actor,
    action: "request:amend_own",
    portal: context.policyPortal,
    target,
  });
  const withdraw = evaluatePolicy({
    actor,
    action: "request:withdraw_own",
    portal: context.policyPortal,
    target,
  });
  return {
    canAmend: amend.allowed,
    canWithdraw: withdraw.allowed,
    currentVersion: {
      contentHash: exposed.request.currentVersion.contentHash,
      description: exposed.request.currentVersion.description,
      requestedEffectiveDate: exposed.request.currentVersion.requestedEffectiveDate,
      title: exposed.request.currentVersion.title,
      versionNumber: exposed.request.currentVersion.versionNumber,
    },
    publicRequestId: exposed.exposure.publicRequestId,
    requestCode: exposed.request.requestCode,
    requestedAt: exposed.request.requestedAt,
    status: exposed.request.status,
  };
}

async function recipientContext(
  request: Request,
  token: string,
  mutation: boolean,
  routeDependencies: PublicChangeRequestDependencies,
) {
  if (mutation) {
    const origin = assertSameOriginPublicPost(request);
    if (!origin.ok) {
      return {
        error: Response.json(
          { error: origin.message },
          { status: origin.status, headers: CLIENT_PORTAL_NO_STORE_HEADERS },
        ),
      };
    }
  }
  const cookie = request.headers.get("cookie") ?? "";
  if (await routeDependencies.requiresPassword(token, cookie)) {
    return {
      error: Response.json(
        { error: "Client Portal password required.", passwordRequired: true },
        { status: 423, headers: CLIENT_PORTAL_NO_STORE_HEADERS },
      ),
    };
  }
  const actor = await routeDependencies.readRecipientSession(token, cookie);
  if (!actor) {
    return {
      error: Response.json(
        { error: "Verified recipient session required." },
        { status: 401, headers: CLIENT_PORTAL_NO_STORE_HEADERS },
      ),
    };
  }
  const context = await routeDependencies.resolveBaseContext(token, actor, true);
  return context ? { actor, context } : { error: unavailable() };
}

async function recipientRequestActor(
  database: D1DatabaseLike,
  actor: RecipientActor,
  routeDependencies: PublicChangeRequestDependencies,
): Promise<ProjectChangeRequestActor | null> {
  const identity = await routeDependencies.readRecipientIdentity(database, actor.portalId, actor.recipientId);
  if (!identity) return null;
  return {
    domainRole: identity.domain_role ?? "other",
    email: identity.email_normalized,
    id: actor.recipientId,
    name: actor.displayName,
    organization: actor.organization,
    permissionRole: actor.role,
    type: "recipient",
  };
}

export async function readRecipientIdentity(
  database: D1DatabaseLike,
  portalId: string,
  recipientId: string,
) {
  return database.prepare<RecipientIdentityRow>(`
    SELECT email_normalized, domain_role
    FROM client_portal_recipients
    WHERE id = ? AND portal_id = ? AND status = 'active' AND verification_state = 'verified'
    LIMIT 1
  `).bind(recipientId, portalId).first<RecipientIdentityRow>();
}

export async function listExposedRequests(database: D1DatabaseLike, context: PublicContext) {
  const rows = await database.prepare<ExposureRow>(`
    SELECT request_id, public_request_id, status
    FROM client_portal_request_exposures
    WHERE portal_id = ? AND status IN ('visible', 'withdrawn')
    ORDER BY exposed_at DESC, public_request_id DESC
    LIMIT 100
  `).bind(context.portal.id).all<ExposureRow>();
  const exposed = await Promise.all((rows.results ?? []).map(async (row) => {
    const request = await readChangeRequest({
      database,
      projectId: context.portal.project_id,
      requestId: row.request_id,
      workspaceId: context.portal.workspace_id,
    });
    return request ? {
      exposure: { publicRequestId: row.public_request_id, status: row.status },
      request,
    } : null;
  }));
  return exposed.filter((entry): entry is ExposedRequest => entry !== null);
}

export async function readExposedRequest(
  database: D1DatabaseLike,
  context: PublicContext,
  publicRequestId: string,
) {
  const row = await database.prepare<ExposureRow>(`
    SELECT request_id, public_request_id, status
    FROM client_portal_request_exposures
    WHERE portal_id = ? AND public_request_id = ?
    LIMIT 1
  `).bind(context.portal.id, publicRequestId).first<ExposureRow>();
  if (!row) return null;
  const request = await readChangeRequest({
    database,
    projectId: context.portal.project_id,
    requestId: row.request_id,
    workspaceId: context.portal.workspace_id,
  });
  return request ? {
    exposure: { publicRequestId: row.public_request_id, status: row.status },
    request,
  } satisfies ExposedRequest : null;
}

export async function listPublicChangeRequestsResponse(
  request: Request,
  token: string,
  routeDependencies: PublicChangeRequestDependencies = dependencies,
) {
  const result = await recipientContext(request, token, false, routeDependencies);
  if ("error" in result) return result.error;
  const rateLimit = await routeDependencies.readRateLimit({
    portalId: result.actor.portalId,
    recipientId: result.actor.recipientId,
  });
  if (!rateLimit.allowed) return rateLimited(rateLimit.message, rateLimit.retryAfter);
  const requests = await routeDependencies.listExposedRequests(result.context.database, result.context);
  return Response.json(
    { requests: requests.map((entry) => publicProjection(entry, result.actor, result.context, routeDependencies.evaluatePolicy)).filter(Boolean) },
    { headers: CLIENT_PORTAL_NO_STORE_HEADERS },
  );
}

export async function readPublicChangeRequestResponse(
  request: Request,
  token: string,
  publicRequestId: string,
  routeDependencies: PublicChangeRequestDependencies = dependencies,
) {
  const result = await recipientContext(request, token, false, routeDependencies);
  if ("error" in result) return result.error;
  const rateLimit = await routeDependencies.readRateLimit({
    portalId: result.actor.portalId,
    recipientId: result.actor.recipientId,
  });
  if (!rateLimit.allowed) return rateLimited(rateLimit.message, rateLimit.retryAfter);
  const exposed = await routeDependencies.readExposedRequest(
    result.context.database,
    result.context,
    publicRequestId,
  );
  const projected = exposed ? publicProjection(exposed, result.actor, result.context, routeDependencies.evaluatePolicy) : null;
  return projected
    ? Response.json({ request: projected }, { headers: CLIENT_PORTAL_NO_STORE_HEADERS })
    : unavailable();
}

export async function createPublicChangeRequestResponse(
  request: Request,
  token: string,
  routeDependencies: PublicChangeRequestDependencies = dependencies,
) {
  const result = await recipientContext(request, token, true, routeDependencies);
  if ("error" in result) return result.error;
  const rateLimit = await routeDependencies.mutationRateLimit({
    portalId: result.actor.portalId,
    recipientId: result.actor.recipientId,
  });
  if (!rateLimit.allowed) return rateLimited(rateLimit.message, rateLimit.retryAfter);
  const authorization = routeDependencies.evaluatePolicy({
    actor: result.actor,
    action: "request:create",
    portal: result.context.policyPortal,
  });
  if (!authorization.allowed) return unavailable();
  const key = idempotencyKey(request);
  if (!key) return invalid("A valid Idempotency-Key header is required.");
  const body = await readBoundedJsonBody<{
    description?: unknown;
    externalReferenceUrl?: unknown;
    requestedEffectiveDate?: unknown;
    title?: unknown;
  }>(request, 16 * 1024);
  if (!body.ok) {
    return Response.json({ error: body.error }, { status: body.status, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  }
  if (typeof body.value.title !== "string" || typeof body.value.description !== "string") {
    return invalid("Request title and description are required.");
  }
  const reference = externalReference(body.value.externalReferenceUrl);
  if (reference === undefined) return invalid("External reference URL is invalid.");
  const requestActor = await recipientRequestActor(result.context.database, result.actor, routeDependencies);
  if (!requestActor) return unavailable();
  const identity = `${result.context.portal.id}:${result.actor.recipientId}:${key}`;
  try {
    const created = await routeDependencies.createRequest({
      actor: requestActor,
      database: result.context.database,
      description: body.value.description,
      eventId: stableId("request_state", identity, "submitted"),
      exposurePolicySnapshot: { capability: "request:view" },
      idempotencyKey: key,
      metadata: reference ? { externalReferenceUrl: reference } : {},
      originPortalId: result.context.portal.id,
      projectId: result.context.portal.project_id,
      publicRequestId: stableId("public_request", identity),
      requestId: stableId("request", identity),
      requestedEffectiveDate: optionalString(body.value.requestedEffectiveDate),
      sourceKind: "client_portal",
      title: body.value.title,
      versionId: stableId("request_version", identity, "1"),
      workspaceId: result.context.portal.workspace_id,
    });
    const exposed = created.exposure ? { exposure: created.exposure, request: created.request } : null;
    const projected = exposed ? publicProjection(exposed, result.actor, result.context, routeDependencies.evaluatePolicy) : null;
    return projected
      ? Response.json({ replayed: created.replayed, request: projected }, { status: created.replayed ? 200 : 201, headers: CLIENT_PORTAL_NO_STORE_HEADERS })
      : unavailable();
  } catch (error) {
    return requestError(error);
  }
}

export async function amendPublicChangeRequestResponse(
  request: Request,
  token: string,
  publicRequestId: string,
  routeDependencies: PublicChangeRequestDependencies = dependencies,
) {
  const result = await recipientContext(request, token, true, routeDependencies);
  if ("error" in result) return result.error;
  const rateLimit = await routeDependencies.mutationRateLimit({
    portalId: result.actor.portalId,
    recipientId: result.actor.recipientId,
  });
  if (!rateLimit.allowed) return rateLimited(rateLimit.message, rateLimit.retryAfter);
  const exposed = await routeDependencies.readExposedRequest(result.context.database, result.context, publicRequestId);
  if (!exposed) return unavailable();
  const target = {
    kind: "change_request" as const,
    portalId: result.context.portal.id,
    exposureStatus: exposed.exposure.status,
    ownerRecipientId: exposed.request.requestedByActorType === "recipient" ? exposed.request.requestedByActorId : null,
  };
  if (!routeDependencies.evaluatePolicy({ actor: result.actor, action: "request:amend_own", portal: result.context.policyPortal, target }).allowed) {
    return unavailable();
  }
  const key = idempotencyKey(request);
  if (!key) return invalid("A valid Idempotency-Key header is required.");
  const body = await readBoundedJsonBody<{
    contentHash?: unknown;
    description?: unknown;
    requestedEffectiveDate?: unknown;
    title?: unknown;
  }>(request, 16 * 1024);
  if (!body.ok) return Response.json({ error: body.error }, { status: body.status, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  if (
    typeof body.value.title !== "string"
    || typeof body.value.description !== "string"
    || body.value.contentHash !== exposed.request.currentVersion.contentHash
  ) {
    return Response.json(
      { error: "Request changed before the amendment was submitted." },
      { status: 409, headers: CLIENT_PORTAL_NO_STORE_HEADERS },
    );
  }
  const requestActor = await recipientRequestActor(result.context.database, result.actor, routeDependencies);
  if (!requestActor) return unavailable();
  try {
    const amended = await routeDependencies.amendRequest({
      actor: requestActor,
      database: result.context.database,
      description: body.value.description,
      expectedCurrentVersionId: exposed.request.currentVersionId,
      metadata: exposed.request.currentVersion.metadata,
      projectId: result.context.portal.project_id,
      requestId: exposed.request.id,
      requestedEffectiveDate: optionalString(body.value.requestedEffectiveDate),
      sourceKind: "client_portal",
      title: body.value.title,
      versionId: stableId("request_version", exposed.request.id, key),
      workspaceId: result.context.portal.workspace_id,
    });
    const projected = publicProjection(
      { exposure: exposed.exposure, request: amended.request },
      result.actor,
      result.context,
      routeDependencies.evaluatePolicy,
    );
    return projected
      ? Response.json({ replayed: amended.replayed, request: projected }, { headers: CLIENT_PORTAL_NO_STORE_HEADERS })
      : unavailable();
  } catch (error) {
    return requestError(error);
  }
}

export async function withdrawPublicChangeRequestResponse(
  request: Request,
  token: string,
  publicRequestId: string,
  routeDependencies: PublicChangeRequestDependencies = dependencies,
) {
  const result = await recipientContext(request, token, true, routeDependencies);
  if ("error" in result) return result.error;
  const rateLimit = await routeDependencies.mutationRateLimit({
    portalId: result.actor.portalId,
    recipientId: result.actor.recipientId,
  });
  if (!rateLimit.allowed) return rateLimited(rateLimit.message, rateLimit.retryAfter);
  const exposed = await routeDependencies.readExposedRequest(result.context.database, result.context, publicRequestId);
  if (!exposed) return unavailable();
  const target = {
    kind: "change_request" as const,
    portalId: result.context.portal.id,
    exposureStatus: exposed.exposure.status,
    ownerRecipientId: exposed.request.requestedByActorType === "recipient" ? exposed.request.requestedByActorId : null,
  };
  if (!routeDependencies.evaluatePolicy({ actor: result.actor, action: "request:withdraw_own", portal: result.context.policyPortal, target }).allowed) {
    return unavailable();
  }
  const key = idempotencyKey(request);
  if (!key) return invalid("A valid Idempotency-Key header is required.");
  const body = await readBoundedJsonBody<{ note?: unknown }>(request, 2 * 1024);
  if (!body.ok) return Response.json({ error: body.error }, { status: body.status, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  const requestActor = await recipientRequestActor(result.context.database, result.actor, routeDependencies);
  if (!requestActor) return unavailable();
  try {
    const withdrawn = await routeDependencies.withdrawRequest({
      actor: requestActor,
      database: result.context.database,
      eventId: stableId("request_state", exposed.request.id, key, "withdraw"),
      idempotencyKey: key,
      note: optionalString(body.value.note),
      projectId: result.context.portal.project_id,
      requestId: exposed.request.id,
      workspaceId: result.context.portal.workspace_id,
    });
    return Response.json(
      { replayed: withdrawn.replayed, request: { publicRequestId, requestCode: withdrawn.request.requestCode, status: withdrawn.request.status } },
      { headers: CLIENT_PORTAL_NO_STORE_HEADERS },
    );
  } catch (error) {
    return requestError(error);
  }
}
