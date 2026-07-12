import { createRequire } from "node:module";

import { describe, expect, it, vi } from "vitest";

import {
  ActivationCohortRepositoryError,
  getActivationCohortAggregateForPlatformAdmin,
  listActivationCohort,
  listActivationCohortForPlatformAdmin,
} from "@/lib/admin/activation-cohort-repository";

const requireRuntime = createRequire(import.meta.url);

type LocalSqliteDatabase = {
  close(): void;
  exec(sql: string): void;
  prepare(sql: string): {
    all(...parameters: unknown[]): Record<string, unknown>[];
    run(...parameters: unknown[]): unknown;
  };
};

function createCohortQueryPlanFixture() {
  const { DatabaseSync } = requireRuntime("node:sqlite") as {
    DatabaseSync: new (path: string) => LocalSqliteDatabase;
  };
  const database = new DatabaseSync(":memory:");
  database.exec(`
    CREATE TABLE beta_activation_progress (
      user_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      selected_path TEXT,
      project_id TEXT,
      last_milestone TEXT,
      last_event_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX idx_beta_activation_progress_milestone_event
      ON beta_activation_progress(last_milestone, last_event_at DESC);
    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      name TEXT NOT NULL
    );
    CREATE TABLE support_conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL,
      last_message_at TEXT NOT NULL
    );
    CREATE INDEX idx_support_conv_user
      ON support_conversations(user_id, last_message_at DESC);
  `);

  const insertProgress = database.prepare(`
    INSERT INTO beta_activation_progress (
      user_id, workspace_id, selected_path, project_id, last_milestone, last_event_at, created_at
    ) VALUES (?, ?, ?, NULL, ?, ?, ?)
  `);
  const insertSupport = database.prepare(`
    INSERT INTO support_conversations (id, user_id, status, last_message_at)
    VALUES (?, ?, ?, ?)
  `);

  for (let index = 0; index < 10_000; index += 1) {
    const userId = `user-${String(index).padStart(5, "0")}`;
    const lastEventAt = `2026-07-${String((index % 28) + 1).padStart(2, "0")}T${String(index % 24).padStart(2, "0")}:00:00.000Z`;
    insertProgress.run(
      userId,
      `workspace-${index % 20}`,
      index % 3 === 0 ? "guided_sample" : "blank",
      index % 2 === 0 ? "first_valid_total" : "workspace_ready",
      lastEventAt,
      "2026-07-01T00:00:00.000Z",
    );
    if (index % 4 === 0) {
      insertSupport.run(`support-${index}`, userId, index % 8 === 0 ? "open" : "resolved", lastEventAt);
    }
  }

  return database;
}

