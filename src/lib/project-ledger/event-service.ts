import "server-only";

import { randomUUID } from "node:crypto";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1Result,
  D1Value,
} from "@/lib/cloudflare/d1";
import type {
  ProjectCommitmentActorType,
  ProjectCommitmentEventSourceType,
  ProjectCommitmentExposureKind,
} from "@/lib/project-ledger/contracts";

type JsonObject = Record<string, unknown>;

type ProjectCommitmentEventSource =
  | { issueId: string; sourceType: "issue" }
  | { decisionId: string; sourceType: "decision" }
  | { baselineId: string; sourceType: "baseline" }
  | {
      requestId: string;
      requestVersionId: string;
      sourceType: "change_request";
    }
  | {
      artifactId: string;
      artifactVersionId: string;
      sourceType: "artifact";
    }
  | { legacyPublicationId: string; sourceType: "legacy_publication" };

type ProjectCommitmentEventActor = {
  actorId: string;
  actorType: ProjectCommitmentActorType;
  domainRoleSnapshot?: string | null;
  nameSnapshot?: string | null;
  permissionRoleSnapshot?: string | null;
};

type ProjectCommitmentEventExposureInput = {
  exposedAt?: string;
  exposedByActor?: Pick<ProjectCommitmentEventActor, "actorId" | "actorType">;
  exposureKind: ProjectCommitmentExposureKind;
  policySnapshot: JsonObject;
  portalId: string;
  publicEventId: string;
};

export type ProjectCommitmentEventInput = {
  actor: ProjectCommitmentEventActor;
  causationEventId?: string | null;
  clientSafeSnapshot: JsonObject;
  correlationId: string;
  database: D1DatabaseLike;
  eventId?: string;
  eventType: string;
  exposure?: ProjectCommitmentEventExposureInput | null;
  internalMetadata?: JsonObject;
  occurredAt?: string;
  originPortalId?: string | null;
  projectId: string;
  rootRequestId?: string | null;
  source: ProjectCommitmentEventSource;
  summary?: string | null;
  title: string;
  workspaceId: string;
};

export type ProjectCommitmentEventReceipt = {
  eventId: string;
  exposed: boolean;
  occurredAt: string;
  replayed: boolean;
};

export type ProjectCommitmentEventWritePlan = {
  eventId: string;
  exposed: boolean;
  occurredAt: string;
  statements: D1PreparedStatementLike[];
};

class ProjectCommitmentEventError extends Error {
  constructor(
    readonly code:
      | "project_commitment_event_batch_required"
      | "project_commitment_event_conflict"
      | "project_commitment_event_invalid"
      | "project_commitment_event_scope_invalid"
      | "project_commitment_event_write_failed",
    message: string,
  ) {
    super(message);
  }
}

type SourceColumns = {
  artifactId: string | null;
  artifactVersionId: string | null;
  baselineId: string | null;
  decisionId: string | null;
  issueId: string | null;
  legacyPublicationId: string | null;
  requestId: string | null;
  requestVersionId: string | null;
  sourceId: string;
  sourceType: ProjectCommitmentEventSourceType;
  sourceVersionId: string | null;
};

type NormalizedExposure = {
  exposedAt: string;
  exposedByActorId: string;
  exposedByActorType: ProjectCommitmentActorType;
  exposureKind: ProjectCommitmentExposureKind;
  policySnapshotJson: string;
  portalId: string;
  publicEventId: string;
};

type NormalizedIntent = SourceColumns & {
  actorDomainRoleSnapshot: string | null;
  actorId: string;
  actorNameSnapshot: string | null;
  actorPermissionRoleSnapshot: string | null;
  actorType: ProjectCommitmentActorType;
  causationEventId: string | null;
  clientSafeSnapshotJson: string;
  correlationId: string;
  eventType: string;
  exposure: NormalizedExposure | null;
  internalMetadataJson: string;
  occurredAt: string;
  originPortalId: string | null;
  projectId: string;
  rootRequestId: string | null;
  summary: string | null;
  title: string;
  workspaceId: string;
};

