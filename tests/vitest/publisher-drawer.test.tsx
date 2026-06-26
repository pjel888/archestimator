import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PublisherDrawer } from "@/components/workshop/publisher/PublisherDrawer";
import type { ProjectPublicationRosterRow } from "@/lib/publisher/roster-repository";

const drawerHookMocks = vi.hoisted(() => ({
  republishMutation: {
    mutateAsync: vi.fn(),
  },
  revokeMutation: {
    mutateAsync: vi.fn(),
  },
  rotateMutation: {
    mutateAsync: vi.fn(),
  },
  refetch: vi.fn(),
}));

vi.mock("@/components/workshop/publisher/usePublisherDrawer", () => ({
  usePublisherDrawer: () => ({
    data: {
      currentUserEmail: "owner@example.test",
      estimateSheets: [
        { id: "estimate-a", name: "Base", sheetCode: "E-1" },
        { id: "estimate-b", name: "Upgrade", sheetCode: "E-2" },
      ],
      summary: {
        canManagePublication: true,
        clientLinkPath: "/share/active-token",
        expiresAt: null,
        latestActivityAt: "2026-06-25T00:00:00.000Z",
        latestOpenedAt: "2026-06-24T00:00:00.000Z",
        latestRecipientOpen: null,
        locationVisibility: "locality",
        openCount: 3,
        passwordRequired: false,
        projectId: "project-active",
        publicationId: "pub-active",
        publishedAt: "2026-06-20T00:00:00.000Z",
        selectedEstimateCount: 1,
        selectedEstimateIds: ["estimate-a"],
        snapshotVersion: 2,
        staleSnapshotWarning: null,
        status: "published",
        tokenCopyAvailable: true,
        workspaceId: "workspace-1",
      },
    },
    isMutating: false,
    query: {
      isError: false,
      refetch: drawerHookMocks.refetch,
    },
    republishMutation: drawerHookMocks.republishMutation,
    revokeMutation: drawerHookMocks.revokeMutation,
    rotateMutation: drawerHookMocks.rotateMutation,
  }),
}));

vi.mock("@/components/workshop/publisher/PublisherActivityFeed", () => ({
  PublisherActivityFeed: ({ projectId }: { projectId: string | null }) => (
    <div data-testid="publisher-activity-feed">Activity for {projectId}</div>
  ),
}));

const row: ProjectPublicationRosterRow = {
  canManagePublication: true,
  clientLinkPath: "/share/active-token",
  clientName: "Lewis Family",
  currentUserRole: "owner",
  expiresAt: null,
  latestActivityAt: "2026-06-25T00:00:00.000Z",
  latestOpenedAt: "2026-06-24T00:00:00.000Z",
  linkUnavailableReason: null,
  location: "Makati",
  openCount: 3,
  passwordRequired: false,
  projectCode: "LR-001",
  projectId: "project-active",
  projectName: "Lewis Residence",
  publicationId: "pub-active",
  publishedAt: "2026-06-20T00:00:00.000Z",
  recipientCount: 2,
  selectedEstimateCount: 1,
  selectedEstimateIds: ["estimate-a"],
  snapshotVersion: 2,
  staleSnapshotWarning: null,
  status: "published",
  tokenCopyAvailable: true,
  workspaceId: "workspace-1",
};

describe("PublisherDrawer", () => {
  beforeEach(() => {
    drawerHookMocks.republishMutation.mutateAsync.mockReset();
    drawerHookMocks.revokeMutation.mutateAsync.mockReset();
    drawerHookMocks.rotateMutation.mutateAsync.mockReset();
    drawerHookMocks.refetch.mockReset();
    drawerHookMocks.refetch.mockResolvedValue(undefined);
  });

  it("rejects duplicate publication mutations with a synchronous drawer latch", async () => {
    let resolveRepublish: (value: { clientLinkPath: string; message: string; ok: true }) => void = () => undefined;
    drawerHookMocks.republishMutation.mutateAsync.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRepublish = resolve;
        }),
    );

    render(<PublisherDrawer open row={row} onOpenChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("tab", { name: "Sheets" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Upgrade/ }));
    const updateButton = screen.getByRole("button", { name: "Update shared page" });

    fireEvent.click(updateButton);
    fireEvent.click(updateButton);

    expect(drawerHookMocks.republishMutation.mutateAsync).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Finish the current publication action before starting another.",
    );

    resolveRepublish({
      clientLinkPath: "/share/active-token",
      message: "Shared page updated.",
      ok: true,
    });
    await waitFor(() => {
      expect(drawerHookMocks.refetch).toHaveBeenCalledTimes(1);
    });
  });
});
