import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("Cloudflare R2 direct-upload provider contract", () => {
  it("uses an authenticated same-origin PUT instead of exposing provider tokens", () => {
    const route = readFileSync(
      join(process.cwd(), "src/app/api/component-library/attachments/direct-upload/route.ts"),
      "utf8",
    );

    expect(route).toContain('const CLOUDFLARE_R2_PROVIDER = "cloudflare-r2"');
    expect(route).toContain("function cloudflareDirectUploadUrl(request: Request, uploadSessionId: string)");
    expect(route).toContain("new URL(FINALIZE_ROUTE, request.url)");
    expect(route).toContain('method: "PUT"');
    expect(route).toContain("export async function PUT(request: Request)");
    expect(route).toContain("requireCurrentUserContext()");
    expect(route).toContain("storageProvider.uploadObject({");
    expect(route).toContain("validateProviderObjectHead");
    expect(route).toContain("finalizeUploadSessionAsset");
    expect(route).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(route).not.toContain("signedToken");
  });

  it("keeps R2 object operations behind validated logical bucket and path keys", () => {
    const provider = readFileSync(join(process.cwd(), "src/lib/uploads/r2-storage-provider.ts"), "utf8");

    expect(provider).toContain("buildCloudflareR2ObjectKey(bucket, path)");
    expect(provider).toContain("assertSafeLogicalBucket(bucket)");
    expect(provider).toContain("assertSafeStoragePath(path)");
    expect(provider).toContain("await r2.put");
    expect(provider).toContain("await r2.head");
    expect(provider).toContain("await r2.get");
    expect(provider).toContain("r2.delete");
    expect(provider).toContain('path.includes("\\\\")');
    expect(provider).toContain('segment === ".."');
  });
});
