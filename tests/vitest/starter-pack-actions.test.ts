import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1Result,
  D1Value,
} from "@/lib/cloudflare/d1";
import {
  installStarterPackForEligibleWorkspace,
  installStarterPackForNewWorkspace,
  resumeStarterContent,
  restoreStarterContent,
} from "@/lib/onboarding/starter-pack-actions";
import {
  STARTER_EXAMPLES_GROUP_NAME,
  STARTER_PACK_VERSION,
  STARTER_USER_ASSET_KEYS,
  STARTER_WORKSPACE_ASSET_KEYS,
} from "@/lib/onboarding/starter-pack";

const requireRuntime = createRequire(import.meta.url);
const USER_ID = "user-1";
const MEMBER_ID = "user-2";
const OTHER_MEMBER_ID = "user-3";
const WORKSPACE_ID = "workspace-1";
const NOW = "2026-07-24T00:00:00.000Z";

const mocks = vi.hoisted(() => ({
  database: null as D1DatabaseLike | null,
  actorUserId: "user-1",
}));

vi.mock("@/lib/cloudflare/d1", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/cloudflare/d1")>(),
  getCloudflareD1Database: vi.fn(async () => mocks.database),
}));

vi.mock("@/lib/auth/session", () => ({
  requireCurrentUserContext: vi.fn(async () => ({ userId: USER_ID })),
}));

vi.mock("@/lib/onboarding/flow-actions", () => ({
  resolveCurrentOnboardingActor: vi.fn(async () => ({
    userId: mocks.actorUserId,
    workspaceId: WORKSPACE_ID,
    workspaceRole: "owner",
    accessSource: "workspace",
  })),
}));

type SqliteStatement = {
  all(...parameters: unknown[]): Record<string, unknown>[];
  get(...parameters: unknown[]): Record<string, unknown> | undefined;
  run(...parameters: unknown[]): { changes: number | bigint };
};

type SqliteDatabase = {
  close(): void;
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
};

function normalizeValue(value: D1Value) {
  return value instanceof ArrayBuffer ? Buffer.from(value) : value;
}

class SqliteD1Statement<T = Record<string, unknown>>
  implements D1PreparedStatementLike<T>
{
  private values: D1Value[] = [];

  constructor(
    private readonly database: SqliteDatabase,
    readonly sql: string,
  ) {}

  bind(...values: D1Value[]) {
    this.values = values;
    return this;
  }

  async first<R = T>(): Promise<R | null> {
    return (
      this.database.prepare(this.sql).get(...this.values.map(normalizeValue)) as
        | R
        | undefined
    ) ?? null;
  }

  async all<R = T>(): Promise<D1Result<R>> {
    return {
      success: true,
      results: this.database.prepare(this.sql).all(
        ...this.values.map(normalizeValue),
      ) as R[],
    };
  }

  async run(): Promise<D1Result<T>> {
    const result = this.database.prepare(this.sql).run(
      ...this.values.map(normalizeValue),
    );
    return { success: true, meta: { changes: Number(result.changes) } };
  }
}

class SqliteD1Database implements D1DatabaseLike {
  replaceLeaseBeforeNextRenewal = false;

  constructor(readonly sqlite: SqliteDatabase) {}

  prepare<T = Record<string, unknown>>(sql: string) {
    return new SqliteD1Statement<T>(this.sqlite, sql);
  }

  async batch<T = Record<string, unknown>>(
    statements: D1PreparedStatementLike<T>[],
  ): Promise<D1Result<T>[]> {
    if (
      this.replaceLeaseBeforeNextRenewal
      && (statements as SqliteD1Statement<T>[]).some((statement) =>
        statement.sql.includes("UPDATE beta_starter_mutation_leases")
        && statement.sql.includes("SET expires_at = ?"))
    ) {
      this.replaceLeaseBeforeNextRenewal = false;
      this.sqlite.prepare(`
        UPDATE beta_starter_mutation_leases
        SET lease_token = 'successor-lease', actor_user_id = 'successor-user'
      `).run();
    }
    this.sqlite.exec("BEGIN IMMEDIATE");
    try {
      const results: D1Result<T>[] = [];
      for (const statement of statements as SqliteD1Statement<T>[]) {
        results.push(await statement.run());
      }
      this.sqlite.exec("COMMIT");
      return results;
    } catch (error) {
      this.sqlite.exec("ROLLBACK");
      throw error;
    }
  }
}

