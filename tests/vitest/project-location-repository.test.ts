import { beforeEach, describe, expect, it, vi } from "vitest";

const workspaceRepositoryMocks = vi.hoisted(() => ({
  getCurrentWorkspaceProject: vi.fn(),
}));

const supabaseServerMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/repositories/workspace-repository", () => workspaceRepositoryMocks);
vi.mock("@/lib/supabase/server", () => supabaseServerMocks);

function createLocationQuery(result: { data: unknown; error: (Error & { code?: string }) | null }) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result),
  };
  return builder;
}

describe("project location repository", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    workspaceRepositoryMocks.getCurrentWorkspaceProject.mockResolvedValue({
      project: { id: "project-1", workspace_id: "workspace-1" },
    });
  });

  it("returns null when the project location migration is not applied", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const locationQuery = createLocationQuery({
      data: null,
      error: Object.assign(new Error('relation "public.project_locations" does not exist'), { code: "42P01" }),
    });
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "project_locations") return locationQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);

    const { getProjectLocation } = await import("@/lib/repositories/project-location-repository");
    const result = await getProjectLocation("project-1");

    expect(locationQuery.eq).toHaveBeenCalledWith("project_id", "project-1");
    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith("[project-dashboard] Project location schema is unavailable; apply migration 20260619105250.");
    warnSpy.mockRestore();
  });

  it("rethrows unrelated location schema errors", async () => {
    const locationQuery = createLocationQuery({
      data: null,
      error: Object.assign(new Error("column project_locations.geohash does not exist"), { code: "42703" }),
    });
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "project_locations") return locationQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);

    const { getProjectLocation } = await import("@/lib/repositories/project-location-repository");
    await expect(getProjectLocation("project-1")).rejects.toThrow("column project_locations.geohash does not exist");
  });
});
