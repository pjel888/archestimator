import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

const requireRuntime = createRequire(import.meta.url);
const legacyAttachmentMigration = readFileSync("migrations/0022_component_attachment_metadata.sql", "utf8");
const ownershipMigration = readFileSync("migrations/0076_component_attachment_ownership.sql", "utf8");
const uploadLifecycleProofRouter = readFileSync("src/lib/cloudflare/upload-lifecycle-proof-router.ts", "utf8");

type LocalSqliteDatabase = {
  exec(sql: string): void;
  prepare(sql: string): {
    all(...parameters: unknown[]): Record<string, unknown>[];
    get(...parameters: unknown[]): Record<string, unknown> | undefined;
    run(...parameters: unknown[]): unknown;
  };
  close(): void;
};

const at = "2026-07-14T00:00:00.000Z";

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
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      UNIQUE (id, workspace_id)
    );
    CREATE TABLE upload_assets (
      id TEXT PRIMARY KEY,
      workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
      surface TEXT NOT NULL,
      status TEXT NOT NULL,
      storage_bucket TEXT,
      storage_path TEXT,
      file_name TEXT NOT NULL,
      content_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL
    );
    CREATE TABLE cost_library_item_price_options (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      item_id TEXT NOT NULL,
      UNIQUE (workspace_id, item_id, id)
    );
    CREATE TABLE cost_library_item_variant_cost_entries (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      item_id TEXT NOT NULL,
      price_option_id TEXT NOT NULL,
      UNIQUE (workspace_id, item_id, price_option_id, id)
    );
  `);
  database.exec(legacyAttachmentMigration);
  database.prepare("INSERT INTO workspaces (id) VALUES (?)").run("workspace-1");
  database.prepare("INSERT INTO projects (id, workspace_id) VALUES (?, ?)").run("project-1", "workspace-1");
  database.prepare("INSERT INTO cost_library_item_price_options (id, workspace_id, item_id) VALUES (?, ?, ?)")
    .run("option-1", "workspace-1", "item-1");
  database.prepare(`
    INSERT INTO cost_library_item_variant_cost_entries (id, workspace_id, item_id, price_option_id)
    VALUES (?, ?, ?, ?)
  `).run("cost-entry-1", "workspace-1", "item-1", "option-1");
  return database;
}

function seedUploadAsset(database: LocalSqliteDatabase, input: {
  id: string;
  path: string;
  status?: string;
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
}) {
  database.prepare(`
    INSERT INTO upload_assets (
      id, workspace_id, surface, status, storage_bucket, storage_path,
      file_name, content_type, size_bytes
    ) VALUES (?, 'workspace-1', 'component-attachment', ?, 'component-attachments', ?, ?, ?, ?)
  `).run(
    input.id,
    input.status ?? "finalized",
    input.path,
    input.fileName ?? `${input.id}.pdf`,
    input.contentType ?? "application/pdf",
    input.sizeBytes ?? 128,
  );
}

function seedLegacyAttachment(database: LocalSqliteDatabase, input: {
  id: string;
  path: string;
  fileName?: string;
  itemId?: string | null;
  priceOptionId?: string | null;
  costEntryId?: string | null;
  reviewStatus?: string;
  currentApproved?: number;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  supersededBy?: string | null;
  reviewRevision?: number;
}) {
  database.prepare(`
    INSERT INTO cost_library_item_variant_attachments (
      id, price_option_id, item_id, workspace_id, storage_bucket, storage_path,
      file_name, content_type, size_bytes, attachment_kind, metadata_json,
      created_by, review_status, applicable_cost_entry_id, is_current_approved,
      reviewed_by, reviewed_at, review_note, superseded_by, review_revision,
      created_at, updated_at
    ) VALUES (?, ?, ?, 'workspace-1', 'component-attachments', ?, ?, 'application/pdf', 128, 'pdf', ?,
      'user-1', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.id,
    input.priceOptionId === undefined ? "option-1" : input.priceOptionId,
    input.itemId === undefined ? "item-1" : input.itemId,
    input.path,
    input.fileName ?? `${input.id}.pdf`,
    JSON.stringify({ legacy: input.id }),
    input.reviewStatus ?? "uploaded",
    input.costEntryId === undefined ? "cost-entry-1" : input.costEntryId,
    input.currentApproved ?? 0,
    input.reviewedBy ?? null,
    input.reviewedAt ?? null,
    input.reviewNote ?? null,
    input.supersededBy ?? null,
    input.reviewRevision ?? 1,
    at,
    at,
  );
}

function applyOwnershipMigration(database: LocalSqliteDatabase) {
  database.exec(`BEGIN;\n${ownershipMigration}\nCOMMIT;`);
}