describe("activation cohort repository", () => {
  it("uses one bounded CTE query and returns only the allowlisted cohort DTO", async () => {
    const all = vi.fn().mockResolvedValue({
      results: [{
        created_at: "2026-07-10T00:00:00.000Z",
        last_event_at: "2026-07-11T00:00:00.000Z",
        last_milestone: "first_valid_total",
        project_id: "project-a",
        project_name: "Safe project",
        selected_path: "blank",
        stalled_state: "value_stalled",
        support_state: "open",
        support_updated_at: "2026-07-11T01:00:00.000Z",
        user_id: "user-a",
        workspace_id: "workspace-a",
      }],
      success: true,
    });
    const bind = vi.fn(() => ({ all }));
    const prepare = vi.fn(() => ({ bind }));

    const result = await listActivationCohort({ limit: 1, now: new Date("2026-07-14T00:00:00.000Z") }, { prepare } as never);

    expect(prepare).toHaveBeenCalledTimes(1);
    expect(prepare.mock.calls[0]?.[0]).toContain("WITH latest_support AS");
    expect(prepare.mock.calls[0]?.[0]).toContain("ORDER BY last_event_at DESC, user_id DESC");
    expect(prepare.mock.calls[0]?.[0]).not.toContain("body_text");
    expect(prepare.mock.calls[0]?.[0]).not.toContain("subject");
    expect(result).toEqual({
      nextCursor: expect.any(String),
      rows: [{
        createdAt: "2026-07-10T00:00:00.000Z",
        lastEventAt: "2026-07-11T00:00:00.000Z",
        lastMilestone: "first_valid_total",
        project: { id: "project-a", name: "Safe project" },
        selectedPath: "blank",
        stalledState: "value_stalled",
        supportState: "open",
        supportUpdatedAt: "2026-07-11T01:00:00.000Z",
        userId: "user-a",
        workspaceId: "workspace-a",
      }],
      status: "available",
    });
  });

  it("rejects out-of-range limits before querying", async () => {
    await expect(listActivationCohort({ limit: 101 })).rejects.toBeInstanceOf(ActivationCohortRepositoryError);
  });

  it.each([
    [null, "unauthenticated"],
    [{ email: "member@example.test", role: "member" }, "non-admin"],
    [{ email: "owner@example.test", role: "owner" }, "corporate-only owner"],
  ])("denies %s before cohort repository invocation", async (context) => {
    const prepare = vi.fn();

    await expect(listActivationCohortForPlatformAdmin(context as never, {}, { prepare } as never)).rejects.toMatchObject({
      code: "activation_cohort_access_denied",
    });
    expect(prepare).not.toHaveBeenCalled();
  });

  it("allows a platform-admin caller to invoke the cohort repository", async () => {
    const all = vi.fn().mockResolvedValue({ results: [], success: true });
    const prepare = vi.fn(() => ({ bind: vi.fn(() => ({ all })) }));

    await expect(listActivationCohortForPlatformAdmin(
      { email: "admin@example.test", role: "admin" },
      {},
      { prepare } as never,
    )).resolves.toMatchObject({ status: "available" });
    expect(prepare).toHaveBeenCalledTimes(1);
  });

  it("returns aggregate-only activation facts for a platform admin", async () => {
    const first = vi.fn().mockResolvedValue({
      accepted: 4,
      active: 3,
      first_priced_row: 2,
      first_project: 3,
      invited: 5,
    });
    const prepare = vi.fn(() => ({ first }));

    const result = await getActivationCohortAggregateForPlatformAdmin(
      { email: "admin@example.test", role: "admin" },
      { prepare } as never,
    );

    expect(prepare.mock.calls[0]?.[0]).toContain("closed_beta_allowed_emails");
    expect(prepare.mock.calls[0]?.[0]).toContain("beta_activation_progress");
    expect(result).toMatchObject({
      status: "available",
      fields: {
        invited: { availability: "available", value: 5 },
        accepted: { availability: "available", value: 4 },
        active: { availability: "available", value: 3 },
        firstProject: { availability: "available", value: 3 },
        firstPricedRow: { availability: "available", value: 2 },
      },
    });
    expect(JSON.stringify(result)).not.toContain("normalized_email");
  });

  it("denies aggregate reads before querying and does not turn query failure into zero", async () => {
    const prepare = vi.fn(() => ({ first: vi.fn().mockRejectedValue(new Error("D1 unavailable")) }));

    await expect(getActivationCohortAggregateForPlatformAdmin(
      { email: "member@example.test", role: "member" },
      { prepare } as never,
    )).rejects.toMatchObject({ code: "activation_cohort_access_denied" });
    expect(prepare).not.toHaveBeenCalled();

    await expect(getActivationCohortAggregateForPlatformAdmin(
      { email: "admin@example.test", role: "admin" },
      { prepare } as never,
    )).resolves.toMatchObject({
      status: "unavailable",
      fields: {
        invited: { availability: "unavailable", value: undefined },
        firstPricedRow: { availability: "unavailable", value: undefined },
      },
    });
  });

  it("rejects invalid cursors and filters while treating empty D1 results as available", async () => {
    await expect(listActivationCohort({ cursor: "not-a-cursor" })).rejects.toMatchObject({
      code: "activation_cohort_invalid_input",
    });
    await expect(listActivationCohort({ stage: "not-a-stage" as never })).rejects.toMatchObject({
      code: "activation_cohort_invalid_input",
    });

    const all = vi.fn().mockResolvedValue({ results: [], success: true });
    const prepare = vi.fn(() => ({ bind: vi.fn(() => ({ all })) }));
    await expect(listActivationCohort({}, { prepare } as never)).resolves.toEqual({
      nextCursor: null,
      rows: [],
      status: "available",
    });
    expect(prepare).toHaveBeenCalledTimes(1);
  });

  it("uses the named activation index for a 10k stage-filtered cohort page", async () => {
    let query = "";
    let values: unknown[] = [];
    const prepare = vi.fn((sql: string) => ({
      bind: (...boundValues: unknown[]) => {
        query = sql;
        values = boundValues;
        return { all: vi.fn().mockResolvedValue({ results: [], success: true }) };
      },
    }));
    const database = createCohortQueryPlanFixture();

    try {
      await listActivationCohort({
        limit: 100,
        now: new Date("2026-07-29T00:00:00.000Z"),
        stage: "first_valid_total",
      }, { prepare } as never);

      const plan = database.prepare(`EXPLAIN QUERY PLAN ${query}`).all(...values)
        .map((row) => String(row.detail));
      const rows = database.prepare(query).all(...values);

      expect(prepare).toHaveBeenCalledTimes(1);
      expect(plan).toContainEqual(expect.stringMatching(
        /SEARCH progress USING INDEX idx_beta_activation_progress_milestone_event \(last_milestone=\?\)/,
      ));
      expect(plan).not.toContainEqual(expect.stringMatching(/SCAN progress/));
      expect(rows).toHaveLength(100);
    } finally {
      database.close();
    }
  });
});
