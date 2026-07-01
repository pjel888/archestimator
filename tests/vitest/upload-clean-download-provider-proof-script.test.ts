import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("upload clean download provider proof script", () => {
  it("requires explicit provider mode and refuses unexpected Supabase projects", () => {
    const script = readFileSync(join(process.cwd(), "scripts/prove-upload-clean-download-provider-postgres.ts"), "utf8");

    expect(script).toContain("#!/usr/bin/env bun");
    expect(script).toContain("ARCH_UPLOAD_CLEAN_DOWNLOAD_PROOF");
    expect(script).toContain("ARCH_UPLOAD_CLEAN_DOWNLOAD_PROOF_ENV_FILE");
    expect(script).toContain('EXPECTED_PROJECT_REF = "ebxxqidacheyapmmzavr"');
    expect(script).toContain("provider-proof-skipped");
    expect(script).toContain("provider-proof-refused");
    expect(script).toContain("linked-provider-clean-download-readback");
    expect(script).toContain("cleanupFixture");
    expect(script).toContain("passed: originalPassed && cleanupErrors.length === 0");
  });

  it("exercises approved/current attachment, clean scan, audit, and private provider readback", () => {
    const script = readFileSync(join(process.cwd(), "scripts/prove-upload-clean-download-provider-postgres.ts"), "utf8");
    const route = readFileSync(join(process.cwd(), "src/app/api/component-library/attachments/route.ts"), "utf8");

    expect(script).toContain("cost_library_item_variant_attachments");
    expect(script).toContain('review_status: "approved"');
    expect(script).toContain("is_current_approved: true");
    expect(script).toContain('serviceClient.rpc("record_upload_asset"');
    expect(script).toContain('serviceClient.rpc("record_upload_scan_result"');
    expect(script).toContain('scanner_status: "clean"');
    expect(script).toContain('event_type: "download_url_issued"');
    expect(script).toContain("downloadProviderObject");
    expect(script).toContain("provider-readback-requires-approved-current-clean-finalized-attachment");
    expect(script).toContain("download-response-header-contract-is-private-and-nosniff");
    expect(script).toContain("rawStoragePathRecordedInProof: false");
    expect(route).toContain('data.review_status !== "approved"');
    expect(route).toContain("!readApprovedFlag(data.is_current_approved)");
  });
});
