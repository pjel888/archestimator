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
  it("lists only readable project and estimate sources", async () => {
    repositoryMocks.listCurrentWorkspaceProjects.mockResolvedValue({
      projects: [
        { accessKind: "owner", project: { id: projectAId, name: "Accessible Project" } },
        { accessKind: "pending-invite", project: { id: projectBId, name: "Pending Invite Project" } },
      ],
    });
    repositoryMocks.listProjectEstimateSheets.mockResolvedValueOnce([
      { id: estimateAId, name: "Lobby Estimate", sheetCode: "EST-002" },
    ]);

    const { listReusableProjectSources } = await import("@/lib/reusable-sources/actions");
    const result = await listReusableProjectSources();

    expect(repositoryMocks.listProjectEstimateSheets).toHaveBeenCalledTimes(1);
    expect(repositoryMocks.listProjectEstimateSheets).toHaveBeenCalledWith(projectAId);
    expect(result.sources).toEqual([
      { kind: "project", projectId: projectAId, name: "Accessible Project" },
      {
        kind: "project-estimate",
        projectId: projectAId,
        estimateId: estimateAId,
        name: "Lobby Estimate",
        sheetCode: "EST-002",
      },
    ]);
  });

  it("loads a per-estimate reusable outline with tab and group or area sources", async () => {
    repositoryMocks.getEstimateTabs.mockResolvedValue([
      { id: tabAId, name: "Lobby Main", sortOrder: 0, isDefault: true },
    ]);
    repositoryMocks.getEstimateTabTree.mockResolvedValue({
      tree: [
        {
          id: "group-1",
          name: "Amenity Millwork",
          kind: "group",
          total: "₱0.00",
          children: [
            {
              id: "area-1",
              name: "Reception Feature Wall",
              kind: "area",
              total: "₱0.00",
              estimateRowItems: [],
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
      },
      {
        kind: "project-node",
        projectId: projectAId,
        estimateId: estimateAId,
        tabId: tabAId,
        nodeId: "group-1",
        nodeKind: "group",
        name: "Amenity Millwork",
      },
      {
        kind: "project-node",
        projectId: projectAId,
        estimateId: estimateAId,
        tabId: tabAId,
        nodeId: "area-1",
        nodeKind: "area",
        name: "Reception Feature Wall",
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
      { id: estimateAId, name: "Lobby Estimate", sheetCode: "EST-002" },
    ]);
    repositoryMocks.getEstimateTabs.mockResolvedValue([
      { id: tabAId, name: "Lobby Main", sortOrder: 0, isDefault: true },
    ]);
    repositoryMocks.getEstimateTabTree.mockResolvedValue({
      tree: [
        {
          id: "group-1",
          name: "Amenity Millwork",
          kind: "group",
          total: "₱0.00",
          children: [],
          estimateRowItems: [],
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
        },
      },
    ]);
  });
});
