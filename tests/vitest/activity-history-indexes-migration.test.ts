import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("activity history indexes migration", () => {
  it("adds drill-down indexes without changing the event table contract", () => {
    const migration = readFileSync("migrations/0060_activity_history_indexes.sql", "utf8");

    expect(migration).toContain("idx_estimate_sheet_events_estimate_target_row_created");
    expect(migration).toContain("(estimate_id, target_row_id, created_at DESC, id DESC)");
    expect(migration).toContain("idx_estimate_sheet_events_estimate_node_created");
    expect(migration).toContain("(estimate_id, estimate_node_id, created_at DESC, id DESC)");
    expect(migration).not.toMatch(/\bDROP\b|\bALTER TABLE\b/i);
  });
});
