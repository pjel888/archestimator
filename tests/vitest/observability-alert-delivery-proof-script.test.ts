import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  runObservabilityAlertDeliveryProof,
  writeObservabilityAlertDeliveryProofReport,
} from "@/../scripts/verify-observability-alert-delivery";

function configureAlertEnv() {
  vi.stubEnv("OBSERVABILITY_ALERT_DELIVERY_PROOF", "1");
  vi.stubEnv("OBSERVABILITY_ALERT_DELIVERY_HOSTED_OBSERVED", "1");
  vi.stubEnv("OBSERVABILITY_ALERT_WEBHOOK_URL", "https://alerts.example.test/observability/team-prod");
  vi.stubEnv("OBSERVABILITY_ALERT_WEBHOOK_TOKEN", "secret-token");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("observability alert delivery proof script", () => {
  it("fails closed without explicit proof opt-in and does not call the webhook", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 })) as unknown as typeof fetch;

    const report = await runObservabilityAlertDeliveryProof({
      scenario: "uptime",
      generatedAt: "2026-07-08T00:00:00.000Z",
      fetchImpl: fetchMock,
      hostedObservationConfirmed: true,
    });

    expect(report.passed).toBe(false);
    expect(report.skipped).toBe(true);
    expect(report.proofBoundary).toBe("hosted-alert-delivery-proof-skipped");
    expect(report.failedChecks).toContain("alert-delivery-explicit-proof-opt-in");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires hosted observation confirmation before sending", async () => {
    configureAlertEnv();
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 })) as unknown as typeof fetch;

    const report = await runObservabilityAlertDeliveryProof({
      scenario: "error-rate",
      generatedAt: "2026-07-08T00:00:00.000Z",
      fetchImpl: fetchMock,
      hostedObservationConfirmed: false,
    });

    expect(report.passed).toBe(false);
    expect(report.failedChecks).toContain("alert-delivery-hosted-observation-confirmed");
    expect(report.delivery.reason).toBe("OBSERVABILITY_ALERT_DELIVERY_HOSTED_OBSERVED=1 is required before sending production alert proof.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("passes after a hosted 2xx alert delivery and records no secrets or raw webhook URLs", async () => {
    configureAlertEnv();
    const observedHeaders: string[] = [];
    const observedBodies: string[] = [];
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      observedHeaders.push(headers.get("authorization") ?? "");
      observedBodies.push(String(init?.body ?? ""));
      return new Response(null, { status: 202 });
    }) as unknown as typeof fetch;

    const report = await runObservabilityAlertDeliveryProof({
      scenario: "incident-escalation",
      generatedAt: "2026-07-08T00:00:00.000Z",
      fetchImpl: fetchMock,
    });

    expect(report.passed).toBe(true);
    expect(report.proofBoundary).toBe("hosted-alert-delivery-observation");
    expect(report.scenario).toBe("incident-escalation");
    expect(report.delivery).toMatchObject({
      delivered: true,
      observedAt: "2026-07-08T00:00:00.000Z",
      statusCode: 202,
      recipientRedacted: true,
      secretRedacted: true,
      webhookUrlRedacted: true,
      payloadPathSafe: true,
    });
    expect(report.failedChecks).toEqual([]);
    expect(observedHeaders).toEqual(["Bearer secret-token"]);
    expect(JSON.parse(observedBodies[0])).toMatchObject({
      source: "archestimator-operational-incidents",
      event: "incident_declared",
      sample: true,
      incident: {
        id: "incident-escalation-proof",
        eventId: "incident-escalation-proof-event",
        severity: "sev1",
        status: "open",
      },
    });
    expect(JSON.stringify(report)).not.toContain("secret-token");
    expect(JSON.stringify(report)).not.toContain("alerts.example.test/observability");
    expect(JSON.stringify(report)).not.toMatch(/storage_path|file_name|component-attachments\/|private\/|Bearer secret-token|invite_token/i);
  });

  it("fails closed on webhook rejection while preserving sanitized evidence", async () => {
    configureAlertEnv();
    const fetchMock = vi.fn(async () => new Response("nope", { status: 503 })) as unknown as typeof fetch;

    const report = await runObservabilityAlertDeliveryProof({
      scenario: "uptime",
      generatedAt: "2026-07-08T00:00:00.000Z",
      fetchImpl: fetchMock,
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

  it("writes sanitized scenario proof artifacts", async () => {
    const report = await runObservabilityAlertDeliveryProof({
      scenario: "error-rate",
      generatedAt: "2026-07-08T00:00:00.000Z",
      hostedObservationConfirmed: false,
    });
    const dir = mkdtempSync(join(tmpdir(), "observability-alert-delivery-proof-"));
    try {
      const output = join(dir, "report.json");
      writeObservabilityAlertDeliveryProofReport(report, output);
      const saved = readFileSync(output, "utf8");

      expect(JSON.parse(saved)).toEqual(report);
      expect(saved).not.toContain("Bearer ");
      expect(saved).not.toMatch(/secret-token|alerts\.example\.test\/observability/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("hashes raw recipient-like channel labels", async () => {
    configureAlertEnv();
    vi.stubEnv("OBSERVABILITY_ALERT_CHANNEL", "alerts@example.test");
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 })) as unknown as typeof fetch;

    const report = await runObservabilityAlertDeliveryProof({
      scenario: "uptime",
      generatedAt: "2026-07-08T00:00:00.000Z",
      fetchImpl: fetchMock,
    });

    expect(report.passed).toBe(true);
    expect(report.delivery.channel).toMatch(/^email:[a-f0-9]{12}$/);
    expect(JSON.stringify(report)).not.toContain("alerts@example.test");
  });
});
