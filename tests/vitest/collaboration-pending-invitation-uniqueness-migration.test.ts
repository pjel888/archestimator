import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

const requireRuntime = createRequire(import.meta.url);
const baseMigration = readFileSync("migrations/0007_collaboration_invitations.sql", "utf8");
const uniquenessMigration = readFileSync("migrations/0054_collaboration_pending_invitation_uniqueness.sql", "utf8");

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
  database.exec(baseMigration);
  database.prepare(
    `INSERT INTO workspaces (id, name, created_at, updated_at)
     VALUES (?, ?, ?, ?)`,
  ).run("workspace-1", "Workspace", "2026-07-11T00:00:00.000Z", "2026-07-11T00:00:00.000Z");
  database.prepare(
    `INSERT INTO projects (id, workspace_id, name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run("project-1", "workspace-1", "Project", "2026-07-11T00:00:00.000Z", "2026-07-11T00:00:00.000Z");
  return database;
}

function insertInvitation(database: LocalSqliteDatabase, input: {
  id: string;
  createdAt: string;
  email?: string;
  lifecycleState?: "pending" | "accepted_by_recipient";
}) {
  database.prepare(
    `INSERT INTO collaboration_invitations (
       id, workspace_id, project_id, estimate_id, scope, email, role,
       lifecycle_state, expires_at, created_at, updated_at
     ) VALUES (?, 'workspace-1', 'project-1', NULL, 'project', ?, 'viewer', ?, ?, ?, ?)`,
  ).run(
    input.id,
    input.email ?? "member@example.test",
    input.lifecycleState ?? "pending",
    "2026-08-11T00:00:00.000Z",
    input.createdAt,
    input.createdAt,
  );
}

describe("collaboration pending invitation uniqueness migration", () => {
  it("revokes older duplicate pending invitations and their unused tokens before adding the index", () => {
    const database = createDatabase();
    try {
      insertInvitation(database, { id: "invite-old", createdAt: "2026-07-01T00:00:00.000Z" });
      insertInvitation(database, { id: "invite-new", createdAt: "2026-07-02T00:00:00.000Z" });
      database.prepare(
        `INSERT INTO collaboration_invitation_tokens (
           id, invitation_id, token_hash, delivery_method, created_by, created_at, expires_at
         ) VALUES (?, ?, ?, 'copy_url', 'manager-1', ?, ?)`,
      ).run("token-old", "invite-old", "v1:old", "2026-07-01T00:00:00.000Z", "2026-08-11T00:00:00.000Z");

      database.exec(uniquenessMigration);

      expect(database.prepare(
        "SELECT lifecycle_state, revoked_at FROM collaboration_invitations WHERE id = 'invite-old'",
      ).get()).toEqual({ lifecycle_state: "revoked", revoked_at: "2026-07-01T00:00:00.000Z" });
      expect(database.prepare(
        "SELECT revoked_at FROM collaboration_invitation_tokens WHERE id = 'token-old'",
      ).get()).toEqual({ revoked_at: "2026-07-01T00:00:00.000Z" });
      expect(database.prepare(
        "SELECT id FROM collaboration_invitations WHERE lifecycle_state = 'pending'",
      ).all()).toEqual([{ id: "invite-new" }]);
    } finally {
      database.close();
    }
  });

  it("allows history but rejects a second active pending invite for the same scope", () => {
    const database = createDatabase();
    try {
      database.exec(uniquenessMigration);
      insertInvitation(database, { id: "invite-pending", createdAt: "2026-07-02T00:00:00.000Z" });

      expect(() => insertInvitation(database, {
        id: "invite-duplicate",
        createdAt: "2026-07-03T00:00:00.000Z",
      })).toThrow(/UNIQUE constraint failed/);

      insertInvitation(database, {
        id: "invite-history",
        createdAt: "2026-07-03T00:00:00.000Z",
        lifecycleState: "accepted_by_recipient",
      });
      expect(database.prepare(
        "SELECT COUNT(*) AS count FROM collaboration_invitations",
      ).get()).toEqual({ count: 2 });
    } finally {
      database.close();
    }
  });
});
