import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("upload storage provider proof script", () => {
  it("requires explicit provider proof mode and distinguishes skipped proof from denial proof", () => {
    const script = readFileSync(join(process.cwd(), "scripts/prove-upload-storage-denial-postgres.mjs"), "utf8");

    expect(script).toContain('readEnv("ARCH_UPLOAD_STORAGE_PROOF") !== "1"');
    expect(script).toContain("ARCH_UPLOAD_STORAGE_PROOF_ENV_FILE");
    expect(script).toContain("PROOF_ENV_FILE_NAMES");
    expect(script).toContain('EXPECTED_PROJECT_REF = "ebxxqidacheyapmmzavr"');
    expect(script).toContain("provider-proof-skipped");
    expect(script).toContain("provider-proof-refused");
    expect(script).toContain("linked-provider");
    expect(script).toContain("createUser");
    expect(script).toContain("signInWithPassword");
    expect(script).toContain("deleteUser");
    expect(script).toContain("anon-direct-insert");
    expect(script).toContain("authenticated-direct-insert");
    expect(script).toContain("anon-direct-update");
    expect(script).toContain("authenticated-direct-update");
    expect(script).toContain("anon-direct-download");
    expect(script).toContain("authenticated-direct-download");
    expect(script).toContain("anon-direct-delete");
    expect(script).toContain("authenticated-direct-delete");
    expect(script).toContain("object-still-present-after-direct-delete-attempt");
    expect(script).toContain("service-readback-missing-after-direct-delete-attempt");
    expect(script).toContain("project-images");
    expect(script).toContain("component-images");
    expect(script).toContain("component-attachments");
  });
});
