import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProjectTeamAccessPanel } from "@/components/workshop/teamwork/ProjectTeamAccessPanel";
import type { ProjectCollaborationSummary } from "@/lib/collaboration/types";

const presenceMocks = vi.hoisted(() => ({
  useProjectPresence: vi.fn(),
}));

vi.mock("@/components/workshop/publisher/PublisherProjectMembersPanel", () => ({
  PublisherProjectMembersPanel: () => (
    <div data-testid="publisher-compatibility-panel" />
  ),
}));

vi.mock("@/hooks/use-project-presence", () => presenceMocks);

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";

function createSummary(
  source: "project" | "sheet" = "project",
): ProjectCollaborationSummary {
  return {
    projectId: PROJECT_ID,
    workspaceId: "22222222-2222-2222-2222-222222222222",
    currentUserId: "user-a",
    currentUserRole: "viewer",
    canManageAccess: false,
    collaborators: [
      {
        id: "user-a",
        displayName: "A",
        email: null,
        avatarUrl: null,
        role: "viewer",
        source,
        online: false,
      },
    ],
    eligibleProjectMemberCandidates: [],
    pendingInvitations: [],
    estimateSheets: [],
    realtime: {
      privateChannels: true,
      projectChannel: `project:${PROJECT_ID}`,
      estimateChannelPrefix: "estimate:",
      presenceTransport: "presence",
      cursorTransport: "broadcast",
    },
  };
}

function renderPanel(summary: ProjectCollaborationSummary) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <ProjectTeamAccessPanel projectId={PROJECT_ID} initialSummary={summary} />
    </QueryClientProvider>,
  );
  return { queryClient, ...view };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ProjectTeamAccessPanel presence bridge", () => {
  it("activates project presence and overlays it onto the authorized Team summary", async () => {
    presenceMocks.useProjectPresence.mockReturnValue({
      onlineUserIds: new Set(["user-a"]),
      entries: new Map(),
      status: "subscribed",
    });
    const summary = createSummary();
    const { getByTestId, queryClient } = renderPanel(summary);

    expect(getByTestId("publisher-compatibility-panel")).toBeTruthy();
    expect(presenceMocks.useProjectPresence).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: PROJECT_ID,
        currentUser: { id: "user-a" },
        enabled: true,
      }),
    );
    await waitFor(() => {
      const current = queryClient.getQueryData<ProjectCollaborationSummary>([
        "project-collaboration",
        PROJECT_ID,
      ]);
      expect(current?.collaborators[0]?.online).toBe(true);
    });
  });

  it("keeps a sheet-only user off the broader project presence channel", () => {
    presenceMocks.useProjectPresence.mockReturnValue({
      onlineUserIds: new Set<string>(),
      entries: new Map(),
      status: "idle",
    });

    renderPanel(createSummary("sheet"));

    expect(presenceMocks.useProjectPresence).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });
});
