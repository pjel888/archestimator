import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

import {
  ActivationRepositoryError,
  type ActivationLedgerDeliveryGuard,
  prepareActivationLedgerStatements,
  validateActivationMilestoneInput,
} from "@/lib/onboarding/activation-repository";
import { prepareUserDomainActivation } from "@/lib/onboarding/activation-origin";

const requireRuntime = createRequire(import.meta.url);

type LocalSqliteDatabase = {
  exec(sql: string): void;
  prepare(sql: string): {
    get(...parameters: unknown[]): Record<string, unknown> | undefined;
    run(...parameters: unknown[]): unknown;
  };
  close(): void;
};

type PreparedActivationStatement = {
  sql: string;
  values: unknown[];
};

function createDatabase() {
  const { DatabaseSync } = requireRuntime("node:sqlite") as {
    DatabaseSync: new (path: string) => LocalSqliteDatabase;
  };
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON;");
  database.exec(readFileSync("migrations/0007_collaboration_invitations.sql", "utf8"));
  database.exec(readFileSync("migrations/0013_collaboration_management_sidecars.sql", "utf8"));
  database.exec(readFileSync("migrations/0015_publication_admin_sidecars.sql", "utf8"));
  database.exec(readFileSync("migrations/0039_project_status.sql", "utf8"));
  database.exec(readFileSync("migrations/0067_beta_activation_events.sql", "utf8"));
  database.exec(readFileSync("migrations/0101_beta_onboarding_flow_state.sql", "utf8"));
  database.exec(readFileSync("migrations/0103_onboarding_activation_resource_integrity.sql", "utf8"));
  return database;
}

function seedReplayTenant(database: LocalSqliteDatabase) {
  const now = "2026-07-24T00:00:00.000Z";
  database.prepare(`
    INSERT INTO workspaces (id, name, created_by, created_at, updated_at)
    VALUES ('workspace-a', 'Workspace', 'user-a', ?, ?)
  `).run(now, now);
  database.prepare(`
    INSERT INTO workspace_members (
      workspace_id, user_id, role, created_at, updated_at
    ) VALUES ('workspace-a', 'user-a', 'owner', ?, ?)
  `).run(now, now);
  database.prepare(`
    INSERT INTO projects (
      id, workspace_id, name, created_by, metadata, created_at, updated_at
    ) VALUES
      ('project-a', 'workspace-a', 'Project A', 'user-a', '{}', ?, ?),
      ('project-b', 'workspace-a', 'Project B', 'user-a', '{}', ?, ?)
  `).run(now, now, now, now);
  return now;
}

