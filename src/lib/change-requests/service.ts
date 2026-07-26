import "server-only";

import { createHash, randomUUID } from "node:crypto";

import type { D1DatabaseLike } from "@/lib/cloudflare/d1";
import { prepareProjectCommitmentEventWrites } from "@/lib/project-ledger/event-service";

import {
  PROJECT_CHANGE_REQUEST_ACTOR_TYPES,
  PROJECT_CHANGE_REQUEST_ARTIFACT_RELATIONSHIPS,
  PROJECT_CHANGE_REQUEST_SOURCE_KINDS,
  PROJECT_CHANGE_REQUEST_TARGET_KINDS,
  type ProjectChangeRequest,
  type ProjectChangeRequestActor,
  type ProjectChangeRequestArtifactLink,
  type ProjectChangeRequestSourceKind,
  type ProjectChangeRequestStatus,
  type ProjectChangeRequestTarget,
} from "./contracts";
import { ProjectChangeRequestError } from "./errors";
import {
  amendProjectChangeRequestRecords,
  batchChanged,
  createProjectChangeRequestRecords,
  readProjectChangeRequestExposureRecord,
  readProjectChangeRequestRecord,
  readProjectChangeRequestStateEvent,
  readProjectChangeRequestVersionRecord,
  transitionProjectChangeRequestRecords,
  type ProjectChangeRequestStateAction,
} from "./repository";

export { ProjectChangeRequestError } from "./errors";

type ChangeRequestScope = {
  database: D1DatabaseLike;
  projectId: string;
  workspaceId: string;
};

type ChangeRequestContentInput = {
  artifacts?: readonly ProjectChangeRequestArtifactLink[];
  description: string;
  metadata?: Record<string, unknown>;
  reason?: string | null;
  requestedEffectiveDate?: string | null;
  sourceKind: ProjectChangeRequestSourceKind;
  targets?: readonly ProjectChangeRequestTarget[];
  title: string;
};

export type CreateChangeRequestInput = ChangeRequestScope & ChangeRequestContentInput & {
  actor: ProjectChangeRequestActor;
  eventId: string;
  idempotencyKey: string;
  now?: string;
  originPortalId?: string | null;
  publicRequestId?: string | null;
  exposurePortalId?: string | null;
  exposurePolicySnapshot?: Record<string, unknown>;
  requestId: string;
  versionId: string;
};

export type AmendChangeRequestInput = ChangeRequestScope & ChangeRequestContentInput & {
  actor: ProjectChangeRequestActor;
  expectedCurrentVersionId: string;
  now?: string;
  requestId: string;
  versionId: string;
};

type StateActionInput = ChangeRequestScope & {
  actor: ProjectChangeRequestActor;
  eventId: string;
  idempotencyKey: string;
  note?: string | null;
  now?: string;
  requestId: string;
};

const MAX_IDENTIFIER_LENGTH = 200;
const MAX_TITLE_LENGTH = 240;
const MAX_TEXT_LENGTH = 8_000;
const MAX_METADATA_BYTES = 32_000;
const RECIPIENT_AMEND_STATUSES = ["submitted", "acknowledged"] as const;
const WITHDRAW_STATUSES = ["submitted", "acknowledged", "under_assessment", "proposal_issued"] as const;
const REJECT_STATUSES = ["submitted", "acknowledged", "under_assessment"] as const;

function requiredIdentifier(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized || normalized.length > MAX_IDENTIFIER_LENGTH) {
    throw new ProjectChangeRequestError("project_change_request_invalid_input", `${label} is invalid.`);
  }
  return normalized;
}

function optionalText(value: string | null | undefined, label: string, maximumLength = MAX_TEXT_LENGTH) {
  if (value === null || value === undefined) return null;
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maximumLength) {
    throw new ProjectChangeRequestError("project_change_request_invalid_input", `${label} is too long.`);
  }
  return normalized;
}

