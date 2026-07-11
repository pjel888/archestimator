import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigationMocks = vi.hoisted(() => ({
  pathname: "/workshop/projects/11111111-1111-4111-8111-111111111111/activity",
  refresh: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationMocks.pathname,
  useRouter: () => ({
    refresh: navigationMocks.refresh,
    replace: navigationMocks.replace,
  }),
}));

import type { ActivityViewModel } from "@/lib/activity";
import { ProjectActivityClient } from "@/components/workshop/project-activity/ProjectActivityClient";
import type { ProjectActivityFeedPage } from "@/lib/repositories/project-activity-feed-repository";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const CURRENT_USER_ID = "22222222-2222-4222-8222-222222222222";

function activity(overrides: Partial<ActivityViewModel> = {}): ActivityViewModel {
  return {
    id: "activity-1",
    source: "estimate",
    audience: "owner",
    visibility: "owner",
    action: "changed",
    occurredAt: "2026-06-28T09:00:00.000Z",
    actor: {
      id: CURRENT_USER_ID,
      kind: "user",
      displayName: "Philip Lewis",
      isSafeForClient: false,
    },
    target: {
      id: "target-1",
      kind: "estimate",
      label: "Main Estimate",
    },
    title: "Philip Lewis updated Main Estimate.",
    summary: "Updated quantity.",
    raw: { id: "activity-1", eventType: "row_updated" },
    ...overrides,
  };
}

function page(overrides: Partial<ProjectActivityFeedPage> = {}): ProjectActivityFeedPage {
  const items = overrides.items ?? [activity()];
  return {
    items,
    nextCursor: null,
    partial: false,
    unavailableSources: [],
    counts: {
      loadedCount: items.length,
      filteredTotalCount: items.length,
      scopeTotalCount: items.length,
    },
    ...overrides,
  };
}

function renderClient(props: Partial<Parameters<typeof ProjectActivityClient>[0]> = {}) {
  return render(
    <ProjectActivityClient
      projectId={PROJECT_ID}
      projectName="Lewis Residence"
      currentUserId={CURRENT_USER_ID}
      canEdit
      initialState={{ scope: { kind: "whole-project" }, actions: [], actor: null, client: null }}
      initialData={page()}
      estimates={[]}
      members={[{ id: CURRENT_USER_ID, label: "Philip Lewis" }]}
      recipients={[]}
      {...props}
    />,
  );
}

