import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  requireCurrentUserContext: vi.fn(),
}));

const repositoryMocks = vi.hoisted(() => ({
  getEstimateTabs: vi.fn(),
  getEstimateTabTree: vi.fn(),
  getProjectEstimateTreeByEstimate: vi.fn(),
  listCurrentWorkspaceProjectSearchCandidates: vi.fn(),
  listCurrentWorkspaceProjects: vi.fn(),
  listProjectEstimateSheets: vi.fn(),
}));

const supabaseServerMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}));
const supabaseServiceRoleMocks = vi.hoisted(() => ({
  createSupabaseServiceRoleClient: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireCurrentUserContext: authMocks.requireCurrentUserContext,
}));

vi.mock("@/lib/supabase/server", () => supabaseServerMocks);
vi.mock("@/lib/supabase/service-role", () => supabaseServiceRoleMocks);

vi.mock("@/lib/repositories/workspace-repository", () => ({
  getEstimateTabs: repositoryMocks.getEstimateTabs,
  getEstimateTabTree: repositoryMocks.getEstimateTabTree,
  getProjectEstimateTreeByEstimate:
    repositoryMocks.getProjectEstimateTreeByEstimate,
  listCurrentWorkspaceProjectSearchCandidates:
    repositoryMocks.listCurrentWorkspaceProjectSearchCandidates,
  listCurrentWorkspaceProjects: repositoryMocks.listCurrentWorkspaceProjects,
  listProjectEstimateSheets: repositoryMocks.listProjectEstimateSheets,
}));

// U5: the server-side search pre-filters matching estimates via two bounded
// ILIKE queries (estimate_nodes + estimate_tabs) before materializing trees. This
// chainable stub resolves each `.from(table)...` chain to the configured result.
type SearchPrefilterResult = { data: unknown; error: unknown };
type SearchPrefilterCall = {
  table: string;
  method: string;
  args: unknown[];
};
const searchPrefilterCalls: SearchPrefilterCall[] = [];

function mockSearchPrefilter(
  resultByTable: Record<
    string,
    | SearchPrefilterResult
    | SearchPrefilterResult[]
    | ((calls: SearchPrefilterCall[]) => SearchPrefilterResult)
  >,
) {
  const callCountByTable = new Map<string, number>();
  const makeBuilder = (table: string) => {
    const builderCalls: SearchPrefilterCall[] = [];
    let rangeBounds: { from: number; to: number } | null = null;
    const readResult = () => {
      const configured = resultByTable[table] ?? { data: [], error: null };
      const callCount = callCountByTable.get(table) ?? 0;
      callCountByTable.set(table, callCount + 1);
      const result = typeof configured === "function"
        ? configured(builderCalls)
        : Array.isArray(configured)
          ? configured[Math.min(callCount, configured.length - 1)] ?? { data: [], error: null }
          : configured;
      return rangeBounds && Array.isArray(result.data)
        ? { ...result, data: result.data.slice(rangeBounds.from, rangeBounds.to + 1) }
        : result;
    };
    const builder: Record<string, unknown> = {};
    for (const method of [
      "select",
      "in",
      "ilike",
      "is",
      "eq",
      "order",
      "limit",
      "range",
    ]) {
      builder[method] = (...args: unknown[]) => {
        const call = { table, method, args };
        builderCalls.push(call);
        searchPrefilterCalls.push(call);
        if (method === "range") {
          rangeBounds = { from: Number(args[0]), to: Number(args[1]) };
        }
        return builder;
      };
    }
    builder.then = (resolve: (value: unknown) => unknown) =>
      resolve(readResult());
    builder.maybeSingle = async () => readResult();
    return builder;
  };
  searchPrefilterCalls.length = 0;
  supabaseServerMocks.createSupabaseServerClient.mockResolvedValue({
    from: (table: string) => makeBuilder(table),
  });
}

function mockReusableSearchRateLimit() {
  const events: Array<{ scope: string; key_hash: string; occurred_at: string; expires_at: string }> = [];
  const calls: Array<{ table: string; method: string; args: unknown[] }> = [];
  const makeBuilder = (table: string) => {
    const filters: Array<{ method: string; column: string; value: unknown }> = [];
    const builder = {
      delete: () => {
        calls.push({ table, method: "delete", args: [] });
        return builder;
      },
      lt: (column: string, value: unknown) => {
        calls.push({ table, method: "lt", args: [column, value] });
        filters.push({ method: "lt", column, value });
        return Promise.resolve({ error: null });
      },
      insert: (event: { scope: string; key_hash: string; expires_at: string }) => {
        calls.push({ table, method: "insert", args: [event] });
        events.push({
          scope: event.scope,
          key_hash: event.key_hash,
          occurred_at: new Date().toISOString(),
          expires_at: event.expires_at,
        });
        return Promise.resolve({ error: null });
      },
      select: (...args: unknown[]) => {
        calls.push({ table, method: "select", args });
        return builder;
      },
      eq: (column: string, value: unknown) => {
        calls.push({ table, method: "eq", args: [column, value] });
        filters.push({ method: "eq", column, value });
        return builder;
      },
      gte: (column: string, value: unknown) => {
        calls.push({ table, method: "gte", args: [column, value] });
        filters.push({ method: "gte", column, value });
        const count = events.filter((event) => filters.every((filter) => {
          if (filter.method === "eq" && filter.column === "scope") return event.scope === filter.value;
          if (filter.method === "eq" && filter.column === "key_hash") return event.key_hash === filter.value;
          if (filter.method === "gte") return event.occurred_at >= String(filter.value);
          return true;
        })).length;
        return Promise.resolve({ count, error: null });
      },
    };
    return builder;
  };
  supabaseServiceRoleMocks.createSupabaseServiceRoleClient.mockReturnValue({
    from: (table: string) => makeBuilder(table),
  });
  return { calls, events };
}

const projectAId = "11111111-1111-4111-8111-111111111111";
const projectBId = "22222222-2222-4222-8222-222222222222";
const estimateAId = "33333333-3333-4333-8333-333333333333";
const tabAId = "44444444-4444-4444-8444-444444444444";