function createDatabase() {
  const { DatabaseSync } = requireRuntime("node:sqlite") as {
    DatabaseSync: new (path: string) => SqliteDatabase;
  };
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  for (const migration of readdirSync("migrations")
    .filter((name) => /^\d{4}_.+\.sql$/.test(name) && name <= "0101_zzzz.sql")
    .sort()) {
    sqlite.exec(readFileSync(`migrations/${migration}`, "utf8"));
  }
  sqlite.exec(readFileSync(
    "migrations/0105_onboarding_resource_bindings_and_starter_leases.sql",
    "utf8",
  ));
  sqlite.exec(readFileSync(
    "migrations/0117_onboarding_starter_mutation_fences.sql",
    "utf8",
  ));
  sqlite.prepare(`
    INSERT INTO workspaces (id, name, created_by, created_at, updated_at)
    VALUES (?, 'Workspace', ?, ?, ?)
  `).run(WORKSPACE_ID, USER_ID, NOW, NOW);
  sqlite.prepare(`
    INSERT INTO workspace_members (
      workspace_id, user_id, role, created_at, updated_at
    ) VALUES (?, ?, 'owner', ?, ?)
  `).run(WORKSPACE_ID, USER_ID, NOW, NOW);
  return new SqliteD1Database(sqlite);
}

function activeClaimKeys(
  database: SqliteD1Database,
  scopeKind: "workspace" | "user",
  scopeOwnerId: string,
) {
  return database.sqlite.prepare(`
    SELECT asset_key
    FROM beta_starter_asset_claims
    WHERE workspace_id = ? AND pack_version = ?
      AND scope_kind = ? AND scope_owner_id = ?
      AND lifecycle_state = 'active'
    ORDER BY asset_key
  `).all(WORKSPACE_ID, STARTER_PACK_VERSION, scopeKind, scopeOwnerId)
    .map((row) => row.asset_key);
}

