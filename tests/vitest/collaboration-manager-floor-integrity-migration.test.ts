import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

const requireRuntime = createRequire(import.meta.url);
const collaborationMigration = readFileSync("migrations/0007_collaboration_invitations.sql", "utf8");
const workspaceMembershipMigration = readFileSync("migrations/0013_collaboration_management_sidecars.sql", "utf8");
const estimateAccessMigration = readFileSync("migrations/0008_estimate_sheet_user_preferences.sql", "utf8");
const managerFloorMigration = readFileSync("migrations/0055_collaboration_manager_floor_integrity.sql", "utf8");

type LocalSqliteDatabase = {
  exec(sql: string): void;
  prepare(sql: string): { run(...parameters: unknown[]): unknown };
  close(): void;
};

function createDatabase() {
  const { DatabaseSync } = requireRuntime("node:sqlite") as {
    DatabaseSync: new (path: string) => LocalSqliteDatabase;
  };
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON;");
  database.exec(collaborationMigration);
  database.exec(workspaceMembershipMigration);
  database.exec(estimateAccessMigration);
  database.exec(managerFloorMigration);
  database.prepare(
    `INSERT INTO workspaces (id, name, created_at, updated_at)
     VALUES ('workspace-1', 'Workspace', '2026-07-11T00:00:00.000Z', '2026-07-11T00:00:00.000Z')`,
  ).run();
  database.prepare(
    `INSERT INTO projects (id, workspace_id, name, created_at, updated_at)
     VALUES ('project-1', 'workspace-1', 'Project', '2026-07-11T00:00:00.000Z', '2026-07-11T00:00:00.000Z')`,
  ).run();
  database.prepare(
    `INSERT INTO estimates (id, project_id, name, created_at, updated_at)
     VALUES ('estimate-1', 'project-1', 'Estimate', '2026-07-11T00:00:00.000Z', '2026-07-11T00:00:00.000Z')`,
  ).run();
  return database;
}

function addWorkspaceMember(database: LocalSqliteDatabase, userId: string, role: "owner" | "admin" | "member" | "viewer") {
  database.prepare(
    `INSERT INTO workspace_members (workspace_id, user_id, role, created_at, updated_at)
     VALUES ('workspace-1', ?, ?, '2026-07-11T00:00:00.000Z', '2026-07-11T00:00:00.000Z')`,
  ).run(userId, role);
}

function addProjectMember(database: LocalSqliteDatabase, userId: string, role: "owner" | "admin" | "editor" | "viewer") {
  database.prepare(
    `INSERT INTO project_members (project_id, workspace_id, user_id, role, created_at, updated_at)
     VALUES ('project-1', 'workspace-1', ?, ?, '2026-07-11T00:00:00.000Z', '2026-07-11T00:00:00.000Z')`,
  ).run(userId, role);
}

function addEstimateMember(database: LocalSqliteDatabase, userId: string, role: "owner" | "admin" | "editor" | "viewer") {
  database.prepare(
    `INSERT INTO estimate_sheet_members (estimate_id, project_id, user_id, role, created_at, updated_at)
     VALUES ('estimate-1', 'project-1', ?, ?, '2026-07-11T00:00:00.000Z', '2026-07-11T00:00:00.000Z')`,
  ).run(userId, role);
}

describe("collaboration manager floor integrity migration", () => {
  it("preserves the final workspace owner while permitting a successor", () => {
    const database = createDatabase();
    try {
      addWorkspaceMember(database, "owner-1", "owner");
      expect(() => database.prepare(
        "UPDATE workspace_members SET role = 'admin' WHERE workspace_id = 'workspace-1' AND user_id = 'owner-1'",
      ).run()).toThrow(/collaboration_workspace_owner_floor/);

      addWorkspaceMember(database, "owner-2", "owner");
      expect(() => database.prepare(
        "DELETE FROM workspace_members WHERE workspace_id = 'workspace-1' AND user_id = 'owner-1'",
      ).run()).not.toThrow();
    } finally {
      database.close();
    }
  });

  it("preserves a project recovery manager unless workspace authority or a direct successor exists", () => {
    const database = createDatabase();
    try {
      addProjectMember(database, "manager-1", "owner");
      expect(() => database.prepare(
        "UPDATE project_members SET role = 'viewer' WHERE project_id = 'project-1' AND user_id = 'manager-1'",
      ).run()).toThrow(/collaboration_project_manager_floor/);

      addProjectMember(database, "manager-2", "admin");
      expect(() => database.prepare(
        "DELETE FROM project_members WHERE project_id = 'project-1' AND user_id = 'manager-1'",
      ).run()).not.toThrow();

      const fallbackDatabase = createDatabase();
      try {
        addWorkspaceMember(fallbackDatabase, "workspace-admin", "admin");
        addProjectMember(fallbackDatabase, "manager-1", "owner");
        expect(() => fallbackDatabase.prepare(
          "DELETE FROM project_members WHERE project_id = 'project-1' AND user_id = 'manager-1'",
        ).run()).not.toThrow();
      } finally {
        fallbackDatabase.close();
      }
    } finally {
      database.close();
    }
  });

  it("requires a direct manager before restricting an estimate and preserves it while restricted", () => {
    const database = createDatabase();
    try {
      expect(() => database.prepare(
        `INSERT INTO estimate_sheet_access_settings (
           estimate_id, project_id, inherit_project_access, created_at, updated_at
         ) VALUES ('estimate-1', 'project-1', 0, '2026-07-11T00:00:00.000Z', '2026-07-11T00:00:00.000Z')`,
      ).run()).toThrow(/collaboration_restricted_estimate_manager_floor/);

      addEstimateMember(database, "manager-1", "owner");
      database.prepare(
        `INSERT INTO estimate_sheet_access_settings (
           estimate_id, project_id, inherit_project_access, created_at, updated_at
         ) VALUES ('estimate-1', 'project-1', 0, '2026-07-11T00:00:00.000Z', '2026-07-11T00:00:00.000Z')`,
      ).run();

      expect(() => database.prepare(
        "UPDATE estimate_sheet_members SET role = 'viewer' WHERE estimate_id = 'estimate-1' AND user_id = 'manager-1'",
      ).run()).toThrow(/collaboration_restricted_estimate_manager_floor/);

      addEstimateMember(database, "manager-2", "admin");
      expect(() => database.prepare(
        "DELETE FROM estimate_sheet_members WHERE estimate_id = 'estimate-1' AND user_id = 'manager-1'",
      ).run()).not.toThrow();
    } finally {
      database.close();
    }
  });
});
