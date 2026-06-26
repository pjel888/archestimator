import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCurrentUserContext: vi.fn(),
}));

const repositoryMocks = vi.hoisted(() => ({
  getProjectCollaborationSummary: vi.fn(),
  getProjectPublicationSummary: vi.fn(),
  listCurrentWorkspaceProjects: vi.fn(),
  listProjectEstimateSheets: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("@/lib/repositories/workspace-repository", () => repositoryMocks);

function projectItem(projectId: string, currentUserRole: "owner" | "admin" | "editor" | "viewer") {
  return {
    currentUserRole,
    project: {
      id: projectId,
    },
  };
}

describe("readPublisherPublicationDrawerData", () => {
  beforeEach(() => {
    authMocks.requireAuth.mockReset();
    authMocks.requireCurrentUserContext.mockReset();
    repositoryMocks.getProjectCollaborationSummary.mockReset();
    repositoryMocks.getProjectPublicationSummary.mockReset();
    repositoryMocks.listCurrentWorkspaceProjects.mockReset();
    repositoryMocks.listProjectEstimateSheets.mockReset();

    authMocks.requireCurrentUserContext.mockResolvedValue({
      email: "editor@example.test",
      userId: "user-1",
    });
    repositoryMocks.getProjectPublicationSummary.mockResolvedValue({
      canManagePublication: false,
      clientLinkPath: "/share/sensitive-token",
      projectId: "project-editor",
      selectedEstimateIds: [],
      status: "published",
      tokenCopyAvailable: true,
    });
    repositoryMocks.getProjectCollaborationSummary.mockResolvedValue({
      projectId: "project-editor",
      collaborators: [],
      estimateSheets: [],
    });
    repositoryMocks.listProjectEstimateSheets.mockResolvedValue([
      { id: "estimate-a", name: "Base", sheetCode: "E-1" },
    ]);
  });

  it("rejects viewer-only projects before loading drawer details", async () => {
    const { readPublisherPublicationDrawerData } = await import("@/lib/publisher/drawer-actions");
    repositoryMocks.listCurrentWorkspaceProjects.mockResolvedValue({
      projects: [projectItem("project-viewer", "viewer")],
      workspace: { id: "workspace-1" },
    });

    await expect(readPublisherPublicationDrawerData("project-viewer")).rejects.toThrow(
      "Project is not available in Publisher.",
    );

    expect(repositoryMocks.getProjectPublicationSummary).not.toHaveBeenCalled();
    expect(repositoryMocks.getProjectCollaborationSummary).not.toHaveBeenCalled();
    expect(repositoryMocks.listProjectEstimateSheets).not.toHaveBeenCalled();
  });

  it("loads drawer details for projects visible in the Publisher roster", async () => {
    const { readPublisherPublicationDrawerData } = await import("@/lib/publisher/drawer-actions");
    repositoryMocks.listCurrentWorkspaceProjects.mockResolvedValue({
      projects: [projectItem("project-editor", "editor")],
      workspace: { id: "workspace-1" },
    });

    const result = await readPublisherPublicationDrawerData("project-editor");

    expect(result.currentUserEmail).toBe("editor@example.test");
    expect(repositoryMocks.getProjectPublicationSummary).toHaveBeenCalledWith("project-editor");
    expect(repositoryMocks.getProjectCollaborationSummary).toHaveBeenCalledWith("project-editor");
    expect(repositoryMocks.listProjectEstimateSheets).toHaveBeenCalledWith("project-editor");
    expect(result.collaborationSummary).toEqual({
      projectId: "project-editor",
      collaborators: [],
      estimateSheets: [],
    });
    expect(result.estimateSheets).toEqual([
      { id: "estimate-a", name: "Base", sheetCode: "E-1" },
    ]);
    expect(result.summary).toMatchObject({
      clientLinkPath: null,
      tokenCopyAvailable: false,
    });
  });

  it("keeps drawer client links for Publisher managers", async () => {
    const { readPublisherPublicationDrawerData } = await import("@/lib/publisher/drawer-actions");
    repositoryMocks.listCurrentWorkspaceProjects.mockResolvedValue({
      projects: [projectItem("project-owner", "owner")],
      workspace: { id: "workspace-1" },
    });
    repositoryMocks.getProjectPublicationSummary.mockResolvedValue({
      canManagePublication: true,
      clientLinkPath: "/share/manager-token",
      projectId: "project-owner",
      selectedEstimateIds: [],
      status: "published",
      tokenCopyAvailable: true,
    });

    const result = await readPublisherPublicationDrawerData("project-owner");

    expect(result.summary).toMatchObject({
      clientLinkPath: "/share/manager-token",
      tokenCopyAvailable: true,
    });
  });
});
