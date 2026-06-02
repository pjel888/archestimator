import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const repositoryMocks = vi.hoisted(() => ({
  getCurrentWorkspaceProject: vi.fn(),
  getProjectEstimateTreeByEstimate: vi.fn(),
}));

const supabaseServerMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  requireCurrentUserContext: vi.fn(),
}));

const nextCacheMocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}));

const nextNavigationMocks = vi.hoisted(() => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/repositories/workspace-repository", () => repositoryMocks);
vi.mock("@/lib/supabase/server", () => supabaseServerMocks);
vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("next/cache", () => nextCacheMocks);
vi.mock("next/navigation", () => nextNavigationMocks);

type QueryResult<T> = { data: T; error: Error | null };

function queryResult<T>(result: QueryResult<T>) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    not: vi.fn(() => builder),
    or: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    ilike: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    in: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result),
    single: vi.fn(async () => result),
    then: (resolve: (value: QueryResult<T>) => void) => Promise.resolve(result).then(resolve),
  };
  return builder;
}

function makeLibraryItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
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
    categoryNodeId: "finishes-flooring",
    brand: "Tile Brand",
    brandId: "55555555-5555-4555-8555-555555555555",
    supplierId: "22222222-2222-4222-8222-222222222222",
    discipline: "Architectural",
    designation: "Floor Finish",
    tags: ["tile"],
    sourceLibraryItemId: "11111111-1111-4111-8111-111111111111",
    componentVersionId: "33333333-3333-4333-8333-333333333333",
    componentVersionNumber: 2,
    priceOptionId: "44444444-4444-4444-8444-444444444444",
    pricingSource: "Supplier quote",
    pricingDate: "2026-05-24",
    confidence: "quoted",
    lifecycleState: "available",
    ...overrides,
  };
}

function makeSupabase({
  rowRevision = 7,
  sourceLibraryItemId = "33333333-3333-4333-8333-333333333333",
  canEditEstimate = true,
  rpcData,
}: {
  rowRevision?: number;
  sourceLibraryItemId?: string | null;
  canEditEstimate?: boolean;
  rpcData?: unknown;
} = {}) {
  const rowQuery = queryResult({
    data: {
      id: "row-1",
      node_id: "node-1",
      estimate_id: "estimate-1",
      source_library_item_id: sourceLibraryItemId,
      link_state: sourceLibraryItemId ? "linked-clean" : "unlinked",
      row_revision: rowRevision,
      estimate_nodes: { id: "node-1", kind: "area", estimates: { project_id: "project-1" } },
    },
    error: null,
  });
  const targetNodeQuery = queryResult({
    data: {
      id: "node-1",
      estimate_id: "estimate-1",
      kind: "area",
      estimates: { project_id: "project-1" },
    },
    error: null,
  });
  const existingRowsQuery = queryResult({ data: [{ sort_order: 4 }], error: null });
  const supabase = {
    rpc: vi.fn(async (fn: string) => {
      if (fn === "can_edit_estimate") return { data: canEditEstimate, error: null };

      return {
        data: rpcData ?? {
          rowId: "row-1",
          row: {
            id: "row-1",
            nodeId: "node-1",
            quantity: 12,
            unitCost: 950,
            contingencyPercentage: 15,
            contingencyValue: 1710,
            miscCost: 450,
            linkState: "linked-overridden",
            rowRevision: rowRevision + 1,
          },
        },
        error: null,
      };
    }),
    from: vi.fn((table: string) => {
      if (table === "estimate_row_items") return rowQuery;
      if (table === "estimate_nodes") return targetNodeQuery;
      throw new Error(`Unexpected table ${table}`);
    }),
    rowQuery,
    targetNodeQuery,
    existingRowsQuery,
  };
  rowQuery.order.mockImplementation(() => existingRowsQuery);
  existingRowsQuery.limit.mockImplementation(() => existingRowsQuery);
  return supabase;
}

function makeEstimateRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "estimate-1",
    project_id: "project-1",
    name: "Client estimate",
    sheet_code: "ES-002",
    currency_code: "PHP",
    metadata: {},
    created_by: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    created_at: "2026-05-24T00:00:00.000Z",
    updated_at: "2026-05-24T00:00:00.000Z",
    ...overrides,
  };
}

