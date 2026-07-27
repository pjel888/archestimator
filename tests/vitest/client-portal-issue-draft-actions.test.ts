import { createHash } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { hashAiAuditValue } from "@/lib/ai/audit";
import {
  buildClientPortalNarrativeFacts,
  buildClientPortalNarrativeInput,
  buildClientPortalNarrativeInputFingerprint,
  canonicalSerializeClientPortalNarrative,
  createDeterministicClientPortalNarrativeSelection,
  renderClientPortalNarrative,
} from "@/lib/client-portal/narrative-ai";

const mocks = vi.hoisted(() => ({
  database: { prepare: vi.fn() },
  getDraft: vi.fn(),
  loadSources: vi.fn(),
  revalidatePath: vi.fn(),
  saveDraft: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/cloudflare/d1", () => ({ getCloudflareD1Database: vi.fn(async () => mocks.database) }));
vi.mock("@/lib/publication/actions", () => ({
  assertProjectPublicationManager: vi.fn(async () => ({
    currentUserId: "owner_1",
    project: { id: "project_1", workspace_id: "workspace_1" },
  })),
}));
vi.mock("@/lib/client-portal/issue-draft-service", () => ({
  abandonClientPortalIssueDraft: vi.fn(),
  getClientPortalIssueDraft: mocks.getDraft,
  markClientPortalIssueDraftReady: vi.fn(),
  openClientPortalIssueDraft: vi.fn(),
  saveClientPortalIssueDraft: mocks.saveDraft,
}));
vi.mock("@/lib/client-portal/issue-draft-sources", () => ({
  loadClientPortalIssueDraftSources: mocks.loadSources,
}));

import { acceptClientPortalNarrativeAction } from "@/lib/client-portal/issue-draft-actions";

const draft = {
  artifacts: [{ artifactVersionId: "artifact_version_1", sortOrder: 0 }],
  assumptions: ["Existing structure remains serviceable."],
  basedOnBaselineId: null,
  comparisonIssueId: null,
  draftRevision: 2,
  estimates: [{ estimateId: "estimate_1", included: true, sortOrder: 0 }],
  exclusions: ["Permit fees"],
  id: "draft_1",
  issueKind: "change_order",
  narrativeProvenance: null,
  portalId: "portal_1",
  projectId: "project_1",
  requestedDecision: "formal",
  requests: [{ requestVersionId: "request_version_1", sortOrder: 0 }],
  revisionNote: null,
  unresolvedItems: ["Confirm finish selection"],
  versionLabel: "CO-01",
  workspaceId: "workspace_1",
};

const sources = {
  artifacts: [{ artifactVersionId: "artifact_version_1", revisionLabel: "B", title: "Kitchen drawing", versionNumber: 2 }],
  baselines: [],
  estimates: [{ id: "estimate_1", name: "Main estimate", sheetCode: "A-100" }],
  issues: [],
  requests: [{ requestCode: "CR-0001", requestVersionId: "request_version_1", title: "Move sink" }],
};

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getDraft.mockResolvedValue(draft);
  mocks.loadSources.mockResolvedValue(sources);
  mocks.saveDraft.mockImplementation(async (input) => input.metadata);
});

describe("client portal issue draft actions", () => {
  it("persists AI generatedAt from the verified audit run instead of the client response", async () => {
    const generatedAt = "2026-07-27T00:00:00.000Z";
    const clientGeneratedAt = "2099-12-31T23:59:59.999Z";
    const changeSet = buildClientPortalNarrativeInput({ draft, sources });
    const facts = buildClientPortalNarrativeFacts(changeSet);
    const selection = createDeterministicClientPortalNarrativeSelection(facts);
    const narrative = renderClientPortalNarrative(facts, selection);
    const inputFingerprint = buildClientPortalNarrativeInputFingerprint({ draftRevision: draft.draftRevision, changeSet });
    const inputHash = sha256(canonicalSerializeClientPortalNarrative(changeSet));
    const outputHash = sha256(canonicalSerializeClientPortalNarrative({ narrative, selection }));
    const response = {
      draftRevision: draft.draftRevision,
      fallbackReason: null,
      generatedAt: clientGeneratedAt,
      inputFingerprint,
      inputHash,
      model: "test-model",
      narrative,
      outputHash,
      provider: "test-provider",
      runId: "run_1",
      schemaVersion: 1 as const,
      selection,
      source: "ai" as const,
    };
    mocks.database.prepare.mockImplementation(() => ({
      bind: () => ({
        first: async () => ({
          created_at: generatedAt,
          metadata_json: JSON.stringify({
            draftRevision: draft.draftRevision,
            inputFingerprintHash: hashAiAuditValue(inputFingerprint),
            inputHash,
            outputHash,
            schemaVersion: 1,
            source: "ai",
          }),
          model: response.model,
          provider: response.provider,
        }),
      }),
    }));

    await acceptClientPortalNarrativeAction({
      draftId: draft.id,
      expectedRevision: draft.draftRevision,
      finalText: narrative,
      portalId: draft.portalId,
      projectId: draft.projectId,
      response,
    });

    expect(mocks.database.prepare).toHaveBeenCalledWith(expect.stringContaining("created_at"));
    expect(mocks.saveDraft).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        narrativeProvenance: expect.objectContaining({ generatedAt }),
      }),
    }));
    expect(mocks.saveDraft).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        narrativeProvenance: expect.objectContaining({ generatedAt: clientGeneratedAt }),
      }),
    }));
  });
});