describe("starter pack actions", () => {
  let database: SqliteD1Database;

  beforeEach(() => {
    database = createDatabase();
    mocks.database = database;
    mocks.actorUserId = USER_ID;
  });

  afterEach(() => {
    mocks.database = null;
    database.sqlite.close();
  });

  it("installs once, resumes idempotently, and creates exact per-user Starter Examples membership", async () => {
    await expect(
      installStarterPackForNewWorkspace(database, {
        workspaceId: WORKSPACE_ID,
        userId: USER_ID,
      }),
    ).resolves.toEqual({
      workspaceStatus: "complete",
      userStatus: "complete",
      ready: true,
    });

    const resourceCounts = database.sqlite.prepare(`
      SELECT
        (SELECT COUNT(*) FROM projects WHERE workspace_id = ?) AS projects,
        (SELECT COUNT(*) FROM project_groups WHERE workspace_id = ? AND user_id = ?) AS groups,
        (SELECT COUNT(*) FROM project_group_memberships WHERE workspace_id = ? AND user_id = ?) AS memberships
    `).get(WORKSPACE_ID, WORKSPACE_ID, USER_ID, WORKSPACE_ID, USER_ID);
    database.sqlite.prepare(`
      UPDATE beta_starter_pack_states
      SET status = 'partial'
      WHERE workspace_id = ? AND scope_kind = 'workspace'
        AND scope_owner_id = ?
    `).run(WORKSPACE_ID, WORKSPACE_ID);

    await expect(
      installStarterPackForEligibleWorkspace(database, {
        workspaceId: WORKSPACE_ID,
        userId: USER_ID,
      }),
    ).resolves.toMatchObject({ ready: true });

    expect(activeClaimKeys(database, "workspace", WORKSPACE_ID)).toEqual(
      [...STARTER_WORKSPACE_ASSET_KEYS].sort(),
    );
    expect(activeClaimKeys(database, "user", USER_ID)).toEqual(
      [...STARTER_USER_ASSET_KEYS].sort(),
    );
    expect(database.sqlite.prepare(`
      SELECT name
      FROM project_groups
      WHERE workspace_id = ? AND user_id = ?
    `).all(WORKSPACE_ID, USER_ID)).toEqual([
      { name: STARTER_EXAMPLES_GROUP_NAME },
    ]);
    expect(database.sqlite.prepare(`
      SELECT project.name
      FROM project_group_memberships membership
      INNER JOIN projects project ON project.id = membership.project_id
      WHERE membership.workspace_id = ? AND membership.user_id = ?
      ORDER BY project.name
    `).all(WORKSPACE_ID, USER_ID)).toEqual([
      { name: "Casa Amihan - Guided Rizal Residence" },
      { name: "Habi Studio - Quezon City Fit-Out" },
    ]);
    expect(database.sqlite.prepare(`
      SELECT COUNT(*) AS count
      FROM estimate_row_items row
      WHERE json_extract(row.metadata_json, '$.expressComponent.kind') = 'express'
    `).get()).toEqual({ count: 3 });
    expect(database.sqlite.prepare(`
      SELECT
        json_extract(row.metadata_json, '$.projectComponentProjection.classification')
          AS classification
      FROM estimate_row_items row
      WHERE row.material = 'Project-specific Feature Partition'
      LIMIT 1
    `).get()).toEqual({ classification: "express" });
    expect(database.sqlite.prepare(`
      SELECT COUNT(*) AS count
      FROM projects
      WHERE workspace_id = ?
        AND json_array_length(json_extract(metadata, '$.referenceSources')) >= 4
        AND json_extract(metadata, '$.taxTreatment.basis') = 'EX_VAT'
        AND json_extract(metadata, '$.taxTreatment.vatRate') = 0.12
    `).get(WORKSPACE_ID)).toEqual({ count: 3 });
    expect(database.sqlite.prepare(`
      SELECT COUNT(*) AS count
      FROM estimate_row_items
      WHERE json_extract(source_snapshot_json, '$.pricingBasis') <> 'DEMO_ILLUSTRATIVE'
        OR json_extract(source_snapshot_json, '$.taxTreatment.basis') <> 'EX_VAT'
        OR json_array_length(json_extract(source_snapshot_json, '$.referenceSources')) < 4
    `).get()).toEqual({ count: 0 });
    expect(database.sqlite.prepare(`
      SELECT COUNT(*) AS count
      FROM cost_library_item_variant_cost_entries
      WHERE source_url IS NOT NULL
        AND json_extract(metadata_json, '$.taxTreatment.basis') = 'EX_VAT'
        AND json_array_length(json_extract(metadata_json, '$.referenceSources')) >= 2
    `).get()).toEqual({ count: 7 });
    expect(database.sqlite.prepare(`
      SELECT COUNT(*) AS count
      FROM estimate_templates
      WHERE json_extract(metadata, '$.taxTreatment.basis') = 'EX_VAT'
        AND json_array_length(json_extract(metadata, '$.referenceSources')) = 2
    `).get()).toEqual({ count: 3 });
    expect(database.sqlite.prepare(`
      SELECT COUNT(*) AS row_count
      FROM estimate_template_row_items
      GROUP BY template_id
      ORDER BY row_count
    `).all()).toEqual([
      { row_count: 3 },
      { row_count: 3 },
      { row_count: 3 },
    ]);
    expect(database.sqlite.prepare(`
      SELECT json_array_length(json_extract(snapshot_json, '$.rows')) AS row_count
      FROM estimate_template_versions
      ORDER BY template_id
    `).all()).toEqual([
      { row_count: 3 },
      { row_count: 3 },
      { row_count: 3 },
    ]);
    expect(database.sqlite.prepare(`
      SELECT
        (SELECT COUNT(*) FROM projects WHERE workspace_id = ?) AS projects,
        (SELECT COUNT(*) FROM project_groups WHERE workspace_id = ? AND user_id = ?) AS groups,
        (SELECT COUNT(*) FROM project_group_memberships WHERE workspace_id = ? AND user_id = ?) AS memberships
    `).get(WORKSPACE_ID, WORKSPACE_ID, USER_ID, WORKSPACE_ID, USER_ID)).toEqual(
      resourceCounts,
    );
  });

  it("restores a missing shared asset with a new generation and exact active claims", async () => {
    await installStarterPackForNewWorkspace(database, {
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
    });
    const missingClaim = database.sqlite.prepare(`
      SELECT resource_id
      FROM beta_starter_asset_claims
      WHERE workspace_id = ? AND scope_kind = 'workspace'
        AND asset_key = 'component.interior_paint_finish'
        AND lifecycle_state = 'active'
    `).get(WORKSPACE_ID);
    database.sqlite.prepare(
      "DELETE FROM cost_library_items WHERE id = ? AND workspace_id = ?",
    ).run(missingClaim?.resource_id, WORKSPACE_ID);
    const state = database.sqlite.prepare(`
      SELECT revision
      FROM beta_starter_pack_states
      WHERE workspace_id = ? AND scope_kind = 'workspace'
        AND scope_owner_id = ?
    `).get(WORKSPACE_ID, WORKSPACE_ID);

    await expect(
      restoreStarterContent({ expectedRevision: Number(state?.revision) }),
    ).resolves.toMatchObject({ ready: true });

    expect(database.sqlite.prepare(`
      SELECT starter_generation, lifecycle_state
      FROM beta_starter_asset_claims
      WHERE workspace_id = ? AND scope_kind = 'workspace'
        AND asset_key = 'component.interior_paint_finish'
      ORDER BY starter_generation
    `).all(WORKSPACE_ID)).toEqual([
      { starter_generation: 1, lifecycle_state: "missing" },
      { starter_generation: 2, lifecycle_state: "active" },
    ]);
    expect(activeClaimKeys(database, "workspace", WORKSPACE_ID)).toEqual(
      [...STARTER_WORKSPACE_ASSET_KEYS].sort(),
    );
  });

  it("does not let a member reconcile another user's starter scope", async () => {
    await installStarterPackForNewWorkspace(database, {
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
    });
    database.sqlite.prepare(`
      INSERT INTO workspace_members (workspace_id, user_id, role, created_at, updated_at)
      VALUES (?, ?, 'member', ?, ?), (?, ?, 'member', ?, ?)
    `).run(
      WORKSPACE_ID,
      MEMBER_ID,
      NOW,
      NOW,
      WORKSPACE_ID,
      OTHER_MEMBER_ID,
      NOW,
      NOW,
    );

    await installStarterPackForEligibleWorkspace(database, {
      workspaceId: WORKSPACE_ID,
      userId: MEMBER_ID,
    });

    expect(database.sqlite.prepare(`
      SELECT COUNT(*) AS count
      FROM beta_starter_pack_states
      WHERE workspace_id = ? AND pack_version = ?
        AND scope_kind = 'user' AND scope_owner_id = ?
    `).get(WORKSPACE_ID, STARTER_PACK_VERSION, MEMBER_ID)).toEqual({ count: 1 });
    expect(database.sqlite.prepare(`
      SELECT COUNT(*) AS count
      FROM beta_starter_pack_states
      WHERE workspace_id = ? AND pack_version = ?
        AND scope_kind = 'user' AND scope_owner_id = ?
    `).get(WORKSPACE_ID, STARTER_PACK_VERSION, OTHER_MEMBER_ID)).toEqual({ count: 0 });
  });

  it("lets a member resume only their own scope without degrading shared completion", async () => {
    await installStarterPackForNewWorkspace(database, {
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
    });
    database.sqlite.prepare(`
      INSERT INTO workspace_members (workspace_id, user_id, role, created_at, updated_at)
      VALUES (?, ?, 'member', ?, ?), (?, ?, 'member', ?, ?)
    `).run(
      WORKSPACE_ID,
      MEMBER_ID,
      NOW,
      NOW,
      WORKSPACE_ID,
      OTHER_MEMBER_ID,
      NOW,
      NOW,
    );
    mocks.actorUserId = MEMBER_ID;

    await expect(resumeStarterContent()).resolves.toEqual({
      workspaceStatus: "complete",
      userStatus: "complete",
      ready: true,
    });

    expect(database.sqlite.prepare(`
      SELECT status
      FROM beta_starter_pack_states
      WHERE workspace_id = ? AND pack_version = ?
        AND scope_kind = 'workspace' AND scope_owner_id = ?
    `).get(WORKSPACE_ID, STARTER_PACK_VERSION, WORKSPACE_ID)).toEqual({ status: "complete" });
    expect(database.sqlite.prepare(`
      SELECT scope_owner_id
      FROM beta_starter_pack_states
      WHERE workspace_id = ? AND pack_version = ?
        AND scope_kind = 'user' AND scope_owner_id IN (?, ?)
      ORDER BY scope_owner_id
    `).all(
      WORKSPACE_ID,
      STARTER_PACK_VERSION,
      MEMBER_ID,
      OTHER_MEMBER_ID,
    )).toEqual([{ scope_owner_id: MEMBER_ID }]);
  });

  it("blocks resume while another starter mutation lease is active", async () => {
    await installStarterPackForNewWorkspace(database, {
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
    });
    const stateBefore = database.sqlite.prepare(`
      SELECT revision, shared_membership_revision
      FROM beta_starter_pack_states
      WHERE workspace_id = ? AND pack_version = ?
        AND scope_kind = 'workspace' AND scope_owner_id = ?
    `).get(WORKSPACE_ID, STARTER_PACK_VERSION, WORKSPACE_ID);
    database.sqlite.prepare(`
      INSERT INTO beta_starter_mutation_leases (
        workspace_id, pack_version, lease_token, actor_user_id, operation,
        expires_at, created_at
      ) VALUES (?, ?, 'other-lease', 'other-user', 'restore', ?, ?)
    `).run(
      WORKSPACE_ID,
      STARTER_PACK_VERSION,
      new Date(Date.now() + 60_000).toISOString(),
      NOW,
    );

    await expect(resumeStarterContent()).rejects.toThrow(/already being changed/i);
    expect(database.sqlite.prepare(`
      SELECT revision, shared_membership_revision
      FROM beta_starter_pack_states
      WHERE workspace_id = ? AND pack_version = ?
        AND scope_kind = 'workspace' AND scope_owner_id = ?
    `).get(WORKSPACE_ID, STARTER_PACK_VERSION, WORKSPACE_ID)).toEqual(stateBefore);
  });

  it("reclaims an expired starter mutation lease and completes recovery", async () => {
    await installStarterPackForNewWorkspace(database, {
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
    });
    database.sqlite.prepare(`
      INSERT INTO beta_starter_mutation_leases (
        workspace_id, pack_version, lease_token, actor_user_id, operation,
        expires_at, created_at
      ) VALUES (?, ?, 'expired-worker', 'other-user', 'restore', ?, ?)
    `).run(
      WORKSPACE_ID,
      STARTER_PACK_VERSION,
      "2026-07-23T00:00:00.000Z",
      "2026-07-22T00:00:00.000Z",
    );

    await expect(resumeStarterContent()).resolves.toEqual({
      workspaceStatus: "complete",
      userStatus: "complete",
      ready: true,
    });
    expect(database.sqlite.prepare(`
      SELECT COUNT(*) AS count
      FROM beta_starter_mutation_leases
      WHERE workspace_id = ? AND pack_version = ?
    `).get(WORKSPACE_ID, STARTER_PACK_VERSION)).toEqual({ count: 0 });
    expect(database.sqlite.prepare(`
      SELECT COUNT(*) AS count
      FROM beta_starter_mutation_fence_guards
      WHERE workspace_id = ? AND pack_version = ?
    `).get(WORKSPACE_ID, STARTER_PACK_VERSION)).toEqual({ count: 0 });
    expect(activeClaimKeys(database, "workspace", WORKSPACE_ID)).toEqual(
      [...STARTER_WORKSPACE_ASSET_KEYS].sort(),
    );
  });

  it("fences a holder that loses its lease before the next starter write", async () => {
    await installStarterPackForNewWorkspace(database, {
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
    });
    database.sqlite.prepare(`
      UPDATE beta_starter_asset_claims
      SET lifecycle_state = 'missing'
      WHERE workspace_id = ? AND pack_version = ?
        AND scope_kind = 'workspace' AND scope_owner_id = ?
        AND asset_key = 'component.interior_paint_finish'
    `).run(WORKSPACE_ID, STARTER_PACK_VERSION, WORKSPACE_ID);
    database.replaceLeaseBeforeNextRenewal = true;

    await expect(resumeStarterContent()).rejects.toThrow(/lease changed/i);

    expect(database.sqlite.prepare(`
      SELECT status
      FROM beta_starter_pack_states
      WHERE workspace_id = ? AND pack_version = ?
        AND scope_kind = 'workspace' AND scope_owner_id = ?
    `).get(WORKSPACE_ID, STARTER_PACK_VERSION, WORKSPACE_ID)).toEqual({ status: "complete" });
    expect(database.sqlite.prepare(`
      SELECT lifecycle_state
      FROM beta_starter_asset_claims
      WHERE workspace_id = ? AND pack_version = ?
        AND scope_kind = 'workspace' AND scope_owner_id = ?
        AND asset_key = 'component.interior_paint_finish'
    `).get(WORKSPACE_ID, STARTER_PACK_VERSION, WORKSPACE_ID)).toEqual({
      lifecycle_state: "missing",
    });
    expect(database.sqlite.prepare(`
      SELECT lease_token, actor_user_id
      FROM beta_starter_mutation_leases
      WHERE workspace_id = ? AND pack_version = ?
    `).get(WORKSPACE_ID, STARTER_PACK_VERSION)).toEqual({
      lease_token: "successor-lease",
      actor_user_id: "successor-user",
    });
    expect(database.sqlite.prepare(`
      SELECT COUNT(*) AS count
      FROM beta_starter_mutation_fence_guards
      WHERE workspace_id = ? AND pack_version = ?
    `).get(WORKSPACE_ID, STARTER_PACK_VERSION)).toEqual({ count: 0 });
  });

  it("keeps automatic workspace bootstrap read-only while another starter mutation lease is active", async () => {
    database.sqlite.prepare(`
      INSERT INTO beta_starter_mutation_leases (
        workspace_id, pack_version, lease_token, actor_user_id, operation,
        expires_at, created_at
      ) VALUES (?, ?, 'other-lease', 'other-user', 'install', ?, ?)
    `).run(
      WORKSPACE_ID,
      STARTER_PACK_VERSION,
      new Date(Date.now() + 60_000).toISOString(),
      NOW,
    );

    await expect(installStarterPackForEligibleWorkspace(database, {
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
    })).resolves.toEqual({
      workspaceStatus: "partial",
      userStatus: "not_eligible",
      ready: false,
    });
    expect(database.sqlite.prepare(`
      SELECT lease_token, operation
      FROM beta_starter_mutation_leases
      WHERE workspace_id = ? AND pack_version = ?
    `).get(WORKSPACE_ID, STARTER_PACK_VERSION)).toEqual({
      lease_token: "other-lease",
      operation: "install",
    });
  });

  it("restores from the latest inactive generation even when an older claim is active", async () => {
    await installStarterPackForNewWorkspace(database, {
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
    });
    database.sqlite.prepare(`
      INSERT INTO beta_starter_asset_claims (
        workspace_id, pack_version, scope_kind, scope_owner_id, asset_key,
        asset_kind, starter_generation, resource_id, lifecycle_state,
        created_at, updated_at
      ) VALUES (
        ?, ?, 'workspace', ?, 'component.interior_paint_finish', 'component',
        2, 'superseded-component-placeholder', 'archived', ?, ?
      )
    `).run(
      WORKSPACE_ID,
      STARTER_PACK_VERSION,
      WORKSPACE_ID,
      NOW,
      NOW,
    );
    const state = database.sqlite.prepare(`
      SELECT revision
      FROM beta_starter_pack_states
      WHERE workspace_id = ? AND pack_version = ?
        AND scope_kind = 'workspace' AND scope_owner_id = ?
    `).get(WORKSPACE_ID, STARTER_PACK_VERSION, WORKSPACE_ID);

    await expect(
      restoreStarterContent({ expectedRevision: Number(state?.revision) }),
    ).resolves.toMatchObject({ ready: true });

    expect(database.sqlite.prepare(`
      SELECT starter_generation, lifecycle_state
      FROM beta_starter_asset_claims
      WHERE workspace_id = ? AND pack_version = ?
        AND scope_kind = 'workspace'
        AND asset_key = 'component.interior_paint_finish'
      ORDER BY starter_generation
    `).all(WORKSPACE_ID, STARTER_PACK_VERSION)).toEqual([
      { starter_generation: 1, lifecycle_state: "archived" },
      { starter_generation: 2, lifecycle_state: "archived" },
      { starter_generation: 3, lifecycle_state: "active" },
    ]);
    expect(activeClaimKeys(database, "workspace", WORKSPACE_ID)).toEqual(
      [...STARTER_WORKSPACE_ASSET_KEYS].sort(),
    );
  });

  it("preserves a user-renamed starter project through resume and restore", async () => {
    await installStarterPackForNewWorkspace(database, {
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
    });
    const originalClaim = database.sqlite.prepare(`
      SELECT resource_id
      FROM beta_starter_asset_claims
      WHERE workspace_id = ? AND pack_version = ?
        AND scope_kind = 'workspace' AND scope_owner_id = ?
        AND asset_key = 'project.tutorial' AND lifecycle_state = 'active'
    `).get(WORKSPACE_ID, STARTER_PACK_VERSION, WORKSPACE_ID);
    const originalResourceId = String(originalClaim?.resource_id);
    const userEditedName = "User-renamed tutorial project";
    database.sqlite.prepare(`
      UPDATE projects SET name = ?, updated_at = ?
      WHERE id = ? AND workspace_id = ?
    `).run(userEditedName, NOW, originalResourceId, WORKSPACE_ID);

    await expect(resumeStarterContent()).resolves.toEqual({
      workspaceStatus: "complete",
      userStatus: "complete",
      ready: true,
    });
    expect(database.sqlite.prepare(`
      SELECT name FROM projects WHERE id = ? AND workspace_id = ?
    `).get(originalResourceId, WORKSPACE_ID)).toEqual({ name: userEditedName });

    database.sqlite.prepare(`
      UPDATE beta_starter_asset_claims
      SET lifecycle_state = 'archived', updated_at = ?
      WHERE workspace_id = ? AND pack_version = ?
        AND scope_kind = 'workspace' AND scope_owner_id = ?
        AND asset_key = 'project.tutorial' AND lifecycle_state = 'active'
    `).run(NOW, WORKSPACE_ID, STARTER_PACK_VERSION, WORKSPACE_ID);
    const state = database.sqlite.prepare(`
      SELECT revision
      FROM beta_starter_pack_states
      WHERE workspace_id = ? AND pack_version = ?
        AND scope_kind = 'workspace' AND scope_owner_id = ?
    `).get(WORKSPACE_ID, STARTER_PACK_VERSION, WORKSPACE_ID);

    await expect(
      restoreStarterContent({ expectedRevision: Number(state?.revision) }),
    ).resolves.toMatchObject({ status: "restored", ready: true });

    expect(database.sqlite.prepare(`
      SELECT name FROM projects WHERE id = ? AND workspace_id = ?
    `).get(originalResourceId, WORKSPACE_ID)).toEqual({ name: userEditedName });
    const replacementClaim = database.sqlite.prepare(`
      SELECT resource_id
      FROM beta_starter_asset_claims
      WHERE workspace_id = ? AND pack_version = ?
        AND scope_kind = 'workspace' AND scope_owner_id = ?
        AND asset_key = 'project.tutorial' AND lifecycle_state = 'active'
    `).get(WORKSPACE_ID, STARTER_PACK_VERSION, WORKSPACE_ID);
    expect(String(replacementClaim?.resource_id)).not.toBe(originalResourceId);
  });

  it("reports stale starter restore revision without blaming another session", async () => {
    await installStarterPackForNewWorkspace(database, {
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
    });
    const missingClaim = database.sqlite.prepare(`
      SELECT resource_id
      FROM beta_starter_asset_claims
      WHERE workspace_id = ? AND scope_kind = 'workspace'
        AND asset_key = 'component.interior_paint_finish'
        AND lifecycle_state = 'active'
    `).get(WORKSPACE_ID);
    database.sqlite.prepare(
      "DELETE FROM cost_library_items WHERE id = ? AND workspace_id = ?",
    ).run(missingClaim?.resource_id, WORKSPACE_ID);
    const stateBefore = database.sqlite.prepare(`
      SELECT revision
      FROM beta_starter_pack_states
      WHERE workspace_id = ? AND pack_version = ?
        AND scope_kind = 'workspace' AND scope_owner_id = ?
    `).get(WORKSPACE_ID, STARTER_PACK_VERSION, WORKSPACE_ID);

    await expect(
      restoreStarterContent({ expectedRevision: 999 }),
    ).resolves.toEqual({
      status: "stale",
      currentRevision: Number(stateBefore?.revision),
    });
    expect(database.sqlite.prepare(`
      SELECT lifecycle_state
      FROM beta_starter_asset_claims
      WHERE workspace_id = ? AND pack_version = ?
        AND scope_kind = 'workspace'
        AND asset_key = 'component.interior_paint_finish'
      ORDER BY starter_generation DESC LIMIT 1
    `).get(WORKSPACE_ID, STARTER_PACK_VERSION)).toEqual({
      lifecycle_state: "active",
    });
    expect(database.sqlite.prepare(`
      SELECT revision
      FROM beta_starter_pack_states
      WHERE workspace_id = ? AND pack_version = ?
        AND scope_kind = 'workspace' AND scope_owner_id = ?
    `).get(WORKSPACE_ID, STARTER_PACK_VERSION, WORKSPACE_ID)).toEqual(stateBefore);
    expect(database.sqlite.prepare(`
      SELECT
        (SELECT COUNT(*) FROM beta_starter_mutation_leases
          WHERE workspace_id = ? AND pack_version = ?) AS leases,
        (SELECT COUNT(*) FROM beta_starter_restore_cas_guards
          WHERE workspace_id = ? AND pack_version = ?) AS restore_guards
    `).get(
      WORKSPACE_ID,
      STARTER_PACK_VERSION,
      WORKSPACE_ID,
      STARTER_PACK_VERSION,
    )).toEqual({ leases: 0, restore_guards: 0 });
  });

  it("rejects automatic shared installation for non-managers and nonempty workspaces", async () => {
    database.sqlite.prepare(`
      INSERT INTO workspace_members (
        workspace_id, user_id, role, created_at, updated_at
      ) VALUES (?, 'member-1', 'member', ?, ?)
    `).run(WORKSPACE_ID, NOW, NOW);

    await expect(installStarterPackForEligibleWorkspace(database, {
      workspaceId: WORKSPACE_ID,
      userId: "member-1",
    })).resolves.toBeNull();

    database.sqlite.prepare(`
      INSERT INTO projects (
        id, workspace_id, name, created_by, metadata, status, created_at, updated_at
      ) VALUES ('existing-project', ?, 'Existing project', ?, '{}', 'ongoing', ?, ?)
    `).run(WORKSPACE_ID, USER_ID, NOW, NOW);

    await expect(installStarterPackForEligibleWorkspace(database, {
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
    })).resolves.toBeNull();
    expect(database.sqlite.prepare(`
      SELECT COUNT(*) AS count
      FROM beta_starter_asset_claims
      WHERE workspace_id = ?
    `).get(WORKSPACE_ID)).toEqual({ count: 0 });
  });
});
