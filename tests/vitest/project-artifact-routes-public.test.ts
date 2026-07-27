import { describe, expect, it, vi } from "vitest";

import {
  handlePublicArtifactContent,
  type PublicArtifactRouteDependencies,
} from "@/app/api/share/[token]/artifacts/[publicArtifactId]/_route-core";

function dependencies(overrides: Partial<PublicArtifactRouteDependencies> = {}): PublicArtifactRouteDependencies {
  const database = {} as never;
  return {
    checkRangeRateLimit: vi.fn(async () => ({ allowed: true as const })),
    readRecipientSession: vi.fn(async () => ({
      kind: "recipient" as const,
      recipientId: "recipient-1",
      portalId: "portal-1",
      role: "requester" as const,
      status: "active" as const,
      verificationState: "verified" as const,
      organization: "Client Co",
      isRequiredApprover: false,
      overrides: [],
    })),
    hasPasswordSession: vi.fn(async () => false),
    resolvePublicContext: vi.fn(async () => ({
      database,
      portal: { id: "portal-1", workspace_id: "workspace-1", project_id: "project-1", current_issue_id: "issue-1" },
      issue: { id: "issue-1", status: "issued", issue_number: 1 },
      policyPortal: { id: "portal-1", workspaceId: "workspace-1", projectId: "project-1", status: "live", allowAnonymousView: false },
    })) as never,
    readIssuedArtifact: vi.fn(async () => ({
      artifactId: "artifact-1",
      artifactVersionId: "version-1",
      publicArtifactId: "public-artifact-1",
      fileName: "Issued drawing.pdf",
      contentType: "application/pdf",
      sizeBytes: 4,
      contentSha256: "a".repeat(64),
      downloadable: true,
      allowedRecipientIds: null,
      allowedOrganizations: null,
    })),
    evaluatePolicy: vi.fn(() => ({ allowed: true, reasonCode: "allowed", hideResource: false, effectiveCapabilities: ["artifact:view"] })) as never,
    readArtifact: vi.fn(async () => ({ id: "artifact-1", status: "active" })) as never,
    readArtifactVersion: vi.fn(async () => ({
      id: "version-1",
      artifactId: "artifact-1",
      uploadAssetId: "upload-1",
      contentType: "application/pdf",
      sizeBytes: 4,
      contentSha256: "a".repeat(64),
      fileName: "Issued drawing.pdf",
    })) as never,
    assertPublishable: vi.fn(async () => ({ id: "upload-1" })) as never,
    readUploadLocator: vi.fn(async () => ({ bucket: "project-artifacts", path: "private/version-1.pdf" })),
    createStorageProvider: vi.fn(async () => ({
      downloadObject: vi.fn(async () => ({ body: new Uint8Array([1, 2, 3, 4]).buffer, contentType: "application/pdf", sizeBytes: 4 })),
      uploadObject: vi.fn(),
      removeObjects: vi.fn(),
      createSignedReadUrl: vi.fn(),
      getPublicUrl: vi.fn(),
    })),
    ...overrides,
  };
}

