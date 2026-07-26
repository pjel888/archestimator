import "server-only";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1Result,
  D1Value,
} from "@/lib/cloudflare/d1";

import type {
  ProjectChangeRequest,
  ProjectChangeRequestActor,
  ProjectChangeRequestArtifactLink,
  ProjectChangeRequestExposure,
  ProjectChangeRequestStatus,
  ProjectChangeRequestTarget,
  ProjectChangeRequestVersion,
} from "./contracts";

type RequestRow = {
  id: string;
  workspace_id: string;
  project_id: string;
  origin_portal_id: string | null;
  request_number: number;
  request_code: string;
  current_version_id: string | null;
  status: ProjectChangeRequestStatus;
  requested_by_actor_type: ProjectChangeRequestActor["type"];
  requested_by_actor_id: string;
  requested_by_name_snapshot: string | null;
  requested_by_email_snapshot: string | null;
  requested_by_domain_role_snapshot: string | null;
  requested_by_permission_role_snapshot: string | null;
  requested_by_organization_snapshot: string | null;
  requested_at: string;
  acknowledged_by_user_id: string | null;
  acknowledged_at: string | null;
  assessment_owner_user_id: string | null;
  resolved_by_issue_id: string | null;
  resolved_at: string | null;
  withdrawn_at: string | null;
  created_at: string;
  updated_at: string;
};

type VersionRow = {
  id: string;
  request_id: string;
  version_number: number;
  title: string;
  description: string;
  reason: string | null;
  requested_effective_date: string | null;
  content_hash: string;
  metadata_json: string;
  created_by_actor_type: ProjectChangeRequestActor["type"];
  created_by_actor_id: string;
  created_at: string;
  supersedes_version_id: string | null;
};

type TargetRow = {
  id: string;
  target_kind: ProjectChangeRequestTarget["kind"];
  estimate_id: string | null;
  estimate_tab_id: string | null;
  node_id: string | null;
  row_id: string | null;
  artifact_id: string | null;
  discipline_key: string | null;
  location_key: string | null;
  other_key: string | null;
  target_label_snapshot: string;
  metadata_json: string;
};

type ArtifactLinkRow = {
  artifact_version_id: string;
  relationship: ProjectChangeRequestArtifactLink["relationship"];
  sort_order: number;
};

type ExposureRow = {
  request_id: string;
  portal_id: string;
  public_request_id: string;
  status: ProjectChangeRequestExposure["status"];
  exposure_kind: ProjectChangeRequestExposure["exposureKind"];
  policy_snapshot_json: string;
  exposed_by_actor_type: ProjectChangeRequestActor["type"];
  exposed_by_actor_id: string;
  exposed_at: string;
  withdrawn_at: string | null;
  withdrawal_reason: string | null;
};

export type RequestVersionRecordInput = {
  actor: ProjectChangeRequestActor;
  artifacts: ProjectChangeRequestArtifactLink[];
  contentHash: string;
  description: string;
  metadataJson: string;
  reason: string | null;
  requestedEffectiveDate: string | null;
  targets: Array<ProjectChangeRequestTarget & { metadataJson: string }>;
  title: string;
  versionId: string;
};

export type CreateProjectChangeRequestRecordInput = RequestVersionRecordInput & {
  atomicStatements?: readonly D1PreparedStatementLike[];
  database: D1DatabaseLike;
  eventId: string;
  eventMetadataJson: string;
  idempotencyKey: string;
  now: string;
  originPortalId: string | null;
  projectId: string;
  publicExposure: {
    exposureKind: "automatic" | "manual";
    policySnapshotJson: string;
    portalId: string;
    publicRequestId: string;
  } | null;
  requestId: string;
  workspaceId: string;
};

export type AmendProjectChangeRequestRecordInput = RequestVersionRecordInput & {
  atomicStatements?: readonly D1PreparedStatementLike[];
  allowedStatuses: readonly ProjectChangeRequestStatus[];
  database: D1DatabaseLike;
  expectedCurrentVersionId: string;
  nextVersionNumber: number;
  now: string;
  projectId: string;
  requestId: string;
  supersedesVersionId: string;
  workspaceId: string;
};

