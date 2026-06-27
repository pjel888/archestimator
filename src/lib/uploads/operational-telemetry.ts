import type { UploadCleanupJobResult } from "./cleanup-job";
import type { UploadSurface } from "./policy";
import type { UploadScanJobResult, UploadScanResultStatus } from "./scan-job";

export type UploadOperationalTelemetryEventName =
  | "upload_cleanup_run_completed"
  | "upload_scan_job_completed"
  | "upload_rate_limited"
  | "upload_quota_exceeded"
  | "upload_backpressure_rejected";

export type UploadOperationalTelemetryRecord = {
  schemaVersion: "v1";
  event: UploadOperationalTelemetryEventName;
  source: "cleanup-job" | "admission-control" | "scan-job";
  surface?: UploadSurface | "mixed";
  workspaceId?: string;
  status?: "healthy" | "attention" | "blocked";
  severity?: "info" | "warning" | "critical";
  retryAfterSeconds?: number | null;
  quotaClass?: "request_rate_actor" | "request_rate_client" | "active_actor" | "active_workspace";
  backpressureReason?: "queue_count" | "queued_bytes" | "queue_age" | "active_workspace" | "active_actor";
  cleanupRunId?: string;
  cleanupCandidates?: number;
  cleanupRemoved?: number;
  cleanupFailed?: number;
  cleanupRejected?: number;
  cleanupQueued?: number;
  cleanupSucceeded?: number;
  cleanupAuditWriteFailures?: number;
  cleanupFailedBucketCount?: number;
  cleanupAlertCodes?: string[];
  scanRunId?: string;
  scanResultsRecorded?: number;
  scanDownloadFailures?: number;
  scanProviderFailures?: number;
  scanResultWriteFailures?: number;
  scanOutcomeCounts?: Record<UploadScanResultStatus, number>;
  scanAlertCodes?: string[];
};

type UploadOperationalTelemetrySink = (record: UploadOperationalTelemetryRecord) => void | Promise<void>;

let sink: UploadOperationalTelemetrySink | null = null;

type UploadOperationalAlertPayload = {
  schemaVersion: "v1";
  source: "archestimator-upload-operations";
  event: UploadOperationalTelemetryEventName;
  emittedAt: string;
  telemetrySource: UploadOperationalTelemetryRecord["source"];
  severity: UploadOperationalTelemetryRecord["severity"];
  status: UploadOperationalTelemetryRecord["status"];
  surface: UploadOperationalTelemetryRecord["surface"] | null;
  workspaceId: string | null;
  retryAfterSeconds: number | null;
  quotaClass: UploadOperationalTelemetryRecord["quotaClass"] | null;
  backpressureReason: UploadOperationalTelemetryRecord["backpressureReason"] | null;
  cleanup: {
    candidates: number | null;
    removed: number | null;
    failed: number | null;
    rejected: number | null;
    queued: number | null;
    succeeded: number | null;
    auditWriteFailures: number | null;
    failedBucketCount: number | null;
    alertCodes: string[];
  };
  scan: {
    resultsRecorded: number | null;
    downloadFailures: number | null;
    providerFailures: number | null;
    resultWriteFailures: number | null;
    outcomeCounts: Record<UploadScanResultStatus, number> | null;
    alertCodes: string[];
  };
};

export type UploadOperationalAlertDeliveryResult =
  | { delivered: true; statusCode: number }
  | { delivered: false; skipped: true; reason: "disabled" | "not_configured" | "missing_token" | "not_alert" | "invalid_url" }
  | { delivered: false; skipped: false; statusCode: number; reason: "webhook_rejected" };

type UploadOperationalAlertFetch = (url: string, init: RequestInit) => Promise<Response>;

function readAlertEnv(name: string) {
  return process.env[name]?.trim() || "";
}

export function shouldSendUploadOperationalAlert(record: UploadOperationalTelemetryRecord) {
  return record.severity === "warning" || record.severity === "critical";
}

function nullIfUndefined<T>(value: T | undefined): T | null {
  return value ?? null;
}

