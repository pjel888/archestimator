import { describe, expect, it, vi } from "vitest";

import {
  buildDeclareIncidentSql,
  buildOperationalIncidentRecordReport,
  parseOperationalIncidentRecordArgs,
  runOperationalIncidentRecord,
} from "@/../scripts/record-operational-incident";
import { buildOperationalIncidentRows } from "@/lib/observability/incident-record-core";

describe("operational incident record script", () => {
  it("parses declare arguments with safe defaults", () => {
    expect(parseOperationalIncidentRecordArgs([
      "declare",
      "--severity",
      "sev2",
      "--owner",
      "ops",
      "--summary",
      "Queue delay",
      "--request-id",
      "req_12345678",
      "--dry-run",
    ])).toMatchObject({
      action: "declare",
      database: "ARCH_DB",
      dryRun: true,
      owner: "ops",
      requestIds: ["req_12345678"],
      scope: "local",
      severity: "sev2",
      summary: "Queue delay",
    });
  });

  it("rejects unsafe incident ids before generating SQL", () => {
    expect(() => parseOperationalIncidentRecordArgs([
      "note",
      "--incident-id",
      "/share/raw-token",
      "--actor",
      "ops",
      "--detail",
      "bad",
    ])).toThrow(/incident id must match/);
  });

  it("builds declaration SQL with escaped strings and a declared event", () => {
    const rows = buildOperationalIncidentRows({
      declaredAt: "2026-07-08T00:00:00.000Z",
      eventId: "event-1",
      id: "incident-1",
      owner: "ops",
      severity: "sev3",
      summary: "Owner's queue delay",
    });
    const sql = buildDeclareIncidentSql(rows);

    expect(sql).toContain("INSERT INTO operational_incidents");
    expect(sql).toContain("INSERT INTO operational_incident_events");
    expect(sql).toContain("'declared'");
    expect(sql).toContain("'Owner''s queue delay'");
  });

  it("dry-runs a redacted declaration report without exposing raw secrets", () => {
    const parsed = parseOperationalIncidentRecordArgs([
      "declare",
      "--severity",
      "sev1",
      "--owner",
      "oncall@example.com",
      "--summary",
      "Failure at /share/raw-token?recipient=secret-recipient",
      "--detail",
      "Bearer provider-token failed",
      "--request-id",
      "/share/raw-token?token=secret-token",
      "--dry-run",
      "--now",
      "2026-07-08T00:00:00.000Z",
    ]);

    const report = buildOperationalIncidentRecordReport(parsed);

    expect(report.ready).toBe(true);
    expect(report.command.attempted).toBe(false);
    expect(report.taintedFields).toEqual(expect.arrayContaining([
      "owner",
      "summary",
      "actor",
      "detail",
      "relatedRequestIds[0]",
    ]));
    expect(JSON.stringify(report)).not.toMatch(/oncall@example.com|provider-token|raw-token|secret-recipient|secret-token/i);
  });

  it("does not send incident alerts during dry-run recording", async () => {
    const parsed = parseOperationalIncidentRecordArgs([
      "declare",
      "--severity",
      "sev2",
      "--owner",
      "ops",
      "--summary",
      "Queue delay",
      "--dry-run",
      "--now",
      "2026-07-08T00:00:00.000Z",
    ]);
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 })) as unknown as typeof fetch;

    const report = await runOperationalIncidentRecord(parsed, {
      env: {
        OPERATIONAL_INCIDENT_ALERTS_ENABLED: "1",
        OPERATIONAL_INCIDENT_ALERT_WEBHOOK_URL: "https://alerts.example.test/incidents",
        OPERATIONAL_INCIDENT_ALERT_WEBHOOK_TOKEN: "secret-token",
      },
      fetchImpl: fetchMock,
    });

    expect(report.ready).toBe(true);
    expect(report.alertDelivery).toMatchObject({
      attempted: false,
      delivered: false,
      skipped: true,
      reason: "dry_run",
      webhookUrlRedacted: true,
      secretRedacted: true,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
