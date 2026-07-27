import "server-only";

import {
  getCloudflareD1Database,
  type D1DatabaseLike,
  type D1Value,
} from "@/lib/cloudflare/d1";

export const COMMITMENT_CENTER_PORTAL_LIMIT = 100;
export const COMMITMENT_CENTER_DETAIL_LIMIT = 200;

export type CommitmentCenterView =
  | "action_required"
  | "portals"
  | "requests"
  | "decisions"
  | "access_delivery";

export type CommitmentCenterNextAction = {
  href: string;
  kind: "timeline" | "portal_control" | "compose";
  label: string;
  priority: "urgent" | "attention" | "monitor";
};

export type CommitmentCenterPortalRow = {
  access: {
    passwordRequired: boolean;
    portalStatus: string;
  };
  activeBaseline: {
    baselineNumber: number;
    currencyCode: string;
    establishedAt: string;
    totalMinorUnits: number;
    versionLabel: string;
  } | null;
  audience: string;
  canManagePortal: boolean;
  currentDecisions: {
    approved: number;
    changesRequested: number;
    declined: number;
    total: number;
  };
  delivery: {
    dead: number;
    delivered: number;
    latestState: string | null;
    pending: number;
  };
  latestEvent: {
    eventType: string;
    occurredAt: string;
    title: string;
  } | null;
  nextAction: CommitmentCenterNextAction;
  openRequests: number;
  pendingIssue: {
    issueNumber: number;
    issuedAt: string;
    status: string;
    versionLabel: string;
  } | null;
  portal: {
    id: string;
    isPrimary: boolean;
    name: string;
    purpose: string | null;
    status: string;
  };
  project: {
    code: string | null;
    id: string;
    name: string;
  };
  recipients: {
    active: number;
    invited: number;
    requiredApprovers: number;
    total: number;
    unverified: number;
  };
  waitingDiscussions: number;
};

export type CommitmentCenterRequestRow = {
  id: string;
  portalId: string | null;
  portalName: string | null;
  projectId: string;
  projectName: string;
  requestCode: string;
  requestedAt: string;
  status: string;
  title: string;
};

export type CommitmentCenterDecisionRow = {
  decision: string;
  id: string;
  issueNumber: number;
  portalId: string;
  portalName: string;
  projectId: string;
  projectName: string;
  signerName: string | null;
  submittedAt: string;
  versionLabel: string;
};

export type WorkspaceCommitmentCenter = {
  decisions: CommitmentCenterDecisionRow[];
  generatedAt: string;
  portals: CommitmentCenterPortalRow[];
  requests: CommitmentCenterRequestRow[];
  summary: {
    actionRequired: number;
    activeBaselines: number;
    openRequests: number;
    portals: number;
    waitingDiscussions: number;
  };
  truncated: boolean;
};

type PortalProjectionRow = {
  active_recipient_count: number | null;
  audience_kind: string;
  baseline_currency_code: string | null;
  baseline_established_at: string | null;
  baseline_number: number | null;
  baseline_total_minor_units: number | null;
  baseline_version_label: string | null;
  can_manage_portal: number | null;
  decision_approved_count: number | null;
  decision_changes_requested_count: number | null;
  decision_count: number | null;
  decision_declined_count: number | null;
  delivery_dead_count: number | null;
  delivery_delivered_count: number | null;
  delivery_pending_count: number | null;
  invited_recipient_count: number | null;
  issue_issued_at: string | null;
  issue_number: number | null;
  issue_status: string | null;
  issue_version_label: string | null;
  is_primary: number | null;
  latest_delivery_state: string | null;
  latest_event_occurred_at: string | null;
  latest_event_title: string | null;
  latest_event_type: string | null;
  open_request_count: number | null;
  password_required: number | null;
  portal_id: string;
  portal_name: string;
  portal_purpose: string | null;
  portal_status: string;
  project_code: string | null;
  project_id: string;
  project_name: string;
  required_approval_count: number | null;
  required_approver_count: number | null;
  total_recipient_count: number | null;
  unverified_recipient_count: number | null;
  waiting_discussion_count: number | null;
};

type RequestProjectionRow = {
  id: string;
  origin_portal_id: string | null;
  portal_name: string | null;
  project_id: string;
  project_name: string;
  request_code: string;
  requested_at: string;
  status: string;
  title: string;
};

