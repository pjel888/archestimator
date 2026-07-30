import "server-only";

import { randomUUID } from "node:crypto";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Value } from "@/lib/cloudflare/d1";
import type { ClientPortalInternalActor } from "@/lib/client-portal/policy";

type ClientPortalBaselineStatus = "active" | "superseded" | "voided";

export type ClientPortalBaseline = {
  baselineNumber: number;
  contentHash: string;
  currencyCode: string;
  establishedAt: string;
  establishedByDecisionId: string;
  id: string;
  issueId: string;
  projectId: string;
  status: ClientPortalBaselineStatus;
  supersededAt: string | null;
  supersededByBaselineId: string | null;
  totalMinorUnits: number;
  voidReason: string | null;
  voidedAt: string | null;
  workspaceId: string;
};

type BaselineRow = {
  baseline_number: number;
  content_hash: string;
  currency_code: string;
  established_at: string;
  established_by_decision_id: string;
  id: string;
  issue_id: string;
  project_id: string;
  status: ClientPortalBaselineStatus;
  superseded_at: string | null;
  superseded_by_baseline_id: string | null;
  total_minor_units: number;
  void_reason: string | null;
  voided_at: string | null;
  workspace_id: string;
};

function statement(database: D1DatabaseLike, sql: string, values: D1Value[]): D1PreparedStatementLike {
  return database.prepare(sql).bind(...values);
}

function baseline(row: BaselineRow): ClientPortalBaseline {
  return {
    baselineNumber: Number(row.baseline_number),
    contentHash: row.content_hash,
    currencyCode: row.currency_code,
    establishedAt: row.established_at,
    establishedByDecisionId: row.established_by_decision_id,
    id: row.id,
    issueId: row.issue_id,
    projectId: row.project_id,
    status: row.status,
    supersededAt: row.superseded_at,
    supersededByBaselineId: row.superseded_by_baseline_id,
    totalMinorUnits: Number(row.total_minor_units),
    voidReason: row.void_reason,
    voidedAt: row.voided_at,
    workspaceId: row.workspace_id,
  };
}

const BASELINE_SELECT = `
  SELECT id, workspace_id, project_id, baseline_number, issue_id, status, content_hash,
         total_minor_units, currency_code, established_by_decision_id, established_at,
         superseded_by_baseline_id, superseded_at, voided_at, void_reason
  FROM client_portal_baselines
`;

export async function getActiveClientPortalBaseline(database: D1DatabaseLike, portalId: string) {
  const row = await database.prepare<BaselineRow>(`${BASELINE_SELECT} WHERE portal_id = ? AND status = 'active' LIMIT 1`).bind(portalId).first<BaselineRow>();
  return row ? baseline(row) : null;
}

export async function listClientPortalBaselineHistory(database: D1DatabaseLike, portalId: string) {
  const result = await database.prepare<BaselineRow>(`${BASELINE_SELECT} WHERE portal_id = ? ORDER BY baseline_number DESC, id DESC`).bind(portalId).all<BaselineRow>();
  return (result.results ?? []).map(baseline);
}

