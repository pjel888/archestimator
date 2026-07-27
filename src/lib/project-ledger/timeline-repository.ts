import "server-only";

import type { D1DatabaseLike, D1Value } from "@/lib/cloudflare/d1";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import {
  PROJECT_COMMITMENT_EVENT_SOURCE_TYPES,
  type ProjectCommitmentEventSourceType,
} from "@/lib/project-ledger/contracts";

type PortalRow = {
  audience_kind: string;
  current_issue_id: string | null;
  id: string;
  is_primary: number;
  name: string;
  status: string;
};

type EventRow = {
  actor_domain_role_snapshot: string | null;
  actor_name_snapshot: string | null;
  actor_permission_role_snapshot: string | null;
  actor_type: "internal_user" | "recipient" | "system";
  event_type: string;
  exposure_count: number;
  exposure_statuses: string | null;
  id: string;
  internal_metadata_json: string;
  occurred_at: string;
  origin_portal_id: string | null;
  origin_portal_name: string | null;
  root_request_code: string | null;
  root_request_id: string | null;
  root_request_title: string | null;
  source_id: string;
  source_type: ProjectCommitmentEventSourceType;
  source_version_id: string | null;
  summary: string | null;
  title: string;
};

type BaselineRow = {
  approved_approvals: number;
  approver_names: string | null;
  baseline_number: number;
  currency_code: string;
  established_at: string;
  issue_number: number;
  required_approvals: number;
  total_minor_units: number;
  version_label: string;
};

type IssueRow = {
  currency_code: string;
  issue_number: number;
  issued_at: string;
  status: string;
  total_cost: number;
  unresolved_item_count: number;
  version_label: string;
};

type LatestEventRow = Pick<EventRow, "event_type" | "occurred_at" | "title">;

export type ProjectTimelineFilters = {
  portalId?: string | null;
  sourceTypes?: readonly ProjectCommitmentEventSourceType[];
};

export type ProjectTimelinePage = {
  context: {
    activeBaseline: {
      approvals: {
        approved: number;
        names: string[];
        required: number;
      };
      baselineNumber: number;
      currencyCode: string;
      establishedAt: string;
      issueNumber: number;
      totalMinorUnits: number;
      versionLabel: string;
    } | null;
    counts: {
      activeFiles: number;
      openRequests: number;
      totalEvents: number;
      waitingDiscussions: number;
    };
    currentPortal: {
      id: string;
      isPrimary: boolean;
      name: string;
    } | null;
    currentIssue: {
      currencyCode: string;
      issueNumber: number;
      issuedAt: string;
      status: string;
      total: number;
      unresolvedItems: number;
      versionLabel: string;
    } | null;
    latestOfficialEvent: {
      eventType: string;
      occurredAt: string;
      title: string;
    } | null;
    portals: Array<{
      audienceKind: string;
      id: string;
      isPrimary: boolean;
      name: string;
      status: string;
    }>;
    selectedPortalId: string | null;
  };
  events: Array<{
    actor: {
      domainRole: string | null;
      name: string | null;
      permissionRole: string | null;
      type: EventRow["actor_type"];
    };
    eventType: string;
    exposure: { count: number; statuses: string[] };
    href: string;
    id: string;
    metadata: Record<string, unknown>;
    occurredAt: string;
    portal: { id: string; name: string } | null;
    rootRequest: { code: string; id: string; title: string | null } | null;
    source: { id: string; type: ProjectCommitmentEventSourceType; versionId: string | null };
    summary: string | null;
    title: string;
  }>;
  hasMore: boolean;
  nextCursor: string | null;
};

function record(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function decodeCursor(value: string | null | undefined) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as {
      id?: unknown;
      occurredAt?: unknown;
    };
    return typeof parsed.id === "string" && typeof parsed.occurredAt === "string"
      ? { id: parsed.id, occurredAt: parsed.occurredAt }
      : null;
  } catch {
    return null;
  }
}

