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

  async first() {
    if (this.sql.includes("COUNT(*) AS count")) return { count: this.database.count };
    throw new Error(`Unexpected D1 first query: ${this.sql}`);
  }

  async all() {
    if (this.sql.includes("FROM estimate_sheet_members")) {
      return { results: this.database.accessibleEstimateIds.map((estimate_id) => ({ estimate_id })) };
    }
    if (this.sql.includes("FROM estimates")) return { results: this.database.estimates };
    if (this.sql.includes("FROM estimate_nodes")) return { results: this.database.nodes };
    if (this.sql.includes("FROM estimate_row_items")) return { results: this.database.rowItems };
    throw new Error(`Unexpected D1 all query: ${this.sql}`);
  }
}

class FakeD1Database {
  prepared: PreparedD1Statement[] = [];
  estimates: unknown[] = [];
  nodes: unknown[] = [];
  rowItems: unknown[] = [];
  accessibleEstimateIds: string[] = [];
  count = 0;

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

describe("project estimate sheet repository", () => {
  it("returns lightweight estimate sheets with updatedAt freshness metadata", async () => {
    const database = new FakeD1Database();
    database.estimates = [
      {
        id: "estimate-1",
        name: "Lobby Estimate",
        sheet_code: "EST-002",
        updated_at: "2026-06-12T08:00:00.000Z",
      },
    ];
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { listProjectEstimateSheetsForProject } = await import("@/lib/repositories/project-estimate-sheets-repository");
    const result = await listProjectEstimateSheetsForProject("project-1");

    const query = findPrepared(database, /FROM estimates/);
    expect(query.sql).toContain("WHERE project_id = ?");
    expect(query.sql).toContain("ORDER BY sheet_code ASC, id ASC");
    expect(query.values).toEqual(["project-1"]);
    expect(result).toEqual([
      {
        id: "estimate-1",
        name: "Lobby Estimate",
        sheetCode: "EST-002",
        updatedAt: "2026-06-12T08:00:00.000Z",
      },
    ]);
  });

  it("counts project estimate sheets without fetching list rows", async () => {
    const database = new FakeD1Database();
    database.count = 7;
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { countProjectEstimateSheetsForProject } = await import("@/lib/repositories/project-estimate-sheets-repository");
    const result = await countProjectEstimateSheetsForProject("project-1");

    const query = findPrepared(database, /COUNT\(\*\) AS count/);
    expect(query.sql).toContain("FROM estimates WHERE project_id = ?");
    expect(query.values).toEqual(["project-1"]);
    expect(result).toBe(7);
  });

  it("returns recent project sheets ordered by freshness with first-node deep links", async () => {
    const database = new FakeD1Database();
    database.estimates = [
      {
        id: "estimate-2",
        project_id: "project-1",
        name: "Site Works",
        sheet_code: null,
        project_budget: 120000,
        updated_at: "2026-06-13T08:00:00.000Z",
      },
      {
        id: "estimate-1",
        project_id: "project-1",
        name: "Lobby Estimate",
        sheet_code: "EST-002",
        currency_code: "PHP",
        project_budget: null,
        updated_at: "2026-06-12T08:00:00.000Z",
      },
    ];
    database.nodes = [
      { id: "root-2", estimate_id: "estimate-2", kind: "group", parent_id: null },
      { id: "root-1", estimate_id: "estimate-1", kind: "group", parent_id: null },
      { id: "area-1", estimate_id: "estimate-1", kind: "area", parent_id: "root-1" },
    ];
    database.rowItems = [
      {
        estimate_id: "estimate-2",
        quantity: 10,
        quantity_base: null,
        quantity_contingency_amount: null,
        unit_cost: 9000,
        contingency_percentage: 5,
        adjustment_percentage: 5,
        misc_cost: 4265.4,
      },
      {
        estimate_id: "estimate-1",
        quantity: 12,
        quantity_base: null,
        quantity_contingency_amount: null,
        unit_cost: 1000,
        contingency_percentage: 0,
        adjustment_percentage: 0,
        misc_cost: 345.6,
      },
      {
        estimate_id: "estimate-1",
        quantity: 1,
        quantity_base: null,
        quantity_contingency_amount: null,
        unit_cost: 0.335,
        contingency_percentage: 0,
        adjustment_percentage: 0,
        misc_cost: 0,
      },
      {
        estimate_id: "estimate-1",
        quantity: 1,
        quantity_base: null,
        quantity_contingency_amount: null,
        unit_cost: 0.335,
        contingency_percentage: 0,
        adjustment_percentage: 0,
        misc_cost: 0,
      },
    ];
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { listRecentProjectEstimateSheets } = await import("@/lib/repositories/project-estimate-sheets-repository");
    const result = await listRecentProjectEstimateSheets("project-1");

    const estimatesQuery = findPrepared(database, /ORDER BY updated_at DESC, id DESC/);
    expect(estimatesQuery.values).toEqual(["project-1", 5]);
    const nodesQuery = findPrepared(database, /FROM estimate_nodes/);
    expect(nodesQuery.sql).toContain("INNER JOIN estimates estimate ON estimate.id = node.estimate_id");
    expect(nodesQuery.sql).toContain("WHERE estimate.project_id = ?");
    expect(nodesQuery.sql).toContain("node.estimate_id IN (?, ?)");
    expect(nodesQuery.values).toEqual(["project-1", "estimate-2", "estimate-1"]);
    const rowItemsQuery = findPrepared(database, /FROM estimate_row_items/);
    expect(rowItemsQuery.sql).toContain("WHERE estimate.project_id = ?");
    expect(rowItemsQuery.sql).toContain("row_item.estimate_id IN (?, ?)");
    expect(rowItemsQuery.values).toEqual(["project-1", "estimate-2", "estimate-1"]);
    expect(result).toEqual([
      {
        id: "estimate-2",
        projectId: "project-1",
        name: "Site Works",
        sheetCode: null,
        updatedAt: "2026-06-13T08:00:00.000Z",
        firstNodeId: "root-2",
        totalCost: 98765.4,
        projectBudget: 120000,
      },
      {
        id: "estimate-1",
        projectId: "project-1",
        name: "Lobby Estimate",
        sheetCode: "EST-002",
        updatedAt: "2026-06-12T08:00:00.000Z",
        firstNodeId: "area-1",
        totalCost: 12346.28,
        projectBudget: null,
      },
    ]);
  });

  it("clamps recent sheet limits to 10 and skips node lookup when no sheets exist", async () => {
    const database = new FakeD1Database();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { listRecentProjectEstimateSheets } = await import("@/lib/repositories/project-estimate-sheets-repository");
    const result = await listRecentProjectEstimateSheets("project-1", 99);

    const estimatesQuery = findPrepared(database, /ORDER BY updated_at DESC, id DESC/);
    expect(estimatesQuery.values).toEqual(["project-1", 10]);
    expect(database.prepared).toHaveLength(1);
    expect(result).toEqual([]);
  });

  it("applies bounded list limits in D1 when requested", async () => {
    const database = new FakeD1Database();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { listProjectEstimateSheetsForProject } = await import("@/lib/repositories/project-estimate-sheets-repository");
    await listProjectEstimateSheetsForProject("project-1", { limit: 3 });

    const query = findPrepared(database, /ORDER BY sheet_code ASC, id ASC/);
    expect(query.sql).toContain("LIMIT ?");
    expect(query.values).toEqual(["project-1", 3]);
  });

  it("selects and counts only direct sheet grants for a sheet-only collaborator", async () => {
    const database = new FakeD1Database();
    database.accessibleEstimateIds = ["estimate-allowed"];
    database.estimates = [{
      id: "estimate-allowed",
      name: "Allowed estimate",
      sheet_code: "EST-001",
      updated_at: "2026-07-11T00:00:00.000Z",
    }];
    database.count = 1;
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    accessMocks.canAccessWholeProjectInD1.mockResolvedValue(false);

    const { countProjectEstimateSheetsForProject, listProjectEstimateSheetsForProject } = await import(
      "@/lib/repositories/project-estimate-sheets-repository",
    );
    await expect(listProjectEstimateSheetsForProject("project-1")).resolves.toHaveLength(1);
    await expect(countProjectEstimateSheetsForProject("project-1")).resolves.toBe(1);

    const estimateQueries = database.prepared.filter((entry) => entry.sql.includes("FROM estimates"));
    expect(estimateQueries).toHaveLength(2);
    for (const query of estimateQueries) {
      expect(query.sql).toContain("AND id IN (?)");
      expect(query.values).toEqual(["project-1", "estimate-allowed"]);
    }
    expect(accessMocks.canAccessWholeProjectInD1).toHaveBeenCalledWith(
      database,
      "project-1",
      { userId: "user-1", role: "member" },
    );
  });

  it("limits recent sheet cards to direct sheet grants for a sheet-only collaborator", async () => {
    const database = new FakeD1Database();
    database.accessibleEstimateIds = ["estimate-allowed"];
    database.estimates = [{
      id: "estimate-allowed",
      project_id: "project-1",
      name: "Allowed estimate",
      sheet_code: "EST-001",
      project_budget: null,
      updated_at: "2026-07-11T00:00:00.000Z",
    }];
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    accessMocks.canAccessWholeProjectInD1.mockResolvedValue(false);

    const { listRecentProjectEstimateSheets } = await import("@/lib/repositories/project-estimate-sheets-repository");
    await expect(listRecentProjectEstimateSheets("project-1")).resolves.toHaveLength(1);

    const estimatesQuery = findPrepared(database, /ORDER BY updated_at DESC, id DESC/);
    expect(estimatesQuery.sql).toContain("AND id IN (?)");
    expect(estimatesQuery.values).toEqual(["project-1", "estimate-allowed", 5]);
  });
});
