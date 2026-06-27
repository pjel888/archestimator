import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("upload signed provider proof script", () => {
  it("requires explicit provider mode and refuses unexpected Supabase projects", () => {
    const script = readFileSync(join(process.cwd(), "scripts/prove-upload-signed-provider-postgres.ts"), "utf8");

    expect(script).toContain("#!/usr/bin/env bun");
    expect(script).toContain("ARCH_UPLOAD_SIGNED_PROVIDER_PROOF");
    expect(script).toContain("ARCH_UPLOAD_SIGNED_PROVIDER_PROOF_ENV_FILE");
    expect(script).toContain('EXPECTED_PROJECT_REF = "ebxxqidacheyapmmzavr"');
    expect(script).toContain("provider-proof-skipped");
    expect(script).toContain("provider-proof-refused");
    expect(script).toContain("linked-provider-signed-upload-readback");
  });

  it("exercises real signed URL upload, finalization validation, and upload asset recording", () => {
    const script = readFileSync(join(process.cwd(), "scripts/prove-upload-signed-provider-postgres.ts"), "utf8");

    expect(script).toContain("createSupabaseDirectUploadProvider");
    expect(script).toContain("validateProviderObjectHead");
    expect(script).toContain("uploadWithoutAuthorizationHeader");
    expect(script).toContain("authorizationHeaderSent: false");
    expect(script).toContain('serviceClient.rpc("record_upload_asset"');
    expect(script).toContain("signed-upload-accepts-token-without-authorization-header");
    expect(script).toContain("provider-object-head-validates-finalization");
    expect(script).toContain("signed-upload-finalization-records-upload-asset");
    expect(script).toContain("signedUrlRecorded: false");
    expect(script).toContain("tokenRecorded: false");
  });
});
