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
const ESTIMATE_ACCESS_PROBE_BATCH_SIZE = 90;

type AccessResult = "allow" | "deny" | "throw";

type FakeWorkspaceRepositoryOptions = {
  estimateAccess?: Record<string, AccessResult>;
  favoriteEstimateRows?: Array<{ estimate_id: string; project_id: string; created_at: string }>;
  projectFavoriteRows?: Array<{ project_id: string; created_at: string }>;
  recentProjects?: ReturnType<typeof defaultWorkspaceProjectRow>[];
  projectAccess?: AccessResult | "sheet-only";
};

type ProjectEstimateSheetMock = {
  id: string;
  name: string;
  sheetCode: string;
  updatedAt: string;
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

function defaultWorkspaceProjectRow() {
  return {
    ...projectRow(),
    workspace_id: DEFAULT_WORKSPACE_ID,
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
  private readonly favoriteEstimateRows: Array<{ estimate_id: string; project_id: string; created_at: string }>;
  private readonly projectFavoriteRows: Array<{ project_id: string; created_at: string }>;
  private readonly recentProjects: ReturnType<typeof defaultWorkspaceProjectRow>[];
  private readonly projectAccess: AccessResult | "sheet-only";

  constructor(options: FakeWorkspaceRepositoryOptions = {}) {
    this.projectAccess = options.projectAccess ?? "allow";
    this.estimateAccess = options.estimateAccess ?? { [ESTIMATE_ALLOWED_ID]: "allow", [ESTIMATE_DENIED_ID]: "deny" };
    this.favoriteEstimateRows = options.favoriteEstimateRows ?? [];
    this.projectFavoriteRows = options.projectFavoriteRows ?? [];
    this.recentProjects = options.recentProjects ?? [defaultWorkspaceProjectRow()];
  }

  prepare<T = Record<string, unknown>>(sql: string): D1PreparedStatementLike<T> {
    return new FakeD1Statement(this, sql) as D1PreparedStatementLike<T>;
  }

  async batch<T = Record<string, unknown>>(statements: D1PreparedStatementLike<T>[]) {
    return Promise.all(statements.map((statement) => statement.run()));
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

    if (sql.includes("FROM projects") && sql.includes("WHERE workspace_id = ?")) {
      return { results: values[0] === DEFAULT_WORKSPACE_ID ? this.recentProjects : [] };
    }

    if (sql.includes("SELECT project_id") && sql.includes("FROM project_favorites")) {
      return { results: this.projectFavoriteRows };
    }

    if (sql.includes("SELECT estimate_id, project_id, created_at") && sql.includes("FROM estimate_favorites")) {
      return { results: this.favoriteEstimateRows };
    }

    if (sql.includes("FROM project_members") && sql.includes("WHERE user_id = ?")) {
      return { results: [] };
    }

    if (sql.includes("FROM estimate_sheet_members") && sql.includes("WHERE user_id = ?")) {
      return { results: [] };
    }

    if (sql.includes("FROM project_groups")) {
      return { results: [] };
    }

    if (sql.includes("FROM project_group_memberships")) {
      return { results: [] };
    }

    if (sql.includes("SELECT project.id") && sql.includes("FROM projects project") && sql.includes("WHERE project.id IN")) {
      if (this.projectAccess === "throw" || this.projectAccess === "deny") return { results: [] };
      return {
        results: values
          .filter((value): value is string => typeof value === "string" && value === PROJECT_ID)
          .map((id) => ({ id })),
      };
    }

    if (sql.includes("FROM projects") && sql.includes("WHERE id IN")) {
      return { results: [] };
    }

    if (sql.includes("SELECT id, project_id, name, sheet_code, updated_at") && sql.includes("WHERE id IN")) {
      return {
        results: values
          .filter((value): value is string => typeof value === "string")
          .map((id) => estimateRow(id, id === ESTIMATE_ALLOWED_ID ? "A-001" : "D-001")),
      };
    }

    if (sql.includes("SELECT id, project_id, name, sheet_code, updated_at") && sql.includes("WHERE project_id IN")) {
      return {
        results: [
          estimateRow(ESTIMATE_ALLOWED_ID, "A-001"),
          estimateRow(ESTIMATE_DENIED_ID, "D-001"),
        ],
      };
    }

    if (sql.includes("SELECT estimate.id") && sql.includes("FROM estimates estimate") && sql.includes("WHERE estimate.id IN")) {
      const estimateIds = values.filter((value): value is string =>
        typeof value === "string" && Object.hasOwn(this.estimateAccess, value)
      );
      return {
        results: estimateIds.flatMap((estimateId) => {
          const access = this.estimateAccess[estimateId] ?? "deny";
          if (access === "throw") throw new Error("estimate access batch failed");
          return access === "allow" ? [{ id: estimateId }] : [];
        }),
      };
    }

    if (sql.includes("FROM project_publications")) {
      return { results: [] };
    }

    if (sql.includes("FROM collaboration_invitations")) {
      return { results: [] };
    }

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

async function importWorkspaceRepository(
  database: FakeWorkspaceRepositoryD1Database,
  options: { projectEstimateSheets?: ProjectEstimateSheetMock[] } = {},
) {
  vi.resetModules();
  authMocks.requireCurrentUserContext.mockResolvedValue(currentUserContext());
  authMocks.readFirstAccountWorkspaceMembership.mockResolvedValue(null);
  cloudflareMocks.getCloudflareD1Database.mockResolvedValue(database);
  projectSheetMocks.listProjectEstimateSheetsForProject.mockResolvedValue(options.projectEstimateSheets ?? [
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

  it("rejects invalid project and estimate ids before opening D1", async () => {
    const database = new FakeWorkspaceRepositoryD1Database({ projectAccess: "allow" });
    const { getCurrentWorkspaceProjectForEstimate } = await importWorkspaceRepository(database);

    const invalidProject = await getCurrentWorkspaceProjectForEstimate("invalid-project", ESTIMATE_ALLOWED_ID);
    const invalidEstimate = await getCurrentWorkspaceProjectForEstimate(PROJECT_ID, "invalid-estimate");

    expect(invalidProject.project).toBeNull();
    expect(invalidEstimate.project).toBeNull();
    expect(invalidProject.workspace.id).toBe(DEFAULT_WORKSPACE_ID);
    expect(invalidEstimate.workspace.id).toBe(DEFAULT_WORKSPACE_ID);
    expect(database.queries.flatMap((query) => query.values)).not.toContain("invalid-project");
    expect(database.queries.flatMap((query) => query.values)).not.toContain("invalid-estimate");
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

  it("chunks batched lightweight project sheet access probes below D1 bind limits", async () => {
    const projectEstimateSheets = Array.from({ length: 95 }, (_, index) => {
      const position = String(index + 1).padStart(3, "0");
      return {
        id: `estimate-${position}`,
        name: `Estimate ${position}`,
        sheetCode: `E-${position}`,
        updatedAt: "2026-07-04T00:00:00.000Z",
      };
    });
    const estimateAccess: Record<string, AccessResult> = Object.fromEntries(
      projectEstimateSheets.map((sheet, index) => [sheet.id, index % 2 === 0 ? "allow" : "deny"]),
    );
    const database = new FakeWorkspaceRepositoryD1Database({
      estimateAccess,
      projectAccess: "allow",
    });
    const { listProjectEstimateSheets } = await importWorkspaceRepository(database, { projectEstimateSheets });

    const sheets = await listProjectEstimateSheets(PROJECT_ID);

    expect(sheets.map((sheet) => sheet.id)).toEqual(
      projectEstimateSheets.filter((_sheet, index) => index % 2 === 0).map((sheet) => sheet.id),
    );
    const batchedAccessQueries = database.queries.filter((query) =>
      query.sql.includes("SELECT estimate.id") &&
      query.sql.includes("FROM estimates estimate") &&
      query.sql.includes("WHERE estimate.id IN")
    );
    expect(batchedAccessQueries).toHaveLength(2);
    expect(batchedAccessQueries[0]?.values.slice(0, -3)).toEqual(
      projectEstimateSheets.slice(0, ESTIMATE_ACCESS_PROBE_BATCH_SIZE).map((sheet) => sheet.id),
    );
    expect(batchedAccessQueries[1]?.values.slice(0, -3)).toEqual(
      projectEstimateSheets.slice(ESTIMATE_ACCESS_PROBE_BATCH_SIZE).map((sheet) => sheet.id),
    );
    expect(batchedAccessQueries.map((query) => query.values.length)).toEqual([
      ESTIMATE_ACCESS_PROBE_BATCH_SIZE + 3,
      projectEstimateSheets.length - ESTIMATE_ACCESS_PROBE_BATCH_SIZE + 3,
    ]);
    expect(database.queries.some((query) =>
      query.sql.includes("SELECT 1 AS allowed") && query.sql.includes("FROM estimates estimate")
    )).toBe(false);
  });

  it("returns no lightweight project sheets when the project is inaccessible", async () => {
    const database = new FakeWorkspaceRepositoryD1Database({ projectAccess: "deny" });
    const { listProjectEstimateSheets } = await importWorkspaceRepository(database);

    const sheets = await listProjectEstimateSheets(PROJECT_ID);

    expect(sheets).toEqual([]);
    expect(projectSheetMocks.listProjectEstimateSheetsForProject).not.toHaveBeenCalled();
  });

  it("filters project card estimate sheet summaries through estimate-level D1 access", async () => {
    const database = new FakeWorkspaceRepositoryD1Database({
      estimateAccess: { [ESTIMATE_ALLOWED_ID]: "allow", [ESTIMATE_DENIED_ID]: "deny" },
      projectAccess: "allow",
    });
    const { listCurrentWorkspaceProjects } = await importWorkspaceRepository(database);

    const result = await listCurrentWorkspaceProjects();

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0]?.accessKind).toBe("owned");
    expect(result.projects[0]?.estimateSheets.map((sheet) => sheet.id)).toEqual([ESTIMATE_ALLOWED_ID]);
    const batchedAccessQueries = database.queries.filter((query) =>
      query.sql.includes("SELECT estimate.id") &&
      query.sql.includes("FROM estimates estimate") &&
      query.sql.includes("WHERE estimate.id IN")
    );
    expect(batchedAccessQueries).toHaveLength(1);
    expect(batchedAccessQueries[0]?.values).toEqual(
      expect.arrayContaining([ESTIMATE_ALLOWED_ID, ESTIMATE_DENIED_ID, USER_ID]),
    );
    expect(database.queries.some((query) =>
      query.sql.includes("SELECT 1 AS allowed") && query.sql.includes("FROM estimates estimate")
    )).toBe(false);
  });

  it("filters favorite project card estimate sheets through the same batched estimate access", async () => {
    const database = new FakeWorkspaceRepositoryD1Database({
      estimateAccess: { [ESTIMATE_ALLOWED_ID]: "allow", [ESTIMATE_DENIED_ID]: "deny" },
      favoriteEstimateRows: [
        { estimate_id: ESTIMATE_ALLOWED_ID, project_id: PROJECT_ID, created_at: "2026-07-04T00:00:00.000Z" },
        { estimate_id: ESTIMATE_DENIED_ID, project_id: PROJECT_ID, created_at: "2026-07-05T00:00:00.000Z" },
      ],
      projectAccess: "allow",
    });
    const { listCurrentWorkspaceProjects } = await importWorkspaceRepository(database);

    const result = await listCurrentWorkspaceProjects();

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0]?.estimateSheets.map((sheet) => sheet.id)).toEqual([ESTIMATE_ALLOWED_ID]);
    expect(result.projects[0]?.favoriteEstimateSheets.map((sheet) => sheet.id)).toEqual([ESTIMATE_ALLOWED_ID]);
    const batchedAccessQueries = database.queries.filter((query) =>
      query.sql.includes("SELECT estimate.id") &&
      query.sql.includes("FROM estimates estimate") &&
      query.sql.includes("WHERE estimate.id IN")
    );
    expect(batchedAccessQueries).toHaveLength(1);
    expect(database.queries.some((query) =>
      query.sql.includes("SELECT 1 AS allowed") && query.sql.includes("FROM estimates estimate")
    )).toBe(false);
  });

  it("filters homebase favorite-project estimates before reading node metadata", async () => {
    const database = new FakeWorkspaceRepositoryD1Database({
      estimateAccess: { [ESTIMATE_ALLOWED_ID]: "allow", [ESTIMATE_DENIED_ID]: "deny" },
      projectAccess: "sheet-only",
      projectFavoriteRows: [{ project_id: PROJECT_ID, created_at: "2026-07-04T00:00:00.000Z" }],
      recentProjects: [],
    });
    const { getWorkshopHomebaseData } = await importWorkspaceRepository(database);

    const result = await getWorkshopHomebaseData();

    expect(result.estimates.map((estimate) => estimate.id)).toEqual([ESTIMATE_ALLOWED_ID]);
    const homebaseAccessQuery = database.queries.find((query) =>
      query.sql.includes("SELECT estimate.id") &&
      query.sql.includes("FROM estimates estimate") &&
      query.values.includes(ESTIMATE_ALLOWED_ID) &&
      query.values.includes(ESTIMATE_DENIED_ID)
    );
    expect(homebaseAccessQuery?.values).toEqual(expect.arrayContaining([ESTIMATE_ALLOWED_ID, ESTIMATE_DENIED_ID, USER_ID]));
    const nodeQuery = database.queries.find((query) => query.sql.includes("FROM estimate_nodes"));
    expect(nodeQuery?.values).toEqual([ESTIMATE_ALLOWED_ID]);
  });

  it("keeps inaccessible raw project favorites visible to the cleanup banner without fetching metadata", async () => {
    const database = new FakeWorkspaceRepositoryD1Database({
      projectAccess: "deny",
      projectFavoriteRows: [{ project_id: PROJECT_ID, created_at: "2026-07-04T00:00:00.000Z" }],
      recentProjects: [],
    });
    const { getWorkshopHomebaseData } = await importWorkspaceRepository(database);

    const result = await getWorkshopHomebaseData();

    expect(result.projects).toEqual([]);
    expect(result.estimates).toEqual([]);
    expect(result.removedProjectFavorites).toEqual([
      {
        id: PROJECT_ID,
        name: null,
        projectCode: null,
        favoriteCreatedAt: "2026-07-04T00:00:00.000Z",
      },
    ]);
    expect(database.queries.some((query) =>
      query.sql.includes("SELECT id, name, client_name") &&
      query.sql.includes("FROM projects") &&
      query.sql.includes("WHERE id IN") &&
      query.values.includes(PROJECT_ID)
    )).toBe(false);
    expect(database.queries.some((query) => query.sql.includes("FROM estimate_nodes"))).toBe(false);
  });
});
