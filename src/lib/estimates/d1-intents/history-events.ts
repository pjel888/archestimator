import "server-only";

import { randomUUID } from "node:crypto";

import type { D1DatabaseLike, D1PreparedStatementLike } from "@/lib/cloudflare/d1";
import { normalizeEventType } from "@/lib/activity/event-type-normalization";
import { isUuid } from "@/lib/ids";
import type { Json } from "@/lib/types/json";

import {
  allD1Rows,
  firstD1Row,
  runD1Batch,
  runPreparedD1Batch,
  type D1IntentStatement,
} from "./database";
import { readEstimateIntentProjectContext } from "./intent-context";

export type HistoryEventInput = {
  projectId: string;
  estimateId: string;
  workspaceId?: string | null;
  estimateNodeId?: string | null;
  estimateTabId?: string | null;
  targetRowId?: string | null;
  eventType: string;
  actorUserId?: string | null;
  correlationId: string;
  changedFields?: string[];
  rowContext?: Record<string, unknown>;
  oldSnapshot?: unknown;
  newSnapshot?: unknown;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  totalDelta?: number | null;
};

export type PreparedHistoryEvent =
  | { eventId: string; statement: null; outboxStatement: null }
  | { eventId: string; statement: D1IntentStatement; outboxStatement: D1IntentStatement };

export type EstimateSheetHistoryCursor = {
  createdAt: string;
  id: string;
};

export type EstimateSheetHistoryEvent = {
  id: string;
  eventType: string;
  eventSource: string;
  createdAt: string;
  actorUserId: string | null;
  actorLabel: string;
  estimateTabId: string | null;
  targetRowId: string | null;
  estimateNodeId: string | null;
  rowContext: Record<string, unknown>;
  oldSnapshot: Json | null;
  newSnapshot: Json | null;
  changedFields: string[];
  totalDelta: number | null;
  payload: Record<string, unknown>;
  correlationId: string;
};

export type EstimateSheetVersionControlData = {
  events: EstimateSheetHistoryEvent[];
  rowEvents: EstimateSheetHistoryEvent[];
  nodeEvents: EstimateSheetHistoryEvent[];
  nextCursor: EstimateSheetHistoryCursor | null;
  rowNextCursor: EstimateSheetHistoryCursor | null;
  nodeNextCursor: EstimateSheetHistoryCursor | null;
};

export type NormalizedEstimateSheetVersionControlRead = {
  projectId: string;
  estimateId: string;
  eventLimit: number;
  filters: {
    eventTypes: string[];
    dateFrom: string | null;
    dateTo: string | null;
    searchPattern: string | null;
  };
  fetchSheetEvents: boolean;
  targetRowId: string | null;
  targetNodeId: string | null;
  includeDescendants: boolean;
  nodeScope: { nodeIds: string[]; rowIds: string[] } | null;
  sheetCursor: EstimateSheetHistoryCursor | null;
  rowCursor: EstimateSheetHistoryCursor | null;
  nodeCursor: EstimateSheetHistoryCursor | null;
};

function nowIso() {
  return new Date().toISOString();
}

type EstimateHistoryEventRow = {
  id: string;
  event_type: string;
  event_source: string;
  created_at: string;
  actor_user_id: string | null;
  estimate_tab_id: string | null;
  target_row_id: string | null;
  estimate_node_id: string | null;
  row_context: Json | string | null;
  old_snapshot: Json | string | null;
  new_snapshot: Json | string | null;
  changed_fields: Json | string | null;
  total_delta: number | string | null;
  payload: Json | string | null;
  correlation_id: string;
};

type ActivityActorProfileRow = {
  id: string;
  display_name: string | null;
  email: string | null;
};

type ActivityActorProfile = {
  label: string;
};

const DORMANT_NAMED_VERSION_EVENT_TYPES = ["sheet_version_created", "sheet_restored_as_copy"] as const;

function placeholders(values: readonly unknown[]) {
  if (values.length === 0) throw new Error("Something went wrong. Try again in a moment.");
  return values.map(() => "?").join(", ");
}