function requiredText(value: string, label: string, maximumLength = MAX_TEXT_LENGTH) {
  const normalized = optionalText(value, label, maximumLength);
  if (!normalized) {
    throw new ProjectChangeRequestError("project_change_request_invalid_input", `${label} is required.`);
  }
  return normalized;
}

function isoTimestamp(value: string | undefined) {
  const timestamp = value ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(timestamp))) {
    throw new ProjectChangeRequestError("project_change_request_invalid_input", "Change request timestamp is invalid.");
  }
  return timestamp;
}

function canonicalJson(value: unknown): string {
  const normalize = (entry: unknown): unknown => {
    if (Array.isArray(entry)) return entry.map(normalize);
    if (entry && typeof entry === "object") {
      return Object.fromEntries(
        Object.keys(entry as Record<string, unknown>)
          .sort()
          .map((key) => [key, normalize((entry as Record<string, unknown>)[key])]),
      );
    }
    return entry;
  };
  try {
    const json = JSON.stringify(normalize(value));
    if (new TextEncoder().encode(json).byteLength > MAX_METADATA_BYTES) {
      throw new Error("too large");
    }
    return json;
  } catch {
    throw new ProjectChangeRequestError("project_change_request_invalid_input", "Change request metadata is invalid.");
  }
}

function actor(input: ProjectChangeRequestActor): ProjectChangeRequestActor {
  if (!PROJECT_CHANGE_REQUEST_ACTOR_TYPES.includes(input.type)) {
    throw new ProjectChangeRequestError("project_change_request_invalid_input", "Change request actor type is invalid.");
  }
  const normalized = {
    id: requiredIdentifier(input.id, "Change request actor"),
    type: input.type,
    name: optionalText(input.name, "Change request actor name", 240),
    email: optionalText(input.email, "Change request actor email", 320),
    domainRole: optionalText(input.domainRole, "Change request actor domain role", 120),
    permissionRole: optionalText(input.permissionRole, "Change request actor permission role", 120),
    organization: optionalText(input.organization, "Change request actor organization", 240),
  } satisfies ProjectChangeRequestActor;
  if (normalized.type === "recipient" && (!normalized.email || !normalized.domainRole || !normalized.permissionRole)) {
    throw new ProjectChangeRequestError(
      "project_change_request_invalid_input",
      "Recipient change requests require email, domain role, and permission role snapshots.",
    );
  }
  return normalized;
}

function optionalIdentifier(value: string | null | undefined, label: string) {
  return value === null || value === undefined ? null : requiredIdentifier(value, label);
}

function normalizeKey(value: string | null | undefined, label: string) {
  const normalized = optionalText(value, label, 240);
  return normalized?.toLowerCase().replace(/\s+/gu, "-") ?? null;
}

function normalizeTarget(input: ProjectChangeRequestTarget) {
  if (!PROJECT_CHANGE_REQUEST_TARGET_KINDS.includes(input.kind)) {
    throw new ProjectChangeRequestError("project_change_request_invalid_input", "Change request target kind is invalid.");
  }
  const target = {
    id: requiredIdentifier(input.id, "Change request target"),
    kind: input.kind,
    label: requiredText(input.label, "Change request target label", 500),
    estimateId: optionalIdentifier(input.estimateId, "Estimate"),
    estimateTabId: optionalIdentifier(input.estimateTabId, "Estimate tab"),
    nodeId: optionalIdentifier(input.nodeId, "Estimate node"),
    rowId: optionalIdentifier(input.rowId, "Estimate row"),
    artifactId: optionalIdentifier(input.artifactId, "Project artifact"),
    disciplineKey: normalizeKey(input.disciplineKey, "Discipline key"),
    locationKey: normalizeKey(input.locationKey, "Location key"),
    otherKey: normalizeKey(input.otherKey, "Other target key"),
    metadata: input.metadata ?? {},
    metadataJson: canonicalJson(input.metadata ?? {}),
  };
  const shape = [
    target.estimateId,
    target.estimateTabId,
    target.nodeId,
    target.rowId,
    target.artifactId,
    target.disciplineKey,
    target.locationKey,
    target.otherKey,
  ];
  const requiredIndexesByKind: Record<ProjectChangeRequestTarget["kind"], number[]> = {
    project: [],
    estimate: [0],
    estimate_tab: [0, 1],
    area_group: [0, 1, 2],
    row: [0, 1, 3],
    artifact: [4],
    discipline: [5],
    location: [6],
    other: [7],
  };
  const requiredIndexes = requiredIndexesByKind[target.kind];
  if (shape.some((value, index) => requiredIndexes.includes(index) ? value === null : value !== null)) {
    throw new ProjectChangeRequestError("project_change_request_invalid_input", "Change request target shape is invalid.");
  }
  return target;
}

