import "server-only";

import {
  composeCollaborationActivity,
  composeEstimateActivity,
  composeSharedLinkActivity,
  type ActivityViewModel,
} from "@/lib/activity";
import { isUuid } from "@/lib/ids";
import { getCurrentUserContext } from "@/lib/auth/session";
import {
  matchesActionFilter,
  type ProjectActivityActionBucket,
  type ProjectActivityConcreteActionBucket,
} from "@/components/workshop/project-activity/action-classes";
import type { ActivityPageScope } from "@/components/workshop/project-activity/url-state";
import { getCurrentWorkspaceProject } from "@/lib/repositories/workspace-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json, Tables } from "@/lib/supabase/types";

export type ProjectActivityFeedScope = ActivityPageScope;
export type ProjectActivityFeedFilters = {
  actions?: readonly ProjectActivityActionBucket[];
  actorUserId?: string | "me" | null;
  recipientId?: string | null;
};
export type ProjectActivityFeedCursor = string;
export type ProjectActivityFeedSourceName =
  | "estimate_sheet_events"
  | "project_publications"
  | "shared_link_comments"
  | "shared_link_responses"
  | "shared_link_events"
  | "collaboration_audit_events";

export type ProjectActivityDropdownOption = {
  id: string;
  label: string;
  secondaryLabel?: string;
};

export type ProjectActivityFeedPage = {
  items: ActivityViewModel[];
  nextCursor: ProjectActivityFeedCursor | null;
  partial: boolean;
  unavailableSources: ProjectActivityFeedSourceName[];
  counts: {
    loadedCount: number;
    filteredTotalCount: number;
    scopeTotalCount: number;
  };
};

type SortKey = {
  createdAt: string;
  id: string;
};

type DecodedCursor = Partial<Record<ProjectActivityFeedSourceName, SortKey>>;

type ActivityEntry = {
  activity: ActivityViewModel;
  sourceName: ProjectActivityFeedSourceName;
  sortKey: SortKey;
};

type ProjectPublicationRow = Pick<
  Tables<"project_publications">,
  "activity_target_labels_json" | "id" | "project_id" | "published_at" | "published_by" | "revoked_at" | "selected_estimate_ids" | "snapshot_version" | "status"
>;
type SharedCommentRow = Pick<
  Tables<"shared_link_comments">,
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
type SharedResponseRow = Pick<
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
type SharedEventRow = Pick<Tables<"shared_link_events">, "created_at" | "event_type" | "id" | "metadata_json" | "publication_id" | "recipient_id">;
type EstimateEventRow = Pick<
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
type CollaborationAuditRpcRow = {
  actor_user_id: string | null;
  created_at: string;
  estimate_id: string | null;
  event_type: string;
  id: string;
  metadata: Json;
  project_id: string | null;
  source_total_count: number;
};
type ProfileRow = Pick<Tables<"profiles">, "display_name" | "id">;
type RecipientRow = Pick<Tables<"shared_link_recipients">, "display_name" | "id" | "publication_id">;

const DEFAULT_ACTIVITY_FEED_LIMIT = 20;
const MAX_ACTIVITY_FEED_LIMIT = 50;
const CURSOR_VERSION = "project-activity-cursor-v1";
const SHARED_LINK_VIEW_EVENT_TYPES = ["open", "password_attempt"] as const;

const estimateBucketEventTypes: Partial<Record<ProjectActivityConcreteActionBucket, readonly string[]>> = {
  created: ["node_created", "row_added", "row_added_from_template", "row_inserted_from_template", "sheet_created", "tab_created", "template_inserted"],
  edited: ["node_renamed", "row_changed", "row_detached", "row_replaced", "row_unlinked", "row_updated", "sheet_code_updated", "sheet_metadata_updated", "tab_renamed"],
  deleted: ["node_deleted", "node_deleted_with_children", "row_deleted", "tab_archived", "tab_deleted"],
  reordered: ["nodes_reordered", "tabs_reordered", "tree_reordered"],
  versioned: ["sheet_restored_as_copy", "sheet_version_created"],
};

function asRecord(value: Json | null | undefined): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asStringArray(value: string[] | null | undefined) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function clampLimit(limit: number | undefined) {
  const numericLimit = typeof limit === "number" ? limit : DEFAULT_ACTIVITY_FEED_LIMIT;
  return Math.min(MAX_ACTIVITY_FEED_LIMIT, Math.max(1, Math.trunc(numericLimit)));
}

function safeDate(value: string | null | undefined) {
  return value ?? "1970-01-01T00:00:00.000Z";
}

function compareSortDesc(left: SortKey, right: SortKey) {
  if (left.createdAt > right.createdAt) return -1;
  if (left.createdAt < right.createdAt) return 1;
  if (left.id > right.id) return -1;
  if (left.id < right.id) return 1;
  return 0;
}

function sortEntries(left: ActivityEntry, right: ActivityEntry) {
  return compareSortDesc(left.sortKey, right.sortKey);
}

function isBeforeCursor(sortKey: SortKey, cursor: SortKey | undefined) {
  if (!cursor) return true;
  return sortKey.createdAt < cursor.createdAt || (sortKey.createdAt === cursor.createdAt && sortKey.id < cursor.id);
}

