import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

import type { D1DatabaseLike } from "@/lib/cloudflare/d1";

import {
  CatalogueGovernanceError,
  normalizeCatalogueDisplayName,
  normalizeCatalogueName,
} from "@/lib/component-library/catalogue-governance";
import { executeCatalogueGovernanceMutationInD1 } from "@/lib/component-library/catalogue-governance-d1";

const requireRuntime = createRequire(import.meta.url);
const timestamp = "2026-07-30T00:00:00.000Z";

type SqliteStatement = {
  all(...values: unknown[]): Record<string, unknown>[];
  get(...values: unknown[]): Record<string, unknown> | undefined;
  run(...values: unknown[]): { changes: number | bigint };
};

type SqliteDatabase = {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
  close(): void;
};

class PreparedD1Statement {
  constructor(
    private readonly database: SqliteDatabase,
    readonly sql: string,
    readonly values: unknown[] = [],
  ) {}

  bind(...values: unknown[]) {
    return new PreparedD1Statement(this.database, this.sql, values);
  }

  async first<T>() {
    return (this.database.prepare(this.sql).get(...this.values) ?? null) as T | null;
  }

  async all<T>() {
    return { success: true, results: this.database.prepare(this.sql).all(...this.values) as T[] };
  }

  async run<T>() {
    if (this.sql.trimStart().toUpperCase().startsWith("SELECT")) {
      this.database.prepare(this.sql).all(...this.values);
      return { success: true, results: [] as T[], meta: { changes: 0 } };
    }
    const result = this.database.prepare(this.sql).run(...this.values);
    return { success: true, results: [] as T[], meta: { changes: Number(result.changes) } };
  }
}

