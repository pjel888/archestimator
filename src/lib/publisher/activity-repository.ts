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
  sharedLinkActivityCursorFilter,
} from "@/lib/publication/activity-helpers";
import { listCurrentWorkspaceProjects } from "@/lib/repositories/workspace-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json, Tables } from "@/lib/supabase/types";

type PublisherActivitySource =
  | "project_publications"
  | "shared_link_comments"
  | "shared_link_responses"
  | "shared_link_events"
  | "collaboration_audit_events"
  | "estimate_sheet_events";

type PublisherPublicationActivityRow = Pick<Tables<"project_publications">, "id" | "project_id">;
type PublisherSharedCommentRow = Pick<
  Tables<"shared_link_comments">,
  | "author_email"
  | "author_name"
  | "body"
  | "created_at"
  | "estimate_id"
  | "id"
  | "is_internal"
  | "publication_id"
  | "recipient_id"
  | "row_id"
  | "snapshot_version_at_comment"
  | "target_kind"
  | "target_label"
  | "target_secondary_label"
>;
type PublisherSharedResponseRow = Pick<
  Tables<"shared_link_responses">,
  | "created_at"
  | "decision"
  | "estimate_id"
  | "id"
  | "note"
  | "publication_id"
  | "recipient_id"
  | "row_id"
  | "signer_name"
  | "snapshot_version_at_decision"
  | "target_kind"
  | "target_label"
  | "target_secondary_label"
>;
type PublisherSharedEventRow = Pick<
  Tables<"shared_link_events">,
  "created_at" | "event_type" | "id" | "metadata_json" | "publication_id" | "recipient_id"
>;
type PublisherCollaborationAuditRow = Pick<
  Tables<"collaboration_audit_events">,
  "actor_user_id" | "created_at" | "event_type" | "id" | "metadata" | "project_id"
>;
type PublisherEstimateEventRow = Pick<
  Tables<"estimate_sheet_events">,
  | "actor_user_id"
  | "changed_fields"
  | "correlation_id"
  | "created_at"
  | "estimate_id"
  | "estimate_node_id"
  | "estimate_tab_id"
  | "event_source"
  | "event_type"
  | "id"
  | "new_snapshot"
  | "old_snapshot"
  | "payload"
  | "project_id"
  | "row_context"
  | "target_row_id"
  | "total_delta"
>;
type PublisherRecipientIdentityRow = Pick<Tables<"shared_link_recipients">, "display_name" | "email" | "id">;
type PublisherProfileRow = Pick<Tables<"profiles">, "display_name" | "email" | "id">;
type PublisherActivityQuery = PromiseLike<{ data: unknown[] | null; error: unknown }>;
type CursorablePublisherActivityQuery = PublisherActivityQuery & {
  or(filter: string): CursorablePublisherActivityQuery;
};

export type PublisherWorkspaceActivityResult = {
  activities: ActivityViewModel[];
  hasMore: boolean;
  nextCursor?: string;
  partial: boolean;
  unavailableSources: PublisherActivitySource[];
};

const PUBLISHER_ACTIVITY_LIMIT = 50;

