import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1Result,
  D1Value,
} from "@/lib/cloudflare/d1";
import type { EstimateRowItem } from "@/lib/estimates/types";

const repositoryMocks = vi.hoisted(() => ({
  clearEstimateRouteContextProcessCache: vi.fn(),
  getCurrentWorkspaceProject: vi.fn(),
  getCurrentWorkspaceProjectForEstimate: vi.fn(),
  getProjectEstimateTreeByEstimate: vi.fn(),
}));

const databaseMocks = vi.hoisted(() => ({
  requireEstimateD1Database: vi.fn(),
}));

const rowIntentMocks = vi.hoisted(() => ({
  deleteEstimateRowItemWithHistory: vi.fn(),
  deleteEstimateRowItemsBulkWithHistory: vi.fn(),
  getEstimateRowForProject: vi.fn(),
  insertEstimateRowItemWithHistory: vi.fn(),
  moveEstimateRowComponentWithHistory: vi.fn(),
  replaceEstimateRowItemWithHistory: vi.fn(),
  restoreDeletedEstimateRowsWithHistory: vi.fn(),
  updateEstimateRowItemWithHistory: vi.fn(),
}));

const recordIntentMocks = vi.hoisted(() => ({
  getEstimateRecordForProject: vi.fn(),
  updateEstimateDetailsWithHistory: vi.fn(),
}));

const nodeIntentMocks = vi.hoisted(() => ({
  createEstimateNodeWithHistory: vi.fn(),
  getEstimateNodeForProject: vi.fn(),
  reorderEstimateNodesWithHistory: vi.fn(),
  resolveEstimateActivityNodeScope: vi.fn(),
}));

const accessIntentMocks = vi.hoisted(() => ({
  canEditEstimate: vi.fn(),
  getEstimateActivityRetentionMetrics: vi.fn(),
}));

const authMocks = vi.hoisted(() => {
  const requireCurrentUserContext = vi.fn();
  return {
    requireAuth: vi.fn(),
    requireCurrentUserContext,
    requireWorkshopWriteContext: requireCurrentUserContext,
  };
});

const nextCacheMocks = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
const nextNavigationMocks = vi.hoisted(() => ({ redirect: vi.fn() }));

vi.mock("@/lib/repositories/workspace-repository", () => repositoryMocks);
vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("next/cache", () => nextCacheMocks);
vi.mock("next/navigation", () => nextNavigationMocks);
vi.mock("@/lib/estimates/d1-intents/database", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/estimates/d1-intents/database")>(),
  requireEstimateD1Database: databaseMocks.requireEstimateD1Database,
}));
vi.mock("@/lib/estimates/d1-intents/rows", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/estimates/d1-intents/rows")>(),
  ...rowIntentMocks,
}));
vi.mock("@/lib/estimates/d1-intents/estimate-records", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/estimates/d1-intents/estimate-records")>(),
  ...recordIntentMocks,
}));
vi.mock("@/lib/estimates/d1-intents/nodes", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/estimates/d1-intents/nodes")>(),
  ...nodeIntentMocks,
}));
vi.mock("@/lib/estimates/d1-intents/access", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/estimates/d1-intents/access")>(),
  ...accessIntentMocks,
}));

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const ESTIMATE_ID = "22222222-2222-4222-8222-222222222222";
const ROW_ID = "33333333-3333-4333-8333-333333333333";
const TARGET_ROW_ID = "44444444-4444-4444-8444-444444444444";
const NODE_ID = "55555555-5555-4555-8555-555555555555";
const USER_ID = "66666666-6666-4666-8666-666666666666";
const MUTATION_ID = "77777777-7777-4777-8777-777777777777";

const actor = { role: "member" as const, userId: USER_ID };

type CapturedRead = { sql: string; values: D1Value[] };

type HistoryRow = {
  id: string;
  event_type: string;
  event_source: string;
  created_at: string;
  actor_user_id: string | null;
  estimate_tab_id: string | null;
  target_row_id: string | null;
  estimate_node_id: string | null;
  row_context: string;
  old_snapshot: string | null;
  new_snapshot: string | null;
  changed_fields: string;
  total_delta: number | null;
  payload: string;
  correlation_id: string;
};

class HistoryStatement<T = Record<string, unknown>> implements D1PreparedStatementLike<T> {
  values: D1Value[] = [];

  constructor(private readonly database: HistoryDatabase, readonly sql: string) {}

  bind(...values: D1Value[]) {
    this.values = values;
    return this;
  }

  async first<R = T>(): Promise<R | null> {
    return this.database.first(this.sql, this.values) as R | null;
  }

