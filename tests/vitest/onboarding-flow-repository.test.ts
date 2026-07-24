import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1Result,
  D1Value,
} from "@/lib/cloudflare/d1";
import {
  getOnboardingFlowRunBinding,
  mutateOnboardingFlow,
  resetAllGuidance,
  type OnboardingMutationCommand,
} from "@/lib/onboarding/flow-repository";
import type { OnboardingFlowKey } from "@/lib/onboarding/flow-types";

const requireRuntime = createRequire(import.meta.url);
const USER_ID = "user-1";
const WORKSPACE_ID = "workspace-1";
const NOW = "2026-07-24T00:00:00.000Z";

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
      this.database
        .prepare(this.sql)
        .get(...this.values.map(normalizeValue)) as R | undefined
    ) ?? null;
  }

  async all<R = T>(): Promise<D1Result<R>> {
    return {
      success: true,
      results: this.database
        .prepare(this.sql)
        .all(...this.values.map(normalizeValue)) as R[],
    };
  }

  async run(): Promise<D1Result<T>> {
    const result = this.database
      .prepare(this.sql)
      .run(...this.values.map(normalizeValue));
    return { success: true, meta: { changes: Number(result.changes) } };
  }
}

class SqliteD1Database implements D1DatabaseLike {
  beforeNextBatch: (() => void) | null = null;

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
  for (const migration of [
    "migrations/0007_collaboration_invitations.sql",
    "migrations/0013_collaboration_management_sidecars.sql",
    "migrations/0015_publication_admin_sidecars.sql",
    "migrations/0039_project_status.sql",
    "migrations/0067_beta_activation_events.sql",
    "migrations/0101_beta_onboarding_flow_state.sql",
    "migrations/0103_onboarding_activation_resource_integrity.sql",
  ]) {
    sqlite.exec(readFileSync(migration, "utf8"));
  }
  sqlite.prepare(`
    INSERT INTO workspaces (id, name, created_by, created_at, updated_at)
    VALUES (?, 'Workspace', ?, ?, ?)
  `).run(WORKSPACE_ID, USER_ID, NOW, NOW);
  sqlite.prepare(`
    INSERT INTO workspace_members (
      workspace_id, user_id, role, created_at, updated_at
    )
    VALUES (?, ?, 'owner', ?, ?)
  `).run(WORKSPACE_ID, USER_ID, NOW, NOW);
  sqlite.prepare(`
    INSERT INTO projects (
      id, workspace_id, name, created_by, metadata, created_at, updated_at
    )
    VALUES ('business-project', ?, 'Business project', ?, '{}', ?, ?)
  `).run(WORKSPACE_ID, USER_ID, NOW, NOW);
  return new SqliteD1Database(sqlite);
}

function command(
  input: Partial<OnboardingMutationCommand> &
    Pick<OnboardingMutationCommand, "command" | "mutationId">,
): OnboardingMutationCommand {
  return {
    expectedRevision: null,
    flowKey: "core_orientation",
    launchMode: "task",
    ...input,
  };
}

async function startFlow(
  database: SqliteD1Database,
  flowKey: OnboardingFlowKey,
  mutationId: string,
) {
  return mutateOnboardingFlow(
    database,
    {
      userId: USER_ID,
      workspaceId: WORKSPACE_ID,
      eligibleStepKeys: ["welcome"],
    },
    command({
      command: "start",
      expectedTutorialBinding: null,
      flowKey,
      launchMode: "start",
      mutationId,
    }),
  );
}

