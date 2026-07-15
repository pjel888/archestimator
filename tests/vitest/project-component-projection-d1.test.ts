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
      const identities = this.database.projectComponentIdentities();
      if (this.sql.includes("COUNT(*) AS count") && this.sql.includes("grouped_components")) {
        return { results: [{ count: identities.length }] };
      }
      if (this.sql.includes("SELECT component_id, MAX(component_row_created_at) AS component_created_at")) {
        const cursorId = this.sql.includes("HAVING MAX(component_row_created_at)")
          ? String(this.values.at(-2))
          : null;
        const visibleIdentities = cursorId
          ? identities.filter((identity) => identity.component_id > cursorId)
          : identities;
        return { results: visibleIdentities.slice(0, Number(this.values.at(-1))) };
      }
      if (this.sql.includes("ORDER BY row_items.updated_at DESC") && this.sql.includes(" IN (")) {
        const selectedIds = new Set(this.values.slice(4).map(String));
        return {
          results: this.database.rowItems.filter((value) => {
            if (!value || typeof value !== "object") return false;
            const row = value as Record<string, unknown>;
            const metadata = typeof row.metadata_json === "string"
              ? JSON.parse(row.metadata_json) as { expressComponent?: { id?: string } }
              : {};
            return selectedIds.has(metadata.expressComponent?.id ?? String(row.id));
          }),
        };
      }
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

  projectComponentIdentities() {
    const latestByComponentId = new Map<string, string>();
    for (const value of this.rowItems) {
      if (!value || typeof value !== "object") continue;
      const row = value as Record<string, unknown>;
      const metadata = typeof row.metadata_json === "string"
        ? JSON.parse(row.metadata_json) as { expressComponent?: { id?: string } }
        : {};
      const componentId = metadata.expressComponent?.id ?? String(row.id);
      const createdAt = String(row.created_at ?? "1970-01-01T00:00:00.000Z");
      const current = latestByComponentId.get(componentId);
      if (!current || createdAt > current) latestByComponentId.set(componentId, createdAt);
    }
    return [...latestByComponentId.entries()]
      .map(([component_id, component_created_at]) => ({ component_id, component_created_at }))
      .sort((left, right) =>
        right.component_created_at.localeCompare(left.component_created_at)
        || left.component_id.localeCompare(right.component_id),
      );
  }
}

function findPrepared(database: FakeProjectComponentProjectionD1Database, pattern: RegExp) {
  const statement = database.prepared.find((entry) => pattern.test(entry.sql));
  if (!statement) throw new Error(`No prepared D1 statement matched ${pattern}`);
  return statement;
}

function projectComponentId(index: number) {
  return `project-component-${String(index).padStart(3, "0")}`;
}

