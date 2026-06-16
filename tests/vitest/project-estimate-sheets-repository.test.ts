import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  eq: vi.fn(),
  from: vi.fn(),
  ilike: vi.fn(),
  limit: vi.fn(),
  order: vi.fn(),
  select: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    from: supabaseMocks.from,
  })),
}));

beforeEach(() => {
  supabaseMocks.eq.mockReset();
  supabaseMocks.from.mockReset();
  supabaseMocks.ilike.mockReset();
  supabaseMocks.limit.mockReset();
  supabaseMocks.order.mockReset();
  supabaseMocks.select.mockReset();

  supabaseMocks.from.mockReturnValue({ select: supabaseMocks.select });
  supabaseMocks.select.mockReturnValue({ eq: supabaseMocks.eq });
  supabaseMocks.eq.mockReturnValue({ ilike: supabaseMocks.ilike, order: supabaseMocks.order });
  supabaseMocks.ilike.mockReturnValue({ order: supabaseMocks.order });
  supabaseMocks.order.mockReturnValue({ limit: supabaseMocks.limit });
});

describe("project estimate sheet repository", () => {
  it("returns lightweight estimate sheets with updatedAt freshness metadata", async () => {
    supabaseMocks.order.mockResolvedValue({
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

    const { listProjectEstimateSheetsForProject } = await import("@/lib/repositories/project-estimate-sheets-repository");
    const result = await listProjectEstimateSheetsForProject("project-1");

    expect(supabaseMocks.from).toHaveBeenCalledWith("estimates");
    expect(supabaseMocks.select).toHaveBeenCalledWith("id, name, sheet_code, updated_at");
    expect(supabaseMocks.eq).toHaveBeenCalledWith("project_id", "project-1");
    expect(supabaseMocks.order).toHaveBeenCalledWith("sheet_code", { ascending: true });
    expect(result).toEqual([
      {
        id: "estimate-1",
        name: "Lobby Estimate",
        sheetCode: "EST-002",
        updatedAt: "2026-06-12T08:00:00.000Z",
      },
    ]);
  });

  it("searches estimate names and sheet codes with raw and normalized patterns before applying the limit", async () => {
    supabaseMocks.limit.mockResolvedValue({
      data: [],
      error: null,
    });

    const { listProjectEstimateSheetsForProject } = await import("@/lib/repositories/project-estimate-sheets-repository");
    await listProjectEstimateSheetsForProject("project-1", {
      limit: 100,
      search: "Smith, LLC",
    });

    expect(supabaseMocks.ilike).toHaveBeenCalledWith("name", "%Smith, LLC%");
    expect(supabaseMocks.ilike).toHaveBeenCalledWith("sheet_code", "%Smith, LLC%");
    expect(supabaseMocks.ilike).toHaveBeenCalledWith("name", "%Smith LLC%");
    expect(supabaseMocks.ilike).toHaveBeenCalledWith("sheet_code", "%Smith LLC%");
    expect(supabaseMocks.limit).toHaveBeenCalledWith(100);
  });

  it("keeps search results bounded after merging raw and normalized queries", async () => {
    supabaseMocks.limit
      .mockResolvedValueOnce({
        data: [
          {
            id: "estimate-1",
            name: "Smith, LLC Scope",
            sheet_code: "EST-001",
            updated_at: "2026-06-12T08:00:00.000Z",
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: "estimate-2",
            name: "Roofing",
            sheet_code: "Smith, LLC",
            updated_at: "2026-06-12T09:00:00.000Z",
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: "estimate-3",
            name: "Smith LLC Scope",
            sheet_code: "EST-003",
            updated_at: "2026-06-12T10:00:00.000Z",
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: "estimate-4",
            name: "Backup",
            sheet_code: "Smith LLC",
            updated_at: "2026-06-12T11:00:00.000Z",
          },
        ],
        error: null,
      });

    const { listProjectEstimateSheetsForProject } = await import("@/lib/repositories/project-estimate-sheets-repository");
    const result = await listProjectEstimateSheetsForProject("project-1", {
      limit: 2,
      search: "Smith, LLC",
    });

    expect(result.map((estimate) => estimate.id)).toEqual(["estimate-1", "estimate-2"]);
    expect(supabaseMocks.limit).toHaveBeenCalledTimes(4);
    expect(supabaseMocks.limit).toHaveBeenCalledWith(2);
  });

  it("preserves sheet-code matches when name matches reach the search cap", async () => {
    supabaseMocks.limit
      .mockResolvedValueOnce({
        data: [
          {
            id: "name-estimate-1",
            name: "Unit 01 Scope 1",
            sheet_code: "A-001",
            updated_at: "2026-06-12T08:00:00.000Z",
          },
          {
            id: "name-estimate-2",
            name: "Unit 01 Scope 2",
            sheet_code: "A-002",
            updated_at: "2026-06-12T09:00:00.000Z",
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: "sheet-code-estimate",
            name: "Mechanical Scope",
            sheet_code: "01",
            updated_at: "2026-06-12T10:00:00.000Z",
          },
        ],
        error: null,
      });

    const { listProjectEstimateSheetsForProject } = await import("@/lib/repositories/project-estimate-sheets-repository");
    const result = await listProjectEstimateSheetsForProject("project-1", {
      limit: 2,
      search: "01",
    });

    expect(result.map((estimate) => estimate.id)).toEqual([
      "name-estimate-1",
      "sheet-code-estimate",
    ]);
  });
});
