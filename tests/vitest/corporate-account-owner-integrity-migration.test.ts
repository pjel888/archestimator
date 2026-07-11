import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

const requireRuntime = createRequire(import.meta.url);
const baseMigration = readFileSync("migrations/0052_corporate_accounts.sql", "utf8");
const integrityMigration = readFileSync("migrations/0053_corporate_account_owner_integrity.sql", "utf8");

type LocalSqliteDatabase = {
  exec(sql: string): void;
  prepare(sql: string): {
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
    PRAGMA foreign_keys = ON;
    CREATE TABLE workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  database.exec(baseMigration);
  database.exec(integrityMigration);
  return database;
}

describe("corporate account owner integrity migration", () => {
  it("assigns the creator as owner for new corporate accounts", () => {
    const database = createDatabase();
    try {
      database
        .prepare(
          `INSERT INTO corporate_accounts (id, name, status, created_by, created_at, updated_at)
           VALUES (?, ?, 'active', ?, ?, ?)`,
        )
        .run("account-new", "New account", "creator-1", "2026-07-11T00:00:00.000Z", "2026-07-11T00:00:00.000Z");

      expect(database.prepare(
        "SELECT user_id, role FROM corporate_account_members WHERE corporate_account_id = ?",
      ).get("account-new")).toEqual({ user_id: "creator-1", role: "owner" });
    } finally {
      database.close();
    }
  });

  it("repairs a preexisting creator membership only when the account has no owner", () => {
    const { DatabaseSync } = requireRuntime("node:sqlite") as {
      DatabaseSync: new (path: string) => LocalSqliteDatabase;
    };
    const database = new DatabaseSync(":memory:");
    try {
      database.exec(`
        PRAGMA foreign_keys = ON;
        CREATE TABLE workspaces (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          slug TEXT,
          created_by TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      database.exec(baseMigration);
      database.prepare(
        `INSERT INTO corporate_accounts (id, name, status, created_by, created_at, updated_at)
         VALUES (?, ?, 'active', ?, ?, ?)`,
      ).run("account-existing", "Existing account", "creator-2", "2026-07-11T00:00:00.000Z", "2026-07-11T00:00:00.000Z");
      database.prepare(
        `INSERT INTO corporate_account_members (corporate_account_id, user_id, role, created_at, updated_at)
         VALUES (?, ?, 'viewer', ?, ?)`,
      ).run("account-existing", "creator-2", "2026-07-11T00:00:00.000Z", "2026-07-11T00:00:00.000Z");

      database.exec(integrityMigration);

      expect(database.prepare(
        "SELECT role FROM corporate_account_members WHERE corporate_account_id = ? AND user_id = ?",
      ).get("account-existing", "creator-2")).toEqual({ role: "owner" });
    } finally {
      database.close();
    }
  });

  it("rejects raw inserts without a creator", () => {
    const database = createDatabase();
    try {
      expect(() => database.prepare(
        `INSERT INTO corporate_accounts (id, name, status, created_by, created_at, updated_at)
         VALUES (?, ?, 'active', NULL, ?, ?)`,
      ).run("account-without-creator", "Invalid account", "2026-07-11T00:00:00.000Z", "2026-07-11T00:00:00.000Z")).toThrow(
        "Corporate accounts require a creator.",
      );
    } finally {
      database.close();
    }
  });

  it("blocks direct deletion or demotion of a sole owner while allowing account deletion", () => {
    const database = createDatabase();
    try {
      database.prepare(
        `INSERT INTO corporate_accounts (id, name, status, created_by, created_at, updated_at)
         VALUES (?, ?, 'active', ?, ?, ?)`,
      ).run("account-owned", "Owned account", "creator-3", "2026-07-11T00:00:00.000Z", "2026-07-11T00:00:00.000Z");

      expect(() => database.prepare(
        "UPDATE corporate_account_members SET role = 'member' WHERE corporate_account_id = ? AND user_id = ?",
      ).run("account-owned", "creator-3")).toThrow("Corporate accounts require at least one owner.");
      expect(() => database.prepare(
        "DELETE FROM corporate_account_members WHERE corporate_account_id = ? AND user_id = ?",
      ).run("account-owned", "creator-3")).toThrow("Corporate accounts require at least one owner.");

      database.prepare("DELETE FROM corporate_accounts WHERE id = ?").run("account-owned");
      expect(database.prepare(
        "SELECT corporate_account_id FROM corporate_account_members WHERE corporate_account_id = ?",
      ).get("account-owned")).toBeUndefined();
    } finally {
      database.close();
    }
  });
});