export type ProjectChangeRequestStateAction =
  | "acknowledge"
  | "assign_assessment"
  | "update_assessment"
  | "reject"
  | "withdraw";

export type TransitionProjectChangeRequestRecordInput = {
  action: ProjectChangeRequestStateAction;
  atomicStatements?: readonly D1PreparedStatementLike[];
  actor: ProjectChangeRequestActor;
  assessmentOwnerUserId: string | null;
  database: D1DatabaseLike;
  eventId: string;
  fromStatus: ProjectChangeRequestStatus;
  idempotencyKey: string;
  metadataJson: string;
  note: string | null;
  now: string;
  projectId: string;
  requestId: string;
  toStatus: ProjectChangeRequestStatus;
  workspaceId: string;
};

function statement(database: D1DatabaseLike, sql: string, values: D1Value[]): D1PreparedStatementLike {
  return database.prepare(sql).bind(...values);
}

async function first<T>(database: D1DatabaseLike, sql: string, values: D1Value[]): Promise<T | null> {
  return database.prepare<T>(sql).bind(...values).first<T>();
}

function parseJson(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function toTarget(row: TargetRow): ProjectChangeRequestTarget {
  return {
    id: row.id,
    kind: row.target_kind,
    label: row.target_label_snapshot,
    estimateId: row.estimate_id,
    estimateTabId: row.estimate_tab_id,
    nodeId: row.node_id,
    rowId: row.row_id,
    artifactId: row.artifact_id,
    disciplineKey: row.discipline_key,
    locationKey: row.location_key,
    otherKey: row.other_key,
    metadata: parseJson(row.metadata_json),
  };
}

async function toVersion(database: D1DatabaseLike, row: VersionRow): Promise<ProjectChangeRequestVersion> {
  const [targetResult, artifactResult] = await Promise.all([
    database.prepare<TargetRow>(`
      SELECT id, target_kind, estimate_id, estimate_tab_id, node_id, row_id,
             artifact_id, discipline_key, location_key, other_key,
             target_label_snapshot, metadata_json
      FROM project_change_request_targets
      WHERE request_version_id = ?
      ORDER BY target_kind ASC, id ASC
    `).bind(row.id).all<TargetRow>(),
    database.prepare<ArtifactLinkRow>(`
      SELECT artifact_version_id, relationship, sort_order
      FROM project_change_request_artifacts
      WHERE request_version_id = ?
      ORDER BY sort_order ASC, artifact_version_id ASC, relationship ASC
    `).bind(row.id).all<ArtifactLinkRow>(),
  ]);
  return {
    requestId: row.request_id,
    versionId: row.id,
    versionNumber: Number(row.version_number),
    contentHash: row.content_hash,
    title: row.title,
    description: row.description,
    reason: row.reason,
    requestedEffectiveDate: row.requested_effective_date,
    metadata: parseJson(row.metadata_json),
    createdByActorType: row.created_by_actor_type,
    createdByActorId: row.created_by_actor_id,
    createdAt: row.created_at,
    supersedesVersionId: row.supersedes_version_id,
    targets: (targetResult.results ?? []).map(toTarget),
    artifacts: (artifactResult.results ?? []).map((artifact) => ({
      artifactVersionId: artifact.artifact_version_id,
      relationship: artifact.relationship,
      sortOrder: Number(artifact.sort_order),
    })),
  };
}

async function toRequest(database: D1DatabaseLike, row: RequestRow): Promise<ProjectChangeRequest | null> {
  if (row.status === "initializing" || !row.current_version_id) return null;
  const version = await readProjectChangeRequestVersionRecord({
    database,
    projectId: row.project_id,
    requestId: row.id,
    versionId: row.current_version_id,
    workspaceId: row.workspace_id,
  });
  if (!version) return null;
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    originPortalId: row.origin_portal_id,
    requestNumber: Number(row.request_number),
    requestCode: row.request_code,
    currentVersionId: row.current_version_id,
    currentVersion: version,
    status: row.status,
    requestedByActorType: row.requested_by_actor_type,
    requestedByActorId: row.requested_by_actor_id,
    requestedByNameSnapshot: row.requested_by_name_snapshot,
    requestedByEmailSnapshot: row.requested_by_email_snapshot,
    requestedByDomainRoleSnapshot: row.requested_by_domain_role_snapshot,
    requestedByPermissionRoleSnapshot: row.requested_by_permission_role_snapshot,
    requestedByOrganizationSnapshot: row.requested_by_organization_snapshot,
    requestedAt: row.requested_at,
    acknowledgedByUserId: row.acknowledged_by_user_id,
    acknowledgedAt: row.acknowledged_at,
    assessmentOwnerUserId: row.assessment_owner_user_id,
    resolvedByIssueId: row.resolved_by_issue_id,
    resolvedAt: row.resolved_at,
    withdrawnAt: row.withdrawn_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const REQUEST_SELECT = `
  SELECT id, workspace_id, project_id, origin_portal_id, request_number,
         request_code, current_version_id, status, requested_by_actor_type,
         requested_by_actor_id, requested_by_name_snapshot,
         requested_by_email_snapshot, requested_by_domain_role_snapshot,
         requested_by_permission_role_snapshot, requested_by_organization_snapshot,
         requested_at, acknowledged_by_user_id, acknowledged_at,
         assessment_owner_user_id, resolved_by_issue_id, resolved_at,
         withdrawn_at, created_at, updated_at
  FROM project_change_requests
`;

const VERSION_SELECT = `
  SELECT project_change_request_versions.id AS id,
         project_change_request_versions.request_id AS request_id,
         project_change_request_versions.version_number AS version_number,
         project_change_request_versions.title AS title,
         project_change_request_versions.description AS description,
         project_change_request_versions.reason AS reason,
         project_change_request_versions.requested_effective_date AS requested_effective_date,
         project_change_request_versions.content_hash AS content_hash,
         project_change_request_versions.metadata_json AS metadata_json,
         project_change_request_versions.created_by_actor_type AS created_by_actor_type,
         project_change_request_versions.created_by_actor_id AS created_by_actor_id,
         project_change_request_versions.created_at AS created_at,
         project_change_request_versions.supersedes_version_id AS supersedes_version_id
  FROM project_change_request_versions
`;

export async function readProjectChangeRequestRecord(input: {
  database: D1DatabaseLike;
  projectId: string;
  requestId: string;
  workspaceId: string;
}) {
  const row = await first<RequestRow>(input.database, `
    ${REQUEST_SELECT}
    WHERE id = ? AND workspace_id = ? AND project_id = ? AND status <> 'initializing'
    LIMIT 1
  `, [input.requestId, input.workspaceId, input.projectId]);
  return row ? toRequest(input.database, row) : null;
}

export async function readProjectChangeRequestVersionRecord(input: {
  database: D1DatabaseLike;
  projectId: string;
  requestId: string;
  versionId: string;
  workspaceId: string;
}) {
  const row = await first<VersionRow>(input.database, `
    ${VERSION_SELECT}
    JOIN project_change_requests AS request ON request.id = project_change_request_versions.request_id
    WHERE project_change_request_versions.id = ?
      AND project_change_request_versions.request_id = ?
      AND request.workspace_id = ? AND request.project_id = ?
    LIMIT 1
  `, [input.versionId, input.requestId, input.workspaceId, input.projectId]);
  return row ? toVersion(input.database, row) : null;
}

export async function readProjectChangeRequestExposureRecord(input: {
  database: D1DatabaseLike;
  portalId: string;
  requestId: string;
}) {
  const row = await first<ExposureRow>(input.database, `
    SELECT request_id, portal_id, public_request_id, status, exposure_kind,
           policy_snapshot_json, exposed_by_actor_type, exposed_by_actor_id,
           exposed_at, withdrawn_at, withdrawal_reason
    FROM client_portal_request_exposures
    WHERE request_id = ? AND portal_id = ? LIMIT 1
  `, [input.requestId, input.portalId]);
  return row ? {
    requestId: row.request_id,
    portalId: row.portal_id,
    publicRequestId: row.public_request_id,
    status: row.status,
    exposureKind: row.exposure_kind,
    policySnapshot: parseJson(row.policy_snapshot_json),
    exposedByActorType: row.exposed_by_actor_type,
    exposedByActorId: row.exposed_by_actor_id,
    exposedAt: row.exposed_at,
    withdrawnAt: row.withdrawn_at,
    withdrawalReason: row.withdrawal_reason,
  } satisfies ProjectChangeRequestExposure : null;
}

export function readProjectChangeRequestStateEvent(input: {
  actor: ProjectChangeRequestActor;
  database: D1DatabaseLike;
  idempotencyKey: string;
  requestId: string;
}) {
  return first<{ id: string; from_status: ProjectChangeRequestStatus | null; to_status: ProjectChangeRequestStatus }>(input.database, `
    SELECT id, from_status, to_status
    FROM project_change_request_state_events
    WHERE request_id = ? AND actor_type = ? AND actor_id = ? AND idempotency_key = ?
    LIMIT 1
  `, [input.requestId, input.actor.type, input.actor.id, input.idempotencyKey]);
}

function versionValues(
  input: RequestVersionRecordInput,
  requestId: string,
  versionNumber: number,
  now: string,
  supersedesVersionId: string | null,
) {
  return [
    input.versionId,
    requestId,
    versionNumber,
    input.title,
    input.description,
    input.reason,
    input.requestedEffectiveDate,
    input.contentHash,
    input.metadataJson,
    input.actor.type,
    input.actor.id,
    now,
    supersedesVersionId,
  ] satisfies D1Value[];
}

const VERSION_INSERT_COLUMNS = `
  id, request_id, version_number, title, description, reason,
  requested_effective_date, content_hash, metadata_json,
  created_by_actor_type, created_by_actor_id, created_at, supersedes_version_id
`;

function relationshipStatements(
  database: D1DatabaseLike,
  versionId: string,
  targets: RequestVersionRecordInput["targets"],
  artifacts: ProjectChangeRequestArtifactLink[],
  now: string,
) {
  return [
    ...targets.map((target) => statement(database, `
      INSERT INTO project_change_request_targets (
        id, request_version_id, target_kind, estimate_id, estimate_tab_id,
        node_id, row_id, artifact_id, discipline_key, location_key, other_key,
        target_label_snapshot, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      target.id,
      versionId,
      target.kind,
      target.estimateId ?? null,
      target.estimateTabId ?? null,
      target.nodeId ?? null,
      target.rowId ?? null,
      target.artifactId ?? null,
      target.disciplineKey ?? null,
      target.locationKey ?? null,
      target.otherKey ?? null,
      target.label,
      target.metadataJson,
    ])),
    ...artifacts.map((artifact) => statement(database, `
      INSERT INTO project_change_request_artifacts (
        request_version_id, artifact_version_id, relationship, sort_order, created_at
      ) VALUES (?, ?, ?, ?, ?)
    `, [versionId, artifact.artifactVersionId, artifact.relationship, artifact.sortOrder, now])),
  ];
}

export async function createProjectChangeRequestRecords(input: CreateProjectChangeRequestRecordInput) {
  if (!input.database.batch) return null;
  const statements: D1PreparedStatementLike[] = [
    statement(input.database, `
      INSERT INTO project_change_request_counters (
        workspace_id, project_id, next_request_number, updated_at
      ) VALUES (?, ?, 1, ?)
      ON CONFLICT(project_id) DO NOTHING
    `, [input.workspaceId, input.projectId, input.now]),
    statement(input.database, `
      INSERT INTO project_change_requests (
        id, workspace_id, project_id, origin_portal_id, request_number,
        request_code, current_version_id, status, requested_by_actor_type,
        requested_by_actor_id, requested_by_name_snapshot,
        requested_by_email_snapshot, requested_by_domain_role_snapshot,
        requested_by_permission_role_snapshot, requested_by_organization_snapshot,
        requested_at, created_at, updated_at
      )
      SELECT ?, ?, ?, ?, counter.next_request_number,
             printf('CR-%04d', counter.next_request_number), NULL, 'initializing',
             ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      FROM project_change_request_counters AS counter
      WHERE counter.project_id = ? AND counter.workspace_id = ?
    `, [
      input.requestId,
      input.workspaceId,
      input.projectId,
      input.originPortalId,
      input.actor.type,
      input.actor.id,
      input.actor.name ?? null,
      input.actor.email ?? null,
      input.actor.domainRole ?? null,
      input.actor.permissionRole ?? null,
      input.actor.organization ?? null,
      input.now,
      input.now,
      input.now,
      input.projectId,
      input.workspaceId,
    ]),
    statement(input.database, `
      UPDATE project_change_request_counters AS counter
      SET next_request_number = next_request_number + 1, updated_at = ?
      WHERE project_id = ? AND workspace_id = ?
        AND EXISTS (
          SELECT 1 FROM project_change_requests AS request
          WHERE request.id = ? AND request.project_id = counter.project_id
            AND request.request_number = counter.next_request_number
        )
    `, [input.now, input.projectId, input.workspaceId, input.requestId]),
    statement(input.database, `
      INSERT INTO project_change_request_versions (${VERSION_INSERT_COLUMNS})
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      FROM project_change_requests
      WHERE id = ? AND workspace_id = ? AND project_id = ?
        AND status = 'initializing' AND current_version_id IS NULL
    `, [
      ...versionValues(input, input.requestId, 1, input.now, null),
      input.requestId,
      input.workspaceId,
      input.projectId,
    ]),
    ...relationshipStatements(input.database, input.versionId, input.targets, input.artifacts, input.now),
    statement(input.database, `
      INSERT INTO project_change_request_state_events (
        id, request_id, from_status, to_status, actor_type, actor_id, note,
        idempotency_key, occurred_at, metadata_json
      )
      SELECT ?, id, NULL, 'submitted', ?, ?, NULL, ?, ?, ?
      FROM project_change_requests
      WHERE id = ? AND workspace_id = ? AND project_id = ?
        AND status = 'initializing' AND current_version_id IS NULL
        AND EXISTS (
          SELECT 1 FROM project_change_request_versions
          WHERE id = ? AND request_id = project_change_requests.id
        )
    `, [
      input.eventId,
      input.actor.type,
      input.actor.id,
      input.idempotencyKey,
      input.now,
      input.eventMetadataJson,
      input.requestId,
      input.workspaceId,
      input.projectId,
      input.versionId,
    ]),
    statement(input.database, `
      UPDATE project_change_requests
      SET current_version_id = ?, status = 'submitted', updated_at = ?
      WHERE id = ? AND workspace_id = ? AND project_id = ?
        AND status = 'initializing' AND current_version_id IS NULL
        AND EXISTS (
          SELECT 1 FROM project_change_request_state_events
          WHERE id = ? AND request_id = project_change_requests.id
        )
    `, [
      input.versionId,
      input.now,
      input.requestId,
      input.workspaceId,
      input.projectId,
      input.eventId,
    ]),
  ];
  if (input.publicExposure) {
    statements.push(statement(input.database, `
      INSERT INTO client_portal_request_exposures (
        request_id, portal_id, public_request_id, status, exposure_kind,
        policy_snapshot_json, exposed_by_actor_type, exposed_by_actor_id, exposed_at
      ) VALUES (?, ?, ?, 'visible', ?, ?, ?, ?, ?)
    `, [
      input.requestId,
      input.publicExposure.portalId,
      input.publicExposure.publicRequestId,
      input.publicExposure.exposureKind,
      input.publicExposure.policySnapshotJson,
      input.actor.type,
      input.actor.id,
      input.now,
    ]));
  }
  statements.push(...(input.atomicStatements ?? []));
  return input.database.batch(statements);
}

export async function amendProjectChangeRequestRecords(input: AmendProjectChangeRequestRecordInput) {
  if (!input.database.batch) return null;
  const statusPlaceholders = input.allowedStatuses.map(() => "?").join(", ");
  const statements: D1PreparedStatementLike[] = [
    statement(input.database, `
      INSERT INTO project_change_request_versions (${VERSION_INSERT_COLUMNS})
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      FROM project_change_requests
      WHERE id = ? AND workspace_id = ? AND project_id = ?
        AND current_version_id = ? AND status IN (${statusPlaceholders})
    `, [
      ...versionValues(input, input.requestId, input.nextVersionNumber, input.now, input.supersedesVersionId),
      input.requestId,
      input.workspaceId,
      input.projectId,
      input.expectedCurrentVersionId,
      ...input.allowedStatuses,
    ]),
    ...relationshipStatements(input.database, input.versionId, input.targets, input.artifacts, input.now),
    statement(input.database, `
      UPDATE project_change_requests
      SET current_version_id = ?, updated_at = ?
      WHERE id = ? AND workspace_id = ? AND project_id = ?
        AND current_version_id = ? AND status IN (${statusPlaceholders})
        AND EXISTS (
          SELECT 1 FROM project_change_request_versions
          WHERE id = ? AND request_id = project_change_requests.id
        )
    `, [
      input.versionId,
      input.now,
      input.requestId,
      input.workspaceId,
      input.projectId,
      input.expectedCurrentVersionId,
      ...input.allowedStatuses,
      input.versionId,
    ]),
  ];
  statements.push(...(input.atomicStatements ?? []));
  return input.database.batch(statements);
}

function transitionUpdate(input: TransitionProjectChangeRequestRecordInput) {
  if (input.action === "acknowledge") {
    return {
      sql: "status = ?, acknowledged_by_user_id = ?, acknowledged_at = ?, updated_at = ?",
      values: [input.toStatus, input.actor.id, input.now, input.now] satisfies D1Value[],
    };
  }
  if (input.action === "assign_assessment") {
    return {
      sql: "status = ?, assessment_owner_user_id = ?, updated_at = ?",
      values: [input.toStatus, input.assessmentOwnerUserId, input.now] satisfies D1Value[],
    };
  }
  if (input.action === "withdraw") {
    return {
      sql: "status = ?, withdrawn_at = ?, updated_at = ?",
      values: [input.toStatus, input.now, input.now] satisfies D1Value[],
    };
  }
  if (input.action === "reject") {
    return {
      sql: "status = ?, updated_at = ?",
      values: [input.toStatus, input.now] satisfies D1Value[],
    };
  }
  return {
    sql: "updated_at = ?",
    values: [input.now] satisfies D1Value[],
  };
}

export async function transitionProjectChangeRequestRecords(input: TransitionProjectChangeRequestRecordInput) {
  if (!input.database.batch) return null;
  const update = transitionUpdate(input);
  const statements: D1PreparedStatementLike[] = [
    statement(input.database, `
      INSERT INTO project_change_request_state_events (
        id, request_id, from_status, to_status, actor_type, actor_id, note,
        idempotency_key, occurred_at, metadata_json
      )
      SELECT ?, id, ?, ?, ?, ?, ?, ?, ?, ?
      FROM project_change_requests
      WHERE id = ? AND workspace_id = ? AND project_id = ? AND status = ?
    `, [
      input.eventId,
      input.fromStatus,
      input.toStatus,
      input.actor.type,
      input.actor.id,
      input.note,
      input.idempotencyKey,
      input.now,
      input.metadataJson,
      input.requestId,
      input.workspaceId,
      input.projectId,
      input.fromStatus,
    ]),
    statement(input.database, `
      UPDATE project_change_requests
      SET ${update.sql}
      WHERE id = ? AND workspace_id = ? AND project_id = ? AND status = ?
        AND EXISTS (
          SELECT 1 FROM project_change_request_state_events
          WHERE id = ? AND request_id = project_change_requests.id
        )
    `, [
      ...update.values,
      input.requestId,
      input.workspaceId,
      input.projectId,
      input.fromStatus,
      input.eventId,
    ]),
  ];
  if (input.action === "withdraw") {
    statements.push(statement(input.database, `
      UPDATE client_portal_request_exposures
      SET status = 'withdrawn', withdrawn_at = ?, withdrawal_reason = ?
      WHERE request_id = ? AND status = 'visible'
    `, [input.now, input.note ?? "Request withdrawn", input.requestId]));
  }
  statements.push(...(input.atomicStatements ?? []));
  return input.database.batch(statements);
}

export function batchChanged(
  result: D1Result[] | null,
  expectedStatements: number,
  allowZeroChangesAt: readonly number[] = [],
) {
  const allowed = new Set(allowZeroChangesAt);
  return Boolean(
    result
    && result.length === expectedStatements
    && result.every((entry, index) => {
      if (entry.success === false) return false;
      const changes = Number(entry.meta?.changes);
      return changes === 1 || (allowed.has(index) && changes === 0);
    }),
  );
}
