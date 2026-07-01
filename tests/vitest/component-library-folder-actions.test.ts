import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  requireCurrentUserContext: vi.fn(),
}));

const workspaceMocks = vi.hoisted(() => ({
  ensureDefaultWorkspace: vi.fn(),
}));

const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

const authzMocks = vi.hoisted(() => ({
  canEditEstimateInD1: vi.fn(),
  isWorkspaceEditorInD1: vi.fn(),
  isWorkspaceMemberInD1: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("@/lib/repositories/workspace-repository", () => workspaceMocks);
vi.mock("@/lib/cloudflare/d1", () => d1Mocks);
vi.mock("@/lib/authz/d1-access", () => authzMocks);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const WORKSPACE_ID = "workspace-1";
const USER_ID = "user-1";
const FOLDER_ID = "00000000-0000-4000-8000-000000000001";
const ITEM_ID = "00000000-0000-4000-8000-000000000002";

function createD1Fixture(options: {
  firstResults?: unknown[];
  allResults?: unknown[][];
} = {}) {
  const firstResults = [...(options.firstResults ?? [])];
  const allResults = [...(options.allResults ?? [])];
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  const database = {
    prepare: vi.fn((sql: string) => ({
      bind: vi.fn((...values: unknown[]) => {
        statements.push({ sql, values });
        return {
          first: vi.fn(async () => firstResults.shift() ?? null),
          all: vi.fn(async () => ({ success: true, results: allResults.shift() ?? [] })),
          run: vi.fn(async () => ({ success: true, meta: { changes: 1 } })),
        };
      }),
    })),
    statements,
  };
  d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
  return database;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  workspaceMocks.ensureDefaultWorkspace.mockResolvedValue({
    workspace: { id: WORKSPACE_ID },
    profile: { id: USER_ID },
  });
  authMocks.requireCurrentUserContext.mockResolvedValue({
    userId: USER_ID,
    profile: { id: USER_ID },
  });
  authzMocks.isWorkspaceEditorInD1.mockResolvedValue(true);
  authzMocks.canEditEstimateInD1.mockResolvedValue(true);
  authzMocks.isWorkspaceMemberInD1.mockResolvedValue(true);
});

describe("component library folder server actions", () => {
  it("blocks workspace viewers before any direct folder mutation path", async () => {
    const d1 = createD1Fixture();
    authzMocks.isWorkspaceEditorInD1.mockResolvedValue(false);
    const actions = await import("@/lib/component-library/actions");

    await expect(actions.createLibraryFolder(null, "Viewer folder")).rejects.toThrow("Only workspace editors/admins can manage library folders.");
    await expect(actions.renameLibraryFolder("folder-1", "Viewer rename")).rejects.toThrow("Only workspace editors/admins can manage library folders.");
    await expect(actions.deleteLibraryFolder("folder-1")).rejects.toThrow("Only workspace editors/admins can manage library folders.");
    await expect(actions.reorderLibraryFolders({ updates: [{ id: "folder-1", parentId: null, sortOrder: 10 }] })).rejects.toThrow(
      "Only workspace editors/admins can manage library folders.",
    );
    await expect(
      actions.moveCostLibraryComponentToFolder({
        itemId: ITEM_ID,
        libraryFolderId: FOLDER_ID,
      }),
    ).rejects.toThrow("Only workspace editors/admins can manage library folders.");

    expect(authzMocks.isWorkspaceEditorInD1).toHaveBeenCalledTimes(5);
    expect(authzMocks.isWorkspaceEditorInD1).toHaveBeenCalledWith(d1, WORKSPACE_ID, expect.objectContaining({ userId: USER_ID }));
    expect(d1.prepare).not.toHaveBeenCalled();
  });

  it("deletes folders through ordered D1 updates and delete", async () => {
    const d1 = createD1Fixture({
      firstResults: [{
        id: FOLDER_ID,
        workspace_id: WORKSPACE_ID,
        parent_id: null,
        name: "Delete me",
        sort_order: 10,
        source_category_node_id: null,
        folder_kind: "custom",
        created_by: USER_ID,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      }],
    });
    const actions = await import("@/lib/component-library/actions");

    await expect(actions.deleteLibraryFolder(FOLDER_ID)).resolves.toBeUndefined();

    expect(authzMocks.isWorkspaceEditorInD1).toHaveBeenCalledWith(d1, WORKSPACE_ID, expect.objectContaining({ userId: USER_ID }));
    expect(d1.statements.map((statement) => statement.sql)).toEqual(expect.arrayContaining([
      expect.stringContaining("SELECT * FROM library_folders"),
      expect.stringContaining("UPDATE library_folders SET parent_id = ?"),
      expect.stringContaining("UPDATE cost_library_items SET library_folder_id = NULL"),
      expect.stringContaining("DELETE FROM library_folders"),
    ]));
  });

  it("creates a top folder without violating the non-negative sort order constraint", async () => {
    const d1 = createD1Fixture({
      allResults: [[
        { id: "folder-a", sort_order: 0 },
        { id: "folder-b", sort_order: 10 },
      ]],
      firstResults: [{
        id: "folder-new",
        workspace_id: WORKSPACE_ID,
        parent_id: null,
        name: "Top folder",
        sort_order: 0,
        source_category_node_id: null,
        folder_kind: "custom",
        created_by: USER_ID,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      }],
    });
    const actions = await import("@/lib/component-library/actions");

    await expect(actions.createLibraryFolder(null, "Top folder", { placement: "top" })).resolves.toMatchObject({
      folder: { id: "folder-new", sort_order: 0 },
    });

    const updateStatements = d1.statements.filter((statement) => statement.sql.includes("UPDATE library_folders SET sort_order = ?"));
    expect(updateStatements).toHaveLength(2);
    expect(updateStatements[0]?.values[0]).toBe(20);
    expect(updateStatements[0]?.values[2]).toBe("folder-b");
    expect(updateStatements[1]?.values[0]).toBe(10);
    expect(updateStatements[1]?.values[2]).toBe("folder-a");
    const insert = d1.statements.find((statement) => statement.sql.includes("INSERT INTO library_folders"));
    expect(insert?.values).toEqual(expect.arrayContaining([WORKSPACE_ID, null, "Top folder", 0, USER_ID]));
  });

  it("moves a component by updating only its library folder", async () => {
    const d1 = createD1Fixture({
      firstResults: [
        { id: FOLDER_ID },
        { id: ITEM_ID },
      ],
    });
    const actions = await import("@/lib/component-library/actions");

    await expect(actions.moveCostLibraryComponentToFolder({ itemId: ITEM_ID, libraryFolderId: FOLDER_ID })).resolves.toBeUndefined();

    expect(authzMocks.isWorkspaceEditorInD1).toHaveBeenCalledWith(d1, WORKSPACE_ID, expect.objectContaining({ userId: USER_ID }));
    expect(d1.statements).toEqual(expect.arrayContaining([
      expect.objectContaining({
        sql: expect.stringContaining("SELECT id\n      FROM library_folders"),
        values: [FOLDER_ID, WORKSPACE_ID],
      }),
      expect.objectContaining({
        sql: expect.stringContaining("UPDATE cost_library_items SET library_folder_id = ?"),
        values: [FOLDER_ID, expect.any(String), ITEM_ID, WORKSPACE_ID],
      }),
      expect.objectContaining({
        sql: expect.stringContaining("SELECT id FROM cost_library_items"),
        values: [ITEM_ID, WORKSPACE_ID],
      }),
    ]));
  });
});
