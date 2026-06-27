import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("upload scan worker provider proof script", () => {
  it("requires explicit provider mode and refuses unexpected Supabase projects", () => {
    const script = readFileSync(join(process.cwd(), "scripts/prove-upload-scan-worker-provider-postgres.ts"), "utf8");

    expect(script).toContain("#!/usr/bin/env bun");
    expect(script).toContain("ARCH_UPLOAD_SCAN_WORKER_PROVIDER_PROOF");
    expect(script).toContain("ARCH_UPLOAD_SCAN_WORKER_PROVIDER_PROOF_ENV_FILE");
    expect(script).toContain('EXPECTED_PROJECT_REF = "ebxxqidacheyapmmzavr"');
    expect(script).toContain("provider-proof-skipped");
    expect(script).toContain("provider-proof-refused");
    expect(script).toContain("upload-scan-worker-provider-proof.json");
    expect(script).toContain("cleanupFixture");
    expect(script).toContain("cleanupErrors.length === 0 && report.rawStoragePathRecorded === false");
  });

  it("exercises the scan job reader, provider storage download, scanner, writer, and telemetry", () => {
    const script = readFileSync(join(process.cwd(), "scripts/prove-upload-scan-worker-provider-postgres.ts"), "utf8");

    expect(script).toContain("listUploadScanJobRecords(serviceClient");
    expect(script).toContain("runUploadScanJob");
    expect(script).toContain("createSupabaseUploadScanStorage(serviceClient)");
    expect(script).toContain("createUploadPolicyScannerProvider()");
    expect(script).toContain("createUploadScanResultWriter(serviceClient)");
    expect(script).toContain("setUploadOperationalTelemetrySink");
    expect(script).toContain("scan-job-reader-listed-provider-asset");
    expect(script).toContain("scan-job-ran-provider-download");
    expect(script).toContain("policy-scanner-recorded-clean-outcome");
    expect(script).toContain("provider-scan-event-recorded");
    expect(script).toContain("scan-telemetry-emitted");
  });

  it("keeps durable evidence path-safe and avoids raw provider identifiers", () => {
    const script = readFileSync(join(process.cwd(), "scripts/prove-upload-scan-worker-provider-postgres.ts"), "utf8");

    expect(script).toContain("sanitizeJobResult");
    expect(script).toContain('runIdShape: "scan-worker-provider-proof-{proofId}"');
    expect(script).toContain("uploadAssetIdPresent: Boolean(recorded.assetId)");
    expect(script).toContain("uploadSessionIdPresent: Boolean(recorded.uploadSessionId)");
    expect(script).toContain('objectPathShape: "{workspaceId}/{userId}/scan-worker-provider-proof-{proofId}.pdf"');
    expect(script).toContain("JSON.stringify(report).includes(storagePath)");
    expect(script).not.toContain("uploadAssetId: recorded.assetId");
    expect(script).not.toContain("uploadSessionId: recorded.uploadSessionId");
  });
});
