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
  completeOnboardingFlowFromDomainProof,
  getOnboardingFlowRunBinding,
  importExistingOnboardingState,
  mutateOnboardingFlow,
  resetAllGuidance,
  type OnboardingMutationCommand,
} from "@/lib/onboarding/flow-repository";
import type { OnboardingFlowKey } from "@/lib/onboarding/flow-types";

const requireRuntime = createRequire(import.meta.url);
const USER_ID = "user-1";
const WORKSPACE_ID = "workspace-1";
const INTENDED_ESTIMATE_ID = "estimate-intended";
const OTHER_ESTIMATE_ID = "estimate-other";
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
    "migrations/0105_onboarding_resource_bindings_and_starter_leases.sql",
    "migrations/0117_onboarding_starter_mutation_fences.sql",
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
  sqlite.prepare(`
    INSERT INTO estimates (id, project_id, name, created_by, created_at, updated_at)
    VALUES (?, 'business-project', 'Intended estimate', ?, ?, ?)
  `).run(INTENDED_ESTIMATE_ID, USER_ID, NOW, NOW);
  sqlite.prepare(`
    INSERT INTO estimates (id, project_id, name, created_by, created_at, updated_at)
    VALUES (?, 'business-project', 'Other estimate', ?, ?, ?)
  `).run(OTHER_ESTIMATE_ID, USER_ID, NOW, NOW);
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
      resourceId: null,
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

  it("rejects first-value completion without user-domain proof", async () => {
    const started = await mutateOnboardingFlow(
      database,
      {
        userId: USER_ID,
        workspaceId: WORKSPACE_ID,
        eligibleStepKeys: ["hierarchy"],
      },
      command({
        command: "start",
        flowKey: "first_estimate_value",
        launchMode: "start",
        mutationId: "first-value-start",
      }),
    );
    if (started.status === "conflict") throw new Error("Expected first-value flow start.");

    await expect(mutateOnboardingFlow(
      database,
      {
        userId: USER_ID,
        workspaceId: WORKSPACE_ID,
        eligibleStepKeys: ["hierarchy"],
      },
      command({
        command: "complete",
        expectedRevision: started.state.revision,
        expectedStepKey: "hierarchy",
        flowKey: "first_estimate_value",
        mutationId: "first-value-false-complete",
        runId: started.runId,
      }),
    )).resolves.toEqual({
      status: "conflict",
      code: "ONBOARDING_DOMAIN_PROOF_REQUIRED",
      state: expect.objectContaining({ status: "in_progress" }),
    });
  });

  it("reconciles a valid user-domain total into completed first-value state", async () => {
    const started = await mutateOnboardingFlow(
      database,
      {
        userId: USER_ID,
        workspaceId: WORKSPACE_ID,
        eligibleStepKeys: ["hierarchy", "total_and_save"],
        resourceId: INTENDED_ESTIMATE_ID,
      },
      command({
        command: "start",
        flowKey: "first_estimate_value",
        launchMode: "start",
        mutationId: "first-value-domain-start",
      }),
    );
    if (started.status === "conflict") throw new Error("Expected first-value flow start.");
    database.sqlite.prepare(`
      INSERT INTO beta_activation_progress (
        user_id, workspace_id, last_milestone, first_value_completed_at,
        last_event_at, created_at, updated_at
      ) VALUES (?, ?, 'first_valid_total', ?, ?, ?, ?)
    `).run(USER_ID, WORKSPACE_ID, NOW, NOW, NOW, NOW);
    database.sqlite.prepare(`
      INSERT INTO beta_activation_events (
        id, user_id, workspace_id, project_id, estimate_id, milestone, source, origin_class,
        occurred_at, dedupe_key, metadata_json, created_at
      ) VALUES (
        'first-valid-total-event', ?, ?, 'business-project', ?, 'first_valid_total', 'estimate',
        'user_domain', ?, 'first-valid-total', '{}', ?
      )
    `).run(USER_ID, WORKSPACE_ID, INTENDED_ESTIMATE_ID, NOW, NOW);

    await importExistingOnboardingState(database, {
      userId: USER_ID,
      workspaceId: WORKSPACE_ID,
    });

    expect(database.sqlite.prepare(`
      SELECT status, current_step_key, revision
      FROM beta_onboarding_flow_states
      WHERE user_id = ? AND workspace_id = ?
        AND flow_key = 'first_estimate_value'
    `).get(USER_ID, WORKSPACE_ID)).toEqual({
      status: "completed",
      current_step_key: null,
      revision: started.state.revision + 1,
    });
    expect(database.sqlite.prepare(`
      SELECT event_type, source, route_key, step_key, state_revision
      FROM beta_onboarding_flow_events
      WHERE user_id = ? AND workspace_id = ?
        AND flow_key = 'first_estimate_value'
        AND idempotency_key = 'domain:first-valid-total:1'
    `).get(USER_ID, WORKSPACE_ID)).toEqual({
      event_type: "flow_completed",
      source: "non_starter_domain",
      route_key: "estimate_sheet",
      step_key: "total_and_save",
      state_revision: started.state.revision + 1,
    });
  });

  it("does not complete a first-value run from another estimate's total", async () => {
    const started = await mutateOnboardingFlow(
      database,
      {
        userId: USER_ID,
        workspaceId: WORKSPACE_ID,
        eligibleStepKeys: ["hierarchy", "total_and_save"],
        resourceId: INTENDED_ESTIMATE_ID,
      },
      command({
        command: "start",
        flowKey: "first_estimate_value",
        launchMode: "start",
        mutationId: "first-value-bound-start",
      }),
    );
    if (started.status === "conflict") throw new Error("Expected first-value flow start.");
    database.sqlite.prepare(`
      INSERT INTO beta_activation_progress (
        user_id, workspace_id, project_id, estimate_id, last_milestone,
        first_value_completed_at, last_event_at, created_at, updated_at
      ) VALUES (?, ?, 'business-project', ?, 'first_valid_total', ?, ?, ?, ?)
    `).run(USER_ID, WORKSPACE_ID, OTHER_ESTIMATE_ID, NOW, NOW, NOW, NOW);
    database.sqlite.prepare(`
      INSERT INTO beta_activation_events (
        id, user_id, workspace_id, project_id, estimate_id, milestone, source,
        origin_class, occurred_at, dedupe_key, metadata_json, created_at
      ) VALUES (
        'other-estimate-total', ?, ?, 'business-project', ?, 'first_valid_total',
        'estimate', 'user_domain', ?, 'other-estimate-total', '{}', ?
      )
    `).run(USER_ID, WORKSPACE_ID, OTHER_ESTIMATE_ID, NOW, NOW);

    await importExistingOnboardingState(database, {
      userId: USER_ID,
      workspaceId: WORKSPACE_ID,
    });

    expect(database.sqlite.prepare(`
      SELECT status, current_step_key, revision
      FROM beta_onboarding_flow_states
      WHERE user_id = ? AND workspace_id = ?
        AND flow_key = 'first_estimate_value'
    `).get(USER_ID, WORKSPACE_ID)).toEqual({
      status: "in_progress",
      current_step_key: "hierarchy",
      revision: started.state.revision,
    });
  });

  it("completes guided practice only through the domain-proof contract", async () => {
    database.sqlite.prepare(`
      INSERT INTO beta_onboarding_flow_states (
        user_id, workspace_id, flow_key, flow_version, generation,
        tutorial_version, tutorial_generation, status, current_step_key,
        revision, reset_count, started_at, created_at, updated_at
      ) VALUES (
        ?, ?, 'guided_estimate_practice', 1, 1, 2, 1, 'in_progress',
        'practice_add_and_source', 3, 0, ?, ?, ?
      )
    `).run(USER_ID, WORKSPACE_ID, NOW, NOW, NOW);
    database.sqlite.prepare(`
      INSERT INTO beta_onboarding_flow_events (
        id, user_id, workspace_id, flow_key, flow_version, generation,
        tutorial_version, tutorial_generation, run_id, launch_mode, step_key,
        event_type, source, idempotency_key, state_revision, occurred_at, ingested_at
      ) VALUES (
        'guided-run-event', ?, ?, 'guided_estimate_practice', 1, 1, 2, 1,
        'guided-run', 'system', 'practice_add_and_source', 'sample_generated',
        'tutorial_seed', 'guided-run-started', 3, ?, ?
      )
    `).run(USER_ID, WORKSPACE_ID, NOW, NOW);
    for (const stepKey of ["practice_price_and_save", "practice_add_and_source"]) {
      database.sqlite.prepare(`
        INSERT INTO beta_onboarding_flow_events (
          id, user_id, workspace_id, flow_key, flow_version, generation,
          tutorial_version, tutorial_generation, run_id, launch_mode, step_key,
          event_type, source, idempotency_key, state_revision, occurred_at, ingested_at
        ) VALUES (
          ?, ?, ?, 'guided_estimate_practice', 1, 1, 2, 1, 'guided-run',
          'task', ?, 'practice_action_completed', 'tutorial_practice', ?, 3, ?, ?
        )
      `).run(
        `guided-proof-${stepKey}`,
        USER_ID,
        WORKSPACE_ID,
        stepKey,
        `guided-proof-${stepKey}`,
        NOW,
        NOW,
      );
    }

    const completed = await completeOnboardingFlowFromDomainProof(database, {
      userId: USER_ID,
      workspaceId: WORKSPACE_ID,
      flowKey: "guided_estimate_practice",
      expectedRevision: 3,
      runId: "guided-run",
      mutationId: "guided-domain-complete",
      source: "tutorial_practice",
      stepKey: "practice_add_and_source",
      routeKey: "estimate_sheet",
    });

    expect(completed).toEqual({
      status: "applied",
      state: expect.objectContaining({
        status: "completed",
        currentStepKey: null,
        revision: 4,
      }),
    });
    expect(database.sqlite.prepare(`
      SELECT event_type, source, state_revision
      FROM beta_onboarding_flow_events
      WHERE idempotency_key = 'guided-domain-complete'
    `).get()).toEqual({
      event_type: "flow_completed",
      source: "tutorial_practice",
      state_revision: 4,
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
