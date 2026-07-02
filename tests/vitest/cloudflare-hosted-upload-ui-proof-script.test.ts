import { describe, expect, it } from "vitest";

import { buildReadiness, normalizeHostedUploadUiBaseUrl } from "../../scripts/verify-cloudflare-hosted-upload-ui-proof";

const cleanupZero = {
  users: 0,
  sessions: 0,
  profiles: 0,
  memberships: 0,
  closedBetaRows: 0,
  legalTermsRows: 0,
  uploadSessions: 0,
  uploadAssets: 0,
  uploadEvents: 0,
  attachments: 0,
};

describe("Cloudflare hosted upload UI proof verifier", () => {
  it("refuses to send hosted auth cookies to an unapproved origin", () => {
    expect(() => normalizeHostedUploadUiBaseUrl("https://example.com", ["https://archestimator.com"]))
      .toThrow("Refusing to send hosted auth cookies");
  });

  it("marks the browser upload UI proof ready only when UI, D1, R2, and cleanup evidence all pass", () => {
    const readiness = buildReadiness({
      browserProof: {
        routeStatus: 200,
        routeOk: true,
        finalUrlPath: "/workshop/library/components",
        workspaceVisible: true,
        addComponentButtonReady: true,
        addComponentModalReady: true,
        variantPanelReady: true,
        variantEditorReady: true,
        attachmentInputReady: true,
        uploadApiStatus: 200,
        uploadApiOk: true,
        uploadApiBody: null,
        statusTextVisible: true,
        consoleErrors: [],
        pageErrors: [],
      },
      uploadBodyValid: true,
      d1Readback: {
        uploadSessionRows: 1,
        uploadAssetRows: 1,
        attachmentRows: 0,
        eventTypes: ["scan_pending"],
        sessionStatus: "finalized",
        assetStatus: "finalized",
        scanStatus: "pending",
        contentType: "application/pdf",
        sizeBytes: 128,
        checksumMatchesFixture: true,
      },
      r2Readback: {
        getStatus: 0,
        readable: true,
        sizeBytes: 128,
        checksumMatchesFixture: true,
      },
      appCleanup: {
        deleteStatus: 200,
        deleteOk: true,
        removedCount: 1,
        r2ObjectMissingAfterDelete: true,
      },
      cleanupAfter: cleanupZero,
      error: null,
    });

    expect(readiness.hostedUploadUiReady).toBe(true);
    expect(readiness.productionCutoverReady).toBe(false);
  });

  it("keeps synthetic cleanup as a hard gate", () => {
    const readiness = buildReadiness({
      browserProof: {
        routeStatus: 200,
        routeOk: true,
        finalUrlPath: "/workshop/library/components",
        workspaceVisible: true,
        addComponentButtonReady: true,
        addComponentModalReady: true,
        variantPanelReady: true,
        variantEditorReady: true,
        attachmentInputReady: true,
        uploadApiStatus: 200,
        uploadApiOk: true,
        uploadApiBody: null,
        statusTextVisible: true,
        consoleErrors: [],
        pageErrors: [],
      },
      uploadBodyValid: true,
      d1Readback: {
        uploadSessionRows: 1,
        uploadAssetRows: 1,
        attachmentRows: 0,
        eventTypes: ["scan_pending"],
        sessionStatus: "finalized",
        assetStatus: "finalized",
        scanStatus: "pending",
        contentType: "application/pdf",
        sizeBytes: 128,
        checksumMatchesFixture: true,
      },
      r2Readback: {
        getStatus: 0,
        readable: true,
        sizeBytes: 128,
        checksumMatchesFixture: true,
      },
      appCleanup: {
        deleteStatus: 200,
        deleteOk: true,
        removedCount: 1,
        r2ObjectMissingAfterDelete: true,
      },
      cleanupAfter: { ...cleanupZero, uploadAssets: 1 },
      error: null,
    });

    expect(readiness.hostedUploadUiReady).toBe(false);
    expect(readiness.d1CleanupReady).toBe(false);
  });
});
