import { describe, expect, it } from "vitest";

import { routeCloudflareD1PerformanceProofRequest } from "../../src/lib/cloudflare/d1-performance-proof-router";

class FakeD1Statement<T = Record<string, unknown>> {
  private values: Array<string | number | null> = [];

  constructor(
    private readonly database: FakeD1Database,
    private readonly sql: string,
  ) {}

  bind(...values: Array<string | number | null>) {
    this.values = values;
    return this;
  }

  async run() {
    this.database.run(this.sql, this.values);
    return { success: true };
  }

  async all() {
    return { success: true, results: this.database.all(this.sql, this.values) as T[] };
  }
}

class FakeD1Database {
  schemaCreated = false;
  hasRows = false;

  async exec(sql: string) {
    if (sql.includes("__archestimator_d1_proof_workspaces")) this.schemaCreated = true;
    return { count: sql.split(";").length };
  }

  prepare<T = Record<string, unknown>>(sql: string) {
    return new FakeD1Statement<T>(this, sql);
  }

  run(sql: string, _values: Array<string | number | null>) {
    if (sql.startsWith("CREATE TABLE IF NOT EXISTS __archestimator_d1_proof_workspaces")) this.schemaCreated = true;
    if (sql.startsWith("INSERT INTO __archestimator_d1_proof_")) this.hasRows = true;
    if (sql.startsWith("DELETE FROM __archestimator_d1_proof_")) this.hasRows = false;
  }

  all(sql: string, _values: Array<string | number | null>) {
    if (sql.includes("rows_seeded")) return [{ rows_seeded: this.hasRows ? 132 : 0 }];
    if (sql.includes("COUNT(DISTINCT p.id)")) {
      return [
        { status: "active", project_count: 4, total_cents: 425000 },
        { status: "archived", project_count: 2, total_cents: 225000 },
      ];
    }
    if (sql.includes("COUNT(r.id) AS row_count")) {
      return [
        { id: "estimate-alpha-1", name: "Estimate 1", row_count: 6, rows_total_cents: 42000 },
        { id: "estimate-alpha-7", name: "Estimate 7", row_count: 6, rows_total_cents: 46000 },
      ];
    }
    if (sql.includes("GROUP BY category")) {
      return [
        { category: "finish", component_count: 12, avg_unit_cost_cents: 1800 },
        { category: "fixture", component_count: 12, avg_unit_cost_cents: 1850 },
        { category: "rough", component_count: 12, avg_unit_cost_cents: 1900 },
      ];
    }
    if (sql.includes("SELECT EXISTS")) return [{ allowed: 1 }];
    if (sql.includes("SELECT quantity, unit_cost_cents")) return [{ quantity: 3, unit_cost_cents: 4309 }];
    return [];
  }
}

function createEnv() {
  return {
    CRON_SECRET: "secret",
    ARCH_DB: new FakeD1Database(),
  };
}

describe("Cloudflare D1 performance proof router", () => {
  it("ignores unrelated paths", async () => {
    await expect(
      routeCloudflareD1PerformanceProofRequest(new Request("https://example.com/api/health"), createEnv()),
    ).resolves.toBeNull();
  });

  it("requires POST, a matching bearer secret, and the D1 binding", async () => {
    const getResponse = await routeCloudflareD1PerformanceProofRequest(
      new Request("https://example.com/__cloudflare/d1-performance-proof", {
        headers: { authorization: "Bearer secret" },
      }),
      createEnv(),
    );
    const unauthorizedResponse = await routeCloudflareD1PerformanceProofRequest(
      new Request("https://example.com/__cloudflare/d1-performance-proof", { method: "POST" }),
      createEnv(),
    );
    const missingBindingResponse = await routeCloudflareD1PerformanceProofRequest(
      new Request("https://example.com/__cloudflare/d1-performance-proof", {
        method: "POST",
        headers: { authorization: "Bearer secret" },
      }),
      { CRON_SECRET: "secret" },
    );

    expect(getResponse?.status).toBe(405);
    expect(unauthorizedResponse?.status).toBe(401);
    expect(missingBindingResponse?.status).toBe(503);
  });

  it("proves hosted D1 query budgets and cleanup with sanitized fixture rows", async () => {
    const env = createEnv();
    const response = await routeCloudflareD1PerformanceProofRequest(
      new Request("https://example.com/__cloudflare/d1-performance-proof", {
        method: "POST",
        headers: { authorization: "Bearer secret" },
      }),
      env,
    );
    const body = await response?.json();

    expect(response?.status).toBe(200);
    expect(body.mode).toBe("cloudflare-d1-runtime-performance-proof");
    expect(body.result.d1BindingPresent).toBe(true);
    expect(body.result.schemaReady).toBe(true);
    expect(body.result.seedReady).toBe(true);
    expect(body.result.cleanupReady).toBe(true);
    expect(body.result.rowsSeeded).toBe(132);
    expect(body.result.rowsCleaned).toBe(0);
    expect(body.result.benchmarkRows).toHaveLength(5);
    expect(body.result.benchmarkRows.find((row: { surface: string }) => row.surface === "estimate_row_mutation")).toMatchObject({
      plannedQueries: 1,
      queryBudget: 3,
      rowsReturned: 1,
      status: "hosted-pass",
    });
    expect(body.result.benchmarkRows.every((row: { status: string }) => row.status === "hosted-pass")).toBe(true);
    expect(body.readiness.d1RuntimeProofReady).toBe(true);
    expect(body.blockers).toEqual([]);
    expect(env.ARCH_DB.schemaCreated).toBe(true);
    expect(env.ARCH_DB.hasRows).toBe(false);
  });
});
