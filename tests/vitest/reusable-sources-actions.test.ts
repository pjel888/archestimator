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

vi.mock("@/lib/auth/session", () => ({
  requireCurrentUserContext: authMocks.requireCurrentUserContext,
}));

vi.mock("@/lib/supabase/server", () => supabaseServerMocks);

vi.mock("@/lib/repositories/workspace-repository", () => ({
  getEstimateTabs: repositoryMocks.getEstimateTabs,
  getEstimateTabTree: repositoryMocks.getEstimateTabTree,
  getProjectEstimateTreeByEstimate: repositoryMocks.getProjectEstimateTreeByEstimate,
  listCurrentWorkspaceProjects: repositoryMocks.listCurrentWorkspaceProjects,
  listProjectEstimateSheets: repositoryMocks.listProjectEstimateSheets,
}));

// U5: the server-side search pre-filters matching estimates via two bounded
// ILIKE queries (estimate_nodes + estimate_tabs) before materializing trees. This
// chainable stub resolves each `.from(table)...` chain to the configured result.
function mockSearchPrefilter(resultByTable: Record<string, { data: unknown; error: unknown }>) {
  const makeBuilder = (table: string) => {
    const result = resultByTable[table] ?? { data: [], error: null };
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "in", "ilike", "is", "eq", "order"]) {
      builder[method] = () => builder;
    }
    builder.range = (from: number, to: number) => {
      if (!Array.isArray(result.data)) return result;
      return { ...result, data: result.data.slice(from, to + 1) };
    };
    builder.then = (resolve: (value: unknown) => unknown) => resolve(result);
    builder.maybeSingle = async () => result;
    return builder;
  };
  supabaseServerMocks.createSupabaseServerClient.mockResolvedValue({ from: (table: string) => makeBuilder(table) });
}

const projectAId = "11111111-1111-4111-8111-111111111111";
const projectBId = "22222222-2222-4222-8222-222222222222";
const estimateAId = "33333333-3333-4333-8333-333333333333";
const estimateBId = "55555555-5555-4555-8555-555555555555";
const tabAId = "44444444-4444-4444-8444-444444444444";
const tabBId = "66666666-6666-4666-8666-666666666666";

beforeEach(() => {
  authMocks.requireCurrentUserContext.mockResolvedValue({ userId: "user-1" });
  repositoryMocks.getEstimateTabs.mockReset();
  repositoryMocks.getEstimateTabTree.mockReset();
  repositoryMocks.getProjectEstimateTreeByEstimate.mockReset();
  repositoryMocks.listCurrentWorkspaceProjects.mockReset();
  repositoryMocks.listProjectEstimateSheets.mockReset();
  supabaseServerMocks.createSupabaseServerClient.mockReset();
  // Default: no estimate matches the pre-filter (the search test sets the match).
  mockSearchPrefilter({});
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
    mockSearchPrefilter({ estimate_nodes: { data: [{ estimate_id: estimateAId }], error: null } });

    const { searchReusableProjectSources } = await import("@/lib/reusable-sources/actions");
    const result = await searchReusableProjectSources({ query: "amenity" });

    expect(repositoryMocks.listProjectEstimateSheets).toHaveBeenCalledTimes(1);
    expect(repositoryMocks.listProjectEstimateSheets).toHaveBeenCalledWith(projectAId);
    expect(repositoryMocks.getEstimateTabs).toHaveBeenCalledWith(projectAId, estimateAId, { allowLegacyFallback: true });
    expect(repositoryMocks.getEstimateTabTree).toHaveBeenCalledWith(projectAId, estimateAId, tabAId, { allowLegacyFallback: true });
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

  it("pages reusable search prefilter rows so crowded matches do not hide later estimates", async () => {
    repositoryMocks.listCurrentWorkspaceProjects.mockResolvedValue({
      projects: [
        { accessKind: "owner", project: { id: projectAId, name: "Accessible Project" } },
      ],
    });
    repositoryMocks.listProjectEstimateSheets.mockResolvedValueOnce([
      { id: estimateAId, name: "Crowding Estimate", sheetCode: "EST-001", updatedAt: "2026-06-12T08:00:00.000Z" },
      { id: estimateBId, name: "Later Estimate", sheetCode: "EST-002", updatedAt: "2026-06-12T09:00:00.000Z" },
    ]);
    repositoryMocks.getEstimateTabs.mockImplementation(async (_projectId: string, estimateId: string) => [
      { id: estimateId === estimateBId ? tabBId : tabAId, name: "Main", sortOrder: 0, isDefault: true },
    ]);
    repositoryMocks.getEstimateTabTree.mockImplementation(async (_projectId: string, estimateId: string) => ({
      estimate: { updated_at: "2026-06-12T09:30:00.000Z" },
      tree: estimateId === estimateBId
        ? [
            {
              id: "area-b",
              name: "Needle Area",
              kind: "area",
              total: "₱0.00",
              children: [],
              estimateRowItems: [{ totalItemCosts: 42 }],
            },
          ]
        : [],
    }));
    mockSearchPrefilter({
      estimate_nodes: {
        data: [
          ...Array.from({ length: 5000 }, () => ({ estimate_id: estimateAId })),
          { estimate_id: estimateBId },
        ],
        error: null,
      },
      estimate_tabs: { data: [], error: null },
    });

    const { searchReusableProjectSources } = await import("@/lib/reusable-sources/actions");
    const result = await searchReusableProjectSources({ query: "needle" });

    expect(repositoryMocks.getEstimateTabs).toHaveBeenCalledWith(projectAId, estimateBId, { allowLegacyFallback: true });
    expect(repositoryMocks.getEstimateTabTree).toHaveBeenCalledWith(
      projectAId,
      estimateBId,
      tabBId,
      { allowLegacyFallback: true },
    );
    expect(
      result.sources.some(
        (source) => source.kind === "project-node" && source.estimateId === estimateBId && source.name === "Needle Area",
      ),
    ).toBe(true);
  });

  it("does not materialize all estimates for partial synthetic display-label queries", async () => {
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
