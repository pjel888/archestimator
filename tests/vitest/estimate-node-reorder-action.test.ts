import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ESTIMATE_TREE_SORT_ORDER_STEP } from "@/lib/estimates/estimate-tree-reorder";

const repositoryMocks = vi.hoisted(() => ({
  getCurrentWorkspaceProject: vi.fn(),
  getCurrentWorkspaceProjectForEstimate: vi.fn(),
  getEstimateTabTree: vi.fn(),
  getProjectEstimateTreeByEstimate: vi.fn(),
}));

const estimateActionsD1ClientMocks = vi.hoisted(() => ({
  createEstimateActionsD1Client: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCurrentUserContext: vi.fn(),
}));

const nextCacheMocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}));

const nextNavigationMocks = vi.hoisted(() => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/repositories/workspace-repository", () => repositoryMocks);
vi.mock("@/lib/estimates/d1-action-client", () => estimateActionsD1ClientMocks);
vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("next/cache", () => nextCacheMocks);
vi.mock("next/navigation", () => nextNavigationMocks);

beforeEach(() => {
  authMocks.requireAuth.mockResolvedValue(undefined);
  authMocks.requireCurrentUserContext.mockResolvedValue({ userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });
});

type EstimateNodeRow = {
  id: string;
  kind: "group" | "area" | "lot" | "general" | "structure" | "level" | "assembly" | "legacy";
  estimate_id: string;
  estimate_tab_id?: string | null;
  parent_id: string | null;
};

type SupabaseQueryResult<T> = { data: T; error: (Error & { code?: string }) | null };

function queryResult<T>(result: SupabaseQueryResult<T>) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    in: vi.fn(() => builder),
    is: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result),
    single: vi.fn(async () => result),
    then: (resolve: (value: SupabaseQueryResult<T>) => void) => Promise.resolve(result).then(resolve),
  };
  return builder;
}

function makeSupabase({
  nodes,
  rpcResult = { data: 3, error: null },
  rpcResults,
}: {
  nodes: EstimateNodeRow[];
  rpcResult?: SupabaseQueryResult<number>;
  rpcResults?: SupabaseQueryResult<number>[];
}) {
  const estimateQuery = queryResult({ data: { id: "estimate-1", project_id: "project-1" }, error: null });
  const nodeQuery = queryResult({ data: nodes, error: null });
  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "estimates") return estimateQuery;
      if (table === "estimate_nodes") return nodeQuery;
      throw new Error(`Unexpected table ${table}`);
    }),
    rpc: vi.fn(async (name: string) => {
      if (name === "can_edit_estimate") return { data: true, error: null };
      return rpcResults?.shift() ?? rpcResult;
    }),
    estimateQuery,
    nodeQuery,
  };
  return supabase;
}

function mockEstimateActionsDataStore<T extends { rpc: (name: string, args?: Record<string, unknown>) => unknown }>(store: T) {
  estimateActionsD1ClientMocks.createEstimateActionsD1Client.mockResolvedValue({
    ...store,
    call: (name: string, args: Record<string, unknown>) => store.rpc(name, args),
  });
}

