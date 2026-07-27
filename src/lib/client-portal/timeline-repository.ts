import "server-only";

import type { D1DatabaseLike, D1Value } from "@/lib/cloudflare/d1";
import { CLIENT_PORTAL_CAPABILITIES } from "@/lib/client-portal/contracts";
import {
  evaluateClientPortalPolicy,
  type ClientPortalActor,
  type ClientPortalPolicyTarget,
} from "@/lib/client-portal/policy";
import { resolveClientPortalBaseContext } from "@/lib/client-portal/public-repository";

type TimelineRow = {
  actor_name_snapshot: string | null;
  actor_type: "internal_user" | "recipient" | "system";
  client_safe_snapshot_json: string;
  event_type: string;
  occurred_at: string;
  policy_snapshot_json: string;
  public_event_id: string;
  source_type: "issue" | "decision" | "baseline" | "change_request" | "artifact" | "legacy_publication";
  status: "visible" | "withdrawn" | "redacted";
  summary: string | null;
  title: string;
};

type ExposurePolicyRow = {
  owner_recipient_id?: string | null;
  policy_snapshot_json: string;
  status: "visible" | "withdrawn" | "redacted";
};

type ProjectSummaryRow = {
  currency_code: string;
  name: string;
  project_code: string | null;
};

type BaselineSummaryRow = {
  baseline_number: number;
  currency_code: string;
  established_at: string;
  issue_number: number;
  total_minor_units: number;
  version_label: string;
};

type CurrentIssueSummaryRow = {
  currency_code: string;
  issue_number: number;
  issued_at: string;
  status: string;
  total_cost: number;
  version_label: string;
};

const EVENT_SNAPSHOT_KEYS: Record<string, readonly string[]> = {
  issue: ["currencyCode", "issueNumber", "requestCodes", "replacesIssueNumber", "status", "totalCost", "versionLabel"],
  decision: ["decision", "issueNumber", "signerName"],
  baseline: ["currencyCode", "issueNumber", "status", "totalCost"],
  change_request: ["publicRequestId", "status", "title"],
  artifact: ["publicArtifactId", "title", "versionLabel"],
  legacy_publication: ["issueNumber", "status", "versionLabel"],
};

function publicScalar(value: unknown): string | number | boolean | null {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null ? value : null;
}

function publicSnapshot(sourceType: TimelineRow["source_type"], value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const source = parsed as Record<string, unknown>;
    const allowed = EVENT_SNAPSHOT_KEYS[sourceType];
    if (Object.keys(source).some((key) => !allowed.includes(key))) return {};
    const result: Record<string, string | number | boolean | null | string[]> = {};
    for (const key of allowed) {
      const value = source[key];
      if (value === undefined) continue;
      if (key === "requestCodes") {
        if (Array.isArray(value) && value.length <= 100 && value.every((entry) => typeof entry === "string")) result[key] = value;
        continue;
      }
      const scalar = publicScalar(value);
      if (scalar !== null || value === null) result[key] = scalar;
    }
    return result;
  } catch {
    return {};
  }
}

function cursor(value: string | null | undefined) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as { occurredAt?: unknown; publicEventId?: unknown };
    return typeof parsed.occurredAt === "string" && typeof parsed.publicEventId === "string" ? { occurredAt: parsed.occurredAt, publicEventId: parsed.publicEventId } : null;
  } catch {
    return null;
  }
}

function nextCursor(row: TimelineRow | undefined) {
  return row ? Buffer.from(JSON.stringify({ occurredAt: row.occurred_at, publicEventId: row.public_event_id })).toString("base64url") : null;
}

async function first<T>(database: D1DatabaseLike, sql: string, values: D1Value[]) {
  return database.prepare<T>(sql).bind(...values).first<T>();
}

async function all<T>(database: D1DatabaseLike, sql: string, values: D1Value[]) {
  const result = await database.prepare<T>(sql).bind(...values).all<T>();
  return result.results ?? [];
}

function stringArray(value: unknown) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 500 || !value.every((entry) => typeof entry === "string")) return null;
  return value;
}

function exposurePolicy(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const snapshot = parsed as Record<string, unknown>;
    const allowedRecipientIds = stringArray(snapshot.allowedRecipientIds);
    const allowedOrganizations = stringArray(snapshot.allowedOrganizations);
    if (allowedRecipientIds === null || allowedOrganizations === null) return null;
    return { allowedOrganizations, allowedRecipientIds };
  } catch {
    return null;
  }
}

function exposureTarget(
  portalId: string,
  row: ExposurePolicyRow,
  kind: ClientPortalPolicyTarget["kind"],
) {
  const audience = exposurePolicy(row.policy_snapshot_json);
  if (!audience) return null;
  return {
    kind,
    portalId,
    exposureStatus: row.status,
    ownerRecipientId: row.owner_recipient_id ?? null,
    ...audience,
  } satisfies ClientPortalPolicyTarget;
}

