import "server-only";

import type { D1DatabaseLike, D1Value } from "@/lib/cloudflare/d1";
import { mapBaselineSummary, type BaselineSummaryRow } from "@/lib/client-portal/baseline-summary";
import { CLIENT_PORTAL_CAPABILITIES } from "@/lib/client-portal/contracts";
import {
  evaluateClientPortalPolicy,
  type ClientPortalActor,
  type ClientPortalPolicyTarget,
} from "@/lib/client-portal/policy";
import { createClientPortalPublicIdentifier } from "@/lib/client-portal/public-identifiers";
import { resolveClientPortalBaseContext } from "@/lib/client-portal/public-repository";

type TimelineRow = {
  actor_name_snapshot: string | null;
  actor_type: "internal_user" | "recipient" | "system";
  client_safe_snapshot_json: string;
  event_type: string;
  internal_metadata_json: string;
  occurred_at: string;
  policy_snapshot_json: string;
  public_event_id: string;
  source_id: string;
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

type CurrentIssueSummaryRow = {
  currency_code: string;
  issue_number: number;
  issued_at: string;
  status: string;
  total_cost: number;
  version_label: string;
};

type SnapshotFieldKind = "boolean" | "number" | "string" | "string[]";
type SnapshotSchema = Readonly<Record<string, SnapshotFieldKind>>;

const EVENT_SNAPSHOT_SCHEMA = {
  issue: { currencyCode: "string", issueNumber: "number", requestCodes: "string[]", replacesIssueNumber: "number", status: "string", totalCost: "number", versionLabel: "string" },
  decision: { decision: "string", issueNumber: "number", signerName: "string" },
  baseline: { currencyCode: "string", issueNumber: "number", status: "string", totalCost: "number" },
  change_request: { publicRequestId: "string", requestCode: "string", status: "string", title: "string", versionNumber: "number" },
  artifact: { artifactCode: "string", artifactType: "string", publicArtifactId: "string", title: "string", versionLabel: "string", versionNumber: "number" },
  legacy_publication: { issueNumber: "number", status: "string", versionLabel: "string" },
} satisfies Record<TimelineRow["source_type"], SnapshotSchema>;

function publicSnapshotValue(kind: SnapshotFieldKind, value: unknown) {
  if (value === null) return null;
  if (kind === "string[]") {
    return Array.isArray(value) && value.length <= 100 && value.every((entry) => typeof entry === "string") ? value : undefined;
  }
  return typeof value === kind ? value as string | number | boolean : undefined;
}

function publicSnapshot(sourceType: TimelineRow["source_type"], value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const source = parsed as Record<string, unknown>;
    const schema = EVENT_SNAPSHOT_SCHEMA[sourceType];
    const result: Record<string, string | number | boolean | null | string[]> = {};
    for (const [key, kind] of Object.entries(schema)) {
      const value = source[key];
      if (value === undefined) continue;
      const sanitized = publicSnapshotValue(kind, value);
      if (sanitized !== undefined) result[key] = sanitized;
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

function internalTargetMetadata(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const source = parsed as Record<string, unknown>;
    return {
      decisionId: typeof source.decisionId === "string" ? source.decisionId : null,
      threadId: typeof source.threadId === "string" ? source.threadId : null,
    };
  } catch {
    return {};
  }
}

type PublicTimelineTarget =
  | { kind: "artifact"; publicArtifactId: string }
  | { kind: "decision"; issueNumber: number | null; publicDecisionId: string }
  | { kind: "issue"; issueNumber: number }
  | { kind: "request"; publicRequestId: string }
  | { kind: "thread"; issueNumber: number | null; publicThreadId: string }
  | null;

type PublicTargetContext = {
  issueNumber: number | null;
  metadata: ReturnType<typeof internalTargetMetadata>;
  row: TimelineRow;
  snapshot: ReturnType<typeof publicSnapshot>;
  token: string;
};

type PublicTargetBuilder = (context: PublicTargetContext) => Exclude<PublicTimelineTarget, null> | null;

const PUBLIC_TARGET_BUILDERS: readonly PublicTargetBuilder[] = [
  ({ issueNumber, metadata, row, token }) => row.event_type.startsWith("discussion.") && metadata.threadId
    ? { kind: "thread", issueNumber, publicThreadId: createClientPortalPublicIdentifier(token, "thread", metadata.threadId) }
    : null,
  ({ issueNumber, metadata, row, token }) => row.source_type === "decision"
    ? { kind: "decision", issueNumber, publicDecisionId: createClientPortalPublicIdentifier(token, "decision", metadata.decisionId ?? row.source_id) }
    : null,
  ({ row, snapshot }) => row.source_type === "change_request" && typeof snapshot.publicRequestId === "string"
    ? { kind: "request", publicRequestId: snapshot.publicRequestId }
    : null,
  ({ row, snapshot }) => row.source_type === "artifact" && typeof snapshot.publicArtifactId === "string"
    ? { kind: "artifact", publicArtifactId: snapshot.publicArtifactId }
    : null,
];

function publicTarget(row: TimelineRow, snapshot: ReturnType<typeof publicSnapshot>, token: string) {
  const issueNumber = typeof snapshot.issueNumber === "number" ? snapshot.issueNumber : null;
  const context = { issueNumber, metadata: internalTargetMetadata(row.internal_metadata_json), row, snapshot, token };
  for (const buildTarget of PUBLIC_TARGET_BUILDERS) {
    const target = buildTarget(context);
    if (target) return target;
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
    activeBaseline: mapBaselineSummary(baseline),
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

type ClientPortalContext = NonNullable<Awaited<ReturnType<typeof resolveClientPortalBaseContext>>>;
type TimelineCursor = NonNullable<ReturnType<typeof cursor>>;

function timelineAuthorization(actor: ClientPortalActor, context: ClientPortalContext) {
  return evaluateClientPortalPolicy({
    actor,
    action: "timeline:view",
    portal: context.policyPortal,
    target: { kind: "timeline_event", portalId: context.portal.id, exposureStatus: "visible" },
  });
}

function timelinePageQuery(portalId: string, scanCursor: TimelineCursor | null) {
  const where = ["exposure.portal_id = ?", "exposure.status = 'visible'"];
  const values: D1Value[] = [portalId];
  if (scanCursor) {
    where.push("(event.occurred_at < ? OR (event.occurred_at = ? AND exposure.public_event_id < ?))");
    values.push(scanCursor.occurredAt, scanCursor.occurredAt, scanCursor.publicEventId);
  }
  return { values, where };
}

async function readTimelineRows(
  actor: ClientPortalActor,
  context: ClientPortalContext,
  initialCursor: TimelineCursor | null,
  limit: number,
) {
  const visibleRows: TimelineRow[] = [];
  let scanCursor = initialCursor;
  let exhausted = false;
  while (visibleRows.length <= limit && !exhausted) {
    const query = timelinePageQuery(context.portal.id, scanCursor);
    const rows = await all<TimelineRow>(context.database, `
      SELECT exposure.public_event_id, exposure.policy_snapshot_json, exposure.status,
             event.event_type, event.source_type, event.actor_type, event.actor_name_snapshot,
             event.title, event.summary, event.client_safe_snapshot_json, event.internal_metadata_json,
             event.source_id, event.occurred_at
      FROM client_portal_event_exposures exposure
      JOIN project_commitment_events event ON event.id = exposure.event_id
      WHERE ${query.where.join(" AND ")}
      ORDER BY event.occurred_at DESC, exposure.public_event_id DESC
      LIMIT ?
    `, [...query.values, 100]);
    visibleRows.push(...rows.filter((row) => canViewExposure(actor, context.policyPortal, row, "timeline_event", "timeline:view")));
    const last = rows.at(-1);
    exhausted = rows.length < 100 || !last;
    scanCursor = last ? { occurredAt: last.occurred_at, publicEventId: last.public_event_id } : scanCursor;
  }
  return visibleRows;
}

function publicTimelineEvent(row: TimelineRow, token: string) {
  const snapshot = publicSnapshot(row.source_type, row.client_safe_snapshot_json);
  return {
    actor: { name: row.actor_name_snapshot, type: row.actor_type },
    eventType: row.event_type,
    id: row.public_event_id,
    occurredAt: row.occurred_at,
    snapshot,
    sourceType: row.source_type,
    summary: row.summary,
    target: publicTarget(row, snapshot, token),
    title: row.title,
  };
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
  if (!timelineAuthorization(actor, context).allowed) return null;
  const parsedCursor = cursor(input.cursor);
  if (input.cursor && !parsedCursor) return null;
  const limit = Math.max(1, Math.min(50, Math.trunc(input.limit ?? 20)));
  const summary = await readPublicSummary(actor, context);
  if (!summary) return null;
  const visibleRows = await readTimelineRows(actor, context, parsedCursor, limit);
  const page = visibleRows.slice(0, limit);
  return {
    schemaVersion: 1,
    portal: summary.portal,
    summary: {
      activeBaseline: summary.activeBaseline,
      currentIssue: summary.pendingIssue,
      openRequestCount: summary.visibleCounts.openRequests,
    },
    events: page.map((row) => publicTimelineEvent(row, input.token)),
    hasMore: visibleRows.length > limit,
    nextCursor: visibleRows.length > limit ? nextCursor(page.at(-1)) : null,
  };
}
