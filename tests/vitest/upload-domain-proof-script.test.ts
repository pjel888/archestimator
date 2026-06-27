import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("upload domain provider proof script", () => {
  it("requires explicit provider proof mode and checks upload-domain RLS/RPC boundaries", () => {
    const script = readFileSync(join(process.cwd(), "scripts/prove-upload-domain-rls-postgres.mjs"), "utf8");

    expect(script).toContain('readEnv("ARCH_UPLOAD_DOMAIN_RLS_PROOF") !== "1"');
    expect(script).toContain("provider-proof-skipped");
    expect(script).toContain("linked-provider");
    expect(script).toContain("upload_sessions");
    expect(script).toContain("upload_assets");
    expect(script).toContain("upload_events");
    expect(script).toContain("anon-direct-select");
    expect(script).toContain("authenticated-direct-select");
    expect(script).toContain("record_upload_asset:authenticated-denied");
    expect(script).toContain("get_upload_asset_descriptor:anon-denied");
    expect(script).toContain("get_upload_asset_descriptor:authenticated-own-asset");
    expect(script).toContain("validate_estimate_row_image_asset:anon-denied");
    expect(script).toContain("validate_estimate_row_image_asset:authenticated-row-bound-asset");
    expect(script).toContain("validate_estimate_row_image_asset:wrong-row-null");
  });
});