function createFixture() {
  const { DatabaseSync } = requireRuntime("node:sqlite") as {
    DatabaseSync: new (path: string) => SqliteDatabase;
  };
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE workspaces (id TEXT PRIMARY KEY);
    CREATE TABLE workspace_members (
      workspace_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      PRIMARY KEY (workspace_id, user_id)
    );
    CREATE TABLE component_brands (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      name TEXT NOT NULL,
      normalized_name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      lifecycle_state TEXT NOT NULL DEFAULT 'active',
      revision INTEGER NOT NULL DEFAULT 1,
      archived_at TEXT,
      archived_by TEXT,
      merged_into_id TEXT,
      created_by TEXT,
      updated_by TEXT,
      UNIQUE (workspace_id, normalized_name)
    );
    CREATE TABLE component_suppliers (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      name TEXT NOT NULL,
      normalized_name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      lifecycle_state TEXT NOT NULL DEFAULT 'active',
      revision INTEGER NOT NULL DEFAULT 1,
      archived_at TEXT,
      archived_by TEXT,
      merged_into_id TEXT,
      created_by TEXT,
      updated_by TEXT,
      UNIQUE (workspace_id, normalized_name)
    );
    CREATE TABLE cost_library_items (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      brand TEXT,
      brand_id TEXT,
      supplier TEXT,
      supplier_id TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE cost_library_item_price_options (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      brand_id TEXT,
      brand TEXT NOT NULL DEFAULT '',
      supplier_id TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      publication_source_revision INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE estimates (id TEXT PRIMARY KEY, project_id TEXT NOT NULL);
    CREATE TABLE estimate_row_items (
      id TEXT PRIMARY KEY,
      estimate_id TEXT NOT NULL,
      brand_id TEXT,
      supplier_id TEXT,
      supplier TEXT NOT NULL DEFAULT '',
      source_snapshot_json TEXT NOT NULL DEFAULT '{}',
      row_revision INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE estimate_templates (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'General',
      current_version_number INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL,
      archived_at TEXT
    );
    CREATE TABLE estimate_template_nodes (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL,
      parent_id TEXT,
      kind TEXT NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      metadata TEXT NOT NULL DEFAULT '{}'
    );
    CREATE TABLE estimate_template_row_items (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL,
      template_node_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      source_library_item_id TEXT,
      supplier_id TEXT,
      supplier TEXT NOT NULL DEFAULT '',
      source_snapshot TEXT,
      category_node_id TEXT,
      material TEXT,
      description TEXT,
      unit TEXT,
      quantity REAL NOT NULL DEFAULT 0,
      unit_cost REAL NOT NULL DEFAULT 0,
      misc_cost REAL NOT NULL DEFAULT 0,
      contingency_percentage REAL NOT NULL DEFAULT 0,
      adjustment_percentage REAL NOT NULL DEFAULT 0,
      discipline TEXT,
      designation TEXT,
      link_state TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL
    );
    CREATE TABLE estimate_template_versions (
      template_id TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      workspace_id TEXT NOT NULL,
      snapshot_json TEXT NOT NULL,
      source_fingerprint TEXT NOT NULL,
      change_kind TEXT NOT NULL,
      change_summary_json TEXT NOT NULL,
      created_by TEXT,
      created_at TEXT NOT NULL,
      PRIMARY KEY (template_id, version_number)
    );
    CREATE TABLE estimate_template_instances (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      template_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      estimate_id TEXT NOT NULL,
      link_state TEXT NOT NULL,
      applied_version_number INTEGER NOT NULL,
      target_version_number INTEGER NOT NULL,
      last_error_code TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE estimate_template_propagation_jobs (
      instance_id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      template_id TEXT NOT NULL,
      target_version_number INTEGER NOT NULL,
      state TEXT NOT NULL,
      attempt_count INTEGER NOT NULL,
      available_at TEXT NOT NULL,
      lease_token TEXT,
      lease_expires_at TEXT,
      last_error_code TEXT,
      failure_class TEXT,
      retryable INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT
    );
    CREATE TABLE cost_library_component_drafts (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      draft_json TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'active',
      updated_at TEXT NOT NULL
    );
    CREATE TABLE estimate_mutation_receipts (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      command_kind TEXT NOT NULL,
      intent_id TEXT NOT NULL,
      actor_user_id TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      request_fingerprint TEXT NOT NULL,
      status TEXT NOT NULL,
      result_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (workspace_id, command_kind, intent_id)
    );
    CREATE TABLE estimate_sheet_events (
      id TEXT PRIMARY KEY,
      estimate_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      estimate_node_id TEXT,
      estimate_tab_id TEXT,
      target_row_id TEXT,
      event_type TEXT NOT NULL,
      event_source TEXT NOT NULL,
      correlation_id TEXT NOT NULL,
      actor_user_id TEXT,
      changed_fields TEXT NOT NULL,
      row_context TEXT NOT NULL,
      old_snapshot TEXT,
      new_snapshot TEXT,
      payload TEXT NOT NULL,
      metadata TEXT NOT NULL,
      total_delta REAL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE activity_event_outbox (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      event_id TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      attempt_count INTEGER NOT NULL,
      available_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE component_library_telemetry_events (
      id TEXT PRIMARY KEY,
      actor_user_id TEXT NOT NULL,
      workspace_id TEXT,
      project_id TEXT,
      estimate_id TEXT,
      event_name TEXT NOT NULL,
      schema_version TEXT NOT NULL,
      surface TEXT,
      kind TEXT,
      resource_kind TEXT,
      action TEXT,
      reason TEXT,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    INSERT INTO workspaces (id) VALUES ('workspace-1'), ('workspace-2');
    INSERT INTO workspace_members (workspace_id, user_id, role) VALUES
      ('workspace-1', 'editor-1', 'member'),
      ('workspace-1', 'admin-1', 'admin'),
      ('workspace-1', 'viewer-1', 'viewer'),
      ('workspace-2', 'editor-2', 'member');
  `);

  const database = {
    prepare: <T,>(sql: string) => new PreparedD1Statement(sqlite, sql) as never as {
      bind(...values: unknown[]): PreparedD1Statement;
      first<R = T>(): Promise<R | null>;
      all<R = T>(): Promise<{ success: boolean; results: R[] }>;
      run(): Promise<{ success: boolean; results: T[]; meta: { changes: number } }>;
    },
    batch: async <T,>(statements: PreparedD1Statement[]) => {
      sqlite.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run<T>());
        sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };

  return { database: database as D1DatabaseLike, sqlite };
}

function actor(userId: string, workspaceId = "workspace-1") {
  return { actorUserId: userId, isPlatformAdmin: false, workspaceId };
}

describe("component catalogue governance", () => {
  it("uses byte-identical D1 normalization semantics for ASCII whitespace and case", () => {
    const fixtures = [
      ["  ACME\t\n Tools  ", "ACME Tools", "acme tools"],
      ["MÉTAL  Pro", "MÉTAL Pro", "mÉtal pro"],
      ["A-B / C", "A-B / C", "a-b / c"],
      ["\u00a0Wide\u00a0Space\u00a0", "\u00a0Wide\u00a0Space\u00a0", "\u00a0wide\u00a0space\u00a0"],
    ] as const;

    for (const [input, display, normalized] of fixtures) {
      expect(normalizeCatalogueDisplayName(input)).toBe(display);
      expect(normalizeCatalogueName(input)).toBe(normalized);
    }
  });

  it("creates once, replays the committed receipt, and writes one redacted audit event", async () => {
    const { database, sqlite } = createFixture();
    try {
      const command = {
        kind: "create" as const,
        entityKind: "brand" as const,
        intentId: "intent-create-brand",
        name: "  ACME\tTools ",
      };
      const created = await executeCatalogueGovernanceMutationInD1(database, actor("editor-1"), command);
      const replayed = await executeCatalogueGovernanceMutationInD1(database, actor("editor-1"), command);

      expect(created).toMatchObject({ replayed: false, entity: { name: "ACME Tools", normalizedName: "acme tools", revision: 1 } });
      expect(replayed).toEqual({ ...created, replayed: true });
      expect(sqlite.prepare("SELECT COUNT(*) AS count FROM component_brands").get()).toEqual({ count: 1 });
      expect(sqlite.prepare("SELECT COUNT(*) AS count FROM estimate_mutation_receipts").get()).toEqual({ count: 1 });
      expect(sqlite.prepare("SELECT COUNT(*) AS count FROM component_library_telemetry_events").get()).toEqual({ count: 1 });
      const audit = sqlite.prepare("SELECT event_name, payload_json FROM component_library_telemetry_events").get();
      expect(audit?.event_name).toBe("catalogue_entity.created");
      expect(String(audit?.payload_json)).not.toContain("ACME Tools");
      expect(String(audit?.payload_json)).not.toMatch(/token|signed|storage_path/i);
    } finally {
      sqlite.close();
    }
  });

  it("enforces viewer, tenant, lifecycle, and stale-revision guards", async () => {
    const { database, sqlite } = createFixture();
    try {
      await expect(executeCatalogueGovernanceMutationInD1(database, actor("viewer-1"), {
        kind: "create",
        entityKind: "supplier",
        intentId: "viewer-create",
        name: "Denied Supplier",
      })).rejects.toMatchObject({ code: "catalogue_governance_denied" });

      const created = await executeCatalogueGovernanceMutationInD1(database, actor("editor-1"), {
        kind: "create",
        entityKind: "supplier",
        intentId: "supplier-create",
        name: "Supply House",
      });
      await executeCatalogueGovernanceMutationInD1(database, actor("editor-1"), {
        kind: "archive",
        entityKind: "supplier",
        entityId: created.entity.id,
        expectedRevision: 1,
        intentId: "supplier-archive",
      });

      await expect(executeCatalogueGovernanceMutationInD1(database, actor("editor-1"), {
        kind: "create",
        entityKind: "supplier",
        intentId: "supplier-duplicate",
        name: " supply\n house ",
      })).rejects.toMatchObject({ code: "catalogue_governance_archived_duplicate" });
      await expect(executeCatalogueGovernanceMutationInD1(database, actor("editor-1"), {
        kind: "rename",
        entityKind: "supplier",
        entityId: created.entity.id,
        expectedRevision: 1,
        intentId: "supplier-stale-rename",
        name: "Stale Rename",
      })).rejects.toMatchObject({ code: "catalogue_governance_stale_revision" });
      await expect(executeCatalogueGovernanceMutationInD1(database, actor("editor-2", "workspace-2"), {
        kind: "restore",
        entityKind: "supplier",
        entityId: created.entity.id,
        expectedRevision: 2,
        intentId: "cross-tenant-restore",
      })).rejects.toMatchObject({ code: "catalogue_governance_not_found" });
      expect(sqlite.prepare("SELECT COUNT(*) AS count FROM estimate_mutation_receipts WHERE intent_id = 'viewer-create'").get())
        .toEqual({ count: 0 });
    } finally {
      sqlite.close();
    }
  });

  it("renames, archives, and restores with monotonic revisions", async () => {
    const { database, sqlite } = createFixture();
    try {
      const created = await executeCatalogueGovernanceMutationInD1(database, actor("editor-1"), {
        kind: "create",
        entityKind: "brand",
        intentId: "brand-lifecycle-create",
        name: "Original Brand",
      });
      sqlite.exec(`
        INSERT INTO projects (id, workspace_id) VALUES ('rename-project', 'workspace-1');
        INSERT INTO estimates (id, project_id) VALUES ('rename-estimate', 'rename-project');
      `);
      sqlite.prepare(`INSERT INTO estimate_row_items (
        id, estimate_id, brand_id, source_snapshot_json, updated_at
      ) VALUES ('rename-row', 'rename-estimate', ?, ?, ?)`)
        .run(created.entity.id, JSON.stringify({ brand: "Original Brand", brandId: created.entity.id }), timestamp);
      sqlite.prepare(`INSERT INTO cost_library_item_price_options (
        id, workspace_id, item_id, brand_id, brand, updated_at
      ) VALUES ('rename-option', 'workspace-1', 'rename-item', ?, 'Original Brand', ?)`)
        .run(created.entity.id, timestamp);
      const renamed = await executeCatalogueGovernanceMutationInD1(database, actor("editor-1"), {
        kind: "rename",
        entityKind: "brand",
        entityId: created.entity.id,
        expectedRevision: 1,
        intentId: "brand-lifecycle-rename",
        name: "Renamed Brand",
      });
      const archived = await executeCatalogueGovernanceMutationInD1(database, actor("editor-1"), {
        kind: "archive",
        entityKind: "brand",
        entityId: created.entity.id,
        expectedRevision: 2,
        intentId: "brand-lifecycle-archive",
      });
      const restored = await executeCatalogueGovernanceMutationInD1(database, actor("editor-1"), {
        kind: "restore",
        entityKind: "brand",
        entityId: created.entity.id,
        expectedRevision: 3,
        intentId: "brand-lifecycle-restore",
      });

      expect([renamed.entity.revision, archived.entity.revision, restored.entity.revision]).toEqual([2, 3, 4]);
      expect(renamed.affectedEstimates).toEqual([{ projectId: "rename-project", estimateId: "rename-estimate" }]);
      expect([renamed.entity.lifecycleState, archived.entity.lifecycleState, restored.entity.lifecycleState])
        .toEqual(["active", "archived", "active"]);
      expect(sqlite.prepare("SELECT name, normalized_name, revision, lifecycle_state FROM component_brands").get())
        .toEqual({ name: "Renamed Brand", normalized_name: "renamed brand", revision: 4, lifecycle_state: "active" });
      expect(sqlite.prepare("SELECT row_revision, source_snapshot_json FROM estimate_row_items WHERE id = 'rename-row'").get())
        .toMatchObject({ row_revision: 2 });
      expect(JSON.parse(String(sqlite.prepare("SELECT source_snapshot_json FROM estimate_row_items WHERE id = 'rename-row'").get()?.source_snapshot_json)))
        .toMatchObject({ brand: "Renamed Brand", brandId: created.entity.id });
      expect(sqlite.prepare("SELECT brand FROM cost_library_item_price_options WHERE id = 'rename-option'").get())
        .toEqual({ brand: "Renamed Brand" });
      expect(sqlite.prepare("SELECT COUNT(*) AS count FROM estimate_sheet_events").get()).toEqual({ count: 1 });
      expect(sqlite.prepare("SELECT COUNT(*) AS count FROM activity_event_outbox").get()).toEqual({ count: 1 });
      expect(sqlite.prepare("SELECT publication_source_revision FROM projects WHERE id = 'rename-project'").get())
        .toEqual({ publication_source_revision: 1 });
      expect(sqlite.prepare("SELECT COUNT(*) AS count FROM estimate_mutation_receipts").get()).toEqual({ count: 5 });
    } finally {
      sqlite.close();
    }
  });

  it("requires an admin merge and rewrites every current brand reference without touching unrelated identity", async () => {
    const { database, sqlite } = createFixture();
    try {
      sqlite.exec(`
        INSERT INTO component_brands (
          id, workspace_id, name, normalized_name, created_at, updated_at, created_by
        ) VALUES
          ('brand-survivor', 'workspace-1', 'Survivor', 'survivor', '${timestamp}', '${timestamp}', 'admin-1'),
          ('brand-duplicate', 'workspace-1', 'Duplicate', 'duplicate', '${timestamp}', '${timestamp}', 'admin-1');
        INSERT INTO cost_library_items (
          id, workspace_id, brand, brand_id, supplier, supplier_id, updated_at
        ) VALUES ('item-1', 'workspace-1', 'Duplicate', 'brand-duplicate', 'Keep Supplier', NULL, '${timestamp}');
        INSERT INTO cost_library_item_price_options (
          id, workspace_id, item_id, brand_id, brand, updated_at
        ) VALUES ('option-1', 'workspace-1', 'item-1', 'brand-duplicate', 'Duplicate', '${timestamp}');
        INSERT INTO projects (id, workspace_id) VALUES ('project-1', 'workspace-1');
        INSERT INTO estimates (id, project_id) VALUES ('estimate-1', 'project-1');
        INSERT INTO estimate_row_items (
          id, estimate_id, brand_id, source_snapshot_json, updated_at
        ) VALUES (
          'row-1', 'estimate-1', 'brand-duplicate',
          '{"brand":"Duplicate","brandId":"brand-duplicate","supplier":"Keep Supplier"}', '${timestamp}'
        );
        INSERT INTO estimate_templates (
          id, workspace_id, name, description, category, current_version_number, updated_at
        ) VALUES ('template-1', 'workspace-1', 'Fixture', '', 'General', 1, '${timestamp}');
        INSERT INTO estimate_template_nodes (id, template_id, kind, name, sort_order, metadata)
        VALUES ('template-node-1', 'template-1', 'group', 'Fixture', 0, '{}');
        INSERT INTO estimate_template_row_items (
          id, template_id, template_node_id, source_snapshot, updated_at
        ) VALUES (
          'template-row-1', 'template-1', 'template-node-1',
          '{"brand":"Duplicate","brandId":"brand-duplicate"}', '${timestamp}'
        );
        INSERT INTO estimate_template_versions (
          template_id, version_number, workspace_id, snapshot_json, source_fingerprint,
          change_kind, change_summary_json, created_by, created_at
        ) VALUES (
          'template-1', 1, 'workspace-1',
          '{"schemaVersion":1,"template":{"id":"template-1","name":"Fixture","description":"","category":"General"},"nodes":[],"rows":[],"sidecars":{"variantSelections":[]}}',
          'fixture-v1', 'fixture', '{}', 'admin-1', '${timestamp}'
        );
        INSERT INTO estimate_template_instances (
          id, workspace_id, template_id, project_id, estimate_id, link_state,
          applied_version_number, target_version_number, updated_at
        ) VALUES (
          'instance-1', 'workspace-1', 'template-1', 'project-1', 'estimate-1',
          'linked', 1, 1, '${timestamp}'
        );
        INSERT INTO cost_library_component_drafts (id, workspace_id, draft_json, updated_at)
        VALUES ('draft-1', 'workspace-1', '{"brand":"Duplicate","brandId":"brand-duplicate"}', '${timestamp}');
      `);

      const command = {
        kind: "merge" as const,
        entityKind: "brand" as const,
        survivorId: "brand-survivor",
        duplicateId: "brand-duplicate",
        expectedSurvivorRevision: 1,
        expectedDuplicateRevision: 1,
        intentId: "brand-merge",
      };
      await expect(executeCatalogueGovernanceMutationInD1(database, actor("editor-1"), command))
        .rejects.toMatchObject({ code: "catalogue_governance_admin_required" });

      const merged = await executeCatalogueGovernanceMutationInD1(database, actor("admin-1"), command);
      expect(merged).toMatchObject({
        entity: { id: "brand-survivor", revision: 2, lifecycleState: "active" },
        mergedEntity: { id: "brand-duplicate", revision: 2, lifecycleState: "merged", mergedIntoId: "brand-survivor" },
        rewrittenCounts: { costLibraryItems: 1, estimateRows: 1, templateRows: 1, drafts: 1, priceOptions: 1 },
      });
      expect(sqlite.prepare("SELECT brand, brand_id, supplier FROM cost_library_items").get())
        .toEqual({ brand: "Survivor", brand_id: "brand-survivor", supplier: "Keep Supplier" });
      expect(sqlite.prepare("SELECT brand, brand_id FROM cost_library_item_price_options WHERE id = 'option-1'").get())
        .toEqual({ brand: "Survivor", brand_id: "brand-survivor" });
      expect(sqlite.prepare("SELECT brand_id, row_revision, source_snapshot_json FROM estimate_row_items").get())
        .toMatchObject({ brand_id: "brand-survivor", row_revision: 2 });
      expect(JSON.parse(String(sqlite.prepare("SELECT source_snapshot_json FROM estimate_row_items").get()?.source_snapshot_json)))
        .toMatchObject({ brand: "Survivor", brandId: "brand-survivor", supplier: "Keep Supplier" });
      expect(sqlite.prepare("SELECT event_type FROM estimate_sheet_events").get())
        .toEqual({ event_type: "catalogue_reference_rows_rewritten" });
      expect(sqlite.prepare("SELECT status FROM activity_event_outbox").get()).toEqual({ status: "pending" });
      expect(sqlite.prepare("SELECT publication_source_revision FROM projects WHERE id = 'project-1'").get())
        .toEqual({ publication_source_revision: 1 });
      expect(sqlite.prepare("SELECT COUNT(*) AS count FROM estimate_mutation_receipts").get()).toEqual({ count: 2 });
      expect(sqlite.prepare("SELECT current_version_number FROM estimate_templates WHERE id = 'template-1'").get())
        .toEqual({ current_version_number: 2 });
      const version = sqlite.prepare("SELECT snapshot_json FROM estimate_template_versions WHERE template_id = 'template-1' AND version_number = 2").get();
      expect(JSON.parse(String(version?.snapshot_json))).toMatchObject({
        rows: [{ sourceSnapshot: { brand: "Survivor", brandId: "brand-survivor" } }],
        sidecars: { variantSelections: [] },
      });
      expect(sqlite.prepare("SELECT target_version_number, link_state FROM estimate_template_instances WHERE id = 'instance-1'").get())
        .toEqual({ target_version_number: 2, link_state: "updating" });
      expect(sqlite.prepare("SELECT target_version_number, state FROM estimate_template_propagation_jobs WHERE instance_id = 'instance-1'").get())
        .toEqual({ target_version_number: 2, state: "pending" });
      expect(sqlite.prepare("SELECT normalized_name, lifecycle_state, merged_into_id FROM component_brands WHERE id = 'brand-duplicate'").get())
        .toEqual({ normalized_name: "merged:brand-duplicate", lifecycle_state: "merged", merged_into_id: "brand-survivor" });
    } finally {
      sqlite.close();
    }
  });

  it("exports typed governance errors", () => {
    const error = new CatalogueGovernanceError("catalogue_governance_conflict", "Conflict");
    expect(error).toMatchObject({ code: "catalogue_governance_conflict", message: "Conflict" });
  });
});
