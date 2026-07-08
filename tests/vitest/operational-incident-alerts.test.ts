import { describe, expect, it, vi } from "vitest";

import {
  buildOperationalIncidentAlertPayload,
  operationalIncidentAlertPayloadPathSafe,
  sendOperationalIncidentAlert,
} from "@/lib/observability/operational-alerts";

const configuredEnv = {
  OPERATIONAL_INCIDENT_ALERTS_ENABLED: "1",
  OPERATIONAL_INCIDENT_ALERT_WEBHOOK_URL: "https://alerts.example.test/incidents",
  OPERATIONAL_INCIDENT_ALERT_WEBHOOK_TOKEN: "secret-token",
};

describe("operational incident alerts", () => {
  it("builds a redacted incident alert payload without raw secrets or private paths", () => {
    const payload = buildOperationalIncidentAlertPayload({
      action: "declare",
      database: "ARCH_DB",
      scope: "remote",
      incidentId: "incident-1",
      eventId: "event-1",
      generatedAt: "2026-07-08T00:00:00.000Z",
      severity: "sev1",
      status: "open",
      owner: "oncall@example.com",
      actor: "ops@example.com",
      summary: "Share failure at /share/raw-token?recipient=secret-recipient",
      detail: "Bearer provider-token failed",
      relatedRequestIds: ["/share/raw-token?token=secret-token", "req_123456"],
    });

    expect(payload).toMatchObject({
      source: "archestimator-operational-incidents",
      event: "incident_declared",
      environment: "production",
      incident: {
        id: "incident-1",
        eventId: "event-1",
        severity: "sev1",
        status: "open",
      },
    });
    expect(payload.taintedFields).toEqual(expect.arrayContaining([
      "owner",
      "actor",
      "summary",
      "detail",
      "relatedRequestIds[0]",
    ]));
    expect(operationalIncidentAlertPayloadPathSafe(payload)).toBe(true);
    expect(JSON.stringify(payload)).not.toMatch(/oncall@example.com|ops@example.com|raw-token|secret-recipient|provider-token|secret-token/i);
  });

  it("skips without alert opt-in and never calls the webhook", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 })) as unknown as typeof fetch;

    const result = await sendOperationalIncidentAlert({
      action: "declare",
      database: "ARCH_DB",
      scope: "remote",
      incidentId: "incident-1",
      eventId: "event-1",
      severity: "sev2",
      summary: "Queue delay",
    }, { env: {}, fetchImpl: fetchMock });

    expect(result).toMatchObject({ delivered: false, skipped: true, reason: "disabled" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips local-scope alerts unless explicitly allowed", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 })) as unknown as typeof fetch;

    const result = await sendOperationalIncidentAlert({
      action: "declare",
      database: "ARCH_DB",
      scope: "local",
      incidentId: "incident-1",
      eventId: "event-1",
      severity: "sev2",
      summary: "Local dry run",
    }, { env: configuredEnv, fetchImpl: fetchMock });

    expect(result).toMatchObject({ delivered: false, skipped: true, reason: "local_scope" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends a sanitized remote incident alert through an HTTPS webhook", async () => {
    const observedBodies: string[] = [];
    const observedHeaders: string[] = [];
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      observedHeaders.push(headers.get("authorization") ?? "");
      observedBodies.push(String(init?.body ?? ""));
      return new Response(null, { status: 202 });
    }) as unknown as typeof fetch;

    const result = await sendOperationalIncidentAlert({
      action: "status",
      database: "ARCH_DB",
      scope: "remote",
      incidentId: "incident-1",
      eventId: "event-1",
      status: "contained",
      actor: "ops",
      detail: "Contained by queue pause",
    }, { env: configuredEnv, fetchImpl: fetchMock });

    expect(result).toMatchObject({
      delivered: true,
      skipped: false,
      statusCode: 202,
      payloadPathSafe: true,
    });
    expect(observedHeaders).toEqual(["Bearer secret-token"]);
    expect(JSON.parse(observedBodies[0])).toMatchObject({
      source: "archestimator-operational-incidents",
      event: "incident_status_changed",
      incident: {
        id: "incident-1",
        eventId: "event-1",
        status: "contained",
      },
    });
    expect(observedBodies[0]).not.toMatch(/secret-token/i);
  });
});