function normalizeArtifact(input: ProjectChangeRequestArtifactLink) {
  if (!PROJECT_CHANGE_REQUEST_ARTIFACT_RELATIONSHIPS.includes(input.relationship)) {
    throw new ProjectChangeRequestError("project_change_request_invalid_input", "Change request artifact relationship is invalid.");
  }
  if (!Number.isSafeInteger(input.sortOrder) || input.sortOrder < 0) {
    throw new ProjectChangeRequestError("project_change_request_invalid_input", "Change request artifact order is invalid.");
  }
  return {
    artifactVersionId: requiredIdentifier(input.artifactVersionId, "Project artifact version"),
    relationship: input.relationship,
    sortOrder: input.sortOrder,
  };
}

function normalizedContent(input: ChangeRequestContentInput) {
  if (!PROJECT_CHANGE_REQUEST_SOURCE_KINDS.includes(input.sourceKind)) {
    throw new ProjectChangeRequestError("project_change_request_invalid_input", "Change request source is invalid.");
  }
  const targets = (input.targets ?? []).map(normalizeTarget);
  const artifacts = (input.artifacts ?? []).map(normalizeArtifact);
  const targetIds = new Set(targets.map((target) => target.id));
  if (targetIds.size !== targets.length) {
    throw new ProjectChangeRequestError("project_change_request_invalid_input", "Change request target ids must be unique.");
  }
  const artifactKeys = new Set(artifacts.map((artifact) => `${artifact.artifactVersionId}\u0000${artifact.relationship}`));
  if (artifactKeys.size !== artifacts.length) {
    throw new ProjectChangeRequestError("project_change_request_invalid_input", "Change request artifact links must be unique.");
  }
  const metadata = { ...(input.metadata ?? {}), sourceKind: input.sourceKind };
  const normalized = {
    title: requiredText(input.title, "Change request title", MAX_TITLE_LENGTH),
    description: requiredText(input.description, "Change request description"),
    reason: optionalText(input.reason, "Change request reason"),
    requestedEffectiveDate: optionalText(input.requestedEffectiveDate, "Requested effective date", 40),
    metadata,
    metadataJson: canonicalJson(metadata),
    targets,
    artifacts,
    sourceKind: input.sourceKind,
  };
  const contentHash = createHash("sha256").update(canonicalJson({
    title: normalized.title,
    description: normalized.description,
    reason: normalized.reason,
    requestedEffectiveDate: normalized.requestedEffectiveDate,
    metadata: normalized.metadata,
    targets: normalized.targets.map((target) => Object.fromEntries(
      Object.entries(target).filter(([key]) => key !== "metadataJson"),
    )),
    artifacts: normalized.artifacts,
  })).digest("hex");
  return { ...normalized, contentHash };
}

function requestScope(input: ChangeRequestScope & { requestId: string }) {
  return {
    database: input.database,
    requestId: requiredIdentifier(input.requestId, "Change request"),
    projectId: requiredIdentifier(input.projectId, "Project"),
    workspaceId: requiredIdentifier(input.workspaceId, "Workspace"),
  };
}