function projectComponentRow(index: number) {
  const id = projectComponentId(index);
  return {
    id: `row-${String(index).padStart(3, "0")}`,
    material: `Project component ${index}`,
    description: "Project-only catalogue fixture",
    supplier: "Project supplier",
    supplier_id: null,
    unit: "piece",
    unit_cost: index,
    quantity: 1,
    quantity_base: null,
    quantity_contingency_amount: null,
    contingency_percentage: 0,
    adjustment_percentage: 0,
    misc_cost: 0,
    row_revision: 1,
    category_node_id: null,
    discipline: "Unspecified",
    designation: "",
    source_library_item_id: null,
    link_state: "unlinked",
    source_snapshot_json: "{}",
    metadata_json: JSON.stringify(withExpressComponentMetadata({}, { id })),
    created_at: "2026-07-15T00:00:00.000Z",
    updated_at: "2026-07-15T00:00:00.000Z",
    node_id: "node-1",
    node_name: "Ground Floor",
    estimate_id: "estimate-1",
    estimate_name: "ES-001",
    estimate_project_id: "project-1",
  };
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
        updated_at: "2026-06-16T00:00:00.000Z",
        node_id: "node-1",
        node_name: "Powder Room",
        estimate_id: "estimate-1",
        estimate_name: "Main",
        estimate_project_id: "project-1",
      },
      {
        id: "row-2",
        material: "Express vanity",
        description: "Second use of the same component",
        supplier: "Local fabricator",
        supplier_id: null,
        unit: "lot",
        unit_cost: 1500,
        quantity: 3,
        quantity_base: null,
        quantity_contingency_amount: null,
        contingency_percentage: 0,
        adjustment_percentage: 0,
        misc_cost: 0,
        row_revision: 1,
        category_node_id: null,
        discipline: "Unspecified",
        designation: "",
        source_library_item_id: null,
        link_state: "unlinked",
        source_snapshot_json: JSON.stringify({ imageUrl: "https://example.com/vanity.jpg" }),
        metadata_json: JSON.stringify(withExpressComponentMetadata({}, { id: "express-row-1" })),
        created_at: "2026-06-14T00:00:00.000Z",
        updated_at: "2026-06-14T00:00:00.000Z",
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
      id: "express-row-1",
      material: "Express vanity",
      source: "project",
      libraryFolderId: getProjectEstimateComponentsFolderId("project-1", "estimate-1"),
      metadata: {
        expressComponent: { id: "express-row-1", kind: "express" },
        projectComponentProjection: {
          componentId: "express-row-1",
          projectId: "project-1",
          projectName: "Luna Heights",
          estimateId: "estimate-1",
          estimateName: "Main",
          nodeId: "node-1",
          nodeName: "Powder Room",
          sourceRowId: "row-1",
          instanceRowIds: ["row-1", "row-2"],
          instanceCount: 2,
          classification: "express",
        },
      },
    });
    expect(result.libraryItems.filter((item) => item.source === "project")).toHaveLength(1);
  });

  it("pages all project components beyond the legacy raw-row cap with a frozen keyset total", async () => {
    const database = new FakeProjectComponentProjectionD1Database();
    database.rowItems = Array.from({ length: 105 }, (_, index) => projectComponentRow(index + 1));
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const {
      PROJECT_COMPONENT_ROWS_PAGE_SIZE,
      getProjectOnlyComponentRowsLibraryPage,
    } = await import("@/lib/component-library/project-component-projection");
    const firstPage = await getProjectOnlyComponentRowsLibraryPage("project-1");
    if (!firstPage.nextCursor) throw new Error("Expected the first project component page to continue");
    const secondPage = await getProjectOnlyComponentRowsLibraryPage("project-1", firstPage.nextCursor);
    if (!secondPage.nextCursor) throw new Error("Expected the second project component page to continue");
    const thirdPage = await getProjectOnlyComponentRowsLibraryPage("project-1", secondPage.nextCursor);

    expect(PROJECT_COMPONENT_ROWS_PAGE_SIZE).toBe(50);
    expect(firstPage).toMatchObject({
      isPartial: true,
      loadedComponentCount: 50,
      totalComponentCount: 105,
      hasMore: true,
      nextCursor: {
        createdAt: "2026-07-15T00:00:00.000Z",
        id: projectComponentId(50),
        snapshotTotalCount: 105,
      },
    });
    expect(secondPage).toMatchObject({
      isPartial: true,
      loadedComponentCount: 50,
      totalComponentCount: 105,
      hasMore: true,
      nextCursor: {
        createdAt: "2026-07-15T00:00:00.000Z",
        id: projectComponentId(100),
        snapshotAt: firstPage.nextCursor.snapshotAt,
        snapshotTotalCount: 105,
      },
    });
    expect(thirdPage).toMatchObject({
      isPartial: false,
      loadedComponentCount: 5,
      totalComponentCount: 105,
      hasMore: false,
      nextCursor: null,
    });
    expect([
      ...firstPage.libraryItems,
      ...secondPage.libraryItems,
      ...thirdPage.libraryItems,
    ].map((item) => item.id)).toEqual(
      Array.from({ length: 105 }, (_, index) => projectComponentId(index + 1)),
    );
    expect(componentLibraryMocks.getCurrentWorkspaceComponentRowsLibrary).toHaveBeenCalledTimes(3);
    expect(componentLibraryMocks.getCurrentWorkspaceComponentRowsLibrary).toHaveBeenCalledWith({
      includeDetailGraph: false,
      itemIds: [],
    });

    const identityQueries = database.prepared.filter((statement) =>
      statement.sql.includes("SELECT component_id, MAX(component_row_created_at) AS component_created_at"),
    );
    const countQueries = database.prepared.filter((statement) =>
      statement.sql.includes("COUNT(*) AS count") && statement.sql.includes("grouped_components"),
    );
    const detailQueries = database.prepared.filter((statement) =>
      statement.sql.includes("ORDER BY row_items.updated_at DESC") && statement.sql.includes(" IN ("),
    );
    expect(identityQueries).toHaveLength(3);
    expect(identityQueries.every((statement) => statement.values.at(-1) === 51)).toBe(true);
    expect(identityQueries.every((statement) => !statement.sql.includes("OFFSET"))).toBe(true);
    expect(countQueries).toHaveLength(1);
    expect(detailQueries).toHaveLength(3);
    expect(detailQueries.every((statement) => !statement.sql.includes("LIMIT"))).toBe(true);
  });
});