type EventRow = {
  actor_domain_role_snapshot: string | null;
  actor_id: string;
  actor_name_snapshot: string | null;
  actor_permission_role_snapshot: string | null;
  actor_type: ProjectCommitmentActorType;
  artifact_id: string | null;
  artifact_version_id: string | null;
  baseline_id: string | null;
  causation_event_id: string | null;
  client_safe_snapshot_json: string;
  correlation_id: string;
  decision_id: string | null;
  event_type: string;
  id: string;
  internal_metadata_json: string;
  issue_id: string | null;
  legacy_publication_id: string | null;
  occurred_at: string;
  origin_portal_id: string | null;
  project_id: string;
  request_id: string | null;
  request_version_id: string | null;
  root_request_id: string | null;
  source_id: string;
  source_type: ProjectCommitmentEventSourceType;
  source_version_id: string | null;
  summary: string | null;
  title: string;
  workspace_id: string;
};

type ExposureRow = {
  event_id: string;
  exposed_at: string;
  exposed_by_actor_id: string;
  exposed_by_actor_type: ProjectCommitmentActorType;
  exposure_kind: ProjectCommitmentExposureKind;
  policy_snapshot_json: string;
  portal_id: string;
  public_event_id: string;
  status: string;
};

const EVENT_COLUMNS = [
  "id",
  "workspace_id",
  "project_id",
  "origin_portal_id",
  "event_type",
  "source_type",
  "source_id",
  "source_version_id",
  "issue_id",
  "decision_id",
  "baseline_id",
  "request_id",
  "request_version_id",
  "artifact_id",
  "artifact_version_id",
  "legacy_publication_id",
  "root_request_id",
  "correlation_id",
  "causation_event_id",
  "actor_type",
  "actor_id",
  "actor_name_snapshot",
  "actor_domain_role_snapshot",
  "actor_permission_role_snapshot",
  "title",
  "summary",
  "client_safe_snapshot_json",
  "internal_metadata_json",
  "occurred_at",
  "created_at",
] as const;

const EVENT_INSERT_SQL = `
  WITH candidate (${EVENT_COLUMNS.join(", ")}) AS (
    VALUES (${EVENT_COLUMNS.map(() => "?").join(", ")})
  )
  INSERT INTO project_commitment_events (${EVENT_COLUMNS.join(", ")})
  SELECT ${EVENT_COLUMNS.join(", ")}
  FROM candidate
  WHERE EXISTS (
    SELECT 1
    FROM projects
    WHERE projects.id = candidate.project_id
      AND projects.workspace_id = candidate.workspace_id
  )
    AND (
      (candidate.source_type = 'issue' AND EXISTS (
        SELECT 1
        FROM client_portal_issues AS issue
        JOIN client_portals AS portal ON portal.id = issue.portal_id
        WHERE issue.id = candidate.issue_id
          AND portal.workspace_id = candidate.workspace_id
          AND portal.project_id = candidate.project_id
      ))
      OR (candidate.source_type = 'decision' AND EXISTS (
        SELECT 1
        FROM client_portal_decisions AS decision
        JOIN client_portals AS portal ON portal.id = decision.portal_id
        WHERE decision.id = candidate.decision_id
          AND portal.workspace_id = candidate.workspace_id
          AND portal.project_id = candidate.project_id
      ))
      OR (candidate.source_type = 'baseline' AND EXISTS (
        SELECT 1
        FROM client_portal_baselines AS baseline
        WHERE baseline.id = candidate.baseline_id
          AND baseline.workspace_id = candidate.workspace_id
          AND baseline.project_id = candidate.project_id
      ))
      OR (candidate.source_type = 'change_request' AND EXISTS (
        SELECT 1
        FROM project_change_requests AS request
        JOIN project_change_request_versions AS version
          ON version.id = candidate.request_version_id
          AND version.request_id = request.id
        WHERE request.id = candidate.request_id
          AND request.workspace_id = candidate.workspace_id
          AND request.project_id = candidate.project_id
      ))
      OR (candidate.source_type = 'artifact' AND EXISTS (
        SELECT 1
        FROM project_artifacts AS artifact
        JOIN project_artifact_versions AS version
          ON version.id = candidate.artifact_version_id
          AND version.artifact_id = artifact.id
        WHERE artifact.id = candidate.artifact_id
          AND artifact.workspace_id = candidate.workspace_id
          AND artifact.project_id = candidate.project_id
      ))
      OR (candidate.source_type = 'legacy_publication' AND EXISTS (
        SELECT 1
        FROM project_publications AS publication
        WHERE publication.id = candidate.legacy_publication_id
          AND publication.workspace_id = candidate.workspace_id
          AND publication.project_id = candidate.project_id
      ))
    )
    AND (
      candidate.origin_portal_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM client_portals AS portal
        WHERE portal.id = candidate.origin_portal_id
          AND portal.workspace_id = candidate.workspace_id
          AND portal.project_id = candidate.project_id
      )
    )
    AND (
      candidate.root_request_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM project_change_requests AS request
        WHERE request.id = candidate.root_request_id
          AND request.workspace_id = candidate.workspace_id
          AND request.project_id = candidate.project_id
      )
    )
    AND (
      candidate.causation_event_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM project_commitment_events AS cause
        WHERE cause.id = candidate.causation_event_id
          AND cause.workspace_id = candidate.workspace_id
          AND cause.project_id = candidate.project_id
          AND cause.id <> candidate.id
          AND cause.occurred_at < candidate.occurred_at
      )
    )
`;

