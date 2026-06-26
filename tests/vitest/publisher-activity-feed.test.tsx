import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PublisherActivityFeed } from "@/components/workshop/publisher/PublisherActivityFeed";
import { loadPublisherWorkspaceActivity } from "@/lib/publisher/activity-actions";

vi.mock("@/lib/publisher/activity-actions", () => ({
  loadPublisherWorkspaceActivity: vi.fn(),
}));

describe("PublisherActivityFeed", () => {
  beforeEach(() => {
    vi.mocked(loadPublisherWorkspaceActivity).mockReset();
  });

  it("loads project-scoped Publisher activity through the workspace feed action", async () => {
    vi.mocked(loadPublisherWorkspaceActivity).mockResolvedValueOnce({
      activities: [
        {
          id: "activity-1",
          source: "share",
          audience: "owner",
          visibility: "owner",
          action: "viewed",
          occurredAt: "2026-06-26T00:00:00.000Z",
          actor: { kind: "client", displayName: "Client", isSafeForClient: true },
          target: { kind: "proposal", label: "Proposal" },
          title: "Client viewed the proposal.",
          facts: [{ label: "Project", value: "Lewis Residence" }],
        },
      ],
      hasMore: false,
      partial: true,
      unavailableSources: ["estimate_sheet_events"],
    });

    render(<PublisherActivityFeed projectId="11111111-1111-4111-8111-111111111111" />);

    await waitFor(() => expect(screen.getByText("Client viewed the proposal.")).toBeInTheDocument());
    expect(loadPublisherWorkspaceActivity).toHaveBeenCalledWith({
      cursor: null,
      limit: 50,
      projectId: "11111111-1111-4111-8111-111111111111",
    });
    expect(screen.getByRole("feed", { name: "Publisher project activity feed" })).toBeInTheDocument();
    expect(screen.getByText(/Partial activity: estimate_sheet_events unavailable\./)).toBeInTheDocument();
    expect(screen.getByText("Publisher activity refreshes when you reopen this tab. Use Refresh for the latest.")).toBeInTheDocument();
  });
});
