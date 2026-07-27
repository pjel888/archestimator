import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildClientPortalNarrativeInput,
  buildClientPortalNarrativeInputFingerprint,
  CLIENT_PORTAL_NARRATIVE_SCHEMA_VERSION,
} from "@/lib/client-portal/narrative-ai";

const mocks = vi.hoisted(() => ({
  abandon: vi.fn(),
  carryForward: vi.fn(),
  markReady: vi.fn(),
  open: vi.fn(),
  publish: vi.fn(),
  save: vi.fn(),
}));

vi.mock("@/lib/client-portal/issue-draft-actions", () => ({
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
  estimates: [{ estimateId: "estimate_1", included: true, sortOrder: 0 }],
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
  artifacts: [],
  baselines: [],
  estimates: [{ id: "estimate_1", name: "Main estimate", sheetCode: "A-100" }],
  issues: [],
  requests: [],
};

function narrativeResponse(currentDraft = draft) {
  return {
    schemaVersion: CLIENT_PORTAL_NARRATIVE_SCHEMA_VERSION,
    draftRevision: currentDraft.draftRevision,
    inputFingerprint: buildClientPortalNarrativeInputFingerprint({
      draftRevision: currentDraft.draftRevision,
      changeSet: buildClientPortalNarrativeInput({ draft: currentDraft, sources }),
    }),
    narrative: "CO-01 is a change order package.\n\nIncluded: Estimate: A-100 · Main estimate.",
    selection: { summary: ["summary-1"], included: ["included-1"], excluded: [], unresolved: [], warnings: [] },
    source: "ai" as const,
    provider: "deepseek",
    model: "test-model",
    fallbackReason: null,
    runId: "run_1",
    generatedAt: "2026-07-27T00:00:00.000Z",
    inputHash: "a".repeat(64),
    outputHash: "b".repeat(64),
  };
}

describe("issue package composer AI narrative review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.open.mockResolvedValue({ draft, sources });
    mocks.save.mockImplementation(async ({ draft: nextDraft }: { draft: ClientPortalIssueDraft }) => ({ ...nextDraft, draftRevision: nextDraft.draftRevision + 1, status: "draft" }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(narrativeResponse()), { status: 200, headers: { "Content-Type": "application/json" } })));
  });

  it("keeps generated text separate until a human edits, reviews, and explicitly accepts it", async () => {
    render(<IssuePackageComposer portalId="portal_1" projectId="project_1" templateHasEstimateSection templateSectionIds={["section_1"]} unresolvedThreads={[]} />);

    fireEvent.click(await screen.findByRole("button", { name: "Generate source-backed draft" }));
    const reviewDraft = await screen.findByLabelText("AI-assisted narrative draft");
    expect(screen.getByLabelText("Final revision narrative")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Use reviewed narrative" })).toBeDisabled();

    fireEvent.change(reviewDraft, { target: { value: "Reviewed source-backed wording." } });
    fireEvent.click(screen.getByText(/I reviewed this text/));
    fireEvent.click(screen.getByRole("button", { name: "Use reviewed narrative" }));

    expect(screen.getByLabelText("Final revision narrative")).toHaveValue("Reviewed source-backed wording.");
    expect(await screen.findByText("Accepted into the final revision narrative.")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/ai/client-portal-narrative", expect.objectContaining({ method: "POST" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("invalidates an unaccepted generation when package facts change", async () => {
    render(<IssuePackageComposer portalId="portal_1" projectId="project_1" templateHasEstimateSection templateSectionIds={["section_1"]} unresolvedThreads={[]} />);

    fireEvent.click(await screen.findByRole("button", { name: "Generate source-backed draft" }));
    await screen.findByLabelText("AI-assisted narrative draft");
    fireEvent.change(screen.getByLabelText("Assumptions"), { target: { value: "New site assumption" } });

    expect(await screen.findByRole("alert")).toHaveTextContent("generated draft is stale");
    expect(screen.getByRole("button", { name: "Use reviewed narrative" })).toBeDisabled();
  });

  it("removes an accepted AI narrative when later package facts change", async () => {
    render(<IssuePackageComposer portalId="portal_1" projectId="project_1" templateHasEstimateSection templateSectionIds={["section_1"]} unresolvedThreads={[]} />);

    fireEvent.click(await screen.findByRole("button", { name: "Generate source-backed draft" }));
    await screen.findByLabelText("AI-assisted narrative draft");
    fireEvent.click(screen.getByText(/I reviewed this text/));
    fireEvent.click(screen.getByRole("button", { name: "Use reviewed narrative" }));
    expect(screen.getByLabelText("Final revision narrative")).not.toHaveValue("");

    fireEvent.change(screen.getByLabelText("Unresolved items"), { target: { value: "Confirm appliance model" } });

    await waitFor(() => expect(screen.getByLabelText("Final revision narrative")).toHaveValue(""));
    expect(screen.getByText(/accepted AI draft was removed/)).toBeInTheDocument();
  });
});
