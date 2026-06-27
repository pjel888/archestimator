import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("upload storage provider proof script", () => {
  it("requires explicit provider proof mode and distinguishes skipped proof from denial proof", () => {
    const script = readFileSync(join(process.cwd(), "scripts/prove-upload-storage-denial-postgres.mjs"), "utf8");

    expect(script).toContain('readEnv("ARCH_UPLOAD_STORAGE_PROOF") !== "1"');
    expect(script).toContain("provider-proof-skipped");
    expect(script).toContain("linked-provider");
    expect(script).toContain("authenticated-direct-insert");
    expect(script).toContain("authenticated-direct-update");
    expect(script).toContain("authenticated-direct-download");
    expect(script).toContain("authenticated-direct-delete");
    expect(script).toContain("project-images");
    expect(script).toContain("component-images");
    expect(script).toContain("component-attachments");
  });
});