describe("onboarding flow repository", () => {
  let database: SqliteD1Database;

  beforeEach(() => {
    database = createDatabase();
  });

  afterEach(() => {
    database.sqlite.close();
  });

  it("continues a guided-practice run established by sample creation", async () => {
    database.sqlite.prepare(`
      INSERT INTO beta_onboarding_flow_states (
        user_id, workspace_id, flow_key, flow_version, generation,
        tutorial_version, tutorial_generation, status, current_step_key,
        revision, reset_count, started_at, created_at, updated_at
      )
      VALUES (?, ?, 'guided_estimate_practice', 1, 1, 2, 1, 'in_progress',
        'practice_workspace', 0, 0, ?, ?, ?)
    `).run(USER_ID, WORKSPACE_ID, NOW, NOW, NOW);
    database.sqlite.prepare(`
      INSERT INTO beta_onboarding_flow_events (
        id, user_id, workspace_id, flow_key, flow_version, generation,
        tutorial_version, tutorial_generation, run_id, launch_mode, step_key,
        event_type, source, idempotency_key, state_revision, occurred_at, ingested_at
      )
      VALUES (
        'sample-event', ?, ?, 'guided_estimate_practice', 1, 1, 2, 1,
        'sample-run', 'system', 'practice_workspace', 'sample_generated',
        'tutorial_seed', 'sample-generated', 0, ?, ?
      )
    `).run(USER_ID, WORKSPACE_ID, NOW, NOW);

    await expect(
      getOnboardingFlowRunBinding(database, {
        userId: USER_ID,
        workspaceId: WORKSPACE_ID,
        flowKey: "guided_estimate_practice",
        flowVersion: 1,
      }),
    ).resolves.toEqual({
      runId: "sample-run",
      state: expect.objectContaining({
        currentStepKey: "practice_workspace",
        revision: 0,
      }),
    });

    await expect(
      mutateOnboardingFlow(
        database,
        {
          userId: USER_ID,
          workspaceId: WORKSPACE_ID,
          eligibleStepKeys: ["practice_workspace", "practice_row_math"],
          tutorialBinding: { version: 2, generation: 1 },
        },
        command({
          command: "resume",
          expectedRevision: 0,
          expectedStepKey: "practice_workspace",
          expectedTutorialBinding: { version: 2, generation: 1 },
          flowKey: "guided_estimate_practice",
          launchMode: "resume",
          mutationId: "resume-sample-run",
          runId: "sample-run",
        }),
      ),
    ).resolves.toEqual({
      status: "applied",
      runId: "sample-run",
      state: expect.objectContaining({
        currentStepKey: "practice_workspace",
        revision: 1,
      }),
    });
  });

  it("applies legal transitions, idempotency, and stale revision or generation guards", async () => {
    const started = await startFlow(database, "core_orientation", "start-1");
    expect(started).toEqual({
      status: "applied",
      runId: expect.any(String),
      state: expect.objectContaining({
        currentStepKey: "welcome",
        generation: 1,
        revision: 0,
        status: "in_progress",
      }),
    });
    if (started.status === "conflict") throw new Error("Expected flow start.");

    await expect(
      startFlow(database, "core_orientation", "start-1"),
    ).resolves.toEqual({
      status: "idempotent",
      runId: started.runId,
      state: expect.objectContaining({ revision: 0 }),
    });

    await expect(
      mutateOnboardingFlow(
        database,
        {
          userId: USER_ID,
          workspaceId: WORKSPACE_ID,
          eligibleStepKeys: ["welcome"],
        },
        command({
          command: "pause",
          expectedRevision: 99,
          expectedStepKey: "welcome",
          mutationId: "pause-stale-revision",
          runId: started.runId,
        }),
      ),
    ).resolves.toEqual({
      status: "conflict",
      code: "ONBOARDING_STATE_CONFLICT",
      state: expect.objectContaining({ revision: 0 }),
    });

    const paused = await mutateOnboardingFlow(
      database,
      {
        userId: USER_ID,
        workspaceId: WORKSPACE_ID,
        eligibleStepKeys: ["welcome"],
      },
      command({
        command: "pause",
        expectedRevision: 0,
        expectedStepKey: "welcome",
        mutationId: "pause-1",
        runId: started.runId,
      }),
    );
    expect(paused).toEqual({
      status: "applied",
      runId: started.runId,
      state: expect.objectContaining({
        currentStepKey: "welcome",
        lastPausedAt: expect.any(String),
        revision: 1,
        status: "in_progress",
      }),
    });

    const resumed = await mutateOnboardingFlow(
      database,
      {
        userId: USER_ID,
        workspaceId: WORKSPACE_ID,
        eligibleStepKeys: ["welcome"],
      },
      command({
        command: "resume",
        expectedRevision: 1,
        expectedStepKey: "welcome",
        launchMode: "resume",
        mutationId: "resume-1",
        runId: started.runId,
      }),
    );
    expect(resumed).toEqual({
      status: "applied",
      runId: started.runId,
      state: expect.objectContaining({
        lastResumedAt: expect.any(String),
        revision: 2,
      }),
    });

    const completed = await mutateOnboardingFlow(
      database,
      {
        userId: USER_ID,
        workspaceId: WORKSPACE_ID,
        eligibleStepKeys: ["welcome"],
      },
      command({
        command: "complete",
        expectedRevision: 2,
        expectedStepKey: "welcome",
        mutationId: "complete-1",
        runId: started.runId,
      }),
    );
    expect(completed).toEqual({
      status: "applied",
      runId: started.runId,
      state: expect.objectContaining({
        completedAt: expect.any(String),
        currentStepKey: null,
        revision: 3,
        status: "completed",
      }),
    });

    const restarted = await mutateOnboardingFlow(
      database,
      {
        userId: USER_ID,
        workspaceId: WORKSPACE_ID,
        eligibleStepKeys: ["welcome"],
      },
      command({
        command: "restart",
        expectedRevision: 3,
        launchMode: "restart",
        mutationId: "restart-1",
      }),
    );
    expect(restarted).toEqual({
      status: "applied",
      runId: expect.any(String),
      state: expect.objectContaining({
        generation: 2,
        resetCount: 1,
        revision: 4,
        status: "in_progress",
      }),
    });
    if (restarted.status === "conflict") throw new Error("Expected flow restart.");

    await expect(
      mutateOnboardingFlow(
        database,
        {
          userId: USER_ID,
          workspaceId: WORKSPACE_ID,
          eligibleStepKeys: ["welcome"],
        },
        command({
          command: "resume",
          expectedRevision: 4,
          expectedStepKey: "welcome",
          launchMode: "resume",
          mutationId: "resume-stale-generation",
          runId: started.runId,
        }),
      ),
    ).resolves.toEqual({
      status: "conflict",
      code: "ONBOARDING_STATE_CONFLICT",
      state: expect.objectContaining({ generation: 2, revision: 4 }),
    });

    await expect(
      mutateOnboardingFlow(
        database,
        {
          userId: USER_ID,
          workspaceId: WORKSPACE_ID,
          eligibleStepKeys: ["welcome"],
        },
        command({
          command: "dismiss",
          expectedRevision: 4,
          expectedStepKey: "welcome",
          mutationId: "dismiss-1",
          runId: restarted.runId,
        }),
      ),
    ).resolves.toEqual({
      status: "applied",
      runId: restarted.runId,
      state: expect.objectContaining({
        dismissedAt: expect.any(String),
        revision: 5,
        status: "dismissed",
      }),
    });
  });

  it("resets all requested guidance without changing business state", async () => {
    const core = await startFlow(database, "core_orientation", "start-core");
    const collaborator = await startFlow(
      database,
      "collaborator_orientation",
      "start-collaborator",
    );
    if (core.status === "conflict" || collaborator.status === "conflict") {
      throw new Error("Expected flow starts.");
    }

    const reset = await resetAllGuidance(
      database,
      { userId: USER_ID, workspaceId: WORKSPACE_ID },
      {
        expectedRevisions: {
          collaborator_orientation: collaborator.state.revision,
          core_orientation: core.state.revision,
        },
        flowKeys: ["core_orientation", "collaborator_orientation"],
        mutationId: "reset-all-1",
      },
    );
    expect(reset).toEqual({
      status: "applied",
      states: expect.arrayContaining([
        expect.objectContaining({
          flowKey: "core_orientation",
          generation: 2,
          resetCount: 1,
          revision: 1,
          status: "not_started",
        }),
        expect.objectContaining({
          flowKey: "collaborator_orientation",
          generation: 2,
          resetCount: 1,
          revision: 1,
          status: "not_started",
        }),
      ]),
    });
    expect(
      database.sqlite.prepare(`
        SELECT id, name, metadata, status
        FROM projects
        WHERE id = 'business-project'
      `).get(),
    ).toEqual({
      id: "business-project",
      metadata: "{}",
      name: "Business project",
      status: "ongoing",
    });

    await expect(
      resetAllGuidance(
        database,
        { userId: USER_ID, workspaceId: WORKSPACE_ID },
        {
          expectedRevisions: {
            collaborator_orientation: 0,
            core_orientation: 0,
          },
          flowKeys: ["core_orientation", "collaborator_orientation"],
          mutationId: "reset-all-1",
        },
      ),
    ).resolves.toEqual({
      status: "idempotent",
      states: expect.arrayContaining([
        expect.objectContaining({ flowKey: "core_orientation", revision: 1 }),
        expect.objectContaining({
          flowKey: "collaborator_orientation",
          revision: 1,
        }),
      ]),
    });

    await expect(
      resetAllGuidance(
        database,
        { userId: USER_ID, workspaceId: WORKSPACE_ID },
        {
          expectedRevisions: {
            collaborator_orientation: 0,
            core_orientation: 0,
          },
          flowKeys: ["core_orientation", "collaborator_orientation"],
          mutationId: "reset-all-stale",
        },
      ),
    ).resolves.toEqual({
      status: "conflict",
      states: expect.arrayContaining([
        expect.objectContaining({ flowKey: "core_orientation", revision: 1 }),
        expect.objectContaining({
          flowKey: "collaborator_orientation",
          revision: 1,
        }),
      ]),
    });
  });

  it("rejects a reset when a flow revision changes immediately before its batch", async () => {
    const core = await startFlow(database, "core_orientation", "start-core");
    const collaborator = await startFlow(
      database,
      "collaborator_orientation",
      "start-collaborator",
    );
    if (core.status === "conflict" || collaborator.status === "conflict") {
      throw new Error("Expected flow starts.");
    }
    database.beforeNextBatch = () => {
      database.sqlite.prepare(`
        UPDATE beta_onboarding_flow_states
        SET revision = revision + 1
        WHERE user_id = ?
          AND workspace_id = ?
          AND flow_key = 'core_orientation'
      `).run(USER_ID, WORKSPACE_ID);
    };

    const result = await resetAllGuidance(
      database,
      { userId: USER_ID, workspaceId: WORKSPACE_ID },
      {
        expectedRevisions: {
          collaborator_orientation: collaborator.state.revision,
          core_orientation: core.state.revision,
        },
        flowKeys: ["core_orientation", "collaborator_orientation"],
        mutationId: "reset-concurrent",
      },
    );

    expect(result).toEqual({
      status: "conflict",
      states: expect.arrayContaining([
        expect.objectContaining({
          flowKey: "core_orientation",
          generation: 1,
          resetCount: 0,
          revision: 1,
          status: "in_progress",
        }),
        expect.objectContaining({
          flowKey: "collaborator_orientation",
          generation: 1,
          resetCount: 0,
          revision: 0,
          status: "in_progress",
        }),
      ]),
    });
    expect(
      database.sqlite.prepare(`
        SELECT COUNT(*) AS count
        FROM beta_onboarding_flow_events
        WHERE event_type = 'all_guidance_reset'
      `).get(),
    ).toEqual({ count: 0 });
  });
});
