import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  exportActivationPrivacyData: vi.fn(),
  hasActiveActivationHold: vi.fn(),
}));

vi.mock("@/lib/onboarding/activation-retention", () => ({
  exportActivationPrivacyData: mocks.exportActivationPrivacyData,
  hasActiveActivationHold: mocks.hasActiveActivationHold,
}));

import {
  eraseOnboardingPrivacyData,
  exportOnboardingPrivacyData,
  prepareOnboardingAccountDeletionStatements,
  purgeExpiredOnboardingEvents,
  reconcileOnboardingAfterAccessChange,
} from "@/lib/onboarding/flow-retention";

type Prepared = { sql: string; values: unknown[] };

const requireRuntime = createRequire(import.meta.url);

type LocalSqliteStatement = {
  all(...values: unknown[]): Record<string, unknown>[];
  get(...values: unknown[]): Record<string, unknown> | undefined;
  run(...values: unknown[]): { changes: number | bigint };
};

type LocalSqliteDatabase = {
  close(): void;
  exec(sql: string): void;
  prepare(sql: string): LocalSqliteStatement;
};

type SqliteD1Statement = {
  sql: string;
  values: unknown[];
  bind(...values: unknown[]): SqliteD1Statement;
  all(): Promise<{ success: true; results: Record<string, unknown>[] }>;
  first(): Promise<Record<string, unknown> | null>;
  run(): Promise<{ success: true; meta: { changes: number } }>;
};

function createDatabase(options: {
  all?: (sql: string) => unknown[];
  first?: (sql: string) => unknown;
  run?: (sql: string) => { success: boolean; meta?: { changes?: number } };
  batchResults?: Array<{ success: boolean; meta?: { changes?: number } }>;
} = {}) {
  const prepared: Prepared[] = [];
  const batch = vi.fn(async (statements: unknown[]) => (
    options.batchResults
    ?? statements.map(() => ({ success: true, meta: { changes: 1 } }))
  ));
  const database = {
    batch,
    prepare(sql: string) {
      const statement = {
        bind(...values: unknown[]) {
          prepared.push({ sql, values });
          return statement;
        },
        all: vi.fn(async () => ({
          success: true,
          results: options.all?.(sql) ?? [],
        })),
        first: vi.fn(async () => options.first?.(sql) ?? null),
        run: vi.fn(async () => (
          options.run?.(sql) ?? { success: true, meta: { changes: 1 } }
        )),
      };
      return statement;
    },
  };
  return { batch, database, prepared };
}