  async all<R = T>(): Promise<D1Result<R>> {
    return { success: true, results: this.database.all(this.sql, this.values) as R[] };
  }

  async run(): Promise<D1Result<T>> {
    throw new Error("History read tests must not write.");
  }
}

class HistoryDatabase implements D1DatabaseLike {
  reads: CapturedRead[] = [];
  sheetRows: HistoryRow[] = [];
  rowRows: HistoryRow[] = [];
  nodeRows: HistoryRow[] = [];
  profiles: Array<{ id: string; display_name: string | null; email: string | null }> = [];

  prepare<T = Record<string, unknown>>(sql: string): D1PreparedStatementLike<T> {
    return new HistoryStatement<T>(this, sql);
  }

  first(sql: string, values: D1Value[]) {
    this.reads.push({ sql, values: [...values] });
    return null;
  }

  all(sql: string, values: D1Value[]) {
    this.reads.push({ sql, values: [...values] });
    if (sql.includes("FROM profiles")) return this.profiles;
    if (!sql.includes("FROM estimate_sheet_events")) return [];
    if (sql.includes("target_row_id = ?")) return this.rowRows;
    if (sql.includes("estimate_node_id = ?") || sql.includes("estimate_node_id IN")) return this.nodeRows;
    return this.sheetRows;
  }

  eventReads() {
    return this.reads.filter((read) => read.sql.includes("FROM estimate_sheet_events"));
  }
}

function makeDatabaseRow(id = ROW_ID, overrides: Record<string, unknown> = {}) {
  return {
    id,
    estimate_id: ESTIMATE_ID,
    node_id: NODE_ID,
    description: "Existing description",
    designation: "Floor finish",
    discipline: "Architectural",
    material: "Existing material",
    supplier: "Supplier",
    supplier_id: null,
    quantity: 1,
    quantity_base: null,
    quantity_contingency_amount: null,
    unit: "sqm",
    unit_cost: 950,
    misc_cost: 300,
    contingency_percentage: 0,
    adjustment_percentage: 0,
    source_snapshot: {},
    sort_order: 1000,
    row_revision: 7,
    category_node_id: null,
    source_library_item_id: "88888888-8888-4888-8888-888888888888",
    link_state: "linked-clean",
    metadata: {},
    pricing_provenance_origin: "recorded",
    ...overrides,
  };
}

function makeAuthoritativeRow(id = ROW_ID, overrides: Record<string, unknown> = {}) {
  return {
    id,
    nodeId: NODE_ID,
    material: "Porcelain Tile",
    description: "600 x 600 tile",
    supplier: "Tile Supplier",
    unit: "sqm",
    quantity: 12,
    quantityBase: null,
    quantityContingencyAmount: null,
    unitCost: 950,
    contingencyPercentage: 15,
    contingencyValue: 1710,
    adjustmentPercentage: 0,
    adjustmentValue: 0,
    miscCost: 450,
    sourceLibraryItemId: "88888888-8888-4888-8888-888888888888",
    sourceSnapshot: {},
    metadata: {},
    linkState: "linked-overridden",
    rowRevision: 8,
    ...overrides,
  };
}

function makeEstimateRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: ESTIMATE_ID,
    project_id: PROJECT_ID,
    name: "Client estimate",
    sheet_code: "ES-002",
    currency_code: "PHP",
    notes: null,
    project_budget: null,
    metadata: {},
    created_by: USER_ID,
    created_at: "2026-05-24T00:00:00.000Z",
    updated_at: "2026-05-24T00:00:00.000Z",
    ...overrides,
  };
}

function makeLibraryItem(overrides: Partial<EstimateRowItem> = {}): EstimateRowItem {
  return {
    id: "88888888-8888-4888-8888-888888888888",
    material: "Porcelain Tile",
    description: "600 x 600 tile",
    supplier: "Tile Supplier",
    source: "library",
    unit: "sqm",
    itemCost: 950,
    quantity: 3,
    subTotal: 2850,
    miscCost: 300,
    totalItemCosts: 3150,
    category: "Finishes",
    discipline: "Architectural",
    designation: "Floor Finish",
    sourceLibraryItemId: "88888888-8888-4888-8888-888888888888",
    componentVersionNumber: 2,
    priceOptionId: "99999999-9999-4999-8999-999999999999",
    pricingSource: "Supplier quote",
    pricingDate: "2026-05-24",
    lifecycleState: "available",
    ...overrides,
  };
}

