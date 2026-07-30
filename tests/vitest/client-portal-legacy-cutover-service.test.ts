import { createHash } from "node:crypto";
import { createRequire } from "node:module";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1Result,
  D1Value,
} from "@/lib/cloudflare/d1";

const requireRuntime = createRequire(import.meta.url);
const loggerMocks = vi.hoisted(() => ({ logAppError: vi.fn() }));
const migrationMocks = vi.hoisted(() => ({ migrate: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/observability/logger", () => ({
  logAppError: loggerMocks.logAppError,
}));
vi.mock("@/lib/client-portal/legacy-migration-service", () => ({
  migrateLegacyPublicationToClientPortal: migrationMocks.migrate,
}));

import {
  cutoverLegacyWorkspaceToClientPortals,
  LegacyWorkspaceCutoverError,
  recoverLegacyWorkspaceCutoverBarrier,
} from "@/lib/client-portal/legacy-cutover-service";

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

function normalizeValue(value: D1Value) {
  return value instanceof ArrayBuffer ? Buffer.from(value) : value;
}

class SqliteD1Statement<T = Record<string, unknown>> implements D1PreparedStatementLike<T> {
  private values: D1Value[] = [];

  constructor(
    private readonly database: SqliteDatabase,
    readonly sql: string,
    private readonly failSqlIncludes: string | null,
  ) {}

  bind(...values: D1Value[]) {
    this.values = values;
    return this;
  }

  async first<R = T>(): Promise<R | null> {
    return (this.database.prepare(this.sql).get(...this.values.map(normalizeValue)) as R | undefined) ?? null;
  }

  async all<R = T>(): Promise<D1Result<R>> {
    return {
      success: true,
      results: this.database.prepare(this.sql).all(...this.values.map(normalizeValue)) as R[],
    };
  }

  async run(): Promise<D1Result<T>> {
    if (this.failSqlIncludes && this.sql.includes(this.failSqlIncludes)) {
      throw new Error("Injected cutover batch failure.");
    }
    if (this.sql.trimStart().startsWith("SELECT")) {
      this.database.prepare(this.sql).all(...this.values.map(normalizeValue));
      return { success: true, results: [], meta: { changes: 0 } };
    }
    const result = this.database.prepare(this.sql).run(...this.values.map(normalizeValue));
    return { success: true, meta: { changes: Number(result.changes) } };
  }
}

class SqliteD1Database implements D1DatabaseLike {
  batchCount = 0;

  constructor(
    readonly sqlite: SqliteDatabase,
    private readonly failSqlIncludes: string | null = null,
  ) {}

  prepare<T = Record<string, unknown>>(sql: string) {
    return new SqliteD1Statement<T>(this.sqlite, sql, this.failSqlIncludes);
  }

  async batch<T = Record<string, unknown>>(
    statements: D1PreparedStatementLike<T>[],
  ): Promise<D1Result<T>[]> {
    this.batchCount += 1;
    this.sqlite.exec("BEGIN IMMEDIATE");
    try {
      const results: D1Result<T>[] = [];
      for (const statement of statements as SqliteD1Statement<T>[]) {
        results.push(await statement.run());
      }
      this.sqlite.exec("COMMIT");
      return results;
    } catch (error) {
      this.sqlite.exec("ROLLBACK");
      throw error;
    }
  }
}

const WORKSPACE_ID = "workspace_1";
const PUBLICATION_ID = "publication_1";
const PROJECT_ID = "project_1";
const PORTAL_ID = "portal_1";
const ISSUE_ID = "issue_1";
const OPERATOR = { email: "admin@example.com", userId: "admin_1" };

