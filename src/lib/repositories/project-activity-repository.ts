import { cache } from "react";

import { composeEstimateActivity } from "@/lib/activity";
import { getCloudflareD1Database, type D1DatabaseLike, type D1Value } from "@/lib/cloudflare/d1";
import { isUuid } from "@/lib/ids";
import { getCurrentWorkspaceProject } from "@/lib/repositories/workspace-repository";

export type ProjectActivityCursor = {
  readonly createdAt: string;
  readonly id: string;
};

export type ProjectActivityItem = {
  readonly id: string;
  readonly createdAt: string;
  readonly actorLabel: string;
  readonly title: string;
  readonly summary: string | null;
  readonly targetLabel: string;
  readonly targetKind: string;
  readonly estimateId: string;
  readonly estimateName: string;
  readonly sheetCode: string | null;
  readonly href: string;
};

export type ProjectActivityPage = {
  readonly items: ProjectActivityItem[];
  readonly nextCursor: ProjectActivityCursor | null;
};

type JsonValue = string | number | boolean | null | { [key: string]: JsonValue | undefined } | JsonValue[];

type ProjectActivityEventRow = {
  actor_user_id: string | null;
  changed_fields: unknown;
  correlation_id: string | null;
  created_at: string;
  estimate_id: string;
  estimate_name: string | null;
  estimate_node_id: string | null;
  estimate_sheet_code: string | null;
  estimate_tab_id: string | null;
  event_source: string | null;
  event_type: string;
  id: string;
  new_snapshot: unknown;
  old_snapshot: unknown;
  payload: unknown;
  row_context: unknown;
  target_row_id: string | null;
  total_delta: number | null;
};

type ActorProfileRow = {
  id: string;
  display_name: string | null;
  email: string | null;
};

const PROJECT_ACTIVITY_DEFAULT_LIMIT = 20;
const PROJECT_ACTIVITY_MAX_LIMIT = 50;
const DORMANT_NAMED_VERSION_EVENT_TYPES = ["sheet_version_created", "sheet_restored_as_copy"] as const;

function readErrorMessage(error: unknown) {
  if (!error || typeof error !== "object" || !("message" in error)) return "";
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" ? message : "";
}

function isProjectActivitySchemaUnavailable(error: unknown) {
  const message = readErrorMessage(error).toLowerCase();
  return message.includes("no such table: estimate_sheet_events")
    || message.includes("no such column: event.project_id")
    || message.includes("no such column: estimate_sheet_events.project_id");
}

function warnProjectActivitySchemaUnavailable() {
  console.warn("[project-dashboard] Project activity D1 schema is unavailable; apply estimate_sheet_events migration.");
}

export function createEmptyProjectActivityPage(): ProjectActivityPage {
  return {
    items: [],
    nextCursor: null,
  };
}

function clampProjectActivityLimit(limit: number | undefined) {
  return Math.min(
    PROJECT_ACTIVITY_MAX_LIMIT,
    Math.max(1, Number.isFinite(limit) ? Math.trunc(Number(limit)) : PROJECT_ACTIVITY_DEFAULT_LIMIT),
  );
}

function normalizeProjectActivityCursor(cursor: ProjectActivityCursor | null | undefined): ProjectActivityCursor | null {
  if (!cursor) return null;
  if (!isUuid(cursor.id)) throw new Error("Project activity cursor id is invalid.");
  if (Number.isNaN(new Date(cursor.createdAt).getTime())) {
    throw new Error("Project activity cursor timestamp is invalid.");
  }
  return cursor;
}