beforeEach(() => {
  authMocks.requireCurrentUserContext.mockResolvedValue({ userId: "user-1" });
  repositoryMocks.getEstimateTabs.mockReset();
  repositoryMocks.getEstimateTabTree.mockReset();
  repositoryMocks.getProjectEstimateTreeByEstimate.mockReset();
  repositoryMocks.listCurrentWorkspaceProjectSearchCandidates.mockReset();
  repositoryMocks.listCurrentWorkspaceProjects.mockReset();
  repositoryMocks.listProjectEstimateSheets.mockReset();
  repositoryMocks.listProjectEstimateSheets.mockResolvedValue([]);
  supabaseServerMocks.createSupabaseServerClient.mockReset();
  supabaseServiceRoleMocks.createSupabaseServiceRoleClient.mockReset();
  // Default: no estimate matches the pre-filter (the search test sets the match).
  mockSearchPrefilter({});
  mockReusableSearchRateLimit();
});

describe("reusable project source actions", () => {
  it("lists only readable project roots without eager estimate or outline reads", async () => {
    repositoryMocks.listCurrentWorkspaceProjects.mockResolvedValue({
      projects: [
        {
          accessKind: "owner",
          project: { id: projectAId, name: "Accessible Project" },
        },
        {
          accessKind: "pending-invite",
          project: { id: projectBId, name: "Pending Invite Project" },
        },
      ],
    });

    const { listReusableProjectSources } =
      await import("@/lib/reusable-sources/actions");
    const result = await listReusableProjectSources();

    expect(repositoryMocks.listProjectEstimateSheets).not.toHaveBeenCalled();
    expect(repositoryMocks.getEstimateTabs).not.toHaveBeenCalled();
    expect(repositoryMocks.getEstimateTabTree).not.toHaveBeenCalled();
    expect(result.sources).toEqual([
      { kind: "project", projectId: projectAId, name: "Accessible Project" },
    ]);
  });

  it("loads readable estimates for one expanded project", async () => {
    repositoryMocks.listCurrentWorkspaceProjects.mockResolvedValue({
      projects: [
        {
          accessKind: "owner",
          project: { id: projectAId, name: "Accessible Project" },
        },
        {
          accessKind: "pending-invite",
          project: { id: projectBId, name: "Pending Invite Project" },
        },
      ],
    });
    repositoryMocks.listProjectEstimateSheets.mockResolvedValueOnce([
      {
        id: estimateAId,
        name: "Lobby Estimate",
        sheetCode: "EST-002",
        updatedAt: "2026-06-12T08:00:00.000Z",
      },
    ]);

    const { listReusableProjectEstimateSources } =
      await import("@/lib/reusable-sources/actions");
    const result = await listReusableProjectEstimateSources({
      projectId: projectAId,
    });

    expect(repositoryMocks.listProjectEstimateSheets).toHaveBeenCalledTimes(1);
    expect(repositoryMocks.listProjectEstimateSheets).toHaveBeenCalledWith(
      projectAId,
    );
    expect(repositoryMocks.getEstimateTabs).not.toHaveBeenCalled();
    expect(repositoryMocks.getEstimateTabTree).not.toHaveBeenCalled();
    expect(result.sources).toEqual([
      {
        kind: "project-estimate",
        projectId: projectAId,
        estimateId: estimateAId,
        name: "Lobby Estimate",
        sheetCode: "EST-002",
        metadata: {
          projectName: "Accessible Project",
          estimateName: "Lobby Estimate",
          sheetCode: "EST-002",
          updatedAt: "2026-06-12T08:00:00.000Z",
        },
      },
    ]);
  });

  it("keeps the 20-project scale path lazy until one project and one estimate expand", async () => {
    const projects = Array.from({ length: 20 }, (_, index) => ({
      accessKind: "owner",
      project: {
        id: `project-${String(index + 1).padStart(2, "0")}`,
        name: `Project ${index + 1}`,
      },
    }));
    repositoryMocks.listCurrentWorkspaceProjects.mockResolvedValue({
      projects,
    });

    const {
      getReusableEstimateOutline,
      listReusableProjectEstimateSources,
      listReusableProjectSources,
    } = await import("@/lib/reusable-sources/actions");
    const rootResult = await listReusableProjectSources();

    expect(rootResult.sources).toHaveLength(20);
    expect(repositoryMocks.listProjectEstimateSheets).not.toHaveBeenCalled();
    expect(repositoryMocks.getEstimateTabs).not.toHaveBeenCalled();
    expect(repositoryMocks.getEstimateTabTree).not.toHaveBeenCalled();

    repositoryMocks.listProjectEstimateSheets.mockResolvedValueOnce(
      Array.from({ length: 5 }, (_, index) => ({
        id: `estimate-${index + 1}`,
        name: `Estimate ${index + 1}`,
        sheetCode: `EST-${index + 1}`,
        updatedAt: "2026-06-12T08:00:00.000Z",
      })),
    );
    const estimateResult = await listReusableProjectEstimateSources({
      projectId: "project-10",
    });

    expect(repositoryMocks.listProjectEstimateSheets).toHaveBeenCalledTimes(1);
    expect(repositoryMocks.listProjectEstimateSheets).toHaveBeenCalledWith(
      "project-10",
    );
    expect(estimateResult.sources).toHaveLength(5);

    repositoryMocks.getEstimateTabs.mockResolvedValue(
      Array.from({ length: 3 }, (_, index) => ({
        id: `tab-${index + 1}`,
        name: `Tab ${index + 1}`,
        sortOrder: index,
        isDefault: index === 0,
      })),
    );
    repositoryMocks.getEstimateTabTree.mockResolvedValue({
      estimate: { updated_at: "2026-06-12T08:30:00.000Z" },
      tree: [],
    });

    await getReusableEstimateOutline({
      projectId: "project-10",
      estimateId: "estimate-1",
    });

    expect(repositoryMocks.getEstimateTabs).toHaveBeenCalledTimes(1);
    expect(repositoryMocks.getEstimateTabTree).toHaveBeenCalledTimes(3);
  });

  it("loads a per-estimate reusable outline with tab and group or area sources", async () => {
    repositoryMocks.getEstimateTabs.mockResolvedValue([
      { id: tabAId, name: "Lobby Main", sortOrder: 0, isDefault: true },
    ]);
    repositoryMocks.getEstimateTabTree.mockResolvedValue({
      estimate: { updated_at: "2026-06-12T08:30:00.000Z" },
      tree: [
        {
          id: "group-1",
          name: "Amenity Millwork",
          kind: "group",
          total: "₱0.00",
          estimateRowItems: [{ totalItemCosts: 100 }],
          children: [
            {
              id: "area-1",
              name: "Reception Feature Wall",
              kind: "area",
              total: "₱0.00",
              estimateRowItems: [
                { totalItemCosts: 200 },
                { totalItemCosts: 50 },
              ],
            },
          ],
        },
      ],
    });

    const { getReusableEstimateOutline } =
      await import("@/lib/reusable-sources/actions");
    const result = await getReusableEstimateOutline({
      projectId: projectAId,
      estimateId: estimateAId,
    });

    expect(repositoryMocks.getEstimateTabs).toHaveBeenCalledWith(
      projectAId,
      estimateAId,
      { allowLegacyFallback: true },
    );
    expect(repositoryMocks.getEstimateTabTree).toHaveBeenCalledWith(
      projectAId,
      estimateAId,
      tabAId,
      { allowLegacyFallback: true },
    );
    expect(result.sources).toEqual([
      {
        kind: "project-tab",
        projectId: projectAId,
        estimateId: estimateAId,
        tabId: tabAId,
        name: "Lobby Main",
        displayName: "Page 001",
        sortOrder: 0,
        metadata: {
          tabName: "Lobby Main",
          tabDisplayName: "Page 001",
          updatedAt: "2026-06-12T08:30:00.000Z",
          rowCount: 3,
          totalCost: 350,
        },
      },
      {
        kind: "project-node",
        projectId: projectAId,
        estimateId: estimateAId,
        tabId: tabAId,
        nodeId: "group-1",
        parentNodeId: null,
        nodeKind: "group",
        name: "Amenity Millwork",
        rowItems: [{ totalItemCosts: 100 }],
        metadata: {
          tabName: "Lobby Main",
          tabDisplayName: "Page 001",
          nodePath: ["Page 001", "Amenity Millwork"],
          updatedAt: "2026-06-12T08:30:00.000Z",
          rowCount: 3,
          totalCost: 350,
        },
      },
      {
        kind: "project-node",
        projectId: projectAId,
        estimateId: estimateAId,
        tabId: tabAId,
        nodeId: "area-1",
        parentNodeId: "group-1",
        nodeKind: "area",
        name: "Reception Feature Wall",
        rowItems: [{ totalItemCosts: 200 }, { totalItemCosts: 50 }],
        metadata: {
          tabName: "Lobby Main",
          tabDisplayName: "Page 001",
          nodePath: ["Page 001", "Amenity Millwork", "Reception Feature Wall"],
          updatedAt: "2026-06-12T08:30:00.000Z",
          rowCount: 2,
          totalCost: 250,
        },
      },
    ]);
  });

  it("fails closed when the estimate outline is not accessible (U16 denial)", async () => {
    // RLS / can_access denials surface as a non-schema-missing read error.
    // allowLegacyFallback only swallows the schema-missing case, so the action
    // must PROPAGATE this — never return a partial/empty outline for an estimate
    // the caller cannot read.
    const accessError = new Error("permission denied for table estimate_nodes");
    repositoryMocks.getEstimateTabs.mockRejectedValue(accessError);

    const { getReusableEstimateOutline } =
      await import("@/lib/reusable-sources/actions");
    await expect(
      getReusableEstimateOutline({
        projectId: projectAId,
        estimateId: estimateAId,
      }),
    ).rejects.toThrow(accessError);
    expect(repositoryMocks.getEstimateTabTree).not.toHaveBeenCalled();
  });

  it("rejects one-character searches before workspace traversal", async () => {
    const { searchReusableProjectSources } =
      await import("@/lib/reusable-sources/actions");
    const result = await searchReusableProjectSources({ query: "a" });

    expect(result.sources).toEqual([]);
    expect(repositoryMocks.listCurrentWorkspaceProjectSearchCandidates).not.toHaveBeenCalled();
    expect(repositoryMocks.listProjectEstimateSheets).not.toHaveBeenCalled();
    expect(repositoryMocks.getEstimateTabs).not.toHaveBeenCalled();
    expect(repositoryMocks.getEstimateTabTree).not.toHaveBeenCalled();
    expect(
      supabaseServerMocks.createSupabaseServerClient,
    ).not.toHaveBeenCalled();
  });

  it("rate-limits repeated project source searches per authenticated user", async () => {
    authMocks.requireCurrentUserContext.mockResolvedValue({ userId: "rate-user" });
    repositoryMocks.listCurrentWorkspaceProjectSearchCandidates.mockResolvedValue({ projects: [] });
    const rateLimit = mockReusableSearchRateLimit();
    const { searchReusableProjectSources } = await import("@/lib/reusable-sources/actions");

    for (let index = 0; index < 20; index += 1) {
      await expect(searchReusableProjectSources({ query: `safe-${index}` })).resolves.toEqual({ sources: [] });
    }
    await expect(searchReusableProjectSources({ query: "safe-overflow" })).rejects.toThrow(
      "Please wait a moment before searching project sources again.",
    );
    expect(supabaseServiceRoleMocks.createSupabaseServiceRoleClient).toHaveBeenCalledWith(
      "archestimator-reusable-source-search-rate-limit",
    );
    expect(rateLimit.calls.some((call) => call.table === "security_rate_limit_events" && call.method === "insert")).toBe(true);
    expect(rateLimit.events).toHaveLength(21);
  });

  it("bounds project and estimate retrieval before prefilter work", async () => {
    repositoryMocks.listCurrentWorkspaceProjectSearchCandidates.mockResolvedValue({
      projects: [
        {
          accessKind: "owner",
          project: { id: projectAId, name: "Large Project" },
        },
        {
          accessKind: "owner",
          project: { id: projectBId, name: "Skipped Project" },
        },
      ],
    });
    repositoryMocks.listProjectEstimateSheets.mockResolvedValueOnce(
      Array.from({ length: 100 }, (_, index) => ({
        id: `estimate-${String(index + 1).padStart(3, "0")}`,
        name: `Estimate ${index + 1}`,
        sheetCode: `EST-${index + 1}`,
        updatedAt: "2026-06-12T08:00:00.000Z",
      })),
    );

    const { searchReusableProjectSources } =
      await import("@/lib/reusable-sources/actions");
    await searchReusableProjectSources({ query: "missing" });

    expect(repositoryMocks.listCurrentWorkspaceProjectSearchCandidates).toHaveBeenCalledWith({
      limit: 50,
    });
    expect(repositoryMocks.listCurrentWorkspaceProjectSearchCandidates).toHaveBeenCalledWith({
      limit: 50,
      search: "missing",
    });
    expect(repositoryMocks.listProjectEstimateSheets).toHaveBeenCalledTimes(1);
    expect(repositoryMocks.listProjectEstimateSheets).toHaveBeenCalledWith(
      projectAId,
      { limit: 100, search: "missing" },
    );
    expect(
      searchPrefilterCalls.filter(
        (call) => call.table === "estimate_nodes" && call.method === "in" && call.args[0] === "estimate_id",
      ),
    ).toHaveLength(1);
    expect(searchPrefilterCalls).not.toContainEqual(
      expect.objectContaining({
        table: "estimate_nodes",
        method: "eq",
        args: expect.arrayContaining(["estimate_id"]),
      }),
    );
  });

  it("includes project name matches from the search-aware project read before applying the cap", async () => {
    const recentProjects = Array.from({ length: 50 }, (_, index) => ({
      accessKind: "owner",
      project: {
        id: `recent-project-${index + 1}`,
        name: `Recent Project ${index + 1}`,
      },
    }));
    repositoryMocks.listCurrentWorkspaceProjectSearchCandidates
      .mockResolvedValueOnce({ projects: recentProjects })
      .mockResolvedValueOnce({
        projects: [
          {
            accessKind: "owner",
            project: { id: projectBId, name: "Smith LLC Medical Office" },
          },
        ],
      });

    const { searchReusableProjectSources } =
      await import("@/lib/reusable-sources/actions");
    const result = await searchReusableProjectSources({ query: "Smith, LLC" });

    expect(repositoryMocks.listCurrentWorkspaceProjectSearchCandidates).toHaveBeenCalledWith({
      limit: 50,
      search: "Smith, LLC",
    });
    expect(result.sources).toContainEqual(
      expect.objectContaining({
        kind: "project",
        projectId: projectBId,
        name: "Smith LLC Medical Office",
      }),
    );
  });

  it("includes estimate matches from the search-aware estimate read before applying the cap", async () => {
    repositoryMocks.listCurrentWorkspaceProjectSearchCandidates.mockResolvedValue({
      projects: [
        {
          accessKind: "owner",
          project: { id: projectAId, name: "Large Project" },
        },
      ],
    });
    repositoryMocks.listProjectEstimateSheets
      .mockResolvedValueOnce([
        {
          id: estimateAId,
          name: "Smith LLC Late Estimate",
          sheetCode: "EST-250",
          updatedAt: "2026-06-12T08:00:00.000Z",
        },
      ])
      .mockResolvedValueOnce(
        Array.from({ length: 99 }, (_, index) => ({
          id: `recent-estimate-${index + 1}`,
          name: `Recent Estimate ${index + 1}`,
          sheetCode: `EST-${index + 1}`,
          updatedAt: "2026-06-12T08:00:00.000Z",
        })),
      );

    const { searchReusableProjectSources } =
      await import("@/lib/reusable-sources/actions");
    const result = await searchReusableProjectSources({ query: "Smith, LLC" });

    expect(repositoryMocks.listProjectEstimateSheets).toHaveBeenCalledWith(
      projectAId,
      { limit: 100, search: "Smith, LLC" },
    );
    expect(result.sources).toContainEqual(
      expect.objectContaining({
        kind: "project-estimate",
        estimateId: estimateAId,
        name: "Smith LLC Late Estimate",
      }),
    );
  });

  it("materializes only tabs identified by the search prefilter", async () => {
    const matchingTabId = "tab-22";
    repositoryMocks.listCurrentWorkspaceProjectSearchCandidates.mockResolvedValue({
      projects: [
        {
          accessKind: "owner",
          project: { id: projectAId, name: "Accessible Project" },
        },
      ],
    });
    repositoryMocks.listProjectEstimateSheets.mockResolvedValueOnce([
      {
        id: estimateAId,
        name: "Lobby Estimate",
        sheetCode: "EST-002",
        updatedAt: "2026-06-12T08:00:00.000Z",
      },
    ]);
    repositoryMocks.getEstimateTabs.mockResolvedValue(
      Array.from({ length: 25 }, (_, index) => ({
        id: `tab-${index + 1}`,
        name: index === 21 ? "Mechanical Scope" : `Tab ${index + 1}`,
        sortOrder: index,
        isDefault: index === 0,
      })),
    );
    repositoryMocks.getEstimateTabTree.mockResolvedValue({
      estimate: { updated_at: "2026-06-12T08:45:00.000Z" },
      tree: [],
    });
    mockSearchPrefilter({
      estimate_nodes: { data: [], error: null },
      estimate_tabs: {
        data: [{ id: matchingTabId, estimate_id: estimateAId }],
        error: null,
      },
    });

    const { searchReusableProjectSources } =
      await import("@/lib/reusable-sources/actions");
    const result = await searchReusableProjectSources({ query: "mechanical" });

    expect(repositoryMocks.getEstimateTabTree).toHaveBeenCalledTimes(1);
    expect(repositoryMocks.getEstimateTabTree).toHaveBeenCalledWith(
      projectAId,
      estimateAId,
      matchingTabId,
      {
        allowLegacyFallback: true,
        maxNodeCount: 200,
        maxRowItemCount: 200,
      },
    );
    expect(result.sources.map((source) => source.kind)).toContain(
      "project-tab",
    );
  });

  it("returns a node matched by the prefilter when the bounded tree omits it", async () => {
    repositoryMocks.listCurrentWorkspaceProjectSearchCandidates.mockResolvedValue({
      projects: [
        {
          accessKind: "owner",
          project: { id: projectAId, name: "Accessible Project" },
        },
      ],
    });
    repositoryMocks.listProjectEstimateSheets.mockResolvedValueOnce([
      {
        id: estimateAId,
        name: "Lobby Estimate",
        sheetCode: "EST-002",
        updatedAt: "2026-06-12T08:00:00.000Z",
      },
    ]);
    repositoryMocks.getEstimateTabs.mockResolvedValue([
      { id: tabAId, name: "Lobby Main", sortOrder: 0, isDefault: true },
    ]);
    repositoryMocks.getEstimateTabTree.mockResolvedValue({
      estimate: { updated_at: "2026-06-12T08:45:00.000Z" },
      tree: [],
    });
    mockSearchPrefilter({
      estimate_nodes: {
        data: [
          {
            id: "late-node",
            estimate_id: estimateAId,
            estimate_tab_id: tabAId,
            parent_id: "parent-node",
            kind: "area",
            name: "Late Match",
          },
        ],
        error: null,
      },
      estimate_tabs: { data: [], error: null },
    });

    const { searchReusableProjectSources } =
      await import("@/lib/reusable-sources/actions");
    const result = await searchReusableProjectSources({ query: "late" });

    expect(result.sources).toContainEqual({
      kind: "project-node",
      projectId: projectAId,
      estimateId: estimateAId,
      tabId: tabAId,
      nodeId: "late-node",
      parentNodeId: "parent-node",
      nodeKind: "area",
      name: "Late Match",
      rowItems: [],
      metadata: {
        projectName: "Accessible Project",
        estimateName: "Lobby Estimate",
        sheetCode: "EST-002",
        tabName: "Lobby Main",
        tabDisplayName: "Page 001",
        nodePath: ["Page 001", "Late Match"],
        updatedAt: "2026-06-12T08:45:00.000Z",
        rowCount: 0,
        totalCost: 0,
      },
    });
  });

  it("retries legacy node prefilter without estimate_tab_id when the column is missing", async () => {
    repositoryMocks.listCurrentWorkspaceProjectSearchCandidates.mockResolvedValue({
      projects: [
        {
          accessKind: "owner",
          project: { id: projectAId, name: "Accessible Project" },
        },
      ],
    });
    repositoryMocks.listProjectEstimateSheets.mockResolvedValueOnce([
      {
        id: estimateAId,
        name: "Legacy Estimate",
        sheetCode: "EST-LEG",
        updatedAt: "2026-06-12T08:00:00.000Z",
      },
    ]);
    repositoryMocks.getEstimateTabs.mockResolvedValue([
      { id: tabAId, name: "Main", sortOrder: 0, isDefault: true },
    ]);
    repositoryMocks.getEstimateTabTree.mockResolvedValue({
      estimate: { updated_at: "2026-06-12T08:45:00.000Z" },
      tree: [],
    });
    mockSearchPrefilter({
      estimate_nodes: (calls) => {
        const selectCall = calls.find((call) => call.method === "select");
        return String(selectCall?.args[0] ?? "").includes("estimate_tab_id")
          ? {
              data: null,
              error: {
                code: "42703",
                message: 'column estimate_nodes.estimate_tab_id does not exist',
              },
            }
          : {
              data: [
                {
                  id: "legacy-node",
                  estimate_id: estimateAId,
                  parent_id: null,
                  kind: "group",
                  name: "Legacy Site Works",
                },
              ],
              error: null,
            };
      },
      estimate_tabs: { data: [], error: null },
    });

    const { searchReusableProjectSources } =
      await import("@/lib/reusable-sources/actions");
    const result = await searchReusableProjectSources({ query: "legacy site" });

    const nodeSelects = searchPrefilterCalls.filter(
      (call) => call.table === "estimate_nodes" && call.method === "select",
    );
    expect(nodeSelects.map((call) => call.args[0])).toEqual([
      "id, estimate_id, estimate_tab_id, parent_id, kind, name, estimate_tabs!inner(id)",
      "id, estimate_id, parent_id, kind, name",
    ]);
    expect(repositoryMocks.getEstimateTabTree).toHaveBeenCalledWith(
      projectAId,
      estimateAId,
      tabAId,
      {
        allowLegacyFallback: true,
        maxNodeCount: 200,
        maxRowItemCount: 200,
      },
    );
    expect(result.sources).toContainEqual(
      expect.objectContaining({
        kind: "project-node",
        nodeId: "legacy-node",
        name: "Legacy Site Works",
      }),
    );
  });

  it("retries legacy node prefilter without the active-tab join when estimate_tabs is missing", async () => {
    repositoryMocks.listCurrentWorkspaceProjectSearchCandidates.mockResolvedValue({
      projects: [
        {
          accessKind: "owner",
          project: { id: projectAId, name: "Accessible Project" },
        },
      ],
    });
    repositoryMocks.listProjectEstimateSheets.mockResolvedValueOnce([
      {
        id: estimateAId,
        name: "Legacy Estimate",
        sheetCode: "EST-LEG",
        updatedAt: "2026-06-12T08:00:00.000Z",
      },
    ]);
    repositoryMocks.getEstimateTabs.mockResolvedValue([
      { id: tabAId, name: "Main", sortOrder: 0, isDefault: true },
    ]);
    repositoryMocks.getEstimateTabTree.mockResolvedValue({
      estimate: { updated_at: "2026-06-12T08:45:00.000Z" },
      tree: [
        {
          id: "legacy-node",
          name: "Legacy Site Works",
          kind: "group",
          total: "PHP 0.00",
          children: [],
          estimateRowItems: [],
        },
      ],
    });
    mockSearchPrefilter({
      estimate_nodes: [
        {
          data: null,
          error: {
            code: "PGRST200",
            message: "Could not find a relationship between 'estimate_nodes' and 'estimate_tabs' in the schema cache",
          },
        },
        {
          data: [
            {
              id: "legacy-node",
              estimate_id: estimateAId,
              estimate_tab_id: tabAId,
              parent_id: null,
              kind: "group",
              name: "Legacy Site Works",
            },
          ],
          error: null,
        },
      ],
      estimate_tabs: { data: [], error: null },
    });

    const { searchReusableProjectSources } =
      await import("@/lib/reusable-sources/actions");
    const result = await searchReusableProjectSources({ query: "legacy site" });

    const nodeSelects = searchPrefilterCalls.filter(
      (call) => call.table === "estimate_nodes" && call.method === "select",
    );
    expect(nodeSelects.map((call) => call.args[0])).toEqual([
      "id, estimate_id, estimate_tab_id, parent_id, kind, name, estimate_tabs!inner(id)",
      "id, estimate_id, estimate_tab_id, parent_id, kind, name",
    ]);
    expect(repositoryMocks.getEstimateTabTree).toHaveBeenCalledWith(
      projectAId,
      estimateAId,
      tabAId,
      {
        allowLegacyFallback: true,
        maxNodeCount: 200,
        maxRowItemCount: 200,
      },
    );
    expect(result.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "project-node",
          nodeId: "legacy-node",
          name: "Legacy Site Works",
        }),
      ]),
    );
  });

  it("uses raw and normalized query patterns for database prefiltering", async () => {
    repositoryMocks.listCurrentWorkspaceProjectSearchCandidates.mockResolvedValue({
      projects: [
        {
          accessKind: "owner",
          project: { id: projectAId, name: "Accessible Project" },
        },
      ],
    });
    repositoryMocks.listProjectEstimateSheets.mockResolvedValueOnce([
      {
        id: estimateAId,
        name: "Vendor Estimate",
        sheetCode: "EST-V",
        updatedAt: "2026-06-12T08:00:00.000Z",
      },
    ]);
    repositoryMocks.getEstimateTabs.mockResolvedValue([
      { id: tabAId, name: "Main", sortOrder: 0, isDefault: true },
    ]);
    repositoryMocks.getEstimateTabTree.mockResolvedValue({
      estimate: { updated_at: "2026-06-12T08:45:00.000Z" },
      tree: [
        {
          id: "smith-node",
          name: "Smith LLC",
          kind: "area",
          total: "₱0.00",
          children: [],
          estimateRowItems: [],
        },
      ],
    });
    mockSearchPrefilter({
      estimate_nodes: {
        data: [
          {
            id: "smith-node",
            estimate_id: estimateAId,
            estimate_tab_id: tabAId,
            parent_id: null,
            kind: "area",
            name: "Smith LLC",
          },
        ],
        error: null,
      },
      estimate_tabs: { data: [], error: null },
    });

    const { searchReusableProjectSources } =
      await import("@/lib/reusable-sources/actions");
    const result = await searchReusableProjectSources({ query: "Smith, LLC" });

    expect(searchPrefilterCalls).toContainEqual({
      table: "estimate_nodes",
      method: "ilike",
      args: ["name", "%Smith, LLC%"],
    });
    expect(searchPrefilterCalls).toContainEqual({
      table: "estimate_nodes",
      method: "ilike",
      args: ["name", "%smith llc%"],
    });
    expect(result.sources).toContainEqual(
      expect.objectContaining({
        kind: "project-node",
        nodeId: "smith-node",
        name: "Smith LLC",
      }),
    );
  });

  it("does not let an archived prefilter tab pin hide active matching nodes", async () => {
    const archivedTabId = "archived-tab";
    repositoryMocks.listCurrentWorkspaceProjectSearchCandidates.mockResolvedValue({
      projects: [
        {
          accessKind: "owner",
          project: { id: projectAId, name: "Accessible Project" },
        },
      ],
    });
    repositoryMocks.listProjectEstimateSheets.mockResolvedValueOnce([
      {
        id: estimateAId,
        name: "Lobby Estimate",
        sheetCode: "EST-002",
        updatedAt: "2026-06-12T08:00:00.000Z",
      },
    ]);
    repositoryMocks.getEstimateTabs.mockResolvedValue([
      { id: tabAId, name: "Active Main", sortOrder: 0, isDefault: true },
    ]);
    repositoryMocks.getEstimateTabTree.mockResolvedValue({
      estimate: { updated_at: "2026-06-12T08:45:00.000Z" },
      tree: [
        {
          id: "active-node",
          name: "Target Active Scope",
          kind: "group",
          total: "₱0.00",
          children: [],
          estimateRowItems: [],
        },
      ],
    });
    mockSearchPrefilter({
      estimate_nodes: {
        data: [
          {
            id: "archived-node",
            estimate_id: estimateAId,
            estimate_tab_id: archivedTabId,
            parent_id: null,
            kind: "group",
            name: "Target Archived Scope",
          },
        ],
        error: null,
      },
      estimate_tabs: { data: [], error: null },
    });

    const { searchReusableProjectSources } =
      await import("@/lib/reusable-sources/actions");
    const result = await searchReusableProjectSources({ query: "target" });

    expect(repositoryMocks.getEstimateTabTree).toHaveBeenCalledWith(
      projectAId,
      estimateAId,
      tabAId,
      {
        allowLegacyFallback: true,
        maxNodeCount: 200,
        maxRowItemCount: 200,
      },
    );
    expect(result.sources).toContainEqual(
      expect.objectContaining({
        kind: "project-node",
        nodeId: "active-node",
        name: "Target Active Scope",
      }),
    );
  });

  it("reserves the final result slot for a matched node instead of ancestors", async () => {
    const saturatedEstimateCount = 48;
    const matchingEstimateId = "node-estimate";
    repositoryMocks.listCurrentWorkspaceProjectSearchCandidates.mockResolvedValue({
      projects: [
        {
          accessKind: "owner",
          project: { id: projectAId, name: "Project A" },
        },
        {
          accessKind: "owner",
          project: { id: projectBId, name: "Project B" },
        },
      ],
    });
    repositoryMocks.listProjectEstimateSheets
      .mockResolvedValueOnce(
        Array.from({ length: saturatedEstimateCount }, (_, index) => ({
          id: `saturated-estimate-${index + 1}`,
          name: `Target Estimate ${index + 1}`,
          sheetCode: `T-${index + 1}`,
          updatedAt: "2026-06-12T08:00:00.000Z",
        })),
      )
      .mockResolvedValueOnce([
        {
          id: matchingEstimateId,
          name: "Other Estimate",
          sheetCode: "O-1",
          updatedAt: "2026-06-12T08:00:00.000Z",
        },
      ]);
    repositoryMocks.getEstimateTabs.mockResolvedValue([
      { id: tabAId, name: "Lobby Main", sortOrder: 0, isDefault: true },
    ]);
    repositoryMocks.getEstimateTabTree.mockResolvedValue({
      estimate: { updated_at: "2026-06-12T08:45:00.000Z" },
      tree: [],
    });
    mockSearchPrefilter({
      estimate_nodes: {
        data: [
          {
            id: "reserved-node",
            estimate_id: matchingEstimateId,
            estimate_tab_id: tabAId,
            parent_id: null,
            kind: "group",
            name: "Target Node",
          },
        ],
        error: null,
      },
      estimate_tabs: { data: [], error: null },
    });

    const { searchReusableProjectSources } =
      await import("@/lib/reusable-sources/actions");
    const result = await searchReusableProjectSources({ query: "target" });

    expect(result.sources).toHaveLength(50);
    expect(result.sources).toContainEqual(
      expect.objectContaining({
        kind: "project-node",
        estimateId: matchingEstimateId,
        nodeId: "reserved-node",
      }),
    );
  });

  it("searches readable project source outlines from lightweight project candidates", async () => {
    repositoryMocks.listCurrentWorkspaceProjectSearchCandidates.mockResolvedValue({
      projects: [
        {
          accessKind: "owner",
          project: { id: projectAId, name: "Accessible Project" },
        },
      ],
    });
    repositoryMocks.listProjectEstimateSheets.mockResolvedValueOnce([
      {
        id: estimateAId,
        name: "Lobby Estimate",
        sheetCode: "EST-002",
        updatedAt: "2026-06-12T08:00:00.000Z",
      },
    ]);
    repositoryMocks.getEstimateTabs.mockResolvedValue([
      { id: tabAId, name: "Lobby Main", sortOrder: 0, isDefault: true },
    ]);
    repositoryMocks.getEstimateTabTree.mockResolvedValue({
      estimate: { updated_at: "2026-06-12T08:45:00.000Z" },
      tree: [
        {
          id: "group-1",
          name: "Amenity Millwork",
          kind: "group",
          total: "₱0.00",
          children: [],
          estimateRowItems: [{ totalItemCosts: 125000 }],
        },
      ],
    });

    // U5: the node pre-filter resolves the matching estimate, so only it is materialized.
    mockSearchPrefilter({
      estimate_nodes: {
        data: [
          {
            id: "group-1",
            estimate_id: estimateAId,
            estimate_tab_id: tabAId,
            parent_id: null,
            kind: "group",
            name: "Amenity Millwork",
          },
        ],
        error: null,
      },
    });

    const { searchReusableProjectSources } =
      await import("@/lib/reusable-sources/actions");
    const result = await searchReusableProjectSources({ query: "amenity" });

    expect(repositoryMocks.listProjectEstimateSheets).toHaveBeenCalledTimes(2);
    expect(repositoryMocks.listProjectEstimateSheets).toHaveBeenCalledWith(
      projectAId,
      { limit: 100, search: "amenity" },
    );
    expect(repositoryMocks.listProjectEstimateSheets).toHaveBeenCalledWith(
      projectAId,
      { limit: 99 },
    );
    expect(repositoryMocks.getEstimateTabs).toHaveBeenCalledWith(
      projectAId,
      estimateAId,
      { allowLegacyFallback: true },
    );
    expect(repositoryMocks.getEstimateTabTree).toHaveBeenCalledWith(
      projectAId,
      estimateAId,
      tabAId,
      {
        allowLegacyFallback: true,
        maxNodeCount: 200,
        maxRowItemCount: 200,
      },
    );
    expect(result.sources).toEqual([
      {
        kind: "project",
        projectId: projectAId,
        name: "Accessible Project",
        metadata: {
          projectName: "Accessible Project",
        },
      },
      {
        kind: "project-estimate",
        projectId: projectAId,
        estimateId: estimateAId,
        name: "Lobby Estimate",
        sheetCode: "EST-002",
        metadata: {
          projectName: "Accessible Project",
          estimateName: "Lobby Estimate",
          sheetCode: "EST-002",
          updatedAt: "2026-06-12T08:00:00.000Z",
        },
      },
      {
        kind: "project-tab",
        projectId: projectAId,
        estimateId: estimateAId,
        tabId: tabAId,
        name: "Lobby Main",
        displayName: "Page 001",
        sortOrder: 0,
        metadata: {
          projectName: "Accessible Project",
          estimateName: "Lobby Estimate",
          sheetCode: "EST-002",
          tabName: "Lobby Main",
          tabDisplayName: "Page 001",
          updatedAt: "2026-06-12T08:45:00.000Z",
          rowCount: 1,
          totalCost: 125000,
        },
      },
      {
        kind: "project-node",
        projectId: projectAId,
        estimateId: estimateAId,
        tabId: tabAId,
        nodeId: "group-1",
        parentNodeId: null,
        nodeKind: "group",
        name: "Amenity Millwork",
        rowItems: [{ totalItemCosts: 125000 }],
        metadata: {
          projectName: "Accessible Project",
          estimateName: "Lobby Estimate",
          sheetCode: "EST-002",
          tabName: "Lobby Main",
          tabDisplayName: "Page 001",
          nodePath: ["Page 001", "Amenity Millwork"],
          updatedAt: "2026-06-12T08:45:00.000Z",
          rowCount: 1,
          totalCost: 125000,
        },
      },
    ]);
  });

  it("searches derived display tab labels before an outline is loaded", async () => {
    repositoryMocks.listCurrentWorkspaceProjectSearchCandidates.mockResolvedValue({
      projects: [
        {
          accessKind: "owner",
          project: { id: projectAId, name: "Accessible Project" },
        },
      ],
    });
    repositoryMocks.listProjectEstimateSheets.mockResolvedValueOnce([
      {
        id: estimateAId,
        name: "Lobby Estimate",
        sheetCode: "EST-002",
        updatedAt: "2026-06-12T08:00:00.000Z",
      },
    ]);
    repositoryMocks.getEstimateTabs.mockResolvedValue([
      { id: tabAId, name: "Lobby Main", sortOrder: 0, isDefault: true },
    ]);
    repositoryMocks.getEstimateTabTree.mockResolvedValue({
      estimate: { updated_at: "2026-06-12T08:45:00.000Z" },
      tree: [],
    });
    mockSearchPrefilter({
      estimate_nodes: { data: [], error: null },
      estimate_tabs: { data: [], error: null },
    });

    const { searchReusableProjectSources } =
      await import("@/lib/reusable-sources/actions");
    const result = await searchReusableProjectSources({ query: "Page 001" });

    expect(repositoryMocks.getEstimateTabs).toHaveBeenCalledTimes(1);
    expect(repositoryMocks.getEstimateTabs).toHaveBeenCalledWith(
      projectAId,
      estimateAId,
      { allowLegacyFallback: true },
    );
    expect(repositoryMocks.getEstimateTabTree).toHaveBeenCalledTimes(1);
    expect(repositoryMocks.getEstimateTabTree).toHaveBeenCalledWith(
      projectAId,
      estimateAId,
      tabAId,
      {
        allowLegacyFallback: true,
        maxNodeCount: 200,
        maxRowItemCount: 200,
      },
    );
    expect(result.sources).toEqual([
      {
        kind: "project",
        projectId: projectAId,
        name: "Accessible Project",
        metadata: {
          projectName: "Accessible Project",
        },
      },
      {
        kind: "project-estimate",
        projectId: projectAId,
        estimateId: estimateAId,
        name: "Lobby Estimate",
        sheetCode: "EST-002",
        metadata: {
          projectName: "Accessible Project",
          estimateName: "Lobby Estimate",
          sheetCode: "EST-002",
          updatedAt: "2026-06-12T08:00:00.000Z",
        },
      },
      {
        kind: "project-tab",
        projectId: projectAId,
        estimateId: estimateAId,
        tabId: tabAId,
        name: "Lobby Main",
        displayName: "Page 001",
        sortOrder: 0,
        metadata: {
          projectName: "Accessible Project",
          estimateName: "Lobby Estimate",
          sheetCode: "EST-002",
          tabName: "Lobby Main",
          tabDisplayName: "Page 001",
          updatedAt: "2026-06-12T08:45:00.000Z",
          rowCount: 0,
          totalCost: 0,
        },
      },
    ]);
  });

  it("assembles a single synthetic 'Main' tab outline under the missing-schema fallback (U1)", async () => {
    // Simulates the read-only legacy fallback: estimate_tabs is unapplied, so
    // getEstimateTabs returns the synthetic Main tab and getEstimateTabTree
    // returns the whole-estimate legacy tree as that tab. The outline must
    // still assemble — no throw, no 500 (DEF-1).
    repositoryMocks.getEstimateTabs.mockResolvedValue([
      { id: "legacy-main", name: "Main", sortOrder: 0, isDefault: true },
    ]);
    repositoryMocks.getEstimateTabTree.mockResolvedValue({
      estimate: { updated_at: "2026-06-12T09:00:00.000Z" },
      tab: { id: "legacy-main", name: "Main", sortOrder: 0, isDefault: true },
      tree: [
        {
          id: "group-1",
          name: "Site Works",
          kind: "group",
          total: "₱0.00",
          children: [],
          estimateRowItems: [{ totalItemCosts: 5000 }],
        },
      ],
    });

    const { getReusableEstimateOutline } =
      await import("@/lib/reusable-sources/actions");
    const result = await getReusableEstimateOutline({
      projectId: projectAId,
      estimateId: estimateAId,
    });

    expect(repositoryMocks.getEstimateTabs).toHaveBeenCalledWith(
      projectAId,
      estimateAId,
      { allowLegacyFallback: true },
    );
    expect(repositoryMocks.getEstimateTabTree).toHaveBeenCalledWith(
      projectAId,
      estimateAId,
      "legacy-main",
      { allowLegacyFallback: true },
    );
    expect(result.sources).toEqual([
      {
        kind: "project-tab",
        projectId: projectAId,
        estimateId: estimateAId,
        tabId: "legacy-main",
        name: "Main",
        displayName: "Page 001",
        sortOrder: 0,
        metadata: {
          tabName: "Main",
          tabDisplayName: "Page 001",
          updatedAt: "2026-06-12T09:00:00.000Z",
          rowCount: 1,
          totalCost: 5000,
        },
      },
      {
        kind: "project-node",
        projectId: projectAId,
        estimateId: estimateAId,
        tabId: "legacy-main",
        nodeId: "group-1",
        parentNodeId: null,
        nodeKind: "group",
        name: "Site Works",
        rowItems: [{ totalItemCosts: 5000 }],
        metadata: {
          tabName: "Main",
          tabDisplayName: "Page 001",
          nodePath: ["Page 001", "Site Works"],
          updatedAt: "2026-06-12T09:00:00.000Z",
          rowCount: 1,
          totalCost: 5000,
        },
      },
    ]);
  });
});
