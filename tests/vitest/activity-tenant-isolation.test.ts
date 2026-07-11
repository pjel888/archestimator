import { describe, expect, it } from "vitest";

import {
  createActivityLegalHold,
  anonymizeActivityActor,
  reconcileActivityOutbox,
  releaseActivityLegalHold,
  type ActivityOutboxDatabase,
} from "@/lib/activity/activity-outbox";

function databaseWithCalls() {
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
          if (sql.includes("FROM activity_event_outbox")) {
            return { results: [{ id: "outbox-a", workspace_id: "workspace-a", event_id: "event-a", status: "pending" as const, attempt_count: 0 }] };
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

describe("activity lifecycle tenant isolation", () => {
  it("requires a workspace id before lifecycle writes or reconciliation", async () => {
    const { database } = databaseWithCalls();

    await expect(createActivityLegalHold(database, { workspaceId: "", eventId: "event-a", reason: "investigation" }))
      .rejects.toThrow("workspace id");
    await expect(releaseActivityLegalHold(database, { workspaceId: " ", eventId: "event-a" }))
      .rejects.toThrow("workspace id");
  });

  it("uses workspace predicates for legal-hold writes and outbox event lookup", async () => {
    const { calls, database } = databaseWithCalls();

    await createActivityLegalHold(database, { workspaceId: "workspace-a", eventId: "event-a", reason: "investigation" });
    await releaseActivityLegalHold(database, { workspaceId: "workspace-a", eventId: "event-a" });
    await reconcileActivityOutbox(database, { now: new Date("2026-07-11T00:00:00.000Z") });

    const create = calls.find((call) => call.sql.includes("INSERT INTO activity_event_legal_holds"));
    const release = calls.find((call) => call.sql.includes("UPDATE activity_event_legal_holds"));
    const lookup = calls.find((call) => call.sql.includes("FROM estimate_sheet_events") && !call.sql.includes("activity_event_legal_holds"));
    expect(create?.sql).toContain("event.workspace_id = ?");
    expect(create?.values.at(-1)).toBe("workspace-a");
    expect(release?.sql).toContain("WHERE workspace_id = ? AND event_id = ?");
    expect(lookup?.sql).toContain("WHERE id = ? AND workspace_id = ?");
    expect(lookup?.values).toEqual(["event-a", "workspace-a"]);
  });

  it("pseudonymizes an actor only inside the requested workspace", async () => {
    const { calls, database } = databaseWithCalls();

    await anonymizeActivityActor(database, { workspaceId: "workspace-a", actorUserId: "user-a" });

    const anonymize = calls.find((call) => call.sql.includes("SET actor_user_id"));
    expect(anonymize?.sql).toContain("WHERE workspace_id = ? AND actor_user_id = ?");
    expect(anonymize?.values).toEqual(["anonymized-activity-actor", "workspace-a", "user-a"]);
  });
});
