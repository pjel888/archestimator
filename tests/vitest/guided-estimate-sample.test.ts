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
  createFreshGuidedPracticeCopy,
  startGuidedPractice,
} from "@/lib/onboarding/guided-sample-actions";
import { installStarterPackForNewWorkspace } from "@/lib/onboarding/starter-pack-actions";

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
  beforeNextBatch: (() => void) | null = null;
  failNextBatch = false;

  constructor(readonly sqlite: SqliteDatabase) {}

  prepare<T = Record<string, unknown>>(sql: string) {
    return new SqliteD1Statement<T>(this.sqlite, sql);
  }

  async batch<T = Record<string, unknown>>(
    statements: D1PreparedStatementLike<T>[],
  ): Promise<D1Result<T>[]> {
    const beforeBatch = this.beforeNextBatch;
    this.beforeNextBatch = null;
    beforeBatch?.();
    if (this.failNextBatch) {
      this.failNextBatch = false;
      throw new Error("simulated concurrent batch loss");
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
  sqlite.exec(`
    ALTER TABLE cost_library_item_price_options ADD COLUMN brand_id TEXT;
    ALTER TABLE cost_library_item_price_options ADD COLUMN brand TEXT NOT NULL DEFAULT '';
  `);
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

function activePracticeProjects(database: SqliteD1Database) {
  return database.sqlite.prepare(`
    SELECT id, status,
           CAST(json_extract(metadata, '$.tutorial_generation') AS INTEGER)
             AS tutorial_generation
    FROM projects
    WHERE workspace_id = ?
      AND json_extract(metadata, '$.tutorial_kind') = 'estimate_sheet_foundations'
    ORDER BY tutorial_generation
  `).all(WORKSPACE_ID);
}

function seedConcurrentPractice(
  database: SqliteD1Database,
  input: {
    generation: number;
    projectId: string;
    replaceGeneration?: number;
  },
) {
  const estimateId = `${input.projectId}-estimate`;
  const areaId = `${input.projectId}-area`;
  if (input.replaceGeneration) {
    database.sqlite.prepare(`
      UPDATE beta_onboarding_flow_states
      SET tutorial_generation = ?, generation = generation + 1,
          revision = revision + 1, updated_at = ?
      WHERE user_id = ? AND workspace_id = ?
        AND flow_key = 'guided_estimate_practice'
        AND tutorial_generation = ?
    `).run(
      input.generation,
      NOW,
      USER_ID,
      WORKSPACE_ID,
      input.replaceGeneration,
    );
    database.sqlite.prepare(`
      UPDATE projects
      SET status = 'archived', updated_at = ?
      WHERE workspace_id = ? AND created_by = ?
        AND CAST(json_extract(metadata, '$.tutorial_generation') AS INTEGER) = ?
    `).run(NOW, WORKSPACE_ID, USER_ID, input.replaceGeneration);
  } else {
    database.sqlite.prepare(`
      INSERT INTO beta_onboarding_flow_states (
        user_id, workspace_id, flow_key, flow_version, generation,
        tutorial_version, tutorial_generation, status, current_step_key,
        revision, reset_count, started_at, created_at, updated_at
      ) VALUES (
        ?, ?, 'guided_estimate_practice', 1, 1, 2, ?, 'in_progress',
        'practice_workspace', 0, 0, ?, ?, ?
      )
    `).run(USER_ID, WORKSPACE_ID, input.generation, NOW, NOW, NOW);
  }
  database.sqlite.prepare(`
    INSERT INTO projects (
      id, workspace_id, name, project_code, created_by, client_name, location,
      currency_code, metadata, status, created_at, updated_at
    ) VALUES (?, ?, 'Concurrent practice', 'PRACTICE', ?, NULL, NULL, 'PHP', ?, 'ongoing', ?, ?)
  `).run(
    input.projectId,
    WORKSPACE_ID,
    USER_ID,
    JSON.stringify({
      tutorial_kind: "estimate_sheet_foundations",
      tutorial_version: 2,
      tutorial_generation: input.generation,
    }),
    NOW,
    NOW,
  );
  database.sqlite.prepare(`
    INSERT INTO estimates (
      id, project_id, name, created_by, created_at, updated_at,
      sheet_code, notes, currency_code, metadata
    ) VALUES (?, ?, 'Concurrent estimate', ?, ?, ?, 'ES-001', NULL, 'PHP', '{}')
  `).run(estimateId, input.projectId, USER_ID, NOW, NOW);
  database.sqlite.prepare(`
    INSERT INTO estimate_nodes (
      id, estimate_id, estimate_tab_id, name, kind, parent_id, sort_order,
      created_at, updated_at, metadata_json
    ) VALUES (?, ?, NULL, 'Concurrent area', 'area', NULL, 0, ?, ?, '{}')
  `).run(areaId, estimateId, NOW, NOW);
  return { areaId, estimateId };
}

describe("guided estimate sample", () => {
  let database: SqliteD1Database;

  beforeEach(async () => {
    database = createDatabase();
    mocks.database = database;
    await installStarterPackForNewWorkspace(database, {
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
    });
  });

  afterEach(() => {
    mocks.database = null;
    database.sqlite.close();
  });

  it("starts in an existing non-empty workspace without starter content", async () => {
    database.sqlite.close();
    database = createDatabase();
    mocks.database = database;
    database.sqlite.prepare(`
      INSERT INTO projects (
        id, workspace_id, name, project_code, created_by, client_name, location,
        currency_code, metadata, status, created_at, updated_at
      ) VALUES (
        'existing-project', ?, 'Existing business project', 'EXISTING', ?,
        NULL, NULL, 'PHP', '{}', 'ongoing', ?, ?
      )
    `).run(WORKSPACE_ID, USER_ID, NOW, NOW);

    const created = await startGuidedPractice();

    expect(created).toMatchObject({
      tutorialVersion: 2,
      tutorialGeneration: 1,
      resumed: false,
    });
    expect(database.sqlite.prepare(`
      SELECT COUNT(*) AS count
      FROM beta_starter_pack_states
      WHERE workspace_id = ?
    `).get(WORKSPACE_ID)).toEqual({ count: 0 });
    expect(database.sqlite.prepare(`
      SELECT COUNT(*) AS count
      FROM project_group_memberships
      WHERE project_id = ?
    `).get(created.projectId)).toEqual({ count: 0 });
    expect(database.sqlite.prepare(`
      SELECT selected_path
      FROM beta_activation_progress
      WHERE user_id = ? AND workspace_id = ?
    `).get(USER_ID, WORKSPACE_ID)).toEqual({
      selected_path: "guided_sample",
    });
  });

  it("creates generation one once and resumes the same complete practice graph", async () => {
    const created = await startGuidedPractice();
    database.sqlite.prepare(`
      UPDATE estimate_row_items
      SET metadata_json = '{}'
      WHERE estimate_id = ? AND material = 'Porcelain Floor Tile'
    `).run(created.estimateId);
    const resumed = await startGuidedPractice();

    expect(created).toMatchObject({
      tutorialVersion: 2,
      tutorialGeneration: 1,
      resumed: false,
    });
    expect(resumed).toEqual({
      ...created,
      resumed: true,
    });
    expect(activePracticeProjects(database)).toEqual([
      {
        id: created.projectId,
        status: "ongoing",
        tutorial_generation: 1,
      },
    ]);
    expect(database.sqlite.prepare(`
      SELECT COUNT(*) AS count
      FROM project_group_memberships membership
      INNER JOIN project_groups project_group ON project_group.id = membership.group_id
      WHERE membership.project_id = ? AND membership.user_id = ?
        AND project_group.name = 'Starter Examples'
    `).get(created.projectId, USER_ID)).toEqual({ count: 1 });
    expect(database.sqlite.prepare(`
      SELECT
        json_extract(row.metadata_json, '$.expressComponent.kind') AS kind,
        json_extract(row.metadata_json, '$.guidedPracticeRole') AS role
      FROM estimate_row_items row
      WHERE row.estimate_id = ? AND row.material = 'Porcelain Floor Tile'
      LIMIT 1
    `).get(created.estimateId)).toEqual({
      kind: "express",
      role: "price_and_save",
    });
  });

  it("recreates guided practice when the bound project was archived", async () => {
    const created = await startGuidedPractice();
    database.sqlite.prepare(`
      UPDATE projects
      SET status = 'archived', updated_at = ?
      WHERE id = ? AND workspace_id = ?
    `).run(NOW, created.projectId, WORKSPACE_ID);

    const recovered = await startGuidedPractice();

    expect(recovered).toMatchObject({
      tutorialVersion: 2,
      tutorialGeneration: 2,
      resumed: false,
    });
    expect(activePracticeProjects(database)).toEqual([
      {
        id: created.projectId,
        status: "archived",
        tutorial_generation: 1,
      },
      {
        id: recovered.projectId,
        status: "ongoing",
        tutorial_generation: 2,
      },
    ]);
  });

  it("recreates and then resumes guided practice after permanent project deletion", async () => {
    const created = await startGuidedPractice();
    database.sqlite.prepare(
      "DELETE FROM estimates WHERE project_id = ?",
    ).run(created.projectId);
    database.sqlite.prepare(
      "DELETE FROM projects WHERE id = ? AND workspace_id = ?",
    ).run(created.projectId, WORKSPACE_ID);

    const recovered = await startGuidedPractice();
    const resumed = await startGuidedPractice();

    expect(recovered).toMatchObject({
      tutorialVersion: 2,
      tutorialGeneration: 2,
      resumed: false,
    });
    expect(resumed).toEqual({
      ...recovered,
      resumed: true,
    });
    expect(activePracticeProjects(database)).toEqual([
      {
        id: recovered.projectId,
        status: "ongoing",
        tutorial_generation: 2,
      },
    ]);
    expect(database.sqlite.prepare(`
      SELECT tutorial_version, tutorial_generation, revision
      FROM beta_onboarding_flow_states
      WHERE user_id = ? AND workspace_id = ?
        AND flow_key = 'guided_estimate_practice'
    `).get(USER_ID, WORKSPACE_ID)).toEqual({
      tutorial_version: 2,
      tutorial_generation: 2,
      revision: 1,
    });
  });

  it("migrates a saved v1 practice binding to one current v2 project", async () => {
    const legacy = await startGuidedPractice();
    database.sqlite.prepare(`
      UPDATE projects
      SET metadata = json_set(metadata, '$.tutorial_version', 1)
      WHERE id = ? AND workspace_id = ?
    `).run(legacy.projectId, WORKSPACE_ID);
    database.sqlite.prepare(`
      UPDATE beta_onboarding_flow_states
      SET tutorial_version = 1
      WHERE user_id = ? AND workspace_id = ?
        AND flow_key = 'guided_estimate_practice'
    `).run(USER_ID, WORKSPACE_ID);

    const migrated = await startGuidedPractice();

    expect(migrated).toMatchObject({
      tutorialVersion: 2,
      tutorialGeneration: 1,
      resumed: false,
    });
    expect(database.sqlite.prepare(`
      SELECT
        status,
        CAST(json_extract(metadata, '$.tutorial_version') AS INTEGER) AS tutorial_version
      FROM projects
      WHERE id IN (?, ?)
      ORDER BY tutorial_version
    `).all(legacy.projectId, migrated.projectId)).toEqual([
      { status: "archived", tutorial_version: 1 },
      { status: "ongoing", tutorial_version: 2 },
    ]);
  });

  it("creates one fresh generation and fences stale generation or revision requests", async () => {
    const created = await startGuidedPractice();
    const state = database.sqlite.prepare(`
      SELECT revision
      FROM beta_onboarding_flow_states
      WHERE user_id = ? AND workspace_id = ?
        AND flow_key = 'guided_estimate_practice'
    `).get(USER_ID, WORKSPACE_ID);

    const fresh = await createFreshGuidedPracticeCopy({
      expectedRevision: Number(state?.revision),
      expectedTutorialGeneration: created.tutorialGeneration,
    });
    expect(fresh).toMatchObject({ tutorial_generation: 2 });
    expect(activePracticeProjects(database)).toEqual([
      {
        id: created.projectId,
        status: "archived",
        tutorial_generation: 1,
      },
      {
        id: fresh.project_id,
        status: "ongoing",
        tutorial_generation: 2,
      },
    ]);

    const staleGenerationWinner = await createFreshGuidedPracticeCopy({
      expectedRevision: Number(state?.revision),
      expectedTutorialGeneration: 1,
    });
    expect(staleGenerationWinner).toMatchObject({
      project_id: fresh.project_id,
      tutorial_generation: 2,
    });
    expect(activePracticeProjects(database)).toHaveLength(2);

    await expect(createFreshGuidedPracticeCopy({
      expectedRevision: 0,
      expectedTutorialGeneration: 2,
    })).rejects.toThrow();
    expect(activePracticeProjects(database)).toEqual([
      {
        id: created.projectId,
        status: "archived",
        tutorial_generation: 1,
      },
      {
        id: fresh.project_id,
        status: "ongoing",
        tutorial_generation: 2,
      },
    ]);
  });

  it("returns concurrent winners from initial and fresh-copy batch catch paths", async () => {
    database.failNextBatch = true;
    database.beforeNextBatch = () => {
      seedConcurrentPractice(database, {
        generation: 1,
        projectId: "concurrent-generation-1",
      });
    };

    const initialWinner = await startGuidedPractice();
    expect(initialWinner).toMatchObject({
      projectId: "concurrent-generation-1",
      tutorialGeneration: 1,
      resumed: false,
    });

    database.failNextBatch = true;
    database.beforeNextBatch = () => {
      seedConcurrentPractice(database, {
        generation: 2,
        projectId: "concurrent-generation-2",
        replaceGeneration: 1,
      });
    };

    const freshWinner = await createFreshGuidedPracticeCopy({
      expectedRevision: 0,
      expectedTutorialGeneration: 1,
    });
    expect(freshWinner).toMatchObject({
      project_id: "concurrent-generation-2",
      tutorial_generation: 2,
    });
    expect(activePracticeProjects(database)).toEqual([
      {
        id: "concurrent-generation-1",
        status: "archived",
        tutorial_generation: 1,
      },
      {
        id: "concurrent-generation-2",
        status: "ongoing",
        tutorial_generation: 2,
      },
    ]);
  });
});
