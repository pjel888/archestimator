import { beforeEach, describe, expect, it, vi } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";

vi.mock("server-only", () => ({}));

const authMocks = vi.hoisted(() => ({
  readFirstAccountWorkspaceMembership: vi.fn(),
  requireCurrentUserContext: vi.fn(),
}));

const cloudflareMocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

const projectSheetMocks = vi.hoisted(() => ({
  listProjectEstimateSheetsForProject: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireCurrentUserContext: authMocks.requireCurrentUserContext,
}));

vi.mock("@/lib/auth/account-membership", () => ({
  readFirstAccountWorkspaceMembership: authMocks.readFirstAccountWorkspaceMembership,
}));

vi.mock("@/lib/cloudflare/d1", () => ({
  getCloudflareD1Database: cloudflareMocks.getCloudflareD1Database,
}));

vi.mock("@/lib/repositories/project-estimate-sheets-repository", () => ({
  listProjectEstimateSheetsForProject: projectSheetMocks.listProjectEstimateSheetsForProject,
}));

vi.mock("@/lib/perf/server-timing", () => ({
  traced: (_name: string, operation: () => unknown) => operation(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: vi.fn() })),
  headers: vi.fn(async () => new Headers()),
}));

const USER_ID = "11111111-1111-4111-8111-111111111111";
const DEFAULT_WORKSPACE_ID = "22222222-2222-4222-8222-222222222222";
const PROJECT_WORKSPACE_ID = "33333333-3333-4333-8333-333333333333";
const PROJECT_ID = "44444444-4444-4444-8444-444444444444";
const ESTIMATE_ALLOWED_ID = "55555555-5555-4555-8555-555555555555";
const ESTIMATE_DENIED_ID = "66666666-6666-4666-8666-666666666666";

type AccessResult = "allow" | "deny" | "throw";

type FakeWorkspaceRepositoryOptions = {
  estimateAccess?: Record<string, AccessResult>;
  projectAccess?: AccessResult | "sheet-only";
};

type D1Query = {
  sql: string;
  values: D1Value[];
};

function currentUserContext() {
  const now = "2026-07-04T00:00:00.000Z";
  return {
    avatarUrl: null,
    displayName: "Authz User",
    email: "authz@example.test",
    profile: {
      avatar_url: null,
      created_at: now,
      default_workspace_id: DEFAULT_WORKSPACE_ID,
      display_name: "Authz User",
      email: "authz@example.test",
      id: USER_ID,
      role: "member",
      updated_at: now,
    },
    role: "member",
    userId: USER_ID,
  };
}

function workspaceRow(id: string, createdBy: string | null = null) {
  return {
    id,
    created_by: createdBy,
    name: id === DEFAULT_WORKSPACE_ID ? "Default Workspace" : "Shared Workspace",
    slug: null,
    created_at: "2026-07-04T00:00:00.000Z",
    updated_at: "2026-07-04T00:00:00.000Z",
  };
}

function projectRow() {
  return {
    id: PROJECT_ID,
    workspace_id: PROJECT_WORKSPACE_ID,
    created_by: "project-owner",
    name: "Shared Project",
    client_name: "Client",
    location: "Site",
    project_code: "PRJ-1",
    currency_code: "PHP",
    metadata: "{}",
    created_at: "2026-07-04T00:00:00.000Z",
    updated_at: "2026-07-04T00:00:00.000Z",
  };
}

function estimateRow(id: string, sheetCode: string) {
  return {
    id,
    project_id: PROJECT_ID,
    name: sheetCode === "A-001" ? "Allowed Estimate" : "Denied Estimate",
    sheet_code: sheetCode,
    notes: null,
    project_budget: null,
    currency_code: "PHP",
    metadata: "{}",
    created_by: "project-owner",
    created_at: "2026-07-04T00:00:00.000Z",
    updated_at: "2026-07-04T00:00:00.000Z",
  };
}

class FakeD1Statement implements D1PreparedStatementLike {
  private values: D1Value[] = [];

  constructor(
    private readonly database: FakeWorkspaceRepositoryD1Database,
    private readonly sql: string,
  ) {}

  bind(...values: D1Value[]) {
    this.values = values;
    return this;
  }

  async first<R = Record<string, unknown>>() {
    return this.database.first({ sql: this.sql, values: this.values }) as Promise<R | null>;
  }

  async all<R = Record<string, unknown>>() {
    return this.database.all({ sql: this.sql, values: this.values }) as Promise<D1Result<R>>;
  }

  async run() {
    this.database.runs.push({ sql: this.sql, values: this.values });
    return { success: true, meta: { changes: 1 } };
  }
}

