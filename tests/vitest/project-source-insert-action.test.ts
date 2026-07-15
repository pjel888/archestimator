import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({ requireCurrentUserContext: vi.fn() }));
const d1Mocks = vi.hoisted(() => ({ getCloudflareD1Database: vi.fn() }));
const repositoryMocks = vi.hoisted(() => ({
  getEstimateTabs: vi.fn(),
  getEstimateTabTree: vi.fn(),
  getProjectEstimateTreeByEstimate: vi.fn(),
  listCurrentWorkspaceProjects: vi.fn(),
  listProjectEstimateSheets: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ requireCurrentUserContext: authMocks.requireCurrentUserContext }));
vi.mock("@/lib/cloudflare/d1", () => d1Mocks);
vi.mock("@/lib/repositories/workspace-repository", () => repositoryMocks);

const TARGET_PROJECT = "11111111-1111-4111-8111-111111111111";
const TARGET_ESTIMATE = "22222222-2222-4222-8222-222222222222";
const TARGET_PARENT = "33333333-3333-4333-8333-333333333333";
const SOURCE_PROJECT = "44444444-4444-4444-8444-444444444444";
const SOURCE_ESTIMATE = "55555555-5555-4555-8555-555555555555";
const SOURCE_TAB = "66666666-6666-4666-8666-666666666666";
const SOURCE_NODE = "77777777-7777-4777-8777-777777777777";
const WORKSPACE_ID = "88888888-8888-4888-8888-888888888888";
const TARGET_TAB = "99999999-9999-4999-8999-999999999999";
const ACTOR_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INSERT_INTENT = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const baseInput = {
  targetProjectId: TARGET_PROJECT,
  targetEstimateId: TARGET_ESTIMATE,
  targetParentNodeId: TARGET_PARENT,
  source: { projectId: SOURCE_PROJECT, estimateId: SOURCE_ESTIMATE, tabId: SOURCE_TAB, nodeId: null as string | null },
  intentId: INSERT_INTENT,
};

function recordFromInsert(statement: FakeD1Statement) {
  const columns = statement.sql
    .slice(statement.sql.indexOf("(") + 1, statement.sql.indexOf(")"))
    .split(",")
    .map((column) => column.replaceAll('"', "").trim());
  return Object.fromEntries(columns.map((column, index) => [column, statement.values[index]]));
}

class FakeD1Statement {
  values: unknown[] = [];

