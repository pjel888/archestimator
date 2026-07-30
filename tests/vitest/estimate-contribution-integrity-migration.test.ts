import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

const requireRuntime = createRequire(import.meta.url);
const migration = readFileSync("migrations/0130_estimate_contribution_integrity.sql", "utf8");

const now = "2026-07-30T00:00:00.000Z";

function createDatabase() {
  const { DatabaseSync } = requireRuntime("node:sqlite") as {
    DatabaseSync: new (path: string) => {
      exec(sql: string): void;
      prepare(sql: string): {
        get(...values: unknown[]): Record<string, unknown> | undefined;
        run(...values: unknown[]): unknown;
      };
      close(): void;
    };
  };
  const database = new DatabaseSync(":memory:");
  database.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE workspaces (id TEXT PRIMARY KEY);
    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      UNIQUE (id, workspace_id)
    );
    CREATE TABLE estimates (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      UNIQUE (id, project_id)
    );
    CREATE TABLE estimate_tabs (
      id TEXT PRIMARY KEY,
      estimate_id TEXT NOT NULL REFERENCES estimates(id)
    );
    CREATE TABLE estimate_nodes (
      id TEXT PRIMARY KEY,
      estimate_id TEXT NOT NULL REFERENCES estimates(id),
      estimate_tab_id TEXT REFERENCES estimate_tabs(id)
    );
    CREATE TABLE estimate_row_items (
      id TEXT PRIMARY KEY,
      estimate_id TEXT NOT NULL REFERENCES estimates(id),
      node_id TEXT REFERENCES estimate_nodes(id)
    );
    CREATE TABLE estimate_contribution_scopes (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      project_id TEXT NOT NULL REFERENCES projects(id),
      estimate_id TEXT NOT NULL REFERENCES estimates(id),
      estimate_tab_id TEXT NOT NULL REFERENCES estimate_tabs(id),
      revision INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (workspace_id, project_id, estimate_id, estimate_tab_id)
    );
    CREATE TABLE estimate_alternative_groups (
      id TEXT PRIMARY KEY,
      contribution_scope_id TEXT NOT NULL REFERENCES estimate_contribution_scopes(id) ON DELETE CASCADE,
      selected_row_item_id TEXT NOT NULL REFERENCES estimate_row_items(id) ON DELETE RESTRICT,
      name TEXT NOT NULL DEFAULT '',
      revision INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (contribution_scope_id, id)
    );
    CREATE TABLE estimate_alternative_members (
      contribution_scope_id TEXT NOT NULL REFERENCES estimate_contribution_scopes(id) ON DELETE CASCADE,
      group_id TEXT NOT NULL REFERENCES estimate_alternative_groups(id) ON DELETE CASCADE,
      row_item_id TEXT NOT NULL REFERENCES estimate_row_items(id) ON DELETE CASCADE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      PRIMARY KEY (group_id, row_item_id),
      UNIQUE (contribution_scope_id, row_item_id)
    );
    CREATE TABLE estimate_optional_items (
      contribution_scope_id TEXT NOT NULL REFERENCES estimate_contribution_scopes(id) ON DELETE CASCADE,
      row_item_id TEXT NOT NULL REFERENCES estimate_row_items(id) ON DELETE CASCADE,
      is_included INTEGER NOT NULL DEFAULT 1,
      revision INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (contribution_scope_id, row_item_id)
    );
    CREATE TABLE estimate_accessory_edges (
      id TEXT PRIMARY KEY,
      contribution_scope_id TEXT NOT NULL REFERENCES estimate_contribution_scopes(id) ON DELETE CASCADE,
      child_row_item_id TEXT NOT NULL REFERENCES estimate_row_items(id) ON DELETE CASCADE
    );

    INSERT INTO workspaces VALUES ('workspace-1'), ('workspace-2');
    INSERT INTO projects VALUES ('project-1', 'workspace-1'), ('project-2', 'workspace-2');
    INSERT INTO estimates VALUES ('estimate-1', 'project-1'), ('estimate-2', 'project-2');
    INSERT INTO estimate_tabs VALUES ('tab-1', 'estimate-1'), ('tab-2', 'estimate-1'), ('tab-foreign', 'estimate-2');
    INSERT INTO estimate_nodes VALUES
      ('node-1', 'estimate-1', 'tab-1'),
      ('node-2', 'estimate-1', 'tab-2'),
      ('node-foreign', 'estimate-2', 'tab-foreign');
    INSERT INTO estimate_row_items VALUES
      ('row-1', 'estimate-1', 'node-1'),
      ('row-2', 'estimate-1', 'node-1'),
      ('row-other-tab', 'estimate-1', 'node-2'),
      ('row-foreign', 'estimate-2', 'node-foreign');
    INSERT INTO estimate_contribution_scopes VALUES
      ('scope-1', 'workspace-1', 'project-1', 'estimate-1', 'tab-1', 1, '${now}', '${now}'),
      ('scope-2', 'workspace-1', 'project-1', 'estimate-1', 'tab-2', 1, '${now}', '${now}');
    INSERT INTO estimate_alternative_groups VALUES
      ('group-1', 'scope-1', 'row-1', 'Options', 1, '${now}', '${now}');
    INSERT INTO estimate_alternative_members VALUES
      ('scope-1', 'group-1', 'row-1', 0, '${now}'),
      ('scope-1', 'group-1', 'row-2', 1, '${now}');
  `);
  database.exec(`BEGIN IMMEDIATE;\n${migration}\nCOMMIT;`);
  return database;
}

describe("estimate contribution integrity migration", () => {
  it("enforces scope, group, row, and tab membership on inserts and updates", () => {
    const database = createDatabase();
    try {
      expect(() => database.exec(`
        UPDATE estimate_contribution_scopes
        SET estimate_tab_id = 'tab-foreign'
        WHERE id = 'scope-1'
      `)).toThrow(/workspace project estimate tab identity is immutable/);

      expect(() => database.exec(`
        INSERT INTO estimate_alternative_members
          (contribution_scope_id, group_id, row_item_id, created_at)
        VALUES ('scope-2', 'group-1', 'row-other-tab', '${now}')
      `)).toThrow(/same contribution scope/);

      expect(() => database.exec(`
        INSERT INTO estimate_alternative_members
          (contribution_scope_id, group_id, row_item_id, created_at)
        VALUES ('scope-1', 'group-1', 'row-other-tab', '${now}')
      `)).toThrow(/scope estimate tab/);

      expect(() => database.exec(`
        INSERT INTO estimate_optional_items
          (contribution_scope_id, row_item_id, created_at, updated_at)
        VALUES ('scope-1', 'row-other-tab', '${now}', '${now}')
      `)).toThrow(/scope estimate tab/);

      database.exec(`
        INSERT INTO estimate_optional_items
          (contribution_scope_id, row_item_id, created_at, updated_at)
        VALUES ('scope-2', 'row-other-tab', '${now}', '${now}')
      `);
      expect(() => database.exec(`
        UPDATE estimate_optional_items
        SET contribution_scope_id = 'scope-1'
        WHERE row_item_id = 'row-other-tab'
      `)).toThrow(/scope estimate tab/);

      expect(() => database.exec(`
        UPDATE estimate_alternative_members
        SET row_item_id = 'row-other-tab'
        WHERE group_id = 'group-1' AND row_item_id = 'row-2'
      `)).toThrow(/scope estimate tab/);
    } finally {
      database.close();
    }
  });

  it("requires the selected row to be an actual member at transaction commit", () => {
    const database = createDatabase();
    try {
      expect(() => database.exec(`
        BEGIN IMMEDIATE;
        INSERT INTO estimate_alternative_groups
          (id, contribution_scope_id, selected_row_item_id, created_at, updated_at)
        VALUES ('group-valid', 'scope-2', 'row-other-tab', '${now}', '${now}');
        INSERT INTO estimate_alternative_members
          (contribution_scope_id, group_id, row_item_id, created_at)
        VALUES ('scope-2', 'group-valid', 'row-other-tab', '${now}');
        COMMIT;
      `)).not.toThrow();

      expect(() => database.exec(`
        BEGIN IMMEDIATE;
          INSERT INTO estimate_alternative_groups
            (id, contribution_scope_id, selected_row_item_id, created_at, updated_at)
          VALUES ('group-missing', 'scope-2', 'row-other-tab', '${now}', '${now}');
        COMMIT;
      `)).toThrow(/FOREIGN KEY constraint failed/);
      database.exec("ROLLBACK");

      expect(() => database.exec(`
        BEGIN IMMEDIATE;
          UPDATE estimate_alternative_groups
          SET selected_row_item_id = 'row-2'
          WHERE id = 'group-1';
          DELETE FROM estimate_alternative_members
          WHERE group_id = 'group-1' AND row_item_id = 'row-2';
        COMMIT;
      `)).toThrow(/FOREIGN KEY constraint failed/);
      database.exec("ROLLBACK");

      expect(database.prepare(`
        SELECT selected_row_item_id FROM estimate_alternative_groups WHERE id = 'group-1'
      `).get()).toEqual({ selected_row_item_id: "row-1" });
      expect(database.prepare("PRAGMA foreign_key_check").get()).toBeUndefined();
    } finally {
      database.close();
    }
  });
});
