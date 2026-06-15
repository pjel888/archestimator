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

function createQueryResult(data: Record<string, unknown> | null) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    update: vi.fn(),
    maybeSingle: vi.fn(async () => ({ data, error: null })),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.update.mockReturnValue(query);
  return query;
}

function mockComponentMoveSupabaseClient() {
  const rpc = vi.fn(async (name: string) => {
    if (name === "is_workspace_editor") return { data: true, error: null };
    return { data: null, error: null };
  });
  const folderQuery = createQueryResult({ id: "00000000-0000-4000-8000-000000000001" });
  const componentQuery = createQueryResult({ id: "00000000-0000-4000-8000-000000000002" });
  const from = vi.fn((table: string) => {
    if (table === "library_folders") return folderQuery;
    if (table === "cost_library_items") return componentQuery;
    throw new Error(`unexpected table access: ${table}`);
  });
  supabaseServerMocks.createSupabaseServerClient.mockResolvedValue({ from, rpc });
  return { from, rpc, folderQuery, componentQuery };
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
    await expect(
      actions.moveCostLibraryComponentToFolder({
        itemId: "00000000-0000-4000-8000-000000000002",
        libraryFolderId: "00000000-0000-4000-8000-000000000001",
      }),
    ).rejects.toThrow("Only workspace editors/admins can manage library folders.");

    expect(supabase.rpc).toHaveBeenCalledTimes(5);
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

  it("moves a component by updating only its library folder", async () => {
    const supabase = mockComponentMoveSupabaseClient();
    const actions = await import("@/lib/component-library/actions");
    const folderId = "00000000-0000-4000-8000-000000000001";
    const itemId = "00000000-0000-4000-8000-000000000002";

    await expect(actions.moveCostLibraryComponentToFolder({ itemId, libraryFolderId: folderId })).resolves.toBeUndefined();

    expect(supabase.rpc).toHaveBeenCalledWith("is_workspace_editor", { target_workspace_id: "workspace-1" });
    expect(supabase.from).toHaveBeenCalledWith("library_folders");
    expect(supabase.folderQuery.select).toHaveBeenCalledWith("id");
    expect(supabase.folderQuery.eq).toHaveBeenCalledWith("id", folderId);
    expect(supabase.folderQuery.eq).toHaveBeenCalledWith("workspace_id", "workspace-1");
    expect(supabase.from).toHaveBeenCalledWith("cost_library_items");
    expect(supabase.componentQuery.update).toHaveBeenCalledWith({ library_folder_id: folderId });
    expect(supabase.componentQuery.eq).toHaveBeenCalledWith("id", itemId);
    expect(supabase.componentQuery.eq).toHaveBeenCalledWith("workspace_id", "workspace-1");
    expect(supabase.componentQuery.select).toHaveBeenCalledWith("id");
  });
});

describe("estimate template server action authorization", () => {
  const templateId = "00000000-0000-4000-8000-000000000011";
  const estimateId = "00000000-0000-4000-8000-000000000012";
  const sourceNodeId = "00000000-0000-4000-8000-000000000013";

  it("blocks workspace viewers before any template mutation path", async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === "is_workspace_editor") return { data: false, error: null };
      return { data: null, error: null };
    });
    const from = vi.fn(() => {
      throw new Error("viewer template mutations must stop before table access");
    });
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue({ from, rpc });
    const actions = await import("@/lib/component-library/actions");

    await expect(
      actions.createEstimateTemplateFromEstimateNode({
        projectId: "project-1",
        estimateId,
        sourceNodeId,
        name: "Viewer copy",
      }),
    ).rejects.toThrow("Only workspace editors/admins can manage estimate templates.");
    await expect(actions.renameEstimateTemplate({ templateId, name: "Viewer rename" })).rejects.toThrow(
      "Only workspace editors/admins can manage estimate templates.",
    );
    await expect(actions.deleteEstimateTemplate({ templateId })).rejects.toThrow(
      "Only workspace editors/admins can manage estimate templates.",
    );

    expect(rpc).toHaveBeenCalledTimes(3);
    expect(rpc).toHaveBeenCalledWith("is_workspace_editor", { target_workspace_id: "workspace-1" });
    expect(rpc).not.toHaveBeenCalledWith("can_edit_estimate", expect.anything());
    expect(from).not.toHaveBeenCalled();
  });

  it("requires edit access to the source estimate before saving an estimate node as a template", async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === "is_workspace_editor") return { data: true, error: null };
      if (name === "can_edit_estimate") return { data: false, error: null };
      return { data: null, error: null };
    });
    const from = vi.fn(() => {
      throw new Error("read-only estimate template save must stop before table access");
    });
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue({ from, rpc });
    const actions = await import("@/lib/component-library/actions");

    await expect(
      actions.createEstimateTemplateFromEstimateNode({
        projectId: "project-1",
        estimateId,
        sourceNodeId,
        name: "Read-only estimate copy",
      }),
    ).rejects.toThrow("Estimate edit access is required to save estimate templates.");

    expect(rpc).toHaveBeenCalledWith("is_workspace_editor", { target_workspace_id: "workspace-1" });
    expect(rpc).toHaveBeenCalledWith("can_edit_estimate", { target_estimate_id: estimateId });
    expect(from).not.toHaveBeenCalled();
  });
});
