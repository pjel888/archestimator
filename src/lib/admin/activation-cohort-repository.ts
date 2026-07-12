import "server-only";

import { isPlatformAdmin } from "@/lib/auth/roles";
import type { CurrentUserContext } from "@/lib/auth/session";
import { getCloudflareD1Database, type D1DatabaseLike, type D1Value } from "@/lib/cloudflare/d1";
import { isActivationMilestone, type ActivationMilestone, type ActivationPath } from "@/lib/onboarding/activation-types";
import type { BetaOperatingFieldSnapshot } from "@/lib/admin/beta-operating-overview";

export const ACTIVATION_COHORT_QUERY_VERSION = "ACTIVATION-COHORT-QUERY-v1" as const;

export type ActivationCohortStalledState = "not_started" | "setup_stalled" | "value_stalled" | "handoff_stalled" | "active" | "completed";
export type ActivationCohortSupportState = "none" | "open" | "pending" | "resolved";

export type ActivationCohortRow = {
  userId: string;
  workspaceId: string;
  lastMilestone: ActivationMilestone | null;
  lastEventAt: string | null;
  createdAt: string;
  selectedPath: ActivationPath | null;
  project: { id: string; name: string } | null;
  stalledState: ActivationCohortStalledState;
  supportState: ActivationCohortSupportState;
  supportUpdatedAt: string | null;
};

export type ListActivationCohortInput = {
  cursor?: string | null;
  limit?: number;
  stage?: ActivationMilestone | null;
  stalledState?: ActivationCohortStalledState | null;
  supportState?: ActivationCohortSupportState | null;
  createdAfter?: string | null;
  createdBefore?: string | null;
  now?: Date;
};

export type ActivationCohortResult =
  | { status: "available"; rows: ActivationCohortRow[]; nextCursor: string | null }
  | { status: "unavailable"; rows: []; nextCursor: null };

export type ActivationCohortAggregateResult =
  | { status: "available"; fields: Readonly<Record<"invited" | "accepted" | "active" | "firstProject" | "firstPricedRow", BetaOperatingFieldSnapshot>> }
  | { status: "unavailable"; fields: Readonly<Record<"invited" | "accepted" | "active" | "firstProject" | "firstPricedRow", BetaOperatingFieldSnapshot>> };

type ActivationCohortCursor = { lastEventAt: string | null; userId: string };

type ActivationCohortDatabaseRow = {
  user_id: string;
  workspace_id: string;
  last_milestone: string | null;
  last_event_at: string | null;
  created_at: string;
  selected_path: ActivationPath | null;
  project_id: string | null;
  project_name: string | null;
  stalled_state: ActivationCohortStalledState;
  support_state: ActivationCohortSupportState;
  support_updated_at: string | null;
};

type ActivationCohortAggregateRow = {
  invited: number | string;
  accepted: number | string;
  active: number | string;
  first_project: number | string;
  first_priced_row: number | string;
};

const STALLED_STATES = new Set<ActivationCohortStalledState>([
  "not_started",
  "setup_stalled",
  "value_stalled",
  "handoff_stalled",
  "active",
  "completed",
]);
const SUPPORT_STATES = new Set<ActivationCohortSupportState>(["none", "open", "pending", "resolved"]);

export class ActivationCohortRepositoryError extends Error {
  constructor(readonly code: "activation_cohort_access_denied" | "activation_cohort_invalid_input", message: string) {
    super(message);
    this.name = "ActivationCohortRepositoryError";
  }
}

export async function listActivationCohortForPlatformAdmin(
  context: Pick<CurrentUserContext, "email" | "role"> | null,
  input: ListActivationCohortInput = {},
  dbOverride?: D1DatabaseLike,
): Promise<ActivationCohortResult> {
  if (!context || !isPlatformAdmin(context)) {
    throw new ActivationCohortRepositoryError("activation_cohort_access_denied", "Platform admin access is required for activation cohort data.");
  }
  return listActivationCohort(input, dbOverride);
}

const ACTIVATION_COHORT_AGGREGATE_KEYS = ["invited", "accepted", "active", "firstProject", "firstPricedRow"] as const;

function unavailableAggregateFields() {
  return Object.fromEntries(ACTIVATION_COHORT_AGGREGATE_KEYS.map((key) => [key, {
    availability: "unavailable" as const,
    asOf: null,
    errorCategory: "source_unavailable" as const,
    value: undefined,
  }])) as Record<(typeof ACTIVATION_COHORT_AGGREGATE_KEYS)[number], BetaOperatingFieldSnapshot>;
}

function aggregateFields(row: ActivationCohortAggregateRow, asOf: string) {
  const values = {
    invited: Number(row.invited),
    accepted: Number(row.accepted),
    active: Number(row.active),
    firstProject: Number(row.first_project),
    firstPricedRow: Number(row.first_priced_row),
  };
  if (Object.values(values).some((value) => !Number.isSafeInteger(value) || value < 0)) return null;
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, {
    availability: "available" as const,
    asOf,
    errorCategory: null,
    value,
  }])) as Record<(typeof ACTIVATION_COHORT_AGGREGATE_KEYS)[number], BetaOperatingFieldSnapshot>;
}

