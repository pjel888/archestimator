import { describe, expect, it } from "vitest";

import {
  buildOperationalIncidentsReadinessReport,
  normalizeIncidentStatusRows,
  parseWranglerD1JsonOutput,
  readIncidentResolveThresholds,
  type WranglerQueryResult,
} from "@/../scripts/check-operational-incidents";

describe("operational incidents readiness script", () => {
  it("parses Wrangler D1 JSON after human-readable prelude lines", () => {
    const parsed = parseWranglerD1JsonOutput(`
      ⛅️ wrangler
      Resource location: remote
      [
        {"results":[{"name":"operational_incidents"}],"success":true}
      ]
    `);

    expect(parsed?.[0]?.results).toEqual([{ name: "operational_incidents" }]);
  });

  it("flags open or contained incidents beyond severity resolve SLA", () => {
    const rows = normalizeIncidentStatusRows(
      [
        {
          id: "sev1-old",
          severity: "sev1",
          status: "open",
          owner: "ops",
          summary: "old sev1",
          declared_at: "2026-07-08T00:00:00.000Z",
          closed_at: null,
        },
        {
          id: "sev2-resolved",
          severity: "sev2",
          status: "resolved",
          owner: "ops",
          summary: "resolved sev2",
          declared_at: "2026-07-07T00:00:00.000Z",
          closed_at: null,
        },
      ],
      { sev1: 4, sev2: 24, sev3: 120 },
      new Date("2026-07-08T05:00:00.000Z"),
    );

    expect(rows).toEqual([
      expect.objectContaining({ id: "sev1-old", ageHours: 5, stale: true }),
      expect.objectContaining({ id: "sev2-resolved", ageHours: 29, stale: false }),
    ]);
  });

  it("builds a readiness report from D1 table and incident rows", () => {
    const commandResult: WranglerQueryResult = {
      exitCode: 0,
      signal: null,
      timedOut: false,
      stdoutBytes: 100,
      stderrBytes: 0,
      parsedJson: true,
      results: [
        {
          success: true,
          results: [
            { name: "operational_incident_events" },
            { name: "operational_incidents" },
          ],
        },
        {
          success: true,
          results: [
            {
              id: "incident-1",
              severity: "sev3",
              status: "contained",
              owner: "ops",
              summary: "test",
              declared_at: "2026-07-01T00:00:00.000Z",
              closed_at: null,
            },
          ],
        },
      ],
    };

    const report = buildOperationalIncidentsReadinessReport({
      commandResult,
      now: new Date("2026-07-08T00:00:00.000Z"),
      thresholds: { sev1: 4, sev2: 24, sev3: 120 },
    });

    expect(report.tableRead.incidentTablesReady).toBe(true);
    expect(report.staleIncidents).toEqual([
      expect.objectContaining({ id: "incident-1", ageHours: 168, resolveSlaHours: 120 }),
    ]);
    expect(report.missing).toContain("stale_incident:incident-1");
    expect(report.readiness.operationalIncidentsReady).toBe(false);
  });

  it("reads SLA threshold overrides with safe defaults", () => {
    expect(readIncidentResolveThresholds({
      OPERATIONAL_INCIDENT_SEV1_RESOLVE_SLA_HOURS: "2",
      OPERATIONAL_INCIDENT_SEV2_RESOLVE_SLA_HOURS: "-1",
      OPERATIONAL_INCIDENT_SEV3_RESOLVE_SLA_HOURS: "abc",
    })).toEqual({ sev1: 2, sev2: 24, sev3: 120 });
  });
});
