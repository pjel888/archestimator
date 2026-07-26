import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

const requireRuntime = createRequire(import.meta.url);
const onboardingMigration = readFileSync(
  "migrations/0101_beta_onboarding_flow_state.sql",
  "utf8",
);
const supportContextMigration = readFileSync(
  "migrations/0102_onboarding_support_context.sql",
  "utf8",
);
const activationResourceIntegrityMigration = readFileSync(
  "migrations/0103_onboarding_activation_resource_integrity.sql",
  "utf8",
);
const onboardingResourceBindingsMigration = readFileSync(
  "migrations/0105_onboarding_resource_bindings_and_starter_leases.sql",
  "utf8",
);
const starterMutationFencesMigration = readFileSync(
  "migrations/0117_onboarding_starter_mutation_fences.sql",
  "utf8",
);

type LocalSqliteDatabase = {
  exec(sql: string): void;
  prepare(sql: string): {
    all(...parameters: unknown[]): Record<string, unknown>[];
    get(...parameters: unknown[]): Record<string, unknown> | undefined;
    run(...parameters: unknown[]): unknown;
  };
  close(): void;
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
  return database;
}

function seedActivationState(database: LocalSqliteDatabase) {
  const now = "2026-07-23T00:00:00.000Z";
  const userId = "user-1";
  const workspaceId = "workspace-1";
  database.prepare(`
    INSERT INTO workspaces (id, name, created_by, created_at, updated_at)
    VALUES (?, 'Workspace', ?, ?, ?)
  `).run(workspaceId, userId, now, now);
  database.prepare(`
    INSERT INTO workspace_members (
      workspace_id, user_id, role, created_at, updated_at
    ) VALUES (?, ?, 'owner', ?, ?)
  `).run(workspaceId, userId, now, now);
  database.prepare(`
    INSERT INTO projects (
      id, workspace_id, name, created_by, metadata, created_at, updated_at
    ) VALUES (?, ?, 'Tutorial', ?, '{"activation_sample":1}', ?, ?)
  `).run("project-tutorial", workspaceId, userId, now, now);
  database.prepare(`
    INSERT INTO projects (
      id, workspace_id, name, created_by, metadata, created_at, updated_at
    ) VALUES (?, ?, 'User project', ?, '{}', ?, ?)
  `).run("project-user", workspaceId, userId, now, now);
  database.prepare(`
    INSERT INTO estimates (
      id, project_id, name, created_by, created_at, updated_at
    ) VALUES (?, ?, 'Tutorial estimate', ?, ?, ?)
  `).run("estimate-tutorial", "project-tutorial", userId, now, now);
  database.prepare(`
    INSERT INTO estimates (
      id, project_id, name, created_by, created_at, updated_at
    ) VALUES (?, ?, 'User estimate', ?, ?, ?)
  `).run("estimate-user", "project-user", userId, now, now);

  const insertEvent = database.prepare(`
    INSERT INTO beta_activation_events (
      id, user_id, workspace_id, project_id, estimate_id, milestone, source,
      occurred_at, dedupe_key, metadata_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'estimate', ?, ?, '{}', ?)
  `);
  insertEvent.run(
    "event-tutorial",
    userId,
    workspaceId,
    "project-tutorial",
    "estimate-tutorial",
    "first_valid_total",
    "2026-07-23T00:01:00.000Z",
    "tutorial-total",
    now,
  );
  insertEvent.run(
    "event-user",
    userId,
    workspaceId,
    "project-user",
    "estimate-user",
    "first_area_created",
    "2026-07-23T00:02:00.000Z",
    "user-area",
    now,
  );
  database.prepare(`
    INSERT INTO beta_activation_progress (
      user_id, workspace_id, selected_path, project_id, estimate_id,
      last_milestone, first_value_completed_at, created_at, updated_at
    ) VALUES (?, ?, 'guided_sample', ?, ?, 'first_valid_total', ?, ?, ?)
  `).run(
    userId,
    workspaceId,
    "project-tutorial",
    "estimate-tutorial",
    "2026-07-23T00:01:00.000Z",
    now,
    now,
  );
  database.prepare(`
    INSERT INTO beta_activation_outbox (
      id, domain_mutation_id, user_id, workspace_id, project_id, estimate_id,
      milestone, source, occurred_at, dedupe_key, metadata_json,
      next_attempt_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'first_valid_total', 'estimate', ?, ?, '{}', ?, ?, ?)
  `).run(
    "outbox-tutorial",
    "mutation-tutorial",
    userId,
    workspaceId,
    "project-tutorial",
    "estimate-tutorial",
    now,
    "tutorial-outbox",
    now,
    now,
    now,
  );

  return { userId, workspaceId };
}

