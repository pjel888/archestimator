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

const baseInput = {
  targetProjectId: TARGET_PROJECT,
  targetEstimateId: TARGET_ESTIMATE,
  targetParentNodeId: TARGET_PARENT,
  source: { projectId: SOURCE_PROJECT, estimateId: SOURCE_ESTIMATE, tabId: SOURCE_TAB, nodeId: null as string | null },
};

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
    if (this.sql.includes("FROM estimate_sheet_events")) return this.database.existingEvent as T | null;
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
    if (this.sql.includes("FROM estimate_nodes") && this.sql.includes("AND kind = 'group'")) {
      return this.database.targetParent as T | null;
    }
    if (this.sql.includes("FROM estimate_tabs")) return this.database.sourceTabAvailable ? ({ id: SOURCE_TAB } as T) : null;
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
  batchStatements: FakeD1Statement[] = [];
  canEditTarget = true;
  canReadSource = true;
  sourceTabAvailable = true;
  existingEvent: { payload: string } | null = null;
  sourceEstimate: { id: string; project_id: string; workspace_id: string } | null = {
    id: SOURCE_ESTIMATE,
    project_id: SOURCE_PROJECT,
    workspace_id: WORKSPACE_ID,
  };
  targetParent = {
    id: TARGET_PARENT,
    estimate_id: TARGET_ESTIMATE,
    estimate_tab_id: "99999999-9999-4999-8999-999999999999",
    parent_id: null,
    kind: "group",
    name: "Target parent",
    sort_order: 0,
    metadata_json: "{}",
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
    },
  ];
  sourceRows = [
    {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      estimate_id: SOURCE_ESTIMATE,
      node_id: SOURCE_NODE,
      description: "",
      designation: "",
      discipline: "",
      material: "Source row",
      supplier: "",
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
      sort_order: 0,
      row_revision: 0,
      category_node_id: null,
      source_library_item_id: null,
      link_state: "unlinked",
      metadata_json: "{}",
    },
  ];

  prepare(sql: string) {
    return new FakeD1Statement(this, sql);
  }

  async batch(statements: FakeD1Statement[]) {
    this.batchStatements.push(...statements);
    return statements.map(() => ({ success: true }));
  }
}

function eventStatement(database: FakeD1Database) {
  return database.batchStatements.find((statement) => statement.sql.includes("INSERT INTO estimate_sheet_events"));
}

beforeEach(() => {
  vi.clearAllMocks();
  authMocks.requireCurrentUserContext.mockResolvedValue({ userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });
  repositoryMocks.getProjectEstimateTreeByEstimate.mockResolvedValue({
    project: { id: TARGET_PROJECT },
    estimate: { id: TARGET_ESTIMATE },
    tree: [{ id: TARGET_PARENT, name: "Ground Floor", kind: "group", total: "PHP 0.00", children: [] }],
  });
});

describe("insertProjectSourceIntoEstimate", () => {
  it("inserts a whole-tab source through Cloudflare D1", async () => {
    const database = new FakeD1Database();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const { insertProjectSourceIntoEstimate } = await import("@/lib/reusable-sources/actions");

    const result = await insertProjectSourceIntoEstimate(baseInput);

    const event = eventStatement(database);
    expect(event).toBeTruthy();
    expect(event?.values[8]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(JSON.parse(String(event?.values[14]))).toMatchObject({
      sourceEstimateId: SOURCE_ESTIMATE,
      sourceRootNodeId: null,
      targetParentNodeId: TARGET_PARENT,
      inserted_node_count: 1,
      inserted_row_item_count: 1,
    });
    expect(result.insertedRootNodeIds).toHaveLength(1);
    expect(result.tree[0]?.id).toBe(TARGET_PARENT);
  });

  it("uses the node id as the source root for a node subtree", async () => {
    const database = new FakeD1Database();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const { insertProjectSourceIntoEstimate } = await import("@/lib/reusable-sources/actions");

    await insertProjectSourceIntoEstimate({ ...baseInput, source: { ...baseInput.source, nodeId: SOURCE_NODE } });

    expect(JSON.parse(String(eventStatement(database)?.values[14]))).toMatchObject({ sourceRootNodeId: SOURCE_NODE });
  });

  it("mints a STABLE correlation_id for the same unit (idempotent replay, U2-2)", async () => {
    const firstDb = new FakeD1Database();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(firstDb);
    const { insertProjectSourceIntoEstimate } = await import("@/lib/reusable-sources/actions");
    await insertProjectSourceIntoEstimate(baseInput);
    const idA = eventStatement(firstDb)?.values[8];

    const secondDb = new FakeD1Database();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(secondDb);
    await insertProjectSourceIntoEstimate(baseInput);
    const idB = eventStatement(secondDb)?.values[8];

    expect(idA).toBe(idB);
  });

  it("rejects an invalid id before any DB access (fail closed)", async () => {
    const database = new FakeD1Database();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const { insertProjectSourceIntoEstimate } = await import("@/lib/reusable-sources/actions");

    await expect(insertProjectSourceIntoEstimate({ ...baseInput, source: { ...baseInput.source, estimateId: "not-a-uuid" } }))
      .rejects.toThrow("Invalid project-source insert request.");
    expect(d1Mocks.getCloudflareD1Database).not.toHaveBeenCalled();
  });

  it("surfaces a clear error when the source is gone (re-read-at-insert / denial 7)", async () => {
    const database = new FakeD1Database();
    database.sourceEstimate = null;
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const { insertProjectSourceIntoEstimate } = await import("@/lib/reusable-sources/actions");

    await expect(insertProjectSourceIntoEstimate(baseInput)).rejects.toThrow("This project source is no longer available.");
    expect(database.batchStatements).toHaveLength(0);
  });

  it("surfaces a clear error when the source node is gone", async () => {
    const database = new FakeD1Database();
    database.sourceNodes = [];
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const { insertProjectSourceIntoEstimate } = await import("@/lib/reusable-sources/actions");

    await expect(insertProjectSourceIntoEstimate({ ...baseInput, source: { ...baseInput.source, nodeId: SOURCE_NODE } }))
      .rejects.toThrow("This project source is no longer available.");
    expect(database.batchStatements).toHaveLength(0);
  });

  it("fails before copy writes when the actor cannot edit the target", async () => {
    const database = new FakeD1Database();
    database.canEditTarget = false;
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const { insertProjectSourceIntoEstimate } = await import("@/lib/reusable-sources/actions");

    await expect(insertProjectSourceIntoEstimate(baseInput)).rejects.toThrow("Could not insert project source: Estimate edit access denied.");
    expect(database.batchStatements).toHaveLength(0);
  });
});
