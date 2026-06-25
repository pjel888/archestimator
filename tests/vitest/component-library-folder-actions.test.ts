import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
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

function createAwaitableQuery<T>(result: T) {
  return {
    then(resolve: (value: T) => unknown, reject: (reason: unknown) => unknown) {
      return Promise.resolve(result).then(resolve, reject);
    },
  };
}

function mockTopCreateSupabaseClient() {
  const rpc = vi.fn(async (name: string) => {
    if (name === "is_workspace_editor") return { data: true, error: null };
    return { data: null, error: null };
  });
  const siblingQuery = {
    ...createAwaitableQuery({
      data: [
        { id: "folder-a", sort_order: 0 },
        { id: "folder-b", sort_order: 10 },
      ],
      error: null,
    }),
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
  };
  siblingQuery.select.mockReturnValue(siblingQuery);
  siblingQuery.eq.mockReturnValue(siblingQuery);
  siblingQuery.is.mockReturnValue(siblingQuery);

  const updateQueries = [
    {
      ...createAwaitableQuery({ data: null, error: null }),
      update: vi.fn(),
      eq: vi.fn(),
    },
    {
      ...createAwaitableQuery({ data: null, error: null }),
      update: vi.fn(),
      eq: vi.fn(),
    },
  ];
  for (const query of updateQueries) {
    query.update.mockReturnValue(query);
    query.eq.mockReturnValue(query);
  }

  const insertQuery = {
    insert: vi.fn(),
    select: vi.fn(),
    single: vi.fn(async () => ({
      data: { id: "folder-new", workspace_id: "workspace-1", parent_id: null, name: "Top folder", sort_order: 0 },
      error: null,
    })),
  };
  insertQuery.insert.mockReturnValue(insertQuery);
  insertQuery.select.mockReturnValue(insertQuery);

  const queue = [siblingQuery, ...updateQueries, insertQuery];
  const from = vi.fn((table: string) => {
    if (table !== "library_folders") throw new Error(`unexpected table access: ${table}`);
    const query = queue.shift();
    if (!query) throw new Error("unexpected library_folders query");
    return query;
  });
  supabaseServerMocks.createSupabaseServerClient.mockResolvedValue({ from, rpc });
  return { from, insertQuery, rpc, siblingQuery, updateQueries };
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
  authMocks.requireAuth.mockImplementation(() => authMocks.requireCurrentUserContext());
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

  it("creates a top folder without violating the non-negative sort order constraint", async () => {
    const supabase = mockTopCreateSupabaseClient();
    const actions = await import("@/lib/component-library/actions");

    await expect(actions.createLibraryFolder(null, "Top folder", { placement: "top" })).resolves.toMatchObject({
      folder: { id: "folder-new", sort_order: 0 },
    });

    expect(supabase.siblingQuery.select).toHaveBeenCalledWith("id, sort_order");
    expect(supabase.siblingQuery.is).toHaveBeenCalledWith("parent_id", null);
    expect(supabase.updateQueries[0].update).toHaveBeenCalledWith({ sort_order: 20 });
    expect(supabase.updateQueries[0].eq).toHaveBeenCalledWith("id", "folder-b");
    expect(supabase.updateQueries[1].update).toHaveBeenCalledWith({ sort_order: 10 });
    expect(supabase.updateQueries[1].eq).toHaveBeenCalledWith("id", "folder-a");
    expect(supabase.insertQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
      name: "Top folder",
      sort_order: 0,
      workspace_id: "workspace-1",
    }));
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
