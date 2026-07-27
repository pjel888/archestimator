import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProjectTimelineClient } from "@/components/workshop/project-timeline/ProjectTimelineClient";
import type { ProjectTimelinePage } from "@/lib/project-ledger/timeline-repository";

const data: ProjectTimelinePage = {
  context: {
    activeBaseline: { approvals: { approved: 1, names: ["Morgan Client"], required: 1 }, baselineNumber: 1, currencyCode: "PHP", establishedAt: "2026-07-26T00:00:00.000Z", issueNumber: 1, totalMinorUnits: 125_000, versionLabel: "Issue 1" },
    counts: { activeFiles: 3, openRequests: 2, totalEvents: 1, waitingDiscussions: 4 },
    currentPortal: { id: "portal-1", isPrimary: true, name: "Client" },
    currentIssue: { currencyCode: "PHP", issueNumber: 2, issuedAt: "2026-07-27T01:00:00.000Z", status: "under_review", total: 1400, unresolvedItems: 2, versionLabel: "Issue 2" },
    latestOfficialEvent: { eventType: "issue.issued", occurredAt: "2026-07-27T02:00:00.000Z", title: "Issue 2 published" },
    portals: [
      { audienceKind: "client", id: "portal-1", isPrimary: true, name: "Client", status: "live" },
      { audienceKind: "contractor", id: "portal-2", isPrimary: false, name: "Contractor", status: "ready" },
    ],
    selectedPortalId: null,
  },
  events: [{
    actor: { domainRole: "quantity_surveyor", name: "Maria", permissionRole: "owner", type: "internal_user" },
    eventType: "issue.issued",
    exposure: { count: 1, statuses: ["visible"] },
    href: "/workshop/projects/project-1/client-portals?portal=portal-1",
    id: "event-1",
    metadata: {},
    occurredAt: "2026-07-27T02:00:00.000Z",
    portal: { id: "portal-1", name: "Client" },
    rootRequest: { code: "CR-004", id: "request-4", title: "Revise millwork" },
    source: { id: "issue-2", type: "issue", versionId: null },
    summary: "Issued for formal review.",
    title: "Issue 2 published",
  }],
  hasMore: false,
  nextCursor: null,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

function response(page: ProjectTimelinePage) {
  return { json: async () => page, ok: true } as Response;
}

function pageFor(portalId: string, title: string): ProjectTimelinePage {
  return {
    ...data,
    context: { ...data.context, selectedPortalId: portalId },
    events: [{
      ...data.events[0],
      id: `event-${portalId}`,
      portal: { id: portalId, name: portalId === "portal-1" ? "Client" : "Contractor" },
      title,
    }],
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ProjectTimelineClient", () => {
  it("keeps commitment actions and raw audit access together", () => {
    render(<ProjectTimelineClient initialData={data} projectId="project-1" projectName="Riverside" />);

    expect(screen.getByRole("heading", { name: "Riverside timeline" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Compose issue" })).toHaveAttribute("href", "/workshop/projects/project-1/client-portals/compose");
    expect(screen.getAllByRole("link", { name: "Raw Activity" })[0]).toHaveAttribute("href", "/workshop/projects/project-1/activity");
    expect(screen.getByText(/Root request CR-004/)).toBeInTheDocument();
    expect(screen.getByText("Client visible")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Scope" })).toHaveValue("");
    expect(screen.getByRole("option", { name: "All project activity" })).toBeInTheDocument();
    expect(screen.getByText("1/1")).toBeInTheDocument();
    expect(screen.getByText("Morgan Client")).toBeInTheDocument();
    expect(screen.getByText("Explicitly carried in the current issue")).toBeInTheDocument();
  });

  it("ignores an older portal response that resolves after the latest selection", async () => {
    const first = deferred<Response>();
    const second = deferred<Response>();
    const fetchMock = vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    vi.stubGlobal("fetch", fetchMock);
    render(<ProjectTimelineClient initialData={data} projectId="project-1" projectName="Riverside" />);

    const scope = screen.getByRole("combobox", { name: "Scope" });
    fireEvent.change(scope, { target: { value: "portal-1" } });
    fireEvent.change(scope, { target: { value: "portal-2" } });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    second.resolve(response(pageFor("portal-2", "Contractor response")));
    expect(await screen.findByText("Contractor response")).toBeInTheDocument();

    await act(async () => {
      first.resolve(response(pageFor("portal-1", "Stale client response")));
      await first.promise;
    });
    expect(screen.queryByText("Stale client response")).not.toBeInTheDocument();
    expect(screen.getByText("Contractor response")).toBeInTheDocument();
  });
});
