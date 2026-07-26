import "server-only";

import { randomUUID } from "node:crypto";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Value } from "@/lib/cloudflare/d1";

export type ClientPortalBaselineStatus = "active" | "superseded" | "voided";

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
