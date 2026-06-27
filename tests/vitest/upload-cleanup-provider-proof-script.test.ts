import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("upload cleanup provider proof script", () => {
  it("requires explicit provider mode and exercises the upload cleanup planner before storage deletion", () => {
    const script = readFileSync(join(process.cwd(), "scripts/prove-upload-cleanup-provider-postgres.ts"), "utf8");

    expect(script).toContain("#!/usr/bin/env bun");
    expect(script).toContain("ARCH_UPLOAD_CLEANUP_PROOF");
    expect(script).toContain("ARCH_UPLOAD_CLEANUP_PROOF_ENV_FILE");
    expect(script).toContain('EXPECTED_PROJECT_REF = "ebxxqidacheyapmmzavr"');
    expect(script).toContain("provider-proof-skipped");
    expect(script).toContain("provider-proof-refused");
    expect(script).toContain("linked-provider-cleanup-execution-readback");
    expect(script).toContain("planUploadStorageCleanup");
    expect(script).toContain("buildUploadCleanupOperationalSnapshot");
    expect(script).toContain("summarizeUploadCleanup");
    expect(script).toContain("runUploadCleanupJob");
    expect(script).toContain("createUploadCleanupEventWriter");
    expect(script).not.toContain("cleanupStorageTargets(");
    expect(script).not.toContain("@/lib/mass-deletion/storage-cleanup");
  });

  it("covers planner-approved, rejected, deduped, deleted, and preserved proof cases", () => {
    const script = readFileSync(join(process.cwd(), "scripts/prove-upload-cleanup-provider-postgres.ts"), "utf8");

    expect(script).toContain("asset-component-failed-duplicate");
    expect(script).toContain("component-images:failed-thumbnail");
    expect(script).toContain("project-images:reserved-expired");
    expect(script).toContain("component-attachments:deleted-pdf");
    expect(script).toContain("component-images:finalized-preserved");
    expect(script).toContain("project-images:active-preserved");
    expect(script).toContain("component-attachments:cross-workspace-preserved");
    expect(script).toContain("component-attachments:wrong-extension-preserved");
    expect(script).toContain("component-images:traversal-rejected-unseeded");
    expect(script).toContain("service-readback-missing-after-delete");
    expect(script).toContain("service-readback-preserved-after-cleanup");
    expect(script).toContain("provider-deletes-only-planner-candidates");
    expect(script).toContain("retry-audit-events-read-back");
    expect(script).toContain("retry-audit-events-do-not-store-raw-path");
    expect(script).toContain("cleanup_queued");
    expect(script).toContain("cleanup_failed");
    expect(script).toContain("cleanup_succeeded");
  });
});
