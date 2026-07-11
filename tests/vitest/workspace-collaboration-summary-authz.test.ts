import { beforeEach, describe, expect, it, vi } from "vitest";

const requireCurrentUserContext = vi.hoisted(() => vi.fn());
const getCloudflareD1Database = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({
  requireCurrentUserContext,
  getCurrentUserContext: requireCurrentUserContext,
}));
vi.mock("@/lib/cloudflare/d1", () => ({
  getCloudflareD1Database,
}));

const USER_ID = "11111111-1111-4111-8111-111111111111";
const PROJECT_ID = "22222222-2222-4222-8222-222222222222";
const DEFAULT_WORKSPACE_ID = "33333333-3333-4333-8333-333333333333";
const PROJECT_WORKSPACE_ID = "44444444-4444-4444-8444-444444444444";
const ACCESSIBLE_ESTIMATE_ID = "55555555-5555-4555-8555-555555555555";
const BLOCKED_ESTIMATE_ID = "66666666-6666-4666-8666-666666666666";
const WORKSPACE_OWNER_ID = "77777777-7777-4777-8777-777777777777";
const PROJECT_EDITOR_ID = "88888888-8888-4888-8888-888888888888";
const SHEET_COLLABORATOR_ID = "99999999-9999-4999-8999-999999999999";

class FakeD1Statement {
  private values: unknown[] = [];

  constructor(
    private readonly database: FakeD1Database,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  async first() {
    return this.database.first(this.sql, this.values);
  }

  async all() {
    return { results: this.database.all(this.sql, this.values) };
  }

  async run() {
    throw new Error(`Unexpected D1 write: ${this.sql}`);
  }
}

class FakeD1Database {
  canAccessWholeProject = false;

  prepare(sql: string) {
    return new FakeD1Statement(this, sql);
  }

  first(sql: string, values: unknown[]) {
    if (sql.includes("SELECT 1 AS allowed") && sql.includes("FROM projects project")) {
      return this.canAccessWholeProject ? { allowed: 1 } : null;
    }
    if (sql.includes("SELECT 1 AS allowed") && sql.includes("FROM estimates estimate")) {
      return values[0] === ACCESSIBLE_ESTIMATE_ID ? { allowed: 1 } : null;
    }
    if (sql.includes("FROM workspaces") && sql.includes("WHERE id = ?")) {
      if (values[0] === DEFAULT_WORKSPACE_ID) {
        return {
          id: DEFAULT_WORKSPACE_ID,
          created_by: USER_ID,
          name: "Personal workspace",
          slug: null,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        };
      }
      if (values[0] === PROJECT_WORKSPACE_ID) {
        return {
          id: PROJECT_WORKSPACE_ID,
          created_by: WORKSPACE_OWNER_ID,
          name: "Project workspace",
          slug: null,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        };
      }
    }
    if (sql.includes("FROM projects") && sql.includes("WHERE id = ?")) {
      return {
        id: PROJECT_ID,
        workspace_id: PROJECT_WORKSPACE_ID,
        created_by: WORKSPACE_OWNER_ID,
        name: "Shared project",
        client_name: null,
        location: null,
        project_code: "P-001",
        currency_code: "PHP",
        metadata: "{}",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };
    }
    return null;
  }

