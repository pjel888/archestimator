import { describe, expect, it } from "vitest";

import {
  createActivityLegalHold,
  reconcileActivityOutbox,
  releaseActivityLegalHold,
  type ActivityOutboxDatabase,
} from "@/lib/activity/activity-outbox";

function databaseWith(rows: Array<{ id: string; workspace_id: string; event_id: string; status: "pending" | "failed"; attempt_count: number }>, eventKeys: Set<string>) {
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const database: ActivityOutboxDatabase = {
    prepare(sql) {
      let values: unknown[] = [];
      return {
        bind(...nextValues) {
          values = nextValues;
          return this;
        },
        async all() {
          calls.push({ sql, values });
          if (sql.includes("FROM activity_event_outbox")) return { results: rows };
          if (sql.includes("FROM estimate_sheet_events")) {
            return { results: eventKeys.has(`${String(values[1])}:${String(values[0])}`) ? [{ id: values[0] as string }] : [] };
          }
          return { results: [] };
        },
        async run() {
          calls.push({ sql, values });
          return { success: true };
        },
      };
    },
  };
  return { calls, database };
}

describe("activity outbox reconciliation", () => {
  it("acknowledges only an event found in the same workspace", async () => {
    const { calls, database } = databaseWith([
      { id: "outbox-1", workspace_id: "workspace-a", event_id: "event-a", status: "pending", attempt_count: 0 },
      { id: "outbox-2", workspace_id: "workspace-b", event_id: "event-a", status: "pending", attempt_count: 0 },
    ], new Set(["workspace-a:event-a"]));

    const result = await reconcileActivityOutbox(database, { now: new Date("2026-07-11T00:00:00.000Z") });

    expect(result).toEqual({ delivered: 1, retried: 1, scanned: 2 });
    expect(calls.filter((call) => call.sql.includes("FROM estimate_sheet_events"))).toHaveLength(2);
    expect(calls.filter((call) => call.sql.includes("SET status = 'delivered'"))).toHaveLength(1);
    expect(calls.filter((call) => call.sql.includes("last_error_code = 'history_event_missing'"))).toHaveLength(1);
    expect(calls.every((call) => !call.sql.includes("estimate_sheet_events") || call.sql.includes("workspace_id = ?"))).toBe(true);
  });

  it("schedules a capped exponential retry when the event is absent", async () => {
    const { calls, database } = databaseWith([
      { id: "outbox-1", workspace_id: "workspace-a", event_id: "missing", status: "failed", attempt_count: 9 },
    ], new Set());

    const result = await reconcileActivityOutbox(database, { now: new Date("2026-07-11T00:00:00.000Z") });

    expect(result).toEqual({ delivered: 0, retried: 1, scanned: 1 });
    const retry = calls.find((call) => call.sql.includes("last_error_code = 'history_event_missing'"));
    expect(retry?.values[0]).toBe("2026-07-11T01:00:00.000Z");
  });

  it("writes and releases holds through workspace-qualified statements", async () => {
    const { calls, database } = databaseWith([], new Set());

    await createActivityLegalHold(database, {
      workspaceId: "workspace-a",
      eventId: "event-a",
      reason: "investigation",
      createdByUserId: "user-a",
    });
    await releaseActivityLegalHold(database, {
      workspaceId: "workspace-a",
      eventId: "event-a",
      releasedByUserId: "user-a",
    });

    const create = calls.find((call) => call.sql.includes("INSERT INTO activity_event_legal_holds"));
    const release = calls.find((call) => call.sql.includes("UPDATE activity_event_legal_holds"));
    expect(create?.sql).toContain("event.workspace_id = ?");
    expect(create?.values.at(-1)).toBe("workspace-a");
    expect(release?.sql).toContain("WHERE workspace_id = ? AND event_id = ?");
    expect(release?.values.slice(-2)).toEqual(["workspace-a", "event-a"]);
  });
});
