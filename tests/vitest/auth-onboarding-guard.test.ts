import { beforeEach, describe, expect, it, vi } from "vitest";

const nextNavigationMocks = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

const nextHeadersMocks = vi.hoisted(() => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("next/navigation", () => nextNavigationMocks);
vi.mock("next/headers", () => nextHeadersMocks);

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

describe("auth onboarding workspace guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nextHeadersMocks.headers.mockResolvedValue(new Headers());
  });

  it("resolves ordinary successful post-auth destinations to the workshop homebase", async () => {
    const { resolvePostAuthDestination } = await import("@/lib/auth/account-setup");

    expect(resolvePostAuthDestination("/workshop/projects")).toBe("/workshop");
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
    const supabase = {
      from: vi.fn((table: string) => {
        queryOrder.push(table);
        const query = {
          select: vi.fn(() => query),
          eq: vi.fn(() => query),
          order: vi.fn(() => query),
          limit: vi.fn(() => query),
          update: vi.fn((payload: unknown) => {
            updates.push({ table, payload });
            return query;
          }),
          insert: vi.fn((payload: unknown) => {
            inserts.push({ table, payload });
            return query;
          }),
          maybeSingle: vi.fn(async () => {
            if (table === "user_onboarding_profiles") {
              return {
                data: { onboarding_completed_at: "2026-05-27T00:00:00.000Z" },
                error: null,
              };
            }
            if (table === "workspace_members") {
              return { data: { workspace_id: workspace.id }, error: null };
            }
            if (table === "workspaces") return { data: workspace, error: null };
            return { data: null, error: null };
          }),
          single: vi.fn(async () => ({
            data: { ...profile, default_workspace_id: workspace.id },
            error: null,
          })),
        };
        return query;
      }),
    };

    vi.doMock("@/lib/auth/session", () => ({
      requireCurrentUserContext: vi.fn(async () => ({
        userId: profile.id,
        email: profile.email,
        displayName: profile.display_name,
        profile,
      })),
    }));
    vi.doMock("@/lib/supabase/server", () => ({
      createSupabaseServerClient: vi.fn(async () => supabase),
    }));
    mockAccountWorkspaceMembership({
      source: "workspace",
      workspaceId: workspace.id,
      role: null,
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
    const supabase = {
      from: vi.fn((table: string) => {
        queryOrder.push(table);
        const query = {
          select: vi.fn(() => query),
          eq: vi.fn(() => query),
          order: vi.fn(() => query),
          limit: vi.fn(() => query),
          update: vi.fn(() => query),
          insert: vi.fn((payload: unknown) => {
            inserts.push({ table, payload });
            return query;
          }),
          maybeSingle: vi.fn(async () => {
            if (table === "user_onboarding_profiles") {
              return {
                data: { onboarding_completed_at: "2026-05-27T00:00:00.000Z" },
                error: null,
              };
            }
            if (table === "workspace_members") return { data: null, error: null };
            if (table === "project_members") {
              return { data: { workspace_id: workspace.id, role: "viewer" }, error: null };
            }
            if (table === "workspaces") return { data: workspace, error: null };
            return { data: null, error: null };
          }),
          single: vi.fn(async () => ({
            data: { ...profile, default_workspace_id: workspace.id },
            error: null,
          })),
        };
        return query;
      }),
    };

    vi.doMock("@/lib/auth/session", () => ({
      requireCurrentUserContext: vi.fn(async () => ({
        userId: profile.id,
        email: profile.email,
        displayName: profile.display_name,
        profile,
      })),
    }));
    vi.doMock("@/lib/supabase/server", () => ({
      createSupabaseServerClient: vi.fn(async () => supabase),
    }));
    mockAccountWorkspaceMembership({
      source: "project",
      workspaceId: workspace.id,
      role: "viewer",
    });

    const { ensureDefaultWorkspace } = await import("@/lib/repositories/workspace-repository");
    await expect(ensureDefaultWorkspace()).resolves.toEqual({
      workspace,
      profile: { ...profile, default_workspace_id: workspace.id },
    });

    expect(queryOrder).toEqual(["workspaces", "profiles"]);
    expect(inserts).toEqual([]);
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
    const supabase = {
      from: vi.fn((table: string) => {
        queryOrder.push(table);
        const query = {
          select: vi.fn(() => query),
          eq: vi.fn(() => query),
          order: vi.fn(() => query),
          limit: vi.fn(() => query),
          update: vi.fn(() => query),
          insert: vi.fn((payload: unknown) => {
            inserts.push({ table, payload });
            return query;
          }),
          maybeSingle: vi.fn(async () => {
            if (table === "user_onboarding_profiles") {
              return {
                data: { onboarding_completed_at: "2026-05-27T00:00:00.000Z" },
                error: null,
              };
            }
            if (table === "workspace_members") return { data: null, error: null };
            if (table === "project_members") return { data: null, error: null };
            if (table === "estimate_sheet_members") {
              return { data: { project_id: "project-1", role: "viewer" }, error: null };
            }
            if (table === "projects") return { data: { workspace_id: workspace.id }, error: null };
            if (table === "workspaces") return { data: workspace, error: null };
            return { data: null, error: null };
          }),
          single: vi.fn(async () => ({
            data: { ...profile, default_workspace_id: workspace.id },
            error: null,
          })),
        };
        return query;
      }),
    };

    vi.doMock("@/lib/auth/session", () => ({
      requireCurrentUserContext: vi.fn(async () => ({
        userId: profile.id,
        email: profile.email,
        displayName: profile.display_name,
        profile,
      })),
    }));
    vi.doMock("@/lib/supabase/server", () => ({
      createSupabaseServerClient: vi.fn(async () => supabase),
    }));
    mockAccountWorkspaceMembership({
      source: "estimate",
      workspaceId: workspace.id,
      role: "viewer",
    });

    const { ensureDefaultWorkspace } = await import("@/lib/repositories/workspace-repository");
    await expect(ensureDefaultWorkspace()).resolves.toEqual({
      workspace,
      profile: { ...profile, default_workspace_id: workspace.id },
    });

    expect(queryOrder).toEqual(["workspaces", "profiles"]);
    expect(inserts).toEqual([]);
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
    const supabase = {
      from: vi.fn((table: string) => {
        queryOrder.push(table);
        const query = {
          select: vi.fn(() => query),
          eq: vi.fn(() => query),
          order: vi.fn(() => query),
          limit: vi.fn(() => query),
          update: vi.fn(() => query),
          insert: vi.fn((payload: unknown) => {
            inserts.push({ table, payload });
            return query;
          }),
          maybeSingle: vi.fn(async () => {
            if (table === "user_onboarding_profiles") {
              return {
                data: { onboarding_completed_at: "2026-05-27T00:00:00.000Z" },
                error: null,
              };
            }
            if (table === "workspace_members") return { data: null, error: null };
            if (table === "project_members") return { data: null, error: null };
            if (table === "estimate_sheet_members") {
              return { data: { project_id: "project-1", role: "viewer" }, error: null };
            }
            if (table === "projects") return { data: null, error: null };
            return { data: null, error: null };
          }),
        };
        return query;
      }),
    };

    vi.doMock("@/lib/auth/session", () => ({
      requireCurrentUserContext: vi.fn(async () => ({
        userId: profile.id,
        email: profile.email,
        displayName: profile.display_name,
        profile,
      })),
    }));
    vi.doMock("@/lib/supabase/server", () => ({
      createSupabaseServerClient: vi.fn(async () => supabase),
    }));
    mockAccountWorkspaceMembershipError(
      "Estimate membership workspace is unavailable. Contact support.",
    );

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
    const supabase = {
      from: vi.fn((table: string) => {
        queryOrder.push(table);
        const query = {
          select: vi.fn(() => query),
          eq: vi.fn(() => query),
          order: vi.fn(() => query),
          limit: vi.fn(() => query),
          update: vi.fn(() => query),
          insert: vi.fn((payload: unknown) => {
            inserts.push({ table, payload });
            return query;
          }),
          maybeSingle: vi.fn(async () => {
            if (table === "user_onboarding_profiles") {
              return {
                data: { onboarding_completed_at: "2026-05-27T00:00:00.000Z" },
                error: null,
              };
            }
            if (table === "workspace_members") {
              return { data: { workspace_id: "workspace-1" }, error: null };
            }
            if (table === "workspaces") return { data: null, error: null };
            return { data: null, error: null };
          }),
        };
        return query;
      }),
    };

    vi.doMock("@/lib/auth/session", () => ({
      requireCurrentUserContext: vi.fn(async () => ({
        userId: profile.id,
        email: profile.email,
        displayName: profile.display_name,
        profile,
      })),
    }));
    vi.doMock("@/lib/supabase/server", () => ({
      createSupabaseServerClient: vi.fn(async () => supabase),
    }));
    mockAccountWorkspaceMembership({
      source: "workspace",
      workspaceId: "workspace-1",
      role: null,
    });

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
    const queryOrder: string[] = [];
    const supabase = {
      from: vi.fn((table: string) => {
        queryOrder.push(table);
        const query = {
          select: vi.fn(() => query),
          eq: vi.fn(() => query),
          order: vi.fn(() => query),
          limit: vi.fn(() => query),
          update: vi.fn(() => query),
          insert: vi.fn(() => query),
          maybeSingle: vi.fn(async () => ({ data: null, error: null })),
          single: vi.fn(async () => {
            if (table === "workspaces") return { data: workspace, error: null };
            return {
              data: { ...profile, default_workspace_id: workspace.id },
              error: null,
            };
          }),
        };
        return query;
      }),
    };

    vi.doMock("@/lib/auth/session", () => ({
      requireCurrentUserContext: vi.fn(async () => ({
        userId: profile.id,
        email: profile.email,
        displayName: profile.display_name,
        profile,
      })),
    }));
    vi.doMock("@/lib/supabase/server", () => ({
      createSupabaseServerClient: vi.fn(async () => supabase),
    }));
    mockAccountWorkspaceMembership(null);

    const { ensureDefaultWorkspace } = await import("@/lib/repositories/workspace-repository");

    await expect(ensureDefaultWorkspace()).resolves.toEqual({
      workspace,
      profile: { ...profile, default_workspace_id: workspace.id },
    });
    expect(nextHeadersMocks.headers).not.toHaveBeenCalled();
    expect(queryOrder).toEqual(["workspaces", "profiles"]);
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

    vi.doMock("@/lib/auth/session", () => ({
      requireCurrentUserContext: vi.fn(async () => ({
        userId: profile.id,
        email: profile.email,
        displayName: profile.display_name,
        profile,
      })),
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