function encodeCursor(cursor: DecodedCursor) {
  return Buffer.from(JSON.stringify({ version: CURSOR_VERSION, sources: cursor }), "utf8").toString("base64url");
}

export function decodeProjectActivityFeedCursor(value: string | null | undefined): DecodedCursor {
  if (!value) return {};
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const container = parsed as { version?: unknown; sources?: unknown };
    if (container.version !== CURSOR_VERSION || !container.sources || typeof container.sources !== "object" || Array.isArray(container.sources)) {
      return {};
    }

    const cursor: DecodedCursor = {};
    for (const [sourceName, marker] of Object.entries(container.sources)) {
      if (!isProjectActivityFeedSourceName(sourceName)) continue;
      if (!marker || typeof marker !== "object" || Array.isArray(marker)) continue;
      const sortKey = marker as { createdAt?: unknown; id?: unknown };
      if (typeof sortKey.createdAt === "string" && typeof sortKey.id === "string") {
        cursor[sourceName] = { createdAt: sortKey.createdAt, id: sortKey.id };
      }
    }
    return cursor;
  } catch {
    return {};
  }
}

function isProjectActivityFeedSourceName(value: string): value is ProjectActivityFeedSourceName {
  return [
    "estimate_sheet_events",
    "project_publications",
    "shared_link_comments",
    "shared_link_responses",
    "shared_link_events",
    "collaboration_audit_events",
  ].includes(value);
}

function cursorFilter(cursor: SortKey | undefined) {
  if (!cursor) return null;
  return `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`;
}

function normalizeActions(actions: readonly ProjectActivityActionBucket[] | undefined): ProjectActivityConcreteActionBucket[] {
  if (!actions?.length || actions.includes("all")) return [];
  return Array.from(new Set(actions.filter((action): action is ProjectActivityConcreteActionBucket => action !== "all")));
}

function wantsOnlyRecipient(filters: NormalizedFilters) {
  return Boolean(filters.recipientId);
}

function sourceMatchesActions(sourceName: ProjectActivityFeedSourceName, actions: readonly ProjectActivityConcreteActionBucket[]) {
  if (!actions.length) return true;
  if (sourceName === "estimate_sheet_events") return actions.some((action) => Boolean(estimateBucketEventTypes[action]?.length));
  if (sourceName === "project_publications") return actions.includes("shared");
  if (sourceName === "shared_link_comments") return actions.includes("commented");
  if (sourceName === "shared_link_responses") return actions.includes("decided");
  if (sourceName === "shared_link_events") return actions.includes("viewed");
  return actions.includes("invited") || actions.includes("edited") || actions.includes("system");
}

type NormalizedFilters = {
  actions: ProjectActivityConcreteActionBucket[];
  actorUserId: string | null;
  recipientId: string | null;
};