describe("beta onboarding flow D1 migrations", () => {
  it("preserves prior flow events and adds exclusive starter mutation leases", () => {
    const database = createDatabase();
    try {
      const tenant = seedActivationState(database);
      const now = "2026-07-23T00:00:00.000Z";
      database.exec(onboardingMigration);
      database.prepare(`
        INSERT INTO beta_onboarding_flow_states (
          user_id, workspace_id, flow_key, flow_version, status,
          created_at, updated_at
        ) VALUES (?, ?, 'first_estimate_value', 1, 'in_progress', ?, ?)
      `).run(tenant.userId, tenant.workspaceId, now, now);
      database.prepare(`
        INSERT INTO beta_onboarding_flow_events (
          id, user_id, workspace_id, flow_key, flow_version, generation,
          run_id, launch_mode, event_type, source, idempotency_key,
          state_revision, occurred_at, ingested_at
        ) VALUES (
          'pre-binding-event', ?, ?, 'first_estimate_value', 1, 1,
          'run-1', 'start', 'flow_started', 'user_command',
          'pre-binding-event', 0, ?, ?
        )
      `).run(tenant.userId, tenant.workspaceId, now, now);

      database.exec(onboardingResourceBindingsMigration);
      database.exec(starterMutationFencesMigration);

      expect(database.prepare(`
        SELECT id, resource_id
        FROM beta_onboarding_flow_events
        WHERE id = 'pre-binding-event'
      `).get()).toEqual({ id: "pre-binding-event", resource_id: null });
      expect(database.prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table' AND name = 'beta_starter_mutation_leases'
      `).get()).toEqual({ name: "beta_starter_mutation_leases" });
      database.prepare(`
        INSERT INTO beta_starter_mutation_leases (
          workspace_id, pack_version, lease_token, actor_user_id, operation,
          expires_at, created_at
        ) VALUES (?, 2, 'lease-1', ?, 'restore', ?, ?)
      `).run(tenant.workspaceId, tenant.userId, "2026-07-23T00:10:00.000Z", now);
      database.prepare(`
        INSERT INTO beta_starter_pack_states (
          workspace_id, pack_version, scope_kind, scope_owner_id, status,
          revision, shared_membership_revision, created_at, updated_at
        ) VALUES (?, 2, 'workspace', ?, 'complete', 0, 1, ?, ?)
      `).run(tenant.workspaceId, tenant.workspaceId, now, now);
      expect(() => database.prepare(`
        INSERT INTO beta_starter_restore_cas_guards (
          guard_nonce, workspace_id, pack_version, scope_owner_id,
          expected_revision, created_at
        ) VALUES ('restore-guard-stale', ?, 2, ?, 1, ?)
      `).run(tenant.workspaceId, tenant.workspaceId, now)).toThrow(/starter_restore_stale/);
      database.prepare(`
        INSERT INTO beta_starter_restore_cas_guards (
          guard_nonce, workspace_id, pack_version, scope_owner_id,
          expected_revision, created_at
        ) VALUES ('restore-guard-current', ?, 2, ?, 0, ?)
      `).run(tenant.workspaceId, tenant.workspaceId, now);
      database.prepare(`
        DELETE FROM beta_starter_restore_cas_guards
        WHERE guard_nonce = 'restore-guard-current'
      `).run();
      database.prepare(`
        INSERT INTO beta_starter_mutation_fence_guards (
          guard_nonce, workspace_id, pack_version, lease_token, created_at
        ) VALUES ('guard-1', ?, 2, 'lease-1', ?)
      `).run(tenant.workspaceId, now);
      expect(() => database.prepare(`
        INSERT INTO beta_starter_mutation_fence_guards (
          guard_nonce, workspace_id, pack_version, lease_token, created_at
        ) VALUES ('guard-invalid', ?, 2, 'missing-lease', ?)
      `).run(tenant.workspaceId, now)).toThrow();
      expect(() => database.prepare(`
        INSERT INTO beta_starter_mutation_leases (
          workspace_id, pack_version, lease_token, actor_user_id, operation,
          expires_at, created_at
        ) VALUES (?, 2, 'lease-2', ?, 'resume', ?, ?)
      `).run(
        tenant.workspaceId,
        tenant.userId,
        "2026-07-23T00:10:00.000Z",
        now,
      )).toThrow();
      database.prepare("DELETE FROM workspaces WHERE id = ?").run(tenant.workspaceId);
      expect(database.prepare(
        "SELECT COUNT(*) AS count FROM beta_starter_mutation_leases",
      ).get()).toEqual({ count: 0 });
      expect(database.prepare(
        "SELECT COUNT(*) AS count FROM beta_starter_mutation_fence_guards",
      ).get()).toEqual({ count: 0 });
      expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      database.close();
    }
  });

  it("backfills activation origin and rebuilds progress from user-domain evidence only", () => {
    const database = createDatabase();
    try {
      const tenant = seedActivationState(database);
      database.exec(onboardingMigration);

      expect(database.prepare(`
        SELECT id, origin_class
        FROM beta_activation_events
        ORDER BY id
      `).all()).toEqual([
        { id: "event-tutorial", origin_class: "tutorial_seed" },
        { id: "event-user", origin_class: "user_domain" },
      ]);
      expect(database.prepare(`
        SELECT origin_class
        FROM beta_activation_outbox
        WHERE id = 'outbox-tutorial'
      `).get()).toEqual({ origin_class: "tutorial_seed" });
      expect(database.prepare(`
        SELECT project_id, estimate_id, last_milestone, first_value_completed_at
        FROM beta_activation_progress
        WHERE user_id = ? AND workspace_id = ?
      `).get(tenant.userId, tenant.workspaceId)).toEqual({
        project_id: "project-user",
        estimate_id: "estimate-user",
        last_milestone: "first_area_created",
        first_value_completed_at: null,
      });
      expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      database.close();
    }
  });

  it("creates constrained flow, event, and starter-pack state", () => {
    const database = createDatabase();
    try {
      const tenant = seedActivationState(database);
      database.exec(onboardingMigration);

      const tables = database.prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND (
            name LIKE 'beta_onboarding_%'
            OR name LIKE 'beta_starter_%'
          )
        ORDER BY name
      `).all().map((row) => row.name);
      const indexes = database.prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'index'
          AND (
            tbl_name LIKE 'beta_onboarding_%'
            OR tbl_name LIKE 'beta_starter_%'
          )
        ORDER BY name
      `).all().map((row) => row.name);

      expect(tables).toEqual([
        "beta_onboarding_flow_events",
        "beta_onboarding_flow_states",
        "beta_starter_asset_claims",
        "beta_starter_pack_states",
      ]);
      expect(indexes).toEqual(expect.arrayContaining([
        "idx_beta_onboarding_events_flow_occurred",
        "idx_beta_onboarding_events_ingested",
        "idx_beta_onboarding_events_user_occurred",
        "idx_beta_onboarding_states_flow_status",
        "idx_beta_onboarding_states_user_status",
        "idx_beta_starter_claims_active_key",
        "idx_beta_starter_claims_active_resource",
        "idx_beta_starter_pack_states_workspace_status",
      ]));

      expect(() => database.prepare(`
        INSERT INTO beta_onboarding_flow_states (
          user_id, workspace_id, flow_key, flow_version, status,
          created_at, updated_at
        ) VALUES (?, ?, 'guided_estimate_practice', 1, 'not_started', ?, ?)
      `).run(tenant.userId, tenant.workspaceId, "2026-07-23T00:00:00.000Z", "2026-07-23T00:00:00.000Z")).toThrow();
      expect(() => database.prepare(`
        INSERT INTO beta_activation_events (
          id, user_id, workspace_id, milestone, source, origin_class,
          occurred_at, dedupe_key, metadata_json, created_at
        ) VALUES (
          'bad-origin', ?, ?, 'workspace_ready', 'project', 'passive_visit',
          ?, 'bad-origin', '{}', ?
        )
      `).run(
        tenant.userId,
        tenant.workspaceId,
        "2026-07-23T00:00:00.000Z",
        "2026-07-23T00:00:00.000Z",
      )).toThrow();
      expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      database.close();
    }
  });

  it("repairs and rejects cross-project activation pairs while allowing direct project deletion", () => {
    const database = createDatabase();
    try {
      seedActivationState(database);
      database.exec(onboardingMigration);
      database.prepare(`
        UPDATE beta_activation_progress
        SET project_id = 'project-user', estimate_id = 'estimate-tutorial'
      `).run();
      database.prepare(`
        UPDATE beta_activation_events
        SET project_id = 'project-user'
        WHERE id = 'event-tutorial'
      `).run();
      database.prepare(`
        UPDATE beta_activation_outbox
        SET project_id = 'project-user'
        WHERE id = 'outbox-tutorial'
      `).run();

      database.exec(activationResourceIntegrityMigration);

      expect(database.prepare(`
        SELECT project_id, estimate_id
        FROM beta_activation_progress
      `).get()).toEqual({
        project_id: "project-tutorial",
        estimate_id: "estimate-tutorial",
      });
      expect(database.prepare(`
        SELECT project_id, estimate_id
        FROM beta_activation_events
        WHERE id = 'event-tutorial'
      `).get()).toEqual({
        project_id: "project-tutorial",
        estimate_id: "estimate-tutorial",
      });
      expect(database.prepare(`
        SELECT project_id, estimate_id
        FROM beta_activation_outbox
        WHERE id = 'outbox-tutorial'
      `).get()).toEqual({
        project_id: "project-tutorial",
        estimate_id: "estimate-tutorial",
      });

      for (const table of [
        "beta_activation_progress",
        "beta_activation_events",
        "beta_activation_outbox",
      ]) {
        expect(() => database.prepare(`
          UPDATE ${table}
          SET project_id = 'project-user'
          WHERE estimate_id = 'estimate-tutorial'
        `).run()).toThrow(/activation_resource_integrity/);
      }

      expect(() => database.prepare(`
        DELETE FROM projects
        WHERE id = 'project-tutorial'
      `).run()).not.toThrow();
      expect(database.prepare(`
        SELECT project_id, estimate_id
        FROM beta_activation_progress
      `).get()).toEqual({ project_id: null, estimate_id: null });
      expect(database.prepare(`
        SELECT project_id, estimate_id
        FROM beta_activation_events
        WHERE id = 'event-tutorial'
      `).get()).toEqual({ project_id: null, estimate_id: null });
      expect(database.prepare(`
        SELECT project_id, estimate_id
        FROM beta_activation_outbox
        WHERE id = 'outbox-tutorial'
      `).get()).toEqual({ project_id: null, estimate_id: null });
      expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      database.close();
    }
  });

  it("rejects parent moves that would break activation resource ownership", () => {
    const database = createDatabase();
    try {
      const tenant = seedActivationState(database);
      const now = "2026-07-23T00:00:00.000Z";
      database.exec(onboardingMigration);
      database.exec(activationResourceIntegrityMigration);
      database.prepare(`
        INSERT INTO workspaces (id, name, created_by, created_at, updated_at)
        VALUES ('workspace-2', 'Second workspace', ?, ?, ?)
      `).run(tenant.userId, now, now);

      for (const projectId of ["project-user", "project-tutorial"]) {
        expect(() => database.prepare(`
          UPDATE projects
          SET workspace_id = 'workspace-2'
          WHERE id = ?
        `).run(projectId)).toThrow(/activation_resource_integrity/);
        expect(database.prepare(`
          SELECT workspace_id
          FROM projects
          WHERE id = ?
        `).get(projectId)).toEqual({ workspace_id: tenant.workspaceId });
      }

      for (const [estimateId, movedProjectId, originalProjectId] of [
        ["estimate-user", "project-tutorial", "project-user"],
        ["estimate-tutorial", "project-user", "project-tutorial"],
      ]) {
        expect(() => database.prepare(`
          UPDATE estimates
          SET project_id = ?
          WHERE id = ?
        `).run(movedProjectId, estimateId)).toThrow(/activation_resource_integrity/);
        expect(database.prepare(`
          SELECT project_id
          FROM estimates
          WHERE id = ?
        `).get(estimateId)).toEqual({ project_id: originalProjectId });
      }
      expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      database.close();
    }
  });

  it("cascades onboarding events and starter claims with their owning workspace", () => {
    const database = createDatabase();
    try {
      const tenant = seedActivationState(database);
      database.exec(onboardingMigration);
      const now = "2026-07-23T00:00:00.000Z";
      database.prepare(`
        INSERT INTO beta_onboarding_flow_states (
          user_id, workspace_id, flow_key, flow_version, status,
          created_at, updated_at
        ) VALUES (?, ?, 'core_orientation', 1, 'in_progress', ?, ?)
      `).run(tenant.userId, tenant.workspaceId, now, now);
      database.prepare(`
        INSERT INTO beta_onboarding_flow_events (
          id, user_id, workspace_id, flow_key, flow_version, generation,
          run_id, launch_mode, event_type, source, idempotency_key,
          state_revision, occurred_at, ingested_at
        ) VALUES (
          'flow-event', ?, ?, 'core_orientation', 1, 1,
          'run-1', 'start', 'started', 'user_command', 'flow-event',
          1, ?, ?
        )
      `).run(tenant.userId, tenant.workspaceId, now, now);
      database.prepare(`
        INSERT INTO beta_starter_pack_states (
          workspace_id, pack_version, scope_kind, scope_owner_id, status,
          created_at, updated_at
        ) VALUES (?, 1, 'workspace', ?, 'complete', ?, ?)
      `).run(tenant.workspaceId, tenant.workspaceId, now, now);
      database.prepare(`
        INSERT INTO beta_starter_asset_claims (
          workspace_id, pack_version, scope_kind, scope_owner_id,
          asset_key, asset_kind, starter_generation, resource_id,
          lifecycle_state, created_at, updated_at
        ) VALUES (
          ?, 1, 'workspace', ?, 'starter-project', 'project', 1,
          'project-user', 'active', ?, ?
        )
      `).run(tenant.workspaceId, tenant.workspaceId, now, now);

      database.prepare("DELETE FROM workspaces WHERE id = ?").run(tenant.workspaceId);

      expect(database.prepare("SELECT COUNT(*) AS count FROM beta_onboarding_flow_states").get()).toEqual({ count: 0 });
      expect(database.prepare("SELECT COUNT(*) AS count FROM beta_onboarding_flow_events").get()).toEqual({ count: 0 });
      expect(database.prepare("SELECT COUNT(*) AS count FROM beta_starter_pack_states").get()).toEqual({ count: 0 });
      expect(database.prepare("SELECT COUNT(*) AS count FROM beta_starter_asset_claims").get()).toEqual({ count: 0 });
      expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      database.close();
    }
  });

  it("adds allowlisted onboarding context fields and rejects invalid values", () => {
    const database = createDatabase();
    try {
      database.exec(`
        CREATE TABLE support_messages (
          id TEXT PRIMARY KEY
        );
        CREATE TABLE support_message_context (
          message_id TEXT PRIMARY KEY REFERENCES support_messages(id) ON DELETE CASCADE,
          route_template TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `);
      database.exec(supportContextMigration);

      const columns = database.prepare(
        "PRAGMA table_info(support_message_context)",
      ).all().map((row) => row.name);
      const indexes = database.prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'index' AND tbl_name = 'support_message_context'
      `).all().map((row) => row.name);
      expect(columns).toEqual(expect.arrayContaining([
        "onboarding_flow_key",
        "onboarding_flow_version",
        "onboarding_step_key",
        "onboarding_reason_code",
        "onboarding_route_key",
        "onboarding_viewport_class",
      ]));
      expect(indexes).toContain("idx_support_message_context_onboarding_flow");

      database.prepare("INSERT INTO support_messages (id) VALUES ('message-valid')").run();
      database.prepare(`
        INSERT INTO support_message_context (
          message_id, route_template, onboarding_flow_key,
          onboarding_flow_version, onboarding_step_key,
          onboarding_reason_code, onboarding_route_key,
          onboarding_viewport_class, created_at
        ) VALUES (
          'message-valid', '/workshop/projects/:projectId',
          'first_estimate_value', 1, 'open-estimate',
          'target_missing', 'estimate', 'desktop', ?
        )
      `).run("2026-07-23T00:00:00.000Z");

      database.prepare("INSERT INTO support_messages (id) VALUES ('message-invalid')").run();
      expect(() => database.prepare(`
        INSERT INTO support_message_context (
          message_id, route_template, onboarding_flow_key,
          onboarding_flow_version, onboarding_viewport_class, created_at
        ) VALUES (
          'message-invalid', '/workshop', 'unknown_flow',
          0, 'tablet', ?
        )
      `).run("2026-07-23T00:00:00.000Z")).toThrow();
      expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      database.close();
    }
  });
});
