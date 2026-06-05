import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  requireCurrentUserContext: vi.fn(),
}));

const workspaceMocks = vi.hoisted(() => ({
  ensureDefaultWorkspace: vi.fn(),
}));

const supabaseServerMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("@/lib/repositories/workspace-repository", () => workspaceMocks);
vi.mock("@/lib/supabase/server", () => supabaseServerMocks);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

function mockViewerSupabaseClient() {
  const rpc = vi.fn(async (name: string) => {
    if (name === "is_workspace_editor") return { data: false, error: null };
    return { data: null, error: null };
  });
  const from = vi.fn(() => {
    throw new Error("viewer folder mutations must stop before table access");
  });
  supabaseServerMocks.createSupabaseServerClient.mockResolvedValue({ from, rpc });
  return { from, rpc };
}

function mockEditorSupabaseClient() {
  const rpc = vi.fn(async (name: string) => {
    if (name === "is_workspace_editor") return { data: true, error: null };
    if (name === "delete_library_folder") return { data: null, error: null };
    return { data: null, error: null };
  });
  const from = vi.fn(() => {
    throw new Error("editor folder delete must use the transactional RPC");
  });
  supabaseServerMocks.createSupabaseServerClient.mockResolvedValue({ from, rpc });
  return { from, rpc };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  workspaceMocks.ensureDefaultWorkspace.mockResolvedValue({
    workspace: { id: "workspace-1" },
    profile: { id: "user-1" },
  });
  authMocks.requireCurrentUserContext.mockResolvedValue({
    userId: "user-1",
    profile: { id: "user-1" },
  });
});

describe("component library folder server actions", () => {
  it("blocks workspace viewers before any direct folder mutation path", async () => {
    const supabase = mockViewerSupabaseClient();
    const actions = await import("@/lib/component-library/actions");

    await expect(actions.createLibraryFolder(null, "Viewer folder")).rejects.toThrow("Only workspace editors/admins can manage library folders.");
    await expect(actions.renameLibraryFolder("folder-1", "Viewer rename")).rejects.toThrow("Only workspace editors/admins can manage library folders.");
    await expect(actions.deleteLibraryFolder("folder-1")).rejects.toThrow("Only workspace editors/admins can manage library folders.");
    await expect(actions.reorderLibraryFolders({ updates: [{ id: "folder-1", parentId: null, sortOrder: 10 }] })).rejects.toThrow(
      "Only workspace editors/admins can manage library folders.",
    );

    expect(supabase.rpc).toHaveBeenCalledTimes(4);
    expect(supabase.rpc).toHaveBeenCalledWith("is_workspace_editor", { target_workspace_id: "workspace-1" });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("deletes folders through the transactional delete RPC", async () => {
    const supabase = mockEditorSupabaseClient();
    const actions = await import("@/lib/component-library/actions");
    const folderId = "00000000-0000-4000-8000-000000000001";

    await expect(actions.deleteLibraryFolder(folderId)).resolves.toBeUndefined();

    expect(supabase.rpc).toHaveBeenCalledWith("is_workspace_editor", { target_workspace_id: "workspace-1" });
    expect(supabase.rpc).toHaveBeenCalledWith("delete_library_folder", {
      target_workspace_id: "workspace-1",
      target_folder_id: folderId,
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