function canViewExposure(
  actor: ClientPortalActor,
  portal: Parameters<typeof evaluateClientPortalPolicy>[0]["portal"],
  row: ExposurePolicyRow,
  kind: ClientPortalPolicyTarget["kind"],
  action: "request:view" | "timeline:view",
) {
  const target = exposureTarget(portal.id, row, kind);
  return Boolean(target && evaluateClientPortalPolicy({ actor, action, portal, target }).allowed);
}

function publicTarget(sourceType: TimelineRow["source_type"], snapshot: ReturnType<typeof publicSnapshot>) {
  const issueNumber = typeof snapshot.issueNumber === "number" ? snapshot.issueNumber : null;
  if (sourceType === "change_request" && typeof snapshot.publicRequestId === "string") {
    return { kind: "request" as const, publicRequestId: snapshot.publicRequestId };
  }
  if (sourceType === "artifact" && typeof snapshot.publicArtifactId === "string") {
    return { kind: "artifact" as const, publicArtifactId: snapshot.publicArtifactId };
  }
  return issueNumber === null ? null : { kind: "issue" as const, issueNumber };
}

async function readPublicSummary(
  actor: ClientPortalActor,
  context: NonNullable<Awaited<ReturnType<typeof resolveClientPortalBaseContext>>>,
) {
  const [project, baseline, currentIssue, requestExposures, timelineExposures, artifactExposures, issueCount] = await Promise.all([
    first<ProjectSummaryRow>(context.database, `
      SELECT name, project_code, currency_code
      FROM projects
      WHERE id = ? AND workspace_id = ?
      LIMIT 1
    `, [context.portal.project_id, context.portal.workspace_id]),
    first<BaselineSummaryRow>(context.database, `
      SELECT baseline.baseline_number, baseline.total_minor_units, baseline.currency_code, baseline.established_at,
             issue.issue_number, issue.version_label
      FROM client_portal_baselines baseline
      JOIN client_portal_issues issue ON issue.id = baseline.issue_id
      WHERE baseline.portal_id = ? AND baseline.status = 'active'
      LIMIT 1
    `, [context.portal.id]),
    first<CurrentIssueSummaryRow>(context.database, `
      SELECT issue.issue_number, issue.version_label, issue.status, issue.issued_at, issue.total_cost, issue.currency_code
      FROM client_portal_issues issue
      JOIN client_portals portal ON portal.current_issue_id = issue.id
      WHERE portal.id = ?
      LIMIT 1
    `, [context.portal.id]),
    all<ExposurePolicyRow>(context.database, `
      SELECT exposure.policy_snapshot_json, exposure.status,
             CASE WHEN request.requested_by_actor_type = 'recipient' THEN request.requested_by_actor_id ELSE NULL END AS owner_recipient_id
      FROM client_portal_request_exposures exposure
      JOIN project_change_requests request ON request.id = exposure.request_id
      WHERE exposure.portal_id = ? AND exposure.status = 'visible'
        AND request.status IN ('submitted', 'acknowledged', 'under_assessment', 'proposal_issued')
    `, [context.portal.id]),
    all<ExposurePolicyRow>(context.database, `
      SELECT policy_snapshot_json, status
      FROM client_portal_event_exposures
      WHERE portal_id = ? AND status = 'visible'
    `, [context.portal.id]),
    all<ExposurePolicyRow>(context.database, `
      SELECT artifact.policy_snapshot_json, 'visible' AS status
      FROM client_portal_issue_artifacts artifact
      JOIN client_portal_issues issue ON issue.id = artifact.issue_id
      WHERE issue.portal_id = ?
        AND issue.status NOT IN ('withdrawn', 'archived')
        AND (issue.valid_through IS NULL OR julianday(issue.valid_through) > julianday('now'))
    `, [context.portal.id]),
    first<{ total: number }>(context.database, `
      SELECT count(*) AS total
      FROM client_portal_issues
      WHERE portal_id = ? AND status NOT IN ('withdrawn', 'archived')
    `, [context.portal.id]),
  ]);

  if (!project) return null;
  const capabilities = evaluateClientPortalPolicy({
    actor,
    action: "portal:view",
    portal: context.policyPortal,
  }).effectiveCapabilities.filter((capability) => CLIENT_PORTAL_CAPABILITIES.includes(capability));
  const visibleTimelineEvents = timelineExposures.filter((row) => canViewExposure(actor, context.policyPortal, row, "timeline_event", "timeline:view")).length;
  const visibleOpenRequests = requestExposures.filter((row) => canViewExposure(actor, context.policyPortal, row, "change_request", "request:view")).length;
  const visibleArtifacts = artifactExposures.filter((row) => {
    const target = exposureTarget(context.portal.id, row, "artifact");
    return Boolean(target && evaluateClientPortalPolicy({ actor, action: "artifact:view", portal: context.policyPortal, target }).allowed);
  }).length;

  return {
    schemaVersion: 1,
    portal: { name: context.portal.name, status: context.portal.status },
    project: { code: project.project_code, currencyCode: project.currency_code, name: project.name },
    recipient: actor.kind === "recipient" ? { displayName: actor.displayName ?? null, role: actor.role } : null,
    capabilities,
    activeBaseline: baseline ? {
      baselineNumber: Number(baseline.baseline_number),
      currencyCode: baseline.currency_code,
      establishedAt: baseline.established_at,
      issueNumber: Number(baseline.issue_number),
      totalMinorUnits: Number(baseline.total_minor_units),
      versionLabel: baseline.version_label,
    } : null,
    pendingIssue: currentIssue ? {
      currencyCode: currentIssue.currency_code,
      issueNumber: Number(currentIssue.issue_number),
      issuedAt: currentIssue.issued_at,
      status: currentIssue.status,
      total: Number(currentIssue.total_cost),
      versionLabel: currentIssue.version_label,
    } : null,
    visibleCounts: {
      artifacts: visibleArtifacts,
      issues: Number(issueCount?.total ?? 0),
      openRequests: visibleOpenRequests,
      timelineEvents: visibleTimelineEvents,
    },
  };
}

