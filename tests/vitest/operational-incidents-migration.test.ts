import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("0040 operational incidents migration", () => {
  const migration = readFileSync("migrations/0040_operational_incidents.sql", "utf8");

  it("creates durable incident and event tables with lifecycle constraints", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS operational_incidents");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS operational_incident_events");
    expect(migration).toContain("severity IN ('sev1', 'sev2', 'sev3')");
    expect(migration).toContain("status IN ('open', 'contained', 'resolved', 'closed')");
    expect(migration).toContain("event_kind IN ('declared', 'status_changed', 'escalated', 'note', 'closed')");
    expect(migration).toContain("REFERENCES operational_incidents(id) ON DELETE CASCADE");
    expect(migration).toContain("idx_op_incidents_status_declared");
  });

  it("extends the retention audit class CHECK for incident classes", () => {
    expect(migration).toContain("CREATE TABLE data_retention_events__0040");
    expect(migration).toContain("'operational_incidents'");
    expect(migration).toContain("'operational_incident_events'");
    expect(migration).toContain("ALTER TABLE data_retention_events__0040 RENAME TO data_retention_events");
  });
});

