import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  eq: vi.fn(),
  from: vi.fn(),
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
  supabaseMocks.order.mockReset();
  supabaseMocks.select.mockReset();

  supabaseMocks.from.mockReturnValue({ select: supabaseMocks.select });
  supabaseMocks.select.mockReturnValue({ eq: supabaseMocks.eq });
  supabaseMocks.eq.mockReturnValue({ order: supabaseMocks.order });
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
});