type DecisionProjectionRow = {
  decision: string;
  id: string;
  issue_number: number;
  portal_id: string;
  portal_name: string;
  project_id: string;
  project_name: string;
  signer_name: string | null;
  submitted_at: string;
  version_label: string;
};

async function all<T>(database: D1DatabaseLike, sql: string, values: D1Value[]) {
  const result = await database.prepare<T>(sql).bind(...values).all<T>();
  return result.results ?? [];
}

function placeholders(values: readonly unknown[]) {
  return values.map(() => "?").join(", ");
}

function count(value: number | null | undefined) {
  return Number(value ?? 0);
}

function projectRoot(projectId: string) {
  return `/workshop/projects/${encodeURIComponent(projectId)}`;
}

function nextAction(row: PortalProjectionRow): CommitmentCenterNextAction {
  const root = projectRoot(row.project_id);
  const control = `${root}/client-portals/${encodeURIComponent(row.portal_id)}`;
  const waitingDiscussions = count(row.waiting_discussion_count);
  const openRequests = count(row.open_request_count);
  const deliveryFailures = count(row.delivery_dead_count);
  const unverifiedRecipients = count(row.unverified_recipient_count);
  const requiredApprovals = count(row.required_approval_count);
  const approvedDecisions = count(row.decision_approved_count);

  if (waitingDiscussions > 0) {
    return {
      href: `${control}?tab=discussions`,
      kind: "portal_control",
      label: `Respond to ${waitingDiscussions} discussion${waitingDiscussions === 1 ? "" : "s"}`,
      priority: "urgent",
    };
  }
  if (deliveryFailures > 0) {
    return {
      href: `${control}?tab=people`,
      kind: "portal_control",
      label: `Resolve ${deliveryFailures} delivery failure${deliveryFailures === 1 ? "" : "s"}`,
      priority: "urgent",
    };
  }
  if (openRequests > 0) {
    return {
      href: `${root}/timeline?portal=${encodeURIComponent(row.portal_id)}&source=change_request`,
      kind: "timeline",
      label: `Assess ${openRequests} open request${openRequests === 1 ? "" : "s"}`,
      priority: "attention",
    };
  }
  if (unverifiedRecipients > 0) {
    return {
      href: `${control}?tab=people`,
      kind: "portal_control",
      label: `Review ${unverifiedRecipients} unverified recipient${unverifiedRecipients === 1 ? "" : "s"}`,
      priority: "attention",
    };
  }
  if (row.issue_number && row.issue_status === "accepted" && row.baseline_number === null) {
    return {
      href: `${root}/timeline?portal=${encodeURIComponent(row.portal_id)}`,
      kind: "timeline",
      label: "Restore the accepted baseline",
      priority: "urgent",
    };
  }
  if (row.issue_number && (row.issue_status === "issued" || row.issue_status === "under_review") && approvedDecisions < requiredApprovals) {
    const pendingApprovals = requiredApprovals - approvedDecisions;
    return {
      href: `${control}?tab=decisions`,
      kind: "portal_control",
      label: `Await ${pendingApprovals} required approval${pendingApprovals === 1 ? "" : "s"}`,
      priority: "attention",
    };
  }
  if (!row.issue_number || row.portal_status === "draft" || row.portal_status === "ready") {
    return {
      href: `${root}/client-portals/compose?portal=${encodeURIComponent(row.portal_id)}`,
      kind: "compose",
      label: "Compose the next issue",
      priority: "attention",
    };
  }
  if (row.issue_status === "changes_requested" || row.issue_status === "declined") {
    return {
      href: `${root}/client-portals/compose?portal=${encodeURIComponent(row.portal_id)}`,
      kind: "compose",
      label: "Prepare a revised issue",
      priority: "attention",
    };
  }
  return {
    href: `${root}/timeline?portal=${encodeURIComponent(row.portal_id)}`,
    kind: "timeline",
    label: "Monitor commitment timeline",
    priority: "monitor",
  };
}

