import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const proof = JSON.parse(readFileSync(join(
  process.cwd(),
  ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-signed-route-provider-proof.json",
), "utf8")) as {
  proofBoundary: string;
  passed: boolean;
  skipped: boolean;
  projectRef: string;
  provider: string;
  route: string;
  uploadMode: string;
  sessionStatusFlow: string[];
  signedUrlRecorded: boolean;
  tokenRecorded: boolean;
  uploadedWithAuthorizationHeader: boolean;
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

describe("upload signed route provider proof evidence", () => {
  it("records a passed linked-provider signed route proof", () => {
    expect(proof.proofBoundary).toBe("linked-provider-signed-route-readback");
    expect(proof.passed).toBe(true);
    expect(proof.skipped).toBe(false);
    expect(proof.projectRef).toBe("ebxxqidacheyapmmzavr");
    expect(proof.provider).toBe("supabase-storage");
    expect(proof.route).toBe("component-attachment-direct-upload");
    expect(proof.uploadMode).toBe("signed_single_part");
    expect(proof.sessionStatusFlow).toEqual(["reserved", "finalized"]);
    expect(proof.failedChecks).toEqual([]);
    expect(proof.cleanupErrors).toEqual([]);
    expect(proof.checks.every((check) => check.passed)).toBe(true);
  });

  it("proves token-only upload, object-head finalization, event readback, and sanitized metadata", () => {
    expect(proof.signedUrlRecorded).toBe(false);
    expect(proof.tokenRecorded).toBe(false);
    expect(proof.uploadedWithAuthorizationHeader).toBe(false);
    expect(proof.assetShape).toEqual({
      surface: "component-attachment",
      bucket: "component-attachments",
      pathShape: "{workspaceId}/{userId}/signed-route-{proofId}.pdf",
      contentType: "application/pdf",
      sizeBytes: 39,
    });
    expect(proof.objectHead).toEqual({
      contentType: "application/pdf",
      sizeBytes: 39,
      etagObserved: true,
      checksumObserved: false,
      validationProof: "etag",
    });
    expect(proof.finalizedAssetRecorded).toBe(true);
    expect(proof.checks.map((check) => check.label)).toEqual([
      "route-provider-issued-signed-single-part-session",
      "create-upload-session-rpc-records-reserved-session",
      "reserved-session-readback-is-actor-workspace-bound",
      "signed-route-upload-accepts-token-without-authorization-header",
      "signed-route-provider-object-head-validates-finalization",
      "finalize-upload-session-rpc-records-asset-and-events",
      "signed-route-metadata-does-not-record-url-or-token",
    ]);

    const serialized = JSON.stringify(proof);
    expect(serialized).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    expect(serialized).not.toContain("token=");
    expect(serialized).not.toContain("object/upload/sign");
    expect(serialized).not.toContain("access_token");
    expect(serialized).not.toContain("refresh_token");
    expect(serialized).not.toContain("Bearer ");
    expect(serialized).not.toContain("password");
  });
});
