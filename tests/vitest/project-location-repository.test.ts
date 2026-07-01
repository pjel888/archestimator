import { beforeEach, describe, expect, it, vi } from "vitest";

const workspaceRepositoryMocks = vi.hoisted(() => ({
  getCurrentWorkspaceProject: vi.fn(),
}));

const cloudflareD1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

vi.mock("@/lib/repositories/workspace-repository", () => workspaceRepositoryMocks);
vi.mock("@/lib/cloudflare/d1", () => cloudflareD1Mocks);

function createD1LocationDatabase(result: { row?: unknown; error?: Error & { code?: string } }) {
  const statement = {
    bind: vi.fn(() => statement),
    first: vi.fn(async () => {
      if (result.error) throw result.error;
      return result.row ?? null;
    }),
  };
  return {
    statement,
    database: {
      prepare: vi.fn(() => statement),
    },
  };
}

describe("project location repository", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    workspaceRepositoryMocks.getCurrentWorkspaceProject.mockResolvedValue({
      project: { id: "project-1", workspace_id: "workspace-1" },
    });
  });

  it("returns null when the D1 project location table is not applied", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { database, statement } = createD1LocationDatabase({
      error: Object.assign(new Error("no such table: project_locations"), { code: "SQLITE_ERROR" }),
    });
    cloudflareD1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { getProjectLocation } = await import("@/lib/repositories/project-location-repository");
    const result = await getProjectLocation("project-1");

    expect(statement.bind).toHaveBeenCalledWith("project-1");
    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith("[project-dashboard] Project location schema is unavailable; apply migration 20260619105250.");
    warnSpy.mockRestore();
  });

  it("returns a normalized project location from Cloudflare D1", async () => {
    const { database, statement } = createD1LocationDatabase({
      row: {
        id: "location-1",
        project_id: "project-1",
        latitude: "14.599512",
        longitude: "120.984222",
        accuracy_meters: "8.25",
        source: "geocoded",
        display_label: "Site gate",
        address_text: "Quezon City",
        geocoder_name: "google",
        provider_place_id: "google-place-1",
        updated_at: "2026-06-30T00:00:00.000Z",
      },
    });
    cloudflareD1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { getProjectLocation } = await import("@/lib/repositories/project-location-repository");
    await expect(getProjectLocation("project-1")).resolves.toEqual({
      accuracyMeters: 8.25,
      addressText: "Quezon City",
      displayLabel: "Site gate",
      geocoderName: "google",
      id: "location-1",
      latitude: 14.599512,
      longitude: 120.984222,
      projectId: "project-1",
      providerPlaceId: "google-place-1",
      source: "geocoded",
      updatedAt: "2026-06-30T00:00:00.000Z",
    });
    expect(database.prepare).toHaveBeenCalledWith(expect.stringContaining("FROM project_locations"));
    expect(statement.bind).toHaveBeenCalledWith("project-1");
  });

  it("rethrows unrelated location schema errors", async () => {
    const { database } = createD1LocationDatabase({
      error: Object.assign(new Error("column project_locations.geohash does not exist"), { code: "42703" }),
    });
    cloudflareD1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { getProjectLocation } = await import("@/lib/repositories/project-location-repository");
    await expect(getProjectLocation("project-1")).rejects.toThrow("column project_locations.geohash does not exist");
  });
});
