#!/usr/bin/env bun

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import type { StorageCleanupReport } from "@/lib/mass-deletion/bulk-action";
import {
  runUploadCleanupJob,
  summarizeUploadCleanupJobResult,
  type UploadCleanupEventPayload,
  type UploadCleanupJobRecord,
} from "@/lib/uploads/cleanup-job";
import {
  setUploadOperationalTelemetrySink,
  type UploadOperationalTelemetryRecord,
} from "@/lib/uploads/operational-telemetry";
import {
  runUploadScanJob,
  type UploadScanJobRecord,
  type UploadScanResultWriter,
} from "@/lib/uploads/scan-job";
import { parseUploadScanOverrideRequest } from "@/lib/uploads/scan-override";

const DEFAULT_OUTPUT = ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-operations-runbook-local-proof.json";
const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const SESSION_ID = "33333333-3333-4333-8333-333333333333";
const CLEANUP_ASSET_ID = "44444444-4444-4444-8444-444444444444";
const SCAN_CLEAN_ASSET_ID = "55555555-5555-4555-8555-555555555555";
const SCAN_FAILED_ASSET_ID = "66666666-6666-4666-8666-666666666666";
const SCAN_OVERRIDE_ASSET_ID = "77777777-7777-4777-8777-777777777777";
const CLEANUP_PATH = `${WORKSPACE_ID}/${USER_ID}/runbook-cleanup.pdf`;
const SCAN_CLEAN_PATH = `${WORKSPACE_ID}/${USER_ID}/runbook-scan-clean.pdf`;
const SCAN_FAILED_PATH = `${WORKSPACE_ID}/${USER_ID}/runbook-scan-download-failed.pdf`;
const CHECKSUM_SHA256 = "b".repeat(64);
const NOW = new Date("2026-06-27T03:30:00Z");

function outputPath() {
  return resolve(process.env.ARCH_UPLOAD_OPERATIONS_RUNBOOK_PROOF_OUTPUT?.trim() || DEFAULT_OUTPUT);
}

