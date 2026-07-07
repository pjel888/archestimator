import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const testMocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
  requireCurrentUserContext: vi.fn(),
  headers: vi.fn(),
  cookies: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/cloudflare/d1", () => ({
  getCloudflareD1Database: testMocks.getCloudflareD1Database,
}));

vi.mock("@/lib/auth/session", () => ({
  requireCurrentUserContext: testMocks.requireCurrentUserContext,
}));

vi.mock("next/headers", () => ({
  headers: testMocks.headers,
  cookies: testMocks.cookies,
}));

const PROFILE = {
  id: "user-1",
  email: "user-1@example.com",
  role: "member",
  display_name: "User One",
  avatar_url: null,
  default_workspace_id: "workspace-1",
};

const WORKSPACE = {
  id: "workspace-1",
  name: "Workspace One",
  slug: null,
  created_by: "user-1",
  created_at: "2026-06-01T00:00:00.000Z",
  updated_at: "2026-06-01T00:00:00.000Z",
};

function extractSqlFunctionBlock(sql: string, functionName: string) {
  const pattern = new RegExp(`create(?:\\s+or\\s+replace)?\\s+function public\\.${functionName}\\([\\s\\S]*?\\n\\$\\$;`, "i");
  const match = sql.match(pattern);
  if (!match) throw new Error(`Could not find SQL function block for ${functionName}.`);
  return match[0];
}

function createProject(overrides: Record<string, unknown> = {}) {
  return {
    id: "project-owned",
    workspace_id: "workspace-1",
    created_by: "user-1",
    name: "Fast Project",
    client_name: "Client",
    location: null,
    project_code: "P-1",
    currency_code: "PHP",
    metadata: {},
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-02T00:00:00.000Z",
    ...overrides,
  };
}

type D1Value = string | number | boolean | null | ArrayBuffer;

type PreparedD1Statement = {
  sql: string;
  values: D1Value[];
};

class FakeWorkspaceProjectsD1Statement {
  private values: D1Value[] = [];

  constructor(
    private readonly database: FakeWorkspaceProjectsD1Database,
    private readonly sql: string,
  ) {}

  bind(...values: D1Value[]) {
    this.values = values;
    this.database.prepared.push({ sql: this.sql, values });
    return this;
  }

  async first<T>() {
    return this.database.first<T>(this.sql, this.values);
  }

  async all<T>() {
    return { results: this.database.all<T>(this.sql, this.values) };
  }

  async run() {
    return { success: true, meta: { changes: 0 } };
  }
}

class FakeWorkspaceProjectsD1Database {
  readonly prepared: PreparedD1Statement[] = [];
  readonly payload = createProjectsSummaryPayload();

  prepare(sql: string) {
    return new FakeWorkspaceProjectsD1Statement(this, sql);
  }

  first<T>(sql: string): T | null {
    if (sql.includes("SELECT 1 AS allowed") && sql.includes("FROM estimates estimate")) return { allowed: 1 } as T;
    if (sql.includes("FROM workspaces")) return WORKSPACE as T;
    if (sql.includes("FROM workspace_members")) return this.payload.workspaceMembership as T;
    if (sql.includes("FROM profiles")) return PROFILE as T;
    throw new Error(`Unexpected D1 first query: ${sql}`);
  }

  all<T>(sql: string, values: D1Value[]): T[] {
    if (sql.includes("FROM collaboration_invitations invitation")) {
      return this.payload.receivedPendingInvites as T[];
    }
    if (sql.includes("FROM collaboration_invitations") && sql.includes("WHERE project_id IN")) {
      const projectIds = new Set(values.slice(0, -1).filter((value): value is string => typeof value === "string"));
      return this.payload.sentInviteCounts.flatMap((row) =>
        projectIds.has(row.project_id)
          ? Array.from({ length: row.count }, () => ({ project_id: row.project_id }))
          : [],
      ) as T[];
    }
    if (sql.includes("FROM projects") && sql.includes("WHERE workspace_id = ?")) {
      return this.payload.ownedProjects as T[];
    }
    if (sql.includes("FROM projects") && sql.includes("WHERE id IN")) {
      return this.payload.sharedProjects as T[];
    }
    if (sql.includes("FROM project_favorites")) return this.payload.projectFavorites as T[];
    if (sql.includes("FROM estimate_favorites")) return this.payload.estimateFavorites as T[];
    if (sql.includes("FROM project_members")) return this.payload.projectMembers as T[];
    if (sql.includes("FROM estimate_sheet_members")) return this.payload.sheetMembers as T[];
    if (sql.includes("FROM project_groups")) return this.payload.projectGroups as T[];
    if (sql.includes("FROM project_group_memberships")) return this.payload.projectGroupMemberships as T[];
    if (sql.includes("FROM estimates") && sql.includes("WHERE project_id IN")) {
      return this.payload.estimateSheets as T[];
    }
    if (sql.includes("FROM estimates")) return this.payload.favoriteEstimates as T[];
    if (sql.includes("FROM project_publications")) return this.payload.publications as T[];
    throw new Error(`Unexpected D1 all query: ${sql}`);
  }
}

