import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

const requireRuntime = createRequire(import.meta.url);
const migration = readFileSync("migrations/0129_material_assemblies_accessories.sql", "utf8");
const fixedRule = JSON.stringify({ schemaVersion: 1, kind: "fixed", quantity: 1 });

type LocalSqliteDatabase = {
  exec(sql: string): void;
  prepare(sql: string): {
    all(...parameters: unknown[]): Record<string, unknown>[];
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
    CREATE TABLE workspaces (id TEXT PRIMARY KEY);
    CREATE TABLE projects (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id));
    CREATE TABLE estimates (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id));
    CREATE TABLE estimate_tabs (id TEXT PRIMARY KEY, estimate_id TEXT NOT NULL REFERENCES estimates(id));
    CREATE TABLE estimate_nodes (
      id TEXT PRIMARY KEY,
      estimate_id TEXT NOT NULL REFERENCES estimates(id),
      estimate_tab_id TEXT NOT NULL REFERENCES estimate_tabs(id)
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
      estimate_tab_id TEXT NOT NULL REFERENCES estimate_tabs(id)
    );
    CREATE TABLE estimate_alternative_groups (
      id TEXT PRIMARY KEY,
      contribution_scope_id TEXT NOT NULL REFERENCES estimate_contribution_scopes(id),
      selected_row_item_id TEXT NOT NULL REFERENCES estimate_row_items(id)
    );
    CREATE TABLE estimate_alternative_members (
      contribution_scope_id TEXT NOT NULL REFERENCES estimate_contribution_scopes(id),
      group_id TEXT NOT NULL REFERENCES estimate_alternative_groups(id),
      row_item_id TEXT NOT NULL REFERENCES estimate_row_items(id),
      PRIMARY KEY (group_id, row_item_id)
    );
    CREATE TABLE estimate_optional_items (
      contribution_scope_id TEXT NOT NULL REFERENCES estimate_contribution_scopes(id),
      row_item_id TEXT NOT NULL REFERENCES estimate_row_items(id),
      PRIMARY KEY (contribution_scope_id, row_item_id)
    );
    CREATE TABLE estimate_templates (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id)
    );
    CREATE TABLE estimate_template_nodes (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL REFERENCES estimate_templates(id)
    );
    CREATE TABLE estimate_template_row_items (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL REFERENCES estimate_templates(id),
      template_node_id TEXT NOT NULL REFERENCES estimate_template_nodes(id)
    );
    CREATE TABLE estimate_template_alternative_groups (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL REFERENCES estimate_templates(id),
      selected_template_row_item_id TEXT NOT NULL REFERENCES estimate_template_row_items(id)
    );
    CREATE TABLE estimate_template_alternative_members (
      group_id TEXT NOT NULL REFERENCES estimate_template_alternative_groups(id),
      template_row_item_id TEXT NOT NULL REFERENCES estimate_template_row_items(id),
      PRIMARY KEY (group_id, template_row_item_id)
    );
    CREATE TABLE estimate_template_optional_items (
      template_id TEXT NOT NULL REFERENCES estimate_templates(id),
      template_row_item_id TEXT NOT NULL REFERENCES estimate_template_row_items(id),
      PRIMARY KEY (template_id, template_row_item_id)
    );
  `);
  database.exec(migration);
  database.exec(`
    INSERT INTO workspaces (id) VALUES ('workspace-1'), ('workspace-2');
    INSERT INTO projects (id, workspace_id) VALUES ('project-1', 'workspace-1'), ('project-2', 'workspace-2');
    INSERT INTO estimates (id, project_id) VALUES ('estimate-1', 'project-1'), ('estimate-2', 'project-2');
    INSERT INTO estimate_tabs (id, estimate_id) VALUES ('tab-1', 'estimate-1'), ('tab-2', 'estimate-1');
    INSERT INTO estimate_nodes (id, estimate_id, estimate_tab_id) VALUES
      ('node-a', 'estimate-1', 'tab-1'),
      ('node-b', 'estimate-1', 'tab-1'),
      ('node-tab-2', 'estimate-1', 'tab-2');
    INSERT INTO estimate_row_items (id, estimate_id, node_id) VALUES
      ('row-root', 'estimate-1', 'node-a'),
      ('row-parent-2', 'estimate-1', 'node-a'),
      ('row-child', 'estimate-1', 'node-a'),
      ('row-grandchild', 'estimate-1', 'node-a'),
      ('row-other-node', 'estimate-1', 'node-b'),
      ('row-other-tab', 'estimate-1', 'node-tab-2');
    INSERT INTO estimate_contribution_scopes (
      id, workspace_id, project_id, estimate_id, estimate_tab_id
    ) VALUES ('scope-1', 'workspace-1', 'project-1', 'estimate-1', 'tab-1');

    INSERT INTO estimate_templates (id, workspace_id) VALUES ('template-1', 'workspace-1');
    INSERT INTO estimate_template_nodes (id, template_id) VALUES ('template-node-a', 'template-1'), ('template-node-b', 'template-1');
    INSERT INTO estimate_template_row_items (id, template_id, template_node_id) VALUES
      ('template-root', 'template-1', 'template-node-a'),
      ('template-child', 'template-1', 'template-node-a'),
      ('template-other-node', 'template-1', 'template-node-b');
  `);
  return database;
}

function edgeSql(input: {
  id: string;
  parent: string;
  child: string;
  mode?: "required" | "optional";
  included?: 0 | 1;
  rule?: string;
}) {
  return `
    INSERT INTO estimate_accessory_edges (
      id, contribution_scope_id, workspace_id, project_id, estimate_id, estimate_tab_id,
      parent_row_item_id, child_row_item_id, mode, is_included, quantity_rule_json,
      created_at, updated_at
    ) VALUES (
      '${input.id}', 'scope-1', 'workspace-1', 'project-1', 'estimate-1', 'tab-1',
      '${input.parent}', '${input.child}', '${input.mode ?? "required"}', ${input.included ?? 1},
      '${input.rule ?? fixedRule}', '2026-07-30T00:00:00.000Z', '2026-07-30T00:00:00.000Z'
    )
  `;
}

describe("material assembly migration", () => {
  it("is ordered strictly after governance, variants, and Commercial migrations", () => {
    const migrations = readdirSync("migrations").filter((file) => /^012[6-9]_/.test(file)).sort();
    expect(migrations).toEqual([
      "0126_material_catalogue_governance.sql",
      "0127_material_variants_value_engineering.sql",
      "0128_commercial_remarks_quotations_vat.sql",
      "0129_material_assemblies_accessories.sql",
    ]);
    expect(migration).toContain("estimate_contribution_scopes");
    expect(migration).not.toMatch(/\b(vat_treatment|rate_bps|tax_treatment)\b/i);
    expect(migration).not.toMatch(/UPDATE\s+estimate_row_items\s+SET\s+node_id/i);
  });

  it("creates estimate/template sidecars without changing flat row tables", () => {
    const database = createDatabase();
    try {
      expect(database.prepare("PRAGMA table_info(estimate_accessory_edges)").all().map((column) => column.name))
        .toEqual(expect.arrayContaining([
          "contribution_scope_id",
          "parent_row_item_id",
          "child_row_item_id",
          "quantity_rule_json",
          "revision",
        ]));
      expect(database.prepare("PRAGMA table_info(estimate_template_accessory_edges)").all().map((column) => column.name))
        .toContain("child_template_row_item_id");
      expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      database.close();
    }
  });

  it("enforces one parent, same canonical node, no self edge, and valid rule envelopes", () => {
    const database = createDatabase();
    try {
      database.exec(edgeSql({ id: "edge-1", parent: "row-root", child: "row-child" }));
      expect(() => database.exec(edgeSql({ id: "edge-2", parent: "row-parent-2", child: "row-child" })))
        .toThrow();
      expect(() => database.exec(edgeSql({ id: "edge-self", parent: "row-root", child: "row-root" })))
        .toThrow();
      expect(() => database.exec(edgeSql({ id: "edge-cross-node", parent: "row-root", child: "row-other-node" })))
        .toThrow("canonical node");
      expect(() => database.exec(edgeSql({ id: "edge-cross-tab", parent: "row-root", child: "row-other-tab" })))
        .toThrow("canonical node");
      expect(() => database.exec(edgeSql({
        id: "edge-invalid-rule",
        parent: "row-root",
        child: "row-grandchild",
        rule: JSON.stringify({ schemaVersion: 99, kind: "script" }),
      }))).toThrow();
      expect(() => database.exec(edgeSql({
        id: "edge-required-excluded",
        parent: "row-root",
        child: "row-grandchild",
        included: 0,
      }))).toThrow();
    } finally {
      database.close();
    }
  });

  it("rejects deep cycle closure and guards root roles in both command orders", () => {
    const database = createDatabase();
    try {
      database.exec(edgeSql({ id: "edge-1", parent: "row-root", child: "row-child" }));
      database.exec(edgeSql({ id: "edge-2", parent: "row-child", child: "row-grandchild" }));
      expect(() => database.exec(edgeSql({ id: "edge-cycle", parent: "row-grandchild", child: "row-root" })))
        .toThrow("cycle");

      database.exec(`INSERT INTO estimate_optional_items (contribution_scope_id, row_item_id) VALUES ('scope-1', 'row-parent-2')`);
      expect(() => database.exec(edgeSql({ id: "edge-optional-child", parent: "row-root", child: "row-parent-2" })))
        .toThrow("assembly roots");
      expect(() => database.exec(`
        INSERT INTO estimate_alternative_groups (id, contribution_scope_id, selected_row_item_id)
        VALUES ('group-1', 'scope-1', 'row-child');
        INSERT INTO estimate_alternative_members (contribution_scope_id, group_id, row_item_id)
        VALUES ('scope-1', 'group-1', 'row-child');
      `)).toThrow("assembly roots");
    } finally {
      database.close();
    }
  });

  it("applies equivalent same-node, one-parent, cycle, and root guards to templates", () => {
    const database = createDatabase();
    try {
      const insertTemplateEdge = (id: string, parent: string, child: string) => database.exec(`
        INSERT INTO estimate_template_accessory_edges (
          id, template_id, workspace_id, parent_template_row_item_id, child_template_row_item_id,
          mode, is_included, quantity_rule_json, created_at, updated_at
        ) VALUES (
          '${id}', 'template-1', 'workspace-1', '${parent}', '${child}',
          'required', 1, '${fixedRule}', '2026-07-30T00:00:00.000Z', '2026-07-30T00:00:00.000Z'
        )
      `);
      insertTemplateEdge("template-edge-1", "template-root", "template-child");
      expect(() => insertTemplateEdge("template-edge-2", "template-other-node", "template-child")).toThrow();
      expect(() => insertTemplateEdge("template-cycle", "template-child", "template-root")).toThrow("cycle");
      expect(() => insertTemplateEdge("template-cross-node", "template-root", "template-other-node"))
        .toThrow("canonical node");
    } finally {
      database.close();
    }
  });
});
