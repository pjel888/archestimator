import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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
    const siblingQuery = queryResult({ data: [{ id: "existing-bedroom", kind: "area", sort_order: 7 }], error: null });
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
      rpc: vi.fn(async () => ({ data: 2, error: null })),
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
    expect(supabase.rpc).toHaveBeenCalledWith("reorder_estimate_nodes", {
      target_estimate_id: "estimate-1",
      move_updates: [
        { id: "existing-bedroom", parent_id: "second-floor", sort_order: 10 },
        { id: "new-bedroom", parent_id: "second-floor", sort_order: 20 },
      ],
    });
    expect(nextCacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop/projects/project-1/estimates");
    expect(nextCacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop/projects/project-1/estimates/estimate-1");
    expect(nextNavigationMocks.redirect).toHaveBeenCalledWith("/workshop/projects/project-1/estimates/new-bedroom");
  });

  it("orders a new Group Node before existing Area Node siblings", async () => {
    const estimateQuery = queryResult({ data: { id: "estimate-1", project_id: "project-1" }, error: null });
    const parentQuery = queryResult({
      data: { id: "main-house", kind: "group", estimate_id: "estimate-1", estimates: { project_id: "project-1" } },
      error: null,
    });
    const siblingQuery = queryResult({ data: [{ id: "kitchen", kind: "area", sort_order: 10 }], error: null });
    const insertQuery = queryResult({ data: { id: "new-group" }, error: null });
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
      rpc: vi.fn(async () => ({ data: 2, error: null })),
    };
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);
    const formData = new FormData();
    formData.set("name", "New Group");
    formData.set("kind", "group");
    formData.set("parentId", "main-house");
    const { createEstimateNode } = await import("@/lib/estimates/actions");

    await createEstimateNode("project-1", "estimate-1", formData);

    expect(insertQuery.insert).toHaveBeenCalledWith({
      estimate_id: "estimate-1",
      parent_id: "main-house",
      kind: "group",
      name: "New Group",
      sort_order: 11,
    });
    expect(supabase.rpc).toHaveBeenCalledWith("reorder_estimate_nodes", {
      target_estimate_id: "estimate-1",
      move_updates: [
        { id: "new-group", parent_id: "main-house", sort_order: 10 },
        { id: "kitchen", parent_id: "main-house", sort_order: 20 },
      ],
    });
    expect(nextNavigationMocks.redirect).toHaveBeenCalledWith("/workshop/projects/project-1/estimates/new-group");
  });

  it("removes the inserted node if sibling reordering fails", async () => {
    const estimateQuery = queryResult({ data: { id: "estimate-1", project_id: "project-1" }, error: null });
    const parentQuery = queryResult({
      data: { id: "main-house", kind: "group", estimate_id: "estimate-1", estimates: { project_id: "project-1" } },
      error: null,
    });
    const siblingQuery = queryResult({ data: [{ id: "kitchen", kind: "area", sort_order: 10 }], error: null });
    const insertQuery = queryResult({ data: { id: "new-group" }, error: null });
    const deleteQuery = queryResult({ data: null, error: null });
    const estimateNodeQueries = [parentQuery, siblingQuery, insertQuery, deleteQuery];
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
      rpc: vi.fn(async () => ({ data: null, error: new Error("duplicate estimate node reorder slots") })),
    };
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);
    const formData = new FormData();
    formData.set("name", "New Group");
    formData.set("kind", "group");
    formData.set("parentId", "main-house");
    const { createEstimateNode } = await import("@/lib/estimates/actions");

    await expect(createEstimateNode("project-1", "estimate-1", formData)).rejects.toThrow(
      "Could not order estimate tree siblings: duplicate estimate node reorder slots",
    );

    expect(deleteQuery.delete).toHaveBeenCalledTimes(1);
    expect(deleteQuery.eq).toHaveBeenCalledWith("id", "new-group");
    expect(deleteQuery.eq).toHaveBeenCalledWith("estimate_id", "estimate-1");
    expect(nextCacheMocks.revalidatePath).not.toHaveBeenCalled();
    expect(nextNavigationMocks.redirect).not.toHaveBeenCalled();
  });
});

describe("renameEstimateNode and deleteEstimateNode server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repositoryMocks.getCurrentWorkspaceProject.mockResolvedValue({ project: { id: "project-1" } });
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
      estimateQuery,
      nodeValidationQuery,
      mutationQuery,
    };
    return supabase;
  }

  it("trims names before updating and returns a minimal reconciliation patch", async () => {
    const mutationQuery = queryResult({ data: null, error: null });
    const supabase = scopedNodeSupabase({ mutationQuery });
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);
    const { renameEstimateNode } = await import("@/lib/estimates/actions");

    const result = await renameEstimateNode("project-1", "estimate-1", "kitchen", "  Chef Kitchen  ");

    expect(mutationQuery.update).toHaveBeenCalledWith({ name: "Chef Kitchen" });
    expect(mutationQuery.eq).toHaveBeenCalledWith("id", "kitchen");
    expect(mutationQuery.eq).toHaveBeenCalledWith("estimate_id", "estimate-1");
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
    expect(supabaseServerMocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("scopes rename validation to project, estimate, and node", async () => {
    const supabase = scopedNodeSupabase({
      nodeResult: { data: null, error: null },
      mutationQuery: queryResult({ data: null, error: null }),
    });
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);
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
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(supabase);
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

    expect(mutationQuery.delete).toHaveBeenCalledTimes(1);
    expect(mutationQuery.eq).toHaveBeenCalledWith("id", "kitchen");
    expect(mutationQuery.eq).toHaveBeenCalledWith("estimate_id", "estimate-1");
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
