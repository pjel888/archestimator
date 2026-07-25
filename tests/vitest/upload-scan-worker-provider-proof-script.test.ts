import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("upload scan worker provider proof script", () => {
  const script = readFileSync(
    join(process.cwd(), "scripts/verify-cloudflare-hosted-upload-lifecycle-proof.ts"),
    "utf8",
  );

  it("requires a secret-gated HTTPS Cloudflare Worker proof endpoint", () => {
    expect(script).toContain("#!/usr/bin/env bun");
    expect(script).toContain('name: "CRON_SECRET"');
    expect(script).toContain('readEnv("CLOUDFLARE_HOSTED_UPLOAD_LIFECYCLE_BASE_URL")');
    expect(script).toContain('ENDPOINT_PATH = "/api/internal/upload-lifecycle-proof"');
    expect(script).toContain('url.protocol !== "https:"');
    expect(script).toContain("CRON_SECRET is missing from process.env or configured local env files.");
    expect(script).toContain("if (!report.readiness.hostedUploadLifecycleReady) process.exitCode = 1");
  });

  it("requires D1, R2, scanner, persistence, attachment, and cleanup readback", () => {
    expect(script).toContain("d1BindingPresent");
    expect(script).toContain("r2BindingPresent");
    expect(script).toContain("storagePutReady");
    expect(script).toContain("uploadAssetRecorded");
    expect(script).toContain("scanQueueListed");
    expect(script).toContain("scanJobRan");
    expect(script).toContain("scanResultPersisted");
    expect(script).toContain("attachmentDownloadEligible");
    expect(script).toContain("cleanupCountsAreZero(body.cleanupAfter)");
    expect(script).toContain("body.passed === true");
    expect(script).toContain("endpointReadiness.hostedUploadLifecycleReady === true");
  });

  it("keeps durable output sanitized and does not claim production cutover", () => {
    expect(script).toContain("2026-07-02-cloudflare-hosted-upload-lifecycle-proof.json");
    expect(script).toContain("does not print secret values, raw R2 keys, uploaded bytes, session cookies, customer data, or provider credentials");
    expect(script).toContain("productionCutoverReady: false");
    expect(script).not.toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(script).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(script).not.toContain('projectRef: "ebxxqidacheyapmmzavr"');
  });
});
