import { Buffer } from "node:buffer";

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  completeClientLinkLearning,
  publishClientLinkForLearning,
} from "@/lib/onboarding/client-link-learning";

const mocks = vi.hoisted(() => ({
  assertManager: vi.fn(),
  completeFlow: vi.fn(),
  createPublication: vi.fn(),
  getBinding: vi.fn(),
  getDatabase: vi.fn(),
  getSummary: vi.fn(),
  republishPublication: vi.fn(),
}));

vi.mock("@/lib/cloudflare/d1", () => ({
  getCloudflareD1Database: mocks.getDatabase,
}));

vi.mock("@/lib/publication/actions", () => ({
  assertProjectPublicationManager: mocks.assertManager,
  createProjectPublication: mocks.createPublication,
  republishProjectPublication: mocks.republishPublication,
}));

vi.mock("@/lib/repositories/workspace-repository", () => ({
  getProjectPublicationSummary: mocks.getSummary,
}));

vi.mock("@/lib/onboarding/flow-repository", () => ({
  completeOnboardingFlowFromDomainProof: mocks.completeFlow,
  getOnboardingFlowRunBinding: mocks.getBinding,
}));

const originalSecret = process.env.BETTER_AUTH_SECRET;
const receiptSecret = "test-client-link-receipt-secret-0123456789";
const now = new Date("2026-07-24T03:00:00.000Z");

function summary(overrides: Record<string, unknown> = {}) {
  return {
    canManagePublication: true,
    clientLinkPath: "/share/client-token",
    publicationId: "publication-1",
    selectedEstimateCount: 1,
    snapshotVersion: 3,
    staleSnapshotWarning: false,
    status: "published",
    tokenCopyAvailable: true,
    workspaceId: "workspace-1",
    ...overrides,
  };
}

function binding(overrides: Record<string, unknown> = {}) {
  return {
    runId: "run-1",
    state: {
      revision: 7,
      status: "in_progress",
    },
    ...overrides,
  };
}

async function issueReceipt(projectId = "project-1") {
  const result = await publishClientLinkForLearning({
    projectId,
    selectedEstimateIds: ["estimate-1"],
    actionKind: "create",
    runId: "run-1",
    expectedRevision: 7,
  });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.code);
  return result.receipt;
}

