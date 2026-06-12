import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  requireCurrentUserContext: vi.fn(),
}));

const repositoryMocks = vi.hoisted(() => ({
  getEstimateTabs: vi.fn(),
  getEstimateTabTree: vi.fn(),
  listCurrentWorkspaceProjects: vi.fn(),
  listProjectEstimateSheets: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireCurrentUserContext: authMocks.requireCurrentUserContext,
}));

vi.mock("@/lib/repositories/workspace-repository", () => ({
  getEstimateTabs: repositoryMocks.getEstimateTabs,
  getEstimateTabTree: repositoryMocks.getEstimateTabTree,
  listCurrentWorkspaceProjects: repositoryMocks.listCurrentWorkspaceProjects,
  listProjectEstimateSheets: repositoryMocks.listProjectEstimateSheets,
}));

const projectAId = "11111111-1111-4111-8111-111111111111";
const projectBId = "22222222-2222-4222-8222-222222222222";
const estimateAId = "33333333-3333-4333-8333-333333333333";
const tabAId = "44444444-4444-4444-8444-444444444444";

beforeEach(() => {
  authMocks.requireCurrentUserContext.mockResolvedValue({ userId: "user-1" });
  repositoryMocks.getEstimateTabs.mockReset();
  repositoryMocks.getEstimateTabTree.mockReset();
  repositoryMocks.listCurrentWorkspaceProjects.mockReset();
  repositoryMocks.listProjectEstimateSheets.mockReset();
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

    expect(repositoryMocks.getEstimateTabs).toHaveBeenCalledWith(projectAId, estimateAId);
    expect(repositoryMocks.getEstimateTabTree).toHaveBeenCalledWith(projectAId, estimateAId, tabAId);
    expect(result.sources).toEqual([
      {
        kind: "project-tab",
        projectId: projectAId,
        estimateId: estimateAId,
        tabId: tabAId,
        name: "Lobby Main",
        metadata: {
          tabName: "Lobby Main",
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
        nodeKind: "group",
        name: "Amenity Millwork",
        metadata: {
          tabName: "Lobby Main",
          nodePath: ["Lobby Main", "Amenity Millwork"],
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
        nodeKind: "area",
        name: "Reception Feature Wall",
        metadata: {
          tabName: "Lobby Main",
          nodePath: ["Lobby Main", "Amenity Millwork", "Reception Feature Wall"],
          updatedAt: "2026-06-12T08:30:00.000Z",
          rowCount: 2,
          totalCost: 250,
        },
      },
    ]);
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

    const { searchReusableProjectSources } = await import("@/lib/reusable-sources/actions");
    const result = await searchReusableProjectSources({ query: "amenity" });

    expect(repositoryMocks.listProjectEstimateSheets).toHaveBeenCalledTimes(1);
    expect(repositoryMocks.listProjectEstimateSheets).toHaveBeenCalledWith(projectAId);
    expect(repositoryMocks.getEstimateTabs).toHaveBeenCalledWith(projectAId, estimateAId);
    expect(repositoryMocks.getEstimateTabTree).toHaveBeenCalledWith(projectAId, estimateAId, tabAId);
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
        metadata: {
          projectName: "Accessible Project",
          estimateName: "Lobby Estimate",
          sheetCode: "EST-002",
          tabName: "Lobby Main",
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
        nodeKind: "group",
        name: "Amenity Millwork",
        metadata: {
          projectName: "Accessible Project",
          estimateName: "Lobby Estimate",
          sheetCode: "EST-002",
          tabName: "Lobby Main",
          nodePath: ["Lobby Main", "Amenity Millwork"],
          updatedAt: "2026-06-12T08:45:00.000Z",
          rowCount: 1,
          totalCost: 125000,
        },
      },
    ]);
  });
});
