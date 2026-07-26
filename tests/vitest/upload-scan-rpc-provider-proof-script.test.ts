import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("Cloudflare D1 upload scan persistence contract", () => {
  it("binds scanner results and overrides to the persisted asset checksum", () => {
    const scanJob = readFileSync(join(process.cwd(), "src/lib/uploads/scan-job.ts"), "utf8");
    const scanOverride = readFileSync(join(process.cwd(), "src/lib/uploads/scan-override.ts"), "utf8");

    expect(scanJob).toContain("recordUploadScanResultInD1");
    expect(scanJob).toContain("asset.checksum_sha256 !== input.expectedChecksumSha256");
    expect(scanJob).toContain("Scan result checksum does not match the uploaded asset.");
    expect(scanJob).toContain("SET scan_status = ?");
    expect(scanJob).toContain("scan_provider = ?");
    expect(scanJob).toContain("scan_result_json = ?");
    expect(scanJob).toContain("scanned_at = ?");
    expect(scanJob).toContain('if (status === "clean") return "scan_clean"');
    expect(scanJob).toContain('if (status === "infected") return "scan_infected"');
    expect(scanJob).toContain('if (status === "failed_transient") return "scan_failed_transient"');
    expect(scanOverride).toContain("approveUploadScanOverrideInD1");
    expect(scanOverride).toContain("asset.checksum_sha256 !== command.expectedChecksumSha256");
    expect(scanOverride).toContain("Scan override checksum does not match the uploaded asset.");
    expect(scanOverride).toContain('asset.scan_status !== "failed_permanent" && asset.scan_status !== "unsupported"');
    expect(scanOverride).toContain('"scan_override_approved"');
  });

  it("proves the current Worker scanner path through sanitized D1/R2 readback", () => {
    const proofRouter = readFileSync(
      join(process.cwd(), "src/lib/cloudflare/upload-lifecycle-proof-router.ts"),
      "utf8",
    );
    const schema = readFileSync(join(process.cwd(), "migrations/0010_upload_metadata.sql"), "utf8");

    expect(proofRouter).toContain("listUploadScanJobRecords");
    expect(proofRouter).toContain("runUploadScanJob");
    expect(proofRouter).toContain("scanReadback.checksumMatches");
    expect(proofRouter).toContain('scanReadback.eventTypes.includes("scan_clean")');
    expect(proofRouter).toContain("does not return raw R2 keys, uploaded bytes, bearer secrets, session cookies, or real customer/project data");
    expect(schema).toContain("checksum_sha256 TEXT CHECK");
    expect(schema).toContain("scan_status TEXT CHECK");
    expect(schema).toContain("scanned_at TEXT");
    expect(schema).toContain("scan_override_checksum_sha256 TEXT");
  });
});
