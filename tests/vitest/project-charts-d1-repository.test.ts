import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

const workspaceRepositoryMocks = vi.hoisted(() => ({
  getCurrentWorkspaceProject: vi.fn(),
}));

vi.mock("@/lib/cloudflare/d1", () => d1Mocks);
vi.mock("@/lib/repositories/workspace-repository", () => workspaceRepositoryMocks);

type PreparedD1Statement = {
  sql: string;
  values: unknown[];
};

class FakeD1Statement {
  private values: unknown[] = [];

  constructor(
    private readonly database: FakeProjectChartsD1Database,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    this.database.prepared.push({ sql: this.sql, values });
    return this;
  }

  async first() {
    throw new Error(`Unexpected D1 first query: ${this.sql}`);
  }

  async all() {
    if (this.sql.includes("FROM estimates")) return { results: this.database.estimates };
    if (this.sql.includes("FROM estimate_row_items")) return { results: this.database.rowItems };
    if (this.sql.includes("FROM estimate_nodes")) return { results: this.database.nodes };
    if (this.sql.includes("FROM component_category_nodes")) return { results: this.database.categoryNodes };
    if (this.sql.includes("FROM component_suppliers")) return { results: this.database.suppliers };
    throw new Error(`Unexpected D1 all query: ${this.sql}`);
  }

  async run() {
    throw new Error(`Unexpected D1 run query: ${this.sql}`);
  }
}

class FakeProjectChartsD1Database {
  prepared: PreparedD1Statement[] = [];
  estimates: unknown[] = [];
  rowItems: unknown[] = [];
  nodes: unknown[] = [];
  categoryNodes: unknown[] = [];
  suppliers: unknown[] = [];

  prepare(sql: string) {
    return new FakeD1Statement(this, sql);
  }
}

function findPrepared(database: FakeProjectChartsD1Database, pattern: RegExp) {
  const statement = database.prepared.find((entry) => pattern.test(entry.sql));
  if (!statement) throw new Error(`No prepared D1 statement matched ${pattern}`);
  return statement;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("project charts D1 repository", () => {
  it("loads chart facts from Cloudflare D1 and returns aggregated series", async () => {
    const database = new FakeProjectChartsD1Database();
    database.estimates = [
      {
        id: "estimate-1",
        name: "Schematic Estimate",
        sheet_code: "SD-001",
        updated_at: "2026-06-20T10:00:00.000Z",
      },
    ];
    database.nodes = [
      {
        id: "area-1",
        estimate_id: "estimate-1",
        parent_id: null,
        kind: "area",
        name: "Lobby",
        sort_order: 1,
      },
    ];
    database.rowItems = [
      {
        id: "row-1",
        estimate_id: "estimate-1",
        node_id: "area-1",
        source_snapshot_json: JSON.stringify({
          categoryNodeId: "category-1",
          supplierId: "supplier-1",
          supplier: "Acme Supply",
        }),
        metadata_json: JSON.stringify({ laborUnitCost: 20 }),
        quantity: 2,
        quantity_base: null,
        quantity_contingency_amount: null,
        unit_cost: 10,
        contingency_percentage: 0,
        adjustment_percentage: 0,
        misc_cost: 5,
      },
    ];
    database.categoryNodes = [
      {
        id: "category-1",
        parent_id: null,
        node_type: "category",
        label: "Finishes",
        sort_order: 1,
      },
    ];
    database.suppliers = [
      {
        id: "supplier-1",
        name: "Acme Supply",
        normalized_name: "acme supply",
        sort_order: 1,
      },
    ];

    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    workspaceRepositoryMocks.getCurrentWorkspaceProject.mockResolvedValue({
      workspace: { id: "workspace-1" },
      project: {
        id: "project-1",
        name: "Luna Heights",
        currency_code: "PHP",
      },
    });

    const { getProjectChartsData } = await import("@/lib/repositories/project-charts-repository");
    const result = await getProjectChartsData("project-1");

    expect(findPrepared(database, /FROM estimates/).values).toEqual(["project-1", 101]);
    expect(findPrepared(database, /FROM estimate_row_items/).values).toEqual(["estimate-1", 5001]);
    expect(findPrepared(database, /FROM component_suppliers/).values).toEqual(["workspace-1", 1001]);
    expect(result?.estimateOptions).toEqual([
      {
        id: "estimate-1",
        name: "Schematic Estimate",
        sheetCode: "SD-001",
        currencyCode: "PHP",
        updatedAt: "2026-06-20T10:00:00.000Z",
        rowCount: 1,
        totalCost: 65,
      },
    ]);
    expect(result?.seriesByEstimateId["estimate-1"]?.space.total).toBe(65);
    expect(result?.seriesByEstimateId["estimate-1"]?.category.allBuckets[0]?.label).toBe("Finishes");
    expect(result?.seriesByEstimateId["estimate-1"]?.supplier.allBuckets[0]?.label).toBe("Acme Supply");
  });

  it("keeps project charts off Supabase clients", () => {
    const source = readFileSync("src/lib/repositories/project-charts-repository.ts", "utf8");
    expect(source).not.toMatch(/createSupabaseServerClient|@\/lib\/supabase/);
  });
});