function createDatabase(failSqlIncludes: string | null = null) {
  const { DatabaseSync } = requireRuntime("node:sqlite") as {
    DatabaseSync: new (path: string) => SqliteDatabase;
  };
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    CREATE TABLE projects (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL);
    CREATE TABLE project_publications (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      encrypted_token TEXT,
      status TEXT NOT NULL,
      published_at TEXT NOT NULL
    );
    CREATE TABLE shared_link_recipients (id TEXT PRIMARY KEY, publication_id TEXT NOT NULL);
    CREATE TABLE shared_link_comments (id TEXT PRIMARY KEY, publication_id TEXT NOT NULL);
    CREATE TABLE shared_link_responses (id TEXT PRIMARY KEY, publication_id TEXT NOT NULL);
    CREATE TABLE shared_link_events (id TEXT PRIMARY KEY, publication_id TEXT NOT NULL);
    CREATE TABLE client_portals (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      project_id TEXT NOT NULL
    );
    CREATE TABLE client_portal_issues (
      id TEXT PRIMARY KEY,
      portal_id TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT '2026-07-27T00:00:00.000Z'
    );
    CREATE TABLE client_portal_decisions (
      id TEXT PRIMARY KEY,
      portal_id TEXT NOT NULL DEFAULT '',
      issue_id TEXT NOT NULL,
      decision TEXT NOT NULL,
      submitted_at TEXT NOT NULL DEFAULT '2026-07-27T00:00:00.000Z',
      voided_at TEXT
    );
    CREATE TABLE client_portal_threads (id TEXT PRIMARY KEY, portal_id TEXT NOT NULL);
    CREATE TABLE client_portal_messages (id TEXT PRIMARY KEY, thread_id TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE project_change_requests (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      origin_portal_id TEXT,
      requested_at TEXT NOT NULL
    );
    CREATE TABLE client_portal_legacy_mappings (
      legacy_publication_id TEXT PRIMARY KEY,
      portal_id TEXT NOT NULL,
      issue_id TEXT NOT NULL,
      migration_status TEXT NOT NULL,
      verified_at TEXT,
      notes TEXT
    );
    CREATE TABLE client_portal_baselines (id TEXT PRIMARY KEY, issue_id TEXT NOT NULL);
    CREATE TABLE client_portal_issue_source_estimates (id TEXT PRIMARY KEY, issue_id TEXT NOT NULL);
    CREATE TABLE client_portal_baseline_backfill_exceptions (
      id TEXT PRIMARY KEY,
      portal_id TEXT NOT NULL,
      issue_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      details_json TEXT NOT NULL,
      detected_at TEXT NOT NULL,
      resolved_at TEXT
    );
    CREATE TABLE client_portal_legacy_workspace_cutovers (
      workspace_id TEXT PRIMARY KEY,
      frozen_at TEXT NOT NULL,
      frozen_by TEXT NOT NULL
    );
    CREATE TRIGGER client_portal_legacy_mappings_cutover_lease_insert
    BEFORE INSERT ON client_portal_legacy_mappings
    WHEN json_extract(NEW.notes, '$.cutover_lease_frozen_at') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM project_publications publication
      JOIN client_portal_legacy_workspace_cutovers barrier ON barrier.workspace_id = publication.workspace_id
      WHERE publication.id = NEW.legacy_publication_id
        AND barrier.frozen_at = json_extract(NEW.notes, '$.cutover_lease_frozen_at')
        AND barrier.frozen_by = json_extract(NEW.notes, '$.cutover_lease_frozen_by')
    )
    BEGIN
      SELECT RAISE(ABORT, 'legacy cutover barrier lease is stale');
    END;
    CREATE TRIGGER client_portal_legacy_mappings_cutover_lease_update
    BEFORE UPDATE OF notes, migration_status ON client_portal_legacy_mappings
    WHEN json_extract(OLD.notes, '$.cutover_lease_frozen_at') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM project_publications publication
      JOIN client_portal_legacy_workspace_cutovers barrier ON barrier.workspace_id = publication.workspace_id
      WHERE publication.id = NEW.legacy_publication_id
        AND barrier.frozen_at = json_extract(OLD.notes, '$.cutover_lease_frozen_at')
        AND barrier.frozen_by = json_extract(OLD.notes, '$.cutover_lease_frozen_by')
    )
    BEGIN
      SELECT RAISE(ABORT, 'legacy cutover barrier lease is stale');
    END;
    CREATE TRIGGER shared_link_comments_cutover_freeze_insert
    BEFORE INSERT ON shared_link_comments
    WHEN EXISTS (
      SELECT 1 FROM project_publications publication
      JOIN client_portal_legacy_workspace_cutovers cutover ON cutover.workspace_id = publication.workspace_id
      WHERE publication.id = NEW.publication_id
    )
    BEGIN
      SELECT RAISE(ABORT, 'legacy comment writes are frozen after Client Portal cutover');
    END;
    CREATE TABLE client_portal_audit_events (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      portal_id TEXT,
      issue_id TEXT,
      actor_type TEXT NOT NULL,
      actor_id TEXT,
      event_type TEXT NOT NULL,
      visibility TEXT NOT NULL,
      metadata_json TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE admin_audit_events (
      id TEXT PRIMARY KEY,
      actor_user_id TEXT NOT NULL,
      actor_email TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      summary_json TEXT,
      request_id TEXT,
      created_at TEXT NOT NULL
    );
    INSERT INTO projects(id, workspace_id) VALUES ('${PROJECT_ID}', '${WORKSPACE_ID}');
    INSERT INTO project_publications(id, workspace_id, project_id, encrypted_token, status, published_at)
    VALUES ('${PUBLICATION_ID}', '${WORKSPACE_ID}', '${PROJECT_ID}', 'encrypted', 'published', '2026-07-27T00:00:00.000Z');
  `);
  return new SqliteD1Database(sqlite, failSqlIncludes);
}

function migrationReport(options?: { unresolved?: boolean; status?: "already_migrated" | "planned" | "verified" }) {
  const unresolved = options?.unresolved
    ? [{ id: "comment_1", kind: "comment" as const, reason: "missing_or_ambiguous_recipient" }]
    : [];
  return {
    audienceStrategy: "project_default" as const,
    comments: { imported: unresolved.length > 0 ? 0 : 1, unresolved: unresolved.length },
    decisions: { imported: 0, unresolved: 0 },
    dryRun: options?.status !== "verified",
    issueId: ISSUE_ID,
    legacyPublicationId: PUBLICATION_ID,
    portalId: PORTAL_ID,
    recipients: { imported: 1, unresolved: 0 },
    snapshot: { estimateCount: 1, legacyHistorySha256: "c".repeat(64), rowCount: 1, sha256: "b".repeat(64), sourceSha256: "d".repeat(64) },
    status: options?.status ?? "planned",
    unresolved,
  };
}

function cutoverLeaseNotes(cutoverLease: { frozenAt: string; frozenBy: string } | undefined) {
  if (!cutoverLease) throw new Error("Cutover lease was not provided.");
  return JSON.stringify({
    cutover_lease_frozen_at: cutoverLease.frozenAt,
    cutover_lease_frozen_by: cutoverLease.frozenBy,
  });
}

function readRow(database: SqliteD1Database, sql: string) {
  return database.sqlite.prepare(sql).get();
}

let activeDatabase: SqliteD1Database | null = null;

function mockVerifiedMigration(options: {
  afterWrite?: (database: D1DatabaseLike) => Promise<void>;
  mappingStatus?: "imported" | "verified";
} = {}) {
  migrationMocks.migrate.mockImplementation(async ({ apply, cutoverLease, database }: {
    apply: boolean;
    cutoverLease?: { frozenAt: string; frozenBy: string };
    database: D1DatabaseLike;
  }) => {
    if (!apply) return migrationReport();
    await database.prepare("INSERT INTO client_portals(id, workspace_id, project_id) VALUES (?, ?, ?)")
      .bind(PORTAL_ID, WORKSPACE_ID, PROJECT_ID)
      .run();
    await database.prepare("INSERT INTO client_portal_issues(id, portal_id, status) VALUES (?, ?, 'issued')")
      .bind(ISSUE_ID, PORTAL_ID)
      .run();
    await database.prepare(`INSERT INTO client_portal_legacy_mappings
      (legacy_publication_id, portal_id, issue_id, migration_status, verified_at, notes)
      VALUES (?, ?, ?, ?, '2026-07-28T00:00:00.000Z', ?)`)
      .bind(
        PUBLICATION_ID,
        PORTAL_ID,
        ISSUE_ID,
        options.mappingStatus ?? "verified",
        cutoverLeaseNotes(cutoverLease),
      )
      .run();
    await options.afterWrite?.(database);
    return migrationReport({ status: "verified" });
  });
}

async function planCutover(database: D1DatabaseLike) {
  return cutoverLegacyWorkspaceToClientPortals({ database, workspaceId: WORKSPACE_ID });
}

beforeEach(() => {
  loggerMocks.logAppError.mockReset();
  migrationMocks.migrate.mockReset();
});

afterEach(() => {
  activeDatabase?.sqlite.close();
  activeDatabase = null;
});

describe("legacy workspace cutover service", () => {
  it("preflights every publication and reports unresolved child records without writes", async () => {
    activeDatabase = createDatabase();
    migrationMocks.migrate.mockResolvedValue(migrationReport({ unresolved: true }));

    const report = await cutoverLegacyWorkspaceToClientPortals({
      database: activeDatabase,
      workspaceId: WORKSPACE_ID,
    });

    expect(migrationMocks.migrate).toHaveBeenCalledWith({
      apply: false,
      database: activeDatabase,
      legacyPublicationId: PUBLICATION_ID,
    });
    expect(report).toMatchObject({
      barrier: { mode: "none" },
      dryRun: true,
      freezeEnabled: false,
      migrated: 1,
      skipped: 0,
      status: "planned",
    });
    expect(report.inventory.fingerprint).toMatch(/^[a-f0-9]{64}$/u);
    expect(report.unresolved).toEqual([{
      legacyPublicationId: PUBLICATION_ID,
      reason: "comment:comment_1:missing_or_ambiguous_recipient",
    }]);
    expect(activeDatabase.batchCount).toBe(0);
  });

  it("fails closed before migration when unresolved records remain", async () => {
    activeDatabase = createDatabase();
    migrationMocks.migrate.mockResolvedValue(migrationReport({ unresolved: true }));
    const dryRun = await cutoverLegacyWorkspaceToClientPortals({
      database: activeDatabase,
      workspaceId: WORKSPACE_ID,
    });
    migrationMocks.migrate.mockClear();

    await expect(cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    })).rejects.toThrow("unresolved legacy records remain");

    expect(migrationMocks.migrate).toHaveBeenCalledTimes(1);
    expect(migrationMocks.migrate).toHaveBeenCalledWith(expect.objectContaining({ apply: false }));
    expect(activeDatabase.batchCount).toBe(0);
    expect(readRow(activeDatabase, "SELECT * FROM client_portal_legacy_workspace_cutovers")).toBeUndefined();
  });

  it("rejects a stale fingerprint before applying any migration", async () => {
    activeDatabase = createDatabase();
    migrationMocks.migrate.mockResolvedValue(migrationReport());

    await expect(cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: "f".repeat(64),
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    })).rejects.toThrow("preflight is stale");

    expect(migrationMocks.migrate).toHaveBeenCalledTimes(1);
    expect(migrationMocks.migrate).toHaveBeenCalledWith(expect.objectContaining({ apply: false }));
    expect(activeDatabase.batchCount).toBe(0);
  });

  it("finalizes verified mappings, freezes writes, and records the operator atomically", async () => {
    activeDatabase = createDatabase();
    migrationMocks.migrate.mockImplementation(async ({ apply, cutoverLease, database }: {
      apply: boolean;
      cutoverLease?: { frozenAt: string; frozenBy: string };
      database: D1DatabaseLike;
    }) => {
      if (!apply) return migrationReport();
      await database.prepare("INSERT INTO client_portals(id, workspace_id, project_id) VALUES (?, ?, ?)")
        .bind(PORTAL_ID, WORKSPACE_ID, PROJECT_ID)
        .run();
      await database.prepare("INSERT INTO client_portal_issues(id, portal_id, status) VALUES (?, ?, 'issued')")
        .bind(ISSUE_ID, PORTAL_ID)
        .run();
      await database.prepare(`INSERT INTO client_portal_legacy_mappings
        (legacy_publication_id, portal_id, issue_id, migration_status, verified_at, notes)
        VALUES (?, ?, ?, 'verified', '2026-07-28T00:00:00.000Z', ?)`)
        .bind(PUBLICATION_ID, PORTAL_ID, ISSUE_ID, cutoverLeaseNotes(cutoverLease))
        .run();
      return migrationReport({ status: "verified" });
    });
    const dryRun = await cutoverLegacyWorkspaceToClientPortals({
      database: activeDatabase,
      workspaceId: WORKSPACE_ID,
    });

    const report = await cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    });

    expect(report).toMatchObject({
      dryRun: false,
      freezeEnabled: true,
      migrated: 1,
      skipped: 0,
      status: "cutover_complete",
      unresolved: [],
    });
    expect(readRow(activeDatabase, "SELECT migration_status FROM client_portal_legacy_mappings")).toEqual({
      migration_status: "cutover_complete",
    });
    expect(readRow(activeDatabase, "SELECT workspace_id, frozen_by FROM client_portal_legacy_workspace_cutovers")).toEqual({
      workspace_id: WORKSPACE_ID,
      frozen_by: "legacy_cutover",
    });
    expect(readRow(activeDatabase, "SELECT actor_user_id, actor_email, action FROM admin_audit_events")).toEqual({
      action: "client_portal.legacy_workspace_cutover_applied",
      actor_email: OPERATOR.email,
      actor_user_id: OPERATOR.userId,
    });
  });

  it("blocks legacy writes before the final preflight and migration", async () => {
    activeDatabase = createDatabase();
    let legacyWriteBlocked = false;
    migrationMocks.migrate.mockImplementation(async ({ apply, cutoverLease, database }: {
      apply: boolean;
      cutoverLease?: { frozenAt: string; frozenBy: string };
      database: D1DatabaseLike;
    }) => {
      if (!apply) return migrationReport();
      try {
        await database.prepare("INSERT INTO shared_link_comments(id, publication_id) VALUES (?, ?)")
          .bind("late_comment", PUBLICATION_ID)
          .run();
      } catch {
        legacyWriteBlocked = true;
      }
      await database.prepare("INSERT INTO client_portals(id, workspace_id, project_id) VALUES (?, ?, ?)")
        .bind(PORTAL_ID, WORKSPACE_ID, PROJECT_ID)
        .run();
      await database.prepare("INSERT INTO client_portal_issues(id, portal_id, status) VALUES (?, ?, 'issued')")
        .bind(ISSUE_ID, PORTAL_ID)
        .run();
      await database.prepare(`INSERT INTO client_portal_legacy_mappings
        (legacy_publication_id, portal_id, issue_id, migration_status, verified_at, notes)
        VALUES (?, ?, ?, 'verified', '2026-07-28T00:00:00.000Z', ?)`)
        .bind(PUBLICATION_ID, PORTAL_ID, ISSUE_ID, cutoverLeaseNotes(cutoverLease))
        .run();
      return migrationReport({ status: "verified" });
    });
    const dryRun = await cutoverLegacyWorkspaceToClientPortals({ database: activeDatabase, workspaceId: WORKSPACE_ID });

    await cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    });

    expect(legacyWriteBlocked).toBe(true);
    expect(readRow(activeDatabase, "SELECT * FROM shared_link_comments WHERE id = 'late_comment'")).toBeUndefined();
  });

  it("rolls back every modern row when recovery releases the barrier before migration commits", async () => {
    activeDatabase = createDatabase();
    let expectedFingerprint = "";
    migrationMocks.migrate.mockImplementation(async ({ apply, cutoverLease, database }: {
      apply: boolean;
      cutoverLease?: { frozenAt: string; frozenBy: string };
      database: D1DatabaseLike;
    }) => {
      if (!apply) return migrationReport();
      if (!cutoverLease || !database.batch) throw new Error("Cutover lease was not provided.");
      await recoverLegacyWorkspaceCutoverBarrier({
        action: "release",
        database,
        expectedFingerprint,
        operator: OPERATOR,
        workspaceId: WORKSPACE_ID,
      });
      await database.batch([
        database.prepare("INSERT INTO client_portals(id, workspace_id, project_id) VALUES (?, ?, ?)").bind(PORTAL_ID, WORKSPACE_ID, PROJECT_ID),
        database.prepare("INSERT INTO client_portal_issues(id, portal_id, status) VALUES (?, ?, 'issued')").bind(ISSUE_ID, PORTAL_ID),
        database.prepare("INSERT INTO client_portal_legacy_mappings(legacy_publication_id, portal_id, issue_id, migration_status, verified_at, notes) VALUES (?, ?, ?, 'verified', ?, ?)")
          .bind(PUBLICATION_ID, PORTAL_ID, ISSUE_ID, "2026-07-28T00:00:00.000Z", JSON.stringify({
            cutover_lease_frozen_at: cutoverLease.frozenAt,
            cutover_lease_frozen_by: cutoverLease.frozenBy,
          })),
      ]);
      return migrationReport({ status: "verified" });
    });
    const dryRun = await cutoverLegacyWorkspaceToClientPortals({ database: activeDatabase, workspaceId: WORKSPACE_ID });
    expectedFingerprint = dryRun.inventory.fingerprint;

    await expect(cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    })).rejects.toThrow("could not be migrated");

    expect(readRow(activeDatabase, "SELECT * FROM client_portals")).toBeUndefined();
    expect(readRow(activeDatabase, "SELECT * FROM client_portal_issues")).toBeUndefined();
    expect(readRow(activeDatabase, "SELECT * FROM client_portal_legacy_mappings")).toBeUndefined();
    expect(readRow(activeDatabase, "SELECT * FROM client_portal_legacy_workspace_cutovers")).toBeUndefined();
  });

  it("writes nothing when a takeover invalidates the lease before finalization executes", async () => {
    activeDatabase = createDatabase();
    migrationMocks.migrate.mockImplementation(async ({ apply, cutoverLease, database }: {
      apply: boolean;
      cutoverLease?: { frozenAt: string; frozenBy: string };
      database: D1DatabaseLike;
    }) => {
      if (!apply) return migrationReport();
      if (!database.batch) throw new Error("D1 batch support is required.");
      await database.batch([
        database.prepare("INSERT INTO client_portals(id, workspace_id, project_id) VALUES (?, ?, ?)").bind(PORTAL_ID, WORKSPACE_ID, PROJECT_ID),
        database.prepare("INSERT INTO client_portal_issues(id, portal_id, status) VALUES (?, ?, 'issued')").bind(ISSUE_ID, PORTAL_ID),
        database.prepare("INSERT INTO client_portal_legacy_mappings(legacy_publication_id, portal_id, issue_id, migration_status, verified_at, notes) VALUES (?, ?, ?, 'verified', ?, ?)")
          .bind(PUBLICATION_ID, PORTAL_ID, ISSUE_ID, "2026-07-28T00:00:00.000Z", cutoverLeaseNotes(cutoverLease)),
      ]);
      return migrationReport({ status: "verified" });
    });
    const dryRun = await cutoverLegacyWorkspaceToClientPortals({ database: activeDatabase, workspaceId: WORKSPACE_ID });
    const originalBatch = activeDatabase.batch.bind(activeDatabase);
    let takeoverInjected = false;
    activeDatabase.batch = async (statements) => {
      const finalization = (statements as SqliteD1Statement[]).some((entry) =>
        entry.sql.includes("SET migration_status = 'cutover_complete'"));
      if (finalization && !takeoverInjected) {
        takeoverInjected = true;
        const takeoverDryRun = await cutoverLegacyWorkspaceToClientPortals({
          database: activeDatabase!,
          workspaceId: WORKSPACE_ID,
        });
        await recoverLegacyWorkspaceCutoverBarrier({
          action: "takeover",
          database: activeDatabase!,
          expectedFingerprint: takeoverDryRun.inventory.fingerprint,
          operator: { email: "alternate@example.com", userId: "admin_2" },
          workspaceId: WORKSPACE_ID,
        });
      }
      return originalBatch(statements);
    };

    await expect(cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    })).rejects.toThrow("mappings were not finalized");

    expect(readRow(activeDatabase, "SELECT migration_status, json_extract(notes, '$.cutover_lease_frozen_by') AS lease_owner FROM client_portal_legacy_mappings")).toEqual({
      lease_owner: "legacy_cutover_pending:admin_2",
      migration_status: "verified",
    });
    expect(readRow(activeDatabase, "SELECT frozen_by FROM client_portal_legacy_workspace_cutovers")).toEqual({
      frozen_by: "legacy_cutover_pending:admin_2",
    });
    expect(readRow(activeDatabase, "SELECT * FROM client_portal_baseline_backfill_exceptions")).toBeUndefined();
    expect(readRow(activeDatabase, "SELECT * FROM admin_audit_events WHERE action = 'client_portal.legacy_workspace_cutover_applied'")).toBeUndefined();
  });

  it("rolls back finalization when the operator audit cannot be written", async () => {
    activeDatabase = createDatabase("INSERT INTO admin_audit_events");
    migrationMocks.migrate.mockImplementation(async ({ apply, cutoverLease, database }: {
      apply: boolean;
      cutoverLease?: { frozenAt: string; frozenBy: string };
      database: D1DatabaseLike;
    }) => {
      if (!apply) return migrationReport();
      await database.prepare("INSERT INTO client_portals(id, workspace_id, project_id) VALUES (?, ?, ?)")
        .bind(PORTAL_ID, WORKSPACE_ID, PROJECT_ID)
        .run();
      await database.prepare("INSERT INTO client_portal_issues(id, portal_id, status) VALUES (?, ?, 'issued')")
        .bind(ISSUE_ID, PORTAL_ID)
        .run();
      await database.prepare(`INSERT INTO client_portal_legacy_mappings
        (legacy_publication_id, portal_id, issue_id, migration_status, verified_at, notes)
        VALUES (?, ?, ?, 'verified', '2026-07-28T00:00:00.000Z', ?)`)
        .bind(PUBLICATION_ID, PORTAL_ID, ISSUE_ID, cutoverLeaseNotes(cutoverLease))
        .run();
      return migrationReport({ status: "verified" });
    });
    const dryRun = await cutoverLegacyWorkspaceToClientPortals({
      database: activeDatabase,
      workspaceId: WORKSPACE_ID,
    });

    await expect(cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    })).rejects.toEqual(expect.objectContaining<Partial<LegacyWorkspaceCutoverError>>({
      message: "Legacy cutover finalization failed; the write freeze was not confirmed.",
    }));

    expect(readRow(activeDatabase, "SELECT workspace_id, frozen_by FROM client_portal_legacy_workspace_cutovers")).toEqual({
      workspace_id: WORKSPACE_ID,
      frozen_by: `legacy_cutover_pending:${OPERATOR.userId}`,
    });
    expect(readRow(activeDatabase, "SELECT migration_status FROM client_portal_legacy_mappings")).toEqual({
      migration_status: "verified",
    });
  });

  it("keeps a visible pending barrier when the source changes during the second preflight", async () => {
    activeDatabase = createDatabase();
    let callCount = 0;
    migrationMocks.migrate.mockImplementation(async () => {
      callCount += 1;
      return callCount === 3
        ? { ...migrationReport(), snapshot: { ...migrationReport().snapshot, sourceSha256: "e".repeat(64) } }
        : migrationReport();
    });
    const dryRun = await cutoverLegacyWorkspaceToClientPortals({ database: activeDatabase, workspaceId: WORKSPACE_ID });

    await expect(cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    })).rejects.toThrow("source changed before the write barrier");

    const recoveryDryRun = await cutoverLegacyWorkspaceToClientPortals({ database: activeDatabase, workspaceId: WORKSPACE_ID });
    expect(recoveryDryRun).toMatchObject({
      barrier: { mode: "pending", ownerUserId: OPERATOR.userId },
      freezeEnabled: true,
    });
  });

  it("lets another administrator take over a failed finalization and retry idempotently", async () => {
    activeDatabase = createDatabase("INSERT INTO admin_audit_events");
    migrationMocks.migrate.mockImplementation(async ({ apply, cutoverLease, database }: { apply: boolean; cutoverLease?: { frozenAt: string; frozenBy: string }; database: D1DatabaseLike }) => {
      if (!apply) return migrationReport();
      await database.prepare("INSERT INTO client_portals(id, workspace_id, project_id) VALUES (?, ?, ?)").bind(PORTAL_ID, WORKSPACE_ID, PROJECT_ID).run();
      await database.prepare("INSERT INTO client_portal_issues(id, portal_id, status) VALUES (?, ?, 'issued')").bind(ISSUE_ID, PORTAL_ID).run();
      await database.prepare("INSERT INTO client_portal_legacy_mappings (legacy_publication_id, portal_id, issue_id, migration_status, verified_at, notes) VALUES (?, ?, ?, 'verified', '2026-07-28T00:00:00.000Z', ?)")
        .bind(PUBLICATION_ID, PORTAL_ID, ISSUE_ID, cutoverLeaseNotes(cutoverLease)).run();
      return migrationReport({ status: "verified" });
    });
    const firstDryRun = await cutoverLegacyWorkspaceToClientPortals({ database: activeDatabase, workspaceId: WORKSPACE_ID });
    await expect(cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: firstDryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    })).rejects.toThrow("finalization failed");

    activeDatabase = new SqliteD1Database(activeDatabase.sqlite);
    migrationMocks.migrate.mockResolvedValue(migrationReport({ status: "already_migrated" }));
    const recoveryDryRun = await cutoverLegacyWorkspaceToClientPortals({ database: activeDatabase, workspaceId: WORKSPACE_ID });
    const alternateOperator = { email: "alternate@example.com", userId: "admin_2" };
    await expect(recoverLegacyWorkspaceCutoverBarrier({
      action: "release",
      database: activeDatabase,
      expectedFingerprint: recoveryDryRun.inventory.fingerprint,
      operator: alternateOperator,
      workspaceId: WORKSPACE_ID,
    })).rejects.toThrow("modern migration rows exist");
    const recovery = await recoverLegacyWorkspaceCutoverBarrier({
      action: "takeover",
      database: activeDatabase,
      expectedFingerprint: recoveryDryRun.inventory.fingerprint,
      operator: alternateOperator,
      workspaceId: WORKSPACE_ID,
    });
    expect(recovery.barrierAfter).toMatchObject({ mode: "pending", ownerUserId: alternateOperator.userId });

    const retryDryRun = await cutoverLegacyWorkspaceToClientPortals({ database: activeDatabase, workspaceId: WORKSPACE_ID });
    const retry = await cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: retryDryRun.inventory.fingerprint,
      operator: alternateOperator,
      workspaceId: WORKSPACE_ID,
    });
    expect(retry).toMatchObject({ barrier: { mode: "complete" }, status: "cutover_complete" });
    const finalizedBarrier = readRow(activeDatabase, "SELECT frozen_at FROM client_portal_legacy_workspace_cutovers");
    const finalizedAuditCount = readRow(activeDatabase, "SELECT COUNT(*) AS count FROM admin_audit_events");

    const replayDryRun = await cutoverLegacyWorkspaceToClientPortals({ database: activeDatabase, workspaceId: WORKSPACE_ID });
    const replay = await cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: replayDryRun.inventory.fingerprint,
      operator: alternateOperator,
      workspaceId: WORKSPACE_ID,
    });
    expect(replay).toMatchObject({ barrier: { mode: "complete" }, cutoverAt: finalizedBarrier?.frozen_at, status: "cutover_complete" });
    expect(readRow(activeDatabase, "SELECT frozen_at FROM client_portal_legacy_workspace_cutovers")).toEqual(finalizedBarrier);
    expect(readRow(activeDatabase, "SELECT COUNT(*) AS count FROM admin_audit_events")).toEqual(finalizedAuditCount);
  });

  it("replays a migration-0122 backfilled completed freeze without changing its timestamp", async () => {
    activeDatabase = createDatabase();
    const frozenAt = "2026-07-20T00:00:00.000Z";
    activeDatabase.sqlite.exec(`
      INSERT INTO client_portals(id, workspace_id, project_id) VALUES ('${PORTAL_ID}', '${WORKSPACE_ID}', '${PROJECT_ID}');
      INSERT INTO client_portal_issues(id, portal_id, status) VALUES ('${ISSUE_ID}', '${PORTAL_ID}', 'issued');
      INSERT INTO client_portal_legacy_mappings(legacy_publication_id, portal_id, issue_id, migration_status, verified_at, notes)
      VALUES ('${PUBLICATION_ID}', '${PORTAL_ID}', '${ISSUE_ID}', 'cutover_complete', '2026-07-20T00:00:00.000Z', '{}');
      INSERT INTO client_portal_legacy_workspace_cutovers(workspace_id, frozen_at, frozen_by)
      VALUES ('${WORKSPACE_ID}', '${frozenAt}', 'migration_0122_backfill');
    `);
    migrationMocks.migrate.mockResolvedValue(migrationReport({ status: "already_migrated" }));

    const dryRun = await cutoverLegacyWorkspaceToClientPortals({ database: activeDatabase, workspaceId: WORKSPACE_ID });
    expect(dryRun).toMatchObject({ barrier: { frozenAt, mode: "complete" }, freezeEnabled: true });
    const replay = await cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    });

    expect(replay).toMatchObject({ barrier: { frozenAt, mode: "complete" }, cutoverAt: frozenAt, status: "cutover_complete" });
    expect(readRow(activeDatabase, "SELECT frozen_at, frozen_by FROM client_portal_legacy_workspace_cutovers")).toEqual({
      frozen_at: frozenAt,
      frozen_by: "legacy_cutover",
    });
    const adminAudit = readRow(activeDatabase, "SELECT summary_json, created_at FROM admin_audit_events");
    expect(JSON.parse(String(adminAudit?.summary_json))).toMatchObject({
      appliedAt: adminAudit?.created_at,
      cutoverAt: frozenAt,
    });
  });

  it("releases a pending barrier only when no modern activity exists after the freeze", async () => {
    activeDatabase = createDatabase();
    migrationMocks.migrate.mockResolvedValue(migrationReport());
    await expect(recoverLegacyWorkspaceCutoverBarrier({
      action: "delete" as "release",
      database: activeDatabase,
      expectedFingerprint: "a".repeat(64),
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    })).rejects.toThrow("recovery action is invalid");
    activeDatabase.sqlite.prepare("INSERT INTO client_portal_legacy_workspace_cutovers(workspace_id, frozen_at, frozen_by) VALUES (?, ?, ?)")
      .run(WORKSPACE_ID, "2026-07-28T00:00:00.000Z", "legacy_cutover_pending:admin_1");
    const dryRun = await cutoverLegacyWorkspaceToClientPortals({ database: activeDatabase, workspaceId: WORKSPACE_ID });

    activeDatabase.sqlite.prepare("INSERT INTO client_portal_audit_events(id, workspace_id, actor_type, actor_id, event_type, visibility, metadata_json, occurred_at, created_at) VALUES (?, ?, 'recipient', 'recipient_1', 'message.created', 'owner', '{}', ?, ?)")
      .run("audit_modern", WORKSPACE_ID, "2026-07-28T00:01:00.000Z", "2026-07-28T00:01:00.000Z");
    await expect(recoverLegacyWorkspaceCutoverBarrier({
      action: "release",
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    })).rejects.toThrow("modern workspace activity exists");

    activeDatabase.sqlite.prepare("DELETE FROM client_portal_audit_events WHERE id = ?").run("audit_modern");
    const batchBeforeAba = activeDatabase.batch.bind(activeDatabase);
    activeDatabase.batch = async (statements) => {
      activeDatabase!.sqlite.exec(`
        DELETE FROM client_portal_legacy_workspace_cutovers WHERE workspace_id = '${WORKSPACE_ID}';
        INSERT INTO client_portal_legacy_workspace_cutovers(workspace_id, frozen_at, frozen_by)
        VALUES ('${WORKSPACE_ID}', '2026-07-28T00:03:00.000Z', 'legacy_cutover_pending:${OPERATOR.userId}');
      `);
      return batchBeforeAba(statements);
    };
    await expect(recoverLegacyWorkspaceCutoverBarrier({
      action: "release",
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    })).rejects.toThrow("did not change the write barrier");
    expect(readRow(activeDatabase, "SELECT frozen_at, frozen_by FROM client_portal_legacy_workspace_cutovers")).toEqual({
      frozen_at: "2026-07-28T00:03:00.000Z",
      frozen_by: `legacy_cutover_pending:${OPERATOR.userId}`,
    });
    expect(readRow(activeDatabase, "SELECT * FROM admin_audit_events")).toBeUndefined();
    activeDatabase.batch = batchBeforeAba;
    activeDatabase.sqlite.prepare("UPDATE client_portal_legacy_workspace_cutovers SET frozen_at = ? WHERE workspace_id = ?")
      .run("2026-07-28T00:00:00.000Z", WORKSPACE_ID);

    const batchWithoutRace = activeDatabase.batch.bind(activeDatabase);
    activeDatabase.batch = async (statements) => {
      activeDatabase!.sqlite.prepare("INSERT INTO client_portal_audit_events(id, workspace_id, actor_type, actor_id, event_type, visibility, metadata_json, occurred_at, created_at) VALUES (?, ?, 'recipient', 'recipient_1', 'message.created', 'owner', '{}', ?, ?)")
        .run("audit_race", WORKSPACE_ID, "2026-07-28T00:02:00.000Z", "2026-07-28T00:02:00.000Z");
      return batchWithoutRace(statements);
    };
    await expect(recoverLegacyWorkspaceCutoverBarrier({
      action: "release",
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    })).rejects.toThrow("did not change the write barrier");
    expect(readRow(activeDatabase, "SELECT * FROM admin_audit_events")).toBeUndefined();

    activeDatabase.batch = batchWithoutRace;
    activeDatabase.sqlite.prepare("DELETE FROM client_portal_audit_events WHERE id = ?").run("audit_race");
    const released = await recoverLegacyWorkspaceCutoverBarrier({
      action: "release",
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    });
    expect(released.barrierAfter).toEqual({ frozenAt: null, mode: "none", ownerUserId: null });
    expect(readRow(activeDatabase, "SELECT action FROM admin_audit_events")).toEqual({
      action: "client_portal.legacy_workspace_cutover_release",
    });
  });

  it("preserves the cutover error identity, message, and cause", () => {
    const cause = new Error("database failed");
    const error = new LegacyWorkspaceCutoverError("cutover failed", { cause });

    expect(error).toMatchObject({
      cause,
      message: "cutover failed",
      name: "LegacyWorkspaceCutoverError",
    });
  });

  it.each([
    { cloudflareEnv: "production", expected: true, nodeEnv: "test" },
    { cloudflareEnv: "preview", expected: true, nodeEnv: "production" },
    { cloudflareEnv: "preview", expected: false, nodeEnv: "test" },
  ])(
    "defaults hosted inventory to $expected for CLOUDFLARE_ENV=$cloudflareEnv and NODE_ENV=$nodeEnv",
    async ({ cloudflareEnv, expected, nodeEnv }) => {
      activeDatabase = createDatabase();
      migrationMocks.migrate.mockResolvedValue(migrationReport());
      const previousCloudflareEnv = process.env.CLOUDFLARE_ENV;
      const previousNodeEnv = process.env.NODE_ENV;
      process.env.CLOUDFLARE_ENV = cloudflareEnv;
      process.env.NODE_ENV = nodeEnv;

      try {
        const report = await planCutover(activeDatabase);
        expect(report.inventory.hosted).toBe(expected);
      } finally {
        if (previousCloudflareEnv === undefined) delete process.env.CLOUDFLARE_ENV;
        else process.env.CLOUDFLARE_ENV = previousCloudflareEnv;
        if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previousNodeEnv;
      }
    },
  );

  it("binds every inventory count to the exact workspace", async () => {
    activeDatabase = createDatabase();
    migrationMocks.migrate.mockResolvedValue(migrationReport());
    const bindings: Array<{ sql: string; values: D1Value[] }> = [];
    const originalPrepare = activeDatabase.prepare.bind(activeDatabase);
    activeDatabase.prepare = ((sql: string) => {
      const prepared = originalPrepare(sql);
      const originalBind = prepared.bind.bind(prepared);
      prepared.bind = (...values: D1Value[]) => {
        bindings.push({ sql, values });
        return originalBind(...values);
      };
      return prepared;
    }) as typeof activeDatabase.prepare;

    await planCutover(activeDatabase);

    for (const sqlFragment of [
      "FROM projects WHERE workspace_id",
      "FROM project_publications WHERE workspace_id = ?",
      "encrypted_token IS NULL",
      "FROM shared_link_recipients",
      "FROM shared_link_comments",
      "FROM shared_link_responses",
      "FROM shared_link_events",
      "FROM client_portals WHERE workspace_id",
      "COUNT(DISTINCT publication.project_id)",
      "portal.id IS NULL OR issue.id IS NULL",
    ]) {
      expect(bindings.find((entry) => entry.sql.includes(sqlFragment))?.values).toEqual([
        WORKSPACE_ID,
      ]);
    }
  });

  it.each([
    {
      expectedMessage: "Legacy cutover inventory query failed.",
      sqlFragment: "GROUP BY status ORDER BY status",
    },
    {
      expectedMessage: "Legacy publications could not be inventoried.",
      sqlFragment: "SELECT id FROM project_publications",
    },
  ])("reports $expectedMessage with the cutover error identity", async ({ expectedMessage, sqlFragment }) => {
    activeDatabase = createDatabase();
    migrationMocks.migrate.mockResolvedValue(migrationReport());
    const originalPrepare = activeDatabase.prepare.bind(activeDatabase);
    activeDatabase.prepare = ((sql: string) => {
      const prepared = originalPrepare(sql);
      if (sql.includes(sqlFragment)) {
        prepared.all = async () => ({ results: [], success: false });
      }
      return prepared;
    }) as typeof activeDatabase.prepare;

    const failure = await planCutover(activeDatabase).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(LegacyWorkspaceCutoverError);
    expect(failure).toMatchObject({
      message: expectedMessage,
      name: "LegacyWorkspaceCutoverError",
    });
  });

  it("rejects inconsistent mapping ownership with the exact cutover error", async () => {
    activeDatabase = createDatabase();
    migrationMocks.migrate.mockResolvedValue(migrationReport());
    const originalPrepare = activeDatabase.prepare.bind(activeDatabase);
    activeDatabase.prepare = ((sql: string) => {
      const prepared = originalPrepare(sql);
      if (sql.includes("portal.id IS NULL OR issue.id IS NULL")) {
        prepared.first = async () => ({ count: 1 });
      }
      return prepared;
    }) as typeof activeDatabase.prepare;

    const failure = await planCutover(activeDatabase).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(LegacyWorkspaceCutoverError);
    expect(failure).toMatchObject({
      message: "Legacy cutover stopped because mapping ownership is inconsistent.",
      name: "LegacyWorkspaceCutoverError",
    });
    expect(migrationMocks.migrate).not.toHaveBeenCalled();
  });

  it("attributes a publication preflight failure to its exact legacy identity", async () => {
    activeDatabase = createDatabase();
    migrationMocks.migrate.mockRejectedValue(new Error("snapshot rejected"));

    const failure = await planCutover(activeDatabase).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(LegacyWorkspaceCutoverError);
    expect(failure).toMatchObject({
      message: `Legacy publication ${PUBLICATION_ID} could not be preflighted: snapshot rejected`,
      name: "LegacyWorkspaceCutoverError",
    });
  });

  it("requires an attributed operator before acquiring the write barrier", async () => {
    activeDatabase = createDatabase();
    migrationMocks.migrate.mockResolvedValue(migrationReport());
    const dryRun = await planCutover(activeDatabase);

    const failure = await cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      workspaceId: WORKSPACE_ID,
    }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(LegacyWorkspaceCutoverError);
    expect(failure).toMatchObject({
      message: "Legacy workspace cutover requires an attributed platform administrator.",
      name: "LegacyWorkspaceCutoverError",
    });
    expect(readRow(activeDatabase, "SELECT * FROM client_portal_legacy_workspace_cutovers")).toBeUndefined();
  });

  it("fails with the exact message when barrier acquisition is unsuccessful", async () => {
    activeDatabase = createDatabase();
    migrationMocks.migrate.mockResolvedValue(migrationReport());
    const dryRun = await planCutover(activeDatabase);
    const originalPrepare = activeDatabase.prepare.bind(activeDatabase);
    activeDatabase.prepare = ((sql: string) => {
      const prepared = originalPrepare(sql);
      if (sql.includes("INSERT INTO client_portal_legacy_workspace_cutovers")) {
        prepared.run = async () => ({ success: false });
      }
      return prepared;
    }) as typeof activeDatabase.prepare;

    const failure = await cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(LegacyWorkspaceCutoverError);
    expect(failure).toMatchObject({
      message: "Legacy cutover could not acquire the workspace write barrier.",
      name: "LegacyWorkspaceCutoverError",
    });
  });

  it("rejects a write barrier controlled by another operator", async () => {
    activeDatabase = createDatabase();
    migrationMocks.migrate.mockResolvedValue(migrationReport());
    activeDatabase.sqlite.prepare("INSERT INTO client_portal_legacy_workspace_cutovers(workspace_id, frozen_at, frozen_by) VALUES (?, ?, ?)")
      .run(WORKSPACE_ID, "2026-07-28T00:00:00.000Z", "legacy_cutover_pending:admin_2");
    const dryRun = await planCutover(activeDatabase);

    const failure = await cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(LegacyWorkspaceCutoverError);
    expect(failure).toMatchObject({
      message: "Legacy cutover is already controlled by another operator.",
      name: "LegacyWorkspaceCutoverError",
    });
  });

  it("fails when the acquired write barrier cannot be read back", async () => {
    activeDatabase = createDatabase();
    migrationMocks.migrate.mockResolvedValue(migrationReport());
    const dryRun = await planCutover(activeDatabase);
    const originalPrepare = activeDatabase.prepare.bind(activeDatabase);
    activeDatabase.prepare = ((sql: string) => {
      const prepared = originalPrepare(sql);
      if (sql.includes("SELECT frozen_at, frozen_by")) prepared.first = async () => null;
      return prepared;
    }) as typeof activeDatabase.prepare;

    const failure = await cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(LegacyWorkspaceCutoverError);
    expect(failure).toMatchObject({
      message: "Legacy workspace write barrier could not be verified.",
      name: "LegacyWorkspaceCutoverError",
    });
  });

  it("reports a mapping verification query failure with the exact error contract", async () => {
    activeDatabase = createDatabase();
    mockVerifiedMigration();
    const dryRun = await planCutover(activeDatabase);
    const originalPrepare = activeDatabase.prepare.bind(activeDatabase);
    activeDatabase.prepare = ((sql: string) => {
      const prepared = originalPrepare(sql);
      if (sql.includes("SELECT\n      mapping.legacy_publication_id")) {
        prepared.all = async () => ({ results: [], success: false });
      }
      return prepared;
    }) as typeof activeDatabase.prepare;

    const failure = await cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(LegacyWorkspaceCutoverError);
    expect(failure).toMatchObject({
      message: "Legacy mapping verification failed.",
      name: "LegacyWorkspaceCutoverError",
    });
  });

  it.each([
    { mappingStatus: null, scenario: "missing" },
    { mappingStatus: "imported" as const, scenario: "unverified" },
  ])("rejects $scenario modern mappings before finalization", async ({ mappingStatus }) => {
    activeDatabase = createDatabase();
    if (mappingStatus) mockVerifiedMigration({ mappingStatus });
    else migrationMocks.migrate.mockResolvedValue(migrationReport({ status: "verified" }));
    const dryRun = await planCutover(activeDatabase);

    const failure = await cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(LegacyWorkspaceCutoverError);
    expect(failure).toMatchObject({
      message: "Legacy cutover stopped because not every publication has a verified modern mapping.",
      name: "LegacyWorkspaceCutoverError",
    });
  });

  it("stops finalization when the acquired barrier is removed during migration", async () => {
    activeDatabase = createDatabase();
    mockVerifiedMigration({
      afterWrite: async (database) => {
        await database.prepare("DELETE FROM client_portal_legacy_workspace_cutovers WHERE workspace_id = ?")
          .bind(WORKSPACE_ID)
          .run();
      },
    });
    const dryRun = await planCutover(activeDatabase);

    const failure = await cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(LegacyWorkspaceCutoverError);
    expect(failure).toMatchObject({
      message: "Legacy workspace write barrier was removed during migration.",
      name: "LegacyWorkspaceCutoverError",
    });
  });

  it("stops finalization when barrier ownership changes during migration", async () => {
    activeDatabase = createDatabase();
    mockVerifiedMigration({
      afterWrite: async (database) => {
        await database.prepare("UPDATE client_portal_legacy_workspace_cutovers SET frozen_by = ? WHERE workspace_id = ?")
          .bind("legacy_cutover_pending:admin_2", WORKSPACE_ID)
          .run();
      },
    });
    const dryRun = await planCutover(activeDatabase);

    const failure = await cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(LegacyWorkspaceCutoverError);
    expect(failure).toMatchObject({
      message: "Legacy workspace write barrier changed during migration; finalization was stopped.",
      name: "LegacyWorkspaceCutoverError",
    });
  });

  it("rejects an unsuccessful finalization batch result", async () => {
    activeDatabase = createDatabase();
    mockVerifiedMigration();
    const dryRun = await planCutover(activeDatabase);
    activeDatabase.batch = async () => [{ success: true }, { success: false }];

    const failure = await cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(LegacyWorkspaceCutoverError);
    expect(failure).toMatchObject({
      cause: expect.objectContaining({
        message: "D1 batch returned an unsuccessful legacy cutover finalization result.",
      }),
      message: "Legacy cutover finalization failed; the write freeze was not confirmed.",
      name: "LegacyWorkspaceCutoverError",
    });
  });

  it("rejects a finalized mapping that fails exact status readback", async () => {
    activeDatabase = createDatabase();
    mockVerifiedMigration();
    const dryRun = await planCutover(activeDatabase);
    const originalPrepare = activeDatabase.prepare.bind(activeDatabase);
    let mappingReads = 0;
    activeDatabase.prepare = ((sql: string) => {
      const prepared = originalPrepare(sql);
      if (sql.includes("SELECT\n      mapping.legacy_publication_id")) {
        const originalAll = prepared.all.bind(prepared);
        prepared.all = async () => {
          mappingReads += 1;
          const result = await originalAll<Record<string, unknown>>();
          return mappingReads === 2
            ? {
                ...result,
                results: [
                  ...(result.results ?? []),
                  {
                    issue_id: "issue_unfinalized",
                    legacy_publication_id: "publication_unfinalized",
                    migration_status: "verified",
                    portal_id: "portal_unfinalized",
                  },
                ],
              }
            : result;
        };
      }
      return prepared;
    }) as typeof activeDatabase.prepare;

    const failure = await cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(LegacyWorkspaceCutoverError);
    expect(failure).toMatchObject({
      message: "Legacy cutover mappings were not finalized.",
      name: "LegacyWorkspaceCutoverError",
    });
  });

  it("rejects a finalized freeze whose mode fails exact lease readback", async () => {
    activeDatabase = createDatabase();
    mockVerifiedMigration();
    const dryRun = await planCutover(activeDatabase);
    const originalBatch = activeDatabase.batch!.bind(activeDatabase);
    activeDatabase.batch = async (statements) => {
      const results = await originalBatch(statements);
      activeDatabase!.sqlite.prepare("UPDATE client_portal_legacy_workspace_cutovers SET frozen_by = ? WHERE workspace_id = ?")
        .run(`legacy_cutover_pending:${OPERATOR.userId}`, WORKSPACE_ID);
      return results;
    };

    const failure = await cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(LegacyWorkspaceCutoverError);
    expect(failure).toMatchObject({
      message: "Legacy workspace write freeze was not finalized under the acquired barrier lease.",
      name: "LegacyWorkspaceCutoverError",
    });
  });

  it("fails recovery when no pending barrier exists", async () => {
    activeDatabase = createDatabase();

    const failure = await recoverLegacyWorkspaceCutoverBarrier({
      action: "takeover",
      database: activeDatabase,
      expectedFingerprint: "a".repeat(64),
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(LegacyWorkspaceCutoverError);
    expect(failure).toMatchObject({
      message: "There is no pending legacy cutover barrier to recover.",
      name: "LegacyWorkspaceCutoverError",
    });
  });

  it("fails recovery when its preflight fingerprint is stale", async () => {
    activeDatabase = createDatabase();
    migrationMocks.migrate.mockResolvedValue(migrationReport());
    activeDatabase.sqlite.prepare("INSERT INTO client_portal_legacy_workspace_cutovers(workspace_id, frozen_at, frozen_by) VALUES (?, ?, ?)")
      .run(WORKSPACE_ID, "2026-07-28T00:00:00.000Z", "legacy_cutover_pending:admin_1");

    const failure = await recoverLegacyWorkspaceCutoverBarrier({
      action: "takeover",
      database: activeDatabase,
      expectedFingerprint: "a".repeat(64),
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(LegacyWorkspaceCutoverError);
    expect(failure).toMatchObject({
      message: "Legacy cutover recovery preflight is stale. Run a new dry check.",
      name: "LegacyWorkspaceCutoverError",
    });
  });

  it("rejects an unsuccessful atomic recovery batch", async () => {
    activeDatabase = createDatabase();
    migrationMocks.migrate.mockResolvedValue(migrationReport());
    activeDatabase.sqlite.prepare("INSERT INTO client_portal_legacy_workspace_cutovers(workspace_id, frozen_at, frozen_by) VALUES (?, ?, ?)")
      .run(WORKSPACE_ID, "2026-07-28T00:00:00.000Z", "legacy_cutover_pending:admin_1");
    const dryRun = await planCutover(activeDatabase);
    activeDatabase.batch = async () => [{ success: true }, { success: false }];

    const failure = await recoverLegacyWorkspaceCutoverBarrier({
      action: "takeover",
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(LegacyWorkspaceCutoverError);
    expect(failure).toMatchObject({
      message: "Legacy workspace cutover recovery could not be recorded atomically.",
      name: "LegacyWorkspaceCutoverError",
    });
  });

  it("rejects a takeover whose owner fails final barrier readback", async () => {
    activeDatabase = createDatabase();
    migrationMocks.migrate.mockResolvedValue(migrationReport());
    activeDatabase.sqlite.prepare("INSERT INTO client_portal_legacy_workspace_cutovers(workspace_id, frozen_at, frozen_by) VALUES (?, ?, ?)")
      .run(WORKSPACE_ID, "2026-07-28T00:00:00.000Z", "legacy_cutover_pending:admin_1");
    const dryRun = await planCutover(activeDatabase);
    const originalBatch = activeDatabase.batch!.bind(activeDatabase);
    activeDatabase.batch = async (statements) => {
      const results = await originalBatch(statements);
      activeDatabase!.sqlite.prepare("UPDATE client_portal_legacy_workspace_cutovers SET frozen_by = ? WHERE workspace_id = ?")
        .run("legacy_cutover_pending:admin_1", WORKSPACE_ID);
      return results;
    };

    const failure = await recoverLegacyWorkspaceCutoverBarrier({
      action: "takeover",
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: { email: "alternate@example.com", userId: "admin_2" },
      workspaceId: WORKSPACE_ID,
    }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(LegacyWorkspaceCutoverError);
    expect(failure).toMatchObject({
      message: "Legacy workspace cutover recovery did not change the write barrier as requested.",
      name: "LegacyWorkspaceCutoverError",
    });
  });

  it("records exact takeover audit identity and recovery details", async () => {
    activeDatabase = createDatabase();
    migrationMocks.migrate.mockResolvedValue(migrationReport());
    const frozenAt = "2026-07-28T00:00:00.000Z";
    activeDatabase.sqlite.prepare("INSERT INTO client_portal_legacy_workspace_cutovers(workspace_id, frozen_at, frozen_by) VALUES (?, ?, ?)")
      .run(WORKSPACE_ID, frozenAt, "legacy_cutover_pending:admin_1");
    const dryRun = await planCutover(activeDatabase);
    const alternateOperator = { email: "alternate@example.com", userId: "admin_2" };

    const recovery = await recoverLegacyWorkspaceCutoverBarrier({
      action: "takeover",
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: alternateOperator,
      workspaceId: WORKSPACE_ID,
    });
    const audit = readRow(activeDatabase, "SELECT * FROM admin_audit_events");
    const expectedAuditId = `admin_audit_legacy_cutover_recovery_${createHash("sha256")
      .update(JSON.stringify(`${WORKSPACE_ID}:takeover:${recovery.recoveredAt}:${alternateOperator.userId}`))
      .digest("hex")
      .slice(0, 32)}`;

    expect(audit).toMatchObject({
      action: "client_portal.legacy_workspace_cutover_takeover",
      actor_email: alternateOperator.email,
      actor_user_id: alternateOperator.userId,
      created_at: recovery.recoveredAt,
      id: expectedAuditId,
      target_id: WORKSPACE_ID,
      target_type: "workspace",
    });
    expect(JSON.parse(String(audit?.summary_json))).toEqual({
      action: "takeover",
      expectedFingerprint: dryRun.inventory.fingerprint,
      frozenAt,
      modernWrites: { auditEvents: 0, decisions: 0, issues: 0, messages: 0, requests: 0 },
      previousOwner: OPERATOR.userId,
    });
  });

  it("requires batch support before changing cutover state", async () => {
    activeDatabase = createDatabase();
    migrationMocks.migrate.mockResolvedValue(migrationReport());
    const dryRun = await planCutover(activeDatabase);
    Object.defineProperty(activeDatabase, "batch", { configurable: true, value: undefined });

    const failure = await cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(LegacyWorkspaceCutoverError);
    expect(failure).toMatchObject({
      message: "Legacy workspace cutover requires D1 batch support.",
      name: "LegacyWorkspaceCutoverError",
    });
    expect(readRow(activeDatabase, "SELECT * FROM client_portal_legacy_workspace_cutovers")).toBeUndefined();
  });

  it("requires batch support before attempting barrier recovery", async () => {
    activeDatabase = createDatabase();
    Object.defineProperty(activeDatabase, "batch", { configurable: true, value: undefined });

    const failure = await recoverLegacyWorkspaceCutoverBarrier({
      action: "takeover",
      database: activeDatabase,
      expectedFingerprint: "a".repeat(64),
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(LegacyWorkspaceCutoverError);
    expect(failure).toMatchObject({
      message: "Legacy workspace cutover recovery requires D1 batch support.",
      name: "LegacyWorkspaceCutoverError",
    });
  });

  it("binds every recovery activity query to the exact workspace and freeze timestamp", async () => {
    activeDatabase = createDatabase();
    migrationMocks.migrate.mockResolvedValue(migrationReport());
    const frozenAt = "2026-07-28T00:00:00.000Z";
    activeDatabase.sqlite.prepare("INSERT INTO client_portal_legacy_workspace_cutovers(workspace_id, frozen_at, frozen_by) VALUES (?, ?, ?)")
      .run(WORKSPACE_ID, frozenAt, `legacy_cutover_pending:${OPERATOR.userId}`);
    const dryRun = await planCutover(activeDatabase);
    const bindings: Array<{ sql: string; values: D1Value[] }> = [];
    const originalPrepare = activeDatabase.prepare.bind(activeDatabase);
    activeDatabase.prepare = ((sql: string) => {
      const prepared = originalPrepare(sql);
      const originalBind = prepared.bind.bind(prepared);
      prepared.bind = (...values: D1Value[]) => {
        bindings.push({ sql, values });
        return originalBind(...values);
      };
      return prepared;
    }) as typeof activeDatabase.prepare;

    await recoverLegacyWorkspaceCutoverBarrier({
      action: "release",
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    });

    for (const sqlFragment of [
      "FROM client_portal_issues issue",
      "FROM client_portal_messages message",
      "FROM client_portal_decisions decision",
      "FROM project_change_requests request",
      "actor_type <> 'system'",
    ]) {
      expect(bindings.find((entry) => entry.sql.includes(sqlFragment))?.values).toEqual([
        WORKSPACE_ID,
        frozenAt,
      ]);
    }
  });

  it("records exact cutover audit identity and finalization details", async () => {
    activeDatabase = createDatabase();
    mockVerifiedMigration();
    const dryRun = await planCutover(activeDatabase);

    const report = await cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    });
    const audit = readRow(activeDatabase, "SELECT * FROM admin_audit_events");
    const expectedAuditId = `admin_audit_legacy_cutover_${createHash("sha256")
      .update(JSON.stringify(WORKSPACE_ID))
      .digest("hex")
      .slice(0, 32)}`;

    expect(audit).toMatchObject({
      action: "client_portal.legacy_workspace_cutover_applied",
      actor_email: OPERATOR.email,
      actor_user_id: OPERATOR.userId,
      id: expectedAuditId,
      target_id: WORKSPACE_ID,
      target_type: "workspace",
    });
    expect(JSON.parse(String(audit?.summary_json))).toEqual({
      appliedAt: audit?.created_at,
      cutoverAt: report.cutoverAt,
      fingerprint: dryRun.inventory.fingerprint,
      freezeEnabled: true,
      migrated: 1,
      skipped: 0,
    });
  });

  it("returns exact publication and mapping status maps from grouped inventory rows", async () => {
    activeDatabase = createDatabase();
    migrationMocks.migrate.mockResolvedValue(migrationReport());
    const originalPrepare = activeDatabase.prepare.bind(activeDatabase);
    activeDatabase.prepare = ((sql: string) => {
      const prepared = originalPrepare(sql);
      if (sql.includes("FROM project_publications WHERE workspace_id = ? GROUP BY status")) {
        prepared.all = async () => ({
          results: [
            { count: 2, status: "published" },
            { count: 1, status: "revoked" },
          ],
          success: true,
        });
      }
      if (sql.includes("GROUP BY mapping.migration_status")) {
        prepared.all = async () => ({
          results: [
            { count: 3, status: "cutover_complete" },
            { count: 1, status: "verified" },
          ],
          success: true,
        });
      }
      return prepared;
    }) as typeof activeDatabase.prepare;

    const report = await planCutover(activeDatabase);

    expect(report.inventory.publicationStatuses).toEqual({ published: 2, revoked: 1 });
    expect(report.inventory.mappingStatuses).toEqual({ cutover_complete: 3, verified: 1 });
  });

  it("binds baseline and cutover-audit finalization statements to the acquired lease", async () => {
    activeDatabase = createDatabase();
    mockVerifiedMigration();
    const dryRun = await planCutover(activeDatabase);
    const captured: Array<{ sql: string; values: D1Value[] }> = [];
    const originalBatch = activeDatabase.batch!.bind(activeDatabase);
    activeDatabase.batch = async (statements) => {
      for (const prepared of statements as Array<D1PreparedStatementLike & { sql: string; values: D1Value[] }>) {
        captured.push({ sql: prepared.sql, values: prepared.values });
      }
      return originalBatch(statements);
    };

    const report = await cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    });
    const pendingOwner = `legacy_cutover_pending:${OPERATOR.userId}`;
    const baseline = captured.find((entry) => entry.sql.includes("client_portal_baseline_backfill_exceptions"));
    const cutoverAudit = captured.find((entry) => entry.sql.includes("legacy_migration_cutover_completed"));

    expect(baseline?.values).toEqual([
      report.cutoverAt,
      report.cutoverAt,
      WORKSPACE_ID,
      WORKSPACE_ID,
      report.cutoverAt,
      pendingOwner,
    ]);
    expect(cutoverAudit?.values).toEqual([
      WORKSPACE_ID,
      report.cutoverAt,
      report.cutoverAt,
      report.cutoverAt,
      WORKSPACE_ID,
      WORKSPACE_ID,
      report.cutoverAt,
    ]);
  });

  it("counts an already migrated publication as skipped in dry-run and apply reports", async () => {
    activeDatabase = createDatabase();
    activeDatabase.sqlite.exec(`
      INSERT INTO client_portals(id, workspace_id, project_id) VALUES ('${PORTAL_ID}', '${WORKSPACE_ID}', '${PROJECT_ID}');
      INSERT INTO client_portal_issues(id, portal_id, status) VALUES ('${ISSUE_ID}', '${PORTAL_ID}', 'issued');
      INSERT INTO client_portal_legacy_mappings(legacy_publication_id, portal_id, issue_id, migration_status, verified_at, notes)
      VALUES ('${PUBLICATION_ID}', '${PORTAL_ID}', '${ISSUE_ID}', 'verified', '2026-07-28T00:00:00.000Z', '{}');
    `);
    migrationMocks.migrate.mockImplementation(async ({ apply, cutoverLease, database }: {
      apply: boolean;
      cutoverLease?: { frozenAt: string; frozenBy: string };
      database: D1DatabaseLike;
    }) => {
      if (apply) {
        await database.prepare("UPDATE client_portal_legacy_mappings SET notes = ? WHERE legacy_publication_id = ?")
          .bind(cutoverLeaseNotes(cutoverLease), PUBLICATION_ID)
          .run();
      }
      return migrationReport({ status: "already_migrated" });
    });

    const dryRun = await planCutover(activeDatabase);
    const applied = await cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    });

    expect(dryRun).toMatchObject({ migrated: 0, skipped: 1 });
    expect(applied).toMatchObject({ migrated: 0, skipped: 1 });
    expect(JSON.parse(String(readRow(activeDatabase, "SELECT summary_json FROM admin_audit_events")?.summary_json)))
      .toMatchObject({ migrated: 0, skipped: 1 });
  });

  it("uses the unknown-error fallback for a non-Error preflight rejection", async () => {
    activeDatabase = createDatabase();
    migrationMocks.migrate.mockRejectedValue("not-an-error");

    const failure = await planCutover(activeDatabase).catch((error: unknown) => error);

    expect(failure).toMatchObject({
      message: `Legacy publication ${PUBLICATION_ID} could not be preflighted: unknown error`,
      name: "LegacyWorkspaceCutoverError",
    });
  });

  it("uses the unknown-error fallback for a non-Error applied migration rejection", async () => {
    activeDatabase = createDatabase();
    migrationMocks.migrate.mockImplementation(async ({ apply }: { apply: boolean }) => {
      if (apply) throw 17;
      return migrationReport();
    });
    const dryRun = await planCutover(activeDatabase);

    const failure = await cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    }).catch((error: unknown) => error);

    expect(failure).toMatchObject({
      message: `Legacy publication ${PUBLICATION_ID} could not be migrated: unknown error`,
      name: "LegacyWorkspaceCutoverError",
    });
  });

  it("rejects ownership changing after acquisition but before acquired-barrier readback", async () => {
    activeDatabase = createDatabase();
    migrationMocks.migrate.mockResolvedValue(migrationReport());
    const dryRun = await planCutover(activeDatabase);
    const originalPrepare = activeDatabase.prepare.bind(activeDatabase);
    let barrierReads = 0;
    activeDatabase.prepare = ((sql: string) => {
      const prepared = originalPrepare(sql);
      if (sql.includes("SELECT frozen_at, frozen_by")) {
        const originalFirst = prepared.first.bind(prepared);
        prepared.first = async () => {
          barrierReads += 1;
          const row = await originalFirst<Record<string, unknown>>();
          return barrierReads === 1 && row
            ? { ...row, frozen_by: "legacy_cutover_pending:admin_2" }
            : row;
        };
      }
      return prepared;
    }) as typeof activeDatabase.prepare;

    const failure = await cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    }).catch((error: unknown) => error);

    expect(failure).toMatchObject({
      message: "Legacy workspace write barrier ownership changed before migration.",
      name: "LegacyWorkspaceCutoverError",
    });
  });

  it("rejects unresolved records discovered by the second preflight under the barrier", async () => {
    activeDatabase = createDatabase();
    let calls = 0;
    const hiddenUnresolved = {
      *[Symbol.iterator]() {
        yield { id: "comment_late", kind: "comment", reason: "missing_or_ambiguous_recipient" };
      },
      toJSON() {
        return [];
      },
    };
    migrationMocks.migrate.mockImplementation(async () => {
      calls += 1;
      return calls === 3
        ? { ...migrationReport(), unresolved: hiddenUnresolved }
        : migrationReport();
    });
    const dryRun = await planCutover(activeDatabase);

    const failure = await cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    }).catch((error: unknown) => error);

    expect(failure).toMatchObject({
      message: "Legacy cutover stopped because unresolved legacy records remain under the write barrier.",
      name: "LegacyWorkspaceCutoverError",
    });
    expect(migrationMocks.migrate).toHaveBeenCalledTimes(3);
  });

  it("rejects unresolved records returned by the applied migration", async () => {
    activeDatabase = createDatabase();
    migrationMocks.migrate.mockImplementation(async ({ apply }: { apply: boolean }) =>
      apply ? migrationReport({ unresolved: true }) : migrationReport());
    const dryRun = await planCutover(activeDatabase);

    const failure = await cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    }).catch((error: unknown) => error);

    expect(failure).toMatchObject({
      message: `Legacy publication ${PUBLICATION_ID} could not be migrated: Legacy source changed after preflight; unresolved records remain.`,
      name: "LegacyWorkspaceCutoverError",
    });
  });

  it.each([
    { field: "missing lease", leaseRead: "missing" },
    { field: "lease timestamp", leaseRead: "timestamp" },
    { field: "lease owner", leaseRead: "owner" },
    { field: "domain mode", leaseRead: "mode" },
    { field: "domain owner", leaseRead: "domain-owner" },
  ])("stops finalization when the $field changes", async ({ leaseRead }) => {
    activeDatabase = createDatabase();
    mockVerifiedMigration();
    const dryRun = await planCutover(activeDatabase);
    const originalPrepare = activeDatabase.prepare.bind(activeDatabase);
    let barrierReads = 0;
    activeDatabase.prepare = ((sql: string) => {
      const prepared = originalPrepare(sql);
      if (sql.includes("SELECT frozen_at, frozen_by")) {
        const originalFirst = prepared.first.bind(prepared);
        prepared.first = async () => {
          barrierReads += 1;
          const row = await originalFirst<Record<string, unknown>>();
          if (barrierReads === 4 && leaseRead === "missing") return null;
          if (barrierReads === 4 && leaseRead === "timestamp" && row) {
            return { ...row, frozen_at: "2026-07-28T00:00:01.000Z" };
          }
          if (barrierReads === 4 && leaseRead === "owner" && row) {
            return { ...row, frozen_by: "legacy_cutover_pending:admin_2" };
          }
          if (barrierReads === 3 && leaseRead === "mode" && row) {
            return { ...row, frozen_by: "legacy_cutover" };
          }
          if (barrierReads === 3 && leaseRead === "domain-owner" && row) {
            return { ...row, frozen_by: "legacy_cutover_pending:admin_2" };
          }
          return row;
        };
      }
      return prepared;
    }) as typeof activeDatabase.prepare;

    const failure = await cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    }).catch((error: unknown) => error);

    expect(failure).toMatchObject({
      message: "Legacy workspace write barrier changed during migration; finalization was stopped.",
      name: "LegacyWorkspaceCutoverError",
    });
  });

  it("requires complete mode when replaying an already completed barrier", async () => {
    activeDatabase = createDatabase();
    activeDatabase.sqlite.prepare("INSERT INTO client_portal_legacy_workspace_cutovers(workspace_id, frozen_at, frozen_by) VALUES (?, ?, ?)")
      .run(WORKSPACE_ID, "2026-07-28T00:00:00.000Z", "legacy_cutover");
    migrationMocks.migrate.mockImplementation(async ({ apply, database }: {
      apply: boolean;
      database: D1DatabaseLike;
    }) => {
      if (!apply) return migrationReport();
      await database.prepare("INSERT INTO client_portals(id, workspace_id, project_id) VALUES (?, ?, ?)")
        .bind(PORTAL_ID, WORKSPACE_ID, PROJECT_ID)
        .run();
      await database.prepare("INSERT INTO client_portal_issues(id, portal_id, status) VALUES (?, ?, 'issued')")
        .bind(ISSUE_ID, PORTAL_ID)
        .run();
      await database.prepare(`INSERT INTO client_portal_legacy_mappings
        (legacy_publication_id, portal_id, issue_id, migration_status, verified_at, notes)
        VALUES (?, ?, ?, 'verified', '2026-07-28T00:00:00.000Z', '{}')`)
        .bind(PUBLICATION_ID, PORTAL_ID, ISSUE_ID)
        .run();
      return migrationReport({ status: "verified" });
    });
    const dryRun = await planCutover(activeDatabase);
    const originalPrepare = activeDatabase.prepare.bind(activeDatabase);
    let barrierReads = 0;
    activeDatabase.prepare = ((sql: string) => {
      const prepared = originalPrepare(sql);
      if (sql.includes("SELECT frozen_at, frozen_by")) {
        const originalFirst = prepared.first.bind(prepared);
        prepared.first = async () => {
          barrierReads += 1;
          const row = await originalFirst<Record<string, unknown>>();
          return barrierReads === 3 && row
            ? { ...row, frozen_by: `legacy_cutover_pending:${OPERATOR.userId}` }
            : row;
        };
      }
      return prepared;
    }) as typeof activeDatabase.prepare;

    const failure = await cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    }).catch((error: unknown) => error);

    expect(failure).toMatchObject({
      message: "Legacy workspace write barrier changed during migration; finalization was stopped.",
      name: "LegacyWorkspaceCutoverError",
    });
  });

  it("logs exact metadata and preserves the thrown finalization cause", async () => {
    activeDatabase = createDatabase("INSERT INTO admin_audit_events");
    mockVerifiedMigration();
    const dryRun = await planCutover(activeDatabase);

    const failure = await cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    }).catch((error: unknown) => error) as LegacyWorkspaceCutoverError;
    const [loggedError, metadata] = loggerMocks.logAppError.mock.calls[0] as [Error, unknown];

    expect(loggerMocks.logAppError).toHaveBeenCalledTimes(1);
    expect(loggedError).toMatchObject({ message: "Injected cutover batch failure." });
    expect(metadata).toEqual({
      action: "finalize_legacy_workspace_cutover",
      context: { workspaceId: WORKSPACE_ID },
      event: "legacy_workspace_cutover_finalization_error",
    });
    expect(failure).toMatchObject({
      cause: loggedError,
      message: "Legacy cutover finalization failed; the write freeze was not confirmed.",
      name: "LegacyWorkspaceCutoverError",
    });
  });

  it("logs exact metadata and preserves the unsuccessful-result cause", async () => {
    activeDatabase = createDatabase();
    mockVerifiedMigration();
    const dryRun = await planCutover(activeDatabase);
    activeDatabase.batch = async () => [{ success: true }, { success: false }];

    const failure = await cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    }).catch((error: unknown) => error) as LegacyWorkspaceCutoverError;
    const [loggedError, metadata] = loggerMocks.logAppError.mock.calls[0] as [Error, unknown];

    expect(loggerMocks.logAppError).toHaveBeenCalledTimes(1);
    expect(loggedError).toMatchObject({
      message: "D1 batch returned an unsuccessful legacy cutover finalization result.",
    });
    expect(metadata).toEqual({
      action: "finalize_legacy_workspace_cutover",
      context: { workspaceId: WORKSPACE_ID },
      event: "legacy_workspace_cutover_finalization_error",
    });
    expect(failure.cause).toBe(loggedError);
  });

  it("rejects a finalized freeze whose timestamp differs from the acquired lease", async () => {
    activeDatabase = createDatabase();
    mockVerifiedMigration();
    const dryRun = await planCutover(activeDatabase);
    const originalBatch = activeDatabase.batch!.bind(activeDatabase);
    activeDatabase.batch = async (statements) => {
      const results = await originalBatch(statements);
      activeDatabase!.sqlite.prepare("UPDATE client_portal_legacy_workspace_cutovers SET frozen_at = ? WHERE workspace_id = ?")
        .run("2026-07-28T00:00:01.000Z", WORKSPACE_ID);
      return results;
    };

    const failure = await cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    }).catch((error: unknown) => error);

    expect(failure).toMatchObject({
      message: "Legacy workspace write freeze was not finalized under the acquired barrier lease.",
      name: "LegacyWorkspaceCutoverError",
    });
  });

  it.each([
    { frozenBy: "legacy_cutover", state: "completed" },
    { frozenBy: "unexpected_owner", state: "ownerless pending" },
  ])("rejects recovery of a $state barrier before mutation", async ({ frozenBy }) => {
    activeDatabase = createDatabase();
    migrationMocks.migrate.mockResolvedValue(migrationReport());
    activeDatabase.sqlite.prepare("INSERT INTO client_portal_legacy_workspace_cutovers(workspace_id, frozen_at, frozen_by) VALUES (?, ?, ?)")
      .run(WORKSPACE_ID, "2026-07-28T00:00:00.000Z", frozenBy);
    const dryRun = await planCutover(activeDatabase);

    const failure = await recoverLegacyWorkspaceCutoverBarrier({
      action: "takeover",
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    }).catch((error: unknown) => error);

    expect(failure).toMatchObject({
      message: "There is no pending legacy cutover barrier to recover.",
      name: "LegacyWorkspaceCutoverError",
    });
  });

  it.each(["imported", "cutover_complete"])(
    "rejects release when a %s migration mapping exists",
    async (migrationStatus) => {
      activeDatabase = createDatabase();
      migrationMocks.migrate.mockResolvedValue(migrationReport({ status: "already_migrated" }));
      activeDatabase.sqlite.exec(`
        INSERT INTO client_portals(id, workspace_id, project_id) VALUES ('${PORTAL_ID}', '${WORKSPACE_ID}', '${PROJECT_ID}');
        INSERT INTO client_portal_issues(id, portal_id, status, created_at)
        VALUES ('${ISSUE_ID}', '${PORTAL_ID}', 'issued', '2026-07-27T00:00:00.000Z');
        INSERT INTO client_portal_legacy_mappings(legacy_publication_id, portal_id, issue_id, migration_status, verified_at, notes)
        VALUES ('${PUBLICATION_ID}', '${PORTAL_ID}', '${ISSUE_ID}', '${migrationStatus}', NULL, '{}');
        INSERT INTO client_portal_legacy_workspace_cutovers(workspace_id, frozen_at, frozen_by)
        VALUES ('${WORKSPACE_ID}', '2026-07-28T00:00:00.000Z', 'legacy_cutover_pending:${OPERATOR.userId}');
      `);
      const dryRun = await planCutover(activeDatabase);

      const failure = await recoverLegacyWorkspaceCutoverBarrier({
        action: "release",
        database: activeDatabase,
        expectedFingerprint: dryRun.inventory.fingerprint,
        operator: OPERATOR,
        workspaceId: WORKSPACE_ID,
      }).catch((error: unknown) => error);

      expect(failure).toMatchObject({
        message: "A legacy cutover barrier cannot be released after modern migration rows exist.",
        name: "LegacyWorkspaceCutoverError",
      });
    },
  );

  it.each([
    { readback: "mode" },
    { readback: "timestamp" },
  ])("rejects takeover when final $readback readback differs", async ({ readback }) => {
    activeDatabase = createDatabase();
    migrationMocks.migrate.mockResolvedValue(migrationReport());
    const frozenAt = "2026-07-28T00:00:00.000Z";
    activeDatabase.sqlite.prepare("INSERT INTO client_portal_legacy_workspace_cutovers(workspace_id, frozen_at, frozen_by) VALUES (?, ?, ?)")
      .run(WORKSPACE_ID, frozenAt, `legacy_cutover_pending:${OPERATOR.userId}`);
    const dryRun = await planCutover(activeDatabase);
    const alternateOperator = { email: "alternate@example.com", userId: "admin_2" };
    const originalBatch = activeDatabase.batch!.bind(activeDatabase);
    activeDatabase.batch = async (statements) => {
      const results = await originalBatch(statements);
      if (readback === "mode") {
        activeDatabase!.sqlite.prepare("UPDATE client_portal_legacy_workspace_cutovers SET frozen_by = 'legacy_cutover' WHERE workspace_id = ?")
          .run(WORKSPACE_ID);
      } else {
        activeDatabase!.sqlite.prepare("UPDATE client_portal_legacy_workspace_cutovers SET frozen_at = ? WHERE workspace_id = ?")
          .run("2026-07-28T00:00:01.000Z", WORKSPACE_ID);
      }
      return results;
    };

    const failure = await recoverLegacyWorkspaceCutoverBarrier({
      action: "takeover",
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: alternateOperator,
      workspaceId: WORKSPACE_ID,
    }).catch((error: unknown) => error);

    expect(failure).toMatchObject({
      message: "Legacy workspace cutover recovery did not change the write barrier as requested.",
      name: "LegacyWorkspaceCutoverError",
    });
  });

  it("rejects a non-pending domain barrier when its owner comparison remains equal", async () => {
    activeDatabase = createDatabase();
    const operatorState: { userId: string | null } = { userId: OPERATOR.userId };
    const operator = {
      email: OPERATOR.email,
      get userId(): string {
        return operatorState.userId as string;
      },
    };
    mockVerifiedMigration({
      afterWrite: async () => {
        operatorState.userId = null;
      },
    });
    const dryRun = await planCutover(activeDatabase);
    const originalPrepare = activeDatabase.prepare.bind(activeDatabase);
    let barrierReads = 0;
    activeDatabase.prepare = ((sql: string) => {
      const prepared = originalPrepare(sql);
      if (sql.includes("SELECT frozen_at, frozen_by")) {
        const originalFirst = prepared.first.bind(prepared);
        prepared.first = async () => {
          barrierReads += 1;
          const row = await originalFirst<Record<string, unknown>>();
          return barrierReads === 3 && row
            ? { ...row, frozen_by: "legacy_cutover" }
            : row;
        };
      }
      return prepared;
    }) as typeof activeDatabase.prepare;

    const failure = await cutoverLegacyWorkspaceToClientPortals({
      apply: true,
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator,
      workspaceId: WORKSPACE_ID,
    }).catch((error: unknown) => error);

    expect(operatorState.userId).toBeNull();
    expect(failure).toMatchObject({
      message: "Legacy workspace write barrier changed during migration; finalization was stopped.",
      name: "LegacyWorkspaceCutoverError",
    });
  });

  it("represents a completed recovery barrier as ownerless and rejects it before preflight", async () => {
    activeDatabase = createDatabase();
    migrationMocks.migrate.mockResolvedValue(migrationReport());
    const frozenAt = "2026-07-28T00:00:00.000Z";
    activeDatabase.sqlite.prepare("INSERT INTO client_portal_legacy_workspace_cutovers(workspace_id, frozen_at, frozen_by) VALUES (?, ?, ?)")
      .run(WORKSPACE_ID, frozenAt, "legacy_cutover");
    const dryRun = await planCutover(activeDatabase);
    expect(dryRun.barrier).toEqual({ frozenAt, mode: "complete", ownerUserId: null });
    migrationMocks.migrate.mockClear();

    const failure = await recoverLegacyWorkspaceCutoverBarrier({
      action: "takeover",
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: OPERATOR,
      workspaceId: WORKSPACE_ID,
    }).catch((error: unknown) => error);

    expect(failure).toMatchObject({
      message: "There is no pending legacy cutover barrier to recover.",
      name: "LegacyWorkspaceCutoverError",
    });
    expect(migrationMocks.migrate).not.toHaveBeenCalled();
  });

  it("rejects a non-pending takeover readback when owner and timestamp remain equal", async () => {
    activeDatabase = createDatabase();
    migrationMocks.migrate.mockResolvedValue(migrationReport());
    const frozenAt = "2026-07-28T00:00:00.000Z";
    activeDatabase.sqlite.prepare("INSERT INTO client_portal_legacy_workspace_cutovers(workspace_id, frozen_at, frozen_by) VALUES (?, ?, ?)")
      .run(WORKSPACE_ID, frozenAt, `legacy_cutover_pending:${OPERATOR.userId}`);
    const dryRun = await planCutover(activeDatabase);
    const operatorState: { userId: string | null } = { userId: "admin_2" };
    const alternateOperator = {
      email: "alternate@example.com",
      get userId(): string {
        return operatorState.userId as string;
      },
    };
    const originalBatch = activeDatabase.batch!.bind(activeDatabase);
    activeDatabase.batch = async (statements) => {
      const results = await originalBatch(statements);
      activeDatabase!.sqlite.prepare("UPDATE client_portal_legacy_workspace_cutovers SET frozen_by = 'legacy_cutover' WHERE workspace_id = ?")
        .run(WORKSPACE_ID);
      operatorState.userId = null;
      return results;
    };

    const failure = await recoverLegacyWorkspaceCutoverBarrier({
      action: "takeover",
      database: activeDatabase,
      expectedFingerprint: dryRun.inventory.fingerprint,
      operator: alternateOperator,
      workspaceId: WORKSPACE_ID,
    }).catch((error: unknown) => error);

    expect(operatorState.userId).toBeNull();
    expect(readRow(activeDatabase, "SELECT frozen_at FROM client_portal_legacy_workspace_cutovers")).toEqual({
      frozen_at: frozenAt,
    });
    expect(failure).toMatchObject({
      message: "Legacy workspace cutover recovery did not change the write barrier as requested.",
      name: "LegacyWorkspaceCutoverError",
    });
  });
});
