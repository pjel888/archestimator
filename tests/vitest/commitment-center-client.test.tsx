import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  reconcile: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/lib/client-portal/composer-actions", () => ({
  reconcileAcceptedClientPortalBaselineAction: mocks.reconcile,
}));

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
  beforeEach(() => {
    mocks.reconcile.mockReset();
    mocks.refresh.mockReset();
  });

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

  it("executes baseline reconciliation against the projected issue destination", async () => {
    mocks.reconcile.mockResolvedValue({ baselineId: "baseline-2" });
    const reconciliationData: WorkspaceCommitmentCenter = {
      ...data,
      portals: [{
        ...data.portals[0]!,
        activeBaseline: null,
        nextAction: {
          issueId: "issue-2",
          kind: "baseline_reconciliation",
          label: "Restore the accepted baseline",
          priority: "urgent",
        },
      }],
    };

    render(<CommitmentCenterClient initialData={reconciliationData} />);
    fireEvent.click(screen.getByRole("button", { name: "Restore the accepted baseline" }));

    await waitFor(() => expect(mocks.reconcile).toHaveBeenCalledWith({
      issueId: "issue-2",
      portalId: "portal-1",
      projectId: "project-1",
    }));
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent("Accepted baseline restored.");
  });
});
