import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import {
  buildProjectComponentAttachmentDeleteRetentionStatements,
  buildProjectComponentAttachmentRestoreRetentionStatements,
  expireProjectComponentAttachmentRetentionHolds,
  type ProjectComponentAttachmentRetentionStatement,
} from "@/lib/estimates/project-component-attachment-retention";

const requireRuntime = createRequire(import.meta.url);
const retentionMigration = readFileSync("migrations/0079_project_component_attachment_retention.sql", "utf8");

type LocalSqliteStatement = {
  all(...values: unknown[]): Record<string, unknown>[];
  get(...values: unknown[]): Record<string, unknown> | undefined;
  run(...values: unknown[]): { changes: number | bigint };
};

type LocalSqliteDatabase = {
  exec(sql: string): void;
  prepare(sql: string): LocalSqliteStatement;
  close(): void;
};

const WORKSPACE_ID = "workspace-1";
const PROJECT_ID = "project-1";
const ESTIMATE_ID = "estimate-1";
const COMPONENT_ID = "component-1";
const ATTACHMENT_ID = "attachment-1";
const ASSET_ID = "asset-1";
const DELETED_AT = "2026-07-14T00:00:00.000Z";
const EXPIRED_AT = new Date("2026-08-14T00:00:00.000Z");

function normalizeValue(value: D1Value) {
  return value instanceof ArrayBuffer ? Buffer.from(value) : value;
}

class SqliteD1Statement<T = Record<string, unknown>> implements D1PreparedStatementLike<T> {
  private values: D1Value[] = [];

  constructor(
    private readonly database: LocalSqliteDatabase,
    readonly sql: string,
  ) {}

  bind(...values: D1Value[]) {
    this.values = values;
    return this;
  }

  async first<R = T>(): Promise<R | null> {
    return (this.database.prepare(this.sql).get(...this.values.map(normalizeValue)) as R | undefined) ?? null;
  }

  async all<R = T>(): Promise<D1Result<R>> {
    return { success: true, results: this.database.prepare(this.sql).all(...this.values.map(normalizeValue)) as R[] };
  }

  async run(): Promise<D1Result<T>> {
    const result = this.sql.trimStart().startsWith("SELECT")
      ? (this.database.prepare(this.sql).all(...this.values.map(normalizeValue)), { changes: 0 })
      : this.database.prepare(this.sql).run(...this.values.map(normalizeValue));
    return { success: true, meta: { changes: Number(result.changes) } };
  }
}

class SqliteD1Database implements D1DatabaseLike {
  constructor(readonly sqlite: LocalSqliteDatabase) {}

  prepare<T = Record<string, unknown>>(sql: string) {
    return new SqliteD1Statement<T>(this.sqlite, sql);
  }

  async batch<T = Record<string, unknown>>(statements: D1PreparedStatementLike<T>[]): Promise<D1Result<T>[]> {
    this.sqlite.exec("BEGIN");
    try {
      const results: D1Result<T>[] = [];
      for (const statement of statements as SqliteD1Statement<T>[]) results.push(await statement.run());
      this.sqlite.exec("COMMIT");
      return results;
    } catch (error) {
      this.sqlite.exec("ROLLBACK");
      throw error;
    }
  }
}

