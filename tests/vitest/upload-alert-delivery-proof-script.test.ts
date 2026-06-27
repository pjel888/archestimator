import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  runUploadAlertDeliveryProductionProof,
  writeUploadAlertDeliveryProductionProofReport,
} from "../../scripts/verify-upload-alert-delivery";

function configureAlertEnv() {
  vi.stubEnv("ARCH_UPLOAD_ALERT_DELIVERY_PROOF", "1");
  vi.stubEnv("UPLOAD_OPERATIONS_ALERTS_ENABLED", "1");
  vi.stubEnv("UPLOAD_OPERATIONS_ALERT_WEBHOOK_URL", "https://alerts.example.test/upload/team-prod");
  vi.stubEnv("UPLOAD_OPERATIONS_ALERT_WEBHOOK_TOKEN", "secret-token");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("upload alert delivery production proof script", () => {
  it("fails closed without explicit proof opt-in and does not call the webhook", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 })) as unknown as typeof fetch;

    const report = await runUploadAlertDeliveryProductionProof({
      generatedAt: "2026-06-27T00:00:00.000Z",
      fetchImpl: fetchMock,
      hostedObservationConfirmed: true,
    });

    expect(report.passed).toBe(false);
    expect(report.skipped).toBe(true);
    expect(report.proofBoundary).toBe("hosted-alert-delivery-proof-skipped");
    expect(report.failedChecks).toContain("alert-delivery-explicit-proof-opt-in");
    expect(report.delivery.delivered).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires hosted observation confirmation before sending production alert proof", async () => {
    configureAlertEnv();
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 })) as unknown as typeof fetch;

    const report = await runUploadAlertDeliveryProductionProof({
      generatedAt: "2026-06-27T00:00:00.000Z",
      fetchImpl: fetchMock,
      hostedObservationConfirmed: false,
    });

    expect(report.passed).toBe(false);
    expect(report.skipped).toBe(false);
    expect(report.failedChecks).toContain("alert-delivery-hosted-observation-confirmed");
    expect(report.delivery.reason).toContain("ARCH_UPLOAD_ALERT_DELIVERY_HOSTED_OBSERVED");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("passes only after a hosted 2xx alert delivery and does not record secrets or raw webhook URLs", async () => {
    configureAlertEnv();
    const observedHeaders: string[] = [];
    const observedBodies: string[] = [];
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      observedHeaders.push(headers.get("authorization") ?? "");
      observedBodies.push(String(init?.body ?? ""));
      return new Response(null, { status: 204 });
    }) as unknown as typeof fetch;

    const report = await runUploadAlertDeliveryProductionProof({
      generatedAt: "2026-06-27T00:00:00.000Z",
      fetchImpl: fetchMock,
      hostedObservationConfirmed: true,
    });

    expect(report.passed).toBe(true);
    expect(report.proofBoundary).toBe("hosted-alert-delivery-observation");
    expect(report.delivery).toMatchObject({
      delivered: true,
      statusCode: 204,
      secretRedacted: true,
      webhookUrlRedacted: true,
      payloadPathSafe: true,
    });
    expect(report.failedChecks).toEqual([]);
    expect(observedHeaders).toEqual(["Bearer secret-token"]);

    const body = JSON.parse(observedBodies[0]);
    expect(body).toMatchObject({
      event: "upload_backpressure_rejected",
      telemetrySource: "admission-control",
      severity: "warning",
      status: "blocked",
      quotaClass: "active_workspace",
      backpressureReason: "active_workspace",
    });
    expect(JSON.stringify(body)).not.toContain("secret-token");
    expect(JSON.stringify(report)).not.toContain("secret-token");
    expect(JSON.stringify(report)).not.toContain("https://alerts.example.test/upload/team-prod");
    expect(JSON.stringify(report)).not.toMatch(/storage_path|file_name|component-attachments\/|private\/|Bearer secret-token/i);
  });

  it("fails closed on webhook rejection while preserving sanitized evidence", async () => {
    configureAlertEnv();
    const fetchMock = vi.fn(async () => new Response("not accepted", { status: 503 })) as unknown as typeof fetch;

    const report = await runUploadAlertDeliveryProductionProof({
      generatedAt: "2026-06-27T00:00:00.000Z",
      fetchImpl: fetchMock,
      hostedObservationConfirmed: true,
    });

    expect(report.passed).toBe(false);
    expect(report.proofBoundary).toBe("hosted-alert-delivery-proof-failed");
    expect(report.delivery).toMatchObject({
      delivered: false,
      statusCode: 503,
      reason: "webhook_rejected",
      secretRedacted: true,
      webhookUrlRedacted: true,
      payloadPathSafe: true,
    });
    expect(report.failedChecks).toContain("alert-delivery-observed");
    expect(report.failedChecks).toContain("alert-delivery-status-2xx");
    expect(JSON.stringify(report)).not.toContain("secret-token");
  });

  it("writes sanitized proof artifacts", async () => {
    const report = await runUploadAlertDeliveryProductionProof({
      generatedAt: "2026-06-27T00:00:00.000Z",
      hostedObservationConfirmed: false,
    });
    const dir = mkdtempSync(join(tmpdir(), "upload-alert-delivery-proof-"));
    try {
      const output = join(dir, "report.json");
      writeUploadAlertDeliveryProductionProofReport(report, output);
      const saved = readFileSync(output, "utf8");

      expect(JSON.parse(saved)).toEqual(report);
      expect(saved).not.toContain("Bearer ");
      expect(saved).not.toMatch(/secret-token|alerts\.example\.test\/upload/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
