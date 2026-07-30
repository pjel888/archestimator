import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

const requireRuntime = createRequire(import.meta.url);
const migration = readFileSync("migrations/0127_material_variants_value_engineering.sql", "utf8");
const timestamp = "2026-07-30T00:00:00.000Z";

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
    CREATE TABLE estimate_row_items (
      id TEXT PRIMARY KEY,
      estimate_id TEXT NOT NULL REFERENCES estimates(id),
      source_library_item_id TEXT,
      source_snapshot_json TEXT NOT NULL DEFAULT '{}',
      metadata_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL
    );
    CREATE TABLE component_brands (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id)
    );
    CREATE TABLE cost_library_item_price_options (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      item_id TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE estimate_templates (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id)
    );
    CREATE TABLE estimate_template_row_items (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL REFERENCES estimate_templates(id),
      source_library_item_id TEXT,
      source_snapshot TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL
    );

    INSERT INTO workspaces (id) VALUES ('workspace-1'), ('workspace-2');
    INSERT INTO projects (id, workspace_id) VALUES ('project-1', 'workspace-1'), ('project-2', 'workspace-2');
    INSERT INTO estimates (id, project_id) VALUES ('estimate-1', 'project-1'), ('estimate-2', 'project-2');
    INSERT INTO estimate_tabs (id, estimate_id) VALUES ('tab-1', 'estimate-1'), ('tab-2', 'estimate-1');
    INSERT INTO cost_library_item_price_options (id, workspace_id, item_id, is_active) VALUES
      ('option-1', 'workspace-1', 'item-1', 1),
      ('option-2', 'workspace-2', 'item-2', 1),
      ('option-archived', 'workspace-1', 'item-1', 0);
    INSERT INTO estimate_row_items (
      id, estimate_id, source_library_item_id, source_snapshot_json, metadata_json, updated_at
    ) VALUES
      ('row-valid', 'estimate-1', 'item-1', '{"priceOptionId":"option-1","notes":"preserve"}', '{}', '${timestamp}'),
      ('row-foreign', 'estimate-1', 'item-1', '{"priceOptionId":"option-2"}', '{}', '${timestamp}'),
      ('row-embedded', 'estimate-1', NULL, '{"priceOptionId":"embedded-1","priceOptions":[{"id":"embedded-1","isActive":true}]}', '{}', '${timestamp}'),
      ('row-other', 'estimate-1', 'item-1', '{}', '{}', '${timestamp}');
    INSERT INTO estimate_templates (id, workspace_id) VALUES ('template-1', 'workspace-1');
    INSERT INTO estimate_template_row_items (
      id, template_id, source_library_item_id, source_snapshot, updated_at
    ) VALUES ('template-row-1', 'template-1', 'item-1', '{"priceOptionId":"option-1"}', '${timestamp}');
  `);
  database.exec(`BEGIN;\n${migration}\nCOMMIT;`);
  return database;
}

describe("material variants and value-engineering migration", () => {
  it("reserves 0127 between governance and Commercial without taking row-owned fields", () => {
    const ordered = readdirSync("migrations").filter((file) => /^012[6-8]_/.test(file)).sort();
    expect(ordered).toEqual([
      "0126_material_catalogue_governance.sql",
      "0127_material_variants_value_engineering.sql",
      "0128_commercial_remarks_quotations_vat.sql",
    ]);
    expect(migration).not.toMatch(/\b(scope_status|remarks|quotation|vat_treatment|rate_bps)\b/i);
    expect(migration).not.toMatch(/UPDATE\s+estimate_row_items/i);
  });

  it("creates explicit variant identities and conservatively backfills only complete valid matches", () => {
    const database = createDatabase();
    try {
      expect(database.prepare("PRAGMA table_info(cost_library_item_price_options)").all().map((row) => row.name))
        .toEqual(expect.arrayContaining(["brand_id", "brand"]));
      expect(database.prepare(`
        SELECT estimate_row_item_id, selected_price_option_id, selected_option_snapshot_json
        FROM estimate_row_variant_selections ORDER BY estimate_row_item_id
      `).all()).toEqual([
        {
          estimate_row_item_id: "row-embedded",
          selected_price_option_id: "embedded-1",
          selected_option_snapshot_json: "{\"priceOptionId\":\"embedded-1\",\"priceOptions\":[{\"id\":\"embedded-1\",\"isActive\":true}]}",
        },
        {
          estimate_row_item_id: "row-valid",
          selected_price_option_id: "option-1",
          selected_option_snapshot_json: "{\"priceOptionId\":\"option-1\",\"notes\":\"preserve\"}",
        },
      ]);
      expect(database.prepare("SELECT template_row_item_id, selected_price_option_id FROM estimate_template_row_variant_selections").all())
        .toEqual([{ template_row_item_id: "template-row-1", selected_price_option_id: "option-1" }]);
      expect(database.prepare("SELECT json_extract(source_snapshot_json, '$.notes') AS notes FROM estimate_row_items WHERE id = 'row-valid'").get())
        .toEqual({ notes: "preserve" });
      expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      database.close();
    }
  });

  it("enforces workspace ownership, one selected identity, and valid snapshot envelopes", () => {
    const database = createDatabase();
    try {
      database.exec("INSERT INTO component_brands (id, workspace_id) VALUES ('brand-1', 'workspace-1'), ('brand-2', 'workspace-2')");
      expect(() => database.exec("UPDATE cost_library_item_price_options SET brand_id = 'brand-1', brand = 'Acme' WHERE id = 'option-1'"))
        .not.toThrow();
      expect(() => database.exec("UPDATE cost_library_item_price_options SET brand_id = 'brand-2' WHERE id = 'option-1'"))
        .toThrow(/same workspace/);
      expect(() => database.exec(`
        INSERT INTO estimate_row_variant_selections (
          estimate_row_item_id, estimate_id, workspace_id, selected_price_option_id,
          selected_option_snapshot_json, selected_at
        ) VALUES ('row-other', 'estimate-1', 'workspace-1', 'option-2', '{}', '${timestamp}')
      `)).toThrow(/linked row source/);
      expect(() => database.exec(`
        UPDATE estimate_row_variant_selections SET selected_option_snapshot_json = '[]'
        WHERE estimate_row_item_id = 'row-valid'
      `)).toThrow();
    } finally {
      database.close();
    }
  });

  it("keeps alternatives and optional items distinct inside one canonical contribution scope", () => {
    const database = createDatabase();
    try {
      database.exec(`
        INSERT INTO estimate_contribution_scopes (
          id, workspace_id, project_id, estimate_id, estimate_tab_id, created_at, updated_at
        ) VALUES ('scope-1', 'workspace-1', 'project-1', 'estimate-1', 'tab-1', '${timestamp}', '${timestamp}');
        INSERT INTO estimate_alternative_groups (
          id, contribution_scope_id, selected_row_item_id, created_at, updated_at
        ) VALUES ('group-1', 'scope-1', 'row-valid', '${timestamp}', '${timestamp}');
        INSERT INTO estimate_alternative_members (
          contribution_scope_id, group_id, row_item_id, sort_order, created_at
        ) VALUES
          ('scope-1', 'group-1', 'row-valid', 0, '${timestamp}'),
          ('scope-1', 'group-1', 'row-other', 1, '${timestamp}');
      `);
      expect(database.prepare("SELECT selected_row_item_id, revision FROM estimate_alternative_groups WHERE id = 'group-1'").get())
        .toEqual({ selected_row_item_id: "row-valid", revision: 1 });
      expect(() => database.exec(`
        INSERT INTO estimate_optional_items (
          contribution_scope_id, row_item_id, created_at, updated_at
        ) VALUES ('scope-1', 'row-other', '${timestamp}', '${timestamp}')
      `)).toThrow(/both optional and an alternative/);
      expect(() => database.exec(`
        INSERT INTO estimate_optional_items (
          contribution_scope_id, row_item_id, is_included, created_at, updated_at
        ) VALUES ('scope-1', 'row-embedded', 2, '${timestamp}', '${timestamp}')
      `)).toThrow();
      expect(() => database.exec(`
        INSERT INTO estimate_contribution_scopes (
          id, workspace_id, project_id, estimate_id, estimate_tab_id, created_at, updated_at
        ) VALUES ('scope-foreign', 'workspace-2', 'project-1', 'estimate-1', 'tab-1', '${timestamp}', '${timestamp}')
      `)).toThrow(/one workspace project estimate tab/);
    } finally {
      database.close();
    }
  });
});