function historyRow(id: string, createdAt: string, overrides: Partial<HistoryRow> = {}): HistoryRow {
  return {
    id,
    event_type: "row_updated",
    event_source: "server_action",
    created_at: createdAt,
    actor_user_id: null,
    estimate_tab_id: "tab-main",
    target_row_id: ROW_ID,
    estimate_node_id: NODE_ID,
    row_context: "{}",
    old_snapshot: null,
    new_snapshot: null,
    changed_fields: "[]",
    total_delta: null,
    payload: "{}",
    correlation_id: MUTATION_ID,
    ...overrides,
  };
}

let database: HistoryDatabase;

beforeEach(() => {
  vi.clearAllMocks();
  database = new HistoryDatabase();
  databaseMocks.requireEstimateD1Database.mockResolvedValue(database);
  authMocks.requireAuth.mockResolvedValue({ id: USER_ID });
  authMocks.requireCurrentUserContext.mockResolvedValue(actor);
  repositoryMocks.getCurrentWorkspaceProject.mockResolvedValue({
    project: { id: PROJECT_ID, name: "Lewis Residence", currency_code: "PHP" },
  });
  repositoryMocks.getCurrentWorkspaceProjectForEstimate.mockResolvedValue({
    project: { id: PROJECT_ID, name: "Lewis Residence", currency_code: "PHP" },
  });
  repositoryMocks.getProjectEstimateTreeByEstimate.mockResolvedValue({
    project: { id: PROJECT_ID }, estimate: { id: ESTIMATE_ID }, tree: [],
  });
  accessIntentMocks.canEditEstimate.mockResolvedValue(true);
  accessIntentMocks.getEstimateActivityRetentionMetrics.mockResolvedValue({
    workspaceEventBytes: 1024,
    workspaceVersionBytes: 2048,
    largestEventPayloadBytes: 512,
    maxEstimateEventCount: 120,
    estimatesOverEventThreshold: 0,
    workspaceStorageOverThreshold: false,
  });
  recordIntentMocks.getEstimateRecordForProject.mockResolvedValue(makeEstimateRecord());
  recordIntentMocks.updateEstimateDetailsWithHistory.mockResolvedValue({ eventId: "details-event" });
  nodeIntentMocks.getEstimateNodeForProject.mockResolvedValue({
    id: NODE_ID, estimate_id: ESTIMATE_ID, estimate_tab_id: null, kind: "area", name: "Flooring",
  });
  nodeIntentMocks.resolveEstimateActivityNodeScope.mockResolvedValue({ nodeIds: [NODE_ID], rowIds: [] });
  rowIntentMocks.getEstimateRowForProject.mockImplementation(async (_db, input) => makeDatabaseRow(input.rowId));
  rowIntentMocks.updateEstimateRowItemWithHistory.mockResolvedValue({
    eventId: "update-event", rowId: ROW_ID, row: makeAuthoritativeRow(),
  });
  rowIntentMocks.replaceEstimateRowItemWithHistory.mockResolvedValue({
    eventId: "replace-event", rowId: ROW_ID, row: makeAuthoritativeRow(),
  });
  rowIntentMocks.deleteEstimateRowItemWithHistory.mockResolvedValue({
    eventId: "delete-event", rowId: ROW_ID, deletedRow: makeAuthoritativeRow(),
  });
  rowIntentMocks.moveEstimateRowComponentWithHistory.mockResolvedValue({
    status: "applied",
    eventId: "move-event",
    sourceRow: makeAuthoritativeRow(ROW_ID, { rowRevision: 12 }),
    targetRow: makeAuthoritativeRow(TARGET_ROW_ID, { rowRevision: 18 }),
  });
  rowIntentMocks.deleteEstimateRowItemsBulkWithHistory.mockResolvedValue({
    status: "applied", eventId: "bulk-delete-event", deletedRowIds: [ROW_ID, TARGET_ROW_ID], deletedRowCount: 2,
  });
  rowIntentMocks.restoreDeletedEstimateRowsWithHistory.mockResolvedValue({
    eventId: "restore-event",
    sourceEventId: "bulk-delete-event",
    restoredRowIds: [ROW_ID, TARGET_ROW_ID],
    restoredRowCount: 2,
    restoredRows: [makeAuthoritativeRow(ROW_ID), makeAuthoritativeRow(TARGET_ROW_ID)],
  });
  rowIntentMocks.insertEstimateRowItemWithHistory.mockResolvedValue({
    eventId: "insert-event", rowId: ROW_ID, row: makeAuthoritativeRow(ROW_ID),
  });
});

