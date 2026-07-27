import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  acceptNarrative: vi.fn(),
  abandon: vi.fn(),
  carryForward: vi.fn(),
  markReady: vi.fn(),
  open: vi.fn(),
  publish: vi.fn(),
  save: vi.fn(),
}));

vi.mock("@/lib/client-portal/issue-draft-actions", () => ({
  acceptClientPortalNarrativeAction: mocks.acceptNarrative,
  abandonClientPortalIssueDraftAction: mocks.abandon,
  markClientPortalIssueDraftReadyAction: mocks.markReady,
  openClientPortalIssueDraftAction: mocks.open,
  saveClientPortalIssueDraftAction: mocks.save,
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("@/lib/client-portal/composer-actions", () => ({ publishClientPortalDraftAction: mocks.publish }));
vi.mock("@/lib/client-portal/publisher-discussion-actions", () => ({ carryForwardClientPortalThreadAction: mocks.carryForward }));

import { IssuePackageComposer } from "@/components/workshop/publisher/IssuePackageComposer";
import type { ClientPortalIssueDraft } from "@/lib/client-portal/issue-draft-repository";

const draft: ClientPortalIssueDraft = {
  abandonedAt: null,
  artifacts: [],
  assumptions: [],
  basedOnBaselineId: null,
  basedOnIssueId: null,
  comparisonIssueId: null,
  createdAt: "2026-07-26T00:00:00.000Z",
  createdBy: "owner_1",
  decisionPolicy: { requiredApprovals: 1, rule: "any_approver", scope: "issue" },
  draftRevision: 2,
  estimates: [],
  exclusions: [],
  id: "draft_1",
  issueKind: "change_order",
  portalId: "portal_1",
  projectId: "project_1",
  publishedAt: null,
  publishedIssueId: null,
  requestedDecision: "formal",
  requests: [],
  revisionNote: null,
  sectionOverrides: { includedSectionIds: ["section_1"] },
  status: "draft",
  unresolvedItems: [],
  updatedAt: "2026-07-26T00:00:00.000Z",
  updatedBy: "owner_1",
  versionLabel: "CO-01",
  workspaceId: "workspace_1",
};

const sources = {
  artifacts: [{ artifactId: "artifact_1", artifactVersionId: "artifact_version_1", contentType: "application/pdf", fileName: "kitchen.pdf", revisionLabel: "B", title: "Kitchen drawing", versionNumber: 2 }],
  baselines: [{ id: "baseline_1", issueLabel: "Accepted issue 1" }],
  estimates: [{ id: "estimate_1", name: "Main estimate", sheetCode: "A-100" }],
  issues: [{ id: "issue_1", issueNumber: 1, versionLabel: "Issue 1" }],
  requests: [{ requestCode: "CR-0001", requestId: "request_1", requestVersionId: "request_version_1", status: "submitted", title: "Move sink" }],
};

describe("issue package composer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.open.mockResolvedValue({ draft, sources });
    mocks.save.mockImplementation(async ({ draft: nextDraft }: { draft: ClientPortalIssueDraft }) => ({ ...nextDraft, draftRevision: nextDraft.draftRevision + 1, status: "draft" }));
    mocks.markReady.mockImplementation(async ({ expectedRevision }: { expectedRevision: number }) => ({ ...draft, estimates: [{ estimateId: "estimate_1", included: true, sortOrder: 0 }], revisionNote: "Move sink and revise joinery.", draftRevision: expectedRevision + 1, status: "ready" }));
  });

  it("autosaves exact package selections before marking the draft ready", async () => {
    render(<IssuePackageComposer portalId="portal_1" projectId="project_1" templateHasEstimateSection templateSectionIds={["section_1"]} unresolvedThreads={[]} />);

    expect(await screen.findByRole("heading", { name: "Issue package" })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Main estimate/));
    fireEvent.click(screen.getByLabelText(/Kitchen drawing/));
    fireEvent.click(screen.getByLabelText(/CR-0001/));
    fireEvent.change(screen.getByLabelText("Final revision narrative"), { target: { value: "Move sink and revise joinery." } });

    const ready = screen.getByRole("button", { name: "Mark ready" });
    await waitFor(() => expect(ready).toBeEnabled());
    fireEvent.click(ready);

    await waitFor(() => expect(mocks.save).toHaveBeenCalled());
    const savedDraft = mocks.save.mock.calls.at(-1)?.[0].draft as ClientPortalIssueDraft;
    expect(savedDraft.estimates).toEqual([{ estimateId: "estimate_1", included: true, sortOrder: 0 }]);
    expect(savedDraft.artifacts).toMatchObject([{ artifactVersionId: "artifact_version_1", purpose: "reference" }]);
    expect(savedDraft.requests).toMatchObject([{ requestId: "request_1", requestVersionId: "request_version_1" }]);
    expect(savedDraft.revisionNote).toBe("Move sink and revise joinery.");
    await waitFor(() => expect(mocks.markReady).toHaveBeenCalled());
    expect(await screen.findByRole("button", { name: "Publish to timeline" })).toBeEnabled();
  });
});