function applyActivationLedger(
  database: LocalSqliteDatabase,
  input: Parameters<typeof prepareUserDomainActivation>[0],
  now: string,
  deliveryGuard?: ActivationLedgerDeliveryGuard,
) {
  const prepared: PreparedActivationStatement[] = [];
  const d1 = {
    prepare(sql: string) {
      const statement = {
        bind(...values: unknown[]) {
          prepared.push({ sql, values });
          return statement;
        },
      };
      return statement;
    },
  };
  prepareActivationLedgerStatements(
    d1 as never,
    prepareUserDomainActivation(input),
    now,
    deliveryGuard,
  );

  database.exec("BEGIN");
  try {
    for (const statement of prepared) {
      database.prepare(statement.sql).run(...statement.values);
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

const validInput = {
  dedupeKey: "workspace-a:project-a:project_created:mutation-a",
  milestone: "project_created",
  occurredAt: "2026-07-11T00:00:00.000Z",
  projectId: "project-a",
  source: "project",
  userId: "user-a",
  workspaceId: "workspace-a",
} as const;

describe("activation repository input boundary", () => {
  it("accepts the versioned vocabulary and safe metadata", () => {
    expect(() => validateActivationMilestoneInput({
      ...validInput,
      metadata: { activation_path: "blank", sample_version: 1 },
    })).not.toThrow();
  });

  it.each([
    [{ ...validInput, milestone: "forged" }, "unknown milestone"],
    [{ ...validInput, source: "browser" }, "unknown source"],
    [{ ...validInput, estimateId: "estimate-a", projectId: null }, "estimate without project"],
    [{ ...validInput, metadata: { email: "client@example.test" } }, "unallowlisted metadata"],
    [{ ...validInput, metadata: { activation_path: { unbounded: true } } }, "nested metadata"],
  ])("rejects %s", (input) => {
    expect(() => validateActivationMilestoneInput(input as never)).toThrow(ActivationRepositoryError);
  });
});

describe("activation progress resource identity", () => {
  it("clears a stale estimate when a later project-only event changes projects", () => {
    const database = createDatabase();
    try {
      const now = seedReplayTenant(database);
      database.prepare(`
        INSERT INTO estimates (
          id, project_id, name, created_by, created_at, updated_at
        ) VALUES ('estimate-a', 'project-a', 'Estimate A', 'user-a', ?, ?)
      `).run(now, now);
      database.prepare(`
        INSERT INTO beta_activation_progress (
          user_id, workspace_id, project_id, estimate_id, last_milestone,
          last_event_at, created_at, updated_at
        ) VALUES (
          'user-a', 'workspace-a', 'project-a', 'estimate-a',
          'first_area_created', ?, ?, ?
        )
      `).run(now, now, now);

      applyActivationLedger(
        database,
        {
          dedupeKey: "workspace-a:project-b:project-created",
          milestone: "project_created",
          occurredAt: "2026-07-24T00:01:00.000Z",
          projectId: "project-b",
          source: "project",
          userId: "user-a",
          workspaceId: "workspace-a",
        },
        "2026-07-24T00:01:00.000Z",
      );

      expect(database.prepare(`
        SELECT project_id, estimate_id
        FROM beta_activation_progress
        WHERE user_id = 'user-a' AND workspace_id = 'workspace-a'
      `).get()).toEqual({
        project_id: "project-b",
        estimate_id: null,
      });
    } finally {
      database.close();
    }
  });

  it("does not increment the projection version for an identical dedupe replay", () => {
    const database = createDatabase();
    try {
      seedReplayTenant(database);
      const input = {
        ...validInput,
        occurredAt: "2026-07-24T00:01:00.000Z",
      };
      applyActivationLedger(database, input, "2026-07-24T00:01:00.000Z");
      applyActivationLedger(database, input, "2026-07-24T00:02:00.000Z");

      expect(database.prepare(`
        SELECT project_id, estimate_id, last_milestone, last_event_at, version, updated_at
        FROM beta_activation_progress
        WHERE user_id = 'user-a' AND workspace_id = 'workspace-a'
      `).get()).toEqual({
        project_id: "project-a",
        estimate_id: null,
        last_milestone: "project_created",
        last_event_at: "2026-07-24T00:01:00.000Z",
        version: 1,
        updated_at: "2026-07-24T00:01:00.000Z",
      });
    } finally {
      database.close();
    }
  });

  it("does not change the projection for a conflicting dedupe replay", () => {
    const database = createDatabase();
    try {
      seedReplayTenant(database);
      applyActivationLedger(database, {
        ...validInput,
        dedupeKey: "workspace-a:activation:replay",
        milestone: "first_area_created",
        occurredAt: "2026-07-24T00:01:00.000Z",
      }, "2026-07-24T00:01:00.000Z");
      applyActivationLedger(database, {
        ...validInput,
        dedupeKey: "workspace-a:activation:replay",
        milestone: "first_valid_total",
        occurredAt: "2026-07-24T00:02:00.000Z",
        projectId: "project-b",
      }, "2026-07-24T00:02:00.000Z");

      expect(database.prepare(`
        SELECT project_id, estimate_id, last_milestone, last_event_at, version, updated_at
        FROM beta_activation_progress
        WHERE user_id = 'user-a' AND workspace_id = 'workspace-a'
      `).get()).toEqual({
        project_id: "project-a",
        estimate_id: null,
        last_milestone: "first_area_created",
        last_event_at: "2026-07-24T00:01:00.000Z",
        version: 1,
        updated_at: "2026-07-24T00:01:00.000Z",
      });
      expect(database.prepare(`
        SELECT COUNT(*) AS count
        FROM beta_activation_events
        WHERE workspace_id = 'workspace-a' AND dedupe_key = 'workspace-a:activation:replay'
      `).get()).toEqual({ count: 1 });
    } finally {
      database.close();
    }
  });

  it("applies outbox delivery writes only while its lease is current", () => {
    const database = createDatabase();
    try {
      const now = seedReplayTenant(database);
      const input = {
        ...validInput,
        dedupeKey: "workspace-a:outbox-delivery",
        occurredAt: "2026-07-24T00:01:00.000Z",
      };
      const deliveryGuard = {
        outboxId: "outbox-a",
        leaseToken: "lease-a",
        now: "2026-07-24T00:01:00.000Z",
      };

      applyActivationLedger(database, input, deliveryGuard.now, deliveryGuard);
      expect(database.prepare(`
        SELECT COUNT(*) AS count
        FROM beta_activation_events
        WHERE workspace_id = 'workspace-a' AND dedupe_key = 'workspace-a:outbox-delivery'
      `).get()).toEqual({ count: 0 });
      expect(database.prepare(`
        SELECT COUNT(*) AS count
        FROM beta_activation_progress
        WHERE user_id = 'user-a' AND workspace_id = 'workspace-a'
      `).get()).toEqual({ count: 0 });

      database.prepare(`
        INSERT INTO beta_activation_outbox (
          id, domain_mutation_id, user_id, workspace_id, project_id, milestone, source,
          origin_class, occurred_at, dedupe_key, metadata_json, state, attempt_count,
          next_attempt_at, lease_token, lease_expires_at, created_at, updated_at
        ) VALUES (
          'outbox-a', 'mutation-a', 'user-a', 'workspace-a', 'project-a', 'project_created', 'project',
          'user_domain', ?, 'workspace-a:outbox-intent', '{}', 'processing', 1,
          ?, 'lease-a', '2026-07-24T00:02:00.000Z', ?, ?
        )
      `).run(now, now, now, now);

      applyActivationLedger(database, input, deliveryGuard.now, deliveryGuard);
      expect(database.prepare(`
        SELECT project_id, last_milestone, version
        FROM beta_activation_progress
        WHERE user_id = 'user-a' AND workspace_id = 'workspace-a'
      `).get()).toEqual({
        project_id: "project-a",
        last_milestone: "project_created",
        version: 1,
      });
    } finally {
      database.close();
    }
  });
});
