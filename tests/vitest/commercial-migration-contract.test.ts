import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

const requireRuntime = createRequire(import.meta.url);
const migration = readFileSync("migrations/0128_commercial_remarks_quotations_vat.sql", "utf8");
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
      workspace_id TEXT NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (id, workspace_id)
    );
    CREATE TABLE estimates (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (id, project_id)
    );
    CREATE TABLE project_members (
      project_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL
    );
    CREATE TABLE estimate_sheet_members (
      estimate_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL
    );
    CREATE TABLE estimate_sheet_user_preferences (
      user_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      estimate_id TEXT NOT NULL,
      column_widths_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, workspace_id, estimate_id)
    );
    CREATE TABLE cost_library_items (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL
    );
    CREATE TABLE cost_library_item_price_options (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (workspace_id, item_id, id)
    );
    CREATE TABLE estimate_row_items (
      id TEXT PRIMARY KEY,
      estimate_id TEXT NOT NULL,
      source_library_item_id TEXT,
      source_snapshot_json TEXT NOT NULL DEFAULT '{}',
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE estimate_row_variant_selections (
      estimate_row_item_id TEXT PRIMARY KEY,
      estimate_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      selected_price_option_id TEXT NOT NULL,
      selected_option_snapshot_json TEXT NOT NULL,
      selection_revision INTEGER NOT NULL,
      selected_at TEXT NOT NULL,
      selected_by TEXT
    );
    CREATE TABLE upload_assets (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      project_id TEXT,
      surface TEXT,
      status TEXT,
      purge_state TEXT,
      content_type TEXT,
      checksum_sha256 TEXT,
      scan_status TEXT,
      scan_override_actor_user_id TEXT,
      scan_override_reason TEXT,
      scan_override_expires_at TEXT,
      scan_override_checksum_sha256 TEXT
    );
    CREATE TABLE project_artifacts (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      artifact_type TEXT NOT NULL,
      status TEXT NOT NULL,
      UNIQUE (id, workspace_id, project_id)
    );
    CREATE TABLE project_artifact_versions (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      artifact_id TEXT NOT NULL,
      upload_asset_id TEXT NOT NULL,
      content_sha256 TEXT NOT NULL
    );
  `);
  return database;
}

function seedLegacy(database: LocalSqliteDatabase) {
  database.exec(`
    INSERT INTO workspaces (id) VALUES ('workspace-1'), ('workspace-2');
    INSERT INTO projects (id, workspace_id, metadata, created_at, updated_at) VALUES
      ('project-1', 'workspace-1', '{"taxTreatment":{"basis":"EX_VAT","vatRate":0.12}}', '${timestamp}', '${timestamp}'),
      ('project-2', 'workspace-2', '{}', '${timestamp}', '${timestamp}');
    INSERT INTO estimates (id, project_id, metadata, created_at, updated_at) VALUES
      ('estimate-1', 'project-1', '{"taxTreatment":{"basis":"VAT_INCLUSIVE","vatRate":12}}', '${timestamp}', '${timestamp}'),
      ('estimate-2', 'project-2', '{}', '${timestamp}', '${timestamp}');
    INSERT INTO cost_library_items (id, workspace_id) VALUES
      ('item-1', 'workspace-1'), ('item-2', 'workspace-2');
    INSERT INTO cost_library_item_price_options (
      id, workspace_id, item_id, metadata_json, created_at, updated_at
    ) VALUES
      ('option-1', 'workspace-1', 'item-1', '{"taxTreatment":{"basis":"VAT_EXEMPT","vatRate":99}}', '${timestamp}', '${timestamp}'),
      ('option-2', 'workspace-2', 'item-2', '{}', '${timestamp}', '${timestamp}');
    INSERT INTO estimate_row_items (
      id, estimate_id, source_library_item_id, source_snapshot_json,
      metadata_json, created_at, updated_at
    ) VALUES (
      'row-1', 'estimate-1', 'item-1',
      '{"priceOptionId":"option-1","notes":"Keep exactly","taxTreatment":{"basis":"VAT_INCLUSIVE","vatRate":0.12},"requiresQuote":true,"attachmentId":"generic-pdf"}',
      '{}', '${timestamp}', '${timestamp}'
    );
    INSERT INTO estimate_sheet_user_preferences (
      user_id, workspace_id, estimate_id, created_at, updated_at
    ) VALUES ('user-1', 'workspace-1', 'estimate-1', '${timestamp}', '${timestamp}');
    INSERT INTO estimate_row_variant_selections (
      estimate_row_item_id, estimate_id, workspace_id, selected_price_option_id,
      selected_option_snapshot_json, selection_revision, selected_at
    ) VALUES (
      'row-1', 'estimate-1', 'workspace-1', 'option-1',
      '{"priceOptionId":"option-1"}', 1, '${timestamp}'
    );
  `);
}

function applyMigration(database: LocalSqliteDatabase) {
  database.exec(`BEGIN;\n${migration}\nCOMMIT;`);
}

function rerunBackfill(database: LocalSqliteDatabase) {
  const startMarker = "-- COMMERCIAL_BACKFILL:START";
  const endMarker = "-- COMMERCIAL_BACKFILL:END";
  const start = migration.indexOf(startMarker);
  const end = migration.indexOf(endMarker);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  database.exec(`BEGIN;\n${migration.slice(start + startMarker.length, end)}\nCOMMIT;`);
}

describe("commercial persistence migration", () => {
  it("owns 0128 after the canonical 0127 selection surface without taking contribution ownership", () => {
    expect(readFileSync("migrations/0126_material_catalogue_governance.sql", "utf8")).not.toBe("");
    expect(migration).toContain("cost_library_item_price_options(workspace_id, item_id, id)");
    expect(migration).toContain("estimate_row_variant_selections");
    expect(migration).not.toMatch(/estimate_contribution_scopes|material_variant|0127_/i);
    expect(migration).not.toMatch(/remarks/i);
    expect(migration).not.toMatch(/UPDATE\s+estimate_row_items/i);
  });

  it("creates canonical constrained tables and conservatively backfills legacy metadata", () => {
    const database = createDatabase();
    try {
      seedLegacy(database);
      applyMigration(database);

      expect(database.prepare(`
        SELECT treatment, rate_bps, revision FROM project_commercial_defaults
        WHERE project_id = 'project-1'
      `).get()).toEqual({ treatment: "exclusive", rate_bps: 1200, revision: 1 });
      expect(database.prepare(`
        SELECT treatment, rate_bps FROM estimate_commercial_defaults
        WHERE estimate_id = 'estimate-1'
      `).get()).toEqual({ treatment: "inclusive", rate_bps: 1200 });
      expect(database.prepare(`
        SELECT treatment, rate_bps, terms_revision
        FROM cost_library_item_price_option_commercial_terms
        WHERE price_option_id = 'option-1'
      `).get()).toEqual({ treatment: "exempt", rate_bps: 0, terms_revision: 1 });
      expect(database.prepare(`
        SELECT selected_option_id, selected_option_treatment, selected_option_rate_bps,
               override_treatment, override_rate_bps, quotation_requirement,
               quotation_status, quotation_artifact_version_id
        FROM estimate_row_commercial_terms WHERE row_id = 'row-1'
      `).get()).toEqual({
        selected_option_id: "option-1",
        selected_option_treatment: "exempt",
        selected_option_rate_bps: 0,
        override_treatment: "inclusive",
        override_rate_bps: 1200,
        quotation_requirement: "required",
        quotation_status: "not_requested",
        quotation_artifact_version_id: null,
      });
      expect(database.prepare("SELECT json_extract(source_snapshot_json, '$.notes') AS notes FROM estimate_row_items WHERE id = 'row-1'").get())
        .toEqual({ notes: "Keep exactly" });
      expect(database.prepare("SELECT column_visibility_json FROM estimate_sheet_user_preferences").get())
        .toEqual({ column_visibility_json: "{}" });
      expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      database.close();
    }
  });

  it("rejects partial pairs, nonzero exempt rates, foreign option snapshots, and unknown visibility keys", () => {
    const database = createDatabase();
    try {
      seedLegacy(database);
      applyMigration(database);

      expect(() => database.exec(`
        UPDATE estimate_row_commercial_terms
        SET override_treatment = 'exclusive', override_rate_bps = NULL
        WHERE row_id = 'row-1'
      `)).toThrow();
      expect(() => database.exec(`
        UPDATE estimate_row_commercial_terms
        SET override_treatment = 'exempt', override_rate_bps = 1
        WHERE row_id = 'row-1'
      `)).toThrow();
      expect(() => database.exec(`
        UPDATE estimate_row_commercial_terms
        SET selected_option_id = 'option-2', selected_option_treatment = 'exclusive',
            selected_option_rate_bps = 1200, selected_option_terms_revision = 1
        WHERE row_id = 'row-1'
      `)).toThrow(/selected option (ownership|snapshot) mismatch/);
      expect(() => database.exec(`
        UPDATE estimate_sheet_user_preferences
        SET column_visibility_json = '{"commercial":true,"privateUrl":false}'
      `)).toThrow(/unsupported key or value/);
      expect(() => database.exec(`
        UPDATE estimate_sheet_user_preferences
        SET column_visibility_json = '{"commercial":"yes"}'
      `)).toThrow(/unsupported key or value/);
      expect(() => database.exec(`
        UPDATE estimate_row_commercial_terms
        SET quotation_reference = '${"Q".repeat(161)}'
        WHERE row_id = 'row-1'
      `)).toThrow();
    } finally {
      database.close();
    }
  });

  it("links only clean same-scope quotation versions and retains links after archival", () => {
    const database = createDatabase();
    try {
      seedLegacy(database);
      applyMigration(database);
      database.exec(`
        INSERT INTO upload_assets (
          id, workspace_id, project_id, surface, status, purge_state, content_type,
          checksum_sha256, scan_status
        ) VALUES
          ('asset-quote', 'workspace-1', 'project-1', 'project-artifact', 'finalized', 'active', 'application/pdf', 'hash-quote', 'clean'),
          ('asset-generic', 'workspace-1', 'project-1', 'project-artifact', 'finalized', 'active', 'application/pdf', 'hash-generic', 'clean');
        INSERT INTO project_artifacts (id, workspace_id, project_id, artifact_type, status) VALUES
          ('artifact-quote', 'workspace-1', 'project-1', 'quotation', 'active'),
          ('artifact-generic', 'workspace-1', 'project-1', 'report', 'active');
        INSERT INTO project_artifact_versions (
          id, workspace_id, project_id, artifact_id, upload_asset_id, content_sha256
        ) VALUES
          ('version-quote', 'workspace-1', 'project-1', 'artifact-quote', 'asset-quote', 'hash-quote'),
          ('version-generic', 'workspace-1', 'project-1', 'artifact-generic', 'asset-generic', 'hash-generic');
      `);

      expect(() => database.exec(`
        UPDATE estimate_row_commercial_terms
        SET quotation_artifact_version_id = 'version-generic', updated_at = '${timestamp}'
        WHERE row_id = 'row-1'
      `)).toThrow(/not linkable/);
      expect(() => database.exec(`
        UPDATE estimate_row_commercial_terms
        SET quotation_artifact_version_id = 'version-quote', updated_at = '${timestamp}'
        WHERE row_id = 'row-1'
      `)).not.toThrow();
      database.exec("UPDATE project_artifacts SET status = 'archived' WHERE id = 'artifact-quote'");
      expect(database.prepare(`
        SELECT quotation_artifact_version_id FROM estimate_row_commercial_terms WHERE row_id = 'row-1'
      `).get()).toEqual({ quotation_artifact_version_id: "version-quote" });
    } finally {
      database.close();
    }
  });

  it("replays the bounded backfill without replacing persisted commercial truth", () => {
    const database = createDatabase();
    try {
      seedLegacy(database);
      applyMigration(database);
      database.exec(`
        UPDATE estimate_row_commercial_terms
        SET override_treatment = 'exempt', override_rate_bps = 0, terms_revision = 2
        WHERE row_id = 'row-1'
      `);
      rerunBackfill(database);
      expect(database.prepare(`
        SELECT override_treatment, override_rate_bps, terms_revision
        FROM estimate_row_commercial_terms WHERE row_id = 'row-1'
      `).get()).toEqual({ override_treatment: "exempt", override_rate_bps: 0, terms_revision: 2 });
    } finally {
      database.close();
    }
  });
});
