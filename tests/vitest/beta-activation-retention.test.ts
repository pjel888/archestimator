import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { describe, expect, it, vi } from "vitest";

import { DEFAULT_RETENTION_RULES } from "@/lib/compliance/retention-core";
import { purgeExpiredActivationData } from "@/lib/onboarding/activation-retention";

const requireRuntime = createRequire(import.meta.url);

type LocalSqliteStatement = {
  all(...values: unknown[]): Record<string, unknown>[];
  run(...values: unknown[]): { changes: number | bigint };
};

type LocalSqliteDatabase = {
  close(): void;
  exec(sql: string): void;
  prepare(sql: string): LocalSqliteStatement;
};

describe("activation retention", () => {
  it("purges events, delivered intents, and unresolved intents at their separate TTLs while respecting active holds", async () => {
    const prepared: Array<{ sql: string; values: unknown[] }> = [];
    const database = {
      batch: vi.fn().mockResolvedValue([
        { success: true, meta: { changes: 3 } },
        { success: true, meta: { changes: 2 } },
        { success: true, meta: { changes: 1 } },
      ]),
      prepare(sql: string) {
        const statement = {
          all: vi.fn(),
          bind(...values: unknown[]) {
            prepared.push({ sql, values });
            return statement;
          },
          first: vi.fn(),
          run: vi.fn(),
        };
        return statement;
      },
    };

    await expect(purgeExpiredActivationData(database as never, {
      now: new Date("2026-07-12T00:00:00.000Z"),
    })).resolves.toEqual({ deliveredOutbox: 2, events: 3, unresolvedOutbox: 1 });

    expect(database.batch).toHaveBeenCalledTimes(1);
    expect(prepared).toHaveLength(3);
    expect(prepared[0]?.sql).toContain("DELETE FROM beta_activation_events");
    expect(prepared[1]?.sql).toContain("state = 'delivered'");
    expect(prepared[1]?.sql).toContain(
      "datetime(delivered_at) < datetime(?)",
    );
    expect(prepared[2]?.sql).toContain(
      "state IN ('pending', 'dead')",
    );
    expect(prepared[2]?.sql).toContain("lease_expires_at IS NULL OR datetime(lease_expires_at) <= datetime(?)");
    expect(prepared[2]?.sql).toContain(
      "datetime(created_at) < datetime(?)",
    );
    for (const statement of prepared) {
      expect(statement.sql).toContain("FROM beta_activation_retention_holds hold");
      expect(statement.sql).toContain(
        "datetime(hold.starts_at) <= datetime(?)",
      );
      expect(statement.sql).toContain(
        "datetime(hold.expires_at) > datetime(?)",
      );
      expect(statement.values).toContain("2026-07-12T00:00:00.000Z");
    }
    expect(prepared[0]?.values[0]).toBe("2026-01-13T00:00:00.000Z");
    expect(prepared[1]?.values[0]).toBe("2026-06-12T00:00:00.000Z");
    expect(prepared[2]?.values[1]).toBe("2026-01-13T00:00:00.000Z");
  });

  it("fails closed when any retention deletion fails", async () => {
    const database = {
      batch: vi.fn().mockResolvedValue([{ success: true }, { success: false }, { success: true }]),
      prepare() {
        const statement = { all: vi.fn(), bind: vi.fn(() => statement), first: vi.fn(), run: vi.fn() };
        return statement;
      },
    };

    await expect(purgeExpiredActivationData(database as never)).rejects.toThrow("Activation retention purge failed");
  });

  it("preserves every generic activation record covered by a same-day ISO legal hold", () => {
    const { DatabaseSync } = requireRuntime("node:sqlite") as {
      DatabaseSync: new (path: string) => LocalSqliteDatabase;
    };
    const database = new DatabaseSync(":memory:");
    const now = new Date();
    const startedAt = `${now.toISOString().slice(0, 10)}T00:00:00.000Z`;
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60_000).toISOString();
    const cutoff = new Date(now.getTime() - 24 * 60 * 60_000).toISOString();

    try {
      database.exec(`
        CREATE TABLE beta_activation_events (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE beta_activation_outbox (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          state TEXT NOT NULL,
          delivered_at TEXT,
          lease_expires_at TEXT,
          created_at TEXT NOT NULL
        );
        CREATE TABLE beta_activation_retention_holds (
          user_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          starts_at TEXT NOT NULL,
          expires_at TEXT NOT NULL
        );
      `);
      database.prepare(`
        INSERT INTO beta_activation_events (id, user_id, workspace_id, created_at)
        VALUES (?, ?, ?, ?)
      `).run("event-1", "user-1", "workspace-1", "2025-01-01T00:00:00.000Z");
      database.prepare(`
        INSERT INTO beta_activation_outbox (
          id, user_id, workspace_id, state, delivered_at, lease_expires_at, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?)
      `).run(
        "delivered-1",
        "user-1",
        "workspace-1",
        "delivered",
        "2025-01-01T00:00:00.000Z",
        null,
        "2025-01-01T00:00:00.000Z",
        "pending-1",
        "user-1",
        "workspace-1",
        "pending",
        null,
        null,
        "2025-01-01T00:00:00.000Z",
      );
      database.prepare(`
        INSERT INTO beta_activation_retention_holds (
          user_id, workspace_id, starts_at, expires_at
        )
        VALUES (?, ?, ?, ?)
      `).run("user-1", "workspace-1", startedAt, expiresAt);

      const activationRules = DEFAULT_RETENTION_RULES.filter((rule) =>
        rule.className.startsWith("beta_activation_"),
      );
      expect(activationRules.map((rule) => rule.className)).toEqual([
        "beta_activation_events",
        "beta_activation_outbox_delivered",
        "beta_activation_outbox_unresolved",
      ]);
      for (const rule of activationRules) {
        expect(database.prepare(rule.selectSql).all(cutoff)).toEqual([]);
      }
      expect(database.prepare(activationRules[0]!.applySql).run(JSON.stringify(["event-1"])))
        .toEqual(expect.objectContaining({ changes: 0 }));
      expect(database.prepare(activationRules[1]!.applySql).run(JSON.stringify(["delivered-1"])))
        .toEqual(expect.objectContaining({ changes: 0 }));
      expect(database.prepare(activationRules[2]!.applySql).run(JSON.stringify(["pending-1"])))
        .toEqual(expect.objectContaining({ changes: 0 }));
    } finally {
      database.close();
    }
  });

  it("does not select a processing intent whose lease is still live", () => {
    const { DatabaseSync } = requireRuntime("node:sqlite") as {
      DatabaseSync: new (path: string) => LocalSqliteDatabase;
    };
    const database = new DatabaseSync(":memory:");
    const now = new Date();
    const cutoff = new Date(now.getTime() - 181 * 24 * 60 * 60_000).toISOString();

    try {
      database.exec(`
        CREATE TABLE beta_activation_outbox (
          id TEXT PRIMARY KEY, user_id TEXT NOT NULL, workspace_id TEXT NOT NULL,
          state TEXT NOT NULL, created_at TEXT NOT NULL, lease_expires_at TEXT
        );
        CREATE TABLE beta_activation_retention_holds (
          user_id TEXT NOT NULL, workspace_id TEXT NOT NULL,
          starts_at TEXT NOT NULL, expires_at TEXT NOT NULL
        );
      `);
      database.prepare(`
        INSERT INTO beta_activation_outbox (id, user_id, workspace_id, state, created_at, lease_expires_at)
        VALUES ('live-lease', 'user-1', 'workspace-1', 'processing', ?, ?)
      `).run(cutoff, new Date(now.getTime() + 60_000).toISOString());

      const unresolved = DEFAULT_RETENTION_RULES.find((rule) => (
        rule.className === "beta_activation_outbox_unresolved"
      ));
      expect(database.prepare(unresolved!.selectSql).all(cutoff)).toEqual([]);
    } finally {
      database.close();
    }
  });

  it("runs activation and onboarding purges on the established daily retention cron", () => {
    const workerSource = readFileSync("worker.ts", "utf8");

    expect(workerSource).toContain('import { purgeExpiredActivationData } from "./src/lib/onboarding/activation-retention"');
    expect(workerSource).toContain('import { purgeExpiredOnboardingEvents } from "./src/lib/onboarding/flow-retention"');
    expect(workerSource).toContain('if (controller.cron === "30 3 * * *")');
    expect(workerSource).toContain("reconcileActivationOutbox(env.ARCH_DB)");
    expect(workerSource).toContain("purgeExpiredActivationData(env.ARCH_DB)");
    expect(workerSource).toContain("purgeExpiredOnboardingEvents(env.ARCH_DB)");
    expect(workerSource).toContain('console.log("Onboarding event retention purge completed", JSON.stringify(onboardingRetention))');
  });
});