describe("reorderEstimateTreeNodes server action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.requireCurrentUserContext.mockResolvedValue({ userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });
    repositoryMocks.getCurrentWorkspaceProject.mockResolvedValue({ project: { id: "project-1" } });
    repositoryMocks.getCurrentWorkspaceProjectForEstimate.mockResolvedValue({ project: { id: "project-1" } });
    repositoryMocks.getProjectEstimateTreeByEstimate.mockResolvedValue({
      project: { id: "project-1" },
      estimate: { id: "estimate-1" },
      tree: [{ id: "project-scope", name: "Project Scope", kind: "group", total: "₱0.00", children: [] }],
    });
  });

  it("rejects empty and duplicate update payloads before touching the database", async () => {
    const { reorderEstimateTreeNodes } = await import("@/lib/estimates/actions");

    await expect(reorderEstimateTreeNodes("project-1", "estimate-1", { updates: [] })).rejects.toThrow("At least one estimate tree node update is required.");
    await expect(
      reorderEstimateTreeNodes("project-1", "estimate-1", {
        updates: [
          { id: "kitchen", parentId: "site-works", sortOrder: 10 },
          { id: "kitchen", parentId: "site-works", sortOrder: 20 },
        ],
      }),
    ).rejects.toThrow("Duplicate estimate tree node update: kitchen.");
    expect(estimateActionsD1ClientMocks.createEstimateActionsD1Client).not.toHaveBeenCalled();
  });

  it("converts camelCase updates to one scoped history-aware reorder RPC and returns the fresh nested tree", async () => {
    const supabase = makeSupabase({
      nodes: [
        { id: "ground-floor", kind: "group", estimate_id: "estimate-1", parent_id: "project-scope" },
        { id: "kitchen", kind: "area", estimate_id: "estimate-1", parent_id: "ground-floor" },
        { id: "living", kind: "area", estimate_id: "estimate-1", parent_id: "ground-floor" },
        { id: "site-works", kind: "group", estimate_id: "estimate-1", parent_id: "project-scope" },
        { id: "front-yard", kind: "area", estimate_id: "estimate-1", parent_id: "site-works" },
      ],
    });
    mockEstimateActionsDataStore(supabase);
    const { reorderEstimateTreeNodes } = await import("@/lib/estimates/actions");

    const result = await reorderEstimateTreeNodes("project-1", "estimate-1", {
      updates: [
        { id: "living", parentId: "ground-floor", sortOrder: 10 },
        { id: "front-yard", parentId: "site-works", sortOrder: 10 },
        { id: "kitchen", parentId: "site-works", sortOrder: 20 },
      ],
    });

    expect(repositoryMocks.getCurrentWorkspaceProjectForEstimate).toHaveBeenCalledWith("project-1", "estimate-1");
    expect(repositoryMocks.getCurrentWorkspaceProject).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledWith("can_edit_estimate", { target_estimate_id: "estimate-1" });
    expect(supabase.rpc).toHaveBeenCalledWith("reorder_estimate_nodes_with_history", {
      target_project_id: "project-1",
      target_estimate_id: "estimate-1",
      move_updates: [
        { id: "living", parent_id: "ground-floor", sort_order: 10 },
        { id: "front-yard", parent_id: "site-works", sort_order: 10 },
        { id: "kitchen", parent_id: "site-works", sort_order: 20 },
      ],
      acting_user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlation_id: expect.any(String),
    });
    expect(repositoryMocks.getProjectEstimateTreeByEstimate).toHaveBeenCalledWith("project-1", "estimate-1");
    expect(result.tree).toEqual([{ id: "project-scope", name: "Project Scope", kind: "group", total: "₱0.00", children: [] }]);
    expect(nextNavigationMocks.redirect).not.toHaveBeenCalled();
  });

  it("calls the action client with the receiver when nesting one Group Node under another", async () => {
    const estimateQuery = queryResult({ data: { id: "estimate-1", project_id: "project-1" }, error: null });
    const nodeQuery = queryResult({
      data: [
        { id: "project-scope", kind: "group", estimate_id: "estimate-1", parent_id: null },
        { id: "site-works", kind: "group", estimate_id: "estimate-1", parent_id: "project-scope" },
        { id: "ground-floor", kind: "group", estimate_id: "estimate-1", parent_id: "project-scope" },
      ],
      error: null,
    });
    const restRpc = vi.fn(async (name: string) => {
      if (name === "can_edit_estimate") return { data: true, error: null };
      return { data: 2, error: null };
    });
    const supabase = {
      rest: { rpc: restRpc },
      from: vi.fn((table: string) => {
        if (table === "estimates") return estimateQuery;
        if (table === "estimate_nodes") return nodeQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc(fn: string, args: Record<string, unknown>) {
        return this.rest.rpc(fn, args);
      },
    };
    mockEstimateActionsDataStore(supabase);
    const { reorderEstimateTreeNodes } = await import("@/lib/estimates/actions");

    await reorderEstimateTreeNodes("project-1", "estimate-1", {
      updates: [
        { id: "site-works", parentId: "ground-floor", sortOrder: 10 },
        { id: "ground-floor", parentId: "project-scope", sortOrder: 20 },
      ],
    });

    expect(restRpc).toHaveBeenCalledWith("reorder_estimate_nodes_with_history", {
      target_project_id: "project-1",
      target_estimate_id: "estimate-1",
      move_updates: [
        { id: "site-works", parent_id: "ground-floor", sort_order: 10 },
        { id: "ground-floor", parent_id: "project-scope", sort_order: 20 },
      ],
      acting_user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlation_id: expect.any(String),
    });
  });

  it("allows an area under an area and an area at the estimate root (P6 single-node model)", async () => {
    // Pre-P6 these two moves were rejected client-side with
    // "area nodes cannot be placed under …" before the RPC. Any node may now
    // parent any node, so the server action hands both straight to the RPC.
    const supabase = makeSupabase({
      nodes: [
        { id: "living", kind: "area", estimate_id: "estimate-1", parent_id: "ground-floor" },
        { id: "kitchen", kind: "area", estimate_id: "estimate-1", parent_id: "ground-floor" },
      ],
    });
    mockEstimateActionsDataStore(supabase);
    const { reorderEstimateTreeNodes } = await import("@/lib/estimates/actions");

    await reorderEstimateTreeNodes("project-1", "estimate-1", {
      updates: [{ id: "living", parentId: "kitchen", sortOrder: 10 }],
    });
    await reorderEstimateTreeNodes("project-1", "estimate-1", {
      updates: [{ id: "kitchen", parentId: null, sortOrder: 10 }],
    });

    const reorderCalls = supabase.rpc.mock.calls.filter(([fn]) => fn === "reorder_estimate_nodes_with_history");
    expect(reorderCalls).toHaveLength(2);
    expect(reorderCalls[0][1]).toMatchObject({ move_updates: [{ id: "living", parent_id: "kitchen", sort_order: 10 }] });
    expect(reorderCalls[1][1]).toMatchObject({ move_updates: [{ id: "kitchen", parent_id: null, sort_order: 10 }] });
  });

  it("treats legacy organizing estimate-node kinds as group nodes during the remote migration transition", async () => {
    const supabase = makeSupabase({
      nodes: [
        { id: "second-floor", kind: "level", estimate_id: "estimate-1", parent_id: "house" },
        { id: "master-bedroom", kind: "area", estimate_id: "estimate-1", parent_id: "second-floor" },
      ],
    });
    mockEstimateActionsDataStore(supabase);
    const { reorderEstimateTreeNodes } = await import("@/lib/estimates/actions");

    await reorderEstimateTreeNodes("project-1", "estimate-1", {
      updates: [{ id: "master-bedroom", parentId: "second-floor", sortOrder: 20 }],
    });

    expect(supabase.rpc).toHaveBeenCalledWith("reorder_estimate_nodes_with_history", {
      target_project_id: "project-1",
      target_estimate_id: "estimate-1",
      move_updates: [{ id: "master-bedroom", parent_id: "second-floor", sort_order: 20 }],
      acting_user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlation_id: expect.any(String),
    });
  });

  it("passes fractional numeric sort orders through to the history reorder RPC", async () => {
    const supabase = makeSupabase({
      nodes: [
        { id: "ground-floor", kind: "group", estimate_id: "estimate-1", parent_id: null },
        { id: "kitchen", kind: "area", estimate_id: "estimate-1", parent_id: "ground-floor" },
      ],
    });
    mockEstimateActionsDataStore(supabase);
    const { reorderEstimateTreeNodes } = await import("@/lib/estimates/actions");

    await reorderEstimateTreeNodes("project-1", "estimate-1", {
      updates: [{ id: "kitchen", parentId: "ground-floor", sortOrder: 15.5 }],
    });

    expect(supabase.rpc).toHaveBeenCalledWith("reorder_estimate_nodes_with_history", {
      target_project_id: "project-1",
      target_estimate_id: "estimate-1",
      move_updates: [{ id: "kitchen", parent_id: "ground-floor", sort_order: 15.5 }],
      acting_user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlation_id: expect.any(String),
    });
  });

  it("rejects inactive or cross-estimate nodes before the RPC", async () => {
    const supabase = makeSupabase({
      nodes: [
        { id: "legacy-node", kind: "legacy", estimate_id: "estimate-1", parent_id: null },
        { id: "other-estimate-parent", kind: "group", estimate_id: "other-estimate", parent_id: null },
      ],
    });
    mockEstimateActionsDataStore(supabase);
    const { reorderEstimateTreeNodes } = await import("@/lib/estimates/actions");

    await expect(
      reorderEstimateTreeNodes("project-1", "estimate-1", {
        updates: [{ id: "legacy-node", parentId: null, sortOrder: 10 }],
      }),
    ).rejects.toThrow("Unsupported estimate node kind.");
    await expect(
      reorderEstimateTreeNodes("project-1", "estimate-1", {
        updates: [{ id: "legacy-node", parentId: "other-estimate-parent", sortOrder: 10 }],
      }),
    ).rejects.toThrow("Estimate tree update parent not found in the current estimate.");
    expect(supabase.rpc).toHaveBeenCalledWith("can_edit_estimate", { target_estimate_id: "estimate-1" });
    expect(supabase.rpc).not.toHaveBeenCalledWith("reorder_estimate_nodes_with_history", expect.anything());
  });

  it("rejects cross-tab reparenting before the reorder RPC", async () => {
    const supabase = makeSupabase({
      nodes: [
        { id: "ground-floor", kind: "group", estimate_id: "estimate-1", estimate_tab_id: "tab-a", parent_id: null },
        { id: "kitchen", kind: "area", estimate_id: "estimate-1", estimate_tab_id: "tab-a", parent_id: "ground-floor" },
        { id: "site-works", kind: "group", estimate_id: "estimate-1", estimate_tab_id: "tab-b", parent_id: null },
      ],
    });
    mockEstimateActionsDataStore(supabase);
    const { reorderEstimateTreeNodes } = await import("@/lib/estimates/actions");

    await expect(
      reorderEstimateTreeNodes("project-1", "estimate-1", {
        updates: [{ id: "kitchen", parentId: "site-works", sortOrder: 10 }],
      }),
    ).rejects.toThrow("Estimate tree nodes cannot be moved across tabs.");
    expect(supabase.rpc).toHaveBeenCalledWith("can_edit_estimate", { target_estimate_id: "estimate-1" });
    expect(supabase.rpc).not.toHaveBeenCalledWith("reorder_estimate_nodes_with_history", expect.anything());
  });

  it("rejects self-parenting and descendant cycles before the reorder RPC", async () => {
    const supabase = makeSupabase({
      nodes: [
        { id: "project-scope", kind: "group", estimate_id: "estimate-1", estimate_tab_id: "tab-a", parent_id: null },
        { id: "ground-floor", kind: "group", estimate_id: "estimate-1", estimate_tab_id: "tab-a", parent_id: "project-scope" },
        { id: "kitchen", kind: "area", estimate_id: "estimate-1", estimate_tab_id: "tab-a", parent_id: "ground-floor" },
      ],
    });
    mockEstimateActionsDataStore(supabase);
    const { reorderEstimateTreeNodes } = await import("@/lib/estimates/actions");

    await expect(
      reorderEstimateTreeNodes("project-1", "estimate-1", {
        updates: [{ id: "kitchen", parentId: "kitchen", sortOrder: 10 }],
      }),
    ).rejects.toThrow("An estimate tree node cannot be moved inside itself or one of its descendants.");
    await expect(
      reorderEstimateTreeNodes("project-1", "estimate-1", {
        updates: [{ id: "ground-floor", parentId: "kitchen", sortOrder: 10 }],
      }),
    ).rejects.toThrow("An estimate tree node cannot be moved inside itself or one of its descendants.");
    expect(supabase.rpc).toHaveBeenCalledWith("can_edit_estimate", { target_estimate_id: "estimate-1" });
    expect(supabase.rpc).not.toHaveBeenCalledWith("reorder_estimate_nodes_with_history", expect.anything());
  });

  it("converts RPC errors into a user-readable reorder failure", async () => {
    const supabase = makeSupabase({
      nodes: [{ id: "project-scope", kind: "group", estimate_id: "estimate-1", parent_id: null }],
      rpcResult: { data: 0, error: new Error("cycle detected") },
    });
    mockEstimateActionsDataStore(supabase);
    const { reorderEstimateTreeNodes } = await import("@/lib/estimates/actions");

    await expect(
      reorderEstimateTreeNodes("project-1", "estimate-1", {
        updates: [{ id: "project-scope", parentId: null, sortOrder: 10 }],
      }),
    ).rejects.toThrow("Could not reorder estimate tree: cycle detected");
  });
});

