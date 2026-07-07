import { beforeEach, describe, expect, it, vi } from "vitest";

import { withExpressComponentMetadata } from "@/lib/estimates/express-components";

const authSessionMocks = vi.hoisted(() => ({
  requireCurrentUserContext: vi.fn(),
}));

const authzMocks = vi.hoisted(() => ({
  canAccessWholeProjectInD1: vi.fn(),
}));

const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

const componentLibraryMocks = vi.hoisted(() => ({
  SIDEBAR_COMPONENT_LIBRARY_MAX_LIMIT: 250,
  fallbackComponentRowsLibraryDataset: {
    libraryFolders: [],
    libraryItems: [],
    detailGraph: null,
  },
  getCurrentWorkspaceComponentRowsLibrary: vi.fn(),
}));

const workspaceRepositoryMocks = vi.hoisted(() => ({
  getCurrentWorkspaceProject: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => authSessionMocks);
vi.mock("@/lib/authz/d1-access", () => authzMocks);
vi.mock("@/lib/cloudflare/d1", () => d1Mocks);
vi.mock("@/lib/repositories/component-library-repository", () => componentLibraryMocks);
vi.mock("@/lib/repositories/workspace-repository", () => workspaceRepositoryMocks);

type PreparedD1Statement = {
  sql: string;
  values: unknown[];
};

class FakeD1Statement {
  private values: unknown[] = [];

  constructor(
    private readonly database: FakeProjectComponentProjectionD1Database,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    this.database.prepared.push({ sql: this.sql, values });
    return this;
  }

  async first() {
    throw new Error(`Unexpected D1 first query: ${this.sql}`);
  }

  async all() {
    if (this.sql.includes("FROM estimate_row_items row_items")) {
      return { results: this.database.rowItems };
    }
    throw new Error(`Unexpected D1 all query: ${this.sql}`);
  }

  async run() {
    throw new Error(`Unexpected D1 run query: ${this.sql}`);
  }
}

class FakeProjectComponentProjectionD1Database {
  prepared: PreparedD1Statement[] = [];
  rowItems: unknown[] = [];

  prepare(sql: string) {
    return new FakeD1Statement(this, sql);
  }
}

function findPrepared(database: FakeProjectComponentProjectionD1Database, pattern: RegExp) {
  const statement = database.prepared.find((entry) => pattern.test(entry.sql));
  if (!statement) throw new Error(`No prepared D1 statement matched ${pattern}`);
  return statement;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  authSessionMocks.requireCurrentUserContext.mockResolvedValue({ userId: "user-1", role: "member" });
  authzMocks.canAccessWholeProjectInD1.mockResolvedValue(true);
  componentLibraryMocks.getCurrentWorkspaceComponentRowsLibrary.mockResolvedValue({
    libraryFolders: [
      {
        id: "workspace-folder",
        workspace_id: "workspace-1",
        parent_id: null,
        name: "Workspace Library",
        sort_order: 1,
        source_category_node_id: null,
        folder_kind: "custom",
      },
    ],
    libraryItems: [
      {
        id: "workspace-item",
        material: "Workspace component",
      },
    ],
    detailGraph: null,
  });
  workspaceRepositoryMocks.getCurrentWorkspaceProject.mockResolvedValue({
    workspace: { id: "workspace-1" },
    project: {
      id: "project-1",
      workspace_id: "workspace-1",
      name: "Luna Heights",
    },
  });
});

describe("project component projection D1 repository", () => {
  it("returns only the workspace library when the user cannot access the project", async () => {
    const database = new FakeProjectComponentProjectionD1Database();
    database.rowItems = [
      {
        id: "row-1",
        material: "Victim component",
        metadata_json: JSON.stringify(withExpressComponentMetadata({}, { id: "express-row-1" })),
      },
    ];
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    authzMocks.canAccessWholeProjectInD1.mockResolvedValue(false);

    const { getProjectComponentRowsLibrary } = await import("@/lib/component-library/project-component-projection");
    const result = await getProjectComponentRowsLibrary("project-1", {
      includeDetailGraph: false,
      itemLimit: 25,
      projectRowLimit: 7,
    });

    expect(authzMocks.canAccessWholeProjectInD1).toHaveBeenCalledWith(database, "project-1", { userId: "user-1", role: "member" });
    expect(database.prepared.some((entry) => entry.sql.includes("FROM estimate_row_items row_items"))).toBe(false);
    expect(result.libraryItems).toEqual([{ id: "workspace-item", material: "Workspace component" }]);
  });
  it("loads project component projection rows from Cloudflare D1", async () => {
    const database = new FakeProjectComponentProjectionD1Database();
    database.rowItems = [
      {
        id: "row-1",
        material: "Express vanity",
        description: "Custom vanity",
        supplier: "Local fabricator",
        supplier_id: null,
        unit: "lot",
        unit_cost: 1500,
        quantity: 1,
        quantity_base: null,
        quantity_contingency_amount: null,
        contingency_percentage: 0,
        adjustment_percentage: 0,
        misc_cost: 0,
        row_revision: 2,
        category_node_id: null,
        discipline: "Unspecified",
        designation: "",
        source_library_item_id: null,
        link_state: "unlinked",
        source_snapshot_json: JSON.stringify({ imageUrl: "https://example.com/vanity.jpg" }),
        metadata_json: JSON.stringify(withExpressComponentMetadata({}, { id: "express-row-1" })),
        created_at: "2026-06-15T00:00:00.000Z",
        node_id: "node-1",
        node_name: "Powder Room",
        estimate_id: "estimate-1",
        estimate_name: "Main",
        estimate_project_id: "project-1",
      },
    ];
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { getProjectComponentRowsLibrary, getProjectEstimateComponentsFolderId } = await import("@/lib/component-library/project-component-projection");
    const result = await getProjectComponentRowsLibrary("project-1", {
      includeDetailGraph: true,
      itemLimit: 25,
      projectRowLimit: 7,
    });

    const statement = findPrepared(database, /FROM estimate_row_items row_items/);
    expect(statement.values).toEqual(["project-1", 0, "user-1", 7]);
    expect(statement.sql).toContain("INNER JOIN estimates ON estimates.id = row_items.estimate_id");
    expect(statement.sql).toContain("LEFT JOIN estimate_sheet_access_settings access ON access.estimate_id = estimates.id");
    expect(statement.sql).toContain("COALESCE(access.inherit_project_access, 1) = 1");
    expect(statement.sql).toContain("sheet_member.estimate_id = estimates.id");
    expect(statement.sql).toContain("sheet_member.user_id = ?");
    expect(authzMocks.canAccessWholeProjectInD1).toHaveBeenCalledWith(database, "project-1", { userId: "user-1", role: "member" });
    expect(componentLibraryMocks.getCurrentWorkspaceComponentRowsLibrary).toHaveBeenCalledWith({
      includeDetailGraph: true,
      itemLimit: 25,
    });
    expect(result.libraryFolders.map((folder) => folder.id)).toEqual([
      "project-components-project-1",
      getProjectEstimateComponentsFolderId("project-1", "estimate-1"),
      "workspace-folder",
    ]);
    expect(result.libraryItems[0]).toMatchObject({
      id: "row-1",
      material: "Express vanity",
      source: "project",
      libraryFolderId: getProjectEstimateComponentsFolderId("project-1", "estimate-1"),
      metadata: {
        expressComponent: { id: "express-row-1", kind: "express" },
        projectComponentProjection: {
          projectId: "project-1",
          projectName: "Luna Heights",
          estimateId: "estimate-1",
          estimateName: "Main",
          nodeId: "node-1",
          nodeName: "Powder Room",
          classification: "express",
        },
      },
    });
  });
});
