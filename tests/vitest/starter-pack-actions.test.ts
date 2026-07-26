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
const WORKSPACE_ID = "workspace-1";
const NOW = "2026-07-24T00:00:00.000Z";

const mocks = vi.hoisted(() => ({
  database: null as D1DatabaseLike | null,
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
    userId: USER_ID,
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
  constructor(readonly sqlite: SqliteDatabase) {}

  prepare<T = Record<string, unknown>>(sql: string) {
    return new SqliteD1Statement<T>(this.sqlite, sql);
  }

  async batch<T = Record<string, unknown>>(
    statements: D1PreparedStatementLike<T>[],
  ): Promise<D1Result<T>[]> {
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
    ).rejects.toThrow(
      "Starter content changed before recovery finished. Refresh and try again.",
    );
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
