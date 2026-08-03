import { createRequire } from "node:module";

import { afterEach, describe, expect, it } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Value } from "@/lib/cloudflare/d1";
import { listCurrentUserNotificationsFromD1 } from "@/lib/notifications/repository";

const requireRuntime = createRequire(import.meta.url);

type LocalSqliteDatabase = {
  close(): void;
  exec(sql: string): void;
  prepare(sql: string): {
    all(...parameters: unknown[]): Record<string, unknown>[];
  };
};

type SqliteD1Statement = D1PreparedStatementLike & {
  values: D1Value[];
};

const databases: LocalSqliteDatabase[] = [];

function createDatabase() {
  const { DatabaseSync } = requireRuntime("node:sqlite") as {
    DatabaseSync: new (path: string) => LocalSqliteDatabase;
  };
  const sqlite = new DatabaseSync(":memory:");
  databases.push(sqlite);
  sqlite.exec(`
    CREATE TABLE notification_definitions (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      severity TEXT NOT NULL,
      surface TEXT NOT NULL,
      release_version TEXT,
      action_label TEXT,
      action_href TEXT,
      priority INTEGER,
      starts_at TEXT NOT NULL,
      expires_at TEXT
    );
    CREATE TABLE notification_deliveries (
      id TEXT PRIMARY KEY,
      notification_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      delivered_at TEXT NOT NULL,
      seen_at TEXT,
      read_at TEXT,
      dismissed_at TEXT,
      modal_acknowledged_at TEXT,
      archived_at TEXT
    );
    INSERT INTO notification_definitions (
      id, kind, title, body, severity, surface, priority, starts_at
    ) VALUES (
      'definition-1', 'system_notice', 'Notice', 'Body', 'info', 'center', 0, '2026-08-01T00:00:00.000Z'
    );
    INSERT INTO notification_deliveries (id, notification_id, user_id, delivered_at) VALUES
      ('delivery-d', 'definition-1', 'user-1', '2026-08-03T10:00:00.000Z'),
      ('delivery-c', 'definition-1', 'user-1', '2026-08-03T09:00:00.000Z'),
      ('delivery-b', 'definition-1', 'user-1', '2026-08-03T09:00:00.000Z'),
      ('delivery-a', 'definition-1', 'user-1', '2026-08-03T08:00:00.000Z');
  `);

  const database: D1DatabaseLike = {
    prepare(sql: string): SqliteD1Statement {
      const statement: SqliteD1Statement = {
        values: [],
        bind(...values: D1Value[]) {
          statement.values = values;
          return statement;
        },
        async all<T>() {
          return { results: sqlite.prepare(sql).all(...statement.values) as T[], success: true };
        },
        async first<T>() {
          return (sqlite.prepare(sql).all(...statement.values)[0] as T | undefined) ?? null;
        },
        async run() {
          throw new Error("Unexpected write");
        },
      };
      return statement;
    },
  };

  return database;
}

afterEach(() => {
  while (databases.length) databases.pop()?.close();
});

describe("notification repository pagination", () => {
  it("traverses equal delivery timestamps exactly once across pages", async () => {
    const database = createDatabase();

    const firstPage = await listCurrentUserNotificationsFromD1(database, "user-1", { limit: 2 });
    expect(firstPage.items.map((item) => item.id)).toEqual(["delivery-d", "delivery-c"]);
    expect(firstPage.nextCursor).toEqual(expect.any(String));

    const secondPage = await listCurrentUserNotificationsFromD1(database, "user-1", {
      cursor: firstPage.nextCursor,
      limit: 2,
    });

    const deliveryIds = [...firstPage.items, ...secondPage.items].map((item) => item.id);
    expect(deliveryIds).toEqual(["delivery-d", "delivery-c", "delivery-b", "delivery-a"]);
    expect(new Set(deliveryIds).size).toBe(deliveryIds.length);
    expect(secondPage.nextCursor).toBeNull();
  });
});