const EXPOSURE_INSERT_SQL = `
  INSERT INTO client_portal_event_exposures (
    event_id,
    portal_id,
    public_event_id,
    status,
    exposure_kind,
    policy_snapshot_json,
    exposed_by_actor_type,
    exposed_by_actor_id,
    exposed_at,
    withdrawn_at,
    withdrawal_reason
  )
  SELECT ?, ?, ?, 'visible', ?, ?, ?, ?, ?, NULL, NULL
  FROM project_commitment_events AS event
  JOIN client_portals AS portal
    ON portal.id = ?
    AND portal.workspace_id = event.workspace_id
    AND portal.project_id = event.project_id
  WHERE event.id = ?
`;

const EVENT_REPLAY_SQL = `
  SELECT
    id,
    workspace_id,
    project_id,
    origin_portal_id,
    event_type,
    source_type,
    source_id,
    source_version_id,
    issue_id,
    decision_id,
    baseline_id,
    request_id,
    request_version_id,
    artifact_id,
    artifact_version_id,
    legacy_publication_id,
    root_request_id,
    correlation_id,
    causation_event_id,
    actor_type,
    actor_id,
    actor_name_snapshot,
    actor_domain_role_snapshot,
    actor_permission_role_snapshot,
    title,
    summary,
    client_safe_snapshot_json,
    internal_metadata_json,
    occurred_at
  FROM project_commitment_events
  WHERE source_type = ?
    AND source_id = ?
    AND event_type = ?
    AND correlation_id = ?
  LIMIT 1
`;

const EXPOSURE_REPLAY_SQL = `
  SELECT
    event_id,
    portal_id,
    public_event_id,
    status,
    exposure_kind,
    policy_snapshot_json,
    exposed_by_actor_type,
    exposed_by_actor_id,
    exposed_at
  FROM client_portal_event_exposures
  WHERE event_id = ?
  ORDER BY portal_id
  LIMIT 1
`;

function statement(
  database: D1DatabaseLike,
  sql: string,
  values: D1Value[],
): D1PreparedStatementLike {
  return database.prepare(sql).bind(...values);
}

async function first<T>(
  database: D1DatabaseLike,
  sql: string,
  values: D1Value[],
): Promise<T | null> {
  return database.prepare<T>(sql).bind(...values).first<T>();
}

