import { beforeEach, describe, expect, it, vi } from "vitest";

const nextNavigationMocks = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

const nextHeadersMocks = vi.hoisted(() => ({
  headers: vi.fn(async () => new Headers()),
}));

const starterPackMocks = vi.hoisted(() => ({
  installStarterPackForEligibleWorkspace: vi.fn(async () => undefined),
  installStarterPackForNewWorkspace: vi.fn(async () => undefined),
}));

vi.mock("next/navigation", () => nextNavigationMocks);
vi.mock("next/headers", () => nextHeadersMocks);
vi.mock("@/lib/onboarding/starter-pack-actions", () => starterPackMocks);

type MockAccountWorkspaceMembership = {
  role: string | null;
  source: "workspace" | "project" | "estimate";
  workspaceId: string;
} | null;

function mockAccountWorkspaceMembership(membership: MockAccountWorkspaceMembership) {
  vi.doMock("@/lib/auth/account-membership", () => ({
    readFirstAccountWorkspaceMembership: vi.fn(async () => membership),
  }));
}

function mockAccountWorkspaceMembershipError(message: string) {
  vi.doMock("@/lib/auth/account-membership", () => ({
    readFirstAccountWorkspaceMembership: vi.fn(async () => {
      throw new Error(message);
    }),
  }));
}

