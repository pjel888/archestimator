import { readFileSync } from "node:fs";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { ProjectTeamspaceHeader } from "@/components/workshop/ProjectTeamspaceHeader";
import { ToastProvider } from "@/components/ui/toast";
import type { ProjectCollaborationSummary } from "@/lib/collaboration/types";

vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop/projects/project-1",
}));

// Avoid importing the server repository chain through the query's queryFn; the
// summary is seeded via initialData so the action never runs in these tests.
vi.mock("@/lib/collaboration/summary-actions", () => ({
  fetchProjectCollaborationSummary: vi.fn(async () => null),
}));

// Deterministic presence: self (user-1) online; no live socket.
vi.mock("@/hooks/use-project-presence", () => ({
  useProjectPresence: () => ({
    onlineUserIds: new Set(["user-1"]),
    entries: new Map(),
    status: "subscribed",
  }),
}));

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
  currentUserId: "user-1",
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

function renderHeader(props: { summary: ProjectCollaborationSummary }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    );
  }
  return render(<ProjectTeamspaceHeader summary={props.summary} />, { wrapper: Wrapper });
}

async function openShare(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Manage access" }));
  const dialog = screen.getByRole("dialog", { name: "Share" });
  await waitFor(() => expect(dialog).toBeInTheDocument());
  return dialog;
}