describe("estimate action typed row adapters", () => {
  it("rejects optimistic tree parent ids before any database intent", async () => {
    const formData = new FormData();
    formData.set("kind", "area");
    formData.set("name", "New Area Node");
    formData.set("parentId", "optimistic-group-mijv3k-l1a2b3");
    const { createEstimateNode, reorderEstimateTreeNodes } = await import("@/lib/estimates/actions");

    await expect(createEstimateNode(PROJECT_ID, ESTIMATE_ID, formData)).rejects.toThrow("Parent estimate node id is invalid.");
    await expect(reorderEstimateTreeNodes(PROJECT_ID, ESTIMATE_ID, {
      updates: [{ id: NODE_ID, parentId: "optimistic-group-mijv3k-l1a2b3", sortOrder: 10 }],
    })).rejects.toThrow("Estimate tree update parent id is invalid.");

    expect(nodeIntentMocks.createEstimateNodeWithHistory).not.toHaveBeenCalled();
    expect(nodeIntentMocks.reorderEstimateNodesWithHistory).not.toHaveBeenCalled();
  });

  it("passes normalized scalar updates, the authoritative revision, and correlation to the typed row intent", async () => {
    const { updateEstimateRowItem } = await import("@/lib/estimates/actions");

    const result = await updateEstimateRowItem({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      rowId: ROW_ID,
      quantity: 12,
      contingencyPercentage: 15,
      miscCost: 450,
      mutationId: MUTATION_ID,
    });

    expect(rowIntentMocks.updateEstimateRowItemWithHistory).toHaveBeenCalledWith(database, actor, {
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      rowId: ROW_ID,
      expectedRowRevision: 7,
      rowPatch: { quantity: 12, contingencyPercentage: 15, miscCost: 450, linkState: "linked-overridden" },
      correlationId: MUTATION_ID,
    });
    expect(result.rowRevision).toBe(8);
  });

  it("rejects invalid calculation values before invoking the typed row intent", async () => {
    const { updateEstimateRowItem } = await import("@/lib/estimates/actions");

    await expect(updateEstimateRowItem({
      projectId: PROJECT_ID, estimateId: ESTIMATE_ID, rowId: ROW_ID, quantity: -1,
    })).rejects.toMatchObject({ code: "invalid_calculation_input", field: "quantity" });

    expect(rowIntentMocks.updateEstimateRowItemWithHistory).not.toHaveBeenCalled();
  });

  it("keeps manual rows unlinked while preserving the current row revision", async () => {
    rowIntentMocks.getEstimateRowForProject.mockResolvedValue(makeDatabaseRow(ROW_ID, {
      source_library_item_id: null,
      link_state: "unlinked",
    }));
    const { updateEstimateRowItem } = await import("@/lib/estimates/actions");

    await updateEstimateRowItem({
      projectId: PROJECT_ID, estimateId: ESTIMATE_ID, rowId: ROW_ID, miscCost: 450, mutationId: MUTATION_ID,
    });

    expect(rowIntentMocks.updateEstimateRowItemWithHistory).toHaveBeenCalledWith(database, actor, expect.objectContaining({
      expectedRowRevision: 7,
      rowPatch: { miscCost: 450 },
    }));
  });

  it("maps raw and structured revision failures to the stable stale-row error", async () => {
    const rawConflict = Object.assign(new Error("estimate_sheet_row_revision_conflict"), { code: "P0001" });
    rowIntentMocks.updateEstimateRowItemWithHistory.mockRejectedValueOnce(rawConflict);
    const { deleteEstimateRowItemsBulk, updateEstimateRowItem } = await import("@/lib/estimates/actions");

    await expect(updateEstimateRowItem({
      projectId: PROJECT_ID, estimateId: ESTIMATE_ID, rowId: ROW_ID, quantity: 9, expectedRowRevision: 6,
    })).rejects.toMatchObject({
      name: "EstimateRowRevisionConflictError",
      code: "estimate_sheet_row_revision_conflict",
    });

    rowIntentMocks.deleteEstimateRowItemsBulkWithHistory.mockRejectedValueOnce({
      code: "P0001",
      message: "estimate row mutation failed",
      details: "{\"code\":\"estimate_sheet_row_revision_conflict\",\"rowId\":\"row-1\"}",
    });
    await expect(deleteEstimateRowItemsBulk({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      rowIds: [ROW_ID, TARGET_ROW_ID],
      expectedRowRevisions: { [ROW_ID]: 7, [TARGET_ROW_ID]: 17 },
    })).rejects.toMatchObject({
      name: "EstimateRowRevisionConflictError",
      code: "estimate_sheet_row_revision_conflict",
    });
  });

  it("keeps stale-row recovery copy and active-tree refetch behavior", () => {
    const hookSource = readFileSync(join(process.cwd(), "src/hooks/use-estimate-row-mutations.ts"), "utf8");

    expect(hookSource).toContain("This row changed elsewhere. The sheet has been refreshed; review the latest row before saving again.");
    expect(hookSource).toContain("await recoverAuthoritativeTreeAfterConflict(input)");
    expect(hookSource).toContain('const refetchType = rowRevisionConflict && !recoveredAuthoritativeTree ? "active" : "none"');
  });

  it("builds replacement payloads inside the action and delegates raw Library identity to the typed row owner", async () => {
    const libraryItem = makeLibraryItem();
    const { replaceEstimateRowItemWithLibrary } = await import("@/lib/estimates/actions");

    const result = await replaceEstimateRowItemWithLibrary({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      rowId: ROW_ID,
      libraryItem,
      mutationId: MUTATION_ID,
    });

    expect(rowIntentMocks.replaceEstimateRowItemWithHistory).toHaveBeenCalledWith(database, actor, expect.objectContaining({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      rowId: ROW_ID,
      expectedRowRevision: 7,
      correlationId: MUTATION_ID,
      librarySource: libraryItem,
      replacementPayload: expect.objectContaining({
        material: "Porcelain Tile",
        sourceLibraryItemId: libraryItem.sourceLibraryItemId,
        linkState: "linked-clean",
      }),
    }));
    expect(result).toMatchObject({ rowId: ROW_ID, rowRevision: 8 });
  });

  it("removes stale express metadata when a row is replaced by a Library component", async () => {
    rowIntentMocks.getEstimateRowForProject.mockResolvedValue(makeDatabaseRow(ROW_ID, {
      source_library_item_id: null,
      metadata: { expressComponent: { kind: "express", schemaVersion: 1, id: "express-row-1" } },
    }));
    const { replaceEstimateRowItemWithLibrary } = await import("@/lib/estimates/actions");

    await replaceEstimateRowItemWithLibrary({
      projectId: PROJECT_ID, estimateId: ESTIMATE_ID, rowId: ROW_ID, libraryItem: makeLibraryItem(),
    });

    const input = rowIntentMocks.replaceEstimateRowItemWithHistory.mock.calls[0]?.[2];
    expect(input.replacementPayload.metadata).not.toHaveProperty("expressComponent");
    expect(input.replacementPayload.metadata).toMatchObject({
      sourceComponentId: "88888888-8888-4888-8888-888888888888",
    });
  });

  it("delegates delete and component move to one typed mutation each", async () => {
    const { deleteEstimateRowItem, moveEstimateRowComponentWithHistory } = await import("@/lib/estimates/actions");
    const sourceLibraryItem = makeLibraryItem({ id: "source-project-row", source: "project", sourceLibraryItemId: null });
    const targetLibraryItem = makeLibraryItem();

    const deleted = await deleteEstimateRowItem({
      projectId: PROJECT_ID, estimateId: ESTIMATE_ID, rowId: ROW_ID, mutationId: MUTATION_ID,
    });
    const moved = await moveEstimateRowComponentWithHistory({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      sourceRowId: ROW_ID,
      targetRowId: TARGET_ROW_ID,
      sourceLibraryItem,
      targetLibraryItem,
      expectedSourceRowRevision: 11,
      expectedTargetRowRevision: 17,
      mutationId: MUTATION_ID,
    });

    expect(deleted).toMatchObject({ eventId: "delete-event", deletedRowId: ROW_ID });
    expect(rowIntentMocks.deleteEstimateRowItemWithHistory).toHaveBeenCalledTimes(1);
    expect(rowIntentMocks.moveEstimateRowComponentWithHistory).toHaveBeenCalledWith(database, actor, expect.objectContaining({
      sourceRowId: ROW_ID,
      targetRowId: TARGET_ROW_ID,
      expectedSourceRowRevision: 11,
      expectedTargetRowRevision: 17,
      sourceLibraryItem,
      targetLibraryItem,
    }));
    expect(moved).toMatchObject({
      status: "applied",
      sourceRow: { rowId: ROW_ID, rowRevision: 12 },
      targetRow: { rowId: TARGET_ROW_ID, rowRevision: 18 },
    });
  });

  it("bulk-deletes in one typed intent and preserves conflict results as values", async () => {
    const { deleteEstimateRowItemsBulk } = await import("@/lib/estimates/actions");
    const applied = await deleteEstimateRowItemsBulk({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      rowIds: [ROW_ID, TARGET_ROW_ID],
      expectedRowRevisions: { [ROW_ID]: 7, [TARGET_ROW_ID]: 17 },
      mutationId: MUTATION_ID,
    });

    expect(applied).toEqual({
      status: "applied", eventId: "bulk-delete-event", deletedRowIds: [ROW_ID, TARGET_ROW_ID], deletedRowCount: 2,
    });
    expect(rowIntentMocks.deleteEstimateRowItemsBulkWithHistory).toHaveBeenCalledTimes(1);

    rowIntentMocks.deleteEstimateRowItemsBulkWithHistory.mockResolvedValueOnce({
      status: "conflict",
      conflictRowIds: [TARGET_ROW_ID],
      authoritativeRows: [makeAuthoritativeRow(TARGET_ROW_ID, { material: "Authoritative Tile", rowRevision: 18 })],
    });
    const conflict = await deleteEstimateRowItemsBulk({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      rowIds: [ROW_ID, TARGET_ROW_ID],
      expectedRowRevisions: { [ROW_ID]: 7, [TARGET_ROW_ID]: 17 },
    });
    expect(conflict).toMatchObject({
      status: "conflict",
      conflictRowIds: [TARGET_ROW_ID],
      authoritativeRows: [{ rowId: TARGET_ROW_ID, material: "Authoritative Tile", rowRevision: 18 }],
    });
  });

  it("refuses bulk delete before the typed intent when any revision is missing", async () => {
    const { deleteEstimateRowItemsBulk } = await import("@/lib/estimates/actions");

    await expect(deleteEstimateRowItemsBulk({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      rowIds: [ROW_ID, TARGET_ROW_ID],
      expectedRowRevisions: { [ROW_ID]: 7 },
    })).rejects.toThrow("current revision for every selected row");

    expect(rowIntentMocks.deleteEstimateRowItemsBulkWithHistory).not.toHaveBeenCalled();
  });

  it("adapts typed restore results including authoritative restored rows", async () => {
    const { restoreDeletedEstimateRows } = await import("@/lib/estimates/actions");

    const result = await restoreDeletedEstimateRows({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      sourceEventId: "bulk-delete-event",
      rowIds: [ROW_ID, TARGET_ROW_ID],
      mutationId: MUTATION_ID,
    });

    expect(rowIntentMocks.restoreDeletedEstimateRowsWithHistory).toHaveBeenCalledWith(database, actor, {
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      activeTabId: null,
      sourceEventId: "bulk-delete-event",
      rowIds: [ROW_ID, TARGET_ROW_ID],
      correlationId: MUTATION_ID,
    });
    expect(result).toMatchObject({
      eventId: "restore-event",
      sourceEventId: "bulk-delete-event",
      restoredRowIds: [ROW_ID, TARGET_ROW_ID],
      restoredRowCount: 2,
    });
    expect(result.restoredRows).toHaveLength(2);
  });

  it("inserts Library rows through the typed owner with compact row payload and raw source", async () => {
    const libraryItem = makeLibraryItem();
    const { insertEstimateRowItemFromLibrary } = await import("@/lib/estimates/actions");

    await insertEstimateRowItemFromLibrary({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      targetNodeId: NODE_ID,
      rowId: ROW_ID,
      libraryItem,
      mutationId: MUTATION_ID,
    });

    expect(rowIntentMocks.insertEstimateRowItemWithHistory).toHaveBeenCalledWith(database, actor, expect.objectContaining({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      nodeId: NODE_ID,
      librarySource: libraryItem,
      correlationId: MUTATION_ID,
      rowPayload: expect.objectContaining({
        id: ROW_ID,
        material: "Porcelain Tile",
        sourceLibraryItemId: libraryItem.sourceLibraryItemId,
      }),
    }));
  });

  it("updates estimate details through the typed record owner and returns the authoritative readback", async () => {
    recordIntentMocks.getEstimateRecordForProject.mockResolvedValue(makeEstimateRecord({ name: "Updated estimate" }));
    const { updateEstimateDetails } = await import("@/lib/estimates/actions");

    const result = await updateEstimateDetails({
      projectId: PROJECT_ID, estimateId: ESTIMATE_ID, name: " Updated estimate ", notes: " Client note ",
    });

    expect(recordIntentMocks.updateEstimateDetailsWithHistory).toHaveBeenCalledWith(database, actor, expect.objectContaining({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      patch: { name: "Updated estimate", notes: "Client note" },
    }));
    expect(recordIntentMocks.getEstimateRecordForProject).toHaveBeenLastCalledWith(database, {
      projectId: PROJECT_ID, estimateId: ESTIMATE_ID,
    });
    expect(result.estimate.name).toBe("Updated estimate");
  });

  it("uses typed owners without exposing version mutations or façade dispatch", async () => {
    const actions = await import("@/lib/estimates/actions");
    const actionsSource = readFileSync(join(process.cwd(), "src/lib/estimates/actions.ts"), "utf8");
    const historySource = readFileSync(join(process.cwd(), "src/lib/estimates/d1-intents/history-events.ts"), "utf8");

    expect(actions).not.toHaveProperty("createEstimateSheetVersion");
    expect(actions).not.toHaveProperty("restoreEstimateSheetVersionAsCopy");
    expect(actionsSource).toContain("return readEstimateSheetVersionControl(database");
    expect(actionsSource).not.toContain("d1-action-client");
    expect(actionsSource).not.toContain("dataStore.call(");
    expect(historySource).toContain("FROM estimate_sheet_events");
    expect(historySource).toContain("ORDER BY created_at DESC, id DESC");
  });
});