function encodeCursor(row: EventRow | undefined) {
  return row
    ? Buffer.from(JSON.stringify({ id: row.id, occurredAt: row.occurred_at })).toString("base64url")
    : null;
}

async function all<T>(database: D1DatabaseLike, sql: string, values: D1Value[]) {
  const result = await database.prepare<T>(sql).bind(...values).all<T>();
  return result.results ?? [];
}

async function first<T>(database: D1DatabaseLike, sql: string, values: D1Value[]) {
  return database.prepare<T>(sql).bind(...values).first<T>();
}

function eventHref(projectId: string, row: EventRow) {
  const root = `/workshop/projects/${encodeURIComponent(projectId)}`;
  if (row.source_type === "artifact") return `${root}/artifacts?artifactId=${encodeURIComponent(row.source_id)}`;
  if (row.source_type === "change_request") return `${root}/timeline?focus=${encodeURIComponent(row.root_request_code ?? row.source_id)}`;
  if (row.source_type === "legacy_publication") return `${root}/activity`;
  if (row.origin_portal_id) return `${root}/client-portals?portal=${encodeURIComponent(row.origin_portal_id)}`;
  return `${root}/timeline?event=${encodeURIComponent(row.id)}`;
}

export async function readProjectTimelinePage(input: {
  cursor?: string | null;
  database?: D1DatabaseLike;
  filters?: ProjectTimelineFilters;
  limit?: number;
  projectId: string;
}): Promise<ProjectTimelinePage> {
  const database = input.database ?? await getCloudflareD1Database();
  if (!database) throw new Error("Project timeline is unavailable.");
  const portals = await all<PortalRow>(database, `
    SELECT id, name, status, audience_kind, is_primary, current_issue_id
    FROM client_portals
    WHERE project_id = ? AND status <> 'archived'
    ORDER BY is_primary DESC, name COLLATE NOCASE ASC, id ASC
  `, [input.projectId]);
  const requestedPortalId = input.filters?.portalId?.trim() || null;
  const selectedPortal = requestedPortalId
    ? portals.find((portal) => portal.id === requestedPortalId) ?? null
    : null;
  const currentStatePortal = selectedPortal
    ?? portals.find((portal) => Boolean(portal.is_primary))
    ?? portals[0]
    ?? null;
  const sourceTypes = (input.filters?.sourceTypes ?? []).filter((sourceType) =>
    PROJECT_COMMITMENT_EVENT_SOURCE_TYPES.includes(sourceType),
  );
  const parsedCursor = decodeCursor(input.cursor);
  if (input.cursor && !parsedCursor) throw new Error("Project timeline cursor is invalid.");
  const limit = Math.max(1, Math.min(50, Math.trunc(input.limit ?? 20)));
  const where = ["event.project_id = ?"];
  const values: D1Value[] = [input.projectId];
  if (selectedPortal) {
    where.push("event.origin_portal_id = ?");
    values.push(selectedPortal.id);
  }
  if (sourceTypes.length > 0) {
    where.push(`event.source_type IN (${sourceTypes.map(() => "?").join(", ")})`);
    values.push(...sourceTypes);
  }
  if (parsedCursor) {
    where.push("(event.occurred_at < ? OR (event.occurred_at = ? AND event.id < ?))");
    values.push(parsedCursor.occurredAt, parsedCursor.occurredAt, parsedCursor.id);
  }

  const eventScope = selectedPortal ? "AND origin_portal_id = ?" : "";
  const eventScopeValues: D1Value[] = selectedPortal ? [selectedPortal.id] : [];
  const currentStateScopeValues: D1Value[] = currentStatePortal ? [currentStatePortal.id] : [];
  const [rows, baseline, currentIssue, latestOfficialEvent, counts] = await Promise.all([
    all<EventRow>(database, `
      SELECT event.id, event.event_type, event.source_type, event.source_id, event.source_version_id,
             event.origin_portal_id, portal.name AS origin_portal_name,
             event.root_request_id, root_request.request_code AS root_request_code,
             root_version.title AS root_request_title,
             event.actor_type, event.actor_name_snapshot, event.actor_domain_role_snapshot,
             event.actor_permission_role_snapshot, event.title, event.summary,
             event.internal_metadata_json, event.occurred_at,
             count(exposure.portal_id) AS exposure_count,
             group_concat(DISTINCT exposure.status) AS exposure_statuses
      FROM project_commitment_events event
      LEFT JOIN client_portals portal ON portal.id = event.origin_portal_id
      LEFT JOIN project_change_requests root_request ON root_request.id = event.root_request_id
      LEFT JOIN project_change_request_versions root_version ON root_version.id = root_request.current_version_id
      LEFT JOIN client_portal_event_exposures exposure ON exposure.event_id = event.id
      WHERE ${where.join(" AND ")}
      GROUP BY event.id
      ORDER BY event.occurred_at DESC, event.id DESC
      LIMIT ?
    `, [...values, limit + 1]),
    currentStatePortal ? first<BaselineRow>(database, `
      SELECT baseline.baseline_number, baseline.total_minor_units, baseline.currency_code,
             baseline.established_at, issue.issue_number, issue.version_label,
             COALESCE(CAST(json_extract(issue.decision_policy_snapshot_json, '$.requiredApprovals') AS INTEGER), 0) AS required_approvals,
             (SELECT count(*) FROM client_portal_decisions decision
              WHERE decision.issue_id = issue.id AND decision.decision = 'approved' AND decision.voided_at IS NULL) AS approved_approvals,
             (SELECT group_concat(COALESCE(NULLIF(trim(decision.signer_name), ''), recipient.display_name), '||')
              FROM client_portal_decisions decision
              LEFT JOIN client_portal_recipients recipient ON recipient.id = decision.recipient_id
              WHERE decision.issue_id = issue.id AND decision.decision = 'approved' AND decision.voided_at IS NULL) AS approver_names
      FROM client_portal_baselines baseline
      JOIN client_portal_issues issue ON issue.id = baseline.issue_id
      WHERE baseline.portal_id = ? AND baseline.status = 'active'
      LIMIT 1
    `, [currentStatePortal.id]) : Promise.resolve(null),
    currentStatePortal ? first<IssueRow>(database, `
      SELECT issue.issue_number, issue.version_label, issue.status, issue.issued_at,
             issue.total_cost, issue.currency_code,
             COALESCE(json_array_length(draft.unresolved_items_json), 0) AS unresolved_item_count
      FROM client_portal_issues issue
      LEFT JOIN client_portal_issue_drafts draft ON draft.id = issue.draft_id
      WHERE issue.id = ? AND issue.portal_id = ?
      LIMIT 1
    `, [currentStatePortal.current_issue_id ?? "", currentStatePortal.id]) : Promise.resolve(null),
    currentStatePortal ? first<LatestEventRow>(database, `
      SELECT event_type, title, occurred_at
      FROM project_commitment_events
      WHERE project_id = ? AND origin_portal_id = ?
      ORDER BY occurred_at DESC, id DESC
      LIMIT 1
    `, [input.projectId, currentStatePortal.id]) : Promise.resolve(null),
    Promise.all([
      first<{ total: number }>(database, `
        SELECT count(*) AS total FROM project_commitment_events
        WHERE project_id = ? ${eventScope}
      `, [input.projectId, ...eventScopeValues]),
      first<{ total: number }>(database, `
        SELECT count(*) AS total FROM project_change_requests
        WHERE project_id = ?
          ${currentStatePortal ? "AND origin_portal_id = ?" : ""}
          AND status IN ('submitted', 'acknowledged', 'under_assessment', 'proposal_issued')
      `, [input.projectId, ...currentStateScopeValues]),
      first<{ total: number }>(database, `
        SELECT count(*) AS total FROM project_artifacts
        WHERE project_id = ? AND status = 'active'
      `, [input.projectId]),
      first<{ total: number }>(database, `
        SELECT count(*) AS total
        FROM client_portal_threads thread
        JOIN client_portals portal ON portal.id = thread.portal_id
        WHERE portal.project_id = ?
          ${currentStatePortal ? "AND thread.portal_id = ?" : ""}
          AND thread.status IN ('open', 'requires_revalidation')
          AND thread.waiting_state = 'waiting_on_owner'
      `, [input.projectId, ...currentStateScopeValues]),
    ]),
  ]);
  const pageRows = rows.slice(0, limit);
  const [totalEvents, openRequests, activeFiles, waitingDiscussions] = counts;

  return {
    context: {
      activeBaseline: baseline ? {
        approvals: {
          approved: Number(baseline.approved_approvals ?? 0),
          names: baseline.approver_names?.split("||").filter(Boolean) ?? [],
          required: Number(baseline.required_approvals ?? 0),
        },
        baselineNumber: Number(baseline.baseline_number),
        currencyCode: baseline.currency_code,
        establishedAt: baseline.established_at,
        issueNumber: Number(baseline.issue_number),
        totalMinorUnits: Number(baseline.total_minor_units),
        versionLabel: baseline.version_label,
      } : null,
      counts: {
        activeFiles: Number(activeFiles?.total ?? 0),
        openRequests: Number(openRequests?.total ?? 0),
        totalEvents: Number(totalEvents?.total ?? 0),
        waitingDiscussions: Number(waitingDiscussions?.total ?? 0),
      },
      currentPortal: currentStatePortal ? {
        id: currentStatePortal.id,
        isPrimary: Boolean(currentStatePortal.is_primary),
        name: currentStatePortal.name,
      } : null,
      currentIssue: currentIssue ? {
        currencyCode: currentIssue.currency_code,
        issueNumber: Number(currentIssue.issue_number),
        issuedAt: currentIssue.issued_at,
        status: currentIssue.status,
        total: Number(currentIssue.total_cost),
        unresolvedItems: Number(currentIssue.unresolved_item_count ?? 0),
        versionLabel: currentIssue.version_label,
      } : null,
      latestOfficialEvent: latestOfficialEvent ? {
        eventType: latestOfficialEvent.event_type,
        occurredAt: latestOfficialEvent.occurred_at,
        title: latestOfficialEvent.title,
      } : null,
      portals: portals.map((portal) => ({
        audienceKind: portal.audience_kind,
        id: portal.id,
        isPrimary: Boolean(portal.is_primary),
        name: portal.name,
        status: portal.status,
      })),
      selectedPortalId: selectedPortal?.id ?? null,
    },
    events: pageRows.map((row) => ({
      actor: {
        domainRole: row.actor_domain_role_snapshot,
        name: row.actor_name_snapshot,
        permissionRole: row.actor_permission_role_snapshot,
        type: row.actor_type,
      },
      eventType: row.event_type,
      exposure: {
        count: Number(row.exposure_count ?? 0),
        statuses: row.exposure_statuses?.split(",").filter(Boolean) ?? [],
      },
      href: eventHref(input.projectId, row),
      id: row.id,
      metadata: record(row.internal_metadata_json),
      occurredAt: row.occurred_at,
      portal: row.origin_portal_id && row.origin_portal_name
        ? { id: row.origin_portal_id, name: row.origin_portal_name }
        : null,
      rootRequest: row.root_request_id && row.root_request_code
        ? { code: row.root_request_code, id: row.root_request_id, title: row.root_request_title }
        : null,
      source: { id: row.source_id, type: row.source_type, versionId: row.source_version_id },
      summary: row.summary,
      title: row.title,
    })),
    hasMore: rows.length > limit,
    nextCursor: rows.length > limit ? encodeCursor(pageRows.at(-1)) : null,
  };
}