function expectPreflightRollback(database: LocalSqliteDatabase) {
  const rowsBefore = database.prepare("SELECT * FROM cost_library_item_variant_attachments ORDER BY id").all();
  expect(() => applyOwnershipMigration(database)).toThrow("component_attachment_ownership_preflight_failed");
  expect(database.prepare("SELECT * FROM cost_library_item_variant_attachments ORDER BY id").all()).toEqual(rowsBefore);
  expect(database.prepare("SELECT name FROM sqlite_master WHERE name = 'component_variant_attachments'").get()).toBeUndefined();
  expect(database.prepare("SELECT name FROM sqlite_master WHERE name LIKE '%__0076%'").all()).toEqual([]);
}

describe("component attachment ownership migration", () => {
  it("preserves every reviewed Library row and binds it to one immutable upload asset", () => {
    const database = createDatabase();
    try {
      seedUploadAsset(database, { id: "asset-replacement", path: "workspace-1/user-1/replacement.pdf", fileName: "replacement.pdf" });
      seedUploadAsset(database, { id: "asset-original", path: "workspace-1/user-1/original.pdf", fileName: "original.pdf" });
      seedLegacyAttachment(database, {
        id: "attachment-replacement",
        path: "workspace-1/user-1/replacement.pdf",
        fileName: "replacement.pdf",
        reviewStatus: "approved",
        currentApproved: 1,
        reviewedBy: "reviewer-1",
        reviewedAt: at,
        reviewNote: "Approved replacement",
        reviewRevision: 4,
      });
      seedLegacyAttachment(database, {
        id: "attachment-original",
        path: "workspace-1/user-1/original.pdf",
        fileName: "original.pdf",
        reviewStatus: "superseded",
        reviewedBy: "reviewer-1",
        reviewedAt: at,
        reviewNote: "Replaced",
        supersededBy: "attachment-replacement",
        reviewRevision: 3,
      });

      applyOwnershipMigration(database);

      expect(database.prepare(`
        SELECT id, owner_scope, upload_asset_id, applicable_cost_entry_id, review_status,
          is_current_approved, reviewed_by, reviewed_at, review_note, superseded_by, review_revision
        FROM component_variant_attachments
        ORDER BY id
      `).all()).toEqual([
        {
          id: "attachment-original",
          owner_scope: "library",
          upload_asset_id: "asset-original",
          applicable_cost_entry_id: "cost-entry-1",
          review_status: "superseded",
          is_current_approved: 0,
          reviewed_by: "reviewer-1",
          reviewed_at: at,
          review_note: "Replaced",
          superseded_by: "attachment-replacement",
          review_revision: 3,
        },
        {
          id: "attachment-replacement",
          owner_scope: "library",
          upload_asset_id: "asset-replacement",
          applicable_cost_entry_id: "cost-entry-1",
          review_status: "approved",
          is_current_approved: 1,
          reviewed_by: "reviewer-1",
          reviewed_at: at,
          review_note: "Approved replacement",
          superseded_by: null,
          review_revision: 4,
        },
      ]);
      expect(database.prepare("SELECT name FROM sqlite_master WHERE name = 'cost_library_item_variant_attachments'").get()).toBeUndefined();
      expect(database.prepare("SELECT name FROM sqlite_master WHERE type = 'view' AND name LIKE '%attachment%'").all()).toEqual([]);
      expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
      expect(database.prepare("PRAGMA foreign_key_list(component_variant_attachments)").all()).toEqual(expect.arrayContaining([
        expect.objectContaining({ table: "upload_assets", from: "upload_asset_id", on_delete: "RESTRICT" }),
      ]));
      const uniqueIndexes = database.prepare("PRAGMA index_list(component_variant_attachments)").all()
        .filter((row) => row.unique === 1)
        .map((row) => database.prepare(`PRAGMA index_info(${String(row.name)})`).all().map((column) => column.name));
      expect(uniqueIndexes).toContainEqual(["upload_asset_id"]);
      expect(database.prepare(`
        SELECT sql FROM sqlite_master
        WHERE type = 'index' AND name = 'idx_component_variant_attachments_project_option_created'
      `).get()?.sql).toContain("(workspace_id, project_id, project_component_id, price_option_id, created_at DESC)");
      expect(() => database.prepare("DELETE FROM upload_assets WHERE id = ?").run("asset-original")).toThrow("FOREIGN KEY constraint failed");
      expect(database.prepare("SELECT name FROM sqlite_master WHERE name LIKE '%__0076%'").all()).toEqual([]);
    } finally {
      database.close();
    }
  });

  it("rolls back an attachment without a valid Library owner tuple", () => {
    const database = createDatabase();
    try {
      seedUploadAsset(database, { id: "asset-1", path: "workspace-1/user-1/attachment-1.pdf", fileName: "attachment-1.pdf" });
      seedLegacyAttachment(database, {
        id: "attachment-1",
        path: "workspace-1/user-1/attachment-1.pdf",
        itemId: null,
      });
      expectPreflightRollback(database);
    } finally {
      database.close();
    }
  });

  it("enforces mutually exclusive Library and Project owner fields", () => {
    const database = createDatabase();
    try {
      applyOwnershipMigration(database);
      seedUploadAsset(database, {
        id: "asset-project",
        path: "workspace-1/user-1/project.pdf",
        fileName: "project.pdf",
      });
      database.prepare(`
        INSERT INTO component_variant_attachments (
          id, owner_scope, price_option_id, item_id, project_id, project_component_id,
          workspace_id, upload_asset_id, storage_bucket, storage_path, file_name,
          content_type, size_bytes, metadata_json, review_status, created_at, updated_at
        ) VALUES (
          'attachment-project', 'project', 'project-option', NULL, 'project-1', 'component-1',
          'workspace-1', 'asset-project', 'component-attachments',
          'workspace-1/user-1/project.pdf', 'project.pdf', 'application/pdf', 128,
          '{}', 'uploaded', ?, ?
        )
      `).run(at, at);

      expect(database.prepare(`
        SELECT owner_scope, item_id, project_id, project_component_id
        FROM component_variant_attachments
        WHERE id = 'attachment-project'
      `).get()).toEqual({
        owner_scope: "project",
        item_id: null,
        project_id: "project-1",
        project_component_id: "component-1",
      });
      expect(() => database.prepare(`
        UPDATE component_variant_attachments
        SET item_id = 'item-1'
        WHERE id = 'attachment-project'
      `).run()).toThrow("CHECK constraint failed");
    } finally {
      database.close();
    }
  });

  it.each([
    ["has no finalized asset", []],
    ["has only a pending asset", [{ id: "asset-1", status: "pending" }]],
    ["has a mismatched file tuple", [{ id: "asset-1", fileName: "different.pdf" }]],
    ["matches more than one finalized asset", [{ id: "asset-1" }, { id: "asset-2" }]],
  ])("rolls back when a source attachment %s", (_scenario, assets) => {
    const database = createDatabase();
    try {
      const path = "workspace-1/user-1/attachment-1.pdf";
      for (const asset of assets) {
        seedUploadAsset(database, {
          id: asset.id,
          path,
          status: asset.status,
          fileName: asset.fileName ?? "attachment-1.pdf",
        });
      }
      seedLegacyAttachment(database, { id: "attachment-1", path, fileName: "attachment-1.pdf" });
      expectPreflightRollback(database);
    } finally {
      database.close();
    }
  });

  it("rolls back a cost entry outside the attachment owner tuple", () => {
    const database = createDatabase();
    try {
      database.prepare(`
        INSERT INTO cost_library_item_variant_cost_entries (id, workspace_id, item_id, price_option_id)
        VALUES ('cost-entry-other', 'workspace-1', 'item-other', 'option-1')
      `).run();
      seedUploadAsset(database, { id: "asset-1", path: "workspace-1/user-1/attachment-1.pdf", fileName: "attachment-1.pdf" });
      seedLegacyAttachment(database, {
        id: "attachment-1",
        path: "workspace-1/user-1/attachment-1.pdf",
        costEntryId: "cost-entry-other",
      });
      expectPreflightRollback(database);
    } finally {
      database.close();
    }
  });

  it("rolls back a missing supersession target", () => {
    const database = createDatabase();
    try {
      seedUploadAsset(database, { id: "asset-1", path: "workspace-1/user-1/attachment-1.pdf", fileName: "attachment-1.pdf" });
      database.exec("PRAGMA foreign_keys = OFF;");
      seedLegacyAttachment(database, {
        id: "attachment-1",
        path: "workspace-1/user-1/attachment-1.pdf",
        reviewStatus: "superseded",
        reviewedBy: "reviewer-1",
        reviewedAt: at,
        supersededBy: "attachment-missing",
      });
      database.exec("PRAGMA foreign_keys = ON;");
      expectPreflightRollback(database);
    } finally {
      database.close();
    }
  });

  it("proves hosted eligibility through the immutable upload asset binding", () => {
    expect(uploadLifecycleProofRouter).toContain("ON u.id = a.upload_asset_id");
    expect(uploadLifecycleProofRouter).toContain("uploadAssetBindingMatches");
    expect(uploadLifecycleProofRouter).toContain("attachmentEligibility.uploadAssetBindingMatches");
  });
});
