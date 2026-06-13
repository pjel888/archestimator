import { beforeEach, describe, expect, it, vi } from "vitest";

// U2: covers insertProjectSourceIntoEstimate — UUID guard, re-read-at-insert
// (denial 7), the RPC call shape (whole-tab vs node subtree), stable correlation_id,
// and error propagation. RPC-level denials 4-6 are proven by the Postgres harness
// (scripts/prove-estimate-tabs-postgres.mjs); this exercises the action wrapper.

const authMocks = vi.hoisted(() => ({ requireCurrentUserContext: vi.fn() }));
const supabaseServerMocks = vi.hoisted(() => ({ createSupabaseServerClient: vi.fn() }));
const repositoryMocks = vi.hoisted(() => ({
  getEstimateTabs: vi.fn(),
  getEstimateTabTree: vi.fn(),
  getProjectEstimateTreeByEstimate: vi.fn(),
  listCurrentWorkspaceProjects: vi.fn(),
  listProjectEstimateSheets: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ requireCurrentUserContext: authMocks.requireCurrentUserContext }));
vi.mock("@/lib/supabase/server", () => supabaseServerMocks);
vi.mock("@/lib/repositories/workspace-repository", () => repositoryMocks);

const TARGET_PROJECT = "11111111-1111-4111-8111-111111111111";
const TARGET_ESTIMATE = "22222222-2222-4222-8222-222222222222";
const TARGET_PARENT = "33333333-3333-4333-8333-333333333333";
const SOURCE_PROJECT = "44444444-4444-4444-8444-444444444444";
const SOURCE_ESTIMATE = "55555555-5555-4555-8555-555555555555";
const SOURCE_TAB = "66666666-6666-4666-8666-666666666666";
const SOURCE_NODE = "77777777-7777-4777-8777-777777777777";

const baseInput = {
  targetProjectId: TARGET_PROJECT,
  targetEstimateId: TARGET_ESTIMATE,
  targetParentNodeId: TARGET_PARENT,
  source: { projectId: SOURCE_PROJECT, estimateId: SOURCE_ESTIMATE, tabId: SOURCE_TAB, nodeId: null as string | null },
};

function singleResult(data: unknown) {
  const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(async () => ({ data, error: null })) };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}

function mockSupabase({ sourceEstimate, sourceNode, rpc }: { sourceEstimate?: unknown; sourceNode?: unknown; rpc?: ReturnType<typeof vi.fn> }) {
  const rpcMock = rpc ?? vi.fn(async () => ({ data: { inserted_root_node_ids: ["new-root"], inserted_node_count: 1, inserted_row_item_count: 0 }, error: null }));
  const from = vi.fn((table: string) => {
    if (table === "estimates") return singleResult(sourceEstimate === undefined ? { id: SOURCE_ESTIMATE } : sourceEstimate);
    if (table === "estimate_nodes") return singleResult(sourceNode === undefined ? { id: SOURCE_NODE } : sourceNode);
    throw new Error(`unexpected table ${table}`);
  });
  const client = { from, rpc: rpcMock };
  supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(client);
  return { client, from, rpc: rpcMock };
}

beforeEach(() => {
  vi.clearAllMocks();
  authMocks.requireCurrentUserContext.mockResolvedValue({ userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });
  repositoryMocks.getProjectEstimateTreeByEstimate.mockResolvedValue({
    project: { id: TARGET_PROJECT },
    estimate: { id: TARGET_ESTIMATE },
    tree: [{ id: TARGET_PARENT, name: "Ground Floor", kind: "group", total: "₱0.00", children: [] }],
  });
});

describe("insertProjectSourceIntoEstimate", () => {
  it("inserts a whole-tab source through the subtree RPC (source_root_node_id null)", async () => {
    const { rpc, from } = mockSupabase({});
    const { insertProjectSourceIntoEstimate } = await import("@/lib/reusable-sources/actions");

    const result = await insertProjectSourceIntoEstimate(baseInput);

    // The whole-tab path re-reads only the source estimate (no node check).
    expect(from).toHaveBeenCalledWith("estimates");
    expect(rpc).toHaveBeenCalledTimes(1);
    const [name, args] = rpc.mock.calls[0];
    expect(name).toBe("insert_estimate_subtree_into_estimate_with_history");
    expect(args).toMatchObject({
      target_project_id: TARGET_PROJECT,
      target_estimate_id: TARGET_ESTIMATE,
      target_parent_node_id: TARGET_PARENT,
      source_estimate_id: SOURCE_ESTIMATE,
      source_root_node_id: null,
      source_tab_id: SOURCE_TAB,
      acting_user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    expect(args.correlation_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(result.insertedRootNodeIds).toEqual(["new-root"]);
    expect(result.tree[0]?.id).toBe(TARGET_PARENT);
  });

  it("passes the node id as source_root_node_id for a node subtree and re-reads the node", async () => {
    const { rpc, from } = mockSupabase({});
    const { insertProjectSourceIntoEstimate } = await import("@/lib/reusable-sources/actions");

    await insertProjectSourceIntoEstimate({ ...baseInput, source: { ...baseInput.source, nodeId: SOURCE_NODE } });

    expect(from).toHaveBeenCalledWith("estimate_nodes");
    expect(rpc.mock.calls[0][1]).toMatchObject({ source_root_node_id: SOURCE_NODE });
  });

  it("mints a STABLE correlation_id for the same unit (idempotent replay, U2-2)", async () => {
    const first = mockSupabase({});
    const { insertProjectSourceIntoEstimate } = await import("@/lib/reusable-sources/actions");
    await insertProjectSourceIntoEstimate(baseInput);
    const idA = first.rpc.mock.calls[0][1].correlation_id;

    const second = mockSupabase({});
    await insertProjectSourceIntoEstimate(baseInput);
    const idB = second.rpc.mock.calls[0][1].correlation_id;

    expect(idA).toBe(idB);
  });

  it("rejects an invalid id before any DB access (fail closed)", async () => {
    const { from, rpc } = mockSupabase({});
    const { insertProjectSourceIntoEstimate } = await import("@/lib/reusable-sources/actions");

    await expect(insertProjectSourceIntoEstimate({ ...baseInput, source: { ...baseInput.source, estimateId: "not-a-uuid" } }))
      .rejects.toThrow("Invalid project-source insert request.");
    expect(from).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("surfaces a clear error when the source is gone (re-read-at-insert / denial 7)", async () => {
    const { rpc } = mockSupabase({ sourceEstimate: null });
    const { insertProjectSourceIntoEstimate } = await import("@/lib/reusable-sources/actions");

    await expect(insertProjectSourceIntoEstimate(baseInput)).rejects.toThrow("This project source is no longer available.");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("surfaces a clear error when the source node is gone", async () => {
    const { rpc } = mockSupabase({ sourceNode: null });
    const { insertProjectSourceIntoEstimate } = await import("@/lib/reusable-sources/actions");

    await expect(insertProjectSourceIntoEstimate({ ...baseInput, source: { ...baseInput.source, nodeId: SOURCE_NODE } }))
      .rejects.toThrow("This project source is no longer available.");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("wraps an RPC failure (e.g. a denied viewer or unreadable source)", async () => {
    const rpc = vi.fn(async () => ({ data: null, error: { message: "Estimate edit access denied." } }));
    mockSupabase({ rpc });
    const { insertProjectSourceIntoEstimate } = await import("@/lib/reusable-sources/actions");

    await expect(insertProjectSourceIntoEstimate(baseInput)).rejects.toThrow("Could not insert project source: Estimate edit access denied.");
  });
});
