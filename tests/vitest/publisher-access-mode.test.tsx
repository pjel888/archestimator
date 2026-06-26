import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { PublisherProjectMembersPanel } from "@/components/workshop/publisher/PublisherProjectMembersPanel";
import type { ProjectCollaborationSummary } from "@/lib/collaboration/types";

const collaborationActions = vi.hoisted(() => ({
  inviteEstimateSheetCollaborator: vi.fn(),
  removeEstimateSheetCollaborator: vi.fn(),
  setEstimateSheetAccessMode: vi.fn(),
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
      online: true,
    },
    {
      id: "user-2",
      displayName: "Ana Builder",
      email: "ana@example.test",
      avatarUrl: null,
      role: "editor",
      source: "project",
      online: false,
    },
    {
      id: "user-3",
      displayName: "Sam Sheet",
      email: "sam@example.test",
      avatarUrl: null,
      role: "viewer",
      source: "sheet",
      online: false,
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
    collaborationActions.inviteEstimateSheetCollaborator.mockResolvedValue({
      ok: true,
      message: "Estimate invite email sent.",
    });
    collaborationActions.removeEstimateSheetCollaborator.mockResolvedValue({
      ok: true,
      message: "Estimate-specific access removed.",
    });
    collaborationActions.setEstimateSheetAccessMode.mockResolvedValue({
      ok: true,
      message: "Estimate access updated.",
    });
    summaryActionMocks.fetchProjectCollaborationSummary.mockResolvedValue(summary);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders project members, sheet modes, and sheet-specific member rows", () => {
    renderPanel();

    expect(screen.getByText("Philip Lewis")).toBeInTheDocument();
    expect(screen.getAllByText("Ana Builder")).toHaveLength(2);
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

  it("confirms before removing a sheet-specific member", async () => {
    const user = userEvent.setup();
    const { container } = renderPanel();
    const clientOption = sheetRow(container, "estimate-2");

    await user.click(within(clientOption).getByRole("button", { name: "Remove Ana Builder from Client Option" }));

    const dialog = screen.getByRole("alertdialog", { name: "Remove Ana Builder from Client Option?" });
    expect(within(dialog).getByText(/They will lose sheet-specific access/)).toBeInTheDocument();
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