function readJson(value: unknown, fallback: Json): Json {
  if (typeof value === "string") {
    try {
      return readJson(JSON.parse(value) as unknown, fallback);
    } catch {
      return fallback;
    }
  }
  if (value === null || typeof value === "number" || typeof value === "boolean" || Array.isArray(value)) {
    return value as Json;
  }
  if (value && typeof value === "object") return value as Json;
  return fallback;
}

function readJsonRecord(value: unknown): Record<string, unknown> {
  const parsed = readJson(value, {});
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : {};
}

function readStringArray(value: unknown) {
  const parsed = readJson(value, []);
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
}

function getFallbackActorLabel(actorUserId: string | null) {
  return actorUserId ? "Unknown user" : "System/backfill";
}

function readProfileActorLabel(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function readProfileEmailActorLabel(value: unknown) {
  const email = readProfileActorLabel(value)?.toLowerCase();
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

function normalizeHistoryEvent(
  row: EstimateHistoryEventRow,
  actorProfiles: ReadonlyMap<string, ActivityActorProfile>,
): EstimateSheetHistoryEvent {
  const actorUserId = row.actor_user_id;
  const actorProfile = actorUserId ? actorProfiles.get(actorUserId) : undefined;
  const changedFields = readStringArray(row.changed_fields);
  return {
    id: row.id,
    eventType: normalizeEventType(row.event_type, { changedFields }),
    eventSource: row.event_source,
    createdAt: row.created_at,
    actorUserId,
    actorLabel: actorProfile?.label ?? getFallbackActorLabel(actorUserId),
    estimateTabId: row.estimate_tab_id ?? null,
    targetRowId: row.target_row_id ?? null,
    estimateNodeId: row.estimate_node_id ?? null,
    rowContext: readJsonRecord(row.row_context),
    oldSnapshot: row.old_snapshot === null ? null : readJson(row.old_snapshot, null),
    newSnapshot: row.new_snapshot === null ? null : readJson(row.new_snapshot, null),
    changedFields,
    totalDelta: row.total_delta === null ? null : Number(row.total_delta),
    payload: readJsonRecord(row.payload),
    correlationId: row.correlation_id,
  };
}

function buildHistoryEventPageRows(rows: EstimateHistoryEventRow[], limit: number) {
  const filteredRows = rows.filter((row) => !DORMANT_NAMED_VERSION_EVENT_TYPES.includes(
    row.event_type as (typeof DORMANT_NAMED_VERSION_EVENT_TYPES)[number],
  ));
  const pageRows = filteredRows.slice(0, limit);
  const lastRow = pageRows.at(-1);
  return {
    rows: pageRows,
    nextCursor: filteredRows.length > limit && lastRow
      ? { createdAt: lastRow.created_at, id: lastRow.id }
      : null,
  };
}

async function readActivityActorProfiles(
  database: D1DatabaseLike,
  rows: readonly EstimateHistoryEventRow[],
) {
  const actorUserIds = [...new Set(rows.flatMap((row) => row.actor_user_id ? [row.actor_user_id] : []))];
  if (actorUserIds.length === 0) return new Map<string, ActivityActorProfile>();
  try {
    const profiles = await allD1Rows<ActivityActorProfileRow>(
      database,
      `SELECT id, display_name, email FROM profiles WHERE id IN (${placeholders(actorUserIds)})`,
      actorUserIds,
    );
    return new Map(profiles.map((profile) => [profile.id, {
      label: readProfileActorLabel(profile.display_name)
        ?? readProfileEmailActorLabel(profile.email)
        ?? getFallbackActorLabel(profile.id),
    }]));
  } catch {
    return new Map<string, ActivityActorProfile>();
  }
}

function buildHistoryReadQuery(
  input: NormalizedEstimateSheetVersionControlRead,
  lane: "sheet" | "row" | "node",
) {
  const conditions = [
    "project_id = ?",
    "estimate_id = ?",
    `event_type NOT IN (${DORMANT_NAMED_VERSION_EVENT_TYPES.map(() => "?").join(", ")})`,
  ];
  const values: unknown[] = [input.projectId, input.estimateId, ...DORMANT_NAMED_VERSION_EVENT_TYPES];
  if (input.filters.eventTypes.length > 0) {
    conditions.push(`event_type IN (${placeholders(input.filters.eventTypes)})`);
    values.push(...input.filters.eventTypes);
  }
  if (input.filters.dateFrom) {
    conditions.push("created_at >= ?");
    values.push(input.filters.dateFrom);
  }
  if (input.filters.dateTo) {
    conditions.push("created_at <= ?");
    values.push(input.filters.dateTo);
  }
  if (input.filters.searchPattern) {
    const searchTerm = input.filters.searchPattern;
    const pattern = `%${searchTerm}%`;
    const searchConditions = [
      "event_type LIKE ? COLLATE NOCASE",
      "json_extract(row_context, '$.material') LIKE ? COLLATE NOCASE",
      "json_extract(row_context, '$.supplier') LIKE ? COLLATE NOCASE",
      "json_extract(row_context, '$.category') LIKE ? COLLATE NOCASE",
      "json_extract(payload, '$.material') LIKE ? COLLATE NOCASE",
      "json_extract(payload, '$.name') LIKE ? COLLATE NOCASE",
      "json_extract(old_snapshot, '$.material') LIKE ? COLLATE NOCASE",
      "json_extract(new_snapshot, '$.material') LIKE ? COLLATE NOCASE",
    ];
    values.push(...searchConditions.map(() => pattern));
    if (isUuid(searchTerm)) {
      searchConditions.push("id = ?", "correlation_id = ?", "target_row_id = ?", "estimate_node_id = ?");
      values.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    conditions.push(`(${searchConditions.join(" OR ")})`);
  }
  const cursor = lane === "sheet" ? input.sheetCursor : lane === "row" ? input.rowCursor : input.nodeCursor;
  if (cursor) {
    conditions.push("(created_at < ? OR (created_at = ? AND id < ?))");
    values.push(cursor.createdAt, cursor.createdAt, cursor.id);
  }
  if (lane === "row") {
    conditions.push("target_row_id = ?");
    values.push(input.targetRowId);
  }
  if (lane === "node") {
    if (input.includeDescendants && input.nodeScope) {
      const scopeConditions: string[] = [];
      if (input.nodeScope.nodeIds.length > 0) {
        scopeConditions.push(`estimate_node_id IN (${placeholders(input.nodeScope.nodeIds)})`);
        values.push(...input.nodeScope.nodeIds);
      }
      if (input.nodeScope.rowIds.length > 0) {
        scopeConditions.push(`target_row_id IN (${placeholders(input.nodeScope.rowIds)})`);
        values.push(...input.nodeScope.rowIds);
      }
      conditions.push(scopeConditions.length > 0 ? `(${scopeConditions.join(" OR ")})` : "0 = 1");
    } else {
      conditions.push("estimate_node_id = ?");
      values.push(input.targetNodeId);
    }
  }
  return {
    sql: `SELECT id, event_type, event_source, created_at, actor_user_id, estimate_tab_id,
                 target_row_id, estimate_node_id, row_context, old_snapshot, new_snapshot,
                 changed_fields, total_delta, payload, correlation_id
          FROM estimate_sheet_events
          WHERE ${conditions.join(" AND ")}
          ORDER BY created_at DESC, id DESC
          LIMIT ?`,
    values: [...values, input.eventLimit + 1],
  };
}

export async function prepareHistoryEventInsert(
  database: D1DatabaseLike,
  input: HistoryEventInput,
): Promise<PreparedHistoryEvent> {
  const existing = await firstD1Row<{ id: string }>(
    database,
    `
      SELECT id, payload
      FROM estimate_sheet_events
      WHERE estimate_id = ?
        AND correlation_id = ?
      LIMIT 1
    `,
    [input.estimateId, input.correlationId],
  );
  if (existing) return { eventId: existing.id, statement: null, outboxStatement: null };

  const project = input.workspaceId
    ? null
    : await readEstimateIntentProjectContext(database, input.projectId);
  const workspaceId = input.workspaceId ?? project?.workspaceId;
  if (!workspaceId) throw new Error("Estimate history event workspace could not be resolved.");
  const eventId = randomUUID();
  const createdAt = nowIso();
  return {
    eventId,
    statement: {
      sql: `
        INSERT INTO estimate_sheet_events (
          id,
          estimate_id,
          workspace_id,
          project_id,
          estimate_node_id,
          estimate_tab_id,
          target_row_id,
          event_type,
          event_source,
          correlation_id,
          actor_user_id,
          changed_fields,
          row_context,
          old_snapshot,
          new_snapshot,
          payload,
          metadata,
          total_delta,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      values: [
        eventId,
        input.estimateId,
        workspaceId,
        input.projectId,
        input.estimateNodeId ?? null,
        input.estimateTabId ?? null,
        input.targetRowId ?? null,
        input.eventType,
        "server_action",
        input.correlationId,
        input.actorUserId ?? null,
        JSON.stringify(input.changedFields ?? []),
        JSON.stringify(input.rowContext ?? {}),
        input.oldSnapshot === undefined ? null : JSON.stringify(input.oldSnapshot),
        input.newSnapshot === undefined ? null : JSON.stringify(input.newSnapshot),
        JSON.stringify(input.payload ?? {}),
        JSON.stringify(input.metadata ?? {}),
        input.totalDelta ?? null,
        createdAt,
      ],
    },
    outboxStatement: {
      sql: `
        INSERT INTO activity_event_outbox (
          id, workspace_id, event_id, status, attempt_count, available_at, created_at, updated_at
        )
        VALUES (?, ?, ?, 'pending', 0, ?, ?, ?)
        ON CONFLICT(event_id) DO NOTHING
      `,
      values: [randomUUID(), workspaceId, eventId, createdAt, createdAt, createdAt],
    },
  };
}

export async function insertHistoryEvent(
  database: D1DatabaseLike,
  input: HistoryEventInput,
): Promise<string> {
  const prepared = await prepareHistoryEventInsert(database, input);
  if (prepared.statement) {
    await runD1Batch(database, [prepared.statement, prepared.outboxStatement]);
  }
  return prepared.eventId;
}

export async function runMutationWithHistory(
  database: D1DatabaseLike,
  mutationStatements: readonly D1IntentStatement[],
  historyInput: HistoryEventInput,
  preparedStatements: readonly D1PreparedStatementLike[] = [],
): Promise<string> {
  const prepared = await prepareHistoryEventInsert(database, historyInput);
  const statements = prepared.statement
    ? [...mutationStatements, prepared.statement, prepared.outboxStatement]
    : [...mutationStatements];
  await runPreparedD1Batch(database, statements, preparedStatements);
  return prepared.eventId;
}

export async function readEstimateSheetVersionControl(
  database: D1DatabaseLike,
  input: NormalizedEstimateSheetVersionControlRead,
): Promise<EstimateSheetVersionControlData> {
  const readLane = async (lane: "sheet" | "row" | "node") => {
    const query = buildHistoryReadQuery(input, lane);
    return allD1Rows<EstimateHistoryEventRow>(database, query.sql, query.values);
  };
  const emptyRows = Promise.resolve<EstimateHistoryEventRow[]>([]);
  const [sheetRows, rowRows, nodeRows] = await Promise.all([
    input.fetchSheetEvents ? readLane("sheet") : emptyRows,
    input.targetRowId ? readLane("row") : emptyRows,
    input.targetNodeId ? readLane("node") : emptyRows,
  ]);
  const sheetPage = buildHistoryEventPageRows(sheetRows, input.eventLimit);
  const rowPage = buildHistoryEventPageRows(rowRows, input.eventLimit);
  const nodePage = buildHistoryEventPageRows(nodeRows, input.eventLimit);
  const actorProfiles = await readActivityActorProfiles(database, [
    ...sheetPage.rows,
    ...rowPage.rows,
    ...nodePage.rows,
  ]);

  return {
    events: sheetPage.rows.map((row) => normalizeHistoryEvent(row, actorProfiles)),
    rowEvents: rowPage.rows.map((row) => normalizeHistoryEvent(row, actorProfiles)),
    nodeEvents: nodePage.rows.map((row) => normalizeHistoryEvent(row, actorProfiles)),
    nextCursor: sheetPage.nextCursor,
    rowNextCursor: rowPage.nextCursor,
    nodeNextCursor: nodePage.nextCursor,
  };
}
