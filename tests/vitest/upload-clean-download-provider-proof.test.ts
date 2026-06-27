import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const proof = JSON.parse(readFileSync(join(
  process.cwd(),
  ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-clean-download-provider-proof.json",
), "utf8")) as {
  proofBoundary: string;
  passed: boolean;
  skipped: boolean;
  projectRef: string;
  provider: string;
  storageAccess: string;
  signedUrlRecorded: boolean;
  tokenRecorded: boolean;
  rawStoragePathRecordedInProof: boolean;
  assetShape: {
    surface: string;
    bucket: string;
    pathShape: string;
    contentType: string;
    sizeBytes: number;
  };
  attachmentEligibility: {
    reviewStatus: string;
    isCurrentApproved: boolean;
    uploadAssetStatus: string;
    scanStatus: string;
    scannerProvider: string;
  };
  auditEvent: {
    eventType: string;
    count: number;
    metadataKeys: string[];
  };
  responseHeaderContract: {
    cacheControl: string;
    contentDisposition: string;
    contentLength: string;
    contentType: string;
    xContentTypeOptions: string;
  };
  objectReadback: {
    contentType: string;
    sizeBytes: number;
    checksumSha256Observed: boolean;
  };
  checks: Array<{ label: string; passed: boolean }>;
  failedChecks: string[];
  cleanupErrors: unknown[];
};

describe("upload clean download provider proof evidence", () => {
  it("records a passed linked-provider clean download readback proof", () => {
    expect(proof.proofBoundary).toBe("linked-provider-clean-download-readback");
    expect(proof.passed).toBe(true);
    expect(proof.skipped).toBe(false);
    expect(proof.projectRef).toBe("ebxxqidacheyapmmzavr");
    expect(proof.provider).toBe("supabase-storage");
    expect(proof.storageAccess).toBe("service-role-private-download");
    expect(proof.failedChecks).toEqual([]);
    expect(proof.cleanupErrors).toEqual([]);
    expect(proof.checks.every((check) => check.passed)).toBe(true);
  });

  it("proves the approved/current, scan-clean, audited download eligibility contract", () => {
    expect(proof.assetShape).toMatchObject({
      surface: "component-attachment",
      bucket: "component-attachments",
      pathShape: "{workspaceId}/{userId}/clean-download-provider-{proofId}.pdf",
      contentType: "application/pdf",
    });
    expect(proof.assetShape.sizeBytes).toBeGreaterThan(0);
    expect(proof.attachmentEligibility).toMatchObject({
      reviewStatus: "approved",
      isCurrentApproved: true,
      uploadAssetStatus: "finalized",
      scanStatus: "clean",
      scannerProvider: "proof-scanner",
    });
    expect(proof.auditEvent).toMatchObject({
      eventType: "download_url_issued",
      count: 1,
      metadataKeys: ["attachmentId", "storagePath", "reviewStatus", "isCurrentApproved"],
    });
  });

  it("records private response semantics and avoids leaking provider secrets or temp identifiers", () => {
    expect(proof.responseHeaderContract).toMatchObject({
      cacheControl: "private, max-age=300",
      contentDisposition: 'attachment; filename="clean-download-provider-proof.pdf"',
      contentType: "application/pdf",
      xContentTypeOptions: "nosniff",
    });
    expect(Number(proof.responseHeaderContract.contentLength)).toBe(proof.objectReadback.sizeBytes);
    expect(proof.objectReadback).toMatchObject({
      contentType: "application/pdf",
      checksumSha256Observed: true,
    });
    expect(proof.signedUrlRecorded).toBe(false);
    expect(proof.tokenRecorded).toBe(false);
    expect(proof.rawStoragePathRecordedInProof).toBe(false);

    const serialized = JSON.stringify(proof);
    expect(serialized).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    expect(serialized).not.toContain("access_token");
    expect(serialized).not.toContain("refresh_token");
    expect(serialized).not.toContain("Bearer ");
    expect(serialized).not.toContain("token=");
    expect(serialized).not.toContain("password");
  });
});
