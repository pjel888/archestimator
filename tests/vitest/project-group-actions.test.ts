import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";

const workspaceMocks = vi.hoisted(() => ({
  ensureDefaultWorkspace: vi.fn(),
}));

const supabaseMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}));

const nextCacheMocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/repositories/workspace-repository", () => ({
  ensureDefaultWorkspace: workspaceMocks.ensureDefaultWorkspace,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: supabaseMocks.createSupabaseServerClient,
}));

vi.mock("next/cache", () => ({
  revalidatePath: nextCacheMocks.revalidatePath,
}));

const WORKSPACE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const GROUP_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const GROUP_ID_2 = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const PROJECT_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const PROJECT_ID_2 = "ffffffff-ffff-4fff-8fff-ffffffffffff";

type StubResult = { data: unknown; error: unknown; count?: number | null };

/**
 * One programmable result per `from(table)` access, consumed in queue order so a
 * single action that hits the same table twice (e.g. verify then mutate) can be
 * scripted. A recorded log captures the terminal operation + payload for asserts.
 */
function makeSupabaseStub() {
  const queue: Record<string, StubResult[]> = {};
  const calls: Array<{ table: string; op: string; payload?: unknown; options?: unknown }> = [];

  function nextResult(table: string): StubResult {
    const pending = queue[table];
    if (pending && pending.length > 0) return pending.shift() as StubResult;
    return { data: null, error: null, count: 0 };
  }

  function builderFor(table: string) {
    let result: StubResult = { data: null, error: null, count: 0 };
    let resolved = false;
    const ensure = () => {
      if (!resolved) {
        result = nextResult(table);
        resolved = true;
      }
      return result;
    };
    const builder: Record<string, unknown> = {};
    const chain = () => builder;
    for (const method of ["select", "eq", "in", "order", "limit"]) {
      builder[method] = (..._args: unknown[]) => builder;
    }
    builder.insert = (payload: unknown) => {
      calls.push({ table, op: "insert", payload });
      return builder;
    };
    builder.update = (payload: unknown) => {
      calls.push({ table, op: "update", payload });
      return builder;
    };
    builder.delete = () => {
      calls.push({ table, op: "delete" });
      return builder;
    };
    builder.upsert = (payload: unknown, options?: unknown) => {
      calls.push({ table, op: "upsert", payload, options });
      return builder;
    };
    builder.single = async () => ensure();
    builder.maybeSingle = async () => ensure();
    builder.then = (resolve: (value: StubResult) => unknown) => resolve(ensure());
    void chain;
    return builder;
  }

  return {
    client: { from: (table: string) => builderFor(table) },
    queueResult(table: string, result: StubResult) {
      (queue[table] ??= []).push(result);
    },
    calls,
  };
}