describe("ProjectTeamspaceHeader", () => {
  const clipboardWriteText = vi.fn<Clipboard["writeText"]>();

  beforeEach(() => {
    clipboardWriteText.mockClear();
    clipboardWriteText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: clipboardWriteText },
    });
    collaborationActions.copyProjectInviteLink.mockResolvedValue({ ok: true, message: "Copy invite link", invitePath: "/invite/copied" });
    collaborationActions.inviteEstimateSheetCollaborator.mockResolvedValue({ ok: true, message: "Estimate invite email sent." });
    collaborationActions.inviteProjectCollaborator.mockResolvedValue({ ok: true, message: "Invite email sent." });
    collaborationActions.removeProjectCollaborator.mockResolvedValue({ ok: true, message: "Project-specific access removed." });
    collaborationActions.readProjectInviteDeliveryReadiness.mockResolvedValue({
      configured: true,
      message: "Teamspace invite delivery is configured.",
    });
    collaborationActions.resendProjectInviteEmail.mockResolvedValue({ ok: true, message: "Invite email resent." });
    collaborationActions.setEstimateSheetAccessMode.mockResolvedValue({ ok: true, message: "Estimate now inherits project access." });
    collaborationActions.updateProjectCollaboratorRole.mockResolvedValue({ ok: true, message: "Role updated." });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders presence faces in the header instead of a settings gear", () => {
    renderHeader({ summary });

    // The header now shows faces (felt-impact #1), not a lone gear.
    expect(screen.getByRole("button", { name: /Philip Lewis \(you\), Owner/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manage access" })).toBeInTheDocument();
    // No "Teamspace settings" gear/dialog anymore.
    expect(screen.queryByRole("button", { name: "Project teamspaces" })).not.toBeInTheDocument();
  });

  it("opens the Share modal from the manage-access affordance", async () => {
    const user = userEvent.setup();
    renderHeader({ summary });

    const dialog = await openShare(user);
    expect(within(dialog).getByRole("textbox", { name: "Invite by email" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Invite" })).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Role for Ana Builder")).toBeInTheDocument();
    expect(within(dialog).getByText("Estimate access")).toBeInTheDocument();
    expect(within(dialog).getByText("Main Estimate")).toBeInTheDocument();
    expect(within(dialog).getByText("Client Option")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Access mode for Main Estimate")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Copy private link" })).toBeInTheDocument();
    expect(within(dialog).getByText(/Live presence . cursors are enabled/)).toBeInTheDocument();
  });

  it("validates the invite email before calling the server action", async () => {
    const user = userEvent.setup();
    renderHeader({ summary });
    const dialog = await openShare(user);

    const email = within(dialog).getByRole("textbox", { name: "Invite by email" });
    // Invite controls enable once delivery readiness resolves.
    await waitFor(() => expect(email).toBeEnabled());
    await user.type(email, "not-an-email");
    await user.click(within(dialog).getByRole("button", { name: "Invite" }));

    expect(collaborationActions.inviteProjectCollaborator).not.toHaveBeenCalled();
    expect(await within(dialog).findByText("Enter a valid email address.")).toBeInTheDocument();
  });

  it("copies the current project URL and toasts", async () => {
    const user = userEvent.setup();
    // userEvent.setup() installs its own clipboard stub — override it afterwards.
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: clipboardWriteText } });
    renderHeader({ summary });
    const dialog = await openShare(user);

    const shareLink = within(dialog).getByRole("textbox", { name: "Private project link" });
    expect((shareLink as HTMLInputElement).value).toContain("/workshop/projects/project-1");

    await user.click(within(dialog).getByRole("button", { name: "Copy private link" }));
    await waitFor(() =>
      expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining("/workshop/projects/project-1")),
    );
  });

  it("commits a collaborator role change through the shared dropdown and fires the server action", async () => {
    const user = userEvent.setup();
    renderHeader({ summary });

    const dialog = await openShare(user);
    const roleTrigger = within(dialog).getByRole("combobox", { name: "Role for Ana Builder" });
    expect(roleTrigger).toHaveTextContent("Editor");

    await user.click(roleTrigger);
    await user.click(screen.getByRole("option", { name: "Admin" }));

    expect(collaborationActions.updateProjectCollaboratorRole).toHaveBeenCalledWith({
      projectId: "project-1",
      userId: "user-2",
      role: "admin",
    });
    expect(await within(dialog).findByText("Role updated.")).toBeInTheDocument();
  });

  it("commits an estimate access mode change through the shared dropdown", async () => {
    const user = userEvent.setup();
    renderHeader({ summary });

    const dialog = await openShare(user);
    const accessTrigger = within(dialog).getByRole("combobox", { name: "Access mode for Main Estimate" });
    expect(accessTrigger).toHaveTextContent("Inherited");

    await user.click(accessTrigger);
    await user.click(screen.getByRole("option", { name: "Restricted" }));

    expect(collaborationActions.setEstimateSheetAccessMode).toHaveBeenCalledWith({
      projectId: "project-1",
      estimateId: "estimate-1",
      inheritProjectAccess: false,
    });
  });

  it("requires explicit confirmation before removing a project collaborator", async () => {
    const user = userEvent.setup();
    renderHeader({ summary });

    await openShare(user);
    await user.click(screen.getByRole("button", { name: "Remove Ana Builder" }));

    const dialog = screen.getByRole("alertdialog", { name: "Remove Ana Builder?" });
    expect(within(dialog).getByText(/They will lose access to this project/)).toBeInTheDocument();
    expect(within(dialog).getByRole("checkbox", { name: "Notify Ana Builder of removal" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Remove" })).toBeInTheDocument();
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
          expiresAt: "2027-06-01T00:00:00.000Z",
          invitePath: "/invite/token-abc123",
        },
      ],
    };

    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: clipboardWriteText } });
    renderHeader({ summary: summaryWithInvite });
    const dialog = await openShare(user);

    expect(within(dialog).getByText("new.collaborator@example.com")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Resend invite for new.collaborator@example.com" })).toBeInTheDocument();

    const copyInviteButton = within(dialog).getByRole("button", { name: "Copy invite link for new.collaborator@example.com" });
    await waitFor(() => expect(copyInviteButton).toBeEnabled());
    await user.click(copyInviteButton);
    await waitFor(() => expect(clipboardWriteText).toHaveBeenCalled());
  });

  it("disables visible invite controls when invite delivery is not configured", async () => {
    collaborationActions.readProjectInviteDeliveryReadiness.mockResolvedValue({
      configured: false,
      message: "Teamspace invite delivery is disabled until project invite entry and token settings are configured.",
    });
    const user = userEvent.setup();
    renderHeader({ summary });
    const dialog = await openShare(user);

    expect(await within(dialog).findByText(/Teamspace invite delivery is disabled until project invite entry/)).toBeInTheDocument();
    expect(within(dialog).getByRole("textbox", { name: "Invite by email" })).toBeDisabled();
    expect(within(dialog).getByLabelText("Invite role")).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Invite" })).toBeDisabled();
  });

  it("keeps the warning-tone feedback contract in source", () => {
    expect(headerSource).toContain("actionMessageTone");
    expect(headerSource).toContain("isWarningActionMessage");
    expect(headerSource).toContain("share the invite link manually");
    expect(headerSource).toContain("bg-warningSoft");
    expect(headerSource).toContain("text-warning");
  });
});
