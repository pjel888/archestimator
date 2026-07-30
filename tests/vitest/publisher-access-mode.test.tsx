import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { PublisherProjectMembersPanel } from "@/components/workshop/publisher/PublisherProjectMembersPanel";
import type { ProjectCollaborationSummary } from "@/lib/collaboration/types";

const collaborationActions = vi.hoisted(() => ({
  addProjectCollaborator: vi.fn(),
  addEstimateSheetCollaborator: vi.fn(),
  copyProjectInviteLink: vi.fn(),
  inviteProjectCollaborator: vi.fn(),
  inviteEstimateSheetCollaborator: vi.fn(),
  previewEstimateSheetCollaboratorRemoval: vi.fn(),
  previewProjectCollaboratorRemoval: vi.fn(),
  removeEstimateSheetCollaborator: vi.fn(),
  removeProjectCollaborator: vi.fn(),
  resendProjectInviteEmail: vi.fn(),
  revokeCollaborationInvitation: vi.fn(),
  setEstimateSheetAccessMode: vi.fn(),
  updateEstimateSheetCollaboratorRole: vi.fn(),
  updateProjectCollaboratorRole: vi.fn(),
}));

vi.mock("@/lib/collaboration/actions", () => collaborationActions);

const summaryActionMocks = vi.hoisted(() => ({
  fetchProjectCollaborationSummary: vi.fn(),
}));

vi.mock("@/lib/collaboration/summary-actions", () => summaryActionMocks);

