import { describe, expect, it } from "vitest";

import {
  loadComponentLibraryUserPreferencesFromD1,
  recordComponentLibraryTelemetryEventInD1,
  saveComponentLibraryUserPreferencesInD1,
} from "@/lib/component-library/d1-store";

type TelemetryRow = {
  actor_user_id: string;
  event_name: string;
  payload_json: string;
  workspace_id: string | null;
};

type PreferenceRow = {
  active_tab: string;
  component_view_mode: string;
  created_at: string;
  favorite_item_ids_json: string;
  recent_item_ids_json: string;
  tree_order_json: string;
  updated_at: string;
  user_id: string;
  workspace_id: string;
};

class FakeD1Statement {
  private values: unknown[] = [];

  constructor(
    private readonly database: FakeD1Database,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  async first<R>() {
    const normalizedSql = this.sql.toLowerCase();
    if (normalizedSql.includes("from component_library_user_preferences")) {
      const [userId, workspaceId] = this.values.map(String);
      return (this.database.preferences.get(`${userId}:${workspaceId}`) ?? null) as R | null;
    }
    return null;
  }

  async all<R>() {
    return { results: [] as R[] };
  }

  async run() {
    const normalizedSql = this.sql.toLowerCase();
    if (normalizedSql.includes("insert into component_library_telemetry_events")) {
      const [
        ,
        actorUserId,
        workspaceId,
        ,
        ,
        eventName,
        ,
        ,
        ,
        ,
        ,
        ,
        payloadJson,
      ] = this.values;
      this.database.telemetry.push({
        actor_user_id: String(actorUserId),
        event_name: String(eventName),
        payload_json: String(payloadJson),
        workspace_id: workspaceId as string | null,
      });
    }
    if (normalizedSql.includes("insert into component_library_user_preferences")) {
      const [
        userId,
        workspaceId,
        activeTab,
        componentViewMode,
        favoriteItemIdsJson,
        recentItemIdsJson,
        treeOrderJson,
        createdAt,
        updatedAt,
      ] = this.values;
      const key = `${String(userId)}:${String(workspaceId)}`;
      const existing = this.database.preferences.get(key);
      this.database.preferences.set(key, {
        active_tab: String(activeTab),
        component_view_mode: String(componentViewMode),
        created_at: existing?.created_at ?? String(createdAt),
        favorite_item_ids_json: String(favoriteItemIdsJson),
        recent_item_ids_json: String(recentItemIdsJson),
        tree_order_json: String(treeOrderJson),
        updated_at: String(updatedAt),
        user_id: String(userId),
        workspace_id: String(workspaceId),
      });
    }
    return { success: true, meta: { changes: 1 } };
  }
}

class FakeD1Database {
  preferences = new Map<string, PreferenceRow>();
  telemetry: TelemetryRow[] = [];

  prepare(sql: string) {
    return new FakeD1Statement(this, sql);
  }
}

describe("Cloudflare D1 component-library preference and telemetry store", () => {
  it("records sanitized telemetry payloads into D1 JSON text", async () => {
    const database = new FakeD1Database();

    await recordComponentLibraryTelemetryEventInD1(database, {
      action: "opened",
      actorUserId: "user-1",
      estimateId: null,
      eventName: "library_template_opened",
      kind: "template",
      payload: { surface: "templates", count: 2 },
      projectId: null,
      reason: null,
      resourceKind: "template",
      schemaVersion: "v1",
      surface: "templates",
      workspaceId: "workspace-1",
    });

    expect(database.telemetry).toEqual([{
      actor_user_id: "user-1",
      event_name: "library_template_opened",
      payload_json: "{\"surface\":\"templates\",\"count\":2}",
      workspace_id: "workspace-1",
    }]);
  });

  it("upserts and loads component-library user preferences from D1", async () => {
    const database = new FakeD1Database();

    await saveComponentLibraryUserPreferencesInD1(database, {
      activeTab: "templates",
      componentViewMode: "brand",
      favoriteItemIds: ["component-1"],
      recentItemIds: ["template-1"],
      treeOrder: { default: {}, suppliers: {}, brand: { folder: ["component-1"] } },
      userId: "user-1",
      workspaceId: "workspace-1",
    });

    await expect(loadComponentLibraryUserPreferencesFromD1(database, {
      userId: "user-1",
      workspaceId: "workspace-1",
    })).resolves.toMatchObject({
      active_tab: "templates",
      component_view_mode: "brand",
      favorite_item_ids: ["component-1"],
      recent_item_ids: ["template-1"],
      tree_order: { brand: { folder: ["component-1"] } },
    });
  });
});
