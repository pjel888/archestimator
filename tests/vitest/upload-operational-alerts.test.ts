import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildUploadOperationalAlertDeliveryLogRecord,
  buildUploadOperationalAlertPayload,
  reportUploadAdmissionRejected,
  sendUploadOperationalAlert,
  shouldSendUploadOperationalAlert,
  type UploadOperationalTelemetryRecord,
} from "@/lib/uploads/operational-telemetry";

const warningRecord: UploadOperationalTelemetryRecord = {
  schemaVersion: "v1",
  event: "upload_backpressure_rejected",
  source: "admission-control",
  surface: "component-attachment",
  workspaceId: "workspace-1",
  status: "blocked",
  severity: "warning",
  retryAfterSeconds: 10,
  quotaClass: "active_workspace",
  backpressureReason: "active_workspace",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("upload operational alert delivery", () => {
  it("is disabled by default and ignores healthy informational telemetry", async () => {
    const fetchMock = vi.fn();

    await expect(sendUploadOperationalAlert(warningRecord, fetchMock)).resolves.toEqual({
      delivered: false,
      skipped: true,
      reason: "disabled",
    });

    vi.stubEnv("UPLOAD_OPERATIONS_ALERTS_ENABLED", "1");
    vi.stubEnv("UPLOAD_OPERATIONS_ALERT_WEBHOOK_URL", "https://alerts.example.test/upload");
    vi.stubEnv("UPLOAD_OPERATIONS_ALERT_WEBHOOK_TOKEN", "secret-token");

    await expect(sendUploadOperationalAlert({
      schemaVersion: "v1",
      event: "upload_scan_job_completed",
      source: "scan-job",
      status: "healthy",
      severity: "info",
      scanResultsRecorded: 1,
    }, fetchMock)).resolves.toEqual({
      delivered: false,
      skipped: true,
      reason: "not_alert",
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires an HTTPS webhook URL and bearer token before delivery", async () => {
    vi.stubEnv("UPLOAD_OPERATIONS_ALERTS_ENABLED", "1");
    vi.stubEnv("UPLOAD_OPERATIONS_ALERT_WEBHOOK_URL", "http://alerts.example.test/upload");
    const fetchMock = vi.fn();

    await expect(sendUploadOperationalAlert(warningRecord, fetchMock)).resolves.toEqual({
      delivered: false,
      skipped: true,
      reason: "invalid_url",
    });

    vi.stubEnv("UPLOAD_OPERATIONS_ALERT_WEBHOOK_URL", "https://alerts.example.test/upload");
    await expect(sendUploadOperationalAlert(warningRecord, fetchMock)).resolves.toEqual({
      delivered: false,
      skipped: true,
      reason: "missing_token",
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("builds path-safe alert payloads without tokens, paths, client IPs, or run identifiers", () => {
    const payload = buildUploadOperationalAlertPayload({
      ...warningRecord,
      cleanupRunId: "cleanup-run-private",
      cleanupFailed: 2,
      cleanupAlertCodes: ["cleanup_failures"],
      scanRunId: "scan-run-private",
      scanAlertCodes: ["scan_download_failures"],
    });

    expect(payload).toMatchObject({
      schemaVersion: "v1",
      source: "archestimator-upload-operations",
      event: "upload_backpressure_rejected",
      telemetrySource: "admission-control",
      severity: "warning",
      status: "blocked",
      surface: "component-attachment",
      workspaceId: "workspace-1",
      retryAfterSeconds: 10,
      quotaClass: "active_workspace",
      backpressureReason: "active_workspace",
      cleanup: {
        failed: 2,
        alertCodes: ["cleanup_failures"],
      },
      scan: {
        alertCodes: ["scan_download_failures"],
      },
    });

    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain("cleanup-run-private");
    expect(serialized).not.toContain("scan-run-private");
    expect(serialized).not.toMatch(/storage_path|private\/path|access_token|secret-token|Bearer|203\.0\.113\./i);
  });

  it("posts configured warning alerts with sanitized JSON only", async () => {
    vi.stubEnv("UPLOAD_OPERATIONS_ALERTS_ENABLED", "1");
    vi.stubEnv("UPLOAD_OPERATIONS_ALERT_WEBHOOK_URL", "https://alerts.example.test/upload");
    vi.stubEnv("UPLOAD_OPERATIONS_ALERT_WEBHOOK_TOKEN", "secret-token");
    const fetchMock = vi.fn(async () => new Response(null, { status: 202 }));

    await expect(sendUploadOperationalAlert(warningRecord, fetchMock)).resolves.toEqual({
      delivered: true,
      statusCode: 202,
    });

    expect(shouldSendUploadOperationalAlert(warningRecord)).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("https://alerts.example.test/upload", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({
        authorization: "Bearer secret-token",
        "content-type": "application/json",
        "x-archestimator-alert-event": "upload_backpressure_rejected",
      }),
    }));
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toMatchObject({
      event: "upload_backpressure_rejected",
      quotaClass: "active_workspace",
      backpressureReason: "active_workspace",
    });
    expect(JSON.stringify(body)).not.toContain("secret-token");
  });

  it("builds structured self-health logs for alert delivery outcomes", () => {
    expect(buildUploadOperationalAlertDeliveryLogRecord(warningRecord, {
      delivered: false,
      skipped: true,
      reason: "disabled",
    })).toBeNull();

    expect(buildUploadOperationalAlertDeliveryLogRecord(warningRecord, {
      delivered: false,
      skipped: true,
      reason: "missing_token",
    })).toMatchObject({
      level: "warn",
      event: "operational_alert_failed",
      context: {
        alert_source: "upload-operations",
        reason: "missing_token",
      },
    });

    expect(buildUploadOperationalAlertDeliveryLogRecord(warningRecord, {
      delivered: false,
      skipped: false,
      statusCode: 503,
      reason: "webhook_rejected",
    })).toMatchObject({
      level: "error",
      event: "operational_alert_failed",
      context: {
        status_code: 503,
      },
    });

    expect(buildUploadOperationalAlertDeliveryLogRecord(warningRecord, {
      delivered: true,
      statusCode: 202,
    })).toMatchObject({
      level: "info",
      event: "operational_alert_sent",
      context: {
        status_code: 202,
      },
    });
  });

  it("logs failed fire-and-forget alert delivery without changing upload behavior", async () => {
    vi.stubEnv("ARCHESTIMATOR_DEV_LOG_DISABLED", "1");
    vi.stubEnv("UPLOAD_OPERATIONS_ALERTS_ENABLED", "1");
    vi.stubEnv("UPLOAD_OPERATIONS_ALERT_WEBHOOK_URL", "https://alerts.example.test/upload");
    vi.stubEnv("UPLOAD_OPERATIONS_ALERT_WEBHOOK_TOKEN", "secret-token");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 503 })));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    reportUploadAdmissionRejected({
      surface: "component-attachment",
      workspaceId: "workspace-1",
      quotaClass: "active_workspace",
      retryAfterSeconds: 10,
    });

    await vi.waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("\"event\":\"operational_alert_failed\""));
    });
    expect(errorSpy.mock.calls.map(([line]) => String(line)).join("\n")).not.toContain("secret-token");
  });
});