describe("estimate sheet mass deletion server action contract", () => {
  it("keeps bulk sheet deletion behind the preview/execute RPC pair instead of a raw table delete action", () => {
    const actions = readFileSync(join(process.cwd(), "src/lib/estimates/actions.ts"), "utf8");

    expect(actions).toContain("previewBulkDeleteEstimateSheets");
    expect(actions).toContain("executeBulkDeleteEstimateSheets");
    expect(actions).toContain("preview_bulk_delete_estimate_sheets");
    expect(actions).toContain("execute_bulk_delete_estimate_sheets");
    expect(actions).not.toContain("export async function deleteEstimateSheetsBulk");
  });
});

describe("createEstimateNode server action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.requireCurrentUserContext.mockResolvedValue({ userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });
    repositoryMocks.getCurrentWorkspaceProject.mockResolvedValue({ project: { id: "project-1" } });
    repositoryMocks.getCurrentWorkspaceProjectForEstimate.mockResolvedValue({ project: { id: "project-1" } });
    repositoryMocks.getEstimateTabTree.mockResolvedValue({
      project: { id: "project-1" },
      estimate: { id: "estimate-1" },
      tree: [{ id: "tab-root", name: "Tab Root", kind: "group", total: "₱0.00", children: [] }],
    });
    repositoryMocks.getProjectEstimateTreeByEstimate.mockResolvedValue({
      project: { id: "project-1" },
      estimate: { id: "estimate-1" },
      tree: [{ id: "project-scope", name: "Project Scope", kind: "group", total: "₱0.00", children: [] }],
    });
  });

  it("allows new area nodes under legacy organizing parents during the remote migration transition", async () => {
    const estimateQuery = queryResult({ data: { id: "estimate-1", project_id: "project-1" }, error: null });
    const parentQuery = queryResult({
      data: { id: "second-floor", kind: "level", estimate_id: "estimate-1", estimates: { project_id: "project-1" } },
      error: null,
    });
    const siblingQuery = queryResult({ data: [{ id: "existing-bedroom", kind: "area", sort_order: 7 }], error: null });
    const estimateNodeQueries = [parentQuery, siblingQuery];
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "estimates") return estimateQuery;
        if (table === "estimate_nodes") {
          const nextQuery = estimateNodeQueries.shift();
          if (!nextQuery) throw new Error("Unexpected estimate_nodes query");
          return nextQuery;
        }
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(async (name: string) => {
        if (name === "can_edit_estimate") return { data: true, error: null };
        return { data: { nodeId: "new-bedroom" }, error: null };
      }),
    };
    mockEstimateActionsDataStore(supabase);
    const formData = new FormData();
    formData.set("name", "New Bedroom");
    formData.set("kind", "area");
    formData.set("parentId", "second-floor");
    const { createEstimateNode } = await import("@/lib/estimates/actions");

    const result = await createEstimateNode("project-1", "estimate-1", formData);

    expect(supabase.rpc).toHaveBeenCalledWith("create_estimate_node_with_history", {
      target_project_id: "project-1",
      target_estimate_id: "estimate-1",
      parent_node_id: "second-floor",
      node_kind: "area",
      node_name: "New Bedroom",
      initial_sort_order: 7 + ESTIMATE_TREE_SORT_ORDER_STEP,
      acting_user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlation_id: expect.any(String),
    });
    // Create resolves in place so the client can reconcile its optimistic
    // node; navigations or RSC refreshes here would remount the workspace.
    expect(result).toEqual({ nodeId: "new-bedroom", name: "New Bedroom", kind: "area", parentId: "second-floor" });
    expect(nextCacheMocks.revalidatePath).not.toHaveBeenCalled();
    expect(nextNavigationMocks.redirect).not.toHaveBeenCalled();
  });

  it("appends a new Group Node after existing siblings at the sparse sort-order step", async () => {
    const estimateQuery = queryResult({ data: { id: "estimate-1", project_id: "project-1" }, error: null });
    const parentQuery = queryResult({
      data: { id: "main-house", kind: "group", estimate_id: "estimate-1", estimates: { project_id: "project-1" } },
      error: null,
    });
    const siblingQuery = queryResult({ data: [{ id: "kitchen", kind: "area", sort_order: 10 }], error: null });
    const estimateNodeQueries = [parentQuery, siblingQuery];
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "estimates") return estimateQuery;
        if (table === "estimate_nodes") {
          const nextQuery = estimateNodeQueries.shift();
          if (!nextQuery) throw new Error("Unexpected estimate_nodes query");
          return nextQuery;
        }
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(async (name: string) => {
        if (name === "can_edit_estimate") return { data: true, error: null };
        return { data: { nodeId: "new-group" }, error: null };
      }),
    };
    mockEstimateActionsDataStore(supabase);
    const formData = new FormData();
    formData.set("name", "New Group");
    formData.set("kind", "group");
    formData.set("parentId", "main-house");
    const { createEstimateNode } = await import("@/lib/estimates/actions");

    const result = await createEstimateNode("project-1", "estimate-1", formData);

    expect(supabase.rpc).toHaveBeenCalledWith("create_estimate_node_with_history", {
      target_project_id: "project-1",
      target_estimate_id: "estimate-1",
      parent_node_id: "main-house",
      node_kind: "group",
      node_name: "New Group",
      initial_sort_order: 10 + ESTIMATE_TREE_SORT_ORDER_STEP,
      acting_user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlation_id: expect.any(String),
    });
    expect(result).toEqual({ nodeId: "new-group", name: "New Group", kind: "group", parentId: "main-house" });
    expect(nextNavigationMocks.redirect).not.toHaveBeenCalled();
  });

  it("scopes root-node creation to an explicit estimate tab", async () => {
    const estimateQuery = queryResult({ data: { id: "estimate-1", project_id: "project-1" }, error: null });
    const siblingQuery = queryResult({ data: [{ id: "project-scope", kind: "group", sort_order: 3 }], error: null });
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "estimates") return estimateQuery;
        if (table === "estimate_nodes") return siblingQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(async (name: string) => {
        if (name === "can_edit_estimate") return { data: true, error: null };
        return { data: { nodeId: "new-root-group" }, error: null };
      }),
    };
    mockEstimateActionsDataStore(supabase);
    const formData = new FormData();
    formData.set("name", "Alternate Scope");
    formData.set("kind", "group");
    formData.set("estimateTabId", "tab-b");
    const { createEstimateNode } = await import("@/lib/estimates/actions");

    const result = await createEstimateNode("project-1", "estimate-1", formData);

    expect(siblingQuery.is).toHaveBeenCalledWith("parent_id", null);
    expect(siblingQuery.eq).toHaveBeenCalledWith("estimate_tab_id", "tab-b");
    expect(supabase.rpc).toHaveBeenCalledWith("create_estimate_node_with_history", {
      target_project_id: "project-1",
      target_estimate_id: "estimate-1",
      parent_node_id: null,
      node_kind: "group",
      node_name: "Alternate Scope",
      initial_sort_order: 3 + ESTIMATE_TREE_SORT_ORDER_STEP,
      acting_user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlation_id: expect.any(String),
      target_tab_id: "tab-b",
    });
    expect(result).toEqual({ nodeId: "new-root-group", name: "Alternate Scope", kind: "group", parentId: null, estimateTabId: "tab-b" });
  });

  it("surfaces create RPC failures without app-side rollback writes", async () => {
    const estimateQuery = queryResult({ data: { id: "estimate-1", project_id: "project-1" }, error: null });
    const parentQuery = queryResult({
      data: { id: "main-house", kind: "group", estimate_id: "estimate-1", estimates: { project_id: "project-1" } },
      error: null,
    });
    const siblingQuery = queryResult({ data: [{ id: "kitchen", kind: "area", sort_order: 10 }], error: null });
    const mutationQuery = queryResult({ data: null, error: null });
    const estimateNodeQueries = [parentQuery, siblingQuery, mutationQuery];
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "estimates") return estimateQuery;
        if (table === "estimate_nodes") {
          const nextQuery = estimateNodeQueries.shift();
          if (!nextQuery) throw new Error("Unexpected estimate_nodes query");
          return nextQuery;
        }
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(async (name: string) => {
        if (name === "can_edit_estimate") return { data: true, error: null };
        return { data: null, error: new Error("duplicate estimate node reorder slots") };
      }),
    };
    mockEstimateActionsDataStore(supabase);
    const formData = new FormData();
    formData.set("name", "New Group");
    formData.set("kind", "group");
    formData.set("parentId", "main-house");
    const { createEstimateNode } = await import("@/lib/estimates/actions");

    await expect(createEstimateNode("project-1", "estimate-1", formData)).rejects.toThrow(
      "Could not create estimate tree node: duplicate estimate node reorder slots",
    );

    expect(mutationQuery.insert).not.toHaveBeenCalled();
    expect(mutationQuery.delete).not.toHaveBeenCalled();
    expect(nextCacheMocks.revalidatePath).not.toHaveBeenCalled();
    expect(nextNavigationMocks.redirect).not.toHaveBeenCalled();
  });
});

