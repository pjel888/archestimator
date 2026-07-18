import { describe, expect, it } from "vitest";

import {
  insertHistoryEvent,
  prepareHistoryEventInsert,
  runMutationWithHistory,
  type HistoryEventInput,
} from "@/lib/estimates/d1-intents/history-events";
import type { D1DatabaseLike, D1PreparedStatementLike, D1Result } from "@/lib/cloudflare/d1";

type RecordedStatement = { sql: string; values: unknown[] };

class FakeStatement implements D1PreparedStatementLike {
  values: unknown[] = [];

  constructor(private readonly database: FakeDatabase, readonly sql: string) {}

  bind(...values: never[]) {
    this.values = values;
    return this;
  }

  async first<R>() {
    if (this.sql.includes("FROM estimate_sheet_events")) return this.database.existingEvent as R | null;
    return null;
  }

  async all<R>() {
    return { results: [] as R[], success: true };
  }

  async run() {
    this.database.directRunCount += 1;
    return { success: true, meta: { changes: 1 } };
  }
}

class FakeDatabase implements D1DatabaseLike {
  batchStatements: RecordedStatement[] = [];
  existingEvent: { id: string; payload: string } | null = null;
  batchSucceeds = true;
  directRunCount = 0;

  prepare(sql: string) {
    return new FakeStatement(this, sql);
  }

  async batch(statements: D1PreparedStatementLike[]): Promise<D1Result[]> {
    this.batchStatements = statements.map((statement) => ({
      sql: (statement as FakeStatement).sql,
      values: [...(statement as FakeStatement).values],
    }));
    return statements.map(() => ({ success: this.batchSucceeds }));
  }
}

const input: HistoryEventInput = {
  actorUserId: "actor-a",
  correlationId: "correlation-a",
  estimateId: "estimate-a",
  eventType: "row_updated",
  projectId: "project-a",
  workspaceId: "workspace-a",
};

describe("activity durable history writes", () => {
  it("prepares workspace-matched event and idempotent outbox statements", async () => {
    const prepared = await prepareHistoryEventInsert(new FakeDatabase(), input);

    expect(prepared.statement?.sql).toContain("INSERT INTO estimate_sheet_events");
    expect(prepared.statement?.values?.[2]).toBe("workspace-a");
    expect(prepared.outboxStatement?.sql).toContain("INSERT INTO activity_event_outbox");
    expect(prepared.outboxStatement?.sql).toContain("ON CONFLICT(event_id) DO NOTHING");
    expect(prepared.outboxStatement?.values?.[1]).toBe("workspace-a");
    expect(prepared.outboxStatement?.values?.[2]).toBe(prepared.eventId);
  });

  it("commits the event and outbox together when D1 batching is available", async () => {
    const database = new FakeDatabase();

    await insertHistoryEvent(database, input);

    expect(database.batchStatements).toHaveLength(2);
    expect(database.batchStatements.map((statement) => statement.sql)).toEqual([
      expect.stringContaining("INSERT INTO estimate_sheet_events"),
      expect.stringContaining("INSERT INTO activity_event_outbox"),
    ]);
    expect(database.batchStatements[0]?.values[2]).toBe("workspace-a");
    expect(database.batchStatements[1]?.values[1]).toBe("workspace-a");
  });

  it("commits a domain mutation, event, and outbox in one D1 batch", async () => {
    const database = new FakeDatabase();

    await runMutationWithHistory(database, [{
      sql: "DELETE FROM estimate_row_items WHERE id = ?",
      values: ["row-a"],
    }], input);

    expect(database.batchStatements).toHaveLength(3);
    expect(database.batchStatements.map((statement) => statement.sql)).toEqual([
      expect.stringContaining("DELETE FROM estimate_row_items"),
      expect.stringContaining("INSERT INTO estimate_sheet_events"),
      expect.stringContaining("INSERT INTO activity_event_outbox"),
    ]);
  });

  it("does not fall back to sequential writes when the atomic batch fails", async () => {
    const database = new FakeDatabase();
    database.batchSucceeds = false;

    await expect(runMutationWithHistory(database, [{
      sql: "UPDATE estimate_row_items SET material = ? WHERE id = ?",
      values: ["Updated", "row-a"],
    }], input)).rejects.toThrow("batch failed");

    expect(database.batchStatements).toHaveLength(3);
    expect(database.directRunCount).toBe(0);
  });

  it("does not enqueue a second outbox record for an existing correlation", async () => {
    const database = new FakeDatabase();
    database.existingEvent = { id: "existing-event", payload: "{}" };

    await expect(insertHistoryEvent(database, input)).resolves.toBe("existing-event");
    expect(database.batchStatements).toHaveLength(0);
  });
});
