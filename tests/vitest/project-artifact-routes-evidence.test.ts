import { describe, expect, it, vi } from "vitest";

import {
  handleRecipientEvidenceUpload,
  type RecipientEvidenceRouteDependencies,
} from "@/app/api/share/[token]/requests/evidence/_route-core";

function dependencies(overrides: Partial<RecipientEvidenceRouteDependencies> = {}): RecipientEvidenceRouteDependencies {
  const actor = {
    kind: "recipient" as const,
    recipientId: "recipient-1",
    portalId: "portal-1",
    role: "requester" as const,
    status: "active" as const,
    verificationState: "verified" as const,
    organization: "Client Co",
    isRequiredApprover: false,
    overrides: [],
  };
  return {
    assertSameOrigin: vi.fn(() => ({ ok: true as const })),
    readRecipientSession: vi.fn(async () => actor),
    resolvePublicContext: vi.fn(async () => ({
      database: {} as never,
      portal: { id: "portal-1", workspace_id: "workspace-1", project_id: "project-1" },
      issue: { id: "issue-1", status: "issued" },
      policyPortal: { id: "portal-1", workspaceId: "workspace-1", projectId: "project-1", status: "live", allowAnonymousView: false },
    })) as never,
    evaluatePolicy: vi.fn(() => ({ allowed: true, reasonCode: "allowed", hideResource: false, effectiveCapabilities: ["artifact:upload_evidence"] })) as never,
    readOwnedRequest: vi.fn(async () => ({ id: "request-1", currentVersionId: "request-version-1" })),
    stageEvidenceUpload: vi.fn(async () => Response.json({ uploadSessionId: "upload-session-1" }, { status: 201 })),
    ...overrides,
  };
}

function request() {
  return new Request("https://archestimator.test/api/share/share-token/requests/evidence", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://archestimator.test" },
    body: JSON.stringify({
      requestId: "request-1",
      fileName: "site-photo.jpg",
      contentType: "image/jpeg",
      sizeBytes: 1024,
      checksumSha256: "a".repeat(64),
    }),
  });
}

describe("recipient project artifact evidence route", () => {
  it("authorizes only an active verified recipient with capability and owned request", async () => {
    const deps = dependencies();
    const response = await handleRecipientEvidenceUpload(request(), "share-token", deps);

    expect(response.status).toBe(201);
    expect(deps.evaluatePolicy).toHaveBeenCalledWith(expect.objectContaining({ action: "artifact:upload_evidence" }));
    expect(deps.readOwnedRequest).toHaveBeenCalledWith(expect.objectContaining({
      portalId: "portal-1",
      recipientId: "recipient-1",
      requestId: "request-1",
    }));
    expect(deps.stageEvidenceUpload).toHaveBeenCalledWith(expect.objectContaining({
      actor: expect.objectContaining({ recipientId: "recipient-1", verificationState: "verified" }),
      projectId: "project-1",
      surface: "portal-request-evidence",
      workspaceId: "workspace-1",
    }));
  });

  it("fails closed before finalization without recipient capability", async () => {
    const deps = dependencies({
      evaluatePolicy: vi.fn(() => ({ allowed: false, reasonCode: "capability_not_granted", hideResource: false, effectiveCapabilities: [] })) as never,
    });
    const response = await handleRecipientEvidenceUpload(request(), "share-token", deps);

    expect(response.status).toBe(404);
    expect(deps.readOwnedRequest).toHaveBeenCalledTimes(1);
    expect(deps.stageEvidenceUpload).not.toHaveBeenCalled();
  });

  it("rejects unsupported metadata before request lookup", async () => {
    const deps = dependencies();
    const badRequest = new Request("https://archestimator.test/api/share/share-token/requests/evidence", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://archestimator.test" },
      body: JSON.stringify({
        requestId: "request-1",
        fileName: "payload.exe",
        contentType: "application/octet-stream",
        sizeBytes: 1024,
        checksumSha256: "a".repeat(64),
      }),
    });
    const response = await handleRecipientEvidenceUpload(badRequest, "share-token", deps);

    expect(response.status).toBe(400);
    expect(deps.readOwnedRequest).not.toHaveBeenCalled();
    expect(deps.stageEvidenceUpload).not.toHaveBeenCalled();
  });
});
