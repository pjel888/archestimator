import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

const requireRuntime = createRequire(import.meta.url);
const migration = readFileSync("migrations/0131_estimate_row_sidecar_defaults.sql", "utf8");
const integrityMigration = readFileSync("migrations/0132_client_feedback_integrity_followup.sql", "utf8");
const timestamp = "2026-07-30T00:00:00.000Z";

type LocalSqliteDatabase = {
  exec(sql: string): void;
  prepare(sql: string): {
    all(...parameters: unknown[]): Record<string, unknown>[];
    get(...parameters: unknown[]): Record<string, unknown> | undefined;
  };
  close(): void;
};

function createDatabase(beforeIntegrityMigration?: (database: LocalSqliteDatabase) => void) {
  const { DatabaseSync } = requireRuntime("node:sqlite") as {
    DatabaseSync: new (path: string) => LocalSqliteDatabase;
  };
  const database = new DatabaseSync(":memory:");
  database.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE workspaces (id TEXT PRIMARY KEY);
    CREATE TABLE projects (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL);
    CREATE TABLE estimates (id TEXT PRIMARY KEY, project_id TEXT NOT NULL);
    CREATE TABLE cost_library_items (
      id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, brand_id TEXT, brand TEXT
    );
    CREATE TABLE component_brands (
      id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, name TEXT NOT NULL
    );
    CREATE TABLE cost_library_item_price_options (
      id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, item_id TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1, brand_id TEXT, brand TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );
    CREATE TABLE cost_library_item_price_option_commercial_terms (
      workspace_id TEXT NOT NULL, item_id TEXT NOT NULL, price_option_id TEXT NOT NULL,
      treatment TEXT NOT NULL, rate_bps INTEGER NOT NULL, terms_revision INTEGER NOT NULL,
      PRIMARY KEY (workspace_id, item_id, price_option_id)
    );
    CREATE TABLE estimate_row_items (
      id TEXT PRIMARY KEY, estimate_id TEXT NOT NULL, source_library_item_id TEXT,
      source_snapshot_json TEXT NOT NULL DEFAULT '{}', metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE estimate_row_variant_selections (
      estimate_row_item_id TEXT PRIMARY KEY, estimate_id TEXT NOT NULL, workspace_id TEXT NOT NULL,
      selected_price_option_id TEXT NOT NULL, selected_option_snapshot_json TEXT NOT NULL,
      selection_revision INTEGER NOT NULL, selected_at TEXT NOT NULL, selected_by TEXT
    );
    CREATE TABLE estimate_row_commercial_terms (
      row_id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, project_id TEXT NOT NULL, estimate_id TEXT NOT NULL,
      selected_option_id TEXT, selected_option_treatment TEXT, selected_option_rate_bps INTEGER,
      selected_option_terms_revision INTEGER, override_treatment TEXT, override_rate_bps INTEGER,
      quotation_requirement TEXT NOT NULL DEFAULT 'not_required', quotation_status TEXT NOT NULL DEFAULT 'not_requested',
      quotation_reference TEXT, quotation_artifact_version_id TEXT, terms_revision INTEGER NOT NULL DEFAULT 1,
      updated_by TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE estimate_templates (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL);
    CREATE TABLE estimate_template_row_items (
      id TEXT PRIMARY KEY, template_id TEXT NOT NULL, source_library_item_id TEXT,
      source_snapshot TEXT NOT NULL DEFAULT '{}', updated_at TEXT NOT NULL
    );
    CREATE TABLE estimate_template_row_variant_selections (
      template_row_item_id TEXT PRIMARY KEY, template_id TEXT NOT NULL, workspace_id TEXT NOT NULL,
      selected_price_option_id TEXT NOT NULL, selected_option_snapshot_json TEXT NOT NULL,
      selection_revision INTEGER NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE estimate_template_alternative_groups (
      id TEXT PRIMARY KEY, template_id TEXT NOT NULL, workspace_id TEXT NOT NULL,
      selected_template_row_item_id TEXT NOT NULL, name TEXT NOT NULL DEFAULT '',
      revision INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE estimate_template_alternative_members (
      group_id TEXT NOT NULL, template_row_item_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL,
      PRIMARY KEY (group_id, template_row_item_id)
    );
    CREATE TABLE estimate_template_optional_items (
      template_id TEXT NOT NULL, template_row_item_id TEXT NOT NULL,
      is_included INTEGER NOT NULL DEFAULT 1, revision INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      PRIMARY KEY (template_id, template_row_item_id)
    );
    CREATE TABLE upload_assets (
      id TEXT PRIMARY KEY, status TEXT NOT NULL, purge_state TEXT NOT NULL,
      checksum_sha256 TEXT, scan_status TEXT, scan_override_actor_user_id TEXT,
      scan_override_reason TEXT, scan_override_checksum_sha256 TEXT,
      scan_override_expires_at TEXT
    );
    CREATE TABLE project_artifacts (
      id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, project_id TEXT NOT NULL,
      artifact_type TEXT NOT NULL, status TEXT NOT NULL
    );
    CREATE TABLE project_artifact_versions (
      id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, project_id TEXT NOT NULL,
      artifact_id TEXT NOT NULL, upload_asset_id TEXT NOT NULL, content_sha256 TEXT NOT NULL
    );

    INSERT INTO workspaces (id) VALUES ('workspace-1');
    INSERT INTO projects (id, workspace_id) VALUES ('project-1', 'workspace-1');
    INSERT INTO estimates (id, project_id) VALUES ('estimate-1', 'project-1');
    INSERT INTO estimate_templates (id, workspace_id) VALUES
      ('template-1', 'workspace-1'), ('template-2', 'workspace-1');
    INSERT INTO cost_library_items (id, workspace_id, brand_id, brand)
    VALUES ('item-1', 'workspace-1', 'brand-1', 'Acme');
    INSERT INTO component_brands (id, workspace_id, name) VALUES
      ('brand-1', 'workspace-1', 'Acme'),
      ('brand-2', 'workspace-1', 'Beta');
    INSERT INTO cost_library_item_price_options (id, workspace_id, item_id, updated_at) VALUES
      ('option-1', 'workspace-1', 'item-1', '${timestamp}');
    INSERT INTO cost_library_item_price_option_commercial_terms (
      workspace_id, item_id, price_option_id, treatment, rate_bps, terms_revision
    ) VALUES ('workspace-1', 'item-1', 'option-1', 'inclusive', 1200, 3);
    INSERT INTO upload_assets (
      id, status, purge_state, checksum_sha256, scan_status
    ) VALUES ('asset-quote', 'finalized', 'active', 'quote-sha', 'clean');
    INSERT INTO project_artifacts (
      id, workspace_id, project_id, artifact_type, status
    ) VALUES ('artifact-quote', 'workspace-1', 'project-1', 'quotation', 'active');
    INSERT INTO project_artifact_versions (
      id, workspace_id, project_id, artifact_id, upload_asset_id, content_sha256
    ) VALUES ('version-quote', 'workspace-1', 'project-1', 'artifact-quote', 'asset-quote', 'quote-sha');
    INSERT INTO estimate_row_items (
      id, estimate_id, source_library_item_id, source_snapshot_json, created_at, updated_at
    ) VALUES (
      'row-existing', 'estimate-1', 'item-1',
      '{"priceOptionId":"option-1","taxTreatment":{"basis":"VAT_EXCLUSIVE","vatRate":0.12},"requiresQuote":true,"quotationStatus":"available","quotationReference":"Q-LEGACY","quotationArtifactVersionId":"version-quote"}', '${timestamp}', '${timestamp}'
    );
  `);
  database.exec(`BEGIN;\n${migration}\nCOMMIT;`);
  beforeIntegrityMigration?.(database);
  database.exec(`BEGIN;\n${integrityMigration}\nCOMMIT;`);
  return database;
}

describe("estimate row sidecar defaults migration", () => {
  it("fills each missing option brand field without replacing populated identity", () => {
    const database = createDatabase((databaseBeforeIntegrity) => {
      databaseBeforeIntegrity.exec(`
        INSERT INTO cost_library_item_price_options (
          id, workspace_id, item_id, brand_id, brand, updated_at
        ) VALUES
          ('option-distinct-id', 'workspace-1', 'item-1', 'brand-2', '', '${timestamp}'),
          ('option-distinct-label', 'workspace-1', 'item-1', NULL, 'Legacy option brand', '${timestamp}');
      `);
    });
    try {
      expect(database.prepare(`
        SELECT id, brand_id, brand
        FROM cost_library_item_price_options
        WHERE id IN ('option-distinct-id', 'option-distinct-label')
        ORDER BY id
      `).all()).toEqual([
        { id: "option-distinct-id", brand_id: "brand-2", brand: "Beta" },
        { id: "option-distinct-label", brand_id: "brand-1", brand: "Legacy option brand" },
      ]);
    } finally {
      database.close();
    }
  });

  it("preserves commercial terms edited after the initial sidecar backfill", () => {
    const database = createDatabase((databaseBeforeIntegrity) => {
      databaseBeforeIntegrity.exec(`
        UPDATE estimate_row_commercial_terms
        SET override_treatment = 'inclusive', override_rate_bps = 900,
            quotation_requirement = 'required', quotation_status = 'requested',
            quotation_reference = 'Q-USER', terms_revision = 4,
            updated_at = '2026-07-30T01:00:00.000Z'
        WHERE row_id = 'row-existing';
      `);
    });
    try {
      expect(database.prepare(`
        SELECT override_treatment, override_rate_bps, quotation_requirement,
               quotation_status, quotation_reference, terms_revision
        FROM estimate_row_commercial_terms WHERE row_id = 'row-existing'
      `).get()).toEqual({
        override_treatment: "inclusive",
        override_rate_bps: 900,
        quotation_requirement: "required",
        quotation_status: "requested",
        quotation_reference: "Q-USER",
        terms_revision: 4,
      });
    } finally {
      database.close();
    }
  });

  it("backfills existing rows and atomically creates sidecars for later row inserts", () => {
    const database = createDatabase();
    try {
      database.exec(`
        INSERT INTO estimate_row_items (
          id, estimate_id, source_library_item_id, source_snapshot_json, created_at, updated_at
        ) VALUES (
          'row-new', 'estimate-1', 'item-1',
          '{"priceOptionId":"option-1","taxTreatment":{"basis":"VAT_EXCLUSIVE","vatRate":0.12},"requiresQuote":true,"quotationStatus":"available","quotationReference":"Q-1001"}',
          '${timestamp}', '${timestamp}'
        );
        INSERT INTO estimate_row_items (
          id, estimate_id, source_library_item_id, source_snapshot_json, created_at, updated_at
        ) VALUES (
          'row-detached', 'estimate-1', NULL,
          '{"priceOptionId":"embedded-1","priceOptions":[{"id":"embedded-1","isActive":true}]}',
          '${timestamp}', '${timestamp}'
        );
        INSERT INTO estimate_template_row_items (
          id, template_id, source_library_item_id, source_snapshot, updated_at
        ) VALUES
          ('template-linked', 'template-1', 'item-1', '{"priceOptionId":"option-1"}', '${timestamp}'),
          ('template-detached', 'template-1', NULL, '{"priceOptionId":"embedded-1","priceOptions":[{"id":"embedded-1","isActive":true}]}', '${timestamp}');
      `);

      expect(database.prepare(`
        SELECT estimate_row_item_id, selected_price_option_id
        FROM estimate_row_variant_selections ORDER BY estimate_row_item_id
      `).all()).toEqual([
        { estimate_row_item_id: "row-detached", selected_price_option_id: "embedded-1" },
        { estimate_row_item_id: "row-existing", selected_price_option_id: "option-1" },
        { estimate_row_item_id: "row-new", selected_price_option_id: "option-1" },
      ]);
      expect(database.prepare(`
        SELECT selected_option_id, selected_option_treatment, selected_option_rate_bps,
               override_treatment, override_rate_bps, quotation_requirement,
               quotation_status, quotation_reference
        FROM estimate_row_commercial_terms WHERE row_id = 'row-new'
      `).get()).toEqual({
        selected_option_id: "option-1",
        selected_option_treatment: "inclusive",
        selected_option_rate_bps: 1200,
        override_treatment: "exclusive",
        override_rate_bps: 1200,
        quotation_requirement: "required",
        quotation_status: "available",
        quotation_reference: "Q-1001",
      });
      expect(database.prepare(`
        SELECT override_treatment, override_rate_bps, quotation_requirement,
               quotation_status, quotation_reference, quotation_artifact_version_id
        FROM estimate_row_commercial_terms WHERE row_id = 'row-existing'
      `).get()).toEqual({
        override_treatment: "exclusive",
        override_rate_bps: 1200,
        quotation_requirement: "required",
        quotation_status: "available",
        quotation_reference: "Q-LEGACY",
        quotation_artifact_version_id: "version-quote",
      });
      expect(database.prepare("SELECT brand_id, brand FROM cost_library_item_price_options WHERE id = 'option-1'").get())
        .toEqual({ brand_id: "brand-1", brand: "Acme" });
      expect(database.prepare(`
        SELECT template_row_item_id, selected_price_option_id
        FROM estimate_template_row_variant_selections ORDER BY template_row_item_id
      `).all()).toEqual([
        { template_row_item_id: "template-detached", selected_price_option_id: "embedded-1" },
        { template_row_item_id: "template-linked", selected_price_option_id: "option-1" },
      ]);
      database.exec(`
        INSERT INTO estimate_template_row_items (
          id, template_id, source_library_item_id, source_snapshot, updated_at
        ) VALUES ('template-foreign', 'template-2', NULL, '{}', '${timestamp}');
      `);
      expect(() => database.exec(`
        INSERT INTO estimate_template_alternative_groups (
          id, template_id, workspace_id, selected_template_row_item_id, created_at, updated_at
        ) VALUES ('group-invalid', 'template-1', 'workspace-1', 'template-foreign', '${timestamp}', '${timestamp}')
      `)).toThrow(/same workspace template/);
      expect(() => database.exec(`
        INSERT INTO estimate_template_optional_items (
          template_id, template_row_item_id, created_at, updated_at
        ) VALUES ('template-1', 'template-foreign', '${timestamp}', '${timestamp}')
      `)).toThrow(/same template/);
    } finally {
      database.close();
    }
  });
});
