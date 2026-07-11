import { useState } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop/projects/11111111-1111-4111-8111-111111111111/activity",
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
}));

import { ActivityHistoryModal } from "@/components/workshop/estimate-sheet/activity-history";
import { DEFAULT_ACTIVITY_FILTERS, type ActivityScopeTreeItem } from "@/components/workshop/estimate-sheet/activity-history-model";
import { ProjectActivityClient } from "@/components/workshop/project-activity/ProjectActivityClient";
import SharedLinkActivityFeed from "@/components/share/SharedLinkActivityFeed";
import type { ActivityViewModel } from "@/lib/activity";
import type { ProjectActivityFeedPage } from "@/lib/repositories/project-activity-feed-repository";

const projectId = "11111111-1111-4111-8111-111111111111";
const currentUserId = "22222222-2222-4222-8222-222222222222";

const scopeItems: ActivityScopeTreeItem[] = [
  {
    id: "sheet",
    scope: { mode: "sheet" },
    depth: 0,
    kind: "sheet",
    label: "Main estimate",
    eyebrow: "Estimate",
    total: null,
    row: null,
  },
  {
    id: "area",
    scope: { mode: "node", nodeId: "area", includeDescendants: true },
    depth: 1,
    kind: "area",
    label: "Living area",
    eyebrow: "Area",
    total: null,
    row: null,
  },
];

function ActivityDialogHarness() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open activity history</button>
      {open ? (
        <ActivityHistoryModal
          scope={{ mode: "sheet" }}
          scopeItems={scopeItems}
          selectedScopeItem={scopeItems[0]}
          metadata={null}
          historyData={null}
          activityFilters={DEFAULT_ACTIVITY_FILTERS}
          isHistoryLoading={false}
          isHistoryLoadingMore={false}
          historyError=""
          onActivityFiltersChange={vi.fn()}
          onActivityFiltersReset={vi.fn()}
          onClose={() => setOpen(false)}
          onRetry={vi.fn()}
          onLoadMore={vi.fn()}
          onScopeSelect={vi.fn()}
        />
      ) : null}
    </>
  );
}

function activity(): ActivityViewModel {
  return {
    id: "activity-1",
    source: "estimate",
    audience: "owner",
    visibility: "owner",
    action: "changed",
    occurredAt: "2026-06-28T09:00:00.000Z",
    actor: { id: currentUserId, kind: "user", displayName: "Philip Lewis", isSafeForClient: false },
    target: { id: "estimate-1", kind: "estimate", label: "Main estimate" },
    title: "Philip updated Main estimate.",
    summary: "Updated quantity.",
  };
}

function projectPage(): ProjectActivityFeedPage {
  return {
    items: [activity()],
    nextCursor: null,
    partial: false,
    unavailableSources: [],
    counts: { loadedCount: 1, filteredTotalCount: 1, scopeTotalCount: 1 },
  };
}

describe("activity accessibility", () => {
  it("moves focus into the modal, supports roving tree navigation, and returns focus to its opener", async () => {
    render(<ActivityDialogHarness />);

    const opener = screen.getByRole("button", { name: "Open activity history" });
    opener.focus();
    fireEvent.click(opener);

    const dialog = screen.getByRole("dialog", { name: "Activity History" });
    const close = within(dialog).getByRole("button", { name: "Close Activity History" });
    await waitFor(() => expect(document.activeElement).toBe(close));

    const treeItems = within(dialog).getAllByRole("treeitem");
    expect(treeItems[0]).toHaveAttribute("tabindex", "0");
    expect(treeItems[1]).toHaveAttribute("tabindex", "-1");
    treeItems[0].focus();
    fireEvent.keyDown(treeItems[0], { key: "ArrowDown" });
    expect(document.activeElement).toBe(treeItems[1]);
    fireEvent.keyDown(treeItems[1], { key: "ArrowUp" });
    expect(document.activeElement).toBe(treeItems[0]);

    fireEvent.click(close);
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it("exposes project ledger headers and cells programmatically", () => {
    render(
      <ProjectActivityClient
        projectId={projectId}
        projectName="Lewis Residence"
        currentUserId={currentUserId}
        canEdit
        initialState={{ scope: { kind: "whole-project" }, actions: [], actor: null, client: null }}
        initialData={projectPage()}
        estimates={[]}
        members={[]}
        recipients={[]}
      />,
    );

    const ledger = screen.getByRole("feed", { name: "Project activity ledger" });
    expect(within(ledger).getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "Time & Source",
      "Actor",
      "Event",
      "Details",
      "Status",
    ]);
    expect(within(ledger).getAllByRole("cell")).toHaveLength(5);
  });

  it("announces partial shared-link activity and keeps refresh at the minimum target height", async () => {
    render(
      <SharedLinkActivityFeed
        loadActivity={async () => ({
          activities: [],
          hasMore: false,
          partial: true,
          unavailableSources: ["comments"],
        })}
      />,
    );

    const partialNotice = await screen.findByText(/partial activity/i, { selector: '[role="status"]' });
    expect(partialNotice).toHaveTextContent("comments unavailable");
    expect(screen.getByRole("button", { name: "Refresh" })).toHaveClass("h-6");
  });
});
