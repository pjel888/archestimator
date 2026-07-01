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
import { getCloudflareD1Database, type D1DatabaseLike, type D1Value } from "@/lib/cloudflare/d1";
import type { Json } from "@/lib/types/json";

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

type ProjectPublicationRow = {
  activity_target_labels_json: unknown;
  id: string;
  project_id: string;
  published_at: string;
  published_by: string | null;
  revoked_at: string | null;
  selected_estimate_ids: unknown;
  snapshot_version: number;
  status: string;
};
type SharedCommentRow = {
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
type SharedResponseRow = {
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
type SharedEventRow = {
  created_at: string;
  event_type: string;
  id: string;
  metadata_json: unknown;
  publication_id: string;
  recipient_id: string | null;
};
type EstimateEventRow = {
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
type ProfileRow = { display_name: string | null; id: string };
type RecipientRow = { display_name: string | null; id: string; publication_id: string };
type CountRow = { count: number };
type EstimateDropdownRow = { id: string; name: string; sheet_code: string | null };
type ProjectMemberRow = { user_id: string | null };
type PublicationIdRow = { id: string };

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

function parseJsonValue(value: unknown, fallback: unknown) {
  if (typeof value !== "string") return value ?? fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  const parsed = parseJsonValue(value, {});
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  return parsed as Record<string, unknown>;
}

function asStringArray(value: unknown) {
  const parsed = parseJsonValue(value, []);
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
}

function placeholders(values: readonly unknown[]) {
  return values.map(() => "?").join(", ");
}

function normalizeD1Value(value: unknown): D1Value {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value instanceof ArrayBuffer) {
    return value;
  }
  return JSON.stringify(value);
}

async function requireProjectActivityFeedD1Database() {
  const database = await getCloudflareD1Database();
  if (!database) {
    throw new Error("Cloudflare D1 ARCH_DB binding is required for project activity feed data.");
  }
  return database;
}

async function all<T>(database: D1DatabaseLike, sql: string, values: unknown[] = []) {
  const result = await database.prepare<T>(sql).bind(...values.map(normalizeD1Value)).all<T>();
  if (result.success === false) throw new Error("Cloudflare D1 project activity feed read failed.");
  return result.results ?? [];
}

async function count(database: D1DatabaseLike, sql: string, values: unknown[] = []) {
  const rows = await all<CountRow>(database, sql, values);
  return Number(rows[0]?.count ?? 0);
}

function cursorWhere(cursor: SortKey | undefined) {
  if (!cursor) return { sql: "", values: [] as D1Value[] };
  return {
    sql: " AND (created_at < ? OR (created_at = ? AND id < ?))",
    values: [cursor.createdAt, cursor.createdAt, cursor.id] as D1Value[],
  };
}

function appendInFilter(parts: string[], values: unknown[], column: string, items: readonly string[]) {
  if (!items.length) return;
  parts.push(`${column} IN (${placeholders(items)})`);
  values.push(...items);
}

function appendScopeEstimateFilter(parts: string[], values: unknown[], column: string, scope: ProjectActivityFeedScope) {
  if (scope.kind === "estimate") {
    parts.push(`${column} = ?`);
    values.push(scope.estimateId);
  }
  if (scope.kind === "project-only") parts.push(`${column} IS NULL`);
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

function readProfileLabel(profile: ProfileRow) {
  return profile.display_name?.trim() || "Unknown user";
}

async function readActorLabels(
  database: D1DatabaseLike,
  actorUserIds: string[],
) {
  const uniqueIds = Array.from(new Set(actorUserIds.filter((id) => isUuid(id))));
  if (!uniqueIds.length) return new Map<string, string>();

  let rows: ProfileRow[] = [];
  try {
    rows = await all<ProfileRow>(
      database,
      `SELECT id, display_name
       FROM profiles
       WHERE id IN (${placeholders(uniqueIds)})`,
      uniqueIds,
    );
  } catch {
    return new Map<string, string>();
  }

  return new Map(rows.map((profile) => [profile.id, readProfileLabel(profile)]));
}

async function readRecipientDisplayNames(
  database: D1DatabaseLike,
  recipientIds: string[],
) {
  const uniqueIds = Array.from(new Set(recipientIds.filter((id) => isUuid(id))));
  if (!uniqueIds.length) return new Map<string, string>();

  let rows: RecipientRow[] = [];
  try {
    rows = await all<RecipientRow>(
      database,
      `SELECT id, display_name, publication_id
       FROM shared_link_recipients
       WHERE id IN (${placeholders(uniqueIds)})`,
      uniqueIds,
    );
  } catch {
    return new Map<string, string>();
  }

  return buildRecipientDisplayLabels(rows);
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
  if (asStringArray(row.selected_estimate_ids).includes(estimateId)) return true;
  const labels = asRecord(row.activity_target_labels_json);
  const estimateLabels = labels.estimateLabels;
  return Boolean(estimateLabels && typeof estimateLabels === "object" && !Array.isArray(estimateLabels) && estimateId in estimateLabels);
}

async function readProjectPublications(
  database: D1DatabaseLike,
  projectId: string,
  workspaceId: string,
) {
  return all<ProjectPublicationRow>(
    database,
    `SELECT id, project_id, published_at, published_by, revoked_at, status, snapshot_version, selected_estimate_ids, activity_target_labels_json
     FROM project_publications
     WHERE project_id = ? AND workspace_id = ?
     ORDER BY published_at DESC, id DESC`,
    [projectId, workspaceId],
  );
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
  query: Promise<T[]>,
) {
  try {
    const rows = await query;
    return { rows, unavailableSource: null };
  } catch {
    return { rows: [] as T[], unavailableSource: sourceName };
  }
}

function zeroCount() {
  return { count: 0, unavailableSource: null as ProjectActivityFeedSourceName | null };
}

async function runCountQuery(
  sourceName: ProjectActivityFeedSourceName,
  query: Promise<number>,
) {
  try {
    return { count: await query, unavailableSource: null };
  } catch {
    return { count: 0, unavailableSource: sourceName };
  }
}

function estimateEventTypesForActions(actions: readonly ProjectActivityConcreteActionBucket[]) {
  if (!actions.length) return null;
  const eventTypes = actions.flatMap((action) => estimateBucketEventTypes[action] ?? []);
  return eventTypes.length ? Array.from(new Set(eventTypes)) : [];
}

function collaborationEventTypesForActions(actions: readonly ProjectActivityConcreteActionBucket[]) {
  if (!actions.length) return null;
  const eventTypes: string[] = [];
  if (actions.includes("invited")) eventTypes.push("invite_email_attempted", "invite_email_sent", "member_removed", "role_changed");
  if (actions.includes("edited")) eventTypes.push("project_metadata_updated");
  if (actions.includes("system")) return null;
  return Array.from(new Set(eventTypes));
}

async function readEstimateRows(
  database: D1DatabaseLike,
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

  const eventTypes = estimateEventTypesForActions(args.filters.actions);
  if (eventTypes?.length === 0) return { rows: [] as EstimateEventRow[], unavailableSource: null };
  const where = ["workspace_id = ?", "project_id = ?"];
  const values: unknown[] = [args.workspaceId, args.projectId];
  if (args.scope.kind === "estimate") {
    where.push("estimate_id = ?");
    values.push(args.scope.estimateId);
  }
  if (args.filters.actorUserId) {
    where.push("actor_user_id = ?");
    values.push(args.filters.actorUserId);
  }
  appendInFilter(where, values, "event_type", eventTypes ?? []);
  const cursor = cursorWhere(args.cursor.estimate_sheet_events);
  const sql = `SELECT id, event_type, event_source, created_at, actor_user_id, estimate_id, estimate_tab_id, target_row_id, estimate_node_id, row_context, old_snapshot, new_snapshot, changed_fields, total_delta, payload, correlation_id, project_id
     FROM estimate_sheet_events
     WHERE ${where.join(" AND ")}${cursor.sql}
     ORDER BY created_at DESC, id DESC
     LIMIT ?`;

  return runSourceQuery<EstimateEventRow>("estimate_sheet_events", all<EstimateEventRow>(database, sql, [...values, ...cursor.values, args.limit]));
}

async function readSharedCommentRows(
  database: D1DatabaseLike,
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

  const where = [`publication_id IN (${placeholders(args.publicationIds)})`];
  const values: unknown[] = [...args.publicationIds];
  appendScopeEstimateFilter(where, values, "estimate_id", args.scope);
  if (args.filters.recipientId) {
    where.push("recipient_id = ?");
    values.push(args.filters.recipientId);
  }
  const cursor = cursorWhere(args.cursor.shared_link_comments);
  const sql = `SELECT id, created_at, body, is_internal, author_name, recipient_id, publication_id, estimate_id, row_id, target_kind, target_label, target_secondary_label, snapshot_version_at_comment
     FROM shared_link_comments
     WHERE ${where.join(" AND ")}${cursor.sql}
     ORDER BY created_at DESC, id DESC
     LIMIT ?`;

  return runSourceQuery<SharedCommentRow>("shared_link_comments", all<SharedCommentRow>(database, sql, [...values, ...cursor.values, args.limit]));
}

async function readSharedResponseRows(
  database: D1DatabaseLike,
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

  const where = [`publication_id IN (${placeholders(args.publicationIds)})`];
  const values: unknown[] = [...args.publicationIds];
  appendScopeEstimateFilter(where, values, "estimate_id", args.scope);
  if (args.filters.recipientId) {
    where.push("recipient_id = ?");
    values.push(args.filters.recipientId);
  }
  const cursor = cursorWhere(args.cursor.shared_link_responses);
  const sql = `SELECT id, created_at, decision, note, recipient_id, publication_id, estimate_id, row_id, signer_name, target_kind, target_label, target_secondary_label, snapshot_version_at_decision
     FROM shared_link_responses
     WHERE ${where.join(" AND ")}${cursor.sql}
     ORDER BY created_at DESC, id DESC
     LIMIT ?`;

  return runSourceQuery<SharedResponseRow>("shared_link_responses", all<SharedResponseRow>(database, sql, [...values, ...cursor.values, args.limit]));
}

async function readSharedEventRows(
  database: D1DatabaseLike,
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

  const where = [`publication_id IN (${placeholders(args.publicationIds)})`];
  const values: unknown[] = [...args.publicationIds];
  if (args.filters.recipientId) {
    where.push("recipient_id = ?");
    values.push(args.filters.recipientId);
  }
  if (args.filters.actions.length) appendInFilter(where, values, "event_type", [...SHARED_LINK_VIEW_EVENT_TYPES]);
  const cursor = cursorWhere(args.cursor.shared_link_events);
  const sql = `SELECT id, created_at, event_type, metadata_json, recipient_id, publication_id
     FROM shared_link_events
     WHERE ${where.join(" AND ")}${cursor.sql}
     ORDER BY created_at DESC, id DESC
     LIMIT ?`;

  return runSourceQuery<SharedEventRow>("shared_link_events", all<SharedEventRow>(database, sql, [...values, ...cursor.values, args.limit]));
}

async function readCollaborationRows(
  database: D1DatabaseLike,
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
  const eventTypes = collaborationEventTypesForActions(args.filters.actions);
  if (args.filters.actions.length && eventTypes?.length === 0) {
    return { rows: [] as CollaborationAuditRpcRow[], unavailableSource: null };
  }

  const marker = args.cursor.collaboration_audit_events;
  const where = ["project_id = ?"];
  const values: unknown[] = [args.projectId];
  if (args.scope.kind === "estimate") {
    where.push("estimate_id = ?");
    values.push(args.scope.estimateId);
  }
  if (args.scope.kind === "project-only") where.push("estimate_id IS NULL");
  if (args.filters.actorUserId) {
    where.push("actor_user_id = ?");
    values.push(args.filters.actorUserId);
  }
  appendInFilter(where, values, "event_type", eventTypes ?? []);
  const cursor = cursorWhere(marker);
  const sql = `SELECT actor_user_id, created_at, estimate_id, event_type, id, metadata_json AS metadata, project_id, 0 AS source_total_count
     FROM collaboration_audit_events
     WHERE ${where.join(" AND ")}${cursor.sql}
     ORDER BY created_at DESC, id DESC
     LIMIT ?`;

  return runSourceQuery<CollaborationAuditRpcRow>("collaboration_audit_events", all<CollaborationAuditRpcRow>(database, sql, [...values, ...cursor.values, args.limit]));
}

function createEstimateEntries(rows: EstimateEventRow[], actorLabels: Map<string, string>, filters: NormalizedFilters): ActivityEntry[] {
  return rows
    .map((row) => ({
      activity: composeEstimateActivity({
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
        is_internal: typeof row.is_internal === "number" ? row.is_internal !== 0 : row.is_internal,
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
  _database: D1DatabaseLike,
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
  database: D1DatabaseLike,
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

  const where = ["workspace_id = ?", "project_id = ?"];
  const values: unknown[] = [args.workspaceId, args.projectId];
  if (args.scope.kind === "estimate") {
    where.push("estimate_id = ?");
    values.push(args.scope.estimateId);
  }
  if (args.filters.actorUserId) {
    where.push("actor_user_id = ?");
    values.push(args.filters.actorUserId);
  }
  appendInFilter(where, values, "event_type", eventTypes ?? []);

  return runCountQuery("estimate_sheet_events", count(database, `SELECT COUNT(*) AS count FROM estimate_sheet_events WHERE ${where.join(" AND ")}`, values));
}

async function countSharedCommentRows(
  database: D1DatabaseLike,
  args: {
    publicationIds: string[];
    scope: ProjectActivityFeedScope;
    filters: NormalizedFilters;
  },
) {
  if (!args.publicationIds.length || args.filters.actorUserId || !sourceMatchesActions("shared_link_comments", args.filters.actions)) return zeroCount();

  const where = [`publication_id IN (${placeholders(args.publicationIds)})`];
  const values: unknown[] = [...args.publicationIds];
  appendScopeEstimateFilter(where, values, "estimate_id", args.scope);
  if (args.filters.recipientId) {
    where.push("recipient_id = ?");
    values.push(args.filters.recipientId);
  }

  return runCountQuery("shared_link_comments", count(database, `SELECT COUNT(*) AS count FROM shared_link_comments WHERE ${where.join(" AND ")}`, values));
}

async function countSharedResponseRows(
  database: D1DatabaseLike,
  args: {
    publicationIds: string[];
    scope: ProjectActivityFeedScope;
    filters: NormalizedFilters;
  },
) {
  if (!args.publicationIds.length || args.filters.actorUserId || !sourceMatchesActions("shared_link_responses", args.filters.actions)) return zeroCount();

  const where = [`publication_id IN (${placeholders(args.publicationIds)})`];
  const values: unknown[] = [...args.publicationIds];
  appendScopeEstimateFilter(where, values, "estimate_id", args.scope);
  if (args.filters.recipientId) {
    where.push("recipient_id = ?");
    values.push(args.filters.recipientId);
  }

  return runCountQuery("shared_link_responses", count(database, `SELECT COUNT(*) AS count FROM shared_link_responses WHERE ${where.join(" AND ")}`, values));
}

async function countSharedEventRows(
  database: D1DatabaseLike,
  args: {
    publicationIds: string[];
    filters: NormalizedFilters;
  },
) {
  if (!args.publicationIds.length || args.filters.actorUserId || !sourceMatchesActions("shared_link_events", args.filters.actions)) return zeroCount();

  const where = [`publication_id IN (${placeholders(args.publicationIds)})`];
  const values: unknown[] = [...args.publicationIds];
  if (args.filters.recipientId) {
    where.push("recipient_id = ?");
    values.push(args.filters.recipientId);
  }
  if (args.filters.actions.length) appendInFilter(where, values, "event_type", [...SHARED_LINK_VIEW_EVENT_TYPES]);

  return runCountQuery("shared_link_events", count(database, `SELECT COUNT(*) AS count FROM shared_link_events WHERE ${where.join(" AND ")}`, values));
}

async function countCollaborationRows(
  database: D1DatabaseLike,
  args: {
    projectId: string;
    scope: ProjectActivityFeedScope;
    filters: NormalizedFilters;
  },
) {
  if (wantsOnlyRecipient(args.filters) || !sourceMatchesActions("collaboration_audit_events", args.filters.actions)) return zeroCount();

  const eventTypes = collaborationEventTypesForActions(args.filters.actions);
  if (args.filters.actions.length && eventTypes?.length === 0) return zeroCount();

  const where = ["project_id = ?"];
  const values: unknown[] = [args.projectId];
  if (args.scope.kind === "estimate") {
    where.push("estimate_id = ?");
    values.push(args.scope.estimateId);
  }
  if (args.scope.kind === "project-only") where.push("estimate_id IS NULL");
  if (args.filters.actorUserId) {
    where.push("actor_user_id = ?");
    values.push(args.filters.actorUserId);
  }
  appendInFilter(where, values, "event_type", eventTypes ?? []);

  return runCountQuery("collaboration_audit_events", count(database, `SELECT COUNT(*) AS count FROM collaboration_audit_events WHERE ${where.join(" AND ")}`, values));
}

function uniqueSources(sources: (ProjectActivityFeedSourceName | null)[]) {
  return Array.from(new Set(sources.filter((source): source is ProjectActivityFeedSourceName => Boolean(source))));
}

function hasActivityFilters(filters: NormalizedFilters) {
  return filters.actions.length > 0 || Boolean(filters.actorUserId || filters.recipientId);
}

async function readExactCounts(
  database: D1DatabaseLike,
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
    countProjectPublicationRows(database, { ...args, filters: scopeFilters }),
    countEstimateRows(database, { ...args, filters: scopeFilters }),
    countSharedCommentRows(database, { publicationIds: args.publicationIds, scope: args.scope, filters: scopeFilters }),
    countSharedResponseRows(database, { publicationIds: args.publicationIds, scope: args.scope, filters: scopeFilters }),
    countSharedEventRows(database, { publicationIds: args.publicationIds, filters: scopeFilters }),
    countCollaborationRows(database, { projectId: args.projectId, scope: args.scope, filters: scopeFilters }),
  ]);

  const filteredCounts = hasActivityFilters(args.filters)
    ? await Promise.all([
        countProjectPublicationRows(database, args),
        countEstimateRows(database, args),
        countSharedCommentRows(database, { publicationIds: args.publicationIds, scope: args.scope, filters: args.filters }),
        countSharedResponseRows(database, { publicationIds: args.publicationIds, scope: args.scope, filters: args.filters }),
        countSharedEventRows(database, { publicationIds: args.publicationIds, filters: args.filters }),
        countCollaborationRows(database, { projectId: args.projectId, scope: args.scope, filters: args.filters }),
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

  const database = await requireProjectActivityFeedD1Database();
  const publicationRows = filterPublicationRowsForScope(
    await readProjectPublications(database, project.id, project.workspace_id),
    scope,
  );
  const publicationIds = publicationRows.map((publication) => publication.id);
  const exactCountsPromise = includeCounts
    ? readExactCounts(database, {
        projectId: project.id,
        workspaceId: project.workspace_id,
        publicationIds,
        publicationRows,
        scope,
        filters: normalizedFilters,
      })
    : Promise.resolve(null);

  const [estimateResult, commentResult, responseResult, eventResult, collaborationResult] = await Promise.all([
    readEstimateRows(database, {
      projectId: project.id,
      workspaceId: project.workspace_id,
      scope,
      filters: normalizedFilters,
      cursor,
      limit: sourceLimit,
    }),
    readSharedCommentRows(database, {
      publicationIds,
      scope,
      filters: normalizedFilters,
      cursor,
      limit: sourceLimit,
    }),
    readSharedResponseRows(database, {
      publicationIds,
      scope,
      filters: normalizedFilters,
      cursor,
      limit: sourceLimit,
    }),
    readSharedEventRows(database, {
      publicationIds,
      filters: normalizedFilters,
      cursor,
      limit: sourceLimit,
    }),
    readCollaborationRows(database, {
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
    readActorLabels(database, [
      ...publicationRows.map((row) => row.published_by).filter((id): id is string => Boolean(id)),
      ...estimateResult.rows.map((row) => row.actor_user_id).filter((id): id is string => Boolean(id)),
      ...collaborationResult.rows.map((row) => row.actor_user_id).filter((id): id is string => Boolean(id)),
    ]),
    readRecipientDisplayNames(database, [
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
  const database = await requireProjectActivityFeedD1Database();
  const estimates = await all<EstimateDropdownRow>(
    database,
    `SELECT id, name, sheet_code
     FROM estimates
     WHERE project_id = ?
     ORDER BY name ASC, id ASC`,
    [project.id],
  );
  return estimates.map((estimate) => ({
    id: estimate.id,
    label: estimate.name,
    secondaryLabel: estimate.sheet_code ?? undefined,
  }));
}

export async function listProjectMembersForDropdown(projectId: string): Promise<ProjectActivityDropdownOption[]> {
  if (!isUuid(projectId)) return [];
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) return [];
  const database = await requireProjectActivityFeedD1Database();
  const members = await all<ProjectMemberRow>(
    database,
    `SELECT user_id
     FROM project_members
     WHERE project_id = ? AND workspace_id = ?`,
    [project.id, project.workspace_id],
  );

  const userIds = Array.from(new Set(members.map((member) => member.user_id).filter((id): id is string => typeof id === "string" && isUuid(id))));
  if (!userIds.length) return [];

  const profiles = await all<ProfileRow>(
    database,
    `SELECT id, display_name
     FROM profiles
     WHERE id IN (${placeholders(userIds)})`,
    userIds,
  );

  return profiles
    .map((profile) => ({ id: profile.id, label: readProfileLabel(profile) }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export async function listProjectRecipientsForDropdown(projectId: string): Promise<ProjectActivityDropdownOption[]> {
  if (!isUuid(projectId)) return [];
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) return [];
  const database = await requireProjectActivityFeedD1Database();
  const publications = await all<PublicationIdRow>(
    database,
    `SELECT id
     FROM project_publications
     WHERE project_id = ? AND workspace_id = ? AND status = 'published' AND revoked_at IS NULL`,
    [project.id, project.workspace_id],
  );

  const publicationIds = publications.map((publication) => publication.id);
  if (!publicationIds.length) return [];

  const recipients = await all<RecipientRow>(
    database,
    `SELECT id, display_name, publication_id
     FROM shared_link_recipients
     WHERE publication_id IN (${placeholders(publicationIds)})`,
    publicationIds,
  );

  const labels = buildRecipientDisplayLabels(recipients);
  return Array.from(labels.entries())
    .map(([id, label]) => ({ id, label }))
    .sort((left, right) => left.label.localeCompare(right.label));
}
