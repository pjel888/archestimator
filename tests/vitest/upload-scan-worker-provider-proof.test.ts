import { expect, it } from "vitest";

import { optionalUploadProviderProof } from "./upload-provider-proof-fixture";

const { describeProof, proof } = optionalUploadProviderProof<{
  proofBoundary: string;
  passed: boolean;
  skipped?: boolean;
  projectRef: string;
  failedChecks: string[];
  cleanupErrors: unknown[];
  checks: Array<{ label: string; passed: boolean }>;
  uploadAssetIdPresent: boolean;
  uploadSessionIdPresent: boolean;
  objectPathShape: string;
  jobResult: {
    runIdShape: string;
    scannedCount: number;
    writeFailedCount: number;
    downloadFailedCount: number;
    scannerFailedCount: number;
    outcomeCounts: Record<string, number>;
  };
  scanReadback: {
    status: string | null;
    provider: string | null;
    scannedAtPresent: boolean;
    scanResultKeys: string[];
    eventTypes: string[];
  };
  telemetry: Array<{
    event: string;
    source: string;
    status: string;
    severity: string;
    scanResultsRecorded: number;
    scanOutcomeCounts: Record<string, number>;
  }>;
  rawStoragePathRecorded: boolean;
}>("upload-scan-worker-provider-proof.json");

describeProof("upload scan worker provider proof evidence", () => {
  it("records a passed linked-provider scan worker readback proof", () => {
    expect(proof.proofBoundary).toBe("linked-provider-operation-proof");
    expect(proof.passed).toBe(true);
    expect(proof.skipped).not.toBe(true);
    expect(proof.projectRef).toBe("ebxxqidacheyapmmzavr");
    expect(proof.failedChecks).toEqual([]);
    expect(proof.cleanupErrors).toEqual([]);
    expect(proof.checks.every((check) => check.passed)).toBe(true);
  });

  it("proves provider download, policy scan, event persistence, and telemetry", () => {
    expect(proof.checks.map((check) => check.label)).toEqual([
      "provider-storage-object-seeded",
      "pending-upload-asset-recorded",
      "scan-job-reader-listed-provider-asset",
      "scan-job-ran-provider-download",
      "policy-scanner-recorded-clean-outcome",
      "provider-scan-status-readback-clean",
      "provider-scan-event-recorded",
      "scan-telemetry-emitted",
    ]);
    expect(proof.jobResult).toMatchObject({
      runIdShape: "scan-worker-provider-proof-{proofId}",
      scannedCount: 1,
      writeFailedCount: 0,
      downloadFailedCount: 0,
      scannerFailedCount: 0,
      outcomeCounts: {
        clean: 1,
        infected: 0,
        unsupported: 0,
        failed_transient: 0,
        failed_permanent: 0,
      },
    });
    expect(proof.scanReadback).toMatchObject({
      status: "clean",
      provider: "archestimator-policy-scanner",
      scannedAtPresent: true,
      eventTypes: ["scan_pending", "scan_clean"],
    });
    expect(proof.scanReadback.scanResultKeys).toEqual(["checks", "scanJobRunId", "scannerVersion"]);
    expect(proof.telemetry).toEqual([
      expect.objectContaining({
        event: "upload_scan_job_completed",
        source: "scan-job",
        status: "healthy",
        severity: "info",
        scanResultsRecorded: 1,
        scanOutcomeCounts: expect.objectContaining({ clean: 1 }),
      }),
    ]);
  });

  it("redacts provider-specific proof identifiers and raw storage paths", () => {
    expect(proof.uploadAssetIdPresent).toBe(true);
    expect(proof.uploadSessionIdPresent).toBe(true);
    expect(proof.objectPathShape).toBe("{workspaceId}/{userId}/scan-worker-provider-proof-{proofId}.pdf");
    expect(proof.rawStoragePathRecorded).toBe(false);

    const serialized = JSON.stringify(proof);
    expect(serialized).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    expect(serialized).not.toContain("storage_path");
    expect(serialized).not.toContain("storagePath");
    expect(serialized).not.toContain("access_token");
    expect(serialized).not.toContain("refresh_token");
    expect(serialized).not.toContain("Bearer ");
    expect(serialized).not.toContain("password");
  });
});
