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

describe("auth onboarding workspace guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nextHeadersMocks.headers.mockResolvedValue(new Headers());
  });

  it("resolves every successful post-auth destination to the workshop homebase", async () => {
    const { resolvePostAuthDestination } = await import("@/lib/auth/account-setup");

    expect(resolvePostAuthDestination("/workshop/projects")).toBe("/workshop");
    expect(resolvePostAuthDestination("/pricing")).toBe("/workshop");
    expect(resolvePostAuthDestination("/workshop/onboarding?next=/workshop/projects")).toBe("/workshop");
    expect(resolvePostAuthDestination("https://evil.example")).toBe("/workshop");
    expect(nextNavigationMocks.redirect).not.toHaveBeenCalled();
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

    const { ensureDefaultWorkspace } = await import("@/lib/repositories/workspace-repository");
    await expect(ensureDefaultWorkspace()).resolves.toEqual({
      workspace,
      profile: { ...profile, default_workspace_id: workspace.id },
    });

    expect(queryOrder).toEqual([
      "workspace_members",
      "workspaces",
      "profiles",
    ]);
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

    const { ensureDefaultWorkspace } = await import("@/lib/repositories/workspace-repository");
    await expect(ensureDefaultWorkspace()).resolves.toEqual({
      workspace,
      profile: { ...profile, default_workspace_id: workspace.id },
    });

    expect(queryOrder).toEqual([
      "workspace_members",
      "project_members",
      "workspaces",
      "profiles",
    ]);
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

    const { ensureDefaultWorkspace } = await import("@/lib/repositories/workspace-repository");
    await expect(ensureDefaultWorkspace()).resolves.toEqual({
      workspace,
      profile: { ...profile, default_workspace_id: workspace.id },
    });

    expect(queryOrder).toEqual([
      "workspace_members",
      "project_members",
      "estimate_sheet_members",
      "projects",
      "workspaces",
      "profiles",
    ]);
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

    const { ensureDefaultWorkspace } = await import("@/lib/repositories/workspace-repository");
    await expect(ensureDefaultWorkspace()).rejects.toThrow(
      "Estimate membership workspace is unavailable. Contact support.",
    );

    expect(queryOrder).toEqual([
      "workspace_members",
      "project_members",
      "estimate_sheet_members",
      "projects",
    ]);
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

    const { ensureDefaultWorkspace } = await import("@/lib/repositories/workspace-repository");
    await expect(ensureDefaultWorkspace()).rejects.toThrow(
      "Workspace membership is unavailable. Contact support.",
    );

    expect(queryOrder).toEqual([
      "workspace_members",
      "workspaces",
    ]);
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

    const { ensureDefaultWorkspace } = await import("@/lib/repositories/workspace-repository");

    await expect(ensureDefaultWorkspace()).resolves.toEqual({
      workspace,
      profile: { ...profile, default_workspace_id: workspace.id },
    });
    expect(nextHeadersMocks.headers).not.toHaveBeenCalled();
    expect(queryOrder).toEqual([
      "workspace_members",
      "project_members",
      "estimate_sheet_members",
      "workspaces",
      "profiles",
    ]);
  });
});