function asRecord(value: Json | null | undefined): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asStringArray(value: string[] | null | undefined) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
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
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  actorUserIds: string[],
) {
  const uniqueIds = Array.from(new Set(actorUserIds.filter((id) => isUuid(id))));
  if (!uniqueIds.length) return new Map<string, string>();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .in("id", uniqueIds);
  if (error) return new Map<string, string>();

  return new Map((data ?? []).map((profile) => [profile.id, readProfileLabel(profile as PublisherProfileRow)]));
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
  metadata_json?: Json;
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
  query: PublisherActivityQuery,
) {
  try {
    const { data, error } = await query;
    if (error) return { rows: [] as T[], unavailableSource: source };
    return { rows: (data ?? []) as T[], unavailableSource: null };
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
  const cursor = decodeSharedLinkActivityCursor(cursorValue);
  const cursorFilter = sharedLinkActivityCursorFilter(cursor);
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
  const supabase = await createSupabaseServerClient();

  const publicationsQuery = supabase
    .from("project_publications")
    .select("id, project_id")
    .eq("workspace_id", workspaceProjects.workspace.id)
    .in("project_id", projectIds)
    .order("published_at", { ascending: false })
    .limit(250);

  const publicationsResult = await runPublisherActivityQuery<PublisherPublicationActivityRow>(
    "project_publications",
    publicationsQuery,
  );
  const unavailableSources = publicationsResult.unavailableSource ? [publicationsResult.unavailableSource] : [];
  const publicationRows = publicationsResult.rows;
  const publicationProjectIdById = new Map(publicationRows.map((publication) => [publication.id, publication.project_id]));
  const publicationIds = publicationRows.map((publication) => publication.id);

  const emptySharedSource = (): PublisherActivityQuery => Promise.resolve({ data: [], error: null });
  const sourceLimit = safeLimit + 1;
  const sharedSourceUnavailable = publicationsResult.unavailableSource !== null;

  let commentsQuery = emptySharedSource();
  if (publicationIds.length && !sharedSourceUnavailable) {
    let query = supabase
      .from("shared_link_comments")
      .select("id, created_at, body, is_internal, author_email, author_name, recipient_id, publication_id, estimate_id, row_id, target_kind, target_label, target_secondary_label, snapshot_version_at_comment")
      .in("publication_id", publicationIds)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(sourceLimit) as unknown as CursorablePublisherActivityQuery;
    if (cursorFilter) query = query.or(cursorFilter);
    commentsQuery = query;
  }

  let responsesQuery = emptySharedSource();
  if (publicationIds.length && !sharedSourceUnavailable) {
    let query = supabase
      .from("shared_link_responses")
      .select("id, created_at, decision, note, recipient_id, publication_id, estimate_id, row_id, signer_name, target_kind, target_label, target_secondary_label, snapshot_version_at_decision")
      .in("publication_id", publicationIds)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(sourceLimit) as unknown as CursorablePublisherActivityQuery;
    if (cursorFilter) query = query.or(cursorFilter);
    responsesQuery = query;
  }

  let sharedEventsQuery = emptySharedSource();
  if (publicationIds.length && !sharedSourceUnavailable) {
    let query = supabase
      .from("shared_link_events")
      .select("id, created_at, event_type, metadata_json, recipient_id, publication_id")
      .in("publication_id", publicationIds)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(sourceLimit) as unknown as CursorablePublisherActivityQuery;
    if (cursorFilter) query = query.or(cursorFilter);
    sharedEventsQuery = query;
  }

  let collaborationQuery = supabase
    .from("collaboration_audit_events")
    .select("id, created_at, event_type, actor_user_id, project_id, metadata")
    .in("project_id", projectIds)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(sourceLimit) as unknown as CursorablePublisherActivityQuery;
  if (cursorFilter) collaborationQuery = collaborationQuery.or(cursorFilter);

  let estimateQuery = supabase
    .from("estimate_sheet_events")
    .select("id, event_type, event_source, created_at, actor_user_id, estimate_id, estimate_tab_id, target_row_id, estimate_node_id, row_context, old_snapshot, new_snapshot, changed_fields, total_delta, payload, correlation_id, project_id")
    .eq("workspace_id", workspaceProjects.workspace.id)
    .in("project_id", projectIds)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(sourceLimit) as unknown as CursorablePublisherActivityQuery;
  if (cursorFilter) estimateQuery = estimateQuery.or(cursorFilter);

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
  const recipientDisplayNames = new Map<string, string>();
  if (recipientIds.length) {
    const { data } = await supabase
      .from("shared_link_recipients")
      .select("id, email, display_name")
      .in("id", recipientIds);
    for (const recipient of (data ?? []) as PublisherRecipientIdentityRow[]) {
      recipientDisplayNames.set(recipient.id, recipient.display_name?.trim() || recipient.email || "Client");
    }
  }

  const actorLabels = await readActorLabels(supabase, [
    ...collaborations.rows.map((row) => row.actor_user_id).filter((id): id is string => Boolean(id)),
    ...estimates.rows.map((row) => row.actor_user_id).filter((id): id is string => Boolean(id)),
  ]);

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
          is_internal: row.is_internal,
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
          eventSource: row.event_source,
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
    partial: unavailableSources.length > 0,
    unavailableSources,
  };
}

function assertUuidProjectId(projectId: string) {
  if (!isUuid(projectId)) throw new Error("Project is invalid.");
}
