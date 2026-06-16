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
});