describe("public project artifact route", () => {
  it("serves a PDF only through the resolved issued relationship and artifact policy", async () => {
    const deps = dependencies();
    const response = await handlePublicArtifactContent(
      new Request("https://archestimator.test/api/share/share-token/artifacts/public-artifact-1", { headers: { cookie: "session=valid" } }),
      "share-token",
      "public-artifact-1",
      deps,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(deps.checkRangeRateLimit).toHaveBeenCalledOnce();
    expect(deps.checkRangeRateLimit).toHaveBeenCalledWith({
      portalId: "portal-1",
      publicArtifactId: "public-artifact-1",
      recipientId: "recipient-1",
      request: expect.any(Request),
    });
    expect(deps.readIssuedArtifact).toHaveBeenCalledWith(expect.objectContaining({
      issueId: "issue-1",
      publicArtifactId: "public-artifact-1",
    }));
    expect(deps.evaluatePolicy).toHaveBeenCalledWith(expect.objectContaining({
      action: "artifact:view",
      target: expect.objectContaining({ portalId: "portal-1", exposureStatus: "visible" }),
    }));
    expect(deps.assertPublishable).toHaveBeenCalledWith(expect.objectContaining({ uploadAssetId: "upload-1" }));
    expect(deps.readUploadLocator).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ uploadAssetId: "upload-1" }));
  });

  it("rate limits ranged artifact reads while preserving partial-content semantics when allowed", async () => {
    const downloadObjectRange = vi.fn(async () => ({
      body: new Uint8Array([2, 3]).buffer,
      contentType: "application/pdf",
      length: 2,
      offset: 1,
      sizeBytes: 2,
      totalSizeBytes: 4,
    }));
    const deps = dependencies({
      createStorageProvider: vi.fn(async () => ({
        downloadObject: vi.fn(),
        downloadObjectRange,
        uploadObject: vi.fn(),
        removeObjects: vi.fn(),
        createSignedReadUrl: vi.fn(),
        getPublicUrl: vi.fn(),
      })),
    });
    const response = await handlePublicArtifactContent(
      new Request("https://archestimator.test/api/share/share-token/artifacts/public-artifact-1", {
        headers: { range: "bytes=1-2" },
      }),
      "share-token",
      "public-artifact-1",
      deps,
    );

    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 1-2/4");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(deps.checkRangeRateLimit).toHaveBeenNthCalledWith(1, {
      portalId: "portal-1",
      publicArtifactId: "public-artifact-1",
      recipientId: "recipient-1",
      request: expect.any(Request),
    });
    expect(deps.checkRangeRateLimit).toHaveBeenNthCalledWith(2, {
      portalId: "portal-1",
      publicArtifactId: "public-artifact-1:range",
      recipientId: "recipient-1",
      request: expect.any(Request),
    });
    expect(vi.mocked(deps.evaluatePolicy).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(deps.checkRangeRateLimit).mock.invocationCallOrder[0],
    );
    expect(downloadObjectRange).toHaveBeenCalledWith("project-artifacts", "private/version-1.pdf", { offset: 1, length: 2 });
  });

  it("denies ranged reads after authorization and before artifact storage work", async () => {
    const deps = dependencies({
      checkRangeRateLimit: vi.fn(async () => ({ allowed: false as const, message: "Too many attempts.", retryAfter: 30 })),
    });
    const response = await handlePublicArtifactContent(
      new Request("https://archestimator.test/api/share/share-token/artifacts/public-artifact-1", {
        headers: { range: "bytes=0-1" },
      }),
      "share-token",
      "public-artifact-1",
      deps,
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("retry-after")).toBe("30");
    expect(deps.resolvePublicContext).toHaveBeenCalled();
    expect(deps.evaluatePolicy).toHaveBeenCalled();
    expect(deps.readArtifact).not.toHaveBeenCalled();
    expect(deps.createStorageProvider).not.toHaveBeenCalled();
  });

  it("durably rate limits full content reads after authorization and before storage", async () => {
    const deps = dependencies({
      checkRangeRateLimit: vi.fn(async () => ({ allowed: false as const, message: "Too many attempts.", retryAfter: 45 })),
    });
    const response = await handlePublicArtifactContent(
      new Request("https://archestimator.test/api/share/share-token/artifacts/public-artifact-1"),
      "share-token",
      "public-artifact-1",
      deps,
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("45");
    expect(deps.evaluatePolicy).toHaveBeenCalled();
    expect(deps.readArtifact).not.toHaveBeenCalled();
    expect(deps.createStorageProvider).not.toHaveBeenCalled();
  });

  it("fails closed after authorization when durable range storage is unavailable", async () => {
    const deps = dependencies({
      checkRangeRateLimit: vi.fn(async () => {
        throw new Error("quota storage unavailable");
      }),
    });
    const response = await handlePublicArtifactContent(
      new Request("https://archestimator.test/api/share/share-token/artifacts/public-artifact-1", {
        headers: { range: "bytes=0-1" },
      }),
      "share-token",
      "public-artifact-1",
      deps,
    );

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(deps.resolvePublicContext).toHaveBeenCalled();
    expect(deps.evaluatePolicy).toHaveBeenCalled();
    expect(deps.readArtifact).not.toHaveBeenCalled();
    expect(deps.createStorageProvider).not.toHaveBeenCalled();
  });

  it("fails closed before storage when the issued relationship is absent", async () => {
    const deps = dependencies({ readIssuedArtifact: vi.fn(async () => null) });
    const response = await handlePublicArtifactContent(
      new Request("https://archestimator.test/api/share/share-token/artifacts/unknown"),
      "share-token",
      "unknown",
      deps,
    );

    expect(response.status).toBe(404);
    expect(deps.createStorageProvider).not.toHaveBeenCalled();
  });

  it("requires download capability when attachment disposition is requested", async () => {
    const evaluatePolicy = vi.fn(() => ({ allowed: false, reasonCode: "capability_not_granted", hideResource: false, effectiveCapabilities: [] }));
    const deps = dependencies({ evaluatePolicy: evaluatePolicy as never });
    const response = await handlePublicArtifactContent(
      new Request("https://archestimator.test/api/share/share-token/artifacts/public-artifact-1?download=1"),
      "share-token",
      "public-artifact-1",
      deps,
    );

    expect(response.status).toBe(404);
    expect(evaluatePolicy).toHaveBeenCalledWith(expect.objectContaining({ action: "artifact:download" }));
    expect(deps.createStorageProvider).not.toHaveBeenCalled();
  });

  it.each([
    ["file name", { fileName: "different.pdf" }],
    ["content type", { contentType: "image/png" }],
    ["size", { sizeBytes: 5 }],
    ["hash", { contentSha256: "b".repeat(64) }],
  ])("fails closed when the issued %s snapshot does not match the immutable version", async (_field, mismatch) => {
    const deps = dependencies({
      readArtifactVersion: vi.fn(async () => ({
        id: "version-1",
        artifactId: "artifact-1",
        uploadAssetId: "upload-1",
        fileName: "Issued drawing.pdf",
        contentType: "application/pdf",
        contentSha256: "a".repeat(64),
        sizeBytes: 4,
        ...mismatch,
      })) as never,
    });
    const response = await handlePublicArtifactContent(
      new Request("https://archestimator.test/api/share/share-token/artifacts/public-artifact-1"),
      "share-token",
      "public-artifact-1",
      deps,
    );

    expect(response.status).toBe(404);
    expect(deps.assertPublishable).not.toHaveBeenCalled();
    expect(deps.createStorageProvider).not.toHaveBeenCalled();
  });
});