  all(sql: string, values: unknown[]) {
    if (sql.includes("SELECT estimate.id") && sql.includes("WHERE estimate.id IN")) {
      expect(values).toEqual([ACCESSIBLE_ESTIMATE_ID, BLOCKED_ESTIMATE_ID, USER_ID, USER_ID, USER_ID]);
      return [{ id: ACCESSIBLE_ESTIMATE_ID }];
    }
    if (sql.includes("FROM workspace_members") && sql.includes("WHERE workspace_id = ?")) {
      return [
        { workspace_id: PROJECT_WORKSPACE_ID, user_id: WORKSPACE_OWNER_ID, role: "owner" },
      ];
    }
    if (sql.includes("FROM estimates") && sql.includes("WHERE project_id = ?")) {
      return [
        {
          id: ACCESSIBLE_ESTIMATE_ID,
          project_id: PROJECT_ID,
          name: "Allowed sheet",
          sheet_code: "EST-001",
        },
        {
          id: BLOCKED_ESTIMATE_ID,
          project_id: PROJECT_ID,
          name: "Blocked sheet",
          sheet_code: "EST-002",
        },
      ];
    }
    if (sql.includes("FROM project_members") && sql.includes("WHERE project_id = ?")) {
      return [
        { project_id: PROJECT_ID, workspace_id: PROJECT_WORKSPACE_ID, user_id: PROJECT_EDITOR_ID, role: "editor" },
      ];
    }
    if (sql.includes("FROM estimate_sheet_members") && sql.includes("WHERE estimate_id IN")) {
      expect(values).toEqual([ACCESSIBLE_ESTIMATE_ID]);
      return [
        { estimate_id: ACCESSIBLE_ESTIMATE_ID, project_id: PROJECT_ID, user_id: USER_ID, role: "admin" },
        { estimate_id: ACCESSIBLE_ESTIMATE_ID, project_id: PROJECT_ID, user_id: SHEET_COLLABORATOR_ID, role: "viewer" },
      ];
    }
    if (sql.includes("FROM estimate_sheet_access_settings") && sql.includes("WHERE estimate_id IN")) {
      expect(values).toEqual([ACCESSIBLE_ESTIMATE_ID]);
      return [{ estimate_id: ACCESSIBLE_ESTIMATE_ID, inherit_project_access: 0 }];
    }
    if (sql.includes("FROM collaboration_invitations") && sql.includes("WHERE project_id = ?")) {
      return [
        {
          id: "project-invite",
          project_id: PROJECT_ID,
          email: "project@example.com",
          role: "viewer",
          scope: "project",
          estimate_id: null,
          expires_at: "2026-02-01T00:00:00Z",
        },
        {
          id: "allowed-estimate-invite",
          project_id: PROJECT_ID,
          email: "allowed@example.com",
          role: "viewer",
          scope: "estimate",
          estimate_id: ACCESSIBLE_ESTIMATE_ID,
          expires_at: "2026-02-01T00:00:00Z",
        },
        {
          id: "blocked-estimate-invite",
          project_id: PROJECT_ID,
          email: "blocked@example.com",
          role: "viewer",
          scope: "estimate",
          estimate_id: BLOCKED_ESTIMATE_ID,
          expires_at: "2026-02-01T00:00:00Z",
        },
      ];
    }
    if (sql.includes("FROM profiles") && sql.includes("WHERE id IN")) {
      return values.map((id) => ({
        id,
        display_name: `${id}`.slice(0, 8),
        email: `${id}@example.com`,
        avatar_url: null,
      }));
    }
    return [];
  }
}

describe("project collaboration summary D1 authorization", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireCurrentUserContext.mockResolvedValue({
      userId: USER_ID,
      email: "sheet-admin@example.com",
      role: "member",
      profile: {
        id: USER_ID,
        email: "sheet-admin@example.com",
        display_name: "Sheet Admin",
        avatar_url: null,
        role: "member",
        default_workspace_id: DEFAULT_WORKSPACE_ID,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    });
    getCloudflareD1Database.mockResolvedValue(new FakeD1Database());
  });

  it("limits sheet-only users to accessible sheet collaborators and estimate invitations", async () => {
    const { getProjectCollaborationSummary } = await import("@/lib/repositories/workspace-repository");

    const summary = await getProjectCollaborationSummary(PROJECT_ID);

    expect(summary).not.toBeNull();
    expect(summary?.collaborators.map((collaborator) => collaborator.id).sort()).toEqual(
      [SHEET_COLLABORATOR_ID, USER_ID].sort(),
    );
    expect(summary?.estimateSheets.map((sheet) => sheet.estimateId)).toEqual([ACCESSIBLE_ESTIMATE_ID]);
    expect(summary?.estimateSheets[0]?.canManageAccess).toBe(true);
    expect(summary?.canManageAccess).toBe(false);
    expect(summary?.pendingInvitations.map((invitation) => invitation.id)).toEqual(["allowed-estimate-invite"]);
    expect(summary?.collaborators.every((collaborator) => collaborator.online === false)).toBe(true);
    expect(summary?.estimateSheets[0]?.members.every((member) => member.online === false)).toBe(true);
  });
});