beforeEach(() => {
  workspaceMocks.ensureDefaultWorkspace.mockResolvedValue({
    workspace: { id: WORKSPACE_ID },
    profile: { id: USER_ID },
  });
  supabaseMocks.createSupabaseServerClient.mockReset();
  nextCacheMocks.revalidatePath.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("project group actions module", () => {
  it("exposes the seven group server actions", async () => {
    const mod = await import("@/lib/workshop/group-actions");
    expect(typeof mod.createProjectGroup).toBe("function");
    expect(typeof mod.renameProjectGroup).toBe("function");
    expect(typeof mod.recolorProjectGroup).toBe("function");
    expect(typeof mod.deleteProjectGroup).toBe("function");
    expect(typeof mod.reorderProjectGroups).toBe("function");
    expect(typeof mod.moveProjectToGroup).toBe("function");
    expect(typeof mod.bulkAssignProjectsToGroup).toBe("function");
  });
});

describe("createProjectGroup", () => {
  it("rejects an empty name without touching the database", async () => {
    const stub = makeSupabaseStub();
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { createProjectGroup, ProjectGroupNameError } = await import("@/lib/workshop/group-actions");

    await expect(createProjectGroup({ name: "   " })).rejects.toBeInstanceOf(ProjectGroupNameError);
    expect(stub.calls).toEqual([]);
    expect(nextCacheMocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects a name longer than 40 characters", async () => {
    const stub = makeSupabaseStub();
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { createProjectGroup, ProjectGroupNameError } = await import("@/lib/workshop/group-actions");

    await expect(createProjectGroup({ name: "x".repeat(41) })).rejects.toBeInstanceOf(ProjectGroupNameError);
    expect(stub.calls).toEqual([]);
  });

  it("rejects creation when the user is already at the 50-group cap", async () => {
    const stub = makeSupabaseStub();
    // First read = count of existing groups for (user, workspace) returns 50.
    stub.queueResult("project_groups", { data: [], error: null, count: 50 });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { createProjectGroup, ProjectGroupCapError } = await import("@/lib/workshop/group-actions");

    await expect(createProjectGroup({ name: "Pipeline" })).rejects.toBeInstanceOf(ProjectGroupCapError);
    // No insert happened.
    expect(stub.calls.some((c) => c.op === "insert")).toBe(false);
  });

  it("trims the name, appends at position max+1, validates accent, and returns the new id", async () => {
    const stub = makeSupabaseStub();
    // 1) cap count read (3 existing groups)
    stub.queueResult("project_groups", { data: [], error: null, count: 3 });
    // 2) max(position) read returns the highest existing position (4) via .maybeSingle()
    stub.queueResult("project_groups", { data: { position: 4 }, error: null });
    // 3) insert ... select("id").single()
    stub.queueResult("project_groups", { data: { id: GROUP_ID }, error: null });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { createProjectGroup } = await import("@/lib/workshop/group-actions");

    const result = await createProjectGroup({ name: "  Pipeline  ", accentId: "teal" });

    expect(result).toEqual({ id: GROUP_ID });
    const insert = stub.calls.find((c) => c.op === "insert");
    expect(insert?.payload).toEqual({
      workspace_id: WORKSPACE_ID,
      user_id: USER_ID,
      name: "Pipeline",
      accent_id: "teal",
      position: 5,
    });
    expect(nextCacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop");
    expect(nextCacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop/projects");
  });

  it("defaults position to 0 when the user has no groups yet", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("project_groups", { data: [], error: null, count: 0 }); // cap
    stub.queueResult("project_groups", { data: null, error: null }); // max position: none
    stub.queueResult("project_groups", { data: { id: GROUP_ID }, error: null }); // insert
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { createProjectGroup } = await import("@/lib/workshop/group-actions");

    await createProjectGroup({ name: "First", accentId: null });

    const insert = stub.calls.find((c) => c.op === "insert");
    expect((insert?.payload as { position: number }).position).toBe(0);
    expect((insert?.payload as { accent_id: string | null }).accent_id).toBeNull();
  });

  it("rejects an unknown accent token", async () => {
    const stub = makeSupabaseStub();
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { createProjectGroup } = await import("@/lib/workshop/group-actions");

    await expect(createProjectGroup({ name: "Pipeline", accentId: "neon" })).rejects.toThrow(/accent/i);
    expect(stub.calls.some((c) => c.op === "insert")).toBe(false);
  });

  it("translates a duplicate-name unique violation (23505) into a name error", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("project_groups", { data: [], error: null, count: 1 }); // cap
    stub.queueResult("project_groups", { data: { position: 0 }, error: null }); // max position
    // The duplicate-name index raises 23505 with the name-index constraint, which
    // isDuplicateNameViolation() matches by name (LD-8).
    stub.queueResult("project_groups", {
      data: null,
      error: { code: "23505", constraint: "project_groups_user_workspace_lower_name_idx", message: "duplicate key" },
    }); // insert
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { createProjectGroup, ProjectGroupNameError } = await import("@/lib/workshop/group-actions");

    await expect(createProjectGroup({ name: "Pipeline" })).rejects.toBeInstanceOf(ProjectGroupNameError);
  });
});

describe("renameProjectGroup", () => {
  it("rejects a non-uuid group id", async () => {
    const stub = makeSupabaseStub();
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { renameProjectGroup } = await import("@/lib/workshop/group-actions");

    await expect(renameProjectGroup({ groupId: "nope", name: "X" })).rejects.toThrow(/invalid/i);
    expect(stub.calls).toEqual([]);
  });

  it("rejects an empty trimmed name", async () => {
    const stub = makeSupabaseStub();
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { renameProjectGroup, ProjectGroupNameError } = await import("@/lib/workshop/group-actions");

    await expect(renameProjectGroup({ groupId: GROUP_ID, name: "  " })).rejects.toBeInstanceOf(
      ProjectGroupNameError,
    );
    expect(stub.calls.some((c) => c.op === "update")).toBe(false);
  });

  it("updates the trimmed name scoped to the owning user + workspace", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("project_groups", { data: null, error: null }); // update resolves ok
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { renameProjectGroup } = await import("@/lib/workshop/group-actions");

    await renameProjectGroup({ groupId: GROUP_ID, name: "  Renamed  " });

    const update = stub.calls.find((c) => c.op === "update");
    expect(update?.table).toBe("project_groups");
    expect((update?.payload as { name: string }).name).toBe("Renamed");
    expect((update?.payload as { updated_at?: string }).updated_at).toEqual(expect.any(String));
    expect(nextCacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop");
  });

  it("translates a duplicate name (23505 from the name index) into a name error", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("project_groups", {
      data: null,
      error: { code: "23505", constraint: "project_groups_user_workspace_lower_name_idx", message: "dup name" },
    });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { renameProjectGroup, ProjectGroupNameError } = await import("@/lib/workshop/group-actions");

    await expect(renameProjectGroup({ groupId: GROUP_ID, name: "Taken" })).rejects.toBeInstanceOf(
      ProjectGroupNameError,
    );
  });
});

describe("recolorProjectGroup", () => {
  it("rejects a non-uuid group id", async () => {
    const stub = makeSupabaseStub();
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { recolorProjectGroup } = await import("@/lib/workshop/group-actions");

    await expect(recolorProjectGroup({ groupId: "x", accentId: "teal" })).rejects.toThrow(/invalid/i);
    expect(stub.calls).toEqual([]);
  });

  it("rejects an unknown accent token before any write", async () => {
    const stub = makeSupabaseStub();
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { recolorProjectGroup } = await import("@/lib/workshop/group-actions");

    await expect(recolorProjectGroup({ groupId: GROUP_ID, accentId: "chartreuse" })).rejects.toThrow(
      /accent/i,
    );
    expect(stub.calls.some((c) => c.op === "update")).toBe(false);
  });

  it("persists a valid accent token", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("project_groups", { data: null, error: null });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { recolorProjectGroup } = await import("@/lib/workshop/group-actions");

    await recolorProjectGroup({ groupId: GROUP_ID, accentId: "plum" });

    const update = stub.calls.find((c) => c.op === "update");
    expect((update?.payload as { accent_id: string | null }).accent_id).toBe("plum");
    expect(nextCacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop/projects");
  });

  it("clears the accent to the default swatch when accentId is null", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("project_groups", { data: null, error: null });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { recolorProjectGroup } = await import("@/lib/workshop/group-actions");

    await recolorProjectGroup({ groupId: GROUP_ID, accentId: null });

    const update = stub.calls.find((c) => c.op === "update");
    expect((update?.payload as { accent_id: string | null }).accent_id).toBeNull();
  });
});

describe("accent token contract", () => {
  it("keeps the action accent allowlist in sync with group-accent.ts when it exists", () => {
    const actionsSrc = readFileSync("src/lib/workshop/group-actions.ts", "utf8");
    const actionTokens = new Set(
      [...actionsSrc.matchAll(/"(slate|stone|sage|teal|indigo|plum|rose|clay)"/g)].map((m) => m[1]),
    );
    expect(actionTokens.size).toBe(8);

    const accentPath = "src/lib/workshop/group-accent.ts";
    if (existsSync(accentPath)) {
      const accentSrc = readFileSync(accentPath, "utf8");
      for (const token of actionTokens) {
        expect(accentSrc).toContain(`"${token}"`);
      }
    }
  });
});

describe("deleteProjectGroup", () => {
  it("rejects a non-uuid group id", async () => {
    const stub = makeSupabaseStub();
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { deleteProjectGroup } = await import("@/lib/workshop/group-actions");

    await expect(deleteProjectGroup({ groupId: "bad" })).rejects.toThrow(/invalid/i);
    expect(stub.calls).toEqual([]);
  });

  it("deletes only the group row scoped to the owning user; never touches projects", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("project_groups", { data: null, error: null });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { deleteProjectGroup } = await import("@/lib/workshop/group-actions");

    await deleteProjectGroup({ groupId: GROUP_ID });

    const deletes = stub.calls.filter((c) => c.op === "delete");
    expect(deletes).toHaveLength(1);
    expect(deletes[0]?.table).toBe("project_groups");
    // It must NEVER delete from projects or from memberships directly (cascade does that).
    expect(stub.calls.some((c) => c.table === "projects")).toBe(false);
    expect(stub.calls.some((c) => c.table === "project_group_memberships")).toBe(false);
    expect(nextCacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop");
  });

  it("propagates a delete error", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("project_groups", { data: null, error: { message: "boom" } });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { deleteProjectGroup } = await import("@/lib/workshop/group-actions");

    await expect(deleteProjectGroup({ groupId: GROUP_ID })).rejects.toMatchObject({ message: "boom" });
    expect(nextCacheMocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("reorderProjectGroups", () => {
  it("rejects when any id is not a uuid (before any write)", async () => {
    const stub = makeSupabaseStub();
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { reorderProjectGroups } = await import("@/lib/workshop/group-actions");

    await expect(
      reorderProjectGroups({ orderedGroupIds: [GROUP_ID, "not-a-uuid"] }),
    ).rejects.toThrow(/invalid/i);
    expect(stub.calls).toEqual([]);
  });

  it("is a no-op (no write, no revalidate) for an empty array", async () => {
    const stub = makeSupabaseStub();
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { reorderProjectGroups } = await import("@/lib/workshop/group-actions");

    await reorderProjectGroups({ orderedGroupIds: [] });
    expect(stub.calls).toEqual([]);
    expect(nextCacheMocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("writes position = array index for each id, scoped to the owner", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("project_groups", { data: null, error: null });
    stub.queueResult("project_groups", { data: null, error: null });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { reorderProjectGroups } = await import("@/lib/workshop/group-actions");

    await reorderProjectGroups({ orderedGroupIds: [GROUP_ID_2, GROUP_ID] });

    const updates = stub.calls.filter((c) => c.op === "update");
    expect(updates).toHaveLength(2);
    expect(updates.map((u) => (u.payload as { position: number }).position).sort()).toEqual([0, 1]);
    expect(nextCacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop/projects");
  });
});

describe("moveProjectToGroup", () => {
  it("rejects a non-uuid project id", async () => {
    const stub = makeSupabaseStub();
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { moveProjectToGroup } = await import("@/lib/workshop/group-actions");

    await expect(moveProjectToGroup({ projectId: "x", groupId: GROUP_ID })).rejects.toThrow(/invalid/i);
    expect(stub.calls).toEqual([]);
  });

  it("throws when the project is not in this workspace (D9 gate fails)", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("workspace_members", { data: null, error: null }); // no workspace role
    stub.queueResult("projects", { data: [], error: null }); // verify finds nothing in-workspace
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { moveProjectToGroup } = await import("@/lib/workshop/group-actions");

    await expect(moveProjectToGroup({ projectId: PROJECT_ID, groupId: GROUP_ID })).rejects.toThrow(
      /not.*found|workspace/i,
    );
    expect(stub.calls.some((c) => c.op === "upsert")).toBe(false);
  });

  it("rejects a project the user can READ but does not OWN (no role + created_by mismatch)", async () => {
    // No workspace role AND created_by !== user, so the LD-2 filter drops it. A
    // shared/collaborator project is readable via RLS but owned by someone else.
    const stub = makeSupabaseStub();
    stub.queueResult("workspace_members", { data: null, error: null }); // not a workspace member
    stub.queueResult("projects", { data: [{ id: PROJECT_ID, workspace_id: WORKSPACE_ID, created_by: "someone-else" }], error: null });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { moveProjectToGroup } = await import("@/lib/workshop/group-actions");

    await expect(moveProjectToGroup({ projectId: PROJECT_ID, groupId: GROUP_ID })).rejects.toThrow(
      /not.*found|workspace/i,
    );
    expect(stub.calls.some((c) => c.op === "upsert")).toBe(false);
  });

  it("ALLOWS an owned-via-workspace-role project even when created_by !== user (LD-2)", async () => {
    // The user is a workspace member, so they own every project in the workspace for
    // assignment purposes — regardless of created_by. The bare `.eq("created_by", …)`
    // gate would wrongly refuse this; the LD-2 gate accepts it.
    const stub = makeSupabaseStub();
    stub.queueResult("workspace_members", { data: { role: "editor" }, error: null }); // has a workspace role
    stub.queueResult("projects", { data: [{ id: PROJECT_ID, workspace_id: WORKSPACE_ID, created_by: "someone-else" }], error: null });
    stub.queueResult("project_groups", { data: { id: GROUP_ID }, error: null }); // group ownership verify
    stub.queueResult("project_group_memberships", { data: null, error: null });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { moveProjectToGroup } = await import("@/lib/workshop/group-actions");

    await moveProjectToGroup({ projectId: PROJECT_ID, groupId: GROUP_ID });

    expect(stub.calls.some((c) => c.op === "upsert")).toBe(true);
  });

  it("ALLOWS an owned project whose created_by IS NULL when the user has a workspace role (LD-2)", async () => {
    // created_by was nulled (ON DELETE SET NULL). A `.eq("created_by", …)` matches 0
    // rows; the LD-2 gate keeps it assignable via the workspace-role path.
    const stub = makeSupabaseStub();
    stub.queueResult("workspace_members", { data: { role: "owner" }, error: null });
    stub.queueResult("projects", { data: [{ id: PROJECT_ID, workspace_id: WORKSPACE_ID, created_by: null }], error: null });
    stub.queueResult("project_groups", { data: { id: GROUP_ID }, error: null });
    stub.queueResult("project_group_memberships", { data: null, error: null });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { moveProjectToGroup } = await import("@/lib/workshop/group-actions");

    await moveProjectToGroup({ projectId: PROJECT_ID, groupId: GROUP_ID });

    expect(stub.calls.some((c) => c.op === "upsert")).toBe(true);
  });

  it("removes the membership (delete) when groupId is null", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("workspace_members", { data: { role: "owner" }, error: null });
    stub.queueResult("projects", { data: [{ id: PROJECT_ID, workspace_id: WORKSPACE_ID, created_by: USER_ID }], error: null });
    stub.queueResult("project_group_memberships", { data: null, error: null });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { moveProjectToGroup } = await import("@/lib/workshop/group-actions");

    await moveProjectToGroup({ projectId: PROJECT_ID, groupId: null });

    const del = stub.calls.find((c) => c.op === "delete");
    expect(del?.table).toBe("project_group_memberships");
    expect(stub.calls.some((c) => c.op === "upsert")).toBe(false);
    expect(nextCacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop/projects");
  });

  it("upserts the membership (onConflict user_id,project_id) when groupId is a real group", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("workspace_members", { data: { role: "owner" }, error: null });
    stub.queueResult("projects", { data: [{ id: PROJECT_ID, workspace_id: WORKSPACE_ID, created_by: USER_ID }], error: null });
    stub.queueResult("project_groups", { data: { id: GROUP_ID }, error: null }); // group ownership verify
    stub.queueResult("project_group_memberships", { data: null, error: null });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { moveProjectToGroup } = await import("@/lib/workshop/group-actions");

    await moveProjectToGroup({ projectId: PROJECT_ID, groupId: GROUP_ID });

    const upsert = stub.calls.find((c) => c.op === "upsert");
    expect(upsert?.table).toBe("project_group_memberships");
    expect(upsert?.payload).toEqual({
      group_id: GROUP_ID,
      workspace_id: WORKSPACE_ID,
      user_id: USER_ID,
      project_id: PROJECT_ID,
    });
    expect(upsert?.options).toEqual({ onConflict: "user_id,project_id" });
  });

  it("throws when the target group is not owned", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("workspace_members", { data: { role: "owner" }, error: null });
    stub.queueResult("projects", { data: [{ id: PROJECT_ID, workspace_id: WORKSPACE_ID, created_by: USER_ID }], error: null });
    stub.queueResult("project_groups", { data: null, error: null }); // group verify finds nothing
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { moveProjectToGroup } = await import("@/lib/workshop/group-actions");

    await expect(moveProjectToGroup({ projectId: PROJECT_ID, groupId: GROUP_ID })).rejects.toThrow(
      /group.*not.*found|not.*found/i,
    );
    expect(stub.calls.some((c) => c.op === "upsert")).toBe(false);
  });

  it("does NOT export a setProjectGroupMembership alias (single action contract)", async () => {
    const mod = await import("@/lib/workshop/group-actions");
    expect("setProjectGroupMembership" in mod).toBe(false);
  });
});

describe("bulkAssignProjectsToGroup", () => {
  it("throws on an empty selection", async () => {
    const stub = makeSupabaseStub();
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { bulkAssignProjectsToGroup } = await import("@/lib/workshop/group-actions");

    await expect(bulkAssignProjectsToGroup({ projectIds: [], groupId: GROUP_ID })).rejects.toThrow(
      /select at least one|no projects/i,
    );
    expect(stub.calls).toEqual([]);
  });

  it("throws when the batch contains an invalid id", async () => {
    const stub = makeSupabaseStub();
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { bulkAssignProjectsToGroup } = await import("@/lib/workshop/group-actions");

    await expect(
      bulkAssignProjectsToGroup({ projectIds: [PROJECT_ID, "nope"], groupId: GROUP_ID }),
    ).rejects.toThrow(/invalid/i);
    expect(stub.calls).toEqual([]);
  });

  it("upserts one membership per verified owned project, returns the moved ids, and revalidates once", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("workspace_members", { data: { role: "owner" }, error: null }); // LD-2 role read
    // ownership verify returns both projects (with workspace_id for FK-safe stamping)
    stub.queueResult("projects", {
      data: [
        { id: PROJECT_ID, workspace_id: WORKSPACE_ID, created_by: USER_ID },
        { id: PROJECT_ID_2, workspace_id: WORKSPACE_ID, created_by: USER_ID },
      ],
      error: null,
    });
    // group ownership verify
    stub.queueResult("project_groups", { data: { id: GROUP_ID }, error: null });
    // membership upsert resolves ok
    stub.queueResult("project_group_memberships", { data: null, error: null });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { bulkAssignProjectsToGroup } = await import("@/lib/workshop/group-actions");

    const result = await bulkAssignProjectsToGroup({
      projectIds: [PROJECT_ID, PROJECT_ID_2],
      groupId: GROUP_ID,
    });

    const upsert = stub.calls.find((c) => c.op === "upsert");
    expect(upsert?.table).toBe("project_group_memberships");
    expect(Array.isArray(upsert?.payload)).toBe(true);
    expect((upsert?.payload as Array<{ project_id: string }>).map((r) => r.project_id).sort()).toEqual(
      [PROJECT_ID, PROJECT_ID_2].sort(),
    );
    expect(upsert?.options).toEqual({ onConflict: "user_id,project_id" });
    // LD-11 result shape
    expect(result.movedProjectIds.sort()).toEqual([PROJECT_ID, PROJECT_ID_2].sort());
    expect(result.skippedProjectIds).toEqual([]);
    // exactly one revalidate pair
    expect(nextCacheMocks.revalidatePath).toHaveBeenCalledTimes(2);
  });

  it("returns the non-owned requested ids as skippedProjectIds (LD-11 partial failure)", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("workspace_members", { data: null, error: null }); // no workspace role
    // Only PROJECT_ID is owned (created_by === user); PROJECT_ID_2 is owned by someone else.
    stub.queueResult("projects", {
      data: [
        { id: PROJECT_ID, workspace_id: WORKSPACE_ID, created_by: USER_ID },
        { id: PROJECT_ID_2, workspace_id: WORKSPACE_ID, created_by: "someone-else" },
      ],
      error: null,
    });
    stub.queueResult("project_groups", { data: { id: GROUP_ID }, error: null });
    stub.queueResult("project_group_memberships", { data: null, error: null });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { bulkAssignProjectsToGroup } = await import("@/lib/workshop/group-actions");

    const result = await bulkAssignProjectsToGroup({
      projectIds: [PROJECT_ID, PROJECT_ID_2],
      groupId: GROUP_ID,
    });

    expect(result.movedProjectIds).toEqual([PROJECT_ID]);
    expect(result.skippedProjectIds).toEqual([PROJECT_ID_2]);
  });

  it("deletes memberships for the verified projects when groupId is null", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("workspace_members", { data: { role: "owner" }, error: null });
    stub.queueResult("projects", { data: [{ id: PROJECT_ID, workspace_id: WORKSPACE_ID, created_by: USER_ID }], error: null });
    stub.queueResult("project_group_memberships", { data: null, error: null });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { bulkAssignProjectsToGroup } = await import("@/lib/workshop/group-actions");

    const result = await bulkAssignProjectsToGroup({ projectIds: [PROJECT_ID], groupId: null });

    const del = stub.calls.find((c) => c.op === "delete");
    expect(del?.table).toBe("project_group_memberships");
    expect(stub.calls.some((c) => c.op === "upsert")).toBe(false);
    expect(result.movedProjectIds).toEqual([PROJECT_ID]);
  });

  it("is a no-op (NOT a throw) on the remove path when nothing verifies (LD-8)", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("workspace_members", { data: null, error: null }); // no role
    stub.queueResult("projects", { data: [], error: null }); // nothing owned
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { bulkAssignProjectsToGroup } = await import("@/lib/workshop/group-actions");

    const result = await bulkAssignProjectsToGroup({ projectIds: [PROJECT_ID], groupId: null });

    expect(result).toEqual({ movedProjectIds: [], skippedProjectIds: [PROJECT_ID] });
    expect(stub.calls.some((c) => c.op === "delete")).toBe(false);
    expect(nextCacheMocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("throws on the ASSIGN path when none of the requested projects are owned/in-workspace", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("workspace_members", { data: null, error: null });
    stub.queueResult("projects", { data: [], error: null }); // nothing verified
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { bulkAssignProjectsToGroup } = await import("@/lib/workshop/group-actions");

    await expect(
      bulkAssignProjectsToGroup({ projectIds: [PROJECT_ID], groupId: GROUP_ID }),
    ).rejects.toThrow(/not.*found|workspace/i);
    expect(stub.calls.some((c) => c.op === "upsert")).toBe(false);
  });

  it("allows an owned-via-workspace-role project even when created_by !== user (LD-2/LD-5)", async () => {
    // D9/LD-5: a delete-blocked but OWNED project is still bulk-groupable. Ownership
    // here comes from the workspace role, not created_by — the bare created_by gate
    // would wrongly skip it.
    const stub = makeSupabaseStub();
    stub.queueResult("workspace_members", { data: { role: "editor" }, error: null }); // workspace role ⇒ owned
    stub.queueResult("projects", { data: [{ id: PROJECT_ID, workspace_id: WORKSPACE_ID, created_by: "someone-else" }], error: null });
    stub.queueResult("project_groups", { data: { id: GROUP_ID }, error: null });
    stub.queueResult("project_group_memberships", { data: null, error: null });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { bulkAssignProjectsToGroup } = await import("@/lib/workshop/group-actions");

    const result = await bulkAssignProjectsToGroup({ projectIds: [PROJECT_ID], groupId: GROUP_ID });

    expect(result.movedProjectIds).toEqual([PROJECT_ID]);
    expect(result.skippedProjectIds).toEqual([]);
    expect(stub.calls.some((c) => c.op === "upsert")).toBe(true);
  });
});