export async function getClientPortalSummary(input: {
  actor?: ClientPortalActor;
  passwordAuthenticated?: boolean;
  token: string;
}) {
  const actor = input.actor ?? { kind: "anonymous" as const };
  const context = await resolveClientPortalBaseContext(input.token, actor, input.passwordAuthenticated ?? false);
  return context ? readPublicSummary(actor, context) : null;
}

export async function getClientPortalTimeline(input: {
  actor?: ClientPortalActor;
  cursor?: string | null;
  limit?: number;
  passwordAuthenticated?: boolean;
  token: string;
}) {
  const actor = input.actor ?? { kind: "anonymous" as const };
  const context = await resolveClientPortalBaseContext(input.token, actor, input.passwordAuthenticated ?? false);
  if (!context) return null;
  const authorization = evaluateClientPortalPolicy({
    actor,
    action: "timeline:view",
    portal: context.policyPortal,
    target: { kind: "timeline_event", portalId: context.portal.id, exposureStatus: "visible" },
  });
  if (!authorization.allowed) return null;
  const parsedCursor = cursor(input.cursor);
  if (input.cursor && !parsedCursor) return null;
  const limit = Math.max(1, Math.min(50, Math.trunc(input.limit ?? 20)));
  const summary = await readPublicSummary(actor, context);
  if (!summary) return null;
  const visibleRows: TimelineRow[] = [];
  let scanCursor = parsedCursor;
  let exhausted = false;
  while (visibleRows.length <= limit && !exhausted) {
    const where = ["exposure.portal_id = ?", "exposure.status = 'visible'"];
    const values: D1Value[] = [context.portal.id];
    if (scanCursor) {
      where.push("(event.occurred_at < ? OR (event.occurred_at = ? AND exposure.public_event_id < ?))");
      values.push(scanCursor.occurredAt, scanCursor.occurredAt, scanCursor.publicEventId);
    }
    const rows = await all<TimelineRow>(context.database, `
      SELECT exposure.public_event_id, exposure.policy_snapshot_json, exposure.status,
             event.event_type, event.source_type, event.actor_type, event.actor_name_snapshot,
             event.title, event.summary, event.client_safe_snapshot_json, event.occurred_at
      FROM client_portal_event_exposures exposure
      JOIN project_commitment_events event ON event.id = exposure.event_id
      WHERE ${where.join(" AND ")}
      ORDER BY event.occurred_at DESC, exposure.public_event_id DESC
      LIMIT ?
    `, [...values, 100]);
    visibleRows.push(...rows.filter((row) => canViewExposure(actor, context.policyPortal, row, "timeline_event", "timeline:view")));
    const last = rows.at(-1);
    exhausted = rows.length < 100 || !last;
    scanCursor = last ? { occurredAt: last.occurred_at, publicEventId: last.public_event_id } : scanCursor;
  }
  const page = visibleRows.slice(0, limit);
  return {
    schemaVersion: 1,
    portal: summary.portal,
    summary: {
      activeBaseline: summary.activeBaseline,
      currentIssue: summary.pendingIssue,
      openRequestCount: summary.visibleCounts.openRequests,
    },
    events: page.map((row) => {
      const snapshot = publicSnapshot(row.source_type, row.client_safe_snapshot_json);
      return {
        actor: { name: row.actor_name_snapshot, type: row.actor_type },
        eventType: row.event_type,
        id: row.public_event_id,
        occurredAt: row.occurred_at,
        snapshot,
        sourceType: row.source_type,
        summary: row.summary,
        target: publicTarget(row.source_type, snapshot),
        title: row.title,
      };
    }),
    hasMore: visibleRows.length > limit,
    nextCursor: visibleRows.length > limit ? nextCursor(page.at(-1)) : null,
  };
}
