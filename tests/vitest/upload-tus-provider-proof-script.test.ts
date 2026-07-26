import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("Cloudflare resumable upload retirement contract", () => {
  it("fails closed before creating multipart sessions until Cloudflare R2 support is enabled", () => {
    const route = readFileSync(
      join(process.cwd(), "src/app/api/component-library/attachments/direct-upload/route.ts"),
      "utf8",
    );

    expect(route).toContain('if (strategy.kind === "multipart_resumable")');
    expect(route).toContain('return jsonError("Something went wrong. Try again in a moment.", 501)');
    expect(route).toContain('uploadMode: "signed_single_part"');
    expect(route).not.toContain("SUPABASE_TUS_CHUNK_SIZE_BYTES");
    expect(route).not.toContain("uploadTusWithoutAuthorizationHeader");
    expect(route).not.toContain("/storage/v1/upload/resumable");
  });

  it("retains safe finalization checks for already-reserved resumable sessions", () => {
    const route = readFileSync(
      join(process.cwd(), "src/app/api/component-library/attachments/direct-upload/route.ts"),
      "utf8",
    );

    expect(route).toContain('uploadMode === "tus_resumable" ? RESUMABLE_COMPONENT_ATTACHMENT_MAX_BYTES');
    expect(route).toContain("validateProviderObjectHead({");
    expect(route).toContain("finalizeUploadSessionAsset(db, {");
    expect(route).toContain("providerFinalizeProof: validation.proof");
    expect(route).toContain('if (uploadModeFromSessionMetadata(session.metadata) !== "signed_single_part")');
  });
});