describe("renameEstimateNode and deleteEstimateNode server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.requireCurrentUserContext.mockResolvedValue({ userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });
    repositoryMocks.getCurrentWorkspaceProject.mockResolvedValue({ project: { id: "project-1" } });
    repositoryMocks.getCurrentWorkspaceProjectForEstimate.mockResolvedValue({ project: { id: "project-1" } });
  });

  function scopedNodeSupabase({
    nodeResult = {
      data: { id: "kitchen", estimate_id: "estimate-1", parent_id: "ground-floor", kind: "area" },
      error: null,
    },
    mutationQuery = queryResult({ data: null, error: null }),
  }: {
    nodeResult?: SupabaseQueryResult<unknown>;
    mutationQuery?: ReturnType<typeof queryResult>;
  } = {}) {
    const estimateQuery = queryResult({ data: { id: "estimate-1", project_id: "project-1" }, error: null });
    const nodeValidationQuery = queryResult(nodeResult);
    const estimateNodeQueries = [nodeValidationQuery, mutationQuery];
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "estimates") return estimateQuery;
        if (table === "estimate_nodes") {
          const nextQuery = estimateNodeQueries.shift();
          if (!nextQuery) throw new Error("Unexpected estimate_nodes query");
          return nextQuery;
        }
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(async (name: string) => {
        if (name === "can_edit_estimate") return { data: true, error: null };
        return { data: { eventId: "delete-event-1" }, error: null };
      }),
      estimateQuery,
      nodeValidationQuery,
      mutationQuery,
    };
    return supabase;
  }

  it("trims names before updating and returns a minimal reconciliation patch", async () => {
    const mutationQuery = queryResult({ data: null, error: null });
    const supabase = scopedNodeSupabase({ mutationQuery });
    mockEstimateActionsDataStore(supabase);
    const { renameEstimateNode } = await import("@/lib/estimates/actions");

    const result = await renameEstimateNode("project-1", "estimate-1", "kitchen", "  Chef Kitchen  ");

    expect(mutationQuery.update).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledWith("rename_estimate_node_with_history", {
      target_project_id: "project-1",
      target_estimate_id: "estimate-1",
      target_node_id: "kitchen",
      next_name: "Chef Kitchen",
      acting_user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlation_id: expect.any(String),
    });
    expect(repositoryMocks.getProjectEstimateTreeByEstimate).not.toHaveBeenCalled();
    expect(nextCacheMocks.revalidatePath).not.toHaveBeenCalled();
    expect(result).toEqual({
      nodeId: "kitchen",
      name: "Chef Kitchen",
    });
  });

  it("rejects empty rename values before touching workspace or database state", async () => {
    const { renameEstimateNode } = await import("@/lib/estimates/actions");

    await expect(renameEstimateNode("project-1", "estimate-1", "kitchen", "   ")).rejects.toThrow("Estimate tree node name is required.");
    expect(repositoryMocks.getCurrentWorkspaceProject).not.toHaveBeenCalled();
    expect(repositoryMocks.getCurrentWorkspaceProjectForEstimate).not.toHaveBeenCalled();
    expect(estimateActionsD1ClientMocks.createEstimateActionsD1Client).not.toHaveBeenCalled();
  });

  it("scopes rename validation to project, estimate, and node", async () => {
    const supabase = scopedNodeSupabase({
      nodeResult: { data: null, error: null },
      mutationQuery: queryResult({ data: null, error: null }),
    });
    mockEstimateActionsDataStore(supabase);
    const { renameEstimateNode } = await import("@/lib/estimates/actions");

    await expect(renameEstimateNode("project-1", "estimate-1", "other-node", "New Name")).rejects.toThrow(
      "Estimate tree node not found in the current project.",
    );

    expect(supabase.estimateQuery.eq).toHaveBeenCalledWith("id", "estimate-1");
    expect(supabase.estimateQuery.eq).toHaveBeenCalledWith("project_id", "project-1");
    expect(supabase.nodeValidationQuery.eq).toHaveBeenCalledWith("id", "other-node");
    expect(supabase.nodeValidationQuery.eq).toHaveBeenCalledWith("estimate_id", "estimate-1");
    expect(supabase.nodeValidationQuery.eq).toHaveBeenCalledWith("estimates.project_id", "project-1");
    expect(supabase.mutationQuery.update).not.toHaveBeenCalled();
  });

  it("scopes delete by project, estimate, and node and returns deleted ids with refreshed tree data", async () => {
    const mutationQuery = queryResult({ data: null, error: null });
    const supabase = scopedNodeSupabase({ mutationQuery });
    mockEstimateActionsDataStore(supabase);
    repositoryMocks.getProjectEstimateTreeByEstimate
      .mockResolvedValueOnce({
        project: { id: "project-1" },
        estimate: { id: "estimate-1" },
        tree: [
          {
            id: "ground-floor",
            name: "Ground Floor",
            kind: "group",
            total: "₱0.00",
            children: [
              { id: "kitchen", name: "Kitchen", kind: "area", total: "₱0.00", children: [] },
              { id: "living", name: "Living", kind: "area", total: "₱0.00", children: [] },
            ],
          },
        ],
      })
      .mockResolvedValueOnce({
        project: { id: "project-1" },
        estimate: { id: "estimate-1" },
        tree: [
          {
            id: "ground-floor",
            name: "Ground Floor",
            kind: "group",
            total: "₱0.00",
            children: [{ id: "living", name: "Living", kind: "area", total: "₱0.00", children: [] }],
          },
        ],
      });
    const { deleteEstimateNode } = await import("@/lib/estimates/actions");

    const result = await deleteEstimateNode("project-1", "estimate-1", "kitchen");

    expect(supabase.rpc).toHaveBeenCalledWith("delete_estimate_node_with_history", {
      target_project_id: "project-1",
      target_estimate_id: "estimate-1",
      target_node_id: "kitchen",
      acting_user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlation_id: expect.any(String),
    });
    expect(mutationQuery.delete).not.toHaveBeenCalled();
    expect(result.eventId).toBe("delete-event-1");
    expect(result.deletedNodeIds).toEqual(["kitchen"]);
    expect(result.fallbackNodeId).toBe("living");
    expect(result.tree).toEqual([
      {
        id: "ground-floor",
        name: "Ground Floor",
        kind: "group",
        total: "₱0.00",
        children: [{ id: "living", name: "Living", kind: "area", total: "₱0.00", children: [] }],
      },
    ]);
  });

  it("bulk deletes deduplicated selected roots and returns planned deleted ids with refreshed tree data", async () => {
    const estimateQuery = queryResult({ data: { id: "estimate-1", project_id: "project-1" }, error: null });
    const nodeQuery = queryResult({
      data: [
        { id: "ground-floor", estimate_id: "estimate-1", parent_id: "project-scope", kind: "group" },
        { id: "kitchen", estimate_id: "estimate-1", parent_id: "ground-floor", kind: "area" },
      ],
      error: null,
    });
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "estimates") return estimateQuery;
        if (table === "estimate_nodes") return nodeQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(async (name: string) => {
        if (name === "can_edit_estimate") return { data: true, error: null };
        return {
          data: {
            eventId: "delete-event-1",
            deletedRootNodeIds: ["ground-floor"],
            deletedNodeIds: ["ground-floor", "kitchen", "living"],
            fallbackNodeId: "site-works",
          },
          error: null,
        };
      }),
    };
    mockEstimateActionsDataStore(supabase);
    repositoryMocks.getProjectEstimateTreeByEstimate
      .mockResolvedValueOnce({
        project: { id: "project-1" },
        estimate: { id: "estimate-1" },
        tree: [
          {
            id: "project-scope",
            name: "Project Scope",
            kind: "group",
            total: "₱0.00",
            children: [
              {
                id: "ground-floor",
                name: "Ground Floor",
                kind: "group",
                total: "₱0.00",
                children: [
                  { id: "kitchen", name: "Kitchen", kind: "area", total: "₱0.00", children: [] },
                  { id: "living", name: "Living", kind: "area", total: "₱0.00", children: [] },
                ],
              },
              { id: "site-works", name: "Site Works", kind: "group", total: "₱0.00", children: [] },
            ],
          },
        ],
      })
      .mockResolvedValueOnce({
        project: { id: "project-1" },
        estimate: { id: "estimate-1" },
        tree: [
          {
            id: "project-scope",
            name: "Project Scope",
            kind: "group",
            total: "₱0.00",
            children: [{ id: "site-works", name: "Site Works", kind: "group", total: "₱0.00", children: [] }],
          },
        ],
      });
    const { deleteEstimateNodesBulk } = await import("@/lib/estimates/actions");

    const result = await deleteEstimateNodesBulk("project-1", "estimate-1", ["ground-floor", "kitchen"]);

    expect(nodeQuery.in).toHaveBeenCalledWith("id", ["ground-floor", "kitchen"]);
    expect(supabase.rpc).toHaveBeenCalledWith("can_edit_estimate", { target_estimate_id: "estimate-1" });
    expect(supabase.rpc).toHaveBeenCalledWith("delete_estimate_nodes_bulk_with_history", {
      target_project_id: "project-1",
      target_estimate_id: "estimate-1",
      target_node_ids: ["ground-floor"],
      acting_user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlation_id: expect.any(String),
    });
    expect(result.eventId).toBe("delete-event-1");
    expect(result.deletedNodeIds).toEqual(["ground-floor", "kitchen", "living"]);
    expect(result.fallbackNodeId).toBe("site-works");
    expect(result.tree).toEqual([
      {
        id: "project-scope",
        name: "Project Scope",
        kind: "group",
        total: "₱0.00",
        children: [{ id: "site-works", name: "Site Works", kind: "group", total: "₱0.00", children: [] }],
      },
    ]);
    // Bulk delete resolves with the refreshed tree; the client reconciles its
    // own cache, so no RSC revalidation churn is wanted here.
    expect(nextCacheMocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects bulk delete when any selected node is outside the scoped estimate", async () => {
    const estimateQuery = queryResult({ data: { id: "estimate-1", project_id: "project-1" }, error: null });
    const nodeQuery = queryResult({
      data: [{ id: "ground-floor", estimate_id: "estimate-1", parent_id: "project-scope", kind: "group" }],
      error: null,
    });
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "estimates") return estimateQuery;
        if (table === "estimate_nodes") return nodeQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(async (name: string) => {
        if (name === "can_edit_estimate") return { data: true, error: null };
        return { data: { eventId: "delete-event-1" }, error: null };
      }),
    };
    mockEstimateActionsDataStore(supabase);
    const { deleteEstimateNodesBulk } = await import("@/lib/estimates/actions");

    await expect(deleteEstimateNodesBulk("project-1", "estimate-1", ["ground-floor", "other-node"])).rejects.toThrow(
      "Estimate tree node not found in the current project: other-node.",
    );

    expect(authMocks.requireCurrentUserContext).toHaveBeenCalledTimes(1);
    expect(repositoryMocks.getProjectEstimateTreeByEstimate).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledWith("can_edit_estimate", { target_estimate_id: "estimate-1" });
    expect(supabase.rpc).not.toHaveBeenCalledWith("delete_estimate_nodes_bulk_with_history", expect.anything());
  });

  it("restores deleted tree nodes through the node restore history RPC and refreshes the target tab tree", async () => {
    const supabase = {
      rpc: vi.fn(async (name: string) => {
        if (name === "can_edit_estimate") return { data: true, error: null };
        return {
          data: {
            eventId: "restore-event-1",
            sourceEventId: "delete-event-1",
            restoredNodeIds: ["kitchen"],
            restoredRootNodeIds: ["kitchen"],
            restoredNodeCount: 1,
            restoredRowIds: ["row-1"],
            restoredRowCount: 1,
          },
          error: null,
        };
      }),
    };
    mockEstimateActionsDataStore(supabase);
    repositoryMocks.getEstimateTabTree.mockResolvedValueOnce({
      project: { id: "project-1" },
      estimate: { id: "estimate-1" },
      tree: [{ id: "kitchen", name: "Kitchen", kind: "area", total: "₱0.00", children: [] }],
    });
    const { restoreDeletedEstimateNodes } = await import("@/lib/estimates/actions");

    const result = await restoreDeletedEstimateNodes({
      projectId: "project-1",
      estimateId: "estimate-1",
      sourceEventId: "delete-event-1",
      nodeIds: ["kitchen"],
      targetTabId: "tab-2",
      mutationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });

    expect(supabase.rpc).toHaveBeenCalledWith("restore_deleted_estimate_nodes_with_history", {
      target_project_id: "project-1",
      target_estimate_id: "estimate-1",
      source_delete_event_id: "delete-event-1",
      target_node_ids: ["kitchen"],
      acting_user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlation_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });
    expect(repositoryMocks.getEstimateTabTree).toHaveBeenCalledWith("project-1", "estimate-1", "tab-2");
    expect(result).toEqual({
      eventId: "restore-event-1",
      sourceEventId: "delete-event-1",
      restoredNodeIds: ["kitchen"],
      restoredRootNodeIds: ["kitchen"],
      restoredNodeCount: 1,
      restoredRowIds: ["row-1"],
      restoredRowCount: 1,
      tree: [{ id: "kitchen", name: "Kitchen", kind: "area", total: "₱0.00", children: [] }],
    });
  });

  it("does not redirect inside rename or delete server actions", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/estimates/actions.ts"), "utf8");
    const renameStart = source.indexOf("export async function renameEstimateNode");
    const deleteStart = source.indexOf("export async function deleteEstimateNode");
    const afterDeleteStart = source.indexOf("export async function insertEstimateRowItemFromLibrary");

    expect(source.slice(renameStart, deleteStart)).not.toContain("redirect(");
    expect(source.slice(deleteStart, afterDeleteStart)).not.toContain("redirect(");
  });

  it("does not actively revalidate the current route for scalar rename patches", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/estimates/actions.ts"), "utf8");
    const renameStart = source.indexOf("export async function renameEstimateNode");
    const deleteStart = source.indexOf("export async function deleteEstimateNode");

    expect(source.slice(renameStart, deleteStart)).not.toContain("revalidatePath(");
    expect(source.slice(renameStart, deleteStart)).not.toContain("getProjectEstimateTreeByEstimate(");
  });
});