  constructor(
    private readonly database: FakeD1Database,
    readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  async first<T>() {
    this.database.statements.push(this);
    if (this.sql.includes("FROM estimate_mutation_receipts")) {
      return this.database.receipts.get(`${String(this.values[1])}:${String(this.values[2])}`) as T | undefined ?? null;
    }
    if (this.sql.includes("FROM estimate_sheet_events")) return null;
    if (this.sql.includes("project.workspace_id") && !this.sql.includes("LEFT JOIN estimate_sheet_access_settings")) {
      const estimateId = String(this.values[0]);
      if (estimateId === TARGET_ESTIMATE) return { id: TARGET_ESTIMATE, project_id: TARGET_PROJECT, workspace_id: WORKSPACE_ID } as T;
      if (estimateId === SOURCE_ESTIMATE) return this.database.sourceEstimate as T | null;
      return null;
    }
    if (this.sql.includes("LEFT JOIN estimate_sheet_access_settings")) {
      const estimateId = String(this.values[0]);
      const allowed = estimateId === TARGET_ESTIMATE ? this.database.canEditTarget : this.database.canReadSource;
      return allowed ? ({ allowed: 1 } as T) : null;
    }
    if (this.sql.includes("FROM estimate_nodes")) return this.database.targetParent as T | null;
    if (this.sql.includes("FROM estimate_tabs")) {
      return this.database.sourceTabAvailable
        ? ({ id: SOURCE_TAB, updated_at: "2026-07-14T00:00:00.000Z" } as T)
        : null;
    }
    if (this.sql.includes("COALESCE(MAX(sort_order)")) return { sort_order: 0 } as T;
    return null;
  }

  async all<T>() {
    this.database.statements.push(this);
    if (this.sql.includes("FROM estimate_nodes")) return { results: this.database.sourceNodes as T[], success: true };
    if (this.sql.includes("FROM estimate_row_items")) return { results: this.database.sourceRows as T[], success: true };
    return { results: [] as T[], success: true };
  }

  async run() {
    this.database.statements.push(this);
    return { success: true };
  }
}

class FakeD1Database {
  statements: FakeD1Statement[] = [];
  batches: FakeD1Statement[][] = [];
  receipts = new Map<string, {
    actor_user_id: string;
    request_fingerprint: string;
    result_json: string;
    status: string;
  }>();
  canEditTarget = true;
  canReadSource = true;
  sourceTabAvailable = true;
  sourceEstimate: { id: string; project_id: string; workspace_id: string } | null = {
    id: SOURCE_ESTIMATE,
    project_id: SOURCE_PROJECT,
    workspace_id: WORKSPACE_ID,
  };
  targetParent = {
    id: TARGET_PARENT,
    estimate_id: TARGET_ESTIMATE,
    estimate_tab_id: TARGET_TAB,
    parent_id: null,
    kind: "group",
    name: "Target parent",
    sort_order: 0,
    metadata_json: "{}",
    updated_at: "2026-07-14T00:00:00.000Z",
  };
  sourceNodes = [
    {
      id: SOURCE_NODE,
      estimate_id: SOURCE_ESTIMATE,
      estimate_tab_id: SOURCE_TAB,
      parent_id: null,
      kind: "group",
      name: "Source root",
      sort_order: 0,
      metadata_json: "{}",
      updated_at: "2026-07-14T00:00:00.000Z",
    },
  ];
  sourceRows = [
    {
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      estimate_id: SOURCE_ESTIMATE,
      node_id: SOURCE_NODE,
      description: "Source description",
      designation: "Source designation",
      discipline: "Architectural",
      material: "Source row",
      supplier: "Source supplier",
      supplier_id: null,
      quantity: 1,
      quantity_base: null,
      quantity_contingency_amount: null,
      unit: "unit",
      unit_cost: 10,
      misc_cost: 0,
      contingency_percentage: 0,
      adjustment_percentage: 0,
      source_snapshot_json: "{}",
      pricing_provenance_origin: "manual_override",
      sort_order: 0,
      row_revision: 9,
      category_node_id: null,
      source_library_item_id: null,
      link_state: "unlinked",
      metadata_json: "{}",
      updated_at: "2026-07-14T00:00:00.000Z",
    },
  ];

  prepare(sql: string) {
    return new FakeD1Statement(this, sql);
  }