describe("ProjectActivityClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the editor-only state inside the activity surface", () => {
    renderClient({ canEdit: false });

    expect(screen.getByRole("heading", { name: "Activity is editor-only" })).toBeVisible();
    expect(screen.getByText(/activity history is only available to editors/i)).toBeVisible();
  });

  it("renders a generic initial-load error with retry", async () => {
    const user = userEvent.setup();
    renderClient({
      initialLoadFailed: true,
      initialData: page({ items: [], counts: { loadedCount: 0, filteredTotalCount: 0, scopeTotalCount: 0 } }),
    });

    expect(screen.getByRole("heading", { name: "Activity could not be loaded" })).toBeVisible();
    expect(screen.queryByText(/supabase|stack|error:/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /retry/i }));

    expect(navigationMocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("loads more through the authenticated cursor endpoint without changing the canonical URL", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(page({
        items: [activity({ id: "activity-2", title: "Maria Santos viewed the proposal.", source: "share", action: "viewed", raw: { id: "activity-2", eventType: "open" } })],
        nextCursor: null,
        counts: { loadedCount: 1, filteredTotalCount: 2, scopeTotalCount: 2 },
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    renderClient({
      initialData: page({
        items: [activity()],
        nextCursor: "cursor-1",
        counts: { loadedCount: 1, filteredTotalCount: 2, scopeTotalCount: 2 },
      }),
    });

    await user.click(screen.getByRole("button", { name: /load more/i }));

    await screen.findByText("Maria Santos viewed the proposal.");
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/projects/${PROJECT_ID}/activity?cursor=cursor-1&limit=20&includeCounts=true`,
      expect.objectContaining({ method: "GET" }),
    );
    expect(navigationMocks.replace).not.toHaveBeenCalledWith(expect.stringContaining("cursor"), expect.anything());
    fetchMock.mockRestore();
  });

  it("renders activity as a grouped ledger and keeps action filters in the filter panel", async () => {
    const user = userEvent.setup();
    renderClient({
      initialData: page({
        items: [
          activity(),
          activity({
            id: "activity-2",
            source: "share",
            action: "viewed",
            occurredAt: "2026-06-27T09:00:00.000Z",
            title: "Maria Santos viewed the proposal.",
            actor: { kind: "recipient", displayName: "Maria Santos", isSafeForClient: true },
            target: { kind: "proposal", label: "Proposal" },
            raw: { id: "activity-2", eventType: "open" },
          }),
        ],
        counts: { loadedCount: 2, filteredTotalCount: 2, scopeTotalCount: 2 },
      }),
    });

    const ledger = screen.getByRole("feed", { name: "Project activity ledger" });
    expect(within(ledger).getByText("Jun 28, 2026")).toBeVisible();
    expect(within(ledger).getByText("Jun 27, 2026")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Created" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /filters/i }));
    const filters = screen.getByRole("region", { name: "Activity filters" });
    expect(filters).toHaveClass("absolute");
    expect(filters).toHaveClass("z-20");
    await user.click(screen.getByRole("button", { name: "Created" }));

    expect(navigationMocks.replace).toHaveBeenCalledWith(
      `${navigationMocks.pathname}?action=created`,
      { scroll: false },
    );
  });

  it("reserves the same time, detail, and status slots for every activity row", () => {
    renderClient({
      initialData: page({
        items: [
          activity({
            id: "estimate-activity",
            source: "estimate",
            facts: [{ label: "Project", value: "New Area" }],
            badges: ["System"],
          }),
          activity({
            id: "system-activity",
            source: "system",
            action: "changed",
            occurredAt: "2026-06-28T08:56:00.000Z",
            title: "Unknown user updated project location.",
            summary: "",
            facts: [],
            actor: { kind: "system", displayName: "Unknown user", isSafeForClient: false },
            target: { kind: "project", label: "Project" },
            badges: [],
          }),
        ],
        counts: { loadedCount: 2, filteredTotalCount: 2, scopeTotalCount: 2 },
      }),
    });

    const rows = screen.getAllByTestId("activity-row");
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(within(row).getByTestId("activity-time-source")).toHaveClass("grid");
      expect(within(row).getAllByTestId("activity-detail-slot")).toHaveLength(2);
      expect(within(row).getAllByTestId("activity-status-slot")).toHaveLength(2);
    }
    expect(screen.getByTestId("activity-source-estimate-activity")).toHaveTextContent("Estimate");
    expect(screen.getByTestId("activity-source-system-activity")).toHaveTextContent("System");
    expect(within(rows[1]).getByTestId("activity-status-column")).toHaveTextContent("—");
  });

  it("refresh clears appended rows and transient load errors", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(page({
        items: [activity({ id: "activity-2", title: "Maria Santos viewed the proposal.", source: "share", action: "viewed", raw: { id: "activity-2", eventType: "open" } })],
        nextCursor: null,
        counts: { loadedCount: 1, filteredTotalCount: 2, scopeTotalCount: 2 },
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    renderClient({
      initialData: page({
        items: [activity()],
        nextCursor: "cursor-1",
        counts: { loadedCount: 1, filteredTotalCount: 2, scopeTotalCount: 2 },
      }),
    });

    await user.click(screen.getByRole("button", { name: /load more/i }));
    await screen.findByText("Maria Santos viewed the proposal.");

    await user.click(screen.getByRole("button", { name: /refresh/i }));

    await waitFor(() => expect(screen.queryByText("Maria Santos viewed the proposal.")).not.toBeInTheDocument());
    expect(navigationMocks.refresh).toHaveBeenCalledTimes(1);
    fetchMock.mockRestore();
  });

  it("renders distinct empty, no-match, and partial states without leaking recipient emails", () => {
    const { rerender } = renderClient({
      initialData: page({
        items: [],
        counts: { loadedCount: 0, filteredTotalCount: 0, scopeTotalCount: 0 },
      }),
    });

    expect(screen.getByRole("heading", { name: "No activity yet" })).toBeVisible();

    rerender(
      <ProjectActivityClient
        projectId={PROJECT_ID}
        projectName="Lewis Residence"
        currentUserId={CURRENT_USER_ID}
        canEdit
        initialState={{ scope: { kind: "whole-project" }, actions: ["commented"], actor: null, client: null }}
        initialData={page({
          items: [],
          counts: { loadedCount: 0, filteredTotalCount: 0, scopeTotalCount: 4 },
          partial: true,
          unavailableSources: ["shared_link_comments"],
        })}
        estimates={[]}
        members={[]}
        recipients={[{ id: "33333333-3333-4333-8333-333333333333", label: "Maria Santos (1)" }]}
      />,
    );

    expect(screen.getByRole("heading", { name: "No activity matches these filters" })).toBeVisible();
    expect(screen.getByText(/some activity sources are unavailable/i)).toBeVisible();
    expect(document.body.textContent).not.toMatch(/@/);
  });
});
