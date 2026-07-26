import { describe, expect, it } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import {
  getActiveClientPortalBaseline,
  listClientPortalBaselineHistory,
  prepareClientPortalBaselineAcceptanceWrites,
} from "@/lib/client-portal/baseline-service";

const row = {
  id: "baseline_1",
  workspace_id: "workspace_1",
  project_id: "project_1",
  baseline_number: 1,
  issue_id: "issue_1",
  status: "active" as const,
  content_hash: "a".repeat(64),
  total_minor_units: 12_500_000,
  currency_code: "PHP",
  established_by_decision_id: "decision_1",
  established_at: "2026-07-26T00:00:00.000Z",
  superseded_by_baseline_id: null,
  superseded_at: null,
  voided_at: null,
  void_reason: null,
};

function database() {
  const captured: Array<{ sql: string; values: D1Value[] }> = [];
  const database: D1DatabaseLike = {
    prepare(sql: string): D1PreparedStatementLike {
      let values: D1Value[] = [];
      const prepared: D1PreparedStatementLike = {
        bind(...next) { values = next; captured.push({ sql, values }); return prepared; },
        async first<T>() { return row as T; },
        async all<T>() { return { success: true, results: [row] as T[] } as D1Result<T>; },
        async run<T>() { return { success: true } as D1Result<T>; },
      };
      return prepared;
    },
  };
  return { captured, database };
}

describe("client portal baseline service", () => {
  it("reads active and historical baseline state without conflating issues", async () => {
    const source = database();
    await expect(getActiveClientPortalBaseline(source.database, "portal_1")).resolves.toMatchObject({ id: "baseline_1", issueId: "issue_1", status: "active", totalMinorUnits: 12_500_000 });
    await expect(listClientPortalBaselineHistory(source.database, "portal_1")).resolves.toEqual([expect.objectContaining({ baselineNumber: 1 })]);
    expect(source.captured.every((entry) => entry.values[0] === "portal_1")).toBe(true);
  });

  it("plans accepted baseline rollover and request resolution as one ordered write set", () => {
    const source = database();
    const plan = prepareClientPortalBaselineAcceptanceWrites({
      database: source.database,
      decisionId: "decision_1",
      issueId: "issue_2",
      portalId: "portal_1",
      timestamp: "2026-07-26T00:00:00.000Z",
    });
    expect(plan.baselineId).toMatch(/^baseline_/);
    expect(plan.statements).toHaveLength(4);
    expect(source.captured.map((entry) => entry.sql)).toEqual([
      expect.stringContaining("UPDATE client_portal_baselines"),
      expect.stringContaining("INSERT INTO client_portal_baselines"),
      expect.stringContaining("INSERT INTO project_change_request_state_events"),
      expect.stringContaining("UPDATE project_change_requests"),
    ]);
    expect(source.captured[1]?.sql).toContain("issue.status = 'accepted'");
    expect(source.captured[2]?.sql).toContain("request.status = 'proposal_issued'");
  });
});
