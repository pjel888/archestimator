import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("Cloudflare upload clean download proof contract", () => {
  it("requires a secret-gated HTTPS Worker proof and fails closed on incomplete D1/R2 evidence", () => {
    const verifier = readFileSync(
      join(process.cwd(), "scripts/verify-cloudflare-hosted-upload-lifecycle-proof.ts"),
      "utf8",
    );

    expect(verifier).toContain('ENDPOINT_PATH = "/api/internal/upload-lifecycle-proof"');
    expect(verifier).toContain('readEnv("CRON_SECRET")');
    expect(verifier).toContain("Cloudflare upload lifecycle proof base URL must use HTTPS.");
    expect(verifier).toContain("authorization: `Bearer ${input.secret}`");
    expect(verifier).toContain("endpointReadiness.attachmentDownloadEligible === true");
    expect(verifier).toContain("cleanupCountsAreZero(body.cleanupAfter)");
    expect(verifier).toContain("productionCutoverReady: false");
    expect(verifier).toContain("does not print secret values, raw R2 keys, uploaded bytes, session cookies, customer data, or provider credentials");
  });

  it("proves approved/current attachment, clean scan, audit, and private R2 readback", () => {
    const proofRouter = readFileSync(
      join(process.cwd(), "src/lib/cloudflare/upload-lifecycle-proof-router.ts"),
      "utf8",
    );
    const route = readFileSync(join(process.cwd(), "src/app/api/component-library/attachments/route.ts"), "utf8");

    expect(proofRouter).toContain("createRuntimeUploadStorageProvider");
    expect(proofRouter).toContain("recordUploadAsset");
    expect(proofRouter).toContain("runUploadScanJob");
    expect(proofRouter).toContain('row?.review_status === "approved" && row?.is_current_approved === 1');
    expect(proofRouter).toContain('row?.asset_status === "finalized" && row?.scan_status === "clean"');
    expect(proofRouter).toContain('scanReadback.eventTypes.includes("scan_clean")');
    expect(proofRouter).toContain("storageChecksumMatches");
    expect(route).toContain("isAttachmentReviewStateReadable(attachment)");
    expect(route).toContain("readCleanUploadAsset(metadataDb, attachment)");
    expect(route).toContain("recordAttachmentDownloadIssued");
    expect(route).toContain('"download_url_issued"');
    expect(route).toContain('"Cache-Control": PRIVATE_ATTACHMENT_ERROR_CACHE_CONTROL');
    expect(route).toContain('"X-Content-Type-Options": "nosniff"');
    expect(route).not.toContain("@supabase/supabase-js");
  });
});