export function prepareClientPortalBaselineAcceptanceWrites(input: {
  database: D1DatabaseLike;
  decisionId: string;
  issueId: string;
  portalId: string;
  timestamp: string;
}) {
  const baselineId = `baseline_${randomUUID()}`;
  const requestResolutionKey = `issue:${input.issueId}:accepted`;
  return {
    baselineId,
    statements: [
      statement(input.database, `
        UPDATE client_portal_baselines
        SET status = 'superseded', superseded_by_baseline_id = ?, superseded_at = ?
        WHERE portal_id = ? AND status = 'active' AND issue_id <> ?
          AND EXISTS (
            SELECT 1 FROM client_portal_issues issue
            JOIN client_portal_decisions decision ON decision.id = ? AND decision.issue_id = issue.id
            WHERE issue.id = ? AND issue.portal_id = ? AND issue.status = 'accepted'
              AND decision.decision = 'approved' AND decision.voided_at IS NULL
          )
          AND NOT EXISTS (
            SELECT 1 FROM client_portal_baselines current
            WHERE current.issue_id = ? AND current.status <> 'voided'
          )
      `, [baselineId, input.timestamp, input.portalId, input.issueId, input.decisionId, input.issueId, input.portalId, input.issueId]),
      statement(input.database, `
        INSERT INTO client_portal_baselines (
          id, workspace_id, project_id, portal_id, baseline_number, issue_id, status, content_hash,
          total_minor_units, currency_code, established_by_decision_id, established_at, created_at
        )
        SELECT ?, portal.workspace_id, portal.project_id, portal.id,
               COALESCE((SELECT MAX(existing.baseline_number) FROM client_portal_baselines existing WHERE existing.portal_id = portal.id), 0) + 1,
               issue.id, 'active', issue.content_hash, SUM(source_estimate.total_minor_units), issue.currency_code, ?, ?, ?
        FROM client_portal_issues issue
        JOIN client_portals portal ON portal.id = issue.portal_id
        JOIN client_portal_issue_source_estimates source_estimate ON source_estimate.issue_id = issue.id
        JOIN client_portal_decisions decision ON decision.id = ? AND decision.issue_id = issue.id
        WHERE issue.id = ? AND issue.portal_id = ? AND issue.status = 'accepted'
          AND decision.decision = 'approved' AND decision.voided_at IS NULL
          AND decision.issue_content_hash = issue.content_hash
          AND NOT EXISTS (
            SELECT 1 FROM client_portal_baselines existing
            WHERE existing.issue_id = issue.id AND existing.status <> 'voided'
          )
        GROUP BY portal.workspace_id, portal.project_id, portal.id, issue.id, issue.content_hash, issue.currency_code
      `, [baselineId, input.decisionId, input.timestamp, input.timestamp, input.decisionId, input.issueId, input.portalId]),
      statement(input.database, `
        INSERT INTO project_change_request_state_events (
          id, request_id, from_status, to_status, actor_type, actor_id, note,
          idempotency_key, occurred_at, metadata_json
        )
        SELECT 'request-event_' || lower(hex(randomblob(16))), request.id, request.status, 'resolved',
               'system', 'client-portal-baseline', 'Resolved by accepted issue', ?, ?,
               json_object('issueId', ?, 'decisionId', ?)
        FROM project_change_requests request
        JOIN client_portal_issue_requests issue_request ON issue_request.request_id = request.id
        JOIN client_portal_issues issue ON issue.id = issue_request.issue_id
        WHERE issue.id = ? AND issue.portal_id = ? AND issue.status = 'accepted'
          AND issue_request.relationship IN ('origin', 'addresses')
          AND request.status = 'proposal_issued'
          AND NOT EXISTS (
            SELECT 1 FROM project_change_request_state_events existing
            WHERE existing.request_id = request.id AND existing.actor_type = 'system'
              AND existing.actor_id = 'client-portal-baseline' AND existing.idempotency_key = ?
          )
      `, [requestResolutionKey, input.timestamp, input.issueId, input.decisionId, input.issueId, input.portalId, requestResolutionKey]),
      statement(input.database, `
        UPDATE project_change_requests
        SET status = 'resolved', resolved_by_issue_id = ?, resolved_at = ?, updated_at = ?
        WHERE status = 'proposal_issued'
          AND EXISTS (
            SELECT 1 FROM client_portal_issue_requests issue_request
            JOIN project_change_request_state_events event ON event.request_id = project_change_requests.id
            WHERE issue_request.issue_id = ? AND issue_request.request_id = project_change_requests.id
              AND issue_request.relationship IN ('origin', 'addresses')
              AND event.actor_type = 'system' AND event.actor_id = 'client-portal-baseline'
              AND event.idempotency_key = ? AND event.to_status = 'resolved'
          )
      `, [input.issueId, input.timestamp, input.timestamp, input.issueId, requestResolutionKey]),
    ],
  };
}

type BaselineReconciliationIssueRow = {
  content_hash: string;
  currency_code: string;
  issue_id: string;
  issue_number: number;
  portal_id: string;
  project_id: string;
  version_label: string;
  workspace_id: string;
};

type BaselineReconciliationBaselineRow = {
  decision_id: string;
  id: string;
  status: ClientPortalBaselineStatus;
};

type BaselineReconciliationEvidenceRow = {
  audit_id: string | null;
  baseline_id: string;
  decision_id: string;
  event_id: string | null;
};

