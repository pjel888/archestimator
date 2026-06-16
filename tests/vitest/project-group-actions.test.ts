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
