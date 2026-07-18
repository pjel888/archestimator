import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("activity history lifecycle contract", () => {
  it("keeps durable outbox and legal holds workspace-scoped", () => {
    const migration = readFileSync("migrations/0065_activity_history_lifecycle.sql", "utf8");

    expect(migration).toContain("CREATE TABLE IF NOT EXISTS activity_event_outbox");
    expect(migration).toContain("workspace_id TEXT NOT NULL");
    expect(migration).toContain("UNIQUE(event_id)");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS activity_event_legal_holds");
    expect(migration).toContain("idx_activity_event_legal_holds_one_active_event");
    expect(migration).toContain("WHERE released_at IS NULL");
  });

  it("inserts an idempotent outbox record with a newly inserted history event", () => {
    const source = readFileSync("src/lib/estimates/d1-intents/history-events.ts", "utf8");

    expect(source).toContain("INSERT INTO activity_event_outbox");
    expect(source).toContain("ON CONFLICT(event_id) DO NOTHING");
    expect(source).toContain("runD1Batch(database, [prepared.statement, prepared.outboxStatement])");
  });

  it("retention excludes events held under an active legal hold", () => {
    const source = readFileSync("src/lib/compliance/retention-core.ts", "utf8");

    expect(source).toContain("FROM activity_event_legal_holds hold");
    expect(source).toContain("hold.released_at IS NULL");
  });
});