export type ClientPortalBaselineReconciliationErrorCode =
  | "client_portal_baseline_denied"
  | "client_portal_baseline_scope_invalid"
  | "client_portal_baseline_decision_missing"
  | "client_portal_baseline_conflict"
  | "client_portal_baseline_write_failed";

export class ClientPortalBaselineReconciliationError extends Error {
  readonly code: ClientPortalBaselineReconciliationErrorCode;

  constructor(code: ClientPortalBaselineReconciliationErrorCode, message: string) {
    super(message);
    this.name = "ClientPortalBaselineReconciliationError";
    this.code = code;
  }
}

async function reconciliationIssue(input: {
  actor: ClientPortalInternalActor;
  database: D1DatabaseLike;
  issueId: string;
  portalId: string;
}) {
  return input.database.prepare<BaselineReconciliationIssueRow>(`
    /* baseline-reconciliation:issue */
    SELECT issue.id AS issue_id, issue.content_hash, issue.currency_code, issue.issue_number,
           issue.version_label, portal.id AS portal_id, portal.workspace_id, portal.project_id
    FROM client_portals portal
    JOIN client_portal_issues issue ON issue.portal_id = portal.id
    WHERE portal.id = ? AND portal.workspace_id = ? AND portal.project_id = ?
      AND portal.current_issue_id = issue.id AND issue.id = ? AND issue.status = 'accepted'
    LIMIT 1
  `).bind(input.portalId, input.actor.workspaceId, input.actor.projectId, input.issueId).first<BaselineReconciliationIssueRow>();
}

async function reconciliationBaselines(database: D1DatabaseLike, portalId: string, issueId: string) {
  const result = await database.prepare<BaselineReconciliationBaselineRow>(`
    /* baseline-reconciliation:baseline */
    SELECT id, established_by_decision_id AS decision_id, status
    FROM client_portal_baselines
    WHERE portal_id = ? AND issue_id = ? AND status <> 'voided'
    ORDER BY baseline_number DESC, id DESC
    LIMIT 2
  `).bind(portalId, issueId).all<BaselineReconciliationBaselineRow>();
  return result.results ?? [];
}

async function reconciliationDecisionIds(database: D1DatabaseLike, issue: BaselineReconciliationIssueRow) {
  const result = await database.prepare<{ id: string }>(`
    /* baseline-reconciliation:decisions */
    SELECT decision.id
    FROM client_portal_decisions decision
    WHERE decision.portal_id = ? AND decision.issue_id = ?
      AND decision.decision = 'approved' AND decision.voided_at IS NULL
      AND decision.issue_content_hash = ?
    ORDER BY decision.submitted_at DESC, decision.id DESC
    LIMIT 1
  `).bind(issue.portal_id, issue.issue_id, issue.content_hash).all<{ id: string }>();
  return (result.results ?? []).map((row) => row.id);
}

function reconciliationEvidenceStatement(input: {
  auditId: string;
  database: D1DatabaseLike;
  issue: BaselineReconciliationIssueRow;
}) {
  return input.database.prepare<BaselineReconciliationEvidenceRow>(`
    /* baseline-reconciliation:evidence */
    SELECT baseline.id AS baseline_id, baseline.established_by_decision_id AS decision_id,
           event.id AS event_id, audit.id AS audit_id
    FROM client_portal_baselines baseline
    JOIN client_portal_issues issue ON issue.id = baseline.issue_id AND issue.portal_id = baseline.portal_id
    JOIN client_portals portal ON portal.id = issue.portal_id
    JOIN client_portal_decisions decision
      ON decision.id = baseline.established_by_decision_id
     AND decision.portal_id = portal.id AND decision.issue_id = issue.id
     AND decision.decision = 'approved' AND decision.voided_at IS NULL
     AND decision.issue_content_hash = issue.content_hash
    LEFT JOIN project_commitment_events event
      ON event.source_type = 'baseline' AND event.source_id = baseline.id
     AND event.event_type = 'baseline.established'
     AND event.correlation_id = 'baseline:' || baseline.established_by_decision_id || ':established'
    LEFT JOIN client_portal_audit_events audit ON audit.id = ?
    WHERE baseline.portal_id = ? AND baseline.issue_id = ? AND baseline.status = 'active'
      AND portal.workspace_id = ? AND portal.project_id = ?
      AND portal.current_issue_id = issue.id AND issue.status = 'accepted'
    LIMIT 1
  `).bind(input.auditId, input.issue.portal_id, input.issue.issue_id, input.issue.workspace_id, input.issue.project_id);
}

