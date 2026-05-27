import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectTeamspaceHeader } from "@/components/workshop/ProjectTeamspaceHeader";
import type { ProjectCollaborationSummary } from "@/lib/collaboration/types";

const summary: ProjectCollaborationSummary = {
  projectId: "project-1",
  workspaceId: "workspace-1",
  currentUserRole: "owner",
  canManageAccess: true,
  collaborators: [
    {
      id: "user-1",
      displayName: "Philip Lewis",
      email: "philipjonlewis@gmail.com",
      avatarUrl: null,
      role: "owner",
      source: "project",
      online: true,
    },
    {
      id: "user-2",
      displayName: "Ana Builder",
      email: "ana@example.com",
      avatarUrl: "https://example.com/ana.jpg",
      role: "editor",
      source: "project",
      online: false,
    },
  ],
  pendingInvitations: [],
  estimateSheets: [
    {
      estimateId: "estimate-1",
      sheetCode: "ES-001",
      name: "Main Estimate",
      accessMode: "inherits-project",
      overrideCount: 0,
      canManageAccess: true,
    },
    {
      estimateId: "estimate-2",
      sheetCode: "ES-002",
      name: "Client Option",
      accessMode: "sheet-overrides",
      overrideCount: 1,
      canManageAccess: true,
    },
  ],
  realtime: {
    privateChannels: true,
    projectChannel: "project:project-1",
    estimateChannelPrefix: "estimate:",
    presenceTransport: "presence",
    cursorTransport: "broadcast",
  },
};

describe("ProjectTeamspaceHeader", () => {
  const clipboardWriteText = vi.fn<Clipboard["writeText"]>();

  beforeEach(() => {
    clipboardWriteText.mockClear();
    clipboardWriteText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: clipboardWriteText,
      },
    });
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: clipboardWriteText,
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the compact Teamspaces rail and opens the settings modal", async () => {
    const user = userEvent.setup();

    render(<ProjectTeamspaceHeader summary={summary} />);

    const rail = screen.getByLabelText("Project teamspaces");
    expect(rail).toHaveTextContent("Teamspaces");
    expect(within(rail).getByText("PL")).toBeInTheDocument();
    expect(within(rail).getByRole("img", { name: "Ana Builder" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open teamspace settings" }));

    const dialog = screen.getByRole("dialog", { name: "Teamspace settings" });
    expect(within(dialog).getByText("Project access")).toBeInTheDocument();
    expect(within(dialog).getByRole("textbox", { name: "Invite by email" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Send invite" })).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Role for Ana Builder")).toBeInTheDocument();
    expect(within(dialog).getByText("Estimate sheet access")).toBeInTheDocument();
    expect(within(dialog).getByText("Main Estimate")).toBeInTheDocument();
    expect(within(dialog).getByText("Client Option")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Access mode for Main Estimate")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Copy private link" })).toBeInTheDocument();
    expect(within(dialog).getByText("Private realtime")).toBeInTheDocument();
  });

  it("exposes a project link field and copies the current project URL", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: clipboardWriteText,
      },
    });

    render(<ProjectTeamspaceHeader summary={summary} />);

    await user.click(screen.getByRole("button", { name: "Open teamspace settings" }));

    const dialog = screen.getByRole("dialog", { name: "Teamspace settings" });
    const shareLink = within(dialog).getByRole("textbox", { name: "Private project link" });
    expect((shareLink as HTMLInputElement).value).toContain("/workshop/projects/project-1");
    expect(shareLink).toHaveAttribute("readOnly");

    await user.click(within(dialog).getByRole("button", { name: "Copy private link" }));

    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining("/workshop/projects/project-1"));
    expect(await within(dialog).findByRole("status")).toHaveTextContent("Private link copied.");
  });

  it("shows pending invite copy links separately from the direct project link", async () => {
    const user = userEvent.setup();
    const summaryWithInvite: ProjectCollaborationSummary = {
      ...summary,
      pendingInvitations: [
        {
          id: "invite-1",
          email: "new.collaborator@example.com",
          role: "viewer",
          scope: "project",
          estimateId: null,
          expiresAt: "2026-06-01T00:00:00.000Z",
          invitePath: "/invite/token-abc123",
        },
      ],
    };

    render(<ProjectTeamspaceHeader summary={summaryWithInvite} />);

    await user.click(screen.getByRole("button", { name: "Open teamspace settings" }));

    const dialog = screen.getByRole("dialog", { name: "Teamspace settings" });
    expect(within(dialog).getByRole("button", { name: "Copy private link" })).toBeInTheDocument();
    expect(within(dialog).getByText("new.collaborator@example.com")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Copy invite link for new.collaborator@example.com" }));

    expect(await within(dialog).findByRole("status")).toHaveTextContent("Invite link copied.");
  });
});
