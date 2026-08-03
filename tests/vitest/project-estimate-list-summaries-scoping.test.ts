import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  requireCurrentUserContext: vi.fn(),
}));

const accessMocks = vi.hoisted(() => ({
  canAccessWholeProjectInD1: vi.fn(),
}));

vi.mock("@/lib/cloudflare/d1", () => d1Mocks);
vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("@/lib/authz/d1-access", () => accessMocks);

type PreparedD1Statement = {
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

  async all() {
    if (this.sql.includes("FROM estimates")) return { results: this.database.estimates };
    if (this.sql.includes("FROM estimate_nodes")) return { results: [] };
    if (this.sql.includes("FROM estimate_row_items")) return { results: [] };
    throw new Error(`Unexpected D1 all query: ${this.sql}`);
  }
}

class FakeD1Database {
  prepared: PreparedD1Statement[] = [];
  estimates = [
    {
      id: "estimate-2",
      project_id: "project-scoping-1",
      name: "Site Works",
      sheet_code: null,
      project_budget: 120000,
      updated_at: "2026-06-13T08:00:00.000Z",
    },
    {
      id: "estimate-1",
      project_id: "project-scoping-1",
      name: "Lobby Estimate",
      sheet_code: "EST-002",
      project_budget: null,
      updated_at: "2026-06-12T08:00:00.000Z",
    },
  ];

  prepare(sql: string) {
    return new FakeD1Statement(this, sql);
  }
}

function findPrepared(database: FakeD1Database, pattern: RegExp) {
  const statement = database.prepared.find((entry) => pattern.test(entry.sql));
  if (!statement) throw new Error(`No prepared D1 statement matched ${pattern}`);
  return statement;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  authMocks.requireCurrentUserContext.mockResolvedValue({ userId: "user-1", role: "member" });
  accessMocks.canAccessWholeProjectInD1.mockResolvedValue(true);
});

describe("project estimate summary D1 scoping guard", () => {
  it("scopes the estimate selection, node lookup, and row totals to the same project id", async () => {
    const projectId = "project-scoping-1";
    const database = new FakeD1Database();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { listRecentProjectEstimateSheets } = await import(
      "@/lib/repositories/project-estimate-sheets-repository"
    );
    await listRecentProjectEstimateSheets(projectId);

    const estimatesQuery = findPrepared(database, /FROM estimates/);
    expect(estimatesQuery.sql).toContain("WHERE project_id = ?");
    expect(estimatesQuery.values).toEqual([projectId, 5]);

    const nodesQuery = findPrepared(database, /FROM estimate_nodes/);
    expect(nodesQuery.sql).toContain("INNER JOIN estimates estimate ON estimate.id = node.estimate_id");
    expect(nodesQuery.sql).toContain("WHERE estimate.project_id = ?");
    expect(nodesQuery.sql).toContain("node.estimate_id IN (?, ?)");
    expect(nodesQuery.values).toEqual([projectId, "estimate-2", "estimate-1"]);

    const rowTotalsQuery = findPrepared(database, /FROM estimate_row_items/);
    expect(rowTotalsQuery.sql).toContain("INNER JOIN estimates estimate ON estimate.id = row_item.estimate_id");
    expect(rowTotalsQuery.sql).toContain("WHERE estimate.project_id = ?");
    expect(rowTotalsQuery.sql).toContain("row_item.estimate_id IN (?, ?)");
    expect(rowTotalsQuery.values).toEqual([projectId, "estimate-2", "estimate-1"]);
  });

  it("never runs the summary fan-out without a non-empty project id bind", async () => {
    const projectId = "project-scoping-2";
    const database = new FakeD1Database();
    database.estimates = [
      {
        id: "estimate-9",
        project_id: projectId,
        name: "Only Sheet",
        sheet_code: "EST-009",
        project_budget: null,
        updated_at: "2026-06-14T08:00:00.000Z",
      },
    ];
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { listRecentProjectEstimateSheets } = await import(
      "@/lib/repositories/project-estimate-sheets-repository"
    );
    await listRecentProjectEstimateSheets(projectId);

    for (const statement of database.prepared) {
      expect(statement.values[0]).toBe(projectId);
      expect(typeof statement.values[0]).toBe("string");
      expect((statement.values[0] as string).length).toBeGreaterThan(0);
    }
  });

  it("does not keep the old Supabase RPC call site in the repository", () => {
    const source = readFileSync("src/lib/repositories/project-estimate-sheets-repository.ts", "utf8");
    expect(source).toContain("getCloudflareD1Database");
    expect(source).toContain("computeEstimateTotals");
    expect(source).not.toContain("computeEstimateRowLineTotal");
    expect(source).not.toContain(["createSupabase", "ServerClient"].join(""));
    expect(source).not.toContain(["project_estimate_list", "_summaries_for_estimates"].join(""));
    expect(source).not.toContain([".", "rpc("].join(""));
  });
});