function mapPortal(row: PortalProjectionRow): CommitmentCenterPortalRow {
  const pendingIssue = row.issue_number !== null
    && row.issue_status !== null
    && ["issued", "under_review", "changes_requested"].includes(row.issue_status)
    ? {
        issueNumber: Number(row.issue_number),
        issuedAt: row.issue_issued_at ?? "",
        status: row.issue_status,
        versionLabel: row.issue_version_label ?? `Issue ${row.issue_number}`,
      }
    : null;

  return {
    access: {
      passwordRequired: Boolean(row.password_required),
      portalStatus: row.portal_status,
    },
    activeBaseline: row.baseline_number === null ? null : {
      baselineNumber: Number(row.baseline_number),
      currencyCode: row.baseline_currency_code ?? "USD",
      establishedAt: row.baseline_established_at ?? "",
      totalMinorUnits: Number(row.baseline_total_minor_units ?? 0),
      versionLabel: row.baseline_version_label ?? `Baseline ${row.baseline_number}`,
    },
    audience: row.audience_kind,
    canManagePortal: Boolean(row.can_manage_portal),
    currentDecisions: {
      approved: count(row.decision_approved_count),
      changesRequested: count(row.decision_changes_requested_count),
      declined: count(row.decision_declined_count),
      total: count(row.decision_count),
    },
    delivery: {
      dead: count(row.delivery_dead_count),
      delivered: count(row.delivery_delivered_count),
      latestState: row.latest_delivery_state,
      pending: count(row.delivery_pending_count),
    },
    latestEvent: row.latest_event_type && row.latest_event_occurred_at && row.latest_event_title
      ? {
          eventType: row.latest_event_type,
          occurredAt: row.latest_event_occurred_at,
          title: row.latest_event_title,
        }
      : null,
    nextAction: nextAction(row),
    openRequests: count(row.open_request_count),
    pendingIssue,
    portal: {
      id: row.portal_id,
      isPrimary: Boolean(row.is_primary),
      name: row.portal_name,
      purpose: row.portal_purpose,
      status: row.portal_status,
    },
    project: {
      code: row.project_code,
      id: row.project_id,
      name: row.project_name,
    },
    recipients: {
      active: count(row.active_recipient_count),
      invited: count(row.invited_recipient_count),
      requiredApprovers: count(row.required_approver_count),
      total: count(row.total_recipient_count),
      unverified: count(row.unverified_recipient_count),
    },
    waitingDiscussions: count(row.waiting_discussion_count),
  };
}

