import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const proof = JSON.parse(readFileSync(join(
  process.cwd(),
  ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-tus-provider-proof.json",
), "utf8")) as {
  proofBoundary: string;
  passed: boolean;
  skipped: boolean;
  projectRef: string;
  provider: string;
  route: string;
  uploadMode: string;
  sessionStatusFlow: string[];
  chunkSizeBytes: number;
  chunksUploaded: number;
  signedUrlRecorded: boolean;
  tokenRecorded: boolean;
  uploadLocationRecorded: boolean;
  uploadedWithAuthorizationHeader: boolean;
  uploadedWithSignatureHeader: boolean;
  assetShape: {
    surface: string;
    bucket: string;
    pathShape: string;
    contentType: string;
    sizeBytes: number;
  };
  objectHead: {
    contentType: string | null;
    sizeBytes: number;
    etagObserved: boolean;
    checksumObserved: boolean;
    validationProof: string | null;
  };
  finalizedAssetRecorded: boolean;
  checks: Array<{ label: string; passed: boolean; proof?: string }>;
  failedChecks: string[];
  cleanupErrors: unknown[];
};

describe("upload TUS provider proof evidence", () => {
  it("records a passed linked-provider signed TUS resumable upload proof", () => {
    expect(proof.proofBoundary).toBe("linked-provider-tus-resumable-readback");
    expect(proof.passed).toBe(true);
    expect(proof.skipped).toBe(false);
    expect(proof.projectRef).toBe("ebxxqidacheyapmmzavr");
    expect(proof.provider).toBe("supabase-storage");
    expect(proof.route).toBe("component-attachment-direct-upload");
    expect(proof.uploadMode).toBe("tus_resumable");
    expect(proof.sessionStatusFlow).toEqual(["reserved", "finalized"]);
    expect(proof.chunkSizeBytes).toBe(6 * 1024 * 1024);
    expect(proof.chunksUploaded).toBe(2);
    expect(proof.failedChecks).toEqual([]);
    expect(proof.cleanupErrors).toEqual([]);
    expect(proof.checks.every((check) => check.passed)).toBe(true);
  });

  it("proves signed TUS upload, object-head finalization, and sanitized metadata", () => {
    expect(proof.signedUrlRecorded).toBe(false);
    expect(proof.tokenRecorded).toBe(false);
    expect(proof.uploadLocationRecorded).toBe(false);
    expect(proof.uploadedWithAuthorizationHeader).toBe(false);
    expect(proof.uploadedWithSignatureHeader).toBe(true);
    expect(proof.assetShape).toEqual({
      surface: "component-attachment",
      bucket: "component-attachments",
      pathShape: "{workspaceId}/{userId}/tus-provider-{proofId}.pdf",
      contentType: "application/pdf",
      sizeBytes: 6 * 1024 * 1024 + 17,
    });
    expect(proof.objectHead).toEqual({
      contentType: "application/pdf",
      sizeBytes: 6 * 1024 * 1024 + 17,
      etagObserved: true,
      checksumObserved: false,
      validationProof: "etag",
    });
    expect(proof.finalizedAssetRecorded).toBe(true);
    expect(proof.checks.map((check) => check.label)).toEqual([
      "provider-issued-signed-tus-resumable-session",
      "create-upload-session-rpc-records-tus-reserved-session",
      "tus-reserved-session-readback-is-actor-workspace-bound",
      "signed-tus-upload-accepts-signature-without-authorization-header",
      "tus-provider-object-head-validates-finalization",
      "finalize-upload-session-rpc-records-tus-asset-and-events",
      "tus-metadata-does-not-record-token-url-or-location",
    ]);

    const serialized = JSON.stringify(proof);
    expect(serialized).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    expect(serialized).not.toContain("token=");
    expect(serialized).not.toContain("object/upload/sign");
    expect(serialized).not.toContain("resumable/sign/");
    expect(serialized).not.toContain("access_token");
    expect(serialized).not.toContain("refresh_token");
    expect(serialized).not.toContain("Bearer ");
    expect(serialized).not.toContain("password");
  });
});
