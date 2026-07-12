import { describe, expect, it, vi } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Value } from "@/lib/cloudflare/d1";

const mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
  listProjectEstimates: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/cloudflare/d1", () => ({ getCloudflareD1Database: mocks.getCloudflareD1Database }));
vi.mock("@/lib/repositories/workspace-repository", () => ({ listProjectEstimates: mocks.listProjectEstimates }));

import { getProjectEstimateHealthData } from "@/lib/repositories/estimate-health-repository";

type CapturedStatement = { sql: string; values: D1Value[] };

function authorizedResult() {
  return {
    workspace: { id: "workspace-a" },
    project: { id: "project-a" },
    estimates: [
      { id: "estimate-a", project_budget: 1000 },
      { id: "estimate-b", project_budget: null },
    ],
  };
}

function createDatabase(rows: unknown[]) {
  const statements: CapturedStatement[] = [];
  const database: D1DatabaseLike = {
    prepare(sql: string): D1PreparedStatementLike {
      let values: D1Value[] = [];
      const statement: D1PreparedStatementLike = {
        bind(...nextValues: D1Value[]) {
          values = nextValues;
          return statement;
        },
        async first() {
          statements.push({ sql, values });
          return sql.includes("SELECT target_budget") ? { target_budget: 2000 } : null;
        },
        async all() {
          statements.push({ sql, values });
          if (sql.includes("FROM estimate_row_items")) return { results: rows, success: true };
          if (sql.includes("workspace_price_freshness_policies")) {
            return {
              results: [
                { category_node_id: null, revision: 3, stale_days: 30, very_stale_days: 60 },
                { category_node_id: "category-a", revision: 4, stale_days: 10, very_stale_days: 20 },
              ],
              success: true,
            };
          }
          return { results: [], success: true };
        },
        async run() { return { success: true }; },
      };
      return statement;
    },
  };
  return { database, statements };
}

function row(index: number) {
  return {
    id: `row-${String(index).padStart(4, "0")}`,
    estimate_id: "estimate-a",
    category_node_id: "category-a",
    quantity: 1,
    unit_cost: 0,
    misc_cost: 0,
    pricing_provenance_origin: "recorded",
    link_state: "linked-clean",
    source_snapshot_json: JSON.stringify({
      pricingDate: "2026-07-01",
      pricingSource: "Supplier catalog",
      sourceUrl: "https://private.example.test/secret",
      internalToken: "must-not-leak",
    }),
  };
}

describe("estimate health repository", () => {
  it("keeps unauthorized projects indistinguishable from missing projects", async () => {
    mocks.listProjectEstimates.mockResolvedValueOnce({ workspace: { id: "workspace-a" }, project: null, estimates: [] });

    await expect(getProjectEstimateHealthData("project-forged")).resolves.toBeNull();
    expect(mocks.getCloudflareD1Database).not.toHaveBeenCalled();
  });

  it("bounds facts and issue pages while returning no sensitive source snapshot data", async () => {
    const { database, statements } = createDatabase(Array.from({ length: 5001 }, (_, index) => row(index)));
    mocks.listProjectEstimates.mockResolvedValue(authorizedResult());
    mocks.getCloudflareD1Database.mockResolvedValue(database);

    const firstPage = await getProjectEstimateHealthData("project-a", {
      selectedEstimateIds: ["estimate-a", "forged-estimate"],
    });
    const secondPage = await getProjectEstimateHealthData("project-a", { issueCursor: "v1:100" });

    expect(firstPage?.selectedEstimateIds).toEqual(["estimate-a"]);
    expect(firstPage?.truncated).toBe(true);
    expect(firstPage?.summary.incomplete).toBe(true);
    expect(firstPage?.rowLimit).toBe(5000);
    expect(firstPage?.policy.workspace).toEqual({ revision: 3, staleDays: 30, veryStaleDays: 60 });
    expect(firstPage?.policy.categories).toEqual([{ categoryNodeId: "category-a", revision: 4, staleDays: 10, veryStaleDays: 20 }]);
    expect(firstPage?.issuePage.items).toHaveLength(100);
    expect(firstPage?.issuePage.nextCursor).toBe("v1:100");
    expect(secondPage?.issuePage.items[0]).not.toEqual(firstPage?.issuePage.items[0]);
    expect(JSON.stringify(firstPage)).not.toContain("private.example.test");
    expect(JSON.stringify(firstPage)).not.toContain("must-not-leak");
    expect(statements).toHaveLength(6);
    expect(statements.filter((statement) => statement.sql.includes("FROM estimate_row_items"))).toHaveLength(2);
    expect(statements.find((statement) => statement.sql.includes("FROM estimate_row_items"))?.sql).toContain("LIMIT ?");
  });
});