class FakeWorkspaceRepositoryD1Database implements D1DatabaseLike {
  readonly queries: D1Query[] = [];
  readonly runs: D1Query[] = [];
  private readonly estimateAccess: Record<string, AccessResult>;
  private readonly projectAccess: AccessResult | "sheet-only";

  constructor(options: FakeWorkspaceRepositoryOptions = {}) {
    this.projectAccess = options.projectAccess ?? "allow";
    this.estimateAccess = options.estimateAccess ?? { [ESTIMATE_ALLOWED_ID]: "allow", [ESTIMATE_DENIED_ID]: "deny" };
  }

  prepare<T = Record<string, unknown>>(sql: string): D1PreparedStatementLike<T> {
    return new FakeD1Statement(this, sql) as D1PreparedStatementLike<T>;
  }

  async first({ sql, values }: D1Query) {
    this.queries.push({ sql, values });

    if (sql.includes("SELECT 1 AS allowed") && sql.includes("FROM projects project")) {
      if (this.projectAccess === "throw") throw new Error("project access probe failed");
      if (this.projectAccess === "sheet-only") {
        return sql.includes("FROM estimate_sheet_members") ? { allowed: 1 } : null;
      }
      return this.projectAccess === "allow" ? { allowed: 1 } : null;
    }

    if (sql.includes("SELECT 1 AS allowed") && sql.includes("FROM estimates estimate")) {
      const estimateId = String(values[0]);
      const access = this.estimateAccess[estimateId] ?? "deny";
      if (access === "throw") throw new Error("estimate access probe failed");
      return access === "allow" ? { allowed: 1 } : null;
    }

    if (sql.includes("FROM projects") && sql.includes("WHERE id = ?")) {
      return values[0] === PROJECT_ID ? projectRow() : null;
    }

    if (sql.includes("FROM workspaces") && sql.includes("WHERE id = ?")) {
      const workspaceId = String(values[0]);
      if (workspaceId === DEFAULT_WORKSPACE_ID || workspaceId === PROJECT_WORKSPACE_ID) return workspaceRow(workspaceId);
      return null;
    }

    if (sql.includes("FROM workspace_members") && sql.includes("LIMIT 1")) {
      return values[0] === DEFAULT_WORKSPACE_ID && values[1] === USER_ID ? { role: "member" } : null;
    }

    if (sql.includes("FROM profiles") && sql.includes("WHERE id = ?")) {
      return values[0] === USER_ID ? currentUserContext().profile : null;
    }

    return null;
  }

  async all({ sql, values }: D1Query) {
    this.queries.push({ sql, values });

    if (sql.includes("FROM estimates") && sql.includes("WHERE project_id = ?")) {
      return {
        results: [
          estimateRow(ESTIMATE_ALLOWED_ID, "A-001"),
          estimateRow(ESTIMATE_DENIED_ID, "D-001"),
        ],
      };
    }

    if (sql.includes("estimate.id AS estimate_id")) {
      return {
        results: values.map((estimateId) => ({
          estimate_id: String(estimateId),
          node_count: 1,
          row_count: 2,
          total_cost: 300,
        })),
      };
    }

    if (sql.includes("FROM estimate_nodes")) {
      return {
        results: values.map((estimateId, index) => ({
          id: `node-${index}`,
          estimate_id: String(estimateId),
          kind: "area",
          parent_id: null,
          sort_order: index,
        })),
      };
    }

    return { results: [] };
  }
}

async function importWorkspaceRepository(database: FakeWorkspaceRepositoryD1Database) {
  vi.resetModules();
  authMocks.requireCurrentUserContext.mockResolvedValue(currentUserContext());
  authMocks.readFirstAccountWorkspaceMembership.mockResolvedValue(null);
  cloudflareMocks.getCloudflareD1Database.mockResolvedValue(database);
  projectSheetMocks.listProjectEstimateSheetsForProject.mockResolvedValue([
    { id: ESTIMATE_ALLOWED_ID, name: "Allowed Estimate", sheetCode: "A-001", updatedAt: "2026-07-04T00:00:00.000Z" },
    { id: ESTIMATE_DENIED_ID, name: "Denied Estimate", sheetCode: "D-001", updatedAt: "2026-07-04T00:00:00.000Z" },
  ]);
  return import("@/lib/repositories/workspace-repository");
}

