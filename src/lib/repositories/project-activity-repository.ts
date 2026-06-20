import { cache } from "react";

import { composeEstimateActivity } from "@/lib/activity";
import { isUuid } from "@/lib/ids";
import { getCurrentWorkspaceProject } from "@/lib/repositories/workspace-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json, Tables } from "@/lib/supabase/types";

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

type ProjectActivityEstimate = {
  id: string;
  name: string | null;
  sheet_code: string | null;
};

type ProjectActivityEventRow = Pick<
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
  | "row_context"
  | "target_row_id"
  | "total_delta"
> & {
  estimates?: ProjectActivityEstimate | ProjectActivityEstimate[] | null;
};

type ActorProfileRow = {
  id: string;
  display_name: string | null;
  email: string | null;
};

const PROJECT_ACTIVITY_DEFAULT_LIMIT = 20;
const PROJECT_ACTIVITY_MAX_LIMIT = 50;
const DORMANT_NAMED_VERSION_EVENT_TYPES = ["sheet_version_created", "sheet_restored_as_copy"] as const;

const PROJECT_ACTIVITY_SELECT = [
  "id",
  "event_type",
  "event_source",
  "created_at",
  "actor_user_id",
  "estimate_id",
  "estimate_tab_id",
  "target_row_id",
  "estimate_node_id",
  "row_context",
  "old_snapshot",
  "new_snapshot",
  "changed_fields",
  "total_delta",
  "payload",
  "correlation_id",
  "estimates!estimate_sheet_events_estimate_project_fkey(id, name, sheet_code)",
].join(", ");

function readPostgresErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function readErrorMessage(error: unknown) {
  if (!error || typeof error !== "object" || !("message" in error)) return "";
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" ? message : "";
}

function isProjectActivitySchemaUnavailable(error: unknown) {
  const code = readPostgresErrorCode(error);
  const message = readErrorMessage(error);
  return code === "42703" && message.includes("project_id");
}

function warnProjectActivitySchemaUnavailable() {
  console.warn("[project-dashboard] Project activity schema is unavailable; apply migration 20260619105250.");
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

function buildProjectActivityCursorFilter(cursor: ProjectActivityCursor) {
  return `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`;
}

function asRecord(value: Json | null): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asStringArray(value: string[] | null | undefined) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
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
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  rows: ProjectActivityEventRow[],
) {
  const actorUserIds = Array.from(new Set(rows.map((row) => row.actor_user_id).filter((id): id is string => Boolean(id))));
  if (!actorUserIds.length) return new Map<string, string>();

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, email")
      .in("id", actorUserIds);

    if (error) return new Map<string, string>();

    return new Map(
      ((data ?? []) as ActorProfileRow[])
        .map((profile) => [
          profile.id,
          readActorLabel(profile.display_name) ?? readActorEmailLabel(profile.email) ?? fallbackActorLabel(profile.id),
        ] as const),
    );
  } catch {
    return new Map<string, string>();
  }
}

function readEstimate(row: ProjectActivityEventRow): ProjectActivityEstimate {
  const value = Array.isArray(row.estimates) ? row.estimates[0] : row.estimates;
  return {
    id: value?.id ?? row.estimate_id,
    name: value?.name ?? null,
    sheet_code: value?.sheet_code ?? null,
  };
}

function toProjectActivityItem(
  projectId: string,
  row: ProjectActivityEventRow,
  actorLabels: Map<string, string>,
): ProjectActivityItem {
  const actorUserId = row.actor_user_id;
  const actorLabel = actorUserId ? actorLabels.get(actorUserId) ?? fallbackActorLabel(actorUserId) : fallbackActorLabel(null);
  const estimate = readEstimate(row);
  const activity = composeEstimateActivity({
    id: row.id,
    eventType: row.event_type,
    eventSource: row.event_source,
    createdAt: row.created_at,
    actorUserId,
    actorLabel,
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
  });

  const estimateName = estimate.name?.trim() || "Deleted estimate";

  return {
    id: activity.id,
    createdAt: activity.occurredAt,
    actorLabel: activity.actor.displayName,
    title: activity.title,
    summary: activity.summary ?? null,
    targetLabel: activity.target.label,
    targetKind: activity.target.kind,
    estimateId: estimate.id,
    estimateName,
    sheetCode: estimate.sheet_code,
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
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("estimate_sheet_events")
    .select(PROJECT_ACTIVITY_SELECT)
    .eq("project_id", project.id)
    .not("event_type", "in", `(${DORMANT_NAMED_VERSION_EVENT_TYPES.join(",")})`)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(safeLimit + 1);

  if (normalizedCursor) {
    query = query.or(buildProjectActivityCursorFilter(normalizedCursor));
  }

  const { data, error } = await query;
  if (error) {
    if (isProjectActivitySchemaUnavailable(error)) {
      warnProjectActivitySchemaUnavailable();
      return createEmptyProjectActivityPage();
    }
    throw error;
  }

  const eventRows = (data ?? []) as unknown as ProjectActivityEventRow[];
  const rows = eventRows.slice(0, safeLimit);
  const nextRow = eventRows[safeLimit];
  const actorLabels = await resolveProjectActivityActorLabels(supabase, rows);

  return {
    items: rows.map((row) => toProjectActivityItem(project.id, row, actorLabels)),
    nextCursor: nextRow ? { createdAt: rows.at(-1)?.created_at ?? nextRow.created_at, id: rows.at(-1)?.id ?? nextRow.id } : null,
  };
});