function identifier(value: string | null | undefined, label: string) {
  const normalized = value?.trim();
  if (!normalized) {
    throw new ProjectCommitmentEventError(
      "project_commitment_event_invalid",
      `${label} is required.`,
    );
  }
  if (normalized.length > 512) {
    throw new ProjectCommitmentEventError(
      "project_commitment_event_invalid",
      `${label} is too long.`,
    );
  }
  return normalized;
}

function optionalText(
  value: string | null | undefined,
  label: string,
  maximumLength: number,
) {
  if (value === null || value === undefined) return null;
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maximumLength) {
    throw new ProjectCommitmentEventError(
      "project_commitment_event_invalid",
      `${label} is too long.`,
    );
  }
  return normalized;
}

function requiredText(value: string, label: string, maximumLength: number) {
  const normalized = optionalText(value, label, maximumLength);
  if (!normalized) {
    throw new ProjectCommitmentEventError(
      "project_commitment_event_invalid",
      `${label} is required.`,
    );
  }
  return normalized;
}

function isoTimestamp(value: string | undefined, label: string) {
  const date = value === undefined ? new Date() : new Date(value);
  if (!Number.isFinite(date.valueOf())) {
    throw new ProjectCommitmentEventError(
      "project_commitment_event_invalid",
      `${label} must be a valid timestamp.`,
    );
  }
  return date.toISOString();
}

function canonicalJsonValue(value: unknown): unknown {
  if (
    value === null
    || typeof value === "string"
    || typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new ProjectCommitmentEventError(
        "project_commitment_event_invalid",
        "Ledger snapshots must contain finite JSON numbers.",
      );
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(canonicalJsonValue);
  }
  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new ProjectCommitmentEventError(
        "project_commitment_event_invalid",
        "Ledger snapshots must contain plain JSON objects.",
      );
    }
    return Object.fromEntries(
      Object.entries(value as JsonObject)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalJsonValue(entry)]),
    );
  }
  throw new ProjectCommitmentEventError(
    "project_commitment_event_invalid",
    "Ledger snapshots must contain JSON-safe values.",
  );
}

function canonicalJson(value: JsonObject, label: string) {
  if (
    value === null
    || typeof value !== "object"
    || Array.isArray(value)
  ) {
    throw new ProjectCommitmentEventError(
      "project_commitment_event_invalid",
      `${label} must be a JSON object.`,
    );
  }
  return JSON.stringify(canonicalJsonValue(value));
}

function storedJsonMatches(stored: string, expected: string) {
  try {
    return JSON.stringify(canonicalJsonValue(JSON.parse(stored))) === expected;
  } catch {
    return false;
  }
}

function sourceColumns(source: ProjectCommitmentEventSource): SourceColumns {
  const empty = {
    artifactId: null,
    artifactVersionId: null,
    baselineId: null,
    decisionId: null,
    issueId: null,
    legacyPublicationId: null,
    requestId: null,
    requestVersionId: null,
    sourceVersionId: null,
  };
  switch (source.sourceType) {
    case "issue": {
      const issueId = identifier(source.issueId, "Issue ID");
      return { ...empty, issueId, sourceId: issueId, sourceType: source.sourceType };
    }
    case "decision": {
      const decisionId = identifier(source.decisionId, "Decision ID");
      return { ...empty, decisionId, sourceId: decisionId, sourceType: source.sourceType };
    }
    case "baseline": {
      const baselineId = identifier(source.baselineId, "Baseline ID");
      return { ...empty, baselineId, sourceId: baselineId, sourceType: source.sourceType };
    }
    case "change_request": {
      const requestId = identifier(source.requestId, "Request ID");
      const requestVersionId = identifier(source.requestVersionId, "Request version ID");
      return {
        ...empty,
        requestId,
        requestVersionId,
        sourceId: requestId,
        sourceType: source.sourceType,
        sourceVersionId: requestVersionId,
      };
    }
    case "artifact": {
      const artifactId = identifier(source.artifactId, "Artifact ID");
      const artifactVersionId = identifier(source.artifactVersionId, "Artifact version ID");
      return {
        ...empty,
        artifactId,
        artifactVersionId,
        sourceId: artifactId,
        sourceType: source.sourceType,
        sourceVersionId: artifactVersionId,
      };
    }
    case "legacy_publication": {
      const legacyPublicationId = identifier(
        source.legacyPublicationId,
        "Legacy publication ID",
      );
      return {
        ...empty,
        legacyPublicationId,
        sourceId: legacyPublicationId,
        sourceType: source.sourceType,
      };
    }
  }
}

