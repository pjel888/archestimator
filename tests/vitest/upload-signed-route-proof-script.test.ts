import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("Cloudflare direct-upload route lifecycle contract", () => {
  it("records a reserved D1 session without persisting upload URLs or credentials", () => {
    const route = readFileSync(
      join(process.cwd(), "src/app/api/component-library/attachments/direct-upload/route.ts"),
      "utf8",
    );
    const records = readFileSync(join(process.cwd(), "src/lib/uploads/direct-upload-records.ts"), "utf8");

    expect(route).toContain("recordPendingDirectUploadSession");
    expect(route).toContain('provider: CLOUDFLARE_R2_PROVIDER');
    expect(route).toContain('uploadMode: "signed_single_part"');
    expect(route).toContain('route: "component-attachment-direct-upload"');
    expect(route).toContain("uploadUrl: cloudflareDirectUploadUrl(request, pendingSession.uploadSessionId)");
    expect(route).toContain("finalizeUrl: FINALIZE_ROUTE");
    expect(records).toContain("INSERT INTO upload_sessions");
    expect(records).toContain('"session_reserved"');
    expect(records).not.toContain("uploadUrl");
    expect(records).not.toContain("bearerToken");
  });

  it("validates R2 object head before atomically finalizing the D1 asset and scan event", () => {
    const route = readFileSync(
      join(process.cwd(), "src/app/api/component-library/attachments/direct-upload/route.ts"),
      "utf8",
    );
    const records = readFileSync(join(process.cwd(), "src/lib/uploads/direct-upload-records.ts"), "utf8");

    expect(route).toContain("storageProvider.headObject?.(session.storage_bucket, session.storage_path)");
    expect(route).toContain("validateProviderObjectHead({");
    expect(route).toContain("providerFinalizeProof: validation.proof");
    expect(records).toContain("UPDATE upload_sessions");
    expect(records).toContain("INSERT INTO upload_assets");
    expect(records).toContain("INSERT INTO upload_events");
    expect(records).toContain('input.scanStatus === "pending" ? "scan_pending" : "asset_finalized"');
    expect(records).toContain("runRequiredD1Batch");
  });
});