describe("workspace repository D1 authorization behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a shared project when D1 project access allows it", async () => {
    const database = new FakeWorkspaceRepositoryD1Database({ projectAccess: "allow" });
    const { getCurrentWorkspaceProject } = await importWorkspaceRepository(database);

    const result = await getCurrentWorkspaceProject(PROJECT_ID);

    expect(result.project?.id).toBe(PROJECT_ID);
    expect(result.workspace.id).toBe(PROJECT_WORKSPACE_ID);
  });

  it("returns the default workspace and no project for a cross-workspace outsider", async () => {
    const database = new FakeWorkspaceRepositoryD1Database({ projectAccess: "deny" });
    const { getCurrentWorkspaceProject } = await importWorkspaceRepository(database);

    const result = await getCurrentWorkspaceProject(PROJECT_ID);

    expect(result.project).toBeNull();
    expect(result.workspace.id).toBe(DEFAULT_WORKSPACE_ID);
  });

  it("fails closed when the project access probe throws", async () => {
    const database = new FakeWorkspaceRepositoryD1Database({ projectAccess: "throw" });
    const { getCurrentWorkspaceProject } = await importWorkspaceRepository(database);

    const result = await getCurrentWorkspaceProject(PROJECT_ID);

    expect(result.project).toBeNull();
    expect(result.workspace.id).toBe(DEFAULT_WORKSPACE_ID);
  });

  it("filters project estimates through estimate-level D1 access", async () => {
    const database = new FakeWorkspaceRepositoryD1Database({
      estimateAccess: { [ESTIMATE_ALLOWED_ID]: "allow", [ESTIMATE_DENIED_ID]: "deny" },
      projectAccess: "allow",
    });
    const { listProjectEstimates } = await importWorkspaceRepository(database);

    const result = await listProjectEstimates(PROJECT_ID);

    expect(result.project?.id).toBe(PROJECT_ID);
    expect(result.estimates.map((estimate) => estimate.id)).toEqual([ESTIMATE_ALLOWED_ID]);
    expect(result.nodeCountByEstimateId.get(ESTIMATE_ALLOWED_ID)).toBe(1);
    expect(result.nodeCountByEstimateId.has(ESTIMATE_DENIED_ID)).toBe(false);
  });

  it("returns no estimates when the project itself is not accessible", async () => {
    const database = new FakeWorkspaceRepositoryD1Database({ projectAccess: "deny" });
    const { listProjectEstimates } = await importWorkspaceRepository(database);

    const result = await listProjectEstimates(PROJECT_ID);

    expect(result.project).toBeNull();
    expect(result.estimates).toEqual([]);
    expect(result.nodeCountByEstimateId.size).toBe(0);
  });

  it("does not treat sheet-only membership as whole-project access", async () => {
    const database = new FakeWorkspaceRepositoryD1Database({ projectAccess: "sheet-only" });
    const { getCurrentWorkspaceProject, listProjectEstimateSheets } = await importWorkspaceRepository(database);

    const result = await getCurrentWorkspaceProject(PROJECT_ID);
    const sheets = await listProjectEstimateSheets(PROJECT_ID);

    expect(result.project).toBeNull();
    expect(sheets).toEqual([]);
    expect(projectSheetMocks.listProjectEstimateSheetsForProject).not.toHaveBeenCalled();
    expect(database.queries.find((query) => query.sql.includes("SELECT 1 AS allowed"))?.sql).not.toContain(
      "estimate_sheet_members",
    );
  });

  it("fails closed when estimate-level access probes throw", async () => {
    const database = new FakeWorkspaceRepositoryD1Database({
      estimateAccess: { [ESTIMATE_ALLOWED_ID]: "throw", [ESTIMATE_DENIED_ID]: "throw" },
      projectAccess: "allow",
    });
    const { listProjectEstimates } = await importWorkspaceRepository(database);

    const result = await listProjectEstimates(PROJECT_ID);

    expect(result.project?.id).toBe(PROJECT_ID);
    expect(result.estimates).toEqual([]);
    expect(database.queries.some((query) => query.sql.includes("estimate.id AS estimate_id"))).toBe(false);
  });

  it("filters lightweight project sheet lists through estimate-level D1 access", async () => {
    const database = new FakeWorkspaceRepositoryD1Database({
      estimateAccess: { [ESTIMATE_ALLOWED_ID]: "allow", [ESTIMATE_DENIED_ID]: "deny" },
      projectAccess: "allow",
    });
    const { listProjectEstimateSheets } = await importWorkspaceRepository(database);

    const sheets = await listProjectEstimateSheets(PROJECT_ID);

    expect(projectSheetMocks.listProjectEstimateSheetsForProject).toHaveBeenCalledWith(PROJECT_ID, {});
    expect(sheets.map((sheet) => sheet.id)).toEqual([ESTIMATE_ALLOWED_ID]);
  });

  it("returns no lightweight project sheets when the project is inaccessible", async () => {
    const database = new FakeWorkspaceRepositoryD1Database({ projectAccess: "deny" });
    const { listProjectEstimateSheets } = await importWorkspaceRepository(database);

    const sheets = await listProjectEstimateSheets(PROJECT_ID);

    expect(sheets).toEqual([]);
    expect(projectSheetMocks.listProjectEstimateSheetsForProject).not.toHaveBeenCalled();
  });
});
