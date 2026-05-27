import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectWorkspaceHeaderRow } from "@/components/workshop/ProjectWorkspaceHeaderRow";
import type { ProjectCollaborationSummary } from "@/lib/collaboration/types";
import type { ProjectPublicationSummary } from "@/lib/publication/types";

const publicationActions = vi.hoisted(() => ({
  createProjectPublication: vi.fn(),
  republishProjectPublication: vi.fn(),
  revokeProjectPublication: vi.fn(),
  rotateProjectPublicationLink: vi.fn(),
}));

vi.mock("@/lib/publication/actions", () => publicationActions);

vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop/projects/project-1/estimates/estimate-1",
}));

const collaborationSummary: ProjectCollaborationSummary = {
  projectId: "project-1",
  workspaceId: "workspace-1",
  currentUserId: "user-1",
  currentUserRole: "owner",
  canManageAccess: true,
  collaborators: [
    {
      id: "user-1",
      displayName: "Philip Lewis",
      email: "philip@example.com",
      avatarUrl: null,
      role: "owner",
      source: "project",
      online: true,
    },
  ],
  pendingInvitations: [],
  estimateSheets: [],
  realtime: {
    privateChannels: true,
    projectChannel: "project:project-1",
    estimateChannelPrefix: "estimate:",
    presenceTransport: "presence",
    cursorTransport: "broadcast",
  },
};

const publicationSummary: ProjectPublicationSummary = {
  projectId: "project-1",
  workspaceId: "workspace-1",
  canManagePublication: true,
  status: "published",
  publicationId: "publication-1",
  clientLinkPath: "/share/client-token",
  tokenCopyAvailable: true,
  publishedAt: "2026-05-27T00:00:00.000Z",
  expiresAt: null,
  passwordRequired: true,
  selectedEstimateCount: 2,
  snapshotVersion: 3,
  openCount: 4,
  latestOpenedAt: "2026-05-27T01:00:00.000Z",
};

describe("ProjectWorkspaceHeaderRow publication control", () => {
  beforeEach(() => {
    publicationActions.createProjectPublication.mockReset();
    publicationActions.republishProjectPublication.mockReset();
    publicationActions.revokeProjectPublication.mockReset();
    publicationActions.rotateProjectPublicationLink.mockReset();

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn(async () => undefined),
      },
    });
  });

  it("places Publish before Teamspaces and keeps the client link in its own modal", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ProjectWorkspaceHeaderRow
        projectId="project-1"
        projectCode="PRJ-001"
        collaborationSummary={collaborationSummary}
        publicationSummary={publicationSummary}
      />,
    );

    const actions = container.querySelector('[data-workshop-layout="project-workspace-header-actions"]');
    expect(actions?.textContent).toMatch(/Public link.*Teamspaces/s);

    await user.click(screen.getByRole("button", { name: "Open public client link" }));

    const dialog = screen.getByRole("dialog", { name: "Public client link" });
    expect(within(dialog).getAllByText("Public link").length).toBeGreaterThan(0);
    expect(within(dialog).getByRole("textbox", { name: "Public link" })).toHaveValue("http://localhost:3000/share/client-token");
    expect(within(dialog).getByText("Password on")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Update public page" })).toBeEnabled();
    expect(within(dialog).getByRole("button", { name: "Create new public link" })).toBeEnabled();
    expect(within(dialog).queryByText("Project share link")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Client publication snapshot")).not.toBeInTheDocument();
  });

  it("generates a public view-only link with an optional password and shows it immediately", async () => {
    publicationActions.createProjectPublication.mockResolvedValueOnce({
      ok: true,
      message: "Public link ready.",
      clientLinkPath: "/share/generated-token",
    });

    const user = userEvent.setup();
    const unpublishedSummary: ProjectPublicationSummary = {
      ...publicationSummary,
      status: "unpublished",
      publicationId: null,
      clientLinkPath: null,
      tokenCopyAvailable: false,
      publishedAt: null,
      passwordRequired: false,
      selectedEstimateCount: 0,
      snapshotVersion: 0,
      openCount: 0,
      latestOpenedAt: null,
    };

    render(
      <ProjectWorkspaceHeaderRow
        projectId="project-1"
        projectCode="PRJ-001"
        collaborationSummary={null}
        publicationSummary={unpublishedSummary}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open public client link" }));
    const dialog = screen.getByRole("dialog", { name: "Public client link" });
    await user.click(within(dialog).getByLabelText("Require password"));
    await user.type(within(dialog).getByLabelText("Link password"), "client-pass-1");
    await user.click(within(dialog).getByRole("button", { name: "Generate public link" }));

    expect(publicationActions.createProjectPublication).toHaveBeenCalledWith({
      projectId: "project-1",
      password: "client-pass-1",
    });
    expect(await within(dialog).findByDisplayValue("http://localhost:3000/share/generated-token")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Copy public link" })).toBeEnabled();
    expect(within(dialog).getByRole("button", { name: "Create new public link" })).toBeEnabled();
  });

  it("can create a fresh public link for an already published page", async () => {
    publicationActions.rotateProjectPublicationLink.mockResolvedValueOnce({
      ok: true,
      message: "New public link ready.",
      clientLinkPath: "/share/rotated-token",
    });

    const user = userEvent.setup();
    render(
      <ProjectWorkspaceHeaderRow
        projectId="project-1"
        projectCode="PRJ-001"
        collaborationSummary={null}
        publicationSummary={publicationSummary}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open public client link" }));
    const dialog = screen.getByRole("dialog", { name: "Public client link" });
    await user.click(within(dialog).getByRole("button", { name: "Create new public link" }));

    expect(publicationActions.rotateProjectPublicationLink).toHaveBeenCalledWith({
      projectId: "project-1",
      password: undefined,
      clearPassword: false,
    });
    expect(await within(dialog).findByDisplayValue("http://localhost:3000/share/rotated-token")).toBeInTheDocument();
  });
});
