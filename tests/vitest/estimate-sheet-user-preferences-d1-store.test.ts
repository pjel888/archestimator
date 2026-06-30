import { describe, expect, it } from "vitest";

import type { CurrentUserContext } from "@/lib/auth/session";
import {
  getEstimatePreferenceContextFromD1,
  loadEstimateSheetUserPreferencesFromD1,
  saveEstimateSheetUserPreferencesInD1,
} from "@/lib/estimate-sheet/user-preferences-d1-store";

type PreferenceRow = {
  column_widths_json: string;
  created_at: string;
  estimate_id: string;
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
    if (normalizedSql.includes("from estimates e") && normalizedSql.includes("join projects p")) {
      const [estimateId, platformAdminFlag, sheetUserId, projectUserId] = this.values.map(String);
      const estimate = this.database.estimates.get(estimateId);
      const project = estimate ? this.database.projects.get(estimate.project_id) : null;
      if (!estimate || !project) return null;
      const inheritsProjectAccess = this.database.accessSettings.get(estimateId) ?? true;
      const hasSheetAccess = this.database.estimateMembers.has(`${estimateId}:${sheetUserId}`);
      const hasProjectAccess = inheritsProjectAccess && this.database.projectMembers.has(`${estimate.project_id}:${projectUserId}`);
      if (platformAdminFlag === "1" || hasSheetAccess || hasProjectAccess) {
        return { workspace_id: project.workspace_id } as R;
      }
      return null;
    }
    if (normalizedSql.includes("from estimate_sheet_user_preferences")) {
      const [userId, workspaceId, estimateId] = this.values.map(String);
      return (this.database.preferences.get(`${userId}:${workspaceId}:${estimateId}`) ?? null) as R | null;
    }
    return null;
  }

  async all<R>() {
    return { results: [] as R[] };
  }

  async run() {
    const normalizedSql = this.sql.toLowerCase();
    if (normalizedSql.includes("insert into estimate_sheet_user_preferences")) {
      const [userId, workspaceId, estimateId, columnWidthsJson, createdAt, updatedAt] = this.values.map(String);
      const key = `${userId}:${workspaceId}:${estimateId}`;
      const existing = this.database.preferences.get(key);
      this.database.preferences.set(key, {
        column_widths_json: columnWidthsJson,
        created_at: existing?.created_at ?? createdAt,
        estimate_id: estimateId,
        updated_at: updatedAt,
        user_id: userId,
        workspace_id: workspaceId,
      });
    }
    return { success: true, meta: { changes: 1 } };
  }
}

class FakeD1Database {
  accessSettings = new Map<string, boolean>();
  estimateMembers = new Map<string, { role: string }>();
  estimates = new Map<string, { id: string; project_id: string }>();
  preferences = new Map<string, PreferenceRow>();
  projectMembers = new Map<string, { role: string }>();
  projects = new Map<string, { id: string; workspace_id: string }>();

  prepare(sql: string) {
    return new FakeD1Statement(this, sql);
  }
}

function createDatabase() {
  const database = new FakeD1Database();
  database.projects.set("project-1", { id: "project-1", workspace_id: "workspace-1" });
  database.estimates.set("estimate-1", { id: "estimate-1", project_id: "project-1" });
  return database;
}

function user(overrides: Partial<CurrentUserContext> = {}): CurrentUserContext {
  return {
    avatarUrl: null,
    displayName: "Member",
    email: "member@example.test",
    profile: {
      avatar_url: null,
      created_at: "2026-07-01T00:00:00.000Z",
      default_workspace_id: "workspace-1",
      display_name: "Member",
      email: "member@example.test",
      id: "user-1",
      role: "member",
      updated_at: "2026-07-01T00:00:00.000Z",
    },
    role: "member",
    userId: "user-1",
    ...overrides,
  };
}

describe("Cloudflare D1 estimate sheet user preferences store", () => {
  it("requires estimate access before returning a preference context", async () => {
    const database = createDatabase();

    await expect(getEstimatePreferenceContextFromD1(database, "estimate-1", user())).resolves.toBeNull();

    database.projectMembers.set("project-1:user-1", { role: "viewer" });
    await expect(getEstimatePreferenceContextFromD1(database, "estimate-1", user())).resolves.toEqual({
      estimateId: "estimate-1",
      userId: "user-1",
      workspaceId: "workspace-1",
    });
  });

  it("honors explicit estimate-sheet access when project inheritance is disabled", async () => {
    const database = createDatabase();
    database.accessSettings.set("estimate-1", false);
    database.projectMembers.set("project-1:user-1", { role: "viewer" });

    await expect(getEstimatePreferenceContextFromD1(database, "estimate-1", user())).resolves.toBeNull();

    database.estimateMembers.set("estimate-1:user-1", { role: "viewer" });
    await expect(getEstimatePreferenceContextFromD1(database, "estimate-1", user())).resolves.toMatchObject({
      workspaceId: "workspace-1",
    });
  });

  it("saves and loads normalized column widths", async () => {
    const database = createDatabase();
    const context = { estimateId: "estimate-1", userId: "user-1", workspaceId: "workspace-1" };

    await saveEstimateSheetUserPreferencesInD1(database, context, {
      material: 280,
      quantity: 96,
      subTotal: 160,
    });

    await expect(loadEstimateSheetUserPreferencesFromD1(database, context)).resolves.toMatchObject({
      columnWidths: {
        material: 280,
        quantity: 96,
        subTotal: 160,
      },
    });
  });

  it("allows platform admins through the same D1 guard", async () => {
    const database = createDatabase();

    await expect(getEstimatePreferenceContextFromD1(database, "estimate-1", user({ role: "admin" }))).resolves.toMatchObject({
      workspaceId: "workspace-1",
    });
  });
});
