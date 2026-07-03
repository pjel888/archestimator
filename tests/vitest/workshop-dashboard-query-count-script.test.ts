import { describe, expect, it } from "vitest";

import {
  buildWorkshopDashboardQueryCountReport,
  parseWorkshopDashboardTraceLog,
} from "../../scripts/measure-workshop-dashboard-query-count";

describe("workshop dashboard query count script", () => {
  it("summarizes request-correlated perf-json snapshots without raw URLs or ids", () => {
    const log = [
      'noise',
      '[perf-json] {"requestId":"wsh_a","scope":"workshop.dashboard","databaseRoundTrips":2,"timings":[{"label":"workshop.branch.homebase","kind":"timing","elapsedMs":120},{"label":"database.select.projects","kind":"database","operation":"select","relation":"projects","elapsedMs":20},{"label":"database.rpc.list_pending_collaboration_invitations","kind":"database","operation":"rpc","relation":"list_pending_collaboration_invitations","elapsedMs":40}]}',
      '[perf-json] {"requestId":"wsh_b","scope":"workshop.dashboard","databaseRoundTrips":1,"timings":[{"label":"workshop.branch.homebase","kind":"timing","elapsedMs":90},{"label":"database.select.estimates","kind":"database","operation":"select","relation":"estimates","elapsedMs":30}]}',
    ].join("\n");

    const snapshots = parseWorkshopDashboardTraceLog(log);
    const report = buildWorkshopDashboardQueryCountReport("synthetic.log", snapshots);

    expect(report.sampleCount).toBe(2);
    expect(report.medianDatabaseRoundTrips).toBe(1);
    expect(report.p95DatabaseRoundTrips).toBe(2);
    expect(report.relationCounts).toEqual([
      { relation: "estimates", operation: "select", count: 1 },
      { relation: "list_pending_collaboration_invitations", operation: "rpc", count: 1 },
      { relation: "projects", operation: "select", count: 1 },
    ]);
    expect(JSON.stringify(report)).not.toMatch(/https:\/\/|workspace_id|project_id|authorization|cookie/i);
  });
});
