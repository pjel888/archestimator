import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

const requireRuntime = createRequire(import.meta.url);
const migration = readFileSync("migrations/0030_workspace_owner_membership_backfill.sql", "utf8");

type LocalSqliteDatabase = {
  exec(sql: string): void;
  prepare(sql: string): {
    all(...parameters: unknown[]): Array<Record<string, unknown>>;
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
  database.exec(`
    CREATE TABLE workspaces (
      id TEXT PRIMARY KEY,
      created_by TEXT,
      created_at TEXT
    );

    CREATE TABLE workspace_members (
      workspace_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT,
      updated_at TEXT,
      PRIMARY KEY (workspace_id, user_id)
    );
  `);
  return database;
}

describe("workspace owner membership backfill migration", () => {
  it("inserts missing creator memberships without promoting existing lower-privilege rows", () => {
    const database = createDatabase();
    try {
      database
        .prepare("INSERT INTO workspaces (id, created_by, created_at) VALUES (?, ?, ?)")
        .run("workspace-missing", "creator-missing", "2026-07-03T00:00:00.000Z");
      database
        .prepare("INSERT INTO workspaces (id, created_by, created_at) VALUES (?, ?, ?)")
        .run("workspace-viewer", "creator-viewer", "2026-07-03T00:00:00.000Z");
      database
        .prepare("INSERT INTO workspaces (id, created_by, created_at) VALUES (?, ?, ?)")
        .run("workspace-admin", "creator-admin", "2026-07-03T00:00:00.000Z");
      database
        .prepare("INSERT INTO workspace_members (workspace_id, user_id, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
        .run("workspace-viewer", "creator-viewer", "viewer", "2026-07-03T00:00:00.000Z", "2026-07-03T00:00:00.000Z");
      database
        .prepare("INSERT INTO workspace_members (workspace_id, user_id, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
        .run("workspace-admin", "creator-admin", "admin", "2026-07-03T00:00:00.000Z", "2026-07-03T00:00:00.000Z");

      database.exec(migration);

      expect(database.prepare("SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?").get(
        "workspace-missing",
        "creator-missing",
      )).toEqual({ role: "owner" });
      expect(database.prepare("SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?").get(
        "workspace-viewer",
        "creator-viewer",
      )).toEqual({ role: "viewer" });
      expect(database.prepare("SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?").get(
        "workspace-admin",
        "creator-admin",
      )).toEqual({ role: "admin" });
    } finally {
      database.close();
    }
  });
});