function makeEstimateSupabase({
  rpcData = { eventId: "event-1", versionId: "version-1", versionNumber: 2, versionLabel: "V2", summary: { total: 1000 } },
  estimate = makeEstimateRecord(),
  estimateCodes = [{ id: "estimate-1", sheet_code: "ES-001" }],
}: {
  rpcData?: unknown;
  estimate?: Record<string, unknown>;
  estimateCodes?: Array<Record<string, unknown>>;
} = {}) {
  const estimateQueries = [
    queryResult({ data: estimateCodes, error: null }),
    queryResult({ data: estimate, error: null }),
  ];
  const supabase = {
    rpc: vi.fn(async () => ({ data: rpcData, error: null })),
    from: vi.fn((table: string) => {
      if (table === "estimates") return estimateQueries.shift() ?? queryResult({ data: estimate, error: null });
      throw new Error(`Unexpected table ${table}`);
    }),
  };
  return supabase;
}

describe("estimate sheet version control server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repositoryMocks.getCurrentWorkspaceProject.mockResolvedValue({ project: { id: "project-1" } });
    repositoryMocks.getProjectEstimateTreeByEstimate.mockResolvedValue({
      project: { id: "project-1" },
      estimate: { id: "estimate-1" },
      tree: [],
    });
    authMocks.requireCurrentUserContext.mockResolvedValue({ userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });
  });

  it("updates row scalar fields through the history RPC with row revision and mutation id", async () => {
    const supabase = makeSupabase();
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);
    const { updateEstimateRowItem } = await import("@/lib/estimates/actions");

    const result = await updateEstimateRowItem({
      projectId: "project-1",
      estimateId: "estimate-1",
      rowId: "row-1",
      quantity: 12,
      contingencyPercentage: 15,
      miscCost: 450,
      mutationId: "55555555-5555-4555-8555-555555555555",
    });

    expect(supabase.rpc).toHaveBeenCalledWith("update_estimate_row_item_with_history", {
      target_project_id: "project-1",
      target_estimate_id: "estimate-1",
      target_row_id: "row-1",
      expected_row_revision: 7,
      row_patch: { quantity: 12, contingencyPercentage: 15, miscCost: 450, linkState: "linked-overridden" },
      acting_user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlation_id: "55555555-5555-4555-8555-555555555555",
    });
    expect(result.rowRevision).toBe(8);
  });

  it("keeps manual row scalar updates unlinked in the history RPC patch", async () => {
    const supabase = makeSupabase({ sourceLibraryItemId: null });
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);
    const { updateEstimateRowItem } = await import("@/lib/estimates/actions");

    await updateEstimateRowItem({
      projectId: "project-1",
      estimateId: "estimate-1",
      rowId: "row-1",
      miscCost: 450,
      mutationId: "55555555-5555-4555-8555-555555555555",
    });

    expect(supabase.rpc).toHaveBeenCalledWith("update_estimate_row_item_with_history", expect.objectContaining({
      row_patch: { miscCost: 450 },
    }));
  });

  it("replaces row source through the history RPC with the existing row revision", async () => {
    const supabase = makeSupabase();
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);
    const { replaceEstimateRowItemWithLibrary } = await import("@/lib/estimates/actions");

    await replaceEstimateRowItemWithLibrary({
      projectId: "project-1",
      estimateId: "estimate-1",
      rowId: "row-1",
      libraryItem: makeLibraryItem(),
      mutationId: "66666666-6666-4666-8666-666666666666",
    });

    expect(supabase.rpc).toHaveBeenCalledWith("replace_estimate_row_item_with_history", expect.objectContaining({
      target_project_id: "project-1",
      target_estimate_id: "estimate-1",
      target_row_id: "row-1",
      expected_row_revision: 7,
      acting_user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlation_id: "66666666-6666-4666-8666-666666666666",
    }));
    expect(supabase.rpc.mock.calls[0][1].replacement_payload).toMatchObject({
      material: "Porcelain Tile",
      sourceLibraryItemId: "11111111-1111-4111-8111-111111111111",
      sourceSnapshot: expect.objectContaining({
        brand: "Tile Brand",
        brandId: "55555555-5555-4555-8555-555555555555",
        supplier: "Tile Supplier",
      }),
      contingencyPercentage: 0,
      linkState: "linked-clean",
    });
  });

  it("deletes row items through the history RPC before removing data", async () => {
    const supabase = makeSupabase();
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);
    const { deleteEstimateRowItem } = await import("@/lib/estimates/actions");

    await deleteEstimateRowItem({
      projectId: "project-1",
      estimateId: "estimate-1",
      rowId: "row-1",
      mutationId: "77777777-7777-4777-8777-777777777777",
    });

    expect(supabase.rpc).toHaveBeenCalledWith("delete_estimate_row_item_with_history", {
      target_project_id: "project-1",
      target_estimate_id: "estimate-1",
      target_row_id: "row-1",
      expected_row_revision: 7,
      acting_user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlation_id: "77777777-7777-4777-8777-777777777777",
    });
  });

  it("detaches linked row items through a revision-aware history RPC", async () => {
    const supabase = makeSupabase({
      rpcData: {
        rowId: "row-1",
        row: {
          id: "row-1",
          nodeId: "node-1",
          quantity: 3,
          unitCost: 950,
          contingencyPercentage: 0,
          contingencyValue: 0,
          miscCost: 300,
          linkState: "detached",
          rowRevision: 8,
        },
      },
    });
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);
    const { detachEstimateRowItemFromLibrary } = await import("@/lib/estimates/actions");

    const result = await detachEstimateRowItemFromLibrary({
      projectId: "project-1",
      estimateId: "estimate-1",
      rowId: "row-1",
      reason: "Client-specific finish",
      mutationId: "99999999-9999-4999-8999-999999999999",
    });

    expect(supabase.rpc).toHaveBeenCalledWith("unlink_estimate_row_item_from_library_with_history", {
      target_project_id: "project-1",
      target_estimate_id: "estimate-1",
      target_row_id: "row-1",
      expected_row_revision: 7,
      reason: "Client-specific finish",
      acting_user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlation_id: "99999999-9999-4999-8999-999999999999",
    });
    expect(result).toMatchObject({
      rowId: "row-1",
      linkState: "detached",
      rowRevision: 8,
    });
    expect(nextCacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop/projects/project-1/estimates/node-1");
  });

  it("blocks project-specific row detach when the caller cannot edit the estimate", async () => {
    const supabase = makeSupabase({ canEditEstimate: false });
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);
    const { detachEstimateRowItemFromLibrary } = await import("@/lib/estimates/actions");

    await expect(
      detachEstimateRowItemFromLibrary({
        projectId: "project-1",
        estimateId: "estimate-1",
        rowId: "row-1",
        reason: "Client-specific finish",
      }),
    ).rejects.toThrow("Estimate edit access denied.");

    expect(supabase.rpc).toHaveBeenCalledWith("can_edit_estimate", { target_estimate_id: "estimate-1" });
    expect(supabase.rpc).not.toHaveBeenCalledWith("unlink_estimate_row_item_from_library_with_history", expect.anything());
  });

  it("inserts library rows through the history RPC with a compact row payload", async () => {
    const supabase = makeSupabase();
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);
    const { insertEstimateRowItemFromLibrary } = await import("@/lib/estimates/actions");

    await insertEstimateRowItemFromLibrary({
      projectId: "project-1",
      estimateId: "estimate-1",
      targetNodeId: "node-1",
      rowId: "99999999-9999-4999-8999-999999999999",
      libraryItem: makeLibraryItem(),
      mutationId: "88888888-8888-4888-8888-888888888888",
    });

    expect(supabase.rpc).toHaveBeenCalledWith("insert_estimate_row_item_with_history", expect.objectContaining({
      target_project_id: "project-1",
      target_estimate_id: "estimate-1",
      target_node_id: "node-1",
      acting_user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlation_id: "88888888-8888-4888-8888-888888888888",
    }));
    expect(supabase.rpc.mock.calls[0][1].row_payload).toMatchObject({
      id: "99999999-9999-4999-8999-999999999999",
      sortOrder: 5,
      material: "Porcelain Tile",
      contingencyPercentage: 0,
      sourceLibraryItemId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("updates estimate details through the history RPC", async () => {
    const supabase = makeEstimateSupabase({ estimate: makeEstimateRecord({ name: "Renamed estimate", sheet_code: "ES-009" }) });
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);
    const { updateEstimateDetails } = await import("@/lib/estimates/actions");

    const result = await updateEstimateDetails({
      projectId: "project-1",
      estimateId: "estimate-1",
      name: "Renamed estimate",
      sheetCode: "ES-009",
    });

    expect(supabase.rpc).toHaveBeenCalledWith("update_estimate_details_with_history", expect.objectContaining({
      target_project_id: "project-1",
      target_estimate_id: "estimate-1",
      estimate_patch: { name: "Renamed estimate", sheetCode: "ES-009" },
      acting_user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    }));
    expect(result.name).toBe("Renamed estimate");
    expect(result.sheet_code).toBe("ES-009");
  });

  it("does not expose named sheet version RPC helpers from estimate actions", async () => {
    const actions = await import("@/lib/estimates/actions");

    expect(actions).not.toHaveProperty("createEstimateSheetVersion");
    expect(actions).not.toHaveProperty("restoreEstimateSheetVersionAsCopy");
  });

  it("keeps hardcoded history RPC names aligned with generated Supabase function types", () => {
    const actionsSource = readFileSync(join(process.cwd(), "src/lib/estimates/actions.ts"), "utf8");
    const generatedTypesSource = readFileSync(join(process.cwd(), "src/lib/supabase/types.ts"), "utf8");
    const rpcNames = Array.from(actionsSource.matchAll(/asEstimateHistoryRpcClient\(supabase\)\.rpc\("([^"]+)"/g))
      .map((match) => match[1])
      .sort();
    const unionNames = Array.from(actionsSource.matchAll(/\|\s*"([^"]+_with_history|update_estimate_details_with_history|delete_estimate_node_with_history)"/g))
      .map((match) => match[1]);

    const uniqueRpcNames = Array.from(new Set(rpcNames));

    expect(uniqueRpcNames.length).toBeGreaterThan(0);
    for (const rpcName of uniqueRpcNames) {
      expect(unionNames).toContain(rpcName);
      expect(generatedTypesSource).toContain(`${rpcName}: {`);
    }
  });

  it("documents the current bounded cursor version-control read contract", () => {
    const actionsSource = readFileSync(join(process.cwd(), "src/lib/estimates/actions.ts"), "utf8");

    expect(actionsSource).toContain("export type EstimateSheetHistoryCursor = {");
    expect(actionsSource).toContain("type FetchEstimateSheetVersionControlInput = {");
    expect(actionsSource).toContain("rowId?: string;");
    expect(actionsSource).toContain("nodeId?: string;");
    expect(actionsSource).toContain("includeDescendants?: boolean;");
    expect(actionsSource).toContain("eventTypes?: string[];");
    expect(actionsSource).toContain("dateFrom?: string;");
    expect(actionsSource).toContain("dateTo?: string;");
    expect(actionsSource).toContain("search?: string;");
    expect(actionsSource).toContain("eventLimit?: number;");
    expect(actionsSource).toContain("sheetCursor?: EstimateSheetHistoryCursor | null;");
    expect(actionsSource).toContain("rowCursor?: EstimateSheetHistoryCursor | null;");
    expect(actionsSource).toContain("scope?: EstimateSheetHistoryReadScope;");
    expect(actionsSource).toContain("export type EstimateSheetVersionControlData = {");
    expect(actionsSource).toContain("events: EstimateSheetHistoryEvent[];");
    expect(actionsSource).toContain("rowEvents: EstimateSheetHistoryEvent[];");
    expect(actionsSource).toContain("nodeEvents: EstimateSheetHistoryEvent[];");
    expect(actionsSource).toContain("nextCursor: EstimateSheetHistoryCursor | null;");
    expect(actionsSource).toContain("rowNextCursor: EstimateSheetHistoryCursor | null;");
    expect(actionsSource).toContain("nodeNextCursor: EstimateSheetHistoryCursor | null;");
    expect(actionsSource).toContain("const boundedEventLimit = Math.min(Math.max(Math.trunc(eventLimit), 1), 100)");
    expect(actionsSource).toContain(".limit(boundedEventLimit + 1)");
    expect(actionsSource).toContain("function normalizeHistoryCursor");
    expect(actionsSource).toContain("function buildHistoryCursorFilter");
    expect(actionsSource).toContain("DORMANT_NAMED_VERSION_EVENT_TYPES");
    expect(actionsSource).toContain("export async function fetchEstimateActivityRetentionMetrics");
  });

  it("returns a next cursor from limit-plus-one sheet activity reads", async () => {
    const estimateQuery = queryResult({ data: { id: "estimate-1", project_id: "project-1" }, error: null });
    const eventRows = [
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        event_type: "row_updated",
        event_source: "server_action",
        created_at: "2026-05-24T03:00:00.000Z",
        actor_user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        target_row_id: "row-1",
        estimate_node_id: "node-1",
        row_context: {},
        old_snapshot: null,
        new_snapshot: null,
        changed_fields: [],
        total_delta: null,
        payload: {},
        correlation_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      },
      {
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        event_type: "row_updated",
        event_source: "server_action",
        created_at: "2026-05-24T02:00:00.000Z",
        actor_user_id: null,
        target_row_id: "row-2",
        estimate_node_id: "node-1",
        row_context: {},
        old_snapshot: null,
        new_snapshot: null,
        changed_fields: [],
        total_delta: null,
        payload: {},
        correlation_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      },
    ];
    const eventsQuery = queryResult({ data: eventRows, error: null });
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "estimates") return estimateQuery;
        if (table === "estimate_sheet_events") return eventsQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);
    const { fetchEstimateSheetVersionControl } = await import("@/lib/estimates/actions");

    const result = await fetchEstimateSheetVersionControl({
      projectId: "project-1",
      estimateId: "estimate-1",
      eventLimit: 1,
      sheetCursor: {
        createdAt: "2026-05-24T04:00:00.000Z",
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      },
    });

    expect(eventsQuery.limit).toHaveBeenCalledWith(2);
    expect(eventsQuery.not).toHaveBeenCalledWith("event_type", "in", "(sheet_version_created,sheet_restored_as_copy)");
    expect(eventsQuery.or).toHaveBeenCalledWith(
      "created_at.lt.2026-05-24T04:00:00.000Z,and(created_at.eq.2026-05-24T04:00:00.000Z,id.lt.aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa)",
    );
    expect(result.events).toHaveLength(1);
    expect(result.nextCursor).toEqual({
      createdAt: "2026-05-24T03:00:00.000Z",
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });
    expect(result.rowEvents).toEqual([]);
    expect(result.rowNextCursor).toBeNull();
  });

  it("preserves cursor timestamp precision in keyset filters", async () => {
    const estimateQuery = queryResult({ data: { id: "estimate-1", project_id: "project-1" }, error: null });
    const eventsQuery = queryResult({ data: [], error: null });
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "estimates") return estimateQuery;
        if (table === "estimate_sheet_events") return eventsQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);
    const { fetchEstimateSheetVersionControl } = await import("@/lib/estimates/actions");

    await fetchEstimateSheetVersionControl({
      projectId: "project-1",
      estimateId: "estimate-1",
      eventLimit: 1,
      sheetCursor: {
        createdAt: "2026-05-24T04:00:00.123456+00:00",
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      },
    });

    expect(eventsQuery.or).toHaveBeenCalledWith(
      "created_at.lt.2026-05-24T04:00:00.123456+00:00,and(created_at.eq.2026-05-24T04:00:00.123456+00:00,id.lt.aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa)",
    );
  });

  it("filters dormant named-version event rows out of returned Activity data", async () => {
    const estimateQuery = queryResult({ data: { id: "estimate-1", project_id: "project-1" }, error: null });
    const eventRows = [
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        event_type: "sheet_version_created",
        event_source: "server_action",
        created_at: "2026-05-24T03:00:00.000Z",
        actor_user_id: null,
        target_row_id: null,
        estimate_node_id: null,
        row_context: {},
        old_snapshot: null,
        new_snapshot: null,
        changed_fields: [],
        total_delta: null,
        payload: { versionLabel: "V2" },
        correlation_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      },
      {
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        event_type: "sheet_restored_as_copy",
        event_source: "server_action",
        created_at: "2026-05-24T02:30:00.000Z",
        actor_user_id: null,
        target_row_id: null,
        estimate_node_id: null,
        row_context: {},
        old_snapshot: null,
        new_snapshot: null,
        changed_fields: [],
        total_delta: null,
        payload: { newSheetCode: "QA-ROLLBACK-0524" },
        correlation_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      },
      {
        id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
        event_type: "sheet_code_updated",
        event_source: "server_action",
        created_at: "2026-05-24T02:00:00.000Z",
        actor_user_id: null,
        target_row_id: null,
        estimate_node_id: null,
        row_context: {},
        old_snapshot: { sheetCode: "ES-001" },
        new_snapshot: { sheetCode: "ES-002" },
        changed_fields: ["sheetCode"],
        total_delta: null,
        payload: {},
        correlation_id: "99999999-9999-4999-8999-999999999999",
      },
    ];
    const eventsQuery = queryResult({ data: eventRows, error: null });
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "estimates") return estimateQuery;
        if (table === "estimate_sheet_events") return eventsQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);
    const { fetchEstimateSheetVersionControl } = await import("@/lib/estimates/actions");

    const result = await fetchEstimateSheetVersionControl({
      projectId: "project-1",
      estimateId: "estimate-1",
      eventLimit: 10,
    });

    expect(eventsQuery.not).toHaveBeenCalledWith("event_type", "in", "(sheet_version_created,sheet_restored_as_copy)");
    expect(result.events.map((event) => event.eventType)).toEqual(["sheet_code_updated"]);
  });

  it("supports row-only reads without querying the sheet activity lane", async () => {
    const estimateQuery = queryResult({ data: { id: "estimate-1", project_id: "project-1" }, error: null });
    const rowEventsQuery = queryResult({ data: [], error: null });
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "estimates") return estimateQuery;
        if (table === "estimate_sheet_events") return rowEventsQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);
    const { fetchEstimateSheetVersionControl } = await import("@/lib/estimates/actions");

    const result = await fetchEstimateSheetVersionControl({
      projectId: "project-1",
      estimateId: "estimate-1",
      rowId: "row-1",
      scope: "row",
    });

    expect(supabase.from).toHaveBeenCalledTimes(2);
    expect(rowEventsQuery.eq).toHaveBeenCalledWith("target_row_id", "row-1");
    expect(result.events).toEqual([]);
    expect(result.nodeEvents).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });

  it("supports direct node-scoped reads without querying unused sheet or row lanes", async () => {
    const estimateQuery = queryResult({ data: { id: "estimate-1", project_id: "project-1" }, error: null });
    const nodeQuery = queryResult({ data: { id: "node-1", estimate_id: "estimate-1", parent_id: null, kind: "area", estimates: { project_id: "project-1" } }, error: null });
    const nodeEventsQuery = queryResult({ data: [], error: null });
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "estimates") return estimateQuery;
        if (table === "estimate_nodes") return nodeQuery;
        if (table === "estimate_sheet_events") return nodeEventsQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);
    const { fetchEstimateSheetVersionControl } = await import("@/lib/estimates/actions");

    const result = await fetchEstimateSheetVersionControl({
      projectId: "project-1",
      estimateId: "estimate-1",
      nodeId: "node-1",
      scope: "node",
    });

    expect(supabase.from).toHaveBeenCalledTimes(3);
    expect(nodeEventsQuery.eq).toHaveBeenCalledWith("estimate_node_id", "node-1");
    expect(result.events).toEqual([]);
    expect(result.rowEvents).toEqual([]);
    expect(result.nodeEvents).toEqual([]);
  });

  it("supports descendant node-scoped reads by filtering descendant node and row ids", async () => {
    const estimateQuery = queryResult({ data: { id: "estimate-1", project_id: "project-1" }, error: null });
    const nodeQuery = queryResult({ data: { id: "group-1", estimate_id: "estimate-1", parent_id: null, kind: "group", estimates: { project_id: "project-1" } }, error: null });
    const descendantsQuery = queryResult({
      data: [
        { id: "group-1", parent_id: null, kind: "group" },
        { id: "area-1", parent_id: "group-1", kind: "area" },
        { id: "area-2", parent_id: "group-1", kind: "area" },
      ],
      error: null,
    });
    const rowsQuery = queryResult({ data: [{ id: "row-1" }, { id: "row-2" }], error: null });
    const nodeEventsQuery = queryResult({ data: [], error: null });
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "estimates") return estimateQuery;
        if (table === "estimate_nodes") return nodeQuery;
        if (table === "estimate_row_items") return rowsQuery;
        if (table === "estimate_sheet_events") return nodeEventsQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    nodeQuery.select.mockImplementationOnce(() => nodeQuery).mockImplementationOnce(() => descendantsQuery);
    descendantsQuery.eq.mockImplementation(() => descendantsQuery);
    rowsQuery.select.mockImplementation(() => rowsQuery);
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);
    const { fetchEstimateSheetVersionControl } = await import("@/lib/estimates/actions");

    await fetchEstimateSheetVersionControl({
      projectId: "project-1",
      estimateId: "estimate-1",
      nodeId: "group-1",
      includeDescendants: true,
      scope: "node",
    });

    expect(nodeEventsQuery.or).toHaveBeenCalledWith("estimate_node_id.in.(group-1,area-1,area-2),target_row_id.in.(row-1,row-2)");
  });

  it("applies validated event filters, date ranges, and search filters", async () => {
    const estimateQuery = queryResult({ data: { id: "estimate-1", project_id: "project-1" }, error: null });
    const eventsQuery = queryResult({ data: [], error: null });
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "estimates") return estimateQuery;
        if (table === "estimate_sheet_events") return eventsQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);
    const { fetchEstimateSheetVersionControl } = await import("@/lib/estimates/actions");

    await fetchEstimateSheetVersionControl({
      projectId: "project-1",
      estimateId: "estimate-1",
      scope: "sheet",
      eventTypes: ["row_updated", "template_inserted"],
      dateFrom: "2026-05-01T00:00:00.000Z",
      dateTo: "2026-05-25T00:00:00.000Z",
      search: "hardwood",
    });

    expect(eventsQuery.in).toHaveBeenCalledWith("event_type", ["row_updated", "template_inserted"]);
    expect(eventsQuery.gte).toHaveBeenCalledWith("created_at", "2026-05-01T00:00:00.000Z");
    expect(eventsQuery.lte).toHaveBeenCalledWith("created_at", "2026-05-25T00:00:00.000Z");
    expect(eventsQuery.or).toHaveBeenCalledWith(expect.stringContaining("event_type.ilike.%hardwood%"));
    expect(eventsQuery.or).toHaveBeenCalledWith(expect.stringContaining("row_context->>material.ilike.%hardwood%"));
  });

  it("rejects unsafe activity search before querying event rows", async () => {
    const estimateQuery = queryResult({ data: { id: "estimate-1", project_id: "project-1" }, error: null });
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "estimates") return estimateQuery;
        if (table === "estimate_sheet_events") throw new Error("Event rows should not be queried with unsafe search.");
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);
    const { fetchEstimateSheetVersionControl } = await import("@/lib/estimates/actions");

    await expect(fetchEstimateSheetVersionControl({
      projectId: "project-1",
      estimateId: "estimate-1",
      search: "bad,value",
    })).rejects.toThrow("Activity search contains unsupported characters.");
  });

  it("enriches activity events with safe actor labels from visible profiles", async () => {
    const estimateQuery = queryResult({ data: { id: "estimate-1", project_id: "project-1" }, error: null });
    const eventsQuery = queryResult({
      data: [
        {
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          event_type: "row_updated",
          event_source: "server_action",
          created_at: "2026-05-24T03:00:00.000Z",
          actor_user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          target_row_id: "row-1",
          estimate_node_id: "node-1",
          row_context: {},
          old_snapshot: null,
          new_snapshot: null,
          changed_fields: [],
          total_delta: null,
          payload: {},
          correlation_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        },
      ],
      error: null,
    });
    const profilesQuery = queryResult({ data: [{ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", display_name: "Philip Lewis", email: "philipjonlewis@gmail.com" }], error: null });
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "estimates") return estimateQuery;
        if (table === "estimate_sheet_events") return eventsQuery;
        if (table === "profiles") return profilesQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);
    const { fetchEstimateSheetVersionControl } = await import("@/lib/estimates/actions");

    const result = await fetchEstimateSheetVersionControl({
      projectId: "project-1",
      estimateId: "estimate-1",
      scope: "sheet",
    });

    expect(profilesQuery.in).toHaveBeenCalledWith("id", ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]);
    expect(profilesQuery.select).toHaveBeenCalledWith("id, display_name, email");
    expect(result.events[0]?.actorLabel).toBe("Philip Lewis");
  });

  it("uses profile email as the actor label source when display name is missing", async () => {
    const estimateQuery = queryResult({ data: { id: "estimate-1", project_id: "project-1" }, error: null });
    const eventsQuery = queryResult({
      data: [
        {
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          event_type: "row_updated",
          event_source: "server_action",
          created_at: "2026-05-24T03:00:00.000Z",
          actor_user_id: "4e23801d-6fc2-4886-b980-d15ca2b164b8",
          target_row_id: "row-1",
          estimate_node_id: "node-1",
          row_context: {},
          old_snapshot: null,
          new_snapshot: null,
          changed_fields: [],
          total_delta: null,
          payload: {},
          correlation_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        },
      ],
      error: null,
    });
    const profilesQuery = queryResult({
      data: [{ id: "4e23801d-6fc2-4886-b980-d15ca2b164b8", display_name: null, email: "philipjonlewis@gmail.com" }],
      error: null,
    });
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "estimates") return estimateQuery;
        if (table === "estimate_sheet_events") return eventsQuery;
        if (table === "profiles") return profilesQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);
    const { fetchEstimateSheetVersionControl } = await import("@/lib/estimates/actions");

    const result = await fetchEstimateSheetVersionControl({
      projectId: "project-1",
      estimateId: "estimate-1",
      scope: "sheet",
    });

    expect(result.events[0]?.actorLabel).toBe("Philip Lewis");
    expect(result.events[0]?.actorLabel).not.toMatch(/^User /);
  });

  it("returns read-only Activity retention metrics with threshold flags", async () => {
    const metricsResult = {
      data: [
        {
          workspace_event_bytes: 1024,
          workspace_version_bytes: 2048,
          largest_event_payload_bytes: 512,
          max_estimate_event_count: 120,
          estimates_over_event_threshold: 0,
          workspace_storage_over_threshold: false,
        },
      ],
      error: null,
    };
    const supabase = {
      rpc: vi.fn(async () => metricsResult),
    };
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);
    const { fetchEstimateActivityRetentionMetrics } = await import("@/lib/estimates/actions");

    const result = await fetchEstimateActivityRetentionMetrics({ projectId: "project-1" });

    expect(supabase.rpc).toHaveBeenCalledWith("get_estimate_activity_retention_metrics", { target_project_id: "project-1" });
    expect(result.workspaceEventBytes).toBe(1024);
    expect(result.workspaceVersionBytes).toBe(2048);
    expect(result.workspaceStorageOverThreshold).toBe(false);
  });

  it("rejects invalid history cursors before querying event rows", async () => {
    const estimateQuery = queryResult({ data: { id: "estimate-1", project_id: "project-1" }, error: null });
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "estimates") return estimateQuery;
        if (table === "estimate_sheet_events") throw new Error("Event rows should not be queried with an invalid cursor.");
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);
    const { fetchEstimateSheetVersionControl } = await import("@/lib/estimates/actions");

    await expect(fetchEstimateSheetVersionControl({
      projectId: "project-1",
      estimateId: "estimate-1",
      sheetCursor: {
        createdAt: "not-a-date",
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      },
    })).rejects.toThrow("Sheet activity cursor timestamp is invalid.");
  });
});
