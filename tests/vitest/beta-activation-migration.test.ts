import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

const requireRuntime = createRequire(import.meta.url);
const activationMigration = readFileSync("migrations/0067_beta_activation_events.sql", "utf8");

type LocalSqliteDatabase = {
  exec(sql: string): void;
  prepare(sql: string): {
    all(...parameters: unknown[]): Record<string, unknown>[];
    get(...parameters: unknown[]): Record<string, unknown> | undefined;
    run(...parameters: unknown[]): unknown;
  };
  close(): void;
};

function createDatabase() {
  const { DatabaseSync } = requireRuntime("node:sqlite") as {
    DatabaseSync: new (path: string) => LocalSqliteDatabase;
  };
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON;");
  database.exec(readFileSync("migrations/0007_collaboration_invitations.sql", "utf8"));
  database.exec(readFileSync("migrations/0013_collaboration_management_sidecars.sql", "utf8"));
  database.exec(activationMigration);
  return database;
}

function seedTenant(database: LocalSqliteDatabase, suffix: string) {
  const now = "2026-07-11T00:00:00.000Z";
  const workspaceId = `workspace-${suffix}`;
  const userId = `user-${suffix}`;
  const projectId = `project-${suffix}`;
  const estimateId = `estimate-${suffix}`;
  database.prepare("INSERT INTO workspaces (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)")
    .run(workspaceId, workspaceId, now, now);
  database.prepare("INSERT INTO workspace_members (workspace_id, user_id, role, created_at, updated_at) VALUES (?, ?, 'member', ?, ?)")
    .run(workspaceId, userId, now, now);
  database.prepare("INSERT INTO projects (id, workspace_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
    .run(projectId, workspaceId, projectId, now, now);
  database.prepare("INSERT INTO estimates (id, project_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
    .run(estimateId, projectId, estimateId, now, now);
  return { estimateId, projectId, userId, workspaceId };
}

describe("beta activation D1 migration", () => {
  it("creates the tenant-scoped activation tables and expected query indexes", () => {
    const database = createDatabase();
    try {
      const tables = database.prepare(`
        SELECT name FROM sqlite_master
        WHERE type = 'table' AND name LIKE 'beta_activation_%'
        ORDER BY name
      `).all().map((row) => row.name);
      const indexes = database.prepare(`
        SELECT name FROM sqlite_master
        WHERE type = 'index' AND tbl_name LIKE 'beta_activation_%'
        ORDER BY name
      `).all().map((row) => row.name);

      expect(tables).toEqual([
        "beta_activation_events",
        "beta_activation_outbox",
        "beta_activation_progress",
        "beta_activation_retention_holds",
      ]);
      expect(indexes).toEqual(expect.arrayContaining([
        "idx_beta_activation_events_milestone_occurred",
        "idx_beta_activation_events_user_workspace_occurred",
        "idx_beta_activation_outbox_lease_expires",
        "idx_beta_activation_outbox_state_next_attempt",
        "idx_beta_activation_progress_milestone_event",
        "idx_beta_activation_retention_holds_active",
      ]));
      expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      database.close();
    }
  });

  it("keeps dedupe tenant-scoped and rejects mismatched resource chains", () => {
    const database = createDatabase();
    try {
      const first = seedTenant(database, "a");
      const second = seedTenant(database, "b");
      const now = "2026-07-11T00:00:00.000Z";
      const insert = database.prepare(`
        INSERT INTO beta_activation_events (
          id, user_id, workspace_id, project_id, estimate_id, milestone, source,
          occurred_at, dedupe_key, metadata_json, created_at
        ) VALUES (?, ?, ?, ?, ?, 'project_created', 'project', ?, ?, '{}', ?)
      `);

      insert.run("event-a", first.userId, first.workspaceId, first.projectId, first.estimateId, now, "same-nonce", now);
      insert.run("event-b", second.userId, second.workspaceId, second.projectId, second.estimateId, now, "same-nonce", now);
      expect(() => insert.run(
        "event-mismatch",
        first.userId,
        first.workspaceId,
        second.projectId,
        second.estimateId,
        now,
        "cross-tenant-resource",
        now,
      )).toThrow();
    } finally {
      database.close();
    }
  });

  it("requires activation lifecycle erasure before deleting a membership", () => {
    const database = createDatabase();
    try {
      const tenant = seedTenant(database, "a");
      const now = "2026-07-11T00:00:00.000Z";
      database.prepare(`
        INSERT INTO beta_activation_progress (user_id, workspace_id, last_milestone, created_at, updated_at)
        VALUES (?, ?, 'workspace_ready', ?, ?)
      `).run(tenant.userId, tenant.workspaceId, now, now);

      expect(() => database.prepare(
        "DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?",
      ).run(tenant.workspaceId, tenant.userId)).toThrow();
    } finally {
      database.close();
    }
  });
});
