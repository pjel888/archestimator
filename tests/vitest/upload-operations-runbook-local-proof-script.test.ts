import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const script = readFileSync(join(process.cwd(), "scripts/prove-upload-operations-runbook-local.ts"), "utf8");

describe("upload operations runbook local proof script", () => {
  it("exercises cleanup and scan runbook drills without provider credentials", () => {
    expect(script).toContain("#!/usr/bin/env bun");
    expect(script).toContain("upload-operations-runbook-local-proof.json");
    expect(script).toContain("local-in-memory-runbook-drill");
    expect(script).toContain("runUploadCleanupJob");
    expect(script).toContain("runUploadScanJob");
    expect(script).toContain("parseUploadScanOverrideRequest");
    expect(script).toContain("summarizeUploadCleanupJobResult");
    expect(script).toContain("setUploadOperationalTelemetrySink");
    expect(script).toContain("Orphan Cleanup Backlog");
    expect(script).toContain("Scan Backlog");
    expect(script).toContain("Scan Override Review");
    expect(script).toContain("/workshop/settings/scan-overrides");
    expect(script).toContain("/api/component-library/attachments/scan-override");
    expect(script).not.toContain("createClient(");
    expect(script).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("guards the report against raw object paths and labels missing production proof", () => {
    expect(script).toContain("rawPathRecorded");
    expect(script).toContain("report-path-safe");
    expect(script).toContain("Local in-memory drill only");
    expect(script).toContain("does not prove hosted cron invocation");
    expect(script).toContain("production dashboard emission");
    expect(script).toContain("observed alert delivery");
    expect(script).toContain("observed hosted backpressure exercise");
    expect(script).toContain("real scanner/CDR provider execution");
    expect(script).toContain("hosted override operation");
  });
});