function commitmentActor(requestActor: ProjectChangeRequestActor) {
  return {
    actorId: requestActor.id,
    actorType: requestActor.type,
    domainRoleSnapshot: requestActor.domainRole,
    nameSnapshot: requestActor.name,
    permissionRoleSnapshot: requestActor.permissionRole,
  };
}

function ownerNotificationStatement(input: {
  database: D1DatabaseLike;
  eventType: string;
  idempotencyKey: string;
  now: string;
  portalId: string | null;
  publicRequestId: string | null;
  requestId: string;
  status: ProjectChangeRequestStatus;
}) {
  return input.database.prepare(`
    INSERT INTO project_change_request_notification_outbox (
      id, workspace_id, project_id, portal_id, request_id, event_type,
      idempotency_key, payload_json, state, attempt_count, next_attempt_at,
      created_at, updated_at
    )
    SELECT ?, workspace_id, project_id, ?, id, ?, ?, ?, 'pending', 0, ?, ?, ?
    FROM project_change_requests
    WHERE id = ?
  `).bind(
    `request_notification_${randomUUID()}`,
    input.portalId,
    input.eventType,
    input.idempotencyKey,
    canonicalJson({
      publicRequestId: input.publicRequestId,
      requestId: input.requestId,
      status: input.status,
    }),
    input.now,
    input.now,
    input.now,
    input.requestId,
  );
}

function atomicRequestStatements(input: {
  actor: ProjectChangeRequestActor;
  database: D1DatabaseLike;
  eventId: string;
  eventType: string;
  exposurePortalId: string | null;
  idempotencyKey: string;
  notifyOwner: boolean;
  now: string;
  originPortalId: string | null;
  projectId: string;
  publicRequestId: string | null;
  requestId: string;
  status: ProjectChangeRequestStatus;
  title: string;
  versionId: string;
  workspaceId: string;
}) {
  const eventPlan = prepareProjectCommitmentEventWrites({
    actor: commitmentActor(input.actor),
    clientSafeSnapshot: {
      publicRequestId: input.publicRequestId,
      status: input.status,
      title: input.title,
    },
    correlationId: input.idempotencyKey,
    database: input.database,
    eventId: `commitment_${input.eventId}`,
    eventType: input.eventType,
    exposure: input.exposurePortalId && input.publicRequestId ? {
      exposureKind: input.actor.type === "recipient" ? "automatic" : "manual",
      policySnapshot: { capability: "timeline:view", publicRequestId: input.publicRequestId },
      portalId: input.exposurePortalId,
      publicEventId: `request_event_${input.publicRequestId}_${input.eventId}`,
    } : null,
    internalMetadata: {
      requestId: input.requestId,
      requestVersionId: input.versionId,
      stateEventId: input.eventId,
    },
    occurredAt: input.now,
    originPortalId: input.originPortalId,
    projectId: input.projectId,
    rootRequestId: input.requestId,
    source: {
      requestId: input.requestId,
      requestVersionId: input.versionId,
      sourceType: "change_request",
    },
    summary: input.title,
    title: input.eventType === "request.submitted" ? "Change request submitted" : "Change request updated",
    workspaceId: input.workspaceId,
  });
  const statements = [...eventPlan.statements];
  if (input.notifyOwner) {
    statements.push(ownerNotificationStatement({
      database: input.database,
      eventType: input.eventType,
      idempotencyKey: input.idempotencyKey,
      now: input.now,
      portalId: input.exposurePortalId ?? input.originPortalId,
      publicRequestId: input.publicRequestId,
      requestId: input.requestId,
      status: input.status,
    }));
  }
  return statements;
}

