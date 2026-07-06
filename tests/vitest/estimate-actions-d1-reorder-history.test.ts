import { describe, expect, it, vi } from "vitest";

import type { CurrentUserContext } from "@/lib/auth/session";
import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import { EstimateActionsD1Client } from "@/lib/estimates/d1-action-client";

vi.mock("server-only", () => ({}));

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const WORKSPACE_ID = "22222222-2222-4222-8222-222222222222";
const USER_ID = "33333333-3333-4333-8333-333333333333";
const ESTIMATE_ID = "44444444-4444-4444-8444-444444444444";
const NODE_ID = "55555555-5555-4555-8555-555555555555";
const OTHER_PROJECT_ID = "66666666-6666-4666-8666-666666666666";

type FakeProjectRow = {
  id: string;
  workspace_id: string;
};

type FakeEstimateRow = {
  id: string;
  project_id: string;
};

type FakeNodeRow = {
  id: string;
  estimate_id: string;
  estimate_tab_id?: string | null;
  parent_id: string | null;
  sort_order: number;
};

type FakeHistoryEvent = {
  id: string;
  estimate_id: string;
  workspace_id: string;
  project_id: string;
  event_type: string;
  event_source: string;
  correlation_id: string;
  actor_user_id: string | null;
  changed_fields: unknown;
  payload: unknown;
};

type CapturedStatement = {
  sql: string;
  values: D1Value[];
};

function parseJsonValue(value: D1Value | undefined) {
  if (typeof value !== "string") return value;
  return JSON.parse(value);
}

function createCurrentUserContext(): CurrentUserContext {
  const now = "2026-07-06T00:00:00.000Z";
  return {
    avatarUrl: null,
    displayName: "Estimator Owner",
    email: "owner@example.test",
    profile: {
      avatar_url: null,
      created_at: now,
      default_workspace_id: WORKSPACE_ID,
      display_name: "Estimator Owner",
      email: "owner@example.test",
      id: USER_ID,
      role: "member",
      updated_at: now,
    },
    role: "member",
    userId: USER_ID,
  };
}

class FakeD1Statement<T = Record<string, unknown>> {
  values: D1Value[] = [];

  constructor(
    private readonly database: FakeD1Database,
    readonly sql: string,
  ) {}

  bind(...values: D1Value[]) {
    this.values = values;
    return this;
  }

  async first<R = T>(): Promise<R | null> {
    this.database.firstStatements.push(this);

    if (this.sql.includes("SELECT 1 AS allowed") && this.sql.includes("FROM estimates estimate")) {
      const estimateId = String(this.values[0] ?? "");
      const estimate = this.database.estimates.get(estimateId);
      const projectCreatorUserId = this.values[3];
      return estimate && projectCreatorUserId === USER_ID ? ({ allowed: 1 } as R) : null;
    }

    if (this.sql.includes("SELECT id, payload") && this.sql.includes("FROM estimate_sheet_events")) {
      const estimateId = String(this.values[0] ?? "");
      const correlationId = String(this.values[1] ?? "");
      const existing = this.database.historyEvents.find(
        (event) => event.estimate_id === estimateId && event.correlation_id === correlationId,
      );
      return existing ? ({ id: existing.id, payload: JSON.stringify(existing.payload) } as R) : null;
    }

    if (this.sql.includes("SELECT id, workspace_id") && this.sql.includes("FROM projects")) {
      const projectId = String(this.values[0] ?? "");
      const project = this.database.projects.get(projectId);
      return project ? ({ ...project } as R) : null;
    }

    return null;
  }

  async all<R = T>(): Promise<D1Result<R>> {
    this.database.allStatements.push(this);
    if (this.sql.includes("FROM estimate_nodes") && this.sql.includes("WHERE estimate_id = ?")) {
      const estimateId = String(this.values[0] ?? "");
      const results = [...this.database.nodes.values()]
        .filter((node) => node.estimate_id === estimateId)
        .map((node) => ({ ...node })) as R[];
      return { results, success: true };
    }
    return { results: [], success: true };
  }

