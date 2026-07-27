import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProjectTimelineClient } from "@/components/workshop/project-timeline/ProjectTimelineClient";
import type { ProjectTimelinePage } from "@/lib/project-ledger/timeline-repository";

const data: ProjectTimelinePage = {
  context: {
    activeBaseline: { baselineNumber: 1, currencyCode: "PHP", establishedAt: "2026-07-26T00:00:00.000Z", issueNumber: 1, totalMinorUnits: 125_000, versionLabel: "Issue 1" },
    counts: { activeFiles: 3, openRequests: 2, totalEvents: 1, waitingDiscussions: 4 },
    currentIssue: { currencyCode: "PHP", issueNumber: 2, issuedAt: "2026-07-27T01:00:00.000Z", status: "under_review", total: 1400, versionLabel: "Issue 2" },
    portals: [{ audienceKind: "client", id: "portal-1", isPrimary: true, name: "Client", status: "live" }],
    selectedPortalId: "portal-1",
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

describe("ProjectTimelineClient", () => {
  it("keeps commitment actions and raw audit access together", () => {
    render(<ProjectTimelineClient initialData={data} projectId="project-1" projectName="Riverside" />);

    expect(screen.getByRole("heading", { name: "Riverside timeline" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Compose issue" })).toHaveAttribute("href", "/workshop/projects/project-1/client-portals/compose");
    expect(screen.getAllByRole("link", { name: "Raw Activity" })[0]).toHaveAttribute("href", "/workshop/projects/project-1/activity");
    expect(screen.getByText(/Root request CR-004/)).toBeInTheDocument();
    expect(screen.getByText("Client visible")).toBeInTheDocument();
  });
});
