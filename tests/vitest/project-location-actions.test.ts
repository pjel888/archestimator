import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  requireCurrentUserContext: vi.fn(),
}));

const workspaceRepositoryMocks = vi.hoisted(() => ({
  getCurrentWorkspaceProject: vi.fn(),
}));

const supabaseServerMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}));

const nextCacheMocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("@/lib/repositories/workspace-repository", () => workspaceRepositoryMocks);
vi.mock("@/lib/supabase/server", () => supabaseServerMocks);
vi.mock("next/cache", () => nextCacheMocks);

function formData(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

function makeMutationBuilder(result = { error: null }) {
  const builder = {
    upsert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    then: (resolve: (value: typeof result) => void) => Promise.resolve(result).then(resolve),
  };
  return builder;
}

describe("project location actions", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    authMocks.requireCurrentUserContext.mockResolvedValue({ userId: "user-1", email: "owner@example.test" });
    workspaceRepositoryMocks.getCurrentWorkspaceProject.mockResolvedValue({
      project: { id: "project-1", workspace_id: "workspace-1" },
    });
  });

  it("rejects invalid latitude and longitude before creating a Supabase write", async () => {
    const supabase = {
      rpc: vi.fn(),
      from: vi.fn(),
    };
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);

    const { saveProjectLocation } = await import("@/lib/projects/location-actions");
    const result = await saveProjectLocation({ status: "idle", message: "" }, formData({
      projectId: "project-1",
      latitude: "91",
      longitude: "181",
    }));

    expect(result.status).toBe("error");
    expect(result.fieldErrors?.latitude).toContain("between -90 and 90");
    expect(authMocks.requireCurrentUserContext).not.toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();
    expect(nextCacheMocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("saves and reloads a valid manual pin through project_locations", async () => {
    const mutationBuilder = makeMutationBuilder();
    const supabase = {
      rpc: vi.fn(async () => ({ data: true, error: null })),
      from: vi.fn((table: string) => {
        if (table === "project_locations") return mutationBuilder;
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);

    const { saveProjectLocation } = await import("@/lib/projects/location-actions");
    const result = await saveProjectLocation({ status: "idle", message: "" }, formData({
      projectId: "project-1",
      latitude: "14.5995122",
      longitude: "120.9842224",
      accuracyMeters: "8.249",
      displayLabel: "Site gate",
      addressText: "Quezon City",
    }));

    expect(supabase.rpc).toHaveBeenCalledWith("can_edit_project", { target_project_id: "project-1" });
    expect(mutationBuilder.upsert).toHaveBeenCalledWith(
      {
        project_id: "project-1",
        workspace_id: "workspace-1",
        latitude: 14.599512,
        longitude: 120.984222,
        accuracy_meters: 8.25,
        source: "manual",
        display_label: "Site gate",
        address_text: "Quezon City",
        geocoder_name: null,
        provider_place_id: null,
      },
      { onConflict: "project_id" },
    );
    expect(result).toEqual({ status: "success", message: "Project pin saved." });
    expect(nextCacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop/projects/project-1");
  });

  it("saves a Google place selection and syncs the formatted address back to the project", async () => {
    const locationMutationBuilder = makeMutationBuilder();
    const projectMutationBuilder = makeMutationBuilder();
    const supabase = {
      rpc: vi.fn(async () => ({ data: true, error: null })),
      from: vi.fn((table: string) => {
        if (table === "project_locations") return locationMutationBuilder;
        if (table === "projects") return projectMutationBuilder;
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);

    const { saveProjectLocation } = await import("@/lib/projects/location-actions");
    const result = await saveProjectLocation({ status: "idle", message: "" }, formData({
      projectId: "project-1",
      latitude: "14.676",
      longitude: "121.0437",
      displayLabel: "Quezon City",
      addressText: "Quezon City, Metro Manila, Philippines",
      source: "geocoded",
      geocoderName: "google",
      providerPlaceId: "google-place-1",
      syncProjectAddress: "1",
    }));

    expect(locationMutationBuilder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: "project-1",
        workspace_id: "workspace-1",
        latitude: 14.676,
        longitude: 121.0437,
        source: "geocoded",
        display_label: "Quezon City",
        address_text: "Quezon City, Metro Manila, Philippines",
        geocoder_name: "google",
        provider_place_id: "google-place-1",
      }),
      { onConflict: "project_id" },
    );
    expect(projectMutationBuilder.update).toHaveBeenCalledWith({ location: "Quezon City, Metro Manila, Philippines" });
    expect(projectMutationBuilder.eq).toHaveBeenCalledWith("id", "project-1");
    expect(result).toEqual({ status: "success", message: "Project pin saved." });
  });

  it("clears a saved manual pin by project id", async () => {
    const mutationBuilder = makeMutationBuilder();
    const supabase = {
      rpc: vi.fn(async () => ({ data: true, error: null })),
      from: vi.fn((table: string) => {
        if (table === "project_locations") return mutationBuilder;
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);

    const { clearProjectLocation } = await import("@/lib/projects/location-actions");
    const result = await clearProjectLocation({ status: "idle", message: "" }, formData({ projectId: "project-1" }));

    expect(mutationBuilder.delete).toHaveBeenCalled();
    expect(mutationBuilder.eq).toHaveBeenCalledWith("project_id", "project-1");
    expect(result).toEqual({ status: "success", message: "Project pin cleared." });
    expect(nextCacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop/projects/project-1");
  });
});
