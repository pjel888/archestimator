import {
  composeCollaborationActivity,
  composeEstimateActivity,
  composeSharedLinkActivity,
  type ActivityViewModel,
} from "@/lib/activity";
import { isUuid } from "@/lib/ids";
import { canReadPublisherRosterProject } from "@/lib/publisher/permissions";
import {
  compareSharedLinkActivityDesc,
  decodeSharedLinkActivityCursor,
  encodeSharedLinkActivityCursor,
  isBeforeSharedLinkActivityCursor,
  type SharedLinkActivityCursor,
} from "@/lib/publication/activity-helpers";
import { getCloudflareD1Database, type D1DatabaseLike, type D1Value } from "@/lib/cloudflare/d1";
import { listCurrentWorkspaceProjects } from "@/lib/repositories/workspace-repository";

type PublisherActivitySource =
  | "project_publications"
  | "shared_link_comments"
  | "shared_link_responses"
  | "shared_link_events"
  | "collaboration_audit_events"
  | "estimate_sheet_events";

type JsonValue = string | number | boolean | null | { [key: string]: JsonValue | undefined } | JsonValue[];

type PublisherPublicationActivityRow = { id: string; project_id: string };
type PublisherSharedCommentRow = {
  author_email: string | null;
  author_name: string | null;
  body: string | null;
  created_at: string;
  estimate_id: string | null;
  id: string;
  is_internal: boolean | number | null;
  publication_id: string;
  recipient_id: string | null;
  row_id: string | null;
  snapshot_version_at_comment: number | null;
  target_kind: string | null;
  target_label: string | null;
  target_secondary_label: string | null;
};
type PublisherSharedResponseRow = {
  created_at: string;
  decision: string;
  estimate_id: string | null;
  id: string;
  note: string | null;
  publication_id: string;
  recipient_id: string | null;
  row_id: string | null;
  signer_name: string | null;
  snapshot_version_at_decision: number | null;
  target_kind: string | null;
  target_label: string | null;
  target_secondary_label: string | null;
};
type PublisherSharedEventRow = {
  created_at: string;
  event_type: string;
  id: string;
  metadata_json: unknown;
  publication_id: string;
  recipient_id: string | null;
};
type PublisherCollaborationAuditRow = {
  actor_user_id: string | null;
  created_at: string;
  event_type: string;
  id: string;
  metadata: unknown;
  project_id: string | null;
};
type PublisherEstimateEventRow = {
  actor_user_id: string | null;
  changed_fields: unknown;
  correlation_id: string | null;
  created_at: string;
  estimate_id: string;
  estimate_node_id: string | null;
  estimate_tab_id: string | null;
  event_source: string | null;
  event_type: string;
  id: string;
  new_snapshot: unknown;
  old_snapshot: unknown;
  payload: unknown;
  project_id: string | null;
  row_context: unknown;
  target_row_id: string | null;
  total_delta: number | null;
};
type PublisherRecipientIdentityRow = { display_name: string | null; email: string | null; id: string };
type PublisherProfileRow = { display_name: string | null; email: string | null; id: string };

export type PublisherWorkspaceActivityResult = {
  activities: ActivityViewModel[];
  hasMore: boolean;
  nextCursor?: string;
  partial: boolean;
  unavailableSources: PublisherActivitySource[];
};

const PUBLISHER_ACTIVITY_LIMIT = 50;

async function requirePublisherActivityD1Database() {
  const database = await getCloudflareD1Database();
  if (!database) {
    throw new Error("Something went wrong. Try again in a moment.");
  }
  return database;
}

async function all<T>(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  const result = await database.prepare<T>(sql).bind(...values).all<T>();
  return result.results ?? [];
}

function placeholders(values: readonly unknown[]) {
  return values.map(() => "?").join(", ");
}

function parseJsonValue(value: unknown, fallback: JsonValue): JsonValue {
  if (typeof value !== "string") {
    return value === null || value === undefined ? fallback : (value as JsonValue);
  }
  try {
    return JSON.parse(value) as JsonValue;
  } catch {
    return fallback;
  }
}

