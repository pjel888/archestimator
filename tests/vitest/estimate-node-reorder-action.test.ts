import { beforeEach, describe, expect, it, vi } from "vitest";

const repositoryMocks = vi.hoisted(() => ({
  getCurrentWorkspaceProject: vi.fn(),
  getProjectEstimateTreeByEstimate: vi.fn(),
}));

const supabaseServerMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}));

const nextCacheMocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}));

const nextNavigationMocks = vi.hoisted(() => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/repositories/workspace-repository", () => repositoryMocks);
vi.mock("@/lib/supabase/server", () => supabaseServerMocks);
vi.mock("next/cache", () => nextCacheMocks);
vi.mock("next/navigation", () => nextNavigationMocks);

type EstimateNodeRow = {
  id: string;
  kind: "group" | "area" | "lot" | "general" | "structure" | "level" | "assembly" | "legacy";
  estimate_id: string;
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
    rpc: vi.fn(async () => rpcResults?.shift() ?? rpcResult),
    estimateQuery,
    nodeQuery,
  };
  return supabase;
}

describe("reorderEstimateTreeNodes server action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repositoryMocks.getCurrentWorkspaceProject.mockResolvedValue({ project: { id: "project-1" } });
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
    expect(supabaseServerMocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("converts camelCase updates to one scoped reorder_estimate_nodes RPC and returns the fresh nested tree", async () => {
    const supabase = makeSupabase({
      nodes: [
        { id: "ground-floor", kind: "group", estimate_id: "estimate-1", parent_id: "project-scope" },
        { id: "kitchen", kind: "area", estimate_id: "estimate-1", parent_id: "ground-floor" },
        { id: "living", kind: "area", estimate_id: "estimate-1", parent_id: "ground-floor" },
        { id: "site-works", kind: "group", estimate_id: "estimate-1", parent_id: "project-scope" },
        { id: "front-yard", kind: "area", estimate_id: "estimate-1", parent_id: "site-works" },
      ],
    });
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);
    const { reorderEstimateTreeNodes } = await import("@/lib/estimates/actions");

    const result = await reorderEstimateTreeNodes("project-1", "estimate-1", {
      updates: [
        { id: "living", parentId: "ground-floor", sortOrder: 10 },
        { id: "front-yard", parentId: "site-works", sortOrder: 10 },
        { id: "kitchen", parentId: "site-works", sortOrder: 20 },
      ],
    });

    expect(repositoryMocks.getCurrentWorkspaceProject).toHaveBeenCalledWith("project-1");
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledWith("reorder_estimate_nodes", {
      target_estimate_id: "estimate-1",
      move_updates: [
        { id: "living", parent_id: "ground-floor", sort_order: 10 },
        { id: "front-yard", parent_id: "site-works", sort_order: 10 },
        { id: "kitchen", parent_id: "site-works", sort_order: 20 },
      ],
    });
    expect(repositoryMocks.getProjectEstimateTreeByEstimate).toHaveBeenCalledWith("project-1", "estimate-1");
    expect(result.tree).toEqual([{ id: "project-scope", name: "Project Scope", kind: "group", total: "₱0.00", children: [] }]);
    expect(nextNavigationMocks.redirect).not.toHaveBeenCalled();
  });

  it("calls Supabase rpc with the client receiver when nesting one Group Node under another", async () => {
    const estimateQuery = queryResult({ data: { id: "estimate-1", project_id: "project-1" }, error: null });
    const nodeQuery = queryResult({
      data: [
        { id: "project-scope", kind: "group", estimate_id: "estimate-1", parent_id: null },
        { id: "site-works", kind: "group", estimate_id: "estimate-1", parent_id: "project-scope" },
        { id: "ground-floor", kind: "group", estimate_id: "estimate-1", parent_id: "project-scope" },
      ],
      error: null,
    });
    const restRpc = vi.fn(async () => ({ data: 2, error: null }));
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
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);
    const { reorderEstimateTreeNodes } = await import("@/lib/estimates/actions");

    await reorderEstimateTreeNodes("project-1", "estimate-1", {
      updates: [
        { id: "site-works", parentId: "ground-floor", sortOrder: 10 },
        { id: "ground-floor", parentId: "project-scope", sortOrder: 20 },
      ],
    });

    expect(restRpc).toHaveBeenCalledWith("reorder_estimate_nodes", {
      target_estimate_id: "estimate-1",
      move_updates: [
        { id: "site-works", parent_id: "ground-floor", sort_order: 10 },
        { id: "ground-floor", parent_id: "project-scope", sort_order: 20 },
      ],
    });
  });

  it("rejects Area Nodes as parents and Area Nodes at the estimate root before the RPC", async () => {
    const supabase = makeSupabase({
      nodes: [
        { id: "living", kind: "area", estimate_id: "estimate-1", parent_id: "ground-floor" },
        { id: "kitchen", kind: "area", estimate_id: "estimate-1", parent_id: "ground-floor" },
      ],
    });
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);
    const { reorderEstimateTreeNodes } = await import("@/lib/estimates/actions");

    await expect(
      reorderEstimateTreeNodes("project-1", "estimate-1", {
        updates: [{ id: "living", parentId: "kitchen", sortOrder: 10 }],
      }),
    ).rejects.toThrow("area nodes cannot be placed under area.");
    await expect(
      reorderEstimateTreeNodes("project-1", "estimate-1", {
        updates: [{ id: "kitchen", parentId: null, sortOrder: 10 }],
      }),
    ).rejects.toThrow("area nodes cannot be placed under estimate root.");
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("treats legacy organizing estimate-node kinds as group nodes during the remote migration transition", async () => {
    const supabase = makeSupabase({
      nodes: [
        { id: "second-floor", kind: "level", estimate_id: "estimate-1", parent_id: "house" },
        { id: "master-bedroom", kind: "area", estimate_id: "estimate-1", parent_id: "second-floor" },
      ],
    });
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);
    const { reorderEstimateTreeNodes } = await import("@/lib/estimates/actions");

    await reorderEstimateTreeNodes("project-1", "estimate-1", {
      updates: [{ id: "master-bedroom", parentId: "second-floor", sortOrder: 20 }],
    });

    expect(supabase.rpc).toHaveBeenCalledWith("reorder_estimate_nodes", {
      target_estimate_id: "estimate-1",
      move_updates: [{ id: "master-bedroom", parent_id: "second-floor", sort_order: 20 }],
    });
  });

  it("rejects inactive or cross-estimate nodes before the RPC", async () => {
    const supabase = makeSupabase({
      nodes: [
        { id: "legacy-node", kind: "legacy", estimate_id: "estimate-1", parent_id: null },
        { id: "other-estimate-parent", kind: "group", estimate_id: "other-estimate", parent_id: null },
      ],
    });
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);
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
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("converts RPC errors into a user-readable reorder failure", async () => {
    const supabase = makeSupabase({
      nodes: [{ id: "project-scope", kind: "group", estimate_id: "estimate-1", parent_id: null }],
      rpcResult: { data: 0, error: new Error("cycle detected") },
    });
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);
    const { reorderEstimateTreeNodes } = await import("@/lib/estimates/actions");

    await expect(
      reorderEstimateTreeNodes("project-1", "estimate-1", {
        updates: [{ id: "project-scope", parentId: null, sortOrder: 10 }],
      }),
    ).rejects.toThrow("Could not reorder estimate tree: cycle detected");
  });
});