function tamperReceipt(
  receipt: string,
  mutate: (payload: Record<string, unknown>) => void,
) {
  const payload = JSON.parse(
    Buffer.from(receipt, "base64url").toString("utf8"),
  ) as Record<string, unknown>;
  mutate(payload);
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

describe("client-link onboarding proof", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    process.env.BETTER_AUTH_SECRET = receiptSecret;
    vi.clearAllMocks();
    mocks.getDatabase.mockResolvedValue({ prepare: vi.fn() });
    mocks.assertManager.mockResolvedValue({
      currentUserId: "user-1",
      project: { workspace_id: "workspace-1" },
    });
    mocks.createPublication.mockResolvedValue({
      ok: true,
      clientLinkPath: "/share/client-token",
      message: "Client link published.",
    });
    mocks.republishPublication.mockResolvedValue({
      ok: true,
      clientLinkPath: "/share/client-token",
      message: "Client link republished.",
    });
    mocks.getSummary.mockResolvedValue(summary());
    mocks.getBinding.mockResolvedValue(binding());
    mocks.completeFlow.mockResolvedValue({ status: "applied" });
  });

  afterAll(() => {
    vi.useRealTimers();
    if (originalSecret === undefined) {
      delete process.env.BETTER_AUTH_SECRET;
    } else {
      process.env.BETTER_AUTH_SECRET = originalSecret;
    }
  });

  it("completes only after publication readback and publication-domain proof", async () => {
    const receipt = await issueReceipt();

    await expect(
      completeClientLinkLearning({
        projectId: "project-1",
        receipt,
        method: "copy",
        mutationId: "mutation-1",
      }),
    ).resolves.toEqual({
      ok: true,
      code: "client_link_learning_completed",
      message: "Shared link verified. Client link lesson complete.",
    });
    expect(mocks.completeFlow).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        flowKey: "client_link_publishing",
        mutationId: "mutation-1",
        routeKey: "client_links",
        runId: "run-1",
        source: "publication_domain",
        stepKey: "client_links_verify",
        userId: "user-1",
        workspaceId: "workspace-1",
      }),
    );
  });

  it("rejects invalid publication actions before touching D1 or publication state", async () => {
    await expect(
      publishClientLinkForLearning({
        projectId: "project-1",
        actionKind: "delete" as never,
        runId: "run-1",
        expectedRevision: 7,
      }),
    ).resolves.toEqual({
      ok: false,
      code: "publication_action_failed",
      message: "Publication action is invalid.",
    });

    expect(mocks.getDatabase).not.toHaveBeenCalled();
    expect(mocks.createPublication).not.toHaveBeenCalled();
    expect(mocks.republishPublication).not.toHaveBeenCalled();
  });

  it("forwards publication failures and rejects failed publication readback", async () => {
    mocks.createPublication.mockResolvedValueOnce({
      ok: false,
      message: "No estimate sheets selected.",
    });
    await expect(
      publishClientLinkForLearning({
        projectId: "project-1",
        actionKind: "create",
        runId: "run-1",
        expectedRevision: 7,
      }),
    ).resolves.toEqual({
      ok: false,
      code: "publication_action_failed",
      message: "No estimate sheets selected.",
    });
    expect(mocks.getSummary).not.toHaveBeenCalled();

    mocks.getSummary.mockResolvedValueOnce(null);
    await expect(
      publishClientLinkForLearning({
        projectId: "project-1",
        actionKind: "create",
        runId: "run-1",
        expectedRevision: 7,
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "publication_verification_failed",
    });
  });

  it("reports stale publication binding without blaming another session", async () => {
    mocks.getBinding.mockResolvedValueOnce(binding({
      runId: "run-2",
    }));

    const result = await publishClientLinkForLearning({
      projectId: "project-1",
      actionKind: "create",
      runId: "run-1",
      expectedRevision: 7,
    });

    expect(result).toEqual({
      ok: false,
      code: "publication_binding_changed",
      message: "This lesson changed before publishing. Resume it before publishing.",
    });
    expect(result.message).not.toMatch(/another session/i);
    expect(mocks.createPublication).not.toHaveBeenCalled();
  });

  it("forwards every republish option through the established publication action", async () => {
    await expect(
      publishClientLinkForLearning({
        projectId: "project-1",
        selectedEstimateIds: ["estimate-1", "estimate-2"],
        password: "temporary-password",
        clearPassword: true,
        expiresAt: "2026-08-01T00:00:00.000Z",
        locationVisibility: "exact",
        actionKind: "republish",
        runId: "run-1",
        expectedRevision: 7,
      }),
    ).resolves.toMatchObject({
      ok: true,
      code: "publication_verified",
    });

    expect(mocks.republishPublication).toHaveBeenCalledWith({
      projectId: "project-1",
      selectedEstimateIds: ["estimate-1", "estimate-2"],
      password: "temporary-password",
      clearPassword: true,
      expiresAt: "2026-08-01T00:00:00.000Z",
      locationVisibility: "exact",
    });
    expect(mocks.createPublication).not.toHaveBeenCalled();
  });

  it("rejects invalid completion methods and malformed receipts before manager lookup", async () => {
    await expect(
      completeClientLinkLearning({
        projectId: "project-1",
        receipt: "unused",
        method: "download" as never,
        mutationId: "mutation-method",
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "publication_proof_invalid",
    });
    await expect(
      completeClientLinkLearning({
        projectId: "project-1",
        receipt: "not-json",
        method: "copy",
        mutationId: "mutation-receipt",
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "publication_proof_invalid",
    });

    expect(mocks.assertManager).not.toHaveBeenCalled();
  });

  it("fails completion closed when D1 or receipt signing becomes unavailable", async () => {
    const receipt = await issueReceipt();

    mocks.getDatabase.mockResolvedValueOnce(null);
    await expect(
      completeClientLinkLearning({
        projectId: "project-1",
        receipt,
        method: "copy",
        mutationId: "mutation-database",
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "publication_state_changed",
    });

    delete process.env.BETTER_AUTH_SECRET;
    await expect(
      completeClientLinkLearning({
        projectId: "project-1",
        receipt,
        method: "copy",
        mutationId: "mutation-secret",
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "publication_state_changed",
    });
  });

  it("rejects tampered, cross-project, cross-user, and cross-workspace receipts", async () => {
    const receipt = await issueReceipt();
    const tampered = tamperReceipt(receipt, (payload) => {
      payload.run_id = "forged-run";
    });

    await expect(
      completeClientLinkLearning({
        projectId: "project-1",
        receipt: tampered,
        method: "selectable_link",
        mutationId: "mutation-tampered",
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "publication_binding_mismatch",
    });
    await expect(
      completeClientLinkLearning({
        projectId: "project-2",
        receipt,
        method: "copy",
        mutationId: "mutation-project",
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "publication_binding_mismatch",
    });

    mocks.assertManager.mockResolvedValueOnce({
      currentUserId: "user-2",
      project: { workspace_id: "workspace-1" },
    });
    await expect(
      completeClientLinkLearning({
        projectId: "project-1",
        receipt,
        method: "copy",
        mutationId: "mutation-user",
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "publication_binding_mismatch",
    });

    mocks.assertManager.mockResolvedValueOnce({
      currentUserId: "user-1",
      project: { workspace_id: "workspace-2" },
    });
    mocks.getSummary.mockResolvedValueOnce(summary({ workspaceId: "workspace-2" }));
    await expect(
      completeClientLinkLearning({
        projectId: "project-1",
        receipt,
        method: "copy",
        mutationId: "mutation-workspace",
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "publication_binding_mismatch",
    });
  });

  it("rejects expired, replaced, and stale-flow receipts", async () => {
    const receipt = await issueReceipt();
    vi.advanceTimersByTime(5 * 60 * 1_000 + 1);

    await expect(
      completeClientLinkLearning({
        projectId: "project-1",
        receipt,
        method: "copy",
        mutationId: "mutation-expired",
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "publication_proof_expired",
    });

    vi.setSystemTime(now);
    mocks.getSummary.mockResolvedValueOnce(summary({ snapshotVersion: 4 }));
    await expect(
      completeClientLinkLearning({
        projectId: "project-1",
        receipt,
        method: "copy",
        mutationId: "mutation-replaced",
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "publication_replaced",
    });

    mocks.getBinding.mockResolvedValueOnce(binding({
      state: { revision: 8, status: "in_progress" },
    }));
    await expect(
      completeClientLinkLearning({
        projectId: "project-1",
        receipt,
        method: "copy",
        mutationId: "mutation-stale",
      }),
    ).resolves.toEqual({
      ok: false,
      code: "publication_state_changed",
      message: "This lesson changed before sharing. Resume it before sharing.",
    });
  });

  it("rejects replay after the proof has already completed the flow", async () => {
    const receipt = await issueReceipt();
    mocks.completeFlow
      .mockResolvedValueOnce({ status: "applied" })
      .mockResolvedValueOnce({
        status: "conflict",
        code: "ONBOARDING_ALREADY_COMPLETED",
      });
    const input = {
      projectId: "project-1",
      receipt,
      method: "authenticated_preview" as const,
      mutationId: "mutation-replay",
    };

    await expect(completeClientLinkLearning(input)).resolves.toMatchObject({
      ok: true,
      code: "client_link_learning_completed",
    });
    await expect(completeClientLinkLearning(input)).resolves.toMatchObject({
      ok: false,
      code: "publication_proof_replayed",
    });
  });

  it("fails closed without a receipt secret or manager permission", async () => {
    delete process.env.BETTER_AUTH_SECRET;
    await expect(
      publishClientLinkForLearning({
        projectId: "project-1",
        actionKind: "create",
        runId: "run-1",
        expectedRevision: 7,
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "publication_receipt_unavailable",
    });

    process.env.BETTER_AUTH_SECRET = receiptSecret;
    mocks.assertManager.mockRejectedValueOnce(new Error("Not authorized"));
    await expect(
      publishClientLinkForLearning({
        projectId: "project-1",
        actionKind: "create",
        runId: "run-1",
        expectedRevision: 7,
      }),
    ).rejects.toThrow("Not authorized");
  });
});
