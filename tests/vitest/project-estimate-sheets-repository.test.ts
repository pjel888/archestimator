import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryBuilder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
};

var supabaseMocks = {
  from: vi.fn(),
  rpc: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    from: supabaseMocks.from,
    rpc: supabaseMocks.rpc,
  })),
}));

function createBuilder(): QueryBuilder {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
  } satisfies QueryBuilder;
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.in.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  builder.limit.mockReturnValue(builder);
  return builder;
}

beforeEach(() => {
  supabaseMocks.from.mockReset();
  supabaseMocks.rpc.mockReset();
});

describe("project estimate sheet repository", () => {
  it("returns lightweight estimate sheets with updatedAt freshness metadata", async () => {
    const estimatesBuilder = createBuilder();
    estimatesBuilder.order.mockResolvedValue({
      data: [
        {
          id: "estimate-1",
          name: "Lobby Estimate",
          sheet_code: "EST-002",
          updated_at: "2026-06-12T08:00:00.000Z",
        },
      ],
      error: null,
    });
    supabaseMocks.from.mockReturnValue(estimatesBuilder);

    const { listProjectEstimateSheetsForProject } = await import("@/lib/repositories/project-estimate-sheets-repository");
    const result = await listProjectEstimateSheetsForProject("project-1");

    expect(supabaseMocks.from).toHaveBeenCalledWith("estimates");
    expect(estimatesBuilder.select).toHaveBeenCalledWith("id, name, sheet_code, updated_at");
    expect(estimatesBuilder.eq).toHaveBeenCalledWith("project_id", "project-1");
    expect(estimatesBuilder.order).toHaveBeenCalledWith("sheet_code", { ascending: true });
    expect(result).toEqual([
      {
        id: "estimate-1",
        name: "Lobby Estimate",
        sheetCode: "EST-002",
        updatedAt: "2026-06-12T08:00:00.000Z",
      },
    ]);
  });

  it("returns recent project sheets ordered by freshness with first-node deep links", async () => {
    const estimatesBuilder = createBuilder();
    const nodesBuilder = createBuilder();
    estimatesBuilder.limit.mockResolvedValue({
      data: [
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
          project_budget: null,
          updated_at: "2026-06-12T08:00:00.000Z",
        },
      ],
      error: null,
    });
    nodesBuilder.order.mockResolvedValue({
      data: [
        { id: "root-2", estimate_id: "estimate-2", kind: "group", parent_id: null },
        { id: "root-1", estimate_id: "estimate-1", kind: "group", parent_id: null },
        { id: "area-1", estimate_id: "estimate-1", kind: "area", parent_id: "root-1" },
      ],
      error: null,
    });
    supabaseMocks.rpc.mockResolvedValue({
      data: [
        { estimate_id: "estimate-2", node_count: 1, row_count: 2, total_cost: 98765.4, first_node_id: "root-2" },
        { estimate_id: "estimate-1", node_count: 2, row_count: 3, total_cost: 12345.6, first_node_id: "area-1" },
      ],
      error: null,
    });
    supabaseMocks.from.mockImplementation((table: string) => {
      if (table === "estimates") return estimatesBuilder;
      if (table === "estimate_nodes") return nodesBuilder;
      throw new Error(`Unexpected table ${table}`);
    });

    const { listRecentProjectEstimateSheets } = await import("@/lib/repositories/project-estimate-sheets-repository");
    const result = await listRecentProjectEstimateSheets("project-1");

    expect(estimatesBuilder.select).toHaveBeenCalledWith("id, project_id, name, sheet_code, project_budget, updated_at");
    expect(estimatesBuilder.eq).toHaveBeenCalledWith("project_id", "project-1");
    expect(estimatesBuilder.order).toHaveBeenNthCalledWith(1, "updated_at", { ascending: false, nullsFirst: false });
    expect(estimatesBuilder.order).toHaveBeenNthCalledWith(2, "id", { ascending: false });
    expect(estimatesBuilder.limit).toHaveBeenCalledWith(5);
    expect(nodesBuilder.select).toHaveBeenCalledWith("id, estimate_id, kind, parent_id");
    expect(nodesBuilder.in).toHaveBeenCalledWith("estimate_id", ["estimate-2", "estimate-1"]);
    expect(nodesBuilder.order).toHaveBeenCalledWith("sort_order", { ascending: true });
    expect(supabaseMocks.rpc).toHaveBeenCalledWith("project_estimate_list_summaries", { target_project_id: "project-1" });
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
        totalCost: 12345.6,
        projectBudget: null,
      },
    ]);
  });

  it("clamps recent sheet limits to 10 and skips node lookup when no sheets exist", async () => {
    const estimatesBuilder = createBuilder();
    estimatesBuilder.limit.mockResolvedValue({ data: [], error: null });
    supabaseMocks.from.mockReturnValue(estimatesBuilder);

    const { listRecentProjectEstimateSheets } = await import("@/lib/repositories/project-estimate-sheets-repository");
    const result = await listRecentProjectEstimateSheets("project-1", 99);

    expect(estimatesBuilder.limit).toHaveBeenCalledWith(10);
    expect(supabaseMocks.from).toHaveBeenCalledTimes(1);
    expect(supabaseMocks.rpc).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});