  async run(): Promise<D1Result<T>> {
    this.database.runStatements.push(this);

    if (this.sql.includes("INSERT INTO estimate_sheet_events")) {
      const [
        id,
        estimateId,
        workspaceId,
        projectId,
        ,
        ,
        ,
        eventType,
        eventSource,
        correlationId,
        actorUserId,
        changedFields,
        ,
        ,
        ,
        payload,
      ] = this.values;
      this.database.historyEvents.push({
        id: String(id),
        estimate_id: String(estimateId),
        workspace_id: String(workspaceId),
        project_id: String(projectId),
        event_type: String(eventType),
        event_source: String(eventSource),
        correlation_id: String(correlationId),
        actor_user_id: actorUserId === null ? null : String(actorUserId),
        changed_fields: parseJsonValue(changedFields),
        payload: parseJsonValue(payload),
      });
      return { success: true, meta: { changes: 1 } };
    }

    return { success: true, meta: { changes: 0 } };
  }
}

class FakeD1Database implements D1DatabaseLike {
  allStatements: CapturedStatement[] = [];
  firstStatements: CapturedStatement[] = [];
  runStatements: CapturedStatement[] = [];
  batchStatements: CapturedStatement[] = [];
  projects = new Map<string, FakeProjectRow>([
    [PROJECT_ID, { id: PROJECT_ID, workspace_id: WORKSPACE_ID }],
  ]);
  estimates = new Map<string, FakeEstimateRow>([
    [ESTIMATE_ID, { id: ESTIMATE_ID, project_id: PROJECT_ID }],
  ]);
  nodes = new Map<string, FakeNodeRow>([
    [NODE_ID, { id: NODE_ID, estimate_id: ESTIMATE_ID, parent_id: "old-parent", sort_order: 10 }],
  ]);
  historyEvents: FakeHistoryEvent[] = [];

  prepare<T = Record<string, unknown>>(sql: string) {
    return new FakeD1Statement<T>(this, sql);
  }

  async batch<T = Record<string, unknown>>(statements: Array<D1PreparedStatementLike<T>>): Promise<Array<D1Result<T>>> {
    const capturedStatements = statements as CapturedStatement[];
    this.batchStatements.push(...capturedStatements);
    for (const statement of capturedStatements) {
      if (!statement.sql.includes("UPDATE estimate_nodes SET parent_id = ?")) continue;
      const [parentId, sortOrder, , nodeId, estimateId] = statement.values;
      const node = this.nodes.get(String(nodeId));
      if (!node || node.estimate_id !== estimateId) continue;
      node.parent_id = parentId === null ? null : String(parentId);
      node.sort_order = Number(sortOrder);
    }
    return statements.map(() => ({ success: true, meta: { changes: 1 } }));
  }
}

