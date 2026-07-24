import { describe, expect, it, vi } from "vitest";

import {
  enqueueActivationMilestone,
  reconcileActivationOutbox,
  repairDeadActivationIntent,
} from "@/lib/onboarding/activation-outbox";

type Prepared = { sql: string; values: unknown[] };

function createOutboxDatabase(options: {
  rows?: unknown[];
  insertChanges?: number;
  resourceChainValid?: boolean;
  existingIntent?: boolean;
} = {}) {
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
        first: vi.fn(async () => {
          if (sql.includes("SELECT 1 AS valid") && sql.includes("FROM workspaces")) {
            return options.resourceChainValid === false ? null : { valid: 1 };
          }
          if (sql.includes("SELECT 1 AS present") && sql.includes("FROM beta_activation_outbox")) {
            return options.existingIntent === false ? null : { present: 1 };
          }
          return null;
        }),
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
      "mutation-a", "user-a", "workspace-a", "project-a", "project_created", "project", "user_domain",
    ]));
  });

  it("rejects an unavailable tenant resource chain before inserting an intent", async () => {
    const { database, prepared } = createOutboxDatabase({ resourceChainValid: false });

    await expect(enqueueActivationMilestone(database as never, input)).rejects.toMatchObject({
      code: "activation_resource_not_found",
      message: "Activation resource chain is unavailable.",
    });

    expect(prepared.some(({ sql }) => sql.includes("INSERT INTO beta_activation_outbox"))).toBe(false);
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
        origin_class: "user_domain",
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
    expect(prepared.filter(({ sql }) => sql.includes("beta_activation_events")).some(({ sql }) => (
      sql.includes("lease_token = ?") && sql.includes("lease_expires_at > ?")
    ))).toBe(true);
    expect(prepared.filter(({ sql }) => sql.includes("beta_activation_progress")).some(({ sql }) => (
      sql.includes("lease_token = ?") && sql.includes("lease_expires_at > ?")
    ))).toBe(true);
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
        milestone: "project_created",
        source: "project",
        origin_class: "forged",
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
