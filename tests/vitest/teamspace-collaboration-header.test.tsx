import { readFileSync } from "node:fs";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectTeamspaceHeader } from "@/components/workshop/ProjectTeamspaceHeader";
import type { ProjectCollaborationSummary } from "@/lib/collaboration/types";

const collaborationActions = vi.hoisted(() => ({
  copyProjectInviteLink: vi.fn(),
  inviteEstimateSheetCollaborator: vi.fn(),
  inviteProjectCollaborator: vi.fn(),
  removeProjectCollaborator: vi.fn(),
  readProjectInviteDeliveryReadiness: vi.fn(),
  resendProjectInviteEmail: vi.fn(),
  setEstimateSheetAccessMode: vi.fn(),
  updateProjectCollaboratorRole: vi.fn(),
}));

vi.mock("@/lib/collaboration/actions", () => collaborationActions);

const headerSource = readFileSync("src/components/workshop/ProjectTeamspaceHeader.tsx", "utf8");

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
    collaborationActions.copyProjectInviteLink.mockResolvedValue({ ok: true, message: "Copy invite link", invitePath: "/invite/copied" });
    collaborationActions.inviteEstimateSheetCollaborator.mockResolvedValue({ ok: true, message: "Sheet invite email sent." });
    collaborationActions.inviteProjectCollaborator.mockResolvedValue({ ok: true, message: "Invite email sent." });
    collaborationActions.removeProjectCollaborator.mockResolvedValue({ ok: true, message: "Project-specific access removed." });
    collaborationActions.readProjectInviteDeliveryReadiness.mockResolvedValue({
      configured: true,
      message: "Teamspace invite delivery is configured.",
    });
    collaborationActions.resendProjectInviteEmail.mockResolvedValue({ ok: true, message: "Invite email resent." });
    collaborationActions.setEstimateSheetAccessMode.mockResolvedValue({ ok: true, message: "Sheet now inherits project access." });
    collaborationActions.updateProjectCollaboratorRole.mockResolvedValue({ ok: true, message: "Role updated." });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders one Teamspaces icon button and opens the settings modal", async () => {
    const user = userEvent.setup();

    render(<ProjectTeamspaceHeader summary={summary} />);

    const teamspaceButton = screen.getByRole("button", { name: "Project teamspaces" });
    expect(teamspaceButton).toHaveClass("size-10", "border", "bg-white");
    expect(teamspaceButton).toHaveAttribute("aria-haspopup", "dialog");
    expect(teamspaceButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("PL")).not.toBeInTheDocument();

    await user.click(teamspaceButton);

    const dialog = screen.getByRole("dialog", { name: "Teamspace settings" });
    expect(teamspaceButton).toHaveAttribute("aria-expanded", "true");
    expect(within(dialog).getByText("PL")).toBeInTheDocument();
    expect(within(dialog).getByRole("img", { name: "Ana Builder" })).toBeInTheDocument();
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

    await user.click(screen.getByRole("button", { name: "Project teamspaces" }));

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

    await user.click(screen.getByRole("button", { name: "Project teamspaces" }));

    const dialog = screen.getByRole("dialog", { name: "Teamspace settings" });
    expect(within(dialog).getByRole("button", { name: "Copy private link" })).toBeInTheDocument();
    expect(within(dialog).getByText("new.collaborator@example.com")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Resend invite for new.collaborator@example.com" })).toBeInTheDocument();

    const copyInviteButton = within(dialog).getByRole("button", { name: "Copy invite link for new.collaborator@example.com" });
    await waitFor(() => expect(copyInviteButton).toBeEnabled());
    await user.click(copyInviteButton);

    expect(await within(dialog).findByRole("status")).toHaveTextContent("Invite link copied.");
  });

  it("disables visible teamspace invite controls when invite delivery is not configured", async () => {
    collaborationActions.readProjectInviteDeliveryReadiness.mockResolvedValue({
      configured: false,
      message:
        "Teamspace invite delivery is disabled until project invite entry and token settings are configured. Send beta invites manually outside the app.",
    });
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

    await user.click(screen.getByRole("button", { name: "Project teamspaces" }));

    const dialog = screen.getByRole("dialog", { name: "Teamspace settings" });
    expect(await within(dialog).findByText(/Teamspace invite delivery is disabled until project invite entry/)).toBeInTheDocument();
    expect(within(dialog).getByRole("textbox", { name: "Invite by email" })).toBeDisabled();
    expect(within(dialog).getByLabelText("Invite role")).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Send invite" })).toBeDisabled();
    expect(within(dialog).getByRole("textbox", { name: "Invite to Main Estimate" })).toBeDisabled();
    expect(within(dialog).getByLabelText("Sheet role for Main Estimate")).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Resend invite for new.collaborator@example.com" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Copy invite link for new.collaborator@example.com" })).toBeDisabled();
  });

  it("requires explicit confirmation before removing a project collaborator", async () => {
    const user = userEvent.setup();

    render(<ProjectTeamspaceHeader summary={summary} />);

    await user.click(screen.getByRole("button", { name: "Project teamspaces" }));
    await user.click(screen.getByRole("button", { name: "Remove Ana Builder" }));

    const dialog = screen.getByRole("dialog", { name: "Remove Ana Builder?" });
    expect(within(dialog).getByText("They will lose access to this project and all estimate sheets.")).toBeInTheDocument();
    expect(within(dialog).getByRole("checkbox", { name: "Notify Ana Builder of removal" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });

  it("renders uncertain invite outcomes with warning status styling", () => {
    expect(headerSource).toContain("actionMessageTone");
    expect(headerSource).toContain("isWarningActionMessage");
    expect(headerSource).toContain("share the invite link manually");
    expect(headerSource).toContain("bg-warningSoft");
    expect(headerSource).toContain("text-warning");
  });
});
