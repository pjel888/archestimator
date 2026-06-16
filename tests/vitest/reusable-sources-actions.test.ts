import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  requireCurrentUserContext: vi.fn(),
}));

const repositoryMocks = vi.hoisted(() => ({
  getEstimateTabs: vi.fn(),
  getEstimateTabTree: vi.fn(),
  getProjectEstimateTreeByEstimate: vi.fn(),
  listCurrentWorkspaceProjects: vi.fn(),
  listProjectEstimateSheets: vi.fn(),
}));

const supabaseServerMocks = vi.hoisted(() => ({ createSupabaseServerClient: vi.fn() }));
const supabaseServiceRoleMocks = vi.hoisted(() => ({ createSupabaseServiceRoleClient: vi.fn() }));

vi.mock("@/lib/auth/session", () => ({
  requireCurrentUserContext: authMocks.requireCurrentUserContext,
}));

vi.mock("@/lib/supabase/server", () => supabaseServerMocks);

vi.mock("@/lib/supabase/service-role", () => supabaseServiceRoleMocks);

vi.mock("@/lib/repositories/workspace-repository", () => ({
  getEstimateTabs: repositoryMocks.getEstimateTabs,
  getEstimateTabTree: repositoryMocks.getEstimateTabTree,
  getProjectEstimateTreeByEstimate: repositoryMocks.getProjectEstimateTreeByEstimate,
  listCurrentWorkspaceProjects: repositoryMocks.listCurrentWorkspaceProjects,
  listProjectEstimateSheets: repositoryMocks.listProjectEstimateSheets,
}));

type MockSearchPrefilterResult = { data: unknown; error: unknown };