describe("insertEstimateRowItemFromLibrary server action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.requireCurrentUserContext.mockResolvedValue({ userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });
    repositoryMocks.getCurrentWorkspaceProject.mockResolvedValue({ project: { id: "project-1" } });
    repositoryMocks.getCurrentWorkspaceProjectForEstimate.mockResolvedValue({ project: { id: "project-1" } });
  });

  it("normalizes non-UUID row ids before inserting library rows", async () => {
    const targetNodeQuery = queryResult({
      data: { id: "55555555-5555-4555-8555-555555555561", estimate_id: "77777777-7777-4777-8777-777777777719", kind: "area" },
      error: null,
    });
    const existingRowsQuery = queryResult({ data: [], error: null });
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "estimate_nodes") return targetNodeQuery;
        if (table === "estimate_row_items") return existingRowsQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(async (name: string) => {
        if (name === "can_edit_estimate") return { data: true, error: null };
        return { data: { rowId: "row-1", row: { id: "row-1", nodeId: "55555555-5555-4555-8555-555555555561" } }, error: null };
      }),
    };
    mockEstimateActionsDataStore(supabase);
    const { insertEstimateRowItemFromLibrary } = await import("@/lib/estimates/actions");

    await insertEstimateRowItemFromLibrary({
      projectId: "project-1",
      estimateId: "77777777-7777-4777-8777-777777777719",
      targetNodeId: "55555555-5555-4555-8555-555555555561",
      rowId: "55555555-5555-4555-8555-555555555561-lib-sofa-1790000000000",
      libraryItem: {
        id: "lib-sofa",
        material: "HEMLINGBY Loveseat",
        description: "Sofa",
        supplier: "IKEA Philippines",
        source: "library",
        unit: "pc",
        itemCost: 7999,
        quantity: 1,
        subTotal: 7999,
        miscCost: 1200,
        totalItemCosts: 9199,
        category: "Furniture",
        pricingSource: "test",
        pricingDate: "2026-05-22",
      },
    });

    expect(supabase.rpc).toHaveBeenCalledTimes(2);
    expect(supabase.rpc).toHaveBeenCalledWith("can_edit_estimate", { target_estimate_id: "77777777-7777-4777-8777-777777777719" });
    expect(supabase.rpc).toHaveBeenCalledWith("insert_estimate_row_item_with_history", expect.objectContaining({
      target_project_id: "project-1",
      target_estimate_id: "77777777-7777-4777-8777-777777777719",
      target_node_id: "55555555-5555-4555-8555-555555555561",
      acting_user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlation_id: expect.any(String),
    }));
    const insertCall = supabase.rpc.mock.calls.find(([name]) => name === "insert_estimate_row_item_with_history");
    expect(insertCall).toBeDefined();
    const payload = insertCall?.[1].row_payload;
    expect(payload.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(payload.id).not.toContain("lib-sofa");
    expect(payload.sourceLibraryItemId).toBeNull();
    expect(payload.linkState).toBe("unlinked");
    expect(payload.miscCost).toBe(1200);
    expect(payload).not.toHaveProperty("labor_cost");
    expect(payload).not.toHaveProperty("supplementary_cost");
  });
});