export async function getActivationCohortAggregateForPlatformAdmin(
  context: Pick<CurrentUserContext, "email" | "role"> | null,
  dbOverride?: D1DatabaseLike,
): Promise<ActivationCohortAggregateResult> {
  if (!context || !isPlatformAdmin(context)) {
    throw new ActivationCohortRepositoryError("activation_cohort_access_denied", "Platform admin access is required for activation cohort data.");
  }

  const database = dbOverride ?? await getCloudflareD1Database();
  if (!database) return { status: "unavailable", fields: unavailableAggregateFields() };

  try {
    const row = await database.prepare<ActivationCohortAggregateRow>(`
      SELECT
        (SELECT COUNT(*) FROM closed_beta_allowed_emails WHERE invited_at IS NOT NULL) AS invited,
        (SELECT COUNT(*) FROM closed_beta_allowed_emails WHERE accepted_at IS NOT NULL) AS accepted,
        (SELECT COUNT(*) FROM closed_beta_allowed_emails WHERE status = 'active') AS active,
        (SELECT COUNT(*) FROM beta_activation_progress
          WHERE last_milestone IN ('project_created', 'first_area_created', 'first_row_priced', 'first_valid_total', 'health_reviewed', 'export_completed', 'publication_created', 'recipient_opened', 'recipient_engaged', 'recipient_decided')) AS first_project,
        (SELECT COUNT(*) FROM beta_activation_progress
          WHERE last_milestone IN ('first_row_priced', 'first_valid_total', 'health_reviewed', 'export_completed', 'publication_created', 'recipient_opened', 'recipient_engaged', 'recipient_decided')) AS first_priced_row
    `).first<ActivationCohortAggregateRow>();
    const fields = row ? aggregateFields(row, new Date().toISOString()) : null;
    return fields
      ? { status: "available", fields }
      : { status: "unavailable", fields: unavailableAggregateFields() };
  } catch {
    return { status: "unavailable", fields: unavailableAggregateFields() };
  }
}

function assertOptionalIso(value: string | null | undefined, label: string) {
  if (value && Number.isNaN(Date.parse(value))) {
    throw new ActivationCohortRepositoryError("activation_cohort_invalid_input", `${label} must be an ISO timestamp.`);
  }
}

function normalizeLimit(limit: number | undefined) {
  if (limit === undefined) return 50;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new ActivationCohortRepositoryError("activation_cohort_invalid_input", "limit must be an integer from 1 through 100.");
  }
  return limit;
}

function decodeCursor(cursor: string | null | undefined): ActivationCohortCursor | null {
  if (!cursor) return null;
  try {
    const decoded = JSON.parse(atob(cursor.replace(/-/g, "+").replace(/_/g, "/"))) as Partial<ActivationCohortCursor>;
    if (typeof decoded.userId !== "string" || !decoded.userId || (decoded.lastEventAt !== null && typeof decoded.lastEventAt !== "string")) {
      throw new Error("Invalid cursor payload.");
    }
    if (typeof decoded.lastEventAt === "string" && Number.isNaN(Date.parse(decoded.lastEventAt))) throw new Error("Invalid cursor timestamp.");
    return { lastEventAt: decoded.lastEventAt ?? null, userId: decoded.userId };
  } catch {
    throw new ActivationCohortRepositoryError("activation_cohort_invalid_input", "cursor is invalid.");
  }
}

