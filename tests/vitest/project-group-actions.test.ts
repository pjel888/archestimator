import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";

import { isUuid } from "@/lib/ids";
// Error classes moved out of the "use server" group-actions module (Next.js only allows
// async-function exports there). No vi.resetModules() is used, so the cached graph keeps a
// single class identity — instanceof against these statically-imported classes is valid.
import { ProjectGroupCapError, ProjectGroupNameError } from "@/lib/workshop/group-action-types";

const workspaceMocks = vi.hoisted(() => ({
  ensureDefaultWorkspace: vi.fn(),
}));

const supabaseMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
}));

const nextCacheMocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}));

vi.mock("node:crypto", async () => {
  const actual = await vi.importActual<typeof import("node:crypto")>("node:crypto");
  return {
    ...actual,
    randomUUID: vi.fn(() => "cccccccc-cccc-4ccc-8ccc-cccccccccccc"),
  };
});

vi.mock("@/lib/repositories/workspace-repository", () => ({
  ensureDefaultWorkspace: workspaceMocks.ensureDefaultWorkspace,
}));

vi.mock("@/lib/cloudflare/d1", () => ({
  getCloudflareD1Database: supabaseMocks.createSupabaseServerClient,
}));

vi.mock("@/lib/auth/session", () => ({
  requireAuth: authMocks.requireAuth,
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
  // `filters` captures the chained .eq()/.in() args BY REFERENCE so an assertion can verify
  // a terminal op was scoped (e.g. the remove-path membership delete is .eq("user_id", …))
  // regardless of whether the filter chained before or after the terminal op.
  const calls: Array<{
    table: string;
    op: string;
    payload?: unknown;
    options?: unknown;
    filters: Array<{ method: string; args: unknown[] }>;
  }> = [];

  function nextResult(table: string): StubResult {
    const pending = queue[table];
    if (pending && pending.length > 0) return pending.shift() as StubResult;
    return { data: null, error: null, count: 0 };
  }

  function tableFor(sql: string) {
    if (sql.includes("project_group_memberships")) return "project_group_memberships";
    if (sql.includes("project_groups")) return "project_groups";
    if (sql.includes("workspace_members")) return "workspace_members";
    if (sql.includes("projects")) return "projects";
    return "unknown";
  }

  function opFor(sql: string) {
    const normalized = sql.trim().toUpperCase();
    if (normalized.startsWith("INSERT INTO PROJECT_GROUP_MEMBERSHIPS")) return "upsert";
    if (normalized.startsWith("INSERT")) return "insert";
    if (normalized.startsWith("UPDATE")) return "update";
    if (normalized.startsWith("DELETE")) return "delete";
    return "select";
  }

  function payloadFor(table: string, op: string, values: unknown[]) {
    if (table === "project_groups" && op === "insert") {
      return {
        workspace_id: values[1],
        user_id: values[2],
        name: values[3],
        accent_id: values[4],
        position: values[5],
      };
    }
    if (table === "project_groups" && op === "update") {
      if (typeof values[0] === "number") return { position: values[0], updated_at: values[1] };
      if (values[0] === null || ["slate", "stone", "sage", "teal", "indigo", "plum", "rose", "clay"].includes(String(values[0]))) {
        return { accent_id: values[0], updated_at: values[1] };
      }
      return { name: values[0], updated_at: values[1] };
    }
    if (table === "project_group_memberships" && op === "upsert") {
      return {
        group_id: values[1],
        workspace_id: values[2],
        user_id: values[3],
        project_id: values[4],
      };
    }
    return undefined;
  }

  function filtersFor(table: string, op: string, values: unknown[]) {
    if (table === "project_groups" && (op === "update" || op === "delete")) {
      const offset = op === "update" ? 2 : 0;
      return [
        { method: "eq", args: ["id", values[offset]] },
        { method: "eq", args: ["user_id", values[offset + 1]] },
        { method: "eq", args: ["workspace_id", values[offset + 2]] },
      ];
    }
    if (table === "project_group_memberships" && op === "delete") {
      return [
        { method: "eq", args: ["user_id", values[0]] },
        values.length === 2
          ? { method: "eq", args: ["project_id", values[1]] }
          : { method: "in", args: ["project_id", values.slice(1)] },
      ];
    }
    return [] as Array<{ method: string; args: unknown[] }>;
  }

  function recordWrite(sql: string, values: unknown[]) {
    const table = tableFor(sql);
    const op = opFor(sql);
    if (op === "select") return;
    calls.push({
      table,
      op,
      payload: payloadFor(table, op, values),
      options: op === "upsert" ? { onConflict: "user_id,project_id" } : undefined,
      filters: filtersFor(table, op, values),
    });
  }

  return {
    client: {
      prepare: (sql: string) => ({
        bind: (...values: unknown[]) => {
          const table = tableFor(sql);
          const result = nextResult(table);
          recordWrite(sql, values);
          const readResult = () => {
            if (result.error) throw result.error;
            if (result.count !== undefined) return { count: result.count };
            return result.data;
          };
          return {
            first: async () => readResult(),
            all: async () => ({ success: true, results: (readResult() ?? []) as unknown[] }),
            run: async () => {
              if (result.error) throw result.error;
              return { success: true };
            },
          };
        },
      }),
    },
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
  authMocks.requireAuth.mockReset();
  authMocks.requireAuth.mockResolvedValue(undefined);
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
    const { createProjectGroup } = await import("@/lib/workshop/group-actions");

    await expect(createProjectGroup({ name: "   " })).rejects.toBeInstanceOf(ProjectGroupNameError);
    expect(stub.calls).toEqual([]);
    expect(nextCacheMocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects a name longer than 40 characters", async () => {
    const stub = makeSupabaseStub();
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { createProjectGroup } = await import("@/lib/workshop/group-actions");

    await expect(createProjectGroup({ name: "x".repeat(41) })).rejects.toBeInstanceOf(ProjectGroupNameError);
    expect(stub.calls).toEqual([]);
  });

  it("rejects creation when the user is already at the 50-group cap", async () => {
    const stub = makeSupabaseStub();
    // First read = count of existing groups for (user, workspace) returns 50.
    stub.queueResult("project_groups", { data: [], error: null, count: 50 });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { createProjectGroup } = await import("@/lib/workshop/group-actions");

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

    expect(isUuid(result.id)).toBe(true);
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
    const { createProjectGroup } = await import("@/lib/workshop/group-actions");

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
    const { renameProjectGroup } = await import("@/lib/workshop/group-actions");

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
    const { renameProjectGroup } = await import("@/lib/workshop/group-actions");

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

  it("(IDOR) refuses to upsert into a FOREIGN group whose ownership row returns null", async () => {
    // The caller OWNS the project, but supplies a groupId they do NOT own. The group
    // ownership read (scoped by user_id + workspace_id) returns null, so the action MUST
    // throw and NEVER write a membership into that foreign group.
    const stub = makeSupabaseStub();
    stub.queueResult("workspace_members", { data: { role: "owner" }, error: null });
    stub.queueResult("projects", { data: [{ id: PROJECT_ID, workspace_id: WORKSPACE_ID, created_by: USER_ID }], error: null });
    stub.queueResult("project_groups", { data: null, error: null }); // foreign group: not owned ⇒ null
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { moveProjectToGroup } = await import("@/lib/workshop/group-actions");

    await expect(moveProjectToGroup({ projectId: PROJECT_ID, groupId: GROUP_ID })).rejects.toThrow(
      /group.*not.*found|not.*found/i,
    );
    // The membership table is never written, and revalidate never fires.
    expect(stub.calls.some((c) => c.table === "project_group_memberships")).toBe(false);
    expect(stub.calls.some((c) => c.op === "upsert")).toBe(false);
    expect(nextCacheMocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("scopes the remove-path membership delete by user_id (no cross-user membership wipe)", async () => {
    // groupId === null removes the membership. The delete MUST be scoped by the caller's
    // user_id (and project_id) so it can never delete another user's membership row.
    const stub = makeSupabaseStub();
    stub.queueResult("workspace_members", { data: { role: "owner" }, error: null });
    stub.queueResult("projects", { data: [{ id: PROJECT_ID, workspace_id: WORKSPACE_ID, created_by: USER_ID }], error: null });
    stub.queueResult("project_group_memberships", { data: null, error: null });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { moveProjectToGroup } = await import("@/lib/workshop/group-actions");

    await moveProjectToGroup({ projectId: PROJECT_ID, groupId: null });

    const del = stub.calls.find((c) => c.op === "delete");
    expect(del?.table).toBe("project_group_memberships");
    // The delete is scoped by user_id === the caller and the specific project_id.
    const eqArgs = del?.filters.filter((f) => f.method === "eq").map((f) => f.args) ?? [];
    expect(eqArgs).toContainEqual(["user_id", USER_ID]);
    expect(eqArgs).toContainEqual(["project_id", PROJECT_ID]);
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

    const upserts = stub.calls.filter((c) => c.op === "upsert");
    expect(upserts).toHaveLength(2);
    expect(upserts.every((upsert) => upsert.table === "project_group_memberships")).toBe(true);
    expect(upserts.map((u) => (u.payload as { project_id: string }).project_id).sort()).toEqual(
      [PROJECT_ID, PROJECT_ID_2].sort(),
    );
    expect(upserts.every((upsert) => JSON.stringify(upsert.options) === JSON.stringify({ onConflict: "user_id,project_id" }))).toBe(true);
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

  it("(IDOR) refuses to bulk-upsert into a FOREIGN group whose ownership row returns null", async () => {
    // The caller owns the projects but targets a groupId they do NOT own. The group
    // ownership read (scoped by user_id + workspace_id) returns null, so the action MUST
    // throw and NEVER write any membership into that foreign group.
    const stub = makeSupabaseStub();
    stub.queueResult("workspace_members", { data: { role: "owner" }, error: null });
    stub.queueResult("projects", {
      data: [
        { id: PROJECT_ID, workspace_id: WORKSPACE_ID, created_by: USER_ID },
        { id: PROJECT_ID_2, workspace_id: WORKSPACE_ID, created_by: USER_ID },
      ],
      error: null,
    });
    stub.queueResult("project_groups", { data: null, error: null }); // foreign group ⇒ not owned
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { bulkAssignProjectsToGroup } = await import("@/lib/workshop/group-actions");

    await expect(
      bulkAssignProjectsToGroup({ projectIds: [PROJECT_ID, PROJECT_ID_2], groupId: GROUP_ID }),
    ).rejects.toThrow(/group.*not.*found|not.*found/i);
    // No membership upsert into the foreign group; no revalidate.
    expect(stub.calls.some((c) => c.op === "upsert")).toBe(false);
    expect(stub.calls.some((c) => c.table === "project_group_memberships")).toBe(false);
    expect(nextCacheMocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("scopes the bulk remove-path membership delete by user_id (no cross-user wipe)", async () => {
    const stub = makeSupabaseStub();
    stub.queueResult("workspace_members", { data: { role: "owner" }, error: null });
    stub.queueResult("projects", { data: [{ id: PROJECT_ID, workspace_id: WORKSPACE_ID, created_by: USER_ID }], error: null });
    stub.queueResult("project_group_memberships", { data: null, error: null });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(stub.client);
    const { bulkAssignProjectsToGroup } = await import("@/lib/workshop/group-actions");

    await bulkAssignProjectsToGroup({ projectIds: [PROJECT_ID], groupId: null });

    const del = stub.calls.find((c) => c.op === "delete");
    expect(del?.table).toBe("project_group_memberships");
    const eqArgs = del?.filters.filter((f) => f.method === "eq").map((f) => f.args) ?? [];
    expect(eqArgs).toContainEqual(["user_id", USER_ID]);
  });
});

describe("project group actions — source contract", () => {
  const src = readFileSync("src/lib/workshop/group-actions.ts", "utf8");

  it("is a server-action module cloning the favorites skeleton", () => {
    expect(src).toContain('"use server"');
    expect(src).toContain("ensureDefaultWorkspace");
    expect(src).toContain("getCloudflareD1Database");
    expect(src).toContain('revalidatePath("/workshop")');
    expect(src).toContain('revalidatePath("/workshop/projects")');
  });

  it("ships exactly one assignment action (no setProjectGroupMembership)", () => {
    expect(src).toContain("export async function moveProjectToGroup");
    expect(src).not.toContain("setProjectGroupMembership");
  });

  it("enforces app-layer caps from the shared constants module and never adds a DB length/check constraint here", () => {
    // Caps are imported from the shared (non-"use server") module so the UI can't drift.
    expect(src).toContain('from "@/lib/workshop/group-constants"');
    expect(src).toContain("MAX_PROJECT_GROUPS");
    expect(src).toContain("MAX_PROJECT_GROUP_NAME_LENGTH");
    expect(src).toContain("ProjectGroupCapError");
    expect(src).toContain("ProjectGroupNameError");
    // The cap VALUES live in the constants module, asserted once there.
    const constants = readFileSync("src/lib/workshop/group-constants.ts", "utf8");
    expect(constants).toContain("MAX_PROJECT_GROUPS = 50");
    expect(constants).toContain("MAX_PROJECT_GROUP_NAME_LENGTH = 40");
  });

  it("translates the duplicate-name unique violation by code + constraint, distinct from the membership unique (LD-8)", () => {
    expect(src).toContain('"23505"');
    // Disambiguates the name index from the membership unique(user_id, project_id).
    expect(src).toContain("isDuplicateNameViolation");
    // It must not blanket-translate ALL 23505s into a name error.
    expect(src).not.toMatch(/isUniqueViolation\([^)]*\)\)\s*\{\s*throw new ProjectGroupNameError/);
  });

  it("uses onConflict user_id,project_id for one-to-many membership", () => {
    expect(src).toContain("ON CONFLICT(user_id, project_id) DO UPDATE");
  });

  it("upserts memberships through project_group_memberships and never sets a projects.group_id column", () => {
    expect(src).toContain("project_group_memberships");
    expect(src).not.toMatch(/from\("projects"\)[\s\S]{0,80}update\(/);
  });

  it("gates assignment on the LD-2 OWNERSHIP derivation, not mere readability and not a bare created_by eq (D9/D11/LD-2)", () => {
    // The gate is the repo `owned` predicate (in-workspace AND (workspace-role OR
    // created_by === user)), applied in app code via the shared helper — NOT a single
    // SQL `.eq("created_by", profile.id)`, which would miss owned-via-workspace-role
    // rows and silently drop created_by-IS-NULL rows (created_by is nullable).
    expect(src).toContain("verifyOwnedProjectIds");
    expect(src).toContain("workspace_members"); // the workspace-role read the predicate needs
    expect(src).toContain("created_by === userId"); // the app-layer predicate, not a SQL eq
    expect(src).not.toContain('.eq("created_by"'); // the bare-eq gate is forbidden (LD-2)
  });

  it("bulkAssignProjectsToGroup returns the typed partial-failure result (LD-11)", () => {
    expect(src).toContain("movedProjectIds");
    expect(src).toContain("skippedProjectIds");
  });

  it("caps the reorder fan-out at MAX_PROJECT_GROUPS (LD-8)", () => {
    expect(src).toMatch(/orderedGroupIds\.length\s*>\s*MAX_PROJECT_GROUPS/);
  });
});
