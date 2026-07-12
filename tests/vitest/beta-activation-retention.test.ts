import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import { purgeExpiredActivationData } from "@/lib/onboarding/activation-retention";

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
    expect(prepared[1]?.sql).toContain("state = 'delivered' AND delivered_at < ?");
    expect(prepared[2]?.sql).toContain("state IN ('pending', 'processing', 'dead') AND created_at < ?");
    for (const statement of prepared) {
      expect(statement.sql).toContain("FROM beta_activation_retention_holds hold");
      expect(statement.values).toContain("2026-07-12T00:00:00.000Z");
    }
    expect(prepared[0]?.values[0]).toBe("2026-01-13T00:00:00.000Z");
    expect(prepared[1]?.values[0]).toBe("2026-06-12T00:00:00.000Z");
    expect(prepared[2]?.values[0]).toBe("2026-01-13T00:00:00.000Z");
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

  it("runs the activation purge on the established daily retention cron alongside its reconciler", () => {
    const workerSource = readFileSync("worker.ts", "utf8");

    expect(workerSource).toContain('import { purgeExpiredActivationData } from "./src/lib/onboarding/activation-retention"');
    expect(workerSource).toContain('if (controller.cron === "30 3 * * *")');
    expect(workerSource).toContain("reconcileActivationOutbox(env.ARCH_DB)");
    expect(workerSource).toContain("purgeExpiredActivationData(env.ARCH_DB)");
  });
});
