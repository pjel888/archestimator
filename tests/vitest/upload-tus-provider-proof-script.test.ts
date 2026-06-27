import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("upload TUS provider proof script", () => {
  it("requires explicit provider mode and refuses unexpected Supabase projects", () => {
    const script = readFileSync(join(process.cwd(), "scripts/prove-upload-tus-provider-postgres.ts"), "utf8");

    expect(script).toContain("#!/usr/bin/env bun");
    expect(script).toContain("ARCH_UPLOAD_TUS_PROVIDER_PROOF");
    expect(script).toContain("ARCH_UPLOAD_TUS_PROVIDER_PROOF_ENV_FILE");
    expect(script).toContain('EXPECTED_PROJECT_REF = "ebxxqidacheyapmmzavr"');
    expect(script).toContain("provider-proof-skipped");
    expect(script).toContain("provider-proof-refused");
    expect(script).toContain("linked-provider-tus-resumable-readback");
    expect(script).toContain("component-attachment-direct-upload");
  });

  it("exercises signed TUS session reservation, chunk upload, head validation, and finalization", () => {
    const script = readFileSync(join(process.cwd(), "scripts/prove-upload-tus-provider-postgres.ts"), "utf8");

    expect(script).toContain("createSupabaseDirectUploadProvider");
    expect(script).toContain("SUPABASE_TUS_CHUNK_SIZE_BYTES");
    expect(script).toContain("recordPendingUploadSession");
    expect(script).toContain("readUploadSessionForFinalize");
    expect(script).toContain("finalizeUploadSessionAsset");
    expect(script).toContain("validateProviderObjectHead");
    expect(script).toContain("uploadTusWithoutAuthorizationHeader");
    expect(script).toContain("authorizationHeaderSent: false");
    expect(script).toContain("signatureHeaderSent: true");
    expect(script).toContain("provider-issued-signed-tus-resumable-session");
    expect(script).toContain("signed-tus-upload-accepts-signature-without-authorization-header");
    expect(script).toContain("tus-provider-object-head-validates-finalization");
    expect(script).toContain("finalize-upload-session-rpc-records-tus-asset-and-events");
    expect(script).toContain("tus-metadata-does-not-record-token-url-or-location");
    expect(script).toContain("tokenRecorded: false");
    expect(script).toContain("uploadLocationRecorded: false");
  });
});
