import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

const requireRuntime = createRequire(import.meta.url);
const migration = readFileSync("migrations/0126_material_catalogue_governance.sql", "utf8");
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
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE
    );
    CREATE TABLE estimates (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE component_suppliers (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      normalized_name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (workspace_id, normalized_name)
    );
    CREATE TABLE component_brands (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      normalized_name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (workspace_id, normalized_name)
    );

    CREATE TABLE cost_library_items (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Uncategorized',
      category_node_id TEXT,
      library_folder_id TEXT,
      supplier TEXT,
      supplier_id TEXT,
      brand TEXT,
      brand_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE cost_library_item_price_options (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      item_id TEXT NOT NULL REFERENCES cost_library_items(id) ON DELETE CASCADE,
      supplier_id TEXT
    );
    CREATE TABLE cost_library_item_versions (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL REFERENCES cost_library_items(id) ON DELETE CASCADE,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      version_number INTEGER NOT NULL,
      snapshot_json TEXT NOT NULL
    );

    CREATE TABLE estimate_row_items (
      id TEXT PRIMARY KEY,
      estimate_id TEXT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
      supplier_id TEXT,
      supplier TEXT NOT NULL DEFAULT '',
      source_snapshot_json TEXT NOT NULL DEFAULT '{}',
      category_node_id TEXT,
      row_revision INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE estimate_templates (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE
    );
    CREATE TABLE estimate_template_row_items (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL REFERENCES estimate_templates(id) ON DELETE CASCADE,
      supplier_id TEXT,
      supplier TEXT NOT NULL DEFAULT '',
      source_snapshot TEXT
    );
    CREATE TABLE cost_library_component_drafts (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      draft_json TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'active'
    );
  `);
  return database;
}

function applyMigration(database: LocalSqliteDatabase) {
  database.exec(`BEGIN;\n${migration}\nCOMMIT;`);
}

function rerunBackfill(database: LocalSqliteDatabase) {
  const startMarker = "-- MATERIAL_CATALOGUE_BACKFILL:START";
  const endMarker = "-- MATERIAL_CATALOGUE_BACKFILL:END";
  const start = migration.indexOf(startMarker);
  const end = migration.indexOf(endMarker);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  database.exec(`BEGIN;\n${migration.slice(start + startMarker.length, end)}\nCOMMIT;`);
}

function seedRepresentativeLegacyData(database: LocalSqliteDatabase) {
  database.exec(`
    INSERT INTO workspaces (id) VALUES ('workspace-1'), ('workspace-2');
    INSERT INTO projects (id, workspace_id) VALUES ('project-1', 'workspace-1');
    INSERT INTO estimates (id, project_id) VALUES ('estimate-1', 'project-1');
    INSERT INTO estimate_templates (id, workspace_id) VALUES ('template-1', 'workspace-1');

    INSERT INTO component_brands (
      id, workspace_id, name, normalized_name, created_at, updated_at
    ) VALUES
      ('brand-a', 'workspace-1', ' ACME\t  Tools ', 'legacy-acme-a', '${timestamp}', '${timestamp}'),
      ('brand-z', 'workspace-1', 'acme tools', 'legacy-acme-z', '${timestamp}', '${timestamp}'),
      ('brand-foreign', 'workspace-2', 'Foreign Brand', 'foreign brand', '${timestamp}', '${timestamp}');

    INSERT INTO component_suppliers (
      id, workspace_id, name, normalized_name, created_at, updated_at
    ) VALUES
      ('supplier-a', 'workspace-1', ' Supply\n House ', 'legacy-supplier-a', '${timestamp}', '${timestamp}'),
      ('supplier-z', 'workspace-1', 'supply house', 'legacy-supplier-z', '${timestamp}', '${timestamp}'),
      ('supplier-foreign', 'workspace-2', 'Foreign Supplier', 'foreign supplier', '${timestamp}', '${timestamp}');

    INSERT INTO cost_library_items (
      id, workspace_id, name, category, category_node_id, library_folder_id,
      supplier, supplier_id, brand, brand_id, created_at, updated_at
    ) VALUES
      ('item-1', 'workspace-1', 'Paint', 'Finishes', 'category-finishes', 'folder-finishes',
       ' SUPPLY  HOUSE ', 'supplier-z', 'Acme  Tools', 'brand-z', '${timestamp}', '${timestamp}'),
      ('item-label-only', 'workspace-1', 'Tile', 'Flooring', 'category-flooring', 'folder-flooring',
       'New\r\nSupplier', NULL, 'MÉTAL  Pro', NULL, '${timestamp}', '${timestamp}');

    INSERT INTO cost_library_item_price_options (id, workspace_id, item_id, supplier_id)
    VALUES
      ('option-1', 'workspace-1', 'item-1', 'supplier-z'),
      ('option-cross-workspace', 'workspace-1', 'item-1', 'supplier-foreign');

    INSERT INTO estimate_row_items (
      id, estimate_id, supplier_id, supplier, source_snapshot_json, category_node_id
    ) VALUES (
      'row-1', 'estimate-1', 'supplier-z', 'Supply House',
      '{"brand":"ACME   TOOLS","brandId":"brand-z","supplier":"Supply House","supplierId":"supplier-z"}',
      'estimate-area-unchanged'
    );

    INSERT INTO estimate_template_row_items (
      id, template_id, supplier_id, supplier, source_snapshot
    ) VALUES (
      'template-row-1', 'template-1', 'supplier-z', 'Supply House',
      '{"brand":"Acme Tools","brandId":"brand-z","supplier":"Supply House","supplierId":"supplier-z"}'
    );

    INSERT INTO cost_library_component_drafts (id, workspace_id, draft_json)
    VALUES (
      'draft-1', 'workspace-1',
      '{"brand":"Acme Tools","brandId":"brand-z","supplier":"Supply House","supplierId":"supplier-z"}'
    );

    INSERT INTO cost_library_item_versions (id, item_id, workspace_id, version_number, snapshot_json)
    VALUES (
      'version-1', 'item-1', 'workspace-1', 1,
      '{"brand":"Historic ACME","brandId":"brand-z","supplier":"Historic Supply","supplierId":"supplier-z"}'
    );
  `);
}

describe("material catalogue governance migration", () => {
  it("extends an empty current schema with typed identity, lifecycle, revision, and indexes", () => {
    const database = createDatabase();
    try {
      applyMigration(database);

      for (const table of ["component_brands", "component_suppliers"]) {
        const columns = database.prepare(`PRAGMA table_info(${table})`).all().map((column) => column.name);
        expect(columns).toEqual(expect.arrayContaining([
          "lifecycle_state",
          "revision",
          "archived_at",
          "archived_by",
          "merged_into_id",
          "created_by",
          "updated_by",
        ]));
      }
      expect(database.prepare("PRAGMA table_info(estimate_row_items)").all().map((column) => column.name))
        .toContain("brand_id");
      expect(database.prepare(`
        SELECT name FROM sqlite_master
        WHERE type = 'index' AND name LIKE 'idx_component_%_workspace_lifecycle'
        ORDER BY name
      `).all()).toEqual([
        { name: "idx_component_brands_workspace_lifecycle" },
        { name: "idx_component_suppliers_workspace_lifecycle" },
      ]);
    } finally {
      database.close();
    }
  });

  it("normalizes, deduplicates, and rewrites only current tenant-scoped identity", () => {
    const database = createDatabase();
    try {
      seedRepresentativeLegacyData(database);
      applyMigration(database);

      expect(database.prepare(`
        SELECT id, name, normalized_name, lifecycle_state, revision, merged_into_id
        FROM component_brands WHERE workspace_id = 'workspace-1'
        ORDER BY CASE id WHEN 'brand-a' THEN 0 WHEN 'brand-z' THEN 1 ELSE 2 END
      `).all()).toEqual([
        {
          id: "brand-a",
          name: "ACME Tools",
          normalized_name: "acme tools",
          lifecycle_state: "active",
          revision: 1,
          merged_into_id: null,
        },
        {
          id: "brand-z",
          name: "acme tools",
          normalized_name: "merged:brand-z",
          lifecycle_state: "merged",
          revision: 2,
          merged_into_id: "brand-a",
        },
        expect.objectContaining({
          name: "MÉTAL Pro",
          normalized_name: "mÉtal pro",
          lifecycle_state: "active",
        }),
      ]);
      expect(database.prepare(`
        SELECT id, name, normalized_name, lifecycle_state, revision, merged_into_id
        FROM component_suppliers WHERE workspace_id = 'workspace-1'
        ORDER BY CASE id WHEN 'supplier-a' THEN 0 WHEN 'supplier-z' THEN 1 ELSE 2 END
      `).all()).toEqual([
        {
          id: "supplier-a",
          name: "Supply House",
          normalized_name: "supply house",
          lifecycle_state: "active",
          revision: 1,
          merged_into_id: null,
        },
        {
          id: "supplier-z",
          name: "supply house",
          normalized_name: "merged:supplier-z",
          lifecycle_state: "merged",
          revision: 2,
          merged_into_id: "supplier-a",
        },
        expect.objectContaining({
          name: "New Supplier",
          normalized_name: "new supplier",
          lifecycle_state: "active",
        }),
      ]);

      expect(database.prepare(`
        SELECT supplier, supplier_id, brand, brand_id, category, category_node_id, library_folder_id
        FROM cost_library_items WHERE id = 'item-1'
      `).get()).toEqual({
        supplier: "Supply House",
        supplier_id: "supplier-a",
        brand: "ACME Tools",
        brand_id: "brand-a",
        category: "Finishes",
        category_node_id: "category-finishes",
        library_folder_id: "folder-finishes",
      });
      expect(database.prepare(`
        SELECT supplier_id FROM cost_library_item_price_options ORDER BY id
      `).all()).toEqual([
        { supplier_id: "supplier-a" },
        { supplier_id: null },
      ]);

      const row = database.prepare(`
        SELECT supplier, supplier_id, brand_id, source_snapshot_json, category_node_id
        FROM estimate_row_items WHERE id = 'row-1'
      `).get();
      expect(row).toMatchObject({
        supplier: "Supply House",
        supplier_id: "supplier-a",
        brand_id: "brand-a",
        category_node_id: "estimate-area-unchanged",
      });
      expect(JSON.parse(String(row?.source_snapshot_json))).toMatchObject({
        brand: "ACME Tools",
        brandId: "brand-a",
        supplier: "Supply House",
        supplierId: "supplier-a",
      });

      const template = database.prepare(`
        SELECT supplier, supplier_id, source_snapshot FROM estimate_template_row_items
        WHERE id = 'template-row-1'
      `).get();
      expect(template).toMatchObject({ supplier: "Supply House", supplier_id: "supplier-a" });
      expect(JSON.parse(String(template?.source_snapshot))).toMatchObject({
        brand: "ACME Tools",
        brandId: "brand-a",
        supplier: "Supply House",
        supplierId: "supplier-a",
      });
      expect(JSON.parse(String(database.prepare(
        "SELECT draft_json FROM cost_library_component_drafts WHERE id = 'draft-1'",
      ).get()?.draft_json))).toMatchObject({
        brand: "ACME Tools",
        brandId: "brand-a",
        supplier: "Supply House",
        supplierId: "supplier-a",
      });
      expect(database.prepare(
        "SELECT snapshot_json FROM cost_library_item_versions WHERE id = 'version-1'",
      ).get()).toEqual({
        snapshot_json: '{"brand":"Historic ACME","brandId":"brand-z","supplier":"Historic Supply","supplierId":"supplier-z"}',
      });
      expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      database.close();
    }
  });

  it("reruns the deterministic backfill without changing survivors or creating masters", () => {
    const database = createDatabase();
    try {
      seedRepresentativeLegacyData(database);
      applyMigration(database);
      const before = database.prepare(`
        SELECT 'brand' AS kind, id, workspace_id, normalized_name, lifecycle_state, revision, merged_into_id
        FROM component_brands
        UNION ALL
        SELECT 'supplier', id, workspace_id, normalized_name, lifecycle_state, revision, merged_into_id
        FROM component_suppliers
        ORDER BY kind, workspace_id, id
      `).all();

      rerunBackfill(database);

      expect(database.prepare(`
        SELECT 'brand' AS kind, id, workspace_id, normalized_name, lifecycle_state, revision, merged_into_id
        FROM component_brands
        UNION ALL
        SELECT 'supplier', id, workspace_id, normalized_name, lifecycle_state, revision, merged_into_id
        FROM component_suppliers
        ORDER BY kind, workspace_id, id
      `).all()).toEqual(before);
      expect(database.prepare(`
        SELECT kind, workspace_id, normalized_name, COUNT(*) AS count
        FROM (
          SELECT 'brand' AS kind, workspace_id, normalized_name FROM component_brands WHERE lifecycle_state <> 'merged'
          UNION ALL
          SELECT 'supplier', workspace_id, normalized_name FROM component_suppliers WHERE lifecycle_state <> 'merged'
        )
        GROUP BY kind, workspace_id, normalized_name HAVING COUNT(*) > 1
      `).all()).toEqual([]);
    } finally {
      database.close();
    }
  });

  it("enforces lifecycle, revision, merge, and typed-reference tenant constraints", () => {
    const database = createDatabase();
    try {
      seedRepresentativeLegacyData(database);
      applyMigration(database);

      expect(() => database.prepare(
        "UPDATE component_brands SET lifecycle_state = 'deleted' WHERE id = 'brand-a'",
      ).run()).toThrow();
      expect(() => database.prepare(
        "UPDATE component_brands SET revision = 0 WHERE id = 'brand-a'",
      ).run()).toThrow();
      expect(() => database.prepare(`
        UPDATE component_brands
        SET lifecycle_state = 'merged', merged_into_id = 'brand-foreign'
        WHERE id = 'brand-a'
      `).run()).toThrow("catalogue merge target must be an active entity in the same workspace");
      expect(() => database.prepare(
        "UPDATE cost_library_items SET brand_id = 'brand-foreign' WHERE id = 'item-1'",
      ).run()).toThrow("component brand must belong to the component workspace");
      expect(() => database.prepare(
        "UPDATE estimate_row_items SET supplier_id = 'supplier-foreign' WHERE id = 'row-1'",
      ).run()).toThrow("estimate row supplier must belong to the estimate workspace");
      expect(() => database.prepare(
        "UPDATE estimate_row_items SET brand_id = 'brand-foreign' WHERE id = 'row-1'",
      ).run()).toThrow("estimate row brand must belong to the estimate workspace");
    } finally {
      database.close();
    }
  });
});