function normalize(input: ProjectCommitmentEventInput): NormalizedIntent {
  const occurredAt = isoTimestamp(input.occurredAt, "Occurred at");
  const actorId = identifier(input.actor.actorId, "Actor ID");
  const actorType = input.actor.actorType;
  if (
    actorType !== "internal_user"
    && actorType !== "recipient"
    && actorType !== "system"
  ) {
    throw new ProjectCommitmentEventError(
      "project_commitment_event_invalid",
      "Actor type is invalid.",
    );
  }
  const exposure = input.exposure
    ? {
        exposedAt: isoTimestamp(input.exposure.exposedAt ?? occurredAt, "Exposed at"),
        exposedByActorId: identifier(
          input.exposure.exposedByActor?.actorId ?? actorId,
          "Exposure actor ID",
        ),
        exposedByActorType:
          input.exposure.exposedByActor?.actorType ?? actorType,
        exposureKind: input.exposure.exposureKind,
        policySnapshotJson: canonicalJson(
          input.exposure.policySnapshot,
          "Exposure policy snapshot",
        ),
        portalId: identifier(input.exposure.portalId, "Exposure portal ID"),
        publicEventId: identifier(input.exposure.publicEventId, "Public event ID"),
      }
    : null;
  if (
    exposure
    && exposure.exposedByActorType !== "internal_user"
    && exposure.exposedByActorType !== "recipient"
    && exposure.exposedByActorType !== "system"
  ) {
    throw new ProjectCommitmentEventError(
      "project_commitment_event_invalid",
      "Exposure actor type is invalid.",
    );
  }
  if (
    exposure
    && exposure.exposureKind !== "automatic"
    && exposure.exposureKind !== "manual"
    && exposure.exposureKind !== "backfill"
  ) {
    throw new ProjectCommitmentEventError(
      "project_commitment_event_invalid",
      "Exposure kind is invalid.",
    );
  }
  return {
    ...sourceColumns(input.source),
    actorDomainRoleSnapshot: optionalText(
      input.actor.domainRoleSnapshot,
      "Actor domain role snapshot",
      240,
    ),
    actorId,
    actorNameSnapshot: optionalText(input.actor.nameSnapshot, "Actor name snapshot", 240),
    actorPermissionRoleSnapshot: optionalText(
      input.actor.permissionRoleSnapshot,
      "Actor permission role snapshot",
      240,
    ),
    actorType,
    causationEventId: input.causationEventId
      ? identifier(input.causationEventId, "Causation event ID")
      : null,
    clientSafeSnapshotJson: canonicalJson(
      input.clientSafeSnapshot,
      "Client-safe snapshot",
    ),
    correlationId: identifier(input.correlationId, "Correlation ID"),
    eventType: identifier(input.eventType, "Event type"),
    exposure,
    internalMetadataJson: canonicalJson(
      input.internalMetadata ?? {},
      "Internal metadata",
    ),
    occurredAt,
    originPortalId: input.originPortalId
      ? identifier(input.originPortalId, "Origin portal ID")
      : null,
    projectId: identifier(input.projectId, "Project ID"),
    rootRequestId: input.rootRequestId
      ? identifier(input.rootRequestId, "Root request ID")
      : null,
    summary: optionalText(input.summary, "Event summary", 4_000),
    title: requiredText(input.title, "Event title", 240),
    workspaceId: identifier(input.workspaceId, "Workspace ID"),
  };
}

