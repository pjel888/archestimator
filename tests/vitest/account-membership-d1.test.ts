import { beforeEach, describe, expect, it, vi } from "vitest";

const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/cloudflare/d1", () => d1Mocks);

type PreparedD1Statement = {
  sql: string;
  values: unknown[];
};

class FakeD1Statement {
  private values: unknown[] = [];

  constructor(
    private readonly database: FakeD1Database,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    this.database.prepared.push({ sql: this.sql, values });
    return this;
  }

  async first() {
    if (this.sql.includes("FROM workspace_members")) return this.database.workspaceMembership;
    if (this.sql.includes("FROM project_members")) return this.database.projectMembership;
    if (this.sql.includes("FROM estimate_sheet_members")) return this.database.estimateMembership;
    if (this.sql.includes("FROM projects")) return this.database.project;
    throw new Error(`Unexpected D1 first query: ${this.sql}`);
  }
}

class FakeD1Database {
  prepared: PreparedD1Statement[] = [];
  workspaceMembership: unknown = null;
  projectMembership: unknown = null;
  estimateMembership: unknown = null;
  project: unknown = null;

  prepare(sql: string) {
    return new FakeD1Statement(this, sql);
  }
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("account membership D1 lookup", () => {
  it("returns the first workspace membership before checking narrower memberships", async () => {
    const database = new FakeD1Database();
    database.workspaceMembership = { workspace_id: "workspace-1", role: "owner" };
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { readFirstAccountWorkspaceMembership } = await import("@/lib/auth/account-membership");
    await expect(readFirstAccountWorkspaceMembership("user-1")).resolves.toEqual({
      source: "workspace",
      workspaceId: "workspace-1",
      role: "owner",
    });

    expect(database.prepared).toHaveLength(1);
    expect(database.prepared[0].values).toEqual(["user-1"]);
  });

  it("falls back to project membership when no workspace membership exists", async () => {
    const database = new FakeD1Database();
    database.projectMembership = { workspace_id: "workspace-2", role: "editor" };
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { readFirstAccountWorkspaceMembership } = await import("@/lib/auth/account-membership");
    await expect(readFirstAccountWorkspaceMembership("user-1")).resolves.toEqual({
      source: "project",
      workspaceId: "workspace-2",
      role: "editor",
    });

    expect(database.prepared.map((entry) => entry.sql)).toEqual([
      expect.stringContaining("FROM workspace_members"),
      expect.stringContaining("FROM project_members"),
    ]);
  });

  it("only resolves memberships for workspaces with active linked corporate accounts", async () => {
    const database = new FakeD1Database();
    database.workspaceMembership = { workspace_id: "workspace-1", role: "owner" };
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { readFirstAccountWorkspaceMembership } = await import("@/lib/auth/account-membership");
    await expect(readFirstAccountWorkspaceMembership("user-1")).resolves.toEqual({
      source: "workspace",
      workspaceId: "workspace-1",
      role: "owner",
    });

    expect(database.prepared[0].sql).toContain("LEFT JOIN corporate_accounts corporate_account");
    expect(database.prepared[0].sql).toContain("workspace.corporate_account_id IS NULL OR corporate_account.status = 'active'");
  });

  it("resolves an estimate membership through the parent project workspace", async () => {
    const database = new FakeD1Database();
    database.estimateMembership = { project_id: "project-1", role: "viewer" };
    database.project = { workspace_id: "workspace-3" };
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { readFirstAccountWorkspaceMembership } = await import("@/lib/auth/account-membership");
    await expect(readFirstAccountWorkspaceMembership("user-1")).resolves.toEqual({
      source: "estimate",
      workspaceId: "workspace-3",
      role: "viewer",
    });

    expect(database.prepared.at(-1)?.values).toEqual(["project-1"]);
  });
});
