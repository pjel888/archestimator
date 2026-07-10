import { describe, expect, it } from "vitest";

class ObservabilityStatement {
  private values: unknown[] = [];

  constructor(
    private readonly database: ObservabilityDatabase,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    this.database.bound.push({ sql: this.sql, values });
    return this;
  }

  async all() {
    return { results: [{ id: "row-1", status: "ok", created_at: "2026-07-10T05:00:00.000Z" }] };
  }

  async first() {
    return null;
  }

  async run() {
    return { success: true, meta: { changes: 0 } };
  }
}

class ObservabilityDatabase {
  readonly bound: { sql: string; values: unknown[] }[] = [];

  prepare(sql: string) {
    return new ObservabilityStatement(this, sql);
  }
}

describe("admin observability readers", () => {
  it("reads recent rows from the Phase 6 observability tables", async () => {
    const database = new ObservabilityDatabase();
    const {
      listRecentClientErrorEvents,
      listRecentCronRunEvents,
      listRecentOpsRunEvents,
      listRecentWebVitalEvents,
    } = await import("@/lib/admin/observability-repository");

    await expect(listRecentCronRunEvents(200, database)).resolves.toMatchObject({ error: null });
    await expect(listRecentClientErrorEvents(5, database)).resolves.toMatchObject({ error: null });
    await expect(listRecentWebVitalEvents(5, database)).resolves.toMatchObject({ error: null });
    await expect(listRecentOpsRunEvents(5, database)).resolves.toMatchObject({ error: null });

    expect(database.bound.map((call) => call.sql)).toEqual([
      expect.stringContaining("FROM cron_run_events"),
      expect.stringContaining("FROM client_error_events"),
      expect.stringContaining("FROM web_vital_events"),
      expect.stringContaining("FROM ops_run_events"),
    ]);
    expect(database.bound[0]?.values).toEqual([50]);
  });
});
