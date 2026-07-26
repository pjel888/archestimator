import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

const requireRuntime = createRequire(import.meta.url);
const historyMigration = readFileSync("migrations/0025_reusable_source_insert_support.sql", "utf8");
const rowIntegrityMigration = readFileSync("migrations/0082_estimate_row_integrity_constraints.sql", "utf8");
const wranglerConfig = readFileSync("wrangler.jsonc", "utf8");

type SqliteStatement = {
  all(...parameters: unknown[]): Record<string, unknown>[];
  get(...parameters: unknown[]): Record<string, unknown> | undefined;
  run(...parameters: unknown[]): { changes: number | bigint };
};

type SqliteDatabase = {
  close(): void;
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
};

function createLocalD1Schema() {
  const { DatabaseSync } = requireRuntime("node:sqlite") as {
    DatabaseSync: new (path: string) => SqliteDatabase;
  };
  const database = new DatabaseSync(":memory:");

  database.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (id, workspace_id)
    );

    CREATE TABLE estimates (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (id, project_id)
    );

    CREATE TABLE estimate_nodes (
      id TEXT PRIMARY KEY,
      estimate_id TEXT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
      name TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE estimate_row_items (
      id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
      estimate_id TEXT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
      node_id TEXT,
      description TEXT NOT NULL DEFAULT '',
      designation TEXT NOT NULL DEFAULT '',
      discipline TEXT NOT NULL DEFAULT '',
      material TEXT NOT NULL DEFAULT '',
      quantity REAL NOT NULL DEFAULT 0,
      quantity_base REAL,
      quantity_contingency_amount REAL,
      unit TEXT NOT NULL DEFAULT '',
      unit_cost REAL NOT NULL DEFAULT 0,
      misc_cost REAL NOT NULL DEFAULT 0,
      contingency_percentage REAL NOT NULL DEFAULT 0,
      adjustment_percentage REAL NOT NULL DEFAULT 0,
      source_snapshot_json TEXT NOT NULL DEFAULT '{}',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      supplier_id TEXT,
      row_revision INTEGER NOT NULL DEFAULT 0,
      category_node_id TEXT,
      source_library_item_id TEXT,
      link_state TEXT NOT NULL DEFAULT 'unlinked',
      metadata_json TEXT NOT NULL DEFAULT '{}'
    );
  `);

  database.exec(historyMigration);
  database.exec("ALTER TABLE estimate_row_items ADD COLUMN pricing_provenance_origin TEXT;");
  database.exec(`
    INSERT INTO workspaces (id, name, created_at, updated_at)
    VALUES ('workspace-1', 'Workspace', '2026-07-26T00:00:00.000Z', '2026-07-26T00:00:00.000Z');

    INSERT INTO projects (id, workspace_id, name, created_at, updated_at)
    VALUES ('project-1', 'workspace-1', 'Project', '2026-07-26T00:00:00.000Z', '2026-07-26T00:00:00.000Z');

    INSERT INTO estimates (id, project_id, name, created_at, updated_at)
    VALUES ('estimate-1', 'project-1', 'Estimate', '2026-07-26T00:00:00.000Z', '2026-07-26T00:00:00.000Z');

    INSERT INTO estimate_row_items (id, estimate_id, material, row_revision, created_at, updated_at)
    VALUES ('row-existing', 'estimate-1', 'Existing material', 0, '2026-07-26T00:00:00.000Z', '2026-07-26T00:00:00.000Z');
  `);
  database.exec(rowIntegrityMigration);

  return database;
}

describe("estimate sheet version control active Cloudflare D1 contract", () => {
  it("applies the active append-only event and row revision schema locally", () => {
    expect(wranglerConfig).toContain('"binding": "ARCH_DB"');
    expect(wranglerConfig).toContain('"database_name": "archestimator-proof-db"');

    const database = createLocalD1Schema();
    try {
      const rowRevision = database
        .prepare("PRAGMA table_info(estimate_row_items)")
        .all()
        .find((column) => column.name === "row_revision");
      expect(rowRevision).toMatchObject({ notnull: 1, dflt_value: "1" });
      expect(database.prepare("SELECT row_revision FROM estimate_row_items WHERE id = ?").get("row-existing"))
        .toEqual({ row_revision: 1 });

      const indexes = database
        .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name IN ('estimate_row_items', 'estimate_sheet_events')")
        .all()
        .map((row) => row.name);
      expect(indexes).toEqual(expect.arrayContaining([
        "idx_estimate_row_items_estimate_sort",
        "idx_estimate_sheet_events_correlation",
        "idx_estimate_sheet_events_estimate_created",
      ]));

      const eventInsert = database.prepare(`
        INSERT INTO estimate_sheet_events (
          id, estimate_id, workspace_id, project_id, event_type, correlation_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      eventInsert.run(
        "event-1",
        "estimate-1",
        "workspace-1",
        "project-1",
        "row_updated",
        "correlation-1",
        "2026-07-26T00:00:00.000Z",
      );
      expect(() => eventInsert.run(
        "event-2",
        "estimate-1",
        "workspace-1",
        "project-1",
        "row_updated",
        "correlation-1",
        "2026-07-26T00:00:01.000Z",
      )).toThrow(/UNIQUE constraint failed/);
    } finally {
      database.close();
    }
  });

  it("enforces optimistic row revisions and current link-state integrity", () => {
    const database = createLocalD1Schema();
    try {
      const updated = database.prepare(`
        UPDATE estimate_row_items
        SET material = ?, row_revision = row_revision + 1
        WHERE id = ? AND estimate_id = ? AND row_revision = ?
      `);

      expect(Number(updated.run("Updated material", "row-existing", "estimate-1", 1).changes)).toBe(1);
      expect(Number(updated.run("Stale update", "row-existing", "estimate-1", 1).changes)).toBe(0);
      expect(database.prepare("SELECT material, row_revision FROM estimate_row_items WHERE id = ?").get("row-existing"))
        .toEqual({ material: "Updated material", row_revision: 2 });

      database.prepare(`
        INSERT INTO estimate_row_items (id, estimate_id, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `).run("row-default", "estimate-1", "2026-07-26T00:00:00.000Z", "2026-07-26T00:00:00.000Z");
      expect(database.prepare("SELECT row_revision FROM estimate_row_items WHERE id = ?").get("row-default"))
        .toEqual({ row_revision: 1 });

      expect(() => database.prepare(`
        INSERT INTO estimate_row_items (
          id, estimate_id, link_state, source_library_item_id, created_at, updated_at
        ) VALUES (?, ?, 'linked-clean', NULL, ?, ?)
      `).run(
        "row-invalid-link",
        "estimate-1",
        "2026-07-26T00:00:00.000Z",
        "2026-07-26T00:00:00.000Z",
      )).toThrow(/CHECK constraint failed/);
    } finally {
      database.close();
    }
  });
});