export function buildUploadOperationalAlertPayload(record: UploadOperationalTelemetryRecord): UploadOperationalAlertPayload {
  return {
    schemaVersion: "v1",
    source: "archestimator-upload-operations",
    event: record.event,
    emittedAt: new Date().toISOString(),
    telemetrySource: record.source,
    severity: record.severity,
    status: record.status,
    surface: nullIfUndefined(record.surface),
    workspaceId: nullIfUndefined(record.workspaceId),
    retryAfterSeconds: nullIfUndefined(record.retryAfterSeconds),
    quotaClass: nullIfUndefined(record.quotaClass),
    backpressureReason: nullIfUndefined(record.backpressureReason),
    cleanup: {
      candidates: nullIfUndefined(record.cleanupCandidates),
      removed: nullIfUndefined(record.cleanupRemoved),
      failed: nullIfUndefined(record.cleanupFailed),
      rejected: nullIfUndefined(record.cleanupRejected),
      queued: nullIfUndefined(record.cleanupQueued),
      succeeded: nullIfUndefined(record.cleanupSucceeded),
      auditWriteFailures: nullIfUndefined(record.cleanupAuditWriteFailures),
      failedBucketCount: nullIfUndefined(record.cleanupFailedBucketCount),
      alertCodes: record.cleanupAlertCodes ?? [],
    },
    scan: {
      resultsRecorded: nullIfUndefined(record.scanResultsRecorded),
      downloadFailures: nullIfUndefined(record.scanDownloadFailures),
      providerFailures: nullIfUndefined(record.scanProviderFailures),
      resultWriteFailures: nullIfUndefined(record.scanResultWriteFailures),
      outcomeCounts: record.scanOutcomeCounts ?? null,
      alertCodes: record.scanAlertCodes ?? [],
    },
  };
}