async function readCreateReplay(input: {
  content: ReturnType<typeof normalizedContent>;
  exposurePortalId: string | null;
  originPortalId: string | null;
  publicRequestId: string | null;
  requestActor: ProjectChangeRequestActor;
  scope: ReturnType<typeof requestScope>;
  versionId: string;
}) {
  const request = await readProjectChangeRequestRecord(input.scope);
  if (!request) return null;
  const [initialVersion, exposure] = await Promise.all([
    readProjectChangeRequestVersionRecord({ ...input.scope, versionId: input.versionId }),
    input.publicRequestId && input.exposurePortalId
      ? readProjectChangeRequestExposureRecord({
          database: input.scope.database,
          portalId: input.exposurePortalId,
          requestId: input.scope.requestId,
        })
      : Promise.resolve(null),
  ]);
  if (
    request.originPortalId === input.originPortalId
    && request.requestedByActorType === input.requestActor.type
    && request.requestedByActorId === input.requestActor.id
    && initialVersion?.contentHash === input.content.contentHash
    && (!input.publicRequestId || exposure?.publicRequestId === input.publicRequestId)
  ) {
    return { request, exposure, replayed: true as const };
  }
  return null;
}

function assertRecipientOwner(request: ProjectChangeRequest, requestActor: ProjectChangeRequestActor) {
  if (
    requestActor.type !== "recipient"
    || request.requestedByActorType !== "recipient"
    || request.requestedByActorId !== requestActor.id
  ) {
    throw new ProjectChangeRequestError("project_change_request_forbidden", "Only the originating recipient may change this request.");
  }
}

function assertInternalActor(requestActor: ProjectChangeRequestActor) {
  if (requestActor.type !== "internal_user") {
    throw new ProjectChangeRequestError("project_change_request_forbidden", "This change request action requires an internal user.");
  }
}

async function readRequiredRequest(input: ChangeRequestScope & { requestId: string }) {
  const scope = requestScope(input);
  const request = await readProjectChangeRequestRecord(scope);
  if (!request) {
    throw new ProjectChangeRequestError("project_change_request_not_found", "Change request was not found.");
  }
  return { request, scope };
}

export async function createChangeRequest(input: CreateChangeRequestInput) {
  const scope = requestScope(input);
  const requestActor = actor(input.actor);
  const content = normalizedContent(input);
  const versionId = requiredIdentifier(input.versionId, "Change request version");
  const eventId = requiredIdentifier(input.eventId, "Change request state event");
  const idempotencyKey = requiredIdentifier(input.idempotencyKey, "Change request idempotency key");
  const now = isoTimestamp(input.now);
  const originPortalId = optionalIdentifier(input.originPortalId, "Origin portal");
  const publicRequestId = optionalIdentifier(input.publicRequestId, "Public change request");
  const exposurePortalId = optionalIdentifier(input.exposurePortalId, "Exposure portal") ?? originPortalId;

  if (requestActor.type === "recipient") {
    if (!originPortalId || input.sourceKind !== "client_portal") {
      throw new ProjectChangeRequestError("project_change_request_invalid_input", "Recipient requests require a client portal origin.");
    }
    if (input.exposurePortalId && exposurePortalId !== originPortalId) {
      throw new ProjectChangeRequestError("project_change_request_invalid_input", "Recipient request exposure must use its origin portal.");
    }
  }
  if (publicRequestId && !exposurePortalId) {
    throw new ProjectChangeRequestError("project_change_request_invalid_input", "Public request exposure requires a portal.");
  }
  if (!publicRequestId && input.exposurePortalId) {
    throw new ProjectChangeRequestError("project_change_request_invalid_input", "Exposure portal requires a public request id.");
  }

  const existing = await readProjectChangeRequestRecord(scope);
  if (existing) {
    const replay = await readCreateReplay({
      content,
      exposurePortalId,
      originPortalId,
      publicRequestId,
      requestActor,
      scope,
      versionId,
    });
    if (replay) return replay;
    throw new ProjectChangeRequestError("project_change_request_conflict", "Change request idempotency identity is already in use.");
  }
  if (!input.database.batch) {
    throw new ProjectChangeRequestError("project_change_request_batch_required", "Change request creation requires an atomic D1 batch.");
  }

  const publicExposure = publicRequestId && exposurePortalId ? {
    publicRequestId,
    portalId: exposurePortalId,
    exposureKind: requestActor.type === "recipient" ? "automatic" as const : "manual" as const,
    policySnapshotJson: canonicalJson(input.exposurePolicySnapshot ?? {}),
  } : null;
  const atomicStatements = atomicRequestStatements({
    actor: requestActor,
    database: input.database,
    eventId,
    eventType: "request.submitted",
    exposurePortalId,
    idempotencyKey,
    notifyOwner: true,
    now,
    originPortalId,
    projectId: scope.projectId,
    publicRequestId,
    requestId: scope.requestId,
    status: "submitted",
    title: content.title,
    versionId,
    workspaceId: scope.workspaceId,
  });
  const relationshipCount = content.targets.length + content.artifacts.length;
  const expectedStatements = 6 + relationshipCount + (publicExposure ? 1 : 0) + atomicStatements.length;
  try {
    const results = await createProjectChangeRequestRecords({
      ...scope,
      ...content,
      actor: requestActor,
      atomicStatements,
      eventId,
      eventMetadataJson: canonicalJson({ action: "create", sourceKind: content.sourceKind }),
      idempotencyKey,
      now,
      originPortalId,
      publicExposure,
      versionId,
    });
    if (!batchChanged(results, expectedStatements, [0])) {
      throw new ProjectChangeRequestError("project_change_request_write_failed", "Change request creation did not commit completely.");
    }
  } catch (error) {
    const replay = await readCreateReplay({
      content,
      exposurePortalId,
      originPortalId,
      publicRequestId,
      requestActor,
      scope,
      versionId,
    });
    if (replay) return replay;
    if (error instanceof ProjectChangeRequestError) throw error;
    throw new ProjectChangeRequestError("project_change_request_write_failed", "Change request creation failed.");
  }

  const request = await readProjectChangeRequestRecord(scope);
  const exposure = publicExposure
    ? await readProjectChangeRequestExposureRecord({ database: input.database, portalId: publicExposure.portalId, requestId: scope.requestId })
    : null;
  if (!request || request.currentVersionId !== versionId || (publicExposure && !exposure)) {
    throw new ProjectChangeRequestError("project_change_request_write_failed", "Change request creation could not be verified.");
  }
  return { request, exposure, replayed: false };
}