function encodeCursor(row: ActivationCohortDatabaseRow) {
  return btoa(JSON.stringify({ lastEventAt: row.last_event_at, userId: row.user_id }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function validateInput(input: ListActivationCohortInput) {
  if (input.stage && !isActivationMilestone(input.stage)) {
    throw new ActivationCohortRepositoryError("activation_cohort_invalid_input", "stage is invalid.");
  }
  if (input.stalledState && !STALLED_STATES.has(input.stalledState)) {
    throw new ActivationCohortRepositoryError("activation_cohort_invalid_input", "stalledState is invalid.");
  }
  if (input.supportState && !SUPPORT_STATES.has(input.supportState)) {
    throw new ActivationCohortRepositoryError("activation_cohort_invalid_input", "supportState is invalid.");
  }
  assertOptionalIso(input.createdAfter, "createdAfter");
  assertOptionalIso(input.createdBefore, "createdBefore");
  if (input.createdAfter && input.createdBefore && input.createdAfter > input.createdBefore) {
    throw new ActivationCohortRepositoryError("activation_cohort_invalid_input", "createdAfter must not be after createdBefore.");
  }
}

function mapRow(row: ActivationCohortDatabaseRow): ActivationCohortRow {
  return {
    userId: row.user_id,
    workspaceId: row.workspace_id,
    lastMilestone: row.last_milestone && isActivationMilestone(row.last_milestone) ? row.last_milestone : null,
    lastEventAt: row.last_event_at,
    createdAt: row.created_at,
    selectedPath: row.selected_path,
    project: row.project_id && row.project_name ? { id: row.project_id, name: row.project_name } : null,
    stalledState: row.stalled_state,
    supportState: row.support_state,
    supportUpdatedAt: row.support_updated_at,
  };
}

export async function listActivationCohort(
  input: ListActivationCohortInput = {},
  dbOverride?: D1DatabaseLike,
): Promise<ActivationCohortResult> {
  validateInput(input);
  const limit = normalizeLimit(input.limit);
  const cursor = decodeCursor(input.cursor);
  const now = (input.now ?? new Date()).toISOString();
  const setupThreshold = new Date(Date.parse(now) - 24 * 60 * 60 * 1000).toISOString();
  const valueThreshold = new Date(Date.parse(now) - 72 * 60 * 60 * 1000).toISOString();
  const values: D1Value[] = [valueThreshold, valueThreshold, setupThreshold, setupThreshold];
  const filters: string[] = [];

  if (input.stage) {
    filters.push("last_milestone = ?");
    values.push(input.stage);
  }
  if (input.stalledState) {
    filters.push("stalled_state = ?");
    values.push(input.stalledState);
  }
  if (input.supportState) {
    filters.push("support_state = ?");
    values.push(input.supportState);
  }
  if (input.createdAfter) {
    filters.push("created_at >= ?");
    values.push(input.createdAfter);
  }
  if (input.createdBefore) {
    filters.push("created_at <= ?");
    values.push(input.createdBefore);
  }
  if (cursor?.lastEventAt === null) {
    filters.push("last_event_at IS NULL AND user_id < ?");
    values.push(cursor.userId);
  } else if (cursor) {
    filters.push("(last_event_at < ? OR (last_event_at = ? AND user_id < ?) OR last_event_at IS NULL)");
    values.push(cursor.lastEventAt, cursor.lastEventAt, cursor.userId);
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
  const database = dbOverride ?? await getCloudflareD1Database();
  if (!database) return { status: "unavailable", rows: [], nextCursor: null };

  try {
    const result = await database.prepare<ActivationCohortDatabaseRow>(`
      WITH latest_support AS (
        SELECT
          conversation.user_id,
          conversation.status,
          conversation.last_message_at,
          ROW_NUMBER() OVER (
            PARTITION BY conversation.user_id
            ORDER BY conversation.last_message_at DESC, conversation.id DESC
          ) AS support_rank
        FROM support_conversations AS conversation
      ), cohort_rows AS (
        SELECT
          progress.user_id,
          progress.workspace_id,
          progress.last_milestone,
          progress.last_event_at,
          progress.created_at,
          progress.selected_path,
          project.id AS project_id,
          project.name AS project_name,
          CASE
            WHEN progress.last_milestone = 'recipient_decided' THEN 'completed'
            WHEN progress.last_milestone = 'publication_created' AND progress.last_event_at <= ? THEN 'handoff_stalled'
            WHEN progress.last_milestone = 'first_valid_total' AND progress.last_event_at <= ? THEN 'value_stalled'
            WHEN progress.last_milestone IN ('project_created', 'first_area_created', 'first_row_priced') AND progress.last_event_at <= ? THEN 'setup_stalled'
            WHEN progress.last_milestone = 'workspace_ready' AND progress.project_id IS NULL AND progress.last_event_at <= ? THEN 'not_started'
            ELSE 'active'
          END AS stalled_state,
          CASE latest_support.status
            WHEN 'open' THEN 'open'
            WHEN 'pending' THEN 'pending'
            WHEN 'resolved' THEN 'resolved'
            ELSE 'none'
          END AS support_state,
          latest_support.last_message_at AS support_updated_at
        FROM beta_activation_progress AS progress
        LEFT JOIN projects AS project
          ON project.id = progress.project_id
          AND project.workspace_id = progress.workspace_id
        LEFT JOIN latest_support
          ON latest_support.user_id = progress.user_id
          AND latest_support.support_rank = 1
      )
      SELECT
        user_id, workspace_id, last_milestone, last_event_at, created_at, selected_path,
        project_id, project_name, stalled_state, support_state, support_updated_at
      FROM cohort_rows
      ${whereClause}
      ORDER BY last_event_at DESC, user_id DESC
      LIMIT ?
    `).bind(...values, limit).all<ActivationCohortDatabaseRow>();
    if (result.success === false) return { status: "unavailable", rows: [], nextCursor: null };
    const rows = result.results ?? [];
    return {
      status: "available",
      rows: rows.map(mapRow),
      nextCursor: rows.length === limit ? encodeCursor(rows[rows.length - 1]!) : null,
    };
  } catch {
    return { status: "unavailable", rows: [], nextCursor: null };
  }
}