function createProjectsSummaryPayload() {
  const ownedProject = createProject({ id: "project-owned", name: "Owned Project" });
  const sharedProject = createProject({
    id: "project-shared",
    workspace_id: "workspace-other",
    created_by: "user-2",
    name: "Shared Project",
    project_code: "S-1",
  });
  const sheetOnlyProject = createProject({
    id: "project-sheet-only",
    workspace_id: "workspace-other",
    created_by: "user-2",
    name: "Sheet Only Project",
    project_code: "SO-1",
  });
  const favoriteEstimates = Array.from({ length: 6 }, (_, index) => ({
    id: `estimate-${index + 1}`,
    project_id: "project-owned",
    name: `Estimate ${index + 1}`,
    sheet_code: `EST-${index + 1}`,
    updated_at: `2026-06-${String(index + 10).padStart(2, "0")}T00:00:00.000Z`,
  }));
  const estimateSheets = [
    ...[...favoriteEstimates].reverse(),
    {
      id: "shared-estimate-2",
      project_id: "project-shared",
      name: "Shared Newer Estimate",
      sheet_code: "SH-2",
      updated_at: "2026-06-22T00:00:00.000Z",
    },
    {
      id: "shared-estimate-1",
      project_id: "project-shared",
      name: "Shared Older Estimate",
      sheet_code: "SH-1",
      updated_at: "2026-06-21T00:00:00.000Z",
    },
    {
      id: "sheet-member-estimate-1",
      project_id: "project-sheet-only",
      name: "Accessible Sheet",
      sheet_code: "SO-1",
      updated_at: "2026-06-24T00:00:00.000Z",
    },
    {
      id: "sheet-member-estimate-2",
      project_id: "project-sheet-only",
      name: "Hidden Sheet",
      sheet_code: "SO-2",
      updated_at: "2026-06-23T00:00:00.000Z",
    },
  ];

  return {
    ownedProjects: [ownedProject],
    sharedProjects: [sharedProject, sheetOnlyProject],
    projectFavorites: [{ project_id: "project-owned" }],
    estimateFavorites: favoriteEstimates.map((estimate, index) => ({
      estimate_id: estimate.id,
      project_id: "project-owned",
      created_at: `2026-06-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
    })),
    favoriteEstimates,
    estimateSheets,
    projectMembers: [
      {
        project_id: "project-shared",
        workspace_id: "workspace-other",
        role: "editor",
        user_id: PROFILE.id,
      },
    ],
    sheetMembers: [
      {
        estimate_id: "shared-estimate-1",
        project_id: "project-shared",
        role: "viewer",
        user_id: PROFILE.id,
      },
      {
        estimate_id: "sheet-member-estimate-1",
        project_id: "project-sheet-only",
        role: "viewer",
        user_id: PROFILE.id,
      },
    ],
    workspaceMembership: { role: "owner" },
    projectGroups: [
      { id: "group-early", name: "Early", accent_id: "amber", position: 1 },
      { id: "group-late", name: "Late", accent_id: "blue", position: 1 },
    ],
    projectGroupMemberships: [{ project_id: "project-owned", group_id: "group-early" }],
    publications: [
      {
        id: "publication-1",
        project_id: "project-owned",
        encrypted_token: "not-a-real-token",
        password_hash: "hash",
        status: "published",
        snapshot_version: 1,
        published_at: "2026-06-05T00:00:00.000Z",
        expires_at: null,
        revoked_at: null,
        open_count: 7,
        latest_opened_at: "2026-06-06T00:00:00.000Z",
        location_visibility: "hidden",
      },
    ],
    receivedPendingInvites: [
      {
        invitation_id: "invite-accepted",
        project_id: "project-owned",
        estimate_id: null,
        project_name: "Already Accepted",
        project_code: null,
        estimate_name: null,
        role: "viewer",
        scope: "project",
        inviter_label: "Owner",
        state: "pending",
        expires_at: "2026-07-01T00:00:00.000Z",
        last_opened_at: null,
      },
      {
        invitation_id: "invite-pending",
        project_id: "project-pending",
        estimate_id: null,
        project_name: "Pending Project",
        project_code: "PEND",
        estimate_name: null,
        role: "viewer",
        scope: "project",
        inviter_label: "Inviter",
        state: "pending",
        expires_at: "2026-07-02T00:00:00.000Z",
        last_opened_at: null,
      },
    ],
    sentInviteCounts: [
      { project_id: "project-owned", count: 3 },
      { project_id: "project-shared", count: 9 },
    ],
  };
}

beforeEach(() => {
  vi.resetModules();
  delete process.env.WORKSHOP_PROJECTS_SUMMARY_RPC_DISABLED;
  testMocks.getCloudflareD1Database.mockReset();
  testMocks.requireCurrentUserContext.mockReset().mockResolvedValue({
    userId: PROFILE.id,
    email: PROFILE.email,
    role: PROFILE.role,
    profile: PROFILE,
    displayName: PROFILE.display_name,
    avatarUrl: PROFILE.avatar_url,
  });
  testMocks.headers.mockReset().mockResolvedValue({ get: () => null });
  testMocks.cookies.mockReset().mockResolvedValue({ get: () => undefined });
});

describe("workspace projects page data contract", () => {
  it("keeps the migration payload keys in sync with the projects-page parser", () => {
    const migration = readFileSync(
      join(process.cwd(), "supabase/migrations/20260623023000_workspace_projects_summary.sql"),
      "utf8",
    );
    const fixForwardMigration = readFileSync(
      join(process.cwd(), "supabase/migrations/20260623163000_fix_workspace_projects_summary_pending_invites_readonly.sql"),
      "utf8",
    );

    expect(migration).toContain("create or replace function public.workspace_projects_summary");
    for (const key of [
      "ownedProjects",
      "sharedProjects",
      "projectFavorites",
      "estimateFavorites",
      "favoriteEstimates",
      "projectMembers",
      "sheetMembers",
      "workspaceMembership",
      "projectGroups",
      "projectGroupMemberships",
      "publications",
      "receivedPendingInvites",
      "sentInviteCounts",
    ]) {
      expect(migration).toContain(`'${key}'`);
    }
    expect(migration).toContain("order by pgr.position asc, pgr.created_at asc, pgr.id asc");

    const summaryPendingInviteHelper = extractSqlFunctionBlock(migration, "list_pending_collaboration_invitations");
    const fixForwardPendingInviteHelper = extractSqlFunctionBlock(fixForwardMigration, "list_pending_collaboration_invitations");
    for (const helperSql of [summaryPendingInviteHelper, fixForwardPendingInviteHelper]) {
      expect(helperSql).toContain("language sql");
      expect(helperSql).toContain("stable");
      expect(helperSql).toContain("security definer");
      expect(helperSql).not.toContain("materialize_expired_collaboration_invitations");
    }
  });

  it("parses the JSON payload shape used by the fast projects route", async () => {
    const { parseWorkshopProjectsSummaryPayload } = await import("@/lib/repositories/workspace-repository");
    const parsed = parseWorkshopProjectsSummaryPayload({
      ownedProjects: [
        {
          id: "project-1",
          workspace_id: "workspace-1",
          created_by: "user-1",
          name: "Fast Project",
          client_name: "Client",
          location: null,
          project_code: "P-1",
          currency_code: "PHP",
          metadata: {},
          created_at: "2026-06-01T00:00:00.000Z",
          updated_at: "2026-06-02T00:00:00.000Z",
        },
      ],
      sharedProjects: [],
      projectFavorites: [{ project_id: "project-1" }],
      estimateFavorites: [
        {
          estimate_id: "estimate-1",
          project_id: "project-1",
          created_at: "2026-06-03T00:00:00.000Z",
        },
      ],
      favoriteEstimates: [
        {
          id: "estimate-1",
          project_id: "project-1",
          name: "Estimate",
          sheet_code: "EST-1",
          updated_at: "2026-06-04T00:00:00.000Z",
        },
      ],
      projectMembers: [
        {
          project_id: "project-1",
          workspace_id: "workspace-1",
          role: "admin",
          user_id: "user-1",
        },
      ],
      sheetMembers: [],
      workspaceMembership: { role: "owner" },
      projectGroups: [{ id: "group-1", name: "Pinned", accent_id: "amber", position: 1 }],
      projectGroupMemberships: [{ project_id: "project-1", group_id: "group-1" }],
      publications: [
        {
          id: "publication-1",
          project_id: "project-1",
          encrypted_token: "token",
          password_hash: null,
          status: "published",
          snapshot_version: 1,
          published_at: "2026-06-05T00:00:00.000Z",
          expires_at: null,
          revoked_at: null,
          open_count: 2,
          latest_opened_at: "2026-06-06T00:00:00.000Z",
          location_visibility: "public",
        },
      ],
      receivedPendingInvites: [
        {
          invitation_id: "invite-1",
          project_id: "project-2",
          estimate_id: null,
          project_name: "Shared",
          project_code: null,
          estimate_name: null,
          role: "viewer",
          scope: "project",
          inviter_label: "Owner",
          state: "pending",
          expires_at: "2026-07-01T00:00:00.000Z",
          last_opened_at: null,
        },
      ],
      sentInviteCounts: [{ project_id: "project-1", count: 3 }],
    });

    expect(parsed.ownedProjects).toHaveLength(1);
    expect(parsed.projectGroups[0]).toEqual({
      id: "group-1",
      name: "Pinned",
      accentId: "amber",
      position: 1,
    });
    expect(parsed.receivedPendingInvites[0]?.projectId).toBe("project-2");
    expect(parsed.sentInviteCounts[0]?.count).toBe(3);
  });

  it("assembles the list output through the Cloudflare D1 app path", async () => {
    const database = new FakeWorkspaceProjectsD1Database();
    testMocks.getCloudflareD1Database.mockResolvedValue(database);

    const { listCurrentWorkspaceProjects } = await import("@/lib/repositories/workspace-repository");
    const result = await listCurrentWorkspaceProjects();

    expect(database.prepared.map((entry) => entry.sql)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("FROM workspaces"),
        expect.stringContaining("FROM projects"),
        expect.stringContaining("FROM project_favorites"),
        expect.stringContaining("FROM estimates"),
        expect.stringContaining("FROM collaboration_invitations"),
      ]),
    );
    expect(result.favoriteProjectIds).toEqual(["project-owned"]);
    expect(result.projectGroups.map((group) => group.id)).toEqual(["group-early", "group-late"]);

    const ownedProject = result.projects.find((item) => item.project.id === "project-owned");
    expect(ownedProject).toMatchObject({
      accessKind: "owned",
      currentUserRole: "owner",
      pendingInvite: null,
      pendingInviteCount: 3,
      groupId: "group-early",
    });
    expect(ownedProject?.project).not.toHaveProperty("workspace_id");
    expect(ownedProject?.publicationSummary).toEqual({
      status: "published",
      clientLinkPath: null,
      openCount: 7,
      latestOpenedAt: "2026-06-06T00:00:00.000Z",
      passwordRequired: true,
    });
    expect(ownedProject?.favoriteEstimateSheets.map((sheet) => sheet.id)).toEqual([
      "estimate-1",
      "estimate-2",
      "estimate-3",
      "estimate-4",
      "estimate-5",
    ]);
    expect(ownedProject?.estimateSheets.map((sheet) => sheet.id)).toEqual([
      "estimate-6",
      "estimate-5",
      "estimate-4",
      "estimate-3",
      "estimate-2",
      "estimate-1",
    ]);

    const sharedProject = result.projects.find((item) => item.project.id === "project-shared");
    expect(sharedProject).toMatchObject({
      accessKind: "project-member",
      currentUserRole: "editor",
      pendingInviteCount: 0,
      sharedEstimateCount: 1,
      groupId: null,
    });
    expect(sharedProject?.estimateSheets.map((sheet) => sheet.id)).toEqual([
      "shared-estimate-2",
      "shared-estimate-1",
    ]);

    const sheetOnlyProject = result.projects.find((item) => item.project.id === "project-sheet-only");
    expect(sheetOnlyProject).toMatchObject({
      accessKind: "sheet-member",
      currentUserRole: "viewer",
    });
    expect(sheetOnlyProject?.estimateSheets.map((sheet) => sheet.id)).toEqual([
      "sheet-member-estimate-1",
    ]);

    const pendingInvite = result.projects.find((item) => item.project.id === "project-pending");
    expect(pendingInvite).toMatchObject({
      accessKind: "pending-invite",
      currentUserRole: "viewer",
      ownerWorkspaceName: "Inviter",
      sharedEstimateCount: 0,
    });
    expect(pendingInvite?.pendingInvite?.id).toBe("invite-pending");
    expect(result.projects.some((item) => item.project.id === "project-owned" && item.pendingInvite?.id === "invite-accepted")).toBe(false);
  });

  it("fails closed when the Cloudflare D1 binding is unavailable", async () => {
    testMocks.getCloudflareD1Database.mockResolvedValue(null);

    const { listCurrentWorkspaceProjects } = await import("@/lib/repositories/workspace-repository");

    await expect(listCurrentWorkspaceProjects()).rejects.toThrow(
      "Cloudflare D1 binding ARCH_DB is required for workspace repository reads.",
    );
  });
});