function createSqliteD1Database() {
  const { DatabaseSync } = requireRuntime("node:sqlite") as {
    DatabaseSync: new (path: string) => LocalSqliteDatabase;
  };
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  for (const migration of [
    "migrations/0007_collaboration_invitations.sql",
    "migrations/0013_collaboration_management_sidecars.sql",
    "migrations/0015_publication_admin_sidecars.sql",
    "migrations/0020_project_groups.sql",
    "migrations/0032_project_group_membership_positions.sql",
    "migrations/0039_project_status.sql",
    "migrations/0067_beta_activation_events.sql",
    "migrations/0101_beta_onboarding_flow_state.sql",
    "migrations/0103_onboarding_activation_resource_integrity.sql",
  ]) {
    sqlite.exec(readFileSync(migration, "utf8"));
  }

  const database = {
    prepare(sql: string): SqliteD1Statement {
      const statement: SqliteD1Statement = {
        sql,
        values: [],
        bind(...values: unknown[]) {
          statement.values = values;
          return statement;
        },
        async all() {
          return {
            success: true,
            results: sqlite.prepare(sql).all(...statement.values),
          };
        },
        async first() {
          return sqlite.prepare(sql).get(...statement.values) ?? null;
        },
        async run() {
          const result = sqlite.prepare(sql).run(...statement.values);
          return {
            success: true,
            meta: { changes: Number(result.changes) },
          };
        },
      };
      return statement;
    },
    async batch(statements: SqliteD1Statement[]) {
      sqlite.exec("BEGIN");
      try {
        const results = statements.map((statement) => {
          const result = sqlite
            .prepare(statement.sql)
            .run(...statement.values);
          return {
            success: true,
            meta: { changes: Number(result.changes) },
          };
        });
        sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };
  return { database, sqlite };
}

function seedLifecycleTenant(
  sqlite: LocalSqliteDatabase,
  identity: "held" | "unheld",
  occurredAt = "2025-01-01T00:00:00.000Z",
) {
  const userId = `user-${identity}`;
  const workspaceId = `workspace-${identity}`;
  const projectId = `project-${identity}`;
  const estimateId = `estimate-${identity}`;
  const groupId = `group-${identity}`;
  const now = "2026-07-01T00:00:00.000Z";
  sqlite.prepare(`
    INSERT INTO workspaces (id, name, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(workspaceId, `Workspace ${identity}`, userId, now, now);
  sqlite.prepare(`
    INSERT INTO workspace_members (
      workspace_id, user_id, role, created_at, updated_at
    ) VALUES (?, ?, 'owner', ?, ?)
  `).run(workspaceId, userId, now, now);
  sqlite.prepare(`
    INSERT INTO projects (
      id, workspace_id, name, created_by, metadata, created_at, updated_at
    ) VALUES (?, ?, ?, ?, '{}', ?, ?)
  `).run(projectId, workspaceId, `Project ${identity}`, userId, now, now);
  sqlite.prepare(`
    INSERT INTO estimates (
      id, project_id, name, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(estimateId, projectId, `Estimate ${identity}`, userId, now, now);
  sqlite.prepare(`
    INSERT INTO project_groups (
      id, workspace_id, user_id, name, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(groupId, workspaceId, userId, `Starter ${identity}`, now, now);
  sqlite.prepare(`
    INSERT INTO project_group_memberships (
      id, group_id, workspace_id, user_id, project_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    `membership-${identity}`,
    groupId,
    workspaceId,
    userId,
    projectId,
    now,
    now,
  );
  sqlite.prepare(`
    INSERT INTO beta_starter_pack_states (
      workspace_id, pack_version, scope_kind, scope_owner_id, status,
      installed_at, created_at, updated_at
    ) VALUES (?, 1, 'user', ?, 'complete', ?, ?, ?)
  `).run(workspaceId, userId, now, now, now);
  sqlite.prepare(`
    INSERT INTO beta_starter_asset_claims (
      workspace_id, pack_version, scope_kind, scope_owner_id,
      asset_key, asset_kind, starter_generation, resource_id,
      lifecycle_state, created_at, updated_at
    ) VALUES (?, 1, 'user', ?, 'group.starter_examples', 'project_group', 1, ?, 'active', ?, ?)
  `).run(workspaceId, userId, groupId, now, now);
  sqlite.prepare(`
    INSERT INTO beta_activation_progress (
      user_id, workspace_id, selected_path, project_id, estimate_id,
      last_milestone, last_event_at, created_at, updated_at
    ) VALUES (?, ?, 'blank', ?, ?, 'first_valid_total', ?, ?, ?)
  `).run(userId, workspaceId, projectId, estimateId, occurredAt, now, now);
  sqlite.prepare(`
    INSERT INTO beta_activation_events (
      id, user_id, workspace_id, project_id, estimate_id, milestone,
      source, origin_class, occurred_at, dedupe_key, metadata_json, created_at
    ) VALUES (?, ?, ?, ?, ?, 'first_valid_total', 'estimate', 'user_domain', ?, ?, '{}', ?)
  `).run(
    `activation-event-${identity}`,
    userId,
    workspaceId,
    projectId,
    estimateId,
    occurredAt,
    `activation-${identity}`,
    now,
  );
  sqlite.prepare(`
    INSERT INTO beta_activation_outbox (
      id, domain_mutation_id, user_id, workspace_id, project_id, estimate_id,
      milestone, source, origin_class, occurred_at, dedupe_key, metadata_json,
      state, attempt_count, next_attempt_at, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, 'first_valid_total', 'estimate', 'user_domain',
      ?, ?, '{}', 'delivered', 0, ?, ?, ?
    )
  `).run(
    `outbox-${identity}`,
    `mutation-${identity}`,
    userId,
    workspaceId,
    projectId,
    estimateId,
    occurredAt,
    `outbox-${identity}`,
    now,
    now,
    now,
  );
  sqlite.prepare(`
    INSERT INTO beta_onboarding_flow_states (
      user_id, workspace_id, flow_key, flow_version, status,
      started_at, completed_at, created_at, updated_at
    ) VALUES (?, ?, 'core_orientation', 1, 'completed', ?, ?, ?, ?)
  `).run(userId, workspaceId, now, now, now, now);
  sqlite.prepare(`
    INSERT INTO beta_onboarding_flow_events (
      id, user_id, workspace_id, flow_key, flow_version, generation,
      run_id, launch_mode, event_type, source, idempotency_key,
      state_revision, occurred_at, ingested_at
    ) VALUES (
      ?, ?, ?, 'core_orientation', 1, 1, ?, 'start', 'completed',
      'user_command', ?, 1, ?, ?
    )
  `).run(
    `flow-event-${identity}`,
    userId,
    workspaceId,
    `run-${identity}`,
    `flow-${identity}`,
    occurredAt,
    now,
  );
  if (identity === "held") {
    sqlite.prepare(`
      INSERT INTO beta_activation_retention_holds (
        user_id, workspace_id, reason_code, starts_at, expires_at,
        created_by, created_at, updated_at
      ) VALUES (
        ?, ?, 'legal_hold', '2000-01-01T00:00:00.000Z',
        '2999-01-01T00:00:00.000Z', ?, ?, ?
      )
    `).run(userId, workspaceId, userId, now, now);
  }
}

function seedHeldAndUnheldLifecycleDatabase() {
  const result = createSqliteD1Database();
  seedLifecycleTenant(result.sqlite, "held");
  seedLifecycleTenant(result.sqlite, "unheld");
  return result;
}

async function useActualActivationRetention() {
  const actual = await vi.importActual<
    typeof import("@/lib/onboarding/activation-retention")
  >("@/lib/onboarding/activation-retention");
  mocks.exportActivationPrivacyData.mockImplementation(
    actual.exportActivationPrivacyData,
  );
  mocks.hasActiveActivationHold.mockImplementation(
    actual.hasActiveActivationHold,
  );
}

function assertOnlyHeldEvidenceSurvives(
  sqlite: LocalSqliteDatabase,
  options: { includeUnheldEvidence?: boolean } = {},
) {
  const expectedEvidenceOwners = options.includeUnheldEvidence
    ? [
        { user_id: "user-held", workspace_id: "workspace-held" },
        { user_id: "user-unheld", workspace_id: "workspace-unheld" },
      ]
    : [{
        user_id: "user-held",
        workspace_id: "workspace-held",
      }];
  for (const table of [
    "beta_onboarding_flow_states",
    "beta_onboarding_flow_events",
    "beta_activation_progress",
    "beta_activation_events",
    "beta_activation_outbox",
  ]) {
    expect(sqlite.prepare(`
      SELECT user_id, workspace_id
      FROM ${table}
      ORDER BY user_id
    `).all()).toEqual(expectedEvidenceOwners);
  }
  expect(sqlite.prepare(
    "SELECT COUNT(*) AS count FROM beta_starter_pack_states",
  ).get()).toEqual({ count: 0 });
  expect(sqlite.prepare(
    "SELECT COUNT(*) AS count FROM beta_starter_asset_claims",
  ).get()).toEqual({ count: 0 });
  expect(sqlite.prepare(
    "SELECT COUNT(*) AS count FROM project_groups",
  ).get()).toEqual({ count: 0 });
  expect(sqlite.prepare(
    "SELECT COUNT(*) AS count FROM project_group_memberships",
  ).get()).toEqual({ count: 0 });
  expect(sqlite.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
}

const tenant = {
  userId: "user-1",
  workspaceId: "workspace-1",
};

describe("onboarding flow retention", () => {
  beforeEach(() => {
    mocks.exportActivationPrivacyData.mockReset().mockResolvedValue({
      events: [{ milestone: "project_created" }],
      progress: { selectedPath: "blank" },
    });
    mocks.hasActiveActivationHold.mockReset().mockResolvedValue(false);
  });

  it("exports flow events and user-scoped starter state alongside activation data", async () => {
    const { database, prepared } = createDatabase({
      all(sql) {
        if (sql.includes("FROM beta_onboarding_flow_states")) {
          return [{ flow_key: "core_orientation", flow_version: 1 }];
        }
        if (sql.includes("FROM beta_onboarding_flow_events")) {
          return [{ flow_key: "core_orientation", event_type: "completed" }];
        }
        if (sql.includes("FROM beta_starter_pack_states")) {
          return [{ pack_version: 1, scope_kind: "user" }];
        }
        if (sql.includes("FROM beta_starter_asset_claims")) {
          return [{ pack_version: 1, asset_key: "group.starter_examples" }];
        }
        return [];
      },
    });

    await expect(
      exportOnboardingPrivacyData(database as never, tenant),
    ).resolves.toEqual({
      activation: {
        events: [{ milestone: "project_created" }],
        progress: { selectedPath: "blank" },
      },
      flowStates: [{ flow_key: "core_orientation", flow_version: 1 }],
      flowEvents: [{ flow_key: "core_orientation", event_type: "completed" }],
      starterStates: [{ pack_version: 1, scope_kind: "user" }],
      starterClaims: [{ pack_version: 1, asset_key: "group.starter_examples" }],
    });

    expect(mocks.exportActivationPrivacyData).toHaveBeenCalledWith(
      database,
      tenant,
    );
    const eventRead = prepared.find(({ sql }) =>
      sql.includes("FROM beta_onboarding_flow_events")
    );
    expect(eventRead?.values).toEqual(["user-1", "workspace-1"]);
    const claimRead = prepared.find(({ sql }) =>
      sql.includes("FROM beta_starter_asset_claims")
    );
    expect(claimRead?.values).toEqual(["workspace-1", "user-1"]);
  });

  it("erases all onboarding evidence without a hold and preserves held evidence", async () => {
    const unheld = createDatabase();

    await expect(
      eraseOnboardingPrivacyData(unheld.database as never, tenant),
    ).resolves.toEqual({ status: "erased" });
    expect(unheld.batch.mock.calls[0]?.[0]).toHaveLength(9);
    expect(unheld.prepared.some(({ sql }) =>
      sql.includes("DELETE FROM beta_onboarding_flow_events")
    )).toBe(true);
    expect(unheld.prepared.some(({ sql }) =>
      sql.includes("DELETE FROM beta_activation_progress")
    )).toBe(true);

    mocks.hasActiveActivationHold.mockResolvedValueOnce(true);
    const held = createDatabase();
    await expect(
      eraseOnboardingPrivacyData(held.database as never, tenant),
    ).resolves.toEqual({ status: "skipped_legal_hold" });
    expect(held.batch.mock.calls[0]?.[0]).toHaveLength(4);
    expect(held.prepared.some(({ sql }) =>
      sql.includes("DELETE FROM beta_onboarding_flow_events")
    )).toBe(false);
    expect(held.prepared.some(({ sql }) =>
      sql.includes("DELETE FROM beta_starter_asset_claims")
    )).toBe(true);
  });

  it("removes starter organization after grouping access ends but access remains", async () => {
    const accessRows = [
      { has_access: 1, has_grouping_capability: 0 },
      { has_access: 1, has_grouping_capability: 0 },
    ];
    const { batch, database, prepared } = createDatabase({
      first(sql) {
        if (sql.includes("AS has_access")) return accessRows.shift() ?? null;
        return null;
      },
    });

    await expect(
      reconcileOnboardingAfterAccessChange(database as never, tenant),
    ).resolves.toEqual({ status: "starter_organization_removed" });

    expect(batch.mock.calls[0]?.[0]).toHaveLength(4);
    const cleanup = prepared.filter(({ sql }) => sql.includes("DELETE FROM"));
    expect(cleanup).toHaveLength(4);
    for (const statement of cleanup) {
      expect(statement.sql).toContain("AND NOT EXISTS");
      expect(statement.values).toEqual(expect.arrayContaining([
        "workspace-1",
        "user-1",
      ]));
    }
  });

  it("leaves onboarding state untouched while full workspace access remains", async () => {
    const { batch, database, prepared } = createDatabase({
      first(sql) {
        return sql.includes("AS has_access")
          ? { has_access: 1, has_grouping_capability: 1 }
          : null;
      },
    });

    await expect(
      reconcileOnboardingAfterAccessChange(database as never, tenant),
    ).resolves.toEqual({ status: "access_retained" });

    expect(batch).not.toHaveBeenCalled();
    expect(prepared.some(({ sql }) => sql.includes("DELETE FROM"))).toBe(false);
  });

  it("erases flow evidence after final unheld access removal", async () => {
    const { batch, database, prepared } = createDatabase({
      first(sql) {
        return sql.includes("AS has_access")
          ? { has_access: 0, has_grouping_capability: 0 }
          : null;
      },
    });

    await expect(
      reconcileOnboardingAfterAccessChange(database as never, tenant),
    ).resolves.toEqual({ status: "final_access_erased" });

    expect(batch.mock.calls[0]?.[0]).toHaveLength(9);
    expect(prepared.some(({ sql }) =>
      sql.includes("DELETE FROM beta_onboarding_flow_events")
    )).toBe(true);
  });

  it("preserves held flow evidence after final access removal", async () => {
    mocks.hasActiveActivationHold.mockResolvedValueOnce(true);
    const { batch, database, prepared } = createDatabase({
      first(sql) {
        return sql.includes("AS has_access")
          ? { has_access: 0, has_grouping_capability: 0 }
          : null;
      },
    });

    await expect(
      reconcileOnboardingAfterAccessChange(database as never, tenant),
    ).resolves.toEqual({ status: "final_access_held" });

    expect(batch.mock.calls[0]?.[0]).toHaveLength(4);
    expect(prepared.some(({ sql }) =>
      sql.includes("DELETE FROM beta_onboarding_flow_events")
    )).toBe(false);
  });

  it("prepares account deletion with legal-hold-aware evidence cleanup", async () => {
    const unheld = createDatabase();
    await expect(
      prepareOnboardingAccountDeletionStatements(
        unheld.database as never,
        tenant,
      ),
    ).resolves.toHaveLength(9);
    expect(unheld.prepared.some(({ sql }) =>
      sql.includes("DELETE FROM beta_onboarding_flow_states")
    )).toBe(true);
    for (const statement of unheld.prepared.filter(({ sql }) => (
      sql.includes("DELETE FROM beta_onboarding_flow_")
      || sql.includes("DELETE FROM beta_activation_")
    ))) {
      expect(statement.sql).toContain("FROM beta_activation_retention_holds hold");
      expect(statement.sql).toContain("datetime(hold.starts_at) <= datetime('now')");
      expect(statement.sql).toContain("datetime(hold.expires_at) > datetime('now')");
    }

    mocks.hasActiveActivationHold.mockResolvedValueOnce(true);
    const held = createDatabase();
    await expect(
      prepareOnboardingAccountDeletionStatements(
        held.database as never,
        tenant,
      ),
    ).resolves.toHaveLength(4);
    expect(held.prepared.some(({ sql }) =>
      sql.includes("DELETE FROM beta_onboarding_flow_states")
    )).toBe(false);
  });

  it("purges expired flow events only outside active legal holds and fails closed", async () => {
    const now = new Date("2026-07-12T00:00:00.000Z");
    const success = createDatabase({
      run: () => ({ success: true, meta: { changes: 3 } }),
    });

    await expect(
      purgeExpiredOnboardingEvents(success.database as never, { now }),
    ).resolves.toEqual({ events: 3 });
    expect(success.prepared[0]?.sql).toContain(
      "FROM beta_activation_retention_holds hold",
    );
    expect(success.prepared[0]?.sql).toContain(
      "datetime(hold.starts_at) <= datetime(?)",
    );
    expect(success.prepared[0]?.sql).toContain(
      "datetime(hold.expires_at) > datetime(?)",
    );
    expect(success.prepared[0]?.values).toEqual([
      "2026-01-13T00:00:00.000Z",
      "2026-07-12T00:00:00.000Z",
      "2026-07-12T00:00:00.000Z",
    ]);

    const failed = createDatabase({
      run: () => ({ success: false }),
    });
    await expect(
      purgeExpiredOnboardingEvents(failed.database as never, { now }),
    ).rejects.toThrow("Onboarding event retention purge failed.");
  });
});

describe("onboarding flow retention SQLite lifecycle", () => {
  it("exports both tenants, erases unheld evidence, and preserves held evidence", async () => {
    await useActualActivationRetention();
    const { database, sqlite } = seedHeldAndUnheldLifecycleDatabase();
    try {
      const heldExport = await exportOnboardingPrivacyData(database as never, {
        userId: "user-held",
        workspaceId: "workspace-held",
      });
      const unheldExport = await exportOnboardingPrivacyData(database as never, {
        userId: "user-unheld",
        workspaceId: "workspace-unheld",
      });
      for (const privacyExport of [heldExport, unheldExport]) {
        expect(privacyExport.activation.events).toHaveLength(1);
        expect(privacyExport.activation.progress).toMatchObject({
          selectedPath: "blank",
          lastMilestone: "first_valid_total",
        });
        expect(privacyExport.flowStates).toHaveLength(1);
        expect(privacyExport.flowEvents).toHaveLength(1);
        expect(privacyExport.starterStates).toHaveLength(1);
        expect(privacyExport.starterClaims).toHaveLength(1);
      }

      await expect(eraseOnboardingPrivacyData(database as never, {
        userId: "user-unheld",
        workspaceId: "workspace-unheld",
      })).resolves.toEqual({ status: "erased" });
      await expect(eraseOnboardingPrivacyData(database as never, {
        userId: "user-held",
        workspaceId: "workspace-held",
      })).resolves.toEqual({ status: "skipped_legal_hold" });

      assertOnlyHeldEvidenceSurvives(sqlite);
    } finally {
      sqlite.close();
    }
  });

  it("executes final-access cleanup while retaining held evidence", async () => {
    await useActualActivationRetention();
    const { database, sqlite } = seedHeldAndUnheldLifecycleDatabase();
    try {
      sqlite.prepare(
        "DELETE FROM workspace_members WHERE user_id IN ('user-held', 'user-unheld')",
      ).run();

      await expect(reconcileOnboardingAfterAccessChange(database as never, {
        userId: "user-unheld",
        workspaceId: "workspace-unheld",
      })).resolves.toEqual({ status: "final_access_erased" });
      await expect(reconcileOnboardingAfterAccessChange(database as never, {
        userId: "user-held",
        workspaceId: "workspace-held",
      })).resolves.toEqual({ status: "final_access_held" });

      assertOnlyHeldEvidenceSurvives(sqlite);
    } finally {
      sqlite.close();
    }
  });

  it("executes account-deletion statements with legal-hold preservation", async () => {
    await useActualActivationRetention();
    const { database, sqlite } = seedHeldAndUnheldLifecycleDatabase();
    try {
      const unheldStatements = await prepareOnboardingAccountDeletionStatements(
        database as never,
        {
          userId: "user-unheld",
          workspaceId: "workspace-unheld",
        },
      );
      const heldStatements = await prepareOnboardingAccountDeletionStatements(
        database as never,
        {
          userId: "user-held",
          workspaceId: "workspace-held",
        },
      );
      expect(unheldStatements).toHaveLength(9);
      expect(heldStatements).toHaveLength(4);

      sqlite.prepare(`
        INSERT INTO beta_activation_retention_holds (
          user_id, workspace_id, reason_code, starts_at, expires_at,
          created_by, created_at, updated_at
        ) VALUES (
          'user-unheld',
          'workspace-unheld',
          'legal_hold',
          '2000-01-01T00:00:00.000Z',
          '2999-01-01T00:00:00.000Z',
          'user-unheld',
          '2026-07-24T00:00:00.000Z',
          '2026-07-24T00:00:00.000Z'
        )
      `).run();
      await database.batch(unheldStatements as never);
      await database.batch(heldStatements as never);

      expect(sqlite.prepare(`
        SELECT COUNT(*) AS count
        FROM beta_onboarding_flow_events
        WHERE user_id = 'user-unheld' AND workspace_id = 'workspace-unheld'
      `).get()).toEqual({ count: 1 });
      assertOnlyHeldEvidenceSurvives(sqlite, {
        includeUnheldEvidence: true,
      });
    } finally {
      sqlite.close();
    }
  });

  it("purges only expired unheld flow events", async () => {
    await useActualActivationRetention();
    const { database, sqlite } = seedHeldAndUnheldLifecycleDatabase();
    try {
      await expect(purgeExpiredOnboardingEvents(database as never, {
        now: new Date("2026-07-12T00:00:00.000Z"),
      })).resolves.toEqual({ events: 1 });

      expect(sqlite.prepare(`
        SELECT id, user_id, workspace_id
        FROM beta_onboarding_flow_events
        ORDER BY id
      `).all()).toEqual([{
        id: "flow-event-held",
        user_id: "user-held",
        workspace_id: "workspace-held",
      }]);
      expect(sqlite.prepare(
        "SELECT COUNT(*) AS count FROM beta_onboarding_flow_states",
      ).get()).toEqual({ count: 2 });
      expect(sqlite.prepare(
        "SELECT COUNT(*) AS count FROM beta_activation_events",
      ).get()).toEqual({ count: 2 });
      expect(sqlite.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      sqlite.close();
    }
  });

  it("preserves flow events covered by offset-formatted legal holds", async () => {
    await useActualActivationRetention();
    const { database, sqlite } = seedHeldAndUnheldLifecycleDatabase();
    try {
      sqlite.prepare(`
        UPDATE beta_activation_retention_holds
        SET starts_at = ?, expires_at = ?
        WHERE user_id = 'user-held' AND workspace_id = 'workspace-held'
      `).run(
        "2026-07-12T01:00:00+02:00",
        "2026-07-12T03:00:00+02:00",
      );

      await expect(purgeExpiredOnboardingEvents(database as never, {
        now: new Date("2026-07-12T00:00:00.000Z"),
      })).resolves.toEqual({ events: 1 });

      expect(sqlite.prepare(`
        SELECT id, user_id
        FROM beta_onboarding_flow_events
        ORDER BY id
      `).all()).toEqual([{
        id: "flow-event-held",
        user_id: "user-held",
      }]);
    } finally {
      sqlite.close();
    }
  });

  it("keeps current-generation run and practice evidence for an active guided flow", async () => {
    await useActualActivationRetention();
    const { database, sqlite } = seedHeldAndUnheldLifecycleDatabase();
    try {
      const old = "2025-01-01T00:00:00.000Z";
      const current = "2026-07-01T00:00:00.000Z";
      sqlite.prepare(`
        INSERT INTO beta_onboarding_flow_states (
          user_id, workspace_id, flow_key, flow_version, generation,
          tutorial_version, tutorial_generation, status, current_step_key,
          revision, reset_count, started_at, created_at, updated_at
        ) VALUES (?, ?, 'guided_estimate_practice', 1, 3, 2, 7, 'in_progress',
          'practice_price_and_save', 2, 0, ?, ?, ?)
      `).run("user-unheld", "workspace-unheld", current, current, current);
      sqlite.prepare(`
        INSERT INTO beta_onboarding_flow_events (
          id, user_id, workspace_id, flow_key, flow_version, generation,
          tutorial_version, tutorial_generation, run_id, launch_mode, step_key,
          event_type, source, idempotency_key, state_revision, occurred_at, ingested_at
        ) VALUES
          ('current-run', 'user-unheld', 'workspace-unheld', 'guided_estimate_practice', 1, 3,
            2, 7, 'run-current', 'start', 'practice_workspace', 'flow_started',
            'user_command', 'current-run', 0, ?, ?),
          ('current-practice', 'user-unheld', 'workspace-unheld', 'guided_estimate_practice', 1, 3,
            2, 7, 'run-current', 'system', 'practice_price_and_save', 'practice_action_completed',
            'tutorial_practice', 'current-practice', 2, ?, ?)
      `).run(old, current, old, current);

      await expect(purgeExpiredOnboardingEvents(database as never, {
        now: new Date("2026-07-12T00:00:00.000Z"),
      })).resolves.toEqual({ events: 1 });

      expect(sqlite.prepare(`
        SELECT id FROM beta_onboarding_flow_events
        WHERE id IN ('current-run', 'current-practice') ORDER BY id
      `).all()).toEqual([{ id: "current-practice" }, { id: "current-run" }]);
    } finally {
      sqlite.close();
    }
  });

  it("keeps current tutorial practice proof after the guided flow completes", async () => {
    await useActualActivationRetention();
    const { database, sqlite } = seedHeldAndUnheldLifecycleDatabase();
    try {
      const old = "2025-01-01T00:00:00.000Z";
      const current = "2026-07-01T00:00:00.000Z";
      sqlite.prepare(`
        INSERT INTO beta_onboarding_flow_states (
          user_id, workspace_id, flow_key, flow_version, generation,
          tutorial_version, tutorial_generation, status, current_step_key,
          revision, reset_count, started_at, completed_at, created_at, updated_at
        ) VALUES (?, ?, 'guided_estimate_practice', 1, 3, 2, 7, 'completed',
          'complete', 3, 0, ?, ?, ?, ?)
      `).run(
        "user-unheld",
        "workspace-unheld",
        current,
        current,
        current,
        current,
      );
      sqlite.prepare(`
        INSERT INTO beta_onboarding_flow_events (
          id, user_id, workspace_id, flow_key, flow_version, generation,
          tutorial_version, tutorial_generation, run_id, launch_mode, step_key,
          event_type, source, idempotency_key, state_revision, occurred_at, ingested_at
        ) VALUES (
          'completed-practice',
          'user-unheld',
          'workspace-unheld',
          'guided_estimate_practice',
          1,
          3,
          2,
          7,
          'run-completed',
          'system',
          'practice_add_and_source',
          'practice_action_completed',
          'tutorial_practice',
          'completed-practice',
          2,
          ?,
          ?
        )
      `).run(old, current);

      await purgeExpiredOnboardingEvents(database as never, {
        now: new Date("2026-07-12T00:00:00.000Z"),
      });

      expect(sqlite.prepare(`
        SELECT id
        FROM beta_onboarding_flow_events
        WHERE id = 'completed-practice'
      `).get()).toEqual({ id: "completed-practice" });
    } finally {
      sqlite.close();
    }
  });
});