  async batch(statements: FakeD1Statement[]) {
    this.batches.push(statements);
    for (const statement of statements) {
      if (!statement.sql.includes("INSERT INTO estimate_mutation_receipts")) continue;
      this.receipts.set(`${String(statement.values[2])}:${String(statement.values[3])}`, {
        actor_user_id: String(statement.values[4]),
        request_fingerprint: String(statement.values[7]),
        result_json: String(statement.values[8]),
        status: "committed",
      });
    }
    return statements.map(() => ({ success: true }));
  }
}

function eventStatement(database: FakeD1Database) {
  return database.batches.flat().find((statement) => statement.sql.includes("INSERT INTO estimate_sheet_events"));
}

function nodeInsertStatement(database: FakeD1Database, batchIndex = 0) {
  return database.batches[batchIndex]?.find((statement) => statement.sql.includes("INSERT INTO estimate_nodes"));
}

function rowInsertStatement(database: FakeD1Database, batchIndex = 0) {
  return database.batches[batchIndex]?.find((statement) => statement.sql.includes("INSERT INTO estimate_row_items"));
}

beforeEach(() => {
  vi.clearAllMocks();
  authMocks.requireCurrentUserContext.mockResolvedValue({ userId: ACTOR_ID });
  repositoryMocks.getEstimateTabTree.mockResolvedValue({
    project: { id: TARGET_PROJECT },
    estimate: { id: TARGET_ESTIMATE },
    tree: [{ id: TARGET_PARENT, name: "Ground Floor", kind: "group", total: "PHP 0.00", children: [] }],
  });
  repositoryMocks.getProjectEstimateTreeByEstimate.mockResolvedValue({
    project: { id: TARGET_PROJECT },
    estimate: { id: TARGET_ESTIMATE },
    tree: [{ id: TARGET_PARENT, name: "Ground Floor", kind: "group", total: "PHP 0.00", children: [] }],
  });
});

describe("insertProjectSourceIntoEstimate", () => {
  it("copies a whole tab in one guarded, publication-aware, receipted D1 batch", async () => {
    const database = new FakeD1Database();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const { insertProjectSourceIntoEstimate } = await import("@/lib/reusable-sources/actions");

    const result = await insertProjectSourceIntoEstimate(baseInput);

    expect(database.batches).toHaveLength(1);
    expect(database.batches[0]).toHaveLength(7);
    expect(database.batches[0][0]?.sql).toContain("project_source_copy_guard");
    expect(database.batches[0].some((statement) => statement.sql.includes("publication_source_revision"))).toBe(true);
    expect(database.batches[0].some((statement) => statement.sql.includes("INSERT INTO activity_event_outbox"))).toBe(true);
    expect(database.batches[0].some((statement) => statement.sql.includes("INSERT INTO estimate_mutation_receipts"))).toBe(true);

    const event = eventStatement(database);
    expect(event).toBeTruthy();
    const eventRecord = recordFromInsert(event!);
    expect(eventRecord.correlation_id).toBe(INSERT_INTENT);
    expect(JSON.parse(String(eventRecord.payload))).toMatchObject({
      sourceEstimateId: SOURCE_ESTIMATE,
      sourceRootNodeId: null,
      targetParentNodeId: TARGET_PARENT,
      inserted_node_count: 1,
      inserted_row_item_count: 1,
      statementCount: 7,
    });

    const nodeRecord = recordFromInsert(nodeInsertStatement(database)!);
    const rowRecord = recordFromInsert(rowInsertStatement(database)!);
    expect(nodeRecord).toMatchObject({ parent_id: TARGET_PARENT, estimate_tab_id: TARGET_TAB, sort_order: 1000 });
    expect(nodeRecord.id).not.toBe(SOURCE_NODE);
    expect(rowRecord).toMatchObject({
      node_id: nodeRecord.id,
      row_revision: 1,
      pricing_provenance_origin: "manual_override",
      source_snapshot_json: expect.any(String),
    });
    expect(JSON.parse(String(rowRecord.source_snapshot_json))).toMatchObject({
      sourceProjectId: SOURCE_PROJECT,
      sourceEstimateId: SOURCE_ESTIMATE,
      sourceTabId: SOURCE_TAB,
      sourceRowId: database.sourceRows[0]?.id,
    });
    expect(result.insertedRootNodeIds).toEqual([nodeRecord.id]);
    expect(result.tree[0]?.id).toBe(TARGET_PARENT);
    expect(repositoryMocks.getEstimateTabTree).toHaveBeenCalledWith(TARGET_PROJECT, TARGET_ESTIMATE, TARGET_TAB);
  });

  it("uses the selected node as the source root", async () => {
    const database = new FakeD1Database();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const { insertProjectSourceIntoEstimate } = await import("@/lib/reusable-sources/actions");

    await insertProjectSourceIntoEstimate({ ...baseInput, source: { ...baseInput.source, nodeId: SOURCE_NODE } });

    const event = eventStatement(database);
    expect(JSON.parse(String(recordFromInsert(event!).payload))).toMatchObject({ sourceRootNodeId: SOURCE_NODE });
  });

  it("replays a committed intent without reloading the source or allocating another batch", async () => {
    const database = new FakeD1Database();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const { insertProjectSourceIntoEstimate } = await import("@/lib/reusable-sources/actions");

    const first = await insertProjectSourceIntoEstimate(baseInput);
    const sourceLoadCount = database.statements.filter((statement) => statement.sql.includes("FROM estimate_tabs")).length;
    const replay = await insertProjectSourceIntoEstimate(baseInput);

    expect(replay.insertedRootNodeIds).toEqual(first.insertedRootNodeIds);
    expect(database.batches).toHaveLength(1);
    expect(database.statements.filter((statement) => statement.sql.includes("FROM estimate_tabs"))).toHaveLength(sourceLoadCount);
  });

  it("treats a new intent as a new copy with fresh destination ids", async () => {
    const database = new FakeD1Database();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const { insertProjectSourceIntoEstimate } = await import("@/lib/reusable-sources/actions");

    const first = await insertProjectSourceIntoEstimate(baseInput);
    const second = await insertProjectSourceIntoEstimate({
      ...baseInput,
      intentId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    });

    expect(database.batches).toHaveLength(2);
    expect(second.insertedRootNodeIds).not.toEqual(first.insertedRootNodeIds);
  });

  it("accepts any selected estimate node as the destination parent", async () => {
    const database = new FakeD1Database();
    database.targetParent.kind = "area";
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const { insertProjectSourceIntoEstimate } = await import("@/lib/reusable-sources/actions");

    await expect(insertProjectSourceIntoEstimate(baseInput)).resolves.toMatchObject({ insertedRootNodeIds: [expect.any(String)] });
    expect(database.batches).toHaveLength(1);
  });

  it("rejects a caller tab mismatch with zero writes", async () => {
    const database = new FakeD1Database();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const { insertProjectSourceIntoEstimate } = await import("@/lib/reusable-sources/actions");

    await expect(insertProjectSourceIntoEstimate({
      ...baseInput,
      targetTabId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    })).rejects.toThrow("Project-source target tab does not match the selected estimate node.");
    expect(database.batches).toHaveLength(0);
  });

  it("rejects an over-1000-statement copy without chunking or writes", async () => {
    const database = new FakeD1Database();
    database.sourceNodes = Array.from({ length: 996 }, (_, index) => ({
      id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      estimate_id: SOURCE_ESTIMATE,
      estimate_tab_id: SOURCE_TAB,
      parent_id: null,
      kind: "area",
      name: `Source ${index}`,
      sort_order: index,
      metadata_json: "{}",
      updated_at: "2026-07-14T00:00:00.000Z",
    }));
    database.sourceRows = [];
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const { insertProjectSourceIntoEstimate } = await import("@/lib/reusable-sources/actions");

    await expect(insertProjectSourceIntoEstimate(baseInput)).rejects.toMatchObject({
      code: "selection_too_large",
      statementCount: 1001,
    });
    expect(database.batches).toHaveLength(0);
  });

  it("rejects an invalid id before any DB access", async () => {
    const database = new FakeD1Database();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const { insertProjectSourceIntoEstimate } = await import("@/lib/reusable-sources/actions");

    await expect(insertProjectSourceIntoEstimate({ ...baseInput, source: { ...baseInput.source, estimateId: "not-a-uuid" } }))
      .rejects.toThrow("Invalid project-source insert request.");
    expect(d1Mocks.getCloudflareD1Database).not.toHaveBeenCalled();
  });

  it("surfaces a clear error when the source is gone", async () => {
    const database = new FakeD1Database();
    database.sourceEstimate = null;
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const { insertProjectSourceIntoEstimate } = await import("@/lib/reusable-sources/actions");

    await expect(insertProjectSourceIntoEstimate(baseInput)).rejects.toThrow("This project source is no longer available.");
    expect(database.batches).toHaveLength(0);
  });

  it("surfaces a clear error when the source node is gone", async () => {
    const database = new FakeD1Database();
    database.sourceNodes = [];
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const { insertProjectSourceIntoEstimate } = await import("@/lib/reusable-sources/actions");

    await expect(insertProjectSourceIntoEstimate({ ...baseInput, source: { ...baseInput.source, nodeId: SOURCE_NODE } }))
      .rejects.toThrow("This project source is no longer available.");
    expect(database.batches).toHaveLength(0);
  });

  it("fails before copy writes when the actor cannot edit the target", async () => {
    const database = new FakeD1Database();
    database.canEditTarget = false;
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const { insertProjectSourceIntoEstimate } = await import("@/lib/reusable-sources/actions");

    await expect(insertProjectSourceIntoEstimate(baseInput)).rejects.toThrow("Could not insert project source: Estimate edit access denied.");
    expect(database.batches).toHaveLength(0);
  });
});