function writeReport(report: Record<string, unknown>) {
  const resolved = outputPath();
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(report, null, 2)}\n`);
  return resolved;
}

function cleanupRecord(): UploadCleanupJobRecord {
  return {
    assetId: CLEANUP_ASSET_ID,
    uploadAssetId: CLEANUP_ASSET_ID,
    uploadSessionId: SESSION_ID,
    workspaceId: WORKSPACE_ID,
    actorUserId: USER_ID,
    surface: "component-attachment",
    bucket: "component-attachments",
    path: CLEANUP_PATH,
    status: "deleted",
  };
}

function scanRecord(assetId: string, path: string): UploadScanJobRecord {
  return {
    assetId,
    uploadSessionId: SESSION_ID,
    workspaceId: WORKSPACE_ID,
    actorUserId: USER_ID,
    bucket: "component-attachments",
    path,
    fileName: path.endsWith("clean.pdf") ? "runbook-scan-clean.pdf" : "runbook-scan-download-failed.pdf",
    contentType: "application/pdf",
    sizeBytes: 32,
    checksumSha256: CHECKSUM_SHA256,
    scanStatus: "pending",
  };
}

function eventCounts(events: readonly UploadCleanupEventPayload[]) {
  return events.reduce<Record<string, number>>((counts, event) => {
    counts[event.eventType] = (counts[event.eventType] ?? 0) + 1;
    return counts;
  }, {});
}

function publicTelemetry(records: readonly UploadOperationalTelemetryRecord[]) {
  return records.map((record) => ({
    event: record.event,
    source: record.source,
    status: record.status,
    severity: record.severity,
    cleanupAlertCodes: record.cleanupAlertCodes,
    scanAlertCodes: record.scanAlertCodes,
  }));
}

function rawPathRecorded(value: unknown) {
  const serialized = JSON.stringify(value);
  return [CLEANUP_PATH, SCAN_CLEAN_PATH, SCAN_FAILED_PATH].some((path) => serialized.includes(path));
}

function addCheck(failedChecks: string[], label: string, passed: boolean) {
  if (!passed) failedChecks.push(label);
}

async function main() {
  const failedChecks: string[] = [];
  const telemetry: UploadOperationalTelemetryRecord[] = [];
  const cleanupEvents: UploadCleanupEventPayload[] = [];
  const scanWrites: Array<Parameters<UploadScanResultWriter["record"]>[0]> = [];

  setUploadOperationalTelemetrySink((record) => telemetry.push(record));

  try {
    const eventWriter = {
      record: async (event: UploadCleanupEventPayload) => {
        cleanupEvents.push(event);
      },
    };
    const failingCleanupStorage = {
      remove: async (targets: Array<{ bucket: string; path: string }>): Promise<StorageCleanupReport> => ({
        removed: [],
        rejected: [],
        failed: targets.map((target) => ({
          ...target,
          message: `simulated provider delete failure for ${CLEANUP_PATH}`,
        })),
      }),
    };
    const retryCleanupStorage = {
      remove: async (targets: Array<{ bucket: string; path: string }>): Promise<StorageCleanupReport> => ({
        removed: targets.map((target) => ({ ...target })),
        rejected: [],
        failed: [],
      }),
    };

    const firstCleanupAttempt = await runUploadCleanupJob({
      records: [cleanupRecord()],
      storage: failingCleanupStorage,
      eventWriter,
      now: NOW,
      runId: "runbook-cleanup-failed",
    });
    const retryCleanupAttempt = await runUploadCleanupJob({
      records: [cleanupRecord()],
      storage: retryCleanupStorage,
      eventWriter,
      now: NOW,
      runId: "runbook-cleanup-retry",
    });

    const scanResult = await runUploadScanJob({
      records: [
        scanRecord(SCAN_CLEAN_ASSET_ID, SCAN_CLEAN_PATH),
        scanRecord(SCAN_FAILED_ASSET_ID, SCAN_FAILED_PATH),
      ],
      storage: {
        download: async (target) => {
          if (target.path === SCAN_FAILED_PATH) {
            throw new Error(`simulated provider scan download failure for ${SCAN_FAILED_PATH}`);
          }

          return { bytes: new TextEncoder().encode("%PDF-1.7\nrunbook scan clean") };
        },
      },
      scanner: {
        scan: async () => ({ outcome: "clean", provider: "runbook-fixture-scanner" }),
      },
      resultWriter: {
        record: async (input) => {
          scanWrites.push(input);
        },
      },
      runId: "runbook-scan-drill",
    });

    const cleanupEventCounts = eventCounts(cleanupEvents);
    addCheck(failedChecks, "cleanup-first-attempt-blocked", firstCleanupAttempt.operationalSnapshot.status === "blocked");
    addCheck(failedChecks, "cleanup-retry-healthy", retryCleanupAttempt.operationalSnapshot.status === "healthy");
    addCheck(failedChecks, "cleanup-events-complete", cleanupEventCounts.cleanup_queued === 2 && cleanupEventCounts.cleanup_failed === 1 && cleanupEventCounts.cleanup_succeeded === 1);
    addCheck(failedChecks, "cleanup-events-path-safe", !rawPathRecorded(cleanupEvents));
    addCheck(failedChecks, "scan-drill-recorded-clean-and-transient", scanResult.outcomeCounts.clean === 1 && scanResult.outcomeCounts.failed_transient === 1);
    addCheck(failedChecks, "scan-drill-path-safe", !rawPathRecorded(scanWrites));

    const overrideRequest = parseUploadScanOverrideRequest({
      assetId: SCAN_OVERRIDE_ASSET_ID,
      expectedChecksumSha256: CHECKSUM_SHA256,
      reason: "Supplier evidence reviewed for temporary estimate validation.",
      expiresAt: "2026-07-04T03:30:00.000Z",
    }, NOW);
    const overrideDrill = {
      route: "/workshop/settings/scan-overrides",
      apiRoute: "/api/component-library/attachments/scan-override",
      parsed: overrideRequest.ok,
      targetStatus: "override_approved",
      expectedChecksumSha256Recorded: overrideRequest.ok ? overrideRequest.value.expectedChecksumSha256 : null,
      rawStoragePathRecorded: rawPathRecorded(overrideRequest),
    };
    addCheck(failedChecks, "scan-override-rehearsal-parsed", overrideDrill.parsed);
    addCheck(failedChecks, "scan-override-rehearsal-path-safe", !overrideDrill.rawStoragePathRecorded);
    addCheck(failedChecks, "telemetry-emitted", telemetry.some((record) => record.event === "upload_cleanup_run_completed") && telemetry.some((record) => record.event === "upload_scan_job_completed"));
    addCheck(failedChecks, "telemetry-path-safe", !rawPathRecorded(telemetry));

    const report = {
      generatedAt: new Date().toISOString(),
      mode: "upload-operations-runbook-local-proof",
      proofBoundary: "local-in-memory-runbook-drill",
      passed: failedChecks.length === 0,
      skipped: false,
      runbooksExercised: ["Orphan Cleanup Backlog", "Scan Backlog", "Scan Override Review"],
      cleanupDrill: {
        firstAttempt: summarizeUploadCleanupJobResult(firstCleanupAttempt),
        retryAttempt: summarizeUploadCleanupJobResult(retryCleanupAttempt),
        eventCounts: cleanupEventCounts,
        rawStoragePathRecorded: rawPathRecorded(cleanupEvents),
      },
      scanDrill: {
        runId: scanResult.runId,
        scanResultsRecorded: scanResult.scannedCount,
        downloadFailedCount: scanResult.downloadFailedCount,
        scannerFailedCount: scanResult.scannerFailedCount,
        writeFailedCount: scanResult.writeFailedCount,
        outcomeCounts: scanResult.outcomeCounts,
        rawStoragePathRecorded: rawPathRecorded(scanWrites),
      },
      overrideDrill,
      telemetry: {
        records: publicTelemetry(telemetry),
        rawStoragePathRecorded: rawPathRecorded(telemetry),
      },
      failedChecks,
      note: "Local in-memory drill only. This does not prove hosted cron invocation, production dashboard emission, observed alert delivery, observed hosted backpressure exercise, real scanner/CDR provider execution, provider-backed file scanning, or hosted override operation.",
    };

    addCheck(failedChecks, "report-path-safe", !rawPathRecorded(report));
    report.passed = failedChecks.length === 0;
    report.failedChecks = failedChecks;

    const written = writeReport(report);
    console.log(`Upload operations runbook local proof ${report.passed ? "passed" : "failed"}; output=${written}`);
    if (!report.passed) process.exitCode = 1;
  } finally {
    setUploadOperationalTelemetrySink(null);
  }
}

await main();