export async function amendChangeRequest(input: AmendChangeRequestInput) {
  const requestActor = actor(input.actor);
  const { request, scope } = await readRequiredRequest(input);
  assertRecipientOwner(request, requestActor);
  if (!RECIPIENT_AMEND_STATUSES.includes(request.status as (typeof RECIPIENT_AMEND_STATUSES)[number])) {
    throw new ProjectChangeRequestError("project_change_request_invalid_transition", "Change request cannot be amended from its current state.");
  }
  const expectedCurrentVersionId = requiredIdentifier(input.expectedCurrentVersionId, "Expected change request version");
  const versionId = requiredIdentifier(input.versionId, "Change request version");
  const content = normalizedContent(input);
  const existingVersion = await readProjectChangeRequestVersionRecord({ ...scope, versionId });
  if (existingVersion) {
    if (request.currentVersionId === versionId && existingVersion.contentHash === content.contentHash) {
      return { request, version: existingVersion, replayed: true };
    }
    throw new ProjectChangeRequestError("project_change_request_conflict", "Change request version identity is already in use.");
  }
  if (request.currentVersionId !== expectedCurrentVersionId) {
    throw new ProjectChangeRequestError("project_change_request_conflict", "Change request changed before the amendment was saved.");
  }
  if (!input.database.batch) {
    throw new ProjectChangeRequestError("project_change_request_batch_required", "Change request amendment requires an atomic D1 batch.");
  }
  const exposure = request.originPortalId
    ? await readProjectChangeRequestExposureRecord({
        database: input.database,
        portalId: request.originPortalId,
        requestId: request.id,
      })
    : null;
  const atomicStatements = atomicRequestStatements({
    actor: requestActor,
    database: input.database,
    eventId: versionId,
    eventType: "request.amended",
    exposurePortalId: exposure?.status === "visible" ? exposure.portalId : null,
    idempotencyKey: `request.amended:${versionId}`,
    notifyOwner: true,
    now: isoTimestamp(input.now),
    originPortalId: exposure?.status === "visible" ? exposure.portalId : request.originPortalId,
    projectId: scope.projectId,
    publicRequestId: exposure?.status === "visible" ? exposure.publicRequestId : null,
    requestId: request.id,
    status: request.status,
    title: content.title,
    versionId,
    workspaceId: scope.workspaceId,
  });
  const expectedStatements = 2 + content.targets.length + content.artifacts.length + atomicStatements.length;
  try {
    const results = await amendProjectChangeRequestRecords({
      ...scope,
      ...content,
      actor: requestActor,
      atomicStatements,
      allowedStatuses: RECIPIENT_AMEND_STATUSES,
      expectedCurrentVersionId,
      nextVersionNumber: request.currentVersion.versionNumber + 1,
      now: isoTimestamp(input.now),
      supersedesVersionId: request.currentVersionId,
      versionId,
    });
    if (!batchChanged(results, expectedStatements)) {
      throw new ProjectChangeRequestError("project_change_request_conflict", "Change request changed before the amendment was saved.");
    }
  } catch (error) {
    const raced = await readProjectChangeRequestVersionRecord({ ...scope, versionId });
    const current = await readProjectChangeRequestRecord(scope);
    if (raced && current?.currentVersionId === versionId && raced.contentHash === content.contentHash) {
      return { request: current, version: raced, replayed: true };
    }
    if (error instanceof ProjectChangeRequestError) throw error;
    throw new ProjectChangeRequestError("project_change_request_write_failed", "Change request amendment failed.");
  }
  const [current, version] = await Promise.all([
    readProjectChangeRequestRecord(scope),
    readProjectChangeRequestVersionRecord({ ...scope, versionId }),
  ]);
  if (!current || !version || current.currentVersionId !== versionId) {
    throw new ProjectChangeRequestError("project_change_request_write_failed", "Change request amendment could not be verified.");
  }
  return { request: current, version, replayed: false };
}