function alertWebhookUrl() {
  const url = readAlertEnv("UPLOAD_OPERATIONS_ALERT_WEBHOOK_URL");
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export async function sendUploadOperationalAlert(
  record: UploadOperationalTelemetryRecord,
  fetchImpl: UploadOperationalAlertFetch = fetch,
): Promise<UploadOperationalAlertDeliveryResult> {
  if (readAlertEnv("UPLOAD_OPERATIONS_ALERTS_ENABLED") !== "1") {
    return { delivered: false, skipped: true, reason: "disabled" };
  }
  if (!shouldSendUploadOperationalAlert(record)) {
    return { delivered: false, skipped: true, reason: "not_alert" };
  }

  const url = alertWebhookUrl();
  if (!url) {
    return readAlertEnv("UPLOAD_OPERATIONS_ALERT_WEBHOOK_URL")
      ? { delivered: false, skipped: true, reason: "invalid_url" }
      : { delivered: false, skipped: true, reason: "not_configured" };
  }

  const token = readAlertEnv("UPLOAD_OPERATIONS_ALERT_WEBHOOK_TOKEN");
  if (!token) return { delivered: false, skipped: true, reason: "missing_token" };

  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${token}`,
      "content-type": "application/json",
      "x-archestimator-alert-event": record.event,
    },
    body: JSON.stringify(buildUploadOperationalAlertPayload(record)),
  });

  if (!response.ok) {
    return { delivered: false, skipped: false, statusCode: response.status, reason: "webhook_rejected" };
  }

  return { delivered: true, statusCode: response.status };
}

export function setUploadOperationalTelemetrySink(next: UploadOperationalTelemetrySink | null) {
  sink = next;
}

function reportUploadOperationalTelemetry(record: UploadOperationalTelemetryRecord) {
  if (sink) {
    try {
      void Promise.resolve(sink(record)).catch(() => {
        // Telemetry must not change upload behavior.
      });
    } catch {
      // Telemetry must not change upload behavior.
    }
  }

  void sendUploadOperationalAlert(record).catch(() => {
    // Alert delivery must not change upload behavior.
  });
}

function highestCleanupSeverity(result: UploadCleanupJobResult): "info" | "warning" | "critical" {
  if (result.operationalSnapshot.alerts.some((alert) => alert.severity === "critical")) return "critical";
  if (result.operationalSnapshot.alerts.some((alert) => alert.severity === "warning")) return "warning";
  return "info";
}

function cleanupSurface(result: UploadCleanupJobResult): UploadSurface | "mixed" | undefined {
  return result.plan.candidates.length === 0 ? undefined : "mixed";
}

export function reportUploadCleanupJobTelemetry(result: UploadCleanupJobResult) {
  reportUploadOperationalTelemetry({
    schemaVersion: "v1",
    event: "upload_cleanup_run_completed",
    source: "cleanup-job",
    surface: cleanupSurface(result),
    status: result.operationalSnapshot.status,
    severity: highestCleanupSeverity(result),
    retryAfterSeconds: result.operationalSnapshot.retryAfterSeconds,
    cleanupRunId: result.runId,
    cleanupCandidates: result.metrics.candidateCount,
    cleanupRemoved: result.metrics.removedCount,
    cleanupFailed: result.metrics.failedCount,
    cleanupRejected: result.metrics.rejectedCount,
    cleanupQueued: result.audit.queuedCount,
    cleanupSucceeded: result.audit.succeededCount,
    cleanupAuditWriteFailures: result.audit.writeFailureCount,
    cleanupFailedBucketCount: result.metrics.failedBuckets.length,
    cleanupAlertCodes: result.operationalSnapshot.alerts.map((alert) => alert.code),
  });
}

function scanAlertCodes(result: UploadScanJobResult) {
  const alerts: string[] = [];
  if (result.writeFailedCount > 0) alerts.push("scan_result_write_failures");
  if (result.downloadFailedCount > 0) alerts.push("scan_download_failures");
  if (result.scannerFailedCount > 0) alerts.push("scan_provider_failures");
  if (result.outcomeCounts.infected > 0) alerts.push("scan_infected");
  if (result.outcomeCounts.failed_permanent > 0) alerts.push("scan_permanent_failures");
  if (result.outcomeCounts.failed_transient > 0) alerts.push("scan_transient_failures");
  if (result.outcomeCounts.unsupported > 0) alerts.push("scan_unsupported");
  return alerts;
}

function scanStatus(alertCodes: readonly string[]): "healthy" | "attention" | "blocked" {
  if (
    alertCodes.includes("scan_result_write_failures")
    || alertCodes.includes("scan_infected")
    || alertCodes.includes("scan_permanent_failures")
  ) {
    return "blocked";
  }
  return alertCodes.length > 0 ? "attention" : "healthy";
}

export function reportUploadScanJobTelemetry(result: UploadScanJobResult) {
  const alertCodes = scanAlertCodes(result);
  const status = scanStatus(alertCodes);

  reportUploadOperationalTelemetry({
    schemaVersion: "v1",
    event: "upload_scan_job_completed",
    source: "scan-job",
    surface: "component-attachment",
    status,
    severity: status === "blocked" ? "critical" : status === "attention" ? "warning" : "info",
    scanRunId: result.runId,
    scanResultsRecorded: result.scannedCount,
    scanDownloadFailures: result.downloadFailedCount,
    scanProviderFailures: result.scannerFailedCount,
    scanResultWriteFailures: result.writeFailedCount,
    scanOutcomeCounts: result.outcomeCounts,
    scanAlertCodes: alertCodes,
  });
}

export function reportUploadAdmissionRejected(input: {
  surface: UploadSurface;
  workspaceId: string;
  quotaClass: "request_rate_actor" | "request_rate_client" | "active_actor" | "active_workspace";
  retryAfterSeconds: number;
}) {
  const event: UploadOperationalTelemetryEventName = input.quotaClass.startsWith("request_rate")
    ? "upload_rate_limited"
    : input.quotaClass === "active_workspace"
      ? "upload_backpressure_rejected"
      : "upload_quota_exceeded";

  reportUploadOperationalTelemetry({
    schemaVersion: "v1",
    event,
    source: "admission-control",
    surface: input.surface,
    workspaceId: input.workspaceId,
    status: "blocked",
    severity: "warning",
    retryAfterSeconds: input.retryAfterSeconds,
    quotaClass: input.quotaClass,
    backpressureReason: input.quotaClass === "active_workspace"
      ? "active_workspace"
      : input.quotaClass === "active_actor"
        ? "active_actor"
        : undefined,
  });
}
