import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildOperationalIncidentRows,
  recordOperationalIncidentInD1,
  type BuiltOperationalIncident,
} from "@/lib/observability/incident-record";

type FakePreparedStatement = {
  sql: string;
  values: unknown[];
  bind: (...values: unknown[]) => FakePreparedStatement;
  first: () => Promise<null>;
  all: () => Promise<{ results: [] }>;
  run: () => Promise<{ success: true }>;
};

class FakeD1Database {
  batchCalls: FakePreparedStatement[][] = [];
  prepared: FakePreparedStatement[] = [];
  runCalls: FakePreparedStatement[] = [];

  prepare(sql: string): FakePreparedStatement {
    const statement: FakePreparedStatement = {
      sql,
      values: [],
      bind: (...values: unknown[]) => {
        statement.values = values;
        return statement;
      },
      first: async () => null,
      all: async () => ({ results: [] }),
      run: async () => {
        this.runCalls.push(statement);
        return { success: true };
      },
    };
    this.prepared.push(statement);
    return statement;
  }

  async batch(statements: FakePreparedStatement[]) {
    this.batchCalls.push(statements);
    return statements.map(() => ({ success: true }));
  }
}

describe("operational incident records", () => {
  it("builds a redacted declaration row pair with related request ids", () => {
    const rows = buildOperationalIncidentRows({
      declaredAt: "2026-07-08T00:00:00.000Z",
      eventId: "event-1",
      id: "incident-1",
      owner: "oncall@example.com",
      relatedRequestIds: ["req_safe-1", "req_safe-1", "/share/raw-share-token?token=query-secret"],
      rootCause: "Bearer provider-secret failed for admin@example.com",
      severity: "sev2",
      summary: "API failed at /api/share/raw-share-token?recipient=raw-recipient-token",
    });

    expect(rows.incident).toMatchObject({
      closed_at: null,
      declared_at: "2026-07-08T00:00:00.000Z",
      id: "incident-1",
      severity: "sev2",
      status: "open",
    });
    expect(rows.event).toMatchObject({
      event_kind: "declared",
      id: "event-1",
      incident_id: "incident-1",
    });

    const relatedRequestIds = JSON.parse(rows.incident.related_request_ids);
    expect(relatedRequestIds).toEqual([
      "req_safe-1",
      expect.stringMatching(/^redacted-reference:[a-f0-9]{16}$/),
    ]);
    expect(rows.taintedFields).toEqual(
      expect.arrayContaining(["owner", "summary", "rootCause", "actor", "detail", "relatedRequestIds[2]"]),
    );
    expect(JSON.stringify(rows)).not.toMatch(/provider-secret|admin@example.com|oncall@example.com|raw-share-token|raw-recipient-token|query-secret/i);
  });

  it("enforces incident enum values and closed_at consistency", () => {
    expect(() =>
      buildOperationalIncidentRows({
        owner: "ops",
        severity: "sev4" as "sev1",
        summary: "bad",
      }),
    ).toThrow(/Invalid incident severity/);

    expect(() =>
      buildOperationalIncidentRows({
        owner: "ops",
        severity: "sev1",
        status: "closed",
        summary: "bad",
      }),
    ).toThrow(/closed_at is required/);

    expect(() =>
      buildOperationalIncidentRows({
        closedAt: "2026-07-08T00:00:00.000Z",
        owner: "ops",
        severity: "sev1",
        status: "resolved",
        summary: "bad",
      }),
    ).toThrow(/closed_at must be null/);
  });

  it("writes incident and event rows with a D1 batch when available", async () => {
    const database = new FakeD1Database();
    const rows: BuiltOperationalIncident = buildOperationalIncidentRows({
      declaredAt: "2026-07-08T00:00:00.000Z",
      id: "incident-1",
      eventId: "event-1",
      owner: "ops",
      severity: "sev3",
      summary: "Upload queue delay",
    });

    await expect(recordOperationalIncidentInD1(database, rows)).resolves.toEqual({
      eventId: "event-1",
      incidentId: "incident-1",
    });

    expect(database.batchCalls).toHaveLength(1);
    expect(database.batchCalls[0]?.[0]?.sql).toContain("INSERT INTO operational_incidents");
    expect(database.batchCalls[0]?.[0]?.values).toEqual([
      "incident-1",
      "2026-07-08T00:00:00.000Z",
      "sev3",
      "open",
      "ops",
      "Upload queue delay",
      null,
      "[]",
      null,
    ]);
    expect(database.batchCalls[0]?.[1]?.sql).toContain("INSERT INTO operational_incident_events");
  });
});