async function performStateAction(input: StateActionInput & {
  action: ProjectChangeRequestStateAction;
  allowedStatuses: readonly ProjectChangeRequestStatus[];
  assessmentOwnerUserId?: string | null;
  metadata?: Record<string, unknown>;
  recipientOwned?: boolean;
  toStatus: ProjectChangeRequestStatus | ((status: ProjectChangeRequestStatus) => ProjectChangeRequestStatus);
}) {
  const requestActor = actor(input.actor);
  const { request, scope } = await readRequiredRequest(input);
  if (input.recipientOwned) assertRecipientOwner(request, requestActor);
  else assertInternalActor(requestActor);
  const toStatus = typeof input.toStatus === "function" ? input.toStatus(request.status) : input.toStatus;
  const eventId = requiredIdentifier(input.eventId, "Change request state event");
  const idempotencyKey = requiredIdentifier(input.idempotencyKey, "Change request idempotency key");
  const replay = await readProjectChangeRequestStateEvent({ actor: requestActor, database: input.database, idempotencyKey, requestId: request.id });
  if (replay) {
    if (replay.id === eventId && replay.to_status === toStatus) return { request, replayed: true };
    throw new ProjectChangeRequestError("project_change_request_conflict", "Change request action idempotency identity is already in use.");
  }
  if (!input.allowedStatuses.includes(request.status)) {
    throw new ProjectChangeRequestError("project_change_request_invalid_transition", "Change request action is invalid from its current state.");
  }
  if (!input.database.batch) {
    throw new ProjectChangeRequestError("project_change_request_batch_required", "Change request actions require an atomic D1 batch.");
  }
  const exposure = request.originPortalId
    ? await readProjectChangeRequestExposureRecord({
        database: input.database,
        portalId: request.originPortalId,
        requestId: request.id,
      })
    : null;
  const atomicStatements = atomicRequestStatements({
    actor: requestActor,
    database: input.database,
    eventId,
    eventType: `request.${input.action}`,
    exposurePortalId: exposure?.status === "visible" ? exposure.portalId : null,
    idempotencyKey,
    notifyOwner: input.recipientOwned === true,
    now: isoTimestamp(input.now),
    originPortalId: exposure?.status === "visible" ? exposure.portalId : request.originPortalId,
    projectId: scope.projectId,
    publicRequestId: exposure?.status === "visible" ? exposure.publicRequestId : null,
    requestId: request.id,
    status: toStatus,
    title: request.currentVersion.title,
    versionId: request.currentVersionId,
    workspaceId: scope.workspaceId,
  });
  try {
    const results = await transitionProjectChangeRequestRecords({
      ...scope,
      action: input.action,
      actor: requestActor,
      atomicStatements,
      assessmentOwnerUserId: input.assessmentOwnerUserId ?? null,
      eventId,
      fromStatus: request.status,
      idempotencyKey,
      metadataJson: canonicalJson({ action: input.action, ...(input.metadata ?? {}) }),
      note: optionalText(input.note, "Change request action note"),
      now: isoTimestamp(input.now),
      toStatus,
    });
    const expectedStatements = (input.action === "withdraw" ? 3 : 2) + atomicStatements.length;
    if (!batchChanged(results, expectedStatements, input.action === "withdraw" ? [2] : [])) {
      throw new ProjectChangeRequestError("project_change_request_conflict", "Change request changed before the action was saved.");
    }
  } catch (error) {
    const raced = await readProjectChangeRequestStateEvent({ actor: requestActor, database: input.database, idempotencyKey, requestId: request.id });
    const current = await readProjectChangeRequestRecord(scope);
    if (raced?.id === eventId && raced.to_status === toStatus && current) return { request: current, replayed: true };
    if (error instanceof ProjectChangeRequestError) throw error;
    throw new ProjectChangeRequestError("project_change_request_write_failed", "Change request action failed.");
  }
  const current = await readProjectChangeRequestRecord(scope);
  if (!current || current.status !== toStatus) {
    throw new ProjectChangeRequestError("project_change_request_write_failed", "Change request action could not be verified.");
  }
  return { request: current, replayed: false };
}