async function normalizeFilters(filters: ProjectActivityFeedFilters | undefined): Promise<NormalizedFilters> {
  let actorUserId = filters?.actorUserId ?? null;
  if (actorUserId === "me") {
    const currentUser = await getCurrentUserContext();
    actorUserId = currentUser?.userId ?? null;
  }

  return {
    actions: normalizeActions(filters?.actions),
    actorUserId: actorUserId && isUuid(actorUserId) ? actorUserId : null,
    recipientId: filters?.recipientId && isUuid(filters.recipientId) ? filters.recipientId : null,
  };
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

function readProfileLabel(profile: ProfileRow) {
  return profile.display_name?.trim() || "Unknown user";
}

async function readActorLabels(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  actorUserIds: string[],
) {
  const uniqueIds = Array.from(new Set(actorUserIds.filter((id) => isUuid(id))));
  if (!uniqueIds.length) return new Map<string, string>();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", uniqueIds);
  if (error) return new Map<string, string>();

  return new Map(((data ?? []) as ProfileRow[]).map((profile) => [profile.id, readProfileLabel(profile)]));
}

async function readRecipientDisplayNames(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  recipientIds: string[],
) {
  const uniqueIds = Array.from(new Set(recipientIds.filter((id) => isUuid(id))));
  if (!uniqueIds.length) return new Map<string, string>();

  const { data, error } = await supabase
    .from("shared_link_recipients")
    .select("id, display_name, publication_id")
    .in("id", uniqueIds);
  if (error) return new Map<string, string>();

  return buildRecipientDisplayLabels((data ?? []) as RecipientRow[]);
}

function buildRecipientDisplayLabels(rows: RecipientRow[]) {
  const baseLabels = rows.map((recipient) => ({
    id: recipient.id,
    label: recipient.display_name?.trim() || "Client",
  }));
  const labelCounts = new Map<string, number>();
  for (const item of baseLabels) labelCounts.set(item.label, (labelCounts.get(item.label) ?? 0) + 1);

  const seen = new Map<string, number>();
  return new Map(baseLabels.map((item) => {
    const duplicateCount = labelCounts.get(item.label) ?? 0;
    if (duplicateCount < 2) return [item.id, item.label] as const;
    const ordinal = (seen.get(item.label) ?? 0) + 1;
    seen.set(item.label, ordinal);
    return [item.id, `${item.label} (${ordinal})`] as const;
  }));
}

function publicationEventType(row: ProjectPublicationRow) {
  if (row.revoked_at || row.status === "revoked") return "revoked";
  return row.snapshot_version > 1 ? "republished" : "published";
}

function composePublicationActivity(row: ProjectPublicationRow, actorLabel: string | null): ActivityViewModel {
  const eventType = publicationEventType(row);
  const actorName = actorLabel ?? "Project owner";
  const title =
    eventType === "revoked"
      ? `${actorName} revoked a shared proposal.`
      : eventType === "republished"
        ? `${actorName} republished a shared proposal.`
        : `${actorName} published a shared proposal.`;

  return {
    id: row.id,
    source: "share",
    audience: "owner",
    visibility: "owner",
    action: eventType === "revoked" ? "removed" : eventType === "republished" ? "resent" : "sent",
    occurredAt: safeDate(row.revoked_at ?? row.published_at),
    actor: {
      id: row.published_by ?? undefined,
      kind: row.published_by ? "user" : "unknown",
      displayName: actorName,
      isSafeForClient: false,
    },
    target: { id: row.id, kind: "proposal", label: "Shared proposal" },
    title,
    facts: [{ label: "Source", value: "Publication" }],
    raw: { id: row.id, eventType, payload: { selectedEstimateIds: row.selected_estimate_ids } },
  };
}

function sharedMetadataContainsEstimate(row: ProjectPublicationRow, estimateId: string) {
  if (row.selected_estimate_ids.includes(estimateId)) return true;
  const labels = asRecord(row.activity_target_labels_json);
  const estimateLabels = labels.estimateLabels;
  return Boolean(estimateLabels && typeof estimateLabels === "object" && !Array.isArray(estimateLabels) && estimateId in estimateLabels);
}

async function readProjectPublications(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  projectId: string,
  workspaceId: string,
) {
  const query = supabase
    .from("project_publications")
    .select("id, project_id, workspace_id, published_at, published_by, revoked_at, status, snapshot_version, selected_estimate_ids, activity_target_labels_json")
    .eq("project_id", projectId)
    .eq("workspace_id", workspaceId)
    .order("published_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ProjectPublicationRow[];
}

function filterPublicationRowsForScope(rows: ProjectPublicationRow[], scope: ProjectActivityFeedScope) {
  if (scope.kind !== "estimate") return rows;
  return rows.filter((row) => sharedMetadataContainsEstimate(row, scope.estimateId));
}

function createPublicationEntries(
  rows: ProjectPublicationRow[],
  actorLabels: Map<string, string>,
  cursor: DecodedCursor,
  filters: NormalizedFilters,
) {
  if (wantsOnlyRecipient(filters)) return [] as ActivityEntry[];
  if (!sourceMatchesActions("project_publications", filters.actions)) return [];
  return rows
    .filter((row) => !filters.actorUserId || row.published_by === filters.actorUserId)
    .map((row) => {
      const sortKey = { createdAt: safeDate(row.revoked_at ?? row.published_at), id: row.id };
      return {
        activity: composePublicationActivity(row, row.published_by ? actorLabels.get(row.published_by) ?? null : null),
        sourceName: "project_publications" as const,
        sortKey,
      };
    })
    .filter((entry) => isBeforeCursor(entry.sortKey, cursor.project_publications))
    .filter((entry) => matchesActionFilter(entry.activity, filters.actions));
}

async function runSourceQuery<T>(
  sourceName: ProjectActivityFeedSourceName,
  query: PromiseLike<{ data: T[] | null; error: unknown }>,
) {
  try {
    const { data, error } = await query;
    if (error) return { rows: [] as T[], unavailableSource: sourceName };
    return { rows: data ?? [], unavailableSource: null };
  } catch {
    return { rows: [] as T[], unavailableSource: sourceName };
  }
}

function zeroCount() {
  return { count: 0, unavailableSource: null as ProjectActivityFeedSourceName | null };
}

async function runCountQuery(
  sourceName: ProjectActivityFeedSourceName,
  query: PromiseLike<{ count: number | null; error: unknown }>,
) {
  try {
    const { count, error } = await query;
    if (error) return { count: 0, unavailableSource: sourceName };
    return { count: count ?? 0, unavailableSource: null };
  } catch {
    return { count: 0, unavailableSource: sourceName };
  }
}

function estimateEventTypesForActions(actions: readonly ProjectActivityConcreteActionBucket[]) {
  if (!actions.length) return null;
  const eventTypes = actions.flatMap((action) => estimateBucketEventTypes[action] ?? []);
  return eventTypes.length ? Array.from(new Set(eventTypes)) : [];
}

function collaborationActionBucketsForActions(actions: readonly ProjectActivityConcreteActionBucket[]) {
  if (!actions.length) return null;
  const buckets: ProjectActivityConcreteActionBucket[] = [];
  if (actions.includes("invited")) buckets.push("invited");
  if (actions.includes("edited")) buckets.push("edited");
  if (actions.includes("system")) buckets.push("system");
  return buckets;
}

async function readEstimateRows(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  args: {
    projectId: string;
    workspaceId: string;
    scope: ProjectActivityFeedScope;
    filters: NormalizedFilters;
    cursor: DecodedCursor;
    limit: number;
  },
) {
  if (args.scope.kind === "project-only" || wantsOnlyRecipient(args.filters) || !sourceMatchesActions("estimate_sheet_events", args.filters.actions)) {
    return { rows: [] as EstimateEventRow[], unavailableSource: null };
  }

  let query = supabase
    .from("estimate_sheet_events")
    .select("id, event_type, event_source, created_at, actor_user_id, estimate_id, estimate_tab_id, target_row_id, estimate_node_id, row_context, old_snapshot, new_snapshot, changed_fields, total_delta, payload, correlation_id, project_id")
    .eq("workspace_id", args.workspaceId)
    .eq("project_id", args.projectId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(args.limit);

  if (args.scope.kind === "estimate") query = query.eq("estimate_id", args.scope.estimateId);
  if (args.filters.actorUserId) query = query.eq("actor_user_id", args.filters.actorUserId);
  const eventTypes = estimateEventTypesForActions(args.filters.actions);
  if (eventTypes?.length === 0) return { rows: [] as EstimateEventRow[], unavailableSource: null };
  if (eventTypes?.length) query = query.in("event_type", eventTypes);
  const filter = cursorFilter(args.cursor.estimate_sheet_events);
  if (filter) query = query.or(filter);

  return runSourceQuery<EstimateEventRow>("estimate_sheet_events", query);
}

async function readSharedCommentRows(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  args: {
    publicationIds: string[];
    scope: ProjectActivityFeedScope;
    filters: NormalizedFilters;
    cursor: DecodedCursor;
    limit: number;
  },
) {
  if (!args.publicationIds.length || args.filters.actorUserId || !sourceMatchesActions("shared_link_comments", args.filters.actions)) {
    return { rows: [] as SharedCommentRow[], unavailableSource: null };
  }

  let query = supabase
    .from("shared_link_comments")
    .select("id, created_at, body, is_internal, author_name, recipient_id, publication_id, estimate_id, row_id, target_kind, target_label, target_secondary_label, snapshot_version_at_comment")
    .in("publication_id", args.publicationIds)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(args.limit);

  if (args.scope.kind === "estimate") query = query.eq("estimate_id", args.scope.estimateId);
  if (args.scope.kind === "project-only") query = query.is("estimate_id", null);
  if (args.filters.recipientId) query = query.eq("recipient_id", args.filters.recipientId);
  const filter = cursorFilter(args.cursor.shared_link_comments);
  if (filter) query = query.or(filter);

  return runSourceQuery<SharedCommentRow>("shared_link_comments", query);
}

async function readSharedResponseRows(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  args: {
    publicationIds: string[];
    scope: ProjectActivityFeedScope;
    filters: NormalizedFilters;
    cursor: DecodedCursor;
    limit: number;
  },
) {
  if (!args.publicationIds.length || args.filters.actorUserId || !sourceMatchesActions("shared_link_responses", args.filters.actions)) {
    return { rows: [] as SharedResponseRow[], unavailableSource: null };
  }

  let query = supabase
    .from("shared_link_responses")
    .select("id, created_at, decision, note, recipient_id, publication_id, estimate_id, row_id, signer_name, target_kind, target_label, target_secondary_label, snapshot_version_at_decision")
    .in("publication_id", args.publicationIds)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(args.limit);

  if (args.scope.kind === "estimate") query = query.eq("estimate_id", args.scope.estimateId);
  if (args.scope.kind === "project-only") query = query.is("estimate_id", null);
  if (args.filters.recipientId) query = query.eq("recipient_id", args.filters.recipientId);
  const filter = cursorFilter(args.cursor.shared_link_responses);
  if (filter) query = query.or(filter);

  return runSourceQuery<SharedResponseRow>("shared_link_responses", query);
}

async function readSharedEventRows(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  args: {
    publicationIds: string[];
    filters: NormalizedFilters;
    cursor: DecodedCursor;
    limit: number;
  },
) {
  if (!args.publicationIds.length || args.filters.actorUserId || !sourceMatchesActions("shared_link_events", args.filters.actions)) {
    return { rows: [] as SharedEventRow[], unavailableSource: null };
  }

  let query = supabase
    .from("shared_link_events")
    .select("id, created_at, event_type, metadata_json, recipient_id, publication_id")
    .in("publication_id", args.publicationIds)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(args.limit);

  if (args.filters.recipientId) query = query.eq("recipient_id", args.filters.recipientId);
  if (args.filters.actions.length) query = query.in("event_type", [...SHARED_LINK_VIEW_EVENT_TYPES]);
  const filter = cursorFilter(args.cursor.shared_link_events);
  if (filter) query = query.or(filter);

  return runSourceQuery<SharedEventRow>("shared_link_events", query);
}

async function readCollaborationRows(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  args: {
    projectId: string;
    scope: ProjectActivityFeedScope;
    filters: NormalizedFilters;
    cursor: DecodedCursor;
    limit: number;
  },
) {
  if (wantsOnlyRecipient(args.filters) || !sourceMatchesActions("collaboration_audit_events", args.filters.actions)) {
    return { rows: [] as CollaborationAuditRpcRow[], unavailableSource: null };
  }
  const actionBuckets = collaborationActionBucketsForActions(args.filters.actions);
  if (args.filters.actions.length && !actionBuckets?.length) {
    return { rows: [] as CollaborationAuditRpcRow[], unavailableSource: null };
  }

  const marker = args.cursor.collaboration_audit_events;
  const query = supabase.rpc("read_project_collaboration_audit_events", {
    cursor_created_at: marker?.createdAt ?? null,
    cursor_id: marker?.id ?? null,
    page_limit: args.limit,
    target_action_buckets: actionBuckets?.length ? actionBuckets : null,
    target_actor_user_id: args.filters.actorUserId,
    target_estimate_id: args.scope.kind === "estimate" ? args.scope.estimateId : null,
    target_project_id: args.projectId,
    target_project_only: args.scope.kind === "project-only",
  });

  return runSourceQuery<CollaborationAuditRpcRow>("collaboration_audit_events", query);
}

function createEstimateEntries(rows: EstimateEventRow[], actorLabels: Map<string, string>, filters: NormalizedFilters): ActivityEntry[] {
  return rows
    .map((row) => ({
      activity: composeEstimateActivity({
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
      sourceName: "estimate_sheet_events" as const,
      sortKey: { createdAt: row.created_at, id: row.id },
    }))
    .filter((entry) => matchesActionFilter(entry.activity, filters.actions));
}

function createSharedCommentEntries(rows: SharedCommentRow[], recipientLabels: Map<string, string>, filters: NormalizedFilters): ActivityEntry[] {
  return rows
    .map((row) => ({
      activity: composeSharedLinkActivity({
        id: row.id,
        type: "comment",
        created_at: row.created_at,
        author: row.author_name,
        body: row.body,
        is_internal: row.is_internal,
        metadata: createSharedMetadata(row),
        recipientDisplayName: row.recipient_id ? recipientLabels.get(row.recipient_id) ?? null : null,
      }),
      sourceName: "shared_link_comments" as const,
      sortKey: { createdAt: row.created_at, id: row.id },
    }))
    .filter((entry) => matchesActionFilter(entry.activity, filters.actions));
}

function createSharedResponseEntries(rows: SharedResponseRow[], recipientLabels: Map<string, string>, filters: NormalizedFilters): ActivityEntry[] {
  return rows
    .map((row) => ({
      activity: composeSharedLinkActivity({
        id: row.id,
        type: "decision",
        created_at: row.created_at,
        author: row.signer_name,
        body: row.note,
        decision: row.decision,
        metadata: createSharedMetadata(row),
        recipientDisplayName: row.recipient_id ? recipientLabels.get(row.recipient_id) ?? null : null,
      }),
      sourceName: "shared_link_responses" as const,
      sortKey: { createdAt: row.created_at, id: row.id },
    }))
    .filter((entry) => matchesActionFilter(entry.activity, filters.actions));
}

function createSharedEventEntries(rows: SharedEventRow[], recipientLabels: Map<string, string>, filters: NormalizedFilters): ActivityEntry[] {
  return rows
    .map((row) => ({
      activity: composeSharedLinkActivity({
        id: row.id,
        type: "event",
        created_at: row.created_at,
        metadata: createSharedMetadata(row),
        recipientDisplayName: row.recipient_id ? recipientLabels.get(row.recipient_id) ?? null : null,
      }),
      sourceName: "shared_link_events" as const,
      sortKey: { createdAt: row.created_at, id: row.id },
    }))
    .filter((entry) => matchesActionFilter(entry.activity, filters.actions));
}

function createCollaborationEntries(rows: CollaborationAuditRpcRow[], actorLabels: Map<string, string>, filters: NormalizedFilters): ActivityEntry[] {
  return rows
    .map((row) => ({
      activity: composeCollaborationActivity({
        id: row.id,
        eventType: row.event_type,
        createdAt: row.created_at,
        actorUserId: row.actor_user_id,
        actorLabel: row.actor_user_id ? actorLabels.get(row.actor_user_id) ?? null : null,
        metadata: asRecord(row.metadata),
      }),
      sourceName: "collaboration_audit_events" as const,
      sortKey: { createdAt: row.created_at, id: row.id },
    }))
    .filter((entry) => matchesActionFilter(entry.activity, filters.actions));
}

function buildNextCursor(previousCursor: DecodedCursor, page: ActivityEntry[], hasMore: boolean) {
  if (!hasMore || !page.length) return null;
  const nextCursor: DecodedCursor = { ...previousCursor };
  for (const entry of page) {
    const existing = nextCursor[entry.sourceName];
    if (!existing || compareSortDesc(entry.sortKey, existing) > 0) {
      nextCursor[entry.sourceName] = entry.sortKey;
    }
  }
  return encodeCursor(nextCursor);
}

async function countProjectPublicationRows(
  _supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  args: {
    projectId: string;
    workspaceId: string;
    scope: ProjectActivityFeedScope;
    filters: NormalizedFilters;
    publicationRows: ProjectPublicationRow[];
  },
) {
  if (wantsOnlyRecipient(args.filters) || !sourceMatchesActions("project_publications", args.filters.actions)) return zeroCount();
  const count = args.publicationRows.filter((row) => !args.filters.actorUserId || row.published_by === args.filters.actorUserId).length;
  return { count, unavailableSource: null };
}

async function countEstimateRows(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  args: {
    projectId: string;
    workspaceId: string;
    scope: ProjectActivityFeedScope;
    filters: NormalizedFilters;
  },
) {
  if (args.scope.kind === "project-only" || wantsOnlyRecipient(args.filters) || !sourceMatchesActions("estimate_sheet_events", args.filters.actions)) {
    return zeroCount();
  }

  const eventTypes = estimateEventTypesForActions(args.filters.actions);
  if (eventTypes?.length === 0) return zeroCount();

  let query = supabase
    .from("estimate_sheet_events")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", args.workspaceId)
    .eq("project_id", args.projectId);

  if (args.scope.kind === "estimate") query = query.eq("estimate_id", args.scope.estimateId);
  if (args.filters.actorUserId) query = query.eq("actor_user_id", args.filters.actorUserId);
  if (eventTypes?.length) query = query.in("event_type", eventTypes);

  return runCountQuery("estimate_sheet_events", query);
}

async function countSharedCommentRows(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  args: {
    publicationIds: string[];
    scope: ProjectActivityFeedScope;
    filters: NormalizedFilters;
  },
) {
  if (!args.publicationIds.length || args.filters.actorUserId || !sourceMatchesActions("shared_link_comments", args.filters.actions)) return zeroCount();

  let query = supabase
    .from("shared_link_comments")
    .select("id", { count: "exact", head: true })
    .in("publication_id", args.publicationIds);

  if (args.scope.kind === "estimate") query = query.eq("estimate_id", args.scope.estimateId);
  if (args.scope.kind === "project-only") query = query.is("estimate_id", null);
  if (args.filters.recipientId) query = query.eq("recipient_id", args.filters.recipientId);

  return runCountQuery("shared_link_comments", query);
}

async function countSharedResponseRows(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  args: {
    publicationIds: string[];
    scope: ProjectActivityFeedScope;
    filters: NormalizedFilters;
  },
) {
  if (!args.publicationIds.length || args.filters.actorUserId || !sourceMatchesActions("shared_link_responses", args.filters.actions)) return zeroCount();

  let query = supabase
    .from("shared_link_responses")
    .select("id", { count: "exact", head: true })
    .in("publication_id", args.publicationIds);

  if (args.scope.kind === "estimate") query = query.eq("estimate_id", args.scope.estimateId);
  if (args.scope.kind === "project-only") query = query.is("estimate_id", null);
  if (args.filters.recipientId) query = query.eq("recipient_id", args.filters.recipientId);

  return runCountQuery("shared_link_responses", query);
}

async function countSharedEventRows(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  args: {
    publicationIds: string[];
    filters: NormalizedFilters;
  },
) {
  if (!args.publicationIds.length || args.filters.actorUserId || !sourceMatchesActions("shared_link_events", args.filters.actions)) return zeroCount();

  let query = supabase
    .from("shared_link_events")
    .select("id", { count: "exact", head: true })
    .in("publication_id", args.publicationIds);

  if (args.filters.recipientId) query = query.eq("recipient_id", args.filters.recipientId);
  if (args.filters.actions.length) query = query.in("event_type", [...SHARED_LINK_VIEW_EVENT_TYPES]);

  return runCountQuery("shared_link_events", query);
}

async function countCollaborationRows(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  args: {
    projectId: string;
    scope: ProjectActivityFeedScope;
    filters: NormalizedFilters;
  },
) {
  if (wantsOnlyRecipient(args.filters) || !sourceMatchesActions("collaboration_audit_events", args.filters.actions)) return zeroCount();

  const actionBuckets = collaborationActionBucketsForActions(args.filters.actions);
  if (args.filters.actions.length && !actionBuckets?.length) return zeroCount();

  const result = await runSourceQuery<CollaborationAuditRpcRow>(
    "collaboration_audit_events",
    supabase.rpc("read_project_collaboration_audit_events", {
      cursor_created_at: null,
      cursor_id: null,
      page_limit: 1,
      target_action_buckets: actionBuckets?.length ? actionBuckets : null,
      target_actor_user_id: args.filters.actorUserId,
      target_estimate_id: args.scope.kind === "estimate" ? args.scope.estimateId : null,
      target_project_id: args.projectId,
      target_project_only: args.scope.kind === "project-only",
    }),
  );

  return {
    count: result.rows[0]?.source_total_count ?? 0,
    unavailableSource: result.unavailableSource,
  };
}

function uniqueSources(sources: (ProjectActivityFeedSourceName | null)[]) {
  return Array.from(new Set(sources.filter((source): source is ProjectActivityFeedSourceName => Boolean(source))));
}

function hasActivityFilters(filters: NormalizedFilters) {
  return filters.actions.length > 0 || Boolean(filters.actorUserId || filters.recipientId);
}

async function readExactCounts(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  args: {
    projectId: string;
    workspaceId: string;
    publicationIds: string[];
    publicationRows: ProjectPublicationRow[];
    scope: ProjectActivityFeedScope;
    filters: NormalizedFilters;
  },
) {
  const scopeFilters: NormalizedFilters = { actions: [], actorUserId: null, recipientId: null };
  const [scopePublications, scopeEstimates, scopeComments, scopeResponses, scopeEvents, scopeCollaboration] = await Promise.all([
    countProjectPublicationRows(supabase, { ...args, filters: scopeFilters }),
    countEstimateRows(supabase, { ...args, filters: scopeFilters }),
    countSharedCommentRows(supabase, { publicationIds: args.publicationIds, scope: args.scope, filters: scopeFilters }),
    countSharedResponseRows(supabase, { publicationIds: args.publicationIds, scope: args.scope, filters: scopeFilters }),
    countSharedEventRows(supabase, { publicationIds: args.publicationIds, filters: scopeFilters }),
    countCollaborationRows(supabase, { projectId: args.projectId, scope: args.scope, filters: scopeFilters }),
  ]);

  const filteredCounts = hasActivityFilters(args.filters)
    ? await Promise.all([
        countProjectPublicationRows(supabase, args),
        countEstimateRows(supabase, args),
        countSharedCommentRows(supabase, { publicationIds: args.publicationIds, scope: args.scope, filters: args.filters }),
        countSharedResponseRows(supabase, { publicationIds: args.publicationIds, scope: args.scope, filters: args.filters }),
        countSharedEventRows(supabase, { publicationIds: args.publicationIds, filters: args.filters }),
        countCollaborationRows(supabase, { projectId: args.projectId, scope: args.scope, filters: args.filters }),
      ])
    : [scopePublications, scopeEstimates, scopeComments, scopeResponses, scopeEvents, scopeCollaboration];
  const [filteredPublications, filteredEstimates, filteredComments, filteredResponses, filteredEvents, filteredCollaboration] = filteredCounts;

  return {
    counts: {
      filteredTotalCount:
        filteredPublications.count +
        filteredEstimates.count +
        filteredComments.count +
        filteredResponses.count +
        filteredEvents.count +
        filteredCollaboration.count,
      scopeTotalCount:
        scopePublications.count +
        scopeEstimates.count +
        scopeComments.count +
        scopeResponses.count +
        scopeEvents.count +
        scopeCollaboration.count,
    },
    unavailableSources: uniqueSources([
      scopePublications.unavailableSource,
      scopeEstimates.unavailableSource,
      scopeComments.unavailableSource,
      scopeResponses.unavailableSource,
      scopeEvents.unavailableSource,
      scopeCollaboration.unavailableSource,
      filteredPublications.unavailableSource,
      filteredEstimates.unavailableSource,
      filteredComments.unavailableSource,
      filteredResponses.unavailableSource,
      filteredEvents.unavailableSource,
      filteredCollaboration.unavailableSource,
    ]),
  };
}

export async function readProjectActivityFeed({
  projectId,
  scope = { kind: "whole-project" },
  filters,
  cursor: cursorValue,
  limit,
  includeCounts = true,
}: {
  projectId: string;
  scope?: ProjectActivityFeedScope;
  filters?: ProjectActivityFeedFilters;
  cursor?: ProjectActivityFeedCursor | null;
  limit?: number;
  includeCounts?: boolean;
}): Promise<ProjectActivityFeedPage> {
  if (!isUuid(projectId)) throw new Error("Project is invalid.");

  const safeLimit = clampLimit(limit);
  const sourceLimit = safeLimit + 1;
  const cursor = decodeProjectActivityFeedCursor(cursorValue);
  const normalizedFilters = await normalizeFilters(filters);
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) throw new Error("Project is not available.");

  const supabase = await createSupabaseServerClient();
  const publicationRows = filterPublicationRowsForScope(
    await readProjectPublications(supabase, project.id, project.workspace_id),
    scope,
  );
  const publicationIds = publicationRows.map((publication) => publication.id);
  const exactCountsPromise = includeCounts
    ? readExactCounts(supabase, {
        projectId: project.id,
        workspaceId: project.workspace_id,
        publicationIds,
        publicationRows,
        scope,
        filters: normalizedFilters,
      })
    : Promise.resolve(null);

  const [estimateResult, commentResult, responseResult, eventResult, collaborationResult] = await Promise.all([
    readEstimateRows(supabase, {
      projectId: project.id,
      workspaceId: project.workspace_id,
      scope,
      filters: normalizedFilters,
      cursor,
      limit: sourceLimit,
    }),
    readSharedCommentRows(supabase, {
      publicationIds,
      scope,
      filters: normalizedFilters,
      cursor,
      limit: sourceLimit,
    }),
    readSharedResponseRows(supabase, {
      publicationIds,
      scope,
      filters: normalizedFilters,
      cursor,
      limit: sourceLimit,
    }),
    readSharedEventRows(supabase, {
      publicationIds,
      filters: normalizedFilters,
      cursor,
      limit: sourceLimit,
    }),
    readCollaborationRows(supabase, {
      projectId: project.id,
      scope,
      filters: normalizedFilters,
      cursor,
      limit: sourceLimit,
    }),
  ]);

  const unavailableSources = [
    estimateResult.unavailableSource,
    commentResult.unavailableSource,
    responseResult.unavailableSource,
    eventResult.unavailableSource,
    collaborationResult.unavailableSource,
  ].filter((source): source is ProjectActivityFeedSourceName => Boolean(source));

  const [actorLabels, recipientLabels] = await Promise.all([
    readActorLabels(supabase, [
      ...publicationRows.map((row) => row.published_by).filter((id): id is string => Boolean(id)),
      ...estimateResult.rows.map((row) => row.actor_user_id).filter((id): id is string => Boolean(id)),
      ...collaborationResult.rows.map((row) => row.actor_user_id).filter((id): id is string => Boolean(id)),
    ]),
    readRecipientDisplayNames(supabase, [
      ...commentResult.rows.map((row) => row.recipient_id).filter((id): id is string => Boolean(id)),
      ...responseResult.rows.map((row) => row.recipient_id).filter((id): id is string => Boolean(id)),
      ...eventResult.rows.map((row) => row.recipient_id).filter((id): id is string => Boolean(id)),
    ]),
  ]);

  const entries = [
    ...createPublicationEntries(publicationRows, actorLabels, cursor, normalizedFilters),
    ...createEstimateEntries(estimateResult.rows, actorLabels, normalizedFilters),
    ...createSharedCommentEntries(commentResult.rows, recipientLabels, normalizedFilters),
    ...createSharedResponseEntries(responseResult.rows, recipientLabels, normalizedFilters),
    ...createSharedEventEntries(eventResult.rows, recipientLabels, normalizedFilters),
    ...createCollaborationEntries(collaborationResult.rows, actorLabels, normalizedFilters),
  ].sort(sortEntries);

  const page = entries.slice(0, safeLimit);
  const hasMore = entries.length > safeLimit;
  const exactCounts = await exactCountsPromise;
  const allUnavailableSources = uniqueSources([
    ...unavailableSources,
    ...(exactCounts?.unavailableSources ?? []),
  ]);

  return {
    items: page.map((entry) => entry.activity),
    nextCursor: buildNextCursor(cursor, page, hasMore),
    partial: allUnavailableSources.length > 0,
    unavailableSources: allUnavailableSources,
    counts: {
      loadedCount: page.length,
      ...(exactCounts?.counts ?? {
        filteredTotalCount: page.length,
        scopeTotalCount: page.length,
      }),
    },
  };
}

export async function listProjectEstimatesForDropdown(projectId: string): Promise<ProjectActivityDropdownOption[]> {
  if (!isUuid(projectId)) return [];
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("estimates")
    .select("id, name, sheet_code")
    .eq("project_id", project.id)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((estimate) => ({
    id: estimate.id,
    label: estimate.name,
    secondaryLabel: estimate.sheet_code,
  }));
}

export async function listProjectMembersForDropdown(projectId: string): Promise<ProjectActivityDropdownOption[]> {
  if (!isUuid(projectId)) return [];
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) return [];
  const supabase = await createSupabaseServerClient();
  const { data: members, error: membersError } = await supabase
    .from("project_members")
    .select("user_id")
    .eq("project_id", project.id)
    .eq("workspace_id", project.workspace_id);
  if (membersError) throw membersError;

  const userIds = Array.from(new Set((members ?? []).map((member) => member.user_id).filter((id): id is string => isUuid(id))));
  if (!userIds.length) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds);
  if (profilesError) throw profilesError;

  return ((profiles ?? []) as ProfileRow[])
    .map((profile) => ({ id: profile.id, label: readProfileLabel(profile) }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export async function listProjectRecipientsForDropdown(projectId: string): Promise<ProjectActivityDropdownOption[]> {
  if (!isUuid(projectId)) return [];
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) return [];
  const supabase = await createSupabaseServerClient();
  const { data: publications, error: publicationError } = await supabase
    .from("project_publications")
    .select("id")
    .eq("project_id", project.id)
    .eq("workspace_id", project.workspace_id)
    .eq("status", "published")
    .is("revoked_at", null);
  if (publicationError) throw publicationError;

  const publicationIds = (publications ?? []).map((publication) => publication.id);
  if (!publicationIds.length) return [];

  const { data: recipients, error: recipientError } = await supabase
    .from("shared_link_recipients")
    .select("id, display_name, publication_id")
    .in("publication_id", publicationIds);
  if (recipientError) throw recipientError;

  const labels = buildRecipientDisplayLabels((recipients ?? []) as RecipientRow[]);
  return Array.from(labels.entries())
    .map(([id, label]) => ({ id, label }))
    .sort((left, right) => left.label.localeCompare(right.label));
}
