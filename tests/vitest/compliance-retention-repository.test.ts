import { beforeEach, describe, expect, it, vi } from "vitest";

const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

vi.mock("@/lib/cloudflare/d1", () => d1Mocks);

import {
  DEFAULT_RETENTION_RULES,
  recordRetentionEvent,
  runRetentionPassInD1,
  runRetentionPass,
  type RetentionRule,
} from "@/lib/compliance/retention-repository";

type RetentionEventInsert = {
  id: string;
  className: string;
  action: string;
  rowsAffected: number;
  cutoffTimestamp: string;
  ranAt: string;
  cronRunId: string | null;
  notes: string | null;
  metadataJson: string;
};

type PreparedStatementCall = {
  sql: string;
  values: unknown[];
};

class FakeD1Statement {
  private values: unknown[] = [];

  constructor(
    private readonly database: FakeD1Database,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    this.database.prepared.push({ sql: this.sql, values });
    return this;
  }

  async first() {
    return null;
  }

  async all<R>() {
    this.database.allCalls.push({ sql: this.sql, values: this.values });
    return { results: [...this.database.selectRows] as R[] };
  }

  async run() {
    this.database.runCalls.push({ sql: this.sql, values: this.values });
    if (this.sql.toLowerCase().includes("insert into data_retention_events")) {
      const [
        id,
        className,
        action,
        rowsAffected,
        cutoffTimestamp,
        ranAt,
        cronRunId,
        notes,
        metadataJson,
      ] = this.values;
      this.database.retentionEvents.push({
        action: String(action),
        className: String(className),
        cronRunId: cronRunId === null ? null : String(cronRunId),
        cutoffTimestamp: String(cutoffTimestamp),
        id: String(id),
        metadataJson: String(metadataJson),
        notes: notes === null ? null : String(notes),
        ranAt: String(ranAt),
        rowsAffected: Number(rowsAffected),
      });
      return { success: true, meta: { changes: 1 } };
    }
    return { success: true, meta: { changes: this.database.applyChanges } };
  }
}

class FakeD1Database {
  allCalls: PreparedStatementCall[] = [];
  applyChanges = 0;
  prepared: PreparedStatementCall[] = [];
  retentionEvents: RetentionEventInsert[] = [];
  runCalls: PreparedStatementCall[] = [];
  selectRows: { id: string }[] = [];

  prepare(sql: string) {
    return new FakeD1Statement(this, sql);
  }
}

const testRule: RetentionRule = {
  action: "purged",
  applySql: "DELETE FROM test_table WHERE id IN (SELECT value FROM json_each(?1))",
  className: "shared_link_events",
  selectSql: "SELECT id FROM test_table WHERE created_at < ?1 LIMIT 500",
  ttlDays: 90,
};

beforeEach(() => {
  d1Mocks.getCloudflareD1Database.mockReset();
});

describe("retention repository", () => {
  it("keeps the default rule registry compatible with D1 positional binding", () => {
    const classNames = DEFAULT_RETENTION_RULES.map((rule) => rule.className);
    expect(new Set(classNames).size).toBe(classNames.length);

    for (const rule of DEFAULT_RETENTION_RULES) {
      expect(rule.selectSql).toContain("?1");
      expect(rule.applySql).toContain("?1");
      expect(rule.selectSql).not.toMatch(/[:@$][A-Za-z_]\w*/);
      expect(rule.applySql).not.toMatch(/[:@$][A-Za-z_]\w*/);
    }
  });

  it("returns no results when D1 is unavailable", async () => {
    d1Mocks.getCloudflareD1Database.mockResolvedValue(null);

    await expect(runRetentionPass([testRule])).resolves.toEqual([]);
  });

  it("reports dry-run rows without applying deletes or writing audit events", async () => {
    const database = new FakeD1Database();
    database.selectRows = [{ id: "row-a" }, { id: "row-b" }];
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const results = await runRetentionPass([testRule], { dryRun: true });

    expect(results).toEqual([
      expect.objectContaining({
        action: "purged",
        className: "shared_link_events",
        notes: "dry-run; would have affected 2 rows",
        rowsAffected: 2,
        skipped: true,
      }),
    ]);
    expect(database.allCalls[0]?.values).toEqual([expect.any(String)]);
    expect(database.runCalls).toHaveLength(0);
    expect(database.retentionEvents).toHaveLength(0);
  });

  it("applies deletes with ordered D1 binds and records minimized audit metadata", async () => {
    const database = new FakeD1Database();
    database.applyChanges = 2;
    database.selectRows = [{ id: "row-a" }, { id: "row-b" }];
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const results = await runRetentionPass([testRule], { cronRunId: "cron-123" });

    expect(results).toEqual([
      expect.objectContaining({
        action: "purged",
        className: "shared_link_events",
        notes: null,
        rowsAffected: 2,
        skipped: false,
      }),
    ]);

    expect(database.allCalls[0]?.values).toEqual([expect.any(String)]);
    expect(database.runCalls[0]?.sql).toContain("DELETE FROM test_table");
    expect(database.runCalls[0]?.values).toEqual([JSON.stringify(["row-a", "row-b"])]);

    const event = database.retentionEvents[0];
    expect(event).toEqual(
      expect.objectContaining({
        action: "purged",
        className: "shared_link_events",
        cronRunId: "cron-123",
        rowsAffected: 2,
      }),
    );
    expect(JSON.parse(event!.metadataJson)).toEqual({ selected_count: 2 });
    expect(event!.metadataJson).not.toContain("row-a");
    expect(event!.metadataJson).not.toContain("row-b");
  });

  it("can run from a Worker-injected D1 binding without resolving OpenNext context", async () => {
    const database = new FakeD1Database();
    database.applyChanges = 1;
    database.selectRows = [{ id: "row-a" }];

    const results = await runRetentionPassInD1(database, [testRule], { cronRunId: "worker-cron" });

    expect(d1Mocks.getCloudflareD1Database).not.toHaveBeenCalled();
    expect(results).toEqual([
      expect.objectContaining({
        action: "purged",
        className: "shared_link_events",
        rowsAffected: 1,
        skipped: false,
      }),
    ]);
    expect(database.retentionEvents[0]).toEqual(
      expect.objectContaining({
        cronRunId: "worker-cron",
        rowsAffected: 1,
      }),
    );
  });

  it("recordRetentionEvent no-ops safely without a D1 binding", async () => {
    d1Mocks.getCloudflareD1Database.mockResolvedValue(null);

    await expect(
      recordRetentionEvent({
        action: "purged",
        className: "shared_link_events",
        cutoffTimestamp: "2026-07-05T00:00:00.000Z",
        rowsAffected: 0,
      }),
    ).resolves.toEqual({ id: expect.stringMatching(/^[0-9a-f-]{36}$/i) });
  });
});