// U5: the server-side search pre-filters matching estimates via bounded ILIKE
// queries (estimate_nodes + estimate_tabs) before materializing trees. This
// chainable stub resolves each `.from(table)...` chain to the configured result
// and supports paged `.range()` reads for distinct-estimate grouping.
function mockSearchPrefilter(resultByTable: Record<string, MockSearchPrefilterResult | MockSearchPrefilterResult[]>) {
  const calls: Array<{ table: string; method: string; args: unknown[] }> = [];
  const callCountByTable = new Map<string, number>();
  const makeBuilder = (table: string) => {
    const tableResult = resultByTable[table] ?? { data: [], error: null };
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "in", "ilike", "is", "eq", "order", "limit", "range"]) {
      builder[method] = (...args: unknown[]) => {
        calls.push({ table, method, args });
        return builder;
      };
    }
    builder.then = (resolve: (value: unknown) => unknown) => {
      const callCount = callCountByTable.get(table) ?? 0;
      callCountByTable.set(table, callCount + 1);
      const result = Array.isArray(tableResult)
        ? tableResult[Math.min(callCount, tableResult.length - 1)] ?? { data: [], error: null }
        : tableResult;
      return resolve(result);
    };
    builder.maybeSingle = async () => (Array.isArray(tableResult) ? tableResult[0] : tableResult);
    return builder;
  };
  supabaseServerMocks.createSupabaseServerClient.mockResolvedValue({ from: (table: string) => makeBuilder(table) });
  return { calls };
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
  repositoryMocks.listCurrentWorkspaceProjects.mockReset();
  repositoryMocks.listProjectEstimateSheets.mockReset();
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
        { accessKind: "owner", project: { id: projectAId, name: "Accessible Project" } },
        { accessKind: "pending-invite", project: { id: projectBId, name: "Pending Invite Project" } },
      ],
    });

    const { listReusableProjectSources } = await import("@/lib/reusable-sources/actions");
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
        { accessKind: "owner", project: { id: projectAId, name: "Accessible Project" } },
        { accessKind: "pending-invite", project: { id: projectBId, name: "Pending Invite Project" } },
      ],
    });
    repositoryMocks.listProjectEstimateSheets.mockResolvedValueOnce([
      { id: estimateAId, name: "Lobby Estimate", sheetCode: "EST-002", updatedAt: "2026-06-12T08:00:00.000Z" },
    ]);

    const { listReusableProjectEstimateSources } = await import("@/lib/reusable-sources/actions");
    const result = await listReusableProjectEstimateSources({ projectId: projectAId });

    expect(repositoryMocks.listProjectEstimateSheets).toHaveBeenCalledTimes(1);
    expect(repositoryMocks.listProjectEstimateSheets).toHaveBeenCalledWith(projectAId);
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
    repositoryMocks.listCurrentWorkspaceProjects.mockResolvedValue({ projects });

    const { getReusableEstimateOutline, listReusableProjectEstimateSources, listReusableProjectSources } = await import("@/lib/reusable-sources/actions");
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
    const estimateResult = await listReusableProjectEstimateSources({ projectId: "project-10" });

    expect(repositoryMocks.listProjectEstimateSheets).toHaveBeenCalledTimes(1);
    expect(repositoryMocks.listProjectEstimateSheets).toHaveBeenCalledWith("project-10");
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

    await getReusableEstimateOutline({ projectId: "project-10", estimateId: "estimate-1" });

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
              estimateRowItems: [{ totalItemCosts: 200 }, { totalItemCosts: 50 }],
            },
          ],
        },
      ],
    });

    const { getReusableEstimateOutline } = await import("@/lib/reusable-sources/actions");
    const result = await getReusableEstimateOutline({ projectId: projectAId, estimateId: estimateAId });

    expect(repositoryMocks.getEstimateTabs).toHaveBeenCalledWith(projectAId, estimateAId, { allowLegacyFallback: true });
    expect(repositoryMocks.getEstimateTabTree).toHaveBeenCalledWith(projectAId, estimateAId, tabAId, { allowLegacyFallback: true });
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

    const { getReusableEstimateOutline } = await import("@/lib/reusable-sources/actions");
    await expect(
      getReusableEstimateOutline({ projectId: projectAId, estimateId: estimateAId }),
    ).rejects.toThrow(accessError);
    expect(repositoryMocks.getEstimateTabTree).not.toHaveBeenCalled();
  });

  it("rejects too-short project source searches before workspace enumeration", async () => {
    const { searchReusableProjectSources } = await import("@/lib/reusable-sources/actions");
    const result = await searchReusableProjectSources({ query: "a" });

    expect(result).toEqual({ sources: [] });
    expect(repositoryMocks.listCurrentWorkspaceProjects).not.toHaveBeenCalled();
    expect(repositoryMocks.listProjectEstimateSheets).not.toHaveBeenCalled();
    expect(repositoryMocks.getEstimateTabs).not.toHaveBeenCalled();
    expect(repositoryMocks.getEstimateTabTree).not.toHaveBeenCalled();
  });

  it("rate-limits repeated project source searches per authenticated user", async () => {
    authMocks.requireCurrentUserContext.mockResolvedValue({ userId: "rate-user" });
    repositoryMocks.listCurrentWorkspaceProjects.mockResolvedValue({ projects: [] });
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

  it("searches project names before applying the returned project cap", async () => {
    const projects = Array.from({ length: 51 }, (_, index) => ({
      accessKind: "owner",
      project: {
        id: `project-${String(index + 1).padStart(2, "0")}`,
        name: index === 50 ? "Needle Project" : `Project ${index + 1}`,
      },
    }));
    repositoryMocks.listCurrentWorkspaceProjects.mockResolvedValue({ projects });
    repositoryMocks.listProjectEstimateSheets.mockResolvedValue([]);

    const { searchReusableProjectSources } = await import("@/lib/reusable-sources/actions");
    const result = await searchReusableProjectSources({ query: "needle" });

    expect(repositoryMocks.listProjectEstimateSheets).toHaveBeenCalledTimes(51);
    expect(repositoryMocks.getEstimateTabs).not.toHaveBeenCalled();
    expect(repositoryMocks.getEstimateTabTree).not.toHaveBeenCalled();
    expect(result.sources).toEqual([
      {
        kind: "project",
        projectId: "project-51",
        name: "Needle Project",
        metadata: {
          projectName: "Needle Project",
        },
      },
    ]);
  });

  it("searches estimate names before applying the per-project materialization cap", async () => {
    repositoryMocks.listCurrentWorkspaceProjects.mockResolvedValue({
      projects: [
        { accessKind: "owner", project: { id: projectAId, name: "Accessible Project" } },
      ],
    });
    repositoryMocks.listProjectEstimateSheets.mockResolvedValueOnce(
      Array.from({ length: 26 }, (_, index) => ({
        id: `estimate-${String(index + 1).padStart(2, "0")}`,
        name: index === 25 ? "Needle Estimate" : `Estimate ${index + 1}`,
        sheetCode: `EST-${index + 1}`,
        updatedAt: "2026-06-12T08:00:00.000Z",
      })),
    );

    const { searchReusableProjectSources } = await import("@/lib/reusable-sources/actions");
    const result = await searchReusableProjectSources({ query: "needle" });

    expect(repositoryMocks.getEstimateTabs).not.toHaveBeenCalled();
    expect(repositoryMocks.getEstimateTabTree).not.toHaveBeenCalled();
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
        estimateId: "estimate-26",
        name: "Needle Estimate",
        sheetCode: "EST-26",
        metadata: {
          projectName: "Accessible Project",
          estimateName: "Needle Estimate",
          sheetCode: "EST-26",
          updatedAt: "2026-06-12T08:00:00.000Z",
        },
      },
    ]);
  });

  it("groups DB prefilter rows by distinct estimate before materializing", async () => {
    const crowdedEstimateId = "55555555-5555-4555-8555-555555555555";
    const targetEstimateId = "66666666-6666-4666-8666-666666666666";
    const targetTabId = "77777777-7777-4777-8777-777777777777";
    repositoryMocks.listCurrentWorkspaceProjects.mockResolvedValue({
      projects: [
        { accessKind: "owner", project: { id: projectAId, name: "Accessible Project" } },
      ],
    });
    repositoryMocks.listProjectEstimateSheets.mockResolvedValueOnce([
      { id: crowdedEstimateId, name: "Crowded Estimate", sheetCode: "EST-001", updatedAt: "2026-06-12T08:00:00.000Z" },
      { id: targetEstimateId, name: "Target Estimate", sheetCode: "EST-002", updatedAt: "2026-06-12T08:00:00.000Z" },
    ]);
    repositoryMocks.getEstimateTabs.mockResolvedValue([
      { id: targetTabId, name: "Main", sortOrder: 0, isDefault: true },
    ]);
    repositoryMocks.getEstimateTabTree.mockImplementation(async (_projectId: string, estimateId: string) => ({
      estimate: { updated_at: "2026-06-12T08:45:00.000Z" },
      tree: [
        {
          id: estimateId === targetEstimateId ? "target-node" : "crowded-node",
          name: estimateId === targetEstimateId ? "Needle Target Area" : "Needle Crowded Area",
          kind: "area",
          total: "₱0.00",
          children: [],
          estimateRowItems: [],
        },
      ],
    }));
    mockSearchPrefilter({
      estimate_nodes: [
        {
          data: Array.from({ length: 50 }, () => ({ estimate_id: crowdedEstimateId })),
          error: null,
        },
        {
          data: [{ estimate_id: targetEstimateId }],
          error: null,
        },
      ],
      estimate_tabs: { data: [], error: null },
    });

    const { searchReusableProjectSources } = await import("@/lib/reusable-sources/actions");
    const result = await searchReusableProjectSources({ query: "needle" });

    expect(repositoryMocks.getEstimateTabTree).toHaveBeenCalledWith(projectAId, crowdedEstimateId, targetTabId, { allowLegacyFallback: true });
    expect(repositoryMocks.getEstimateTabTree).toHaveBeenCalledWith(projectAId, targetEstimateId, targetTabId, { allowLegacyFallback: true });
    expect(result.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "project-node",
          estimateId: targetEstimateId,
          nodeId: "target-node",
          name: "Needle Target Area",
        }),
      ]),
    );
  });

  it("searches readable project source outlines without returning pending invites", async () => {
    repositoryMocks.listCurrentWorkspaceProjects.mockResolvedValue({
      projects: [
        { accessKind: "owner", project: { id: projectAId, name: "Accessible Project" } },
        { accessKind: "pending-invite", project: { id: projectBId, name: "Pending Invite Project" } },
      ],
    });
    repositoryMocks.listProjectEstimateSheets.mockResolvedValueOnce([
      { id: estimateAId, name: "Lobby Estimate", sheetCode: "EST-002", updatedAt: "2026-06-12T08:00:00.000Z" },
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
    const prefilter = mockSearchPrefilter({ estimate_nodes: { data: [{ estimate_id: estimateAId }], error: null } });

    const { searchReusableProjectSources } = await import("@/lib/reusable-sources/actions");
    const result = await searchReusableProjectSources({ query: "amenity" });

    expect(repositoryMocks.listProjectEstimateSheets).toHaveBeenCalledTimes(1);
    expect(repositoryMocks.listProjectEstimateSheets).toHaveBeenCalledWith(projectAId);
    expect(repositoryMocks.getEstimateTabs).toHaveBeenCalledWith(projectAId, estimateAId, { allowLegacyFallback: true });
    expect(repositoryMocks.getEstimateTabTree).toHaveBeenCalledWith(projectAId, estimateAId, tabAId, { allowLegacyFallback: true });
    expect(prefilter.calls).toEqual(
      expect.arrayContaining([
        { table: "estimate_nodes", method: "select", args: ["estimate_id, estimate_tabs!inner(id)"] },
        { table: "estimate_nodes", method: "is", args: ["estimate_tabs.archived_at", null] },
      ]),
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

  it("retries legacy node prefilter without the active-tab join when estimate_tabs is missing", async () => {
    repositoryMocks.listCurrentWorkspaceProjects.mockResolvedValue({
      projects: [
        { accessKind: "owner", project: { id: projectAId, name: "Accessible Project" } },
      ],
    });
    repositoryMocks.listProjectEstimateSheets.mockResolvedValueOnce([
      { id: estimateAId, name: "Legacy Estimate", sheetCode: "EST-LEG", updatedAt: "2026-06-12T08:00:00.000Z" },
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
          total: "₱0.00",
          children: [],
          estimateRowItems: [],
        },
      ],
    });
    const prefilter = mockSearchPrefilter({
      estimate_nodes: [
        {
          data: null,
          error: {
            code: "PGRST200",
            message: "Could not find a relationship between 'estimate_nodes' and 'estimate_tabs' in the schema cache",
          },
        },
        { data: [{ estimate_id: estimateAId }], error: null },
      ],
      estimate_tabs: { data: [], error: null },
    });

    const { searchReusableProjectSources } = await import("@/lib/reusable-sources/actions");
    const result = await searchReusableProjectSources({ query: "legacy site" });

    const nodeSelects = prefilter.calls.filter((call) => call.table === "estimate_nodes" && call.method === "select");
    expect(nodeSelects.map((call) => call.args[0])).toEqual([
      "estimate_id, estimate_tabs!inner(id)",
      "estimate_id",
    ]);
    expect(repositoryMocks.getEstimateTabTree).toHaveBeenCalledWith(
      projectAId,
      estimateAId,
      tabAId,
      { allowLegacyFallback: true },
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

  it("skips an over-cap node match instead of returning only its non-selectable parent", async () => {
    const cappedProjects = Array.from({ length: 49 }, (_, index) => ({
      accessKind: "owner",
      project: {
        id: `filler-project-${String(index + 1).padStart(2, "0")}`,
        name: `Needle Filler Project ${index + 1}`,
      },
    }));
    const targetEstimateId = "55555555-5555-4555-8555-555555555555";
    const targetProjectId = "66666666-6666-4666-8666-666666666666";
    const targetTabId = "77777777-7777-4777-8777-777777777777";
    repositoryMocks.listCurrentWorkspaceProjects.mockResolvedValue({
      projects: [
        ...cappedProjects,
        { accessKind: "owner", project: { id: targetProjectId, name: "Target Project" } },
      ],
    });
    repositoryMocks.listProjectEstimateSheets.mockImplementation(async (projectId: string) => (
      projectId === targetProjectId
        ? [{ id: targetEstimateId, name: "Target Estimate", sheetCode: "EST-T", updatedAt: "2026-06-12T08:00:00.000Z" }]
        : []
    ));
    repositoryMocks.getEstimateTabs.mockResolvedValue([
      { id: targetTabId, name: "Target Tab", sortOrder: 0, isDefault: true },
    ]);
    repositoryMocks.getEstimateTabTree.mockResolvedValue({
      estimate: { updated_at: "2026-06-12T08:45:00.000Z" },
      tree: [
        {
          id: "target-node",
          name: "Needle Target Area",
          kind: "area",
          total: "₱0.00",
          children: [],
          estimateRowItems: [],
        },
      ],
    });
    mockSearchPrefilter({ estimate_nodes: { data: [{ estimate_id: targetEstimateId }], error: null } });

    const { searchReusableProjectSources } = await import("@/lib/reusable-sources/actions");
    const result = await searchReusableProjectSources({ query: "needle" });

    expect(result.sources).toHaveLength(49);
    expect(result.sources.some((source) => source.kind === "project" && source.projectId === targetProjectId)).toBe(false);
    expect(result.sources.some((source) => source.kind === "project-node" && source.nodeId === "target-node")).toBe(false);
  });

  it("does not materialize all estimates for partial synthetic display-label queries", async () => {
    const estimateBId = "55555555-5555-4555-8555-555555555555";
    repositoryMocks.listCurrentWorkspaceProjects.mockResolvedValue({
      projects: [
        { accessKind: "owner", project: { id: projectAId, name: "Accessible Project" } },
      ],
    });
    repositoryMocks.listProjectEstimateSheets.mockResolvedValueOnce([
      { id: estimateAId, name: "Lobby Estimate", sheetCode: "EST-002", updatedAt: "2026-06-12T08:00:00.000Z" },
      { id: estimateBId, name: "Kitchen Estimate", sheetCode: "EST-003", updatedAt: "2026-06-12T08:05:00.000Z" },
    ]);
    mockSearchPrefilter({
      estimate_nodes: { data: [], error: null },
      estimate_tabs: { data: [], error: null },
    });

    const { searchReusableProjectSources } = await import("@/lib/reusable-sources/actions");
    const result = await searchReusableProjectSources({ query: "page" });

    expect(repositoryMocks.getEstimateTabs).not.toHaveBeenCalled();
    expect(repositoryMocks.getEstimateTabTree).not.toHaveBeenCalled();
    expect(result.sources).toEqual([]);
  });

  it("caps exact display tab label materialization across projects", async () => {
    const projects = Array.from({ length: 3 }, (_, projectIndex) => ({
      accessKind: "owner",
      project: {
        id: `project-${projectIndex + 1}`,
        name: `Project ${projectIndex + 1}`,
      },
    }));
    repositoryMocks.listCurrentWorkspaceProjects.mockResolvedValue({ projects });
    repositoryMocks.listProjectEstimateSheets.mockImplementation(async (projectId: string) => (
      Array.from({ length: 25 }, (_, estimateIndex) => ({
        id: `${projectId}-estimate-${String(estimateIndex + 1).padStart(2, "0")}`,
        name: `Estimate ${estimateIndex + 1}`,
        sheetCode: `EST-${String(estimateIndex + 1).padStart(3, "0")}`,
        updatedAt: "2026-06-12T08:00:00.000Z",
      }))
    ));
    repositoryMocks.getEstimateTabs.mockResolvedValue([
      { id: tabAId, name: "Main", sortOrder: 0, isDefault: true },
    ]);
    repositoryMocks.getEstimateTabTree.mockResolvedValue({
      estimate: { updated_at: "2026-06-12T08:45:00.000Z" },
      tree: [],
    });
    mockSearchPrefilter({
      estimate_nodes: { data: [], error: null },
      estimate_tabs: { data: [], error: null },
    });

    const { searchReusableProjectSources } = await import("@/lib/reusable-sources/actions");
    await searchReusableProjectSources({ query: "Page 001" });

    expect(repositoryMocks.getEstimateTabs).toHaveBeenCalledTimes(50);
    expect(repositoryMocks.getEstimateTabTree).toHaveBeenCalledTimes(50);
  });

  it("searches derived display tab labels before an outline is loaded", async () => {
    repositoryMocks.listCurrentWorkspaceProjects.mockResolvedValue({
      projects: [
        { accessKind: "owner", project: { id: projectAId, name: "Accessible Project" } },
      ],
    });
    repositoryMocks.listProjectEstimateSheets.mockResolvedValueOnce([
      { id: estimateAId, name: "Lobby Estimate", sheetCode: "EST-002", updatedAt: "2026-06-12T08:00:00.000Z" },
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

    const { searchReusableProjectSources } = await import("@/lib/reusable-sources/actions");
    const result = await searchReusableProjectSources({ query: "Page 001" });

    expect(repositoryMocks.getEstimateTabs).toHaveBeenCalledTimes(1);
    expect(repositoryMocks.getEstimateTabs).toHaveBeenCalledWith(projectAId, estimateAId, { allowLegacyFallback: true });
    expect(repositoryMocks.getEstimateTabTree).toHaveBeenCalledTimes(1);
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

    const { getReusableEstimateOutline } = await import("@/lib/reusable-sources/actions");
    const result = await getReusableEstimateOutline({ projectId: projectAId, estimateId: estimateAId });

    expect(repositoryMocks.getEstimateTabs).toHaveBeenCalledWith(projectAId, estimateAId, { allowLegacyFallback: true });
    expect(repositoryMocks.getEstimateTabTree).toHaveBeenCalledWith(projectAId, estimateAId, "legacy-main", { allowLegacyFallback: true });
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
