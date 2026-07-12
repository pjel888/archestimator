import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

const requireRuntime = createRequire(import.meta.url);
const baseMigration = readFileSync("migrations/0014_publication_shared_links.sql", "utf8");
const foreignKeyMigration = readFileSync("migrations/0066_publication_foreign_keys.sql", "utf8");

const publicationTables = [
  "project_publications",
  "project_publication_events",
  "shared_link_recipients",
  "shared_link_comments",
  "shared_link_responses",
  "shared_link_events",
  "publication_digest_log",
] as const;

type PublicationTable = (typeof publicationTables)[number];

type LocalSqliteDatabase = {
  exec(sql: string): void;
  prepare(sql: string): {
    all(...parameters: unknown[]): Record<string, unknown>[];
    get(...parameters: unknown[]): Record<string, unknown> | undefined;
    run(...parameters: unknown[]): unknown;
  };
  close(): void;
};

type SqliteMasterRow = {
  name: string;
  sql: string;
  tbl_name: string;
  type: "index" | "table";
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
  `);
  database.exec(baseMigration);
  return database;
}

function seedPublicationGraph(database: LocalSqliteDatabase) {
  const at = "2026-07-11T00:00:00.000Z";
  database.prepare("INSERT INTO workspaces (id) VALUES (?)").run("workspace-1");
  database.prepare("INSERT INTO projects (id, workspace_id) VALUES (?, ?)").run("project-1", "workspace-1");
  database.prepare(`
    INSERT INTO project_publications (
      id, workspace_id, project_id, token_hash, encrypted_token, published_at, created_at, updated_at, snapshot_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run("publication-1", "workspace-1", "project-1", "token-hash-1", "encrypted-token-1", at, at, at, "{}");
  database.prepare(`
    INSERT INTO project_publication_events (id, publication_id, event_type, created_at)
    VALUES (?, ?, 'open', ?)
  `).run("publication-event-1", "publication-1", at);
  database.prepare(`
    INSERT INTO shared_link_recipients (
      id, publication_id, email, invited_at, recipient_token_hash, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run("recipient-1", "publication-1", "client@example.test", at, "recipient-token-hash-1", at, at);
  database.prepare(`
    INSERT INTO shared_link_comments (id, publication_id, recipient_id, author_email, body, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run("comment-1", "publication-1", "recipient-1", "client@example.test", "Please confirm the scope.", at);
  database.prepare(`
    INSERT INTO shared_link_responses (
      id, publication_id, recipient_id, decision, snapshot_version_at_decision, created_at
    ) VALUES (?, ?, ?, 'accepted', 1, ?)
  `).run("response-1", "publication-1", "recipient-1", at);
  database.prepare(`
    INSERT INTO shared_link_events (id, publication_id, recipient_id, event_type, created_at)
    VALUES (?, ?, ?, 'open', ?)
  `).run("shared-event-1", "publication-1", "recipient-1", at);
  database.prepare(`
    INSERT INTO publication_digest_log (id, publication_id, activity_kind, delivery_status, created_at)
    VALUES (?, ?, 'comment', 'sent', ?)
  `).run("digest-1", "publication-1", at);
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

function tableDigest(database: LocalSqliteDatabase, table: PublicationTable) {
  const rows = database.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all();
  return createHash("sha256").update(JSON.stringify(canonicalize(rows))).digest("hex");
}

function tableDigests(database: LocalSqliteDatabase) {
  return Object.fromEntries(publicationTables.map((table) => [table, tableDigest(database, table)]));
}

function rowCounts(database: LocalSqliteDatabase) {
  return Object.fromEntries(publicationTables.map((table) => [
    table,
    database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()?.count,
  ]));
}

function indexDefinitions(database: LocalSqliteDatabase) {
  return database.prepare(`
    SELECT name, sql, tbl_name, type
    FROM sqlite_master
    WHERE type = 'index' AND tbl_name IN (${publicationTables.map(() => "?").join(", ")})
    ORDER BY name
  `).all(...publicationTables) as SqliteMasterRow[];
}

function assertNoRebuildArtifacts(database: LocalSqliteDatabase) {
  const artifacts = database.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE name LIKE '%__0066%'
    UNION ALL
    SELECT name
    FROM sqlite_temp_master
    WHERE name LIKE '%__0066%'
  `).all();
  expect(artifacts).toEqual([]);
}

function assertMigrationRollsBack(database: LocalSqliteDatabase) {
  const beforeCounts = rowCounts(database);
  const beforeDigests = tableDigests(database);
  expect(() => database.exec(`BEGIN;\n${foreignKeyMigration}\nCOMMIT;`)).toThrow("publication_foreign_key_preflight_failed");
  expect(rowCounts(database)).toEqual(beforeCounts);
  expect(tableDigests(database)).toEqual(beforeDigests);
  assertNoRebuildArtifacts(database);
}

function reverseForeignKeyRebuild(database: LocalSqliteDatabase) {
  const source = createDatabase();
  try {
    const sourceTables = source.prepare(`
      SELECT name, sql, tbl_name, type
      FROM sqlite_master
      WHERE type = 'table' AND name IN (${publicationTables.map(() => "?").join(", ")})
    `).all(...publicationTables) as SqliteMasterRow[];
    const sourceIndexes = source.prepare(`
      SELECT name, sql, tbl_name, type
      FROM sqlite_master
      WHERE type = 'index' AND tbl_name IN (${publicationTables.map(() => "?").join(", ")}) AND sql IS NOT NULL
    `).all(...publicationTables) as SqliteMasterRow[];
    const tableSqlByName = new Map(sourceTables.map((row) => [row.name, row.sql]));

    database.exec("PRAGMA foreign_keys = OFF;");
    database.exec("BEGIN;");
    for (const table of publicationTables) {
      const columns = database.prepare(`PRAGMA table_info(${table})`).all().map((row) => String(row.name));
      const columnList = columns.join(", ");
      const sourceSql = tableSqlByName.get(table);
      if (!sourceSql) throw new Error(`Missing reverse schema for ${table}.`);
      database.exec(sourceSql.replace(new RegExp(`CREATE TABLE(?: IF NOT EXISTS)? ${table}`), `CREATE TABLE ${table}__reverse`));
      database.exec(`INSERT INTO ${table}__reverse (${columnList}) SELECT ${columnList} FROM ${table};`);
      database.exec(`DROP TABLE ${table};`);
      database.exec(`ALTER TABLE ${table}__reverse RENAME TO ${table};`);
    }
    for (const index of sourceIndexes) database.exec(index.sql);
    database.exec("COMMIT;");
    database.exec("PRAGMA foreign_keys = ON;");
  } finally {
    source.close();
  }
}

describe("publication foreign-key migration", () => {
  it("rebuilds all publication tables with preserved data, indexes, and enforced foreign keys", () => {
    const database = createDatabase();
    try {
      seedPublicationGraph(database);
      const beforeCounts = rowCounts(database);
      const beforeDigests = tableDigests(database);
      const beforeIndexes = indexDefinitions(database);

      database.exec(`BEGIN;\n${foreignKeyMigration}\nCOMMIT;`);

      expect(rowCounts(database)).toEqual(beforeCounts);
      expect(tableDigests(database)).toEqual(beforeDigests);
      expect(indexDefinitions(database)).toEqual(beforeIndexes);
      expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
      expect(database.prepare("PRAGMA foreign_key_list(project_publications)").all().map((row) => row.table).sort()).toEqual(["projects", "workspaces"]);
      expect(database.prepare("PRAGMA foreign_key_list(shared_link_comments)").all().map((row) => `${row.table}:${row.on_delete}`).sort()).toEqual([
        "project_publications:CASCADE",
        "shared_link_recipients:SET NULL",
      ]);
      expect(database.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'project_publication_events'").get()?.sql).not.toContain("download_attempt_blocked");
      assertNoRebuildArtifacts(database);
    } finally {
      database.close();
    }
  });

  it.each([
    ["publication workspace", "UPDATE project_publications SET workspace_id = 'workspace-missing' WHERE id = 'publication-1'"],
    ["publication project", "UPDATE project_publications SET project_id = 'project-missing' WHERE id = 'publication-1'"],
    ["publication event", "UPDATE project_publication_events SET publication_id = 'publication-missing' WHERE id = 'publication-event-1'"],
    ["recipient publication", "UPDATE shared_link_recipients SET publication_id = 'publication-missing' WHERE id = 'recipient-1'"],
    ["comment publication", "UPDATE shared_link_comments SET publication_id = 'publication-missing' WHERE id = 'comment-1'"],
    ["comment recipient", "UPDATE shared_link_comments SET recipient_id = 'recipient-missing' WHERE id = 'comment-1'"],
    ["response publication", "UPDATE shared_link_responses SET publication_id = 'publication-missing' WHERE id = 'response-1'"],
    ["response recipient", "UPDATE shared_link_responses SET recipient_id = 'recipient-missing' WHERE id = 'response-1'"],
    ["shared event publication", "UPDATE shared_link_events SET publication_id = 'publication-missing' WHERE id = 'shared-event-1'"],
    ["shared event recipient", "UPDATE shared_link_events SET recipient_id = 'recipient-missing' WHERE id = 'shared-event-1'"],
    ["digest publication", "UPDATE publication_digest_log SET publication_id = 'publication-missing' WHERE id = 'digest-1'"],
    ["retired event value", "UPDATE project_publication_events SET event_type = 'download_attempt_blocked' WHERE id = 'publication-event-1'"],
  ])("rolls back without repairing a %s finding", (_edge, mutation) => {
    const database = createDatabase();
    try {
      seedPublicationGraph(database);
      database.exec(mutation);
      assertMigrationRollsBack(database);
    } finally {
      database.close();
    }
  });

  it("rolls back a failure injected after a parent replacement", () => {
    const database = createDatabase();
    try {
      seedPublicationGraph(database);
      const failureInjectedMigration = foreignKeyMigration.replace(
        "CREATE TABLE project_publication_events__0066",
        "INSERT INTO __0066_assertion (value) VALUES (1);\n\nCREATE TABLE project_publication_events__0066",
      );
      const beforeDigests = tableDigests(database);

      expect(() => database.exec(`BEGIN;\n${failureInjectedMigration}\nCOMMIT;`)).toThrow("publication_foreign_key_preflight_failed");
      expect(tableDigests(database)).toEqual(beforeDigests);
      assertNoRebuildArtifacts(database);
    } finally {
      database.close();
    }
  });

  it("preserves nullable-recipient history and cascades project deletion", () => {
    const database = createDatabase();
    try {
      seedPublicationGraph(database);
      database.exec(`BEGIN;\n${foreignKeyMigration}\nCOMMIT;`);

      database.prepare("DELETE FROM shared_link_recipients WHERE id = ?").run("recipient-1");
      expect(database.prepare("SELECT recipient_id FROM shared_link_comments WHERE id = 'comment-1'").get()).toEqual({ recipient_id: null });
      expect(database.prepare("SELECT recipient_id FROM shared_link_responses WHERE id = 'response-1'").get()).toEqual({ recipient_id: null });
      expect(database.prepare("SELECT recipient_id FROM shared_link_events WHERE id = 'shared-event-1'").get()).toEqual({ recipient_id: null });

      database.prepare("DELETE FROM projects WHERE id = ?").run("project-1");
      expect(rowCounts(database)).toEqual(Object.fromEntries(publicationTables.map((table) => [table, 0])));
    } finally {
      database.close();
    }
  });

  it("supports a disposable reverse rebuild without losing publication rows", () => {
    const database = createDatabase();
    try {
      seedPublicationGraph(database);
      database.exec(`BEGIN;\n${foreignKeyMigration}\nCOMMIT;`);
      const beforeDigests = tableDigests(database);

      reverseForeignKeyRebuild(database);

      expect(tableDigests(database)).toEqual(beforeDigests);
      expect(database.prepare("PRAGMA foreign_key_list(project_publications)").all()).toEqual([]);
      expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      database.close();
    }
  });
});
