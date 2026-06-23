import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const testMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  requireCurrentUserContext: vi.fn(),
  headers: vi.fn(),
  cookies: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: testMocks.createSupabaseServerClient,
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
};

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

function createWorkspaceBuilder(data: unknown) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: () => Promise.resolve({ data, error: null }),
  };
  return builder;
}

function createRpcSupabaseClient(payload: unknown) {
  return {
    from: vi.fn((table: string) => {
      if (table !== "workspaces") throw new Error(`Unexpected table read in RPC fast-path test: ${table}`);
      return createWorkspaceBuilder(WORKSPACE);
    }),
    rpc: vi.fn(async () => ({ data: payload, error: null })),
  };
}

function createQueryBuilder(data: unknown) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    order: () => builder,
    is: () => builder,
    gt: () => builder,
    limit: () => builder,
    maybeSingle: () => Promise.resolve({ data, error: null }),
    then: (
      onFulfilled: (value: { data: unknown; error: null }) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve({ data, error: null }).then(onFulfilled, onRejected),
  };
  return builder;
}

function createFallbackSupabaseClient() {
  const fromCallCounts = new Map<string, number>();
  const ownedProject = createProject({ id: "fallback-project", name: "Fallback Project" });
  const dataByTable: Record<string, unknown> = {
    workspaces: WORKSPACE,
    projects: [ownedProject],
    project_favorites: [],
    estimate_favorites: [],
    project_members: [],
    estimate_sheet_members: [],
    workspace_members: { role: "owner" },
    project_groups: [],
    project_group_memberships: [],
    project_publications: [],
    collaboration_invitations: [],
  };

  return {
    from: vi.fn((table: string) => {
      fromCallCounts.set(table, (fromCallCounts.get(table) ?? 0) + 1);
      return createQueryBuilder(dataByTable[table] ?? []);
    }),
    rpc: vi.fn((name: string) => {
      if (name === "workspace_projects_summary") {
        return Promise.resolve({ data: { ownedProjects: "not-an-array" }, error: null });
      }
      return createQueryBuilder([]);
    }),
    fromCallCounts,
  };
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
  const favoriteEstimates = Array.from({ length: 6 }, (_, index) => ({
    id: `estimate-${index + 1}`,
    project_id: "project-owned",
    name: `Estimate ${index + 1}`,
    sheet_code: `EST-${index + 1}`,
    updated_at: `2026-06-${String(index + 10).padStart(2, "0")}T00:00:00.000Z`,
  }));

  return {
    ownedProjects: [ownedProject],
    sharedProjects: [sharedProject],
    projectFavorites: [{ project_id: "project-owned" }],
    estimateFavorites: favoriteEstimates.map((estimate, index) => ({
      estimate_id: estimate.id,
      project_id: "project-owned",
      created_at: `2026-06-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
    })),
    favoriteEstimates,
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
  testMocks.createSupabaseServerClient.mockReset();
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

describe("workspace_projects_summary RPC contract", () => {
  it("keeps the migration payload keys in sync with the projects-page parser", () => {
    const migration = readFileSync(
      join(process.cwd(), "supabase/migrations/20260623023000_workspace_projects_summary.sql"),
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

  it("assembles the list output through the RPC fast path with app-path semantics", async () => {
    const rpcClient = createRpcSupabaseClient(createProjectsSummaryPayload());
    testMocks.createSupabaseServerClient.mockResolvedValue(rpcClient);

    const { listCurrentWorkspaceProjects } = await import("@/lib/repositories/workspace-repository");
    const result = await listCurrentWorkspaceProjects();

    expect(rpcClient.rpc).toHaveBeenCalledWith("workspace_projects_summary", {
      target_workspace_id: WORKSPACE.id,
    });
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

    const sharedProject = result.projects.find((item) => item.project.id === "project-shared");
    expect(sharedProject).toMatchObject({
      accessKind: "project-member",
      currentUserRole: "editor",
      pendingInviteCount: 0,
      sharedEstimateCount: 1,
      groupId: null,
    });

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

  it("falls back to the app path when the RPC payload shape drifts", async () => {
    const fallbackClient = createFallbackSupabaseClient();
    testMocks.createSupabaseServerClient.mockResolvedValue(fallbackClient);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const { listCurrentWorkspaceProjects } = await import("@/lib/repositories/workspace-repository");
      const result = await listCurrentWorkspaceProjects();

      expect(fallbackClient.rpc).toHaveBeenCalledWith("workspace_projects_summary", {
        target_workspace_id: WORKSPACE.id,
      });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("RPC returned an incompatible payload"));
      expect(fallbackClient.fromCallCounts.get("projects")).toBe(1);
      expect(result.projects.map((item) => item.project.id)).toEqual(["fallback-project"]);
    } finally {
      warnSpy.mockRestore();
    }
  });
});
