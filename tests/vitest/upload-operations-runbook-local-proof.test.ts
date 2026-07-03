import { expect, it } from "vitest";

import { optionalUploadProviderProof } from "./upload-provider-proof-fixture";

const { describeProof, proof } = optionalUploadProviderProof<{
  proofBoundary: string;
  passed: boolean;
  skipped: boolean;
  runbooksExercised: string[];
  cleanupDrill: {
    firstAttempt: { operationalSnapshot: { status: string; retryAfterSeconds: number | null } };
    retryAttempt: { operationalSnapshot: { status: string; retryAfterSeconds: number | null } };
    eventCounts: Record<string, number>;
    rawStoragePathRecorded: boolean;
  };
  scanDrill: {
    scanResultsRecorded: number;
    downloadFailedCount: number;
    scannerFailedCount: number;
    writeFailedCount: number;
    outcomeCounts: Record<string, number>;
    rawStoragePathRecorded: boolean;
  };
  overrideDrill: {
    route: string;
    apiRoute: string;
    parsed: boolean;
    targetStatus: string;
    expectedChecksumSha256Recorded: string | null;
    rawStoragePathRecorded: boolean;
  };
  telemetry: {
    records: Array<{
      event: string;
      source: string;
      status: string;
      severity: string;
      cleanupAlertCodes?: string[];
      scanAlertCodes?: string[];
    }>;
    rawStoragePathRecorded: boolean;
  };
  failedChecks: string[];
  note: string;
}>("upload-operations-runbook-local-proof.json");

describeProof("upload operations runbook local proof evidence", () => {
  it("records a passed local cleanup and scan runbook drill", () => {
    expect(proof.proofBoundary).toBe("local-in-memory-runbook-drill");
    expect(proof.passed).toBe(true);
    expect(proof.skipped).toBe(false);
    expect(proof.runbooksExercised).toEqual(["Orphan Cleanup Backlog", "Scan Backlog", "Scan Override Review"]);
    expect(proof.failedChecks).toEqual([]);

    expect(proof.cleanupDrill.firstAttempt.operationalSnapshot).toMatchObject({
      status: "blocked",
      retryAfterSeconds: 300,
    });
    expect(proof.cleanupDrill.retryAttempt.operationalSnapshot).toMatchObject({
      status: "healthy",
      retryAfterSeconds: null,
    });
    expect(proof.cleanupDrill.eventCounts).toEqual({
      cleanup_queued: 2,
      cleanup_failed: 1,
      cleanup_succeeded: 1,
    });
    expect(proof.cleanupDrill.rawStoragePathRecorded).toBe(false);

    expect(proof.scanDrill).toMatchObject({
      scanResultsRecorded: 2,
      downloadFailedCount: 1,
      scannerFailedCount: 0,
      writeFailedCount: 0,
      rawStoragePathRecorded: false,
    });
    expect(proof.scanDrill.outcomeCounts).toEqual({
      clean: 1,
      infected: 0,
      unsupported: 0,
      failed_transient: 1,
      failed_permanent: 0,
    });
    expect(proof.overrideDrill).toEqual({
      route: "/workshop/settings/scan-overrides",
      apiRoute: "/api/component-library/attachments/scan-override",
      parsed: true,
      targetStatus: "override_approved",
      expectedChecksumSha256Recorded: "b".repeat(64),
      rawStoragePathRecorded: false,
    });
  });

  it("captures path-safe telemetry and preserves the production proof boundary", () => {
    expect(proof.telemetry.rawStoragePathRecorded).toBe(false);
    expect(proof.telemetry.records).toEqual([
      expect.objectContaining({
        event: "upload_cleanup_run_completed",
        source: "cleanup-job",
        status: "blocked",
        severity: "critical",
        cleanupAlertCodes: ["cleanup_failures"],
      }),
      expect.objectContaining({
        event: "upload_cleanup_run_completed",
        source: "cleanup-job",
        status: "healthy",
        severity: "info",
        cleanupAlertCodes: [],
      }),
      expect.objectContaining({
        event: "upload_scan_job_completed",
        source: "scan-job",
        status: "attention",
        severity: "warning",
        scanAlertCodes: ["scan_download_failures", "scan_transient_failures"],
      }),
    ]);
    expect(proof.note).toContain("does not prove hosted cron invocation");
    expect(proof.note).toContain("production dashboard emission");
    expect(proof.note).toContain("observed alert delivery");
    expect(proof.note).toContain("observed hosted backpressure exercise");
    expect(proof.note).toContain("real scanner/CDR provider execution");
    expect(proof.note).toContain("hosted override operation");
  });
});