function eventValues(
  eventId: string,
  intent: NormalizedIntent,
  createdAt: string,
): D1Value[] {
  return [
    eventId,
    intent.workspaceId,
    intent.projectId,
    intent.originPortalId,
    intent.eventType,
    intent.sourceType,
    intent.sourceId,
    intent.sourceVersionId,
    intent.issueId,
    intent.decisionId,
    intent.baselineId,
    intent.requestId,
    intent.requestVersionId,
    intent.artifactId,
    intent.artifactVersionId,
    intent.legacyPublicationId,
    intent.rootRequestId,
    intent.correlationId,
    intent.causationEventId,
    intent.actorType,
    intent.actorId,
    intent.actorNameSnapshot,
    intent.actorDomainRoleSnapshot,
    intent.actorPermissionRoleSnapshot,
    intent.title,
    intent.summary,
    intent.clientSafeSnapshotJson,
    intent.internalMetadataJson,
    intent.occurredAt,
    createdAt,
  ];
}

function exposureValues(eventId: string, exposure: NormalizedExposure): D1Value[] {
  return [
    eventId,
    exposure.portalId,
    exposure.publicEventId,
    exposure.exposureKind,
    exposure.policySnapshotJson,
    exposure.exposedByActorType,
    exposure.exposedByActorId,
    exposure.exposedAt,
    exposure.portalId,
    eventId,
  ];
}

function eventMatches(row: EventRow, intent: NormalizedIntent, requestedEventId?: string) {
  return (
    (!requestedEventId || row.id === requestedEventId)
    && row.workspace_id === intent.workspaceId
    && row.project_id === intent.projectId
    && row.origin_portal_id === intent.originPortalId
    && row.event_type === intent.eventType
    && row.source_type === intent.sourceType
    && row.source_id === intent.sourceId
    && row.source_version_id === intent.sourceVersionId
    && row.issue_id === intent.issueId
    && row.decision_id === intent.decisionId
    && row.baseline_id === intent.baselineId
    && row.request_id === intent.requestId
    && row.request_version_id === intent.requestVersionId
    && row.artifact_id === intent.artifactId
    && row.artifact_version_id === intent.artifactVersionId
    && row.legacy_publication_id === intent.legacyPublicationId
    && row.root_request_id === intent.rootRequestId
    && row.correlation_id === intent.correlationId
    && row.causation_event_id === intent.causationEventId
    && row.actor_type === intent.actorType
    && row.actor_id === intent.actorId
    && row.actor_name_snapshot === intent.actorNameSnapshot
    && row.actor_domain_role_snapshot === intent.actorDomainRoleSnapshot
    && row.actor_permission_role_snapshot === intent.actorPermissionRoleSnapshot
    && row.title === intent.title
    && row.summary === intent.summary
    && storedJsonMatches(row.client_safe_snapshot_json, intent.clientSafeSnapshotJson)
    && storedJsonMatches(row.internal_metadata_json, intent.internalMetadataJson)
    && row.occurred_at === intent.occurredAt
  );
}

function exposureMatches(
  row: ExposureRow | null,
  eventId: string,
  exposure: NormalizedExposure | null,
) {
  if (!exposure) return row === null;
  return (
    row?.event_id === eventId
    && row.portal_id === exposure.portalId
    && row.public_event_id === exposure.publicEventId
    && row.status === "visible"
    && row.exposure_kind === exposure.exposureKind
    && storedJsonMatches(row.policy_snapshot_json, exposure.policySnapshotJson)
    && row.exposed_by_actor_type === exposure.exposedByActorType
    && row.exposed_by_actor_id === exposure.exposedByActorId
    && row.exposed_at === exposure.exposedAt
  );
}

