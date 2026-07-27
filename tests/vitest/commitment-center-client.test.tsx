import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CommitmentCenterClient } from "@/components/workshop/publisher/CommitmentCenterClient";
import type { WorkspaceCommitmentCenter } from "@/lib/publisher/commitment-center-repository";

const data: WorkspaceCommitmentCenter = {
  decisions: [{
    decision: "approved",
    id: "decision-1",
    issueNumber: 2,
    portalId: "portal-1",
    portalName: "Owner approvals",
    projectId: "project-1",
    projectName: "Civic Center",
    signerName: "Morgan Client",
    submittedAt: "2026-07-26T11:00:00.000Z",
    versionLabel: "Proposal v2",
  }],
  generatedAt: "2026-07-26T12:00:00.000Z",
  portals: [{
    access: { passwordRequired: true, portalStatus: "live" },
    activeBaseline: {
      baselineNumber: 1,
      currencyCode: "USD",
      establishedAt: "2026-07-25T09:00:00.000Z",
      totalMinorUnits: 250000,
      versionLabel: "Approved v1",
    },
    audience: "client",
    canManagePortal: true,
    currentDecisions: { approved: 1, changesRequested: 0, declined: 0, total: 1 },
    delivery: { dead: 0, delivered: 2, latestState: "delivered", pending: 0 },
    latestEvent: {
      eventType: "issue.published",
      occurredAt: "2026-07-26T10:00:00.000Z",
      title: "Proposal v2 issued",
    },
    nextAction: {
      href: "/workshop/projects/project-1/timeline?portal=portal-1&source=change_request",
      kind: "timeline",
      label: "Assess 1 open request",
      priority: "attention",
    },
    openRequests: 1,
    pendingIssue: {
      issueNumber: 2,
      issuedAt: "2026-07-26T10:00:00.000Z",
      status: "under_review",
      versionLabel: "Proposal v2",
    },
    portal: { id: "portal-1", isPrimary: true, name: "Owner approvals", purpose: null, status: "live" },
    project: { code: "A-100", id: "project-1", name: "Civic Center" },
    recipients: { active: 2, invited: 0, requiredApprovers: 1, total: 2, unverified: 0 },
    waitingDiscussions: 0,
  }],
  requests: [{
    id: "request-1",
    portalId: "portal-1",
    portalName: "Owner approvals",
    projectId: "project-1",
    projectName: "Civic Center",
    requestCode: "CR-004",
    requestedAt: "2026-07-26T08:00:00.000Z",
    status: "under_assessment",
    title: "Revise lobby finishes",
  }],
  summary: { actionRequired: 1, activeBaselines: 1, openRequests: 1, portals: 1, waitingDiscussions: 0 },
  truncated: false,
};

describe("Commitment Center client", () => {
  it("switches among all modern global views without legacy authoring", () => {
    render(<CommitmentCenterClient initialData={data} />);

    expect(screen.getByRole("heading", { name: "Commitment Center" })).toBeInTheDocument();
    expect(screen.getByText("Assess 1 open request")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Portals" }));
    expect(screen.getByText("Approved v1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Timeline" })).toHaveAttribute("href", "/workshop/projects/project-1/timeline?portal=portal-1");

    fireEvent.click(screen.getByRole("tab", { name: "Requests" }));
    expect(screen.getByText("Revise lobby finishes")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Decisions" }));
    expect(screen.getByText(/Morgan Client/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Access / delivery" }));
    expect(screen.getByText((_, element) =>
      element?.tagName === "TD" && element.textContent?.includes("2 active") === true,
    )).toBeInTheDocument();
    expect(screen.queryByText("Share Wizard")).not.toBeInTheDocument();
  });
});