export function acknowledgeChangeRequest(input: StateActionInput) {
  return performStateAction({ ...input, action: "acknowledge", allowedStatuses: ["submitted"], toStatus: "acknowledged" });
}

export function assignChangeRequestAssessment(input: StateActionInput & { assessmentOwnerUserId: string }) {
  return performStateAction({
    ...input,
    action: "assign_assessment",
    allowedStatuses: ["submitted", "acknowledged", "under_assessment"],
    assessmentOwnerUserId: requiredIdentifier(input.assessmentOwnerUserId, "Assessment owner"),
    toStatus: "under_assessment",
  });
}

export function updateChangeRequestAssessment(input: StateActionInput & { assessment: Record<string, unknown> }) {
  return performStateAction({
    ...input,
    action: "update_assessment",
    allowedStatuses: ["under_assessment"],
    metadata: { assessment: input.assessment },
    toStatus: "under_assessment",
  });
}

export function rejectChangeRequest(input: StateActionInput) {
  return performStateAction({ ...input, action: "reject", allowedStatuses: REJECT_STATUSES, toStatus: "rejected" });
}

export function withdrawChangeRequest(input: StateActionInput) {
  const requestActor = actor(input.actor);
  return performStateAction({
    ...input,
    actor: requestActor,
    action: "withdraw",
    allowedStatuses: WITHDRAW_STATUSES,
    recipientOwned: requestActor.type === "recipient",
    toStatus: "withdrawn",
  });
}

export function readChangeRequest(input: ChangeRequestScope & { requestId: string }) {
  return readProjectChangeRequestRecord(requestScope(input));
}