async function requireProjectActivityD1Database() {
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

function buildProjectActivityCursorClause(cursor: ProjectActivityCursor | null) {
  if (!cursor) return { sql: "", values: [] as D1Value[] };
  return {
    sql: " AND (event.created_at < ? OR (event.created_at = ? AND event.id < ?))",
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

function readActorLabel(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function readActorEmailLabel(value: unknown) {
  const email = readActorLabel(value)?.toLowerCase();
  if (!email) return null;
  if (email === "philipjonlewis@gmail.com") return "Philip Lewis";

  const [localPart] = email.split("@");
  const spacedLocalPart = localPart?.replace(/[._-]+/g, " ").trim();
  if (!spacedLocalPart) return null;
  if (!spacedLocalPart.includes(" ")) return email;

  return spacedLocalPart
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function fallbackActorLabel(actorUserId: string | null) {
  return actorUserId ? "Unknown user" : "System/backfill";
}

async function resolveProjectActivityActorLabels(
  database: D1DatabaseLike,
  rows: ProjectActivityEventRow[],
) {
  const actorUserIds = Array.from(new Set(rows.map((row) => row.actor_user_id).filter((id): id is string => Boolean(id))));
  if (!actorUserIds.length) return new Map<string, string>();

  try {
    const data = await all<ActorProfileRow>(
      database,
      `SELECT id, display_name, email
       FROM profiles
       WHERE id IN (${actorUserIds.map(() => "?").join(", ")})`,
      actorUserIds,
    );
    return new Map(
      data.map((profile) => [
        profile.id,
        readActorLabel(profile.display_name) ?? readActorEmailLabel(profile.email) ?? fallbackActorLabel(profile.id),
      ] as const),
    );
  } catch {
    return new Map<string, string>();
  }
}

function toProjectActivityItem(
  projectId: string,
  row: ProjectActivityEventRow,
  actorLabels: Map<string, string>,
): ProjectActivityItem {
  const actorUserId = row.actor_user_id;
  const actorLabel = actorUserId ? actorLabels.get(actorUserId) ?? fallbackActorLabel(actorUserId) : fallbackActorLabel(null);
  const activity = composeEstimateActivity({
    id: row.id,
    eventType: row.event_type,
    eventSource: row.event_source ?? undefined,
    createdAt: row.created_at,
    actorUserId,
    actorLabel,
    estimateTabId: row.estimate_tab_id,
    targetRowId: row.target_row_id,
    estimateNodeId: row.estimate_node_id,
    rowContext: asRecord(row.row_context),
    oldSnapshot: asRecord(row.old_snapshot),
    newSnapshot: asRecord(row.new_snapshot),
    changedFields: asStringArray(row.changed_fields),
    totalDelta: row.total_delta === null ? null : Number(row.total_delta),
    payload: asRecord(row.payload),
    correlationId: row.correlation_id,
  });

  const estimateName = row.estimate_name?.trim() || "Deleted estimate";

  return {
    id: activity.id,
    createdAt: activity.occurredAt,
    actorLabel: activity.actor.displayName,
    title: activity.title,
    summary: activity.summary ?? null,
    targetLabel: activity.target.label,
    targetKind: activity.target.kind,
    estimateId: row.estimate_id,
    estimateName,
    sheetCode: row.estimate_sheet_code,
    href: `/workshop/projects/${projectId}/estimates`,
  };
}

export const listProjectActivityPage = cache(async function listProjectActivityPage({
  projectId,
  limit,
  cursor,
}: {
  readonly projectId: string;
  readonly limit?: number;
  readonly cursor?: ProjectActivityCursor | null;
}): Promise<ProjectActivityPage> {
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) return createEmptyProjectActivityPage();

  const safeLimit = clampProjectActivityLimit(limit);
  const normalizedCursor = normalizeProjectActivityCursor(cursor);
  const cursorClause = buildProjectActivityCursorClause(normalizedCursor);
  const database = await requireProjectActivityD1Database();

  let eventRows: ProjectActivityEventRow[];
  try {
    eventRows = await all<ProjectActivityEventRow>(
      database,
      `SELECT
         event.id,
         event.event_type,
         event.event_source,
         event.created_at,
         event.actor_user_id,
         event.estimate_id,
         estimate.name AS estimate_name,
         estimate.sheet_code AS estimate_sheet_code,
         event.estimate_tab_id,
         event.target_row_id,
         event.estimate_node_id,
         event.row_context,
         event.old_snapshot,
         event.new_snapshot,
         event.changed_fields,
         event.total_delta,
         event.payload,
         event.correlation_id
       FROM estimate_sheet_events event
       LEFT JOIN estimates estimate
         ON estimate.id = event.estimate_id
        AND estimate.project_id = event.project_id
       WHERE event.workspace_id = ?
         AND event.project_id = ?
         AND event.event_type NOT IN (?, ?)${cursorClause.sql}
       ORDER BY event.created_at DESC, event.id DESC
       LIMIT ?`,
      [project.workspace_id, project.id, ...DORMANT_NAMED_VERSION_EVENT_TYPES, ...cursorClause.values, safeLimit + 1],
    );
  } catch (error) {
    if (isProjectActivitySchemaUnavailable(error)) {
      warnProjectActivitySchemaUnavailable();
      return createEmptyProjectActivityPage();
    }
    throw error;
  }

  const rows = eventRows.slice(0, safeLimit);
  const nextRow = eventRows[safeLimit];
  const actorLabels = await resolveProjectActivityActorLabels(database, rows);

  return {
    items: rows.map((row) => toProjectActivityItem(project.id, row, actorLabels)),
    nextCursor: nextRow ? { createdAt: rows.at(-1)?.created_at ?? nextRow.created_at, id: rows.at(-1)?.id ?? nextRow.id } : null,
  };
});