const summary: ProjectCollaborationSummary = {
  projectId: "project-1",
  workspaceId: "workspace-1",
  currentUserId: "user-1",
  currentUserRole: "owner",
  canManageAccess: true,
  collaborators: [
    {
      id: "user-1",
      displayName: "Philip Lewis",
      email: "owner@example.test",
      avatarUrl: null,
      role: "owner",
      source: "project",
      directProjectRole: "owner",
      online: true,
    },
    {
      id: "user-2",
      displayName: "Ana Builder",
      email: "ana@example.test",
      avatarUrl: null,
      role: "editor",
      source: "project",
      directProjectRole: "editor",
      online: false,
    },
    {
      id: "user-3",
      displayName: "Sam Sheet",
      email: "sam@example.test",
      avatarUrl: null,
      role: "viewer",
      source: "sheet",
      directProjectRole: null,
      online: false,
    },
  ],
  eligibleProjectMemberCandidates: [
    {
      id: "user-4",
      displayName: "Taylor Workspace",
      email: "taylor@example.test",
    },
  ],
  pendingInvitations: [],
  estimateSheets: [
    {
      estimateId: "estimate-1",
      sheetCode: "E-1",
      name: "Main Estimate",
      accessMode: "inherits-project",
      overrideCount: 0,
      canManageAccess: true,
      eligibleMemberCandidates: [
        { id: "user-4", displayName: "Taylor Workspace", email: "taylor@example.test" },
      ],
      members: [],
    },
    {
      estimateId: "estimate-2",
      sheetCode: "E-2",
      name: "Client Option",
      accessMode: "sheet-overrides",
      overrideCount: 1,
      canManageAccess: true,
      members: [
        {
          id: "user-2",
          displayName: "Ana Builder",
          email: "ana@example.test",
          avatarUrl: null,
          role: "editor",
          source: "sheet",
          online: false,
          estimateId: "estimate-2",
        },
      ],
    },
    {
      estimateId: "estimate-3",
      sheetCode: "E-3",
      name: "Restricted Sheet",
      accessMode: "restricted",
      overrideCount: 1,
      canManageAccess: true,
      members: [
        {
          id: "user-3",
          displayName: "Sam Sheet",
          email: "sam@example.test",
          avatarUrl: null,
          role: "viewer",
          source: "sheet",
          online: false,
          estimateId: "estimate-3",
        },
      ],
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

function renderPanel(initialSummary: ProjectCollaborationSummary = summary) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return render(
    <PublisherProjectMembersPanel
      projectId={initialSummary.projectId}
      initialSummary={initialSummary}
    />,
    { wrapper: Wrapper },
  );
}

function sheetRow(container: HTMLElement, estimateId: string) {
  const row = container.querySelector<HTMLElement>(`[data-publisher-sheet-access-row="${estimateId}"]`);
  if (!row) throw new Error(`Missing sheet row ${estimateId}`);
  return row;
}

describe("PublisherProjectMembersPanel", () => {
  beforeEach(() => {
    collaborationActions.addProjectCollaborator.mockResolvedValue({
      ok: true,
      message: "Project member added.",
    });
    collaborationActions.addEstimateSheetCollaborator.mockResolvedValue({
      ok: true,
      message: "Estimate member added.",
    });
    collaborationActions.copyProjectInviteLink.mockResolvedValue({
      ok: true,
      message: "Copy invite link",
      invitePath: "/invite/token-1",
    });
    collaborationActions.inviteProjectCollaborator.mockResolvedValue({
      ok: true,
      message: "Invite email sent.",
    });
    collaborationActions.inviteEstimateSheetCollaborator.mockResolvedValue({
      ok: true,
      message: "Estimate invite email sent.",
    });
    collaborationActions.removeEstimateSheetCollaborator.mockResolvedValue({
      ok: true,
      message: "Estimate-specific access removed.",
    });
    collaborationActions.previewEstimateSheetCollaboratorRemoval.mockResolvedValue({
      ok: true,
      message: "After removal, Workspace editor access remains.",
    });
    collaborationActions.previewProjectCollaboratorRemoval.mockResolvedValue({
      ok: true,
      message: "This member has direct access to 1 estimate.",
      affectedEstimateNames: ["Client Option"],
    });
    collaborationActions.removeProjectCollaborator.mockResolvedValue({
      ok: true,
      message: "Project-specific access removed.",
    });
    collaborationActions.resendProjectInviteEmail.mockResolvedValue({
      ok: true,
      message: "Invite email resent.",
    });
    collaborationActions.revokeCollaborationInvitation.mockResolvedValue({
      ok: true,
      message: "Invitation cancelled.",
    });
    collaborationActions.setEstimateSheetAccessMode.mockResolvedValue({
      ok: true,
      message: "Estimate access updated.",
    });
    collaborationActions.updateEstimateSheetCollaboratorRole.mockResolvedValue({
      ok: true,
      message: "Estimate access role updated.",
    });
    collaborationActions.updateProjectCollaboratorRole.mockResolvedValue({
      ok: true,
      message: "Role updated.",
    });
    summaryActionMocks.fetchProjectCollaborationSummary.mockResolvedValue(summary);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders project members, sheet modes, and sheet-specific member rows", () => {
    renderPanel();

    expect(screen.getAllByText("Philip Lewis")).toHaveLength(2);
    expect(screen.getAllByText("Ana Builder")).toHaveLength(3);
    expect(screen.queryByText("Workspace")).not.toBeInTheDocument();
    expect(screen.getByText("Main Estimate")).toBeInTheDocument();
    expect(screen.getByText("Client Option")).toBeInTheDocument();
    expect(screen.getByText("Restricted Sheet")).toBeInTheDocument();
    expect(screen.getByText("E-1 · Inherited")).toBeInTheDocument();
    expect(screen.getByText("E-2 · 1 override")).toBeInTheDocument();
    expect(screen.getByText("E-3 · Restricted")).toBeInTheDocument();
    expect(screen.getByText("No sheet-specific members.")).toBeInTheDocument();
  });

  it("requires confirmation before restricting inherited estimate access", async () => {
    const user = userEvent.setup();
    renderPanel();

    const accessTrigger = screen.getByRole("combobox", { name: "Access mode for Main Estimate" });
    expect(accessTrigger).toHaveTextContent("Inherited");

    await user.click(accessTrigger);
    await user.click(screen.getByRole("option", { name: "Restricted" }));

    const dialog = screen.getByRole("dialog", { name: "Restrict Main Estimate?" });
    expect(within(dialog).getByText(/Project members will stop inheriting access/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(collaborationActions.setEstimateSheetAccessMode).not.toHaveBeenCalled();

    await user.click(accessTrigger);
    await user.click(screen.getByRole("option", { name: "Restricted" }));
    await user.click(within(screen.getByRole("dialog", { name: "Restrict Main Estimate?" })).getByRole("button", { name: "Restrict" }));

    await waitFor(() =>
      expect(collaborationActions.setEstimateSheetAccessMode).toHaveBeenCalledWith({
        projectId: "project-1",
        estimateId: "estimate-1",
        inheritProjectAccess: false,
      }),
    );
  });

  it("switches restricted estimate access back to inherited without a confirmation dialog", async () => {
    const user = userEvent.setup();
    renderPanel();

    const accessTrigger = screen.getByRole("combobox", { name: "Access mode for Restricted Sheet" });
    expect(accessTrigger).toHaveTextContent("Restricted");

    await user.click(accessTrigger);
    await user.click(screen.getByRole("option", { name: "Inherited" }));

    expect(screen.queryByRole("dialog", { name: "Restrict Restricted Sheet?" })).not.toBeInTheDocument();
    await waitFor(() =>
      expect(collaborationActions.setEstimateSheetAccessMode).toHaveBeenCalledWith({
        projectId: "project-1",
        estimateId: "estimate-3",
        inheritProjectAccess: true,
      }),
    );
  });

  it("validates sheet invite email before calling the invite action", async () => {
    const user = userEvent.setup();
    const { container } = renderPanel();
    const mainEstimate = sheetRow(container, "estimate-1");
    const email = within(mainEstimate).getByRole("textbox", { name: "Invite to Main Estimate" });
    const inviteButton = within(mainEstimate).getByRole("button", { name: "Invite to Main Estimate" });

    await user.type(email, "not-an-email");
    await user.click(inviteButton);

    expect(collaborationActions.inviteEstimateSheetCollaborator).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email address.");

    await user.clear(email);
    await user.type(email, "new.viewer@example.test");
    await user.click(inviteButton);

    await waitFor(() =>
      expect(collaborationActions.inviteEstimateSheetCollaborator).toHaveBeenCalledWith({
        projectId: "project-1",
        estimateId: "estimate-1",
        email: "new.viewer@example.test",
        role: "viewer",
      }),
    );
  });

  it("creates project invitations through the explicit email-invite command", async () => {
    const user = userEvent.setup();
    renderPanel();

    const email = screen.getByLabelText("Invite project member by email");
    await user.type(email, "project.viewer@example.test");
    await user.click(within(email.closest("form") as HTMLElement).getByRole("button", { name: "Invite" }));

    await waitFor(() =>
      expect(collaborationActions.inviteProjectCollaborator).toHaveBeenCalledWith({
        projectId: "project-1",
        email: "project.viewer@example.test",
        role: "viewer",
      }),
    );
  });

  it("adds a known workspace profile through the explicit direct-grant command", async () => {
    const user = userEvent.setup();
    renderPanel();

    const member = screen.getByRole("combobox", { name: "Known project member" });
    await user.click(member);
    await user.click(screen.getByRole("option", { name: "Taylor Workspace (taylor@example.test)" }));
    await user.click(within(screen.getByText("Add known project member").closest("section") as HTMLElement).getByRole("button", { name: "Add" }));

    await waitFor(() =>
      expect(collaborationActions.addProjectCollaborator).toHaveBeenCalledWith({
        projectId: "project-1",
        userId: "user-4",
        role: "viewer",
      }),
    );
    expect(collaborationActions.inviteProjectCollaborator).not.toHaveBeenCalled();
  });

  it("adds a known member to an estimate through the estimate-scoped command", async () => {
    const user = userEvent.setup();
    const { container } = renderPanel();
    const mainEstimate = sheetRow(container, "estimate-1");

    const member = within(mainEstimate).getByRole("combobox", { name: "Known member for Main Estimate" });
    await user.click(member);
    await user.click(screen.getByRole("option", { name: "Taylor Workspace (taylor@example.test)" }));
    await user.click(within(mainEstimate).getByRole("button", { name: "Add" }));

    await waitFor(() =>
      expect(collaborationActions.addEstimateSheetCollaborator).toHaveBeenCalledWith({
        projectId: "project-1",
        estimateId: "estimate-1",
        userId: "user-4",
        role: "viewer",
      }),
    );
  });

  it("renders pending invitation lifecycle controls and confirms cancellation", async () => {
    const user = userEvent.setup();
    const pendingSummary: ProjectCollaborationSummary = {
      ...summary,
      pendingInvitations: [{
        id: "invite-1",
        email: "pending@example.test",
        role: "viewer",
        scope: "project",
        estimateId: null,
        expiresAt: "2030-07-11T00:00:00.000Z",
      }],
    };
    summaryActionMocks.fetchProjectCollaborationSummary.mockResolvedValue(pendingSummary);
    renderPanel(pendingSummary);

    expect(screen.getByText("Pending invitations")).toBeInTheDocument();
    expect(screen.getByText("pending@example.test")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy invite for pending@example.test" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Resend invite for pending@example.test" }));
    await waitFor(() =>
      expect(collaborationActions.resendProjectInviteEmail).toHaveBeenCalledWith({ invitationId: "invite-1" }),
    );

    await user.click(screen.getByRole("button", { name: "Cancel invite for pending@example.test" }));
    const dialog = screen.getByRole("alertdialog", { name: "Cancel invite for pending@example.test?" });
    await user.click(within(dialog).getByRole("button", { name: "Cancel invite" }));
    await waitFor(() =>
      expect(collaborationActions.revokeCollaborationInvitation).toHaveBeenCalledWith({ invitationId: "invite-1" }),
    );
  });

  it("changes and removes only direct project grants after capability filtering", async () => {
    const user = userEvent.setup();
    renderPanel();

    expect(screen.getByText("Direct project access")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Direct project role for Philip Lewis" })).not.toBeInTheDocument();

    const role = screen.getByRole("combobox", { name: "Direct project role for Ana Builder" });
    await user.click(role);
    await user.click(screen.getByRole("option", { name: "Viewer" }));
    await waitFor(() =>
      expect(collaborationActions.updateProjectCollaboratorRole).toHaveBeenCalledWith({
        projectId: "project-1",
        userId: "user-2",
        role: "viewer",
      }),
    );

    await user.click(screen.getByRole("button", { name: "Remove Ana Builder from project" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Remove Ana Builder from this project?" });
    expect(within(dialog).getByText("Client Option")).toBeInTheDocument();
    expect(collaborationActions.previewProjectCollaboratorRemoval).toHaveBeenCalledWith({
      projectId: "project-1",
      userId: "user-2",
    });
    const retainEstimateAccess = within(dialog).getByRole("radio", {
      name: "Remove project access only and retain direct estimate access",
    });
    await waitFor(() => expect(retainEstimateAccess).toBeEnabled());
    await user.click(retainEstimateAccess);
    await waitFor(() => expect(retainEstimateAccess).toBeChecked());
    await user.click(within(dialog).getByRole("button", { name: "Remove access" }));
    await waitFor(() =>
      expect(collaborationActions.removeProjectCollaborator).toHaveBeenCalledWith({
        projectId: "project-1",
        removalMode: "retain_sheet_grants",
        userId: "user-2",
      }),
    );
  });

  it("changes a direct estimate grant through the sheet-scoped command", async () => {
    const user = userEvent.setup();
    renderPanel();

    const role = screen.getByRole("combobox", { name: "Direct estimate role for Ana Builder on Client Option" });
    await user.click(role);
    await user.click(screen.getByRole("option", { name: "Viewer" }));

    await waitFor(() =>
      expect(collaborationActions.updateEstimateSheetCollaboratorRole).toHaveBeenCalledWith({
        projectId: "project-1",
        estimateId: "estimate-2",
        userId: "user-2",
        role: "viewer",
      }),
    );
  });

  it("lets a direct restricted-sheet manager change only that sheet's direct grants", async () => {
    const user = userEvent.setup();
    const sheetOnlyManagerSummary: ProjectCollaborationSummary = {
      ...summary,
      currentUserId: "user-3",
      currentUserRole: "viewer",
      canManageAccess: false,
      eligibleProjectMemberCandidates: undefined,
      pendingInvitations: [],
      estimateSheets: [
        {
          estimateId: "estimate-3",
          sheetCode: "E-3",
          name: "Restricted Sheet",
          accessMode: "restricted",
          overrideCount: 2,
          canManageAccess: true,
          currentUserRole: "admin",
          members: [
            {
              id: "user-2",
              displayName: "Ana Builder",
              email: "ana@example.test",
              avatarUrl: null,
              role: "editor",
              source: "sheet",
              online: false,
              estimateId: "estimate-3",
            },
            {
              id: "user-3",
              displayName: "Sam Sheet",
              email: "sam@example.test",
              avatarUrl: null,
              role: "admin",
              source: "sheet",
              online: false,
              estimateId: "estimate-3",
            },
          ],
        },
      ],
    };
    renderPanel(sheetOnlyManagerSummary);

    expect(screen.queryByText("Direct project access")).not.toBeInTheDocument();
    const role = screen.getByRole("combobox", {
      name: "Direct estimate role for Ana Builder on Restricted Sheet",
    });
    await user.click(role);
    await user.click(screen.getByRole("option", { name: "Viewer" }));

    await waitFor(() =>
      expect(collaborationActions.updateEstimateSheetCollaboratorRole).toHaveBeenCalledWith({
        projectId: "project-1",
        estimateId: "estimate-3",
        userId: "user-2",
        role: "viewer",
      }),
    );
  });

  it("confirms before removing a sheet-specific member", async () => {
    const user = userEvent.setup();
    const { container } = renderPanel();
    const clientOption = sheetRow(container, "estimate-2");

    await user.click(within(clientOption).getByRole("button", { name: "Remove Ana Builder from Client Option" }));

    const dialog = await screen.findByRole("alertdialog", { name: "Remove Ana Builder from Client Option?" });
    expect(within(dialog).getByText(/After removal, Workspace editor access remains/)).toBeInTheDocument();
    expect(collaborationActions.previewEstimateSheetCollaboratorRemoval).toHaveBeenCalledWith({
      projectId: "project-1",
      estimateId: "estimate-2",
      userId: "user-2",
    });
    await user.click(within(dialog).getByRole("button", { name: "Remove" }));

    await waitFor(() =>
      expect(collaborationActions.removeEstimateSheetCollaborator).toHaveBeenCalledWith({
        projectId: "project-1",
        estimateId: "estimate-2",
        userId: "user-2",
      }),
    );
  });
});