describe("EstimateActionsD1Client reorder history", () => {
  it("writes scoped reorder history with project and workspace context", async () => {
    const database = new FakeD1Database();
    const client = new EstimateActionsD1Client(database, createCurrentUserContext());
    const updates = [{ id: NODE_ID, parent_id: null, sort_order: 20 }];

    const result = await client.call<{ updatedNodeCount: number }>("reorder_estimate_nodes_with_history", {
      target_project_id: PROJECT_ID,
      target_estimate_id: ESTIMATE_ID,
      move_updates: updates,
      acting_user_id: USER_ID,
      correlation_id: "reorder-correlation-1",
    });

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ updatedNodeCount: 1 });
    expect(database.nodes.get(NODE_ID)).toMatchObject({ parent_id: null, sort_order: 20 });
    expect(database.historyEvents).toHaveLength(1);
    expect(database.historyEvents[0]).toMatchObject({
      workspace_id: WORKSPACE_ID,
      project_id: PROJECT_ID,
      event_type: "estimate_nodes_reordered",
      event_source: "server_action",
      correlation_id: "reorder-correlation-1",
      actor_user_id: USER_ID,
      changed_fields: ["parent_id", "sort_order"],
      payload: { updates },
    });
  });

  it("rejects self-parenting and descendant cycles before writing reorder history", async () => {
    const database = new FakeD1Database();
    database.nodes = new Map<string, FakeNodeRow>([
      ["project-scope", { id: "project-scope", estimate_id: ESTIMATE_ID, estimate_tab_id: "tab-a", parent_id: null, sort_order: 10 }],
      ["ground-floor", { id: "ground-floor", estimate_id: ESTIMATE_ID, estimate_tab_id: "tab-a", parent_id: "project-scope", sort_order: 20 }],
      ["kitchen", { id: "kitchen", estimate_id: ESTIMATE_ID, estimate_tab_id: "tab-a", parent_id: "ground-floor", sort_order: 30 }],
    ]);
    const client = new EstimateActionsD1Client(database, createCurrentUserContext());

    const selfResult = await client.call("reorder_estimate_nodes_with_history", {
      target_project_id: PROJECT_ID,
      target_estimate_id: ESTIMATE_ID,
      move_updates: [{ id: "kitchen", parent_id: "kitchen", sort_order: 10 }],
      acting_user_id: USER_ID,
      correlation_id: "reorder-correlation-self",
    });
    const cycleResult = await client.call("reorder_estimate_nodes_with_history", {
      target_project_id: PROJECT_ID,
      target_estimate_id: ESTIMATE_ID,
      move_updates: [{ id: "ground-floor", parent_id: "kitchen", sort_order: 10 }],
      acting_user_id: USER_ID,
      correlation_id: "reorder-correlation-cycle",
    });

    expect(selfResult.data).toBeNull();
    expect(selfResult.error?.message).toBe("An estimate tree node cannot be moved inside itself or one of its descendants.");
    expect(cycleResult.data).toBeNull();
    expect(cycleResult.error?.message).toBe("An estimate tree node cannot be moved inside itself or one of its descendants.");
    expect(database.batchStatements).toEqual([]);
    expect(database.historyEvents).toEqual([]);
  });

  it("rejects cross-tab reparenting before writing reorder history", async () => {
    const database = new FakeD1Database();
    database.nodes = new Map<string, FakeNodeRow>([
      ["ground-floor", { id: "ground-floor", estimate_id: ESTIMATE_ID, estimate_tab_id: "tab-a", parent_id: null, sort_order: 10 }],
      ["kitchen", { id: "kitchen", estimate_id: ESTIMATE_ID, estimate_tab_id: "tab-a", parent_id: "ground-floor", sort_order: 20 }],
      ["site-works", { id: "site-works", estimate_id: ESTIMATE_ID, estimate_tab_id: "tab-b", parent_id: null, sort_order: 30 }],
    ]);
    const client = new EstimateActionsD1Client(database, createCurrentUserContext());

    const result = await client.call("reorder_estimate_nodes_with_history", {
      target_project_id: PROJECT_ID,
      target_estimate_id: ESTIMATE_ID,
      move_updates: [{ id: "kitchen", parent_id: "site-works", sort_order: 10 }],
      acting_user_id: USER_ID,
      correlation_id: "reorder-correlation-cross-tab",
    });

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe("Estimate tree nodes cannot be moved across tabs.");
    expect(database.batchStatements).toEqual([]);
    expect(database.historyEvents).toEqual([]);
  });

  it.each([
    ["missing", {}],
    ["empty", { target_project_id: "" }],
    ["unknown", { target_project_id: OTHER_PROJECT_ID }],
  ])("rejects %s target_project_id before appending reorder history", async (_label, projectScope) => {
    const database = new FakeD1Database();
    const client = new EstimateActionsD1Client(database, createCurrentUserContext());

    const result = await client.call("reorder_estimate_nodes_with_history", {
      ...projectScope,
      target_estimate_id: ESTIMATE_ID,
      move_updates: [{ id: NODE_ID, parent_id: null, sort_order: 20 }],
      acting_user_id: USER_ID,
      correlation_id: `reorder-correlation-${_label}`,
    });

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe("Estimate history event workspace could not be resolved.");
    expect(database.historyEvents).toEqual([]);
  });
});