describe("insertEstimateTemplateIntoEstimate server action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.requireCurrentUserContext.mockResolvedValue({ userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });
    repositoryMocks.getCurrentWorkspaceProject.mockReset();
    repositoryMocks.getCurrentWorkspaceProjectForEstimate.mockReset();
    repositoryMocks.getProjectEstimateTreeByEstimate.mockReset();
    repositoryMocks.getCurrentWorkspaceProject.mockResolvedValue({ project: { id: "project-1" } });
    repositoryMocks.getCurrentWorkspaceProjectForEstimate.mockResolvedValue({ project: { id: "project-1" } });
    repositoryMocks.getProjectEstimateTreeByEstimate.mockResolvedValue({
      project: { id: "project-1" },
      estimate: { id: "estimate-1" },
      tree: [{ id: "parent-group", name: "Ground Floor", kind: "group", total: "₱0.00", children: [] }],
    });
  });

  it("inserts a persisted estimate template by templateId through one RPC boundary", async () => {
    const rpcResult = {
      inserted_root_node_ids: ["new-root-node"],
      inserted_node_count: 2,
      inserted_row_item_count: 1,
    };
    const supabase = {
      from: vi.fn((table: string) => {
        throw new Error(`insertEstimateTemplateIntoEstimate must not query ${table} outside the RPC.`);
      }),
      // U4: the app-layer can_edit_estimate gate now runs before the insert RPC.
      rpc: vi.fn(async (name: string) => {
        if (name === "can_edit_estimate") return { data: true, error: null };
        return { data: rpcResult, error: null };
      }),
    };
    mockEstimateActionsDataStore(supabase);
    const { insertEstimateTemplateIntoEstimate } = await import("@/lib/estimates/actions");

    const result = await insertEstimateTemplateIntoEstimate({
      projectId: "project-1",
      estimateId: "estimate-1",
      targetParentNodeId: "parent-group",
      templateId: "template-1",
      template: {
        id: "attacker-template",
        name: "Client Forgery",
        description: "Should be ignored",
        category: "Unsafe",
        nodes: [{ id: "forged-node", name: "Forged", kind: "area", total: "PHP 0.00" }],
      },
    } as never);

    expect(supabase.rpc).toHaveBeenCalledTimes(2);
    expect(supabase.rpc).toHaveBeenNthCalledWith(1, "can_edit_estimate", { target_estimate_id: "estimate-1" });
    expect(repositoryMocks.getCurrentWorkspaceProjectForEstimate).toHaveBeenCalledWith("project-1", "estimate-1");
    expect(repositoryMocks.getCurrentWorkspaceProject).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenNthCalledWith(2, "insert_estimate_template_into_estimate_with_history", {
      target_project_id: "project-1",
      target_estimate_id: "estimate-1",
      target_parent_node_id: "parent-group",
      source_template_id: "template-1",
      acting_user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlation_id: expect.any(String),
    });
    expect(supabase.from).not.toHaveBeenCalled();
    expect(repositoryMocks.getProjectEstimateTreeByEstimate).toHaveBeenCalledWith("project-1", "estimate-1");
    expect(result).toEqual({
      tree: [{ id: "parent-group", name: "Ground Floor", kind: "group", total: "₱0.00", children: [] }],
      insertedRootNodeIds: ["new-root-node"],
    });
  });

  it("surfaces template RPC failures without attempting best-effort table cleanup", async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        throw new Error(`insertEstimateTemplateIntoEstimate must not query ${table} outside the RPC.`);
      }),
      // U4: can_edit_estimate passes, then the insert RPC surfaces the failure.
      rpc: vi.fn(async (name: string) => {
        if (name === "can_edit_estimate") return { data: true, error: null };
        return { data: null, error: new Error("Template row items must belong to area nodes.") };
      }),
    };
    mockEstimateActionsDataStore(supabase);
    const { insertEstimateTemplateIntoEstimate } = await import("@/lib/estimates/actions");

    await expect(
      insertEstimateTemplateIntoEstimate({
        projectId: "project-1",
        estimateId: "estimate-1",
        targetParentNodeId: "parent-group",
        templateId: "template-1",
      }),
    ).rejects.toThrow("Could not insert estimate template: Template row items must belong to area nodes.");

    expect(supabase.rpc).toHaveBeenCalledTimes(2);
    expect(supabase.from).not.toHaveBeenCalled();
    expect(repositoryMocks.getProjectEstimateTreeByEstimate).not.toHaveBeenCalled();
  });

  it("denies a workspace-member viewer before the insert RPC (U4 / SEC-1)", async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        throw new Error(`insertEstimateTemplateIntoEstimate must not query ${table} when edit is denied.`);
      }),
      rpc: vi.fn(async (name: string) => {
        if (name === "can_edit_estimate") return { data: false, error: null };
        throw new Error(`denied insert must not call ${name}`);
      }),
    };
    mockEstimateActionsDataStore(supabase);
    const { insertEstimateTemplateIntoEstimate } = await import("@/lib/estimates/actions");

    await expect(
      insertEstimateTemplateIntoEstimate({
        projectId: "project-1",
        estimateId: "estimate-1",
        targetParentNodeId: "parent-group",
        templateId: "template-1",
      }),
    ).rejects.toThrow("Estimate edit access denied.");

    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledWith("can_edit_estimate", { target_estimate_id: "estimate-1" });
    expect(repositoryMocks.getProjectEstimateTreeByEstimate).not.toHaveBeenCalled();
  });
});

