import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("upload signed route provider proof script", () => {
  it("requires explicit provider mode and refuses unexpected Supabase projects", () => {
    const script = readFileSync(join(process.cwd(), "scripts/prove-upload-signed-route-provider-postgres.ts"), "utf8");

    expect(script).toContain("#!/usr/bin/env bun");
    expect(script).toContain("ARCH_UPLOAD_SIGNED_ROUTE_PROOF");
    expect(script).toContain("ARCH_UPLOAD_SIGNED_ROUTE_PROOF_ENV_FILE");
    expect(script).toContain('EXPECTED_PROJECT_REF = "ebxxqidacheyapmmzavr"');
    expect(script).toContain("provider-proof-skipped");
    expect(script).toContain("provider-proof-refused");
    expect(script).toContain("linked-provider-signed-route-readback");
    expect(script).toContain("component-attachment-direct-upload");
  });

  it("exercises signed route session reservation, token upload, head validation, and finalization", () => {
    const script = readFileSync(join(process.cwd(), "scripts/prove-upload-signed-route-provider-postgres.ts"), "utf8");

    expect(script).toContain("createSupabaseDirectUploadProvider");
    expect(script).toContain("recordPendingUploadSession");
    expect(script).toContain("readUploadSessionForFinalize");
    expect(script).toContain("finalizeUploadSessionAsset");
    expect(script).toContain("validateProviderObjectHead");
    expect(script).toContain("uploadWithoutAuthorizationHeader");
    expect(script).toContain("authorizationHeaderSent: false");
    expect(script).toContain("create-upload-session-rpc-records-reserved-session");
    expect(script).toContain("signed-route-upload-accepts-token-without-authorization-header");
    expect(script).toContain("signed-route-provider-object-head-validates-finalization");
    expect(script).toContain("finalize-upload-session-rpc-records-asset-and-events");
    expect(script).toContain("signed-route-metadata-does-not-record-url-or-token");
    expect(script).toContain("signedUrlRecorded: false");
    expect(script).toContain("tokenRecorded: false");
  });
});