type WorkspaceFixture = {
  id: string;
  name: string;
  slug: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type ProfileFixture = {
  id: string;
  email: string;
  display_name: string;
  role: string;
  default_workspace_id: string | null;
  created_at: string;
  updated_at: string;
};

function mockWorkspaceRepositoryD1({
  inserts,
  profile,
  queryOrder,
  updates,
  workspace,
}: {
  inserts?: Array<{ table: string; payload: unknown }>;
  profile: ProfileFixture;
  queryOrder?: string[];
  updates?: Array<{ table: string; payload: unknown }>;
  workspace?: WorkspaceFixture | null;
}) {
  let updatedDefaultWorkspaceId = profile.default_workspace_id;
  const database = {
    prepare: vi.fn((sql: string) => {
      const statement = {
        values: [] as unknown[],
        bind: vi.fn((...values: unknown[]) => {
          statement.values = values;
          return statement;
        }),
        first: vi.fn(async () => {
          if (sql.includes("FROM workspaces")) {
            queryOrder?.push("workspaces");
            return workspace ?? null;
          }
          if (sql.includes("FROM profiles")) {
            queryOrder?.push("profiles");
            return { ...profile, default_workspace_id: updatedDefaultWorkspaceId };
          }
          if (sql.includes("FROM workspace_members")) {
            queryOrder?.push("workspace_members");
            return null;
          }
          throw new Error(`Unexpected D1 first query in auth onboarding guard test: ${sql}`);
        }),
        all: vi.fn(async () => ({ results: [] })),
        run: vi.fn(async () => {
          if (sql.includes("INSERT INTO workspaces")) {
            inserts?.push({
              table: "workspaces",
              payload: {
                id: statement.values[0],
                name: statement.values[1],
                slug: statement.values[2],
                created_by: statement.values[3],
                created_at: statement.values[4],
                updated_at: statement.values[5],
              },
            });
          } else if (sql.includes("INSERT INTO workspace_members")) {
            inserts?.push({
              table: "workspace_members",
              payload: {
                workspace_id: statement.values[0],
                user_id: statement.values[1],
                role: statement.values[2],
                created_at: statement.values[3],
                updated_at: statement.values[4],
              },
            });
          } else if (sql.includes("UPDATE profiles")) {
            updatedDefaultWorkspaceId = String(statement.values[0]);
            updates?.push({
              table: "profiles",
              payload: { default_workspace_id: statement.values[0] },
            });
          } else {
            throw new Error(`Unexpected D1 run query in auth onboarding guard test: ${sql}`);
          }
          return { success: true, meta: { changes: 1 } };
        }),
      };
      return statement;
    }),
  };

  vi.doMock("@/lib/cloudflare/d1", () => ({
    getCloudflareD1Database: vi.fn(async () => database),
  }));

  return database;
}

describe("auth onboarding workspace guard", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    nextHeadersMocks.headers.mockResolvedValue(new Headers());
  });

  it("preserves protected post-auth destinations and rejects public or nested return paths", async () => {
    const { resolvePostAuthDestination } = await import("@/lib/auth/account-setup");

    expect(resolvePostAuthDestination("/workshop/projects")).toBe("/workshop/projects");
    expect(resolvePostAuthDestination("/pricing")).toBe("/workshop");
    expect(resolvePostAuthDestination("/workshop/onboarding?next=/workshop/projects")).toBe("/workshop");
    expect(resolvePostAuthDestination("https://evil.example")).toBe("/workshop");
    expect(nextNavigationMocks.redirect).not.toHaveBeenCalled();
  });

  it("preserves the invite bridge destination after successful auth", async () => {
    const { resolvePostAuthDestination } = await import("@/lib/auth/account-setup");

    expect(resolvePostAuthDestination("/workshop/pending-invite")).toBe("/workshop/pending-invite");
  });

  it("reuses an invited collaborator workspace before creating a fallback workspace", async () => {
    vi.resetModules();

    const inserts: Array<{ table: string; payload: unknown }> = [];
    const updates: Array<{ table: string; payload: unknown }> = [];
    const queryOrder: string[] = [];
    const profile = {
      id: "user-1",
      email: "invitee@example.com",
      display_name: "Invitee",
      role: "user",
      default_workspace_id: null,
      created_at: "2026-05-27T00:00:00.000Z",
      updated_at: "2026-05-27T00:00:00.000Z",
    };
    const workspace = {
      id: "workspace-1",
      name: "Invited workspace",
      slug: null,
      created_by: "owner-1",
      created_at: "2026-05-27T00:00:00.000Z",
      updated_at: "2026-05-27T00:00:00.000Z",
    };
    vi.doMock("@/lib/auth/session", () => ({
      requireCurrentUserContext: vi.fn(async () => ({
        userId: profile.id,
        email: profile.email,
        displayName: profile.display_name,
        profile,
      })),
    }));
    mockAccountWorkspaceMembership({
      source: "workspace",
      workspaceId: workspace.id,
      role: null,
    });
    mockWorkspaceRepositoryD1({
      inserts,
      profile: { ...profile, default_workspace_id: workspace.id },
      queryOrder,
      updates,
      workspace,
    });

    const { ensureDefaultWorkspace } = await import("@/lib/repositories/workspace-repository");
    await expect(ensureDefaultWorkspace()).resolves.toEqual({
      workspace,
      profile: { ...profile, default_workspace_id: workspace.id },
    });

    expect(queryOrder).toEqual(["workspaces", "profiles"]);
    expect(inserts).toEqual([]);
    expect(updates).toEqual([
      {
        table: "profiles",
        payload: { default_workspace_id: workspace.id },
      },
    ]);
    expect(starterPackMocks.installStarterPackForEligibleWorkspace).toHaveBeenCalledWith(
      expect.any(Object),
      { workspaceId: workspace.id, userId: profile.id },
    );
    expect(starterPackMocks.installStarterPackForNewWorkspace).not.toHaveBeenCalled();
  });

  it("reuses an invited project collaborator workspace before creating a fallback workspace", async () => {
    vi.resetModules();

    const inserts: Array<{ table: string; payload: unknown }> = [];
    const queryOrder: string[] = [];
    const profile = {
      id: "user-1",
      email: "invitee@example.com",
      display_name: "Invitee",
      role: "user",
      default_workspace_id: null,
      created_at: "2026-05-27T00:00:00.000Z",
      updated_at: "2026-05-27T00:00:00.000Z",
    };
    const workspace = {
      id: "workspace-1",
      name: "Project workspace",
      slug: null,
      created_by: "owner-1",
      created_at: "2026-05-27T00:00:00.000Z",
      updated_at: "2026-05-27T00:00:00.000Z",
    };
    vi.doMock("@/lib/auth/session", () => ({
      requireCurrentUserContext: vi.fn(async () => ({
        userId: profile.id,
        email: profile.email,
        displayName: profile.display_name,
        profile,
      })),
    }));
    mockAccountWorkspaceMembership({
      source: "project",
      workspaceId: workspace.id,
      role: "viewer",
    });
    mockWorkspaceRepositoryD1({
      inserts,
      profile: { ...profile, default_workspace_id: workspace.id },
      queryOrder,
      workspace,
    });

    const { ensureDefaultWorkspace } = await import("@/lib/repositories/workspace-repository");
    await expect(ensureDefaultWorkspace()).resolves.toEqual({
      workspace,
      profile: { ...profile, default_workspace_id: workspace.id },
    });

    expect(queryOrder).toEqual(["workspaces", "profiles"]);
    expect(inserts).toEqual([]);
    expect(starterPackMocks.installStarterPackForEligibleWorkspace).toHaveBeenCalledWith(
      expect.any(Object),
      { workspaceId: workspace.id, userId: profile.id },
    );
    expect(starterPackMocks.installStarterPackForNewWorkspace).not.toHaveBeenCalled();
  });

  it("reuses an invited estimate collaborator workspace before creating a fallback workspace", async () => {
    vi.resetModules();

    const inserts: Array<{ table: string; payload: unknown }> = [];
    const queryOrder: string[] = [];
    const profile = {
      id: "user-1",
      email: "invitee@example.com",
      display_name: "Invitee",
      role: "user",
      default_workspace_id: null,
      created_at: "2026-05-27T00:00:00.000Z",
      updated_at: "2026-05-27T00:00:00.000Z",
    };
    const workspace = {
      id: "workspace-1",
      name: "Estimate workspace",
      slug: null,
      created_by: "owner-1",
      created_at: "2026-05-27T00:00:00.000Z",
      updated_at: "2026-05-27T00:00:00.000Z",
    };
    vi.doMock("@/lib/auth/session", () => ({
      requireCurrentUserContext: vi.fn(async () => ({
        userId: profile.id,
        email: profile.email,
        displayName: profile.display_name,
        profile,
      })),
    }));
    mockAccountWorkspaceMembership({
      source: "estimate",
      workspaceId: workspace.id,
      role: "viewer",
    });
    mockWorkspaceRepositoryD1({
      inserts,
      profile: { ...profile, default_workspace_id: workspace.id },
      queryOrder,
      workspace,
    });

    const { ensureDefaultWorkspace } = await import("@/lib/repositories/workspace-repository");
    await expect(ensureDefaultWorkspace()).resolves.toEqual({
      workspace,
      profile: { ...profile, default_workspace_id: workspace.id },
    });

    expect(queryOrder).toEqual(["workspaces", "profiles"]);
    expect(inserts).toEqual([]);
    expect(starterPackMocks.installStarterPackForEligibleWorkspace).toHaveBeenCalledWith(
      expect.any(Object),
      { workspaceId: workspace.id, userId: profile.id },
    );
    expect(starterPackMocks.installStarterPackForNewWorkspace).not.toHaveBeenCalled();
  });

  it("does not create a fallback workspace when an estimate membership parent project is unavailable", async () => {
    vi.resetModules();

    const inserts: Array<{ table: string; payload: unknown }> = [];
    const queryOrder: string[] = [];
    const profile = {
      id: "user-1",
      email: "invitee@example.com",
      display_name: "Invitee",
      role: "user",
      default_workspace_id: null,
      created_at: "2026-05-27T00:00:00.000Z",
      updated_at: "2026-05-27T00:00:00.000Z",
    };
    vi.doMock("@/lib/auth/session", () => ({
      requireCurrentUserContext: vi.fn(async () => ({
        userId: profile.id,
        email: profile.email,
        displayName: profile.display_name,
        profile,
      })),
    }));
    mockAccountWorkspaceMembershipError(
      "Estimate membership workspace is unavailable. Contact support.",
    );
    mockWorkspaceRepositoryD1({ inserts, profile, queryOrder, workspace: null });

    const { ensureDefaultWorkspace } = await import("@/lib/repositories/workspace-repository");
    await expect(ensureDefaultWorkspace()).rejects.toThrow(
      "Estimate membership workspace is unavailable. Contact support.",
    );

    expect(queryOrder).toEqual([]);
    expect(inserts).toEqual([]);
  });

  it("does not create a fallback workspace when an invited membership workspace is unavailable", async () => {
    vi.resetModules();

    const inserts: Array<{ table: string; payload: unknown }> = [];
    const queryOrder: string[] = [];
    const profile = {
      id: "user-1",
      email: "invitee@example.com",
      display_name: "Invitee",
      role: "user",
      default_workspace_id: null,
      created_at: "2026-05-27T00:00:00.000Z",
      updated_at: "2026-05-27T00:00:00.000Z",
    };
    vi.doMock("@/lib/auth/session", () => ({
      requireCurrentUserContext: vi.fn(async () => ({
        userId: profile.id,
        email: profile.email,
        displayName: profile.display_name,
        profile,
      })),
    }));
    mockAccountWorkspaceMembership({
      source: "workspace",
      workspaceId: "workspace-1",
      role: null,
    });
    mockWorkspaceRepositoryD1({ inserts, profile, queryOrder, workspace: null });

    const { ensureDefaultWorkspace } = await import("@/lib/repositories/workspace-repository");
    await expect(ensureDefaultWorkspace()).rejects.toThrow(
      "Workspace membership is unavailable. Contact support.",
    );

    expect(queryOrder).toEqual(["workspaces"]);
    expect(inserts).toEqual([]);
  });

  it("creates a fallback workspace without reading request path onboarding state", async () => {
    vi.resetModules();
    nextHeadersMocks.headers.mockResolvedValue(
      new Headers({
        "x-archestimator-request-path": "/workshop/projects/project-1?tab=estimates",
      }),
    );

    const profile = {
      id: "user-1",
      email: "invitee@example.com",
      display_name: "Invitee",
      role: "user",
      default_workspace_id: null,
      created_at: "2026-05-27T00:00:00.000Z",
      updated_at: "2026-05-27T00:00:00.000Z",
    };
    const workspace = {
      id: "workspace-1",
      name: "My Archestimator Workspace",
      slug: null,
      created_by: profile.id,
      created_at: "2026-05-27T00:00:00.000Z",
      updated_at: "2026-05-27T00:00:00.000Z",
    };
    const inserts: Array<{ table: string; payload: unknown }> = [];
    const updates: Array<{ table: string; payload: unknown }> = [];
    const queryOrder: string[] = [];
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-27T00:00:00.000Z"));
    vi.doMock("@/lib/auth/session", () => ({
      requireCurrentUserContext: vi.fn(async () => ({
        userId: profile.id,
        email: profile.email,
        displayName: profile.display_name,
        profile,
      })),
    }));
    mockAccountWorkspaceMembership(null);
    mockWorkspaceRepositoryD1({
      inserts,
      profile: { ...profile, default_workspace_id: workspace.id },
      queryOrder,
      updates,
      workspace,
    });

    const { ensureDefaultWorkspace } = await import("@/lib/repositories/workspace-repository");

    const result = await ensureDefaultWorkspace();
    expect(result.workspace).toEqual({
      ...workspace,
      closed_at: null,
      id: expect.any(String),
    });
    expect(result.profile).toEqual({
      ...profile,
      default_workspace_id: result.workspace.id,
    });
    expect(nextHeadersMocks.headers).not.toHaveBeenCalled();
    expect(queryOrder).toEqual(["profiles"]);
    expect(inserts).toEqual([
      {
        table: "workspaces",
        payload: { ...workspace, id: result.workspace.id },
      },
      {
        table: "workspace_members",
        payload: {
          workspace_id: result.workspace.id,
          user_id: profile.id,
          role: "owner",
          created_at: "2026-05-27T00:00:00.000Z",
          updated_at: "2026-05-27T00:00:00.000Z",
        },
      },
    ]);
    expect(updates).toEqual([
      {
        table: "profiles",
        payload: { default_workspace_id: result.workspace.id },
      },
    ]);
    expect(starterPackMocks.installStarterPackForNewWorkspace).toHaveBeenCalledWith(
      expect.any(Object),
      { workspaceId: result.workspace.id, userId: profile.id },
    );
    expect(starterPackMocks.installStarterPackForEligibleWorkspace).not.toHaveBeenCalled();
  });

  it("denies forged cross-workspace account-actions workspace settings updates before writing", async () => {
    vi.resetModules();

    const queries: Array<{ sql: string; values: unknown[]; method: "first" | "run" }> = [];
    const profile = {
      id: "user-1",
      email: "member@example.com",
      display_name: "Member",
      role: "user",
      default_workspace_id: "workspace-1",
      created_at: "2026-05-27T00:00:00.000Z",
      updated_at: "2026-05-27T00:00:00.000Z",
    };
    const database = {
      prepare: vi.fn((sql: string) => {
        const statement = {
          values: [] as unknown[],
          bind: vi.fn((...values: unknown[]) => {
            statement.values = values;
            return statement;
          }),
          first: vi.fn(async () => {
            queries.push({ sql, values: statement.values, method: "first" });
            return null;
          }),
          all: vi.fn(async () => ({ results: [] })),
          run: vi.fn(async () => {
            queries.push({ sql, values: statement.values, method: "run" });
            return { success: true, meta: { changes: 1 } };
          }),
        };
        return statement;
      }),
    };

    const currentUserContext = {
      userId: profile.id,
      email: profile.email,
      displayName: profile.display_name,
      profile,
    };
    vi.doMock("@/lib/auth/session", () => ({
      requireCurrentUserContext: vi.fn(async () => currentUserContext),
      requireWorkshopWriteContext: vi.fn(async () => currentUserContext),
    }));
    vi.doMock("@/lib/cloudflare/d1", () => ({
      getCloudflareD1Database: vi.fn(async () => database),
    }));

    const formData = new FormData();
    formData.set("workspace_id", "workspace-2");
    formData.set("organization_name", "Forged Workspace Ltd");
    formData.set("organization_type", "architecture_design");
    formData.set("country_region", "PH");
    formData.set("company_size", "2_10");
    formData.set("default_currency", "PHP");
    formData.set("primary_use", "project_estimating");
    const { updateWorkspaceSettings } = await import("@/lib/auth/account-actions");

    await expect(updateWorkspaceSettings(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/workshop/settings/workspace?error=forbidden",
    );

    expect(queries).toEqual([
      {
        sql: expect.stringContaining("FROM workspace_members"),
        values: ["workspace-2", "user-1"],
        method: "first",
      },
    ]);
  });
});