describe("typed version-control history reads", () => {
  it("owns the bounded cursor contract in the history module and type-re-exports it from actions", () => {
    const actionsSource = readFileSync(join(process.cwd(), "src/lib/estimates/actions.ts"), "utf8");
    const historySource = readFileSync(join(process.cwd(), "src/lib/estimates/d1-intents/history-events.ts"), "utf8");

    expect(actionsSource).toContain("EstimateSheetHistoryCursor,");
    expect(actionsSource).toContain("const boundedEventLimit = Math.min(Math.max(Math.trunc(eventLimit), 1), 100)");
    expect(historySource).toContain("nextCursor: EstimateSheetHistoryCursor | null;");
    expect(historySource).toContain("input.eventLimit + 1");
    expect(historySource).toContain("DORMANT_NAMED_VERSION_EVENT_TYPES");
  });

  it("returns limit-plus-one pagination, excludes dormant events, and preserves cursor precision", async () => {
    database.sheetRows = [
      historyRow("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "2026-05-24T03:00:00.000Z"),
      historyRow("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "2026-05-24T02:30:00.000Z", {
        event_type: "sheet_version_created",
      }),
      historyRow("cccccccc-cccc-4ccc-8ccc-cccccccccccc", "2026-05-24T02:00:00.000Z", {
        event_type: "sheet_code_updated",
      }),
    ];
    const { fetchEstimateSheetVersionControl } = await import("@/lib/estimates/actions");

    const result = await fetchEstimateSheetVersionControl({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      eventLimit: 1,
      sheetCursor: {
        createdAt: "2026-05-24T04:00:00.123456+00:00",
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      },
    });

    const query = database.eventReads()[0]!;
    expect(query.values.at(-1)).toBe(2);
    expect(query.values).toEqual(expect.arrayContaining([
      "sheet_version_created",
      "sheet_restored_as_copy",
      "2026-05-24T04:00:00.123456+00:00",
    ]));
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.estimateTabId).toBe("tab-main");
    expect(result.nextCursor).toEqual({
      createdAt: "2026-05-24T03:00:00.000Z",
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    expect(result.rowEvents).toEqual([]);
  });

  it("runs only the selected row or direct-node lane", async () => {
    database.rowRows = [historyRow("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "2026-05-24T03:00:00.000Z")];
    const { fetchEstimateSheetVersionControl } = await import("@/lib/estimates/actions");

    const rowResult = await fetchEstimateSheetVersionControl({
      projectId: PROJECT_ID, estimateId: ESTIMATE_ID, rowId: ROW_ID, scope: "row",
    });
    expect(database.eventReads()).toHaveLength(1);
    expect(database.eventReads()[0]?.sql).toContain("target_row_id = ?");
    expect(rowResult.events).toEqual([]);
    expect(rowResult.rowEvents).toHaveLength(1);

    database.reads = [];
    database.nodeRows = [historyRow("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "2026-05-24T02:00:00.000Z")];
    const nodeResult = await fetchEstimateSheetVersionControl({
      projectId: PROJECT_ID, estimateId: ESTIMATE_ID, nodeId: NODE_ID, scope: "node",
    });
    expect(database.eventReads()).toHaveLength(1);
    expect(database.eventReads()[0]?.sql).toContain("estimate_node_id = ?");
    expect(nodeResult.events).toEqual([]);
    expect(nodeResult.nodeEvents).toHaveLength(1);
  });

  it("passes descendant node scope into the typed history owner", async () => {
    nodeIntentMocks.resolveEstimateActivityNodeScope.mockResolvedValue({
      nodeIds: [NODE_ID, "area-1", "area-2"],
      rowIds: [ROW_ID, TARGET_ROW_ID],
    });
    const { fetchEstimateSheetVersionControl } = await import("@/lib/estimates/actions");

    await fetchEstimateSheetVersionControl({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      nodeId: NODE_ID,
      includeDescendants: true,
      scope: "node",
    });

    expect(nodeIntentMocks.resolveEstimateActivityNodeScope).toHaveBeenCalledWith(database, {
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      nodeId: NODE_ID,
      includeDescendants: true,
    });
    const query = database.eventReads()[0]!;
    expect(query.sql).toContain("estimate_node_id IN (?, ?, ?)");
    expect(query.sql).toContain("target_row_id IN (?, ?)");
    expect(query.values).toEqual(expect.arrayContaining([NODE_ID, "area-1", "area-2", ROW_ID, TARGET_ROW_ID]));
  });

  it("applies canonical event filters, date range, and safe search in D1 SQL", async () => {
    const { fetchEstimateSheetVersionControl } = await import("@/lib/estimates/actions");

    await fetchEstimateSheetVersionControl({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      scope: "sheet",
      eventTypes: ["row_updated", "template_inserted"],
      dateFrom: "2026-05-01T00:00:00.000Z",
      dateTo: "2026-05-25T00:00:00.000Z",
      search: "hardwood",
    });

    const query = database.eventReads()[0]!;
    expect(query.sql).toContain("event_type IN (?, ?, ?, ?, ?)");
    expect(query.sql).toContain("created_at >= ?");
    expect(query.sql).toContain("created_at <= ?");
    expect(query.sql).toContain("json_extract(row_context, '$.material') LIKE ? COLLATE NOCASE");
    expect(query.values).toEqual(expect.arrayContaining([
      "row_updated",
      "estimate_row_updated",
      "template_inserted",
      "estimate_template_inserted",
      "template_node_subtree_inserted",
      "2026-05-01T00:00:00.000Z",
      "2026-05-25T00:00:00.000Z",
      "%hardwood%",
    ]));
  });

  it("rejects unsafe search and invalid cursor values before event SQL", async () => {
    const { fetchEstimateSheetVersionControl } = await import("@/lib/estimates/actions");

    await expect(fetchEstimateSheetVersionControl({
      projectId: PROJECT_ID, estimateId: ESTIMATE_ID, search: "bad,value",
    })).rejects.toThrow("Activity search contains unsupported characters.");
    await expect(fetchEstimateSheetVersionControl({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      sheetCursor: { createdAt: "not-a-date", id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
    })).rejects.toThrow("Estimate activity cursor timestamp is invalid.");

    expect(database.eventReads()).toHaveLength(0);
  });

  it("enriches actors from visible profile name or normalized email", async () => {
    database.sheetRows = [
      historyRow("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "2026-05-24T03:00:00.000Z", {
        actor_user_id: USER_ID,
      }),
      historyRow("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "2026-05-24T02:00:00.000Z", {
        actor_user_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      }),
    ];
    database.profiles = [
      { id: USER_ID, display_name: "Philip Lewis", email: "owner@example.test" },
      { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", display_name: null, email: "philipjonlewis@gmail.com" },
    ];
    const { fetchEstimateSheetVersionControl } = await import("@/lib/estimates/actions");

    const result = await fetchEstimateSheetVersionControl({
      projectId: PROJECT_ID, estimateId: ESTIMATE_ID, scope: "sheet",
    });

    expect(database.reads.find((read) => read.sql.includes("FROM profiles"))?.values).toEqual([
      USER_ID, "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    ]);
    expect(result.events.map((event) => event.actorLabel)).toEqual(["Philip Lewis", "Philip Lewis"]);
    expect(result.events[0]).not.toHaveProperty("actorEmail");
    expect(result.events[1]).not.toHaveProperty("actorEmail");
    expect(JSON.stringify(result.events)).not.toContain("owner@example.test");
    expect(JSON.stringify(result.events)).not.toContain("philipjonlewis@gmail.com");
  });

  it("returns typed read-only retention metrics", async () => {
    const { fetchEstimateActivityRetentionMetrics } = await import("@/lib/estimates/actions");

    const result = await fetchEstimateActivityRetentionMetrics({ projectId: PROJECT_ID });

    expect(accessIntentMocks.getEstimateActivityRetentionMetrics).toHaveBeenCalledWith(database, { projectId: PROJECT_ID });
    expect(result).toEqual({
      workspaceEventBytes: 1024,
      workspaceVersionBytes: 2048,
      largestEventPayloadBytes: 512,
      maxEstimateEventCount: 120,
      estimatesOverEventThreshold: 0,
      workspaceStorageOverThreshold: false,
    });
  });
});