function createDatabase() {
  const { DatabaseSync } = requireRuntime("node:sqlite") as {
    DatabaseSync: new (path: string) => LocalSqliteDatabase;
  };
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE workspaces (id TEXT PRIMARY KEY);
    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      UNIQUE (id, workspace_id)
    );
    CREATE TABLE estimates (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE
    );
    CREATE TABLE estimate_row_items (
      id TEXT PRIMARY KEY,
      estimate_id TEXT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
      source_snapshot_json TEXT,
      metadata_json TEXT
    );
    CREATE TABLE upload_assets (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE component_variant_attachments (
      id TEXT PRIMARY KEY,
      owner_scope TEXT NOT NULL,
      project_id TEXT,
      project_component_id TEXT,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      upload_asset_id TEXT NOT NULL UNIQUE REFERENCES upload_assets(id) ON DELETE RESTRICT,
      review_status TEXT NOT NULL,
      is_current_approved INTEGER NOT NULL DEFAULT 0,
      reviewed_by TEXT,
      reviewed_at TEXT,
      review_note TEXT,
      review_revision INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id, workspace_id) REFERENCES projects(id, workspace_id) ON DELETE CASCADE
    );
  `);
  sqlite.exec(retentionMigration);
  sqlite.prepare("INSERT INTO workspaces (id) VALUES (?)").run(WORKSPACE_ID);
  sqlite.prepare("INSERT INTO projects (id, workspace_id) VALUES (?, ?)").run(PROJECT_ID, WORKSPACE_ID);
  sqlite.prepare("INSERT INTO estimates (id, project_id) VALUES (?, ?)").run(ESTIMATE_ID, PROJECT_ID);
  sqlite.prepare("INSERT INTO upload_assets (id, workspace_id, status, updated_at) VALUES (?, ?, 'finalized', ?)")
    .run(ASSET_ID, WORKSPACE_ID, DELETED_AT);
  sqlite.prepare(`
    INSERT INTO component_variant_attachments (
      id, owner_scope, project_id, project_component_id, workspace_id,
      upload_asset_id, review_status, updated_at
    ) VALUES (?, 'project', ?, ?, ?, ?, 'uploaded', ?)
  `).run(ATTACHMENT_ID, PROJECT_ID, COMPONENT_ID, WORKSPACE_ID, ASSET_ID, DELETED_AT);
  return new SqliteD1Database(sqlite);
}

function projectComponentRow(id: string) {
  return {
    id,
    estimate_id: ESTIMATE_ID,
    source_snapshot_json: JSON.stringify({
      sourceType: "project_component",
      sourceComponentId: COMPONENT_ID,
      priceOptions: [{ id: "variant-1", attachments: [{ id: ATTACHMENT_ID }] }],
    }),
    metadata_json: "{}",
  };
}

function insertRow(database: SqliteD1Database, row: ReturnType<typeof projectComponentRow>) {
  database.sqlite.prepare(`
    INSERT INTO estimate_row_items (id, estimate_id, source_snapshot_json, metadata_json)
    VALUES (?, ?, ?, ?)
  `).run(row.id, row.estimate_id, row.source_snapshot_json, row.metadata_json);
}

async function batch(database: SqliteD1Database, statements: ProjectComponentAttachmentRetentionStatement[]) {
  await database.batch!(statements.map((statement) => database.prepare(statement.sql).bind(...(statement.values ?? []))));
}

function deleteStatements(eventId: string, rows: Array<ReturnType<typeof projectComponentRow>>) {
  return buildProjectComponentAttachmentDeleteRetentionStatements({
    workspaceId: WORKSPACE_ID,
    projectId: PROJECT_ID,
    sourceDeleteEventId: eventId,
    deletedRows: rows,
    deletedAt: DELETED_AT,
  });
}

describe("project component attachment retention", () => {
  it("creates a delete-event hold only when the final live component instance is removed", async () => {
    const database = createDatabase();
    try {
      const firstRow = projectComponentRow("row-1");
      const secondRow = projectComponentRow("row-2");
      insertRow(database, firstRow);
      insertRow(database, secondRow);

      await batch(database, [
        ...deleteStatements("delete-event-1", [firstRow]),
        { sql: "DELETE FROM estimate_row_items WHERE id = ?", values: [firstRow.id] },
      ]);
      expect(database.sqlite.prepare("SELECT * FROM project_component_attachment_retention_holds").all()).toEqual([]);

      await batch(database, [
        ...deleteStatements("delete-event-2", [secondRow]),
        { sql: "DELETE FROM estimate_row_items WHERE id = ?", values: [secondRow.id] },
      ]);
      expect(database.sqlite.prepare(`
        SELECT source_delete_event_id, attachment_id, release_reason
        FROM project_component_attachment_retention_holds
      `).all()).toEqual([{ source_delete_event_id: "delete-event-2", attachment_id: ATTACHMENT_ID, release_reason: null }]);
    } finally {
      database.sqlite.close();
    }
  });

  it("restores the row and releases its delete-event hold in one batch", async () => {
    const database = createDatabase();
    try {
      const row = projectComponentRow("row-1");
      insertRow(database, row);
      await batch(database, [
        ...deleteStatements("delete-event-1", [row]),
        { sql: "DELETE FROM estimate_row_items WHERE id = ?", values: [row.id] },
      ]);
      const restore = buildProjectComponentAttachmentRestoreRetentionStatements({
        projectId: PROJECT_ID,
        sourceDeleteEventId: "delete-event-1",
        restoredRows: [row],
        restoredAt: "2026-07-20T00:00:00.000Z",
      });
      await batch(database, [
        ...restore.guardStatements,
        {
          sql: "INSERT INTO estimate_row_items (id, estimate_id, source_snapshot_json, metadata_json) VALUES (?, ?, ?, ?)",
          values: [row.id, row.estimate_id, row.source_snapshot_json, row.metadata_json],
        },
        ...restore.releaseStatements,
      ]);

      expect(database.sqlite.prepare(`
        SELECT release_reason, released_at
        FROM project_component_attachment_retention_holds
      `).get()).toEqual({ release_reason: "restored", released_at: "2026-07-20T00:00:00.000Z" });
      expect(database.sqlite.prepare("SELECT status FROM upload_assets WHERE id = ?").get(ASSET_ID)).toEqual({ status: "finalized" });
    } finally {
      database.sqlite.close();
    }
  });

  it("expires metadata only after the restore window and while no live instance exists", async () => {
    const database = createDatabase();
    try {
      const row = projectComponentRow("row-1");
      insertRow(database, row);
      await batch(database, [
        ...deleteStatements("delete-event-1", [row]),
        { sql: "DELETE FROM estimate_row_items WHERE id = ?", values: [row.id] },
      ]);

      const summary = await expireProjectComponentAttachmentRetentionHolds(database, { now: EXPIRED_AT });

      expect(summary).toEqual({
        liveInstanceReleaseCount: 0,
        expiredReleaseCount: 1,
        supersededAttachmentCount: 1,
        removedAssetCount: 1,
      });
      expect(database.sqlite.prepare("SELECT release_reason FROM project_component_attachment_retention_holds").get()).toEqual({ release_reason: "expired" });
      expect(database.sqlite.prepare("SELECT review_status FROM component_variant_attachments WHERE id = ?").get(ATTACHMENT_ID)).toEqual({ review_status: "superseded" });
      expect(database.sqlite.prepare("SELECT status FROM upload_assets WHERE id = ?").get(ASSET_ID)).toEqual({ status: "removed" });
    } finally {
      database.sqlite.close();
    }
  });

  it("serializes restore-versus-expiry so restore-first survives and cleanup-first fails closed", async () => {
    const restoreFirst = createDatabase();
    const cleanupFirst = createDatabase();
    try {
      const row = projectComponentRow("row-1");
      for (const database of [restoreFirst, cleanupFirst]) {
        insertRow(database, row);
        await batch(database, [
          ...deleteStatements("delete-event-1", [row]),
          { sql: "DELETE FROM estimate_row_items WHERE id = ?", values: [row.id] },
        ]);
      }

      const restore = buildProjectComponentAttachmentRestoreRetentionStatements({
        projectId: PROJECT_ID,
        sourceDeleteEventId: "delete-event-1",
        restoredRows: [row],
        restoredAt: EXPIRED_AT.toISOString(),
      });
      await batch(restoreFirst, [
        ...restore.guardStatements,
        {
          sql: "INSERT INTO estimate_row_items (id, estimate_id, source_snapshot_json, metadata_json) VALUES (?, ?, ?, ?)",
          values: [row.id, row.estimate_id, row.source_snapshot_json, row.metadata_json],
        },
        ...restore.releaseStatements,
      ]);
      await expireProjectComponentAttachmentRetentionHolds(restoreFirst, { now: EXPIRED_AT });
      expect(restoreFirst.sqlite.prepare("SELECT status FROM upload_assets WHERE id = ?").get(ASSET_ID)).toEqual({ status: "finalized" });

      await expireProjectComponentAttachmentRetentionHolds(cleanupFirst, { now: EXPIRED_AT });
      await expect(batch(cleanupFirst, [
        ...restore.guardStatements,
        {
          sql: "INSERT INTO estimate_row_items (id, estimate_id, source_snapshot_json, metadata_json) VALUES (?, ?, ?, ?)",
          values: [row.id, row.estimate_id, row.source_snapshot_json, row.metadata_json],
        },
        ...restore.releaseStatements,
      ])).rejects.toThrow();
      expect(cleanupFirst.sqlite.prepare("SELECT COUNT(*) AS count FROM estimate_row_items").get()).toEqual({ count: 0 });
    } finally {
      restoreFirst.sqlite.close();
      cleanupFirst.sqlite.close();
    }
  });
});
