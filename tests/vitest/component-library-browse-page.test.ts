import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const testMocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
  ensureDefaultWorkspace: vi.fn(),
}));

vi.mock("@/lib/cloudflare/d1", () => ({
  getCloudflareD1Database: testMocks.getCloudflareD1Database,
}));

vi.mock("@/lib/repositories/workspace-repository", () => ({
  ensureDefaultWorkspace: testMocks.ensureDefaultWorkspace,
}));

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_WORKSPACE_ID = "22222222-2222-4222-8222-222222222222";
const UPDATED_AT = "2026-07-15T04:00:00.000Z";
const SNAPSHOT_AT = "2026-07-15T05:00:00.000Z";

type TestRow = ReturnType<typeof createItemRow>;
type D1Value = string | number | boolean | null | ArrayBuffer;

function componentId(index: number) {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

function createItemRow(index: number, overrides: Record<string, unknown> = {}) {
  return {
    id: componentId(index),
    workspace_id: WORKSPACE_ID,
    name: `Component ${index}`,
    description: "",
    supplier: null,
    supplier_id: null,
    brand: null,
    brand_id: null,
    category: "General",
    category_node_id: null,
    library_folder_id: null,
    unit: "piece",
    unit_cost: index,
    misc_cost: 0,
    pricing_source: "Manual",
    pricing_date: "2026-07-15",
    metadata: {},
    thumbnail_path: null,
    active_price_option_id: null,
    current_version_number: 1,
    lifecycle_state: "available",
    lifecycle_state_changed_at: UPDATED_AT,
    created_at: UPDATED_AT,
    updated_at: UPDATED_AT,
    ...overrides,
  };
}

class BrowseStatement {
  private values: D1Value[] = [];

  constructor(
    private readonly database: BrowseDatabase,
    readonly sql: string,
  ) {}

  bind(...values: D1Value[]) {
    this.values = values;
    this.database.prepared.push({ sql: this.sql, values });
    return this;
  }

  async first<T>() {
    return this.database.first<T>(this.sql, this.values);
  }

  async all<T>() {
    return { results: this.database.all<T>(this.sql, this.values) };
  }

  async run() {
    return { success: true, meta: { changes: 0 } };
  }
}

class BrowseDatabase {
  readonly prepared: Array<{ sql: string; values: D1Value[] }> = [];
  batchCallCount = 0;

  constructor(readonly rows: TestRow[]) {}

  prepare(sql: string) {
    return new BrowseStatement(this, sql);
  }

  async batch(statements: BrowseStatement[]) {
    this.batchCallCount += 1;
    return Promise.all(statements.map((statement) => statement.all()));
  }

  first<T>(sql: string, values: D1Value[]): T | null {
    if (sql.includes("COUNT(*) AS count") && sql.includes("FROM cost_library_items")) {
      return { count: this.activeWorkspaceRows(String(values[0])).length } as T;
    }
    throw new Error(`Unexpected D1 first query: ${sql}`);
  }

  all<T>(sql: string, values: D1Value[]): T[] {
    if (sql.includes("COUNT(*) AS count") && sql.includes("FROM cost_library_items")) {
      const snapshotAt = String(values[1]);
      return [{
        count: this.activeWorkspaceRows(String(values[0])).filter((row) => row.created_at <= snapshotAt).length,
      }] as T[];
    }
    if (sql.includes("FROM component_category_nodes")) return [];
    if (sql.includes("FROM component_suppliers")) return [];
    if (sql.includes("FROM component_brands")) return [];
    if (sql.includes("FROM library_folders")) return [];
    if (sql.includes("FROM cost_library_item_price_options")) return [];
    if (sql.includes("FROM cost_library_item_variant_cost_entries")) return [];
    if (sql.includes("SELECT id, created_at") && sql.includes("FROM cost_library_items")) {
      const workspaceId = String(values[0]);
      const snapshotAt = String(values[1]);
      let rows = this.activeWorkspaceRows(workspaceId)
        .filter((row) => row.created_at <= snapshotAt)
        .sort((left, right) => right.created_at.localeCompare(left.created_at) || left.id.localeCompare(right.id));
      if (sql.includes("created_at < ?")) {
        const createdAt = String(values[2]);
        const id = String(values[4]);
        rows = rows.filter((row) => row.created_at < createdAt || (row.created_at === createdAt && row.id > id));
      }
      const limit = Number(values.at(-1));
      return rows.slice(0, limit).map((row) => ({ id: row.id, created_at: row.created_at })) as T[];
    }
    if (sql.includes("FROM cost_library_items") && sql.includes("id IN (")) {
      const workspaceId = String(values[0]);
      const selectedIds = new Set(values.slice(1).map(String));
      return this.activeWorkspaceRows(workspaceId).filter((row) => selectedIds.has(row.id)) as T[];
    }
    throw new Error(`Unexpected D1 all query: ${sql}`);
  }

  private activeWorkspaceRows(workspaceId: string) {
    return this.rows.filter((row) => row.workspace_id === workspaceId && row.lifecycle_state !== "archived");
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(SNAPSHOT_AT));
  vi.resetModules();
  testMocks.getCloudflareD1Database.mockReset();
  testMocks.ensureDefaultWorkspace.mockReset().mockResolvedValue({
    workspace: { id: WORKSPACE_ID },
    profile: { id: "user-1" },
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("component library bounded browse page", () => {
  it("returns 50 rows plus keyset metadata while excluding archived and cross-workspace rows", async () => {
    const activeRows = Array.from({ length: 55 }, (_, index) => createItemRow(index + 1));
    const database = new BrowseDatabase([
      ...activeRows,
      createItemRow(80, { lifecycle_state: "archived" }),
      createItemRow(90, { workspace_id: OTHER_WORKSPACE_ID }),
    ]);
    testMocks.getCloudflareD1Database.mockResolvedValue(database);

    const {
      COMPONENT_ROWS_LIBRARY_PAGE_SIZE,
      getCurrentWorkspaceComponentRowsLibraryPage,
    } = await import("@/lib/repositories/component-library-repository");
    const firstPage = await getCurrentWorkspaceComponentRowsLibraryPage();

    expect(COMPONENT_ROWS_LIBRARY_PAGE_SIZE).toBe(50);
    expect(firstPage.libraryItems).toHaveLength(50);
    expect(firstPage.libraryItems.map((item) => item.id)).toEqual(activeRows.slice(0, 50).map((row) => row.id));
    expect(firstPage).toMatchObject({
      isPartial: true,
      loadedComponentCount: 50,
      totalComponentCount: 55,
      hasMore: true,
      nextCursor: {
        createdAt: UPDATED_AT,
        id: componentId(50),
        snapshotAt: SNAPSHOT_AT,
        snapshotTotalCount: 55,
      },
    });

    const identityQuery = database.prepared.find((statement) => statement.sql.includes("SELECT id, created_at"));
    const countQuery = database.prepared.find((statement) => statement.sql.includes("COUNT(*) AS count"));
    expect(countQuery?.sql).toContain("created_at <= ?");
    expect(countQuery?.values).toEqual([WORKSPACE_ID, SNAPSHOT_AT]);
    expect(identityQuery?.sql).toContain("created_at <= ?");
    expect(identityQuery?.sql).toContain("ORDER BY created_at DESC, id ASC");
    expect(identityQuery?.sql).not.toContain("OFFSET");
    expect(identityQuery?.values.at(-1)).toBe(51);
    expect(database.batchCallCount).toBe(1);
  });

  it("advances equal timestamps with the ID tie-break and ends without a cursor", async () => {
    const database = new BrowseDatabase(Array.from({ length: 55 }, (_, index) => createItemRow(index + 1)));
    testMocks.getCloudflareD1Database.mockResolvedValue(database);

    const { getCurrentWorkspaceComponentRowsLibraryPage } = await import("@/lib/repositories/component-library-repository");
    const firstPage = await getCurrentWorkspaceComponentRowsLibraryPage();
    const secondPage = await getCurrentWorkspaceComponentRowsLibraryPage(firstPage.nextCursor);

    expect(secondPage.libraryItems.map((item) => item.id)).toEqual([
      componentId(51),
      componentId(52),
      componentId(53),
      componentId(54),
      componentId(55),
    ]);
    expect(secondPage).toMatchObject({
      isPartial: false,
      loadedComponentCount: 5,
      totalComponentCount: 55,
      hasMore: false,
      nextCursor: null,
    });
    const cursorQuery = database.prepared.filter((statement) => statement.sql.includes("SELECT id, created_at")).at(-1);
    expect(cursorQuery?.values.slice(1, 5)).toEqual([SNAPSHOT_AT, UPDATED_AT, UPDATED_AT, componentId(50)]);
  });

  it("excludes inserts created after the first-page snapshot and keeps its frozen total", async () => {
    const rows = Array.from({ length: 55 }, (_, index) => createItemRow(index + 1));
    const database = new BrowseDatabase(rows);
    testMocks.getCloudflareD1Database.mockResolvedValue(database);

    const { getCurrentWorkspaceComponentRowsLibraryPage } = await import("@/lib/repositories/component-library-repository");
    const firstPage = await getCurrentWorkspaceComponentRowsLibraryPage();
    rows.push(createItemRow(56, {
      created_at: "2026-07-15T05:00:01.000Z",
      updated_at: "2026-07-15T05:00:01.000Z",
    }));

    const secondPage = await getCurrentWorkspaceComponentRowsLibraryPage(firstPage.nextCursor);

    expect(secondPage.libraryItems.map((item) => item.id)).toEqual([
      componentId(51),
      componentId(52),
      componentId(53),
      componentId(54),
      componentId(55),
    ]);
    expect(secondPage.totalComponentCount).toBe(55);
    expect(database.prepared.filter((statement) => statement.sql.includes("COUNT(*) AS count"))).toHaveLength(1);
  });

  it("does not skip a later-page row when its mutable updated_at changes", async () => {
    const rows = Array.from({ length: 55 }, (_, index) => createItemRow(index + 1));
    const database = new BrowseDatabase(rows);
    testMocks.getCloudflareD1Database.mockResolvedValue(database);

    const { getCurrentWorkspaceComponentRowsLibraryPage } = await import("@/lib/repositories/component-library-repository");
    const firstPage = await getCurrentWorkspaceComponentRowsLibraryPage();
    rows[50]!.updated_at = "2026-07-15T06:00:00.000Z";

    const secondPage = await getCurrentWorkspaceComponentRowsLibraryPage(firstPage.nextCursor);

    expect(secondPage.libraryItems.map((item) => item.id)).toContain(componentId(51));
    const cursorQuery = database.prepared.filter((statement) => statement.sql.includes("SELECT id, created_at")).at(-1);
    expect(cursorQuery?.sql).not.toContain("updated_at");
  });

  it("rejects malformed cursors before querying D1", async () => {
    const database = new BrowseDatabase([]);
    testMocks.getCloudflareD1Database.mockResolvedValue(database);
    const { getCurrentWorkspaceComponentRowsLibraryPage } = await import("@/lib/repositories/component-library-repository");

    await expect(getCurrentWorkspaceComponentRowsLibraryPage({
      createdAt: "not-a-date",
      id: componentId(1),
      snapshotAt: SNAPSHOT_AT,
      snapshotTotalCount: 0,
    })).rejects.toThrow("Invalid component library cursor.");
    await expect(getCurrentWorkspaceComponentRowsLibraryPage({
      createdAt: UPDATED_AT,
      id: "not-a-uuid",
      snapshotAt: SNAPSHOT_AT,
      snapshotTotalCount: 0,
    })).rejects.toThrow("Invalid component library cursor.");
    await expect(getCurrentWorkspaceComponentRowsLibraryPage({
      createdAt: UPDATED_AT,
      id: componentId(1),
      snapshotAt: "not-a-date",
      snapshotTotalCount: 0,
    })).rejects.toThrow("Invalid component library cursor.");
    await expect(getCurrentWorkspaceComponentRowsLibraryPage({
      createdAt: UPDATED_AT,
      id: componentId(1),
      snapshotAt: SNAPSHOT_AT,
      snapshotTotalCount: -1,
    })).rejects.toThrow("Invalid component library cursor.");
    expect(database.prepared).toHaveLength(0);
  });

  it("keeps the client action authenticated and the active browse index additive", () => {
    const actions = readFileSync(join(process.cwd(), "src/lib/component-library/actions.ts"), "utf8");
    const migration = readFileSync(
      join(process.cwd(), "migrations/0083_component_library_browse_cursor_index.sql"),
      "utf8",
    );

    expect(actions).toContain("await requireCurrentUserContext();");
    expect(actions).toContain("return getCurrentWorkspaceComponentRowsLibraryPage(cursor);");
    expect(migration).toContain("ON cost_library_items(workspace_id, created_at DESC, id ASC)");
    expect(migration).toContain("WHERE lifecycle_state <> 'archived'");
  });
});