function activityCursorClause(cursor: SharedLinkActivityCursor | null) {
  if (!cursor) return { sql: "", values: [] as D1Value[] };
  return {
    sql: " AND (created_at < ? OR (created_at = ? AND id < ?))",
    values: [cursor.createdAt, cursor.createdAt, cursor.id] as D1Value[],
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  const parsed = parseJsonValue(value, {});
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
}

function asStringArray(value: unknown) {
  const parsed = parseJsonValue(value, []);
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
}

function readProfileLabel(profile: PublisherProfileRow) {
  const displayName = profile.display_name?.trim();
  if (displayName) return displayName;
  const email = profile.email?.trim().toLowerCase();
  if (!email) return "Unknown user";
  const [localPart] = email.split("@");
  return localPart?.replace(/[._-]+/g, " ").trim() || email;
}

async function readActorLabels(
  database: D1DatabaseLike,
  actorUserIds: string[],
) {
  const uniqueIds = Array.from(new Set(actorUserIds.filter((id) => isUuid(id))));
  if (!uniqueIds.length) return new Map<string, string>();

  try {
    const rows = await all<PublisherProfileRow>(
      database,
      `SELECT id, display_name, email
       FROM profiles
       WHERE id IN (${placeholders(uniqueIds)})`,
      uniqueIds,
    );

    return new Map(rows.map((profile) => [profile.id, readProfileLabel(profile)]));
  } catch {
    return new Map<string, string>();
  }
}

function withProjectFact(
  activity: ActivityViewModel,
  projectName: string,
  sourceLabel: string,
): ActivityViewModel {
  return {
    ...activity,
    summary: activity.summary ?? projectName,
    facts: [
      { label: "Project", value: projectName },
      { label: "Source", value: sourceLabel },
      ...(activity.facts ?? []),
    ].slice(0, 10),
  };
}

function readProjectName(projectNames: Map<string, string>, projectId: string | null | undefined) {
  if (!projectId) return "Project";
  return projectNames.get(projectId) ?? "Project";
}

function createSharedMetadata(row: {
  estimate_id?: string | null;
  event_type?: string;
  metadata_json?: unknown;
  row_id?: string | null;
  snapshot_version_at_comment?: number | null;
  snapshot_version_at_decision?: number | null;
  target_kind?: string | null;
  target_label?: string | null;
  target_secondary_label?: string | null;
}) {
  return {
    ...asRecord(row.metadata_json),
    eventType: row.event_type,
    estimate_id: row.estimate_id ?? null,
    row_id: row.row_id ?? null,
    snapshot_version: row.snapshot_version_at_comment ?? row.snapshot_version_at_decision ?? null,
    targetKind: row.target_kind ?? null,
    targetLabel: row.target_label ?? null,
    targetSecondaryLabel: row.target_secondary_label ?? null,
  };
}

async function runPublisherActivityQuery<T>(
  source: PublisherActivitySource,
  query: Promise<T[]>,
) {
  try {
    const rows = await query;
    return { rows, unavailableSource: null };
  } catch {
    return { rows: [] as T[], unavailableSource: source };
  }
}

function applyCursor<T extends { created_at: string; id: string }>(rows: T[], cursor: ReturnType<typeof decodeSharedLinkActivityCursor>) {
  return rows.filter((row) => isBeforeSharedLinkActivityCursor(row, cursor));
}

export async function readPublisherWorkspaceActivity({
  cursor: cursorValue,
  limit = PUBLISHER_ACTIVITY_LIMIT,
  projectId,
}: {
  cursor?: string | null;
  limit?: number;
  projectId?: string | null;
} = {}): Promise<PublisherWorkspaceActivityResult> {
  if (projectId) assertUuidProjectId(projectId);

  const safeLimit = Math.min(PUBLISHER_ACTIVITY_LIMIT, Math.max(1, Math.trunc(limit)));
  // ponytail: cap the publication scan so a workspace with many publications doesn't pull
  // unbounded rows; older shared-link activity beyond this cap is intentionally omitted and
  // surfaced via `partial` so the user knows the feed isn't complete.
  const publicationScanLimit = 250;
  const cursor = decodeSharedLinkActivityCursor(cursorValue);
  const cursorWhere = activityCursorClause(cursor);
  const workspaceProjects = await listCurrentWorkspaceProjects();
  const visibleProjects = workspaceProjects.projects.filter((item) => canReadPublisherRosterProject(item.currentUserRole));
  const scopedProjects = projectId ? visibleProjects.filter((item) => item.project.id === projectId) : visibleProjects;

  if (projectId && scopedProjects.length === 0) {
    throw new Error("Project is not available in Publisher.");
  }
  if (scopedProjects.length === 0) {
    return { activities: [], hasMore: false, partial: false, unavailableSources: [] };
  }

  const projectIds = scopedProjects.map((item) => item.project.id);
  const projectNames = new Map(scopedProjects.map((item) => [item.project.id, item.project.name ?? "Project"]));
  const database = await requirePublisherActivityD1Database();

  const publicationsResult = await runPublisherActivityQuery<PublisherPublicationActivityRow>(
    "project_publications",
    all<PublisherPublicationActivityRow>(
      database,
      `SELECT id, project_id
       FROM project_publications
       WHERE workspace_id = ? AND project_id IN (${placeholders(projectIds)})
       ORDER BY published_at DESC
       LIMIT ?`,
      [workspaceProjects.workspace.id, ...projectIds, publicationScanLimit],
    ),
  );
  const unavailableSources = publicationsResult.unavailableSource ? [publicationsResult.unavailableSource] : [];
  const publicationRows = publicationsResult.rows;
  const publicationProjectIdById = new Map(publicationRows.map((publication) => [publication.id, publication.project_id]));
  const publicationIds = publicationRows.map((publication) => publication.id);

  const emptySource = <T>() => Promise.resolve([] as T[]);
  const sourceLimit = safeLimit + 1;
  const sharedSourceUnavailable = publicationsResult.unavailableSource !== null;

  const commentsQuery = publicationIds.length && !sharedSourceUnavailable
    ? all<PublisherSharedCommentRow>(
      database,
      `SELECT id, created_at, body, is_internal, author_email, author_name, recipient_id,
              publication_id, estimate_id, row_id, target_kind, target_label,
              target_secondary_label, snapshot_version_at_comment
       FROM shared_link_comments
       WHERE publication_id IN (${placeholders(publicationIds)})${cursorWhere.sql}
       ORDER BY created_at DESC, id DESC
       LIMIT ?`,
      [...publicationIds, ...cursorWhere.values, sourceLimit],
    )
    : emptySource<PublisherSharedCommentRow>();

  const responsesQuery = publicationIds.length && !sharedSourceUnavailable
    ? all<PublisherSharedResponseRow>(
      database,
      `SELECT id, created_at, decision, note, recipient_id, publication_id, estimate_id,
              row_id, signer_name, target_kind, target_label, target_secondary_label,
              snapshot_version_at_decision
       FROM shared_link_responses
       WHERE publication_id IN (${placeholders(publicationIds)})${cursorWhere.sql}
       ORDER BY created_at DESC, id DESC
       LIMIT ?`,
      [...publicationIds, ...cursorWhere.values, sourceLimit],
    )
    : emptySource<PublisherSharedResponseRow>();

  const sharedEventsQuery = publicationIds.length && !sharedSourceUnavailable
    ? all<PublisherSharedEventRow>(
      database,
      `SELECT id, created_at, event_type, metadata_json, recipient_id, publication_id
       FROM shared_link_events
       WHERE publication_id IN (${placeholders(publicationIds)})${cursorWhere.sql}
       ORDER BY created_at DESC, id DESC
       LIMIT ?`,
      [...publicationIds, ...cursorWhere.values, sourceLimit],
    )
    : emptySource<PublisherSharedEventRow>();

  const collaborationQuery = all<PublisherCollaborationAuditRow>(
    database,
    `SELECT id, created_at, event_type, actor_user_id, project_id, metadata_json AS metadata
     FROM collaboration_audit_events
     WHERE project_id IN (${placeholders(projectIds)})${cursorWhere.sql}
     ORDER BY created_at DESC, id DESC
     LIMIT ?`,
    [...projectIds, ...cursorWhere.values, sourceLimit],
  );

  const estimateQuery = all<PublisherEstimateEventRow>(
    database,
    `SELECT id, event_type, event_source, created_at, actor_user_id, estimate_id,
            estimate_tab_id, target_row_id, estimate_node_id, row_context, old_snapshot,
            new_snapshot, changed_fields, total_delta, payload, correlation_id, project_id
     FROM estimate_sheet_events
     WHERE workspace_id = ? AND project_id IN (${placeholders(projectIds)})${cursorWhere.sql}
     ORDER BY created_at DESC, id DESC
     LIMIT ?`,
    [workspaceProjects.workspace.id, ...projectIds, ...cursorWhere.values, sourceLimit],
  );

  const [comments, responses, sharedEvents, collaborations, estimates] = await Promise.all([
    runPublisherActivityQuery<PublisherSharedCommentRow>("shared_link_comments", commentsQuery),
    runPublisherActivityQuery<PublisherSharedResponseRow>("shared_link_responses", responsesQuery),
    runPublisherActivityQuery<PublisherSharedEventRow>("shared_link_events", sharedEventsQuery),
    runPublisherActivityQuery<PublisherCollaborationAuditRow>("collaboration_audit_events", collaborationQuery),
    runPublisherActivityQuery<PublisherEstimateEventRow>("estimate_sheet_events", estimateQuery),
  ]);

  for (const result of [comments, responses, sharedEvents, collaborations, estimates]) {
    if (result.unavailableSource) unavailableSources.push(result.unavailableSource);
  }

  const recipientIds = Array.from(
    new Set(
      [...comments.rows, ...responses.rows, ...sharedEvents.rows]
        .map((row) => row.recipient_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const actorIds = [
    ...collaborations.rows.map((row) => row.actor_user_id).filter((id): id is string => Boolean(id)),
    ...estimates.rows.map((row) => row.actor_user_id).filter((id): id is string => Boolean(id)),
  ];

  // ponytail: recipient labels and actor labels are independent — fetch them in one round-trip wave.
  const [recipients, actorLabels] = await Promise.all([
    recipientIds.length
      ? all<PublisherRecipientIdentityRow>(
          database,
          `SELECT id, email, display_name
           FROM shared_link_recipients
           WHERE id IN (${placeholders(recipientIds)})`,
          recipientIds,
        )
      : Promise.resolve([] as PublisherRecipientIdentityRow[]),
    readActorLabels(database, actorIds),
  ]);
  const recipientDisplayNames = new Map<string, string>();
  for (const recipient of recipients) {
    recipientDisplayNames.set(recipient.id, recipient.display_name?.trim() || recipient.email || "Client");
  }

  const activities: ActivityViewModel[] = [
    ...applyCursor(comments.rows, cursor).map((row) => {
      const projectIdForRow = publicationProjectIdById.get(row.publication_id);
      return withProjectFact(
        composeSharedLinkActivity({
          id: row.id,
          type: "comment",
          created_at: row.created_at,
          author: row.author_name ?? row.author_email,
          body: row.body,
          is_internal: row.is_internal === true || row.is_internal === 1,
          metadata: createSharedMetadata(row),
          recipientDisplayName: row.recipient_id ? recipientDisplayNames.get(row.recipient_id) ?? null : null,
        }),
        readProjectName(projectNames, projectIdForRow),
        "Shared link comment",
      );
    }),
    ...applyCursor(responses.rows, cursor).map((row) => {
      const projectIdForRow = publicationProjectIdById.get(row.publication_id);
      return withProjectFact(
        composeSharedLinkActivity({
          id: row.id,
          type: "decision",
          created_at: row.created_at,
          author: row.signer_name,
          body: row.note,
          decision: row.decision,
          metadata: createSharedMetadata(row),
          recipientDisplayName: row.recipient_id ? recipientDisplayNames.get(row.recipient_id) ?? null : null,
        }),
        readProjectName(projectNames, projectIdForRow),
        "Client decision",
      );
    }),
    ...applyCursor(sharedEvents.rows, cursor).map((row) => {
      const projectIdForRow = publicationProjectIdById.get(row.publication_id);
      return withProjectFact(
        composeSharedLinkActivity({
          id: row.id,
          type: "event",
          created_at: row.created_at,
          metadata: createSharedMetadata(row),
          recipientDisplayName: row.recipient_id ? recipientDisplayNames.get(row.recipient_id) ?? null : null,
        }),
        readProjectName(projectNames, projectIdForRow),
        "Shared link event",
      );
    }),
    ...applyCursor(collaborations.rows, cursor).map((row) =>
      withProjectFact(
        composeCollaborationActivity({
          id: row.id,
          eventType: row.event_type,
          createdAt: row.created_at,
          actorUserId: row.actor_user_id,
          actorLabel: row.actor_user_id ? actorLabels.get(row.actor_user_id) ?? null : null,
          metadata: asRecord(row.metadata),
        }),
        readProjectName(projectNames, row.project_id),
        "Collaboration audit",
      ),
    ),
    ...applyCursor(estimates.rows, cursor).map((row) =>
      withProjectFact(
        composeEstimateActivity({
          id: row.id,
          eventType: row.event_type,
          eventSource: row.event_source ?? undefined,
          createdAt: row.created_at,
          actorUserId: row.actor_user_id,
          actorLabel: row.actor_user_id ? actorLabels.get(row.actor_user_id) ?? null : null,
          estimateTabId: row.estimate_tab_id,
          targetRowId: row.target_row_id,
          estimateNodeId: row.estimate_node_id,
          rowContext: asRecord(row.row_context),
          oldSnapshot: row.old_snapshot,
          newSnapshot: row.new_snapshot,
          changedFields: asStringArray(row.changed_fields),
          totalDelta: row.total_delta === null ? null : Number(row.total_delta),
          payload: asRecord(row.payload),
          correlationId: row.correlation_id,
        }),
        readProjectName(projectNames, row.project_id),
        "Estimate event",
      ),
    ),
  ].sort((a, b) => compareSharedLinkActivityDesc(
    { id: a.id, created_at: a.occurredAt },
    { id: b.id, created_at: b.occurredAt },
  ));

  const page = activities.slice(0, safeLimit);
  const nextItem = activities[safeLimit];
  return {
    activities: page,
    hasMore: Boolean(nextItem),
    nextCursor: nextItem ? encodeSharedLinkActivityCursor({ id: page.at(-1)?.id ?? nextItem.id, created_at: page.at(-1)?.occurredAt ?? nextItem.occurredAt }) : undefined,
    partial: unavailableSources.length > 0 || publicationRows.length >= publicationScanLimit,
    unavailableSources,
  };
}

function assertUuidProjectId(projectId: string) {
  if (!isUuid(projectId)) throw new Error("Project is invalid.");
}