function reconciliationArtifactWrites(input: {
  actor: ClientPortalInternalActor;
  auditId: string;
  baselineId: string;
  database: D1DatabaseLike;
  decisionId: string;
  eventId: string;
  issue: BaselineReconciliationIssueRow;
  timestamp: string;
}) {
  const correlationId = `baseline:${input.decisionId}:established`;
  return [
    statement(input.database, `
      INSERT INTO project_commitment_events (
        id, workspace_id, project_id, origin_portal_id, event_type, source_type, source_id,
        baseline_id, correlation_id, actor_type, actor_id, title,
        client_safe_snapshot_json, internal_metadata_json, occurred_at, created_at
      )
      SELECT ?, portal.workspace_id, portal.project_id, portal.id, 'baseline.established',
             'baseline', baseline.id, baseline.id, ?, 'internal_user', ?,
             issue.version_label || ' became the active baseline',
             json_object('currencyCode', issue.currency_code, 'issueNumber', issue.issue_number, 'status', 'active', 'totalCost', baseline.total_minor_units),
             json_object('baselineId', baseline.id, 'decisionId', decision.id, 'issueId', issue.id, 'reconciled', 1),
             ?, ?
      FROM client_portal_baselines baseline
      JOIN client_portal_issues issue ON issue.id = baseline.issue_id AND issue.portal_id = baseline.portal_id
      JOIN client_portals portal ON portal.id = issue.portal_id
      JOIN client_portal_decisions decision
        ON decision.id = ? AND decision.id = baseline.established_by_decision_id
       AND decision.portal_id = portal.id AND decision.issue_id = issue.id
      WHERE baseline.id = ? AND baseline.portal_id = ? AND baseline.issue_id = ? AND baseline.status = 'active'
        AND portal.workspace_id = ? AND portal.project_id = ? AND portal.current_issue_id = issue.id
        AND issue.status = 'accepted' AND decision.decision = 'approved' AND decision.voided_at IS NULL
        AND decision.issue_content_hash = issue.content_hash
        AND NOT EXISTS (
          SELECT 1 FROM project_commitment_events existing
          WHERE existing.source_type = 'baseline' AND existing.source_id = baseline.id
            AND existing.event_type = 'baseline.established' AND existing.correlation_id = ?
        )
    `, [input.eventId, correlationId, input.actor.userId, input.timestamp, input.timestamp, input.decisionId, input.baselineId, input.issue.portal_id, input.issue.issue_id, input.issue.workspace_id, input.issue.project_id, correlationId]),
    statement(input.database, `
      INSERT INTO client_portal_audit_events (
        id, workspace_id, portal_id, issue_id, actor_type, actor_id, event_type,
        visibility, metadata_json, occurred_at, created_at
      )
      SELECT ?, portal.workspace_id, portal.id, issue.id, 'internal_user', ?,
             'baseline_reconciled', 'owner',
             json_object('baselineId', baseline.id, 'commitmentEventId', event.id, 'decisionId', decision.id),
             ?, ?
      FROM client_portal_baselines baseline
      JOIN client_portal_issues issue ON issue.id = baseline.issue_id AND issue.portal_id = baseline.portal_id
      JOIN client_portals portal ON portal.id = issue.portal_id
      JOIN client_portal_decisions decision
        ON decision.id = ? AND decision.id = baseline.established_by_decision_id
       AND decision.portal_id = portal.id AND decision.issue_id = issue.id
      JOIN project_commitment_events event
        ON event.source_type = 'baseline' AND event.source_id = baseline.id
       AND event.event_type = 'baseline.established' AND event.correlation_id = ?
      WHERE baseline.id = ? AND baseline.portal_id = ? AND baseline.issue_id = ? AND baseline.status = 'active'
        AND portal.workspace_id = ? AND portal.project_id = ? AND portal.current_issue_id = issue.id
        AND issue.status = 'accepted' AND decision.decision = 'approved' AND decision.voided_at IS NULL
        AND decision.issue_content_hash = issue.content_hash
        AND NOT EXISTS (SELECT 1 FROM client_portal_audit_events existing WHERE existing.id = ?)
    `, [input.auditId, input.actor.userId, input.timestamp, input.timestamp, input.decisionId, correlationId, input.baselineId, input.issue.portal_id, input.issue.issue_id, input.issue.workspace_id, input.issue.project_id, input.auditId]),
  ];
}

