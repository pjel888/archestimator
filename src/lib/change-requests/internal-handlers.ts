import "server-only";

import { createHash } from "node:crypto";

import type { D1DatabaseLike } from "@/lib/cloudflare/d1";
import { readBoundedJsonBody } from "@/lib/http/read-bounded-body";
import { resolveInternalArtifactAccess } from "@/app/api/projects/[projectId]/artifacts/_route-core";

import type {
  ProjectChangeRequest,
  ProjectChangeRequestArtifactLink,
  ProjectChangeRequestSourceKind,
  ProjectChangeRequestTarget,
} from "./contracts";
import { ProjectChangeRequestError } from "./errors";
import {
  acknowledgeChangeRequest,
  assignChangeRequestAssessment,
  createChangeRequest,
  readChangeRequest,
  rejectChangeRequest,
  updateChangeRequestAssessment,
  withdrawChangeRequest,
} from "./service";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  "X-Content-Type-Options": "nosniff",
};

type InternalAccess = Extract<Awaited<ReturnType<typeof resolveInternalArtifactAccess>>, { ok: true }>;

type RequestIdRow = { id: string };

export type InternalChangeRequestDependencies = {
  acknowledgeRequest: typeof acknowledgeChangeRequest;
  assignAssessment: typeof assignChangeRequestAssessment;
  createRequest: typeof createChangeRequest;
  listRequests: typeof listInternalChangeRequests;
  readRequest: typeof readChangeRequest;
  rejectRequest: typeof rejectChangeRequest;
  resolveAccess: typeof resolveInternalArtifactAccess;
  updateAssessment: typeof updateChangeRequestAssessment;
  withdrawRequest: typeof withdrawChangeRequest;
};

const dependencies: InternalChangeRequestDependencies = {
  acknowledgeRequest: acknowledgeChangeRequest,
  assignAssessment: assignChangeRequestAssessment,
  createRequest: createChangeRequest,
  listRequests: listInternalChangeRequests,
  readRequest: readChangeRequest,
  rejectRequest: rejectChangeRequest,
  resolveAccess: resolveInternalArtifactAccess,
  updateAssessment: updateChangeRequestAssessment,
  withdrawRequest: withdrawChangeRequest,
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: PRIVATE_HEADERS });
}

function requestError(error: unknown) {
  if (!(error instanceof ProjectChangeRequestError)) {
    return json({ error: "Project request operation failed." }, 500);
  }
  const status = error.code === "project_change_request_not_found"
    ? 404
    : error.code === "project_change_request_conflict" || error.code === "project_change_request_invalid_transition"
      ? 409
      : error.code === "project_change_request_forbidden"
        ? 403
        : error.code === "project_change_request_invalid_input"
          ? 400
          : 500;
  return json({ error: error.message, code: error.code }, status);
}

function stableId(prefix: string, ...parts: string[]) {
  return `${prefix}_${createHash("sha256").update(parts.join("\u0000")).digest("hex").slice(0, 32)}`;
}

function idempotencyKey(request: Request) {
  const key = request.headers.get("idempotency-key")?.trim() ?? "";
  return key && key.length <= 120 ? key : null;
}

