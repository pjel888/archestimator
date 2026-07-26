import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("Cloudflare private upload storage contract", () => {
  it("binds uploads to private R2 operations and denies unsafe object keys", () => {
    const wrangler = readFileSync(join(process.cwd(), "wrangler.jsonc"), "utf8");
    const provider = readFileSync(join(process.cwd(), "src/lib/uploads/r2-storage-provider.ts"), "utf8");
    const route = readFileSync(join(process.cwd(), "src/app/api/component-library/attachments/route.ts"), "utf8");

    expect(wrangler).toContain('"binding": "ARCH_UPLOADS_R2"');
    expect(wrangler).toContain('"bucket_name": "archestimator-proof-uploads"');
    expect(provider).toContain("assertSafeLogicalBucket(bucket)");
    expect(provider).toContain("assertSafeStoragePath(path)");
    expect(provider).toContain('path.startsWith("/")');
    expect(provider).toContain('path.includes("//")');
    expect(provider).toContain('segment === "." || segment === ".."');
    expect(route).toContain("requireCurrentUserContext()");
    expect(route).toContain("canManageAttachmentTarget");
    expect(route).toContain("createRuntimeUploadStorageProvider");
    expect(route).toContain('"Cache-Control": PRIVATE_ATTACHMENT_ERROR_CACHE_CONTROL');
    expect(route).not.toContain("getPublicUrl(");
    expect(route).not.toContain("@supabase/supabase-js");
  });
});
