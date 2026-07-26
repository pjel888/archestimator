import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { describe, expect, it, vi } from "vitest";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1Result,
  D1Value,
} from "@/lib/cloudflare/d1";
import { createPublicationD1Store } from "@/lib/publication/d1-store";

vi.mock("server-only", () => ({}));

const requireRuntime = createRequire(import.meta.url);
const wranglerConfig = readFileSync("wrangler.jsonc", "utf8");

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const PROJECT_ID = "22222222-2222-4222-8222-222222222222";
const PUBLICATION_ID = "33333333-3333-4333-8333-333333333333";
const RECIPIENT_ID = "44444444-4444-4444-8444-444444444444";
const USER_ID = "55555555-5555-4555-8555-555555555555";
const TOKEN_HASH = "qa-g06-publication-token";
const RECIPIENT_TOKEN_HASH = "qa-g06-recipient-token";

type SqliteStatement = {
  all(...parameters: D1Value[]): Record<string, unknown>[];
  get(...parameters: D1Value[]): Record<string, unknown> | undefined;
  run(...parameters: D1Value[]): { changes: number | bigint };
};

type SqliteDatabase = {
  close(): void;
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
};

class LocalD1Statement<T = Record<string, unknown>> implements D1PreparedStatementLike<T> {
  private values: D1Value[] = [];

  constructor(private readonly statement: SqliteStatement) {}

  bind(...values: D1Value[]) {
    this.values = values;
    return this;
  }

  async first<R = T>(): Promise<R | null> {
    return (this.statement.get(...this.values) as R | undefined) ?? null;
  }

  async all<R = T>(): Promise<D1Result<R>> {
    return { results: this.statement.all(...this.values) as R[], success: true };
  }

  runSync(): D1Result<T> {
    const result = this.statement.run(...this.values);
    return { meta: { changes: Number(result.changes) }, success: true };
  }

  async run(): Promise<D1Result<T>> {
    return this.runSync();
  }
}

class LocalD1Database implements D1DatabaseLike {
  constructor(private readonly database: SqliteDatabase) {}

  prepare<T = Record<string, unknown>>(sql: string): D1PreparedStatementLike<T> {
    return new LocalD1Statement<T>(this.database.prepare(sql));
  }

  async batch<T = Record<string, unknown>>(
    statements: D1PreparedStatementLike<T>[],
  ): Promise<D1Result<T>[]> {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const results = statements.map((statement) => {
        if (!(statement instanceof LocalD1Statement)) {
          throw new Error("Unexpected D1 statement implementation.");
        }
        return statement.runSync() as D1Result<T>;
      });
      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}

function createLocalD1() {
  const { DatabaseSync } = requireRuntime("node:sqlite") as {
    DatabaseSync: new (path: string) => SqliteDatabase;
  };
  const database = new DatabaseSync(":memory:");

  database.exec("PRAGMA foreign_keys = ON;");
  database.exec(readFileSync("migrations/0007_collaboration_invitations.sql", "utf8"));
  database.exec(readFileSync("migrations/0008_estimate_sheet_user_preferences.sql", "utf8"));
  database.exec(readFileSync("migrations/0013_collaboration_management_sidecars.sql", "utf8"));
  database.exec(readFileSync("migrations/0014_publication_shared_links.sql", "utf8"));
  database.exec(`
    CREATE TABLE beta_activation_outbox (
      id TEXT PRIMARY KEY,
      domain_mutation_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      project_id TEXT,
      estimate_id TEXT,
      milestone TEXT NOT NULL,
      source TEXT NOT NULL,
      origin_class TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      dedupe_key TEXT NOT NULL,
      metadata_json TEXT NOT NULL,
      state TEXT NOT NULL,
      attempt_count INTEGER NOT NULL,
      next_attempt_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (workspace_id, dedupe_key)
    );
  `);

  const timestamp = "2026-07-26T00:00:00.000Z";
  database.prepare(`
    INSERT INTO workspaces (id, name, slug, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(WORKSPACE_ID, "QA-G06 workspace", "qa-g06-workspace", USER_ID, timestamp, timestamp);
  database.prepare(`
    INSERT INTO projects (id, workspace_id, name, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(PROJECT_ID, WORKSPACE_ID, "QA-G06 project", USER_ID, timestamp, timestamp);
  database.prepare(`
    INSERT INTO workspace_members (workspace_id, user_id, role, created_at, updated_at)
    VALUES (?, ?, 'owner', ?, ?)
  `).run(WORKSPACE_ID, USER_ID, timestamp, timestamp);
  database.prepare(`
    INSERT INTO project_publications (
      id, workspace_id, project_id, token_hash, encrypted_token, snapshot_json,
      published_by, published_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    PUBLICATION_ID,
    WORKSPACE_ID,
    PROJECT_ID,
    TOKEN_HASH,
    "qa-g06-redacted-token",
    '{"estimates":[]}',
    USER_ID,
    timestamp,
    timestamp,
    timestamp,
  );
  database.prepare(`
    INSERT INTO shared_link_recipients (
      id, publication_id, email, invited_at, recipient_token_hash, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    RECIPIENT_ID,
    PUBLICATION_ID,
    "qa-g06@archestimator.local",
    timestamp,
    RECIPIENT_TOKEN_HASH,
    timestamp,
    timestamp,
  );

  return { database, d1: new LocalD1Database(database) };
}

describe("QA-G06 duplicate-decision Cloudflare D1 race proof", () => {
  it("persists exactly one response when two current D1 store calls race", async () => {
    expect(wranglerConfig).toContain('"binding": "ARCH_DB"');
    expect(wranglerConfig).toContain('"database_name": "archestimator-proof-db"');

    const { database, d1 } = createLocalD1();
    try {
      const store = createPublicationD1Store(Promise.resolve(d1));
      const input = {
        decision: "declined" as const,
        estimateId: null,
        expectedSnapshotVersion: 1,
        note: "QA-G06 duplicate race proof",
        publicationId: PUBLICATION_ID,
        projectId: PROJECT_ID,
        publishedBy: USER_ID,
        recipientTokenHash: RECIPIENT_TOKEN_HASH,
        rowId: null,
        signerName: null,
        targetKind: "proposal" as const,
        targetLabel: "the proposal",
        targetSecondaryLabel: null,
        tokenHash: TOKEN_HASH,
        workspaceId: WORKSPACE_ID,
      };

      const results = await Promise.all([
        store.submitClientResponse(input),
        store.submitClientResponse(input),
      ]);

      expect(results.filter((result) => typeof result === "string")).toHaveLength(1);
      expect(results.filter((result) => result === null)).toHaveLength(1);
      expect(database.prepare(`
        SELECT COUNT(*) AS count
        FROM shared_link_responses
        WHERE publication_id = ? AND recipient_id = ?
      `).get(PUBLICATION_ID, RECIPIENT_ID)).toEqual({ count: 1 });
      expect(database.prepare(`
        SELECT decision, note
        FROM shared_link_responses
        WHERE publication_id = ? AND recipient_id = ?
      `).get(PUBLICATION_ID, RECIPIENT_ID)).toEqual({
        decision: "declined",
        note: "QA-G06 duplicate race proof",
      });
      expect(database.prepare(`
        SELECT COUNT(*) AS count
        FROM beta_activation_outbox
        WHERE workspace_id = ? AND milestone = 'recipient_decided'
      `).get(WORKSPACE_ID)).toEqual({ count: 1 });
    } finally {
      database.close();
    }
  });
});