export async function reconcileAcceptedClientPortalBaseline(input: {
  actor: ClientPortalInternalActor;
  database: D1DatabaseLike;
  issueId: string;
  portalId: string;
}) {
  const authorized = input.actor.projectRole === "owner"
    || input.actor.projectRole === "admin"
    || input.actor.portalGrants.includes("manager");
  if (!authorized) {
    throw new ClientPortalBaselineReconciliationError("client_portal_baseline_denied", "Only a project publication manager can restore an accepted baseline.");
  }
  if (!input.database.batch) {
    throw new ClientPortalBaselineReconciliationError("client_portal_baseline_write_failed", "Accepted baseline reconciliation requires D1 batch support.");
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const issue = await reconciliationIssue(input);
    if (!issue) {
      throw new ClientPortalBaselineReconciliationError("client_portal_baseline_scope_invalid", "The selected issue is not the current accepted issue for this project portal.");
    }
    const baselines = await reconciliationBaselines(input.database, input.portalId, input.issueId);
    if (baselines.length > 1 || (baselines[0] && baselines[0].status !== "active")) {
      throw new ClientPortalBaselineReconciliationError("client_portal_baseline_conflict", "Accepted baseline state is conflicting and cannot be reconciled automatically.");
    }

    const existingBaseline = baselines[0] ?? null;
    let decisionId = existingBaseline?.decision_id ?? null;
    if (!decisionId) {
      const decisionIds = await reconciliationDecisionIds(input.database, issue);
      if (decisionIds.length === 0) {
        throw new ClientPortalBaselineReconciliationError("client_portal_baseline_decision_missing", "The accepted issue has no approved decision evidence.");
      }
      decisionId = decisionIds[0]!;
    }

    const timestamp = new Date().toISOString();
    const acceptance = existingBaseline ? null : prepareClientPortalBaselineAcceptanceWrites({
      database: input.database,
      decisionId,
      issueId: issue.issue_id,
      portalId: issue.portal_id,
      timestamp,
    });
    const baselineId = existingBaseline?.id ?? acceptance!.baselineId;
    const eventId = `commitment_${baselineId}`;
    const auditId = `baseline-reconciliation_${baselineId}`;
    const writes = [
      ...(acceptance?.statements ?? []),
      ...reconciliationArtifactWrites({
        actor: input.actor,
        auditId,
        baselineId,
        database: input.database,
        decisionId,
        eventId,
        issue,
        timestamp,
      }),
    ];

    try {
      const results = await input.database.batch(writes);
      if (results.length !== writes.length || results.some((entry) => entry.success === false)) {
        throw new ClientPortalBaselineReconciliationError("client_portal_baseline_write_failed", "Accepted baseline reconciliation did not commit atomically.");
      }
    } catch (error) {
      if (attempt === 0) continue;
      if (error instanceof ClientPortalBaselineReconciliationError) throw error;
      throw new ClientPortalBaselineReconciliationError("client_portal_baseline_write_failed", "Accepted baseline reconciliation failed.");
    }

    const evidence = await reconciliationEvidenceStatement({ auditId, database: input.database, issue }).first<BaselineReconciliationEvidenceRow>();
    if (evidence?.event_id && evidence.audit_id) {
      return {
        auditId: evidence.audit_id,
        baselineCreated: existingBaseline === null,
        baselineId: evidence.baseline_id,
        decisionId: evidence.decision_id,
        eventId: evidence.event_id,
      };
    }
    if (attempt === 1) break;
  }

  throw new ClientPortalBaselineReconciliationError("client_portal_baseline_write_failed", "Accepted baseline reconciliation evidence is incomplete.");
}