async function readReplay(database: D1DatabaseLike, intent: NormalizedIntent) {
  return first<EventRow>(database, EVENT_REPLAY_SQL, [
    intent.sourceType,
    intent.sourceId,
    intent.eventType,
    intent.correlationId,
  ]);
}

async function replayReceipt(
  database: D1DatabaseLike,
  row: EventRow,
  intent: NormalizedIntent,
  requestedEventId?: string,
): Promise<ProjectCommitmentEventReceipt> {
  if (!eventMatches(row, intent, requestedEventId)) {
    throw new ProjectCommitmentEventError(
      "project_commitment_event_conflict",
      "Correlation ID already belongs to a different commitment event intent.",
    );
  }
  const exposure = await first<ExposureRow>(
    database,
    EXPOSURE_REPLAY_SQL,
    [row.id],
  );
  if (!exposureMatches(exposure, row.id, intent.exposure)) {
    throw new ProjectCommitmentEventError(
      "project_commitment_event_conflict",
      "Correlation ID already belongs to a different commitment event exposure intent.",
    );
  }
  return {
    eventId: row.id,
    exposed: Boolean(intent.exposure),
    occurredAt: row.occurred_at,
    replayed: true,
  };
}

function failedBatchResult(result: D1Result[] | undefined, expectedStatements: number) {
  return (
    !result
    || result.length !== expectedStatements
    || result.some((entry) => entry.success === false)
  );
}

function writePlan(
  input: ProjectCommitmentEventInput,
  intent: NormalizedIntent,
): ProjectCommitmentEventWritePlan {
  const eventId = input.eventId
    ? identifier(input.eventId, "Event ID")
    : `event_${randomUUID()}`;
  const createdAt = new Date().toISOString();
  const statements = [
    statement(
      input.database,
      EVENT_INSERT_SQL,
      eventValues(eventId, intent, createdAt),
    ),
  ];
  if (intent.exposure) {
    statements.push(
      statement(
        input.database,
        EXPOSURE_INSERT_SQL,
        exposureValues(eventId, intent.exposure),
      ),
    );
  }
  return {
    eventId,
    exposed: Boolean(intent.exposure),
    occurredAt: intent.occurredAt,
    statements,
  };
}

export function prepareProjectCommitmentEventWrites(
  input: ProjectCommitmentEventInput,
): ProjectCommitmentEventWritePlan {
  return writePlan(input, normalize(input));
}

export async function recordProjectCommitmentEvent(
  input: ProjectCommitmentEventInput,
): Promise<ProjectCommitmentEventReceipt> {
  const intent = normalize(input);
  const replay = await readReplay(input.database, intent);
  if (replay) {
    return replayReceipt(input.database, replay, intent, input.eventId);
  }
  if (!input.database.batch) {
    throw new ProjectCommitmentEventError(
      "project_commitment_event_batch_required",
      "Project commitment event writes require D1 batch support.",
    );
  }

  const plan = writePlan(input, intent);
  const writes = plan.statements;

  try {
    const results = await input.database.batch(writes);
    if (failedBatchResult(results, writes.length)) {
      throw new ProjectCommitmentEventError(
        "project_commitment_event_write_failed",
        "Project commitment event batch failed.",
      );
    }
    if (results[0]?.meta?.changes !== 1) {
      throw new ProjectCommitmentEventError(
        "project_commitment_event_scope_invalid",
        "Project commitment event source, root request, or causation is outside the project scope.",
      );
    }
    if (intent.exposure && results[1]?.meta?.changes !== 1) {
      throw new ProjectCommitmentEventError(
        "project_commitment_event_scope_invalid",
        "Project commitment event exposure is outside the project scope.",
      );
    }
  } catch (error) {
    const raced = await readReplay(input.database, intent);
    if (raced) {
      return replayReceipt(input.database, raced, intent, input.eventId);
    }
      throw error;
  }

  return {
    eventId: plan.eventId,
    exposed: plan.exposed,
    occurredAt: plan.occurredAt,
    replayed: false,
  };
}