export async function readWorkspaceCommitmentCenter(input: {
  database?: D1DatabaseLike;
  limit?: number;
  userId: string;
  workspaceId: string;
}): Promise<WorkspaceCommitmentCenter> {
  const database = input.database ?? await getCloudflareD1Database();
  if (!database) throw new Error("Commitment Center is unavailable.");
  const limit = Math.max(1, Math.min(COMMITMENT_CENTER_PORTAL_LIMIT, Math.trunc(input.limit ?? COMMITMENT_CENTER_PORTAL_LIMIT)));

  const portalRows = await all<PortalProjectionRow>(database, `
    /* commitment-center:portals */
    SELECT
      project.id AS project_id,
      project.name AS project_name,
      project.project_code AS project_code,
      portal.id AS portal_id,
      portal.name AS portal_name,
      portal.purpose AS portal_purpose,
      portal.status AS portal_status,
      portal.audience_kind,
      portal.is_primary,
      CASE WHEN portal.password_hash IS NULL THEN 0 ELSE 1 END AS password_required,
      CASE WHEN workspace_member.role IN ('owner', 'admin') OR project_member.role IN ('owner', 'admin') THEN 1 ELSE 0 END AS can_manage_portal,
      baseline.baseline_number,
      baseline.total_minor_units AS baseline_total_minor_units,
      baseline.currency_code AS baseline_currency_code,
      baseline.established_at AS baseline_established_at,
      baseline_issue.version_label AS baseline_version_label,
      current_issue.issue_number,
      current_issue.version_label AS issue_version_label,
      current_issue.status AS issue_status,
      current_issue.issued_at AS issue_issued_at,
      COALESCE(CAST(json_extract(current_issue.decision_policy_snapshot_json, '$.requiredApprovals') AS INTEGER), 0) AS required_approval_count,
      latest_event.event_type AS latest_event_type,
      latest_event.title AS latest_event_title,
      latest_event.occurred_at AS latest_event_occurred_at,
      (SELECT count(*) FROM project_change_requests request
       WHERE request.origin_portal_id = portal.id
         AND request.status IN ('submitted', 'acknowledged', 'under_assessment', 'proposal_issued')) AS open_request_count,
      (SELECT count(*) FROM client_portal_threads thread
       WHERE thread.portal_id = portal.id
         AND thread.status IN ('open', 'requires_revalidation')
         AND thread.waiting_state = 'waiting_on_owner') AS waiting_discussion_count,
      (SELECT count(*) FROM client_portal_decisions decision
       WHERE decision.portal_id = portal.id
         AND decision.issue_id = portal.current_issue_id
         AND decision.voided_at IS NULL) AS decision_count,
      (SELECT count(*) FROM client_portal_decisions decision
       WHERE decision.portal_id = portal.id
         AND decision.issue_id = portal.current_issue_id
         AND decision.decision = 'approved'
         AND decision.voided_at IS NULL) AS decision_approved_count,
      (SELECT count(*) FROM client_portal_decisions decision
       WHERE decision.portal_id = portal.id
         AND decision.issue_id = portal.current_issue_id
         AND decision.decision = 'changes_requested'
         AND decision.voided_at IS NULL) AS decision_changes_requested_count,
      (SELECT count(*) FROM client_portal_decisions decision
       WHERE decision.portal_id = portal.id
         AND decision.issue_id = portal.current_issue_id
         AND decision.decision = 'declined'
         AND decision.voided_at IS NULL) AS decision_declined_count,
      (SELECT count(*) FROM client_portal_recipients recipient
       WHERE recipient.portal_id = portal.id AND recipient.status <> 'revoked') AS total_recipient_count,
      (SELECT count(*) FROM client_portal_recipients recipient
       WHERE recipient.portal_id = portal.id AND recipient.status = 'active') AS active_recipient_count,
      (SELECT count(*) FROM client_portal_recipients recipient
       WHERE recipient.portal_id = portal.id AND recipient.status = 'invited') AS invited_recipient_count,
      (SELECT count(*) FROM client_portal_recipients recipient
       WHERE recipient.portal_id = portal.id AND recipient.status <> 'revoked'
         AND recipient.verification_state <> 'verified') AS unverified_recipient_count,
      (SELECT count(*) FROM client_portal_recipients recipient
       WHERE recipient.portal_id = portal.id AND recipient.status <> 'revoked'
         AND recipient.is_required_approver = 1) AS required_approver_count,
      (SELECT count(*) FROM client_portal_notification_outbox delivery
       WHERE delivery.portal_id = portal.id AND delivery.state IN ('pending', 'processing')) AS delivery_pending_count,
      (SELECT count(*) FROM client_portal_notification_outbox delivery
       WHERE delivery.portal_id = portal.id AND delivery.state = 'delivered') AS delivery_delivered_count,
      (SELECT count(*) FROM client_portal_notification_outbox delivery
       WHERE delivery.portal_id = portal.id AND delivery.state = 'dead') AS delivery_dead_count,
      (SELECT delivery.state FROM client_portal_notification_outbox delivery
       WHERE delivery.portal_id = portal.id
       ORDER BY delivery.created_at DESC, delivery.id DESC LIMIT 1) AS latest_delivery_state
    FROM client_portals portal
    JOIN projects project
      ON project.id = portal.project_id AND project.workspace_id = portal.workspace_id
    LEFT JOIN project_members project_member
      ON project_member.project_id = project.id
     AND project_member.workspace_id = project.workspace_id
     AND project_member.user_id = ?
    LEFT JOIN workspace_members workspace_member
      ON workspace_member.workspace_id = project.workspace_id
     AND workspace_member.user_id = ?
    LEFT JOIN client_portal_baselines baseline
      ON baseline.portal_id = portal.id AND baseline.status = 'active'
    LEFT JOIN client_portal_issues baseline_issue ON baseline_issue.id = baseline.issue_id
    LEFT JOIN client_portal_issues current_issue ON current_issue.id = portal.current_issue_id
    LEFT JOIN project_commitment_events latest_event
      ON latest_event.id = (
        SELECT event.id
        FROM project_commitment_events event
        WHERE event.origin_portal_id = portal.id
        ORDER BY event.occurred_at DESC, event.id DESC
        LIMIT 1
      )
    WHERE portal.workspace_id = ?
      AND portal.status <> 'archived'
      AND (
        project.created_by = ?
        OR project_member.role IN ('owner', 'admin', 'editor')
        OR workspace_member.role IN ('owner', 'admin')
      )
    ORDER BY
      CASE WHEN waiting_discussion_count > 0 OR delivery_dead_count > 0
                  OR (issue_status = 'accepted' AND baseline_number IS NULL) THEN 0
           WHEN open_request_count > 0 OR unverified_recipient_count > 0
                  OR (issue_status IN ('issued', 'under_review') AND decision_approved_count < required_approval_count) THEN 1
           ELSE 2 END,
      latest_event_occurred_at DESC,
      project.name COLLATE NOCASE ASC,
      portal.is_primary DESC,
      portal.name COLLATE NOCASE ASC,
      portal.id ASC
    LIMIT ?
  `, [input.userId, input.userId, input.workspaceId, input.userId, limit + 1]);

  const limitedRows = portalRows.slice(0, limit);
  const portalIds = limitedRows.map((row) => row.portal_id);
  const portalScope = placeholders(portalIds);
  const [requestRows, decisionRows] = portalIds.length === 0
    ? [[], []] as [RequestProjectionRow[], DecisionProjectionRow[]]
    : await Promise.all([
        all<RequestProjectionRow>(database, `
          /* commitment-center:requests */
          SELECT request.id, request.project_id, request.origin_portal_id,
                 request.request_code, request.status, request.requested_at,
                 version.title, project.name AS project_name, portal.name AS portal_name
          FROM project_change_requests request
          JOIN project_change_request_versions version ON version.id = request.current_version_id
          JOIN projects project ON project.id = request.project_id AND project.workspace_id = request.workspace_id
          LEFT JOIN client_portals portal ON portal.id = request.origin_portal_id
          WHERE request.origin_portal_id IN (${portalScope})
            AND request.status IN ('submitted', 'acknowledged', 'under_assessment', 'proposal_issued')
          ORDER BY request.updated_at DESC, request.id DESC
          LIMIT ?
        `, [...portalIds, COMMITMENT_CENTER_DETAIL_LIMIT]),
        all<DecisionProjectionRow>(database, `
          /* commitment-center:decisions */
          SELECT decision.id, decision.decision, decision.signer_name, decision.submitted_at,
                 issue.issue_number, issue.version_label,
                 portal.id AS portal_id, portal.name AS portal_name,
                 project.id AS project_id, project.name AS project_name
          FROM client_portal_decisions decision
          JOIN client_portals portal ON portal.id = decision.portal_id
          JOIN projects project ON project.id = portal.project_id AND project.workspace_id = portal.workspace_id
          JOIN client_portal_issues issue ON issue.id = decision.issue_id AND issue.portal_id = portal.id
          WHERE decision.portal_id IN (${portalScope})
            AND decision.issue_id = portal.current_issue_id
            AND decision.voided_at IS NULL
          ORDER BY decision.submitted_at DESC, decision.id DESC
          LIMIT ?
        `, [...portalIds, COMMITMENT_CENTER_DETAIL_LIMIT]),
      ]);

  const portals = limitedRows.map(mapPortal);
  return {
    decisions: decisionRows.map((row) => ({
      decision: row.decision,
      id: row.id,
      issueNumber: Number(row.issue_number),
      portalId: row.portal_id,
      portalName: row.portal_name,
      projectId: row.project_id,
      projectName: row.project_name,
      signerName: row.signer_name,
      submittedAt: row.submitted_at,
      versionLabel: row.version_label,
    })),
    generatedAt: new Date().toISOString(),
    portals,
    requests: requestRows.map((row) => ({
      id: row.id,
      portalId: row.origin_portal_id,
      portalName: row.portal_name,
      projectId: row.project_id,
      projectName: row.project_name,
      requestCode: row.request_code,
      requestedAt: row.requested_at,
      status: row.status,
      title: row.title,
    })),
    summary: {
      actionRequired: portals.filter((portal) => portal.nextAction.priority !== "monitor").length,
      activeBaselines: portals.filter((portal) => portal.activeBaseline !== null).length,
      openRequests: portals.reduce((total, portal) => total + portal.openRequests, 0),
      portals: portals.length,
      waitingDiscussions: portals.reduce((total, portal) => total + portal.waitingDiscussions, 0),
    },
    truncated: portalRows.length > limit,
  };
}
