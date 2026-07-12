import { describe, expect, it, vi } from "vitest";

import {
  enqueueActivationMilestone,
  reconcileActivationOutbox,
  repairDeadActivationIntent,
} from "@/lib/onboarding/activation-outbox";

type Prepared = { sql: string; values: unknown[] };

function createOutboxDatabase(options: { rows?: unknown[]; insertChanges?: number } = {}) {
  const prepared: Prepared[] = [];
  const batch = vi.fn().mockResolvedValue([
    { success: true, meta: { changes: 1 } },
    { success: true, meta: { changes: 1 } },
    { success: true, meta: { changes: 1 } },
  ]);
  const database = {
    batch,
    prepare(sql: string) {
      const statement = {
        all: vi.fn().mockResolvedValue({ success: true, results: options.rows ?? [] }),
        bind(...values: unknown[]) {
          prepared.push({ sql, values });
          return statement;
        },
        first: vi.fn(),
        run: vi.fn().mockResolvedValue({ success: true, meta: { changes: options.insertChanges ?? 1 } }),
      };
      return statement;
    },
  };
  return { database, prepared };
}

const input = {
  dedupeKey: "workspace-a:mutation-a:project_created",
  domainMutationId: "mutation-a",
  milestone: "project_created" as const,
  occurredAt: "2026-07-12T00:00:00.000Z",
  projectId: "project-a",
  source: "project" as const,
  userId: "user-a",
  workspaceId: "workspace-a",
};

describe("activation outbox", () => {
  it("persists a tenant-scoped pending intent idempotently", async () => {
    const { database, prepared } = createOutboxDatabase({ insertChanges: 0 });

    await expect(enqueueActivationMilestone(database as never, input)).resolves.toEqual({ status: "already_enqueued" });

    const statement = prepared.find(({ sql }) => sql.includes("INSERT INTO beta_activation_outbox"));
    expect(statement?.sql).toContain("ON CONFLICT(workspace_id, dedupe_key) DO NOTHING");
    expect(statement?.values).toEqual(expect.arrayContaining([
      "mutation-a", "user-a", "workspace-a", "project-a", "project_created", "project",
    ]));
  });

  it("claims an eligible row and atomically records its event, progress, and delivery acknowledgement", async () => {
    const { database, prepared } = createOutboxDatabase({
      rows: [{
        id: "outbox-a",
        domain_mutation_id: "mutation-a",
        user_id: "user-a",
        workspace_id: "workspace-a",
        project_id: "project-a",
        estimate_id: null,
        milestone: "project_created",
        source: "project",
        occurred_at: "2026-07-12T00:00:00.000Z",
        dedupe_key: "workspace-a:mutation-a:project_created",
        metadata_json: "{}",
        state: "pending",
        attempt_count: 0,
      }],
    });

    await expect(reconcileActivationOutbox(database as never, {
      now: new Date("2026-07-12T01:00:00.000Z"),
    })).resolves.toEqual({ dead: 0, delivered: 1, scanned: 1 });

    expect(prepared.some(({ sql }) => sql.includes("SET state = 'processing'"))).toBe(true);
    expect(database.batch).toHaveBeenCalledTimes(1);
    expect(database.batch.mock.calls[0]?.[0]).toHaveLength(3);
    expect(prepared.some(({ sql }) => sql.includes("SET state = 'delivered'"))).toBe(true);
  });

  it("returns malformed claimed rows to the retry path and repairs only the matching dead tenant row", async () => {
    const { database, prepared } = createOutboxDatabase({
      rows: [{
        id: "outbox-a",
        domain_mutation_id: "mutation-a",
        user_id: "user-a",
        workspace_id: "workspace-a",
        project_id: null,
        estimate_id: null,
        milestone: "forged",
        source: "project",
        occurred_at: "2026-07-12T00:00:00.000Z",
        dedupe_key: "workspace-a:mutation-a:project_created",
        metadata_json: "{}",
        state: "pending",
        attempt_count: 0,
      }],
    });

    await expect(reconcileActivationOutbox(database as never, {
      now: new Date("2026-07-12T01:00:00.000Z"),
    })).resolves.toEqual({ dead: 0, delivered: 0, scanned: 1 });
    await expect(repairDeadActivationIntent(database as never, {
      id: "outbox-a",
      workspaceId: "workspace-a",
    })).resolves.toEqual({ repaired: true });

    expect(prepared.some(({ sql }) => sql.includes("CASE WHEN attempt_count >= 10 THEN 'dead' ELSE 'pending' END"))).toBe(true);
    const repair = prepared.find(({ sql }) => sql.includes("WHERE id = ? AND workspace_id = ? AND state = 'dead'"));
    expect(repair?.values).toEqual(expect.arrayContaining(["outbox-a", "workspace-a"]));
  });
});