describe("createEstimateNode server action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repositoryMocks.getCurrentWorkspaceProject.mockResolvedValue({ project: { id: "project-1" } });
  });

  it("allows new area nodes under legacy organizing parents during the remote migration transition", async () => {
    const estimateQuery = queryResult({ data: { id: "estimate-1", project_id: "project-1" }, error: null });
    const parentQuery = queryResult({
      data: { id: "second-floor", kind: "level", estimate_id: "estimate-1", estimates: { project_id: "project-1" } },
      error: null,
    });
    const siblingQuery = queryResult({ data: [{ sort_order: 7 }], error: null });
    const insertQuery = queryResult({ data: { id: "new-bedroom" }, error: null });
    const estimateNodeQueries = [parentQuery, siblingQuery, insertQuery];
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
    };
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);
    const formData = new FormData();
    formData.set("name", "New Bedroom");
    formData.set("kind", "area");
    formData.set("parentId", "second-floor");
    const { createEstimateNode } = await import("@/lib/estimates/actions");

    await createEstimateNode("project-1", "estimate-1", formData);

    expect(insertQuery.insert).toHaveBeenCalledWith({
      estimate_id: "estimate-1",
      parent_id: "second-floor",
      kind: "area",
      name: "New Bedroom",
      sort_order: 8,
    });
    expect(nextCacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop/projects/project-1/estimates");
    expect(nextCacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop/projects/project-1/estimates/estimate-1");
    expect(nextNavigationMocks.redirect).toHaveBeenCalledWith("/workshop/projects/project-1/estimates/new-bedroom");
  });
});