describe("insertEstimateTemplateNodeIntoEstimate server action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.requireCurrentUserContext.mockResolvedValue({ userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });
    repositoryMocks.getCurrentWorkspaceProject.mockResolvedValue({ project: { id: "project-1" } });
    repositoryMocks.getCurrentWorkspaceProjectForEstimate.mockResolvedValue({ project: { id: "project-1" } });
  });

  it("denies a viewer before any node/row write on the direct-call path (U4)", async () => {
    // This path is reachable directly from the panel, not only via the gated
    // wrap flow, so it must deny a workspace-member viewer before its create/
    // insert RPCs (review finding: previously unguarded).
    const from = vi.fn((table: string) => {
      throw new Error(`insertEstimateTemplateNodeIntoEstimate must not query ${table} when edit is denied.`);
    });
    const rpc = vi.fn(async (name: string) => {
      if (name === "can_edit_estimate") return { data: false, error: null };
      throw new Error(`denied node insert must not call ${name}`);
    });
    mockEstimateActionsDataStore({ from, rpc });
    const { insertEstimateTemplateNodeIntoEstimate } = await import("@/lib/estimates/actions");

    await expect(
      insertEstimateTemplateNodeIntoEstimate({
        projectId: "project-1",
        estimateId: "estimate-1",
        targetParentNodeId: "parent-group",
        templateId: "template-1",
        templateNodeId: "template-node-1",
      }),
    ).rejects.toThrow("Estimate edit access denied.");

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("can_edit_estimate", { target_estimate_id: "estimate-1" });
    expect(from).not.toHaveBeenCalled();
  });

  it("copies template-node subtrees through one transactional RPC and refreshes the targeted tab", async () => {
    const from = vi.fn((table: string) => {
      throw new Error(`transactional node insert must not query ${table} in the action wrapper.`);
    });
    const rpc = vi.fn(async (name: string) => {
      if (name === "can_edit_estimate") return { data: true, error: null };
      if (name === "insert_estimate_template_node_into_estimate_with_history") {
        return { data: { insertedRootNodeId: "created-template-root" }, error: null };
      }
      throw new Error(`Unexpected RPC ${name}`);
    });
    mockEstimateActionsDataStore({ from, rpc });
    const { insertEstimateTemplateNodeIntoEstimate } = await import("@/lib/estimates/actions");

    const result = await insertEstimateTemplateNodeIntoEstimate({
      projectId: "project-1",
      estimateId: "estimate-1",
      targetParentNodeId: "parent-group",
      templateId: "template-1",
      templateNodeId: "template-node-1",
      targetTabId: "tab-2",
    });

    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenNthCalledWith(1, "can_edit_estimate", { target_estimate_id: "estimate-1" });
    expect(rpc).toHaveBeenNthCalledWith(2, "insert_estimate_template_node_into_estimate_with_history", {
      target_project_id: "project-1",
      target_estimate_id: "estimate-1",
      target_parent_node_id: "parent-group",
      source_template_id: "template-1",
      source_template_node_id: "template-node-1",
      acting_user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlation_id: expect.any(String),
      target_tab_id: "tab-2",
    });
    expect(rpc.mock.calls.map(([name]) => name)).not.toContain("create_estimate_node_with_history");
    expect(rpc.mock.calls.map(([name]) => name)).not.toContain("insert_estimate_row_item_with_history");
    expect(from).not.toHaveBeenCalled();
    expect(repositoryMocks.getEstimateTabTree).toHaveBeenCalledWith("project-1", "estimate-1", "tab-2");
    expect(result).toEqual({
      tree: [{ id: "tab-root", name: "Tab Root", kind: "group", total: "₱0.00", children: [] }],
      insertedRootNodeId: "created-template-root",
    });
  });
});
