import "server-only";

import { randomUUID } from "node:crypto";

import { getCloudflareD1Database, type D1DatabaseLike } from "@/lib/cloudflare/d1";

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ComponentLibraryTelemetryD1Record = {
  actorUserId: string;
  workspaceId: string | null;
  projectId: string | null;
  estimateId: string | null;
  eventName: string;
  schemaVersion: "v1";
  surface: string | null;
  kind: string | null;
  resourceKind: string | null;
  action: string | null;
  reason: string | null;
  payload: Record<string, Json | undefined>;
};

export type ComponentLibraryUserPreferenceD1Record = {
  userId: string;
  workspaceId: string;
  activeTab: "components" | "project" | "templates";
  componentViewMode: "default" | "suppliers" | "brand";
  favoriteItemIds: string[];
  recentItemIds: string[];
  treeOrder: Record<string, Record<string, string[]>>;
};

export type ComponentLibraryUserPreferenceD1Row = {
  active_tab: string | null;
  component_view_mode: string | null;
  favorite_item_ids: unknown;
  recent_item_ids: unknown;
  tree_order: unknown;
  updated_at: string | null;
};

function nowIso() {
  return new Date().toISOString();
}

function jsonObject(value: Record<string, Json | undefined>) {
  return JSON.stringify(value);
}

function jsonArray(values: string[]) {
  return JSON.stringify(values);
}

function parseJson(value: string | null | undefined, fallback: unknown) {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return fallback;
  }
}

export async function recordComponentLibraryTelemetryEventInD1(
  db: D1DatabaseLike,
  record: ComponentLibraryTelemetryD1Record,
) {
  await db
    .prepare(
      `
        INSERT INTO component_library_telemetry_events (
          id,
          actor_user_id,
          workspace_id,
          project_id,
          estimate_id,
          event_name,
          schema_version,
          surface,
          kind,
          resource_kind,
          action,
          reason,
          payload_json,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .bind(
      randomUUID(),
      record.actorUserId,
      record.workspaceId,
      record.projectId,
      record.estimateId,
      record.eventName,
      record.schemaVersion,
      record.surface,
      record.kind,
      record.resourceKind,
      record.action,
      record.reason,
      jsonObject(record.payload),
      nowIso(),
    )
    .run();
}

export async function recordComponentLibraryTelemetryEventInCloudflareD1(
  record: ComponentLibraryTelemetryD1Record,
) {
  const db = await getCloudflareD1Database();
  if (!db) throw new Error("Something went wrong. Try again in a moment.");
  return recordComponentLibraryTelemetryEventInD1(db, record);
}

export async function loadComponentLibraryUserPreferencesFromD1(
  db: D1DatabaseLike,
  input: { userId: string; workspaceId: string },
): Promise<ComponentLibraryUserPreferenceD1Row | null> {
  const row = await db
    .prepare<{
      active_tab: string | null;
      component_view_mode: string | null;
      favorite_item_ids_json: string | null;
      recent_item_ids_json: string | null;
      tree_order_json: string | null;
      updated_at: string | null;
    }>(
      `
        SELECT
          active_tab,
          component_view_mode,
          favorite_item_ids_json,
          recent_item_ids_json,
          tree_order_json,
          updated_at
        FROM component_library_user_preferences
        WHERE user_id = ?
          AND workspace_id = ?
        LIMIT 1
      `,
    )
    .bind(input.userId, input.workspaceId)
    .first<{
      active_tab: string | null;
      component_view_mode: string | null;
      favorite_item_ids_json: string | null;
      recent_item_ids_json: string | null;
      tree_order_json: string | null;
      updated_at: string | null;
    }>();

  return row
    ? {
      active_tab: row.active_tab,
      component_view_mode: row.component_view_mode,
      favorite_item_ids: parseJson(row.favorite_item_ids_json, []),
      recent_item_ids: parseJson(row.recent_item_ids_json, []),
      tree_order: parseJson(row.tree_order_json, {}),
      updated_at: row.updated_at,
    }
    : null;
}

export async function loadComponentLibraryUserPreferencesFromCloudflareD1(input: { userId: string; workspaceId: string }) {
  const db = await getCloudflareD1Database();
  if (!db) throw new Error("Something went wrong. Try again in a moment.");
  return loadComponentLibraryUserPreferencesFromD1(db, input);
}

export async function saveComponentLibraryUserPreferencesInD1(
  db: D1DatabaseLike,
  record: ComponentLibraryUserPreferenceD1Record,
) {
  const timestamp = nowIso();
  await db
    .prepare(
      `
        INSERT INTO component_library_user_preferences (
          user_id,
          workspace_id,
          active_tab,
          component_view_mode,
          favorite_item_ids_json,
          recent_item_ids_json,
          tree_order_json,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, workspace_id) DO UPDATE SET
          active_tab = excluded.active_tab,
          component_view_mode = excluded.component_view_mode,
          favorite_item_ids_json = excluded.favorite_item_ids_json,
          recent_item_ids_json = excluded.recent_item_ids_json,
          tree_order_json = excluded.tree_order_json,
          updated_at = excluded.updated_at
      `,
    )
    .bind(
      record.userId,
      record.workspaceId,
      record.activeTab,
      record.componentViewMode,
      jsonArray(record.favoriteItemIds),
      jsonArray(record.recentItemIds),
      JSON.stringify(record.treeOrder),
      timestamp,
      timestamp,
    )
    .run();
}

export async function saveComponentLibraryUserPreferencesInCloudflareD1(record: ComponentLibraryUserPreferenceD1Record) {
  const db = await getCloudflareD1Database();
  if (!db) throw new Error("Something went wrong. Try again in a moment.");
  return saveComponentLibraryUserPreferencesInD1(db, record);
}
