import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

const requireRuntime = createRequire(import.meta.url);

type LocalSqliteDatabase = {
  exec(sql: string): void;
  prepare(sql: string): {
    all(...parameters: unknown[]): Record<string, unknown>[];
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
    CREATE TABLE shared_link_recipients (publication_id TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE shared_link_comments (publication_id TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE shared_link_responses (publication_id TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE INDEX recipients_publication_created ON shared_link_recipients (publication_id, created_at);
    CREATE INDEX comments_publication_created ON shared_link_comments (publication_id, created_at);
    CREATE INDEX responses_publication_created ON shared_link_responses (publication_id, created_at);
  `);
  return database;
}

function seedPublicationChildren(database: LocalSqliteDatabase, publicationCount: number) {
  const publicationIds = Array.from({ length: publicationCount }, (_, index) => `publication-${index + 1}`);
  const inserts = [
    database.prepare("INSERT INTO shared_link_recipients (publication_id, created_at) VALUES (?, ?)"),
    database.prepare("INSERT INTO shared_link_comments (publication_id, created_at) VALUES (?, ?)"),
    database.prepare("INSERT INTO shared_link_responses (publication_id, created_at) VALUES (?, ?)"),
  ];

  for (const [index, publicationId] of publicationIds.entries()) {
    for (let childIndex = 0; childIndex < 3; childIndex += 1) {
      const createdAt = new Date(1_700_000_000_000 + index * 10_000 + childIndex * 1_000).toISOString();
      for (const insert of inserts) insert.run(publicationId, createdAt);
    }
  }

  return publicationIds;
}

describe("Publisher roster aggregate evaluator", () => {
  it.each([10, 50, 100])("returns one bounded aggregate row per publication for %i publications", (publicationCount) => {
    const database = createDatabase();
    const publicationIds = seedPublicationChildren(database, publicationCount);
    const placeholders = publicationIds.map(() => "?").join(", ");
    const queries = [
      `SELECT publication_id, COUNT(*) AS recipient_count FROM shared_link_recipients WHERE publication_id IN (${placeholders}) GROUP BY publication_id`,
      `SELECT publication_id, MAX(created_at) AS latest_created_at FROM shared_link_comments WHERE publication_id IN (${placeholders}) GROUP BY publication_id`,
      `SELECT publication_id, MAX(created_at) AS latest_created_at FROM shared_link_responses WHERE publication_id IN (${placeholders}) GROUP BY publication_id`,
    ];

    try {
      for (const query of queries) {
        const rows = database.prepare(query).all(...publicationIds);

        expect(rows).toHaveLength(publicationCount);
        expect(new Set(rows.map((row) => row.publication_id)).size).toBe(publicationCount);
      }
    } finally {
      database.close();
    }
  });
});