function record(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function string(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalString(value: unknown) {
  return string(value) || null;
}

function sourceKind(value: unknown): ProjectChangeRequestSourceKind | null {
  return value === "verbal" || value === "email" || value === "site" || value === "other"
    ? value
    : null;
}

async function body(request: Request) {
  const parsed = await readBoundedJsonBody<unknown>(request, 32 * 1024);
  if (!parsed.ok) return { error: json({ error: parsed.error }, parsed.status) };
  const value = record(parsed.value);
  return value ? { value } : { error: json({ error: "Request body must be a JSON object." }, 400) };
}

function internalActor(access: InternalAccess) {
  return { id: access.actor.id, type: "internal_user" as const };
}

async function listInternalChangeRequests(input: {
  database: D1DatabaseLike;
  projectId: string;
  workspaceId: string;
  limit?: number;
}) {
  const limit = Math.max(1, Math.min(100, Math.floor(input.limit ?? 50)));
  const rows = await input.database.prepare<RequestIdRow>(`
    SELECT id
    FROM project_change_requests
    WHERE workspace_id = ? AND project_id = ? AND status <> 'initializing'
    ORDER BY requested_at DESC, request_number DESC
    LIMIT ?
  `).bind(input.workspaceId, input.projectId, limit).all<RequestIdRow>();
  const requests = await Promise.all((rows.results ?? []).map((row) => readChangeRequest({
    database: input.database,
    projectId: input.projectId,
    requestId: row.id,
    workspaceId: input.workspaceId,
  })));
  return requests.filter((request): request is ProjectChangeRequest => request !== null);
}

export async function listInternalChangeRequestsResponse(
  request: Request,
  projectId: string,
  routeDependencies: InternalChangeRequestDependencies = dependencies,
) {
  const access = await routeDependencies.resolveAccess(projectId, "read");
  if (!access.ok) return access.response;
  const rawLimit = Number(new URL(request.url).searchParams.get("limit") ?? 50);
  try {
    const requests = await routeDependencies.listRequests({
      database: access.database,
      limit: Number.isSafeInteger(rawLimit) ? rawLimit : 50,
      projectId: access.projectId,
      workspaceId: access.workspaceId,
    });
    return json({ requests });
  } catch (error) {
    return requestError(error);
  }
}

export async function readInternalChangeRequestResponse(
  _request: Request,
  projectId: string,
  requestId: string,
  routeDependencies: InternalChangeRequestDependencies = dependencies,
) {
  const access = await routeDependencies.resolveAccess(projectId, "read");
  if (!access.ok) return access.response;
  try {
    const request = await routeDependencies.readRequest({
      database: access.database,
      projectId: access.projectId,
      requestId,
      workspaceId: access.workspaceId,
    });
    return request ? json({ request }) : json({ error: "Project request not found." }, 404);
  } catch (error) {
    return requestError(error);
  }
}

async function internalMutationInput(request: Request, projectId: string, routeDependencies: InternalChangeRequestDependencies) {
  const access = await routeDependencies.resolveAccess(projectId, "write");
  if (!access.ok) return { error: access.response, value: null };
  const key = idempotencyKey(request);
  if (!key) return { error: json({ error: "A valid Idempotency-Key header is required." }, 400), value: null };
  const parsed = await body(request);
  return "error" in parsed ? { error: parsed.error, value: null } : { error: null, value: { access, key, body: parsed.value } };
}

export async function createInternalChangeRequestResponse(
  request: Request,
  projectId: string,
  routeDependencies: InternalChangeRequestDependencies = dependencies,
) {
  const mutation = await internalMutationInput(request, projectId, routeDependencies);
  if (!mutation.value) return mutation.error;
  const { access, body: value, key } = mutation.value;
  const source = sourceKind(value.sourceKind);
  if (!source) return json({ error: "Internal request source must be verbal, email, site, or other." }, 400);
  const identity = `${access.projectId}:${access.actor.id}:${key}`;
  try {
    const result = await routeDependencies.createRequest({
      actor: internalActor(access),
      artifacts: Array.isArray(value.artifacts) ? value.artifacts as ProjectChangeRequestArtifactLink[] : [],
      database: access.database,
      description: string(value.description),
      eventId: stableId("request_state", identity, "submitted"),
      exposurePolicySnapshot: record(value.exposurePolicySnapshot) ?? {},
      exposurePortalId: optionalString(value.exposurePortalId),
      idempotencyKey: key,
      metadata: record(value.metadata) ?? {},
      originPortalId: optionalString(value.originPortalId),
      projectId: access.projectId,
      publicRequestId: optionalString(value.publicRequestId),
      reason: optionalString(value.reason),
      requestId: stableId("request", identity),
      requestedEffectiveDate: optionalString(value.requestedEffectiveDate),
      sourceKind: source,
      targets: Array.isArray(value.targets) ? value.targets as ProjectChangeRequestTarget[] : [],
      title: string(value.title),
      versionId: stableId("request_version", identity, "1"),
      workspaceId: access.workspaceId,
    });
    return json(result, result.replayed ? 200 : 201);
  } catch (error) {
    return requestError(error);
  }
}

export async function actOnInternalChangeRequestResponse(
  request: Request,
  projectId: string,
  requestId: string,
  routeDependencies: InternalChangeRequestDependencies = dependencies,
) {
  const mutation = await internalMutationInput(request, projectId, routeDependencies);
  if (!mutation.value) return mutation.error;
  const { access, body: value, key } = mutation.value;
  const action = string(value.action);
  const base = {
    actor: internalActor(access),
    database: access.database,
    eventId: stableId("request_state", requestId, access.actor.id, key, action),
    idempotencyKey: key,
    note: optionalString(value.note),
    projectId: access.projectId,
    requestId,
    workspaceId: access.workspaceId,
  };
  try {
    const result = action === "acknowledge"
      ? await routeDependencies.acknowledgeRequest(base)
      : action === "assign_assessment"
        ? await routeDependencies.assignAssessment({ ...base, assessmentOwnerUserId: string(value.assessmentOwnerUserId) })
        : action === "update_assessment"
          ? await routeDependencies.updateAssessment({ ...base, assessment: record(value.assessment) ?? {} })
          : action === "reject"
            ? await routeDependencies.rejectRequest(base)
            : action === "withdraw"
              ? await routeDependencies.withdrawRequest(base)
              : null;
    return result ? json(result) : json({ error: "Project request action is invalid." }, 400);
  } catch (error) {
    return requestError(error);
  }
}
